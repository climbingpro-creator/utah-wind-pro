/**
 * Puts a road highlight on the UDOT centerline.
 * utah-highways.json is the positive mainline of each Interstate, US, and state route.
 * Each point is [longitude, latitude, milepost]. A stretch is drawn only between two
 * live meters that both sit on that same centerline. A missing trace is left off the map.
 */

const MIN_MILES = 0.4;
const MAX_MILES = 40;
const ON_ROAD_MILES = 3;

function milesBetween(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lerpPoint(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function atMile(path, mile) {
  if (!path || path.length < 2) return null;
  const first = path[0][2];
  const last = path[path.length - 1][2];
  if (mile < first - 0.05 || mile > last + 0.05) return null;
  if (mile <= first) return { coord: [path[0][0], path[0][1]], index: 0 };
  if (mile >= last) {
    const end = path[path.length - 1];
    return { coord: [end[0], end[1]], index: path.length - 1 };
  }
  for (let i = 1; i < path.length; i++) {
    if (path[i][2] < mile) continue;
    const span = path[i][2] - path[i - 1][2];
    const t = span === 0 ? 0 : (mile - path[i - 1][2]) / span;
    return { coord: lerpPoint(path[i - 1], path[i], t), index: i };
  }
  return null;
}

/**
 * The centerline between two mileposts. The result follows the bends in `path`.
 * Returns null when the mileposts are not both on this path, or the stretch is a gap.
 */
export function sliceRoutePath(path, mileA, mileB) {
  const lo = Math.min(mileA, mileB);
  const hi = Math.max(mileA, mileB);
  const along = hi - lo;
  if (along < MIN_MILES || along > MAX_MILES) return null;
  const start = atMile(path, lo);
  const end = atMile(path, hi);
  if (!start || !end) return null;
  const coords = [start.coord];
  for (let i = start.index; i < end.index; i++) {
    const vertex = path[i];
    if (vertex[2] > lo && vertex[2] < hi) coords.push([vertex[0], vertex[1]]);
  }
  const last = coords[coords.length - 1];
  if (last[0] !== end.coord[0] || last[1] !== end.coord[1]) coords.push(end.coord);
  return coords.length >= 2 ? coords : null;
}

function projectSegment(lat, lon, a, b) {
  const midLat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const xScale = Math.cos(midLat) * 69;
  const yScale = 69;
  const ax = a[0] * xScale;
  const ay = a[1] * yScale;
  const bx = b[0] * xScale;
  const by = b[1] * yScale;
  const px = lon * xScale;
  const py = lat * yScale;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return {
    mile: a[2] + (b[2] - a[2]) * t,
    lng: a[0] + (b[0] - a[0]) * t,
    lat: a[1] + (b[1] - a[1]) * t,
    dist: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)),
  };
}

function snapToPaths(lat, lon, paths) {
  let best = null;
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const hit = projectSegment(lat, lon, path[i - 1], path[i]);
      if (!best || hit.dist < best.dist) best = { ...hit, path };
    }
  }
  if (!best || best.dist > ON_ROAD_MILES) return null;
  return { path: best.path, mile: best.mile };
}

function locate(lat, lon, milepost, paths) {
  if (milepost != null) {
    for (const path of paths) {
      const hit = atMile(path, milepost);
      if (!hit) continue;
      const away = milesBetween(lat, lon, hit.coord[1], hit.coord[0]);
      if (away <= ON_ROAD_MILES) return { path, mile: milepost };
    }
  }
  return snapToPaths(lat, lon, paths);
}

/**
 * Replaces each straight station-to-station join with the centerline between them.
 * A pair that does not sit on the route is dropped.
 */
export function traceRoadLines(segments, highways) {
  if (!highways) return [];
  const traced = [];
  for (const seg of segments || []) {
    const paths = highways[seg.route];
    if (!paths || !seg) continue;
    const fromMile = milepostFromName(seg.from);
    const toMile = milepostFromName(seg.to);
    const a = locate(seg.lat1, seg.lon1, fromMile, paths);
    const b = locate(seg.lat2, seg.lon2, toMile, paths);
    if (!a || !b || a.path !== b.path) continue;
    const coordinates = sliceRoutePath(a.path, a.mile, b.mile);
    if (!coordinates) continue;
    traced.push({ ...seg, coordinates });
  }
  return traced;
}

function milepostFromName(name) {
  const match = String(name || '').match(/\bMP\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}
