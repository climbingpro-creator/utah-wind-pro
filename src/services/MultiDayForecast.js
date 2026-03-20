/**
 * MULTI-DAY FORECAST SERVICE
 * 
 * Based on 3 years of Zig Zag station data (307,748 observations):
 * 
 * KEY FINDINGS:
 * 
 * 1. SE THERMAL PATTERNS:
 *    - 249 thermal days identified (23.1% of all days)
 *    - Best months: July (46.2%), August (37.6%), June (32.2%)
 *    - Worst months: November (3.3%), December (9.7%), January (10.8%)
 *    - Peak hours: 13:00-16:00 (avg speed 13.5-13.9 mph)
 *    - Avg direction: 150-165° (SSE)
 *    - Day-before evening: 58.2°F, 25.45 inHg, 6.0 mph
 *    - Pressure FALLS before thermal days (avg -0.025 inHg)
 * 
 * 2. NORTH FLOW PATTERNS:
 *    - 165 north flow days (15.3% of all days)
 *    - Best months: April (35.6%), June (30.0%), May (28.0%)
 *    - Day-before evening: 46.9°F, 25.42 inHg, 6.7 mph
 *    - Pressure RISES before north flow (avg +0.031 inHg)
 * 
 * 3. MULTI-DAY PRESSURE TRENDS:
 *    SE Thermal: Gradual pressure drop over 5 days (25.51 → 25.48)
 *    North Flow: Pressure drop then sharp rise (25.49 → 25.43 → rise)
 * 
 * 4. PREDICTION ACCURACY:
 *    - 5 days out: ~40% confidence (pressure trend only)
 *    - 3 days out: ~60% confidence (pressure + temp trend)
 *    - 1 day out: ~80% confidence (evening conditions)
 *    - Same day: ~90% confidence (morning gradient)
 */

import zigzagData from '../data/zigzag-historical.json';
import { safeToFixed } from '../utils/safeToFixed';

/**
 * KITE SPEED THRESHOLDS
 * Foil Kite: 10+ mph (more efficient, works in lighter wind)
 * Twin Tip: 15+ mph (needs more power)
 */
const KITE_THRESHOLDS = {
  foil: 10,
  twinTip: 15,
};

/**
 * Determine kite-ability based on expected wind speed
 */
function getKiteability(expectedSpeed, windType) {
  // North flow is typically stronger
  const speed = windType === 'North Flow' ? Math.max(expectedSpeed, 18) : expectedSpeed;
  
  if (speed >= KITE_THRESHOLDS.twinTip) {
    return {
      status: 'all-kites',
      foil: true,
      twinTip: true,
      message: 'Great for all kites!',
      color: 'text-green-400',
    };
  }
  
  if (speed >= KITE_THRESHOLDS.foil) {
    return {
      status: 'foil-only',
      foil: true,
      twinTip: false,
      message: 'Foil kite recommended',
      color: 'text-cyan-400',
    };
  }
  
  return {
    status: 'too-light',
    foil: false,
    twinTip: false,
    message: 'Too light for kiting',
    color: 'text-slate-500',
  };
}

// Historical patterns from 3 years of data
const PATTERNS = {
  seThermal: {
    monthlyRates: zigzagData.monthlyPatterns,
    dayBefore: zigzagData.dayBeforePatterns.seThermal,
    multiDay: zigzagData.multiDayPatterns.seThermal,
    pressureChange: zigzagData.pressureChangePatterns.seThermal,
    hourly: zigzagData.hourlyPatterns,
  },
  northFlow: {
    monthlyRates: zigzagData.monthlyPatterns,
    dayBefore: zigzagData.dayBeforePatterns.northFlow,
    multiDay: zigzagData.multiDayPatterns.northFlow,
    pressureChange: zigzagData.pressureChangePatterns.northFlow,
  },
};

/**
 * Calculate 5-day forecast based on pressure trends
 */
