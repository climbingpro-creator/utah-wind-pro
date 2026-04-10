/**
 * FORECAST SERVICE
 * 
 * Integrates NWS forecasts and weather warnings with our prediction model.
 * 
 * This service:
 * 1. Fetches NWS forecasts and alerts
 * 2. Parses forecast text for wind-relevant keywords
 * 3. Correlates forecast patterns with expected surface wind conditions
 * 4. Provides multi-day wind predictions
 */

import axios from 'axios';
import { safeToFixed } from '../utils/safeToFixed';
import { LAKE_CONFIGS } from '../config/lakeStations.js';

// NWS API configuration
const NWS_BASE_URL = 'https://api.weather.gov';

// Forecast grid points for our locations
// Note: User-Agent removed - browsers block this header. NWS API works without it.
const NWS_HEADERS = {
  'Accept': 'application/geo+json',
};

const FORECAST_POINTS = {
  'utah-lake': { lat: 40.30, lng: -111.88 },
  'deer-creek': { lat: 40.48, lng: -111.50 },
  'willard-bay': { lat: 41.38, lng: -112.07 },
  'bear-lake': { lat: 41.95, lng: -111.30 },
  'strawberry': { lat: 40.17, lng: -111.13 },
  'sand-hollow': { lat: 37.10, lng: -113.40 },
  'flaming-gorge': { lat: 40.91, lng: -109.42 },
  'scofield': { lat: 39.77, lng: -111.14 },
  'vernal': { lat: 40.45, lng: -109.52 },
  'panguitch': { lat: 37.82, lng: -112.44 },
  'sulfur-creek': { lat: 41.095, lng: -110.955 },
};

const LOCATION_TO_FORECAST_KEY = {
  'utah-lake-lincoln': 'utah-lake', 'utah-lake-sandy': 'utah-lake',
  'utah-lake-vineyard': 'utah-lake', 'utah-lake-zigzag': 'utah-lake',
  'utah-lake-mm19': 'utah-lake', 'potm-south': 'utah-lake', 'potm-north': 'utah-lake',
  'rush-lake': 'utah-lake', 'grantsville': 'utah-lake', 'stockton-bar': 'utah-lake',
  'inspo': 'utah-lake', 'west-mountain': 'utah-lake', 'yuba': 'utah-lake',
  'jordanelle': 'deer-creek', 'east-canyon': 'deer-creek', 'echo': 'deer-creek', 'rockport': 'deer-creek',
  'pineview': 'willard-bay', 'hyrum': 'willard-bay', 'powder-mountain': 'willard-bay', 'monte-cristo': 'willard-bay',
  'strawberry-ladders': 'strawberry', 'strawberry-bay': 'strawberry', 'strawberry-soldier': 'strawberry',
  'strawberry-view': 'strawberry', 'strawberry-river': 'strawberry',
  'skyline-drive': 'scofield', 'scofield': 'scofield',
  'starvation': 'vernal', 'steinaker': 'vernal', 'red-fleet': 'vernal',
  'otter-creek': 'panguitch', 'fish-lake': 'panguitch', 'minersville': 'panguitch',
  'piute': 'panguitch', 'panguitch': 'panguitch',
  'quail-creek': 'sand-hollow', 'lake-powell': 'sand-hollow',
};

function resolveForecastKey(locationId) {
  if (LOCATION_TO_FORECAST_KEY[locationId]) return LOCATION_TO_FORECAST_KEY[locationId];
  if (FORECAST_POINTS[locationId]) return locationId;
  return null;
}

/**
 * Resolve coordinates for a location: prefer LAKE_CONFIGS real coordinates,
 * fall back to FORECAST_POINTS hardcoded grid, return null if neither exists.
 */
function resolveCoordinates(locationId) {
  const lakeConfig = LAKE_CONFIGS[locationId];
  if (lakeConfig?.coordinates) {
    return { lat: lakeConfig.coordinates.lat, lng: lakeConfig.coordinates.lng };
  }
  const forecastKey = resolveForecastKey(locationId);
  if (forecastKey && FORECAST_POINTS[forecastKey]) {
    return FORECAST_POINTS[forecastKey];
  }
  return null;
}

