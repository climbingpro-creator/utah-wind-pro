/**
 * Utah Weather Vernacular Engine
 *
 * Replaces generic weather labels with phrases Utah anglers
 * actually use on the water. Three primary triggers:
 *
 *   1. "Afternoon Thermal Pull"  – Utah Lake / Deer Creek, afternoon, rising temps
 *   2. "Canyon Winds Expected"   – Wasatch Front locations, sharp easterly pressure gradient
 *   3. "Pre-Frontal Bite"        – Sharp barometric drop within 4 hours (any location)
 */

const THERMAL_LAKES = new Set([
  'utah-lake', 'utah-lake-lincoln', 'utah-lake-zigzag', 'utah-lake-vineyard',
  'utah-lake-sandy', 'utah-lake-mm19',
  'deer-creek',
]);

const WASATCH_FRONT_LOCATIONS = new Set([
  'utah-lake', 'utah-lake-lincoln', 'utah-lake-zigzag', 'utah-lake-vineyard',
  'utah-lake-sandy', 'utah-lake-mm19',
  'deer-creek', 'jordanelle',
  'provo-river', 'provo-lower', 'provo-middle', 'provo-upper', 'middle-provo', 'lower-provo',
  'willard-bay', 'pineview',
  'east-canyon', 'echo', 'rockport',
]);

const CANYON_MOUTH_LOCATIONS = new Set([
  'deer-creek', 'provo-river', 'provo-lower', 'provo-middle', 'provo-upper', 'middle-provo', 'lower-provo',
  'utah-lake', 'utah-lake-lincoln', 'utah-lake-zigzag', 'utah-lake-vineyard',
  'utah-lake-sandy', 'utah-lake-mm19',
  'jordanelle', 'east-canyon',
]);

/**
 * Detect "Afternoon Thermal Pull"
 * Condition: Location is Utah Lake or Deer Creek zone, time is afternoon (12–19),
 * wind is moderate (4–15 mph), and temperature trend is rising or current temp > 65°F.
 */
function detectThermalPull(locationId, hour, windSpeed, temperature) {
  if (!THERMAL_LAKES.has(locationId)) return null;
  if (hour < 12 || hour > 19) return null;
  if (windSpeed == null || windSpeed < 4 || windSpeed > 18) return null;

  const thermalLikely = temperature == null || temperature > 60;
  if (!thermalLikely) return null;

  return {
    label: 'Afternoon Thermal Pull',
    shortLabel: 'THERMAL',
    description: `Classic Utah Lake Valley thermal — warm air rising off the desert floor pulls steady ${Math.round(windSpeed)} mph onshore wind. Peaks 2–5 PM.`,
    icon: '🌡️',
    severity: windSpeed > 12 ? 'strong' : 'moderate',
  };
}

/**
 * Detect "Canyon Winds Expected"
 * Condition: Wasatch Front location, pressure gradient is sharp and easterly (> 2.5 mb),
 * indicating cold air funneling through canyons.
 */
function detectCanyonWinds(locationId, pressureGradient, windDirection) {
  if (!WASATCH_FRONT_LOCATIONS.has(locationId)) return null;
  if (pressureGradient == null) return null;

  const strongGradient = Math.abs(pressureGradient) > 2.5;
  if (!strongGradient) return null;

  const isCanyonDirection = CANYON_MOUTH_LOCATIONS.has(locationId);
  const isEasterly = windDirection != null && (windDirection > 45 && windDirection < 135);
  const isRelevant = isCanyonDirection || isEasterly;
  if (!isRelevant) return null;

  return {
    label: 'Canyon Winds Expected',
    shortLabel: 'CANYON',
    description: `Sharp ${Math.abs(pressureGradient).toFixed(1)} mb pressure gradient detected — cold air funneling through Wasatch canyons. Expect sudden gusts.`,
    icon: '🏔️',
    severity: Math.abs(pressureGradient) > 4 ? 'strong' : 'moderate',
  };
}

/**
 * Detect "Pre-Frontal Bite"
 * Condition: Barometric pressure dropping rapidly (> 0.06 inHg/hr, or gradient
 * indicates a front approaching). Fish feed aggressively before fronts.
 * We use pressureTrend === 'falling' combined with gradient magnitude.
 */
function detectPreFrontalBite(pressureTrend, pressureGradient, pressure) {
  const isFalling = pressureTrend === 'falling';
  const sharpDrop = pressureGradient != null && pressureGradient < -1.5;
  const lowAndDropping = pressure != null && pressure < 29.90 && isFalling;

  if (!isFalling && !sharpDrop) return null;
  if (!sharpDrop && !lowAndDropping) return null;

  return {
    label: 'Pre-Frontal Bite',
    shortLabel: 'PRE-FRONT',
    description: 'Barometric pressure dropping — front approaching within hours. Fish feed aggressively before fronts pass. This is your window.',
    icon: '⚡',
    severity: (sharpDrop && isFalling) ? 'strong' : 'moderate',
    fishingBoost: true,
  };
}

/**
 * Main entry point: returns all active vernacular labels for current conditions.
 */
export function getUtahVernacular({
  locationId,
  hour = new Date().getHours(),
  windSpeed,
  windDirection,
  temperature,
  pressureGradient,
  pressureTrend,
  pressure,
}) {
  const labels = [];

  const thermal = detectThermalPull(locationId, hour, windSpeed, temperature);
  if (thermal) labels.push(thermal);

  const canyon = detectCanyonWinds(locationId, pressureGradient, windDirection);
  if (canyon) labels.push(canyon);

  const preFront = detectPreFrontalBite(pressureTrend, pressureGradient, pressure);
  if (preFront) labels.push(preFront);

  return labels;
}

/**
 * Get the primary wind label override (replaces "Breezy" / "Gusty" in verdicts).
 * Returns null if no vernacular applies — callers should fall through to default.
 */
export function getVernacularWindLabel({
  locationId,
  hour = new Date().getHours(),
  windSpeed,
  windDirection,
  temperature,
  pressureGradient,
}) {
  const thermal = detectThermalPull(locationId, hour, windSpeed, temperature);
  if (thermal) return thermal.label;

  const canyon = detectCanyonWinds(locationId, pressureGradient, windDirection);
  if (canyon) return canyon.label;

  return null;
}

/**
 * Check if Pre-Frontal Bite conditions are active (for fishing badge).
 */
export function isPreFrontalBiteActive(pressureTrend, pressureGradient, pressure) {
  return detectPreFrontalBite(pressureTrend, pressureGradient, pressure);
}
