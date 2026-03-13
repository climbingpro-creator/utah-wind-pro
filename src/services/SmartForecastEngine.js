/**
 * SMART FORECAST ENGINE
 * 
 * Unified intelligence layer for ALL activities. Replaces the old
 * HourlyTimeline's Math.random() with real data:
 * 
 *   NWS hourly  ─┐
 *   Learned weights ─┤
 *   Translation factor ─┼─→  Activity-Aware Hourly Forecast
 *   Correlation triggers ─┤
 *   Swing/trend patterns ─┤
 *   Current conditions ─┘
 * 
 * Every activity gets the same upstream intelligence, interpreted differently:
 *   KITING:      "12 mph thermal at 2 PM, consistent, low gust" → GO
 *   SAILING:     "12 mph steady at 2 PM, good for racing" → GO
 *   BOATING:     "Glass until 2 PM, then chop" → Go early
 *   FISHING:     "Glass until 2 PM + falling pressure + solunar" → Morning bite
 *   PARAGLIDING: "South 10 mph at 11 AM, switch to north by 5 PM" → Fly both
 *   WINDSURFING: "14 mph at 3 PM, gusty" → GO but watch gusts
 */

import { getHourlyForecast } from './ForecastService';
import { calculateCorrelatedWind } from './CorrelationEngine';
import { monitorSwings, isFrontalPassage } from './FrontalTrendPredictor';
import trainedWeights from '../config/trainedWeights.json';
import boatWeights from '../config/trainedWeights-boating.json';

// ─── ACTIVITY THRESHOLDS ─────────────────────────────────────────

// Approximate sunrise/sunset for Utah by month (hour, local time)
const DAYLIGHT = {
  0: { rise: 7.5, set: 17.5 },  1: { rise: 7.2, set: 18.0 },
  2: { rise: 7.5, set: 19.3 },  3: { rise: 6.7, set: 19.8 },
  4: { rise: 6.1, set: 20.3 },  5: { rise: 5.8, set: 20.8 },
  6: { rise: 6.0, set: 21.0 },  7: { rise: 6.3, set: 20.5 },
  8: { rise: 7.0, set: 19.5 },  9: { rise: 7.3, set: 18.5 },
  10: { rise: 7.0, set: 17.2 }, 11: { rise: 7.3, set: 17.1 },
};

function isDaylightHour(hour) {
  const month = new Date().getMonth();
  const { rise, set } = DAYLIGHT[month];
  return hour >= Math.floor(rise) && hour < Math.ceil(set);
}

