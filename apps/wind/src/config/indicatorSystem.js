/**
 * INDICATOR SYSTEM
 * 
 * This module defines the reusable framework for wind prediction indicators.
 * Each indicator follows the same structure and validation methodology.
 * 
 * HOW IT WORKS:
 * 1. Upstream weather stations show wind patterns BEFORE they reach your kiting spot
 * 2. We analyze historical data to find the correlation
 * 3. We VALIDATE that correlation predicts kiteable conditions (not just any wind)
 * 4. We set thresholds based on actionable probabilities
 * 
 * TO ADD A NEW INDICATOR:
 * 1. Find candidate stations upstream of your target
 * 2. Run correlation analysis (see scripts/analyze-*.js)
 * 3. Validate with speed bucket analysis
 * 4. Add configuration below following the template
 */

import { safeToFixed } from '../utils/safeToFixed';

// =============================================================================
// WIND TYPES - The mechanisms that create wind
// =============================================================================

export const WIND_TYPES = {
  THERMAL: {
    id: 'thermal',
    name: 'Thermal Wind',
    description: 'Sun heats land faster than water, creating onshore flow',
    mechanism: 'Temperature differential between land and water',
    typicalTiming: '10am - 5pm',
    seasonality: 'Spring through Fall',
    indicators: ['temperature_delta', 'canyon_heating', 'ridge_wind'],
  },
  
  NORTH_FLOW: {
    id: 'north_flow',
    name: 'Prefrontal/North Flow',
    description: 'High pressure to the north pushes air south',
    mechanism: 'Pressure gradient between SLC and Provo',
    typicalTiming: 'Any time, often afternoon/evening',
    seasonality: 'Year-round, strongest in spring/fall',
    indicators: ['pressure_gradient', 'airport_wind', 'gap_wind'],
  },
  
  GAP_WIND: {
    id: 'gap_wind',
    name: 'Gap/Canyon Wind',
    description: 'Wind funneled through terrain gaps',
    mechanism: 'Venturi effect through mountain passes',
    typicalTiming: 'Varies by location',
    seasonality: 'Year-round',
    indicators: ['gap_entrance_wind', 'pressure_differential'],
  },
  
  CANYON_THERMAL: {
    id: 'canyon_thermal',
    name: 'Canyon Thermal',
    description: 'Upslope flow as canyon walls heat',
    mechanism: 'Canyon heating creates upward air movement',
    typicalTiming: '11am - 4pm',
    seasonality: 'Spring through Fall',
    indicators: ['ridge_temperature', 'canyon_entrance_wind'],
  },
};

// =============================================================================
// INDICATOR TEMPLATE - Structure for all indicators
// =============================================================================

/**
 * Template for creating a new indicator configuration
 * 
 * @typedef {Object} IndicatorConfig
 * @property {string} id - Unique identifier
 * @property {string} stationId - MesoWest station ID
 * @property {string} name - Human-readable name
 * @property {Object} coordinates - { lat, lng }
 * @property {number} elevation - Station elevation in feet
 * @property {string} windType - One of WIND_TYPES keys
 * @property {string} role - Description of what this indicator shows
 * @property {string[]} bestFor - Array of launch IDs this indicator is best for
 * @property {number} leadTimeHours - How far in advance this predicts
 * @property {Object} trigger - Conditions that activate this indicator
 * @property {Object} speedCorrelation - Validated correlation data
 * @property {Object} ui - UI display configuration
 */

const INDICATOR_TEMPLATE = {
  id: 'template',
  stationId: 'XXXX',
  name: 'Station Name',
  coordinates: { lat: 0, lng: 0 },
  elevation: 0,
  
  windType: 'THERMAL', // Key from WIND_TYPES
  role: 'Description of what this indicator tells us',
  bestFor: ['launch-id-1', 'launch-id-2'],
  
  leadTimeHours: 1,
  
  trigger: {
    direction: {
      min: 0,      // Minimum degrees (0 = N)
      max: 360,    // Maximum degrees
      label: 'N',  // Human-readable direction
    },
    speed: {
      min: 5,      // Minimum to consider
      threshold: 10, // Strong signal threshold
    },
  },
  
  // VALIDATED correlation from historical analysis
  // This is the KEY - not just correlation, but kiteable prediction
  speedCorrelation: {
    '5-8': { 
      avgTargetSpeed: 0, 
      foilKiteablePct: 0, 
      twinTipKiteablePct: 0,
      sampleSize: 0,
    },
    '8-10': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
    '10-15': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
    '15+': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
  },
  
  ui: {
    color: 'blue',      // Primary color for UI elements
    icon: '🌬️',         // Emoji for quick identification
    priority: 1,        // Display order (lower = higher priority)
  },
};

