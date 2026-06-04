import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MapGL, { Source, Layer, Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Maximize2, X, Wind, Droplets, Layers } from 'lucide-react';

const PMTILES_URL = import.meta.env.VITE_PMTILES_WATER_URL || null;
import { LAKE_CONFIGS, STATION_REGISTRY, SpatialInterpolator, applySurfacePhysics, calculateFetchMultiplier, calculateVenturiMultiplier, weatherService, isIOS, updateLiveStationField } from '@utahwind/weather';
import { trackPinDrop } from '@utahwind/ui';
import { impactMedium, impactLight } from '../services/HapticService';
import { safeToFixed } from '../utils/safeToFixed';
import SyntheticForecastCard from './map/SyntheticForecastCard';
import StationPopupCard from './map/StationPopupCard';
import WindStreamLayer from './map/WindStreamLayer';

const MAP_AREAS = {
  'utah-lake': {
    name: 'Utah Lake',
    center: [-111.83, 40.23],
    zoom: 10,
    launches: ['utah-lake-lincoln', 'utah-lake-sandy', 'utah-lake-vineyard', 'utah-lake-zigzag', 'utah-lake-mm19'],
    stations: [
      { id: 'FPS', name: 'Flight Park South', lat: 40.4555, lng: -111.9208, type: 'nws', elevation: 5202 },
      { id: 'KPVU', name: 'Provo Airport', lat: 40.2192, lng: -111.7236, type: 'nws', elevation: 4495, isNorthFlowIndicator: true, isSouthernIndicator: true },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'nws', elevation: 4226, isNorthFlowIndicator: true },
      { id: 'QLN', name: 'Lindon', lat: 40.3431, lng: -111.7136, type: 'nws', elevation: 4738 },
      { id: 'UTALP', name: 'Point of Mountain', lat: 40.4456, lng: -111.8983, type: 'nws', elevation: 4796, isNorthFlowIndicator: true, isGapIndicator: true },
      { id: 'CSC', name: 'Cascade Peak', lat: 40.2667, lng: -111.6167, type: 'nws', elevation: 10875, isRidge: true },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'nws', elevation: 8170, isRidge: true },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'nws', elevation: 8252, isRidge: true },
      { id: 'QSF', name: 'Spanish Fork', lat: 40.115, lng: -111.655, type: 'nws', elevation: 4550, isEarlyIndicator: true },
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
      { id: 'KHCR', name: 'Heber Airport', lat: 40.4822, lng: -111.4286, type: 'nws', elevation: 5597 },
      { id: 'TIMU1', name: 'Timpanogos Divide', lat: 40.3833, lng: -111.6333, type: 'nws', elevation: 8170, isRidge: true },
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
      { id: 'KOGD', name: 'Ogden Airport', lat: 41.1961, lng: -112.0122, type: 'nws', elevation: 4440 },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'nws', elevation: 4226 },
      { id: 'KHIF', name: 'Hill AFB', lat: 41.1239, lng: -111.9731, type: 'nws', elevation: 4789 },
      { id: 'BLM', name: 'Ben Lomond', lat: 41.3667, lng: -111.9500, type: 'nws', elevation: 9712, isRidge: true },
    ],
  },
  'sulfur-creek': {
    name: 'Sulphur Creek',
    center: [-110.955, 41.095],
    zoom: 11,
    launches: ['sulfur-creek'],
    stations: [
      { id: 'KFIR', name: 'First Divide (WYDOT)', lat: 41.2765, lng: -110.8007, type: 'nws', elevation: 7579 },
      { id: 'KEVW', name: 'Evanston Airport', lat: 41.2750, lng: -111.0350, type: 'nws', elevation: 7143 },
      { id: 'UT1', name: 'Wahsatch EB (UDOT)', lat: 41.1952, lng: -111.114, type: 'udot', elevation: 6814 },
    ],
  },
};

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

/**
 * Dynamically build a MAP_AREAS-shaped object for ANY lake in LAKE_CONFIGS.
 * Used as fallback when the lake isn't in the hardcoded MAP_AREAS above.
 *
 * Pulls coordinates from STATION_REGISTRY when available, falls back to the
 * lake's own coordinates for lakeshore stations that lack a registry entry.
 * This is how the map now shows wind meters for every kiting/fishing location
 * in the system — onX-style coverage, not just the 4 hardcoded areas.
 */
