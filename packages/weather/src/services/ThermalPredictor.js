/**
 * THERMAL PREDICTOR SERVICE
 * 
 * THREE-STEP PREDICTION MODEL:
 * 
 * Step A: GRADIENT CHECK
 *   - Query ΔP (SLC - Provo pressure)
 *   - If ΔP > 2.0mb = North flow dominates, thermal busted
 *   - Historical data: 0% thermal success when gradient positive
 * 
 * Step B: ELEVATION DELTA  
 *   - Compare high station temp (Arrowhead/Cascade) vs lakeshore
 *   - Large inversion = air trapped, no thermal
 *   - Rapid morning warm-up at shore = "Thermal Pump" starting
 * 
 * Step C: GROUND TRUTH
 *   - Use PWS to verify exact minute thermal hits boundary
 *   - Look back 2 hours at MesoWest for "Indicator Pattern"
 * 
 * Data-driven from 1 year of MesoWest historical data:
 * - Flight Park South (FPS): 105,100 data points (Mar 2025 - Mar 2026)
 * - KSLC/KPVU pressure data: 363 days analyzed
 * 
 * KEY FINDINGS FROM DATA ANALYSIS:
 * 
 * 1. SE THERMAL TIMING (100-180°, 8+ mph):
 *    - Starts building: 5-6 AM (44 days had usable conditions)
 *    - Peak window: 10-11 AM (78-82 days - HIGHEST)
 *    - Still active: 12-1 PM (73-74 days)
 *    - Fading: 2-3 PM (45-66 days)
 *    - Rare after: 4 PM (36-40 days)
 * 
 * 2. MONTHLY SUCCESS RATES:
 *    - Best: Feb (46%), Jul (42%), Oct (42%), Nov (43%)
 *    - Worst: Apr (17%), May (16%)
 *    - Average: 24% of days have good SE thermals
 * 
 * 3. PRESSURE GRADIENT:
 *    - When SLC > PVU (positive gradient): 0% thermal success
 *    - Negative gradient required for thermals
 * 
 * 4. PEAK CHARACTERISTICS:
 *    - Average peak speed: 10.3 mph
 *    - Average peak hour: 10-11 AM
 *    - Average direction: 150° (SSE)
 * 
 * LEARNING SYSTEM INTEGRATION:
 * - Model weights can be adjusted by the learning system
 * - Learned weights override defaults when available
 * - Speed bias correction applied from learning
 */

import { safeToFixed } from '../utils/safeToFixed';

// Learned weights cache (loaded from LearningSystem)
let learnedWeights = null;

// Statistical models from server (historical thermal profiles, lag correlations)
let statisticalModels = null;
export function setStatisticalModels(models) {
  statisticalModels = models;
}

/**
 * Set learned weights from the learning system
 * Called by LearningSystem when new weights are available
 */
export function setLearnedWeights(weights) {
  learnedWeights = weights;
  console.log('ThermalPredictor: Updated with learned weights v' + weights?.version);
}

/**
 * Get current weights (learned or default)
 */
function getWeights() {
  if (learnedWeights && learnedWeights.version !== 'default') {
    return {
      pressure: learnedWeights.pressureWeight || 0.40,
      thermal: learnedWeights.thermalWeight || 0.40,
      convergence: learnedWeights.convergenceWeight || 0.20,
      speedBiasCorrection: learnedWeights.speedBiasCorrection || 0,
      hourlyMultipliers: learnedWeights.hourlyMultipliers || {},
      indicators: learnedWeights.indicators || {},
      probabilityCalibration: learnedWeights.probabilityCalibration || {},
      monthlyQualityRates: learnedWeights.monthlyQualityRates || {},
      windTypeScores: learnedWeights.windTypeScores || {},
      consistencyProfile: learnedWeights.consistencyProfile || {},
      locationBias: learnedWeights.locationBias || {},
    };
  }
  
  return {
    pressure: 0.40,
    thermal: 0.40,
    convergence: 0.20,
    speedBiasCorrection: 0,
    hourlyMultipliers: {},
    indicators: {},
    probabilityCalibration: {},
    monthlyQualityRates: {},
    windTypeScores: {},
    consistencyProfile: {},
    locationBias: {},
  };
}

// Historical data from analysis - UTAH LAKE (FPS)
const HOURLY_THERMAL_PROBABILITY = {
  0: 0.05, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.05,
  5: 0.12,  // 44 days
  6: 0.11,  // 41 days
  7: 0.12,  // 42 days
  8: 0.16,  // 59 days
  9: 0.18,  // 65 days
  10: 0.21, // 78 days - PEAK
  11: 0.22, // 82 days - PEAK
  12: 0.20, // 74 days
  13: 0.20, // 73 days
  14: 0.18, // 66 days
  15: 0.12, // 45 days
  16: 0.11, // 40 days
  17: 0.10, // 36 days
  18: 0.08, // 29 days
  19: 0.05, 20: 0.05, 21: 0.05, 22: 0.05, 23: 0.05
};

const MONTHLY_SUCCESS_RATE = {
  1: 0.23,  // Jan - 23%
  2: 0.46,  // Feb - 46% BEST
  3: 0.28,  // Mar - 28%
  4: 0.17,  // Apr - 17% WORST
  5: 0.16,  // May - 16% WORST
  6: 0.27,  // Jun - 27%
  7: 0.42,  // Jul - 42% BEST
  8: 0.32,  // Aug - 32%
  9: 0.30,  // Sep - 30%
  10: 0.42, // Oct - 42% BEST
  11: 0.43, // Nov - 43% BEST
  12: 0.35  // Dec - 35%
};

const MONTHLY_PEAK_HOUR = {
  1: 10.9, 2: 9.2, 3: 10.2, 4: 12.4, 5: 11.4, 6: 11.6,
  7: 10.6, 8: 9.8, 9: 10.7, 10: 11.8, 11: 9.4, 12: 10.2
};

const MONTHLY_PEAK_SPEED = {
  1: 10.6, 2: 10.4, 3: 12.3, 4: 10.3, 5: 11.4, 6: 9.6,
  7: 9.5, 8: 10.2, 9: 9.4, 10: 10.7, 11: 10.0, 12: 12.4
};

// DEER CREEK hourly thermal probability (Barbed Wire Beach Tempest — July 2025)
// 42,610 observations at actual kite beach. Direction range 170-260° captures
// the full thermal fan: canyon funnels S wind but it spreads SSW-WSW at the beach.
// Wind rose peak: 230° (37%), 240° (22%), 220° (12%).
const DEER_CREEK_HOURLY_PROBABILITY = {
  0: 0.02,  1: 0.02,  2: 0.02,  3: 0.02,  4: 0.02,  5: 0.02,
  6: 0.02,    // overnight: non-thermal SW drainage, not a thermal signal
  7: 0.02,    // 2.0% baseline
  8: 0.013,   // 1.3%
  9: 0.087,   // 8.7% — stirring
  10: 0.134,  // 13.4% — building
  11: 0.399,  // 39.9% — ONSET (this is when riders say "it turned on")
  12: 0.579,  // 57.9% — strong
  13: 0.707,  // 70.7% — strong
  14: 0.768,  // 76.8% — PEAK
  15: 0.819,  // 81.9% — PEAK (best hour)
  16: 0.712,  // 71.2% — holding
  17: 0.679,  // 67.9% — fading
  18: 0.602,  // 60.2% — fading, direction shifting WSW
  19: 0.442,  // 44.2% — late session
  20: 0.115,  // 11.5% — dying
  21: 0.02, 22: 0.02, 23: 0.02
};

// Deer Creek temperature correlation
// When UTDCD is 8-12°F warmer than ridge stations, thermal is likely
const DEER_CREEK_TEMP_DELTA = {
  optimal: { min: 8, max: 15 },
  average: 9.6,
};

// DEER CREEK ARROWHEAD TRIGGER - from July 2025 correlation analysis
// When Arrowhead shows these conditions, thermal at Dam is likely
const DEER_CREEK_ARROWHEAD_TRIGGER = {
  // Wind speed at Provo Canyon during UTDCD thermals: avg 13.7 mph
  speed: {
    optimal: { min: 12, max: 18 },  // 24.8-29.9% thermal rate
    marginal: { min: 10, max: 12 }, // 13.1% thermal rate
    poor: { min: 0, max: 10 },      // <4% thermal rate
  },
  // Direction at Arrowhead: 210° SSW (87% of thermals)
  direction: {
    optimal: { min: 200, max: 230 }, // SSW
    acceptable: { min: 180, max: 250 }, // S to WSW
  },
  // Thermal probability by Arrowhead wind speed
  probabilityBySpeed: {
    '2-4': 0.0,
    '4-6': 0.8,
    '6-8': 3.1,
    '8-10': 4.0,
    '10-12': 13.1,
    '12-15': 24.8,
    '15+': 29.9,
  },
  // Lead time: Arrowhead signal precedes Dam thermal by 60-90 min
  leadTimeMinutes: 60,
};

// =====================================================
// SULPHUR CREEK — WAHSATCH TRIGGER
// =====================================================
// When Wahsatch EB (UT1) shows strong W wind, Sulphur Creek fires ~30 min later.
// KFIR (First Divide) is the closest station to the reservoir.
const SULFUR_CREEK_HOURLY_PROBABILITY = {
  0: 0.02, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.02,
  6: 0.03, 7: 0.04, 8: 0.05, 9: 0.08,
  10: 0.12,
  11: 0.16,
  12: 0.22,
  13: 0.25,
  14: 0.25,  // Peak — jet stream influence strongest afternoon
  15: 0.24,
  16: 0.22,
  17: 0.18,
  18: 0.12,
  19: 0.08,
  20: 0.05, 21: 0.03, 22: 0.02, 23: 0.02,
};

