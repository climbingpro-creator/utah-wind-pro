import { useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { normalizeStation, roadHazardSentence, roadLines, surfaceKind, windCarries } from '../../lib/roadState';
import { traceRoadLines } from '../../lib/roadTrace';
import { classifyTerrain, pathCrosses } from '../../lib/terrainWind';
import { loadUtahElevation } from '../../lib/terrariumSampler';
import WindStreamLayer from './WindStreamLayer';

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const VIEW = {
  longitude: -111.6,
  latitude: 39.4,
  zoom: 6.6,
  pitch: 20,
  bearing: 0,
};

const UTAH_BOUNDS = [[-114.1, 36.95], [-109.04, 42.05]];

const SURFACE_COLOR = {
  dry: '#34d399',
  damp: '#fbbf24',
  wet: '#38bdf8',
  snow: '#f8fafc',
  ice: '#a5b4fc',
  unknown: '#64748b',
};

const KIND_RANK = { unknown: 0, dry: 1, damp: 2, wet: 3, snow: 4, ice: 5 };

function colorForSpeed(speed) {
  if (speed == null || speed < 3) return 'rgb(100,116,139)';
  if (speed < 6) return 'rgb(56,189,248)';
  if (speed < 10) return 'rgb(34,211,238)';
  if (speed < 15) return 'rgb(74,222,128)';
  if (speed < 20) return 'rgb(250,204,21)';
  if (speed < 25) return 'rgb(251,146,60)';
  return 'rgb(248,113,113)';
}

function createWindArrowImage(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = size * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = size / 2;
  ctx.beginPath();
  ctx.arc(cx, size * 0.86, size * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.86);
  ctx.lineTo(cx, size * 0.34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.10);
  ctx.lineTo(cx - size * 0.20, size * 0.42);
  ctx.lineTo(cx + size * 0.20, size * 0.42);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

function ensureWindArrowImage(map) {
  if (!map || map.hasImage?.('wind-arrow')) return;
  try {
    map.addImage('wind-arrow', createWindArrowImage(128), { sdf: true, pixelRatio: 2 });
  } catch {
    /* style reload can race the first add */
  }
}

function addTerrain(map) {
  if (!map || map.getSource('terrain-dem')) return;
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  map.addSource('terrain-dem', {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: ios ? 12 : 14,
  });
  map.setTerrain({ source: 'terrain-dem', exaggeration: ios ? 0.8 : 1.3 });
  if (!map.getLayer('hillshade')) {
    const before = map.getStyle()?.layers?.find(layer => layer.type === 'symbol')?.id;
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
    }, before);
  }
}

