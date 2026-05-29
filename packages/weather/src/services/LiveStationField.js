/**
 * LIVE STATION FIELD — Shared in-memory observation store
 *
 * The map fetches dense observations from /api/weather?source=stations-dense
 * and pushes them here. The predictor reads from here when its hardcoded
 * indicator slots (spanishForkWind, kslcWind, etc.) are missing data.
 *
 * Capabilities:
 *   • updateBatch(observations)  — store latest reading per stationId
 *   • getStation(stationId)      — exact lookup by NWS / WU / UDOT id
 *   • getNearestActive(lat, lng) — haversine-based closest reporting station
 *   • getNearbyActive(lat, lng, radiusMi, opts) — all stations within radius
 *   • recordPredictionDelta(...) — track prediction-vs-observation accuracy
 *   • getAccuracyStats(locationId) — running validation summary
 *
 * Storage:
 *   • In-memory Map keyed by stationId (fast, primary)
 *   • localStorage mirror so hard reloads don't lose the field
 *   • Observations expire after 30 minutes (FRESHNESS_MS)
 */

const STORAGE_KEY = 'utahwind:liveStationField:v1';
const ACCURACY_KEY = 'utahwind:liveStationField:accuracy:v1';
const FRESHNESS_MS = 30 * 60 * 1000;    // 30 min — older obs are dropped
const MAX_DELTAS_PER_LOCATION = 100;     // ring buffer per location

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeLoadStorage(key) {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSaveStorage(key, data) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota or serialization failure — silent, in-memory still works
  }
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Module-level state ─────────────────────────────────────────
const _observations = new Map(); // stationId → ObservationRecord
const _accuracy = new Map();      // locationId → DeltaRecord[]

// Hydrate from localStorage if present (browser-only)
(function hydrate() {
  const stored = safeLoadStorage(STORAGE_KEY);
  if (stored && Array.isArray(stored)) {
    const now = Date.now();
    for (const obs of stored) {
      if (obs && obs.stationId && (now - (obs.receivedAt || 0)) < FRESHNESS_MS) {
        _observations.set(obs.stationId, obs);
      }
    }
  }
  const accStored = safeLoadStorage(ACCURACY_KEY);
  if (accStored && typeof accStored === 'object') {
    for (const [locId, deltas] of Object.entries(accStored)) {
      if (Array.isArray(deltas)) _accuracy.set(locId, deltas.slice(-MAX_DELTAS_PER_LOCATION));
    }
  }
})();

function persist() {
  if (!isBrowser()) return;
  const arr = [];
  for (const obs of _observations.values()) arr.push(obs);
  safeSaveStorage(STORAGE_KEY, arr);
}

