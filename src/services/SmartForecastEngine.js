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

import { generateWindField } from './WindFieldEngine';
import { safeToFixed } from '../utils/safeToFixed';
import { ACTIVITY_CONFIGS } from '../components/ActivityMode';

// ─── ACTIVITY PROFILES ────────────────────────────────────────────
// Derived from the single source of truth in ACTIVITY_CONFIGS.
// Adds scoring labels and emoji for SmartTimeline display.

function deriveProfile(cfg) {
  if (!cfg) return null;
  const t = cfg.thresholds || {};
  return {
    idealMin: t.ideal?.min ?? (cfg.wantsWind ? 10 : 0),
    idealMax: t.ideal?.max ?? (cfg.wantsWind ? 20 : 8),
    min: t.tooLight ?? t.ideal?.min ?? 0,
    max: t.tooStrong ?? t.dangerous ?? 30,
    gustLimit: t.gustFactor ?? 1.5,
    wantsWind: cfg.wantsWind ?? true,
    daylightOnly: true,
  };
}

const SCORE_LABELS = {
  kiting:      { high: 'Send it', good: 'Good session', ok: 'Light but doable', low: 'Foil only', off: 'No wind', emoji: ['❌','〰️','〰️','✅','🔥'] },
  sailing:     { high: 'Race day', good: 'Good sail', ok: 'Light air', low: 'Drifter', off: 'No wind', emoji: ['❌','〰️','〰️','✅','⛵'] },
  windsurfing: { high: 'Planing!', good: 'Good session', ok: 'Light wind', low: 'Barely', off: 'No wind', emoji: ['❌','〰️','〰️','✅','🔥'] },
  boating:     { high: 'Glass', good: 'Near-glass', ok: 'Light chop', low: 'Moderate', off: 'Choppy', emoji: ['⚠️','🌊','〰️','✨','🪞'] },
  paddling:    { high: 'Perfect', good: 'Great', ok: 'Some chop', low: 'Challenging', off: 'Stay home', emoji: ['⚠️','🌊','〰️','✨','🪞'] },
  fishing:     { high: 'Fish ON', good: 'Good bite', ok: 'Fair', low: 'Slow', off: 'Tough day', emoji: ['❌','〰️','〰️','✅','🎣'] },
  paragliding: { high: 'Epic', good: 'Flyable', ok: 'Marginal', low: 'Marginal', off: 'Grounded', emoji: ['❌','⚠️','⚠️','✅','🪂'] },
  snowkiting:  { high: 'Send it', good: 'Good session', ok: 'Light but rideable', low: 'Barely', off: 'No wind', emoji: ['❌','〰️','〰️','✅','🔥'] },
};

function getLabel(activity, score) {
  const sl = SCORE_LABELS[activity] || SCORE_LABELS.kiting;
  if (score >= 80) return { label: sl.high, emoji: sl.emoji[4] };
  if (score >= 60) return { label: sl.good, emoji: sl.emoji[3] };
  if (score >= 40) return { label: sl.ok, emoji: sl.emoji[2] };
  if (score >= 20) return { label: sl.low, emoji: sl.emoji[1] };
  return { label: sl.off, emoji: sl.emoji[0] };
}

const ACTIVITY_PROFILES = {};
for (const [id, cfg] of Object.entries(ACTIVITY_CONFIGS)) {
  const base = deriveProfile(cfg);
  if (base) {
    base.scoreLabel = (s) => getLabel(id, s).label;
    base.emoji = (s) => getLabel(id, s).emoji;
    ACTIVITY_PROFILES[id] = base;
  }
}

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

  const actLabel = ACTIVITY_CONFIGS[activity]?.name
    || (activity.charAt(0).toUpperCase() + activity.slice(1));

  if (profile.wantsWind) {
    if (currentScore >= 70) {
      return {
        urgency: 'go',
        headline: `${actLabel} is ON right now!`,
        detail: boostActive ? `Spatial triggers active — ${triggers[0]?.label}` : `${safeToFixed(hours[0].predictedSpeed, 0)} mph — ideal conditions`,
        badge: 'GO NOW',
      };
    }
    if (bestWindow) {
      return {
        urgency: 'plan',
        headline: `Best ${actLabel.toLowerCase()} window: ${bestWindow.start} – ${bestWindow.end}`,
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
        headline: activity === 'paragliding'
          ? 'Valley wind active but not reaching launch'
          : 'Upstream wind not reaching the lake',
        detail: activity === 'paragliding'
          ? 'Thermals may still cycle — watch for lulls'
          : 'Valley wind is active but blocked — thermals may still develop locally',
        badge: 'WATCHING',
      };
    }
    return { urgency: 'wait', headline: `No strong ${actLabel.toLowerCase()} signals today`, detail: 'Checking indicators for changes', badge: null };
  } else {
    const calmLabel = activity === 'fishing' ? 'Calm water — great bite conditions'
      : activity === 'paddling' ? 'Glass conditions — perfect for paddling'
      : activity === 'sailing' ? 'Light air — drifting conditions'
      : 'Glass conditions — perfect for boating';
    const calmNow = activity === 'fishing' ? 'Calm water — fish are active'
      : activity === 'paddling' ? 'Flat water right now — go paddle'
      : activity === 'sailing' ? 'Very light breeze — drifter conditions'
      : 'Calm water right now — great for boating';

    if (currentScore >= 80 && flowBlocked) {
      return {
        urgency: 'go',
        headline: calmLabel,
        detail: activity === 'fishing'
          ? 'No wind reaching the water — topwater bite is on'
          : activity === 'paddling'
          ? 'Upstream wind blocked — water is flat, go paddle'
          : 'Upstream wind blocked — smooth water, go now!',
        badge: activity === 'fishing' ? 'FISH ON' : 'GLASS',
      };
    }
    if (currentScore >= 70) {
      return {
        urgency: 'go',
        headline: calmNow,
        detail: bestWindow ? `Calm until ~${bestWindow.end}` : 'Enjoy the calm',
        badge: 'GO NOW',
      };
    }
    if (bestWindow && bestWindow.isToday) {
      const windowLabel = activity === 'fishing' ? 'Best fishing window'
        : activity === 'paddling' ? 'Calm paddle window'
        : 'Glass window';
      return {
        urgency: 'plan',
        headline: `${windowLabel}: ${bestWindow.start} – ${bestWindow.end}`,
        detail: activity === 'fishing'
          ? `Low wind (${bestWindow.avgSpeed} mph) — ${bestWindow.duration}hr of calm water`
          : `${bestWindow.avgSpeed} mph avg — ${bestWindow.duration}hr of calm water`,
        badge: 'PLAN AHEAD',
        arriveBy: bestWindow.start,
      };
    }
    const waitMsg = activity === 'fishing' ? 'Windy — fish deeper or sheltered spots'
      : activity === 'paddling' ? 'Choppy — wait for calm or stay near shore'
      : activity === 'sailing' ? 'Strong wind building — reef early or stay ashore'
      : 'Choppy conditions — wait for a calm window';
    return { urgency: 'wait', headline: waitMsg, detail: 'Waiting for calm windows', badge: null };
  }
}

export { ACTIVITY_PROFILES, scoreForActivity };
