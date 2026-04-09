const SMS_PREFS_KEY = 'utahwind_sms_prefs';
const SMS_HISTORY_KEY = 'utahwind_sms_history';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between same alert type

const DEFAULT_PREFS = {
  phone: '',
  enabled: false,
  verified: false,
  alerts: {
    windThreshold: true,
    glassConditions: true,
    thermalCycle: true,
    severeWeather: true,
    dailyBriefing: false,
  },
  thresholds: {
    windMin: 10,
    windMax: 30,
    gustMax: 35,
  },
  activities: ['kiting'],
  locations: ['utah-lake-zigzag'],
  quietHours: { start: 21, end: 7 },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const FRONTEND_TO_BACKEND_KEYS = {
  glassConditions: 'glassNotify',
  thermalCycle: 'thermalNotify',
  severeWeather: 'severeNotify',
};

function mapPrefsToServer(prefs) {
  const alerts = {};
  for (const [feKey, val] of Object.entries(prefs.alerts || {})) {
    const beKey = FRONTEND_TO_BACKEND_KEYS[feKey] || feKey;
    alerts[beKey] = val;
  }
  if (prefs.alerts?.windThreshold && prefs.thresholds?.windMin) {
    alerts.windThreshold = prefs.thresholds.windMin;
  }
  alerts.quietStart = `${String(prefs.quietHours?.start ?? 21).padStart(2, '0')}:00`;
  alerts.quietEnd = `${String(prefs.quietHours?.end ?? 7).padStart(2, '0')}:00`;
  return alerts;
}

function toE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export async function syncToServer(prefs) {
  try {
    const { supabase } = await import('../lib/supabase');
    if (!supabase) return { success: false, reason: 'no-supabase' };
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return { success: false, reason: 'not-authenticated' };

    const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
    const body = {
      phone: toE164(prefs.phone),
      alerts: mapPrefsToServer(prefs),
      activities: prefs.activities,
    };

    const resp = await fetch(`${apiOrigin}/api/user-preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('[SMS] Server sync failed:', resp.status, text);
      return { success: false, reason: `http-${resp.status}` };
    }
    return { success: true };
  } catch (err) {
    console.warn('[SMS] Server sync error:', err.message);
    return { success: false, reason: err.message };
  }
}

export function getSMSPrefs() {
  try {
    const stored = localStorage.getItem(SMS_PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
}

export function saveSMSPrefs(prefs) {
  localStorage.setItem(SMS_PREFS_KEY, JSON.stringify(prefs));
}

export function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

export function isValidPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}

function isQuietHour(prefs) {
  const hour = new Date().getHours();
  const { start, end } = prefs.quietHours;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

function getHistory() {
  try {
    const stored = localStorage.getItem(SMS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addToHistory(alertType) {
  const history = getHistory();
  history.push({ type: alertType, time: Date.now() });
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const trimmed = history.filter(h => h.time > cutoff);
  localStorage.setItem(SMS_HISTORY_KEY, JSON.stringify(trimmed));
}

function wasRecentlySent(alertType) {
  const history = getHistory();
  const cutoff = Date.now() - COOLDOWN_MS;
  return history.some(h => h.type === alertType && h.time > cutoff);
}

export function evaluateAlerts(conditions, prefs) {
  if (!prefs?.enabled || !prefs?.phone || isQuietHour(prefs)) return [];

  const alerts = [];
  const { windSpeed, windGust, windDirection: _windDirection, glassScore, thermalProbability, severeAlert } = conditions;

  if (prefs.alerts.windThreshold && windSpeed != null) {
    if (windSpeed >= prefs.thresholds.windMin && windSpeed <= prefs.thresholds.windMax) {
      if (!wasRecentlySent('wind_on')) {
        alerts.push({
          type: 'wind_on',
          priority: 'high',
          title: 'Wind is ON!',
          message: `${Math.round(windSpeed)} mph${windGust ? ` (G${Math.round(windGust)})` : ''} — conditions are go for ${prefs.activities.join(', ')}`,
        });
      }
    }
    if (windGust > prefs.thresholds.gustMax) {
      if (!wasRecentlySent('gust_warning')) {
        alerts.push({
          type: 'gust_warning',
          priority: 'urgent',
          title: 'Gust Warning',
          message: `Gusts hitting ${Math.round(windGust)} mph — exercise caution`,
        });
      }
    }
  }

  if (prefs.alerts.glassConditions && glassScore != null && glassScore >= 85) {
    if (!wasRecentlySent('glass')) {
      alerts.push({
        type: 'glass',
        priority: 'high',
        title: 'Glass Conditions!',
        message: `Water is glass right now (score: ${glassScore}) — perfect for boating & paddling`,
      });
    }
  }

  if (prefs.alerts.thermalCycle && thermalProbability != null && thermalProbability >= 70) {
    if (!wasRecentlySent('thermal')) {
      alerts.push({
        type: 'thermal',
        priority: 'medium',
        title: 'Thermal Cycle Building',
        message: `${thermalProbability}% probability — wind expected within the hour`,
      });
    }
  }

  if (prefs.alerts.severeWeather && severeAlert) {
    if (!wasRecentlySent('severe')) {
      alerts.push({
        type: 'severe',
        priority: 'urgent',
        title: 'Severe Weather Alert',
        message: severeAlert,
      });
    }
  }

  return alerts;
}

export async function sendSMSAlert(alert, prefs) {
  if (!prefs?.phone || !prefs?.enabled) return false;

  const digits = prefs.phone.replace(/\D/g, '');
  const to = digits.length === 10 ? `+1${digits}` : `+${digits}`;

  const message = `[UtahWindFinder] ${alert.title}\n${alert.message}`;

  try {
    const endpoint = import.meta.env.VITE_SMS_ENDPOINT;
    if (!endpoint) {
      console.log('[SMS] No endpoint configured — alert queued locally:', message);
      addToHistory(alert.type);
      return true;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, priority: alert.priority }),
    });

    if (res.ok) {
      addToHistory(alert.type);
      return true;
    }
    console.warn('[SMS] Send failed:', res.status);
    return false;
  } catch (err) {
    console.warn('[SMS] Network error:', err);
    addToHistory(alert.type);
    return true;
  }
}

export function processConditions(conditions, prefs) {
  const alerts = evaluateAlerts(conditions, prefs);
  for (const alert of alerts) {
    sendSMSAlert(alert, prefs);
  }
  return alerts;
}
