/**
 * GET /api/garmin?lake=utah-lake-zigzag&device_id=xxx
 *
 * Rich endpoint for Garmin Connect IQ watch app.
 * Fuses Synoptic + Ambient Weather (PWS) data.
 * Returns ~500-800 bytes — well within Garmin's memory limits.
 *
 * Response keys kept short to save bytes on the wire.
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

    // Use PWS as primary source when available, fall back to Synoptic
    const speed = pws?.speed ?? primary.speed ?? 0;
    const gust  = pws?.gust ?? primary.gust ?? 0;
    const dir   = pws?.dir ?? primary.dir ?? 0;
    const temp  = pws?.temp ?? primary.temp;
    const hum   = pws?.humidity ?? null;
    const pres  = pws?.pressure ?? primary.pressure;
    const src   = pws ? 'PWS' : (primary.speed != null ? config.primary : '??');

    const hour = new Date().getHours();
    const month = new Date().getMonth();

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

    // ETA to next thermal shift
    const peakHour = 14; // 2 PM typical peak
    const etaStr = (hour >= 8 && hour < peakHour && windType !== 'thermal')
      ? `${peakHour - 12} PM` : null;

    // Activity go/no-go scores (0-100)
    const kiteScore  = Math.min(100, Math.max(0,
      speed >= 12 && speed <= 25 ? 80 + Math.min(20, (gust - speed < 10 ? 20 : 0)) :
      speed >= 8 ? 50 : speed >= 25 ? 30 : 10));
    const sailScore  = Math.min(100, Math.max(0,
      speed >= 6 && speed <= 20 ? 85 : speed >= 4 ? 60 : speed < 4 ? 30 : 20));
    const paraScore  = Math.min(100, Math.max(0,
      speed >= 5 && speed <= 15 && gust < 20 ? 80 + (dir >= 140 && dir <= 220 ? 15 : 0) :
      speed < 5 ? 40 : 15));
    const fishScore  = glassPr;

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
      // Activity scores
      ak:  kiteScore,
      as:  sailScore,
      ap:  paraScore,
      af:  fishScore,
    };

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(body));
  } catch (err) {
    console.error('[garmin]', err.message);
    return res.status(502).json({ error: err.message });
  }
}

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