export default function RoadConditionMap({
  stations: stationsProp,
  carries: carriesProp,
  selected: selectedProp,
  onSelect: onSelectProp,
  sampleElevation: sampleProp = null,
  frame = null,
}) {
  const mapRef = useRef(null);
  const [mapObj, setMapObj] = useState(null);
  const [ownStations, setOwnStations] = useState([]);
  const [ownSample, setOwnSample] = useState(null);
  const [innerSelected, setInnerSelected] = useState(null);
  const [roadPick, setRoadPick] = useState(null);
  const [highways, setHighways] = useState(null);
  const stations = stationsProp ?? ownStations;
  const sampleElevation = sampleProp ?? ownSample;
  const selected = selectedProp !== undefined ? selectedProp : innerSelected;
  const onSelect = onSelectProp || setInnerSelected;

  useEffect(() => {
    let cancel = false;
    fetch('/utah-highways.json')
      .then(resp => (resp.ok ? resp.json() : null))
      .then(body => {
        if (!cancel && body && typeof body === 'object') setHighways(body);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (stationsProp) return undefined;
    let cancel = false;
    fetch('/api/weather?source=udot-roads')
      .then(resp => resp.json())
      .then(body => {
        if (cancel || !Array.isArray(body.stations)) return;
        setOwnStations(body.stations.map(row => normalizeStation(row)).filter(Boolean));
      })
      .catch(() => {});
    loadUtahElevation()
      .then(sample => {
        if (!cancel && sample) setOwnSample(() => sample);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [stationsProp]);

  const carries = useMemo(() => {
    if (carriesProp) return carriesProp;
    return windCarries(stations).map(carry => ({
      ...carry,
      ...(sampleElevation
        ? classifyTerrain(
          { lat: carry.fromLat, lon: carry.fromLon },
          { lat: carry.toLat, lon: carry.toLon },
          sampleElevation,
        )
        : { terrain: 'unavailable' }),
    }));
  }, [carriesProp, stations, sampleElevation]);

  const live = useMemo(() => (stations || []).filter(s => !s.stale), [stations]);
  const dots = useMemo(() => ({
    type: 'FeatureCollection',
    features: live.map(s => ({
      type: 'Feature',
      properties: {
        id: s.id,
        color: SURFACE_COLOR[surfaceKind(s.surface)] || SURFACE_COLOR.unknown,
      },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    })),
  }), [live]);
  const arrows = useMemo(() => ({
    type: 'FeatureCollection',
    features: live
      .filter(s => s.dir != null && s.speed != null && s.speed >= 2)
      .map(s => ({
        type: 'Feature',
        properties: {
          id: s.id,
          rotation: (s.dir + 180) % 360,
          speed: s.speed,
          color: colorForSpeed(s.speed),
        },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
  }), [live]);
  const segments = useMemo(() => traceRoadLines(roadLines(live), highways), [live, highways]);
  const roads = useMemo(() => ({
    type: 'FeatureCollection',
    features: segments
      .slice()
      .sort((a, b) => (KIND_RANK[a.kind] || 0) - (KIND_RANK[b.kind] || 0))
      .map(seg => ({
        type: 'Feature',
        properties: {
          id: seg.id,
          color: SURFACE_COLOR[seg.kind] || SURFACE_COLOR.unknown,
        },
        geometry: { type: 'LineString', coordinates: seg.coordinates },
      })),
  }), [segments]);
  const paths = useMemo(() => ({
    type: 'FeatureCollection',
    features: (carries || []).filter(pathCrosses).map(c => ({
      type: 'Feature',
      properties: { from: c.from, to: c.to },
      geometry: { type: 'LineString', coordinates: [[c.fromLon, c.fromLat], [c.toLon, c.toLat]] },
    })),
  }), [carries]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={frame ? {
        longitude: frame.longitude,
        latitude: frame.latitude,
        zoom: frame.zoom ?? 10,
        pitch: frame.pitch ?? 48,
        bearing: frame.bearing ?? 0,
      } : VIEW}
      mapLib={maplibregl}
      mapStyle={BASEMAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      minZoom={5}
      maxZoom={15}
      interactiveLayerIds={['road-line', 'road-dots', 'road-arrows']}
      onMouseMove={(event) => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        const hit = map.queryRenderedFeatures(event.point, { layers: ['road-line', 'road-dots', 'road-arrows'] });
        map.getCanvas().style.cursor = hit?.length ? 'pointer' : '';
      }}
      onClick={(event) => {
        const map = mapRef.current?.getMap?.();
        const pad = 8;
        const bbox = event.point
          ? [[event.point.x - pad, event.point.y - pad], [event.point.x + pad, event.point.y + pad]]
          : event.point;
        const hits = map
          ? map.queryRenderedFeatures(bbox, { layers: ['road-line', 'road-dots', 'road-arrows'] })
          : (event.features || []);
        const lineHit = hits?.find(hit => hit.layer?.id === 'road-line');
        if (lineHit) {
          setRoadPick(segments.find(seg => seg.id === String(lineHit.properties.id)) || null);
          onSelect(null);
          return;
        }
        setRoadPick(null);
        const hit = hits?.[0];
        if (!hit) {
          onSelect(null);
          return;
        }
        const found = live.find(s => s.id === String(hit.properties.id));
        onSelect(found || null);
      }}
      onLoad={() => {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        setMapObj(map);
        ensureWindArrowImage(map);
        addTerrain(map);
        map.on('styledata', () => ensureWindArrowImage(map));
        const place = () => {
          if (frame) {
            map.jumpTo({
              center: [frame.longitude, frame.latitude],
              zoom: frame.zoom ?? 10,
              pitch: frame.pitch ?? 48,
              bearing: frame.bearing ?? 0,
            });
          } else {
            map.fitBounds(UTAH_BOUNDS, { padding: 28, pitch: 38, duration: 0 });
          }
        };
        place();
        map.once('idle', place);
      }}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <WindStreamLayer
        map={mapObj}
        enabled={!!mapObj}
        sampleElevation={sampleElevation}
        stations={live.map(s => ({
          id: s.id,
          lat: s.lat,
          lon: s.lon,
          windSpeed: s.speed,
          windDir: s.dir,
          obsTime: s.obsTime,
          source: 'udot',
        }))}
      />
      <Source id="road-conditions" type="geojson" data={roads}>
        <Layer
          id="road-case"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': '#0f172a',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 7, 8, 11, 12, 16],
            'line-opacity': 0.45,
          }}
        />
        <Layer
          id="road-line"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 8, 6.5, 12, 11],
            'line-opacity': 0.95,
          }}
        />
      </Source>
      <Source id="road-paths" type="geojson" data={paths}>
        <Layer
          id="road-path-line"
          type="line"
          paint={{
            'line-color': '#22d3ee',
            'line-width': 2.5,
            'line-opacity': 0.85,
          }}
        />
      </Source>
      <Source id="road-dots" type="geojson" data={dots}>
        <Layer
          id="road-dots"
          type="circle"
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.5, 8, 6, 12, 8],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(15,23,42,0.7)',
          }}
        />
      </Source>
      <Source id="road-arrows" type="geojson" data={arrows}>
        <Layer
          id="road-arrows"
          type="symbol"
          layout={{
            'icon-image': 'wind-arrow',
            'icon-rotate': ['get', 'rotation'],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': ['step', ['zoom'], false, 8, true],
            'icon-ignore-placement': ['step', ['zoom'], false, 8, true],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.28, 8, 0.42, 12, 0.7],
            'symbol-sort-key': ['*', -1, ['get', 'speed']],
          }}
          paint={{
            'icon-color': ['get', 'color'],
            'icon-halo-color': 'rgba(0,0,0,0.65)',
            'icon-halo-width': 1.2,
          }}
        />
      </Source>
      {roadPick && (
        <Popup
          longitude={roadPick.coordinates[Math.floor(roadPick.coordinates.length / 2)][0]}
          latitude={roadPick.coordinates[Math.floor(roadPick.coordinates.length / 2)][1]}
          anchor="top"
          closeButton={false}
          onClose={() => setRoadPick(null)}
          className="road-popup"
        >
          <div className="max-w-[240px] text-xs leading-snug text-slate-900">
            <p className="font-semibold">{roadPick.route}</p>
            <p>{roadHazardSentence(roadPick)}</p>
            <p className="mt-1">{roadPick.from} to {roadPick.to}</p>
          </div>
        </Popup>
      )}
      {selected && (
        <Popup
          longitude={selected.lon}
          latitude={selected.lat}
          anchor="top"
          closeButton={false}
          onClose={() => onSelect(null)}
          className="road-popup"
        >
          <div className="max-w-[220px] text-xs leading-snug text-slate-900">
            <p className="font-semibold">{selected.name}</p>
            <p>{selected.surface || 'Surface Data Unavailable'}</p>
            <p>Pavement {selected.pavementF == null ? 'Data Unavailable' : `${Math.round(selected.pavementF)}°F`}</p>
            <p>
              {selected.speed == null
                ? 'Wind Data Unavailable'
                : `${Math.round(selected.speed)} mph${selected.gust == null ? '' : `, gust ${Math.round(selected.gust)}`}${selected.dir == null ? '' : ` from ${Math.round(selected.dir)}°`}`}
            </p>
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
