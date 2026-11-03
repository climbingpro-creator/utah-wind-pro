/**
 * Tremonton microclimate from two forecast grids and the live meters.
 * Valley floor is the farm. The second grid is the Wellsville west face,
 * still on the Bear River side of the crest. Cache Valley is not included.
 * Missing numbers stay Data Unavailable. ET is weather demand, not a pivot schedule.
 * There is no soil-moisture probe on these meters.
 */

export const VALLEY_GRID = { name: 'Tremonton valley floor', lat: 41.7119, lng: -112.1658 };
export const RIDGE_GRID = { name: 'Wellsville west face', lat: 41.62, lng: -112.02 };

const M_TO_FT = 3.28084;
const HOURS = 24;

function finite(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function sumFirst(values, count) {
  if (!Array.isArray(values)) return null;
  let total = 0;
  let any = false;
  for (let i = 0; i < count && i < values.length; i++) {
    const n = finite(values[i]);
    if (n == null) continue;
    total += n;
    any = true;
  }
  return any ? total : null;
}

function minFirst(values, count) {
  if (!Array.isArray(values)) return null;
  let min = null;
  for (let i = 0; i < count && i < values.length; i++) {
    const n = finite(values[i]);
    if (n == null) continue;
    if (min == null || n < min) min = n;
  }
  return min;
}

function maxFirst(values, count) {
  if (!Array.isArray(values)) return null;
  let max = null;
  for (let i = 0; i < count && i < values.length; i++) {
    const n = finite(values[i]);
    if (n == null) continue;
    if (max == null || n > max) max = n;
  }
  return max;
}

function summarizeGrid(place, grid) {
  const hourly = grid?.hourly || {};
  const current = grid?.current || {};
  const elevM = finite(grid?.elevation);
  return {
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    elevFt: elevM == null ? null : Math.round(elevM * M_TO_FT),
    tempNow: finite(current.temperature_2m),
    humidityNow: finite(current.relative_humidity_2m),
    uvNow: finite(current.uv_index),
    tempMin24: minFirst(hourly.temperature_2m, HOURS),
    uvMax24: maxFirst(hourly.uv_index, HOURS),
    rainIn24: sumFirst(hourly.precipitation, HOURS),
    snowIn24: sumFirst(hourly.snowfall, HOURS),
    etIn24: sumFirst(hourly.et0_fao_evapotranspiration, HOURS),
  };
}

export async function fetchMicroclimate() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${VALLEY_GRID.lat},${RIDGE_GRID.lat}&longitude=${VALLEY_GRID.lng},${RIDGE_GRID.lng}&current=temperature_2m,relative_humidity_2m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation,snowfall,uv_index,et0_fao_evapotranspiration&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FDenver&forecast_days=2`;
  const resp = await fetch(url);
  if (!resp.ok) {
    return { state: 'unavailable', valley: null, ridge: null };
  }
  const body = await resp.json();
  const grids = Array.isArray(body) ? body : [body];
  if (!grids[0]) return { state: 'unavailable', valley: null, ridge: null };
  return {
    state: 'ready',
    valley: summarizeGrid(VALLEY_GRID, grids[0]),
    ridge: grids[1] ? summarizeGrid(RIDGE_GRID, grids[1]) : null,
  };
}

export function rainCall(inches) {
  if (inches == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'No rainfall amount on the valley grid.' };
  }
  if (inches < 0.01) {
    return { status: 'open', title: 'No meaningful rain in the next 24 hours', detail: `Valley floor grid total is ${inches.toFixed(2)} inches. Not a gauge in the field.` };
  }
  if (inches < 0.1) {
    return { status: 'caution', title: `${inches.toFixed(2)} inches of rain`, detail: 'A light amount on the valley forecast grid. Not a gauge in the field.' };
  }
  return { status: 'hold', title: `${inches.toFixed(2)} inches of rain`, detail: 'Enough on the valley grid to hold a set if it falls. Not a gauge in the field.' };
}

export function snowByTerrain({ valley, ridge }) {
  const v = valley?.snowIn24 ?? null;
  const r = ridge?.snowIn24 ?? null;
  if (v == null && r == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'No snowfall amount on either terrain grid.' };
  }
  const vText = v == null
    ? 'Valley floor snow is Data Unavailable.'
    : `Valley floor${valley?.elevFt ? ` (${valley.elevFt} ft)` : ''}: ${v.toFixed(2)} inches.`;
  const rText = r == null
    ? 'West face snow is Data Unavailable.'
    : `Wellsville west face${ridge?.elevFt ? ` (${ridge.elevFt} ft)` : ''}: ${r.toFixed(2)} inches.`;
  const any = (v || 0) >= 0.05 || (r || 0) >= 0.05;
  const ridgeOnly = (r || 0) >= 0.05 && (v || 0) < 0.05;
  return {
    status: any ? 'caution' : 'open',
    title: ridgeOnly
      ? 'Snow on the high ground, not the valley floor'
      : any
        ? 'Snow in the forecast'
        : 'No snow accumulation in the next 24 hours',
    detail: `${vText} ${rText} These are forecast-grid inches, not a measured stake. The west face is the Bear River side of the Wellsvilles.`,
  };
}

export function humidityCall({ meterRh, meterName, forecastRh }) {
  if (meterRh == null && forecastRh == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'No humidity on a Bear River meter or the valley forecast grid.' };
  }
  if (meterRh != null) {
    const grid = forecastRh == null ? '' : ` The valley forecast grid is ${Math.round(forecastRh)}%.`;
    return {
      status: 'open',
      title: `${Math.round(meterRh)}% on the meter`,
      detail: `Relative humidity at ${meterName || 'the nearest fresh Bear River meter'}.${grid} This is air moisture, not soil moisture. No soil probe is on these meters.`,
    };
  }
  return {
    status: 'caution',
    title: `${Math.round(forecastRh)}% on the forecast grid`,
    detail: 'The meters did not report humidity. This is the valley forecast grid, not a probe in the field. Air moisture, not soil moisture.',
  };
}

export function uvCall(uvMax) {
  if (uvMax == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'UV index did not come back.' };
  }
  let band = 'Low';
  let status = 'open';
  if (uvMax >= 11) { band = 'Extreme'; status = 'closed'; }
  else if (uvMax >= 8) { band = 'Very high'; status = 'closed'; }
  else if (uvMax >= 6) { band = 'High'; status = 'caution'; }
  else if (uvMax >= 3) { band = 'Moderate'; status = 'caution'; }
  return {
    status,
    title: `UV ${band}`,
    detail: `Peak UV index over the next 24 hours is ${uvMax.toFixed(1)} on the valley grid. After dark the current index reads near zero. This is a forecast index, not a sensor on the farm.`,
  };
}

export function freezeCall({ meterTemp, meterName, valley, ridge }) {
  const valleyMin = valley?.tempMin24 ?? null;
  const ridgeMin = ridge?.tempMin24 ?? null;
  if (meterTemp == null && valleyMin == null && ridgeMin == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'No temperature on the meter or either terrain grid.' };
  }
  const notes = [];
  if (meterTemp != null && meterTemp <= 32) notes.push(`${meterName || 'The field meter'} is ${Math.round(meterTemp)}°F right now.`);
  if (valleyMin != null && valleyMin <= 32) notes.push(`The valley floor forecast bottoms at ${Math.round(valleyMin)}°F.`);
  if (ridgeMin != null && ridgeMin <= 32) {
    notes.push(`The Wellsville west face${ridge?.elevFt ? ` at ${ridge.elevFt} ft` : ''} bottoms at ${Math.round(ridgeMin)}°F.`);
  }
  if (!notes.length) {
    const parts = [];
    if (meterTemp != null) parts.push(`meter ${Math.round(meterTemp)}°F`);
    if (valleyMin != null) parts.push(`valley low ${Math.round(valleyMin)}°F`);
    if (ridgeMin != null) parts.push(`west face low ${Math.round(ridgeMin)}°F`);
    return {
      status: 'open',
      title: 'No freeze in the next 24 hours',
      detail: `${parts.join(', ')}. Cold air still settles on the valley floor after dark. These lows are the forecast grids plus the live meter, not a thermometer in the canopy.`,
    };
  }
  const valleyFreezes = (meterTemp != null && meterTemp <= 32) || (valleyMin != null && valleyMin <= 32);
  return {
    status: valleyFreezes ? 'closed' : 'caution',
    title: valleyFreezes ? 'Freeze warning' : 'Freeze on the high ground',
    detail: `${notes.join(' ')} The valley floor and the west face are different places. One number is not the whole farm.`,
  };
}

export function waterDemand({ etInches, rainInches }) {
  if (etInches == null) {
    return { status: 'unavailable', title: 'Data Unavailable', detail: 'No evapotranspiration number came back. Not guessing how much water the weather will take.' };
  }
  const pull = `The next 24 hours of weather would pull about ${etInches.toFixed(2)} inches from a reference crop on the valley grid.`;
  if (rainInches == null) {
    return {
      status: 'caution',
      title: 'Weather water demand',
      detail: `${pull} Rain amount is Data Unavailable, so this is not a net balance. No soil probe is on these meters. This is not how long to run the pivot.`,
    };
  }
  const net = etInches - rainInches;
  if (net <= 0.01) {
    return {
      status: 'hold',
      title: 'Rain covers the weather demand',
      detail: `${pull} Rain on that grid is about ${rainInches.toFixed(2)} inches, which covers the pull. No soil probe is on these meters.`,
    };
  }
  return {
    status: 'open',
    title: `${net.toFixed(2)} inches of weather demand after rain`,
    detail: `${pull} Rain on that grid is about ${rainInches.toFixed(2)} inches, leaving about ${net.toFixed(2)} inches the weather would still take. No soil probe is on these meters. This is not how long to run the pivot.`,
  };
}
