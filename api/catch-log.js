/**
 * /api/catch-log
 *
 * POST            — Log a new catch (auto-backfills weather)
 * GET             — Fetch user's catch history (with filters)
 * GET ?patterns=1 — Analyze personal patterns
 *
 * Pro-only endpoint.
 */
import { verifyAuth, getSupabase } from './lib/supabase.js';
import { backfillWeather } from './lib/weather-backfill.js';
import { analyzePatterns } from './lib/pattern-analyzer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
  const userId = auth.user.id;
  const sb = getSupabase();

  // Verify Pro status
  const { data: sub } = await sb
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', userId)
    .single();

  const isPro = sub?.tier === 'pro' && sub?.status === 'active'
    && (!sub?.current_period_end || new Date(sub.current_period_end) > new Date());

  if (!isPro) {
    return res.status(403).json({ error: 'Pro subscription required' });
  }

  try {
    if (req.method === 'POST') return await logCatch(req, res, sb, userId);
    if (req.method === 'GET' && req.query?.patterns === '1') return await getPatterns(res, sb, userId);
    if (req.method === 'GET') return await getCatches(req, res, sb, userId);
    if (req.method === 'DELETE') return await deleteCatch(req, res, sb, userId);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[catch-log]', err);
    return res.status(500).json({ error: err.message });
  }
}

async function logCatch(req, res, sb, userId) {
  const { locationId, species, photoUrl, caughtAt, lat, lng, notes } = req.body || {};
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  const timestamp = caughtAt || new Date().toISOString();

  // Auto-backfill weather conditions
  let weather = {};
  try {
    weather = await backfillWeather(locationId, timestamp);
  } catch (err) {
    console.warn('[catch-log] Weather backfill failed:', err.message);
  }

  const { data, error } = await sb
    .from('catch_log')
    .insert({
      user_id: userId,
      location_id: locationId,
      species: species || null,
      photo_url: photoUrl || null,
      caught_at: timestamp,
      lat: lat || null,
      lng: lng || null,
      notes: notes || null,
      ...weather,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ catch: data });
}

async function getCatches(req, res, sb, userId) {
  const { locationId, species, startDate, endDate, limit: rawLimit, offset: rawOffset } = req.query || {};
  const limit = Math.min(parseInt(rawLimit) || 50, 200);
  const offset = parseInt(rawOffset) || 0;

  let query = sb
    .from('catch_log')
    .select('*')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (locationId) query = query.eq('location_id', locationId);
  if (species) query = query.eq('species', species);
  if (startDate) query = query.gte('caught_at', startDate);
  if (endDate) query = query.lte('caught_at', endDate);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ catches: data || [], offset, limit });
}

async function getPatterns(res, sb, userId) {
  const { data, error } = await sb
    .from('catch_log')
    .select('*')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  const analysis = analyzePatterns(data || []);
  return res.status(200).json(analysis);
}

async function deleteCatch(req, res, sb, userId) {
  const { catchId } = req.body || {};
  if (!catchId) return res.status(400).json({ error: 'catchId required' });

  const { error } = await sb
    .from('catch_log')
    .delete()
    .eq('id', catchId)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
