/**
 * TEMPLATE: Analyze New Location for Wind Indicators
 * 
 * This script template helps you find and validate wind indicators for a new kiting location.
 * 
 * USAGE:
 * 1. Copy this file to a new name (e.g., analyze-bear-lake.js)
 * 2. Fill in the TARGET_LOCATION configuration
 * 3. Run: node scripts/analyze-bear-lake.js
 * 4. Review output and add validated indicators to indicatorSystem.js
 */

const axios = require('axios');
require('dotenv').config();

// =============================================================================
// CONFIGURATION - FILL THESE IN FOR YOUR LOCATION
// =============================================================================

const TARGET_LOCATION = {
  name: 'Your Location Name',
  
  // If you have a weather station at the target, enter its ID
  // Otherwise, leave null and we'll search for nearby stations
  targetStationId: null, // e.g., 'FPS' for Flight Park South
  
  // Target coordinates
  coordinates: {
    lat: 40.0,  // Fill in
    lng: -111.0, // Fill in
  },
  
  // What wind types are you looking for?
  windTypes: {
    thermal: {
      enabled: true,
      direction: { min: 90, max: 180, label: 'SE' }, // Thermal direction at your spot
      searchDirection: 'southeast', // Where to look for indicator stations
    },
    northFlow: {
      enabled: true,
      direction: { min: 315, max: 45, label: 'N' },
      searchDirection: 'north',
    },
    gapWind: {
      enabled: false,
      direction: { min: 0, max: 360, label: 'Any' },
      searchDirection: 'any',
    },
  },
  
  // Kiteable thresholds
  kiteThresholds: {
    foilMinSpeed: 10,    // mph
    twinTipMinSpeed: 15, // mph
  },
  
  // Search radius for finding indicator stations (miles)
  searchRadius: 50,
};

// Candidate indicator stations to analyze
// Add stations you think might be good indicators
const CANDIDATE_INDICATORS = [
  // { id: 'KSLC', name: 'Salt Lake City', expectedLeadHours: 1 },
  // { id: 'QSF', name: 'Spanish Fork', expectedLeadHours: 2 },
  // Add your candidates here
];

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// =============================================================================
// STEP 1: SEARCH FOR NEARBY STATIONS
// =============================================================================

