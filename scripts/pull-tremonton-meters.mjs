#!/usr/bin/env node
/**
 * Tremonton farm-trial wind meters.
 *
 * Sources requested: MesoWest (Synoptic), Weather Underground, Ambient Weather.
 * Center: downtown Tremonton. Radius: 25 miles.
 * History window: 2022-11-02 through today, which is four years.
 * A station that does not go back that far is saved for the span the API returns.
 *
 * Usage:
 *   node scripts/pull-tremonton-meters.mjs discover
 *   node scripts/pull-tremonton-meters.mjs pull
 *
 * Inventory (small): apps/wind/src/data/tremonton-meter-inventory.json
 * Hourly files:      scripts/data/tremonton/   (gitignored)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CENTER = { name: 'Tremonton', lat: 41.7119, lng: -112.1658 };
const RADIUS_MI = 25;
const HISTORY_START = new Date('2022-11-02T00:00:00Z');
const DATA_DIR = resolve(__dirname, 'data', 'tremonton');
const INVENTORY_PATH = resolve(ROOT, 'apps', 'wind', 'src', 'data', 'tremonton-meter-inventory.json');

function loadEnv() {
  try {
    const lines = readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* env may already be set */
  }
}
loadEnv();

const SYNOPTIC_TOKEN = process.env.SYNOPTIC_TOKEN || '';
const WU_API_KEY = process.env.WU_API_KEY || '';
const AMBIENT_API_KEY = process.env.AMBIENT_API_KEY || process.env.VITE_AMBIENT_API_KEY || '';
const AMBIENT_APP_KEY = process.env.AMBIENT_APP_KEY || process.env.VITE_AMBIENT_APP_KEY || '';

function milesBetween(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function airshed(lat, lng) {
  if (lng > -111.98 && lat > 41.55) return 'Cache Valley';
  return 'Bear River Valley';
}

function stamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}`;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function circularMean(dirs) {
  if (!dirs.length) return null;
  let sin = 0;
  let cos = 0;
  for (const d of dirs) {
    sin += Math.sin(d * Math.PI / 180);
    cos += Math.cos(d * Math.PI / 180);
  }
  let mean = Math.atan2(sin / dirs.length, cos / dirs.length) * 180 / Math.PI;
  if (mean < 0) mean += 360;
  return Math.round(mean);
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

async function getJson(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(45000) });
  const text = await resp.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 240) }; }
  return { ok: resp.ok, status: resp.status, body };
}

async function discoverSynoptic() {
  if (!SYNOPTIC_TOKEN) return { status: 'missing SYNOPTIC_TOKEN', stations: [] };
  const url = `https://api.synopticdata.com/v2/stations/metadata?token=${SYNOPTIC_TOKEN}`
    + `&radius=${CENTER.lat},${CENTER.lng},${RADIUS_MI}&status=active&complete=1&sensorvars=1&limit=500`;
  const { ok, status, body } = await getJson(url);
  if (!ok || body?.SUMMARY?.RESPONSE_CODE !== 1) {
    return {
      status: `synoptic ${status}: ${body?.SUMMARY?.RESPONSE_MESSAGE || body?.message || body?.raw || 'failed'}`,
      stations: [],
    };
  }
  const stations = [];
  for (const s of body.STATION || []) {
    const lat = Number(s.LATITUDE);
    const lng = Number(s.LONGITUDE);
    const dist = milesBetween(CENTER.lat, CENTER.lng, lat, lng);
    if (dist > RADIUS_MI) continue;
    const sensors = s.SENSOR_VARIABLES || {};
    const hasWind = Boolean(sensors.wind_speed || sensors.wind_gust);
    if (!hasWind) continue;
    const por = s.PERIOD_OF_RECORD || {};
    stations.push({
      source: 'mesowest',
      id: s.STID,
      name: s.NAME,
      network: s.MNET_SHORTNAME || s.SHORTNAME || null,
      lat,
      lng,
      elevationFt: s.ELEVATION != null ? Math.round(Number(s.ELEVATION)) : null,
      miles: Math.round(dist * 10) / 10,
      airshed: airshed(lat, lng),
      recordStart: por.start || null,
      recordEnd: por.end || null,
      status: s.STATUS || null,
    });
  }
  stations.sort((a, b) => a.miles - b.miles);
  return { status: 'ok', stations };
}