function persistAccuracy() {
  if (!isBrowser()) return;
  const obj = {};
  for (const [locId, deltas] of _accuracy.entries()) obj[locId] = deltas;
  safeSaveStorage(ACCURACY_KEY, obj);
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Bulk-upsert observations from the dense-field endpoint.
 * Expected shape per item:
 *   { id, stationId, name, lat, lon, source,
 *     windSpeed, windDir, windGust, temp, humidity, pressure, obsTime }
 */
export function updateBatch(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return 0;
  const now = Date.now();
  let added = 0;

  for (const o of observations) {
    const stationId = o.stationId || o.id;
    if (!stationId || o.lat == null || o.lon == null) continue;

    // Skip stations with no wind data AND no temp — useless for indicators
    if (o.windSpeed == null && o.temp == null) continue;

    _observations.set(stationId, {
      stationId,
      id: o.id || stationId,
      name: o.name || stationId,
      lat: o.lat,
      lon: o.lon,
      source: o.source || 'unknown',           // 'nws' | 'udot' | 'wu-pws' | etc.
      windSpeed: o.windSpeed ?? null,
      windDir: o.windDir ?? null,
      windGust: o.windGust ?? null,
      temp: o.temp ?? null,
      humidity: o.humidity ?? null,
      pressure: o.pressure ?? null,
      obsTime: o.obsTime || null,
      receivedAt: now,
      distanceKm: o.distanceKm ?? null,
      elevation: o.elevation ?? null,
    });
    added++;
  }

  // Evict stale entries opportunistically
  for (const [sid, rec] of _observations.entries()) {
    if (now - (rec.receivedAt || 0) > FRESHNESS_MS) _observations.delete(sid);
  }

  persist();
  return added;
}

/**
 * Exact lookup. Returns the freshest record for stationId or null.
 * Accepts case-insensitive prefix variants (KSLC, kslc, K-SLC ignored).
 */
export function getStation(stationId) {
  if (!stationId) return null;
  const direct = _observations.get(stationId);
  if (direct) return _isFresh(direct) ? _toLegacyShape(direct) : null;

  const upper = stationId.toUpperCase();
  const hit = _observations.get(upper);
  if (hit && _isFresh(hit)) return _toLegacyShape(hit);

  return null;
}

/**
 * Find the closest active station to (lat, lng) with usable wind data.
 *
 * opts:
 *   maxMiles       — discard stations farther than this (default 30)
 *   requireWind    — station must have non-null windSpeed (default true)
 *   sourceFilter   — Set of allowed sources, e.g. new Set(['nws','udot'])
 *   excludeIds     — Set of station IDs to skip
 *
 * Returns { ...record, distanceMiles } or null.
 */
export function getNearestActive(lat, lng, opts = {}) {
  const {
    maxMiles = 30,
    requireWind = true,
    sourceFilter = null,
    excludeIds = null,
  } = opts;

  let best = null;
  let bestDist = Infinity;

  for (const rec of _observations.values()) {
    if (!_isFresh(rec)) continue;
    if (requireWind && rec.windSpeed == null) continue;
    if (sourceFilter && !sourceFilter.has(rec.source)) continue;
    if (excludeIds && excludeIds.has(rec.stationId)) continue;

    const d = haversineMiles(lat, lng, rec.lat, rec.lon);
    if (d > maxMiles) continue;
    if (d < bestDist) {
      bestDist = d;
      best = rec;
    }
  }

  if (!best) return null;
  return { ..._toLegacyShape(best), distanceMiles: +bestDist.toFixed(2) };
}

/**
 * All active stations within radius. Returns array sorted ascending by distance.
 */
export function getNearbyActive(lat, lng, radiusMiles = 30, opts = {}) {
  const {
    requireWind = true,
    sourceFilter = null,
    limit = 50,
  } = opts;

  const out = [];
  for (const rec of _observations.values()) {
    if (!_isFresh(rec)) continue;
    if (requireWind && rec.windSpeed == null) continue;
    if (sourceFilter && !sourceFilter.has(rec.source)) continue;

    const d = haversineMiles(lat, lng, rec.lat, rec.lon);
    if (d > radiusMiles) continue;
    out.push({ ..._toLegacyShape(rec), distanceMiles: +d.toFixed(2) });
  }

  out.sort((a, b) => a.distanceMiles - b.distanceMiles);
  return out.slice(0, limit);
}

/**
 * Total active station count (useful for diagnostics / UI badges).
 */
export function getActiveCount() {
  let n = 0;
  for (const rec of _observations.values()) {
    if (_isFresh(rec)) n++;
  }
  return n;
}

/**
 * Record a prediction-vs-observation delta so we can track running accuracy
 * without round-tripping to the server. Each location gets a ring buffer.
 *
 * Call this after every prediction with the nearest observed wind:
 *   recordPredictionDelta('utah-lake-zigzag', {
 *     predictedSpeed: 12.3, observedSpeed: 14.1,
 *     predictedDir: 150,    observedDir: 165,
 *     stationId: 'FPS', distanceMiles: 0.5,
 *   });
 */
export function recordPredictionDelta(locationId, payload) {
  if (!locationId || !payload || payload.observedSpeed == null) return;
  const rec = {
    timestamp: Date.now(),
    predictedSpeed: payload.predictedSpeed ?? null,
    observedSpeed: payload.observedSpeed,
    predictedDir: payload.predictedDir ?? null,
    observedDir: payload.observedDir ?? null,
    stationId: payload.stationId || null,
    distanceMiles: payload.distanceMiles ?? null,
    deltaSpeed: payload.predictedSpeed != null
      ? +(payload.observedSpeed - payload.predictedSpeed).toFixed(2)
      : null,
    deltaDir: (payload.predictedDir != null && payload.observedDir != null)
      ? Math.min(
          Math.abs(payload.observedDir - payload.predictedDir),
          360 - Math.abs(payload.observedDir - payload.predictedDir)
        )
      : null,
  };

  const arr = _accuracy.get(locationId) || [];
  arr.push(rec);
  if (arr.length > MAX_DELTAS_PER_LOCATION) arr.splice(0, arr.length - MAX_DELTAS_PER_LOCATION);
  _accuracy.set(locationId, arr);
  persistAccuracy();
}

/**
 * Aggregate accuracy stats for a location across the ring buffer.
 *   { samples, meanDeltaSpeed, meanAbsDeltaSpeed, biasMph, meanDeltaDir,
 *     hitRate (delta < 3 mph), source: 'live-station-field' }
 */
export function getAccuracyStats(locationId) {
  const arr = _accuracy.get(locationId);
  if (!arr || arr.length === 0) return null;

  let n = 0, sum = 0, absSum = 0, dirSum = 0, dirN = 0, hits = 0;
  for (const r of arr) {
    if (r.deltaSpeed == null) continue;
    n++;
    sum += r.deltaSpeed;
    absSum += Math.abs(r.deltaSpeed);
    if (Math.abs(r.deltaSpeed) < 3) hits++;
    if (r.deltaDir != null) { dirSum += r.deltaDir; dirN++; }
  }

  if (n === 0) return null;
  return {
    samples: n,
    meanDeltaSpeed: +(sum / n).toFixed(2),
    meanAbsDeltaSpeed: +(absSum / n).toFixed(2),
    biasMph: +(sum / n).toFixed(2), // positive = under-predicting
    meanDeltaDir: dirN > 0 ? +(dirSum / dirN).toFixed(1) : null,
    hitRate: +(hits / n).toFixed(3),
    source: 'live-station-field',
  };
}

/**
 * Aggregate accuracy across ALL locations — used by dashboards.
 */
export function getGlobalAccuracyStats() {
  let totalN = 0, totalSum = 0, totalAbs = 0, totalHits = 0;
  const perLocation = {};

  for (const [loc, arr] of _accuracy.entries()) {
    const stats = getAccuracyStats(loc);
    if (stats) {
      perLocation[loc] = stats;
      totalN += stats.samples;
      totalSum += stats.meanDeltaSpeed * stats.samples;
      totalAbs += stats.meanAbsDeltaSpeed * stats.samples;
      totalHits += stats.hitRate * stats.samples;
    }
  }

  if (totalN === 0) return null;
  return {
    samples: totalN,
    biasMph: +(totalSum / totalN).toFixed(2),
    meanAbsDeltaSpeed: +(totalAbs / totalN).toFixed(2),
    hitRate: +(totalHits / totalN).toFixed(3),
    perLocation,
  };
}

// ─── Internal helpers ──────────────────────────────────────────

function _isFresh(rec) {
  return Date.now() - (rec.receivedAt || 0) < FRESHNESS_MS;
}

/**
 * Convert dense-field shape (windSpeed/windDir/temp) to the legacy
 * shape expected by ThermalPredictor/WindFieldEngine (speed/direction/temperature).
 * Returns BOTH naming conventions for maximum compatibility.
 */
function _toLegacyShape(rec) {
  return {
    ...rec,
    speed: rec.windSpeed,
    direction: rec.windDir,
    gust: rec.windGust,
    temperature: rec.temp,
  };
}

// Default export bundle for ergonomic consumption
export default {
  updateBatch,
  getStation,
  getNearestActive,
  getNearbyActive,
  getActiveCount,
  recordPredictionDelta,
  getAccuracyStats,
  getGlobalAccuracyStats,
};
