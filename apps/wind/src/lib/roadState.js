/**
 * Statewide road call from live UDOT meters and labeled forecast grids.
 * A wind path exists only when a fresh meter is aimed at another road meter.
 * The path does not create snow inches. A blank reading stays Data Unavailable.
 * Nothing in here closes a road.
 */

import { plowCall } from './roadCast';
import { terrainSentence } from './terrainWind';

const COMPASS = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

export const PASS_WATCH = [
  { id: 'sardine', name: 'Sardine Summit', lat: 41.5496566, lng: -111.9541115 },
  { id: 'soldier', name: 'Soldier Summit', lat: 39.9287, lng: -111.0784 },
  { id: 'parleys', name: 'Parleys Summit', lat: 40.748, lng: -111.623 },
];

export const VISIBILITY_METERS = [
  { id: 'KSLC', name: 'Salt Lake City airport' },
  { id: 'KOGD', name: 'Ogden airport' },
  { id: 'KPVU', name: 'Provo airport' },
  { id: 'KHIF', name: 'Hill Air Force Base' },
  { id: 'KBMC', name: 'Brigham City airport' },
  { id: 'KLGU', name: 'Logan airport' },
  { id: 'KCDC', name: 'Cedar City airport' },
  { id: 'KSGU', name: 'St. George airport' },
  { id: 'KVEL', name: 'Vernal airport' },
];

const STALE_MINUTES = 90;

