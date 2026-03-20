/**
 * POST /api/garmin-link   — Link a Garmin device to user account
 * DELETE /api/garmin-link  — Unlink a device
 *
 * Body: { device_id: "...", device_name?: "Fenix 8 Pro" }
 * Requires: Supabase JWT in Authorization header
 *
 * How it works:
 * 1. User logs in on the web app
 * 2. Opens their Garmin watch app → sees a 6-char device ID on screen
 * 3. Types that device_id into the web app's "Link Garmin" page
 * 4. This endpoint links it to their account
 * 5. The /api/garmin endpoint checks device_id → user → subscription tier
 */
import { createClient } from '@supabase/supabase-js';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase env vars not configured');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await getSupabase().auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const deviceId = body?.device_id;
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 4) {
      return res.status(400).json({ error: 'device_id required (min 4 chars)' });
    }

    if (req.method === 'POST') {
      const deviceName = body?.device_name || 'Garmin Watch';

      const { error } = await getSupabase()
        .from('garmin_devices')
        .upsert({
          user_id: user.id,
          device_id: deviceId,
          device_name: deviceName,
          linked_at: new Date().toISOString(),
        }, { onConflict: 'device_id' })
        .select()
        .single();

      if (error) {
        console.error('[garmin-link] insert error:', error.message);
        return res.status(500).json({ error: 'Failed to link device' });
      }

      return res.status(200).json({
        linked: true,
        device_id: deviceId,
        device_name: deviceName,
        message: 'Device linked! Pro features will appear on your watch within 60 seconds.',
      });
    }

    if (req.method === 'DELETE') {
      const { error } = await getSupabase()
        .from('garmin_devices')
        .delete()
        .match({ user_id: user.id, device_id: deviceId });

      if (error) {
        console.error('[garmin-link] delete error:', error.message);
        return res.status(500).json({ error: 'Failed to unlink device' });
      }

      return res.status(200).json({ linked: false, device_id: deviceId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[garmin-link] unhandled error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
