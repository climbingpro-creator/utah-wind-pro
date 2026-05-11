/**
 * Stage 1 of 3 — Data Ingestion
 * 
 * Vercel Cron: runs every 15 minutes.
 * 
 * Pure data fetching:
 *   1. Pull station data from Synoptic / NWS / UDOT / WU PWS / Ambient
 *   2. Store raw JSON payloads into Upstash Redis
 *   3. Trigger Stage 2 (process-models) via async HTTP POST
 *   4. Return 200 OK immediately
 * 
 * Redis keys written:
 *   obs:{date}:{HH}:{mm}  — raw observations (TTL 7d)
 *   obs:index              — sorted list of observation keys
 *   ambient:latest         — latest Ambient PWS reading
 *   nws:forecasts          — NWS gridpoint forecasts (cached 90 min)
 */

import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { fetchNWSForecasts } from '../lib/nwsForecast.js';
import { splitStations, fetchNwsLatest } from '../lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from '../lib/udotAdapter.js';
import { getEnv, redisCommand, normalizeToMb, hasRedis } from '../lib/redis.js';
import { triggerNextStage } from '../lib/qstash.js';
import { WindPredictor, getModelPath } from '@utahwind/ml';
import { WU_PRIORITY_STATIONS } from '../../packages/weather/src/config/wuPwsNetwork.js';
import { loadTranslationModels, applyTranslations } from '../lib/translationModels.js';
import { fetchMultipleNwsStations } from '../lib/nwsDiscovery.js';

const ALL_STATIONS = ALL_STATION_IDS;

// ── Validation: Synoptic stations being dropped → candidate replacement IDs ──
// Used during the migration overlap period to store paired readings for correlation analysis.
// Paid 10: FPS, UTALP, AMFKM, UTLAK, UTSHR, SND, UTDCD, QSF, UP218, UTCOP
const VALIDATION_PAIRS = {
  'UID28':  ['KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81'],
  'CSC':   ['KUTCEDAR10', 'KUTPLEAS11'],
  'UTOLY': ['KUTSARAT50'],
  'UTORM': ['KUTPLEAS11', 'TEMPEST_134280'],
  'UTPCR': ['KUTSARAT74', 'TEMPEST_124015'],
  'UT7':   ['KUTDRAPE132', 'KUTDRAPE59'],
  'UTPRB': ['KUTSARAT62'],
  'UTRVT': ['KUTRIVER67'],
  'DSTU1': ['KUTHEBER105', 'KUTMIDWA37'],
  'TIMU1': ['SND'],
  'UTDAN': ['KUTHEBER105', 'KUTSTRAW1'],
  'CCPUT': ['KUTSTRAW1', 'KUTSTRAW2'],
  'UTHEB': ['KUTHEBER105', 'KUTHEBER26'],
  'UWCU1': ['KUTSTRAW1', 'KUTSTRAW2'],
  'RVZU1': ['KUTSTRAW2'],
  'UTSLD': ['KUTSTRAW2'],
  'BERU1': ['KUTGARDE9', 'TEMPEST_106250'],
  'UTGRC': ['KUTGARDE9', 'TEMPEST_106250'],
  'UTLTS': ['KUTLOGAN12'],
  'SKY':   [],
  'UTESU': [],
  'UTMPK': [],
  'EPMU1': [],
  'UTHTP': [],
  'UT1':   ['KWYEVANS10', 'KWYEVANS60'],
  'QLN':   ['KUTPLEAS11', 'TEMPEST_141420'],
  'MDAU1': ['KUTMIDWA37', 'KUTHEBER26'],
  'UTPCY': ['KUTMIDWA37'],
  'UTLPC': ['KUTPLEAS11', 'KUTPROVO83'],
  'UTCHL': ['KUTHEBER26'],
  'UR328': ['KUTWILLA3', 'TEMPEST_148360'],
  'BLPU1': ['KUTWILLA3', 'KUTBRIGHA6'],
  'OGP':   ['KUTOGDEN32'],
  'GSLM':  [],
  'UTANT': ['KUTWILLA3'],
  'UTFRW': ['KUTWILLA3'],
  'COOPOGNU1': ['KUTEDEN14'],
  'PC496': ['KUTEDEN14'],
  'UTPVD': ['TEMPEST_159080', 'KUTEDEN14'],
  'UTHUN': ['KUTOGDEN65'],
  'UTLMP': ['KUTNEPHI14'],
  'UTRKY': ['KUTNEPHI14'],
  'UTSCI': [],
  'UTPOW': [],
  'UTMON': [],
};

