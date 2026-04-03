/**
 * Vercel Serverless Function — API proxy for weather data
 * Keeps API keys on the server, never exposed to the client.
 * 
 * Routes:
 *   GET /api/weather?source=ambient
 *   GET /api/weather?source=radial&lat=40.35&lng=-111.90  ← FREE radial search (NWS + UDOT + Ambient + Open-Meteo global fallback)
 *   GET /api/weather?source=synoptic&stids=FPS,KSLC,...
 *   GET /api/weather?source=synoptic-history&stids=FPS,KSLC,...&hours=3
 *   GET /api/weather?source=wu-nearby&lat=40.35&lon=-111.90
 *   GET /api/weather?source=wu-pws&stationIds=KUTSARAT50,KUTSARAT88
 *   GET /api/weather?source=wu-pws-history&stationId=KUTSARAT50
 *
 * Multi-source fallback: airport stations (K-prefix) route through NWS
 * (free, no key), UDOT RWIS stations (UT-prefix) route through UDOT
 * (free with key), remaining stations try Synoptic.
 * 
 * The `radial` source is 100% FREE — it uses:
 *   1. NWS (US airports)
 *   2. UDOT RWIS (Utah roads)
 *   3. Ambient Weather (personal weather stations)
 *   4. Open-Meteo (global fallback for international coordinates)
 * No Synoptic charges.
 */

import { splitStations, fetchNwsLatest, fetchNwsHistory } from './lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from './lib/udotAdapter.js';
import { checkRateLimit } from './lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`weather:${clientIp}`);
  if (rl.limited) {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }

  const { source, stids, hours } = req.query;

  try {
    if (source === 'ambient') {
      return await handleAmbient(res);
    } else if (source === 'ambient-history') {
      return await handleAmbientHistory(res, req.query);
    } else if (source === 'radial') {
      return await handleRadialFree(res, req.query);
    } else if (source === 'synoptic-radial') {
      return await handleSynopticRadial(res, req.query);
    } else if (source === 'synoptic') {
      return await handleSynopticLatest(res, stids);
    } else if (source === 'synoptic-history') {
      return await handleSynopticHistory(res, stids, hours);
    } else if (source === 'wu-nearby') {
      return await handleWuNearby(res, req.query);
    } else if (source === 'wu-pws') {
      return await handleWuPwsCurrent(res, req.query);
    } else if (source === 'wu-pws-history') {
      return await handleWuPwsHistory(res, req.query);
    } else if (source === 'wu-pws-date') {
      return await handleWuPwsDate(res, req.query);
    } else {
      return res.status(400).json({ error: 'Invalid source. Use: ambient, ambient-history, radial, synoptic, synoptic-radial, synoptic-history, wu-nearby, wu-pws, wu-pws-history' });
    }
  } catch (error) {
    console.error(`[API Proxy] ${source} error:`, error.message);
    return res.status(502).json({
      error: 'Upstream API error',
      source,
    });
  }
}

