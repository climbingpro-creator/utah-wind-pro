/**
 * POST /api/push-subscribe   — save a push subscription
 * DELETE /api/push-subscribe  — remove a push subscription
 *
 * Body (POST): { endpoint, keys: { p256dh, auth } }
 * Body (DELETE): { endpoint }
 *
 * Requires Authorization: Bearer <supabase-jwt>
 */
import { getSupabase, verifyAuth } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sb = getSupabase();

  if (req.method === 'POST') {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing endpoint or keys' });
    }

    const { error } = await sb
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('[push-subscribe]', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const { error } = await sb
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push-unsubscribe]', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
