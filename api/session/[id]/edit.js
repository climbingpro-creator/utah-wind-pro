/**
 * POST /api/session/:id/edit
 *
 * Update post-session details: rider name, gear, ride/foil counts.
 * Body: { rider_name?, gear_setup?, ride_count?, foil_ride_count? }
 */
import { getSupabase, verifyAuth } from '../../lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://liftforecast.com',
  'https://notwindy.com',
  'https://www.notwindy.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }

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
