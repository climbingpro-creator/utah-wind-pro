/**
 * SERVER-SIDE THERMAL PROPAGATION ENGINE
 *
 * Runs every 15 minutes inside the Vercel cron job, 24/7.
 * Detects thermal wave propagation through station chains, stores snapshots
 * in Redis, and learns lag timing from every day's data.
 *
 * Redis keys:
 *   prop:snap:{date}    — today's propagation snapshots (list, TTL 48h)
 *   prop:events          — daily propagation events (list, capped 365)
 *   prop:lags            — learned lag adjustments per station
 */

// ─── Station chains ───────────────────────────────────────────────

const SE_THERMAL_CHAIN = [
  { id: 'QSF',  name: 'Spanish Fork', lagMinutes: -120, dir: [100, 180], speed: 6 },
  { id: 'KPVU', name: 'Provo Airport', lagMinutes: -60,  dir: [120, 180], speed: 5 },
  { id: 'FPS',  name: 'Flight Park South', lagMinutes: -30,  dir: [130, 180], speed: 8 },
  { id: 'PWS',  name: 'Zigzag PWS', lagMinutes: 0,    dir: [100, 180], speed: 8 },
  { id: 'UTALP',name: 'Point of Mountain', lagMinutes: 15,   dir: [130, 200], speed: 5 },
];

const NORTH_FLOW_CHAIN = [
  { id: 'KSLC', name: 'SLC Airport', lagMinutes: -60, dir: [315, 45], speed: 8, wrap: true },
  { id: 'UTALP',name: 'Point of Mountain', lagMinutes: -30, dir: [315, 45], speed: 5, wrap: true },
  { id: 'FPS',  name: 'Flight Park South', lagMinutes: -15, dir: [315, 60], speed: 8, wrap: true },
  { id: 'PWS',  name: 'Zigzag PWS', lagMinutes: 0,   dir: [300, 60], speed: 6, wrap: true },
];

function dirInRange(dir, min, max, wrap) {
  if (dir == null) return false;
  return wrap ? (dir >= min || dir <= max) : (dir >= min && dir <= max);
}

function hasFired(node, reading) {
  if (!reading) return false;
  const spd = reading.windSpeed ?? reading.speed ?? 0;
  const dir = reading.windDirection ?? reading.direction;
  return dirInRange(dir, node.dir[0], node.dir[1], node.wrap) && spd >= node.speed;
}

// ─── Analyze propagation from station data ────────────────────────

