import { LAKE_CONFIGS, WIND_DIRECTION_OPTIMAL, getPrimaryRidgeStation, STATION_INFO } from '../config/lakeStations';
import { safeToFixed } from '../utils/safeToFixed';
import { predictThermal } from './ThermalPredictor';
import { learningSystem } from './LearningSystem';

// Learned weights cache for DataNormalizer's probability calculation
let _learnedWeightsForNorm = null;

// Subscribe to weight updates from the learning system
learningSystem.onWeightsUpdated((weights) => {
  _learnedWeightsForNorm = weights;
});

/**
 * LakeState - Normalized data structure for thermal prediction
 * 
 * THREE-STEP MODEL:
 * Step A: GRADIENT CHECK - ΔP (SLC - Provo) > 2.0mb = North flow override
 * Step B: ELEVATION DELTA - High station temp vs lakeshore = thermal pump indicator
 * Step C: GROUND TRUTH - PWS verifies exact thermal arrival
 */
export class LakeState {
  constructor(lakeId) {
    this.lakeId = lakeId;
    this.config = LAKE_CONFIGS[lakeId];
    this.timestamp = new Date().toISOString();
    
    // Ground Truth (Step C)
    this.pws = null;
    
    // Gradient Check (Step A)
    this.pressure = { 
      high: null, 
      low: null, 
      gradient: null,
      bustThreshold: 2.0,
      isBusted: false,
    };
    
    // Elevation Delta (Step B)
    this.thermal = { 
      lakeshore: null, 
      ridge: null, 
      delta: null,
      pumpActive: false,  // True if rapid morning warm-up
      inversionTrapped: false,  // True if large inversion
    };
    
    this.wind = { stations: [], convergence: null };
    this.history = { wind: [], temperature: [], pressure: [] };
    
    this.probability = 0;
    this.factors = {
      pressureScore: 0,
      thermalScore: 0,
      convergenceScore: 0,
    };
    this.alerts = [];
    
    // Model explanation
    this.modelSteps = {
      stepA: { name: 'Gradient Check', status: 'pending', result: null },
      stepB: { name: 'Elevation Delta', status: 'pending', result: null },
      stepC: { name: 'Ground Truth', status: 'pending', result: null },
    };
  }

