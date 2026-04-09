import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Maximize2, X, Wind, Droplets, Layers } from 'lucide-react';

const PMTILES_URL = import.meta.env.VITE_PMTILES_WATER_URL || null;
import { LAKE_CONFIGS, SpatialInterpolator, applySurfacePhysics, calculateFetchMultiplier, calculateVenturiMultiplier, weatherService, isIOS } from '@utahwind/weather';
import { trackPinDrop } from '@utahwind/ui';
import { impactMedium, impactLight } from '../services/HapticService';
import { safeToFixed } from '../utils/safeToFixed';
import SyntheticForecastCard from './map/SyntheticForecastCard';
import StationPopupCard from './map/StationPopupCard';

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
      { id: 'UTDCD', name: 'Deer Creek Dam (UDOT)', lat: 40.4090, lng: -111.5100, type: 'udot', elevation: 5400 },
      { id: 'UTLPC', name: 'Lower Provo Canyon', lat: 40.3800, lng: -111.5800, type: 'udot', elevation: 5100, isEarlyIndicator: true },
      { id: 'UTPCY', name: 'Provo Canyon MP10', lat: 40.3600, lng: -111.6100, type: 'udot', elevation: 5200 },
      { id: 'UTCHL', name: 'Charleston (UDOT)', lat: 40.4800, lng: -111.4600, type: 'udot', elevation: 5500 },
      { id: 'KHCR', name: 'Heber Airport', lat: 40.4822, lng: -111.4286, type: 'mesowest', elevation: 5597 },
      { id: 'TIMU1', name: 'Timpanogos Divide', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      { id: 'KUTMIDWA37', name: 'Midway (WU)', lat: 40.505, lng: -111.465, type: 'pws', elevation: 5600 },
      { id: 'KUTHEBER105', name: 'Heber City E (WU)', lat: 40.485, lng: -111.444, type: 'pws', elevation: 5600 },
      { id: 'KUTHEBER26', name: 'Heber City S (WU)', lat: 40.477, lng: -111.450, type: 'pws', elevation: 5600 },
      { id: 'KUTHEBER99', name: 'Heber City (WU)', lat: 40.510, lng: -111.410, type: 'pws', elevation: 5640 },
      { id: 'KUTPLEAS11', name: 'Pleasant Grove (WU)', lat: 40.400, lng: -111.742, type: 'pws', elevation: 4600 },
      { id: 'KUTCEDAR10', name: 'Cedar Hills (WU)', lat: 40.396, lng: -111.741, type: 'pws', elevation: 4700 },
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
  'sulfur-creek': {
    name: 'Sulphur Creek',
    center: [-110.955, 41.095],
    zoom: 11,
    launches: ['sulfur-creek'],
    stations: [
      { id: 'KFIR', name: 'First Divide (WYDOT)', lat: 41.2765, lng: -110.8007, type: 'mesowest', elevation: 7579 },
      { id: 'KEVW', name: 'Evanston Airport', lat: 41.2750, lng: -111.0350, type: 'mesowest', elevation: 7143 },
      { id: 'UT1', name: 'Wahsatch EB (UDOT)', lat: 41.1952, lng: -111.114, type: 'udot', elevation: 6814 },
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
  const rad = bearing * (Math.PI / 180);
  const shaftLen = 0.018 + Math.min(speed || 5, 30) * 0.0012;
  const headLen = shaftLen * 0.35;
  const headHalf = headLen * 0.55;

  const tipLng = center[0] + Math.sin(rad) * shaftLen;
  const tipLat = center[1] + Math.cos(rad) * shaftLen;

  const baseLng = center[0] + Math.sin(rad) * (shaftLen * 0.12);
  const baseLat = center[1] + Math.cos(rad) * (shaftLen * 0.12);

  const neckLng = tipLng - Math.sin(rad) * headLen;
  const neckLat = tipLat - Math.cos(rad) * headLen;

  const perpRad = (bearing + 90) * (Math.PI / 180);
  const leftLng = neckLng + Math.sin(perpRad) * headHalf;
  const leftLat = neckLat + Math.cos(perpRad) * headHalf;
  const rightLng = neckLng - Math.sin(perpRad) * headHalf;
  const rightLat = neckLat - Math.cos(perpRad) * headHalf;

  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'shaft' },
        geometry: { type: 'LineString', coordinates: [[baseLng, baseLat], [neckLng, neckLat]] },
      },
      {
        type: 'Feature',
        properties: { kind: 'head' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[tipLng, tipLat], [leftLng, leftLat], [rightLng, rightLat], [tipLng, tipLat]]],
        },
      },
    ],
  };

  return (
    <Source id="wind-arrow" type="geojson" data={geojson}>
      <Layer id="wind-arrow-shaft-glow" type="line"
        filter={['==', ['get', 'kind'], 'shaft']}
        paint={{ 'line-color': '#22d3ee', 'line-width': 10, 'line-opacity': 0.12, 'line-blur': 6 }}
      />
      <Layer id="wind-arrow-shaft" type="line"
        filter={['==', ['get', 'kind'], 'shaft']}
        paint={{ 'line-color': '#22d3ee', 'line-width': 3.5, 'line-opacity': 0.85, 'line-cap': 'round' }}
      />
      <Layer id="wind-arrow-head-fill" type="fill"
        filter={['==', ['get', 'kind'], 'head']}
        paint={{ 'fill-color': '#22d3ee', 'fill-opacity': 0.9 }}
      />
      <Layer id="wind-arrow-head-outline" type="line"
        filter={['==', ['get', 'kind'], 'head']}
        paint={{ 'line-color': '#67e8f9', 'line-width': 1.5, 'line-opacity': 0.7 }}
      />
    </Source>
  );
}

