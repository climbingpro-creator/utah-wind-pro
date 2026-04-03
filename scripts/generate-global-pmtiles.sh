#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Global PMTiles Generation Script
# 
# This script downloads OpenStreetMap water features and converts them to
# PMTiles format for use in the global fishing intelligence platform.
#
# Prerequisites:
#   - osmium-tool: https://osmcode.org/osmium-tool/
#   - tippecanoe: https://github.com/mapbox/tippecanoe
#   - ogr2ogr (GDAL): https://gdal.org/
#   - ~50GB disk space for processing
#
# Output: global-water.pmtiles (~1-2GB)
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Global Water PMTiles Generator"
echo "  For: liftforecast.com / notwindy.com"
echo "═══════════════════════════════════════════════════════════════════════"

# Configuration
WORK_DIR="./pmtiles-build"
OUTPUT_FILE="global-water.pmtiles"

# Create work directory
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo ""
echo "Step 1: Download OpenStreetMap water extracts"
echo "─────────────────────────────────────────────"

# Option A: Download from Geofabrik (regional extracts)
# Uncomment the regions you need:

# North America
# wget -c https://download.geofabrik.de/north-america-latest.osm.pbf

# Europe
# wget -c https://download.geofabrik.de/europe-latest.osm.pbf

# Option B: Download global water extract from OSM (smaller, water-only)
# This is a pre-filtered extract containing only water features
echo "Downloading global water features..."
# Note: You may need to create this extract yourself using osmium

# For a quick test, use a smaller region:
if [ ! -f "utah-latest.osm.pbf" ]; then
  echo "Downloading Utah extract for testing..."
  wget -c https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf
fi

echo ""
echo "Step 2: Extract water features using osmium"
echo "─────────────────────────────────────────────"

# Filter for water-related tags
osmium tags-filter utah-latest.osm.pbf \
  natural=water \
  water=lake,reservoir,pond,river,stream,canal,lagoon,oxbow \
  waterway=river,stream,canal,drain \
  natural=coastline \
  natural=bay \
  -o water-features.osm.pbf

echo ""
echo "Step 3: Convert to GeoJSON"
echo "─────────────────────────────────────────────"

# Convert to GeoJSON (lakes as polygons, rivers as lines)
ogr2ogr -f GeoJSON lakes.geojson water-features.osm.pbf multipolygons \
  -where "natural='water' OR water IS NOT NULL"

ogr2ogr -f GeoJSON rivers.geojson water-features.osm.pbf lines \
  -where "waterway IS NOT NULL"

echo ""
echo "Step 4: Generate PMTiles with tippecanoe"
echo "─────────────────────────────────────────────"

# Generate PMTiles with optimized settings for web display
tippecanoe \
  -o "$OUTPUT_FILE" \
  --name="Global Water Features" \
  --description="OpenStreetMap water bodies for fishing intelligence" \
  --attribution="© OpenStreetMap contributors" \
  --layer=lakes \
  --layer=rivers \
  --minimum-zoom=0 \
  --maximum-zoom=14 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --coalesce-densest-as-needed \
  --detect-shared-borders \
  --simplification=10 \
  --force \
  lakes.geojson rivers.geojson

echo ""
echo "Step 5: Verify output"
echo "─────────────────────────────────────────────"

# Check file size
ls -lh "$OUTPUT_FILE"

# Inspect metadata
pmtiles show "$OUTPUT_FILE"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  SUCCESS: $OUTPUT_FILE generated"
echo ""
echo "  Next steps:"
echo "  1. Upload to Supabase Storage: map-data bucket"
echo "  2. Update .env: VITE_PMTILES_WATER_URL=<supabase-url>"
echo "  3. Deploy and test"
echo "═══════════════════════════════════════════════════════════════════════"
