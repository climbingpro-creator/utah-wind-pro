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

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
  const userId = auth.user.id;

  const sb = getSupabase();

  if (req.method === 'POST') {
    const { endpoint, keys, token, token_type, platform } = req.body || {};

    // Native APNs/FCM token registration
    if (token && token_type) {
      const { error } = await sb
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: `${token_type}://${token}`,
          token_type,
          device_token: token,
          platform: platform || 'ios',
          p256dh: null,
          auth_key: null,
        }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('[push-subscribe:native]', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true });
    }

    // Web Push subscription (VAPID)
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing endpoint or keys' });
    }

    const { error } = await sb
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        token_type: 'web',
        device_token: null,
        platform: 'web',
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('[push-subscribe]', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint, platform } = req.body || {};

    // Native: delete by platform (user may not have the endpoint handy)
    if (platform && !endpoint) {
      const { error } = await sb
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) {
        console.error('[push-unsubscribe:native]', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true });
    }

    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const { error } = await sb
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push-unsubscribe]', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