// =============================================================================
// UTAH LAKE INDICATORS - Validated configurations
// =============================================================================

export const UTAH_LAKE_INDICATORS = {
  // ----- THERMAL INDICATORS -----
  
  SPANISH_FORK: {
    id: 'spanish-fork',
    stationId: 'QSF',
    name: 'Spanish Fork Canyon',
    coordinates: { lat: 40.05, lng: -111.65 },
    elevation: 4600,
    
    windType: 'THERMAL',
    role: 'Early indicator for SE thermal - shows canyon heating 2 hours before lake thermal',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 2,
    
    trigger: {
      direction: { min: 90, max: 180, label: 'SE (E to S)' },
      speed: { min: 6, threshold: 10 },
    },
    
    // Validated from 3-year historical analysis
    speedCorrelation: {
      '6-8': { avgTargetSpeed: 8.5, foilKiteablePct: 35, twinTipKiteablePct: 10, sampleSize: 45 },
      '8-10': { avgTargetSpeed: 11.2, foilKiteablePct: 52, twinTipKiteablePct: 25, sampleSize: 38 },
      '10-15': { avgTargetSpeed: 14.8, foilKiteablePct: 75, twinTipKiteablePct: 45, sampleSize: 28 },
      '15+': { avgTargetSpeed: 19.5, foilKiteablePct: 90, twinTipKiteablePct: 70, sampleSize: 12 },
    },
    
    ui: {
      color: 'green',
      icon: '⏰',
      priority: 2,
    },
  },
  
  // ----- NORTH FLOW INDICATORS -----
  
  SALT_LAKE_CITY: {
    id: 'salt-lake-city',
    stationId: 'KSLC',
    name: 'Salt Lake City Airport',
    coordinates: { lat: 40.7884, lng: -111.9778 },
    elevation: 4226,
    
    windType: 'NORTH_FLOW',
    role: 'Primary north flow indicator - shows pressure-driven north wind from Great Salt Lake',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 10 },  // Validated: 5mph only 45% kiteable
    },
    
    // Validated correlation from historical analysis
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 9.3, foilKiteablePct: 45, twinTipKiteablePct: 14, sampleSize: 156 },
      '8-10': { avgTargetSpeed: 12.6, foilKiteablePct: 56, twinTipKiteablePct: 31, sampleSize: 89 },
      '10-15': { avgTargetSpeed: 15.5, foilKiteablePct: 81, twinTipKiteablePct: 50, sampleSize: 52 },
      '15+': { avgTargetSpeed: 23.4, foilKiteablePct: 100, twinTipKiteablePct: 100, sampleSize: 18 },
    },
    
    ui: {
      color: 'blue',
      icon: '🌬️',
      priority: 1,
    },
  },
  
  PROVO_AIRPORT: {
    id: 'provo-airport',
    stationId: 'KPVU',
    name: 'Provo Airport',
    coordinates: { lat: 40.2192, lng: -111.7236 },
    elevation: 4497,
    
    windType: 'NORTH_FLOW',
    role: 'Best indicator for SOUTHERN Utah Lake launches - closer to Lincoln/Sandy Beach',
    bestFor: ['utah-lake-lincoln', 'utah-lake-sandy'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 10 },
    },
    
    // Validated: KPVU is BETTER than KSLC for southern launches
    // 78% foil kiteable vs 56% for KSLC at 8-10mph
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 10.1, foilKiteablePct: 52, twinTipKiteablePct: 18, sampleSize: 134 },
      '8-10': { avgTargetSpeed: 14.2, foilKiteablePct: 78, twinTipKiteablePct: 42, sampleSize: 76 },
      '10-15': { avgTargetSpeed: 17.8, foilKiteablePct: 89, twinTipKiteablePct: 62, sampleSize: 41 },
      '15+': { avgTargetSpeed: 24.1, foilKiteablePct: 100, twinTipKiteablePct: 95, sampleSize: 15 },
    },
    
    ui: {
      color: 'purple',
      icon: '🌬️',
      priority: 1,
    },
  },
  
  POINT_OF_MOUNTAIN: {
    id: 'point-of-mountain',
    stationId: 'UTALP',
    name: 'Point of the Mountain',
    coordinates: { lat: 40.4505, lng: -111.8972 },
    elevation: 4980,
    
    windType: 'GAP_WIND',
    role: 'Gap wind indicator - confirms north flow is funneling through the gap',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 0.5, // Very close, almost real-time
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 12 },
    },
    
    // Gap wind often amplifies - shows funneling effect
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 8.8, foilKiteablePct: 42, twinTipKiteablePct: 12, sampleSize: 145 },
      '8-10': { avgTargetSpeed: 11.9, foilKiteablePct: 58, twinTipKiteablePct: 28, sampleSize: 82 },
      '10-15': { avgTargetSpeed: 15.2, foilKiteablePct: 78, twinTipKiteablePct: 48, sampleSize: 48 },
      '15+': { avgTargetSpeed: 21.5, foilKiteablePct: 95, twinTipKiteablePct: 85, sampleSize: 22 },
    },
    
    ui: {
      color: 'teal',
      icon: '🌀',
      priority: 3,
    },
  },
};

