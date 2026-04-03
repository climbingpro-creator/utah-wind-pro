#!/bin/bash
# generate-utah-pmtiles-osm.sh
# Creates Utah water PMTiles from OpenStreetMap data (faster/smaller than NHD)
# Prerequisites: tippecanoe, osmium-tool, curl
#
# Run from WSL: bash scripts/generate-utah-pmtiles-osm.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$REPO_ROOT/apps/water/public"
TEMP_DIR="/tmp/utah-osm-water"

echo "========================================"
echo "  Utah Water PMTiles Generator (OSM)"
echo "========================================"
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

echo "[1/4] Downloading Utah OSM extract..."
# Geofabrik provides state-level extracts (~100MB for Utah)
OSM_URL="https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf"
OSM_FILE="$TEMP_DIR/utah-latest.osm.pbf"

if [ ! -f "$OSM_FILE" ]; then
    echo "  Downloading from Geofabrik (~100MB)..."
    curl -L -o "$OSM_FILE" "$OSM_URL"
    echo "  Download complete!"
else
    echo "  Using cached download."
fi

echo ""
echo "[2/4] Extracting water features with osmium..."

WATER_PBF="$TEMP_DIR/utah-water.osm.pbf"
WATER_JSON="$TEMP_DIR/utah-water.geojson"

# Extract only water-related features
# natural=water, waterway=*, water=*
osmium tags-filter "$OSM_FILE" \
    n/natural=water \
    w/natural=water \
    r/natural=water \
    w/waterway \
    r/waterway \
    w/water \
    r/water \
    -o "$WATER_PBF" --overwrite

echo "  Extracted water features!"

echo ""
echo "[3/4] Converting to GeoJSON and generating PMTiles..."

# Use osmium export to get GeoJSON, then tippecanoe
osmium export "$WATER_PBF" -o "$WATER_JSON" --overwrite -f geojson

# Count features
FEATURE_COUNT=$(grep -c '"type":"Feature"' "$WATER_JSON" || echo "0")
echo "  Features extracted: $FEATURE_COUNT"

PMTILES_OUTPUT="$TEMP_DIR/utah-water.pmtiles"

echo "  Running tippecanoe..."
tippecanoe \
    -o "$PMTILES_OUTPUT" \
    -l water \
    --name "Utah Water Features" \
    --description "OpenStreetMap water features for Utah" \
    --attribution "© OpenStreetMap contributors" \
    --minimum-zoom=4 \
    --maximum-zoom=14 \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --coalesce-densest-as-needed \
    --force \
    "$WATER_JSON"

FILE_SIZE=$(du -h "$PMTILES_OUTPUT" | cut -f1)
echo "  Generated: $FILE_SIZE"

echo ""
echo "[4/4] Moving to public folder..."

# Convert to Windows path if running in WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    # We're in WSL, convert path
    WIN_OUTPUT=$(wslpath -w "$OUTPUT_DIR")
    cp "$PMTILES_OUTPUT" "$OUTPUT_DIR/utah-water.pmtiles"
    echo "  Copied to: $WIN_OUTPUT\\utah-water.pmtiles"
else
    cp "$PMTILES_OUTPUT" "$OUTPUT_DIR/utah-water.pmtiles"
    echo "  Copied to: $OUTPUT_DIR/utah-water.pmtiles"
fi

echo ""
echo "========================================"
echo "  SUCCESS!"
echo "========================================"
echo ""
echo "Layer name: water"
echo ""
echo "Properties available on each feature:"
echo "  - name (water body name)"
echo "  - natural (water, wetland, etc.)"
echo "  - waterway (river, stream, canal, etc.)"
echo "  - water (lake, reservoir, pond, etc.)"
echo ""
echo "To use in your app, set:"
echo "  VITE_PMTILES_WATER_URL=/utah-water.pmtiles"
echo ""
echo "To inspect: pmtiles show $OUTPUT_DIR/utah-water.pmtiles"
