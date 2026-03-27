/**
 * WATER SAFETY SERVICE — Stub for apps/water
 *
 * The full implementation lives in apps/wind and depends on WeatherService,
 * FrontalTrendPredictor, and WindFieldEngine. Once we extract those into
 * @utahwind/weather, this stub will be replaced with the real service.
 */

export function getHourlyGlassForecast(_windHistory, _forecastHours) {
  return {
    hours: [],
    currentCondition: { label: 'No Data', color: 'gray', icon: '—' },
    glassWindow: null,
    overallRating: null,
  };
}

export function getUpstreamWarnings(_stationData) {
  return [];
}

export function analyzePressureForWater(_pressureData) {
  return {
    trend: 'stable',
    ratePerHour: 0,
    alerts: [],
    fishingImpact: null,
  };
}
