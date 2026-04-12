/**
 * POST /api/community/post — Create a community catch post with photo
 * Body: { image: "data:image/jpeg;base64,...", caption?, locationId?, locationName?, species? }
 *
 * GET  /api/community/post — Fetch the community feed (newest first)
 * Query: ?limit=20&offset=0
 */
import { getSupabase, verifyAuth } from '../lib/supabase.js';
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://liftforecast.com',
  'https://notwindy.com',
  'https://www.notwindy.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

export const config = { api: { bodyParser: { sizeLimit: '4.5mb' } } };

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

  if (req.method === 'GET') return handleFeed(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleFeed(_req, res) {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(_req.query.limit) || 20, 50);
    const offset = parseInt(_req.query.offset) || 0;

    const { data, error, count } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[community] feed error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch feed' });
    }

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ posts: data || [], total: count || 0 });
  } catch (err) {
    console.error('[community] feed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function handleCreate(req, res) {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.image) {
      return res.status(400).json({ error: 'image field required (data URI or base64)' });
    }

    const supabase = getSupabase();

    let base64 = body.image;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (base64.startsWith('data:')) {
      const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        base64 = match[2];
        ext = contentType.split('/')[1] === 'png' ? 'png' : 'jpg';
      }
    }

    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 4MB)' });
    }

    const fileId = crypto.randomUUID();
    const filePath = `community/${fileId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('session-photos')
      .upload(filePath, buf, { contentType, upsert: false });

    if (uploadErr) {
      console.error('[community] upload error:', uploadErr.message);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }

    const { data: urlData } = supabase.storage
      .from('session-photos')
      .getPublicUrl(filePath);

    const { data: post, error: insertErr } = await supabase
      .from('community_posts')
      .insert({
        user_id: auth.user.id,
        user_email: auth.user.email,
        display_name: auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Angler',
        photo_url: urlData.publicUrl,
        caption: (body.caption || '').slice(0, 500),
        location_id: body.locationId || null,
        location_name: body.locationName || null,
        species: body.species || null,
      })
      .select('id, photo_url, created_at')
      .single();

    if (insertErr) {
      console.error('[community] insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to save post' });
    }

    return res.status(200).json({ success: true, post });
  } catch (err) {
    console.error('[community] create:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function handleDelete(req, res) {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });

  const postId = req.query.id;
  if (!postId) return res.status(400).json({ error: 'Post ID required' });

  try {
    const supabase = getSupabase();

    const { data: post } = await supabase
      .from('community_posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== auth.user.id) return res.status(403).json({ error: 'Not your post' });

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) return res.status(500).json({ error: 'Failed to delete' });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
