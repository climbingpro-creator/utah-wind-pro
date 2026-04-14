#!/usr/bin/env node
/**
 * Tempest 365-Day Historical Backfill
 *
 * Fetches a full year of 1-minute wind observations from the Barbed Wire Beach
 * Tempest station (device 287462) at Deer Creek Reservoir and produces a
 * thermal-analysis summary comparable to what Synoptic data gives us for
 * other stations.
 *
 * Usage:
 *   node scripts/tempest-backfill-365.js [--dry-run] [--days=365]
 *     [--redis-url=...] [--redis-token=...]
 *
 * The Tempest API allows 5-day windows per request, so a 365-day fetch
 * requires ~73 sequential calls.  Expected runtime: 3-5 minutes.
 */

const TEMPEST_TOKEN = '146e4f2c-adec-4244-b711-1aeca8f46a48';
const DEVICE_ID = 287462;
const STATION_ID = 'TEMPEST_DC';

// ── obs_st field indices (from Tempest docs) ──
const F = {
  TIMESTAMP: 0, WIND_LULL: 1, WIND_AVG: 2, WIND_GUST: 3,
  WIND_DIR: 4, WIND_INTERVAL: 5, PRESSURE: 6, TEMPERATURE: 7,
  HUMIDITY: 8, LUX: 9, UV: 10, SOLAR_RAD: 11,
  RAIN: 12, PRECIP_TYPE: 13, LIGHTNING_DIST: 14,
  LIGHTNING_COUNT: 15, BATTERY: 16, REPORT_INTERVAL: 17,
};

function parseArgs() {
  const args = { days: 365, dryRun: false, redisUrl: null, redisToken: null };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--days=')) args.days = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--redis-url=')) args.redisUrl = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--redis-token=')) args.redisToken = arg.split('=').slice(1).join('=');
  }
  return args;
}

async function redisCmd(url, token, ...cmdArgs) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmdArgs),
  });
  const data = await resp.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

async function fetchDayRange(dayOffset, count) {
  const allObs = [];
  for (let d = dayOffset; d < dayOffset + count; d++) {
    const resp = await fetch(
      `https://swd.weatherflow.com/swd/rest/observations/device/${DEVICE_ID}?token=${TEMPEST_TOKEN}&day_offset=${d}`
    );
    if (!resp.ok) {
      console.warn(`  Day offset ${d}: HTTP ${resp.status}`);
      continue;
    }
    const data = await resp.json();
    if (data.obs) allObs.push(...data.obs);
  }
  return allObs;
}

function msToMph(ms) { return ms * 2.23694; }
function cToF(c) { return c * 9 / 5 + 32; }

function analyzeObservations(allObs) {
  const hourlyBuckets = {};  // key: "MM-HH" → { speeds, dirs, temps, gusts }
  const dailyBuckets = {};   // key: "YYYY-MM-DD" → { maxSpeed, peakDir, thermalHours, ... }
  let totalReadings = 0;
  let eventCounts = { thermal_cycle: 0, glass: 0, north_flow: 0, frontal_passage: 0, clearing_wind: 0 };

  for (const obs of allObs) {
    const ts = obs[F.TIMESTAMP];
    const windAvgMs = obs[F.WIND_AVG];
    const windGustMs = obs[F.WIND_GUST];
    const windDir = obs[F.WIND_DIR];
    const tempC = obs[F.TEMPERATURE];

    if (windAvgMs == null || windDir == null) continue;
    totalReadings++;

    const date = new Date(ts * 1000);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const dayKey = date.toISOString().split('T')[0];
    const bucketKey = `${month}-${hour}`;

    if (!hourlyBuckets[bucketKey]) hourlyBuckets[bucketKey] = { speeds: [], dirs: [], temps: [], gusts: [], n: 0 };
    const hb = hourlyBuckets[bucketKey];
    hb.speeds.push(msToMph(windAvgMs));
    if (windGustMs != null) hb.gusts.push(msToMph(windGustMs));
    hb.dirs.push(windDir);
    if (tempC != null) hb.temps.push(cToF(tempC));
    hb.n++;

    if (!dailyBuckets[dayKey]) dailyBuckets[dayKey] = { maxSpeed: 0, observations: [], thermalMinutes: 0 };
    const db = dailyBuckets[dayKey];
    const speedMph = msToMph(windAvgMs);
    if (speedMph > db.maxSpeed) db.maxSpeed = speedMph;
    db.observations.push({ speed: speedMph, dir: windDir, hour: date.getUTCHours() });

    // Thermal detection: S wind (170-210°) with 4+ mph during 10am-6pm local (16-00 UTC for MDT)
    const localHour = (date.getUTCHours() - 6 + 24) % 24;
    const isSouthDir = windDir >= 160 && windDir <= 220;
    const isThermalHour = localHour >= 10 && localHour <= 18;
    if (isSouthDir && speedMph >= 4 && isThermalHour) {
      db.thermalMinutes++;
      eventCounts.thermal_cycle++;
    }

    // Glass detection: < 3 mph
    if (speedMph < 3) eventCounts.glass++;

    // North flow: 315-45° with 8+ mph
    const isNorthDir = windDir >= 315 || windDir <= 45;
    if (isNorthDir && speedMph >= 8) eventCounts.north_flow++;

    // Frontal: sudden shifts with 15+ mph gusts
    if (windGustMs != null && msToMph(windGustMs) >= 15) eventCounts.frontal_passage++;
  }

  // Compute climatology summary
  const climatology = {};
  for (const [key, hb] of Object.entries(hourlyBuckets)) {
    const speeds = hb.speeds.sort((a, b) => a - b);
    climatology[key] = {
      n: hb.n,
      speedMean: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      speedP25: speeds[Math.floor(speeds.length * 0.25)] || 0,
      speedP50: speeds[Math.floor(speeds.length * 0.50)] || 0,
      speedP75: speeds[Math.floor(speeds.length * 0.75)] || 0,
      speedP90: speeds[Math.floor(speeds.length * 0.90)] || 0,
      speedP95: speeds[Math.floor(speeds.length * 0.95)] || 0,
      dirMode: findMode(hb.dirs),
      tempMean: hb.temps.length > 0 ? hb.temps.reduce((a, b) => a + b, 0) / hb.temps.length : null,
    };
  }

  // Count "good thermal days" (30+ min of thermal wind)
  let goodDays = 0;
  let totalDays = Object.keys(dailyBuckets).length;
  for (const db of Object.values(dailyBuckets)) {
    if (db.thermalMinutes >= 30) goodDays++;
  }

  return { totalReadings, totalDays, goodDays, goodDayRate: totalDays > 0 ? (goodDays / totalDays * 100).toFixed(1) : 0, climatology, eventCounts };
}

