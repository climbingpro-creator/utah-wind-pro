import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  useEffect(() => {
    dataCollector.start();
    return () => {
      dataCollector.stop();
    };
  }, []);

  return (
    <ErrorBoundary name="Utah Wind Pro">
      <ThemeProvider>
        <Dashboard />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