// Tier 1: kite/PG corridor stations — fetched every run (critical for learning validation)
const WU_TIER1 = [
  'KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62',
  'KUTLEHI73', 'KUTLEHI160', 'KUTLEHI111',
  'KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18',
  'KUTSANDY188',
  'KUTALPIN3', 'KUTALPIN25',
  'KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26',
  'KUTPLEAS11', 'KUTCEDAR10',
];

// Tier 2: fishing-specific stations — fetched on alternating runs to stay within rate limits
const WU_TIER2 = WU_PRIORITY_STATIONS.filter(id => !WU_TIER1.includes(id));

function stationObjFromSynopticFormat(s) {
  const o = s.OBSERVATIONS || {};
  const rawP = o.altimeter_value_1?.value
    ?? o.sea_level_pressure_value_1d?.value
    ?? o.pressure_value_1d?.value
    ?? o.sea_level_pressure_value_1?.value
    ?? null;
  return {
    stationId: s.STID,
    windSpeed: o.wind_speed_value_1?.value ?? null,
    windDirection: o.wind_direction_value_1?.value ?? null,
    windGust: o.wind_gust_value_1?.value ?? null,
    temperature: o.air_temp_value_1?.value ?? null,
    pressure: normalizeToMb(rawP),
    observedAt: o.wind_speed_value_1?.date_time || o.date_time || new Date().toISOString(),
    source: s._source || 'synoptic',
  };
}

async function fetchSynopticLatest() {
  const allIds = [...ALL_STATIONS];
  const { airport, other } = splitStations(allIds);
  const udotIds = other.filter(id => isUdotStation(id));
  const synopticOnlyIds = other.filter(id => !isUdotStation(id));

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsLatest(airport).catch(err => {
      console.warn('[1-ingest] NWS fetch error:', err.message);
      return [];
    }));
  }

  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) {
    fetches.push(fetchUdotLatest(udotIds, udotKey).catch(err => {
      console.warn('[1-ingest] UDOT fetch error:', err.message);
      return [];
    }));
  }

  const synopticFallbackIds = udotKey ? synopticOnlyIds : [...synopticOnlyIds, ...udotIds];

  // Primary: Try NWS multi-station for K-prefix stations in the synoptic list
  const nwsCompatibleIds = synopticFallbackIds.filter(id => /^K[A-Z]{3}/.test(id));
  const nonNwsIds = synopticFallbackIds.filter(id => !/^K[A-Z]{3}/.test(id));

  if (nwsCompatibleIds.length > 0) {
    fetches.push(fetchMultipleNwsStations(nwsCompatibleIds).catch(err => {
      console.warn('[1-ingest] NWS multi-station error:', err.message);
      return [];
    }));
  }

  // For non-airport/non-UDOT mesonet IDs: use Synoptic if available (transition),
  // otherwise use Open-Meteo model data as fallback
  const { synopticToken } = getEnv();
  if (synopticToken && nonNwsIds.length > 0) {
    fetches.push((async () => {
      try {
        const url = `https://api.synopticdata.com/v2/stations/latest?token=${synopticToken}&stids=${nonNwsIds.join(',')}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure&units=english&obtimezone=local`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) {
          console.warn(`[1-ingest] Synoptic returned ${resp.status} — will use Open-Meteo`);
          return [];
        }
        const json = await resp.json();
        return json.STATION || [];
      } catch (err) {
        console.warn('[1-ingest] Synoptic fetch error:', err.message);
        return [];
      }
    })());
  } else if (nonNwsIds.length > 0) {
    // No Synoptic token — fetch Open-Meteo model data for these stations
    fetches.push(fetchOpenMeteoForMesonetIds(nonNwsIds).catch(err => {
      console.warn('[1-ingest] Open-Meteo fallback error:', err.message);
      return [];
    }));
  }

  const results = await Promise.all(fetches);
  const allStationData = results.flat();

  const sources = { nws: 0, udot: 0, synoptic: 0, 'open-meteo': 0 };
  for (const s of allStationData) {
    const src = s._source || 'synoptic';
    sources[src] = (sources[src] || 0) + 1;
  }
  console.log(`[1-ingest] Multi-source: NWS=${sources.nws}, UDOT=${sources.udot}, Synoptic=${sources.synoptic}, Open-Meteo=${sources['open-meteo'] || 0}`);

  return allStationData.map(stationObjFromSynopticFormat);
}

