/**
 * NORTH FLOW EARLY INDICATOR ANALYSIS
 * 
 * Goal: Find if stations near Great Salt Lake are early indicators
 * for North flows at Utah Lake (Zig Zag, Pelican Point, etc.)
 * 
 * Stations to analyze:
 * - KUTW / U42 - Salt Lake City Municipal 2 (West Valley)
 * - FPN - Flight Park North
 * - Compare with Zig Zag north flow events
 * 
 * North flow characteristics:
 * - Direction: 315-45° (NW to NE, centered on N)
 * - Driven by pressure gradient (SLC > Provo)
 * - Originates from Great Salt Lake area
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
  const pressures = obs.altimeter_set_1 || [];
  
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

// Check if wind is North flow (NW to NE)
function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  // North flow: 315-360 or 0-45 (NW to NE)
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

// Check if wind is good kiting North flow
function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('NORTH FLOW EARLY INDICATOR ANALYSIS');
  console.log('Great Salt Lake → Utah Lake Correlation');
  console.log('='.repeat(70));
  
  // First, search for stations near West Valley / Great Salt Lake area
  console.log('\nSearching for stations near West Valley / Great Salt Lake...\n');
  
  try {
    // West Valley area (40.69, -111.99)
    const westValleySearch = await searchStations(40.69, -111.99, 15);
    
    // Great Salt Lake south shore (40.75, -112.1)
    const gslSearch = await searchStations(40.75, -112.1, 20);
    
    const allStations = new Map();
    
    if (westValleySearch.STATION) {
      westValleySearch.STATION.forEach(s => {
        if (s.STID) allStations.set(s.STID, s);
      });
    }
    
    if (gslSearch.STATION) {
      gslSearch.STATION.forEach(s => {
        if (s.STID) allStations.set(s.STID, s);
      });
    }
    
    console.log('STATIONS FOUND NEAR WEST VALLEY / GSL:');
    console.log('-'.repeat(70));
    console.log('ID'.padEnd(12) + 'Name'.padEnd(40) + 'Elev (ft)');
    console.log('-'.repeat(70));
    
    const stations = Array.from(allStations.values())
      .filter(s => {
        const elev = s.ELEVATION ? s.ELEVATION * 3.28084 : 0;
        return elev > 4000 && elev < 5500; // Valley floor elevation
      })
      .sort((a, b) => (a.NAME || '').localeCompare(b.NAME || ''));
    
    stations.forEach(s => {
      const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
      console.log(
        (s.STID || '?').padEnd(12) +
        (s.NAME || '?').substring(0, 39).padEnd(40) +
        String(elev)
      );
    });
    
    console.log(`\nTotal valley stations: ${stations.length}`);
    
    // Look for specific stations we want
    const targetStations = ['U42', 'KUTW', 'KSLC', 'FPN', 'FPS', 'UTALP', 'QBF', 'QLK'];
    console.log('\nLooking for key stations:', targetStations.join(', '));
    
    // Now fetch data and analyze
    console.log('\n' + '='.repeat(70));
    console.log('FETCHING HISTORICAL DATA');
    console.log('='.repeat(70));
    
    // Get 3 months of data
    const periods = [
      { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
      { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
      { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    ];
    
    // Stations to test for north flow correlation
    const testStations = [
      'U42',    // Salt Lake City Municipal 2 (West Valley)
      'KUTW',   // Alternative ID for Municipal 2
      'KSLC',   // SLC Airport - baseline
      'FPN',    // Flight Park North
      'FPS',    // Flight Park South - baseline for Utah Lake
      'UTALP',  // Point of Mountain
      'QBF',    // Bountiful
      'QLK',    // Lake Point (near GSL)
      'KOGD',   // Ogden
      'K36U',   // Heber
    ];
    
    let allData = {};
    
    for (const stid of testStations) {
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
      }
    }
    
    // Use FPS as baseline for Utah Lake north flow events
    const fpsData = allData['FPS'] || [];
    
    if (fpsData.length === 0) {
      console.log('\nNo FPS data available for baseline');
      return;
    }
    
    // Identify north flow days at FPS (Utah Lake)
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
    
    // Categorize days
    const goodNorthDays = [];
    const northDays = [];
    const noNorthDays = [];
    
    fpsDays.forEach((day, date) => {
      if (day.goodKiteHours >= 2 && day.peakSpeed >= 12) {
        goodNorthDays.push({ date, ...day });
      } else if (day.northHours.size >= 2) {
        northDays.push({ date, ...day });
      } else {
        noNorthDays.push({ date, ...day });
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('NORTH FLOW DAY CLASSIFICATION (at FPS/Utah Lake)');
    console.log('='.repeat(70));
    console.log(`Good north kite days (10+ mph, 2+ hours): ${goodNorthDays.length}`);
    console.log(`North flow days (8+ mph, 2+ hours): ${northDays.length}`);
    console.log(`No significant north flow: ${noNorthDays.length}`);
    
    // Analyze each potential early indicator station
    console.log('\n' + '='.repeat(70));
    console.log('EARLY INDICATOR ANALYSIS');
    console.log('='.repeat(70));
    
    const stationResults = [];
    
    for (const [stid, stationObs] of Object.entries(allData)) {
      if (stid === 'FPS' || stationObs.length === 0) continue;
      
      console.log(`\n--- Analyzing ${stid} ---`);
      console.log(`  ${stationObs.length} observations`);
      
      // Create hourly map
      const hourlyMap = new Map();
      stationObs.forEach(o => {
        const key = o.time.toISOString().slice(0, 13);
        hourlyMap.set(key, o);
      });
      
      // Check lead times for good north days
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
              date: day.date,
              speed: leadObs.speed,
              dir: leadObs.direction,
              peakSpeed: day.peakSpeed,
              isNorth: isNorthFlow(leadObs, 5), // Lower threshold for lead indicator
            });
          }
        }
      });
      
      // Calculate stats for each lead time
      let bestLead = 0;
      let bestNorthPct = 0;
      let bestAvgSpeed = 0;
      
      for (let lead = 1; lead <= 4; lead++) {
        const samples = leadResults[lead];
        if (samples.length < 3) continue;
        
        const northCount = samples.filter(s => s.isNorth).length;
        const northPct = (northCount / samples.length * 100);
        const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
        
        console.log(`  ${lead}hr lead: ${samples.length} samples, ${northPct.toFixed(0)}% north, avg ${avgSpeed.toFixed(1)} mph`);
        
        if (northPct > bestNorthPct) {
          bestNorthPct = northPct;
          bestLead = lead;
          bestAvgSpeed = avgSpeed;
        }
      }
      
      if (bestLead > 0 && bestNorthPct > 30) {
        stationResults.push({
          stid,
          bestLead,
          northPct: bestNorthPct,
          avgSpeed: bestAvgSpeed,
          samples: leadResults[bestLead].length,
        });
      }
      
      // Direction distribution on good north days
      const allLeadObs = [...leadResults[1], ...leadResults[2]];
      if (allLeadObs.length > 0) {
        const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
        allLeadObs.forEach(o => {
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
        
        console.log(`  Direction distribution (1-2hr before north flow at FPS):`);
        Object.entries(dirBuckets).forEach(([dir, count]) => {
          if (count > 0) {
            const pct = (count / allLeadObs.length * 100).toFixed(0);
            console.log(`    ${dir}: ${count} (${pct}%)`);
          }
        });
      }
    }
    
    // Sort by north percentage
    stationResults.sort((a, b) => b.northPct - a.northPct);
    
    console.log('\n' + '='.repeat(70));
    console.log('BEST NORTH FLOW EARLY INDICATORS');
    console.log('='.repeat(70));
    console.log('\nStation'.padEnd(12) + 'Lead Time'.padEnd(12) + 'North %'.padEnd(12) + 'Avg Speed'.padEnd(12) + 'Samples');
    console.log('-'.repeat(60));
    
    stationResults.forEach(r => {
      console.log(
        r.stid.padEnd(12) +
        `${r.bestLead} hours`.padEnd(12) +
        `${r.northPct.toFixed(0)}%`.padEnd(12) +
        `${r.avgSpeed.toFixed(1)} mph`.padEnd(12) +
        r.samples
      );
    });
    
    // Save findings
    const findings = {
      analysis: 'North Flow Early Indicators',
      description: 'Stations that show north wind before Utah Lake north flow events',
      baseline: 'FPS (Flight Park South)',
      totalDays: fpsDays.size,
      goodNorthDays: goodNorthDays.length,
      northDays: northDays.length,
      indicators: stationResults.map(r => ({
        station: r.stid,
        leadTimeHours: r.bestLead,
        northWindPercentage: r.northPct,
        avgSpeed: r.avgSpeed,
        samples: r.samples,
      })),
      trigger: {
        direction: { min: 315, max: 45, label: 'N (NW to NE)' },
        speed: { min: 8, optimal: 12 },
      },
    };
    
    fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
    console.log('\nSaved to src/data/north-flow-indicators.json');
    
    console.log('\n' + '='.repeat(70));
    console.log('CONCLUSION');
    console.log('='.repeat(70));
    
    if (stationResults.length > 0) {
      const best = stationResults[0];
      console.log(`
KEY FINDING: ${best.stid} is the best early indicator for North flows!

When ${best.stid} shows North wind (315-45°):
- ${best.northPct.toFixed(0)}% of the time, Utah Lake gets good north flow
- Average speed at indicator: ${best.avgSpeed.toFixed(1)} mph
- Lead time: ~${best.bestLead} hours before Utah Lake

RECOMMENDATION: Add ${best.stid} to the prediction model as a
${best.bestLead}-hour early warning indicator for North flows.
`);
    } else {
      console.log('\nNo strong early indicators found. May need more data or different stations.');
    }
    
  } catch (err) {
    console.error('Analysis error:', err.message);
  }
}

analyze().catch(console.error);
