/**
 * Vercel Serverless Function — API proxy for weather data
 * Keeps API keys on the server, never exposed to the client.
 * 
 * Routes:
 *   GET /api/weather?source=ambient
 *   GET /api/weather?source=synoptic&stids=FPS,KSLC,...
 *   GET /api/weather?source=synoptic-history&stids=FPS,KSLC,...&hours=3
 *   (water-temp route removed — lakes use client-side seasonal model)
 */

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 120;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    if (rateLimitMap.size > 1000) {
      for (const [k, v] of rateLimitMap) {
        if (now - v.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(k);
      }
    }
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded. Max 120 requests per minute.' });
  }

  const { source, stids, hours } = req.query;

  try {
    if (source === 'ambient') {
      return await handleAmbient(res);
    } else if (source === 'ambient-history') {
      return await handleAmbientHistory(res, req.query);
    } else if (source === 'synoptic') {
      return await handleSynopticLatest(res, stids);
    } else if (source === 'synoptic-history') {
      return await handleSynopticHistory(res, stids, hours);
    } else {
      return res.status(400).json({ error: 'Invalid source. Use: ambient, ambient-history, synoptic, synoptic-history' });
    }
  } catch (error) {
    console.error(`[API Proxy] ${source} error:`, error.message);
    return res.status(502).json({
      error: 'Upstream API error',
      source,
    });
  }
}

async function handleAmbientHistory(res, query) {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;
  if (!apiKey || !appKey) {
    return res.status(500).json({ error: 'Ambient Weather API keys not configured' });
  }

  const macAddress = '48:3F:DA:54:2C:6E';
  const limit = Math.min(parseInt(query.limit) || 288, 288);
  const params = new URLSearchParams({
    apiKey,
    applicationKey: appKey,
    limit: String(limit),
  });

  // Optional: fetch a specific date range using endDate param
  if (query.endDate) {
    params.set('endDate', query.endDate);
  }

  const url = `https://api.ambientweather.net/v1/devices/${macAddress}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({ error: 'Rate limited by Ambient Weather' });
    }
    return res.status(status).json({ error: `Ambient API returned ${status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}

async function handleAmbient(res) {
  const apiKey = process.env.AMBIENT_API_KEY;
  const appKey = process.env.AMBIENT_APP_KEY;

  if (!apiKey || !appKey) {
    return res.status(500).json({ error: 'Ambient Weather API keys not configured' });
  }

  const url = `https://rt.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({ error: 'Rate limited by Ambient Weather' });
    }
    return res.status(status).json({ error: `Ambient API returned ${status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  return res.status(200).json(data);
}

const ALLOWED_STATIONS = new Set([
  'KSLC','KPVU','KHCR','KOGD','KLGU','KHIF','KVEL','KPUC','KSGU','KPGA','KCDC',
  'KFGR','KBMC','BERU1','FPS','QSF','SND','UTALP','UTOLY','CSC','UID28','TIMU1','MDAU1',
  'UTPCY','DCC','UTCOP','UTDAN','DSTU1','RVZU1','CCPUT','UWCU1','SKY','UTESU','UTMPK',
  'UR328','BLPU1','OGP',
  'QLN','GSLM','EPMU1','UTHTP','COOPOGNU1','PC496',
]);

async function handleSynopticLatest(res, stids) {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }
  const requested = stids.split(',').map(s => s.trim());
  const filtered = requested.filter(s => ALLOWED_STATIONS.has(s));
  if (filtered.length === 0) {
    return res.status(400).json({ error: 'No valid station IDs provided' });
  }
  stids = filtered.join(',');

  const token = process.env.SYNOPTIC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Synoptic API token not configured' });
  }

  const params = new URLSearchParams({
    token,
    stid: stids,
    vars: 'air_temp,relative_humidity,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
    units: 'english',
  });

  const url = `https://api.synopticdata.com/v2/stations/latest?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    return res.status(response.status).json({ error: `Synoptic API returned ${response.status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  return res.status(200).json(data);
}

async function handleSynopticHistory(res, stids, hours = '3') {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }
  const requested = stids.split(',').map(s => s.trim());
  const filtered = requested.filter(s => ALLOWED_STATIONS.has(s));
  if (filtered.length === 0) {
    return res.status(400).json({ error: 'No valid station IDs provided' });
  }
  stids = filtered.join(',');
  hours = String(Math.min(parseInt(hours) || 3, 24));

  const token = process.env.SYNOPTIC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Synoptic API token not configured' });
  }

  const end = new Date();
  const start = new Date(end.getTime() - parseInt(hours) * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:T]/g, '').slice(0, 12);

  const params = new URLSearchParams({
    token,
    stid: stids,
    start: fmt(start),
    end: fmt(end),
    vars: 'wind_speed,wind_direction,wind_gust,air_temp',
    units: 'english',
  });

  const url = `https://api.synopticdata.com/v2/stations/timeseries?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    return res.status(response.status).json({ error: `Synoptic API returned ${response.status}` });
  }

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}
