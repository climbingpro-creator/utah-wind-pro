/**
 * WIND EVENT PREDICTOR
 * 
 * Predicts ALL wind events at any Utah lake:
 * 
 * 1. FRONTAL PASSAGE — cold front arriving, NW-N wind shift
 *    Signals: pressure falling → rapid drop, temp spike then crash,
 *    wind direction clockwise rotation (S→SW→W→NW→N)
 * 
 * 2. NORTH FLOW — sustained cold air push from Great Basin
 *    Signals: SLC>PVU pressure gradient >2mb, NW-N wind at KSLC,
 *    temperature below seasonal norms
 * 
 * 3. SOUTH/CLEARING WIND — post-frontal high pressure build
 *    Signals: pressure rising, clear skies, morning calm →
 *    afternoon S/SW thermal development
 * 
 * 4. THERMAL CYCLE — daily canyon/valley thermal
 *    Signals: morning inversion breaking, differential heating,
 *    Spanish Fork indicator for Utah Lake
 * 
 * 5. PRE-FRONTAL RAMP — wind building ahead of approaching front
 *    Signals: pressure falling slowly, S/SW wind increasing,
 *    high clouds arriving
 * 
 * 6. GLASS/CALM WINDOW — best boating/fishing window
 *    Signals: light winds, low pressure gradient, early AM or
 *    between weather systems
 * 
 * Uses NWS forecast, current conditions, pressure trends, and
 * historical patterns from the learning system.
 */

import { LAKE_CONFIGS } from '../config/lakeStations';

let learnedPatterns = null;
let cachedUpstreamSignals = null;
let upstreamFetchedAt = 0;

export function setWindEventLearnedPatterns(patterns) {
  learnedPatterns = patterns;
}

/**
 * Fetch upstream detection signals from the server.
 * Cached for 5 minutes to avoid excessive API calls.
 */
async function getUpstreamSignals() {
  const now = Date.now();
  if (cachedUpstreamSignals && now - upstreamFetchedAt < 5 * 60000) {
    return cachedUpstreamSignals;
  }
  try {
    const resp = await fetch('/api/cron/collect?action=upstream');
    if (!resp.ok) return [];
    const data = await resp.json();
    cachedUpstreamSignals = data.signals || [];
    upstreamFetchedAt = now;
    return cachedUpstreamSignals;
  } catch {
    return cachedUpstreamSignals || [];
  }
}

export { getUpstreamSignals };

const WIND_EVENT_TYPES = {
  FRONTAL_PASSAGE: {
    id: 'frontal_passage',
    label: 'Frontal Passage',
    icon: '🌬️',
    color: 'red',
    windExpectation: 'Strong NW-N 15-35 mph, gusty, rapid direction shift',
    duration: '2-6 hours of strong wind, then gradual clearing',
    dangerLevel: 'high',
  },
  NORTH_FLOW: {
    id: 'north_flow',
    label: 'North Flow',
    icon: '⬇️',
    color: 'blue',
    windExpectation: 'Sustained N-NW 10-25 mph, steady direction',
    duration: '6-24+ hours, can persist for days',
    dangerLevel: 'moderate',
  },
  CLEARING_WIND: {
    id: 'clearing_wind',
    label: 'Clearing / South Wind',
    icon: '☀️',
    color: 'green',
    windExpectation: 'Light S-SW 5-15 mph, building afternoon thermal',
    duration: '4-8 hours, peaks mid-afternoon',
    dangerLevel: 'low',
  },
  THERMAL_CYCLE: {
    id: 'thermal_cycle',
    label: 'Thermal Cycle',
    icon: '🔥',
    color: 'orange',
    windExpectation: 'SE-S 8-18 mph, builds mid-morning, fades afternoon',
    duration: '3-6 hours, predictable timing',
    dangerLevel: 'low',
  },
  PRE_FRONTAL: {
    id: 'pre_frontal',
    label: 'Pre-Frontal Ramp',
    icon: '📈',
    color: 'yellow',
    windExpectation: 'S-SW increasing 10-20 mph, gusts building',
    duration: '6-12 hours before frontal arrival',
    dangerLevel: 'moderate',
  },
  GLASS: {
    id: 'glass',
    label: 'Glass / Calm',
    icon: '🪞',
    color: 'cyan',
    windExpectation: 'Under 5 mph, mirror-flat water',
    duration: '2-5 hours (typically early AM)',
    dangerLevel: 'none',
  },
  POST_FRONTAL: {
    id: 'post_frontal',
    label: 'Post-Frontal Clearing',
    icon: '🌤️',
    color: 'teal',
    windExpectation: 'NW diminishing 8-15 mph, gradually calming',
    duration: '6-12 hours of decreasing wind',
    dangerLevel: 'low',
  },
};

