/**
 * Weather windows for the Tremonton farm trial.
 * Readings come from the same meter dots as the wind map.
 * A missing or stale wind is Data Unavailable. No invented fill.
 * Spray and irrigation text is a weather window. The product label
 * still controls any chemical. This file does not prescribe soil moisture.
 */

export const TREMONTON = { name: 'Tremonton', lat: 41.7119, lng: -112.1658 };
export const FIELD_RADIUS_MILES = 25;
export const STALE_MINUTES = 90;

const CARDINALS = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

export function airshed(lat, lng) {
  if (lng > -111.98 && lat > 41.55) return 'Cache Valley';
  return 'Bear River Valley';
}

export function milesBetween(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function directionDegrees(dir) {
  if (typeof dir === 'number' && Number.isFinite(dir)) return ((dir % 360) + 360) % 360;
  if (typeof dir === 'string') {
    const key = dir.trim().toUpperCase();
    if (key in CARDINALS) return CARDINALS[key];
  }
  return null;
}

function saneMph(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function sanePercent(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function saneTemp(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < -40 || n > 120) return null;
  return n;
}

export function denverHour(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Number(parts.find(p => p.type === 'hour')?.value);
}

export function valleyDrift(dir) {
  const deg = directionDegrees(dir);
  if (deg == null) return 'Wind direction is missing, so the valley drift note is Data Unavailable.';
  if (deg >= 180 && deg <= 247) {
    return 'South to southwest. The Bear River valley pull carries drift north.';
  }
  if (deg >= 315 || deg <= 45) {
    return 'North to northwest. Blue Creek and a post-frontal push drift south down the valley.';
  }
  if (deg >= 67 && deg <= 112) {
    return 'East off the Wellsvilles. That wind is uneven across a field. The home place will not match the west side.';
  }
  return 'Wind is crossing the valley more than running up or down it.';
}

function rainInHours(hours) {
  return (hours || []).slice(0, 6).some(h =>
    (h?.precipChance ?? 0) >= 40 || /rain|shower|thunder|snow/i.test(h?.shortForecast || '')
  );
}

/**
 * Normalize map-field stations. Drops model grid points.
 * Cache Valley meters stay in the list so the page can show them as unused.
 */
export function readMeters(stations, now = Date.now()) {
  const out = [];
  for (const s of stations || []) {
    if (!s) continue;
    if (s.source === 'open-meteo' || String(s.id || '').startsWith('OM_')) continue;
    const lat = s.lat;
    const lng = s.lon ?? s.lng;
    if (lat == null || lng == null) continue;
    const miles = milesBetween(TREMONTON.lat, TREMONTON.lng, lat, lng);
    if (miles > FIELD_RADIUS_MILES) continue;
    const obsMs = s.obsTime ? new Date(s.obsTime).getTime() : NaN;
    const ageMin = Number.isFinite(obsMs) ? (now - obsMs) / 60000 : null;
    const stale = ageMin == null || ageMin > STALE_MINUTES || ageMin < -5;
    out.push({
      id: s.id || s.stationId || 'meter',
      name: s.stationName || s.name || s.id || 'Meter',
      lat,
      lng,
      source: s.source || 'meter',
      speed: saneMph(s.windSpeed ?? s.speed),
      gust: saneMph(s.windGust ?? s.gust),
      dir: directionDegrees(s.windDir ?? s.direction ?? s.windDirection),
      tempF: saneTemp(s.temp ?? s.temperature),
      humidity: sanePercent(s.humidity),
      obsTime: s.obsTime || null,
      ageMin,
      stale,
      miles,
      airshed: airshed(lat, lng),
    });
  }
  out.sort((a, b) => a.miles - b.miles);
  return out;
}

export function pickFieldMeter(meters) {
  return (meters || []).find(m =>
    m.airshed === 'Bear River Valley' && !m.stale && m.speed != null
  ) || null;
}

export function describeMeter(meter) {
  if (!meter) return 'Data Unavailable';
  const place = meter.id === 'KBMC' ? 'Brigham City airport' : meter.name;
  return `${place} · ${meter.miles.toFixed(1)} mi from town · ${meter.airshed}. This is not the pivot.`;
}

export function sprinklerWindow(meter) {
  if (!meter || meter.speed == null) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'No fresh Bear River Valley wind inside 25 miles. A wheel line is not called from a blank meter.',
    };
  }
  const speed = meter.speed;
  const gusty = meter.gust != null && (meter.gust - speed) > 8;
  let status = 'open';
  let title = 'Pattern holds';
  let detail = 'Under 5 mph. Wheel lines and pivots should lay water where you set them.';
  if (speed >= 15) {
    status = 'closed';
    title = 'Shut wheel lines';
    detail = 'Over 15 mph. Shut wheel lines. A pivot throws most of the water downwind of the span.';
  } else if (speed >= 10) {
    status = 'caution';
    title = 'Uniformity drops';
    detail = '10 to 15 mph. Expect skips and overlaps. Hold a set if the crop needs an even drink.';
  } else if (speed >= 5) {
    status = 'caution';
    title = 'Pivots usable, wheel lines distort';
    detail = '5 to 10 mph. A pivot can still run. A wheel line will walk the pattern downwind.';
  }
  if (gusty) {
    detail += ` Gusts are ${Math.round(meter.gust)} mph, more than 8 above the sustained wind. Treat the set as gusty.`;
    if (status === 'open') status = 'caution';
  } else if (meter.gust == null) {
    detail += ' Gust is not on this meter. Do not treat the set as gust-safe.';
    if (status === 'open') status = 'caution';
  }
  return { status, title, detail };
}

