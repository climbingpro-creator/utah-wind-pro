/**
 * Stage 2 of 3 — ML Processing & Model Learning
 * 
 * Internal endpoint: POST /api/internal/2-process-models
 * Secured by INTERNAL_API_KEY header.
 * 
 * Responsibilities:
 *   1. Read fresh raw observations from Redis
 *   2. Run propagation analysis for all spots
 *   3. Run the server learning cycle (predict → verify → learn)
 *   4. Auto-rebuild statistical models on schedule
 *   5. Trigger Stage 3 (dispatch-alerts) via async HTTP POST
 * 
 * This is the heaviest stage — gets the most maxDuration.
 */

import { runServerLearningCycle, loadWeights } from '../lib/serverLearning.js';
import { analyzeFromStations, analyzeAllSpots, storePropagationSnapshot, learnFromPropagation } from '../lib/serverPropagation.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { fetchNWSForecasts } from '../lib/nwsForecast.js';
import {
  getEnv, redisCommand, redisMGet, hasRedis,
  toMountainHour, verifyInternalKey, triggerNextStage,
} from '../lib/redis.js';

const ALL_STATIONS = ALL_STATION_IDS;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  if (!verifyInternalKey(req)) {
    return res.status(401).json({ error: 'Unauthorized — invalid internal key' });
  }

  if (!hasRedis()) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const now = new Date();
    const diagnostics = { propagation: null, learning: null, modelRebuild: null };

    // ── Read latest observation snapshot from Redis ──
    const obsKeys = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (!obsKeys?.length) {
      return res.status(200).json({ ok: true, stage: '2-process-models', skipped: 'no observations in Redis' });
    }

    const latestRaw = await redisCommand('GET', obsKeys[0]);
    if (!latestRaw) {
      return res.status(200).json({ ok: true, stage: '2-process-models', skipped: 'latest obs key empty' });
    }

    const latest = JSON.parse(latestRaw);
    const stations = latest.stations || [];

    // ── Read Ambient PWS from Redis (stored by stage 1) ──
    let ambientPWS = null;
    try {
      const ambRaw = await redisCommand('GET', 'ambient:latest');
      if (ambRaw) ambientPWS = JSON.parse(ambRaw);
    } catch { /* non-fatal */ }

    // ── Read pre-computed gradient from Redis ──
    let gradient = null;
    try {
      const gradRaw = await redisCommand('GET', 'ingest:gradient');
      if (gradRaw) gradient = JSON.parse(gradRaw);
    } catch {
      const slc = stations.find(s => s.stationId === 'KSLC');
      const pvu = stations.find(s => s.stationId === 'KPVU');
      if (slc?.pressure && pvu?.pressure) {
        gradient = Math.round((slc.pressure - pvu.pressure) * 100) / 100;
      }
    }

    // ── PROPAGATION ANALYSIS ──
    try {
      const allPropagation = analyzeAllSpots(stations, ambientPWS, gradient);
      const propagationResult = analyzeFromStations(stations, ambientPWS, gradient);

      const readings = {};
      for (const s of stations) readings[s.stationId] = s;
      if (ambientPWS) readings['PWS'] = ambientPWS;

      await storePropagationSnapshot(redisCommand, allPropagation, readings);

      // Daily lag learning at 10 PM Mountain
      const mtHour = toMountainHour(now);
      if (mtHour === 22) {
        const lagResult = await learnFromPropagation(redisCommand);
        if (lagResult) console.log('[2-process] Propagation lag learning complete:', lagResult.date);
      }

      diagnostics.propagation = {
        dominant: propagationResult?.dominant,
        phase: propagationResult?.dominantPhase,
        confidence: propagationResult?.dominantConfidence,
        seThermal: propagationResult?.seThermal?.phase,
        northFlow: propagationResult?.northFlow?.phase,
        spotsTracked: allPropagation ? Object.keys(allPropagation).length : 0,
        activeSpots: allPropagation ? Object.values(allPropagation).filter(s => s.dominantConfidence > 0).length : 0,
      };
    } catch (err) {
      console.error('[2-process] Propagation error (non-fatal):', err.message);
      diagnostics.propagation = { error: err.message };
    }

    // ── LEARNING CYCLE (predict → verify → learn) ──
    try {
      const recentKeys = await redisCommand('LRANGE', 'obs:index', '0', '15');
      const recentSnapshots = [];
      if (recentKeys?.length > 1) {
        const keysToFetch = recentKeys.slice(1, 16);
        const values = await redisMGet(keysToFetch);
        for (const raw of values) {
          if (raw) {
            try { recentSnapshots.push(JSON.parse(raw)); } catch { /* skip malformed */ }
          }
        }
      }

      recentSnapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Read NWS forecasts from Redis (stored by stage 1)
      let nwsData = null;
      try {
        const nwsRaw = await redisCommand('GET', 'nws:forecasts');
        if (nwsRaw) nwsData = JSON.parse(nwsRaw);
      } catch { /* non-fatal */ }

      const learningResult = await runServerLearningCycle(
        redisCommand,
        stations,
        recentSnapshots,
        LAKE_STATION_MAP,
        nwsData
      );
      diagnostics.learning = learningResult;
    } catch (err) {
      console.error('[2-process] Learning cycle error (non-fatal):', err.message);
      diagnostics.learning = { error: err.message };
    }

    // ── AUTO-REBUILD STATISTICAL MODELS ──
    try {
      const modelsRaw = await redisCommand('GET', 'models:statistical');
      const models = modelsRaw ? JSON.parse(modelsRaw) : null;
      const modelAge = models?.builtAt ? Date.now() - new Date(models.builtAt).getTime() : Infinity;
      const currentStationCount = ALL_STATIONS.length;
      const modelStationCount = models?.stationCount || 0;
      const stationsChanged = currentStationCount !== modelStationCount;

      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();
      const weeklyRebuild = utcDay === 0 && utcHour === 10 && modelAge > 6 * 24 * 3600 * 1000;

      if (stationsChanged || !models || weeklyRebuild) {
        const reason = stationsChanged
          ? `Station config changed (${modelStationCount} → ${currentStationCount})`
          : !models ? 'No models exist yet' : 'Weekly schedule';
        console.log(`[2-process] Auto-rebuilding statistical models: ${reason}`);

        const { synopticToken } = getEnv();
        await buildStatisticalModels(redisCommand, synopticToken, { days: 365 });
        diagnostics.modelRebuild = reason;
      }
    } catch (err) {
      console.error('[2-process] Model rebuild error (non-fatal):', err.message);
      diagnostics.modelRebuild = { error: err.message };
    }

    console.log(`[2-process] Complete — propagation=${diagnostics.propagation?.spotsTracked || 0} spots`);

    // ── Trigger Stage 3: Dispatch Alerts ──
    triggerNextStage('/api/internal/3-dispatch-alerts', req);

    return res.status(200).json({
      ok: true,
      stage: '2-process-models',
      timestamp: now.toISOString(),
      stationsProcessed: stations.length,
      ...diagnostics,
      chainTriggered: '/api/internal/3-dispatch-alerts',
    });
  } catch (error) {
    console.error('[2-process] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