async function searchNearbyStations() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: SEARCHING FOR NEARBY WEATHER STATIONS');
  console.log('='.repeat(70));
  
  const { lat, lng } = TARGET_LOCATION.coordinates;
  const radius = TARGET_LOCATION.searchRadius;
  
  console.log(`\nSearching within ${radius} miles of ${lat}, ${lng}...`);
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/metadata', {
      params: {
        token: SYNOPTIC_TOKEN,
        radius: `${lat},${lng},${radius}`,
        status: 'active',
        vars: 'wind_speed,wind_direction',
        limit: 100,
      },
    });
    
    if (response.data.STATION) {
      const stations = response.data.STATION;
      console.log(`\nFound ${stations.length} stations with wind data:\n`);
      
      // Group by distance
      const withDistance = stations.map(s => {
        const stLat = parseFloat(s.LATITUDE);
        const stLng = parseFloat(s.LONGITUDE);
        const distance = calculateDistance(lat, lng, stLat, stLng);
        return { ...s, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      // Print stations grouped by distance
      console.log('NEARBY (< 10 miles):');
      withDistance.filter(s => s.distance < 10).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      console.log('\nMEDIUM DISTANCE (10-30 miles):');
      withDistance.filter(s => s.distance >= 10 && s.distance < 30).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      console.log('\nFARTHER (30-50 miles):');
      withDistance.filter(s => s.distance >= 30).slice(0, 20).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      return withDistance;
    }
  } catch (error) {
    console.error('Error searching stations:', error.message);
  }
  
  return [];
}

// =============================================================================
// STEP 2: IDENTIFY GOOD WIND DAYS AT TARGET
// =============================================================================

async function identifyGoodWindDays(targetStationId) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: IDENTIFYING GOOD WIND DAYS AT TARGET');
  console.log('='.repeat(70));
  
  if (!targetStationId) {
    console.log('\nNo target station specified. Please add a targetStationId to TARGET_LOCATION');
    console.log('or use the station list from Step 1 to find the closest station to your spot.');
    return [];
  }
  
  console.log(`\nAnalyzing ${targetStationId} for good kiting days...`);
  
  // Fetch 6 months of historical data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: targetStationId,
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction',
        units: 'english',
      },
    });
    
    if (!response.data.STATION?.[0]?.OBSERVATIONS) {
      console.log('No data found for target station');
      return [];
    }
    
    const obs = response.data.STATION[0].OBSERVATIONS;
    const times = obs.date_time || [];
    const speeds = obs.wind_speed_set_1 || [];
    const directions = obs.wind_direction_set_1 || [];
    
    // Find good wind periods
    const goodDays = new Map(); // date -> { firstHour, peakSpeed, avgSpeed, hours }
    
    for (let i = 0; i < times.length; i++) {
      const speed = speeds[i];
      const direction = directions[i];
      
      if (speed === null || speed < TARGET_LOCATION.kiteThresholds.foilMinSpeed) continue;
      
      const date = new Date(times[i]);
      const dateKey = date.toISOString().slice(0, 10);
      const hour = date.getHours();
      
      // Check if direction matches any enabled wind type
      let matchesWindType = false;
      for (const [type, config] of Object.entries(TARGET_LOCATION.windTypes)) {
        if (!config.enabled) continue;
        if (isDirectionInRange(direction, config.direction.min, config.direction.max)) {
          matchesWindType = true;
          break;
        }
      }
      
      if (!matchesWindType) continue;
      
      if (!goodDays.has(dateKey)) {
        goodDays.set(dateKey, {
          date: dateKey,
          firstHour: hour,
          peakSpeed: speed,
          totalSpeed: speed,
          count: 1,
        });
      } else {
        const day = goodDays.get(dateKey);
        day.peakSpeed = Math.max(day.peakSpeed, speed);
        day.totalSpeed += speed;
        day.count++;
        if (hour < day.firstHour) day.firstHour = hour;
      }
    }
    
    // Convert to array and calculate averages
    const goodDaysArray = Array.from(goodDays.values()).map(d => ({
      ...d,
      avgSpeed: d.totalSpeed / d.count,
    })).sort((a, b) => b.peakSpeed - a.peakSpeed);
    
    console.log(`\nFound ${goodDaysArray.length} good wind days in the last 6 months`);
    console.log('\nTop 20 best days:');
    console.log('Date        First Hour  Peak Speed  Avg Speed  Duration');
    console.log('-'.repeat(60));
    
    goodDaysArray.slice(0, 20).forEach(d => {
      console.log(
        `${d.date}  ${String(d.firstHour).padStart(2)}:00       ` +
        `${d.peakSpeed.toFixed(1).padStart(5)} mph   ` +
        `${d.avgSpeed.toFixed(1).padStart(5)} mph   ` +
        `${d.count} readings`
      );
    });
    
    return goodDaysArray;
    
  } catch (error) {
    console.error('Error fetching target data:', error.message);
    return [];
  }
}

// =============================================================================
// STEP 3: CORRELATE INDICATOR STATIONS
// =============================================================================

