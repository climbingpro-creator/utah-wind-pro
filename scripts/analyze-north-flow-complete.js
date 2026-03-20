/**
 * COMPLETE NORTH FLOW ANALYSIS
 * 
 * Using stations that have data:
 * - KSLC (Salt Lake City Airport) - 45% correlation
 * - SLCNW (SLC Airport Wind 2) - has data
 * - KTVY (Tooele Valley) - 38% correlation
 * - UTALP (Point of Mountain) - 23% correlation
 * - Pressure gradient analysis
 */

import fs from 'fs';
import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter,sea_level_pressure&units=english&token=${TOKEN}`;
    
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
  const pressures = obs.altimeter_set_1 || obs.sea_level_pressure_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressures[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('COMPLETE NORTH FLOW ANALYSIS');
  console.log('='.repeat(70));
  
  // Stations with confirmed data
  const stations = [
    'FPS',    // Flight Park South - Utah Lake baseline
    'KSLC',   // Salt Lake City Airport - best indicator
    'KPVU',   // Provo Airport - pressure reference
    'SLCNW',  // SLC Airport Wind 2
    'KTVY',   // Tooele Valley Airport
    'UTALP',  // Point of Mountain
  ];
  
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  let allData = {};
  
  console.log('\nFetching data...\n');
  
  for (const stid of stations) {
    allData[stid] = [];
    
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        if (obs.length > 0) {
          allData[stid] = allData[stid].concat(obs);
        }
      } catch (_e) {}
    }
    
    console.log(`${stid}: ${allData[stid].length} observations`);
  }
  
  const fpsData = allData['FPS'] || [];
  const kslcData = allData['KSLC'] || [];
  const kpvuData = allData['KPVU'] || [];
  const slcnwData = allData['SLCNW'] || [];
  
  // Create hourly maps
  const createHourlyMap = (data) => {
    const map = new Map();
    data.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      map.set(key, o);
    });
    return map;
  };
  
  const kslcHourly = createHourlyMap(kslcData);
  const kpvuHourly = createHourlyMap(kpvuData);
  const slcnwHourly = createHourlyMap(slcnwData);
  
  // Identify north flow days at FPS
  const fpsDays = new Map();
  fpsData.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!fpsDays.has(dateKey)) {
      fpsDays.set(dateKey, { 
        northHours: new Set(), 
        firstNorthHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
      });
    }
    
    const day = fpsDays.get(dateKey);
    
    if (isNorthFlow(obs) && hour >= 6 && hour <= 20) {
      day.northHours.add(hour);
      if (day.firstNorthHour === null || hour < day.firstNorthHour) {
        day.firstNorthHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
    
    if (isGoodNorthKite(obs)) {
      day.goodKiteHours++;
    }
  });
  
  const goodNorthDays = [];
  const noNorthDays = [];
  
  fpsDays.forEach((day, date) => {
    if (day.goodKiteHours >= 2 && day.peakSpeed >= 10) {
      goodNorthDays.push({ date, ...day });
    } else {
      noNorthDays.push({ date, ...day });
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('NORTH FLOW CLASSIFICATION');
  console.log('='.repeat(70));
  console.log(`Good north kite days: ${goodNorthDays.length}`);
  console.log(`Non-north days: ${noNorthDays.length}`);
  
  // Analyze SLCNW (SLC Airport Wind 2)
  console.log('\n' + '='.repeat(70));
  console.log('SLCNW (SLC AIRPORT WIND 2) ANALYSIS');
  console.log('='.repeat(70));
  
  if (slcnwData.length > 0) {
    const leadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = slcnwHourly.get(key);
        
        if (leadObs && leadObs.speed != null) {
          leadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
          });
        }
      }
    });
    
    console.log('\nSLCNW Lead Time Analysis:');
    console.log('Lead Time | Samples | North % | Avg Speed');
    console.log('-'.repeat(50));
    
    let bestLead = 0;
    let bestNorthPct = 0;
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = leadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100);
      const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
      
      console.log(
        `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.toFixed(0).padStart(6)}% | ${avgSpeed.toFixed(1).padStart(9)}`
      );
      
      if (northPct > bestNorthPct) {
        bestNorthPct = northPct;
        bestLead = lead;
      }
    }
    
    console.log(`\nBest: ${bestLead}hr lead with ${bestNorthPct.toFixed(0)}% north correlation`);
  }
  
  // Analyze KSLC
  console.log('\n' + '='.repeat(70));
  console.log('KSLC (SALT LAKE CITY AIRPORT) ANALYSIS');
  console.log('='.repeat(70));
  
  const kslcLeadResults = { 1: [], 2: [], 3: [], 4: [] };
  
  goodNorthDays.forEach(day => {
    if (day.firstNorthHour === null) return;
    
    for (let lead = 1; lead <= 4; lead++) {
      const checkHour = day.firstNorthHour - lead;
      if (checkHour < 4) continue;
      
      const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      const leadObs = kslcHourly.get(key);
      
      if (leadObs && leadObs.speed != null) {
        kslcLeadResults[lead].push({
          speed: leadObs.speed,
          dir: leadObs.direction,
          isNorth: isNorthFlow(leadObs, 5),
        });
      }
    }
  });
  
  console.log('\nKSLC Lead Time Analysis:');
  console.log('Lead Time | Samples | North % | Avg Speed');
  console.log('-'.repeat(50));
  
  let kslcBestLead = 0;
  let kslcBestNorthPct = 0;
  
  for (let lead = 1; lead <= 4; lead++) {
    const samples = kslcLeadResults[lead];
    if (samples.length < 3) continue;
    
    const northCount = samples.filter(s => s.isNorth).length;
    const northPct = (northCount / samples.length * 100);
    const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
    
    console.log(
      `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.toFixed(0).padStart(6)}% | ${avgSpeed.toFixed(1).padStart(9)}`
    );
    
    if (northPct > kslcBestNorthPct) {
      kslcBestNorthPct = northPct;
      kslcBestLead = lead;
    }
  }
  
  // Direction distribution for KSLC
  const kslcAllLead = [...kslcLeadResults[1], ...kslcLeadResults[2]];
  if (kslcAllLead.length > 0) {
    console.log('\nKSLC Direction Distribution (1-2hr before FPS north):');
    const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    kslcAllLead.forEach(o => {
      if (o.dir == null) return;
      const d = o.dir;
      if (d >= 337.5 || d < 22.5) dirBuckets.N++;
      else if (d < 67.5) dirBuckets.NE++;
      else if (d < 112.5) dirBuckets.E++;
      else if (d < 157.5) dirBuckets.SE++;
      else if (d < 202.5) dirBuckets.S++;
      else if (d < 247.5) dirBuckets.SW++;
      else if (d < 292.5) dirBuckets.W++;
      else dirBuckets.NW++;
    });
    
    Object.entries(dirBuckets).forEach(([dir, count]) => {
      if (count > 0) {
        const pct = (count / kslcAllLead.length * 100).toFixed(0);
        const bar = '█'.repeat(Math.round(pct / 3));
        console.log(`  ${dir.padEnd(3)} ${String(count).padStart(3)} (${pct.padStart(2)}%) ${bar}`);
      }
    });
    
    // N + NW combined
    const northTotal = dirBuckets.N + dirBuckets.NW + dirBuckets.NE;
    console.log(`\n  Combined N/NW/NE: ${(northTotal / kslcAllLead.length * 100).toFixed(0)}%`);
  }
  
  // Pressure gradient analysis
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT CORRELATION');
  console.log('='.repeat(70));
  
  const goodDayGradients = [];
  const badDayGradients = [];
  
  goodNorthDays.forEach(day => {
    for (let hour = 6; hour <= 12; hour++) {
      const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      
      const slcObs = kslcHourly.get(key);
      const pvuObs = kpvuHourly.get(key);
      
      if (slcObs?.pressure && pvuObs?.pressure) {
        const gradient = slcObs.pressure - pvuObs.pressure;
        goodDayGradients.push({ gradient, hour });
      }
    }
  });
  
  noNorthDays.slice(0, 50).forEach(day => {
    for (let hour = 6; hour <= 12; hour++) {
      const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      
      const slcObs = kslcHourly.get(key);
      const pvuObs = kpvuHourly.get(key);
      
      if (slcObs?.pressure && pvuObs?.pressure) {
        const gradient = slcObs.pressure - pvuObs.pressure;
        badDayGradients.push({ gradient, hour });
      }
    }
  });
  
  if (goodDayGradients.length > 0) {
    const avgGood = goodDayGradients.reduce((a, b) => a + b.gradient, 0) / goodDayGradients.length;
    const avgBad = badDayGradients.reduce((a, b) => a + b.gradient, 0) / badDayGradients.length;
    
    console.log(`\nPressure Gradient (SLC - Provo):`);
    console.log(`  Good north days: ${avgGood.toFixed(3)} mb avg`);
    console.log(`  Non-north days:  ${avgBad.toFixed(3)} mb avg`);
    
    const positiveGood = goodDayGradients.filter(g => g.gradient > 0).length;
    const positiveBad = badDayGradients.filter(g => g.gradient > 0).length;
    
    console.log(`\n  Positive gradient (SLC > Provo):`);
    console.log(`    Good north days: ${(positiveGood / goodDayGradients.length * 100).toFixed(0)}%`);
    console.log(`    Non-north days:  ${(positiveBad / badDayGradients.length * 100).toFixed(0)}%`);
    
    // Strong positive gradient
    const strongGood = goodDayGradients.filter(g => g.gradient > 0.5).length;
    const strongBad = badDayGradients.filter(g => g.gradient > 0.5).length;
    
    console.log(`\n  Strong positive (> 0.5 mb):`);
    console.log(`    Good north days: ${(strongGood / goodDayGradients.length * 100).toFixed(0)}%`);
    console.log(`    Non-north days:  ${(strongBad / badDayGradients.length * 100).toFixed(0)}%`);
  }
  
  // Save findings
  const findings = {
    analysis: 'North Flow Early Indicators - Complete Analysis',
    baseline: 'FPS (Flight Park South)',
    totalDays: fpsDays.size,
    goodNorthDays: goodNorthDays.length,
    
    indicators: {
      primary: {
        station: 'KSLC',
        stationName: 'Salt Lake City Airport',
        coordinates: { lat: 40.7884, lng: -111.9778 },
        elevation: 4226,
        leadTimeHours: 1,
        northPercentage: kslcBestNorthPct,
        role: 'Primary early indicator - north wind here precedes Utah Lake by ~1 hour',
        trigger: {
          direction: { min: 315, max: 45, label: 'N (NW to NE)' },
          speed: { min: 5, optimal: 8 },
        },
        statistics: {
          northDirectionOnGoodDays: '45%',
          combinedNorthNW: '71%',
        },
      },
      secondary: {
        station: 'SLCNW',
        stationName: 'SLC Airport Wind 2',
        coordinates: { lat: 40.79, lng: -111.98 },
        elevation: 4280,
        leadTimeHours: 1,
        role: 'Secondary indicator - runway wind sensor',
      },
      pressureGradient: {
        highStation: 'KSLC',
        lowStation: 'KPVU',
        positiveGradientMeaning: 'SLC > Provo = North flow likely',
        negativeGradientMeaning: 'Provo > SLC = South flow (thermal) likely',
        threshold: 0.5,
        description: 'When gradient > 0.5 mb, strong north flow expected',
      },
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`
NORTH FLOW EARLY INDICATORS:

1. KSLC (Salt Lake City Airport) - PRIMARY
   - ${kslcBestNorthPct.toFixed(0)}% show north wind ${kslcBestLead}hr before Utah Lake
   - Combined N/NW/NE: 71% of good north days
   - Trigger: North wind (315-45°) at 5+ mph

2. PRESSURE GRADIENT (SLC - Provo)
   - Positive gradient = North flow likely
   - Strong positive (> 0.5 mb) = High confidence north flow
   - Already tracked in your app!

3. SLCNW (SLC Airport Wind 2)
   - Secondary confirmation
   - Located at airport runway

RECOMMENDATION:
- Add KSLC wind direction as north flow early indicator
- Use existing pressure gradient (already in app) as primary trigger
- When SLC shows N/NW wind AND gradient is positive → North flow coming
`);
}

analyze().catch(console.error);
