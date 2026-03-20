/**
 * SMART FORECAST ENGINE — Activity Scoring Layer
 * 
 * Architecture:
 *   WindFieldEngine  →  ONE wind speed per location per hour (physics-based)
 *        ↓
 *   SmartForecastEngine  →  Scores that speed per ACTIVITY
 *        ↓
 *   SmartTimeline  →  Displays the scored hourly forecast
 * 
 * Wind doesn't care what sport you play.
 * Kiting, boating, fishing, paragliding — they all see the SAME wind.
 * This engine just interprets what that wind means for each activity.
 */

import { generateWindField, isDaylightHour } from './WindFieldEngine';
import { safeToFixed } from '../utils/safeToFixed';

// ─── ACTIVITY PROFILES ────────────────────────────────────────────
// Defines what each activity needs from the wind.
// These thresholds are backtested against 2025 data.

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
    idealMin: 8, idealMax: 15, min: 6, max: 18,
    gustLimit: 1.25, wantsWind: true, daylightOnly: true,
    scoreLabel: (s) => s >= 80 ? 'Epic' : s >= 60 ? 'Flyable' : s >= 40 ? 'Marginal' : 'Grounded',
    emoji: (s) => s >= 80 ? '🪂' : s >= 60 ? '✅' : s >= 40 ? '⚠️' : '❌',
  },
};

// ─── SCORE CALCULATOR ────────────────────────────────────────────
// Pure function: speed + gust → score for an activity.

function scoreForActivity(activity, speed, gust) {
  const p = ACTIVITY_PROFILES[activity];
  if (!p) return { score: 50, label: 'unknown', emoji: '❓' };

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

// ─── MAIN EXPORT ──────────────────────────────────────────────────

/**
 * Generate a smart hour-by-hour forecast for any activity.
 * 
 * Step 1: WindFieldEngine produces ONE wind speed per hour (physics)
 * Step 2: This function scores each hour per activity (interpretation)
 * 
 * Result: Same wind speeds for kiting, boating, fishing. Different scores.
 */
export async function generateSmartForecast(activity, locationId, currentWind = {}, upstreamData = {}, lakeState = {}, mesoData = {}) {
  const profile = ACTIVITY_PROFILES[activity] || ACTIVITY_PROFILES.kiting;

  // Step 1: Get unified wind field (activity-independent)
  const windField = await generateWindField(locationId, currentWind, upstreamData, lakeState, mesoData);

  // Step 2: Score each hour for the requested activity
  const hours = windField.hours.map(wf => {
    const afterDark = profile.daylightOnly && !wf.isLight;

    let score, label, emoji;
    if (afterDark) {
      score = 0;
      label = 'After dark';
      emoji = '🌙';
    } else {
      ({ score, label, emoji } = scoreForActivity(activity, wf.speed, wf.gust));
    }

    return {
      ...wf,
      predictedSpeed: wf.speed,
      estimatedGust: wf.gust,
      score,
      label,
      emoji,
    };
  });

  // Step 3: Find windows, events, recommendations
  const windows = findWindows(hours, profile.wantsWind);
  const events = findEvents(hours);
  const recommendation = buildRecommendation(activity, hours, windows,
    windField.translation.blocked, windField.activeTriggers, windField.swingAlerts);

  return {
    activity,
    locationId,
    hours,
    windows,
    events,
    translation: windField.translation,
    flowBlocked: windField.translation.blocked,
    activeTriggers: windField.activeTriggers,
    swingAlerts: windField.swingAlerts,
    frontalActive: windField.frontalActive,
    recommendation,
    thermalPrediction: windField.thermalPrediction,
    propagation: {
      paths: windField.propagationPaths,
      stationReadings: windField.stationReadings,
    },
    generatedAt: windField.generatedAt,
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
          ? `Wind building: ${safeToFixed(hours[i - 1].predictedSpeed, 0)} → ${safeToFixed(hours[i].predictedSpeed, 0)} mph`
          : `Wind easing: ${safeToFixed(hours[i - 1].predictedSpeed, 0)} → ${safeToFixed(hours[i].predictedSpeed, 0)} mph`,
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
        detail: boostActive ? `Spatial triggers active — ${triggers[0]?.label}` : `${safeToFixed(hours[0].predictedSpeed, 0)} mph — ideal conditions`,
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
    return { urgency: 'wait', headline: 'No strong wind signals today', detail: 'Checking indicators for changes', badge: null };
  } else {
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
    return { urgency: 'wait', headline: 'Wind expected — choppy conditions', detail: 'Waiting for calm windows', badge: null };
  }
}

export { ACTIVITY_PROFILES, scoreForActivity };
