/**
 * Weather Pattern Analysis for Prediction
 * 
 * Goal: Find weather patterns that predict good thermal days
 * - What conditions the day BEFORE predict tomorrow's thermal?
 * - What morning conditions predict afternoon thermal?
 * - What 1-2 hour lead indicators predict imminent thermal?
 */

import https from 'https';

const TOKEN = 'e76aae18d1cf4e9a959d1a8cd15651c7';

// Thermal criteria
const UTAH_LAKE_THERMAL = {
  direction: { min: 100, max: 180 },
  speed: { min: 8, max: 20 },
};

const DEER_CREEK_THERMAL = {
  direction: { min: 160, max: 220 },
  speed: { min: 4, max: 15 },
};

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter,relative_humidity&units=english&token=${TOKEN}`;
    
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
  const pressure = obs.altimeter_set_1 || [];
  const humidity = obs.relative_humidity_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressure[i],
    humidity: humidity[i],
  }));
}

function getLocalHour(date) {
  return (date.getUTCHours() - 6 + 24) % 24;
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isThermal(obs, criteria) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= criteria.direction.min &&
         obs.direction <= criteria.direction.max &&
         obs.speed >= criteria.speed.min &&
         obs.speed <= criteria.speed.max;
}

async function analyzePatterns() {
  console.log('WEATHER PATTERN ANALYSIS FOR PREDICTION');
  console.log('='.repeat(70));
  
  // Fetch 3 months of data
  const start = '202506010000';
  const end = '202508310000';
  
  console.log('\nFetching Summer 2025 data...');
  
  // Utah Lake stations
  const [fpsData, kslcData, kpvuData] = await Promise.all([
    fetchData('FPS', start, end),
    fetchData('KSLC', start, end),
    fetchData('KPVU', start, end),
  ]);
  
  const fps = parseObservations(fpsData.STATION?.[0]);
  const kslc = parseObservations(kslcData.STATION?.[0]);
  const kpvu = parseObservations(kpvuData.STATION?.[0]);
  
  console.log(`FPS: ${fps.length} observations`);
  console.log(`KSLC: ${kslc.length} observations`);
  console.log(`KPVU: ${kpvu.length} observations`);
  
  // Create time-indexed maps
  const kslcMap = new Map();
  const kpvuMap = new Map();
  
  kslc.forEach(obs => {
    kslcMap.set(obs.time.toISOString().slice(0, 16), obs);
  });
  kpvu.forEach(obs => {
    kpvuMap.set(obs.time.toISOString().slice(0, 16), obs);
  });
  
  // Identify thermal days at FPS
  const dailyData = new Map();
  
  fps.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getLocalHour(obs.time);
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        date: dateKey,
        observations: [],
        thermalCount: 0,
        maxSpeed: 0,
        peakHour: null,
        hasThermal: false,
      });
    }
    
    const day = dailyData.get(dateKey);
    day.observations.push({ ...obs, hour });
    
    if (isThermal(obs, UTAH_LAKE_THERMAL)) {
      day.thermalCount++;
      if (obs.speed > day.maxSpeed) {
        day.maxSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
  });
  
  // Mark thermal days (at least 1 hour of thermal = 6 readings)
  dailyData.forEach(day => {
    day.hasThermal = day.thermalCount >= 6;
  });
  
  const thermalDays = Array.from(dailyData.values()).filter(d => d.hasThermal);
  const nonThermalDays = Array.from(dailyData.values()).filter(d => !d.hasThermal);
  
  console.log(`\nThermal days: ${thermalDays.length}`);
  console.log(`Non-thermal days: ${nonThermalDays.length}`);
  
  // ============================================
  // ANALYSIS 1: Day-Before Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('DAY-BEFORE PATTERNS (for next-day prediction)');
  console.log('='.repeat(70));
  
  const dayBeforePatterns = { thermal: [], nonThermal: [] };
  
  thermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyData.get(prevKey);
    
    if (prevDay) {
      // Get evening conditions (6 PM - 9 PM) from day before
      const eveningObs = prevDay.observations.filter(o => o.hour >= 18 && o.hour <= 21);
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / eveningObs.length;
        
        // Get pressure gradient from evening before
        const eveningTime = eveningObs[0]?.time;
        if (eveningTime) {
          const key = eveningTime.toISOString().slice(0, 16);
          const slc = kslcMap.get(key);
          const pvu = kpvuMap.get(key);
          const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
          
          dayBeforePatterns.thermal.push({
            date: day.date,
            eveningTemp: avgTemp,
            eveningSpeed: avgSpeed,
            eveningGradient: gradient,
          });
        }
      }
    }
  });
  
  nonThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyData.get(prevKey);
    
    if (prevDay) {
      const eveningObs = prevDay.observations.filter(o => o.hour >= 18 && o.hour <= 21);
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / eveningObs.length;
        
        const eveningTime = eveningObs[0]?.time;
        if (eveningTime) {
          const key = eveningTime.toISOString().slice(0, 16);
          const slc = kslcMap.get(key);
          const pvu = kpvuMap.get(key);
          const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
          
          dayBeforePatterns.nonThermal.push({
            date: day.date,
            eveningTemp: avgTemp,
            eveningSpeed: avgSpeed,
            eveningGradient: gradient,
          });
        }
      }
    }
  });
  
  // Calculate averages
  if (dayBeforePatterns.thermal.length > 0) {
    const avgTemp = dayBeforePatterns.thermal.reduce((sum, p) => sum + p.eveningTemp, 0) / dayBeforePatterns.thermal.length;
    const avgSpeed = dayBeforePatterns.thermal.reduce((sum, p) => sum + p.eveningSpeed, 0) / dayBeforePatterns.thermal.length;
    const gradients = dayBeforePatterns.thermal.filter(p => p.eveningGradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.eveningGradient, 0) / gradients.length : null;
    
    console.log(`\nEVENING BEFORE a thermal day (6-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient (SLC-PVU): ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${dayBeforePatterns.thermal.length} days`);
  }
  
  if (dayBeforePatterns.nonThermal.length > 0) {
    const avgTemp = dayBeforePatterns.nonThermal.reduce((sum, p) => sum + p.eveningTemp, 0) / dayBeforePatterns.nonThermal.length;
    const avgSpeed = dayBeforePatterns.nonThermal.reduce((sum, p) => sum + p.eveningSpeed, 0) / dayBeforePatterns.nonThermal.length;
    const gradients = dayBeforePatterns.nonThermal.filter(p => p.eveningGradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.eveningGradient, 0) / gradients.length : null;
    
    console.log(`\nEVENING BEFORE a NON-thermal day:`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient (SLC-PVU): ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${dayBeforePatterns.nonThermal.length} days`);
  }
  
  // ============================================
  // ANALYSIS 2: Morning Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('MORNING PATTERNS (for same-day prediction)');
  console.log('='.repeat(70));
  
  const morningPatterns = { thermal: [], nonThermal: [] };
  
  thermalDays.forEach(day => {
    // Get morning conditions (6 AM - 9 AM)
    const morningObs = day.observations.filter(o => o.hour >= 6 && o.hour <= 9);
    if (morningObs.length > 0) {
      const avgTemp = morningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / morningObs.length;
      const avgSpeed = morningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / morningObs.length;
      const avgDir = morningObs.filter(o => o.direction != null).reduce((sum, o) => sum + o.direction, 0) / morningObs.filter(o => o.direction != null).length;
      
      // Get morning pressure gradient
      const morningTime = morningObs[Math.floor(morningObs.length / 2)]?.time;
      if (morningTime) {
        const key = morningTime.toISOString().slice(0, 16);
        const slc = kslcMap.get(key);
        const pvu = kpvuMap.get(key);
        const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
        
        morningPatterns.thermal.push({
          date: day.date,
          temp: avgTemp,
          speed: avgSpeed,
          direction: avgDir,
          gradient,
          peakHour: day.peakHour,
          maxSpeed: day.maxSpeed,
        });
      }
    }
  });
  
  nonThermalDays.forEach(day => {
    const morningObs = day.observations.filter(o => o.hour >= 6 && o.hour <= 9);
    if (morningObs.length > 0) {
      const avgTemp = morningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / morningObs.length;
      const avgSpeed = morningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / morningObs.length;
      
      const morningTime = morningObs[Math.floor(morningObs.length / 2)]?.time;
      if (morningTime) {
        const key = morningTime.toISOString().slice(0, 16);
        const slc = kslcMap.get(key);
        const pvu = kpvuMap.get(key);
        const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
        
        morningPatterns.nonThermal.push({
          date: day.date,
          temp: avgTemp,
          speed: avgSpeed,
          gradient,
        });
      }
    }
  });
  
  if (morningPatterns.thermal.length > 0) {
    const avgTemp = morningPatterns.thermal.reduce((sum, p) => sum + p.temp, 0) / morningPatterns.thermal.length;
    const avgSpeed = morningPatterns.thermal.reduce((sum, p) => sum + p.speed, 0) / morningPatterns.thermal.length;
    const avgDir = morningPatterns.thermal.filter(p => p.direction).reduce((sum, p) => sum + p.direction, 0) / morningPatterns.thermal.filter(p => p.direction).length;
    const gradients = morningPatterns.thermal.filter(p => p.gradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.gradient, 0) / gradients.length : null;
    
    console.log(`\nMORNING of thermal days (6-9 AM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph from ${avgDir?.toFixed(0) || 'N/A'}°`);
    console.log(`  Average pressure gradient: ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${morningPatterns.thermal.length} days`);
  }
  
  if (morningPatterns.nonThermal.length > 0) {
    const avgTemp = morningPatterns.nonThermal.reduce((sum, p) => sum + p.temp, 0) / morningPatterns.nonThermal.length;
    const avgSpeed = morningPatterns.nonThermal.reduce((sum, p) => sum + p.speed, 0) / morningPatterns.nonThermal.length;
    const gradients = morningPatterns.nonThermal.filter(p => p.gradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.gradient, 0) / gradients.length : null;
    
    console.log(`\nMORNING of NON-thermal days:`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient: ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${morningPatterns.nonThermal.length} days`);
  }
  
  // ============================================
  // ANALYSIS 3: Pressure Gradient Thresholds
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT ANALYSIS');
  console.log('='.repeat(70));
  
  // Analyze morning gradient vs thermal success
  const gradientBuckets = [
    { min: -0.10, max: -0.05, thermal: 0, total: 0 },
    { min: -0.05, max: -0.02, thermal: 0, total: 0 },
    { min: -0.02, max: 0, thermal: 0, total: 0 },
    { min: 0, max: 0.02, thermal: 0, total: 0 },
    { min: 0.02, max: 0.05, thermal: 0, total: 0 },
    { min: 0.05, max: 0.10, thermal: 0, total: 0 },
  ];
  
  morningPatterns.thermal.forEach(p => {
    if (p.gradient != null) {
      const bucket = gradientBuckets.find(b => p.gradient >= b.min && p.gradient < b.max);
      if (bucket) {
        bucket.thermal++;
        bucket.total++;
      }
    }
  });
  
  morningPatterns.nonThermal.forEach(p => {
    if (p.gradient != null) {
      const bucket = gradientBuckets.find(b => p.gradient >= b.min && p.gradient < b.max);
      if (bucket) {
        bucket.total++;
      }
    }
  });
  
  console.log('\nMorning pressure gradient (SLC-PVU) vs thermal probability:');
  console.log('Gradient Range | Thermal Rate | Sample');
  console.log('---------------|--------------|-------');
  
  gradientBuckets.forEach(b => {
    const rate = b.total > 0 ? ((b.thermal / b.total) * 100).toFixed(1) : '0.0';
    console.log(`${b.min.toFixed(2)} to ${b.max.toFixed(2)} | ${rate.padStart(10)}% | ${b.total}`);
  });
  
  // ============================================
  // SUMMARY: Prediction Rules
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PREDICTION RULES SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`
DAY-BEFORE PREDICTION (Evening 6-9 PM):
  - Check pressure gradient trend
  - Light winds (<5 mph) in evening = good sign
  - Gradient moving negative = thermal likely tomorrow

MORNING PREDICTION (6-9 AM):
  - Pressure gradient < 0 (Provo higher than SLC) = thermal likely
  - Morning temp warming rapidly = thermal pump starting
  - Light variable winds = thermal will develop

1-HOUR PREDICTION:
  - SE wind starting to build = thermal imminent
  - Speed increasing through 5-8 mph = peak coming
  - Direction stabilizing at 140-160° = optimal thermal
`);

  // Best thermal days details
  console.log('\n' + '='.repeat(70));
  console.log('BEST THERMAL DAYS - DETAILED PATTERNS');
  console.log('='.repeat(70));
  
  const bestDays = thermalDays
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 10);
  
  console.log('\nTop 10 thermal days:');
  bestDays.forEach(day => {
    const morning = morningPatterns.thermal.find(p => p.date === day.date);
    console.log(`\n${day.date}:`);
    console.log(`  Peak: ${day.maxSpeed.toFixed(1)} mph at ${day.peakHour}:00`);
    console.log(`  Thermal readings: ${day.thermalCount}`);
    if (morning) {
      console.log(`  Morning temp: ${morning.temp.toFixed(1)}°F`);
      console.log(`  Morning gradient: ${morning.gradient?.toFixed(3) || 'N/A'} inHg`);
    }
  });
}

analyzePatterns().catch(console.error);
