#!/usr/bin/env node
/**
 * WU PWS MODEL TRAINER — Learn speed ratios, propagation lags, and climatology
 *
 * Reads the hourly-aggregated WU historical data from wu-historical-data.json
 * and your Ambient PWS data (via API) to learn:
 *
 *   1. SPEED RATIOS — how each WU station's wind relates to your PWS (Zigzag)
 *      e.g. KUTSARAT88 sees 0.85x what PWS sees during SE thermal
 *   2. PROPAGATION LAGS — how many hours before your PWS a station fires
 *      e.g. KUTDRAPE132 fires ~1hr before PWS during north flow
 *   3. CLIMATOLOGY — hourly avg wind by station×month (what's "normal")
 *   4. CORROBORATION THRESHOLDS — how many stations need to agree
 *
 * Usage:
 *   node scripts/wu-train-model.mjs
 *   node scripts/wu-train-model.mjs --output=learned-wu-params.json
 *
 * Output: JSON with learned parameters ready for UnifiedPredictor
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v || 'true'];
  })
);

const INPUT_FILE = resolve(__dirname, args.input || 'wu-historical-data.json');
const OUTPUT_FILE = resolve(__dirname, '..', args.output || 'learned-wu-params.json');

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  WU PWS MODEL TRAINER`);
console.log(`  Input: ${INPUT_FILE}`);
console.log(`  Output: ${OUTPUT_FILE}`);
console.log(`═══════════════════════════════════════════════\n`);

// ─── Load WU data ─────────────────────────────────────────────────
const wuData = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
const stationIds = Object.keys(wuData);
console.log(`Loaded ${stationIds.length} stations from WU data\n`);

// Reference station (your PWS on WU)
const REF_STATION = 'KUTSARAT50';
const refData = wuData[REF_STATION];
if (!refData?.hourly?.length) {
  console.error(`Reference station ${REF_STATION} not found in data`);
  process.exit(1);
}

// Build lookup: date+hour → reading for reference station
const refByHour = new Map();
for (const h of refData.hourly) {
  refByHour.set(h.hour, h);
}
console.log(`Reference station ${REF_STATION}: ${refData.hourly.length} hourly records\n`);

// ─── Regime classification helpers ────────────────────────────────
function classifyRegime(dir, speed) {
  if (speed < 3 || dir == null) return 'calm';
  if (dir >= 100 && dir <= 200) return 'se_thermal';
  if (dir >= 315 || dir <= 45) return 'north_flow';
  if (dir >= 200 && dir <= 315) return 'west_flow';
  return 'other';
}

// ═══════════════════════════════════════════════════════════════════
//  1. SPEED RATIOS — compare each station to reference (PWS)
// ═══════════════════════════════════════════════════════════════════
console.log(`── 1. SPEED RATIOS (station ÷ PWS) ─────────────`);

const speedRatios = {};

for (const [stId, stData] of Object.entries(wuData)) {
  if (stId === REF_STATION || !stData?.hourly?.length) continue;

  const regimeRatios = { se_thermal: [], north_flow: [], all: [] };

  for (const h of stData.hourly) {
    const ref = refByHour.get(h.hour);
    if (!ref || ref.windSpeed < 3 || h.windSpeed < 1) continue;

    const regime = classifyRegime(ref.windDirection, ref.windSpeed);
    const ratio = Math.round((h.windSpeed / ref.windSpeed) * 100) / 100;

    if (ratio > 0.1 && ratio < 10) {
      regimeRatios.all.push(ratio);
      if (regime === 'se_thermal') regimeRatios.se_thermal.push(ratio);
      if (regime === 'north_flow') regimeRatios.north_flow.push(ratio);
    }
  }

  const stats = (arr) => {
    if (arr.length < 5) return null;
    arr.sort((a, b) => a - b);
    const median = arr[Math.floor(arr.length / 2)];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { median: Math.round(median * 100) / 100, mean: Math.round(mean * 100) / 100, n: arr.length };
  };

  speedRatios[stId] = {
    se_thermal: stats(regimeRatios.se_thermal),
    north_flow: stats(regimeRatios.north_flow),
    all: stats(regimeRatios.all),
  };

  const se = speedRatios[stId].se_thermal;
  const nf = speedRatios[stId].north_flow;
  const all = speedRatios[stId].all;
  console.log(`  ${stId}:`);
  if (se) console.log(`    SE thermal: median=${se.median}x, mean=${se.mean}x (n=${se.n})`);
  if (nf) console.log(`    North flow: median=${nf.median}x, mean=${nf.mean}x (n=${nf.n})`);
  if (all) console.log(`    All wind:   median=${all.median}x, mean=${all.mean}x (n=${all.n})`);
}

// ═══════════════════════════════════════════════════════════════════
//  2. PROPAGATION LAGS — when does a station fire relative to PWS?
// ═══════════════════════════════════════════════════════════════════
console.log(`\n── 2. PROPAGATION LAGS ──────────────────────────`);

const propagationLags = {};

// Build date→hours map for each station
function buildDateMap(hourly) {
  const m = new Map();
  for (const h of hourly) {
    if (!m.has(h.date)) m.set(h.date, []);
    m.get(h.date).push(h);
  }
  return m;
}

const refDateMap = buildDateMap(refData.hourly);

function findOnsetHour(dayHours, regime) {
  const kiteHours = dayHours.filter(h => h.hourOfDay >= 8 && h.hourOfDay <= 20);
  for (const h of kiteHours.sort((a, b) => a.hourOfDay - b.hourOfDay)) {
    if (h.windSpeed < 3) continue;
    const r = classifyRegime(h.windDirection, h.windSpeed);
    if (r === regime) return h.hourOfDay;
  }
  return null;
}

for (const [stId, stData] of Object.entries(wuData)) {
  if (stId === REF_STATION || !stData?.hourly?.length) continue;

  const stDateMap = buildDateMap(stData.hourly);
  const lags = { se_thermal: [], north_flow: [] };

  for (const [date, refHours] of refDateMap) {
    const stHours = stDateMap.get(date);
    if (!stHours) continue;

    for (const regime of ['se_thermal', 'north_flow']) {
      const refOnset = findOnsetHour(refHours, regime);
      const stOnset = findOnsetHour(stHours, regime);
      if (refOnset != null && stOnset != null) {
        lags[regime].push(stOnset - refOnset);
      }
    }
  }

  const lagStats = (arr) => {
    if (arr.length < 3) return null;
    arr.sort((a, b) => a - b);
    const median = arr[Math.floor(arr.length / 2)];
    const mean = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    return { medianHours: median, meanHours: mean, n: arr.length };
  };

  propagationLags[stId] = {
    se_thermal: lagStats(lags.se_thermal),
    north_flow: lagStats(lags.north_flow),
  };

  const se = propagationLags[stId].se_thermal;
  const nf = propagationLags[stId].north_flow;
  console.log(`  ${stId}:`);
  if (se) console.log(`    SE thermal: median=${se.medianHours > 0 ? '+' : ''}${se.medianHours}hr, mean=${se.meanHours > 0 ? '+' : ''}${se.meanHours}hr (${se.n} events)`);
  if (nf) console.log(`    North flow: median=${nf.medianHours > 0 ? '+' : ''}${nf.medianHours}hr, mean=${nf.meanHours > 0 ? '+' : ''}${nf.meanHours}hr (${nf.n} events)`);
  if (!se && !nf) console.log(`    Insufficient data`);
}

// ═══════════════════════════════════════════════════════════════════
//  3. HOURLY CLIMATOLOGY — avg wind per station×hour×month
// ═══════════════════════════════════════════════════════════════════
console.log(`\n── 3. HOURLY CLIMATOLOGY ────────────────────────`);

const climatology = {};

for (const [stId, stData] of Object.entries(wuData)) {
  if (!stData?.hourly?.length) continue;

  const byMonthHour = {};
  for (const h of stData.hourly) {
    const month = parseInt(h.date.slice(5, 7));
    const key = `${month}:${h.hourOfDay}`;
    if (!byMonthHour[key]) byMonthHour[key] = { speeds: [], dirs: [] };
    byMonthHour[key].speeds.push(h.windSpeed);
    if (h.windDirection != null) byMonthHour[key].dirs.push(h.windDirection);
  }

  const stClim = {};
  for (const [key, data] of Object.entries(byMonthHour)) {
    const [month, hour] = key.split(':').map(Number);
    if (!stClim[month]) stClim[month] = {};
    const avg = data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length;
    const std = Math.sqrt(data.speeds.map(s => (s - avg) ** 2).reduce((a, b) => a + b, 0) / data.speeds.length);
    stClim[month][hour] = {
      avgSpeed: Math.round(avg * 10) / 10,
      stdSpeed: Math.round(std * 10) / 10,
      samples: data.speeds.length,
    };
  }

  climatology[stId] = stClim;
}

// Print summary for reference station
console.log(`  ${REF_STATION} kite-window climatology:`);
const refClim = climatology[REF_STATION];
if (refClim) {
  for (const month of Object.keys(refClim).sort((a, b) => Number(a) - Number(b))) {
    const hours = refClim[month];
    const kiteHrs = Object.entries(hours).filter(([h]) => Number(h) >= 10 && Number(h) <= 18);
    if (kiteHrs.length === 0) continue;
    const avgWind = kiteHrs.reduce((s, [, v]) => s + v.avgSpeed, 0) / kiteHrs.length;
    const peakHr = kiteHrs.sort((a, b) => b[1].avgSpeed - a[1].avgSpeed)[0];
    console.log(`    Month ${month}: avg ${avgWind.toFixed(1)} mph, peak at ${peakHr[0]}:00 (${peakHr[1].avgSpeed} mph)`);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  4. CORROBORATION ANALYSIS — how many stations agree on wind days?
// ═══════════════════════════════════════════════════════════════════
console.log(`\n── 4. CORROBORATION PATTERNS ─────────────────────`);

const WIND_THRESHOLD = 5;
const corroboration = { se_thermal: { counts: {}, total: 0 }, north_flow: { counts: {}, total: 0 } };

for (const [date, refHours] of refDateMap) {
  for (const regime of ['se_thermal', 'north_flow']) {
    const refWindy = refHours.some(h =>
      h.hourOfDay >= 10 && h.hourOfDay <= 18 &&
      h.windSpeed >= WIND_THRESHOLD &&
      classifyRegime(h.windDirection, h.windSpeed) === regime
    );
    if (!refWindy) continue;

    corroboration[regime].total++;
    let agreeing = 0;

    for (const [stId, stData] of Object.entries(wuData)) {
      if (stId === REF_STATION || !stData?.hourly?.length) continue;
      const stDateMap2 = buildDateMap(stData.hourly);
      const stHours = stDateMap2.get(date);
      if (!stHours) continue;

      const stWindy = stHours.some(h =>
        h.hourOfDay >= 10 && h.hourOfDay <= 18 &&
        h.windSpeed >= WIND_THRESHOLD &&
        classifyRegime(h.windDirection, h.windSpeed) === regime
      );
      if (stWindy) agreeing++;
    }

    if (!corroboration[regime].counts[agreeing]) corroboration[regime].counts[agreeing] = 0;
    corroboration[regime].counts[agreeing]++;
  }
}

for (const regime of ['se_thermal', 'north_flow']) {
  const c = corroboration[regime];
  console.log(`  ${regime} (${c.total} wind days):`);
  for (const [n, count] of Object.entries(c.counts).sort((a, b) => Number(a) - Number(b))) {
    const pct = Math.round(count / c.total * 100);
    console.log(`    ${n} stations agree: ${count} days (${pct}%)`);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  5. SAVE LEARNED PARAMETERS
// ═══════════════════════════════════════════════════════════════════
console.log(`\n── 5. SAVING LEARNED PARAMETERS ─────────────────`);

const learned = {
  version: '1.0',
  trainedAt: new Date().toISOString(),
  referenceStation: REF_STATION,
  stationCount: stationIds.length,
  totalHourlyRecords: Object.values(wuData).reduce((s, d) => s + (d.hourly?.length || 0), 0),
  speedRatios,
  propagationLags,
  climatology,
  corroboration,

  // Derived: best speed ratios for UnifiedPredictor
  derivedSpeedRatios: {
    se_thermal: {},
    north_flow: {},
  },

  // Derived: recommended chain lags (minutes)
  derivedChainLags: {
    se_thermal: {},
    north_flow: {},
  },
};

// Derive best speed ratios (use median for robustness)
for (const [stId, ratios] of Object.entries(speedRatios)) {
  if (ratios.se_thermal?.median) {
    learned.derivedSpeedRatios.se_thermal[stId] = ratios.se_thermal.median;
  }
  if (ratios.north_flow?.median) {
    learned.derivedSpeedRatios.north_flow[stId] = ratios.north_flow.median;
  }
}

// Derive chain lags in minutes (convert hours to minutes)
for (const [stId, lags] of Object.entries(propagationLags)) {
  if (lags.se_thermal?.medianHours != null) {
    learned.derivedChainLags.se_thermal[stId] = lags.se_thermal.medianHours * 60;
  }
  if (lags.north_flow?.medianHours != null) {
    learned.derivedChainLags.north_flow[stId] = lags.north_flow.medianHours * 60;
  }
}

writeFileSync(OUTPUT_FILE, JSON.stringify(learned, null, 2), 'utf-8');

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  TRAINING COMPLETE`);
console.log(`  Output: ${OUTPUT_FILE}`);
console.log(`  File size: ${(readFileSync(OUTPUT_FILE).length / 1024).toFixed(1)} KB`);
console.log(`═══════════════════════════════════════════════`);

// ── Summary for human review ──────────────────────────────────────
console.log(`\n── RECOMMENDED UPDATES FOR UnifiedPredictor ──`);
console.log(`\n  SE Thermal speed ratios (station ÷ PWS):`);
for (const [id, r] of Object.entries(learned.derivedSpeedRatios.se_thermal).sort((a, b) => a[1] - b[1])) {
  console.log(`    ${id}: ${r}x  →  PWS = station_speed / ${r}`);
}
console.log(`\n  North Flow speed ratios (station ÷ PWS):`);
for (const [id, r] of Object.entries(learned.derivedSpeedRatios.north_flow).sort((a, b) => a[1] - b[1])) {
  console.log(`    ${id}: ${r}x  →  PWS = station_speed / ${r}`);
}
console.log(`\n  Propagation lags (minutes ahead of PWS):`);
console.log(`  SE Thermal:`);
for (const [id, m] of Object.entries(learned.derivedChainLags.se_thermal).sort((a, b) => a[1] - b[1])) {
  console.log(`    ${id}: ${m > 0 ? '+' : ''}${m} min`);
}
console.log(`  North Flow:`);
for (const [id, m] of Object.entries(learned.derivedChainLags.north_flow).sort((a, b) => a[1] - b[1])) {
  console.log(`    ${id}: ${m > 0 ? '+' : ''}${m} min`);
}
