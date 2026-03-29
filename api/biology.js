/**
 * Vercel Serverless — Gemini-powered biological profile generator.
 *
 * GET /api/biology?name=Sea+of+Cortez&type=ocean&lat=24.11&lng=-109.98
 *
 * Uses Gemini's structured JSON output to generate species, forage,
 * depth, and regulation data for any named body of water on Earth.
 * Returns a safe fallback if the API key is missing or the call fails.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name, type = 'lake', lat, lng } = req.query;
  if (!name) return res.status(400).json({ error: 'Water body name is required' });

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[biology] GEMINI_API_KEY not set — returning fallback');
    return res.status(200).json(buildFallback(name, type));
  }

  try {
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        species:     { type: SchemaType.STRING, description: 'Comma-separated list of 3-6 primary sport fish species for this specific location' },
        forage:      { type: SchemaType.STRING, description: 'Comma-separated list of primary forage organisms and baitfish' },
        targetDepth: { type: SchemaType.STRING, description: 'Recommended angling depth range with units, or structure type' },
        regulations: { type: SchemaType.STRING, description: 'Key fishing regulations, seasons, or permit requirements' },
      },
      required: ['species', 'forage', 'targetDepth', 'regulations'],
    };

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
    const prompt = `You are a marine biologist and fisheries expert. Generate a detailed biological and angling profile for the ${typeLabel} at or near: "${name}".${coordContext} Include the most important regional sport fish species that anglers target in this specific area, the primary local forage/baitfish, recommended depth or structure to fish, and any notable fishing regulations or permit requirements. Be specific to this exact geographic location — not generic.`;

    const result = await model.generateContent(prompt);
    const profile = JSON.parse(result.response.text());

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json(profile);
  } catch (error) {
    console.error('Gemini Biology Agent Error:', error.message || error);
    return res.status(200).json(buildFallback(name, type));
  }
}

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
