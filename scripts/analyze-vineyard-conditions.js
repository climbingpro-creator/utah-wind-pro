/**
 * Analyze current conditions for Vineyard and find historical patterns
 * Uses American Fork Marina (if available) and other nearby stations
 */

import https from 'https';
import fs from 'fs';

// Load environment
const envPath = '.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN || process.env.SYNOPTIC_TOKEN;
if (!SYNOPTIC_TOKEN) {
  console.error('SYNOPTIC_TOKEN or VITE_SYNOPTIC_TOKEN must be set in environment');
  process.exit(1);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
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

async function searchStations() {
  console.log('=== SEARCHING FOR STATIONS NEAR VINEYARD ===\n');
  
  // Search for stations near Vineyard (40.3176, -111.7647)
  const searchUrl = `https://api.synopticdata.com/v2/stations/metadata?token=${SYNOPTIC_TOKEN}&radius=40.3176,-111.7647,20&limit=30&complete=1`;
  
  try {
    const data = await fetchJSON(searchUrl);
    
    if (data.STATION) {
      console.log('Stations within 20 miles of Vineyard:\n');
      data.STATION.forEach(s => {
        const dist = s.DISTANCE || 'N/A';
        console.log(`  ${s.STID.padEnd(10)} - ${(s.NAME || 'Unknown').padEnd(30)} (${dist} mi)`);
      });
      
      // Look for marina or lake stations
      const marinaStations = data.STATION.filter(s => 
        s.NAME?.toLowerCase().includes('marina') ||
        s.NAME?.toLowerCase().includes('lake') ||
        s.NAME?.toLowerCase().includes('harbor')
      );
      
      if (marinaStations.length > 0) {
        console.log('\n--- Marina/Lake Stations Found ---');
        marinaStations.forEach(s => {
          console.log(`  ${s.STID}: ${s.NAME}`);
        });
      }
    }
  } catch (e) {
    console.error('Error searching stations:', e.message);
  }
}

async function getCurrentConditions() {
  console.log('\n=== CURRENT CONDITIONS ===\n');
  
  // Key stations for Vineyard analysis
  const stations = 'KSLC,KPVU,FPS,UTALP,QLN,QSF';
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${SYNOPTIC_TOKEN}&stid=${stations}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter&units=english`;
  
  try {
    const data = await fetchJSON(url);
    
    if (data.STATION) {
      console.log('Station          Wind(mph)  Dir    Gust   Temp   Pressure');
      console.log('----------------------------------------------------------------');
      
      data.STATION.forEach(s => {
        const obs = s.OBSERVATIONS || {};
        const speed = obs.wind_speed_value_1?.value?.toFixed(1) || '--';
        const dir = obs.wind_direction_value_1?.value?.toFixed(0) || '--';
        const gust = obs.wind_gust_value_1?.value?.toFixed(1) || '--';
        const temp = obs.air_temp_value_1?.value?.toFixed(1) || '--';
        const pres = obs.altimeter_value_1?.value?.toFixed(2) || '--';
        
        console.log(`${s.STID.padEnd(16)} ${speed.padStart(6)}    ${dir.padStart(4)}°   ${gust.padStart(5)}  ${temp.padStart(5)}°F  ${pres}`);
      });
      
      // Calculate pressure gradient
      const kslc = data.STATION.find(s => s.STID === 'KSLC');
      const kpvu = data.STATION.find(s => s.STID === 'KPVU');
      
      if (kslc && kpvu) {
        const slcPres = kslc.OBSERVATIONS?.altimeter_value_1?.value;
        const pvuPres = kpvu.OBSERVATIONS?.altimeter_value_1?.value;
        
        if (slcPres && pvuPres) {
          const gradient = (slcPres - pvuPres) * 33.8639; // Convert to mb
          console.log(`\nPressure Gradient (SLC - Provo): ${gradient.toFixed(2)} mb`);
          
          if (gradient > 2.0) {
            console.log('⚠️  HIGH GRADIENT - Strong North Flow Expected!');
          } else if (gradient > 1.0) {
            console.log('📈 Moderate gradient - North flow possible');
          } else if (gradient < -1.0) {
            console.log('📉 Negative gradient - South flow');
          } else {
            console.log('✅ Low gradient - Good for thermal development');
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching current conditions:', e.message);
  }
}

async function getHistoricalPatterns() {
  console.log('\n=== HISTORICAL ANALYSIS FOR VINEYARD ===\n');
  
  // Get last 7 days of data for pattern analysis
  const end = new Date();
  const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
  
  const startStr = start.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const endStr = end.toISOString().replace(/[-:]/g, '').slice(0, 15);
  
  const url = `https://api.synopticdata.com/v2/stations/timeseries?token=${SYNOPTIC_TOKEN}&stid=FPS,UTALP&start=${startStr}&end=${endStr}&vars=wind_speed,wind_direction&units=english&obtimezone=local`;
  
  try {
    const data = await fetchJSON(url);
    
    if (data.STATION) {
      data.STATION.forEach(station => {
        console.log(`\n--- ${station.NAME} (${station.STID}) ---`);
        
        const speeds = station.OBSERVATIONS?.wind_speed_set_1 || [];
        const times = station.OBSERVATIONS?.date_time || [];
        
        // Find good kiting days (10+ mph for 2+ hours)
        let goodDays = [];
        let currentDay = null;
        let consecutiveGood = 0;
        
        for (let i = 0; i < speeds.length; i++) {
          const speed = speeds[i];
          const time = new Date(times[i]);
          const dayKey = time.toDateString();
          const hour = time.getHours();
          
          // Only look at daytime hours (9am - 6pm)
          if (hour >= 9 && hour <= 18) {
            if (speed >= 10) {
              if (currentDay !== dayKey) {
                if (consecutiveGood >= 8) { // 2+ hours of good wind
                  goodDays.push(currentDay);
                }
                currentDay = dayKey;
                consecutiveGood = 1;
              } else {
                consecutiveGood++;
              }
            }
          }
        }
        
        // Calculate averages
        const avgSpeed = speeds.length > 0 
          ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)
          : 'N/A';
        const maxSpeed = speeds.length > 0 
          ? Math.max(...speeds).toFixed(1)
          : 'N/A';
        
        console.log(`  Avg Wind: ${avgSpeed} mph`);
        console.log(`  Max Wind: ${maxSpeed} mph`);
        console.log(`  Data points: ${speeds.length}`);
        
        if (goodDays.length > 0) {
          console.log(`  Good kiting days in last week: ${goodDays.length}`);
        }
      });
    }
  } catch (e) {
    console.error('Error fetching historical data:', e.message);
  }
}

