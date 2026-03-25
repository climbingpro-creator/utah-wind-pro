#!/usr/bin/env node
/**
 * 365-DAY MODEL COMPARISON — UnifiedPredictor vs legacy 3-step simulator
 *
 * Pulls Synoptic (MesoWest) timeseries for Utah Lake core stations, replays
 * each kite-window hour, runs:
 *   - OLD: same logic as scripts/historical-backtest.js (simulatePrediction)
 *   - NEW: UnifiedPredictor.predict() with optional Redis statistical models
 *
 * Ground truth:
 *   --ground-truth=fps (default): FPS ≥ 10 mph = kiteable (Meso proxy).
 *   --ground-truth=pws: same hours, but labels + speed MAE vs your Ambient PWS
 *   (same 3-year history the server ingests via ?action=backfill-pws — replayed
 *   here from the Ambient API into hourly buckets, not from Synoptic).
 *
 * Usage:
 *   node scripts/compare-models-365-backtest.mjs
 *   node scripts/compare-models-365-backtest.mjs --days=90 --lake=utah-lake-lincoln
 *   node scripts/compare-models-365-backtest.mjs --ground-truth=pws
 *
 * Env (from .env):
 *   SYNOPTIC_TOKEN or VITE_SYNOPTIC_TOKEN  (required)
 *   AMBIENT_API_KEY + AMBIENT_APP_KEY  (required when --ground-truth=pws)
 *   AMBIENT_DEVICE_MAC  (optional; defaults to Zigzag station MAC used in api/lib/serverPropagation.js)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (optional — loads models:statistical for NEW)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { predict as unifiedPredict } from '../src/services/UnifiedPredictor.js';
import { utahLakeConfigs } from '../src/config/lakes/utahLake.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const _capturedLog = [];
const _origLog = console.log;
console.log = function (...args) {
  _capturedLog.push(args.map(a => typeof a === 'string' ? a : '').join(' '));
  _origLog.apply(console, args);
};
process.on('beforeExit', () => {
  if (_capturedLog.length > 20) {
    try { writeFileSync(resolve(__dirname, '..', 'backtest-results-latest.txt'), _capturedLog.join('\n'), 'utf-8'); } catch {}
  }
});

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* no .env */ }
}

const DEFAULT_PWS_MAC = '48:3F:DA:54:2C:6E';

function parseArgs() {
  const args = {
    days: 365,
    lake: 'utah-lake-lincoln',
    kiteStart: 10,
    kiteEnd: 19,
    chunkDays: 30,
    groundTruth: 'fps',
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--days=')) args.days = Math.min(1095, Math.max(7, parseInt(a.split('=')[1], 10)));
    if (a.startsWith('--lake=')) args.lake = a.split('=').slice(1).join('=');
    if (a.startsWith('--ground-truth=')) {
      const v = a.split('=')[1]?.toLowerCase();
      if (v === 'pws' || v === 'fps') args.groundTruth = v;
    }
    if (a === '--help') args.help = true;
  }
  return args;
}

const FOIL_MIN = 10;

// Stations aligned with historical-backtest + expanded corridor RWIS
const CORE_STATIONS = ['FPS', 'KSLC', 'KPVU', 'QSF', 'UTALP', 'UTORM', 'UTPCR', 'UT7'];

function fetchJSON(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

function fmtSynoptic(date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 12);
}

// ─── IEM (Iowa Environmental Mesonet) — free, multi-year ASOS data ──────────
// Covers SLC (KSLC), PVU (KPVU), SPK (QSF/Spanish Fork) back 5+ years.
// Does NOT have FPS or UTALP (non-ASOS). Synoptic fills those for recent year.
const IEM_STATION_MAP = {
  SLC: 'KSLC',
  PVU: 'KPVU',
  SPK: 'QSF',
};
const IEM_STATIONS = Object.keys(IEM_STATION_MAP);

