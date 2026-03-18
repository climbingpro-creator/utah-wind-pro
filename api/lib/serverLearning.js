/**
 * SERVER-SIDE LEARNING ENGINE
 * 
 * Runs every 15 minutes via Vercel cron alongside data collection.
 * Completes the full predict → verify → learn loop 24/7, independent of
 * whether any client has the app open.
 *
 * Redis keys used:
 *   pred:{date}:{HH}:{mm}    — predictions made at this timestamp
 *   weights:server            — latest server-computed model weights
 *   accuracy:log              — recent accuracy records (list, capped at 500)
 *   learning:meta             — metadata: total predictions, cycles, last update
 */

// ── Lake thermal configurations (server-side subset of lakeStations.js) ──
const LAKE_THERMAL = {
  'utah-lake-lincoln':    { dir: [135, 165], peak: [10, 16], station: 'FPS' },
  'utah-lake-sandy':      { dir: [130, 160], peak: [10, 16], station: 'QSF' },
  'utah-lake-vineyard':   { dir: [180, 270], peak: [10, 16], station: 'QSF' },
  'utah-lake-zigzag':     { dir: [135, 165], peak: [10, 16], station: 'FPS' },
  'utah-lake-mm19':       { dir: [120, 160], peak: [10, 16], station: 'FPS' },
  'deer-creek':           { dir: [170, 210], peak: [11, 17], station: 'DCC' },
  'jordanelle':           { dir: [180, 230], peak: [11, 17], station: 'KHCR' },
  'willard-bay':          { dir: [170, 220], peak: [11, 17], station: 'KSLC' },
  'bear-lake':            { dir: [250, 320], peak: [12, 18], station: 'BERU1' },
  'strawberry-ladders':   { dir: [260, 340], peak: [10, 16], station: 'KHCR' },
  'strawberry-bay':       { dir: [220, 280], peak: [10, 16], station: 'KHCR' },
  'skyline-drive':        { dir: [250, 340], peak: [10, 16], station: 'KHCR' },
  'starvation':           { dir: [180, 230], peak: [11, 17], station: 'KVEL' },
  'flaming-gorge':        { dir: [130, 200], peak: [11, 17], station: 'KFGR' },
  'scofield':             { dir: [250, 320], peak: [11, 17], station: 'KPUC' },
  'sand-hollow':          { dir: [200, 250], peak: [10, 17], station: 'KSGU' },
  'lake-powell':          { dir: [180, 270], peak: [10, 18], station: 'KPGA' },
  'rush-lake':            { dir: [170, 210], peak: [10, 18], station: 'KSLC' },
  'potm-south':           { dir: [150, 200], peak: [8, 14],  station: 'FPS' },
  'potm-north':           { dir: [320, 360], peak: [12, 18], station: 'FPS' },
  'powder-mountain':      { dir: [180, 270], peak: [10, 18], station: 'KSLC' },
};

// ── Helpers ──

function isInRange(dir, min, max) {
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function isNortherly(dir) {
  return dir >= 300 || dir <= 60;
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Wind Event Scoring (mirrors client WindEventPredictor.js) ──

function scoreFrontal(station, pressure, history) {
  let score = 0;
  const pTrend = pressure.trend;
  if (pTrend === 'falling') score += 25;
  if ((pressure.gradient ?? 0) < -1.5) score += 20;

  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null) {
      const tempDrop = older.temperature - recent.temperature;
      if (tempDrop > 10) score += 30;
      else if (tempDrop > 5) score += 15;
    }
    if (recent?.windDirection != null && older?.windDirection != null) {
      const shift = angleDiff(older.windDirection, recent.windDirection);
      if (shift > 90) score += 20;
    }
    if (recent?.windGust != null && recent?.windSpeed != null && (recent.windGust - recent.windSpeed) > 12) {
      score += 15;
    }
  }
  if (station.windDirection != null && isNortherly(station.windDirection) && station.windSpeed > 15) {
    score += 20;
  }
  return Math.min(95, score);
}

