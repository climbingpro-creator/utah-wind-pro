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
  windsurfing: { minSpeed: 8,  minDuration: 45 },
  snowkiting:  { minSpeed: 10, minDuration: 45 },
  paragliding: { minSpeed: 5,  minDuration: 45 },
  fishing:     { maxSpeed: 12, minDuration: 60 },
  boating:     { maxSpeed: 8,  minDuration: 60 },
  paddling:    { maxSpeed: 6,  minDuration: 60 },
};

// ─── Chain definitions (mirrors client-side ThermalPropagation.js) ─

const CHAIN_DEFS = {
  // ── KITEBOARDING: Zigzag ──
  'zigzag:se_thermal': {
    label: 'SE Thermal → Zigzag', target: 'PWS',
    nodes: [
      { id: 'QSF',         lag: -120, dir: [100, 180], speed: 6 },
      { id: 'UTORM',       lag: -90,  dir: [100, 180], speed: 5 },
      { id: 'KPVU',        lag: -60,  dir: [120, 180], speed: 5 },
      { id: 'KUTLEHI160',  lag: -40,  dir: [100, 200], speed: 3, optional: true },
      { id: 'FPS',         lag: -30,  dir: [130, 180], speed: 8 },
      { id: 'KUTLEHI73',   lag: -20,  dir: [100, 200], speed: 3, optional: true },
      { id: 'UTPCR',       lag: -15,  dir: [100, 180], speed: 4 },
      { id: 'KUTSARAT62',  lag: -10,  dir: [100, 200], speed: 3, optional: true },
      { id: 'KUTSARAT88',  lag: -5,   dir: [100, 200], speed: 3, optional: true },
      { id: 'PWS',         lag: 0,    dir: [100, 180], speed: 5 },
    ],
    pressure: { type: 'below', threshold: 2.0 },
    speedRatios: { FPS: 1.7, UTORM: 1.3, KUTLEHI160: 1.1, KUTSARAT88: 0.83, KUTSARAT62: 0.39, KUTBLUFF18: 0.99, KUTRIVER67: 1.1 },
  },
  'zigzag:north_flow': {
    label: 'North Flow → Zigzag', target: 'PWS',
    nodes: [
      { id: 'KSLC',        lag: -90,  dir: [315, 45], speed: 8, wrap: true },
      { id: 'KUTSANDY188', lag: -70,  dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'KUTDRAPE132', lag: -55,  dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'UT7',         lag: -45,  dir: [315, 45], speed: 5, wrap: true },
      { id: 'KUTBLUFF18',  lag: -40,  dir: [315, 60], speed: 3, wrap: true, optional: true },
      { id: 'KUTRIVER67',  lag: -35,  dir: [315, 60], speed: 3, wrap: true, optional: true },
      { id: 'UTALP',       lag: -30,  dir: [315, 45], speed: 5, wrap: true },
      { id: 'UTPCR',       lag: -15,  dir: [300, 60], speed: 4, wrap: true },
      { id: 'PWS',         lag: 0,    dir: [300, 60], speed: 4, wrap: true },
    ],
    pressure: { type: 'above', threshold: -1.0 },
    speedRatios: { FPS: 2.8, UT7: 1.3, KUTDRAPE132: 0.39, KUTSARAT62: 1.13, KUTBLUFF18: 0.65, KUTRIVER67: 0.67 },
  },
  // ── KITEBOARDING: Lincoln Beach ──
  'lincoln:se_thermal': {
    label: 'SE Thermal → Lincoln Beach', target: 'KPVU',
    nodes: [
      { id: 'QSF',   lag: -90,  dir: [100, 180], speed: 6 },
      { id: 'UTORM', lag: -45,  dir: [100, 180], speed: 5 },
      { id: 'KPVU',  lag: 0,    dir: [120, 180], speed: 5 },
    ],
    pressure: { type: 'below', threshold: 2.0 },
  },
  'lincoln:north_flow': {
    label: 'North Flow → Lincoln Beach', target: 'KPVU',
    nodes: [
      { id: 'KSLC',  lag: -90, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UT7',   lag: -60, dir: [315, 45], speed: 5, wrap: true },
      { id: 'UTALP', lag: -45, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',   lag: -30, dir: [315, 60], speed: 8, wrap: true },
      { id: 'KPVU',  lag: 0,   dir: [315, 45], speed: 5, wrap: true },
    ],
    pressure: { type: 'above', threshold: -1.0 },
  },
  // ── KITEBOARDING: Vineyard (east shore, S/SSW/W onshore) ──
  'vineyard:sw_thermal': {
    label: 'S/SW Onshore → Vineyard', target: 'FPS',
    nodes: [
      { id: 'QSF',  lag: -90, dir: [100, 250], speed: 6 },
      { id: 'KPVU', lag: -45, dir: [150, 270], speed: 5 },
      { id: 'FPS',  lag: 0,   dir: [150, 270], speed: 6 },
    ],
    speedRatios: { FPS: 1.3 },
  },
  // ── KITEBOARDING: MM19 (canyon drainage) ──
  'mm19:canyon_drainage': {
    label: 'Canyon Drainage → MM19', target: 'KPVU',
    nodes: [
      { id: 'QSF',  lag: -30, dir: [100, 170], speed: 6 },
      { id: 'KPVU', lag: 0,   dir: [100, 170], speed: 5 },
    ],
  },
  // ── PARAGLIDING: PotM South → FPS ──
  'potm-south:se_thermal': {
    label: 'SE Thermal → Flight Park South', target: 'FPS',
    nodes: [
      { id: 'QSF',         lag: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU',        lag: -60,  dir: [110, 250], speed: 5 },
      { id: 'KUTLEHI160',  lag: -40,  dir: [100, 250], speed: 3, optional: true },
      { id: 'UTPCR',       lag: -30,  dir: [100, 250], speed: 4 },
      { id: 'KUTLEHI111',  lag: -15,  dir: [100, 250], speed: 3, optional: true },
      { id: 'FPS',         lag: 0,    dir: [110, 250], speed: 8 },
    ],
    pressure: { type: 'below', threshold: 2.0 },
  },
  // ── PARAGLIDING: PotM North → UTALP ──
  'potm-north:north_flow': {
    label: 'North Flow → Flight Park North', target: 'UTALP',
    nodes: [
      { id: 'KSLC',        lag: -60,  dir: [315, 45], speed: 8, wrap: true },
      { id: 'KUTSANDY188', lag: -50,  dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'KUTDRAPE132', lag: -40,  dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'UT7',         lag: -30,  dir: [315, 45], speed: 5, wrap: true },
      { id: 'KUTBLUFF18',  lag: -20,  dir: [315, 60], speed: 3, wrap: true, optional: true },
      { id: 'UTALP',       lag: 0,    dir: [315, 45], speed: 5, wrap: true },
    ],
    pressure: { type: 'above', threshold: -1.0 },
  },
  // ── OTHER SPOTS ──
  'deer-creek:canyon_thermal': {
    label: 'Canyon Thermal → Deer Creek', target: 'UTDCD',
    nodes: [
      { id: 'KUTPLEAS11',  lag: -75, dir: [150, 230], speed: 3, optional: true },
      { id: 'UTLPC',       lag: -60, dir: [170, 220], speed: 4 },
      { id: 'UTPCY',       lag: -45, dir: [170, 220], speed: 4 },
      { id: 'KUTCEDAR10',  lag: -35, dir: [150, 230], speed: 3, optional: true },
      { id: 'UTCHL',       lag: -20, dir: [170, 210], speed: 4 },
      { id: 'KUTMIDWA37',  lag: -10, dir: [160, 220], speed: 3, optional: true },
      { id: 'UTDCD',       lag: 0,   dir: [170, 210], speed: 4 },
    ],
    speedRatios: { UTLPC: 1.2, UTPCY: 1.1, UTCHL: 0.9, KUTMIDWA37: 0.85 },
    pressure: { type: 'below', threshold: 2.0 },
  },
  'deer-creek:north_flow': {
    label: 'North Flow → Deer Creek', target: 'UTDCD',
    nodes: [
      { id: 'KSLC',        lag: -90, dir: [315, 45], speed: 8, wrap: true },
      { id: 'KUTHEBER105', lag: -45, dir: [315, 60], speed: 4, wrap: true, optional: true },
      { id: 'KHCR',        lag: -30, dir: [315, 60], speed: 5, wrap: true },
      { id: 'UTDCD',       lag: 0,   dir: [315, 60], speed: 4, wrap: true },
    ],
    pressure: { type: 'above', threshold: -1.0 },
  },
  'willard-bay:south_flow': {
    label: 'South Flow → Willard Bay', target: 'UR328',
    nodes: [
      { id: 'KSLC',  lag: -90, dir: [150, 220], speed: 5 },
      { id: 'KHIF',  lag: -60, dir: [150, 220], speed: 5 },
      { id: 'KOGD',  lag: -30, dir: [170, 220], speed: 5 },
      { id: 'UTANT', lag: -15, dir: [170, 220], speed: 5 },
      { id: 'UR328', lag: 0,   dir: [170, 220], speed: 6 },
    ],
  },
  'jordanelle:canyon_thermal': {
    label: 'Canyon Thermal → Jordanelle', target: 'KHCR',
    nodes: [
      { id: 'UTLPC', lag: -60, dir: [170, 220], speed: 4 },
      { id: 'UTCHL', lag: -30, dir: [180, 230], speed: 4 },
      { id: 'KHCR',  lag: 0,   dir: [180, 230], speed: 5 },
    ],
  },
  'strawberry:ridge_flow': {
    label: 'Ridge Flow → Strawberry', target: 'UTCOP',
    nodes: [
      { id: 'KSLC',  lag: -120, dir: [220, 300], speed: 5 },
      { id: 'KPVU',  lag: -90,  dir: [220, 300], speed: 5 },
      { id: 'UTHEB', lag: -60,  dir: [220, 320], speed: 4 },
      { id: 'UTDAN', lag: -45,  dir: [220, 340], speed: 5 },
      { id: 'CCPUT', lag: -20,  dir: [240, 340], speed: 5 },
      { id: 'UTCOP', lag: 0,    dir: [220, 340], speed: 5 },
    ],
  },
  'yuba:valley_flow': {
    label: 'Valley Flow → Yuba', target: 'UTLMP',
    nodes: [
      { id: 'KPVU',  lag: -120, dir: [170, 230], speed: 5 },
      { id: 'UTRKY', lag: -60,  dir: [170, 230], speed: 5 },
      { id: 'UTLMP', lag: 0,    dir: [170, 230], speed: 5 },
    ],
  },
  'bear-lake:west_flow': {
    label: 'West Wind → Bear Lake', target: 'UTGRC',
    nodes: [
      { id: 'KLGU',  lag: -60, dir: [250, 320], speed: 5 },
      { id: 'UTLTS', lag: -30, dir: [250, 320], speed: 5 },
      { id: 'UTGRC', lag: 0,   dir: [250, 320], speed: 5 },
    ],
  },
  'skyline:ridge_flow': {
    label: 'Ridge Flow → Skyline', target: 'SKY',
    nodes: [
      { id: 'KSLC',  lag: -120, dir: [220, 300], speed: 8 },
      { id: 'UTESU', lag: -30,  dir: [220, 300], speed: 8 },
      { id: 'SKY',   lag: 0,    dir: [220, 300], speed: 10 },
    ],
  },
};

const LAKE_CHAINS = {
  'utah-lake-zigzag':   ['zigzag:se_thermal', 'zigzag:north_flow'],
  'utah-lake-lincoln':  ['lincoln:se_thermal', 'lincoln:north_flow'],
  'utah-lake-sandy':    ['lincoln:se_thermal', 'lincoln:north_flow'],
  'utah-lake-vineyard': ['vineyard:sw_thermal'],
  'utah-lake-mm19':     ['mm19:canyon_drainage'],
  'deer-creek':         ['deer-creek:canyon_thermal', 'deer-creek:north_flow'],
  'jordanelle':         ['jordanelle:canyon_thermal'],
  'willard-bay':        ['willard-bay:south_flow'],
  'potm-south':         ['potm-south:se_thermal'],
  'potm-north':         ['potm-north:north_flow'],
  'strawberry-ladders': ['strawberry:ridge_flow'],
  'strawberry-bay':     ['strawberry:ridge_flow'],
  'strawberry-soldier': ['strawberry:ridge_flow'],
  'strawberry-view':    ['strawberry:ridge_flow'],
  'strawberry-river':   ['strawberry:ridge_flow'],
  'yuba':               ['yuba:valley_flow'],
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
      const requiredFired = nodes.filter(n => n.fired && !n.optional).length;
      const optionalFired = nodes.filter(n => n.fired && n.optional).length;
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
        // Required stations count 20pts each, optional (WU PWS) count 8pts each
        conf = Math.min(95, 30 + requiredFired * 20 + optionalFired * 8);
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

      // ── Speed ratio learning ──
      // When both an upstream station and target fire the same day, learn the ratio
      if (arrived) {
        const targetPeaks = [];
        for (const snap of snaps) {
          const r = snap.stations?.[target.id];
          if (r && hasFired(target, r)) targetPeaks.push(r.speed ?? 0);
        }
        const targetAvg = targetPeaks.length > 0 ? targetPeaks.reduce((a, b) => a + b, 0) / targetPeaks.length : 0;
        if (targetAvg > 0) {
          for (const node of def.nodes) {
            if (node.id === target.id) continue;
            const upPeaks = [];
            for (const snap of snaps) {
              const r = snap.stations?.[node.id];
              if (r && hasFired(node, r)) upPeaks.push(r.speed ?? 0);
            }
            if (upPeaks.length >= 3) {
              const upAvg = upPeaks.reduce((a, b) => a + b, 0) / upPeaks.length;
              const ratio = Math.round((upAvg / targetAvg) * 100) / 100;
              const rk = `ratio:${chainKey}:${node.id}`;
              if (!learned[rk]) {
                learned[rk] = { avgRatio: ratio, samples: 1 };
              } else {
                const w = learned[rk].samples / (learned[rk].samples + 1);
                learned[rk].avgRatio = Math.round((learned[rk].avgRatio * w + ratio * (1 - w)) * 100) / 100;
                learned[rk].samples++;
              }
              updated = true;
            }
          }
        }
      }

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
  // ── PWS ground truth session learning (from real Ambient Weather API) ──
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
  if (apiKey && appKey) {
    try {
      const { data: pwsData } = await fetchAmbientPage(apiKey, appKey, null, 288);
      if (pwsData && pwsData.length >= 12) {
        // Sort chronologically (API returns newest-first)
        const sorted = [...pwsData].sort((a, b) =>
          new Date(a.dateutc ?? a.date).getTime() - new Date(b.dateutc ?? b.date).getTime()
        );

        // Only analyze today's readings (Mountain time)
        const todayReadings = sorted.filter(r => {
          const utc = new Date(r.dateutc ?? r.date);
          const mt = new Date(utc.getTime() - 7 * 3600 * 1000);
          return mt.toISOString().split('T')[0] === date;
        });

        if (todayReadings.length >= 6) {
          const daySessions = analyzeDaySessions(todayReadings);

          if (!sessions['pws:actual']) {
            sessions['pws:actual'] = { samples: 0, byActivity: {} };
          }
          const pa = sessions['pws:actual'];
          pa.samples++;
          for (const [activity, data] of Object.entries(daySessions)) {
            if (!pa.byActivity[activity]) {
              pa.byActivity[activity] = {
                avgLongestSession: data.longestSessionMin,
                avgTotalAbove: data.totalMinAbove,
                avgPeak: data.peakSpeed,
                samples: 1,
              };
            } else {
              const a = pa.byActivity[activity];
              const w = a.samples / (a.samples + 1);
              a.avgLongestSession = Math.round(a.avgLongestSession * w + data.longestSessionMin * (1 - w));
              a.avgTotalAbove = Math.round(a.avgTotalAbove * w + data.totalMinAbove * (1 - w));
              a.avgPeak = Math.round((a.avgPeak * w + data.peakSpeed * (1 - w)) * 10) / 10;
              a.samples++;
            }
          }

          for (const ev of events) {
            if (ev.lake?.startsWith('utah-lake')) {
              ev.pwsSessions = daySessions;
            }
          }
        }
      }
    } catch (pwsErr) {
      console.error('PWS daily learning error (non-fatal):', pwsErr.message);
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

// ─── Backfill session learning from 3 years of real PWS history ───

const PWS_MAC = '48:3F:DA:54:2C:6E';

async function fetchAmbientPage(apiKey, appKey, endDate, limit = 288) {
  const params = new URLSearchParams({
    apiKey,
    applicationKey: appKey,
    limit: String(limit),
  });
  if (endDate) params.set('endDate', endDate);

  const url = `https://api.ambientweather.net/v1/devices/${PWS_MAC}?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 429) return { data: [], rateLimited: true };
    throw new Error(`Ambient API ${resp.status}`);
  }
  return { data: await resp.json(), rateLimited: false };
}

function analyzeDaySessions(readings) {
  const thresholds = {
    kiting:      { minSpeed: 10, label: 'Kiting 10+' },
    foil_kiting: { minSpeed: 8,  label: 'Foil 8+' },
    sailing:     { minSpeed: 8,  label: 'Sailing 8+' },
    windsurfing: { minSpeed: 8,  label: 'Windsurf 8+' },
    paragliding: { minSpeed: 5,  label: 'PG 5+' },
    light_wind:  { minSpeed: 6,  label: 'Light 6+' },
    boating:     { maxSpeed: 8,  label: 'Glass <8' },
    paddling:    { maxSpeed: 6,  label: 'Calm <6' },
  };

  const result = {};
  for (const [activity, cfg] of Object.entries(thresholds)) {
    let sessionStart = null;
    let longestMin = 0;
    let currentMin = 0;
    let totalAboveMin = 0;
    let peakSpeed = 0;
    let sessions = [];
    let currentSessionPeak = 0;

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i];
      const spd = r.windspeedmph ?? r.windSpeed ?? 0;
      const ts = new Date(r.dateutc ?? r.date).getTime();

      const meetsThreshold = cfg.maxSpeed != null ? spd <= cfg.maxSpeed : spd >= cfg.minSpeed;
      if (meetsThreshold) {
        if (!sessionStart) {
          sessionStart = ts;
          currentSessionPeak = spd;
        }
        if (spd > currentSessionPeak) currentSessionPeak = spd;
        if (spd > peakSpeed) peakSpeed = spd;

        if (i + 1 < readings.length) {
          const nextTs = new Date(readings[i + 1].dateutc ?? readings[i + 1].date).getTime();
          currentMin = Math.round((nextTs - sessionStart) / 60000);
        }
        totalAboveMin += 5; // ~5 min intervals
      } else {
        if (sessionStart && currentMin >= 15) {
          sessions.push({ durationMin: currentMin, peak: currentSessionPeak });
          if (currentMin > longestMin) longestMin = currentMin;
        }
        sessionStart = null;
        currentMin = 0;
        currentSessionPeak = 0;
      }
    }
    // Close final session
    if (sessionStart && currentMin >= 15) {
      sessions.push({ durationMin: currentMin, peak: currentSessionPeak });
      if (currentMin > longestMin) longestMin = currentMin;
    }

    result[activity] = {
      longestSessionMin: longestMin,
      totalMinAbove: totalAboveMin,
      peakSpeed: Math.round(peakSpeed * 10) / 10,
      sessionCount: sessions.length,
      sessions,
    };
  }
  return result;
}

/**
 * Backfill PWS session learning from real Ambient Weather history.
 * Pages backward through `days` of data, analyzes sessions for each day,
 * and stores aggregated session statistics in Redis.
 *
 * @param {Function} redis - Redis command function
 * @param {number} days - How many days to backfill (max ~1095 for 3 years)
 * @returns {Object} Summary of what was learned
 */
export async function backfillPWSHistory(redis, days = 90) {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
  if (!apiKey || !appKey) throw new Error('Ambient Weather API keys not configured');

  const sessions = await loadSessionStats(redis);
  if (!sessions['pws:backfill']) {
    sessions['pws:backfill'] = {
      byActivity: {},
      byMonth: {},
      byDayOfWeek: {},
      daysAnalyzed: 0,
      daysWithWind: 0,
      lastBackfill: null,
      oldestDate: null,
      newestDate: null,
    };
  }
  const bf = sessions['pws:backfill'];

  // Resume from where we left off if we've backfilled before
  let endDate = bf.oldestDate
    ? new Date(new Date(bf.oldestDate).getTime() - 1000).toISOString()
    : null;
  let daysProcessed = 0;
  let totalReadings = 0;
  let rateLimitHits = 0;
  const startTime = Date.now();
  const MAX_RUNTIME_MS = 250_000; // 250s — stay under Vercel's 300s limit
  const dailySummaries = [];

  while (daysProcessed < days) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;
    const { data, rateLimited } = await fetchAmbientPage(apiKey, appKey, endDate);

    if (rateLimited) {
      rateLimitHits++;
      if (rateLimitHits > 3) break;
      // Wait 1.5s and retry
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }

    if (!data || data.length === 0) break;
    totalReadings += data.length;

    // Ambient returns newest-first; reverse for chronological processing
    const sorted = [...data].sort((a, b) =>
      new Date(a.dateutc ?? a.date).getTime() - new Date(b.dateutc ?? b.date).getTime()
    );

    // Group by date (Mountain time)
    const byDate = {};
    for (const r of sorted) {
      const utc = new Date(r.dateutc ?? r.date);
      // Mountain time offset (rough — DST not critical for daily grouping)
      const mt = new Date(utc.getTime() - 7 * 3600 * 1000);
      const dateStr = mt.toISOString().split('T')[0];
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(r);
    }

    for (const [dateStr, dayReadings] of Object.entries(byDate)) {
      if (dayReadings.length < 6) continue; // Need at least 30 min of data

      const daySessions = analyzeDaySessions(dayReadings);
      const dt = new Date(dateStr);
      const month = dt.getMonth(); // 0-11
      const dow = dt.getDay(); // 0=Sun

      const hadWind = Object.values(daySessions).some(a => a.longestSessionMin >= 15);

      for (const [activity, data] of Object.entries(daySessions)) {
        // Aggregate overall stats
        if (!bf.byActivity[activity]) {
          bf.byActivity[activity] = {
            totalDays: 0,
            windDays: 0,
            avgLongestSession: 0,
            avgPeak: 0,
            maxSession: 0,
            maxPeak: 0,
          };
        }
        const a = bf.byActivity[activity];
        a.totalDays++;
        if (data.longestSessionMin >= 15) {
          a.windDays++;
          // Running average
          const w = (a.windDays - 1) / a.windDays;
          a.avgLongestSession = Math.round(a.avgLongestSession * w + data.longestSessionMin * (1 - w));
          a.avgPeak = Math.round((a.avgPeak * w + data.peakSpeed * (1 - w)) * 10) / 10;
          a.maxSession = Math.max(a.maxSession, data.longestSessionMin);
          a.maxPeak = Math.max(a.maxPeak, data.peakSpeed);
        }

        // Monthly breakdown
        const mKey = `${activity}:${month}`;
        if (!bf.byMonth[mKey]) {
          bf.byMonth[mKey] = { days: 0, windDays: 0, avgSession: 0, avgPeak: 0 };
        }
        const m = bf.byMonth[mKey];
        m.days++;
        if (data.longestSessionMin >= 15) {
          m.windDays++;
          const wm = (m.windDays - 1) / m.windDays;
          m.avgSession = Math.round(m.avgSession * wm + data.longestSessionMin * (1 - wm));
          m.avgPeak = Math.round((m.avgPeak * wm + data.peakSpeed * (1 - wm)) * 10) / 10;
        }

        // Day-of-week breakdown
        const dKey = `${activity}:${dow}`;
        if (!bf.byDayOfWeek[dKey]) {
          bf.byDayOfWeek[dKey] = { days: 0, windDays: 0, avgSession: 0 };
        }
        const d = bf.byDayOfWeek[dKey];
        d.days++;
        if (data.longestSessionMin >= 15) {
          d.windDays++;
          const wd = (d.windDays - 1) / d.windDays;
          d.avgSession = Math.round(d.avgSession * wd + data.longestSessionMin * (1 - wd));
        }
      }

      if (hadWind) bf.daysWithWind++;
      bf.daysAnalyzed++;
      daysProcessed++;

      dailySummaries.push({
        date: dateStr,
        hadWind,
        kiting: daySessions.kiting?.longestSessionMin || 0,
        foil: daySessions.foil_kiting?.longestSessionMin || 0,
        peak: Math.max(...Object.values(daySessions).map(a => a.peakSpeed)),
      });

      if (!bf.oldestDate || dateStr < bf.oldestDate) bf.oldestDate = dateStr;
      if (!bf.newestDate || dateStr > bf.newestDate) bf.newestDate = dateStr;
    }

    // Page backward: use oldest timestamp from this batch
    const oldestInBatch = sorted[0];
    endDate = new Date(new Date(oldestInBatch.dateutc ?? oldestInBatch.date).getTime() - 1000).toISOString();

    // Rate limit: Ambient allows 1 req/sec
    await new Promise(r => setTimeout(r, 1100));
  }

  bf.lastBackfill = new Date().toISOString();
  await redis('SET', 'prop:sessions', JSON.stringify(sessions));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const timedOut = elapsed >= 250;

  return {
    daysProcessed,
    totalDaysAnalyzed: bf.daysAnalyzed,
    totalReadings,
    daysWithWind: bf.daysWithWind,
    dateRange: { oldest: bf.oldestDate, newest: bf.newestDate },
    byActivity: bf.byActivity,
    recentDays: dailySummaries.slice(-10),
    rateLimitHits,
    elapsedSeconds: elapsed,
    complete: !timedOut && daysProcessed >= days,
    message: timedOut
      ? `Processed ${daysProcessed} days in ${elapsed}s (hit time limit). Run again to continue from ${bf.oldestDate}.`
      : `Done — ${bf.daysAnalyzed} total days analyzed.`,
  };
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

  const pwsActual = sessions['pws:actual'] || null;
  const pwsBackfill = sessions['pws:backfill'] || null;

  return {
    lags,
    sessions,
    pwsActual,
    pwsBackfill,
    recentEvents: events.slice(0, 10),
    hitRates,
    totalDaysTracked: events.length,
    sessionThresholds: SESSION_THRESHOLDS,
  };
}
