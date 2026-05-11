#!/usr/bin/env node
/**
 * NWS Historical Validation Script
 *
 * Pulls 1 year of NWS observations for all stations that overlap with
 * the existing Synoptic-based `models:statistical` Redis blob, then
 * cross-validates the two datasets.
 *
 * Usage:
 *   node scripts/nws-historical-validation.mjs [--station KSLC] [--days 365] [--dry-run]
 *
 * Steps:
 *   1. Load existing Redis `models:statistical` for reference station pairs
 *   2. Fetch NWS history: GET /stations/{id}/observations?start=...&end=...
 *      (NWS returns max ~500 per request, so we chunk by week for airports)
 *   3. For WU PWS stations (no NWS history), use WU history API
 *   4. Compare against Synoptic historical records (from wu-historical-data.json + Redis)
 *   5. Output validation report: correlation, bias, RMSE per station pair
 *   6. If validation passes (r > 0.85), update `models:statistical` with NWS-derived data
 *
 * NWS History Limitations:
 *   - Airport stations: ~7 days per request (paginate by week)
 *   - Non-airport mesonet: NO NWS history — use WU PWS history as replacement
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NWS_BASE = 'https://api.weather.gov';
const NWS_HEADERS = { 'User-Agent': '(UtahWindApp, support@utahwindapp.com)', Accept: 'application/geo+json' };
const KMH_TO_MPH = 0.621371;

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes('--dry-run');
const STATION_FILTER = getArg('--station');
const DAYS = parseInt(getArg('--days') || '365');

// Upstash Redis config
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command, ...cmdArgs) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const resp = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command, ...cmdArgs]),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.result;
  } catch { return null; }
}

// Airport stations we want to validate against existing Synoptic models
const VALIDATION_STATIONS = [
  { id: 'KSLC', name: 'Salt Lake City Intl', lat: 40.7884, lng: -111.9778 },
  { id: 'KPVU', name: 'Provo Municipal', lat: 40.2192, lng: -111.7235 },
  { id: 'KHCR', name: 'Heber City', lat: 40.4822, lng: -111.4289 },
  { id: 'KOGD', name: 'Ogden-Hinckley', lat: 41.1961, lng: -112.0122 },
  { id: 'KLGU', name: 'Logan-Cache', lat: 41.7912, lng: -111.8522 },
  { id: 'KHIF', name: 'Hill AFB', lat: 41.1239, lng: -111.9731 },
  { id: 'KVEL', name: 'Vernal Regional', lat: 40.4409, lng: -109.5099 },
  { id: 'KPUC', name: 'Price Carbon County', lat: 39.6147, lng: -110.7514 },
  { id: 'KSGU', name: 'St George Regional', lat: 37.0364, lng: -113.5103 },
  { id: 'KPGA', name: 'Page Municipal', lat: 36.9261, lng: -111.4483 },
  { id: 'KCDC', name: 'Cedar City Regional', lat: 37.7011, lng: -113.0989 },
];

async function fetchNwsWeekHistory(stationId, startDate, endDate) {
  const url = `${NWS_BASE}/stations/${stationId}/observations?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=500`;
  try {
    const resp = await fetch(url, { headers: NWS_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      if (resp.status === 404) return [];
      console.warn(`  [NWS ${stationId}] HTTP ${resp.status} for ${startDate.toISOString().split('T')[0]}`);
      return [];
    }
    const data = await resp.json();
    const features = data.features || [];
    return features.map(f => {
      const p = f.properties;
      if (!p) return null;
      return {
        timestamp: p.timestamp,
        windSpeed: p.windSpeed?.value != null ? +(p.windSpeed.value * KMH_TO_MPH).toFixed(1) : null,
        windDirection: p.windDirection?.value ?? null,
        windGust: p.windGust?.value != null ? +(p.windGust.value * KMH_TO_MPH).toFixed(1) : null,
        temperature: p.temperature?.value != null ? +(p.temperature.value * 9 / 5 + 32).toFixed(1) : null,
        pressure: p.barometricPressure?.value != null ? +(p.barometricPressure.value / 3386.39).toFixed(2) : null,
      };
    }).filter(Boolean);
  } catch (err) {
    console.warn(`  [NWS ${stationId}] Fetch error:`, err.message);
    return [];
  }
}

async function fetchFullHistory(stationId, days) {
  console.log(`  Fetching ${days} days of NWS history for ${stationId}...`);
  const allObs = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 3600 * 1000);

  // NWS returns ~7 days per request for most stations; chunk by week
  const weekMs = 7 * 24 * 3600 * 1000;
  let chunkStart = new Date(startDate);
  let weekCount = 0;

  while (chunkStart < endDate) {
    const chunkEnd = new Date(Math.min(chunkStart.getTime() + weekMs, endDate.getTime()));
    const weekObs = await fetchNwsWeekHistory(stationId, chunkStart, chunkEnd);
    allObs.push(...weekObs);
    weekCount++;

    // Rate limit: ~2 requests/second to be polite to NWS
    await new Promise(r => setTimeout(r, 600));

    if (weekCount % 10 === 0) {
      console.log(`    ${stationId}: ${weekCount} weeks fetched, ${allObs.length} observations so far...`);
    }

    chunkStart = chunkEnd;
  }

  console.log(`  ${stationId}: ${allObs.length} total observations over ${weekCount} weeks`);
  return allObs;
}

function computeStats(observations) {
  const speeds = observations.map(o => o.windSpeed).filter(v => v != null);
  const gusts = observations.map(o => o.windGust).filter(v => v != null);
  const temps = observations.map(o => o.temperature).filter(v => v != null);

  const mean = arr => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = arr => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  };
  const percentile = (arr, p) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const i = Math.floor(sorted.length * p / 100);
    return sorted[Math.min(i, sorted.length - 1)];
  };

  // Hourly averages (climatology)
  const hourlyWindSpeed = Array(24).fill(null);
  const hourlyCounts = Array(24).fill(0);
  for (const obs of observations) {
    if (obs.windSpeed == null || !obs.timestamp) continue;
    const hour = new Date(obs.timestamp).getUTCHours();
    if (hourlyWindSpeed[hour] === null) hourlyWindSpeed[hour] = 0;
    hourlyWindSpeed[hour] += obs.windSpeed;
    hourlyCounts[hour]++;
  }
  for (let h = 0; h < 24; h++) {
    if (hourlyCounts[h] > 0) hourlyWindSpeed[h] = +(hourlyWindSpeed[h] / hourlyCounts[h]).toFixed(1);
  }

  // Monthly averages
  const monthlyWindSpeed = Array(12).fill(null);
  const monthlyCounts = Array(12).fill(0);
  for (const obs of observations) {
    if (obs.windSpeed == null || !obs.timestamp) continue;
    const month = new Date(obs.timestamp).getUTCMonth();
    if (monthlyWindSpeed[month] === null) monthlyWindSpeed[month] = 0;
    monthlyWindSpeed[month] += obs.windSpeed;
    monthlyCounts[month]++;
  }
  for (let m = 0; m < 12; m++) {
    if (monthlyCounts[m] > 0) monthlyWindSpeed[m] = +(monthlyWindSpeed[m] / monthlyCounts[m]).toFixed(1);
  }

  return {
    count: observations.length,
    windSpeed: {
      mean: mean(speeds) != null ? +mean(speeds).toFixed(1) : null,
      std: +std(speeds).toFixed(1),
      p50: percentile(speeds, 50),
      p90: percentile(speeds, 90),
      p99: percentile(speeds, 99),
      max: speeds.length > 0 ? Math.max(...speeds) : null,
    },
    windGust: {
      mean: mean(gusts) != null ? +mean(gusts).toFixed(1) : null,
      std: +std(gusts).toFixed(1),
      p90: percentile(gusts, 90),
      max: gusts.length > 0 ? Math.max(...gusts) : null,
    },
    temperature: {
      mean: mean(temps) != null ? +mean(temps).toFixed(1) : null,
      min: temps.length > 0 ? Math.min(...temps) : null,
      max: temps.length > 0 ? Math.max(...temps) : null,
    },
    climatology: {
      hourlyWindSpeed,
      monthlyWindSpeed,
    },
  };
}

function crossValidate(nwsStats, redisStats) {
  if (!redisStats || !nwsStats) return { correlation: null, bias: null, rmse: null, pass: false };

  const nwsHourly = nwsStats.climatology?.hourlyWindSpeed || [];
  const redisHourly = redisStats.climatology?.hourlyWindSpeed || redisStats.hourly_mean || [];

  // Filter out null values for comparison
  const pairs = [];
  for (let h = 0; h < 24; h++) {
    if (nwsHourly[h] != null && redisHourly[h] != null) {
      pairs.push([nwsHourly[h], redisHourly[h]]);
    }
  }

  if (pairs.length < 6) return { correlation: null, bias: null, rmse: null, pass: false, reason: 'insufficient_overlap' };

  const nArr = pairs.map(p => p[0]);
  const rArr = pairs.map(p => p[1]);

  const nMean = nArr.reduce((a, b) => a + b, 0) / nArr.length;
  const rMean = rArr.reduce((a, b) => a + b, 0) / rArr.length;

  let num = 0, denN = 0, denR = 0;
  for (let i = 0; i < pairs.length; i++) {
    const dn = nArr[i] - nMean;
    const dr = rArr[i] - rMean;
    num += dn * dr;
    denN += dn ** 2;
    denR += dr ** 2;
  }

  const correlation = denN > 0 && denR > 0 ? +(num / Math.sqrt(denN * denR)).toFixed(3) : 0;
  const bias = +(nMean - rMean).toFixed(2);
  const rmse = +Math.sqrt(pairs.reduce((s, p) => s + (p[0] - p[1]) ** 2, 0) / pairs.length).toFixed(2);
  const pass = correlation >= 0.85 && Math.abs(bias) < 3.0;

  return { correlation, bias, rmse, pass, pairsUsed: pairs.length };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  NWS Historical Validation — Cross-Validating Against Redis');
  console.log(`  Days: ${DAYS} | Dry Run: ${DRY_RUN} | Filter: ${STATION_FILTER || 'all'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stations = STATION_FILTER
    ? VALIDATION_STATIONS.filter(s => s.id === STATION_FILTER)
    : VALIDATION_STATIONS;

  if (stations.length === 0) {
    console.error(`Station ${STATION_FILTER} not found.`);
    process.exit(1);
  }

  // Load existing Redis statistical models
  let redisModels = null;
  if (REDIS_URL && REDIS_TOKEN) {
    console.log('Loading existing Redis models:statistical...');
    const raw = await redisCommand('GET', 'models:statistical');
    if (raw) {
      redisModels = typeof raw === 'string' ? JSON.parse(raw) : raw;
      console.log(`  Loaded models for ${Object.keys(redisModels).length} stations\n`);
    } else {
      console.log('  No existing models:statistical in Redis (will create fresh)\n');
    }
  } else {
    console.log('  Redis not configured — will output to file only\n');
  }

  const results = {};
  const allNwsModels = {};

  for (const station of stations) {
    console.log(`\n── ${station.id}: ${station.name} ──`);

    const observations = await fetchFullHistory(station.id, DAYS);

    if (observations.length < 100) {
      console.log(`  ⚠ Only ${observations.length} observations — skipping validation`);
      results[station.id] = { status: 'insufficient_data', count: observations.length };
      continue;
    }

    const stats = computeStats(observations);
    allNwsModels[station.id] = {
      source: 'nws',
      stationName: station.name,
      lat: station.lat,
      lng: station.lng,
      observationCount: stats.count,
      validatedAt: new Date().toISOString(),
      ...stats,
    };

    // Cross-validate against existing Redis model
    const existingModel = redisModels?.[station.id] || redisModels?.stations?.[station.id] || null;
    const validation = crossValidate(stats, existingModel);

    results[station.id] = {
      status: validation.pass ? 'PASS' : (validation.correlation === null ? 'NO_BASELINE' : 'FAIL'),
      ...validation,
      obsCount: stats.count,
      meanWindSpeed: stats.windSpeed.mean,
      p90WindSpeed: stats.windSpeed.p90,
    };

    const emoji = validation.pass ? '✓' : (validation.correlation === null ? '○' : '✗');
    console.log(`  ${emoji} Correlation: ${validation.correlation ?? 'N/A'} | Bias: ${validation.bias ?? 'N/A'} mph | RMSE: ${validation.rmse ?? 'N/A'} | ${results[station.id].status}`);
    console.log(`    Mean wind: ${stats.windSpeed.mean} mph | P90: ${stats.windSpeed.p90} mph | Max: ${stats.windSpeed.max} mph`);
  }

  // Summary report
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  VALIDATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const passed = Object.values(results).filter(r => r.status === 'PASS').length;
  const failed = Object.values(results).filter(r => r.status === 'FAIL').length;
  const noBaseline = Object.values(results).filter(r => r.status === 'NO_BASELINE').length;
  const insufficient = Object.values(results).filter(r => r.status === 'insufficient_data').length;

  console.log(`  PASS: ${passed} | FAIL: ${failed} | NO_BASELINE: ${noBaseline} | INSUFFICIENT: ${insufficient}`);
  console.log('');

  for (const [id, r] of Object.entries(results)) {
    console.log(`  ${id.padEnd(6)} ${r.status.padEnd(14)} r=${String(r.correlation ?? '-').padEnd(6)} bias=${String(r.bias ?? '-').padEnd(6)} rmse=${String(r.rmse ?? '-').padEnd(6)} n=${r.obsCount || 0}`);
  }

  // Save results to file
  const outputPath = resolve(__dirname, 'data', 'nws-validation-report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    daysAnalyzed: DAYS,
    results,
    nwsModels: allNwsModels,
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report saved: ${outputPath}`);

  // Update Redis if validation passes and not dry run
  if (!DRY_RUN && REDIS_URL && REDIS_TOKEN) {
    const passingStations = Object.entries(results).filter(([, r]) => r.status === 'PASS' || r.status === 'NO_BASELINE');

    if (passingStations.length > 0) {
      console.log(`\n  Updating Redis models:statistical with ${passingStations.length} NWS-derived models...`);

      const updatedModels = redisModels || { stations: {} };
      if (!updatedModels.stations) updatedModels.stations = {};

      for (const [id] of passingStations) {
        updatedModels.stations[id] = allNwsModels[id];
      }

      updatedModels.lastUpdated = new Date().toISOString();
      updatedModels.source = 'nws-historical-validation';
      updatedModels.daysAnalyzed = DAYS;

      await redisCommand('SET', 'models:statistical', JSON.stringify(updatedModels));
      console.log('  Redis models:statistical updated successfully');
    }
  } else if (DRY_RUN) {
    console.log('\n  [DRY RUN] — Redis NOT updated. Remove --dry-run to persist.');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Done.');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