function scoreNorthFlow(station, pressure) {
  let score = 0;
  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) score += 35;
  else if (gradient > 1.0) score += 15;
  if (station.windDirection != null && isNortherly(station.windDirection)) {
    score += 20;
    if (station.windSpeed > 10) score += 15;
  }
  if (station.temperature != null) {
    const month = new Date().getMonth();
    const avg = [35,40,48,55,65,75,85,83,73,60,45,35][month];
    if (station.temperature < avg - 10) score += 15;
  }
  return Math.min(95, score);
}

function scoreClearing(station, pressure, history, hour) {
  let score = 0;
  if (pressure.trend === 'rising') score += 25;
  if (station.windSpeed != null && station.windSpeed < 8) score += 15;
  if (station.windDirection != null && station.windDirection >= 160 && station.windDirection <= 230) score += 20;
  if (hour >= 10 && hour <= 16) score += 10;
  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null && (recent.temperature - older.temperature) > 5) {
      score += 15;
    }
  }
  return Math.min(90, score);
}

function scoreThermal(station, pressure, hour, lakeId) {
  const config = LAKE_THERMAL[lakeId];
  if (!config) return 0;
  let score = 0;
  const [peakStart, peakEnd] = config.peak;
  if (hour >= peakStart && hour <= peakEnd) score += 25;
  else if (hour >= peakStart - 3 && hour < peakStart) score += 15;
  else score -= 10;

  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) score -= 30;
  else if (gradient < 0.5) score += 15;

  if (station.windDirection != null && isInRange(station.windDirection, config.dir[0], config.dir[1])) {
    score += 20;
  }
  if (station.windSpeed != null && station.windSpeed >= 6 && station.windSpeed <= 18) {
    score += 15;
  }
  return Math.max(0, Math.min(95, score));
}

function scorePreFrontal(station, pressure, history) {
  let score = 0;
  if (pressure.trend === 'falling') score += 20;
  if (station.windDirection != null && station.windDirection >= 180 && station.windDirection <= 250) {
    score += 15;
    if (station.windSpeed > 10) score += 10;
  }
  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.windSpeed != null && older?.windSpeed != null && (recent.windSpeed - older.windSpeed) > 5) {
      score += 15;
    }
  }
  return Math.min(90, score);
}

function scoreGlass(station, pressure, hour) {
  let score = 0;
  if (station.windSpeed != null && station.windSpeed < 5) score += 30;
  else if (station.windSpeed != null && station.windSpeed < 8) score += 10;
  if (hour >= 5 && hour <= 10) score += 20;
  if (Math.abs(pressure.gradient ?? 0) < 1.0) score += 15;
  if (pressure.trend === 'stable' || pressure.trend === 'rising') score += 10;
  return Math.min(95, score);
}

function scorePostFrontal(station, pressure, history) {
  let score = 0;
  if (pressure.trend === 'rising') score += 20;
  if (station.windDirection != null && station.windDirection >= 280 && station.windDirection <= 340) score += 15;
  if (history.length >= 3) {
    const older = history[0];
    const recent = history[history.length - 1];
    if (recent?.windSpeed != null && older?.windSpeed != null) {
      const dec = older.windSpeed - recent.windSpeed;
      if (dec > 5 && recent.windSpeed > 5) score += 20;
    }
  }
  return Math.min(90, score);
}

// ── Main Prediction Function ──