  static fromRawData(lakeId, ambientData, synopticStations, historyData = null) {
    const state = new LakeState(lakeId);
    const config = state.config;
    
    if (!config) {
      console.error(`Unknown lake ID: ${lakeId}`);
      return state;
    }

    // =========================================
    // STEP C: GROUND TRUTH - Your PWS data
    // Verifies exact minute thermal hits boundary
    // =========================================
    // PWS is physically at Zig Zag / Utah Lake — only attach for Utah Lake locations
    if (ambientData && lakeId.startsWith('utah-lake')) {
      const pwsDisplayName = lakeId === 'utah-lake-zigzag'
        ? 'Zig Zag (Your Station)'
        : 'Saratoga Springs PWS';
      
      state.pws = {
        name: pwsDisplayName,
        temperature: ambientData.temperature,
        humidity: ambientData.humidity,
        windSpeed: ambientData.windSpeed,
        windGust: ambientData.windGust,
        windDirection: ambientData.windDirection,
        pressure: ambientData.pressure,
        timestamp: ambientData.timestamp,
        isYourStation: true,
      };
      state.thermal.lakeshore = ambientData.temperature;
      
      state.modelSteps.stepC = {
        name: 'Ground Truth',
        status: 'complete',
        result: {
          station: ambientData.stationName,
          windSpeed: ambientData.windSpeed,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
        },
      };
    }

    if (synopticStations && synopticStations.length > 0) {
      const stationMap = new Map(synopticStations.map((s) => [s.stationId, s]));

      // =========================================
      // STEP A: GRADIENT CHECK
      // ΔP (SLC - Provo) > 2.0mb = North flow dominates
      // =========================================
      const highStation = stationMap.get(config.stations.pressure.high.id);
      const lowStation = stationMap.get(config.stations.pressure.low.id);
      
      if (highStation?.pressure != null) {
        state.pressure.high = {
          id: highStation.stationId,
          name: config.stations.pressure.high.name,
          value: highStation.pressure,
          elevation: config.stations.pressure.high.elevation,
          role: config.stations.pressure.high.role,
        };
      }
      
      if (lowStation?.pressure != null) {
        state.pressure.low = {
          id: lowStation.stationId,
          name: config.stations.pressure.low.name,
          value: lowStation.pressure,
          elevation: config.stations.pressure.low.elevation,
          role: config.stations.pressure.low.role,
        };
      }
      
      if (state.pressure.high?.value != null && state.pressure.low?.value != null) {
        state.pressure.gradient = parseFloat(
          safeToFixed(state.pressure.high.value - state.pressure.low.value, 3)
        );
        state.pressure.bustThreshold = config.stations.pressure.bustThreshold || 2.0;

        // Locations with northFlow config *benefit* from a positive gradient
        // (north flow is their wind source, not a thermal killer)
        const hasNorthFlowConfig = config.thermal?.northFlow != null;
        
        if (hasNorthFlowConfig) {
          state.pressure.isBusted = false;
          state.pressure.northFlowActive = state.pressure.gradient > 0.5;
          
          state.modelSteps.stepA = {
            name: 'Gradient Check (North Flow Location)',
            status: 'complete',
            result: {
              gradient: state.pressure.gradient,
              threshold: state.pressure.bustThreshold,
              isBusted: false,
              northFlowActive: state.pressure.northFlowActive,
              explanation: state.pressure.gradient > 0.5
                ? `ΔP ${safeToFixed(state.pressure.gradient, 2)}mb = North flow active (GOOD for this location)`
                : `ΔP ${safeToFixed(state.pressure.gradient, 2)}mb = Weak gradient, thermal may be primary wind`,
            },
          };
        } else {
          state.pressure.isBusted = state.pressure.gradient > state.pressure.bustThreshold;
          
          state.modelSteps.stepA = {
            name: 'Gradient Check',
            status: 'complete',
            result: {
              gradient: state.pressure.gradient,
              threshold: state.pressure.bustThreshold,
              isBusted: state.pressure.isBusted,
              explanation: state.pressure.isBusted 
                ? `ΔP ${safeToFixed(state.pressure.gradient, 2)}mb > ${state.pressure.bustThreshold}mb = North flow dominates`
                : `ΔP ${safeToFixed(state.pressure.gradient, 2)}mb < ${state.pressure.bustThreshold}mb = Thermal possible`,
            },
          };
        }
      }

      // =========================================
      // STEP B: ELEVATION DELTA
      // Compare high station temp vs lakeshore
      // Large inversion = air trapped
      // Rapid morning warm-up = "Thermal Pump" starting
      // =========================================
      let ridgeStation = null;
      let ridgeConfig = null;
      for (const ridge of config.stations.ridge) {
        const station = stationMap.get(ridge.id);
        if (station?.temperature != null) {
          ridgeStation = station;
          ridgeConfig = ridge;
          break;
        }
      }
      
      if (ridgeStation?.temperature != null) {
        state.thermal.ridge = ridgeStation.temperature;
        state.thermal.ridgeStation = {
          id: ridgeStation.stationId,
          name: ridgeConfig.name,
          elevation: ridgeConfig.elevation,
          role: ridgeConfig.role,
          // Include ridge wind data for Arrowhead trigger analysis
          windSpeed: ridgeStation.windSpeed,
          windDirection: ridgeStation.windDirection,
        };
      }
      
      // For non-PWS locations, use the primary lakeshore station temperature
      if (state.thermal.lakeshore == null && config.stations.lakeshore?.length > 0) {
        for (const ls of config.stations.lakeshore) {
          const lsStation = stationMap.get(ls.id);
          if (lsStation?.temperature != null) {
            state.thermal.lakeshore = lsStation.temperature;
            break;
          }
        }
      }

      if (state.thermal.lakeshore != null && state.thermal.ridge != null) {
        state.thermal.delta = parseFloat(
          safeToFixed(state.thermal.lakeshore - state.thermal.ridge, 1)
        );
        
        // Thermal pump is active if lakeshore is significantly warmer than ridge
        state.thermal.pumpActive = state.thermal.delta >= 10;
        // Inversion trapped if ridge is warmer than lakeshore (negative delta)
        state.thermal.inversionTrapped = state.thermal.delta < 0;
        
        state.modelSteps.stepB = {
          name: 'Elevation Delta',
          status: 'complete',
          result: {
            lakeshoreTemp: state.thermal.lakeshore,
            ridgeTemp: state.thermal.ridge,
            delta: state.thermal.delta,
            pumpActive: state.thermal.pumpActive,
            inversionTrapped: state.thermal.inversionTrapped,
            explanation: state.thermal.inversionTrapped
              ? `Inversion: Ridge (${state.thermal.ridge}°F) warmer than shore (${state.thermal.lakeshore}°F)`
              : state.thermal.pumpActive
                ? `Thermal Pump ACTIVE: Shore ${state.thermal.delta}°F warmer than ridge`
                : `Moderate delta: Shore ${state.thermal.delta}°F warmer than ridge`,
          },
        };
      }

      // Wind stations from all sources
      state.wind.stations = [];
      
      if (state.pws) {
        state.wind.stations.push({
          id: 'PWS',
          name: state.pws.name,
          speed: state.pws.windSpeed,
          gust: state.pws.windGust,
          direction: state.pws.windDirection,
          temperature: state.pws.temperature,
          isPWS: true,
          isYourStation: true,
          role: 'Ground Truth - Your station at Zig Zag',
        });
      }
      
      config.stations.lakeshore.forEach((stationConfig) => {
        const station = stationMap.get(stationConfig.id);
        if (station) {
          const info = STATION_INFO[stationConfig.id] || {};
          state.wind.stations.push({
            id: station.stationId,
            name: stationConfig.name,
            speed: station.windSpeed,
            gust: station.windGust,
            direction: station.windDirection,
            temperature: station.temperature,
            elevation: stationConfig.elevation,
            role: stationConfig.role,
            network: info.network,
            isPWS: false,
          });
        }
      });

      state.wind.convergence = calculateVectorConvergence(
        state.wind.stations,
        WIND_DIRECTION_OPTIMAL[lakeId]
      );
      
      // =========================================
      // SPANISH FORK EARLY INDICATOR (Utah Lake)
      // When QSF shows SE wind > 6 mph, thermal likely in ~2 hours
      // =========================================
      if (lakeId.startsWith('utah-lake') && config.stations.earlyIndicator) {
        const earlyIndicatorStation = stationMap.get(config.stations.earlyIndicator.id);
        if (earlyIndicatorStation) {
          state.earlyIndicator = {
            id: earlyIndicatorStation.stationId,
            name: config.stations.earlyIndicator.name,
            windSpeed: earlyIndicatorStation.windSpeed,
            windDirection: earlyIndicatorStation.windDirection,
            temperature: earlyIndicatorStation.temperature,
            elevation: config.stations.earlyIndicator.elevation,
            role: config.stations.earlyIndicator.role,
            leadTimeMinutes: config.stations.earlyIndicator.leadTimeMinutes,
            trigger: config.stations.earlyIndicator.trigger,
          };
        }
      }
      
      // =========================================
      // KSLC NORTH FLOW INDICATOR (Utah Lake north flow locations)
      // When KSLC shows N/NW wind > 5 mph, north flow likely in ~1 hour
      // =========================================
      if (lakeId.startsWith('utah-lake')) {
        const kslcStation = stationMap.get('KSLC');
        if (kslcStation) {
          state.kslcStation = {
            id: kslcStation.stationId,
            name: 'Salt Lake City Airport',
            windSpeed: kslcStation.windSpeed,
            windDirection: kslcStation.windDirection,
            temperature: kslcStation.temperature,
            pressure: kslcStation.pressure,
            elevation: 4226,
            role: 'North Flow Early Indicator - N/NW wind here precedes Utah Lake by ~1 hour',
          };
        }
        
        // =========================================
        // KPVU INDICATOR (Best for Lincoln Beach & Sandy Beach)
        // 78% foil kiteable at 8-10 mph N - better than KSLC for southern launches
        // =========================================
        const kpvuStation = stationMap.get('KPVU');
        if (kpvuStation) {
          state.kpvuStation = {
            id: kpvuStation.stationId,
            name: 'Provo Airport',
            windSpeed: kpvuStation.windSpeed,
            windDirection: kpvuStation.windDirection,
            temperature: kpvuStation.temperature,
            pressure: kpvuStation.pressure,
            elevation: 4495,
            role: 'Southern Launch Indicator - Best for Lincoln Beach & Sandy Beach',
          };
        }
        
        // =========================================
        // UTALP INDICATOR (Point of Mountain - Gap wind)
        // Shows wind funneling through the gap
        // =========================================
        const utalpStation = stationMap.get('UTALP');
        if (utalpStation) {
          state.utalpStation = {
            id: utalpStation.stationId,
            name: 'Point of Mountain',
            windSpeed: utalpStation.windSpeed,
            windDirection: utalpStation.windDirection,
            temperature: utalpStation.temperature,
            elevation: 4796,
            role: 'Gap Wind Indicator - Shows north flow through Point of Mountain',
          };
        }
      }
    }

    if (historyData) {
      state.history = historyData;
    }

    // =========================================
    // EVENT PERSISTENCE — count recent consecutive north-flow hours
    // =========================================
    let recentNorthFlowHours = 0;
    if (historyData?.length > 0) {
      const sorted = [...historyData]
        .filter(r => r.windDirection != null && r.windSpeed != null)
        .sort((a, b) => new Date(b.timestamp || b.dateTime) - new Date(a.timestamp || a.dateTime));
      for (const reading of sorted) {
        const dir = reading.windDirection;
        const spd = reading.windSpeed;
        const isNorth = (dir >= 315 || dir <= 45) && spd >= 8;
        if (isNorth) {
          recentNorthFlowHours++;
        } else {
          break;
        }
      }
    } else {
      const currentDir = state.pws?.windDirection || state.wind.stations?.[0]?.direction;
      const currentSpd = state.pws?.windSpeed || state.wind.stations?.[0]?.speed;
      if (currentDir != null && currentSpd != null && (currentDir >= 315 || currentDir <= 45) && currentSpd >= 8) {
        recentNorthFlowHours = 1;
      }
    }

    // =========================================
    // FINAL PREDICTION - Combine all 3 steps
    // =========================================
    const thermalPrediction = predictThermal(lakeId, {
      windSpeed: state.pws?.windSpeed || state.wind.stations?.[0]?.speed,
      windDirection: state.pws?.windDirection || state.wind.stations?.[0]?.direction,
      temperature: state.pws?.temperature,
      pressureGradient: state.pressure.gradient,
      thermalDelta: state.thermal.delta,
      pumpActive: state.thermal.pumpActive,
      inversionTrapped: state.thermal.inversionTrapped,
      ridgeWindSpeed: state.thermal.ridgeStation?.windSpeed,
      ridgeWindDirection: state.thermal.ridgeStation?.windDirection,
      ridgeStationName: state.thermal.ridgeStation?.name,
      spanishForkWind: state.earlyIndicator ? {
        speed: state.earlyIndicator.windSpeed,
        direction: state.earlyIndicator.windDirection,
        temperature: state.earlyIndicator.temperature,
      } : null,
      kslcWind: state.kslcStation ? {
        speed: state.kslcStation.windSpeed,
        direction: state.kslcStation.windDirection,
        temperature: state.kslcStation.temperature,
      } : null,
      kpvuWind: state.kpvuStation ? {
        speed: state.kpvuStation.windSpeed,
        direction: state.kpvuStation.windDirection,
        temperature: state.kpvuStation.temperature,
      } : null,
      utalpWind: state.utalpStation ? {
        speed: state.utalpStation.windSpeed,
        direction: state.utalpStation.windDirection,
        temperature: state.utalpStation.temperature,
      } : null,
      recentNorthFlowHours,
    });
    
    state.probability = thermalPrediction?.probability || 0;
    state.thermalPrediction = thermalPrediction;
    
    state.factors = {
      pressureScore: thermalPrediction?.pressure?.score || 50,
      thermalScore: thermalPrediction?.direction?.score || 50,
      convergenceScore: thermalPrediction?.speed?.score || 50,
    };

    state.alerts = generateAlerts(state);
    state.timestamp = new Date().toISOString();
    
    return state;
  }
}

