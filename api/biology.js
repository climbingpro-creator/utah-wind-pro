/**
 * Vercel Serverless — Gemini-powered biological profile generator.
 *
 * GET /api/biology?name=Lake+Tahoe&type=lake
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

  const { name, type = 'lake' } = req.query;
  if (!name) return res.status(400).json({ error: 'Water body name is required' });

  try {
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        species:     { type: SchemaType.STRING, description: 'Dominant sport fish species' },
        forage:      { type: SchemaType.STRING, description: 'Primary food source or baitfish' },
        targetDepth: { type: SchemaType.STRING, description: 'Recommended depth or structure' },
        regulations: { type: SchemaType.STRING, description: 'Brief note on limits or rules' },
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
    const prompt = `You are a marine biologist and fisheries expert API. Generate the biological profile for the ${typeLabel} named: "${name}". Include region-specific sport fish species, local forage/baitfish, recommended angling depths or structure, and any notable fishing regulations for this specific body of water.`;
    const result = await model.generateContent(prompt);

    const profile = JSON.parse(result.response.text());

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json(profile);
  } catch (error) {
    console.error('Gemini Biology Agent Error:', error);
    return res.status(200).json({
      species: 'Unknown species',
      forage: 'Local baitfish and insects',
      targetDepth: 'Variable',
      regulations: 'Check local wildlife department.',
    });
  }
}
