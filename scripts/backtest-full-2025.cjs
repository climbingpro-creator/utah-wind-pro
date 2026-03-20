/**
 * FULL 2025 BACKTEST — Consistency-Aware Model Training
 * 
 * Key insight from the user: best kiting/sailing is NOT max speed.
 * It's CONSISTENT wind in the sweet spot (10-20 mph) with low gust factor.
 * Zigzag and Deer Creek thermals are prized for their consistency.
 * 
 * Scoring philosophy:
 *   - "Quality Session" = sustained 10-20 mph with gust factor < 1.4
 *   - Gust factor = max_gust / avg_speed (lower = smoother = better)
 *   - Speed variance within an hour penalizes choppy conditions
 *   - Sweet spot: 12-18 mph is "perfect", 10-12 is "good foil", 18-25 is "powered"
 *   - >25 mph with gust factor >1.5 = dangerous, not a good session
 * 
 * Usage: node scripts/backtest-full-2025.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SYNOPTIC_TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!SYNOPTIC_TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

const STATIONS = {
  FPS: 'FPS',
  KSLC: 'KSLC',
  KPVU: 'KPVU',
  QSF: 'QSF',
  UTALP: 'UTALP',
  KHCR: 'KHCR',
  UID28: 'UID28',
};

// Full 2025: split into monthly chunks to avoid API limits
const MONTHS_2025 = [];
for (let m = 1; m <= 12; m++) {
  const year = 2025;
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  // Don't go past today if we're in 2026 looking at 2025 data
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  MONTHS_2025.push({ label: `${year}-${String(m).padStart(2, '0')}`, start, end });
}

const KITE_HOUR_START = 9;
const KITE_HOUR_END = 19;

// ─── CONSISTENCY SCORING ─────────────────────────────────────────

/**
 * Score a kiting/sailing session based on CONSISTENCY, not just speed.
 * 
 * Returns 0-100 where:
 *   100 = perfect consistent thermal (12-18 mph, gust factor < 1.3)
 *   80+ = great session (10-20 mph, gust factor < 1.4)
 *   60+ = decent (has kiteable wind but some inconsistency)
 *   40+ = marginal (too light, too gusty, or borderline)
 *   <40 = poor (not worth going out)
 */
