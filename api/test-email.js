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
  {
    name: 'Lower Provo River',
    score: 87,
    wind: 3,
    gust: 5,
    windDir: 'SW',
    temp: 58,
    waterTemp: 52,
    sky: 'overcast',
    skyLabel: 'Overcast',
    shortForecast: 'Mostly Cloudy then Partly Sunny',
    pressureTrend: 'falling',
    pressureGradient: -0.8,
    flowCfs: 320,
    topHatch: 'BWO — 1-4 PM',
    bestAction: 'Nymph deep runs early, switch to emergers at peak hatch',
  },
  {
    name: 'Strawberry Reservoir',
    score: 72,
    wind: 2,
    gust: 4,
    windDir: 'NW',
    temp: 54,
    waterTemp: 48,
    sky: 'partly',
    skyLabel: 'Partly cloudy',
    shortForecast: 'Partly Sunny',
    pressureTrend: 'stable',
    pressureGradient: 0.1,
    flowCfs: null,
    topHatch: 'Midges — Midday',
    bestAction: 'Glass conditions — sight-fish with long leaders and small flies',
  },
  {
    name: 'Green River — A Section',
    score: 64,
    wind: 9,
    gust: 14,
    windDir: 'S',
    temp: 62,
    waterTemp: 50,
    sky: 'clear',
    skyLabel: 'Clear skies',
    shortForecast: 'Sunny',
    pressureTrend: 'rising',
    pressureGradient: 0.5,
    flowCfs: 800,
    topHatch: 'Caddis — 4-8 PM',
    bestAction: 'Swing soft hackles through riffles, switch to dry at dusk',
  },
];

const SAMPLE_META = {
  sunrise: '6:42 AM',
  sunset: '8:14 PM',
  warnings: [
    {
      event: 'Wind Advisory',
      headline: 'Wind Advisory in effect until 6 PM MDT for western Utah valleys',
      severity: 'Moderate',
      areas: 'Utah County, Salt Lake County',
    },
  ],
};

const SAMPLE_SAT_SPOTS = [
  { name: 'Lower Provo River', score: 85, wind: 'SW 5 mph', temp: '62°F', forecast: 'Partly Sunny, high near 64', precipChance: 10, hatchOutlook: 'BWO (85%)', flowCfs: 310 },
  { name: 'Strawberry Reservoir', score: 70, wind: 'NW 4 mph', temp: '56°F', forecast: 'Mostly Sunny', precipChance: null, hatchOutlook: 'Midges (80%)', flowCfs: null },
  { name: 'Weber River', score: 65, wind: 'W 8 mph', temp: '60°F', forecast: 'Partly Cloudy', precipChance: 20, hatchOutlook: 'Caddis (65%)', flowCfs: 180 },
];

const SAMPLE_SUN_SPOTS = [
  { name: 'Lower Provo River', score: 78, wind: 'S 8 mph', temp: '58°F', forecast: 'Mostly Cloudy, chance of afternoon showers', precipChance: 40, hatchOutlook: 'BWO (90%)', flowCfs: 320 },
  { name: 'Green River — A Section', score: 74, wind: 'SE 3 mph', temp: '65°F', forecast: 'Sunny, high near 68', precipChance: null, hatchOutlook: 'Caddis (70%)', flowCfs: 790 },
  { name: 'Jordanelle Reservoir', score: 60, wind: 'W 12 mph', temp: '54°F', forecast: 'Partly Sunny, breezy', precipChance: 15, hatchOutlook: null, flowCfs: null },
];

const SAMPLE_WEEKEND_META = {
  bestDay: 'Saturday',
  warnings: [],
};

const SAMPLE_HATCH = {
  insect: 'Blue Winged Olive (BWO)',
  likelihood: 90,
  peakTime: '1-4 PM',
  notes: 'Baetis love low light — overcast days trigger heavy emergence. Size 18-20 parachute patterns.',
};

const SAMPLE_HATCH_EXTRA = {
  conditions: {
    wind: 'SW 4 mph',
    temp: '56°F',
    waterTemp: '51°F',
    sky: 'Overcast',
    pressure: 'falling',
  },
  secondaryHatches: [
    { insect: 'Midges', likelihood: 75, peakTime: 'Midday' },
    { insect: 'Caddis', likelihood: 50, peakTime: '5-8 PM' },
  ],
  flyPatterns: [
    'Parachute Adams #18-20',
    'RS2 #20-22',
    'Sparkle Dun #18',
  ],
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
  console.log(`[test-email] Sending "${template}" to ${to} from ${auth.user.email}`);

  let emailPayload;
  switch (template) {
    case 'weekend':
      emailPayload = buildWeekendReportEmail(SAMPLE_SAT_SPOTS, SAMPLE_SUN_SPOTS, SAMPLE_WEEKEND_META);
      break;
    case 'hatch':
      emailPayload = buildHatchAlertEmail('Lower Provo River', SAMPLE_HATCH, SAMPLE_HATCH_EXTRA);
      break;
    case 'morning':
    default:
      emailPayload = buildMorningBriefingEmail(SAMPLE_SPOTS, SAMPLE_META);
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