const ACTIVITY_PROFILES = {
  kiting: {
    idealMin: 10, idealMax: 20, min: 8, max: 30,
    gustLimit: 1.5, wantsWind: true, daylightOnly: true,
    scoreLabel: (s) => s >= 80 ? 'Send it' : s >= 60 ? 'Good session' : s >= 40 ? 'Light but doable' : s >= 20 ? 'Foil only' : 'No wind',
    emoji: (s) => s >= 80 ? '🔥' : s >= 60 ? '✅' : s >= 40 ? '〰️' : '❌',
  },
  sailing: {
    idealMin: 10, idealMax: 18, min: 6, max: 25,
    gustLimit: 1.4, wantsWind: true, daylightOnly: true,
    scoreLabel: (s) => s >= 80 ? 'Race day' : s >= 60 ? 'Good sail' : s >= 40 ? 'Light air' : s >= 20 ? 'Drifter' : 'No wind',
    emoji: (s) => s >= 80 ? '⛵' : s >= 60 ? '✅' : s >= 40 ? '〰️' : '❌',
  },
  windsurfing: {
    idealMin: 12, idealMax: 22, min: 8, max: 30,
    gustLimit: 1.5, wantsWind: true, daylightOnly: true,
    scoreLabel: (s) => s >= 80 ? 'Planing!' : s >= 60 ? 'Good session' : s >= 40 ? 'Light wind' : s >= 20 ? 'Barely' : 'No wind',
    emoji: (s) => s >= 80 ? '🔥' : s >= 60 ? '✅' : s >= 40 ? '〰️' : '❌',
  },
  boating: {
    idealMin: 0, idealMax: 5, min: 0, max: 8,
    gustLimit: 1.1, wantsWind: false,
    scoreLabel: (s) => s >= 85 ? 'Glass' : s >= 65 ? 'Near-glass' : s >= 45 ? 'Light chop' : s >= 25 ? 'Moderate' : 'Choppy',
    emoji: (s) => s >= 85 ? '🪞' : s >= 65 ? '✨' : s >= 45 ? '〰️' : s >= 25 ? '🌊' : '⚠️',
  },
  paddling: {
    idealMin: 0, idealMax: 5, min: 0, max: 10,
    gustLimit: 1.2, wantsWind: false,
    scoreLabel: (s) => s >= 85 ? 'Perfect' : s >= 65 ? 'Great' : s >= 45 ? 'Some chop' : s >= 25 ? 'Challenging' : 'Stay home',
    emoji: (s) => s >= 85 ? '🪞' : s >= 65 ? '✨' : s >= 45 ? '〰️' : s >= 25 ? '🌊' : '⚠️',
  },
  fishing: {
    idealMin: 0, idealMax: 8, min: 0, max: 15,
    gustLimit: 1.3, wantsWind: false,
    scoreLabel: (s) => s >= 80 ? 'Fish ON' : s >= 60 ? 'Good bite' : s >= 40 ? 'Fair' : s >= 20 ? 'Slow' : 'Tough day',
    emoji: (s) => s >= 80 ? '🎣' : s >= 60 ? '✅' : s >= 40 ? '〰️' : '❌',
  },
  paragliding: {
    idealMin: 8, idealMax: 15, min: 8, max: 18,
    gustLimit: 1.25, wantsWind: true, daylightOnly: true,
    scoreLabel: (s) => s >= 80 ? 'Epic' : s >= 60 ? 'Flyable' : s >= 40 ? 'Marginal' : 'Grounded',
    emoji: (s) => s >= 80 ? '🪂' : s >= 60 ? '✅' : s >= 40 ? '⚠️' : '❌',
  },
};

// ─── TRANSLATION FACTOR ──────────────────────────────────────────

function calculateTranslation(currentWind, upstream) {
  const lakeSpeed = currentWind?.speed;
  const upMax = Math.max(upstream?.kslcSpeed || 0, upstream?.kpvuSpeed || 0);
  
  if (lakeSpeed == null || upMax < 3) return { factor: 0.65, source: 'default' };
  
  const raw = lakeSpeed / upMax;
  const factor = Math.min(1.0, Math.max(0.15, raw));
  const source = factor < 0.4 ? 'blocked' : factor < 0.7 ? 'partial' : 'translating';
  return { factor, source };
}

// ─── THERMAL CYCLE MODEL ─────────────────────────────────────────
// Uses learned weights + thermal predictor output instead of Math.random()

function getThermalCurve(hour, thermalStart, thermalPeak, thermalEnd) {
  if (hour < thermalStart - 1) return { mult: 0.15, phase: 'calm' };
  if (hour < thermalStart) return { mult: 0.3, phase: 'building' };
  
  if (hour <= thermalPeak) {
    const progress = (hour - thermalStart) / Math.max(1, thermalPeak - thermalStart);
    return { mult: 0.5 + progress * 0.5, phase: 'building' };
  }
  
  if (hour <= thermalPeak + 2) return { mult: 1.0, phase: 'peak' };
  
  if (hour < thermalEnd) {
    const decay = (hour - thermalPeak - 2) / Math.max(1, thermalEnd - thermalPeak - 2);
    return { mult: Math.max(0.3, 1.0 - decay * 0.7), phase: 'fading' };
  }
  
  return { mult: 0.2, phase: 'calm' };
}

// ─── SCORE CALCULATOR ────────────────────────────────────────────

