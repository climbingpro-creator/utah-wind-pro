# generate-utah-pmtiles.ps1
# Creates a Utah water PMTiles file from USGS NHD (National Hydrography Dataset)
# Prerequisites: Node.js, tippecanoe (via WSL or native), ogr2ogr (GDAL)

param(
    [string]$OutputDir = "apps/water/public",
    [string]$TempDir = "$env:TEMP/utah-nhd",
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Utah Water PMTiles Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create temp directory
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

Write-Host "[1/5] Downloading USGS NHD data for Utah..." -ForegroundColor Yellow

# USGS NHD High Resolution for Utah (HUC4 regions covering Utah)
# Utah is primarily covered by these HUC4 regions: 1401, 1402, 1403, 1601, 1602, 1603
# We'll use the state-based extract which is simpler

$nhdUrl = "https://prd-tnm.s3.amazonaws.com/StagedProducts/Hydrography/NHD/State/GDB/NHD_H_Utah_State_GDB.zip"
$zipPath = "$TempDir/NHD_H_Utah_State_GDB.zip"
$gdbPath = "$TempDir/NHD_H_Utah_State_GDB.gdb"

if (-not (Test-Path $zipPath)) {
    Write-Host "  Downloading from USGS (~500MB)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $nhdUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "  Download complete!" -ForegroundColor Green
} else {
    Write-Host "  Using cached download." -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2/5] Extracting GeoDatabase..." -ForegroundColor Yellow

if (-not (Test-Path "$TempDir/NHD_H_Utah_State_GDB")) {
    Expand-Archive -Path $zipPath -DestinationPath $TempDir -Force
    Write-Host "  Extracted!" -ForegroundColor Green
} else {
    Write-Host "  Already extracted." -ForegroundColor Gray
}

# Find the actual .gdb folder
$gdbFolder = Get-ChildItem -Path $TempDir -Filter "*.gdb" -Directory -Recurse | Select-Object -First 1
if (-not $gdbFolder) {
    Write-Error "Could not find .gdb folder in extracted archive"
    exit 1
}
$gdbPath = $gdbFolder.FullName
Write-Host "  Found GDB: $gdbPath" -ForegroundColor Gray

Write-Host ""
Write-Host "[3/5] Converting to GeoJSON with ogr2ogr..." -ForegroundColor Yellow

# We need these layers from NHD:
# - NHDWaterbody (lakes, reservoirs, ponds)
# - NHDFlowline (rivers, streams, canals)
# - NHDArea (larger water areas)

$waterbodyJson = "$TempDir/waterbody.geojson"
$flowlineJson = "$TempDir/flowline.geojson"
$combinedJson = "$TempDir/utah-water-combined.geojson"

# Check if ogr2ogr is available
$ogr2ogr = Get-Command ogr2ogr -ErrorAction SilentlyContinue
if (-not $ogr2ogr) {
    Write-Host "  ogr2ogr not found. Trying via OSGeo4W..." -ForegroundColor Gray
    $osgeoPath = "C:\OSGeo4W\bin\ogr2ogr.exe"
    if (Test-Path $osgeoPath) {
        $ogr2ogr = $osgeoPath
    } else {
        Write-Error @"
ogr2ogr (GDAL) is required but not found.
Install options:
  - Windows: Download OSGeo4W from https://trac.osgeo.org/osgeo4w/
  - Or use: conda install gdal
  - Or use WSL: sudo apt install gdal-bin
"@
        exit 1
    }
}

Write-Host "  Extracting NHDWaterbody (lakes, reservoirs)..." -ForegroundColor Gray
& ogr2ogr -f GeoJSON $waterbodyJson $gdbPath NHDWaterbody `
    -select "GNIS_Name,FType,FCode" `
    -where "GNIS_Name IS NOT NULL" `
    -t_srs "EPSG:4326" 2>$null

Write-Host "  Extracting NHDFlowline (rivers, streams)..." -ForegroundColor Gray
& ogr2ogr -f GeoJSON $flowlineJson $gdbPath NHDFlowline `
    -select "GNIS_Name,FType,FCode" `
    -where "GNIS_Name IS NOT NULL" `
    -t_srs "EPSG:4326" 2>$null

Write-Host "  Merging layers..." -ForegroundColor Green

# Use Node.js to merge and normalize the GeoJSON files
$mergeScript = @"
const fs = require('fs');

// FType codes for reference:
// Waterbody: 390=Lake/Pond, 436=Reservoir, 466=Swamp/Marsh
// Flowline: 460=Stream/River, 558=Canal/Ditch, 336=Canal, 334=Connector

const waterbodyPath = '$($waterbodyJson -replace '\\', '/')';
const flowlinePath = '$($flowlineJson -replace '\\', '/')';
const outputPath = '$($combinedJson -replace '\\', '/')';

const features = [];

// Process waterbodies (lakes, reservoirs)
if (fs.existsSync(waterbodyPath)) {
    const wb = JSON.parse(fs.readFileSync(waterbodyPath, 'utf8'));
    console.log('  Waterbodies:', wb.features?.length || 0);
    (wb.features || []).forEach(f => {
        if (f.properties?.GNIS_Name) {
            features.push({
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    name: f.properties.GNIS_Name,
                    type: f.properties.FType === 436 ? 'reservoir' : 'lake',
                    fcode: f.properties.FCode,
                    class: 'waterbody'
                }
            });
        }
    });
}

