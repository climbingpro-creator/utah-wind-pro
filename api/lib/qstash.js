/**
 * QStash client for reliable event-driven chaining.
 *
 * Replaces the brittle fire-and-forget fetch() calls between pipeline stages
 * with guaranteed-delivery message publishing via Upstash QStash.
 *
 * QStash handles retries, dead-letter queues, and signature verification
 * so each stage is guaranteed to fire even if the target has a cold start.
 *
 * Env: QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
 */

import { Client } from '@upstash/qstash';

let _client = null;

export function getQStashClient() {
  if (_client) return _client;
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  _client = new Client({ token });
  return _client;
}

/**
 * Publish a JSON message to the next stage in the pipeline via QStash.
 * Falls back to direct HTTP POST if QStash is not configured.
 */
export async function triggerNextStage(path, req, body = {}) {
  const qstash = getQStashClient();

  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  const baseUrl = host
    ? `${proto}://${host}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://utahwindfinder.com';

  const targetUrl = `${baseUrl}${path}`;

  if (qstash) {
    try {
      const result = await qstash.publishJSON({
        url: targetUrl,
        body: { ...body, _chain: true, _ts: Date.now() },
      });
      console.log(`[qstash] Published to ${path} — messageId=${result.messageId}`);
      return;
    } catch (err) {
      console.error(`[qstash] Publish failed for ${path}: ${err.message} — falling back to direct POST`);
    }
  }

  // Fallback: direct HTTP POST (original behavior)
  const internalKey = process.env.INTERNAL_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  if (internalKey) headers['x-internal-key'] = internalKey;

  fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  }).catch(err => {
    console.warn(`[chain] Direct POST fallback failed for ${path}: ${err.message}`);
  });
}

/**
 * Verify that an incoming request was sent by QStash.
 * Falls back to INTERNAL_API_KEY check if QStash signing keys aren't configured.
 */
export async function verifyQStashSignature(req) {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (currentKey && nextKey) {
    const { Receiver } = await import('@upstash/qstash');
    const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey });
    try {
      const signature = req.headers['upstash-signature'];
      if (!signature) return false;

      // For Vercel serverless, body is already parsed — re-serialize for verification
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      await receiver.verify({ signature, body: rawBody });
      return true;
    } catch (err) {
      console.warn('[qstash] Signature verification failed:', err.message);
      return false;
    }
  }

  // Fallback: check INTERNAL_API_KEY header
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    console.warn('[auth] Neither QStash signing keys nor INTERNAL_API_KEY configured');
    return false;
  }
  return req.headers['x-internal-key'] === key;
}
