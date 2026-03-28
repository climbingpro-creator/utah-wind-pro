/**
 * SportIntelligenceEngine — Predictive time-window forecaster.
 *
 * Scans NWS hourly forecast data to find optimal contiguous windows
 * for each sport type. Returns actionable "when to go" recommendations.
 */

const SPORT_PROFILES = {
  'foil-kite': {
    name: 'Foil / Kite',
    wantsWind: true,
    minSpeed: 12,
    idealMin: 14,
    idealMax: 22,
    maxSpeed: 30,
    maxGustFactor: 1.8,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 12) return 0;
      if (s > 30) return 0;
      if (s >= 14 && s <= 22) return 80 + (1 - Math.abs(s - 18) / 8) * 20;
      if (s >= 12 && s < 14) return 50 + (s - 12) * 15;
      return Math.max(10, 80 - (s - 22) * 5);
    },
    reasonTemplate: (peak, window) =>
      `Sustained winds over ${Math.round(SPORT_PROFILES['foil-kite'].minSpeed)} mph expected from ${window.startLabel} to ${window.endLabel}. Peak ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
  },

  'windsurfing': {
    name: 'Windsurfing',
    wantsWind: true,
    minSpeed: 8,
    idealMin: 12,
    idealMax: 20,
    maxSpeed: 28,
    maxGustFactor: 1.7,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 8) return 0;
      if (s > 28) return 0;
      if (s >= 12 && s <= 20) return 80 + (1 - Math.abs(s - 16) / 8) * 20;
      if (s >= 8 && s < 12) return 40 + (s - 8) * 10;
      return Math.max(10, 80 - (s - 20) * 6);
    },
    reasonTemplate: (peak, window) =>
      `Rideable wind from ${window.startLabel} to ${window.endLabel}. Peak ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
  },

  'sailing': {
    name: 'Sailing',
    wantsWind: true,
    minSpeed: 6,
    idealMin: 8,
    idealMax: 18,
    maxSpeed: 25,
    maxGustFactor: 1.5,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 6) return 0;
      if (s > 25) return 0;
      if (s >= 8 && s <= 18) return 80 + (1 - Math.abs(s - 13) / 10) * 20;
      if (s >= 6 && s < 8) return 40 + (s - 6) * 20;
      return Math.max(10, 80 - (s - 18) * 8);
    },
    reasonTemplate: (peak, window) =>
      `Good sailing breeze from ${window.startLabel} to ${window.endLabel}. Peak ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
  },

  'paragliding': {
    name: 'Paragliding',
    wantsWind: true,
    minSpeed: 5,
    idealMin: 7,
    idealMax: 14,
    maxSpeed: 18,
    maxGustFactor: 1.3,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 5 || s > 18) return 0;
      if (s >= 7 && s <= 14) return 80 + (1 - Math.abs(s - 10) / 7) * 20;
      if (s >= 5 && s < 7) return 40 + (s - 5) * 20;
      return Math.max(10, 80 - (s - 14) * 15);
    },
    reasonTemplate: (peak, window) =>
      `Launchable conditions from ${window.startLabel} to ${window.endLabel}. Sweet spot ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
  },

  'boating': {
    name: 'Boating / Glass',
    wantsWind: false,
    maxSpeed: 5,
    idealMax: 3,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s > 8) return 0;
      if (s <= 2) return 100;
      if (s <= 3) return 90;
      if (s <= 5) return 70 - (s - 3) * 10;
      return Math.max(5, 50 - (s - 5) * 12);
    },
    reasonTemplate: (peak, window) =>
      `Glass conditions expected from ${window.startLabel} to ${window.endLabel}. Calmest at ${peak.label} (${Math.round(peak.windSpeed)} mph).`,
  },

  'paddling': {
    name: 'Paddling / SUP',
    wantsWind: false,
    maxSpeed: 6,
    idealMax: 4,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s > 10) return 0;
      if (s <= 2) return 100;
      if (s <= 4) return 85 - (s - 2) * 5;
      if (s <= 6) return 70 - (s - 4) * 10;
      return Math.max(5, 50 - (s - 6) * 10);
    },
    reasonTemplate: (peak, window) =>
      `Flat water from ${window.startLabel} to ${window.endLabel}. Best at ${peak.label} (${Math.round(peak.windSpeed)} mph).`,
  },

  'fishing': {
    name: 'Fishing',
    wantsWind: false,
    maxSpeed: 10,
    idealMax: 5,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s > 18) return 0;
      if (s <= 3) return 95;
      if (s <= 5) return 85;
      if (s <= 10) return 65 - (s - 5) * 5;
      return Math.max(5, 40 - (s - 10) * 4);
    },
    reasonTemplate: (peak, window) =>
      `Prime fishing from ${window.startLabel} to ${window.endLabel}. Calmest water at ${peak.label}.`,
  },

  'snowkiting': {
    name: 'Snowkiting',
    wantsWind: true,
    minSpeed: 10,
    idealMin: 12,
    idealMax: 22,
    maxSpeed: 35,
    maxGustFactor: 1.6,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 10) return 0;
      if (s > 35) return 0;
      if (s >= 12 && s <= 22) return 80 + (1 - Math.abs(s - 17) / 10) * 20;
      if (s >= 10 && s < 12) return 50 + (s - 10) * 15;
      return Math.max(10, 80 - (s - 22) * 4);
    },
    reasonTemplate: (peak, window) =>
      `Rideable wind from ${window.startLabel} to ${window.endLabel}. Peak ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
  },
};

function formatHourLabel(isoString) {
  try {
    const d = new Date(isoString);
    const h = d.getHours();
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  } catch {
    return isoString;
  }
}

function scoreHours(hourlyForecast, profile) {
  return hourlyForecast.map(h => ({
    ...h,
    score: profile.scorer(h),
    label: formatHourLabel(h.startTime),
  }));
}

function findContiguousWindows(scoredHours, minScore, minHours) {
  const windows = [];
  let current = null;

  for (const h of scoredHours) {
    if (h.score >= minScore) {
      if (!current) {
        current = { hours: [h], totalScore: h.score };
      } else {
        current.hours.push(h);
        current.totalScore += h.score;
      }
    } else {
      if (current && current.hours.length >= minHours) {
        windows.push(current);
      }
      current = null;
    }
  }
  if (current && current.hours.length >= minHours) {
    windows.push(current);
  }

  return windows;
}

/**
 * Find the optimal time windows for a given sport from hourly forecast data.
 *
 * @param {string} locationId — The lake/spot identifier
 * @param {Array} hourlyForecast — Array of { startTime, windSpeed, windDirection, temperature, shortForecast }
 * @param {string} sportType — Key into SPORT_PROFILES (e.g. 'foil-kite', 'boating', 'paragliding')
 * @returns {Object|null} Best window with start/end/peak times and reason, or null if none found
 */
export function findOptimalWindows(locationId, hourlyForecast, sportType) {
  const profile = SPORT_PROFILES[sportType];
  if (!profile || !hourlyForecast?.length) return null;

  const scored = scoreHours(hourlyForecast, profile);
  const threshold = profile.wantsWind ? 40 : 30;
  const windows = findContiguousWindows(scored, threshold, profile.minWindowHours);

  if (windows.length === 0) return null;

  const best = windows.reduce((a, b) => {
    const aAvg = a.totalScore / a.hours.length;
    const bAvg = b.totalScore / b.hours.length;
    const aLen = a.hours.length;
    const bLen = b.hours.length;
    const aRank = aAvg * 0.6 + Math.min(aLen, 8) * 5;
    const bRank = bAvg * 0.6 + Math.min(bLen, 8) * 5;
    return bRank > aRank ? b : a;
  });

  const peakHour = profile.wantsWind
    ? best.hours.reduce((a, b) => (b.windSpeed ?? 0) > (a.windSpeed ?? 0) ? b : a)
    : best.hours.reduce((a, b) => (b.windSpeed ?? 99) < (a.windSpeed ?? 99) ? b : a);

  const windowObj = {
    startLabel: best.hours[0].label,
    endLabel: best.hours[best.hours.length - 1].label,
  };

  return {
    locationId,
    sport: profile.name,
    sportType,
    windowStart: best.hours[0].startTime,
    windowEnd: best.hours[best.hours.length - 1].startTime,
    windowStartLabel: windowObj.startLabel,
    windowEndLabel: windowObj.endLabel,
    durationHours: best.hours.length,
    peakTime: peakHour.startTime,
    peakTimeLabel: peakHour.label,
    peakCondition: `${Math.round(peakHour.windSpeed ?? 0)} mph`,
    peakScore: peakHour.score,
    avgScore: Math.round(best.totalScore / best.hours.length),
    reason: profile.reasonTemplate(peakHour, windowObj),
    hours: best.hours.map(h => ({
      time: h.label,
      startTime: h.startTime,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      score: h.score,
      temperature: h.temperature,
      shortForecast: h.shortForecast,
    })),
  };
}

/**
 * Scan all sport profiles against the forecast and return windows for each.
 * Useful for a "best activity right now" overview.
 */
export function findAllSportWindows(locationId, hourlyForecast) {
  const results = {};
  for (const sportType of Object.keys(SPORT_PROFILES)) {
    const window = findOptimalWindows(locationId, hourlyForecast, sportType);
    if (window) results[sportType] = window;
  }
  return results;
}

export { SPORT_PROFILES };
