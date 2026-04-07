/**
 * /api/cron/collect — Read-Only Data API (lightweight)
 *
 * Client-facing read endpoints only. All heavy ML imports have been moved
 * to api/admin/collect-admin.js to optimize cold starts.
 *
 * Read actions (public):
 *   ?action=context     — model context for frontend prediction engine
 *   ?action=sync        — last 24hr of raw observations
 *   ?action=weights     — server-learned weights + accuracy stats
 *   ?action=predictions — recent wind event predictions
 *   ?action=upstream    — upstream corridor signals
 *   ?action=nws         — cached NWS forecasts
 *   ?action=ahead       — ahead-of-forecast event log
 *   ?action=analogs     — pattern analog matches
 *   ?action=models      — statistical models summary
 *   ?action=propagation — propagation analysis data
 *   ?action=pws-history — PWS session data
 *
 * Admin actions redirect to /api/internal/admin:
 *   ?action=backfill, backfill-pws, build-models
 */

import { getPropagationData } from '../lib/serverPropagation.js';
import { getEnv, redisCommand, redisMGet, checkRateLimit } from '../lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-internal-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query?.action;
  
  // Public read-only actions that the frontend needs - no auth required
  const PUBLIC_ACTIONS = new Set([
    'context', 'sync', 'weights', 'nws', 'ahead', 'analogs', 
    'models', 'propagation', 'pws-history', 'upstream',
  ]);
  
  // Protected actions require internal API key
  const PROTECTED_ACTIONS = new Set(['predictions']);
  
  if (action && PROTECTED_ACTIONS.has(action)) {
    const apiKey = req.headers['x-internal-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!expectedKey || !apiKey || apiKey !== expectedKey) {
      return res.status(403).json({ error: 'Forbidden — valid x-internal-api-key header required' });
    }
  }
  if (!action) {
    return res.status(200).json({
      message: 'Read-only API. Cron moved to /api/cron/1-ingest. Admin ops at /api/internal/admin.',
      availableActions: [
        'context', 'sync', 'weights', 'predictions', 'upstream',
        'nws', 'ahead', 'analogs', 'models', 'propagation', 'pws-history',
      ],
    });
  }

  // Admin actions → redirect to the separate admin endpoint
  const ADMIN_ACTIONS = ['backfill', 'build-models', 'backfill-pws'];
  if (ADMIN_ACTIONS.includes(action)) {
    return res.status(301).json({
      error: `Action '${action}' has moved to /api/internal/admin?action=${action}`,
      redirect: `/api/internal/admin?action=${action}`,
    });
  }

  // Rate limit public read endpoints
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`collect:${clientIp}`);
  if (rl.limited) {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }

  switch (action) {
    case 'context':      return handleContext(res);
    case 'sync':         return handleSync(res);
    case 'weights':      return handleWeights(res);
    case 'predictions':  return handlePredictions(req, res);
    case 'upstream':     return handleUpstream(res);
    case 'nws':          return handleNWS(res);
    case 'ahead':        return handleAhead(res);
    case 'analogs':      return handleAnalogs(res);
    case 'models':       return handleModels(res);
    case 'propagation':  return handlePropagation(res);
    case 'pws-history':  return handlePWSHistory(res);
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}

// ── Read Handlers (no heavy imports needed) ─────────────────

