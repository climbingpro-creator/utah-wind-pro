/**
 * Pass forecast grids and airport visibility for the Utah roads page.
 * Grids are labeled forecast grids. Airport visibility is a meter.
 * A failed request stays Data Unavailable. Nothing here is filled in.
 */

import { PASS_WATCH, VISIBILITY_METERS, summarizePassGrid } from './roadState';

export async function fetchPassGrids(extra = []) {
  const places = [...PASS_WATCH];
  for (const point of extra) {
    if (!point?.lat || !point?.lng) continue;
    const near = places.some(p => Math.abs(p.lat - point.lat) < 0.15 && Math.abs(p.lng - point.lng) < 0.15);
    if (!near) places.push(point);
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${places.map(p => p.lat).join(',')}&longitude=${places.map(p => p.lng).join(',')}&hourly=temperature_2m,precipitation,snowfall,visibility,wind_gusts_10m&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph&timezone=America%2FDenver&forecast_days=2`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const body = await resp.json();
  const grids = Array.isArray(body) ? body : [body];
  return places.map((place, i) => (grids[i] ? summarizePassGrid(place, grids[i]) : null)).filter(Boolean);
}

export async function fetchAirportVisibility(now = Date.now()) {
  const rows = await Promise.all(VISIBILITY_METERS.map(async (meter) => {
    try {
      const resp = await fetch(`https://api.weather.gov/stations/${meter.id}/observations/latest`, {
        headers: {
          Accept: 'application/geo+json',
          'User-Agent': 'LiftForecast roads (https://liftforecast.com)',
        },
      });
      if (!resp.ok) return { ...meter, miles: null, stale: true };
      const body = await resp.json();
      const meters = body?.properties?.visibility?.value;
      const stamp = Date.parse(body?.properties?.timestamp || '');
      const ageMin = Number.isFinite(stamp) ? (now - stamp) / 60000 : null;
      const stale = ageMin == null || ageMin > 90 || ageMin < -5;
      const miles = typeof meters === 'number' && Number.isFinite(meters)
        ? meters * 0.000621371
        : null;
      return { ...meter, miles, stale };
    } catch {
      return { ...meter, miles: null, stale: true };
    }
  }));
  return rows;
}
