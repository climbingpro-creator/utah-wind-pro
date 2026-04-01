#!/usr/bin/env node
/**
 * generate-utah-pmtiles.mjs
 * Downloads Utah water features from OpenStreetMap and generates a PMTiles file
 * 
 * Prerequisites:
 * - Node.js 18+
 * - tippecanoe (in WSL or native)
 * 
 * Usage: node scripts/generate-utah-pmtiles.mjs
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(REPO_ROOT, 'apps', 'water', 'public');
const TEMP_DIR = join(REPO_ROOT, '.tmp-pmtiles');

console.log('========================================');
console.log('  Utah Water PMTiles Generator');
console.log('========================================');
console.log('');

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

// Step 1: Download from Overpass API
console.log('[1/3] Downloading Utah water features from Overpass API...');
console.log('      (This may take 1-2 minutes)');

// Utah bounding box
const bbox = '36.9979,-114.0529,42.0016,-109.0410';

// Try main Overpass server first
const overpassUrl = 'https://overpass-api.de/api/interpreter';

// Single comprehensive query that gets:
// 1. All named water ways
// 2. All ways that are members of named waterway relations (with the relation name)
const query = `
[out:json][timeout:600][bbox:${bbox}];

// Get directly named water features
(
  way["natural"="water"]["name"];
  way["waterway"]["name"];
  way["water"]["name"];
  relation["natural"="water"]["name"];
  relation["waterway"]["name"];
  relation["water"]["name"];
);
out geom;
`;

try {
  const response = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });
  
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`      Downloaded ${data.elements?.length || 0} elements`);
  
  // Step 2: Convert to GeoJSON
  console.log('');
  console.log('[2/3] Converting to GeoJSON...');
  
  const features = [];
  const typeStats = {};
  
  for (const el of data.elements || []) {
    if (!el.tags?.name) continue;
    
    let geometry = null;
    
    if (el.type === 'way' && el.geometry) {
      const coords = el.geometry.map(p => [p.lon, p.lat]);
      
      // Check if closed polygon
      const isPolygon = coords.length > 3 &&
        Math.abs(coords[0][0] - coords[coords.length - 1][0]) < 0.0001 &&
        Math.abs(coords[0][1] - coords[coords.length - 1][1]) < 0.0001;
      
      geometry = {
        type: isPolygon ? 'Polygon' : 'LineString',
        coordinates: isPolygon ? [coords] : coords
      };
    } else if (el.type === 'relation' && el.members) {
      // For relations, collect all way geometries
      const allCoords = [];
      for (const member of el.members) {
        if (member.type === 'way' && member.geometry) {
          const coords = member.geometry.map(p => [p.lon, p.lat]);
          allCoords.push(coords);
        }
      }
      if (allCoords.length > 0) {
        // Use MultiLineString for relations with multiple ways
        geometry = allCoords.length === 1 
          ? { type: 'LineString', coordinates: allCoords[0] }
          : { type: 'MultiLineString', coordinates: allCoords };
      }
    }
    
    if (!geometry) continue;
    
    // Determine water type
    let waterType = 'water';
    const tags = el.tags;
    
    if (tags.waterway) {
      waterType = tags.waterway; // river, stream, canal, drain, etc.
    } else if (tags.water) {
      waterType = tags.water; // lake, reservoir, pond, etc.
    } else if (tags.natural === 'water') {
      waterType = 'lake';
    }
    
    // Track stats
    typeStats[waterType] = (typeStats[waterType] || 0) + 1;
    
    features.push({
      type: 'Feature',
      geometry,
      properties: {
        name: tags.name,
        type: waterType,
        natural: tags.natural || null,
        waterway: tags.waterway || null,
        water: tags.water || null,
        intermittent: tags.intermittent === 'yes' ? true : null
      }
    });
  }
  
  const geojson = {
    type: 'FeatureCollection',
    features
  };
  
  const geojsonPath = join(TEMP_DIR, 'utah-water.geojson');
  writeFileSync(geojsonPath, JSON.stringify(geojson));
  
  console.log(`      Converted ${features.length} features`);
  console.log('      Types:', JSON.stringify(typeStats));
  
  // Debug: Check for specific features
  const strawberryFeatures = features.filter(f => 
    f.properties?.name?.toLowerCase().includes('strawberry')
  );
  console.log(`      Strawberry features: ${strawberryFeatures.length}`);
  strawberryFeatures.forEach(f => 
    console.log(`        - ${f.properties.name} (${f.properties.type || f.properties.waterway})`)
  );
  
  // Step 3: Generate PMTiles with tippecanoe
  console.log('');
  console.log('[3/3] Generating PMTiles with tippecanoe...');
  
  const pmtilesPath = join(TEMP_DIR, 'utah-water.pmtiles');
  const finalPath = join(OUTPUT_DIR, 'utah-water.pmtiles');
  
  // Try WSL first (Windows), then native
  const isWindows = process.platform === 'win32';
  
  let tippecanoeCmd;
  if (isWindows) {
    // Convert Windows paths to WSL paths
    const wslGeojson = execSync(`wsl wslpath -u "${geojsonPath}"`).toString().trim();
    const wslOutput = execSync(`wsl wslpath -u "${pmtilesPath}"`).toString().trim();
    
    tippecanoeCmd = `wsl tippecanoe -o "${wslOutput}" -l water --name "Utah Water Features" --description "OpenStreetMap water features for Utah" --attribution "© OpenStreetMap contributors" --minimum-zoom=4 --maximum-zoom=14 --drop-densest-as-needed --extend-zooms-if-still-dropping --force "${wslGeojson}"`;
  } else {
    tippecanoeCmd = `tippecanoe -o "${pmtilesPath}" -l water --name "Utah Water Features" --description "OpenStreetMap water features for Utah" --attribution "© OpenStreetMap contributors" --minimum-zoom=4 --maximum-zoom=14 --drop-densest-as-needed --extend-zooms-if-still-dropping --force "${geojsonPath}"`;
  }
  
  console.log('      Running tippecanoe...');
  execSync(tippecanoeCmd, { stdio: 'inherit' });
  
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Copy to final location
  if (isWindows) {
    execSync(`copy "${pmtilesPath}" "${finalPath}"`, { shell: 'cmd.exe' });
  } else {
    execSync(`cp "${pmtilesPath}" "${finalPath}"`);
  }
  
  // Get file size
  const { statSync } = await import('fs');
  const stats = statSync(finalPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log('');
  console.log('========================================');
  console.log('  SUCCESS!');
  console.log('========================================');
  console.log('');
  console.log(`File: ${finalPath}`);
  console.log(`Size: ${sizeMB} MB`);
  console.log('Layer: water');
  console.log('');
  console.log('Properties on each feature:');
  console.log('  - name: Water body name (e.g., "Provo River")');
  console.log('  - type: river, stream, lake, reservoir, canal, etc.');
  console.log('  - waterway: OSM waterway tag');
  console.log('  - water: OSM water tag');
  console.log('');
  console.log('To use in your app, set in .env:');
  console.log('  VITE_PMTILES_WATER_URL=/utah-water.pmtiles');
  console.log('');
  
  // Cleanup
  try {
    unlinkSync(geojsonPath);
    unlinkSync(pmtilesPath);
  } catch (e) {
    // Ignore cleanup errors
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
