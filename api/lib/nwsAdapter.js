/**
 * NWS (National Weather Service) API Adapter
 *
 * Fetches weather observations from api.weather.gov for ASOS/AWOS airport
 * stations and returns data in Synoptic-compatible format so the frontend
 * needs zero changes.
 *
 * Free, no API key required — just a User-Agent header.
 */

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = '(UtahWindApp, support@utahwindapp.com)';

const KMH_TO_MPH = 0.621371;
const PA_TO_INHG = 1 / 3386.39;

function cToF(c) {
  return c == null ? null : +(c * 9 / 5 + 32).toFixed(1);
}

const AIRPORT_META = {
  KSLC: { name: 'Salt Lake City Intl Airport',       lat: '40.7884', lon: '-111.9778', elev: '4227' },
  KPVU: { name: 'Provo Municipal Airport',            lat: '40.2192', lon: '-111.7235', elev: '4497' },
  KHCR: { name: 'Heber City Municipal Airport',       lat: '40.4822', lon: '-111.4289', elev: '5637' },
  KOGD: { name: 'Ogden-Hinckley Airport',             lat: '41.1961', lon: '-112.0122', elev: '4455' },
  KLGU: { name: 'Logan-Cache Airport',                lat: '41.7912', lon: '-111.8522', elev: '4457' },
  KHIF: { name: 'Hill Air Force Base',                lat: '41.1239', lon: '-111.9731', elev: '4789' },
  KVEL: { name: 'Vernal Regional Airport',            lat: '40.4409', lon: '-109.5099', elev: '5278' },
  KPUC: { name: 'Price Carbon County Airport',        lat: '39.6147', lon: '-110.7514', elev: '5957' },
  KSGU: { name: 'St George Regional Airport',         lat: '37.0364', lon: '-113.5103', elev: '2941' },
  KPGA: { name: 'Page Municipal Airport',             lat: '36.9261', lon: '-111.4483', elev: '4316' },
  KCDC: { name: 'Cedar City Regional Airport',        lat: '37.7011', lon: '-113.0989', elev: '5622' },
  KFGR: { name: 'Flaming Gorge (Dutch John)',         lat: '40.9159', lon: '-109.3928', elev: '5590' },
  KBMC: { name: 'Brigham City Airport',               lat: '41.5524', lon: '-112.0622', elev: '4229' },
};

const AIRPORT_IDS = new Set(Object.keys(AIRPORT_META));

function isAirportStation(stid) {
  return AIRPORT_IDS.has(stid);
}

function splitStations(stids) {
  const airport = [];
  const other = [];
  for (const id of stids) {
    if (isAirportStation(id)) airport.push(id);
    else other.push(id);
  }
  return { airport, other };
}

async function fetchOneNws(stid) {
  const url = `${NWS_BASE}/stations/${stid}/observations/latest`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const p = json.properties;
  if (!p) return null;

  const meta = AIRPORT_META[stid] || {};
  const windSpeedMph = p.windSpeed?.value != null
    ? +(p.windSpeed.value * KMH_TO_MPH).toFixed(1)
    : null;
  const windGustMph = p.windGust?.value != null
    ? +(p.windGust.value * KMH_TO_MPH).toFixed(1)
    : null;

  return {
    STID: stid,
    NAME: meta.name || p.stationName || stid,
    LATITUDE: meta.lat || String(json.geometry?.coordinates?.[1] || ''),
    LONGITUDE: meta.lon || String(json.geometry?.coordinates?.[0] || ''),
    ELEVATION: meta.elev || '',
    STATUS: 'ACTIVE',
    OBSERVATIONS: {
      date_time: p.timestamp,
      wind_speed_value_1: { value: windSpeedMph, date_time: p.timestamp },
      wind_direction_value_1: { value: p.windDirection?.value ?? null, date_time: p.timestamp },
      wind_gust_value_1: { value: windGustMph, date_time: p.timestamp },
      air_temp_value_1: { value: cToF(p.temperature?.value), date_time: p.timestamp },
      relative_humidity_value_1: { value: p.relativeHumidity?.value != null ? +p.relativeHumidity.value.toFixed(1) : null, date_time: p.timestamp },
      altimeter_value_1: { value: p.barometricPressure?.value != null ? +(p.barometricPressure.value * PA_TO_INHG).toFixed(2) : null, date_time: p.timestamp },
      sea_level_pressure_value_1: { value: p.seaLevelPressure?.value != null ? +(p.seaLevelPressure.value * PA_TO_INHG).toFixed(2) : null, date_time: p.timestamp },
    },
    _source: 'nws',
  };
}

async function fetchNwsLatest(stationIds) {
  const results = await Promise.allSettled(stationIds.map(fetchOneNws));
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

async function fetchNwsHistory(stationIds, hours = 3) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);

  const results = await Promise.allSettled(
    stationIds.map(async (stid) => {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        limit: '500',
      });
      const url = `${NWS_BASE}/stations/${stid}/observations?${params}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const features = json.features || [];

      const dateTimes = [];
      const windSpeeds = [];
      const windDirs = [];
      const windGusts = [];
      const temps = [];

      for (const f of features.reverse()) {
        const p = f.properties;
        dateTimes.push(p.timestamp);
        windSpeeds.push(p.windSpeed?.value != null ? +(p.windSpeed.value * KMH_TO_MPH).toFixed(1) : null);
        windDirs.push(p.windDirection?.value ?? null);
        windGusts.push(p.windGust?.value != null ? +(p.windGust.value * KMH_TO_MPH).toFixed(1) : null);
        temps.push(cToF(p.temperature?.value));
      }

      const meta = AIRPORT_META[stid] || {};
      return {
        STID: stid,
        NAME: meta.name || stid,
        LATITUDE: meta.lat || '',
        LONGITUDE: meta.lon || '',
        ELEVATION: meta.elev || '',
        STATUS: 'ACTIVE',
        OBSERVATIONS: {
          date_time: dateTimes,
          wind_speed_set_1: windSpeeds,
          wind_direction_set_1: windDirs,
          wind_gust_set_1: windGusts,
          air_temp_set_1: temps,
        },
        _source: 'nws',
      };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

export { isAirportStation, splitStations, fetchNwsLatest, fetchNwsHistory, AIRPORT_IDS };
