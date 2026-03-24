#!/usr/bin/env node
/**
 * LOCAL HISTORICAL BACKFILL
 * 
 * Replays the full predict → verify → learn loop for missed days.
 * Fetches historical data from Synoptic, runs predictions at each
 * 15-minute interval, verifies them against actuals, and updates weights.
 * 
 * Usage:
 *   node scripts/backfill-missed-days.js           # defaults to 4 days
 *   node scripts/backfill-missed-days.js --days=7  # custom range
 */

import { backfillHistorical, loadWeights, loadMeta } from '../api/lib/serverLearning.js';
import { ALL_STATION_IDS, LAKE_STATION_MAP } from '../api/lib/stations.js';
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
  } catch { /* no .env */ }
}

function parseArgs() {
  const args = { days: 4 };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--days=')) args.days = parseInt(arg.split('=')[1], 10);
  }
  return args;
}

async function makeRedisCmd(url, token) {
  return async function redisCommand(command, ...args) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([command, ...args]),
      });
      if (!resp.ok) {
        console.error(`  Redis ${command} failed: HTTP ${resp.status}`);
        return null;
      }
      const data = await resp.json();
      return data.result;
    } catch (err) {
      console.error(`  Redis ${command} error: ${err.message}`);
      return null;
    }
  };
}

async function main() {
  loadEnv();
  const args = parseArgs();

  const synopticToken = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Utah Wind Pro — Historical Backfill               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (!synopticToken) { console.error('ERROR: SYNOPTIC_TOKEN not found.'); process.exit(1); }
  if (!redisUrl || !redisToken) { console.error('ERROR: Redis credentials not found in .env'); process.exit(1); }

  const redisCmd = await makeRedisCmd(redisUrl, redisToken);

  const ping = await redisCmd('PING');
  if (ping !== 'PONG') { console.error('ERROR: Redis PING failed.'); process.exit(1); }
  console.log('  Redis: connected ✓');

  const metaBefore = await loadMeta(redisCmd);
  const weightsBefore = await loadWeights(redisCmd);
  console.log(`  Current state: ${metaBefore.totalCycles} cycles, ${metaBefore.totalVerified} verifications`);
  console.log(`  Overall accuracy: ${weightsBefore?.meta?.overallAccuracy ? (weightsBefore.meta.overallAccuracy * 100).toFixed(1) + '%' : 'n/a'}`);
  console.log('');
  console.log(`  Backfilling ${args.days} days of missed data...`);
  console.log(`  (${args.days * 96} time steps × 42 lakes × 7 event types)`);
  console.log('  This will take a few minutes...');
  console.log('');

  const startTime = Date.now();

  try {
    const result = await backfillHistorical(
      redisCmd,
      synopticToken,
      ALL_STATION_IDS,
      LAKE_STATION_MAP,
      args.days
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('  ═════════════════════════════════════════════');
    console.log(`  BACKFILL COMPLETE in ${elapsed}s`);
    console.log('');
    console.log(`  Time steps processed: ${result.timeSteps}`);
    console.log(`  Predictions made:     ${result.totalPredictions.toLocaleString()}`);
    console.log(`  Verifications:        ${result.totalVerifications.toLocaleString()}`);
    console.log(`  Accuracy records:     ${result.totalAccuracyRecords.toLocaleString()}`);
    console.log(`  Final accuracy:       ${result.finalAccuracy ? (result.finalAccuracy * 100).toFixed(1) + '%' : 'n/a'}`);
    console.log('');

    if (result.eventAccuracy) {
      console.log('  Event accuracy after backfill:');
      for (const [type, data] of Object.entries(result.eventAccuracy)) {
        if (data) {
          console.log(`    ${type.padEnd(20)} ${(data.accuracy * 100).toFixed(1)}% (${data.count.toLocaleString()} obs, probMod: ${data.probMod})`);
        }
      }
    }

    const metaAfter = await loadMeta(redisCmd);
    console.log('');
    console.log(`  Total cycles now: ${metaAfter.totalCycles}`);
    console.log(`  Total verified:   ${metaAfter.totalVerified.toLocaleString()}`);
    console.log('');
    console.log('  Weights updated and saved to Redis ✓');
    console.log('');
  } catch (err) {
    console.error(`  BACKFILL FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
