/**
 * THERMAL PROPAGATION SERVICE
 *
 * Detects, tracks, and validates thermal wind propagation through a network of
 * weather stations. A thermal is not a point event — it's a spatial wave that
 * moves through the valley in a predictable order. This service captures that
 * pattern, times it, and learns from every day's outcome.
 *
 * STATION CHAINS (validated correlations from ThermalPredictor.js):
 *
 *   SE Thermal:  QSF (−2h) → KPVU (−1h) → FPS (−30m) → PWS (arrival) → UTALP (spill)
 *   North Flow:  KSLC (−1h) → UTALP (−30m) → FPS (arrival) → PWS (confirmation)
 *
 * Each link in the chain has:
 *   - Onset thresholds (direction + speed)
 *   - Expected lag time (minutes)
 *   - Historical hit rate
 *
 * The service:
 *   1. Detects onset at each station against thresholds
 *   2. Tracks which stations have "fired" and when
 *   3. Calculates ETA to the target station using learned lags
 *   4. After the day is over, scores the propagation event for learning
 */

import { safeToFixed } from '../utils/safeToFixed';

// ─── SE Thermal chain: south → north along Utah Lake ──────────────
const SE_THERMAL_CHAIN = [
  {
    id: 'QSF',
    name: 'Spanish Fork Canyon',
    role: 'Early warning — canyon mouth catches SE flow first',
    lagMinutes: -120,
    thresholds: {
      direction: { min: 100, max: 180 },
      speed: 6,
    },
    coordinates: { lat: 40.115, lng: -111.655 },
  },
  {
    id: 'KPVU',
    name: 'Provo Airport',
    role: 'Valley floor confirmation — SE flow entering Utah Valley',
    lagMinutes: -60,
    thresholds: {
      direction: { min: 120, max: 180 },
      speed: 5,
    },
    coordinates: { lat: 40.219, lng: -111.724 },
  },
  {
    id: 'FPS',
    name: 'Flight Park South',
    role: 'Primary sensor — thermal hits the Point first',
    lagMinutes: -30,
    thresholds: {
      direction: { min: 130, max: 180 },
      speed: 8,
    },
    coordinates: { lat: 40.442, lng: -111.898 },
  },
  {
    id: 'PWS',
    name: 'Zigzag (Your Station)',
    role: 'Target — your launch, ground truth',
    lagMinutes: 0,
    thresholds: {
      direction: { min: 100, max: 180 },
      speed: 8,
    },
    coordinates: { lat: 40.35, lng: -111.87 },
  },
  {
    id: 'UTALP',
    name: 'Point of Mountain',
    role: 'Spill indicator — thermal pushing through the gap',
    lagMinutes: 15,
    thresholds: {
      direction: { min: 130, max: 200 },
      speed: 5,
    },
    coordinates: { lat: 40.446, lng: -111.898 },
  },
];

// ─── North Flow chain: north → south through the gap ──────────────
const NORTH_FLOW_CHAIN = [
  {
    id: 'KSLC',
    name: 'SLC Airport',
    role: 'Source — Great Salt Lake outflow',
    lagMinutes: -60,
    thresholds: {
      direction: { min: 315, max: 45, wrap: true },
      speed: 8,
    },
    coordinates: { lat: 40.788, lng: -111.978 },
  },
  {
    id: 'UTALP',
    name: 'Point of Mountain',
    role: 'Funneling — gap wind acceleration',
    lagMinutes: -30,
    thresholds: {
      direction: { min: 315, max: 45, wrap: true },
      speed: 5,
    },
    coordinates: { lat: 40.446, lng: -111.898 },
  },
  {
    id: 'FPS',
    name: 'Flight Park South',
    role: 'Arrival — wind reaching the lake',
    lagMinutes: -15,
    thresholds: {
      direction: { min: 315, max: 60, wrap: true },
      speed: 8,
    },
    coordinates: { lat: 40.442, lng: -111.898 },
  },
  {
    id: 'PWS',
    name: 'Zigzag (Your Station)',
    role: 'Confirmation — ground truth at your launch',
    lagMinutes: 0,
    thresholds: {
      direction: { min: 300, max: 60, wrap: true },
      speed: 6,
    },
    coordinates: { lat: 40.35, lng: -111.87 },
  },
];

// ─── Learned lag adjustments (overwritten by learning system) ──────
let learnedLags = null;