async function handleAmbientHistory(res, query) {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
  if (!apiKey || !appKey) {
    return res.status(500).json({ error: 'Ambient Weather API keys not configured' });
  }

  const macAddress = '48:3F:DA:54:2C:6E';
  const limit = Math.min(parseInt(query.limit) || 288, 288);
  const params = new URLSearchParams({
    apiKey,
    applicationKey: appKey,
    limit: String(limit),
  });

  // Optional: fetch a specific date range using endDate param
  if (query.endDate) {
    params.set('endDate', query.endDate);
  }

  const url = `https://api.ambientweather.net/v1/devices/${macAddress}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({ error: 'Rate limited by Ambient Weather' });
    }
    return res.status(status).json({ error: `Ambient API returned ${status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}

async function handleAmbient(res) {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;

  if (!apiKey || !appKey) {
    return res.status(500).json({ error: 'Ambient Weather API keys not configured' });
  }

  const url = `https://rt.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({ error: 'Rate limited by Ambient Weather' });
    }
    return res.status(status).json({ error: `Ambient API returned ${status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  return res.status(200).json(data);
}

// ─── FREE Radial Weather (NWS + UDOT + Ambient — NO SYNOPTIC) ─────────────
// Returns the nearest weather station to a GPS coordinate using only free sources.

const RADIAL_STATIONS = [
  // NWS Airport Stations (FREE via api.weather.gov)
  { id: 'KSLC', name: 'Salt Lake City Intl Airport', lat: 40.7884, lng: -111.9778, source: 'nws' },
  { id: 'KPVU', name: 'Provo Municipal Airport', lat: 40.2192, lng: -111.7235, source: 'nws' },
  { id: 'KHCR', name: 'Heber City Municipal Airport', lat: 40.4822, lng: -111.4289, source: 'nws' },
  { id: 'KOGD', name: 'Ogden-Hinckley Airport', lat: 41.1961, lng: -112.0122, source: 'nws' },
  { id: 'KLGU', name: 'Logan-Cache Airport', lat: 41.7912, lng: -111.8522, source: 'nws' },
  { id: 'KHIF', name: 'Hill Air Force Base', lat: 41.1239, lng: -111.9731, source: 'nws' },
  { id: 'KVEL', name: 'Vernal Regional Airport', lat: 40.4409, lng: -109.5099, source: 'nws' },
  { id: 'KPUC', name: 'Price Carbon County Airport', lat: 39.6147, lng: -110.7514, source: 'nws' },
  { id: 'KSGU', name: 'St George Regional Airport', lat: 37.0364, lng: -113.5103, source: 'nws' },
  { id: 'KPGA', name: 'Page Municipal Airport', lat: 36.9261, lng: -111.4483, source: 'nws' },
  { id: 'KCDC', name: 'Cedar City Regional Airport', lat: 37.7011, lng: -113.0989, source: 'nws' },
  { id: 'KFGR', name: 'Flaming Gorge (Dutch John)', lat: 40.9159, lng: -109.3928, source: 'nws' },
  { id: 'KBMC', name: 'Brigham City Airport', lat: 41.5524, lng: -112.0622, source: 'nws' },
  
  // UDOT RWIS Stations (FREE via udottraffic.utah.gov)
  { id: 'UTDCD', name: 'Deer Creek Dam', lat: 40.4097, lng: -111.5097, source: 'udot' },
  { id: 'UTLPC', name: 'Lower Provo Canyon', lat: 40.3500, lng: -111.6000, source: 'udot' },
  { id: 'UTPCY', name: 'Provo Canyon', lat: 40.3300, lng: -111.5500, source: 'udot' },
  { id: 'UTCHL', name: 'Charleston', lat: 40.4700, lng: -111.4700, source: 'udot' },
  { id: 'UTORM', name: 'Orem', lat: 40.2969, lng: -111.6946, source: 'udot' },
  { id: 'UTPCR', name: 'Point of the Mountain', lat: 40.4500, lng: -111.9100, source: 'udot' },
  { id: 'UT7', name: 'American Fork', lat: 40.3770, lng: -111.7958, source: 'udot' },
  { id: 'UTPRB', name: 'Price', lat: 39.5994, lng: -110.8107, source: 'udot' },
  { id: 'UTRVT', name: 'Riverton', lat: 40.5219, lng: -111.9391, source: 'udot' },
  { id: 'UTLAK', name: 'Lake Point', lat: 40.6886, lng: -112.2108, source: 'udot' },
  { id: 'UTHEB', name: 'Heber', lat: 40.5070, lng: -111.4130, source: 'udot' },
  { id: 'UTSLD', name: 'Soldier Summit', lat: 39.9300, lng: -111.0900, source: 'udot' },
  { id: 'UTCOP', name: 'Daniels Pass', lat: 40.3200, lng: -111.2500, source: 'udot' },
  { id: 'UTALP', name: 'Alpine', lat: 40.4530, lng: -111.7580, source: 'udot' },
  
  // Ambient Weather PWS (FREE via our own meters)
  { id: 'PWS', name: 'Saratoga Springs PWS', lat: 40.3500, lng: -111.9000, source: 'ambient', mac: '48:3F:DA:54:2C:6E' },
];

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if coordinates are outside the continental US
 */
function isOutsideUS(lat, lng) {
  // Continental US bounding box
  const US_BOUNDS = { minLat: 24.5, maxLat: 49.5, minLng: -125, maxLng: -66.5 };
  // Alaska
  const ALASKA_BOUNDS = { minLat: 51, maxLat: 72, minLng: -180, maxLng: -129 };
  // Hawaii
  const HAWAII_BOUNDS = { minLat: 18.5, maxLat: 22.5, minLng: -161, maxLng: -154 };
  
  if (lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat && lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng) return false;
  if (lat >= ALASKA_BOUNDS.minLat && lat <= ALASKA_BOUNDS.maxLat && lng >= ALASKA_BOUNDS.minLng && lng <= ALASKA_BOUNDS.maxLng) return false;
  if (lat >= HAWAII_BOUNDS.minLat && lat <= HAWAII_BOUNDS.maxLat && lng >= HAWAII_BOUNDS.minLng && lng <= HAWAII_BOUNDS.maxLng) return false;
  return true;
}

/**
 * Fetch weather from Open-Meteo (FREE global coverage)
 */
async function fetchOpenMeteoGlobal(lat, lng) {
  const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,' +
    'cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,' +
    'cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=2';

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.current) return null;

    // Weather code to sky condition
    const WEATHER_CODE_MAP = {
      0: 'clear', 1: 'clear', 2: 'partly', 3: 'cloudy',
      45: 'cloudy', 48: 'cloudy',
      51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
      61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain',
      71: 'storm', 73: 'storm', 75: 'storm', 77: 'storm',
      80: 'rain', 81: 'rain', 82: 'rain', 85: 'storm', 86: 'storm',
      95: 'storm', 96: 'storm', 99: 'storm',
    };

    const weatherCodeToForecast = (code) => {
      const descriptions = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 51: 'Light drizzle', 61: 'Slight rain', 63: 'Moderate rain',
        65: 'Heavy rain', 71: 'Slight snow', 80: 'Rain showers', 95: 'Thunderstorm',
      };
      return descriptions[code] || 'Unknown';
    };

    const degreesToCardinal = (deg) => {
      if (deg == null) return 'N';
      const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
      return dirs[Math.round(deg / 22.5) % 16];
    };

    // Build hourly forecast array
    const hourly = [];
    if (data.hourly?.time) {
      const maxHours = Math.min(data.hourly.time.length, 48);
      for (let i = 0; i < maxHours; i++) {
        hourly.push({
          startTime: data.hourly.time[i],
          time: data.hourly.time[i],
          temperature: data.hourly.temperature_2m?.[i],
          humidity: data.hourly.relative_humidity_2m?.[i],
          windSpeed: data.hourly.wind_speed_10m?.[i],
          windDirection: data.hourly.wind_direction_10m?.[i],
          windDirectionCardinal: degreesToCardinal(data.hourly.wind_direction_10m?.[i]),
          windGust: data.hourly.wind_gusts_10m?.[i],
          pressure: data.hourly.surface_pressure?.[i] ? data.hourly.surface_pressure[i] / 33.8639 : null,
          cloudCover: data.hourly.cloud_cover?.[i],
          precipChance: data.hourly.precipitation_probability?.[i],
          weatherCode: data.hourly.weather_code?.[i],
          sky: WEATHER_CODE_MAP[data.hourly.weather_code?.[i]] || 'partly',
          shortForecast: weatherCodeToForecast(data.hourly.weather_code?.[i]),
          source: 'open-meteo',
        });
      }
    }

    return {
      stationId: 'open-meteo',
      stationName: `Open-Meteo (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      latitude: lat,
      longitude: lng,
      distanceMiles: 0,
      source: 'open-meteo',
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windDirectionCardinal: degreesToCardinal(data.current.wind_direction_10m),
      windGust: data.current.wind_gusts_10m,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.surface_pressure ? data.current.surface_pressure / 33.8639 : null,
      cloudCover: data.current.cloud_cover,
      sky: WEATHER_CODE_MAP[data.current.weather_code] || 'partly',
      shortForecast: weatherCodeToForecast(data.current.weather_code),
      timestamp: data.current.time,
      dataSource: 'Open-Meteo Global',
      hourlyForecast: hourly,
    };
  } catch (err) {
    console.error('[OpenMeteo] Fetch error:', err.message);
    return null;
  }
}

async function handleRadialFree(res, query) {
  const { lat, lng, radius } = query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters required' });
  }
  
  const targetLat = parseFloat(lat);
  const targetLng = parseFloat(lng);
  const maxRadius = Math.min(parseFloat(radius) || 100, 200);
  
  // Check if outside US — if so, use Open-Meteo directly (global coverage)
  const outsideUS = isOutsideUS(targetLat, targetLng);
  
  // Calculate distance to all known free stations (US-based)
  const stationsWithDistance = RADIAL_STATIONS.map(s => ({
    ...s,
    distanceMiles: haversineDistance(targetLat, targetLng, s.lat, s.lng),
  }))
    .filter(s => s.distanceMiles <= maxRadius)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
  
  // If outside US or no nearby US stations, fall back to Open-Meteo
  if (outsideUS || stationsWithDistance.length === 0) {
    console.log(`[Radial] ${outsideUS ? 'International location' : 'No nearby US stations'} — using Open-Meteo for ${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`);
    const openMeteoData = await fetchOpenMeteoGlobal(targetLat, targetLng);
    
    if (openMeteoData) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
      return res.status(200).json({
        station: openMeteoData,
        searchedCoords: { lat: targetLat, lng: targetLng },
        source: 'open-meteo',
        isInternational: outsideUS,
      });
    }
    
    return res.status(200).json({
      station: null,
      message: outsideUS 
        ? 'International location — Open-Meteo unavailable' 
        : `No free weather stations found within ${maxRadius} miles`,
      searchedCoords: { lat: targetLat, lng: targetLng },
    });
  }
  
  // Try to fetch data from the closest US stations until we get valid data
  const udotKey = process.env.UDOT_API_KEY;
  const ambientApiKey = process.env.AMBIENT_API_KEY;
  const ambientAppKey = process.env.AMBIENT_APP_KEY;
  
  for (const station of stationsWithDistance.slice(0, 5)) {
    try {
      let weatherData = null;
      
      if (station.source === 'nws') {
        const nwsResults = await fetchNwsLatest([station.id]);
        if (nwsResults.length > 0) {
          weatherData = normalizeStationData(nwsResults[0], station);
        }
      } else if (station.source === 'udot' && udotKey) {
        const udotResults = await fetchUdotLatest([station.id], udotKey);
        if (udotResults.length > 0) {
          weatherData = normalizeStationData(udotResults[0], station);
        }
      } else if (station.source === 'ambient' && ambientApiKey && ambientAppKey) {
        const ambientData = await fetchAmbientByMac(station.mac, ambientApiKey, ambientAppKey);
        if (ambientData) {
          weatherData = normalizeAmbientData(ambientData, station);
        }
      }
      
      if (weatherData && (weatherData.windSpeed != null || weatherData.temperature != null)) {
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        return res.status(200).json({
          station: weatherData,
          searchedCoords: { lat: targetLat, lng: targetLng },
          stationsSearched: stationsWithDistance.length,
        });
      }
    } catch (err) {
      console.warn(`[Radial] Error fetching ${station.id}:`, err.message);
      continue;
    }
  }
  
  // US stations failed — fall back to Open-Meteo as last resort
  console.log(`[Radial] US stations failed — falling back to Open-Meteo for ${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`);
  const openMeteoFallback = await fetchOpenMeteoGlobal(targetLat, targetLng);
  
  if (openMeteoFallback) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      station: openMeteoFallback,
      searchedCoords: { lat: targetLat, lng: targetLng },
      source: 'open-meteo-fallback',
      nearestStations: stationsWithDistance.slice(0, 3).map(s => ({ id: s.id, name: s.name, distanceMiles: Math.round(s.distanceMiles * 10) / 10 })),
    });
  }
  
  // No station returned valid data
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json({
    station: null,
    message: 'Found stations but none returned valid data',
    searchedCoords: { lat: targetLat, lng: targetLng },
    nearestStations: stationsWithDistance.slice(0, 3).map(s => ({ id: s.id, name: s.name, distanceMiles: Math.round(s.distanceMiles * 10) / 10 })),
  });
}

function normalizeStationData(rawStation, stationMeta) {
  const obs = rawStation.OBSERVATIONS || {};
  return {
    stationId: rawStation.STID || stationMeta.id,
    stationName: rawStation.NAME || stationMeta.name,
    latitude: parseFloat(rawStation.LATITUDE) || stationMeta.lat,
    longitude: parseFloat(rawStation.LONGITUDE) || stationMeta.lng,
    distanceMiles: Math.round(stationMeta.distanceMiles * 10) / 10,
    source: stationMeta.source,
    windSpeed: obs.wind_speed_value_1?.value ?? null,
    windDirection: obs.wind_direction_value_1?.value ?? null,
    windGust: obs.wind_gust_value_1?.value ?? null,
    temperature: obs.air_temp_value_1?.value ?? null,
    humidity: obs.relative_humidity_value_1?.value ?? null,
    pressure: obs.altimeter_value_1?.value ?? obs.sea_level_pressure_value_1?.value ?? null,
    timestamp: obs.date_time || obs.wind_speed_value_1?.date_time || new Date().toISOString(),
    dataSource: `${stationMeta.source.toUpperCase()} — ${stationMeta.name}`,
  };
}

async function fetchAmbientByMac(mac, apiKey, appKey) {
  try {
    const params = new URLSearchParams({ apiKey, applicationKey: appKey, limit: '1' });
    const url = `https://api.ambientweather.net/v1/devices/${mac}?${params}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

function normalizeAmbientData(ambientObs, stationMeta) {
  return {
    stationId: stationMeta.mac || stationMeta.id,
    stationName: stationMeta.name,
    latitude: stationMeta.lat,
    longitude: stationMeta.lng,
    distanceMiles: Math.round(stationMeta.distanceMiles * 10) / 10,
    source: 'ambient',
    windSpeed: ambientObs.windspeedmph ?? null,
    windDirection: ambientObs.winddir ?? null,
    windGust: ambientObs.windgustmph ?? null,
    temperature: ambientObs.tempf ?? null,
    humidity: ambientObs.humidity ?? null,
    pressure: ambientObs.baromrelin ?? null,
    timestamp: ambientObs.dateutc ? new Date(ambientObs.dateutc).toISOString() : new Date().toISOString(),
    dataSource: `Ambient Weather — ${stationMeta.name}`,
  };
}

const ALLOWED_STATIONS = new Set([
  'KSLC','KPVU','KHCR','KOGD','KLGU','KHIF','KVEL','KPUC','KSGU','KPGA','KCDC',
  'KFGR','KBMC','BERU1','FPS','QSF','UTALP','UTOLY','CSC','UID28','TIMU1','MDAU1',
  'UTPCY','UTCOP','UTDAN','DSTU1','RVZU1','CCPUT','UWCU1','SKY','UTESU','UTMPK',
  'UR328','BLPU1','OGP',
  'QLN','GSLM','EPMU1','UTHTP','COOPOGNU1','PC496',
  'UTDCD','UTLPC','UTCHL',
  'UTORM','UTPCR','UT7','UTPRB','UTRVT','UTLAK',
  'UTHEB','UTSLD',
  'UTLMP','UTRKY','UTSCI',
  'UTANT','UTFRW',
  'UTGRC','UTLTS',
  'UTPVD','UTHUN',
  'UTPOW','UTMON',
]);

async function handleSynopticLatest(res, stids) {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }
  const requested = stids.split(',').map(s => s.trim());
  const filtered = requested.filter(s => ALLOWED_STATIONS.has(s));
  if (filtered.length === 0) {
    return res.status(400).json({ error: 'No valid station IDs provided' });
  }

  const { airport, other } = splitStations(filtered);
  const udotIds = other.filter(id => isUdotStation(id));
  const synopticIds = other.filter(id => !isUdotStation(id));

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsLatest(airport).catch(() => []));
  }

  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) {
    fetches.push(fetchUdotLatest(udotIds, udotKey).catch(() => []));
  }

  if (synopticIds.length > 0 || (udotIds.length > 0 && !udotKey)) {
    const synopticFallbackIds = udotKey ? synopticIds : [...synopticIds, ...udotIds];
    const token = process.env.SYNOPTIC_TOKEN;
    if (token && synopticFallbackIds.length > 0) {
      fetches.push(
        fetchSynopticDirect(synopticFallbackIds.join(','), token).catch(() => [])
      );
    }
  }

  const results = await Promise.all(fetches);
  const allStations = results.flat();

  const data = {
    SUMMARY: {
      RESPONSE_CODE: 1,
      RESPONSE_MESSAGE: 'OK',
      NUMBER_OF_OBJECTS: allStations.length,
      _sources: allStations.reduce((acc, s) => {
        const src = s._source || 'synoptic';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {}),
    },
    STATION: allStations,
  };

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  return res.status(200).json(data);
}

async function fetchSynopticDirect(stidsStr, token) {
  const params = new URLSearchParams({
    token,
    stid: stidsStr,
    vars: 'air_temp,relative_humidity,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
    units: 'english',
  });
  const url = `https://api.synopticdata.com/v2/stations/latest?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    console.warn(`[Synoptic] returned ${response.status} — falling back`);
    return [];
  }
  const data = await response.json();
  return (data.STATION || []).map(s => ({ ...s, _source: 'synoptic' }));
}

async function handleSynopticRadial(res, query) {
  const { lat, lng, radius } = query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters required' });
  }
  const radiusMiles = Math.min(parseFloat(radius) || 50, 150);
  const token = process.env.SYNOPTIC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Synoptic API token not configured' });
  }

  const params = new URLSearchParams({
    token,
    radius: `${lat},${lng},${radiusMiles}`,
    vars: 'air_temp,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
    units: 'english',
    limit: '15',
  });
  const url = `https://api.synopticdata.com/v2/stations/latest?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    console.warn(`[Synoptic Radial] returned ${response.status}`);
    return res.status(response.status).json({ error: `Synoptic API returned ${response.status}` });
  }
  const data = await response.json();
  const stations = (data.STATION || []).map(s => ({ ...s, _source: 'synoptic-radial' }));

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({
    SUMMARY: {
      RESPONSE_CODE: 1,
      RESPONSE_MESSAGE: 'OK',
      NUMBER_OF_OBJECTS: stations.length,
    },
    STATION: stations,
  });
}

