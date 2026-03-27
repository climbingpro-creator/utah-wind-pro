/**
 * Vercel Serverless Function — API proxy for weather data
 * Keeps API keys on the server, never exposed to the client.
 * 
 * Routes:
 *   GET /api/weather?source=ambient
 *   GET /api/weather?source=synoptic&stids=FPS,KSLC,...
 *   GET /api/weather?source=synoptic-history&stids=FPS,KSLC,...&hours=3
 *   GET /api/weather?source=wu-nearby&lat=40.35&lon=-111.90
 *   GET /api/weather?source=wu-pws&stationIds=KUTSARAT50,KUTSARAT88
 *   GET /api/weather?source=wu-pws-history&stationId=KUTSARAT50
 *
 * Multi-source fallback: airport stations (K-prefix) route through NWS
 * (free, no key), UDOT RWIS stations (UT-prefix) route through UDOT
 * (free with key), remaining stations try Synoptic.
 */

import { splitStations, fetchNwsLatest, fetchNwsHistory } from './lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from './lib/udotAdapter.js';
import { checkRateLimit } from './lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimit(`weather:${clientIp}`);
  if (rl.limited) {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
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
    } else if (source === 'wu-nearby') {
      return await handleWuNearby(res, req.query);
    } else if (source === 'wu-pws') {
      return await handleWuPwsCurrent(res, req.query);
    } else if (source === 'wu-pws-history') {
      return await handleWuPwsHistory(res, req.query);
    } else if (source === 'wu-pws-date') {
      return await handleWuPwsDate(res, req.query);
    } else {
      return res.status(400).json({ error: 'Invalid source. Use: ambient, ambient-history, synoptic, synoptic-history, wu-nearby, wu-pws, wu-pws-history' });
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
  'KFGR','KBMC','BERU1','FPS','QSF','UTALP','UTOLY','CSC','UID28','TIMU1','MDAU1',
  'UTPCY','UTCOP','UTDAN','DSTU1','RVZU1','CCPUT','UWCU1','SKY','UTESU','UTMPK',
  'UR328','BLPU1','OGP',
  'QLN','GSLM','EPMU1','UTHTP','COOPOGNU1','PC496',
  'UTDCD','UTLPC','UTCHL',
  'UTORM','UTPCR','UT7','UTPRB','UTRVT','UTLAK',
  'UTHEB','UTSLD',
  'UTLMP','UTRKY','UTSCI',
  'UTANT','UTFRW',
  'UTGRC','UTLTS',
  'UTPVD','UTHUN',
  'UTPOW','UTMON',
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

  const { airport, other } = splitStations(filtered);
  const udotIds = other.filter(id => isUdotStation(id));
  const synopticIds = other.filter(id => !isUdotStation(id));

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsLatest(airport).catch(() => []));
  }

  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) {
    fetches.push(fetchUdotLatest(udotIds, udotKey).catch(() => []));
  }

  if (synopticIds.length > 0 || (udotIds.length > 0 && !udotKey)) {
    const synopticFallbackIds = udotKey ? synopticIds : [...synopticIds, ...udotIds];
    const token = process.env.SYNOPTIC_TOKEN;
    if (token && synopticFallbackIds.length > 0) {
      fetches.push(
        fetchSynopticDirect(synopticFallbackIds.join(','), token).catch(() => [])
      );
    }
  }

  const results = await Promise.all(fetches);
  const allStations = results.flat();

  const data = {
    SUMMARY: {
      RESPONSE_CODE: 1,
      RESPONSE_MESSAGE: 'OK',
      NUMBER_OF_OBJECTS: allStations.length,
      _sources: allStations.reduce((acc, s) => {
        const src = s._source || 'synoptic';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {}),
    },
    STATION: allStations,
  };

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
  return res.status(200).json(data);
}

