/**
 * /api/admin/collect-admin — Protected Admin Operations
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
 */

import { backfillHistorical, loadWeights, loadMeta } from '../lib/serverLearning.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { backfillPWSHistory } from '../lib/serverPropagation.js';
import { getEnv, redisCommand } from '../lib/redis.js';

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
    case 'backfill':     return handleBackfill(req, res);
    case 'backfill-pws': return handleBackfillPWS(req, res);
    case 'build-models': return handleBuildModels(req, res);
    case 'weights':      return handleWeights(res);
    default:
      return res.status(400).json({
        error: `Unknown action: ${action}`,
        available: ['backfill', 'backfill-pws', 'build-models', 'weights'],
      });
  }
}

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
