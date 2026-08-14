/**
 * POST /api/admin/reply-feedback
 *
 * Sends an email reply to a user_feedback row (when an email exists)
 * and stores the reply on the record.
 *
 * Body: { id, message, app: 'water'|'wind', markResolved?: boolean }
 */
import { verifyAuth, getSupabase } from '../lib/supabase.js';
import { sendEmail, buildFeedbackReplyEmail, emailConfig } from '../lib/email.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    const auth = await verifyAuth(req);
    if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
    if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { hasKey, from } = emailConfig();
    return res.status(200).json({ ok: true, hasResendKey: hasKey, emailFrom: from });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
  if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const id = body.id;
  const message = (body.message || '').trim();
  const app = body.app === 'wind' ? 'wind' : 'water';
  const markResolved = body.markResolved !== false;

  if (!id) return res.status(400).json({ error: 'Missing feedback id' });
  if (!message) return res.status(400).json({ error: 'Reply message is required' });

  const supabase = getSupabase();
  const { data: item, error: fetchErr } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !item) {
    return res.status(404).json({ error: fetchErr?.message || 'Feedback not found' });
  }

  const to = (item.user_email || '').trim();
  let emailed = false;
  let emailError = null;
  let emailFrom = emailConfig().from;
  let resendId = null;

  if (to) {
    const payload = buildFeedbackReplyEmail({
      app,
      originalMessage: item.message,
      replyBody: message,
    });
    const result = await sendEmail({
      to,
      subject: payload.subject,
      html: payload.html,
      replyTo: auth.user.email,
    });
    emailed = !!result.success;
    emailFrom = result.from || emailFrom;
    resendId = result.id || null;
    if (!result.success) emailError = result.error || 'Email send failed';
  }

  const now = new Date().toISOString();
  const patch = {
    admin_reply: message,
    replied_at: now,
    replied_by: auth.user.email,
    email_sent: emailed,
  };
  if (markResolved && (emailed || !to)) patch.status = 'resolved';
  else if (item.status === 'new') patch.status = 'reviewed';

  const { error: updateErr } = await supabase
    .from('user_feedback')
    .update(patch)
    .eq('id', id);

  if (updateErr) {
    console.warn('[reply-feedback] column update failed (run schema migration):', updateErr.message);
  }

  const payloadOut = {
    ok: true,
    emailed,
    needsMailto: !!(to && !emailed),
    error: emailError,
    from: emailFrom,
    hasResendKey: emailConfig().hasKey,
    resendId,
    saved: !updateErr,
    to: to || null,
    status: patch.status || item.status,
    admin_reply: message,
    replied_at: now,
    replied_by: auth.user.email,
    email_sent: emailed,
    anonymous: !to,
  };

  return res.status(200).json(payloadOut);
}
