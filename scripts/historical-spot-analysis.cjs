/**
 * HISTORICAL SPOT ANALYSIS
 * 
 * Pulls 365 days of historical data from Synoptic (MesoWest) for EVERY
 * verified kiting, snowkiting, and paragliding spot. Calculates:
 * 
 *   1. How many "kiteable days" per year (wind > 10 mph for 1+ hour)
 *   2. How many "strong days" (> 15 mph for 1+ hour)
 *   3. Peak thermal hours and dominant direction
 *   4. Seasonal distribution (monthly breakdown)
 *   5. Direction frequency (what % thermal, what % north flow, etc.)
 *   6. Glass window reliability (% of mornings under 5 mph)
 * 
 * Uses Synoptic timeseries API with 7-day chunks (API limit).
 * 
 * Usage: node scripts/historical-spot-analysis.cjs
 * 
 * Output: src/config/historicalSpotData.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SYNOPTIC_TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!SYNOPTIC_TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

// ─── ALL VERIFIED SPOTS AND THEIR PRIMARY STATIONS ────────────
const SPOTS = [
  // KITING — Utah Lake
  { id: 'utah-lake-zigzag', name: 'Zig Zag (Utah Lake)', station: 'FPS', type: 'kiting',
    thermalDir: [135, 165], thermalLabel: 'SE Thermal' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', station: 'FPS', type: 'kiting',
    thermalDir: [130, 160], thermalLabel: 'SE Thermal' },
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', station: 'KPVU', type: 'kiting',
    thermalDir: [135, 165], thermalLabel: 'SE Thermal' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', station: 'FPS', type: 'kiting',
    thermalDir: [180, 270], thermalLabel: 'S/SW/W' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', station: 'QSF', type: 'kiting',
    thermalDir: [120, 160], thermalLabel: 'SE/E' },

  // KITING — Other spots
  { id: 'rush-lake', name: 'Rush Lake', station: 'KSLC', type: 'kiting',
    thermalDir: [170, 210], thermalLabel: 'S Frontal' },
  { id: 'deer-creek', name: 'Deer Creek', station: 'KHCR', type: 'kiting',
    thermalDir: [200, 240], thermalLabel: 'SW Canyon' },
  { id: 'willard-bay', name: 'Willard Bay', station: 'KSLC', type: 'kiting',
    thermalDir: [330, 30], thermalLabel: 'N Gap' },

  // PARAGLIDING
  { id: 'potm-south', name: 'PotM South', station: 'FPS', type: 'paragliding',
    thermalDir: [150, 200], thermalLabel: 'S/SE soarable' },
  { id: 'potm-north', name: 'PotM North', station: 'FPS', type: 'paragliding',
    thermalDir: [320, 360], thermalLabel: 'N soarable' },

  // SNOWKITING
  { id: 'skyline-drive', name: 'Skyline Drive', station: 'KPVU', type: 'snowkiting',
    thermalDir: [250, 340], thermalLabel: 'W/NW' },
  { id: 'strawberry-ladders', name: 'Strawberry Ladders', station: 'KHCR', type: 'snowkiting',
    thermalDir: [260, 340], thermalLabel: 'W/NW' },
];

// ─── THRESHOLDS ───────────────────────────────────────────────
const FOIL_MIN = 10;   // mph — foil-kiteable
const TWIN_MIN = 15;   // mph — twin-tip kiteable
const GLASS_MAX = 5;   // mph — glass/calm
const SOARABLE_MIN = 8;  // mph — paragliding soarable
const SOARABLE_MAX = 22; // mph — paragliding safe upper

// Date range: full year March 2025 → March 2026
const YEAR_START = '2025-03-01';
const YEAR_END = '2026-03-01';

// ─── API ──────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fmt(dateStr) {
  return dateStr.replace(/[-:T]/g, '').slice(0, 12);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isInDirRange(dir, min, max) {
  if (dir == null) return false;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max; // wraps around 360
}

async function fetchStationTimeseries(stationId, startDate, endDate) {
  const url = `https://api.synopticdata.com/v2/stations/timeseries?token=${SYNOPTIC_TOKEN}&stid=${stationId}&start=${fmt(startDate)}&end=${fmt(endDate)}&vars=wind_speed,wind_direction,wind_gust,air_temp&units=english&obtimezone=local`;

  try {
    const data = await fetchJSON(url);
    if (!data.STATION || data.STATION.length === 0) return [];

    const station = data.STATION[0];
    const obs = station.OBSERVATIONS || {};
    const times = obs.date_time || [];
    const speeds = obs.wind_speed_set_1 || [];
    const dirs = obs.wind_direction_set_1 || [];
    const gusts = obs.wind_gust_set_1 || [];
    const temps = obs.air_temp_set_1 || [];

    const readings = [];
    for (let i = 0; i < times.length; i++) {
      readings.push({
        time: times[i],
        speed: speeds[i] ?? null,
        direction: dirs[i] ?? null,
        gust: gusts[i] ?? null,
        temp: temps[i] ?? null,
      });
    }
    return readings;
  } catch (e) {
    console.error(`  Error fetching ${stationId} ${startDate}→${endDate}: ${e.message}`);
    return [];
  }
}

// Synoptic limits timeseries to ~7 days per call for 5-min data.
// Chunk the year into 7-day windows.
async function fetchFullYear(stationId) {
  const start = new Date(YEAR_START);
  const end = new Date(YEAR_END);
  const allReadings = [];

  let cursor = new Date(start);
  let chunk = 0;
  const totalChunks = Math.ceil((end - start) / (7 * 24 * 3600 * 1000));

  while (cursor < end) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + 7 * 24 * 3600 * 1000, end.getTime()));
    chunk++;
    process.stdout.write(`    Chunk ${chunk}/${totalChunks} (${cursor.toISOString().split('T')[0]} → ${chunkEnd.toISOString().split('T')[0]})...\r`);

    const readings = await fetchStationTimeseries(
      stationId,
      cursor.toISOString(),
      chunkEnd.toISOString()
    );
    allReadings.push(...readings);

    cursor = chunkEnd;
    await sleep(300); // rate limit
  }

  console.log(`    ${stationId}: ${allReadings.length} readings over ${chunk} chunks`);
  return allReadings;
}

// ─── ANALYSIS ─────────────────────────────────────────────────

function analyzeSpot(spot, readings) {
  if (readings.length === 0) {
    return { id: spot.id, name: spot.name, error: 'No data', totalReadings: 0 };
  }

  // Group readings by day
  const dayMap = {};
  for (const r of readings) {
    if (r.speed == null) continue;
    const date = r.time.split('T')[0];
    if (!dayMap[date]) dayMap[date] = [];
    dayMap[date].push(r);
  }

  const totalDays = Object.keys(dayMap).length;

  // Per-day analysis
  let kiteableDays = 0;      // 1+ hour above 10 mph
  let strongDays = 0;         // 1+ hour above 15 mph
  let thermalDays = 0;        // 1+ hour above 10 mph from thermal direction
  let glassMornings = 0;      // morning (5-10 AM) avg < 5 mph
  let totalGlassMornings = 0;

  const monthlyKiteable = {};
  const hourlyWindSpeeds = {};
  const directionBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
  let totalDirReadings = 0;

  for (const [date, dayReadings] of Object.entries(dayMap)) {
    const month = date.slice(0, 7);

    // Count consecutive readings above threshold
    let consecutiveKite = 0;
    let maxConsecutiveKite = 0;
    let consecutiveStrong = 0;
    let maxConsecutiveStrong = 0;
    let hasThermalHour = false;

    let thermalConsecutive = 0;

    for (const r of dayReadings) {
      const hour = parseInt(r.time.split('T')[1]?.split(':')[0] || '0');

      // Hourly wind speed accumulator
      if (!hourlyWindSpeeds[hour]) hourlyWindSpeeds[hour] = { sum: 0, count: 0 };
      hourlyWindSpeeds[hour].sum += r.speed;
      hourlyWindSpeeds[hour].count++;

      // Direction buckets
      if (r.direction != null) {
        const cardinal = getCardinal8(r.direction);
        directionBuckets[cardinal]++;
        totalDirReadings++;
      }

      // Kiteable (10+ mph)
      if (r.speed >= FOIL_MIN) {
        consecutiveKite++;
        // ~12 readings per hour at 5-min intervals
        if (consecutiveKite >= 10) maxConsecutiveKite = Math.max(maxConsecutiveKite, consecutiveKite);
      } else {
        consecutiveKite = 0;
      }

      // Strong (15+ mph)
      if (r.speed >= TWIN_MIN) {
        consecutiveStrong++;
        if (consecutiveStrong >= 10) maxConsecutiveStrong = Math.max(maxConsecutiveStrong, consecutiveStrong);
      } else {
        consecutiveStrong = 0;
      }

      // Thermal direction + speed
      if (r.speed >= FOIL_MIN && isInDirRange(r.direction, spot.thermalDir[0], spot.thermalDir[1])) {
        thermalConsecutive++;
        if (thermalConsecutive >= 10) hasThermalHour = true;
      } else {
        thermalConsecutive = 0;
      }
    }

    if (maxConsecutiveKite >= 10) {
      kiteableDays++;
      if (!monthlyKiteable[month]) monthlyKiteable[month] = 0;
      monthlyKiteable[month]++;
    }
    if (maxConsecutiveStrong >= 10) strongDays++;
    if (hasThermalHour) thermalDays++;

    // Glass morning analysis (5-10 AM)
    const morningReadings = dayReadings.filter(r => {
      const h = parseInt(r.time.split('T')[1]?.split(':')[0] || '0');
      return h >= 5 && h < 10;
    });
    if (morningReadings.length >= 5) {
      totalGlassMornings++;
      const avgMorning = morningReadings.reduce((s, r) => s + r.speed, 0) / morningReadings.length;
      if (avgMorning < GLASS_MAX) glassMornings++;
    }
  }

  // Peak hour
  const hourlyAvg = {};
  let peakHour = 12;
  let peakSpeed = 0;
  for (const [h, data] of Object.entries(hourlyWindSpeeds)) {
    const avg = data.sum / data.count;
    hourlyAvg[h] = Math.round(avg * 10) / 10;
    if (avg > peakSpeed) {
      peakSpeed = avg;
      peakHour = parseInt(h);
    }
  }

  // Direction percentages
  const dirPct = {};
  for (const [dir, count] of Object.entries(directionBuckets)) {
    dirPct[dir] = totalDirReadings > 0 ? Math.round((count / totalDirReadings) * 1000) / 10 : 0;
  }

  // Paragliding-specific: soarable hours
  let soarableReadings = 0;
  let totalWindReadings = 0;
  if (spot.type === 'paragliding') {
    for (const r of readings) {
      if (r.speed == null) continue;
      totalWindReadings++;
      if (r.speed >= SOARABLE_MIN && r.speed <= SOARABLE_MAX &&
          isInDirRange(r.direction, spot.thermalDir[0], spot.thermalDir[1])) {
        soarableReadings++;
      }
    }
  }

  return {
    id: spot.id,
    name: spot.name,
    type: spot.type,
    station: spot.station,
    thermalLabel: spot.thermalLabel,
    totalReadings: readings.length,
    totalDays,
    kiteableDays,
    strongDays,
    thermalDays,
    glassMornings,
    totalGlassMornings,
    glassPct: totalGlassMornings > 0 ? Math.round((glassMornings / totalGlassMornings) * 100) : null,
    monthlyKiteable,
    peakHour,
    peakAvgSpeed: Math.round(peakSpeed * 10) / 10,
    hourlyAvg,
    directionPct: dirPct,
    soarablePct: spot.type === 'paragliding' && totalWindReadings > 0
      ? Math.round((soarableReadings / totalWindReadings) * 1000) / 10
      : null,
  };
}

function getCardinal8(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  HISTORICAL SPOT ANALYSIS — All Verified Utah Spots     ║');
  console.log('║  Date Range: Mar 2025 → Mar 2026 (365 days)            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Deduplicate stations (many spots share the same station)
  const uniqueStations = [...new Set(SPOTS.map(s => s.station))];
  console.log(`Stations to fetch: ${uniqueStations.join(', ')} (${uniqueStations.length} unique)\n`);

  // Fetch all station data
  const stationData = {};
  for (const stationId of uniqueStations) {
    console.log(`\n  Fetching ${stationId}...`);
    stationData[stationId] = await fetchFullYear(stationId);
  }

  // Analyze each spot
  console.log('\n\n═══ ANALYSIS RESULTS ════════════════════════════════════\n');

  const results = {};

  for (const spot of SPOTS) {
    const readings = stationData[spot.station] || [];
    const analysis = analyzeSpot(spot, readings);
    results[spot.id] = analysis;

    console.log(`\n┌─ ${analysis.name} (${analysis.type}) ─────────────────`);
    console.log(`│  Station: ${analysis.station} | ${analysis.totalReadings.toLocaleString()} readings | ${analysis.totalDays} days`);
    console.log(`│`);
    console.log(`│  KITEABLE DAYS (10+ mph, 1+ hour): ${analysis.kiteableDays}`);
    console.log(`│  STRONG DAYS  (15+ mph, 1+ hour): ${analysis.strongDays}`);
    console.log(`│  THERMAL DAYS (${analysis.thermalLabel}, 10+ mph, 1+ hour): ${analysis.thermalDays}`);
    console.log(`│`);
    console.log(`│  Peak Hour: ${analysis.peakHour > 12 ? analysis.peakHour - 12 + ' PM' : analysis.peakHour + ' AM'} (avg ${analysis.peakAvgSpeed} mph)`);
    console.log(`│  Glass Mornings: ${analysis.glassMornings}/${analysis.totalGlassMornings} (${analysis.glassPct}%)`);
    if (analysis.soarablePct != null) {
      console.log(`│  Soarable Time: ${analysis.soarablePct}% of readings`);
    }
    console.log(`│`);
    console.log(`│  Direction: N=${analysis.directionPct.N}% NE=${analysis.directionPct.NE}% E=${analysis.directionPct.E}% SE=${analysis.directionPct.SE}%`);
    console.log(`│            S=${analysis.directionPct.S}% SW=${analysis.directionPct.SW}% W=${analysis.directionPct.W}% NW=${analysis.directionPct.NW}%`);
    console.log(`│`);
    console.log(`│  Monthly Kiteable Days:`);
    const months = Object.keys(analysis.monthlyKiteable).sort();
    for (const m of months) {
      const bar = '█'.repeat(Math.min(30, analysis.monthlyKiteable[m]));
      console.log(`│    ${m}: ${String(analysis.monthlyKiteable[m]).padStart(3)} ${bar}`);
    }
    console.log(`└──────────────────────────────────────────────`);
  }

  // Save results
  const outputPath = path.join(__dirname, '..', 'src', 'config', 'historicalSpotData.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\nResults saved to ${outputPath}`);

  // Summary table
  console.log('\n\n═══ SUMMARY TABLE ══════════════════════════════════════\n');
  console.log('Spot                       Type          Kiteable  Strong  Thermal  Peak');
  console.log('─────────────────────────────────────────────────────────────────────────');
  for (const spot of SPOTS) {
    const a = results[spot.id];
    const name = a.name.padEnd(26);
    const type = a.type.padEnd(13);
    const kiteable = String(a.kiteableDays).padStart(4);
    const strong = String(a.strongDays).padStart(6);
    const thermal = String(a.thermalDays).padStart(7);
    const peak = `${a.peakHour > 12 ? a.peakHour - 12 + 'PM' : a.peakHour + 'AM'}`.padStart(5);
    console.log(`${name} ${type} ${kiteable}d   ${strong}d   ${thermal}d   ${peak}`);
  }
}

main().catch(console.error);