const nwsGridCache = new Map();
const NWS_GRID_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours - NWS grids don't change

async function getCachedForecastGrid(lat, lng) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = nwsGridCache.get(key);
  if (cached && Date.now() - cached.timestamp < NWS_GRID_CACHE_TTL) {
    return cached.data;
  }
  const grid = await getForecastGrid(lat, lng);
  if (grid) {
    nwsGridCache.set(key, { data: grid, timestamp: Date.now() });
  }
  return grid;
}

// Weather pattern keywords and their wind implications
const WEATHER_PATTERNS = {
  // North flow patterns
  northFlow: {
    keywords: ['north wind', 'northerly', 'cold front', 'high pressure building', 'clearing'],
    directionKeywords: ['N ', 'NNW', 'NNE', 'north'],
    expectedEffect: 'north_flow',
    kiteability: 'excellent',
    confidence: 0.85,
  },
  
  // South storm patterns
  southStorm: {
    keywords: ['south wind', 'southerly', 'low pressure', 'storm', 'approaching front'],
    directionKeywords: ['S ', 'SSW', 'SSE', 'south'],
    expectedEffect: 'south_storm',
    kiteability: 'poor_gusty',
    confidence: 0.70,
  },
  
  // Thermal patterns
  thermal: {
    keywords: ['sunny', 'clear', 'light wind', 'high pressure', 'warming'],
    directionKeywords: ['SE', 'ESE', 'light and variable'],
    expectedEffect: 'thermal',
    kiteability: 'good_afternoon',
    confidence: 0.65,
  },
  
  // Wind advisory patterns
  windAdvisory: {
    keywords: ['wind advisory', 'high wind', 'gusty', 'strong wind', 'damaging wind'],
    directionKeywords: [],
    expectedEffect: 'high_wind',
    kiteability: 'dangerous',
    confidence: 0.95,
  },
  
  // Calm patterns
  calm: {
    keywords: ['calm', 'light wind', 'variable', 'little wind'],
    directionKeywords: ['calm', 'light'],
    expectedEffect: 'calm',
    kiteability: 'poor_light',
    confidence: 0.60,
  },
};

// Alert severity mapping
const ALERT_SEVERITY = {
  'Extreme': { level: 4, color: 'red', action: 'DO NOT KITE' },
  'Severe': { level: 3, color: 'orange', action: 'Dangerous conditions' },
  'Moderate': { level: 2, color: 'yellow', action: 'Use caution' },
  'Minor': { level: 1, color: 'blue', action: 'Monitor conditions' },
};

// Forecast stages for multi-stage prediction system
export const FORECAST_STAGES = {
  DAY_BEFORE: 'day_before',      // Evening before - initial outlook
  MORNING: 'morning',            // Morning of - updated forecast
  PRE_THERMAL: 'pre_thermal',    // 1-2 hours before expected thermal
  IMMINENT: 'imminent',          // 30 min - 1 hour before
  ACTIVE: 'active',              // Thermal/wind event is happening
};

/**
 * Fetch NWS forecast grid data for a location
 */
async function getForecastGrid(lat, lng) {
  try {
    const response = await axios.get(`${NWS_BASE_URL}/points/${lat},${lng}`, {
      headers: NWS_HEADERS,
      timeout: 10000,
    });
    
    return {
      forecastUrl: response.data.properties.forecast,
      forecastHourlyUrl: response.data.properties.forecastHourly,
      forecastGridUrl: response.data.properties.forecastGridData,
      forecastOffice: response.data.properties.forecastOffice,
      gridX: response.data.properties.gridX,
      gridY: response.data.properties.gridY,
    };
  } catch (error) {
    console.error('Error fetching forecast grid:', error.message);
    return null;
  }
}

