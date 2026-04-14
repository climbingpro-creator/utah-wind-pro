#!/usr/bin/env node
/**
 * BOOTSTRAP FISHING LEARNING — 3-Lap Historical Learning Pass
 *
 * Runs three full laps through recent obs:index snapshots stored in Redis.
 * Each lap processes all fishing-relevant waters through the learning engine,
 * building up lag times, speed ratios, cross-validation calibrations,
 * and fishing-specific activity weights.
 *
 * Lap 1: Raw bootstrap — learns initial biases from scratch
 * Lap 2: Refinement — uses Lap 1 weights to improve predictions
 * Lap 3: Stabilization — final weight tuning, converges
 *
 * Usage:
 *   node scripts/bootstrap-fishing-learning.mjs
 *   node scripts/bootstrap-fishing-learning.mjs --laps=2
 *   node scripts/bootstrap-fishing-learning.mjs --max-snapshots=500
 */

import { readFileSync } from 'fs';
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
  } catch { /* ok */ }
}
loadEnv();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env');
  process.exit(1);
}

async function redis(command, ...args) {
  const resp = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
  });
  if (!resp.ok) throw new Error(`Redis ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.result;
}

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : def;
};
const NUM_LAPS = parseInt(getArg('laps', '3'), 10);
const MAX_SNAPSHOTS = parseInt(getArg('max-snapshots', '2880'), 10);

async function loadSnapshots() {
  console.log('Loading obs:index from Redis...');
  const keys = await redis('LRANGE', 'obs:index', '0', String(MAX_SNAPSHOTS - 1));
  if (!keys?.length) {
    console.error('No snapshots found in obs:index');
    return [];
  }
  console.log(`  Found ${keys.length} snapshot keys`);

  // Fetch in batches of 50
  const snapshots = [];
  for (let i = 0; i < keys.length; i += 50) {
    const batch = keys.slice(i, i + 50);
    const values = await redis('MGET', ...batch);
    for (const raw of (values || [])) {
      if (!raw) continue;
      try {
        snapshots.push(JSON.parse(raw));
      } catch { /* skip malformed */ }
    }
    process.stdout.write(`\r  Loaded ${snapshots.length}/${keys.length} snapshots`);
  }
  console.log('');

  // Sort chronologically
  snapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  console.log(`  ${snapshots.length} valid snapshots spanning ${snapshots[0]?.timestamp?.split('T')[0]} → ${snapshots[snapshots.length - 1]?.timestamp?.split('T')[0]}`);
  return snapshots;
}

function toMountainHour(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver', hour: 'numeric', hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    const month = date.getUTCMonth();
    const offset = (month >= 2 && month <= 10) ? 6 : 7;
    return (date.getUTCHours() - offset + 24) % 24;
  }
}

// Dynamically import the modules we need
async function loadModules() {
  const { LAKE_STATION_MAP } = await import('../api/lib/stations.js');
  const { analyzeAllSpots } = await import('../api/lib/serverPropagation.js');
  const { runServerLearningCycle, loadWeights, saveWeights } = await import('../api/lib/serverLearning.js');
  return { LAKE_STATION_MAP, analyzeAllSpots, runServerLearningCycle, loadWeights, saveWeights };
}

async function runLap(lapNum, snapshots, modules) {
  const { LAKE_STATION_MAP, analyzeAllSpots, runServerLearningCycle } = modules;
  const startTime = Date.now();
  let totalPredictions = 0;
  let totalVerifications = 0;
  let errors = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  LAP ${lapNum} of ${NUM_LAPS} — Processing ${snapshots.length} snapshots`);
  console.log(`${'═'.repeat(60)}`);

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    const stations = snap.stations || [];
    if (stations.length === 0) continue;

    // Build recent history (previous 12 snapshots)
    const recentSnapshots = [];
    for (let j = Math.max(0, i - 12); j < i; j++) {
      recentSnapshots.push(snapshots[j]);
    }

    // Extract ambient PWS if present
    let ambientPWS = null;
    try {
      const pws = stations.find(s => s.stationId === 'PWS');
      if (pws) ambientPWS = pws;
    } catch { /* ok */ }

    try {
      // Run propagation (for context but don't persist during bootstrap)
      analyzeAllSpots(stations, ambientPWS, null);

      // Run the full learning cycle
      const result = await runServerLearningCycle(
        redis,
        stations,
        recentSnapshots,
        LAKE_STATION_MAP,
        null // no NWS during bootstrap
      );

      totalPredictions += result.predictionsMade || 0;
      totalVerifications += result.verificationsRun || 0;
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  Error at snapshot ${i}: ${err.message}`);
      }
    }

    if ((i + 1) % 100 === 0 || i === snapshots.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = ((i + 1) / snapshots.length * 100).toFixed(1);
      process.stdout.write(`\r  Lap ${lapNum}: ${pct}% (${i + 1}/${snapshots.length}) — ${totalPredictions} predictions, ${totalVerifications} verifications — ${elapsed}s`);
    }
  }

  console.log('');
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Lap ${lapNum} complete: ${totalPredictions} predictions, ${totalVerifications} verifications, ${errors} errors in ${elapsed}s`);

  // Read final weights
  const weights = await modules.loadWeights(redis);
  const fishingCount = weights?.fishingWeights ? Object.keys(weights.fishingWeights).length : 0;
  const overallAcc = weights?.meta?.overallAccuracy ?? 'N/A';
  const fishingAcc = weights?.meta?.fishingAccuracy ?? 'N/A';
  console.log(`  Weights: overall accuracy=${overallAcc}, fishing accuracy=${fishingAcc}, fishing locations=${fishingCount}`);

  return { totalPredictions, totalVerifications, errors, elapsed: parseFloat(elapsed) };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  BOOTSTRAP FISHING LEARNING — 3-Lap Historical Pass      ║');
  console.log(`║  Laps: ${NUM_LAPS}  |  Max snapshots: ${MAX_SNAPSHOTS}                      ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  const snapshots = await loadSnapshots();
  if (snapshots.length < 10) {
    console.error('Not enough snapshots to bootstrap (need at least 10)');
    process.exit(1);
  }

  const modules = await loadModules();
  const lapResults = [];

  for (let lap = 1; lap <= NUM_LAPS; lap++) {
    const result = await runLap(lap, snapshots, modules);
    lapResults.push(result);
  }

  // Final summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  BOOTSTRAP COMPLETE');
  console.log(`${'═'.repeat(60)}`);

  const finalWeights = await modules.loadWeights(redis);

  console.log(`\n  Laps completed: ${NUM_LAPS}`);
  console.log(`  Total snapshots per lap: ${snapshots.length}`);
  for (let i = 0; i < lapResults.length; i++) {
    const r = lapResults[i];
    console.log(`  Lap ${i + 1}: ${r.totalPredictions} predictions, ${r.totalVerifications} verifications, ${r.errors} errors (${r.elapsed}s)`);
  }

  if (finalWeights?.meta) {
    console.log(`\n  Final overall accuracy: ${finalWeights.meta.overallAccuracy ?? 'N/A'}`);
    console.log(`  Final fishing accuracy: ${finalWeights.meta.fishingAccuracy ?? 'N/A'}`);
    console.log(`  Total predictions tracked: ${finalWeights.meta.totalPredictions ?? 0}`);
  }

  if (finalWeights?.fishingWeights) {
    const entries = Object.entries(finalWeights.fishingWeights);
    console.log(`\n  Fishing weights learned for ${entries.length} locations:`);
    for (const [key, val] of entries.sort((a, b) => b[1].count - a[1].count).slice(0, 15)) {
      console.log(`    ${key}: avgScore=${val.avgScore}, speedBias=${val.speedBias?.toFixed(2) ?? '0'}, samples=${val.count}`);
    }
    if (entries.length > 15) console.log(`    ... and ${entries.length - 15} more`);
  }

  // Read learned lags
  try {
    const lagsRaw = await redis('GET', 'prop:lags');
    if (lagsRaw) {
      const lags = JSON.parse(lagsRaw);
      const lagEntries = Object.entries(lags);
      console.log(`\n  Propagation lags learned: ${lagEntries.length} entries`);
      const fishingLags = lagEntries.filter(([k]) =>
        k.includes('provo') || k.includes('green') || k.includes('bear') ||
        k.includes('willard') || k.includes('weber')
      );
      if (fishingLags.length > 0) {
        console.log('  Fishing-relevant lags:');
        for (const [key, val] of fishingLags.slice(0, 10)) {
          console.log(`    ${key}: avgLag=${val.avgLag}min, samples=${val.samples}`);
        }
      }
    }
  } catch { /* ok */ }

  // Read cross-validation ratios
  try {
    const cvRaw = await redis('GET', 'crossval:ratios');
    if (cvRaw) {
      const cv = JSON.parse(cvRaw);
      const cvEntries = Object.entries(cv);
      console.log(`\n  Cross-validation ratios: ${cvEntries.length} pairs calibrated`);
    }
  } catch { /* ok */ }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
