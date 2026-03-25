/**
 * UDOT RWIS (Road Weather Information System) Adapter
 *
 * Fetches weather station data from UDOT's free traffic API and returns
 * it in Synoptic-compatible format. Requires a free developer key from
 * https://dev.udottraffic.utah.gov/developers/doc
 */

const UDOT_BASE = 'https://www.udottraffic.utah.gov/api/v2/get/weatherstations';

const COMPASS_TO_DEG = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/**
 * Mapping from Synoptic station IDs → UDOT station name patterns.
 * UDOT uses road segment names like "I-80 @ Deer Creek Dam".
 * We match by substring on StationName.
 */
const SYNOPTIC_TO_UDOT_NAME = {
  UTDCD:  ['deer creek'],
  UTLPC:  ['lower provo canyon', 'provo canyon lower'],
  UTPCY:  ['provo canyon'],
  UTCHL:  ['charleston'],
  UTORM:  ['orem'],
  UTPCR:  ['point of the mountain', 'point of mountain'],
  UT7:    ['i-15 @ american fork', 'american fork'],
  UTPRB:  ['price', 'us-6 @ price'],
  UTRVT:  ['riverton'],
  UTLAK:  ['lake point'],
  UTHEB:  ['heber'],
  UTSLD:  ['soldier summit', 'soldier creek'],
  UTLMP:  ['lamp'],
  UTRKY:  ['rocky pass'],
  UTSCI:  ['scipio'],
  UTANT:  ['antimony'],
  UTFRW:  ['freeway'],
  UTGRC:  ['grace'],
  UTLTS:  ['lots'],
  UTPVD:  ['providence', 'i-15 @ provid'],
  UTHUN:  ['huntsville', 'hunts'],
  UTPOW:  ['power'],
  UTMON:  ['monticello'],
  UTCOP:  ['soldier creek', 'daniels', 'us-40 @ daniel'],
  UTDAN:  ['daniel'],
  UTALP:  ['alpine', 'sr-92'],
};

const UDOT_STATION_IDS = new Set(Object.keys(SYNOPTIC_TO_UDOT_NAME));

let cachedUdotData = null;
let lastUdotFetch = 0;
const UDOT_CACHE_MS = 30_000;

function isUdotStation(stid) {
  return UDOT_STATION_IDS.has(stid);
}

function matchUdotStation(udotStation, synopticId) {
  const patterns = SYNOPTIC_TO_UDOT_NAME[synopticId];
  if (!patterns) return false;
  const name = (udotStation.StationName || '').toLowerCase();
  return patterns.some(p => name.includes(p));
}

function convertUdotToSynoptic(udotStation, synopticId) {
  const now = udotStation.LastUpdated
    ? new Date(udotStation.LastUpdated * 1000).toISOString()
    : new Date().toISOString();

  const windDir = COMPASS_TO_DEG[udotStation.WindDirection] ?? null;
  const windSpeed = udotStation.WindSpeedAvg ? parseFloat(udotStation.WindSpeedAvg) : null;
  const windGust = udotStation.WindSpeedGust ? parseFloat(udotStation.WindSpeedGust) : null;
  const airTemp = udotStation.AirTemperature ? parseFloat(udotStation.AirTemperature) : null;
  const humidity = udotStation.RelativeHumidity ? parseFloat(udotStation.RelativeHumidity) : null;

  return {
    STID: synopticId,
    NAME: udotStation.StationName || synopticId,
    LATITUDE: udotStation.Latitude ? String(udotStation.Latitude) : '',
    LONGITUDE: udotStation.Longitude ? String(udotStation.Longitude) : '',
    ELEVATION: '',
    STATUS: 'ACTIVE',
    OBSERVATIONS: {
      date_time: now,
      wind_speed_value_1: { value: windSpeed, date_time: now },
      wind_direction_value_1: { value: windDir, date_time: now },
      wind_gust_value_1: { value: windGust, date_time: now },
      air_temp_value_1: { value: airTemp, date_time: now },
      relative_humidity_value_1: { value: humidity, date_time: now },
      altimeter_value_1: { value: null, date_time: now },
      sea_level_pressure_value_1: { value: null, date_time: now },
    },
    _source: 'udot',
  };
}

async function fetchAllUdotStations(apiKey) {
  const now = Date.now();
  if (cachedUdotData && now - lastUdotFetch < UDOT_CACHE_MS) {
    return cachedUdotData;
  }

  const url = `${UDOT_BASE}?key=${apiKey}&format=json`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) {
    console.error(`[UDOT] API returned ${resp.status}`);
    return cachedUdotData || [];
  }

  const data = await resp.json();
  cachedUdotData = Array.isArray(data) ? data : [];
  lastUdotFetch = now;
  return cachedUdotData;
}

async function fetchUdotLatest(stationIds, apiKey) {
  if (!apiKey) return [];

  try {
    const allStations = await fetchAllUdotStations(apiKey);
    const results = [];

    for (const synId of stationIds) {
      const match = allStations.find(s => matchUdotStation(s, synId));
      if (match) {
        results.push(convertUdotToSynoptic(match, synId));
      }
    }

    return results;
  } catch (err) {
    console.error('[UDOT] fetch error:', err.message);
    return [];
  }
}

export { isUdotStation, fetchUdotLatest, UDOT_STATION_IDS };