export function waterWindow({ meter, hours }) {
  if (!meter || meter.speed == null) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'No fresh Bear River Valley meter inside 25 miles. Not guessing a set time.',
    };
  }
  if (rainInHours(hours)) {
    return {
      status: 'hold',
      title: 'Let the rain fall first',
      detail: 'The next few hours show rain or at least a 40% chance. Hold the set. This is a weather window, not a soil-moisture reading.',
    };
  }
  const spr = sprinklerWindow(meter);
  const how = spr.status === 'closed'
    ? 'Wind is high enough to walk water off the row. Wait, or run a pivot only if you can accept a downwind pattern.'
    : spr.status === 'caution'
      ? 'You can water. Expect the pattern to lean, especially on a wheel line.'
      : 'Wind is light enough for the pattern to land where you set it.';
  const title = spr.status === 'closed' ? 'Wait to water' : spr.status === 'caution' ? 'Water with a lean' : 'Water window is open';
  return {
    status: spr.status,
    title,
    detail: `${how} This is a weather window, not a soil-moisture reading.`,
  };
}

export function sprayWindow({ meter, hours, now = new Date() }) {
  if (!meter || meter.speed == null) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'No fresh Bear River Valley wind. Do not spray on a missing reading. The product label still controls the chemical.',
      valley: valleyDrift(null),
    };
  }
  const hour = denverHour(now);
  const inversionHours = hour < 9 || hour >= 19;
  const speed = meter.speed;
  const gust = meter.gust;
  let status = 'open';
  const reasons = [];

  if (speed < 3) {
    status = 'closed';
    reasons.push(inversionHours
      ? 'Under 3 mph before 9 AM or after 7 PM in the Bear River valley. That is the inversion window. Spray sits in the valley.'
      : 'Under 3 mph. Fine droplets hang and can leave the field.');
  } else if (speed > 10) {
    status = 'closed';
    reasons.push(`Sustained wind is ${Math.round(speed)} mph. Over 10 mph, keep the sprayer parked.`);
  } else {
    reasons.push(`Sustained wind is ${Math.round(speed)} mph, inside the 3 to 10 mph window.`);
  }

  if (gust == null) {
    if (status === 'open') status = 'caution';
    reasons.push('Gust is missing. A missing gust is not a safe gust.');
  } else if (gust > 10) {
    status = 'closed';
    reasons.push(`Gust is ${Math.round(gust)} mph. Over 10 mph, keep the sprayer parked.`);
  }

  if (rainInHours(hours)) {
    status = 'closed';
    reasons.push('Rain, or a 40% chance of it, is in the next few hours.');
  }

  if (meter.tempF != null && meter.tempF >= 90) {
    if (status === 'open') status = 'caution';
    reasons.push(`${Math.round(meter.tempF)}°F. Check the product label for a temperature cutoff.`);
  }

  reasons.push('The product label still controls the chemical. This is a weather window only.');

  const title = status === 'open'
    ? 'Spray window is open'
    : status === 'caution'
      ? 'Check before you spray'
      : 'Keep the sprayer parked';

  return { status, title, detail: reasons.join(' '), valley: valleyDrift(meter.dir) };
}

export function windTrend(points) {
  const usable = (points || []).filter(p => p && p.mph != null && Number.isFinite(p.mph));
  if (usable.length < 6) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'Not enough fresh hours on this meter to call a trend.',
      delta: null,
    };
  }
  const recent = usable.slice(-6);
  const prior = usable.slice(-12, -6);
  if (prior.length < 4) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'The earlier hours on this meter are missing, so the trend is Data Unavailable.',
      delta: null,
    };
  }
  const avg = rows => rows.reduce((sum, p) => sum + p.mph, 0) / rows.length;
  const delta = avg(recent) - avg(prior);
  if (Math.abs(delta) < 1.5) {
    return {
      status: 'steady',
      title: 'Wind is holding',
      detail: `The last few hours are within 1.5 mph of the hours before them (${delta > 0 ? '+' : ''}${delta.toFixed(1)} mph).`,
      delta,
    };
  }
  if (delta > 0) {
    return {
      status: 'rising',
      title: 'Wind is coming up',
      detail: `The last few hours are ${delta.toFixed(1)} mph stronger than the hours before them.`,
      delta,
    };
  }
  return {
    status: 'falling',
    title: 'Wind is laying down',
    detail: `The last few hours are ${Math.abs(delta).toFixed(1)} mph lighter than the hours before them.`,
    delta,
  };
}

export function forecastHourCall(hour) {
  const when = hour?.startTime ? new Date(hour.startTime) : new Date();
  const meter = {
    speed: saneMph(hour?.windSpeed),
    gust: null,
    dir: directionDegrees(hour?.windDirection),
    tempF: saneTemp(hour?.temperature),
  };
  if (meter.speed == null) {
    return { status: 'unavailable', title: 'Data Unavailable', spray: 'Data Unavailable', water: 'Data Unavailable' };
  }
  const spray = sprayWindow({ meter, hours: [hour], now: when });
  const water = waterWindow({ meter, hours: [hour] });
  return {
    status: spray.status,
    title: spray.title,
    spray: spray.title,
    water: water.title,
    detail: `${spray.detail} NWS hourly does not include a gust, so this hour is not called gust-safe.`,
  };
}
