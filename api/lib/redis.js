/**
 * Shared infrastructure for the serverless backend.
 *
 * - Redis helpers (Upstash REST)
 * - Rate limiting (@upstash/ratelimit + @upstash/redis SDK)
 * - Re-exports QStash chain trigger + verification
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ── Re-export QStash functions so existing imports still work ──
export { triggerNextStage, verifyQStashSignature } from './qstash.js';

// ── Environment ────────────────────────────────────────────────

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

// ── Redis commands (raw REST — used by ML pipeline) ────────────

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

// ── Utilities ──────────────────────────────────────────────────

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

// ── Rate Limiting (@upstash/redis SDK) ─────────────────────────

let _rateLimiter = null;

function getRateLimiter() {
  if (_rateLimiter) return _rateLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  _rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '10 s'),
    prefix: 'rl:api',
  });
  return _rateLimiter;
}

/**
 * Check rate limit for a given identifier (typically client IP).
 * Returns { limited: false } if ratelimit is not configured.
 */
export async function checkRateLimit(identifier) {
  const limiter = getRateLimiter();
  if (!limiter) return { limited: false };
  try {
    const result = await limiter.limit(identifier);
    return { limited: !result.success, reset: result.reset, remaining: result.remaining };
  } catch (err) {
    console.warn('[ratelimit] Check failed:', err.message);
    return { limited: false };
  }
}