function resolveStateFromCoordinates(locationId) {
  const coords = resolveCoordinates(locationId);
  if (!coords) return 'UT';

  const { lat, lng } = coords;
  if (lat >= 41.0 && lng >= -111.05 && lng <= -104.05) return 'WY';
  if (lat <= 37.0 && lng <= -109.05) return 'AZ';
  if (lng <= -114.05) return 'NV';
  if (lat >= 42.0) return 'ID';
  if (lng >= -109.05 && lat <= 39.0) return 'CO';
  return 'UT';
}

/**
 * Fetch active weather alerts for a location's state
 */
export async function getActiveAlerts(locationId) {
  const state = resolveStateFromCoordinates(locationId);
  try {
    const response = await axios.get(`${NWS_BASE_URL}/alerts/active`, {
      params: { area: state },
      headers: NWS_HEADERS,
      timeout: 10000,
    });
    
    const alerts = response.data.features || [];
    
    // Filter and process wind-relevant alerts
    const windAlerts = alerts
      .filter(alert => {
        const event = alert.properties.event?.toLowerCase() || '';
        return (
          event.includes('wind') ||
          event.includes('storm') ||
          event.includes('front') ||
          event.includes('advisory') ||
          event.includes('warning')
        );
      })
      .map(alert => ({
        id: alert.properties.id,
        event: alert.properties.event,
        severity: alert.properties.severity,
        severityInfo: ALERT_SEVERITY[alert.properties.severity] || ALERT_SEVERITY['Minor'],
        headline: alert.properties.headline,
        description: alert.properties.description,
        instruction: alert.properties.instruction,
        onset: alert.properties.onset,
        ends: alert.properties.ends,
        areas: alert.properties.areaDesc,
        // Parse wind info from description
        windInfo: parseWindFromAlert(alert.properties.description),
      }));
    
    return windAlerts;
  } catch (error) {
    console.error('Error fetching alerts:', error.message);
    return [];
  }
}

/**
 * Parse wind speed and direction from alert text
 */
function parseWindFromAlert(description) {
  if (!description) return null;
  
  const windInfo = {
    speed: null,
    gust: null,
    direction: null,
  };
  
  // Look for wind speed patterns
  const speedMatch = description.match(/winds?\s+(\d+)\s*(?:to\s*(\d+))?\s*mph/i);
  if (speedMatch) {
    windInfo.speed = parseInt(speedMatch[1]);
    if (speedMatch[2]) {
      windInfo.speed = (parseInt(speedMatch[1]) + parseInt(speedMatch[2])) / 2;
    }
  }
  
  // Look for gust patterns
  const gustMatch = description.match(/gusts?\s+(?:up\s+to\s+)?(\d+)\s*mph/i);
  if (gustMatch) {
    windInfo.gust = parseInt(gustMatch[1]);
  }
  
  // Look for direction
  const dirMatch = description.match(/(north|south|east|west|NW|NE|SW|SE|N|S|E|W)\s+wind/i);
  if (dirMatch) {
    windInfo.direction = dirMatch[1].toUpperCase();
  }
  
  return windInfo;
}

/**
 * Fetch 7-day forecast for a location
 * Now includes sky condition, cloud cover, and precip chance for fishing intelligence
 */
export async function get7DayForecast(locationId = 'utah-lake') {
  const point = resolveCoordinates(locationId);
  if (!point) return null;
  
  try {
    const grid = await getCachedForecastGrid(point.lat, point.lng);
    if (!grid) return null;
    
    const response = await axios.get(grid.forecastUrl, {
      headers: NWS_HEADERS,
      timeout: 10000,
    });
    
    const periods = response.data.properties.periods || [];
    
    return periods.map(period => {
      const sky = parseSkyCondition(period.shortForecast);
      const cloudCover = estimateCloudCover(sky);
      const precipChance = period.probabilityOfPrecipitation?.value ?? estimatePrecipChance(period.shortForecast);
      
      return {
        name: period.name,
        startTime: period.startTime,
        endTime: period.endTime,
        isDaytime: period.isDaytime,
        temperature: period.temperature,
        temperatureUnit: period.temperatureUnit,
        windSpeed: period.windSpeed,
        windDirection: period.windDirection,
        shortForecast: period.shortForecast,
        detailedForecast: period.detailedForecast,
        // NEW: Sky/cloud/precip data for fishing intelligence
        sky,
        cloudCover,
        precipChance,
        // Analyze for kiting
        windAnalysis: analyzeWindForecast(period),
      };
    });
  } catch (error) {
    console.error('Error fetching 7-day forecast:', error.message);
    return null;
  }
}

