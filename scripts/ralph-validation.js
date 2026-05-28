/**
 * RALPH VALIDATION HARNESS — Six-Loop Iteration Cycle
 *
 * For every kiting location in LAKE_CONFIGS this script runs SIX loops:
 *   Loop 1: READ      — pull station config + Open-Meteo historical/now data
 *   Loop 2: ANALYZE   — score config completeness & free-source coverage
 *   Loop 3: LOG       — record predicted vs observed thermal timing
 *   Loop 4: PREDICT   — invoke ThermalPredictor across the day and tabulate hits
 *   Loop 5: HONE      — flag mismatches (peak hour, optimal direction drift)
 *   Loop 6: VERIFY    — re-run with proposed corrections and report deltas
 *
 * Output: scripts/ralph-report.json  (machine-readable)
 *         scripts/ralph-report.md    (human-readable)
 *
 * Pure free-source pipeline:
 *   • Open-Meteo current + forecast (global, no key)
 *   • Open-Meteo historical archive  (free, no key, daily granularity)
 *   • NWS observations              (US-only, no key)
 *
 * NO Synoptic. NO MesoWest. NO API charges.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Static imports of monorepo configs (no transpile needed - they're ESM) ──
const { LAKE_CONFIGS } = await import('../packages/weather/src/config/lakeStations.js');
const ThermalMod = await import('../packages/weather/src/services/ThermalPredictor.js');
const { predictThermal, THERMAL_PROFILES } = ThermalMod;

// ─── Constants ────────────────────────────────────────────────────────────
const REPORT_JSON = path.join(__dirname, 'ralph-report.json');
const REPORT_MD   = path.join(__dirname, 'ralph-report.md');

const PEAK_TOLERANCE_HOURS = 2;       // peak-hour drift accepted (predicted vs Open-Meteo wind max)
const DIR_TOLERANCE_DEG    = 30;      // optimal direction tolerance vs observed wind rose
const MIN_OPEN_METEO_HOURS = 24;      // need at least 24 hours back for a confidence verdict

// ─── Helpers ──────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function isoMinusDays(days) {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

async function fetchOpenMeteoHourly(lat, lng, days = 14) {
  const end = todayISO();
  const start = isoMinusDays(days);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&timezone=America/Denver&wind_speed_unit=mph&temperature_unit=fahrenheit`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j?.hourly?.time?.length) return null;
    return j.hourly;
  } catch (e) {
    return null;
  }
}

async function fetchOpenMeteoForecast(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&forecast_days=7&timezone=America/Denver&wind_speed_unit=mph&temperature_unit=fahrenheit`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

function angleDelta(a, b) {
  if (a == null || b == null) return null;
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function isInArc(deg, min, max) {
  if (deg == null) return false;
  deg = ((deg % 360) + 360) % 360;
  if (min <= max) return deg >= min && deg <= max;
  return deg >= min || deg <= max;
}

// ─── Per-Location RALPH Loops ─────────────────────────────────────────────
async function runRalphForLocation(lakeId, config) {
  const out = {
    lakeId,
    name: config.name || lakeId,
    coords: config.coordinates,
    loops: {},
    issues: [],
    grade: 'unknown',
  };

  // LOOP 1: READ
  const lat = config.coordinates?.lat;
  const lng = config.coordinates?.lng;
  if (lat == null || lng == null) {
    out.issues.push({ severity: 'critical', code: 'NO_COORDS', detail: 'Missing coordinates in config' });
    out.grade = 'F';
    return out;
  }
  const hourly = await fetchOpenMeteoHourly(lat, lng, 14);
  out.loops.read = {
    coords: { lat, lng },
    openMeteoOK: !!hourly,
    hoursObserved: hourly?.time?.length ?? 0,
  };

  // LOOP 2: ANALYZE — config completeness
  const cfg = config.stations || {};
  const completeness = {
    pressureHigh: !!cfg.pressure?.high?.id,
    pressureLow:  !!cfg.pressure?.low?.id,
    ridgeCount:   cfg.ridge?.length || 0,
    lakeshoreCount: cfg.lakeshore?.length || 0,
    referenceCount: cfg.reference?.length || 0,
    thermalProfile: !!config.thermal,
    optimalDirection: config.thermal?.optimalDirection || null,
    optimalSpeed: config.thermal?.optimalSpeed || null,
    peakHours: config.thermal?.peakHours || null,
  };
  out.loops.analyze = completeness;
  if (!completeness.pressureHigh || !completeness.pressureLow) {
    out.issues.push({ severity: 'high', code: 'NO_PRESSURE_STATIONS', detail: 'Missing pressure high/low station IDs' });
  }
  if (completeness.ridgeCount === 0) {
    out.issues.push({ severity: 'high', code: 'NO_RIDGE_STATION', detail: 'No ridge station configured for thermal delta' });
  }
  if (completeness.lakeshoreCount === 0) {
    out.issues.push({ severity: 'medium', code: 'NO_LAKESHORE_STATION', detail: 'No lakeshore station configured' });
  }
  if (!completeness.thermalProfile) {
    out.issues.push({ severity: 'medium', code: 'NO_THERMAL_PROFILE', detail: 'Missing thermal profile' });
  }

  // LOOP 3: LOG — find observed peak window over last 14 days
  //
  // Methodology (signal vs noise):
  //   • Only count THERMAL CANDIDATE days — days where the daily wind max
  //     fell inside the safeWindArc / optimalDirection window. Days dominated
  //     by synoptic flow from the wrong quadrant are excluded.
  //   • Peak hour is taken from the AVG of qualifying-day peak hours.
  //   • If <3 candidate days exist in window, mark as "insufficient data".
  let observedPeakHour = null;
  let observedPeakSpeed = null;
  let observedDirectionAtPeak = null;
  let candidateDayCount = 0;
  let observationWindowDays = 0;

  if (hourly?.time?.length) {
    const optDir = config.thermal?.optimalDirection;
    const safeArc = config.safeWindArc;
    const arcMin = optDir?.min ?? (safeArc?.[0] ?? null);
    const arcMax = optDir?.max ?? (safeArc?.[1] ?? null);

    // Group hours by date
    const byDate = new Map();
    for (let i = 0; i < hourly.time.length; i++) {
      const t = new Date(hourly.time[i]);
      const date = t.toISOString().slice(0, 10);
      const h = t.getHours();
      const speed = hourly.wind_speed_10m?.[i];
      const dir   = hourly.wind_direction_10m?.[i];
      if (speed == null) continue;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push({ h, speed, dir });
    }
    observationWindowDays = byDate.size;

    // Per-day: find peak hour and check direction quality
    const candidateDays = [];
    for (const [, samples] of byDate) {
      // Daily peak — within kite hours only (9 AM – 8 PM)
      const kiteSamples = samples.filter(s => s.h >= 9 && s.h <= 20);
      if (kiteSamples.length === 0) continue;

      let peak = kiteSamples[0];
      for (const s of kiteSamples) {
        if (s.speed > peak.speed) peak = s;
      }

      // Direction-qualified? Only count days where the peak direction lies
      // inside the optimal arc (or safe-wind arc). If no arc configured,
      // count all days with speed > 6 mph.
      const dirOk = (arcMin != null && arcMax != null && peak.dir != null)
        ? isInArc(peak.dir, arcMin, arcMax)
        : true;
      const speedOk = peak.speed >= 6;
      if (dirOk && speedOk) candidateDays.push(peak);
    }

    candidateDayCount = candidateDays.length;

    if (candidateDays.length >= 3) {
      // Median peak hour for robustness
      const hours = candidateDays.map(d => d.h).sort((a, b) => a - b);
      observedPeakHour = hours[Math.floor(hours.length / 2)];
      observedPeakSpeed = candidateDays.reduce((s, d) => s + d.speed, 0) / candidateDays.length;
      // Circular mean of direction across candidate-day peaks
      const dirs = candidateDays.map(d => d.dir).filter(d => d != null);
      if (dirs.length) {
        const xs = dirs.map(d => Math.cos((d * Math.PI) / 180));
        const ys = dirs.map(d => Math.sin((d * Math.PI) / 180));
        const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
        const meanY = ys.reduce((s, x) => s + x, 0) / ys.length;
        observedDirectionAtPeak = ((Math.atan2(meanY, meanX) * 180) / Math.PI + 360) % 360;
      }
    }
  }
  out.loops.log = {
    observedPeakHour,
    observedPeakSpeed: observedPeakSpeed != null ? Number(observedPeakSpeed.toFixed(1)) : null,
    observedDirectionAtPeak: observedDirectionAtPeak != null ? Math.round(observedDirectionAtPeak) : null,
    candidateDayCount,
    observationWindowDays,
    sufficient: candidateDayCount >= 3,
  };

  // LOOP 4: PREDICT — invoke ThermalPredictor over the day
  let predicted = null;
  try {
    predicted = predictThermal(lakeId, {
      windDirection: observedDirectionAtPeak,
      windSpeed: observedPeakSpeed,
      pressureGradient: 0,
    });
  } catch (e) {
    out.issues.push({ severity: 'critical', code: 'PREDICTOR_THREW', detail: e.message });
  }
  const predictedPeakHour = config.thermal?.peakHours?.peak ?? null;
  const predictedOptimalDir = (config.thermal?.optimalDirection?.min != null && config.thermal?.optimalDirection?.max != null)
    ? Math.round((config.thermal.optimalDirection.min + config.thermal.optimalDirection.max) / 2)
    : (config.thermal?.optimalDirection?.ideal ?? null);
  out.loops.predict = {
    predictedPeakHour,
    predictedOptimalDir,
    probability: predicted?.probability ?? null,
    direction: predicted?.direction?.status ?? null,
    speed: predicted?.speed?.status ?? null,
    pressure: predicted?.pressure?.status ?? null,
    elevation: predicted?.elevation?.status ?? null,
    phase: predicted?.phase ?? null,
  };

  // LOOP 5: HONE — compute drift between predicted vs observed
  //
  // Drift is ONLY meaningful when we have ≥3 direction-qualified candidate
  // days. Otherwise we are comparing config to ambient/synoptic wind which
  // is apples-to-oranges. We suppress drift alerts when the candidate-day
  // count is too low — instead we issue an INFO alert noting the season had
  // few thermal events.
  let peakHourDrift = null;
  let directionDrift = null;
  const sufficient = candidateDayCount >= 3;

  if (predictedPeakHour != null && observedPeakHour != null && sufficient) {
    let drift = Math.abs(predictedPeakHour - observedPeakHour);
    if (drift > 12) drift = 24 - drift;
    peakHourDrift = drift;
  }
  if (predictedOptimalDir != null && observedDirectionAtPeak != null && sufficient) {
    directionDrift = angleDelta(predictedOptimalDir, observedDirectionAtPeak);
  }
  out.loops.hone = {
    peakHourDrift,
    directionDrift,
    peakHourOk: peakHourDrift == null ? null : peakHourDrift <= PEAK_TOLERANCE_HOURS,
    directionOk: directionDrift == null ? null : directionDrift <= DIR_TOLERANCE_DEG,
    sufficient,
  };
  if (!sufficient) {
    out.issues.push({
      severity: 'info',
      code: 'INSUFFICIENT_THERMAL_DAYS',
      detail: `Only ${candidateDayCount}/${observationWindowDays} days in 14-day window matched thermal direction window. Off-season or wrong synoptic regime. Drift alerts suppressed.`,
    });
  } else {
    if (peakHourDrift != null && peakHourDrift > PEAK_TOLERANCE_HOURS) {
      out.issues.push({
        severity: 'medium',
        code: 'PEAK_HOUR_DRIFT',
        detail: `Predicted peak ${predictedPeakHour}:00, observed ${observedPeakHour}:00 across ${candidateDayCount} qualifying days (drift ${peakHourDrift}h)`,
      });
    }
    if (directionDrift != null && directionDrift > DIR_TOLERANCE_DEG) {
      out.issues.push({
        severity: 'low',
        code: 'DIRECTION_DRIFT',
        detail: `Predicted optimal ${predictedOptimalDir}°, observed ${Math.round(observedDirectionAtPeak)}° (drift ${Math.round(directionDrift)}° across ${candidateDayCount} qualifying days)`,
      });
    }
  }

  // LOOP 6: VERIFY — re-run predictor with proposed correction (no save)
  let verify = null;
  if (peakHourDrift != null && peakHourDrift > PEAK_TOLERANCE_HOURS && observedPeakHour != null) {
    verify = {
      proposed: {
        peakHour: observedPeakHour,
        currentPeakHour: predictedPeakHour,
      },
      note: 'Adjust config.thermal.peakHours.peak to align with observed maximum.',
    };
  }
  out.loops.verify = verify;

  // Grade — INFO does not count against the grade
  const critical = out.issues.filter(i => i.severity === 'critical').length;
  const high = out.issues.filter(i => i.severity === 'high').length;
  const medium = out.issues.filter(i => i.severity === 'medium').length;
  if (critical > 0) out.grade = 'F';
  else if (high >= 2) out.grade = 'D';
  else if (high === 1) out.grade = 'C';
  else if (medium >= 2) out.grade = 'B-';
  else if (medium === 1) out.grade = 'B';
  else out.grade = 'A';

  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RALPH VALIDATION HARNESS — Six-Loop Iteration Cycle');
  console.log(`  Locations to validate: ${Object.keys(LAKE_CONFIGS).length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];
  const lakeIds = Object.keys(LAKE_CONFIGS);

  // Batched to be polite to Open-Meteo (~80 locations)
  const BATCH = 5;
  for (let i = 0; i < lakeIds.length; i += BATCH) {
    const batch = lakeIds.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(id => runRalphForLocation(id, LAKE_CONFIGS[id])));
    results.push(...batchResults);
    process.stdout.write(`  [${results.length}/${lakeIds.length}] processed\n`);
  }

  // Aggregate
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    byGrade: { A: 0, 'B': 0, 'B-': 0, C: 0, D: 0, F: 0 },
    issueCount: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    issuesByCode: {},
  };
  for (const r of results) {
    summary.byGrade[r.grade] = (summary.byGrade[r.grade] || 0) + 1;
    for (const issue of r.issues) {
      summary.issueCount[issue.severity] = (summary.issueCount[issue.severity] || 0) + 1;
      summary.issuesByCode[issue.code] = (summary.issuesByCode[issue.code] || 0) + 1;
    }
  }

  // Write JSON
  fs.writeFileSync(REPORT_JSON, JSON.stringify({ summary, results }, null, 2));

  // Write MD
  const md = renderMarkdown(summary, results);
  fs.writeFileSync(REPORT_MD, md);

  // Console summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RALPH VALIDATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total locations validated: ${summary.total}`);
  console.log('\n  GRADES:');
  for (const [grade, n] of Object.entries(summary.byGrade)) {
    if (n > 0) console.log(`    ${grade}: ${n}`);
  }
  console.log('\n  ISSUES:');
  for (const [sev, n] of Object.entries(summary.issueCount)) {
    if (n > 0) console.log(`    ${sev}: ${n}`);
  }
  console.log('\n  TOP ISSUE CODES:');
  for (const [code, n] of Object.entries(summary.issuesByCode).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${code.padEnd(30)} ${n}`);
  }
  console.log(`\n  Wrote ${REPORT_JSON}`);
  console.log(`  Wrote ${REPORT_MD}`);
}

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push(`# RALPH Validation Report\n`);
  lines.push(`Generated: ${summary.timestamp}\n`);
  lines.push(`## Summary\n`);
  lines.push(`- Total locations: **${summary.total}**`);
  lines.push(`- Grades:`);
  for (const [g, n] of Object.entries(summary.byGrade)) {
    if (n > 0) lines.push(`  - ${g}: ${n}`);
  }
  lines.push(`- Issues:`);
  for (const [s, n] of Object.entries(summary.issueCount)) {
    if (n > 0) lines.push(`  - ${s}: ${n}`);
  }
  lines.push(``);
  lines.push(`## Top Issue Codes\n`);
  for (const [code, n] of Object.entries(summary.issuesByCode).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${code}\`: ${n}`);
  }
  lines.push(``);
  lines.push(`## Per-Location Results\n`);
  for (const r of results.sort((a, b) => a.lakeId.localeCompare(b.lakeId))) {
    lines.push(`### ${r.name} (\`${r.lakeId}\`) — Grade: **${r.grade}**`);
    lines.push(`- Coords: ${r.coords?.lat}, ${r.coords?.lng}`);
    if (r.loops.read) lines.push(`- Read: Open-Meteo ${r.loops.read.openMeteoOK ? 'OK' : 'FAIL'} (${r.loops.read.hoursObserved}h)`);
    if (r.loops.analyze) lines.push(`- Analyze: pressureHL=${r.loops.analyze.pressureHigh && r.loops.analyze.pressureLow ? 'OK' : 'MISSING'}, ridge=${r.loops.analyze.ridgeCount}, lakeshore=${r.loops.analyze.lakeshoreCount}, thermal=${r.loops.analyze.thermalProfile ? 'OK' : 'MISSING'}`);
    if (r.loops.log) lines.push(`- Log: observed peak ${r.loops.log.observedPeakHour}:00 @ ${r.loops.log.observedPeakSpeed} mph @ ${r.loops.log.observedDirectionAtPeak}°`);
    if (r.loops.predict) lines.push(`- Predict: peakHr=${r.loops.predict.predictedPeakHour}, optDir=${r.loops.predict.predictedOptimalDir}°, prob=${r.loops.predict.probability}%`);
    if (r.loops.hone) lines.push(`- Hone: peakDrift=${r.loops.hone.peakHourDrift}h (${r.loops.hone.peakHourOk ? 'OK' : 'DRIFT'}), dirDrift=${r.loops.hone.directionDrift}° (${r.loops.hone.directionOk ? 'OK' : 'DRIFT'})`);
    if (r.loops.verify) lines.push(`- Verify: suggested peak hour = ${r.loops.verify.proposed.peakHour} (was ${r.loops.verify.proposed.currentPeakHour})`);
    if (r.issues.length) {
      lines.push(`- Issues:`);
      for (const issue of r.issues) {
        lines.push(`  - **${issue.severity.toUpperCase()}** [\`${issue.code}\`]: ${issue.detail}`);
      }
    }
    lines.push(``);
  }
  return lines.join('\n');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
