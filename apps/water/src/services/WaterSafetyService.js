/**
 * WATER SAFETY SERVICE — Hourly glass forecasts, upstream warnings, pressure analysis.
 *
 * Powered by @utahwind/weather's shared data engine.
 */

import { weatherService, monitorSwings, generateWindField, LAKE_CONFIGS } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

const DEFAULT_UPSTREAM_STATIONS = {
  KSLC: { name: 'SLC Airport', leadTimeMin: 45, role: 'North flow / cold front origin' },
  KPVU: { name: 'Provo Airport', leadTimeMin: 30, role: 'South flow / thermal indicator' },
  QSF:  { name: 'Spanish Fork Canyon', leadTimeMin: 60, role: 'Canyon wind / SE thermal' },
};

function getUpstreamStationsForLake(locationId) {
  const config = LAKE_CONFIGS?.[locationId];
  if (!config?.stations) return DEFAULT_UPSTREAM_STATIONS;

  const result = {};
  const pressHigh = config.stations.pressure?.high;
  const pressLow = config.stations.pressure?.low;
  const refs = config.stations.reference || [];

  if (pressHigh?.id) {
    result[pressHigh.id] = { name: pressHigh.name, leadTimeMin: 45, role: pressHigh.role || 'Pressure reference (high)' };
  }
  if (pressLow?.id && pressLow.id !== pressHigh?.id) {
    result[pressLow.id] = { name: pressLow.name, leadTimeMin: 30, role: pressLow.role || 'Pressure reference (low)' };
  }
  for (const ref of refs) {
    if (ref.id && !result[ref.id]) {
      result[ref.id] = { name: ref.name, leadTimeMin: 40, role: 'Reference station' };
    }
  }

  return Object.keys(result).length > 0 ? result : DEFAULT_UPSTREAM_STATIONS;
}

const WAVE_THRESHOLDS = [
  { max: 2,  label: 'Glass',      emoji: '🪞', color: 'emerald', score: 100 },
  { max: 5,  label: 'Near-Glass', emoji: '✨', color: 'green',   score: 80 },
  { max: 8,  label: 'Light Chop', emoji: '〰️', color: 'lime',    score: 60 },
  { max: 12, label: 'Moderate',   emoji: '🌊', color: 'yellow',  score: 40 },
  { max: 18, label: 'Choppy',     emoji: '⚠️', color: 'orange',  score: 20 },
  { max: 99, label: 'Rough',      emoji: '🔴', color: 'red',     score: 5 },
];

function getWaveInfo(speed) {
  if (speed == null) {
    return { max: Infinity, label: 'No Data', emoji: '❓', color: 'slate', score: null };
  }
  for (const t of WAVE_THRESHOLDS) {
    if (speed <= t.max) return t;
  }
  return WAVE_THRESHOLDS[WAVE_THRESHOLDS.length - 1];
}

function formatHour(h) {
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return '12 AM';
  if (hr === 12) return '12 PM';
  return hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
}

/**
 * Build an hourly glass forecast from the current wind state + upstream indicators.
 * Produces a 24-hour hour-by-hour timeline with glass windows and wind events.
 */
export async function getHourlyGlassForecast(locationId, currentWind, upstreamData, _lakeState, _mesoData) {
  const now = new Date();
  const currentHour = now.getHours();
  const speed = currentWind?.speed ?? null;

  const hours = [];
  const glassWindows = [];
  const windEvents = [];
  let windowStart = null;

  for (let offset = 0; offset < 24; offset++) {
    const h = (currentHour + offset) % 24;
    let predictedSpeed;

    if (offset === 0) {
      predictedSpeed = speed;
    } else if (speed != null) {
      const hourFactor = getHourlyWindFactor(h, locationId);
      const baseDrift = speed * hourFactor;
      const upstreamPull = getUpstreamInfluence(h, upstreamData, locationId);
      predictedSpeed = Math.max(0, baseDrift + upstreamPull);
    } else {
      predictedSpeed = null;
    }

    const wave = getWaveInfo(predictedSpeed);
    const isCurrent = offset === 0;

    hours.push({
      time: formatHour(h),
      hour: h,
      isCurrent,
      predictedSpeed: safeToFixed(predictedSpeed, 0),
      waveScore: wave.score,
      waveLabel: wave.label,
      waveEmoji: wave.emoji,
      waveColor: wave.color,
      cloudCover: null,
    });

    if (predictedSpeed != null && predictedSpeed <= 5) {
      if (windowStart === null) windowStart = { h, offset };
    } else {
      if (windowStart !== null) {
        const duration = offset - windowStart.offset;
        if (duration >= 2) {
          glassWindows.push({
            start: formatHour(windowStart.h),
            end: formatHour(h),
            duration,
            isToday: windowStart.h >= currentHour,
          });
        }
        windowStart = null;
      }
      if (predictedSpeed != null && predictedSpeed > 15) {
        windEvents.push({
          time: formatHour(h),
          message: `Strong wind expected: ~${safeToFixed(predictedSpeed, 0)} mph`,
          severity: predictedSpeed > 20 ? 'warning' : 'info',
        });
      }
    }
  }

  if (windowStart !== null) {
    const duration = 24 - windowStart.offset;
    if (duration >= 2) {
      glassWindows.push({
        start: formatHour(windowStart.h),
        end: formatHour((windowStart.h + duration) % 24),
        duration,
        isToday: windowStart.h >= currentHour,
      });
    }
  }

  const flowBlocked = (upstreamData?.kslcSpeed ?? 0) > 10 && speed <= 5;

  return { hours, glassWindows, windEvents, flowBlocked };
}

