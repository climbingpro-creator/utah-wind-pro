/**
 * GET /api/garmin?lake=utah-lake-zigzag&device_id=xxx
 *
 * Premium endpoint for Garmin Connect IQ watch app.
 * Fuses Synoptic + Ambient Weather (PWS) data with fishing,
 * boating, and activity intelligence.
 */
import { getLakeConfig } from './lib/stations.js';

const CARDINAL = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                   'S','SSW','SW','WSW','W','WNW','NW','NNW'];

const SHORT_NAMES = {
  'utah-lake-zigzag': 'Zigzag',
  'utah-lake-lincoln': 'Lincoln',
  'utah-lake-sandy': 'Sandy',
  'utah-lake-vineyard': 'Vineyard',
  'utah-lake-mm19': 'MM19',
  'deer-creek': 'DeerCrk',
  'willard-bay': 'Willard',
};

const HOURLY_PROB = [0,0,0,0,0,0,5,10,20,35,50,65,75,80,80,70,55,40,25,10,5,0,0,0];
const MONTHLY_MULT = [.3,.4,.6,.8,1,1,.9,.95,.85,.65,.4,.3];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const lakeId = req.query.lake || 'utah-lake-zigzag';
  const config = getLakeConfig(lakeId);
  if (!config) return res.status(400).json({ error: 'bad lake' });

  try {
    const token = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;

    const [synRaw, ambientData] = await Promise.all([
      fetchSynoptic(token, config),
      config.hasAmbient ? fetchAmbient() : Promise.resolve(null),
    ]);

    const primary = findPrimary(synRaw, config.primary);
    const slc = findStation(synRaw, 'KSLC');
    const provo = findStation(synRaw, 'KPVU');
    const pws = normalizeAmbient(ambientData);

    const speed = pws?.speed ?? primary.speed ?? 0;
    const gust  = pws?.gust ?? primary.gust ?? 0;
    const dir   = pws?.dir ?? primary.dir ?? 0;
    const temp  = pws?.temp ?? primary.temp;
    const hum   = pws?.humidity ?? null;
    const pres  = pws?.pressure ?? primary.pressure;
    const src   = pws ? 'PWS' : (primary.speed != null ? config.primary : '??');

    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    // ── Thermal probability ────────────────────────────
    let thermPr = Math.round(HOURLY_PROB[hour] * MONTHLY_MULT[month]);
    if (speed >= 8 && dir >= 140 && dir <= 220) thermPr = Math.max(thermPr, 75);
    else if (speed >= 8) thermPr = Math.max(thermPr, 50);

    // ── Glass probability ──────────────────────────────
    let glassPr = speed < 2 ? 90 : speed < 4 ? 65 : speed < 6 ? 35 : 10;
    if (gust >= 8) glassPr = Math.min(glassPr, 20);
    if (hour < 8 || hour > 19) glassPr = Math.min(100, glassPr + 15);

    // ── Gradient ───────────────────────────────────────
    const slcP = slc.pressure || 0;
    const pvuP = provo.pressure || 0;
    const gradient = slcP && pvuP ? round1(slcP - pvuP) : null;

    // ── Wind type ──────────────────────────────────────
    const windType = (dir >= 140 && dir <= 220) ? 'thermal'
      : ((dir >= 315 || dir <= 45) ? 'north' : 'gradient');

    // ── ETA ────────────────────────────────────────────
    const peakHour = 14;
    const etaStr = (hour >= 8 && hour < peakHour && windType !== 'thermal')
      ? `${peakHour - 12} PM` : null;

    // ── Activity scores (0-100) ────────────────────────
    const kiteScore  = clamp(
      speed >= 12 && speed <= 25 ? 80 + (gust - speed < 10 ? 20 : 0) :
      speed >= 8 ? 50 : speed > 25 ? 30 : 10);
    const sailScore  = clamp(
      speed >= 6 && speed <= 20 ? 85 : speed >= 4 ? 60 : 30);
    const paraScore  = clamp(
      speed >= 5 && speed <= 15 && gust < 20 ? 80 + (dir >= 140 && dir <= 220 ? 15 : 0) :
      speed < 5 ? 40 : 15);

    // ── Moon phase (0-7) ───────────────────────────────
    const moonPhase = getMoonPhase(now);
    const moonNames = ['New','Wax Cres','1st Qtr','Wax Gib','Full','Wan Gib','3rd Qtr','Wan Cres'];

    // ── Fishing intelligence ───────────────────────────
    const isDawnDusk = (hour >= 5 && hour <= 7) || (hour >= 18 && hour <= 20);
    const isMajorFeed = (moonPhase === 0 || moonPhase === 4);
    const isMinorFeed = (moonPhase === 2 || moonPhase === 6);
    let biteRating = glassPr * 0.4;
    if (isDawnDusk) biteRating += 25;
    if (isMajorFeed) biteRating += 20;
    else if (isMinorFeed) biteRating += 10;
    if (pres != null && pres >= 29.8 && pres <= 30.2) biteRating += 10;
    if (speed < 8) biteRating += 5;
    biteRating = clamp(Math.round(biteRating));

    // Best fishing window today
    const bestFishHour = (month >= 4 && month <= 8) ? 6 : 7;
    const bestFishEnd = (month >= 4 && month <= 8) ? 9 : 10;
    const bestFishEvening = (month >= 4 && month <= 8) ? 18 : 17;
    const bestFishEveEnd = (month >= 4 && month <= 8) ? 21 : 19;
    const fishWindowAM = `${fmtHour(bestFishHour)}-${fmtHour(bestFishEnd)}`;
    const fishWindowPM = `${fmtHour(bestFishEvening)}-${fmtHour(bestFishEveEnd)}`;

    // Barometric trend indicator
    let baroTrend = 'steady';
    if (gradient !== null) {
      if (gradient > 0.03) baroTrend = 'falling';
      else if (gradient < -0.03) baroTrend = 'rising';
    }

    // ── Boating intelligence ───────────────────────────
    // Wave estimate (simplified for Utah lakes — fetch-limited)
    let waveEst = 0;
    if (speed < 5) waveEst = 0;
    else if (speed < 10) waveEst = 0.5;
    else if (speed < 15) waveEst = 1.0;
    else if (speed < 20) waveEst = 2.0;
    else if (speed < 25) waveEst = 3.0;
    else waveEst = 4.0;

    // Safety level (100 = safe, 0 = danger)
    let boatSafety = 100;
    if (speed >= 25) boatSafety = 10;
    else if (speed >= 20) boatSafety = 25;
    else if (speed >= 15) boatSafety = 45;
    else if (gust >= 20) boatSafety = 35;
    else if (speed >= 10) boatSafety = 65;
    else if (speed >= 6) boatSafety = 80;
    if (gust - speed > 12) boatSafety = Math.min(boatSafety, 30);

    // Boat score (good conditions for casual boating)
    const boatScore = clamp(Math.round(boatSafety * 0.6 + (100 - speed * 4) * 0.4));

    // Advisory level
    const advisory = speed >= 25 ? 'DANGER' : speed >= 18 || gust >= 25 ? 'WARNING' :
      speed >= 12 || gust >= 18 ? 'CAUTION' : 'CLEAR';

    // ── Alert flags ────────────────────────────────────
    let alerts = 0;
    if (thermPr >= 70) alerts |= 1;          // bit 0: thermal active
    if (glassPr >= 80) alerts |= 2;          // bit 1: glass conditions
    if (speed >= 20 || gust >= 25) alerts |= 4; // bit 2: high wind danger
    if (biteRating >= 70) alerts |= 8;       // bit 3: prime fishing

    const body = {
      s:   round1(speed),
      g:   round1(gust),
      d:   Math.round(dir),
      dn:  CARDINAL[Math.round(dir / 22.5) % 16] || '--',
      t:   temp != null ? Math.round(temp) : null,
      h:   hum != null ? Math.round(hum) : null,
      bp:  pres != null ? round1(pres) : null,
      gr:  gradient,
      p:   thermPr,
      gl:  glassPr,
      w:   windType,
      eta: etaStr,
      src: src,
      l:   SHORT_NAMES[lakeId] || lakeId,
      ts:  Math.floor(Date.now() / 1000),
      ak:  kiteScore,
      as:  sailScore,
      ap:  paraScore,
      af:  glassPr,
      // Fishing
      br:  biteRating,
      mn:  moonPhase,
      mns: moonNames[moonPhase],
      fam: fishWindowAM,
      fpm: fishWindowPM,
      bt:  baroTrend,
      // Boating
      wv:  round1(waveEst),
      bs:  boatSafety,
      ab:  boatScore,
      adv: advisory,
      // Alerts bitmask
      al:  alerts,
    };

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(body));
  } catch (err) {
    console.error('[garmin]', err.message);
    return res.status(502).json({ error: err.message });
  }
}

