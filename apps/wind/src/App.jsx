import { useEffect, useState, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Dashboard } from './components/Dashboard';
import { InstallPrompt } from './components/InstallPrompt';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary, FeedbackWidget } from '@utahwind/ui';
import { supabase } from '@utahwind/database';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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

  useEffect(() => {
    dataCollector.start();
    return () => { dataCollector.stop(); };
  }, []);

  if (hash === '#admin') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading admin...</div>}>
        <AdminDashboard />
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
