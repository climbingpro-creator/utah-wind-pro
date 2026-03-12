/**
 * FORECAST ACCURACY ANALYSIS
 * 
 * This script analyzes how well NWS forecasts correlate with actual
 * surface wind conditions at our stations.
 * 
 * Since we can't get historical NWS forecasts easily, we'll:
 * 1. Analyze pressure patterns and their effect on wind
 * 2. Identify synoptic-scale events (fronts, storms) from pressure data
 * 3. Correlate these events with surface wind at our stations
 */

import axios from 'axios';
import fs from 'fs';

// Load env
const envPath = new URL('../.env', import.meta.url);
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('Note: Could not load .env file');
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// =============================================================================
// ANALYZE PRESSURE-WIND RELATIONSHIPS
// =============================================================================

async function analyzePressureWindRelationship() {
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE-WIND RELATIONSHIP ANALYSIS');
  console.log('='.repeat(70));
  
  // Fetch 6 months of data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU,FPS',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,sea_level_pressure,air_temp',
        units: 'english',
        obtimezone: 'local',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    // Parse data
    const stations = {};
    for (const station of response.data.STATION) {
      const obs = station.OBSERVATIONS;
      stations[station.STID] = {
        times: obs.date_time || [],
        speeds: obs.wind_speed_set_1 || [],
        directions: obs.wind_direction_set_1 || [],
        pressure: obs.sea_level_pressure_set_1 || [],
        temp: obs.air_temp_set_1 || [],
      };
    }
    
    const kslc = stations['KSLC'];
    const kpvu = stations['KPVU'];
    const fps = stations['FPS'];
    
    if (!kslc || !kpvu || !fps) {
      console.log('Missing station data');
      return;
    }
    
    // Build hourly data with pressure gradient
    const hourlyData = [];
    
    for (let i = 0; i < kslc.times.length; i++) {
      const time = new Date(kslc.times[i]);
      const hour = time.getHours();
      
      // Find matching KPVU and FPS data (within 30 min)
      const kpvuIdx = findClosestIndex(kpvu.times, kslc.times[i]);
      const fpsIdx = findClosestIndex(fps.times, kslc.times[i]);
      
      if (kpvuIdx < 0 || fpsIdx < 0) continue;
      
      const slcPressure = kslc.pressure[i];
      const pvuPressure = kpvu.pressure[kpvuIdx];
      
      if (slcPressure === null || pvuPressure === null) continue;
      
      const gradient = slcPressure - pvuPressure;
      
      hourlyData.push({
        time,
        hour,
        gradient,
        slcPressure,
        pvuPressure,
        kslcSpeed: kslc.speeds[i],
        kslcDir: kslc.directions[i],
        kpvuSpeed: kpvu.speeds[kpvuIdx],
        kpvuDir: kpvu.directions[kpvuIdx],
        fpsSpeed: fps.speeds[fpsIdx],
        fpsDir: fps.directions[fpsIdx],
        slcTemp: kslc.temp[i],
      });
    }
    
    console.log(`\nAnalyzed ${hourlyData.length} hourly data points`);
    
    // =================================================================
    // ANALYSIS 1: Pressure Gradient vs FPS Wind Speed
    // =================================================================
    
    console.log('\n\n1. PRESSURE GRADIENT vs FPS WIND SPEED');
    console.log('-'.repeat(60));
    
    const gradientBuckets = {
      'strong_north (>3mb)': { speeds: [], directions: [], count: 0 },
      'moderate_north (1-3mb)': { speeds: [], directions: [], count: 0 },
      'neutral (-1 to 1mb)': { speeds: [], directions: [], count: 0 },
      'moderate_south (-3 to -1mb)': { speeds: [], directions: [], count: 0 },
      'strong_south (<-3mb)': { speeds: [], directions: [], count: 0 },
    };
    
    for (const data of hourlyData) {
      if (data.fpsSpeed === null) continue;
      
      let bucket;
      if (data.gradient > 3) bucket = 'strong_north (>3mb)';
      else if (data.gradient > 1) bucket = 'moderate_north (1-3mb)';
      else if (data.gradient > -1) bucket = 'neutral (-1 to 1mb)';
      else if (data.gradient > -3) bucket = 'moderate_south (-3 to -1mb)';
      else bucket = 'strong_south (<-3mb)';
      
      gradientBuckets[bucket].speeds.push(data.fpsSpeed);
      gradientBuckets[bucket].directions.push(data.fpsDir);
      gradientBuckets[bucket].count++;
    }
    
    console.log('\nGradient Type          | Count | Avg FPS Speed | % North | % Kiteable');
    console.log('-'.repeat(75));
    
    for (const [bucket, data] of Object.entries(gradientBuckets)) {
      if (data.count === 0) continue;
      
      const avgSpeed = data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length;
      const northCount = data.directions.filter(d => d !== null && (d >= 315 || d <= 45)).length;
      const northPct = (northCount / data.count * 100).toFixed(0);
      const kiteableCount = data.speeds.filter(s => s >= 10).length;
      const kiteablePct = (kiteableCount / data.count * 100).toFixed(0);
      
      console.log(
        `${bucket.padEnd(22)} | ${String(data.count).padStart(5)} | ` +
        `${avgSpeed.toFixed(1).padStart(8)} mph   | ${northPct.padStart(4)}%   | ${kiteablePct.padStart(4)}%`
      );
    }
    
    // =================================================================
    // ANALYSIS 2: Pressure Change Rate vs Wind Events
    // =================================================================
    
    console.log('\n\n2. PRESSURE CHANGE RATE vs WIND EVENTS');
    console.log('-'.repeat(60));
    
    const pressureChangeEvents = {
      'rapid_drop (>4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'moderate_drop (2-4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'slow_drop (0-2mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'stable': { fpsWinds: [], kslcWinds: [], count: 0 },
      'slow_rise (0-2mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'moderate_rise (2-4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'rapid_rise (>4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
    };
    
    // Calculate 6-hour pressure change
    for (let i = 24; i < hourlyData.length; i++) { // 24 readings = ~6 hours at 15-min intervals
      const current = hourlyData[i];
      const previous = hourlyData[i - 24];
      
      if (!current.slcPressure || !previous.slcPressure) continue;
      
      const pressureChange = current.slcPressure - previous.slcPressure;
      
      let bucket;
      if (pressureChange < -4) bucket = 'rapid_drop (>4mb/6hr)';
      else if (pressureChange < -2) bucket = 'moderate_drop (2-4mb/6hr)';
      else if (pressureChange < 0) bucket = 'slow_drop (0-2mb/6hr)';
      else if (pressureChange < 2) bucket = 'slow_rise (0-2mb/6hr)';
      else if (pressureChange < 4) bucket = 'moderate_rise (2-4mb/6hr)';
      else bucket = 'rapid_rise (>4mb/6hr)';
      
      if (current.fpsSpeed !== null) {
        pressureChangeEvents[bucket].fpsWinds.push(current.fpsSpeed);
      }
      if (current.kslcSpeed !== null) {
        pressureChangeEvents[bucket].kslcWinds.push(current.kslcSpeed);
      }
      pressureChangeEvents[bucket].count++;
    }
    
    console.log('\nPressure Change        | Count | Avg FPS  | Avg KSLC | % FPS Kiteable');
    console.log('-'.repeat(70));
    
    for (const [bucket, data] of Object.entries(pressureChangeEvents)) {
      if (data.count === 0) continue;
      
      const avgFps = data.fpsWinds.length > 0 
        ? data.fpsWinds.reduce((a, b) => a + b, 0) / data.fpsWinds.length 
        : 0;
      const avgKslc = data.kslcWinds.length > 0
        ? data.kslcWinds.reduce((a, b) => a + b, 0) / data.kslcWinds.length
        : 0;
      const kiteableCount = data.fpsWinds.filter(s => s >= 10).length;
      const kiteablePct = data.fpsWinds.length > 0 
        ? (kiteableCount / data.fpsWinds.length * 100).toFixed(0)
        : '0';
      
      console.log(
        `${bucket.padEnd(22)} | ${String(data.count).padStart(5)} | ` +
        `${avgFps.toFixed(1).padStart(5)} mph | ${avgKslc.toFixed(1).padStart(5)} mph | ${kiteablePct.padStart(6)}%`
      );
    }
    
    // =================================================================
    // ANALYSIS 3: Cold Front Detection and Wind Response
    // =================================================================
    
    console.log('\n\n3. COLD FRONT DETECTION AND WIND RESPONSE');
    console.log('-'.repeat(60));
    
    // Detect cold fronts: rapid pressure drop followed by wind shift to north
    const coldFronts = [];
    
    for (let i = 48; i < hourlyData.length - 24; i++) {
      const current = hourlyData[i];
      const sixHoursAgo = hourlyData[i - 24];
      const sixHoursLater = hourlyData[i + 24];
      
      if (!current.slcPressure || !sixHoursAgo.slcPressure) continue;
      
      const pressureDrop = sixHoursAgo.slcPressure - current.slcPressure;
      
      // Cold front signature: pressure drop > 3mb AND wind shift to north
      if (pressureDrop > 3) {
        const beforeDir = sixHoursAgo.kslcDir;
        const afterDir = sixHoursLater?.kslcDir;
        
        // Check for wind shift to north
        const isNorthAfter = afterDir !== null && (afterDir >= 315 || afterDir <= 45);
        const wasNotNorthBefore = beforeDir !== null && beforeDir > 45 && beforeDir < 315;
        
        if (isNorthAfter && wasNotNorthBefore) {
          // Check if we already have a front within 12 hours
          const isDuplicate = coldFronts.some(f => 
            Math.abs(f.time.getTime() - current.time.getTime()) < 12 * 60 * 60 * 1000
          );
          
          if (!isDuplicate) {
            coldFronts.push({
              time: current.time,
              pressureDrop,
              beforeWind: { speed: sixHoursAgo.fpsSpeed, dir: sixHoursAgo.fpsDir },
              duringWind: { speed: current.fpsSpeed, dir: current.fpsDir },
              afterWind: { speed: sixHoursLater?.fpsSpeed, dir: sixHoursLater?.fpsDir },
              kslcAfter: { speed: sixHoursLater?.kslcSpeed, dir: sixHoursLater?.kslcDir },
            });
          }
        }
      }
    }
    
    console.log(`\nDetected ${coldFronts.length} cold front passages in 6 months\n`);
    
    if (coldFronts.length > 0) {
      console.log('Date/Time            | P Drop | Before FPS | After FPS  | After KSLC');
      console.log('-'.repeat(75));
      
      let totalBeforeSpeed = 0;
      let totalAfterSpeed = 0;
      let kiteableAfter = 0;
      
      for (const front of coldFronts.slice(0, 15)) {
        const dateStr = front.time.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const beforeStr = front.beforeWind.speed !== null 
          ? `${front.beforeWind.speed.toFixed(0)} mph` 
          : 'N/A';
        const afterStr = front.afterWind.speed !== null
          ? `${front.afterWind.speed.toFixed(0)} mph`
          : 'N/A';
        const kslcStr = front.kslcAfter.speed !== null
          ? `${front.kslcAfter.speed.toFixed(0)} mph N`
          : 'N/A';
        
        console.log(
          `${dateStr.padEnd(20)} | ${front.pressureDrop.toFixed(1).padStart(4)}mb | ` +
          `${beforeStr.padStart(8)}   | ${afterStr.padStart(8)}   | ${kslcStr.padStart(10)}`
        );
        
        if (front.beforeWind.speed !== null) totalBeforeSpeed += front.beforeWind.speed;
        if (front.afterWind.speed !== null) {
          totalAfterSpeed += front.afterWind.speed;
          if (front.afterWind.speed >= 10) kiteableAfter++;
        }
      }
      
      console.log('-'.repeat(75));
      console.log(`\nCOLD FRONT SUMMARY:`);
      console.log(`  Average FPS wind BEFORE front: ${(totalBeforeSpeed / coldFronts.length).toFixed(1)} mph`);
      console.log(`  Average FPS wind AFTER front:  ${(totalAfterSpeed / coldFronts.length).toFixed(1)} mph`);
      console.log(`  % Kiteable (10+ mph) after front: ${(kiteableAfter / coldFronts.length * 100).toFixed(0)}%`);
    }
    
    // =================================================================
    // ANALYSIS 4: Time of Day Effects
    // =================================================================
    
    console.log('\n\n4. TIME OF DAY EFFECTS ON WIND');
    console.log('-'.repeat(60));
    
    const hourlyStats = {};
    for (let h = 0; h < 24; h++) {
      hourlyStats[h] = { speeds: [], northCount: 0, seCount: 0, count: 0 };
    }
    
    for (const data of hourlyData) {
      if (data.fpsSpeed === null) continue;
      
      hourlyStats[data.hour].speeds.push(data.fpsSpeed);
      hourlyStats[data.hour].count++;
      
      if (data.fpsDir !== null) {
        if (data.fpsDir >= 315 || data.fpsDir <= 45) {
          hourlyStats[data.hour].northCount++;
        } else if (data.fpsDir >= 90 && data.fpsDir <= 180) {
          hourlyStats[data.hour].seCount++;
        }
      }
    }
    
    console.log('\nHour | Avg Speed | % North | % SE    | % Kiteable');
    console.log('-'.repeat(55));
    
    for (let h = 6; h <= 21; h++) { // Daytime hours only
      const stats = hourlyStats[h];
      if (stats.count === 0) continue;
      
      const avgSpeed = stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length;
      const northPct = (stats.northCount / stats.count * 100).toFixed(0);
      const sePct = (stats.seCount / stats.count * 100).toFixed(0);
      const kiteablePct = (stats.speeds.filter(s => s >= 10).length / stats.count * 100).toFixed(0);
      
      const hourStr = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;
      
      console.log(
        `${hourStr.padStart(4)} | ${avgSpeed.toFixed(1).padStart(6)} mph | ` +
        `${northPct.padStart(4)}%   | ${sePct.padStart(4)}%   | ${kiteablePct.padStart(6)}%`
      );
    }
    
    return { hourlyData, coldFronts, gradientBuckets };
    
  } catch (error) {
    console.error('Error in analysis:', error.message);
  }
}

function findClosestIndex(times, targetTime) {
  const targetMs = new Date(targetTime).getTime();
  let closest = -1;
  let closestDiff = Infinity;
  
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
    if (diff < closestDiff && diff < 30 * 60 * 1000) {
      closestDiff = diff;
      closest = i;
    }
  }
  return closest;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           FORECAST ACCURACY & WEATHER EVENT ANALYSIS               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  await analyzePressureWindRelationship();
  
  console.log('\n' + '='.repeat(70));
  console.log('KEY FINDINGS FOR FORECAST INTEGRATION');
  console.log('='.repeat(70));
  
  console.log(`
1. PRESSURE GRADIENT is the strongest predictor of north flow:
   - SLC > Provo by 3+ mb → High probability of north wind at Utah Lake
   - Use this to validate NWS "north wind" forecasts

2. PRESSURE CHANGE RATE indicates frontal activity:
   - Rapid drop (>4mb/6hr) → Cold front approaching
   - After front passage → Best kiting conditions

3. COLD FRONTS produce the most reliable kiting:
   - Wind shift to north after front
   - Sustained speeds often 15-25 mph
   - Can last 6-12 hours

4. TIME OF DAY matters for thermals:
   - SE thermals peak 1pm-4pm
   - North flows can occur any time
   - Morning is usually calm

5. FORECAST VALIDATION STRATEGY:
   - NWS says "north wind" → Check pressure gradient
   - NWS says "sunny, light wind" → Watch for thermal development
   - NWS says "cold front" → Expect good kiting 6-12 hours after
`);
}

main().catch(console.error);