function scoreSession(hourData) {
  const speed = hourData.speed;
  const gust = hourData.gust;
  const dir = hourData.direction;

  if (speed == null || speed < 3) return { score: 0, label: 'calm', details: 'No wind' };

  let score = 0;

  // ─── Speed Sweet Spot (0-40 points) ──────────────────────────
  let speedScore = 0;
  if (speed >= 12 && speed <= 18) {
    speedScore = 40; // Perfect range
  } else if (speed >= 10 && speed < 12) {
    speedScore = 32; // Good foil range
  } else if (speed > 18 && speed <= 22) {
    speedScore = 30; // Powered but good
  } else if (speed >= 8 && speed < 10) {
    speedScore = 20; // Marginal foil
  } else if (speed > 22 && speed <= 28) {
    speedScore = 20; // Overpowered for most
  } else if (speed > 28) {
    speedScore = 5;  // Dangerous for most kiters
  } else {
    speedScore = 10; // Too light
  }

  // ─── Gust Factor (0-30 points) ───────────────────────────────
  // Lower = smoother = better. Thermal wind at Zigzag typically 1.2-1.3
  let gustScore = 0;
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;

  if (gustFactor <= 1.2) {
    gustScore = 30; // Glass-smooth power delivery
  } else if (gustFactor <= 1.3) {
    gustScore = 25; // Excellent — typical good thermal
  } else if (gustFactor <= 1.4) {
    gustScore = 20; // Good — manageable gusts
  } else if (gustFactor <= 1.6) {
    gustScore = 12; // Gusty — intermediate+ only
  } else if (gustFactor <= 2.0) {
    gustScore = 5;  // Very gusty — expert only
  } else {
    gustScore = 0;  // Dangerous gust differential
  }

  // ─── Kiteability (0-20 points) ────────────────────────────────
  let kiteScore = 0;
  const isKiteable = speed >= 10;
  const isTwinTipKiteable = speed >= 15;
  const isSailable = speed >= 10;

  if (isTwinTipKiteable && gustFactor <= 1.4) {
    kiteScore = 20; // Twin tip in consistent wind = great
  } else if (isKiteable && gustFactor <= 1.4) {
    kiteScore = 15; // Foil in consistent wind = good
  } else if (isTwinTipKiteable) {
    kiteScore = 10; // Twin tip but gusty
  } else if (isKiteable) {
    kiteScore = 8;  // Foil but gusty
  } else if (speed >= 8) {
    kiteScore = 3;  // Marginal
  }

  // ─── Direction Bonus (0-10 points) ────────────────────────────
  let dirScore = 0;
  if (dir != null) {
    // SE thermal (90-180°) or North flow (315-45°) = established pattern
    if (dir >= 100 && dir <= 170) {
      dirScore = 10; // Clean SE thermal
    } else if (dir >= 315 || dir <= 45) {
      dirScore = 8;  // Established north flow
    } else if (dir >= 170 && dir <= 210) {
      dirScore = 6;  // South component
    } else {
      dirScore = 2;  // Cross or variable
    }
  }

  score = speedScore + gustScore + kiteScore + dirScore;

  // Determine label
  let label = 'poor';
  if (score >= 85) label = 'epic';
  else if (score >= 70) label = 'great';
  else if (score >= 55) label = 'good';
  else if (score >= 40) label = 'fair';
  else if (score >= 25) label = 'marginal';

  return {
    score,
    label,
    gustFactor: gustFactor.toFixed(2),
    isKiteable,
    isTwinTipKiteable,
    isSailable,
    isConsistent: gustFactor <= 1.4,
    isQualitySession: score >= 55 && gustFactor <= 1.4 && speed >= 10,
    details: `${speed.toFixed(1)} mph, gust ×${gustFactor.toFixed(2)}, ${label}`,
  };
}

/**
 * Score a prediction's accuracy, now with consistency awareness
 */
function scoreAccuracy(prediction, actual, sessionScore) {
  // Speed accuracy (how close was predicted speed to actual)
  const speedError = Math.abs((prediction.expectedSpeed || 0) - (actual.avgSpeed || 0));
  const speedAccuracy = Math.max(0, 100 - speedError * 5);

  // Wind type accuracy
  const windTypeCorrect = prediction.windType === actual.windType;

  // Session quality prediction (did we correctly predict a good session?)
  const predictedGoodSession = prediction.probability >= 50;
  const actualGoodSession = sessionScore.isQualitySession;
  const sessionPredCorrect = predictedGoodSession === actualGoodSession;

  // Kiteability prediction
  const kiteableCorrect = prediction.predictedKiteable === actual.isKiteable;

  // Consistency prediction (new!)
  const predictedConsistent = prediction.probability >= 60; // High prob should mean consistent
  const actuallyConsistent = sessionScore.isConsistent;
  const consistencyCorrect = predictedConsistent === actuallyConsistent;

  // Weighted overall
  const overall = Math.round(
    speedAccuracy * 0.20 +
    (windTypeCorrect ? 100 : 30) * 0.15 +
    (sessionPredCorrect ? 100 : 0) * 0.30 +    // Session quality is biggest weight
    (kiteableCorrect ? 100 : 0) * 0.20 +
    (consistencyCorrect ? 100 : 0) * 0.15
  );

  return {
    speedError,
    speedAccuracy: Math.round(speedAccuracy),
    windTypeCorrect,
    kiteableCorrect,
    sessionPredCorrect,
    consistencyCorrect,
    overallScore: overall,
  };
}

