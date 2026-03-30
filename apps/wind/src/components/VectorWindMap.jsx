import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Maximize2, X, Wind, Navigation, Droplets } from 'lucide-react';
import { LAKE_CONFIGS, SpatialInterpolator, applySurfacePhysics, calculateFetchMultiplier, calculateVenturiMultiplier, weatherService } from '@utahwind/weather';
import { trackPinDrop } from '@utahwind/ui';
import { safeToFixed } from '../utils/safeToFixed';
import SyntheticForecastCard from './map/SyntheticForecastCard';

const MAP_AREAS = {
  'utah-lake': {
    name: 'Utah Lake',
    center: [-111.83, 40.23],
    zoom: 10,
    launches: ['utah-lake-lincoln', 'utah-lake-sandy', 'utah-lake-vineyard', 'utah-lake-zigzag', 'utah-lake-mm19'],
    stations: [
      { id: 'FPS', name: 'Flight Park South', lat: 40.4555, lng: -111.9208, type: 'mesowest', elevation: 5202 },
      { id: 'KPVU', name: 'Provo Airport', lat: 40.2192, lng: -111.7236, type: 'mesowest', elevation: 4495, isNorthFlowIndicator: true, isSouthernIndicator: true },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226, isNorthFlowIndicator: true },
      { id: 'QLN', name: 'Lindon', lat: 40.3431, lng: -111.7136, type: 'mesowest', elevation: 4738 },
      { id: 'UTALP', name: 'Point of Mountain', lat: 40.4456, lng: -111.8983, type: 'mesowest', elevation: 4796, isNorthFlowIndicator: true, isGapIndicator: true },
      { id: 'CSC', name: 'Cascade Peak', lat: 40.2667, lng: -111.6167, type: 'mesowest', elevation: 10875, isRidge: true },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      { id: 'QSF', name: 'Spanish Fork', lat: 40.115, lng: -111.655, type: 'mesowest', elevation: 4550, isEarlyIndicator: true },
      { id: 'PWS', name: 'Zig Zag PWS', lat: 40.30268164473557, lng: -111.8799503518146, type: 'pws', elevation: 4489 },
    ],
  },
  'deer-creek': {
    name: 'Deer Creek',
    center: [-111.51, 40.42],
    zoom: 11,
    launches: ['deer-creek'],
    stations: [
      { id: 'DCC', name: 'Deer Creek Dam', lat: 40.4028, lng: -111.5097, type: 'mesowest', elevation: 5417 },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      { id: 'KHCR', name: 'Heber Airport', lat: 40.4822, lng: -111.4286, type: 'mesowest', elevation: 5597 },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      { id: 'CHL', name: 'Charleston', lat: 40.4750, lng: -111.4750, type: 'mesowest', elevation: 5600 },
    ],
  },
  'willard-bay': {
    name: 'Willard Bay',
    center: [-112.08, 41.38],
    zoom: 10,
    launches: ['willard-bay'],
    stations: [
      { id: 'KOGD', name: 'Ogden Airport', lat: 41.1961, lng: -112.0122, type: 'mesowest', elevation: 4440 },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226 },
      { id: 'KHIF', name: 'Hill AFB', lat: 41.1239, lng: -111.9731, type: 'mesowest', elevation: 4789 },
      { id: 'BLM', name: 'Ben Lomond', lat: 41.3667, lng: -111.9500, type: 'mesowest', elevation: 9712, isRidge: true },
    ],
  },
};

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

function getStationColor(station) {
  if (station.type === 'pws') return '#22d3ee';
  if (station.isNorthFlowIndicator) return '#3b82f6';
  if (station.isEarlyIndicator) return '#10b981';
  if (station.isRidge) return '#a855f7';
  return '#f59e0b';
}

