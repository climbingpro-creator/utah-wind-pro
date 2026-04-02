import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* eslint-disable no-undef */
if (typeof __BUILD_TIME__ !== 'undefined') {
  console.log('[water] build:', __BUILD_TIME__);
}

// Register service worker to take over from any stale wind app SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((reg) => {
      console.log('[NotWindy] Service worker registered');
      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed, reload to get fresh content
              window.location.reload();
            }
          });
        }
      });
    })
    .catch((err) => console.warn('[NotWindy] SW registration failed:', err));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
