/**
 * WIND INTELLIGENCE ENGINE
 * 
 * The unified brain. Every predictor in this app sees one slice of reality.
 * ThermalPredictor sees thermodynamics. WindEventPredictor sees frontal dynamics.
 * CorrelationEngine sees spatial patterns. FrontalTrendPredictor sees history.
 * 
 * This engine sees ALL of them at once and resolves conflicts.
 * 
 * It also performs multi-station valley analysis — reading KSLC, KPVU, FPS,
 * UTALP, QSF, and PWS together to detect valley-wide patterns that no single
 * station can reveal: postfrontal clearing, synoptic wind events, and coherent
 * flow regimes that the thermal-only model completely misses.
 * 
 * Signal convergence measures how strongly independent sensors AGREE about
 * what is happening — whether that's thermal, clearing, or calm.
 */

import { safeToFixed } from '../utils/safeToFixed';

// NW/N clearing window: 270° (W) through 360° (N) through 45° (NE)
const CLEARING_DIR_MIN = 270;
const CLEARING_DIR_MAX = 45;
const CLEARING_MIN_SPEED = 5;

const VALLEY_STATIONS = ['KSLC', 'KPVU', 'FPS', 'UTALP', 'QSF'];

function isInClearingRange(dir) {
  if (dir == null) return false;
  return dir >= CLEARING_DIR_MIN || dir <= CLEARING_DIR_MAX;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function extractStationWind(obj) {
  if (!obj) return null;
  const speed = obj.windSpeed ?? obj.speed ?? null;
  const dir = obj.windDirection ?? obj.direction ?? null;
  if (speed == null && dir == null) return null;
  return { speed: speed ?? 0, dir: dir ?? null };
}

/**
 * Analyze the full valley station network for coherent wind patterns.
 * Looks at KSLC, KPVU, FPS, UTALP, QSF, and PWS simultaneously.
 *
 * Returns { pattern, stationsInAgreement, stationsChecked, dominantDir,
 *           avgSpeed, clearingConfidence, stationDetails }
 */
function analyzeValleyWind(mesoData, lakeState) {
  const result = {
    pattern: 'insufficient_data',
    stationsInAgreement: 0,
    stationsChecked: 0,
    dominantDir: null,
    avgSpeed: 0,
    clearingConfidence: 0,
    stationDetails: [],
  };

  const readings = [];

  for (const id of VALLEY_STATIONS) {
    let data = mesoData?.[id] || null;
    if (!data) {
      const stations = lakeState?.wind?.stations || mesoData?.stations || [];
      data = stations.find(s => s.id === id || s.stationId === id) || null;
    }
    const w = extractStationWind(data);
    if (w && w.dir != null) {
      readings.push({ id, ...w });
      result.stationDetails.push({ id, speed: w.speed, dir: w.dir, cardinal: getCardinal(w.dir) });
    }
  }

  const pws = lakeState?.pws;
  if (pws) {
    const w = extractStationWind(pws);
    if (w && w.dir != null) {
      readings.push({ id: 'PWS', ...w });
      result.stationDetails.push({ id: 'PWS', speed: w.speed, dir: w.dir, cardinal: getCardinal(w.dir) });
    }
  }

  result.stationsChecked = readings.length;
  if (readings.length < 2) return result;

  const clearingStations = readings.filter(
    r => isInClearingRange(r.dir) && r.speed >= CLEARING_MIN_SPEED
  );
  result.stationsInAgreement = clearingStations.length;

  if (clearingStations.length >= 3) {
    const avgSpd = clearingStations.reduce((s, r) => s + r.speed, 0) / clearingStations.length;
    const dirs = clearingStations.map(r => r.dir);
    const avgDir = averageDirection(dirs);

    result.pattern = 'nw_clearing';
    result.dominantDir = avgDir;
    result.avgSpeed = avgSpd;
    result.clearingConfidence = Math.min(95,
      40 + (clearingStations.length / readings.length) * 30 + Math.min(avgSpd, 20) * 1.5
    );
    return result;
  }

  const withWind = readings.filter(r => r.speed >= CLEARING_MIN_SPEED);
  if (withWind.length >= 2) {
    const dirs = withWind.map(r => r.dir);
    const spread = maxDirectionSpread(dirs);

    if (spread <= 90) {
      const avgSpd = withWind.reduce((s, r) => s + r.speed, 0) / withWind.length;
      const avgDir = averageDirection(dirs);
      result.pattern = 'coherent_flow';
      result.dominantDir = avgDir;
      result.avgSpeed = avgSpd;
      result.stationsInAgreement = withWind.length;
      result.clearingConfidence = Math.min(80,
        30 + (withWind.length / readings.length) * 25 + Math.min(avgSpd, 15)
      );
      return result;
    }
  }

  result.pattern = 'variable';
  return result;
}

function averageDirection(dirs) {
  let sinSum = 0, cosSum = 0;
  for (const d of dirs) {
    const rad = (d * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let avg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (avg < 0) avg += 360;
  return Math.round(avg);
}

function maxDirectionSpread(dirs) {
  let maxSpread = 0;
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const diff = angleDiff(dirs[i], dirs[j]);
      if (diff > maxSpread) maxSpread = diff;
    }
  }
  return maxSpread;
}

/**
 * Synthesize all prediction signals into a unified intelligence report.
 */
export function synthesize({
  lakeState,
  correlation,
  boatingPrediction,
  swingAlerts = [],
  mesoData,
  lakeId: _lakeId,
  pressureHistory: _pressureHistory,
}) {
  const thermal = lakeState?.thermalPrediction || {};
  const pressure = lakeState?.pressure || {};
  const wind = lakeState?.wind || {};
  const pws = lakeState?.pws;

  const signals = [];
  const conflicts = [];
  let confidenceMultiplier = 1.0;

  // ─── VALLEY-WIDE PATTERN ANALYSIS ────────────────────────────────
  const valleyWind = analyzeValleyWind(mesoData, lakeState);

  // ─── SIGNAL COLLECTION ──────────────────────────────────────────

  // 1. Thermal prediction
  const thermalProb = thermal.probability ?? 0;
  if (thermalProb > 0) {
    signals.push({
      source: 'thermal',
      type: thermalProb >= 60 ? 'bullish' : thermalProb >= 30 ? 'neutral' : 'bearish',
      strength: thermalProb / 100,
      detail: `${thermalProb}% thermal probability`,
      raw: thermal,
    });
  }

  // 2. Pressure gradient
  const gradient = pressure.gradient;
  if (gradient != null) {
    const absGrad = Math.abs(gradient);
    const isNorthFlow = gradient > 1.5;
    const isThermalFavorable = gradient < 1.0 && gradient > -1.0;
    signals.push({
      source: 'pressure',
      type: isNorthFlow ? 'north_flow' : isThermalFavorable ? 'thermal_favorable' : 'neutral',
      strength: Math.min(1, absGrad / 3),
      detail: `\u0394P ${gradient > 0 ? '+' : ''}${safeToFixed(gradient, 2)} mb`,
      raw: { gradient },
    });
  }

  // 3. Frontal swing alerts
  for (const alert of swingAlerts) {
    const isCritical = alert.severity === 'critical';
    signals.push({
      source: 'frontal',
      type: 'bearish',
      strength: isCritical ? 0.9 : 0.6,
      detail: alert.label + (alert.detail ? ` \u2014 ${alert.detail}` : ''),
      raw: alert,
    });
  }

  // 4. Correlation triggers
  if (correlation?.activeTriggers?.length > 0) {
    for (const trigger of correlation.activeTriggers) {
      signals.push({
        source: 'spatial',
        type: trigger.type === 'boost' ? 'bullish' : trigger.type === 'cap' ? 'bearish' : 'neutral',
        strength: trigger.type === 'boost' ? 0.7 : trigger.type === 'cap' ? 0.8 : 0.5,
        detail: trigger.label,
        raw: trigger,
      });
    }
  }

  // 5. Boating/glass conditions
  if (boatingPrediction?.probability != null) {
    const glassProb = boatingPrediction.probability;
    signals.push({
      source: 'glass',
      type: glassProb >= 60 ? 'calm' : 'neutral',
      strength: glassProb / 100,
      detail: boatingPrediction.isGlass ? 'Glass conditions active' : `${glassProb}% glass probability`,
      raw: boatingPrediction,
    });
  }

  // 6. Current wind reality check
  const currentSpeed = pws?.windSpeed ?? wind.stations?.[0]?.windSpeed ?? wind.stations?.[0]?.speed;
  if (currentSpeed != null) {
    signals.push({
      source: 'ground_truth',
      type: currentSpeed >= 8 ? 'windy' : currentSpeed >= 3 ? 'light' : 'calm',
      strength: Math.min(1, currentSpeed / 15),
      detail: `Ground truth: ${(currentSpeed ?? 0).toFixed(0)} mph`,
      raw: { speed: currentSpeed },
    });
  }

  // 7. Valley-wide multi-station pattern
  if (valleyWind.pattern === 'nw_clearing') {
    const dirLabel = getCardinal(valleyWind.dominantDir);
    signals.push({
      source: 'valley_pattern',
      type: 'clearing',
      strength: Math.min(1, valleyWind.clearingConfidence / 100),
      detail: `${valleyWind.stationsInAgreement}/${valleyWind.stationsChecked} stations ${dirLabel} at ${Math.round(valleyWind.avgSpeed)}+ mph`,
      raw: valleyWind,
    });
  } else if (valleyWind.pattern === 'coherent_flow') {
    const dirLabel = getCardinal(valleyWind.dominantDir);
    signals.push({
      source: 'valley_pattern',
      type: 'coherent',
      strength: Math.min(1, valleyWind.clearingConfidence / 100),
      detail: `${valleyWind.stationsInAgreement} stations aligned ${dirLabel} at ${Math.round(valleyWind.avgSpeed)} mph`,
      raw: valleyWind,
    });
  }

  // ─── CONFLICT DETECTION ─────────────────────────────────────────

  const hasFrontalAlert = swingAlerts.some(a =>
    a.id === 'frontal-hit' || a.id === 'rapid-cool' || a.id === 'wind-shift'
  );
  const hasHighThermal = thermalProb >= 50;
  const hasNorthFlowPressure = gradient != null && gradient > 1.5;

  if (hasHighThermal && hasFrontalAlert) {
    conflicts.push({
      id: 'thermal-vs-frontal',
      severity: 'critical',
      message: 'Thermal prediction conflicts with active frontal passage',
      resolution: 'Frontal signals override \u2014 thermal cycle likely disrupted',
      adjustedProbability: Math.min(thermalProb, 20),
    });
    confidenceMultiplier *= 0.3;
  }

  if (hasHighThermal && hasNorthFlowPressure) {
    conflicts.push({
      id: 'thermal-vs-northflow',
      severity: 'high',
      message: 'Thermal prediction conflicts with strong N-S pressure gradient',
      resolution: 'North flow dominates \u2014 expect NW wind, not thermal SE',
      adjustedProbability: Math.min(thermalProb, 15),
    });
    confidenceMultiplier *= 0.4;
  }

  if (boatingPrediction?.probability >= 50 && currentSpeed >= 10) {
    conflicts.push({
      id: 'glass-vs-wind',
      severity: 'medium',
      message: 'Glass predicted but current wind is already elevated',
      resolution: 'Wait for wind to die \u2014 glass window may be later',
    });
    confidenceMultiplier *= 0.7;
  }

  // ─── SIGNAL CONVERGENCE SCORE ──────────────────────────────────
  // Measures how strongly independent signals AGREE — regardless of
  // whether they agree on thermal, clearing, or calm. High convergence
  // means the system is confident in its classification.

  const totalSignals = signals.length || 1;

  const windPositiveCount = signals.filter(s =>
    s.type === 'bullish' || s.type === 'thermal_favorable' ||
    s.type === 'windy' || s.type === 'clearing' || s.type === 'coherent' ||
    s.type === 'north_flow'
  ).length;
  const calmCount = signals.filter(s =>
    s.type === 'calm' || (s.type === 'bearish' && s.source === 'thermal')
  ).length;
  const uncertainCount = totalSignals - windPositiveCount - calmCount;

  const dominantGroupSize = Math.max(windPositiveCount, calmCount, uncertainCount);
  const convergenceScore = Math.round((dominantGroupSize / totalSignals) * 100);

  // ─── DOMINANT REGIME DETECTION ──────────────────────────────────

  let regime = 'uncertain';
  let regimeConfidence = 0;

  const isPostfrontalClearing = valleyWind.pattern === 'nw_clearing'
    && valleyWind.avgSpeed >= 8
    && thermalProb < 40;

  const isSynopticWind = !isPostfrontalClearing
    && valleyWind.pattern === 'coherent_flow'
    && valleyWind.avgSpeed >= 6
    && currentSpeed != null && currentSpeed >= 5;

  if (isPostfrontalClearing) {
    regime = 'postfrontal';
    regimeConfidence = Math.round(valleyWind.clearingConfidence);
  } else if (hasNorthFlowPressure && !hasHighThermal) {
    regime = 'north_flow';
    regimeConfidence = Math.min(95, 60 + (gradient ?? 0) * 10);
  } else if (hasFrontalAlert) {
    regime = 'frontal';
    regimeConfidence = 85;
  } else if (thermalProb >= 60 && !hasFrontalAlert && !hasNorthFlowPressure) {
    regime = 'thermal';
    regimeConfidence = thermalProb;
  } else if (isSynopticWind) {
    regime = 'synoptic_wind';
    regimeConfidence = Math.round(valleyWind.clearingConfidence);
  } else if (boatingPrediction?.isGlass || (currentSpeed != null && currentSpeed < 3 && thermalProb < 30)) {
    regime = 'glass';
    regimeConfidence = boatingPrediction?.probability ?? 70;
  } else if (thermalProb >= 30) {
    regime = 'building';
    regimeConfidence = thermalProb;
  } else {
    regime = 'transitional';
    regimeConfidence = 40;
  }

  // ─── ADJUSTED PROBABILITY ──────────────────────────────────────
  const criticalConflict = conflicts.find(c => c.adjustedProbability != null);
  const adjustedThermalProbability = criticalConflict
    ? criticalConflict.adjustedProbability
    : thermalProb;

  // ─── NARRATIVE ─────────────────────────────────────────────────
  const narrative = buildNarrative(regime, regimeConfidence, signals, conflicts, thermal, currentSpeed, gradient, valleyWind);

  return {
    signals,
    conflicts,
    convergenceScore,
    confidenceMultiplier,
    regime,
    regimeConfidence,
    adjustedThermalProbability,
    narrative,
    signalCount: signals.length,
    hasConflicts: conflicts.length > 0,
    valleyWind,
  };
}

function buildNarrative(regime, confidence, signals, conflicts, thermal, currentSpeed, gradient, valleyWind) {
  const lines = [];

  switch (regime) {
    case 'postfrontal': {
      const dirLabel = getCardinal(valleyWind?.dominantDir);
      const count = valleyWind?.stationsInAgreement ?? 0;
      const total = valleyWind?.stationsChecked ?? 0;
      const avgSpd = Math.round(valleyWind?.avgSpeed ?? 0);
      lines.push(`Postfrontal clearing wind \u2014 ${dirLabel} flow confirmed across ${count}/${total} stations.`);
      lines.push(`Valley averaging ${avgSpd} mph. Sustained wind as post-frontal high builds.`);
      lines.push('Not thermal-driven \u2014 this is synoptic clearing wind.');
      break;
    }
    case 'synoptic_wind': {
      const dirLabel = getCardinal(valleyWind?.dominantDir);
      const count = valleyWind?.stationsInAgreement ?? 0;
      const avgSpd = Math.round(valleyWind?.avgSpeed ?? 0);
      lines.push(`Synoptic wind pattern active \u2014 ${count} stations confirm ${dirLabel} flow at ${avgSpd} mph.`);
      lines.push('Non-thermal wind event. Valley-wide pattern tracking.');
      break;
    }
    case 'north_flow':
      lines.push(`North flow regime dominant (\u0394P ${(gradient ?? 0) > 0 ? '+' : ''}${(gradient ?? 0).toFixed(1)} mb).`);
      lines.push('Expect sustained NW-N wind. Thermal cycle suppressed.');
      break;
    case 'frontal':
      lines.push('Active frontal passage detected.');
      lines.push('Conditions changing rapidly \u2014 expect wind shift and temperature drop.');
      break;
    case 'thermal':
      lines.push(`Thermal cycle active \u2014 ${confidence}% confidence.`);
      if (thermal.startHour) {
        const h = thermal.startHour;
        lines.push(`Peak window: ${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'} \u2013 ${h + 3 > 12 ? h + 3 - 12 : h + 3}${h + 3 >= 12 ? 'PM' : 'AM'}`);
      }
      break;
    case 'glass':
      lines.push('Glass/calm conditions prevailing.');
      lines.push('Ideal for boating, paddling, and fishing.');
      break;
    case 'building':
      lines.push(`Conditions building \u2014 ${confidence}% thermal probability.`);
      lines.push('Wind may develop. Monitor upstream indicators.');
      break;
    default:
      lines.push('Transitional weather pattern \u2014 multiple signals, low convergence.');
      lines.push('Conditions may change. Check back in 30 minutes.');
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push(`\u26A0 ${conflicts.length} signal conflict${conflicts.length > 1 ? 's' : ''} detected:`);
    for (const c of conflicts) {
      lines.push(`  \u2022 ${c.resolution}`);
    }
  }

  return lines.join('\n');
}

/**
 * Quick check: is the current regime suitable for a given activity?
 */
export function isRegimeSuitable(regime, activity) {
  const windActivities = ['kiting', 'sailing', 'windsurfing', 'snowkiting', 'paragliding'];
  const calmActivities = ['boating', 'paddling', 'fishing'];

  if (windActivities.includes(activity)) {
    return ['thermal', 'north_flow', 'frontal', 'building', 'postfrontal', 'synoptic_wind'].includes(regime);
  }
  if (calmActivities.includes(activity)) {
    return regime === 'glass' || regime === 'transitional';
  }
  return true;
}