async function fetchIEMData(startDate, endDate) {
  const allData = {};

  for (const iemId of IEM_STATIONS) {
    const ourId = IEM_STATION_MAP[iemId];
    const sd = new Date(startDate + 'T00:00:00Z');
    const ed = new Date(endDate + 'T23:59:59Z');
    const url =
      `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?` +
      `station=${iemId}&data=drct&data=sknt&data=gust&data=alti&data=mslp&data=tmpf` +
      `&year1=${sd.getUTCFullYear()}&month1=${sd.getUTCMonth() + 1}&day1=${sd.getUTCDate()}` +
      `&year2=${ed.getUTCFullYear()}&month2=${ed.getUTCMonth() + 1}&day2=${ed.getUTCDate()}` +
      `&tz=America%2FDenver&format=onlycomma&latlon=no&elev=no` +
      `&missing=M&trace=T&direct=no&report_type=3&report_type=4`;

    process.stdout.write(`  IEM: fetching ${iemId} → ${ourId} …`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) { console.log(` HTTP ${resp.status}`); continue; }
      const csv = await resp.text();
      const lines = csv.trim().split('\n');
      if (lines.length < 2) { console.log(' no data'); continue; }

      const hourly = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 8) continue;
        const ts = cols[1]; // "2024-06-01 14:56"
        if (!ts || ts.length < 16) continue;
        const dateKey = ts.slice(0, 10);
        const hour = parseInt(ts.slice(11, 13), 10);
        if (isNaN(hour)) continue;

        const dir = cols[2] !== 'M' ? parseFloat(cols[2]) : null;
        const spdKt = cols[3] !== 'M' ? parseFloat(cols[3]) : null;
        const gustKt = cols[4] !== 'M' ? parseFloat(cols[4]) : null;
        const alti = cols[5] !== 'M' ? parseFloat(cols[5]) : null;
        const mslp = cols[6] !== 'M' ? parseFloat(cols[6]) : null;
        const tmpf = cols[7] !== 'M' ? parseFloat(cols[7]) : null;

        // IEM reports knots — convert to mph
        const spd = spdKt != null ? spdKt * 1.15078 : null;
        const gust = gustKt != null ? gustKt * 1.15078 : null;
        // altimeter inches → mb (approximate)
        const pressure = mslp != null ? mslp : (alti != null ? alti * 33.8639 : null);

        if (!hourly[dateKey]) hourly[dateKey] = {};
        if (!hourly[dateKey][hour]) {
          hourly[dateKey][hour] = { speeds: [], dirs: [], gusts: [], temps: [], pressures: [] };
        }
        if (spd != null) hourly[dateKey][hour].speeds.push(spd);
        if (dir != null && dir > 0) hourly[dateKey][hour].dirs.push(dir);
        if (gust != null) hourly[dateKey][hour].gusts.push(gust);
        if (tmpf != null) hourly[dateKey][hour].temps.push(tmpf);
        if (pressure != null) hourly[dateKey][hour].pressures.push(pressure);
      }

      // Average into hourly buckets
      const parsed = {};
      for (const [date, hours] of Object.entries(hourly)) {
        parsed[date] = {};
        for (const [h, data] of Object.entries(hours)) {
          const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
          parsed[date][h] = {
            speed: avg(data.speeds),
            direction: avg(data.dirs),
            gust: data.gusts.length > 0 ? Math.max(...data.gusts) : null,
            temp: avg(data.temps),
            pressure: avg(data.pressures),
          };
        }
      }

      if (!allData[ourId]) allData[ourId] = {};
      Object.assign(allData[ourId], parsed);

      const dateCount = Object.keys(parsed).length;
      console.log(` OK (${dateCount} dates)`);
    } catch (e) {
      console.log(` ERROR ${e.message}`);
    }
    await sleep(500);
  }
  return allData;
}

function parseStationData(station) {
  const obs = station.OBSERVATIONS || {};
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const gusts = obs.wind_gust_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.pressure_set_1d || obs.pressure_set_1 || obs.sea_level_pressure_set_1 || [];

  const hourly = {};

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    const dateKey = t.toISOString().split('T')[0];
    const hour = t.getHours();

    if (!hourly[dateKey]) hourly[dateKey] = {};
    if (!hourly[dateKey][hour]) {
      hourly[dateKey][hour] = { speeds: [], dirs: [], gusts: [], temps: [], pressures: [] };
    }

    if (speeds[i] != null) hourly[dateKey][hour].speeds.push(speeds[i]);
    if (dirs[i] != null) hourly[dateKey][hour].dirs.push(dirs[i]);
    if (gusts[i] != null) hourly[dateKey][hour].gusts.push(gusts[i]);
    if (temps[i] != null) hourly[dateKey][hour].temps.push(temps[i]);
    if (pressures[i] != null) hourly[dateKey][hour].pressures.push(pressures[i]);
  }

  const result = {};
  for (const [date, hours] of Object.entries(hourly)) {
    result[date] = {};
    for (const [hour, data] of Object.entries(hours)) {
      const avg = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
      result[date][hour] = {
        speed: avg(data.speeds),
        direction: avg(data.dirs),
        gust: data.gusts.length > 0 ? Math.max(...data.gusts) : null,
        temp: avg(data.temps),
        pressure: avg(data.pressures),
      };
    }
  }
  return result;
}

/** Legacy 3-step model from historical-backtest.js */
function simulatePredictionOld(hourData) {
  const fps = hourData.FPS || {};
  const kslc = hourData.KSLC || {};
  const kpvu = hourData.KPVU || {};
  const qsf = hourData.QSF || {};

  let pressureScore = 50;
  if (kslc.pressure != null && kpvu.pressure != null) {
    const gradient = kslc.pressure - kpvu.pressure;
    if (gradient > 2.0) pressureScore = 0;
    else if (gradient > 1.0) pressureScore = 25;
    else if (gradient > 0) pressureScore = 50;
    else if (gradient > -1.5) pressureScore = 75;
    else pressureScore = 95;
  }

  let thermalScore = 50;
  if (fps.temp != null && kslc.temp != null) {
    const delta = fps.temp - kslc.temp;
    if (delta > 15) thermalScore = 95;
    else if (delta > 10) thermalScore = 85;
    else if (delta > 5) thermalScore = 70;
    else if (delta > 0) thermalScore = 50;
    else thermalScore = 20;
  }

  let convergenceScore = 50;
  if (fps.direction != null) {
    const dir = fps.direction;
    if (dir >= 90 && dir <= 180) convergenceScore = 95;
    else if (dir >= 60 && dir <= 210) convergenceScore = 60;
    else if (dir >= 315 || dir <= 45) convergenceScore = 70;
    else convergenceScore = 20;
  }

  let qsfBoost = 1.0;
  if (qsf.direction != null && qsf.speed != null) {
    if (qsf.direction >= 100 && qsf.direction <= 180 && qsf.speed >= 6) qsfBoost = 1.3;
  }

  let northBoost = 1.0;
  if (kslc.direction != null && kslc.speed != null) {
    if ((kslc.direction >= 315 || kslc.direction <= 45) && kslc.speed >= 8) northBoost = 1.3;
  }

  const rawProb = pressureScore * 0.4 + thermalScore * 0.4 + convergenceScore * 0.2;
  const probability = Math.min(95, Math.max(0, rawProb * qsfBoost * northBoost));

  let expectedSpeed = fps.speed || 0;
  if (kslc.speed >= 10 && (kslc.direction >= 315 || kslc.direction <= 45)) {
    expectedSpeed = Math.max(expectedSpeed, kslc.speed * 1.3);
  }

  let windType = 'calm';
  if (fps.direction != null) {
    if (fps.direction >= 90 && fps.direction <= 180) windType = 'thermal';
    else if (fps.direction >= 315 || fps.direction <= 45) windType = 'north_flow';
    else if (fps.speed >= 8) windType = 'other';
  }

  return {
    probability: Math.round(probability),
    expectedSpeed,
    windType,
    predictedKiteable: probability >= 50,
  };
}