export function calculate5DayForecast(currentConditions, forecastData = null) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const forecasts = [];
  
  // Get monthly base rates
  const monthData = PATTERNS.seThermal.monthlyRates[month] || { seRate: 20, nRate: 15 };
  const baseSeRate = monthData.seRate;
  const baseNRate = monthData.nRate;
  
  // Current conditions
  const currentPressure = currentConditions?.pressure || 25.50;
  const currentTemp = currentConditions?.temperature || 50;
  
  for (let day = 0; day <= 5; day++) {
    const forecastDate = new Date(now);
    forecastDate.setDate(forecastDate.getDate() + day);
    
    let seProbability = baseSeRate;
    let nProbability = baseNRate;
    let confidence = 'low';
    let factors = [];
    
    if (day === 0) {
      // Same day - use current conditions
      confidence = 'high';
      
      // Pressure gradient check
      if (currentConditions?.pressureGradient != null) {
        if (currentConditions.pressureGradient < -1.0) {
          seProbability += 30;
          factors.push('Strong negative gradient - thermal likely');
        } else if (currentConditions.pressureGradient > 1.0) {
          seProbability -= 30;
          nProbability += 20;
          factors.push('Positive gradient - north flow possible');
        }
      }
      
      // Temperature check
      if (currentTemp > 60) {
        seProbability += 10;
        factors.push('Warm temps favor thermal');
      }
      
    } else if (day === 1) {
      // Tomorrow - use evening patterns
      confidence = 'good';
      
      // Compare to historical day-before patterns
      const seDayBefore = PATTERNS.seThermal.dayBefore;
      const nDayBefore = PATTERNS.northFlow.dayBefore;
      
      // Temperature match
      if (Math.abs(currentTemp - seDayBefore.eveningTemp) < 10) {
        seProbability += 15;
        factors.push(`Evening temp ${safeToFixed(currentTemp, 0)}°F matches thermal pattern`);
      }
      if (Math.abs(currentTemp - nDayBefore.eveningTemp) < 10) {
        nProbability += 15;
        factors.push(`Evening temp ${safeToFixed(currentTemp, 0)}°F matches north flow pattern`);
      }
      
      // Pressure match
      if (Math.abs(currentPressure - seDayBefore.eveningPressure) < 0.1) {
        seProbability += 10;
        factors.push('Pressure matches thermal day pattern');
      }
      
    } else if (day <= 3) {
      // 2-3 days out - use pressure trends
      confidence = 'moderate';
      
      const seMultiDay = PATTERNS.seThermal.multiDay[`day${day}`];
      const nMultiDay = PATTERNS.northFlow.multiDay[`day${day}`];
      
      if (seMultiDay && Math.abs(currentPressure - seMultiDay.pressure) < 0.1) {
        seProbability += 10;
        factors.push(`Pressure ${safeToFixed(currentPressure, 2)} matches ${day}-day thermal setup`);
      }
      
      if (nMultiDay && Math.abs(currentPressure - nMultiDay.pressure) < 0.1) {
        nProbability += 10;
        factors.push(`Pressure matches ${day}-day north flow setup`);
      }
      
    } else {
      // 4-5 days out - low confidence, use seasonal + pressure trend
      confidence = 'low';
      factors.push('Extended forecast - monitor pressure trend');
      
      // Just use seasonal baseline with slight adjustments
      if (currentPressure > 25.55) {
        seProbability -= 10;
        factors.push('High pressure may suppress thermal');
      } else if (currentPressure < 25.40) {
        nProbability += 10;
        factors.push('Low pressure - watch for frontal passage');
      }
    }
    
    // Cap probabilities
    seProbability = Math.max(5, Math.min(90, seProbability));
    nProbability = Math.max(5, Math.min(90, nProbability));
    
    // Determine primary wind type
    let primaryType = 'uncertain';
    let primaryProbability = 0;
    
    if (seProbability > nProbability + 10) {
      primaryType = 'SE Thermal';
      primaryProbability = seProbability;
    } else if (nProbability > seProbability + 10) {
      primaryType = 'North Flow';
      primaryProbability = nProbability;
    } else {
      primaryType = 'Either possible';
      primaryProbability = Math.max(seProbability, nProbability);
    }
    
    // Calculate expected speed and kite-ability
    const expectedSpeed = PATTERNS.seThermal.hourly[monthData.peakHour]?.avgSpeed || 13;
    const kiteability = getKiteability(expectedSpeed, primaryType);
    
    // Get start time and temperature from monthly patterns
    const startHour = monthData.startHour || 11;
    const avgHighTemp = monthData.avgHighTemp || 65;
    const avgLowTemp = monthData.avgLowTemp || 45;
    
    // Estimate temperature for the forecast day
    // For today, use current temp; for future days, use seasonal average
    let expectedHighTemp = avgHighTemp;
    let expectedLowTemp = avgLowTemp;
    
    if (day === 0 && currentTemp) {
      // Today - estimate high based on current temp and time of day
      const currentHour = now.getHours();
      if (currentHour < 12) {
        // Morning - high will be warmer
        expectedHighTemp = Math.max(currentTemp + 10, avgHighTemp);
      } else {
        // Afternoon - current temp is close to high
        expectedHighTemp = Math.max(currentTemp, avgHighTemp - 5);
      }
    }
    
    // North flow typically comes with cooler temps (frontal passage)
    const northFlowTempDrop = 10;
    
    forecasts.push({
      day,
      date: forecastDate.toISOString().slice(0, 10),
      dayName: day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
      seThermal: {
        probability: Math.round(seProbability),
        startHour,
        peakHour: monthData.peakHour || 14,
        expectedSpeed,
        expectedDirection: PATTERNS.seThermal.hourly[monthData.peakHour]?.avgDir || 150,
      },
      northFlow: {
        probability: Math.round(nProbability),
        expectedSpeed: 18, // North flow typically stronger
        // North flow can start anytime - often afternoon/evening with frontal passage
        startHour: 14,
      },
      temperature: {
        high: Math.round(expectedHighTemp),
        low: Math.round(expectedLowTemp),
        // If north flow likely, temps will be cooler
        northFlowHigh: Math.round(expectedHighTemp - northFlowTempDrop),
      },
      primary: {
        type: primaryType,
        probability: Math.round(primaryProbability),
      },
      kiteability,
      confidence,
      factors,
    });
  }
  
  return forecasts;
}

