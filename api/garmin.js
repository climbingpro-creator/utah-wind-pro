/**
 * GET /api/garmin?lake=utah-lake-zigzag&device_id=xxx
 *
 * Ultra-lean endpoint for Garmin Connect IQ data fields.
 * Returns < 200 bytes of JSON — well within the ~4KB response
 * limit that won't blow up a Fenix 7's memory.
 *
 * Response shape (single-letter keys to save bytes):
 * {
 *   "s":  12.3,       // wind speed (mph)
 *   "g":  15.1,       // gust (mph)
 *   "d":  180,        // direction (degrees)
 *   "dn": "S",        // direction cardinal
 *   "t":  72,         // temp (°F)
 *   "p":  65,         // thermal probability (0-100)
 *   "gl": 30,         // glass probability (0-100)
 *   "w":  "thermal",  // wind type
 *   "eta": "2 PM",    // next shift ETA (pro only, null if free)
 *   "l":  "Zigzag",   // lake short name
 *   "ts": 1710000000  // unix timestamp (seconds)
 * }
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
    const token = process.env.VITE_SYNOPTIC_TOKEN || process.env.SYNOPTIC_TOKEN;
    const params = new URLSearchParams({
      token,
      stid: config.synoptic.slice(0, 5).join(','),
      vars: 'wind_speed,wind_direction,wind_gust,air_temp,altimeter',
      units: 'english',
    });

    const resp = await fetch(
      `https://api.synopticdata.com/v2/stations/latest?${params}`
    );
    if (!resp.ok) throw new Error(`Synoptic ${resp.status}`);
    const raw = await resp.json();

    const primary = findPrimary(raw, config.primary);
    const slc = findStation(raw, 'KSLC');
    const provo = findStation(raw, 'KPVU');

    const speed = primary.speed ?? 0;
    const gust = primary.gust ?? 0;
    const dir = primary.dir ?? 0;
    const temp = primary.temp;

    // Thermal probability (simplified)
    const hour = new Date().getHours();
    const month = new Date().getMonth();
    let prob = Math.round(HOURLY_PROB[hour] * MONTHLY_MULT[month]);
    if (speed >= 8) prob = Math.max(prob, 70);

    // Glass probability
    const isCalm = speed < 4 && gust < 6;
    let glassPr = isCalm ? 65 : speed < 2 ? 90 : speed < 6 ? 35 : 10;
    if (hour < 8 || hour > 19) glassPr = Math.min(100, glassPr + 15);

    // Gradient → wind type
    const delta = (slc.pressure || 0) - (provo.pressure || 0);
    const windType = (dir >= 140 && dir <= 220) ? 'thermal'
      : ((dir >= 315 || dir <= 45) ? 'north' : 'gradient');

    // ETA to next shift (simplified: peak thermal hour)
    const peakHour = HOURLY_PROB.indexOf(Math.max(...HOURLY_PROB));
    const etaStr = hour < peakHour
      ? `${peakHour > 12 ? peakHour - 12 : peakHour} ${peakHour >= 12 ? 'PM' : 'AM'}`
      : null;

    const body = {
      s:  round1(speed),
      g:  round1(gust),
      d:  Math.round(dir),
      dn: CARDINAL[Math.round(dir / 22.5) % 16] || '--',
      t:  temp != null ? Math.round(temp) : null,
      p:  prob,
      gl: glassPr,
      w:  windType,
      eta: etaStr,
      l:  SHORT_NAMES[lakeId] || lakeId,
      ts: Math.floor(Date.now() / 1000),
    };

    // Keep response tiny — Garmin will thank us
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(body));
  } catch (err) {
    console.error('[garmin]', err.message);
    return res.status(502).json({ error: err.message });
  }
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
