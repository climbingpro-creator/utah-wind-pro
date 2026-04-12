/**
 * /api/test-email
 *
 * POST — Send a test email to the authenticated admin user.
 * Query: ?template=morning|weekend|hatch&style=fly|spin|bait|all
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

function getSampleMorningSpots(style) {
  const styles = style === 'all' ? ['all'] : [style];
  const wantsFly = styles.includes('all') || styles.includes('fly');

  return [
    {
      name: 'Lower Provo River',
      score: 87,
      wind: 3, gust: 5, windDir: 'SW',
      temp: 58, waterTemp: 52,
      sky: 'overcast', skyLabel: 'Overcast',
      shortForecast: 'Mostly Cloudy then Partly Sunny',
      pressureTrend: 'falling', pressureGradient: -0.8,
      flowCfs: 320,
      topHatch: wantsFly ? 'BWO — 1-4 PM' : null,
      bestAction: style === 'spin' ? 'Cast small Rapalas through pools, swing spinners in current seams'
        : style === 'bait' ? 'Drift nightcrawlers through deeper runs and pool tailouts'
        : 'Nymph deep runs early, switch to emergers at peak hatch',
      waterType: 'river',
      depthZone: null,
      recommendations: {
        fly: styles.includes('all') || styles.includes('fly') ? ['Parachute Adams #18-20', 'RS2 #20-22', 'Sparkle Dun #18'] : null,
        spin: styles.includes('all') || styles.includes('spin') ? ['Panther Martin #4 (gold)', 'Blue Fox spinner #2', 'Small Rapala (rainbow trout)'] : null,
        bait: styles.includes('all') || styles.includes('bait') ? ['Nightcrawler (drift rig)', 'Salmon eggs (single hook)', 'PowerBait dough (below dam)'] : null,
      },
    },
    {
      name: 'Strawberry Reservoir',
      score: 72,
      wind: 2, gust: 4, windDir: 'NW',
      temp: 54, waterTemp: 48,
      sky: 'partly', skyLabel: 'Partly cloudy',
      shortForecast: 'Partly Sunny',
      pressureTrend: 'stable', pressureGradient: 0.1,
      flowCfs: null,
      topHatch: wantsFly ? 'Midges — Midday' : null,
      bestAction: style === 'spin' ? 'Slow-troll points with Kastmaster or tube jigs'
        : style === 'bait' ? 'Still-fish near drop-offs with PowerBait on bottom'
        : 'Glass conditions — sight-fish with long leaders and small flies',
      waterType: 'reservoir',
      depthZone: '20-50 ft',
      recommendations: {
        fly: styles.includes('all') || styles.includes('fly') ? ["Griffith's Gnat #20-24", 'Zebra Midge #20-22', 'Chironomid #18'] : null,
        spin: styles.includes('all') || styles.includes('spin') ? ['Kastmaster (gold)', 'Tube jig (white)', 'Rapala Countdown #7'] : null,
        bait: styles.includes('all') || styles.includes('bait') ? ['PowerBait (rainbow)', 'Nightcrawler (under float)', 'Salmon eggs'] : null,
      },
    },
    {
      name: 'Utah Lake',
      score: 64,
      wind: 9, gust: 14, windDir: 'S',
      temp: 68, waterTemp: 62,
      sky: 'clear', skyLabel: 'Clear skies',
      shortForecast: 'Sunny and Warm',
      pressureTrend: 'rising', pressureGradient: 0.5,
      flowCfs: null,
      topHatch: null,
      bestAction: style === 'spin' ? 'Cast crankbaits to rip-rap and weed lines'
        : style === 'bait' ? 'Fish near river mouths with cut shad or nightcrawlers'
        : 'Strip streamers along weed edges and drop-offs',
      waterType: 'lake',
      depthZone: '6-14 ft',
      recommendations: {
        fly: null,
        spin: styles.includes('all') || styles.includes('spin') ? ['Crankbait (shad pattern)', 'Ned Rig (green pumpkin)', 'Spinnerbait (white/chartreuse)'] : null,
        bait: styles.includes('all') || styles.includes('bait') ? ['Cut bait (shad)', 'Nightcrawler (on bottom)', 'Chicken liver'] : null,
      },
    },
  ];
}

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

function getSampleWeekendSpots(style) {
  const wantsFly = style === 'all' || style === 'fly';

  const satSpots = [
    { name: 'Lower Provo River', score: 85, wind: 'SW 5 mph', temp: '62°F', forecast: 'Partly Sunny, high near 64', precipChance: 10, hatchOutlook: wantsFly ? 'BWO (85%)' : null, flowCfs: 310, waterType: 'river', depthZone: null, tip: null },
    { name: 'Strawberry Reservoir', score: 70, wind: 'NW 4 mph', temp: '56°F', forecast: 'Mostly Sunny', precipChance: null, hatchOutlook: wantsFly ? 'Midges (80%)' : null, flowCfs: null, waterType: 'reservoir', depthZone: '20-50 ft', tip: style === 'spin' ? 'Troll spoons near inlets at dawn' : style === 'bait' ? 'Shore fish near inlets and structure' : null },
    { name: 'Utah Lake', score: 62, wind: 'W 8 mph', temp: '66°F', forecast: 'Sunny, breezy', precipChance: null, hatchOutlook: null, flowCfs: null, waterType: 'lake', depthZone: '6-14 ft', tip: style === 'spin' ? 'Cast crankbaits to windblown rip-rap' : style === 'bait' ? 'Shore fish river mouths for white bass' : null },
  ];

  const sunSpots = [
    { name: 'Lower Provo River', score: 78, wind: 'S 8 mph', temp: '58°F', forecast: 'Mostly Cloudy, chance of afternoon showers', precipChance: 40, hatchOutlook: wantsFly ? 'BWO (90%)' : null, flowCfs: 320, waterType: 'river', depthZone: null, tip: null },
    { name: 'Jordanelle Reservoir', score: 66, wind: 'SE 3 mph', temp: '55°F', forecast: 'Partly Sunny', precipChance: 15, hatchOutlook: null, flowCfs: null, waterType: 'reservoir', depthZone: '15-35 ft', tip: style === 'spin' ? 'Work rocky points with jigs early' : style === 'bait' ? 'Fish near dam structure with worms' : null },
    { name: 'Deer Creek Reservoir', score: 60, wind: 'W 10 mph', temp: '54°F', forecast: 'Partly Sunny, breezy', precipChance: 20, hatchOutlook: null, flowCfs: null, waterType: 'reservoir', depthZone: '20-45 ft', tip: style === 'spin' ? 'Night bite — jig rocky flats after dark' : style === 'bait' ? 'Fish the inlet channel with nightcrawlers' : null },
  ];

  return { satSpots, sunSpots };
}

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
  waterType: 'river',
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
  const style = req.query?.style || req.body?.style || 'all';
  const to = req.body?.to || auth.user.email;
  console.log(`[test-email] Sending "${template}" (style=${style}) to ${to} from ${auth.user.email}`);

  let emailPayload;
  switch (template) {
    case 'weekend': {
      const { satSpots, sunSpots } = getSampleWeekendSpots(style);
      emailPayload = buildWeekendReportEmail(satSpots, sunSpots, { bestDay: 'Saturday', warnings: [] });
      break;
    }
    case 'hatch':
      emailPayload = buildHatchAlertEmail('Lower Provo River', SAMPLE_HATCH, SAMPLE_HATCH_EXTRA);
      break;
    case 'morning':
    default:
      emailPayload = buildMorningBriefingEmail(
        getSampleMorningSpots(style),
        { ...SAMPLE_META, fishingStyle: [style] },
      );
      break;
  }

  const result = await sendEmail({
    to,
    subject: `[TEST] ${emailPayload.subject}`,
    html: emailPayload.html,
  });

  if (result.success) {
    return res.status(200).json({ ok: true, template, style, to });
  }
  return res.status(500).json({ error: result.error, template });
}
