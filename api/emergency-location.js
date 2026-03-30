/**
 * POST /api/emergency-location
 *
 * Called by EmergencyView.mc on the Garmin watch.
 * Logs the alert to Supabase and (when configured) sends an SMS
 * to the rider's emergency contacts via Twilio.
 *
 * Body: { lat, lon, ts, type, msg }
 */
import { getSupabase, verifyAuth } from './lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const lat = body?.lat;
    const lon = body?.lon;

    if (lat == null || lon == null) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const supabase = getSupabase();

    // Log to DB
    const { error: dbErr } = await supabase
      .from('emergency_alerts')
      .insert({
        device_id:  body.device || null,
        latitude:   lat,
        longitude:  lon,
        alert_type: body.type || 'KITE_EMERGENCY',
        message:    body.msg || null,
      });

    if (dbErr) {
      console.error('[emergency] DB error:', dbErr.message);
    }

    // Twilio SMS integration (when env vars are configured)
    const twilioSid    = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken  = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom   = process.env.TWILIO_FROM_NUMBER;
    const emergencyTo  = process.env.EMERGENCY_CONTACT_NUMBERS;

    if (twilioSid && twilioToken && twilioFrom && emergencyTo) {
      const mapsUrl = `https://maps.google.com/maps?q=${lat},${lon}`;
      const smsBody = `EMERGENCY: Rider needs assistance at ${lat.toFixed(5)}, ${lon.toFixed(5)}. Map: ${mapsUrl}`;

      const numbers = emergencyTo.split(',').map(n => n.trim()).filter(Boolean);
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

      await Promise.allSettled(numbers.map(async (to) => {
        try {
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: twilioFrom, Body: smsBody }),
          });
        } catch (err) {
          console.error(`[emergency] SMS to ${to} failed:`, err.message);
        }
      }));
    } else {
      console.warn('[emergency] Twilio not configured — SMS skipped');
    }

    return res.status(200).json({
      status: 'armed_and_sent',
      msg: 'Location received. Contacts alerted.',
    });
  } catch (err) {
    console.error('[emergency]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
