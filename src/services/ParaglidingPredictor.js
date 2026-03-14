/**
 * PARAGLIDING PREDICTOR — Learned Model
 * 
 * Uses historically trained weights (2025 backtest of 7,624 hourly observations)
 * to predict flyability for Point of the Mountain south and north sides.
 * 
 * The learning system continuously refines these weights in production.
 * 
 * Indicator chain:
 *   SOUTH: KPVU S (thermal) → UTOLY confirm → FPS ground truth
 *   NORTH: KSLC N (30-60 min lead) → UTOLY confirm → FPS switch → UTALP ground truth
 */

import pgWeightsData from '../config/trainedWeights-paragliding.json';

let learnedWeights = null;

export function setParaglidingLearnedWeights(weights) {
  learnedWeights = weights;
  console.log('ParaglidingPredictor: loaded learned weights v' + (weights.version || '?'));
}

function getWeights() {
  return learnedWeights || pgWeightsData?.weights || {};
}

/**
 * Predict south side (FPS) flyability.
 * Driven by thermal cycle — KPVU S wind is the primary indicator.
 */
export function predictSouth(windData, conditions = {}) {
  const w = getWeights();
  const fps = windData?.FPS || {};
  const kslc = windData?.KSLC || {};
  const kpvu = windData?.KPVU || {};
  const utoly = windData?.UTOLY || {};
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;

  let probability = 30;

  // Primary indicator: KPVU S wind = thermal cycle active
  const kpvuWeight = w.indicatorWeights?.kpvu_south || 1.0;
  if (kpvu.windDirection != null && kpvu.windSpeed != null) {
    if (kpvu.windDirection >= 140 && kpvu.windDirection <= 220) {
      if (kpvu.windSpeed >= 5 && kpvu.windSpeed <= 15) probability += 25 * kpvuWeight;
      else if (kpvu.windSpeed >= 3) probability += 15 * kpvuWeight;
    } else if (kpvu.windDirection >= 315 || kpvu.windDirection <= 45) {
      probability -= 20;
    }
  }

  // Negative: KSLC strong N = front overriding thermal
  const kslcWeight = w.indicatorWeights?.kslc_north || 1.0;
  if (kslc.windDirection != null && kslc.windSpeed != null) {
    if ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 12) {
      probability -= 25 * kslcWeight;
    } else if ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8) {
      probability -= 10 * kslcWeight;
    } else if (kslc.windDirection >= 140 && kslc.windDirection <= 220 && kslc.windSpeed >= 5) {
      probability += 10;
    }
  }

  // UTOLY valley confirmation
  const utolyWeight = w.indicatorWeights?.utoly_confirm || 0.8;
  if (utoly.windDirection != null && utoly.windSpeed != null) {
    if (utoly.windDirection >= 140 && utoly.windDirection <= 220 && utoly.windSpeed >= 3) {
      probability += 10 * utolyWeight;
    }
  }

  // Pressure gradient: slight negative = thermal draw
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient < -0.5 && gradient > -2.0) probability += 15;
    else if (gradient >= -0.5 && gradient <= 0.5) probability += 5;
    else if (gradient > 2.0) probability -= 20;
  }

  // Temperature: warm = stronger thermal
  const temp = fps.temperature || conditions.temperature;
  if (temp != null && temp >= 75) probability += 10;
  else if (temp != null && temp >= 60) probability += 5;

  // Time of day: south side best 8-11 AM (from backtest)
  if (hour >= 8 && hour <= 10) probability += 12;
  else if (hour >= 10 && hour <= 12) probability += 8;
  else if (hour >= 12 && hour <= 15) probability += 3;

  // Apply learned hourly multiplier
  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  probability *= hourlyMult;

  // Apply learned probability calibration
  const bucket = Math.floor(Math.max(0, probability) / 20) * 20;
  const calKey = `${bucket}-${bucket + 20}`;
  const calMult = w.probabilityCalibration?.[calKey] || 1.0;
  probability *= calMult;

  // Monthly seasonal adjustment
  const monthKey = String(month).padStart(2, '0');
  const monthlyRate = w.monthlyQualityRates?.[monthKey] || 0.03;
  const avgMonthlyRate = 0.035;
  const seasonalAdj = avgMonthlyRate > 0 ? Math.min(1.3, Math.max(0.7, monthlyRate / avgMonthlyRate)) : 1.0;
  probability *= seasonalAdj;

  probability = Math.min(95, Math.max(0, probability));

  // Expected speed
  let expectedSpeed = 0;
  if (kpvu.windSpeed != null && kpvu.windDirection >= 140 && kpvu.windDirection <= 220) {
    expectedSpeed = kpvu.windSpeed * 0.9;
  } else if (fps.windSpeed != null) {
    expectedSpeed = fps.windSpeed;
  }
  expectedSpeed += (w.speedBiasCorrection || 0);
  expectedSpeed = Math.max(0, expectedSpeed);

  // Gust factor forecast
  const profile = w.siteProfiles?.south || {};
  const gustThresholds = w.gustFactorThresholds || {};

  // Current conditions assessment
  const currentSpeed = fps.windSpeed || 0;
  const currentGust = fps.windGust || currentSpeed;
  const currentGF = currentSpeed > 0 ? currentGust / currentSpeed : 1.0;
  const currentDir = fps.windDirection;

  const directionOK = currentDir != null && currentDir >= 140 && currentDir <= 220;
  const speedOK = currentSpeed >= (profile.speedRange?.min || 6) && currentSpeed <= (profile.speedRange?.max || 18);
  const gustOK = currentGF <= (gustThresholds.acceptable || 1.35);
  const flyable = directionOK && speedOK && gustOK;

  let status = 'grounded';
  if (flyable && currentGF <= (gustThresholds.glass || 1.15) && probability >= 60) status = 'epic';
  else if (flyable && currentGF <= (gustThresholds.excellent || 1.25) && probability >= 45) status = 'excellent';
  else if (flyable && probability >= 35) status = 'good';
  else if (directionOK && currentSpeed >= 3 && currentSpeed <= 20) status = 'marginal';

  return {
    site: 'south',
    probability: Math.round(probability),
    expectedSpeed: +expectedSpeed.toFixed(1),
    status,
    flyable,
    currentGustFactor: +currentGF.toFixed(2),
    gustQuality: currentGF <= gustThresholds.glass ? 'glass'
      : currentGF <= gustThresholds.excellent ? 'smooth'
      : currentGF <= gustThresholds.acceptable ? 'acceptable'
      : 'gusty',
    bestHours: profile.bestHours || [8, 9, 10],
    isUsingLearnedWeights: !!learnedWeights || !!pgWeightsData?.weights,
    weightsVersion: w.version || 'default',
    seasonalAdj: +seasonalAdj.toFixed(2),
    hourlyMult: +hourlyMult.toFixed(2),
    indicators: {
      kpvu: kpvu.windSpeed != null ? {
        speed: kpvu.windSpeed,
        direction: kpvu.windDirection,
        signal: (kpvu.windDirection >= 140 && kpvu.windDirection <= 220) ? 'south_active' : 'no_thermal',
      } : null,
      kslc: kslc.windSpeed != null ? {
        speed: kslc.windSpeed,
        direction: kslc.windDirection,
        signal: ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8)
          ? 'north_threat' : 'clear',
      } : null,
    },
  };
}

