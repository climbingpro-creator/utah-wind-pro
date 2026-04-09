/**
 * POST /api/sms-verify
 *
 * Two actions:
 *   { action: "send-code", phone: "+18015551234" }  — sends a 6-digit opt-in code
 *   { action: "verify",    code: "123456" }          — confirms the code, marks sms_verified
 *
 * Stores verification state in user_preferences.alerts JSONB to avoid schema changes.
 */
import { verifyAuth, getSupabase } from './lib/supabase.js';
import { trySms } from './lib/sendSessionAlert.js';

function toE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const userId = auth.user.id;
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const action = body?.action;
  const supabase = getSupabase();

  try {
    if (action === 'send-code') {
      const phone = toE164(body?.phone);
      if (!phone) return res.status(400).json({ error: 'Valid phone number required' });

      const code = String(Math.floor(100000 + Math.random() * 900000));

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('alerts')
        .eq('user_id', userId)
        .single();

      const alerts = existing?.alerts || {};
      alerts.sms_code = code;
      alerts.sms_code_sent_at = new Date().toISOString();
      alerts.sms_verified = false;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          phone,
          alerts,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      const smsResult = await trySms(
        phone,
        `LiftForecast verification code: ${code}\n\nReply STOP to opt out. Msg & data rates may apply.`
      );

      return res.status(200).json({
        sent: smsResult.success,
        reason: smsResult.success ? 'code-sent' : (smsResult.reason || 'sms-failed'),
      });
    }

    if (action === 'verify') {
      const code = String(body?.code || '').trim();
      if (!code || code.length !== 6) return res.status(400).json({ error: 'Enter 6-digit code' });

      const { data: row } = await supabase
        .from('user_preferences')
        .select('alerts, phone')
        .eq('user_id', userId)
        .single();

      if (!row) return res.status(404).json({ error: 'No preferences found' });

      const alerts = row.alerts || {};

      if (alerts.sms_code_sent_at) {
        const elapsed = Date.now() - new Date(alerts.sms_code_sent_at).getTime();
        if (elapsed > 10 * 60 * 1000) {
          return res.status(400).json({ error: 'Code expired — request a new one' });
        }
      }

      if (alerts.sms_code !== code) {
        return res.status(400).json({ error: 'Incorrect code' });
      }

      delete alerts.sms_code;
      delete alerts.sms_code_sent_at;
      alerts.sms_verified = true;
      alerts.sms_verified_at = new Date().toISOString();

      await supabase
        .from('user_preferences')
        .update({ alerts, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await trySms(
        row.phone,
        'You\'re verified! You\'ll now receive LiftForecast wind & weather alerts. Reply STOP anytime to unsubscribe.'
      );

      return res.status(200).json({ verified: true });
    }

    if (action === 'status') {
      const { data: row } = await supabase
        .from('user_preferences')
        .select('alerts, phone')
        .eq('user_id', userId)
        .single();

      return res.status(200).json({
        phone: row?.phone || null,
        verified: row?.alerts?.sms_verified === true,
        codePending: !!(row?.alerts?.sms_code),
      });
    }

    return res.status(400).json({ error: 'Unknown action — use send-code, verify, or status' });
  } catch (err) {
    console.error('[sms-verify]', err);
    return res.status(500).json({ error: err.message });
  }
}
