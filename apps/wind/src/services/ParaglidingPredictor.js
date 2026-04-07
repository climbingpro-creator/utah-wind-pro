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
 * 
 * CRITICAL: Paragliding requires daylight! No flying after sunset.
 */

import pgWeightsData from '../config/trainedWeights-paragliding.json';

// ─── Daylight Calculation ─────────────────────────────────────
// Paragliding REQUIRES daylight - this is a safety-critical check

function calculateDaylight(lat = 40.45, date = new Date()) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const hour = date.getHours() + date.getMinutes() / 60;
  
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  let cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  cosHourAngle = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
  
  const solarNoon = 12;
  const sunrise = solarNoon - hourAngle / 15;
  const sunset = solarNoon + hourAngle / 15;
  
  const isNight = hour < sunrise - 0.5 || hour > sunset + 0.5;
  const isTwilight = (hour >= sunrise - 0.5 && hour < sunrise) || (hour > sunset && hour <= sunset + 0.5);
  const isDaylight = hour >= sunrise && hour <= sunset;
  const daylightHoursRemaining = isDaylight ? Math.max(0, sunset - hour) : 0;
  
  return { sunrise, sunset, isNight, isTwilight, isDaylight, daylightHoursRemaining };
}

function formatHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

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
  const wuLehi111 = windData?.KUTLEHI111 || {};
  const wuLehi160 = windData?.KUTLEHI160 || {};
  const wuAlpin3 = windData?.KUTALPIN3 || {};
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  
  // ─── DAYLIGHT CHECK — Paragliding requires visibility! ───────
  const daylight = calculateDaylight(40.45); // PotM latitude
  
  if (daylight.isNight) {
    return {
      probability: 0,
      expectedSpeed: 0,
      conditions: 'No flying after dark',
      verdict: `Night — No flying possible. Sunrise at ${formatHour(daylight.sunrise)}`,
      confidence: 100,
      isNight: true,
      hoursUntilSunrise: daylight.sunrise - hour + (hour > 12 ? 24 : 0),
    };
  }
  
  if (daylight.isTwilight) {
    return {
      probability: 5,
      expectedSpeed: 0,
      conditions: 'Twilight — limited visibility',
      verdict: hour < 12 
        ? `Pre-dawn twilight. Flying starts at sunrise (${formatHour(daylight.sunrise)})`
        : `Dusk — pack up. Too dark to fly safely.`,
      confidence: 90,
      isTwilight: true,
    };
  }

  let probability = 30;

  // PotM South ridge faces ~SSW. Soarable window is wide:
  //   110-250° = any wind with a southerly component hitting the ridge
  //   Sweet spot: 140-200° (SSE to SSW)
  //   Marginal but flyable: 110-140° and 200-250°

  // ── FPS GROUND TRUTH — the #1 signal (this IS the on-site sensor) ──
  const fpsWeight = w.indicatorWeights?.fps_ground || 1.3;
  if (fps.windSpeed != null && fps.windDirection != null) {
    const fpsDir = fps.windDirection;
    const fpsSpd = fps.windSpeed;

    // Sweet spot: 135-210° and 5-18 mph = textbook soaring
    if (fpsDir >= 135 && fpsDir <= 210 && fpsSpd >= 5 && fpsSpd <= 18) {
      probability += 30 * fpsWeight;
    }
    // Good: 110-135° or 210-250° still flyable
    else if (fpsDir >= 110 && fpsDir <= 250 && fpsSpd >= 4 && fpsSpd <= 20) {
      probability += 20 * fpsWeight;
    }
    // Marginal: 90-110° or 250-270° (cross-wind)
    else if (fpsDir >= 90 && fpsDir <= 270 && fpsSpd >= 3 && fpsSpd <= 15) {
      probability += 5 * fpsWeight;
    }

    // Low gust factor = smooth air = more flyable
    const gf = fpsSpd > 0 ? (fps.windGust || fpsSpd) / fpsSpd : 2;
    if (gf <= 1.2) probability += 8;
    else if (gf <= 1.35) probability += 3;
    else if (gf > 1.6) probability -= 10;
  }

  // ── KPVU — secondary indicator (thermal cycle in the valley) ──
  const kpvuWeight = w.indicatorWeights?.kpvu_south || 0.8;
  if (kpvu.windDirection != null && kpvu.windSpeed != null) {
    if (kpvu.windDirection >= 120 && kpvu.windDirection <= 250) {
      if (kpvu.windSpeed >= 4 && kpvu.windSpeed <= 15) probability += 15 * kpvuWeight;
      else if (kpvu.windSpeed >= 2) probability += 8 * kpvuWeight;
    } else if (kpvu.windDirection >= 315 || kpvu.windDirection <= 45) {
      probability -= 15;
    }
    // KPVU calm is NOT a negative — PotM thermal is locally driven,
    // KPVU airport is 10 miles south and often lags or misses it
  }

  // ── KSLC — front override detector ──
  const kslcWeight = w.indicatorWeights?.kslc_north || 1.0;
  if (kslc.windDirection != null && kslc.windSpeed != null) {
    if ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 12) {
      probability -= 25 * kslcWeight;
    } else if ((kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8) {
      probability -= 10 * kslcWeight;
    } else if (kslc.windDirection >= 120 && kslc.windDirection <= 240 && kslc.windSpeed >= 4) {
      probability += 8;
    }
  }

  // ── UTOLY — valley floor confirmation (wider window) ──
  const utolyWeight = w.indicatorWeights?.utoly_confirm || 0.7;
  if (utoly.windDirection != null && utoly.windSpeed != null) {
    if (utoly.windDirection >= 90 && utoly.windDirection <= 270 && utoly.windSpeed >= 2) {
      probability += 8 * utolyWeight;
    }
  }

  // ── WU PWS CORROBORATION — nearby neighborhood sensors ──
  let wuSouthCount = 0;
  if (wuLehi111.windSpeed >= 3 && wuLehi111.windDirection >= 110 && wuLehi111.windDirection <= 250) wuSouthCount++;
  if (wuLehi160.windSpeed >= 3 && wuLehi160.windDirection >= 110 && wuLehi160.windDirection <= 250) wuSouthCount++;
  if (wuAlpin3.windSpeed >= 3 && wuAlpin3.windDirection >= 110 && wuAlpin3.windDirection <= 250) wuSouthCount++;
  if (wuSouthCount >= 2) probability += 10;
  else if (wuSouthCount >= 1) probability += 5;

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
  else if (temp != null && temp >= 45) probability += 2;

  // Time of day: south side best 7 AM - 2 PM local (wider window)
  if (hour >= 8 && hour <= 11) probability += 12;
  else if (hour >= 7 || (hour >= 11 && hour <= 14)) probability += 8;
  else if (hour >= 14 && hour <= 16) probability += 3;

  // FPS is the on-site sensor. If it reads flyable, that's ground truth —
  // learned multipliers should adjust the probability but never crush it below
  // what the live sensor confirms.
  const fpsConfirmsFlyable = fps.windSpeed != null && fps.windDirection != null
    && fps.windDirection >= 110 && fps.windDirection <= 250
    && fps.windSpeed >= 5 && fps.windSpeed <= 20;
  const fpsMinFloor = fpsConfirmsFlyable ? 55 : 0;

  // Apply learned hourly multiplier (dampen extremes)
  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  probability *= Math.max(0.6, Math.min(1.5, hourlyMult));

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

  // Ground truth floor: if FPS reads flyable, probability can't drop below floor
  probability = Math.max(fpsMinFloor, probability);
  probability = Math.min(95, Math.max(0, probability));

  // Expected speed — prefer actual FPS reading when available
  let expectedSpeed = 0;
  if (fps.windSpeed != null && fps.windDirection >= 110 && fps.windDirection <= 250) {
    expectedSpeed = fps.windSpeed;
  } else if (kpvu.windSpeed != null && kpvu.windDirection >= 140 && kpvu.windDirection <= 220) {
    expectedSpeed = kpvu.windSpeed * 0.9;
  }
  expectedSpeed += (w.speedBiasCorrection || 0);
  expectedSpeed = Math.max(0, expectedSpeed);

  // Gust factor forecast
  const profile = w.siteProfiles?.south || {};
  const gustThresholds = w.gustFactorThresholds || {};

  // Current conditions assessment — wide soarable window
  const currentSpeed = fps.windSpeed || 0;
  const currentGust = fps.windGust || currentSpeed;
  const currentGF = currentSpeed > 0 ? currentGust / currentSpeed : 1.0;
  const currentDir = fps.windDirection;

  // PotM South soarable: 110-250° (any southerly component on the ridge)
  const directionIdeal = currentDir != null && currentDir >= 135 && currentDir <= 210;
  const directionOK = currentDir != null && currentDir >= 110 && currentDir <= 250;
  const speedOK = currentSpeed >= (profile.speedRange?.min || 5) && currentSpeed <= (profile.speedRange?.max || 20);
  const gustOK = currentGF <= (gustThresholds.acceptable || 1.4);
  const flyable = directionOK && speedOK && gustOK;

  let status = 'grounded';
  if (flyable && directionIdeal && currentGF <= (gustThresholds.glass || 1.15) && probability >= 55) status = 'epic';
  else if (flyable && directionIdeal && currentGF <= (gustThresholds.excellent || 1.25) && probability >= 40) status = 'excellent';
  else if (flyable && probability >= 30) status = 'good';
  else if (directionOK && currentSpeed >= 3 && currentSpeed <= 22) status = 'marginal';

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
    bestHours: profile.bestHours || [7, 8, 9, 10, 11],
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
export function predictNorth(windData, _conditions = {}) {
  const w = getWeights();
  const utalp = windData?.UTALP || {};
  const fps = windData?.FPS || {};
  const kslc = windData?.KSLC || {};
  const kpvu = windData?.KPVU || {};
  const utoly = windData?.UTOLY || {};
  const wuDrape = windData?.KUTDRAPE132 || {};
  const wuBluff = windData?.KUTBLUFF18 || {};
  const wuRiver = windData?.KUTRIVER67 || {};
  const wuSandy = windData?.KUTSANDY188 || {};
  const hour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  
  // ─── DAYLIGHT CHECK — Paragliding requires visibility! ───────
  const daylight = calculateDaylight(40.45); // PotM latitude
  
  if (daylight.isNight) {
    return {
      probability: 0,
      expectedSpeed: 0,
      conditions: 'No flying after dark',
      verdict: `Night — No flying possible. Sunrise at ${formatHour(daylight.sunrise)}`,
      confidence: 100,
      isNight: true,
      hoursUntilSunrise: daylight.sunrise - hour + (hour > 12 ? 24 : 0),
    };
  }
  
  if (daylight.isTwilight) {
    return {
      probability: 5,
      expectedSpeed: 0,
      conditions: 'Twilight — limited visibility',
      verdict: hour < 12 
        ? `Pre-dawn twilight. Flying starts at sunrise (${formatHour(daylight.sunrise)})`
        : `Dusk — pack up. Too dark to fly safely.`,
      confidence: 90,
      isTwilight: true,
    };
  }

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

  // ── WU PWS CORROBORATION — Draper/Bluffdale/Riverton corridor sensors ──
  let wuNorthCount = 0;
  const isNorthDir = (d) => d != null && (d >= 300 || d <= 60);
  if (wuDrape.windSpeed >= 4 && isNorthDir(wuDrape.windDirection)) wuNorthCount++;
  if (wuBluff.windSpeed >= 3 && isNorthDir(wuBluff.windDirection)) wuNorthCount++;
  if (wuRiver.windSpeed >= 3 && isNorthDir(wuRiver.windDirection)) wuNorthCount++;
  if (wuSandy.windSpeed >= 3 && isNorthDir(wuSandy.windDirection)) wuNorthCount++;
  if (wuNorthCount >= 3) probability += 15;
  else if (wuNorthCount >= 2) probability += 10;
  else if (wuNorthCount >= 1) probability += 5;

  // Pressure gradient: positive (SLC higher) = north push
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 1.5) probability += 15;
    else if (gradient > 0.5) probability += 8;
    else if (gradient < -1.0) probability -= 10;
  }

  // Time of day: north side traditionally best 5-8 PM (glass-off),
  // BUT postfrontal north flow can be great all day
  const isStrongNorth = (kslc.windDirection != null && (kslc.windDirection >= 315 || kslc.windDirection <= 45) && kslc.windSpeed >= 8);
  if (isStrongNorth) {
    // Postfrontal/strong north flow — flyable window is all day, not just glass-off
    if (hour >= 9 && hour <= 19) probability += 12;
    else if (hour >= 7 && hour <= 20) probability += 8;
    else probability += 3;
  } else {
    if (hour >= 17 && hour <= 19) probability += 15;
    else if (hour >= 15 && hour <= 20) probability += 10;
    else if (hour >= 13) probability += 5;
    else probability -= 5;
  }

  // UTALP is the on-site sensor for north. If it reads flyable, that's ground truth.
  const utalpConfirmsFlyable = utalp.windSpeed != null && utalp.windDirection != null
    && (utalp.windDirection >= 300 || utalp.windDirection <= 60)
    && utalp.windSpeed >= 5 && utalp.windSpeed <= 20;
  const utalpMinFloor = utalpConfirmsFlyable ? 55 : 0;

  const hourlyMult = w.hourlyMultipliers?.[hour] || 1.0;
  probability *= Math.max(0.6, Math.min(1.5, hourlyMult));

  const bucket = Math.floor(Math.max(0, probability) / 20) * 20;
  const calKey = `${bucket}-${bucket + 20}`;
  const calMult = w.probabilityCalibration?.[calKey] || 1.0;
  probability *= calMult;

  const monthKey = String(month).padStart(2, '0');
  const monthlyRate = w.monthlyQualityRates?.[monthKey] || 0.03;
  const avgMonthlyRate = 0.035;
  const seasonalAdj = avgMonthlyRate > 0 ? Math.min(1.3, Math.max(0.7, monthlyRate / avgMonthlyRate)) : 1.0;
  probability *= seasonalAdj;

  probability = Math.max(utalpMinFloor, probability);
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
  const _kslc = windData?.KSLC || {};
  const _fps = windData?.FPS || {};

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