function scoreForActivity(activity, speed, gust) {
  const p = ACTIVITY_PROFILES[activity];
  if (!p) return { score: 50, status: 'unknown' };
  
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
    // Calm-seeking: lower speed = higher score
    if (speed <= p.idealMax) {
      score = 85 + 15 * (1 - speed / Math.max(1, p.idealMax));
    } else if (speed <= p.max) {
      score = 40 + 45 * (1 - (speed - p.idealMax) / Math.max(1, p.max - p.idealMax));
    } else {
      score = Math.max(0, 40 * (1 - (speed - p.max) / 15));
    }
  }
  
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    label: p.scoreLabel(Math.round(score)),
    emoji: p.emoji(Math.round(score)),
  };
}

// ─── MAIN ENGINE ─────────────────────────────────────────────────

/**
 * Generate a smart hour-by-hour forecast for any activity.
 * 
 * @param {string} activity - kiting, sailing, boating, fishing, paragliding, windsurfing, paddling
 * @param {string} locationId - e.g. 'utah-lake-zigzag', 'deer-creek'
 * @param {object} currentWind - { speed, gust, direction }
 * @param {object} upstreamData - { kslcSpeed, kslcDirection, kpvuSpeed, kpvuDirection }
 * @param {object} lakeState - full lakeState from useLakeData (for thermal prediction, pressure, etc.)
 * @param {object} mesoData - station data for correlation engine
 */