/**
 * Predict upcoming wind events for a given lake.
 * 
 * @param {string} lakeId - Lake configuration ID
 * @param {object} currentConditions - Current weather readings
 *   { windSpeed, windDirection, windGust, temperature, pressure }
 * @param {object} pressureData - Pressure gradient data
 *   { slcPressure, pvuPressure, gradient, trend, history[] }
 * @param {Array} stationHistory - Recent station readings (3+ hours)
 * @param {object} nwsForecast - NWS 7-day forecast periods (optional)
 * @returns {Array} Predicted wind events sorted by confidence
 */
export function predictWindEvents(lakeId, currentConditions, pressureData, stationHistory = [], nwsForecast = null, upstreamSignals = null) {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return [];

  const events = [];
  const now = new Date();
  const hour = now.getHours();

  const wind = currentConditions || {};
  const speed = wind.windSpeed ?? 0;
  const dir = wind.windDirection;
  const gust = wind.windGust ?? speed;
  const temp = wind.temperature;
  const pressure = pressureData || {};
  const gradient = pressure.gradient ?? 0;
  const pTrend = pressure.trend ?? 'stable';
  const slcP = pressure.slcPressure;
  const pvuP = pressure.pvuPressure;

  // ─── FRONTAL PASSAGE DETECTION ──────────────────────────────
  const frontalScore = scoreFrontalPassage(wind, pressure, stationHistory, hour);

  // Boost with upstream detection network
  const coldFrontUpstream = (upstreamSignals || []).filter(s => s.type === 'cold_front');
  if (coldFrontUpstream.length > 0) {
    const best = coldFrontUpstream[0];
    frontalScore.probability += Math.min(35, best.strength * 0.4);
    if (coldFrontUpstream.length >= 2) frontalScore.probability += 10;
    frontalScore.confidence = Math.min(1, frontalScore.confidence + 0.2);
    frontalScore.details.push(`UPSTREAM: ${best.name} — ${best.details?.[0] || 'front detected'}`);
    if (best.consensusEta || best.etaHours) {
      frontalScore.timing = `ETA ~${(best.consensusEta || best.etaHours).toFixed(1)} hours (${best.name})`;
    }
    frontalScore.upstreamDetection = {
      stations: coldFrontUpstream.map(s => s.name),
      eta: best.consensusEta || best.etaHours,
      strength: best.strength,
    };
  }

  if (frontalScore.probability > 25) {
    events.push({
      ...WIND_EVENT_TYPES.FRONTAL_PASSAGE,
      probability: Math.min(100, frontalScore.probability),
      confidence: frontalScore.confidence,
      timing: frontalScore.timing,
      details: frontalScore.details,
      expectedSpeed: { min: 15, max: 35 },
      expectedDirection: { min: 300, max: 30 },
      upstreamDetection: frontalScore.upstreamDetection || null,
    });
  }

  // ─── NORTH FLOW DETECTION ───────────────────────────────────
  const northScore = scoreNorthFlow(wind, pressure, stationHistory, hour);
  if (northScore.probability > 20) {
    events.push({
      ...WIND_EVENT_TYPES.NORTH_FLOW,
      probability: northScore.probability,
      confidence: northScore.confidence,
      timing: northScore.timing,
      details: northScore.details,
      expectedSpeed: { min: 10, max: 25 },
      expectedDirection: { min: 315, max: 45 },
    });
  }

  // ─── CLEARING / SOUTH WIND ──────────────────────────────────
  const clearingScore = scoreClearingWind(wind, pressure, stationHistory, hour);
  if (clearingScore.probability > 20) {
    events.push({
      ...WIND_EVENT_TYPES.CLEARING_WIND,
      probability: clearingScore.probability,
      confidence: clearingScore.confidence,
      timing: clearingScore.timing,
      details: clearingScore.details,
      expectedSpeed: { min: 5, max: 15 },
      expectedDirection: { min: 160, max: 230 },
    });
  }

  // ─── THERMAL CYCLE ──────────────────────────────────────────
  const thermalScore = scoreThermalCycle(wind, pressure, stationHistory, hour, config);
  if (thermalScore.probability > 15) {
    events.push({
      ...WIND_EVENT_TYPES.THERMAL_CYCLE,
      probability: thermalScore.probability,
      confidence: thermalScore.confidence,
      timing: thermalScore.timing,
      details: thermalScore.details,
      expectedSpeed: {
        min: config.thermal?.optimalSpeed?.min ?? 6,
        max: config.thermal?.optimalSpeed?.max ?? 18,
      },
      expectedDirection: {
        min: config.thermal?.optimalDirection?.min ?? 135,
        max: config.thermal?.optimalDirection?.max ?? 165,
      },
    });
  }

  // ─── PRE-FRONTAL RAMP ──────────────────────────────────────
  const preFrontalScore = scorePreFrontal(wind, pressure, stationHistory, hour, nwsForecast);

  // Boost with upstream SW/W flow detection
  const preFrontalUpstream = (upstreamSignals || []).filter(s => s.type === 'pre_frontal_flow');
  if (preFrontalUpstream.length > 0) {
    const best = preFrontalUpstream[0];
    preFrontalScore.probability += Math.min(30, best.strength * 0.35);
    if (preFrontalUpstream.length >= 2) preFrontalScore.probability += 10;
    preFrontalScore.confidence = Math.min(1, preFrontalScore.confidence + 0.15);
    preFrontalScore.details.push(`UPSTREAM: ${best.name} — ${best.details?.[0] || 'SW flow detected'}`);
  }
  // If a cold front is detected upstream with ETA > 2hr, pre-frontal ramp is likely
  if (coldFrontUpstream.length > 0 && (coldFrontUpstream[0].consensusEta || coldFrontUpstream[0].etaHours) > 2) {
    preFrontalScore.probability += 15;
    preFrontalScore.details.push(`Cold front ETA ~${(coldFrontUpstream[0].consensusEta || coldFrontUpstream[0].etaHours).toFixed(1)}hr — expect ramp-up`);
  }

  if (preFrontalScore.probability > 20) {
    events.push({
      ...WIND_EVENT_TYPES.PRE_FRONTAL,
      probability: preFrontalScore.probability,
      confidence: preFrontalScore.confidence,
      timing: preFrontalScore.timing,
      details: preFrontalScore.details,
      expectedSpeed: { min: 10, max: 20 },
      expectedDirection: { min: 180, max: 250 },
    });
  }

  // ─── GLASS / CALM WINDOW ────────────────────────────────────
  const glassScore = scoreGlassWindow(wind, pressure, stationHistory, hour, config);
  if (glassScore.probability > 30) {
    events.push({
      ...WIND_EVENT_TYPES.GLASS,
      probability: glassScore.probability,
      confidence: glassScore.confidence,
      timing: glassScore.timing,
      details: glassScore.details,
      expectedSpeed: { min: 0, max: 5 },
      expectedDirection: null,
    });
  }

  // ─── POST-FRONTAL CLEARING ──────────────────────────────────
  const postFrontalScore = scorePostFrontal(wind, pressure, stationHistory, hour);
  if (postFrontalScore.probability > 20) {
    events.push({
      ...WIND_EVENT_TYPES.POST_FRONTAL,
      probability: postFrontalScore.probability,
      confidence: postFrontalScore.confidence,
      timing: postFrontalScore.timing,
      details: postFrontalScore.details,
      expectedSpeed: { min: 8, max: 15 },
      expectedDirection: { min: 290, max: 340 },
    });
  }

  // Apply learned pattern adjustments from both client and server weights
  if (learnedPatterns) {
    for (const event of events) {
      // Try event-specific key first (from server merge), then event_hour key (legacy)
      const adjustment = learnedPatterns[event.id] || learnedPatterns[`${event.id}_${hour}`];
      if (adjustment) {
        const bias = adjustment.bias || 0;
        const boost = adjustment.confidenceBoost || 0;
        // Apply hourly bias from server weights if available
        const hourlyBias = adjustment.hourlyBias?.[hour] || 0;
        event.probability = Math.max(0, Math.min(100,
          event.probability * (1 + bias) + hourlyBias
        ));
        event.confidence = Math.min(1, event.confidence + boost);
      }
    }
  }

  return events.sort((a, b) => b.probability - a.probability);
}

