/**
 * WATER SAFETY SERVICE — Hourly glass forecasts, upstream warnings, pressure analysis.
 *
 * Powered by @utahwind/weather's shared data engine.
 */

import { weatherService, monitorSwings, generateWindField } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

const UPSTREAM_STATIONS = {
  KSLC: { name: 'SLC Airport', leadTimeMin: 45, role: 'North flow / cold front origin' },
  KPVU: { name: 'Provo Airport', leadTimeMin: 30, role: 'South flow / thermal indicator' },
  QSF:  { name: 'Spanish Fork Canyon', leadTimeMin: 60, role: 'Canyon wind / SE thermal' },
};

const WAVE_THRESHOLDS = [
  { max: 2,  label: 'Glass',      emoji: '🪞', color: 'emerald', score: 100 },
  { max: 5,  label: 'Near-Glass', emoji: '✨', color: 'green',   score: 80 },
  { max: 8,  label: 'Light Chop', emoji: '〰️', color: 'lime',    score: 60 },
  { max: 12, label: 'Moderate',   emoji: '🌊', color: 'yellow',  score: 40 },
  { max: 18, label: 'Choppy',     emoji: '⚠️', color: 'orange',  score: 20 },
  { max: 99, label: 'Rough',      emoji: '🔴', color: 'red',     score: 5 },
];

function getWaveInfo(speed) {
  const s = speed ?? 0;
  for (const t of WAVE_THRESHOLDS) {
    if (s <= t.max) return t;
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
  const speed = currentWind?.speed ?? 0;

  const hours = [];
  const glassWindows = [];
  const windEvents = [];
  let windowStart = null;

  for (let offset = 0; offset < 24; offset++) {
    const h = (currentHour + offset) % 24;
    let predictedSpeed;

    if (offset === 0) {
      predictedSpeed = speed;
    } else {
      const hourFactor = getHourlyWindFactor(h);
      const baseDrift = speed * hourFactor;
      const upstreamPull = getUpstreamInfluence(h, upstreamData);
      predictedSpeed = Math.max(0, baseDrift + upstreamPull);
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

    if (predictedSpeed <= 5) {
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
      if (predictedSpeed > 15) {
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

function getHourlyWindFactor(hour) {
  // Diurnal thermal pattern: calm early morning & late evening, peak afternoon
  const factors = [
    0.3, 0.25, 0.2, 0.2, 0.25, 0.3,   // 0-5 AM
    0.4, 0.5, 0.65, 0.8, 0.95, 1.1,    // 6-11 AM
    1.2, 1.25, 1.3, 1.25, 1.15, 1.0,   // 12-5 PM
    0.8, 0.6, 0.45, 0.4, 0.35, 0.3,    // 6-11 PM
  ];
  return factors[hour] ?? 1.0;
}

function getUpstreamInfluence(hour, upstreamData) {
  if (!upstreamData) return 0;
  const kslc = upstreamData.kslcSpeed ?? 0;
  const kpvu = upstreamData.kpvuSpeed ?? 0;
  const peak = Math.max(kslc, kpvu);
  if (peak < 8) return 0;
  const thermalHours = hour >= 10 && hour <= 17;
  const factor = thermalHours ? 0.4 : 0.15;
  return peak * factor;
}

export function getUpstreamWarnings(stationData) {
  if (!stationData) return [];
  const warnings = [];

  if (typeof stationData === 'object' && !Array.isArray(stationData)) {
    for (const [id, cfg] of Object.entries(UPSTREAM_STATIONS)) {
      const data = stationData[id];
      if (data && (data.speed ?? 0) > 15) {
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