export async function generateSmartForecast(activity, locationId, currentWind = {}, upstreamData = {}, lakeState = {}, mesoData = {}) {
  const profile = ACTIVITY_PROFILES[activity] || ACTIVITY_PROFILES.kiting;
  const now = new Date();
  const currentHour = now.getHours();
  
  // 1. Get NWS hourly forecast
  let nwsHourly = null;
  try { nwsHourly = await getHourlyForecast(locationId); } catch (e) { /* fallback */ }
  
  // 2. Calculate translation factor
  const translation = calculateTranslation(currentWind, upstreamData);
  const upstreamActive = (upstreamData.kslcSpeed || 0) >= 8;
  const lakeCalm = (currentWind.speed || 0) < 5;
  const flowBlocked = upstreamActive && lakeCalm;
  
  // 3. Get thermal prediction data from lakeState
  const thermalPred = lakeState?.thermalPrediction;
  const thermalStart = thermalPred?.startHour || 10;
  const thermalPeak = thermalPred?.peakHour || 13;
  const thermalEnd = thermalPred?.endHour || 17;
  const thermalProb = thermalPred?.probability || 50;
  
  // 4. Get learned hourly patterns
  const learnedHourly = trainedWeights?.weights?.hourlyMultipliers || {};
  const boatHourly = boatWeights?.weights?.glassWindowByHour || {};
  
  // 5. Run correlation engine for current conditions
  let correlationResult = null;
  try {
    correlationResult = calculateCorrelatedWind(locationId, 
      { speed: currentWind.speed, direction: currentWind.direction },
      mesoData, lakeState?.pws
    );
  } catch (e) { /* fallback */ }
  
  const correlationMultiplier = correlationResult?.multiplier || 1.0;
  const activeTriggers = correlationResult?.activeTriggers || [];
  
  // 6. Check for frontal/swing patterns
  let swingAlerts = [];
  try {
    const kslcHistory = lakeState?.kslcHistory || [];
    if (kslcHistory.length >= 4) {
      swingAlerts = monitorSwings(kslcHistory);
    }
  } catch (e) { /* ignore */ }
  
  const frontalActive = swingAlerts.some(a => a.id === 'frontal-hit' || a.id === 'wind-shift');
  
  // 7. Generate 24-hour forecast
  const hours = [];
  
  for (let offset = 0; offset < 24; offset++) {
    const forecastHour = (currentHour + offset) % 24;
    const isToday = (currentHour + offset) < 24;
    
    // NWS wind for this hour
    let nwsWind = null, nwsForecast = null;
    if (nwsHourly) {
      const forecastDate = new Date(now);
      if (!isToday) forecastDate.setDate(forecastDate.getDate() + 1);
      const nwsPeriod = nwsHourly.find(p => {
        const ph = new Date(p.startTime).getHours();
        const pd = new Date(p.startTime).getDate();
        return ph === forecastHour && pd === forecastDate.getDate();
      });
      if (nwsPeriod) {
        nwsWind = nwsPeriod.windSpeed;
        nwsForecast = nwsPeriod.shortForecast;
      }
    }
    
    // Learned hourly multiplier
    const learnedMult = learnedHourly[forecastHour] || 1.0;
    const boatLearned = boatHourly[forecastHour] || {};
    
    // Thermal cycle position
    const thermal = getThermalCurve(forecastHour, thermalStart, thermalPeak, thermalEnd);
    
    let predictedSpeed;
    let confidence = 'medium';
    let source = 'blended';
    
    if (offset === 0 && currentWind.speed != null) {
      // Current hour: use actual data
      predictedSpeed = currentWind.speed;
      confidence = 'high';
      source = 'live';
    } else if (profile.wantsWind) {
      // WIND-SEEKING: Blend thermal curve + NWS + learned + translation
      // Thermals are LOCAL (no translation needed for thermal component)
      // North flow / synoptic wind DOES need translation factor
      
      const thermalComponent = thermal.mult * (thermalProb / 100) * 18 * learnedMult;
      
      let synopticComponent = 0;
      if (nwsWind != null) {
        // NWS wind is regional — discount by translation factor
        synopticComponent = nwsWind * translation.factor;
      }
      
      // Near-term: anchor to current conditions
      if (offset <= 2 && currentWind.speed != null) {
        const anchorWeight = 0.6 - offset * 0.2;
        const blended = Math.max(thermalComponent, synopticComponent);
        predictedSpeed = currentWind.speed * anchorWeight + blended * (1 - anchorWeight);
      } else {
        // Use whichever is stronger: thermal pump or translated synoptic
        predictedSpeed = Math.max(thermalComponent, synopticComponent);
      }
      
      // Apply correlation multiplier (spatial intelligence)
      predictedSpeed *= correlationMultiplier;
      
      // Frontal active: boost predicted speeds for near-term
      if (frontalActive && offset <= 6) {
        predictedSpeed *= 1.2;
      }
      
      confidence = offset <= 3 ? 'high' : offset <= 8 ? 'medium' : 'low';
    } else {
      // CALM-SEEKING: Use translation factor heavily
      let adjustedNws = nwsWind != null ? nwsWind * translation.factor : (boatLearned.avgSpeed || 8);
      
      if (offset <= 3 && flowBlocked && currentWind.speed != null) {
        const anchor = Math.max(0.2, 0.7 - offset * 0.15);
        adjustedNws = currentWind.speed * anchor + adjustedNws * (1 - anchor);
      }
      
      const nwsWeight = Math.min(0.6, 0.3 + offset * 0.02);
      const historicalAvg = boatLearned.avgSpeed || 8;
      predictedSpeed = adjustedNws * nwsWeight + historicalAvg * (1 - nwsWeight);
      
      confidence = offset <= 3 ? 'high' : offset <= 8 ? 'medium' : 'low';
    }
    
    predictedSpeed = Math.max(0, predictedSpeed);
    const estimatedGust = predictedSpeed * (thermal.phase === 'peak' ? 1.25 : 1.15);
    
    // After dark: zero score for daylight-only activities
    const isLight = isDaylightHour(forecastHour);
    const afterDark = profile.daylightOnly && !isLight;
    
    let score, label, emoji;
    if (afterDark) {
      score = 0;
      label = 'After dark';
      emoji = '🌙';
    } else {
      ({ score, label, emoji } = scoreForActivity(activity, predictedSpeed, estimatedGust));
    }
    
    // Cloud cover from NWS
    let cloudCover = null;
    if (nwsForecast) {
      const lf = nwsForecast.toLowerCase();
      if (lf.includes('sunny') || lf.includes('clear')) cloudCover = { icon: '☀️', label: 'Clear' };
      else if (lf.includes('partly')) cloudCover = { icon: '⛅', label: 'Partly Cloudy' };
      else if (lf.includes('cloudy')) cloudCover = { icon: '☁️', label: 'Cloudy' };
      else if (lf.includes('rain') || lf.includes('shower')) cloudCover = { icon: '🌧️', label: 'Rain' };
      else if (lf.includes('storm')) cloudCover = { icon: '⛈️', label: 'Storms' };
      else cloudCover = { icon: '🌤️', label: nwsForecast };
    }
    
    hours.push({
      hour: forecastHour,
      offset,
      isToday,
      isCurrent: offset === 0,
      isPast: false,
      time: forecastHour === 0 ? '12 AM' : forecastHour === 12 ? '12 PM' : forecastHour > 12 ? `${forecastHour - 12} PM` : `${forecastHour} AM`,
      predictedSpeed: +predictedSpeed.toFixed(1),
      estimatedGust: +estimatedGust.toFixed(1),
      nwsSpeed: nwsWind,
      phase: thermal.phase,
      score,
      label,
      emoji,
      confidence,
      source,
      cloudCover,
    });
  }
  
  // 8. Find best windows (consecutive hours with score >= 60)
  const windows = findWindows(hours, profile.wantsWind);
  
  // 9. Find events (big speed changes)
  const events = findEvents(hours);
  
  // 10. Build recommendation
  const bestWindow = windows[0];
  const recommendation = buildRecommendation(activity, hours, windows, flowBlocked, activeTriggers, swingAlerts);
  
  return {
    activity,
    locationId,
    hours,
    windows,
    events,
    translation,
    flowBlocked,
    activeTriggers,
    swingAlerts,
    frontalActive,
    recommendation,
    thermalPrediction: { start: thermalStart, peak: thermalPeak, end: thermalEnd, probability: thermalProb },
    generatedAt: now.toISOString(),
  };
}

