import { useEffect, useState, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Dashboard } from './components/Dashboard';
import { InstallPrompt } from './components/InstallPrompt';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary, FeedbackWidget, initAnalytics, trackPageView } from '@utahwind/ui';
import { supabase } from '@utahwind/database';
import { isNativeApp } from '@utahwind/weather';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const ScienceSheet = lazy(() => import('./pages/ScienceSheet'));

function useSWRegistration() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }, []);

  return updateReady;
}

function useNativePlatform() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isNativeApp()) return;

    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
    }).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (!isNativeApp()) return;

    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    }).catch(() => {});

    import('./services/NativePushService').then(({ initNativePushListeners }) => {
      initNativePushListeners();
    }).catch(() => {});
  }, []);
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function AppShell() {
  const updateReady = useSWRegistration();
  const hash = useHashRoute();
  const { user } = useAuth();
  useNativePlatform();

  useEffect(() => {
    dataCollector.start();
    if (supabase) {
      initAnalytics(supabase);
      trackPageView('wind');
    }
    return () => { dataCollector.stop(); };
  }, []);

  if (hash === '#admin') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading admin...</div>}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (hash === '#login') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading...</div>}>
        <Login />
      </Suspense>
    );
  }

  if (hash === '#science') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading science brief...</div>}>
        <ScienceSheet />
      </Suspense>
    );
  }

  return (
    <>
      <Dashboard />
      <InstallPrompt onUpdateAvailable={updateReady} />
      <FeedbackWidget supabase={supabase} userEmail={user?.email} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary name="UtahWindFinder">
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
          <Analytics />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
