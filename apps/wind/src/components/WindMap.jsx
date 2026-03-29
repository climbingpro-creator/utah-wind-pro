import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Maximize2, X, Wind } from 'lucide-react';
import { LAKE_CONFIGS, SpatialInterpolator, applySurfacePhysics } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';
import PinDropListener from './map/PinDropListener';
import SyntheticForecastCard from './map/SyntheticForecastCard';
// Fix Leaflet default marker icon issue (use matching 1.9.4 assets)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map configurations for each area with all relevant weather stations
const MAP_AREAS = {
  'utah-lake': {
    name: 'Utah Lake',
    center: [40.23, -111.83],
    zoom: 11,
    launches: ['utah-lake-lincoln', 'utah-lake-sandy', 'utah-lake-vineyard', 'utah-lake-zigzag', 'utah-lake-mm19'],
    stations: [
      // MesoWest Stations
      { id: 'FPS', name: 'Flight Park South', lat: 40.4555, lng: -111.9208, type: 'mesowest', elevation: 5202 },
      // KPVU - SOUTHERN LAUNCH INDICATOR (Best for Lincoln Beach & Sandy Beach)
      // 78% foil kiteable at 8-10 mph N - better than KSLC for southern launches
      { id: 'KPVU', name: 'Provo Airport', lat: 40.2192, lng: -111.7236, type: 'mesowest', elevation: 4495, isNorthFlowIndicator: true, isSouthernIndicator: true },
      // KSLC - NORTH FLOW EARLY INDICATOR (1-hour lead time)
      // 74% of good north days show N/NW/NE at KSLC 1-2 hours before Utah Lake
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226, isNorthFlowIndicator: true },
      { id: 'QLN', name: 'Lindon', lat: 40.3431, lng: -111.7136, type: 'mesowest', elevation: 4738 },
      // UTALP - POINT OF MOUNTAIN GAP WIND INDICATOR
      // Shows wind funneling through the gap - good confirmation for north flow
      { id: 'UTALP', name: 'Point of Mountain', lat: 40.4456, lng: -111.8983, type: 'mesowest', elevation: 4796, isNorthFlowIndicator: true, isGapIndicator: true },
      // Ridge stations for thermal delta
      { id: 'CSC', name: 'Cascade Peak', lat: 40.2667, lng: -111.6167, type: 'mesowest', elevation: 10875, isRidge: true },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      // Spanish Fork Canyon - SE THERMAL EARLY INDICATOR (2-hour lead time)
      { id: 'QSF', name: 'Spanish Fork', lat: 40.115, lng: -111.655, type: 'mesowest', elevation: 4550, isEarlyIndicator: true },
      // Your PWS
      { id: 'PWS', name: 'Zig Zag PWS', lat: 40.30268164473557, lng: -111.8799503518146, type: 'pws', elevation: 4489 },
    ],
  },
  'deer-creek': {
    name: 'Deer Creek',
    center: [40.42, -111.51],
    zoom: 12,
    launches: ['deer-creek'],
    stations: [
      // Key stations for Deer Creek
      { id: 'DCC', name: 'Deer Creek Dam', lat: 40.4028, lng: -111.5097, type: 'mesowest', elevation: 5417 },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      { id: 'KHCR', name: 'Heber Airport', lat: 40.4822, lng: -111.4286, type: 'mesowest', elevation: 5597 },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      // Charleston area
      { id: 'CHL', name: 'Charleston', lat: 40.4750, lng: -111.4750, type: 'mesowest', elevation: 5600 },
    ],
  },
  'willard-bay': {
    name: 'Willard Bay',
    center: [41.38, -112.08],
    zoom: 11,
    launches: ['willard-bay'],
    stations: [
      { id: 'KOGD', name: 'Ogden Airport', lat: 41.1961, lng: -112.0122, type: 'mesowest', elevation: 4440 },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226 },
      { id: 'KHIF', name: 'Hill AFB', lat: 41.1239, lng: -111.9731, type: 'mesowest', elevation: 4789 },
      { id: 'BLM', name: 'Ben Lomond', lat: 41.3667, lng: -111.9500, type: 'mesowest', elevation: 9712, isRidge: true },
    ],
  },
};