// ── Moon phase calculation (simplified lunation) ────────
function getMoonPhase(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let c = 0, e = 0;
  if (month < 3) { c = year - 1; e = month + 12; } else { c = year; e = month; }
  const jd = Math.floor(365.25 * (c + 4716)) + Math.floor(30.6001 * (e + 1)) + day - 1524.5;
  const daysSinceNew = jd - 2451549.5;
  const newMoons = daysSinceNew / 29.53059;
  const frac = newMoons - Math.floor(newMoons);
  return Math.round(frac * 8) % 8;
}

function fmtHour(h) {
  if (h === 0) return '12a';
  if (h < 12) return h + 'a';
  if (h === 12) return '12p';
  return (h - 12) + 'p';
}

function clamp(v) { return Math.min(100, Math.max(0, v)); }

async function fetchSynoptic(token, config) {
  if (!token) throw new Error('SYNOPTIC_TOKEN not set');
  const params = new URLSearchParams({
    token,
    stid: config.synoptic.slice(0, 5).join(','),
    vars: 'wind_speed,wind_direction,wind_gust,air_temp,altimeter',
    units: 'english',
  });
  const resp = await fetch(`https://api.synopticdata.com/v2/stations/latest?${params}`);
  if (!resp.ok) throw new Error(`Synoptic ${resp.status}`);
  return resp.json();
}