export function analyzeFromStations(stations, ambientPWS, pressureGradient) {
  const map = {};
  for (const s of stations) {
    map[s.stationId] = s;
  }
  if (ambientPWS) {
    map['PWS'] = {
      stationId: 'PWS',
      windSpeed: ambientPWS.windSpeed ?? ambientPWS.speed,
      windDirection: ambientPWS.windDirection ?? ambientPWS.direction,
      windGust: ambientPWS.windGust ?? ambientPWS.gust,
      temperature: ambientPWS.temperature ?? ambientPWS.temp,
    };
  }

  const result = { timestamp: new Date().toISOString() };

  // SE Thermal
  const seNodes = SE_THERMAL_CHAIN.map(n => ({
    ...n,
    fired: hasFired(n, map[n.id]),
    speed: map[n.id]?.windSpeed ?? null,
    direction: map[n.id]?.windDirection ?? null,
  }));
  const seFired = seNodes.filter(n => n.fired).length;
  const seFarthest = [...seNodes].reverse().find(n => n.fired);
  const seTarget = seNodes.find(n => n.id === 'PWS');
  const sePressureOk = pressureGradient == null || pressureGradient < 2.0;

  let sePhase = 'none', seEta = null, seConf = 0;
  if (!sePressureOk || seFired === 0) {
    sePhase = 'none';
  } else if (seTarget?.fired) {
    sePhase = 'arrived';
    seConf = 95;
  } else if (seFarthest) {
    sePhase = 'propagating';
    seEta = Math.max(0, 0 - seFarthest.lagMinutes);
    seConf = Math.min(90, 30 + seFired * 20);
  }

  result.seThermal = { phase: sePhase, confidence: seConf, etaMinutes: seEta, firedCount: seFired, nodes: seNodes };

  // North Flow
  const nfNodes = NORTH_FLOW_CHAIN.map(n => ({
    ...n,
    fired: hasFired(n, map[n.id]),
    speed: map[n.id]?.windSpeed ?? null,
    direction: map[n.id]?.windDirection ?? null,
  }));
  const nfFired = nfNodes.filter(n => n.fired).length;
  const nfFarthest = [...nfNodes].reverse().find(n => n.fired);
  const nfTarget = nfNodes.find(n => n.id === 'PWS');
  const nfPressureOk = pressureGradient == null || pressureGradient > -1.0;

  let nfPhase = 'none', nfEta = null, nfConf = 0;
  if (!nfPressureOk || nfFired === 0) {
    nfPhase = 'none';
  } else if (nfTarget?.fired) {
    nfPhase = 'arrived';
    nfConf = 95;
  } else if (nfFarthest) {
    nfPhase = 'propagating';
    nfEta = Math.max(0, 0 - nfFarthest.lagMinutes);
    nfConf = Math.min(90, 30 + nfFired * 20);
  }

  result.northFlow = { phase: nfPhase, confidence: nfConf, etaMinutes: nfEta, firedCount: nfFired, nodes: nfNodes };

  const dominant = result.seThermal.confidence >= result.northFlow.confidence ? 'se_thermal' : 'north_flow';
  result.dominant = dominant;
  result.dominantPhase = dominant === 'se_thermal' ? sePhase : nfPhase;
  result.dominantConfidence = dominant === 'se_thermal' ? seConf : nfConf;

  return result;
}

// ─── Store snapshot in Redis ──────────────────────────────────────

export async function storePropagationSnapshot(redis, propagation, stationReadings) {
  const date = new Date().toISOString().split('T')[0];
  const key = `prop:snap:${date}`;

  const snap = {
    timestamp: new Date().toISOString(),
    propagation: {
      dominant: propagation.dominant,
      dominantPhase: propagation.dominantPhase,
      dominantConfidence: propagation.dominantConfidence,
      seThermal: {
        phase: propagation.seThermal.phase,
        confidence: propagation.seThermal.confidence,
        firedCount: propagation.seThermal.firedCount,
      },
      northFlow: {
        phase: propagation.northFlow.phase,
        confidence: propagation.northFlow.confidence,
        firedCount: propagation.northFlow.firedCount,
      },
    },
    stations: Object.fromEntries(
      Object.entries(stationReadings).map(([id, s]) => [id, {
        speed: s.windSpeed ?? s.speed ?? null,
        dir: s.windDirection ?? s.direction ?? null,
        gust: s.windGust ?? s.gust ?? null,
      }])
    ),
  };

  await redis('RPUSH', key, JSON.stringify(snap));
  await redis('EXPIRE', key, '172800'); // 48h TTL
}

// ─── Daily propagation learning (run once per day, late evening) ──

