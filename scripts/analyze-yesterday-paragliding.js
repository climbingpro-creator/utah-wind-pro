import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// All stations relevant to Point of the Mountain paragliding
const STATIONS = {
  // Primary paragliding stations
  'FPS': 'Flight Park South',
  'UTALP': 'Point of the Mountain (North)',
  
  // North flow indicators
  'KSLC': 'Salt Lake City Airport',
  'UTOLY': 'Salt Lake City (Murray)',
  
  // South flow / pressure indicators
  'KPVU': 'Provo Municipal Airport',
  
  // Nearby reference
  'QLN': 'Lindon',
  'QSF': 'Spanish Fork',
  
  // Great Salt Lake indicators
  'KU42': 'Salt Lake City Airport 2',
};

async function fetchYesterdayData() {
  // Yesterday's time range (full day, UTC)
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Set to yesterday 12:00 UTC (6 AM MDT) through today 06:00 UTC (midnight MDT)
  const start = new Date(yesterday);
  start.setUTCHours(12, 0, 0, 0); // 6 AM MDT
  
  const end = new Date(now);
  end.setUTCHours(6, 0, 0, 0); // Midnight MDT
  
  // Format as YYYYMMDDHHmm
  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}${m}${day}${h}${min}`;
  };
  const startStr = fmt(start);
  const endStr = fmt(end);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PARAGLIDING ANALYSIS: Yesterday's Wind Data`);
  console.log(`Query period: ${start.toLocaleString('en-US', {timeZone: 'America/Denver'})} to ${end.toLocaleString('en-US', {timeZone: 'America/Denver'})} MDT`);
  console.log(`${'='.repeat(80)}\n`);
  
  const stationIds = Object.keys(STATIONS).join(',');
  
  try {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stids=${stationIds}&start=${startStr}&end=${endStr}&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure&units=english,speed|mph,temp|F,pres|mb&token=${SYNOPTIC_TOKEN}`;
    
    console.log('Fetching data from Synoptic API...\n');
    const response = await axios.get(url, { timeout: 30000 });
    
    if (response.data.SUMMARY?.RESPONSE_CODE !== 1) {
      console.log('API Error:', response.data.SUMMARY?.RESPONSE_MESSAGE);
      return;
    }
    
    const stations = response.data.STATION || [];
    console.log(`Received data for ${stations.length} stations\n`);
    
    // Process each station
    const allData = {};
    
    for (const station of stations) {
      const stid = station.STID;
      const name = STATIONS[stid] || station.NAME;
      const obs = station.OBSERVATIONS || {};
      
      const times = obs.date_time || [];
      const speeds = obs.wind_speed_set_1 || [];
      const dirs = obs.wind_direction_set_1 || [];
      const gusts = obs.wind_gust_set_1 || [];
      const temps = obs.air_temp_set_1 || [];
      const pressures = obs.pressure_set_1 || obs.sea_level_pressure_set_1 || [];
      
      allData[stid] = { name, times, speeds, dirs, gusts, temps, pressures };
      
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📍 ${stid} - ${name}`);
      console.log(`   Lat: ${station.LATITUDE}, Lon: ${station.LONGITUDE}, Elev: ${station.ELEVATION} ft`);
      console.log(`${'─'.repeat(70)}`);
      
      if (times.length === 0) {
        console.log('   No data available');
        continue;
      }
      
      // Focus on afternoon/evening hours (2 PM - 9 PM MDT = 20:00 - 03:00 UTC)
      console.log('\n   AFTERNOON/EVENING DATA (2 PM - 9 PM MDT):');
      console.log('   Time (MDT)    | Wind (mph) | Dir (°) | Gust | Temp (°F)');
      console.log('   ' + '-'.repeat(62));
      
      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24; // Convert UTC to MDT
        
        // Show afternoon/evening hours (2 PM - 9 PM)
        if (mdtHour >= 14 && mdtHour <= 21) {
          const timeStr = t.toLocaleString('en-US', { 
            timeZone: 'America/Denver', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          const speed = speeds[i]?.toFixed(1) || '--';
          const dir = dirs[i]?.toFixed(0) || '--';
          const gust = gusts[i]?.toFixed(0) || '--';
          const temp = temps[i]?.toFixed(1) || '--';
          
          // Direction as cardinal
          const cardinal = getCardinal(dirs[i]);
          
          console.log(`   ${timeStr.padEnd(16)} | ${speed.padStart(6)} mph | ${dir.padStart(5)}° ${cardinal.padStart(3)} | ${gust.padStart(4)} | ${temp}°F`);
        }
      }
      
      // Find peak evening wind
      let peakSpeed = 0;
      let peakDir = 0;
      let peakTime = '';
      
      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20 && speeds[i] > peakSpeed) {
          peakSpeed = speeds[i];
          peakDir = dirs[i];
          peakTime = t.toLocaleString('en-US', { 
            timeZone: 'America/Denver', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        }
      }
      
      if (peakSpeed > 0) {
        console.log(`\n   ⭐ Peak Evening: ${peakSpeed.toFixed(1)} mph from ${peakDir?.toFixed(0)}° (${getCardinal(peakDir)}) at ${peakTime}`);
        
        // Check if flyable for paragliding
        if (stid === 'FPS') {
          const dirOk = peakDir >= 160 && peakDir <= 200;
          const speedOk = peakSpeed >= 5 && peakSpeed <= 18;
          console.log(`   South Side: Direction ${dirOk ? '✅' : '❌'} | Speed ${speedOk ? '✅' : '❌'}`);
        }
        if (stid === 'UTALP') {
          const dirOk = peakDir >= 315 || peakDir <= 45;
          const speedOk = peakSpeed >= 5 && peakSpeed <= 18;
          console.log(`   North Side: Direction ${dirOk ? '✅' : '❌'} | Speed ${speedOk ? '✅' : '❌'}`);
        }
      }
    }
    
    // ANALYSIS
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('ANALYSIS: WHY WAS THE NORTH SIDE FLYABLE?');
    console.log(`${'='.repeat(80)}\n`);
    
    // Compare KSLC and KPVU pressure
    const kslc = allData['KSLC'];
    const kpvu = allData['KPVU'];
    
    if (kslc && kpvu && kslc.pressures.length && kpvu.pressures.length) {
      // Get evening pressure gradient
      for (let i = kslc.times.length - 1; i >= 0; i--) {
        const t = new Date(kslc.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        if (mdtHour >= 16 && mdtHour <= 18 && kslc.pressures[i] && kpvu.pressures[i]) {
          const gradient = kslc.pressures[i] - kpvu.pressures[i];
          console.log(`Pressure Gradient (SLC - Provo) at ~${mdtHour}:00 MDT: ${gradient.toFixed(2)} mb`);
          if (gradient > 0) {
            console.log('→ Positive gradient = North flow pattern (SLC higher pressure pushing south)');
          } else {
            console.log('→ Negative gradient = South flow pattern');
          }
          break;
        }
      }
    }
    
    // UTALP evening analysis
    const utalp = allData['UTALP'];
    if (utalp) {
      console.log('\n--- UTALP (Flight Park North) Evening Analysis ---');
      let northWindMinutes = 0;
      let totalMinutes = 0;
      let avgNorthSpeed = 0;
      let northCount = 0;
      
      for (let i = 0; i < utalp.times.length; i++) {
        const t = new Date(utalp.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20) {
          totalMinutes++;
          const dir = utalp.dirs[i];
          const speed = utalp.speeds[i];
          
          if ((dir >= 315 || dir <= 45) && speed >= 5 && speed <= 18) {
            northWindMinutes++;
            avgNorthSpeed += speed;
            northCount++;
          }
        }
      }
      
      if (northCount > 0) avgNorthSpeed /= northCount;
      
      console.log(`North wind readings (3-8 PM): ${northWindMinutes}/${totalMinutes} observations`);
      console.log(`Average north wind speed: ${avgNorthSpeed.toFixed(1)} mph`);
      console.log(`Flyable window: ${northWindMinutes > 0 ? 'YES' : 'NO'}`);
    }
    
    // FPS evening analysis
    const fps = allData['FPS'];
    if (fps) {
      console.log('\n--- FPS (Flight Park South) Evening Analysis ---');
      for (let i = fps.times.length - 1; i >= Math.max(0, fps.times.length - 20); i--) {
        const t = new Date(fps.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20) {
          const dir = fps.dirs[i];
          const speed = fps.speeds[i];
          const cardinal = getCardinal(dir);
          
          // Did FPS switch to north? That would confirm north flow at POM
          if (dir >= 315 || dir <= 45) {
            const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
            console.log(`⚡ FPS showed NORTH wind at ${timeStr}: ${speed?.toFixed(1)} mph from ${dir?.toFixed(0)}° (${cardinal})`);
          }
        }
      }
    }
    
    // KSLC indicator analysis
    const kslcData = allData['KSLC'];
    if (kslcData) {
      console.log('\n--- KSLC (Salt Lake City) - North Flow Indicator ---');
      for (let i = 0; i < kslcData.times.length; i++) {
        const t = new Date(kslcData.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 14 && mdtHour <= 20) {
          const dir = kslcData.dirs[i];
          const speed = kslcData.speeds[i];
          
          // KSLC north wind is an early indicator for POM north side
          if ((dir >= 315 || dir <= 45) && speed >= 3) {
            const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
            console.log(`📡 KSLC north wind at ${timeStr}: ${speed?.toFixed(1)} mph from ${dir?.toFixed(0)}° (${getCardinal(dir)})`);
          }
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('RECOMMENDATIONS FOR STRONGER MODEL');
    console.log(`${'='.repeat(80)}\n`);
    
    console.log('1. KSLC EARLY INDICATOR: Monitor SLC Airport for north wind onset');
    console.log('   - When KSLC shows N/NW wind > 3 mph, north side likely flyable in 30-60 min');
    console.log('');
    console.log('2. PRESSURE GRADIENT TIMING: Track SLC-Provo gradient change rate');
    console.log('   - Rapidly rising gradient in afternoon = strong north flow developing');
    console.log('');
    console.log('3. TEMPERATURE DIFFERENTIAL: Lake vs Valley temp difference');
    console.log('   - Greater Salt Lake cooling effect drives evening north flow');
    console.log('');
    console.log('4. FPS WIND SWITCH: When FPS switches from S to N, north side is active');
    console.log('   - This is the most reliable confirmation signal');
    console.log('');
    console.log('5. TIME-OF-DAY MODEL: Evening north flow is almost daily in warm months');
    console.log('   - Should default to "likely flyable" 4-8 PM Mar-Oct unless storm/strong S');
    
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data).substring(0, 500));
    }
  }
}

function getCardinal(deg) {
  if (deg == null) return '--';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

fetchYesterdayData();
