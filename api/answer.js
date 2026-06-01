/**
 * GET /api/answer — Single-call wind verdict for any spot
 *
 * Returns an instant GO / WAIT / PASS answer powered by UnifiedPredictor,
 * run server-side with full Redis context (no empty-localStorage problem).
 *
 * Query params:
 *   spot     — lake config ID (e.g. "utah-lake-zigzag")  [required]
 *   activity — activity key (default: "kiting")
 *
 * Response: { decision, headline, detail, confidence, wind, eta, ... }
 *
 * Cached in Redis for 3 min (matches cron refresh cycle).
 */

import { redisCommand, redisMGet, hasRedis, checkRateLimit } from './lib/redis.js';
import { LAKE_CONFIGS } from '../packages/weather/src/config/lakeStations.js';
import { predict } from '../apps/wind/src/services/UnifiedPredictor.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const spot = req.query.spot || 'utah-lake-zigzag';
  const activity = req.query.activity || 'kiting';

  const config = LAKE_CONFIGS[spot];
  if (!config) {
    return res.status(400).json({ error: `Unknown spot: ${spot}`, availableSpots: Object.keys(LAKE_CONFIGS).slice(0, 20) });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`answer:${clientIp}`);
  if (rl.limited) {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  if (!hasRedis()) {
    return res.status(503).json({ error: 'Weather data unavailable — Redis not configured' });
  }

  try {
    // ── Check answer cache (3-min TTL) ──
    const cacheKey = `answer:${spot}:${activity}`;
    const cached = await redisCommand('GET', cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
      res.setHeader('X-Answer-Cache', 'HIT');
      return res.status(200).json(parsed);
    }

    // ── Load latest observations from Redis ──
    const obsKeys = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (!obsKeys?.length) {
      return res.status(200).json(buildFallbackAnswer(spot, activity, 'No observation data available yet'));
    }

    const latestRaw = await redisCommand('GET', obsKeys[0]);
    if (!latestRaw) {
      return res.status(200).json(buildFallbackAnswer(spot, activity, 'Observation data empty'));
    }

    const latest = JSON.parse(latestRaw);
    const stations = latest.stations || [];

    // ── Load model context (same keys as handleContext in collect.js) ──
    const contextKeys = [
      'models:statistical',
      'weights:server',
      'nws:forecasts',
      'pattern:analogs',
      'prop:lags',
    ];
    const contextValues = await redisMGet(contextKeys);

    const models = contextValues[0] ? JSON.parse(contextValues[0]) : null;
    const weights = contextValues[1] ? JSON.parse(contextValues[1]) : null;
    const nws = contextValues[2] ? JSON.parse(contextValues[2]) : null;
    const analogs = contextValues[3] ? JSON.parse(contextValues[3]) : null;
    const propLags = contextValues[4] ? JSON.parse(contextValues[4]) : null;

    const now = new Date();
    let currentMonth, currentHour;
    try {
      const mParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', month: 'numeric' }).formatToParts(now);
      currentMonth = parseInt(mParts.find(p => p.type === 'month')?.value || '1', 10) - 1;
      const hParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }).formatToParts(now);
      currentHour = parseInt(hParts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
    } catch {
      currentMonth = now.getUTCMonth();
      currentHour = now.getUTCHours() - 7;
    }

    let monthClimatology = null;
    if (models?.climatology) {
      monthClimatology = {};
      for (const [stid, months] of Object.entries(models.climatology)) {
        if (months[currentMonth]) monthClimatology[stid] = months[currentMonth];
      }
    }

    const modelContext = {
      lagCorrelations: models?.lagCorrelations || propLags || null,
      climatology: monthClimatology,
      currentMonth,
      currentHour,
      fingerprints: models?.fingerprints || null,
      calibration: models?.calibrationCurves || null,
      gradientThresholds: models?.gradientThresholds || null,
      thermalProfiles: models?.thermalProfiles || null,
      learnedWeights: weights || null,
      nwsHourly: nws?.grids || null,
      analogs: analogs || null,
    };

    // ── Run UnifiedPredictor for the selected spot ──
    const result = predict(spot, activity, stations, modelContext, config);

    // ── Run cross-spot comparison for "where to go" ──
    const otherSpots = rankOtherSpots(spot, activity, stations, modelContext, currentHour);

    // ── Build conversational "where to go" recommendation ──
    const whereToGo = buildWhereToGo(spot, config, result, otherSpots, activity);

    // ── Enhance headline with spot recommendation when relevant ──
    let headline = result.briefing?.headline || fallbackHeadline(result);
    if (whereToGo.bestSpot && whereToGo.bestSpot.id !== spot && whereToGo.bestSpot.decision === 'GO' && result.decision !== 'GO') {
      const bestName = whereToGo.bestSpot.name;
      headline = `${headline} — but ${bestName} looks good`;
    }

    // ── Shape the answer response ──
    const answer = {
      decision: result.decision,
      headline,
      detail: result.briefing?.body || '',
      bestAction: result.briefing?.bestAction || '',
      bullets: result.briefing?.bullets || [],
      confidence: Math.round((result.confidence || 0) * 100) / 100,
      regime: result.regime,

      wind: {
        current: result.wind?.current?.speed ?? 0,
        direction: result.wind?.current?.dir ?? null,
        cardinal: result.wind?.current?.cardinal || null,
        gust: result.wind?.current?.gust ?? null,
        source: result.wind?.source || null,
        expected: result.wind?.expected?.speed ?? null,
      },

      eta: result.propagation?.eta ?? null,
      phase: result.propagation?.phase || null,

      activity: {
        [activity]: result.activities?.[activity] || null,
      },

      indicators: {
        pressureGradient: result.pressure?.gradient != null ? {
          value: result.pressure.gradient,
          thermalBusted: result.pressure.thermalBusted,
          northFlowRisk: result.pressure.northFlowRisk,
          description: result.pressure.description,
        } : null,
        propagation: result.propagation?.chains?.length > 0 ? result.propagation.chains : null,
      },

      hourlyOutlook: (result.hourly || []).slice(0, 12).map(h => ({
        time: h.time,
        speed: h.speed,
        dir: h.dir,
        thermalBoosted: h.thermalBoosted || false,
      })),

      daylight: result.daylight || null,

      whereToGo,

      spot,
      spotName: config.name || spot,
      updatedAt: now.toISOString(),
      obsTimestamp: latest.timestamp || null,
    };

    // ── Cache the answer for 3 minutes ──
    try {
      await redisCommand('SET', cacheKey, JSON.stringify(answer), 'EX', '180');
    } catch { /* cache write failure is non-fatal */ }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.setHeader('X-Answer-Cache', 'MISS');
    return res.status(200).json(answer);

  } catch (error) {
    console.error('[/api/answer] Error:', error.message, error.stack);
    return res.status(500).json({
      error: 'Prediction failed',
      message: error.message,
      ...buildFallbackAnswer(spot, activity, error.message),
    });
  }
}

