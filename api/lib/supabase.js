/**
 * Shared Supabase client for Vercel serverless functions.
 * Uses the service-role key so the API can bypass RLS when needed.
 */
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

/**
 * Verify a Supabase JWT from the Authorization header.
 * Returns { user } on success, { error } on failure.
 */
export async function verifyAuth(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header', status: 401 };
  }

  const token = header.slice(7);
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { error: error?.message || 'Invalid token', status: 401 };
  }

  return { user: data.user };
}
