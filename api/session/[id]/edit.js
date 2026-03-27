/**
 * POST /api/session/:id/edit
 *
 * Update post-session details: rider name, gear, ride/foil counts.
 * Body: { rider_name?, gear_setup?, ride_count?, foil_ride_count? }
 */
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id: sessionId } = req.query;
  if (!sessionId || sessionId.length < 10) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('kite_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updates = {};
    if (body.rider_name !== undefined)    updates.rider_name = body.rider_name;
    if (body.gear_setup !== undefined)    updates.gear_setup = body.gear_setup;
    if (body.ride_count !== undefined)    updates.ride_count = Number(body.ride_count) || 0;
    if (body.foil_ride_count !== undefined) updates.foil_ride_count = Number(body.foil_ride_count) || 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { error: updateErr } = await supabase
      .from('kite_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (updateErr) {
      console.error('[edit] update error:', updateErr.message);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    return res.status(200).json({ success: true, updated: Object.keys(updates) });
  } catch (err) {
    console.error('[edit]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
