/**
 * Stage 2 of 3 — ML Processing & Model Learning
 * 
 * Internal endpoint: POST /api/internal/2-process-models
 * Secured by QStash signature verification (falls back to INTERNAL_API_KEY).
 * 
 * Responsibilities:
 *   1. Read fresh raw observations from Redis
 *   2. Run propagation analysis for all spots
 *   3. Run the server learning cycle (predict → verify → learn)
 *   4. Auto-rebuild statistical models on schedule
 *   5. Trigger Stage 3 (dispatch-alerts) via QStash
 * 
 * This is the heaviest stage — gets the most maxDuration.
 */

import { runServerLearningCycle, evaluateAndAdjustWindows, storeWindowPredictions, loadWeights, saveWeights } from '../lib/serverLearning.js';
import { findAllSportWindows, generateWindField, CrossValidationEngine } from '@utahwind/weather';
import { analyzeFromStations, analyzeAllSpots, storePropagationSnapshot, learnFromPropagation } from '../lib/serverPropagation.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { getEnv, redisCommand, redisMGet, hasRedis, toMountainHour } from '../lib/redis.js';
import { triggerNextStage, verifyQStashSignature } from '../lib/qstash.js';

const ALL_STATIONS = ALL_STATION_IDS;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const verified = await verifyQStashSignature(req);
  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized — invalid signature' });
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

    // ── WIND FIELD GENERATION (physics-enhanced wind for fishing alerts) ──
    try {
      const mesoData = {};
      for (const s of stations) {
        mesoData[s.stationId] = {
          speed: s.windSpeed ?? null,
          direction: s.windDirection ?? null,
          gust: s.windGust ?? null,
          temp: s.temperature ?? null,
        };
      }
      if (ambientPWS) {
        mesoData['PWS'] = {
          speed: ambientPWS.windSpeed ?? ambientPWS.speed ?? null,
          direction: ambientPWS.windDirection ?? ambientPWS.direction ?? null,
          gust: ambientPWS.windGust ?? ambientPWS.gust ?? null,
          temp: ambientPWS.temperature ?? ambientPWS.temp ?? null,
        };
      }

      // Locations with LOCATION_STATIONS coverage in WindFieldEngine
      const WIND_FIELD_LOCATIONS = [
        'utah-lake', 'utah-lake-lincoln', 'utah-lake-sandy', 'utah-lake-vineyard',
        'deer-creek', 'jordanelle', 'willard-bay',
        'strawberry', 'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier',
        'bear-lake', 'sulfur-creek',
      ];

      // Aliases: fishing locIds → WindFieldEngine locationIds
      const FISHING_TO_FIELD = {
        'utah-lake':    'utah-lake',
        'deer-creek':   'deer-creek',
        'jordanelle':   'deer-creek',
        'willard-bay':  'willard-bay',
        'strawberry':   'strawberry-ladders',
        'bear-lake':    'bear-lake',
        'sulfur-creek': 'sulfur-creek',
        'pineview':     'willard-bay',
        'provo-lower':  'deer-creek',
        'provo-middle': 'deer-creek',
        'provo-upper':  'deer-creek',
        'weber-upper':  'deer-creek',
        'weber-middle': 'deer-creek',
        'weber-lower':  'willard-bay',
        'echo':         'deer-creek',
        'rockport':     'deer-creek',
        'east-canyon':  'deer-creek',
        'hyrum':        'willard-bay',
      };

      let fieldCount = 0;
      const fieldErrors = [];

      for (const locId of WIND_FIELD_LOCATIONS) {
        try {
          const obsForLoc = latest.observations?.[locId];
          const primaryObs = obsForLoc?.[0];
          const currentWind = primaryObs
            ? { speed: primaryObs.windSpeed ?? 0, direction: primaryObs.windDirection ?? 0 }
            : {};

          const kslc = mesoData['KSLC'] || {};
          const kpvu = mesoData['KPVU'] || {};
          const upstreamData = {
            kslcSpeed: kslc.speed, kslcDirection: kslc.direction,
            kpvuSpeed: kpvu.speed, kpvuDirection: kpvu.direction,
          };

          const field = await generateWindField(locId, currentWind, upstreamData, {}, mesoData);
          if (field?.hours?.length) {
            const compact = {
              locationId: locId,
              generatedAt: field.generatedAt,
              translation: field.translation?.factor ?? null,
              frontalActive: field.frontalActive ?? false,
              thermalPrediction: field.thermalPrediction ?? null,
              currentHour: field.hours[0],
              hours: field.hours.map(h => ({
                hour: h.hour, offset: h.offset,
                speed: h.speed, gust: h.gust,
                direction: h.direction,
                confidence: h.confidence, source: h.source,
                phase: h.phase,
              })),
            };

            await redisCommand('SET', `wind:field:${locId}`, JSON.stringify(compact));
            await redisCommand('EXPIRE', `wind:field:${locId}`, '1200');
            fieldCount++;
          }
        } catch (err) {
          fieldErrors.push({ locId, error: err.message });
        }
      }

      // Write aliases so fishing locations can look up their parent field
      for (const [fishingId, fieldId] of Object.entries(FISHING_TO_FIELD)) {
        if (fishingId !== fieldId) {
          try {
            const existing = await redisCommand('GET', `wind:field:${fieldId}`);
            if (existing) {
              await redisCommand('SET', `wind:field:${fishingId}`, existing);
              await redisCommand('EXPIRE', `wind:field:${fishingId}`, '1200');
            }
          } catch { /* non-fatal */ }
        }
      }

      // Store pressure gradient for fishing alerts
      if (gradient != null) {
        await redisCommand('SET', 'wind:pressure:gradient', JSON.stringify(gradient));
        await redisCommand('EXPIRE', 'wind:pressure:gradient', '1200');
      }

      diagnostics.windField = {
        locationsComputed: fieldCount,
        aliasesMapped: Object.keys(FISHING_TO_FIELD).filter(k => k !== FISHING_TO_FIELD[k]).length,
        errors: fieldErrors.length > 0 ? fieldErrors : undefined,
      };

      if (fieldCount > 0) console.log(`[2-process] Wind field: ${fieldCount} locations computed`);
    } catch (err) {
      console.error('[2-process] Wind field error (non-fatal):', err.message);
      diagnostics.windField = { error: err.message };
    }

    // ── CROSS-VALIDATION: compare Synoptic vs WU for all pairs ──
    try {
      const crossVal = new CrossValidationEngine();
      const synopticStations = stations.filter(s => !s.source || s.source !== 'wu-pws');
      const wuStations = stations.filter(s => s.source === 'wu-pws');

      const cvResults = await crossVal.compare(synopticStations, wuStations);

      // Extract calibrated ratios from results and persist to Redis
      const ratios = {};
      for (const r of cvResults) {
        if (r.speedRatio != null) {
          ratios[r.pairKey] = {
            speedRatio: Math.round(r.speedRatio * 1000) / 1000,
            speedDelta: Math.round((r.speedDelta ?? 0) * 10) / 10,
            dirDelta: r.dirDelta,
            agrees: r.agrees,
            timestamp: r.timestamp,
          };
        }
      }

      // Load existing persisted ratios and merge (rolling update)
      let existingRatios = {};
      try {
        const raw = await redisCommand('GET', 'crossval:ratios');
        if (raw) existingRatios = JSON.parse(raw);
      } catch { /* first run */ }

      for (const [key, val] of Object.entries(ratios)) {
        if (!existingRatios[key]) {
          existingRatios[key] = { ...val, samples: 1, rollingRatio: val.speedRatio };
        } else {
          const ex = existingRatios[key];
          ex.samples = (ex.samples || 0) + 1;
          const w = Math.min(0.9, (ex.samples - 1) / ex.samples);
          ex.rollingRatio = Math.round((ex.rollingRatio * w + val.speedRatio * (1 - w)) * 1000) / 1000;
          ex.agrees = val.agrees;
          ex.timestamp = val.timestamp;
        }
      }

      await redisCommand('SET', 'crossval:ratios', JSON.stringify(existingRatios), 'EX', '604800');

      const agreeing = cvResults.filter(r => r.agrees === true).length;
      const bothOnline = cvResults.filter(r => r.synAvailable && r.wuAvailable).length;
      diagnostics.crossValidation = {
        pairsChecked: cvResults.length,
        bothOnline,
        agreeing,
        persistedPairs: Object.keys(existingRatios).length,
      };
      if (bothOnline > 0) {
        console.log(`[2-process] CrossValidation: ${agreeing}/${bothOnline} pairs agree`);
      }
    } catch (err) {
      console.error('[2-process] CrossValidation error (non-fatal):', err.message);
      diagnostics.crossValidation = { error: err.message };
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

    // ── TRIPLE VALIDATION: Grade yesterday's window predictions ──
    try {
      const weights = await loadWeights(redisCommand) || { eventWeights: {}, lakeWeights: {}, meta: {} };

      // Read NWS data for window generation (may already be loaded above)
      let nwsForWindows = null;
      try {
        const nwsRaw = await redisCommand('GET', 'nws:forecasts');
        if (nwsRaw) nwsForWindows = JSON.parse(nwsRaw);
      } catch { /* non-fatal */ }

      const windowResult = await evaluateAndAdjustWindows(redisCommand, weights, nwsForWindows);

      if (windowResult.windowScores.length > 0) {
        await saveWeights(redisCommand, windowResult.updatedWeights);
        console.log(`[2-process] Window validation: ${windowResult.windowScores.length} windows graded, ` +
          `${windowResult.adjustments.length} weight adjustments, ` +
          `avg accuracy: ${windowResult.updatedWeights.meta?.avgWindowAccuracy ?? '?'}/100`);
      }

      // Store today's predicted windows so they can be graded tomorrow
      if (nwsForWindows?.grids) {
        let totalStored = 0;
        for (const [gridId, grid] of Object.entries(nwsForWindows.grids)) {
          const hourly = grid.mlHourly || grid.hourly;
          if (hourly?.length > 0) {
            const windows = findAllSportWindows(gridId, hourly);
            if (Object.keys(windows).length > 0) {
              totalStored += await storeWindowPredictions(redisCommand, { [gridId]: windows });
            }
          }
        }
        if (totalStored > 0) console.log(`[2-process] Stored ${totalStored} window predictions for tomorrow's grading`);
      }

      diagnostics.windowValidation = {
        scored: windowResult.windowScores.length,
        adjustments: windowResult.adjustments.length,
        avgAccuracy: windowResult.updatedWeights.meta?.avgWindowAccuracy ?? null,
      };
    } catch (err) {
      console.error('[2-process] Window validation error (non-fatal):', err.message);
      diagnostics.windowValidation = { error: err.message };
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
