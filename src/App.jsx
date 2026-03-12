import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { dataCollector } from './services/DataCollector';

function App() {
  // Start the learning data collector when app loads
  useEffect(() => {
    dataCollector.start();
    
    // Cleanup on unmount
    return () => {
      dataCollector.stop();
    };
  }, []);

  return <Dashboard />;
}

export default App;