// Coordinates for mesonet stations (used by Open-Meteo fallback when Synoptic is unavailable)
const MESONET_COORDS = {
  FPS:   { lat: 40.452, lng: -111.890, name: 'Flight Park South' },
  CSC:   { lat: 40.400, lng: -111.620, name: 'Cascade Peak' },
  TIMU1: { lat: 40.390, lng: -111.640, name: 'Timpanogos Divide' },
  QLN:   { lat: 40.338, lng: -111.696, name: 'Lindon' },
  UTOLY: { lat: 40.330, lng: -111.890, name: 'Lake Shore / Zig Zag' },
  UID28: { lat: 40.350, lng: -111.900, name: 'Saratoga Springs' },
  QSF:   { lat: 40.050, lng: -111.550, name: 'Spanish Fork Canyon' },
  UTALP: { lat: 40.453, lng: -111.758, name: 'Point of the Mountain' },
  SND:   { lat: 40.576, lng: -111.652, name: 'Snowbird' },
  SKY:   { lat: 40.607, lng: -111.657, name: 'Solitude / Brighton' },
  BERU1: { lat: 41.920, lng: -111.420, name: 'Bear Lake' },
  MDAU1: { lat: 40.475, lng: -111.498, name: 'Midway' },
  EPMU1: { lat: 41.382, lng: -111.930, name: 'East Promontory' },
  GSLM:  { lat: 40.770, lng: -112.180, name: 'Great Salt Lake Marina' },
  DSTU1: { lat: 40.470, lng: -111.510, name: 'Deer Creek Stn' },
  RVZU1: { lat: 40.480, lng: -111.470, name: 'Riverview' },
  CCPUT: { lat: 40.470, lng: -111.450, name: 'Charlston' },
  UWCU1: { lat: 40.460, lng: -111.440, name: 'Wasatch County' },
  UR328: { lat: 41.700, lng: -112.050, name: 'Willard' },
  BLPU1: { lat: 41.680, lng: -112.060, name: 'Brigham Local' },
  OGP:   { lat: 41.196, lng: -111.970, name: 'Ogden Peak' },
  COOPOGNU1: { lat: 41.400, lng: -111.950, name: 'COOP Ogden' },
  PC496: { lat: 41.350, lng: -111.920, name: 'PC496' },
  UTPVD: { lat: 41.300, lng: -111.900, name: 'Powder Valley' },
  UTHUN: { lat: 41.220, lng: -111.870, name: 'Huntsville' },
  UTLMP: { lat: 39.700, lng: -111.850, name: 'Leamington Pass' },
  UTRKY: { lat: 39.650, lng: -111.800, name: 'Rocky Ridge' },
  UTSCI: { lat: 39.200, lng: -111.600, name: 'Scipio' },
  UTPOW: { lat: 37.780, lng: -112.460, name: 'Panguitch Lake' },
  UTMON: { lat: 37.650, lng: -113.180, name: 'Monticello' },
  AMFKM: { lat: 40.305, lng: -111.720, name: 'American Fork Marina' },
  UP218: { lat: 40.080, lng: -111.640, name: 'UP218 Spanish Fork' },
  UTSHR: { lat: 40.520, lng: -111.480, name: 'Silver Creek / Heber' },
  UTMPK: { lat: 40.540, lng: -111.510, name: 'Midway Park' },
  UTESU: { lat: 40.250, lng: -111.660, name: 'East Spanish Fork' },
  UTHTP: { lat: 40.280, lng: -111.690, name: 'Highland / Timpanogos' },
  UTORM: { lat: 40.293, lng: -111.693, name: 'Orem' },
  UTPCR: { lat: 40.270, lng: -111.700, name: 'Provo Canyon Road' },
  UT7:   { lat: 40.240, lng: -111.740, name: 'UT7 Provo' },
  UTPRB: { lat: 40.200, lng: -111.750, name: 'Provo Bay' },
  UTRVT: { lat: 40.260, lng: -111.710, name: 'River Trail' },
  UTLAK: { lat: 40.330, lng: -111.880, name: 'Lakeshore' },
  UTDCD: { lat: 40.405, lng: -111.500, name: 'Deer Creek Dam' },
  UTPCY: { lat: 40.430, lng: -111.520, name: 'Provo Canyon' },
  UTLPC: { lat: 40.380, lng: -111.550, name: 'Lower Provo Canyon' },
  UTCHL: { lat: 40.460, lng: -111.480, name: 'Charleston' },
  UTDAN: { lat: 40.530, lng: -111.500, name: 'Daniels' },
  UTHEB: { lat: 40.510, lng: -111.410, name: 'Heber Valley' },
  UTSLD: { lat: 40.490, lng: -111.460, name: 'Soldier Hollow' },
  UTGRC: { lat: 41.920, lng: -111.400, name: 'Garden City' },
  UTLTS: { lat: 41.740, lng: -111.830, name: 'Logan / Three Sisters' },
  UTCOP: { lat: 40.170, lng: -111.150, name: 'Strawberry Copter' },
};

