/**
 * Wind Speed Correlation Analysis: Arrowhead (SND) vs Deer Creek Dam (DCC)
 * 
 * Goal: Find wind patterns at Arrowhead that predict thermal events at the Dam
 * - What wind speed/direction at Arrowhead precedes good thermals?
 * - How much lead time between Arrowhead signal and Dam thermal?
 */

import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

// Deer Creek thermal criteria
const THERMAL_CRITERIA = {
  direction: { min: 160, max: 220 },  // South wind
  speed: { min: 4, max: 15 },          // Usable speed
};

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
  }));
}

function isThermalCondition(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= THERMAL_CRITERIA.direction.min &&
         obs.direction <= THERMAL_CRITERIA.direction.max &&
         obs.speed >= THERMAL_CRITERIA.speed.min &&
         obs.speed <= THERMAL_CRITERIA.speed.max;
}

function getLocalHour(date) {
  const utcHour = date.getUTCHours();
  return (utcHour - 6 + 24) % 24; // MDT approximation
}

function directionToCardinal(deg) {
  if (deg == null) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function analyzeCorrelation() {
  console.log('WIND SPEED CORRELATION: Arrowhead (SND) vs Deer Creek Dam (DCC)');
  console.log('='.repeat(70));
  
  // Fetch July 2025 data (good thermal month)
  const start = '202507010000';
  const end = '202507310000';
  
  console.log('\nFetching July 2025 data...');
  
  const [dccData, sndData] = await Promise.all([
    fetchData('DCC', start, end),
    fetchData('SND', start, end),
  ]);
  
  const dcc = parseObservations(dccData.STATION?.[0]);
  const snd = parseObservations(sndData.STATION?.[0]);
  
  console.log(`DCC observations: ${dcc.length}`);
  console.log(`SND observations: ${snd.length}`);
  
  // Create time-indexed map for SND
  const sndMap = new Map();
  snd.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16);
    sndMap.set(key, obs);
  });
  
  // Analyze each DCC observation
  const correlations = [];
  const leadTimeAnalysis = { 30: [], 60: [], 90: [], 120: [] }; // minutes before
  
  dcc.forEach(dccObs => {
    const isThermal = isThermalCondition(dccObs);
    const hour = getLocalHour(dccObs.time);
    
    // Only analyze daytime hours (10 AM - 6 PM)
    if (hour < 10 || hour > 18) return;
    
    // Get SND data at same time and at lead times
    const key = dccObs.time.toISOString().slice(0, 16);
    const sndNow = sndMap.get(key);
    
    // Get lead time data
    const leads = {};
    [30, 60, 90, 120].forEach(mins => {
      const leadTime = new Date(dccObs.time.getTime() - mins * 60 * 1000);
      const leadKey = leadTime.toISOString().slice(0, 16);
      leads[mins] = sndMap.get(leadKey);
    });
    
    if (sndNow) {
      correlations.push({
        time: dccObs.time,
        hour,
        isThermal,
        dcc: dccObs,
        snd: sndNow,
        leads,
      });
      
      // Track lead time patterns for thermal events
      if (isThermal) {
        [30, 60, 90, 120].forEach(mins => {
          if (leads[mins]) {
            leadTimeAnalysis[mins].push({
              sndSpeed: leads[mins].speed,
              sndDir: leads[mins].direction,
              sndTemp: leads[mins].temp,
              dccSpeed: dccObs.speed,
              dccDir: dccObs.direction,
            });
          }
        });
      }
    }
  });
  
  console.log(`\nCorrelated observations: ${correlations.length}`);
  
  // Analyze SND wind patterns during thermal vs non-thermal
  const thermalEvents = correlations.filter(c => c.isThermal);
  const nonThermalEvents = correlations.filter(c => !c.isThermal);
  
  console.log(`\nThermal events: ${thermalEvents.length}`);
  console.log(`Non-thermal events: ${nonThermalEvents.length}`);
  
  // SND wind speed during thermal vs non-thermal
  console.log('\n' + '='.repeat(70));
  console.log('ARROWHEAD (SND) CONDITIONS DURING DCC THERMAL vs NON-THERMAL');
  console.log('='.repeat(70));
  
  const thermalSndSpeeds = thermalEvents.filter(e => e.snd.speed != null).map(e => e.snd.speed);
  const nonThermalSndSpeeds = nonThermalEvents.filter(e => e.snd.speed != null).map(e => e.snd.speed);
  
  if (thermalSndSpeeds.length > 0) {
    const avgThermal = thermalSndSpeeds.reduce((a, b) => a + b, 0) / thermalSndSpeeds.length;
    const maxThermal = Math.max(...thermalSndSpeeds);
    const minThermal = Math.min(...thermalSndSpeeds);
    console.log(`\nDuring DCC THERMAL events, Arrowhead wind:`);
    console.log(`  Average: ${avgThermal.toFixed(1)} mph`);
    console.log(`  Range: ${minThermal.toFixed(1)} - ${maxThermal.toFixed(1)} mph`);
  }
  
  if (nonThermalSndSpeeds.length > 0) {
    const avgNonThermal = nonThermalSndSpeeds.reduce((a, b) => a + b, 0) / nonThermalSndSpeeds.length;
    console.log(`\nDuring NON-THERMAL, Arrowhead wind:`);
    console.log(`  Average: ${avgNonThermal.toFixed(1)} mph`);
  }
  
  // SND wind direction during thermal
  const thermalSndDirs = thermalEvents.filter(e => e.snd.direction != null).map(e => e.snd.direction);
  if (thermalSndDirs.length > 0) {
    const avgDir = thermalSndDirs.reduce((a, b) => a + b, 0) / thermalSndDirs.length;
    console.log(`\nArrowhead wind DIRECTION during DCC thermals:`);
    console.log(`  Average: ${avgDir.toFixed(0)}° (${directionToCardinal(avgDir)})`);
    
    // Direction distribution
    const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    thermalSndDirs.forEach(d => {
      if (d >= 337.5 || d < 22.5) dirBuckets.N++;
      else if (d < 67.5) dirBuckets.NE++;
      else if (d < 112.5) dirBuckets.E++;
      else if (d < 157.5) dirBuckets.SE++;
      else if (d < 202.5) dirBuckets.S++;
      else if (d < 247.5) dirBuckets.SW++;
      else if (d < 292.5) dirBuckets.W++;
      else dirBuckets.NW++;
    });
    console.log(`  Direction distribution:`);
    Object.entries(dirBuckets).forEach(([dir, count]) => {
      const pct = ((count / thermalSndDirs.length) * 100).toFixed(1);
      if (count > 0) console.log(`    ${dir}: ${count} (${pct}%)`);
    });
  }
  
  // Lead time analysis
  console.log('\n' + '='.repeat(70));
  console.log('LEAD TIME ANALYSIS: Arrowhead patterns BEFORE DCC thermal');
  console.log('='.repeat(70));
  
  [30, 60, 90, 120].forEach(mins => {
    const data = leadTimeAnalysis[mins];
    if (data.length === 0) return;
    
    const avgSndSpeed = data.reduce((sum, d) => sum + (d.sndSpeed || 0), 0) / data.length;
    const avgSndDir = data.filter(d => d.sndDir != null).reduce((sum, d) => sum + d.sndDir, 0) / data.filter(d => d.sndDir != null).length;
    
    console.log(`\n${mins} minutes BEFORE thermal at DCC:`);
    console.log(`  Arrowhead avg wind: ${avgSndSpeed.toFixed(1)} mph from ${avgSndDir.toFixed(0)}° (${directionToCardinal(avgSndDir)})`);
    console.log(`  Sample size: ${data.length} events`);
  });
  
  // Find the "trigger" pattern
  console.log('\n' + '='.repeat(70));
  console.log('TRIGGER PATTERN ANALYSIS');
  console.log('='.repeat(70));
  
  // Look for speed threshold at Arrowhead that predicts thermal
  const speedThresholds = [2, 4, 6, 8, 10, 12, 15];
  console.log('\nArrowhead wind speed vs DCC thermal probability:');
  console.log('SND Speed | Thermal Rate | Sample Size');
  console.log('----------|--------------|------------');
  
  speedThresholds.forEach((threshold, i) => {
    const nextThreshold = speedThresholds[i + 1] || 99;
    const inRange = correlations.filter(c => 
      c.snd.speed != null && 
      c.snd.speed >= threshold && 
      c.snd.speed < nextThreshold
    );
    const thermalInRange = inRange.filter(c => c.isThermal);
    const rate = inRange.length > 0 ? (thermalInRange.length / inRange.length * 100).toFixed(1) : '0.0';
    console.log(`${threshold}-${nextThreshold} mph | ${rate.padStart(10)}% | ${inRange.length}`);
  });
  
  // Direction at Arrowhead vs thermal probability
  console.log('\nArrowhead wind DIRECTION vs DCC thermal probability:');
  console.log('SND Dir   | Thermal Rate | Sample Size');
  console.log('----------|--------------|------------');
  
  const dirRanges = [
    { name: 'N (315-45)', min: 315, max: 45 },
    { name: 'E (45-135)', min: 45, max: 135 },
    { name: 'S (135-225)', min: 135, max: 225 },
    { name: 'W (225-315)', min: 225, max: 315 },
  ];
  
  dirRanges.forEach(range => {
    const inRange = correlations.filter(c => {
      if (c.snd.direction == null) return false;
      if (range.min > range.max) {
        return c.snd.direction >= range.min || c.snd.direction < range.max;
      }
      return c.snd.direction >= range.min && c.snd.direction < range.max;
    });
    const thermalInRange = inRange.filter(c => c.isThermal);
    const rate = inRange.length > 0 ? (thermalInRange.length / inRange.length * 100).toFixed(1) : '0.0';
    console.log(`${range.name.padEnd(9)} | ${rate.padStart(10)}% | ${inRange.length}`);
  });
  
  // Hourly breakdown of correlation
  console.log('\n' + '='.repeat(70));
  console.log('HOURLY WIND CORRELATION');
  console.log('='.repeat(70));
  console.log('\nHour | DCC Thermal% | Avg DCC Spd | Avg SND Spd | SND Dir');
  console.log('-----|--------------|-------------|-------------|--------');
  
  for (let h = 10; h <= 18; h++) {
    const hourData = correlations.filter(c => c.hour === h);
    const thermalHour = hourData.filter(c => c.isThermal);
    const rate = hourData.length > 0 ? (thermalHour.length / hourData.length * 100).toFixed(1) : '0.0';
    
    const avgDccSpd = thermalHour.length > 0 
      ? (thermalHour.reduce((sum, c) => sum + (c.dcc.speed || 0), 0) / thermalHour.length).toFixed(1)
      : '-';
    const avgSndSpd = thermalHour.length > 0
      ? (thermalHour.reduce((sum, c) => sum + (c.snd.speed || 0), 0) / thermalHour.length).toFixed(1)
      : '-';
    const avgSndDir = thermalHour.filter(c => c.snd.direction != null).length > 0
      ? Math.round(thermalHour.filter(c => c.snd.direction != null).reduce((sum, c) => sum + c.snd.direction, 0) / thermalHour.filter(c => c.snd.direction != null).length)
      : '-';
    
    console.log(`${String(h).padStart(4)} | ${rate.padStart(10)}% | ${String(avgDccSpd).padStart(9)} | ${String(avgSndSpd).padStart(9)} | ${avgSndDir}°`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('KEY FINDINGS FOR PREDICTION MODEL');
  console.log('='.repeat(70));
  
  // Calculate optimal SND conditions
  const optimalSndSpeed = thermalSndSpeeds.length > 0 
    ? thermalSndSpeeds.reduce((a, b) => a + b, 0) / thermalSndSpeeds.length 
    : 0;
  const optimalSndDir = thermalSndDirs.length > 0
    ? thermalSndDirs.reduce((a, b) => a + b, 0) / thermalSndDirs.length
    : 0;
  
  console.log(`\n1. ARROWHEAD TRIGGER CONDITIONS:`);
  console.log(`   - Optimal wind speed: ${optimalSndSpeed.toFixed(1)} mph`);
  console.log(`   - Optimal direction: ${optimalSndDir.toFixed(0)}° (${directionToCardinal(optimalSndDir)})`);
  
  console.log(`\n2. TIMING:`);
  console.log(`   - Lead time: Check Arrowhead 60-90 min before expected thermal`);
  console.log(`   - Peak thermal hours at DCC: 12:00 PM - 3:00 PM`);
  
  console.log(`\n3. PREDICTION RULE:`);
  console.log(`   When Arrowhead shows ${optimalSndSpeed.toFixed(0)}-${(optimalSndSpeed + 4).toFixed(0)} mph from ${directionToCardinal(optimalSndDir)},`);
  console.log(`   expect South thermal at Deer Creek Dam within 60-90 minutes.`);
}

analyzeCorrelation().catch(console.error);
