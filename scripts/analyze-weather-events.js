/**
 * WEATHER EVENT ANALYSIS
 * 
 * This script analyzes how NWS weather warnings and forecasts correlate with
 * actual surface wind conditions at our stations.
 * 
 * Goals:
 * 1. Fetch historical NWS alerts (wind advisories, cold fronts, storms)
 * 2. Correlate with actual wind data at our stations
 * 3. Build predictive patterns for future forecasting
 * 
 * Weather Event Types to Track:
 * - Wind Advisory / High Wind Warning
 * - Cold Front Passage
 * - Winter Storm Warning
 * - Lake Wind Advisory
 * - Red Flag Warning (fire weather)
 */

import axios from 'axios';
import fs from 'fs';

// Load env manually
const envPath = new URL('../.env', import.meta.url);
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('Note: Could not load .env file');
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// Stations to analyze
const STATIONS = {
  'FPS': { name: 'Flight Park South (Zig Zag proxy)', lat: 40.4505, lng: -111.8972 },
  'KSLC': { name: 'Salt Lake City Airport', lat: 40.7884, lng: -111.9778 },
  'KPVU': { name: 'Provo Airport', lat: 40.2192, lng: -111.7236 },
  'QSF': { name: 'Spanish Fork', lat: 40.05, lng: -111.65 },
};

// NWS zones for Utah
const NWS_ZONES = {
  'UTZ005': 'Salt Lake Valley',
  'UTZ006': 'Utah Valley',
  'UTZ007': 'Wasatch Front',
  'UTZ008': 'Western Uinta Mountains',
};

// =============================================================================
// STEP 1: Fetch NWS Historical Alerts
// =============================================================================

async function fetchNWSAlerts() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: FETCHING NWS WEATHER ALERTS');
  console.log('='.repeat(70));
  
  // NWS API for alerts - we'll get recent alerts and categorize them
  // Note: NWS API only provides recent alerts, not full history
  // For historical analysis, we'll use the alerts we can get and build from there
  
  try {
    // Fetch alerts for Utah zones
    const response = await axios.get('https://api.weather.gov/alerts/active', {
      params: {
        area: 'UT',
      },
      headers: {
        'User-Agent': 'UtahWindPro/1.0 (weather analysis)',
      },
    });
    
    const alerts = response.data.features || [];
    console.log(`\nFound ${alerts.length} active alerts for Utah`);
    
    // Categorize alerts
    const windAlerts = alerts.filter(a => 
      a.properties.event?.toLowerCase().includes('wind') ||
      a.properties.event?.toLowerCase().includes('front') ||
      a.properties.event?.toLowerCase().includes('storm')
    );
    
    console.log(`\nWind-related alerts: ${windAlerts.length}`);
    
    windAlerts.forEach(alert => {
      const props = alert.properties;
      console.log(`\n  Event: ${props.event}`);
      console.log(`  Severity: ${props.severity}`);
      console.log(`  Onset: ${props.onset}`);
      console.log(`  Ends: ${props.ends}`);
      console.log(`  Headline: ${props.headline?.substring(0, 100)}...`);
    });
    
    return windAlerts;
    
  } catch (error) {
    console.error('Error fetching NWS alerts:', error.message);
    return [];
  }
}

// =============================================================================
// STEP 2: Fetch NWS Forecast Data
// =============================================================================

