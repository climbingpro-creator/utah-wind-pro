/**
 * POST /api/community/condition-report — Submit a weather accuracy vote
 * Body: { locationId, vote: "lighter"|"spot-on"|"stronger" }
 *
 * GET  /api/community/condition-report?locationId=xxx — Get recent vote tallies
 */
import { getSupabase } from '../lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://liftforecast.com',
  'https://notwindy.com',
  'https://www.notwindy.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

const VALID_VOTES = ['lighter', 'spot-on', 'stronger'];

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') return handleSubmit(req, res);
  if (req.method === 'GET') return handleTallies(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSubmit(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { locationId, vote } = body || {};

    if (!locationId || !VALID_VOTES.includes(vote)) {
      return res.status(400).json({ error: 'locationId and valid vote (lighter, spot-on, stronger) required' });
    }

    const supabase = getSupabase();

    // Optionally extract user from auth header if present
    let userId = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(header.slice(7));
      userId = data?.user?.id || null;
    }

    const { error } = await supabase
      .from('condition_reports')
      .insert({ location_id: locationId, vote, user_id: userId });

    if (error) {
      console.error('[condition-report] insert error:', error.message);
      return res.status(500).json({ error: `Failed to save report: ${error.message}` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[condition-report]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function handleTallies(req, res) {
  try {
    const locationId = req.query.locationId;
    if (!locationId) return res.status(400).json({ error: 'locationId required' });

    const supabase = getSupabase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('condition_reports')
      .select('vote')
      .eq('location_id', locationId)
      .gte('created_at', since);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const tallies = { lighter: 0, 'spot-on': 0, stronger: 0, total: 0 };
    for (const row of data || []) {
      if (tallies[row.vote] !== undefined) tallies[row.vote]++;
      tallies.total++;
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json(tallies);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
