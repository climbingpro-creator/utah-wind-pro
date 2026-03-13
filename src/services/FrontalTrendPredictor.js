/**
 * FRONTAL TREND PREDICTOR — Real-Time Swing Monitor
 * 
 * Monitors station history for rapid changes that signal frontal passages:
 *   - Temperature drops >10°F in 3 hours = frontal boundary hit
 *   - Pressure surges >0.04 inHg in 3 hours = post-frontal high
 *   - Wind direction shifts >90° in 1 hour = frontal passage
 *   - Gust spikes = cold air undercut
 * 
 * Uses SWING_MONITOR config from mesoRegistry.json.
 */

import registry from '../config/mesoRegistry.json';

const CONFIG = registry.SWING_MONITOR;
const ALERTS = CONFIG.alerts;

/**
 * Analyze recent station history for swing events.
 * 
 * @param {Array} history - Array of { timestamp, windSpeed, windDirection, windGust, temperature }
 *                         ordered oldest → newest, typically 3 hours of 5-min observations
 * @param {object} [pressureHistory] - Optional: { values: [number], timestamps: [string] }
 * @returns {Array} Array of active swing alerts
 */
export function monitorSwings(history, pressureHistory = null) {
  if (!history || history.length < 4) return [];

  const alerts = [];
  const now = history[history.length - 1];
  const len = history.length;

  // ─── 3-Hour Temperature Drop ────────────────────────────────────
  const threeHourAgo = findClosestToAge(history, 180);
  if (threeHourAgo && now.temperature != null && threeHourAgo.temperature != null) {
    const tempDelta3h = now.temperature - threeHourAgo.temperature;

    if (tempDelta3h <= -CONFIG.front_trigger_3h) {
      alerts.push({
        id: 'frontal-hit',
        severity: 'critical',
        label: 'Frontal Boundary Hit',
        message: ALERTS.FRONTAL_HIT.message,
        detail: `${Math.abs(tempDelta3h).toFixed(1)}°F drop in 3 hours`,
        windExpectation: ALERTS.FRONTAL_HIT.wind_expectation,
        value: tempDelta3h,
        icon: '🌬️',
      });
    }
  }

  // ─── 1-Hour Temperature Drop ────────────────────────────────────
  const oneHourAgo = findClosestToAge(history, 60);
  if (oneHourAgo && now.temperature != null && oneHourAgo.temperature != null) {
    const tempDelta1h = now.temperature - oneHourAgo.temperature;

    if (tempDelta1h <= -CONFIG.front_trigger_1h) {
      alerts.push({
        id: 'rapid-cool',
        severity: 'warning',
        label: 'Rapid Cooling',
        message: `${Math.abs(tempDelta1h).toFixed(1)}°F drop in 1 hour`,
        detail: 'Cold air undercutting — gusty shift possible',
        windExpectation: 'North wind strengthening',
        value: tempDelta1h,
        icon: '❄️',
      });
    }
  }

  // ─── Wind Direction Shift ──────────────────────────────────────
  if (oneHourAgo && now.windDirection != null && oneHourAgo.windDirection != null) {
    const dirShift = angleDifference(oneHourAgo.windDirection, now.windDirection);

    if (dirShift >= ALERTS.WIND_SHIFT.direction_change_1h) {
      alerts.push({
        id: 'wind-shift',
        severity: 'warning',
        label: 'Major Wind Shift',
        message: ALERTS.WIND_SHIFT.message,
        detail: `${dirShift}° shift in 1 hour (${getCardinal(oneHourAgo.windDirection)} → ${getCardinal(now.windDirection)})`,
        windExpectation: ALERTS.WIND_SHIFT.wind_expectation,
        value: dirShift,
        icon: '🔄',
      });
    }
  }

  // ─── Gust Spike ────────────────────────────────────────────────
  if (now.windGust != null && now.windSpeed != null) {
    const gustDiff = now.windGust - now.windSpeed;
    if (gustDiff >= CONFIG.gust_spike_threshold) {
      alerts.push({
        id: 'gust-spike',
        severity: 'warning',
        label: 'Gust Spike',
        message: `Gusts ${now.windGust.toFixed(0)} mph (${gustDiff.toFixed(0)} over sustained)`,
        detail: 'Turbulent mixing — frontal boundary or convergence',
        windExpectation: 'Unstable conditions, rapid changes possible',
        value: gustDiff,
        icon: '💨',
      });
    }
  }

  // ─── Pressure Surge (if available) ─────────────────────────────
  if (pressureHistory?.values?.length >= 2) {
    const pLen = pressureHistory.values.length;
    const pNow = pressureHistory.values[pLen - 1];
    const pOld = pressureHistory.values[0];

    if (pNow != null && pOld != null) {
      const pDelta = pNow - pOld;

      if (pDelta >= CONFIG.pressure_trigger_3h) {
        alerts.push({
          id: 'pressure-bomb',
          severity: 'info',
          label: 'Pressure Building',
          message: ALERTS.PRESSURE_BOMB.message,
          detail: `+${pDelta.toFixed(3)} inHg in ${pressureHistory.values.length} readings`,
          windExpectation: ALERTS.PRESSURE_BOMB.wind_expectation,
          value: pDelta,
          icon: '📈',
        });
      } else if (pDelta <= -CONFIG.pressure_trigger_3h) {
        alerts.push({
          id: 'pressure-drop',
          severity: 'info',
          label: 'Pressure Falling',
          message: 'Approaching low — storm or strong thermal cycle possible',
          detail: `${pDelta.toFixed(3)} inHg drop`,
          windExpectation: 'Strengthening winds likely',
          value: pDelta,
          icon: '📉',
        });
      }
    }
  }

  // ─── 3-Hour Speed Trend ────────────────────────────────────────
  if (threeHourAgo && now.windSpeed != null && threeHourAgo.windSpeed != null) {
    const speedDelta = now.windSpeed - threeHourAgo.windSpeed;
    if (speedDelta >= 10) {
      alerts.push({
        id: 'speed-surge',
        severity: 'info',
        label: 'Wind Surging',
        message: `+${speedDelta.toFixed(0)} mph in 3 hours`,
        detail: `${threeHourAgo.windSpeed.toFixed(0)} → ${now.windSpeed.toFixed(0)} mph`,
        windExpectation: 'Rapid acceleration — pattern change underway',
        value: speedDelta,
        icon: '📊',
      });
    }
  }

  return alerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

/**
 * Quick check: is a front hitting right now?
 */
export function isFrontalPassage(history) {
  const alerts = monitorSwings(history);
  return alerts.some(a => a.id === 'frontal-hit' || a.id === 'wind-shift');
}

// ─── Helpers ──────────────────────────────────────────────────────

function findClosestToAge(history, minutesAgo) {
  if (!history || history.length === 0) return null;

  const now = new Date(history[history.length - 1].timestamp);
  const target = new Date(now.getTime() - minutesAgo * 60 * 1000);

  let closest = null;
  let closestDiff = Infinity;

  for (const obs of history) {
    const t = new Date(obs.timestamp);
    const diff = Math.abs(t.getTime() - target.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = obs;
    }
  }

  // Only use if within 30 min of target
  return closestDiff <= 30 * 60 * 1000 ? closest : null;
}

function angleDifference(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function severityRank(s) {
  const ranks = { critical: 0, warning: 1, info: 2 };
  return ranks[s] ?? 3;
}