function calculateVectorConvergence(stations, optimalRange) {
  if (!stations || stations.length === 0 || !optimalRange) {
    return { score: 0, alignment: 'unknown', details: [] };
  }

  const validStations = stations.filter(
    (s) => s.direction != null && s.speed != null && s.speed > 0.5
  );

  if (validStations.length === 0) {
    return { score: 0, alignment: 'calm', details: [] };
  }

  const details = validStations.map((station) => {
    const dir = station.direction;
    const { min, max, ideal } = optimalRange;
    
    let inRange = false;
    if (min <= max) {
      inRange = dir >= min && dir <= max;
    } else {
      inRange = dir >= min || dir <= max;
    }

    let deviation = Math.abs(dir - ideal);
    if (deviation > 180) deviation = 360 - deviation;
    
    const alignmentScore = inRange ? Math.max(0, 100 - deviation) : Math.max(0, 50 - deviation);

    return {
      id: station.id,
      name: station.name,
      direction: dir,
      speed: station.speed,
      inOptimalRange: inRange,
      deviation,
      score: alignmentScore,
    };
  });

  const avgScore = details.reduce((sum, d) => sum + d.score, 0) / details.length;
  const inRangeCount = details.filter((d) => d.inOptimalRange).length;
  
  let alignment = 'poor';
  if (avgScore >= 70 && inRangeCount >= validStations.length * 0.6) {
    alignment = 'excellent';
  } else if (avgScore >= 50 && inRangeCount >= validStations.length * 0.4) {
    alignment = 'good';
  } else if (avgScore >= 30) {
    alignment = 'moderate';
  }

  return {
    score: Math.round(avgScore),
    alignment,
    inRangeRatio: inRangeCount / validStations.length,
    details,
  };
}