export function setLearnedLags(lags) {
  learnedLags = lags;
}

// ─── Helpers ───────────────────────────────────────────────────────

function directionInRange(dir, range) {
  if (dir == null) return false;
  if (range.wrap) {
    return dir >= range.min || dir <= range.max;
  }
  return dir >= range.min && dir <= range.max;
}

function stationHasFired(station, stationData) {
  if (!stationData) return { fired: false, speed: null, direction: null };
  const speed = stationData.speed ?? stationData.windSpeed ?? 0;
  const dir = stationData.direction ?? stationData.windDirection;
  const gust = stationData.gust ?? stationData.windGust ?? speed;
  const fired =
    directionInRange(dir, station.thresholds) &&
    speed >= station.thresholds.speed;
  return { fired, speed, gust, direction: dir };
}

function getLag(chainType, stationId) {
  const key = `${chainType}:${stationId}`;
  if (learnedLags?.[key]?.samples >= 5) {
    return learnedLags[key].avgLagMinutes;
  }
  const chain = chainType === 'se_thermal' ? SE_THERMAL_CHAIN : NORTH_FLOW_CHAIN;
  return chain.find((s) => s.id === stationId)?.lagMinutes ?? 0;
}

// ─── Core: analyze propagation state ──────────────────────────────

/**
 * Analyze the current propagation state across all stations.
 *
 * @param {Object} stationReadings - Map of stationId → { speed, gust, direction, temp }
 *   PWS readings should be keyed as 'PWS'.
 * @param {Object} [options]
 * @param {string} [options.lakeId] - Lake ID for context
 * @param {number} [options.pressureGradient] - SLC − Provo pressure differential (mb)
 * @returns {Object} Propagation analysis
 */
