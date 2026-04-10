/**
 * CrossLocationForecastService
 * 
 * Aggregates forecasts across multiple locations to answer:
 * "Where should I go and when?"
 * 
 * Features:
 * - Activity-specific spot filtering
 * - Batch forecast fetching with grid deduplication
 * - Cross-location ranking by sport windows
 * - Week event detection (fronts, epic days, calm periods)
 * - Server context integration (ML-corrected NWS + learned weights)
 */

import { getHourlyForecast, get7DayForecast } from './ForecastService.js';
import { findAllSportWindows, SPORT_PROFILES } from '../SportIntelligenceEngine.js';
import { LAKE_CONFIGS } from '../config/lakeStations.js';
import { apiUrl } from '../utils/platform.js';
import { calculateFetchMultiplier, calculateVenturiMultiplier } from './SurfacePhysics.js';

// ─── Activity to Spots Mapping ───────────────────────────────────

// Priority spots get shown first (Utah Lake, Deer Creek, Willard are the main hubs)
const PRIORITY_SPOTS = new Set([
  'utah-lake-lincoln', 'utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-sandy',
  'deer-creek', 'willard-bay',
]);

// ─── Spots with Validated Sensor Networks ───────────────────────
// ONLY include spots where we have:
// 1. Ground-truth sensors (PWS, MesoWest stations)
// 2. Validated correlation models (KPVU, QSF, FPS indicators)
// 3. Historical accuracy data to back predictions
//
// We are microclimate experts with real data, not NWS rebroadcasters.
// Bear Lake, Pineview removed until we have local sensor coverage.

const ACTIVITY_SPOTS = {
  kiting: [
    // Priority spots - full sensor coverage + validated models
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard', 'utah-lake-sandy',
    'deer-creek', 'willard-bay',
    // Secondary spots with partial coverage
    'sand-hollow', 'jordanelle', 'rockport', 'echo', 'east-canyon', 'yuba',
    // NOTE: bear-lake, pineview removed - no local sensor validation
  ],
  windsurfing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
    'deer-creek', 'willard-bay',
    'sand-hollow', 'jordanelle',
  ],
  sailing: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'deer-creek', 'willard-bay',
    'jordanelle', 'echo',
  ],
  paragliding: [
    'potm-south', 'potm-north', 'inspo', 'west-mountain', 'stockton-bar',
  ],
  snowkiting: [
    'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier',
    'strawberry-view', 'skyline-drive', 'scofield',
  ],
  boating: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
    'deer-creek', 'willard-bay',
    'sand-hollow', 'jordanelle', 'rockport', 'echo', 'east-canyon', 'yuba',
    'starvation', 'steinaker', 'flaming-gorge', 'lake-powell',
  ],
  paddling: [
    'utah-lake-zigzag', 'utah-lake-lincoln', 'deer-creek', 'willard-bay',
    'jordanelle', 'rockport', 'echo',
  ],
  fishing: [
    'strawberry-ladders', 'strawberry-bay', 'deer-creek', 'jordanelle',
    'rockport', 'echo', 'east-canyon',
    'starvation', 'steinaker', 'flaming-gorge', 'fish-lake', 'scofield',
  ],
};

// Map activity names to sport profile keys
const ACTIVITY_TO_SPORT_KEY = {
  kiting: 'foil-kite',
  windsurfing: 'windsurfing',
  sailing: 'sailing',
  paragliding: 'paragliding',
  snowkiting: 'snowkiting',
  boating: 'boating',
  paddling: 'paddling',
  fishing: 'fishing',
};

