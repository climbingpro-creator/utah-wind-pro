/**
 * WATER SAFETY SERVICE
 * 
 * Provides hour-by-hour glass/wave forecasts and upstream wind warnings
 * for boaters, fishermen, paddlers, and water skiers.
 * 
 * Three core capabilities:
 *   1. HOURLY GLASS FORECAST — predict glass/chop for each hour today
 *   2. UPSTREAM WIND WARNINGS — detect incoming wind from KSLC/KPVU before it arrives
 *   3. PRESSURE & WEATHER ALERTS — detect pressure changes and cloud cover shifts
 */

import { weatherService } from './WeatherService';
import { monitorSwings } from './FrontalTrendPredictor';
import { generateWindField } from './WindFieldEngine';
import { safeToFixed } from '../utils/safeToFixed';

const UPSTREAM_STATIONS = {
  KSLC: { name: 'SLC Airport', leadTimeMin: 45, role: 'North flow / cold front origin' },
  KPVU: { name: 'Provo Airport', leadTimeMin: 30, role: 'South flow / thermal indicator' },
  QSF:  { name: 'Spanish Fork Canyon', leadTimeMin: 60, role: 'Canyon wind / SE thermal' },
};

// ─── HOURLY GLASS FORECAST ──────────────────────────────────────

/**
 * Generate hour-by-hour glass/wave forecast.
 * 
 * NOW POWERED BY WindFieldEngine — same wind speeds as every other activity.
 * We just interpret the speeds through a glass/wave lens.
 */
export async function getHourlyGlassForecast(locationId = 'utah-lake', currentWind = {}, upstreamData = {}, lakeState = {}, mesoData = {}) {
  // Get unified wind field — SAME speeds as kiting, sailing, etc.
  const windField = await generateWindField(locationId, currentWind, upstreamData, lakeState, mesoData);

  const hours = windField.hours.map(wf => {
    const { label, score, color, emoji } = assessWaveConditions(wf.speed);
    return {
      hour: wf.hour,
      offset: wf.offset,
      isToday: wf.isToday,
      isCurrent: wf.isCurrent,
      time: wf.time,
      predictedSpeed: wf.speed,
      nwsSpeed: wf.nwsSpeed,
      historicalSpeed: wf.speed,
      waveLabel: label,
      waveScore: score,
      waveColor: color,
      waveEmoji: emoji,
      cloudCover: wf.cloudCover,
      nwsForecast: wf.cloudCover?.label || null,
      translationFactor: windField.translation.factor,
      flowBlocked: windField.translation.blocked || false,
    };
  });

  const glassWindows = findGlassWindows(hours);
  const windEvents = findWindEvents(hours);

  return {
    hours,
    glassWindows,
    windEvents,
    translationFactor: windField.translation.factor,
    flowBlocked: windField.translation.blocked || false,
  };
}

// Translation factor now calculated by WindFieldEngine — single source of truth

function assessWaveConditions(speed) {
  if (speed <= 2) return { label: 'Glass', score: 100, color: 'emerald', emoji: '🪞' };
  if (speed <= 5) return { label: 'Near-Glass', score: 85, color: 'green', emoji: '✨' };
  if (speed <= 8) return { label: 'Light Chop', score: 65, color: 'lime', emoji: '〰️' };
  if (speed <= 12) return { label: 'Moderate', score: 45, color: 'yellow', emoji: '🌊' };
  if (speed <= 18) return { label: 'Choppy', score: 25, color: 'orange', emoji: '⚠️' };
  if (speed <= 25) return { label: 'Rough', score: 10, color: 'red', emoji: '🔴' };
  return { label: 'Dangerous', score: 0, color: 'red', emoji: '🚫' };
}

function findGlassWindows(hours) {
  const windows = [];
  let windowStart = null;

  for (const h of hours) {
    if (h.waveScore >= 65) {
      if (!windowStart) windowStart = h;
    } else {
      if (windowStart) {
        windows.push({
          start: windowStart.time,
          startHour: windowStart.hour,
          end: h.time,
          endHour: h.hour,
          duration: h.offset - windowStart.offset,
          avgSpeed: hours
            .filter(x => x.offset >= windowStart.offset && x.offset < h.offset)
            .reduce((s, x) => s + x.predictedSpeed, 0) / Math.max(1, h.offset - windowStart.offset),
          isToday: windowStart.isToday,
        });
        windowStart = null;
      }
    }
  }
  if (windowStart) {
    const last = hours[hours.length - 1];
    windows.push({
      start: windowStart.time,
      startHour: windowStart.hour,
      end: last.time,
      endHour: last.hour,
      duration: last.offset - windowStart.offset + 1,
      avgSpeed: 0,
      isToday: windowStart.isToday,
    });
  }

  return windows;
}

