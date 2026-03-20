/**
 * FISHING PREDICTOR — Learned Model
 * 
 * Trained on 4,984 hourly observations from 2025.
 * Predicts fishing quality based on pressure, moon phase, wind, temperature, and time.
 * 
 * Key insights from backtest:
 *   - New Moon produces 51% quality rate (vs 26-35% for other phases)
 *   - Slowly falling pressure → 50% quality rate (pre-storm feeding frenzy)
 *   - Dawn (5-7 AM) → 70% quality rate
 *   - Dusk (5-7 PM) → 47% quality rate
 *   - October-November → 46-48% quality rate (peak season)
 *   - Light wind (3-8 mph) is IDEAL — oxygenates water, creates chop cover
 *   - Stable or slowly falling barometric pressure is the #1 predictor
 */

import fishWeightsData from '../config/trainedWeights-fishing.json';
import { safeToFixed } from '../utils/safeToFixed';

let learnedWeights = null;

export function setFishingLearnedWeights(weights) {
  learnedWeights = weights;
  console.log('FishingPredictor: loaded learned weights v' + (weights.version || '?'));
}

function getWeights() {
  return learnedWeights || fishWeightsData?.weights || {};
}

// ─── MOON PHASE (same as backtest) ──────────────────────────────

function getMoonPhase(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;

  const phase = ((JD - 2451550.1) / 29.530588853) % 1;
  const normalizedPhase = phase < 0 ? phase + 1 : phase;

  let name, rating;
  if (normalizedPhase < 0.0625 || normalizedPhase >= 0.9375) { name = 'New Moon'; rating = 5; }
  else if (normalizedPhase < 0.1875) { name = 'Waxing Crescent'; rating = 3; }
  else if (normalizedPhase < 0.3125) { name = 'First Quarter'; rating = 4; }
  else if (normalizedPhase < 0.4375) { name = 'Waxing Gibbous'; rating = 3; }
  else if (normalizedPhase < 0.5625) { name = 'Full Moon'; rating = 5; }
  else if (normalizedPhase < 0.6875) { name = 'Waning Gibbous'; rating = 3; }
  else if (normalizedPhase < 0.8125) { name = 'Last Quarter'; rating = 4; }
  else { name = 'Waning Crescent'; rating = 3; }

  return { phase: +normalizedPhase.toFixed(3), name, rating };
}

// ─── SOLUNAR PERIODS ────────────────────────────────────────────

function getSolunarPeriods(date = new Date()) {
  const moon = getMoonPhase(date);

  // Major periods center on moon transit; approximated from lunar position
  const moonHourOffset = Math.round(moon.phase * 24) % 24;

  const majorRise = (moonHourOffset + 0) % 24;
  const majorSet = (moonHourOffset + 12) % 24;
  const minorRise = (moonHourOffset + 6) % 24;
  const minorSet = (moonHourOffset + 18) % 24;

  return {
    major: [
      { start: majorRise, end: (majorRise + 2) % 24, label: 'Major' },
      { start: majorSet, end: (majorSet + 2) % 24, label: 'Major' },
    ],
    minor: [
      { start: minorRise, end: (minorRise + 1) % 24, label: 'Minor' },
      { start: minorSet, end: (minorSet + 1) % 24, label: 'Minor' },
    ],
    moon,
  };
}

function isInSolunarPeriod(hour, periods) {
  for (const period of [...periods.major, ...periods.minor]) {
    if (hour >= period.start && hour < period.end) {
      return period.label;
    }
    if (period.end < period.start && (hour >= period.start || hour < period.end)) {
      return period.label;
    }
  }
  return null;
}

// ─── PRESSURE TREND ANALYSIS ────────────────────────────────────

function analyzePressureTrend(currentPressure, pressureHistory = []) {
  if (!currentPressure) return { trend: 'unknown', rate: 0, label: 'No pressure data' };

  if (pressureHistory.length >= 2) {
    const oldest = pressureHistory[0];
    const hours = pressureHistory.length;
    const change = currentPressure - oldest;
    const ratePerHour = change / hours;

    if (ratePerHour < -0.02) return { trend: 'falling_fast', rate: ratePerHour, label: 'Falling rapidly — fish feeding before storm!' };
    if (ratePerHour < -0.005) return { trend: 'falling_slow', rate: ratePerHour, label: 'Slowly falling — excellent fishing!' };
    if (ratePerHour <= 0.005) return { trend: 'stable', rate: ratePerHour, label: 'Stable — consistent fishing conditions' };
    if (ratePerHour <= 0.02) return { trend: 'rising_slow', rate: ratePerHour, label: 'Slowly rising — fish adjusting' };
    return { trend: 'rising_fast', rate: ratePerHour, label: 'Rising fast — post-front lull, slow fishing' };
  }

  // Infer from gradient
  if (currentPressure >= 29.8 && currentPressure <= 30.2) {
    return { trend: 'stable', rate: 0, label: 'Pressure in optimal range' };
  }
  if (currentPressure < 29.7) return { trend: 'falling_slow', rate: -0.01, label: 'Low pressure — fish may be active' };
  return { trend: 'rising_slow', rate: 0.01, label: 'High pressure — slow fishing likely' };
}

