#!/usr/bin/env node
/**
 * Validation Health Check
 *
 * Reads the last 24 hours of obs:* and validation:pairs:* from Redis
 * and reports per-source, per-station observation counts and gaps.
 *
 * Usage: node scripts/validation-health.js
 *
 * Requires: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN in .env
 */

import 'dotenv/config';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  const resp = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
  });
  const json = await resp.json();
  return json.result;
}

async function main() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('Redis credentials required in .env');
    process.exit(1);
  }

  console.log('=== Synoptic Migration — Validation Health Check ===\n');

  // Get recent observation keys from the index
  const obsKeys = await redis('LRANGE', 'obs:index', '0', '95'); // ~24h at 15-min intervals
  console.log(`Observation snapshots (last 24h): ${obsKeys?.length || 0}\n`);

  if (!obsKeys || obsKeys.length === 0) {
    console.log('No observation data found. Is the cron running?');
    return;
  }

  const sourceCounts = { synoptic: 0, nws: 0, 'wu-pws': 0, tempest: 0, udot: 0, unknown: 0 };
  const stationHits = {};
  const stationSources = {};
  let totalSnapshots = 0;

  // Sample every 4th key to stay within Redis budget (~24 reads)
  const sampleKeys = obsKeys.filter((_, i) => i % 4 === 0);
  console.log(`Sampling ${sampleKeys.length} of ${obsKeys.length} snapshots...\n`);

  for (const key of sampleKeys) {
    try {
      const raw = await redis('GET', key);
      if (!raw) continue;
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
      totalSnapshots++;

      for (const s of (record.stations || [])) {
        const src = s.source || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        stationHits[s.stationId] = (stationHits[s.stationId] || 0) + 1;
        stationSources[s.stationId] = src;
      }
    } catch (e) {
      console.warn(`  Failed to parse ${key}: ${e.message}`);
    }
  }

  // Source summary
  console.log('--- Source Distribution (sampled) ---');
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    if (count === 0) continue;
    const avgPerSnap = (count / totalSnapshots).toFixed(1);
    console.log(`  ${src.padEnd(12)} ${count} total obs  (${avgPerSnap} stations/snapshot)`);
  }

  // Station health
  console.log(`\n--- Station Health (${Object.keys(stationHits).length} unique stations) ---`);
  const entries = Object.entries(stationHits).sort((a, b) => b[1] - a[1]);
  const maxHits = totalSnapshots;

  const healthy = [];
  const degraded = [];
  const dead = [];

  for (const [stid, hits] of entries) {
    const pct = Math.round(hits / maxHits * 100);
    const src = stationSources[stid] || '?';
    const entry = { stid, hits, pct, src };
    if (pct >= 75) healthy.push(entry);
    else if (pct >= 25) degraded.push(entry);
    else dead.push(entry);
  }

  console.log(`\n  ✅ Healthy (>=75% uptime): ${healthy.length} stations`);
  console.log(`  ⚠️  Degraded (25-74%):     ${degraded.length} stations`);
  console.log(`  ❌ Dead/Missing (<25%):     ${dead.length} stations`);

  if (degraded.length > 0) {
    console.log('\n  Degraded stations:');
    for (const e of degraded) {
      console.log(`    ${e.stid.padEnd(18)} ${e.pct}% uptime  [${e.src}]`);
    }
  }
  if (dead.length > 0) {
    console.log('\n  Dead/Missing stations:');
    for (const e of dead) {
      console.log(`    ${e.stid.padEnd(18)} ${e.pct}% uptime  [${e.src}]`);
    }
  }

  // Validation pairs health
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (const day of [today, yesterday]) {
    const pairsKey = `validation:pairs:${day}`;
    const pairsLen = await redis('LLEN', pairsKey);
    if (pairsLen && pairsLen > 0) {
      console.log(`\n--- Validation Pairs: ${day} ---`);
      console.log(`  Snapshots stored: ${pairsLen}`);

      // Read latest pair to show coverage
      const latest = await redis('LINDEX', pairsKey, '-1');
      if (latest) {
        const parsed = typeof latest === 'string' ? JSON.parse(latest) : latest;
        const synIds = Object.keys(parsed.pairs || {});
        let withReplacements = 0;
        for (const synId of synIds) {
          if (Object.keys(parsed.pairs[synId].replacements || {}).length > 0) {
            withReplacements++;
          }
        }
        console.log(`  Synoptic stations tracked: ${synIds.length}`);
        console.log(`  With active replacements:  ${withReplacements}`);
        console.log(`  Without replacements:      ${synIds.length - withReplacements}`);
      }
    }
  }

  console.log('\n=== Health check complete ===');
}

main().catch(e => { console.error(e); process.exit(1); });
