/**
 * NWS Multi-Station Discovery Engine
 *
 * Dynamically discovers ALL NWS-reporting observation stations near a
 * geographic point and fetches their latest observations in parallel.
 *
 * Data flow:
 *   1. GET /points/{lat},{lng} → properties.observationStations URL
 *   2. GET {observationStations URL} → GeoJSON FeatureCollection of stations
 *   3. GET /stations/{id}/observations/latest (parallel, up to 20 stations)
 *
 * Caching (Redis when available):
 *   - Station list per gridpoint: 1 hour (stations don't move)
 *   - Observations per station: 5 minutes
 *
 * Free, unlimited, no API key — only requires a User-Agent header.
 */

import { redisCommand } from './redis.js';

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = '(UtahWindApp, support@utahwindapp.com)';
const NWS_HEADERS = { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' };

const KMH_TO_MPH = 0.621371;

function cToF(c) {
  return c == null ? null : +(c * 9 / 5 + 32).toFixed(1);
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Discover all NWS observation stations near a point.
 * Returns station metadata (id, name, lat, lng) sorted by distance.
 */
async function discoverStations(lat, lng) {
  const cacheKey = `nws:stations:${lat.toFixed(2)}:${lng.toFixed(2)}`;

  try {
    const cached = await redisCommand('GET', cacheKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  const pointsUrl = `${NWS_BASE}/points/${lat.toFixed(4)},${lng.toFixed(4)}`;
  const pointsResp = await fetch(pointsUrl, {
    headers: NWS_HEADERS,
    signal: AbortSignal.timeout(8000),
  });

  if (!pointsResp.ok) return [];

  const pointsData = await pointsResp.json();
  const stationsUrl = pointsData.properties?.observationStations;
  if (!stationsUrl) return [];

  const stationsResp = await fetch(stationsUrl, {
    headers: NWS_HEADERS,
    signal: AbortSignal.timeout(10000),
  });

  if (!stationsResp.ok) return [];

  const stationsData = await stationsResp.json();
  const features = stationsData.features || stationsData.observationStations || [];

  const stations = [];
  for (const f of features) {
    const props = f.properties || {};
    const coords = f.geometry?.coordinates;
    if (!coords || !props.stationIdentifier) continue;

    stations.push({
      id: props.stationIdentifier,
      name: props.name || props.stationIdentifier,
      lat: coords[1],
      lng: coords[0],
      elevation: props.elevation?.value != null
        ? Math.round(props.elevation.value * 3.28084)
        : null,
      county: props.county || null,
    });
  }

  if (stations.length > 0) {
    try {
      await redisCommand('SET', cacheKey, JSON.stringify(stations), 'EX', '3600');
    } catch (_) {}
  }

  return stations;
}

/**
 * Fetch the latest observation for a single NWS station.
 * Returns normalized object or null.
 */
async function fetchObservation(stationId) {
  const url = `${NWS_BASE}/stations/${stationId}/observations/latest`;
  try {
    const resp = await fetch(url, {
      headers: NWS_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const p = data.properties;
    if (!p) return null;

    const windSpeed = p.windSpeed?.value != null
      ? +(p.windSpeed.value * KMH_TO_MPH).toFixed(1)
      : null;
    const windGust = p.windGust?.value != null
      ? +(p.windGust.value * KMH_TO_MPH).toFixed(1)
      : null;

    if (windSpeed == null && p.temperature?.value == null) return null;

    return {
      windSpeed,
      windDirection: p.windDirection?.value ?? null,
      windGust,
      temperature: cToF(p.temperature?.value),
      humidity: p.relativeHumidity?.value != null ? +p.relativeHumidity.value.toFixed(1) : null,
      pressure: p.barometricPressure?.value != null
        ? +(p.barometricPressure.value / 3386.39).toFixed(2)
        : null,
      timestamp: p.timestamp,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Fetch historical observations for a single NWS station.
 * Chunks into 7-day windows to avoid NWS timeouts on long ranges.
 * Supports up to 365+ days of history.
 *
 * @param {string} stationId - NWS station ID (e.g., 'KSLC')
 * @param {Date} startDate - Start of history window
 * @param {Date} endDate - End of history window
 * @param {object} [options] - Options
 * @param {number} [options.chunkDays=7] - Days per request chunk
 * @param {number} [options.delayMs=200] - Delay between chunks to avoid rate limiting
 * @returns {Promise<Array<{timestamp, windSpeed, windDirection, windGust, temperature, pressure}>>}
 */
export async function fetchStationHistory(stationId, startDate, endDate, options = {}) {
  const { chunkDays = 7, delayMs = 200 } = options;
  const observations = [];
  const msPerDay = 86400000;
  const chunkMs = chunkDays * msPerDay;

  let chunkStart = new Date(startDate.getTime());
  const finalEnd = new Date(endDate.getTime());

  while (chunkStart < finalEnd) {
    const chunkEnd = new Date(Math.min(chunkStart.getTime() + chunkMs, finalEnd.getTime()));

    let url = `${NWS_BASE}/stations/${stationId}/observations?start=${chunkStart.toISOString()}&end=${chunkEnd.toISOString()}&limit=500`;

    while (url) {
      try {
        const resp = await fetch(url, {
          headers: NWS_HEADERS,
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) { url = null; break; }

        const data = await resp.json();
        const features = data.features || [];

        for (const f of features) {
          const p = f.properties;
          if (!p) continue;
          const windSpeed = p.windSpeed?.value != null
            ? +(p.windSpeed.value * KMH_TO_MPH).toFixed(1)
            : null;
          observations.push({
            timestamp: p.timestamp,
            windSpeed,
            windDirection: p.windDirection?.value ?? null,
            windGust: p.windGust?.value != null ? +(p.windGust.value * KMH_TO_MPH).toFixed(1) : null,
            temperature: cToF(p.temperature?.value),
            humidity: p.relativeHumidity?.value != null ? +p.relativeHumidity.value.toFixed(1) : null,
            pressure: p.barometricPressure?.value != null
              ? +(p.barometricPressure.value / 3386.39).toFixed(2)
              : null,
          });
        }

        url = data.pagination?.next || null;
      } catch (_) {
        url = null;
      }
    }

    chunkStart = chunkEnd;
    if (chunkStart < finalEnd && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return observations;
}

/**
 * IDW (Inverse Distance Weighting) interpolation across multiple stations.
 * Power parameter p=2 (standard for meteorological interpolation).
 */
function idwInterpolate(targetLat, targetLng, stations) {
  const validStations = stations.filter(s => s.windSpeed != null && s.distanceMiles != null && s.distanceMiles > 0);
  if (validStations.length === 0) {
    const exact = stations.find(s => s.windSpeed != null && s.distanceMiles != null && s.distanceMiles === 0);
    if (exact) return { windSpeed: exact.windSpeed, windDirection: exact.windDirection, windGust: exact.windGust };
    return null;
  }

  let wSum = 0;
  let speedSum = 0;
  let gustSum = 0;
  let sinSum = 0;
  let cosSum = 0;
  let gustCount = 0;

  for (const s of validStations) {
    const w = 1 / (s.distanceMiles ** 2);
    wSum += w;
    speedSum += w * s.windSpeed;
    if (s.windGust != null) {
      gustSum += w * s.windGust;
      gustCount++;
    }
    if (s.windDirection != null) {
      const rad = s.windDirection * Math.PI / 180;
      sinSum += w * Math.sin(rad);
      cosSum += w * Math.cos(rad);
    }
  }

  if (wSum === 0) return null;

  const direction = Math.round((Math.atan2(sinSum / wSum, cosSum / wSum) * 180 / Math.PI + 360) % 360);

  return {
    windSpeed: +(speedSum / wSum).toFixed(1),
    windDirection: direction,
    windGust: gustCount > 0 ? +(gustSum / wSum).toFixed(1) : null,
  };
}

/**
 * Calculate confidence score based on station count, distance spread, and data freshness.
 */
function calculateConfidence(stations, radiusMiles) {
  if (stations.length === 0) return 0;

  const countScore = Math.min(stations.length / 15, 1.0);
  const avgDist = stations.reduce((sum, s) => sum + (s.distanceMiles || 0), 0) / stations.length;
  const distScore = Math.max(0, 1 - avgDist / radiusMiles);
  const freshCount = stations.filter(s => {
    if (!s.timestamp) return false;
    const age = Date.now() - new Date(s.timestamp).getTime();
    return age < 30 * 60 * 1000;
  }).length;
  const freshScore = freshCount / stations.length;

  return +((countScore * 0.4 + distScore * 0.3 + freshScore * 0.3) * 100).toFixed(0) / 100;
}

/**
 * Main entry point: discover and fetch all NWS stations near a point,
 * return normalized station array + IDW interpolation.
 *
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @param {number} [radiusMiles=30] - Maximum search radius
 * @param {number} [maxStations=20] - Maximum stations to fetch observations for
 * @returns {Promise<{stations: Array, interpolated: Object, confidence: number, model: string}>}
 */
export async function discoverAndFetchMulti(lat, lng, radiusMiles = 30, maxStations = 20) {
  const allStations = await discoverStations(lat, lng);
  if (allStations.length === 0) return { stations: [], interpolated: null, confidence: 0, model: 'none' };

  const withDistance = allStations.map(s => ({
    ...s,
    distanceMiles: haversineDistance(lat, lng, s.lat, s.lng),
  }))
    .filter(s => s.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, maxStations);

  if (withDistance.length === 0) return { stations: [], interpolated: null, confidence: 0, model: 'none' };

  const obsCacheKey = `nws:obs:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  let cachedObs = null;
  try {
    const raw = await redisCommand('GET', obsCacheKey);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const age = Date.now() - (parsed._cachedAt || 0);
      if (age < 5 * 60 * 1000) cachedObs = parsed.stations;
    }
  } catch (_) {}

  let enrichedStations;
  if (cachedObs && Array.isArray(cachedObs) && cachedObs.length > 0) {
    enrichedStations = cachedObs;
  } else {
    const obsResults = await Promise.allSettled(
      withDistance.map(s => fetchObservation(s.id))
    );

    enrichedStations = [];
    for (let i = 0; i < withDistance.length; i++) {
      const obs = obsResults[i].status === 'fulfilled' ? obsResults[i].value : null;
      if (!obs) continue;

      enrichedStations.push({
        id: withDistance[i].id,
        name: withDistance[i].name,
        lat: withDistance[i].lat,
        lng: withDistance[i].lng,
        elevation: withDistance[i].elevation,
        distanceMiles: +withDistance[i].distanceMiles.toFixed(1),
        source: 'nws',
        windSpeed: obs.windSpeed,
        windDirection: obs.windDirection,
        windGust: obs.windGust,
        temperature: obs.temperature,
        humidity: obs.humidity,
        pressure: obs.pressure,
        timestamp: obs.timestamp,
      });
    }

    if (enrichedStations.length > 0) {
      try {
        await redisCommand('SET', obsCacheKey,
          JSON.stringify({ _cachedAt: Date.now(), stations: enrichedStations }),
          'EX', '300');
      } catch (_) {}
    }
  }

  const interpolated = idwInterpolate(lat, lng, enrichedStations);
  const confidence = calculateConfidence(enrichedStations, radiusMiles);

  return {
    stations: enrichedStations,
    interpolated,
    confidence,
    model: 'idw_interpolation',
    stationCount: enrichedStations.length,
    radiusMiles,
  };
}

/**
 * Fetch multiple station observations by known IDs (for cron ingest use).
 * Returns array in Synoptic-compatible format for backwards compat.
 */
export async function fetchMultipleNwsStations(stationIds) {
  const results = await Promise.allSettled(
    stationIds.map(async (stationId) => {
      const obs = await fetchObservation(stationId);
      if (!obs) return null;
      return {
        STID: stationId,
        NAME: stationId,
        LATITUDE: '',
        LONGITUDE: '',
        ELEVATION: '',
        STATUS: 'ACTIVE',
        OBSERVATIONS: {
          date_time: obs.timestamp,
          wind_speed_value_1: { value: obs.windSpeed, date_time: obs.timestamp },
          wind_direction_value_1: { value: obs.windDirection, date_time: obs.timestamp },
          wind_gust_value_1: { value: obs.windGust, date_time: obs.timestamp },
          air_temp_value_1: { value: obs.temperature, date_time: obs.timestamp },
          altimeter_value_1: { value: obs.pressure, date_time: obs.timestamp },
        },
        _source: 'nws',
      };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

export { discoverStations, fetchObservation, idwInterpolate, calculateConfidence };
