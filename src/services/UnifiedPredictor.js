/**
 * UNIFIED PREDICTOR — The Single Brain
 *
 * Replaces 5 fragmented engines (ThermalPredictor, ParaglidingPredictor,
 * WindFieldEngine, WindIntelligence, SmartForecastEngine) with one coherent
 * 9-step pipeline fed by a rich server model context.
 *
 * Pipeline:
 *   1. OBSERVE   – extract readings by station role
 *   2. CONTEXTUALIZE – compare to climatology z-scores
 *   3. CLASSIFY  – match event fingerprints → identify regime
 *   4. PROPAGATE – use 365-day lag correlations for ETAs
 *   5. PRESSURE  – gradient analysis (numeric thresholds)
 *   6. CALIBRATE – apply learned weights + calibration curves + analogs
 *   7. SCORE     – per-activity scoring using calibrated probability
 *   8. DECIDE    – GO / WAIT / PASS with confidence
 *   9. BRIEF     – generate headline / body / bullets
 */

// ─── HELPERS ───────────────────────────────────────────────────────

function denverHour(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    return date.getUTCHours() - 7;
  }
}

function denverMonth(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      month: 'numeric',
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  } catch {
    return date.getUTCMonth();
  }
}

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function inDirRange(dir, min, max, wrap = false) {
  if (dir == null) return false;
  if (wrap || min > max) return dir >= min || dir <= max;
  return dir >= min && dir <= max;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }

function extractWind(obj) {
  if (!obj) return null;
  const speed = obj.windSpeed ?? obj.speed ?? null;
  const dir = obj.windDirection ?? obj.direction ?? null;
  const gust = obj.windGust ?? obj.gust ?? null;
  if (speed == null && dir == null) return null;
  return { speed: speed ?? 0, dir, gust };
}

// ─── LAKE_TO_GRID mapping (matches server NWS grids) ───────────────

const LAKE_TO_GRID = {
  'utah-lake-lincoln': 'utah-lake', 'utah-lake-sandy': 'utah-lake',
  'utah-lake-vineyard': 'utah-lake', 'utah-lake-zigzag': 'utah-lake',
  'utah-lake-mm19': 'utah-lake', 'potm-south': 'utah-lake',
  'potm-north': 'utah-lake', 'rush-lake': 'utah-lake',
  'grantsville': 'utah-lake', 'stockton-bar': 'utah-lake',
  'inspo': 'utah-lake', 'west-mountain': 'utah-lake', 'yuba': 'utah-lake',
  'deer-creek': 'deer-creek', 'jordanelle': 'deer-creek',
  'east-canyon': 'deer-creek', 'echo': 'deer-creek', 'rockport': 'deer-creek',
  'strawberry-ladders': 'strawberry', 'strawberry-bay': 'strawberry',
  'strawberry-soldier': 'strawberry', 'strawberry-view': 'strawberry',
  'strawberry-river': 'strawberry', 'skyline-drive': 'scofield',
  'scofield': 'scofield',
  'willard-bay': 'willard-bay', 'pineview': 'willard-bay',
  'hyrum': 'willard-bay', 'powder-mountain': 'willard-bay',
  'monte-cristo': 'willard-bay',
  'bear-lake': 'bear-lake',
  'sand-hollow': 'stgeorge', 'quail-creek': 'stgeorge', 'lake-powell': 'stgeorge',
  'otter-creek': 'central-mtns', 'fish-lake': 'central-mtns',
  'minersville': 'panguitch', 'piute': 'panguitch', 'panguitch': 'panguitch',
  'starvation': 'vernal', 'steinaker': 'vernal',
  'red-fleet': 'vernal', 'flaming-gorge': 'vernal',
};

// ─── ACTIVITY THRESHOLDS ──────────────────────────────────────────

const PROFILES = {
  kiting:       { idealMin: 10, idealMax: 20, min: 8,  max: 30, gustLimit: 1.5, wantsWind: true },
  snowkiting:   { idealMin: 12, idealMax: 22, min: 10, max: 35, gustLimit: 1.6, wantsWind: true },
  sailing:      { idealMin: 10, idealMax: 18, min: 6,  max: 25, gustLimit: 1.4, wantsWind: true },
  windsurfing:  { idealMin: 12, idealMax: 22, min: 8,  max: 30, gustLimit: 1.5, wantsWind: true },
  paragliding:  { idealMin: 8,  idealMax: 15, min: 6,  max: 18, gustLimit: 1.25, wantsWind: true },
  boating:      { idealMin: 0,  idealMax: 5,  min: 0,  max: 8,  gustLimit: 1.1, wantsWind: false },
  paddling:     { idealMin: 0,  idealMax: 5,  min: 0,  max: 10, gustLimit: 1.2, wantsWind: false },
  fishing:      { idealMin: 0,  idealMax: 8,  min: 0,  max: 15, gustLimit: 1.3, wantsWind: false },
};