/**
 * @deprecated This function is not currently called — probability comes from
 * ThermalPredictor.predictThermal() which uses learned weights directly.
 * Kept for potential future use as an alternative probability path.
 */
export function calculateProbability(state) {
  const WEIGHTS = {
    pressure: _learnedWeightsForNorm?.pressureWeight ?? 0.40,
    thermal: _learnedWeightsForNorm?.thermalWeight ?? 0.40,
    convergence: _learnedWeightsForNorm?.convergenceWeight ?? 0.20,
  };

  let pressureScore = 50;
  if (state.pressure.gradient != null) {
    const absGradient = Math.abs(state.pressure.gradient);
    
    if (absGradient <= 0.5) {
      pressureScore = 100;
    } else if (absGradient <= 1.0) {
      pressureScore = 85;
    } else if (absGradient <= 1.5) {
      pressureScore = 70;
    } else if (absGradient <= 2.0) {
      pressureScore = 50;
    } else if (absGradient <= 3.0) {
      pressureScore = 25;
    } else {
      pressureScore = 0;
    }
    
    if (state.pressure.gradient > 0 && absGradient > 1.5) {
      pressureScore *= 0.7;
    }
  }

  let thermalScore = 50;
  if (state.thermal.delta != null) {
    const delta = state.thermal.delta;
    
    if (delta >= 15) {
      thermalScore = 100;
    } else if (delta >= 10) {
      thermalScore = 85;
    } else if (delta >= 5) {
      thermalScore = 70;
    } else if (delta >= 0) {
      thermalScore = 50;
    } else {
      thermalScore = Math.max(0, 30 + delta * 3);
    }
  }

  let convergenceScore = 50;
  if (state.wind.convergence?.score != null) {
    convergenceScore = state.wind.convergence.score;
  }

  const weightedTotal = 
    pressureScore * WEIGHTS.pressure +
    thermalScore * WEIGHTS.thermal +
    convergenceScore * WEIGHTS.convergence;

  const hour = new Date().getHours();
  let timeMultiplier = 1.0;
  if (hour >= 11 && hour <= 16) {
    timeMultiplier = 1.15;
  } else if (hour >= 9 && hour <= 18) {
    timeMultiplier = 1.0;
  } else {
    timeMultiplier = 0.6;
  }

  // Apply learned hourly correction on top of the base time multiplier
  const learnedHourly = _learnedWeightsForNorm?.hourlyMultipliers?.[hour];
  if (learnedHourly != null && learnedHourly > 0) {
    timeMultiplier *= learnedHourly;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedTotal * timeMultiplier)));

  return {
    total: finalScore,
    factors: {
      pressureScore: Math.round(pressureScore),
      thermalScore: Math.round(thermalScore),
      convergenceScore: Math.round(convergenceScore),
    },
    weights: WEIGHTS,
    timeMultiplier,
    weightsVersion: _learnedWeightsForNorm?.version || 'default',
    isLearned: _learnedWeightsForNorm != null && _learnedWeightsForNorm.version !== 'default',
  };
}