function getCardinalDirection(degrees) {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function StationMarker({ station, stationData, onClick }) {
  const live = stationData?.find(s => s.id === station.id || s.name?.includes(station.name));
  const hasData = live?.speed != null;
  const color = getStationColor(station);
  
  const isRidge = station.isRidge;
  const isIndicator = station.isEarlyIndicator || station.isNorthFlowIndicator;
  const size = isIndicator ? 18 : 16;

  return (
    <Marker
      longitude={station.lng}
      latitude={station.lat}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick?.({ station, live });
      }}
    >
      <div
        className="cursor-pointer transition-transform active:scale-110"
        style={{
          width: size,
          height: size,
          background: color,
          border: `2px solid ${color}`,
          borderRadius: isRidge ? '2px' : '50%',
          transform: isRidge ? 'rotate(45deg)' : 'none',
          opacity: hasData ? 1 : 0.5,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </Marker>
  );
}

function LaunchMarker({ launch, isSelected, onClick }) {
  const size = isSelected ? 22 : 16;
  return (
    <Marker
      longitude={launch.position[1]}
      latitude={launch.position[0]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick?.(launch.id);
      }}
    >
      <div
        className="cursor-pointer transition-transform active:scale-110"
        style={{
          width: size,
          height: size,
          background: isSelected ? '#22d3ee' : '#64748b',
          border: `2px solid ${isSelected ? '#06b6d4' : '#475569'}`,
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </Marker>
  );
}

function PinDropMarker({ coords }) {
  return (
    <Marker longitude={coords[1]} latitude={coords[0]} anchor="bottom">
      <div
        style={{
          width: 24,
          height: 24,
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          border: '3px solid #c084fc',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          boxShadow: '0 3px 10px rgba(139,92,246,0.5)',
        }}
      />
    </Marker>
  );
}

function WindArrowOverlay({ center, direction, speed }) {
  if (direction == null || !center) return null;

  const bearing = (direction + 180) % 360;
  const length = 0.015 + (speed || 5) * 0.0015;
  const rad = bearing * (Math.PI / 180);
  const endLng = center[0] + Math.sin(rad) * length;
  const endLat = center[1] + Math.cos(rad) * length;

  const arrowGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [center, [endLng, endLat]],
        },
      },
    ],
  };

  return (
    <Source id="wind-arrow" type="geojson" data={arrowGeoJSON}>
      <Layer
        id="wind-arrow-line"
        type="line"
        paint={{
          'line-color': '#22d3ee',
          'line-width': 5,
          'line-opacity': 0.9,
        }}
      />
    </Source>
  );
}