/**
 * Parse sky condition from NWS shortForecast text
 */
function parseSkyCondition(shortForecast) {
  if (!shortForecast) return 'partly';
  const t = shortForecast.toLowerCase();

  if (/thunder|tstorm|t-storm/.test(t)) return 'storm';
  if (/heavy rain|rain shower|showers/.test(t)) return 'rain';
  if (/drizzle|light rain|sprinkle/.test(t)) return 'drizzle';
  if (/snow|sleet|freezing/.test(t)) return 'storm';
  if (/overcast|mostly cloudy/.test(t)) return 'overcast';
  if (/cloudy|clouds/.test(t)) return 'cloudy';
  if (/partly/.test(t)) return 'partly';
  if (/sunny|clear|fair/.test(t)) return 'clear';
  return 'partly';
}

/**
 * Estimate cloud cover percentage from sky condition
 */
function estimateCloudCover(sky) {
  const cloudMap = {
    clear: 0,
    partly: 30,
    cloudy: 70,
    overcast: 95,
    drizzle: 90,
    rain: 85,
    storm: 100,
  };
  return cloudMap[sky] ?? 50;
}

/**
 * Estimate precipitation chance from shortForecast text
 */
function estimatePrecipChance(shortForecast) {
  if (!shortForecast) return 0;
  const t = shortForecast.toLowerCase();
  
  // Look for explicit percentages like "30% chance of rain"
  const percentMatch = t.match(/(\d+)%?\s*(?:chance|probability)/);
  if (percentMatch) return parseInt(percentMatch[1]);
  
  // Estimate from keywords
  if (/thunder|tstorm|storm/.test(t)) return 70;
  if (/rain showers|showers likely/.test(t)) return 60;
  if (/chance.*rain|rain.*chance|scattered.*showers/.test(t)) return 40;
  if (/slight chance|isolated/.test(t)) return 20;
  if (/drizzle|light rain/.test(t)) return 50;
  if (/rain|showers/.test(t)) return 55;
  if (/snow/.test(t)) return 50;
  
  return 0;
}

/**
 * Fetch hourly forecast for detailed wind prediction
 * Now includes cloudCover, precipChance, and sky condition for fishing intelligence
 */
export async function getHourlyForecast(locationId = 'utah-lake') {
  const point = resolveCoordinates(locationId);
  if (!point) return null;
  
  try {
    const grid = await getCachedForecastGrid(point.lat, point.lng);
    if (!grid) return null;
    
    const response = await axios.get(grid.forecastHourlyUrl, {
      headers: NWS_HEADERS,
      timeout: 10000,
    });
    
    const periods = response.data.properties.periods || [];
    
    return periods.slice(0, 48).map(period => {
      const sky = parseSkyCondition(period.shortForecast);
      const cloudCover = estimateCloudCover(sky);
      const precipChance = period.probabilityOfPrecipitation?.value ?? estimatePrecipChance(period.shortForecast);
      
      return {
        startTime: period.startTime,
        time: period.startTime,
        temperature: period.temperature,
        windSpeed: parseWindSpeed(period.windSpeed),
        windDirection: period.windDirection,
        shortForecast: period.shortForecast,
        // NEW: Sky/cloud/precip data for fishing intelligence
        sky,
        cloudCover,
        precipChance,
        // Kiting analysis
        kiteAnalysis: analyzeHourlyForKiting(period),
      };
    });
  } catch (error) {
    console.error('Error fetching hourly forecast:', error.message);
    return null;
  }
}