async function fetchOpenMeteoForMesonetIds(stationIds) {
  const results = [];
  const toFetch = stationIds.filter(id => MESONET_COORDS[id]);
  if (toFetch.length === 0) return results;

  const fetches = toFetch.map(async (stid) => {
    const { lat, lng, name } = MESONET_COORDS[stid];
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        '&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,surface_pressure' +
        '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto';
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) return null;
      const data = await resp.json();
      const c = data.current;
      if (!c) return null;
      return {
        STID: stid,
        NAME: `${name} (Open-Meteo)`,
        LATITUDE: String(lat),
        LONGITUDE: String(lng),
        ELEVATION: '',
        STATUS: 'ACTIVE',
        OBSERVATIONS: {
          date_time: c.time,
          wind_speed_value_1: { value: c.wind_speed_10m ?? null, date_time: c.time },
          wind_direction_value_1: { value: c.wind_direction_10m ?? null, date_time: c.time },
          wind_gust_value_1: { value: c.wind_gusts_10m ?? null, date_time: c.time },
          air_temp_value_1: { value: c.temperature_2m ?? null, date_time: c.time },
          relative_humidity_value_1: { value: c.relative_humidity_2m ?? null, date_time: c.time },
          altimeter_value_1: { value: c.surface_pressure ? +(c.surface_pressure / 33.8639).toFixed(2) : null, date_time: c.time },
          sea_level_pressure_value_1: { value: null, date_time: c.time },
        },
        _source: 'open-meteo',
      };
    } catch (err) {
      console.warn(`[1-ingest] Open-Meteo fallback ${stid}:`, err.message);
      return null;
    }
  });

  const settled = await Promise.allSettled(fetches);
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }
  return results;
}