// ─── WINDOW DETECTION ────────────────────────────────────────────

function findWindows(hours, wantsWind) {
  const threshold = wantsWind ? 60 : 65;
  const windows = [];
  let start = null;
  
  for (const h of hours) {
    if (h.score >= threshold) {
      if (!start) start = h;
    } else {
      if (start) {
        const duration = h.offset - start.offset;
        if (duration >= 2) {
          const windowHours = hours.filter(x => x.offset >= start.offset && x.offset < h.offset);
          const avgSpeed = windowHours.reduce((s, x) => s + x.predictedSpeed, 0) / windowHours.length;
          const avgScore = windowHours.reduce((s, x) => s + x.score, 0) / windowHours.length;
          windows.push({
            start: start.time, startHour: start.hour,
            end: h.time, endHour: h.hour,
            duration,
            avgSpeed: +avgSpeed.toFixed(1),
            avgScore: Math.round(avgScore),
            peakHour: windowHours.reduce((best, x) => x.score > best.score ? x : best, windowHours[0]),
            isToday: start.isToday,
          });
        }
        start = null;
      }
    }
  }
  if (start) {
    const last = hours[hours.length - 1];
    const duration = last.offset - start.offset + 1;
    if (duration >= 2) {
      const windowHours = hours.filter(x => x.offset >= start.offset);
      windows.push({
        start: start.time, startHour: start.hour,
        end: last.time, endHour: last.hour,
        duration,
        avgSpeed: +(windowHours.reduce((s, x) => s + x.predictedSpeed, 0) / windowHours.length).toFixed(1),
        avgScore: Math.round(windowHours.reduce((s, x) => s + x.score, 0) / windowHours.length),
        peakHour: windowHours.reduce((best, x) => x.score > best.score ? x : best, windowHours[0]),
        isToday: start.isToday,
      });
    }
  }
  
  return windows;
}

