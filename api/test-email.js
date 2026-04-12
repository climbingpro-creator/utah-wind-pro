/**
 * /api/test-email
 *
 * POST — Send a test email to the authenticated admin user.
 * Query: ?template=morning|weekend|hatch (defaults to morning)
 *
 * Admin-only endpoint.
 */
import { verifyAuth } from './lib/supabase.js';
import {
  sendEmail,
  buildMorningBriefingEmail,
  buildWeekendReportEmail,
  buildHatchAlertEmail,
} from './lib/email.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

const SAMPLE_SPOTS = [
  { name: 'Lower Provo River', score: 87, wind: 3, detail: 'Pressure dropping — fish feeding' },
  { name: 'Strawberry Reservoir', score: 72, wind: 6, detail: 'Glass conditions until 10 AM' },
  { name: 'Green River — A Section', score: 64, wind: 9, detail: 'BWO hatch likely this afternoon' },
];

const SAMPLE_HATCH = {
  insect: 'Blue Winged Olive (BWO)',
  likelihood: 90,
  peakTime: '1-4 PM',
  notes: 'Baetis love low light — overcast days trigger heavy emergence. Size 18-20 parachute patterns.',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const template = req.query?.template || req.body?.template || 'morning';
  const to = req.body?.to || auth.user.email;

  let emailPayload;
  switch (template) {
    case 'weekend':
      emailPayload = buildWeekendReportEmail(SAMPLE_SPOTS, SAMPLE_SPOTS);
      break;
    case 'hatch':
      emailPayload = buildHatchAlertEmail('Lower Provo River', SAMPLE_HATCH);
      break;
    case 'morning':
    default:
      emailPayload = buildMorningBriefingEmail(SAMPLE_SPOTS);
      break;
  }

  const result = await sendEmail({
    to,
    subject: `[TEST] ${emailPayload.subject}`,
    html: emailPayload.html,
  });

  if (result.success) {
    return res.status(200).json({ ok: true, template, to });
  }
  return res.status(500).json({ error: result.error, template });
}
