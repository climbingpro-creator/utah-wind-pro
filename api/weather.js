/**
 * Vercel Serverless Function — API proxy for weather data
 * Keeps API keys on the server, never exposed to the client.
 * 
 * Routes:
 *   GET /api/weather?source=ambient
 *   GET /api/weather?source=synoptic&stids=FPS,KSLC,...
 *   GET /api/weather?source=synoptic-history&stids=FPS,KSLC,...&hours=3
 *   GET /api/weather?source=water-temp&slug=utah-lake
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { source, stids, hours, slug } = req.query;

  try {
    if (source === 'ambient') {
      return await handleAmbient(res);
    } else if (source === 'synoptic') {
      return await handleSynopticLatest(res, stids);
    } else if (source === 'synoptic-history') {
      return await handleSynopticHistory(res, stids, hours);
    } else if (source === 'water-temp') {
      return await handleWaterTemp(res, slug);
    } else {
      return res.status(400).json({ error: 'Invalid source. Use: ambient, synoptic, synoptic-history, water-temp' });
    }
  } catch (error) {
    console.error(`[API Proxy] ${source} error:`, error.message);
    return res.status(502).json({
      error: 'Upstream API error',
      message: error.message,
      source,
    });
  }
}

async function handleAmbient(res) {
  const apiKey = process.env.VITE_AMBIENT_API_KEY;
  const appKey = process.env.VITE_AMBIENT_APP_KEY;

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
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json(data);
}

async function handleSynopticLatest(res, stids) {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }

  const token = process.env.VITE_SYNOPTIC_TOKEN;
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
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}

async function handleSynopticHistory(res, stids, hours = '3') {
  if (!stids) {
    return res.status(400).json({ error: 'stids parameter required' });
  }

  const token = process.env.VITE_SYNOPTIC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Synoptic API token not configured' });
  }

  const end = new Date();
  const start = new Date(end.getTime() - parseInt(hours) * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];

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
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(200).json(data);
}

const VALID_SLUGS = new Set([
  'utah-lake', 'deer-creek-reservoir', 'jordanelle-reservoir',
  'strawberry-reservoir', 'willard-bay-reservoir', 'flaming-gorge-reservoir',
  'pineview-reservoir',
]);

async function handleWaterTemp(res, slug) {
  if (!slug || !VALID_SLUGS.has(slug)) {
    return res.status(400).json({ error: 'Invalid or missing slug parameter' });
  }

  const url = `https://seatemperature.net/lakes/water-temp-in-${slug}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'UtahWindPro/1.0 (water-temp-check)' },
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
  }

  const html = await response.text();

  let tempF = null;
  const m = html.match(/today is\s+(\d+)\s*°F/i);
  if (m) tempF = parseInt(m[1], 10);

  if (tempF == null || tempF < 20 || tempF > 100) {
    return res.status(502).json({ error: 'Could not parse water temperature from source' });
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({
    slug,
    tempF,
    tempC: +((tempF - 32) * 5 / 9).toFixed(1),
    source: 'seatemperature.net (NOAA/Copernicus satellite)',
    fetchedAt: new Date().toISOString(),
  });
}