async function correlateIndicators(goodDays, candidates) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: CORRELATING INDICATOR STATIONS');
  console.log('='.repeat(70));
  
  if (candidates.length === 0) {
    console.log('\nNo candidate indicators specified. Add stations to CANDIDATE_INDICATORS.');
    return;
  }
  
  if (goodDays.length === 0) {
    console.log('\nNo good wind days found. Cannot correlate indicators.');
    return;
  }
  
  for (const candidate of candidates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Analyzing: ${candidate.name} (${candidate.id})`);
    console.log(`${'─'.repeat(60)}`);
    
    // For each good day, check what the indicator showed 1, 2, 3, 4 hours before
    const correlations = {
      1: { matches: 0, total: 0, speeds: [] },
      2: { matches: 0, total: 0, speeds: [] },
      3: { matches: 0, total: 0, speeds: [] },
      4: { matches: 0, total: 0, speeds: [] },
    };
    
    // Sample a subset of good days to avoid API limits
    const sampleDays = goodDays.slice(0, 50);
    
    for (const day of sampleDays) {
      try {
        // Fetch indicator data for this day
        const dayStart = day.date.replace(/-/g, '') + '0000';
        const dayEnd = day.date.replace(/-/g, '') + '2359';
        
        const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
          params: {
            token: SYNOPTIC_TOKEN,
            stid: candidate.id,
            start: dayStart,
            end: dayEnd,
            vars: 'wind_speed,wind_direction',
            units: 'english',
          },
        });
        
        if (!response.data.STATION?.[0]?.OBSERVATIONS) continue;
        
        const obs = response.data.STATION[0].OBSERVATIONS;
        const times = obs.date_time || [];
        const speeds = obs.wind_speed_set_1 || [];
        const directions = obs.wind_direction_set_1 || [];
        
        // Find indicator readings at different lead times
        for (const leadHours of [1, 2, 3, 4]) {
          const targetHour = day.firstHour - leadHours;
          if (targetHour < 0) continue;
          
          // Find closest reading to target hour
          for (let i = 0; i < times.length; i++) {
            const readingHour = new Date(times[i]).getHours();
            if (Math.abs(readingHour - targetHour) <= 0.5) {
              correlations[leadHours].total++;
              
              // Check if indicator showed meaningful wind
              if (speeds[i] >= 5) {
                correlations[leadHours].matches++;
                correlations[leadHours].speeds.push({
                  indicatorSpeed: speeds[i],
                  indicatorDir: directions[i],
                  targetPeak: day.peakSpeed,
                });
              }
              break;
            }
          }
        }
        
        // Rate limit
        await sleep(100);
        
      } catch (error) {
        // Skip errors, continue with next day
      }
    }
    
    // Print correlation results
    console.log('\nCorrelation by lead time:');
    console.log('Lead Time   Match Rate   Avg Indicator Speed   Avg Target Speed');
    console.log('-'.repeat(65));
    
    for (const [hours, data] of Object.entries(correlations)) {
      if (data.total === 0) continue;
      
      const matchRate = (data.matches / data.total * 100).toFixed(0);
      const avgIndicator = data.speeds.length > 0 
        ? (data.speeds.reduce((s, d) => s + d.indicatorSpeed, 0) / data.speeds.length).toFixed(1)
        : 'N/A';
      const avgTarget = data.speeds.length > 0
        ? (data.speeds.reduce((s, d) => s + d.targetPeak, 0) / data.speeds.length).toFixed(1)
        : 'N/A';
      
      console.log(
        `${hours} hour(s)    ${matchRate.padStart(3)}%         ` +
        `${avgIndicator.padStart(5)} mph            ` +
        `${avgTarget.padStart(5)} mph`
      );
    }
    
    // Find best lead time
    let bestLead = null;
    let bestRate = 0;
    for (const [hours, data] of Object.entries(correlations)) {
      const rate = data.total > 0 ? data.matches / data.total : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestLead = hours;
      }
    }
    
    if (bestLead) {
      console.log(`\n→ Best lead time: ${bestLead} hour(s) with ${(bestRate * 100).toFixed(0)}% correlation`);
    }
  }
}

// =============================================================================
// STEP 4: VALIDATE CORRELATION (SPEED BUCKETS)
// =============================================================================

async function validateCorrelation(indicatorId, targetId, leadHours) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: VALIDATING CORRELATION');
  console.log('='.repeat(70));
  
  console.log(`\nValidating: When ${indicatorId} shows X mph, what happens at ${targetId} ${leadHours} hour(s) later?`);
  
  // Fetch several months of data for both stations
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: [indicatorId, targetId].join(','),
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction',
        units: 'english',
      },
    });
    
    if (!response.data.STATION || response.data.STATION.length < 2) {
      console.log('Could not fetch data for both stations');
      return;
    }
    
    // Parse data for both stations
    const indicatorData = parseStationData(response.data.STATION.find(s => s.STID === indicatorId));
    const targetData = parseStationData(response.data.STATION.find(s => s.STID === targetId));
    
    if (!indicatorData || !targetData) {
      console.log('Missing data for one or both stations');
      return;
    }
    
    // Build speed bucket analysis
    const buckets = {
      '5-8': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '8-10': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '10-15': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '15+': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
    };
    
    // For each indicator reading, find target reading leadHours later
    for (const [time, indData] of Object.entries(indicatorData)) {
      const indSpeed = indData.speed;
      if (indSpeed === null || indSpeed < 5) continue;
      
      // Find target reading leadHours later
      const targetTime = new Date(new Date(time).getTime() + leadHours * 60 * 60 * 1000);
      const targetKey = findClosestTime(targetData, targetTime);
      
      if (!targetKey || !targetData[targetKey]) continue;
      
      const targetSpeed = targetData[targetKey].speed;
      if (targetSpeed === null) continue;
      
      // Determine bucket
      let bucket;
      if (indSpeed >= 15) bucket = '15+';
      else if (indSpeed >= 10) bucket = '10-15';
      else if (indSpeed >= 8) bucket = '8-10';
      else bucket = '5-8';
      
      buckets[bucket].targetSpeeds.push(targetSpeed);
      buckets[bucket].count++;
      if (targetSpeed >= TARGET_LOCATION.kiteThresholds.foilMinSpeed) buckets[bucket].foilKiteable++;
      if (targetSpeed >= TARGET_LOCATION.kiteThresholds.twinTipMinSpeed) buckets[bucket].twinTipKiteable++;
    }
    
    // Print results
    console.log('\nVALIDATED SPEED CORRELATION:');
    console.log('─'.repeat(80));
    console.log('Indicator Speed  │  Avg Target  │  Foil Kiteable  │  Twin Tip Kiteable  │  Sample');
    console.log('─'.repeat(80));
    
    for (const [bucket, data] of Object.entries(buckets)) {
      if (data.count === 0) continue;
      
      const avgTarget = data.targetSpeeds.reduce((a, b) => a + b, 0) / data.targetSpeeds.length;
      const foilPct = (data.foilKiteable / data.count * 100).toFixed(0);
      const twinPct = (data.twinTipKiteable / data.count * 100).toFixed(0);
      
      console.log(
        `${bucket.padEnd(15)}  │  ${avgTarget.toFixed(1).padStart(6)} mph  │  ` +
        `${foilPct.padStart(6)}%         │  ${twinPct.padStart(6)}%             │  ${data.count}`
      );
    }
    
    console.log('─'.repeat(80));
    
    // Generate configuration snippet
    console.log('\n\nCOPY THIS TO indicatorSystem.js:');
    console.log('─'.repeat(40));
    console.log('speedCorrelation: {');
    for (const [bucket, data] of Object.entries(buckets)) {
      if (data.count === 0) continue;
      const avgTarget = data.targetSpeeds.reduce((a, b) => a + b, 0) / data.targetSpeeds.length;
      const foilPct = Math.round(data.foilKiteable / data.count * 100);
      const twinPct = Math.round(data.twinTipKiteable / data.count * 100);
      console.log(`  '${bucket}': { avgTargetSpeed: ${avgTarget.toFixed(1)}, foilKiteablePct: ${foilPct}, twinTipKiteablePct: ${twinPct}, sampleSize: ${data.count} },`);
    }
    console.log('},');
    
  } catch (error) {
    console.error('Error validating correlation:', error.message);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function isDirectionInRange(direction, min, max) {
  if (min <= max) {
    return direction >= min && direction <= max;
  } else {
    // Handle wrap-around (e.g., 315 to 45)
    return direction >= min || direction <= max;
  }
}

function parseStationData(station) {
  if (!station?.OBSERVATIONS) return null;
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const directions = obs.wind_direction_set_1 || [];
  
  const data = {};
  for (let i = 0; i < times.length; i++) {
    data[times[i]] = {
      speed: speeds[i],
      direction: directions[i],
    };
  }
  return data;
}

function findClosestTime(data, targetTime) {
  const targetMs = targetTime.getTime();
  let closest = null;
  let closestDiff = Infinity;
  
  for (const time of Object.keys(data)) {
    const diff = Math.abs(new Date(time).getTime() - targetMs);
    if (diff < closestDiff && diff < 30 * 60 * 1000) { // Within 30 minutes
      closestDiff = diff;
      closest = time;
    }
  }
  return closest;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           WIND INDICATOR ANALYSIS FOR NEW LOCATION                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${TARGET_LOCATION.name}`);
  console.log(`Coordinates: ${TARGET_LOCATION.coordinates.lat}, ${TARGET_LOCATION.coordinates.lng}`);
  
  // Step 1: Search for nearby stations
  const nearbyStations = await searchNearbyStations();
  
  // Step 2: Identify good wind days at target
  const goodDays = await identifyGoodWindDays(TARGET_LOCATION.targetStationId);
  
  // Step 3: Correlate indicator stations
  await correlateIndicators(goodDays, CANDIDATE_INDICATORS);
  
  // Step 4: Validate specific correlation (uncomment and fill in to run)
  // await validateCorrelation('KSLC', 'FPS', 1);
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nNext steps:');
  console.log('1. Review the station list and add promising candidates to CANDIDATE_INDICATORS');
  console.log('2. Re-run to get correlation analysis');
  console.log('3. For best candidates, uncomment validateCorrelation() call');
  console.log('4. Add validated indicators to src/config/indicatorSystem.js');
}

main().catch(console.error);
