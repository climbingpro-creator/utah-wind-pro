/**
 * USGS Water Temperature Service
 * Fetches real-time water temperature from USGS National Water Information System.
 * API is free, no key required.
 * Endpoint: https://waterservices.usgs.gov/nwis/iv/
 * Parameter 00010 = water temperature (°C)
 */

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv/';

// Active USGS stations with water temperature data mapped to our fishing locations.
// Each station uses the nearest active gauge — stream inflow proxies for lakes
// without direct lake-body sensors.
export const USGS_STATIONS = {
  'utah-lake': {
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    relation: 'Inflow proxy — Provo River feeds Utah Lake',
    elevationOffset: -2,  // lake is lower elevation, warmer in summer
  },
  'deer-creek': {
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    relation: 'Provo River between Jordanelle & Deer Creek',
    elevationOffset: 0,
  },
  'provo-river': {
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    relation: 'Direct measurement',
    elevationOffset: 0,
  },
  'jordanelle': {
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    relation: 'Inflow proxy — Provo River feeds Jordanelle',
    elevationOffset: 2,  // reservoir is higher, colder
  },
  'strawberry': {
    siteId: '10155500',
    name: 'Provo River nr Charleston',
    relation: 'Cross-basin proxy — Strawberry tunnel feeds Provo',
    elevationOffset: -5,  // Strawberry is 7600 ft, much colder
  },
  'flaming-gorge': {
    siteId: '09234500',
    name: 'Green River nr Greendale',
    relation: 'Tailwater below Flaming Gorge Dam',
    elevationOffset: 0,
  },
  'green-river': {
    siteId: '09261000',
    name: 'Green River nr Jensen',
    relation: 'Direct measurement — A/B/C sections',
    elevationOffset: 0,
  },
  'willard-bay': {
    siteId: '10126000',
    name: 'Bear River nr Corinne',
    relation: 'Bear River inflow proxy',
    elevationOffset: 0,
  },
};

// All unique site IDs for batch fetching
const ALL_SITE_IDS = [...new Set(Object.values(USGS_STATIONS).map(s => s.siteId))];

let cachedData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

function celsiusToFahrenheit(c) {
  return +(c * 9 / 5 + 32).toFixed(1);
}

/**
 * Fetch water temperature for all stations in a single batch call.
 * Returns a map: siteId → { tempC, tempF, dateTime, siteName }
 */
async function fetchAllStations() {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  try {
    const url = `${USGS_BASE}?format=json&sites=${ALL_SITE_IDS.join(',')}&parameterCd=00010&siteStatus=active`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`USGS API ${resp.status}`);
    const json = await resp.json();

    const result = {};
    const timeSeries = json?.value?.timeSeries || [];

    for (const series of timeSeries) {
      const siteId = series.sourceInfo?.siteCode?.[0]?.value;
      const siteName = series.sourceInfo?.siteName;
      if (!siteId) continue;

      // Find the most recent valid reading (prefer "1 ft. below surface" or
      // shallowest method for surface temp). Take the first value set that
      // has a recent, non-null reading.
      const allValues = series.values || [];
      let bestReading = null;
      let bestDate = null;

      for (const valSet of allValues) {
        const reading = valSet.value?.[0];
        if (!reading || reading.value === '-999999') continue;
        const dt = new Date(reading.dateTime);
        // Only use data from last 7 days
        if (Date.now() - dt.getTime() > 7 * 24 * 60 * 60 * 1000) continue;
        const method = valSet.method?.[0]?.methodDescription || '';
        // Prefer surface/shallow readings
        if (!bestReading ||
            method.includes('surface') ||
            method.includes('1 ft') ||
            method.includes('0.4 meters')) {
          bestReading = parseFloat(reading.value);
          bestDate = reading.dateTime;
        }
      }

      if (bestReading != null && !isNaN(bestReading)) {
        result[siteId] = {
          tempC: bestReading,
          tempF: celsiusToFahrenheit(bestReading),
          dateTime: bestDate,
          siteName,
          stale: Date.now() - new Date(bestDate).getTime() > 24 * 60 * 60 * 1000,
        };
      }
    }

    cachedData = result;
    cacheTimestamp = Date.now();
    return result;
  } catch (err) {
    console.warn('[USGS] Fetch failed, using cache or estimate:', err.message);
    return cachedData || {};
  }
}

/**
 * Get water temperature for a specific fishing location.
 * Returns { tempF, tempC, source, stationName, stale, dateTime } or null
 */
export async function getWaterTemp(locationId) {
  const station = USGS_STATIONS[locationId];
  if (!station) return null;

  const allData = await fetchAllStations();
  const reading = allData[station.siteId];
  if (!reading) return null;

  const adjustedC = reading.tempC + (station.elevationOffset || 0);
  const adjustedF = celsiusToFahrenheit(adjustedC);

  return {
    tempF: adjustedF,
    tempC: +adjustedC.toFixed(1),
    rawTempF: reading.tempF,
    rawTempC: reading.tempC,
    source: 'USGS',
    stationName: station.name,
    stationId: station.siteId,
    relation: station.relation,
    stale: reading.stale,
    dateTime: reading.dateTime,
  };
}

/**
 * Get water temperature for ALL fishing locations in one call.
 * Returns a map: locationId → { tempF, tempC, source, ... }
 */
export async function getAllWaterTemps() {
  const allData = await fetchAllStations();
  const result = {};

  for (const [locationId, station] of Object.entries(USGS_STATIONS)) {
    const reading = allData[station.siteId];
    if (!reading) continue;

    const adjustedC = reading.tempC + (station.elevationOffset || 0);
    result[locationId] = {
      tempF: celsiusToFahrenheit(adjustedC),
      tempC: +adjustedC.toFixed(1),
      rawTempF: reading.tempF,
      rawTempC: reading.tempC,
      source: 'USGS',
      stationName: station.name,
      stationId: station.siteId,
      relation: station.relation,
      stale: reading.stale,
      dateTime: reading.dateTime,
    };
  }

  return result;
}

export function invalidateCache() {
  cachedData = null;
  cacheTimestamp = 0;
}