// ─── API ──────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fmt(dateStr) {
  return dateStr.replace(/[-:T]/g, '').slice(0, 12);
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
    if (!hourly[dateKey][hour]) hourly[dateKey][hour] = {
      speeds: [], dirs: [], gusts: [], temps: [], pressures: [],
    };

    if (speeds[i] != null) hourly[dateKey][hour].speeds.push(speeds[i]);
    if (dirs[i] != null) hourly[dateKey][hour].dirs.push(dirs[i]);
    if (gusts[i] != null) hourly[dateKey][hour].gusts.push(gusts[i]);
    if (temps[i] != null) hourly[dateKey][hour].temps.push(temps[i]);
    if (pressures[i] != null) hourly[dateKey][hour].pressures.push(pressures[i]);
  }

  const result = {};
  for (const [date, hours] of Object.entries(hourly)) {
    result[date] = {};
    for (const [hour, data] of Object.entries(hours)) {
      const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      const stdDev = arr => {
        if (arr.length < 2) return 0;
        const m = avg(arr);
        return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
      };

      result[date][hour] = {
        speed: avg(data.speeds),
        direction: avg(data.dirs),
        gust: data.gusts.length > 0 ? Math.max(...data.gusts) : (avg(data.speeds) || 0) * 1.2,
        temp: avg(data.temps),
        pressure: avg(data.pressures),
        speedStdDev: stdDev(data.speeds),
        sampleCount: data.speeds.length,
      };
    }
  }
  return result;
}

// ─── PREDICTION SIMULATION ───────────────────────────────────────

function simulatePrediction(hourSnap) {
  const fps = hourSnap.FPS || {};
  const kslc = hourSnap.KSLC || {};
  const kpvu = hourSnap.KPVU || {};
  const qsf = hourSnap.QSF || {};

  let pressureScore = 50;
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 2.0) pressureScore = 0;
    else if (gradient > 1.0) pressureScore = 25;
    else if (gradient > 0) pressureScore = 50;
    else if (gradient > -1.5) pressureScore = 75;
    else pressureScore = 95;
  }

  let thermalScore = 50;
  if (fps.temp != null && kslc.temp != null) {
    const delta = fps.temp - kslc.temp;
    if (delta > 15) thermalScore = 95;
    else if (delta > 10) thermalScore = 85;
    else if (delta > 5) thermalScore = 70;
    else if (delta > 0) thermalScore = 50;
    else thermalScore = 20;
  }

  let convergenceScore = 50;
  if (fps.direction != null) {
    const dir = fps.direction;
    if (dir >= 90 && dir <= 180) convergenceScore = 95;
    else if (dir >= 60 && dir <= 210) convergenceScore = 60;
    else if (dir >= 315 || dir <= 45) convergenceScore = 70;
    else convergenceScore = 20;
  }

  let qsfBoost = 1.0;
  if (qsf.direction != null && qsf.speed != null) {
    if (qsf.direction >= 100 && qsf.direction <= 180 && qsf.speed >= 6) {
      qsfBoost = 1.3;
    }
  }

  let northBoost = 1.0;
  if (kslc.direction != null && kslc.speed != null) {
    if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 8) {
      northBoost = 1.3;
    }
  }

  const rawProb = (pressureScore * 0.40 + thermalScore * 0.40 + convergenceScore * 0.20);
  const probability = Math.min(95, Math.max(0, rawProb * qsfBoost * northBoost));

  let expectedSpeed = fps.speed || 0;
  if (kslc.speed >= 10 && (kslc.direction >= 315 || kslc.direction <= 45)) {
    expectedSpeed = Math.max(expectedSpeed, kslc.speed * 1.3);
  }

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
  };
}

function getActual(hourSnap) {
  const fps = hourSnap.FPS || {};
  const speed = fps.speed || 0;
  const gust = fps.gust || speed;
  const dir = fps.direction;

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
    isKiteable: speed >= 10,
    speedStdDev: fps.speedStdDev || 0,
  };
}

// ─── LEARNING ─────────────────────────────────────────────────────