function predictForLake(lakeId, primaryStation, pressure, history, hour, learnedWeights) {
  const events = [];
  const types = [
    { id: 'frontal_passage', fn: () => scoreFrontal(primaryStation, pressure, history), expSpeed: [15, 35], expDir: [300, 30] },
    { id: 'north_flow',      fn: () => scoreNorthFlow(primaryStation, pressure), expSpeed: [10, 25], expDir: [315, 45] },
    { id: 'clearing_wind',   fn: () => scoreClearing(primaryStation, pressure, history, hour), expSpeed: [5, 15], expDir: [160, 230] },
    { id: 'thermal_cycle',   fn: () => scoreThermal(primaryStation, pressure, hour, lakeId), expSpeed: [6, 18], expDir: LAKE_THERMAL[lakeId]?.dir || [135, 165] },
    { id: 'pre_frontal',     fn: () => scorePreFrontal(primaryStation, pressure, history), expSpeed: [10, 20], expDir: [180, 250] },
    { id: 'glass',           fn: () => scoreGlass(primaryStation, pressure, hour), expSpeed: [0, 5], expDir: null },
    { id: 'post_frontal',    fn: () => scorePostFrontal(primaryStation, pressure, history), expSpeed: [8, 15], expDir: [290, 340] },
  ];

  for (const t of types) {
    let prob = t.fn();

    // Apply learned weight adjustments
    if (learnedWeights?.eventWeights?.[t.id]) {
      const mod = learnedWeights.eventWeights[t.id];
      prob = Math.max(0, Math.min(100, prob + (mod.baseProbMod || 0)));
      if (mod.hourlyBias?.[hour]) {
        prob = Math.max(0, Math.min(100, prob + mod.hourlyBias[hour]));
      }
    }

    if (prob > 20) {
      events.push({
        eventType: t.id,
        probability: prob,
        expectedSpeed: t.expSpeed,
        expectedDirection: t.expDir,
        primaryStation: primaryStation.stationId,
        windSpeed: primaryStation.windSpeed,
        windDirection: primaryStation.windDirection,
        temperature: primaryStation.temperature,
      });
    }
  }
  return events;
}

// ── Pressure Analysis ──

function analyzePressure(currentStations, recentSnapshots) {
  const slc = currentStations.find(s => s.stationId === 'KSLC');
  const pvu = currentStations.find(s => s.stationId === 'KPVU');
  const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : 0;

  let trend = 'stable';
  if (recentSnapshots.length >= 4) {
    const oldSlc = recentSnapshots[recentSnapshots.length - 1]?.stations?.find(s => s.stationId === 'KSLC');
    if (slc?.pressure && oldSlc?.pressure) {
      const delta = slc.pressure - oldSlc.pressure;
      if (delta < -0.5) trend = 'falling';
      else if (delta > 0.5) trend = 'rising';
    }
  }

  return { slcPressure: slc?.pressure, pvuPressure: pvu?.pressure, gradient, trend };
}

// ── Build station history from recent snapshots ──

function buildStationHistory(stationId, recentSnapshots) {
  const history = [];
  for (const snap of recentSnapshots) {
    const s = snap.stations?.find(st => st.stationId === stationId);
    if (s) history.push(s);
  }
  return history;
}

// ── Verification: compare old predictions against what actually happened ──

