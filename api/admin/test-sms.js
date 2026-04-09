/**
 * POST /api/admin/test-sms
 *
 * Sends a test SMS via Twilio and returns diagnostic info about the alert pipeline.
 * Admin-only — requires JWT from an allowed admin email.
 *
 * Body: { phone: "+18015551234", message?: "optional custom message" }
 */
import { verifyAuth, getSupabase } from '../lib/supabase.js';
import { trySms } from '../lib/sendSessionAlert.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const auth = await verifyAuth(req);
    if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
    if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const phone = body?.phone;
    const message = body?.message || 'LiftForecast test alert — if you received this, SMS alerts are working!';

    const diagnostics = {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      twilioSid: process.env.TWILIO_ACCOUNT_SID ? `...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}` : null,
      twilioFrom: process.env.TWILIO_FROM_NUMBER || null,
      usersWithPhone: 0,
      usersWithAlerts: 0,
    };

    try {
      const supabase = getSupabase();
      const { count: phoneCount } = await supabase
        .from('user_preferences')
        .select('id', { count: 'exact', head: true })
        .not('phone', 'is', null);
      diagnostics.usersWithPhone = phoneCount || 0;

      const { count: alertCount } = await supabase
        .from('user_preferences')
        .select('id', { count: 'exact', head: true })
        .not('alerts', 'is', null);
      diagnostics.usersWithAlerts = alertCount || 0;
    } catch (err) {
      diagnostics.supabaseError = err.message;
    }

    let smsResult = { method: 'sms', success: false, reason: 'no-phone-provided' };
    if (phone) {
      smsResult = await trySms(phone, message);
      if (!smsResult.success && !diagnostics.twilioConfigured) {
        smsResult.reason = 'twilio-not-configured';
      }
    }

    return res.status(200).json({ sms: smsResult, diagnostics });
  } catch (err) {
    console.error('[admin/test-sms]', err);
    return res.status(500).json({ error: err.message });
  }
}
