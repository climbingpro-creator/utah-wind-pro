/**
 * Deer Creek Historical Analysis Script
 * 
 * Correlates data from:
 * - UTDCD (Deer Creek Dam UDOT) - Ground truth for thermal (replaced dead DCC)
 * - UTLPC (Lower Provo Canyon UDOT) - Canyon draw indicator (replaced dead SND)
 * - KHCR (Heber Valley Airport) - Valley reference
 * 
 * Goal: Find patterns that predict good Deer Creek thermals
 */

import https from 'https';

const TOKEN = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
if (!TOKEN) { console.error('Set SYNOPTIC_TOKEN env var'); process.exit(1); }
const STATIONS = ['UTDCD', 'UTLPC', 'KHCR'];

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
          const json = JSON.parse(data);
          resolve(json);
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
  // Convert UTC to Mountain Time (UTC-6 or UTC-7)
  const utcHour = date.getUTCHours();
  return (utcHour - 6 + 24) % 24; // MDT approximation
}

async function analyzeMonth(year, month) {
  const startDate = `${year}${String(month).padStart(2, '0')}010000`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}${String(month).padStart(2, '0')}${endDay}2359`;
  
  console.log(`\nFetching ${year}-${String(month).padStart(2, '0')}...`);
  
  const results = {};
  
  for (const stid of STATIONS) {
    try {
      const data = await fetchData(stid, startDate, endDate);
      if (data.STATION && data.STATION[0]) {
        results[stid] = parseObservations(data.STATION[0]);
        console.log(`  ${stid}: ${results[stid].length} observations`);
      }
    } catch (e) {
      console.log(`  ${stid}: Error - ${e.message}`);
    }
  }
  
  return results;
}

function analyzeCorrelations(data) {
  const dcc = data.UTDCD || [];
  const snd = data.UTLPC || [];
  const khcr = data.KHCR || [];
  
  if (dcc.length === 0) {
    console.log('No UTDCD data available');
    return null;
  }
  
  // Create time-indexed maps for SND and KHCR
  const sndMap = new Map();
  const khcrMap = new Map();
  
  snd.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16); // Round to minute
    sndMap.set(key, obs);
  });
  
  khcr.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16);
    khcrMap.set(key, obs);
  });
  
  // Analyze DCC thermal events
  const thermalEvents = [];
  const hourlyStats = {};
  
  for (let h = 0; h < 24; h++) {
    hourlyStats[h] = { total: 0, thermal: 0, avgSpeed: 0, speeds: [] };
  }
  
  dcc.forEach(obs => {
    const hour = getLocalHour(obs.time);
    hourlyStats[hour].total++;
    
    if (isThermalCondition(obs)) {
      hourlyStats[hour].thermal++;
      hourlyStats[hour].speeds.push(obs.speed);
      
      // Find corresponding SND and KHCR data
      const key = obs.time.toISOString().slice(0, 16);
      const sndObs = sndMap.get(key);
      const khcrObs = khcrMap.get(key);
      
      // Also check 1-2 hours before
      const key1h = new Date(obs.time.getTime() - 60*60*1000).toISOString().slice(0, 16);
      const key2h = new Date(obs.time.getTime() - 2*60*60*1000).toISOString().slice(0, 16);
      const snd1h = sndMap.get(key1h);
      const snd2h = sndMap.get(key2h);
      const khcr1h = khcrMap.get(key1h);
      const khcr2h = khcrMap.get(key2h);
      
      thermalEvents.push({
        time: obs.time,
        hour,
        dcc: obs,
        snd: sndObs,
        khcr: khcrObs,
        snd1h,
        snd2h,
        khcr1h,
        khcr2h,
        tempDelta: sndObs && obs.temp ? obs.temp - sndObs.temp : null,
        tempDelta1h: snd1h && khcr1h ? khcr1h.temp - snd1h.temp : null,
      });
    }
  });
  
  // Calculate hourly averages
  for (let h = 0; h < 24; h++) {
    if (hourlyStats[h].speeds.length > 0) {
      hourlyStats[h].avgSpeed = hourlyStats[h].speeds.reduce((a, b) => a + b, 0) / hourlyStats[h].speeds.length;
    }
  }
  
  return { thermalEvents, hourlyStats };
}

function printAnalysis(analysis, monthLabel) {
  if (!analysis) return;
  
  const { thermalEvents, hourlyStats } = analysis;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEER CREEK ANALYSIS - ${monthLabel}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\nTotal thermal events (S wind 160-220°, 4-15 mph): ${thermalEvents.length}`);
  
  console.log(`\nHOURLY DISTRIBUTION (Local Time):`);
  console.log(`Hour | Total Obs | Thermal | Rate  | Avg Speed`);
  console.log(`-----|-----------|---------|-------|----------`);
  
  for (let h = 6; h <= 20; h++) {
    const stats = hourlyStats[h];
    const rate = stats.total > 0 ? ((stats.thermal / stats.total) * 100).toFixed(1) : '0.0';
    const avgSpd = stats.avgSpeed > 0 ? stats.avgSpeed.toFixed(1) : '-';
    console.log(`${String(h).padStart(4)} | ${String(stats.total).padStart(9)} | ${String(stats.thermal).padStart(7)} | ${rate.padStart(4)}% | ${avgSpd.padStart(8)} mph`);
  }
  
  // Analyze temperature deltas during thermal events
  const deltasWithData = thermalEvents.filter(e => e.tempDelta != null);
  if (deltasWithData.length > 0) {
    const avgDelta = deltasWithData.reduce((sum, e) => sum + e.tempDelta, 0) / deltasWithData.length;
    console.log(`\nTEMPERATURE CORRELATION:`);
    console.log(`Average DCC-SND temp delta during thermals: ${avgDelta.toFixed(1)}°F`);
    console.log(`(Positive = DCC warmer than Arrowhead)`);
  }
  
  // Analyze 1-2 hour lead indicators
  const leadIndicators = thermalEvents.filter(e => e.snd1h && e.khcr1h);
  if (leadIndicators.length > 0) {
    console.log(`\nLEAD INDICATORS (1-2 hours before thermal):`);
    
    // SND wind direction 1h before
    const sndDirs1h = leadIndicators.filter(e => e.snd1h?.direction != null).map(e => e.snd1h.direction);
    if (sndDirs1h.length > 0) {
      const avgSndDir = sndDirs1h.reduce((a, b) => a + b, 0) / sndDirs1h.length;
      console.log(`  Arrowhead wind direction 1h before: avg ${avgSndDir.toFixed(0)}°`);
    }
    
    // KHCR temp 1h before
    const khcrTemps1h = leadIndicators.filter(e => e.khcr1h?.temp != null).map(e => e.khcr1h.temp);
    if (khcrTemps1h.length > 0) {
      const avgKhcrTemp = khcrTemps1h.reduce((a, b) => a + b, 0) / khcrTemps1h.length;
      console.log(`  Heber Airport temp 1h before: avg ${avgKhcrTemp.toFixed(1)}°F`);
    }
    
    // Temperature delta 1h before
    const deltas1h = leadIndicators.filter(e => e.tempDelta1h != null).map(e => e.tempDelta1h);
    if (deltas1h.length > 0) {
      const avgDelta1h = deltas1h.reduce((a, b) => a + b, 0) / deltas1h.length;
      console.log(`  Heber-Arrowhead temp delta 1h before: avg ${avgDelta1h.toFixed(1)}°F`);
    }
  }
  
  // Find best thermal days
  const dayMap = new Map();
  thermalEvents.forEach(e => {
    const dayKey = e.time.toISOString().slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { count: 0, maxSpeed: 0, peakHour: null });
    }
    const day = dayMap.get(dayKey);
    day.count++;
    if (e.dcc.speed > day.maxSpeed) {
      day.maxSpeed = e.dcc.speed;
      day.peakHour = e.hour;
    }
  });
  
  const goodDays = Array.from(dayMap.entries())
    .filter(([_unused, d]) => d.count >= 6) // At least 1 hour of thermal
    .sort((a, b) => b[1].maxSpeed - a[1].maxSpeed);
  
  if (goodDays.length > 0) {
    console.log(`\nBEST THERMAL DAYS (6+ thermal readings):`);
    goodDays.slice(0, 10).forEach(([date, d]) => {
      console.log(`  ${date}: ${d.count} readings, peak ${d.maxSpeed.toFixed(1)} mph at ${d.peakHour}:00`);
    });
    console.log(`\nTotal good thermal days: ${goodDays.length}`);
  }
}

