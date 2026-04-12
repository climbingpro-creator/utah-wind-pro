/**
 * /api/favorite-locations
 *
 * GET    — returns the authenticated user's favorite locations
 * POST   — upserts a favorite location (toggle on)
 * DELETE  — removes a favorite location (toggle off)
 *
 * Body (POST):  { locationId: string, notify?: boolean }
 * Body (DELETE): { locationId: string }
 *
 * Requires Authorization: Bearer <supabase-jwt>
 */
import { verifyAuth, getSupabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
  const userId = auth.user.id;
  const sb = getSupabase();

  try {
    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('favorite_locations')
        .select('location_id, notify, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data || [] });
    }

    if (req.method === 'POST') {
      const { locationId, notify = true } = req.body || {};
      if (!locationId) return res.status(400).json({ error: 'locationId required' });

      const { error } = await sb
        .from('favorite_locations')
        .upsert({
          user_id: userId,
          location_id: locationId,
          notify,
        }, { onConflict: 'user_id,location_id' });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { locationId } = req.body || {};
      if (!locationId) return res.status(400).json({ error: 'locationId required' });

      const { error } = await sb
        .from('favorite_locations')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[favorite-locations]', err);
    return res.status(500).json({ error: err.message });
  }
}