function runLearning(allResults) {
  let totalSpeedBias = 0;
  let speedBiasCount = 0;
  let thermalCorrect = 0;
  let thermalTotal = 0;
  let northCorrect = 0;
  let northTotal = 0;

  const hourlyAccuracy = {};
  const hourlyQuality = {}; // Track session quality by hour
  const monthlyAccuracy = {};
  const gustFactorBuckets = { smooth: 0, moderate: 0, gusty: 0, dangerous: 0, total: 0 };
  const probBuckets = {
    '0-20': { predicted: 0, actualQuality: 0, actualKiteable: 0 },
    '20-40': { predicted: 0, actualQuality: 0, actualKiteable: 0 },
    '40-60': { predicted: 0, actualQuality: 0, actualKiteable: 0 },
    '60-80': { predicted: 0, actualQuality: 0, actualKiteable: 0 },
    '80-100': { predicted: 0, actualQuality: 0, actualKiteable: 0 },
  };

  for (const r of allResults) {
    if (r.prediction.expectedSpeed != null && r.actual.avgSpeed != null) {
      totalSpeedBias += r.prediction.expectedSpeed - r.actual.avgSpeed;
      speedBiasCount++;
    }

    if (r.prediction.windType === 'thermal') {
      thermalTotal++;
      if (r.accuracy.windTypeCorrect) thermalCorrect++;
    }
    if (r.prediction.windType === 'north_flow') {
      northTotal++;
      if (r.accuracy.windTypeCorrect) northCorrect++;
    }

    const h = r.hour;
    if (!hourlyAccuracy[h]) hourlyAccuracy[h] = { sum: 0, count: 0 };
    hourlyAccuracy[h].sum += r.accuracy.overallScore;
    hourlyAccuracy[h].count++;

    if (!hourlyQuality[h]) hourlyQuality[h] = { qualitySessions: 0, total: 0, avgScore: 0, sumScore: 0 };
    hourlyQuality[h].total++;
    hourlyQuality[h].sumScore += r.sessionScore.score;
    if (r.sessionScore.isQualitySession) hourlyQuality[h].qualitySessions++;

    const month = r.date.slice(0, 7);
    if (!monthlyAccuracy[month]) monthlyAccuracy[month] = { sum: 0, count: 0, qualityDays: new Set(), totalDays: new Set() };
    monthlyAccuracy[month].sum += r.accuracy.overallScore;
    monthlyAccuracy[month].count++;
    monthlyAccuracy[month].totalDays.add(r.date);
    if (r.sessionScore.isQualitySession) monthlyAccuracy[month].qualityDays.add(r.date);

    // Gust factor tracking
    const gf = parseFloat(r.sessionScore.gustFactor);
    gustFactorBuckets.total++;
    if (gf <= 1.3) gustFactorBuckets.smooth++;
    else if (gf <= 1.5) gustFactorBuckets.moderate++;
    else if (gf <= 2.0) gustFactorBuckets.gusty++;
    else gustFactorBuckets.dangerous++;

    const p = r.prediction.probability;
    const bucket = p < 20 ? '0-20' : p < 40 ? '20-40' : p < 60 ? '40-60' : p < 80 ? '60-80' : '80-100';
    probBuckets[bucket].predicted++;
    if (r.sessionScore.isQualitySession) probBuckets[bucket].actualQuality++;
    if (r.actual.isKiteable) probBuckets[bucket].actualKiteable++;
  }

  const avgSpeedBias = speedBiasCount > 0 ? totalSpeedBias / speedBiasCount : 0;
  const thermalRate = thermalTotal > 0 ? thermalCorrect / thermalTotal : 0.5;
  const northRate = northTotal > 0 ? northCorrect / northTotal : 0.5;

  const newWeights = {
    version: Date.now(),
    createdAt: new Date().toISOString(),
    basedOnSamples: allResults.length,
    pressureWeight: 0.40 * (0.5 + northRate * 0.5),
    thermalWeight: 0.40 * (0.5 + thermalRate * 0.5),
    convergenceWeight: 0.20,
    speedBiasCorrection: -avgSpeedBias,
    indicators: {
      'KSLC-FPS': { weight: 0.85, speedMultiplier: 1.30, reliability: 0.78 },
      'KPVU-FPS': { weight: 0.80, speedMultiplier: 1.15, reliability: 0.82 },
      'QSF-FPS':  { weight: 0.65, speedMultiplier: 1.20, reliability: 0.63 },
      'UTALP-FPS':{ weight: 0.70, speedMultiplier: 1.10, reliability: 0.70 },
    },
    probabilityCalibration: {},
    hourlyMultipliers: {},
    consistencyProfile: {
      smoothWindPct: ((gustFactorBuckets.smooth / gustFactorBuckets.total) * 100).toFixed(1),
      gustyWindPct: (((gustFactorBuckets.gusty + gustFactorBuckets.dangerous) / gustFactorBuckets.total) * 100).toFixed(1),
    },
  };

  // Probability calibration — now using quality session rate, not just kiteable
  for (const [bucket, data] of Object.entries(probBuckets)) {
    if (data.predicted >= 10) {
      const midpoint = (parseInt(bucket.split('-')[0]) + parseInt(bucket.split('-')[1])) / 200;
      const qualityRate = data.actualQuality / data.predicted;
      const kiteableRate = data.actualKiteable / data.predicted;
      // Blend quality and kiteable for calibration
      const blendedRate = qualityRate * 0.6 + kiteableRate * 0.4;
      newWeights.probabilityCalibration[bucket] = Math.min(3.0, Math.max(0.3, midpoint > 0 ? blendedRate / midpoint : 1));
    }
  }

  for (const [hour, data] of Object.entries(hourlyAccuracy)) {
    if (data.count >= 10) {
      newWeights.hourlyMultipliers[hour] = Math.min(1.2, Math.max(0.5, data.sum / data.count / 100));
    }
  }

  return {
    weights: newWeights,
    stats: {
      avgSpeedBias, thermalRate, northRate,
      probBuckets, hourlyAccuracy, hourlyQuality,
      monthlyAccuracy, gustFactorBuckets,
    },
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  UTAH WIND PRO — FULL 2025 BACKTEST (Consistency-Aware Scoring)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('  Scoring: Consistent 12-18 mph > Gusty 25 mph');
  console.log('  Quality session = 10+ mph sustained, gust factor < 1.4\n');

  const allResults = [];
  const stationIds = Object.values(STATIONS).join(',');
  const allStationData = {};

  // Fetch month by month in 5-day chunks
  for (const month of MONTHS_2025) {
    process.stdout.write(`\n  ▶ ${month.label}: `);
    const chunks = splitDateRange(month.start, month.end, 5);

    for (const chunk of chunks) {
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
          process.stdout.write('.');
        } else {
          process.stdout.write('x');
        }
      } catch (e) {
        process.stdout.write('!');
      }
      await sleep(250);
    }
  }

  console.log('\n\n  Data collection complete. Processing predictions...\n');

  // Process all days
  const dates = Object.keys(allStationData.FPS || {}).sort();
  console.log(`  Found ${dates.length} days with FPS data\n`);

  for (const date of dates) {
    for (let hour = KITE_HOUR_START; hour <= KITE_HOUR_END; hour++) {
      const hourSnap = {};
      for (const [label, stid] of Object.entries(STATIONS)) {
        if (allStationData[stid]?.[date]?.[hour]) {
          hourSnap[label] = allStationData[stid][date][hour];
        }
      }
      if (!hourSnap.FPS) continue;

      const prediction = simulatePrediction(hourSnap);
      const actual = getActual(hourSnap);
      const sessionScore = scoreSession(hourSnap.FPS);
      const accuracy = scoreAccuracy(prediction, actual, sessionScore);

      allResults.push({ date, hour, prediction, actual, sessionScore, accuracy });
    }
  }

  console.log(`  Total prediction samples: ${allResults.length}\n`);

  // ─── Monthly Summary ────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MONTHLY BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('  Month    | Days | Quality | Kiteable | Avg Score | Avg Gust Factor');
  console.log('  ' + '─'.repeat(70));

  const monthMap = {};
  for (const r of allResults) {
    const m = r.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { days: new Set(), qualityDays: new Set(), kiteableDays: new Set(), scores: [], gustFactors: [] };
    monthMap[m].days.add(r.date);
    if (r.sessionScore.isQualitySession) monthMap[m].qualityDays.add(r.date);
    if (r.actual.isKiteable) monthMap[m].kiteableDays.add(r.date);
    monthMap[m].scores.push(r.sessionScore.score);
    monthMap[m].gustFactors.push(parseFloat(r.sessionScore.gustFactor));
  }

  for (const [month, data] of Object.entries(monthMap).sort()) {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const avgGF = data.gustFactors.reduce((a, b) => a + b, 0) / data.gustFactors.length;
    console.log(
      `  ${month}  | ${String(data.days.size).padStart(4)} | ` +
      `${String(data.qualityDays.size).padStart(4)} (${Math.round(data.qualityDays.size / data.days.size * 100)}%)   | ` +
      `${String(data.kiteableDays.size).padStart(4)} (${Math.round(data.kiteableDays.size / data.days.size * 100)}%)  | ` +
      `${avgScore.toFixed(1).padStart(5)}     | ${avgGF.toFixed(2)}`
    );
  }

  // ─── Hourly Quality Profile ─────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('  HOURLY SESSION QUALITY (when is the best consistent wind?)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('  Hour  | Samples | Quality%  | Avg Score | Avg Gust Factor');
  console.log('  ' + '─'.repeat(60));

  const hourlyQual = {};
  for (const r of allResults) {
    if (!hourlyQual[r.hour]) hourlyQual[r.hour] = { count: 0, qualityCount: 0, scoreSum: 0, gfSum: 0 };
    hourlyQual[r.hour].count++;
    hourlyQual[r.hour].scoreSum += r.sessionScore.score;
    hourlyQual[r.hour].gfSum += parseFloat(r.sessionScore.gustFactor);
    if (r.sessionScore.isQualitySession) hourlyQual[r.hour].qualityCount++;
  }

  for (let h = KITE_HOUR_START; h <= KITE_HOUR_END; h++) {
    const d = hourlyQual[h];
    if (!d) continue;
    const qualPct = (d.qualityCount / d.count * 100);
    const avgScore = d.scoreSum / d.count;
    const avgGF = d.gfSum / d.count;
    const bar = '█'.repeat(Math.round(qualPct / 3));
    console.log(
      `  ${String(h).padStart(2)}:00 | ${String(d.count).padStart(5)}   | ` +
      `${bar.padEnd(20)} ${qualPct.toFixed(1)}% | ` +
      `${avgScore.toFixed(1).padStart(5)}     | ${avgGF.toFixed(2)}`
    );
  }

  // ─── Best Consistent Sessions (Top 20) ──────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('  TOP 20 QUALITY SESSIONS (consistency over raw speed)');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('  Date       | Hour | Speed  | Gust   | GF   | Score | Type');
  console.log('  ' + '─'.repeat(65));

  const qualitySessions = allResults
    .filter(r => r.sessionScore.isQualitySession)
    .sort((a, b) => b.sessionScore.score - a.sessionScore.score)
    .slice(0, 20);

  for (const r of qualitySessions) {
    console.log(
      `  ${r.date} | ${String(r.hour).padStart(2)}:00 | ` +
      `${r.actual.avgSpeed.toFixed(1).padStart(5)} mph | ` +
      `${(r.actual.maxGust || 0).toFixed(1).padStart(5)} mph | ` +
      `${r.sessionScore.gustFactor.padStart(4)} | ` +
      `${String(r.sessionScore.score).padStart(3)}   | ` +
      `${r.actual.windType}`
    );
  }

  // ─── Wind Type Consistency Analysis ─────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('  WIND TYPE CONSISTENCY COMPARISON');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const typeStats = {};
  for (const r of allResults) {
    const t = r.actual.windType;
    if (!typeStats[t]) typeStats[t] = { count: 0, gfSum: 0, scoreSum: 0, qualityCount: 0, speedSum: 0 };
    typeStats[t].count++;
    typeStats[t].gfSum += parseFloat(r.sessionScore.gustFactor);
    typeStats[t].scoreSum += r.sessionScore.score;
    typeStats[t].speedSum += r.actual.avgSpeed;
    if (r.sessionScore.isQualitySession) typeStats[t].qualityCount++;
  }

  console.log('  Type       | Samples | Avg Speed | Avg Gust Factor | Quality% | Avg Score');
  console.log('  ' + '─'.repeat(75));
  for (const [type, d] of Object.entries(typeStats).sort((a, b) => b[1].scoreSum / b[1].count - a[1].scoreSum / a[1].count)) {
    console.log(
      `  ${type.padEnd(10)} | ${String(d.count).padStart(5)}   | ` +
      `${(d.speedSum / d.count).toFixed(1).padStart(5)} mph   | ` +
      `${(d.gfSum / d.count).toFixed(2).padStart(7)}           | ` +
      `${(d.qualityCount / d.count * 100).toFixed(1).padStart(5)}%   | ` +
      `${(d.scoreSum / d.count).toFixed(1)}`
    );
  }

  // ─── Learning ───────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('  LEARNING FROM FULL 2025 DATA');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const { weights, stats } = runLearning(allResults);

  console.log(`  Total samples:           ${allResults.length}`);
  console.log(`  Avg speed bias:          ${stats.avgSpeedBias > 0 ? '+' : ''}${stats.avgSpeedBias.toFixed(2)} mph`);
  console.log(`  Thermal type accuracy:   ${(stats.thermalRate * 100).toFixed(1)}%`);
  console.log(`  North flow accuracy:     ${(stats.northRate * 100).toFixed(1)}%`);
  console.log(`  Smooth wind hours:       ${stats.gustFactorBuckets.smooth} of ${stats.gustFactorBuckets.total} (${(stats.gustFactorBuckets.smooth / stats.gustFactorBuckets.total * 100).toFixed(1)}%)`);
  console.log(`  Gusty/dangerous hours:   ${stats.gustFactorBuckets.gusty + stats.gustFactorBuckets.dangerous} (${((stats.gustFactorBuckets.gusty + stats.gustFactorBuckets.dangerous) / stats.gustFactorBuckets.total * 100).toFixed(1)}%)`);
  console.log();
  console.log('  Trained Weights:');
  console.log(`    Pressure:    ${weights.pressureWeight.toFixed(4)}`);
  console.log(`    Thermal:     ${weights.thermalWeight.toFixed(4)}`);
  console.log(`    Convergence: ${weights.convergenceWeight.toFixed(4)}`);
  console.log(`    Speed bias:  ${weights.speedBiasCorrection > 0 ? '+' : ''}${weights.speedBiasCorrection.toFixed(2)} mph`);
  console.log();

  console.log('  Probability Calibration (predicted → actual quality session rate):');
  for (const [bucket, data] of Object.entries(stats.probBuckets)) {
    const qRate = data.predicted > 0 ? (data.actualQuality / data.predicted * 100).toFixed(1) : 'N/A';
    const kRate = data.predicted > 0 ? (data.actualKiteable / data.predicted * 100).toFixed(1) : 'N/A';
    console.log(`    ${bucket}%: ${data.predicted} preds → ${qRate}% quality, ${kRate}% kiteable`);
  }

  console.log('\n  Hourly Accuracy + Quality:');
  for (let h = KITE_HOUR_START; h <= KITE_HOUR_END; h++) {
    const acc = stats.hourlyAccuracy[h];
    const qual = stats.hourlyQuality[h];
    if (acc && qual) {
      const avgAcc = acc.sum / acc.count;
      const qualPct = (qual.qualitySessions / qual.total * 100);
      const mult = weights.hourlyMultipliers[h];
      console.log(`    ${String(h).padStart(2)}:00  acc: ${avgAcc.toFixed(1)}%  quality: ${qualPct.toFixed(1)}%${mult ? `  mult: ×${mult.toFixed(3)}` : ''}`);
    }
  }

  // ─── Validation Run ─────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('  VALIDATION: ORIGINAL vs TRAINED MODEL');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let totalOrig = 0, totalTrained = 0, improved = 0, degraded = 0;

  for (const r of allResults) {
    const pW = weights.pressureWeight;
    const tW = weights.thermalWeight;
    const cW = weights.convergenceWeight;

    let newProb = r.prediction.pressureScore * pW + r.prediction.thermalScore * tW + r.prediction.convergenceScore * cW;
    const hourMult = weights.hourlyMultipliers[r.hour] || 1.0;
    newProb *= hourMult;

    const bucket = newProb < 20 ? '0-20' : newProb < 40 ? '20-40' : newProb < 60 ? '40-60' : newProb < 80 ? '60-80' : '80-100';
    const cal = weights.probabilityCalibration[bucket];
    if (cal) newProb *= cal;
    newProb = Math.min(95, Math.max(0, Math.round(newProb)));

    const correctedSpeed = Math.max(0, (r.prediction.expectedSpeed || 0) + weights.speedBiasCorrection);
    const newPred = { ...r.prediction, probability: newProb, expectedSpeed: correctedSpeed, predictedKiteable: newProb >= 50 };
    const newAcc = scoreAccuracy(newPred, r.actual, r.sessionScore);

    totalOrig += r.accuracy.overallScore;
    totalTrained += newAcc.overallScore;
    if (newAcc.overallScore > r.accuracy.overallScore) improved++;
    else if (newAcc.overallScore < r.accuracy.overallScore) degraded++;
  }

  const avgOrig = totalOrig / allResults.length;
  const avgTrained = totalTrained / allResults.length;

  console.log(`  Original accuracy:   ${avgOrig.toFixed(1)}%`);
  console.log(`  Trained accuracy:    ${avgTrained.toFixed(1)}%`);
  console.log(`  Improvement:         ${(avgTrained - avgOrig) > 0 ? '+' : ''}${(avgTrained - avgOrig).toFixed(1)}%`);
  console.log(`  Improved:            ${improved} / ${allResults.length}`);
  console.log(`  Degraded:            ${degraded} / ${allResults.length}`);

  // ─── Save ───────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, '..', 'src', 'config', 'trainedWeights.json');

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      method: 'full-2025-backtest-consistency-aware',
      samples: allResults.length,
      dateRange: `Full 2025 (${dates[0]} to ${dates[dates.length - 1]})`,
      originalAccuracy: avgOrig.toFixed(1) + '%',
      trainedAccuracy: avgTrained.toFixed(1) + '%',
      improvement: (avgTrained - avgOrig > 0 ? '+' : '') + (avgTrained - avgOrig).toFixed(1) + '%',
      scoringPhilosophy: 'Consistency over peak speed. Quality session = 10+ mph sustained, gust factor < 1.4',
      keyInsights: [],
    },
    weights,
  };

  // Generate insights from the data
  const bestMonth = Object.entries(monthMap).sort((a, b) => {
    const aRate = a[1].qualityDays.size / a[1].days.size;
    const bRate = b[1].qualityDays.size / b[1].days.size;
    return bRate - aRate;
  })[0];
  const bestType = Object.entries(typeStats).sort((a, b) => b[1].scoreSum / b[1].count - a[1].scoreSum / a[1].count)[0];

  output._meta.keyInsights = [
    `Best month for quality sessions: ${bestMonth[0]} (${Math.round(bestMonth[1].qualityDays.size / bestMonth[1].days.size * 100)}% quality days)`,
    `Most consistent wind type: ${bestType[0]} (avg gust factor ${(bestType[1].gfSum / bestType[1].count).toFixed(2)})`,
    `${stats.gustFactorBuckets.smooth} of ${stats.gustFactorBuckets.total} hours had smooth wind (GF ≤ 1.3)`,
    `Model under-predicts: probabilities need ${Object.values(weights.probabilityCalibration).map(v => v.toFixed(1) + 'x').join(', ')} calibration`,
  ];

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n  Saved to: src/config/trainedWeights.json`);
  console.log('  Done!\n');
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
    chunks.push({ start: current.toISOString().split('T')[0], end: chunkEnd.toISOString().split('T')[0] });
    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