export function analyzePropagation(stationReadings, options = {}) {
  const { pressureGradient } = options;
  const now = new Date();
  const hour = now.getHours();
  const results = {};

  // ── Detect SE Thermal propagation ───────────────────────────────
  const seNodes = SE_THERMAL_CHAIN.map((node) => {
    const data = stationReadings[node.id];
    const { fired, speed, gust, direction } = stationHasFired(node, data);
    const lag = getLag('se_thermal', node.id);
    return {
      ...node,
      lagMinutes: lag,
      fired,
      speed,
      gust,
      direction,
      temp: data?.temp ?? data?.temperature,
    };
  });

  const seFiredCount = seNodes.filter((n) => n.fired).length;
  const seFarthestFired = [...seNodes].reverse().find((n) => n.fired);
  const seTarget = seNodes.find((n) => n.id === 'PWS');
  const sePressureOk = pressureGradient == null || pressureGradient < 2.0;

  let seEtaMinutes = null;
  let seConfidence = 0;
  let sePhase = 'none';
  let seMessage = '';

  if (seFiredCount === 0 || !sePressureOk) {
    sePhase = 'none';
    seMessage = !sePressureOk
      ? 'Pressure gradient blocking SE thermal'
      : 'No SE thermal signal detected';
  } else if (seTarget?.fired) {
    sePhase = 'arrived';
    seMessage = `SE thermal at your station: ${safeToFixed(seTarget.speed, 1)} mph from ${seTarget.direction}°`;
    seConfidence = 95;
  } else if (seFarthestFired) {
    sePhase = 'propagating';
    const targetLag = getLag('se_thermal', 'PWS');
    const sourceLag = getLag('se_thermal', seFarthestFired.id);
    seEtaMinutes = Math.max(0, Math.round(targetLag - sourceLag));
    seConfidence = Math.min(90, 30 + seFiredCount * 20);
    seMessage = `Thermal at ${seFarthestFired.name} (${safeToFixed(seFarthestFired.speed, 1)} mph ${seFarthestFired.direction}°) — ETA ${seEtaMinutes} min`;
  }

  // Adjust SE confidence for time of day and month
  if (hour < 7 || hour > 17) seConfidence = Math.min(seConfidence, 20);
  if (sePhase === 'propagating' && hour >= 10 && hour <= 13) {
    seConfidence = Math.min(95, seConfidence + 10);
  }

  results.seThermal = {
    phase: sePhase,
    message: seMessage,
    confidence: seConfidence,
    etaMinutes: seEtaMinutes,
    nodes: seNodes.map(({ id, name, role, lagMinutes, fired, speed, gust, direction, temp }) => ({
      id, name, role, lagMinutes, fired, speed, gust, direction, temp,
    })),
    firedCount: seFiredCount,
    totalNodes: seNodes.length,
    pressureOk: sePressureOk,
  };

  // ── Detect North Flow propagation ───────────────────────────────
  const nfNodes = NORTH_FLOW_CHAIN.map((node) => {
    const data = stationReadings[node.id];
    const { fired, speed, gust, direction } = stationHasFired(node, data);
    const lag = getLag('north_flow', node.id);
    return {
      ...node,
      lagMinutes: lag,
      fired,
      speed,
      gust,
      direction,
      temp: data?.temp ?? data?.temperature,
    };
  });

  const nfFiredCount = nfNodes.filter((n) => n.fired).length;
  const nfFarthestFired = [...nfNodes].reverse().find((n) => n.fired);
  const nfTarget = nfNodes.find((n) => n.id === 'PWS');
  const nfPressureOk = pressureGradient == null || pressureGradient > -1.0;

  let nfEtaMinutes = null;
  let nfConfidence = 0;
  let nfPhase = 'none';
  let nfMessage = '';

  if (nfFiredCount === 0 || !nfPressureOk) {
    nfPhase = 'none';
    nfMessage = !nfPressureOk
      ? 'Pressure gradient not supporting north flow'
      : 'No north flow signal detected';
  } else if (nfTarget?.fired) {
    nfPhase = 'arrived';
    nfMessage = `North flow at your station: ${safeToFixed(nfTarget.speed, 1)} mph from ${nfTarget.direction}°`;
    nfConfidence = 95;
  } else if (nfFarthestFired) {
    nfPhase = 'propagating';
    const targetLag = getLag('north_flow', 'PWS');
    const sourceLag = getLag('north_flow', nfFarthestFired.id);
    nfEtaMinutes = Math.max(0, Math.round(targetLag - sourceLag));
    nfConfidence = Math.min(90, 30 + nfFiredCount * 20);
    nfMessage = `North flow at ${nfFarthestFired.name} (${safeToFixed(nfFarthestFired.speed, 1)} mph) — ETA ${nfEtaMinutes} min`;
  }

  results.northFlow = {
    phase: nfPhase,
    message: nfMessage,
    confidence: nfConfidence,
    etaMinutes: nfEtaMinutes,
    nodes: nfNodes.map(({ id, name, role, lagMinutes, fired, speed, gust, direction, temp }) => ({
      id, name, role, lagMinutes, fired, speed, gust, direction, temp,
    })),
    firedCount: nfFiredCount,
    totalNodes: nfNodes.length,
    pressureOk: nfPressureOk,
  };

  // ── Dominant signal ─────────────────────────────────────────────
  const dominant =
    results.seThermal.confidence >= results.northFlow.confidence
      ? results.seThermal
      : results.northFlow;
  const dominantType =
    results.seThermal.confidence >= results.northFlow.confidence
      ? 'se_thermal'
      : 'north_flow';

  results.dominant = {
    type: dominantType,
    phase: dominant.phase,
    message: dominant.message,
    confidence: dominant.confidence,
    etaMinutes: dominant.etaMinutes,
  };

  results.timestamp = now.toISOString();
  return results;
}

// ─── Event capture for learning ───────────────────────────────────

/**
 * Create a propagation event record for learning. Call this at the end of each
 * thermal window to capture the day's propagation outcome.
 *
 * @param {Object} propagationResult - From analyzePropagation()
 * @param {Object} outcome - Observed outcome
 * @param {number} outcome.peakSpeed - Peak wind speed at target
 * @param {number} outcome.usableMinutes - Minutes of usable wind
 * @param {string} outcome.quality - 'excellent' | 'good' | 'marginal' | 'bust'
 * @param {Array}  snapshots - Array of { timestamp, stationReadings } collected during the day
 * @returns {Object} Propagation event for storage
 */
