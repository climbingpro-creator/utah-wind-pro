import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
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
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
