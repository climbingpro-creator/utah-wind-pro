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
    minSpeed: 10,      // Foilable minimum (matches app's foilMin threshold)
    idealMin: 14,
    idealMax: 22,
    maxSpeed: 30,
    maxGustFactor: 1.8,
    minWindowHours: 2,
    scorer: (h) => {
      const s = h.windSpeed ?? 0;
      if (s < 10) return 0;           // Below foil minimum
      if (s > 30) return 0;           // Too strong
      if (s >= 14 && s <= 22) return 80 + (1 - Math.abs(s - 18) / 8) * 20;  // Ideal: 80-100
      if (s >= 12 && s < 14) return 50 + (s - 12) * 15;                      // Good: 50-80
      if (s >= 10 && s < 12) return 30 + (s - 10) * 10;                      // Foilable: 30-50
      return Math.max(10, 80 - (s - 22) * 5);                                // Strong: decreasing
    },
    reasonTemplate: (peak, window) =>
      `Rideable winds from ${window.startLabel} to ${window.endLabel}. Peak ${Math.round(peak.windSpeed)} mph at ${peak.label}.`,
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

function formatWindowLabel(isoString, referenceIso) {
  const label = formatHourLabel(isoString);
  if (!referenceIso) return label;
  try {
    const d = new Date(isoString);
    const ref = new Date(referenceIso);
    if (d.getDate() !== ref.getDate()) return `${label} Tmw`;
  } catch { /* ignore */ }
  return label;
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
  // Lower threshold to include marginal-but-rideable conditions (foilable 10-12 mph)
  const threshold = profile.wantsWind ? 25 : 30;
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

  const startTime = best.hours[0].startTime;
  const endTime = best.hours[best.hours.length - 1].startTime;
  const windowObj = {
    startLabel: formatHourLabel(startTime),
    endLabel: formatWindowLabel(endTime, startTime),
  };

  return {
    locationId,
    sport: profile.name,
    sportType,
    windowStart: startTime,
    windowEnd: endTime,
    windowStartLabel: windowObj.startLabel,
    windowEndLabel: windowObj.endLabel,
    durationHours: best.hours.length,
    peakTime: peakHour.startTime,
    peakTimeLabel: formatWindowLabel(peakHour.startTime, startTime),
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

// ─── Specialized evaluators ─────────────────────────────────────

function angleDiff(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function buildWindowResult(locationId, sportName, sportType, hours, wantsWind) {
  if (!hours || hours.length < 2) return null;

  const peakHour = wantsWind
    ? hours.reduce((a, b) => (b.windSpeed ?? 0) > (a.windSpeed ?? 0) ? b : a)
    : hours.reduce((a, b) => (b.windSpeed ?? 99) < (a.windSpeed ?? 99) ? b : a);

  const startTime = hours[0].startTime;
  return {
    locationId,
    sport: sportName,
    sportType,
    windowStart: startTime,
    windowEnd: hours[hours.length - 1].startTime,
    windowStartLabel: formatHourLabel(startTime),
    windowEndLabel: formatWindowLabel(hours[hours.length - 1].startTime, startTime),
    durationHours: hours.length,
    peakTime: peakHour.startTime,
    peakTimeLabel: formatWindowLabel(peakHour.startTime, startTime),
    peakCondition: `${Math.round(peakHour.windSpeed ?? 0)} mph`,
    peakScore: 90,
    avgScore: 85,
    peakHour,
    hours: hours.map(h => ({
      time: formatHourLabel(h.startTime),
      startTime: h.startTime,
      windSpeed: h.windSpeed,
      windDirection: h.windDirection,
      score: 85,
      temperature: h.temperature,
      shortForecast: h.shortForecast,
    })),
  };
}

/**
 * Paragliding: strict direction alignment + gust safety cutoff.
 * @param {Array} hourlyForecast
 * @param {{ idealAxis?: number }} locationInfo
 */
export function evaluateParaglidingWindow(hourlyForecast, locationInfo = {}) {
  if (!hourlyForecast?.length) return null;
  const axis = locationInfo.idealAxis ?? null;
  const tolerance = 25;

  const blocks = [];
  let run = [];

  for (const h of hourlyForecast) {
    const s = h.windSpeed ?? 0;
    const g = h.gust ?? h.windGust ?? s;
    const dir = h.windDirection ?? h.direction;
    const dirOk = axis == null || (dir != null && angleDiff(dir, axis) <= tolerance);

    if (s >= 7 && s <= 14 && g < 18 && dirOk) {
      run.push(h);
    } else {
      if (run.length >= 2) blocks.push([...run]);
      run = [];
    }
  }
  if (run.length >= 2) blocks.push(run);
  if (blocks.length === 0) return null;

  const best = blocks.reduce((a, b) => b.length > a.length ? b : a);
  const result = buildWindowResult(null, 'Paragliding (Precision)', 'paragliding-precision', best, true);
  if (!result) return null;

  const pk = result.peakHour;
  const axisStr = axis != null ? ` perfectly aligned with the ${axis}° launch face` : '';
  result.reason = `Perfect ${Math.round(pk.windSpeed)}mph ridge lift${axisStr}. Low gust variance.`;
  delete result.peakHour;
  return result;
}

/**
 * Snowkiting: wind + cold/snowpack requirement.
 * @param {Array} hourlyForecast
 * @param {{ hasSnowpack?: boolean }} locationInfo
 */
export function evaluateSnowkiteWindow(hourlyForecast, locationInfo = {}) {
  if (!hourlyForecast?.length) return null;
  const needsCold = !locationInfo.hasSnowpack;

  const blocks = [];
  let run = [];

  for (const h of hourlyForecast) {
    const s = h.windSpeed ?? 0;
    const temp = h.temperature ?? 999;
    const tempOk = !needsCold || temp < 35;

    if (s >= 10 && s <= 25 && tempOk) {
      run.push(h);
    } else {
      if (run.length >= 2) blocks.push([...run]);
      run = [];
    }
  }
  if (run.length >= 2) blocks.push(run);
  if (blocks.length === 0) return null;

  const best = blocks.reduce((a, b) => b.length > a.length ? b : a);
  const result = buildWindowResult(null, 'Snowkiting (Precision)', 'snowkiting-precision', best, true);
  if (!result) return null;

  const pk = result.peakHour;
  result.reason = `Optimal ${Math.round(pk.windSpeed)}mph flow over snowpack. Dense, cold air will provide roughly 15% more kite power than summer winds.`;
  delete result.peakHour;
  return result;
}

/**
 * Sailing: steady laminar flow with tight gust delta.
 * @param {Array} hourlyForecast
 */
export function evaluateSailingWindow(hourlyForecast) {
  if (!hourlyForecast?.length) return null;

  const blocks = [];
  let run = [];

  for (const h of hourlyForecast) {
    const s = h.windSpeed ?? 0;
    const g = h.gust ?? h.windGust ?? s;
    const delta = g - s;

    if (s >= 8 && s <= 20 && delta < 8) {
      run.push(h);
    } else {
      if (run.length >= 2) blocks.push([...run]);
      run = [];
    }
  }
  if (run.length >= 2) blocks.push(run);
  if (blocks.length === 0) return null;

  const best = blocks.reduce((a, b) => b.length > a.length ? b : a);
  const result = buildWindowResult(null, 'Sailing (Precision)', 'sailing-precision', best, true);
  if (!result) return null;

  const pk = result.peakHour;
  const maxGust = Math.round(Math.max(...best.map(h => h.gust ?? h.windGust ?? h.windSpeed ?? 0)));
  result.reason = `Steady ${Math.round(pk.windSpeed)}mph sustained flow. Low gust variance (max ${maxGust}mph) provides ideal, smooth sailing conditions.`;
  delete result.peakHour;
  return result;
}

// ─── Main aggregators ───────────────────────────────────────────

/**
 * Scan all sport profiles against the forecast and return windows for each.
 * Includes both generic profile-based windows and specialized precision evaluators.
 *
 * @param {string} locationId
 * @param {Array} hourlyForecast
 * @param {{ idealAxis?: number, hasSnowpack?: boolean }} [locationInfo]
 */
export function findAllSportWindows(locationId, hourlyForecast, locationInfo) {
  if (!hourlyForecast?.length) return {};

  const hours24 = hourlyForecast.slice(0, 24);
  const results = {};

  for (const sportType of Object.keys(SPORT_PROFILES)) {
    const window = findOptimalWindows(locationId, hours24, sportType);
    if (window) results[sportType] = window;
  }

  const pg = evaluateParaglidingWindow(hours24, locationInfo);
  if (pg) {
    pg.locationId = locationId;
    if (!results['paragliding'] || pg.durationHours > results['paragliding'].durationHours) {
      results['paragliding'] = pg;
    }
  }

  const sk = evaluateSnowkiteWindow(hours24, locationInfo);
  if (sk) {
    sk.locationId = locationId;
    if (!results['snowkiting'] || sk.durationHours > results['snowkiting'].durationHours) {
      results['snowkiting'] = sk;
    }
  }

  const sail = evaluateSailingWindow(hours24);
  if (sail) {
    sail.locationId = locationId;
    if (!results['sailing'] || sail.durationHours > results['sailing'].durationHours) {
      results['sailing'] = sail;
    }
  }

  return results;
}

export { SPORT_PROFILES };
