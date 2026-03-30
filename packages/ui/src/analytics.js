/**
 * Lightweight analytics event tracker.
 * Batches events and flushes to the analytics_events Supabase table.
 */

let _supabase = null;
let _queue = [];
let _flushTimer = null;
const FLUSH_INTERVAL = 10000;
const MAX_BATCH = 20;

export function initAnalytics(supabaseClient) {
  _supabase = supabaseClient;
  if (!_flushTimer) {
    _flushTimer = setInterval(flush, FLUSH_INTERVAL);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
  }
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
    await _supabase.from('analytics_events').insert(batch);
  } catch (err) {
    console.warn('[analytics] flush failed:', err?.message);
    _queue.unshift(...batch);
  }
}
