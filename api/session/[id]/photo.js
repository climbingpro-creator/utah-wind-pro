/**
 * POST /api/session/:id/photo
 *
 * Accepts a base64-encoded image (JSON body) and uploads it to
 * Supabase Storage, then inserts a row into session_photos.
 *
 * Body: { image: "data:image/jpeg;base64,...", caption?: string }
 */
import { getSupabase } from '../../lib/supabase.js';
import crypto from 'crypto';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { id: sessionId } = req.query;
  if (!sessionId || sessionId.length < 10) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.image) {
      return res.status(400).json({ error: 'image field required (data URI or base64 string)' });
    }

    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('kite_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

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
    const fileId = crypto.randomUUID();
    const filePath = `${sessionId}/${fileId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('session-photos')
      .upload(filePath, buf, { contentType, upsert: false });

    if (uploadErr) {
      console.error('[photo] upload error:', uploadErr.message);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }

    const { data: urlData } = supabase.storage
      .from('session-photos')
      .getPublicUrl(filePath);

    const photoUrl = urlData.publicUrl;

    const { data: photo, error: insertErr } = await supabase
      .from('session_photos')
      .insert({
        session_id: sessionId,
        photo_url:  photoUrl,
        caption:    body.caption || null,
        is_cover:   !!body.is_cover,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[photo] insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to save photo record' });
    }

    return res.status(200).json({
      success: true,
      photoId: photo.id,
      photoUrl,
    });
  } catch (err) {
    console.error('[photo]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
