/**
 * GET /api/cron/push-check
 *
 * Runs on a 15-min Vercel cron. For every user who has push subscriptions:
 *   1. Fetch their alert preferences from user_preferences.alerts
 *   2. Fetch current conditions for their default_lake
 *   3. If any threshold is met, send a push notification via web-push
 *
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO
 */
import webpush from 'web-push';
import { getSupabase } from '../lib/supabase.js';
import { getLakeConfig } from '../lib/stations.js';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO  = process.env.VAPID_MAILTO || 'mailto:hello@utahwindfinder.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  const sb = getSupabase();

  // Get all users who have at least one push subscription
  const { data: subs, error: subErr } = await sb
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth_key');

  if (subErr) {
    console.error('[push-check] subs query:', subErr.message);
    return res.status(500).json({ error: subErr.message });
  }
  if (!subs?.length) return res.status(200).json({ sent: 0, reason: 'no subscribers' });

  // Group subscriptions by user_id
  const byUser = {};
  for (const s of subs) {
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  }
  const userIds = Object.keys(byUser);

  // Fetch preferences for those users
  const { data: prefs } = await sb
    .from('user_preferences')
    .select('user_id, default_lake, alerts, phone')
    .in('user_id', userIds);

  const prefsMap = {};
  for (const p of (prefs || [])) prefsMap[p.user_id] = p;

  // Fetch conditions per unique lake (deduplicate API calls)
  const lakes = [...new Set((prefs || []).map(p => p.default_lake).filter(Boolean))];
  if (!lakes.length) lakes.push('utah-lake-zigzag');

  const conditionsMap = {};
  await Promise.all(lakes.map(async (lakeId) => {
    try {
      conditionsMap[lakeId] = await fetchConditions(lakeId);
    } catch (err) {
      console.error(`[push-check] conditions for ${lakeId}:`, err.message);
    }
  }));

  // Evaluate alerts and send pushes
  let sent = 0;
  let cleaned = 0;
  const results = await Promise.allSettled(userIds.map(async (userId) => {
    const userPrefs = prefsMap[userId];
    if (!userPrefs) return;

    const alerts = userPrefs.alerts || {};
    const lake = userPrefs.default_lake || 'utah-lake-zigzag';
    const cond = conditionsMap[lake];
    if (!cond) return;

    // Check quiet hours
    if (isQuietHour(alerts.quietStart, alerts.quietEnd)) return;

    const notifications = evaluateThresholds(alerts, cond, lake);
    if (!notifications.length) return;

    // Send to each of the user's push subscriptions
    for (const sub of byUser[userId]) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      };
      for (const notif of notifications) {
        try {
          await webpush.sendNotification(pushSub, JSON.stringify(notif));
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired — clean it up
            await sb.from('push_subscriptions').delete()
              .eq('user_id', userId).eq('endpoint', sub.endpoint);
            cleaned++;
          } else {
            console.error(`[push-check] send failed for ${userId}:`, err.message);
          }
        }
      }
    }
  }));

  return res.status(200).json({ sent, cleaned, users: userIds.length });
}

// ── Helpers ─────────────────────────────────────────────────

async function fetchConditions(lakeId) {
  const config = getLakeConfig(lakeId);
  if (!config) return null;

  const token = process.env.SYNOPTIC_TOKEN || process.env.VITE_SYNOPTIC_TOKEN;
  const params = new URLSearchParams({
    token,
    stid: config.synoptic.slice(0, 5).join(','),
    vars: 'wind_speed,wind_direction,wind_gust,air_temp',
    units: 'english',
  });

  const resp = await fetch(`https://api.synopticdata.com/v2/stations/latest?${params}`);
  if (!resp.ok) return null;
  const raw = await resp.json();

  const primary = (raw?.STATION || []).find(s => s.STID === config.primary) || raw?.STATION?.[0];
  if (!primary) return null;

  const obs = primary.OBSERVATIONS || {};
  return {
    speed: obs.wind_speed_value_1?.value ?? 0,
    gust: obs.wind_gust_value_1?.value ?? 0,
    dir: obs.wind_direction_value_1?.value ?? 0,
    temp: obs.air_temp_value_1?.value ?? null,
  };
}

function evaluateThresholds(alerts, cond, lakeName) {
  const notifications = [];

  // Wind threshold alert
  const windThreshold = alerts.windThreshold;
  if (windThreshold && typeof windThreshold === 'number' && cond.speed >= windThreshold) {
    notifications.push({
      title: 'Wind Alert — Go Time!',
      body: `${Math.round(cond.speed)} mph at ${lakeName} (gusts ${Math.round(cond.gust)} mph). Your ${windThreshold} mph threshold is hit.`,
      tag: 'wind-threshold',
      url: '/',
    });
  }

  // Glass conditions
  if (alerts.glassNotify && cond.speed < 4 && cond.gust < 6) {
    notifications.push({
      title: 'Glass Conditions',
      body: `Flat water at ${lakeName} — ${Math.round(cond.speed)} mph winds. Perfect for paddling.`,
      tag: 'glass-conditions',
      url: '/',
    });
  }

  // Thermal cycle starting (south wind building 8+ mph between 10am-4pm)
  const hour = new Date().getHours();
  if (alerts.thermalNotify && hour >= 10 && hour <= 16 &&
      cond.dir >= 140 && cond.dir <= 220 && cond.speed >= 8) {
    notifications.push({
      title: 'Thermal Cycle Active',
      body: `South wind ${Math.round(cond.speed)} mph at ${lakeName}. Thermal is building.`,
      tag: 'thermal-cycle',
      url: '/',
    });
  }

  // Severe weather (gust > 40 mph)
  if (alerts.severeNotify && cond.gust > 40) {
    notifications.push({
      title: 'Severe Wind Warning',
      body: `Dangerous gusts of ${Math.round(cond.gust)} mph at ${lakeName}. Stay off the water.`,
      tag: 'severe-weather',
      url: '/',
    });
  }

  return notifications;
}

function isQuietHour(startStr, endStr) {
  if (!startStr || !endStr) return false;
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const current = hour * 60 + min;

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const start = sh * 60 + (sm || 0);
  const end = eh * 60 + (em || 0);

  if (start > end) return current >= start || current < end;
  return current >= start && current < end;
}