const VALLEY_FACTORS = [
  0.30, 0.25, 0.20, 0.20, 0.25, 0.30,   // 0-5 AM
  0.40, 0.50, 0.65, 0.80, 0.95, 1.10,   // 6-11 AM
  1.20, 1.25, 1.30, 1.25, 1.15, 1.00,   // 12-5 PM
  0.80, 0.60, 0.45, 0.40, 0.35, 0.30,   // 6-11 PM
];

const HIGH_ALTITUDE_FACTORS = [
  0.25, 0.20, 0.18, 0.18, 0.20, 0.28,   // 0-5 AM: calmer nights at altitude
  0.45, 0.60, 0.80, 1.00, 1.15, 1.30,   // 6-11 AM: thermals ramp faster
  1.40, 1.45, 1.40, 1.30, 1.10, 0.85,   // 12-5 PM: earlier peak, sharper drop
  0.55, 0.38, 0.30, 0.28, 0.26, 0.25,   // 6-11 PM: faster evening die-off
];

function getHourlyWindFactor(hour, locationId) {
  const config = LAKE_CONFIGS?.[locationId];
  const elevation = config?.elevation ?? 4500;

  if (elevation >= 7000) {
    return HIGH_ALTITUDE_FACTORS[hour] ?? 1.0;
  }
  if (elevation >= 5500) {
    const t = (elevation - 5500) / 1500;
    const valley = VALLEY_FACTORS[hour] ?? 1.0;
    const high = HIGH_ALTITUDE_FACTORS[hour] ?? 1.0;
    return valley * (1 - t) + high * t;
  }
  return VALLEY_FACTORS[hour] ?? 1.0;
}

function getUpstreamInfluence(hour, upstreamData, locationId) {
  if (!upstreamData) return 0;

  const stationMap = getUpstreamStationsForLake(locationId);
  const stationIds = Object.keys(stationMap);

  let peak = 0;
  for (const id of stationIds) {
    const key = `${id.toLowerCase()}Speed`;
    const altKey = `${id}Speed`;
    const speed = upstreamData[key] ?? upstreamData[altKey] ?? 0;
    if (speed > peak) peak = speed;
  }

  if (peak === 0) {
    const kslc = upstreamData.kslcSpeed ?? 0;
    const kpvu = upstreamData.kpvuSpeed ?? 0;
    peak = Math.max(kslc, kpvu);
  }

  if (peak < 8) return 0;
  const thermalHours = hour >= 10 && hour <= 17;
  const factor = thermalHours ? 0.4 : 0.15;
  return peak * factor;
}

export function getUpstreamWarnings(stationData, locationId) {
  if (!stationData) return [];
  const warnings = [];
  const stations = getUpstreamStationsForLake(locationId);

  if (typeof stationData === 'object' && !Array.isArray(stationData)) {
    for (const [id, cfg] of Object.entries(stations)) {
      const data = stationData[id];
      if (data && data.speed != null && data.speed > 15) {
        warnings.push({
          id, station: cfg.name, severity: 'warning',
          icon: '💨',
          message: `${cfg.name}: ${safeToFixed(data.speed, 0)} mph — wind arriving in ~${cfg.leadTimeMin} min`,
          detail: cfg.role,
          leadTime: cfg.leadTimeMin,
        });
      }
    }
  }

  return warnings;
}

export function analyzePressureForWater(pressureData) {
  if (!pressureData) {
    return { trend: 'stable', ratePerHour: 0, alerts: [], fishingImpact: null };
  }
  const gradient = pressureData.gradient ?? 0;
  const trend = Math.abs(gradient) < 0.5 ? 'stable' : gradient > 0 ? 'rising' : 'falling';
  return {
    trend,
    ratePerHour: gradient,
    alerts: Math.abs(gradient) > 2 ? [{ severity: 'warning', message: 'Rapid pressure change', icon: '📊', detail: `Gradient: ${safeToFixed(gradient, 1)} mb` }] : [],
    fishingImpact: trend === 'falling' ? 'Feeding activity increasing' : trend === 'rising' ? 'Activity may slow' : null,
  };
}

export { weatherService, monitorSwings, generateWindField };
