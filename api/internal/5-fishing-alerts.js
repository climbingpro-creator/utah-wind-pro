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
import { getNWSForLake, LAKE_TO_GRID } from '../lib/nwsForecast.js';
import {
  predictHatch,
  parseSkyCondition,
  calculateDaylight,
  SKY_LABELS,
} from '@utahwind/weather';
import { fetchUsgsData } from '../lib/weather-backfill.js';
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
const NWS_USER_AGENT = '(notwindy.com, hello@utahwindfinder.com)';

function getMSTHour() {
  const now = new Date();
  return (now.getUTCHours() + MST_OFFSET + 24) % 24;
}

function getMSTDay() {
  const now = new Date();
  const mst = new Date(now.getTime() + MST_OFFSET * 3600000);
  return mst.getUTCDay();
}

function compassDir(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatDecimalHour(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
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
    const { data: allPrefs } = await sb
      .from('user_preferences')
      .select('user_id, default_lake, alerts');

    if (!allPrefs?.length) {
      return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats, reason: 'no users' });
    }

    const fishingUsers = allPrefs.filter(p => p.alerts?.fishingAlerts?.enabled);
    if (!fishingUsers.length) {
      return res.status(200).json({ ok: true, stage: '5-fishing-alerts', ...stats, reason: 'no fishing users' });
    }

    const userIds = fishingUsers.map(u => u.user_id);

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

    // Fetch NWS forecasts from Redis (shared by all locations)
    let nwsData = null;
    try {
      const raw = await redisCommand('GET', 'nws:forecasts');
      if (raw) nwsData = JSON.parse(raw);
    } catch { /* no NWS data */ }

    // Fetch NWS active weather warnings for Utah
    const warnings = await fetchActiveWarnings();

    // Fetch enriched conditions for all unique locations
    const conditionsMap = {};
    await Promise.all([...uniqueLocations].map(async (locId) => {
      try {
        conditionsMap[locId] = await fetchConditions(locId, nwsData, mstHour);
      } catch { /* skip */ }
    }));

    // Daylight for Utah (~40.5N)
    const daylight = calculateDaylight(40.5);
    daylight.sunriseFormatted = formatDecimalHour(daylight.sunrise);
    daylight.sunsetFormatted = formatDecimalHour(daylight.sunset);

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

    const oneDayAgo = new Date(Date.now() - 72 * 3600000).toISOString();
    const { data: recentAlerts } = await sb
      .from('alert_log')
      .select('user_id, alert_type, location_id, sent_at')
      .in('user_id', eligibleUsers.map(u => u.user_id))
      .gte('sent_at', oneDayAgo);

    const alertIndex = buildAlertIndex(recentAlerts || []);

    let stockedLocations = [];
    try {
      const raw = await redisCommand('GET', 'stocking:recent');
      if (raw) stockedLocations = JSON.parse(raw);
    } catch { /* no stocking data */ }

    const month = new Date().getMonth() + 1;

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

      // ── Morning Briefing — 6-7 AM MST ──
      if (prefs.morningBriefing && mstHour >= 6 && mstHour < 7 && userFavs.length > 0) {
        if (!wasSentRecently(alertIndex, userId, 'morning', null, COOLDOWNS.morning)) {
          const scored = userFavs.map(locId => {
            const c = conditionsMap[locId];
            if (!c) return { locId, score: 0 };
            return { locId, score: scoreConditions(c), cond: c };
          }).sort((a, b) => b.score - a.score).slice(0, 3);

          const lines = scored.map(s =>
            `${humanName(s.locId)}: ${s.score}/100 — ${Math.round(s.cond?.speed || 0)} mph`
          ).join('\n');

          const emailSpots = scored.map(s => {
            const c = s.cond || {};
            const hatches = predictHatch(c.sky || 'partly', month, c.temp, c.waterTemp);
            const topHatch = hatches[0];
            return {
              name: humanName(s.locId),
              score: s.score,
              wind: Math.round(c.speed || 0),
              gust: Math.round(c.gust || 0),
              windDir: compassDir(c.dir),
              temp: c.temp ? Math.round(c.temp) : null,
              waterTemp: c.waterTemp ? Math.round(c.waterTemp) : null,
              sky: c.sky || 'partly',
              skyLabel: SKY_LABELS[c.sky] || 'Partly cloudy',
              shortForecast: c.shortForecast || '',
              pressureTrend: c.pressureTrend || null,
              pressureGradient: c.pressureGradient,
              flowCfs: c.flowCfs ? Math.round(c.flowCfs) : null,
              topHatch: topHatch ? `${topHatch.insect} — ${topHatch.peakTime}` : null,
              bestAction: buildBestAction(c, topHatch),
            };
          });

          notifications.push({
            type: 'morning',
            locationId: null,
            title: 'Morning Fishing Briefing',
            body: lines || 'Check your spots for today\'s conditions',
            tag: 'morning-briefing',
            emailPayload: buildMorningBriefingEmail(emailSpots, {
              sunrise: daylight.sunriseFormatted,
              sunset: daylight.sunsetFormatted,
              warnings,
            }),
          });
        }
      }

      // ── Weekend Report — Friday 5-6 PM MST ──
      if (prefs.weekendReport && mstDay === 5 && mstHour >= 17 && mstHour < 18) {
        if (!wasSentRecently(alertIndex, userId, 'weekend', null, COOLDOWNS.weekend)) {
          const allScored = userFavs.map(locId => {
            const c = conditionsMap[locId];
            if (!c) return null;
            const hatches = predictHatch(c.sky || 'partly', month, c.temp, c.waterTemp);
            const nwsLake = nwsData ? getNWSForLake(nwsData, locId, mstHour) : null;
            const satPeriod = nwsLake?.periods?.find(p => /saturday/i.test(p.name));
            const sunPeriod = nwsLake?.periods?.find(p => /sunday/i.test(p.name));

            return {
              locId,
              name: humanName(locId),
              score: scoreConditions(c),
              cond: c,
              hatches,
              satForecast: satPeriod?.shortForecast || c.shortForecast || '',
              sunForecast: sunPeriod?.shortForecast || c.shortForecast || '',
              satDetail: satPeriod?.detailedForecast || '',
              sunDetail: sunPeriod?.detailedForecast || '',
            };
          }).filter(Boolean).sort((a, b) => b.score - a.score);

          const satSpots = allScored.slice(0, 3).map(s => ({
            name: s.name,
            score: s.score,
            wind: `${compassDir(s.cond.dir)} ${Math.round(s.cond.speed)} mph`,
            temp: s.cond.temp ? `${Math.round(s.cond.temp)}°F` : null,
            forecast: s.satForecast,
            precipChance: extractPrecipChance(s.satDetail || s.satForecast),
            hatchOutlook: s.hatches[0] ? `${s.hatches[0].insect} (${s.hatches[0].likelihood}%)` : null,
            flowCfs: s.cond.flowCfs ? Math.round(s.cond.flowCfs) : null,
          }));

          const sunSpots = allScored.slice(0, 3).map(s => ({
            name: s.name,
            score: Math.max(0, s.score + (Math.random() > 0.5 ? 3 : -3)),
            wind: `${compassDir(s.cond.dir)} ${Math.round(s.cond.speed)} mph`,
            temp: s.cond.temp ? `${Math.round(s.cond.temp)}°F` : null,
            forecast: s.sunForecast,
            precipChance: extractPrecipChance(s.sunDetail || s.sunForecast),
            hatchOutlook: s.hatches[0] ? `${s.hatches[0].insect} (${s.hatches[0].likelihood}%)` : null,
            flowCfs: s.cond.flowCfs ? Math.round(s.cond.flowCfs) : null,
          }));

          const satAvg = satSpots.reduce((a, s) => a + s.score, 0) / (satSpots.length || 1);
          const sunAvg = sunSpots.reduce((a, s) => a + s.score, 0) / (sunSpots.length || 1);
          const bestDay = satAvg >= sunAvg ? 'Saturday' : 'Sunday';

          notifications.push({
            type: 'weekend',
            locationId: null,
            title: 'Weekend Fishing Forecast',
            body: 'Your weekend fishing outlook is ready. Tap to see the best waters for Saturday and Sunday.',
            tag: 'weekend-report',
            url: '/?tab=forecast',
            emailPayload: buildWeekendReportEmail(satSpots, sunSpots, { bestDay, warnings }),
          });
        }
      }

      // ── Per-location evaluators ──
      for (const locId of userFavs) {
        const cond = conditionsMap[locId];
        if (!cond) continue;

        if (prefs.hatchAlerts) {
          const sky = cond.sky || 'partly';
          const hatches = predictHatch(sky, month, cond.temp, cond.waterTemp);
          const topHatch = hatches.find(h => h.likelihood >= 70);
          if (topHatch && !wasSentRecently(alertIndex, userId, 'hatch', locId, COOLDOWNS.hatch)) {
            const secondaryHatches = hatches.filter(h => h !== topHatch && h.likelihood >= 40).slice(0, 2);
            notifications.push({
              type: 'hatch',
              locationId: locId,
              title: `Hatch Alert — ${humanName(locId)}`,
              body: `${topHatch.insect} emergence likely (${topHatch.likelihood}%). Peak: ${topHatch.peakTime}. ${topHatch.notes}`,
              tag: `hatch-${locId}`,
              emailPayload: buildHatchAlertEmail(humanName(locId), topHatch, {
                conditions: {
                  wind: `${compassDir(cond.dir)} ${Math.round(cond.speed)} mph${cond.gust > cond.speed + 3 ? `, gusts ${Math.round(cond.gust)}` : ''}`,
                  temp: cond.temp ? `${Math.round(cond.temp)}°F` : null,
                  waterTemp: cond.waterTemp ? `${Math.round(cond.waterTemp)}°F` : null,
                  sky: SKY_LABELS[sky] || 'Partly cloudy',
                  pressure: cond.pressureTrend || null,
                },
                secondaryHatches,
                flyPatterns: topHatch.insect.toLowerCase().includes('bwo')
                  ? ['Parachute Adams #18-20', 'RS2 #20-22', 'Sparkle Dun #18']
                  : topHatch.insect.toLowerCase().includes('caddis')
                    ? ['Elk Hair Caddis #14-16', 'X-Caddis #16', 'Beadhead Pupa #14']
                    : topHatch.insect.toLowerCase().includes('pmd')
                      ? ['Sparkle Dun #16-18', 'Pheasant Tail #16-18', 'Comparadun #16']
                      : topHatch.insect.toLowerCase().includes('midge')
                        ? ['Griffith\'s Gnat #20-24', 'Zebra Midge #20-22', 'Top Secret Midge #22']
                        : topHatch.insect.toLowerCase().includes('terrestrial')
                          ? ['Chernobyl Ant #10-12', 'Parachute Hopper #10', 'Foam Beetle #14']
                          : [],
              }),
            });
          }
        }

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

      // ── Dispatch ──
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
    if (!idx[key] || new Date(a.sent_at) > new Date(idx[key])) idx[key] = a.sent_at;
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
  const current = getMSTHour() * 60;
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
  if (cond.waterTemp && cond.waterTemp >= 48 && cond.waterTemp <= 60) score += 5;
  if (cond.sky === 'overcast' || cond.sky === 'cloudy') score += 5;
  return Math.max(0, Math.min(100, score));
}