function verifyPredictions(predictions, actualStations, lakeStationMap) {
  const results = [];

  for (const pred of predictions) {
    const lakeId = pred.lakeId;
    const stationIds = lakeStationMap[lakeId] || [];
    const actuals = actualStations.filter(s => stationIds.includes(s.stationId));
    if (actuals.length === 0) continue;

    const primary = actuals.find(s => s.stationId === pred.primaryStation) || actuals[0];
    if (primary.windSpeed == null) continue;

    let score = 0;

    // Speed accuracy: how close was actual to predicted range?
    const [expMin, expMax] = pred.expectedSpeed || [0, 100];
    const actualSpeed = primary.windSpeed;
    if (actualSpeed >= expMin && actualSpeed <= expMax) {
      score += 0.5;
    } else {
      const dist = actualSpeed < expMin ? expMin - actualSpeed : actualSpeed - expMax;
      score += Math.max(0, 0.5 - dist * 0.05);
    }

    // Direction accuracy (if applicable)
    if (pred.expectedDirection && primary.windDirection != null) {
      const [dirMin, dirMax] = pred.expectedDirection;
      if (isInRange(primary.windDirection, dirMin, dirMax)) {
        score += 0.5;
      } else {
        const diff = Math.min(
          angleDiff(primary.windDirection, dirMin),
          angleDiff(primary.windDirection, dirMax)
        );
        score += Math.max(0, 0.5 - diff * 0.005);
      }
    } else {
      // Glass/calm: award direction points for low speed
      score += actualSpeed < 5 ? 0.5 : Math.max(0, 0.5 - (actualSpeed - 5) * 0.05);
    }

    results.push({
      lakeId,
      eventType: pred.eventType,
      predicted: pred.probability,
      actualSpeed,
      actualDirection: primary.windDirection,
      score: Math.round(score * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }

  return results;
}

// ── Weight Update: learn from accuracy records ──

function updateWeights(currentWeights, newAccuracy) {
  const weights = JSON.parse(JSON.stringify(currentWeights || { eventWeights: {}, lakeWeights: {}, meta: {} }));
  const eventWeights = weights.eventWeights;

  for (const record of newAccuracy) {
    const key = record.eventType;
    if (!eventWeights[key]) {
      eventWeights[key] = { baseProbMod: 0, speedBias: 0, dirBias: 0, count: 0, totalScore: 0, hourlyBias: {} };
    }
    const ew = eventWeights[key];
    ew.count++;
    ew.totalScore += record.score;
    const avgAccuracy = ew.totalScore / ew.count;

    // Nudge base probability: over-predicting → lower, under-predicting → raise
    const lerpRate = Math.min(0.1, 1 / (ew.count + 10));
    if (avgAccuracy < 0.4 && record.predicted > 50) {
      ew.baseProbMod -= lerpRate * 3;
    } else if (avgAccuracy > 0.7 && record.predicted < 50) {
      ew.baseProbMod += lerpRate * 3;
    }
    ew.baseProbMod = Math.max(-25, Math.min(25, ew.baseProbMod));

    // Speed bias: track systematic over/under prediction
    if (record.actualSpeed != null && record.expectedSpeedMid != null) {
      const speedErr = record.actualSpeed - record.expectedSpeedMid;
      ew.speedBias = ew.speedBias * 0.95 + speedErr * 0.05;
    }

    // Hourly bias: learn which hours are better/worse for this event type
    const hour = new Date(record.timestamp).getHours();
    if (!ew.hourlyBias[hour]) ew.hourlyBias[hour] = 0;
    const hourlyTarget = record.score > 0.6 ? 2 : record.score < 0.3 ? -2 : 0;
    ew.hourlyBias[hour] = ew.hourlyBias[hour] * 0.9 + hourlyTarget * 0.1;

    // Per-lake tracking
    if (!weights.lakeWeights) weights.lakeWeights = {};
    if (!weights.lakeWeights[record.lakeId]) {
      weights.lakeWeights[record.lakeId] = { count: 0, totalScore: 0 };
    }
    const lw = weights.lakeWeights[record.lakeId];
    lw.count++;
    lw.totalScore += record.score;
  }

  // Compute summary stats
  weights.meta = weights.meta || {};
  weights.meta.lastUpdated = new Date().toISOString();
  weights.meta.totalPredictions = Object.values(eventWeights).reduce((s, e) => s + (e.count || 0), 0);
  weights.meta.overallAccuracy = weights.meta.totalPredictions > 0
    ? Object.values(eventWeights).reduce((s, e) => s + (e.totalScore || 0), 0) / weights.meta.totalPredictions
    : 0;

  // Per-event accuracy summary
  weights.meta.eventAccuracy = {};
  for (const [key, ew] of Object.entries(eventWeights)) {
    weights.meta.eventAccuracy[key] = ew.count > 0
      ? { accuracy: Math.round((ew.totalScore / ew.count) * 100) / 100, count: ew.count, probMod: Math.round(ew.baseProbMod * 10) / 10 }
      : null;
  }

  return weights;
}

// ── Redis helpers (passed in to avoid circular deps) ──

async function loadWeights(redisCmd) {
  const raw = await redisCmd('GET', 'weights:server');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveWeights(redisCmd, weights) {
  await redisCmd('SET', 'weights:server', JSON.stringify(weights));
}

async function loadRecentPredictions(redisCmd, lookbackMinutes = 240) {
  const keys = await redisCmd('LRANGE', 'pred:index', '0', '15');
  if (!keys || keys.length === 0) return [];

  const cutoff = Date.now() - lookbackMinutes * 60000;
  const all = [];
  for (const key of keys) {
    const raw = await redisCmd('GET', key);
    if (!raw) continue;
    try {
      const record = JSON.parse(raw);
      if (new Date(record.timestamp).getTime() > cutoff) {
        all.push(...(record.predictions || []));
      }
    } catch { /* skip */ }
  }
  return all;
}

async function savePredictions(redisCmd, predictions, timestamp) {
  const key = `pred:${timestamp.toISOString().split('T')[0]}:${String(timestamp.getHours()).padStart(2,'0')}:${String(timestamp.getMinutes()).padStart(2,'0')}`;
  const record = { timestamp: timestamp.toISOString(), predictions };
  await redisCmd('SET', key, JSON.stringify(record), 'EX', '604800');
  await redisCmd('LPUSH', 'pred:index', key);
  await redisCmd('LTRIM', 'pred:index', '0', '672');
}

async function appendAccuracyLog(redisCmd, records) {
  for (const r of records) {
    await redisCmd('LPUSH', 'accuracy:log', JSON.stringify(r));
  }
  await redisCmd('LTRIM', 'accuracy:log', '0', '499');
}

async function loadMeta(redisCmd) {
  const raw = await redisCmd('GET', 'learning:meta');
  if (!raw) return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 };
  try { return JSON.parse(raw); } catch { return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 }; }
}

async function saveMeta(redisCmd, meta) {
  await redisCmd('SET', 'learning:meta', JSON.stringify(meta));
}

// ══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — called by cron after data collection
// ══════════════════════════════════════════════════════════════

async function runServerLearningCycle(redisCmd, currentStations, recentSnapshots, lakeStationMap) {
  const now = new Date();
  const hour = now.getHours();
  const pressure = analyzePressure(currentStations, recentSnapshots);

  // 1. Load current weights
  const weights = await loadWeights(redisCmd) || { eventWeights: {}, lakeWeights: {}, meta: {} };

  // 2. Make predictions for every lake
  const allPredictions = [];
  for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
    const lakeStations = currentStations.filter(s => stationIds.includes(s.stationId));
    if (lakeStations.length === 0) continue;

    const primaryId = LAKE_THERMAL[lakeId]?.station || stationIds[0];
    const primary = lakeStations.find(s => s.stationId === primaryId) || lakeStations[0];
    const history = buildStationHistory(primary.stationId, recentSnapshots);

    const events = predictForLake(lakeId, primary, pressure, history, hour, weights);
    for (const evt of events) {
      allPredictions.push({ ...evt, lakeId });
    }
  }

  // 3. Store predictions
  if (allPredictions.length > 0) {
    await savePredictions(redisCmd, allPredictions, now);
  }

  // 4. Verify old predictions (2-4 hours ago) against current actuals
  const oldPredictions = await loadRecentPredictions(redisCmd, 240);
  const verificationsNeeded = oldPredictions.filter(p => {
    const age = now.getTime() - new Date(p.timestamp || 0).getTime();
    return age > 90 * 60000 && age < 300 * 60000;
  });

  let accuracyRecords = [];
  if (verificationsNeeded.length > 0) {
    accuracyRecords = verifyPredictions(verificationsNeeded, currentStations, lakeStationMap);
  }

  // 5. Update weights from accuracy
  let updatedWeights = weights;
  if (accuracyRecords.length > 0) {
    await appendAccuracyLog(redisCmd, accuracyRecords);
    updatedWeights = updateWeights(weights, accuracyRecords);
    await saveWeights(redisCmd, updatedWeights);
  }

  // 6. Update metadata
  const meta = await loadMeta(redisCmd);
  meta.totalCycles++;
  meta.totalPredictions += allPredictions.length;
  meta.totalVerified += accuracyRecords.length;
  meta.lastCycle = now.toISOString();
  meta.lastPredictionCount = allPredictions.length;
  meta.lastVerificationCount = accuracyRecords.length;
  await saveMeta(redisCmd, meta);

  return {
    predictionsMade: allPredictions.length,
    verificationsRun: accuracyRecords.length,
    weightsUpdated: accuracyRecords.length > 0,
    meta,
    pressure,
  };
}

export {
  runServerLearningCycle,
  loadWeights,
  loadMeta,
  LAKE_THERMAL,
};
