// NotWindy Service Worker - takes over from any previous service workers
// This is a minimal SW that just clears old caches and serves fresh content

const CACHE_NAME = 'notwindy-v1';

self.addEventListener('install', (event) => {
  // Take over immediately
  self.skipWaiting();
  
  // Clear any old caches from other apps
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('utah-wind'))
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Network-first strategy - always try to get fresh content
self.addEventListener('fetch', (event) => {
  // Let all requests go to the network
  // This ensures fresh content is always served
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, try cache as fallback
      return caches.match(event.request);
    })
  );
});
