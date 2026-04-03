#!/bin/bash
# generate-utah-pmtiles-simple.sh
# Creates Utah water PMTiles using Overpass API (no osmium needed)
# Prerequisites: tippecanoe, curl, jq
#
# Run from WSL: bash scripts/generate-utah-pmtiles-simple.sh

set -e

echo "========================================"
echo "  Utah Water PMTiles Generator"
echo "========================================"
echo ""

TEMP_DIR="/tmp/utah-water-pmtiles"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Get the repo root (handle both WSL and native paths)
if [ -n "$1" ]; then
    OUTPUT_DIR="$1"
else
    # Default to current script's repo
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    OUTPUT_DIR="$(dirname "$SCRIPT_DIR")/apps/water/public"
fi

echo "[1/3] Downloading Utah water features from Overpass API..."
echo "  (This queries OpenStreetMap for all named water features in Utah)"
echo ""

# Utah bounding box: 36.9979,-114.0529,42.0016,-109.0410
BBOX="36.9979,-114.0529,42.0016,-109.0410"

# Overpass query for named water features
QUERY='[out:json][timeout:300][bbox:'"$BBOX"'];
(
  // Named lakes, reservoirs, ponds
  way["natural"="water"]["name"];
  relation["natural"="water"]["name"];
  
  // Named rivers, streams, creeks
  way["waterway"]["name"];
  relation["waterway"]["name"];
  
  // Named water areas
  way["water"]["name"];
  relation["water"]["name"];
);
out geom;'

echo "  Querying Overpass API (may take 1-2 minutes)..."
curl -s -X POST "https://overpass-api.de/api/interpreter" \
    --data-urlencode "data=$QUERY" \
    -o "$TEMP_DIR/overpass-result.json"

echo "  Download complete!"

echo ""
echo "[2/3] Converting to GeoJSON..."

# Convert Overpass JSON to GeoJSON using Node.js
node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("'"$TEMP_DIR"'/overpass-result.json", "utf8"));

const features = [];

function processElement(el) {
    if (!el.tags?.name) return null;
    
    let geometry = null;
    
    if (el.type === "way" && el.geometry) {
        // Way with geometry
        const coords = el.geometry.map(p => [p.lon, p.lat]);
        
        // Check if its a closed polygon (first == last point)
        const isPolygon = coords.length > 3 && 
            coords[0][0] === coords[coords.length-1][0] &&
            coords[0][1] === coords[coords.length-1][1];
        
        geometry = {
            type: isPolygon ? "Polygon" : "LineString",
            coordinates: isPolygon ? [coords] : coords
        };
    } else if (el.type === "relation" && el.members) {
        // For relations, try to build geometry from members
        const ways = el.members.filter(m => m.type === "way" && m.geometry);
        if (ways.length > 0) {
            // Simplified: just use first way as representative
            const coords = ways[0].geometry.map(p => [p.lon, p.lat]);
            geometry = {
                type: "LineString", 
                coordinates: coords
            };
        }
    } else if (el.type === "node" && el.lat && el.lon) {
        geometry = {
            type: "Point",
            coordinates: [el.lon, el.lat]
        };
    }
    
    if (!geometry) return null;
    
    // Determine water type
    let waterType = "water";
    const tags = el.tags || {};
    
    if (tags.waterway) {
        waterType = tags.waterway; // river, stream, canal, etc.
    } else if (tags.water) {
        waterType = tags.water; // lake, reservoir, pond, etc.
    } else if (tags.natural === "water") {
        waterType = "lake";
    }
    
    return {
        type: "Feature",
        geometry: geometry,
        properties: {
            name: tags.name,
            type: waterType,
            natural: tags.natural || null,
            waterway: tags.waterway || null,
            water: tags.water || null,
            intermittent: tags.intermittent || null
        }
    };
}

for (const el of data.elements || []) {
    const feature = processElement(el);
    if (feature) features.push(feature);
}

const geojson = {
    type: "FeatureCollection", 
    features: features
};

fs.writeFileSync("'"$TEMP_DIR"'/utah-water.geojson", JSON.stringify(geojson));
console.log("  Features converted: " + features.length);

// Show some stats
const types = {};
features.forEach(f => {
    const t = f.properties.type;
    types[t] = (types[t] || 0) + 1;
});
console.log("  By type:", JSON.stringify(types));
'

echo ""
echo "[3/3] Generating PMTiles with tippecanoe..."

PMTILES_FILE="$TEMP_DIR/utah-water.pmtiles"

tippecanoe \
    -o "$PMTILES_FILE" \
    -l water \
    --name "Utah Water Features" \
    --description "OpenStreetMap water features for Utah" \
    --attribution "© OpenStreetMap contributors" \
    --minimum-zoom=4 \
    --maximum-zoom=14 \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --force \
    "$TEMP_DIR/utah-water.geojson"

FILE_SIZE=$(du -h "$PMTILES_FILE" | cut -f1)
echo "  Generated: $FILE_SIZE"

echo ""
echo "Moving to output directory..."

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"
cp "$PMTILES_FILE" "$OUTPUT_DIR/utah-water.pmtiles"

echo ""
echo "========================================"
echo "  SUCCESS!"
echo "========================================"
echo ""
echo "File: $OUTPUT_DIR/utah-water.pmtiles"
echo "Layer: water"
echo ""
echo "Properties on each feature:"
echo "  - name: Water body name"
echo "  - type: river, stream, lake, reservoir, etc."
echo "  - waterway: OSM waterway tag"
echo "  - water: OSM water tag"
echo ""
echo "Set in .env: VITE_PMTILES_WATER_URL=/utah-water.pmtiles"
