/**
 * POST /api/community/comment      — Add a comment
 * Body: { postId, body }
 *
 * GET  /api/community/comment?postId=xxx — Get comments for a post
 *
 * DELETE /api/community/comment?id=xxx   — Delete own comment
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const postId = req.query.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('community_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleCreate(req, res) {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.postId || !body?.body?.trim()) {
      return res.status(400).json({ error: 'postId and body required' });
    }

    const supabase = getSupabase();
    const { data: comment, error } = await supabase
      .from('community_post_comments')
      .insert({
        post_id: body.postId,
        user_id: auth.user.id,
        display_name: auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Angler',
        body: body.body.trim().slice(0, 500),
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ comment });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleDelete(req, res) {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const commentId = req.query.id;
  if (!commentId) return res.status(400).json({ error: 'Comment id required' });

  try {
    const supabase = getSupabase();
    const { data: row } = await supabase
      .from('community_post_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .maybeSingle();

    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (row.user_id !== auth.user.id) return res.status(403).json({ error: 'Not your comment' });

    await supabase.from('community_post_comments').delete().eq('id', commentId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