async function main() {
  console.log('DEER CREEK HISTORICAL ANALYSIS');
  console.log('Correlating: DCC (Dam), SND (Arrowhead), KHCR (Heber Airport)');
  console.log('Looking for patterns that predict good South thermals\n');
  
  // Analyze summer months (best thermal season)
  const months = [
    { year: 2025, month: 6, label: 'June 2025' },
    { year: 2025, month: 7, label: 'July 2025' },
    { year: 2025, month: 8, label: 'August 2025' },
  ];
  
  const allEvents = [];
  const allHourlyStats = {};
  for (let h = 0; h < 24; h++) {
    allHourlyStats[h] = { total: 0, thermal: 0, avgSpeed: 0, speeds: [] };
  }
  
  for (const { year, month, label } of months) {
    const data = await analyzeMonth(year, month);
    const analysis = analyzeCorrelations(data);
    printAnalysis(analysis, label);
    
    if (analysis) {
      allEvents.push(...analysis.thermalEvents);
      for (let h = 0; h < 24; h++) {
        allHourlyStats[h].total += analysis.hourlyStats[h].total;
        allHourlyStats[h].thermal += analysis.hourlyStats[h].thermal;
        allHourlyStats[h].speeds.push(...analysis.hourlyStats[h].speeds);
      }
    }
  }
  
  // Calculate combined averages
  for (let h = 0; h < 24; h++) {
    if (allHourlyStats[h].speeds.length > 0) {
      allHourlyStats[h].avgSpeed = allHourlyStats[h].speeds.reduce((a, b) => a + b, 0) / allHourlyStats[h].speeds.length;
    }
  }
  
  printAnalysis({ thermalEvents: allEvents, hourlyStats: allHourlyStats }, 'SUMMER 2025 COMBINED');
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('KEY FINDINGS FOR DEER CREEK PREDICTION MODEL');
  console.log(`${'='.repeat(60)}`);
  
  // Find peak hours
  const peakHours = Object.entries(allHourlyStats)
    .filter(([_h, s]) => s.thermal > 0)
    .sort((a, b) => b[1].thermal - a[1].thermal)
    .slice(0, 5);
  
  if (peakHours.length > 0) {
    console.log(`\nPeak thermal hours (local time): ${peakHours.map(([h]) => h + ':00').join(', ')}`);
  }
  
  // Success rate
  const totalObs = Object.values(allHourlyStats).reduce((sum, s) => sum + s.total, 0);
  const totalThermal = Object.values(allHourlyStats).reduce((sum, s) => sum + s.thermal, 0);
  console.log(`Overall thermal success rate: ${((totalThermal / totalObs) * 100).toFixed(1)}%`);
  console.log(`Total thermal observations: ${totalThermal}`);
}

main().catch(console.error);
