/**
 * POST /api/community/like   — Toggle like on a post
 * Body: { postId }
 *
 * GET  /api/community/like?postId=xxx — Get like count + whether current user liked
 */
import { getSupabase, verifyAuth } from '../lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com', 'https://liftforecast.com',
  'https://notwindy.com', 'https://www.notwindy.com',
  'https://utah-wind-pro.vercel.app', 'https://utah-water-glass.vercel.app',
];

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
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleToggle(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const postId = req.query.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });

    const supabase = getSupabase();
    const { count } = await supabase
      .from('community_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    let liked = false;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(header.slice(7));
      if (data?.user) {
        const { data: row } = await supabase
          .from('community_post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', data.user.id)
          .maybeSingle();
        liked = !!row;
      }
    }

    return res.status(200).json({ count: count || 0, liked });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleToggle(req, res) {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const postId = body?.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('community_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_post_likes').delete().eq('id', existing.id);
      const { count } = await supabase
        .from('community_post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return res.status(200).json({ liked: false, count: count || 0 });
    }

    await supabase.from('community_post_likes').insert({ post_id: postId, user_id: auth.user.id });
    const { count } = await supabase
      .from('community_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    return res.status(200).json({ liked: true, count: count || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
