/**
 * PARAGLIDING BACKTEST — 2025 Full Year
 * 
 * Point of the Mountain has two distinct flying sites:
 * 
 *   SOUTH SIDE (Flight Park South - FPS):
 *     - Needs S/SSW wind (160-200°)
 *     - Ideal: 8-14 mph with gust factor < 1.25
 *     - Best: morning through early afternoon
 *     - Indicator: KPVU (Provo Airport) S flow = thermal driving cycle
 *     - Kill signal: KSLC strong N (>12 mph) = cold front overriding thermal
 * 
 *   NORTH SIDE (Flight Park North - UTALP):
 *     - Needs N/NW wind (315-45°)
 *     - Ideal: 8-16 mph with gust factor < 1.25
 *     - Best: late afternoon / evening (the famous "glass off")
 *     - Indicator: KSLC N wind 30-60 min before it arrives at UTALP
 *     - Kill signal: KPVU strong S (>12 mph) = thermal still dominating
 * 
 * Paragliding scoring is VERY different from kiting:
 *   - Lower speed range (5-18 mph vs 10-25+ mph)
 *   - Laminar flow is critical — gust factor < 1.25 is the threshold
 *   - Direction is non-negotiable — wrong direction = can't launch
 *   - >18 mph = grounded, period
 * 
 * Usage: node scripts/backtest-paragliding-2025.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SYNOPTIC_TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!SYNOPTIC_TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

const STATIONS = {
  FPS: 'FPS',       // Flight Park South — south side ground truth
  UTALP: 'UTALP',   // Point of the Mountain — north side ground truth
  KSLC: 'KSLC',     // SLC Airport — north flow early indicator
  KPVU: 'KPVU',     // Provo Airport — south flow / thermal indicator
  UTOLY: 'UTOLY',   // Murray — valley mid-point confirmation
};

const MONTHS_2025 = [];
for (let m = 1; m <= 12; m++) {
  const year = 2025;
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  MONTHS_2025.push({ label: `${year}-${String(m).padStart(2, '0')}`, start, end });
}

// Paragliding hours: 8 AM – 8 PM (morning soaring through evening glass-off)
const PG_HOUR_START = 8;
const PG_HOUR_END = 20;

// ─── PARAGLIDING SESSION SCORING ─────────────────────────────────

function scoreSouthSession(hourData) {
  const speed = hourData.speed;
  const gust = hourData.gust;
  const dir = hourData.direction;

  if (speed == null || speed < 2) return { score: 0, label: 'calm', quality: false, flyable: false, site: 'south' };

  let score = 0;

  // Direction: CRITICAL for PG — wrong direction = no launch (0-30 pts)
  let dirScore = 0;
  if (dir != null) {
    if (dir >= 160 && dir <= 200) dirScore = 30;       // Perfect S/SSW
    else if (dir >= 140 && dir <= 220) dirScore = 20;   // Acceptable range
    else if (dir >= 120 && dir <= 240) dirScore = 8;    // Marginal cross
    else dirScore = 0;                                   // Can't launch south
  }

  // Speed: paragliding sweet spot is MUCH lower than kiting (0-35 pts)
  let speedScore = 0;
  if (speed >= 8 && speed <= 14) speedScore = 35;       // Perfect soaring range
  else if (speed >= 6 && speed < 8) speedScore = 28;    // Light but launchable
  else if (speed > 14 && speed <= 18) speedScore = 22;  // Strong but flyable
  else if (speed >= 4 && speed < 6) speedScore = 15;    // Very light — sled rides
  else if (speed > 18) speedScore = 0;                   // TOO STRONG — grounded
  else speedScore = 5;

  // Gust factor: laminar flow is EVERYTHING for PG (0-25 pts)
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  let gustScore = 0;
  if (gustFactor <= 1.15) gustScore = 25;        // Glass-smooth — dream conditions
  else if (gustFactor <= 1.25) gustScore = 20;    // Excellent laminar
  else if (gustFactor <= 1.35) gustScore = 12;    // Acceptable
  else if (gustFactor <= 1.5) gustScore = 5;      // Gusty — intermediate only
  else gustScore = 0;                              // Dangerous for PG

  // Thermal bonus: warm afternoon + moderate speed = soaring potential (0-10 pts)
  let thermalBonus = 0;
  if (hourData.temp != null && hourData.temp >= 65) {
    if (speed >= 6 && speed <= 12) thermalBonus = 10;
    else if (speed >= 4 && speed <= 14) thermalBonus = 5;
  }

  score = dirScore + speedScore + gustScore + thermalBonus;

  const flyable = dirScore >= 20 && speed >= 4 && speed <= 18 && gustFactor <= 1.5;
  const quality = score >= 55 && gustFactor <= 1.25 && speed >= 6 && speed <= 16 && dirScore >= 20;
  const label = score >= 85 ? 'epic' : score >= 70 ? 'great' : score >= 55 ? 'good'
    : score >= 40 ? 'fair' : score >= 25 ? 'marginal' : 'grounded';

  return { score, label, quality, flyable, gustFactor: +gustFactor.toFixed(2), site: 'south', dirScore, speedScore, gustScore };
}

function scoreNorthSession(hourData) {
  const speed = hourData.speed;
  const gust = hourData.gust;
  const dir = hourData.direction;

  if (speed == null || speed < 2) return { score: 0, label: 'calm', quality: false, flyable: false, site: 'north' };

  let score = 0;

  // Direction: north side needs N/NW (0-30 pts)
  let dirScore = 0;
  if (dir != null) {
    if ((dir >= 330 || dir <= 30)) dirScore = 30;        // Perfect N
    else if ((dir >= 300 || dir <= 60)) dirScore = 20;   // Acceptable NW-NE
    else if ((dir >= 270 || dir <= 90)) dirScore = 8;    // Marginal — cross
    else dirScore = 0;                                    // South — can't launch N
  }

  // Speed: north side tends to be slightly stronger, ideal 8-16 (0-35 pts)
  let speedScore = 0;
  if (speed >= 8 && speed <= 16) speedScore = 35;       // Perfect range
  else if (speed >= 6 && speed < 8) speedScore = 28;
  else if (speed > 16 && speed <= 20) speedScore = 18;  // Strong — advanced
  else if (speed >= 4 && speed < 6) speedScore = 12;
  else if (speed > 20) speedScore = 0;                   // Grounded
  else speedScore = 5;

  // Gust factor (0-25 pts)
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  let gustScore = 0;
  if (gustFactor <= 1.15) gustScore = 25;
  else if (gustFactor <= 1.25) gustScore = 20;
  else if (gustFactor <= 1.35) gustScore = 12;
  else if (gustFactor <= 1.5) gustScore = 5;
  else gustScore = 0;

  // Evening glass-off bonus: N side glass-off (5-7 PM) is legendary (0-10 pts)
  let glassOffBonus = 0;
  if (hourData.hour >= 17 && hourData.hour <= 19) {
    if (gustFactor <= 1.2 && speed >= 6 && speed <= 14) glassOffBonus = 10;
    else if (gustFactor <= 1.3 && speed >= 4) glassOffBonus = 5;
  }

  score = dirScore + speedScore + gustScore + glassOffBonus;

  const flyable = dirScore >= 20 && speed >= 4 && speed <= 20 && gustFactor <= 1.5;
  const quality = score >= 55 && gustFactor <= 1.25 && speed >= 6 && speed <= 18 && dirScore >= 20;
  const label = score >= 85 ? 'epic' : score >= 70 ? 'great' : score >= 55 ? 'good'
    : score >= 40 ? 'fair' : score >= 25 ? 'marginal' : 'grounded';

  return { score, label, quality, flyable, gustFactor: +gustFactor.toFixed(2), site: 'north', dirScore, speedScore, gustScore };
}

// ─── PREDICTION SIMULATION ───────────────────────────────────────

function simulateSouthPrediction(hourSnap) {
  const fps = hourSnap.FPS || {};
  const kslc = hourSnap.KSLC || {};
  const kpvu = hourSnap.KPVU || {};
  const utoly = hourSnap.UTOLY || {};
  const hour = hourSnap._hour;

  let prob = 30; // base

  // South flow indicator: KPVU showing S wind = thermal cycle active
  if (kpvu.direction != null && kpvu.speed != null) {
    if (kpvu.direction >= 140 && kpvu.direction <= 220) {
      if (kpvu.speed >= 5 && kpvu.speed <= 15) prob += 25;
      else if (kpvu.speed >= 3) prob += 15;
    } else if (kpvu.direction >= 315 || kpvu.direction <= 45) {
      prob -= 20; // North at Provo = thermal collapsed
    }
  }

  // KSLC as negative indicator for south: strong N at SLC = front coming
  if (kslc.direction != null && kslc.speed != null) {
    if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 12) {
      prob -= 25; // Strong north = will override thermal
    } else if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 8) {
      prob -= 10; // Moderate north = watch out
    } else if (kslc.direction >= 140 && kslc.direction <= 220 && kslc.speed >= 5) {
      prob += 10; // Valley-wide south = strong thermal day
    }
  }

  // Murray confirmation: if UTOLY shows S, thermal extends through valley
  if (utoly.direction != null && utoly.speed != null) {
    if (utoly.direction >= 140 && utoly.direction <= 220 && utoly.speed >= 3) {
      prob += 10;
    }
  }

  // Pressure gradient: slight negative (Provo higher) = thermal draw
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient < -0.5 && gradient > -2.0) prob += 15;
    else if (gradient >= -0.5 && gradient <= 0.5) prob += 5;
    else if (gradient > 2.0) prob -= 20; // Strong N push
  }

  // Temperature: warm valley = stronger thermal cycle
  if (fps.temp != null && fps.temp >= 75) prob += 10;
  else if (fps.temp != null && fps.temp >= 60) prob += 5;

  // Time of day: south side best 10 AM – 3 PM
  if (hour >= 10 && hour <= 15) prob += 10;
  else if (hour >= 8 && hour <= 17) prob += 5;

  // Predicted speed based on indicators
  let expectedSpeed = 0;
  if (kpvu.speed != null && kpvu.direction >= 140 && kpvu.direction <= 220) {
    expectedSpeed = kpvu.speed * 0.9; // FPS typically slightly less than KPVU for thermals
  } else if (fps.speed != null) {
    expectedSpeed = fps.speed;
  }

  prob = Math.min(95, Math.max(0, prob));

  return {
    probability: Math.round(prob),
    expectedSpeed: +expectedSpeed.toFixed(1),
    windType: prob >= 40 ? 'thermal_south' : 'unflyable',
    predictedFlyable: prob >= 45 && expectedSpeed >= 4 && expectedSpeed <= 18,
    predictedQuality: prob >= 60,
  };
}

function simulateNorthPrediction(hourSnap) {
  const utalp = hourSnap.UTALP || {};
  const kslc = hourSnap.KSLC || {};
  const kpvu = hourSnap.KPVU || {};
  const utoly = hourSnap.UTOLY || {};
  const fps = hourSnap.FPS || {};
  const hour = hourSnap._hour;

  let prob = 20; // base (north is less frequent)

  // KSLC is THE primary indicator for north side — 30-60 min lead
  if (kslc.direction != null && kslc.speed != null) {
    if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 8) {
      prob += 30; // Strong N at SLC = north side will fire
      if (kslc.speed >= 12) prob += 10; // Very strong signal
    } else if ((kslc.direction >= 300 || kslc.direction <= 60) && kslc.speed >= 5) {
      prob += 15; // Moderate NW/NE signal
    } else if (kslc.direction >= 140 && kslc.direction <= 220 && kslc.speed >= 8) {
      prob -= 15; // South at SLC = thermal still dominant
    }
  }

  // KPVU as negative indicator: strong S at Provo = thermal still winning
  if (kpvu.direction != null && kpvu.speed != null) {
    if (kpvu.direction >= 140 && kpvu.direction <= 220 && kpvu.speed >= 12) {
      prob -= 20; // Strong thermal = north side won't switch yet
    } else if ((kpvu.direction >= 315 || kpvu.direction <= 45) && kpvu.speed >= 5) {
      prob += 15; // Even Provo going north = strong signal
    }
  }

  // FPS switch: if FPS has gone N, UTALP follows within minutes
  if (fps.direction != null && fps.speed != null) {
    if ((fps.direction >= 315 || fps.direction <= 45) && fps.speed >= 5) {
      prob += 20; // FPS confirmed north = UTALP imminent
    }
  }

  // Murray mid-valley confirmation
  if (utoly.direction != null && utoly.speed != null) {
    if ((utoly.direction >= 315 || utoly.direction <= 45) && utoly.speed >= 5) {
      prob += 10;
    }
  }

  // Pressure gradient: positive (SLC higher) = north push
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 1.5) prob += 15;
    else if (gradient > 0.5) prob += 8;
    else if (gradient < -1.0) prob -= 10;
  }

  // Time of day: north side best 3 PM – 8 PM (glass-off is 5-7 PM)
  if (hour >= 17 && hour <= 19) prob += 15; // Glass-off window
  else if (hour >= 15 && hour <= 20) prob += 10;
  else if (hour >= 13) prob += 5;
  else prob -= 5; // Morning north is rare unless frontal

  // Predicted speed
  let expectedSpeed = 0;
  if (kslc.speed != null && (kslc.direction >= 315 || kslc.direction <= 45)) {
    expectedSpeed = kslc.speed * 0.85; // UTALP often slightly less than KSLC
  } else if (utalp.speed != null) {
    expectedSpeed = utalp.speed;
  }

  prob = Math.min(95, Math.max(0, prob));

  return {
    probability: Math.round(prob),
    expectedSpeed: +expectedSpeed.toFixed(1),
    windType: prob >= 40 ? 'north_flow' : 'unflyable',
    predictedFlyable: prob >= 45 && expectedSpeed >= 4 && expectedSpeed <= 20,
    predictedQuality: prob >= 60,
  };
}

// ─── ACCURACY SCORING ────────────────────────────────────────────

function scorePGAccuracy(prediction, actual, sessionScore) {
  const speedError = Math.abs((prediction.expectedSpeed || 0) - (actual.speed || 0));
  const speedAccuracy = Math.max(0, 100 - speedError * 6); // Tighter penalty for PG

  const flyablePredCorrect = prediction.predictedFlyable === sessionScore.flyable;
  const qualityPredCorrect = prediction.predictedQuality === sessionScore.quality;

  const overall = Math.round(
    speedAccuracy * 0.20 +
    (flyablePredCorrect ? 100 : 0) * 0.35 +
    (qualityPredCorrect ? 100 : 0) * 0.35 +
    (prediction.windType !== 'unflyable' === sessionScore.flyable ? 100 : 0) * 0.10
  );

  return { speedError, speedAccuracy, flyablePredCorrect, qualityPredCorrect, overallScore: overall };
}

// ─── API ─────────────────────────────────────────────────────────

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
      result[date][hour] = {
        speed: avg(data.speeds),
        direction: avg(data.dirs),
        gust: data.gusts.length > 0 ? Math.max(...data.gusts) : (avg(data.speeds) || 0) * 1.2,
        temp: avg(data.temps),
        pressure: avg(data.pressures),
        sampleCount: data.speeds.length,
      };
    }
  }
  return result;
}

async function fetchMonth(month) {
  const stationIds = Object.values(STATIONS).join(',');
  const start = fmt(month.start + 'T00:00');
  const end = fmt(month.end + 'T23:59');

  const url = `https://api.synopticdata.com/v2/stations/timeseries?stids=${stationIds}&start=${start}&end=${end}&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure&units=english&token=${SYNOPTIC_TOKEN}`;

  console.log(`  Fetching ${month.label}...`);

  try {
    const data = await fetchJSON(url);
    if (!data.STATION) {
      console.warn(`  ⚠️ No station data for ${month.label}`);
      return {};
    }

    const result = {};
    for (const station of data.STATION) {
      const id = station.STID;
      if (Object.values(STATIONS).includes(id)) {
        result[id] = parseStationData(station);
      }
    }
    return result;
  } catch (err) {
    console.error(`  ❌ Error fetching ${month.label}: ${err.message}`);
    return {};
  }
}

// ─── MAIN ────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   PARAGLIDING BACKTEST — Point of the Mountain 2025');
  console.log('   South Side (FPS) + North Side (UTALP)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Fetch all 2025 data
  const allStationData = {};
  for (const month of MONTHS_2025) {
    const monthData = await fetchMonth(month);
    for (const [stid, dateHours] of Object.entries(monthData)) {
      if (!allStationData[stid]) allStationData[stid] = {};
      Object.assign(allStationData[stid], dateHours);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n📊 Data fetched. Stations with data:');
  for (const [stid, data] of Object.entries(allStationData)) {
    console.log(`   ${stid}: ${Object.keys(data).length} days`);
  }

  // Process each hour for both sites
  const southResults = [];
  const northResults = [];
  const monthlyStats = {};

  const dates = new Set();
  for (const stid of Object.values(STATIONS)) {
    if (allStationData[stid]) {
      for (const d of Object.keys(allStationData[stid])) dates.add(d);
    }
  }
  const sortedDates = [...dates].sort();

  for (const date of sortedDates) {
    const month = date.slice(0, 7);
    if (!monthlyStats[month]) monthlyStats[month] = {
      south: { flyable: 0, quality: 0, total: 0, scores: [] },
      north: { flyable: 0, quality: 0, total: 0, scores: [] },
    };

    for (let hour = PG_HOUR_START; hour <= PG_HOUR_END; hour++) {
      const hourSnap = { _hour: hour };
      let hasData = false;

      for (const [stid, data] of Object.entries(allStationData)) {
        if (data[date] && data[date][hour]) {
          hourSnap[stid] = { ...data[date][hour], hour };
          if (stid === 'FPS' || stid === 'UTALP') hasData = true;
        }
      }

      if (!hasData) continue;

      // ─── SOUTH SIDE (FPS) ─────────────────────────────────
      if (hourSnap.FPS && hourSnap.FPS.speed != null) {
        const southScore = scoreSouthSession({ ...hourSnap.FPS, hour });
        const southPred = simulateSouthPrediction(hourSnap);
        const southAccuracy = scorePGAccuracy(southPred, hourSnap.FPS, southScore);

        southResults.push({
          date, hour, ...southScore,
          prediction: southPred, accuracy: southAccuracy,
          actualSpeed: hourSnap.FPS.speed,
          actualDir: hourSnap.FPS.direction,
          actualGust: hourSnap.FPS.gust,
        });

        monthlyStats[month].south.total++;
        if (southScore.flyable) monthlyStats[month].south.flyable++;
        if (southScore.quality) monthlyStats[month].south.quality++;
        monthlyStats[month].south.scores.push(southScore.score);
      }

      // ─── NORTH SIDE (UTALP) ───────────────────────────────
      if (hourSnap.UTALP && hourSnap.UTALP.speed != null) {
        const northScore = scoreNorthSession({ ...hourSnap.UTALP, hour });
        const northPred = simulateNorthPrediction(hourSnap);
        const northAccuracy = scorePGAccuracy(northPred, hourSnap.UTALP, northScore);

        northResults.push({
          date, hour, ...northScore,
          prediction: northPred, accuracy: northAccuracy,
          actualSpeed: hourSnap.UTALP.speed,
          actualDir: hourSnap.UTALP.direction,
          actualGust: hourSnap.UTALP.gust,
        });

        monthlyStats[month].north.total++;
        if (northScore.flyable) monthlyStats[month].north.flyable++;
        if (northScore.quality) monthlyStats[month].north.quality++;
        monthlyStats[month].north.scores.push(northScore.score);
      }
    }
  }

  // ─── REPORTS ────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   MONTHLY BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════');

  for (const [month, stats] of Object.entries(monthlyStats)) {
    const sAvg = stats.south.scores.length > 0
      ? (stats.south.scores.reduce((a, b) => a + b, 0) / stats.south.scores.length).toFixed(1) : '—';
    const nAvg = stats.north.scores.length > 0
      ? (stats.north.scores.reduce((a, b) => a + b, 0) / stats.north.scores.length).toFixed(1) : '—';

    console.log(`\n  ${month}:`);
    console.log(`    SOUTH: ${stats.south.total} hrs | ${stats.south.flyable} flyable (${((stats.south.flyable / Math.max(1, stats.south.total)) * 100).toFixed(0)}%) | ${stats.south.quality} quality (${((stats.south.quality / Math.max(1, stats.south.total)) * 100).toFixed(0)}%) | avg score: ${sAvg}`);
    console.log(`    NORTH: ${stats.north.total} hrs | ${stats.north.flyable} flyable (${((stats.north.flyable / Math.max(1, stats.north.total)) * 100).toFixed(0)}%) | ${stats.north.quality} quality (${((stats.north.quality / Math.max(1, stats.north.total)) * 100).toFixed(0)}%) | avg score: ${nAvg}`);
  }

  // Hourly distribution
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   HOURLY FLYABLE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════');

  for (let h = PG_HOUR_START; h <= PG_HOUR_END; h++) {
    const sHr = southResults.filter(r => r.hour === h);
    const nHr = northResults.filter(r => r.hour === h);
    const sFly = sHr.filter(r => r.flyable).length;
    const nFly = nHr.filter(r => r.flyable).length;
    const sQual = sHr.filter(r => r.quality).length;
    const nQual = nHr.filter(r => r.quality).length;
    const timeLabel = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;

    console.log(`  ${timeLabel.padStart(4)}: SOUTH ${sFly}/${sHr.length} fly (${sQual} quality) | NORTH ${nFly}/${nHr.length} fly (${nQual} quality)`);
  }

  // Top sessions
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   TOP 15 SOUTH SESSIONS (by quality score)');
  console.log('═══════════════════════════════════════════════════════════');

  const topSouth = [...southResults].sort((a, b) => b.score - a.score).slice(0, 15);
  for (const s of topSouth) {
    console.log(`  ${s.date} ${s.hour}:00 — Score: ${s.score} (${s.label}) | ${s.actualSpeed?.toFixed(1)} mph @ ${s.actualDir?.toFixed(0)}° | GF: ${s.gustFactor}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   TOP 15 NORTH SESSIONS (by quality score)');
  console.log('═══════════════════════════════════════════════════════════');

  const topNorth = [...northResults].sort((a, b) => b.score - a.score).slice(0, 15);
  for (const s of topNorth) {
    console.log(`  ${s.date} ${s.hour}:00 — Score: ${s.score} (${s.label}) | ${s.actualSpeed?.toFixed(1)} mph @ ${s.actualDir?.toFixed(0)}° | GF: ${s.gustFactor}`);
  }

  // Indicator analysis
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   INDICATOR LEAD-TIME ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════');

  // KSLC → UTALP: how often does KSLC N wind predict UTALP N within 1-2 hours?
  let kslcLeadHits = 0, kslcLeadTotal = 0;
  for (const result of northResults) {
    if (!result.flyable) continue;
    const date = result.date;
    const prevHour = result.hour - 1;
    const kslcPrev = allStationData.KSLC?.[date]?.[prevHour];
    if (kslcPrev && kslcPrev.direction != null) {
      kslcLeadTotal++;
      if ((kslcPrev.direction >= 315 || kslcPrev.direction <= 45) && kslcPrev.speed >= 5) {
        kslcLeadHits++;
      }
    }
  }
  console.log(`\n  KSLC → UTALP (1hr lead for North): ${kslcLeadHits}/${kslcLeadTotal} = ${((kslcLeadHits / Math.max(1, kslcLeadTotal)) * 100).toFixed(1)}% correlation`);

  // KPVU → FPS: how often does KPVU S wind predict FPS flyable south?
  let kpvuLeadHits = 0, kpvuLeadTotal = 0;
  for (const result of southResults) {
    if (!result.flyable) continue;
    const date = result.date;
    const prevHour = result.hour - 1;
    const kpvuPrev = allStationData.KPVU?.[date]?.[prevHour];
    if (kpvuPrev && kpvuPrev.direction != null) {
      kpvuLeadTotal++;
      if (kpvuPrev.direction >= 140 && kpvuPrev.direction <= 220 && kpvuPrev.speed >= 3) {
        kpvuLeadHits++;
      }
    }
  }
  console.log(`  KPVU → FPS (1hr lead for South): ${kpvuLeadHits}/${kpvuLeadTotal} = ${((kpvuLeadHits / Math.max(1, kpvuLeadTotal)) * 100).toFixed(1)}% correlation`);

  // ─── LEARNING ──────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   LEARNING — Calibrating Paragliding Weights');
  console.log('═══════════════════════════════════════════════════════════');

  const allResults = [...southResults, ...northResults];
  const totalPredictions = allResults.length;
  const avgOrigAccuracy = allResults.reduce((s, r) => s + r.accuracy.overallScore, 0) / totalPredictions;

  console.log(`\n  Total predictions: ${totalPredictions}`);
  console.log(`  South predictions: ${southResults.length}`);
  console.log(`  North predictions: ${northResults.length}`);
  console.log(`  Original avg accuracy: ${avgOrigAccuracy.toFixed(1)}%`);

  // Probability calibration
  const buckets = {};
  for (const r of allResults) {
    const bucket = Math.floor(r.prediction.probability / 20) * 20;
    const key = `${bucket}-${bucket + 20}`;
    if (!buckets[key]) buckets[key] = { predicted: 0, actualFlyable: 0, actualQuality: 0 };
    buckets[key].predicted++;
    if (r.flyable) buckets[key].actualFlyable++;
    if (r.quality) buckets[key].actualQuality++;
  }

  console.log('\n  Probability Calibration:');
  const probabilityCalibration = {};
  for (const [bucket, data] of Object.entries(buckets)) {
    const flyableRate = data.actualFlyable / data.predicted;
    const qualityRate = data.actualQuality / data.predicted;
    const blended = (flyableRate * 0.6 + qualityRate * 0.4) * 100;
    const midpoint = parseInt(bucket.split('-')[0]) + 10;
    const ratio = midpoint > 0 ? Math.min(3.0, Math.max(0.3, blended / midpoint)) : 1.0;
    probabilityCalibration[bucket] = +ratio.toFixed(3);
    console.log(`    ${bucket}%: ${data.predicted} predictions → ${(flyableRate * 100).toFixed(1)}% flyable, ${(qualityRate * 100).toFixed(1)}% quality → calibration: ×${ratio.toFixed(3)}`);
  }

  // Hourly multipliers
  const hourlyFlyRate = {};
  for (let h = PG_HOUR_START; h <= PG_HOUR_END; h++) {
    const sHr = southResults.filter(r => r.hour === h);
    const nHr = northResults.filter(r => r.hour === h);
    const total = sHr.length + nHr.length;
    const flyable = sHr.filter(r => r.flyable).length + nHr.filter(r => r.flyable).length;
    hourlyFlyRate[h] = total > 0 ? flyable / total : 0;
  }

  const avgHourlyRate = Object.values(hourlyFlyRate).reduce((a, b) => a + b, 0) / Object.values(hourlyFlyRate).length;
  const hourlyMultipliers = {};
  for (const [h, rate] of Object.entries(hourlyFlyRate)) {
    hourlyMultipliers[h] = avgHourlyRate > 0 ? Math.min(1.5, Math.max(0.5, +(rate / avgHourlyRate).toFixed(3))) : 1.0;
  }

  console.log('\n  Hourly Multipliers:');
  for (const [h, mult] of Object.entries(hourlyMultipliers)) {
    const timeLabel = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
    console.log(`    ${timeLabel}: ×${mult} (flyable rate: ${(hourlyFlyRate[h] * 100).toFixed(1)}%)`);
  }

  // Monthly quality rates
  const monthlyQualityRates = {};
  for (const [month, stats] of Object.entries(monthlyStats)) {
    const total = stats.south.total + stats.north.total;
    const quality = stats.south.quality + stats.north.quality;
    monthlyQualityRates[month.slice(5)] = total > 0 ? +(quality / total).toFixed(3) : 0;
  }

  // South vs North stats
  const southFlyable = southResults.filter(r => r.flyable).length;
  const southQuality = southResults.filter(r => r.quality).length;
  const northFlyable = northResults.filter(r => r.flyable).length;
  const northQuality = northResults.filter(r => r.quality).length;

  const southAvgGF = southResults.filter(r => r.flyable).length > 0
    ? southResults.filter(r => r.flyable).reduce((s, r) => s + r.gustFactor, 0) / southFlyable : 0;
  const northAvgGF = northResults.filter(r => r.flyable).length > 0
    ? northResults.filter(r => r.flyable).reduce((s, r) => s + r.gustFactor, 0) / northFlyable : 0;

  console.log('\n  Site Comparison:');
  console.log(`    SOUTH: ${southFlyable} flyable, ${southQuality} quality (${(southQuality / Math.max(1, southResults.length) * 100).toFixed(1)}%), avg GF: ${southAvgGF.toFixed(2)}`);
  console.log(`    NORTH: ${northFlyable} flyable, ${northQuality} quality (${(northQuality / Math.max(1, northResults.length) * 100).toFixed(1)}%), avg GF: ${northAvgGF.toFixed(2)}`);

  // Speed bias
  let totalSpeedError = 0, speedErrorCount = 0;
  for (const r of allResults) {
    if (r.prediction.expectedSpeed > 0 && r.actualSpeed > 0) {
      totalSpeedError += (r.prediction.expectedSpeed - r.actualSpeed);
      speedErrorCount++;
    }
  }
  const speedBias = speedErrorCount > 0 ? -(totalSpeedError / speedErrorCount) : 0;

  // Indicator weights (how useful is each indicator?)
  const kslcNorthCorrelation = kslcLeadTotal > 0 ? kslcLeadHits / kslcLeadTotal : 0.5;
  const kpvuSouthCorrelation = kpvuLeadTotal > 0 ? kpvuLeadHits / kpvuLeadTotal : 0.5;

  // Build trained weights
  const trainedWeights = {
    _meta: {
      generatedAt: new Date().toISOString(),
      source: 'backtest-paragliding-2025',
      samples: totalPredictions,
      southSamples: southResults.length,
      northSamples: northResults.length,
      originalAccuracy: +avgOrigAccuracy.toFixed(1),
      insights: [
        `South side flyable rate: ${(southFlyable / Math.max(1, southResults.length) * 100).toFixed(1)}%`,
        `North side flyable rate: ${(northFlyable / Math.max(1, northResults.length) * 100).toFixed(1)}%`,
        `South avg gust factor: ${southAvgGF.toFixed(2)}`,
        `North avg gust factor: ${northAvgGF.toFixed(2)}`,
        `KSLC→UTALP 1hr lead correlation: ${(kslcNorthCorrelation * 100).toFixed(1)}%`,
        `KPVU→FPS 1hr lead correlation: ${(kpvuSouthCorrelation * 100).toFixed(1)}%`,
      ],
    },
    weights: {
      version: 'pg-2025-v1',
      createdAt: new Date().toISOString(),
      source: 'historical-backtest-paragliding',
      basedOnSamples: totalPredictions,
      activity: 'paragliding',

      // Indicator weights — how much to trust each upstream station
      indicatorWeights: {
        kslc_north: Math.min(1.5, Math.max(0.5, +(kslcNorthCorrelation * 1.5).toFixed(3))),
        kpvu_south: Math.min(1.5, Math.max(0.5, +(kpvuSouthCorrelation * 1.5).toFixed(3))),
        utoly_confirm: 0.8,
        fps_switch: 1.2,
      },

      speedBiasCorrection: +speedBias.toFixed(2),
      probabilityCalibration,
      hourlyMultipliers,
      monthlyQualityRates,

      siteProfiles: {
        south: {
          flyableRate: +(southFlyable / Math.max(1, southResults.length)).toFixed(3),
          qualityRate: +(southQuality / Math.max(1, southResults.length)).toFixed(3),
          avgGustFactor: +southAvgGF.toFixed(2),
          bestHours: Object.entries(hourlyFlyRate)
            .filter(([h]) => h >= 10 && h <= 15)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([h]) => +h),
          directionRange: { min: 160, max: 200 },
          speedRange: { min: 6, ideal_min: 8, ideal_max: 14, max: 18 },
        },
        north: {
          flyableRate: +(northFlyable / Math.max(1, northResults.length)).toFixed(3),
          qualityRate: +(northQuality / Math.max(1, northResults.length)).toFixed(3),
          avgGustFactor: +northAvgGF.toFixed(2),
          bestHours: Object.entries(hourlyFlyRate)
            .filter(([h]) => h >= 15 && h <= 20)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([h]) => +h),
          directionRange: { min: 315, max: 45 },
          speedRange: { min: 6, ideal_min: 8, ideal_max: 16, max: 20 },
        },
      },

      gustFactorThresholds: {
        glass: 1.15,
        excellent: 1.25,
        acceptable: 1.35,
        dangerous: 1.5,
      },
    },
  };

  // Validation: rerun with calibration
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDATION — Re-scoring with learned weights');
  console.log('═══════════════════════════════════════════════════════════');

  let trainedAccuracySum = 0;
  for (const r of allResults) {
    let adjustedProb = r.prediction.probability;

    // Apply hourly multiplier
    const hMult = hourlyMultipliers[r.hour] || 1.0;
    adjustedProb *= hMult;

    // Apply probability calibration
    const bucket = Math.floor(r.prediction.probability / 20) * 20;
    const calKey = `${bucket}-${bucket + 20}`;
    const calMult = probabilityCalibration[calKey] || 1.0;
    adjustedProb *= calMult;

    adjustedProb = Math.min(95, Math.max(0, adjustedProb));

    const adjustedPred = {
      ...r.prediction,
      probability: Math.round(adjustedProb),
      expectedSpeed: r.prediction.expectedSpeed + speedBias,
      predictedFlyable: adjustedProb >= 45,
      predictedQuality: adjustedProb >= 60,
    };

    const sessionScore = r.site === 'south'
      ? scoreSouthSession({ speed: r.actualSpeed, gust: r.actualGust, direction: r.actualDir, hour: r.hour })
      : scoreNorthSession({ speed: r.actualSpeed, gust: r.actualGust, direction: r.actualDir, hour: r.hour });

    const acc = scorePGAccuracy(adjustedPred, { speed: r.actualSpeed }, sessionScore);
    trainedAccuracySum += acc.overallScore;
  }

  const trainedAvgAccuracy = trainedAccuracySum / totalPredictions;

  console.log(`\n  Original accuracy: ${avgOrigAccuracy.toFixed(1)}%`);
  console.log(`  Trained accuracy:  ${trainedAvgAccuracy.toFixed(1)}%`);
  console.log(`  Improvement:       ${(trainedAvgAccuracy - avgOrigAccuracy).toFixed(1)}%`);

  trainedWeights._meta.trainedAccuracy = +trainedAvgAccuracy.toFixed(1);
  trainedWeights._meta.improvement = +(trainedAvgAccuracy - avgOrigAccuracy).toFixed(1);

  // Save
  const outPath = path.join(__dirname, '..', 'src', 'config', 'trainedWeights-paragliding.json');
  fs.writeFileSync(outPath, JSON.stringify(trainedWeights, null, 2));
  console.log(`\n  ✅ Saved to ${outPath}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   DONE');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