/**
 * Parse wind speed string to number
 */
function parseWindSpeed(windSpeedStr) {
  if (!windSpeedStr) return null;
  
  // Handle "10 mph" or "10 to 15 mph"
  const match = windSpeedStr.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  if (match) {
    if (match[2]) {
      return (parseInt(match[1]) + parseInt(match[2])) / 2;
    }
    return parseInt(match[1]);
  }
  return null;
}

/**
 * Analyze a forecast period for wind patterns
 */
function analyzeWindForecast(period) {
  const forecast = (period.detailedForecast || '').toLowerCase();
  const shortForecast = (period.shortForecast || '').toLowerCase();
  const windDir = (period.windDirection || '').toUpperCase();
  const windSpeed = parseWindSpeed(period.windSpeed);
  
  let pattern = null;
  let confidence = 0;
  let kiteability = 'unknown';
  let notes = [];
  
  // Check each weather pattern
  for (const [patternName, patternConfig] of Object.entries(WEATHER_PATTERNS)) {
    let matchScore = 0;
    
    // Check keywords in forecast text
    for (const keyword of patternConfig.keywords) {
      if (forecast.includes(keyword) || shortForecast.includes(keyword)) {
        matchScore += 2;
      }
    }
    
    // Check direction keywords
    for (const dirKeyword of patternConfig.directionKeywords) {
      if (windDir.includes(dirKeyword.toUpperCase())) {
        matchScore += 3;
      }
    }
    
    if (matchScore > 0 && matchScore > confidence) {
      pattern = patternName;
      confidence = Math.min(matchScore / 10, patternConfig.confidence);
      kiteability = patternConfig.kiteability;
    }
  }
  
  // Adjust based on wind speed
  if (windSpeed !== null) {
    if (windSpeed >= 10 && windSpeed <= 25) {
      notes.push(`Good kite speed: ${windSpeed} mph`);
      if (kiteability === 'unknown') kiteability = 'possible';
    } else if (windSpeed > 25) {
      notes.push(`Strong wind: ${windSpeed} mph - use caution`);
      kiteability = 'caution_strong';
    } else if (windSpeed < 10) {
      notes.push(`Light wind: ${windSpeed} mph`);
      if (kiteability === 'unknown') kiteability = 'poor_light';
    }
  }
  
  // Check for specific conditions
  if (forecast.includes('rain') || forecast.includes('thunder')) {
    notes.push('Precipitation expected');
    kiteability = 'poor_weather';
  }
  
  if (forecast.includes('gust')) {
    notes.push('Gusty conditions');
    if (kiteability === 'excellent') kiteability = 'good_gusty';
  }
  
  return {
    pattern,
    confidence,
    kiteability,
    notes,
    windSpeed,
    windDirection: windDir,
  };
}

/**
 * Analyze hourly forecast for kiting
 */
function analyzeHourlyForKiting(period) {
  const windSpeed = parseWindSpeed(period.windSpeed);
  const windDir = (period.windDirection || '').toUpperCase();
  const hour = new Date(period.startTime).getHours();
  
  let foilKiteable = false;
  let twinTipKiteable = false;
  let thermalWindow = false;
  let northFlowWindow = false;
  
  // Check speed thresholds
  if (windSpeed >= 10) foilKiteable = true;
  if (windSpeed >= 15) twinTipKiteable = true;
  
  // Check for thermal window (SE wind, afternoon)
  if (['SE', 'ESE', 'SSE', 'E'].includes(windDir) && hour >= 12 && hour <= 18) {
    thermalWindow = true;
  }
  
  // Check for north flow window
  if (['N', 'NNW', 'NNE', 'NW', 'NE'].includes(windDir) && windSpeed >= 10) {
    northFlowWindow = true;
  }
  
  return {
    foilKiteable,
    twinTipKiteable,
    thermalWindow,
    northFlowWindow,
    windSpeed,
    windDirection: windDir,
    hour,
  };
}