function buildMapAreaFromLakeConfig(lakeId) {
  const cfg = LAKE_CONFIGS?.[lakeId];
  if (!cfg) return null;
  const center = cfg.coordinates ? [cfg.coordinates.lng, cfg.coordinates.lat] : null;
  if (!center) return null;

  const stations = [];
  const seen = new Set();

  function add(entry, defaults = {}) {
    if (!entry?.id || seen.has(entry.id)) return;
    const reg = STATION_REGISTRY?.[entry.id];
    const lat = reg?.lat ?? entry.lat ?? cfg.coordinates?.lat;
    const lng = reg?.lng ?? entry.lng ?? cfg.coordinates?.lng;
    if (lat == null || lng == null) return;

    const isUdot = entry.id.startsWith('UT') || entry.id.startsWith('WY');
    const isPws = entry.id.startsWith('KUT') || entry.id.startsWith('KWY');
    const type = defaults.type || (isPws ? 'pws' : isUdot ? 'udot' : 'nws');

    seen.add(entry.id);
    stations.push({
      id: entry.id,
      name: entry.name || reg?.shortName || reg?.name || entry.id,
      lat,
      lng,
      type,
      elevation: entry.elevation || reg?.elevation,
      ...defaults,
    });
  }

  // Pressure stations
  if (cfg.stations?.pressure?.high) add(cfg.stations.pressure.high, { isNorthFlowIndicator: true });
  if (cfg.stations?.pressure?.low)  add(cfg.stations.pressure.low,  { isSouthernIndicator: true });

  // Ridge stations
  if (Array.isArray(cfg.stations?.ridge)) {
    for (const s of cfg.stations.ridge) add(s, { isRidge: true });
  }

  // Lakeshore stations
  if (Array.isArray(cfg.stations?.lakeshore)) {
    for (const s of cfg.stations.lakeshore) add(s);
  }

  // Reference stations
  if (Array.isArray(cfg.stations?.reference)) {
    for (const s of cfg.stations.reference) add(s);
  }

  // Predictor stations (early indicators)
  if (Array.isArray(cfg.stations?.predictor)) {
    for (const s of cfg.stations.predictor) add(s, { isEarlyIndicator: true });
  }

  // Ground truth
  if (cfg.stations?.groundTruth) add(cfg.stations.groundTruth);

  return {
    name: cfg.name || lakeId,
    center,
    zoom: 11,
    launches: [lakeId],
    stations,
  };
}

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
  // Slightly larger when reporting live so users can spot active meters at a glance
  const size = hasData ? (isIndicator ? 20 : 18) : (isIndicator ? 16 : 14);

  // Speed-coded badge color for live meters (matches dense PWS field palette)
  const speed = live?.speed;
  let badgeColor = color;
  if (hasData) {
    if (speed < 3) badgeColor = '#64748b';
    else if (speed < 6) badgeColor = '#38bdf8';
    else if (speed < 10) badgeColor = '#22d3ee';
    else if (speed < 15) badgeColor = '#4ade80';
    else if (speed < 20) badgeColor = '#facc15';
    else badgeColor = '#f87171';
  }

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
        title={hasData ? `${station.name}: ${Math.round(speed)} mph` : station.name}
        style={{
          width: size,
          height: size,
          background: hasData ? badgeColor : color,
          border: `2px solid ${hasData ? badgeColor : color}`,
          borderRadius: isRidge ? '2px' : '50%',
          transform: isRidge ? 'rotate(45deg)' : 'none',
          opacity: hasData ? 1 : 0.45,
          boxShadow: hasData ? '0 0 6px rgba(34,211,238,0.4), 0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </Marker>
  );
}

