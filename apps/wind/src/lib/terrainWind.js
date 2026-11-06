/**
 * Terrain steering for the road fluid path.
 * Elevation comes from the same Terrarium tiles the map draws.
 * A missing sample stays Data Unavailable. The slope does not invent speed.
 * Steep ground only turns aside the part of the wind that is climbing.
 */

const M_TO_FT = 3.28084;
const RIDGE_BLOCK_M = 450;
const CLIMB_M = 120;
const WALL_M = 200;

export function decodeTerrarium(r, g, b) {
  if (![r, g, b].every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return null;
  const meters = r * 256 + g + b / 256 - 32768;
  if (!Number.isFinite(meters) || meters < -500 || meters > 9000) return null;
  return meters;
}

export function tilePixel(lat, lon, z = 8) {
  const n = 2 ** z;
  const xFloat = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const x = Math.floor(xFloat);
  const y = Math.floor(yFloat);
  return {
    z,
    x,
    y,
    px: Math.min(255, Math.max(0, Math.floor((xFloat - x) * 256))),
    py: Math.min(255, Math.max(0, Math.floor((yFloat - y) * 256))),
  };
}

function offsetPoint(lat, lon, bearingDeg, miles) {
  const R = 3958.8;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(miles / R)
    + Math.cos(lat1) * Math.sin(miles / R) * Math.cos(br),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(miles / R) * Math.cos(lat1),
    Math.cos(miles / R) - Math.sin(lat1) * Math.sin(lat2),
  );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

function bearing(from, to) {
  const p1 = (from.lat * Math.PI) / 180;
  const p2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lon - from.lon) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * sample(lat, lon) returns meters, or null when that ground is missing.
 * A ridge more than 450 m above both ends blocks the straight path.
 */
export function classifyTerrain(from, to, sample) {
  const steps = 16;
  const elevs = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = from.lat + (to.lat - from.lat) * t;
    const lon = from.lon + (to.lon - from.lon) * t;
    const meters = sample(lat, lon);
    if (meters == null) {
      return {
        terrain: 'unavailable',
        ridgeFt: null,
        climbFt: null,
        dropFt: null,
      };
    }
    elevs.push(meters);
  }
  const start = elevs[0];
  const end = elevs[elevs.length - 1];
  const peak = Math.max(...elevs);
  const ridgeFt = Math.round((peak - Math.max(start, end)) * M_TO_FT);
  if (peak - Math.max(start, end) > RIDGE_BLOCK_M) {
    return { terrain: 'blocked', ridgeFt, climbFt: null, dropFt: null };
  }
  const climb = end - start;
  if (climb > CLIMB_M) {
    return { terrain: 'lift', ridgeFt, climbFt: Math.round(climb * M_TO_FT), dropFt: null };
  }
  if (-climb > CLIMB_M) {
    return { terrain: 'drain', ridgeFt, climbFt: null, dropFt: Math.round(-climb * M_TO_FT) };
  }
  const midLat = (from.lat + to.lat) / 2;
  const midLon = (from.lon + to.lon) / 2;
  const head = bearing(from, to);
  const left = offsetPoint(midLat, midLon, (head + 270) % 360, 0.8);
  const right = offsetPoint(midLat, midLon, (head + 90) % 360, 0.8);
  const mid = elevs[Math.floor(steps / 2)];
  const leftM = sample(left.lat, left.lon);
  const rightM = sample(right.lat, right.lon);
  if (leftM != null && rightM != null && leftM - mid > WALL_M && rightM - mid > WALL_M) {
    return { terrain: 'canyon', ridgeFt, climbFt: null, dropFt: null };
  }
  return { terrain: 'open', ridgeFt, climbFt: null, dropFt: null };
}

/**
 * Remove the uphill part of a wind vector on a grade steeper than 2%.
 * Downhill flow is left alone. A missing elevation leaves the vector alone.
 * The result is never faster than the meter-derived vector.
 */
export function steerByTerrain(u, v, elevHere, elevEast, elevNorth, metersEast, metersNorth) {
  if ([elevHere, elevEast, elevNorth, metersEast, metersNorth].some(n => n == null || !Number.isFinite(n))) {
    return { u, v, steered: false };
  }
  if (metersEast <= 0 || metersNorth <= 0) return { u, v, steered: false };
  const dzdx = (elevEast - elevHere) / metersEast;
  const dzdy = (elevNorth - elevHere) / metersNorth;
  const grad = Math.hypot(dzdx, dzdy);
  if (grad < 0.02) return { u, v, steered: false };
  const ux = dzdx / grad;
  const uy = dzdy / grad;
  const along = u * ux + v * uy;
  if (along <= 0) return { u, v, steered: false };
  const cut = Math.min(0.7, ((grad - 0.02) / 0.08) * 0.7);
  const nextU = u - along * cut * ux;
  const nextV = v - along * cut * uy;
  return { u: nextU, v: nextV, steered: true };
}

/**
 * How hard the close-in view lets the ground turn the flow.
 * The statewide picture stays the meter field. Zoomed in, a hill can bend it.
 */
