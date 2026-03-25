/**
 * GET /api/thermal-forecast?lake=utah-lake-zigzag
 *
 * Returns the thermal prediction for a given lake.  Runs the same
 * prediction logic the client uses, but server-side so watches /
 * wearables can consume it without carrying the full engine.
 *
 * Response shape:
 * {
 *   lake, timestamp,
 *   thermal: { probability, startHour, peakHour, windType, consistencyForecast },
 *   glass:   { probability, isGlass, glassWindow, waveLabel, recommendation },
 *   gradient: { slcPressure, provoPressure, delta, direction },
 *   stations: [ ... ],
 *   meta: { tier }
 * }
 *
 * The `tier` field indicates what subscription level is needed:
 *   "free"  → basic probability
 *   "pro"   → full ETA cascade, glass window, consistency forecast
 */
import { getLakeConfig } from './lib/stations.js';
import { verifyAuth } from './lib/supabase.js';
import { splitStations, fetchNwsLatest, fetchNwsHistory } from './lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from './lib/udotAdapter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const lakeId = req.query.lake || 'utah-lake-zigzag';
  const config = getLakeConfig(lakeId);
  if (!config) return res.status(400).json({ error: `Unknown lake: ${lakeId}` });

  // Auth is optional — free users get a truncated response
  let tier = 'free';
  try {
    const auth = await verifyAuth(req);
    if (auth.user) {
      tier = await getUserTier(auth.user.id);
    }
  } catch {
    // No auth or Supabase not configured — default to free
  }

  try {
    const [synoptic, history] = await Promise.all([
      fetchSynopticLatest(config.synoptic),
      fetchSynopticHistory(config.synoptic, 3),
    ]);

    const stations = parseStations(synoptic);
    const gradient = calcGradient(stations);
    const thermal = predictThermal(stations, gradient, history);
    const glass = predictGlass(stations, gradient);

    // Pro-gate: truncate detailed fields for free users
    const response = {
      lake: lakeId,
      lakeName: config.name,
      timestamp: new Date().toISOString(),
      thermal: tier === 'pro' ? thermal : {
        probability: thermal.probability,
        windType: thermal.windType,
      },
      glass: tier === 'pro' ? glass : {
        probability: glass.probability,
        isGlass: glass.isGlass,
      },
      gradient: tier === 'pro' ? gradient : { direction: gradient.direction },
      stations: stations.map(s => ({ id: s.id, speed: s.speed, direction: s.direction })),
      meta: { tier },
    };

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=90');
    return res.status(200).json(response);
  } catch (err) {
    console.error('[thermal-forecast]', err);
    return res.status(502).json({ error: 'Forecast computation failed' });
  }
}

// ── Synoptic helpers ────────────────────────────────────────────────

async function fetchSynopticLatest(stids) {
  const { airport, other } = splitStations(stids);
  const udotIds = other.filter(id => isUdotStation(id));
  const synopticOnlyIds = other.filter(id => !isUdotStation(id));
  const fetches = [];

  if (airport.length > 0) fetches.push(fetchNwsLatest(airport).catch(() => []));

  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) fetches.push(fetchUdotLatest(udotIds, udotKey).catch(() => []));

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

async function fetchSynopticHistory(stids, hours) {
  const { airport, other } = splitStations(stids);
  const fetches = [];

  if (airport.length > 0) fetches.push(fetchNwsHistory(airport, hours).catch(() => []));

  const token = process.env.SYNOPTIC_TOKEN;
  if (token && other.length > 0) {
    fetches.push((async () => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - hours * 3600000);
        const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0];
        const params = new URLSearchParams({
          token, stid: other.join(','),
          start: fmt(start), end: fmt(end),
          vars: 'wind_speed,wind_direction,wind_gust,air_temp', units: 'english',
        });
        const resp = await fetch(`https://api.synopticdata.com/v2/stations/timeseries?${params}`,
          { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.STATION || [];
      } catch { return []; }
    })());
  }

  const results = await Promise.all(fetches);
  return { STATION: results.flat() };
}

function parseStations(data) {
  return (data?.STATION || []).map(s => {
    const o = s.OBSERVATIONS || {};
    return {
      id: s.STID,
      speed: o.wind_speed_value_1?.value ?? 0,
      gust: o.wind_gust_value_1?.value ?? 0,
      direction: o.wind_direction_value_1?.value ?? 0,
      temp: o.air_temp_value_1?.value ?? null,
      pressure: (o.altimeter_value_1?.value || o.sea_level_pressure_value_1d?.value) ?? null,
    };
  });
}

// ── Gradient ────────────────────────────────────────────────────────

function calcGradient(stations) {
  const slc = stations.find(s => s.id === 'KSLC');
  const provo = stations.find(s => s.id === 'KPVU');
  if (!slc?.pressure || !provo?.pressure) {
    return { slcPressure: null, provoPressure: null, delta: 0, direction: 'neutral' };
  }
  const delta = slc.pressure - provo.pressure;
  const direction = delta > 0.02 ? 'north' : delta < -0.02 ? 'south' : 'neutral';
  return { slcPressure: slc.pressure, provoPressure: provo.pressure, delta: +delta.toFixed(3), direction };
}