function generateAlerts(state) {
  const alerts = [];

  if (state.pressure.gradient != null && Math.abs(state.pressure.gradient) > 2.0) {
    alerts.push({
      type: 'bust',
      severity: 'high',
      message: `Pressure gradient ${safeToFixed(state.pressure.gradient, 2)}mb exceeds bust threshold`,
      timestamp: state.timestamp,
    });
  }

  if (state.probability >= 75) {
    alerts.push({
      type: 'thermal',
      severity: 'positive',
      message: `Thermal probability at ${state.probability}% - excellent conditions!`,
      timestamp: state.timestamp,
    });
  }

  const gustyStations = state.wind.stations.filter(
    (s) => s.gust && s.speed && s.gust > s.speed * 1.8
  );
  if (gustyStations.length > 0) {
    alerts.push({
      type: 'gusty',
      severity: 'medium',
      message: `Gusty conditions at ${gustyStations.map((s) => s.name).join(', ')}`,
      timestamp: state.timestamp,
    });
  }

  return alerts;
}

export function getProbabilityStatus(probability, thermalPrediction) {
  // Use the thermal prediction's phase and message if available
  const phase = thermalPrediction?.phase;
  
  if (phase === 'ended') {
    return {
      status: 'ended',
      message: 'Thermal window closed',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-500/30',
    };
  }
  
  if (probability >= 60) {
    return {
      status: 'excellent',
      message: phase === 'peak' ? 'Peak thermal window!' : 'High probability',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
    };
  } else if (probability >= 40) {
    return {
      status: 'good',
      message: 'Good thermal potential',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
    };
  } else if (probability >= 20) {
    return {
      status: 'moderate',
      message: phase === 'building' ? 'Thermal building' : 'Moderate chance',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
    };
  } else if (probability > 0) {
    return {
      status: 'poor',
      message: phase === 'fading' ? 'Thermal fading' : 'Low probability',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
    };
  } else {
    return {
      status: 'bust',
      message: 'No thermal expected',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
    };
  }
}