export async function learnFromPropagation(redis) {
  const date = new Date().toISOString().split('T')[0];
  const key = `prop:snap:${date}`;

  const rawSnaps = await redis('LRANGE', key, '0', '-1');
  if (!rawSnaps || rawSnaps.length < 4) return null;

  const snaps = rawSnaps.map(r => {
    try { return JSON.parse(r); } catch { return null; }
  }).filter(Boolean);

  // Detect onset times for each station in both chains
  const seOnsets = {};
  const nfOnsets = {};

  for (const snap of snaps) {
    const stations = snap.stations || {};
    for (const node of SE_THERMAL_CHAIN) {
      if (seOnsets[node.id]) continue;
      const reading = stations[node.id];
      if (reading && hasFired(node, reading)) {
        seOnsets[node.id] = snap.timestamp;
      }
    }
    for (const node of NORTH_FLOW_CHAIN) {
      if (nfOnsets[node.id]) continue;
      const reading = stations[node.id];
      if (reading && hasFired(node, reading)) {
        nfOnsets[node.id] = snap.timestamp;
      }
    }
  }

  // Calculate actual lags relative to PWS onset
  const seLags = computeLags(seOnsets, SE_THERMAL_CHAIN);
  const nfLags = computeLags(nfOnsets, NORTH_FLOW_CHAIN);

  // Load existing learned lags
  let learnedRaw = await redis('GET', 'prop:lags');
  let learned = {};
  try { learned = learnedRaw ? JSON.parse(learnedRaw) : {}; } catch { learned = {}; }

  // Merge today's observations with exponential averaging
  let updated = false;
  for (const [key, lag] of Object.entries(seLags)) {
    const k = `se:${key}`;
    if (!learned[k]) {
      learned[k] = { avgLag: lag.actual, samples: 1 };
    } else {
      const w = learned[k].samples / (learned[k].samples + 1);
      learned[k].avgLag = Math.round(learned[k].avgLag * w + lag.actual * (1 - w));
      learned[k].samples++;
    }
    updated = true;
  }
  for (const [key, lag] of Object.entries(nfLags)) {
    const k = `nf:${key}`;
    if (!learned[k]) {
      learned[k] = { avgLag: lag.actual, samples: 1 };
    } else {
      const w = learned[k].samples / (learned[k].samples + 1);
      learned[k].avgLag = Math.round(learned[k].avgLag * w + lag.actual * (1 - w));
      learned[k].samples++;
    }
    updated = true;
  }

  if (updated) {
    await redis('SET', 'prop:lags', JSON.stringify(learned));
  }

  // Store daily event summary
  const event = {
    date,
    snapshotCount: snaps.length,
    seThermal: {
      signaled: Object.keys(seOnsets).length > 1,
      arrived: !!seOnsets['PWS'],
      onsets: seOnsets,
      lags: seLags,
    },
    northFlow: {
      signaled: Object.keys(nfOnsets).length > 1,
      arrived: !!nfOnsets['PWS'],
      onsets: nfOnsets,
      lags: nfLags,
    },
  };

  await redis('LPUSH', 'prop:events', JSON.stringify(event));
  await redis('LTRIM', 'prop:events', '0', '364');

  return { date, learned, event };
}

function computeLags(onsets, chain) {
  const targetTime = onsets['PWS'];
  if (!targetTime) return {};
  const t0 = new Date(targetTime).getTime();
  const result = {};
  for (const node of chain) {
    if (node.id === 'PWS' || !onsets[node.id]) continue;
    const actual = Math.round((new Date(onsets[node.id]).getTime() - t0) / 60000);
    result[node.id] = {
      expected: node.lagMinutes,
      actual,
      error: actual - node.lagMinutes,
    };
  }
  return result;
}

// ─── Client endpoint: return learned lags + recent events ─────────

export async function getPropagationData(redis) {
  const lagsRaw = await redis('GET', 'prop:lags');
  const eventsRaw = await redis('LRANGE', 'prop:events', '0', '29');

  let lags = {};
  try { lags = lagsRaw ? JSON.parse(lagsRaw) : {}; } catch { lags = {}; }

  const events = (eventsRaw || []).map(r => {
    try { return JSON.parse(r); } catch { return null; }
  }).filter(Boolean);

  // Compute hit rates
  const seSignaled = events.filter(e => e.seThermal?.signaled).length;
  const seArrived = events.filter(e => e.seThermal?.arrived).length;
  const nfSignaled = events.filter(e => e.northFlow?.signaled).length;
  const nfArrived = events.filter(e => e.northFlow?.arrived).length;

  return {
    lags,
    recentEvents: events.slice(0, 10),
    stats: {
      totalDays: events.length,
      seThermal: {
        signalDays: seSignaled,
        arrivedDays: seArrived,
        hitRate: seSignaled > 0 ? Math.round((seArrived / seSignaled) * 100) : 0,
      },
      northFlow: {
        signalDays: nfSignaled,
        arrivedDays: nfArrived,
        hitRate: nfSignaled > 0 ? Math.round((nfArrived / nfSignaled) * 100) : 0,
      },
    },
  };
}