/**
 * Predict north side (UTALP) flyability.
 * Driven by north flow — KSLC N wind is the primary indicator (30-60 min lead).
 */
export function predictNorth(windData, conditions = {}) {
  const w = getWeights();
  const utalp = windData?.UTALP || {};
  const fps = windData?.FPS || {};
  const kslc = windData?.KSLC || {};
  const kpvu = windData?.KPVU || {};
  const utoly = windData?.UTOLY || {};
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;

  let probability = 20;

  // Primary indicator: KSLC N wind (30-60 min lead)
  const kslcWeight = w.indicatorWeights?.kslc_north || 1.0;
  if (kslc.windDirection != null && kslc.windSpeed != null) {
    if ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8) {
      probability += 30 * kslcWeight;
      if (kslc.windSpeed >= 12) probability += 10 * kslcWeight;
    } else if ((kslc.windDirection >= 300 || kslc.windDirection <= 60) && kslc.windSpeed >= 5) {
      probability += 15 * kslcWeight;
    } else if (kslc.windDirection >= 140 && kslc.windDirection <= 220 && kslc.windSpeed >= 8) {
      probability -= 15;
    }
  }

  // Negative: KPVU strong S = thermal still winning
  const kpvuWeight = w.indicatorWeights?.kpvu_south || 1.0;
  if (kpvu.windDirection != null && kpvu.windSpeed != null) {
    if (kpvu.windDirection >= 140 && kpvu.windDirection <= 220 && kpvu.windSpeed >= 12) {
      probability -= 20 * kpvuWeight;
    } else if ((kpvu.windDirection >= 315 || kpvu.windDirection <= 45) && kpvu.windSpeed >= 5) {
      probability += 15;
    }
  }

  // FPS switch: if south side already went N, north side is imminent
  const fpsSwitchWeight = w.indicatorWeights?.fps_switch || 1.2;
  if (fps.windDirection != null && fps.windSpeed != null) {
    if ((fps.windDirection >= 315 || fps.windDirection <= 45) && fps.windSpeed >= 5) {
      probability += 20 * fpsSwitchWeight;
    }
  }

  // UTOLY valley confirmation
  const utolyWeight = w.indicatorWeights?.utoly_confirm || 0.8;
  if (utoly.windDirection != null && utoly.windSpeed != null) {
    if ((utoly.windDirection >= 315 || utoly.windDirection <= 45) && utoly.windSpeed >= 5) {
      probability += 10 * utolyWeight;
    }
  }

  // Pressure gradient: positive (SLC higher) = north push
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 1.5) probability += 15;
    else if (gradient > 0.5) probability += 8;
    else if (gradient < -1.0) probability -= 10;
  }

  // Time of day: north side best 5-8 PM (glass-off)
  if (hour >= 17 && hour <= 19) probability += 15;
  else if (hour >= 15 && hour <= 20) probability += 10;
  else if (hour >= 13) probability += 5;
  else probability -= 5;

  // Apply learned hourly multiplier
  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  probability *= hourlyMult;

  // Apply probability calibration
  const bucket = Math.floor(Math.max(0, probability) / 20) * 20;
  const calKey = `${bucket}-${bucket + 20}`;
  const calMult = w.probabilityCalibration?.[calKey] || 1.0;
  probability *= calMult;

  // Monthly seasonal adjustment
  const monthKey = String(month).padStart(2, '0');
  const monthlyRate = w.monthlyQualityRates?.[monthKey] || 0.03;
  const avgMonthlyRate = 0.035;
  const seasonalAdj = avgMonthlyRate > 0 ? Math.min(1.3, Math.max(0.7, monthlyRate / avgMonthlyRate)) : 1.0;
  probability *= seasonalAdj;

  probability = Math.min(95, Math.max(0, probability));

  // Expected speed
  let expectedSpeed = 0;
  if (kslc.windSpeed != null && (kslc.windDirection >= 315 || kslc.windDirection <= 45)) {
    expectedSpeed = kslc.windSpeed * 0.85;
  } else if (utalp.windSpeed != null) {
    expectedSpeed = utalp.windSpeed;
  }
  expectedSpeed += (w.speedBiasCorrection || 0);
  expectedSpeed = Math.max(0, expectedSpeed);

  // Current conditions
  const profile = w.siteProfiles?.north || {};
  const gustThresholds = w.gustFactorThresholds || {};

  const currentSpeed = utalp.windSpeed || 0;
  const currentGust = utalp.windGust || currentSpeed;
  const currentGF = currentSpeed > 0 ? currentGust / currentSpeed : 1.0;
  const currentDir = utalp.windDirection;

  const directionOK = currentDir != null && (currentDir >= 300 || currentDir <= 60);
  const speedOK = currentSpeed >= (profile.speedRange?.min || 6) && currentSpeed <= (profile.speedRange?.max || 20);
  const gustOK = currentGF <= (gustThresholds.acceptable || 1.35);
  const flyable = directionOK && speedOK && gustOK;

  let status = 'grounded';
  if (flyable && currentGF <= (gustThresholds.glass || 1.15) && probability >= 60) status = 'epic';
  else if (flyable && currentGF <= (gustThresholds.excellent || 1.25) && probability >= 45) status = 'excellent';
  else if (flyable && probability >= 35) status = 'good';
  else if (directionOK && currentSpeed >= 3 && currentSpeed <= 22) status = 'marginal';

  const isGlassOff = hour >= 17 && hour <= 19 && flyable && currentGF <= 1.2;

  return {
    site: 'north',
    probability: Math.round(probability),
    expectedSpeed: +expectedSpeed.toFixed(1),
    status,
    flyable,
    isGlassOff,
    currentGustFactor: +currentGF.toFixed(2),
    gustQuality: currentGF <= gustThresholds.glass ? 'glass'
      : currentGF <= gustThresholds.excellent ? 'smooth'
      : currentGF <= gustThresholds.acceptable ? 'acceptable'
      : 'gusty',
    bestHours: profile.bestHours || [17, 18, 19],
    isUsingLearnedWeights: !!learnedWeights || !!pgWeightsData?.weights,
    weightsVersion: w.version || 'default',
    seasonalAdj: +seasonalAdj.toFixed(2),
    hourlyMult: +hourlyMult.toFixed(2),
    indicators: {
      kslc: kslc.windSpeed != null ? {
        speed: kslc.windSpeed,
        direction: kslc.windDirection,
        signal: ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8)
          ? 'north_active' : ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 5)
          ? 'north_building' : 'no_signal',
        leadTimeMin: 30,
      } : null,
      fps: fps.windSpeed != null ? {
        speed: fps.windSpeed,
        direction: fps.windDirection,
        signal: ((fps.windDirection >= 315 || fps.windDirection <= 45) && fps.windSpeed >= 5)
          ? 'switched_north' : 'still_south',
      } : null,
      kpvu: kpvu.windSpeed != null ? {
        speed: kpvu.windSpeed,
        direction: kpvu.windDirection,
        signal: (kpvu.windDirection >= 140 && kpvu.windDirection <= 220 && kpvu.windSpeed >= 12)
          ? 'thermal_blocking' : 'clear',
      } : null,
    },
  };
}

