/**
 * Stage 5 — Fishing Alert Dispatch (Pro Feature)
 *
 * Internal endpoint: POST /api/internal/5-fishing-alerts
 * Chained from Stage 4 via QStash.
 *
 * Evaluators (all gate by time-of-day to avoid spam):
 *   - Hatch emergence: predictHatch likelihood > 70% at a favorite location
 *   - Pressure drop: gradient < -1.0 mb → feeding activity alert
 *   - Glass conditions: wind < 4 mph + gust < 6 at a favorite lake
 *   - Morning briefing: 6-7 AM MST, score all favorites, push top 3
 *   - Weekend report: Friday 5-6 PM MST, rank all waters for Sat/Sun
 *   - Stocking alert: recently stocked favorite location
 *
 * Dedup via alert_log table (configurable cooldown per alert type).
 */

import webpush from 'web-push';
import { getSupabase } from '../lib/supabase.js';
import { redisCommand } from '../lib/redis.js';
import { verifyQStashSignature } from '../lib/qstash.js';
import { getLakeConfig } from '../lib/stations.js';
import { splitStations, fetchNwsLatest } from '../lib/nwsAdapter.js';
import { isUdotStation, fetchUdotLatest } from '../lib/udotAdapter.js';
import {
  sendEmail,
  buildMorningBriefingEmail,
  buildWeekendReportEmail,
  buildHatchAlertEmail,
} from '../lib/email.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:hello@utahwindfinder.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
}

const COOLDOWNS = {
  hatch: 12 * 3600000,
  pressure: 6 * 3600000,
  glass: 4 * 3600000,
  stocking: 72 * 3600000,
  morning: 20 * 3600000,
  weekend: 7 * 24 * 3600000,
};

const MST_OFFSET = -7;

function getMSTHour() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return (utcHour + MST_OFFSET + 24) % 24;
}

