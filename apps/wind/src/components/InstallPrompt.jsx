import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { isNativeApp } from '../utils/platform';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 14;

export function InstallPrompt({ onUpdateAvailable }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;
    }

    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (onUpdateAvailable) setShowUpdate(true);
  }, [onUpdateAvailable]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowInstall(false);
  }, []);

  const handleUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return; // controllerchange listener will reload
      }
    }
    window.location.reload();
  }, []);

  if (showUpdate) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md
        bg-cyan-600 text-white rounded-2xl shadow-2xl px-5 py-4
        flex items-center gap-3 animate-slide-up">
        <div className="flex-1">
          <p className="font-semibold text-sm">Update Available</p>
          <p className="text-xs text-cyan-100">A new version of UtahWindFinder is ready.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-cyan-700 font-bold text-sm px-4 py-2 rounded-xl
            hover:bg-cyan-50 transition-colors shrink-0">
          Refresh
        </button>
      </div>
    );
  }

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md
      bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl px-5 py-4
      flex items-center gap-3 animate-slide-up">
      <Download className="w-8 h-8 text-cyan-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white">Add to Home Screen</p>
        <p className="text-xs text-slate-400 truncate">Install UtahWindFinder for quick access</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-cyan-500 text-white font-bold text-sm px-4 py-2 rounded-xl
          hover:bg-cyan-400 transition-colors shrink-0">
        Install
      </button>
      <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
