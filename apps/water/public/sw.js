// NotWindy Service Worker v2 - NUCLEAR CLEANUP
// Aggressively clears ALL old caches and forces fresh content
// This fixes the issue where old Utah Wind Finder content persists

const CACHE_VERSION = 'notwindy-v3';

// On install: immediately take over and clear ALL caches
self.addEventListener('install', (event) => {
  console.log('[NotWindy SW] Installing v2 - clearing all old caches');
  
  // Skip waiting - take over immediately
  self.skipWaiting();
  
  // Clear ALL caches (not just utah-wind prefixed ones)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[NotWindy SW] Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[NotWindy SW] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
});

// On activate: claim all clients and force reload if needed
self.addEventListener('activate', (event) => {
  console.log('[NotWindy SW] Activating - claiming all clients');
  
  event.waitUntil(
    Promise.all([
      // Claim all clients
      self.clients.claim(),
      
      // Clear any remaining caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_VERSION)
            .map((name) => caches.delete(name))
        );
      }),
      
      // Notify all clients to reload
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          // Post message to trigger reload in the app
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      }),
    ])
  );
});

// Fetch: pass through to network - service worker does NOT cache
self.addEventListener('fetch', (event) => {
  // Let the browser handle everything natively — no interception
  return;
});

// ── Push notifications ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'NotWindy';
  const options = {
    body: data.body || 'Fishing conditions update',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'notwindy',
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHES') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
