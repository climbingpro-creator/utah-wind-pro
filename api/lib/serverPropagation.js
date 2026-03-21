/**
 * SERVER-SIDE THERMAL PROPAGATION ENGINE
 *
 * Runs every 15 minutes inside the Vercel cron job, 24/7.
 * Tracks wind propagation chains for ALL kiteboarding and paragliding spots.
 *
 * Redis keys:
 *   prop:snap:{lakeId}:{date}  — today's snapshots per spot (list, TTL 48h)
 *   prop:events                — daily propagation events (list, capped 365)
 *   prop:lags                  — learned lag adjustments per chain:station
 *   prop:sessions              — learned session duration stats per chain (hash)
 */

// ─── Session thresholds: minimum wind to count as "rideable" ──────
// A session = contiguous period (≥45 min) above these speeds at the target
const SESSION_THRESHOLDS = {
  kiting:      { minSpeed: 10, minDuration: 45 },
  foil_kiting: { minSpeed: 8,  minDuration: 45 },
  sailing:     { minSpeed: 8,  minDuration: 45 },
  paragliding: { minSpeed: 5,  minDuration: 45 },
  fishing:     { maxSpeed: 12, minDuration: 60 },
  boating:     { maxSpeed: 8,  minDuration: 60 },
};

// ─── Chain definitions (mirrors client-side ThermalPropagation.js) ─

