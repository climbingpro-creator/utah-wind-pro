/**
 * WATER SAFETY SERVICE — Re-exports from the shared weather engine.
 *
 * Now powered by @utahwind/weather which contains the full WeatherService,
 * WindFieldEngine, and FrontalTrendPredictor pipeline.
 */

import { weatherService } from '@utahwind/weather';
import { monitorSwings } from '@utahwind/weather';
import { generateWindField } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

const UPSTREAM_STATIONS = {
  KSLC: { name: 'SLC Airport', leadTimeMin: 45, role: 'North flow / cold front origin' },
  KPVU: { name: 'Provo Airport', leadTimeMin: 30, role: 'South flow / thermal indicator' },
  QSF:  { name: 'Spanish Fork Canyon', leadTimeMin: 60, role: 'Canyon wind / SE thermal' },
};

export function getHourlyGlassForecast(windHistory, _forecastHours) {
  if (!windHistory || windHistory.length < 2) {
    return {
      hours: [],
      currentCondition: { label: 'No Data', color: 'gray', icon: '—' },
      glassWindow: null,
      overallRating: null,
    };
  }

  const latest = windHistory[windHistory.length - 1];
  const speed = latest?.speed ?? latest?.windSpeed ?? 0;
  let label, color;
  if (speed <= 3) { label = 'Glass'; color = 'emerald'; }
  else if (speed <= 8) { label = 'Calm'; color = 'green'; }
  else if (speed <= 12) { label = 'Ripple'; color = 'yellow'; }
  else { label = 'Choppy'; color = 'orange'; }

  return {
    hours: [],
    currentCondition: { label, color, icon: label === 'Glass' ? '🪞' : '🌊' },
    glassWindow: speed <= 5 ? { start: new Date().getHours(), end: new Date().getHours() + 3 } : null,
    overallRating: Math.max(0, 100 - speed * 8),
  };
}

export function getUpstreamWarnings(stationData) {
  if (!stationData) return [];
  const warnings = [];
  for (const [id, cfg] of Object.entries(UPSTREAM_STATIONS)) {
    const data = stationData[id];
    if (data && (data.speed ?? 0) > 15) {
      warnings.push({
        id, station: cfg.name, severity: 'warning',
        icon: '💨',
        message: `${cfg.name}: ${safeToFixed(data.speed, 0)} mph — wind arriving in ~${cfg.leadTimeMin} min`,
        leadTime: cfg.leadTimeMin,
      });
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
    alerts: Math.abs(gradient) > 2 ? [{ severity: 'warning', message: 'Rapid pressure change' }] : [],
    fishingImpact: trend === 'falling' ? 'Feeding activity increasing' : trend === 'rising' ? 'Activity may slow' : null,
  };
}

export { weatherService, monitorSwings, generateWindField };
