/**
 * SPANISH FORK CANYON CORRELATION ANALYSIS
 * 
 * Goal: Find if Spanish Fork Canyon wind patterns are early indicators
 * for Zig Zag thermals
 * 
 * Stations to analyze:
 * - KSPK - Spanish Fork Airport
 * - SPC - Spanish Fork Canyon
 * - MTMET - Spanish Fork Peak
 * - Compare with FPS (Flight Park) and your Zig Zag data
 */

import fs from 'fs';
import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }

// Stations to check
const STATIONS_TO_CHECK = [
  'KSPK',   // Spanish Fork Airport
  'SPC',    // Spanish Fork Canyon  
  'SFCU1',  // Spanish Fork Canyon Utah
  'MTMET',  // Spanish Fork Peak area
  'UT12',   // Utah County station
  'UTSPY',  // Spanish Fork
  'FPS',    // Flight Park South (known good indicator)
];

async function fetchStationInfo(stid) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?stid=${stid}&token=${TOKEN}`;
    
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

// Search for stations near Spanish Fork
async function searchStations() {
  return new Promise((resolve, reject) => {
    // Search for stations within 20 miles of Spanish Fork Canyon
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=40.077,-111.55,30&limit=50&token=${TOKEN}`;
    
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

// Check if wind matches SE thermal criteria
function isSEThermal(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= 100 && obs.direction <= 180 && obs.speed >= 8;
}