const CHAIN_DEFS = {
  'utah-lake:se_thermal': {
    label: 'SE Thermal', target: 'PWS',
    nodes: [
      { id: 'QSF',  lag: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU', lag: -60,  dir: [120, 180], speed: 5 },
      { id: 'FPS',  lag: -30,  dir: [130, 180], speed: 8 },
      { id: 'PWS',  lag: 0,    dir: [100, 180], speed: 8 },
      { id: 'UTALP',lag: 15,   dir: [130, 200], speed: 5 },
    ],
    pressure: { type: 'below', threshold: 2.0 },
  },
  'utah-lake:north_flow': {
    label: 'North Flow', target: 'PWS',
    nodes: [
      { id: 'KSLC', lag: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',lag: -30, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',  lag: -15, dir: [315, 60], speed: 8, wrap: true },
      { id: 'PWS',  lag: 0,   dir: [300, 60], speed: 6, wrap: true },
    ],
    pressure: { type: 'above', threshold: -1.0 },
  },
  'deer-creek:canyon_thermal': {
    label: 'Canyon Thermal', target: 'DCC',
    nodes: [
      { id: 'SND',  lag: -90, dir: [200, 230], speed: 12 },
      { id: 'UTPCY',lag: -45, dir: [170, 220], speed: 4 },
      { id: 'KHCR', lag: -20, dir: [170, 210], speed: 4 },
      { id: 'DCC',  lag: 0,   dir: [170, 210], speed: 4 },
    ],
  },
  'willard-bay:south_flow': {
    label: 'South Flow', target: 'UR328',
    nodes: [
      { id: 'KSLC', lag: -90, dir: [150, 220], speed: 5 },
      { id: 'KHIF', lag: -60, dir: [150, 220], speed: 5 },
      { id: 'KOGD', lag: -30, dir: [170, 220], speed: 5 },
      { id: 'UR328',lag: 0,   dir: [170, 220], speed: 6 },
    ],
  },
  'potm-south:se_thermal': {
    label: 'SE Thermal', target: 'FPS',
    nodes: [
      { id: 'QSF',  lag: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU', lag: -60,  dir: [110, 250], speed: 5 },
      { id: 'FPS',  lag: 0,    dir: [110, 250], speed: 8 },
    ],
  },
  'potm-north:north_flow': {
    label: 'North Flow', target: 'FPS',
    nodes: [
      { id: 'KSLC', lag: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',lag: -20, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',  lag: 0,   dir: [320, 360], speed: 8, wrap: true },
    ],
  },
  'jordanelle:canyon_thermal': {
    label: 'Canyon Thermal', target: 'KHCR',
    nodes: [
      { id: 'SND',  lag: -90, dir: [200, 230], speed: 10 },
      { id: 'KHCR', lag: 0,   dir: [180, 230], speed: 5 },
    ],
  },
  'strawberry:ridge_flow': {
    label: 'Ridge Flow', target: 'UTCOP',
    nodes: [
      { id: 'KSLC',  lag: -120, dir: [220, 300], speed: 5 },
      { id: 'KPVU',  lag: -90,  dir: [220, 300], speed: 5 },
      { id: 'CCPUT', lag: -45,  dir: [240, 340], speed: 5 },
      { id: 'UTCOP', lag: 0,    dir: [220, 340], speed: 5 },
    ],
  },
  'bear-lake:west_flow': {
    label: 'West Wind', target: 'BERU1',
    nodes: [
      { id: 'KLGU',  lag: -60, dir: [250, 320], speed: 5 },
      { id: 'BERU1', lag: 0,   dir: [250, 320], speed: 6 },
    ],
  },
  'skyline:ridge_flow': {
    label: 'Ridge Flow', target: 'SKY',
    nodes: [
      { id: 'KSLC',  lag: -120, dir: [220, 300], speed: 8 },
      { id: 'UTESU', lag: -30,  dir: [220, 300], speed: 8 },
      { id: 'SKY',   lag: 0,    dir: [220, 300], speed: 10 },
    ],
  },
};

const LAKE_CHAINS = {
  'utah-lake-zigzag':   ['utah-lake:se_thermal', 'utah-lake:north_flow'],
  'utah-lake-lincoln':  ['utah-lake:se_thermal', 'utah-lake:north_flow'],
  'utah-lake-sandy':    ['utah-lake:se_thermal', 'utah-lake:north_flow'],
  'utah-lake-vineyard': ['utah-lake:se_thermal', 'utah-lake:north_flow'],
  'utah-lake-mm19':     ['utah-lake:se_thermal', 'utah-lake:north_flow'],
  'deer-creek':         ['deer-creek:canyon_thermal'],
  'jordanelle':         ['jordanelle:canyon_thermal'],
  'willard-bay':        ['willard-bay:south_flow'],
  'potm-south':         ['potm-south:se_thermal'],
  'potm-north':         ['potm-north:north_flow'],
  'strawberry-ladders': ['strawberry:ridge_flow'],
  'strawberry-bay':     ['strawberry:ridge_flow'],
  'strawberry-soldier': ['strawberry:ridge_flow'],
  'strawberry-view':    ['strawberry:ridge_flow'],
  'strawberry-river':   ['strawberry:ridge_flow'],
  'bear-lake':          ['bear-lake:west_flow'],
  'skyline-drive':      ['skyline:ridge_flow'],
};

// ─── Helpers ──────────────────────────────────────────────────────

function dirInRange(dir, node) {
  if (dir == null) return false;
  return node.wrap ? (dir >= node.dir[0] || dir <= node.dir[1]) : (dir >= node.dir[0] && dir <= node.dir[1]);
}

function hasFired(node, reading) {
  if (!reading) return false;
  const spd = reading.windSpeed ?? reading.speed ?? 0;
  const dir = reading.windDirection ?? reading.direction;
  return dirInRange(dir, node) && spd >= node.speed;
}

function passesPresCheck(check, gradient) {
  if (!check || gradient == null) return true;
  return check.type === 'below' ? gradient < check.threshold : gradient > check.threshold;
}

// ─── Analyze all chains for all spots from station array ──────────

export function analyzeAllSpots(stations, ambientPWS, pressureGradient) {
  const map = {};
  for (const s of stations) map[s.stationId] = s;
  if (ambientPWS) {
    map['PWS'] = {
      stationId: 'PWS',
      windSpeed: ambientPWS.windSpeed ?? ambientPWS.speed,
      windDirection: ambientPWS.windDirection ?? ambientPWS.direction,
      windGust: ambientPWS.windGust ?? ambientPWS.gust,
      temperature: ambientPWS.temperature ?? ambientPWS.temp,
    };
  }

  const results = {};
  const processedChains = new Set();

  for (const [lakeId, chainKeys] of Object.entries(LAKE_CHAINS)) {
    const lakeResults = [];
    for (const chainKey of chainKeys) {
      // Only analyze each unique chain once
      if (!processedChains.has(chainKey)) {
        processedChains.add(chainKey);
      }

      const def = CHAIN_DEFS[chainKey];
      if (!def) continue;

      const pressOk = passesPresCheck(def.pressure, pressureGradient);
      const target = def.nodes[def.nodes.length - 1];

      const nodes = def.nodes.map(n => ({
        ...n,
        fired: hasFired(n, map[n.id]),
        speed: map[n.id]?.windSpeed ?? null,
        direction: map[n.id]?.windDirection ?? null,
      }));

      const firedCount = nodes.filter(n => n.fired).length;
      const farthest = [...nodes].reverse().find(n => n.fired);
      const targetNode = nodes.find(n => n.id === target.id);

      let phase = 'none', eta = null, conf = 0;
      if (!pressOk || firedCount === 0) {
        phase = 'none';
      } else if (targetNode?.fired) {
        phase = 'arrived'; conf = 95;
      } else if (farthest) {
        phase = 'propagating';
        eta = Math.max(0, target.lag - farthest.lag);
        conf = Math.min(90, 30 + firedCount * 20);
      }

      lakeResults.push({ chainKey, label: def.label, phase, confidence: conf, etaMinutes: eta, firedCount, nodes });
    }

    if (lakeResults.length > 0) {
      const dominant = lakeResults.sort((a, b) => b.confidence - a.confidence)[0];
      results[lakeId] = {
        dominant: dominant.chainKey,
        dominantPhase: dominant.phase,
        dominantConfidence: dominant.confidence,
        chains: lakeResults,
      };
    }
  }

  return results;
}

// ── Backward-compat single-spot analysis (used by cron response) ──

export function analyzeFromStations(stations, ambientPWS, pressureGradient) {
  const all = analyzeAllSpots(stations, ambientPWS, pressureGradient);
  const zigzag = all['utah-lake-zigzag'];
  if (!zigzag) return { dominant: 'none', dominantPhase: 'none', dominantConfidence: 0, seThermal: { phase: 'none' }, northFlow: { phase: 'none' } };

  const se = zigzag.chains.find(c => c.chainKey.includes('se_thermal'));
  const nf = zigzag.chains.find(c => c.chainKey.includes('north_flow'));
  return {
    dominant: zigzag.dominant,
    dominantPhase: zigzag.dominantPhase,
    dominantConfidence: zigzag.dominantConfidence,
    seThermal: se || { phase: 'none', firedCount: 0, nodes: [] },
    northFlow: nf || { phase: 'none', firedCount: 0, nodes: [] },
    timestamp: new Date().toISOString(),
  };
}

// ─── Store snapshots for ALL spots in Redis ───────────────────────

export async function storePropagationSnapshot(redis, allResults, stationReadings) {
  const date = new Date().toISOString().split('T')[0];
  const ts = new Date().toISOString();

  // Compact station snapshot
  const stationSnap = {};
  for (const [id, s] of Object.entries(stationReadings)) {
    stationSnap[id] = {
      speed: s.windSpeed ?? s.speed ?? null,
      dir: s.windDirection ?? s.direction ?? null,
    };
  }

  // Store per-spot snapshots — always store so we capture onset AND collapse
  for (const lakeId of Object.keys(LAKE_CHAINS)) {
    const data = allResults[lakeId];
    const key = `prop:snap:${lakeId}:${date}`;
    const snap = JSON.stringify({
      timestamp: ts,
      phase: data?.dominantPhase || 'none',
      confidence: data?.dominantConfidence || 0,
      chain: data?.dominant || null,
      stations: stationSnap,
    });
    await redis('RPUSH', key, snap);
    await redis('EXPIRE', key, '172800');
  }

  // Always store a global snapshot (for spots with no signal today, we still track)
  const globalKey = `prop:snap:global:${date}`;
  await redis('RPUSH', globalKey, JSON.stringify({ timestamp: ts, stations: stationSnap }));
  await redis('EXPIRE', globalKey, '172800');
}

// ─── Daily propagation learning ───────────────────────────────────

export async function learnFromPropagation(redis) {
  const date = new Date().toISOString().split('T')[0];
  const learned = await loadLearnedLags(redis);
  const events = [];
  let updated = false;

  for (const [lakeId, chainKeys] of Object.entries(LAKE_CHAINS)) {
    const key = `prop:snap:${lakeId}:${date}`;
    const rawSnaps = await redis('LRANGE', key, '0', '-1');
    if (!rawSnaps || rawSnaps.length < 4) continue;

    const snaps = rawSnaps.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

    for (const chainKey of chainKeys) {
      const def = CHAIN_DEFS[chainKey];
      if (!def) continue;
      const target = def.nodes[def.nodes.length - 1];

      // Find onset times
      const onsets = {};
      for (const snap of snaps) {
        for (const node of def.nodes) {
          if (onsets[node.id]) continue;
          if (hasFired(node, snap.stations?.[node.id])) {
            onsets[node.id] = snap.timestamp;
          }
        }
      }

      const hasSignal = Object.keys(onsets).some(id => id !== target.id);
      const arrived = !!onsets[target.id];

      // ── Lag learning ──
      if (hasSignal && arrived) {
        const t0 = new Date(onsets[target.id]).getTime();
        for (const node of def.nodes) {
          if (node.id === target.id || !onsets[node.id]) continue;
          const actual = Math.round((new Date(onsets[node.id]).getTime() - t0) / 60000);
          const k = `${chainKey}:${node.id}`;
          if (!learned[k]) {
            learned[k] = { avgLag: actual, samples: 1 };
          } else {
            const w = learned[k].samples / (learned[k].samples + 1);
            learned[k].avgLag = Math.round(learned[k].avgLag * w + actual * (1 - w));
            learned[k].samples++;
          }
          updated = true;
        }
      }

      // ── Session duration learning ──
      // Count how many consecutive 15-min snapshots the TARGET was above threshold
      let sessionMinutes = 0;
      let peakSpeed = 0;
      let sessionStart = null;
      let sessionEnd = null;
      for (const snap of snaps) {
        const reading = snap.stations?.[target.id];
        const spd = reading?.speed ?? 0;
        const isFired = hasFired(target, reading);
        if (isFired) {
          if (!sessionStart) sessionStart = snap.timestamp;
          sessionEnd = snap.timestamp;
          if (spd > peakSpeed) peakSpeed = spd;
        }
      }
      if (sessionStart && sessionEnd) {
        sessionMinutes = Math.round((new Date(sessionEnd) - new Date(sessionStart)) / 60000);
      }

      events.push({
        lake: lakeId,
        chain: chainKey,
        signaled: hasSignal,
        arrived,
        stations: Object.keys(onsets).length,
        sessionMinutes,
        peakSpeed: Math.round(peakSpeed * 10) / 10,
      });
    }
  }

  if (updated) {
    await redis('SET', 'prop:lags', JSON.stringify(learned));
  }

  // ── Learn session duration averages per chain ──
  const sessions = await loadSessionStats(redis);
  for (const ev of events) {
    if (ev.sessionMinutes >= 15) {
      const k = ev.chain;
      if (!sessions[k]) {
        sessions[k] = { avgMinutes: ev.sessionMinutes, avgPeak: ev.peakSpeed, samples: 1, minSession: ev.sessionMinutes, maxSession: ev.sessionMinutes };
      } else {
        const s = sessions[k];
        const w = s.samples / (s.samples + 1);
        s.avgMinutes = Math.round(s.avgMinutes * w + ev.sessionMinutes * (1 - w));
        s.avgPeak = Math.round((s.avgPeak * w + ev.peakSpeed * (1 - w)) * 10) / 10;
        s.minSession = Math.min(s.minSession, ev.sessionMinutes);
        s.maxSession = Math.max(s.maxSession, ev.sessionMinutes);
        s.samples++;
      }
    }
  }
  await redis('SET', 'prop:sessions', JSON.stringify(sessions));

  const eventSummary = { date, spots: events.filter(e => e.signaled).length, events };
  await redis('LPUSH', 'prop:events', JSON.stringify(eventSummary));
  await redis('LTRIM', 'prop:events', '0', '364');

  return { date, updated, learned, sessions, eventCount: events.length };
}

async function loadSessionStats(redis) {
  try {
    const raw = await redis('GET', 'prop:sessions');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function loadLearnedLags(redis) {
  try {
    const raw = await redis('GET', 'prop:lags');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ─── Client endpoint ──────────────────────────────────────────────

export async function getPropagationData(redis) {
  const lags = await loadLearnedLags(redis);
  const sessions = await loadSessionStats(redis);
  const eventsRaw = await redis('LRANGE', 'prop:events', '0', '29');
  const events = (eventsRaw || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

  // Per-chain hit rates
  const chainStats = {};
  for (const event of events) {
    for (const e of event.events || []) {
      if (!chainStats[e.chain]) chainStats[e.chain] = { signaled: 0, arrived: 0, totalSession: 0, sessionCount: 0 };
      if (e.signaled) chainStats[e.chain].signaled++;
      if (e.arrived) chainStats[e.chain].arrived++;
      if (e.sessionMinutes > 0) {
        chainStats[e.chain].totalSession += e.sessionMinutes;
        chainStats[e.chain].sessionCount++;
      }
    }
  }

  const hitRates = {};
  for (const [chain, stats] of Object.entries(chainStats)) {
    hitRates[chain] = {
      signalDays: stats.signaled,
      arrivedDays: stats.arrived,
      hitRate: stats.signaled > 0 ? Math.round((stats.arrived / stats.signaled) * 100) : 0,
      avgSessionMinutes: stats.sessionCount > 0 ? Math.round(stats.totalSession / stats.sessionCount) : null,
    };
  }

  return {
    lags,
    sessions,
    recentEvents: events.slice(0, 10),
    hitRates,
    totalDaysTracked: events.length,
    sessionThresholds: SESSION_THRESHOLDS,
  };
}
