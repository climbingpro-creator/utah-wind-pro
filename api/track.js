/**
 * POST /api/track
 *
 * Accepts analytics events from the client and inserts them into
 * analytics_events using the service-role key (bypasses RLS).
 */
import { getSupabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    const rows = events.map((e) => ({
      event_type: String(e.event_type || 'unknown').slice(0, 50),
      metadata: e.metadata || {},
      created_at: e.created_at || new Date().toISOString(),
    }));

    const supabase = getSupabase();
    const { error } = await supabase.from('analytics_events').insert(rows);

    if (error) {
      console.error('[track] insert error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('[track]', err);
    return res.status(500).json({ error: err.message });
  }
}