async function discoverWu() {
  if (!WU_API_KEY) return { status: 'missing WU_API_KEY', stations: [] };
  const points = [
    ['Tremonton', 41.7119, -112.1658],
    ['Garland', 41.741, -112.162],
    ['Honeyville', 41.636, -112.079],
    ['Bothwell', 41.748, -112.287],
    ['Brigham City', 41.5103, -112.0155],
    ['Elwood', 41.689, -112.141],
    ['Corinne', 41.5477, -112.111],
    ['Perry', 41.46, -112.037],
    ['Plymouth', 41.876, -112.145],
  ];
  const seen = new Map();
  let throttle = null;
  for (const [label, lat, lng] of points) {
    const url = `https://api.weather.com/v3/location/near?geocode=${lat},${lng}&product=pws&format=json&apiKey=${WU_API_KEY}`;
    const { ok, status, body } = await getJson(url);
    if (!ok) {
      throttle = body?.raw || body?.errors?.[0]?.message || `HTTP ${status}`;
      break;
    }
    const ids = body.location?.stationId || [];
    const lats = body.location?.latitude || [];
    const lngs = body.location?.longitude || [];
    ids.forEach((id, i) => {
      if (!seen.has(id)) seen.set(id, { id, lat: lats[i], lng: lngs[i], foundNear: label });
    });
  }
  const stations = [];
  for (const s of seen.values()) {
    if (s.lat == null || s.lng == null) continue;
    const dist = milesBetween(CENTER.lat, CENTER.lng, s.lat, s.lng);
    if (dist > RADIUS_MI) continue;
    stations.push({
      source: 'weather-underground',
      id: s.id,
      name: s.id,
      network: 'WU PWS',
      lat: s.lat,
      lng: s.lng,
      elevationFt: null,
      miles: Math.round(dist * 10) / 10,
      airshed: airshed(s.lat, s.lng),
      recordStart: null,
      recordEnd: null,
      foundNear: s.foundNear,
    });
  }
  stations.sort((a, b) => a.miles - b.miles);
  return { status: throttle ? `throttled: ${throttle}` : 'ok', stations };
}

async function discoverAmbient() {
  if (!AMBIENT_API_KEY || !AMBIENT_APP_KEY) {
    return { status: 'missing AMBIENT_API_KEY or AMBIENT_APP_KEY', stations: [] };
  }
  const url = `https://rt.ambientweather.net/v1/devices?apiKey=${AMBIENT_API_KEY}&applicationKey=${AMBIENT_APP_KEY}`;
  const { ok, status, body } = await getJson(url);
  if (!ok || !Array.isArray(body)) {
    return { status: `ambient devices HTTP ${status}: ${body?.raw || 'failed'}`, stations: [] };
  }
  const stations = [];
  for (const device of body) {
    const info = device.info || {};
    const last = device.lastData || {};
    const lat = info.coords?.coords?.lat ?? info.coords?.lat ?? last.lat ?? null;
    const lng = info.coords?.coords?.lon ?? info.coords?.lon ?? last.lon ?? null;
    const dist = lat != null && lng != null ? milesBetween(CENTER.lat, CENTER.lng, lat, lng) : null;
    stations.push({
      source: 'ambient',
      id: info.macAddress || info.name || 'ambient-device',
      name: info.name || info.location || 'Ambient device',
      network: 'Ambient Weather',
      lat,
      lng,
      elevationFt: null,
      miles: dist != null ? Math.round(dist * 10) / 10 : null,
      airshed: lat != null ? airshed(lat, lng) : null,
      inTrialRadius: dist != null && dist <= RADIUS_MI,
      hasWind: last.windspeedmph != null || last.winddir != null,
      lastObs: last.dateutc || last.date || null,
    });
  }
  return { status: 'ok', stations };
}

