/**
 * SERVER-SIDE NWS FORECAST MODULE
 *
 * Fetches and caches NWS hourly (48h) and 7-day forecasts.
 * Provides per-lake NWS data for cross-checking against our sensor-based
 * predictions in the learning loop.
 *
 * NWS API is free, no key required, but needs a User-Agent header.
 * Grid point URLs are stable — cached 24 hours.
 * Forecast data refreshes ~hourly — cached 90 minutes.
 *
 * Redis keys:
 *   nws:grid:{id}      — grid forecast URL for a location (TTL 24h)
 *   nws:forecasts       — all cached forecasts (TTL 90min)
 */

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = 'UtahWindFinder/1.0 (utahwindfinder.com; wind-forecast-app)';
const FETCH_TIMEOUT = 8000;

// NWS grid points covering the major activity zones.
// Each maps to one NWS 2.5km grid cell for hourly/7-day forecasts.
const NWS_GRIDS = {
  'utah-lake':   { lat: 40.30, lng: -111.88 },
  'deer-creek':  { lat: 40.48, lng: -111.50 },
  'willard-bay': { lat: 41.38, lng: -112.07 },
  'bear-lake':   { lat: 41.95, lng: -111.30 },
  'stgeorge':    { lat: 37.10, lng: -113.40 },
  'vernal':      { lat: 40.45, lng: -109.52 },
  'strawberry':  { lat: 40.17, lng: -111.13 },
  'scofield':    { lat: 39.77, lng: -111.14 },
  'central-mtns': { lat: 38.70, lng: -111.90 },
  'panguitch':   { lat: 37.82, lng: -112.44 },
};

// Map every lake/spot to its nearest NWS grid zone.
const LAKE_TO_GRID = {
  'utah-lake-lincoln':   'utah-lake',
  'utah-lake-sandy':     'utah-lake',
  'utah-lake-vineyard':  'utah-lake',
  'utah-lake-zigzag':    'utah-lake',
  'utah-lake-mm19':      'utah-lake',
  'potm-south':          'utah-lake',
  'potm-north':          'utah-lake',
  'rush-lake':           'utah-lake',
  'grantsville':         'utah-lake',
  'stockton-bar':        'utah-lake',
  'inspo':               'utah-lake',
  'west-mountain':       'utah-lake',
  'yuba':                'utah-lake',
  'deer-creek':          'deer-creek',
  'jordanelle':          'deer-creek',
  'east-canyon':         'deer-creek',
  'echo':                'deer-creek',
  'rockport':            'deer-creek',
  'strawberry-ladders':  'strawberry',
  'strawberry-bay':      'strawberry',
  'strawberry-soldier':  'strawberry',
  'strawberry-view':     'strawberry',
  'strawberry-river':    'strawberry',
  'skyline-drive':       'scofield',
  'scofield':            'scofield',
  'willard-bay':         'willard-bay',
  'pineview':            'willard-bay',
  'hyrum':               'willard-bay',
  'powder-mountain':     'willard-bay',
  'monte-cristo':        'willard-bay',
  'bear-lake':           'bear-lake',
  'sand-hollow':         'stgeorge',
  'quail-creek':         'stgeorge',
  'lake-powell':         'stgeorge',
  'otter-creek':         'central-mtns',
  'fish-lake':           'central-mtns',
  'minersville':         'panguitch',
  'piute':               'panguitch',
  'panguitch':           'panguitch',
  'starvation':          'vernal',
  'steinaker':           'vernal',
  'red-fleet':           'vernal',
  'flaming-gorge':       'vernal',
};

// Wind direction string to degrees
const DIR_MAP = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337,
};

function dirToDeg(dir) {
  return DIR_MAP[dir?.toUpperCase()] ?? null;
}

function parseSpeed(str) {
  if (!str) return null;
  const m = str.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  return m ? (m[2] ? (parseInt(m[1]) + parseInt(m[2])) / 2 : parseInt(m[1])) : null;
}

// Extract the LOCAL hour from an ISO string with timezone offset.
// "2026-03-19T10:00:00-06:00" → 10  (Mountain Time local hour)
// This avoids JS Date timezone conversion issues on UTC servers.
function localHourFromISO(iso) {
  const m = iso?.match(/T(\d{2}):/);
  return m ? parseInt(m[1], 10) : null;
}

async function nwsFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Grid URL resolution (cached 24h) ──

async function getGridUrl(redisCmd, gridId, point) {
  const cacheKey = `nws:grid:${gridId}`;
  const cached = await redisCmd('GET', cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { return null; }
  }

  const json = await nwsFetch(`${NWS_BASE}/points/${point.lat},${point.lng}`);
  if (!json?.properties) return null;

  const urls = {
    hourly: json.properties.forecastHourly,
    sevenDay: json.properties.forecast,
  };
  if (!urls.hourly && !urls.sevenDay) return null;
  const ttl = (urls.hourly && urls.sevenDay) ? '86400' : '900';
  await redisCmd('SET', cacheKey, JSON.stringify(urls), 'EX', ttl);
  return urls;
}

// ── Fetch and cache all NWS forecasts ──