async function fetchWuPwsLatest() {
  const apiKey = process.env.WU_API_KEY;
  if (!apiKey) return [];

  // Tiered approach: always fetch Tier 1; fetch Tier 2 on alternating runs (even minutes)
  const minute = new Date().getMinutes();
  const isTier2Run = minute % 30 < 15;
  const idsToFetch = isTier2Run ? [...WU_TIER1, ...WU_TIER2] : [...WU_TIER1];

  // Deduplicate (some IDs may overlap)
  const uniqueIds = [...new Set(idsToFetch)];

  // Check Redis cache — skip stations with fresh data (<20 min old)
  const idsNeedingFetch = [];
  const cachedResults = [];
  for (const id of uniqueIds) {
    try {
      const cached = await redisCommand('GET', `wu:cache:${id}`);
      if (cached) {
        cachedResults.push(JSON.parse(cached));
        continue;
      }
    } catch { /* cache miss */ }
    idsNeedingFetch.push(id);
  }

  const results = [...cachedResults];
  for (let i = 0; i < idsNeedingFetch.length; i += 5) {
    const batch = idsNeedingFetch.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const url = `https://api.weather.com/v2/pws/observations/current?stationId=${id}&format=json&units=e&numericPrecision=decimal&apiKey=${apiKey}`;
        const r = await fetch(url);
        if (!r.ok) return null;
        const d = await r.json();
        const obs = d.observations?.[0];
        if (!obs) return null;
        const imp = obs.imperial || {};
        return {
          stationId: obs.stationID,
          windSpeed: imp.windSpeed ?? null,
          windDirection: obs.winddir ?? null,
          windGust: imp.windGust ?? null,
          temperature: imp.temp ?? null,
          humidity: obs.humidity ?? null,
          pressure: null,
          observedAt: obs.obsTimeUtc || new Date().toISOString(),
          source: 'wu-pws',
        };
      })
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
        // Cache each successful WU reading for 20 minutes
        try {
          await redisCommand('SET', `wu:cache:${r.value.stationId}`, JSON.stringify(r.value), 'EX', '1200');
        } catch { /* non-fatal */ }
      }
    }
  }
  console.log(`[1-ingest] WU PWS: ${results.length}/${uniqueIds.length} stations (${cachedResults.length} cached, tier2=${isTier2Run})`);
  return results;
}

// ── Tempest WeatherFlow Stations ──
const TEMPEST_API_TOKEN = process.env.TEMPEST_API_TOKEN || '';
const TEMPEST_STATIONS = [
  { stationId: 114523, id: 'TEMPEST_DC', name: 'Barbed Wire Beach' },
  { stationId: 141420, id: 'TEMPEST_141420', name: 'Lindon 550 N' },
  { stationId: 134280, id: 'TEMPEST_134280', name: 'Orem N 625 W' },
  { stationId: 124015, id: 'TEMPEST_124015', name: 'Seasons View Dr' },
  { stationId: 194125, id: 'TEMPEST_194125', name: 'Lehi N 1090 W' },
  { stationId: 111255, id: 'TEMPEST_111255', name: 'Little Kate Rd' },
  { stationId: 148360, id: 'TEMPEST_148360', name: 'Perry' },
  { stationId: 93590,  id: 'TEMPEST_93590', name: 'Harrisville' },
  { stationId: 159080, id: 'TEMPEST_159080', name: 'N 4000 E' },
  { stationId: 81860,  id: 'TEMPEST_81860', name: 'Pine Loop Rd' },
  { stationId: 106250, id: 'TEMPEST_106250', name: 'Foxridge Rd' },
  { stationId: 103270, id: 'TEMPEST_103270', name: 'Dixie Springs' },
  { stationId: 63500,  id: 'TEMPEST_63500', name: 'Ashley Canyon' },
  { stationId: 107055, id: 'TEMPEST_107055', name: 'S 1800 W' },
];

