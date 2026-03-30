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
  const [viewState, setViewState] = useState({
    ...UTAH_CENTER,
    zoom: DEFAULT_ZOOM,
  });
  const abortRef = useRef(0);

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

  const handleMapClick = useCallback(async (e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const layerIds = ['lakes-fill', 'streams-line'].filter(id => map.getLayer(id));
    const waterLayerExists = layerIds.length > 0;
    
    if (waterLayerExists) {
      const features = map.queryRenderedFeatures(e.point, { layers: layerIds });

      if (features.length === 0) {
        setSelectedWaterFeature(null);
        setDroppedPin(null);
        setFishProfile(null);
        return;
      }

      const feature = features[0];
      console.log('Clicked feature:', feature);

      const name = feature.properties?.GNIS_Name || feature.properties?.GNIS_NAME || feature.properties?.gnis_name || feature.properties?.name || null;
      
      if (!name) {
        setSelectedWaterFeature(null);
        setDroppedPin(null);
        setFishProfile(null);
        return;
      }

      const type = feature.properties?.FType || feature.properties?.FTYPE || feature.properties?.ftype || feature.properties?.fcode_d || 'Stream/River';
      
      setSelectedWaterFeature({
        name,
        type,
        permanence: feature.properties?.FCode_Text || feature.properties?.permanence || null,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });

      const coords = [e.lngLat.lat, e.lngLat.lng];
      const requestId = ++abortRef.current;
      setDroppedPin(coords);
      setHasDroppedPin(true);
      setIsLoading(true);
      setFishProfile(null);
      trackPinDrop(coords[0], coords[1], 'water');

      try {
        const profile = await generateFisheryProfile(
          coords[0],
          coords[1],
          DEFAULT_ELEVATION,
          currentWeatherData
        );
        if (requestId === abortRef.current) {
          setFishProfile(profile);
          if (profile?.waterBodyName) {
            trackBioApiCall(profile.waterBodyName, profile.waterType);
          }
        }
      } catch (err) {
        console.error('Fishery profile error:', err);
      } finally {
        if (requestId === abortRef.current) {
          setIsLoading(false);
        }
      }
    } else {
      setSelectedWaterFeature(null);
      setDroppedPin(null);
      setFishProfile(null);
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

          {/* PMTiles water features — dual-layer USGS NHD dataset */}
          {pmtilesReady && PMTILES_URL && (
            <Source
              id="water-pmtiles"
              type="vector"
              url={`pmtiles://${PMTILES_URL}`}
            >
              {/* Lakes & Reservoirs (polygon fills) — source-layer: utahlakeshires */}
              <Layer
                id="lakes-fill"
                type="fill"
                source-layer="utahlakeshires"
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
                source-layer="utahlakeshires"
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
              {/* Streams & Rivers (lines) — source-layer: utahstreamshires */}
              <Layer
                id="streams-line"
                type="line"
                source-layer="utahstreamshires"
                minzoom={10}
                paint={{
                  'line-color': '#0ea5e9',
                  'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    10, 1,
                    14, 2.5,
                    18, 5
                  ],
                  'line-opacity': 0.7,
                }}
              />
              {/* Lake labels */}
              <Layer
                id="lakes-labels"
                type="symbol"
                source-layer="utahlakeshires"
                minzoom={9}
                filter={['has', 'GNIS_Name']}
                layout={{
                  'text-field': ['get', 'GNIS_Name'],
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
              {/* Stream labels */}
              <Layer
                id="streams-labels"
                type="symbol"
                source-layer="utahstreamshires"
                minzoom={12}
                filter={['has', 'GNIS_Name']}
                layout={{
                  'text-field': ['get', 'GNIS_Name'],
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
            </Source>
          )}

          {/* Dropped pin marker */}
          {droppedPin && <PinDropMarker coords={droppedPin} />}

          {/* Water feature popup */}
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
                Tap any water to analyze fishing conditions
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

      {/* Floating fishing card — bottom sheet style */}
      {fishProfile && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent max-h-[60%] overflow-y-auto">
          <div className="max-w-sm mx-auto">
            <SyntheticFishingCard
              data={fishProfile}
              isLoading={false}
              onClose={handleClear}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorWaterMap;
