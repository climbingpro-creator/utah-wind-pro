/**
 * NowcastEngine — live sensor correction of static NWS forecasts.
 *
 * Compares rolling-average ground truth from the local sensor network
 * against the NWS hourly grid product and applies one of two corrections:
 *
 *   A) Delayed Wind  — upstream sensors firing → shift forecast peaks forward
 *   B) Busted Forecast — upstream also dead   → exponential decay toward live
 *
 * The raw forecast is NEVER mutated; a shallow-cloned array is returned.
 */

const STALE_THRESHOLD_MS  = 30 * 60 * 1000;  // 30 min
const ROLLING_WINDOW_MS   = 20 * 60 * 1000;  // 20 min (midpoint of 15-30)
const OVER_PREDICT_MPH    = 4;                // minimum forecast-vs-live error
const UPSTREAM_STRONG_MPH = 10;               // "upstream is blowing"
const DECAY_HOURS         = 4;
const SHIFT_HOURS         = 2;

// ── helpers ───────────────────────────────────────────────────

function readSpeed(entry) {
  if (entry == null) return 0;
  const v = entry.speed ?? entry.windSpeed ?? entry.nwsSpeed;
  return typeof v === 'string' ? parseFloat(v) || 0 : v ?? 0;
}

function readTime(entry) {
  const t = entry.time ?? entry.startTime;
  return t ? new Date(t).getTime() : 0;
}

function cloneEntry(entry, overrides) {
  return { ...entry, ...overrides };
}

/**
 * Compute a rolling average from the most recent readings within the window.
 * Falls back to the live station speed if no history is available.
 */
function computeRollingAverage(targetSensor, stationHistory, nowMs) {
  if (Array.isArray(stationHistory) && stationHistory.length > 0) {
    const cutoff = nowMs - ROLLING_WINDOW_MS;
    const recent = stationHistory.filter(r => {
      const ts = new Date(r.timestamp || r.dateTime || 0).getTime();
      return ts >= cutoff && ts <= nowMs;
    });
    if (recent.length > 0) {
      const sum = recent.reduce((acc, r) => acc + (r.windSpeed ?? r.speed ?? 0), 0);
      return sum / recent.length;
    }
  }
  // No usable history — fall back to single live reading (better than nothing)
  return targetSensor?.speed ?? targetSensor?.windSpeed ?? null;
}

/**
 * Find the forecast entry whose time bucket contains `nowMs`.
 */
function findCurrentHourIndex(forecast, nowMs) {
  for (let i = 0; i < forecast.length; i++) {
    const t = readTime(forecast[i]);
    if (!t) continue;
    const next = i + 1 < forecast.length ? readTime(forecast[i + 1]) : t + 3600000;
    if (nowMs >= t && nowMs < next) return i;
  }
  return forecast.length > 0 ? 0 : -1;
}

// ── Scenario A: Delayed Wind ──────────────────────────────────
// Upstream has wind but it hasn't reached the target yet.
// Shift the forecasted peak window forward by SHIFT_HOURS.

function shiftPeaks(forecast, currentIdx, liveAvg) {
  const out = forecast.map(e => cloneEntry(e));
  const shiftCount = Math.min(SHIFT_HOURS, forecast.length - currentIdx);

  for (let i = currentIdx; i < forecast.length; i++) {
    const srcIdx = i + shiftCount;
    if (srcIdx < forecast.length) {
      out[i] = cloneEntry(forecast[i], { speed: readSpeed(forecast[srcIdx]), windSpeed: readSpeed(forecast[srcIdx]) });
    } else {
      out[i] = cloneEntry(forecast[i], { speed: readSpeed(forecast[forecast.length - 1]), windSpeed: readSpeed(forecast[forecast.length - 1]) });
    }
  }

  // Anchor the first shifted hours to the live average
  for (let i = currentIdx; i < Math.min(currentIdx + shiftCount, forecast.length); i++) {
    const blend = (i - currentIdx) / Math.max(shiftCount, 1);
    const blended = liveAvg + (readSpeed(out[i]) - liveAvg) * blend;
    out[i] = cloneEntry(out[i], { speed: round1(blended), windSpeed: round1(blended) });
  }
  return out;
}

