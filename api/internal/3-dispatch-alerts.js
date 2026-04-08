/**
 * Stage 3 of 3 — Alert Dispatch
 * 
 * Internal endpoint: POST /api/internal/3-dispatch-alerts
 * Secured by QStash signature verification (falls back to INTERNAL_API_KEY).
 * 
 * Responsibilities:
 *   1. Read freshly processed data from Redis
 *   2. Evaluate conditions against user alert thresholds (Supabase)
 *   3. Send web push notifications for triggered alerts
 *   4. Log dispatch results
 * 
 * This replaces the standalone push-check cron — it now fires as
 * part of the event-driven chain, ensuring alerts use the freshest data.
 */

import webpush from 'web-push';
import { getSupabase } from '../lib/supabase.js';
import { getLakeConfig } from '../lib/stations.js';
import { splitStations, fetchNwsLatest } from '../lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from '../lib/udotAdapter.js';
import { redisCommand } from '../lib/redis.js';
import { verifyQStashSignature, triggerNextStage } from '../lib/qstash.js';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO  = process.env.VAPID_MAILTO || 'mailto:hello@utahwindfinder.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const verified = await verifyQStashSignature(req);
  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized — invalid signature' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(200).json({ ok: true, stage: '3-dispatch', skipped: 'VAPID keys not configured' });
  }

  try {
    const sb = getSupabase();

    // Fetch push subscribers
    const { data: subs, error: subErr } = await sb
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key');

    if (subErr) {
      console.error('[3-dispatch] Subs query:', subErr.message);
      return res.status(500).json({ error: subErr.message });
    }
    if (!subs?.length) {
      return res.status(200).json({ ok: true, stage: '3-dispatch', sent: 0, reason: 'no subscribers' });
    }

    const byUser = {};
    for (const s of subs) {
      if (!byUser[s.user_id]) byUser[s.user_id] = [];
      byUser[s.user_id].push(s);
    }
    const userIds = Object.keys(byUser);

    // Fetch user preferences
    const { data: prefs } = await sb
      .from('user_preferences')
      .select('user_id, default_lake, alerts, phone')
      .in('user_id', userIds);

    const prefsMap = {};
    for (const p of (prefs || [])) prefsMap[p.user_id] = p;

    // Determine unique lakes and fetch conditions
    const lakes = [...new Set((prefs || []).map(p => p.default_lake).filter(Boolean))];
    if (!lakes.length) lakes.push('utah-lake-zigzag');

    const conditionsMap = {};

    // Try Redis first for cached station data, fall back to live fetch
    const latestObsKey = await redisCommand('LRANGE', 'obs:index', '0', '0');
    let cachedStations = null;
    if (latestObsKey?.length) {
      const raw = await redisCommand('GET', latestObsKey[0]);
      if (raw) {
        try { cachedStations = JSON.parse(raw); } catch { /* fall through */ }
      }
    }

    await Promise.all(lakes.map(async (lakeId) => {
      try {
        if (cachedStations?.observations?.[lakeId]?.length) {
          conditionsMap[lakeId] = extractConditionsFromCached(cachedStations.observations[lakeId], lakeId);
        } else {
          conditionsMap[lakeId] = await fetchConditionsLive(lakeId);
        }
      } catch (err) {
        console.error(`[3-dispatch] Conditions for ${lakeId}:`, err.message);
      }
    }));

    // Evaluate alerts and send pushes
    let sent = 0;
    let cleaned = 0;
    await Promise.allSettled(userIds.map(async (userId) => {
      const userPrefs = prefsMap[userId];
      if (!userPrefs) return;

      const alerts = userPrefs.alerts || {};
      const lake = userPrefs.default_lake || 'utah-lake-zigzag';
      const cond = conditionsMap[lake];
      if (!cond) return;

      if (isQuietHour(alerts.quietStart, alerts.quietEnd)) return;

      const notifications = evaluateThresholds(alerts, cond, lake);
      if (!notifications.length) return;

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
              await sb.from('push_subscriptions').delete()
                .eq('user_id', userId).eq('endpoint', sub.endpoint);
              cleaned++;
            } else {
              console.error(`[3-dispatch] Send failed for ${userId}:`, err.message);
            }
          }
        }
      }
    }));

    console.log(`[3-dispatch] Complete — sent=${sent}, cleaned=${cleaned}, users=${userIds.length}`);

    // Chain to Stage 4 — per-spot session alerts for Pro users
    await triggerNextStage('/api/internal/4-session-alerts', req);

    return res.status(200).json({
      ok: true,
      stage: '3-dispatch',
      sent,
      cleaned,
      users: userIds.length,
      lakesEvaluated: Object.keys(conditionsMap).length,
    });
  } catch (error) {
    console.error('[3-dispatch] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ── Helpers ─────────────────────────────────────────────────

function extractConditionsFromCached(stationData, lakeId) {
  const config = getLakeConfig(lakeId);
  const primary = config?.primary
    ? stationData.find(s => s.stationId === config.primary) || stationData[0]
    : stationData[0];

  if (!primary) return null;
  return {
    speed: primary.windSpeed ?? 0,
    gust: primary.windGust ?? 0,
    dir: primary.windDirection ?? 0,
    temp: primary.temperature ?? null,
  };
}

async function fetchConditionsLive(lakeId) {
  const config = getLakeConfig(lakeId);
  if (!config) return null;

  const stids = config.synoptic.slice(0, 5);
  const { airport, other } = splitStations(stids);
  const udotIds = other.filter(id => isUdotStation(id));
  const synOnly = other.filter(id => !isUdotStation(id));
  const fetches = [];

  if (airport.length > 0) fetches.push(fetchNwsLatest(airport).catch(() => []));
  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length > 0 && udotKey) fetches.push(fetchUdotLatest(udotIds, udotKey).catch(() => []));
  const synFallback = udotKey ? synOnly : [...synOnly, ...udotIds];
  const token = process.env.SYNOPTIC_TOKEN;
  if (token && synFallback.length > 0) {
    fetches.push((async () => {
      try {
        const params = new URLSearchParams({
          token, stid: synFallback.join(','),
          vars: 'wind_speed,wind_direction,wind_gust,air_temp', units: 'english',
        });
        const resp = await fetch(`https://api.synopticdata.com/v2/stations/latest?${params}`,
          { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.STATION || [];
      } catch { return []; }
    })());
  }

  const allResults = (await Promise.all(fetches)).flat();
  const primary = allResults.find(s => s.STID === config.primary) || allResults[0];
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

  const windThreshold = alerts.windThreshold;
  if (windThreshold && typeof windThreshold === 'number' && cond.speed >= windThreshold) {
    notifications.push({
      title: 'Wind Alert — Go Time!',
      body: `${Math.round(cond.speed)} mph at ${lakeName} (gusts ${Math.round(cond.gust)} mph). Your ${windThreshold} mph threshold is hit.`,
      tag: 'wind-threshold',
      url: '/',
    });
  }

  if (alerts.glassNotify && cond.speed < 4 && cond.gust < 6) {
    notifications.push({
      title: 'Glass Conditions',
      body: `Flat water at ${lakeName} — ${Math.round(cond.speed)} mph winds. Perfect for paddling.`,
      tag: 'glass-conditions',
      url: '/',
    });
  }

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
  const current = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const start = sh * 60 + (sm || 0);
  const end = eh * 60 + (em || 0);

  if (start > end) return current >= start || current < end;
  return current >= start && current < end;
}
