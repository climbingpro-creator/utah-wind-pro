/**
 * Vercel Cron Job — Server-Side Data Collection + Learning
 * 
 * Runs every 15 minutes (configured in vercel.json).
 * 
 * FULL 24/7 LEARNING LOOP:
 *   1. COLLECT — Fetch all station data from Synoptic → Redis
 *   2. PREDICT — Run wind event predictions for every lake
 *   3. VERIFY  — Compare predictions from 2-4 hrs ago against actuals
 *   4. LEARN   — Update model weights based on accuracy
 * 
 * This ensures the model learns continuously, even when no user has the app open.
 * 
 * Covers ALL 35 Utah lakes, 22 unique weather stations across the state.
 * 
 * Storage: Upstash Redis (free tier — 10k commands/day)
 * 
 * Redis keys:
 *   obs:{date}:{HH}:{mm}   — raw station observations (TTL 7d)
 *   pred:{date}:{HH}:{mm}  — predictions made at this time (TTL 7d)
 *   weights:server          — latest server-computed model weights
 *   accuracy:log            — recent accuracy records (capped 5000)
 *   learning:meta           — cycle count, stats
 * 
 * Client endpoints:
 *   GET ?action=sync     — returns last 24hr of raw observations
 *   GET ?action=weights  — returns server-learned weights + accuracy stats
 */

import { runServerLearningCycle, backfillHistorical, loadWeights, loadMeta } from '../lib/serverLearning.js';
import { fetchNWSForecasts } from '../lib/nwsForecast.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';
import { buildStatisticalModels } from '../lib/historicalAnalysis.js';
import { analyzeFromStations, analyzeAllSpots, storePropagationSnapshot, learnFromPropagation, getPropagationData, backfillPWSHistory } from '../lib/serverPropagation.js';

function getEnv() {
  return {
    synopticToken: process.env.SYNOPTIC_TOKEN,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

const ALL_STATIONS = ALL_STATION_IDS;

function toMountainHour(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver', hour: 'numeric', hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    return date.getUTCHours() - 7;
  }
}

// LAKE_STATION_MAP imported from ../lib/stations.js (single source of truth)

async function redisCommand(command, ...args) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) return null;
  try {
    const resp = await fetch(upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });
    if (!resp.ok) {
      console.error(`Redis ${command} HTTP ${resp.status}: ${resp.statusText}`);
      return null;
    }
    const json = await resp.json();
    if (json.error) {
      console.error(`Redis ${command} error: ${json.error}`);
      return null;
    }
    return json.result;
  } catch (err) {
    console.error(`Redis ${command} failed: ${err.message}`);
    return null;
  }
}

async function redisMGet(keys) {
  if (!keys || keys.length === 0) return [];
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) return keys.map(() => null);
  try {
    const resp = await fetch(upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['MGET', ...keys]),
    });
    if (!resp.ok) return keys.map(() => null);
    const json = await resp.json();
    if (json.error) return keys.map(() => null);
    return json.result || keys.map(() => null);
  } catch {
    return keys.map(() => null);
  }
}

// Altimeter readings are inHg (~29.92), pressure/SLP are mb (~1013).
// Normalize everything to mb for gradient math.
function normalizeToMb(val) {
  if (val == null) return null;
  return val < 50 ? val * 33.864 : val;
}