export function createPropagationEvent(propagationResult, outcome, snapshots = []) {
  const { seThermal, northFlow, dominant } = propagationResult;
  const now = new Date();

  // Reconstruct onset times from snapshots
  const onsetTimes = {};
  const activeChain =
    dominant.type === 'se_thermal' ? seThermal.nodes : northFlow.nodes;

  for (const node of activeChain) {
    if (!node.fired) continue;
    for (const snap of snapshots) {
      const reading = snap.stationReadings?.[node.id];
      if (!reading) continue;
      const chain =
        dominant.type === 'se_thermal' ? SE_THERMAL_CHAIN : NORTH_FLOW_CHAIN;
      const def = chain.find((c) => c.id === node.id);
      if (!def) continue;
      const { fired } = stationHasFired(def, reading);
      if (fired && !onsetTimes[node.id]) {
        onsetTimes[node.id] = snap.timestamp;
      }
    }
  }

  // Calculate actual lags between stations
  const actualLags = {};
  const targetOnset = onsetTimes['PWS'];
  if (targetOnset) {
    const targetTime = new Date(targetOnset).getTime();
    for (const [stationId, onsetTime] of Object.entries(onsetTimes)) {
      if (stationId === 'PWS') continue;
      const stationTime = new Date(onsetTime).getTime();
      actualLags[stationId] = Math.round((stationTime - targetTime) / 60000);
    }
  }

  return {
    date: now.toISOString().slice(0, 10),
    timestamp: now.toISOString(),
    type: dominant.type,
    confidence: dominant.confidence,
    phase: dominant.phase,

    chain: activeChain.map((node) => ({
      id: node.id,
      name: node.name,
      fired: node.fired,
      speed: node.speed,
      direction: node.direction,
      onsetTime: onsetTimes[node.id] || null,
      expectedLag: node.lagMinutes,
      actualLag: actualLags[node.id] ?? null,
    })),

    prediction: {
      etaMinutes: dominant.etaMinutes,
      confidence: dominant.confidence,
    },

    outcome: {
      peakSpeed: outcome.peakSpeed,
      usableMinutes: outcome.usableMinutes,
      quality: outcome.quality,
      arrived: dominant.phase === 'arrived',
    },

    lagErrors: Object.fromEntries(
      activeChain
        .filter((n) => actualLags[n.id] != null)
        .map((n) => [n.id, actualLags[n.id] - n.lagMinutes])
    ),
  };
}

// ─── Historical validation ────────────────────────────────────────

/**
 * Validate propagation patterns against an array of historical snapshots.
 * Each snapshot: { timestamp, stations: { stationId: { speed, direction, ... } } }
 *
 * Returns statistics about how often the chain pattern predicted correctly.
 *
 * @param {Array} historicalDays - Array of daily data: { date, snapshots: [...] }
 * @returns {Object} Validation results
 */
