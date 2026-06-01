/**
 * /api/internal/admin — Protected Admin Operations
 *
 * Heavy ML imports (serverLearning 83KB, historicalAnalysis 39KB) are isolated
 * here to keep the public read API (api/cron/collect.js) cold-start fast.
 *
 * All actions require CRON_SECRET authorization.
 *
 * Actions:
 *   ?action=backfill      — historical observation backfill (max 7 days)
 *   ?action=backfill-pws  — PWS history backfill (max 1095 days)
 *   ?action=build-models  — manual statistical model rebuild (max 365 days)
 *   ?action=weights       — server-learned weights + accuracy stats
 */

import { backfillHistorical, loadWeights, loadMeta, runServerLearningCycle } from '../lib/serverLearning.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { backfillPWSHistory, getPropagationData, autoTuneChains } from '../lib/serverPropagation.js';
import { getEnv, redisCommand, redisMGet } from '../lib/redis.js';

const ALL_STATIONS = ALL_STATION_IDS;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const action = req.query?.action;

  switch (action) {
    case 'backfill':      return handleBackfill(req, res);
    case 'backfill-pws':  return handleBackfillPWS(req, res);
    case 'build-models':  return handleBuildModels(req, res);
    case 'weights':       return handleWeights(res);
    case 'run-learning':  return handleRunLearning(res);
    case 'health':        return handleHealth(res);
    case 'tune':          return handleTune(res);
    default:
      return res.status(400).json({
        error: `Unknown action: ${action}`,
        available: ['backfill', 'backfill-pws', 'build-models', 'weights', 'run-learning', 'health', 'tune'],
      });
  }
}

async function handleBackfill(req, res) {
  const env = getEnv();
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

async function handleWeights(res) {
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

async function handleRunLearning(res) {
  const env = getEnv();
  if (!env.upstashUrl || !env.upstashToken) return res.status(500).json({ error: 'Redis not configured' });

  const steps = {};
  try {
    // 1. Load latest observations
    steps.obsIndex = 'loading...';
    const obsKeys = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (!obsKeys?.length) return res.status(200).json({ error: 'No observations in Redis', steps });
    steps.obsIndex = obsKeys[0];

    const latestRaw = await redisCommand('GET', obsKeys[0]);
    if (!latestRaw) return res.status(200).json({ error: 'Latest obs key empty', steps });
    const latest = JSON.parse(latestRaw);
    const stations = latest.stations || [];
    steps.stationCount = stations.length;

    // 2. Load recent snapshots
    const recentKeys = await redisCommand('LRANGE', 'obs:index', '0', '15');
    const recentSnapshots = [];
    if (recentKeys?.length > 1) {
      const keysToFetch = recentKeys.slice(1, 16);
      const values = await redisMGet(keysToFetch);
      for (const raw of values) {
        if (raw) {
          try { recentSnapshots.push(JSON.parse(raw)); } catch { /* skip */ }
        }
      }
    }
    recentSnapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    steps.snapshotCount = recentSnapshots.length;

    // 3. Load NWS data
    let nwsData = null;
    try {
      const nwsRaw = await redisCommand('GET', 'nws:forecasts');
      if (nwsRaw) nwsData = JSON.parse(nwsRaw);
    } catch { /* non-fatal */ }
    steps.nwsAvailable = !!nwsData;

    // 4. Run learning cycle
    steps.learningStarted = new Date().toISOString();
    const result = await runServerLearningCycle(
      redisCommand, stations, recentSnapshots, LAKE_STATION_MAP, nwsData
    );
    steps.learningCompleted = new Date().toISOString();

    return res.status(200).json({ ok: true, steps, result });
  } catch (error) {
    console.error('Run-learning error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5), steps });
  }
}

async function handleHealth(res) {
  try {
    const [weights, meta, propData] = await Promise.all([
      loadWeights(redisCommand),
      loadMeta(redisCommand),
      getPropagationData(redisCommand),
    ]);

    const health = {
      learning: {
        totalCycles: meta?.totalCycles ?? 0,
        totalPredictions: meta?.totalPredictions ?? 0,
        totalVerified: meta?.totalVerified ?? 0,
        lastCycle: meta?.lastCycle ?? null,
        overallAccuracy: weights?.meta?.overallAccuracy ?? null,
        nwsAccuracy: weights?.meta?.nwsOverallAccuracy ?? null,
        eventAccuracy: weights?.meta?.eventAccuracy ?? null,
        avgWindowAccuracy: weights?.meta?.avgWindowAccuracy ?? null,
      },
      propagation: {
        totalChains: Object.keys(propData?.hitRates ?? {}).length,
        totalDaysTracked: propData?.totalDaysTracked ?? 0,
        hitRates: propData?.hitRates ?? {},
        lagCount: Object.keys(propData?.lags ?? {}).length,
      },
      tuning: propData?.tuning ?? null,
      status: 'ok',
    };

    // Overall system grade
    const acc = health.learning.overallAccuracy;
    const chainHealthy = health.tuning?.healthyChains ?? 0;
    const chainTotal = health.tuning?.totalChains ?? 1;
    health.grade = acc >= 0.7 && chainHealthy / chainTotal > 0.6 ? 'A'
      : acc >= 0.5 ? 'B'
      : acc > 0 ? 'C'
      : 'N/A';

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleTune(res) {
  try {
    const result = await autoTuneChains(redisCommand);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Auto-tune error:', error);
    return res.status(500).json({ error: error.message });
  }
}
