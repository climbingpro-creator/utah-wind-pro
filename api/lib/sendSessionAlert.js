/**
 * Unified dispatcher for session-alert notifications.
 * Prefers SMS (Twilio) when a phone number is on file, falls back to web push.
 *
 * Env (optional — gracefully degrades):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO
 */
import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO  = process.env.VAPID_MAILTO || 'mailto:hello@utahwindfinder.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * @param {object} opts
 * @param {string}  [opts.phone]    - E.164 phone number
 * @param {object}  [opts.pushSub]  - Web push subscription JSON
 * @param {string}  opts.spotName   - Human-readable spot name
 * @param {string}  opts.message    - Pre-formatted alert body
 * @returns {Promise<{ method: 'sms'|'push'|'none', success: boolean }>}
 */
export async function sendSessionAlert({ phone, pushSub, spotName, message }) {
  if (phone) {
    const result = await trySms(phone, message);
    if (result.success) return result;
  }

  if (pushSub) {
    const result = await tryPush(pushSub, spotName, message);
    if (result.success) return result;
  }

  return { method: 'none', success: false };
}

/**
 * Format the punchy notification message.
 */
export function formatAlertMessage({ peakSpeed, discipline, spotName, dayLabel, startStr, endStr }) {
  return `LiftForecast: ${peakSpeed}mph ${discipline} session at ${spotName}! ${dayLabel} ${startStr}–${endStr}. Don't miss it.`;
}

// ── SMS via Twilio REST ──────────────────────────────────────

export async function trySms(phone, body) {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const tok  = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !tok || !from) {
    console.warn('[sendSessionAlert] Twilio not configured — SMS skipped');
    return { method: 'sms', success: false };
  }

  try {
    const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: body }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[sendSessionAlert] Twilio ${resp.status}: ${text}`);
      return { method: 'sms', success: false };
    }

    return { method: 'sms', success: true };
  } catch (err) {
    console.error('[sendSessionAlert] SMS error:', err.message);
    return { method: 'sms', success: false };
  }
}

// ── Web Push ────────────────────────────────────────────────

async function tryPush(pushSub, spotName, body) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[sendSessionAlert] VAPID not configured — push skipped');
    return { method: 'push', success: false };
  }

  try {
    const payload = JSON.stringify({
      title: `Session Alert: ${spotName}`,
      body,
      icon: '/icons/icon-192.png',
      tag: `session-alert-${spotName}`,
    });

    await webpush.sendNotification(pushSub, payload);
    return { method: 'push', success: true };
  } catch (err) {
    console.error('[sendSessionAlert] Push error:', err.message);
    return { method: 'push', success: false };
  }
}