function findWindEvents(hours) {
  const events = [];
  for (let i = 1; i < hours.length; i++) {
    const prev = hours[i - 1];
    const curr = hours[i];
    const speedJump = curr.predictedSpeed - prev.predictedSpeed;

    if (speedJump >= 5) {
      events.push({
        time: curr.time,
        hour: curr.hour,
        offset: curr.offset,
        type: speedJump >= 10 ? 'wind_surge' : 'wind_increase',
        severity: speedJump >= 10 ? 'warning' : 'info',
        from: prev.predictedSpeed,
        to: curr.predictedSpeed,
        message: speedJump >= 10
          ? `Wind surge expected: ${safeToFixed(prev.predictedSpeed, 0)} → ${safeToFixed(curr.predictedSpeed, 0)} mph`
          : `Wind increasing: ${safeToFixed(prev.predictedSpeed, 0)} → ${safeToFixed(curr.predictedSpeed, 0)} mph`,
      });
    }

    if (speedJump <= -5 && curr.predictedSpeed <= 8) {
      events.push({
        time: curr.time,
        hour: curr.hour,
        offset: curr.offset,
        type: 'wind_dying',
        severity: 'positive',
        from: prev.predictedSpeed,
        to: curr.predictedSpeed,
        message: `Wind easing: calm conditions returning by ${curr.time}`,
      });
    }
  }
  return events;
}

// ─── UPSTREAM WIND WARNINGS ─────────────────────────────────────

/**
 * Check upstream meters for incoming wind events.
 * Returns warnings for boaters/fishermen based on what's happening
 * at KSLC, KPVU, QSF before it reaches the lake.
 */
export async function getUpstreamWarnings(_lakeId = 'utah-lake') {
  const warnings = [];

  try {
    const stationIds = Object.keys(UPSTREAM_STATIONS);
    const historyData = await weatherService.getSynopticHistory(stationIds, 3);

    if (!historyData || historyData.length === 0) return warnings;

    for (const station of historyData) {
      const config = UPSTREAM_STATIONS[station.stationId];
      if (!config || !station.history || station.history.length < 2) continue;

      const latest = station.history[station.history.length - 1];
      const oldest = station.history[0];

      if (!latest || latest.windSpeed == null) continue;

      // Strong wind detection
      if (latest.windSpeed >= 15) {
        warnings.push({
          id: `strong-wind-${station.stationId}`,
          station: station.stationId,
          stationName: config.name,
          severity: latest.windSpeed >= 25 ? 'critical' : 'warning',
          type: 'strong_wind',
          leadTime: config.leadTimeMin,
          message: `${config.name}: ${safeToFixed(latest.windSpeed, 0)} mph — strong wind heading your way`,
          detail: `${config.role}. Expect similar conditions at the lake in ~${config.leadTimeMin} min.`,
          windSpeed: latest.windSpeed,
          windDirection: latest.windDirection,
          icon: '💨',
        });
      }

      // Wind increasing rapidly
      if (oldest.windSpeed != null) {
        const speedChange = latest.windSpeed - oldest.windSpeed;
        if (speedChange >= 8) {
          warnings.push({
            id: `wind-building-${station.stationId}`,
            station: station.stationId,
            stationName: config.name,
            severity: speedChange >= 15 ? 'critical' : 'warning',
            type: 'wind_building',
            leadTime: config.leadTimeMin,
            message: `${config.name}: Wind building rapidly (${safeToFixed(oldest.windSpeed, 0)} → ${safeToFixed(latest.windSpeed, 0)} mph)`,
            detail: `Conditions deteriorating upstream. Plan to be off the water within ${config.leadTimeMin} min.`,
            windSpeed: latest.windSpeed,
            windDirection: latest.windDirection,
            icon: '📈',
          });
        }
      }

      // Direction shift detection (frontal passage)
      if (latest.windDirection != null && oldest.windDirection != null) {
        const dirChange = angleDiff(latest.windDirection, oldest.windDirection);
        if (dirChange >= 90 && latest.windSpeed >= 8) {
          warnings.push({
            id: `wind-shift-${station.stationId}`,
            station: station.stationId,
            stationName: config.name,
            severity: 'warning',
            type: 'wind_shift',
            leadTime: config.leadTimeMin,
            message: `${config.name}: Major wind shift detected (${safeToFixed(dirChange, 0)}° change)`,
            detail: `Possible frontal passage. Conditions may change rapidly at the lake.`,
            windSpeed: latest.windSpeed,
            windDirection: latest.windDirection,
            icon: '🔄',
          });
        }
      }

      // North flow incoming for Utah Lake
      if (station.stationId === 'KSLC' && latest.windSpeed >= 10) {
        const isNorth = latest.windDirection != null &&
          (latest.windDirection >= 315 || latest.windDirection <= 45);
        if (isNorth) {
          warnings.push({
            id: 'north-flow-incoming',
            station: 'KSLC',
            stationName: 'SLC Airport',
            severity: latest.windSpeed >= 18 ? 'critical' : 'warning',
            type: 'north_flow',
            leadTime: 45,
            message: `North flow active at SLC: ${safeToFixed(latest.windSpeed, 0)} mph from ${getCardinal(latest.windDirection)}`,
            detail: 'Strong north winds will reach Utah Lake within 30-60 min. Whitecaps likely.',
            windSpeed: latest.windSpeed,
            windDirection: latest.windDirection,
            icon: '⬇️',
          });
        }
      }

      // Canyon wind warning for Utah Lake
      if (station.stationId === 'QSF' && latest.windSpeed >= 12) {
        const isSE = latest.windDirection >= 100 && latest.windDirection <= 170;
        if (isSE) {
          warnings.push({
            id: 'canyon-wind-incoming',
            station: 'QSF',
            stationName: 'Spanish Fork Canyon',
            severity: 'info',
            type: 'canyon_wind',
            leadTime: 60,
            message: `Canyon thermal active: ${safeToFixed(latest.windSpeed, 0)} mph SE from Spanish Fork`,
            detail: 'Thermal winds building from the canyon. Expect choppy conditions on south end of Utah Lake.',
            windSpeed: latest.windSpeed,
            windDirection: latest.windDirection,
            icon: '🏔️',
          });
        }
      }
    }

    // Also run swing detection on the history
    const fpsHistory = historyData.find(s => s.stationId === 'KSLC')?.history;
    if (fpsHistory && fpsHistory.length >= 5) {
      const swingAlerts = monitorSwings(fpsHistory);
      for (const alert of swingAlerts) {
        if (alert.severity === 'critical' || alert.severity === 'warning') {
          warnings.push({
            id: `swing-${alert.id}`,
            station: 'system',
            stationName: 'Pattern Detection',
            severity: alert.severity,
            type: 'pattern',
            leadTime: 30,
            message: alert.label,
            detail: alert.message + (alert.windExpectation ? ` ${alert.windExpectation}` : ''),
            icon: alert.icon || '⚡',
          });
        }
      }
    }

  } catch (error) {
    console.warn('Upstream warning check failed:', error.message);
  }

  // Sort: critical first, then warning, then info
  const sevOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
  warnings.sort((a, b) => (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9));

  return warnings;
}

