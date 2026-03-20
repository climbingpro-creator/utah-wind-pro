import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { InstallPrompt } from './components/InstallPrompt';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function useSWRegistration() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

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

function App() {
  const updateReady = useSWRegistration();

  useEffect(() => {
    dataCollector.start();
    return () => {
      dataCollector.stop();
    };
  }, []);

  return (
    <ErrorBoundary name="UtahWindFinder">
      <AuthProvider>
        <ThemeProvider>
          <Dashboard />
          <InstallPrompt onUpdateAvailable={updateReady} />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