export function VectorWindMap({
  selectedLake,
  selectedActivity = 'kiting',
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
  const [pmtilesReady, setPmtilesReady] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -111.83,
    latitude: 40.23,
    zoom: 10,
  });

  useEffect(() => {
    if (!selectedLake && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewState(prev => ({
            ...prev,
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 10,
          }));
        },
        () => { /* denied — keep default */ },
        { timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!PMTILES_URL) {
      setPmtilesReady(true);
      return;
    }
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    setPmtilesReady(true);
    return () => {
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  useEffect(() => {
    let area = MAP_AREAS['utah-lake'];
    if (selectedLake?.startsWith('utah-lake')) {
      area = MAP_AREAS['utah-lake'];
    } else if (selectedLake === 'deer-creek') {
      area = MAP_AREAS['deer-creek'];
    } else if (selectedLake === 'willard-bay') {
      area = MAP_AREAS['willard-bay'];
    } else if (selectedLake === 'sulfur-creek') {
      area = MAP_AREAS['sulfur-creek'];
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

  // Toggle satellite layer visibility
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;
    
    try {
      if (map.getLayer('satellite-layer')) {
        map.setLayoutProperty('satellite-layer', 'visibility', showSatellite ? 'visible' : 'none');
      }
    } catch (_err) {
      // Layer may not exist yet during initial load
    }
  }, [showSatellite]);

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

    const waterLayerExists = map.getLayer('water-features-fill');
    if (waterLayerExists) {
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
    }

    const coords = [e.lngLat.lat, e.lngLat.lng];
    const requestId = ++abortRef.current;
    setDroppedPin(coords);
    setHasDroppedPin(true);
    setSyntheticData(null);
    setSelectedStation(null);
    setSelectedFeature(null);
    trackPinDrop(coords[0], coords[1], 'wind');
    impactMedium();

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
    impactLight();
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
  const mapHeight = isFullscreen ? 'h-[100dvh]' : 'h-72 sm:h-96';

  return (
    <div className={`relative bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 pt-[env(safe-area-inset-top)]' : ''
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
          onLoad={() => {
            const map = mapRef.current?.getMap();
            if (!map) return;
            
            try {
              // Add terrain DEM source (AWS Mapzen Terrarium)
              if (!map.getSource('terrain-dem')) {
                map.addSource('terrain-dem', {
                  type: 'raster-dem',
                  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                  encoding: 'terrarium',
                  tileSize: 256,
                  maxzoom: isIOS() ? 12 : 14,
                });
              }
              
              // Add ESRI satellite imagery source
              if (!map.getSource('esri-satellite')) {
                map.addSource('esri-satellite', {
                  type: 'raster',
                  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                  tileSize: 256,
                  maxzoom: 19,
                  attribution: '© Esri',
                });
              }
              
              const terrainExaggeration = isIOS() ? 0.8 : 1.3;

              map.on('sourcedata', (e) => {
                if (e.sourceId === 'terrain-dem' && e.isSourceLoaded) {
                  if (!map.getTerrain()) {
                    map.setTerrain({ source: 'terrain-dem', exaggeration: terrainExaggeration });
                  }
                }
              });
              
              map.setTerrain({ source: 'terrain-dem', exaggeration: terrainExaggeration });
              
              const layers = map.getStyle().layers;
              
              // Find the first layer that should be ABOVE our base layers
              // Layer order from bottom to top: background -> satellite -> hillshade -> landcover -> water -> roads -> labels -> markers
              let insertBeforeWater = null;
              for (const layer of layers) {
                // Find the first water-related layer to insert our layers before it
                if (layer.id.includes('water') && !insertBeforeWater) {
                  insertBeforeWater = layer.id;
                  break;
                }
              }
              
              // Find landcover layer to insert satellite/hillshade before it (but after background)
              let insertBeforeLandcover = null;
              for (const layer of layers) {
                if (layer.id.includes('landcover') || layer.id.includes('landuse') || layer.id.includes('park')) {
                  insertBeforeLandcover = layer.id;
                  break;
                }
              }
              
              // Use landcover insertion point, or fall back to water
              const baseInsertPoint = insertBeforeLandcover || insertBeforeWater;
              
              // Add satellite layer at the bottom (hidden by default) - will drape over 3D terrain
              if (!map.getLayer('satellite-layer')) {
                map.addLayer({
                  id: 'satellite-layer',
                  type: 'raster',
                  source: 'esri-satellite',
                  layout: {
                    visibility: 'none',
                  },
                  paint: {
                    'raster-opacity': 1,
                  },
                }, baseInsertPoint);
              }
              
              // Add hillshade layer - dark mode friendly with subtle shadows, minimal highlights
              if (!map.getLayer('hillshade')) {
                map.addLayer({
                  id: 'hillshade',
                  type: 'hillshade',
                  source: 'terrain-dem',
                  paint: {
                    'hillshade-exaggeration': 0.5,
                    'hillshade-shadow-color': '#000000',
                    'hillshade-highlight-color': 'rgba(255, 255, 255, 0.05)',
                    'hillshade-accent-color': '#1a1a2e',
                    'hillshade-illumination-direction': 315,
                    'hillshade-illumination-anchor': 'viewport',
                  },
                }, baseInsertPoint);
              }
            } catch (err) {
              console.error('[Terrain] Failed to initialize:', err);
            }
          }}
        >
          <NavigationControl position="top-right" showCompass={true} showZoom={true} />
          <GeolocateControl position="top-right" trackUserLocation={false} />

          {/* Vector tile source for water features (PMTiles or placeholder) */}
          {pmtilesReady && PMTILES_URL && (
            <Source
              id="water-features"
              type="vector"
              url={`pmtiles://${PMTILES_URL}`}
            >
              <Layer
                id="water-features-fill"
                type="fill"
                source-layer="water"
                minzoom={10}
                paint={{
                  'fill-color': '#3b82f6',
                  'fill-opacity': 0.15,
                }}
              />
              <Layer
                id="water-features-line"
                type="line"
                source-layer="water"
                minzoom={10}
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 3],
                  'line-opacity': 0.6,
                }}
              />
            </Source>
          )}

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

          {/* Station popup — Live Now + Next Session */}
          {selectedStation && (
            <Popup
              longitude={selectedStation.station.lng}
              latitude={selectedStation.station.lat}
              anchor="bottom"
              onClose={() => setSelectedStation(null)}
              closeButton={true}
              closeOnClick={false}
              className="station-popup"
              maxWidth="300px"
            >
              <StationPopupCard
                station={selectedStation.station}
                live={selectedStation.live}
                physicsHints={selectedStation.physicsHints}
                selectedActivity={selectedActivity}
                selectedLake={selectedLake}
              />
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
          <div className="absolute top-16 left-2 bg-slate-900/90 rounded-lg px-3 py-2 z-20">
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

        {/* Satellite/Map toggle button */}
        <button
          onClick={() => setShowSatellite(!showSatellite)}
          className={`absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg ${
            showSatellite
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
          aria-label={showSatellite ? 'Switch to map view' : 'Switch to satellite view'}
        >
          <Layers className="w-4 h-4" />
          <span>{showSatellite ? 'Map' : 'Satellite'}</span>
        </button>
      </div>

      {/* Synthetic forecast card — bottom sheet style for mobile */}
      {syntheticData && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent">
          <div className="max-w-sm mx-auto">
            <SyntheticForecastCard data={syntheticData} onClose={handleClearPin} />
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorWindMap;
