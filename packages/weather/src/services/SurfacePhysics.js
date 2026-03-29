/**
 * SurfacePhysics — Fluid dynamics corrections for spatial wind interpolation.
 *
 * Three independent multipliers adjust raw IDW output:
 *   1. Fetch Acceleration   — logarithmic speed-up over open water
 *   2. Venturi Funneling    — terrain corridor compression boost
 *   3. Thermal Decoupling   — air-water temperature delta braking
 *
 * Each returns a dimensionless multiplier (baseline = 1.0).
 * The combined product is applied to windSpeed, with human-readable
 * reason strings pushed to `physicsReasons[]` for the UI.
 */

const DEG_TO_RAD = Math.PI / 180;

// ── Water Body Polygons ──────────────────────────────────────
// Simplified convex hulls [lat, lng] — wound counter-clockwise.

const WATER_POLYGONS = {
  'utah-lake': [
    [40.08, -111.83], // south tip
    [40.08, -111.72],
    [40.18, -111.68],
    [40.30, -111.72],
    [40.36, -111.73],
    [40.40, -111.76],
    [40.44, -111.80],
    [40.44, -111.88],
    [40.36, -111.92],
    [40.24, -111.93],
    [40.14, -111.88],
  ],
  'deer-creek': [
    [40.39, -111.53],
    [40.39, -111.48],
    [40.41, -111.46],
    [40.43, -111.47],
    [40.43, -111.52],
    [40.41, -111.54],
  ],
};

// ── Venturi Corridors ────────────────────────────────────────
// Each corridor: polygon bounds, dominant axis (degrees from N),
// max fractional boost, and exponent controlling alignment sharpness.

const VENTURI_CORRIDORS = [
  {
    id: 'point-of-mountain',
    bounds: [
      [40.42, -111.92], [40.42, -111.88],
      [40.46, -111.88], [40.46, -111.92],
    ],
    axis: 350,
    maxBoost: 0.25,
    exponent: 4,
  },
  {
    id: 'provo-canyon',
    bounds: [
      [40.33, -111.63], [40.33, -111.56],
      [40.40, -111.45], [40.42, -111.50],
    ],
    axis: 290,
    maxBoost: 0.20,
    exponent: 3,
  },
  {
    id: 'rush-valley',
    bounds: [
      [40.08, -112.10], [40.08, -111.98],
      [40.22, -111.98], [40.22, -112.10],
    ],
    axis: 180,
    maxBoost: 0.20,
    exponent: 2,
  },
];

// ── Geometry Helpers ─────────────────────────────────────────

/**
 * Ray-casting point-in-polygon test.
 * Polygon: array of [lat, lng] forming a closed ring.
 */