// ─── MAIN PREDICTION ────────────────────────────────────────────

export function predictFishing(windData = {}, pressureData = {}, options = {}) {
  const w = getWeights();
  const now = options.date ? new Date(options.date) : new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;

  const windSpeed = windData?.speed ?? windData?.windSpeed ?? null;
  const windGust = windData?.gust ?? windData?.windGust ?? null;
  const temperature = windData?.temperature ?? windData?.temp ?? options.temperature ?? null;

  const pressure = pressureData?.slcPressure ?? pressureData?.pressure ?? null;
  const pressureHistory = pressureData?.pressureHistory || [];

  const moonPhase = getMoonPhase(now);
  const solunar = getSolunarPeriods(now);
  const pressureTrend = analyzePressureTrend(pressure, pressureHistory);
  const solunarPeriod = isInSolunarPeriod(hour, solunar);

  let probability = 35;

  // Moon phase impact (backtest: New Moon = 51%, others = 26-35%)
  const moonMult = w.moonPhaseMultipliers?.[moonPhase.name] || 1.0;
  probability += (moonPhase.rating - 3) * 5 * moonMult;

  // Pressure trend (backtest: falling_slow = 50% quality, stable = 49%)
  const presMult = w.pressureTrendMultipliers?.[pressureTrend.trend] || 1.0;
  if (pressureTrend.trend === 'falling_slow') probability += 15 * presMult;
  else if (pressureTrend.trend === 'falling_fast') probability += 10 * presMult;
  else if (pressureTrend.trend === 'stable') probability += 8 * presMult;
  else if (pressureTrend.trend === 'rising_slow') probability += 0;
  else if (pressureTrend.trend === 'rising_fast') probability -= 5;

  // Absolute pressure in optimal range
  if (pressure != null) {
    if (pressure >= 29.80 && pressure <= 30.20) probability += 8;
    else if (pressure >= 29.50) probability += 4;
  }

  // Wind: light wind is ideal for fishing
  if (windSpeed != null) {
    if (windSpeed >= 3 && windSpeed <= 8) probability += 12;
    else if (windSpeed <= 3) probability += 6;
    else if (windSpeed <= 12) probability += 3;
    else if (windSpeed <= 18) probability -= 5;
    else probability -= 12;
  }

  // Time of day — golden hours (backtest: 5-7 AM = 70%, 5-7 PM = 47%)
  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) probability += 12;
  else if ((hour >= 4 && hour <= 9) || (hour >= 16 && hour <= 20)) probability += 6;
  else if (hour >= 10 && hour <= 15) probability -= 5;
  probability *= hourlyMult;

  // Solunar period bonus
  if (solunarPeriod === 'Major') probability += 8;
  else if (solunarPeriod === 'Minor') probability += 4;

  // Temperature proxy for water temp
  if (temperature != null) {
    const estWaterTemp = temperature * 0.7 + 20;
    if (estWaterTemp >= 50 && estWaterTemp <= 68) probability += 8;
    else if (estWaterTemp >= 42 && estWaterTemp <= 75) probability += 4;
    else probability -= 3;
  }

  // Monthly seasonal adjustment (backtest: Oct-Nov peak)
  const monthKey = String(month).padStart(2, '0');
  const monthlyRate = w.monthlyQualityRates?.[monthKey] || 0.03;
  const rates = Object.values(w.monthlyQualityRates || {});
  const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0.03;
  const seasonalMult = avgRate > 0 ? Math.min(1.3, Math.max(0.7, monthlyRate / avgRate)) : 1.0;
  probability *= seasonalMult;

  probability = Math.min(95, Math.max(0, probability));

  // Activity rating
  let activityLevel, activityLabel;
  if (probability >= 75) { activityLevel = 'very_high'; activityLabel = 'Fish very active — get out there!'; }
  else if (probability >= 60) { activityLevel = 'high'; activityLabel = 'Fish active — good conditions'; }
  else if (probability >= 45) { activityLevel = 'moderate'; activityLabel = 'Moderate activity — patience rewarded'; }
  else if (probability >= 30) { activityLevel = 'low'; activityLabel = 'Slow fishing — try structure and deep water'; }
  else { activityLevel = 'very_low'; activityLabel = 'Very slow — tough conditions'; }

  // Best times today
  const bestTimes = [];
  for (let h = 4; h <= 21; h++) {
    const hMult = w.hourlyMultipliers?.[h] || 1.0;
    if (hMult >= 1.2) bestTimes.push(formatHour(h));
  }

  return {
    probability: Math.round(probability),
    activityLevel,
    activityLabel,
    moonPhase,
    solunar: {
      ...solunar,
      currentPeriod: solunarPeriod,
    },
    pressureTrend,
    windImpact: windSpeed != null
      ? (windSpeed <= 8 ? 'ideal' : windSpeed <= 15 ? 'moderate' : 'negative')
      : 'unknown',
    bestTimesToday: bestTimes,
    seasonalMult: +seasonalMult.toFixed(2),
    hourlyMult: +hourlyMult.toFixed(2),
    isGoldenHour: (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19),
    recommendation: getRecommendation(probability, pressureTrend, moonPhase, hour, windSpeed, solunarPeriod),
    isUsingLearnedWeights: !!learnedWeights || !!fishWeightsData?.weights,
    weightsVersion: (learnedWeights || fishWeightsData?.weights)?.version || 'default',
    factors: buildFactors(moonPhase, pressureTrend, windSpeed, hour, temperature, solunarPeriod),
  };
}