function findEvents(hours) {
  const events = [];
  for (let i = 1; i < hours.length; i++) {
    const jump = hours[i].predictedSpeed - hours[i - 1].predictedSpeed;
    if (Math.abs(jump) >= 4) {
      events.push({
        time: hours[i].time, hour: hours[i].hour,
        type: jump > 0 ? 'wind_increase' : 'wind_dying',
        severity: Math.abs(jump) >= 8 ? 'warning' : 'info',
        from: hours[i - 1].predictedSpeed,
        to: hours[i].predictedSpeed,
        message: jump > 0
          ? `Wind building: ${hours[i - 1].predictedSpeed.toFixed(0)} → ${hours[i].predictedSpeed.toFixed(0)} mph`
          : `Wind easing: ${hours[i - 1].predictedSpeed.toFixed(0)} → ${hours[i].predictedSpeed.toFixed(0)} mph`,
      });
    }
  }
  return events;
}

// ─── RECOMMENDATION ENGINE ───────────────────────────────────────

function buildRecommendation(activity, hours, windows, flowBlocked, triggers, swings) {
  const profile = ACTIVITY_PROFILES[activity];
  const bestWindow = windows[0];
  const currentScore = hours[0]?.score || 0;
  const hasFrontal = swings.some(a => a.id === 'frontal-hit');
  const boostActive = triggers.filter(t => t.type === 'boost').length > 0;
  
  if (profile.wantsWind) {
    if (currentScore >= 70) {
      return {
        urgency: 'go',
        headline: `${activity === 'kiting' ? 'Kiting' : activity === 'sailing' ? 'Sailing' : activity.charAt(0).toUpperCase() + activity.slice(1)} is ON right now!`,
        detail: boostActive ? `Spatial triggers active — ${triggers[0]?.label}` : `${hours[0].predictedSpeed.toFixed(0)} mph — ideal conditions`,
        badge: 'GO NOW',
      };
    }
    if (bestWindow) {
      return {
        urgency: 'plan',
        headline: `Best window: ${bestWindow.start} – ${bestWindow.end}`,
        detail: hasFrontal
          ? 'Frontal passage detected — stronger winds incoming'
          : `${bestWindow.avgSpeed} mph avg, ${bestWindow.duration}hr window`,
        badge: 'GET READY',
        arriveBy: bestWindow.start,
      };
    }
    if (flowBlocked) {
      return {
        urgency: 'wait',
        headline: 'Upstream wind not reaching the lake',
        detail: 'Valley wind is active but blocked — thermals may still develop locally',
        badge: 'WATCHING',
      };
    }
    return {
      urgency: 'wait',
      headline: 'No strong wind signals today',
      detail: 'Checking indicators for changes',
      badge: null,
    };
  } else {
    // Calm-seeking
    if (currentScore >= 80 && flowBlocked) {
      return {
        urgency: 'go',
        headline: 'Glass conditions — upstream wind is blocked!',
        detail: 'Valley wind is NOT reaching the lake. Go now!',
        badge: 'GLASS',
      };
    }
    if (currentScore >= 70) {
      return {
        urgency: 'go',
        headline: 'Calm water right now',
        detail: bestWindow ? `Glass until ~${bestWindow.end}` : 'Enjoy the calm',
        badge: 'GO NOW',
      };
    }
    if (bestWindow && bestWindow.isToday) {
      return {
        urgency: 'plan',
        headline: `Glass window: ${bestWindow.start} – ${bestWindow.end}`,
        detail: `${bestWindow.avgSpeed} mph avg — ${bestWindow.duration}hr of calm water`,
        badge: 'PLAN AHEAD',
        arriveBy: bestWindow.start,
      };
    }
    return {
      urgency: 'wait',
      headline: 'Wind expected — choppy conditions',
      detail: 'Waiting for calm windows',
      badge: null,
    };
  }
}

export { ACTIVITY_PROFILES, scoreForActivity };
