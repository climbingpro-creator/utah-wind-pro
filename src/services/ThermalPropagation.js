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
  // ═══════════════════════════════════════════════════════════════
  //  KITEBOARDING CHAINS — target = actual water launch
  // ═══════════════════════════════════════════════════════════════

  // ── Zigzag: SE Thermal → PWS (your station at the beach) ──────
  'zigzag:se_thermal': {
    label: 'SE Thermal → Zigzag',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',         name: 'Spanish Fork Canyon',  role: 'Canyon mouth catches SE flow first',    lagMinutes: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU',        name: 'Provo Airport',         role: 'Valley floor confirmation',             lagMinutes: -60,  dir: [120, 180], speed: 5 },
      { id: 'KUTLEHI160',  name: 'Lehi (WU PWS)',         role: 'WU neighborhood sensor — thermal path', lagMinutes: -40,  dir: [100, 200], speed: 3, optional: true },
      { id: 'FPS',         name: 'Flight Park South',     role: 'Ridge-amplified — reads 1.5-2x',       lagMinutes: -30,  dir: [130, 180], speed: 8 },
      { id: 'KUTSARAT62',  name: 'Saratoga Springs N (WU)', role: 'WU close-range validation',          lagMinutes: -10,  dir: [100, 200], speed: 3, optional: true },
      { id: 'KUTSARAT88',  name: 'Saratoga Springs S (WU)', role: 'WU near-target validation',          lagMinutes: -5,   dir: [100, 200], speed: 3, optional: true },
      { id: 'PWS',         name: 'Zigzag (Your Station)', role: 'Ground truth at your launch',           lagMinutes: 0,    dir: [100, 180], speed: 5 },
    ],
    pressureCheck: { type: 'below', threshold: 2.0 },
    speedRatios: { FPS: 1.7, KUTSARAT88: 1.0 },
  },

  // ── Zigzag: North Flow → PWS ──────────────────────────────────
  'zigzag:north_flow': {
    label: 'North Flow → Zigzag',
    flowDir: 'N → S',
    nodes: [
      { id: 'KSLC',        name: 'SLC Airport',           role: 'Great Salt Lake outflow',        lagMinutes: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'KUTSANDY188', name: 'Sandy (WU PWS)',        role: 'WU north corridor early',        lagMinutes: -50, dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'KUTDRAPE132', name: 'Draper (WU PWS)',       role: 'WU mid-corridor confirmation',   lagMinutes: -40, dir: [315, 45], speed: 4, wrap: true, optional: true },
      { id: 'UTALP',       name: 'Point of Mountain',     role: 'Gap wind acceleration',          lagMinutes: -30, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',         name: 'Flight Park South',     role: 'Ridge-amplified N flow',         lagMinutes: -15, dir: [315, 60], speed: 8, wrap: true },
      { id: 'PWS',         name: 'Zigzag (Your Station)', role: 'Ground truth at your launch',    lagMinutes: 0,   dir: [300, 60], speed: 4, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
    speedRatios: { FPS: 1.5 },
  },

  // ── Lincoln Beach: SE Thermal → KPVU (ground truth for south end) ─
  'lincoln:se_thermal': {
    label: 'SE Thermal → Lincoln Beach',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Canyon mouth SE origin',          lagMinutes: -90,  dir: [100, 180], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Target — closest station to Lincoln', lagMinutes: 0, dir: [120, 180], speed: 5 },
    ],
    pressureCheck: { type: 'below', threshold: 2.0 },
  },

  // ── Lincoln Beach: North Flow → KPVU ──────────────────────────
  'lincoln:north_flow': {
    label: 'North Flow → Lincoln Beach',
    flowDir: 'N → S',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',       role: 'Great Salt Lake outflow',        lagMinutes: -90, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',name: 'Point of Mountain',  role: 'Gap wind passing through PotM',  lagMinutes: -60, dir: [315, 45], speed: 5, wrap: true },
      { id: 'FPS',  name: 'Flight Park South',  role: 'Flow past the ridge',            lagMinutes: -30, dir: [315, 60], speed: 8, wrap: true },
      { id: 'KPVU', name: 'Provo Airport',       role: 'Target — arrival at south end',  lagMinutes: 0,   dir: [315, 45], speed: 5, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
  },

  // ── Vineyard: S/SSW/W Thermal (onshore from east shore) → FPS proxy ─
  'vineyard:sw_thermal': {
    label: 'S/SW Onshore → Vineyard',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Southern flow origin',           lagMinutes: -90,  dir: [100, 250], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Valley floor S/SW confirmation', lagMinutes: -45,  dir: [150, 270], speed: 5 },
      { id: 'FPS',  name: 'Flight Park South',    role: 'Target proxy — nearest to Vineyard', lagMinutes: 0, dir: [150, 270], speed: 6 },
    ],
    pressureCheck: null,
    speedRatios: { FPS: 1.3 },
  },

  // ── MM19: SE/E Canyon Drainage → QSF as primary driver ───────
  'mm19:canyon_drainage': {
    label: 'Canyon Drainage → MM19',
    flowDir: 'SE → NW',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Canyon drainage is primary wind source', lagMinutes: -30, dir: [100, 170], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Valley floor confirmation',              lagMinutes: 0,  dir: [100, 170], speed: 5 },
    ],
    pressureCheck: null,
  },

  // ═══════════════════════════════════════════════════════════════
  //  PARAGLIDING CHAINS — target = actual flight launch
  // ═══════════════════════════════════════════════════════════════

  // ── PotM South: SE Thermal → FPS (south PG launch) ────────────
  'potm-south:se_thermal': {
    label: 'SE Thermal → Flight Park South',
    flowDir: 'S → N',
    nodes: [
      { id: 'QSF',  name: 'Spanish Fork Canyon', role: 'Canyon mouth SE indicator',      lagMinutes: -120, dir: [100, 180], speed: 6 },
      { id: 'KPVU', name: 'Provo Airport',        role: 'Valley floor SE confirmation',   lagMinutes: -60,  dir: [110, 250], speed: 5 },
      { id: 'FPS',  name: 'Flight Park South',    role: 'Target — south PG launch',       lagMinutes: 0,    dir: [110, 250], speed: 8 },
    ],
    pressureCheck: { type: 'below', threshold: 2.0 },
  },

  // ── PotM North: North Flow → UTALP (north PG launch) ─────────
  'potm-north:north_flow': {
    label: 'North Flow → Flight Park North',
    flowDir: 'N → S',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',           role: 'North wind source — GSL outflow', lagMinutes: -60, dir: [315, 45], speed: 8, wrap: true },
      { id: 'UTALP',name: 'Point of Mountain North',role: 'Target — north PG launch',       lagMinutes: 0,   dir: [315, 45], speed: 5, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
  },

  // ═══════════════════════════════════════════════════════════════
  //  OTHER SPOTS
  // ═══════════════════════════════════════════════════════════════

  // ── Deer Creek: Canyon Thermal (Arrowhead → Dam) ───────────────
  'deer-creek:canyon_thermal': {
    label: 'Canyon Thermal → Deer Creek',
    flowDir: 'Canyon → Dam',
    nodes: [
      { id: 'KUTPLEAS11', name: 'Pleasant Grove WU',  role: 'WU early thermal signal (west side)',    lagMinutes: -75, dir: [150, 230], speed: 3, optional: true },
      { id: 'UTLPC', name: 'Lower Provo Canyon',      role: 'Early canyon thermal draw indicator',    lagMinutes: -60, dir: [170, 220], speed: 4 },
      { id: 'UTPCY', name: 'Provo Canyon MP10',       role: 'Canyon entrance confirmation',           lagMinutes: -45, dir: [170, 220], speed: 4 },
      { id: 'KUTCEDAR10', name: 'Cedar Hills WU',     role: 'WU mid-chain (west slope)',              lagMinutes: -35, dir: [150, 230], speed: 3, optional: true },
      { id: 'UTCHL', name: 'Charleston',               role: 'Heber Valley — flow near reservoir',     lagMinutes: -20, dir: [170, 210], speed: 4 },
      { id: 'KUTMIDWA37', name: 'Midway WU',          role: 'WU close-range confirmation',            lagMinutes: -10, dir: [160, 220], speed: 3, optional: true },
      { id: 'UTDCD', name: 'Deer Creek Dam',           role: 'Target — thermal arrival at the dam',    lagMinutes: 0,   dir: [170, 210], speed: 4 },
    ],
    speedRatios: { UTLPC: 1.2, UTPCY: 1.1, UTCHL: 0.9, KUTMIDWA37: 0.85 },
    pressureCheck: { type: 'below', threshold: 2.0 },
  },
  'deer-creek:north_flow': {
    label: 'North Flow → Deer Creek',
    flowDir: 'SLC → Heber → Dam',
    nodes: [
      { id: 'KSLC',        name: 'SLC Airport',       role: 'Regional north flow origin',             lagMinutes: -90, dir: [315, 45], speed: 8, wrap: true },
      { id: 'KUTHEBER105', name: 'Heber City E WU',   role: 'WU Heber Valley confirmation',           lagMinutes: -45, dir: [315, 60], speed: 4, wrap: true, optional: true },
      { id: 'KHCR',        name: 'Heber Airport',     role: 'Valley-level north flow confirmation',   lagMinutes: -30, dir: [315, 60], speed: 5, wrap: true },
      { id: 'UTDCD',       name: 'Deer Creek Dam',    role: 'Target — north flow arrival at the dam', lagMinutes: 0,   dir: [315, 60], speed: 4, wrap: true },
    ],
    pressureCheck: { type: 'above', threshold: -1.0 },
  },

  // ── Willard Bay: South Flow (SLC → Ogden → Willard) ───────────
  'willard-bay:south_flow': {
    label: 'South Flow → Willard Bay',
    flowDir: 'S → N',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',    role: 'Valley-wide south flow origin',     lagMinutes: -90, dir: [150, 220], speed: 5 },
      { id: 'KHIF', name: 'Hill AFB',        role: 'Military base — south flow transit', lagMinutes: -60, dir: [150, 220], speed: 5 },
      { id: 'KOGD', name: 'Ogden Airport',   role: 'Ogden valley confirmation',          lagMinutes: -30, dir: [170, 220], speed: 5 },
      { id: 'UR328',name: 'Willard Bay South',role: 'Target — arrival at the beach',     lagMinutes: 0,   dir: [170, 220], speed: 6 },
    ],
    pressureCheck: null,
  },

  // ── Jordanelle: Canyon Thermal ─────────────────────────────────
  'jordanelle:canyon_thermal': {
    label: 'Canyon Thermal → Jordanelle',
    flowDir: 'Canyon → Valley',
    nodes: [
      { id: 'UTLPC', name: 'Lower Provo Canyon',  role: 'Canyon thermal draw indicator',     lagMinutes: -60, dir: [170, 220], speed: 4 },
      { id: 'UTCHL', name: 'Charleston',            role: 'Heber Valley mid-chain',            lagMinutes: -30, dir: [180, 230], speed: 4 },
      { id: 'KHCR',  name: 'Heber Airport',         role: 'Heber valley arrival',              lagMinutes: 0,   dir: [180, 230], speed: 5 },
    ],
    pressureCheck: null,
  },

  // ── Strawberry: Ridge Flow (W wind from Wasatch) ───────────────
  'strawberry:ridge_flow': {
    label: 'Ridge Flow → Strawberry',
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
    label: 'West Wind → Bear Lake',
    flowDir: 'W → E',
    nodes: [
      { id: 'KLGU',  name: 'Logan Airport',    role: 'Cache Valley west flow indicator', lagMinutes: -60, dir: [250, 320], speed: 5 },
      { id: 'BERU1', name: 'Bear River RAWS',  role: 'Target — Bear Lake arrival',       lagMinutes: 0,   dir: [250, 320], speed: 6 },
    ],
    pressureCheck: null,
  },

  // ── Skyline Drive: Ridge Flow (snowkite) ───────────────────────
  'skyline:ridge_flow': {
    label: 'Ridge Flow → Skyline',
    flowDir: 'W → E',
    nodes: [
      { id: 'KSLC', name: 'SLC Airport',       role: 'Wasatch front indicator',          lagMinutes: -120, dir: [220, 300], speed: 8 },
      { id: 'UTESU',name: 'Ephraim Ridge',      role: 'Sanpete ridge confirmation',       lagMinutes: -30,  dir: [220, 300], speed: 8 },
      { id: 'SKY',  name: 'Skyline Drive',      role: 'Target — ridgetop arrival',        lagMinutes: 0,    dir: [220, 300], speed: 10 },
    ],
    pressureCheck: null,
  },
};

