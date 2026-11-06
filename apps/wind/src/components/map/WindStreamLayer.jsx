/**
 * WindStreamLayer — Animated wind particle flow visualization.
 *
 * Renders flowing particles over the MapLibre map that follow the
 * interpolated wind vector field (IDW from all available stations).
 * Similar to Weather Underground's "Windstream" or Windy.com's flow layer.
 *
 * Architecture:
 *   1. Build a wind vector grid via IDW from station observations
 *   2. Spawn particles across the viewport
 *   3. Each frame, advect particles along the vector field
 *   4. Draw fading trails on a Canvas2D overlay
 *   5. Particles that leave the viewport respawn randomly
 *
 * Performance: Runs at ~60fps on modern devices, ~30fps on older phones.
 * Canvas is synchronized with MapLibre's render loop via requestAnimationFrame.
 */

import { useEffect, useRef } from 'react';
import { flowScreenPoint, flowScreenStep } from '../../lib/flowScreen';
import { deflectFlow, terrainStepMeters, terrainWeight } from '../../lib/terrainWind';
import { loadViewElevation } from '../../lib/terrariumSampler';

const PARTICLE_COUNT = 2500;
const PARTICLE_LIFETIME = 80;
const TRAIL_FADE = 0.94;
const SPEED_SCALE = 0.0012;
const GRID_RES = 32;

