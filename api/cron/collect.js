/**
 * Vercel Cron Job — Server-Side Data Collection
 * 
 * Runs every 15 minutes (configured in vercel.json).
 * Fetches all station data from Synoptic and stores it in Upstash Redis.
 * This ensures learning data is collected 24/7 even when no user has the app open.
 * 
 * Storage: Upstash Redis (free tier — 10k commands/day is plenty for 96 daily collections)
 * 
 * Data format in Redis:
 *   Key: "obs:{date}:{hour}:{minute}" 
 *   Value: JSON array of station readings
 *   TTL: 7 days (auto-cleanup)
 * 
 * The client reads these on startup via GET /api/cron/collect?action=sync
 * to backfill its IndexedDB learning system.
 */

// Read env vars at invocation time (not module init) to ensure fresh values
function getEnv() {
  return {
    synopticToken: process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

const ALL_STATIONS = [
  'KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UTOLY', 'UID28',
  'DCC', 'KHCR', 'TIMU1', 'SND', 'MDAU1', 'UTPCY',
];

const LAKE_STATION_MAP = {
  'utah-lake-zigzag': ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UTOLY', 'UID28'],
  'utah-lake-lincoln': ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
  'utah-lake-sandy': ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
  'utah-lake-vineyard': ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
  'utah-lake-mm19': ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UID28'],
  'deer-creek': ['KSLC', 'DCC', 'KHCR', 'SND', 'TIMU1', 'MDAU1', 'UTPCY'],
  'willard-bay': ['KSLC'],
};

async function redisCommand(command, ...args) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) return null;
  const resp = await fetch(upstashUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
  });
  const json = await resp.json();
  return json.result;
}

async function fetchSynopticLatest() {
  const { synopticToken } = getEnv();
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${synopticToken}&stids=${ALL_STATIONS.join(',')}&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure&units=english&obtimezone=local`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Synoptic ${resp.status}`);
  const json = await resp.json();

  return (json.STATION || []).map(s => {
    const o = s.OBSERVATIONS || {};
    return {
      stationId: s.STID,
      windSpeed: o.wind_speed_value_1?.value ?? null,
      windDirection: o.wind_direction_value_1?.value ?? null,
      windGust: o.wind_gust_value_1?.value ?? null,
      temperature: o.air_temp_value_1?.value ?? null,
      pressure: (o.pressure_value_1d?.value || o.sea_level_pressure_value_1d?.value) ?? null,
      observedAt: o.wind_speed_value_1?.date_time || new Date().toISOString(),
    };
  });
}

export default async function handler(req, res) {
  // Client sync endpoint: return last 24hr of server-collected data
  if (req.query?.action === 'sync') {
    return await handleSync(res);
  }

  const env = getEnv();

  // Cron collection: called by Vercel every 15 min
  if (!env.synopticToken) {
    return res.status(500).json({ error: 'SYNOPTIC_TOKEN not set' });
  }

  try {
    const stations = await fetchSynopticLatest();
    const now = new Date();
    const key = `obs:${now.toISOString().split('T')[0]}:${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Build per-lake observations
    const observations = {};
    for (const [lakeId, stationIds] of Object.entries(LAKE_STATION_MAP)) {
      observations[lakeId] = stations.filter(s => stationIds.includes(s.stationId));
    }

    const record = {
      timestamp: now.toISOString(),
      stations,
      observations,
    };

    // Store in Redis with 7-day TTL (604800 seconds)
    if (env.upstashUrl && env.upstashToken) {
      await redisCommand('SET', key, JSON.stringify(record), 'EX', '604800');
      // Also maintain an index of recent keys
      await redisCommand('LPUSH', 'obs:index', key);
      await redisCommand('LTRIM', 'obs:index', '0', '672'); // Keep ~7 days (96 per day * 7)
    }

    return res.status(200).json({
      ok: true,
      timestamp: now.toISOString(),
      stationsCollected: stations.length,
      storedAs: key,
      hasRedis: !!(env.upstashUrl && env.upstashToken),
      debug: {
        hasUrl: !!env.upstashUrl,
        hasToken: !!env.upstashToken,
        urlPrefix: env.upstashUrl ? env.upstashUrl.substring(0, 30) + '...' : null,
        envKeysWithUpstash: Object.keys(process.env).filter(k => k.toUpperCase().includes('UPSTASH')),
        envKeysWithSynoptic: Object.keys(process.env).filter(k => k.toUpperCase().includes('SYNOPTIC')),
      },
    });
  } catch (error) {
    console.error('Cron collect error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleSync(res) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) {
    return res.status(200).json({ records: [], message: 'Redis not configured — using client-side backfill only' });
  }

  try {
    // Get the last 96 keys (24 hours of 15-min intervals)
    const keys = await redisCommand('LRANGE', 'obs:index', '0', '95');
    if (!keys || keys.length === 0) {
      return res.status(200).json({ records: [], message: 'No server-collected data yet' });
    }

    // Fetch the actual data (batch — up to 96 records)
    const records = [];
    for (const key of keys.slice(0, 96)) {
      const data = await redisCommand('GET', key);
      if (data) {
        try { records.push(JSON.parse(data)); } catch (e) { /* skip bad data */ }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ records, count: records.length });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
