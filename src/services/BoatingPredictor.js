/**
 * BOATING / GLASS DAY PREDICTOR — Learned Model
 * 
 * Trained on 4,984 hourly observations from 2025.
 * Predicts glass windows and calm conditions for boaters, paddlers, and water skiers.
 * 
 * Key insights from backtest:
 *   - 5-7 AM is consistently the calmest window
 *   - Evening calm returns 6-8 PM (thermal dies)
 *   - Flat pressure gradient (|SLC - Provo| < 0.3) = best calm-day predictor
 *   - October-November have highest glass rates
 *   - Summer thermal hours (11 AM - 4 PM) are lowest probability of calm
 */

import boatWeightsData from '../config/trainedWeights-boating.json';

let learnedWeights = null;

export function setBoatingLearnedWeights(weights) {
  if (weights?.activity === 'boating') {
    learnedWeights = weights;
    console.log('🚤 BoatingPredictor: loaded learned weights v' + (weights.version || '?'));
  }
}

function getWeights() {
  return learnedWeights || boatWeightsData?.weights || {};
}

/**
 * Predict glass/calm conditions.
 * Returns probability, glass window forecast, and wave estimate.
 */
export function predictGlass(windData, pressureData = {}) {
  const w = getWeights();
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;

  const currentSpeed = windData?.speed ?? windData?.windSpeed ?? null;
  const currentGust = windData?.gust ?? windData?.windGust ?? null;
  const slcPressure = pressureData?.slcPressure;
  const provoPressure = pressureData?.provoPressure;
  const gradient = pressureData?.gradient;

  let probability = 40;

  // Current wind: strongest signal
  if (currentSpeed != null) {
    if (currentSpeed <= 2) probability += 35;
    else if (currentSpeed <= 5) probability += 22;
    else if (currentSpeed <= 8) probability += 8;
    else if (currentSpeed <= 12) probability -= 8;
    else probability -= 25;
  }

  // Pressure gradient: flat = calm day
  if (gradient != null) {
    const absGradient = Math.abs(gradient);
    if (absGradient <= 0.3) probability += 20;
    else if (absGradient <= 0.8) probability += 10;
    else if (absGradient <= 1.5) probability -= 5;
    else probability -= 18;
  } else if (slcPressure != null && provoPressure != null) {
    const grad = Math.abs(slcPressure - provoPressure);
    if (grad <= 0.3) probability += 20;
    else if (grad <= 0.8) probability += 10;
    else if (grad <= 1.5) probability -= 5;
    else probability -= 18;
  }

  // Time of day from learned hourly multipliers
  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  probability *= hourlyMult;

  // Monthly seasonal adjustment
  const monthKey = String(month).padStart(2, '0');
  const monthlyRate = w.monthlyQualityRates?.[monthKey] || 0.03;
  const rates = Object.values(w.monthlyQualityRates || {});
  const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0.03;
  const seasonalMult = avgRate > 0 ? Math.min(1.4, Math.max(0.6, monthlyRate / avgRate)) : 1.0;
  probability *= seasonalMult;

  // Apply probability calibration conservatively (blend with raw)
  const bucket = Math.floor(Math.max(0, probability) / 20) * 20;
  const calKey = `${bucket}-${bucket + 20}`;
  const calMult = w.probabilityCalibration?.[calKey] || 1.0;
  probability = probability * 0.6 + probability * calMult * 0.4;

  probability = Math.min(95, Math.max(0, probability));

  // Wave estimate from current conditions
  let waveEstimate = 'unknown';
  let waveLabel = '';
  if (currentSpeed != null) {
    if (currentSpeed <= 2) { waveEstimate = 'flat'; waveLabel = 'Perfect glass — mirror surface'; }
    else if (currentSpeed <= 5) { waveEstimate = 'ripples'; waveLabel = 'Near-glass — light ripples'; }
    else if (currentSpeed <= 8) { waveEstimate = 'light_chop'; waveLabel = 'Light chop — good for most boats'; }
    else if (currentSpeed <= 12) { waveEstimate = 'moderate'; waveLabel = 'Moderate chop — waves developing'; }
    else if (currentSpeed <= 18) { waveEstimate = 'choppy'; waveLabel = 'Choppy — small boats take caution'; }
    else if (currentSpeed <= 25) { waveEstimate = 'rough'; waveLabel = 'Rough — stay near shore'; }
    else { waveEstimate = 'dangerous'; waveLabel = 'Dangerous — stay off the water'; }
  }

  // Gust impact
  const gustFactor = (currentGust != null && currentSpeed > 0) ? currentGust / currentSpeed : 1.0;
  if (gustFactor > 1.3 && currentSpeed > 5) {
    probability *= 0.85;
    waveLabel += ' (gusty)';
  }

  // Glass window prediction from historical patterns
  const glassWindow = w.glassWindowByHour || {};
  let bestWindowStart = null, bestWindowEnd = null, bestWindowAvgSpeed = null;

  const sortedHours = Object.entries(glassWindow)
    .filter(([, data]) => data.avgSpeed < 8)
    .sort((a, b) => a[1].avgSpeed - b[1].avgSpeed);

  if (sortedHours.length > 0) {
    const calmHours = sortedHours.map(([h]) => parseInt(h)).sort((a, b) => a - b);
    bestWindowStart = calmHours[0];
    bestWindowEnd = calmHours[calmHours.length - 1];
    bestWindowAvgSpeed = sortedHours[0][1].avgSpeed;
  }

  const isInGlassWindow = glassWindow[hour]?.avgSpeed < 8;

  return {
    probability: Math.round(probability),
    waveEstimate,
    waveLabel,
    gustFactor: +gustFactor.toFixed(2),
    glassWindow: {
      start: bestWindowStart != null ? formatHour(bestWindowStart) : null,
      end: bestWindowEnd != null ? formatHour(bestWindowEnd) : null,
      avgSpeed: bestWindowAvgSpeed,
      isCurrentlyInWindow: isInGlassWindow,
    },
    isGlass: currentSpeed != null && currentSpeed <= 3 && gustFactor <= 1.2,
    isCalm: currentSpeed != null && currentSpeed <= 8,
    seasonalMult: +seasonalMult.toFixed(2),
    hourlyMult: +hourlyMult.toFixed(2),
    isUsingLearnedWeights: !!learnedWeights || !!boatWeightsData?.weights,
    weightsVersion: (learnedWeights || boatWeightsData?.weights)?.version || 'default',
    recommendation: getBoatingRec(probability, currentSpeed, waveEstimate, hour, isInGlassWindow),
  };
}

function getBoatingRec(prob, speed, wave, hour, inWindow) {
  if (wave === 'flat' || wave === 'ripples') return 'Glass conditions now — perfect for water sports!';
  if (wave === 'light_chop' && prob >= 50) return 'Light chop — good for powerboats and cruising.';
  if (wave === 'moderate' && hour < 8) return 'Morning calm fading. Best window was earlier.';
  if (wave === 'moderate' && hour >= 18) return 'Wind dying down. Glass conditions may return soon.';
  if (wave === 'choppy' || wave === 'rough') {
    if (hour < 6) return 'Unusually windy for early morning. Check back later.';
    if (hour >= 17) return 'Wind should ease in the next 1-2 hours.';
    return 'Too choppy for comfort. Wait for evening calm.';
  }
  if (wave === 'dangerous') return 'Stay off the water. Dangerous conditions.';
  if (prob >= 55 && !inWindow) return 'Calm conditions likely — pressure gradient is flat.';
  return 'Standard conditions. Early morning and late evening are typically calmest.';
}

function formatHour(h) {
  if (h === 0 || h === 12) return h === 0 ? '12 AM' : '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}