export function VectorWindMap({
  selectedLake,
  windData,
  stationData = [],
  isLoading,
  onSelectLaunch,
}) {
  const mapRef = useRef(null);
  const [mapArea, setMapArea] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [droppedPin, setDroppedPin] = useState(null);
  const [syntheticData, setSyntheticData] = useState(null);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: -111.83,
    latitude: 40.23,
    zoom: 10,
  });

  useEffect(() => {
    let area = MAP_AREAS['utah-lake'];
    if (selectedLake?.startsWith('utah-lake')) {
      area = MAP_AREAS['utah-lake'];
    } else if (selectedLake === 'deer-creek') {
      area = MAP_AREAS['deer-creek'];
    } else if (selectedLake === 'willard-bay') {
      area = MAP_AREAS['willard-bay'];
    }
    setMapArea(area);
    if (area) {
      setViewState(prev => ({
        ...prev,
        longitude: area.center[0],
        latitude: area.center[1],
        zoom: area.zoom,
      }));
    }
  }, [selectedLake]);

  const liveStationsWithCoords = useMemo(() => {
    if (!mapArea) return [];
    return mapArea.stations
      .map(cfg => {
        const live = stationData?.find(s => s.id === cfg.id || s.name?.includes(cfg.name));
        if (!live || live.speed == null) return null;
        return { ...cfg, ...live, lat: cfg.lat, lng: cfg.lng };
      })
      .filter(Boolean);
  }, [mapArea, stationData]);

  const abortRef = useRef(0);
  const handleMapClick = useCallback(async (e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: ['water-features-fill'],
    });

    if (features.length > 0) {
      const feature = features[0];
      setSelectedFeature({
        name: feature.properties?.name || feature.properties?.gnis_name || 'Water Feature',
        type: feature.properties?.ftype || feature.properties?.fcode_d || 'Stream/River',
        flowRate: feature.properties?.flow_rate || null,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });
      return;
    }

    const coords = [e.lngLat.lat, e.lngLat.lng];
    const requestId = ++abortRef.current;
    setDroppedPin(coords);
    setHasDroppedPin(true);
    setSyntheticData(null);
    setSelectedStation(null);
    setSelectedFeature(null);
    trackPinDrop(coords[0], coords[1], 'wind');

    let stations = liveStationsWithCoords;
    const areaCenter = mapArea?.center;
    const isOutsideLocal = !areaCenter || Math.abs(coords[0] - areaCenter[1]) > 1.5 || Math.abs(coords[1] - areaCenter[0]) > 1.5;

    if (stations.length === 0 || isOutsideLocal) {
      try {
        const radial = await weatherService.fetchNearbyStations(coords[0], coords[1], 50);
        if (requestId !== abortRef.current) return;
        if (radial.length > 0) stations = radial;
      } catch (_e) { /* fall through */ }
    }

    const result = SpatialInterpolator.interpolateConditions(coords, stations);
    if (requestId !== abortRef.current) return;
    if (result?.interpolated) {
      const waterTemp = windData?.waterTemp ?? null;
      applySurfacePhysics(result.interpolated, { waterTemp });
    }
    setSyntheticData(result);
  }, [liveStationsWithCoords, windData, mapArea]);

  const handleClearPin = useCallback(() => {
    setDroppedPin(null);
    setSyntheticData(null);
  }, []);

  const handleStationClick = useCallback(({ station, live }) => {
    let physicsHints = [];
    if (live?.speed != null && live.direction != null) {
      const fetch = calculateFetchMultiplier(station.lat, station.lng, live.direction);
      if (fetch.multiplier > 1) physicsHints.push(`+${Math.round((fetch.multiplier - 1) * 100)}% Fetch (${fetch.fetchMiles} mi)`);
      const venturi = calculateVenturiMultiplier(station.lat, station.lng, live.direction);
      if (venturi.multiplier > 1) physicsHints.push(`+${Math.round((venturi.multiplier - 1) * 100)}% Venturi (${venturi.corridorId})`);
    }
    setSelectedStation({ station, live, physicsHints });
    setSelectedFeature(null);
  }, []);

  const launches = useMemo(() => {
    return (mapArea?.launches || []).map(id => {
      const config = LAKE_CONFIGS[id];
      if (!config?.coordinates) return null;
      return {
        id,
        name: config.shortName || config.name,
        position: [config.coordinates.lat, config.coordinates.lng],
        config,
      };
    }).filter(Boolean);
  }, [mapArea]);

  const currentDirection = windData?.direction;
  const currentSpeed = windData?.speed;
  const mapHeight = isFullscreen ? 'h-[85vh]' : 'h-72 sm:h-96';

  return (
    <div className={`relative bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''
    }`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80 z-10 relative">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">
            {mapArea?.name ? `${mapArea.name} Wind Map` : 'Global Wind Map'}
          </span>
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
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg active:bg-slate-700 text-slate-400 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative ${mapHeight}`}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapLib={maplibregl}
          mapStyle={BASEMAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          cursor="crosshair"
          attributionControl={false}
          minZoom={3}
          maxZoom={18}
        >
          <NavigationControl position="top-right" showCompass={true} showZoom={true} />
          <GeolocateControl position="top-right" trackUserLocation={false} />

          {/* Vector tile source for water features (placeholder URL) */}
          <Source
            id="water-features"
            type="vector"
            tiles={['https://your-vector-tile-server.com/nhd/{z}/{x}/{y}.pbf']}
            minzoom={10}
            maxzoom={16}
          >
            <Layer
              id="water-features-fill"
              type="fill"
              source-layer="streams"
              minzoom={10}
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.15,
              }}
            />
            <Layer
              id="water-features-line"
              type="line"
              source-layer="streams"
              minzoom={10}
              paint={{
                'line-color': '#3b82f6',
                'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
                'line-opacity': 0.6,
              }}
            />
          </Source>

          {/* Wind arrow overlay */}
          <WindArrowOverlay
            center={mapArea?.center}
            direction={currentDirection}
            speed={currentSpeed}
          />

          {/* Station markers */}
          {(mapArea?.stations || []).map(station => (
            <StationMarker
              key={station.id}
              station={station}
              stationData={stationData}
              onClick={handleStationClick}
            />
          ))}

          {/* Launch markers */}
          {launches.map(launch => (
            <LaunchMarker
              key={launch.id}
              launch={launch}
              isSelected={selectedLake === launch.id}
              onClick={onSelectLaunch}
            />
          ))}

          {/* Dropped pin marker */}
          {droppedPin && <PinDropMarker coords={droppedPin} />}

          {/* Station popup */}
          {selectedStation && (
            <Popup
              longitude={selectedStation.station.lng}
              latitude={selectedStation.station.lat}
              anchor="bottom"
              onClose={() => setSelectedStation(null)}
              closeButton={true}
              closeOnClick={false}
              className="station-popup"
            >
              <div className="min-w-[180px] p-1">
                <div className="font-bold text-base" style={{ color: getStationColor(selectedStation.station) }}>
                  {selectedStation.station.name}
                  {selectedStation.station.isEarlyIndicator && ' ⏰'}
                  {selectedStation.station.isNorthFlowIndicator && ' 🌬️'}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {selectedStation.station.id} • {selectedStation.station.elevation?.toLocaleString() || '?'} ft
                  {selectedStation.station.isRidge && ' • Ridge'}
                </div>

                {selectedStation.live?.speed != null ? (
                  <div className="bg-slate-100 rounded p-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Wind:</span>
                      <span className="font-bold text-lg text-gray-800">
                        {safeToFixed(selectedStation.live.speed, 1)} mph
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Direction:</span>
                      <span className="font-medium text-gray-800">
                        {selectedStation.live.direction}° ({getCardinalDirection(selectedStation.live.direction)})
                      </span>
                    </div>
                    {selectedStation.live.gust && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Gust:</span>
                        <span className="font-medium text-gray-800">
                          {safeToFixed(selectedStation.live.gust, 1)} mph
                        </span>
                      </div>
                    )}
                    {selectedStation.physicsHints?.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                        {selectedStation.physicsHints.map((h, i) => (
                          <div key={i} className="text-[10px] font-medium text-emerald-600">▲ {h}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic">No current data</div>
                )}
              </div>
            </Popup>
          )}

          {/* Water feature popup (from queryRenderedFeatures) */}
          {selectedFeature && (
            <Popup
              longitude={selectedFeature.lngLat[0]}
              latitude={selectedFeature.lngLat[1]}
              anchor="bottom"
              onClose={() => setSelectedFeature(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <div className="min-w-[160px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-blue-600">{selectedFeature.name}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{selectedFeature.type}</div>
                {selectedFeature.flowRate && (
                  <div className="bg-blue-50 rounded p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Flow Rate:</span>
                      <span className="font-bold text-blue-700">{selectedFeature.flowRate} CFS</span>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-20">
            <Wind className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Instructional banner */}
        {!hasDroppedPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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
        <div className={`absolute bottom-2 left-2 bg-slate-900/90 rounded-lg px-3 py-2 text-xs text-slate-300 z-20 ${syntheticData ? 'opacity-0 pointer-events-none' : ''}`}>
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
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              <span>N Flow</span>
            </div>
          </div>
        </div>

        {/* Wind info overlay */}
        {currentDirection != null && (
          <div className="absolute top-16 right-2 bg-slate-900/90 rounded-lg px-3 py-2 z-20">
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

      {/* Synthetic forecast card — bottom sheet style for mobile */}
      {syntheticData && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent">
          <div className="max-w-sm mx-auto">
            <SyntheticForecastCard data={syntheticData} onClose={handleClearPin} />
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorWindMap;
