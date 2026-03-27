/**
 * Shared Redis helpers for the event-driven cron chain.
 * Used by 1-ingest, 2-process-models, 3-dispatch-alerts, and collect (read API).
 */

export function getEnv() {
  return {
    synopticToken: process.env.SYNOPTIC_TOKEN,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

export function hasRedis() {
  const { upstashUrl, upstashToken } = getEnv();
  return !!(upstashUrl && upstashToken);
}

export async function redisCommand(command, ...args) {
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) return null;
  try {
    const resp = await fetch(upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });
    if (!resp.ok) {
      console.error(`Redis ${command} HTTP ${resp.status}: ${resp.statusText}`);
      return null;
    }
    const json = await resp.json();
    if (json.error) {
      console.error(`Redis ${command} error: ${json.error}`);
      return null;
    }
    return json.result;
  } catch (err) {
    console.error(`Redis ${command} failed: ${err.message}`);
    return null;
  }
}

export async function redisMGet(keys) {
  if (!keys || keys.length === 0) return [];
  const { upstashUrl, upstashToken } = getEnv();
  if (!upstashUrl || !upstashToken) return keys.map(() => null);
  try {
    const resp = await fetch(upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['MGET', ...keys]),
    });
    if (!resp.ok) return keys.map(() => null);
    const json = await resp.json();
    if (json.error) return keys.map(() => null);
    return json.result || keys.map(() => null);
  } catch {
    return keys.map(() => null);
  }
}

export function normalizeToMb(val) {
  if (val == null) return null;
  return val < 50 ? val * 33.864 : val;
}

export function toMountainHour(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver', hour: 'numeric', hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    return date.getUTCHours() - 7;
  }
}

/**
 * Fire-and-forget chain trigger to the next stage in the pipeline.
 * Uses the request host or VERCEL_URL to build the target URL.
 */
export function triggerNextStage(path, req) {
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  const baseUrl = host
    ? `${proto}://${host}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://utahwindfinder.com';

  const internalKey = process.env.INTERNAL_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  if (internalKey) headers['x-internal-key'] = internalKey;

  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(5000),
  }).catch(err => {
    console.warn(`[chain] Failed to trigger ${path}: ${err.message}`);
  });
}

/**
 * Verify the internal API key for chain-only endpoints.
 * Returns true if authorized, false otherwise.
 */
export function verifyInternalKey(req) {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    console.warn('[auth] INTERNAL_API_KEY not set — blocking internal request');
    return false;
  }
  return req.headers['x-internal-key'] === key;
}