// Custom marker icons
const createLaunchIcon = (isSelected) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: ${isSelected ? '20px' : '14px'};
    height: ${isSelected ? '20px' : '14px'};
    background: ${isSelected ? '#22d3ee' : '#64748b'};
    border: 2px solid ${isSelected ? '#06b6d4' : '#475569'};
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
  iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
});

const createStationIcon = (type, isRidge, hasData, isEarlyIndicator, isNorthFlowIndicator) => {
  let color, borderColor, shape;
  const isIndicator = isEarlyIndicator || isNorthFlowIndicator;
  
  if (type === 'pws') {
    color = '#22d3ee'; // Cyan for your PWS
    borderColor = '#06b6d4';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isNorthFlowIndicator) {
    color = '#3b82f6'; // Blue for north flow indicator
    borderColor = '#2563eb';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isEarlyIndicator) {
    color = '#10b981'; // Green for SE thermal early indicator
    borderColor = '#059669';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isRidge) {
    color = '#a855f7'; // Purple for ridge/mountain stations
    borderColor = '#9333ea';
    shape = 'border-radius: 2px; transform: rotate(45deg);'; // Diamond
  } else {
    color = '#f59e0b'; // Amber for regular MesoWest
    borderColor = '#fbbf24';
    shape = 'border-radius: 2px;'; // Square
  }
  
  // Dim if no data
  const opacity = hasData ? '1' : '0.5';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${isIndicator ? '16px' : '14px'};
      height: ${isIndicator ? '16px' : '14px'};
      background: ${color};
      border: 2px solid ${borderColor};
      ${shape}
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: ${opacity};
    "></div>`,
    iconSize: [isIndicator ? 16 : 14, isIndicator ? 16 : 14],
    iconAnchor: [isIndicator ? 8 : 7, isIndicator ? 8 : 7],
  });
};

const createPinDropIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 22px; height: 22px;
    background: linear-gradient(135deg, #a855f7, #6366f1);
    border: 3px solid #c084fc;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 3px 10px rgba(139,92,246,0.5);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

// Wind arrow component that updates on the map
function WindArrow({ position, direction, speed, color = '#22d3ee', label: _label }) {
  const map = useMap();
  const arrowRef = useRef(null);
  
  useEffect(() => {
    if (direction == null || !position) return;
    
    // Remove existing arrow
    if (arrowRef.current) {
      map.removeLayer(arrowRef.current);
    }
    
    // Convert meteorological direction to map bearing
    // Wind direction is where wind comes FROM, we want where it goes TO
    const bearing = (direction + 180) % 360;
    
    // Calculate arrow end point using proper geographic math
    const length = 0.01 + (speed || 5) * 0.001; // Scale by speed
    const rad = bearing * (Math.PI / 180);
    // North = +lat (cos), East = +lng (sin)
    const endLat = position[0] + Math.cos(rad) * length;
    const endLng = position[1] + Math.sin(rad) * length;
    
    // Create arrow polyline with arrowhead
    const arrow = L.polyline(
      [[position[0], position[1]], [endLat, endLng]],
      { 
        color, 
        weight: 4, 
        opacity: 0.9,
      }
    );
    
    // Since polylineDecorator might not be available, use simple approach
    // Just add the line
    arrow.addTo(map);
    arrowRef.current = arrow;
    
    return () => {
      if (arrowRef.current) {
        map.removeLayer(arrowRef.current);
      }
    };
  }, [map, position, direction, speed, color]);
  
  return null;
}

// Convert meteorological wind direction (where wind comes FROM) to map bearing (where wind goes TO)
// Meteorological: 0° = from North, 90° = from East, 180° = from South, 270° = from West
// We want arrow to point where wind is GOING, so add 180°
// Map coordinates: North = +lat, East = +lng
function windDirectionToMapBearing(meteoDirection) {
  // Add 180° to flip from "coming from" to "going to"
  return (meteoDirection + 180) % 360;
}

// Calculate lat/lng offset for a given bearing and distance
// Bearing: 0° = North, 90° = East, 180° = South, 270° = West
function calculateOffset(bearing, distance) {
  const rad = bearing * (Math.PI / 180);
  // North component (latitude) = cos(bearing)
  // East component (longitude) = sin(bearing)
  return {
    lat: Math.cos(rad) * distance,
    lng: Math.sin(rad) * distance,
  };
}

// Animated wind flow lines
function WindFlowOverlay({ direction, speed, bounds: _bounds }) {
  const map = useMap();
  
  if (direction == null) return null;
  
  const lines = [];
  const mapBounds = map.getBounds();
  const center = mapBounds.getCenter();
  
  // Convert to map bearing (direction wind is blowing TO)
  const bearing = windDirectionToMapBearing(direction);
  
  // Create multiple flow lines
  for (let i = 0; i < 6; i++) {
    const offsetLat = (i % 3 - 1) * 0.05;
    const offsetLng = (Math.floor(i / 3) - 0.5) * 0.08;
    
    const startLat = center.lat + offsetLat;
    const startLng = center.lng + offsetLng;
    
    const length = 0.03 + (speed || 5) * 0.002;
    const offset = calculateOffset(bearing, length);
    const endLat = startLat + offset.lat;
    const endLng = startLng + offset.lng;
    
    lines.push(
      <Polyline
        key={i}
        positions={[[startLat, startLng], [endLat, endLng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 2,
          opacity: 0.3,
          dashArray: '10, 10',
        }}
      />
    );
  }
  
  return <>{lines}</>;
}

// Main wind arrow as a separate polyline
function MainWindArrow({ center, direction, speed }) {
  if (direction == null || !center) return null;
  
  // Convert to map bearing (direction wind is blowing TO)
  const bearing = windDirectionToMapBearing(direction);
  
  const length = 0.02 + (speed || 5) * 0.002;
  const offset = calculateOffset(bearing, length);
  const endLat = center[0] + offset.lat;
  const endLng = center[1] + offset.lng;
  
  // Arrow head points - calculate perpendicular offsets
  const headLength = 0.008;
  const headAngle1 = bearing + 150; // 150° offset for arrow head
  const headAngle2 = bearing - 150;
  const head1Offset = calculateOffset(headAngle1, headLength);
  const head2Offset = calculateOffset(headAngle2, headLength);
  const head1Lat = endLat + head1Offset.lat;
  const head1Lng = endLng + head1Offset.lng;
  const head2Lat = endLat + head2Offset.lat;
  const head2Lng = endLng + head2Offset.lng;
  
  return (
    <>
      {/* Main arrow line */}
      <Polyline
        positions={[[center[0], center[1]], [endLat, endLng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 5,
          opacity: 0.9,
        }}
      />
      {/* Arrow head */}
      <Polyline
        positions={[[head1Lat, head1Lng], [endLat, endLng], [head2Lat, head2Lng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 5,
          opacity: 0.9,
        }}
      />
      {/* Speed label circle */}
      <Circle
        center={[endLat + 0.01, endLng]}
        radius={500}
        pathOptions={{
          color: '#22d3ee',
          fillColor: '#0f172a',
          fillOpacity: 0.8,
          weight: 2,
        }}
      />
    </>
  );
}

export function WindMap({ 
  selectedLake, 
  windData, 
  stationData = [],
  isLoading,
  onSelectLaunch 
}) {
  const [mapArea, setMapArea] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [droppedPin, setDroppedPin] = useState(null);
  const [syntheticData, setSyntheticData] = useState(null);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  const mapRef = useRef(null);
  
  // Determine which map area to show
  useEffect(() => {
    if (selectedLake?.startsWith('utah-lake')) {
      setMapArea(MAP_AREAS['utah-lake']);
    } else if (selectedLake === 'deer-creek') {
      setMapArea(MAP_AREAS['deer-creek']);
    } else if (selectedLake === 'willard-bay') {
      setMapArea(MAP_AREAS['willard-bay']);
    } else {
      setMapArea(MAP_AREAS['utah-lake']);
    }
  }, [selectedLake]);

  // Merge MAP_AREAS station configs (lat/lng) with live readings from stationData
  const liveStationsWithCoords = useMemo(() => {
    if (!mapArea) return [];
    return mapArea.stations
      .map(cfg => {
        const live = stationData?.find(s =>
          s.id === cfg.id || s.name?.includes(cfg.name)
        );
        if (!live || live.speed == null) return null;
        return { ...cfg, ...live, lat: cfg.lat, lng: cfg.lng };
      })
      .filter(Boolean);
  }, [mapArea, stationData]);

  const handlePinDrop = useCallback((coords) => {
    setDroppedPin(coords);
    setHasDroppedPin(true);
    const result = SpatialInterpolator.interpolateConditions(coords, liveStationsWithCoords);
    if (result?.interpolated) {
      const waterTemp = windData?.waterTemp ?? null;
      applySurfacePhysics(result.interpolated, { waterTemp });
    }
    setSyntheticData(result);
  }, [liveStationsWithCoords, windData]);

  const handleClearPin = useCallback(() => {
    setDroppedPin(null);
    setSyntheticData(null);
  }, []);
  
  if (!mapArea) return null;
  
  const currentDirection = windData?.direction;
  const currentSpeed = windData?.speed;
  
  // Get launch data
  const launches = mapArea.launches.map(id => {
    const config = LAKE_CONFIGS[id];
    if (!config?.coordinates) return null;
    return {
      id,
      name: config.shortName || config.name,
      position: [config.coordinates.lat, config.coordinates.lng],
      config,
    };
  }).filter(Boolean);
  
  const mapHeight = isFullscreen ? 'h-[85vh]' : 'h-72 sm:h-96';
  
  return (
    <div className={`relative bg-slate-800/50 rounded-xl border border-slate-700 ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''
    }`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">{mapArea.name} Wind Map</span>
        </div>
        <div className="flex items-center gap-3">
          {currentDirection != null && (
            <div className="flex items-center gap-2 text-xs">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium">{safeToFixed(currentSpeed, 0)} mph</span>
              <span className="text-slate-400">@ {currentDirection}°</span>
            </div>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Map Container */}
      <div className={`relative overflow-hidden cursor-crosshair ${mapHeight}`}>
        <MapContainer
          center={mapArea.center}
          zoom={mapArea.zoom}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={true}
          attributionControl={true}
        >
          {/* Base map tiles - using OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Alternative: Terrain style */}
          {/* 
          <TileLayer
            attribution='&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
          */}
          
          {/* Wind flow lines */}
          <WindFlowOverlay direction={currentDirection} speed={currentSpeed} />
          
          {/* Main wind arrow at center */}
          <MainWindArrow 
            center={mapArea.center} 
            direction={currentDirection} 
            speed={currentSpeed} 
          />
          
          {/* Launch markers */}
          {launches.map(launch => (
            <Marker
              key={launch.id}
              position={launch.position}
              icon={createLaunchIcon(selectedLake === launch.id)}
              eventHandlers={{
                click: () => onSelectLaunch?.(launch.id),
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong className="text-cyan-600">{launch.name}</strong>
                  <br />
                  <span className="text-sm text-gray-600">
                    {launch.config?.primaryWindType}
                  </span>
                  {launch.config?.thermalDirection && (
                    <>
                      <br />
                      <span className="text-xs text-gray-500">
                        {launch.config.thermalDirection}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Pin Drop listener — lets users tap anywhere to synthesize forecast */}
          <PinDropListener onPinDrop={handlePinDrop} />

          {/* Dropped pin marker */}
          {droppedPin && (
            <Marker position={droppedPin} icon={createPinDropIcon()}>
              <Popup>
                <div className="text-center text-sm">
                  <strong className="text-purple-600">Pin Drop</strong>
                  <br />
                  <span className="text-xs text-gray-500">
                    {droppedPin[0].toFixed(4)}, {droppedPin[1].toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Weather station markers */}
          {mapArea.stations.map(station => {
            const stationWind = stationData?.find(s => 
              s.id === station.id || s.name?.includes(station.name)
            );
            const hasData = stationWind?.speed != null;
            
            // Determine label color based on station type
            const labelColor = station.type === 'pws' ? '#22d3ee' 
              : station.isNorthFlowIndicator ? '#3b82f6'
              : station.isEarlyIndicator ? '#10b981'
              : station.isRidge ? '#a855f7' 
              : '#f59e0b';
            
            return (
              <Marker
                key={station.id}
                position={[station.lat, station.lng]}
                icon={createStationIcon(station.type, station.isRidge, hasData, station.isEarlyIndicator, station.isNorthFlowIndicator)}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <div className="font-bold text-base" style={{ color: labelColor }}>
                      {station.name}
                      {station.isEarlyIndicator && ' ⏰'}
                      {station.isNorthFlowIndicator && ' 🌬️'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {station.id} • {station.elevation?.toLocaleString() || '?'} ft
                      {station.isRidge && ' • Ridge'}
                      {station.isEarlyIndicator && ' • SE Early Indicator'}
                      {station.isNorthFlowIndicator && ' • North Flow Indicator'}
                    </div>
                    
                    {hasData ? (
                      <div className="bg-slate-100 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Wind:</span>
                          <span className="font-bold text-lg text-gray-800">
                            {safeToFixed(stationWind.speed, 1)} mph
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Direction:</span>
                          <span className="font-medium text-gray-800">
                            {stationWind.direction}° ({getCardinalDirection(stationWind.direction)})
                          </span>
                        </div>
                        {stationWind.gust && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Gust:</span>
                            <span className="font-medium text-gray-800">
                              {safeToFixed(stationWind.gust, 1)} mph
                            </span>
                          </div>
                        )}
                        {stationWind.temp != null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Temp:</span>
                            <span className="font-medium text-gray-800">
                              {safeToFixed(stationWind.temp, 0)}°F
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm italic">
                        No current data
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {station.type === 'pws' ? 'Personal Weather Station' 
                        : station.type === 'mesowest' ? 'MesoWest Station' 
                        : 'Weather Station'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[1000]">
            <Wind className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}
        
        {/* Instructional banner — disappears after first pin drop */}
        {!hasDroppedPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none animate-fade-in">
            <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inset-0 rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
              <span className="text-xs sm:text-sm font-medium">
                Tap anywhere to generate a custom AI forecast
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className={`absolute bottom-2 left-2 bg-slate-900/90 rounded-lg px-3 py-2 text-xs text-slate-300 z-[1000] ${syntheticData ? 'opacity-0 pointer-events-none' : ''}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300" />
              <span>Launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-300" />
              <span>MesoWest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-500 border border-purple-400" style={{ transform: 'rotate(45deg)' }} />
              <span>Ridge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
              <span>SE ⏰</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              <span>North 🌬️</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300" />
              <span>PWS</span>
            </div>
          </div>
        </div>
        
        {/* Wind info overlay */}
        {currentDirection != null && (
          <div className="absolute top-2 right-2 bg-slate-900/90 rounded-lg px-3 py-2 z-[1000]">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {safeToFixed(currentSpeed, 0)}
                <span className="text-sm font-normal text-slate-400 ml-1">mph</span>
              </div>
              <div className="text-xs text-slate-400">
                from {currentDirection}° ({getCardinalDirection(currentDirection)})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Synthetic forecast card — MUST be outside the map's stacking context */}
      {syntheticData && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4">
          <SyntheticForecastCard
            data={syntheticData}
            onClose={handleClearPin}
          />
        </div>
      )}
    </div>
  );
}

function getCardinalDirection(degrees) {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
