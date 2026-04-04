import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Maximize2, X, Droplets, Fish, Waves } from 'lucide-react';
import { generateFisheryProfile } from '@utahwind/weather';
import { trackPinDrop, trackBioApiCall } from '@utahwind/ui';
import SyntheticFishingCard from './SyntheticFishingCard';

const PMTILES_URL = import.meta.env.VITE_PMTILES_WATER_URL || null;
const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const UTAH_CENTER = { longitude: -111.70, latitude: 40.35 };
const DEFAULT_ZOOM = 8;
const DEFAULT_ELEVATION = 4500;

/**
 * Extract water body type from feature properties
 * Handles both USGS NHD and OpenStreetMap property naming conventions
 */

/**
 * Extract water body type from feature properties
 * Handles both USGS NHD and OpenStreetMap property naming conventions
 */
function extractWaterType(properties, layerId) {
  if (!properties) return 'Water';
  
  // USGS NHD type codes
  const usgsType = properties.ftype || properties.FType || properties.FTYPE || properties.fcode_d;
  if (usgsType) return usgsType;
  
  // OpenStreetMap water types
  if (properties.water) {
    const waterTypes = {
      lake: 'Lake',
      reservoir: 'Reservoir',
      pond: 'Pond',
      river: 'River',
      stream: 'Stream',
      canal: 'Canal',
      lagoon: 'Lagoon',
      oxbow: 'Oxbow Lake',
    };
    return waterTypes[properties.water] || properties.water;
  }
  
  // OSM waterway types
  if (properties.waterway) {
    const waterwayTypes = {
      river: 'River',
      stream: 'Stream',
      canal: 'Canal',
      drain: 'Drainage',
      ditch: 'Ditch',
    };
    return waterwayTypes[properties.waterway] || properties.waterway;
  }
  
  // OSM natural types
  if (properties.natural === 'water') return 'Water Body';
  if (properties.natural === 'coastline') return 'Ocean/Sea';
  if (properties.natural === 'bay') return 'Bay';
  
  // Infer from layer ID
  if (layerId?.includes('lake')) return 'Lake';
  if (layerId?.includes('stream') || layerId?.includes('river')) return 'River/Stream';
  if (layerId?.includes('ocean') || layerId?.includes('sea')) return 'Ocean';
  
  return 'Water';
}

/**
 * Determine if this is saltwater based on properties
 */
function isSaltwater(properties) {
  if (!properties) return false;
  
  const type = (properties.water || properties.natural || '').toLowerCase();
  return ['sea', 'ocean', 'bay', 'gulf', 'strait', 'sound'].some(t => type.includes(t));
}