function LaunchMarker({ launch, isSelected, onClick }) {
  const size = 22;
  return (
    <Marker
      longitude={launch.position[1]}
      latitude={launch.position[0]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick?.(launch);
      }}
    >
      <div
        className="cursor-pointer transition-transform active:scale-110 flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: isSelected
            ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
            : 'linear-gradient(135deg, #0891b2, #164e63)',
          border: `2.5px solid ${isSelected ? '#22d3ee' : '#06b6d4'}`,
          borderRadius: '50%',
          boxShadow: isSelected
            ? '0 0 12px rgba(6,182,212,0.7), 0 2px 4px rgba(0,0,0,0.3)'
            : '0 0 8px rgba(6,182,212,0.4), 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <Wind style={{ width: 12, height: 12, color: '#fff' }} />
      </div>
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

// ─── Dense PWS Wind Field ─────────────────────────────────────────────────

// Map zoom level to discovery radius (km). Wider zoom = bigger radius so the
// whole visible area gets meter coverage. At z>=13 we shrink to keep the API
// payload reasonable since the user is already zoomed into a specific spot.
function radiusForZoom(zoom) {
  if (zoom == null) return 40;
  if (zoom >= 14) return 15;
  if (zoom >= 12) return 25;
  if (zoom >= 11) return 35;
  if (zoom >= 10) return 50;
  if (zoom >=  9) return 75;
  if (zoom >=  8) return 110;
  if (zoom >=  7) return 160;
  return 200; // Capped server-side at 200 km anyway
}

// Haversine in km — for cache-hit decisions
function kmBetween(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Dense PWS wind field that AUTO-POPULATES as the user pans/zooms.
 *
 * Behavior:
 *   • Debounces 700 ms after the user stops moving (so panning doesn't spam).
 *   • Refetches when the new center is > 1/3 of the current radius from the
 *     last successful fetch (cache hit otherwise).
 *   • Scales discovery radius based on zoom level.
 *   • Skips at z < 6 (would discover hundreds of stations — bad UX).
 *   • Merges new observations into the existing field rather than replacing,
 *     so meters don't disappear when you pan slightly.
 */
function usePwsWindField(viewState, enabled) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastFetch = useRef({ lat: null, lng: null, radius: null, ts: 0 });
  const debounceRef = useRef(null);

  const longitude = viewState?.longitude ?? null;
  const latitude  = viewState?.latitude  ?? null;
  const zoom      = viewState?.zoom      ?? null;

  useEffect(() => {
    if (!enabled) return;
    if (longitude == null || latitude == null) return;
    if (zoom != null && zoom < 6) return; // World view — skip

    // Debounce: only fire 700ms after the user stops panning/zooming
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const radius = radiusForZoom(zoom);
      const last = lastFetch.current;

      // Cache: skip if we already fetched a center within 1/3 radius recently
      if (last.lat != null && last.lng != null) {
        const moved = kmBetween(last.lat, last.lng, latitude, longitude);
        const ageMs = Date.now() - last.ts;
        if (moved < last.radius / 3 && ageMs < 90_000 && last.radius >= radius) return;
      }

      lastFetch.current = { lat: latitude, lng: longitude, radius, ts: Date.now() };
      setLoading(true);

      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      // Primary: combined free-source endpoint (NWS + UDOT + WU) — works
      // without WU_API_KEY since NWS and UDOT are free government feeds.
      // Falls back to legacy wu-pws-dense if the new endpoint isn't deployed yet.
      const url = `${apiOrigin}/api/weather?source=stations-dense&lat=${latitude}&lon=${longitude}&radius=${radius}`;

      try {
        let r = await fetch(url);
        if (!r.ok) {
          console.warn(`[Stations Dense] HTTP ${r.status} — falling back to wu-pws-dense`);
          r = await fetch(`${apiOrigin}/api/weather?source=wu-pws-dense&lat=${latitude}&lon=${longitude}&radius=${radius}`);
          if (!r.ok) {
            console.warn(`[Stations Dense] Fallback also failed: HTTP ${r.status}`);
            setLoading(false);
            return;
          }
        }
        const data = await r.json();
        if (!data?.observations?.length) {
          console.info(`[Stations Dense] ${data?.discoveredCount ?? 0} discovered, ${data?.stationCount ?? 0} returned`, data?.bySource || '');
          setLoading(false);
          return;
        }

        const now = Date.now();
        const MAX_AGE = 60 * 60_000;
        const fresh = data.observations.filter(s => {
          if (s.windSpeed == null && s.windDir == null) return false;
          if (s.obsTime) {
            const age = now - new Date(s.obsTime).getTime();
            if (age > MAX_AGE) return false;
          }
          return true;
        });

        // ── Feed dense observations into the shared prediction store.
        //    ThermalPredictor & CrossValidation read from this for ground truth.
        try {
          updateLiveStationField(fresh);
        } catch (e) {
          console.warn('[LiveStationField] update failed:', e.message);
        }

        // Merge with existing field by ID so meters from previous fetches
        // remain visible when the user pans incrementally. Drop stations
        // outside the new view's reasonable bounding box.
        setStations(prev => {
          const map = new Map();
          for (const s of prev) {
            const d = kmBetween(latitude, longitude, s.lat, s.lon);
            if (d <= radius * 1.8) map.set(s.id, s);
          }
          for (const s of fresh) map.set(s.id, s);
          return [...map.values()];
        });
      } catch (err) {
        console.warn('[PWS Dense] fetch failed:', err.message);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [longitude, latitude, zoom, enabled]);

  return { stations, loading };
}

// Beaufort-style speed→color ramp. Same colors competitor sites use.
function colorForSpeed(speed) {
  if (speed == null || speed < 3) return 'rgb(100,116,139)';   // slate (calm)
  if (speed < 6)   return 'rgb(56,189,248)';                    // cyan (light)
  if (speed < 10)  return 'rgb(34,211,238)';                    // cyan (moderate)
  if (speed < 15)  return 'rgb(74,222,128)';                    // green (rideable)
  if (speed < 20)  return 'rgb(250,204,21)';                    // yellow (strong)
  if (speed < 25)  return 'rgb(251,146,60)';                    // orange (high)
  return 'rgb(248,113,113)';                                    // red (extreme)
}

/**
 * Rasterize a wind-arrow into an ImageData blob that MapLibre can register
 * as an SDF icon. SDF mode lets us tint each individual arrow with its own
 * `icon-color` (one shared image, infinite color variations).
 *
 * The arrow points "up" (north / 0°) by default — at runtime we rotate each
 * feature by its wind bearing using the `icon-rotate` paint expression.
 * Geometry: tail dot → shaft → filled triangular head.
 */
function createWindArrowImage(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(255,255,255,1)';   // white opaque so SDF tinting works
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = size * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = size / 2;

  // Tail anchor circle — marks station location
  ctx.beginPath();
  ctx.arc(cx, size * 0.86, size * 0.085, 0, Math.PI * 2);
  ctx.fill();

  // Shaft — line from tail up toward head neck
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.86);
  ctx.lineTo(cx, size * 0.34);
  ctx.stroke();

  // Filled arrowhead triangle
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.10);
  ctx.lineTo(cx - size * 0.20, size * 0.42);
  ctx.lineTo(cx + size * 0.20, size * 0.42);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Register the shared wind-arrow icon on the MapLibre map instance. Idempotent
 * — safe to call multiple times (e.g. after style changes that wipe images).
 */
function ensureWindArrowImage(map) {
  if (!map || map.hasImage?.('wind-arrow')) return;
  try {
    // 128px canvas + pixelRatio 2 → arrows stay crisp even when icon-size > 1.
    const img = createWindArrowImage(128);
    map.addImage('wind-arrow', img, { sdf: true, pixelRatio: 2 });
  } catch (err) {
    console.warn('[WindArrow] failed to register icon:', err.message);
  }
}

/**
 * Build the wind-field GeoJSON.
 *
 * One Point feature per station. Stations with a wind direction carry
 * `kind: 'arrow'` and a `rotation` (clockwise-from-north bearing in the
 * direction the wind is GOING TO). Stations without direction fall back to
 * a small speed-colored dot so they still appear on the map.
 */
function buildPwsGeoJSON(stations) {
  const features = [];
  for (const s of stations) {
    if (s.lat == null || s.lon == null) continue;
    const speed = s.windSpeed ?? 0;
    const dir = s.windDir;
    const gust = s.windGust ?? null;
    const color = colorForSpeed(speed);
    const name = s.stationName || s.name || s.id || 'Unknown';
    const elevation = s.elevation ?? null;
    const source = s.source || s.dataSource || 'pws';
    const obsTime = s.obsTime || null;

    const hasDir = dir != null && speed >= 1;
    const shared = {
      id: s.id,
      name,
      speed,
      gust,
      dir: dir ?? null,
      color,
      elevation,
      source,
      obsTime,
      lat: s.lat,
      lon: s.lon,
    };

    if (hasDir) {
      features.push({
        type: 'Feature',
        properties: {
          ...shared,
          kind: 'arrow',
          rotation: (dir + 180) % 360,
        },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      });
    } else {
      features.push({
        type: 'Feature',
        properties: { ...shared, kind: 'dot' },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function PwsWindFieldLayer({ stations }) {
  const geojson = useMemo(() => buildPwsGeoJSON(stations), [stations]);
  if (!stations.length) return null;

  return (
    <Source id="pws-wind-field" type="geojson" data={geojson}>
      {/* Dead-calm or direction-less stations — small colored dot */}
      <Layer
        id="pws-dot"
        type="circle"
        filter={['==', ['get', 'kind'], 'dot']}
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 10, 3.5, 14, 4.5],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.45)',
        }}
      />
      {/* Wind arrows — SDF icon tinted by speed-color, rotated to bearing */}
      <Layer
        id="pws-arrow"
        type="symbol"
        filter={['==', ['get', 'kind'], 'arrow']}
        layout={{
          'icon-image': 'wind-arrow',
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Scale arrow with both zoom AND wind speed so a 25 mph reading
          // is visually bigger than a 5 mph reading at the same zoom.
          // Sizes ~70% bigger than first pass — readable at a glance without
          // crowding the basemap at typical pan/zoom levels.
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            6,  ['interpolate', ['linear'], ['get', 'speed'], 0, 0.38, 10, 0.50, 25, 0.62],
            10, ['interpolate', ['linear'], ['get', 'speed'], 0, 0.55, 10, 0.75, 25, 0.95],
            14, ['interpolate', ['linear'], ['get', 'speed'], 0, 0.75, 10, 1.00, 25, 1.30],
          ],
        }}
        paint={{
          'icon-color': ['get', 'color'],
          'icon-halo-color': 'rgba(0,0,0,0.65)',
          'icon-halo-width': 1.5,
          'icon-opacity': 0.95,
        }}
      />
    </Source>
  );
}

// ─── Main Wind Arrow ──────────────────────────────────────────────────────

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
        layout={{ 'line-cap': 'round' }}
        paint={{ 'line-color': '#22d3ee', 'line-width': 3.5, 'line-opacity': 0.85 }}
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
  const [showPwsField, setShowPwsField] = useState(true);
  const [showWindStream, setShowWindStream] = useState(false);
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
    // First check the hardcoded MAP_AREAS for hyper-tuned coverage areas
    let area = null;
    if (selectedLake?.startsWith('utah-lake')) {
      area = MAP_AREAS['utah-lake'];
    } else if (selectedLake === 'deer-creek') {
      area = MAP_AREAS['deer-creek'];
    } else if (selectedLake === 'willard-bay') {
      area = MAP_AREAS['willard-bay'];
    } else if (selectedLake === 'sulfur-creek') {
      area = MAP_AREAS['sulfur-creek'];
    }
    // For ANY other lake in the system, dynamically build the map area
    // from LAKE_CONFIGS so meters render for every kiting/fishing location.
    if (!area && selectedLake) {
      area = buildMapAreaFromLakeConfig(selectedLake);
    }
    if (!area) {
      area = MAP_AREAS['utah-lake'];
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

  const { stations: pwsStations, loading: pwsLoading } = usePwsWindField(viewState, showPwsField);

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

    // Check dense PWS arrows/dots first — make every station clickable
    const pwsLayers = ['pws-arrow', 'pws-dot'].filter(id => map.getLayer(id));
    if (pwsLayers.length > 0) {
      const hits = map.queryRenderedFeatures(e.point, { layers: pwsLayers });
      if (hits.length > 0) {
        const props = hits[0].properties || {};
        const coords = hits[0].geometry?.coordinates;
        const station = {
          id: props.id || 'unknown',
          name: props.name || props.id || 'Station',
          lat: props.lat ?? coords?.[1],
          lng: props.lon ?? coords?.[0],
          type: props.source || 'pws',
          elevation: props.elevation,
        };
        const live = {
          speed: props.speed,
          gust: props.gust,
          direction: props.dir,
          obsTime: props.obsTime,
        };
        setSelectedStation({ station, live, physicsHints: [] });
        setSelectedFeature(null);
        impactLight();
        return;
      }
    }

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
    if (station.launchId) {
      onSelectLaunch?.(station.launchId);
    }
    setSelectedStation({ station, live, physicsHints });
    setSelectedFeature(null);
    impactLight();
  }, [onSelectLaunch]);

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
  const hasActiveCard = syntheticData || selectedStation;
  const mapHeight = isFullscreen ? 'h-[100dvh]' : hasActiveCard ? 'h-[28rem] sm:h-[32rem]' : 'h-72 sm:h-96';

  return (
    <div className={`relative bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 pt-[env(safe-area-inset-top)]' : ''
    }`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80 z-10 relative">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-300 truncate">
            LiftForecast
            <span className="text-slate-500 font-normal"> · Live Wind Field</span>
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
      <div className={`relative transition-[height] duration-300 ease-in-out ${mapHeight}`}>
        <MapGL
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

            // Register the shared wind-arrow SDF icon used by the PWS layer.
            // Re-register on styledata in case a style swap clears the image registry.
            ensureWindArrowImage(map);
            map.on('styledata', () => ensureWindArrowImage(map));

            // Pointer cursor on hover over clickable PWS arrows/dots.
            // Layers are added dynamically by PwsWindFieldLayer, so bind
            // once they appear via the 'sourcedata' event.
            const bindCursor = () => {
              for (const layerId of ['pws-arrow', 'pws-dot']) {
                if (!map.getLayer(layerId)) continue;
                if (map._pwsCursorBound?.[layerId]) continue;
                map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = 'crosshair'; });
                map._pwsCursorBound = { ...map._pwsCursorBound, [layerId]: true };
              }
            };
            map.on('sourcedata', bindCursor);
            bindCursor();

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

          {/* Dense PWS wind field */}
          {showPwsField && <PwsWindFieldLayer stations={pwsStations} />}

          {/* Animated windstream particles */}
          <WindStreamLayer
            map={mapRef.current?.getMap()}
            stations={pwsStations}
            enabled={showWindStream}
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

          {/* Launch site forecast markers */}
          {launches.map(launch => (
            <LaunchMarker
              key={launch.id}
              launch={launch}
              isSelected={selectedLake === launch.id}
              onClick={(l) => {
                onSelectLaunch?.(l.id);
                const fakeStation = {
                  id: l.id,
                  name: l.name,
                  lat: l.position[0],
                  lng: l.position[1],
                  type: 'launch',
                  launchId: l.id,
                };
                handleStationClick({ station: fakeStation, live: null });
              }}
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
        </MapGL>

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
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-cyan-300 flex items-center justify-center">
                <Wind className="w-2 h-2 text-white" />
              </div>
              <span>Forecast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-300" />
              <span>NWS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-500 border border-purple-400" style={{ transform: 'rotate(45deg)' }} />
              <span>Ridge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              <span>N Flow</span>
            </div>
            {showPwsField && (
              <div className="flex items-center gap-1.5">
                <Wind className="w-3 h-3 text-emerald-400" />
                <span>PWS ({pwsStations.length})</span>
              </div>
            )}
          </div>
        </div>

        {/* Windstream toggle */}
        <button
          onClick={() => setShowWindStream(v => !v)}
          className={`absolute bottom-2 right-44 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg ${
            showWindStream
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>{showWindStream ? 'Flow On' : 'Flow'}</span>
        </button>

        {/* PWS wind field toggle */}
        <button
          onClick={() => setShowPwsField(v => !v)}
          className={`absolute bottom-2 right-24 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg ${
            showPwsField
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          <Wind className={`w-4 h-4 ${pwsLoading ? 'animate-spin' : ''}`} />
          <span>
            {pwsLoading
              ? 'Scanning...'
              : showPwsField
                ? `${pwsStations.length} meters`
                : 'PWS Off'}
          </span>
        </button>

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