// ─── SCORING FUNCTIONS ────────────────────────────────────────

function scoreFrontalPassage(wind, pressure, history, hour) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  const pTrend = pressure.trend;
  const gradient = pressure.gradient ?? 0;

  // Falling pressure is the #1 signal
  if (pTrend === 'falling') {
    score += 25;
    details.push('Pressure falling');
    confidence += 0.1;
  }

  // Strong negative gradient (approaching low)
  if (gradient < -1.5) {
    score += 20;
    details.push(`Strong pressure gradient: ${gradient.toFixed(1)} mb`);
    confidence += 0.1;
  }

  // History: rapid temp drop in last 3 hours
  if (history.length >= 4) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null) {
      const tempDrop = older.temperature - recent.temperature;
      if (tempDrop > 10) {
        score += 30;
        details.push(`${tempDrop.toFixed(0)}°F temp drop — front hitting NOW`);
        confidence += 0.2;
      } else if (tempDrop > 5) {
        score += 15;
        details.push(`${tempDrop.toFixed(0)}°F cooling — front approaching`);
        confidence += 0.1;
      }
    }

    // Direction shift in last hour
    if (recent?.windDirection != null && history.length > 2) {
      const midpoint = history[Math.floor(history.length / 2)];
      if (midpoint?.windDirection != null) {
        const shift = angleDiff(midpoint.windDirection, recent.windDirection);
        if (shift > 90) {
          score += 20;
          details.push(`${shift}° wind shift — frontal boundary`);
          confidence += 0.15;
        }
      }
    }

    // Gust spike
    if (recent?.windGust != null && recent?.windSpeed != null) {
      const gustDiff = recent.windGust - recent.windSpeed;
      if (gustDiff > 12) {
        score += 15;
        details.push(`Gust spike: ${gustDiff.toFixed(0)} mph over sustained`);
        confidence += 0.1;
      }
    }
  }

  // Current NW-N wind with high speed = front in progress
  if (wind.windDirection != null && isNortherly(wind.windDirection) && wind.windSpeed > 15) {
    score += 20;
    details.push(`Strong ${getCardinal(wind.windDirection)} wind ${wind.windSpeed.toFixed(0)} mph`);
    confidence += 0.1;
  }

  return {
    probability: Math.min(95, score),
    confidence: Math.min(1, confidence),
    timing: score > 50 ? 'NOW — Active frontal passage' : 'Next 6-12 hours',
    details,
  };
}