function PinDropMarker({ coords }) {
  return (
    <Marker longitude={coords[1]} latitude={coords[0]} anchor="bottom">
      <div
        style={{
          width: 28,
          height: 28,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: '3px solid #fff',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          boxShadow: '0 4px 12px rgba(16,185,129,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ transform: 'rotate(45deg)', fontSize: 12 }}>🎣</span>
      </div>
    </Marker>
  );
}

export function VectorWaterMap({ currentWeatherData = {} }) {
  const mapRef = useRef(null);
  const [droppedPin, setDroppedPin] = useState(null);
  const [fishProfile, setFishProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDroppedPin, setHasDroppedPin] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedWaterFeature, setSelectedWaterFeature] = useState(null);
  const [pmtilesReady, setPmtilesReady] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [cursorStyle, setCursorStyle] = useState('crosshair');
  const [viewState, setViewState] = useState({
    ...UTAH_CENTER,
    zoom: DEFAULT_ZOOM,
  });
  const abortRef = useRef(0);
  const hoveredFeatureIdRef = useRef(null);

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

  // Water layer IDs for hover detection (both PMTiles and basemap)
  const WATER_LAYER_IDS = [
    'lakes-fill', 'streams-line', 'lakes-labels', 'streams-labels',
    'osm-lakes', 'osm-rivers', 'osm-ocean', 'lakes-outline',
  ];

  // Detect if device supports touch (mobile/tablet)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Handle mouse move for hover effects (desktop only)
  const handleMouseMove = useCallback((e) => {
    // Skip hover on touch devices - they use tap instead
    if (isTouchDevice) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Use a small bounding box for better line feature detection
    const bbox = [
      [e.point.x - 8, e.point.y - 8],
      [e.point.x + 8, e.point.y + 8]
    ];

    // Query our PMTiles water layers first (with bbox for thin lines)
    const waterLayerIds = WATER_LAYER_IDS.filter(id => map.getLayer(id));
    let features = waterLayerIds.length > 0 
      ? map.queryRenderedFeatures(bbox, { layers: waterLayerIds })
      : [];

    // If no PMTiles features, check basemap water layers
    if (features.length === 0) {
      const allFeatures = map.queryRenderedFeatures(bbox);
      
      const basemapWater = allFeatures.find(f => {
        const fLayerId = (f.layer?.id || '').toLowerCase();
        const sourceLayer = (f.sourceLayer || '').toLowerCase();
        
        // Check for water-related layer names (Carto, Mapbox, MapTiler, OSM)
        return fLayerId.includes('water') || 
               fLayerId.includes('river') || 
               fLayerId.includes('stream') ||
               fLayerId.includes('lake') ||
               fLayerId.includes('ocean') ||
               fLayerId.includes('sea') ||
               sourceLayer.includes('water') ||
               sourceLayer.includes('waterway');
      });
      
      if (basemapWater) {
        features = [basemapWater];
      }
    }

    if (features.length > 0) {
      // Helper to detect if a feature is a river/stream
      const isRiverFeature = (f) => {
        const geomType = f.geometry?.type;
        const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
        const hasWaterway = !!f.properties?.waterway;
        const typeIsRiver = f.properties?.type === 'river' || 
                            f.properties?.type === 'stream' || 
                            f.properties?.type === 'canal';
        const layerIsStream = f.layer?.id?.includes('stream');
        return isLine || hasWaterway || typeIsRiver || layerIsStream;
      };
      
      // Separate and prioritize rivers over lakes
      const riverFeatures = features.filter(f => isRiverFeature(f));
      const namedRiver = riverFeatures.find(f => f.properties?.name);
      const namedFeature = features.find(f => f.properties?.name);
      
      // Prefer: named river > any river > named lake > any feature
      const feature = namedRiver || riverFeatures[0] || namedFeature || features[0];
      const featureId = feature.id || `${feature.layer?.id}-${feature.properties?.name || 'unnamed'}-${Math.round(e.point.x / 20)}`;
      
      // Only update if hovering over a different feature
      if (hoveredFeatureIdRef.current !== featureId) {
        hoveredFeatureIdRef.current = featureId;
        
        // Get the name directly from properties
        const name = feature.properties?.name;
        const type = extractWaterType(feature.properties, feature.layer?.id);
        
        // If no name, show a more descriptive fallback based on type
        let displayName = name;
        if (!displayName) {
          const waterType = feature.properties?.type || feature.properties?.waterway || type;
          if (waterType === 'river') displayName = 'Unnamed River';
          else if (waterType === 'stream') displayName = 'Unnamed Stream';
          else if (waterType === 'canal') displayName = 'Unnamed Canal';
          else if (waterType === 'lake' || waterType === 'reservoir') displayName = 'Unnamed Lake';
          else displayName = type || 'Water';
        }
        
        setHoveredFeature({
          name: displayName,
          type,
          lngLat: [e.lngLat.lng, e.lngLat.lat],
          layerId: feature.layer?.id,
          hasName: !!name,
        });
        setCursorStyle('pointer');
      } else {
        // Same feature, just update position for smooth tooltip following
        setHoveredFeature(prev => prev ? { ...prev, lngLat: [e.lngLat.lng, e.lngLat.lat] } : null);
      }
    } else {
      // No water feature under cursor
      if (hoveredFeatureIdRef.current !== null) {
        hoveredFeatureIdRef.current = null;
        setHoveredFeature(null);
        setCursorStyle('crosshair');
      }
    }
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    hoveredFeatureIdRef.current = null;
    setHoveredFeature(null);
    setCursorStyle('crosshair');
  }, []);

  const handleMapClick = useCallback(async (e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const coords = [e.lngLat.lat, e.lngLat.lng];
    console.log('[VectorWaterMap] Click at:', coords);

    // Query all water-related layers (USGS NHD + OSM global)
    // Include label layers as they have the same properties but larger hit areas
    const waterLayerIds = [
      'lakes-fill', 'streams-line',           // USGS NHD geometry layers
      'lakes-labels', 'streams-labels',       // USGS NHD label layers (easier to click)
      'osm-lakes', 'osm-rivers', 'osm-ocean', // OSM global layers (if present)
    ].filter(id => map.getLayer(id));
    
    let clickedFeatureName = null;
    let clickedFeatureType = null;
    let clickedLayerId = null;
    let featureIsSaltwater = false;
    
    // Also query ALL layers to see what's under the click (including basemap)
    const allFeatures = map.queryRenderedFeatures(e.point);
    const basemapWaterFeature = allFeatures.find(f => {
      const layerId = f.layer?.id || '';
      const sourceLayer = f.sourceLayer || '';
      // Check for common basemap water layer names
      return layerId.includes('water') || 
             layerId.includes('river') || 
             layerId.includes('stream') ||
             sourceLayer.includes('water') ||
             sourceLayer.includes('waterway');
    });
    
    if (basemapWaterFeature) {
      console.log('[VectorWaterMap] Basemap water feature detected:', basemapWaterFeature.layer?.id, basemapWaterFeature.sourceLayer);
      console.log('[VectorWaterMap] Basemap feature properties:', basemapWaterFeature.properties);
      console.log('[VectorWaterMap] Basemap geometry type:', basemapWaterFeature.geometry?.type);
      // If basemap shows a river/stream, mark it as such even if our PMTiles don't have it
      const basemapLayerId = basemapWaterFeature.layer?.id || '';
      const basemapSourceLayer = basemapWaterFeature.sourceLayer || '';
      
      // Check for river/stream indicators in layer or source
      const isRiverLayer = basemapLayerId.includes('river') || 
                           basemapLayerId.includes('stream') || 
                           basemapLayerId.includes('waterway');
      
      // Also check feature properties for class/type hints (MapTiler/Mapbox vector tiles)
      const featureClass = basemapWaterFeature.properties?.class || '';
      const featureType = basemapWaterFeature.properties?.type || '';
      const geometryType = basemapWaterFeature.geometry?.type || '';
      
      // Rivers are typically LineStrings in vector tiles
      const isLineGeometry = geometryType === 'LineString' || geometryType === 'MultiLineString';
      
      const isRiverFeature = featureClass === 'river' || 
                             featureClass === 'stream' ||
                             featureType === 'river' ||
                             featureType === 'stream' ||
                             (isLineGeometry && basemapSourceLayer.includes('water'));
      
      // Try to extract name from basemap feature
      const basemapName = basemapWaterFeature.properties?.name || 
                          basemapWaterFeature.properties?.name_en ||
                          basemapWaterFeature.properties?.gnis_name;
      
      if (isRiverLayer || isRiverFeature) {
        clickedFeatureType = 'River/Stream';
        if (basemapName && !clickedFeatureName) {
          clickedFeatureName = basemapName;
          console.log('[VectorWaterMap] Got river name from basemap:', basemapName);
        }
        console.log('[VectorWaterMap] Basemap indicates river/stream, setting type');
      } else if (basemapName && !clickedFeatureName) {
        // Even if not explicitly a river, capture the name for context
        clickedFeatureName = basemapName;
        console.log('[VectorWaterMap] Got water name from basemap:', basemapName);
      }
    }
    
    if (waterLayerIds.length > 0) {
      // Use a wider bounding box for better line feature detection (streams are thin)
      const bbox = [
        [e.point.x - 15, e.point.y - 15],
        [e.point.x + 15, e.point.y + 15]
      ];
      let features = map.queryRenderedFeatures(bbox, { layers: waterLayerIds });
      console.log('[VectorWaterMap] Our layers:', waterLayerIds, 'Features found:', features.length);

      if (features.length > 0) {
        console.log('[VectorWaterMap] All features found:', features.map(f => ({
          layer: f.layer?.id,
          name: f.properties?.name,
          type: f.properties?.type,
          waterway: f.properties?.waterway,
          geometry: f.geometry?.type,
        })));
        
        // Helper to detect if a feature is a river/stream (line geometry or waterway property)
        const isRiverFeature = (f) => {
          const geomType = f.geometry?.type;
          const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
          const hasWaterway = !!f.properties?.waterway;
          const typeIsRiver = f.properties?.type === 'river' || 
                              f.properties?.type === 'stream' || 
                              f.properties?.type === 'canal';
          const layerIsStream = f.layer?.id?.includes('stream');
          return isLine || hasWaterway || typeIsRiver || layerIsStream;
        };
        
        // Separate features by type
        const riverFeatures = features.filter(f => isRiverFeature(f));
        const lakeFeatures = features.filter(f => !isRiverFeature(f));
        
        console.log('[VectorWaterMap] Rivers:', riverFeatures.length, 'Lakes:', lakeFeatures.length);
        
        // PRIORITY ORDER - ALWAYS prefer rivers/streams over lakes when both are present
        // This handles the case where a river flows through/near a lake
        // 1. Named river/stream features (LineString with name) - BEST match
        // 2. Unnamed river/stream features (user clicked on visible river line)
        // 3. Named polygon features (lakes, reservoirs)
        // 4. Any feature
        const namedRiverFeature = riverFeatures.find(f => f.properties?.name);
        const unnamedRiverFeature = riverFeatures[0];
        const namedLakeFeature = lakeFeatures.find(f => f.properties?.name);
        
        // Pick the best feature - STRONGLY prioritize rivers over lakes!
        let feature;
        if (riverFeatures.length > 0) {
          // If there are ANY river features, prefer them
          feature = namedRiverFeature || unnamedRiverFeature;
          console.log('[VectorWaterMap] Prioritizing river feature:', feature.properties?.name || '(unnamed)');
        } else {
          // No rivers, use lake
          feature = namedLakeFeature || features[0];
        }
        
        console.log('[VectorWaterMap] Feature selection:', {
          namedRiver: namedRiverFeature?.properties?.name,
          unnamedRiver: unnamedRiverFeature ? 'yes' : 'no',
          namedLake: namedLakeFeature?.properties?.name,
          selected: feature.properties?.name,
        });
        
        clickedLayerId = feature.layer?.id;
        console.log('[VectorWaterMap] Selected feature from layer:', clickedLayerId);
        console.log('[VectorWaterMap] Properties:', feature.properties);

        // For our PMTiles, use the 'name' property directly
        clickedFeatureName = feature.properties?.name || null;
        clickedFeatureType = extractWaterType(feature.properties, clickedLayerId);
        featureIsSaltwater = isSaltwater(feature.properties);
        
        // Determine if this is a river/stream based on properties or layer
        const isStreamLayer = clickedLayerId?.includes('stream') || clickedLayerId?.includes('river');
        const isStreamType = feature.properties?.waterway || 
                             feature.properties?.type === 'river' || 
                             feature.properties?.type === 'stream' ||
                             feature.properties?.type === 'canal';
        
        if (isStreamLayer || isStreamType) {
          clickedFeatureType = 'River/Stream';
          console.log('[VectorWaterMap] Stream/river detected, setting type to River/Stream');
        }
        
        console.log('[VectorWaterMap] Final - name:', clickedFeatureName, 'type:', clickedFeatureType);
        
        if (clickedFeatureName) {
          setSelectedWaterFeature({
            name: clickedFeatureName,
            type: clickedFeatureType,
            permanence: feature.properties?.intermittent ? 'Intermittent' : null,
            lngLat: [e.lngLat.lng, e.lngLat.lat],
            isSaltwater: featureIsSaltwater,
          });
        }
      }
    } else {
      console.log('[VectorWaterMap] No vector layers found on map');
    }

    const requestId = ++abortRef.current;
    setDroppedPin(coords);
    setHasDroppedPin(true);
    setIsLoading(true);
    setFishProfile(null);
    if (!clickedFeatureName) setSelectedWaterFeature(null);
    trackPinDrop(coords[0], coords[1], 'water');

    try {
      // Pass additional context from vector feature to profile generator
      const enhancedWeatherData = {
        ...currentWeatherData,
        vectorFeatureName: clickedFeatureName,
        vectorFeatureType: clickedFeatureType,
        isSaltwater: featureIsSaltwater,
      };
      
      console.log('[VectorWaterMap] Calling generateFisheryProfile with:', {
        coords,
        vectorFeatureName: clickedFeatureName,
        vectorFeatureType: clickedFeatureType,
        clickedLayerId,
      });
      
      const profile = await generateFisheryProfile(
        coords[0],
        coords[1],
        DEFAULT_ELEVATION,
        enhancedWeatherData
      );
      if (requestId === abortRef.current) {
        // Merge vector feature data with profile
        if (profile) {
          if (clickedFeatureName) {
            profile.vectorFeatureName = clickedFeatureName;
          }
          if (clickedFeatureType) {
            profile.vectorFeatureType = clickedFeatureType;
          }
          // DEBUG: Log coordinate comparison
          console.log('[VectorWaterMap] COORDINATE DEBUG:');
          console.log('  Click coords:', coords[0].toFixed(6), coords[1].toFixed(6));
          console.log('  Profile coords:', profile.coordinates?.lat?.toFixed(6), profile.coordinates?.lng?.toFixed(6));
          console.log('  AmbientWeather coords:', profile.ambientWeather?.latitude, profile.ambientWeather?.longitude);
          if (profile.ambientWeather?.latitude && 
              Math.abs(profile.coordinates?.lat - profile.ambientWeather?.latitude) > 0.01) {
            console.warn('[VectorWaterMap] WARNING: Profile coords differ from weather station coords!');
          }
        }
        setFishProfile(profile);
        if (profile?.waterBodyName) {
          trackBioApiCall(profile.waterBodyName, profile.waterType);
        }
      }
    } catch (err) {
      console.error('[VectorWaterMap] Fishery profile error:', err);
      if (requestId === abortRef.current) {
        setFishProfile({ error: err.message || 'Failed to load profile' });
      }
    } finally {
      if (requestId === abortRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentWeatherData]);

  const handleClear = useCallback(() => {
    setDroppedPin(null);
    setFishProfile(null);
    setIsLoading(false);
    setSelectedWaterFeature(null);
  }, []);

  const mapHeight = isFullscreen ? 'h-[85vh]' : 'h-[28rem] sm:h-[36rem]';

  return (
    <div
      className={`relative bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''
      }`}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80 z-10 relative">
        <div className="flex items-center gap-2">
          <Fish className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Water Intelligence Map</span>
        </div>
        <div className="flex items-center gap-2">
          {PMTILES_URL && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Waves className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase">Vector Data</span>
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
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          mapLib={maplibregl}
          mapStyle={BASEMAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          cursor={cursorStyle}
          attributionControl={false}
          minZoom={3}
          maxZoom={18}
        >
          <NavigationControl position="top-right" showCompass={true} showZoom={true} />
          <GeolocateControl position="top-right" trackUserLocation={false} />

          {/* PMTiles water features — Utah regional POC with OSM data */}
          {pmtilesReady && PMTILES_URL && (
            <Source
              id="water-pmtiles"
              type="vector"
              url={`pmtiles://${PMTILES_URL}`}
            >
              {/* ─── Water Layer (source-layer: water) ─────────────────────── */}
              {/* All water features from OSM: lakes, reservoirs, rivers, streams, canals */}
              {/* Properties: name, type, waterway, water, natural, intermittent */}
              
              {/* Lakes & Reservoirs (polygon fills) */}
              <Layer
                id="lakes-fill"
                type="fill"
                source-layer="water"
                minzoom={4}
                filter={['any',
                  ['==', ['geometry-type'], 'Polygon'],
                  ['==', ['geometry-type'], 'MultiPolygon']
                ]}
                paint={{
                  'fill-color': [
                    'case',
                    ['==', ['get', 'type'], 'reservoir'], '#2563eb',
                    '#3b82f6'
                  ],
                  'fill-opacity': [
                    'interpolate', ['linear'], ['zoom'],
                    4, 0.2,
                    8, 0.35,
                    14, 0.45
                  ],
                }}
              />
              <Layer
                id="lakes-outline"
                type="line"
                source-layer="water"
                minzoom={6}
                filter={['any',
                  ['==', ['geometry-type'], 'Polygon'],
                  ['==', ['geometry-type'], 'MultiPolygon']
                ]}
                paint={{
                  'line-color': '#1d4ed8',
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    6, 0.5,
                    10, 1,
                    14, 2
                  ],
                  'line-opacity': 0.7,
                }}
              />
              
              {/* Rivers & Streams (lines) */}
              <Layer
                id="streams-line"
                type="line"
                source-layer="water"
                minzoom={6}
                filter={['any',
                  ['==', ['geometry-type'], 'LineString'],
                  ['==', ['geometry-type'], 'MultiLineString']
                ]}
                paint={{
                  'line-color': [
                    'case',
                    ['==', ['get', 'type'], 'river'], '#0284c7',
                    ['==', ['get', 'type'], 'canal'], '#7c3aed',
                    '#0ea5e9'
                  ],
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    6, 1,
                    10, 2.5,
                    14, 5,
                    18, 10
                  ],
                  'line-opacity': [
                    'case',
                    ['==', ['get', 'intermittent'], true], 0.5,
                    0.85
                  ],
                }}
              />
              
              {/* Lake/Reservoir labels */}
              <Layer
                id="lakes-labels"
                type="symbol"
                source-layer="water"
                minzoom={8}
                filter={['all',
                  ['has', 'name'],
                  ['any',
                    ['==', ['geometry-type'], 'Polygon'],
                    ['==', ['geometry-type'], 'MultiPolygon']
                  ]
                ]}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13, 16, 16],
                  'text-font': ['Open Sans Bold'],
                  'text-anchor': 'center',
                  'text-allow-overlap': false,
                  'text-max-width': 8,
                }}
                paint={{
                  'text-color': '#1e40af',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2,
                }}
              />
              
              {/* River/Stream labels (along the line) */}
              <Layer
                id="streams-labels"
                type="symbol"
                source-layer="water"
                minzoom={10}
                filter={['all',
                  ['has', 'name'],
                  ['any',
                    ['==', ['geometry-type'], 'LineString'],
                    ['==', ['geometry-type'], 'MultiLineString']
                  ]
                ]}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 12],
                  'text-font': ['Open Sans Regular'],
                  'symbol-placement': 'line',
                  'text-allow-overlap': false,
                  'text-max-angle': 30,
                }}
                paint={{
                  'text-color': '#0369a1',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 1.5,
                }}
              />
            </Source>
          )}

          {/* Dropped pin marker */}
          {droppedPin && <PinDropMarker coords={droppedPin} />}

          {/* Water feature popup (after click) */}
          {selectedWaterFeature && (
            <Popup
              longitude={selectedWaterFeature.lngLat[0]}
              latitude={selectedWaterFeature.lngLat[1]}
              anchor="bottom"
              onClose={() => setSelectedWaterFeature(null)}
              closeButton={true}
              closeOnClick={false}
            >
              <div className="min-w-[160px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-blue-600">{selectedWaterFeature.name}</span>
                </div>
                <div className="text-xs text-gray-500">{selectedWaterFeature.type}</div>
                {selectedWaterFeature.permanence && (
                  <div className="text-xs text-gray-400 mt-1">{selectedWaterFeature.permanence}</div>
                )}
              </div>
            </Popup>
          )}

          {/* Hover tooltip - shows water name and GPS on hover (desktop only) */}
          {hoveredFeature && !isLoading && !isTouchDevice && (
            <Popup
              longitude={hoveredFeature.lngLat[0]}
              latitude={hoveredFeature.lngLat[1]}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              offset={[0, -10]}
              className="hover-tooltip"
            >
              <div className="flex flex-col gap-0.5 px-2.5 py-1.5 bg-slate-900/95 rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-1.5">
                  <Droplets className={`w-3.5 h-3.5 ${hoveredFeature.hasName ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold whitespace-nowrap ${hoveredFeature.hasName ? 'text-white' : 'text-slate-300 italic'}`}>
                    {hoveredFeature.name}
                  </span>
                  {hoveredFeature.hasName && hoveredFeature.type && hoveredFeature.type !== hoveredFeature.name && (
                    <span className="text-[10px] text-cyan-300/60">
                      · {hoveredFeature.type}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono pl-5">
                  {hoveredFeature.lngLat[1].toFixed(5)}, {hoveredFeature.lngLat[0].toFixed(5)}
                </div>
                {!hoveredFeature.hasName && (
                  <div className="text-[9px] text-slate-500 pl-5">
                    Click for USGS data lookup
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>

        {/* Instructional banner */}
        {!hasDroppedPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs sm:text-sm font-medium">
                {isTouchDevice ? 'Tap any water to analyze' : 'Hover to see names · Tap to analyze'}
              </span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
              <Fish className="w-5 h-5 text-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Analyzing water...</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating fishing card — left side panel */}
      {fishProfile && (
        <div className="absolute top-2 left-2 bottom-2 z-30 w-[320px] max-w-[90vw] flex flex-col">
          <SyntheticFishingCard
            data={fishProfile}
            isLoading={false}
            onClose={handleClear}
          />
        </div>
      )}
    </div>
  );
}

export default VectorWaterMap;