function pointInPolygon([lat, lng], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Approximate fetch distance: cast a ray from `point` in the upwind
 * direction until it exits the polygon. Returns distance in miles.
 *
 * We step in ~0.002° increments (~0.12 mi) and stop at the edge or
 * after 30 miles. Good enough for the logarithmic profile.
 */
function estimateFetchMiles([lat, lng], windDir, polygon) {
  // Wind direction = "from" → the upwind ray goes OPPOSITE to windDir
  const upwindBearing = (windDir + 180) % 360;
  const bearingRad = upwindBearing * DEG_TO_RAD;
  const stepLat = Math.cos(bearingRad) * 0.002;
  const stepLng = Math.sin(bearingRad) * 0.002;
  const stepMiles = 0.12;

  let curLat = lat;
  let curLng = lng;
  let distance = 0;

  for (let i = 0; i < 250; i++) {
    curLat += stepLat;
    curLng += stepLng;
    distance += stepMiles;
    if (!pointInPolygon([curLat, curLng], polygon)) break;
  }

  return distance;
}

// ── Physics Functions ────────────────────────────────────────

const FETCH_MAX_MULTIPLIER = 1.30;

/**
 * Fetch Acceleration — logarithmic speed-up over open water.
 * Wind accelerates the further it travels over a frictionless water surface.
 *
 * Returns { multiplier, fetchMiles, lakeId }
 */
export function calculateFetchMultiplier(lat, lng, windDir) {
  for (const [lakeId, polygon] of Object.entries(WATER_POLYGONS)) {
    if (pointInPolygon([lat, lng], polygon)) {
      const fetchMiles = estimateFetchMiles([lat, lng], windDir, polygon);
      const raw = 1 + 0.15 * Math.log(1 + fetchMiles);
      const multiplier = Math.min(raw, FETCH_MAX_MULTIPLIER);
      return { multiplier, fetchMiles: Math.round(fetchMiles * 10) / 10, lakeId };
    }
  }
  return { multiplier: 1, fetchMiles: 0, lakeId: null };
}

/**
 * Venturi Funneling — terrain corridor compression.
 * Wind aligning with a narrow canyon/gap experiences a speed-up
 * proportional to cosine-power alignment with the corridor axis.
 *
 * Returns { multiplier, corridorId, alignment }
 */
export function calculateVenturiMultiplier(lat, lng, windDir) {
  for (const corridor of VENTURI_CORRIDORS) {
    if (pointInPolygon([lat, lng], corridor.bounds)) {
      const angleDiff = (windDir - corridor.axis) * DEG_TO_RAD;
      const alignment = ((1 + Math.cos(angleDiff)) / 2) ** corridor.exponent;
      const multiplier = 1 + corridor.maxBoost * alignment;
      return {
        multiplier: Math.round(multiplier * 1000) / 1000,
        corridorId: corridor.id,
        alignment: Math.round(alignment * 100) / 100,
      };
    }
  }
  return { multiplier: 1, corridorId: null, alignment: 0 };
}

const THERMAL_FLOOR = 0.40;

/**
 * Thermal Decoupling — air/water temperature delta braking.
 * When air is significantly warmer than the water surface, a stable
 * boundary layer forms ("Lake Bubble") that suppresses surface wind.
 *
 * Returns { multiplier, deltaF }
 */
export function calculateThermalMultiplier(airTemp, waterTemp) {
  if (waterTemp == null || airTemp == null) return { multiplier: 1, deltaF: 0 };

  const delta = airTemp - waterTemp;

  if (delta <= 5) return { multiplier: 1, deltaF: Math.round(delta * 10) / 10 };

  const raw = 1 - 0.02 * delta;
  return {
    multiplier: Math.max(THERMAL_FLOOR, Math.round(raw * 1000) / 1000),
    deltaF: Math.round(delta * 10) / 10,
  };
}

// ── Main Entry Point ─────────────────────────────────────────

/**
 * Apply all surface physics corrections to an interpolated station result.
 *
 * @param {Object} station — The interpolated station from SpatialInterpolator
 *   (must have lat, lng, speed/windSpeed, direction/windDirection)
 * @param {Object} [env] — Optional environment data
 *   { waterTemp?: number } — lake surface temperature in °F
 * @returns {Object} The mutated station with adjusted speed and `physicsReasons[]`
 */
export function applySurfacePhysics(station, env = {}) {
  if (!station) return station;

  const lat = station.lat;
  const lng = station.lng;
  const windDir = station.direction ?? station.windDirection ?? 0;
  const airTemp = station.temperature ?? station.temp ?? null;
  const waterTemp = env.waterTemp ?? null;

  const reasons = [];

  // 1. Fetch
  const fetch = calculateFetchMultiplier(lat, lng, windDir);
  if (fetch.multiplier !== 1) {
    const pct = Math.round((fetch.multiplier - 1) * 100);
    reasons.push(`+${pct}% Fetch Acceleration (${fetch.fetchMiles} mi over ${fetch.lakeId})`);
  }

  // 2. Venturi
  const venturi = calculateVenturiMultiplier(lat, lng, windDir);
  if (venturi.multiplier !== 1) {
    const pct = Math.round((venturi.multiplier - 1) * 100);
    reasons.push(`+${pct}% Venturi Funneling (${venturi.corridorId}, ${Math.round(venturi.alignment * 100)}% aligned)`);
  }

  // 3. Thermal
  const thermal = calculateThermalMultiplier(airTemp, waterTemp);
  if (thermal.multiplier !== 1) {
    const pct = Math.round((1 - thermal.multiplier) * 100);
    reasons.push(`-${pct}% Thermal Decoupling (air ${thermal.deltaF}°F > water)`);
  }

  const finalMultiplier = fetch.multiplier * venturi.multiplier * thermal.multiplier;

  if (finalMultiplier !== 1) {
    const rawSpeed = station.speed ?? station.windSpeed ?? 0;
    const adjusted = Math.round(rawSpeed * finalMultiplier * 10) / 10;
    station.speed = adjusted;
    station.windSpeed = adjusted;

    if (station.gust != null) {
      station.gust = Math.round(station.gust * finalMultiplier * 10) / 10;
      station.windGust = station.gust;
    }
  }

  station.physicsReasons = reasons;
  station.physicsMultiplier = Math.round(finalMultiplier * 1000) / 1000;

  return station;
}

export { WATER_POLYGONS, VENTURI_CORRIDORS };