function scoreNorthFlow(wind, pressure, history, hour) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  const gradient = pressure.gradient ?? 0;

  // Positive pressure gradient (SLC > PVU) is THE signal
  if (gradient > 2.0) {
    score += 35;
    details.push(`Gradient ${gradient.toFixed(1)} mb — north flow dominant`);
    confidence += 0.2;
  } else if (gradient > 1.0) {
    score += 15;
    details.push(`Gradient ${gradient.toFixed(1)} mb — north flow possible`);
    confidence += 0.1;
  }

  // Current wind from N-NW
  if (wind.windDirection != null && isNortherly(wind.windDirection)) {
    score += 20;
    details.push(`Current wind from ${getCardinal(wind.windDirection)}`);
    confidence += 0.1;

    if (wind.windSpeed > 10) {
      score += 15;
      details.push(`Sustained ${wind.windSpeed.toFixed(0)} mph`);
      confidence += 0.1;
    }
  }

  // Cold temperature (below-normal suggests cold air advection)
  if (wind.temperature != null) {
    const month = new Date().getMonth();
    const seasonalAvg = [35, 40, 48, 55, 65, 75, 85, 83, 73, 60, 45, 35][month];
    if (wind.temperature < seasonalAvg - 10) {
      score += 15;
      details.push(`Temp ${wind.temperature.toFixed(0)}°F — well below normal`);
      confidence += 0.1;
    }
  }

  // History: sustained northerly over past 3 hours
  if (history.length >= 4) {
    const northCount = history.filter(h => h.windDirection != null && isNortherly(h.windDirection)).length;
    const northPct = northCount / history.length;
    if (northPct > 0.7) {
      score += 15;
      details.push(`${(northPct * 100).toFixed(0)}% northerly in recent history`);
      confidence += 0.1;
    }
  }

  return {
    probability: Math.min(95, score),
    confidence: Math.min(1, confidence),
    timing: score > 50 ? 'Active NOW' : 'Developing',
    details,
  };
}

