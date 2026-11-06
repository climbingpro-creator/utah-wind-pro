/**
 * Same-origin Terrarium tiles so the road page can read elevation.
 * The map already draws these tiles. This route only covers the Utah z=8 set.
 */

const TILE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

function allowed(z, x, y) {
  if (![8, 10, 11, 12].includes(z)) return false;
  const scale = 2 ** (z - 8);
  const x0 = Math.floor(45 * scale);
  const x1 = Math.ceil(53 * scale) - 1;
  const y0 = Math.floor(93 * scale);
  const y1 = Math.ceil(102 * scale) - 1;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const z = Number(req.query.z);
  const x = Number(req.query.x);
  const y = Number(req.query.y);
  if (!allowed(z, x, y)) return res.status(400).json({ error: 'Tile is outside the Utah terrain set' });
  try {
    const resp = await fetch(`${TILE}/${z}/${x}/${y}.png`);
    if (!resp.ok) return res.status(502).end();
    const buf = Buffer.from(await resp.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).end(buf);
  } catch {
    return res.status(502).end();
  }
}
