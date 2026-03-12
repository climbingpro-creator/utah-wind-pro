/**
 * ZIG ZAG STATION HISTORICAL ANALYSIS
 * 
 * Analyzes 3 years of actual wind data from your Ambient Weather station
 * to find patterns for multi-day prediction.
 * 
 * Goals:
 * 1. Identify all "good wind" days (SE thermal and North flow)
 * 2. Correlate with MesoWest stations (FPS, KSLC, KPVU)
 * 3. Find 3-5 day lead indicators
 * 4. Build prediction rules
 */

import fs from 'fs';
import https from 'https';
import path from 'path';

const TOKEN = 'e76aae18d1cf4e9a959d1a8cd15651c7';

// Wind criteria for kiting/sailing
const WIND_CRITERIA = {
  // SE Thermal - classic Utah Lake thermal
  seThermal: {
    direction: { min: 100, max: 180 },
    speed: { min: 10, max: 25 },
    name: 'SE Thermal',
  },
  // North Flow - prefrontal/gap wind
  northFlow: {
    direction: { min: 315, max: 360, min2: 0, max2: 45 },
    speed: { min: 12, max: 30 },
    name: 'North Flow',
  },
};

// Parse CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/"/g, '').trim();
    });
    
    // Parse key fields
    if (row['Date']) {
      row.timestamp = new Date(row['Date']);
      row.windSpeed = parseFloat(row['Wind Speed (mph)']) || 0;
      row.windGust = parseFloat(row['Wind Gust (mph)']) || 0;
      row.windDirection = parseFloat(row['Wind Direction (°)']) || 0;
      row.temperature = parseFloat(row['Outside temperature Temperature (°F)']) || 0;
      row.pressure = parseFloat(row['Relative Pressure (inHg)']) || 0;
      data.push(row);
    }
  }
  
  return data;
}

// Check if wind matches criteria
function matchesCriteria(obs, criteria) {
  if (obs.windSpeed < criteria.speed.min || obs.windSpeed > criteria.speed.max) {
    return false;
  }
  
  // Handle wrap-around for north
  if (criteria.direction.min2 !== undefined) {
    return (obs.windDirection >= criteria.direction.min && obs.windDirection <= criteria.direction.max) ||
           (obs.windDirection >= criteria.direction.min2 && obs.windDirection <= criteria.direction.max2);
  }
  
  return obs.windDirection >= criteria.direction.min && obs.windDirection <= criteria.direction.max;
}

// Get date key
function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Get hour
function getHour(date) {
  return date.getHours();
}