// ─── Map: lakeId → which chains apply to THAT specific launch ────

const LAKE_CHAINS = {
  'utah-lake':          ['zigzag:se_thermal', 'zigzag:north_flow'],
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
  'bear-lake':          ['bear-lake:west_flow'],
  'skyline-drive':      ['skyline:ridge_flow'],
};

// ─── Session viability: minimum wind duration for a real session ──
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
 * Priority: 1) 3-year PWS backfill  2) server-learned chain stats  3) defaults
 */
export function estimateSessionDuration(chainKey, activity) {
  // Priority 1: Real PWS backfill data (3 years of actual history)
  const backfillRaw = typeof localStorage !== 'undefined' && localStorage.getItem('propagation:pwsBackfill');
  if (backfillRaw) {
    try {
      const bf = JSON.parse(backfillRaw);
      const actKey = activity === 'foil_kiting' ? 'foil_kiting'
        : activity === 'paragliding' ? 'paragliding'
        : activity === 'light_wind' ? 'light_wind'
        : activity === 'sailing' || activity === 'windsurfing' || activity === 'snowkiting' ? 'kiting'
        : activity === 'boating' || activity === 'paddling' || activity === 'fishing' ? 'light_wind'
        : 'kiting';
      const stats = bf.byActivity?.[actKey];
      if (stats && stats.windDays >= 5) {
        const month = new Date().getMonth();
        const monthKey = `${actKey}:${month}`;
        const monthStats = bf.byMonth?.[monthKey];

        return {
          avgMinutes: monthStats?.avgSession || stats.avgLongestSession,
          minMinutes: 15,
          maxMinutes: stats.maxSession,
          avgPeak: monthStats?.avgPeak || stats.avgPeak,
          samples: stats.windDays,
          source: 'pws-backfill',
          windProbability: monthStats ? Math.round((monthStats.windDays / monthStats.days) * 100) : Math.round((stats.windDays / stats.totalDays) * 100),
        };
      }
    } catch { /* fall through */ }
  }

  // Priority 2: Server-learned chain stats (cron-collected daily)
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

  // Priority 3: Defaults based on chain type
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

  const est = estimateSessionDuration(chainKey, activity);
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

  // Estimate lakeshore speed from upstream using speed ratios
  const ratios = def.speedRatios || {};
  let estimatedTargetSpeed = null;
  if (!targetNode?.fired && farthestFired?.speed > 0 && ratios[farthestFired.id]) {
    estimatedTargetSpeed = Math.round((farthestFired.speed / ratios[farthestFired.id]) * 10) / 10;
  }

  if (!pressureOk || firedCount === 0) {
    phase = 'none';
    message = !pressureOk ? 'Pressure gradient unfavorable' : 'No signal detected';
  } else if (targetNode?.fired) {
    phase = 'arrived';
    confidence = 95;
    message = `${def.label} at your launch: ${safeToFixed(targetNode.speed, 1)} mph from ${targetNode.direction}°`;
  } else if (farthestFired) {
    phase = 'propagating';
    const targetLag = getLag(chainKey, target.id);
    const sourceLag = getLag(chainKey, farthestFired.id);
    etaMinutes = Math.max(0, Math.round(targetLag - sourceLag));
    confidence = Math.min(90, 30 + firedCount * 20);
    const estStr = estimatedTargetSpeed != null
      ? ` → expect ~${safeToFixed(estimatedTargetSpeed, 0)} mph at your launch`
      : '';
    message = `${farthestFired.name}: ${safeToFixed(farthestFired.speed, 1)} mph${estStr} — ETA ${etaMinutes} min`;
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
    estimatedTargetSpeed,
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

  const emptyChain = { phase: 'none', confidence: 0, nodes: [], firedCount: 0, totalNodes: 0, pressureOk: true, label: '', message: '', chainKey: '' };
  result.seThermal = chains.find(c => c.type?.includes('thermal') || c.type?.includes('se_thermal') || c.type?.includes('sw_thermal') || c.type?.includes('canyon')) || emptyChain;
  result.northFlow = chains.find(c => c.type?.includes('north_flow') || c.type?.includes('postfrontal') || c.type?.includes('ridge')) || emptyChain;

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
