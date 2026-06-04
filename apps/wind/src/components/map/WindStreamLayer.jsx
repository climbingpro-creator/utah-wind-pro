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

import { useEffect, useRef, useCallback } from 'react';

const PARTICLE_COUNT = 2500;
const PARTICLE_LIFETIME = 80;
const TRAIL_FADE = 0.94;
const SPEED_SCALE = 0.0012;
const GRID_RES = 32;

function buildWindGrid(stations, bounds, gridW, gridH) {
  const grid = new Float32Array(gridW * gridH * 3); // u, v, speed per cell

  const lngMin = bounds.west;
  const lngMax = bounds.east;
  const latMin = bounds.south;
  const latMax = bounds.north;
  const dLng = (lngMax - lngMin) / gridW;
  const dLat = (latMax - latMin) / gridH;

  const validStations = stations.filter(
    s => s.windSpeed != null && s.windSpeed > 0 && s.windDir != null
  );

  if (validStations.length === 0) return null;

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
        const w = 1 / d2;

        // windDir is met "from" — add 180° to get the direction wind is GOING
        const toDir = (s.windDir + 180) % 360;
        const rad = (toDir * Math.PI) / 180;
        const spd = s.windSpeed;
        uSum += w * spd * Math.sin(rad);
        vSum += w * spd * (-Math.cos(rad));
        spdSum += w * spd;
        wSum += w;
      }

      if (wSum > 0) {
        grid[idx] = uSum / wSum;
        grid[idx + 1] = vSum / wSum;
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
  if (speed < 3) return [100, 116, 139, 0.25];
  if (speed < 6) return [56, 189, 248, 0.4];
  if (speed < 10) return [34, 211, 238, 0.55];
  if (speed < 15) return [74, 222, 128, 0.65];
  if (speed < 20) return [250, 204, 21, 0.7];
  if (speed < 25) return [251, 146, 60, 0.8];
  return [248, 113, 113, 0.85];
}

export default function WindStreamLayer({ map, stations, enabled = true }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef(null);
  const fieldRef = useRef(null);

  const initParticles = useCallback((w, h) => {
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        age: Math.floor(Math.random() * PARTICLE_LIFETIME),
      });
    }
    return particles;
  }, []);

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

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = mapCanvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };
    resize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateField = () => {
      const bounds = map.getBounds();
      fieldRef.current = buildWindGrid(stations, {
        west: bounds.getWest(),
        east: bounds.getEast(),
        south: bounds.getSouth(),
        north: bounds.getNorth(),
      }, GRID_RES, GRID_RES);
    };
    updateField();

    const animate = () => {
      const field = fieldRef.current;
      if (!field || !particlesRef.current) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const particles = particlesRef.current;
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const south = bounds.getSouth();
      const north = bounds.getNorth();

      // Fade previous frame
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      for (const p of particles) {
        const lng = west + (p.x / w) * (east - west);
        const lat = north - (p.y / h) * (north - south);

        const [u, v, spd] = sampleGrid(field, lng, lat);
        if (spd < 0.5) {
          p.age = PARTICLE_LIFETIME;
        }

        const [r, g, b, a] = speedToColor(spd);
        const lineWidth = Math.max(0.5, Math.min(spd / 8, 2.5));

        const dx = u * SPEED_SCALE * w;
        const dy = v * SPEED_SCALE * h;

        const nx = p.x + dx;
        const ny = p.y + dy;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        p.x = nx;
        p.y = ny;
        p.age++;

        if (p.age >= PARTICLE_LIFETIME || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
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
      updateField();
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
  }, [map, stations, enabled, initParticles]);

  return null;
}
