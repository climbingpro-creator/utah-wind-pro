/**
 * VALIDATE KSLC → ZIG ZAG CORRELATION
 * 
 * Question: When KSLC shows 5+ mph north wind, what is the actual
 * wind speed at Zig Zag/FPS during the kite window?
 * 
 * This validates whether the 5 mph threshold at KSLC is meaningful
 * for predicting kiteable conditions at Utah Lake.
 */

import fs from 'fs';
import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

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

async function analyze() {
  console.log('KSLC → ZIG ZAG/FPS WIND SPEED VALIDATION');
  console.log('='.repeat(70));
  console.log('\nQuestion: When KSLC shows north wind at various speeds,');
  console.log('what is the actual wind speed at FPS/Zig Zag?\n');
  
  // Fetch 6 months of data
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  let kslcData = [];
  let fpsData = [];
  
  console.log('Fetching data...\n');
  
  for (const period of periods) {
    const [kslc, fps] = await Promise.all([
      fetchData('KSLC', period.start, period.end),
      fetchData('FPS', period.start, period.end),
    ]);
    
    kslcData = kslcData.concat(parseObservations(kslc.STATION?.[0]));
    fpsData = fpsData.concat(parseObservations(fps.STATION?.[0]));
  }
  
  console.log(`KSLC: ${kslcData.length} observations`);
  console.log(`FPS: ${fpsData.length} observations`);
  
  // Create hourly maps
  const kslcHourly = new Map();
  kslcData.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    kslcHourly.set(key, o);
  });
  
  const fpsHourly = new Map();
  fpsData.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    fpsHourly.set(key, o);
  });
  
  // Analyze correlation at different KSLC speed thresholds
  console.log('\n' + '='.repeat(70));
  console.log('KSLC NORTH WIND → FPS WIND SPEED (Same Hour)');
  console.log('='.repeat(70));
  
  const speedBuckets = {
    '0-3': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '3-5': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // For each hour where KSLC shows north wind, check FPS
  kslcHourly.forEach((kslcObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(kslcObs.time);
    // Only look at kite window hours (9 AM - 6 PM)
    if (hour < 9 || hour > 18) return;
    
    // Only when KSLC shows north wind
    if (!isNorthWind(kslcObs.direction)) return;
    
    const kslcSpeed = kslcObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kslcSpeed < 3) bucket = '0-3';
    else if (kslcSpeed < 5) bucket = '3-5';
    else if (kslcSpeed < 8) bucket = '5-8';
    else if (kslcSpeed < 10) bucket = '8-10';
    else if (kslcSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    speedBuckets[bucket].kslcSpeeds.push(kslcSpeed);
    speedBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) {
      speedBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
    }
  });
  
  console.log('\nWhen KSLC shows NORTH wind at various speeds (9AM-6PM):');
  console.log('\nKSLC Speed | Samples | FPS Avg | FPS Range | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(80));
  
  Object.entries(speedBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const minFps = Math.min(...data.fpsSpeeds);
    const maxFps = Math.max(...data.fpsSpeeds);
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${minFps.toFixed(0)}-${maxFps.toFixed(0).padStart(4)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // Now look at 1-hour lead time
  console.log('\n' + '='.repeat(70));
  console.log('KSLC NORTH WIND → FPS WIND SPEED (1 Hour Later)');
  console.log('='.repeat(70));
  
  const leadBuckets = {
    '0-3': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '3-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  kslcHourly.forEach((kslcObs, key) => {
    const hour = getHour(kslcObs.time);
    // Look at morning KSLC readings (8 AM - 4 PM)
    if (hour < 8 || hour > 16) return;
    
    // Only when KSLC shows north wind
    if (!isNorthWind(kslcObs.direction)) return;
    
    // Get FPS 1 hour later
    const laterTime = new Date(kslcObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const kslcSpeed = kslcObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kslcSpeed < 3) bucket = '0-3';
    else if (kslcSpeed < 5) bucket = '3-5';
    else if (kslcSpeed < 8) bucket = '5-8';
    else if (kslcSpeed < 10) bucket = '8-10';
    else if (kslcSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    leadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) {
      leadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
    }
  });
  
  console.log('\nWhen KSLC shows NORTH wind, FPS speed 1 HOUR LATER:');
  console.log('\nKSLC Speed | Samples | FPS Avg | FPS Range | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(80));
  
  Object.entries(leadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const minFps = Math.min(...data.fpsSpeeds);
    const maxFps = Math.max(...data.fpsSpeeds);
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${minFps.toFixed(0)}-${maxFps.toFixed(0).padStart(4)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // Distribution of FPS speeds when KSLC is 5-8 mph north
  console.log('\n' + '='.repeat(70));
  console.log('DETAILED: When KSLC = 5-8 mph North, FPS Speed Distribution');
  console.log('='.repeat(70));
  
  const fpsSpeedsAt5to8 = leadBuckets['5-8'].fpsSpeeds;
  if (fpsSpeedsAt5to8.length > 0) {
    const distribution = {
      '0-5': 0,
      '5-8': 0,
      '8-10': 0,
      '10-12': 0,
      '12-15': 0,
      '15-20': 0,
      '20+': 0,
    };
    
    fpsSpeedsAt5to8.forEach(speed => {
      if (speed < 5) distribution['0-5']++;
      else if (speed < 8) distribution['5-8']++;
      else if (speed < 10) distribution['8-10']++;
      else if (speed < 12) distribution['10-12']++;
      else if (speed < 15) distribution['12-15']++;
      else if (speed < 20) distribution['15-20']++;
      else distribution['20+']++;
    });
    
    console.log('\nFPS Speed (1hr after KSLC 5-8 mph North):');
    Object.entries(distribution).forEach(([range, count]) => {
      const pct = (count / fpsSpeedsAt5to8.length * 100).toFixed(0);
      const bar = '█'.repeat(Math.round(pct / 3));
      console.log(`  ${range.padEnd(8)} ${String(count).padStart(4)} (${pct.padStart(2)}%) ${bar}`);
    });
    
    // Foil vs Twin Tip
    const foilKiteable = fpsSpeedsAt5to8.filter(s => s >= 10).length;
    const twinTipKiteable = fpsSpeedsAt5to8.filter(s => s >= 15).length;
    
    console.log(`\n  Foil kiteable (10+ mph): ${(foilKiteable / fpsSpeedsAt5to8.length * 100).toFixed(0)}%`);
    console.log(`  Twin tip kiteable (15+ mph): ${(twinTipKiteable / fpsSpeedsAt5to8.length * 100).toFixed(0)}%`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  
  // Calculate recommended threshold
  let recommendedThreshold = 5;
  let bestKiteablePct = 0;
  
  Object.entries(leadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length < 10) return;
    const kiteablePct = data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100;
    
    if (range === '5-8' || range === '8-10' || range === '10-15') {
      if (kiteablePct > bestKiteablePct) {
        bestKiteablePct = kiteablePct;
        recommendedThreshold = range === '5-8' ? 5 : range === '8-10' ? 8 : 10;
      }
    }
  });
  
  const bucket5to8 = leadBuckets['5-8'];
  const bucket8to10 = leadBuckets['8-10'];
  
  console.log(`
FINDINGS:

When KSLC shows NORTH wind at 5-8 mph:
  - FPS average speed 1hr later: ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.reduce((a,b) => a+b, 0) / bucket5to8.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable (10+ mph): ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.filter(s => s >= 10).length / bucket5to8.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%
  - Twin tip kiteable (15+ mph): ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.filter(s => s >= 15).length / bucket5to8.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%

When KSLC shows NORTH wind at 8-10 mph:
  - FPS average speed 1hr later: ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.reduce((a,b) => a+b, 0) / bucket8to10.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable (10+ mph): ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.filter(s => s >= 10).length / bucket8to10.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%
  - Twin tip kiteable (15+ mph): ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.filter(s => s >= 15).length / bucket8to10.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%

RECOMMENDATION:
Based on this data, the threshold should be adjusted to ensure
meaningful kiteable conditions at Zig Zag/Utah Lake.
`);

  // Save validation results
  const validation = {
    analysis: 'KSLC to Zig Zag/FPS Wind Speed Validation',
    sameHour: Object.fromEntries(
      Object.entries(speedBuckets).map(([range, data]) => [
        range,
        {
          samples: data.fpsSpeeds.length,
          avgFpsSpeed: data.fpsSpeeds.length > 0 
            ? (data.fpsSpeeds.reduce((a,b) => a+b, 0) / data.fpsSpeeds.length).toFixed(1)
            : null,
          kiteablePct: data.fpsSpeeds.length > 0
            ? (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0)
            : null,
        }
      ])
    ),
    oneHourLead: Object.fromEntries(
      Object.entries(leadBuckets).map(([range, data]) => [
        range,
        {
          samples: data.fpsSpeeds.length,
          avgFpsSpeed: data.fpsSpeeds.length > 0 
            ? (data.fpsSpeeds.reduce((a,b) => a+b, 0) / data.fpsSpeeds.length).toFixed(1)
            : null,
          kiteablePct: data.fpsSpeeds.length > 0
            ? (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0)
            : null,
        }
      ])
    ),
  };
  
  fs.writeFileSync('./src/data/kslc-fps-validation.json', JSON.stringify(validation, null, 2));
  console.log('Saved to src/data/kslc-fps-validation.json');
}

analyze().catch(console.error);
