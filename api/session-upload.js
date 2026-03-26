/**
 * POST /api/session-upload
 *
 * Receives end-of-session payload from the Garmin watch (SessionUploader.mc)
 * and writes it to the kite_sessions table in Supabase.
 *
 * The watch sends a flat JSON object with keys like duration_s, distance_nm,
 * max_speed_kts, jumps, etc.  The device_id field links to a user via
 * garmin_devices for attribution.
 */
import { getSupabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || body.type !== 'kite_session') {
      return res.status(400).json({ error: 'Invalid payload: type must be kite_session' });
    }

    const supabase = getSupabase();

    // Resolve device_id → user_id via garmin_devices
    let userId = null;
    const deviceId = body.device || null;
    if (deviceId) {
      const { data: link } = await supabase
        .from('garmin_devices')
        .select('user_id')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (link) userId = link.user_id;
    }

    // Nearest spot matching (simple lat/lon proximity from track)
    let spotId = null;
    if (body.track && Array.isArray(body.track) && body.track.length > 0) {
      const mid = body.track[Math.floor(body.track.length / 2)];
      if (Array.isArray(mid) && mid.length >= 2) {
        const { data: spot } = await supabase.rpc('nearest_spot', {
          p_lat: mid[0],
          p_lon: mid[1],
        }).maybeSingle();
        if (spot) spotId = spot.id;
      }
    }

    const row = {
      user_id:           userId,
      device_id:         deviceId,
      spot_id:           spotId,
      duration_s:        body.duration_s || 0,
      distance_nm:       body.distance_nm || 0,
      max_speed_kts:     body.max_speed_kts || 0,
      avg_speed_kts:     body.avg_speed_kts || 0,
      calories:          body.calories || 0,
      avg_hr:            body.avg_hr || 0,
      max_hr:            body.max_hr || 0,
      total_jumps:       body.jumps || 0,
      max_jump_ft:       body.max_jump_ft || 0,
      avg_jump_ft:       body.avg_jump_ft || 0,
      crashes_filtered:  body.crashes_filtered || 0,
      water_temp_c:      body.water_temp_c || null,
      track:             body.track || null,
    };

    const { data, error } = await supabase
      .from('kite_sessions')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('[session-upload] insert error:', error.message);
      return res.status(500).json({ error: 'Failed to store session' });
    }

    return res.status(200).json({
      success: true,
      sessionId: data.id,
      url: `https://utahwindfinder.com/session/${data.id}`,
    });
  } catch (err) {
    console.error('[session-upload]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
