/**
 * Weather Backfill Service
 *
 * Fetches historical weather conditions for a given timestamp and location
 * to auto-populate catch log entries.
 *
 * Sources:
 *   - NWS observation history (wind, temp, sky)
 *   - USGS instantaneous values (water temp, flow CFS for rivers)
 *   - Moon phase (pure math)
 */

const NWS_USER_AGENT = '(notwindy.com, hello@utahwindfinder.com)';

// ── Moon Phase ──────────────────────────────────────────────────

export function getMoonPhase(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Conway's approximation
  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + month + day;
  if (month < 3) r += 2;
  r -= ((year < 2000) ? 4 : 8.3);
  r = Math.floor(r + 0.5) % 30;
  if (r < 0) r += 30;

  if (r === 0) return 'new-moon';
  if (r < 7) return 'waxing-crescent';
  if (r === 7) return 'first-quarter';
  if (r < 15) return 'waxing-gibbous';
  if (r === 15) return 'full-moon';
  if (r < 22) return 'waning-gibbous';
  if (r === 22) return 'last-quarter';
  return 'waning-crescent';
}

// ── NWS Observations ────────────────────────────────────────────

const STATION_LOOKUP = {
  'utah-lake': 'KPVU',
  'deer-creek': 'KPVU',
  'jordanelle': 'KHCR',
  'strawberry': 'KHCR',
  'provo-lower': 'KPVU',
  'provo-middle': 'KPVU',
  'provo-upper': 'KHCR',
  'bear-lake': 'KLGU',
  'flaming-gorge': 'KVNL',
  'pineview': 'KOGD',
  'lake-powell': 'KPGA',
  'sand-hollow': 'KSGU',
};

function getNwsStation(locationId) {
  for (const [prefix, station] of Object.entries(STATION_LOOKUP)) {
    if (locationId.startsWith(prefix)) return station;
  }
  return 'KSLC';
}

export async function fetchNwsObservation(locationId, timestamp) {
  const station = getNwsStation(locationId);
  const dt = new Date(timestamp);
  const start = new Date(dt.getTime() - 3600000).toISOString();
  const end = new Date(dt.getTime() + 3600000).toISOString();

  try {
    const url = `https://api.weather.gov/stations/${station}/observations?start=${start}&end=${end}&limit=2`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const obs = data?.features?.[0]?.properties;
    if (!obs) return null;

    const windSpeed = obs.windSpeed?.value != null ? Math.round(obs.windSpeed.value * 2.237) : null;
    const windGust = obs.windGust?.value != null ? Math.round(obs.windGust.value * 2.237) : null;
    const windDir = obs.windDirection?.value ?? null;
    const temp = obs.temperature?.value != null ? Math.round(obs.temperature.value * 9 / 5 + 32) : null;
    const pressure = obs.barometricPressure?.value != null ? Math.round(obs.barometricPressure.value / 100 * 10) / 10 : null;

    let sky = null;
    const textDesc = obs.textDescription?.toLowerCase() || '';
    if (textDesc.includes('clear') || textDesc.includes('sunny')) sky = 'clear';
    else if (textDesc.includes('partly')) sky = 'partly';
    else if (textDesc.includes('overcast') || textDesc.includes('cloudy')) sky = 'overcast';

    let cloudCover = null;
    if (sky === 'clear') cloudCover = 10;
    else if (sky === 'partly') cloudCover = 50;
    else if (sky === 'overcast') cloudCover = 90;

    return { windSpeed, windGust, windDir, temp, pressure, cloudCover, sky };
  } catch {
    return null;
  }
}

// ── USGS Water Data ─────────────────────────────────────────────

const USGS_SITES = {
  'provo-lower': '10163000',
  'provo-middle': '10155500',
  'provo-upper': '10155000',
  'green-a': '09234500',
  'green-b': '09261000',
  'green-c': '09315000',
  'weber-upper': '10128500',
  'weber-lower': '10136500',
  'strawberry': '09288180',
  'deer-creek': '10163000',
};

export async function fetchUsgsData(locationId, timestamp) {
  const siteId = USGS_SITES[locationId];
  if (!siteId) return null;

  const dt = new Date(timestamp);
  const start = new Date(dt.getTime() - 7200000).toISOString().split('.')[0] + 'Z';
  const end = new Date(dt.getTime() + 7200000).toISOString().split('.')[0] + 'Z';

  try {
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&startDT=${start}&endDT=${end}&parameterCd=00010,00060`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;

    const data = await resp.json();
    const series = data?.value?.timeSeries || [];

    let waterTemp = null;
    let flowCfs = null;

    for (const ts of series) {
      const code = ts.variable?.variableCode?.[0]?.value;
      const val = parseFloat(ts.values?.[0]?.value?.[0]?.value);
      if (isNaN(val) || val < 0) continue;

      if (code === '00010') waterTemp = Math.round(val * 9 / 5 + 32);
      if (code === '00060') flowCfs = Math.round(val);
    }

    return { waterTemp, flowCfs };
  } catch {
    return null;
  }
}

// ── Pressure Trend ──────────────────────────────────────────────

export function classifyPressureTrend(currentPressure, recentPressures) {
  if (!currentPressure || !recentPressures?.length) return null;
  const avg = recentPressures.reduce((a, b) => a + b, 0) / recentPressures.length;
  const diff = currentPressure - avg;
  if (diff > 0.5) return 'rising';
  if (diff < -0.5) return 'falling';
  return 'stable';
}

// ── Main Backfill ───────────────────────────────────────────────

export async function backfillWeather(locationId, timestamp) {
  const [nws, usgs] = await Promise.all([
    fetchNwsObservation(locationId, timestamp),
    fetchUsgsData(locationId, timestamp),
  ]);

  const moonPhase = getMoonPhase(timestamp);

  return {
    wind_speed: nws?.windSpeed ?? null,
    wind_direction: nws?.windDir ?? null,
    wind_gust: nws?.windGust ?? null,
    air_temp: nws?.temp ?? null,
    water_temp: usgs?.waterTemp ?? null,
    barometric_pressure: nws?.pressure ?? null,
    pressure_trend: null,
    cloud_cover: nws?.cloudCover ?? null,
    flow_cfs: usgs?.flowCfs ?? null,
    moon_phase: moonPhase,
    hatch_prediction: null,
  };
}