function shiftMeters(lat, lon, eastM, northM) {
  return {
    lat: lat + northM / 110540,
    lon: lon + eastM / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}

function buildWindGrid(stations, bounds, gridW, gridH, sampleElevation, zoom = 0) {
  const grid = new Float32Array(gridW * gridH * 3); // u, v, speed per cell

  const lngMin = bounds.west;
  const lngMax = bounds.east;
  const latMin = bounds.south;
  const latMax = bounds.north;
  const dLng = (lngMax - lngMin) / gridW;
  const dLat = (latMax - latMin) / gridH;

  const now = Date.now();
  const allValid = stations.filter(s => {
    if (s.windSpeed == null || s.windSpeed < 1 || s.windDir == null) return false;
    if (typeof s.windDir !== 'number' || isNaN(s.windDir)) return false;
    if (s.windDir < 0 || s.windDir > 360) return false;
    if (s.obsTime) {
      const age = now - new Date(s.obsTime).getTime();
      if (age > 2 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  // Prefer real station observations; only fall back to Open-Meteo model
  // data when fewer than 8 real stations are available.
  const realStations = allValid.filter(s =>
    s.source !== 'open-meteo' && !s.id?.startsWith('OM_')
  );
  const validStations = realStations.length >= 8 ? realStations : allValid;

  if (validStations.length === 0) return null;

  const midLat = (latMin + latMax) / 2;
  const viewMeters = Math.abs(lngMax - lngMin) * 111320 * Math.cos((midLat * Math.PI) / 180);
  const step = terrainStepMeters(zoom, viewMeters);

  for (let gy = 0; gy < gridH; gy++) {
    const cellLat = latMin + (gy + 0.5) * dLat;
    for (let gx = 0; gx < gridW; gx++) {
      const cellLng = lngMin + (gx + 0.5) * dLng;
      const idx = (gy * gridW + gx) * 3;

      let wSum = 0;
      let uSum = 0;
      let vSum = 0;
      let spdSum = 0;

      for (const s of validStations) {
        const sLat = s.lat;
        const sLng = s.lon ?? s.lng;
        const dlat = cellLat - sLat;
        const dlng = (cellLng - sLng) * Math.cos(cellLat * Math.PI / 180);
        let d2 = dlat * dlat + dlng * dlng;
        if (d2 < 1e-8) d2 = 1e-8;
        // Real stations get full weight; Open-Meteo model gets 10%
        const isModel = s.source === 'open-meteo' || s.id?.startsWith('OM_');
        const w = (1 / d2) * (isModel ? 0.1 : 1);

        const toDir = (s.windDir + 180) % 360;
        const rad = (toDir * Math.PI) / 180;
        const spd = s.windSpeed;
        uSum += w * spd * Math.sin(rad);
        vSum += w * spd * (-Math.cos(rad));
        spdSum += w * spd;
        wSum += w;
      }

      if (wSum > 0) {
        let u = uSum / wSum;
        let v = vSum / wSum;
        if (typeof sampleElevation === 'function' && terrainWeight(zoom) > 0 && Math.hypot(u, v) >= 1.5) {
          const speed = Math.hypot(u, v);
          const eastUnit = u / speed;
          const northUnit = -v / speed;
          const at = (eastM, northM) => {
            const p = shiftMeters(cellLat, cellLng, eastM, northM);
            return sampleElevation(p.lat, p.lon);
          };
          const flow = deflectFlow(u, -v, {
            here: sampleElevation(cellLat, cellLng),
            east: at(step, 0),
            west: at(-step, 0),
            north: at(0, step),
            south: at(0, -step),
            upwind: at(-eastUnit * step * 3, -northUnit * step * 3),
            downwind: at(eastUnit * step * 1.5, northUnit * step * 1.5),
            stepM: step,
          }, zoom);
          u = flow.u;
          v = -flow.v;
        }
        grid[idx] = u;
        grid[idx + 1] = v;
        grid[idx + 2] = spdSum / wSum;
      }
    }
  }

  return { grid, gridW, gridH, bounds: { lngMin, lngMax, latMin, latMax, dLng, dLat } };
}

function sampleGrid(field, lng, lat) {
  if (!field) return [0, 0, 0];
  const { grid, gridW, gridH, bounds } = field;
  const gx = (lng - bounds.lngMin) / bounds.dLng - 0.5;
  const gy = (lat - bounds.latMin) / bounds.dLat - 0.5;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  if (ix < 0 || ix >= gridW - 1 || iy < 0 || iy >= gridH - 1) return [0, 0, 0];

  const fx = gx - ix;
  const fy = gy - iy;
  const i00 = (iy * gridW + ix) * 3;
  const i10 = i00 + 3;
  const i01 = ((iy + 1) * gridW + ix) * 3;
  const i11 = i01 + 3;

  const u = (1 - fx) * (1 - fy) * grid[i00] + fx * (1 - fy) * grid[i10]
    + (1 - fx) * fy * grid[i01] + fx * fy * grid[i11];
  const v = (1 - fx) * (1 - fy) * grid[i00 + 1] + fx * (1 - fy) * grid[i10 + 1]
    + (1 - fx) * fy * grid[i01 + 1] + fx * fy * grid[i11 + 1];
  const s = (1 - fx) * (1 - fy) * grid[i00 + 2] + fx * (1 - fy) * grid[i10 + 2]
    + (1 - fx) * fy * grid[i01 + 2] + fx * fy * grid[i11 + 2];

  return [u, v, s];
}

function speedToColor(speed) {
  if (speed < 3) return [71, 85, 105, 0.62];
  if (speed < 6) return [3, 105, 161, 0.8];
  if (speed < 10) return [14, 116, 144, 0.86];
  if (speed < 15) return [21, 128, 61, 0.9];
  if (speed < 20) return [180, 83, 9, 0.92];
  if (speed < 25) return [194, 65, 12, 0.94];
  return [185, 28, 28, 0.96];
}

export default function WindStreamLayer({ map, stations, enabled = true, sampleElevation = null }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef(null);
  const fieldRef = useRef(null);

  useEffect(() => {
    if (!map || !enabled || !stations?.length) {
      if (canvasRef.current) {
        canvasRef.current.style.display = 'none';
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    const mapCanvas = map.getCanvas();
    if (!mapCanvas) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1';
      canvas.style.transition = 'opacity 0.3s ease';
      mapCanvas.parentNode.appendChild(canvas);
      canvasRef.current = canvas;
    }
    canvas.style.display = 'block';

    const spawnParticle = (age) => {
      const dpr = window.devicePixelRatio || 1;
      const ll = map.unproject([
        Math.random() * (canvas.width / dpr),
        Math.random() * (canvas.height / dpr),
      ]);
      return { lng: ll.lng, lat: ll.lat, age };
    };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = mapCanvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(spawnParticle(Math.floor(Math.random() * PARTICLE_LIFETIME)));
      }
      particlesRef.current = particles;
    };
    resize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let viewToken = 0;
    let fineSample = null;

    const updateField = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const sample = fineSample || sampleElevation;
      const cols = terrainWeight(zoom) > 0 ? 48 : GRID_RES;
      fieldRef.current = buildWindGrid(stations, {
        west: bounds.getWest(),
        east: bounds.getEast(),
        south: bounds.getSouth(),
        north: bounds.getNorth(),
      }, cols, cols, sample, zoom);
    };
    const refreshTerrain = () => {
      const token = ++viewToken;
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      if (zoom < 8) fineSample = null;
      updateField();
      if (zoom < 8 || typeof sampleElevation !== 'function') return;
      loadViewElevation(
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
        zoom,
      ).then(sample => {
        if (token !== viewToken) return;
        if (typeof sample === 'function') {
          const coarse = sampleElevation;
          fineSample = (lat, lon) => sample(lat, lon) ?? coarse?.(lat, lon) ?? null;
        }
        updateField();
      }).catch(() => {});
    };
    refreshTerrain();

    const animate = () => {
      const field = fieldRef.current;
      if (!field || !particlesRef.current) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      const cssW = w / dpr;
      const cssH = h / dpr;
      const particles = particlesRef.current;
      const center = map.getCenter();
      const originPx = map.project(center);
      const eastPx = map.project([center.lng + 0.02, center.lat]);
      const northPx = map.project([center.lng, center.lat + 0.02]);
      const basis = {
        ex: (eastPx.x - originPx.x) / 0.02,
        ey: (eastPx.y - originPx.y) / 0.02,
        nx: (northPx.x - originPx.x) / 0.02,
        ny: (northPx.y - originPx.y) / 0.02,
      };
      const origin = { lng: center.lng, lat: center.lat, x: originPx.x, y: originPx.y };

      // Fade previous frame
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      for (const p of particles) {
        const [u, v, spd] = sampleGrid(field, p.lng, p.lat);
        if (spd < 0.5) {
          p.age = PARTICLE_LIFETIME;
        }

        const here = flowScreenPoint(p.lng, p.lat, origin, basis);
        const step = flowScreenStep(u, v, basis, cssW, cssH, SPEED_SCALE);
        const x0 = here.x * dpr;
        const y0 = here.y * dpr;
        const x1 = step ? (here.x + step.dx) * dpr : x0;
        const y1 = step ? (here.y + step.dy) * dpr : y0;

        const [r, g, b, a] = speedToColor(spd);
        const cssWidth = Math.max(1.15, Math.min(0.7 + spd / 22, 1.85));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.lineWidth = cssWidth * dpr;
        ctx.stroke();

        if (step) {
          p.lng += step.dLng;
          p.lat += step.dLat;
        }
        p.age++;

        const off = here.x < 0 || here.x > cssW || here.y < 0 || here.y > cssH;
        if (p.age >= PARTICLE_LIFETIME || off) {
          const next = spawnParticle(0);
          p.lng = next.lng;
          p.lat = next.lat;
          p.age = 0;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    // Hide particles during pan/zoom so they don't drift from their
    // geographic positions, then rebuild the field when the map settles.
    const onMoveStart = () => {
      canvas.style.opacity = '0';
    };
    const onMoveEnd = () => {
      refreshTerrain();
      resize();
      canvas.style.opacity = '1';
    };
    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);
    window.addEventListener('resize', resize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.off('movestart', onMoveStart);
      map.off('moveend', onMoveEnd);
      window.removeEventListener('resize', resize);
      if (canvas && canvas.parentNode) {
        const ctx2 = canvas.getContext('2d');
        if (ctx2) ctx2.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    };
  }, [map, stations, enabled, sampleElevation]);

  return null;
}