// NWS grid mapping (same as ForecastService)
const LOCATION_TO_FORECAST_KEY = {
  'utah-lake-lincoln': 'utah-lake', 'utah-lake-sandy': 'utah-lake',
  'utah-lake-vineyard': 'utah-lake', 'utah-lake-zigzag': 'utah-lake',
  'utah-lake-mm19': 'utah-lake', 'potm-south': 'utah-lake', 'potm-north': 'utah-lake',
  'rush-lake': 'utah-lake', 'grantsville': 'utah-lake', 'stockton-bar': 'utah-lake',
  'inspo': 'utah-lake', 'west-mountain': 'utah-lake', 'yuba': 'utah-lake',
  'deer-creek': 'deer-creek', 'jordanelle': 'deer-creek', 'east-canyon': 'deer-creek',
  'echo': 'deer-creek', 'rockport': 'deer-creek',
  'willard-bay': 'willard-bay', 'pineview': 'willard-bay', 'hyrum': 'willard-bay',
  'powder-mountain': 'willard-bay', 'monte-cristo': 'willard-bay',
  'bear-lake': 'bear-lake',
  'strawberry-ladders': 'strawberry', 'strawberry-bay': 'strawberry',
  'strawberry-soldier': 'strawberry', 'strawberry-view': 'strawberry',
  'strawberry-river': 'strawberry',
  'skyline-drive': 'scofield', 'scofield': 'scofield',
  'starvation': 'vernal', 'steinaker': 'vernal', 'red-fleet': 'vernal',
  'flaming-gorge': 'flaming-gorge',
  'sand-hollow': 'sand-hollow', 'quail-creek': 'sand-hollow', 'lake-powell': 'sand-hollow',
  'otter-creek': 'panguitch', 'fish-lake': 'panguitch', 'minersville': 'panguitch',
  'piute': 'panguitch', 'panguitch': 'panguitch',
};

function resolveForecastKey(locationId) {
  return LOCATION_TO_FORECAST_KEY[locationId] || locationId;
}

// ─── Forecast Cache ──────────────────────────────────────────────

const forecastCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCachedForecast(gridKey) {
  const cached = forecastCache.get(gridKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedForecast(gridKey, data) {
  forecastCache.set(gridKey, { data, timestamp: Date.now() });
}

// ─── Server Context (ML-corrected forecasts + learned weights) ───

let serverContext = null;
let serverContextTimestamp = 0;
const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch server context with ML-corrected NWS data and learned weights
 */
export async function fetchServerContext() {
  // Return cached if fresh
  if (serverContext && Date.now() - serverContextTimestamp < CONTEXT_TTL_MS) {
    return serverContext;
  }

  try {
    const response = await fetch(apiUrl('/api/cron/collect?action=context'), {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.warn('Server context fetch failed:', response.status);
      return serverContext; // Return stale data if available
    }

    const data = await response.json();
    serverContext = data;
    serverContextTimestamp = Date.now();
    
    console.log('[CrossLocationForecast] Server context loaded:', {
      mlApplied: data.mlApplied,
      hasLearnedWeights: !!data.learnedWeights,
      grids: data.nwsHourly ? Object.keys(data.nwsHourly).length : 0,
    });
    
    return data;
  } catch (err) {
    console.warn('Server context fetch error:', err.message);
    return serverContext; // Return stale data if available
  }
}

/**
 * Get ML-corrected hourly forecast for a grid from server context
 */
function getMLCorrectedHourly(gridKey, context) {
  if (!context?.nwsHourly?.[gridKey]) return null;
  
  const grid = context.nwsHourly[gridKey];
  // Prefer ML-corrected hourly if available
  const hourly = grid.mlHourly || grid.hourly;
  
  if (!hourly?.length) return null;
  
  // Map to standard format
  return hourly.map(h => ({
    startTime: h.startTime || h.time,
    time: h.startTime || h.time,
    windSpeed: h.adjustedWind ?? h.windSpeed ?? h.speed ?? null,
    windDirection: h.windDirection ?? h.dir,
    temperature: h.temperature ?? h.temp,
    shortForecast: h.shortForecast ?? h.text ?? '',
    mlCorrected: !!grid.mlHourly,
    // Preserve any additional fields
    gust: h.gust ?? h.windGust,
    sky: h.sky,
    cloudCover: h.cloudCover,
    precipChance: h.precipChance,
  }));
}

/**
 * Apply learned weights to adjust forecast scores
 */
function applyLearnedWeights(spotResults, context) {
  if (!context?.learnedWeights) return spotResults;
  
  const weights = context.learnedWeights;
  
  return spotResults.map(spot => {
    let adjustedScore = spot.score;
    
    // Apply location-specific bias if available
    const locationBias = weights.locationBias?.[spot.spotId];
    if (locationBias) {
      // Positive bias = model historically under-predicts here
      adjustedScore += locationBias * 5; // Scale factor
    }
    
    // Apply speed bias correction
    if (weights.speedBiasCorrection && spot.peakSpeed) {
      const speedBias = weights.speedBiasCorrection;
      // If we historically over-predict speed, reduce confidence
      if (speedBias < 0 && spot.peakSpeed > 15) {
        adjustedScore -= Math.abs(speedBias) * 3;
      }
    }
    
    // Clamp to valid range
    adjustedScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));
    
    return {
      ...spot,
      score: adjustedScore,
      rawScore: spot.score, // Keep original for debugging
      hasLearnedAdjustment: adjustedScore !== spot.score,
    };
  });
}

// ─── Core Functions ──────────────────────────────────────────────

/**
 * Get relevant spots for an activity
 */
export function getActivitySpots(activity) {
  const spotIds = ACTIVITY_SPOTS[activity] || ACTIVITY_SPOTS.kiting;
  return spotIds
    .filter(id => LAKE_CONFIGS[id])
    .map(id => ({
      id,
      name: LAKE_CONFIGS[id].shortName || LAKE_CONFIGS[id].name,
      region: LAKE_CONFIGS[id].region,
      coordinates: LAKE_CONFIGS[id].coordinates,
      gridKey: resolveForecastKey(id),
      config: LAKE_CONFIGS[id],
    }));
}

/**
 * Fetch hourly forecasts for multiple spots, deduping by NWS grid
 * Prefers ML-corrected data from server context when available
 */
export async function fetchAllSpotForecasts(spots, context = null) {
  // Group spots by grid key to avoid duplicate fetches
  const gridGroups = new Map();
  for (const spot of spots) {
    const gridKey = spot.gridKey || resolveForecastKey(spot.id);
    if (!gridGroups.has(gridKey)) {
      gridGroups.set(gridKey, []);
    }
    gridGroups.get(gridKey).push(spot);
  }

  // Fetch each unique grid (with caching)
  const gridForecasts = new Map();
  const fetchPromises = [];

  for (const [gridKey, _groupSpots] of gridGroups) {
    // First, try to get ML-corrected data from server context
    if (context) {
      const mlHourly = getMLCorrectedHourly(gridKey, context);
      if (mlHourly) {
        gridForecasts.set(gridKey, mlHourly);
        continue; // Skip NWS fetch, we have better data
      }
    }
    
    // Fall back to cache or fresh NWS fetch
    const cached = getCachedForecast(gridKey);
    if (cached) {
      gridForecasts.set(gridKey, cached);
    } else {
      fetchPromises.push(
        getHourlyForecast(gridKey)
          .then(data => {
            if (data) {
              setCachedForecast(gridKey, data);
              gridForecasts.set(gridKey, data);
            }
          })
          .catch(err => {
            console.warn(`Failed to fetch forecast for ${gridKey}:`, err.message);
          })
      );
    }
  }

  await Promise.all(fetchPromises);

  // Map forecasts back to spots
  const results = [];
  for (const spot of spots) {
    const gridKey = spot.gridKey || resolveForecastKey(spot.id);
    const forecast = gridForecasts.get(gridKey);
    if (forecast) {
      results.push({
        ...spot,
        hourlyForecast: forecast,
        mlCorrected: forecast[0]?.mlCorrected || false,
      });
    }
  }

  return results;
}

/**
 * Apply fetch and venturi physics to hourly forecast for a water spot.
 * NWS forecasts are land-based; on-water conditions are typically stronger.
 * 
 * @param {Array} hourlyForecast - Raw NWS hourly forecast
 * @param {Object} spot - Spot config with coordinates
 * @returns {Array} Adjusted hourly forecast with physics multipliers applied
 */
function applyOnWaterPhysics(hourlyForecast, spot) {
  if (!hourlyForecast?.length || !spot?.coordinates) {
    return hourlyForecast;
  }
  
  const { lat, lng } = spot.coordinates;
  
  return hourlyForecast.map(hour => {
    const windDir = hour.windDirection ?? 270; // Default to W if not specified
    const rawSpeed = hour.windSpeed ?? null;
    if (rawSpeed == null) return hour;
    
    // Calculate fetch acceleration (wind over open water)
    const fetch = calculateFetchMultiplier(lat, lng, windDir);
    
    // Calculate venturi funneling (terrain channeling)
    const venturi = calculateVenturiMultiplier(lat, lng, windDir);
    
    // Combined multiplier
    const multiplier = fetch.multiplier * venturi.multiplier;
    const adjustedSpeed = Math.round(rawSpeed * multiplier * 10) / 10;
    
    return {
      ...hour,
      windSpeed: adjustedSpeed,
      rawWindSpeed: rawSpeed,
      physicsMultiplier: multiplier,
      fetchBoost: fetch.multiplier > 1 ? Math.round((fetch.multiplier - 1) * 100) : 0,
      venturiBoost: venturi.multiplier > 1 ? Math.round((venturi.multiplier - 1) * 100) : 0,
    };
  });
}

/**
 * Rank spots by best window for a given activity
 * Priority spots (Utah Lake, Deer Creek, Willard) are boosted in ranking
 * 
 * For water spots, applies fetch/venturi physics to adjust NWS wind speeds
 * to realistic on-water conditions (typically 20-30% higher than land forecasts).
 */
export function rankSpotsForActivity(spotForecasts, activity) {
  const sportKey = ACTIVITY_TO_SPORT_KEY[activity] || 'foil-kite';
  const results = [];

  for (const spot of spotForecasts) {
    if (!spot.hourlyForecast) continue;

    // Apply on-water physics for water-based activities
    const isWaterActivity = ['kiting', 'windsurfing', 'sailing', 'boating', 'paddling'].includes(activity);
    const adjustedForecast = isWaterActivity 
      ? applyOnWaterPhysics(spot.hourlyForecast, spot)
      : spot.hourlyForecast;

    const locationInfo = {
      idealAxis: spot.config?.thermal?.optimalDirection?.min,
      hasSnowpack: !!spot.config?.snowkite,
    };

    const windows = findAllSportWindows(spot.id, adjustedForecast, locationInfo);
    const window = windows[sportKey];

    if (window) {
      const isPriority = PRIORITY_SPOTS.has(spot.id);
      
      // Calculate average physics boost for this window
      const physicsHours = adjustedForecast.filter(h => 
        window.hours?.some(wh => wh.startTime === h.startTime || wh.time === h.time)
      );
      const avgFetchBoost = physicsHours.length > 0
        ? Math.round(physicsHours.reduce((sum, h) => sum + (h.fetchBoost || 0), 0) / physicsHours.length)
        : 0;
      
      results.push({
        spotId: spot.id,
        spotName: spot.name,
        region: spot.region,
        window,
        score: window.avgScore,
        peakSpeed: parseFloat(window.peakCondition) || 0,
        durationHours: window.durationHours,
        startTime: window.windowStart,
        endTime: window.windowEnd,
        startLabel: window.windowStartLabel,
        endLabel: window.windowEndLabel,
        peakLabel: window.peakTimeLabel,
        reason: window.reason,
        hours: window.hours,
        isPriority,
        // Physics metadata
        hasPhysicsBoost: avgFetchBoost > 0,
        fetchBoostPct: avgFetchBoost,
      });
    }
  }

  // Sort: Priority spots first (if they have good scores), then by score
  results.sort((a, b) => {
    // Both priority or both non-priority: sort by score
    if (a.isPriority === b.isPriority) {
      if (b.score !== a.score) return b.score - a.score;
      return b.durationHours - a.durationHours;
    }
    
    // Priority spot with decent score (>= 50) goes first
    if (a.isPriority && a.score >= 50) return -1;
    if (b.isPriority && b.score >= 50) return 1;
    
    // Otherwise sort by score
    if (b.score !== a.score) return b.score - a.score;
    return b.durationHours - a.durationHours;
  });

  return results;
}

/**
 * Split ranked spots into Today vs Tomorrow
 */
export function splitByDay(rankedSpots) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  const today = [];
  const tomorrow = [];

  for (const spot of rankedSpots) {
    const startTime = new Date(spot.startTime);
    
    if (startTime >= todayStart && startTime < tomorrowStart) {
      today.push(spot);
    } else if (startTime >= tomorrowStart && startTime < dayAfterStart) {
      tomorrow.push(spot);
    }
  }

  return { today, tomorrow };
}

