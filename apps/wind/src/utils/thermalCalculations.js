/**
 * Thermal Wind Prediction Calculations for Utah Wind Pro
 * 
 * Key Variables:
 * - G (Pressure Gap): P_SLC - P_Provo
 * - ΔT (Thermal Delta): T_Saratoga - T_Arrowhead(Ridge)
 * - Boundary Crossing: Water temp vs Air temp comparison
 */

export const THRESHOLDS = {
  PRESSURE_GAP_BUST: 2.0,
  THERMAL_DELTA_ACTIVE: 3.0,
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
};

/**
 * Calculate Pressure Gap (G = P_SLC - P_Provo)
 * If G > 2.0mb, probability of smooth thermal drops by 60%
 */
export function calculatePressureGap(slcPressure, provoPressure) {
  if (slcPressure == null || provoPressure == null) {
    return { gap: null, isBust: false, penalty: 0 };
  }
  
  const gap = slcPressure - provoPressure;
  const isBust = Math.abs(gap) > THRESHOLDS.PRESSURE_GAP_BUST;
  const penalty = isBust ? 60 : Math.abs(gap) * 20;
  
  return {
    gap: parseFloat(gap.toFixed(2)),
    isBust,
    penalty: Math.min(penalty, 60),
    description: isBust 
      ? 'North flow interference likely - thermal bust conditions'
      : gap > 1.0 
        ? 'Moderate pressure gradient - watch for gusty conditions'
        : 'Favorable pressure gradient for thermals',
  };
}

/**
 * Calculate Thermal Delta (ΔT = T_Saratoga - T_Arrowhead)
 * If ΔT increasing > 3°F/hour in morning, thermal pump is active
 */
export function calculateThermalDelta(lakeshoreTemp, ridgeTemp, previousDelta = null, hoursSinceLastReading = 1) {
  if (lakeshoreTemp == null || ridgeTemp == null) {
    return { delta: null, isActive: false, bonus: 0 };
  }
  
  const delta = lakeshoreTemp - ridgeTemp;
  
  let deltaChangeRate = 0;
  if (previousDelta != null) {
    deltaChangeRate = (delta - previousDelta) / hoursSinceLastReading;
  }
  
  const isActive = deltaChangeRate > THRESHOLDS.THERMAL_DELTA_ACTIVE;
  const bonus = isActive ? 25 : Math.max(0, deltaChangeRate * 5);
  
  return {
    delta: parseFloat(delta.toFixed(1)),
    deltaChangeRate: parseFloat(deltaChangeRate.toFixed(2)),
    isActive,
    bonus: Math.min(bonus, 25),
    description: isActive
      ? 'Thermal pump is ACTIVE - strong lake breeze expected'
      : delta > 10
        ? 'Good thermal gradient developing'
        : delta > 5
          ? 'Moderate thermal gradient'
          : 'Weak thermal gradient',
  };
}

/**
 * Calculate Water vs Air boundary crossing potential
 */
export function calculateBoundaryCrossing(airTemp, waterTemp, windSpeed) {
  if (airTemp == null || waterTemp == null) {
    return { differential: null, crossingPotential: 'unknown' };
  }
  
  const differential = airTemp - waterTemp;
  
  let crossingPotential = 'low';
  let bonus = 0;
  
  if (differential > 15 && windSpeed < 10) {
    crossingPotential = 'high';
    bonus = 20;
  } else if (differential > 10 && windSpeed < 15) {
    crossingPotential = 'moderate';
    bonus = 10;
  } else if (differential > 5) {
    crossingPotential = 'developing';
    bonus = 5;
  }
  
  return {
    differential: parseFloat(differential.toFixed(1)),
    crossingPotential,
    bonus,
    description: `Air is ${differential > 0 ? 'warmer' : 'cooler'} than water by ${Math.abs(differential).toFixed(1)}°F`,
  };
}

/**
 * Calculate overall Thermal Confidence Score (0-100%)
 */
export function calculateThermalConfidence({
  pressureGap,
  thermalDelta,
  boundaryCrossing,
  timeOfDay,
  currentWindSpeed,
  currentWindDirection,
}) {
  let baseScore = 50;
  
  if (pressureGap) {
    baseScore -= pressureGap.penalty;
  }
  
  if (thermalDelta) {
    baseScore += thermalDelta.bonus;
  }
  
  if (boundaryCrossing) {
    baseScore += boundaryCrossing.bonus;
  }
  
  if (timeOfDay) {
    const hour = new Date(timeOfDay).getHours();
    if (hour >= 11 && hour <= 16) {
      baseScore += 15;
    } else if (hour >= 9 && hour <= 18) {
      baseScore += 5;
    } else {
      baseScore -= 20;
    }
  }
  
  if (currentWindSpeed != null) {
    if (currentWindSpeed >= 8 && currentWindSpeed <= 20) {
      baseScore += 10;
    } else if (currentWindSpeed > 25) {
      baseScore -= 15;
    }
  }
  
  if (currentWindDirection != null) {
    if (currentWindDirection >= 180 && currentWindDirection <= 270) {
      baseScore += 10;
    } else if (currentWindDirection >= 315 || currentWindDirection <= 45) {
      baseScore -= 10;
    }
  }
  
  return Math.max(THRESHOLDS.MIN_CONFIDENCE, Math.min(THRESHOLDS.MAX_CONFIDENCE, Math.round(baseScore)));
}

/**
 * Get thermal window prediction
 */
export function getThermalWindowPrediction(confidence) {
  if (confidence >= 80) {
    return {
      status: 'excellent',
      message: 'Excellent thermal conditions expected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    };
  } else if (confidence >= 60) {
    return {
      status: 'good',
      message: 'Good thermal window likely',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    };
  } else if (confidence >= 40) {
    return {
      status: 'moderate',
      message: 'Moderate thermal potential',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    };
  } else if (confidence >= 20) {
    return {
      status: 'poor',
      message: 'Poor thermal conditions',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    };
  } else {
    return {
      status: 'bust',
      message: 'Thermal bust likely',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    };
  }
}

/**
 * Format wind direction to cardinal
 */
export function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
