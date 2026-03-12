/**
 * PROVO AIRPORT & POINT OF MOUNTAIN ANALYSIS
 * 
 * Goal: Find correlation between:
 * - KPVU (Provo Airport) → Lincoln Beach / Sandy Beach wind
 * - UTALP (Point of Mountain) → Utah Lake north flow
 * 
 * These southern stations may be better indicators for the
 * southern Utah Lake launches than KSLC.
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'e76aae18d1cf4e9a959d1a8cd15651c7';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthWind(dir) {
  if (dir == null) return false;
  return dir >= 315 || dir <= 45;
}

function isSEWind(dir) {
  if (dir == null) return false;
  return dir >= 100 && dir <= 180;
}

async function analyze() {
  console.log('PROVO AIRPORT & POINT OF MOUNTAIN ANALYSIS');
  console.log('Indicators for Lincoln Beach & Sandy Beach');
  console.log('='.repeat(70));
  
  // Fetch data for all relevant stations
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  const stations = ['KPVU', 'UTALP', 'FPS', 'KSLC'];
  let allData = {};
  
  console.log('\nFetching data...\n');
  
  for (const stid of stations) {
    allData[stid] = [];
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        allData[stid] = allData[stid].concat(obs);
      } catch (e) {}
    }
    console.log(`${stid}: ${allData[stid].length} observations`);
  }
  
  // Create hourly maps
  const createHourlyMap = (data) => {
    const map = new Map();
    data.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      map.set(key, o);
    });
    return map;
  };
  
  const kpvuHourly = createHourlyMap(allData['KPVU']);
  const utalpHourly = createHourlyMap(allData['UTALP']);
  const fpsHourly = createHourlyMap(allData['FPS']);
  const kslcHourly = createHourlyMap(allData['KSLC']);
  
  // =====================================================
  // ANALYSIS 1: KPVU as indicator for FPS (southern launches)
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('KPVU (PROVO AIRPORT) → FPS CORRELATION');
  console.log('For Lincoln Beach & Sandy Beach');
  console.log('='.repeat(70));
  
  // When KPVU shows north wind, what happens at FPS?
  const kpvuNorthBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // Same hour correlation
  kpvuHourly.forEach((kpvuObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(kpvuObs.time);
    if (hour < 9 || hour > 18) return;
    
    // Only when KPVU shows north wind
    if (!isNorthWind(kpvuObs.direction)) return;
    
    const kpvuSpeed = kpvuObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kpvuSpeed < 5) bucket = '0-5';
    else if (kpvuSpeed < 8) bucket = '5-8';
    else if (kpvuSpeed < 10) bucket = '8-10';
    else if (kpvuSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    kpvuNorthBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) kpvuNorthBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen KPVU shows NORTH wind (same hour at FPS):');
  console.log('\nKPVU Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(kpvuNorthBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // 1-hour lead correlation for KPVU
  const kpvuLeadBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  kpvuHourly.forEach((kpvuObs, key) => {
    const hour = getHour(kpvuObs.time);
    if (hour < 8 || hour > 16) return;
    
    if (!isNorthWind(kpvuObs.direction)) return;
    
    // Get FPS 1 hour later
    const laterTime = new Date(kpvuObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const kpvuSpeed = kpvuObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kpvuSpeed < 5) bucket = '0-5';
    else if (kpvuSpeed < 8) bucket = '5-8';
    else if (kpvuSpeed < 10) bucket = '8-10';
    else if (kpvuSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    kpvuLeadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) kpvuLeadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen KPVU shows NORTH wind (FPS 1 hour LATER):');
  console.log('\nKPVU Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(kpvuLeadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // =====================================================
  // ANALYSIS 2: UTALP (Point of Mountain) as indicator
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('UTALP (POINT OF MOUNTAIN) → FPS CORRELATION');
  console.log('='.repeat(70));
  
  const utalpNorthBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // Same hour
  utalpHourly.forEach((utalpObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(utalpObs.time);
    if (hour < 9 || hour > 18) return;
    
    if (!isNorthWind(utalpObs.direction)) return;
    
    const utalpSpeed = utalpObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (utalpSpeed < 5) bucket = '0-5';
    else if (utalpSpeed < 8) bucket = '5-8';
    else if (utalpSpeed < 10) bucket = '8-10';
    else if (utalpSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    utalpNorthBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) utalpNorthBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen UTALP shows NORTH wind (same hour at FPS):');
  console.log('\nUTALP Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(utalpNorthBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(11)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // 1-hour lead for UTALP
  const utalpLeadBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  utalpHourly.forEach((utalpObs, key) => {
    const hour = getHour(utalpObs.time);
    if (hour < 8 || hour > 16) return;
    
    if (!isNorthWind(utalpObs.direction)) return;
    
    const laterTime = new Date(utalpObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const utalpSpeed = utalpObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (utalpSpeed < 5) bucket = '0-5';
    else if (utalpSpeed < 8) bucket = '5-8';
    else if (utalpSpeed < 10) bucket = '8-10';
    else if (utalpSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    utalpLeadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) utalpLeadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen UTALP shows NORTH wind (FPS 1 hour LATER):');
  console.log('\nUTALP Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(utalpLeadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(11)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // =====================================================
  // COMPARISON: KSLC vs KPVU vs UTALP
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON: KSLC vs KPVU vs UTALP (8-10 mph North)');
  console.log('='.repeat(70));
  
  // Get KSLC data for comparison
  const kslcLeadBuckets = { '8-10': { fpsSpeeds: [] } };
  
  kslcHourly.forEach((kslcObs, key) => {
    const hour = getHour(kslcObs.time);
    if (hour < 8 || hour > 16) return;
    if (!isNorthWind(kslcObs.direction)) return;
    if (kslcObs.speed < 8 || kslcObs.speed >= 10) return;
    
    const laterTime = new Date(kslcObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    kslcLeadBuckets['8-10'].fpsSpeeds.push(fpsObs.speed);
  });
  
  console.log('\nAt 8-10 mph North wind, FPS speed 1 hour later:');
  console.log('\nStation | Samples | FPS Avg | Kiteable (10+) | Twin Tip (15+)');
  console.log('-'.repeat(70));
  
  const compareStations = [
    { name: 'KSLC', data: kslcLeadBuckets['8-10'] },
    { name: 'KPVU', data: kpvuLeadBuckets['8-10'] },
    { name: 'UTALP', data: utalpLeadBuckets['8-10'] },
  ];
  
  compareStations.forEach(({ name, data }) => {
    if (!data || data.fpsSpeeds.length === 0) {
      console.log(`${name.padEnd(7)} | No data`);
      return;
    }
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const foilPct = (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0);
    const twinPct = (data.fpsSpeeds.filter(s => s >= 15).length / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${name.padEnd(7)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${foilPct.padStart(13)}% | ${twinPct.padStart(13)}%`
    );
  });
  
  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  const kpvu810 = kpvuLeadBuckets['8-10'];
  const utalp810 = utalpLeadBuckets['8-10'];
  const kslc810 = kslcLeadBuckets['8-10'];
  
  console.log(`
PROVO AIRPORT (KPVU) - For Lincoln Beach & Sandy Beach:
  - At 8-10 mph North: FPS avg ${kpvu810.fpsSpeeds.length > 0 ? (kpvu810.fpsSpeeds.reduce((a,b)=>a+b,0)/kpvu810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${kpvu810.fpsSpeeds.length > 0 ? (kpvu810.fpsSpeeds.filter(s=>s>=10).length/kpvu810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
  - KPVU is closer to southern launches - may be better indicator

POINT OF MOUNTAIN (UTALP) - North flow indicator:
  - At 8-10 mph North: FPS avg ${utalp810.fpsSpeeds.length > 0 ? (utalp810.fpsSpeeds.reduce((a,b)=>a+b,0)/utalp810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${utalp810.fpsSpeeds.length > 0 ? (utalp810.fpsSpeeds.filter(s=>s>=10).length/utalp810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
  - Shows wind funneling through the gap

SALT LAKE CITY (KSLC) - Baseline comparison:
  - At 8-10 mph North: FPS avg ${kslc810.fpsSpeeds.length > 0 ? (kslc810.fpsSpeeds.reduce((a,b)=>a+b,0)/kslc810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${kslc810.fpsSpeeds.length > 0 ? (kslc810.fpsSpeeds.filter(s=>s>=10).length/kslc810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
`);

  // Save results
  const results = {
    kpvu: {
      station: 'KPVU',
      name: 'Provo Airport',
      coordinates: { lat: 40.2192, lng: -111.7236 },
      elevation: 4495,
      correlation: Object.fromEntries(
        Object.entries(kpvuLeadBuckets).map(([range, data]) => [
          range,
          {
            samples: data.fpsSpeeds.length,
            avgFps: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.reduce((a,b)=>a+b,0)/data.fpsSpeeds.length).toFixed(1) : null,
            foilKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=10).length/data.fpsSpeeds.length*100).toFixed(0) : null,
            twinTipKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=15).length/data.fpsSpeeds.length*100).toFixed(0) : null,
          }
        ])
      ),
    },
    utalp: {
      station: 'UTALP',
      name: 'Point of Mountain',
      coordinates: { lat: 40.4456, lng: -111.8983 },
      elevation: 4796,
      correlation: Object.fromEntries(
        Object.entries(utalpLeadBuckets).map(([range, data]) => [
          range,
          {
            samples: data.fpsSpeeds.length,
            avgFps: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.reduce((a,b)=>a+b,0)/data.fpsSpeeds.length).toFixed(1) : null,
            foilKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=10).length/data.fpsSpeeds.length*100).toFixed(0) : null,
            twinTipKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=15).length/data.fpsSpeeds.length*100).toFixed(0) : null,
          }
        ])
      ),
    },
  };
  
  fs.writeFileSync('./src/data/provo-utalp-correlation.json', JSON.stringify(results, null, 2));
  console.log('Saved to src/data/provo-utalp-correlation.json');
}

analyze().catch(console.error);
