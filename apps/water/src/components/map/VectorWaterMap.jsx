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

// Global default: North America continental view (user can geolocate)
const GLOBAL_DEFAULT = { longitude: -98.5, latitude: 39.8 };
const GLOBAL_DEFAULT_ZOOM = 3;
const GEOLOCATED_ZOOM = 10;
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
    ...GLOBAL_DEFAULT,
    zoom: GLOBAL_DEFAULT_ZOOM,
  });
  const [geolocateAttempted, setGeolocateAttempted] = useState(false);
  const abortRef = useRef(0);
  const hoveredFeatureIdRef = useRef(null);
  
  // Cache for water body names - maps polygon ID to name
  // This persists across hovers so once we learn a lake's name, we remember it
  const waterNameCacheRef = useRef({});

  // Geolocation: Ask user for location on first load, snap map to them
  useEffect(() => {
    if (geolocateAttempted) return;
    setGeolocateAttempted(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[Geolocation] User location:', position.coords.latitude, position.coords.longitude);
          setViewState({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            zoom: GEOLOCATED_ZOOM,
          });
        },
        (error) => {
          console.log('[Geolocation] User declined or error:', error.message);
          // Keep global default view - already set
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [geolocateAttempted]);

  useEffect(() => {
    console.log('[PMTiles] ========== INITIALIZATION ==========');
    console.log('[PMTiles] VITE_PMTILES_WATER_URL:', PMTILES_URL);
    console.log('[PMTiles] URL type:', typeof PMTILES_URL);
    console.log('[PMTiles] URL length:', PMTILES_URL?.length);
    
    if (!PMTILES_URL) {
      console.error('[PMTiles] ERROR: No URL configured! Check your .env file for VITE_PMTILES_WATER_URL');
      console.log('[PMTiles] All VITE_ env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
      setPmtilesReady(true);
      return;
    }
    
    // Validate URL format
    if (!PMTILES_URL.includes('.pmtiles')) {
      console.error('[PMTiles] ERROR: URL does not appear to be a PMTiles file:', PMTILES_URL);
    }
    
    console.log('[PMTiles] Registering pmtiles protocol...');
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    console.log('[PMTiles] Protocol registered successfully');
    console.log('[PMTiles] Full source URL will be:', `pmtiles://${PMTILES_URL}`);
    console.log('[PMTiles] ====================================');
    setPmtilesReady(true);
    
    // Test fetch the PMTiles header to verify URL is accessible
    fetch(PMTILES_URL, { method: 'HEAD' })
      .then(res => {
        console.log('[PMTiles] HEAD request status:', res.status, res.statusText);
        console.log('[PMTiles] Content-Type:', res.headers.get('content-type'));
        console.log('[PMTiles] Content-Length:', res.headers.get('content-length'));
        if (!res.ok) {
          console.error('[PMTiles] ERROR: PMTiles URL returned non-OK status!');
        }
      })
      .catch(err => {
        console.error('[PMTiles] ERROR: Failed to fetch PMTiles URL:', err.message);
        console.error('[PMTiles] This could be a CORS issue or the URL is incorrect');
      });
    
    return () => {
      console.log('[PMTiles] Cleaning up protocol...');
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  // Water layer IDs for hover detection (both PMTiles and basemap)
  // OpenMapTiles schema: 
  //   'water' = lakes/oceans polygons (NO names!)
  //   'waterway' = rivers/streams lines (has names at high zoom)
  //   'water_name' = lake labels (has names)
  const WATER_LAYER_IDS = [
    'lakes-fill', 'lakes-outline', 'lakes-labels',
    'streams-line', 'streams-labels',
    'water-name-labels', // For lake names from water_name source-layer
  ];

  // Detect if device supports touch (mobile/tablet)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Handle mouse move for hover effects (desktop only)
  const handleMouseMove = useCallback((e) => {
    // Skip hover on touch devices - they use tap instead
    if (isTouchDevice) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SIMPLE HOVER DETECTION
    // Use a tight bbox to verify mouse is actually over water
    // Then extract name from the polygon itself or nearby water_name label
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Tight bounding box (8px) - verify mouse is physically over water
    const tightBbox = [
      [e.point.x - 8, e.point.y - 8],
      [e.point.x + 8, e.point.y + 8]
    ];

    // Query features directly under the mouse
    const tightFeatures = map.queryRenderedFeatures(tightBbox);
    
    // Filter for water-related features (polygons and lines)
    const waterFeatures = tightFeatures.filter(f => {
      const layerId = (f.layer?.id || '').toLowerCase();
      const sourceLayer = (f.sourceLayer || '').toLowerCase();
      
      // Our PMTiles layers
      if (WATER_LAYER_IDS.some(id => layerId === id.toLowerCase())) return true;
      
      // OpenMapTiles source layers
      if (sourceLayer === 'waterway' || sourceLayer === 'water') return true;
      
      // Basemap water layers
      return layerId.includes('water') || 
             layerId.includes('river') || 
             layerId.includes('stream') ||
             layerId.includes('lake') ||
             layerId.includes('ocean') ||
             layerId.includes('sea');
    });
    
    // If no water features under mouse, clear hover state and exit
    if (waterFeatures.length === 0) {
      if (hoveredFeatureIdRef.current !== null) {
        hoveredFeatureIdRef.current = null;
        setHoveredFeature(null);
        setCursorStyle('crosshair');
      }
      return;
    }
    
    
    // Search for water_name labels that belong to the water polygon we're hovering over
    let allWaterNameFeatures = [];
    
    // Get the water polygon we're hovering over (to get its ID for caching)
    const hoveredWaterPolygon = waterFeatures.find(f => {
      const geomType = f.geometry?.type;
      return (geomType === 'Polygon' || geomType === 'MultiPolygon' || f.sourceLayer === 'water') 
             && f.properties?.id;
    });
    
    const polygonId = hoveredWaterPolygon?.properties?.id;
    
    // STRATEGY 1: Check the cache first - if we've seen this polygon before, use cached name
    if (polygonId && waterNameCacheRef.current[polygonId]) {
      // We already know this lake's name!
      allWaterNameFeatures = [{ 
        properties: { name: waterNameCacheRef.current[polygonId] },
        _fromCache: true 
      }];
    }
    
    // STRATEGY 2: Check if there's a label directly under the mouse
    if (allWaterNameFeatures.length === 0) {
      const directLabels = waterFeatures.filter(f => {
        const sourceLayer = (f.sourceLayer || '').toLowerCase();
        const layerId = (f.layer?.id || '').toLowerCase();
        return sourceLayer === 'water_name' || layerId.includes('watername');
      });
      if (directLabels.length > 0) {
        allWaterNameFeatures = directLabels;
        // Cache this name for the polygon ID
        const labelName = directLabels[0].properties?.name;
        if (polygonId && labelName) {
          waterNameCacheRef.current[polygonId] = labelName;
        }
      }
    }
    
    // STRATEGY 3: Search a wide area around the mouse for any water_name labels
    // and cache them for their respective polygons
    if (allWaterNameFeatures.length === 0) {
      const searchRadius = 300;
      const searchBbox = [
        [e.point.x - searchRadius, e.point.y - searchRadius],
        [e.point.x + searchRadius, e.point.y + searchRadius]
      ];
      
      const searchFeatures = map.queryRenderedFeatures(searchBbox);
      const nearbyLabels = searchFeatures.filter(f => {
        const sourceLayer = (f.sourceLayer || '').toLowerCase();
        const layerId = (f.layer?.id || '').toLowerCase();
        return sourceLayer === 'water_name' || 
               layerId.includes('watername') ||
               layerId === 'lakes-labels' ||
               layerId === 'water-name-labels';
      });
      
      // For each label found, try to find which polygon it belongs to
      // by querying the polygon at the label's location
      nearbyLabels.forEach(label => {
        if (label.geometry?.type === 'Point' && label.properties?.name) {
          const labelCoords = label.geometry.coordinates;
          const labelScreen = map.project(labelCoords);
          
          // Query for water polygons at this label's location
          const polygonsAtLabel = map.queryRenderedFeatures(
            [labelScreen.x, labelScreen.y],
            { layers: ['lakes-fill', 'water'] }
          ).filter(f => f.properties?.id);
          
          // Cache the name for each polygon found at this label
          polygonsAtLabel.forEach(poly => {
            const pid = poly.properties.id;
            if (pid && !waterNameCacheRef.current[pid]) {
              waterNameCacheRef.current[pid] = label.properties.name;
            }
          });
        }
      });
      
      // Now check cache again
      if (polygonId && waterNameCacheRef.current[polygonId]) {
        allWaterNameFeatures = [{ 
          properties: { name: waterNameCacheRef.current[polygonId] },
          _fromCache: true 
        }];
      }
    }
    
    
    // Combine: water features from tight query + water_name from search
    let features = [...waterFeatures];
    for (const wnf of allWaterNameFeatures) {
      if (!features.some(f => f.id === wnf.id && f.layer?.id === wnf.layer?.id)) {
        features.push(wnf);
      }
    }

    if (features.length > 0) {
      // Helper to detect if a feature is a river/stream
      // OpenMapTiles uses 'class' property and 'waterway' source-layer
      // IMPORTANT: Exclude water_name labels - they are NOT rivers!
      const isRiverFeature = (f) => {
        // First, exclude water_name labels - they're lake/ocean names, not rivers
        const layerId = (f.layer?.id || '').toLowerCase();
        if (f.sourceLayer === 'water_name' || 
            layerId.includes('watername') || 
            layerId.includes('water_name') ||
            layerId === 'lakes-labels') {
          return false;
        }
        
        const geomType = f.geometry?.type;
        const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
        const hasWaterway = !!f.properties?.waterway;
        const featureClass = f.properties?.class;
        const classIsRiver = featureClass === 'river' || 
                             featureClass === 'stream' || 
                             featureClass === 'canal' ||
                             featureClass === 'drain';
        const typeIsRiver = f.properties?.type === 'river' || 
                            f.properties?.type === 'stream' || 
                            f.properties?.type === 'canal';
        const layerIsStream = f.layer?.id?.includes('stream');
        const sourceIsWaterway = f.sourceLayer === 'waterway';
        return isLine || hasWaterway || classIsRiver || typeIsRiver || layerIsStream || sourceIsWaterway;
      };
      
      // Helper to detect if a feature is a water polygon (lake/reservoir/ocean)
      const isWaterPolygon = (f) => {
        const geomType = f.geometry?.type;
        const isPolygon = geomType === 'Polygon' || geomType === 'MultiPolygon';
        const sourceIsWater = f.sourceLayer === 'water';
        const layerIsLake = f.layer?.id?.includes('lake') || f.layer?.id?.includes('water');
        return isPolygon || sourceIsWater || layerIsLake;
      };
      
      // Helper to detect if feature is a water_name label (point feature with lake/reservoir name)
      // OpenMapTiles: source-layer = 'water_name'
      // Carto basemap: layer ids like 'watername_lake', 'watername_ocean', 'watername_sea'
      const isWaterNameLabel = (f) => {
        const layerId = f.layer?.id || '';
        return f.sourceLayer === 'water_name' || 
               layerId.includes('watername') ||
               layerId.includes('water_name') ||
               layerId.includes('water-name') ||
               layerId === 'lakes-labels'; // Our PMTiles lake labels
      };
      
      // Helper to get name from feature
      // Check ALL possible name properties that might be in the global PMTiles
      const getFeatureName = (f) => {
        if (!f?.properties) return null;
        const p = f.properties;
        return p['name:en'] ||    // OpenMapTiles standard
               p.name ||           // Common
               p.name_en ||        // Alternative English
               p.NAME ||           // Uppercase variant
               p.Name ||           // Title case variant
               p['name:latin'] ||  // Latin script name
               p.int_name ||       // International name
               p.loc_name ||       // Local name
               p.alt_name ||       // Alternative name
               p.official_name ||  // Official name
               p.ref ||            // Reference (sometimes used for water bodies)
               null;
      };
      
      // Separate features by type
      const riverFeatures = features.filter(f => isRiverFeature(f));
      const waterNameFeaturesInResults = features.filter(f => isWaterNameLabel(f));
      const waterPolygonFeatures = features.filter(f => isWaterPolygon(f) && !isWaterNameLabel(f));
      
      // Find named features - prioritize water_name layer for lakes since water polygons don't have names
      const namedRiver = riverFeatures.find(f => getFeatureName(f));
      const namedWaterName = waterNameFeaturesInResults.find(f => getFeatureName(f)); // water_name has the lake names!
      const namedFeature = features.find(f => getFeatureName(f));
      
      
      
      // PRIORITY ORDER for lakes/reservoirs:
      // 1. Named river (from waterway layer) - rivers have names directly
      // 2. Named water_name feature (lake/sea/ocean names) - THIS IS WHERE LAKE NAMES ARE!
      // 3. Any named feature from any layer
      // 4. Any river feature (even unnamed)
      // 5. Any water polygon (will show as "Unnamed Lake/Reservoir")
      // 6. First feature
      
      // For lakes: If we have a water polygon AND a water_name, prefer water_name for the name
      let feature;
      let name;
      
      if (namedRiver) {
        // Rivers: use the river feature directly
        feature = namedRiver;
        name = getFeatureName(namedRiver);
      } else if (namedWaterName) {
        // Lakes/Reservoirs: water_name has the name, but we might want to show the polygon
        // Use water_name for the name, but keep polygon for type detection
        feature = waterPolygonFeatures[0] || namedWaterName;
        name = getFeatureName(namedWaterName);
      } else if (namedFeature) {
        feature = namedFeature;
        name = getFeatureName(namedFeature);
      } else if (riverFeatures[0]) {
        feature = riverFeatures[0];
        name = null; // Unnamed river
      } else if (waterPolygonFeatures[0]) {
        feature = waterPolygonFeatures[0];
        name = null; // Unnamed lake - water_name not in bbox
      } else {
        feature = features[0];
        name = getFeatureName(features[0]);
      }
      
      const featureId = feature.id || `${feature.layer?.id}-${name || 'unnamed'}-${Math.round(e.point.x / 20)}`;
      
      // Only update if hovering over a different feature
      if (hoveredFeatureIdRef.current !== featureId) {
        hoveredFeatureIdRef.current = featureId;
        
        // Get the water type from OpenMapTiles 'class' property
        const props = feature.properties || {};
        const waterClass = props.class || props.subclass || props.type || props.waterway;
        const type = extractWaterType(props, feature.layer?.id);
        
        
        // Helper to capitalize first letter
        const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
        
        // If no name, show a clean fallback based on class/type
        // For global PMTiles, just show the water type (Lake, River, etc.) without "Unnamed"
        let displayName = name;
        if (!displayName) {
          // Skip non-natural water features entirely
          if (waterClass === 'dock' || waterClass === 'swimming_pool' || waterClass === 'basin') {
            displayName = null;
          }
          // Ocean and Sea don't need "Unnamed" prefix
          else if (waterClass === 'ocean') displayName = 'Ocean';
          else if (waterClass === 'sea') displayName = 'Sea';
          // For lakes/reservoirs/rivers, show clean type name
          else if (waterClass === 'lake') displayName = 'Lake';
          else if (waterClass === 'reservoir') displayName = 'Reservoir';
          else if (waterClass === 'river') displayName = 'River';
          else if (waterClass === 'stream') displayName = 'Stream';
          else if (waterClass === 'canal') displayName = 'Canal';
          else if (waterClass === 'drain') displayName = 'Drainage';
          // Use the class directly if it exists, capitalized
          else if (waterClass) displayName = capitalize(waterClass);
          // Final fallback to extracted type or generic "Water"
          else displayName = type || 'Water';
        }
        
        // Skip non-natural water features
        if (!displayName) {
          hoveredFeatureIdRef.current = null;
          setHoveredFeature(null);
          setCursorStyle('crosshair');
          return;
        }
        
        setHoveredFeature({
          name: displayName,
          type: waterClass || type,
          lngLat: [e.lngLat.lng, e.lngLat.lat],
          layerId: feature.layer?.id,
          sourceLayer: feature.sourceLayer,
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

    // Query all water-related layers from our PMTiles
    // Include label layers as they have the same properties but larger hit areas
    const waterLayerIds = [
      'lakes-fill', 'lakes-outline',          // Water polygons
      'streams-line',                          // Waterway lines
      'lakes-labels', 'streams-labels',        // Labels (easier to click)
      'water-name-labels',                     // Lake names from water_name source-layer
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
      
      // Try to extract name from basemap feature (OpenMapTiles uses name:en)
      const basemapName = basemapWaterFeature.properties?.['name:en'] ||
                          basemapWaterFeature.properties?.name || 
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

      // Also query ALL features at this point to find water_name labels
      const allFeaturesAtPoint = map.queryRenderedFeatures(bbox);
      const waterNameFeatures = allFeaturesAtPoint.filter(f => f.sourceLayer === 'water_name');
      
      if (features.length > 0) {
        console.log('[VectorWaterMap] All features found:', features.map(f => ({
          layer: f.layer?.id,
          sourceLayer: f.sourceLayer,
          name: f.properties?.name,
          'name:en': f.properties?.['name:en'],
          class: f.properties?.class,
          geometry: f.geometry?.type,
        })));
        
        // Helper to detect if a feature is a river/stream (line geometry or waterway property)
        // OpenMapTiles uses 'class' property and 'waterway' source-layer
        const isRiverFeature = (f) => {
          const geomType = f.geometry?.type;
          const isLine = geomType === 'LineString' || geomType === 'MultiLineString';
          const hasWaterway = !!f.properties?.waterway;
          const featureClass = f.properties?.class;
          const classIsRiver = featureClass === 'river' || 
                               featureClass === 'stream' || 
                               featureClass === 'canal' ||
                               featureClass === 'drain';
          const typeIsRiver = f.properties?.type === 'river' || 
                              f.properties?.type === 'stream' || 
                              f.properties?.type === 'canal';
          const layerIsStream = f.layer?.id?.includes('stream');
          const sourceIsWaterway = f.sourceLayer === 'waterway';
          return isLine || hasWaterway || classIsRiver || typeIsRiver || layerIsStream || sourceIsWaterway;
        };
        
        // Helper to detect water polygons
        const isWaterPolygon = (f) => {
          const geomType = f.geometry?.type;
          const isPolygon = geomType === 'Polygon' || geomType === 'MultiPolygon';
          const sourceIsWater = f.sourceLayer === 'water';
          const layerIsLake = f.layer?.id?.includes('lake') || f.layer?.id?.includes('water');
          return isPolygon || sourceIsWater || layerIsLake;
        };
        
        // Helper to get name from feature (OpenMapTiles uses name:en)
        const getFeatureName = (f) => f.properties?.['name:en'] || f.properties?.name;
        
        // Separate features by type
        const riverFeatures = features.filter(f => isRiverFeature(f));
        const lakeFeatures = features.filter(f => !isRiverFeature(f));
        
        console.log('[VectorWaterMap] Rivers:', riverFeatures.length, 'Lakes:', lakeFeatures.length, 'WaterNames:', waterNameFeatures.length);
        
        // Find named features
        const namedRiverFeature = riverFeatures.find(f => getFeatureName(f));
        const unnamedRiverFeature = riverFeatures[0];
        const namedWaterNameFeature = waterNameFeatures.find(f => getFeatureName(f));
        const namedLakeFeature = lakeFeatures.find(f => getFeatureName(f));
        
        // PRIORITY ORDER - ALWAYS prefer rivers/streams over lakes when both are present
        // 1. Named river/stream features (LineString with name) - BEST match
        // 2. Unnamed river/stream features (user clicked on visible river line)
        // 3. Named water_name feature (lake/reservoir names from water_name layer)
        // 4. Named polygon features (lakes, reservoirs)
        // 5. Any feature
        let feature;
        if (riverFeatures.length > 0) {
          // If there are ANY river features, prefer them
          feature = namedRiverFeature || unnamedRiverFeature;
          if (feature) {
            console.log('[VectorWaterMap] Prioritizing river feature:', getFeatureName(feature) || '(unnamed)');
          }
        } else {
          // No rivers, use lake - prefer water_name for the name
          feature = namedLakeFeature || features[0];
        }
        
        // Guard against undefined feature
        if (!feature) {
          console.log('[VectorWaterMap] No valid feature found');
          return;
        }
        
        console.log('[VectorWaterMap] Feature selection:', {
          namedRiver: namedRiverFeature ? getFeatureName(namedRiverFeature) : null,
          unnamedRiver: unnamedRiverFeature ? 'yes' : 'no',
          namedWaterName: namedWaterNameFeature ? getFeatureName(namedWaterNameFeature) : null,
          namedLake: namedLakeFeature ? getFeatureName(namedLakeFeature) : null,
          selected: getFeatureName(feature),
        });
        
        clickedLayerId = feature.layer?.id;
        console.log('[VectorWaterMap] Selected feature from layer:', clickedLayerId);
        console.log('[VectorWaterMap] Properties:', feature.properties);

        // For our PMTiles (OpenMapTiles schema), prefer 'name:en' then 'name'
        // If the feature doesn't have a name (water polygons don't!), try water_name layer
        clickedFeatureName = getFeatureName(feature);
        
        // If no name and this is a water polygon, get name from water_name layer
        if (!clickedFeatureName && isWaterPolygon(feature) && namedWaterNameFeature) {
          clickedFeatureName = getFeatureName(namedWaterNameFeature);
          console.log('[VectorWaterMap] Got lake name from water_name layer:', clickedFeatureName);
        }
        clickedFeatureType = extractWaterType(feature.properties, clickedLayerId);
        featureIsSaltwater = isSaltwater(feature.properties);
        
        // Determine if this is a river/stream based on properties or layer
        // OpenMapTiles uses 'class' property (river, stream, canal, drain, ditch)
        const isStreamLayer = clickedLayerId?.includes('stream') || clickedLayerId?.includes('river');
        const featureClass = feature.properties?.class;
        const isStreamType = feature.properties?.waterway || 
                             featureClass === 'river' || 
                             featureClass === 'stream' ||
                             featureClass === 'canal' ||
                             feature.properties?.type === 'river' || 
                             feature.properties?.type === 'stream' ||
                             feature.properties?.type === 'canal';
        
        if (isStreamLayer || isStreamType) {
          clickedFeatureType = featureClass === 'river' ? 'River' : 
                               featureClass === 'stream' ? 'Stream' : 
                               featureClass === 'canal' ? 'Canal' : 'River/Stream';
          console.log('[VectorWaterMap] Stream/river detected, class:', featureClass, 'type:', clickedFeatureType);
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
          onLoad={() => {
            const map = mapRef.current?.getMap();
            if (map) {
              console.log('[Map] ========== MAP LOADED ==========');
              const sources = map.getStyle()?.sources || {};
              console.log('[Map] All sources:', Object.keys(sources));
              const layers = map.getStyle()?.layers?.map(l => l.id) || [];
              const waterLayers = layers.filter(l => l.includes('water') || l.includes('lake') || l.includes('stream'));
              console.log('[Map] Water-related layers:', waterLayers);
              
              // Check if our PMTiles source exists
              if (sources['water-pmtiles']) {
                console.log('[Map] SUCCESS: PMTiles source found!');
                console.log('[Map] PMTiles source config:', JSON.stringify(sources['water-pmtiles'], null, 2));
              } else {
                console.error('[Map] ERROR: PMTiles source NOT found!');
                console.log('[Map] pmtilesReady state:', pmtilesReady);
                console.log('[Map] PMTILES_URL:', PMTILES_URL);
                console.log('[Map] This means the <Source> component did not render');
              }
              
              // List all layers from our source
              const ourLayers = layers.filter(l => 
                l.includes('lakes-') || l.includes('streams-') || l.includes('water-name')
              );
              console.log('[Map] Our PMTiles layers:', ourLayers);
              console.log('[Map] ==================================');
            }
          }}
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

          {/* PMTiles water features — Global Planetiler/OpenMapTiles schema from Cloudflare R2 */}
          {/* OpenMapTiles schema: 'water' = lakes/oceans (polygons), 'waterway' = rivers/streams (lines) */}
          {/* Properties: name, name:en, class, subclass, intermittent, brunnel */}
          {pmtilesReady && PMTILES_URL && (
            <Source
              id="water-pmtiles"
              type="vector"
              url={`pmtiles://${PMTILES_URL}`}
            >
              {/* ─── Water Layer (source-layer: water) ─────────────────────── */}
              {/* Lakes, reservoirs, oceans, seas (polygons) */}
              
              {/* Lakes & Reservoirs (polygon fills) */}
              <Layer
                id="lakes-fill"
                type="fill"
                source-layer="water"
                minzoom={4}
                paint={{
                  'fill-color': [
                    'case',
                    ['==', ['get', 'class'], 'ocean'], '#1e3a5f',
                    ['==', ['get', 'class'], 'sea'], '#1e4976',
                    '#3b82f6'
                  ],
                  'fill-opacity': [
                    'interpolate', ['linear'], ['zoom'],
                    4, 0.25,
                    8, 0.4,
                    14, 0.5
                  ],
                }}
              />
              <Layer
                id="lakes-outline"
                type="line"
                source-layer="water"
                minzoom={6}
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
              
              {/* Lake/Reservoir labels */}
              <Layer
                id="lakes-labels"
                type="symbol"
                source-layer="water_name"
                minzoom={4}
                layout={{
                  'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13, 16, 16],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
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
              
              {/* ─── Waterway Layer (source-layer: waterway) ─────────────────────── */}
              {/* Rivers, streams, canals, drains (lines) */}
              
              {/* Rivers & Streams (lines) */}
              <Layer
                id="streams-line"
                type="line"
                source-layer="waterway"
                minzoom={6}
                paint={{
                  'line-color': [
                    'case',
                    ['==', ['get', 'class'], 'river'], '#0284c7',
                    ['==', ['get', 'class'], 'canal'], '#7c3aed',
                    ['==', ['get', 'class'], 'stream'], '#0ea5e9',
                    '#38bdf8'
                  ],
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    6, ['case', ['==', ['get', 'class'], 'river'], 2, 1],
                    10, ['case', ['==', ['get', 'class'], 'river'], 4, 2.5],
                    14, ['case', ['==', ['get', 'class'], 'river'], 8, 5],
                    18, ['case', ['==', ['get', 'class'], 'river'], 14, 10]
                  ],
                  'line-opacity': [
                    'case',
                    ['==', ['get', 'intermittent'], 1], 0.5,
                    0.85
                  ],
                }}
              />
              
              {/* River/Stream labels (along the line) */}
              <Layer
                id="streams-labels"
                type="symbol"
                source-layer="waterway"
                minzoom={10}
                filter={['has', 'name']}
                layout={{
                  'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 12],
                  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
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
              
              {/* ─── Water Name Layer (source-layer: water_name) ─────────────────────── */}
              {/* Lake/sea/ocean names - this is where lake names live in OpenMapTiles! */}
              {/* The 'water' polygon layer does NOT have names, only water_name does */}
              <Layer
                id="water-name-labels"
                type="symbol"
                source-layer="water_name"
                minzoom={4}
                layout={{
                  'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 12, 14, 14],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
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