async function handleContext(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ error: 'Redis not configured', partial: true });
  }

  try {
    const keys = [
      'models:statistical',
      'weights:server',
      'nws:forecasts',
      'pattern:analogs',
      'prop:lags',
      'prop:sessions',
    ];
    const values = await redisMGet(keys);

    const models = values[0] ? JSON.parse(values[0]) : null;
    const weights = values[1] ? JSON.parse(values[1]) : null;
    const nws = values[2] ? JSON.parse(values[2]) : null;
    const analogs = values[3] ? JSON.parse(values[3]) : null;
    const propLags = values[4] ? JSON.parse(values[4]) : null;
    const propSessions = values[5] ? JSON.parse(values[5]) : null;

    const now = new Date();
    let currentMonth;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver', month: 'numeric',
      }).formatToParts(now);
      currentMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
    } catch { currentMonth = now.getUTCMonth(); }

    let currentHour;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver', hour: 'numeric', hour12: false,
      }).formatToParts(now);
      currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
    } catch { currentHour = now.getUTCHours() - 7; }

    let monthClimatology = null;
    if (models?.climatology) {
      monthClimatology = {};
      for (const [stid, months] of Object.entries(models.climatology)) {
        if (months[currentMonth]) {
          monthClimatology[stid] = months[currentMonth];
        }
      }
    }

    const context = {
      lagCorrelations: models?.lagCorrelations || null,
      climatology: monthClimatology,
      currentMonth,
      currentHour,
      fingerprints: models?.fingerprints || null,
      calibration: models?.calibrationCurves || null,
      gradientThresholds: models?.gradientThresholds || null,
      thermalProfiles: models?.thermalProfiles || null,
      learnedWeights: weights || null,
      nwsHourly: nws?.grids || null,
      mlApplied: nws?.mlApplied || false,
      learnedLags: propLags || null,
      learnedSessions: propSessions || null,
      analogs: analogs || null,
      modelsBuiltAt: models?.builtAt || null,
      modelsStationCount: models?.stationCount || 0,
      modelsTotalReadings: models?.totalReadings || 0,
      updatedAt: now.toISOString(),
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(context);
  } catch (error) {
    console.error('Context fetch error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleSync(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ records: [], message: 'Redis not configured' });
  }

  try {
    const keys = await redisCommand('LRANGE', 'obs:index', '0', '95');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ records: [], message: 'No server-collected data yet' });
    }

    const values = await redisMGet(keys.slice(0, 96));
    const records = [];
    for (const data of values) {
      if (data) {
        try { records.push(JSON.parse(data)); } catch { /* skip bad data */ }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ records, count: records.length });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleWeights(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ weights: null, message: 'Redis not configured' });
  }

  try {
    // Read weights directly from Redis — no heavy serverLearning import needed
    const [weightsRaw, metaRaw] = await Promise.all([
      redisCommand('GET', 'weights:server'),
      redisCommand('GET', 'learning:meta'),
    ]);
    const weights = weightsRaw ? JSON.parse(weightsRaw) : null;
    const meta = metaRaw ? JSON.parse(metaRaw) : null;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ weights, meta });
  } catch (error) {
    console.error('Weights fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePredictions(req, res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ predictions: [], message: 'Redis not configured' });
  }
  try {
    const lakeId = req.query?.lake || null;
    const keys = await redisCommand('LRANGE', 'pred:index', '0', '11');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ predictions: [], message: 'No predictions yet' });
    }

    let allPredictions = [];
    const values = await redisMGet(keys);
    for (const raw of values) {
      if (!raw) continue;
      try {
        const record = JSON.parse(raw);
        const preds = record.predictions || [];
        for (const p of preds) {
          allPredictions.push({ ...p, timestamp: record.timestamp });
        }
      } catch { /* skip malformed */ }
    }

    if (lakeId) {
      allPredictions = allPredictions.filter(p => p.lakeId === lakeId);
    }

    const seen = new Map();
    for (const p of allPredictions) {
      const key = `${p.lakeId}:${p.eventType}`;
      const existing = seen.get(key);
      if (!existing || new Date(p.timestamp) > new Date(existing.timestamp)) {
        seen.set(key, p);
      }
    }

    const deduplicated = Array.from(seen.values())
      .sort((a, b) => b.probability - a.probability);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      predictions: deduplicated,
      count: deduplicated.length,
      lakes: [...new Set(deduplicated.map(p => p.lakeId))].length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleUpstream(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ signals: [], message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'upstream:latest');
    if (!raw) return res.status(200).json({ signals: [], message: 'No upstream data yet' });
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleNWS(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ forecasts: null, mlApplied: false, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'nws:forecasts');
    if (!raw) return res.status(200).json({ forecasts: null, mlApplied: false, message: 'No NWS data cached yet' });
    const data = JSON.parse(raw);
    if (!('mlApplied' in data)) data.mlApplied = false;
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleAhead(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ log: [], message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'ahead:log');
    if (!raw) return res.status(200).json({ log: [], message: 'No ahead-of-forecast events yet' });
    const log = JSON.parse(raw);
    const confirmed = log.filter(e => e.leadTimeHours != null);
    const avgLeadTime = confirmed.length > 0
      ? Math.round((confirmed.reduce((s, e) => s + e.leadTimeHours, 0) / confirmed.length) * 10) / 10
      : null;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      log,
      stats: {
        total: log.length,
        aheadEvents: log.filter(e => e.status === 'ahead').length,
        confirmed: confirmed.length,
        avgLeadTimeHours: avgLeadTime,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleAnalogs(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ analogs: null, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'pattern:analogs');
    if (!raw) return res.status(200).json({ analogs: null, message: 'No analog data yet' });
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleModels(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ models: null, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'models:statistical');
    if (!raw) return res.status(200).json({ models: null, message: 'No statistical models built yet' });
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({
      version: data.version,
      builtAt: data.builtAt,
      daysAnalyzed: data.daysAnalyzed,
      stationCount: data.stationCount,
      totalReadings: data.totalReadings,
      eventCounts: data.eventCounts,
      climatology: data.climatology,
      lagCorrelations: data.lagCorrelations,
      gradientThresholds: data.gradientThresholds,
      thermalProfiles: data.thermalProfiles,
      fingerprints: data.fingerprints,
      calibrationCurves: data.calibrationCurves,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handlePropagation(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ propagation: null, message: 'Redis not configured' });
  }
  try {
    const data = await getPropagationData(redisCommand);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handlePWSHistory(res) {
  try {
    const raw = await redisCommand('GET', 'prop:sessions');
    if (!raw) return res.status(200).json({ sessions: null, message: 'No session data yet' });
    const sessions = JSON.parse(raw);
    const backfill = sessions['pws:backfill'] || null;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      backfill,
      sessionThresholds: { kiting: 10, foil_kiting: 8, paragliding: 5, light_wind: 6 },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