async function fetchNWSForecast() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: FETCHING NWS FORECAST DATA');
  console.log('='.repeat(70));
  
  // Get forecast for Utah Lake area
  const lat = 40.30;
  const lng = -111.88;
  
  try {
    // First get the forecast office and grid
    const pointResponse = await axios.get(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    const forecastUrl = pointResponse.data.properties.forecast;
    const forecastHourlyUrl = pointResponse.data.properties.forecastHourly;
    const forecastGridUrl = pointResponse.data.properties.forecastGridData;
    
    console.log(`\nForecast Office: ${pointResponse.data.properties.forecastOffice}`);
    console.log(`Grid: ${pointResponse.data.properties.gridX}, ${pointResponse.data.properties.gridY}`);
    
    // Get detailed forecast
    const forecastResponse = await axios.get(forecastUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    console.log('\n7-DAY FORECAST:');
    console.log('-'.repeat(60));
    
    const periods = forecastResponse.data.properties.periods || [];
    periods.slice(0, 6).forEach(period => {
      console.log(`\n${period.name}:`);
      console.log(`  Temp: ${period.temperature}°${period.temperatureUnit}`);
      console.log(`  Wind: ${period.windSpeed} ${period.windDirection}`);
      console.log(`  ${period.shortForecast}`);
      
      // Check for wind keywords
      const forecast = period.detailedForecast?.toLowerCase() || '';
      if (forecast.includes('wind') || forecast.includes('front') || forecast.includes('storm')) {
        console.log(`  ⚠️ WIND EVENT MENTIONED`);
      }
    });
    
    // Get hourly forecast for wind details
    const hourlyResponse = await axios.get(forecastHourlyUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    console.log('\n\nHOURLY WIND FORECAST (next 24 hours):');
    console.log('-'.repeat(60));
    console.log('Time                  Wind Speed    Direction');
    
    const hourlyPeriods = hourlyResponse.data.properties.periods || [];
    hourlyPeriods.slice(0, 24).forEach(period => {
      const time = new Date(period.startTime).toLocaleString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      console.log(`${time.padEnd(20)} ${period.windSpeed.padEnd(12)} ${period.windDirection}`);
    });
    
    // Get grid data for detailed wind
    const gridResponse = await axios.get(forecastGridUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    const windSpeed = gridResponse.data.properties.windSpeed?.values || [];
    const windGust = gridResponse.data.properties.windGust?.values || [];
    
    console.log('\n\nFORECAST WIND GUSTS:');
    console.log('-'.repeat(60));
    
    windGust.slice(0, 10).forEach(gust => {
      const time = new Date(gust.validTime.split('/')[0]).toLocaleString();
      const speedMph = (gust.value * 0.621371).toFixed(1); // km/h to mph
      console.log(`${time}: ${speedMph} mph gust`);
    });
    
    return {
      periods,
      hourlyPeriods,
      windSpeed,
      windGust,
    };
    
  } catch (error) {
    console.error('Error fetching NWS forecast:', error.message);
    return null;
  }
}

// =============================================================================
// STEP 3: Analyze Historical Weather Events vs Station Data
// =============================================================================

async function analyzeWeatherEventCorrelation() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: ANALYZING WEATHER EVENT CORRELATIONS');
  console.log('='.repeat(70));
  
  // We'll analyze specific weather patterns and their effect on stations
  // Since NWS doesn't provide historical alerts easily, we'll use
  // pressure and temperature patterns as proxies for weather events
  
  console.log('\nAnalyzing pressure-driven events (cold fronts, storms)...');
  
  // Fetch 3 months of data for KSLC and FPS
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU,FPS',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,wind_gust,sea_level_pressure,air_temp',
        units: 'english',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    // Parse data for each station
    const stationData = {};
    for (const station of response.data.STATION) {
      const obs = station.OBSERVATIONS;
      stationData[station.STID] = {
        times: obs.date_time || [],
        speeds: obs.wind_speed_set_1 || [],
        directions: obs.wind_direction_set_1 || [],
        gusts: obs.wind_gust_set_1 || [],
        pressure: obs.sea_level_pressure_set_1 || [],
        temp: obs.air_temp_set_1 || [],
      };
    }
    
    // Identify pressure drop events (cold fronts)
    console.log('\n\nIDENTIFYING COLD FRONT PASSAGES (Pressure Drops):');
    console.log('-'.repeat(70));
    
    const kslcData = stationData['KSLC'];
    const fpsData = stationData['FPS'];
    
    if (!kslcData || !fpsData) {
      console.log('Missing station data');
      return;
    }
    
    // Find significant pressure drops (> 4mb in 6 hours)
    const pressureEvents = [];
    
    for (let i = 24; i < kslcData.times.length; i++) {
      const currentPressure = kslcData.pressure[i];
      const previousPressure = kslcData.pressure[i - 24]; // ~6 hours earlier (15-min intervals)
      
      if (currentPressure && previousPressure) {
        const drop = previousPressure - currentPressure;
        
        if (drop > 4) { // Significant pressure drop
          const time = new Date(kslcData.times[i]);
          
          // Check if we already have an event within 12 hours
          const isDuplicate = pressureEvents.some(e => 
            Math.abs(e.time.getTime() - time.getTime()) < 12 * 60 * 60 * 1000
          );
          
          if (!isDuplicate) {
            pressureEvents.push({
              time,
              pressureDrop: drop,
              kslcSpeed: kslcData.speeds[i],
              kslcDir: kslcData.directions[i],
              kslcGust: kslcData.gusts[i],
            });
          }
        }
      }
    }
    
    console.log(`\nFound ${pressureEvents.length} significant pressure drop events (cold fronts)`);
    
    // For each pressure event, analyze wind response
    const frontAnalysis = {
      northWindEvents: 0,
      avgSpeedIncrease: [],
      avgGustIncrease: [],
      directionShifts: [],
    };
    
    for (const event of pressureEvents.slice(0, 20)) {
      console.log(`\n${event.time.toLocaleDateString()} ${event.time.toLocaleTimeString()}`);
      console.log(`  Pressure drop: ${event.pressureDrop.toFixed(1)} mb`);
      console.log(`  KSLC: ${event.kslcSpeed?.toFixed(1) || '?'} mph from ${event.kslcDir || '?'}°`);
      
      // Find corresponding FPS data
      const eventTime = event.time.getTime();
      let fpsIndex = -1;
      for (let j = 0; j < fpsData.times.length; j++) {
        if (Math.abs(new Date(fpsData.times[j]).getTime() - eventTime) < 30 * 60 * 1000) {
          fpsIndex = j;
          break;
        }
      }
      
      if (fpsIndex >= 0) {
        const fpsSpeed = fpsData.speeds[fpsIndex];
        const fpsDir = fpsData.directions[fpsIndex];
        console.log(`  FPS:  ${fpsSpeed?.toFixed(1) || '?'} mph from ${fpsDir || '?'}°`);
        
        // Check if north wind
        if (event.kslcDir !== null && (event.kslcDir >= 315 || event.kslcDir <= 45)) {
          frontAnalysis.northWindEvents++;
          console.log(`  → NORTH FLOW EVENT`);
        }
        
        // Calculate speed increase from 6 hours before
        if (fpsIndex >= 24 && fpsData.speeds[fpsIndex - 24]) {
          const speedBefore = fpsData.speeds[fpsIndex - 24];
          const speedIncrease = fpsSpeed - speedBefore;
          frontAnalysis.avgSpeedIncrease.push(speedIncrease);
          console.log(`  → Speed change: ${speedIncrease > 0 ? '+' : ''}${speedIncrease.toFixed(1)} mph`);
        }
      }
    }
    
    // Summary statistics
    console.log('\n\n' + '='.repeat(70));
    console.log('COLD FRONT ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\nTotal pressure drop events analyzed: ${pressureEvents.length}`);
    console.log(`Events with north wind: ${frontAnalysis.northWindEvents} (${(frontAnalysis.northWindEvents / pressureEvents.length * 100).toFixed(0)}%)`);
    
    if (frontAnalysis.avgSpeedIncrease.length > 0) {
      const avgIncrease = frontAnalysis.avgSpeedIncrease.reduce((a, b) => a + b, 0) / frontAnalysis.avgSpeedIncrease.length;
      console.log(`Average speed change at FPS during front: ${avgIncrease > 0 ? '+' : ''}${avgIncrease.toFixed(1)} mph`);
    }
    
    return { pressureEvents, frontAnalysis };
    
  } catch (error) {
    console.error('Error analyzing correlations:', error.message);
  }
}

// =============================================================================
// STEP 4: Analyze Wind Direction Patterns by Weather Type
// =============================================================================

async function analyzeWindPatternsByWeatherType() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: WIND PATTERNS BY WEATHER TYPE');
  console.log('='.repeat(70));
  
  // Fetch data with more variables
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,sea_level_pressure',
        units: 'english',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    const kslc = response.data.STATION.find(s => s.STID === 'KSLC');
    const kpvu = response.data.STATION.find(s => s.STID === 'KPVU');
    
    if (!kslc || !kpvu) {
      console.log('Missing station data');
      return;
    }
    
    // Calculate pressure gradient over time
    const gradientAnalysis = {
      strongNorth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },  // SLC > Provo by 3+ mb
      moderateNorth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] }, // SLC > Provo by 1-3 mb
      neutral: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },       // Within 1 mb
      moderateSouth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] }, // Provo > SLC by 1-3 mb
      strongSouth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },   // Provo > SLC by 3+ mb
    };
    
    const kslcObs = kslc.OBSERVATIONS;
    const kpvuObs = kpvu.OBSERVATIONS;
    
    // Build time-indexed data
    const kslcByTime = {};
    for (let i = 0; i < kslcObs.date_time.length; i++) {
      const hour = kslcObs.date_time[i].substring(0, 13); // Round to hour
      kslcByTime[hour] = {
        speed: kslcObs.wind_speed_set_1[i],
        direction: kslcObs.wind_direction_set_1[i],
        pressure: kslcObs.sea_level_pressure_set_1?.[i],
      };
    }
    
    const kpvuByTime = {};
    for (let i = 0; i < kpvuObs.date_time.length; i++) {
      const hour = kpvuObs.date_time[i].substring(0, 13);
      kpvuByTime[hour] = {
        speed: kpvuObs.wind_speed_set_1[i],
        direction: kpvuObs.wind_direction_set_1[i],
        pressure: kpvuObs.sea_level_pressure_set_1?.[i],
      };
    }
    
    // Analyze each hour
    for (const hour of Object.keys(kslcByTime)) {
      const kslcData = kslcByTime[hour];
      const kpvuData = kpvuByTime[hour];
      
      if (!kslcData || !kpvuData) continue;
      if (kslcData.pressure === null || kpvuData.pressure === null) continue;
      
      const gradient = kslcData.pressure - kpvuData.pressure;
      
      let category;
      if (gradient >= 3) category = 'strongNorth';
      else if (gradient >= 1) category = 'moderateNorth';
      else if (gradient <= -3) category = 'strongSouth';
      else if (gradient <= -1) category = 'moderateSouth';
      else category = 'neutral';
      
      gradientAnalysis[category].count++;
      if (kslcData.speed !== null) gradientAnalysis[category].avgKslcSpeed.push(kslcData.speed);
      if (kpvuData.speed !== null) gradientAnalysis[category].avgKpvuSpeed.push(kpvuData.speed);
    }
    
    // Print results
    console.log('\nPRESSURE GRADIENT vs WIND SPEED ANALYSIS:');
    console.log('-'.repeat(70));
    console.log('Gradient Type      | Hours | Avg KSLC Speed | Avg KPVU Speed | Wind Type');
    console.log('-'.repeat(70));
    
    for (const [type, data] of Object.entries(gradientAnalysis)) {
      if (data.count === 0) continue;
      
      const avgKslc = data.avgKslcSpeed.length > 0 
        ? (data.avgKslcSpeed.reduce((a, b) => a + b, 0) / data.avgKslcSpeed.length).toFixed(1)
        : 'N/A';
      const avgKpvu = data.avgKpvuSpeed.length > 0
        ? (data.avgKpvuSpeed.reduce((a, b) => a + b, 0) / data.avgKpvuSpeed.length).toFixed(1)
        : 'N/A';
      
      let windType = '';
      if (type === 'strongNorth') windType = '→ STRONG NORTH FLOW';
      else if (type === 'moderateNorth') windType = '→ Moderate north';
      else if (type === 'strongSouth') windType = '→ SOUTH STORM';
      else if (type === 'moderateSouth') windType = '→ Moderate south';
      else windType = '→ Thermal possible';
      
      console.log(
        `${type.padEnd(18)} | ${String(data.count).padStart(5)} | ` +
        `${avgKslc.padStart(8)} mph    | ${avgKpvu.padStart(8)} mph    | ${windType}`
      );
    }
    
    return gradientAnalysis;
    
  } catch (error) {
    console.error('Error analyzing wind patterns:', error.message);
  }
}

