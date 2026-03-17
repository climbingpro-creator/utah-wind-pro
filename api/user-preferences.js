/**
 * /api/user-preferences
 *
 * GET  — returns the authenticated user's preferences
 * POST — upserts preferences for the authenticated user
 *
 * Preferences stored in Supabase `user_preferences` table:
 *   user_id        UUID (FK → auth.users)
 *   default_lake   TEXT
 *   activities     TEXT[]    e.g. ['kiting','sailing']
 *   alerts         JSONB     { windThreshold, glassNotify, quietStart, quietEnd, ... }
 *   phone          TEXT      for SMS alerts
 *   units          TEXT      'imperial' | 'metric'
 *   updated_at     TIMESTAMPTZ
 */
import { verifyAuth, getSupabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Auth required for all preference operations
  const auth = await verifyAuth(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const userId = auth.user.id;

  try {
    if (req.method === 'GET') return await getPreferences(res, userId);
    if (req.method === 'POST') return await savePreferences(req, res, userId);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[user-preferences]', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

async function getPreferences(res, userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  // Return defaults if no row exists yet
  const prefs = data || {
    user_id: userId,
    default_lake: 'utah-lake-zigzag',
    activities: ['kiting'],
    alerts: {
      windThreshold: 12,
      glassNotify: true,
      thermalNotify: true,
      severeNotify: true,
      dailyBriefing: true,
      quietStart: '22:00',
      quietEnd: '07:00',
    },
    phone: null,
    units: 'imperial',
  };

  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.status(200).json(prefs);
}

async function savePreferences(req, res, userId) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // Whitelist allowed fields
  const allowed = ['default_lake', 'activities', 'alerts', 'phone', 'units'];
  const update = { user_id: userId, updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(update, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