async function analyze() {
  console.log('SPANISH FORK CANYON - EARLY INDICATOR ANALYSIS');
  console.log('='.repeat(70));
  
  // First, search for all stations in the Spanish Fork area
  console.log('\nSearching for stations near Spanish Fork Canyon...\n');
  
  try {
    const searchResult = await searchStations();
    
    if (searchResult.STATION) {
      console.log('STATIONS FOUND NEAR SPANISH FORK:');
      console.log('-'.repeat(70));
      console.log('ID'.padEnd(12) + 'Name'.padEnd(35) + 'Elev (ft)'.padEnd(12) + 'Lat/Lng');
      console.log('-'.repeat(70));
      
      const stations = searchResult.STATION.sort((a, b) => 
        (a.ELEVATION || 0) - (b.ELEVATION || 0)
      );
      
      stations.forEach(s => {
        const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
        const lat = typeof s.LATITUDE === 'number' ? s.LATITUDE.toFixed(4) : '?';
        const lng = typeof s.LONGITUDE === 'number' ? s.LONGITUDE.toFixed(4) : '?';
        console.log(
          (s.STID || '?').padEnd(12) +
          (s.NAME || '?').substring(0, 34).padEnd(35) +
          String(elev).padEnd(12) +
          `${lat}, ${lng}`
        );
      });
      
      console.log(`\nTotal: ${stations.length} stations found`);
      
      // Pick the most relevant stations for analysis
      const relevantStations = stations.filter(s => 
        s.STID && (
          s.NAME?.toLowerCase().includes('spanish') ||
          s.NAME?.toLowerCase().includes('canyon') ||
          s.NAME?.toLowerCase().includes('fork') ||
          s.ELEVATION > 5000 // Higher elevation stations
        )
      );
      
      console.log(`\nRelevant stations for analysis: ${relevantStations.length}`);
      relevantStations.forEach(s => {
        console.log(`  - ${s.STID}: ${s.NAME} (${Math.round((s.ELEVATION || 0) * 3.28084)} ft)`);
      });
      
      // Now fetch data and correlate with FPS
      console.log('\n' + '='.repeat(70));
      console.log('CORRELATION ANALYSIS');
      console.log('='.repeat(70));
      
      // Get summer data
      const start = '202507010000';
      const end = '202507310000';
      
      console.log(`\nFetching July 2025 data for correlation...\n`);
      
      // Fetch FPS data as baseline
      const fpsData = await fetchData('FPS', start, end);
      const fps = parseObservations(fpsData.STATION?.[0]);
      console.log(`FPS (Flight Park): ${fps.length} observations`);
      
      // Identify thermal days at FPS
      const fpsDays = new Map();
      fps.forEach(obs => {
        const dateKey = getDateKey(obs.time);
        const hour = getHour(obs.time);
        
        if (!fpsDays.has(dateKey)) {
          fpsDays.set(dateKey, { thermalHours: new Set(), firstThermalHour: null });
        }
        
        if (isSEThermal(obs) && hour >= 6 && hour <= 18) {
          fpsDays.get(dateKey).thermalHours.add(hour);
          if (fpsDays.get(dateKey).firstThermalHour === null || hour < fpsDays.get(dateKey).firstThermalHour) {
            fpsDays.get(dateKey).firstThermalHour = hour;
          }
        }
      });
      
      const thermalDays = Array.from(fpsDays.entries())
        .filter(([_, d]) => d.thermalHours.size >= 2)
        .map(([date, d]) => ({ date, ...d }));
      
      console.log(`\nThermal days at FPS: ${thermalDays.length}`);
      
      // Now check each Spanish Fork area station
      for (const station of relevantStations.slice(0, 5)) {
        console.log(`\n--- Analyzing ${station.STID}: ${station.NAME} ---`);
        
        try {
          const stationData = await fetchData(station.STID, start, end);
          const obs = parseObservations(stationData.STATION?.[0]);
          
          if (obs.length === 0) {
            console.log('  No data available');
            continue;
          }
          
          console.log(`  ${obs.length} observations`);
          
          // Create hourly map
          const hourlyMap = new Map();
          obs.forEach(o => {
            const key = o.time.toISOString().slice(0, 13);
            hourlyMap.set(key, o);
          });
          
          // For each thermal day, check what this station showed 1-3 hours before
          let leadIndicators = [];
          
          thermalDays.forEach(day => {
            if (day.firstThermalHour === null) return;
            
            // Check 1, 2, 3 hours before thermal started at FPS
            for (let leadHours = 1; leadHours <= 3; leadHours++) {
              const checkHour = day.firstThermalHour - leadHours;
              if (checkHour < 5) continue;
              
              const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
              const key = checkDate.toISOString().slice(0, 13);
              const leadObs = hourlyMap.get(key);
              
              if (leadObs) {
                leadIndicators.push({
                  date: day.date,
                  leadHours,
                  thermalStartHour: day.firstThermalHour,
                  stationSpeed: leadObs.speed,
                  stationDir: leadObs.direction,
                  stationTemp: leadObs.temp,
                });
              }
            }
          });
          
          if (leadIndicators.length > 0) {
            // Analyze patterns
            const avgSpeed = leadIndicators.reduce((s, i) => s + (i.stationSpeed || 0), 0) / leadIndicators.length;
            const avgDir = leadIndicators.filter(i => i.stationDir).reduce((s, i) => s + i.stationDir, 0) / leadIndicators.filter(i => i.stationDir).length;
            
            console.log(`\n  LEAD INDICATOR PATTERNS (before FPS thermal):`);
            console.log(`  Samples: ${leadIndicators.length}`);
            console.log(`  Avg wind speed: ${avgSpeed.toFixed(1)} mph`);
            console.log(`  Avg direction: ${avgDir?.toFixed(0) || 'N/A'}°`);
            
            // Direction distribution
            const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
            leadIndicators.forEach(i => {
              if (i.stationDir == null) return;
              const d = i.stationDir;
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
              const pct = (count / leadIndicators.length * 100).toFixed(0);
              if (count > 0) {
                console.log(`    ${dir}: ${count} (${pct}%)`);
              }
            });
            
            // Speed distribution
            const speedBuckets = { '0-5': 0, '5-10': 0, '10-15': 0, '15-20': 0, '20+': 0 };
            leadIndicators.forEach(i => {
              if (i.stationSpeed == null) return;
              if (i.stationSpeed < 5) speedBuckets['0-5']++;
              else if (i.stationSpeed < 10) speedBuckets['5-10']++;
              else if (i.stationSpeed < 15) speedBuckets['10-15']++;
              else if (i.stationSpeed < 20) speedBuckets['15-20']++;
              else speedBuckets['20+']++;
            });
            
            console.log(`  Speed distribution:`);
            Object.entries(speedBuckets).forEach(([range, count]) => {
              const pct = (count / leadIndicators.length * 100).toFixed(0);
              if (count > 0) {
                console.log(`    ${range} mph: ${count} (${pct}%)`);
              }
            });
          }
          
        } catch (err) {
          console.log(`  Error: ${err.message}`);
        }
      }
      
    } else {
      console.log('No stations found');
    }
    
  } catch (err) {
    console.error('Search error:', err.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
}

analyze().catch(console.error);