// ═══════════════════════════════════════════════════════════════════
//  STEP 1: OBSERVE — extract readings per station role
// ═══════════════════════════════════════════════════════════════════

function observe(liveStations, config) {
  const stationMap = new Map();
  if (Array.isArray(liveStations)) {
    for (const s of liveStations) {
      const id = s.id || s.stationId;
      if (id) stationMap.set(id, s);
    }
  }

  const get = (id) => {
    const raw = stationMap.get(id);
    return raw ? extractWind(raw) : null;
  };

  const obs = {
    groundTruth: null,
    groundTruthId: null,
    pws: null,
    earlyIndicator: null,
    earlyIndicatorId: null,
    pressureHigh: null,
    pressureLow: null,
    pressureHighId: null,
    pressureLowId: null,
    ridge: [],
    lakeshore: [],
    reference: [],
    allReadings: {},
  };

  if (!config?.stations) return obs;
  const st = config.stations;

  // Ground truth
  if (st.groundTruth?.id) {
    obs.groundTruthId = st.groundTruth.id;
    if (st.groundTruth.id === 'PWS') {
      const pwsStation = liveStations?.find(s => s.isPWS);
      obs.pws = pwsStation ? extractWind(pwsStation) : null;
      obs.groundTruth = obs.pws;
    } else {
      obs.groundTruth = get(st.groundTruth.id);
    }
  }

  // PWS separately if it wasn't the ground truth
  if (!obs.pws) {
    const pwsStation = liveStations?.find(s => s.isPWS);
    if (pwsStation) obs.pws = extractWind(pwsStation);
  }

  // Early indicator
  if (st.earlyIndicator?.id) {
    obs.earlyIndicatorId = st.earlyIndicator.id;
    obs.earlyIndicator = get(st.earlyIndicator.id);
  }

  // Pressure pair
  if (st.pressure?.high?.id) {
    obs.pressureHighId = st.pressure.high.id;
    const raw = stationMap.get(st.pressure.high.id);
    obs.pressureHigh = raw ? {
      ...extractWind(raw),
      pressure: raw.pressure ?? raw.seaLevelPressure ?? null,
      temperature: raw.temperature ?? null,
    } : null;
  }
  if (st.pressure?.low?.id) {
    obs.pressureLowId = st.pressure.low.id;
    const raw = stationMap.get(st.pressure.low.id);
    obs.pressureLow = raw ? {
      ...extractWind(raw),
      pressure: raw.pressure ?? raw.seaLevelPressure ?? null,
      temperature: raw.temperature ?? null,
    } : null;
  }

  // Categorized stations
  for (const s of (st.ridge || [])) {
    const w = get(s.id);
    if (w) obs.ridge.push({ id: s.id, ...w, elevation: s.elevation, priority: s.priority });
  }
  for (const s of (st.lakeshore || [])) {
    const w = get(s.id);
    if (w) obs.lakeshore.push({ id: s.id, ...w, priority: s.priority });
  }
  for (const s of (st.reference || [])) {
    const w = get(s.id);
    if (w) obs.reference.push({ id: s.id, ...w });
  }

  // Build allReadings map for lag correlation lookups
  for (const [id, raw] of stationMap.entries()) {
    const w = extractWind(raw);
    if (w) obs.allReadings[id] = w;
  }

  return obs;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 2: CONTEXTUALIZE — z-score anomalies vs climatology
// ═══════════════════════════════════════════════════════════════════

function contextualize(obs, climatology, hour) {
  const anomalies = {};
  if (!climatology) return { anomalies, overallAnomaly: 0 };

  const allStations = { ...obs.allReadings };
  if (obs.groundTruth && obs.groundTruthId) allStations[obs.groundTruthId] = obs.groundTruth;

  let totalZ = 0;
  let count = 0;

  for (const [stid, reading] of Object.entries(allStations)) {
    const stClim = climatology[stid];
    if (!stClim) continue;

    const hourKey = String(hour);
    const hourClim = stClim[hourKey] || stClim[hour];
    if (!hourClim || !hourClim.avgSpeed) continue;

    const mean = hourClim.avgSpeed;
    const std = hourClim.stdSpeed || mean * 0.4;
    const zSpeed = std > 0.5 ? (reading.speed - mean) / std : 0;

    anomalies[stid] = {
      speed: reading.speed,
      climatologyMean: mean,
      zScore: Math.round(zSpeed * 100) / 100,
      isAnomaly: Math.abs(zSpeed) > 1.5,
    };

    totalZ += zSpeed;
    count++;
  }

  return {
    anomalies,
    overallAnomaly: count > 0 ? totalZ / count : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 3: CLASSIFY — match event fingerprints → regime
// ═══════════════════════════════════════════════════════════════════

function classify(obs, context, overallAnomaly) {
  const result = {
    regime: 'unknown',
    confidence: 0,
    matchedFingerprint: null,
    description: '',
  };

  // First: simple heuristic regime detection from live data
  const gtDir = obs.groundTruth?.dir;
  const gtSpeed = obs.groundTruth?.speed ?? 0;

  const seFlow = gtDir != null && gtDir >= 100 && gtDir <= 200 && gtSpeed >= 5;
  const northFlow = gtDir != null && (gtDir >= 315 || gtDir <= 45) && gtSpeed >= 5;
  const clearing = gtDir != null && (gtDir >= 270 || gtDir <= 45) && gtSpeed >= 8;
  const calm = gtSpeed < 3;

  if (northFlow) { result.regime = 'north_flow'; result.confidence = 0.6; result.description = 'N/NW flow detected'; }
  else if (clearing && overallAnomaly > 1.0) { result.regime = 'postfrontal_clearing'; result.confidence = 0.5; result.description = 'Post-frontal clearing wind'; }
  else if (seFlow) { result.regime = 'se_thermal'; result.confidence = 0.6; result.description = 'SE thermal flow'; }
  else if (calm) { result.regime = 'calm'; result.confidence = 0.5; result.description = 'Calm conditions'; }
  else { result.regime = 'transitional'; result.confidence = 0.3; result.description = 'Transition / mixed signals'; }

  // Now try to match against learned fingerprints for higher confidence
  const fps = context?.fingerprints;
  if (fps && Array.isArray(fps)) {
    let bestMatch = null;
    let bestScore = 0;

    for (const fp of fps) {
      if (!fp.stations || !fp.type) continue;
      let matchScore = 0;
      let checks = 0;

      for (const [stid, expected] of Object.entries(fp.stations)) {
        const reading = obs.allReadings[stid];
        if (!reading) continue;
        checks++;

        if (expected.dirMin != null && expected.dirMax != null) {
          if (inDirRange(reading.dir, expected.dirMin, expected.dirMax, expected.wrap)) {
            matchScore += 1;
          }
        }
        if (expected.speedMin != null && reading.speed >= expected.speedMin) {
          matchScore += 0.5;
        }
      }

      const normalized = checks > 0 ? matchScore / (checks * 1.5) : 0;
      if (normalized > bestScore && normalized > 0.4) {
        bestScore = normalized;
        bestMatch = fp;
      }
    }

    if (bestMatch) {
      result.regime = bestMatch.type;
      result.confidence = Math.min(0.95, bestScore);
      result.matchedFingerprint = bestMatch;
      result.description = bestMatch.label || bestMatch.type;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 4: PROPAGATE — use 365-day lag correlations for ETAs
// ═══════════════════════════════════════════════════════════════════

function propagate(obs, context, config, regime) {
  const result = {
    phase: 'unknown',
    eta: null,
    expectedSpeed: null,
    chains: [],
    dominantSource: null,
    lagConfidence: 0,
  };

  const gtId = obs.groundTruthId;
  const lagCorr = context?.lagCorrelations;

  // Use learned lag correlations when available
  if (lagCorr && gtId) {
    let bestUpstream = null;
    let bestR = 0;
    let bestLag = 0;

    for (const pair of lagCorr) {
      if (pair.downstream !== gtId) continue;
      const upReading = obs.allReadings[pair.upstream];
      if (!upReading || upReading.speed < 3) continue;

      const r = typeof pair.correlation === 'number' ? pair.correlation : parseFloat(pair.correlation) || 0;
      if (r > bestR) {
        bestR = r;
        bestUpstream = { id: pair.upstream, ...upReading };
        bestLag = typeof pair.lagMinutes === 'number' ? pair.lagMinutes : parseInt(pair.lagMinutes) || 30;
      }
    }

    if (bestUpstream && bestR > 0.3) {
      const ratio = bestUpstream.speed > 0 ? (obs.groundTruth?.speed ?? 0) / bestUpstream.speed : 0;
      result.dominantSource = bestUpstream.id;
      result.lagConfidence = bestR;
      result.expectedSpeed = bestUpstream.speed * (ratio > 0.1 ? ratio : 0.7);

      const gtSpeed = obs.groundTruth?.speed ?? 0;
      if (gtSpeed >= 5) {
        result.phase = 'arrived';
        result.eta = 0;
      } else if (bestUpstream.speed >= 5) {
        result.phase = 'approaching';
        result.eta = bestLag;
      } else {
        result.phase = 'quiet';
      }
    }
  }

  // Also check early indicator if available
  if (obs.earlyIndicator && obs.earlyIndicatorId && config?.stations?.earlyIndicator) {
    const ei = config.stations.earlyIndicator;
    const trigger = ei.trigger;
    if (trigger) {
      const eiWind = obs.earlyIndicator;
      const dirOk = trigger.direction && inDirRange(eiWind.dir, trigger.direction.min, trigger.direction.max);
      const speedOk = trigger.speed && eiWind.speed >= trigger.speed.min;

      if (dirOk && speedOk) {
        const leadTime = ei.leadTimeMinutes || 120;
        result.chains.push({
          source: obs.earlyIndicatorId,
          name: ei.name,
          speed: eiWind.speed,
          dir: eiWind.dir,
          cardinal: getCardinal(eiWind.dir),
          leadTimeMinutes: leadTime,
          status: 'active',
        });

        if (result.phase === 'quiet' || result.phase === 'unknown') {
          result.phase = 'building';
          result.eta = leadTime;
        }
      }
    }
  }

  // Ridge station check
  for (const ridge of obs.ridge) {
    if (ridge.speed >= 8) {
      result.chains.push({
        source: ridge.id,
        speed: ridge.speed,
        dir: ridge.dir,
        cardinal: getCardinal(ridge.dir),
        role: 'ridge',
        status: ridge.speed >= 12 ? 'strong' : 'active',
      });
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 5: PRESSURE — gradient analysis with numeric thresholds
// ═══════════════════════════════════════════════════════════════════

function pressureAnalysis(obs, context, config) {
  const result = {
    gradient: null,
    northFlowRisk: false,
    thermalBusted: false,
    confidence: 0,
    description: '',
  };

  const highP = obs.pressureHigh?.pressure;
  const lowP = obs.pressureLow?.pressure;

  if (highP != null && lowP != null) {
    const gradient = Number(highP) - Number(lowP);
    result.gradient = Math.round(gradient * 100) / 100;

    // Use learned thresholds when available, fall back to config
    let bustThreshold = config?.stations?.pressure?.bustThreshold ?? 2.0;
    if (context?.gradientThresholds) {
      const gt = context.gradientThresholds;
      if (typeof gt.bustThreshold === 'number') bustThreshold = gt.bustThreshold;
      else if (typeof gt.bustThreshold === 'string') bustThreshold = parseFloat(gt.bustThreshold) || 2.0;
    }

    if (gradient > bustThreshold) {
      result.northFlowRisk = true;
      result.thermalBusted = true;
      result.confidence = clamp((gradient - bustThreshold) / 2, 0, 1);
      result.description = `Pressure gradient +${result.gradient} mb → north flow likely`;
    } else if (gradient > 0) {
      result.northFlowRisk = true;
      result.confidence = 0.3;
      result.description = `Slight N gradient (+${result.gradient} mb) — watching`;
    } else {
      result.confidence = clamp(Math.abs(gradient) / 3, 0, 1);
      result.description = gradient < -1
        ? `Favorable gradient (${result.gradient} mb) — thermals supported`
        : `Neutral gradient (${result.gradient} mb)`;
    }
  }

  // Temperature delta for thermal pump
  if (obs.pressureHigh?.temperature != null) {
    const ridgeTemp = obs.ridge.length > 0 ? obs.ridge[0].temperature : null;
    const lakeshoreTemp = obs.pressureLow?.temperature;
    if (ridgeTemp != null && lakeshoreTemp != null) {
      result.elevationDelta = lakeshoreTemp - ridgeTemp;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 6: CALIBRATE — apply learned weights, calibration curves, analogs
// ═══════════════════════════════════════════════════════════════════

function calibrate(regime, pressure, propagation, context, hour, month) {
  let probability = 50;
  let confidence = 0.5;
  let speedMultiplier = 1.0;

  // Base probability from regime
  switch (regime.regime) {
    case 'se_thermal':
      probability = 65;
      break;
    case 'north_flow':
      probability = 60;
      break;
    case 'postfrontal_clearing':
      probability = 55;
      break;
    case 'calm':
      probability = 15;
      break;
    case 'transitional':
      probability = 35;
      break;
    default:
      probability = 30;
  }

  // Thermal profiles from 365-day analysis
  if (context?.thermalProfiles) {
    const profiles = context.thermalProfiles;
    const hourKey = String(hour);
    for (const [, lakeProfile] of Object.entries(profiles)) {
      if (lakeProfile[hourKey]?.probability != null) {
        const histProb = lakeProfile[hourKey].probability * 100;
        probability = probability * 0.6 + histProb * 0.4;
        break;
      }
    }
  }

  // Pressure bust override
  if (pressure.thermalBusted) {
    if (regime.regime === 'se_thermal') {
      probability *= 0.2;
    }
  }

  // Hourly multipliers from learned weights
  const lw = context?.learnedWeights;
  if (lw?.hourlyMultipliers) {
    const mult = lw.hourlyMultipliers[String(hour)] ?? lw.hourlyMultipliers[hour];
    if (typeof mult === 'number') {
      probability *= clamp(mult, 0.5, 1.5);
    }
  }

  // Propagation boost
  if (propagation.phase === 'arrived') {
    probability = Math.max(probability, 70);
    confidence = Math.max(confidence, 0.7);
  } else if (propagation.phase === 'building' || propagation.phase === 'approaching') {
    probability = Math.max(probability, 45);
  }

  // Lag correlation confidence
  if (propagation.lagConfidence > 0.5) {
    confidence = Math.max(confidence, propagation.lagConfidence * 0.8);
  }

  // Calibration curves from statistical models
  if (context?.calibration) {
    const cal = context.calibration;
    if (cal[regime.regime]) {
      const curve = cal[regime.regime];
      if (curve.bias != null) probability += curve.bias;
      if (curve.scale != null) probability *= curve.scale;
    }
  }

  // Analog confidence boost
  if (context?.analogs) {
    const analogs = context.analogs;
    const matches = analogs.matches || analogs.recentMatches || [];
    if (matches.length >= 3) {
      const avgOutcome = matches.reduce((sum, m) => sum + (m.outcome ?? m.windSpeed ?? 0), 0) / matches.length;
      confidence = Math.min(0.95, confidence + 0.1);
      if (avgOutcome > 8) probability = probability * 0.7 + 75 * 0.3;
    }
  }

  // Speed bias correction
  if (lw?.speedBiasCorrection) {
    speedMultiplier += lw.speedBiasCorrection / 10;
  }

  probability = clamp(probability, 0, 95);
  confidence = clamp(confidence, 0, 0.95);

  return { probability, confidence, speedMultiplier };
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 7: SCORE — per-activity scoring
// ═══════════════════════════════════════════════════════════════════

function scoreActivity(activityId, speed, gust, probability, dir, config) {
  const p = PROFILES[activityId];
  if (!p) return { score: 50, status: 'unknown', message: '' };

  const gustFactor = (gust && speed > 0) ? gust / speed : 1.0;
  let score = 0;

  if (p.wantsWind) {
    if (speed >= p.idealMin && speed <= p.idealMax) {
      score = 80 + 20 * (1 - Math.abs(speed - (p.idealMin + p.idealMax) / 2) / ((p.idealMax - p.idealMin) / 2));
    } else if (speed >= p.min && speed < p.idealMin) {
      score = 30 + 50 * ((speed - p.min) / Math.max(1, p.idealMin - p.min));
    } else if (speed > p.idealMax && speed <= p.max) {
      score = 40 + 40 * (1 - (speed - p.idealMax) / Math.max(1, p.max - p.idealMax));
    } else if (speed < p.min) {
      score = Math.max(0, 20 * (speed / p.min));
    } else {
      score = Math.max(0, 20 * (1 - (speed - p.max) / 10));
    }

    if (gustFactor > p.gustLimit) {
      score *= Math.max(0.3, 1 - (gustFactor - p.gustLimit) * 0.5);
    } else if (gustFactor < 1.15) {
      score = Math.min(100, score * 1.1);
    }
  } else {
    // Calm sports: less wind = better
    if (speed <= p.idealMax) {
      score = 85 + 15 * (1 - speed / Math.max(1, p.idealMax));
    } else if (speed <= p.max) {
      score = 40 + 45 * (1 - (speed - p.idealMax) / Math.max(1, p.max - p.idealMax));
    } else {
      score = Math.max(0, 30 * (1 - (speed - p.max) / 10));
    }
  }

  // Weight by model probability
  if (p.wantsWind && probability < 50) {
    score = score * 0.7 + score * 0.3 * (probability / 50);
  }

  score = clamp(Math.round(score), 0, 100);

  let status, message;
  if (p.wantsWind) {
    if (speed > p.max) { status = 'dangerous'; message = `Too strong at ${Math.round(speed)} mph — gusts ${Math.round(gust || speed)} mph`; }
    else if (score >= 70) { status = 'go'; message = `${Math.round(speed)} mph ${getCardinal(dir)} — great conditions`; }
    else if (score >= 40) { status = 'wait'; message = speed < p.min ? 'Building — not quite enough yet' : `${Math.round(speed)} mph — marginal`; }
    else { status = 'pass'; message = speed < 3 ? 'No wind' : `${Math.round(speed)} mph — below threshold`; }
  } else {
    if (score >= 70) { status = 'go'; message = speed < 3 ? 'Glass conditions' : `Light wind ${Math.round(speed)} mph — good`; }
    else if (score >= 40) { status = 'wait'; message = `${Math.round(speed)} mph — some chop`; }
    else { status = 'pass'; message = `${Math.round(speed)} mph — too rough`; }
  }

  return { score, status, message, gustFactor: Math.round(gustFactor * 100) / 100 };
}

function scoreAllActivities(speed, gust, probability, dir, config) {
  const activities = {};
  for (const id of Object.keys(PROFILES)) {
    activities[id] = scoreActivity(id, speed, gust, probability, dir, config);
  }
  return activities;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 8: DECIDE — GO / WAIT / PASS with confidence
// ═══════════════════════════════════════════════════════════════════

function decide(activity, activityScore, speed, gust, dir, probability, propagation, pressure) {
  const p = PROFILES[activity];
  if (!p) return { decision: 'WAIT', confidence: 0.3, headline: 'Unknown activity', detail: '', action: '' };

  if (activityScore.status === 'dangerous') {
    return {
      decision: 'PASS',
      confidence: 0.9,
      headline: `Too strong — ${Math.round(speed)} mph with ${Math.round(gust || speed)} mph gusts`,
      detail: 'Dangerous conditions. Do not launch.',
      action: p.wantsWind ? 'Stay safe — conditions exceed limits' : 'Stay off the water',
    };
  }

  if (activityScore.score >= 70) {
    return {
      decision: 'GO',
      confidence: clamp(activityScore.score / 100, 0.6, 0.95),
      headline: `${Math.round(speed)} mph ${getCardinal(dir)} — ${p.wantsWind ? 'sending it' : 'calm & beautiful'}`,
      detail: activityScore.message,
      action: p.wantsWind ? 'Get out there — conditions are ideal' : 'Perfect time on the water',
    };
  }

  if (propagation.phase === 'building' || propagation.phase === 'approaching') {
    const etaMin = propagation.eta || 60;
    return {
      decision: 'WAIT',
      confidence: clamp(propagation.lagConfidence, 0.3, 0.8),
      headline: `Wind building — ETA ~${etaMin} min`,
      detail: propagation.dominantSource
        ? `${propagation.dominantSource} showing ${Math.round(propagation.expectedSpeed || 0)} mph upstream`
        : 'Upstream stations showing wind building',
      action: p.wantsWind ? `Rig up — wind expected in ~${etaMin} minutes` : `Wait ${etaMin} min for conditions to change`,
    };
  }

  if (activityScore.score >= 40) {
    return {
      decision: 'WAIT',
      confidence: 0.4,
      headline: `Marginal — ${Math.round(speed)} mph`,
      detail: activityScore.message,
      action: 'Keep watching — could improve',
    };
  }

  return {
    decision: 'PASS',
    confidence: clamp(1 - activityScore.score / 100, 0.5, 0.9),
    headline: p.wantsWind ? `Too light — ${Math.round(speed)} mph` : `Too windy — ${Math.round(speed)} mph`,
    detail: activityScore.message,
    action: p.wantsWind ? 'Not enough wind yet' : 'Too rough right now',
  };
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 9: BRIEF — generate headline, body, bullets
// ═══════════════════════════════════════════════════════════════════

function brief(regime, decision, propagation, pressure, activities, currentActivity, speed, hour) {
  const bullets = [];
  const actScore = activities[currentActivity];

  // Regime bullet
  if (regime.regime !== 'unknown') {
    bullets.push(`Pattern: ${regime.description} (${Math.round(regime.confidence * 100)}% match)`);
  }

  // Pressure bullet
  if (pressure.gradient != null) {
    bullets.push(pressure.description);
  }

  // Propagation bullet
  if (propagation.phase === 'building' || propagation.phase === 'approaching') {
    bullets.push(`Wind approaching — ETA ~${propagation.eta || '?'} min from ${propagation.dominantSource || 'upstream'}`);
  } else if (propagation.phase === 'arrived') {
    bullets.push('Wind has arrived at your location');
  }

  // Activity-specific bullets for other sports
  const goActivities = Object.entries(activities)
    .filter(([id, a]) => id !== currentActivity && a.status === 'go')
    .map(([id]) => id);
  if (goActivities.length > 0) {
    bullets.push(`Also good for: ${goActivities.join(', ')}`);
  }

  // Best window estimate
  let bestAction = '';
  if (decision.decision === 'GO') {
    const hoursLeft = Math.max(1, 18 - hour);
    bestAction = `Conditions good for the next ${hoursLeft}+ hours`;
  } else if (decision.decision === 'WAIT' && propagation.eta) {
    bestAction = `Be ready by ${formatETA(hour, propagation.eta)}`;
  }

  const excitement = decision.decision === 'GO' && actScore?.score >= 80 ? 'high'
    : decision.decision === 'GO' ? 'moderate'
    : decision.decision === 'WAIT' ? 'low'
    : 'none';

  return {
    headline: decision.headline,
    body: decision.detail,
    bullets,
    bestAction,
    excitement,
  };
}

function formatETA(currentHour, etaMinutes) {
  const targetHour = currentHour + Math.floor(etaMinutes / 60);
  const targetMin = etaMinutes % 60;
  const h = targetHour % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return targetMin > 0 ? `${displayH}:${String(targetMin).padStart(2, '0')} ${suffix}` : `${displayH} ${suffix}`;
}

// ═══════════════════════════════════════════════════════════════════
//  NWS HOURLY INTEGRATION
// ═══════════════════════════════════════════════════════════════════

function buildHourlyForecast(lakeId, context, calibrationResult) {
  const gridKey = LAKE_TO_GRID[lakeId];
  if (!gridKey || !context?.nwsHourly) return [];

  const gridData = context.nwsHourly[gridKey];
  if (!gridData?.periods && !Array.isArray(gridData)) return [];

  const periods = gridData.periods || gridData;
  if (!Array.isArray(periods)) return [];

  return periods.slice(0, 24).map(p => {
    let speed = p.windSpeed;
    if (typeof speed === 'string') speed = parseFloat(speed) || 0;

    let adjustedSpeed = speed * (calibrationResult?.speedMultiplier ?? 1.0);

    return {
      time: p.startTime || p.time,
      speed: Math.round(adjustedSpeed * 10) / 10,
      nwsSpeed: speed,
      dir: p.windDirection,
      temperature: p.temperature,
      shortForecast: p.shortForecast || '',
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
//  PARAGLIDING SPECIAL HANDLING
// ═══════════════════════════════════════════════════════════════════

function paraglidingOverride(lakeId, obs, activities, decision, propagation) {
  const isPGSpot = lakeId === 'potm-south' || lakeId === 'potm-north';
  if (!isPGSpot) return { activities, decision };

  const pgScore = activities.paragliding;
  if (!pgScore) return { activities, decision };

  // For PG spots, use the site-specific sensor as ground truth
  const siteStation = lakeId === 'potm-south' ? 'FPS' : 'UTALP';
  const siteReading = obs.allReadings[siteStation];

  if (!siteReading) return { activities, decision };

  const speed = siteReading.speed;
  const dir = siteReading.dir;
  const gust = siteReading.gust;

  // PG direction windows
  const southOk = lakeId === 'potm-south' && dir != null && dir >= 110 && dir <= 250;
  const northOk = lakeId === 'potm-north' && dir != null && (dir >= 315 || dir <= 45);
  const dirOk = southOk || northOk;

  const flyable = dirOk && speed >= 5 && speed <= 20;
  const gustOk = !gust || (gust - speed) <= 7;

  if (flyable && gustOk) {
    const overriddenScore = scoreActivity('paragliding', speed, gust, 80, dir);
    overriddenScore.score = Math.max(overriddenScore.score, 65);
    overriddenScore.status = 'go';
    overriddenScore.message = `${Math.round(speed)} mph ${getCardinal(dir)} at ${siteStation} — flyable`;

    activities = { ...activities, paragliding: overriddenScore };

    if (pgScore.status !== 'go') {
      decision = {
        decision: 'GO',
        confidence: 0.8,
        headline: `${Math.round(speed)} mph ${getCardinal(dir)} — go fly`,
        detail: `${siteStation} confirms flyable conditions`,
        action: 'Conditions are good — launch when ready',
      };
    }
  } else if (speed > 20 || (gust && gust > 25)) {
    activities = { ...activities, paragliding: { ...pgScore, status: 'dangerous', message: `Too strong — ${Math.round(speed)} mph at ${siteStation}` } };
    decision = {
      decision: 'PASS',
      confidence: 0.9,
      headline: `Too strong — ${Math.round(speed)} mph`,
      detail: `${siteStation} shows dangerous conditions`,
      action: 'Do not launch — conditions are dangerous',
    };
  }

  return { activities, decision };
}

// ═══════════════════════════════════════════════════════════════════
//  BACKWARD COMPATIBILITY FIELDS
// ═══════════════════════════════════════════════════════════════════

function backwardCompat(calibration, regime, propagation, pressure, speed, gust, hour) {
  // thermalPrediction shape expected by older components
  const thermalPrediction = {
    probability: calibration.probability,
    windProbability: calibration.probability,
    confidence: calibration.confidence,
    regime: regime.regime,
    status: calibration.probability > 60 ? 'active' : calibration.probability > 30 ? 'building' : 'quiet',
    arrivalTime: propagation.eta ? formatETA(hour, propagation.eta) : null,
    startHour: propagation.phase === 'approaching' && propagation.eta ? hour + Math.floor(propagation.eta / 60) : (hour < 10 ? 10 : null),
    endHour: 17,
    expectedSpeed: propagation.expectedSpeed || speed,
    pressureGradient: pressure.gradient,
    thermalBusted: pressure.thermalBusted,
    description: regime.description,
    northFlow: pressure.northFlowRisk ? {
      status: pressure.gradient > 3 ? 'strong' : 'moderate',
      persistenceHours: pressure.gradient > 2 ? 2 : 1,
    } : null,
    phase: propagation.phase,
    speed: { expectedAvg: propagation.expectedSpeed || speed },
    pressure: { gradient: pressure.gradient, isBusted: pressure.thermalBusted },
    direction: { status: speed >= 5 ? 'optimal' : 'unknown' },
  };

  // boatingPrediction shape — include fields expected by DecisionCard (glassUntil, isGlass)
  const glassScore = speed <= 3 ? 95 : speed <= 5 ? 80 : speed <= 8 ? 60 : speed <= 12 ? 35 : 15;
  const isGlass = speed <= 3;
  const boatingPrediction = {
    glassScore,
    isGlass,
    glassUntil: isGlass && hour < 10 ? 10 : isGlass && hour < 14 ? hour + 2 : null,
    choppiness: speed <= 3 ? 'glass' : speed <= 6 ? 'light-chop' : speed <= 10 ? 'moderate' : 'rough',
    bestWindow: hour < 10 ? 'Early morning (before 10 AM)' : 'Current conditions',
    windThreat: speed > 10 ? 'high' : speed > 6 ? 'moderate' : 'low',
    probability: glassScore,
    waveLabel: isGlass ? 'Glass' : speed <= 6 ? 'Light Chop' : 'Choppy',
    recommendation: isGlass ? 'Go now' : speed <= 8 ? 'Acceptable' : 'Not ideal',
  };

  return { thermalPrediction, boatingPrediction };
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN EXPORT: predict()
// ═══════════════════════════════════════════════════════════════════

export function predict(lakeId, activity, liveStations, modelContext, config) {
  const now = new Date();
  const hour = modelContext?.currentHour ?? denverHour(now);
  const month = modelContext?.currentMonth ?? denverMonth(now);
  const ctx = modelContext || {};

  // 1. OBSERVE
  const obs = observe(liveStations, config);

  // 2. CONTEXTUALIZE
  const { anomalies, overallAnomaly } = contextualize(obs, ctx.climatology, hour);

  // 3. CLASSIFY
  const regime = classify(obs, ctx, overallAnomaly);

  // 4. PROPAGATE
  const prop = propagate(obs, ctx, config, regime);

  // 5. PRESSURE
  const pressure = pressureAnalysis(obs, ctx, config);

  // 6. CALIBRATE
  const cal = calibrate(regime, pressure, prop, ctx, hour, month);

  // Determine effective wind speed (ground truth > first lakeshore > first ridge)
  let windSpeed = obs.groundTruth?.speed ?? 0;
  let windDir = obs.groundTruth?.dir ?? null;
  let windGust = obs.groundTruth?.gust ?? null;
  if (windSpeed === 0 && obs.lakeshore.length > 0) {
    windSpeed = obs.lakeshore[0].speed;
    windDir = obs.lakeshore[0].dir;
    windGust = obs.lakeshore[0].gust;
  }
  if (windSpeed === 0 && obs.ridge.length > 0) {
    windSpeed = obs.ridge[0].speed;
    windDir = obs.ridge[0].dir;
    windGust = obs.ridge[0].gust;
  }

  // Apply speed multiplier from calibration
  const adjustedSpeed = windSpeed * cal.speedMultiplier;

  // 7. SCORE
  let activities = scoreAllActivities(adjustedSpeed, windGust, cal.probability, windDir, config);

  // 8. DECIDE
  const currentScore = activities[activity] || activities.kiting;
  let decision = decide(activity, currentScore, adjustedSpeed, windGust, windDir, cal.probability, prop, pressure);

  // Paragliding ground-truth override
  if (activity === 'paragliding') {
    const pgOverride = paraglidingOverride(lakeId, obs, activities, decision, prop);
    activities = pgOverride.activities;
    decision = pgOverride.decision;
  }

  // 9. BRIEF
  const briefing = brief(regime, decision, prop, pressure, activities, activity, adjustedSpeed, hour);

  // NWS hourly forecast
  const hourly = buildHourlyForecast(lakeId, ctx, cal);

  // Backward compatibility
  const compat = backwardCompat(cal, regime, prop, pressure, adjustedSpeed, windGust, hour);

  return {
    // Core outputs
    decision: decision.decision,
    confidence: decision.confidence,
    regime: regime.regime,

    // Per-activity scores
    activities,

    // Wind state
    wind: {
      current: { speed: Math.round(adjustedSpeed * 10) / 10, dir: windDir, gust: windGust, cardinal: getCardinal(windDir) },
      expected: { speed: Math.round((prop.expectedSpeed || adjustedSpeed) * 10) / 10 },
      anomaly: overallAnomaly,
      source: obs.groundTruthId || 'unknown',
    },

    // Propagation state
    propagation: {
      phase: prop.phase,
      eta: prop.eta,
      dominantSource: prop.dominantSource,
      lagConfidence: prop.lagConfidence,
      chains: prop.chains,
    },

    // Pressure context
    pressure: {
      gradient: pressure.gradient,
      northFlowRisk: pressure.northFlowRisk,
      thermalBusted: pressure.thermalBusted,
      description: pressure.description,
    },

    // Analog confidence
    analogs: ctx.analogs ? {
      matchCount: (ctx.analogs.matches || ctx.analogs.recentMatches || []).length,
      confidence: ctx.analogs.confidence ?? 0,
    } : null,

    // NWS hourly forecast
    hourly,

    // Briefing
    briefing,

    // Backward-compat fields for existing components
    thermalPrediction: compat.thermalPrediction,
    boatingPrediction: compat.boatingPrediction,

    // Meta
    _lakeId: lakeId,
    _activity: activity,
    _hour: hour,
    _month: month,
    _timestamp: now.toISOString(),
    _version: 'unified-v1',
  };
}
