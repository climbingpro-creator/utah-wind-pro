/**
 * GET /api/admin/users
 *
 * Returns a detailed user list for the admin dashboard.
 * Joins auth users with subscriptions, preferences, and push subscriptions.
 * Requires admin JWT.
 */
import { verifyAuth, getSupabase } from '../lib/supabase.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await verifyAuth(req);
    if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
    if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = getSupabase();

    const [authResult, subsResult, prefsResult, pushResult, sessionsResult] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('subscriptions').select('user_id, tier, status, current_period_end, app'),
      supabase.from('user_preferences').select('user_id, alerts, favorite_spots, created_at, updated_at'),
      supabase.from('push_subscriptions').select('user_id'),
      supabase.from('kite_sessions').select('user_id, created_at, activity_type').order('created_at', { ascending: false }).limit(5000),
    ]);

    const authUsers = authResult.data?.users || [];
    const subsAll = subsResult.data || [];
    const subsByUser = {};
    for (const s of subsAll) {
      if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
      subsByUser[s.user_id].push(s);
    }
    const prefs = new Map((prefsResult.data || []).map(p => [p.user_id, p]));
    const pushUsers = new Set((pushResult.data || []).map(p => p.user_id));

    const sessionsByUser = {};
    for (const s of (sessionsResult.data || [])) {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);
    }

    const users = authUsers.map(u => {
      const userSubs = subsByUser[u.id] || [];
      const windSub = userSubs.find(s => s.app === 'wind') || userSubs.find(s => !s.app);
      const waterSub = userSubs.find(s => s.app === 'water');
      const pref = prefs.get(u.id);
      const alerts = pref?.alerts || {};
      const userSessions = sessionsByUser[u.id] || [];

      const tierFor = (sub) => sub?.status === 'active' ? (sub.tier || 'pro') : 'free';

      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        provider: u.app_metadata?.provider || 'email',
        confirmed: !!u.email_confirmed_at,
        tier: tierFor(windSub),
        windTier: tierFor(windSub),
        waterTier: tierFor(waterSub),
        subStatus: windSub?.status || waterSub?.status || null,
        subExpires: windSub?.current_period_end || waterSub?.current_period_end || null,
        hasPush: pushUsers.has(u.id),
        hasSms: !!(alerts.phone && alerts.sms_verified),
        phone: alerts.phone || null,
        favoriteSpots: pref?.favorite_spots || [],
        alertsEnabled: !!(alerts.phone || pushUsers.has(u.id)),
        sessionCount: userSessions.length,
        lastSession: userSessions[0]?.created_at || null,
        activities: [...new Set(userSessions.map(s => s.activity_type).filter(Boolean))],
      };
    }).sort((a, b) => new Date(b.lastSignIn || 0) - new Date(a.lastSignIn || 0));

    return res.status(200).json({
      users,
      summary: {
        total: users.length,
        pro: users.filter(u => u.tier !== 'free').length,
        withPush: users.filter(u => u.hasPush).length,
        withSms: users.filter(u => u.hasSms).length,
        active7d: users.filter(u => u.lastSignIn && (Date.now() - new Date(u.lastSignIn).getTime()) < 7 * 86400000).length,
        active30d: users.filter(u => u.lastSignIn && (Date.now() - new Date(u.lastSignIn).getTime()) < 30 * 86400000).length,
      },
    });
  } catch (err) {
    console.error('[admin/users]', err);
    return res.status(500).json({ error: err.message });
  }
}