function finiteIn(value, min, max) {
  if (value == null || value === '' || value === 'NAN' || value === 'None') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function milesBetween(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1, lng1, lat2, lng2) {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function headingDelta(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function surfaceKind(surface) {
  const s = String(surface || '').toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('ice')) return 'ice';
  if (s.includes('snow') || s.includes('slush')) return 'snow';
  if (s.includes('wet') || s.includes('flood')) return 'wet';
  if (s.includes('damp') || s.includes('moist')) return 'damp';
  if (s.includes('dry')) return 'dry';
  return 'unknown';
}

const SURFACE_RANK = { unknown: 0, dry: 1, damp: 2, wet: 3, snow: 4, ice: 5 };

export function routeOf(name) {
  const match = String(name || '').match(/^(I|US|SR|UT)[-\s]?(\d+)([A-Z])?(?![A-Z0-9])/i);
  if (!match) return null;
  return `${match[1].toUpperCase()}-${match[2]}${match[3] ? match[3].toUpperCase() : ''}`;
}

export function milepostOf(name) {
  const match = String(name || '').match(/\bMP\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function worseKind(stations) {
  const fresh = (stations || []).filter(s => s && !s.stale);
  if (!fresh.length) return 'unknown';
  let best = 'unknown';
  for (const s of fresh) {
    const kind = surfaceKind(s.surface);
    if (SURFACE_RANK[kind] > SURFACE_RANK[best]) best = kind;
  }
  return best;
}

function makeRoadLine(route, a, b) {
  const miles = milesBetween(a.lat, a.lon, b.lat, b.lon);
  const ends = [a, b].filter(s => !s.stale);
  const gust = Math.max(-1, ...ends.map(s => (s.gust == null ? -1 : s.gust)));
  const speed = Math.max(-1, ...ends.map(s => (s.speed == null ? -1 : s.speed)));
  return {
    id: `${route}:${a.id}:${b.id}`,
    route,
    from: a.name,
    to: b.name,
    miles: Math.round(miles * 10) / 10,
    kind: worseKind(ends),
    precip: ends.some(s => s.precip),
    highWind: gust >= 40 || speed >= 30,
    pavementF: ends.reduce((min, s) => (s.pavementF == null ? min : min == null ? s.pavementF : Math.min(min, s.pavementF)), null),
    lat1: a.lat,
    lon1: a.lon,
    lat2: b.lat,
    lon2: b.lon,
  };
}

/**
 * Highlight a highway by joining the live meters that sit on it.
 * A gap longer than 22 miles is not filled in. A meter with no route is skipped.
 */
export function roadLines(stations) {
  const groups = new Map();
  for (const s of stations || []) {
    if (!s || s.stale || s.lat == null || s.lon == null) continue;
    const route = routeOf(s.name);
    if (!route) continue;
    if (!groups.has(route)) groups.set(route, []);
    groups.get(route).push(s);
  }
  const lines = [];
  for (const [route, list] of groups) {
    const marked = list.filter(s => milepostOf(s.name) != null);
    const chain = (marked.length >= 2 ? marked : list)
      .slice()
      .sort((a, b) => {
        const ma = milepostOf(a.name);
        const mb = milepostOf(b.name);
        if (ma != null && mb != null) return ma - mb;
        return b.lat - a.lat || a.lon - b.lon;
      });
    const linked = new Set();
    for (let i = 0; i < chain.length - 1; i++) {
      const miles = milesBetween(chain[i].lat, chain[i].lon, chain[i + 1].lat, chain[i + 1].lon);
      if (miles < 0.4 || miles > 22) continue;
      lines.push(makeRoadLine(route, chain[i], chain[i + 1]));
      linked.add(chain[i].id);
      linked.add(chain[i + 1].id);
    }
    for (const s of list) {
      if (linked.has(s.id)) continue;
      let best = null;
      for (const other of list) {
        if (other.id === s.id) continue;
        const miles = milesBetween(s.lat, s.lon, other.lat, other.lon);
        if (miles < 0.4 || miles > 18) continue;
        if (!best || miles < best.miles) best = { other, miles };
      }
      if (best) {
        lines.push(makeRoadLine(route, s, best.other));
        linked.add(s.id);
        linked.add(best.other.id);
      }
    }
  }
  return lines;
}

const SURFACE_WORD = {
  ice: 'Ice on the pavement',
  snow: 'Snow on the pavement',
  wet: 'Wet pavement',
  damp: 'Damp pavement',
  dry: 'Dry pavement',
};

export function roadHazardSentence(seg) {
  if (!seg) return 'This road is Data Unavailable. This is not a road closure.';
  if (!seg.kind || seg.kind === 'unknown') {
    return `${seg.route} pavement is Data Unavailable. This is not a road closure.`;
  }
  const bits = [`${seg.route}: ${SURFACE_WORD[seg.kind]}.`];
  if (seg.precip && seg.kind === 'dry') bits.push('A meter on this stretch reports precipitation.');
  if (seg.highWind) bits.push('High wind on this stretch.');
  if (seg.pavementF != null) bits.push(`Pavement ${Math.round(seg.pavementF)}°F.`);
  bits.push('This is not a road closure.');
  return bits.join(' ');
}

export function normalizeStation(raw, now = Date.now()) {
  if (!raw) return null;
  const lat = finiteIn(raw.Latitude ?? raw.lat, 36, 43);
  const lon = finiteIn(raw.Longitude ?? raw.lon, -115, -108);
  if (lat == null || lon == null) return null;

  let obsTime = null;
  let stale = true;
  const unix = finiteIn(raw.LastUpdated, 1e9, 4e9);
  const parsed = raw.obsTime ? Date.parse(raw.obsTime) : NaN;
  const millis = unix != null ? unix * 1000 : parsed;
  if (Number.isFinite(millis)) {
    obsTime = new Date(millis).toISOString();
    const ageMin = (now - millis) / 60000;
    stale = ageMin > STALE_MINUTES || ageMin < -5;
  }

  const dirWord = typeof raw.WindDirection === 'string' ? raw.WindDirection.trim().toUpperCase() : null;
  const dir = raw.windDir != null
    ? finiteIn(raw.windDir, 0, 360)
    : (dirWord && Object.prototype.hasOwnProperty.call(COMPASS, dirWord) ? COMPASS[dirWord] : null);

  const precipRaw = raw.Precipitation ?? raw.precip;
  let precip = null;
  if (typeof precipRaw === 'string') {
    const word = precipRaw.trim();
    const upper = word.toUpperCase();
    if (word && upper !== 'NAN' && upper !== 'NONE' && upper !== 'NO' && word !== '0') precip = word;
  }

  const surfaceRaw = raw.SurfaceStatus ?? raw.surface;
  const surface = surfaceRaw && surfaceRaw !== 'None' ? String(surfaceRaw) : null;

  return {
    id: String(raw.Id ?? raw.id ?? raw.StationName ?? `${lat},${lon}`),
    name: raw.StationName || raw.name || 'UDOT station',
    lat,
    lon,
    airF: finiteIn(raw.AirTemperature ?? raw.airF, -40, 120),
    pavementF: finiteIn(raw.SurfaceTemp ?? raw.pavementF, -40, 140),
    subF: finiteIn(raw.SubSurfaceTemp ?? raw.subF, -40, 140),
    surface,
    precip,
    speed: finiteIn(raw.WindSpeedAvg ?? raw.speed, 0, 100),
    gust: finiteIn(raw.WindSpeedGust ?? raw.gust, 0, 120),
    dir,
    obsTime,
    stale,
  };
}

/**
 * Fresh meters of at least 5 mph, aimed within 30 degrees at another
 * road meter 8 to 30 miles away. The nearest meter down that heading wins.
 * Delay is distance divided by the upstream speed. No invented downstream speed.
 */
export function windCarries(stations) {
  const rows = stations || [];
  const sources = rows.filter(s => !s.stale && s.speed != null && s.speed >= 5 && s.dir != null);
  const found = [];
  for (const up of sources) {
    let best = null;
    for (const down of rows) {
      if (down.id === up.id || down.lat == null || down.lon == null) continue;
      const miles = milesBetween(up.lat, up.lon, down.lat, down.lon);
      if (miles < 8 || miles > 30) continue;
      const head = bearingDeg(up.lat, up.lon, down.lat, down.lon);
      if (headingDelta(up.dir, head) > 30) continue;
      if (!best || miles < best.miles) best = { down, miles };
    }
    if (!best) continue;
    const minutes = Math.round((best.miles / up.speed) * 60);
    if (minutes > 360) continue;
    found.push({
      fromId: up.id,
      toId: best.down.id,
      from: up.name,
      to: best.down.name,
      miles: Math.round(best.miles * 10) / 10,
      speed: Math.round(up.speed),
      dir: Math.round(up.dir),
      minutes,
      fromLat: up.lat,
      fromLon: up.lon,
      toLat: best.down.lat,
      toLon: best.down.lon,
    });
  }
  found.sort((a, b) => b.speed - a.speed || a.minutes - b.minutes);
  const seen = new Set();
  const unique = [];
  for (const row of found) {
    if (seen.has(row.toId)) continue;
    seen.add(row.toId);
    unique.push(row);
    if (unique.length === 3) break;
  }
  return unique;
}

export function carrySentence(carries) {
  return terrainSentence(carries?.[0] || null);
}

export function pavementNow(stations) {
  const live = (stations || []).filter(s => !s.stale);
  if (!live.length) {
    return {
      status: 'unavailable',
      title: 'Pavement Data Unavailable',
      detail: 'No fresh UDOT road meter.',
    };
  }
  const snow = live.filter(s => surfaceKind(s.surface) === 'snow' || surfaceKind(s.surface) === 'ice');
  const wet = live.filter(s => surfaceKind(s.surface) === 'wet');
  const damp = live.filter(s => surfaceKind(s.surface) === 'damp');
  const raining = live.filter(s => String(s.precip || '').toLowerCase() === 'yes');
  const dry = live.filter(s => surfaceKind(s.surface) === 'dry');

  if (snow.length) {
    const names = snow.slice(0, 2).map(s => `${s.name} reports ${s.surface}`).join('. ');
    const more = snow.length > 2 ? ` ${snow.length - 2} more meters agree.` : '';
    return {
      status: 'closed',
      title: 'Snow or ice on the pavement',
      detail: `${names}.${more} This is the road sensor, not a forecast. This is not a road closure.`,
    };
  }
  if (wet.length) {
    return {
      status: 'caution',
      title: 'Wet pavement',
      detail: `${wet[0].name} reports ${wet[0].surface}.${wet.length > 1 ? ` ${wet.length} meters are wet.` : ''} This is not a road closure.`,
    };
  }
  if (raining.length) {
    return {
      status: 'caution',
      title: 'Precipitation on a road sensor',
      detail: `${raining[0].name} has the precipitation flag on. That flag is yes or no, not inches. This is not a road closure.`,
    };
  }
  if (damp.length) {
    return {
      status: 'caution',
      title: 'Damp pavement',
      detail: `${damp[0].name} reports Damp.${damp.length > 1 ? ` ${damp.length} meters are damp.` : ''} This is not a road closure.`,
    };
  }
  if (!dry.length) {
    return {
      status: 'unavailable',
      title: 'Pavement Data Unavailable',
      detail: 'Fresh meters are up, and none of them sent a surface word.',
    };
  }
  return {
    status: 'open',
    title: 'Pavement is dry',
    detail: `${dry.length} fresh meters say Dry.${live.length - dry.length > 0 ? ` ${live.length - dry.length} fresh meters have no surface word.` : ''}`,
  };
}

export function windWarning(stations, grids = []) {
  const live = (stations || []).filter(s => !s.stale && (s.speed != null || s.gust != null));
  const hits = live.filter(s => (s.gust != null && s.gust >= 40) || (s.speed != null && s.speed >= 30));
  if (hits.length) {
    const worst = hits.slice().sort((a, b) => (b.gust ?? b.speed) - (a.gust ?? a.speed))[0];
    const gust = worst.gust != null ? `${Math.round(worst.gust)} mph gust` : `${Math.round(worst.speed)} mph sustained`;
    const severe = (worst.gust != null && worst.gust >= 55) || (worst.speed != null && worst.speed >= 40);
    return {
      status: severe ? 'closed' : 'caution',
      title: 'High wind',
      detail: `${worst.name} has a ${gust}. High wind is a 40 mph gust or 30 mph sustained. This is not a road closure.`,
    };
  }
  const gridHits = (grids || []).filter(g => g.gustMaxNext6 != null && g.gustMaxNext6 >= 40);
  if (gridHits.length) {
    const top = gridHits.slice().sort((a, b) => b.gustMaxNext6 - a.gustMaxNext6)[0];
    return {
      status: 'caution',
      title: 'High wind in the forecast grid',
      detail: `${top.name} forecast grid reaches about ${Math.round(top.gustMaxNext6)} mph gusts in the next 6 hours. Forecast grid, not a road meter. This is not a road closure.`,
    };
  }
  if (!live.length && !(grids || []).some(g => g.gustMaxNext6 != null)) {
    return {
      status: 'unavailable',
      title: 'Wind Data Unavailable',
      detail: 'No fresh road-meter wind, and the pass grids did not return a gust.',
    };
  }
  const strongest = live.slice().sort((a, b) => (b.gust ?? b.speed ?? 0) - (a.gust ?? a.speed ?? 0))[0];
  const bit = !strongest
    ? 'The road meters are quiet.'
    : strongest.gust != null
      ? `Strongest fresh meter is a ${Math.round(strongest.gust)} mph gust at ${strongest.name}.`
      : `Strongest fresh meter is ${Math.round(strongest.speed)} mph at ${strongest.name}.`;
  return {
    status: 'open',
    title: 'No high wind',
    detail: `${bit} High wind is a 40 mph gust or 30 mph sustained. This is not a road closure.`,
  };
}

export function visibilityCall({ meters, grids } = {}) {
  const live = (meters || []).filter(m => !m.stale && m.miles != null && m.miles >= 0 && m.miles <= 20);
  if (live.length) {
    const low = live.slice().sort((a, b) => a.miles - b.miles)[0];
    if (low.miles < 0.25) {
      return {
        status: 'closed',
        title: 'Very low visibility',
        detail: `${low.name} is ${low.miles.toFixed(2)} miles. Airport meter, not a UDOT pavement sensor. This is not a road closure.`,
      };
    }
    if (low.miles < 1) {
      return {
        status: 'caution',
        title: 'Low visibility',
        detail: `${low.name} is ${low.miles.toFixed(1)} miles. Airport meter, not a UDOT pavement sensor. This is not a road closure.`,
      };
    }
  }
  const gridHits = (grids || []).filter(g => g.visMinMilesNext6 != null && g.visMinMilesNext6 < 1);
  if (gridHits.length) {
    const top = gridHits.slice().sort((a, b) => a.visMinMilesNext6 - b.visMinMilesNext6)[0];
    return {
      status: 'caution',
      title: 'Low visibility in the forecast grid',
      detail: `${top.name} forecast grid drops to about ${top.visMinMilesNext6.toFixed(1)} miles in the next 6 hours. Forecast grid, not an airport meter. This is not a road closure.`,
    };
  }
  if (live.length) {
    const low = live.slice().sort((a, b) => a.miles - b.miles)[0];
    return {
      status: 'open',
      title: 'Visibility is open',
      detail: `Lowest fresh airport reading is ${low.miles.toFixed(1)} miles at ${low.name}. UDOT road meters do not report visibility.`,
    };
  }
  return {
    status: 'unavailable',
    title: 'Visibility Data Unavailable',
    detail: 'UDOT road meters do not report visibility, and no fresh airport reading or pass-grid visibility came back.',
  };
}

function nearestMeter(stations, lat, lng) {
  let best = null;
  for (const s of stations || []) {
    if (s.stale || (s.pavementF == null && s.airF == null)) continue;
    const miles = milesBetween(lat, lng, s.lat, s.lon);
    if (miles > 15) continue;
    if (!best || miles < best.miles) best = { s, miles };
  }
  return best?.s || null;
}

export function statewidePlow(grids, stations) {
  if (!grids?.length) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'No pass forecast grid. Plows are not dispatched from a blank grid.',
    };
  }
  const calls = grids.map((grid) => {
    const meter = nearestMeter(stations, grid.lat, grid.lng);
    const call = plowCall({
      place: grid.name,
      snowIn6: grid.snowNext6 ?? null,
      rainIn6: grid.rainNext6 ?? null,
      tempMin6: grid.tempMinNext6 ?? null,
      meterTemp: meter?.pavementF ?? meter?.airF ?? null,
      meterName: meter?.name ?? null,
    });
    return { ...call, place: grid.name };
  });
  const rank = { closed: 3, caution: 2, unavailable: 1, open: 0 };
  calls.sort((a, b) => (rank[b.status] || 0) - (rank[a.status] || 0));
  const top = calls[0];
  if (top.status !== 'open') return top;
  const blank = calls.filter(c => c.status === 'unavailable').map(c => c.place);
  const names = calls.filter(c => c.status === 'open').map(c => c.place).join(', ');
  const blankBit = blank.length ? ` ${blank.join(' and ')} snowfall is Data Unavailable.` : '';
  return {
    status: 'open',
    title: 'No plow',
    detail: `${names} forecast grids are not both snowing and at or below 34°F in the next 6 hours.${blankBit} This is not a road closure.`,
  };
}

export function roadHeadline({ surface, plow, wind, vis, carries }) {
  const ordered = [surface, plow, wind, vis].filter(Boolean);
  const urgent = ordered.find(c => c.status === 'closed') || ordered.find(c => c.status === 'caution');
  if (urgent) {
    return { status: urgent.status, title: urgent.title, detail: urgent.detail };
  }
  if (surface?.status !== 'open') {
    return {
      status: 'unavailable',
      title: surface?.title || 'Data Unavailable',
      detail: surface?.detail || 'The UDOT meters did not come back.',
    };
  }
  return {
    status: 'open',
    title: 'No plow. Pavement is dry.',
    detail: carrySentence(carries),
  };
}

function firstNumbers(values, count, pick) {
  if (!Array.isArray(values)) return null;
  let chosen = null;
  let any = false;
  for (let i = 0; i < count && i < values.length; i++) {
    const n = typeof values[i] === 'number' && Number.isFinite(values[i]) ? values[i] : null;
    if (n == null) continue;
    any = true;
    chosen = chosen == null ? n : pick(chosen, n);
  }
  return any ? chosen : null;
}

export function summarizePassGrid(place, grid) {
  const hourly = grid?.hourly || {};
  const visM = firstNumbers(hourly.visibility, 6, Math.min);
  return {
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    rainNext6: firstNumbers(hourly.precipitation, 6, (a, b) => a + b),
    snowNext6: firstNumbers(hourly.snowfall, 6, (a, b) => a + b),
    tempMinNext6: firstNumbers(hourly.temperature_2m, 6, Math.min),
    gustMaxNext6: firstNumbers(hourly.wind_gusts_10m, 6, Math.max),
    visMinMilesNext6: visM == null ? null : visM * 0.000621371,
  };
}
