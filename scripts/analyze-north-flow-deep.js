/**
 * DEEP NORTH FLOW ANALYSIS
 * 
 * Focus on:
 * - U42 / Airport 2 (West Valley / Salt Lake City Municipal 2)
 * - FPN (Flight Park North)
 * - Stations near Great Salt Lake
 * - Your Zig Zag historical data for north flow events
 */

import fs from 'fs';
import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

async function searchStations(lat, lng, radius) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=${lat},${lng},${radius}&limit=100&token=${TOKEN}`;
    
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

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter&units=english&token=${TOKEN}`;
    
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
  console.log('DEEP NORTH FLOW ANALYSIS');
  console.log('Finding Airport 2, FPN, and GSL stations');
  console.log('='.repeat(70));
  
  // Search multiple areas
  const searchAreas = [
    { name: 'West Valley (Airport 2 area)', lat: 40.62, lng: -112.0, radius: 15 },
    { name: 'Salt Lake City', lat: 40.76, lng: -111.89, radius: 10 },
    { name: 'Great Salt Lake South', lat: 40.85, lng: -112.1, radius: 20 },
    { name: 'Point of Mountain', lat: 40.45, lng: -111.9, radius: 10 },
    { name: 'Tooele Valley', lat: 40.53, lng: -112.3, radius: 15 },
  ];
  
  const allStations = new Map();
  
  for (const area of searchAreas) {
    console.log(`\nSearching ${area.name}...`);
    try {
      const result = await searchStations(area.lat, area.lng, area.radius);
      if (result.STATION) {
        result.STATION.forEach(s => {
          if (s.STID && !allStations.has(s.STID)) {
            allStations.set(s.STID, s);
          }
        });
        console.log(`  Found ${result.STATION.length} stations`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log(`\nTotal unique stations: ${allStations.size}`);
  
  // Filter and display relevant stations
  console.log('\n' + '-'.repeat(70));
  console.log('KEY STATIONS FOR NORTH FLOW ANALYSIS:');
  console.log('-'.repeat(70));
  
  const relevantStations = Array.from(allStations.values())
    .filter(s => {
      const name = (s.NAME || '').toLowerCase();
      const stid = (s.STID || '').toLowerCase();
      return (
        name.includes('airport') ||
        name.includes('municipal') ||
        name.includes('flight') ||
        name.includes('lake') ||
        name.includes('salt') ||
        name.includes('tooele') ||
        name.includes('valley') ||
        stid.includes('u42') ||
        stid.includes('fpn') ||
        stid.includes('fps') ||
        stid.includes('slc') ||
        stid.includes('qlk')
      );
    })
    .sort((a, b) => (a.NAME || '').localeCompare(b.NAME || ''));
  
  console.log('ID'.padEnd(12) + 'Name'.padEnd(45) + 'Elev (ft)');
  console.log('-'.repeat(70));
  
  relevantStations.forEach(s => {
    const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
    console.log(
      (s.STID || '?').padEnd(12) +
      (s.NAME || '?').substring(0, 44).padEnd(45) +
      String(elev)
    );
  });
  
  // Now let's test specific stations
  console.log('\n' + '='.repeat(70));
  console.log('TESTING SPECIFIC STATIONS');
  console.log('='.repeat(70));
  
  // Extended list of stations to test
  const testStations = [
    // Airport 2 / West Valley area
    'U42', 'KUTW', 'KU42', 'SLCU2',
    // Flight Parks
    'FPN', 'FPS', 'UTALP',
    // SLC area
    'KSLC', 'QSL', 'QSLC',
    // Great Salt Lake area
    'QLK', 'QLKP', 'UTLKP', 'UTANT', 'UTFAR',
    // Tooele
    'KTVY', 'QTO', 'UTDUG',
    // Other valley
    'QBF', 'QBOU', 'UTMAG', 'UTWVC',
  ];
  
  // Get fall/winter data (best for north flows)
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
  ];
  
  let allData = {};
  
  console.log('\nFetching data for test stations...\n');
  
  for (const stid of testStations) {
    allData[stid] = [];
    
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        if (obs.length > 0) {
          allData[stid] = allData[stid].concat(obs);
        }
      } catch (_e) {
        // Station might not exist
      }
    }
    
    if (allData[stid].length > 0) {
      console.log(`${stid}: ${allData[stid].length} observations`);
    }
  }
  
  // Load Zig Zag historical data for north flow events
  try {
    const zigzagPath = './src/data/zigzag-historical.json';
    const zigzagData = JSON.parse(fs.readFileSync(zigzagPath, 'utf8'));
    console.log('\nLoaded Zig Zag historical data');
    
    // Get north flow stats from Zig Zag
    if (zigzagData.monthlyPatterns) {
      console.log('\nZig Zag North Flow Monthly Rates:');
      Object.entries(zigzagData.monthlyPatterns).forEach(([month, data]) => {
        if (data.nRate > 5) {
          console.log(`  Month ${month}: ${data.nRate}% north flow days`);
        }
      });
    }
  } catch (_e) {
    console.log('Could not load Zig Zag data');
  }
  
  // Use FPS as baseline
  const fpsData = allData['FPS'] || [];
  
  if (fpsData.length === 0) {
    console.log('\nNo FPS data - trying UTALP as baseline');
  }
  
  const baselineData = fpsData.length > 0 ? fpsData : (allData['UTALP'] || []);
  const baselineName = fpsData.length > 0 ? 'FPS' : 'UTALP';
  
  if (baselineData.length === 0) {
    console.log('\nNo baseline data available');
    return;
  }
  
  console.log(`\nUsing ${baselineName} as baseline (${baselineData.length} obs)`);
  
  // Identify north flow days
  const baseDays = new Map();
  baselineData.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!baseDays.has(dateKey)) {
      baseDays.set(dateKey, { 
        northHours: new Set(), 
        firstNorthHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
      });
    }
    
    const day = baseDays.get(dateKey);
    
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
  baseDays.forEach((day, date) => {
    if (day.goodKiteHours >= 2 && day.peakSpeed >= 10) {
      goodNorthDays.push({ date, ...day });
    }
  });
  
  console.log(`\nGood north kite days at ${baselineName}: ${goodNorthDays.length}`);
  
  // Analyze each station
  console.log('\n' + '='.repeat(70));
  console.log('LEAD INDICATOR ANALYSIS');
  console.log('='.repeat(70));
  
  const stationResults = [];
  
  for (const [stid, stationObs] of Object.entries(allData)) {
    if (stid === baselineName || stationObs.length === 0) continue;
    
    // Create hourly map
    const hourlyMap = new Map();
    stationObs.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      hourlyMap.set(key, o);
    });
    
    // Check lead times
    const leadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = hourlyMap.get(key);
        
        if (leadObs && leadObs.speed != null) {
          leadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
            peakSpeed: day.peakSpeed,
          });
        }
      }
    });
    
    // Find best lead time
    let bestLead = 0;
    let bestNorthPct = 0;
    let bestAvgSpeed = 0;
    let bestSamples = 0;
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = leadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100);
      const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
      
      if (northPct > bestNorthPct || (northPct === bestNorthPct && samples.length > bestSamples)) {
        bestNorthPct = northPct;
        bestLead = lead;
        bestAvgSpeed = avgSpeed;
        bestSamples = samples.length;
      }
    }
    
    if (bestLead > 0) {
      stationResults.push({
        stid,
        bestLead,
        northPct: bestNorthPct,
        avgSpeed: bestAvgSpeed,
        samples: bestSamples,
        totalObs: stationObs.length,
      });
      
      console.log(`\n${stid}: ${bestNorthPct.toFixed(0)}% north at ${bestLead}hr lead (${bestSamples} samples, avg ${bestAvgSpeed.toFixed(1)} mph)`);
    }
  }
  
  // Sort by north percentage
  stationResults.sort((a, b) => b.northPct - a.northPct);
  
  console.log('\n' + '='.repeat(70));
  console.log('RANKED NORTH FLOW EARLY INDICATORS');
  console.log('='.repeat(70));
  console.log('\nStation'.padEnd(12) + 'Lead'.padEnd(8) + 'North %'.padEnd(10) + 'Avg Spd'.padEnd(10) + 'Samples'.padEnd(10) + 'Total Obs');
  console.log('-'.repeat(70));
  
  stationResults.slice(0, 10).forEach(r => {
    console.log(
      r.stid.padEnd(12) +
      `${r.bestLead}hr`.padEnd(8) +
      `${r.northPct.toFixed(0)}%`.padEnd(10) +
      `${r.avgSpeed.toFixed(1)}`.padEnd(10) +
      String(r.samples).padEnd(10) +
      r.totalObs
    );
  });
  
  // Save findings
  const findings = {
    analysis: 'North Flow Early Indicators - Deep Analysis',
    baseline: baselineName,
    totalDays: baseDays.size,
    goodNorthDays: goodNorthDays.length,
    bestIndicators: stationResults.slice(0, 5).map(r => ({
      station: r.stid,
      leadTimeHours: r.bestLead,
      northWindPercentage: r.northPct,
      avgSpeed: r.avgSpeed,
      samples: r.samples,
    })),
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, optimal: 10 },
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  // Summary
  if (stationResults.length > 0) {
    const best = stationResults[0];
    console.log('\n' + '='.repeat(70));
    console.log('KEY FINDINGS');
    console.log('='.repeat(70));
    console.log(`
BEST NORTH FLOW EARLY INDICATOR: ${best.stid}

Pattern:
- When ${best.stid} shows North wind (315-45°) at ${best.avgSpeed.toFixed(0)}+ mph
- ${best.northPct.toFixed(0)}% chance of good north flow at Utah Lake
- Lead time: ~${best.bestLead} hour(s) before Utah Lake

Top 3 Indicators:
${stationResults.slice(0, 3).map((r, i) => 
  `${i + 1}. ${r.stid}: ${r.northPct.toFixed(0)}% north @ ${r.bestLead}hr lead`
).join('\n')}
`);
  }
}

analyze().catch(console.error);