async function fetchTempestStations() {
  const results = [];
  for (const station of TEMPEST_STATIONS) {
    try {
      const resp = await fetch(
        `https://swd.weatherflow.com/swd/rest/observations/station/${station.stationId}?token=${TEMPEST_API_TOKEN}`
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      const obs = data.obs?.[0];
      if (!obs) continue;

      // Tempest returns metric — convert to imperial for consistency
      const windMph = obs.wind_avg != null ? obs.wind_avg * 2.237 : null;
      const gustMph = obs.wind_gust != null ? obs.wind_gust * 2.237 : null;
      const tempF = obs.air_temperature != null ? obs.air_temperature * 9 / 5 + 32 : null;
      const pressureMb = obs.station_pressure ?? obs.barometric_pressure ?? null;

      results.push({
        stationId: station.id,
        windSpeed: windMph != null ? Math.round(windMph * 10) / 10 : null,
        windDirection: obs.wind_direction ?? null,
        windGust: gustMph != null ? Math.round(gustMph * 10) / 10 : null,
        temperature: tempF != null ? Math.round(tempF * 10) / 10 : null,
        humidity: obs.relative_humidity ?? null,
        pressure: pressureMb,
        solarRadiation: obs.solar_radiation ?? null,
        observedAt: obs.timestamp ? new Date(obs.timestamp * 1000).toISOString() : new Date().toISOString(),
        source: 'tempest',
      });
    } catch (e) {
      console.warn(`[1-ingest] Tempest ${station.id} failed:`, e.message);
    }
  }
  console.log(`[1-ingest] Tempest: ${results.length}/${TEMPEST_STATIONS.length} stations`);
  return results;
}

async function fetchAmbientPWS() {
  const ambientApiKey = process.env.AMBIENT_API_KEY;
  const ambientAppKey = process.env.AMBIENT_APP_KEY;
  if (!ambientApiKey || !ambientAppKey) return null;

  try {
    const resp = await fetch(
      `https://rt.ambientweather.net/v1/devices?apiKey=${ambientApiKey}&applicationKey=${ambientAppKey}`
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    const device = json?.[0]?.lastData;
    if (!device) return null;
    return {
      windSpeed: device.windspeedmph,
      windDirection: device.winddir,
      windGust: device.windgustmph,
      temperature: device.tempf,
    };
  } catch {
    return null;
  }
}

async function storeValidationPairs(stations, now) {
  try {
    const stationMap = new Map(stations.map(s => [s.stationId, s]));
    const pairs = {};
    let pairCount = 0;

    for (const [synId, replacementIds] of Object.entries(VALIDATION_PAIRS)) {
      const synObs = stationMap.get(synId);
      if (!synObs) continue;

      const replacements = {};
      for (const repId of replacementIds) {
        const repObs = stationMap.get(repId);
        if (repObs && repObs.windSpeed != null) {
          replacements[repId] = {
            speed: repObs.windSpeed,
            dir: repObs.windDirection,
            gust: repObs.windGust,
            source: repObs.source || 'unknown',
          };
        }
      }

      if (synObs.windSpeed != null || Object.keys(replacements).length > 0) {
        pairs[synId] = {
          synoptic: { speed: synObs.windSpeed, dir: synObs.windDirection, gust: synObs.windGust },
          replacements,
        };
        pairCount++;
      }
    }

    if (pairCount > 0) {
      const dateKey = `validation:pairs:${now.toISOString().split('T')[0]}`;
      const record = { timestamp: now.toISOString(), pairs };
      await redisCommand('RPUSH', dateKey, JSON.stringify(record));
      await redisCommand('EXPIRE', dateKey, '1209600'); // 14-day TTL
      console.log(`[1-ingest] Validation: ${pairCount} Synoptic→replacement pairs stored`);
    }
  } catch (e) {
    console.warn('[1-ingest] Validation storage failed (non-fatal):', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const env = getEnv();
  if (!hasRedis()) {
    return res.status(500).json({ error: 'Redis not configured' });
  }
  if (!env.synopticToken) {
    console.log('[1-ingest] SYNOPTIC_TOKEN not set — using NWS + WU + Open-Meteo free sources');
  }

  try {
    const now = new Date();
    const key = `obs:${now.toISOString().split('T')[0]}:${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // ── Parallel data fetch: Synoptic + WU PWS + Ambient + Tempest + NWS forecasts ──
    const [synopticResult, wuResult, ambientResult, tempestResult, nwsResult] = await Promise.allSettled([
      fetchSynopticLatest(),
      fetchWuPwsLatest(),
      fetchAmbientPWS(),
      fetchTempestStations(),
      fetchNWSForecasts(redisCommand),
    ]);

    let stations = [
      ...(synopticResult.status === 'fulfilled' ? synopticResult.value : []),
      ...(wuResult.status === 'fulfilled' ? wuResult.value : []),
      ...(tempestResult.status === 'fulfilled' ? tempestResult.value : []),
    ];

    // Prefer WU/Tempest real observations over Open-Meteo model data for prediction-critical stations.
    // If a mesonet station (e.g. FPS) was filled by Open-Meteo but its WU replacement has real data, use WU.
    const stationMap = new Map(stations.map(s => [s.stationId, s]));
    for (const [mesoId, wuIds] of Object.entries(VALIDATION_PAIRS)) {
      const mesoStation = stationMap.get(mesoId);
      if (!mesoStation || mesoStation.source !== 'open-meteo') continue;
      for (const wuId of wuIds) {
        const wuStation = stationMap.get(wuId);
        if (wuStation && wuStation.windSpeed != null) {
          mesoStation.windSpeed = wuStation.windSpeed;
          mesoStation.windDirection = wuStation.windDirection ?? mesoStation.windDirection;
          mesoStation.windGust = wuStation.windGust ?? mesoStation.windGust;
          mesoStation.temperature = wuStation.temperature ?? mesoStation.temperature;
          mesoStation.source = `wu-alias:${wuId}`;
          break;
        }
      }
    }

    // Apply learned translation models (no-op until models:translations exists in Redis)
    try {
      const models = await loadTranslationModels(redisCommand);
      if (models.length > 0) {
        const before = stations.length;
        stations = applyTranslations(stations, models);
        if (stations.length > before) {
          console.log(`[1-ingest] Translations: added ${stations.length - before} translated stations`);
        }
      }
    } catch (e) {
      console.warn('[1-ingest] Translation pass failed (non-fatal):', e.message);
    }

    const ambientPWS = ambientResult.status === 'fulfilled' ? ambientResult.value : null;
    const nwsData = nwsResult.status === 'fulfilled' ? nwsResult.value : null;

    // Merge Ambient PWS into stations so it appears in lake observations
    if (ambientPWS) {
      stations.push({
        stationId: 'PWS',
        windSpeed: ambientPWS.windSpeed ?? null,
        windDirection: ambientPWS.windDirection ?? null,
        windGust: ambientPWS.windGust ?? null,
        temperature: ambientPWS.temperature ?? null,
        pressure: null,
        observedAt: new Date().toISOString(),
        source: 'ambient',
      });
    }

    // Build per-lake observation map
    const observations = {};
    for (const [lakeId, stationIds] of Object.entries(LAKE_STATION_MAP)) {
      observations[lakeId] = stations.filter(s => stationIds.includes(s.stationId));
    }

    const record = { timestamp: now.toISOString(), stations, observations };

    // ── Store raw data to Redis ──
    await Promise.all([
      redisCommand('SET', key, JSON.stringify(record), 'EX', '604800'),
      redisCommand('LPUSH', 'obs:index', key),
      ambientPWS
        ? redisCommand('SET', 'ambient:latest', JSON.stringify(ambientPWS), 'EX', '3600')
        : Promise.resolve(),
    ]);
    await redisCommand('LTRIM', 'obs:index', '0', '672');

    // ── Validation: store paired readings for Synoptic migration correlation ──
    await storeValidationPairs(stations, now);

    // Pressure gradient diagnostic
    const slc = stations.find(s => s.stationId === 'KSLC');
    const pvu = stations.find(s => s.stationId === 'KPVU');
    const gradient = slc?.pressure && pvu?.pressure
      ? Math.round((slc.pressure - pvu.pressure) * 100) / 100
      : null;

    // Store gradient for stage 2 to pick up without re-computing
    if (gradient !== null) {
      await redisCommand('SET', 'ingest:gradient', JSON.stringify(gradient), 'EX', '1200');
    }

    // ── ML Forecast Correction ──────────────────────────────────────
    // Apply XGBoost Wind_Error model to every grid's hourly forecast.
    // Saves both the raw NWS and ML-corrected versions to Redis so
    // every consumer (frontend, stage 2, alerts) gets the smart data.
    let mlApplied = false;
    if (nwsData?.grids && slc?.pressure && pvu?.pressure) {
      try {
        const predictor = new WindPredictor();
        await predictor.loadModel(getModelPath());

        const localTemp = ambientPWS?.temperature
          ?? stations.find(s => s.stationId === 'KPVU')?.temperature
          ?? null;

        if (predictor.isReady && localTemp != null) {
          for (const gridId of Object.keys(nwsData.grids)) {
            const grid = nwsData.grids[gridId];
            if (grid.hourly?.length > 0) {
              grid.mlHourly = predictor.correctHourlyForecast(
                grid.hourly,
                { pressure: slc.pressure },
                { pressure: pvu.pressure },
                localTemp,
              );
            }
          }
          nwsData.mlApplied = true;
          mlApplied = true;

          // Update cached forecast with ML corrections but preserve original TTL
          const ttl = await redisCommand('TTL', 'nws:forecasts');
          const remainingTtl = ttl && ttl > 0 ? String(ttl) : '5400'; // fallback 90min
          await redisCommand('SET', 'nws:forecasts', JSON.stringify(nwsData), 'EX', remainingTtl);
          console.log(`[1-ingest] ML correction applied to ${Object.keys(nwsData.grids).length} grids`);
        }
      } catch (mlErr) {
        console.error('[1-ingest] ML correction failed (non-fatal):', mlErr.message);
      }
    }

    const nwsDiag = nwsData
      ? { status: 'ok', grids: Object.keys(nwsData?.grids || {}).length, fetchedAt: nwsData?.fetchedAt, mlApplied }
      : { status: nwsResult.reason?.message || 'error' };

    console.log(`[1-ingest] Stored ${key} — ${stations.length} stations, gradient=${gradient ?? 'N/A'}, ml=${mlApplied}`);

    // ── Trigger Stage 2: Process Models ──
    triggerNextStage('/api/internal/2-process-models', req);

    return res.status(200).json({
      ok: true,
      stage: '1-ingest',
      timestamp: now.toISOString(),
      stationsCollected: stations.length,
      stationsWithWind: stations.filter(s => s.windSpeed != null).length,
      stationsWithPressure: stations.filter(s => s.pressure != null).length,
      pressureGradient: gradient ?? 'NO DATA',
      ambientPWS: ambientPWS ? 'ok' : 'unavailable',
      nws: nwsDiag,
      ml: mlApplied ? 'applied' : 'skipped',
      storedAs: key,
      chainTriggered: '/api/internal/2-process-models',
    });
  } catch (error) {
    console.error('[1-ingest] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
