/**
 * POST /api/session-upload
 *
 * Receives end-of-session payload from the Garmin watch or web form
 * and writes it to the kite_sessions table in Supabase.
 *
 * Accepts multiple activity types:
 *   kite_session, snowkite_session, windsurf_session, sail_session,
 *   boat_session, paddle_session, paraglide_session, fish_session
 */
import { getSupabase, verifyAuth } from './lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://liftforecast.com',
  'https://notwindy.com',
  'https://www.notwindy.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

const TYPE_TO_ACTIVITY = {
  kite_session:        'kiting',
  kiting_session:      'kiting',
  snowkite_session:    'snowkiting',
  snowkiting_session:  'snowkiting',
  windsurf_session:    'windsurfing',
  windsurfing_session: 'windsurfing',
  wingfoil_session:    'wingfoil',
  sail_session:        'sailing',
  boat_session:        'boating',
  paddle_session:      'paddling',
  paraglide_session:   'paragliding',
  fish_session:        'fishing',
};

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

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Auth: try JWT first (web users), fall back to device_id (watch uploads)
    const auth = await verifyAuth(req);
    let userId = auth.error ? null : auth.user?.id;
    const deviceId = body?.device || null;

    if (!userId && deviceId) {
      const supabase = getSupabase();
      const { data: link } = await supabase
        .from('garmin_devices')
        .select('user_id')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (link) userId = link.user_id;
    } else if (auth.error && !deviceId) {
      return res.status(auth.status || 401).json({ error: auth.error });
    }

    const activityType = body && TYPE_TO_ACTIVITY[body.type];
    if (!activityType) {
      return res.status(400).json({
        error: `Invalid payload: type="${body?.type}" not recognized`,
      });
    }

    const supabase = getSupabase();

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
      activity_type:     activityType,
      rider_name:        body.rider_name || null,
      gear_setup:        body.gear_setup || null,
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
      max_hangtime_s:    body.max_hangtime_s || 0,
      ride_count:        body.ride_count || 0,
      foil_ride_count:   body.foil_ride_count || 0,
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
      console.error('[session-upload] insert error:', error.message, error.details, error.hint);
      return res.status(500).json({ error: 'Failed to store session', detail: error.message });
    }

    const sessionId = data.id;

    if (body.jump_details && Array.isArray(body.jump_details) && body.jump_details.length > 0) {
      const jumpRows = body.jump_details.map((j, i) => ({
        session_id:        sessionId,
        height_ft:         j.height_ft || 0,
        hangtime_s:        j.hangtime_s || 0,
        takeoff_speed_kts: j.takeoff_kts || null,
        distance_ft:       j.distance_ft || null,
        peak_g:            j.peak_g || null,
        jump_number:       i + 1,
      }));

      const { error: jumpErr } = await supabase
        .from('jumps')
        .insert(jumpRows);

      if (jumpErr) {
        console.error('[session-upload] jumps insert error:', jumpErr.message);
      }
    }

    let dayUrl = null;
    if (spotId) {
      const { data: spotData } = await supabase
        .from('spots')
        .select('slug')
        .eq('id', spotId)
        .single();
      if (spotData) {
        const d = new Date();
        const dateStr = d.toISOString().split('T')[0];
        dayUrl = `https://liftforecast.com/day/${spotData.slug}/${dateStr}?activity=${activityType}`;
      }
    }

    return res.status(200).json({
      success: true,
      sessionId,
      url: `https://liftforecast.com/session/${sessionId}`,
      editUrl: `https://liftforecast.com/session/${sessionId}/edit`,
      dayUrl,
    });
  } catch (err) {
    console.error('[session-upload]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
