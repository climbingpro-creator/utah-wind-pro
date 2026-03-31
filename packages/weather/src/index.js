// ─── Store ────────────────────────────────────────────────────
export { useWeatherStore, useWeatherData } from './store/useWeatherStore.js';

// ─── Core Services ────────────────────────────────────────────
export { weatherService } from './services/WeatherService.js';
export {
  generateWindField,
  setWindFieldLearnedWeights,
  STATION_NODES,
  PROPAGATION_EDGES,
  LOCATION_STATIONS,
  isDaylightHour,
  DAYLIGHT,
} from './services/WindFieldEngine.js';
export { monitorSwings, isFrontalPassage } from './services/FrontalTrendPredictor.js';
export {
  LakeState,
  calculateProbability,
  getProbabilityStatus,
} from './services/DataNormalizer.js';

// ─── Forecast & Correlation ───────────────────────────────────
export {
  getHourlyForecast,
  getFullForecast,
  getActiveAlerts,
  get7DayForecast,
  getKiteWindows,
  getForecastSummary,
  correlateForecastWithIndicators,
  FORECAST_STAGES,
} from './services/ForecastService.js';
export { default as ForecastServiceDefault } from './services/ForecastService.js';
export {
  calculateCorrelatedWind,
  hasActiveTriggers,
  getParaglidingSwitchConfig,
} from './services/CorrelationEngine.js';

// ─── Thermal ──────────────────────────────────────────────────
export {
  predictThermal,
  setLearnedWeights,
  setStatisticalModels,
  getDirectionInfo,
  formatTimeUntil,
  SPANISH_FORK_INDICATOR,
  NORTH_FLOW_INDICATOR,
  PROVO_AIRPORT_INDICATOR,
  POINT_OF_MOUNTAIN_INDICATOR,
  THERMAL_PROFILES,
} from './services/ThermalPredictor.js';
export * from './services/ThermalPropagation.js';

// ─── Learning & Session ───────────────────────────────────────
export { learningSystem } from './services/LearningSystem.js';
export { default as learningSystemDefault } from './services/LearningSystem.js';
export { evaluateHistoricalWindows } from './services/LearningSystem.js';
export { sessionService } from './services/SessionValidation.js';

// ─── Config: Lake Stations ────────────────────────────────────
export {
  LAKE_CONFIGS,
  getAllStationIds,
  getPrimaryRidgeStation,
  WIND_DIRECTION_OPTIMAL,
  STATION_INFO,
  STATION_REGISTRY,
  getStation,
  getStationName,
} from './config/lakeStations.js';
export {
  getStation as getStationFromRegistry,
  getStationName as getStationNameFromRegistry,
  getStationsByRole,
  STATION_REGISTRY as STATION_REGISTRY_RAW,
} from './config/stationRegistry.js';

// ─── Config: WU PWS ──────────────────────────────────────────
export {
  WU_PWS_STATIONS,
  WU_PRIORITY_STATIONS,
  getWuStationsForSpot,
  getWuStationIdsForSpots,
  normalizeWuObservation,
  normalizeWuHistoryObs,
} from './config/wuPwsNetwork.js';

// ─── Sport Intelligence ──────────────────────────────────────
export {
  findOptimalWindows,
  findAllSportWindows,
  evaluateParaglidingWindow,
  evaluateSnowkiteWindow,
  evaluateSailingWindow,
  SPORT_PROFILES,
} from './SportIntelligenceEngine.js';

// ─── Nowcasting ──────────────────────────────────────────────
export { applyLiveCorrections } from './services/NowcastEngine.js';

// ─── Spatial Interpolation ───────────────────────────────────
export { SpatialInterpolator } from './services/SpatialInterpolator.js';

// ─── Surface Physics ─────────────────────────────────────────
export {
  applySurfacePhysics,
  calculateFetchMultiplier,
  calculateVenturiMultiplier,
  calculateThermalMultiplier,
  WATER_POLYGONS,
  VENTURI_CORRIDORS,
} from './services/SurfacePhysics.js';

// ─── Aquatic Intelligence ─────────────────────────────────────
export {
  AquaticIntelligenceEngine,
  fetchNearestUSGSData,
  fetchNWSWeather,
  inferWaterTemp,
  assessFlowConditions,
  generateFisheryProfile,
  identifyWaterBody,
  reverseGeocodeWater,
  fetchMarineTelemetry,
} from './services/AquaticIntelligenceEngine.js';

// ─── Utils ────────────────────────────────────────────────────
export { apiUrl, isNativeApp, isIOS, isAndroid, isWeb } from './utils/platform.js';
export { safeToFixed } from './utils/safeToFixed.js';
