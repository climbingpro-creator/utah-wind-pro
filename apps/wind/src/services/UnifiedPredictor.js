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

// ─── DAYLIGHT CALCULATION ──────────────────────────────────────────
// Critical for outdoor activities that require visibility

function calculateDaylight(lat = 40.45, date = new Date()) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const hour = denverHour(date) + date.getMinutes() / 60;
  
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
  
  return { 
    sunrise: Math.round(sunrise * 10) / 10, 
    sunset: Math.round(sunset * 10) / 10, 
    isNight, 
    isTwilight, 
    isDaylight, 
    daylightHoursRemaining: Math.round(daylightHoursRemaining * 10) / 10,
    currentHour: hour,
  };
}

function formatHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function _angleDiff(a, b) {
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

  const config = context?._config;
  const thermal = config?.thermal;

  // ── Config-driven direction ranges for this specific spot ────────
  // Each spot defines its own thermal direction — Zigzag is SE (100-200),
  // Deer Creek is SSW-WSW (170-260), Willard is S (150-220), etc.
  const thermalDirMin = thermal?.optimalDirection?.min ?? 100;
  const thermalDirMax = thermal?.optimalDirection?.max ?? 200;
  const thermalDirWrap = thermalDirMin > thermalDirMax;
  const inThermalDir = (d) => {
    if (d == null) return false;
    return thermalDirWrap ? (d >= thermalDirMin || d <= thermalDirMax) : (d >= thermalDirMin && d <= thermalDirMax);
  };
  // Wider acceptance range for "thermal-ish" flow (+/- 30° from optimal)
  const wideMin = (thermalDirMin - 30 + 360) % 360;
  const wideMax = (thermalDirMax + 30) % 360;
  const wideWrap = wideMin > wideMax;
  const inWideThermalDir = (d) => {
    if (d == null) return false;
    return wideWrap ? (d >= wideMin || d <= wideMax) : (d >= wideMin && d <= wideMax);
  };
  const inNorthDir = (d) => d != null && (d >= 315 || d <= 45);

  // Derive the thermal regime name from the spot's primaryWindType
  const primaryType = config?.primaryWindType || '';
  const regimeName = primaryType.toLowerCase().includes('canyon') ? 'canyon_thermal'
    : primaryType.toLowerCase().includes('north') ? 'north_flow'
    : primaryType.toLowerCase().includes('south') ? 'south_flow'
    : primaryType.toLowerCase().includes('se') ? 'se_thermal'
    : primaryType.toLowerCase().includes('ssw') ? 'canyon_thermal'
    : 'thermal';

  // ── Early indicator check (works for any spot's configured indicator) ──
  const ei = obs.earlyIndicator;
  const eiId = obs.earlyIndicatorId;
  const eiTrigger = config?.stations?.earlyIndicator?.trigger;
  const eiDirMin = eiTrigger?.direction?.min ?? thermalDirMin;
  const eiDirMax = eiTrigger?.direction?.max ?? thermalDirMax;
  const eiSpeedMin = eiTrigger?.speed?.min ?? 6;
  const eiInDir = (d) => {
    if (d == null) return false;
    return eiDirMin > eiDirMax ? (d >= eiDirMin || d <= eiDirMax) : (d >= eiDirMin && d <= eiDirMax);
  };
  const eiActive = ei && eiInDir(ei.dir) && ei.speed >= eiSpeedMin;

  // ── Ground truth and best-signal determination ────────────────────
  let sigDir = obs.groundTruth?.dir;
  let sigSpeed = obs.groundTruth?.speed ?? 0;

  if (sigSpeed < 1 || sigDir == null) {
    const candidates = [
      ei ? { ...ei, src: eiId } : null,
      ...(obs.lakeshore || []).map(s => ({ ...s, src: s.id })),
      ...(obs.reference || []).map(s => ({ ...s, src: s.id })),
    ].filter(s => s && s.speed >= 3 && s.dir != null);

    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => (b.speed > a.speed ? b : a));
      sigDir = best.dir;
      sigSpeed = best.speed;
    }
  }

  const thermalFlow = inWideThermalDir(sigDir) && sigSpeed >= 5;
  const northFlow = inNorthDir(sigDir) && sigSpeed >= 5;
  const clearing = sigDir != null && (sigDir >= 270 || sigDir <= 45) && sigSpeed >= 8;
  const calm = sigSpeed < 3;

  // ── Multi-station thermal confirmation ────────────────────────────
  // Count ALL stations (lakeshore, reference, ridge, allReadings) that
  // show wind from the spot's thermal direction. This works for any spot.
  let thermalConfirmCount = eiActive ? 1 : 0;
  const confirmers = [];

  // Check all lakeshore, reference, and ridge stations
  const allNetworkStations = [
    ...(obs.lakeshore || []),
    ...(obs.reference || []),
    ...(obs.ridge || []),
  ];
  for (const s of allNetworkStations) {
    if (s.speed >= 3 && inWideThermalDir(s.dir)) {
      thermalConfirmCount++;
      confirmers.push(`${s.id} ${Math.round(s.speed)} mph`);
    }
  }

  // Also check key allReadings stations (pressure pair, early indicator's chain)
  const pressureHighSt = obs.allReadings?.[obs.pressureHighId];
  const pressureLowSt = obs.allReadings?.[obs.pressureLowId];
  if (pressureLowSt && pressureLowSt.speed >= 4 && inWideThermalDir(pressureLowSt.dir)) {
    thermalConfirmCount++;
    confirmers.push(`${obs.pressureLowId} ${Math.round(pressureLowSt.speed)} mph`);
  }
  if (pressureHighSt && pressureHighSt.speed >= 4 && inWideThermalDir(pressureHighSt.dir)) {
    thermalConfirmCount++;
  }

  // Ground truth / PWS thermal check
  const pwsReading = obs.pws || obs.groundTruth;
  const pwsThermal = pwsReading && inThermalDir(pwsReading.dir) && pwsReading.speed >= 8;
  const pwsBuilding = pwsReading && inWideThermalDir(pwsReading.dir) && pwsReading.speed >= 5;

  // ── Classification cascade ────────────────────────────────────────
  if (pwsThermal) {
    const helpers = confirmers.slice(0, 3).join(', ');
    result.regime = regimeName; result.confidence = 0.9;
    result.description = `${primaryType || 'Thermal'} confirmed at ground truth: ${Math.round(pwsReading.speed)} mph` + (helpers ? ` (${helpers})` : '');
    result.qsfSignal = eiActive;
  } else if (eiActive && thermalConfirmCount >= 3) {
    result.regime = regimeName; result.confidence = 0.85;
    result.description = `${primaryType || 'Thermal'} confirmed: ${eiId} ${Math.round(ei.speed)} mph + ${thermalConfirmCount - 1} stations`;
    result.qsfSignal = true;
  } else if (eiActive) {
    result.regime = regimeName; result.confidence = 0.7;
    result.description = `${primaryType || 'Thermal'} building: ${eiId} ${Math.round(ei.speed)} mph`;
    result.qsfSignal = true;
  } else if (thermalConfirmCount >= 3) {
    result.regime = regimeName; result.confidence = 0.75;
    result.description = `${primaryType || 'Thermal'} confirmed by ${thermalConfirmCount} stations`;
    result.qsfSignal = false;
  } else if (pwsBuilding || thermalConfirmCount >= 2) {
    result.regime = regimeName; result.confidence = 0.6;
    result.description = pwsBuilding
      ? `${primaryType || 'Thermal'} building at ground truth: ${Math.round(pwsReading.speed)} mph`
      : `${primaryType || 'Thermal'} flow on ${thermalConfirmCount} stations`;
    result.qsfSignal = false;
  } else if (northFlow) {
    result.regime = 'north_flow'; result.confidence = 0.6; result.description = 'N/NW flow detected';
  } else if (clearing && overallAnomaly > 1.0) {
    result.regime = 'postfrontal_clearing'; result.confidence = 0.5; result.description = 'Post-frontal clearing wind';
  } else if (thermalFlow) {
    result.regime = regimeName; result.confidence = 0.5; result.description = `${primaryType || 'Thermal'} flow (weaker signal)`;
  } else if (calm) {
    result.regime = 'calm'; result.confidence = 0.5; result.description = 'Calm conditions';
  } else {
    result.regime = 'transitional'; result.confidence = 0.3; result.description = 'Transition / mixed signals';
  }

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

  // Ground truth early-exit: if PWS is already showing solid wind, mark arrived.
  // But don't mark "arrived" at marginal speeds (5-7 mph) if upstream indicators
  // are much stronger — that's a "building" situation, not "arrived."
  const gtWind = obs.groundTruth || obs.pws;
  const gtSpeed = gtWind?.speed ?? 0;
  const upstreamMax = Math.max(
    ...[obs.earlyIndicator?.speed, ...obs.lakeshore.map(s => s.speed), ...obs.reference.map(s => s.speed)]
      .filter(s => s != null && s > 0)
  ) || 0;
  const upstreamMuchStronger = upstreamMax > gtSpeed * 1.5 && upstreamMax >= 10;

  if (gtSpeed >= 8) {
    result.phase = 'arrived';
    result.eta = 0;
    result.expectedSpeed = upstreamMuchStronger ? Math.max(gtSpeed, upstreamMax * 0.75) : gtSpeed;
    result.lagConfidence = 0.9;
    result.dominantSource = obs.groundTruthId || 'PWS';
    if (!upstreamMuchStronger) return result;
    // When upstream is much stronger, continue to gather chain/indicator data
    // but keep the "arrived" phase — wind is here AND still building
  }
  if (gtSpeed >= 5 && !upstreamMuchStronger) {
    result.phase = 'arrived';
    result.eta = 0;
    result.expectedSpeed = gtSpeed;
    result.lagConfidence = 0.7;
    result.dominantSource = obs.groundTruthId || 'PWS';
  }

  const gtId = obs.groundTruthId;
  const lagCorr = context?.lagCorrelations;

  // Normalize lag correlations: Redis stores object map "UP→DOWN" → { upstream, downstream, peakCorrelation, optimalLagMinutes }
  const lagPairs = !lagCorr
    ? []
    : Array.isArray(lagCorr)
      ? lagCorr
      : Object.values(lagCorr).filter((x) => x && x.upstream && x.downstream);

  // Use learned lag correlations when available
  if (lagPairs.length > 0 && gtId) {
    let bestUpstream = null;
    let bestR = 0;
    let bestLag = 0;

    for (const pair of lagPairs) {
      if (pair.downstream !== gtId) continue;
      const upReading = obs.allReadings[pair.upstream];
      if (!upReading || upReading.speed < 3) continue;

      const r = typeof pair.peakCorrelation === 'number'
        ? pair.peakCorrelation
        : typeof pair.correlation === 'number'
          ? pair.correlation
          : parseFloat(pair.peakCorrelation ?? pair.correlation) || 0;
      if (r > bestR) {
        bestR = r;
        bestUpstream = { id: pair.upstream, ...upReading };
        const lm = pair.optimalLagMinutes ?? pair.lagMinutes;
        bestLag = typeof lm === 'number' ? lm : parseInt(lm, 10) || 30;
      }
    }

    if (bestUpstream && bestR > 0.3) {
      // Regime-dependent ratios: north flow has much higher FPS→PWS ratio
      const KNOWN_RATIOS_SE = { FPS: 1.7, KPVU: 1.2, UTALP: 1.3, KSLC: 1.4 };
      const KNOWN_RATIOS_N  = { FPS: 2.8, KPVU: 1.5, UTALP: 1.5, KSLC: 1.6 };
      const KNOWN_RATIOS = regime.regime === 'north_flow' ? KNOWN_RATIOS_N : KNOWN_RATIOS_SE;

      let ratio;
      if (obs.groundTruth?.speed > 0 && bestUpstream.speed > 0) {
        ratio = obs.groundTruth.speed / bestUpstream.speed;
      } else {
        const knownR = KNOWN_RATIOS[bestUpstream.id];
        ratio = knownR ? (1 / knownR) : 0.6;
      }

      result.dominantSource = bestUpstream.id;
      result.lagConfidence = bestR;
      result.expectedSpeed = bestUpstream.speed * (ratio > 0.05 ? ratio : 0.6);

      const gtSpeed = obs.groundTruth?.speed ?? 0;
      const proxySpeed = gtSpeed > 0 ? gtSpeed
        : obs.lakeshore.length > 0 ? obs.lakeshore[0].speed / (KNOWN_RATIOS[obs.lakeshore[0].id] || 1) : 0;

      if (proxySpeed >= 5) {
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

  // QSF (Spanish Fork Canyon) is the primary SE thermal predictor for Zigzag.
  // When QSF shows SE ≥ 6 mph, that's a stronger signal than FPS for whether
  // wind will reach the lake. QSF→PWS has a ~2hr lag but a tighter correlation
  // than FPS→PWS (FPS often reads high wind that doesn't propagate to Zigzag).
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

      // QSF SE maps roughly 0.75:1 to PWS (validated over 3yr backtest).
      // With KPVU confirming SE, bump to 0.8.
      if (!obs.groundTruth?.speed && regime.regime === 'se_thermal') {
          const kpvu = obs.allReadings?.KPVU;
          const kpvuConfirmed = kpvu && kpvu.dir != null && kpvu.dir >= 120 && kpvu.dir <= 200 && kpvu.speed >= 4;
          const qsfRatio = kpvuConfirmed ? 0.8 : 0.7;
          const qsfEstimate = eiWind.speed * qsfRatio;
          if (!result.expectedSpeed || qsfEstimate > result.expectedSpeed) {
            result.expectedSpeed = qsfEstimate;
            result.dominantSource = obs.earlyIndicatorId;
          }
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

function calibrate(regime, pressure, propagation, context, hour, month, obs) {
  let probability = 50;
  let confidence = 0.5;
  let speedMultiplier = 1.0;

  // Base probability from regime — config-driven for any spot
  const isThermalRegime = ['se_thermal', 'canyon_thermal', 'thermal', 'south_flow'].includes(regime.regime);
  if (isThermalRegime) {
    probability = regime.qsfSignal && regime.confidence >= 0.8 ? 75
      : regime.confidence >= 0.85 ? 75
      : regime.confidence >= 0.6 ? 60
      : 50;
  } else {
    switch (regime.regime) {
      case 'north_flow': probability = 55; break;
      case 'postfrontal_clearing': probability = 55; break;
      case 'calm': probability = 15; break;
      case 'transitional': probability = 35; break;
      default: probability = 30;
    }
  }

  // ── NORTH FLOW GATE ──────────────────────────────────────────────
  // FPS often reads 2.5-3x what Zigzag (PWS) actually gets in north flow.
  // Require corroborating evidence from corridor stations before trusting GO.
  // WU PWS stations fill the Draper→Bluffdale→Riverton gap with 5-min data.
  if (regime.regime === 'north_flow') {
    const kpvu = obs.allReadings?.KPVU;
    const kslc = obs.allReadings?.KSLC;
    const qsf = obs.allReadings?.QSF;
    const ut7 = obs.allReadings?.UT7;
    const utpcr = obs.allReadings?.UTPCR;

    const kpvuWind = kpvu?.speed >= 8;
    const kslcWind = kslc?.speed >= 8;
    const qsfWind = qsf?.speed >= 5;
    const ut7Wind = ut7?.speed >= 5 && ut7?.dir != null && (ut7.dir >= 315 || ut7.dir <= 45);
    const utpcrWind = utpcr?.speed >= 4 && utpcr?.dir != null && (utpcr.dir >= 300 || utpcr.dir <= 60);

    // WU PWS corroboration: trained from 90 days of cross-validation.
    // KUTBLUFF18 and KUTRIVER67 are best north flow indicators (0.65x and 0.67x of PWS).
    // KUTSARAT62 actually sees 1.13x of PWS in north flow — strongest WU signal.
    const isNorth = (d) => d != null && (d >= 315 || d <= 45);
    const wuDrape = obs.allReadings?.KUTDRAPE132;
    const wuBluff = obs.allReadings?.KUTBLUFF18;
    const wuRiver = obs.allReadings?.KUTRIVER67;
    const wuSS62 = obs.allReadings?.KUTSARAT62;
    const wuDrapeWind = wuDrape?.speed >= 3 && isNorth(wuDrape?.dir);
    const wuBluffWind = wuBluff?.speed >= 4 && isNorth(wuBluff?.dir);
    const wuRiverWind = wuRiver?.speed >= 4 && isNorth(wuRiver?.dir);
    const wuSS62Wind = wuSS62?.speed >= 5 && isNorth(wuSS62?.dir);
    const wuNorthCount = (wuDrapeWind ? 1 : 0) + (wuBluffWind ? 1 : 0) + (wuRiverWind ? 1 : 0) + (wuSS62Wind ? 1 : 0);

    const corroborating = (kpvuWind ? 1 : 0) + (kslcWind ? 1 : 0) + (qsfWind ? 1 : 0)
      + (ut7Wind ? 1 : 0) + (utpcrWind ? 1 : 0) + Math.min(wuNorthCount, 2);

    if (corroborating >= 4) {
      probability = Math.min(probability * 1.2, 80);
      confidence = Math.max(confidence, 0.7);
    } else if (corroborating >= 3) {
      probability = Math.min(probability * 1.15, 75);
      confidence = Math.max(confidence, 0.6);
    } else if (corroborating >= 2) {
      probability = Math.min(probability * 1.1, 70);
      confidence = Math.max(confidence, 0.55);
    } else if (corroborating === 1) {
      probability *= 0.75;
    } else {
      probability *= 0.45;
    }

    if (pressure.gradient != null && pressure.gradient > 2.5) {
      probability = Math.min(probability * 1.15, 75);
    }
  }

  // ── THERMAL INDICATOR GATE (generic — works for any spot) ────────
  // Uses the spot's configured earlyIndicator + all lakeshore/reference
  // stations to confirm or deny the thermal regime.
  const isThermal = ['se_thermal', 'canyon_thermal', 'thermal', 'south_flow'].includes(regime.regime);
  const spotConfig = context?._config;
  const thermalDir = spotConfig?.thermal?.optimalDirection;
  const tdMin = thermalDir?.min ?? 100;
  const tdMax = thermalDir?.max ?? 200;
  // Wider range for confirmation (+/- 30°)
  const wMin = (tdMin - 30 + 360) % 360;
  const wMax = (tdMax + 30) % 360;
  const wWrap = wMin > wMax;
  const inWideThDir = (d) => {
    if (d == null) return false;
    return wWrap ? (d >= wMin || d <= wMax) : (d >= wMin && d <= wMax);
  };

  if (isThermal && obs?.earlyIndicator) {
    const ei = obs.earlyIndicator;
    const eiInDir = inWideThDir(ei.dir);
    const eiTrigger = spotConfig?.stations?.earlyIndicator?.trigger;
    const eiStrong = ei.speed >= (eiTrigger?.speed?.min ?? 6);

    // Count all lakeshore + reference stations confirming thermal direction
    let midConfirm = 0;
    for (const s of [...(obs.lakeshore || []), ...(obs.reference || [])]) {
      if (s.speed >= 3 && inWideThDir(s.dir)) midConfirm++;
    }

    if (eiInDir && eiStrong && midConfirm >= 3) {
      probability = Math.max(probability, 80);
      confidence = Math.max(confidence, 0.75);
    } else if (eiInDir && eiStrong && midConfirm >= 2) {
      probability = Math.max(probability, 75);
      confidence = Math.max(confidence, 0.7);
    } else if (eiInDir && eiStrong && midConfirm >= 1) {
      probability = Math.max(probability, 70);
      confidence = Math.max(confidence, 0.65);
    } else if (eiInDir && eiStrong) {
      probability = Math.max(probability, 60);
      confidence = Math.max(confidence, 0.5);
    } else if (eiInDir) {
      probability = probability * 0.85;
    } else {
      probability *= 0.5;
    }
  } else if (isThermal && !obs?.earlyIndicator) {
    // No early indicator reporting — check the full station network
    let confirmCount = 0;
    for (const s of [...(obs.lakeshore || []), ...(obs.reference || []), ...(obs.ridge || [])]) {
      if (s.speed >= 3 && inWideThDir(s.dir)) confirmCount++;
    }

    if (confirmCount >= 3) {
      probability = Math.max(probability, 70);
      confidence = Math.max(confidence, 0.65);
    } else if (confirmCount >= 2) {
      probability = Math.max(probability, 60);
      confidence = Math.max(confidence, 0.55);
    } else if (confirmCount >= 1) {
      probability *= 0.85;
    } else {
      probability *= 0.7;
    }
  }

  // ── TEMPERATURE DELTA THERMAL BOOST ────────────────────────────
  // Valley-ridge temperature differential drives thermal strength.
  // ΔT > 25°F = strong pump, > 35°F = very strong.
  if (isThermal && pressure.elevationDelta != null) {
    const dt = pressure.elevationDelta;
    if (dt >= 35) {
      probability = Math.max(probability, 70);
      confidence = Math.max(confidence, 0.65);
    } else if (dt >= 25) {
      probability = Math.max(probability, 55);
      confidence = Math.max(confidence, 0.55);
    } else if (dt < 15 && hour >= 10 && hour <= 16) {
      probability *= 0.8;
    }
  }

  // Thermal profiles from 365-day analysis (hourlyProbability[h] is 0–100 from historicalAnalysis)
  if (context?.thermalProfiles) {
    const profiles = context.thermalProfiles;
    for (const [, lakeProfile] of Object.entries(profiles)) {
      const hp = lakeProfile?.hourlyProbability?.[hour];
      if (hp != null && typeof hp === 'number') {
        // Blend 70% current model + 30% climatology (was 60/40 — less dilution)
        probability = probability * 0.7 + hp * 0.3;
        break;
      }
    }
  }

  // Pressure bust override — applies to ALL thermal regimes, not just SE
  if (pressure.thermalBusted && isThermal) {
    probability *= 0.2;
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
    probability = Math.max(probability, 80);
    confidence = Math.max(confidence, 0.75);
  } else if (propagation.phase === 'building' || propagation.phase === 'approaching') {
    probability = Math.max(probability, 50);
  }

  // Lag correlation confidence
  if (propagation.lagConfidence > 0.5) {
    confidence = Math.max(confidence, propagation.lagConfidence * 0.8);
  }

  // ── EVENING DECAY ────────────────────────────────────────────────
  // Thermal wind at Zigzag (PWS) dies off faster than meso stations show.
  // After 17:00, upstream stations still read high but PWS drops rapidly.
  // Backtest: 18:00 precision 40%, 19:00 precision 31% — too many false GO.
  if (hour >= 17) {
    const decayFactors = { 17: 0.85, 18: 0.6, 19: 0.45 };
    const decay = decayFactors[hour] ?? 0.4;
    probability *= decay;
    speedMultiplier *= (decay + (1 - decay) * 0.3);
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

  // ── GROUND TRUTH OVERRIDE (final) ─────────────────────────────────
  // If the PWS / ground truth station IS ALREADY reporting kiteable SE
  // wind, the thermal is here — no indicator chain, calibration curve,
  // or hourly multiplier can override observed reality on the ground.
  // This is the last gate before output so nothing can suppress it.
  const gt = obs?.groundTruth || obs?.pws;
  const gtSpeed = gt?.speed ?? 0;
  const gtDir = gt?.dir;
  const gtIsSE = gtDir != null && gtDir >= 100 && gtDir <= 200;
  const gtIsKiteable = gtSpeed >= 8 && gtIsSE;
  const gtIsBuildingSE = gtSpeed >= 5 && gtIsSE;

  if (gtIsKiteable) {
    probability = Math.max(probability, 85);
    confidence = Math.max(confidence, 0.85);
  } else if (gtIsBuildingSE) {
    probability = Math.max(probability, 70);
    confidence = Math.max(confidence, 0.7);
  }

  // Also override for any regime: if GT is showing real wind >= 10 mph
  // from any direction, don't let the model say < 60%
  if (gtSpeed >= 10) {
    probability = Math.max(probability, 75);
    confidence = Math.max(confidence, 0.75);
  } else if (gtSpeed >= 6) {
    probability = Math.max(probability, 55);
    confidence = Math.max(confidence, 0.55);
  }

  probability = clamp(probability, 0, 95);
  confidence = clamp(confidence, 0, 0.95);

  return { probability, confidence, speedMultiplier };
}

// ═══════════════════════════════════════════════════════════════════
//  STEP 7: SCORE — per-activity scoring
// ═══════════════════════════════════════════════════════════════════

function scoreActivity(activityId, speed, gust, probability, dir, _config) {
  const p = PROFILES[activityId];
  if (!p) return { score: 50, status: 'unknown', message: '' };

  const gustFactor = (gust && speed > 0) ? gust / speed : 1.0;
  let score = 0;

  if (p.wantsWind) {
    // For wind sports, blend sustained and gust: gusts = rideable peaks
    const rideableSpeed = gust > speed ? speed * 0.65 + gust * 0.35 : speed;

    if (rideableSpeed >= p.idealMin && rideableSpeed <= p.idealMax) {
      score = 80 + 20 * (1 - Math.abs(rideableSpeed - (p.idealMin + p.idealMax) / 2) / ((p.idealMax - p.idealMin) / 2));
    } else if (rideableSpeed >= p.min && rideableSpeed < p.idealMin) {
      score = 30 + 50 * ((rideableSpeed - p.min) / Math.max(1, p.idealMin - p.min));
    } else if (rideableSpeed > p.idealMax && rideableSpeed <= p.max) {
      score = 40 + 40 * (1 - (rideableSpeed - p.idealMax) / Math.max(1, p.max - p.idealMax));
    } else if (rideableSpeed < p.min) {
      score = Math.max(0, 20 * (rideableSpeed / p.min));
    } else {
      score = Math.max(0, 20 * (1 - (rideableSpeed - p.max) / 10));
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

  // Weight by model probability — but don't punish too hard when probability
  // is moderate, because upstream indicators may already be firing
  if (p.wantsWind && probability < 50 && probability > 0) {
    score = score * 0.7 + score * 0.3 * (probability / 50);
  } else if (p.wantsWind && probability === 0) {
    score = score * 0.6;
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

const ACTIVITY_VERBS = {
  kiting: 'kite', snowkiting: 'snowkite', sailing: 'sail',
  windsurfing: 'windsurf', paragliding: 'fly',
  boating: 'get out on the water', paddling: 'paddle', fishing: 'fish',
};

function decide(activity, activityScore, speed, gust, dir, _probability, propagation, _pressure) {
  const p = PROFILES[activity];
  if (!p) return { decision: 'WAIT', confidence: 0.3, headline: 'Checking conditions...', detail: '', action: '' };

  const verb = ACTIVITY_VERBS[activity] || activity;
  const cardinal = getCardinal(dir);
  const spd = Math.round(speed);
  const gstStr = gust ? ` with ${Math.round(gust)} mph gusts` : '';

  if (activityScore.status === 'dangerous') {
    return {
      decision: 'PASS',
      confidence: 0.9,
      headline: `Don't ${verb} today — ${spd} mph${gstStr} is dangerous`,
      detail: `Wind is well above safe limits. Stay home and wait for calmer conditions.`,
      action: `Not safe to ${verb} right now`,
    };
  }

  // Upstream confidence: are indicators strongly confirming wind?
  const hasActiveUpstreamChains = propagation.chains?.some(c => c.status === 'active' || c.status === 'strong');
  const upstreamExpected = propagation.expectedSpeed ?? 0;
  const upstreamConfirmed = hasActiveUpstreamChains || upstreamExpected >= (p.min || 8);
  // For wind sports: gusts matter. If gusts are in the rideable range, factor that in.
  const effectiveSpeed = p.wantsWind && gust > speed ? (speed * 0.6 + gust * 0.4) : speed;

  if (activityScore.score >= 70) {
    return {
      decision: 'GO',
      confidence: clamp(activityScore.score / 100, 0.6, 0.95),
      headline: p.wantsWind
        ? `You should go ${verb} today — ${spd} mph ${cardinal}${gstStr}`
        : `Great time to ${verb} — calm at ${spd} mph`,
      detail: activityScore.message,
      action: p.wantsWind
        ? `Conditions are dialed. Get out there.`
        : `Smooth water — perfect conditions right now`,
    };
  }

  // Wind is here + upstream confirms it's going to stay or build → GO
  if (p.wantsWind && effectiveSpeed >= p.min && upstreamConfirmed && activityScore.score >= 40) {
    const peakStr = upstreamExpected > speed ? ` Building to ~${Math.round(upstreamExpected)} mph.` : '';
    return {
      decision: 'GO',
      confidence: clamp(0.6 + (upstreamExpected > speed ? 0.15 : 0), 0.5, 0.85),
      headline: `${spd} mph ${cardinal}${gstStr} — go ${verb}!${peakStr ? ' Building.' : ''}`,
      detail: `Wind is here and upstream confirms it's building.${peakStr}`,
      action: effectiveSpeed >= p.idealMin
        ? `Conditions are good — get on the water now`
        : `Rideable now and improving — bring your biggest kite`,
    };
  }

  if (propagation.phase === 'building' || propagation.phase === 'approaching') {
    const etaMin = propagation.eta || 60;
    const upstream = propagation.dominantSource;
    const expectedSpd = Math.round(propagation.expectedSpeed || 0);
    return {
      decision: 'WAIT',
      confidence: clamp(propagation.lagConfidence, 0.3, 0.8),
      headline: `Wind is building — should be good to ${verb} by ${formatETA(_pressure?._hour ?? 12, etaMin)}`,
      detail: upstream
        ? `${upstream} is showing ${expectedSpd} mph upstream. Give it about ${etaMin} minutes to arrive.`
        : `Upstream stations showing wind building. Keep an eye on it.`,
      action: `Start getting ready — wind should arrive in ~${etaMin} min`,
    };
  }

  if (activityScore.score >= 40) {
    if (p.wantsWind && upstreamConfirmed) {
      return {
        decision: 'WAIT',
        confidence: 0.5,
        headline: `${spd} mph and building — upstream looks strong`,
        detail: `Currently marginal but upstream stations confirm wind is on the way.`,
        action: `Get your gear ready — conditions are improving`,
      };
    }
    return {
      decision: 'WAIT',
      confidence: 0.4,
      headline: `There's a chance today but it could bust — ${spd} mph right now`,
      detail: `Marginal conditions. ${p.wantsWind ? 'It might pick up, or it might stay light.' : 'Could get rougher.'}`,
      action: `Keep watching — don't drive to the spot yet`,
    };
  }

  // Before giving up with PASS, check if upstream stations show wind building.
  // This prevents contradictions with the LaunchBriefing which sees the same upstream data.
  const hasActiveUpstream = propagation.chains?.some(c => c.status === 'active' || c.status === 'strong');
  const expectedArrival = propagation.expectedSpeed ?? 0;
  if (p.wantsWind && (hasActiveUpstream || expectedArrival >= p.min)) {
    const etaMin = propagation.eta || 60;
    return {
      decision: 'WAIT',
      confidence: clamp(propagation.lagConfidence || 0.4, 0.3, 0.7),
      headline: `Wind building upstream — could be rideable by ${formatETA(_pressure?._hour ?? 12, etaMin)}`,
      detail: propagation.dominantSource
        ? `${propagation.dominantSource} showing ${Math.round(expectedArrival || propagation.chains?.[0]?.speed || 0)} mph — give it time to propagate`
        : `Upstream indicators active. Currently ${spd} mph but building.`,
      action: `Get your gear ready — wind should build in ~${etaMin} min`,
    };
  }

  return {
    decision: 'PASS',
    confidence: clamp(1 - activityScore.score / 100, 0.5, 0.9),
    headline: p.wantsWind
      ? `It's not going to be windy today — probably skip ${activity}`
      : `Too windy to ${verb} right now — ${spd} mph`,
    detail: p.wantsWind
      ? `Only ${spd} mph and no signs of it picking up. Save the drive.`
      : `${spd} mph is making the water rough. Wait for it to calm down.`,
    action: p.wantsWind ? `Not worth the trip today` : `Wait for calmer conditions`,
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

  let bestAction = '';
  if (decision.decision === 'GO') {
    const hoursLeft = Math.max(1, 18 - hour);
    bestAction = hoursLeft >= 4
      ? `You've got all afternoon — good conditions for the next ${hoursLeft}+ hours`
      : `Window is closing — maybe ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} of light left`;
  } else if (decision.decision === 'WAIT' && propagation.eta) {
    bestAction = `Be ready by ${formatETA(hour, propagation.eta)} — start getting your gear together`;
  } else if (decision.decision === 'PASS') {
    bestAction = `Save the drive. Check back tomorrow or try a different spot.`;
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

function buildHourlyForecast(lakeId, context, calibrationResult, regime, propagation) {
  const gridKey = LAKE_TO_GRID[lakeId];
  if (!gridKey || !context?.nwsHourly) return [];

  const gridData = context.nwsHourly[gridKey];
  if (!gridData?.periods && !Array.isArray(gridData)) return [];

  const periods = gridData.periods || gridData;
  if (!Array.isArray(periods)) return [];

  const isSEThermal = regime?.regime === 'se_thermal' && regime?.confidence >= 0.5;
  const expectedSpeed = propagation?.expectedSpeed;
  const etaMin = propagation?.eta;
  const liveSpeed = propagation?.phase === 'arrived' ? expectedSpeed : 0;
  const nowHour = new Date().getHours();

  return periods.slice(0, 24).map(p => {
    let speed = p.windSpeed;
    if (typeof speed === 'string') speed = parseFloat(speed) || 0;

    let adjustedSpeed = speed * (calibrationResult?.speedMultiplier ?? 1.0);
    const periodTime = new Date(p.startTime || p.time);
    const periodHour = periodTime.getHours();

    // Override current hour with live readings when live > NWS
    if (periodHour === nowHour && liveSpeed > adjustedSpeed) {
      adjustedSpeed = liveSpeed;
    }

    // Thermal window: 8 AM - 6 PM (NWS routinely misses lake thermals)
    if (isSEThermal && expectedSpeed > adjustedSpeed) {
      const thermalWindow = periodHour >= 8 && periodHour <= 18;

      if (thermalWindow) {
        const now = new Date();
        const hoursFromNow = (periodTime - now) / 3600000;
        const etaHours = (etaMin || 90) / 60;

        if (hoursFromNow <= 0 || hoursFromNow >= etaHours - 0.5) {
          const thermalPeak = expectedSpeed * (calibrationResult?.speedMultiplier ?? 1.0);
          const peakHour = 13;
          const distFromPeak = Math.abs(periodHour - peakHour);
          const thermalShape = Math.max(0.5, 1.0 - distFromPeak * 0.1);
          const thermalSpeed = thermalPeak * thermalShape;

          if (thermalSpeed > adjustedSpeed) {
            adjustedSpeed = Math.round(thermalSpeed * 10) / 10;
          }
        }
      }
    }

    return {
      time: p.startTime || p.time,
      speed: Math.round(adjustedSpeed * 10) / 10,
      nwsSpeed: speed,
      dir: p.windDirection,
      temperature: p.temperature,
      shortForecast: p.shortForecast || '',
      thermalBoosted: adjustedSpeed > speed,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
//  PARAGLIDING SPECIAL HANDLING
// ═══════════════════════════════════════════════════════════════════

function paraglidingOverride(lakeId, obs, activities, decision, _propagation) {
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
  // If wind is already blowing kiteable, windProbability must reflect reality
  const windProb = speed >= 10 ? Math.max(calibration.probability, 85)
    : speed >= 8 ? Math.max(calibration.probability, 75)
    : speed >= 5 ? Math.max(calibration.probability, 60)
    : calibration.probability;

  // Status: if wind is already here, it's active — not "building"
  const status = speed >= 8 ? 'active'
    : windProb > 60 ? 'active'
    : windProb > 30 ? 'building'
    : 'quiet';

  // startHour: when do we expect usable wind?
  // Don't suppress startHour just because ground truth shows marginal 5 mph —
  // if upstream is building, wind hasn't truly "arrived" for wind sports.
  const upstreamBuilding = propagation.phase === 'building' || propagation.phase === 'approaching'
    || propagation.chains?.some(c => c.status === 'active' || c.status === 'strong');
  let startHour;
  if (speed >= 8) {
    startHour = null;
  } else if (speed >= 5 && !upstreamBuilding) {
    startHour = null;
  } else if ((propagation.phase === 'approaching' || propagation.phase === 'building') && propagation.eta) {
    startHour = hour + Math.ceil(propagation.eta / 60);
  } else if (hour < 10) {
    startHour = 10;
  } else {
    startHour = null;
  }

  // thermalPrediction shape expected by older components
  const thermalPrediction = {
    probability: windProb,
    windProbability: windProb,
    confidence: calibration.confidence,
    regime: regime.regime,
    status,
    arrivalTime: propagation.eta && speed < 5 ? formatETA(hour, propagation.eta) : null,
    startHour,
    endHour: 17,
    expectedSpeed: Math.max(propagation.expectedSpeed || 0, speed, gust ? gust * 0.85 : 0),
    pressureGradient: pressure.gradient,
    thermalBusted: pressure.thermalBusted,
    description: regime.description,
    northFlow: pressure.northFlowRisk ? {
      status: pressure.gradient > 3 ? 'strong' : 'moderate',
      persistenceHours: pressure.gradient > 2 ? 2 : 1,
    } : null,
    phase: propagation.phase,
    speed: { expectedAvg: Math.max(propagation.expectedSpeed || 0, speed) },
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

export function predict(lakeId, activity, liveStations, modelContext, config, options = {}) {
  const now = options.referenceDate instanceof Date ? options.referenceDate : new Date();
  const hour = modelContext?.currentHour ?? denverHour(now);
  const month = modelContext?.currentMonth ?? denverMonth(now);
  const ctx = modelContext || {};
  ctx._config = config;

  // ─── DAYLIGHT CHECK — Critical for outdoor activities ───────────
  const daylight = calculateDaylight(config?.lat || 40.45, now);
  
  // Activities that REQUIRE daylight (cannot be done safely at night)
  const DAYLIGHT_REQUIRED = ['kiting', 'paragliding', 'wingfoil', 'windsurf', 'sup', 'kayak'];
  const requiresDaylight = DAYLIGHT_REQUIRED.includes(activity);
  
  const _verb = ACTIVITY_VERBS[activity] || activity;
  if (requiresDaylight && daylight.isNight) {
    const nightHeadline = `It's dark out — can't ${_verb} until sunrise at ${formatHour(daylight.sunrise)}`;
    const nightDetail = `Check back in the morning. We'll have conditions ready for you at first light.`;
    const nightAction = `Get some sleep — sunrise is at ${formatHour(daylight.sunrise)}`;
    return {
      // Match normal return structure - decision is a STRING
      decision: 'PASS',
      confidence: 1.0,
      regime: 'night',
      probability: 0,
      speed: 0,
      direction: null,
      // Briefing object for UI
      briefing: {
        headline: nightHeadline,
        body: nightDetail,
        bestAction: nightAction,
        bullets: [`Sunrise at ${formatHour(daylight.sunrise)}`],
      },
      activities: Object.fromEntries(DAYLIGHT_REQUIRED.map(a => [a, { score: 0, status: 'pass', message: 'After dark' }])),
      propagation: { phase: 'night', eta: Math.round((daylight.sunrise - daylight.currentHour + (daylight.currentHour > 12 ? 24 : 0)) * 60) },
      daylight,
      isNight: true,
    };
  }
  
  if (requiresDaylight && daylight.isTwilight) {
    const isMorning = daylight.currentHour < 12;
    const twilightHeadline = isMorning
      ? `Almost sunrise — you can ${_verb} soon at ${formatHour(daylight.sunrise)}`
      : `Sun's going down — time to wrap up`;
    const twilightDetail = isMorning 
      ? `Give it a few more minutes for full light. We're checking conditions for you.`
      : `Sunset was at ${formatHour(daylight.sunset)}. Visibility is dropping — pack it in for safety.`;
    const twilightAction = isMorning ? `Wait for full light around ${formatHour(daylight.sunrise + 0.3)}` : 'Call it a day — great session';
    return {
      // Match normal return structure - decision is a STRING
      decision: 'WAIT',
      confidence: 0.9,
      regime: 'twilight',
      probability: 10,
      speed: 0,
      direction: null,
      // Briefing object for UI
      briefing: {
        headline: twilightHeadline,
        body: twilightDetail,
        bestAction: twilightAction,
        bullets: [isMorning ? `Sunrise at ${formatHour(daylight.sunrise)}` : `Sunset was at ${formatHour(daylight.sunset)}`],
      },
      activities: Object.fromEntries(DAYLIGHT_REQUIRED.map(a => [a, { score: 10, status: 'wait', message: isMorning ? 'Dawn approaching' : 'Dusk — ending' }])),
      propagation: { phase: 'twilight', eta: isMorning ? Math.round((daylight.sunrise - daylight.currentHour) * 60) : 0 },
      daylight,
      isTwilight: true,
    };
  }

  // 1. OBSERVE
  const obs = observe(liveStations, config);

  // 2. CONTEXTUALIZE
  const { overallAnomaly } = contextualize(obs, ctx.climatology, hour);

  // 3. CLASSIFY
  const regime = classify(obs, ctx, overallAnomaly);

  // 4. PROPAGATE
  const prop = propagate(obs, ctx, config, regime);

  // 5. PRESSURE
  const pressure = pressureAnalysis(obs, ctx, config);

  // 6. CALIBRATE
  const cal = calibrate(regime, pressure, prop, ctx, hour, month, obs);

  // ── Wind speed estimation ──────────────────────────────────────
  // Priority: ground truth (PWS) > QSF-based estimate (SE thermal) > lakeshore/ratio > ridge
  let windSpeed = obs.groundTruth?.speed ?? 0;
  let windDir = obs.groundTruth?.dir ?? null;
  let windGust = obs.groundTruth?.gust ?? null;
  let windSource = obs.groundTruthId || null;
  let speedRatioApplied = 1.0;

  if (windSpeed === 0) {
    // For SE thermal: QSF is the best predictor of what PWS will see.
    // QSF SE → PWS roughly 0.75:1 (validated over 3 years of backtest data).
    // FPS overstates by ~1.7x and often has wind that doesn't reach Zigzag.
    const eiSE = regime.regime === 'se_thermal' && regime.qsfSignal
      && obs.earlyIndicator?.speed >= 6;
    if (eiSE) {
      const kpvu = obs.allReadings?.KPVU;
      const kpvuConfirmed = kpvu && kpvu.dir != null && kpvu.dir >= 120 && kpvu.dir <= 200 && kpvu.speed >= 4;
      const qsfRatio = kpvuConfirmed ? 0.8 : 0.7;
      windSpeed = obs.earlyIndicator.speed * qsfRatio;
      windDir = obs.earlyIndicator.dir;
      windGust = null;
      windSource = obs.earlyIndicatorId;
      speedRatioApplied = qsfRatio;
    }
  }

  // WU PWS fallback: KUTSARAT88 (0.83x) and KUTSARAT81 (0.85x) are nearly 1:1
  // with your PWS — much better than FPS (1.7x) for estimating actual beach wind.
  if (windSpeed === 0) {
    const wuBest = ['KUTSARAT88', 'KUTSARAT81', 'KUTSARAT62'].map(id => {
      const r = obs.allReadings?.[id];
      return r?.speed > 0 ? { id, ...r } : null;
    }).filter(Boolean).sort((a, b) => b.speed - a.speed)[0];
    if (wuBest) {
      windSpeed = wuBest.speed;
      windDir = wuBest.dir;
      windGust = wuBest.gust ?? null;
      windSource = wuBest.id;
    }
  }

  if (windSpeed === 0 && obs.lakeshore.length > 0) {
    const ls = obs.lakeshore[0];
    windSpeed = ls.speed;
    windDir = ls.dir;
    windGust = ls.gust;
    windSource = ls.id;
  }
  if (windSpeed === 0 && obs.ridge.length > 0) {
    const r = obs.ridge[0];
    windSpeed = r.speed;
    windDir = r.dir;
    windGust = r.gust;
    windSource = r.id;
  }

  // Regime-dependent speed ratios: north flow FPS overstates 2.5-3x at Zigzag,
  // while SE thermal FPS overstates ~1.7x. Use a higher divisor for north flow.
  // Speed ratios: how much a station overstates vs PWS (Zigzag ground truth).
  // Learned from 90 days of WU PWS + MesoWest cross-validation (2025-12 → 2026-03).
  const FALLBACK_SPEED_RATIOS_SE = {
    FPS: 1.7, KPVU: 1.2, UTALP: 1.3, KSLC: 1.4,
    KUTSARAT88: 0.83, KUTSARAT81: 0.85, KUTSARAT62: 0.39,
    KUTBLUFF18: 0.99, KUTRIVER67: 1.1, KUTDRAPE59: 0.72,
  };
  const FALLBACK_SPEED_RATIOS_N = {
    FPS: 2.8, KPVU: 1.5, UTALP: 1.5, KSLC: 1.6,
    KUTSARAT88: 0.85, KUTSARAT81: 0.75, KUTSARAT62: 1.13,
    KUTBLUFF18: 0.65, KUTRIVER67: 0.67, KUTDRAPE132: 0.39,
  };
  const ratioTable = regime.regime === 'north_flow' ? FALLBACK_SPEED_RATIOS_N : FALLBACK_SPEED_RATIOS_SE;

  if (obs.groundTruthId === 'PWS' && windSource && windSource !== 'PWS'
      && windSource !== obs.earlyIndicatorId) {
    const ratio = ratioTable[windSource];
    if (ratio && ratio > 0) {
      speedRatioApplied = ratio;
      windSpeed = windSpeed / ratio;
      if (windGust != null) windGust = windGust / ratio;
    }
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

  // NWS hourly forecast — enhanced with thermal propagation when QSF signal detected
  const hourly = buildHourlyForecast(lakeId, ctx, cal, regime, prop);

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
      source: windSource || obs.groundTruthId || 'unknown',
      speedRatioApplied,
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

    // Daylight info (for UI sunset warnings)
    daylight: {
      sunrise: daylight.sunrise,
      sunset: daylight.sunset,
      isDaylight: daylight.isDaylight,
      isTwilight: daylight.isTwilight,
      isNight: daylight.isNight,
      daylightHoursRemaining: daylight.daylightHoursRemaining,
      sunsetWarning: daylight.daylightHoursRemaining > 0 && daylight.daylightHoursRemaining < 2
        ? `Only ${daylight.daylightHoursRemaining.toFixed(1)} hours of light remaining — sunset at ${formatHour(daylight.sunset)}`
        : null,
    },

    // Meta
    _lakeId: lakeId,
    _activity: activity,
    _hour: hour,
    _month: month,
    _timestamp: now.toISOString(),
    _version: 'unified-v1',
  };
}
