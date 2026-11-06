/**
 * Screen step for a geographic wind.
 * u is east. v is south. Both stay in miles per hour from the meters.
 * basis is CSS pixels per degree: east (ex, ey) and north (nx, ny).
 * Turning the map changes the basis. It does not change which way the wind blows.
 */

export function flowScreenStep(u, v, basis, cssW, cssH, speedScale) {
  if (!basis) return null;
  const { ex, ey, nx, ny } = basis;
  const eastLen = Math.hypot(ex, ey);
  const northLen = Math.hypot(nx, ny);
  const det = ex * ny - nx * ey;
  if (eastLen < 1e-6 || northLen < 1e-6 || Math.abs(det) < 1e-6) return null;
  const dx = (ex / eastLen) * (u * speedScale * cssW) + (nx / northLen) * (-v * speedScale * cssH);
  const dy = (ey / eastLen) * (u * speedScale * cssW) + (ny / northLen) * (-v * speedScale * cssH);
  const dLng = (dx * ny - nx * dy) / det;
  const dLat = (ex * dy - ey * dx) / det;
  return { dx, dy, dLng, dLat };
}

/** Screen pixel for a longitude and latitude, using the same basis as the wind step. */
export function flowScreenPoint(lng, lat, origin, basis) {
  const dLng = lng - origin.lng;
  const dLat = lat - origin.lat;
  return {
    x: origin.x + dLng * basis.ex + dLat * basis.nx,
    y: origin.y + dLng * basis.ey + dLat * basis.ny,
  };
}
