const UTM_KEY = 'nw_campaign_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

export function getStoredUtms() {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function captureCampaignParams() {
  if (typeof window === 'undefined') return {};
  const fromSearch = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const fromHash = new URLSearchParams(hashQuery);
  const next = { ...getStoredUtms() };
  for (const key of UTM_KEYS) {
    const value = fromSearch.get(key) || fromHash.get(key);
    if (value) next[key] = value;
  }
  if (Object.keys(next).length) {
    try {
      localStorage.setItem(UTM_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }
  return next;
}

export function initMetaPixel() {
  const id = import.meta.env.VITE_META_PIXEL_ID;
  if (!id || typeof window === 'undefined') return;
  if (window.fbq) {
    window.fbq('track', 'PageView');
    return;
  }

  const stub = function stub() {
    stub.callMethod ? stub.callMethod.apply(stub, arguments) : stub.queue.push(arguments);
  };
  stub.push = stub;
  stub.loaded = true;
  stub.version = '2.0';
  stub.queue = [];
  window.fbq = stub;
  window._fbq = stub;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(script, first);

  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

export function trackMeta(event, params) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params || {});
  }
}
