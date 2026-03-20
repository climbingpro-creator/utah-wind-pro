/**
 * GET /api/garmin?lake=utah-lake-zigzag&device_id=xxx
 *
 * Premium endpoint for Garmin Connect IQ watch app.
 * Fuses Synoptic + Ambient Weather (PWS) data with fishing,
 * boating, and activity intelligence.
 *
 * Freemium model:
 *   FREE  → wind speed, direction, temp, basic go/no-go
 *   PRO   → fishing intelligence, boating safety, arc gauges,
 *            multi-lake, alerts, full forecast
 */
import { getLakeConfig } from './lib/stations.js';
import { createClient } from '@supabase/supabase-js';

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

const FREE_LAKES = ['utah-lake-zigzag'];

const HOURLY_PROB = [0,0,0,0,0,0,5,10,20,35,50,65,75,80,80,70,55,40,25,10,5,0,0,0];
const MONTHLY_MULT = [.3,.4,.6,.8,1,1,.9,.95,.85,.65,.4,.3];

async function getDeviceTier(deviceId) {
  if (!deviceId || deviceId === 'unknown') return 'free';
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return 'free';
    const sb = createClient(url, key);
    const { data } = await sb.rpc('get_device_tier', { did: deviceId });
    return data || 'free';
  } catch { return 'free'; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const lakeId = req.query.lake || 'utah-lake-zigzag';
  const deviceId = req.query.device_id || 'unknown';
  const config = getLakeConfig(lakeId);
  if (!config) return res.status(400).json({ error: 'bad lake' });

  try {
    const tier = await getDeviceTier(deviceId);
    const isPro = tier === 'pro';

    // Free users can only query the default lake
    if (!isPro && !FREE_LAKES.includes(lakeId)) {
      return res.status(200).json({
        error: null,
        pro: false,
        msg: 'PRO required for this lake',
        l: SHORT_NAMES[lakeId] || lakeId,
      });
    }

    const token = process.env.SYNOPTIC_TOKEN;

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

    // Thermal probability
    let thermPr = Math.round(HOURLY_PROB[hour] * MONTHLY_MULT[month]);
    if (speed >= 8 && dir >= 140 && dir <= 220) thermPr = Math.max(thermPr, 75);
    else if (speed >= 8) thermPr = Math.max(thermPr, 50);

    // Glass probability
    let glassPr = speed < 2 ? 90 : speed < 4 ? 65 : speed < 6 ? 35 : 10;
    if (gust >= 8) glassPr = Math.min(glassPr, 20);
    if (hour < 8 || hour > 19) glassPr = Math.min(100, glassPr + 15);

    // Gradient
    const slcP = slc.pressure || 0;
    const pvuP = provo.pressure || 0;
    const gradient = slcP && pvuP ? round1(slcP - pvuP) : null;

    // Wind type
    const windType = (dir >= 140 && dir <= 220) ? 'thermal'
      : ((dir >= 315 || dir <= 45) ? 'north' : 'gradient');

    // ETA
    const peakHour = 14;
    const etaStr = (hour >= 8 && hour < peakHour && windType !== 'thermal')
      ? `${peakHour - 12} PM` : null;

    // Activity scores
    const kiteScore = clamp(
      speed >= 12 && speed <= 25 ? 80 + (gust - speed < 10 ? 20 : 0) :
      speed >= 8 ? 50 : speed > 25 ? 30 : 10);
    const sailScore = clamp(
      speed >= 6 && speed <= 20 ? 85 : speed >= 4 ? 60 : 30);
    const paraScore = clamp(
      speed >= 5 && speed <= 15 && gust < 20 ? 80 + (dir >= 140 && dir <= 220 ? 15 : 0) :
      speed < 5 ? 40 : 15);

    // ── Base response (FREE tier) ──────────────────────
    const body = {
      s:   round1(speed),
      g:   round1(gust),
      d:   Math.round(dir),
      dn:  CARDINAL[Math.round(dir / 22.5) % 16] || '--',
      t:   temp != null ? Math.round(temp) : null,
      w:   windType,
      src: src,
      l:   SHORT_NAMES[lakeId] || lakeId,
      ts:  Math.floor(Date.now() / 1000),
      pro: isPro,
      ak:  kiteScore,
      as:  sailScore,
      ap:  paraScore,
    };

    // ── PRO-only fields ────────────────────────────────
    if (isPro) {
      body.h   = hum != null ? Math.round(hum) : null;
      body.bp  = pres != null ? round1(pres) : null;
      body.gr  = gradient;
      body.p   = thermPr;
      body.gl  = glassPr;
      body.eta = etaStr;
      body.af  = glassPr;

      // Fishing intelligence
      const moonPhase = getMoonPhase(now);
      const moonNames = ['New','Wax Cres','1st Qtr','Wax Gib','Full','Wan Gib','3rd Qtr','Wan Cres'];
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

      const bestFishHour = (month >= 4 && month <= 8) ? 6 : 7;
      const bestFishEnd = (month >= 4 && month <= 8) ? 9 : 10;
      const bestFishEvening = (month >= 4 && month <= 8) ? 18 : 17;
      const bestFishEveEnd = (month >= 4 && month <= 8) ? 21 : 19;

      let baroTrend = 'steady';
      if (gradient !== null) {
        if (gradient > 0.03) baroTrend = 'falling';
        else if (gradient < -0.03) baroTrend = 'rising';
      }

      body.br  = biteRating;
      body.mn  = moonPhase;
      body.mns = moonNames[moonPhase];
      body.fam = `${fmtHour(bestFishHour)}-${fmtHour(bestFishEnd)}`;
      body.fpm = `${fmtHour(bestFishEvening)}-${fmtHour(bestFishEveEnd)}`;
      body.bt  = baroTrend;

      // Boating intelligence
      let waveEst = speed < 5 ? 0 : speed < 10 ? 0.5 : speed < 15 ? 1.0 :
        speed < 20 ? 2.0 : speed < 25 ? 3.0 : 4.0;

      let boatSafety = 100;
      if (speed >= 25) boatSafety = 10;
      else if (speed >= 20) boatSafety = 25;
      else if (speed >= 15) boatSafety = 45;
      else if (gust >= 20) boatSafety = 35;
      else if (speed >= 10) boatSafety = 65;
      else if (speed >= 6) boatSafety = 80;
      if (gust - speed > 12) boatSafety = Math.min(boatSafety, 30);

      const advisory = speed >= 25 ? 'DANGER' : speed >= 18 || gust >= 25 ? 'WARNING' :
        speed >= 12 || gust >= 18 ? 'CAUTION' : 'CLEAR';

      body.wv  = round1(waveEst);
      body.bs  = boatSafety;
      body.ab  = clamp(Math.round(boatSafety * 0.6 + (100 - speed * 4) * 0.4));
      body.adv = advisory;

      // Alerts bitmask
      let alerts = 0;
      if (thermPr >= 70) alerts |= 1;
      if (glassPr >= 80) alerts |= 2;
      if (speed >= 20 || gust >= 25) alerts |= 4;
      if (biteRating >= 70) alerts |= 8;
      body.al = alerts;
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(body));
  } catch (err) {
    console.error('[garmin]', err.message);
    return res.status(502).json({ error: 'Upstream data unavailable' });
  }
}

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
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
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