/** Calendar month 0–11 in America/Denver for YYYY-MM-DD */
function monthIndexDenver(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, mo - 1, d, 19, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'numeric',
  }).formatToParts(anchor);
  return parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1;
}

/** Approximate instant for UnifiedPredictor meta (hour = Synoptic local bucket hour) */
function referenceDateForSample(dateStr, hourLocal) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hourLocal + 6, 30, 0));
}

function buildLiveStations(hourSnap, config, { injectPWS } = {}) {
  const list = [];
  const seen = new Set();

  const pushSt = (id, row) => {
    if (!id || !row || row.speed == null) return;
    if (seen.has(id)) return;
    seen.add(id);
    list.push({
      id,
      isPWS: id === 'PWS',
      speed: row.speed,
      windSpeed: row.speed,
      direction: row.direction,
      windDirection: row.direction,
      gust: row.gust,
      windGust: row.gust,
      temperature: row.temp,
      pressure: row.pressure,
      seaLevelPressure: row.pressure,
    });
  };

  const st = config?.stations;
  if (!st) return list;

  if (st.pressure?.high?.id) pushSt(st.pressure.high.id, hourSnap[st.pressure.high.id]);
  if (st.pressure?.low?.id) pushSt(st.pressure.low.id, hourSnap[st.pressure.low.id]);
  for (const r of st.ridge || []) pushSt(r.id, hourSnap[r.id]);
  for (const l of st.lakeshore || []) pushSt(l.id, hourSnap[l.id]);
  for (const r of st.reference || []) pushSt(r.id, hourSnap[r.id]);
  if (st.earlyIndicator?.id) pushSt(st.earlyIndicator.id, hourSnap[st.earlyIndicator.id]);
  if (st.groundTruth?.id && st.groundTruth.id !== 'PWS') {
    pushSt(st.groundTruth.id, hourSnap[st.groundTruth.id]);
  }
  if ((st.groundTruth?.id === 'PWS' || injectPWS) && hourSnap.PWS?.speed != null) {
    pushSt('PWS', hourSnap.PWS);
  }

  for (const id of CORE_STATIONS) {
    if (!seen.has(id) && hourSnap[id]) pushSt(id, hourSnap[id]);
  }

  return list;
}

function trimModelContextForMonth(raw, monthIndex) {
  if (!raw || typeof raw !== 'object') return {};
  let monthClim = null;
  if (raw.climatology) {
    monthClim = {};
    for (const [stid, months] of Object.entries(raw.climatology)) {
      if (months && months[monthIndex] != null) monthClim[stid] = months[monthIndex];
    }
  }
  return {
    lagCorrelations: raw.lagCorrelations || null,
    climatology: monthClim,
    currentMonth: monthIndex,
    fingerprints: raw.fingerprints || null,
    calibration: raw.calibrationCurves || raw.calibration || null,
    gradientThresholds: raw.gradientThresholds || null,
    thermalProfiles: raw.thermalProfiles || null,
    learnedWeights: raw.learnedWeights || null,
    nwsHourly: raw.nwsHourly || null,
    learnedLags: raw.learnedLags || null,
    analogs: raw.analogs || null,
  };
}