function scoreClearingWind(wind, pressure, history, hour) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  const pTrend = pressure.trend;

  // Rising pressure after a system
  if (pTrend === 'rising') {
    score += 25;
    details.push('Pressure rising — high building');
    confidence += 0.1;
  }

  // Light current wind
  if (wind.windSpeed != null && wind.windSpeed < 8) {
    score += 15;
    details.push('Light current wind — clearing conditions');
    confidence += 0.05;
  }

  // S-SW direction developing
  if (wind.windDirection != null && wind.windDirection >= 160 && wind.windDirection <= 230) {
    score += 20;
    details.push(`${getCardinal(wind.windDirection)} wind developing`);
    confidence += 0.1;
  }

  // Best during afternoon hours
  if (hour >= 10 && hour <= 16) {
    score += 10;
    details.push('Afternoon heating window');
    confidence += 0.05;
  }

  // Temperature warming trend
  if (history.length >= 4) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null) {
      const warming = recent.temperature - older.temperature;
      if (warming > 5) {
        score += 15;
        details.push(`${warming.toFixed(0)}°F warming — thermal development`);
        confidence += 0.1;
      }
    }
  }

  return {
    probability: Math.min(90, score),
    confidence: Math.min(1, confidence),
    timing: hour < 10 ? 'Building by late morning' : 'Active now through afternoon',
    details,
  };
}

function scoreThermalCycle(wind, pressure, history, hour, config) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  const thermal = config.thermal || {};
  const peakStart = thermal.peakHours?.start ?? 10;
  const peakEnd = thermal.peakHours?.end ?? 14;
  const buildStart = thermal.buildTime?.start ?? 5;
  const optDir = thermal.optimalDirection || {};

  // Time of day is the strongest thermal predictor
  if (hour >= peakStart && hour <= peakEnd) {
    score += 25;
    details.push(`Peak thermal window (${peakStart}–${peakEnd})`);
    confidence += 0.15;
  } else if (hour >= buildStart && hour < peakStart) {
    score += 15;
    details.push('Thermal building phase');
    confidence += 0.1;
  } else {
    score -= 10;
  }

  // Pressure gradient must NOT be strongly positive (would suppress thermal)
  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) {
    score -= 30;
    details.push(`Gradient ${gradient.toFixed(1)} mb — thermal suppressed by north flow`);
  } else if (gradient < 0.5) {
    score += 15;
    details.push('Low gradient — thermal can develop freely');
    confidence += 0.1;
  }

  // Wind from optimal thermal direction
  if (wind.windDirection != null && optDir.min != null) {
    if (isInRange(wind.windDirection, optDir.min, optDir.max)) {
      score += 20;
      details.push(`Wind from ${getCardinal(wind.windDirection)} — thermal direction`);
      confidence += 0.15;
    }
  }

  // Wind speed in thermal range
  const optSpeed = thermal.optimalSpeed || {};
  if (wind.windSpeed != null && wind.windSpeed >= (optSpeed.min || 6) && wind.windSpeed <= (optSpeed.max || 18)) {
    score += 15;
    details.push(`Speed ${wind.windSpeed.toFixed(0)} mph — thermal range`);
    confidence += 0.1;
  }

  return {
    probability: Math.max(0, Math.min(95, score)),
    confidence: Math.min(1, confidence),
    timing: hour < peakStart ? `Peaks ${peakStart}–${peakEnd}` : 'Active now',
    details,
  };
}

function scorePreFrontal(wind, pressure, history, hour, nwsForecast) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  // Slowly falling pressure
  if (pressure.trend === 'falling') {
    score += 20;
    details.push('Pressure falling ahead of system');
    confidence += 0.1;
  }

  // S-SW wind increasing
  if (wind.windDirection != null && wind.windDirection >= 180 && wind.windDirection <= 250) {
    score += 15;
    details.push(`${getCardinal(wind.windDirection)} flow — pre-frontal signature`);
    confidence += 0.1;

    if (wind.windSpeed > 10) {
      score += 10;
      details.push(`Speed increasing: ${wind.windSpeed.toFixed(0)} mph`);
    }
  }

  // Acceleration in history
  if (history.length >= 4) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.windSpeed != null && older?.windSpeed != null) {
      const speedIncrease = recent.windSpeed - older.windSpeed;
      if (speedIncrease > 5) {
        score += 15;
        details.push(`Wind accelerating +${speedIncrease.toFixed(0)} mph in 3hr`);
        confidence += 0.1;
      }
    }
  }

  // NWS forecast mentions front
  if (nwsForecast?.periods) {
    const next24 = nwsForecast.periods.slice(0, 4);
    for (const period of next24) {
      const text = (period.detailedForecast || period.shortForecast || '').toLowerCase();
      if (text.includes('front') || text.includes('cold') || text.includes('storm') || text.includes('breezy') || text.includes('windy')) {
        score += 20;
        details.push(`NWS: "${period.name}" mentions wind/front`);
        confidence += 0.15;
        break;
      }
    }
  }

  return {
    probability: Math.min(90, score),
    confidence: Math.min(1, confidence),
    timing: 'Next 6-12 hours',
    details,
  };
}