function writeInventory(discovered) {
  mkdirSync(dirname(INVENTORY_PATH), { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    center: CENTER,
    radiusMiles: RADIUS_MI,
    historyWindow: { start: HISTORY_START.toISOString(), end: new Date().toISOString() },
    sources: {
      mesowest: 'Synoptic Data API v2 (MesoWest)',
      weatherUnderground: 'api.weather.com PWS near + history',
      ambient: 'Ambient Weather devices on this account. That API does not search other people\'s stations.',
    },
    note: 'Cache Valley stations sit over the Wellsvilles from the Tremonton fields. They are listed and kept separate from Bear River Valley meters.',
    ...discovered,
  };
  writeFileSync(INVENTORY_PATH, JSON.stringify(payload, null, 2));
  writeFileSync(resolve(DATA_DIR, 'inventory.json'), JSON.stringify(payload, null, 2));
  return payload;
}

async function pullSynopticStation(station) {
  const dir = resolve(DATA_DIR, 'synoptic');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${station.id}.jsonl`);
  const recordStart = station.recordStart ? new Date(station.recordStart) : HISTORY_START;
  let cursor = recordStart > HISTORY_START ? recordStart : HISTORY_START;
  const end = new Date();
  let hours = 0;
  let requests = 0;
  let error = null;
  const seen = new Set();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      try { seen.add(JSON.parse(line).t); } catch { /* skip */ }
    }
  }

  while (cursor < end) {
    const chunkEnd = addDays(cursor, 31);
    const stop = chunkEnd < end ? chunkEnd : end;
    const url = `https://api.synopticdata.com/v2/stations/timeseries?token=${SYNOPTIC_TOKEN}`
      + `&stid=${encodeURIComponent(station.id)}&start=${stamp(cursor)}&end=${stamp(stop)}`
      + `&vars=wind_speed,wind_direction,wind_gust,air_temp,relative_humidity`
      + `&units=english,speed|mph,temp|F&obtimezone=utc`;
    const { ok, status, body } = await getJson(url);
    requests++;
    if (!ok || body?.SUMMARY?.RESPONSE_CODE !== 1) {
      error = body?.SUMMARY?.RESPONSE_MESSAGE || body?.raw || `HTTP ${status}`;
      break;
    }
    const obs = body.STATION?.[0]?.OBSERVATIONS;
    if (obs?.date_time?.length) {
      const buckets = new Map();
      obs.date_time.forEach((t, i) => {
        const hour = t.slice(0, 13);
        if (!buckets.has(hour)) buckets.set(hour, { speeds: [], dirs: [], gusts: [], temps: [] });
        const b = buckets.get(hour);
        const spd = obs.wind_speed_set_1?.[i];
        const dir = obs.wind_direction_set_1?.[i];
        const gust = obs.wind_gust_set_1?.[i];
        const temp = obs.air_temp_set_1?.[i];
        if (spd != null) b.speeds.push(spd);
        if (dir != null) b.dirs.push(dir);
        if (gust != null) b.gusts.push(gust);
        if (temp != null) b.temps.push(temp);
      });
      const lines = [];
      for (const [hour, b] of buckets) {
        const t = `${hour}:00:00Z`;
        if (seen.has(t) || !b.speeds.length) continue;
        seen.add(t);
        lines.push(JSON.stringify({
          t,
          mph: avg(b.speeds),
          dir: circularMean(b.dirs),
          gust: b.gusts.length ? Math.round(Math.max(...b.gusts) * 10) / 10 : null,
          tempF: avg(b.temps),
          n: b.speeds.length,
        }));
      }
      if (lines.length) {
        appendFileSync(file, lines.join('\n') + '\n');
        hours += lines.length;
      }
    }
    cursor = stop;
    await new Promise((r) => setTimeout(r, 250));
  }

  return {
    id: station.id,
    file: existsSync(file) ? file : null,
    hoursWrittenThisRun: hours,
    hoursOnDisk: seen.size,
    requests,
    error,
    bytes: existsSync(file) ? statSync(file).size : 0,
  };
}

async function main() {
  const mode = process.argv[2] || 'discover';
  console.log(`Tremonton meters — ${mode} — ${RADIUS_MI} mi of ${CENTER.lat}, ${CENTER.lng}`);

  const synoptic = await discoverSynoptic();
  console.log(`MesoWest: ${synoptic.status} — ${synoptic.stations.length} wind stations`);
  for (const s of synoptic.stations) {
    console.log(`  ${s.miles.toFixed(1).padStart(5)} mi  ${s.id.padEnd(12)} ${s.airshed.padEnd(20)} ${s.network || ''}  ${s.name}  record ${s.recordStart || '?'}`);
  }

  const wu = await discoverWu();
  console.log(`Weather Underground: ${wu.status} — ${wu.stations.length} inside ${RADIUS_MI} mi`);
  for (const s of wu.stations) {
    console.log(`  ${String(s.miles).padStart(5)} mi  ${s.id}  ${s.airshed}`);
  }

  const ambient = await discoverAmbient();
  console.log(`Ambient account devices: ${ambient.status} — ${ambient.stations.length}`);
  for (const s of ambient.stations) {
    console.log(`  ${s.name}  ${s.miles == null ? 'no coords' : s.miles + ' mi'}  in radius ${s.inTrialRadius}  wind ${s.hasWind}`);
  }

  const inventory = writeInventory({ synoptic, wu, ambient, pulls: [] });
  console.log(`Inventory written: ${INVENTORY_PATH}`);

  if (mode !== 'pull') return;

  const pulls = [];
  for (const station of synoptic.stations) {
    if (station.airshed !== 'Bear River Valley') {
      console.log(`Skip history for ${station.id} (${station.airshed}) — listed, not mixed into the field pull`);
      continue;
    }
    console.log(`Pulling MesoWest ${station.id} from ${station.recordStart || HISTORY_START.toISOString()}`);
    const result = await pullSynopticStation(station);
    console.log(`  ${station.id}: +${result.hoursWrittenThisRun} hours this run, ${result.hoursOnDisk} on disk, ${result.bytes} bytes${result.error ? ' ERROR ' + result.error : ''}`);
    pulls.push(result);
    inventory.pulls = pulls;
    writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2));
    writeFileSync(resolve(DATA_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
