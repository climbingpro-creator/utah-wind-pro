/**
 * THERMAL PROPAGATION SERVICE
 *
 * Detects, tracks, and validates wind propagation through station networks
 * for EVERY kiteboarding and paragliding spot in the system.
 *
 * Each spot has one or more "chains" — ordered station sequences that a wind
 * wave passes through before arriving at the launch. The service detects
 * onset at each station, tracks the wave, and learns timing from every day.
 */

import { safeToFixed } from '../utils/safeToFixed';

// ─── Chain definitions for all spots ──────────────────────────────
//
// Each chain: { id, label, flowDir, nodes[] }
// Each node:  { id, name, role, lagMinutes, dir:[min,max], speed, wrap? }
//
// lagMinutes is relative to target (0 = target station, negative = before)
// dir.wrap means the range crosses 360° (e.g., 315–45 for north)

const CHAIN_DEFS = {
  // ── Utah Lake: SE Thermal (S → N along lakeshore) ──────────────
  'utah-lake:se_thermal': {
    label: 'SE Thermal',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Canyon mouth catches SE flow first', lagMinutes: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Valley floor confirmation',         lagMinutes: -60,  dir: [120, 180], speed: 5 },
      { id: 'FPS',  name: 'Flight Park South',     role: 'Thermal hits the Point',            lagMinutes: -30,  dir: [130, 180], speed: 8 },
      { id: 'PWS',  name: 'Zigzag (Your Station)', role: 'Ground truth at your launch',       lagMinutes: 0,    dir: [100, 180], speed: 8 },
      { id: 'UTALP',name: 'Point of Mountain',     role: 'Spill through the gap',             lagMinutes: 15,   dir: [130, 200], speed: 5 },
    ],
    pressureCheck: { type: 'below', threshold: 2.0 },
  },

  // ── Utah Lake: North Flow (N → S through gap) ──────────────────
  'utah-lake:north_flow': {
    label: 'North Flow',
    flowDir: 'N → S',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',           role: 'Great Salt Lake outflow',        lagMinutes: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',name: 'Point of Mountain',     role: 'Gap wind acceleration',          lagMinutes: -30, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',  name: 'Flight Park South',     role: 'Wind reaching the lake',         lagMinutes: -15, dir: [315, 60], speed: 8, wrap: true },
      { id: 'PWS',  name: 'Zigzag (Your Station)', role: 'Ground truth at your launch',    lagMinutes: 0,   dir: [300, 60], speed: 6, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
  },

  // ── Deer Creek: Canyon Thermal (Arrowhead → Dam) ───────────────
  'deer-creek:canyon_thermal': {
    label: 'Canyon Thermal',
    flowDir: 'Ridge → Dam',
    nodes: [
      { id: 'SND',  name: 'Arrowhead Summit',  role: 'Ridge trigger — SSW flow at 8252 ft',   lagMinutes: -90, dir: [200, 230], speed: 12 },
      { id: 'UTPCY',name: 'Provo Canyon MP10',  role: 'Canyon entrance confirmation',           lagMinutes: -45, dir: [170, 220], speed: 4 },
      { id: 'KHCR', name: 'Heber Airport',      role: 'Valley floor — flow entering Heber',     lagMinutes: -20, dir: [170, 210], speed: 4 },
      { id: 'DCC',  name: 'Deer Creek Dam',     role: 'Target — thermal arrival at the dam',    lagMinutes: 0,   dir: [170, 210], speed: 4 },
    ],
    pressureCheck: null,
  },

  // ── Willard Bay: South Flow (SLC → Ogden → Willard) ───────────
  'willard-bay:south_flow': {
    label: 'South Flow',
    flowDir: 'S → N',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',    role: 'Valley-wide south flow origin',     lagMinutes: -90, dir: [150, 220], speed: 5 },
      { id: 'KHIF', name: 'Hill AFB',        role: 'Military base — south flow transit', lagMinutes: -60, dir: [150, 220], speed: 5 },
      { id: 'KOGD', name: 'Ogden Airport',   role: 'Ogden valley confirmation',          lagMinutes: -30, dir: [170, 220], speed: 5 },
      { id: 'UR328',name: 'Willard Bay South',role: 'Target — arrival at the beach',     lagMinutes: 0,   dir: [170, 220], speed: 6 },
    ],
    pressureCheck: null,
  },

  // ── Point of Mountain South: SE Thermal (paragliding) ──────────
  'potm-south:se_thermal': {
    label: 'SE Thermal',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Canyon mouth SE indicator',      lagMinutes: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Valley floor SE confirmation',   lagMinutes: -60,  dir: [110, 250], speed: 5 },
      { id: 'FPS',  name: 'Flight Park South',    role: 'Target — south launch',          lagMinutes: 0,    dir: [110, 250], speed: 8 },
    ],
    pressureCheck: { type: 'below', threshold: 2.0 },
  },

  // ── Point of Mountain North: North Flow (paragliding) ──────────
  'potm-north:north_flow': {
    label: 'North Flow',
    flowDir: 'N → S',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',       role: 'North wind source',               lagMinutes: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',name: 'Point of Mountain',  role: 'Gap acceleration indicator',      lagMinutes: -20, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',  name: 'Flight Park South',  role: 'Target — north side launch',      lagMinutes: 0,   dir: [320, 360], speed: 8, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
  },

  // ── Jordanelle: Canyon Thermal (similar to Deer Creek) ─────────
  'jordanelle:canyon_thermal': {
    label: 'Canyon Thermal',
    flowDir: 'Ridge → Valley',
    nodes: [
      { id: 'SND',  name: 'Arrowhead Summit',  role: 'Ridge trigger — SSW flow',        lagMinutes: -90, dir: [200, 230], speed: 10 },
      { id: 'KHCR', name: 'Heber Airport',      role: 'Heber valley arrival',            lagMinutes: 0,   dir: [180, 230], speed: 5 },
    ],
    pressureCheck: null,
  },

  // ── Strawberry: Ridge Flow (W wind from Wasatch) ───────────────
  'strawberry:ridge_flow': {
    label: 'Ridge Flow',
    flowDir: 'W → E',
    nodes: [
      { id: 'KSLC',  name: 'SLC Airport',       role: 'Wasatch front west flow',         lagMinutes: -120, dir: [220, 300], speed: 5 },
      { id: 'KPVU',  name: 'Provo Airport',      role: 'Valley confirmation',             lagMinutes: -90,  dir: [220, 300], speed: 5 },
      { id: 'CCPUT', name: 'Currant Creek Pass',  role: 'Ridge crossing indicator',        lagMinutes: -45,  dir: [240, 340], speed: 5 },
      { id: 'UTCOP', name: 'Strawberry Co-op',    role: 'Target — reservoir arrival',      lagMinutes: 0,    dir: [220, 340], speed: 5 },
    ],
    pressureCheck: null,
  },

  // ── Bear Lake: West Wind (Logan → Bear Lake) ──────────────────
  'bear-lake:west_flow': {
    label: 'West Wind',
    flowDir: 'W → E',
    nodes: [
      { id: 'KLGU',  name: 'Logan Airport',    role: 'Cache Valley west flow indicator', lagMinutes: -60, dir: [250, 320], speed: 5 },
      { id: 'BERU1', name: 'Bear River RAWS',  role: 'Target — Bear Lake arrival',       lagMinutes: 0,   dir: [250, 320], speed: 6 },
    ],
    pressureCheck: null,
  },

  // ── Skyline Drive: Ridge Flow (snowkite) ───────────────────────
  'skyline:ridge_flow': {
    label: 'Ridge Flow',
    flowDir: 'W → E',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',       role: 'Wasatch front indicator',          lagMinutes: -120, dir: [220, 300], speed: 8 },
      { id: 'UTESU',name: 'Ephraim Ridge',      role: 'Sanpete ridge confirmation',       lagMinutes: -30,  dir: [220, 300], speed: 8 },
      { id: 'SKY',  name: 'Skyline Drive',      role: 'Target — ridgetop arrival',        lagMinutes: 0,    dir: [220, 300], speed: 10 },
    ],
    pressureCheck: null,
  },
};

