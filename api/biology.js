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
  species:     { type: SchemaType.STRING, description: 'Comma-separated list of 3-6 primary sport fish species for this specific location' },
  forage:      { type: SchemaType.STRING, description: 'Comma-separated list of primary forage organisms and baitfish' },
  targetDepth: { type: SchemaType.STRING, description: 'Recommended angling depth range with units, or structure type' },
  regulations: { type: SchemaType.STRING, description: 'Key fishing regulations, seasons, or permit requirements' },
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
    required: ['species', 'forage', 'targetDepth', 'regulations'],
  };
}

// ─── Image Fetcher ───────────────────────────────────────────

async function fetchImageAsBase64(url) {
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

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[biology] GEMINI_API_KEY not set — returning fallback');
    return res.status(200).json(buildFallback(name, type));
  }

  try {
    // Attempt to fetch satellite image if URL provided
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
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
      },
    });

    const typeLabel = type === 'ocean' ? 'ocean/sea' : type;
    const coordContext = lat && lng ? ` The coordinates are ${lat}, ${lng}.` : '';

    const textPrompt = hasImage
      ? `You are a geospatial marine analyst and fisheries expert. Analyze the provided satellite image of the ${typeLabel} at or near: "${name}".${coordContext} Identify water clarity, visible submerged structures (reefs, weed beds, drop-offs, channels), bank accessibility, and color gradients that indicate depth changes or thermoclines. Also provide the biological and angling profile: the most important regional sport fish species, primary forage/baitfish, recommended depth or structure to fish, and any notable regulations. Give one specific tactical clue for an angler based on what you see in the image. Rate habitat complexity from 1-10.`
      : `You are a marine biologist and fisheries expert. Generate a detailed biological and angling profile for the ${typeLabel} at or near: "${name}".${coordContext} Include the most important regional sport fish species that anglers target in this specific area, the primary local forage/baitfish, recommended depth or structure to fish, and any notable fishing regulations or permit requirements. Be specific to this exact geographic location — not generic.`;

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
    console.error('Gemini Biology Agent Error:', error.message || error);
    return res.status(200).json(buildFallback(name, type));
  }
}

// ─── Fallback ────────────────────────────────────────────────

function buildFallback(name, type) {
  if (type === 'ocean') {
    return {
      species: 'Roosterfish, Dorado (Mahi-Mahi), Yellowtail, Marlin, Snapper',
      forage: 'Sardines, mackerel, squid, flying fish',
      targetDepth: '30-200 ft (nearshore reefs to blue water)',
      regulations: 'Check local marine authority for permits and bag limits',
      _fallback: true,
    };
  }
  return {
    species: 'Local game fish',
    forage: 'Regional baitfish and aquatic insects',
    targetDepth: 'Variable — check local reports',
    regulations: 'Check local wildlife department for limits and seasons',
    _fallback: true,
  };
}
