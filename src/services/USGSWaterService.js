/**
 * Water Temperature Service
 * 
 * Two data sources, used only when the measurement IS the water body:
 * 
 * 1. USGS gauges — for rivers where the sensor is IN the river
 *    (Provo River 10155500, Green River 09261000 & 09234500)
 * 
 * 2. Satellite/NOAA lake surface temperature — actual lake surface readings
 *    via seatemperature.net (sourced from Copernicus/NOAA satellite data)
 *    for lakes and reservoirs.
 * 
 * No proxy stations. If the gauge isn't on the water body, we don't use it.
 */

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv/';

// ─── LOCATION CONFIGS ────────────────────────────────────────────
// type: 'usgs' = gauge is physically in this water body
// type: 'satellite' = use satellite lake surface temp
// type: 'seasonal' = no reliable real-time source, use calibrated model

export const WATER_TEMP_SOURCES = {
  'provo-river': {
    type: 'usgs',
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    note: 'Direct gauge on river',
  },
  'green-river': {
    type: 'usgs',
    siteId: '09261000',
    name: 'Green River nr Jensen',
    note: 'Direct gauge — A/B/C sections',
  },
  'flaming-gorge': {
    type: 'usgs',
    siteId: '09234500',
    name: 'Green River nr Greendale (below dam)',
    note: 'Tailwater gauge — directly below Flaming Gorge Dam',
  },
  'utah-lake': {
    type: 'satellite',
    slug: 'utah-lake',
    name: 'Utah Lake',
    note: 'NOAA/Copernicus satellite surface temp',
    // Calibrated monthly average from multi-year satellite record (°F)
    monthlyAvg: [36, 39, 43, 48, 55, 65, 72, 72, 68, 55, 46, 37],
  },
  'deer-creek': {
    type: 'satellite',
    slug: 'deer-creek-reservoir',
    name: 'Deer Creek Reservoir',
    note: 'NOAA/Copernicus satellite surface temp',
    monthlyAvg: [33, 35, 39, 44, 52, 62, 70, 70, 64, 52, 42, 35],
  },
  'jordanelle': {
    type: 'satellite',
    slug: 'jordanelle-reservoir',
    name: 'Jordanelle Reservoir',
    note: 'NOAA/Copernicus satellite surface temp',
    monthlyAvg: [33, 34, 38, 43, 50, 60, 68, 68, 62, 50, 41, 34],
  },
  'strawberry': {
    type: 'satellite',
    slug: 'strawberry-reservoir',
    name: 'Strawberry Reservoir',
    note: 'NOAA/Copernicus satellite surface temp',
    monthlyAvg: [36, 38, 41, 46, 52, 64, 72, 72, 65, 53, 43, 35],
  },
  'willard-bay': {
    type: 'satellite',
    slug: 'willard-bay-reservoir',
    name: 'Willard Bay Reservoir',
    note: 'NOAA/Copernicus satellite surface temp',
    monthlyAvg: [34, 36, 42, 48, 56, 66, 74, 74, 66, 54, 44, 36],
  },
};

// ─── CACHES ──────────────────────────────────────────────────────
let usgsCache = null;
let usgsCacheTs = 0;
let satelliteCache = {};
let satelliteCacheTs = 0;
const USGS_CACHE_MS = 15 * 60 * 1000;       // 15 min
const SATELLITE_CACHE_MS = 60 * 60 * 1000;   // 1 hr (daily data doesn't change often)

function cToF(c) {
  return +(c * 9 / 5 + 32).toFixed(1);
}

// ─── USGS: Direct river gauges ───────────────────────────────────
const USGS_SITE_IDS = [...new Set(
  Object.values(WATER_TEMP_SOURCES)
    .filter(s => s.type === 'usgs')
    .map(s => s.siteId)
)];

async function fetchUSGS() {
  if (usgsCache && Date.now() - usgsCacheTs < USGS_CACHE_MS) return usgsCache;

  try {
    const url = `${USGS_BASE}?format=json&sites=${USGS_SITE_IDS.join(',')}&parameterCd=00010&siteStatus=active`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`USGS ${resp.status}`);
    const json = await resp.json();
    const result = {};

    for (const series of (json?.value?.timeSeries || [])) {
      const siteId = series.sourceInfo?.siteCode?.[0]?.value;
      if (!siteId) continue;

      for (const valSet of (series.values || [])) {
        const reading = valSet.value?.[0];
        if (!reading || reading.value === '-999999') continue;
        const dt = new Date(reading.dateTime);
        if (Date.now() - dt.getTime() > 7 * 24 * 60 * 60 * 1000) continue;

        const tempC = parseFloat(reading.value);
        if (isNaN(tempC)) continue;

        if (!result[siteId] || dt > new Date(result[siteId].dateTime)) {
          result[siteId] = {
            tempC,
            tempF: cToF(tempC),
            dateTime: reading.dateTime,
            stale: Date.now() - dt.getTime() > 24 * 60 * 60 * 1000,
          };
        }
      }
    }

    usgsCache = result;
    usgsCacheTs = Date.now();
    return result;
  } catch (err) {
    console.warn('[WaterTemp] USGS fetch failed:', err.message);
    return usgsCache || {};
  }
}

