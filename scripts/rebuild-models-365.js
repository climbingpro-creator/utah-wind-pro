#!/usr/bin/env node
/**
 * LOCAL 365-DAY MODEL REBUILD
 * 
 * Bypasses Vercel's 300s timeout by running on your machine.
 * Fetches a full year of Synoptic historical data, builds statistical
 * models with calibration curves, and pushes directly to Upstash Redis.
 * 
 * Usage:
 *   node scripts/rebuild-models-365.js
 * 
 * Requires these env vars (set in .env or pass directly):
 *   SYNOPTIC_TOKEN          — your Synoptic/MesoWest API token
 *   UPSTASH_REDIS_REST_URL  — Upstash Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN — Upstash Redis auth token
 * 
 * Or pass Redis creds as CLI args:
 *   node scripts/rebuild-models-365.js --redis-url=https://... --redis-token=...
 * 
 * Options:
 *   --days=365     Number of days to analyze (default: 365)
 *   --dry-run      Build models but don't push to Redis
 */

import { buildStatisticalModels } from '../api/lib/historicalAnalysis.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse .env file ──
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
  } catch { /* no .env file — that's fine */ }
}

// ── Parse CLI args ──
function parseArgs() {
  const args = { days: 365, dryRun: false, redisUrl: null, redisToken: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--days=')) args.days = parseInt(arg.split('=')[1], 10);
    if (arg === '--dry-run') args.dryRun = true;
    if (arg.startsWith('--redis-url=')) args.redisUrl = arg.split('=').slice(1).join('=');
    if (arg.startsWith('--redis-token=')) args.redisToken = arg.split('=').slice(1).join('=');
  }
  return args;
}

// ── Redis via Upstash REST API ──
async function makeRedisCommand(url, token) {
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

// ── Main ──
async function main() {
  loadEnv();
  const args = parseArgs();

  const synopticToken = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
  const redisUrl = args.redisUrl || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = args.redisToken || process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Utah Wind Pro — Local 365-Day Model Rebuild       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (!synopticToken) {
    console.error('ERROR: SYNOPTIC_TOKEN not found. Set it in .env or as an env var.');
    process.exit(1);
  }

  if (!redisUrl || !redisToken) {
    console.error('ERROR: Redis credentials not found.');
    console.error('');
    console.error('Set them in .env:');
    console.error('  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io');
    console.error('  UPSTASH_REDIS_REST_TOKEN=your_token_here');
    console.error('');
    console.error('Or pass as CLI args:');
    console.error('  node scripts/rebuild-models-365.js --redis-url=https://... --redis-token=...');
    process.exit(1);
  }

  console.log(`  Synoptic token: ${synopticToken.slice(0, 8)}...`);
  console.log(`  Redis URL:      ${redisUrl.slice(0, 30)}...`);
  console.log(`  Days to analyze: ${args.days}`);
  console.log(`  Dry run:         ${args.dryRun}`);
  console.log('');

  const redisCmd = await makeRedisCommand(redisUrl, redisToken);

  // Verify Redis connection
  console.log('  Testing Redis connection...');
  const ping = await redisCmd('PING');
  if (ping !== 'PONG') {
    console.error('  ERROR: Redis PING failed. Check your credentials.');
    process.exit(1);
  }
  console.log('  Redis: connected ✓');
  console.log('');

  // Check existing model
  const existing = await redisCmd('GET', 'models:statistical');
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      console.log(`  Existing model: v${parsed.version}, built ${parsed.builtAt}, ${parsed.daysAnalyzed} days`);
    } catch { console.log('  Existing model: found (could not parse metadata)'); }
  } else {
    console.log('  No existing model in Redis');
  }
  console.log('');

  // Build
  console.log('  Starting build...');
  console.log('  This will take several minutes for 365 days of data.');
  console.log('  Progress logs below:');
  console.log('  ─────────────────────────────────────────────');

  const startTime = Date.now();

  // Use dry-run redis that just logs SET calls
  const targetRedis = args.dryRun
    ? async (cmd, ...a) => {
        if (cmd === 'SET') console.log(`  [DRY RUN] Would SET ${a[0]} (${(a[1].length / 1024).toFixed(0)} KB)`);
        return 'OK';
      }
    : redisCmd;

  try {
    const { models, log } = await buildStatisticalModels(targetRedis, synopticToken, { days: args.days });

    console.log('');
    for (const entry of log) {
      console.log(`  ${entry}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('  ═════════════════════════════════════════════');
    console.log(`  BUILD COMPLETE in ${elapsed}s`);
    console.log('');
    console.log(`  Version:         ${models.version}`);
    console.log(`  Days analyzed:   ${models.daysAnalyzed}`);
    console.log(`  Stations:        ${models.stationCount}`);
    console.log(`  Total readings:  ${models.totalReadings.toLocaleString()}`);
    console.log(`  Events detected: ${Object.values(models.eventCounts).reduce((a, b) => a + b, 0).toLocaleString()}`);
    console.log('');
    console.log('  Event breakdown:');
    for (const [type, count] of Object.entries(models.eventCounts)) {
      console.log(`    ${type.padEnd(20)} ${count.toLocaleString()}`);
    }
    console.log('');
    console.log(`  Lag correlations:    ${Object.keys(models.lagCorrelations).length}`);
    console.log(`  Thermal profiles:    ${Object.keys(models.thermalProfiles).length}`);
    console.log(`  Event fingerprints:  ${Object.keys(models.fingerprints).length}`);

    if (models.calibrationCurves) {
      console.log(`  Calibration curves:  ${Object.keys(models.calibrationCurves.byEventType || {}).length} events, ${Object.keys(models.calibrationCurves.byActivity || {}).length} activities`);
    }

    if (args.dryRun) {
      console.log('');
      console.log('  [DRY RUN] Models built but NOT pushed to Redis.');
      console.log('  Run again without --dry-run to push.');
    } else {
      console.log('');
      console.log('  Models pushed to Redis ✓');
      console.log('  The app will use the new models on next data load.');
    }
    console.log('');

  } catch (err) {
    console.error('');
    console.error(`  BUILD FAILED: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