// Process flowlines (rivers, streams)
if (fs.existsSync(flowlinePath)) {
    const fl = JSON.parse(fs.readFileSync(flowlinePath, 'utf8'));
    console.log('  Flowlines:', fl.features?.length || 0);
    (fl.features || []).forEach(f => {
        if (f.properties?.GNIS_Name) {
            const name = f.properties.GNIS_Name;
            let type = 'stream';
            if (name.toLowerCase().includes('river')) type = 'river';
            else if (name.toLowerCase().includes('creek')) type = 'creek';
            else if (name.toLowerCase().includes('canal')) type = 'canal';
            
            features.push({
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    name: name,
                    type: type,
                    fcode: f.properties.FCode,
                    class: 'flowline'
                }
            });
        }
    });
}

const combined = {
    type: 'FeatureCollection',
    features: features
};

fs.writeFileSync(outputPath, JSON.stringify(combined));
console.log('  Total features:', features.length);
"@

$mergeScript | node -

Write-Host ""
Write-Host "[4/5] Generating PMTiles with tippecanoe..." -ForegroundColor Yellow

$pmtilesOutput = "$TempDir/utah-water.pmtiles"

# Check for tippecanoe
$tippecanoe = Get-Command tippecanoe -ErrorAction SilentlyContinue
if (-not $tippecanoe) {
    Write-Host "  tippecanoe not found natively. Trying WSL..." -ForegroundColor Gray
    
    # Convert Windows paths to WSL paths
    $wslInput = wsl wslpath -u "$combinedJson"
    $wslOutput = wsl wslpath -u "$pmtilesOutput"
    
    wsl tippecanoe `
        -o $wslOutput `
        -l water `
        --name "Utah Water Features" `
        --description "USGS NHD water features for Utah" `
        --attribution "USGS National Hydrography Dataset" `
        --minimum-zoom=4 `
        --maximum-zoom=14 `
        --drop-densest-as-needed `
        --extend-zooms-if-still-dropping `
        --force `
        $wslInput
} else {
    & tippecanoe `
        -o $pmtilesOutput `
        -l water `
        --name "Utah Water Features" `
        --description "USGS NHD water features for Utah" `
        --attribution "USGS National Hydrography Dataset" `
        --minimum-zoom=4 `
        --maximum-zoom=14 `
        --drop-densest-as-needed `
        --extend-zooms-if-still-dropping `
        --force `
        $combinedJson
}

if (-not (Test-Path $pmtilesOutput)) {
    Write-Error "tippecanoe failed to generate PMTiles"
    exit 1
}

$fileSize = (Get-Item $pmtilesOutput).Length / 1MB
Write-Host "  Generated: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Moving to public folder..." -ForegroundColor Yellow

$finalPath = "$OutputDir/utah-water.pmtiles"
Copy-Item $pmtilesOutput -Destination $finalPath -Force
Write-Host "  Copied to: $finalPath" -ForegroundColor Green

# Cleanup
if (-not $KeepTemp) {
    Write-Host ""
    Write-Host "Cleaning up temp files..." -ForegroundColor Gray
    # Keep the zip for future runs, delete the rest
    Remove-Item "$TempDir/*.geojson" -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "PMTiles file: $finalPath" -ForegroundColor Cyan
Write-Host "Layer name: water" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use in your app, set:" -ForegroundColor Yellow
Write-Host "  VITE_PMTILES_WATER_URL=/utah-water.pmtiles" -ForegroundColor White
Write-Host ""
Write-Host "To inspect the file:" -ForegroundColor Yellow
Write-Host "  .\pmtiles.exe show $finalPath" -ForegroundColor White