export function terrainWeight(zoom) {
  if (zoom == null || !Number.isFinite(zoom) || zoom <= 7.2) return 0;
  if (zoom >= 10) return 1;
  return (zoom - 7.2) / 2.8;
}

export function terrainStepMeters(zoom, viewMeters) {
  if (terrainWeight(zoom) <= 0) return 1600;
  const span = Number.isFinite(viewMeters) && viewMeters > 0 ? viewMeters / 22 : 900;
  return Math.min(4500, Math.max(280, span));
}

/**
 * Bend a meter wind around a hill, and curl it back in the lee.
 * u is east. v is north. A missing sample leaves the vector alone.
 * The result is never faster than the meter wind. The hill does not add speed.
 *
 * probe: { here, east, west, north, south, upwind, downwind, stepM } in meters.
 */
export function deflectFlow(u, v, probe, zoom) {
  const speed = Math.hypot(u, v);
  const weight = terrainWeight(zoom);
  if (speed < 1.5 || weight <= 0 || !probe) return { u, v, steered: false };
  const { here, east, west, north, south, upwind, downwind, stepM } = probe;
  if ([here, east, west, north, south, stepM].some(n => n == null || !Number.isFinite(n))) {
    return { u, v, steered: false };
  }
  if (stepM <= 0) return { u, v, steered: false };

  const dzdx = (east - west) / (2 * stepM);
  const dzdy = (north - south) / (2 * stepM);
  const grad = Math.hypot(dzdx, dzdy);
  let ou = u;
  let ov = v;

  if (grad >= 0.015) {
    const ux = dzdx / grad;
    const uy = dzdy / grad;
    const along = u * ux + v * uy;
    const c1x = -uy;
    const c1y = ux;
    const c2x = uy;
    const c2y = -ux;
    const cross1 = u * c1x + v * c1y;
    const cross2 = u * c2x + v * c2y;
    const headOn = Math.abs(cross1) < 0.12 * speed && Math.abs(cross2) < 0.12 * speed;
    const face = weight * Math.min(1, (grad - 0.015) / 0.045);
    if (along > 0) {
      if (headOn) {
        ou -= along * face * ux;
        ov -= along * face * uy;
      } else {
        const cx = (cross1 >= cross2 ? c1x : c2x) * speed;
        const cy = (cross1 >= cross2 ? c1y : c2y) * speed;
        ou = u * (1 - face) + cx * face;
        ov = v * (1 - face) + cy * face;
      }
    }

    if (upwind != null && downwind != null && Number.isFinite(upwind) && Number.isFinite(downwind)) {
      const rise = upwind - here;
      const drop = here - downwind;
      if (rise > 80 && drop > 15) {
        const rotor = weight * Math.min(1.45, (rise - 80) / 160);
        ou = u * (1 - rotor);
        ov = v * (1 - rotor);
        if (!headOn) {
          const slide = Math.min(1, rotor) * 0.9;
          ou += (cross1 >= cross2 ? c1x : c2x) * speed * slide;
          ov += (cross1 >= cross2 ? c1y : c2y) * speed * slide;
        }
      }
    }
  } else if (upwind != null && downwind != null && Number.isFinite(upwind) && Number.isFinite(downwind)) {
    const rise = upwind - here;
    const drop = here - downwind;
    if (rise > 80 && drop > 15) {
      const rotor = weight * Math.min(1.45, (rise - 80) / 160);
      ou = u * (1 - rotor);
      ov = v * (1 - rotor);
    }
  }

  const next = Math.hypot(ou, ov);
  if (next > speed) {
    const scale = speed / next;
    ou *= scale;
    ov *= scale;
  }
  const steered = Math.hypot(ou - u, ov - v) > 0.05;
  return { u: ou, v: ov, steered };
}

export function terrainSentence(carry) {
  if (!carry) {
    return 'No meter is blowing toward the next road meter. The fluid path is Data Unavailable. The engine does not make the snow.';
  }
  const aim = `A ${carry.speed} mph wind at ${carry.from} is aimed at ${carry.to}`;
  if (!carry.terrain || carry.terrain === 'unavailable') {
    return `${aim}. The topography between them is Data Unavailable, so the fluid path is Data Unavailable.`;
  }
  if (carry.terrain === 'blocked') {
    return `${aim}, and the ground between them rises ${carry.ridgeFt} feet above both meters. That wind does not cross. The engine does not make the snow.`;
  }
  const land = carry.terrain === 'lift'
    ? `The ground rises ${carry.climbFt} feet onto ${carry.to}.`
    : carry.terrain === 'drain'
      ? `The ground drops ${carry.dropFt} feet toward ${carry.to}.`
      : carry.terrain === 'canyon'
        ? 'The ground on both sides of this road is higher, so the wind stays in the draw.'
        : 'The ground between them is open.';
  return `${aim}, ${carry.miles} miles down the road. ${land} If it holds, that air is about ${carry.minutes} minutes out. The engine does not make the snow.`;
}

export function pathCrosses(carry) {
  return carry?.terrain === 'open'
    || carry?.terrain === 'lift'
    || carry?.terrain === 'drain'
    || carry?.terrain === 'canyon';
}