/**
 * Get forecast-based kite windows for the next 48 hours
 */
export async function getKiteWindows(locationId = 'utah-lake') {
  const hourly = await getHourlyForecast(locationId);
  if (!hourly) return [];
  
  const windows = [];
  let currentWindow = null;
  
  for (const hour of hourly) {
    const analysis = hour.kiteAnalysis;
    
    if (analysis.foilKiteable) {
      if (!currentWindow) {
        currentWindow = {
          start: hour.startTime,
          end: hour.startTime,
          type: analysis.northFlowWindow ? 'north_flow' : 
                analysis.thermalWindow ? 'thermal' : 'other',
          avgSpeed: analysis.windSpeed,
          direction: analysis.windDirection,
          hours: 1,
          foilOnly: !analysis.twinTipKiteable,
        };
      } else {
        currentWindow.end = hour.startTime;
        currentWindow.avgSpeed = (currentWindow.avgSpeed * currentWindow.hours + analysis.windSpeed) / (currentWindow.hours + 1);
        currentWindow.hours++;
        if (analysis.twinTipKiteable) currentWindow.foilOnly = false;
      }
    } else {
      if (currentWindow && currentWindow.hours >= 2) {
        windows.push(currentWindow);
      }
      currentWindow = null;
    }
  }
  
  // Don't forget the last window
  if (currentWindow && currentWindow.hours >= 2) {
    windows.push(currentWindow);
  }
  
  return windows;
}

/**
 * Get combined forecast summary with alerts
 */
