/**
 * HISTORICAL BACKTEST — Train the model on real past data
 * 
 * Pulls 30 days of historical data from Synoptic (MesoWest) for summer 2024
 * and summer 2025, runs predictions, compares to actuals, and generates
 * trained weights that can bootstrap the learning system.
 * 
 * Usage: node scripts/historical-backtest.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SYNOPTIC_TOKEN = 'a3a1f61831034433b54e754ffeaa151f';

// Stations we care about
const STATIONS = {
  FPS: 'FPS',           // Flight Park South — Utah Lake ground truth
  KSLC: 'KSLC',         // SLC Airport — north flow origin
  KPVU: 'KPVU',         // Provo Airport — south Utah Lake indicator
  QSF: 'QSF',           // Spanish Fork — canyon/SE thermal indicator
  UTALP: 'UTALP',       // Point of Mountain — gap wind
  KHCR: 'KHCR',         // Heber City — Deer Creek baseline
  UID28: 'UID28',        // Arrowhead — Deer Creek ridge
};

// Date ranges for backtest
// Summer 2024: June 15 - July 14 (peak thermal season)
// Summer 2025: June 15 - July 14 (compare year over year)
const BACKTEST_RANGES = [
  { label: 'Summer 2024', start: '2024-06-15', end: '2024-07-14' },
  { label: 'Summer 2025', start: '2025-06-15', end: '2025-07-14' },
];

// Kite windows: when we actually expect wind (10am - 7pm MDT = 16:00 - 01:00 UTC)
const KITE_HOUR_START = 10; // 10 AM local
const KITE_HOUR_END = 19;   // 7 PM local

// Thresholds
const FOIL_MIN_SPEED = 10;
const TWIN_TIP_MIN_SPEED = 15;

// ─── API HELPERS ──────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fmt(dateStr) {
  return dateStr.replace(/[-:T]/g, '').slice(0, 12);
}

async function fetchStationHistory(stationId, startDate, endDate) {
  const startUTC = fmt(new Date(startDate + 'T00:00:00-06:00').toISOString());
  const endUTC = fmt(new Date(endDate + 'T23:59:00-06:00').toISOString());
  
  const url = `https://api.synopticdata.com/v2/stations/timeseries?` +
    `stid=${stationId}&start=${startUTC}&end=${endUTC}` +
    `&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure` +
    `&units=english&obtimezone=local&token=${SYNOPTIC_TOKEN}`;
  
  try {
    const data = await fetchJSON(url);
    if (data.STATION && data.STATION[0]) {
      return parseStationData(data.STATION[0]);
    }
    return null;
  } catch (e) {
    console.error(`  Error fetching ${stationId}: ${e.message}`);
    return null;
  }
}

function parseStationData(station) {
  const obs = station.OBSERVATIONS || {};
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const gusts = obs.wind_gust_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.pressure_set_1d || obs.pressure_set_1 || [];

  const hourly = {};

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    const dateKey = t.toISOString().split('T')[0];
    const hour = t.getHours();

    if (!hourly[dateKey]) hourly[dateKey] = {};
    if (!hourly[dateKey][hour]) hourly[dateKey][hour] = { speeds: [], dirs: [], gusts: [], temps: [], pressures: [] };

    if (speeds[i] != null) hourly[dateKey][hour].speeds.push(speeds[i]);
    if (dirs[i] != null) hourly[dateKey][hour].dirs.push(dirs[i]);
    if (gusts[i] != null) hourly[dateKey][hour].gusts.push(gusts[i]);
    if (temps[i] != null) hourly[dateKey][hour].temps.push(temps[i]);
    if (pressures[i] != null) hourly[dateKey][hour].pressures.push(pressures[i]);
  }

  // Average each hour
  const result = {};
  for (const [date, hours] of Object.entries(hourly)) {
    result[date] = {};
    for (const [hour, data] of Object.entries(hours)) {
      const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      result[date][hour] = {
        speed: avg(data.speeds),
        direction: avg(data.dirs),
        gust: data.gusts.length > 0 ? Math.max(...data.gusts) : null,
        temp: avg(data.temps),
        pressure: avg(data.pressures),
      };
    }
  }
  return result;
}

// ─── PREDICTION SIMULATION ───────────────────────────────────────

function simulatePrediction(hourData, stationData) {
  // Reconstruct what our model would have predicted at this hour
  const fps = hourData.FPS || {};
  const kslc = hourData.KSLC || {};
  const kpvu = hourData.KPVU || {};
  const qsf = hourData.QSF || {};

  // Step A: Pressure gradient
  let pressureScore = 50;
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 2.0) pressureScore = 0;
    else if (gradient > 1.0) pressureScore = 25;
    else if (gradient > 0) pressureScore = 50;
    else if (gradient > -1.5) pressureScore = 75;
    else pressureScore = 95;
  }

  // Step B: Thermal delta (temp difference between low and high)
  let thermalScore = 50;
  if (fps.temp != null && kslc.temp != null) {
    const delta = fps.temp - kslc.temp;
    if (delta > 15) thermalScore = 95;
    else if (delta > 10) thermalScore = 85;
    else if (delta > 5) thermalScore = 70;
    else if (delta > 0) thermalScore = 50;
    else thermalScore = 20;
  }

  // Step C: Convergence — direction match
  let convergenceScore = 50;
  if (fps.direction != null) {
    const dir = fps.direction;
    // SE thermal optimal: 90-180
    if (dir >= 90 && dir <= 180) convergenceScore = 95;
    else if (dir >= 60 && dir <= 210) convergenceScore = 60;
    // North flow: 315-45
    else if (dir >= 315 || dir <= 45) convergenceScore = 70;
    else convergenceScore = 20;
  }

  // Early indicator: Spanish Fork SE
  let qsfBoost = 1.0;
  if (qsf.direction != null && qsf.speed != null) {
    if (qsf.direction >= 100 && qsf.direction <= 180 && qsf.speed >= 6) {
      qsfBoost = 1.3;
    }
  }

  // North flow indicator
  let northBoost = 1.0;
  if (kslc.direction != null && kslc.speed != null) {
    if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 8) {
      northBoost = 1.3;
    }
  }

  // Weighted probability
  const rawProb = (pressureScore * 0.40 + thermalScore * 0.40 + convergenceScore * 0.20);
  const probability = Math.min(95, Math.max(0, rawProb * qsfBoost * northBoost));

  // Predicted speed (rough estimate from indicators)
  let expectedSpeed = fps.speed || 0;
  if (kslc.speed >= 10 && (kslc.direction >= 315 || kslc.direction <= 45)) {
    expectedSpeed = Math.max(expectedSpeed, kslc.speed * 1.3);
  }

  // Determine predicted wind type
  let windType = 'calm';
  if (fps.direction != null) {
    if (fps.direction >= 90 && fps.direction <= 180) windType = 'thermal';
    else if (fps.direction >= 315 || fps.direction <= 45) windType = 'north_flow';
    else if (fps.speed >= 8) windType = 'other';
  }

  return {
    probability: Math.round(probability),
    expectedSpeed,
    windType,
    pressureScore,
    thermalScore,
    convergenceScore,
    predictedKiteable: probability >= 50,
    predictedFoilKiteable: probability >= 40 && expectedSpeed >= 8,
  };
}

function getActual(hourData) {
  const fps = hourData.FPS || {};
  const speed = fps.speed || 0;
  const dir = fps.direction;
  const gust = fps.gust || speed;

  let windType = 'calm';
  if (dir != null) {
    if (dir >= 90 && dir <= 180) windType = 'thermal';
    else if (dir >= 315 || dir <= 45) windType = 'north_flow';
    else if (speed >= 8) windType = 'other';
  }

  return {
    avgSpeed: speed,
    maxGust: gust,
    direction: dir,
    windType,
    isKiteable: speed >= FOIL_MIN_SPEED,
    isFoilKiteable: speed >= FOIL_MIN_SPEED,
    isTwinTipKiteable: speed >= TWIN_TIP_MIN_SPEED,
  };
}

function scoreAccuracy(prediction, actual) {
  const speedError = Math.abs((prediction.expectedSpeed || 0) - (actual.avgSpeed || 0));
  const speedAccuracy = Math.max(0, 100 - speedError * 5);

  const dirError = prediction.windType === actual.windType ? 0 : 1;
  const dirAccuracy = dirError === 0 ? 100 : 30;

  const kiteableCorrect = prediction.predictedKiteable === actual.isKiteable;

  const overall = Math.round(
    speedAccuracy * 0.3 +
    dirAccuracy * 0.2 +
    (kiteableCorrect ? 100 : 0) * 0.3 +
    (prediction.windType === actual.windType ? 100 : 0) * 0.2
  );

  return {
    speedError,
    speedAccuracy: Math.round(speedAccuracy),
    windTypeCorrect: prediction.windType === actual.windType,
    kiteableCorrect,
    overallScore: overall,
  };
}

// ─── LEARNING ENGINE (offline version) ───────────────────────────

function runLearning(allResults) {
  // Analyze errors across all predictions
  let totalSpeedBias = 0;
  let speedBiasCount = 0;
  let thermalCorrect = 0;
  let thermalTotal = 0;
  let northCorrect = 0;
  let northTotal = 0;

  const hourlyAccuracy = {};
  const probBuckets = {
    '0-20': { predicted: 0, actualKiteable: 0 },
    '20-40': { predicted: 0, actualKiteable: 0 },
    '40-60': { predicted: 0, actualKiteable: 0 },
    '60-80': { predicted: 0, actualKiteable: 0 },
    '80-100': { predicted: 0, actualKiteable: 0 },
  };

  for (const r of allResults) {
    // Speed bias
    if (r.prediction.expectedSpeed != null && r.actual.avgSpeed != null) {
      totalSpeedBias += r.prediction.expectedSpeed - r.actual.avgSpeed;
      speedBiasCount++;
    }

    // Wind type accuracy
    if (r.prediction.windType === 'thermal') {
      thermalTotal++;
      if (r.accuracy.windTypeCorrect) thermalCorrect++;
    }
    if (r.prediction.windType === 'north_flow') {
      northTotal++;
      if (r.accuracy.windTypeCorrect) northCorrect++;
    }

    // Hourly accuracy
    const h = r.hour;
    if (!hourlyAccuracy[h]) hourlyAccuracy[h] = { sum: 0, count: 0 };
    hourlyAccuracy[h].sum += r.accuracy.overallScore;
    hourlyAccuracy[h].count++;

    // Probability calibration
    const p = r.prediction.probability;
    const bucket = p < 20 ? '0-20' : p < 40 ? '20-40' : p < 60 ? '40-60' : p < 80 ? '60-80' : '80-100';
    probBuckets[bucket].predicted++;
    if (r.actual.isKiteable) probBuckets[bucket].actualKiteable++;
  }

  // Calculate new weights
  const avgSpeedBias = speedBiasCount > 0 ? totalSpeedBias / speedBiasCount : 0;
  const thermalRate = thermalTotal > 0 ? thermalCorrect / thermalTotal : 0.5;
  const northRate = northTotal > 0 ? northCorrect / northTotal : 0.5;

  // Adjust weights based on accuracy
  const basePressure = 0.40;
  const baseThermal = 0.40;
  const baseConvergence = 0.20;

  const newWeights = {
    version: Date.now(),
    createdAt: new Date().toISOString(),
    basedOnSamples: allResults.length,

    pressureWeight: basePressure * (0.5 + northRate * 0.5),
    thermalWeight: baseThermal * (0.5 + thermalRate * 0.5),
    convergenceWeight: baseConvergence,

    speedBiasCorrection: -avgSpeedBias,

    indicators: {},
    probabilityCalibration: {},
    hourlyMultipliers: {},
  };

  // Probability calibration
  for (const [bucket, data] of Object.entries(probBuckets)) {
    if (data.predicted >= 5) {
      const midpoint = (parseInt(bucket.split('-')[0]) + parseInt(bucket.split('-')[1])) / 200;
      const actualRate = data.actualKiteable / data.predicted;
      newWeights.probabilityCalibration[bucket] = midpoint > 0 ? actualRate / midpoint : 1;
    }
  }

  // Hourly multipliers
  for (const [hour, data] of Object.entries(hourlyAccuracy)) {
    if (data.count >= 5) {
      const avg = data.sum / data.count;
      newWeights.hourlyMultipliers[hour] = avg / 100;
    }
  }

  return { weights: newWeights, stats: { avgSpeedBias, thermalRate, northRate, probBuckets, hourlyAccuracy } };
}

// ─── MAIN ─────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  UTAH WIND PRO — HISTORICAL BACKTEST & MODEL TRAINING');
  console.log('═══════════════════════════════════════════════════════════\n');

  const allResults = [];
  const stationIds = Object.values(STATIONS).join(',');

  for (const range of BACKTEST_RANGES) {
    console.log(`\n▶ ${range.label}: ${range.start} → ${range.end}`);
    console.log('─'.repeat(55));

    // Split into 5-day chunks to avoid API limits
    const chunks = splitDateRange(range.start, range.end, 5);
    const allStationData = {};

    for (const chunk of chunks) {
      process.stdout.write(`  Fetching ${chunk.start} to ${chunk.end}...`);
      
      const url = `https://api.synopticdata.com/v2/stations/timeseries?` +
        `stid=${stationIds}` +
        `&start=${fmt(new Date(chunk.start + 'T00:00:00-06:00').toISOString())}` +
        `&end=${fmt(new Date(chunk.end + 'T23:59:00-06:00').toISOString())}` +
        `&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure` +
        `&units=english&obtimezone=local&token=${SYNOPTIC_TOKEN}`;

      try {
        const data = await fetchJSON(url);
        if (data.STATION) {
          for (const station of data.STATION) {
            const stid = station.STID;
            const parsed = parseStationData(station);
            if (!allStationData[stid]) allStationData[stid] = {};
            Object.assign(allStationData[stid], parsed);
          }
        }
        process.stdout.write(` OK (${data.STATION?.length || 0} stations)\n`);
      } catch (e) {
        process.stdout.write(` ERROR: ${e.message}\n`);
      }

      // Rate limit: 200ms between requests
      await sleep(200);
    }

    // Now simulate predictions for each day in the range
    const dates = getDatesInRange(range.start, range.end);
    let rangeResults = [];

    console.log(`\n  Processing ${dates.length} days...\n`);
    console.log('  Date       | Hour | Pred% | Actual mph | Type     | Score | Match');
    console.log('  ' + '─'.repeat(70));

    for (const date of dates) {
      for (let hour = KITE_HOUR_START; hour <= KITE_HOUR_END; hour++) {
        // Build hourly snapshot from all stations
        const hourSnap = {};
        for (const [label, stid] of Object.entries(STATIONS)) {
          if (allStationData[stid] && allStationData[stid][date] && allStationData[stid][date][hour]) {
            hourSnap[label] = allStationData[stid][date][hour];
          }
        }

        if (!hourSnap.FPS) continue; // Need ground truth

        const prediction = simulatePrediction(hourSnap, allStationData);
        const actual = getActual(hourSnap);
        const accuracy = scoreAccuracy(prediction, actual);

        const result = {
          date,
          hour,
          range: range.label,
          prediction,
          actual,
          accuracy,
        };

        rangeResults.push(result);
        allResults.push(result);

        // Print notable hours (peak window)
        if (hour >= 11 && hour <= 15) {
          const match = accuracy.kiteableCorrect ? '✓' : '✗';
          const typeMatch = accuracy.windTypeCorrect ? '✓' : '✗';
          console.log(
            `  ${date} | ${String(hour).padStart(2)}:00 | ` +
            `${String(prediction.probability).padStart(3)}%  | ` +
            `${actual.avgSpeed.toFixed(1).padStart(5)} mph    | ` +
            `${actual.windType.padEnd(8)} | ` +
            `${String(accuracy.overallScore).padStart(3)}%  | ` +
            `${match} kite ${typeMatch} type`
          );
        }
      }
    }

    // Range summary
    const rangeAvgAccuracy = rangeResults.length > 0
      ? rangeResults.reduce((s, r) => s + r.accuracy.overallScore, 0) / rangeResults.length
      : 0;
    const kiteableDays = new Set(rangeResults.filter(r => r.actual.isKiteable).map(r => r.date)).size;
    const totalDays = new Set(rangeResults.map(r => r.date)).size;
    const kiteCorrect = rangeResults.filter(r => r.accuracy.kiteableCorrect).length;

    console.log(`\n  ┌─ ${range.label} Summary ─────────────────────────┐`);
    console.log(`  │ Days processed:      ${totalDays.toString().padStart(6)}              │`);
    console.log(`  │ Kiteable days:       ${kiteableDays.toString().padStart(6)} (${Math.round(kiteableDays/totalDays*100)}%)          │`);
    console.log(`  │ Total predictions:   ${rangeResults.length.toString().padStart(6)}              │`);
    console.log(`  │ Avg accuracy:        ${rangeAvgAccuracy.toFixed(1).padStart(5)}%             │`);
    console.log(`  │ Kite pred correct:   ${kiteCorrect.toString().padStart(6)} (${Math.round(kiteCorrect/rangeResults.length*100)}%)          │`);
    console.log(`  └────────────────────────────────────────────────┘`);
  }

  // ─── Run Learning ──────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  LEARNING FROM HISTORICAL DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { weights, stats } = runLearning(allResults);

  console.log(`  Total samples:           ${allResults.length}`);
  console.log(`  Avg speed bias:          ${stats.avgSpeedBias > 0 ? '+' : ''}${stats.avgSpeedBias.toFixed(2)} mph (model ${stats.avgSpeedBias > 0 ? 'over' : 'under'}-predicts)`);
  console.log(`  Speed bias correction:   ${weights.speedBiasCorrection > 0 ? '+' : ''}${weights.speedBiasCorrection.toFixed(2)} mph`);
  console.log(`  Thermal type accuracy:   ${(stats.thermalRate * 100).toFixed(1)}%`);
  console.log(`  North flow accuracy:     ${(stats.northRate * 100).toFixed(1)}%`);
  console.log();
  console.log('  Learned Weights:');
  console.log(`    Pressure:    ${weights.pressureWeight.toFixed(4)} (default: 0.4000)`);
  console.log(`    Thermal:     ${weights.thermalWeight.toFixed(4)} (default: 0.4000)`);
  console.log(`    Convergence: ${weights.convergenceWeight.toFixed(4)} (default: 0.2000)`);
  console.log();

  // Probability calibration
  console.log('  Probability Calibration (predicted bucket → actual kiteable rate):');
  for (const [bucket, data] of Object.entries(stats.probBuckets)) {
    const rate = data.predicted > 0 ? (data.actualKiteable / data.predicted * 100).toFixed(1) : 'N/A';
    const cal = weights.probabilityCalibration[bucket];
    console.log(`    ${bucket}%: ${data.predicted} predictions, ${rate}% actually kiteable${cal ? ` (cal: ${cal.toFixed(3)})` : ''}`);
  }
  console.log();

  // Hourly accuracy
  console.log('  Hourly Model Accuracy:');
  for (let h = KITE_HOUR_START; h <= KITE_HOUR_END; h++) {
    const data = stats.hourlyAccuracy[h];
    if (data) {
      const avg = data.sum / data.count;
      const mult = weights.hourlyMultipliers[h];
      const bar = '█'.repeat(Math.round(avg / 5));
      console.log(`    ${String(h).padStart(2)}:00  ${bar} ${avg.toFixed(1)}%${mult ? ` (×${mult.toFixed(3)})` : ''} [${data.count} samples]`);
    }
  }

  // ─── Now re-run predictions with learned weights ───────────────
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  VALIDATION: RE-RUN WITH LEARNED WEIGHTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  let improvedCount = 0;
  let degradedCount = 0;
  let totalOriginal = 0;
  let totalImproved = 0;

  for (const r of allResults) {
    // Re-calculate probability with learned weights
    const pW = weights.pressureWeight;
    const tW = weights.thermalWeight;
    const cW = weights.convergenceWeight;

    const rawProb = (
      r.prediction.pressureScore * pW +
      r.prediction.thermalScore * tW +
      r.prediction.convergenceScore * cW
    );

    // Apply hourly multiplier
    const hourMult = weights.hourlyMultipliers[r.hour] || 1.0;
    let newProb = rawProb * hourMult;

    // Apply probability calibration
    const bucket = newProb < 20 ? '0-20' : newProb < 40 ? '20-40' : newProb < 60 ? '40-60' : newProb < 80 ? '60-80' : '80-100';
    const cal = weights.probabilityCalibration[bucket];
    if (cal) newProb *= cal;

    newProb = Math.min(95, Math.max(0, Math.round(newProb)));

    // Apply speed bias correction
    const correctedSpeed = Math.max(0, (r.prediction.expectedSpeed || 0) + weights.speedBiasCorrection);

    // Score the improved prediction
    const improvedPred = {
      ...r.prediction,
      probability: newProb,
      expectedSpeed: correctedSpeed,
      predictedKiteable: newProb >= 50,
    };
    const newAccuracy = scoreAccuracy(improvedPred, r.actual);

    totalOriginal += r.accuracy.overallScore;
    totalImproved += newAccuracy.overallScore;

    if (newAccuracy.overallScore > r.accuracy.overallScore) improvedCount++;
    else if (newAccuracy.overallScore < r.accuracy.overallScore) degradedCount++;
  }

  const avgOriginal = totalOriginal / allResults.length;
  const avgImproved = totalImproved / allResults.length;
  const improvement = avgImproved - avgOriginal;

  console.log(`  Original model accuracy:  ${avgOriginal.toFixed(1)}%`);
  console.log(`  Trained model accuracy:   ${avgImproved.toFixed(1)}%`);
  console.log(`  Improvement:              ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  console.log(`  Predictions improved:     ${improvedCount} / ${allResults.length}`);
  console.log(`  Predictions degraded:     ${degradedCount} / ${allResults.length}`);
  console.log();

  // ─── Save trained weights ──────────────────────────────────────
  const outputPath = path.join(__dirname, '..', 'src', 'config', 'trainedWeights.json');
  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      method: 'historical-backtest',
      samples: allResults.length,
      dateRanges: BACKTEST_RANGES.map(r => `${r.label}: ${r.start} to ${r.end}`),
      originalAccuracy: avgOriginal.toFixed(1) + '%',
      trainedAccuracy: avgImproved.toFixed(1) + '%',
      improvement: (improvement > 0 ? '+' : '') + improvement.toFixed(1) + '%',
    },
    weights,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`  Trained weights saved to: src/config/trainedWeights.json`);

  // ─── Day-by-day best wind summary ──────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TOP WIND DAYS DISCOVERED');
  console.log('═══════════════════════════════════════════════════════════\n');

  const dayStats = {};
  for (const r of allResults) {
    if (!dayStats[r.date]) dayStats[r.date] = { maxSpeed: 0, maxGust: 0, kiteableHours: 0, avgSpeed: 0, count: 0, range: r.range, types: {} };
    const ds = dayStats[r.date];
    ds.maxSpeed = Math.max(ds.maxSpeed, r.actual.avgSpeed || 0);
    ds.maxGust = Math.max(ds.maxGust, r.actual.maxGust || 0);
    if (r.actual.isKiteable) ds.kiteableHours++;
    ds.avgSpeed += r.actual.avgSpeed || 0;
    ds.count++;
    ds.types[r.actual.windType] = (ds.types[r.actual.windType] || 0) + 1;
  }

  const sortedDays = Object.entries(dayStats)
    .map(([date, s]) => ({ date, ...s, avgSpeed: s.avgSpeed / s.count }))
    .sort((a, b) => b.kiteableHours - a.kiteableHours || b.maxSpeed - a.maxSpeed)
    .slice(0, 20);

  console.log('  Date       | Max mph | Gust | Kite hrs | Avg mph | Dominant Type | Range');
  console.log('  ' + '─'.repeat(78));

  for (const day of sortedDays) {
    const dominant = Object.entries(day.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';
    console.log(
      `  ${day.date} | ${day.maxSpeed.toFixed(1).padStart(5)} mph | ` +
      `${(day.maxGust || 0).toFixed(0).padStart(4)} | ` +
      `${String(day.kiteableHours).padStart(4)} hrs  | ` +
      `${day.avgSpeed.toFixed(1).padStart(5)} mph | ` +
      `${dominant.padEnd(13)} | ${day.range}`
    );
  }

  console.log('\n  Done! The trained weights are ready to be loaded into the app.');
  console.log('  The learning system will continue to refine them with live data.\n');
}

// ─── Utility ──────────────────────────────────────────────────────

function splitDateRange(start, end, chunkDays) {
  const chunks = [];
  let current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());
    
    chunks.push({
      start: current.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });
    
    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }
  return chunks;
}

function getDatesInRange(start, end) {
  const dates = [];
  let current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run it
main().catch(console.error);
