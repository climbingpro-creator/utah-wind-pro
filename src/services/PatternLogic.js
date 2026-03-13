/**
 * PATTERN LOGIC — 7-Day Trend Detection
 * 
 * Scans the NWS 7-day forecast for temperature "Cliffs" and "Climbs"
 * that predict wind events 1-3 days ahead.
 * 
 * Key patterns:
 *   NORTH_CLIFF:  8°F+ day-over-day temp drop → cold front / north push
 *   SOUTH_CLIMB:  8°F+ day-over-day temp rise → south surge / thermal boost
 *   PRE_FRONTAL:  Day BEFORE a cliff = often the best wind day (warm surge before switch)
 * 
 * Uses TREND_RULES from mesoRegistry.json for thresholds.
 */

import registry from '../config/mesoRegistry.json';

const RULES = registry.TREND_RULES;

/**
 * Analyze a 7-day NWS forecast for temperature trend patterns.
 * Input: array of NWS periods from get7DayForecast()
 * Output: same array with trendPattern and windOutlook added to each day
 */
export function analyzeDailyTrends(forecastPeriods) {
  if (!forecastPeriods || forecastPeriods.length < 2) return forecastPeriods || [];

  // Extract daytime-only periods (NWS alternates day/night)
  const daytimePeriods = forecastPeriods.filter(p => p.isDaytime);
  if (daytimePeriods.length < 2) return forecastPeriods;

  // Build a lookup of day name → max temp
  const dayTemps = new Map();
  for (const period of daytimePeriods) {
    dayTemps.set(period.name, period.temperature);
  }

  // Annotate each period with trend data
  return forecastPeriods.map((period, index) => {
    if (!period.isDaytime) {
      return { ...period, trendPattern: null };
    }

    // Find the previous daytime period
    const prevDaytime = daytimePeriods[daytimePeriods.indexOf(period) - 1];
    if (!prevDaytime) {
      return { ...period, trendPattern: null };
    }

    const tempDelta = period.temperature - prevDaytime.temperature;
    let trendPattern = null;
    let windOutlook = null;

    // Check for NORTH CLIFF (big temp drop)
    if (tempDelta <= -RULES.NORTH_CLIFF.temp_drop_dod) {
      trendPattern = {
        type: 'NORTH_CLIFF',
        label: RULES.NORTH_CLIFF.label,
        icon: '🌬️',
        confidence: RULES.NORTH_CLIFF.confidence,
        tempDelta,
        expectedWind: RULES.NORTH_CLIFF.wind_dir,
        severity: 'high',
      };
      windOutlook = `${Math.abs(tempDelta)}°F drop from ${prevDaytime.name} → strong NW wind likely`;
    } else if (tempDelta <= -RULES.MODERATE_DROP.temp_drop_dod) {
      trendPattern = {
        type: 'MODERATE_DROP',
        label: RULES.MODERATE_DROP.label,
        icon: '🌤️',
        confidence: RULES.MODERATE_DROP.confidence,
        tempDelta,
        expectedWind: RULES.MODERATE_DROP.wind_dir,
        severity: 'medium',
      };
      windOutlook = `${Math.abs(tempDelta)}°F drop → wind shift to N/NW likely`;
    }

    // Check for SOUTH CLIMB (big temp rise)
    if (tempDelta >= RULES.SOUTH_CLIMB.temp_rise_dod) {
      trendPattern = {
        type: 'SOUTH_CLIMB',
        label: RULES.SOUTH_CLIMB.label,
        icon: '🔥',
        confidence: RULES.SOUTH_CLIMB.confidence,
        tempDelta,
        expectedWind: RULES.SOUTH_CLIMB.wind_dir,
        severity: 'high',
      };
      windOutlook = `${tempDelta}°F rise from ${prevDaytime.name} → strong south surge / thermals`;
    } else if (tempDelta >= RULES.MODERATE_RISE.temp_rise_dod) {
      trendPattern = {
        type: 'MODERATE_RISE',
        label: RULES.MODERATE_RISE.label,
        icon: '☀️',
        confidence: RULES.MODERATE_RISE.confidence,
        tempDelta,
        expectedWind: RULES.MODERATE_RISE.wind_dir,
        severity: 'medium',
      };
      windOutlook = `${tempDelta}°F rise → thermals strengthening`;
    }

    return { ...period, trendPattern, windOutlook };
  });
}

/**
 * Detect PRE-FRONTAL days — the day BEFORE a North Cliff.
 * These are often the best wind days: warm, strong south/SW before the switch.
 */
export function findPreFrontalDays(annotatedPeriods) {
  if (!annotatedPeriods) return [];

  const daytime = annotatedPeriods.filter(p => p.isDaytime);
  const preFrontalDays = [];

  for (let i = 0; i < daytime.length - 1; i++) {
    const nextDay = daytime[i + 1];
    if (nextDay.trendPattern?.type === 'NORTH_CLIFF') {
      preFrontalDays.push({
        day: daytime[i],
        label: 'Pre-Frontal Spike',
        icon: '⚡',
        description: RULES.NORTH_CLIFF.prefrontal_boost?.typical_wind
          || 'Strong S/SW before switch to NW',
        confidence: 'High',
        nextDayDrop: nextDay.trendPattern.tempDelta,
      });
    }
  }

  return preFrontalDays;
}

/**
 * Get a quick summary of the week's wind outlook based on temp trends.
 */
export function getWeekOutlook(annotatedPeriods) {
  if (!annotatedPeriods) return null;

  const daytime = annotatedPeriods.filter(p => p.isDaytime && p.trendPattern);
  const preFrontal = findPreFrontalDays(annotatedPeriods);

  const cliffs = daytime.filter(d => d.trendPattern.type === 'NORTH_CLIFF');
  const climbs = daytime.filter(d => d.trendPattern.type === 'SOUTH_CLIMB');

  let bestWindDay = null;
  if (preFrontal.length > 0) {
    bestWindDay = {
      day: preFrontal[0].day.name,
      reason: 'Pre-frontal surge (best thermals before cold front)',
    };
  } else if (climbs.length > 0) {
    bestWindDay = {
      day: climbs[0].name,
      reason: 'Strong south surge day',
    };
  }

  return {
    totalPatterns: daytime.length,
    cliffs: cliffs.length,
    climbs: climbs.length,
    preFrontalDays: preFrontal,
    bestWindDay,
    summary: cliffs.length > 0
      ? `${cliffs.length} frontal passage${cliffs.length > 1 ? 's' : ''} this week — watch for pre-frontal wind`
      : climbs.length > 0
        ? `Warming trend — thermals building through the week`
        : 'Stable pattern — typical daily thermal cycle expected',
  };
}
