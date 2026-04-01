/**
 * Tactical Recommendation Engine
 * 
 * The "brain" that synthesizes weather, season, time of day, and entomology
 * into actionable fishing recommendations. This is the core intelligence
 * that makes the platform valuable.
 * 
 * Weather-to-Tactic Rules (based on established fly fishing entomology):
 *   - Overcast/drizzle in spring/fall → BWO (Blue Winged Olive) hatch
 *   - Clear, calm spring days → Dry flies and droppers
 *   - Sunny, calm summer → Dawn/dusk windows only, terrestrials
 *   - Hot summer midday → Fish thermal refugia (springs, deep pools)
 *   - Falling pressure → Aggressive feeding, streamers
 *   - Wind → Terrestrials (hoppers, ants, beetles)
 *   - Rain → Subsurface: worms, eggs, attractor nymphs
 */

// ─── Season Helpers ────────────────────────────────────────────

function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getSeasonLabel(season) {
  return {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
  }[season] || 'Unknown';
}

// ─── Sky Condition Parser ──────────────────────────────────────

export function parseSkyCondition(shortForecast) {
  if (!shortForecast) return 'clear';
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

export const SKY_LABELS = {
  clear: 'Clear skies',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  overcast: 'Overcast',
  drizzle: 'Drizzle / light rain',
  rain: 'Rain',
  storm: 'Thunderstorms',
};

// ─── Pressure Trend Analysis ───────────────────────────────────

export function analyzePressureTrend(currentPressure, pressureHistory = []) {
  if (!currentPressure) return { trend: 'unknown', rate: 0, label: 'No pressure data' };

  if (pressureHistory.length >= 2) {
    const oldest = pressureHistory[pressureHistory.length - 1];
    const newest = pressureHistory[0];
    const hoursDiff = (new Date(newest.time) - new Date(oldest.time)) / 3600000;
    if (hoursDiff > 0) {
      const ratePerHour = (newest.pressure - oldest.pressure) / hoursDiff;
      if (ratePerHour < -0.02) return { trend: 'falling_fast', rate: ratePerHour, label: 'Falling rapidly — fish feeding before storm!' };
      if (ratePerHour < -0.005) return { trend: 'falling', rate: ratePerHour, label: 'Slowly falling — excellent fishing!' };
      if (ratePerHour <= 0.005) return { trend: 'stable', rate: ratePerHour, label: 'Stable — consistent conditions' };
      if (ratePerHour <= 0.02) return { trend: 'rising', rate: ratePerHour, label: 'Rising — fish may slow down' };
      return { trend: 'rising_fast', rate: ratePerHour, label: 'Rising rapidly — tough fishing' };
    }
  }

  // Infer from absolute pressure
  if (currentPressure >= 29.8 && currentPressure <= 30.2) {
    return { trend: 'stable', rate: 0, label: 'Pressure in optimal range' };
  }
  if (currentPressure < 29.7) return { trend: 'falling', rate: -0.01, label: 'Low pressure — fish may be active' };
  return { trend: 'rising', rate: 0.01, label: 'High pressure — slow fishing likely' };
}

// ─── Water Temperature Inference ───────────────────────────────

export function inferWaterTemp(airTemp, month, elevation = 5000) {
  if (airTemp == null) return null;
  
  // Water temp lags air temp and is moderated by season
  const season = getSeason(month);
  const seasonalOffset = {
    winter: -5,   // Water warmer than cold air
    spring: -8,   // Water still cold from winter
    summer: -12,  // Water much cooler than hot air
    fall: -3,     // Water retains summer warmth
  }[season] || -8;
  
  // Elevation adjustment (colder at altitude)
  const elevationOffset = (elevation - 5000) / 1000 * -1.5;
  
  return Math.round(airTemp + seasonalOffset + elevationOffset);
}

// ─── Hatch Prediction ──────────────────────────────────────────

export function predictHatch(sky, month, airTemp, waterTemp = null) {
  const season = getSeason(month);
  const inferredWaterTemp = waterTemp || inferWaterTemp(airTemp, month);
  const isOvercast = ['overcast', 'cloudy', 'drizzle'].includes(sky);
  const isClear = ['clear', 'partly'].includes(sky);
  
  const hatches = [];
  
  // BWO (Blue Winged Olive) — spring/fall, overcast
  if ([3, 4, 5, 9, 10, 11].includes(month) && isOvercast) {
    hatches.push({
      insect: 'Blue Winged Olive (BWO)',
      likelihood: 90,
      peakTime: '1-4 PM',
      notes: 'Baetis love low light — overcast days trigger heavy emergence',
    });
  } else if ([3, 4, 5, 9, 10, 11].includes(month)) {
    hatches.push({
      insect: 'Blue Winged Olive (BWO)',
      likelihood: 40,
      peakTime: '1-4 PM',
      notes: 'BWO possible but less likely on clear days',
    });
  }
  
  // PMD (Pale Morning Dun) — late spring/early summer, clear to partly
  if ([5, 6, 7].includes(month) && isClear && inferredWaterTemp >= 50 && inferredWaterTemp <= 62) {
    hatches.push({
      insect: 'Pale Morning Dun (PMD)',
      likelihood: 75,
      peakTime: '10 AM - 2 PM',
      notes: 'PMDs emerge midday in riffles when water warms',
    });
  }
  
  // Caddis — late spring through summer, afternoon/evening
  if ([5, 6, 7, 8].includes(month)) {
    hatches.push({
      insect: 'Caddis',
      likelihood: isClear ? 70 : 50,
      peakTime: '4-8 PM',
      notes: month === 5 ? "Mother's Day caddis can be outstanding" : 'Active afternoon through dusk',
    });
  }
  
  // Stonefly — spring, freestone water
  if ([4, 5, 6].includes(month)) {
    hatches.push({
      insect: 'Stonefly',
      likelihood: 55,
      peakTime: 'Morning',
      notes: 'Golden stones in fast water, little black stones earlier in season',
    });
  }
  
  // Trico — late summer, early morning
  if ([7, 8, 9].includes(month) && isClear) {
    hatches.push({
      insect: 'Trico',
      likelihood: 65,
      peakTime: '7-10 AM',
      notes: 'Spinner falls at dawn — tiny flies, technical fishing',
    });
  }
  
  // Midges — year-round, especially winter/early spring
  if (inferredWaterTemp && inferredWaterTemp < 50) {
    hatches.push({
      insect: 'Midges',
      likelihood: 80,
      peakTime: 'Midday warmth',
      notes: 'Cold water = midges. Slow, technical fishing.',
    });
  }
  
  // Terrestrials — summer
  if ([6, 7, 8, 9].includes(month) && isClear) {
    hatches.push({
      insect: 'Terrestrials (hoppers, ants, beetles)',
      likelihood: 70,
      peakTime: '10 AM - 4 PM',
      notes: 'Fish tight to banks, let it sit',
    });
  }
  
  return hatches.sort((a, b) => b.likelihood - a.likelihood);
}

// ─── Fishery Type Detection ─────────────────────────────────────

/**
 * Determine fishery category based on coordinates and water type.
 * Categories: 'coldwater-trout', 'warmwater', 'tropical', 'saltwater'
 */
function determineFisheryCategory(lat, waterType, isSaltwater = false) {
  // Saltwater takes precedence
  if (isSaltwater || waterType === 'ocean') {
    return 'saltwater';
  }
  
  // Tropical: roughly between 23.5°N and 23.5°S (Tropics of Cancer/Capricorn)
  // Extended to ~30° for subtropical warmwater
  const absLat = Math.abs(lat);
  if (absLat < 23.5) {
    return 'tropical';
  }
  
  // Subtropical warmwater (southern US, Mediterranean, etc.)
  if (absLat < 35 && lat > 0) {
    // Northern hemisphere subtropical
    return 'warmwater';
  }
  if (absLat < 35 && lat < 0) {
    // Southern hemisphere subtropical
    return 'warmwater';
  }
  
  // Default: coldwater trout fishery (temperate zones)
  return 'coldwater-trout';
}

// ─── Tropical/Warmwater Tactical Summaries ──────────────────────

function generateTropicalSummary(sky, weather, hour) {
  const { windSpeed = 0, temperature, precipChance = 0 } = weather;
  const isOvercast = ['overcast', 'cloudy', 'drizzle'].includes(sky);
  const isClear = ['clear', 'partly'].includes(sky);
  const isRaining = ['rain', 'storm', 'drizzle'].includes(sky);
  const isWindy = windSpeed >= 10;
  const isCalm = windSpeed < 5;
  const isEarlyMorning = hour >= 5 && hour <= 8;
  const isEvening = hour >= 16 && hour <= 19;
  
  // Tropical rain = excellent feeding
  if (isRaining && precipChance > 40) {
    return {
      headline: 'Rain Triggers Feeding',
      tactic: 'Topwater poppers, large streamers — predators active in low light',
      reason: 'Tropical rain stirs up baitfish and triggers aggressive feeding. Work structure and current seams.',
      confidence: 85,
      conditions: ['rain', 'tropical'],
      timeWindow: 'During and after rain',
      category: 'topwater',
    };
  }
  
  // Overcast tropical = all-day action
  if (isOvercast) {
    return {
      headline: 'Prime Tropical Conditions',
      tactic: 'Streamers, poppers, and large flies — peacock bass, payara, and predators active',
      reason: 'Overcast skies reduce light penetration — predators hunt aggressively all day.',
      confidence: 80,
      conditions: ['overcast', 'tropical'],
      timeWindow: 'All day',
      category: 'streamer',
    };
  }
  
  // Clear + Early/Late = Best windows
  if (isClear && (isEarlyMorning || isEvening)) {
    return {
      headline: isEarlyMorning ? 'Dawn Bite' : 'Evening Bite',
      tactic: 'Topwater action — work structure, fallen trees, and current breaks',
      reason: 'Low light triggers surface feeding. Target ambush points and structure.',
      confidence: 85,
      conditions: ['clear', 'tropical', isEarlyMorning ? 'morning' : 'evening'],
      timeWindow: isEarlyMorning ? '5-8 AM' : '4-7 PM',
      category: 'topwater',
    };
  }
  
  // Clear + Midday = Go deep
  if (isClear && hour >= 10 && hour <= 15) {
    return {
      headline: 'Fish Deep Structure',
      tactic: 'Sink-tip lines, weighted streamers — target deep pools and shaded structure',
      reason: 'Bright tropical sun pushes fish to depth and shade. Work structure slowly.',
      confidence: 70,
      conditions: ['clear', 'tropical', 'midday'],
      timeWindow: 'Wait for evening',
      category: 'subsurface',
    };
  }
  
  // Default tropical
  return {
    headline: 'Tropical Fishing',
    tactic: 'Streamers and poppers — target structure, current breaks, and baitfish schools',
    reason: 'Tropical waters hold aggressive predators. Match local baitfish size and color.',
    confidence: 65,
    conditions: ['tropical'],
    timeWindow: 'Dawn/dusk best',
    category: 'streamer',
  };
}

function generateWarmwaterSummary(sky, month, weather, hour) {
  const season = getSeason(month);
  const { windSpeed = 0, temperature, precipChance = 0 } = weather;
  const pressureTrend = weather.pressureTrend || analyzePressureTrend(weather.pressure);
  const isOvercast = ['overcast', 'cloudy', 'drizzle'].includes(sky);
  const isClear = ['clear', 'partly'].includes(sky);
  const isWindy = windSpeed >= 10;
  const isFalling = pressureTrend.trend === 'falling' || pressureTrend.trend === 'falling_fast';
  const isEarlyMorning = hour >= 5 && hour <= 8;
  const isEvening = hour >= 17 && hour <= 20;
  
  // Falling pressure = bass go crazy
  if (isFalling) {
    return {
      headline: 'Pre-Front Feeding Frenzy',
      tactic: 'Topwater, spinnerbaits, chatterbaits — bass feeding aggressively before weather change',
      reason: 'Falling barometer triggers aggressive feeding. Cover water quickly with reaction baits.',
      confidence: 90,
      conditions: ['falling-pressure', 'warmwater'],
      timeWindow: 'Now — before front arrives',
      category: 'reaction',
    };
  }
  
  // Spring spawn
  if (season === 'spring' && temperature >= 55 && temperature <= 75) {
    return {
      headline: 'Spawn Season',
      tactic: 'Sight fish beds with soft plastics — wacky rig, ned rig, or creature baits',
      reason: 'Bass are bedding. Look for light-colored circles in shallows. Fish slow and precise.',
      confidence: 85,
      conditions: ['spring', 'warmwater', 'spawn'],
      timeWindow: 'Midday (best visibility)',
      category: 'finesse',
    };
  }
  
  // Summer + Early/Late
  if (season === 'summer' && (isEarlyMorning || isEvening)) {
    return {
      headline: isEarlyMorning ? 'Topwater Morning' : 'Evening Topwater',
      tactic: 'Buzzbaits, poppers, walking baits — work shallow cover and points',
      reason: 'Low light brings bass shallow. Target docks, laydowns, and grass edges.',
      confidence: 85,
      conditions: ['summer', 'warmwater', isEarlyMorning ? 'morning' : 'evening'],
      timeWindow: isEarlyMorning ? '5-8 AM' : '6-8 PM',
      category: 'topwater',
    };
  }
  
  // Summer midday = go deep
  if (season === 'summer' && hour >= 10 && hour <= 16) {
    return {
      headline: 'Deep Summer Pattern',
      tactic: 'Deep cranks, Carolina rigs, drop shots — target offshore structure and ledges',
      reason: 'Hot sun pushes bass to thermocline depth. Find the 15-25ft zone with structure.',
      confidence: 75,
      conditions: ['summer', 'warmwater', 'midday'],
      timeWindow: 'Fish deep until evening',
      category: 'deep',
    };
  }
  
  // Windy = spinnerbait time
  if (isWindy) {
    return {
      headline: 'Wind = Spinnerbait',
      tactic: 'Spinnerbaits, chatterbaits on windblown banks — bass ambush disoriented baitfish',
      reason: `${windSpeed} mph wind creating current and pushing bait. Target windward shorelines.`,
      confidence: 80,
      conditions: ['windy', 'warmwater'],
      timeWindow: 'All day',
      category: 'reaction',
    };
  }
  
  // Default warmwater
  return {
    headline: 'Bass Fishing',
    tactic: 'Match the conditions — topwater low light, finesse when tough, reaction baits to cover water',
    reason: 'Warmwater bass respond to weather changes. Adjust presentation to conditions.',
    confidence: 65,
    conditions: ['warmwater'],
    timeWindow: 'Dawn/dusk best',
    category: 'versatile',
  };
}

function generateSaltwaterSummary(sky, month, weather, hour) {
  const { windSpeed = 0, temperature, precipChance = 0 } = weather;
  const pressureTrend = weather.pressureTrend || analyzePressureTrend(weather.pressure);
  const isOvercast = ['overcast', 'cloudy', 'drizzle'].includes(sky);
  const isClear = ['clear', 'partly'].includes(sky);
  const isWindy = windSpeed >= 15;
  const isFalling = pressureTrend.trend === 'falling' || pressureTrend.trend === 'falling_fast';
  const isEarlyMorning = hour >= 5 && hour <= 8;
  const isEvening = hour >= 17 && hour <= 20;
  
  // Falling pressure = fish feed before storm
  if (isFalling) {
    return {
      headline: 'Pre-Storm Bite',
      tactic: 'Fast-moving lures, topwater — gamefish feeding aggressively before weather',
      reason: 'Falling pressure triggers feeding response. Work structure and bait schools.',
      confidence: 85,
      conditions: ['falling-pressure', 'saltwater'],
      timeWindow: 'Now — before front',
      category: 'aggressive',
    };
  }
  
  // Overcast = all-day flats fishing
  if (isOvercast) {
    return {
      headline: 'Flats Fishing',
      tactic: 'Sight fish the flats — redfish, bonefish, permit cruising in low light',
      reason: 'Overcast reduces glare — excellent visibility for sight fishing shallow flats.',
      confidence: 80,
      conditions: ['overcast', 'saltwater'],
      timeWindow: 'All day',
      category: 'sight-fishing',
    };
  }
  
  // Clear + Early/Late = prime time
  if (isClear && (isEarlyMorning || isEvening)) {
    return {
      headline: isEarlyMorning ? 'Dawn Patrol' : 'Evening Feed',
      tactic: 'Topwater, baitfish patterns — target structure, grass edges, and current',
      reason: 'Low light triggers baitfish movement and predator feeding. Work the transitions.',
      confidence: 85,
      conditions: ['clear', 'saltwater', isEarlyMorning ? 'morning' : 'evening'],
      timeWindow: isEarlyMorning ? '5-8 AM' : '5-7 PM',
      category: 'topwater',
    };
  }
  
  // Windy = tough conditions
  if (isWindy) {
    return {
      headline: 'Wind Advisory',
      tactic: 'Fish protected water — lee shorelines, mangroves, docks, and channels',
      reason: `${windSpeed} mph wind makes open water difficult. Target wind-protected structure.`,
      confidence: 70,
      conditions: ['windy', 'saltwater'],
      timeWindow: 'Protected areas only',
      category: 'structure',
    };
  }
  
  // Default saltwater
  return {
    headline: 'Saltwater Fishing',
    tactic: 'Match the tide and bait — fish moving water and structure transitions',
    reason: 'Tides drive saltwater fishing. Fish the first and last hours of tide movement.',
    confidence: 65,
    conditions: ['saltwater'],
    timeWindow: 'Tide dependent',
    category: 'versatile',
  };
}

// ─── Tactical Summary Generator ────────────────────────────────

export function generateTacticalSummary(sky, month, weather, waterType, hour = new Date().getHours(), options = {}) {
  const { lat = 40, isSaltwater = false } = options;
  
  // Determine fishery category based on location
  const fisheryCategory = determineFisheryCategory(lat, waterType, isSaltwater);
  
  // Route to appropriate tactical generator
  if (fisheryCategory === 'tropical') {
    return generateTropicalSummary(sky, weather, hour);
  }
  if (fisheryCategory === 'warmwater') {
    return generateWarmwaterSummary(sky, month, weather, hour);
  }
  if (fisheryCategory === 'saltwater') {
    return generateSaltwaterSummary(sky, month, weather, hour);
  }
  
  // ─── Coldwater Trout Rules (Original Logic) ───────────────────
  
  const season = getSeason(month);
  const { windSpeed = 0, temperature, pressure, precipChance = 0 } = weather;
  const pressureTrend = weather.pressureTrend || analyzePressureTrend(pressure);
  const isOvercast = ['overcast', 'cloudy', 'drizzle'].includes(sky);
  const isClear = ['clear', 'partly'].includes(sky);
  const isRaining = ['rain', 'storm', 'drizzle'].includes(sky);
  const isWindy = windSpeed >= 10;
  const isCalm = windSpeed < 5;
  const isFalling = pressureTrend.trend === 'falling' || pressureTrend.trend === 'falling_fast';
  const isRising = pressureTrend.trend === 'rising' || pressureTrend.trend === 'rising_fast';
  
  // ─── Spring Rules ────────────────────────────────────────────
  
  // Spring + Overcast + Light Rain = BWO Hatch
  if (season === 'spring' && isOvercast && precipChance > 20) {
    return {
      headline: 'BWO Hatch Likely',
      tactic: 'Dry flies and droppers — Parachute BWO #18-20 with RS2 dropper',
      reason: 'Cloudy spring conditions with chance of rain trigger Blue Winged Olive emergence. Baetis love low light.',
      confidence: 90,
      conditions: ['overcast', 'spring', 'precipitation'],
      timeWindow: '1-4 PM peak',
      category: 'dry-fly',
    };
  }
  
  // Spring + Overcast (no rain) = BWO still likely
  if (season === 'spring' && isOvercast) {
    return {
      headline: 'BWO Conditions',
      tactic: 'Dry flies and droppers — Parachute BWO #18-20, trail RS2 emerger',
      reason: 'Overcast spring day — ideal for Blue Winged Olive hatch. Fish the seams and tailouts.',
      confidence: 80,
      conditions: ['overcast', 'spring'],
      timeWindow: '1-4 PM peak',
      category: 'dry-fly',
    };
  }
  
  // Spring + Sunny + Calm = Dry/Dropper
  if (season === 'spring' && isClear && isCalm) {
    return {
      headline: 'Dry Fly Conditions',
      tactic: 'Dry flies and droppers — Parachute Adams #14-16 with Pheasant Tail dropper',
      reason: 'Clear, calm spring day — fish will be looking up. Work the riffles and runs.',
      confidence: 75,
      conditions: ['clear', 'spring', 'calm'],
      timeWindow: 'Midday best',
      category: 'dry-dropper',
    };
  }
  
  // ─── Summer Rules ────────────────────────────────────────────
  
  // Summer + Hot + Midday = Thermal Refugia
  if (season === 'summer' && temperature > 75 && hour >= 11 && hour <= 16) {
    return {
      headline: 'Fish Are Stressed',
      tactic: 'Target spring-fed tributaries, deep pools, and shaded undercuts. Nymph deep.',
      reason: 'Water temp likely above 65°F — trout seeking thermal refugia. Consider catch-and-release only.',
      confidence: 85,
      conditions: ['summer', 'hot', 'midday'],
      timeWindow: 'Dawn/dusk only',
      category: 'nymph',
    };
  }
  
  // Summer + Sunny + Calm = Early/Late Windows
  if (season === 'summer' && isClear && isCalm) {
    return {
      headline: 'Dawn/Dusk Windows',
      tactic: 'Terrestrials (hoppers, ants) early AM, nymphs midday, caddis evening',
      reason: 'Bright summer sun pushes fish to shade and depth — fish the edges and transitions.',
      confidence: 80,
      conditions: ['summer', 'clear', 'calm'],
      timeWindow: hour < 9 ? 'Good window NOW' : hour > 17 ? 'Evening hatch coming' : 'Wait for evening',
      category: 'terrestrial',
    };
  }
  
  // Summer + Wind = Terrestrials
  if (season === 'summer' && isWindy) {
    return {
      headline: 'Hopper Time',
      tactic: 'Hoppers, ants, beetles — wind blows terrestrials into the water',
      reason: `${windSpeed} mph wind pushing insects off banks. Fish tight to windward shores.`,
      confidence: 85,
      conditions: ['summer', 'windy'],
      timeWindow: 'All day',
      category: 'terrestrial',
    };
  }
  
  // ─── Fall Rules ──────────────────────────────────────────────
  
  // Fall + Falling Pressure = Streamer Time
  if (season === 'fall' && isFalling) {
    return {
      headline: 'Aggressive Feeding Window',
      tactic: 'Streamers — Woolly Bugger, Sculpins, articulated patterns. Strip aggressively.',
      reason: 'Falling barometer triggers pre-spawn brown trout aggression. Big fish are on the move.',
      confidence: 90,
      conditions: ['fall', 'falling-pressure'],
      timeWindow: 'All day — go now!',
      category: 'streamer',
    };
  }
  
  // Fall + Overcast = BWO (fall hatch)
  if (season === 'fall' && isOvercast) {
    return {
      headline: 'Fall BWO Hatch',
      tactic: 'BWO dries and emergers — RS2, Sparkle Dun, Parachute BWO #18-22',
      reason: 'Fall Baetis hatch triggered by overcast conditions. Some of the best dry fly fishing of the year.',
      confidence: 85,
      conditions: ['fall', 'overcast'],
      timeWindow: '1-4 PM',
      category: 'dry-fly',
    };
  }
  
  // Fall + Clear = Streamer/Nymph combo
  if (season === 'fall' && isClear) {
    return {
      headline: 'Pre-Spawn Activity',
      tactic: 'Streamers in AM, egg patterns and nymphs midday. Browns are aggressive.',
      reason: 'Clear fall day — brown trout staging for spawn. Target deep runs and undercut banks.',
      confidence: 75,
      conditions: ['fall', 'clear'],
      timeWindow: 'Early morning best',
      category: 'streamer',
    };
  }
  
  // ─── Winter Rules ────────────────────────────────────────────
  
  // Winter = Midges and slow nymphing
  if (season === 'winter') {
    return {
      headline: 'Midge Season',
      tactic: 'Zebra Midge, Thread Midge, RS2 — slow, deep nymphing. 6X-7X tippet.',
      reason: 'Cold water = midges only. Fish are lethargic. Slow down and fish deep.',
      confidence: 70,
      conditions: ['winter'],
      timeWindow: 'Midday warmth (11 AM - 3 PM)',
      category: 'nymph',
    };
  }
  
  // ─── Weather-Driven Rules (any season) ───────────────────────
  
  // Rain = Subsurface
  if (isRaining) {
    return {
      headline: 'Go Subsurface',
      tactic: 'San Juan Worm, egg patterns, attractor nymphs. Fish are keyed on washed-in food.',
      reason: 'Rain washes worms and debris into the water. Fish are feeding aggressively subsurface.',
      confidence: 80,
      conditions: ['rain'],
      timeWindow: 'During and after rain',
      category: 'nymph',
    };
  }
  
  // Falling pressure (any season)
  if (isFalling && !isRaining) {
    return {
      headline: 'Feeding Window',
      tactic: 'Streamers and attractor patterns — fish sense the pressure drop and feed aggressively.',
      reason: 'Falling barometer triggers feeding response. Go big and cover water.',
      confidence: 80,
      conditions: ['falling-pressure'],
      timeWindow: 'Next few hours',
      category: 'streamer',
    };
  }
  
  // Rising pressure = tough fishing
  if (isRising) {
    return {
      headline: 'Tough Conditions',
      tactic: 'Downsize and slow down. Small nymphs, long leaders, finesse presentation.',
      reason: 'Rising pressure often means lockjaw. Fish are less active. Patience required.',
      confidence: 60,
      conditions: ['rising-pressure'],
      timeWindow: 'Best at transitions',
      category: 'nymph',
    };
  }
  
  // ─── Default ─────────────────────────────────────────────────
  
  return {
    headline: 'Standard Conditions',
    tactic: 'Match the hatch — observe what insects are active and match size/color.',
    reason: `${getSeasonLabel(season)} ${SKY_LABELS[sky] || sky}. Adapt to what you see on the water.`,
    confidence: 50,
    conditions: [season, sky],
    timeWindow: 'Varies',
    category: 'general',
  };
}

// ─── Main Tactical Briefing Generator ──────────────────────────

export async function generateTacticalBriefing(coords, waterName, waterType, weatherData = {}, hourlyForecast = []) {
  const { lat, lng } = coords;
  const now = new Date();
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  
  // Parse weather data
  const weather = {
    windSpeed: weatherData.windSpeed ?? weatherData.wind_speed ?? 0,
    windDirection: weatherData.windDirection ?? weatherData.wind_direction,
    windGust: weatherData.windGust ?? weatherData.wind_gust,
    temperature: weatherData.temperature ?? weatherData.temp,
    humidity: weatherData.humidity,
    pressure: weatherData.pressure,
    cloudCover: weatherData.cloudCover ?? weatherData.cloud_cover,
    precipChance: weatherData.precipChance ?? weatherData.precip_chance ?? 0,
    shortForecast: weatherData.shortForecast ?? weatherData.short_forecast,
    pressureTrend: weatherData.pressureTrend,
  };
  
  // Parse sky condition
  const sky = weatherData.sky || parseSkyCondition(weather.shortForecast);
  
  // Infer water temperature
  const waterTemp = weatherData.waterTemp || inferWaterTemp(weather.temperature, month);
  
  // Generate tactical summary
  const tacticalSummary = generateTacticalSummary(sky, month, weather, waterType, hour);
  
  // Predict hatches
  const hatchPrediction = predictHatch(sky, month, weather.temperature, waterTemp);
  
  // Analyze pressure trend
  const pressureTrend = weather.pressureTrend || analyzePressureTrend(weather.pressure);
  
  // Calculate fishing quality score (0-100)
  const fishingQuality = calculateFishingQuality(weather, sky, month, hour, pressureTrend);
  
  // Process hourly forecast for timeline
  const forecastTimeline = hourlyForecast.slice(0, 12).map(h => ({
    time: h.startTime || h.time,
    windSpeed: h.windSpeed ?? h.wind_speed,
    windDirection: h.windDirection ?? h.wind_direction,
    temperature: h.temperature ?? h.temp,
    cloudCover: h.cloudCover ?? h.cloud_cover,
    precipChance: h.precipChance ?? h.precip_chance,
    sky: h.sky || parseSkyCondition(h.shortForecast),
    shortForecast: h.shortForecast,
  }));
  
  return {
    waterName,
    waterType,
    coords: { lat, lng },
    timestamp: now.toISOString(),
    season: getSeason(month),
    seasonLabel: getSeasonLabel(getSeason(month)),
    
    // Current conditions
    weather: {
      ...weather,
      sky,
      skyLabel: SKY_LABELS[sky] || sky,
    },
    waterTemp,
    pressureTrend,
    
    // Intelligence
    tacticalSummary,
    hatchPrediction,
    fishingQuality,
    
    // Forecast
    forecastTimeline,
  };
}

// ─── Fishing Quality Score ─────────────────────────────────────

function calculateFishingQuality(weather, sky, month, hour, pressureTrend) {
  let score = 50; // Base score
  
  // Wind impact
  const windSpeed = weather.windSpeed || 0;
  if (windSpeed >= 3 && windSpeed <= 8) score += 15;      // Light wind is ideal
  else if (windSpeed < 3) score += 10;                     // Calm is good
  else if (windSpeed <= 12) score += 5;                    // Moderate wind
  else if (windSpeed <= 18) score -= 5;                    // Getting tough
  else score -= 15;                                        // Too windy
  
  // Pressure trend
  if (pressureTrend.trend === 'falling') score += 15;
  else if (pressureTrend.trend === 'falling_fast') score += 10;
  else if (pressureTrend.trend === 'stable') score += 8;
  else if (pressureTrend.trend === 'rising') score -= 5;
  else if (pressureTrend.trend === 'rising_fast') score -= 10;
  
  // Sky conditions
  if (sky === 'overcast' || sky === 'cloudy') score += 10;  // Fish feel safe
  else if (sky === 'drizzle') score += 8;                   // BWO conditions
  else if (sky === 'partly') score += 5;                    // Decent
  else if (sky === 'clear') score += 0;                     // Neutral
  else if (sky === 'rain') score += 5;                      // Subsurface fishing
  else if (sky === 'storm') score -= 10;                    // Dangerous
  
  // Time of day (fishing is best at transitions)
  if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    score += 10; // Dawn/dusk
  } else if (hour >= 10 && hour <= 16) {
    score += 0;  // Midday (neutral in most seasons)
  } else {
    score -= 5;  // Night
  }
  
  // Seasonal adjustment
  const season = getSeason(month);
  if (season === 'spring' || season === 'fall') score += 5;  // Prime seasons
  else if (season === 'winter') score -= 10;                  // Tough fishing
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// ─── Exports ───────────────────────────────────────────────────

export default {
  generateTacticalBriefing,
  generateTacticalSummary,
  predictHatch,
  parseSkyCondition,
  analyzePressureTrend,
  inferWaterTemp,
  calculateFishingQuality,
  getSeason,
  getSeasonLabel,
  SKY_LABELS,
};
