/**
 * Lightweight analytics event tracker.
 * Every event is flushed to Supabase immediately — no batching delays.
 * Uses fetch with keepalive on page unload as a safety net.
 */

let _supabase = null;
let _supabaseUrl = null;
let _supabaseKey = null;
let _pending = [];

export function initAnalytics(supabaseClient) {
  _supabase = supabaseClient;

  try {
    _supabaseUrl = supabaseClient.supabaseUrl;
    _supabaseKey = supabaseClient.supabaseKey;
  } catch (_) { /* older client versions */ }

  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') beaconFlush();
    });
    window.addEventListener('beforeunload', beaconFlush);
  }

  if (_pending.length > 0) flushAll();
}

function sendToSupabase(rows) {
  if (!_supabase || rows.length === 0) return;
  _supabase.from('analytics_events').insert(rows).then(({ error }) => {
    if (error) console.warn('[analytics] insert error:', error.message);
  }).catch((err) => {
    console.warn('[analytics] network error:', err?.message);
  });
}

function flushAll() {
  if (_pending.length === 0) return;
  const batch = _pending.splice(0);
  sendToSupabase(batch);
}

export function trackEvent(eventType, metadata = {}) {
  const row = {
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  };

  if (_supabase) {
    sendToSupabase([row]);
  } else {
    _pending.push(row);
  }
}

export function trackPageView(page) {
  trackEvent('page_view', { page, referrer: document.referrer || null });
}

export function trackPinDrop(lat, lng, waterType) {
  trackEvent('pin_drop', { lat, lng, waterType });
}

export function trackBioApiCall(name, type) {
  trackEvent('bio_api_call', { name, type });
}

export function trackMapInteraction(action) {
  trackEvent('map_interaction', { action });
}

function beaconFlush() {
  if (_pending.length === 0) return;
  const batch = _pending.splice(0);

  if (_supabaseUrl && _supabaseKey) {
    try {
      fetch(`${_supabaseUrl}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: {
          apikey: _supabaseKey,
          Authorization: `Bearer ${_supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(batch),
        keepalive: true,
      });
    } catch (_) {}
    return;
  }

  sendToSupabase(batch);
}