async function redisGetModelBundle() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['MGET', 'models:statistical', 'weights:server']),
    });
    const data = await resp.json();
    const arr = data.result;
    if (!arr || !arr[0]) return null;
    const models = JSON.parse(arr[0]);
    let learnedWeights = null;
    if (arr[1]) {
      try {
        learnedWeights = JSON.parse(arr[1]);
      } catch { /* ignore */ }
    }
    return { ...models, learnedWeights };
  } catch (e) {
    console.warn('Redis model bundle unavailable:', e.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** { date: 'YYYY-MM-DD', hour: 0–23 } in America/Denver */
function toDenverDateHour(ms) {
  const d = new Date(ms);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  return { date: `${y}-${m}-${day}`, hour: h };
}

/**
 * Page Ambient device history (newest → oldest) into hourly averages in Denver time.
 * Same source as server backfillPWSHistory; used here for per-hour ground truth + PWS in liveStations.
 */
async function fetchAmbientPWSHourly({ apiKey, appKey, mac, minDateStr, maxDateStr }) {
  const bucket = {};
  let endDate = null;
  let pages = 0;
  const maxPages = 1200;
  let emptyRetries = 0;
  let rateLimitHits = 0;

  while (pages < maxPages) {
    const params = new URLSearchParams({
      apiKey,
      applicationKey: appKey,
      limit: '288',
    });
    if (endDate) params.set('endDate', endDate);

    const url = `https://api.ambientweather.net/v1/devices/${encodeURIComponent(mac)}?${params}`;
    const resp = await fetch(url);
    if (resp.status === 429) {
      rateLimitHits++;
      const wait = Math.min(5000, 1500 * rateLimitHits);
      await sleep(wait);
      if (rateLimitHits > 10) { console.log(`\n  PWS: giving up after ${rateLimitHits} rate limits at page ${pages}`); break; }
      continue;
    }
    if (!resp.ok) throw new Error(`Ambient API ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      emptyRetries++;
      if (endDate) {
        // Jump backward over data gaps (7 days per retry, up to 60-day max skip)
        const cur = new Date(endDate).getTime();
        const skipDays = Math.min(7 * emptyRetries, 60);
        endDate = new Date(cur - skipDays * 86400000).toISOString();
        const { date: skipTo } = toDenverDateHour(new Date(endDate).getTime());
        if (skipTo < minDateStr) { console.log(`\n  PWS: reached minDate after gap skip at ${skipTo}`); break; }
        if (emptyRetries <= 12) {
          process.stdout.write(`\n    gap at page ${pages}, skipping ${skipDays}d → ${skipTo}`);
          await sleep(1500);
          continue;
        }
      }
      console.log(`\n  PWS: giving up after ${emptyRetries} empty responses at page ${pages}`);
      break;
    }
    emptyRetries = 0;
    rateLimitHits = Math.max(0, rateLimitHits - 1);

    pages++;
    const sorted = [...data].sort(
      (a, b) => new Date(a.dateutc ?? a.date).getTime() - new Date(b.dateutc ?? b.date).getTime(),
    );

    for (const r of sorted) {
      const ts = new Date(r.dateutc ?? r.date).getTime();
      const { date, hour } = toDenverDateHour(ts);
      if (date < minDateStr || date > maxDateStr) continue;

      const spd = r.windspeedmph ?? r.windSpeed;
      if (spd == null) continue;
      const dir = r.winddir ?? r.windDir ?? r.winddirection ?? null;

      if (!bucket[date]) bucket[date] = {};
      if (!bucket[date][hour]) bucket[date][hour] = { speeds: [], dirs: [] };
      bucket[date][hour].speeds.push(Number(spd));
      if (dir != null) bucket[date][hour].dirs.push(Number(dir));
    }

    const oldest = sorted[0];
    const oldestUtc = new Date(oldest.dateutc ?? oldest.date).getTime();
    endDate = new Date(oldestUtc - 1000).toISOString();

    const { date: batchOldestDenver } = toDenverDateHour(oldestUtc);

    if (pages % 50 === 0) {
      process.stdout.write(`\n    page ${pages}, oldest=${batchOldestDenver}, dates=${Object.keys(bucket).length}`);
    }

    if (batchOldestDenver < minDateStr) break;

    // Ambient rate limit: 1 req/sec, be conservative
    await sleep(1200);
  }

  const hourly = {};
  for (const [date, hours] of Object.entries(bucket)) {
    hourly[date] = {};
    for (const [hStr, agg] of Object.entries(hours)) {
      const speeds = agg.speeds;
      const dirs = agg.dirs;
      hourly[date][hStr] = {
        speed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        direction: dirs.length ? dirs.reduce((a, b) => a + b, 0) / dirs.length : null,
        gust: null,
        temp: null,
        pressure: null,
      };
    }
  }
  return hourly;
}

function *dateRange(end, daysBack) {
  const e = new Date(end + 'T12:00:00Z');
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(e);
    d.setUTCDate(d.getUTCDate() - i);
    yield d.toISOString().split('T')[0];
  }
}

function aggregateMetrics(name, rows) {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  let brier = 0;
  let speedErr = 0,
    speedN = 0;

  for (const r of rows) {
    const pred = r.predPositive;
    const act = r.actualKite;
    if (pred && act) tp++;
    else if (pred && !act) fp++;
    else if (!pred && !act) tn++;
    else fn++;

    const p = Math.max(0, Math.min(1, r.prob / 100));
    brier += (p - (act ? 1 : 0)) ** 2;

    if (r.expSpeed != null && r.actualSpeed != null) {
      speedErr += Math.abs(r.expSpeed - r.actualSpeed);
      speedN++;
    }
  }

  const n = rows.length || 1;
  brier /= n;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = (tp + tn) / n;
  const balanced = (precision + recall) / 2;

  return {
    name,
    samples: rows.length,
    accuracy: Math.round(accuracy * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Approx: Math.round(balanced * 1000) / 1000,
    brier: Math.round(brier * 10000) / 10000,
    avgSpeedMae: speedN ? Math.round((speedErr / speedN) * 10) / 10 : null,
    confusion: { tp, fp, tn, fn },
  };
}

async function main() {
  loadEnv();
  const args = parseArgs();
  if (args.help) {
    console.log(`
compare-models-365-backtest.mjs
  --days=N     Days to pull ending today (default 365, max 365)
  --lake=ID    LAKE_CONFIGS id (default utah-lake-lincoln)
  --ground-truth=fps|pws   fps = FPS ≥10 mph (default); pws = Ambient PWS at lake + AMBIENT_* env
`);
    process.exit(0);
  }

  const token = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
  if (!token) {
    console.error('Set SYNOPTIC_TOKEN or VITE_SYNOPTIC_TOKEN');
    process.exit(1);
  }

  const config = utahLakeConfigs[args.lake];
  if (!config) {
    console.error('Unknown lake:', args.lake, '(this script only loads src/config/lakes/utahLake.js)');
    process.exit(1);
  }

  const endDate = new Date().toISOString().split('T')[0];
  const dates = [...dateRange(endDate, args.days)];

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  365-day backtest: UnifiedPredictor vs legacy 3-step model   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Lake: ${args.lake}  |  Days: ${args.days}  |  Hours: ${args.kiteStart}-${args.kiteEnd} local`);
  console.log(
    `  Ground truth: ${args.groundTruth === 'pws' ? `PWS (Ambient) ≥ ${FOIL_MIN} mph` : `FPS ≥ ${FOIL_MIN} mph`} = kiteable`,
  );
  console.log('');

  const fullModels = await redisGetModelBundle();
  if (fullModels) {
    console.log('  Loaded models:statistical + weights:server from Redis for UnifiedPredictor context.');
  } else {
    console.log('  No Redis models — NEW model runs with empty statistical context (honest cold start).');
  }
  console.log('');

  const allStationData = {};

  // ── Step A: IEM for full history (KSLC, KPVU, QSF — free, multi-year) ──
  const oldestDate = dates[dates.length - 1];
  console.log('  ── IEM (free, multi-year): SLC→KSLC, PVU→KPVU, SPK→QSF ──');
  const iemData = await fetchIEMData(oldestDate, endDate);
  for (const [stid, parsed] of Object.entries(iemData)) {
    if (!allStationData[stid]) allStationData[stid] = {};
    Object.assign(allStationData[stid], parsed);
  }
  console.log('');

  // ── Step B: Synoptic for recent data (all 5 stations, ~1 year) ──
  // Synoptic Open Access = 1 year limit. Adds FPS + UTALP which IEM doesn't have,
  // and overwrites IEM data for recent period with higher-quality Synoptic readings.
  console.log('  ── Synoptic (recent year): all 5 core stations ──');
  const stids = CORE_STATIONS.join(',');
  for (let i = 0; i < args.days; i += args.chunkDays) {
    const chunkEnd = new Date(endDate + 'T12:00:00Z');
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() - i);
    const chunkStart = new Date(chunkEnd);
    chunkStart.setUTCDate(chunkStart.getUTCDate() - Math.min(args.chunkDays, args.days - i) + 1);

    const startS = fmtSynoptic(chunkStart);
    const endS = fmtSynoptic(chunkEnd);
    const url =
      `https://api.synopticdata.com/v2/stations/timeseries?stid=${stids}` +
      `&start=${startS}&end=${endS}` +
      `&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure,sea_level_pressure` +
      `&units=english&obtimezone=local&token=${token}`;

    process.stdout.write(`  Synoptic: ${chunkStart.toISOString().slice(0, 10)} … ${chunkEnd.toISOString().slice(0, 10)} …`);

    try {
      const data = await fetchJSON(url);
      if (data.STATION) {
        for (const station of data.STATION) {
          const stid = station.STID;
          const parsed = parseStationData(station);
          if (!allStationData[stid]) allStationData[stid] = {};
          // Synoptic overwrites IEM for overlapping dates (Synoptic has all 5 stations)
          Object.assign(allStationData[stid], parsed);
        }
      }
      console.log(` OK (${data.STATION?.length || 0} stns)`);
    } catch (e) {
      console.log(` ERROR ${e.message}`);
    }
    await sleep(250);
  }

  // Report coverage
  console.log('');
  for (const stid of CORE_STATIONS) {
    const dates_count = allStationData[stid] ? Object.keys(allStationData[stid]).length : 0;
    const source = iemData[stid] ? 'IEM+Synoptic' : 'Synoptic only';
    console.log(`  ${stid}: ${dates_count} dates (${source})`);
  }
  console.log('');

  let pwsHourly = null;
  if (args.groundTruth === 'pws') {
    const ak = process.env.AMBIENT_API_KEY || process.env.VITE_AMBIENT_API_KEY;
    const apk = process.env.AMBIENT_APP_KEY || process.env.VITE_AMBIENT_APP_KEY;
    if (!ak || !apk) {
      console.error('--ground-truth=pws requires AMBIENT_API_KEY (or VITE_AMBIENT_API_KEY) and AMBIENT_APP_KEY (or VITE_AMBIENT_APP_KEY) in .env');
      process.exit(1);
    }
    const mac = process.env.AMBIENT_DEVICE_MAC || DEFAULT_PWS_MAC;
    const minDateStr = dates[dates.length - 1];
    const maxDateStr = dates[0];
    console.log(`  Fetching Ambient PWS history (${mac})  ${minDateStr} … ${maxDateStr}  (~1 req/s)…`);
    try {
      pwsHourly = await fetchAmbientPWSHourly({
        apiKey: ak,
        appKey: apk,
        mac,
        minDateStr,
        maxDateStr,
      });
      console.log(`  PWS: ${Object.keys(pwsHourly).length} dates with ≥1 hour in range.`);
    } catch (e) {
      console.error('Ambient PWS fetch failed:', e.message);
      process.exit(1);
    }
    console.log('');
  }

  // ─── Three-variant loop ───────────────────────────────────────────
  // OLD  = legacy 3-step (FPS-based heuristic)
  // NEW  = UnifiedPredictor WITH PWS fed in (how prod works live)
  // FAIR = UnifiedPredictor WITHOUT PWS input (honest forecast test)
  const oldRows = [];
  const newRows = [];
  const fairRows = [];

  function runUnified(label, liveStations, dm, hour, date, ref) {
    const baseCtx = fullModels ? trimModelContextForMonth(fullModels, dm) : {};
    const modelContext = { ...baseCtx, currentHour: hour, currentMonth: dm };
    try {
      const unified = unifiedPredict(args.lake, 'kiting', liveStations, modelContext, config, { referenceDate: ref });
      const prob = unified.thermalPrediction?.probability ?? unified.activities?.kiting?.score ?? 0;
      const positive =
        unified.activities?.kiting?.status === 'go' ||
        (unified.activities?.kiting?.score >= 55 && unified.decision !== 'PASS');
      return {
        predPositive: positive,
        prob: typeof prob === 'number' ? prob : 50,
        expSpeed: unified.wind?.expected?.speed ?? unified.wind?.current?.speed,
        regime: unified.regime || 'unknown',
        decision: unified.decision || 'unknown',
        kitingScore: unified.activities?.kiting?.score ?? null,
        propPhase: unified.propagation?.phase || null,
      };
    } catch (e) {
      return { predPositive: false, prob: 0, expSpeed: null, regime: 'error', decision: 'error', kitingScore: null, propPhase: null, error: e.message };
    }
  }

  for (const date of dates) {
    for (let hour = args.kiteStart; hour <= args.kiteEnd; hour++) {
      const hourSnap = {};
      for (const stid of CORE_STATIONS) {
        const row = allStationData[stid]?.[date]?.[hour];
        if (row) hourSnap[stid] = row;
      }

      if (pwsHourly) {
        const prow = pwsHourly[date]?.[hour];
        if (prow?.speed != null) hourSnap.PWS = prow;
      }

      // Need at least one meso station to run the model (FPS for recent, QSF/KPVU for older)
      const hasMeso = (hourSnap.FPS?.speed != null) || (hourSnap.QSF?.speed != null) || (hourSnap.KPVU?.speed != null);
      if (!hasMeso) continue;
      if (args.groundTruth === 'pws' && (!hourSnap.PWS || hourSnap.PWS.speed == null)) continue;

      const actualSpeed = args.groundTruth === 'pws' ? hourSnap.PWS.speed : (hourSnap.FPS?.speed || 0);
      const actualKite = actualSpeed >= FOIL_MIN;
      const fpsSpeed = hourSnap.FPS?.speed || 0;

      const dm = monthIndexDenver(date);
      const ref = referenceDateForSample(date, hour);

      // OLD
      const hourData = {
        FPS: hourSnap.FPS,
        KSLC: hourSnap.KSLC || {},
        KPVU: hourSnap.KPVU || {},
        QSF: hourSnap.QSF || {},
        UTALP: hourSnap.UTALP || {},
      };
      const oldPred = simulatePredictionOld(hourData);
      oldRows.push({
        date, hour,
        predPositive: oldPred.predictedKiteable,
        prob: oldPred.probability,
        expSpeed: oldPred.expectedSpeed,
        actualKite, actualSpeed, fpsSpeed,
        windType: oldPred.windType,
      });

      // NEW (with PWS — how prod works)
      const liveWithPWS = buildLiveStations(hourSnap, config, { injectPWS: true });
      const newResult = runUnified('NEW', liveWithPWS, dm, hour, date, ref);
      newRows.push({ date, hour, ...newResult, actualKite, actualSpeed, fpsSpeed });

      // FAIR (no PWS input — honest meso-only forecast scored against PWS)
      const snapNoPWS = { ...hourSnap };
      delete snapNoPWS.PWS;
      const liveNoPWS = buildLiveStations(snapNoPWS, config, { injectPWS: false });
      const fairResult = runUnified('FAIR', liveNoPWS, dm, hour, date, ref);
      fairRows.push({ date, hour, ...fairResult, actualKite, actualSpeed, fpsSpeed });
    }
  }

  // ─── Metrics helpers ────────────────────────────────────────────

  function confusionStr(c) {
    return `TP=${c.tp} FP=${c.fp} TN=${c.tn} FN=${c.fn}`;
  }

  function detailedMetrics(name, rows) {
    const m = aggregateMetrics(name, rows);
    const c = m.confusion;
    const totalPositive = c.tp + c.fn;
    const totalNegative = c.tn + c.fp;
    const predPositive = c.tp + c.fp;
    const predNegative = c.tn + c.fn;
    return {
      ...m,
      totalPositive,
      totalNegative,
      predPositive,
      predNegative,
      specificity: totalNegative > 0 ? Math.round(c.tn / totalNegative * 1000) / 1000 : 0,
      npv: predNegative > 0 ? Math.round(c.tn / predNegative * 1000) / 1000 : 0,
    };
  }

  function monthlyBreakdown(rows) {
    const byMonth = {};
    for (const r of rows) {
      const mo = parseInt(r.date.split('-')[1], 10);
      if (!byMonth[mo]) byMonth[mo] = [];
      byMonth[mo].push(r);
    }
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    for (const [mo, mRows] of Object.entries(byMonth).sort((a, b) => a[0] - b[0])) {
      const m = aggregateMetrics(monthNames[mo], mRows);
      const kiteHours = mRows.filter(r => r.actualKite).length;
      result.push({
        month: monthNames[mo],
        samples: m.samples,
        kiteHours,
        accuracy: m.accuracy,
        precision: m.precision,
        recall: m.recall,
        brier: m.brier,
        speedMAE: m.avgSpeedMae,
      });
    }
    return result;
  }

  function hourlyBreakdown(rows) {
    const byHour = {};
    for (const r of rows) {
      if (!byHour[r.hour]) byHour[r.hour] = [];
      byHour[r.hour].push(r);
    }
    const result = [];
    for (const [h, hRows] of Object.entries(byHour).sort((a, b) => a[0] - b[0])) {
      const m = aggregateMetrics(`${h}:00`, hRows);
      const kiteHours = hRows.filter(r => r.actualKite).length;
      result.push({
        hour: `${h}:00`,
        samples: m.samples,
        kiteHours,
        accuracy: m.accuracy,
        precision: m.precision,
        recall: m.recall,
        brier: m.brier,
        speedMAE: m.avgSpeedMae,
      });
    }
    return result;
  }

  function regimeBreakdown(rows) {
    const byRegime = {};
    for (const r of rows) {
      const key = r.regime || 'unknown';
      if (!byRegime[key]) byRegime[key] = [];
      byRegime[key].push(r);
    }
    const result = [];
    for (const [regime, rRows] of Object.entries(byRegime).sort((a, b) => b[1].length - a[1].length)) {
      const m = aggregateMetrics(regime, rRows);
      const kiteHours = rRows.filter(r => r.actualKite).length;
      result.push({
        regime,
        samples: m.samples,
        kiteHours,
        accuracy: m.accuracy,
        precision: m.precision,
        recall: m.recall,
        speedMAE: m.avgSpeedMae,
      });
    }
    return result;
  }

  function speedErrorDistribution(rows) {
    const buckets = { '0-2': 0, '2-5': 0, '5-8': 0, '8-12': 0, '12+': 0 };
    let n = 0;
    for (const r of rows) {
      if (r.expSpeed == null || r.actualSpeed == null) continue;
      n++;
      const err = Math.abs(r.expSpeed - r.actualSpeed);
      if (err < 2) buckets['0-2']++;
      else if (err < 5) buckets['2-5']++;
      else if (err < 8) buckets['5-8']++;
      else if (err < 12) buckets['8-12']++;
      else buckets['12+']++;
    }
    const pct = {};
    for (const [k, v] of Object.entries(buckets)) pct[k] = n > 0 ? `${Math.round(v / n * 100)}%` : '—';
    return { total: n, ...pct };
  }

  function falseSamples(rows, type, limit = 8) {
    return rows
      .filter(r => type === 'fp' ? (r.predPositive && !r.actualKite) : (!r.predPositive && r.actualKite))
      .slice(0, limit)
      .map(r => ({
        date: r.date,
        hour: r.hour,
        PWS: Math.round((r.actualSpeed || 0) * 10) / 10,
        FPS: Math.round((r.fpsSpeed || 0) * 10) / 10,
        pred: Math.round((r.expSpeed || 0) * 10) / 10,
        prob: Math.round(r.prob),
        regime: r.regime || r.windType || '—',
      }));
  }

  function pwsVsFpsCorrelation(rows) {
    let same = 0, pwsUpFpsDown = 0, pwsDownFpsUp = 0, n = 0;
    for (const r of rows) {
      if (r.fpsSpeed == null || r.actualSpeed == null) continue;
      n++;
      const fpsKite = r.fpsSpeed >= FOIL_MIN;
      const pwsKite = r.actualSpeed >= FOIL_MIN;
      if (fpsKite === pwsKite) same++;
      else if (pwsKite && !fpsKite) pwsUpFpsDown++;
      else pwsDownFpsUp++;
    }
    return {
      total: n,
      agree: same,
      agreePct: n > 0 ? `${Math.round(same / n * 100)}%` : '—',
      pwsWindFpsCalm: pwsUpFpsDown,
      pwsCalmFpsWind: pwsDownFpsUp,
    };
  }

  // ─── PRINT RESULTS ─────────────────────────────────────────────

  const oldM = detailedMetrics('OLD (3-step)', oldRows);
  const newM = detailedMetrics('NEW (with PWS)', newRows);
  const fairM = detailedMetrics('FAIR (meso-only)', fairRows);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  DEEP COMPARISON — 365 Days, PWS Ground Truth at Zigzag');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // ── 1. HEADLINE METRICS ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  1. HEADLINE METRICS (all scored against PWS ≥ 10 mph)         │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Samples: ${oldM.samples} hours (${oldM.totalPositive} kiteable, ${oldM.totalNegative} not kiteable)`);
  console.log('');
  console.table([
    { model: oldM.name, accuracy: oldM.accuracy, precision: oldM.precision, recall: oldM.recall, f1: oldM.f1Approx, brier: oldM.brier, speedMAE: oldM.avgSpeedMae, specificity: oldM.specificity },
    { model: newM.name, accuracy: newM.accuracy, precision: newM.precision, recall: newM.recall, f1: newM.f1Approx, brier: newM.brier, speedMAE: newM.avgSpeedMae, specificity: newM.specificity },
    { model: fairM.name, accuracy: fairM.accuracy, precision: fairM.precision, recall: fairM.recall, f1: fairM.f1Approx, brier: fairM.brier, speedMAE: fairM.avgSpeedMae, specificity: fairM.specificity },
  ]);

  // ── 2. CONFUSION MATRICES ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  2. CONFUSION MATRICES                                         │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  for (const m of [oldM, newM, fairM]) {
    const c = m.confusion;
    console.log(`  ${m.name}:`);
    console.log(`                  Actual YES    Actual NO`);
    console.log(`    Pred YES        ${String(c.tp).padStart(5)}       ${String(c.fp).padStart(5)}`);
    console.log(`    Pred NO         ${String(c.fn).padStart(5)}       ${String(c.tn).padStart(5)}`);
    console.log(`    → Predicted GO: ${m.predPositive}  |  Predicted NO-GO: ${m.predNegative}`);
    console.log('');
  }

  // ── 3. DATA LEAKAGE CHECK ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  3. DATA LEAKAGE CHECK — Is NEW cheating?                      │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  NEW (with PWS): feeds PWS into UnifiedPredictor as ground truth input');
  console.log('  FAIR (meso-only): identical model but WITHOUT PWS in liveStations');
  console.log('');
  console.log(`  NEW  speed MAE: ${newM.avgSpeedMae ?? 'null'} ← ${newM.avgSpeedMae === 0 || newM.avgSpeedMae === null ? '⚠ LEAKAGE: model reads PWS then is scored against it' : 'OK'}`);
  console.log(`  FAIR speed MAE: ${fairM.avgSpeedMae ?? 'null'} ← honest meso-only forecast`);
  console.log(`  OLD  speed MAE: ${oldM.avgSpeedMae ?? 'null'} ← FPS-based estimate`);
  console.log('');
  const leakageDelta = Math.abs((newM.accuracy || 0) - (fairM.accuracy || 0));
  console.log(`  Accuracy gap (NEW vs FAIR): ${Math.round(leakageDelta * 1000) / 10}% — ${leakageDelta > 0.05 ? '⚠ significant leakage inflation' : leakageDelta > 0.02 ? '⚡ moderate leakage' : '✓ minimal leakage'}`);
  console.log('');

  // ── 4. PWS vs FPS CORRELATION ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  4. PWS vs FPS — Do they even agree?                           │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  const corr = pwsVsFpsCorrelation(oldRows);
  console.log(`  Hours compared: ${corr.total}`);
  console.log(`  Both agree (both ≥10 or both <10): ${corr.agree} (${corr.agreePct})`);
  console.log(`  PWS ≥10 but FPS <10 (PWS has wind, FPS doesn't): ${corr.pwsWindFpsCalm}`);
  console.log(`  FPS ≥10 but PWS <10 (FPS has wind, PWS doesn't): ${corr.pwsCalmFpsWind}`);
  console.log('');
  if (corr.pwsWindFpsCalm > corr.pwsCalmFpsWind) {
    console.log('  → PWS sees more kite events than FPS. FPS underreports Zigzag conditions.');
  } else {
    console.log('  → FPS sees more wind events than PWS. Wind at FPS doesn\'t always reach Zigzag.');
  }
  console.log('');

  // ── 5. MONTHLY BREAKDOWN (FAIR only — the honest test) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  5. MONTHLY BREAKDOWN — FAIR model (meso-only, scored vs PWS)  │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.table(monthlyBreakdown(fairRows));

  // ── 6. HOURLY BREAKDOWN (FAIR) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  6. HOURLY BREAKDOWN — FAIR model (by time of day)             │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.table(hourlyBreakdown(fairRows));

  // ── 7. REGIME BREAKDOWN (FAIR) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  7. REGIME BREAKDOWN — FAIR model (what wind type?)            │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.table(regimeBreakdown(fairRows));

  // ── 8. SPEED ERROR DISTRIBUTION (FAIR) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  8. SPEED ERROR DISTRIBUTION — FAIR model                      │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  |predicted - PWS| in mph:');
  console.table([speedErrorDistribution(fairRows)]);

  // ── 9. FALSE POSITIVE EXAMPLES (FAIR) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  9. SAMPLE FALSE POSITIVES — FAIR said GO but PWS < 10        │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  const fps = falseSamples(fairRows, 'fp');
  if (fps.length) console.table(fps);
  else console.log('  None!');

  // ── 10. FALSE NEGATIVE EXAMPLES (FAIR) ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  10. SAMPLE FALSE NEGATIVES — FAIR said NO-GO but PWS ≥ 10    │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  const fns = falseSamples(fairRows, 'fn');
  if (fns.length) console.table(fns);
  else console.log('  None!');

  // ── 11. SPEED ERROR: FAIR vs OLD side by side ──
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  11. SPEED ERROR DISTRIBUTION — OLD vs FAIR                    │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.table([
    { model: 'OLD', ...speedErrorDistribution(oldRows) },
    { model: 'FAIR', ...speedErrorDistribution(fairRows) },
  ]);

  // ── SUMMARY ──
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  FAIR = the number that matters. It tells you: using ONLY meso');
  console.log('  stations (FPS, KSLC, KPVU, QSF, UTALP), can the new model');
  console.log('  predict what your PWS will actually read at Zigzag?');
  console.log('');
  console.log(`  FAIR accuracy: ${fairM.accuracy}  |  recall: ${fairM.recall}  |  precision: ${fairM.precision}`);
  console.log(`  FAIR speed MAE: ${fairM.avgSpeedMae ?? 'null'} mph`);
  console.log(`  OLD  accuracy: ${oldM.accuracy}  |  recall: ${oldM.recall}  |  precision: ${oldM.precision}`);
  console.log(`  OLD  speed MAE: ${oldM.avgSpeedMae ?? 'null'} mph`);
  console.log('');
  if (fairM.accuracy > oldM.accuracy) {
    console.log('  ✓ FAIR beats OLD overall. UnifiedPredictor is better even without seeing PWS.');
  } else {
    console.log('  ⚠ OLD beats FAIR on raw accuracy. UnifiedPredictor needs tuning for meso-only.');
  }
  if (fairM.recall > oldM.recall) {
    console.log('  ✓ FAIR catches more real wind events than OLD.');
  }
  if (fairM.precision < 0.5) {
    console.log('  ⚠ FAIR precision < 50% — too many false alarms. Calibration needed.');
  }
  if (fairM.avgSpeedMae != null && fairM.avgSpeedMae > 5) {
    console.log('  ⚠ FAIR speed error > 5 mph — speed estimate needs work.');
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