// Fetch MesoWest data
async function fetchMesoWest(stid, start, end) {
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

async function analyze() {
  console.log('ZIG ZAG STATION - 3 YEAR HISTORICAL ANALYSIS');
  console.log('='.repeat(70));
  
  // Read CSV file
  const csvPath = 'C:\\Users\\Admin\\Downloads\\AWN-483FDA542C6E-20230329-20260311.csv';
  console.log(`\nReading: ${csvPath}`);
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const data = parseCSV(content);
  
  console.log(`Total observations: ${data.length.toLocaleString()}`);
  console.log(`Date range: ${data[data.length-1].timestamp.toISOString().slice(0,10)} to ${data[0].timestamp.toISOString().slice(0,10)}`);
  
  // ============================================
  // STEP 1: Identify all good wind days
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: IDENTIFYING GOOD WIND DAYS');
  console.log('='.repeat(70));
  
  const dailyStats = new Map();
  
  data.forEach(obs => {
    const dateKey = getDateKey(obs.timestamp);
    const hour = getHour(obs.timestamp);
    
    if (!dailyStats.has(dateKey)) {
      dailyStats.set(dateKey, {
        date: dateKey,
        observations: [],
        seThermalCount: 0,
        northFlowCount: 0,
        maxSpeed: 0,
        maxGust: 0,
        peakHour: null,
        peakDirection: null,
        avgTemp: 0,
        avgPressure: 0,
        windType: null,
      });
    }
    
    const day = dailyStats.get(dateKey);
    day.observations.push(obs);
    
    if (obs.windSpeed > day.maxSpeed) {
      day.maxSpeed = obs.windSpeed;
      day.peakHour = hour;
      day.peakDirection = obs.windDirection;
    }
    if (obs.windGust > day.maxGust) {
      day.maxGust = obs.windGust;
    }
    
    if (matchesCriteria(obs, WIND_CRITERIA.seThermal)) {
      day.seThermalCount++;
    }
    if (matchesCriteria(obs, WIND_CRITERIA.northFlow)) {
      day.northFlowCount++;
    }
  });
  
  // Calculate daily averages and classify
  dailyStats.forEach(day => {
    if (day.observations.length > 0) {
      day.avgTemp = day.observations.reduce((s, o) => s + o.temperature, 0) / day.observations.length;
      day.avgPressure = day.observations.reduce((s, o) => s + o.pressure, 0) / day.observations.length;
    }
    
    // Classify day type (need at least 1 hour of good wind = 12 readings at 5-min intervals)
    if (day.seThermalCount >= 12) {
      day.windType = 'SE Thermal';
    } else if (day.northFlowCount >= 12) {
      day.windType = 'North Flow';
    }
  });
  
  const allDays = Array.from(dailyStats.values());
  const seThermalDays = allDays.filter(d => d.windType === 'SE Thermal');
  const northFlowDays = allDays.filter(d => d.windType === 'North Flow');
  
  console.log(`\nTotal days analyzed: ${allDays.length}`);
  console.log(`SE Thermal days: ${seThermalDays.length} (${(seThermalDays.length/allDays.length*100).toFixed(1)}%)`);
  console.log(`North Flow days: ${northFlowDays.length} (${(northFlowDays.length/allDays.length*100).toFixed(1)}%)`);
  
  // ============================================
  // STEP 2: Monthly and Seasonal Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: MONTHLY PATTERNS');
  console.log('='.repeat(70));
  
  const monthlyStats = {};
  for (let m = 1; m <= 12; m++) {
    monthlyStats[m] = { total: 0, seThermal: 0, northFlow: 0, avgMaxSpeed: 0, peakHours: [] };
  }
  
  allDays.forEach(day => {
    const month = parseInt(day.date.slice(5, 7));
    monthlyStats[month].total++;
    if (day.windType === 'SE Thermal') {
      monthlyStats[month].seThermal++;
      monthlyStats[month].avgMaxSpeed += day.maxSpeed;
      if (day.peakHour != null) monthlyStats[month].peakHours.push(day.peakHour);
    }
    if (day.windType === 'North Flow') {
      monthlyStats[month].northFlow++;
    }
  });
  
  console.log('\nMonth | Total | SE Thermal | North Flow | SE Rate | N Rate | Avg Peak');
  console.log('------|-------|------------|------------|---------|--------|----------');
  
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let m = 1; m <= 12; m++) {
    const ms = monthlyStats[m];
    const seRate = ms.total > 0 ? (ms.seThermal / ms.total * 100).toFixed(1) : '0.0';
    const nRate = ms.total > 0 ? (ms.northFlow / ms.total * 100).toFixed(1) : '0.0';
    const avgSpeed = ms.seThermal > 0 ? (ms.avgMaxSpeed / ms.seThermal).toFixed(1) : '--';
    const avgPeak = ms.peakHours.length > 0 
      ? (ms.peakHours.reduce((a,b) => a+b, 0) / ms.peakHours.length).toFixed(0) + ':00'
      : '--';
    
    console.log(`${monthNames[m].padEnd(5)} | ${String(ms.total).padStart(5)} | ${String(ms.seThermal).padStart(10)} | ${String(ms.northFlow).padStart(10)} | ${seRate.padStart(6)}% | ${nRate.padStart(5)}% | ${avgPeak}`);
  }
  
  // ============================================
  // STEP 3: Hourly Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: HOURLY PATTERNS (SE Thermal Days)');
  console.log('='.repeat(70));
  
  const hourlyWindSpeed = {};
  for (let h = 0; h < 24; h++) {
    hourlyWindSpeed[h] = { speeds: [], directions: [], count: 0 };
  }
  
  seThermalDays.forEach(day => {
    day.observations.forEach(obs => {
      const hour = getHour(obs.timestamp);
      if (matchesCriteria(obs, WIND_CRITERIA.seThermal)) {
        hourlyWindSpeed[hour].speeds.push(obs.windSpeed);
        hourlyWindSpeed[hour].directions.push(obs.windDirection);
        hourlyWindSpeed[hour].count++;
      }
    });
  });
  
  console.log('\nHour | Avg Speed | Avg Dir | Observations');
  console.log('-----|-----------|---------|-------------');
  
  for (let h = 6; h <= 20; h++) {
    const hs = hourlyWindSpeed[h];
    if (hs.speeds.length > 0) {
      const avgSpeed = (hs.speeds.reduce((a,b) => a+b, 0) / hs.speeds.length).toFixed(1);
      const avgDir = Math.round(hs.directions.reduce((a,b) => a+b, 0) / hs.directions.length);
      console.log(`${String(h).padStart(4)} | ${avgSpeed.padStart(9)} | ${String(avgDir).padStart(7)}° | ${hs.count}`);
    }
  }
  
  // ============================================
  // STEP 4: Day-Before Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: DAY-BEFORE PATTERNS');
  console.log('='.repeat(70));
  
  const dayBeforePatterns = { seThermal: [], northFlow: [], noWind: [] };
  
  seThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay) {
      // Get evening conditions (5-9 PM)
      const eveningObs = prevDay.observations.filter(o => {
        const h = getHour(o.timestamp);
        return h >= 17 && h <= 21;
      });
      
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((s, o) => s + o.temperature, 0) / eveningObs.length;
        const avgPressure = eveningObs.reduce((s, o) => s + o.pressure, 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((s, o) => s + o.windSpeed, 0) / eveningObs.length;
        
        dayBeforePatterns.seThermal.push({
          date: day.date,
          prevDate: prevKey,
          eveningTemp: avgTemp,
          eveningPressure: avgPressure,
          eveningSpeed: avgSpeed,
          nextDayMaxSpeed: day.maxSpeed,
          nextDayPeakHour: day.peakHour,
        });
      }
    }
  });
  
  // Same for north flow days
  northFlowDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay) {
      const eveningObs = prevDay.observations.filter(o => {
        const h = getHour(o.timestamp);
        return h >= 17 && h <= 21;
      });
      
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((s, o) => s + o.temperature, 0) / eveningObs.length;
        const avgPressure = eveningObs.reduce((s, o) => s + o.pressure, 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((s, o) => s + o.windSpeed, 0) / eveningObs.length;
        
        dayBeforePatterns.northFlow.push({
          date: day.date,
          prevDate: prevKey,
          eveningTemp: avgTemp,
          eveningPressure: avgPressure,
          eveningSpeed: avgSpeed,
          nextDayMaxSpeed: day.maxSpeed,
        });
      }
    }
  });
  
  if (dayBeforePatterns.seThermal.length > 0) {
    const avgTemp = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningTemp, 0) / dayBeforePatterns.seThermal.length;
    const avgPressure = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningPressure, 0) / dayBeforePatterns.seThermal.length;
    const avgSpeed = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningSpeed, 0) / dayBeforePatterns.seThermal.length;
    
    console.log(`\nEVENING BEFORE SE THERMAL DAY (5-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average pressure: ${avgPressure.toFixed(2)} inHg`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Sample size: ${dayBeforePatterns.seThermal.length} days`);
  }
  
  if (dayBeforePatterns.northFlow.length > 0) {
    const avgTemp = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningTemp, 0) / dayBeforePatterns.northFlow.length;
    const avgPressure = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningPressure, 0) / dayBeforePatterns.northFlow.length;
    const avgSpeed = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningSpeed, 0) / dayBeforePatterns.northFlow.length;
    
    console.log(`\nEVENING BEFORE NORTH FLOW DAY (5-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average pressure: ${avgPressure.toFixed(2)} inHg`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Sample size: ${dayBeforePatterns.northFlow.length} days`);
  }
  
  // ============================================
  // STEP 5: Multi-Day Patterns (3-5 days out)
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: MULTI-DAY PATTERNS (3-5 days before)');
  console.log('='.repeat(70));
  
  const multiDayPatterns = { 
    seThermal: { day1: [], day2: [], day3: [], day4: [], day5: [] },
    northFlow: { day1: [], day2: [], day3: [], day4: [], day5: [] }
  };
  
  // Analyze pressure trends leading up to good days
  seThermalDays.forEach(day => {
    for (let daysBack = 1; daysBack <= 5; daysBack++) {
      const prevDate = new Date(day.date);
      prevDate.setDate(prevDate.getDate() - daysBack);
      const prevKey = getDateKey(prevDate);
      const prevDay = dailyStats.get(prevKey);
      
      if (prevDay) {
        multiDayPatterns.seThermal[`day${daysBack}`].push({
          avgPressure: prevDay.avgPressure,
          avgTemp: prevDay.avgTemp,
          maxSpeed: prevDay.maxSpeed,
        });
      }
    }
  });
  
  northFlowDays.forEach(day => {
    for (let daysBack = 1; daysBack <= 5; daysBack++) {
      const prevDate = new Date(day.date);
      prevDate.setDate(prevDate.getDate() - daysBack);
      const prevKey = getDateKey(prevDate);
      const prevDay = dailyStats.get(prevKey);
      
      if (prevDay) {
        multiDayPatterns.northFlow[`day${daysBack}`].push({
          avgPressure: prevDay.avgPressure,
          avgTemp: prevDay.avgTemp,
          maxSpeed: prevDay.maxSpeed,
        });
      }
    }
  });
  
  console.log('\nPRESSURE TREND BEFORE SE THERMAL DAYS:');
  console.log('Days Before | Avg Pressure | Avg Temp | Avg Max Wind');
  console.log('------------|--------------|----------|-------------');
  
  for (let d = 5; d >= 1; d--) {
    const patterns = multiDayPatterns.seThermal[`day${d}`];
    if (patterns.length > 0) {
      const avgP = patterns.reduce((s, p) => s + p.avgPressure, 0) / patterns.length;
      const avgT = patterns.reduce((s, p) => s + p.avgTemp, 0) / patterns.length;
      const avgW = patterns.reduce((s, p) => s + p.maxSpeed, 0) / patterns.length;
      console.log(`${String(d).padStart(11)} | ${avgP.toFixed(2).padStart(12)} | ${avgT.toFixed(1).padStart(8)}°F | ${avgW.toFixed(1)} mph`);
    }
  }
  console.log(`          0 | (SE Thermal Day)`);
  
  console.log('\nPRESSURE TREND BEFORE NORTH FLOW DAYS:');
  console.log('Days Before | Avg Pressure | Avg Temp | Avg Max Wind');
  console.log('------------|--------------|----------|-------------');
  
  for (let d = 5; d >= 1; d--) {
    const patterns = multiDayPatterns.northFlow[`day${d}`];
    if (patterns.length > 0) {
      const avgP = patterns.reduce((s, p) => s + p.avgPressure, 0) / patterns.length;
      const avgT = patterns.reduce((s, p) => s + p.avgTemp, 0) / patterns.length;
      const avgW = patterns.reduce((s, p) => s + p.maxSpeed, 0) / patterns.length;
      console.log(`${String(d).padStart(11)} | ${avgP.toFixed(2).padStart(12)} | ${avgT.toFixed(1).padStart(8)}°F | ${avgW.toFixed(1)} mph`);
    }
  }
  console.log(`          0 | (North Flow Day)`);
  
  // ============================================
  // STEP 6: Best Days Analysis
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 6: BEST WIND DAYS (Top 20)');
  console.log('='.repeat(70));
  
  const bestDays = allDays
    .filter(d => d.maxSpeed >= 12)
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 20);
  
  console.log('\nDate       | Max Speed | Max Gust | Peak Hour | Direction | Type');
  console.log('-----------|-----------|----------|-----------|-----------|------------');
  
  bestDays.forEach(day => {
    const type = day.windType || 'Other';
    const dirLabel = day.peakDirection < 180 ? 'SE' : day.peakDirection > 270 ? 'N' : 'SW';
    console.log(`${day.date} | ${day.maxSpeed.toFixed(1).padStart(9)} | ${day.maxGust.toFixed(1).padStart(8)} | ${String(day.peakHour).padStart(9)}:00 | ${String(Math.round(day.peakDirection)).padStart(9)}° | ${type}`);
  });
  
  // ============================================
  // STEP 7: Pressure Change Analysis
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 7: PRESSURE CHANGE PATTERNS');
  console.log('='.repeat(70));
  
  // Calculate day-to-day pressure changes before good wind days
  const pressureChanges = { seThermal: [], northFlow: [] };
  
  seThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay && day.avgPressure > 0 && prevDay.avgPressure > 0) {
      pressureChanges.seThermal.push(day.avgPressure - prevDay.avgPressure);
    }
  });
  
  northFlowDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay && day.avgPressure > 0 && prevDay.avgPressure > 0) {
      pressureChanges.northFlow.push(day.avgPressure - prevDay.avgPressure);
    }
  });
  
  if (pressureChanges.seThermal.length > 0) {
    const avg = pressureChanges.seThermal.reduce((a,b) => a+b, 0) / pressureChanges.seThermal.length;
    const rising = pressureChanges.seThermal.filter(c => c > 0.02).length;
    const falling = pressureChanges.seThermal.filter(c => c < -0.02).length;
    const stable = pressureChanges.seThermal.length - rising - falling;
    
    console.log(`\nSE THERMAL DAYS - Pressure change from day before:`);
    console.log(`  Average change: ${avg > 0 ? '+' : ''}${avg.toFixed(3)} inHg`);
    console.log(`  Rising (>0.02): ${rising} days (${(rising/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
    console.log(`  Stable: ${stable} days (${(stable/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
    console.log(`  Falling (<-0.02): ${falling} days (${(falling/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
  }
  
  if (pressureChanges.northFlow.length > 0) {
    const avg = pressureChanges.northFlow.reduce((a,b) => a+b, 0) / pressureChanges.northFlow.length;
    const rising = pressureChanges.northFlow.filter(c => c > 0.02).length;
    const falling = pressureChanges.northFlow.filter(c => c < -0.02).length;
    const stable = pressureChanges.northFlow.length - rising - falling;
    
    console.log(`\nNORTH FLOW DAYS - Pressure change from day before:`);
    console.log(`  Average change: ${avg > 0 ? '+' : ''}${avg.toFixed(3)} inHg`);
    console.log(`  Rising (>0.02): ${rising} days (${(rising/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
    console.log(`  Stable: ${stable} days (${(stable/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
    console.log(`  Falling (<-0.02): ${falling} days (${(falling/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
  }
  
  // ============================================
  // SUMMARY: Prediction Rules
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PREDICTION RULES SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`
BASED ON 3 YEARS OF ZIG ZAG DATA:

SE THERMAL PREDICTION:
  - Best months: [Calculate from data]
  - Peak hours: [Calculate from data]
  - Day-before indicators:
    * Evening temp: [Calculate]
    * Evening pressure: [Calculate]
    * Pressure trend: [Calculate]

NORTH FLOW PREDICTION:
  - Best months: [Calculate from data]
  - Day-before indicators:
    * Falling pressure = front approaching
    * Cold front passage = strong north wind next day

MULTI-DAY FORECAST:
  - 5 days out: Watch for pressure pattern
  - 3 days out: Confirm pressure trend
  - 1 day out: Evening conditions confirm
  - Same day: Morning gradient check
`);

  // Output data for further analysis
  console.log('\n' + '='.repeat(70));
  console.log('DATA EXPORT');
  console.log('='.repeat(70));
  
  // Export best SE thermal days for correlation
  const seThermalExport = seThermalDays
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 50)
    .map(d => ({
      date: d.date,
      maxSpeed: d.maxSpeed,
      maxGust: d.maxGust,
      peakHour: d.peakHour,
      avgTemp: d.avgTemp.toFixed(1),
      avgPressure: d.avgPressure.toFixed(2),
    }));
  
  console.log('\nTop 50 SE Thermal Days (for MesoWest correlation):');
  console.log(JSON.stringify(seThermalExport.slice(0, 10), null, 2));
  console.log('... and', seThermalExport.length - 10, 'more');
  
  // Export for use in app
  const exportData = {
    seThermalDays: seThermalExport,
    northFlowDays: northFlowDays.slice(0, 50).map(d => ({
      date: d.date,
      maxSpeed: d.maxSpeed,
      peakHour: d.peakHour,
    })),
    monthlyStats: Object.entries(monthlyStats).map(([m, s]) => ({
      month: parseInt(m),
      seRate: s.total > 0 ? (s.seThermal / s.total * 100).toFixed(1) : 0,
      nRate: s.total > 0 ? (s.northFlow / s.total * 100).toFixed(1) : 0,
    })),
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'src', 'data', 'zigzag-historical.json'),
    JSON.stringify(exportData, null, 2)
  );
  console.log('\nExported to src/data/zigzag-historical.json');
}

analyze().catch(console.error);
