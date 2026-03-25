#!/usr/bin/env node
/**
 * WU PWS HISTORICAL BACKFILL — Pull 5-minute wind data from Weather Underground
 *
 * Fetches day-by-day history for curated WU PWS stations along the thermal
 * corridor, aggregates into hourly buckets, and saves for model training.
 *
 * WU API: /v2/pws/history/all?stationId=X&date=YYYYMMDD — 5-min resolution
 * Rate limits: 1,500 calls/day, 30/min (free PWS owner tier)
 *
 * Strategy:
 *   - Fetch 1 day per station per API call (288 obs × 5-min = 1 day)
 *   - Batch 20 stations × 365 days = 7,300 calls → spread across 5 days
 *   - Or: 20 stations × 90 days = 1,800 calls → fits in 1 day with pacing
 *
 * Usage:
 *   node scripts/wu-historical-backfill.mjs --days=90
 *   node scripts/wu-historical-backfill.mjs --days=365 --stations=KUTDRAPE132,KUTSARAT88
 *   node scripts/wu-historical-backfill.mjs --days=30 --station-group=zigzag
 *
 * Output: scripts/wu-historical-data.json (hourly aggregated wind data)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const WU_API_KEY = process.env.WU_API_KEY;
if (!WU_API_KEY) { console.error('WU_API_KEY not found in .env'); process.exit(1); }

// ─── Station groups ────────────────────────────────────────────────
const STATION_GROUPS = {
  zigzag: ['KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62'],
  lehi: ['KUTLEHI73', 'KUTLEHI160', 'KUTLEHI111'],
  northflow: ['KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18', 'KUTSANDY188'],
  alpine: ['KUTALPIN3', 'KUTALPIN25'],
  heber: ['KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26'],
  vineyard: ['KUTPLEAS11', 'KUTCEDAR10'],
  all: [
    'KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62',
    'KUTLEHI73', 'KUTLEHI160', 'KUTLEHI111',
    'KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18',
    'KUTSANDY188', 'KUTALPIN3', 'KUTALPIN25',
    'KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26',
    'KUTPLEAS11', 'KUTCEDAR10',
  ],
};

// ─── CLI args ─────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v || 'true'];
  })
);

const DAYS = parseInt(args.days || '90');
const STATION_GROUP = args['station-group'] || 'all';
const CUSTOM_STATIONS = args.stations?.split(',');
const STATIONS = CUSTOM_STATIONS || STATION_GROUPS[STATION_GROUP] || STATION_GROUPS.all;
const OUTPUT_FILE = resolve(__dirname, args.output || 'wu-historical-data.json');
const RESUME = args.resume === 'true';

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  WU PWS HISTORICAL BACKFILL`);
console.log(`  Stations: ${STATIONS.length} (${STATION_GROUP})`);
console.log(`  Days: ${DAYS}`);
console.log(`  Total API calls needed: ${STATIONS.length * DAYS}`);
console.log(`  Rate limit: 1,500/day, 30/min`);
console.log(`  Output: ${OUTPUT_FILE}`);
console.log(`═══════════════════════════════════════════════\n`);

// ─── Rate limiter ─────────────────────────────────────────────────
let callCount = 0;
let minuteCount = 0;
let minuteStart = Date.now();

async function rateLimitedFetch(url) {
  const now = Date.now();
  if (now - minuteStart > 60000) {
    minuteCount = 0;
    minuteStart = now;
  }
  if (minuteCount >= 28) {
    const waitMs = 60000 - (now - minuteStart) + 2000;
    console.log(`  ⏳ Rate limit pause: ${(waitMs / 1000).toFixed(0)}s`);
    await new Promise(r => setTimeout(r, waitMs));
    minuteCount = 0;
    minuteStart = Date.now();
  }
  if (callCount >= 1400) {
    console.log(`  ⚠️  Daily limit approaching (${callCount}/1500). Stopping.`);
    return null;
  }
  minuteCount++;
  callCount++;
  const resp = await fetch(url);
  if (resp.status === 429) {
    console.log(`  ⚠️  Rate limited. Waiting 60s...`);
    await new Promise(r => setTimeout(r, 61000));
    return fetch(url);
  }
  return resp;
}

// ─── Fetch one day of history for one station ─────────────────────
async function fetchDayHistory(stationId, dateStr) {
  const url = `https://api.weather.com/v2/pws/history/all?stationId=${stationId}&format=json&units=e&date=${dateStr}&numericPrecision=decimal&apiKey=${WU_API_KEY}`;
  try {
    const resp = await rateLimitedFetch(url);
    if (!resp || !resp.ok) return [];
    const data = await resp.json();
    return data.observations || [];
  } catch (err) {
    console.error(`  ✗ ${stationId} ${dateStr}: ${err.message}`);
    return [];
  }
}

// ─── Aggregate 5-min obs into hourly buckets ──────────────────────
function aggregateToHourly(observations, stationId) {
  const hourly = {};
  for (const obs of observations) {
    if (!obs.obsTimeLocal) continue;
    const hourKey = obs.obsTimeLocal.slice(0, 13); // "2026-03-20 14"
    if (!hourly[hourKey]) {
      hourly[hourKey] = { speeds: [], dirs: [], gusts: [], temps: [], count: 0 };
    }
    const imp = obs.imperial || {};
    const spd = imp.windspeedAvg ?? imp.windspeedHigh;
    if (spd != null) hourly[hourKey].speeds.push(spd);
    if (obs.winddirAvg != null) hourly[hourKey].dirs.push(obs.winddirAvg);
    const gust = imp.windgustHigh;
    if (gust != null) hourly[hourKey].gusts.push(gust);
    const temp = imp.tempAvg;
    if (temp != null) hourly[hourKey].temps.push(temp);
    hourly[hourKey].count++;
  }

  const result = [];
  for (const [hourKey, data] of Object.entries(hourly)) {
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const max = arr => arr.length ? Math.max(...arr) : null;
    // Circular mean for wind direction
    const dirAvg = data.dirs.length > 0 ? circularMean(data.dirs) : null;
    result.push({
      stationId,
      hour: hourKey,
      date: hourKey.slice(0, 10),
      hourOfDay: parseInt(hourKey.slice(11, 13)),
      windSpeed: Math.round((avg(data.speeds) ?? 0) * 10) / 10,
      windDirection: dirAvg != null ? Math.round(dirAvg) : null,
      windGust: Math.round((max(data.gusts) ?? 0) * 10) / 10,
      temperature: Math.round((avg(data.temps) ?? 0) * 10) / 10,
      obsCount: data.count,
    });
  }
  return result.sort((a, b) => a.hour.localeCompare(b.hour));
}

function circularMean(dirs) {
  let sinSum = 0, cosSum = 0;
  for (const d of dirs) {
    sinSum += Math.sin(d * Math.PI / 180);
    cosSum += Math.cos(d * Math.PI / 180);
  }
  let mean = Math.atan2(sinSum / dirs.length, cosSum / dirs.length) * 180 / Math.PI;
  if (mean < 0) mean += 360;
  return mean;
}

// ─── Generate date list ───────────────────────────────────────────
function generateDates(days) {
  const dates = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}${m}${dd}`);
  }
  return dates;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const dates = generateDates(DAYS);
  
  // Load existing data if resuming
  let existing = {};
  if (RESUME && existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Resuming: loaded ${Object.keys(existing).length} existing station records\n`);
    } catch {}
  }

  const allData = { ...existing };
  let totalFetched = 0;
  let totalSkipped = 0;
  let totalEmpty = 0;

  for (const stationId of STATIONS) {
    console.log(`\n── ${stationId} ──────────────────────────────`);
    if (!allData[stationId]) allData[stationId] = { hourly: [], meta: {} };

    const existingDates = new Set(allData[stationId].hourly.map(h => h.date));
    let stationFetched = 0;
    let stationEmpty = 0;

    for (const dateStr of dates) {
      const dateFormatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      if (existingDates.has(dateFormatted)) {
        totalSkipped++;
        continue;
      }

      const obs = await fetchDayHistory(stationId, dateStr);
      if (obs.length === 0) {
        stationEmpty++;
        totalEmpty++;
        continue;
      }

      const hourlyData = aggregateToHourly(obs, stationId);
      allData[stationId].hourly.push(...hourlyData);
      existingDates.add(dateFormatted);
      stationFetched++;
      totalFetched++;

      if (stationFetched % 30 === 0) {
        console.log(`  ${stationId}: ${stationFetched} days fetched, ${stationEmpty} empty`);
      }
    }

    allData[stationId].meta = {
      totalDays: allData[stationId].hourly.length > 0
        ? new Set(allData[stationId].hourly.map(h => h.date)).size
        : 0,
      totalHours: allData[stationId].hourly.length,
      dateRange: allData[stationId].hourly.length > 0
        ? { from: allData[stationId].hourly[0].date, to: allData[stationId].hourly.at(-1).date }
        : null,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`  ✓ ${stationId}: ${stationFetched} new days, ${stationEmpty} empty, ${allData[stationId].meta.totalDays} total days`);

    // Periodic save
    if (totalFetched % 100 === 0 && totalFetched > 0) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 0), 'utf-8');
      console.log(`  💾 Saved (${totalFetched} fetched so far)`);
    }

    if (callCount >= 1400) break;
  }

  // Final save
  writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 0), 'utf-8');

  // ─── Summary ──────────────────────────────────────────────────
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  BACKFILL COMPLETE`);
  console.log(`  API calls used: ${callCount}`);
  console.log(`  Days fetched: ${totalFetched}`);
  console.log(`  Days skipped (already had): ${totalSkipped}`);
  console.log(`  Days empty (no data): ${totalEmpty}`);
  console.log(`═══════════════════════════════════════════════`);

  // Per-station summary
  console.log(`\n── Per-Station Coverage ──`);
  for (const [id, data] of Object.entries(allData)) {
    const m = data.meta;
    console.log(`  ${id}: ${m.totalDays} days, ${m.totalHours} hourly records  [${m.dateRange?.from || '?'} → ${m.dateRange?.to || '?'}]`);
  }

  // ─── Training data analysis ─────────────────────────────────
  console.log(`\n── Wind Pattern Analysis ──`);
  for (const [id, data] of Object.entries(allData)) {
    if (!data.hourly?.length) continue;
    const kiteHours = data.hourly.filter(h => h.hourOfDay >= 10 && h.hourOfDay <= 19);
    const windyHours = kiteHours.filter(h => h.windSpeed >= 8);
    const seHours = kiteHours.filter(h => h.windSpeed >= 5 && h.windDirection >= 100 && h.windDirection <= 200);
    const northHours = kiteHours.filter(h => h.windSpeed >= 5 && (h.windDirection >= 315 || h.windDirection <= 45));
    
    console.log(`  ${id}:`);
    console.log(`    Kite-window hours (10-19): ${kiteHours.length}`);
    console.log(`    Windy (≥8 mph): ${windyHours.length} (${kiteHours.length > 0 ? Math.round(windyHours.length / kiteHours.length * 100) : 0}%)`);
    console.log(`    SE thermal pattern: ${seHours.length} (${kiteHours.length > 0 ? Math.round(seHours.length / kiteHours.length * 100) : 0}%)`);
    console.log(`    North flow pattern: ${northHours.length} (${kiteHours.length > 0 ? Math.round(northHours.length / kiteHours.length * 100) : 0}%)`);
  }

  console.log(`\nOutput saved to: ${OUTPUT_FILE}`);
  console.log(`File size: ${(readFileSync(OUTPUT_FILE).length / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
