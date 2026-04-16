import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Server-rendered pages must bypass the SW so Vercel rewrites reach the API
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    (/^\/day\//.test(url.pathname) ||
     /^\/session\//.test(url.pathname) ||
     /^\/year\//.test(url.pathname)),
  new NetworkOnly()
);

// ── API caching: network-first with 3s timeout, cached fallback ──
const API_TIMEOUT_MS = 3000;

const CACHEABLE_API = [
  /\/api\/current-conditions/,
  /\/api\/thermal-forecast/,
];

for (const pattern of CACHEABLE_API) {
  registerRoute(
    ({ url }) => pattern.test(url.pathname),
    new NetworkFirst({
      cacheName: 'utah-wind-api-v2',
      networkTimeoutSeconds: API_TIMEOUT_MS / 1000,
      plugins: [
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 }),
      ],
    })
  );
}

// ── Push notifications ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'LiftForecast';
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
