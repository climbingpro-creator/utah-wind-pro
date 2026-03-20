/**
 * WIND INTELLIGENCE ENGINE
 * 
 * The unified brain. Every predictor in this app sees one slice of reality.
 * ThermalPredictor sees thermodynamics. WindEventPredictor sees frontal dynamics.
 * CorrelationEngine sees spatial patterns. FrontalTrendPredictor sees history.
 * 
 * This engine sees ALL of them at once and resolves conflicts.
 * 
 * When the thermal predictor says 72% and the frontal detector says a cold front
 * is 30 minutes away — this engine knows the thermal is about to die.
 * 
 * When pressure is falling, upstream stations show NW wind, and local temperature
 * just dropped 5°F — this engine knows it's not a thermal day, it's a north flow day.
 * 
 * Signal convergence = high confidence. Signal divergence = uncertainty.
 * The truth is in the agreement between independent systems.
 */

import { monitorSwings } from './FrontalTrendPredictor';
import { predictWindEvents } from './WindEventPredictor';
import { safeToFixed } from '../utils/safeToFixed';

/**
 * Synthesize all prediction signals into a unified intelligence report.
 *
 * @param {object} params
 * @param {object} params.lakeState - Full lake state from useLakeData
 * @param {object} params.correlation - Output from CorrelationEngine
 * @param {object} params.boatingPrediction - Output from BoatingPredictor
 * @param {Array}  params.swingAlerts - Output from monitorSwings
 * @param {object} params.mesoData - Normalized station data
 * @param {string} params.lakeId - Current lake ID
 * @param {object} [params.pressureHistory] - Pressure history for trend analysis
 * @returns {object} Unified intelligence report
 */
export function synthesize({
  lakeState,
  correlation,
  boatingPrediction,
  swingAlerts = [],
  mesoData,
  lakeId,
  pressureHistory,
}) {
  const thermal = lakeState?.thermalPrediction || {};
  const pressure = lakeState?.pressure || {};
  const wind = lakeState?.wind || {};
  const pws = lakeState?.pws;

  const signals = [];
  const conflicts = [];
  let confidenceMultiplier = 1.0;

  // ─── SIGNAL COLLECTION ──────────────────────────────────────────
  // Each signal is { source, type, strength (0-1), direction ('bullish'|'bearish'|'neutral'), detail }

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
      detail: `ΔP ${gradient > 0 ? '+' : ''}${safeToFixed(gradient, 2)} mb`,
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
      detail: alert.label + (alert.detail ? ` — ${alert.detail}` : ''),
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

  // ─── CONFLICT DETECTION ─────────────────────────────────────────
  // When independent signals disagree, flag it and adjust confidence

  const hasFrontalAlert = swingAlerts.some(a => 
    a.id === 'frontal-hit' || a.id === 'rapid-cool' || a.id === 'wind-shift'
  );
  const hasHighThermal = thermalProb >= 50;
  const hasNorthFlowPressure = gradient != null && gradient > 1.5;

  // Conflict: Thermal says go, but front is hitting
  if (hasHighThermal && hasFrontalAlert) {
    conflicts.push({
      id: 'thermal-vs-frontal',
      severity: 'critical',
      message: 'Thermal prediction conflicts with active frontal passage',
      resolution: 'Frontal signals override — thermal cycle likely disrupted',
      adjustedProbability: Math.min(thermalProb, 20),
    });
    confidenceMultiplier *= 0.3;
  }

  // Conflict: Thermal says go, but pressure says north flow
  if (hasHighThermal && hasNorthFlowPressure) {
    conflicts.push({
      id: 'thermal-vs-northflow',
      severity: 'high',
      message: 'Thermal prediction conflicts with strong N-S pressure gradient',
      resolution: 'North flow dominates — expect NW wind, not thermal SE',
      adjustedProbability: Math.min(thermalProb, 15),
    });
    confidenceMultiplier *= 0.4;
  }

  // Conflict: Glass prediction but wind is already up
  if (boatingPrediction?.probability >= 50 && currentSpeed >= 10) {
    conflicts.push({
      id: 'glass-vs-wind',
      severity: 'medium',
      message: 'Glass predicted but current wind is already elevated',
      resolution: 'Wait for wind to die — glass window may be later',
    });
    confidenceMultiplier *= 0.7;
  }

  // ─── SIGNAL CONVERGENCE SCORE ──────────────────────────────────
  // When multiple independent signals agree, confidence is high.
  // When they disagree, confidence drops.

  const bullishCount = signals.filter(s => s.type === 'bullish' || s.type === 'thermal_favorable').length;
  const bearishCount = signals.filter(s => s.type === 'bearish' || s.type === 'north_flow').length;
  const totalSignals = signals.length || 1;

  const agreement = Math.abs(bullishCount - bearishCount) / totalSignals;
  const convergenceScore = Math.round(agreement * 100);

  // Dominant regime detection
  let regime = 'uncertain';
  let regimeConfidence = 0;

  if (hasNorthFlowPressure && !hasHighThermal) {
    regime = 'north_flow';
    regimeConfidence = Math.min(95, 60 + (gradient ?? 0) * 10);
  } else if (hasFrontalAlert) {
    regime = 'frontal';
    regimeConfidence = 85;
  } else if (thermalProb >= 60 && !hasFrontalAlert && !hasNorthFlowPressure) {
    regime = 'thermal';
    regimeConfidence = thermalProb;
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
  // The thermal probability, adjusted by frontal/pressure overrides
  const criticalConflict = conflicts.find(c => c.adjustedProbability != null);
  const adjustedThermalProbability = criticalConflict
    ? criticalConflict.adjustedProbability
    : thermalProb;

  // ─── NARRATIVE ─────────────────────────────────────────────────
  // Human-readable intelligence summary
  const narrative = buildNarrative(regime, regimeConfidence, signals, conflicts, thermal, currentSpeed, gradient);

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
  };
}

