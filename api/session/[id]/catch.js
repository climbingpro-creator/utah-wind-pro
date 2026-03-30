/**
 * POST /api/session/:id/catch
 *
 * Log a fish catch for a fishing session.
 * Body: { species?, weight_lbs?, length_in?, image?: "data:image/..." }
 */
import { getSupabase, verifyAuth } from '../../lib/supabase.js';
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://utahwindfinder.com',
  'https://utah-wind-pro.vercel.app',
  'https://utah-water-glass.vercel.app',
];

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = await verifyAuth(req);
  if (auth.error) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }

  const { id: sessionId } = req.query;
  if (!sessionId || sessionId.length < 10) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('kite_sessions')
      .select('id, activity_type')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let photoUrl = null;
    if (body.image) {
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
      const filePath = `${sessionId}/catch-${fileId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('session-photos')
        .upload(filePath, buf, { contentType, upsert: false });

      if (uploadErr) {
        console.error('[catch] photo upload error:', uploadErr.message);
      } else {
        const { data: urlData } = supabase.storage
          .from('session-photos')
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data: catchRow, error: insertErr } = await supabase
      .from('fish_catches')
      .insert({
        session_id: sessionId,
        species:    body.species || null,
        weight_lbs: body.weight_lbs || null,
        length_in:  body.length_in || null,
        photo_url:  photoUrl,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[catch] insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to save catch' });
    }

    return res.status(200).json({
      success: true,
      catchId: catchRow.id,
      photoUrl,
    });
  } catch (err) {
    console.error('[catch]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