function getRecommendation(prob, pressure, moon, hour, wind, solunar) {
  const parts = [];

  if (prob >= 70) parts.push('Excellent fishing conditions');
  else if (prob >= 55) parts.push('Good fishing day');
  else if (prob >= 40) parts.push('Fair conditions');
  else parts.push('Tough fishing today');

  if (pressure.trend === 'falling_slow' || pressure.trend === 'falling_fast') {
    parts.push('— pressure falling, fish are feeding.');
  } else if (pressure.trend === 'rising_fast') {
    parts.push('— post-front, try deep structure.');
  }

  if (moon.rating >= 5) parts.push(`${moon.name} boost!`);
  if (solunar === 'Major') parts.push('Major solunar period active.');
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) parts.push('Golden hour window.');

  if (wind != null && wind > 15) parts.push('Wind is strong — fish sheltered spots.');

  return parts.join(' ');
}

function buildFactors(moon, pressure, wind, hour, temp, solunar) {
  const factors = [];

  factors.push({
    name: 'Moon Phase',
    value: moon.name,
    rating: moon.rating,
    impact: moon.rating >= 5 ? 'positive' : moon.rating >= 4 ? 'neutral' : 'slightly_negative',
  });

  factors.push({
    name: 'Pressure',
    value: pressure.label,
    rating: pressure.trend === 'falling_slow' ? 5 : pressure.trend === 'stable' ? 4
      : pressure.trend === 'falling_fast' ? 4 : pressure.trend === 'rising_slow' ? 2 : 1,
    impact: (pressure.trend === 'falling_slow' || pressure.trend === 'stable') ? 'positive'
      : pressure.trend === 'rising_fast' ? 'negative' : 'neutral',
  });

  const isGolden = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
  factors.push({
    name: 'Time of Day',
    value: isGolden ? 'Golden Hour' : (hour >= 10 && hour <= 15) ? 'Midday (slow)' : 'Moderate',
    rating: isGolden ? 5 : (hour >= 10 && hour <= 15) ? 2 : 3,
    impact: isGolden ? 'positive' : (hour >= 10 && hour <= 15) ? 'negative' : 'neutral',
  });

  if (wind != null) {
    factors.push({
      name: 'Wind',
      value: `${safeToFixed(wind, 0)} mph`,
      rating: (wind >= 3 && wind <= 8) ? 5 : wind <= 3 ? 3 : wind <= 15 ? 3 : 1,
      impact: (wind >= 3 && wind <= 8) ? 'positive' : wind > 15 ? 'negative' : 'neutral',
    });
  }

  if (solunar) {
    factors.push({
      name: 'Solunar',
      value: `${solunar} Period Active`,
      rating: solunar === 'Major' ? 5 : 4,
      impact: 'positive',
    });
  }

  return factors;
}

function formatHour(h) {
  if (h === 0 || h === 12) return h === 0 ? '12 AM' : '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

// Export the moon/solunar helpers for use by FishingMode
export { getMoonPhase, getSolunarPeriods, analyzePressureTrend };
