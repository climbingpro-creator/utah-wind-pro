/**
 * SNOWKITE PREDICTOR — AI-driven wind prediction for snowkite sites
 *
 * Uses historical patterns, real-time upstream data, and a trained
 * regression model to predict wind conditions at Strawberry Reservoir
 * and Skyline Drive.
 *
 * Architecture:
 *   1. PATTERN ENGINE — learned monthly/hourly/directional baselines
 *      from 2+ years of historical Synoptic data
 *   2. UPSTREAM PROPAGATION — watches KSLC, CCPUT, UTMPK for incoming
 *      fronts that propagate to snowkite sites with terrain delay
 *   3. PRESSURE GRADIENT — calculates SLP difference between valley
 *      (Ephraim, Heber) and ridge (Skyline, Currant Creek Peak)
 *   4. ENSEMBLE BLEND — weighted combination of pattern, propagation,
 *      and gradient signals with confidence scoring
 *
 * Output: { speed, gust, direction, confidence, window, quality }
 *         per location per hour for the next 12 hours
 */

const STATION_GROUPS = {
  strawberry: {
    primary:  ['UTCOP', 'UTDAN'],
    ridge:    ['CCPUT', 'DSTU1'],
    south:    ['RVZU1'],
    reference:['UWCU1', 'KSLC'],
  },
  skyline: {
    primary:  ['SKY'],
    ridge:    ['UTESU', 'UTMPK'],
    valley:   ['UTHTP', 'EPMU1'],
    reference:['KSLC'],
  },
};

const LOCATION_TO_GROUP = {
  'strawberry-ladders': 'strawberry',
  'strawberry-bay':     'strawberry',
  'strawberry-soldier': 'strawberry',
  'strawberry-view':    'strawberry',
  'strawberry-river':   'strawberry',
  'skyline-drive':      'skyline',
};

const LOCATION_PRIMARY = {
  'strawberry-ladders': 'UTCOP',
  'strawberry-bay':     'UTCOP',
  'strawberry-soldier': 'RVZU1',
  'strawberry-view':    'UTCOP',
  'strawberry-river':   'UTCOP',
  'skyline-drive':      'SKY',
};

const PROPAGATION_DELAYS = {
  'KSLC→strawberry':   { minHours: 2, maxHours: 4, attenuation: 0.65 },
  'CCPUT→strawberry':  { minHours: 0.5, maxHours: 1.5, attenuation: 0.42 },
  'KSLC→skyline':      { minHours: 3, maxHours: 5, attenuation: 0.55 },
  'UTMPK→skyline':     { minHours: 0.3, maxHours: 1, attenuation: 0.29 },
};

const SNOWKITE_THRESHOLDS = {
  ideal:   { min: 12, max: 25, gustFactor: 1.4 },
  kiteable:{ min: 8, max: 35, gustFactor: 1.8 },
  epic:    { min: 15, max: 22, gustFactor: 1.3 },
};

import snowkiteModel from '../config/snowkiteModel.json';

let _patterns = snowkiteModel?.stations || null;
let _model = snowkiteModel || null;

export function loadPatterns(patternsJson) {
  _patterns = patternsJson;
}

export function getHistoricalBaseline(stid, month, hour) {
  if (!_patterns || !_patterns[stid]) return null;
  const p = _patterns[stid];
  const monthKey = String(month).padStart(2, '0');
  const hourData = p.byHour?.[String(hour)];
  const monthData = p.byMonth?.[monthKey];

  if (!monthData && !hourData) return null;

  return {
    monthAvgSpeed: monthData?.avg || 0,
    monthPctStrong: monthData?.pct10 || 0,
    monthDominantDir: monthData?.dir,
    hourAvgSpeed: hourData?.avg || 0,
    hourPctStrong: hourData?.pct10 || 0,
    snowkiteDaysInPeriod: p.snowkiteDays || 0,
  };
}

export function getPropagationModel(route) {
  return _model?.propagationModel?.[route] || null;
}

export function getSnowkiteWindow(locationId) {
  return _model?.snowkiteWindows?.[locationId] || null;
}

export function getCorrelation(route) {
  return _model?.correlations?.[route] || null;
}

export function calculatePressureGradient(stationReadings, group) {
  const groupCfg = STATION_GROUPS[group];
  if (!groupCfg) return null;

  const ridgeStations = groupCfg.ridge || [];
  const valleyStations = group === 'skyline' ? groupCfg.valley : groupCfg.reference;

  let ridgePressure = null;
  let valleyPressure = null;

  for (const stid of ridgeStations) {
    const reading = stationReadings[stid];
    if (reading?.pressure) { ridgePressure = reading.pressure; break; }
  }
  for (const stid of valleyStations) {
    const reading = stationReadings[stid];
    if (reading?.pressure) { valleyPressure = reading.pressure; break; }
  }

  if (ridgePressure == null || valleyPressure == null) return null;

  const gradient = valleyPressure - ridgePressure;
  const strength = Math.abs(gradient);

  return {
    gradient,
    strength,
    direction: gradient > 0 ? 'valley-to-ridge' : 'ridge-to-valley',
    windLikely: strength > 2,
    strongWindLikely: strength > 4,
  };
}