function scoreGlassWindow(wind, pressure, history, hour, config) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  const glassWindow = config.glassWindow || {};
  const typicalStart = glassWindow.typicalStart ?? 5;
  const typicalEnd = glassWindow.typicalEnd ?? 10;

  // Current calm conditions
  if (wind.windSpeed != null && wind.windSpeed < 5) {
    score += 30;
    details.push(`Current wind ${wind.windSpeed.toFixed(0)} mph — glass conditions`);
    confidence += 0.2;
  } else if (wind.windSpeed != null && wind.windSpeed < 8) {
    score += 10;
    details.push(`Light wind ${wind.windSpeed.toFixed(0)} mph`);
  }

  // Time in glass window
  if (hour >= typicalStart && hour <= typicalEnd) {
    score += 20;
    details.push(`In typical glass window (${typicalStart}–${typicalEnd} AM)`);
    confidence += 0.15;
  }

  // Low pressure gradient = no forcing
  const gradient = Math.abs(pressure.gradient ?? 0);
  if (gradient < 1.0) {
    score += 15;
    details.push('Low pressure gradient — calm conditions');
    confidence += 0.1;
  }

  // Stable/rising pressure
  if (pressure.trend === 'stable' || pressure.trend === 'rising') {
    score += 10;
    details.push('Stable/rising pressure');
    confidence += 0.05;
  }

  // History of calm
  if (history.length >= 3) {
    const calmCount = history.filter(h => h.windSpeed != null && h.windSpeed < 5).length;
    const calmPct = calmCount / history.length;
    if (calmPct > 0.6) {
      score += 15;
      details.push(`${(calmPct * 100).toFixed(0)}% calm in recent readings`);
      confidence += 0.1;
    }
  }

  return {
    probability: Math.min(95, score),
    confidence: Math.min(1, confidence),
    timing: hour < typicalEnd ? `Until ~${typicalEnd} AM` : 'Window may be closing',
    details,
  };
}

function scorePostFrontal(wind, pressure, history, hour) {
  let score = 0;
  let confidence = 0.3;
  const details = [];

  // Rising pressure after a drop
  if (pressure.trend === 'rising') {
    score += 20;
    details.push('Pressure rising — post-frontal high building');
    confidence += 0.1;
  }

  // NW wind diminishing
  if (wind.windDirection != null && wind.windDirection >= 280 && wind.windDirection <= 340) {
    score += 15;
    details.push(`${getCardinal(wind.windDirection)} wind — post-frontal flow`);
    confidence += 0.1;
  }

  // Speed decreasing in history
  if (history.length >= 4) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.windSpeed != null && older?.windSpeed != null) {
      const speedDecrease = older.windSpeed - recent.windSpeed;
      if (speedDecrease > 5 && recent.windSpeed > 5) {
        score += 20;
        details.push(`Wind decreasing: −${speedDecrease.toFixed(0)} mph in 3hr`);
        confidence += 0.15;
      }
    }
  }

  // Temperature stabilizing after cold front drop
  if (history.length >= 4) {
    const temps = history.filter(h => h.temperature != null).map(h => h.temperature);
    if (temps.length >= 4) {
      const recentTemps = temps.slice(-3);
      const tempRange = Math.max(...recentTemps) - Math.min(...recentTemps);
      const oldDrop = temps[0] - temps[Math.floor(temps.length / 2)];
      if (tempRange < 3 && oldDrop > 5) {
        score += 15;
        details.push('Temperature stabilizing after cold drop');
        confidence += 0.1;
      }
    }
  }

  return {
    probability: Math.min(90, score),
    confidence: Math.min(1, confidence),
    timing: 'Clearing over next 6-12 hours',
    details,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────

function isNortherly(dir) {
  return dir >= 300 || dir <= 60;
}

function isInRange(dir, min, max) {
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export { WIND_EVENT_TYPES };