function findMode(arr) {
  const buckets = {};
  for (const v of arr) {
    const b = Math.round(v / 10) * 10;
    buckets[b] = (buckets[b] || 0) + 1;
  }
  let mode = 0, max = 0;
  for (const [b, c] of Object.entries(buckets)) {
    if (c > max) { max = c; mode = parseInt(b); }
  }
  return mode;
}

async function main() {
  const args = parseArgs();
  
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Tempest 365-Day Backfill — Barbed Wire Beach          ║
║   Deer Creek Reservoir                                   ║
╚══════════════════════════════════════════════════════════╝

  Device ID:     ${DEVICE_ID}
  Station:       ${STATION_ID}
  Days to fetch: ${args.days}
  Dry run:       ${args.dryRun}
`);

  const startTime = Date.now();

  // Fetch in batches of 5 days (API limit)
  const allObs = [];
  const batchSize = 5;
  const totalBatches = Math.ceil(args.days / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    const dayOffset = batch * batchSize;
    const count = Math.min(batchSize, args.days - dayOffset);
    process.stdout.write(`  Fetching days ${dayOffset}-${dayOffset + count - 1} (batch ${batch + 1}/${totalBatches})...`);
    
    const batchObs = await fetchDayRange(dayOffset, count);
    allObs.push(...batchObs);
    console.log(` ${batchObs.length} observations`);

    // Small delay to be polite to the API
    if (batch < totalBatches - 1) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n  Total observations fetched: ${allObs.toLocaleString()}`);
  
  if (allObs.length === 0) {
    console.error('  ERROR: No observations retrieved. Station may not have history.');
    process.exit(1);
  }

  // Sort by timestamp
  allObs.sort((a, b) => a[F.TIMESTAMP] - b[F.TIMESTAMP]);
  const firstDate = new Date(allObs[0][F.TIMESTAMP] * 1000).toISOString().split('T')[0];
  const lastDate = new Date(allObs[allObs.length - 1][F.TIMESTAMP] * 1000).toISOString().split('T')[0];
  console.log(`  Date range: ${firstDate} to ${lastDate}`);

  // Analyze
  console.log('\n  Analyzing wind patterns...');
  const analysis = analyzeObservations(allObs);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
  ═════════════════════════════════════════════
  ANALYSIS COMPLETE in ${elapsed}s

  Total observations: ${analysis.totalReadings.toLocaleString()}
  Total days:         ${analysis.totalDays}
  Good thermal days:  ${analysis.goodDays} (${analysis.goodDayRate}%)

  Event breakdown:
    thermal_cycle      ${analysis.eventCounts.thermal_cycle.toLocaleString()}
    glass              ${analysis.eventCounts.glass.toLocaleString()}
    north_flow         ${analysis.eventCounts.north_flow.toLocaleString()}
    frontal_passage    ${analysis.eventCounts.frontal_passage.toLocaleString()}
  
  Climatology buckets: ${Object.keys(analysis.climatology).length}
`);

  // Save to Redis if not dry run
  if (!args.dryRun) {
    const redisUrl = (args.redisUrl || process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const redisToken = (args.redisToken || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    
    if (!redisUrl || !redisToken) {
      console.log('  Skipping Redis save: no Redis credentials provided');
      console.log('  Use --redis-url=... --redis-token=... to save');
    } else {
      const cmd = (...a) => redisCmd(redisUrl, redisToken, ...a);
      
      const payload = {
        stationId: STATION_ID,
        deviceId: DEVICE_ID,
        name: 'Barbed Wire Beach',
        location: 'Deer Creek Reservoir - North Shore',
        lat: 40.4588, lon: -111.4727, elevation: 5420,
        dateRange: { first: firstDate, last: lastDate },
        totalObservations: analysis.totalReadings,
        totalDays: analysis.totalDays,
        goodDays: analysis.goodDays,
        goodDayRate: parseFloat(analysis.goodDayRate),
        eventCounts: analysis.eventCounts,
        climatology: analysis.climatology,
        builtAt: new Date().toISOString(),
      };

      await cmd('SET', 'tempest:dc:history', JSON.stringify(payload), 'EX', '2592000'); // 30 day TTL
      console.log('  Saved to Redis key: tempest:dc:history ✓');
      console.log(`  Payload size: ${(JSON.stringify(payload).length / 1024).toFixed(1)} KB`);
    }
  } else {
    console.log('  [Dry run — not saving to Redis]');
  }

  console.log('\n  Done. The learning engine will use this data on next cycle.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