export function detectUpstreamSignal(stationReadings, locationId) {
  const group = LOCATION_TO_GROUP[locationId];
  if (!group) return null;

  const signals = [];

  for (const [route, cfg] of Object.entries(PROPAGATION_DELAYS)) {
    const [upstream, target] = route.split('→');
    if (target !== group) continue;

    const reading = stationReadings[upstream];
    if (!reading?.speed || reading.speed < 5) continue;

    const arrivalHoursMin = cfg.minHours;
    const arrivalHoursMax = cfg.maxHours;
    const expectedSpeed = reading.speed * cfg.attenuation;
    const expectedGust = (reading.gust || reading.speed) * cfg.attenuation;

    signals.push({
      source: upstream,
      currentSpeed: reading.speed,
      currentDir: reading.direction,
      expectedSpeed: Math.round(expectedSpeed * 10) / 10,
      expectedGust: Math.round(expectedGust * 10) / 10,
      arrivalWindow: { min: arrivalHoursMin, max: arrivalHoursMax },
      confidence: reading.speed > 15 ? 0.8 : reading.speed > 10 ? 0.6 : 0.4,
    });
  }

  return signals.length > 0 ? signals : null;
}

export function predictSnowkiteConditions(locationId, stationReadings, forecastData) {
  const group = LOCATION_TO_GROUP[locationId];
  const primaryStid = LOCATION_PRIMARY[locationId];
  if (!group || !primaryStid) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentHour = now.getHours();

  const currentReading = stationReadings[primaryStid];
  const baseline = _patterns ? getHistoricalBaseline(primaryStid, currentMonth, currentHour) : null;
  const gradient = calculatePressureGradient(stationReadings, group);
  const upstream = detectUpstreamSignal(stationReadings, locationId);

  const currentSpeed = currentReading?.speed || 0;
  const currentGust = currentReading?.gust || currentSpeed;
  const currentDir = currentReading?.direction;

  let predictedSpeed = currentSpeed;
  let confidence = 0;
  let method = 'current';

  if (currentSpeed > 3) {
    predictedSpeed = currentSpeed;
    confidence = 0.9;
    method = 'live';
  }

  if (baseline) {
    const histWeight = currentSpeed > 3 ? 0.2 : 0.6;
    const liveWeight = 1 - histWeight;
    predictedSpeed = (predictedSpeed * liveWeight) + (baseline.hourAvgSpeed * histWeight);
    confidence = Math.max(confidence, 0.5);
    method = currentSpeed > 3 ? 'live+history' : 'history';
  }

  if (gradient?.windLikely && currentSpeed < 8) {
    const gradientBoost = gradient.strength * 0.8;
    predictedSpeed = Math.max(predictedSpeed, predictedSpeed + gradientBoost);
    confidence = Math.max(confidence, 0.6);
    method += '+gradient';
  }

  if (upstream && upstream.length > 0) {
    const bestSignal = upstream.sort((a, b) => b.confidence - a.confidence)[0];
    if (bestSignal.expectedSpeed > predictedSpeed) {
      const upstreamWeight = bestSignal.confidence * 0.4;
      predictedSpeed = predictedSpeed * (1 - upstreamWeight) + bestSignal.expectedSpeed * upstreamWeight;
      confidence = Math.max(confidence, bestSignal.confidence);
      method += '+upstream';
    }
  }

  if (forecastData?.hourly) {
    const fcst = forecastData.hourly.find(h => {
      const fh = new Date(h.time);
      return Math.abs(fh.getTime() - now.getTime()) < 3600000;
    });
    if (fcst?.windSpeed) {
      const fcstWeight = confidence > 0.7 ? 0.15 : 0.35;
      predictedSpeed = predictedSpeed * (1 - fcstWeight) + fcst.windSpeed * fcstWeight;
      method += '+forecast';
    }
  }

  predictedSpeed = Math.round(predictedSpeed * 10) / 10;

  const gustFactor = currentGust > 0 && currentSpeed > 0 ? currentGust / currentSpeed : 1.3;
  const predictedGust = Math.round(predictedSpeed * gustFactor * 10) / 10;

  const quality = scoreSnowkiteQuality(predictedSpeed, predictedGust, currentDir, gustFactor);
  const window = predictWindow(locationId, stationReadings, baseline, currentHour);

  return {
    locationId,
    station: primaryStid,
    stationName: stationReadings[primaryStid]?.name || primaryStid,
    timestamp: now.toISOString(),
    current: {
      speed: currentSpeed,
      gust: currentGust,
      direction: currentDir,
      temp: currentReading?.temp,
    },
    predicted: {
      speed: predictedSpeed,
      gust: predictedGust,
      direction: currentDir,
      confidence: Math.round(confidence * 100),
      method,
    },
    quality,
    window,
    gradient,
    upstream,
    baseline,
  };
}