// ─── PRESSURE MONITORING ────────────────────────────────────────

/**
 * Analyze current pressure conditions for boating/fishing safety.
 */
export function analyzePressureForWater(pressureData = {}) {
  const { slcPressure, provoPressure: _provoPressure, gradient } = pressureData;
  const alerts = [];

  if (gradient != null) {
    const absGrad = Math.abs(gradient);

    if (absGrad > 3.0) {
      alerts.push({
        severity: 'critical',
        message: 'Extreme pressure gradient — very strong winds likely',
        detail: `Gradient: ${safeToFixed(gradient, 1)} mb. Expect sustained winds 20+ mph.`,
        icon: '🌪️',
      });
    } else if (absGrad > 2.0) {
      alerts.push({
        severity: 'warning',
        message: 'High pressure gradient — strong winds expected',
        detail: `Gradient: ${safeToFixed(gradient, 1)} mb. Expect gusty conditions.`,
        icon: '💨',
      });
    } else if (absGrad <= 0.5) {
      alerts.push({
        severity: 'positive',
        message: 'Flat pressure gradient — calm conditions favored',
        detail: `Gradient: ${safeToFixed(gradient, 1)} mb. Good for glass water.`,
        icon: '✅',
      });
    }
  }

  // Pressure trend for fishing
  if (slcPressure != null) {
    if (slcPressure < 29.70) {
      alerts.push({
        severity: 'info',
        message: 'Low barometric pressure — fish may be actively feeding',
        detail: `Pressure: ${safeToFixed(slcPressure, 2)} inHg. Falling pressure = pre-storm feeding frenzy.`,
        icon: '🎣',
      });
    } else if (slcPressure > 30.40) {
      alerts.push({
        severity: 'info',
        message: 'High barometric pressure — fish may be less active',
        detail: `Pressure: ${safeToFixed(slcPressure, 2)} inHg. Try deeper water and slower presentations.`,
        icon: '📊',
      });
    }
  }

  return alerts;
}

// ─── HELPERS ────────────────────────────────────────────────────

function angleDiff(a, b) {
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}

function getCardinal(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
