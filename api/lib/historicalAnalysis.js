/**
 * HISTORICAL ANALYSIS ENGINE
 *
 * Pulls months of historical timeseries from Synoptic/MesoWest and builds
 * data-driven statistical models that replace hardcoded thresholds.
 *
 * Output → Redis key "models:statistical" — consumed by serverLearning.js
 *          and synced to client via ?action=models
 *
 * Models built:
 *   1. Per-station hourly wind climatology (speed/dir by hour × month)
 *   2. Event fingerprints (what conditions preceded each event type)
 *   3. Upstream→downstream lag correlations (how wind propagates)
 *   4. Station-pair translation factors (speed ratios between stations)
 *   5. Pressure-gradient thresholds (optimal thresholds per event type)
 *   6. Thermal timing profiles (per-lake success rates by hour × month)
 */

import { LAKE_STATIONS, ALL_STATION_IDS, UPSTREAM_STATIONS } from './stations.js';

// ── Synoptic API chunking (7 days max per call for timeseries) ──

const CHUNK_DAYS = 7;
const SYNOPTIC_BASE = 'https://api.synopticdata.com/v2';
const VARS = 'wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure';

function formatSynopticDate(date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 12);
}

async function fetchTimeseries(token, stationIds, startDate, endDate) {
  const stids = stationIds.join(',');
  const url = `${SYNOPTIC_BASE}/stations/timeseries?token=${token}`
    + `&stids=${stids}&start=${formatSynopticDate(startDate)}&end=${formatSynopticDate(endDate)}`
    + `&vars=${VARS}&units=english&obtimezone=utc`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Synoptic API ${resp.status}: ${resp.statusText}`);
  const data = await resp.json();
  return data.STATION || [];
}

async function fetchFullHistory(token, stationIds, days = 90) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600000);
  const allStations = {};

  for (let chunkStart = new Date(start); chunkStart < end;) {
    const chunkEnd = new Date(Math.min(chunkStart.getTime() + CHUNK_DAYS * 24 * 3600000, end.getTime()));

    try {
      const stations = await fetchTimeseries(token, stationIds, chunkStart, chunkEnd);
      for (const s of stations) {
        if (!allStations[s.STID]) {
          allStations[s.STID] = { stid: s.STID, name: s.NAME, readings: [] };
        }
        const obs = s.OBSERVATIONS || {};
        const times = obs.date_time || [];
        // Timeseries API uses _set_1 keys; latest API uses _value_1
        const speeds = obs.wind_speed_set_1 || obs.wind_speed_value_1 || [];
        const dirs = obs.wind_direction_set_1 || obs.wind_direction_value_1 || [];
        const gusts = obs.wind_gust_set_1 || obs.wind_gust_value_1 || [];
        const temps = obs.air_temp_set_1 || obs.air_temp_value_1 || [];
        const altims = obs.altimeter_set_1 || obs.altimeter_value_1 || [];
        const slps = obs.sea_level_pressure_set_1 || obs.sea_level_pressure_value_1 || [];

        for (let i = 0; i < times.length; i++) {
          allStations[s.STID].readings.push({
            t: new Date(times[i]).getTime(),
            speed: speeds[i] ?? null,
            dir: dirs[i] ?? null,
            gust: gusts[i] ?? null,
            temp: temps[i] ?? null,
            altim: altims[i] ?? null,
            slp: slps[i] ?? null,
          });
        }
      }
    } catch (err) {
      console.warn(`[HistoricalAnalysis] Chunk fetch error ${chunkStart.toISOString()}: ${err.message}`);
    }

    chunkStart = chunkEnd;
  }

  // Sort each station's readings by time
  for (const s of Object.values(allStations)) {
    s.readings.sort((a, b) => a.t - b.t);
  }
  return allStations;
}

// ── Helpers ──

function toMountainHour(ts) {
  const d = new Date(ts);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver', hour: 'numeric', hour12: false,
    }).formatToParts(d);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    const month = d.getUTCMonth();
    const offset = (month >= 2 && month <= 10) ? 6 : 7;
    return (d.getUTCHours() - offset + 24) % 24;
  }
}

function getMonth(ts) {
  return new Date(ts).getUTCMonth();
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function isNortherly(dir) { return dir >= 300 || dir <= 60; }
function normalizeToMb(val) { return val == null ? null : (val < 50 ? val * 33.864 : val); }

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ══════════════════════════════════════════════════════════════
// MODEL 1: PER-STATION HOURLY WIND CLIMATOLOGY
// What's "normal" for each station at each hour of each month?
// ══════════════════════════════════════════════════════════════

function buildStationClimatology(allStations) {
  const climatology = {};

  for (const [stid, stationData] of Object.entries(allStations)) {
    climatology[stid] = {};
    // 12 months × 24 hours
    for (let month = 0; month < 12; month++) {
      climatology[stid][month] = {};
      for (let hour = 0; hour < 24; hour++) {
        climatology[stid][month][hour] = {
          speeds: [], dirs: [], gusts: [], temps: [],
        };
      }
    }

    for (const r of stationData.readings) {
      if (r.speed == null) continue;
      const h = toMountainHour(r.t);
      const m = getMonth(r.t);
      const bin = climatology[stid][m][h];
      bin.speeds.push(r.speed);
      if (r.dir != null) bin.dirs.push(r.dir);
      if (r.gust != null) bin.gusts.push(r.gust);
      if (r.temp != null) bin.temps.push(r.temp);
    }

    // Compute statistics
    for (let month = 0; month < 12; month++) {
      for (let hour = 0; hour < 24; hour++) {
        const bin = climatology[stid][month][hour];
        const n = bin.speeds.length;
        if (n === 0) {
          climatology[stid][month][hour] = { n: 0 };
          continue;
        }
        climatology[stid][month][hour] = {
          n,
          speedMean: bin.speeds.reduce((a, b) => a + b, 0) / n,
          speedP25: percentile(bin.speeds, 25),
          speedP50: percentile(bin.speeds, 50),
          speedP75: percentile(bin.speeds, 75),
          speedP90: percentile(bin.speeds, 90),
          speedP95: percentile(bin.speeds, 95),
          gustP75: bin.gusts.length > 0 ? percentile(bin.gusts, 75) : null,
          gustP95: bin.gusts.length > 0 ? percentile(bin.gusts, 95) : null,
          tempMean: bin.temps.length > 0 ? bin.temps.reduce((a, b) => a + b, 0) / bin.temps.length : null,
          dirMode: bin.dirs.length > 0 ? computeDirMode(bin.dirs) : null,
          dirSpread: bin.dirs.length > 0 ? computeDirSpread(bin.dirs) : null,
          kiteableRate: bin.speeds.filter(s => s >= 10).length / n,
          glassRate: bin.speeds.filter(s => s < 5).length / n,
          strongWindRate: bin.speeds.filter(s => s >= 15).length / n,
        };
      }
    }
  }

  return climatology;
}

function computeDirMode(dirs) {
  const buckets = new Array(36).fill(0);
  for (const d of dirs) buckets[Math.round(d / 10) % 36]++;
  const maxIdx = buckets.indexOf(Math.max(...buckets));
  return maxIdx * 10;
}

function computeDirSpread(dirs) {
  if (dirs.length < 2) return 0;
  const sinSum = dirs.reduce((s, d) => s + Math.sin(d * Math.PI / 180), 0);
  const cosSum = dirs.reduce((s, d) => s + Math.cos(d * Math.PI / 180), 0);
  const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / dirs.length;
  return Math.round((1 - R) * 360); // 0 = all same dir, 360 = uniform
}

// ══════════════════════════════════════════════════════════════
// MODEL 2: EVENT DETECTION FROM HISTORY
// Scan historical data to find past wind events and build
// a library of "what conditions look like" before each event.
// ══════════════════════════════════════════════════════════════

function detectHistoricalEvents(allStations, lakeStationMap) {
  const events = [];

  // Use LAKE_STATIONS primary field, not array[0]
  const primaryMap = {};
  for (const [lakeId, config] of Object.entries(LAKE_STATIONS)) {
    primaryMap[lakeId] = config.primary;
  }

  const _debugSkipped = [];
  const _debugUsed = [];

  for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
    const primaryId = primaryMap[lakeId] || stationIds[0];
    let stationData = allStations[primaryId];
    let usedId = primaryId;
    // Fallback through synoptic list until we find one with data
    if (!stationData || stationData.readings.length < 20) {
      for (const sid of stationIds) {
        if (allStations[sid]?.readings?.length >= 20) {
          stationData = allStations[sid];
          usedId = sid;
          break;
        }
      }
    }
    if (!stationData || stationData.readings.length < 20) {
      _debugSkipped.push({ lakeId, primaryId, reason: 'no data' });
      continue;
    }

    const readings = stationData.readings;
    const validSpeedDir = readings.filter(r => r.speed != null && r.dir != null).length;
    _debugUsed.push({ lakeId, station: usedId, total: readings.length, validSpeedDir });

    // Get pressure station (KSLC or KPVU if available)
    const pressStation = allStations['KSLC'] || allStations['KPVU'];

    for (let i = 12; i < readings.length - 4; i++) {
      const r = readings[i];
      if (r.speed == null || r.dir == null) continue;

      const hour = toMountainHour(r.t);
      const month = getMonth(r.t);

      // Look at recent history (previous 12 readings — varies by station reporting freq)
      const history = readings.slice(Math.max(0, i - 12), i);
      const validHistory = history.filter(h => h.speed != null);
      if (validHistory.length < 2) continue;

      const olderSpeed = validHistory[0].speed;
      const olderDir = validHistory[0].dir;
      const olderTemp = validHistory[0].temp;

      // Compute pressure if available
      let pressGradient = null;
      let pressTrend = null;
      if (pressStation) {
        const nearbyPress = findNearestReading(pressStation.readings, r.t);
        const olderPress = findNearestReading(pressStation.readings, r.t - 3600000);
        if (nearbyPress?.altim && olderPress?.altim) {
          const p1 = normalizeToMb(nearbyPress.altim);
          const p2 = normalizeToMb(olderPress.altim);
          if (p1 && p2) {
            pressTrend = p1 - p2; // positive = rising
          }
        }
      }

      // ─── Detect thermal cycle ───
      if (hour >= 9 && hour <= 18 && r.speed >= 6 && r.speed <= 30) {
        const windFrom = r.dir;
        // Compare to earlier readings (2-6 hours prior depending on reporting freq)
        const prevStart = Math.max(0, i - Math.min(readings.length, 36));
        const prevEnd = Math.max(0, i - 6);
        const prevHourReadings = readings.slice(prevStart, prevEnd).filter(h => h.speed != null);
        const avgPrevSpeed = prevHourReadings.length > 0
          ? prevHourReadings.reduce((s, h) => s + h.speed, 0) / prevHourReadings.length
          : 0;

        if (r.speed > avgPrevSpeed + 3) {
          events.push({
            type: 'thermal_cycle',
            lakeId,
            station: primaryId,
            timestamp: r.t,
            hour, month,
            speed: r.speed,
            dir: r.dir,
            rampUp: r.speed - avgPrevSpeed,
            pressureTrend: pressTrend,
            fingerprint: { speed: r.speed, dir: windFrom, hour, month, rampUp: r.speed - avgPrevSpeed },
          });
        }
      }

      // ─── Detect frontal passage ───
      if (olderDir != null && r.dir != null) {
        const dirShift = angleDiff(olderDir, r.dir);
        const tempDrop = olderTemp != null && r.temp != null ? olderTemp - r.temp : 0;
        const gustSpike = r.gust != null ? r.gust - r.speed : 0;

        if (
          (dirShift > 45 && isNortherly(r.dir) && r.speed > 8) ||
          (tempDrop > 5 && r.speed > 8) ||
          (isNortherly(r.dir) && r.speed > 15 && pressTrend != null && pressTrend < -0.3)
        ) {
          events.push({
            type: 'frontal_passage',
            lakeId,
            station: primaryId,
            timestamp: r.t,
            hour, month,
            speed: r.speed,
            dir: r.dir,
            tempDrop,
            dirShift,
            gustSpike,
            pressureTrend: pressTrend,
            fingerprint: { speed: r.speed, dir: r.dir, tempDrop, dirShift, gustSpike, hour, month, pressTrend },
          });
        }
      }

      // ─── Detect north flow ───
      if (isNortherly(r.dir) && r.speed > 10 && (pressTrend == null || pressTrend > -0.5)) {
        const sustained = validHistory.filter(h => h.dir != null && isNortherly(h.dir) && h.speed > 6);
        if (sustained.length >= 2) {
          events.push({
            type: 'north_flow',
            lakeId,
            station: primaryId,
            timestamp: r.t,
            hour, month,
            speed: r.speed,
            dir: r.dir,
            sustainedCount: sustained.length,
            pressureTrend: pressTrend,
            fingerprint: { speed: r.speed, hour, month, sustainedCount: sustained.length, pressTrend },
          });
        }
      }

      // ─── Detect glass window ───
      if (r.speed < 5 && hour >= 4 && hour <= 11) {
        const sustained = validHistory.filter(h => h.speed < 6);
        if (sustained.length >= 2) {
          events.push({
            type: 'glass',
            lakeId,
            station: primaryId,
            timestamp: r.t,
            hour, month,
            speed: r.speed,
            fingerprint: { speed: r.speed, hour, month, sustainedCount: sustained.length },
          });
        }
      }
    }
  }

  events._debug = { skipped: _debugSkipped, used: _debugUsed };
  return events;
}

function findNearestReading(readings, targetTime, maxDelta = 1800000) {
  if (!readings.length) return null;
  // Binary search for closest reading (readings are sorted by .t)
  let lo = 0, hi = readings.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (readings[mid].t < targetTime) lo = mid + 1;
    else hi = mid;
  }
  // Check lo and lo-1
  let best = null, bestDelta = Infinity;
  for (const idx of [lo - 1, lo, lo + 1]) {
    if (idx < 0 || idx >= readings.length) continue;
    const delta = Math.abs(readings[idx].t - targetTime);
    if (delta < bestDelta) { bestDelta = delta; best = readings[idx]; }
  }
  return bestDelta <= maxDelta ? best : null;
}

// ══════════════════════════════════════════════════════════════
// MODEL 3: EVENT FINGERPRINT LIBRARY
// From detected events, build statistical profiles of what
// conditions precede each event type at each lake.
// ══════════════════════════════════════════════════════════════

function buildEventFingerprints(events) {
  const fingerprints = {};

  for (const e of events) {
    const key = `${e.lakeId}:${e.type}`;
    if (!fingerprints[key]) {
      fingerprints[key] = {
        lakeId: e.lakeId,
        eventType: e.type,
        count: 0,
        byMonth: {},
        byHour: {},
        speeds: [],
        dirs: [],
        tempDrops: [],
        rampUps: [],
        pressureTrends: [],
      };
    }

    const fp = fingerprints[key];
    fp.count++;
    fp.speeds.push(e.speed);
    if (e.dir != null) fp.dirs.push(e.dir);
    if (e.tempDrop != null) fp.tempDrops.push(e.tempDrop);
    if (e.rampUp != null) fp.rampUps.push(e.rampUp);
    if (e.pressureTrend != null) fp.pressureTrends.push(e.pressureTrend);

    // Monthly distribution
    const mk = e.month.toString();
    fp.byMonth[mk] = (fp.byMonth[mk] || 0) + 1;

    // Hourly distribution
    const hk = e.hour.toString();
    fp.byHour[hk] = (fp.byHour[hk] || 0) + 1;
  }

  // Compute summary stats for each fingerprint
  for (const fp of Object.values(fingerprints)) {
    fp.speedStats = {
      mean: fp.speeds.length > 0 ? fp.speeds.reduce((a, b) => a + b, 0) / fp.speeds.length : 0,
      p25: percentile(fp.speeds, 25),
      p75: percentile(fp.speeds, 75),
      p90: percentile(fp.speeds, 90),
    };
    fp.dirStats = fp.dirs.length > 0 ? {
      mode: computeDirMode(fp.dirs),
      spread: computeDirSpread(fp.dirs),
    } : null;
    fp.tempDropStats = fp.tempDrops.length > 0 ? {
      mean: fp.tempDrops.reduce((a, b) => a + b, 0) / fp.tempDrops.length,
      p75: percentile(fp.tempDrops, 75),
    } : null;
    fp.rampUpStats = fp.rampUps.length > 0 ? {
      mean: fp.rampUps.reduce((a, b) => a + b, 0) / fp.rampUps.length,
      p75: percentile(fp.rampUps, 75),
    } : null;
    fp.pressureTrendStats = fp.pressureTrends.length > 0 ? {
      mean: fp.pressureTrends.reduce((a, b) => a + b, 0) / fp.pressureTrends.length,
      p25: percentile(fp.pressureTrends, 25),
    } : null;

    // Peak hour and month
    fp.peakHour = Object.entries(fp.byHour).sort((a, b) => b[1] - a[1])[0]?.[0];
    fp.peakMonth = Object.entries(fp.byMonth).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Clean up raw arrays before storing (save space)
    delete fp.speeds;
    delete fp.dirs;
    delete fp.tempDrops;
    delete fp.rampUps;
    delete fp.pressureTrends;
  }

  return fingerprints;
}

// ══════════════════════════════════════════════════════════════
// MODEL 4: UPSTREAM→DOWNSTREAM LAG CORRELATIONS
// Measure how weather propagates from upstream to downstream stations.
// ══════════════════════════════════════════════════════════════

function buildLagCorrelations(allStations) {
  const UPSTREAM_IDS = UPSTREAM_STATIONS;
  const DOWNSTREAM_IDS = ['FPS', 'KPVU', 'KSLC', 'KHCR', 'KHIF', 'KOGD', 'UTCOP', 'BERU1'];
  const LAG_RANGE_MINUTES = [15, 30, 60, 90, 120, 180, 240, 300, 360];

  const correlations = {};

  for (const upId of UPSTREAM_IDS) {
    const upData = allStations[upId];
    if (!upData || upData.readings.length < 100) continue;

    for (const downId of DOWNSTREAM_IDS) {
      const downData = allStations[downId];
      if (!downData || downData.readings.length < 100) continue;

      const pairKey = `${upId}→${downId}`;
      const lagResults = {};

      for (const lagMin of LAG_RANGE_MINUTES) {
        const lagMs = lagMin * 60000;
        let sumProduct = 0, sumUp2 = 0, sumDown2 = 0;
        let upMean = 0, downMean = 0, n = 0;
        const speedPairs = [];

        // Sample every 6th reading for performance (still gives thousands of pairs)
        const step = Math.max(1, Math.floor(upData.readings.length / 3000));
        for (let ri = 0; ri < upData.readings.length; ri += step) {
          const upR = upData.readings[ri];
          if (upR.speed == null) continue;
          const targetTime = upR.t + lagMs;
          const downR = findNearestReading(downData.readings, targetTime, 2700000);
          if (!downR || downR.speed == null) continue;
          speedPairs.push({ up: upR.speed, down: downR.speed, upDir: upR.dir, downDir: downR.dir });
        }

        if (speedPairs.length < 30) continue;

        // Compute correlation
        const upSpeeds = speedPairs.map(p => p.up);
        const downSpeeds = speedPairs.map(p => p.down);
        const upAvg = upSpeeds.reduce((a, b) => a + b, 0) / upSpeeds.length;
        const downAvg = downSpeeds.reduce((a, b) => a + b, 0) / downSpeeds.length;

        for (let i = 0; i < speedPairs.length; i++) {
          const dUp = speedPairs[i].up - upAvg;
          const dDown = speedPairs[i].down - downAvg;
          sumProduct += dUp * dDown;
          sumUp2 += dUp * dUp;
          sumDown2 += dDown * dDown;
        }

        const denom = Math.sqrt(sumUp2 * sumDown2);
        const correlation = denom > 0 ? sumProduct / denom : 0;

        // Translation factor: downstream speed / upstream speed
        const ratios = speedPairs.filter(p => p.up > 3).map(p => p.down / p.up);
        const translationFactor = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;

        // Direction propagation: how often does dir shift happen?
        const dirPairs = speedPairs.filter(p => p.upDir != null && p.downDir != null);
        const avgDirShift = dirPairs.length > 0
          ? dirPairs.reduce((s, p) => s + angleDiff(p.upDir, p.downDir), 0) / dirPairs.length
          : null;

        lagResults[lagMin] = {
          correlation: Math.round(correlation * 1000) / 1000,
          translationFactor: Math.round(translationFactor * 100) / 100,
          avgDirShift: avgDirShift != null ? Math.round(avgDirShift) : null,
          sampleSize: speedPairs.length,
        };
      }

      if (Object.keys(lagResults).length > 0) {
        // Find optimal lag (highest correlation)
        const bestLag = Object.entries(lagResults)
          .sort((a, b) => b[1].correlation - a[1].correlation)[0];

        correlations[pairKey] = {
          upstream: upId,
          downstream: downId,
          optimalLagMinutes: parseInt(bestLag[0]),
          peakCorrelation: bestLag[1].correlation,
          translationFactor: bestLag[1].translationFactor,
          lags: lagResults,
        };
      }
    }
  }

  return correlations;
}

// ══════════════════════════════════════════════════════════════
// MODEL 5: PRESSURE-GRADIENT EVENT THRESHOLDS
// Learn the optimal gradient thresholds for each event type
// from actual historical data instead of using hardcoded values.
// ══════════════════════════════════════════════════════════════

function buildGradientThresholds(events) {
  const thresholds = {};

  const eventTypes = ['frontal_passage', 'north_flow', 'thermal_cycle', 'glass', 'clearing_wind'];
  for (const type of eventTypes) {
    const typeEvents = events.filter(e => e.type === type && e.pressureTrend != null);
    if (typeEvents.length < 10) continue;

    const trends = typeEvents.map(e => e.pressureTrend);
    thresholds[type] = {
      sampleSize: trends.length,
      trendMean: Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 100) / 100,
      trendP10: Math.round(percentile(trends, 10) * 100) / 100,
      trendP25: Math.round(percentile(trends, 25) * 100) / 100,
      trendP50: Math.round(percentile(trends, 50) * 100) / 100,
      trendP75: Math.round(percentile(trends, 75) * 100) / 100,
      trendP90: Math.round(percentile(trends, 90) * 100) / 100,
    };
  }

  return thresholds;
}

// ══════════════════════════════════════════════════════════════
// MODEL 6: THERMAL TIMING PROFILES
// Per-lake success rates by hour and month — replaces hardcoded
// peak hours with actual observed thermal probability curves.
// ══════════════════════════════════════════════════════════════

function buildThermalTimingProfiles(events, climatology, lakeStationMap) {
  const profiles = {};
  const thermalEvents = events.filter(e => e.type === 'thermal_cycle');

  for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
    const primaryId = stationIds[0];
    const stationClim = climatology[primaryId];
    if (!stationClim) continue;

    const lakeEvents = thermalEvents.filter(e => e.lakeId === lakeId);

    profiles[lakeId] = {
      totalThermalDays: new Set(lakeEvents.map(e => new Date(e.timestamp).toDateString())).size,
      totalEvents: lakeEvents.length,
      byMonth: {},
      byHour: {},
      hourlyProbability: {},
    };

    // Monthly thermal event counts
    for (let m = 0; m < 12; m++) {
      const monthEvents = lakeEvents.filter(e => e.month === m);
      profiles[lakeId].byMonth[m] = {
        events: monthEvents.length,
        avgSpeed: monthEvents.length > 0
          ? Math.round((monthEvents.reduce((s, e) => s + e.speed, 0) / monthEvents.length) * 10) / 10
          : 0,
      };
    }

    // Hourly probability: events at this hour / total observations at this hour
    for (let h = 0; h < 24; h++) {
      const hourEvents = lakeEvents.filter(e => e.hour === h);
      // Total obs = sum across all months for this hour
      let totalObs = 0;
      for (let m = 0; m < 12; m++) {
        totalObs += stationClim[m]?.[h]?.n || 0;
      }

      const rate = totalObs > 0 ? hourEvents.length / totalObs : 0;
      profiles[lakeId].byHour[h] = {
        events: hourEvents.length,
        totalObs,
        rate: Math.round(rate * 10000) / 10000,
        avgSpeed: hourEvents.length > 0
          ? Math.round((hourEvents.reduce((s, e) => s + e.speed, 0) / hourEvents.length) * 10) / 10
          : 0,
      };
      profiles[lakeId].hourlyProbability[h] = Math.round(rate * 100);
    }
  }

  return profiles;
}

// ══════════════════════════════════════════════════════════════
// MASTER BUILD FUNCTION
// Pulls history, runs all models, saves to Redis.
// ══════════════════════════════════════════════════════════════

export async function buildStatisticalModels(redisCmd, synopticToken, options = {}) {
  const days = options.days || 90;
  const log = [];
  const startTime = Date.now();

  log.push(`Starting historical analysis: ${days} days of data for ${ALL_STATION_IDS.length} stations`);

  // 1. Fetch historical data
  log.push('Fetching historical timeseries from Synoptic API...');
  const allStations = await fetchFullHistory(synopticToken, ALL_STATION_IDS, days);
  const stationCount = Object.keys(allStations).length;
  const totalReadings = Object.values(allStations).reduce((s, st) => s + st.readings.length, 0);
  log.push(`Fetched ${stationCount} stations, ${totalReadings.toLocaleString()} total readings`);

  // Diagnostics: sample data quality per station
  const stationDiag = {};
  for (const [stid, data] of Object.entries(allStations)) {
    const total = data.readings.length;
    const withSpeed = data.readings.filter(r => r.speed != null && !isNaN(r.speed)).length;
    const withDir = data.readings.filter(r => r.dir != null && !isNaN(r.dir)).length;
    const withTemp = data.readings.filter(r => r.temp != null && !isNaN(r.temp)).length;
    const sample = data.readings.find(r => r.speed != null);
    stationDiag[stid] = { total, withSpeed, withDir, withTemp, sample: sample ? { speed: sample.speed, dir: sample.dir, temp: sample.temp } : null };
  }
  log.push(`Station data quality: ${JSON.stringify(stationDiag)}`);

  // 2. Build station climatology
  log.push('Building station climatology (speed/dir/temp by hour × month)...');
  const climatology = buildStationClimatology(allStations);

  // Compact climatology for storage (only store stats, not raw arrays)
  const compactClimatology = {};
  for (const [stid, months] of Object.entries(climatology)) {
    compactClimatology[stid] = {};
    for (const [month, hours] of Object.entries(months)) {
      compactClimatology[stid][month] = {};
      for (const [hour, stats] of Object.entries(hours)) {
        if (stats.n > 0) {
          compactClimatology[stid][month][hour] = stats;
        }
      }
    }
  }
  log.push(`Climatology built for ${Object.keys(compactClimatology).length} stations`);

  // 3. Build lake station map for event detection
  const lakeStationMap = {};
  for (const [lakeId, config] of Object.entries(LAKE_STATIONS)) {
    lakeStationMap[lakeId] = config.synoptic;
  }

  // 4. Detect historical events
  log.push('Scanning history for wind events (thermal, frontal, north flow, glass)...');
  const events = detectHistoricalEvents(allStations, lakeStationMap);
  const eventCounts = {};
  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
  }
  log.push(`Detected ${events.length} events: ${JSON.stringify(eventCounts)}`);
  if (events._debug) {
    log.push(`Event detection: ${events._debug.used.length} lakes scanned, ${events._debug.skipped.length} skipped`);
    const topUsed = events._debug.used.slice(0, 5);
    log.push(`Sample lakes: ${JSON.stringify(topUsed)}`);
  }

  // 5. Build event fingerprints
  log.push('Building event fingerprint library...');
  const fingerprints = buildEventFingerprints(events);
  log.push(`Built ${Object.keys(fingerprints).length} event fingerprints`);

  // 6. Build upstream→downstream lag correlations
  log.push('Computing upstream→downstream lag correlations...');
  const lagCorrelations = buildLagCorrelations(allStations);
  log.push(`Computed ${Object.keys(lagCorrelations).length} station-pair correlations`);

  // 7. Build pressure gradient thresholds
  log.push('Computing pressure-gradient event thresholds...');
  const gradientThresholds = buildGradientThresholds(events);

  // 8. Build thermal timing profiles
  log.push('Building thermal timing profiles...');
  const thermalProfiles = buildThermalTimingProfiles(events, climatology, lakeStationMap);
  log.push(`Built thermal profiles for ${Object.keys(thermalProfiles).length} lakes`);

  // ── Package and store ──
  const models = {
    version: 2,
    builtAt: new Date().toISOString(),
    daysAnalyzed: days,
    stationCount,
    totalReadings,
    eventCounts,
    climatology: compactClimatology,
    fingerprints,
    lagCorrelations,
    gradientThresholds,
    thermalProfiles,
  };

  // Store in Redis
  const modelsJson = JSON.stringify(models);
  await redisCmd('SET', 'models:statistical', modelsJson);
  log.push(`Models saved to Redis (${(modelsJson.length / 1024).toFixed(0)} KB)`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log.push(`Historical analysis complete in ${elapsed}s`);

  return { models, log };
}

// Export individual builders for targeted updates
export { fetchFullHistory, buildStationClimatology, detectHistoricalEvents, buildLagCorrelations };