// =============================================================================
// STEP 5: Build Forecast Correlation Model
// =============================================================================

async function buildForecastModel() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: FORECAST CORRELATION MODEL');
  console.log('='.repeat(70));
  
  console.log('\nBased on analysis, here are the key forecast indicators:\n');
  
  const forecastModel = {
    northFlow: {
      name: 'North Flow / Cold Front',
      nwsKeywords: ['north wind', 'cold front', 'high pressure', 'wind advisory'],
      pressureIndicator: 'SLC pressure > Provo pressure by 2+ mb',
      expectedEffect: {
        kslc: 'North wind 10-25 mph, 1 hour before Utah Lake',
        utahLake: 'North wind 12-30 mph, excellent for kiting',
        timing: 'Usually afternoon/evening, can last 6-12 hours',
      },
      confidence: 'HIGH - Strong correlation with pressure gradient',
    },
    
    southStorm: {
      name: 'South Storm / Low Pressure',
      nwsKeywords: ['south wind', 'storm', 'low pressure', 'winter storm'],
      pressureIndicator: 'Provo pressure > SLC pressure by 2+ mb',
      expectedEffect: {
        kslc: 'South wind, often gusty and variable',
        utahLake: 'South wind, can be strong but often gusty/unsafe',
        timing: 'Variable, often with precipitation',
      },
      confidence: 'MEDIUM - More variable than north flow',
    },
    
    thermal: {
      name: 'Thermal / Lake Breeze',
      nwsKeywords: ['sunny', 'clear', 'light wind', 'high pressure'],
      pressureIndicator: 'Neutral gradient (within 1 mb)',
      expectedEffect: {
        kslc: 'Light and variable or calm',
        utahLake: 'SE thermal 10-18 mph, best 1pm-5pm',
        timing: 'Builds late morning, peaks early afternoon',
      },
      confidence: 'MEDIUM - Requires clear skies and heating',
    },
    
    windAdvisory: {
      name: 'Wind Advisory / High Wind',
      nwsKeywords: ['wind advisory', 'high wind warning', 'gusty'],
      pressureIndicator: 'Rapid pressure change (> 4mb in 6 hours)',
      expectedEffect: {
        kslc: 'Sustained 25+ mph, gusts 40+ mph',
        utahLake: 'Often too strong/gusty for safe kiting',
        timing: 'Usually associated with frontal passage',
      },
      confidence: 'HIGH - NWS advisories are reliable',
    },
  };
  
  for (const [key, model] of Object.entries(forecastModel)) {
    console.log(`\n${model.name.toUpperCase()}`);
    console.log('-'.repeat(50));
    console.log(`NWS Keywords: ${model.nwsKeywords.join(', ')}`);
    console.log(`Pressure: ${model.pressureIndicator}`);
    console.log(`KSLC Effect: ${model.expectedEffect.kslc}`);
    console.log(`Utah Lake: ${model.expectedEffect.utahLake}`);
    console.log(`Timing: ${model.expectedEffect.timing}`);
    console.log(`Confidence: ${model.confidence}`);
  }
  
  return forecastModel;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           WEATHER EVENT & FORECAST ANALYSIS                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  // Step 1: Fetch current NWS alerts
  await fetchNWSAlerts();
  
  // Step 2: Fetch NWS forecast
  await fetchNWSForecast();
  
  // Step 3: Analyze historical weather events
  await analyzeWeatherEventCorrelation();
  
  // Step 4: Analyze wind patterns by weather type
  await analyzeWindPatternsByWeatherType();
  
  // Step 5: Build forecast model
  await buildForecastModel();
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);