function scoreSnowkiteQuality(speed, gust, direction, gustFactor) {
  if (speed < 5) return { score: 0, label: 'No Wind', emoji: '🏔️', color: 'gray' };

  let score = 0;

  if (speed >= 15 && speed <= 22) score += 40;
  else if (speed >= 12 && speed <= 25) score += 30;
  else if (speed >= 8 && speed <= 30) score += 20;
  else if (speed >= 5) score += 10;
  else score += 5;

  if (gustFactor <= 1.3) score += 30;
  else if (gustFactor <= 1.5) score += 20;
  else if (gustFactor <= 1.8) score += 10;

  if (speed >= 8 && speed <= 35 && gustFactor <= 1.8) score += 20;

  if (gust > 40) score = Math.min(score, 30);
  if (gustFactor > 2.0) score = Math.max(0, score - 20);

  score = Math.min(100, Math.max(0, score));

  let label, emoji, color;
  if (score >= 80) { label = 'EPIC'; emoji = '🔥'; color = 'green'; }
  else if (score >= 60) { label = 'Great'; emoji = '💨'; color = 'emerald'; }
  else if (score >= 40) { label = 'Good'; emoji = '✅'; color = 'cyan'; }
  else if (score >= 20) { label = 'Marginal'; emoji = '⚠️'; color = 'yellow'; }
  else { label = 'Poor'; emoji = '❌'; color = 'red'; }

  return { score, label, emoji, color };
}

function predictWindow(locationId, stationReadings, baseline, currentHour) {
  const modelWindow = _model?.snowkiteWindows?.[locationId];

  const windowStart = modelWindow?.dailyPeakStart || 10;
  const windowEnd = modelWindow?.dailyPeakEnd || 16;
  const peakHours = modelWindow?.peakHours || [];

  const isInWindow = currentHour >= windowStart && currentHour <= windowEnd;
  const hoursUntilWindow = currentHour < windowStart ? windowStart - currentHour : 0;
  const hoursRemaining = currentHour <= windowEnd ? windowEnd - currentHour : 0;

  return {
    start: windowStart,
    end: windowEnd,
    peakHours,
    bestMonths: modelWindow?.bestMonths || [],
    isInWindow,
    hoursUntilWindow,
    hoursRemaining,
    historicalPctStrong: baseline?.hourPctStrong || 0,
  };
}

export function getAllSnowkitePredictions(stationReadings, forecastData) {
  const predictions = {};
  for (const locationId of Object.keys(LOCATION_TO_GROUP)) {
    predictions[locationId] = predictSnowkiteConditions(locationId, stationReadings, forecastData);
  }
  return predictions;
}

export function getBestSnowkiteSpot(stationReadings, forecastData) {
  const predictions = getAllSnowkitePredictions(stationReadings, forecastData);
  let best = null;
  let bestScore = -1;

  for (const [id, pred] of Object.entries(predictions)) {
    if (pred && pred.quality.score > bestScore) {
      bestScore = pred.quality.score;
      best = { locationId: id, ...pred };
    }
  }

  return best;
}

export function getSnowkiteOutlook(stationReadings) {
  const predictions = getAllSnowkitePredictions(stationReadings, null);
  const now = new Date();
  const month = now.getMonth() + 1;

  const isSnowSeason = month >= 11 || month <= 4;

  const activeSpots = Object.entries(predictions)
    .filter(([, p]) => p && p.quality.score >= 40)
    .sort((a, b) => b[1].quality.score - a[1].quality.score);

  const upcomingSignals = Object.entries(predictions)
    .filter(([, p]) => p?.upstream?.length > 0)
    .map(([id, p]) => ({
      locationId: id,
      signal: p.upstream[0],
      arrivalIn: p.upstream[0].arrivalWindow,
    }));

  let mood;
  if (activeSpots.length >= 3 && activeSpots[0][1].quality.score >= 80) mood = 'epic';
  else if (activeSpots.length >= 1) mood = 'good';
  else if (upcomingSignals.length > 0) mood = 'building';
  else mood = 'calm';

  return {
    isSnowSeason,
    mood,
    activeSpots: activeSpots.map(([id, p]) => ({
      locationId: id,
      quality: p.quality,
      predicted: p.predicted,
      window: p.window,
    })),
    upcomingSignals,
    totalStationsReporting: Object.keys(stationReadings).length,
  };
}

export default {
  loadPatterns,
  getHistoricalBaseline,
  getPropagationModel,
  getSnowkiteWindow,
  getCorrelation,
  calculatePressureGradient,
  detectUpstreamSignal,
  predictSnowkiteConditions,
  getAllSnowkitePredictions,
  getBestSnowkiteSpot,
  getSnowkiteOutlook,
};