async function fetchSynopticDirect(stidsStr, token) {
  const params = new URLSearchParams({
    token,
    stid: stidsStr,
    vars: 'air_temp,relative_humidity,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
    units: 'english',
  });
  const url = `https://api.synopticdata.com/v2/stations/latest?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    console.warn(`[Synoptic] returned ${response.status} — falling back`);
    return [];
  }
  const data = await response.json();
  return (data.STATION || []).map(s => ({ ...s, _source: 'synoptic' }));
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
  hours = String(Math.min(parseInt(hours) || 3, 24));
  const numHours = parseInt(hours);

  const { airport, other } = splitStations(filtered);

  const fetches = [];

  if (airport.length > 0) {
    fetches.push(fetchNwsHistory(airport, numHours).catch(() => []));
  }

  if (other.length > 0) {
    const token = process.env.SYNOPTIC_TOKEN;
    if (token) {
      fetches.push(fetchSynopticHistoryDirect(other.join(','), token, numHours).catch(() => []));
    }
  }

  const results = await Promise.all(fetches);
  const allStations = results.flat();

  const data = {
    SUMMARY: {
      RESPONSE_CODE: 1,
      RESPONSE_MESSAGE: 'OK',
      NUMBER_OF_OBJECTS: allStations.length,
    },
    STATION: allStations,
  };

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(data);
}

async function fetchSynopticHistoryDirect(stidsStr, token, hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);
  const fmt = (d) => d.toISOString().replace(/[-:T]/g, '').slice(0, 12);

  const params = new URLSearchParams({
    token,
    stid: stidsStr,
    start: fmt(start),
    end: fmt(end),
    vars: 'wind_speed,wind_direction,wind_gust,air_temp',
    units: 'english',
  });
  const url = `https://api.synopticdata.com/v2/stations/timeseries?${params}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    console.warn(`[Synoptic History] returned ${response.status}`);
    return [];
  }
  const data = await response.json();
  return data.STATION || [];
}

// ─── Weather Underground PWS Network ─────────────────────────────

function getWuApiKey() {
  return process.env.WU_API_KEY;
}

async function handleWuNearby(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { lat, lon } = query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon parameters required' });

  const url = `https://api.weather.com/v3/location/near?geocode=${lat},${lon}&product=pws&format=json&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json(data);
}

async function handleWuPwsCurrent(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const stationIds = (query.stationIds || '').split(',').map(s => s.trim()).filter(Boolean);
  if (stationIds.length === 0) return res.status(400).json({ error: 'stationIds parameter required' });
  if (stationIds.length > 10) return res.status(400).json({ error: 'Max 10 stations per request' });

  const results = await Promise.allSettled(
    stationIds.map(async (id) => {
      const url = `https://api.weather.com/v2/pws/observations/current?stationId=${id}&format=json&units=e&numericPrecision=decimal&apiKey=${apiKey}`;
      const r = await fetch(url);
      if (!r.ok) return { stationId: id, error: r.status };
      const d = await r.json();
      return d.observations?.[0] || { stationId: id, error: 'no_data' };
    })
  );

  const observations = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'fetch_failed' });
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(200).json({ observations });
}

async function handleWuPwsDate(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { stationId, date } = query;
  if (!stationId) return res.status(400).json({ error: 'stationId parameter required' });
  if (!date || !/^\d{8}$/.test(date)) return res.status(400).json({ error: 'date parameter required (YYYYMMDD)' });

  const url = `https://api.weather.com/v2/pws/history/all?stationId=${stationId}&format=json&units=e&date=${date}&numericPrecision=decimal&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).json(data);
}

async function handleWuPwsHistory(res, query) {
  const apiKey = getWuApiKey();
  if (!apiKey) return res.status(500).json({ error: 'WU_API_KEY not configured' });

  const { stationId } = query;
  if (!stationId) return res.status(400).json({ error: 'stationId parameter required' });

  const url = `https://api.weather.com/v2/pws/observations/all/1day?stationId=${stationId}&format=json&units=e&numericPrecision=decimal&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return res.status(response.status).json({ error: `WU API returned ${response.status}` });

  const data = await response.json();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(data);
}