/**
 * Get the best upcoming days for wind
 */
export function getBestUpcomingDays(forecasts) {
  return forecasts
    .filter(f => f.primary.probability >= 40)
    .sort((a, b) => b.primary.probability - a.primary.probability)
    .slice(0, 3);
}

/**
 * Generate forecast summary message
 */
export function getForecastSummary(forecasts) {
  const bestDays = getBestUpcomingDays(forecasts);
  
  if (bestDays.length === 0) {
    return {
      headline: 'Light wind expected',
      message: 'No strong wind days in the 5-day forecast. Check back for updates.',
      bestDay: null,
    };
  }
  
  const best = bestDays[0];
  const isToday = best.day === 0;
  const isTomorrow = best.day === 1;
  
  let headline = '';
  if (isToday) {
    headline = `${best.primary.type} likely TODAY!`;
  } else if (isTomorrow) {
    headline = `${best.primary.type} expected TOMORROW`;
  } else {
    headline = `${best.primary.type} on ${best.dayName}`;
  }
  
  let message = '';
  if (best.primary.type === 'SE Thermal') {
    message = `${best.seThermal.probability}% chance of SE thermal. Expected peak around ${best.seThermal.peakHour}:00 with ${safeToFixed(best.seThermal.expectedSpeed, 0)} mph from ${best.seThermal.expectedDirection}°.`;
  } else if (best.primary.type === 'North Flow') {
    message = `${best.northFlow.probability}% chance of north flow. Watch for frontal passage.`;
  } else {
    message = `${best.primary.probability}% chance of good wind. Both thermal and north flow possible.`;
  }
  
  return {
    headline,
    message,
    bestDay: best,
    otherGoodDays: bestDays.slice(1),
  };
}

/**
 * Get confidence level description
 */
export function getConfidenceDescription(confidence) {
  switch (confidence) {
    case 'high':
      return 'High confidence - based on current conditions';
    case 'good':
      return 'Good confidence - evening patterns match historical';
    case 'moderate':
      return 'Moderate confidence - pressure trend analysis';
    case 'low':
    default:
      return 'Low confidence - extended forecast, monitor updates';
  }
}

/**
 * Determine if conditions favor SE thermal or North flow
 */
export function analyzeWindType(conditions) {
  const { pressure, pressureChange, temperature, pressureGradient } = conditions;
  
  const seScore = 0;
  const nScore = 0;
  const analysis = [];
  
  // Pressure change pattern
  // SE Thermal: pressure falls (avg -0.025)
  // North Flow: pressure rises (avg +0.031)
  if (pressureChange != null) {
    if (pressureChange < -0.02) {
      analysis.push({
        factor: 'Falling pressure',
        favors: 'SE Thermal',
        reason: 'Matches 46.8% of thermal days',
      });
    } else if (pressureChange > 0.02) {
      analysis.push({
        factor: 'Rising pressure',
        favors: 'North Flow',
        reason: 'Matches 48.5% of north flow days',
      });
    }
  }
  
  // Temperature pattern
  // SE Thermal day-before: 58.2°F
  // North Flow day-before: 46.9°F
  if (temperature != null) {
    if (temperature > 55) {
      analysis.push({
        factor: `Warm evening (${safeToFixed(temperature, 0)}°F)`,
        favors: 'SE Thermal',
        reason: 'Matches thermal day-before pattern (58.2°F avg)',
      });
    } else if (temperature < 50) {
      analysis.push({
        factor: `Cool evening (${safeToFixed(temperature, 0)}°F)`,
        favors: 'North Flow',
        reason: 'Matches north flow day-before pattern (46.9°F avg)',
      });
    }
  }
  
  // Pressure gradient
  if (pressureGradient != null) {
    if (pressureGradient < -1.0) {
      analysis.push({
        factor: 'Negative pressure gradient',
        favors: 'SE Thermal',
        reason: 'Provo higher than SLC = thermal setup',
      });
    } else if (pressureGradient > 1.0) {
      analysis.push({
        factor: 'Positive pressure gradient',
        favors: 'North Flow',
        reason: 'SLC higher than Provo = north flow',
      });
    }
  }
  
  return analysis;
}
