#!/usr/bin/env node
/**
 * USGS Gauge Coordinate Verification Script
 * 
 * This script:
 * 1. Fetches all active USGS water gauges in Utah from the USGS API
 * 2. Displays their official coordinates
 * 3. Can be extended to compare against any local storage
 * 
 * Usage: node scripts/verify-usgs-coordinates.mjs
 */

const USGS_SITE_API = 'https://waterservices.usgs.gov/nwis/site/';

// Utah bounding box (approximate)
const UTAH_BOUNDS = {
  west: -114.05,
  south: 36.99,
  east: -109.04,
  north: 42.00,
};

async function fetchUtahUSGSGauges() {
  const params = new URLSearchParams({
    format: 'json',
    stateCd: 'UT',
    siteType: 'ST', // Stream sites
    siteStatus: 'active',
    hasDataTypeCd: 'iv', // Has instantaneous values (real-time data)
  });

  const url = `${USGS_SITE_API}?${params.toString()}`;
  console.log('Fetching USGS gauges from:', url);
  console.log('');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status}`);
  }

  const data = await response.json();
  const sites = data.value?.timeSeries || [];
  
  // The site endpoint returns different structure
  // Let's use the rdb format which is easier to parse
  return fetchUtahUSGSGaugesRDB();
}

async function fetchUtahUSGSGaugesRDB() {
  const params = new URLSearchParams({
    format: 'rdb',
    stateCd: 'UT',
    siteType: 'ST',
    siteStatus: 'active',
    hasDataTypeCd: 'iv',
    siteOutput: 'expanded',
  });

  const url = `${USGS_SITE_API}?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n').filter(line => !line.startsWith('#') && line.trim());
  
  if (lines.length < 2) {
    console.log('No data returned from USGS API');
    return [];
  }

  // First non-comment line is headers, second is data types, rest is data
  const headers = lines[0].split('\t');
  const siteNoIdx = headers.indexOf('site_no');
  const nameIdx = headers.indexOf('station_nm');
  const latIdx = headers.indexOf('dec_lat_va');
  const lngIdx = headers.indexOf('dec_long_va');
  const altIdx = headers.indexOf('alt_va');
  const drainIdx = headers.indexOf('drain_area_va');

  const gauges = [];
  
  // Skip header and data type rows
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < Math.max(siteNoIdx, nameIdx, latIdx, lngIdx) + 1) continue;
    
    const siteNo = cols[siteNoIdx];
    const name = cols[nameIdx];
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    const alt = parseFloat(cols[altIdx]) || null;
    const drainArea = parseFloat(cols[drainIdx]) || null;

    if (siteNo && !isNaN(lat) && !isNaN(lng)) {
      gauges.push({
        siteId: siteNo,
        name,
        lat,
        lng,
        elevation: alt,
        drainageArea: drainArea,
      });
    }
  }

  return gauges;
}

async function main() {
  console.log('='.repeat(80));
  console.log('USGS Water Gauge Coordinate Verification for Utah');
  console.log('='.repeat(80));
  console.log('');

  try {
    const gauges = await fetchUtahUSGSGaugesRDB();
    
    console.log(`Found ${gauges.length} active USGS stream gauges in Utah\n`);
    console.log('-'.repeat(80));
    console.log('Site ID     | Latitude    | Longitude    | Name');
    console.log('-'.repeat(80));

    // Sort by site ID
    gauges.sort((a, b) => a.siteId.localeCompare(b.siteId));

    for (const gauge of gauges) {
      const siteId = gauge.siteId.padEnd(11);
      const lat = gauge.lat.toFixed(6).padStart(11);
      const lng = gauge.lng.toFixed(6).padStart(12);
      console.log(`${siteId} | ${lat} | ${lng} | ${gauge.name}`);
    }

    console.log('-'.repeat(80));
    console.log(`\nTotal: ${gauges.length} gauges`);

    // Look for specific gauge mentioned by user
    const dryCreek = gauges.find(g => g.siteId === '10165600');
    if (dryCreek) {
      console.log('\n' + '='.repeat(80));
      console.log('SPECIFIC GAUGE CHECK: 10165600 (Dry Creek at Alpine)');
      console.log('='.repeat(80));
      console.log(`Official USGS Coordinates:`);
      console.log(`  Latitude:  ${dryCreek.lat}`);
      console.log(`  Longitude: ${dryCreek.lng}`);
      console.log(`  Name:      ${dryCreek.name}`);
      console.log('');
      console.log('If your app shows different coordinates, the issue is in how');
      console.log('the app stores or displays gauge locations, not in the USGS API.');
    }

    // Export to JSON for further processing
    const outputPath = './scripts/utah-usgs-gauges.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(gauges, null, 2));
    console.log(`\nExported gauge data to: ${outputPath}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