async function handleSynopticHistory(res, stids, hours = '3') {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }
  const requested = stids.split(',').map(s => s.trim());
  const filtered = requested.filter(s => ALLOWED_STATIONS.has(s));
  if (filtered.length === 0) {
    return res.status(400).json({ error: 'No valid station IDs provided' });
  }
  hours = String(Math.min(parseInt(hours) || 3, 24));
  const numHours = parseInt(hours);

  const { airport, other } = splitStations(filtered);

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsHistory(airport, numHours).catch(() => []));
  }

  if (other.length > 0) {
    const token = process.env.SYNOPTIC_TOKEN;
    if (token) {
      fetches.push(fetchSynopticHistoryDirect(other.join(','), token, numHours).catch(() => []));
    }
  }

  const results = await Promise.all(fetches);
  const allStations = results.flat();

  const data = {
    SUMMARY: {
      RESPONSE_CODE: 1,
      RESPONSE_MESSAGE: 'OK',
      NUMBER_OF_OBJECTS: allStations.length,
    },
    STATION: allStations,
  };

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}

async function fetchSynopticHistoryDirect(stidsStr, token, hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);
  const fmt = (d) => d.toISOString().replace(/[-:T]/g, '').slice(0, 12);

  const params = new URLSearchParams({
    token,
    stid: stidsStr,
    start: fmt(start),
    end: fmt(end),
    vars: 'wind_speed,wind_direction,wind_gust,air_temp',
    units: 'english',
  });
  const url = `https://api.synopticdata.com/v2/stations/timeseries?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    console.warn(`[Synoptic History] returned ${response.status}`);
    return [];
  }
  const data = await response.json();
  return data.STATION || [];
}

// ─── Weather Underground PWS Network ─────────────────────────────

function getWuApiKey() {
  return process.env.WU_API_KEY;
}

async function handleWuNearby(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { lat, lon } = query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon parameters required' });

  const url = `https://api.weather.com/v3/location/near?geocode=${lat},${lon}&product=pws&format=json&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json(data);
}

