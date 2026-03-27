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

const ALL_STATIONS = ALL_STATION_IDS;

const WU_PRIORITY_IDS = [
  'KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62',
  'KUTLEHI73', 'KUTLEHI160', 'KUTLEHI111',
  'KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18',
  'KUTSANDY188',
  'KUTALPIN3', 'KUTALPIN25',
  'KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26',
  'KUTPLEAS11', 'KUTCEDAR10',
];

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
  const { synopticToken } = getEnv();
  if (synopticToken && synopticFallbackIds.length > 0) {
    fetches.push((async () => {
      try {
        const url = `https://api.synopticdata.com/v2/stations/latest?token=${synopticToken}&stids=${synopticFallbackIds.join(',')}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure&units=english&obtimezone=local`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) {
          console.warn(`[1-ingest] Synoptic returned ${resp.status}`);
          return [];
        }
        const json = await resp.json();
        return json.STATION || [];
      } catch (err) {
        console.warn('[1-ingest] Synoptic fetch error:', err.message);
        return [];
      }
    })());
  }

  const results = await Promise.all(fetches);
  const allStationData = results.flat();

  const sources = { nws: 0, udot: 0, synoptic: 0 };
  for (const s of allStationData) {
    if (s._source === 'nws') sources.nws++;
    else if (s._source === 'udot') sources.udot++;
    else sources.synoptic++;
  }
  console.log(`[1-ingest] Multi-source: NWS=${sources.nws}, UDOT=${sources.udot}, Synoptic=${sources.synoptic}`);

  return allStationData.map(stationObjFromSynopticFormat);
}

async function fetchWuPwsLatest() {
  const apiKey = process.env.WU_API_KEY;
  if (!apiKey) return [];

  const results = [];
  for (let i = 0; i < WU_PRIORITY_IDS.length; i += 5) {
    const batch = WU_PRIORITY_IDS.slice(i, i + 5);
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
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
  }
  console.log(`[1-ingest] WU PWS: ${results.length}/${WU_PRIORITY_IDS.length} stations`);
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
  if (!env.synopticToken) {
    return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  }
  if (!hasRedis()) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const now = new Date();
    const key = `obs:${now.toISOString().split('T')[0]}:${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // ── Parallel data fetch: Synoptic + WU PWS + Ambient + NWS forecasts ──
    const [synopticResult, wuResult, ambientResult, nwsResult] = await Promise.allSettled([
      fetchSynopticLatest(),
      fetchWuPwsLatest(),
      fetchAmbientPWS(),
      fetchNWSForecasts(redisCommand),
    ]);

    const stations = [
      ...(synopticResult.status === 'fulfilled' ? synopticResult.value : []),
      ...(wuResult.status === 'fulfilled' ? wuResult.value : []),
    ];

    const ambientPWS = ambientResult.status === 'fulfilled' ? ambientResult.value : null;
    const nwsData = nwsResult.status === 'fulfilled' ? nwsResult.value : null;

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

    const nwsDiag = nwsData
      ? { status: 'ok', grids: Object.keys(nwsData?.grids || {}).length, fetchedAt: nwsData?.fetchedAt }
      : { status: nwsResult.reason?.message || 'error' };

    console.log(`[1-ingest] Stored ${key} — ${stations.length} stations, gradient=${gradient ?? 'N/A'}`);

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
      storedAs: key,
      chainTriggered: '/api/internal/2-process-models',
    });
  } catch (error) {
    console.error('[1-ingest] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