async function fetchNWSForecasts(redisCmd) {
  const cached = await redisCmd('GET', 'nws:forecasts');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = { fetchedAt: new Date().toISOString(), grids: {} };

  for (const [gridId, point] of Object.entries(NWS_GRIDS)) {
    try {
      const urls = await getGridUrl(redisCmd, gridId, point);
      if (!urls) continue;

      // Fetch hourly (48 hours of hour-by-hour wind data)
      const hourlyJson = urls.hourly ? await nwsFetch(urls.hourly) : null;
      const hourly = (hourlyJson?.properties?.periods || []).slice(0, 48).map(p => ({
        time: p.startTime,
        localHour: localHourFromISO(p.startTime),
        temp: p.temperature,
        speed: parseSpeed(p.windSpeed),
        speedRaw: p.windSpeed,
        dir: p.windDirection,
        dirDeg: dirToDeg(p.windDirection),
        text: p.shortForecast,
      }));

      // Fetch 7-day (has detailed narrative text for keyword analysis)
      const sevenJson = urls.sevenDay ? await nwsFetch(urls.sevenDay) : null;
      const sevenDay = (sevenJson?.properties?.periods || []).slice(0, 14).map(p => ({
        name: p.name,
        time: p.startTime,
        isDaytime: p.isDaytime,
        temp: p.temperature,
        speed: parseSpeed(p.windSpeed),
        speedRaw: p.windSpeed,
        dir: p.windDirection,
        dirDeg: dirToDeg(p.windDirection),
        text: p.shortForecast,
        detail: p.detailedForecast,
      }));

      result.grids[gridId] = { hourly, sevenDay };
    } catch (e) {
      console.error(`NWS fetch ${gridId}:`, e.message);
    }
  }

  if (Object.keys(result.grids).length > 0) {
    await redisCmd('SET', 'nws:forecasts', JSON.stringify(result), 'EX', '5400');
  }

  return result;
}

// ── Per-lake forecast lookup ──

const WEATHER_KEYWORDS = [
  'front', 'cold front', 'storm', 'windy', 'gusty', 'breezy',
  'calm', 'rain', 'snow', 'clear', 'sunny', 'thunder',
  'advisory', 'warning', 'arctic', 'freeze',
];

function getNWSForLake(nwsData, lakeId, mountainHour) {
  if (!nwsData?.grids) return null;
  const gridId = LAKE_TO_GRID[lakeId] || 'utah-lake';
  const grid = nwsData.grids[gridId];
  if (!grid) return null;

  // Find the hourly period matching the current Mountain Time hour
  const current = grid.hourly?.find(p => p.localHour === mountainHour) || grid.hourly?.[0] || null;

  // Next 12 hours of hourly data — handle findIndex returning -1
  let currentIdx = grid.hourly?.findIndex(p => p.localHour === mountainHour) ?? -1;
  if (currentIdx < 0) {
    // No exact match: find the first future period (closest hour >= current)
    currentIdx = grid.hourly?.findIndex(p => p.localHour >= mountainHour) ?? -1;
    if (currentIdx < 0) currentIdx = 0;
  }
  const next12 = grid.hourly?.slice(currentIdx, currentIdx + 12) || [];

  // Scan the next 12 hours + 7-day text for weather keywords
  const keywords = {};
  for (const kw of WEATHER_KEYWORDS) keywords[kw] = false;

  const allText = [
    ...next12.map(p => p.text || ''),
    ...(grid.sevenDay || []).slice(0, 4).map(p => `${p.text || ''} ${p.detail || ''}`),
  ].join(' ').toLowerCase();

  for (const kw of WEATHER_KEYWORDS) {
    if (allText.includes(kw)) keywords[kw] = true;
  }

  // Build a "periods" array compatible with existing nwsForecast shape
  // (used by client-side WindEventPredictor.scorePreFrontal)
  const periods = (grid.sevenDay || []).slice(0, 4).map(p => ({
    name: p.name,
    shortForecast: p.text,
    detailedForecast: p.detail,
  }));

  return {
    current,
    next12,
    keywords,
    periods,
    gridId,
    fetchedAt: nwsData.fetchedAt,
  };
}

// ── For the "Ahead of Forecast" feature ──
// Returns what NWS says about fronts/wind for the next 24h

function getNWSFrontMentions(nwsData) {
  if (!nwsData?.grids) return [];
  const mentions = [];

  for (const [gridId, grid] of Object.entries(nwsData.grids)) {
    for (const p of (grid.sevenDay || []).slice(0, 6)) {
      const text = `${p.text || ''} ${p.detail || ''}`.toLowerCase();
      const hasFront = text.includes('cold front') || text.includes('warm front') || 
                       text.includes('frontal') || 
                       (text.includes('front') && !text.includes('waterfront') && !text.includes('in front'));
      const hasWind = text.includes('windy') || text.includes('gusty') || text.includes('breezy');
      const hasStorm = text.includes('storm') || text.includes('thunder');

      if (hasFront || hasWind || hasStorm) {
        mentions.push({
          gridId,
          period: p.name,
          time: p.time,
          type: hasFront ? 'front' : hasStorm ? 'storm' : 'wind',
          text: p.text,
          detail: p.detail,
        });
      }
    }
  }

  return mentions;
}

export {
  fetchNWSForecasts,
  getNWSForLake,
  getNWSFrontMentions,
  LAKE_TO_GRID,
  NWS_GRIDS,
};