// ─── Map: lakeId → which chains apply ─────────────────────────────

const LAKE_CHAINS = {
  'utah-lake':          ['utah-lake:se_thermal', 'utah-lake:north_flow'],
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

// ─── Session viability: minimum wind duration for a real session ──
const SESSION_THRESHOLDS = {
  kiting:      { minSpeed: 10, minDuration: 45 },
  foil_kiting: { minSpeed: 8,  minDuration: 45 },
  sailing:     { minSpeed: 8,  minDuration: 45 },
  paragliding: { minSpeed: 5,  minDuration: 45 },
  fishing:     { maxSpeed: 12, minDuration: 60 },
  boating:     { maxSpeed: 8,  minDuration: 60 },
};

// ─── Learned data (set by sync with server) ──────────────────────
let learnedLags = null;
let learnedSessions = null;

export function setLearnedLags(lags) {
  learnedLags = lags;
}

export function setLearnedSessions(sessions) {
  learnedSessions = sessions;
}

export function getSessionThresholds() {
  return SESSION_THRESHOLDS;
}

/**
 * Estimate expected session duration for a chain.
 * Uses server-learned stats if available, otherwise returns defaults by chain type.
 */
export function estimateSessionDuration(chainKey) {
  if (learnedSessions?.[chainKey]?.samples >= 3) {
    const s = learnedSessions[chainKey];
    return {
      avgMinutes: s.avgMinutes,
      minMinutes: s.minSession,
      maxMinutes: s.maxSession,
      avgPeak: s.avgPeak,
      samples: s.samples,
      source: 'learned',
    };
  }
  // Defaults based on chain type
  if (chainKey.includes('se_thermal') || chainKey.includes('canyon_thermal')) {
    return { avgMinutes: 180, minMinutes: 60, maxMinutes: 360, avgPeak: 12, samples: 0, source: 'default' };
  }
  if (chainKey.includes('north_flow')) {
    return { avgMinutes: 240, minMinutes: 90, maxMinutes: 480, avgPeak: 15, samples: 0, source: 'default' };
  }
  if (chainKey.includes('south_flow') || chainKey.includes('ridge_flow') || chainKey.includes('west_flow')) {
    return { avgMinutes: 180, minMinutes: 60, maxMinutes: 420, avgPeak: 12, samples: 0, source: 'default' };
  }
  return { avgMinutes: 120, minMinutes: 45, maxMinutes: 300, avgPeak: 10, samples: 0, source: 'default' };
}

/**
 * Check if a wind event is viable for a specific activity.
 * Returns { viable, reason, expectedMinutes, minimumRequired }
 */
export function isSessionViable(activity, chainKey, currentSpeed) {
  const threshold = SESSION_THRESHOLDS[activity];
  if (!threshold) return { viable: true, reason: 'Unknown activity' };

  const est = estimateSessionDuration(chainKey);
  const minimumRequired = threshold.minDuration;

  // Wind-seeking activities need speed above min
  if (threshold.minSpeed && currentSpeed < threshold.minSpeed) {
    return { viable: false, reason: 'Too light', expectedMinutes: est.avgMinutes, minimumRequired };
  }

  // Calm-seeking activities need speed below max
  if (threshold.maxSpeed && currentSpeed > threshold.maxSpeed) {
    return { viable: false, reason: 'Too windy', expectedMinutes: est.avgMinutes, minimumRequired };
  }

  // Check if expected session meets minimum duration
  if (est.avgMinutes < minimumRequired && est.source === 'learned') {
    return {
      viable: false,
      reason: `Avg session only ${est.avgMinutes} min (need ${minimumRequired})`,
      expectedMinutes: est.avgMinutes,
      minimumRequired,
    };
  }

  return {
    viable: true,
    reason: est.source === 'learned'
      ? `Avg session: ${est.avgMinutes} min (${est.samples} days tracked)`
      : `Est. session: ~${Math.round(est.avgMinutes / 60)} hrs`,
    expectedMinutes: est.avgMinutes,
    minimumRequired,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function directionInRange(dir, range) {
  if (dir == null) return false;
  if (range.wrap) return dir >= range.dir[0] || dir <= range.dir[1];
  return dir >= range.dir[0] && dir <= range.dir[1];
}

function nodeHasFired(node, reading) {
  if (!reading) return { fired: false, speed: null, direction: null };
  const speed = reading.speed ?? reading.windSpeed ?? 0;
  const dir = reading.direction ?? reading.windDirection;
  const gust = reading.gust ?? reading.windGust ?? speed;
  const fired = directionInRange(dir, node) && speed >= node.speed;
  return { fired, speed, gust, direction: dir };
}

function getLag(chainKey, stationId) {
  const lk = `${chainKey}:${stationId}`;
  if (learnedLags?.[lk]?.samples >= 5) return learnedLags[lk].avgLagMinutes;
  const chain = CHAIN_DEFS[chainKey];
  return chain?.nodes.find(n => n.id === stationId)?.lagMinutes ?? 0;
}

function passesPresCheck(check, gradient) {
  if (!check || gradient == null) return true;
  return check.type === 'below' ? gradient < check.threshold : gradient > check.threshold;
}

// ─── Core: analyze a single chain ─────────────────────────────────

function analyzeChain(chainKey, stationReadings, pressureGradient) {
  const def = CHAIN_DEFS[chainKey];
  if (!def) return null;

  const pressureOk = passesPresCheck(def.pressureCheck, pressureGradient);
  const target = def.nodes[def.nodes.length - 1];

  const nodes = def.nodes.map(node => {
    const data = stationReadings[node.id];
    const { fired, speed, gust, direction } = nodeHasFired(node, data);
    return {
      ...node,
      lagMinutes: getLag(chainKey, node.id),
      fired,
      speed,
      gust,
      direction,
      temp: data?.temp ?? data?.temperature,
      isTarget: node.id === target.id,
    };
  });

  const firedCount = nodes.filter(n => n.fired).length;
  const farthestFired = [...nodes].reverse().find(n => n.fired);
  const targetNode = nodes.find(n => n.isTarget);

  let phase = 'none', etaMinutes = null, confidence = 0, message = '';

  if (!pressureOk || firedCount === 0) {
    phase = 'none';
    message = !pressureOk ? 'Pressure gradient unfavorable' : 'No signal detected';
  } else if (targetNode?.fired) {
    phase = 'arrived';
    confidence = 95;
    message = `${def.label} at ${targetNode.name}: ${safeToFixed(targetNode.speed, 1)} mph from ${targetNode.direction}°`;
  } else if (farthestFired) {
    phase = 'propagating';
    const targetLag = getLag(chainKey, target.id);
    const sourceLag = getLag(chainKey, farthestFired.id);
    etaMinutes = Math.max(0, Math.round(targetLag - sourceLag));
    confidence = Math.min(90, 30 + firedCount * 20);
    message = `${def.label} at ${farthestFired.name} (${safeToFixed(farthestFired.speed, 1)} mph) — ETA ${etaMinutes} min`;
  }

  // Time-of-day adjustment
  const hour = new Date().getHours();
  if (hour < 6 || hour > 19) confidence = Math.min(confidence, 20);

  const session = estimateSessionDuration(chainKey);

  return {
    chainKey,
    label: def.label,
    flowDir: def.flowDir,
    phase,
    message,
    confidence,
    etaMinutes,
    pressureOk,
    firedCount,
    totalNodes: nodes.length,
    session,
    nodes: nodes.map(({ id, name, role, lagMinutes, fired, speed, gust, direction, temp, isTarget }) => ({
      id, name, role, lagMinutes, fired, speed, gust, direction, temp, isTarget,
    })),
  };
}

// ─── Public API: analyze propagation for any lake ─────────────────

/**
 * Analyze propagation for a specific lake/spot.
 *
 * @param {string} lakeId
 * @param {Object} stationReadings - { stationId: { speed, direction, gust, temp } }
 * @param {Object} [options]
 * @param {number} [options.pressureGradient]
 * @returns {Object|null}
 */
export function analyzePropagation(stationReadings, options = {}) {
  const { lakeId, pressureGradient } = options;
  const chainKeys = LAKE_CHAINS[lakeId];
  if (!chainKeys?.length) return null;

  const chains = chainKeys
    .map(key => analyzeChain(key, stationReadings, pressureGradient))
    .filter(Boolean);

  if (chains.length === 0) return null;

  // Pick dominant chain (highest confidence)
  const sorted = [...chains].sort((a, b) => b.confidence - a.confidence);
  const dominant = sorted[0];

  // Build result in the shape the UI expects
  const result = {
    timestamp: new Date().toISOString(),
    lakeId,
    chains,
    dominant: {
      type: dominant.chainKey,
      label: dominant.label,
      phase: dominant.phase,
      message: dominant.message,
      confidence: dominant.confidence,
      etaMinutes: dominant.etaMinutes,
    },
  };

  // For backward compat with PropagationTracker, expose first two chains as seThermal/northFlow
  if (chains.length >= 1) result.seThermal = chains[0];
  if (chains.length >= 2) result.northFlow = chains[1];
  // If only one chain, set the other to "none" so UI still works
  if (chains.length === 1) {
    result[chains[0] === result.seThermal ? 'northFlow' : 'seThermal'] = {
      phase: 'none', confidence: 0, nodes: [], firedCount: 0, totalNodes: 0, pressureOk: true,
      label: '', message: '', chainKey: '',
    };
  }

  return result;
}

// ─── Historical validation ────────────────────────────────────────

export function validateHistorical(historicalDays, lakeId) {
  const chainKeys = LAKE_CHAINS[lakeId || 'utah-lake-zigzag'] || [];
  const results = { totalDays: historicalDays.length, chains: {} };

  for (const chainKey of chainKeys) {
    const def = CHAIN_DEFS[chainKey];
    if (!def) continue;

    let signalDays = 0, arrivedDays = 0, totalLeadMs = 0;
    const lagErrors = {};
    const target = def.nodes[def.nodes.length - 1];

    for (const day of historicalDays) {
      if (!day.snapshots?.length) continue;
      const onsets = {};

      for (const snap of day.snapshots) {
        for (const node of def.nodes) {
          if (onsets[node.id]) continue;
          const reading = snap.stations?.[node.id];
          if (!reading) continue;
          const { fired } = nodeHasFired(node, reading);
          if (fired) onsets[node.id] = snap.timestamp;
        }
      }

      const hasUpstreamSignal = Object.keys(onsets).some(id => id !== target.id);
      if (hasUpstreamSignal) {
        signalDays++;
        if (onsets[target.id]) {
          arrivedDays++;
          const firstSignal = Object.entries(onsets)
            .filter(([id]) => id !== target.id)
            .sort((a, b) => new Date(a[1]) - new Date(b[1]))[0];
          if (firstSignal) {
            totalLeadMs += new Date(onsets[target.id]) - new Date(firstSignal[1]);
          }

          const t0 = new Date(onsets[target.id]).getTime();
          for (const node of def.nodes) {
            if (node.id === target.id || !onsets[node.id]) continue;
            const actual = Math.round((new Date(onsets[node.id]).getTime() - t0) / 60000);
            if (!lagErrors[node.id]) lagErrors[node.id] = [];
            lagErrors[node.id].push(actual - node.lagMinutes);
          }
        }
      }
    }

    const lagAccuracy = {};
    for (const [sid, errors] of Object.entries(lagErrors)) {
      const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
      const mae = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
      lagAccuracy[sid] = { meanError: Math.round(mean), mae: Math.round(mae), samples: errors.length };
    }

    results.chains[chainKey] = {
      signalDays,
      arrivedDays,
      hitRate: signalDays > 0 ? Math.round((arrivedDays / signalDays) * 100) : 0,
      avgLeadMinutes: arrivedDays > 0 ? Math.round(totalLeadMs / arrivedDays / 60000) : 0,
      lagAccuracy,
    };
  }

  return results;
}

export function lagAdjustmentsFromValidation(validation) {
  const lags = {};
  for (const [chainKey, data] of Object.entries(validation.chains || {})) {
    const def = CHAIN_DEFS[chainKey];
    if (!def) continue;
    for (const [stationId, accuracy] of Object.entries(data.lagAccuracy || {})) {
      if (accuracy.samples < 3) continue;
      const node = def.nodes.find(n => n.id === stationId);
      if (node) {
        lags[`${chainKey}:${stationId}`] = {
          avgLagMinutes: node.lagMinutes + accuracy.meanError,
          samples: accuracy.samples,
        };
      }
    }
  }
  return lags;
}

export function getChainsForLake(lakeId) {
  return (LAKE_CHAINS[lakeId] || []).map(key => ({ key, ...CHAIN_DEFS[key] })).filter(Boolean);
}

export function getAllSupportedLakes() {
  return Object.keys(LAKE_CHAINS);
}

export { CHAIN_DEFS, LAKE_CHAINS };