/**
 * Full prediction for both sites — called by ParaglidingMode.
 */
export function predictParagliding(windData, conditions = {}) {
  const south = predictSouth(windData, conditions);
  const north = predictNorth(windData, conditions);

  // Wind switch prediction: likelihood of S→N switch in the next 1-3 hours
  let switchLikelihood = 0;
  let switchTimeframe = null;

  const hour = new Date().getHours();
  const kslc = windData?.KSLC || {};
  const fps = windData?.FPS || {};

  // Already switched
  if (north.indicators?.fps?.signal === 'switched_north') {
    switchLikelihood = 90;
    switchTimeframe = 'confirmed';
  }
  // KSLC showing strong N = 30-60 min out
  else if (north.indicators?.kslc?.signal === 'north_active') {
    switchLikelihood = 65;
    switchTimeframe = '30-60 min';
  }
  // KSLC showing building N
  else if (north.indicators?.kslc?.signal === 'north_building') {
    switchLikelihood = 35;
    switchTimeframe = '1-2 hours';
  }
  // Afternoon during thermal season
  else if (hour >= 14 && hour <= 18 && south.probability < 40) {
    switchLikelihood = 25;
    switchTimeframe = '1-3 hours';
  }

  return {
    south,
    north,
    windSwitch: {
      likelihood: switchLikelihood,
      timeframe: switchTimeframe,
      from: 'south',
      to: 'north',
    },
    bestSite: south.probability > north.probability ? 'south' : 'north',
    recommendation: getRecommendation(south, north, switchLikelihood, hour),
  };
}

function getRecommendation(south, north, switchLikelihood, hour) {
  if (south.status === 'epic') return 'Epic south conditions — get airborne!';
  if (north.status === 'epic' || north.isGlassOff) return 'North glass-off happening — legendary conditions!';
  if (south.status === 'excellent') return 'Excellent south flying — smooth thermals.';
  if (north.status === 'excellent') return 'Excellent north conditions — smooth laminar flow.';
  if (south.status === 'good' && switchLikelihood >= 50) {
    return 'South flyable now. Watch for N switch within ' + (switchLikelihood >= 65 ? '30-60 min' : '1-2 hours') + '.';
  }
  if (south.status === 'good') return 'Good south conditions — safe for all levels.';
  if (north.status === 'good') return 'Good north conditions — intermediate+ recommended.';
  if (south.status === 'marginal' && hour < 14) return 'Marginal now. South thermals may improve by mid-morning.';
  if (switchLikelihood >= 40 && hour >= 15) return 'Wait for the switch — north side likely to fire soon.';
  if (south.status === 'marginal') return 'Marginal conditions — advanced pilots only.';
  return 'Currently unflyable. Check back for thermal window.';
}
