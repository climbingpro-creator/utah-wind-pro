import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

async function fetchFPS() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const start = new Date(yesterday);
  start.setUTCHours(18, 0, 0, 0); // 12 PM MDT
  const end = new Date(now);
  end.setUTCHours(4, 0, 0, 0); // 10 PM MDT
  
  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}${m}${day}${h}${min}`;
  };

  const url = `https://api.synopticdata.com/v2/stations/timeseries?stids=FPS&start=${fmt(start)}&end=${fmt(end)}&vars=wind_speed,wind_direction,wind_gust,air_temp&units=english,speed|mph,temp|F&token=${TOKEN}`;
  
  console.log('=== FLIGHT PARK SOUTH - Yesterday Afternoon/Evening ===\n');
  
  const response = await axios.get(url, { timeout: 30000 });
  const station = response.data.STATION?.[0];
  if (!station) { console.log('No data'); return; }
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const gusts = obs.wind_gust_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  console.log('Time (MDT)    | Wind (mph) | Dir    | Gust  | Temp');
  console.log('-'.repeat(60));
  
  let switchTime = null;
  
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
    
    if (mdtHour >= 14 && mdtHour <= 21) {
      const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
      const speed = speeds[i]?.toFixed(1) || '--';
      const dir = dirs[i]?.toFixed(0) || '--';
      const gust = gusts[i]?.toFixed(0) || '--';
      const temp = temps[i]?.toFixed(1) || '--';
      
      const cardinal = getCardinal(dirs[i]);
      const isNorth = dirs[i] >= 315 || dirs[i] <= 45;
      const marker = isNorth ? ' ← NORTH' : '';
      
      console.log(`${timeStr.padEnd(14)} | ${speed.padStart(6)} mph | ${dir.padStart(4)}° ${cardinal.padStart(3)} | ${gust.padStart(4)}  | ${temp}°F${marker}`);
      
      if (isNorth && !switchTime) {
        switchTime = timeStr;
      }
    }
  }
  
  if (switchTime) {
    console.log(`\n⚡ FPS switched to NORTH at: ${switchTime}`);
  } else {
    console.log('\n❌ FPS did NOT switch to north (stayed south all evening)');
  }
}

function getCardinal(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

fetchFPS().catch(console.error);