const SULFUR_CREEK_WAHSATCH_TRIGGER = {
  speed: {
    optimal: { min: 12, max: 30 },
    marginal: { min: 8, max: 12 },
    poor: { min: 0, max: 8 },
  },
  direction: {
    optimal: { min: 250, max: 290 },
    acceptable: { min: 220, max: 320 },
  },
  leadTimeMinutes: 30,
};

// =====================================================
// SPANISH FORK CANYON EARLY INDICATOR
// =====================================================
// From correlation analysis: QSF shows SE wind 1-2 hours before Utah Lake thermal
// Data: Summer 2025, 92 days analyzed, 67 good kite days
//
// KEY FINDING: When QSF shows SE wind (100-180°) at 6+ mph,
// expect thermal at Zig Zag/FPS approximately 2 hours later
export const SPANISH_FORK_INDICATOR = {
  station: 'QSF',
  stationName: 'Spanish Fork',
  coordinates: { lat: 40.115, lng: -111.655 },
  elevation: 4550,
  
  // Lead time before Utah Lake thermal
  leadTimeHours: 2,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 100,
      max: 180,
      label: 'SE (100-180°)',
    },
    speed: {
      min: 6,
      threshold: 7.5, // Average on good kite days
      label: '> 6 mph',
    },
  },
  
  // Statistics from analysis
  statistics: {
    goodKiteDays: 67,
    thermalDays: 12,
    bustDays: 13,
    totalDays: 92,
    seDirectionOnGoodDays: 97, // 97% SE direction on good kite days
    avgSpeedOnGoodDays: 7.6,
    avgSpeedOnBustDays: 4.9,
  },
  
  // Prediction accuracy
  accuracy: {
    threshold: 5.6, // Speed threshold for prediction
    accuracyPercent: 62.5,
  },
  
  // How to interpret
  interpretation: {
    strong: 'QSF showing SE > 8 mph = High confidence thermal coming in ~2 hours',
    moderate: 'QSF showing SE 6-8 mph = Moderate confidence thermal developing',
    weak: 'QSF showing SE < 6 mph or other direction = Low confidence',
  },
};

// =====================================================
// NORTH FLOW EARLY INDICATOR (Great Salt Lake origin)
// =====================================================
// From correlation analysis: KSLC shows N/NW wind 1 hour before Utah Lake north flow
// Data: Sep 2025 - Mar 2026, 192 days analyzed, 127 good north kite days
//
// VALIDATED CORRELATION (KSLC → FPS/Zig Zag, 1 hour later):
// - KSLC 5-8 mph N → FPS avg 9.3 mph (45% foil kiteable, 14% twin tip)
// - KSLC 8-10 mph N → FPS avg 12.6 mph (56% foil kiteable, 31% twin tip)
// - KSLC 10-15 mph N → FPS avg 15.5 mph (81% foil kiteable)
// - KSLC 15+ mph N → FPS avg 23.4 mph (100% kiteable)
export const NORTH_FLOW_INDICATOR = {
  station: 'KSLC',
  stationName: 'Salt Lake City Airport',
  coordinates: { lat: 40.7884, lng: -111.9778 },
  elevation: 4226,
  
  // Lead time before Utah Lake north flow
  leadTimeHours: 1,
  
  // Trigger conditions (validated thresholds)
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,        // Minimum for meaningful signal (56% foil kiteable)
      threshold: 10, // Strong signal (81% foil kiteable)
      foilMin: 8,    // 8+ mph at KSLC → ~13 mph at Zig Zag (foil kiteable)
      twinTipMin: 10, // 10+ mph at KSLC → ~15+ mph at Zig Zag (twin tip kiteable)
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (KSLC → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 9.3, foilKiteable: 45, twinTipKiteable: 14 },
    '8-10': { avgFps: 12.6, foilKiteable: 56, twinTipKiteable: 31 },
    '10-15': { avgFps: 15.5, foilKiteable: 81, twinTipKiteable: 50 },
    '15+': { avgFps: 23.4, foilKiteable: 100, twinTipKiteable: 100 },
  },
  
  // Statistics from analysis
  statistics: {
    goodNorthDays: 127,
    totalDays: 192,
    northDirectionAt1hr: 45, // 45% show north wind 1hr before
    combinedNorthNWNE: 74, // 74% show N/NW/NE combined
    avgSpeedOnGoodDays: 5.7,
  },
  
  // Pressure gradient correlation
  pressureGradient: {
    description: 'SLC - Provo pressure difference',
    positiveOnGoodDays: 15, // 15% of good north days have positive gradient
    positiveOnBadDays: 0, // 0% of bad days have positive gradient
    interpretation: 'Positive gradient (SLC > Provo) = North flow likely',
  },
  
  // How to interpret (updated with validated thresholds)
  interpretation: {
    strong: 'KSLC 10+ mph N/NW = High confidence (81% foil kiteable, ~15+ mph at Zig Zag)',
    moderate: 'KSLC 8-10 mph N/NW = Moderate (56% foil kiteable, ~13 mph at Zig Zag)',
    marginal: 'KSLC 5-8 mph N/NW = Marginal (45% foil kiteable, ~9 mph at Zig Zag)',
    weak: 'KSLC < 5 mph or other direction = Low confidence',
  },
};

// =====================================================
// PROVO AIRPORT INDICATOR (For Lincoln Beach & Sandy Beach)
// =====================================================
// KPVU is closer to southern Utah Lake launches and shows BETTER correlation
// than KSLC for predicting conditions at Lincoln Beach and Sandy Beach
//
// VALIDATED CORRELATION (KPVU → FPS, 1 hour later):
// - KPVU 5-8 mph N → FPS avg 11.2 mph (51% foil kiteable)
// - KPVU 8-10 mph N → FPS avg 13.5 mph (78% foil kiteable) ← BEST
// - KPVU 10-15 mph N → FPS avg 14.9 mph (89% foil kiteable)
// - KPVU 15+ mph N → FPS avg 22.7 mph (100% kiteable)
export const PROVO_AIRPORT_INDICATOR = {
  station: 'KPVU',
  stationName: 'Provo Airport',
  coordinates: { lat: 40.2192, lng: -111.7236 },
  elevation: 4495,
  
  // Best for southern launches
  bestFor: ['utah-lake-lincoln', 'utah-lake-sandy'],
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,
      threshold: 10,
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (KPVU → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 11.2, foilKiteable: 51, twinTipKiteable: 18 },
    '8-10': { avgFps: 13.5, foilKiteable: 78, twinTipKiteable: 33 },
    '10-15': { avgFps: 14.9, foilKiteable: 89, twinTipKiteable: 45 },
    '15+': { avgFps: 22.7, foilKiteable: 100, twinTipKiteable: 100 },
  },
  
  interpretation: {
    strong: 'KPVU 10+ mph N = High confidence (89% foil kiteable at Lincoln/Sandy)',
    moderate: 'KPVU 8-10 mph N = Good (78% foil kiteable at Lincoln/Sandy)',
    marginal: 'KPVU 5-8 mph N = Possible (51% foil kiteable)',
    weak: 'KPVU < 5 mph or other direction = Low confidence',
  },
};

// =====================================================
// POINT OF MOUNTAIN INDICATOR (Gap wind indicator)
// =====================================================
// UTALP shows wind funneling through the Point of Mountain gap
// Good indicator for north flow reaching Utah Lake
//
// VALIDATED CORRELATION (UTALP → FPS, 1 hour later):
// - UTALP 5-8 mph N → FPS avg 9.3 mph (43% foil kiteable)
// - UTALP 8-10 mph N → FPS avg 11.4 mph (58% foil kiteable)
// - UTALP 10-15 mph N → FPS avg 14.4 mph (86% foil kiteable)
// - UTALP 15+ mph N → FPS avg 22.0 mph (98% kiteable)
export const POINT_OF_MOUNTAIN_INDICATOR = {
  station: 'UTALP',
  stationName: 'Point of Mountain',
  coordinates: { lat: 40.4456, lng: -111.8983 },
  elevation: 4796,
  
  // Shows gap wind funneling
  role: 'Gap wind indicator - shows north flow funneling through Point of Mountain',
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,
      threshold: 10,
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (UTALP → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 9.3, foilKiteable: 43, twinTipKiteable: 10 },
    '8-10': { avgFps: 11.4, foilKiteable: 58, twinTipKiteable: 17 },
    '10-15': { avgFps: 14.4, foilKiteable: 86, twinTipKiteable: 40 },
    '15+': { avgFps: 22.0, foilKiteable: 98, twinTipKiteable: 96 },
  },
  
  interpretation: {
    strong: 'UTALP 10+ mph N = High confidence (86% foil kiteable)',
    moderate: 'UTALP 8-10 mph N = Moderate (58% foil kiteable)',
    marginal: 'UTALP 5-8 mph N = Marginal (43% foil kiteable)',
    weak: 'UTALP < 5 mph or other direction = Low confidence',
  },
};

