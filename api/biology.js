/**
 * Vercel Serverless — Gemini multimodal biological + visual profile generator.
 *
 * GET /api/biology?name=Strawberry+Reservoir&type=lake&lat=40.17&lng=-111.11
 * GET /api/biology?name=Gulf+of+Mexico&type=ocean&lat=27.78&lng=-96.87&imageUrl=https://...
 *
 * When an `imageUrl` is provided, fetches the satellite image, encodes it as
 * base64 inlineData, and sends it alongside the text prompt to Gemini 2.5 Flash
 * for multimodal geospatial analysis (water clarity, structure, habitat).
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Schema ──────────────────────────────────────────────────

const BASE_PROPERTIES = {
  species:        { type: SchemaType.STRING, description: 'Comma-separated list of 3-6 primary sport fish species for this specific location' },
  forage:         { type: SchemaType.STRING, description: 'Comma-separated list of primary forage organisms and baitfish' },
  forageProfile:  { type: SchemaType.STRING, description: 'Detailed forage description: for each major baitfish/forage species, include typical size range (inches) and coloring/pattern so an angler can match lures. Example: "Pacific Sardine (4-7in, silver-blue back), Northern Anchovy (3-5in, translucent silver), Market Squid (3-8in, white/pink iridescent)"' },
  seasonalForage: { type: SchemaType.STRING, description: 'Month-by-month or seasonal breakdown of which forage species are most abundant and available in this area. Example: "Spring: anchovy schools peak nearshore. Summer: squid spawn runs, sardine bait balls. Fall: mackerel move inshore. Winter: herring runs, fewer baitfish."' },
  pelagicCalendar: { type: SchemaType.STRING, description: 'Seasonal migration calendar of pelagic or migratory game fish passing through this specific area. Example: "May-Jun: Yellowtail arrive from south. Jul-Sep: Dorado push north, Marlin peak. Oct-Nov: Bluefin tuna move through. Winter: Gray whales transit, limited pelagic activity."' },
  targetDepth:    { type: SchemaType.STRING, description: 'Recommended angling depth range with units, or structure type' },
  regulations:    { type: SchemaType.STRING, description: 'Key fishing regulations, seasons, or permit requirements' },

  lureRecommendations: { type: SchemaType.STRING, description: 'Top 3-5 specific conventional lure recommendations for RIGHT NOW based on current forage, water temp, clarity, and time of year. Include lure type, size, and color. Example: "3/8oz white spinnerbait (match shad), 4in green pumpkin Senko (finesse for pressured fish), 1/2oz chartreuse crankbait (stained water), jerkbait in ghost minnow (cold water suspending)"' },
  flySelections:       { type: SchemaType.STRING, description: 'Top 3-5 fly patterns for fly fishing RIGHT NOW. Include pattern name, hook size, and why. For rivers: match current insect hatches (dry flies, nymphs, emergers, streamers). For lakes: match forage (leeches, scuds, minnow patterns, chironomids). Example: "Size 16 Parachute Adams (PMD hatch), Size 18 RS2 emerger (BWO), Size 10 Woolly Bugger olive (streamer for browns), Size 14 Copper John (all-purpose nymph)"' },
  tackleGuide:         { type: SchemaType.STRING, description: 'Recommended tackle setup: rod weight/length, line type (mono/fluoro/braid), leader/tippet, and terminal gear. Example: "Medium-light 6\'6\" spinning rod, 6lb fluorocarbon, size 6 hook. Fly: 5wt 9ft rod, 5X tippet, floating line with 9ft leader."' },
  seasonalDepthPattern: { type: SchemaType.STRING, description: 'Where fish are holding in the water column RIGHT NOW based on season, thermocline, and water temp. Be specific about depth ranges and structure. Example: "Late March: fish transitioning from deep winter holds (30-50ft) to pre-spawn staging areas (8-15ft) near rocky points. Thermocline forming at 20ft. Morning: shallow flats. Afternoon: drop-offs and shaded banks."' },
  activeSpeciesNow:    { type: SchemaType.STRING, description: 'Which specific species are most active and catchable RIGHT NOW based on current month and water conditions. Include what they are doing (spawning, feeding, staging). Example: "Rainbow trout: very active pre-spawn, aggressive on streamers. Brown trout: moderate, holding deep. Largemouth bass: staging on secondary points pre-spawn. Crappie: moving to brush piles in 8-12ft."' },
};

const VISUAL_PROPERTIES = {
  visualAnalysis:    { type: SchemaType.STRING, description: 'What you observe in the satellite image: water clarity, color gradients, visible structure, shoreline features' },
  clue:              { type: SchemaType.STRING, description: 'One specific tactical recommendation for an angler based on visible features (e.g. "Target the dark weed bed 50 yards off the north point")' },
  habitatComplexity: { type: SchemaType.NUMBER, description: 'Habitat complexity rating 1-10 based on visible structure, cover, depth variation, and shoreline irregularity' },
};

function buildSchema(hasImage) {
  return {
    type: SchemaType.OBJECT,
    properties: hasImage
      ? { ...BASE_PROPERTIES, ...VISUAL_PROPERTIES }
      : BASE_PROPERTIES,
    required: ['species', 'forage', 'forageProfile', 'seasonalForage', 'pelagicCalendar', 'targetDepth', 'regulations', 'lureRecommendations', 'flySelections', 'tackleGuide', 'seasonalDepthPattern', 'activeSpeciesNow'],
  };
}

// ─── Image Fetcher ───────────────────────────────────────────

const ALLOWED_IMAGE_HOSTS = [
  'server.arcgisonline.com',
  'services.arcgisonline.com',
  'api.mapbox.com',
  'mt1.google.com',
  'mt0.google.com',
];

function isAllowedImageUrl(urlString) {
  try {
    const { hostname, protocol } = new URL(urlString);
    return protocol === 'https:' && ALLOWED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

async function fetchImageAsBase64(url) {
  if (!isAllowedImageUrl(url)) {
    throw new Error('Image URL not in allowlist');
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return {
    base64: Buffer.from(buf).toString('base64'),
    mimeType: res.headers.get('content-type') || 'image/jpeg',
  };
}

// ─── Handler ─────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name, type = 'lake', lat, lng, imageUrl } = req.query;
  if (!name) return res.status(400).json({ error: 'Water body name is required' });

  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return res.status(400).json({ error: 'Invalid image source. Only approved satellite tile providers are allowed.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[biology] GEMINI_API_KEY not set — returning fallback');
    return res.status(200).json(buildFallback(name, type));
  }

  try {
    let imageData = null;
    if (imageUrl) {
      try {
        imageData = await fetchImageAsBase64(imageUrl);
        if (imageData) console.log('[biology] Satellite image loaded:', imageData.mimeType, `${(imageData.base64.length / 1024).toFixed(0)}KB base64`);
      } catch (e) {
        console.warn('[biology] Image fetch failed, continuing text-only:', e.message);
      }
    }

    const hasImage = imageData != null;
    const responseSchema = buildSchema(hasImage);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
      },
    });

    const typeLabel = type === 'ocean' ? 'ocean/sea' : type;
    const coordContext = lat && lng ? ` The coordinates are ${lat}, ${lng}.` : '';
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = monthNames[new Date().getMonth()];

    const isFreshwater = type === 'lake' || type === 'river';

    const forageInstructions = `
For the forage profile: describe each major baitfish/forage species with its typical SIZE RANGE in inches and COLORING/PATTERN so an angler can select the correct lure color and size.
For the seasonal forage: describe which forage species are most available during each season or month, with emphasis on what is happening RIGHT NOW in ${currentMonth}.
For the pelagic calendar: ${isFreshwater ? 'describe seasonal fish movement patterns — spawning runs, stocking schedules, and species migrations within this water body by season' : 'describe which migratory or pelagic game fish species pass through this area during each season'}, highlighting what is happening RIGHT NOW in ${currentMonth}.`;

    const artificialOnlyWaters = [
      'provo river', 'lower provo', 'middle provo', 'upper provo',
      'green river', 'logan river', 'blacksmith fork', 'weber river',
      'ogden river', 'whitewater', 'huntington creek', 'fish creek',
      'currant creek', 'right fork', 'left fork', 'red butte creek',
      'city creek', 'emigration creek', 'mill creek', 'parleys creek',
      'strawberry river',
    ];
    const nameLower = name.toLowerCase();
    const isArtificialOnly = artificialOnlyWaters.some(w => nameLower.includes(w));
    const gearConstraint = isArtificialOnly
      ? `\n\nCRITICAL REGULATION: "${name}" is ARTIFICIAL FLIES AND LURES ONLY — NO BAIT. Do NOT recommend PowerBait, worms, nightcrawlers, corn, live bait, or any natural bait. Only recommend artificial lures (spoons, spinners, crankbaits, soft plastics) and fly patterns.`
      : '';

    const anglerInstructions = `
For lure recommendations: give 3-5 SPECIFIC conventional lure/bait selections for RIGHT NOW (${currentMonth}). Include type, size, and color that matches the current forage and water conditions.${gearConstraint}
For fly selections: give 3-5 SPECIFIC fly patterns for fly fishing RIGHT NOW. ${isFreshwater ? 'For rivers match the active insect hatches (dries, nymphs, emergers). For lakes match the forage base (streamers, chironomids, leeches, scuds).' : 'Include saltwater fly patterns like Clousers, Deceivers, crab patterns.'} Include pattern name, hook size, and reasoning.
For tackle guide: recommend specific rod/reel/line setup for both conventional and fly fishing at this location. Include line weight, leader size, and terminal tackle.
For seasonal depth pattern: describe EXACTLY where fish are positioned in the water column RIGHT NOW in ${currentMonth}. Include depth ranges, structure types, and time-of-day movement patterns.
For active species now: list which species are most catchable RIGHT NOW and what they are doing (spawning, staging, feeding, holding deep, etc.).`;

    const textPrompt = hasImage
      ? `You are a geospatial marine analyst and fisheries expert. Analyze the provided satellite image of the ${typeLabel} at or near: "${name}".${coordContext} It is currently ${currentMonth}. Identify water clarity, visible submerged structures (reefs, weed beds, drop-offs, channels), bank accessibility, and color gradients that indicate depth changes or thermoclines. Provide the biological and angling profile: the most important regional sport fish species, primary forage/baitfish with sizes and colors, recommended depth, and regulations.${forageInstructions}${anglerInstructions} Give one specific tactical clue for an angler based on what you see in the image. Rate habitat complexity from 1-10.`
      : `You are a marine biologist and fisheries expert. Generate a detailed biological and angling profile for the ${typeLabel} at or near: "${name}".${coordContext} It is currently ${currentMonth}. Include the most important regional sport fish species that anglers target in this specific area, recommended depth or structure to fish, and notable fishing regulations. Be specific to this exact geographic location — not generic.${forageInstructions}${anglerInstructions}`;

    // Build the content parts array
    const parts = [textPrompt];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.base64,
        },
      });
    }

    const result = await model.generateContent(parts);
    const profile = JSON.parse(result.response.text());

    if (hasImage) profile._visual = true;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json(profile);
  } catch (error) {
    const errMsg = error?.message || String(error);
    console.error('Gemini Biology Agent Error:', errMsg);
    const fb = buildFallback(name, type);
    fb._error = errMsg;
    return res.status(200).json(fb);
  }
}

// ─── Fallback ────────────────────────────────────────────────

function buildFallback(name, type) {
  const shared = {
    lureRecommendations: 'Check local tackle shop for current recommendations',
    flySelections: 'Check local fly shop for current hatch chart',
    tackleGuide: 'Medium-action rod appropriate for target species',
    seasonalDepthPattern: 'Variable — check local reports for current depth patterns',
    activeSpeciesNow: 'Check local reports for current species activity',
    _fallback: true,
  };

  if (type === 'ocean') {
    return {
      species: 'Roosterfish, Dorado (Mahi-Mahi), Yellowtail, Marlin, Snapper',
      forage: 'Sardines, mackerel, squid, flying fish',
      forageProfile: 'Sardine (4-7in, silver-blue back), Mackerel (6-10in, green-blue bars), Squid (3-8in, white/pink)',
      seasonalForage: 'Check local bait reports for current conditions',
      pelagicCalendar: 'Check local charter reports for current pelagic activity',
      targetDepth: '30-200 ft (nearshore reefs to blue water)',
      regulations: 'Check local marine authority for permits and bag limits',
      ...shared,
    };
  }
  return {
    species: 'Local game fish',
    forage: 'Regional baitfish and aquatic insects',
    forageProfile: 'Check local reports for current forage sizes and patterns',
    seasonalForage: 'Check local reports for seasonal forage availability',
    pelagicCalendar: 'No significant pelagic migrations for inland waters',
    targetDepth: 'Variable — check local reports',
    regulations: 'Check local wildlife department for limits and seasons',
    ...shared,
  };
}
