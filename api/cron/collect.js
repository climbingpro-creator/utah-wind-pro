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
 *   accuracy:log            — recent accuracy records (capped 500)
 *   learning:meta           — cycle count, stats
 * 
 * Client endpoints:
 *   GET ?action=sync     — returns last 24hr of raw observations
 *   GET ?action=weights  — returns server-learned weights + accuracy stats
 */

import { runServerLearningCycle, backfillHistorical, loadWeights, loadMeta } from '../lib/serverLearning.js';
import { fetchNWSForecasts } from '../lib/nwsForecast.js';
import { LAKE_STATION_MAP, ALL_STATION_IDS } from '../lib/stations.js';

function getEnv() {
  return {
    synopticToken: process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

const ALL_STATIONS = ALL_STATION_IDS;

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
  const action = req.query?.action;

  if (action === 'sync') return await handleSync(res);
  if (action === 'weights') return await handleWeights(res);
  if (action === 'backfill') return await handleBackfill(req, res);
  if (action === 'upstream') return await handleUpstream(res);
  if (action === 'nws') return await handleNWS(res);
  if (action === 'ahead') return await handleAhead(res);
  if (action === 'predictions') return await handlePredictions(req, res);
  if (action === 'analogs') return await handleAnalogs(res);

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

    // ── STEP 1.5: FETCH NWS FORECASTS (cached 90 min) ──
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
            if (raw) try { recentSnapshots.push(JSON.parse(raw)); } catch {}
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

async function handlePredictions(req, res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ predictions: [], message: 'Redis not configured' });
  }
  try {
    const lakeId = req.query?.lake || null;
    const keys = await redisCommand('LRANGE', 'pred:index', '0', '3');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ predictions: [], message: 'No predictions yet' });
    }

    let allPredictions = [];
    for (const key of keys) {
      const raw = await redisCommand('GET', key);
      if (!raw) continue;
      try {
        const record = JSON.parse(raw);
        const preds = record.predictions || [];
        for (const p of preds) {
          allPredictions.push({ ...p, timestamp: record.timestamp });
        }
      } catch {}
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
