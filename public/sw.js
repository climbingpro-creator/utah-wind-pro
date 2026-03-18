// Service Worker for UtahWindFinder — v3 with offline API caching
const CACHE_NAME = 'utahwindfinder-v3';
const API_CACHE = 'utah-wind-api-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Condition endpoints that benefit from stale-while-revalidate offline
const CACHEABLE_API = [
  '/api/current-conditions',
  '/api/thermal-forecast',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME, API_CACHE]);
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => !keep.has(n)).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cacheable API endpoints: network-first, cache fallback for offline
  if (CACHEABLE_API.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkFirstApi(event.request));
    return;
  }

  // Skip all other API / external requests
  if (url.pathname.includes('/api/') ||
      url.hostname.includes('api.synopticdata.com') ||
      url.hostname.includes('rt.ambientweather.net') ||
      url.hostname.includes('api.weather.gov')) {
    return;
  }

  // Static assets: network-first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

const API_TIMEOUT_MS = 3000;

async function networkFirstApi(request) {
  // Race the network against a timeout.  At Lincoln Point with 1 bar of LTE,
  // this prevents hanging — after 3s we serve the last cached forecast.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    const clone = response.clone();
    const cache = await caches.open(API_CACHE);
    cache.put(request, clone);
    return response;
  } catch (err) {
    clearTimeout(timer);

    // Network failed or timed out — serve cached version
    const cached = await caches.match(request);
    if (cached) {
      // Inject a header so the UI knows this is stale data
      const headers = new Headers(cached.headers);
      headers.set('X-Wind-Cache', 'stale');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }

    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No network and no cached data available. Head to a spot with signal!',
      offline: true,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'UtahWindFinder';
  const options = {
    body: data.body || 'Wind conditions update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'wind-update',
    data: data.url || '/',
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