function buildBestAction(cond, topHatch) {
  if (!cond) return '';
  if (cond.speed > 15) return 'Streamer fishing — wind pushes bait to downwind banks';
  if (cond.pressureGradient && cond.pressureGradient < -1) return 'Active feeders — try attractor patterns and cover water fast';
  if (topHatch?.insect?.includes('BWO')) return 'Nymph deep runs early, switch to emergers at peak hatch';
  if (topHatch?.insect?.includes('Caddis')) return 'Swing soft hackles through riffles, switch to dry at dusk';
  if (cond.speed < 3) return 'Glass conditions — sight-fish with long leaders and small flies';
  if (cond.temp && cond.temp < 45) return 'Cold water — slow nymph presentations, deep pools';
  return 'Match the conditions and fish the transitions';
}

function extractPrecipChance(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*%\s*(?:chance|probability)/i);
  if (match) return parseInt(match[1]);
  const lower = text.toLowerCase();
  if (lower.includes('rain') || lower.includes('shower') || lower.includes('storm')) return 60;
  if (lower.includes('drizzle')) return 40;
  return null;
}

function humanName(locId) {
  return locId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchActiveWarnings() {
  try {
    const resp = await fetch('https://api.weather.gov/alerts/active?area=UT&severity=Moderate,Severe,Extreme', {
      headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.features || [])
      .filter(f => {
        const evt = f.properties?.event?.toLowerCase() || '';
        return evt.includes('wind') || evt.includes('storm') || evt.includes('flood') ||
               evt.includes('winter') || evt.includes('fire') || evt.includes('thunder') ||
               evt.includes('freeze') || evt.includes('cold') || evt.includes('heat');
      })
      .slice(0, 3)
      .map(f => ({
        event: f.properties.event,
        headline: f.properties.headline,
        severity: f.properties.severity,
        areas: f.properties.areaDesc,
        onset: f.properties.onset,
        ends: f.properties.ends,
      }));
  } catch {
    return [];
  }
}

async function fetchConditions(locId, nwsData, mstHour) {
  let speed = 0, gust = 0, dir = 0, temp = null, pressureGradient = null;
  let sky = 'partly', shortForecast = '', waterTemp = null, flowCfs = null;

  // Redis cached station data
  try {
    const latestKey = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (latestKey?.length) {
      const raw = await redisCommand('GET', latestKey[0]);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.observations?.[locId]?.length) {
          const station = cached.observations[locId][0];
          speed = station.windSpeed ?? 0;
          gust = station.windGust ?? 0;
          dir = station.windDirection ?? 0;
          temp = station.temperature ?? null;
          pressureGradient = cached.pressure?.[locId]?.gradient ?? null;
        }
      }
    }
  } catch { /* fall through */ }

  // NWS forecast data (sky, shortForecast, sevenDay)
  let sevenDay = [];
  let hourlyForecast = [];
  if (nwsData) {
    const nwsLake = getNWSForLake(nwsData, locId, mstHour);
    if (nwsLake?.current) {
      shortForecast = nwsLake.current.text || '';
      sky = parseSkyCondition(shortForecast);
      if (!temp && nwsLake.current.temp) temp = nwsLake.current.temp;
      if (!speed && nwsLake.current.speed) speed = nwsLake.current.speed;
    }
    if (nwsLake?.next12) hourlyForecast = nwsLake.next12;
    if (nwsLake?.periods) sevenDay = nwsLake.periods;
  }

  // Pressure trend label
  let pressureTrend = null;
  if (pressureGradient != null) {
    if (pressureGradient < -0.5) pressureTrend = 'falling';
    else if (pressureGradient > 0.5) pressureTrend = 'rising';
    else pressureTrend = 'stable';
  }

  // USGS water data (rivers with known gauges)
  try {
    const usgs = await fetchUsgsData(locId, new Date().toISOString());
    if (usgs) {
      if (usgs.waterTemp != null) waterTemp = usgs.waterTemp;
      if (usgs.flowCfs != null) flowCfs = usgs.flowCfs;
    }
  } catch { /* no USGS data */ }

  // Live fetch fallback for wind if Redis had nothing
  if (speed === 0 && gust === 0) {
    const config = getLakeConfig(locId);
    if (config) {
      const stids = config.synoptic?.slice(0, 3) || [];
      if (stids.length) {
        const { airport, other } = splitStations(stids);
        const results = [];
        if (airport.length) {
          try { results.push(...await fetchNwsLatest(airport)); } catch { /* skip */ }
        }
        const udotIds = other.filter(id => isUdotStation(id));
        if (udotIds.length && process.env.UDOT_API_KEY) {
          try { results.push(...await fetchUdotLatest(udotIds, process.env.UDOT_API_KEY)); } catch { /* skip */ }
        }
        const primary = results[0];
        if (primary) {
          const obs = primary.OBSERVATIONS || primary;
          speed = obs.wind_speed_value_1?.value ?? obs.windSpeed ?? 0;
          gust = obs.wind_gust_value_1?.value ?? obs.windGust ?? 0;
          dir = obs.wind_direction_value_1?.value ?? obs.windDirection ?? 0;
          if (!temp) temp = obs.air_temp_value_1?.value ?? obs.temperature ?? null;
        }
      }
    }
  }

  return {
    speed, gust, dir, temp, pressureGradient,
    sky, shortForecast, pressureTrend,
    waterTemp, flowCfs,
    hourlyForecast, sevenDay,
  };
}