// ── Thermal prediction (server-side simplified) ─────────────────────

const HOURLY_PROB = [0, 0, 0, 0, 0, 0, 5, 10, 20, 35, 50, 65, 75, 80, 80, 70, 55, 40, 25, 10, 5, 0, 0, 0];
const MONTHLY_MULT = [0.3, 0.4, 0.6, 0.8, 1.0, 1.0, 0.9, 0.95, 0.85, 0.65, 0.4, 0.3];

function predictThermal(stations, gradient, history) {
  const hour = new Date().getHours();
  const month = new Date().getMonth();
  let prob = HOURLY_PROB[hour] * MONTHLY_MULT[month];

  // Gradient boost/penalty
  if (gradient.direction === 'north' && Math.abs(gradient.delta) > 0.03) prob *= 1.3;
  if (gradient.direction === 'south' && Math.abs(gradient.delta) > 0.05) prob *= 0.6;

  // Wind already present — increase confidence
  const primary = stations[0];
  if (primary?.speed >= 8) prob = Math.max(prob, 70);

  prob = Math.min(100, Math.round(prob));

  // Determine wind type from direction
  const dir = primary?.direction ?? 0;
  const windType = (dir >= 140 && dir <= 220) ? 'thermal'
    : ((dir >= 315 || dir <= 45) ? 'north_flow' : 'gradient');

  // Find start/peak hours
  const startHour = HOURLY_PROB.findIndex(p => p >= 20);
  const peakHour = HOURLY_PROB.indexOf(Math.max(...HOURLY_PROB));

  // Build consistency forecast from history spread
  const historySpread = extractHistorySpread(history);
  const isConsistent = historySpread.stddev < 3;

  return {
    probability: prob,
    windType,
    startHour,
    peakHour,
    consistencyForecast: {
      isConsistent,
      stddev: historySpread.stddev,
      description: isConsistent
        ? 'Winds have been steady — smooth, reliable session expected'
        : 'Winds have been variable — expect gusts and lulls',
    },
  };
}

function extractHistorySpread(historyData) {
  const speeds = [];
  for (const s of historyData?.STATION || []) {
    const vals = s.OBSERVATIONS?.wind_speed_set_1 || [];
    speeds.push(...vals.filter(v => v != null));
  }
  if (speeds.length < 2) return { stddev: 0 };
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const variance = speeds.reduce((a, v) => a + (v - mean) ** 2, 0) / speeds.length;
  return { stddev: +Math.sqrt(variance).toFixed(1) };
}

// ── Glass prediction (server-side simplified) ───────────────────────

function predictGlass(stations, gradient) {
  const primary = stations[0];
  const speed = primary?.speed ?? 0;
  const gust = primary?.gust ?? 0;
  const hour = new Date().getHours();

  const isCalm = speed < 4 && gust < 6;
  const isGlass = speed < 2 && gust < 3;

  let prob = 0;
  if (isGlass) prob = 90;
  else if (isCalm) prob = 65;
  else if (speed < 6) prob = 35;
  else prob = 10;

  // Early morning / late evening bonus
  if (hour < 8 || hour > 19) prob = Math.min(100, prob + 15);

  // North gradient kills glass
  if (gradient.direction === 'north' && Math.abs(gradient.delta) > 0.03) {
    prob = Math.max(0, prob - 30);
  }

  const glassStart = hour < 8 ? 6 : 18;
  const glassEnd = hour < 8 ? 9 : 21;

  return {
    probability: Math.round(prob),
    isGlass,
    glassWindow: prob >= 40 ? { start: `${glassStart}:00`, end: `${glassEnd}:00` } : null,
    waveLabel: isGlass ? 'Mirror' : isCalm ? 'Flat' : speed < 8 ? 'Light chop' : 'Choppy',
    recommendation: isGlass
      ? 'Glass conditions — get out now!'
      : isCalm
        ? 'Calm enough for SUP, kayak, or flat-water cruising'
        : 'Wind may be too strong for glass activities',
  };
}

// ── Subscription tier check ─────────────────────────────────────────

async function getUserTier(userId) {
  try {
    const { getSupabase } = await import('./lib/supabase.js');
    const supabase = getSupabase();

    // Use the DB function which checks status + period expiry in one shot
    const { data, error } = await supabase.rpc('get_user_tier', { uid: userId });
    if (error) {
      console.warn('[getUserTier] RPC error, falling back to query:', error.message);
      // Fallback: direct query with expiry check
      const { data: row } = await supabase
        .from('subscriptions')
        .select('tier, status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      if (!row) return 'free';
      if (row.current_period_end && new Date(row.current_period_end) < new Date()) return 'free';
      return row.tier || 'free';
    }
    return data || 'free';
  } catch {
    return 'free';
  }
}
