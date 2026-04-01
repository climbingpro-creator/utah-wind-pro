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
 * Check if a name looks like an actual water body name (vs a location/landmark)
 */
function isWaterBodyName(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('river') || 
         lower.includes('creek') || 
         lower.includes('stream') || 
         lower.includes('lake') ||
         lower.includes('reservoir') ||
         lower.includes('pond') ||
         lower.includes('canal') ||
         lower.includes('wash') ||
         lower.includes('fork') ||  // e.g., "North Fork"
         lower.includes('branch');  // e.g., "East Branch"
}

/**
 * Extract water body name from feature properties
 * Handles both USGS NHD and OpenStreetMap property naming conventions
 * Returns { name, isActualWaterName } to indicate if it's a real water body name
 */
function extractWaterName(properties, _layerId = null) {
  if (!properties) return null;
  
  // USGS NHD naming (case variations)
  const usgsName = properties.gnis_name || properties.GNIS_Name || properties.GNIS_NAME;
  
  // OpenStreetMap naming
  const osmName = properties.name || properties['name:en'];
  
  // Fallback to any name-like property
  const fallbackName = properties.NAME || properties.Name;
  
  // Get the best available name
  const name = usgsName || osmName || fallbackName || null;
  
  // If we got a name, check if it's actually a water body name
  // Names like "Nunns" are location markers, not water body names
  if (name && !isWaterBodyName(name)) {
    // This is likely a location marker on a stream, not the stream's name
    // Return null so we can try to get the real name from USGS API
    console.log(`[extractWaterName] "${name}" doesn't look like a water body name, ignoring`);
    return null;
  }
  
  return name;
}

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

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Query our PMTiles water layers first
    const waterLayerIds = WATER_LAYER_IDS.filter(id => map.getLayer(id));
    let features = waterLayerIds.length > 0 
      ? map.queryRenderedFeatures(e.point, { layers: waterLayerIds })
      : [];

    // If no PMTiles features, check basemap water layers
    if (features.length === 0) {
      const allFeatures = map.queryRenderedFeatures(e.point);
      
      // Debug: log all layers under cursor (remove after debugging)
      if (allFeatures.length > 0 && !window._lastHoverDebug) {
        console.log('[Hover] All layers under cursor:', allFeatures.map(f => ({ 
          layer: f.layer?.id, 
          source: f.sourceLayer, 
          type: f.layer?.type,
          props: Object.keys(f.properties || {}).slice(0, 5)
        })));
        window._lastHoverDebug = Date.now();
        setTimeout(() => { window._lastHoverDebug = null; }, 2000); // Throttle logging
      }
      
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
        console.log('[Hover] Found basemap water:', basemapWater.layer?.id, basemapWater.sourceLayer, basemapWater.properties);
      }
    }

    if (features.length > 0) {
      const feature = features[0];
      const featureId = feature.id || `${feature.layer?.id}-${Math.round(e.point.x)}-${Math.round(e.point.y)}`;
      
      // Only update if hovering over a different feature (use rounded coords for stability)
      if (hoveredFeatureIdRef.current !== featureId) {
        hoveredFeatureIdRef.current = featureId;
        
        // Extract name and type
        const name = extractWaterName(feature.properties, feature.layer?.id) ||
                     feature.properties?.name ||
                     feature.properties?.name_en ||
                     feature.properties?.class;
        const type = extractWaterType(feature.properties, feature.layer?.id);
        
        console.log('[Hover] Water feature:', { name, type, layerId: feature.layer?.id, props: feature.properties });
        
        setHoveredFeature({
          name: name || type || 'Water',
          type,
          lngLat: [e.lngLat.lng, e.lngLat.lat],
          layerId: feature.layer?.id,
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
      // First try exact point query
      let features = map.queryRenderedFeatures(e.point, { layers: waterLayerIds });
      
      // If no features found, try a small bounding box around the click (helps with thin lines)
      if (features.length === 0) {
        const bbox = [
          [e.point.x - 10, e.point.y - 10],
          [e.point.x + 10, e.point.y + 10]
        ];
        features = map.queryRenderedFeatures(bbox, { layers: waterLayerIds });
        console.log('[VectorWaterMap] Expanded bbox query found:', features.length, 'features');
      }
      
      console.log('[VectorWaterMap] Our layers:', waterLayerIds, 'Features found:', features.length);

      if (features.length > 0) {
        console.log('[VectorWaterMap] All features found:', features.map(f => ({
          layer: f.layer?.id,
          name: f.properties?.gnis_name || f.properties?.GNIS_Name || f.properties?.name,
        })));
        
        // PRIORITY ORDER:
        // 1. Stream/river features (even without names) - user likely clicked on the visible river line
        // 2. Named water features
        // 3. Any feature
        const streamFeature = features.find(f => 
          f.layer?.id?.includes('stream') || f.layer?.id?.includes('river')
        );
        const namedFeature = features.find(f => extractWaterName(f.properties, f.layer?.id));
        
        // Prefer stream features over lakes when both are present
        const feature = streamFeature || namedFeature || features[0];
        
        clickedLayerId = feature.layer?.id;
        console.log('[VectorWaterMap] Selected feature from layer:', clickedLayerId);
        console.log('[VectorWaterMap] Properties:', feature.properties);

        // Use unified extraction functions for USGS + OSM compatibility
        clickedFeatureName = extractWaterName(feature.properties, clickedLayerId);
        clickedFeatureType = extractWaterType(feature.properties, clickedLayerId);
        featureIsSaltwater = isSaltwater(feature.properties);
        
        // IMPORTANT: If we clicked on a stream/river layer but couldn't get the name,
        // still mark it as a river so we don't fall back to nearby lakes
        const isStreamLayer = clickedLayerId?.includes('stream') || clickedLayerId?.includes('river');
        if (isStreamLayer) {
          // Force the type to be "River/Stream" so profile generator knows not to match lakes
          clickedFeatureType = 'River/Stream';
          console.log('[VectorWaterMap] Stream layer detected, setting type to River/Stream');
        }
        
        console.log('[VectorWaterMap] Final - name:', clickedFeatureName, 'type:', clickedFeatureType);
        
        if (clickedFeatureName) {
          setSelectedWaterFeature({
            name: clickedFeatureName,
            type: clickedFeatureType,
            permanence: feature.properties?.FCode_Text || feature.properties?.permanence || feature.properties?.intermittent || null,
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

          {/* PMTiles water features — supports both USGS NHD (US) and OSM (global) data */}
          {pmtilesReady && PMTILES_URL && (
            <Source
              id="water-pmtiles"
              type="vector"
              url={`pmtiles://${PMTILES_URL}`}
            >
              {/* ─── USGS NHD Layers (US data) ─────────────────────────────── */}
              {/* Lakes & Reservoirs (polygon fills) — source-layer: utah-lakes-hires */}
              <Layer
                id="lakes-fill"
                type="fill"
                source-layer="utah-lakes-hires"
                minzoom={6}
                paint={{
                  'fill-color': '#3b82f6',
                  'fill-opacity': [
                    'interpolate', ['linear'], ['zoom'],
                    6, 0.15,
                    10, 0.3,
                    14, 0.4
                  ],
                }}
              />
              <Layer
                id="lakes-outline"
                type="line"
                source-layer="utah-lakes-hires"
                minzoom={8}
                paint={{
                  'line-color': '#1d4ed8',
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    8, 0.5,
                    12, 1.5
                  ],
                  'line-opacity': 0.6,
                }}
              />
              {/* Streams & Rivers (lines) — source-layer: utah-streams-hires */}
              <Layer
                id="streams-line"
                type="line"
                source-layer="utah-streams-hires"
                minzoom={8}
                paint={{
                  'line-color': '#0ea5e9',
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    8, 1.5,
                    10, 2.5,
                    14, 4,
                    18, 8
                  ],
                  'line-opacity': 0.8,
                }}
              />
              {/* Lake labels — check both USGS and OSM naming */}
              <Layer
                id="lakes-labels"
                type="symbol"
                source-layer="utah-lakes-hires"
                minzoom={9}
                filter={['any', ['has', 'gnis_name'], ['has', 'GNIS_Name'], ['has', 'name']]}
                layout={{
                  'text-field': ['coalesce', ['get', 'gnis_name'], ['get', 'GNIS_Name'], ['get', 'name']],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 14],
                  'text-font': ['Open Sans Bold'],
                  'text-anchor': 'center',
                  'text-allow-overlap': false,
                }}
                paint={{
                  'text-color': '#1e40af',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2,
                }}
              />
              {/* Stream labels — check both USGS and OSM naming */}
              <Layer
                id="streams-labels"
                type="symbol"
                source-layer="utah-streams-hires"
                minzoom={12}
                filter={['any', ['has', 'gnis_name'], ['has', 'GNIS_Name'], ['has', 'name']]}
                layout={{
                  'text-field': ['coalesce', ['get', 'gnis_name'], ['get', 'GNIS_Name'], ['get', 'name']],
                  'text-size': 10,
                  'text-font': ['Open Sans Regular'],
                  'symbol-placement': 'line',
                  'text-allow-overlap': false,
                }}
                paint={{
                  'text-color': '#0369a1',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 1.5,
                }}
              />
              
              {/* ─── OSM Global Layers (when global PMTiles available) ────── */}
              {/* These layers will activate when global-water.pmtiles is deployed */}
              {/* Lakes from OSM (source-layer: lakes) */}
              <Layer
                id="osm-lakes"
                type="fill"
                source-layer="lakes"
                minzoom={4}
                paint={{
                  'fill-color': '#3b82f6',
                  'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.1, 10, 0.35],
                }}
              />
              {/* Rivers from OSM (source-layer: rivers) */}
              <Layer
                id="osm-rivers"
                type="line"
                source-layer="rivers"
                minzoom={6}
                paint={{
                  'line-color': '#0ea5e9',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 2, 16, 4],
                  'line-opacity': 0.7,
                }}
              />
              {/* Ocean/coastline from OSM (source-layer: oceans) */}
              <Layer
                id="osm-ocean"
                type="fill"
                source-layer="oceans"
                minzoom={0}
                paint={{
                  'fill-color': '#1e3a5f',
                  'fill-opacity': 0.15,
                }}
              />
              {/* OSM water labels */}
              <Layer
                id="osm-water-labels"
                type="symbol"
                source-layer="lakes"
                minzoom={8}
                filter={['has', 'name']}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14],
                  'text-font': ['Open Sans Bold'],
                  'text-anchor': 'center',
                  'text-allow-overlap': false,
                }}
                paint={{
                  'text-color': '#1e40af',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2,
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

          {/* Hover tooltip - shows water name and GPS on hover */}
          {hoveredFeature && !isLoading && (
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
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    {hoveredFeature.name}
                  </span>
                  {hoveredFeature.type && hoveredFeature.type !== hoveredFeature.name && (
                    <span className="text-[10px] text-cyan-300/60">
                      · {hoveredFeature.type}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono pl-5">
                  {hoveredFeature.lngLat[1].toFixed(5)}, {hoveredFeature.lngLat[0].toFixed(5)}
                </div>
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
                Hover to see names · Tap to analyze
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
