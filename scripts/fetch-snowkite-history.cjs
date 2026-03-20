/**
 * SNOWKITE HISTORICAL DATA FETCHER
 * 
 * Fetches 2+ years of wind data from all verified Synoptic stations
 * near Strawberry Reservoir, Daniels Summit, and Skyline Drive.
 * 
 * Stations (all verified via Synoptic API):
 *   Strawberry:  UTCOP, UTDAN, DSTU1, CCPUT, RVZU1, UWCU1
 *   Skyline:     SKY, UTESU, UTMPK, UTHTP, EPMU1
 * 
 * Fetches: wind_speed, wind_direction, wind_gust, air_temp, pressure
 * Output:  scripts/data/snowkite-history.json  (structured by station & month)
 * 
 * Usage: node scripts/fetch-snowkite-history.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }
const BASE = 'https://api.synopticdata.com/v2/stations/timeseries';

const STATIONS = {
  UTCOP: 'US-40 Co-Op Creek',
  UTDAN: 'Daniels Summit',
  DSTU1: 'Daniels-Strawberry SNOTEL',
  CCPUT: 'Currant Creek Peak',
  RVZU1: 'Rays Valley RAWS',
  UWCU1: 'Provo 22E',
  SKY:   'Skyline UDOT',
  UTESU: 'Eccles Summit',
  UTMPK: 'Monument Peak',
  UTHTP: 'US-89 Hilltop',
  EPMU1: 'Ephraim NWS',
  KSLC:  'SLC Airport',
};

const SNOWKITE_MONTHS = [];
for (let year = 2024; year <= 2026; year++) {
  for (let m = 1; m <= 12; m++) {
    if (year === 2026 && m > 3) break;
    const start = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    SNOWKITE_MONTHS.push({ label: `${year}-${String(m).padStart(2, '0')}`, start, end, year, month: m });
  }
}

function fmt(dateStr) {
  return dateStr.replace(/[-:T]/g, '').slice(0, 12);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function splitDateRange(start, end, maxDays) {
  const chunks = [];
  let cur = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T23:59:59');
  while (cur < endDate) {
    const chunkEnd = new Date(Math.min(cur.getTime() + maxDays * 86400000, endDate.getTime()));
    chunks.push({
      start: cur.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });
    cur = new Date(chunkEnd.getTime() + 86400000);
  }
  return chunks;
}

function parseStationData(station) {
  const stid = station.STID;
  const obs = station.OBSERVATIONS || {};
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const gusts = obs.wind_gust_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.pressure_set_1d || obs.altimeter_set_1 || [];

  const hourly = {};

  for (let i = 0; i < times.length; i++) {
    const dt = new Date(times[i]);
    const hourKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}`;

    if (!hourly[hourKey]) {
      hourly[hourKey] = { speeds: [], dirs: [], gusts: [], temps: [], pressures: [], count: 0 };
    }
    const h = hourly[hourKey];
    if (speeds[i] != null) h.speeds.push(speeds[i]);
    if (dirs[i] != null) h.dirs.push(dirs[i]);
    if (gusts[i] != null) h.gusts.push(gusts[i]);
    if (temps[i] != null) h.temps.push(temps[i]);
    if (pressures[i] != null) h.pressures.push(pressures[i]);
    h.count++;
  }

  const result = [];
  for (const [hourKey, h] of Object.entries(hourly)) {
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const max = arr => arr.length ? Math.max(...arr) : null;

    const avgDir = h.dirs.length ? circularMean(h.dirs) : null;

    result.push({
      hour: hourKey,
      speed: avg(h.speeds) !== null ? Math.round(avg(h.speeds) * 10) / 10 : null,
      gust: max(h.gusts),
      direction: avgDir !== null ? Math.round(avgDir) : null,
      temp: avg(h.temps) !== null ? Math.round(avg(h.temps) * 10) / 10 : null,
      pressure: avg(h.pressures) !== null ? Math.round(avg(h.pressures) * 100) / 100 : null,
      samples: h.count,
    });
  }

  return { stid, hours: result.sort((a, b) => a.hour.localeCompare(b.hour)) };
}

function circularMean(angles) {
  let sinSum = 0, cosSum = 0;
  for (const a of angles) {
    sinSum += Math.sin(a * Math.PI / 180);
    cosSum += Math.cos(a * Math.PI / 180);
  }
  let mean = Math.atan2(sinSum / angles.length, cosSum / angles.length) * 180 / Math.PI;
  if (mean < 0) mean += 360;
  return mean;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SNOWKITE HISTORICAL DATA FETCHER                         ║');
  console.log('║   Stations: 12 verified | Period: Jan 2024 – Mar 2026      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const outDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stationIds = Object.keys(STATIONS).join(',');
  const allData = {};

  let totalHours = 0;
  let monthsDone = 0;

  for (const month of SNOWKITE_MONTHS) {
    process.stdout.write(`\n  ▶ ${month.label}: `);
    const chunks = splitDateRange(month.start, month.end, 5);

    for (const chunk of chunks) {
      const url = `${BASE}?` +
        `stid=${stationIds}` +
        `&start=${fmt(chunk.start + 'T000000')}` +
        `&end=${fmt(chunk.end + 'T235900')}` +
        `&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure,altimeter` +
        `&units=english&obtimezone=local&token=${TOKEN}`;

      try {
        const data = await fetchJSON(url);
        if (data.STATION) {
          for (const station of data.STATION) {
            const parsed = parseStationData(station);
            if (!allData[parsed.stid]) allData[parsed.stid] = [];
            allData[parsed.stid].push(...parsed.hours);
            totalHours += parsed.hours.length;
          }
          process.stdout.write('█');
        } else {
          process.stdout.write('░');
        }
      } catch (e) {
        process.stdout.write('✗');
      }
      await sleep(300);
    }
    monthsDone++;
    process.stdout.write(` (${monthsDone}/${SNOWKITE_MONTHS.length})`);
  }

  console.log('\n');

  const stats = {};
  for (const [stid, hours] of Object.entries(allData)) {
    const windHours = hours.filter(h => h.speed != null && h.speed > 0);
    const strongHours = windHours.filter(h => h.speed >= 10);
    const epicHours = windHours.filter(h => h.speed >= 15 && h.speed <= 30);

    stats[stid] = {
      name: STATIONS[stid] || stid,
      totalHours: hours.length,
      windHours: windHours.length,
      strongHours: strongHours.length,
      epicHours: epicHours.length,
      avgSpeed: windHours.length ? Math.round(windHours.reduce((s, h) => s + h.speed, 0) / windHours.length * 10) / 10 : 0,
      maxGust: Math.max(...hours.map(h => h.gust || 0)),
      pctWindy: windHours.length ? Math.round(strongHours.length / windHours.length * 100) : 0,
    };

    console.log(`  ${stid.padEnd(8)} ${(STATIONS[stid] || '').padEnd(28)} ${String(hours.length).padStart(6)} hrs | wind ${String(windHours.length).padStart(5)} | ≥10mph ${String(strongHours.length).padStart(5)} | avg ${String(stats[stid].avgSpeed).padStart(5)} | max gust ${String(stats[stid].maxGust).padStart(4)}`);
  }

  console.log(`\n  Total: ${totalHours.toLocaleString()} hourly observations across ${Object.keys(allData).length} stations`);

  const output = {
    metadata: {
      generated: new Date().toISOString(),
      period: { start: '2024-01-01', end: '2026-03-15' },
      stations: STATIONS,
      totalObservations: totalHours,
    },
    stats,
    data: allData,
  };

  const outPath = path.join(outDir, 'snowkite-history.json');
  fs.writeFileSync(outPath, JSON.stringify(output));
  const sizeMB = (fs.statSync(outPath).size / 1048576).toFixed(1);
  console.log(`\n  ✅ Saved to ${outPath} (${sizeMB} MB)`);

  buildPatternSummary(allData, outDir);
}

function buildPatternSummary(allData, outDir) {
  console.log('\n═══ BUILDING PATTERN SUMMARY ═══\n');

  const patterns = {};

  for (const [stid, hours] of Object.entries(allData)) {
    patterns[stid] = {
      name: STATIONS[stid] || stid,
      byMonth: {},
      byHour: {},
      byDow: {},
      directionRose: {},
      snowkiteDays: [],
    };

    for (const h of hours) {
      if (h.speed == null) continue;
      const [datePart, hourPart] = h.hour.split('T');
      const [year, mon] = datePart.split('-');
      const hr = parseInt(hourPart);
      const dow = new Date(datePart).getDay();

      if (!patterns[stid].byMonth[mon]) patterns[stid].byMonth[mon] = { speeds: [], gusts: [], dirs: [], count: 0, strong: 0 };
      const mb = patterns[stid].byMonth[mon];
      mb.speeds.push(h.speed);
      if (h.gust) mb.gusts.push(h.gust);
      if (h.direction != null) mb.dirs.push(h.direction);
      mb.count++;
      if (h.speed >= 10) mb.strong++;

      if (!patterns[stid].byHour[hr]) patterns[stid].byHour[hr] = { speeds: [], count: 0, strong: 0 };
      const hb = patterns[stid].byHour[hr];
      hb.speeds.push(h.speed);
      hb.count++;
      if (h.speed >= 10) hb.strong++;

      if (!patterns[stid].byDow[dow]) patterns[stid].byDow[dow] = { speeds: [], count: 0, strong: 0 };
      const db = patterns[stid].byDow[dow];
      db.speeds.push(h.speed);
      db.count++;
      if (h.speed >= 10) db.strong++;

      if (h.direction != null) {
        const sector = Math.round(h.direction / 22.5) % 16;
        const labels = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const dir = labels[sector];
        if (!patterns[stid].directionRose[dir]) patterns[stid].directionRose[dir] = { count: 0, totalSpeed: 0, strong: 0 };
        patterns[stid].directionRose[dir].count++;
        patterns[stid].directionRose[dir].totalSpeed += h.speed;
        if (h.speed >= 10) patterns[stid].directionRose[dir].strong++;
      }

      if (h.speed >= 12 && h.speed <= 35 && hr >= 9 && hr <= 16) {
        const dateStr = datePart;
        if (!patterns[stid].snowkiteDays.includes(dateStr)) {
          patterns[stid].snowkiteDays.push(dateStr);
        }
      }
    }

    for (const [mon, mb] of Object.entries(patterns[stid].byMonth)) {
      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
      mb.avgSpeed = avg(mb.speeds);
      mb.avgGust = avg(mb.gusts);
      mb.pctStrong = mb.count ? Math.round(mb.strong / mb.count * 100) : 0;
      mb.dominantDir = mb.dirs.length ? Math.round(circularMean(mb.dirs)) : null;
      delete mb.speeds;
      delete mb.gusts;
      delete mb.dirs;
    }

    for (const [hr, hb] of Object.entries(patterns[stid].byHour)) {
      hb.avgSpeed = hb.speeds.length ? Math.round(hb.speeds.reduce((a, b) => a + b, 0) / hb.speeds.length * 10) / 10 : 0;
      hb.pctStrong = hb.count ? Math.round(hb.strong / hb.count * 100) : 0;
      delete hb.speeds;
    }

    for (const [dow, db] of Object.entries(patterns[stid].byDow)) {
      db.avgSpeed = db.speeds.length ? Math.round(db.speeds.reduce((a, b) => a + b, 0) / db.speeds.length * 10) / 10 : 0;
      db.pctStrong = db.count ? Math.round(db.strong / db.count * 100) : 0;
      delete db.speeds;
    }

    for (const [dir, dr] of Object.entries(patterns[stid].directionRose)) {
      dr.avgSpeed = dr.count ? Math.round(dr.totalSpeed / dr.count * 10) / 10 : 0;
      delete dr.totalSpeed;
    }
  }

  const patternPath = path.join(outDir, 'snowkite-patterns.json');
  fs.writeFileSync(patternPath, JSON.stringify(patterns, null, 2));
  console.log(`  ✅ Pattern summary saved to ${patternPath}`);

  for (const [stid, p] of Object.entries(patterns)) {
    console.log(`\n  ${stid} (${p.name}):`);
    console.log(`    Snowkite-viable days: ${p.snowkiteDays.length}`);
    console.log(`    Monthly wind %≥10mph:`);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0');
      if (p.byMonth[key]) {
        const bar = '█'.repeat(Math.round(p.byMonth[key].pctStrong / 3));
        console.log(`      ${monthNames[m].padEnd(4)} ${String(p.byMonth[key].pctStrong).padStart(3)}% ${bar}  avg ${p.byMonth[key].avgSpeed} mph`);
      }
    }
    console.log(`    Top wind directions:`);
    const sortedDirs = Object.entries(p.directionRose).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    for (const [dir, dr] of sortedDirs) {
      console.log(`      ${dir.padEnd(4)} ${String(dr.count).padStart(5)} obs  avg ${dr.avgSpeed} mph  ${dr.strong} strong`);
    }
  }
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
