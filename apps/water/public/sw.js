// NotWindy Service Worker v2 - NUCLEAR CLEANUP
// Aggressively clears ALL old caches and forces fresh content
// This fixes the issue where old Utah Wind Finder content persists

const CACHE_VERSION = 'notwindy-v2';

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

// Fetch: ALWAYS go to network, never serve from cache
// This ensures users always get fresh content
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request, {
      // Bypass HTTP cache to ensure fresh content
      cache: 'no-store',
    }).catch((error) => {
      console.log('[NotWindy SW] Network failed, no cache fallback:', error);
      // Don't serve from cache - let the error propagate
      // This forces users to see the real state of the network
      return new Response('Network error', { status: 503 });
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