async function handleWuPwsCurrent(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const stationIds = (query.stationIds || '').split(',').map(s => s.trim()).filter(Boolean);
  if (stationIds.length === 0) return res.status(400).json({ error: 'stationIds parameter required' });
  if (stationIds.length > 10) return res.status(400).json({ error: 'Max 10 stations per request' });

  const results = await Promise.allSettled(
    stationIds.map(async (id) => {
      const url = `https://api.weather.com/v2/pws/observations/current?stationId=${id}&format=json&units=e&numericPrecision=decimal&apiKey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return { stationId: id, error: r.status };
      const d = await r.json();
      return d.observations?.[0] || { stationId: id, error: 'no_data' };
    })
  );

  const observations = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'fetch_failed' });
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(200).json({ observations });
}

async function handleWuPwsDate(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { stationId, date } = query;
  if (!stationId) return res.status(400).json({ error: 'stationId parameter required' });
  if (!date || !/^\d{8}$/.test(date)) return res.status(400).json({ error: 'date parameter required (YYYYMMDD)' });

  const url = `https://api.weather.com/v2/pws/history/all?stationId=${stationId}&format=json&units=e&date=${date}&numericPrecision=decimal&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).json(data);
}

async function handleWuPwsHistory(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { stationId } = query;
  if (!stationId) return res.status(400).json({ error: 'stationId parameter required' });

  const url = `https://api.weather.com/v2/pws/observations/all/1day?stationId=${stationId}&format=json&units=e&numericPrecision=decimal&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(data);
}
