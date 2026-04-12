/**
 * Stage 4 — Session Alert Dispatch
 *
 * Internal endpoint: POST /api/internal/4-session-alerts
 * Chained from Stage 3 via QStash / INTERNAL_API_KEY.
 *
 * Responsibilities:
 *   1. Query all enabled session_alerts for active Pro users
 *   2. Group by spot to batch NWS forecast lookups
 *   3. Run findNextRideableWindow per alert
 *   4. Anti-spam: skip if already notified about same window within 6h
 *   5. Dispatch via SMS (Twilio) or web push
 *   6. Update last_notified_at + last_window_fingerprint
 */

import { getSupabase } from '../lib/supabase.js';
import { redisCommand } from '../lib/redis.js';
import { verifyQStashSignature, triggerNextStage } from '../lib/qstash.js';
import { sendSessionAlert, formatAlertMessage } from '../lib/sendSessionAlert.js';
import { LAKE_TO_GRID } from '../lib/nwsForecast.js';

const ANTI_SPAM_HOURS = 6;
const PEAK_UPGRADE_THRESHOLD = 5; // mph — re-notify if peak jumps by this much

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const verified = await verifyQStashSignature(req);
  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized — invalid signature' });
  }

  const sb = getSupabase();

  try {
    // 1. Fetch all enabled alerts joined with active Pro subscriptions
    const { data: alerts, error: alertErr } = await sb
      .from('session_alerts')
      .select(`
        id, user_id, spot_id, discipline, min_wind_mph, enabled,
        last_notified_at, last_window_fingerprint
      `)
      .eq('enabled', true);

    if (alertErr) throw alertErr;
    if (!alerts || alerts.length === 0) {
      return res.status(200).json({ ok: true, stage: '4-session-alerts', processed: 0 });
    }

    // Filter to Pro users only
    const userIds = [...new Set(alerts.map(a => a.user_id))];
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

    const proAlerts = alerts.filter(a => proUsers.has(a.user_id));
    if (proAlerts.length === 0) {
      return res.status(200).json({ ok: true, stage: '4-session-alerts', processed: 0, reason: 'no pro alerts' });
    }

    // 2. Group alerts by spot and batch fetch NWS hourly data
    const spotGroups = {};
    for (const alert of proAlerts) {
      if (!spotGroups[alert.spot_id]) spotGroups[alert.spot_id] = [];
      spotGroups[alert.spot_id].push(alert);
    }

    const nwsData = await getNWSFromRedis();
    const spotForecasts = {};

    for (const spotId of Object.keys(spotGroups)) {
      spotForecasts[spotId] = getHourlyForSpot(nwsData, spotId);
    }

    // 3. Gather user contact info (phone + push subscriptions)
    const [prefsResult, pushResult] = await Promise.all([
      sb.from('user_preferences').select('user_id, phone').in('user_id', [...proUsers]),
      sb.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key').in('user_id', [...proUsers]),
    ]);

    const phoneByUser = {};
    for (const p of prefsResult.data || []) {
      if (p.phone) phoneByUser[p.user_id] = p.phone;
    }

    const pushByUser = {};
    for (const s of pushResult.data || []) {
      if (!pushByUser[s.user_id]) pushByUser[s.user_id] = [];
      pushByUser[s.user_id].push({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth_key },
      });
    }

    // 4. Evaluate each alert
    let sent = 0;
    let skipped = 0;

    for (const alert of proAlerts) {
      const hourly = spotForecasts[alert.spot_id];
      if (!hourly || hourly.length === 0) { skipped++; continue; }

      const window = findNextRideableWindow(hourly, { minSpeed: alert.min_wind_mph });
      if (!window) { skipped++; continue; }

      // Anti-spam check
      const fingerprint = `${window.dayLabel}|${window.startStr}|${Math.round(window.peakSpeed)}`;

      if (alert.last_notified_at) {
        const hoursSince = (Date.now() - new Date(alert.last_notified_at).getTime()) / 3600000;
        if (hoursSince < ANTI_SPAM_HOURS) {
          if (alert.last_window_fingerprint === fingerprint) { skipped++; continue; }
          // Allow re-notify if peak upgraded significantly
          const prevPeak = parseFloat(alert.last_window_fingerprint?.split('|')[2]) || 0;
          if (Math.round(window.peakSpeed) - prevPeak < PEAK_UPGRADE_THRESHOLD) { skipped++; continue; }
        }
      }

      // 5. Build and send notification
      const spotName = humanSpotName(alert.spot_id);
      const message = formatAlertMessage({
        peakSpeed: Math.round(window.peakSpeed),
        discipline: alert.discipline,
        spotName,
        dayLabel: window.dayLabel,
        startStr: window.startStr,
        endStr: window.endStr,
      });

      const phone = phoneByUser[alert.user_id];
      const pushSubs = pushByUser[alert.user_id] || [];

      let dispatched = false;

      if (phone) {
        const result = await sendSessionAlert({ phone, spotName, message });
        if (result.success) dispatched = true;
      }

      if (!dispatched && pushSubs.length > 0) {
        for (const sub of pushSubs) {
          const result = await sendSessionAlert({ pushSub: sub, spotName, message });
          if (result.success) { dispatched = true; break; }
        }
      }

      if (dispatched) {
        sent++;
        await sb
          .from('session_alerts')
          .update({
            last_notified_at: new Date().toISOString(),
            last_window_fingerprint: fingerprint,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alert.id);
      }
    }

    console.log(`[4-session-alerts] Complete — sent=${sent}, skipped=${skipped}, total=${proAlerts.length}`);

    // Chain to Stage 5 — Fishing Alerts
    await triggerNextStage('/api/internal/5-fishing-alerts', req, { from: '4-session-alerts' });

    return res.status(200).json({
      ok: true,
      stage: '4-session-alerts',
      sent,
      skipped,
      total: proAlerts.length,
    });
  } catch (error) {
    console.error('[4-session-alerts] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function getNWSFromRedis() {
  try {
    const raw = await redisCommand('GET', 'nws:forecasts');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Map NWS cached hourly data (speed/dir/text) into the format
 * expected by findNextRideableWindow (windSpeed/windDirection/startTime).
 */
function getHourlyForSpot(nwsData, spotId) {
  if (!nwsData?.grids) return [];
  const gridId = LAKE_TO_GRID[spotId] || LAKE_TO_GRID[spotId.split('-').slice(0, -1).join('-')] || 'utah-lake';
  const grid = nwsData.grids[gridId];
  if (!grid?.hourly) return [];

  return grid.hourly.map(h => ({
    startTime: h.time,
    windSpeed: h.speed,
    windDirection: h.dir,
    shortForecast: h.text,
  }));
}

/**
 * Inline findNextRideableWindow to avoid cross-app imports.
 * Mirrors apps/wind/src/utils/findNextRideableWindow.js.
 */
function findNextRideableWindow(hourlyForecast, opts = {}) {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  const minSpeed = opts.minSpeed ?? 8;
  const minHours = opts.minHours ?? 1;

  let bestWindow = null;
  let currentWindow = null;

  for (let i = 0; i < hourlyForecast.length; i++) {
    const hour = hourlyForecast[i];
    const speed = hour.windSpeed ?? 0;

    if (speed >= minSpeed) {
      const startDate = new Date(hour.startTime || hour.time);
      if (!currentWindow) {
        currentWindow = { startIdx: i, startTime: startDate, peakSpeed: speed, peakHour: startDate, hours: 1 };
      } else {
        currentWindow.hours += 1;
        if (speed > currentWindow.peakSpeed) {
          currentWindow.peakSpeed = speed;
          currentWindow.peakHour = startDate;
        }
      }
    } else {
      if (currentWindow && currentWindow.hours >= minHours) {
        bestWindow = currentWindow;
        break;
      }
      currentWindow = null;
    }
  }

  if (currentWindow && currentWindow.hours >= minHours && !bestWindow) {
    bestWindow = currentWindow;
  }
  if (!bestWindow) return null;

  const endIdx = bestWindow.startIdx + bestWindow.hours - 1;
  const endDate = new Date(hourlyForecast[endIdx].startTime || hourlyForecast[endIdx].time);
  endDate.setHours(endDate.getHours() + 1);

  const dayLabel = getDayLabel(bestWindow.startTime);
  const startStr = fmtHour(bestWindow.startTime);
  const endStr = fmtHour(endDate);

  return {
    startTime: bestWindow.startTime,
    endTime: endDate,
    peakSpeed: bestWindow.peakSpeed,
    hours: bestWindow.hours,
    dayLabel,
    startStr,
    endStr,
    hasWindow: true,
  };
}

function getDayLabel(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function fmtHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function humanSpotName(spotId) {
  return spotId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
