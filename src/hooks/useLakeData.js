import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherService } from '../services/WeatherService';
import { LakeState, getProbabilityStatus } from '../services/DataNormalizer';

const REFRESH_INTERVAL = 20 * 1000;
const HISTORY_REFRESH_INTERVAL = 5 * 60 * 1000;

export function useLakeData(lakeId) {
  const [lakeState, setLakeState] = useState(null);
  const [history, setHistory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const isFetching = useRef(false);
  const previousLakeId = useRef(lakeId);
  const cachedStates = useRef({});
  const previousProbability = useRef(0);
  const fetchDataRef = useRef(null);
  const fetchHistoryRef = useRef(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (isFetching.current && !forceRefresh) return;
    isFetching.current = true;

    const isNewLake = previousLakeId.current !== lakeId;
    if (isNewLake) {
      if (cachedStates.current[lakeId]) {
        setLakeState(cachedStates.current[lakeId]);
      }
      setIsLoading(!cachedStates.current[lakeId]);
      previousLakeId.current = lakeId;
    } else {
      setIsLoading((prev) => !lakeState && prev);
    }

    try {
      const rawData = await weatherService.getDataForLake(lakeId);
      
      const hasData = rawData.ambient || rawData.synoptic?.length > 0;
      
      if (!hasData && !cachedStates.current[lakeId]) {
        setError('Unable to fetch weather data. Check API keys.');
      } else {
        setError(null);
      }

      // Flatten history from { stationId: [readings] } to sorted array for LakeState
      const lakeHistory = history[lakeId];
      const historyArray = lakeHistory
        ? Object.values(lakeHistory).flat().sort((a, b) =>
            new Date(b.dateTime || b.timestamp || 0) - new Date(a.dateTime || a.timestamp || 0))
        : null;

      const newState = LakeState.fromRawData(
        lakeId,
        rawData.ambient,
        rawData.synoptic,
        historyArray,
        rawData.wuPws
      );

      cachedStates.current[lakeId] = newState;
      setLakeState(newState);
      setLastUpdated(new Date());

      if (newState.probability >= 75 && previousProbability.current < 75) {
        window.dispatchEvent(new CustomEvent('thermal-alert', {
          detail: {
            probability: newState.probability,
            lake: newState.config?.name,
            message: `Thermal probability crossed 75% at ${newState.config?.name}!`,
          },
        }));
      }
      previousProbability.current = newState.probability;

    } catch (err) {
      console.error('Error fetching lake data:', err);
      if (!cachedStates.current[lakeId]) {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [lakeId, lakeState, history]);

  const fetchHistory = useCallback(async () => {
    try {
      const [historyData, ambientHistory] = await Promise.allSettled([
        weatherService.getHistoryForLake(lakeId, 3),
        weatherService.getAmbientHistory(36),
      ]);

      const historyMap = {};
      if (historyData.status === 'fulfilled') {
        historyData.value.forEach((station) => {
          historyMap[station.stationId] = station.history;
        });
      }

      if (ambientHistory.status === 'fulfilled' && ambientHistory.value?.length > 0) {
        historyMap['PWS'] = ambientHistory.value
          .filter(r => r.windspeedmph != null)
          .map(r => ({
            timestamp: r.date || r.dateutc,
            windSpeed: r.windspeedmph,
            windGust: r.windgustmph,
            windDirection: r.winddir,
            temperature: r.tempf,
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }

      setHistory((prev) => ({
        ...prev,
        [lakeId]: historyMap,
      }));
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [lakeId]);

  // Keep refs current so intervals always call latest version
  fetchDataRef.current = fetchData;
  fetchHistoryRef.current = fetchHistory;

  useEffect(() => {
    fetchDataRef.current(true);
    fetchHistoryRef.current();
    
    const dataInterval = setInterval(() => fetchDataRef.current(), REFRESH_INTERVAL);
    const historyInterval = setInterval(() => fetchHistoryRef.current(), HISTORY_REFRESH_INTERVAL);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(historyInterval);
    };
  }, [lakeId]);

  const status = lakeState ? getProbabilityStatus(lakeState.probability, lakeState.thermalPrediction) : null;

  return {
    lakeState,
    history: history[lakeId] || {},
    status,
    isLoading,
    error,
    lastUpdated,
    refresh: () => fetchData(true),
  };
}