// ── Scenario B: Busted Forecast ───────────────────────────────
// Nobody upstream has wind either. Apply exponential decay so the
// forecast smoothly converges from live reality back to the
// original model over DECAY_HOURS.
//
//   corrected(h) = live + (forecast(h) - live) * α(h)
//   α(h)         = 1 - e^(-λh)       λ = 3 / DECAY_HOURS
//
// At h=0 → α=0 → corrected = live
// At h=DECAY_HOURS → α≈0.95 → corrected ≈ forecast

function applyDecay(forecast, currentIdx, liveAvg) {
  const lambda = 3 / DECAY_HOURS;
  const out = forecast.map(e => cloneEntry(e));

  for (let i = currentIdx; i < forecast.length; i++) {
    const hoursOut = (i - currentIdx);
    if (hoursOut >= DECAY_HOURS) break;

    const alpha = 1 - Math.exp(-lambda * hoursOut);
    const original = readSpeed(forecast[i]);
    const corrected = liveAvg + (original - liveAvg) * alpha;
    out[i] = cloneEntry(out[i], { speed: round1(corrected), windSpeed: round1(corrected) });
  }
  return out;
}

function round1(v) { return Math.round(v * 10) / 10; }

// ── public API ────────────────────────────────────────────────

/**
 * @param {Array}  rawHourlyForecast  — NWS/unified hourly array (never mutated)
 * @param {Array}  liveSensors        — lakeState.wind.stations (may be empty)
 * @param {string} targetStationId    — e.g. 'PWS' or a MesoWest STID
 * @param {Object} [options]
 * @param {Array}  [options.stationHistory] — time-series for the target sensor
 * @param {number|string} [options.lastUpdated] — ISO or epoch of last sensor ping
 * @returns {{ correctedForecast: Array, isNowcastActive: boolean, reason: string|null }}
 */
export function applyLiveCorrections(rawHourlyForecast, liveSensors, targetStationId, options = {}) {
  const inactive = { correctedForecast: rawHourlyForecast, isNowcastActive: false, reason: null };

  if (!Array.isArray(rawHourlyForecast) || rawHourlyForecast.length === 0) return inactive;
  if (!liveSensors || !Array.isArray(liveSensors)) return inactive;

  // Locate target sensor
  const target = liveSensors.find(
    s => s.id === targetStationId || s.isPWS || s.isYourStation
  );
  if (!target) return { ...inactive, reason: 'no_target_sensor' };

  // ── 1. Sensor Health Check ──────────────────────────────────
  const now = Date.now();
  const lastPing = options.lastUpdated
    || target.timestamp
    || target.lastUpdated;

  if (lastPing) {
    const age = now - new Date(lastPing).getTime();
    if (age > STALE_THRESHOLD_MS || age < 0) {
      return { ...inactive, reason: 'sensor_stale' };
    }
  }

  // ── 2. Rolling Average (lull protection) ────────────────────
  const liveAvg = computeRollingAverage(target, options.stationHistory, now);
  if (liveAvg == null || liveAvg < 0) return inactive;

  // ── 3. Compare forecast vs live ─────────────────────────────
  const curIdx = findCurrentHourIndex(rawHourlyForecast, now);
  if (curIdx < 0) return inactive;

  const forecastSpeed = readSpeed(rawHourlyForecast[curIdx]);
  const error = forecastSpeed - liveAvg;

  if (error <= OVER_PREDICT_MPH) return inactive;

  // ── 4. Upstream check ───────────────────────────────────────
  const upstream = liveSensors.filter(
    s => s.id !== targetStationId && !s.isPWS && !s.isYourStation
  );
  const upstreamStrong = upstream.some(s => (s.speed ?? s.windSpeed ?? 0) >= UPSTREAM_STRONG_MPH);

  if (upstreamStrong) {
    return {
      correctedForecast: shiftPeaks(rawHourlyForecast, curIdx, liveAvg),
      isNowcastActive: true,
      reason: 'delayed_wind',
    };
  }

  return {
    correctedForecast: applyDecay(rawHourlyForecast, curIdx, liveAvg),
    isNowcastActive: true,
    reason: 'busted_forecast',
  };
}
