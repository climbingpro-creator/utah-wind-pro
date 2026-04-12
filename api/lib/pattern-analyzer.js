/**
 * Personal Pattern Analysis Engine
 *
 * Analyzes a user's catch history to identify correlations between
 * catches and weather/environmental conditions.
 *
 * Requires minimum 10 catches to generate meaningful patterns.
 */

const MIN_CATCHES = 10;
const MIN_SPECIES_CATCHES = 5;

export function analyzePatterns(catches) {
  if (!catches || catches.length < MIN_CATCHES) {
    return {
      ready: false,
      catchCount: catches?.length || 0,
      needed: MIN_CATCHES - (catches?.length || 0),
      patterns: [],
      speciesBreakdown: [],
    };
  }

  const patterns = [];
  const speciesGroups = groupBy(catches, 'species');

  // Overall stats
  patterns.push(...analyzeConditionCorrelations(catches, 'Overall'));

  // Per-species analysis
  const speciesBreakdown = [];
  for (const [species, speciesCatches] of Object.entries(speciesGroups)) {
    if (!species || speciesCatches.length < MIN_SPECIES_CATCHES) continue;

    speciesBreakdown.push({
      species,
      count: speciesCatches.length,
      patterns: analyzeConditionCorrelations(speciesCatches, species),
    });
  }

  // Time-of-day patterns
  const hourBuckets = { morning: 0, midday: 0, afternoon: 0, evening: 0 };
  for (const c of catches) {
    const hour = new Date(c.caught_at).getHours();
    if (hour >= 5 && hour < 10) hourBuckets.morning++;
    else if (hour >= 10 && hour < 14) hourBuckets.midday++;
    else if (hour >= 14 && hour < 18) hourBuckets.afternoon++;
    else hourBuckets.evening++;
  }

  const bestTime = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  if (bestTime[1] > catches.length * 0.4) {
    patterns.push({
      type: 'time',
      confidence: Math.round((bestTime[1] / catches.length) * 100),
      insight: `${Math.round((bestTime[1] / catches.length) * 100)}% of your catches happen during ${bestTime[0]} hours`,
    });
  }

  // Moon phase correlations
  const moonGroups = groupBy(catches.filter(c => c.moon_phase), 'moon_phase');
  const moonWithCatches = Object.entries(moonGroups).sort((a, b) => b[1].length - a[1].length);
  if (moonWithCatches.length > 0 && moonWithCatches[0][1].length > catches.length * 0.3) {
    const best = moonWithCatches[0];
    patterns.push({
      type: 'moon',
      confidence: Math.round((best[1].length / catches.length) * 100),
      insight: `You catch more fish during ${best[0].replace(/-/g, ' ')} phases (${best[1].length}/${catches.length} catches)`,
    });
  }

  // Location analysis
  const locGroups = groupBy(catches, 'location_id');
  const topLocations = Object.entries(locGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([locId, lCatches]) => ({
      locationId: locId,
      name: humanName(locId),
      count: lCatches.length,
      percentage: Math.round((lCatches.length / catches.length) * 100),
    }));

  return {
    ready: true,
    catchCount: catches.length,
    needed: 0,
    patterns: patterns.sort((a, b) => b.confidence - a.confidence),
    speciesBreakdown,
    topLocations,
    hourDistribution: hourBuckets,
  };
}

function analyzeConditionCorrelations(catches, label) {
  const patterns = [];

  // Wind direction correlation
  const withWind = catches.filter(c => c.wind_direction != null);
  if (withWind.length >= MIN_SPECIES_CATCHES) {
    const dirBuckets = {};
    for (const c of withWind) {
      const dir = compassDir(c.wind_direction);
      dirBuckets[dir] = (dirBuckets[dir] || 0) + 1;
    }
    const bestDir = Object.entries(dirBuckets).sort((a, b) => b[1] - a[1])[0];
    if (bestDir && bestDir[1] > withWind.length * 0.35) {
      patterns.push({
        type: 'wind_direction',
        confidence: Math.round((bestDir[1] / withWind.length) * 100),
        insight: `${label}: ${Math.round((bestDir[1] / withWind.length) * 100)}% of catches when wind is from the ${bestDir[0]}`,
      });
    }
  }

  // Wind speed correlation
  const withSpeed = catches.filter(c => c.wind_speed != null);
  if (withSpeed.length >= MIN_SPECIES_CATCHES) {
    const speeds = withSpeed.map(c => c.wind_speed);
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const calm = speeds.filter(s => s < 5).length;
    const moderate = speeds.filter(s => s >= 5 && s <= 15).length;
    const windy = speeds.filter(s => s > 15).length;
    const best = [
      ['calm (< 5 mph)', calm],
      ['moderate (5-15 mph)', moderate],
      ['windy (> 15 mph)', windy],
    ].sort((a, b) => b[1] - a[1])[0];

    if (best[1] > withSpeed.length * 0.4) {
      patterns.push({
        type: 'wind_speed',
        confidence: Math.round((best[1] / withSpeed.length) * 100),
        insight: `${label}: Best fishing in ${best[0]} conditions (avg ${Math.round(avg)} mph)`,
      });
    }
  }

  // Pressure trend
  const withPressure = catches.filter(c => c.pressure_trend);
  if (withPressure.length >= MIN_SPECIES_CATCHES) {
    const trendCounts = groupBy(withPressure, 'pressure_trend');
    const bestTrend = Object.entries(trendCounts).sort((a, b) => b[1].length - a[1].length)[0];
    if (bestTrend && bestTrend[1].length > withPressure.length * 0.4) {
      patterns.push({
        type: 'pressure',
        confidence: Math.round((bestTrend[1].length / withPressure.length) * 100),
        insight: `${label}: ${Math.round((bestTrend[1].length / withPressure.length) * 100)}% of catches during ${bestTrend[0]} pressure`,
      });
    }
  }

  // Temperature sweet spot
  const withTemp = catches.filter(c => c.air_temp != null);
  if (withTemp.length >= MIN_SPECIES_CATCHES) {
    const temps = withTemp.map(c => c.air_temp);
    const avg = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    patterns.push({
      type: 'temperature',
      confidence: 60,
      insight: `${label}: Sweet spot is ${min}°F - ${max}°F (avg ${avg}°F)`,
    });
  }

  return patterns;
}

function groupBy(arr, key) {
  const groups = {};
  for (const item of arr) {
    const val = item[key] || 'unknown';
    if (!groups[val]) groups[val] = [];
    groups[val].push(item);
  }
  return groups;
}

function compassDir(degrees) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(degrees / 22.5) % 16];
}

function humanName(locId) {
  return (locId || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
