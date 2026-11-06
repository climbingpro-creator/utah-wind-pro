/**
 * Reads the Utah Terrarium tiles through our own route.
 * The public tile host does not allow a browser to read the pixels.
 * A missing tile stays null. Nothing is filled in.
 */

import { decodeTerrarium, tilePixel } from './terrainWind';

const Z = 8;
const tileCache = new Map();

function tilesCovering(west, south, east, north, z) {
  const corners = [
    tilePixel(south, west, z),
    tilePixel(south, east, z),
    tilePixel(north, west, z),
    tilePixel(north, east, z),
  ];
  const x0 = Math.min(...corners.map(t => t.x));
  const x1 = Math.max(...corners.map(t => t.x));
  const y0 = Math.min(...corners.map(t => t.y));
  const y1 = Math.max(...corners.map(t => t.y));
  const tiles = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push({ z, x, y });
  }
  return tiles;
}

function sampleCached(lat, lon, z) {
  const { x, y, px, py } = tilePixel(lat, lon, z);
  const data = tileCache.get(`${z}/${x}/${y}`);
  if (!data || data === 'fail') return null;
  const i = (py * 256 + px) * 4;
  return decodeTerrarium(data[i], data[i + 1], data[i + 2]);
}

async function loadTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const pending = (async () => {
    const resp = await fetch(`/api/terrain?z=${z}&x=${x}&y=${y}`);
    if (!resp.ok) {
      tileCache.set(key, 'fail');
      return 'fail';
    }
    const bitmap = await createImageBitmap(await resp.blob());
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, 256, 256).data;
    tileCache.set(key, data);
    return data;
  })().catch(() => {
    tileCache.set(key, 'fail');
    return 'fail';
  });
  tileCache.set(key, pending);
  const data = await pending;
  if (data !== 'fail' && data) tileCache.set(key, data);
  return data;
}

export function viewZoomToTileZ(zoom) {
  if (zoom >= 11) return 12;
  if (zoom >= 9.2) return 11;
  if (zoom >= 8) return 10;
  return 8;
}

/**
 * Finer Terrarium tiles for the view on screen.
 * Returns null when the view is the whole state or the tile set is too wide.
 * A missing pixel stays null. Nothing is filled in.
 */
export async function loadViewElevation(west, south, east, north, zoom) {
  let z = viewZoomToTileZ(zoom);
  if (z === 8) return null;
  let tiles = tilesCovering(west, south, east, north, z);
  while (tiles.length > 30 && z > 10) {
    z -= 1;
    tiles = tilesCovering(west, south, east, north, z);
  }
  if (tiles.length === 0 || tiles.length > 30) return null;
  await Promise.all(tiles.map(t => loadTile(t.z, t.x, t.y)));
  const loaded = tiles.some(t => {
    const data = tileCache.get(`${t.z}/${t.x}/${t.y}`);
    return data && data !== 'fail' && typeof data.then !== 'function';
  });
  if (!loaded) return null;
  return function sample(lat, lon) {
    return sampleCached(lat, lon, z);
  };
}

export async function loadUtahElevation() {
  const images = new Map();
  const jobs = [];
  for (let x = 46; x <= 51; x++) {
    for (let y = 94; y <= 100; y++) {
      jobs.push((async () => {
        const resp = await fetch(`/api/terrain?z=${Z}&x=${x}&y=${y}`);
        if (!resp.ok) return;
        const bitmap = await createImageBitmap(await resp.blob());
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0);
        images.set(`${x}/${y}`, ctx.getImageData(0, 0, 256, 256).data);
      })());
    }
  }
  await Promise.all(jobs);
  if (!images.size) return null;
  return function sample(lat, lon) {
    const { x, y, px, py } = tilePixel(lat, lon, Z);
    const data = images.get(`${x}/${y}`);
    if (!data) return null;
    const i = (py * 256 + px) * 4;
    return decodeTerrarium(data[i], data[i + 1], data[i + 2]);
  };
}