export async function getForecastSummary(locationId = 'utah-lake') {
  const [alerts, forecast, kiteWindows] = await Promise.all([
    getActiveAlerts(locationId),
    get7DayForecast(locationId),
    getKiteWindows(locationId),
  ]);
  
  // Find relevant alerts for this location
  const relevantAlerts = alerts.filter(alert => {
    const areas = (alert.areas || '').toLowerCase();
    if (locationId.includes('utah-lake')) {
      return areas.includes('utah') || areas.includes('salt lake');
    }
    if (locationId.includes('deer-creek')) {
      return areas.includes('wasatch') || areas.includes('summit');
    }
    if (locationId.includes('willard')) {
      return areas.includes('weber') || areas.includes('box elder');
    }
    return true;
  });
  
  // Build day-by-day summary
  const daySummaries = [];
  if (forecast) {
    for (let i = 0; i < forecast.length; i += 2) {
      const dayPeriod = forecast[i];
      const nightPeriod = forecast[i + 1];
      
      if (!dayPeriod) continue;
      
      const dayDate = new Date(dayPeriod.startTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      
      // Find kite windows for this day
      const dayStart = new Date(dayPeriod.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayWindows = kiteWindows.filter(w => {
        const windowStart = new Date(w.start);
        return windowStart >= dayStart && windowStart < dayEnd;
      });
      
      daySummaries.push({
        date: dayDate,
        dateObj: dayStart,
        day: dayPeriod,
        night: nightPeriod,
        kiteWindows: dayWindows,
        hasKiteableWind: dayWindows.length > 0,
        bestWindow: dayWindows.length > 0 ? dayWindows.reduce((best, w) => 
          w.avgSpeed > best.avgSpeed ? w : best
        ) : null,
      });
    }
  }
  
  return {
    alerts: relevantAlerts,
    hasActiveAlert: relevantAlerts.length > 0,
    highestAlertSeverity: relevantAlerts.length > 0 
      ? relevantAlerts.reduce((max, a) => 
          (a.severityInfo?.level || 0) > (max.severityInfo?.level || 0) ? a : max
        )
      : null,
    daySummaries,
    kiteWindows,
    nextKiteWindow: kiteWindows.length > 0 ? kiteWindows[0] : null,
  };
}

/**
 * Correlate NWS forecast with our indicator model
 * This is where forecast meets historical validation
 */
export function correlateForecastWithIndicators(forecastAnalysis, currentIndicators) {
  const correlation = {
    agreement: 'unknown',
    confidence: 0,
    notes: [],
  };
  
  if (!forecastAnalysis || !currentIndicators) return correlation;
  
  const forecastPattern = forecastAnalysis.pattern;
  
  // Check if forecast matches current indicator signals
  if (forecastPattern === 'northFlow') {
    if (currentIndicators.kslc?.isNorth && currentIndicators.kslc?.speed >= 8) {
      correlation.agreement = 'strong';
      correlation.confidence = 0.9;
      correlation.notes.push('NWS forecast and KSLC indicator both show north flow');
    } else if (currentIndicators.kslc?.isNorth) {
      correlation.agreement = 'moderate';
      correlation.confidence = 0.7;
      correlation.notes.push('NWS forecast shows north flow, KSLC shows weak north signal');
    } else {
      correlation.agreement = 'weak';
      correlation.confidence = 0.5;
      correlation.notes.push('NWS forecast shows north flow, but indicators not confirming yet');
    }
  }
  
  if (forecastPattern === 'thermal') {
    if (currentIndicators.spanishFork?.isSE && currentIndicators.spanishFork?.speed >= 6) {
      correlation.agreement = 'strong';
      correlation.confidence = 0.85;
      correlation.notes.push('NWS forecast and Spanish Fork indicator both show thermal development');
    } else {
      correlation.agreement = 'moderate';
      correlation.confidence = 0.6;
      correlation.notes.push('NWS forecast shows thermal conditions, waiting for indicator confirmation');
    }
  }
  
  return correlation;
}

/**
 * Get full forecast with multi-stage predictions
 * This is a synchronous function that calculates forecast based on current conditions
 */
export function getFullForecast(locationId, conditions = {}) {
  const {
    pressureGradient = 0,
    eveningTemp: _eveningTemp,
    eveningWindSpeed: _eveningWindSpeed = 0,
    morningTemp,
    morningWindSpeed = 0,
    morningWindDirection: _morningWindDirection,
    currentWindSpeed = 0,
    currentWindDirection,
    thermalDelta = 0,
  } = conditions;
  
  const now = new Date();
  const hour = now.getHours();
  
  // Determine current stage based on time of day
  let currentStage = FORECAST_STAGES.DAY_BEFORE;
  if (hour >= 6 && hour < 10) {
    currentStage = FORECAST_STAGES.MORNING;
  } else if (hour >= 10 && hour < 11) {
    currentStage = FORECAST_STAGES.PRE_THERMAL;
  } else if (hour >= 11 && hour < 12) {
    currentStage = FORECAST_STAGES.IMMINENT;
  } else if (hour >= 12 && hour < 18) {
    currentStage = FORECAST_STAGES.ACTIVE;
  }
  
  // Calculate base probability from conditions
  let baseProbability = 50;
  
  // Pressure gradient effect
  if (Math.abs(pressureGradient) < 1.0) {
    baseProbability += 20; // Good for thermal
  } else if (Math.abs(pressureGradient) > 2.0) {
    baseProbability -= 20; // North flow dominant
  }
  
  if (thermalDelta > 10) {
    baseProbability += 25;
  } else if (thermalDelta > 5) {
    baseProbability += 15;
  }
  
  // Wind speed effect
  if (currentWindSpeed > 8 && currentWindSpeed < 20) {
    baseProbability += 10;
  }
  
  baseProbability = Math.max(0, Math.min(100, baseProbability));
  
  const pressureGradientDisplay = (() => {
    const s = safeToFixed(pressureGradient, 1);
    return s === '--' ? '0' : s;
  })();
  
  // Determine wind type
  let windType = 'thermal';
  let expectedDirection = 'SE';
  
  if (pressureGradient > 1.5) {
    windType = 'north_flow';
    expectedDirection = 'N';
    baseProbability = Math.min(baseProbability + 20, 95);
  } else if (pressureGradient < -1.5) {
    windType = 'south_flow';
    expectedDirection = 'S';
  }
  
  // Build stage forecasts
  const stages = {
    [FORECAST_STAGES.DAY_BEFORE]: {
      stage: FORECAST_STAGES.DAY_BEFORE,
      probability: Math.round(baseProbability * 0.7), // Lower confidence day before
      confidence: 0.6,
      windType,
      expectedDirection,
      expectedSpeed: { min: 8, max: 15 },
      message: `${windType === 'thermal' ? 'Thermal' : 'North flow'} conditions expected tomorrow`,
      factors: [
        { name: 'Pressure Gradient', value: pressureGradientDisplay, impact: pressureGradient > 1.5 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.MORNING]: {
      stage: FORECAST_STAGES.MORNING,
      probability: Math.round(baseProbability * 0.85),
      confidence: 0.75,
      windType,
      expectedDirection,
      expectedSpeed: { min: 10, max: 18 },
      message: morningWindSpeed > 5 
        ? 'Early wind activity detected - good sign' 
        : 'Calm morning - thermal development expected',
      factors: [
        { name: 'Morning Wind', value: `${(() => { const s = safeToFixed(morningWindSpeed, 0); return s === '--' ? '0' : s; })()} mph`, impact: morningWindSpeed > 5 ? 'positive' : 'neutral' },
        { name: 'Temperature', value: `${safeToFixed(morningTemp, 0)}°F`, impact: 'neutral' },
      ],
    },
    [FORECAST_STAGES.PRE_THERMAL]: {
      stage: FORECAST_STAGES.PRE_THERMAL,
      probability: Math.round(baseProbability * 0.95),
      confidence: 0.85,
      windType,
      expectedDirection,
      expectedSpeed: { min: 10, max: 20 },
      message: thermalDelta > 5 
        ? 'Thermal pump active - wind building' 
        : 'Conditions developing',
      factors: [
        { name: 'Thermal Delta', value: `${(() => { const s = safeToFixed(thermalDelta, 1); return s === '--' ? '0' : s; })()}°F`, impact: thermalDelta > 5 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.IMMINENT]: {
      stage: FORECAST_STAGES.IMMINENT,
      probability: baseProbability,
      confidence: 0.9,
      windType,
      expectedDirection,
      expectedSpeed: { min: 12, max: 22 },
      message: currentWindSpeed > 8 
        ? 'Wind event starting!' 
        : 'Thermal should start within 30-60 minutes',
      factors: [
        { name: 'Current Wind', value: `${(() => { const s = safeToFixed(currentWindSpeed, 0); return s === '--' ? '0' : s; })()} mph`, impact: currentWindSpeed > 8 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.ACTIVE]: {
      stage: FORECAST_STAGES.ACTIVE,
      probability: baseProbability,
      confidence: 0.95,
      windType,
      expectedDirection,
      expectedSpeed: { min: currentWindSpeed * 0.8, max: currentWindSpeed * 1.3 },
      message: currentWindSpeed > 10 
        ? `Active ${windType === 'thermal' ? 'thermal' : 'north flow'} - ${safeToFixed(currentWindSpeed, 0)} mph` 
        : 'Light conditions - may improve',
      factors: [
        { name: 'Current Wind', value: `${(() => { const s = safeToFixed(currentWindSpeed, 0); return s === '--' ? '0' : s; })()} mph ${currentWindDirection ? `from ${currentWindDirection}°` : ''}`, impact: currentWindSpeed > 10 ? 'positive' : 'negative' },
      ],
    },
  };
  
  return {
    locationId,
    timestamp: now.toISOString(),
    currentStage,
    stages,
    overall: {
      probability: baseProbability,
      windType,
      expectedDirection,
      peakWindow: '12:00 PM - 4:00 PM',
      confidence: stages[currentStage]?.confidence || 0.7,
    },
  };
}

export default {
  getActiveAlerts,
  get7DayForecast,
  getHourlyForecast,
  getKiteWindows,
  getForecastSummary,
  getFullForecast,
  correlateForecastWithIndicators,
  FORECAST_STAGES,
};
