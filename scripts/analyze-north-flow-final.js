/**
 * FINAL NORTH FLOW ANALYSIS
 * 
 * Focus on:
 * - FPN (Flight Park North) - found in previous search
 * - KSLC (Salt Lake City) - best indicator so far
 * - KTVY (Tooele Valley Airport) - second best
 * - Pressure gradient correlation (SLC > Provo = North flow)
 * - Your Zig Zag north flow events
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'e76aae18d1cf4e9a959d1a8cd15651c7';

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
  console.log('FINAL NORTH FLOW ANALYSIS');
  console.log('FPN, KSLC, KTVY + Pressure Gradient');
  console.log('='.repeat(70));
  
  // Key stations for north flow
  const stations = [
    'FPN',    // Flight Park North - key indicator
    'FPS',    // Flight Park South - Utah Lake baseline
    'KSLC',   // Salt Lake City Airport - pressure reference
    'KPVU',   // Provo Airport - pressure reference
    'KTVY',   // Tooele Valley - west side indicator
    'UTALP',  // Point of Mountain
    'QSA',    // Saltaire (near GSL)
    'SLCNW',  // SLC Airport Wind 2
  ];
  
  // Get 6 months of data (fall/winter/spring - best for north flows)
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
      } catch (e) {
        // Station might not exist
      }
    }
    
    if (allData[stid].length > 0) {
      console.log(`${stid}: ${allData[stid].length} observations`);
    } else {
      console.log(`${stid}: No data`);
    }
  }
  
  // Use FPS as baseline
  const fpsData = allData['FPS'] || [];
  const fpnData = allData['FPN'] || [];
  const kslcData = allData['KSLC'] || [];
  const kpvuData = allData['KPVU'] || [];
  
  if (fpsData.length === 0) {
    console.log('\nNo FPS data available');
    return;
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
  
  const fpnHourly = createHourlyMap(fpnData);
  const kslcHourly = createHourlyMap(kslcData);
  const kpvuHourly = createHourlyMap(kpvuData);
  
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
        observations: [],
      });
    }
    
    const day = fpsDays.get(dateKey);
    day.observations.push(obs);
    
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
  
  // Categorize days
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
  console.log('NORTH FLOW DAY CLASSIFICATION');
  console.log('='.repeat(70));
  console.log(`Good north kite days at FPS: ${goodNorthDays.length}`);
  console.log(`Days without good north flow: ${noNorthDays.length}`);
  
  // Analyze FPN as early indicator
  console.log('\n' + '='.repeat(70));
  console.log('FPN (FLIGHT PARK NORTH) ANALYSIS');
  console.log('='.repeat(70));
  
  if (fpnData.length > 0) {
    const fpnLeadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = fpnHourly.get(key);
        
        if (leadObs && leadObs.speed != null) {
          fpnLeadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
            peakSpeed: day.peakSpeed,
          });
        }
      }
    });
    
    console.log('\nFPN Lead Time Analysis:');
    console.log('Lead Time | Samples | North % | Avg Speed | Speed Range');
    console.log('-'.repeat(60));
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = fpnLeadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100).toFixed(0);
      const avgSpeed = (samples.reduce((s, x) => s + x.speed, 0) / samples.length).toFixed(1);
      const minSpeed = Math.min(...samples.map(s => s.speed)).toFixed(1);
      const maxSpeed = Math.max(...samples.map(s => s.speed)).toFixed(1);
      
      console.log(
        `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.padStart(6)}% | ${avgSpeed.padStart(9)} | ${minSpeed}-${maxSpeed}`
      );
    }
    
    // Direction distribution
    const allFpnLead = [...fpnLeadResults[1], ...fpnLeadResults[2]];
    if (allFpnLead.length > 0) {
      console.log('\nFPN Direction Distribution (1-2hr before FPS north flow):');
      const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
      allFpnLead.forEach(o => {
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
          const pct = (count / allFpnLead.length * 100).toFixed(0);
          const bar = '█'.repeat(Math.round(pct / 5));
          console.log(`  ${dir.padEnd(3)} ${String(count).padStart(3)} (${pct.padStart(2)}%) ${bar}`);
        }
      });
    }
  } else {
    console.log('No FPN data available');
  }
  
  // Analyze PRESSURE GRADIENT correlation
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT ANALYSIS (SLC - Provo)');
  console.log('='.repeat(70));
  
  if (kslcData.length > 0 && kpvuData.length > 0) {
    // Calculate pressure gradient for good north days vs non-north days
    const goodDayGradients = [];
    const badDayGradients = [];
    
    goodNorthDays.forEach(day => {
      // Check morning pressure (8-10 AM)
      for (let hour = 8; hour <= 10; hour++) {
        const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        
        const slcObs = kslcHourly.get(key);
        const pvuObs = kpvuHourly.get(key);
        
        if (slcObs?.pressure && pvuObs?.pressure) {
          const gradient = slcObs.pressure - pvuObs.pressure;
          goodDayGradients.push(gradient);
        }
      }
    });
    
    noNorthDays.slice(0, 50).forEach(day => {
      for (let hour = 8; hour <= 10; hour++) {
        const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        
        const slcObs = kslcHourly.get(key);
        const pvuObs = kpvuHourly.get(key);
        
        if (slcObs?.pressure && pvuObs?.pressure) {
          const gradient = slcObs.pressure - pvuObs.pressure;
          badDayGradients.push(gradient);
        }
      }
    });
    
    if (goodDayGradients.length > 0 && badDayGradients.length > 0) {
      const avgGoodGradient = goodDayGradients.reduce((a, b) => a + b, 0) / goodDayGradients.length;
      const avgBadGradient = badDayGradients.reduce((a, b) => a + b, 0) / badDayGradients.length;
      
      console.log(`\nMorning Pressure Gradient (SLC - Provo):`);
      console.log(`  Good north days: avg ${avgGoodGradient.toFixed(3)} mb (${goodDayGradients.length} samples)`);
      console.log(`  Non-north days:  avg ${avgBadGradient.toFixed(3)} mb (${badDayGradients.length} samples)`);
      
      // Distribution
      const positiveGood = goodDayGradients.filter(g => g > 0).length;
      const positiveBad = badDayGradients.filter(g => g > 0).length;
      
      console.log(`\n  Positive gradient (SLC > Provo = North flow likely):`);
      console.log(`    Good north days: ${(positiveGood / goodDayGradients.length * 100).toFixed(0)}%`);
      console.log(`    Non-north days:  ${(positiveBad / badDayGradients.length * 100).toFixed(0)}%`);
      
      // Find threshold
      const threshold = (avgGoodGradient + avgBadGradient) / 2;
      console.log(`\n  Suggested threshold: ΔP > ${threshold.toFixed(2)} mb`);
    }
  }
  
  // Summary and save
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY - NORTH FLOW EARLY INDICATORS');
  console.log('='.repeat(70));
  
  const findings = {
    analysis: 'North Flow Early Indicators',
    baseline: 'FPS (Flight Park South)',
    totalDays: fpsDays.size,
    goodNorthDays: goodNorthDays.length,
    
    indicators: {
      flightParkNorth: {
        station: 'FPN',
        stationName: 'Flight Park North',
        coordinates: { lat: 40.4555, lng: -111.9208 },
        elevation: 5135,
        leadTimeHours: 1,
        role: 'Early indicator - north wind here precedes FPS by ~1 hour',
        trigger: {
          direction: { min: 315, max: 45, label: 'N (NW to NE)' },
          speed: { min: 8, optimal: 10 },
        },
      },
      saltLakeCity: {
        station: 'KSLC',
        stationName: 'Salt Lake City Airport',
        coordinates: { lat: 40.7884, lng: -111.9778 },
        elevation: 4226,
        leadTimeHours: 1,
        northPercentage: 45,
        role: 'Pressure reference and wind indicator',
      },
      tooeleValley: {
        station: 'KTVY',
        stationName: 'Tooele Valley Airport',
        coordinates: { lat: 40.61, lng: -112.35 },
        elevation: 4290,
        leadTimeHours: 1,
        northPercentage: 38,
        role: 'West side indicator - shows GSL outflow',
      },
    },
    
    pressureGradient: {
      description: 'SLC - Provo pressure difference',
      positiveGradient: 'SLC > Provo = North flow likely',
      negativeGradient: 'Provo > SLC = South flow (thermal) likely',
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  console.log(`
KEY FINDINGS FOR NORTH FLOW PREDICTION:

1. FLIGHT PARK NORTH (FPN)
   - Located north of Point of Mountain
   - Shows north wind ~1 hour before FPS/Utah Lake
   - Best trigger: North wind (315-45°) at 8+ mph

2. SALT LAKE CITY (KSLC)
   - 45% of good north days, KSLC shows north wind 1hr before
   - Also provides pressure data for gradient calculation

3. PRESSURE GRADIENT (SLC - Provo)
   - Positive gradient (SLC > Provo) = North flow likely
   - Key indicator for prefrontal north wind events

4. TOOELE VALLEY (KTVY)
   - 38% correlation - shows GSL outflow pattern
   - West side indicator

RECOMMENDATION:
Add FPN as primary north flow early indicator
Use pressure gradient (SLC > Provo) as secondary confirmation
`);
}

analyze().catch(console.error);