function fallbackHeadline(result) {
  const speed = result.wind?.current?.speed ?? 0;
  const cardinal = result.wind?.current?.cardinal || '';
  if (result.decision === 'GO') return `You should go — ${Math.round(speed)} mph ${cardinal} right now`;
  if (result.decision === 'WAIT') return `There's a chance today — keep watching`;
  return `It's not going to be windy today — ${Math.round(speed)} mph`;
}

// ── Cross-spot comparison ──────────────────────────────────────

const ACTIVITY_SPOTS = {
  kiting: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard', 'utah-lake-sandy',
    'deer-creek', 'willard-bay', 'jordanelle',
  ],
  windsurfing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
    'deer-creek', 'willard-bay',
  ],
  sailing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'deer-creek', 'willard-bay', 'jordanelle',
  ],
  paragliding: ['potm-south', 'potm-north', 'inspo', 'west-mountain'],
  snowkiting: ['strawberry-ladders', 'strawberry-bay', 'skyline-drive', 'scofield'],
};

const ACTIVITY_VERBS = {
  kiting: 'kite', snowkiting: 'snowkite', sailing: 'sail',
  windsurfing: 'windsurf', paragliding: 'fly',
};

function rankOtherSpots(selectedSpot, activity, stations, modelContext, currentHour) {
  const spotIds = (ACTIVITY_SPOTS[activity] || ACTIVITY_SPOTS.kiting)
    .filter(id => LAKE_CONFIGS[id]);

  const ranked = [];
  for (const id of spotIds) {
    const cfg = LAKE_CONFIGS[id];
    try {
      const r = predict(id, activity, stations, modelContext, cfg);
      const actScore = r.activities?.[activity];
      ranked.push({
        id,
        name: cfg.shortName || cfg.name,
        region: cfg.region || '',
        decision: r.decision,
        score: actScore?.score ?? 0,
        speed: r.wind?.current?.speed ?? 0,
        cardinal: r.wind?.current?.cardinal || '',
        regime: r.regime,
        phase: r.propagation?.phase || 'unknown',
        eta: r.propagation?.eta ?? null,
        headline: r.briefing?.headline || '',
        confidence: r.confidence ?? 0,
        primaryWindType: cfg.primaryWindType || '',
      });
    } catch {
      // skip spots that error
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function buildWhereToGo(selectedSpot, selectedConfig, selectedResult, rankedSpots, activity) {
  const verb = ACTIVITY_VERBS[activity] || activity;
  const selected = rankedSpots.find(s => s.id === selectedSpot);
  const goSpots = rankedSpots.filter(s => s.decision === 'GO');
  const waitSpots = rankedSpots.filter(s => s.decision === 'WAIT' && s.score >= 40);
  const best = rankedSpots[0];

  let recommendation = '';
  const alternatives = [];

  if (goSpots.length === 0 && waitSpots.length === 0) {
    recommendation = `None of the spots look good for ${activity} today.`;
  } else if (goSpots.length > 0) {
    const topGo = goSpots[0];
    if (topGo.id === selectedSpot) {
      recommendation = `${selectedConfig.shortName || selectedConfig.name} is the best place to ${verb} today.`;
      const others = goSpots.slice(1, 3);
      for (const s of others) {
        alternatives.push({
          id: s.id,
          name: s.name,
          why: `${Math.round(s.speed)} mph ${s.cardinal} — also looking good`,
          score: s.score,
        });
      }
    } else {
      recommendation = `${topGo.name} looks like the best spot to ${verb} today — ${Math.round(topGo.speed)} mph ${topGo.cardinal}.`;
      if (selected && selected.decision === 'GO') {
        alternatives.push({
          id: selectedSpot,
          name: selectedConfig.shortName || selectedConfig.name,
          why: `Also good — ${Math.round(selected.speed)} mph`,
          score: selected.score,
        });
      }
      const others = goSpots.filter(s => s.id !== topGo.id && s.id !== selectedSpot).slice(0, 2);
      for (const s of others) {
        alternatives.push({
          id: s.id,
          name: s.name,
          why: `${Math.round(s.speed)} mph ${s.cardinal}`,
          score: s.score,
        });
      }
    }
  } else {
    const topWait = waitSpots[0];
    recommendation = `${topWait.name} has the best chance today, but it could bust.`;
    const others = waitSpots.slice(1, 3);
    for (const s of others) {
      alternatives.push({
        id: s.id,
        name: s.name,
        why: s.eta ? `Wind building — ~${s.eta} min out` : `${Math.round(s.speed)} mph — marginal`,
        score: s.score,
      });
    }
  }

  return {
    recommendation,
    bestSpot: best ? { id: best.id, name: best.name, score: best.score, decision: best.decision } : null,
    alternatives: alternatives.slice(0, 3),
    spotsChecked: rankedSpots.length,
    goCount: goSpots.length,
    waitCount: waitSpots.length,
  };
}

function buildFallbackAnswer(spot, activity, reason) {
  return {
    decision: 'WAIT',
    headline: 'Checking conditions...',
    detail: reason || 'Data loading',
    bestAction: 'Check back in a few minutes',
    bullets: [],
    confidence: 0,
    regime: 'unknown',
    wind: { current: 0, direction: null, cardinal: null, gust: null, source: null, expected: null },
    eta: null,
    phase: 'unknown',
    activity: { [activity]: null },
    indicators: {},
    hourlyOutlook: [],
    daylight: null,
    spot,
    spotName: spot,
    updatedAt: new Date().toISOString(),
    obsTimestamp: null,
    _fallback: true,
  };
}