export function validateHistorical(historicalDays) {
  const results = {
    totalDays: historicalDays.length,
    seThermal: { signalDays: 0, arrivedDays: 0, hitRate: 0, avgLeadMinutes: 0, lagAccuracy: {} },
    northFlow: { signalDays: 0, arrivedDays: 0, hitRate: 0, avgLeadMinutes: 0, lagAccuracy: {} },
  };

  const seLagErrors = {};
  const nfLagErrors = {};

  for (const day of historicalDays) {
    if (!day.snapshots?.length) continue;

    let seSignaled = false;
    let seArrived = false;
    let seFirstSignal = null;
    let seArrivalTime = null;
    let nfSignaled = false;
    let nfArrived = false;
    let nfFirstSignal = null;
    let nfArrivalTime = null;

    const seOnsets = {};
    const nfOnsets = {};

    for (const snap of day.snapshots) {
      // SE thermal check
      for (const node of SE_THERMAL_CHAIN) {
        const data = snap.stations?.[node.id];
        if (!data) continue;
        const { fired } = stationHasFired(node, data);
        if (fired && !seOnsets[node.id]) {
          seOnsets[node.id] = snap.timestamp;
          if (node.id !== 'PWS' && !seSignaled) {
            seSignaled = true;
            seFirstSignal = snap.timestamp;
          }
          if (node.id === 'PWS') {
            seArrived = true;
            seArrivalTime = snap.timestamp;
          }
        }
      }

      // North flow check
      for (const node of NORTH_FLOW_CHAIN) {
        const data = snap.stations?.[node.id];
        if (!data) continue;
        const { fired } = stationHasFired(node, data);
        if (fired && !nfOnsets[node.id]) {
          nfOnsets[node.id] = snap.timestamp;
          if (node.id !== 'PWS' && !nfSignaled) {
            nfSignaled = true;
            nfFirstSignal = snap.timestamp;
          }
          if (node.id === 'PWS') {
            nfArrived = true;
            nfArrivalTime = snap.timestamp;
          }
        }
      }
    }

    if (seSignaled) {
      results.seThermal.signalDays++;
      if (seArrived) {
        results.seThermal.arrivedDays++;
        const leadMs = new Date(seArrivalTime) - new Date(seFirstSignal);
        results.seThermal.avgLeadMinutes += leadMs / 60000;

        // Lag accuracy per station
        if (seOnsets['PWS']) {
          const targetTime = new Date(seOnsets['PWS']).getTime();
          for (const node of SE_THERMAL_CHAIN) {
            if (node.id === 'PWS' || !seOnsets[node.id]) continue;
            const actual = Math.round(
              (new Date(seOnsets[node.id]).getTime() - targetTime) / 60000
            );
            if (!seLagErrors[node.id]) seLagErrors[node.id] = [];
            seLagErrors[node.id].push(actual - node.lagMinutes);
          }
        }
      }
    }

    if (nfSignaled) {
      results.northFlow.signalDays++;
      if (nfArrived) {
        results.northFlow.arrivedDays++;
        const leadMs = new Date(nfArrivalTime) - new Date(nfFirstSignal);
        results.northFlow.avgLeadMinutes += leadMs / 60000;

        if (nfOnsets['PWS']) {
          const targetTime = new Date(nfOnsets['PWS']).getTime();
          for (const node of NORTH_FLOW_CHAIN) {
            if (node.id === 'PWS' || !nfOnsets[node.id]) continue;
            const actual = Math.round(
              (new Date(nfOnsets[node.id]).getTime() - targetTime) / 60000
            );
            if (!nfLagErrors[node.id]) nfLagErrors[node.id] = [];
            nfLagErrors[node.id].push(actual - node.lagMinutes);
          }
        }
      }
    }
  }

  // Compute averages
  if (results.seThermal.arrivedDays > 0) {
    results.seThermal.avgLeadMinutes = Math.round(
      results.seThermal.avgLeadMinutes / results.seThermal.arrivedDays
    );
    results.seThermal.hitRate = Math.round(
      (results.seThermal.arrivedDays / results.seThermal.signalDays) * 100
    );
  }
  if (results.northFlow.arrivedDays > 0) {
    results.northFlow.avgLeadMinutes = Math.round(
      results.northFlow.avgLeadMinutes / results.northFlow.arrivedDays
    );
    results.northFlow.hitRate = Math.round(
      (results.northFlow.arrivedDays / results.northFlow.signalDays) * 100
    );
  }

  // Lag accuracy per station (mean error and MAE)
  for (const [stationId, errors] of Object.entries(seLagErrors)) {
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const mae = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
    results.seThermal.lagAccuracy[stationId] = {
      meanError: Math.round(mean),
      mae: Math.round(mae),
      samples: errors.length,
    };
  }
  for (const [stationId, errors] of Object.entries(nfLagErrors)) {
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const mae = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
    results.northFlow.lagAccuracy[stationId] = {
      meanError: Math.round(mean),
      mae: Math.round(mae),
      samples: errors.length,
    };
  }

  return results;
}

/**
 * Convert validation lag accuracy back into learned lag adjustments.
 * Feed this into setLearnedLags() to close the loop.
 */
export function lagAdjustmentsFromValidation(validation) {
  const lags = {};
  for (const [stationId, accuracy] of Object.entries(
    validation.seThermal.lagAccuracy
  )) {
    if (accuracy.samples >= 5) {
      const chain = SE_THERMAL_CHAIN.find((n) => n.id === stationId);
      if (chain) {
        lags[`se_thermal:${stationId}`] = {
          avgLagMinutes: chain.lagMinutes + accuracy.meanError,
          samples: accuracy.samples,
        };
      }
    }
  }
  for (const [stationId, accuracy] of Object.entries(
    validation.northFlow.lagAccuracy
  )) {
    if (accuracy.samples >= 5) {
      const chain = NORTH_FLOW_CHAIN.find((n) => n.id === stationId);
      if (chain) {
        lags[`north_flow:${stationId}`] = {
          avgLagMinutes: chain.lagMinutes + accuracy.meanError,
          samples: accuracy.samples,
        };
      }
    }
  }
  return lags;
}

export { SE_THERMAL_CHAIN, NORTH_FLOW_CHAIN };