async function fetchAmbient() {
  const apiKey = process.env.AMBIENT_API_KEY || process.env.VITE_AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY || process.env.VITE_AMBIENT_APP_KEY;
  if (!apiKey || !appKey) return null;
  try {
    const resp = await fetch(
      `https://rt.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`
    );
    if (!resp.ok) { console.error('[garmin] Ambient', resp.status); return null; }
    return resp.json();
  } catch (err) { console.error('[garmin] Ambient fetch:', err.message); return null; }
}

function normalizeAmbient(devices) {
  if (!Array.isArray(devices) || !devices.length) return null;
  const d = devices[0]?.lastData;
  if (!d) return null;
  return {
    speed: d.windspeedmph ?? null,
    gust: d.windgustmph ?? null,
    dir: d.winddir ?? null,
    temp: d.tempf ?? null,
    humidity: d.humidity ?? null,
    pressure: d.baromrelin ?? null,
  };
}

function findPrimary(data, stid) {
  return findStation(data, stid) || findStation(data, (data?.STATION || [])[0]?.STID);
}

function findStation(data, stid) {
  const s = (data?.STATION || []).find(st => st.STID === stid);
  if (!s) return {};
  const o = s.OBSERVATIONS || {};
  return {
    speed: o.wind_speed_value_1?.value ?? null,
    gust: o.wind_gust_value_1?.value ?? null,
    dir: o.wind_direction_value_1?.value ?? null,
    temp: o.air_temp_value_1?.value ?? null,
    pressure: o.altimeter_value_1?.value ?? null,
  };
}

function round1(v) { return v != null ? Math.round(v * 10) / 10 : null; }