function buildNarrative(regime, confidence, signals, conflicts, thermal, currentSpeed, gradient) {
  const lines = [];

  switch (regime) {
    case 'north_flow':
      lines.push(`North flow regime dominant (ΔP ${(gradient ?? 0) > 0 ? '+' : ''}${(gradient ?? 0).toFixed(1)} mb).`);
      lines.push('Expect sustained NW-N wind. Thermal cycle suppressed.');
      break;
    case 'frontal':
      lines.push('Active frontal passage detected.');
      lines.push('Conditions changing rapidly — expect wind shift and temperature drop.');
      break;
    case 'thermal':
      lines.push(`Thermal cycle active — ${confidence}% confidence.`);
      if (thermal.startHour) {
        const h = thermal.startHour;
        lines.push(`Peak window: ${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'} – ${h + 3 > 12 ? h + 3 - 12 : h + 3}${h + 3 >= 12 ? 'PM' : 'AM'}`);
      }
      break;
    case 'glass':
      lines.push('Glass/calm conditions prevailing.');
      lines.push('Ideal for boating, paddling, and fishing.');
      break;
    case 'building':
      lines.push(`Conditions building — ${confidence}% thermal probability.`);
      lines.push('Wind may develop. Monitor upstream indicators.');
      break;
    default:
      lines.push('Transitional weather pattern — multiple signals, low convergence.');
      lines.push('Conditions may change. Check back in 30 minutes.');
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push(`⚠ ${conflicts.length} signal conflict${conflicts.length > 1 ? 's' : ''} detected:`);
    for (const c of conflicts) {
      lines.push(`  • ${c.resolution}`);
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
    return regime === 'thermal' || regime === 'north_flow' || regime === 'frontal' || regime === 'building';
  }
  if (calmActivities.includes(activity)) {
    return regime === 'glass' || regime === 'transitional';
  }
  return true;
}