// =============================================================================
// DEER CREEK INDICATORS
// =============================================================================

export const DEER_CREEK_INDICATORS = {
  ARROWHEAD: {
    id: 'arrowhead',
    stationId: 'UTLPC',
    name: 'Lower Provo Canyon (replaced dead SND)',
    coordinates: { lat: 40.380, lng: -111.580 },
    elevation: 5100,
    
    windType: 'CANYON_THERMAL',
    role: 'High-elevation trigger for Provo Canyon thermal',
    bestFor: ['deer-creek-dam', 'deer-creek-charleston'],
    
    leadTimeHours: 1.5,
    
    trigger: {
      direction: { min: 200, max: 250, label: 'SSW to WSW' },
      speed: { min: 10, threshold: 15 },
    },
    
    speedCorrelation: {
      '10-12': { avgTargetSpeed: 6.5, foilKiteablePct: 4, twinTipKiteablePct: 0, sampleSize: 89 },
      '12-15': { avgTargetSpeed: 9.2, foilKiteablePct: 13, twinTipKiteablePct: 3, sampleSize: 67 },
      '15-18': { avgTargetSpeed: 12.8, foilKiteablePct: 25, twinTipKiteablePct: 10, sampleSize: 45 },
      '18+': { avgTargetSpeed: 16.5, foilKiteablePct: 30, twinTipKiteablePct: 15, sampleSize: 28 },
    },
    
    ui: {
      color: 'orange',
      icon: '🏔️',
      priority: 1,
    },
  },
  
  HEBER_AIRPORT: {
    id: 'heber-airport',
    stationId: 'KHCR',
    name: 'Heber Airport',
    coordinates: { lat: 40.4818, lng: -111.4285 },
    elevation: 5637,
    
    windType: 'CANYON_THERMAL',
    role: 'Valley-level confirmation of thermal development',
    bestFor: ['deer-creek-dam'],
    
    leadTimeHours: 0.5,
    
    trigger: {
      direction: { min: 180, max: 270, label: 'S to W' },
      speed: { min: 8, threshold: 12 },
    },
    
    speedCorrelation: {
      '8-10': { avgTargetSpeed: 8.5, foilKiteablePct: 15, twinTipKiteablePct: 2, sampleSize: 78 },
      '10-15': { avgTargetSpeed: 11.2, foilKiteablePct: 28, twinTipKiteablePct: 8, sampleSize: 52 },
      '15+': { avgTargetSpeed: 14.5, foilKiteablePct: 35, twinTipKiteablePct: 15, sampleSize: 31 },
    },
    
    ui: {
      color: 'yellow',
      icon: '✈️',
      priority: 2,
    },
  },
};

// =============================================================================
// WILLARD BAY INDICATORS
// =============================================================================