async function fetchSynopticLatest() {
  const { synopticToken } = getEnv();
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${synopticToken}&stids=${ALL_STATIONS.join(',')}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure&units=english&obtimezone=local`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Synoptic ${resp.status}`);
  const json = await resp.json();

  return (json.STATION || []).map(s => {
    const o = s.OBSERVATIONS || {};
    const rawP = o.altimeter_value_1?.value
      ?? o.sea_level_pressure_value_1d?.value
      ?? o.pressure_value_1d?.value
      ?? null;
    return {
      stationId: s.STID,
      windSpeed: o.wind_speed_value_1?.value ?? null,
      windDirection: o.wind_direction_value_1?.value ?? null,
      windGust: o.wind_gust_value_1?.value ?? null,
      temperature: o.air_temp_value_1?.value ?? null,
      pressure: normalizeToMb(rawP),
      observedAt: o.wind_speed_value_1?.date_time || new Date().toISOString(),
    };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query?.action;
  const READ_ACTIONS = ['sync', 'weights', 'predictions', 'upstream', 'nws', 'ahead', 'analogs', 'models', 'propagation', 'pws-history', 'backfill-pws', 'build-models'];

  // Expensive manual-trigger actions ALWAYS require auth (even if CRON_SECRET isn't set)
  const PROTECTED_ACTIONS = ['backfill'];
  if (PROTECTED_ACTIONS.includes(action)) {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  // Regular cron: requires CRON_SECRET for write operations
  if (!READ_ACTIONS.includes(action) && !PROTECTED_ACTIONS.includes(action)) {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (action === 'sync') return await handleSync(res);
  if (action === 'weights') return await handleWeights(res);
  if (action === 'backfill') return await handleBackfill(req, res);
  if (action === 'upstream') return await handleUpstream(res);
  if (action === 'nws') return await handleNWS(res);
  if (action === 'ahead') return await handleAhead(res);
  if (action === 'predictions') return await handlePredictions(req, res);
  if (action === 'analogs') return await handleAnalogs(res);
  if (action === 'models') return await handleModels(res);
  if (action === 'propagation') return await handlePropagation(res);
  if (action === 'backfill-pws') return await handleBackfillPWS(req, res);
  if (action === 'pws-history') return await handlePWSHistory(res);
  if (action === 'build-models') return await handleBuildModels(req, res);

  const env = getEnv();
  if (!env.synopticToken) {
    return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  }

  try {
    // ── STEP 1: COLLECT ──
    const stations = await fetchSynopticLatest();
    const now = new Date();
    const key = `obs:${now.toISOString().split('T')[0]}:${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const observations = {};
    for (const [lakeId, stationIds] of Object.entries(LAKE_STATION_MAP)) {
      observations[lakeId] = stations.filter(s => stationIds.includes(s.stationId));
    }

    const record = { timestamp: now.toISOString(), stations, observations };

    const hasRedis = !!(env.upstashUrl && env.upstashToken);
    if (hasRedis) {
      await redisCommand('SET', key, JSON.stringify(record), 'EX', '604800');
      await redisCommand('LPUSH', 'obs:index', key);
      await redisCommand('LTRIM', 'obs:index', '0', '672');
    }

    // ── STEP 1.5a: PROPAGATION ANALYSIS (24/7) ──
    let propagationResult = null;
    let allPropagation = null;
    if (hasRedis) {
      try {
        // Fetch ambient PWS for ground truth at Zigzag
        let ambientPWS = null;
        const ambientApiKey = process.env.AMBIENT_API_KEY;
        const ambientAppKey = process.env.AMBIENT_APP_KEY;
        if (ambientApiKey && ambientAppKey) {
          try {
            const ambResp = await fetch(
              `https://rt.ambientweather.net/v1/devices?apiKey=${ambientApiKey}&applicationKey=${ambientAppKey}`
            );
            if (ambResp.ok) {
              const ambJson = await ambResp.json();
              const device = ambJson?.[0]?.lastData;
              if (device) {
                ambientPWS = {
                  windSpeed: device.windspeedmph,
                  windDirection: device.winddir,
                  windGust: device.windgustmph,
                  temperature: device.tempf,
                };
              }
            }
          } catch (_ambErr) { /* non-fatal */ }
        }

        const slcStation = stations.find(s => s.stationId === 'KSLC');
        const pvuStation = stations.find(s => s.stationId === 'KPVU');
        const gradient = slcStation?.pressure && pvuStation?.pressure
          ? Math.round((slcStation.pressure - pvuStation.pressure) * 100) / 100
          : null;

        // Analyze ALL spots, not just Utah Lake
        allPropagation = analyzeAllSpots(stations, ambientPWS, gradient);
        propagationResult = analyzeFromStations(stations, ambientPWS, gradient);

        // Build station readings map for snapshot storage
        const readings = {};
        for (const s of stations) {
          readings[s.stationId] = s;
        }
        if (ambientPWS) readings['PWS'] = ambientPWS;

        await storePropagationSnapshot(redisCommand, allPropagation, readings);

        // Note: PWS history is available directly from Ambient Weather API (3 years)
        // No need to drip-feed into Redis — use ?action=backfill-pws to learn from full history

        // Daily lag learning — run at 10 PM Mountain (5 AM UTC next day)
        const mtHour = toMountainHour(now);
        if (mtHour === 22) {
          const lagResult = await learnFromPropagation(redisCommand);
          if (lagResult) {
            console.log('Propagation lag learning complete:', lagResult.date);
          }
        }
      } catch (propErr) {
        console.error('Propagation analysis error (non-fatal):', propErr.message);
      }
    }

    // ── STEP 1.5b: FETCH NWS FORECASTS (cached 90 min) ──
    let nwsData = null;
    let nwsDiag = { status: 'skipped' };
    if (hasRedis) {
      try {
        nwsData = await fetchNWSForecasts(redisCommand);
        const gridCount = Object.keys(nwsData?.grids || {}).length;
        nwsDiag = {
          status: 'ok',
          grids: gridCount,
          fetchedAt: nwsData?.fetchedAt,
          cached: gridCount > 0,
        };
      } catch (nwsErr) {
        console.error('NWS fetch error (non-fatal):', nwsErr.message);
        nwsDiag = { status: 'error', message: nwsErr.message };
      }
    }

    // ── STEPS 2-4: PREDICT → VERIFY → LEARN ──
    let learningResult = null;
    if (hasRedis) {
      try {
        const recentKeys = await redisCommand('LRANGE', 'obs:index', '0', '15');
        const recentSnapshots = [];
        if (recentKeys?.length > 1) {
          const keysToFetch = recentKeys.slice(1, 16);
          const values = await redisMGet(keysToFetch);
          for (const raw of values) {
            if (raw) {
              try {
                recentSnapshots.push(JSON.parse(raw));
              } catch {
                // intentionally empty: skip malformed snapshot JSON
              }
            }
          }
        }

        // CRITICAL: Redis LPUSH stores newest-first, but scoring functions
        // assume oldest-first (history[0]=oldest, history[last]=newest).
        // Without this sort, temperature drops look like rises and wind
        // shifts are inverted — making ALL trend-based scoring backwards.
        recentSnapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        learningResult = await runServerLearningCycle(
          redisCommand,
          stations,
          recentSnapshots,
          LAKE_STATION_MAP,
          nwsData
        );
      } catch (learnErr) {
        console.error('Learning cycle error (non-fatal):', learnErr.message);
        learningResult = { error: learnErr.message };
      }

      // Auto-rebuild statistical models weekly (Sunday 3 AM Mountain ≈ 10 AM UTC)
      try {
        const utcHour = now.getUTCHours();
        const utcDay = now.getUTCDay(); // 0 = Sunday
        if (utcDay === 0 && utcHour === 10) {
          const modelsRaw = await redisCommand('GET', 'models:statistical');
          const models = modelsRaw ? JSON.parse(modelsRaw) : null;
          const modelAge = models?.builtAt ? Date.now() - new Date(models.builtAt).getTime() : Infinity;
          if (modelAge > 6 * 24 * 3600 * 1000) {
            console.log('Auto-rebuilding statistical models (weekly schedule — 365 days)');
            const { buildStatisticalModels: rebuildModels } = await import('../lib/historicalAnalysis.js');
            await rebuildModels(redisCommand, env.synopticToken, { days: 365 });
          }
        }
      } catch (modelErr) {
        console.error('Auto model rebuild error (non-fatal):', modelErr.message);
      }
    }

    // Diagnostic: verify we're actually getting pressure data
    const slc = stations.find(s => s.stationId === 'KSLC');
    const pvu = stations.find(s => s.stationId === 'KPVU');

    return res.status(200).json({
      ok: true,
      timestamp: now.toISOString(),
      stationsCollected: stations.length,
      stationsWithWind: stations.filter(s => s.windSpeed != null).length,
      stationsWithPressure: stations.filter(s => s.pressure != null).length,
      pressureCheck: {
        kslc: slc?.pressure ?? 'NULL',
        kpvu: pvu?.pressure ?? 'NULL',
        gradient: slc?.pressure && pvu?.pressure ? Math.round((slc.pressure - pvu.pressure) * 100) / 100 : 'NO DATA',
      },
      storedAs: key,
      hasRedis,
      nws: nwsDiag,
      learning: learningResult,
      propagation: propagationResult ? {
        dominant: propagationResult.dominant,
        phase: propagationResult.dominantPhase,
        confidence: propagationResult.dominantConfidence,
        seThermal: propagationResult.seThermal?.phase,
        northFlow: propagationResult.northFlow?.phase,
        spotsTracked: allPropagation ? Object.keys(allPropagation).length : 0,
        activeSpots: allPropagation ? Object.values(allPropagation).filter(s => s.dominantConfidence > 0).length : 0,
      } : null,
    });
  } catch (error) {
    console.error('Cron collect error:', error);
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
    if (!raw) return res.status(200).json({ analogs: null, message: 'No analog data yet — building after more learning cycles' });
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (error) {
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

async function handlePWSHistory(res) {
  try {
    const raw = await redisCommand('GET', 'prop:sessions');
    if (!raw) return res.status(200).json({ sessions: null, message: 'No session data yet — trigger with ?action=backfill-pws' });
    const sessions = JSON.parse(raw);
    const backfill = sessions['pws:backfill'] || null;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      backfill,
      sessionThresholds: {
        kiting: 10,
        foil_kiting: 8,
        paragliding: 5,
        light_wind: 6,
      },
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
      } catch {
        // intentionally empty: skip malformed prediction record
      }
    }

    // Filter by lake if requested
    if (lakeId) {
      allPredictions = allPredictions.filter(p => p.lakeId === lakeId);
    }

    // Deduplicate: keep only the latest prediction per lake+event
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

async function handleNWS(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ forecasts: null, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'nws:forecasts');
    if (!raw) return res.status(200).json({ forecasts: null, message: 'No NWS data cached yet — wait for next cron cycle' });
    const data = JSON.parse(raw);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json(data);
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

async function handleBackfill(req, res) {
  const env = getEnv();
  if (!env.synopticToken) return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  if (!env.upstashUrl || !env.upstashToken) return res.status(500).json({ error: 'Redis not configured' });

  const days = Math.min(parseInt(req.query?.days || '3', 10), 7);

  try {
    const result = await backfillHistorical(
      redisCommand,
      env.synopticToken,
      ALL_STATIONS,
      LAKE_STATION_MAP,
      days
    );
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Backfill error:', error);
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

async function handleModels(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ models: null, message: 'Redis not configured' });
  }
  try {
    const raw = await redisCommand('GET', 'models:statistical');
    if (!raw) return res.status(200).json({ models: null, message: 'No statistical models built yet — trigger with ?action=build-models' });
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
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleBuildModels(req, res) {
  const env = getEnv();
  if (!env.synopticToken) return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  if (!env.upstashUrl || !env.upstashToken) return res.status(500).json({ error: 'Redis not configured' });

  const days = Math.min(parseInt(req.query?.days || '365', 10), 730);

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

async function handleSync(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ records: [], message: 'Redis not configured — using client-side backfill only' });
  }

  try {
    // Get the last 96 keys (24 hours of 15-min intervals)
    const keys = await redisCommand('LRANGE', 'obs:index', '0', '95');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ records: [], message: 'No server-collected data yet' });
    }

    const keysToFetch = keys.slice(0, 96);
    const values = await redisMGet(keysToFetch);
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
