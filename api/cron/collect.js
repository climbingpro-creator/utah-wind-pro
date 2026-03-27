/**
 * /api/cron/collect — Read-Only Data API
 * 
 * This file has been refactored. The cron job logic has been moved to:
 *   - api/cron/1-ingest.js       (Stage 1: data fetching)
 *   - api/internal/2-process-models.js  (Stage 2: ML processing)
 *   - api/internal/3-dispatch-alerts.js (Stage 3: notifications)
 * 
 * This file now ONLY serves client-facing read endpoints:
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
 * Protected (auth required):
 *   ?action=backfill     — historical observation backfill
 *   ?action=backfill-pws — PWS history backfill
 *   ?action=build-models — manual statistical model rebuild
 */

import { runServerLearningCycle, backfillHistorical, loadWeights, loadMeta } from '../lib/serverLearning.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { backfillPWSHistory, getPropagationData } from '../lib/serverPropagation.js';
import { getEnv, redisCommand, redisMGet } from '../lib/redis.js';

const ALL_STATIONS = ALL_STATION_IDS;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query?.action;
  if (!action) {
    return res.status(200).json({
      message: 'Read-only API. Cron moved to /api/cron/1-ingest.',
      availableActions: [
        'context', 'sync', 'weights', 'predictions', 'upstream',
        'nws', 'ahead', 'analogs', 'models', 'propagation',
        'pws-history', 'backfill', 'backfill-pws', 'build-models',
      ],
    });
  }

  // Expensive manual-trigger actions require auth
  const PROTECTED_ACTIONS = ['backfill', 'build-models', 'backfill-pws'];
  if (PROTECTED_ACTIONS.includes(action)) {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
    case 'backfill':     return handleBackfill(req, res);
    case 'backfill-pws': return handleBackfillPWS(req, res);
    case 'build-models': return handleBuildModels(req, res);
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}

// ── Read Handlers ───────────────────────────────────────────

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
    const weights = await loadWeights(redisCommand);
    const meta = await loadMeta(redisCommand);
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
    return res.status(200).json({ forecasts: null, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'nws:forecasts');
    if (!raw) return res.status(200).json({ forecasts: null, message: 'No NWS data cached yet' });
    const data = JSON.parse(raw);
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

// ── Protected Handlers ──────────────────────────────────────

async function handleBackfill(req, res) {
  const env = getEnv();
  if (!env.synopticToken) return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  if (!env.upstashUrl || !env.upstashToken) return res.status(500).json({ error: 'Redis not configured' });

  const days = Math.min(parseInt(req.query?.days || '3', 10), 7);
  try {
    const result = await backfillHistorical(redisCommand, env.synopticToken, ALL_STATIONS, LAKE_STATION_MAP, days);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Backfill error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleBackfillPWS(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const days = Math.min(parseInt(req.query?.days || '90', 10), 1095);
  try {
    const result = await backfillPWSHistory(redisCommand, days);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('PWS backfill error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleBuildModels(req, res) {
  const env = getEnv();
  if (!env.synopticToken) return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  if (!env.upstashUrl || !env.upstashToken) return res.status(500).json({ error: 'Redis not configured' });

  const days = Math.min(parseInt(req.query?.days || '365', 10), 365);
  try {
    const { models, log } = await buildStatisticalModels(redisCommand, env.synopticToken, { days });
    return res.status(200).json({
      ok: true,
      daysAnalyzed: models.daysAnalyzed,
      stationCount: models.stationCount,
      totalReadings: models.totalReadings,
      eventCounts: models.eventCounts,
      correlationCount: Object.keys(models.lagCorrelations).length,
      thermalProfileCount: Object.keys(models.thermalProfiles).length,
      fingerprintCount: Object.keys(models.fingerprints).length,
      log,
    });
  } catch (error) {
    console.error('Build models error:', error);
    return res.status(500).json({ error: error.message });
  }
}