async function analyzeVineyardPotential() {
  console.log('\n=== VINEYARD KITING POTENTIAL TODAY ===\n');
  
  // Get current NWS alerts
  try {
    const alertUrl = 'https://api.weather.gov/alerts/active?area=UT';
    const alertData = await fetchJSON(alertUrl);
    
    if (alertData.features && alertData.features.length > 0) {
      console.log('Active Weather Alerts:');
      alertData.features.forEach(alert => {
        const props = alert.properties;
        if (props.event?.toLowerCase().includes('wind') || 
            props.event?.toLowerCase().includes('advisory')) {
          console.log(`\n  📢 ${props.event}`);
          console.log(`     ${props.headline}`);
          
          // Parse wind info
          const desc = props.description || '';
          const windMatch = desc.match(/(\d+)\s*to\s*(\d+)\s*mph/i);
          if (windMatch) {
            console.log(`     Expected: ${windMatch[1]}-${windMatch[2]} mph`);
          }
          const gustMatch = desc.match(/gusts?\s*(?:up\s*to\s*)?(\d+)\s*mph/i);
          if (gustMatch) {
            console.log(`     Gusts: up to ${gustMatch[1]} mph`);
          }
        }
      });
    } else {
      console.log('No active wind-related alerts');
    }
  } catch (e) {
    console.error('Error fetching alerts:', e.message);
  }
  
  console.log('\n--- Vineyard Analysis ---');
  console.log('Vineyard is good for:');
  console.log('  • SE Thermal (typical afternoon)');
  console.log('  • North flow (when KSLC shows N wind)');
  console.log('  • Side-on conditions from E or W');
  console.log('\nKey indicators to watch:');
  console.log('  • KSLC N wind > 5 mph = North flow coming');
  console.log('  • FPS/UTALP showing 10+ mph = Active conditions');
  console.log('  • Pressure gradient > 2 mb = Strong north (may be too much)');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         VINEYARD WIND ANALYSIS - ' + new Date().toLocaleDateString() + '              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  await searchStations();
  await getCurrentConditions();
  await getHistoricalPatterns();
  await analyzeVineyardPotential();
  
  console.log('\n=== ANALYSIS COMPLETE ===\n');
}

main().catch(console.error);
