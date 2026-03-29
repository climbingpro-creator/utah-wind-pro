/**
 * SpatialInterpolator — Inverse Distance Weighting (IDW) engine for
 * synthesizing live weather at arbitrary GPS coordinates from nearby sensors.
 *
 * Inputs:  a target [lat, lng] and an array of live station readings
 * Output:  a synthetic station object with interpolated wind, temp, pressure
 *
 * Wind vectors are decomposed into U/V components before averaging
 * so the 360°→0° wraparound is handled correctly.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_MI = 3958.8;

const MAX_STATIONS = 4;
const MAX_DISTANCE_MI = 40;
const IDW_POWER = 2;

// ── Haversine ────────────────────────────────────────────────────

/**
 * Great-circle distance between two [lat, lng] points in miles.
 */
function haversine([lat1, lng1], [lat2, lng2]) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

// ── Wind Vector Math ─────────────────────────────────────────────
//
// Meteorological convention: direction is where wind comes FROM,
// measured clockwise from true north (0°=N, 90°=E, 180°=S, 270°=W).
//
//   U (east-west)  = -speed * sin(dir)   — positive = from west
//   V (north-south)= -speed * cos(dir)   — positive = from south

function windToUV(speed, directionDeg) {
  if (speed == null || directionDeg == null) return { u: 0, v: 0 };
  const rad = directionDeg * DEG_TO_RAD;
  return {
    u: -speed * Math.sin(rad),
    v: -speed * Math.cos(rad),
  };
}

function uvToWind(u, v) {
  const speed = Math.sqrt(u * u + v * v);
  if (speed < 0.01) return { speed: 0, direction: 0 };

  let dir = Math.atan2(-u, -v) * RAD_TO_DEG;
  if (dir < 0) dir += 360;

  return {
    speed: Math.round(speed * 10) / 10,
    direction: Math.round(dir) % 360,
  };
}

// ── Station field extraction ─────────────────────────────────────

function readSpeed(s) {
  return s.speed ?? s.windSpeed ?? null;
}

function readDir(s) {
  return s.direction ?? s.windDirection ?? null;
}

function readGust(s) {
  return s.gust ?? s.windGust ?? null;
}

function readTemp(s) {
  return s.temperature ?? s.temp ?? null;
}

function readPressure(s) {
  return s.pressure ?? null;
}

function readCoords(s) {
  const lat = s.lat ?? s.latitude;
  const lng = s.lng ?? s.lon ?? s.longitude;
  if (lat == null || lng == null) return null;
  return [lat, lng];
}

// ── IDW Core ─────────────────────────────────────────────────────

/**
 * Interpolate live weather conditions at an arbitrary GPS point
 * using Inverse Distance Weighting from nearby physical sensors.
 *
 * @param {[number, number]} targetLatLng — [lat, lng] of the pin drop
 * @param {Array} allLiveStations — array of station objects, each with
 *   lat/lng, speed/windSpeed, direction/windDirection, etc.
 * @returns {{ interpolated: object, stations: Array, method: string } | null}
 */
