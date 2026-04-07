import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* eslint-disable no-undef */
if (typeof __BUILD_TIME__ !== 'undefined') {
  console.log('[NotWindy] build:', __BUILD_TIME__);
}

// ─── Service Worker Registration with Aggressive Cache Clearing ───────────
// This ensures users always get fresh NotWindy content, not stale Utah Wind Finder

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    // First, unregister any existing service workers that might be serving old content
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      // Check if this is an old/different service worker
      if (registration.active && !registration.active.scriptURL.includes('sw.js')) {
        console.log('[NotWindy] Unregistering old SW:', registration.active.scriptURL);
        await registration.unregister();
      }
    }
    
    // Clear all caches directly (in case old SW cached content)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('[NotWindy] Clearing caches:', cacheNames);
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    
    // Register our new service worker
    const reg = await navigator.serviceWorker.register('/sw.js', { 
      scope: '/',
      updateViaCache: 'none', // Always fetch fresh SW
    });
    
    console.log('[NotWindy] Service worker registered');
    
    // Force update check
    reg.update();
    
    // Listen for updates
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New SW installed while old one was active - reload
              console.log('[NotWindy] New SW installed, reloading...');
              window.location.reload();
            }
          }
        });
      }
    });
    
    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[NotWindy] SW updated to:', event.data.version);
        // Reload to get fresh content
        window.location.reload();
      }
    });
    
  } catch (err) {
    console.warn('[NotWindy] SW registration failed:', err);
  }
}

// Run SW registration
registerServiceWorker();

// Also clear localStorage keys from old app if they exist
try {
  const keysToCheck = ['utah-wind-', 'utahwind-', 'wind-finder'];
  for (const key of Object.keys(localStorage)) {
    if (keysToCheck.some((prefix) => key.toLowerCase().includes(prefix))) {
      console.log('[NotWindy] Removing old localStorage key:', key);
      localStorage.removeItem(key);
    }
  }
} catch (_e) {
  // localStorage might not be available
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