// ─── Week Event Detection ────────────────────────────────────────

/**
 * Scan 7-day forecast for notable weather events
 */
export async function scanWeekEvents(locationId = 'utah-lake') {
  const forecast = await get7DayForecast(locationId);
  if (!forecast || forecast.length === 0) return [];

  const events = [];
  const now = new Date();

  for (let i = 0; i < forecast.length; i++) {
    const period = forecast[i];
    if (!period.isDaytime) continue;

    const date = new Date(period.startTime);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const daysFromNow = Math.floor((date - now) / (1000 * 60 * 60 * 24));

    const windAnalysis = period.windAnalysis || {};
    const windSpeed = windAnalysis.windSpeed || 0;
    const windDir = windAnalysis.windDirection || '';
    const shortForecast = (period.shortForecast || '').toLowerCase();
    const detailedForecast = (period.detailedForecast || '').toLowerCase();

    // Skip today (we show that separately)
    if (daysFromNow < 1) continue;

    // Detect front passages (N/NW wind + speed spike + cold)
    if (['N', 'NNW', 'NW', 'NNE'].includes(windDir) && windSpeed >= 15) {
      events.push({
        type: 'front',
        day: dayName,
        date: dateStr,
        daysFromNow,
        headline: 'Cold front — strong N flow',
        detail: `${windSpeed} mph ${windDir} winds expected`,
        icon: '🌬️',
        confidence: windAnalysis.confidence || 0.7,
        goodFor: ['kiting', 'windsurfing', 'sailing'],
        badFor: ['boating', 'paddling', 'fishing'],
      });
      continue;
    }

    // Detect epic thermal days (sunny + warm + light morning)
    if (
      (shortForecast.includes('sunny') || shortForecast.includes('clear')) &&
      period.temperature >= 75 &&
      windSpeed <= 8
    ) {
      const prevPeriod = i > 0 ? forecast[i - 1] : null;
      const morningCalm = !prevPeriod || (prevPeriod.windAnalysis?.windSpeed || 0) <= 5;

      if (morningCalm) {
        events.push({
          type: 'epic_thermal',
          day: dayName,
          date: dateStr,
          daysFromNow,
          headline: 'Epic thermal day predicted',
          detail: `${period.temperature}°F, sunny — classic afternoon thermal setup`,
          icon: '☀️',
          confidence: 0.75,
          goodFor: ['kiting', 'windsurfing', 'sailing', 'paragliding'],
          badFor: [],
        });
        continue;
      }
    }

    // Detect extended calm (great for water sports)
    if (windSpeed <= 5 && !shortForecast.includes('rain') && !shortForecast.includes('storm')) {
      events.push({
        type: 'calm',
        day: dayName,
        date: dateStr,
        daysFromNow,
        headline: 'Glass conditions expected',
        detail: `Light winds (${windSpeed} mph) — perfect for flat water`,
        icon: '🪞',
        confidence: 0.65,
        goodFor: ['boating', 'paddling', 'fishing'],
        badFor: ['kiting', 'windsurfing'],
      });
      continue;
    }

    // Detect storm systems
    if (
      shortForecast.includes('storm') ||
      shortForecast.includes('thunder') ||
      detailedForecast.includes('lightning')
    ) {
      events.push({
        type: 'storm',
        day: dayName,
        date: dateStr,
        daysFromNow,
        headline: 'Storm system',
        detail: period.shortForecast,
        icon: '⛈️',
        confidence: 0.85,
        goodFor: [],
        badFor: ['kiting', 'windsurfing', 'sailing', 'paragliding', 'boating', 'paddling'],
      });
      continue;
    }

    // Detect good wind days (moderate sustained wind)
    if (windSpeed >= 12 && windSpeed <= 22) {
      events.push({
        type: 'good_wind',
        day: dayName,
        date: dateStr,
        daysFromNow,
        headline: 'Good wind day',
        detail: `${windSpeed} mph ${windDir} — solid conditions`,
        icon: '💨',
        confidence: 0.7,
        goodFor: ['kiting', 'windsurfing', 'sailing'],
        badFor: [],
      });
    }
  }

  // Dedupe and limit to most significant events
  const seen = new Set();
  const uniqueEvents = events.filter(e => {
    const key = `${e.day}-${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by days from now, then by confidence
  uniqueEvents.sort((a, b) => {
    if (a.daysFromNow !== b.daysFromNow) return a.daysFromNow - b.daysFromNow;
    return b.confidence - a.confidence;
  });

  return uniqueEvents.slice(0, 5);
}

// ─── Main Aggregator ─────────────────────────────────────────────

/**
 * Get complete forecast intelligence for an activity
 * 
 * Uses server context for ML-corrected forecasts and learned weights when available.
 * 
 * @param {string} activity - Activity type (kiting, paragliding, etc.)
 * @returns {Promise<Object>} Forecast intelligence with today, tomorrow, and week events
 */
export async function getForecastIntelligence(activity) {
  // Fetch server context (ML-corrected NWS + learned weights)
  const context = await fetchServerContext();
  
  const spots = getActivitySpots(activity);
  const spotForecasts = await fetchAllSpotForecasts(spots, context);
  let ranked = rankSpotsForActivity(spotForecasts, activity);
  
  // Apply learned weights to adjust scores
  if (context?.learnedWeights) {
    ranked = applyLearnedWeights(ranked, context);
    // Re-sort after adjustments
    ranked.sort((a, b) => {
      if (a.isPriority === b.isPriority) {
        if (b.score !== a.score) return b.score - a.score;
        return b.durationHours - a.durationHours;
      }
      if (a.isPriority && a.score >= 50) return -1;
      if (b.isPriority && b.score >= 50) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.durationHours - a.durationHours;
    });
  }
  
  const { today, tomorrow } = splitByDay(ranked);
  const weekEvents = await scanWeekEvents();

  // Filter week events to show those relevant to this activity
  const sportKey = ACTIVITY_TO_SPORT_KEY[activity] || 'foil-kite';
  const profile = SPORT_PROFILES[sportKey];
  const wantsWind = profile?.wantsWind ?? true;

  const relevantEvents = weekEvents.filter(e => {
    if (e.goodFor.includes(activity)) return true;
    if (e.badFor.includes(activity)) return true;
    if (wantsWind && ['front', 'epic_thermal', 'good_wind'].includes(e.type)) return true;
    if (!wantsWind && ['calm'].includes(e.type)) return true;
    return false;
  });

  // Count how many spots used ML-corrected data
  const mlCorrectedCount = spotForecasts.filter(s => s.mlCorrected).length;

  return {
    activity,
    timestamp: new Date().toISOString(),
    today: today.slice(0, 5),
    tomorrow: tomorrow.slice(0, 3),
    weekEvents: relevantEvents,
    totalSpotsAnalyzed: spots.length,
    hasWindows: today.length > 0 || tomorrow.length > 0,
    // Learning metadata
    mlCorrected: mlCorrectedCount > 0,
    mlCorrectedCount,
    hasLearnedWeights: !!context?.learnedWeights,
    contextAge: context?.updatedAt ? new Date(context.updatedAt).toISOString() : null,
  };
}

export default {
  getActivitySpots,
  fetchAllSpotForecasts,
  rankSpotsForActivity,
  splitByDay,
  scanWeekEvents,
  getForecastIntelligence,
};
