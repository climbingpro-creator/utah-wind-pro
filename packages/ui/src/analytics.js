/**
 * Lightweight analytics event tracker.
 * Batches events and flushes to the analytics_events Supabase table.
 *
 * Uses sendBeacon on page unload so events survive tab close.
 * Page views flush immediately to avoid loss from short visits.
 */

let _supabase = null;
let _supabaseUrl = null;
let _supabaseKey = null;
let _queue = [];
let _flushTimer = null;
const FLUSH_INTERVAL = 5000;
const MAX_BATCH = 20;

export function initAnalytics(supabaseClient) {
  _supabase = supabaseClient;

  try {
    _supabaseUrl = supabaseClient.supabaseUrl;
    _supabaseKey = supabaseClient.supabaseKey;
  } catch (_) { /* older client versions */ }

  if (!_flushTimer) {
    _flushTimer = setInterval(flush, FLUSH_INTERVAL);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', beaconFlush);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') beaconFlush();
}

export function trackEvent(eventType, metadata = {}) {
  _queue.push({
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  });
  if (_queue.length >= MAX_BATCH) flush();
}

export function trackPageView(page) {
  trackEvent('page_view', { page, referrer: document.referrer || null });
  flush();
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

async function flush() {
  if (!_supabase || _queue.length === 0) return;
  const batch = _queue.splice(0, MAX_BATCH);
  try {
    const { error } = await _supabase.from('analytics_events').insert(batch);
    if (error) {
      console.warn('[analytics] flush insert error:', error.message, error.code);
      _queue.unshift(...batch);
    }
  } catch (err) {
    console.warn('[analytics] flush network error:', err?.message);
    _queue.unshift(...batch);
  }
}

/**
 * Fire-and-forget flush using sendBeacon — survives tab close / navigation.
 * Falls back to sync XHR if sendBeacon or Supabase URL isn't available.
 */
function beaconFlush() {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, MAX_BATCH);

  if (_supabaseUrl && _supabaseKey) {
    const url = `${_supabaseUrl}/rest/v1/analytics_events`;
    const headers = {
      apikey: _supabaseKey,
      Authorization: `Bearer ${_supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };

    try {
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
        keepalive: true,
      });
    } catch (_) {
      _queue.unshift(...batch);
    }
    return;
  }

  // Fallback: re-queue and hope the regular flush picks it up
  _queue.unshift(...batch);
  flush();
}