function getMSTDay() {
  const now = new Date();
  const mst = new Date(now.getTime() + MST_OFFSET * 3600000);
  return mst.getUTCDay();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const verified = await verifyQStashSignature(req);
  if (!verified) return res.status(401).json({ error: 'Unauthorized' });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(200).json({ ok: true, stage: '5-fishing-alerts', skipped: 'VAPID not configured' });
  }

  const sb = getSupabase();
  const mstHour = getMSTHour();
  const mstDay = getMSTDay();
  const stats = { sent: 0, skipped: 0, users: 0, errors: 0 };

  try {
    // Fetch Pro users with fishing alerts enabled
    const { data: allPrefs } = await sb
      .from('user_preferences')
      .select('user_id, default_lake, alerts');

    if (!allPrefs?.length) {
      return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats, reason: 'no users' });
    }

    // Filter to users with fishingAlerts enabled
    const fishingUsers = allPrefs.filter(p => p.alerts?.fishingAlerts?.enabled);
    if (!fishingUsers.length) {
      return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats, reason: 'no fishing users' });
    }

    const userIds = fishingUsers.map(u => u.user_id);

    // Verify Pro status (subscription or trial — trial is client-side localStorage,
    // so for server alerts we check subscriptions table only)
    const { data: subs } = await sb
      .from('subscriptions')
      .select('user_id, tier, status, current_period_end')
      .in('user_id', userIds)
      .eq('status', 'active');

    const proUsers = new Set(
      (subs || [])
        .filter(s => s.tier === 'pro' && (!s.current_period_end || new Date(s.current_period_end) > new Date()))
        .map(s => s.user_id)
    );

    const eligibleUsers = fishingUsers.filter(u => proUsers.has(u.user_id));
    if (!eligibleUsers.length) {
      return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats, reason: 'no pro users' });
    }

    stats.users = eligibleUsers.length;

    // Fetch favorites for all eligible users
    const { data: allFavorites } = await sb
      .from('favorite_locations')
      .select('user_id, location_id, notify')
      .in('user_id', eligibleUsers.map(u => u.user_id))
      .eq('notify', true);

    const favsByUser = {};
    const uniqueLocations = new Set();
    for (const fav of (allFavorites || [])) {
      if (!favsByUser[fav.user_id]) favsByUser[fav.user_id] = [];
      favsByUser[fav.user_id].push(fav.location_id);
      uniqueLocations.add(fav.location_id);
    }

    // Fetch conditions for all unique locations
    const conditionsMap = {};
    await Promise.all([...uniqueLocations].map(async (locId) => {
      try {
        conditionsMap[locId] = await fetchConditions(locId);
      } catch { /* skip */ }
    }));

    // Fetch push subscriptions + user emails for digest delivery
    const { data: pushSubs } = await sb
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth_key')
      .in('user_id', eligibleUsers.map(u => u.user_id));

    const { data: authUsers } = await sb.auth.admin.listUsers();
    const emailByUser = {};
    for (const au of (authUsers?.users || [])) {
      if (au.email) emailByUser[au.id] = au.email;
    }

    const pushByUser = {};
    for (const s of (pushSubs || [])) {
      if (!pushByUser[s.user_id]) pushByUser[s.user_id] = [];
      pushByUser[s.user_id].push(s);
    }

    // Fetch recent alert log for dedup
    const oneDayAgo = new Date(Date.now() - 72 * 3600000).toISOString();
    const { data: recentAlerts } = await sb
      .from('alert_log')
      .select('user_id, alert_type, location_id, sent_at')
      .in('user_id', eligibleUsers.map(u => u.user_id))
      .gte('sent_at', oneDayAgo);

    const alertIndex = buildAlertIndex(recentAlerts || []);

    // Load stocking data via Redis or fallback
    let stockedLocations = [];
    try {
      const raw = await redisCommand('GET', 'stocking:recent');
      if (raw) stockedLocations = JSON.parse(raw);
    } catch { /* no stocking data available */ }

    // Evaluate alerts per user
    for (const userPref of eligibleUsers) {
      const userId = userPref.user_id;
      const prefs = userPref.alerts?.fishingAlerts || {};
      const userFavs = favsByUser[userId] || [];
      const userPush = pushByUser[userId] || [];
      const quietStart = userPref.alerts?.quietStart;
      const quietEnd = userPref.alerts?.quietEnd;

      if (isQuietHour(quietStart, quietEnd)) continue;
      if (userPush.length === 0) continue;

      const notifications = [];

      // Morning Briefing — 6-7 AM MST
      if (prefs.morningBriefing && mstHour >= 6 && mstHour < 7 && userFavs.length > 0) {
        if (!wasSentRecently(alertIndex, userId, 'morning', null, COOLDOWNS.morning)) {
          const scored = userFavs.map(locId => {
            const c = conditionsMap[locId];
            if (!c) return { locId, score: 0 };
            const score = scoreConditions(c);
            return { locId, score, cond: c };
          }).sort((a, b) => b.score - a.score).slice(0, 3);

          const lines = scored.map(s =>
            `${humanName(s.locId)}: ${s.score}/100 — ${Math.round(s.cond?.speed || 0)} mph`
          ).join('\n');

          const emailSpots = scored.map(s => ({
            name: humanName(s.locId),
            score: s.score,
            wind: Math.round(s.cond?.speed || 0),
            detail: s.cond?.pressureGradient < -0.5 ? 'Pressure dropping — fish feeding' : '',
          }));

          notifications.push({
            type: 'morning',
            locationId: null,
            title: 'Morning Fishing Briefing',
            body: lines || 'Check your spots for today\'s conditions',
            tag: 'morning-briefing',
            emailPayload: buildMorningBriefingEmail(emailSpots),
          });
        }
      }

      // Weekend Report — Friday 5-6 PM MST
      if (prefs.weekendReport && mstDay === 5 && mstHour >= 17 && mstHour < 18) {
        if (!wasSentRecently(alertIndex, userId, 'weekend', null, COOLDOWNS.weekend)) {
          const weekendSpots = userFavs.map(locId => {
            const c = conditionsMap[locId];
            return { name: humanName(locId), score: c ? scoreConditions(c) : 0, detail: `${Math.round(c?.speed || 0)} mph wind` };
          }).sort((a, b) => b.score - a.score).slice(0, 3);

          notifications.push({
            type: 'weekend',
            locationId: null,
            title: 'Weekend Fishing Forecast',
            body: 'Your weekend fishing outlook is ready. Tap to see the best waters for Saturday and Sunday.',
            tag: 'weekend-report',
            url: '/?tab=forecast',
            emailPayload: buildWeekendReportEmail(weekendSpots, weekendSpots),
          });
        }
      }

      // Per-location evaluators
      for (const locId of userFavs) {
        const cond = conditionsMap[locId];
        if (!cond) continue;

        // Hatch alerts
        if (prefs.hatchAlerts) {
          const hatches = predictHatchSimple(mstHour, new Date().getMonth() + 1, cond.temp);
          const topHatch = hatches.find(h => h.likelihood >= 70);
          if (topHatch && !wasSentRecently(alertIndex, userId, 'hatch', locId, COOLDOWNS.hatch)) {
            notifications.push({
              type: 'hatch',
              locationId: locId,
              title: `Hatch Alert — ${humanName(locId)}`,
              body: `${topHatch.insect} emergence likely (${topHatch.likelihood}%). Peak: ${topHatch.peakTime}. ${topHatch.notes}`,
              tag: `hatch-${locId}`,
              emailPayload: buildHatchAlertEmail(humanName(locId), topHatch),
            });
          }
        }

        // Pressure alerts
        if (prefs.pressureAlerts && cond.pressureGradient && cond.pressureGradient < -1.0) {
          if (!wasSentRecently(alertIndex, userId, 'pressure', locId, COOLDOWNS.pressure)) {
            notifications.push({
              type: 'pressure',
              locationId: locId,
              title: `Pressure Drop — ${humanName(locId)}`,
              body: `Barometric pressure falling (${Math.abs(cond.pressureGradient).toFixed(1)} mb). Fish feed aggressively during pressure drops.`,
              tag: `pressure-${locId}`,
            });
          }
        }

        // Glass conditions (lakes only)
        if (cond.speed < 4 && cond.gust < 6) {
          if (!wasSentRecently(alertIndex, userId, 'glass', locId, COOLDOWNS.glass)) {
            notifications.push({
              type: 'glass',
              locationId: locId,
              title: `Glass Conditions — ${humanName(locId)}`,
              body: `Flat water right now (${Math.round(cond.speed)} mph). Perfect for sight-fishing and float tubing.`,
              tag: `glass-${locId}`,
            });
          }
        }

        // Stocking alerts
        if (prefs.stockingAlerts && stockedLocations.includes(locId)) {
          if (!wasSentRecently(alertIndex, userId, 'stocking', locId, COOLDOWNS.stocking)) {
            notifications.push({
              type: 'stocking',
              locationId: locId,
              title: `Stocking Alert — ${humanName(locId)}`,
              body: 'Recently stocked! Fresh planters are aggressive and willing biters. Best: PowerBait, small spinners near inlet.',
              tag: `stocking-${locId}`,
            });
          }
        }
      }

      // Dispatch all notifications for this user
      const userEmail = emailByUser[userId];

      for (const notif of notifications) {
        let pushSent = false;
        for (const sub of userPush) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
              JSON.stringify({ title: notif.title, body: notif.body, tag: notif.tag, url: notif.url || '/' })
            );
            pushSent = true;
            break;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await sb.from('push_subscriptions').delete()
                .eq('user_id', userId).eq('endpoint', sub.endpoint);
            }
          }
        }

        if (pushSent) {
          stats.sent++;
          await sb.from('alert_log').insert({
            user_id: userId, alert_type: notif.type,
            location_id: notif.locationId, channel: 'push',
          });
        }

        // Email delivery for digest-type alerts
        if (userEmail && notif.emailPayload) {
          const emailResult = await sendEmail({
            to: userEmail,
            subject: notif.emailPayload.subject,
            html: notif.emailPayload.html,
          });
          if (emailResult.success) {
            await sb.from('alert_log').insert({
              user_id: userId, alert_type: notif.type,
              location_id: notif.locationId, channel: 'email',
            });
          }
        }
      }
    }

    console.log(`[5-fishing-alerts] Complete — sent=${stats.sent}, users=${stats.users}`);
    return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats });

  } catch (error) {
    console.error('[5-fishing-alerts] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────

function buildAlertIndex(alerts) {
  const idx = {};
  for (const a of alerts) {
    const key = `${a.user_id}:${a.alert_type}:${a.location_id || ''}`;
    if (!idx[key] || new Date(a.sent_at) > new Date(idx[key])) {
      idx[key] = a.sent_at;
    }
  }
  return idx;
}

function wasSentRecently(idx, userId, type, locId, cooldownMs) {
  const key = `${userId}:${type}:${locId || ''}`;
  const last = idx[key];
  if (!last) return false;
  return (Date.now() - new Date(last).getTime()) < cooldownMs;
}

function isQuietHour(startStr, endStr) {
  if (!startStr || !endStr) return false;
  const mstHour = getMSTHour();
  const current = mstHour * 60;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const start = sh * 60 + (sm || 0);
  const end = eh * 60 + (em || 0);
  if (start > end) return current >= start || current < end;
  return current >= start && current < end;
}

function scoreConditions(cond) {
  let score = 50;
  if (cond.speed < 5) score += 20;
  else if (cond.speed < 10) score += 10;
  else if (cond.speed > 20) score -= 20;
  else if (cond.speed > 15) score -= 10;
  if (cond.pressureGradient && cond.pressureGradient < -0.5) score += 15;
  if (cond.temp && cond.temp >= 50 && cond.temp <= 75) score += 10;
  return Math.max(0, Math.min(100, score));
}

function predictHatchSimple(hour, month, airTemp) {
  const sky = (hour >= 6 && hour <= 10) ? 'partly' : 'overcast';
  const hatches = [];

  if ([3, 4, 5, 9, 10, 11].includes(month) && sky === 'overcast') {
    hatches.push({ insect: 'Blue Winged Olive (BWO)', likelihood: 85, peakTime: '1-4 PM', notes: 'Overcast conditions trigger heavy BWO emergence' });
  }
  if ([5, 6, 7].includes(month) && airTemp && airTemp >= 55 && airTemp <= 75) {
    hatches.push({ insect: 'Pale Morning Dun (PMD)', likelihood: 70, peakTime: '10 AM - 2 PM', notes: 'PMDs emerging midday in riffles' });
  }
  if ([5, 6, 7, 8].includes(month)) {
    hatches.push({ insect: 'Caddis', likelihood: 65, peakTime: '4-8 PM', notes: 'Active afternoon through dusk' });
  }
  if (airTemp && airTemp < 45) {
    hatches.push({ insect: 'Midges', likelihood: 80, peakTime: 'Midday', notes: 'Cold water = midges — slow, technical fishing' });
  }
  if ([6, 7, 8, 9].includes(month) && airTemp && airTemp > 70) {
    hatches.push({ insect: 'Terrestrials (hoppers)', likelihood: 70, peakTime: '10 AM - 4 PM', notes: 'Fish tight to banks with hopper patterns' });
  }

  return hatches.sort((a, b) => b.likelihood - a.likelihood);
}

function humanName(locId) {
  return locId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchConditions(locId) {
  // Try Redis cached station data first
  try {
    const latestKey = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (latestKey?.length) {
      const raw = await redisCommand('GET', latestKey[0]);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.observations?.[locId]?.length) {
          const station = cached.observations[locId][0];
          return {
            speed: station.windSpeed ?? 0,
            gust: station.windGust ?? 0,
            dir: station.windDirection ?? 0,
            temp: station.temperature ?? null,
            pressureGradient: cached.pressure?.[locId]?.gradient ?? null,
          };
        }
      }
    }
  } catch { /* fall through */ }

  // Fallback: live fetch
  const config = getLakeConfig(locId);
  if (!config) return { speed: 0, gust: 0, dir: 0, temp: null, pressureGradient: null };

  const stids = config.synoptic?.slice(0, 3) || [];
  if (!stids.length) return { speed: 0, gust: 0, dir: 0, temp: null, pressureGradient: null };

  const { airport, other } = splitStations(stids);
  const results = [];

  if (airport.length) {
    try { results.push(...await fetchNwsLatest(airport)); } catch { /* skip */ }
  }
  const udotIds = other.filter(id => isUdotStation(id));
  const udotKey = process.env.UDOT_API_KEY;
  if (udotIds.length && udotKey) {
    try { results.push(...await fetchUdotLatest(udotIds, udotKey)); } catch { /* skip */ }
  }

  const primary = results[0];
  if (!primary) return { speed: 0, gust: 0, dir: 0, temp: null, pressureGradient: null };

  const obs = primary.OBSERVATIONS || primary;
  return {
    speed: obs.wind_speed_value_1?.value ?? obs.windSpeed ?? 0,
    gust: obs.wind_gust_value_1?.value ?? obs.windGust ?? 0,
    dir: obs.wind_direction_value_1?.value ?? obs.windDirection ?? 0,
    temp: obs.air_temp_value_1?.value ?? obs.temperature ?? null,
    pressureGradient: null,
  };
}
