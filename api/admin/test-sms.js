/**
 * POST /api/admin/test-sms
 *
 * Sends a test SMS or Push notification and returns diagnostic info.
 * Admin-only — requires JWT from an allowed admin email.
 *
 * Body: { phone?, message?, action?: "sms" | "push" | "diagnostics" }
 */
import webpush from 'web-push';
import { verifyAuth, getSupabase } from '../lib/supabase.js';
import { trySms } from '../lib/sendSessionAlert.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO  = process.env.VAPID_MAILTO || 'mailto:hello@utahwindfinder.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

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
    const action = body?.action || 'sms';
    const phone = body?.phone;
    const message = body?.message || 'LiftForecast test alert — if you received this, alerts are working!';

    const supabase = getSupabase();

    const diagnostics = {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      vapidConfigured: !!(VAPID_PUBLIC && VAPID_PRIVATE),
      twilioFrom: process.env.TWILIO_FROM_NUMBER || null,
      smsA2pPending: !!(process.env.TWILIO_A2P_PENDING),
      usersWithPhone: 0,
      usersWithAlerts: 0,
      pushSubscribers: 0,
      smsOptedIn: 0,
    };

    try {
      const [phoneRes, alertRes, pushRes] = await Promise.all([
        supabase.from('user_preferences').select('id', { count: 'exact', head: true }).not('phone', 'is', null),
        supabase.from('user_preferences').select('id', { count: 'exact', head: true }).not('alerts', 'is', null),
        supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
      ]);
      diagnostics.usersWithPhone = phoneRes.count || 0;
      diagnostics.usersWithAlerts = alertRes.count || 0;
      diagnostics.pushSubscribers = pushRes.count || 0;

      const { data: verifiedRows } = await supabase
        .from('user_preferences')
        .select('alerts')
        .not('phone', 'is', null);
      diagnostics.smsOptedIn = (verifiedRows || []).filter(r => r.alerts?.sms_verified === true).length;
    } catch (err) {
      diagnostics.supabaseError = err.message;
    }

    if (action === 'diagnostics') {
      return res.status(200).json({ diagnostics });
    }

    if (action === 'push') {
      const userId = auth.user.id;
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('user_id', userId);

      if (!subs?.length) {
        return res.status(200).json({
          push: { success: false, reason: 'no-push-subscription' },
          diagnostics,
        });
      }

      if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        return res.status(200).json({
          push: { success: false, reason: 'vapid-not-configured' },
          diagnostics,
        });
      }

      let sent = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify({
              title: 'LiftForecast Test',
              body: message,
              icon: '/icons/icon-192x192.png',
              tag: 'admin-test-push',
            }),
          );
          sent++;
        } catch (err) {
          console.error('[admin/test-push]', err.message);
        }
      }

      return res.status(200).json({
        push: { success: sent > 0, sent, total: subs.length },
        diagnostics,
      });
    }

    // Default: SMS test
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