export const THERMAL_PROFILES = {
  // =====================================================
  // UTAH LAKE - 5 LAUNCH LOCATIONS (South to North)
  // =====================================================
  
  'utah-lake-lincoln': {
    name: 'Lincoln Beach',
    location: 'South - Southernmost launch',
    
    direction: {
      optimal: { min: 135, max: 165, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Classic SE lake thermal - data shows 150° average',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: null,
  },

  'utah-lake-sandy': {
    name: 'Sandy Beach',
    location: 'South-Central',
    
    direction: {
      optimal: { min: 130, max: 160, ideal: 145 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'SE thermal - slightly more easterly than Lincoln',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 0,
      dataSource: 'Estimated from FPS data',
    },
    
    primaryStation: 'FPS',
    yourStation: null,
  },

  'utah-lake-vineyard': {
    name: 'Vineyard',
    location: 'Central',
    
    direction: {
      optimal: { min: 140, max: 180, ideal: 160 },
      acceptable: { min: 120, max: 200 },
      label: 'SE to S',
      description: 'SE to South thermal - wider acceptable range',
    },
    
    speed: {
      typical: { min: 6, max: 16 },
      average: 9,
      peak: 12,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 6, minute: 0, label: '6:00 AM' },
      usableStart: { hour: 9, minute: 0, label: '9:00 AM' },
      peakWindow: { start: 10, end: 14, label: '10:00 AM - 2:00 PM' },
      peakHour: 12,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 22,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  'utah-lake-zigzag': {
    name: 'Zig Zag',
    location: 'North-Central - Your home launch',
    
    direction: {
      optimal: { min: 135, max: 165, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Classic SE lake thermal - your PWS provides ground truth',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  'utah-lake-mm19': {
    name: 'Mile Marker 19',
    location: 'North - Northernmost launch',
    
    direction: {
      optimal: { min: 120, max: 160, ideal: 140 },
      acceptable: { min: 90, max: 180 },
      label: 'SE to E',
      description: 'SE to East thermal - more easterly component at north end',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 0,
      dataSource: 'Estimated from FPS data',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  // Legacy - overview of all Utah Lake
  'utah-lake': {
    name: 'Utah Lake (Overview)',
    location: 'All locations',
    
    direction: {
      optimal: { min: 130, max: 170, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Southeast thermal - data shows 150° average during good conditions',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },
  
  'deer-creek': {
    name: 'Deer Creek',
    
    // DATA-DRIVEN from Barbed Wire Beach Tempest (Jul 2025, 42,610 obs)
    // Wind rose at beach: 230° (37%), 240° (22%), 220° (12%) — SSW/WSW dominant
    direction: {
      optimal: { min: 210, max: 250, ideal: 230 },
      acceptable: { min: 170, max: 260 },
      label: 'SSW-WSW',
      description: 'Canyon thermal fans SSW-WSW at the beach (170-260°)',
    },
    
    speed: {
      typical: { min: 4, max: 15 },
      average: 8.0,
      peak: 14,
      unit: 'mph',
    },
    
    // Verified from Tempest minute-by-minute + rider experience:
    // Thermal onset ~11am, usable by 11:30, peak 2-3pm, fades by 7pm
    timing: {
      buildStart: { hour: 10, minute: 0, label: '10:00 AM' },
      usableStart: { hour: 11, minute: 0, label: '11:00 AM' },
      peakWindow: { start: 14, end: 16, label: '2:00 PM - 4:00 PM' },
      peakHour: 15, // 82% thermal rate at 3 PM
      fadeStart: { hour: 17, minute: 0, label: '5:00 PM' },
      fadeEnd: { hour: 20, minute: 0, label: '8:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 57.5,
      sampleSize: 519638,
      dataSource: 'Barbed Wire Beach Tempest Apr 2025 - Apr 2026 (519,638 obs, 170-260°)',
      peakHourRate: 81.9, // % at 3 PM in July
      avgTempDelta: 9.6,
    },
    
    arrowheadTrigger: {
      tempDelta: 9.6,
      triggerThreshold: 8,
      windSpeed: { min: 12, max: 18, optimal: 14 },
      windDirection: { min: 200, max: 250, optimal: 230 },
      leadTime: 60, // Arrowhead precedes beach onset by ~60 min
    },
    
    primaryStation: 'TEMPEST_DC',
    triggerStation: 'UTLPC',
    referenceStation: 'KHCR',
    yourStation: null,
    requirement: 'SSW-WSW wind (170-260°) — canyon thermal fans out at beach',
  },
  
  'sulfur-creek': {
    name: 'Sulphur Creek Reservoir',

    direction: {
      optimal: { min: 250, max: 290, ideal: 270 },
      acceptable: { min: 220, max: 320 },
      label: 'West',
      description: 'Due West required — jet stream alignment over the region',
    },

    speed: {
      typical: { min: 10, max: 25 },
      average: 15,
      peak: 20,
      unit: 'mph',
    },

    timing: {
      buildStart: { hour: 10, minute: 0, label: '10:00 AM' },
      usableStart: { hour: 12, minute: 0, label: '12:00 PM' },
      peakWindow: { start: 12, end: 18, label: '12:00 PM - 6:00 PM' },
      peakHour: 14,
      fadeStart: { hour: 18, minute: 0, label: '6:00 PM' },
      fadeEnd: { hour: 20, minute: 0, label: '8:00 PM' },
    },

    statistics: {
      goodDaysPercent: 18,
      sampleSize: 0,
      dataSource: 'Local knowledge — Utah Windsurfing Association',
      peakHourRate: 25,
      avgTempDelta: null,
    },

    wahsatchTrigger: {
      windSpeed: { min: 8, max: 30, optimal: 15 },
      windDirection: { min: 240, max: 300, optimal: 270 },
      leadTime: 30,
    },

    primaryStation: 'KFIR',
    triggerStation: 'UT1',
    referenceStation: 'KEVW',
    yourStation: null,
    requirement: 'Jet stream must be due west overhead — check 500mb charts. No thunderstorms.',
  },

  'willard-bay': {
    name: 'Willard Bay',
    
    direction: {
      optimal: { min: 170, max: 220, ideal: 195 },
      acceptable: { min: 150, max: 240 },
      label: 'S to SW',
      description: 'South to Southwest flow — south beach near state park',
    },
    
    speed: {
      typical: { min: 6, max: 15 },
      average: 8,
      peak: 12,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 9, minute: 0, label: '9:00 AM' },
      usableStart: { hour: 11, minute: 0, label: '11:00 AM' },
      peakWindow: { start: 12, end: 15, label: '12:00 PM - 3:00 PM' },
      peakHour: 13,
      fadeStart: { hour: 16, minute: 0, label: '4:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 22,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'KOGD',
    yourStation: null,
  },
  
  'pineview': {
    name: 'Pineview Reservoir',
    
    direction: {
      optimal: { min: 240, max: 300, ideal: 270 },
      acceptable: { min: 220, max: 320 },
      label: 'West',
      description: 'East/West canyon wind - depends on canyon orientation',
    },
    
    speed: {
      typical: { min: 5, max: 12 },
      average: 7,
      peak: 10,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 10, minute: 0, label: '10:00 AM' },
      usableStart: { hour: 12, minute: 0, label: '12:00 PM' },
      peakWindow: { start: 12, end: 16, label: '12:00 PM - 4:00 PM' },
      peakHour: 14,
      fadeStart: { hour: 17, minute: 0, label: '5:00 PM' },
      fadeEnd: { hour: 19, minute: 0, label: '7:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 18,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'COOPOGNU1',
    yourStation: null,
  },
};

/**
 * Calculate thermal probability using historical data
 */
export function predictThermal(lakeId, currentConditions) {
  const profile = THERMAL_PROFILES[lakeId];
  if (!profile) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMonth = now.getMonth() + 1;
  const hourDecimal = currentHour + currentMinute / 60;
  
  const { timing, direction, speed } = profile;
  
  // Base probability from historical hourly data
  let baseProbability;
  let expectedPeakHour;
  let expectedPeakSpeed;
  let monthlyMultiplier = 1.0;
  let monthlyRate = 0.24; // Default
  
  if (lakeId === 'sulfur-creek') {
    baseProbability = (SULFUR_CREEK_HOURLY_PROBABILITY[currentHour] || 0.02) * 100;
    expectedPeakHour = 14;
    expectedPeakSpeed = 15;
    // July is the prime month — jet stream dearth escape
    if (currentMonth === 7) {
      monthlyMultiplier = 1.4;
      monthlyRate = 0.30;
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      monthlyMultiplier = 1.2;
      monthlyRate = 0.25;
    } else if (currentMonth >= 5 && currentMonth <= 9) {
      monthlyMultiplier = 0.8;
      monthlyRate = 0.15;
    } else {
      monthlyMultiplier = 0.3;
      monthlyRate = 0.05;
    }
  } else if (lakeId === 'deer-creek') {
    baseProbability = (DEER_CREEK_HOURLY_PROBABILITY[currentHour] || 0.02) * 100;
    expectedPeakHour = 15; // 3 PM peak at the beach (Tempest July data: 82%)
    expectedPeakSpeed = 8.0;
    if (currentMonth >= 6 && currentMonth <= 8) {
      monthlyMultiplier = 1.3;
      monthlyRate = 0.75;
    } else if (currentMonth >= 5 && currentMonth <= 9) {
      monthlyMultiplier = 1.0;
      monthlyRate = 0.58;
    } else if (currentMonth >= 4 && currentMonth <= 10) {
      monthlyMultiplier = 0.6;
      monthlyRate = 0.35;
    } else {
      monthlyMultiplier = 0.25;
      monthlyRate = 0.10;
    }
  } else if (lakeId.startsWith('utah-lake')) {
    // Utah Lake locations use FPS data
    baseProbability = (HOURLY_THERMAL_PROBABILITY[currentHour] || 0.05) * 100;
    monthlyRate = MONTHLY_SUCCESS_RATE[currentMonth] || 0.24;
    monthlyMultiplier = monthlyRate / 0.24;
    expectedPeakHour = MONTHLY_PEAK_HOUR[currentMonth] || 11;
    expectedPeakSpeed = MONTHLY_PEAK_SPEED[currentMonth] || 10.3;
  } else {
    // Other lakes use their profile stats
    baseProbability = profile.statistics.goodDaysPercent || 15;
    expectedPeakHour = profile.timing?.peakHour || 13;
    expectedPeakSpeed = profile.speed?.average || 8;
    monthlyRate = (profile.statistics.goodDaysPercent || 15) / 100;
  }
  
  // Determine phase
  let phase = 'unknown';
  let phaseMessage = '';
  let timeToThermal = null;
  
  if (hourDecimal < timing.buildStart.hour) {
    phase = 'pre-thermal';
    timeToThermal = Math.round((timing.usableStart.hour - hourDecimal) * 60);
    phaseMessage = `Too early. Thermal typically starts building at ${timing.buildStart.label}`;
  } else if (hourDecimal < timing.usableStart.hour) {
    phase = 'building';
    timeToThermal = Math.round((timing.usableStart.hour - hourDecimal) * 60);
    phaseMessage = `Thermal building. Usable conditions expected by ${timing.usableStart.label}`;
  } else if (hourDecimal >= timing.peakWindow.start && hourDecimal <= timing.peakWindow.end) {
    phase = 'peak';
    phaseMessage = `PEAK WINDOW: ${timing.peakWindow.label}`;
  } else if (hourDecimal > timing.peakWindow.end && hourDecimal < timing.fadeEnd.hour) {
    phase = 'fading';
    phaseMessage = `Thermal fading. ${Math.round((timing.fadeEnd.hour - hourDecimal) * 60)} min remaining`;
  } else {
    phase = 'ended';
    const hoursUntilTomorrow = (24 - hourDecimal) + timing.buildStart.hour;
    timeToThermal = Math.round(hoursUntilTomorrow * 60);
    phaseMessage = `Thermal window closed. Next opportunity tomorrow at ${timing.buildStart.label}`;
  }
  
  // Direction analysis
  let directionScore = 0;
  let directionStatus = 'unknown';
  let directionMessage = '';
  
  if (currentConditions?.windDirection != null) {
    const dir = currentConditions.windDirection;
    
    if (dir >= direction.optimal.min && dir <= direction.optimal.max) {
      directionStatus = 'optimal';
      directionScore = 100;
      directionMessage = `${dir}° is OPTIMAL (${direction.label})`;
    } else if (dir >= direction.acceptable.min && dir <= direction.acceptable.max) {
      directionStatus = 'acceptable';
      directionScore = 60;
      directionMessage = `${dir}° is acceptable but not ideal`;
    } else {
      directionStatus = 'wrong';
      directionScore = 0;
      directionMessage = `${dir}° is WRONG - need ${direction.label} (${direction.optimal.min}-${direction.optimal.max}°)`;
    }
  }
  
  // Speed analysis
  let speedScore = 0;
  let speedStatus = 'unknown';
  let speedMessage = '';
  
  if (currentConditions?.windSpeed != null) {
    const spd = currentConditions.windSpeed;
    
    if (spd >= speed.typical.min && spd <= speed.typical.max) {
      speedStatus = 'good';
      speedScore = 100;
      speedMessage = `${safeToFixed(spd, 1)} mph is in thermal range`;
    } else if (spd >= speed.typical.min * 0.6 && spd < speed.typical.min) {
      speedStatus = 'building';
      speedScore = 50;
      speedMessage = `${safeToFixed(spd, 1)} mph - thermal may still be building`;
    } else if (spd < speed.typical.min * 0.6) {
      speedStatus = 'light';
      speedScore = 20;
      speedMessage = `${safeToFixed(spd, 1)} mph is too light`;
    } else {
      speedStatus = 'strong';
      speedScore = 40;
      speedMessage = `${safeToFixed(spd, 1)} mph is stronger than typical`;
    }
  }
  
  // STEP A: Pressure gradient analysis (GRADIENT CHECK)
  // For SE thermal locations: ΔP > 2.0mb = North flow dominates, thermal busted
  // For North flow locations (Pelican, Mosida): POSITIVE gradient is GOOD
  let pressureScore = 50; // Neutral if no data
  let pressureStatus = 'unknown';
  let pressureMessage = '';
  
  const requiresNorthFlow = profile.requiresNorthFlow === true;
  
  if (currentConditions?.pressureGradient != null) {
    const gradient = currentConditions.pressureGradient;
    
    if (requiresNorthFlow) {
      // NORTH FLOW LOCATIONS (Pelican Point, Mosida)
      // These WANT positive gradient (SLC > Provo = North flow)
      if (gradient > 2.0) {
        pressureScore = 90;
        pressureStatus = 'excellent';
        pressureMessage = `ΔP +${safeToFixed(gradient, 2)}mb = Strong North flow - IDEAL`;
      } else if (gradient > 0.5) {
        pressureScore = 70;
        pressureStatus = 'favorable';
        pressureMessage = `ΔP +${safeToFixed(gradient, 2)}mb = Good North flow`;
      } else if (gradient > -0.5) {
        pressureScore = 40;
        pressureStatus = 'marginal';
        pressureMessage = `ΔP ${safeToFixed(gradient, 2)}mb = Weak/variable flow`;
      } else {
        pressureScore = 10;
        pressureStatus = 'bust';
        pressureMessage = `ΔP ${safeToFixed(gradient, 2)}mb = South flow - wrong for this launch`;
      }
    } else {
      // SE THERMAL LOCATIONS (Saratoga, etc.)
      // These WANT negative gradient (Provo > SLC = South flow)
      if (gradient > 2.0) {
        pressureScore = 0;
        pressureStatus = 'bust';
        pressureMessage = `ΔP +${safeToFixed(gradient, 2)}mb > 2.0mb = North flow override`;
      } else if (gradient > 0) {
        pressureScore = 10;
        pressureStatus = 'marginal-bust';
        pressureMessage = `ΔP +${safeToFixed(gradient, 2)}mb positive = North flow likely`;
      } else if (gradient > -0.5) {
        pressureScore = 40;
        pressureStatus = 'marginal';
        pressureMessage = `ΔP ${safeToFixed(gradient, 2)}mb = Marginal conditions`;
      } else if (gradient > -1.5) {
        pressureScore = 70;
        pressureStatus = 'favorable';
        pressureMessage = `ΔP ${safeToFixed(gradient, 2)}mb = Good thermal gradient`;
      } else {
        pressureScore = 90;
        pressureStatus = 'excellent';
        pressureMessage = `ΔP ${safeToFixed(gradient, 2)}mb = Strong thermal gradient`;
      }
    }
  }
  
  // WAHSATCH TRIGGER ANALYSIS (Sulphur Creek specific)
  // When Wahsatch EB shows strong W wind, Sulphur Creek fires ~30 min later
  let wahsatchScore = 50;
  let wahsatchStatus = 'unknown';
  let wahsatchMessage = '';

  if (lakeId === 'sulfur-creek' && currentConditions?.wahsatchWind) {
    const wSpeed = currentConditions.wahsatchWind.speed;
    const wDir = currentConditions.wahsatchWind.direction;
    const trigger = SULFUR_CREEK_WAHSATCH_TRIGGER;

    let speedScore = 0;
    if (wSpeed != null) {
      if (wSpeed >= trigger.speed.optimal.min && wSpeed <= trigger.speed.optimal.max) {
        speedScore = 100;
      } else if (wSpeed >= trigger.speed.marginal.min && wSpeed < trigger.speed.optimal.min) {
        speedScore = 50;
      } else {
        speedScore = 10;
      }
    }

    let dirScore = 0;
    if (wDir != null) {
      if (wDir >= trigger.direction.optimal.min && wDir <= trigger.direction.optimal.max) {
        dirScore = 100;
      } else if (wDir >= trigger.direction.acceptable.min && wDir <= trigger.direction.acceptable.max) {
        dirScore = 60;
      } else {
        dirScore = 0;
      }
    }

    wahsatchScore = Math.round((speedScore * 0.5) + (dirScore * 0.5));

    if (wahsatchScore >= 80) {
      wahsatchStatus = 'trigger';
      wahsatchMessage = `TRIGGER: Wahsatch ${safeToFixed(wSpeed, 0)} mph from ${Math.round(wDir)}° W — Sulphur Creek likely firing in ~30 min`;
    } else if (wahsatchScore >= 50) {
      wahsatchStatus = 'building';
      wahsatchMessage = `Building: Wahsatch ${safeToFixed(wSpeed, 0)} mph — need 12+ mph from W (250-290°)`;
    } else {
      wahsatchStatus = 'no-trigger';
      wahsatchMessage = `No trigger: Wahsatch ${safeToFixed(wSpeed, 0)} mph — need sustained W flow`;
    }
  }

  // ARROWHEAD TRIGGER ANALYSIS (Deer Creek specific)
  // Data shows: When Arrowhead has 12-18 mph from SSW (210°), thermal at Dam is likely
  let arrowheadScore = 50;
  let arrowheadStatus = 'unknown';
  let arrowheadMessage = '';
  
  if (lakeId === 'deer-creek' && currentConditions?.ridgeWindSpeed != null) {
    const ridgeSpeed = currentConditions.ridgeWindSpeed;
    const ridgeDir = currentConditions.ridgeWindDirection;
    const trigger = DEER_CREEK_ARROWHEAD_TRIGGER;
    
    // Check wind speed trigger
    let speedScore = 0;
    if (ridgeSpeed >= trigger.speed.optimal.min && ridgeSpeed <= trigger.speed.optimal.max) {
      speedScore = 100; // 24-30% thermal probability
    } else if (ridgeSpeed >= trigger.speed.marginal.min && ridgeSpeed < trigger.speed.optimal.min) {
      speedScore = 50; // 13% thermal probability
    } else {
      speedScore = 10; // <4% thermal probability
    }
    
    // Check wind direction trigger
    let dirScore = 0;
    if (ridgeDir != null) {
      if (ridgeDir >= trigger.direction.optimal.min && ridgeDir <= trigger.direction.optimal.max) {
        dirScore = 100; // SSW is optimal (87% of thermals)
      } else if (ridgeDir >= trigger.direction.acceptable.min && ridgeDir <= trigger.direction.acceptable.max) {
        dirScore = 60; // S to WSW acceptable
      } else {
        dirScore = 0; // Wrong direction
      }
    }
    
    arrowheadScore = Math.round((speedScore * 0.6) + (dirScore * 0.4));
    
    if (arrowheadScore >= 80) {
      arrowheadStatus = 'trigger';
      arrowheadMessage = `TRIGGER: Arrowhead ${safeToFixed(ridgeSpeed, 1)} mph from ${ridgeDir}° - thermal likely in 60 min`;
    } else if (arrowheadScore >= 50) {
      arrowheadStatus = 'building';
      arrowheadMessage = `Building: Arrowhead ${safeToFixed(ridgeSpeed, 1)} mph (need 12-18 mph from SSW)`;
    } else {
      arrowheadStatus = 'no-trigger';
      arrowheadMessage = `No trigger: Arrowhead ${safeToFixed(ridgeSpeed, 1)} mph (need 12-18 mph from SSW)`;
    }
  }

  // STEP B: Elevation Delta analysis (THERMAL PUMP)
  // For Deer Creek: Historical data shows 9.6°F avg delta during thermals
  let elevationScore = 50;
  let elevationStatus = 'unknown';
  let elevationMessage = '';
  
  if (currentConditions?.thermalDelta != null) {
    const delta = currentConditions.thermalDelta;
    
    // Deer Creek: bell-curve scoring around the 8-12°F optimal zone.
    // Excessive deltas (>18°F) indicate high-altitude turbulence that
    // can shut down smooth surface thermals in the canyon.
    if (lakeId === 'deer-creek') {
      const { min: optMin, max: optMax } = DEER_CREEK_TEMP_DELTA.optimal;

      if (delta < 0) {
        elevationScore = 10;
        elevationStatus = 'inverted';
        elevationMessage = `Inverted: Arrowhead ${safeToFixed(Math.abs(delta), 1)}°F warmer - no thermal`;
      } else if (delta >= optMin && delta <= optMax) {
        elevationScore = 100;
        elevationStatus = 'optimal';
        elevationMessage = `Arrowhead correlation OPTIMAL: Δ${safeToFixed(delta, 1)}°F (ideal: ${optMin}-${optMax}°F)`;
      } else if (delta > optMax && delta <= 18) {
        // Bell curve decay above optimal: score drops from 100 to ~50 at 18°F
        const overshoot = delta - optMax;
        elevationScore = Math.round(100 - (overshoot / (18 - optMax)) * 50);
        elevationStatus = 'strong';
        elevationMessage = `High delta: Δ${safeToFixed(delta, 1)}°F — thermal strong but possible turbulence`;
      } else if (delta > 18) {
        // Excessive delta: likely turbulence shuts down smooth thermals
        elevationScore = Math.max(15, Math.round(50 - (delta - 18) * 5));
        elevationStatus = 'turbulent';
        elevationMessage = `Excessive Δ${safeToFixed(delta, 1)}°F — high-altitude turbulence likely disrupting surface flow`;
      } else if (delta >= 5) {
        elevationScore = 70;
        elevationStatus = 'building';
        elevationMessage = `Thermal building: Δ${safeToFixed(delta, 1)}°F (need ${optMin}-${optMax}°F)`;
      } else {
        elevationScore = 40;
        elevationStatus = 'weak';
        elevationMessage = `Weak delta: Only ${safeToFixed(delta, 1)}°F (need ${optMin}-${optMax}°F)`;
      }
    } else {
      // Standard logic for other lakes with same turbulence cap
      if (currentConditions.inversionTrapped) {
        elevationScore = 0;
        elevationStatus = 'inversion';
        elevationMessage = `Inversion: Ridge warmer than shore (Δ${safeToFixed(delta, 1)}°F)`;
      } else if (delta > 20) {
        elevationScore = 40;
        elevationStatus = 'turbulent';
        elevationMessage = `Excessive Δ${safeToFixed(delta, 1)}°F — possible turbulent mixing`;
      } else if (currentConditions.pumpActive) {
        elevationScore = 100;
        elevationStatus = 'pump-active';
        elevationMessage = `Thermal Pump ACTIVE: Shore ${safeToFixed(delta, 1)}°F warmer`;
      } else if (delta >= 5) {
        elevationScore = 70;
        elevationStatus = 'building';
        elevationMessage = `Thermal building: Shore ${safeToFixed(delta, 1)}°F warmer`;
      } else if (delta >= 0) {
        elevationScore = 40;
        elevationStatus = 'weak';
        elevationMessage = `Weak thermal: Shore only ${safeToFixed(delta, 1)}°F warmer`;
      } else {
        elevationScore = 10;
        elevationStatus = 'inverted';
        elevationMessage = `Cold shore: Ridge ${safeToFixed(Math.abs(delta), 1)}°F warmer`;
      }
    }
  }
  
  // ─── Apply learned weights ──────────────────────────────────────
  const weights = getWeights();

  const locBias = weights?.locationBias?.[lakeId];
  if (locBias && locBias.samples >= 3) {
    expectedPeakSpeed += locBias.speedBias || 0;
  }
  
  // Pressure/thermal/convergence weights from learning (default: 0.40, 0.40, 0.20)
  const pW = weights.pressure;
  const tW = weights.thermal;
  const cW = weights.convergence;
  
  // Hourly multiplier from learning (if the model learned this hour is over/under-predicted)
  const hourlyMult = weights.hourlyMultipliers?.[currentHour] ?? 1.0;
  
  // Monthly quality rate from backtest (e.g., July = 0.84, May = 0.52)
  // Blends with the existing monthlyMultiplier for seasonal accuracy
  const learnedMonthlyRate = weights.monthlyQualityRates?.[currentMonth];
  const seasonalAdj = learnedMonthlyRate != null ? (0.7 + learnedMonthlyRate * 0.6) : 1.0;
  
  // Calculate final probability using learned weighted 3-step model
  let probability = baseProbability * monthlyMultiplier * hourlyMult * seasonalAdj;

  // Blend with statistical model's hourly probability if available
  const modelProb = statisticalModels?.thermalProfiles?.[lakeId]?.hourlyProbability?.[currentHour];
  if (modelProb != null && modelProb > 0) {
    probability = Math.round(probability * 0.6 + modelProb * 0.4);
  }
  
  // STEP A: Gradient Check (learned pressure weight)
  const pressureImpact = pressureStatus === 'bust' || pressureStatus === 'marginal-bust'
    ? 0.1
    : pressureStatus === 'excellent' ? 1.4
    : pressureStatus === 'favorable' ? 1.2
    : 1.0;
  probability *= (1.0 + (pressureImpact - 1.0) * (pW / 0.40));
  
  // STEP B: Elevation Delta (learned thermal weight)
  const elevationImpact = (elevationStatus === 'inversion' || elevationStatus === 'inverted')
    ? 0.2
    : (elevationStatus === 'pump-active' || elevationStatus === 'optimal') ? 1.5
    : elevationStatus === 'building' ? 1.2
    : 1.0;
  probability *= (1.0 + (elevationImpact - 1.0) * (tW / 0.40));
  
  // WAHSATCH TRIGGER (Sulphur Creek specific)
  if (lakeId === 'sulfur-creek' && wahsatchStatus === 'trigger') {
    probability *= 2.0;
  } else if (lakeId === 'sulfur-creek' && wahsatchStatus === 'no-trigger') {
    probability *= 0.4;
  }

  // ARROWHEAD TRIGGER (Deer Creek specific)
  if (lakeId === 'deer-creek' && arrowheadStatus === 'trigger') {
    probability *= 1.8; // 80% boost when Arrowhead shows trigger pattern
  } else if (lakeId === 'deer-creek' && arrowheadStatus === 'no-trigger') {
    probability *= 0.5; // 50% reduction when no trigger
  }
  
  // SPANISH FORK EARLY INDICATOR (Utah Lake specific)
  // When QSF shows SE wind > 6 mph, thermal at Utah Lake likely in ~2 hours
  let spanishForkScore = 50;
  let spanishForkStatus = 'unknown';
  let spanishForkMessage = '';
  let spanishForkETA = null;
  
  if (lakeId.startsWith('utah-lake') && currentConditions?.spanishForkWind) {
    const sfWind = currentConditions.spanishForkWind;
    const sfSpeed = sfWind.speed;
    const sfDir = sfWind.direction;
    const trigger = SPANISH_FORK_INDICATOR.trigger;
    const sfLearnedWeight = weights.indicators?.['qsf-fps']?.weight ?? 1.0;
    
    // Check if direction is SE (100-180°)
    const isSEDirection = sfDir >= trigger.direction.min && sfDir <= trigger.direction.max;
    
    if (isSEDirection && sfSpeed >= trigger.speed.threshold) {
      // Strong indicator - thermal likely in 2 hours
      spanishForkScore = 90;
      spanishForkStatus = 'strong';
      spanishForkMessage = `EARLY WARNING: Spanish Fork ${safeToFixed(sfSpeed, 1)} mph from ${sfDir}° - thermal expected in ~2 hours`;
      spanishForkETA = 120; // minutes
      probability *= 1.0 + (0.4 * sfLearnedWeight);
    } else if (isSEDirection && sfSpeed >= trigger.speed.min) {
      // Moderate indicator
      spanishForkScore = 70;
      spanishForkStatus = 'moderate';
      spanishForkMessage = `Building: Spanish Fork ${safeToFixed(sfSpeed, 1)} mph SE - thermal developing`;
      spanishForkETA = 150; // minutes
      probability *= 1.0 + (0.2 * sfLearnedWeight);
    } else if (isSEDirection) {
      // Weak SE
      spanishForkScore = 40;
      spanishForkStatus = 'weak';
      spanishForkMessage = `Weak: Spanish Fork ${safeToFixed(sfSpeed, 1)} mph SE (need > 6 mph)`;
    } else {
      // Wrong direction
      spanishForkScore = 20;
      spanishForkStatus = 'no-signal';
      spanishForkMessage = `No signal: Spanish Fork ${sfDir}° (need SE 100-180°)`;
      probability *= 1.0 + (-0.1 * sfLearnedWeight);
    }
  }
  
  // NORTH FLOW INDICATOR (ALL Utah Lake locations)
  // VALIDATED: When KSLC shows N/NW wind, expect these speeds at Zig Zag 1hr later:
  // - KSLC 8-10 mph → ~13 mph at Zig Zag (56% foil kiteable)
  // - KSLC 10-15 mph → ~15.5 mph at Zig Zag (81% foil kiteable)
  // - KSLC 15+ mph → ~23 mph at Zig Zag (100% kiteable)
  // North flow is a real wind source for all Utah Lake locations, not just a thermal buster.
  let northFlowScore = 50;
  let northFlowStatus = 'unknown';
  let northFlowMessage = '';
  let northFlowETA = null;
  let expectedZigZagSpeed = null;
  let foilKiteablePct = null;
  let twinTipKiteablePct = null;
  
  if (lakeId.startsWith('utah-lake') && currentConditions?.kslcWind) {
    const kslcWind = currentConditions.kslcWind;
    const kslcSpeed = kslcWind.speed;
    const kslcDir = kslcWind.direction;
    const trigger = NORTH_FLOW_INDICATOR.trigger;
    const correlation = NORTH_FLOW_INDICATOR.speedCorrelation;
    const gradient = currentConditions?.pressureGradient;
    const nfLearnedWeight = weights.indicators?.['kslc-fps']?.weight ?? 1.0;
    
    // Check if direction is N/NW/NE (315-360 or 0-45)
    const isNorthDirection = kslcDir >= trigger.direction.min || kslcDir <= trigger.direction.max;
    const hasPositiveGradient = gradient != null && gradient > 0;
    
    // Determine expected Zig Zag speed based on validated correlation
    if (kslcSpeed >= 15) {
      expectedZigZagSpeed = correlation['15+'].avgFps;
      foilKiteablePct = correlation['15+'].foilKiteable;
      twinTipKiteablePct = correlation['15+'].twinTipKiteable;
    } else if (kslcSpeed >= 10) {
      expectedZigZagSpeed = correlation['10-15'].avgFps;
      foilKiteablePct = correlation['10-15'].foilKiteable;
      twinTipKiteablePct = correlation['10-15'].twinTipKiteable;
    } else if (kslcSpeed >= 8) {
      expectedZigZagSpeed = correlation['8-10'].avgFps;
      foilKiteablePct = correlation['8-10'].foilKiteable;
      twinTipKiteablePct = correlation['8-10'].twinTipKiteable;
    } else if (kslcSpeed >= 5) {
      expectedZigZagSpeed = correlation['5-8'].avgFps;
      foilKiteablePct = correlation['5-8'].foilKiteable;
      twinTipKiteablePct = correlation['5-8'].twinTipKiteable;
    }
    
    if (isNorthDirection && kslcSpeed >= 10) {
      // Strong indicator - 81% foil kiteable, ~15+ mph at Zig Zag
      northFlowScore = 95;
      northFlowStatus = 'strong';
      northFlowMessage = `NORTH FLOW: KSLC ${safeToFixed(kslcSpeed, 0)} mph N → expect ~${safeToFixed(expectedZigZagSpeed, 0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.0 + (0.6 * nfLearnedWeight);
    } else if (isNorthDirection && kslcSpeed >= 8) {
      // Moderate indicator - 56% foil kiteable, ~13 mph at Zig Zag
      northFlowScore = 75;
      northFlowStatus = 'moderate';
      northFlowMessage = `Building: KSLC ${safeToFixed(kslcSpeed, 0)} mph N → expect ~${safeToFixed(expectedZigZagSpeed, 0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.0 + (0.3 * nfLearnedWeight);
    } else if (isNorthDirection && kslcSpeed >= 5) {
      // Marginal indicator - 45% foil kiteable, ~9 mph at Zig Zag
      northFlowScore = 50;
      northFlowStatus = 'marginal';
      northFlowMessage = `Marginal: KSLC ${safeToFixed(kslcSpeed, 0)} mph N → expect ~${safeToFixed(expectedZigZagSpeed, 0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.0 + (0.1 * nfLearnedWeight);
    } else if (isNorthDirection) {
      // Weak north wind
      northFlowScore = 30;
      northFlowStatus = 'weak';
      const weakKslcStr = safeToFixed(kslcSpeed, 0);
      northFlowMessage = `Weak: KSLC ${weakKslcStr === '--' ? '?' : weakKslcStr} mph N (need 8+ for foil, 10+ for twin tip)`;
    } else if (hasPositiveGradient) {
      // Positive gradient but no north wind yet
      northFlowScore = 40;
      northFlowStatus = 'gradient-only';
      northFlowMessage = `Gradient favorable (+${safeToFixed(gradient, 2)} mb) but KSLC not showing north yet`;
    } else {
      // No signal
      northFlowScore = 20;
      northFlowStatus = 'no-signal';
      northFlowMessage = `No north signal: KSLC ${kslcDir}° (need N/NW 315-45°)`;
      probability *= 1.0 + (-0.2 * nfLearnedWeight);
    }
  }
  
  // EVENT PERSISTENCE — If north flow has been sustained for hours, boost confidence.
  // A 6+ hour north wind event is far more likely to continue than a 1-hour gust.
  let persistenceBoost = 1.0;
  let persistenceMessage = null;

  if (lakeId.startsWith('utah-lake') && currentConditions?.recentNorthFlowHours != null) {
    const hrs = currentConditions.recentNorthFlowHours;
    if (hrs >= 6) {
      persistenceBoost = 1.5;
      persistenceMessage = `Sustained north flow (${hrs}h+) — high confidence it continues`;
    } else if (hrs >= 3) {
      persistenceBoost = 1.25;
      persistenceMessage = `North flow building (${hrs}h) — likely to persist`;
    } else if (hrs >= 1) {
      persistenceBoost = 1.1;
      persistenceMessage = `North flow active (${hrs}h)`;
    }

    if (persistenceBoost > 1.0) {
      probability *= persistenceBoost;
      if (northFlowStatus === 'unknown' || northFlowStatus === 'no-signal') {
        northFlowStatus = 'sustained';
        northFlowScore = Math.max(northFlowScore, 70);
      }
    }
  }

  // PROVO AIRPORT INDICATOR (Best for Lincoln Beach & Sandy Beach)
  // VALIDATED: KPVU 8-10 mph N → 78% foil kiteable (better than KSLC's 56%)
  let provoIndicator = null;
  
  if ((lakeId === 'utah-lake-lincoln' || lakeId === 'utah-lake-sandy') && currentConditions?.kpvuWind) {
    const kpvuWind = currentConditions.kpvuWind;
    const kpvuSpeed = kpvuWind.speed;
    const kpvuDir = kpvuWind.direction;
    const correlation = PROVO_AIRPORT_INDICATOR.speedCorrelation;
    const pvuLearnedWeight = weights.indicators?.['kpvu-fps']?.weight ?? 1.0;
    
    const isNorthDirection = kpvuDir >= 315 || kpvuDir <= 45;
    
    let expectedSpeed = null;
    let foilPct = null;
    let twinPct = null;
    
    if (kpvuSpeed >= 15) {
      expectedSpeed = correlation['15+'].avgFps;
      foilPct = correlation['15+'].foilKiteable;
      twinPct = correlation['15+'].twinTipKiteable;
    } else if (kpvuSpeed >= 10) {
      expectedSpeed = correlation['10-15'].avgFps;
      foilPct = correlation['10-15'].foilKiteable;
      twinPct = correlation['10-15'].twinTipKiteable;
    } else if (kpvuSpeed >= 8) {
      expectedSpeed = correlation['8-10'].avgFps;
      foilPct = correlation['8-10'].foilKiteable;
      twinPct = correlation['8-10'].twinTipKiteable;
    } else if (kpvuSpeed >= 5) {
      expectedSpeed = correlation['5-8'].avgFps;
      foilPct = correlation['5-8'].foilKiteable;
      twinPct = correlation['5-8'].twinTipKiteable;
    }
    
    let status = 'unknown';
    let message = '';
    
    if (isNorthDirection && kpvuSpeed >= 10) {
      status = 'strong';
      message = `PROVO: ${safeToFixed(kpvuSpeed, 0)} mph N → expect ~${safeToFixed(expectedSpeed, 0)} mph (${foilPct}% foil)`;
      probability *= 1.0 + (0.4 * pvuLearnedWeight);
    } else if (isNorthDirection && kpvuSpeed >= 8) {
      status = 'good';
      message = `PROVO: ${safeToFixed(kpvuSpeed, 0)} mph N → expect ~${safeToFixed(expectedSpeed, 0)} mph (${foilPct}% foil)`;
      probability *= 1.0 + (0.2 * pvuLearnedWeight);
    } else if (isNorthDirection && kpvuSpeed >= 5) {
      status = 'possible';
      message = `PROVO: ${safeToFixed(kpvuSpeed, 0)} mph N → expect ~${safeToFixed(expectedSpeed, 0)} mph (${foilPct}% foil)`;
    } else {
      status = 'no-signal';
      const provoSpdStr = safeToFixed(kpvuSpeed, 0);
      message = `PROVO: ${kpvuDir}° at ${provoSpdStr === '--' ? '?' : provoSpdStr} mph (need N/NW)`;
    }
    
    provoIndicator = {
      status,
      message,
      windSpeed: kpvuSpeed,
      windDirection: kpvuDir,
      expectedSpeed,
      foilKiteablePct: foilPct,
      twinTipKiteablePct: twinPct,
      stationName: 'Provo Airport (KPVU)',
    };
  }
  
  // POINT OF MOUNTAIN INDICATOR (Gap wind)
  // Shows wind funneling through the gap - good confirmation
  let pointOfMountainIndicator = null;
  
  if (lakeId.startsWith('utah-lake') && currentConditions?.utalpWind) {
    const utalpWind = currentConditions.utalpWind;
    const utalpSpeed = utalpWind.speed;
    const utalpDir = utalpWind.direction;
    const correlation = POINT_OF_MOUNTAIN_INDICATOR.speedCorrelation;
    
    const isNorthDirection = utalpDir >= 315 || utalpDir <= 45;
    
    let expectedSpeed = null;
    let foilPct = null;
    let twinPct = null;
    
    if (utalpSpeed >= 15) {
      expectedSpeed = correlation['15+'].avgFps;
      foilPct = correlation['15+'].foilKiteable;
      twinPct = correlation['15+'].twinTipKiteable;
    } else if (utalpSpeed >= 10) {
      expectedSpeed = correlation['10-15'].avgFps;
      foilPct = correlation['10-15'].foilKiteable;
      twinPct = correlation['10-15'].twinTipKiteable;
    } else if (utalpSpeed >= 8) {
      expectedSpeed = correlation['8-10'].avgFps;
      foilPct = correlation['8-10'].foilKiteable;
      twinPct = correlation['8-10'].twinTipKiteable;
    } else if (utalpSpeed >= 5) {
      expectedSpeed = correlation['5-8'].avgFps;
      foilPct = correlation['5-8'].foilKiteable;
      twinPct = correlation['5-8'].twinTipKiteable;
    }
    
    let status = 'unknown';
    let message = '';
    
    if (isNorthDirection && utalpSpeed >= 10) {
      status = 'strong';
      message = `Gap wind: ${safeToFixed(utalpSpeed, 0)} mph N through Point of Mountain`;
    } else if (isNorthDirection && utalpSpeed >= 8) {
      status = 'moderate';
      message = `Gap wind building: ${safeToFixed(utalpSpeed, 0)} mph N`;
    } else if (isNorthDirection && utalpSpeed >= 5) {
      status = 'weak';
      message = `Light gap wind: ${safeToFixed(utalpSpeed, 0)} mph N`;
    } else {
      status = 'no-signal';
      const gapSpdStr = safeToFixed(utalpSpeed, 0);
      message = `No gap wind: ${utalpDir}° at ${gapSpdStr === '--' ? '?' : gapSpdStr} mph`;
    }
    
    pointOfMountainIndicator = {
      status,
      message,
      windSpeed: utalpSpeed,
      windDirection: utalpDir,
      expectedSpeed,
      foilKiteablePct: foilPct,
      twinTipKiteablePct: twinPct,
      stationName: 'Point of Mountain (UTALP)',
    };
  }
  
  // STEP C: Ground Truth / Current Conditions (learned convergence weight)
  const dirImpact = directionStatus === 'wrong' ? 0.1
    : directionStatus === 'optimal' ? 1.3
    : 1.0;
  probability *= (1.0 + (dirImpact - 1.0) * (cW / 0.20));
  
  const spdImpact = speedStatus === 'good' ? 1.2
    : speedStatus === 'light' ? 0.5
    : 1.0;
  probability *= (1.0 + (spdImpact - 1.0) * (cW / 0.20));
  
  // Hard rules from historical data
  if (pressureStatus === 'bust') {
    if (requiresNorthFlow && currentConditions?.pressureGradient < -1.0) {
      probability = 0; // North flow location but South flow present
    } else if (!requiresNorthFlow && currentConditions?.pressureGradient > 2.0) {
      probability = 0; // SE thermal location but strong North flow
    }
  }
  
  // Phase adjustment — but north flow operates outside thermal timing
  const hasActiveNorthFlow = northFlowStatus === 'strong' || northFlowStatus === 'moderate' || northFlowStatus === 'sustained';
  if (phase === 'ended' && !hasActiveNorthFlow) {
    probability = 0;
  } else if (phase === 'pre-thermal' && currentHour < 5 && !hasActiveNorthFlow) {
    probability *= 0.3;
  }
  
  // Apply learned probability calibration (shifts the curve toward actual hit rates)
  if (weights.probabilityCalibration) {
    const bucket = getBucket(probability);
    const cal = weights.probabilityCalibration[bucket];
    if (cal != null && cal > 0) {
      probability *= cal;
    }
  }

  // Anchor to statistical model calibration curves (observed base rates from 365-day history)
  const calCurves = statisticalModels?.calibrationCurves;
  if (calCurves?.byEventType?.thermal_cycle) {
    const tc = calCurves.byEventType.thermal_cycle;
    if (tc.totalEvents > 50 && tc.hourlyRates?.[currentHour] != null) {
      const observedRate = tc.hourlyRates[currentHour];
      const monthShare = tc.monthlyRates?.[currentMonth] ?? (1 / 12);
      const anchorPct = Math.round(observedRate * monthShare * 12 * 100);
      if (anchorPct > 0 && anchorPct < 100) {
        probability = probability * 0.75 + anchorPct * 0.25;
      }
    }
  }

  // Cap at 95%
  probability = Math.min(95, Math.max(0, Math.round(probability)));

  // windProbability — actual chance of usable wind from ANY source.
  // When wind is currently blowing at rideable speed, this should be high.
  const currentSpeed = currentConditions?.windSpeed || 0;
  const currentDir = currentConditions?.windDirection;
  const isCurrentlyNorth = currentDir != null && (currentDir >= 290 || currentDir <= 60);
  const isCurrentlySE = currentDir != null && currentDir >= 100 && currentDir <= 200;
  let windProbability = probability;

  if (currentSpeed >= 10 && (isCurrentlyNorth || isCurrentlySE)) {
    windProbability = Math.max(windProbability, 80);
  } else if (currentSpeed >= 8 && isCurrentlyNorth) {
    windProbability = Math.max(windProbability, 65);
  } else if (currentSpeed >= 6 && isCurrentlyNorth && (northFlowStatus === 'strong' || northFlowStatus === 'moderate' || northFlowStatus === 'sustained')) {
    windProbability = Math.max(windProbability, 55);
  }

  let windType = 'thermal';
  if (hasActiveNorthFlow || (isCurrentlyNorth && currentSpeed >= 6)) windType = 'north_flow';
  else if (pressureStatus === 'bust' && currentSpeed >= 6) windType = 'postfrontal';
  
  // Generate prediction message
  let predictionMessage = '';
  let willHaveThermal = null;
  
  const windLabel = hasActiveNorthFlow ? 'north flow wind' : 'SE thermal';

  const effectiveProb = Math.max(probability, windProbability);
  if (effectiveProb >= 60) {
    willHaveThermal = true;
    predictionMessage = windType === 'north_flow'
      ? `High probability (${effectiveProb}%) of north flow wind`
      : `High probability (${effectiveProb}%) of ${windLabel}`;
  } else if (effectiveProb >= 30) {
    willHaveThermal = null;
    predictionMessage = hasActiveNorthFlow
      ? `Moderate chance (${effectiveProb}%) of north flow developing`
      : `Moderate chance (${effectiveProb}%) - conditions developing`;
  } else if (effectiveProb > 0) {
    willHaveThermal = false;
    predictionMessage = `Low probability (${effectiveProb}%) - conditions unfavorable`;
  } else {
    willHaveThermal = false;
    if (phase === 'ended' && !hasActiveNorthFlow) {
      predictionMessage = `0% - Thermal window closed for today`;
    } else if (pressureStatus === 'bust') {
      predictionMessage = `0% - Pressure gradient unfavorable (historical: 0% success when SLC > PVU)`;
    } else if (directionStatus === 'wrong') {
      predictionMessage = `0% - Wrong wind direction`;
    } else {
      predictionMessage = `0% - Conditions not favorable`;
    }
  }
  
  return {
    lakeId,
    profile,
    phase,
    phaseMessage,
    timeToThermal,
    
    probability,
    windProbability,
    windType,
    
    direction: {
      status: directionStatus,
      score: directionScore,
      message: directionMessage,
      expected: direction.label,
      expectedRange: `${direction.optimal.min}-${direction.optimal.max}°`,
      current: currentConditions?.windDirection,
    },
    
    speed: {
      status: speedStatus,
      score: speedScore,
      message: speedMessage,
      expectedAvg: Math.max(0, expectedPeakSpeed + (weights.speedBiasCorrection || 0)),
      expectedRange: `${speed.typical.min}-${speed.typical.max} mph`,
      current: currentConditions?.windSpeed,
    },
    
    timing: {
      peakWindow: timing.peakWindow.label,
      peakHour: Math.round(expectedPeakHour),
      startTime: timing.usableStart.label,
      currentPhase: phase,
    },
    
    pressure: {
      status: pressureStatus,
      score: pressureScore,
      gradient: currentConditions?.pressureGradient,
      message: pressureMessage,
      bustThreshold: 2.0,
    },
    
    elevation: {
      status: elevationStatus,
      score: elevationScore,
      delta: currentConditions?.thermalDelta,
      message: elevationMessage,
      pumpActive: currentConditions?.pumpActive,
      inversionTrapped: currentConditions?.inversionTrapped,
    },
    
    // Wahsatch trigger (Sulphur Creek specific)
    wahsatch: lakeId === 'sulfur-creek' ? {
      status: wahsatchStatus,
      score: wahsatchScore,
      message: wahsatchMessage,
      windSpeed: currentConditions?.wahsatchWind?.speed,
      windDirection: currentConditions?.wahsatchWind?.direction,
      stationName: 'Wahsatch Hill EB (UT1)',
      triggerConditions: {
        speedNeeded: '12+ mph',
        directionNeeded: 'W (250-290°)',
        leadTime: '~30 min',
      },
    } : null,

    // Arrowhead trigger (Deer Creek specific)
    arrowhead: lakeId === 'deer-creek' ? {
      status: arrowheadStatus,
      score: arrowheadScore,
      message: arrowheadMessage,
      windSpeed: currentConditions?.ridgeWindSpeed,
      windDirection: currentConditions?.ridgeWindDirection,
      stationName: currentConditions?.ridgeStationName || 'Arrowhead',
      triggerConditions: {
        speedNeeded: '12-18 mph',
        directionNeeded: 'SSW (200-230°)',
        leadTime: '60 min',
      },
    } : null,
    
    // Spanish Fork early indicator (Utah Lake specific)
    spanishFork: lakeId.startsWith('utah-lake') ? {
      status: spanishForkStatus,
      score: spanishForkScore,
      message: spanishForkMessage,
      eta: spanishForkETA,
      windSpeed: currentConditions?.spanishForkWind?.speed,
      windDirection: currentConditions?.spanishForkWind?.direction,
      stationName: 'Spanish Fork (QSF)',
      triggerConditions: {
        directionNeeded: 'SE (100-180°)',
        speedNeeded: '> 6 mph (7.5+ optimal)',
        leadTime: '~2 hours',
      },
      statistics: {
        seDirectionOnGoodDays: '97%',
        avgSpeedOnGoodDays: '7.6 mph',
        accuracy: '62.5%',
      },
    } : null,
    
    // North Flow indicator (all Utah Lake locations)
    northFlow: lakeId.startsWith('utah-lake') ? {
      status: northFlowStatus,
      score: northFlowScore,
      message: northFlowMessage,
      eta: northFlowETA,
      windSpeed: currentConditions?.kslcWind?.speed,
      windDirection: currentConditions?.kslcWind?.direction,
      pressureGradient: currentConditions?.pressureGradient,
      expectedZigZagSpeed,
      foilKiteablePct,
      twinTipKiteablePct,
      persistenceHours: currentConditions?.recentNorthFlowHours || 0,
      persistenceBoost: persistenceBoost > 1.0 ? persistenceBoost : null,
      persistenceMessage,
      stationName: 'Salt Lake City (KSLC)',
      triggerConditions: {
        directionNeeded: 'N/NW (315-45°)',
        speedNeeded: '8+ mph (10+ optimal)',
        gradientNeeded: 'Positive (SLC > Provo)',
        leadTime: '~1 hour',
      },
      correlation: {
        'KSLC 8-10 mph': '→ ~13 mph at Zig Zag (56% foil)',
        'KSLC 10-15 mph': '→ ~15 mph at Zig Zag (81% foil)',
        'KSLC 15+ mph': '→ ~23 mph at Zig Zag (100% kiteable)',
      },
    } : null,
    
    // Provo Airport indicator (Best for Lincoln Beach & Sandy Beach)
    provoIndicator: provoIndicator,
    
    // Point of Mountain indicator (Gap wind)
    pointOfMountain: pointOfMountainIndicator,
    
    prediction: {
      willHaveThermal,
      confidence: effectiveProb,
      message: predictionMessage,
    },
    
    monthlyContext: {
      month: currentMonth,
      successRate: Math.round(monthlyRate * 100),
      expectedPeakHour: Math.round(expectedPeakHour),
      expectedPeakSpeed: expectedPeakSpeed.toFixed(1),
    },
    
    statistics: profile.statistics,
    
    // Learning metadata
    weightsVersion: learnedWeights?.version || 'default',
    isUsingLearnedWeights: learnedWeights != null && learnedWeights.version !== 'default',
    speedBiasCorrection: weights.speedBiasCorrection || 0,
    
    // Consistency prediction from backtest data
    consistencyForecast: (() => {
      const wts = weights.windTypeScores || {};
      const cp = weights.consistencyProfile || {};
      
      // Predict session quality based on detected wind type
      let detectedType = 'calm';
      if (directionStatus === 'optimal' && currentConditions?.windDirection >= 90 &&
          currentConditions?.windDirection <= 180) {
        detectedType = 'thermal';
      } else if (currentConditions?.windDirection != null &&
          (currentConditions.windDirection >= 315 || currentConditions.windDirection <= 45)) {
        detectedType = 'north_flow';
      } else if (speedStatus === 'good' || speedStatus === 'strong') {
        detectedType = 'other';
      }
      
      const typeData = wts[detectedType];
      if (!typeData) return null;
      
      return {
        expectedType: detectedType,
        qualityLikelihood: Math.round(typeData.qualityRate * 100),
        consistency: typeData.consistency,
        avgSessionScore: typeData.avgScore,
        bestHour: cp.bestQualityHour || 10,
        message: detectedType === 'thermal'
          ? `Thermal wind: ${Math.round(typeData.qualityRate * 100)}% chance of quality session (smooth, consistent)`
          : detectedType === 'north_flow'
            ? `North flow: ${Math.round(typeData.qualityRate * 100)}% quality — stronger but gustier than thermal`
            : detectedType === 'other'
              ? `Variable wind: only ${Math.round(typeData.qualityRate * 100)}% quality — likely inconsistent`
              : 'Too light for kiting',
      };
    })(),
  };
}

/**
 * Map a raw probability into a calibration bucket key
 */
function getBucket(prob) {
  if (prob < 20) return '0-20';
  if (prob < 40) return '20-40';
  if (prob < 60) return '40-60';
  if (prob < 80) return '60-80';
  return '80-100';
}

/**
 * Get direction info
 */
export function getDirectionInfo(degrees) {
  if (degrees == null) return { cardinal: 'N/A', arrow: '?' };
  
  const directions = [
    { min: 0, max: 22.5, cardinal: 'N', arrow: '↓' },
    { min: 22.5, max: 67.5, cardinal: 'NE', arrow: '↙' },
    { min: 67.5, max: 112.5, cardinal: 'E', arrow: '←' },
    { min: 112.5, max: 157.5, cardinal: 'SE', arrow: '↖' },
    { min: 157.5, max: 202.5, cardinal: 'S', arrow: '↑' },
    { min: 202.5, max: 247.5, cardinal: 'SW', arrow: '↗' },
    { min: 247.5, max: 292.5, cardinal: 'W', arrow: '→' },
    { min: 292.5, max: 337.5, cardinal: 'NW', arrow: '↘' },
    { min: 337.5, max: 360, cardinal: 'N', arrow: '↓' },
  ];
  
  const match = directions.find(d => degrees >= d.min && degrees < d.max);
  return match || { cardinal: 'N', arrow: '↓' };
}

/**
 * Format time until thermal
 */
export function formatTimeUntil(minutes) {
  if (minutes == null || minutes <= 0) return null;
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