export const WILLARD_BAY_INDICATORS = {
  HILL_AFB: {
    id: 'hill-afb',
    stationId: 'KHIF',
    name: 'Hill Air Force Base',
    coordinates: { lat: 41.1239, lng: -111.9731 },
    elevation: 4789,
    
    windType: 'SOUTH_FLOW',
    role: 'South flow indicator for Willard Bay south beach',
    bestFor: ['willard-bay-south'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 150, max: 225, label: 'S (SE to SW)' },
      speed: { min: 8, threshold: 12 },
    },
    
    speedCorrelation: {
      '8-10': { avgTargetSpeed: 10.5, foilKiteablePct: 55, twinTipKiteablePct: 20, sampleSize: 65 },
      '10-15': { avgTargetSpeed: 14.2, foilKiteablePct: 72, twinTipKiteablePct: 45, sampleSize: 48 },
      '15+': { avgTargetSpeed: 19.8, foilKiteablePct: 90, twinTipKiteablePct: 75, sampleSize: 25 },
    },
    
    ui: {
      color: 'blue',
      icon: '🌬️',
      priority: 1,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all indicators for a specific launch location
 * @param {string} launchId - The launch ID (e.g., 'utah-lake-zigzag')
 * @returns {Object[]} Array of indicator configurations
 */
export function getIndicatorsForLaunch(launchId) {
  const allIndicators = [
    ...Object.values(UTAH_LAKE_INDICATORS),
    ...Object.values(DEER_CREEK_INDICATORS),
    ...Object.values(WILLARD_BAY_INDICATORS),
  ];
  
  return allIndicators
    .filter(ind => ind.bestFor.includes(launchId))
    .sort((a, b) => a.ui.priority - b.ui.priority);
}

/**
 * Get the best indicator for a specific launch and wind type
 * @param {string} launchId - The launch ID
 * @param {string} windType - The wind type (e.g., 'NORTH_FLOW')
 * @returns {Object|null} The best indicator configuration or null
 */
export function getBestIndicator(launchId, windType) {
  const indicators = getIndicatorsForLaunch(launchId);
  return indicators.find(ind => ind.windType === windType) || null;
}

/**
 * Evaluate an indicator based on current wind conditions
 * @param {Object} indicator - Indicator configuration
 * @param {Object} windData - Current wind data { speed, direction }
 * @returns {Object} Evaluation result with status, message, and predictions
 */
export function evaluateIndicator(indicator, windData) {
  if (!windData || windData.speed === null || windData.direction === null) {
    return {
      status: 'no-data',
      message: 'No data available',
      prediction: null,
    };
  }
  
  const { speed, direction } = windData;
  const { trigger, speedCorrelation, leadTimeHours, name } = indicator;
  
  // Check if direction is within trigger range
  let directionMatch = false;
  if (trigger.direction.min <= trigger.direction.max) {
    directionMatch = direction >= trigger.direction.min && direction <= trigger.direction.max;
  } else {
    // Handle wrap-around (e.g., 315 to 45 for north)
    directionMatch = direction >= trigger.direction.min || direction <= trigger.direction.max;
  }
  
  if (!directionMatch) {
    return {
      status: 'wrong-direction',
      message: `${name} showing ${Math.round(direction)}° - not ${trigger.direction.label}`,
      prediction: null,
    };
  }
  
  if (speed < trigger.speed.min) {
    return {
      status: 'too-weak',
      message: `${name} showing ${safeToFixed(speed, 1)} mph - below ${trigger.speed.min} mph threshold`,
      prediction: null,
    };
  }
  
  // Find the matching speed bucket
  let bucket = null;
  const buckets = Object.keys(speedCorrelation).sort((a, b) => {
    const aMin = parseInt(a.split('-')[0]);
    const bMin = parseInt(b.split('-')[0]);
    return aMin - bMin;
  });
  
  for (const key of buckets) {
    const [min, max] = key.split('-').map(v => v === '+' ? Infinity : parseInt(v.replace('+', '')));
    if (key.includes('+')) {
      if (speed >= parseInt(key.replace('+', ''))) {
        bucket = key;
        break;
      }
    } else if (speed >= min && speed < (max || Infinity)) {
      bucket = key;
      break;
    }
  }
  
  // Use highest bucket if speed exceeds all
  if (!bucket) {
    bucket = buckets[buckets.length - 1];
  }
  
  const correlation = speedCorrelation[bucket];
  
  // Determine status based on kiteable probability
  let status;
  if (correlation.foilKiteablePct >= 80) {
    status = 'strong';
  } else if (correlation.foilKiteablePct >= 50) {
    status = 'good';
  } else if (correlation.foilKiteablePct >= 30) {
    status = 'possible';
  } else {
    status = 'marginal';
  }
  
  return {
    status,
    message: `${name}: ${safeToFixed(speed, 1)} mph from ${trigger.direction.label}`,
    prediction: {
      expectedSpeed: correlation.avgTargetSpeed,
      foilKiteablePct: correlation.foilKiteablePct,
      twinTipKiteablePct: correlation.twinTipKiteablePct,
      leadTimeHours,
      confidence: correlation.sampleSize > 50 ? 'high' : correlation.sampleSize > 20 ? 'medium' : 'low',
    },
  };
}

/**
 * Get all station IDs needed for a set of indicators
 * @param {Object[]} indicators - Array of indicator configurations
 * @returns {string[]} Array of station IDs
 */
export function getStationIds(indicators) {
  return [...new Set(indicators.map(ind => ind.stationId))];
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  WIND_TYPES,
  UTAH_LAKE_INDICATORS,
  DEER_CREEK_INDICATORS,
  WILLARD_BAY_INDICATORS,
  getIndicatorsForLaunch,
  getBestIndicator,
  evaluateIndicator,
  getStationIds,
};
