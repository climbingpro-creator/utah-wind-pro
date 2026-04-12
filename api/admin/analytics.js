/**
 * GET /api/admin/analytics
 *
 * Aggregates platform metrics from Supabase + Stripe for the Admin Dashboard.
 * Requires admin JWT (tyler@aspenearth.com or climbingpro@gmail.com).
 *
 * Uses the service-role key to bypass RLS and auth.admin to enumerate users.
 */
import { verifyAuth, getSupabase } from '../lib/supabase.js';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

const GEMINI_COST_PER_CALL = 0.0003;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status || 401).json({ error: auth.error });
  if (!ALLOWED_ADMINS.includes(auth.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const supabase = getSupabase();
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString();
    // --- User counts via auth.admin (service role) ---
    let totalUsers = 0;
    let recentSignups = 0;
    let prevSignups = 0;
    let userList = [];
    try {
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      userList = data?.users || [];
      totalUsers = userList.length;
      const thirtyAgo = new Date(now - 30 * 86400000);
      const sixtyAgo = new Date(now - 60 * 86400000);
      recentSignups = userList.filter((u) => new Date(u.created_at) >= thirtyAgo).length;
      prevSignups = userList.filter((u) => {
        const d = new Date(u.created_at);
        return d >= sixtyAgo && d < thirtyAgo;
      }).length;
    } catch (e) {
      console.warn('[admin/analytics] auth.admin.listUsers failed:', e.message);
    }

    // --- Parallel Supabase queries ---
    const [
      subsResult,
      sessionsResult,
      sessions30dResult,
      feedbackResult,
      eventsAllResult,
      events30dResult,
    ] = await Promise.all([
      supabase.from('subscriptions').select('user_id, tier, status, current_period_end'),
      supabase.from('kite_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('kite_sessions').select('id, created_at, activity_type, user_id').gte('created_at', thirtyDaysAgo),
      supabase.from('user_feedback').select('id, type, status, created_at'),
      supabase.from('analytics_events').select('id', { count: 'exact', head: true }),
      supabase.from('analytics_events').select('event_type, metadata, created_at').gte('created_at', thirtyDaysAgo).limit(10000),
    ]);

    // --- Subscriptions ---
    const allSubs = subsResult.data || [];
    const activeSubs = allSubs.filter((s) => s.status === 'active');
    const proUsers = activeSubs.length;
    const freeUsers = Math.max(0, totalUsers - proUsers);

    // --- Stripe revenue (real data if key exists) ---
    let stripeRevenue = null;
    let stripeMRR = null;
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(stripeKey);
        const periodStart = Math.floor(new Date(now - 30 * 86400000).getTime() / 1000);
        const charges = await stripe.charges.list({ created: { gte: periodStart }, limit: 100 });
        stripeRevenue = charges.data
          .filter((c) => c.status === 'succeeded')
          .reduce((sum, c) => sum + c.amount, 0) / 100;
        stripeMRR = proUsers * 5.99;
      }
    } catch (e) {
      console.warn('[admin/analytics] Stripe query failed:', e.message);
    }

    // --- Events analytics ---
    const events30d = events30dResult.data || [];
    const mapClicks = events30d.filter((e) => e.event_type === 'pin_drop').length;
    const bioApiCalls = events30d.filter((e) => e.event_type === 'bio_api_call').length;
    const pageViews = events30d.filter((e) => e.event_type === 'page_view').length;
    const mapInteractions = events30d.filter((e) => e.event_type === 'map_interaction').length;

    // Page views by app
    const windViews = events30d.filter((e) => e.event_type === 'page_view' && e.metadata?.page === 'wind').length;
    const waterViews = events30d.filter((e) => e.event_type === 'page_view' && e.metadata?.page === 'water').length;

    // --- Cost estimates ---
    const estimatedGeminiCost = bioApiCalls * GEMINI_COST_PER_CALL;
    const estimatedVercelCost = 0; // included in plan
    const estimatedTotalCost = estimatedGeminiCost;

    // --- Sessions & retention ---
    const sessions30d = sessions30dResult.data || [];
    const uniqueActiveUsers = new Set(sessions30d.filter((s) => s.user_id).map((s) => s.user_id)).size;
    const retentionRate = totalUsers > 0 ? Math.round((uniqueActiveUsers / totalUsers) * 100) : 0;
    const growthRate = prevSignups > 0 ? Math.round(((recentSignups - prevSignups) / prevSignups) * 100) : (recentSignups > 0 ? 100 : 0);

    // Activity breakdown
    const activityBreakdown = {};
    for (const s of sessions30d) {
      const t = s.activity_type || 'unknown';
      activityBreakdown[t] = (activityBreakdown[t] || 0) + 1;
    }

    // Daily engagement timeline (last 30 days)
    const eventsByDay = {};
    for (const e of events30d) {
      const day = e.created_at?.substring(0, 10);
      if (!day) continue;
      if (!eventsByDay[day]) eventsByDay[day] = { views: 0, pins: 0, bio: 0, total: 0 };
      eventsByDay[day].total++;
      if (e.event_type === 'page_view') eventsByDay[day].views++;
      if (e.event_type === 'pin_drop') eventsByDay[day].pins++;
      if (e.event_type === 'bio_api_call') eventsByDay[day].bio++;
    }

    // --- Feedback ---
    const feedbackAll = feedbackResult.data || [];
    const feedbackNew = feedbackAll.filter((f) => f.status === 'new').length;
    const feedbackReviewed = feedbackAll.filter((f) => f.status === 'reviewed').length;
    const feedbackResolved = feedbackAll.filter((f) => f.status === 'resolved').length;

    // Monthly revenue estimate
    const monthlyRevenue = stripeRevenue ?? proUsers * 5.99;
    const netMargin = monthlyRevenue - estimatedTotalCost;

    return res.status(200).json({
      users: {
        total: totalUsers,
        pro: proUsers,
        free: freeUsers,
        recentSignups,
        prevSignups,
        growthRate,
        retentionRate,
        uniqueActiveUsers30d: uniqueActiveUsers,
      },
      engagement: {
        totalSessions: sessionsResult.count || 0,
        sessions30d: sessions30d.length,
        mapClicks30d: mapClicks,
        bioApiCalls30d: bioApiCalls,
        pageViews30d: pageViews,
        windViews30d: windViews,
        waterViews30d: waterViews,
        mapInteractions30d: mapInteractions,
        totalEvents: eventsAllResult.count || 0,
        rawEvents30dFetched: events30d.length,
        activityBreakdown,
        eventsByDay,
      },
      financials: {
        monthlyRevenue: monthlyRevenue.toFixed(2),
        stripeMRR: stripeMRR?.toFixed(2) ?? null,
        stripeRevenue30d: stripeRevenue?.toFixed(2) ?? null,
        estimatedGeminiCost: estimatedGeminiCost.toFixed(4),
        estimatedTotalCost: estimatedTotalCost.toFixed(4),
        netMargin: netMargin.toFixed(2),
        pricePerUser: '$5.99/mo',
        costPerBioCall: `$${GEMINI_COST_PER_CALL}`,
      },
      feedback: {
        total: feedbackAll.length,
        new: feedbackNew,
        reviewed: feedbackReviewed,
        resolved: feedbackResolved,
      },
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('[admin/analytics]', err);
    return res.status(500).json({ error: err.message });
  }
}
