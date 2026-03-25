/**
 * GET /api/current-conditions?lake=utah-lake-zigzag
 *
 * Returns fused, normalized conditions from Ambient + Synoptic for
 * the requested lake.  This is the primary data endpoint for all
 * clients (web, mobile, watch).
 *
 * Response shape:
 * {
 *   lake, timestamp,
 *   stations: [{ id, name, speed, gust, direction, temp, pressure, observedAt }],
 *   ambient: { ... } | null,
 *   summary: { windSpeed, windGust, windDirection, temp, pressure },
 *   meta: { sources, staleAfterMs }
 * }
 */
import { getLakeConfig, ALL_STATION_IDS, LAKE_STATIONS } from './lib/stations.js';
import { splitStations, fetchNwsLatest } from './lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from './lib/udotAdapter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const lakeId = req.query.lake || 'utah-lake-zigzag';
  const config = getLakeConfig(lakeId);
  if (!config) {
    return res.status(400).json({ error: `Unknown lake: ${lakeId}`, validLakes: Object.keys(LAKE_STATIONS) });
  }

  try {
    const [synopticData, ambientData] = await Promise.all([
      fetchSynoptic(config.synoptic),
      config.hasAmbient ? fetchAmbient() : Promise.resolve(null),
    ]);

    const stations = normalizeSynoptic(synopticData, config.synoptic);
    const ambient = ambientData ? normalizeAmbient(ambientData) : null;
    const summary = buildSummary(stations, ambient, config.primary);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=45');
    return res.status(200).json({
      lake: lakeId,
      lakeName: config.name,
      timestamp: new Date().toISOString(),
      stations,
      ambient,
      summary,
      meta: {
        sources: [
          'synoptic',
          ...(ambient ? ['ambient'] : []),
        ],
        staleAfterMs: 180_000,
      },
    });
  } catch (err) {
    console.error('[current-conditions]', err);
    return res.status(502).json({ error: 'Upstream data fetch failed' });
  }
}

// ── Synoptic ────────────────────────────────────────────────────────

async function fetchSynoptic(stids) {
  const { airport, other } = splitStations(stids);
  const udotIds = other.filter(id => isUdotStation(id));
  const synopticOnlyIds = other.filter(id => !isUdotStation(id));

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsLatest(airport).catch(() => []));
  }

  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) {
    fetches.push(fetchUdotLatest(udotIds, udotKey).catch(() => []));
  }

  const synFallback = udotKey ? synopticOnlyIds : [...synopticOnlyIds, ...udotIds];
  const token = process.env.SYNOPTIC_TOKEN;
  if (token && synFallback.length > 0) {
    fetches.push((async () => {
      try {
        const params = new URLSearchParams({
          token, stid: synFallback.join(','),
          vars: 'wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure',
          units: 'english',
        });
        const resp = await fetch(`https://api.synopticdata.com/v2/stations/latest?${params}`,
          { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.STATION || [];
      } catch { return []; }
    })());
  }

  const results = await Promise.all(fetches);
  return { STATION: results.flat() };
}

function normalizeSynoptic(data, requestedStids) {
  if (!data?.STATION) return [];
  return data.STATION.map(s => {
    const o = s.OBSERVATIONS || {};
    return {
      id: s.STID,
      name: s.NAME,
      speed: o.wind_speed_value_1?.value ?? null,
      gust: o.wind_gust_value_1?.value ?? null,
      direction: o.wind_direction_value_1?.value ?? null,
      temp: o.air_temp_value_1?.value ?? null,
      pressure: (o.altimeter_value_1?.value || o.sea_level_pressure_value_1d?.value) ?? null,
      observedAt: o.wind_speed_value_1?.date_time || null,
    };
  }).filter(s => requestedStids.includes(s.id));
}

// ── Ambient ─────────────────────────────────────────────────────────

async function fetchAmbient() {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
  if (!apiKey || !appKey) {
    console.warn('[current-conditions] Ambient keys missing — AMBIENT_API_KEY:', !!apiKey, 'AMBIENT_APP_KEY:', !!appKey);
    return null;
  }

  try {
    const resp = await fetch(
      `https://rt.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`
    );
    if (!resp.ok) {
      console.error('[current-conditions] Ambient HTTP', resp.status, await resp.text().catch(() => ''));
      return null;
    }
    return resp.json();
  } catch (err) {
    console.error('[current-conditions] Ambient fetch error:', err.message);
    return null;
  }
}

function normalizeAmbient(devices) {
  if (!Array.isArray(devices) || !devices.length) return null;
  const d = devices[0].lastData || {};
  return {
    source: 'ambient',
    speed: d.windspeedmph ?? null,
    gust: d.windgustmph ?? null,
    direction: d.winddir ?? null,
    temp: d.tempf ?? null,
    humidity: d.humidity ?? null,
    pressure: d.baromrelin ?? null,
    rain: d.hourlyrainin ?? null,
    observedAt: d.date ? new Date(d.date).toISOString() : null,
  };
}

// ── Summary ─────────────────────────────────────────────────────────

function buildSummary(stations, ambient, primaryStid) {
  const primary = stations.find(s => s.id === primaryStid) || stations[0];
  if (!primary && !ambient) {
    return { windSpeed: null, windGust: null, windDirection: null, temp: null, pressure: null };
  }

  const ambientSpeed = ambient?.speed;
  const stationSpeed = primary?.speed;

  return {
    windSpeed: ambientSpeed ?? stationSpeed ?? null,
    windGust: ambient?.gust ?? primary?.gust ?? null,
    windDirection: ambient?.direction ?? primary?.direction ?? null,
    temp: ambient?.temp ?? primary?.temp ?? null,
    pressure: ambient?.pressure ?? primary?.pressure ?? null,
    source: ambientSpeed != null ? 'ambient' : primary?.id || 'unknown',
  };
}
