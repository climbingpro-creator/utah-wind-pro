/**
 * Live UDOT road-weather catalog.
 * The key stays on the server. The payload keeps the road fields the
 * dense wind feed drops: pavement, subsurface, surface word, precip flag.
 * This feed is the current reading. It is not an archive.
 */

const UDOT_URL = 'https://www.udottraffic.utah.gov/api/v2/get/weatherstations';

export async function fetchUdotRoadStations(apiKey) {
  if (!apiKey) {
    const err = new Error('UDOT_API_KEY not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  const url = `${UDOT_URL}?key=${encodeURIComponent(apiKey)}&format=json`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) {
    const err = new Error('UDOT feed failed');
    err.code = 'UPSTREAM';
    throw err;
  }
  const all = await resp.json();
  if (!Array.isArray(all)) {
    const err = new Error('UDOT feed was not a station list');
    err.code = 'SHAPE';
    throw err;
  }
  return all.map((s) => ({
    Id: s.Id,
    StationName: s.StationName,
    Latitude: s.Latitude,
    Longitude: s.Longitude,
    AirTemperature: s.AirTemperature,
    SurfaceTemp: s.SurfaceTemp,
    SubSurfaceTemp: s.SubSurfaceTemp,
    SurfaceStatus: s.SurfaceStatus,
    Precipitation: s.Precipitation,
    WindSpeedAvg: s.WindSpeedAvg,
    WindSpeedGust: s.WindSpeedGust,
    WindDirection: s.WindDirection,
    LastUpdated: s.LastUpdated,
  }));
}