// ─── SATELLITE: Lake surface temp via serverless proxy ───────────
// Fetches from /api/weather?source=water-temp&slug=X which proxies
// seatemperature.net server-side (NOAA/Copernicus satellite lake surface temp).

async function fetchSatelliteTemp(slug) {
  const cacheKey = slug;
  const cached = satelliteCache[cacheKey];
  if (cached && Date.now() - cached.ts < SATELLITE_CACHE_MS) return cached.data;

  try {
    const resp = await fetch(`/api/weather?source=water-temp&slug=${slug}`);
    if (!resp.ok) throw new Error(`Proxy ${resp.status}`);
    const json = await resp.json();

    if (json.tempF != null) {
      const data = { tempF: json.tempF, tempC: json.tempC, stale: false };
      satelliteCache[cacheKey] = { data, ts: Date.now() };
      return data;
    }

    throw new Error('No temp in response');
  } catch (err) {
    console.warn(`[WaterTemp] Satellite fetch failed for ${slug}:`, err.message);
    return satelliteCache[cacheKey]?.data || null;
  }
}

// ─── SEASONAL MODEL (fallback) ──────────────────────────────────
// Interpolates between monthly averages for a smooth daily estimate.

function getSeasonalEstimate(monthlyAvg) {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();

  const thisMonthAvg = monthlyAvg[month];
  const nextMonthAvg = monthlyAvg[(month + 1) % 12];
  const progress = day / daysInMonth;
  const tempF = Math.round(thisMonthAvg + (nextMonthAvg - thisMonthAvg) * progress);

  return { tempF, tempC: +((tempF - 32) * 5 / 9).toFixed(1), stale: false };
}

// ─── PUBLIC API ─────────────────────────────────────────────────

/**
 * Get water temperature for a specific location.
 * Returns { tempF, tempC, source, sourceName, note, stale } or null
 */
export async function getWaterTemp(locationId) {
  const config = WATER_TEMP_SOURCES[locationId];
  if (!config) return null;

  if (config.type === 'usgs') {
    const usgsData = await fetchUSGS();
    const reading = usgsData[config.siteId];
    if (reading) {
      return {
        tempF: reading.tempF,
        tempC: reading.tempC,
        source: 'USGS',
        sourceName: config.name,
        note: config.note,
        stale: reading.stale,
        dateTime: reading.dateTime,
      };
    }
  }

  if (config.type === 'satellite') {
    const satData = await fetchSatelliteTemp(config.slug);
    if (satData) {
      return {
        tempF: satData.tempF,
        tempC: satData.tempC,
        source: 'Satellite',
        sourceName: config.name,
        note: config.note,
        stale: satData.stale,
      };
    }
    // Fall through to seasonal model
    if (config.monthlyAvg) {
      const est = getSeasonalEstimate(config.monthlyAvg);
      return {
        ...est,
        source: 'Seasonal Model',
        sourceName: config.name,
        note: 'Based on historical satellite averages',
      };
    }
  }

  return null;
}

/**
 * Get water temperature for ALL fishing locations in one call.
 * Returns a map: locationId → { tempF, tempC, source, ... }
 */
export async function getAllWaterTemps() {
  // Kick off USGS fetch once
  const usgsPromise = fetchUSGS();
  const result = {};

  // Fetch satellite temps in parallel
  const satelliteEntries = Object.entries(WATER_TEMP_SOURCES)
    .filter(([, c]) => c.type === 'satellite');

  const satResults = await Promise.allSettled(
    satelliteEntries.map(([, config]) => fetchSatelliteTemp(config.slug))
  );

  const usgsData = await usgsPromise;

  for (const [locationId, config] of Object.entries(WATER_TEMP_SOURCES)) {
    if (config.type === 'usgs') {
      const reading = usgsData[config.siteId];
      if (reading) {
        result[locationId] = {
          tempF: reading.tempF,
          tempC: reading.tempC,
          source: 'USGS',
          sourceName: config.name,
          note: config.note,
          stale: reading.stale,
          dateTime: reading.dateTime,
        };
      }
    } else if (config.type === 'satellite') {
      const idx = satelliteEntries.findIndex(([id]) => id === locationId);
      const satResult = idx >= 0 ? satResults[idx] : null;
      const satData = satResult?.status === 'fulfilled' ? satResult.value : null;

      if (satData) {
        result[locationId] = {
          tempF: satData.tempF,
          tempC: satData.tempC,
          source: 'Satellite',
          sourceName: config.name,
          note: config.note,
          stale: satData.stale,
        };
      } else if (config.monthlyAvg) {
        const est = getSeasonalEstimate(config.monthlyAvg);
        result[locationId] = {
          ...est,
          source: 'Seasonal Model',
          sourceName: config.name,
          note: 'Based on historical satellite averages',
        };
      }
    }
  }

  return result;
}

export function invalidateCache() {
  usgsCache = null;
  usgsCacheTs = 0;
  satelliteCache = {};
  satelliteCacheTs = 0;
}