function interpolateConditions(targetLatLng, allLiveStations) {
  if (!targetLatLng || !Array.isArray(allLiveStations) || allLiveStations.length === 0) {
    return null;
  }

  // 1. Attach distances, filter to stations with valid coords + wind data
  const withDistance = [];
  for (const station of allLiveStations) {
    const coords = readCoords(station);
    if (!coords) continue;
    if (readSpeed(station) == null) continue;

    const distance = haversine(targetLatLng, coords);

    // Exact hit — pin is on top of this sensor
    if (distance < 0.01) {
      return {
        interpolated: buildResult(station, targetLatLng),
        stations: [{ ...station, distance: 0 }],
        method: 'exact',
      };
    }

    if (distance <= MAX_DISTANCE_MI) {
      withDistance.push({ ...station, distance });
    }
  }

  if (withDistance.length === 0) return null;

  // 2. Sort by distance, keep closest N
  withDistance.sort((a, b) => a.distance - b.distance);
  const nearest = withDistance.slice(0, MAX_STATIONS);

  // 3. Compute IDW weights: w_i = 1 / d_i^p
  const weights = nearest.map(s => 1 / s.distance ** IDW_POWER);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // 4. Weighted averages
  let uSum = 0, vSum = 0;
  let gustUSum = 0, gustVSum = 0, gustWeightSum = 0;
  let tempSum = 0, tempWeightSum = 0;
  let pressSum = 0, pressWeightSum = 0;

  for (let i = 0; i < nearest.length; i++) {
    const s = nearest[i];
    const w = weights[i];

    // Wind speed + direction via U/V decomposition
    const speed = readSpeed(s) ?? 0;
    const dir = readDir(s);
    const { u, v } = windToUV(speed, dir);
    uSum += u * w;
    vSum += v * w;

    // Gusts (also decompose to vectors so direction stays consistent)
    const gust = readGust(s);
    if (gust != null && dir != null) {
      const gustVec = windToUV(gust, dir);
      gustUSum += gustVec.u * w;
      gustVSum += gustVec.v * w;
      gustWeightSum += w;
    }

    // Temperature — straight scalar average
    const temp = readTemp(s);
    if (temp != null) {
      tempSum += temp * w;
      tempWeightSum += w;
    }

    // Pressure — straight scalar average
    const press = readPressure(s);
    if (press != null) {
      pressSum += press * w;
      pressWeightSum += w;
    }
  }

  const wind = uvToWind(uSum / weightSum, vSum / weightSum);
  const gustWind = gustWeightSum > 0
    ? uvToWind(gustUSum / gustWeightSum, gustVSum / gustWeightSum)
    : null;

  const result = {
    id: 'PIN_DROP',
    name: 'Pin Drop',
    lat: targetLatLng[0],
    lng: targetLatLng[1],
    speed: wind.speed,
    windSpeed: wind.speed,
    direction: wind.direction,
    windDirection: wind.direction,
    gust: gustWind?.speed ?? null,
    windGust: gustWind?.speed ?? null,
    temperature: tempWeightSum > 0
      ? Math.round((tempSum / tempWeightSum) * 10) / 10
      : null,
    temp: tempWeightSum > 0
      ? Math.round((tempSum / tempWeightSum) * 10) / 10
      : null,
    pressure: pressWeightSum > 0
      ? Math.round((pressSum / pressWeightSum) * 100) / 100
      : null,
    source: 'spatial-idw',
    stationCount: nearest.length,
    maxDistance: Math.round(nearest[nearest.length - 1].distance * 10) / 10,
    interpolatedAt: new Date().toISOString(),
  };

  return {
    interpolated: result,
    stations: nearest.map(s => ({
      id: s.id,
      name: s.name,
      distance: Math.round(s.distance * 10) / 10,
      weight: Math.round((1 / s.distance ** IDW_POWER / weightSum) * 1000) / 1000,
      speed: readSpeed(s),
      direction: readDir(s),
    })),
    method: 'idw',
  };
}

/**
 * Build result when pin lands exactly on a sensor (distance ≈ 0).
 */
function buildResult(station, targetLatLng) {
  return {
    id: station.id || 'PIN_DROP',
    name: station.name || 'Pin Drop',
    lat: targetLatLng[0],
    lng: targetLatLng[1],
    speed: readSpeed(station),
    windSpeed: readSpeed(station),
    direction: readDir(station),
    windDirection: readDir(station),
    gust: readGust(station),
    windGust: readGust(station),
    temperature: readTemp(station),
    temp: readTemp(station),
    pressure: readPressure(station),
    source: 'exact-station',
    stationCount: 1,
    maxDistance: 0,
    interpolatedAt: new Date().toISOString(),
  };
}

export const SpatialInterpolator = {
  interpolateConditions,
  haversine,
  windToUV,
  uvToWind,
};
