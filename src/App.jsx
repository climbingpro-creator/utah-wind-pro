import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  // Start the learning data collector when app loads
  useEffect(() => {
    dataCollector.start();
    
    // Cleanup on unmount
    return () => {
      dataCollector.stop();
    };
  }, []);

  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
