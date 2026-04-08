/**
 * /api/session-alerts
 *
 * GET    — list all session alerts for the authenticated Pro user
 * POST   — upsert a session alert { spotId, discipline, minWindMph }
 * DELETE — remove an alert { spotId, discipline }
 *
 * Pro-only: free users receive 403.
 */
import { verifyAuth, getSupabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await verifyAuth(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;
  const sb = getSupabase();

  try {
    const tier = await getUserTier(sb, userId);
    if (tier !== 'pro') {
      return res.status(403).json({ error: 'Session alerts require a Pro subscription' });
    }

    if (req.method === 'GET') return await listAlerts(res, sb, userId);
    if (req.method === 'POST') return await upsertAlert(req, res, sb, userId);
    if (req.method === 'DELETE') return await deleteAlert(req, res, sb, userId);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[session-alerts]', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

async function getUserTier(sb, userId) {
  try {
    const { data, error } = await sb.rpc('get_user_tier', { uid: userId });
    if (error) {
      const { data: row } = await sb
        .from('subscriptions')
        .select('tier, status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      if (!row) return 'free';
      if (row.current_period_end && new Date(row.current_period_end) < new Date()) return 'free';
      return row.tier || 'free';
    }
    return data || 'free';
  } catch {
    return 'free';
  }
}

async function listAlerts(res, sb, userId) {
  const { data, error } = await sb
    .from('session_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ alerts: data || [] });
}

async function upsertAlert(req, res, sb, userId) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { spotId, discipline, minWindMph, enabled } = body || {};

  if (!spotId || !discipline) {
    return res.status(400).json({ error: 'spotId and discipline are required' });
  }

  const row = {
    user_id: userId,
    spot_id: spotId,
    discipline,
    min_wind_mph: Math.max(1, Math.min(50, parseInt(minWindMph, 10) || 8)),
    enabled: enabled !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('session_alerts')
    .upsert(row, { onConflict: 'user_id,spot_id,discipline' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

async function deleteAlert(req, res, sb, userId) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { spotId, discipline } = body || {};

  if (!spotId || !discipline) {
    return res.status(400).json({ error: 'spotId and discipline are required' });
  }

  const { error } = await sb
    .from('session_alerts')
    .delete()
    .eq('user_id', userId)
    .eq('spot_id', spotId)
    .eq('discipline', discipline);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
