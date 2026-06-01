#!/usr/bin/env node
/**
 * PROPAGATION CHAIN VALIDATION SCRIPT
 *
 * Pulls 30 days of Open-Meteo hourly archive data for every station
 * in every propagation chain, then validates:
 *   1. Onset detection — does each station fire in the expected direction window?
 *   2. Lag accuracy   — does the actual onset lag match the configured lag?
 *   3. Hit rate       — when upstream fires, how often does the target arrive?
 *   4. Speed ratios   — are configured speed multipliers accurate?
 *
 * Free data only: Open-Meteo historical archive (no key required).
 *
 * Usage:
 *   node scripts/validate-chains.mjs [--days 30] [--chain zigzag:se_thermal] [--verbose]
 *
 * Output:
 *   scripts/chain-validation-report.md   (human-readable)
 *   scripts/chain-validation-report.json (machine-readable)
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { register } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Custom ESM loader to add .js extensions ─────────────────────────
// The monorepo uses extensionless imports; Node ESM needs explicit .js
const origResolve = import.meta.resolve;

// Register a loader hook inline
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !specifier.endsWith('.js') && !specifier.endsWith('.mjs') && !specifier.endsWith('.json')) {
      try {
        return await nextResolve(specifier + '.js', context);
      } catch {
        return nextResolve(specifier, context);
      }
    }
    return nextResolve(specifier, context);
  }
`), import.meta.url);

// ─── Import chain definitions ────────────────────────────────────────
const { CHAIN_DEFS, LAKE_CHAINS } = await import(
  '../packages/weather/src/services/ThermalPropagation.js'
);
const { STATION_REGISTRY } = await import(
  '../packages/weather/src/config/stationRegistry.js'
);

// ─── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const DAYS = parseInt(getArg('--days') || '30');
const CHAIN_FILTER = getArg('--chain');
const VERBOSE = args.includes('--verbose');

// ─── Constants ───────────────────────────────────────────────────────
const REPORT_MD = resolve(__dirname, 'chain-validation-report.md');
const REPORT_JSON = resolve(__dirname, 'chain-validation-report.json');
const ONSET_SPEED_THRESHOLD = 3; // mph minimum to count as "active"
const THERMAL_HOURS = { start: 7, end: 19 }; // only analyze daytime hours

// ─── Helpers ─────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function isoMinusDays(days) {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

function dirInRange(dir, min, max, wrap = false) {
  if (dir == null) return false;
  if (wrap) return dir >= min || dir <= max;
  return dir >= min && dir <= max;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Open-Meteo Historical Fetch ─────────────────────────────────────
async function fetchOpenMeteoHistory(lat, lng, days) {
  const end = todayISO();
  const start = isoMinusDays(days);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${lat}&longitude=${lng}` +
    `&start_date=${start}&end_date=${end}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m` +
    `&timezone=America/Denver&wind_speed_unit=mph&temperature_unit=fahrenheit`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) {
      console.error(`  ✗ Open-Meteo ${r.status} for (${lat}, ${lng})`);
      return null;
    }
    const j = await r.json();
    if (!j?.hourly?.time?.length) return null;
    return j.hourly;
  } catch (e) {
    console.error(`  ✗ Open-Meteo fetch failed for (${lat}, ${lng}): ${e.message}`);
    return null;
  }
}

// ─── Resolve station coordinates ─────────────────────────────────────
// Try STATION_REGISTRY first, then fall back to lake config coordinates
function getStationCoords(stationId) {
  const reg = STATION_REGISTRY[stationId];
  if (reg?.lat && reg?.lng) return { lat: reg.lat, lng: reg.lng };

  // Known coordinates for stations not in registry
  const FALLBACK_COORDS = {
    QSF:            { lat: 40.115,  lng: -111.655 },
    KUTCOALV2:      { lat: 40.918,  lng: -111.399 },
    KUTWANSH1:      { lat: 40.813,  lng: -111.409 },
    KUTPARKCITY4:   { lat: 40.653,  lng: -111.505 },
    KUTHENEF1:      { lat: 40.981,  lng: -111.488 },
    KUTMORGA4:      { lat: 41.036,  lng: -111.676 },
    KUTMIDWA37:     { lat: 40.513,  lng: -111.474 },
    KUTHURRIC3:     { lat: 37.175,  lng: -113.289 },
    KUTSTGEOR7:     { lat: 37.108,  lng: -113.568 },
    KUTPLEAS11:     { lat: 40.368,  lng: -111.741 },
    KUTCEDAR10:     { lat: 40.415,  lng: -111.764 },
    KUTLEHI160:     { lat: 40.407,  lng: -111.885 },
    KUTSARAT62:     { lat: 40.358,  lng: -111.870 },
    KUTSARAT88:     { lat: 40.340,  lng: -111.880 },
    KUTSANDY188:    { lat: 40.573,  lng: -111.885 },
    KUTDRAPE132:    { lat: 40.521,  lng: -111.864 },
    KUTHEBER105:    { lat: 40.507,  lng: -111.413 },
    PWS:            { lat: 40.302,  lng: -111.880 },
    TEMPEST_DC:     { lat: 40.458,  lng: -111.474 },
    KFIR:           { lat: 41.132,  lng: -110.670 },
    KEVW:           { lat: 41.275,  lng: -110.981 },
    UT1:            { lat: 41.226,  lng: -111.069 },
    KLGU:           { lat: 41.791,  lng: -111.852 },
    BERU1:          { lat: 41.960,  lng: -111.350 },
    KCDC:           { lat: 37.701,  lng: -113.099 },
    KSGU:           { lat: 37.036,  lng: -113.510 },
    KVEL:           { lat: 40.441,  lng: -109.510 },
    KPGA:           { lat: 36.926,  lng: -111.448 },
    KPUC:           { lat: 39.615,  lng: -110.751 },
    KUTIVINS5:      { lat: 37.168,  lng: -113.679 },
    EPMU1:          { lat: 39.367,  lng: -111.582 },
  };

  return FALLBACK_COORDS[stationId] || null;
}

// ─── Group hourly data by day ────────────────────────────────────────
function groupByDay(hourly) {
  const days = {};
  for (let i = 0; i < hourly.time.length; i++) {
    const ts = hourly.time[i];
    const date = ts.split('T')[0];
    const hour = parseInt(ts.split('T')[1].split(':')[0]);
    if (hour < THERMAL_HOURS.start || hour > THERMAL_HOURS.end) continue;

    if (!days[date]) days[date] = [];
    days[date].push({
      hour,
      speed: hourly.wind_speed_10m[i],
      direction: hourly.wind_direction_10m[i],
      gust: hourly.wind_gusts_10m?.[i] ?? null,
      temp: hourly.temperature_2m?.[i] ?? null,
    });
  }
  return days;
}

// ─── Detect onset for a node on a given day ──────────────────────────
function detectOnset(dayReadings, node) {
  if (!dayReadings?.length) return null;

  const isWrap = node.wrap || false;
  const [dirMin, dirMax] = node.dir;
  const speedThreshold = Math.max(node.speed || 0, ONSET_SPEED_THRESHOLD);

  for (const reading of dayReadings) {
    if (
      reading.speed >= speedThreshold &&
      dirInRange(reading.direction, dirMin, dirMax, isWrap)
    ) {
      return {
        hour: reading.hour,
        speed: reading.speed,
        direction: reading.direction,
        gust: reading.gust,
      };
    }
  }
  return null;
}

// ─── Validate a single chain ─────────────────────────────────────────
async function validateChain(chainKey, chainDef) {
  console.log(`\n═══ ${chainKey}: ${chainDef.label} ═══`);

  // Collect unique stations
  const stationIds = chainDef.nodes.map((n) => n.id);
  const stationCoords = {};
  const missingCoords = [];

  for (const id of stationIds) {
    const coords = getStationCoords(id);
    if (coords) {
      stationCoords[id] = coords;
    } else {
      missingCoords.push(id);
    }
  }

  if (missingCoords.length > 0) {
    console.log(`  ⚠ Missing coordinates for: ${missingCoords.join(', ')}`);
  }

  // Fetch historical data for each station (with rate limiting)
  const stationData = {};
  for (const id of stationIds) {
    if (!stationCoords[id]) continue;
    const { lat, lng } = stationCoords[id];
    console.log(`  Fetching ${id} (${lat.toFixed(3)}, ${lng.toFixed(3)})...`);
    const hourly = await fetchOpenMeteoHistory(lat, lng, DAYS);
    if (hourly) {
      stationData[id] = groupByDay(hourly);
      console.log(
        `    ✓ ${Object.keys(stationData[id]).length} days of data`
      );
    } else {
      console.log(`    ✗ No data returned`);
    }
    await sleep(300); // rate limit courtesy
  }

  // Analyze each day
  const target = chainDef.nodes[chainDef.nodes.length - 1];
  const results = {
    chainKey,
    label: chainDef.label,
    flowDir: chainDef.flowDir,
    totalDays: 0,
    signalDays: 0,
    arrivedDays: 0,
    hitRate: 0,
    nodeStats: {},
    lagErrors: {},
    speedRatioActuals: {},
    dayDetails: [],
  };

  // Initialize per-node stats
  for (const node of chainDef.nodes) {
    results.nodeStats[node.id] = {
      name: node.name,
      configuredLag: node.lagMinutes,
      firedDays: 0,
      directionMatchDays: 0,
      avgSpeed: 0,
      avgOnsetHour: 0,
      totalSpeed: 0,
      totalOnsetHour: 0,
      optional: node.optional || false,
    };
    results.lagErrors[node.id] = [];
  }

  // Get all dates that ALL non-optional required stations have data for
  const requiredStations = chainDef.nodes
    .filter((n) => !n.optional && stationData[n.id])
    .map((n) => n.id);

  if (requiredStations.length === 0) {
    console.log('  ✗ No required stations have data — skipping chain');
    return results;
  }

  const allDates = new Set();
  for (const id of Object.keys(stationData)) {
    for (const date of Object.keys(stationData[id])) {
      allDates.add(date);
    }
  }

  const validDates = [...allDates]
    .filter((date) => requiredStations.every((id) => stationData[id]?.[date]))
    .sort();

  results.totalDays = validDates.length;
  console.log(`  Analyzing ${validDates.length} valid days...`);

  for (const date of validDates) {
    const dayResult = { date, onsets: {}, targetArrived: false };

    // Detect onset at each node
    for (const node of chainDef.nodes) {
      const dayReadings = stationData[node.id]?.[date];
      if (!dayReadings) continue;

      const onset = detectOnset(dayReadings, node);
      if (onset) {
        dayResult.onsets[node.id] = onset;
        results.nodeStats[node.id].firedDays++;
        results.nodeStats[node.id].totalSpeed += onset.speed;
        results.nodeStats[node.id].totalOnsetHour += onset.hour;
      }
    }

    // Check upstream signal (any non-target station fired)
    const hasUpstream = Object.keys(dayResult.onsets).some(
      (id) => id !== target.id
    );
    if (hasUpstream) results.signalDays++;

    // Check target arrival
    if (dayResult.onsets[target.id]) {
      dayResult.targetArrived = true;
      if (hasUpstream) results.arrivedDays++;
    }

    // Calculate actual lags (relative to target onset)
    if (dayResult.onsets[target.id]) {
      const targetHour = dayResult.onsets[target.id].hour;
      for (const node of chainDef.nodes) {
        if (node.id === target.id) continue;
        if (!dayResult.onsets[node.id]) continue;

        const nodeHour = dayResult.onsets[node.id].hour;
        const actualLagMinutes = (nodeHour - targetHour) * 60;
        results.lagErrors[node.id].push({
          date,
          actualLagMinutes,
          configuredLag: node.lagMinutes,
          error: actualLagMinutes - node.lagMinutes,
        });
      }

      // Speed ratios
      if (chainDef.speedRatios) {
        for (const [nodeId, configRatio] of Object.entries(
          chainDef.speedRatios
        )) {
          if (
            dayResult.onsets[nodeId] &&
            dayResult.onsets[target.id]
          ) {
            const nodeSpeed = dayResult.onsets[nodeId].speed;
            const targetSpeed = dayResult.onsets[target.id].speed;
            if (targetSpeed > 0) {
              if (!results.speedRatioActuals[nodeId])
                results.speedRatioActuals[nodeId] = [];
              results.speedRatioActuals[nodeId].push({
                date,
                nodeSpeed,
                targetSpeed,
                actualRatio: +(nodeSpeed / targetSpeed).toFixed(2),
                configRatio,
              });
            }
          }
        }
      }
    }

    if (VERBOSE) results.dayDetails.push(dayResult);
  }

  // Compute averages
  results.hitRate =
    results.signalDays > 0
      ? Math.round((results.arrivedDays / results.signalDays) * 100)
      : 0;

  for (const node of chainDef.nodes) {
    const ns = results.nodeStats[node.id];
    if (ns.firedDays > 0) {
      ns.avgSpeed = +(ns.totalSpeed / ns.firedDays).toFixed(1);
      ns.avgOnsetHour = +(ns.totalOnsetHour / ns.firedDays).toFixed(1);
    }
    delete ns.totalSpeed;
    delete ns.totalOnsetHour;
  }

  // Compute lag statistics
  const lagSummary = {};
  for (const [nodeId, errors] of Object.entries(results.lagErrors)) {
    if (errors.length === 0) {
      lagSummary[nodeId] = { samples: 0 };
      continue;
    }
    const errs = errors.map((e) => e.error);
    const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
    const mae = errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length;
    const configured = errors[0].configuredLag;
    const actualAvg =
      errors.reduce((a, e) => a + e.actualLagMinutes, 0) / errors.length;

    lagSummary[nodeId] = {
      samples: errors.length,
      configuredLag: configured,
      actualAvgLag: Math.round(actualAvg),
      meanError: Math.round(mean),
      mae: Math.round(mae),
      recommendedLag: Math.round(actualAvg),
    };
  }
  results.lagSummary = lagSummary;

  // Speed ratio summary
  const speedRatioSummary = {};
  for (const [nodeId, ratios] of Object.entries(results.speedRatioActuals)) {
    const actualRatios = ratios.map((r) => r.actualRatio);
    const avgActual =
      actualRatios.reduce((a, b) => a + b, 0) / actualRatios.length;
    speedRatioSummary[nodeId] = {
      configRatio: ratios[0].configRatio,
      actualAvgRatio: +avgActual.toFixed(2),
      samples: ratios.length,
      recommendation:
        Math.abs(avgActual - ratios[0].configRatio) > 0.3
          ? +avgActual.toFixed(2)
          : null,
    };
  }
  results.speedRatioSummary = speedRatioSummary;

  // Console summary
  console.log(`  Results:`);
  console.log(`    Days analyzed: ${results.totalDays}`);
  console.log(
    `    Upstream signal: ${results.signalDays} days (${Math.round((results.signalDays / Math.max(results.totalDays, 1)) * 100)}%)`
  );
  console.log(
    `    Target arrived: ${results.arrivedDays} days → Hit rate: ${results.hitRate}%`
  );
  for (const [nodeId, ls] of Object.entries(lagSummary)) {
    if (ls.samples === 0) continue;
    const drift =
      Math.abs(ls.meanError) > 30 ? ' ⚠ NEEDS TUNING' : ' ✓';
    console.log(
      `    ${nodeId}: configured=${ls.configuredLag}min, actual=${ls.actualAvgLag}min, MAE=${ls.mae}min${drift}`
    );
  }

  return results;
}

// ─── Generate Markdown Report ────────────────────────────────────────
function generateMarkdown(allResults) {
  const lines = [];
  lines.push('# Propagation Chain Validation Report');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`Data range: ${DAYS} days`);
  lines.push(`Chains validated: ${allResults.length}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push(
    '| Chain | Hit Rate | Signal Days | Arrived | Worst Lag Error | Status |'
  );
  lines.push(
    '|-------|----------|-------------|---------|-----------------|--------|'
  );
  for (const r of allResults) {
    const worstLag = Object.values(r.lagSummary || {})
      .filter((ls) => ls.samples > 0)
      .reduce((worst, ls) => Math.max(worst, ls.mae), 0);
    const status =
      r.hitRate >= 70
        ? '✅ Good'
        : r.hitRate >= 50
          ? '⚠️ Needs work'
          : r.hitRate > 0
            ? '❌ Poor'
            : '❓ No data';
    lines.push(
      `| ${r.chainKey} | ${r.hitRate}% | ${r.signalDays}/${r.totalDays} | ${r.arrivedDays} | ${worstLag} min | ${status} |`
    );
  }

  // Detailed sections
  for (const r of allResults) {
    lines.push('');
    lines.push(`## ${r.chainKey}: ${r.label}`);
    lines.push(`Flow: ${r.flowDir}`);
    lines.push('');

    // Node stats table
    lines.push('### Station Performance');
    lines.push('');
    lines.push(
      '| Station | Fired | Avg Speed | Avg Onset | Config Lag | Actual Lag | MAE | Recommendation |'
    );
    lines.push(
      '|---------|-------|-----------|-----------|------------|------------|-----|----------------|'
    );
    for (const node of Object.keys(r.nodeStats)) {
      const ns = r.nodeStats[node];
      const ls = r.lagSummary?.[node] || {};
      const rec =
        ls.samples > 3 && Math.abs(ls.meanError || 0) > 30
          ? `→ ${ls.recommendedLag} min`
          : '—';
      lines.push(
        `| ${node} ${ns.optional ? '(opt)' : ''} | ${ns.firedDays}/${r.totalDays} (${Math.round((ns.firedDays / Math.max(r.totalDays, 1)) * 100)}%) | ${ns.avgSpeed} mph | ${ns.avgOnsetHour}h | ${ls.configuredLag ?? '0'} min | ${ls.actualAvgLag ?? '—'} min | ${ls.mae ?? '—'} | ${rec} |`
      );
    }

    // Speed ratios
    if (Object.keys(r.speedRatioSummary || {}).length > 0) {
      lines.push('');
      lines.push('### Speed Ratios');
      lines.push('');
      lines.push(
        '| Station | Config Ratio | Actual Ratio | Samples | Recommendation |'
      );
      lines.push(
        '|---------|-------------|--------------|---------|----------------|'
      );
      for (const [nodeId, sr] of Object.entries(r.speedRatioSummary)) {
        const rec = sr.recommendation
          ? `→ ${sr.recommendation}`
          : '—';
        lines.push(
          `| ${nodeId} | ${sr.configRatio} | ${sr.actualAvgRatio} | ${sr.samples} | ${rec} |`
        );
      }
    }

    // Recommendations
    const recs = [];
    if (r.hitRate < 50 && r.totalDays > 10) {
      recs.push(
        'Low hit rate — direction thresholds or speed triggers may be too restrictive'
      );
    }
    for (const [nodeId, ls] of Object.entries(r.lagSummary || {})) {
      if (ls.samples > 3 && Math.abs(ls.meanError || 0) > 30) {
        recs.push(
          `**${nodeId}**: Lag drift ${ls.meanError > 0 ? '+' : ''}${ls.meanError} min — update to ${ls.recommendedLag} min`
        );
      }
    }
    if (recs.length > 0) {
      lines.push('');
      lines.push('### Recommendations');
      for (const rec of recs) {
        lines.push(`- ${rec}`);
      }
    }
  }

  // Global recommendations
  lines.push('');
  lines.push('## Global Recommendations');
  lines.push('');

  const poorChains = allResults.filter(
    (r) => r.hitRate < 50 && r.totalDays > 10
  );
  const goodChains = allResults.filter((r) => r.hitRate >= 70);
  const tuningNeeded = allResults.filter((r) =>
    Object.values(r.lagSummary || {}).some(
      (ls) => ls.samples > 3 && Math.abs(ls.meanError || 0) > 30
    )
  );

  lines.push(`- **Well-calibrated chains (≥70% hit rate):** ${goodChains.length}`);
  lines.push(`- **Chains needing work (<50% hit rate):** ${poorChains.length}`);
  lines.push(`- **Chains with lag drift (>30 min MAE):** ${tuningNeeded.length}`);

  if (poorChains.length > 0) {
    lines.push('');
    lines.push('### Poor chains to investigate:');
    for (const r of poorChains) {
      lines.push(`- **${r.chainKey}** — ${r.hitRate}% hit rate (${r.arrivedDays}/${r.signalDays} signal days)`);
    }
  }

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  PROPAGATION CHAIN VALIDATION                       ║`);
  console.log(`║  ${DAYS} days of Open-Meteo historical data              ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);

  const chainKeys = CHAIN_FILTER
    ? [CHAIN_FILTER]
    : Object.keys(CHAIN_DEFS);

  console.log(`\nValidating ${chainKeys.length} chains...`);

  const allResults = [];
  for (const chainKey of chainKeys) {
    const def = CHAIN_DEFS[chainKey];
    if (!def) {
      console.log(`\n⚠ Chain '${chainKey}' not found — skipping`);
      continue;
    }
    const result = await validateChain(chainKey, def);
    allResults.push(result);
  }

  // Write reports
  const md = generateMarkdown(allResults);
  writeFileSync(REPORT_MD, md, 'utf-8');
  console.log(`\n✓ Markdown report → ${REPORT_MD}`);

  const jsonData = {
    generated: new Date().toISOString(),
    days: DAYS,
    chains: allResults.map((r) => {
      const { dayDetails, ...rest } = r;
      return rest;
    }),
  };
  writeFileSync(REPORT_JSON, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✓ JSON report    → ${REPORT_JSON}`);

  // Final summary
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  VALIDATION COMPLETE                                ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  const good = allResults.filter((r) => r.hitRate >= 70).length;
  const ok = allResults.filter(
    (r) => r.hitRate >= 50 && r.hitRate < 70
  ).length;
  const poor = allResults.filter(
    (r) => r.hitRate < 50 && r.totalDays > 10
  ).length;
  const noData = allResults.filter(
    (r) => r.totalDays <= 10
  ).length;
  console.log(`║  ✅ Good (≥70%):      ${String(good).padStart(3)}                          ║`);
  console.log(`║  ⚠️  Needs work:       ${String(ok).padStart(3)}                          ║`);
  console.log(`║  ❌ Poor (<50%):       ${String(poor).padStart(3)}                          ║`);
  console.log(`║  ❓ Insufficient data: ${String(noData).padStart(3)}                          ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
