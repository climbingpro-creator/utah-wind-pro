#!/usr/bin/env node
/**
 * Correlation Builder
 *
 * Reads validation:pairs:* from Redis (7+ days of paired readings) and
 * computes per-pair correlation metrics:
 *   - Speed ratio (median replacement/synoptic when both > 2mph)
 *   - Direction offset (circular mean)
 *   - Gust factor ratio
 *   - Uptime (% intervals with valid replacement data)
 *   - Pearson R for wind speed
 *   - Sample count
 *
 * Outputs a JSON report and optionally writes models:translations to Redis.
 *
 * Usage: node scripts/correlation-builder.js [--write-models]
 *
 * Requires: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN in .env
 */

import 'dotenv/config';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const WRITE_MODELS = process.argv.includes('--write-models');

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

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function circularMean(angles) {
  if (angles.length === 0) return null;
  let sinSum = 0, cosSum = 0;
  for (const a of angles) {
    const rad = a * Math.PI / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let mean = Math.atan2(sinSum / angles.length, cosSum / angles.length) * 180 / Math.PI;
  if (mean < -180) mean += 360;
  if (mean > 180) mean -= 360;
  return Math.round(mean * 10) / 10;
}

function pearsonR(x, y) {
  if (x.length < 5) return null;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : Math.round(num / den * 1000) / 1000;
}

async function main() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('Redis credentials required in .env');
    process.exit(1);
  }

  console.log('=== Synoptic Migration — Correlation Builder ===\n');

  // Collect all validation:pairs:* keys for the last 14 days
  const allPairs = {};
  let totalSnapshots = 0;

  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const d = new Date(Date.now() - daysAgo * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const key = `validation:pairs:${dateStr}`;
    const len = await redis('LLEN', key);
    if (!len || len === 0) continue;

    console.log(`Reading ${dateStr}: ${len} snapshots`);

    // Read in batches of 50
    for (let start = 0; start < len; start += 50) {
      const batch = await redis('LRANGE', key, String(start), String(start + 49));
      if (!batch) continue;

      for (const raw of batch) {
        try {
          const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
          totalSnapshots++;

          for (const [synId, data] of Object.entries(record.pairs || {})) {
            if (!allPairs[synId]) allPairs[synId] = {};

            for (const [repId, repData] of Object.entries(data.replacements || {})) {
              if (!allPairs[synId][repId]) {
                allPairs[synId][repId] = {
                  speedRatios: [],
                  dirOffsets: [],
                  gustRatios: [],
                  synSpeeds: [],
                  repSpeeds: [],
                  synPresent: 0,
                  repPresent: 0,
                };
              }
              const pair = allPairs[synId][repId];

              if (data.synoptic.speed != null) pair.synPresent++;
              if (repData.speed != null) pair.repPresent++;

              if (data.synoptic.speed > 2 && repData.speed > 2) {
                pair.speedRatios.push(repData.speed / data.synoptic.speed);
                pair.synSpeeds.push(data.synoptic.speed);
                pair.repSpeeds.push(repData.speed);
              }

              if (data.synoptic.dir != null && repData.dir != null) {
                let offset = repData.dir - data.synoptic.dir;
                if (offset > 180) offset -= 360;
                if (offset < -180) offset += 360;
                pair.dirOffsets.push(offset);
              }

              if (data.synoptic.gust > 2 && repData.gust > 2) {
                pair.gustRatios.push(repData.gust / data.synoptic.gust);
              }
            }
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  console.log(`\nTotal snapshots processed: ${totalSnapshots}`);
  console.log(`Synoptic stations tracked: ${Object.keys(allPairs).length}\n`);

  // Compute correlation metrics
  const results = [];
  const translations = [];

  for (const [synId, replacements] of Object.entries(allPairs)) {
    console.log(`\n${synId}:`);

    for (const [repId, data] of Object.entries(replacements)) {
      const n = data.speedRatios.length;
      const uptime = data.synPresent > 0
        ? Math.round(data.repPresent / data.synPresent * 100)
        : 0;
      const speedRatio = median(data.speedRatios);
      const dirOffset = circularMean(data.dirOffsets);
      const gustRatio = median(data.gustRatios);
      const r = pearsonR(data.synSpeeds, data.repSpeeds);
      const rSq = r != null ? Math.round(r * r * 1000) / 1000 : null;

      let confidence;
      if (rSq > 0.8 && uptime > 90 && speedRatio >= 0.7 && speedRatio <= 1.3 && n > 200) {
        confidence = 'HIGH';
      } else if (rSq > 0.6 && uptime > 70 && n > 100) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'LOW';
      }

      const tag = confidence === 'HIGH' ? '✅' : confidence === 'MEDIUM' ? '🟡' : '❌';
      console.log(`  ${tag} ${repId.padEnd(18)} N=${String(n).padEnd(5)} ratio=${speedRatio?.toFixed(2) ?? '?'}  dir=${dirOffset != null ? dirOffset + '°' : '?'}  gust=${gustRatio?.toFixed(2) ?? '?'}  R²=${rSq ?? '?'}  uptime=${uptime}%  → ${confidence}`);

      const entry = {
        synopticId: synId,
        replacementId: repId,
        speedRatio: speedRatio != null ? Math.round(speedRatio * 1000) / 1000 : null,
        dirOffset: dirOffset,
        gustRatio: gustRatio != null ? Math.round(gustRatio * 1000) / 1000 : null,
        pearsonR: r,
        rSquared: rSq,
        uptime,
        sampleCount: n,
        confidence,
      };
      results.push(entry);

      if (confidence === 'HIGH' || confidence === 'MEDIUM') {
        translations.push(entry);
      }
    }
  }

  // Summary
  const high = results.filter(r => r.confidence === 'HIGH').length;
  const med = results.filter(r => r.confidence === 'MEDIUM').length;
  const low = results.filter(r => r.confidence === 'LOW').length;

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total pairs analyzed: ${results.length}`);
  console.log(`  ✅ HIGH confidence:   ${high}`);
  console.log(`  🟡 MEDIUM confidence: ${med}`);
  console.log(`  ❌ LOW confidence:    ${low}`);

  // Best replacement per Synoptic station
  const bestPer = {};
  for (const r of results) {
    const existing = bestPer[r.synopticId];
    if (!existing || r.confidence === 'HIGH' || (r.confidence === 'MEDIUM' && existing.confidence === 'LOW') || r.sampleCount > existing.sampleCount) {
      bestPer[r.synopticId] = r;
    }
  }

  console.log('\n--- Best Replacement per Station ---');
  for (const [synId, best] of Object.entries(bestPer).sort((a, b) => a[0].localeCompare(b[0]))) {
    const tag = best.confidence === 'HIGH' ? '✅' : best.confidence === 'MEDIUM' ? '🟡' : '❌';
    console.log(`  ${tag} ${synId.padEnd(14)} → ${best.replacementId.padEnd(18)} (${best.confidence}, R²=${best.rSquared ?? '?'}, N=${best.sampleCount})`);
  }

  // Synoptic stations with no viable replacement
  const synIds = new Set(Object.keys(allPairs));
  const coveredIds = new Set(Object.keys(bestPer).filter(id => bestPer[id].confidence !== 'LOW'));
  const uncovered = [...synIds].filter(id => !coveredIds.has(id));
  if (uncovered.length > 0) {
    console.log(`\n⚠️  Stations without HIGH/MEDIUM replacement (${uncovered.length}):`);
    for (const id of uncovered) console.log(`    ${id}`);
  }

  // Write results
  const fs = await import('fs');
  fs.writeFileSync('scripts/correlation-results.json', JSON.stringify(results, null, 2));
  console.log('\nFull results written to scripts/correlation-results.json');

  if (WRITE_MODELS && translations.length > 0) {
    await redis('SET', 'models:translations', JSON.stringify(translations));
    console.log(`\n✅ Wrote ${translations.length} translation models to Redis (models:translations)`);
  } else if (WRITE_MODELS) {
    console.log('\n⚠️  No HIGH/MEDIUM translations to write');
  } else {
    console.log('\nRun with --write-models to push translation models to Redis');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
