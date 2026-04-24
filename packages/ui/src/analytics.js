/**
 * Lightweight analytics event tracker.
 * POSTs events to /api/track which inserts server-side with the
 * service-role key, bypassing RLS. Every event fires immediately.
 */

let _apiOrigin = '';
let _pending = [];

export function initAnalytics(_supabaseClient, opts = {}) {
  if (opts.apiOrigin) _apiOrigin = opts.apiOrigin;

  if (_pending.length > 0) {
    sendBatch(_pending.splice(0));
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') beaconFlush();
    });
    window.addEventListener('beforeunload', beaconFlush);
  }
}

function sendBatch(rows) {
  const url = `${_apiOrigin}/api/track`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
    keepalive: true,
  }).catch((err) => {
    console.warn('[analytics] send error:', err?.message);
  });
}

export function trackEvent(eventType, metadata = {}) {
  const row = {
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  };

  if (_apiOrigin !== undefined) {
    sendBatch([row]);
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
  const url = `${_apiOrigin}/api/track`;

  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch (_) {}
}
