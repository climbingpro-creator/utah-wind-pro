import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherService } from '../services/WeatherService';
import { LakeState, getProbabilityStatus } from '../services/DataNormalizer';

const REFRESH_INTERVAL = 3 * 60 * 1000;
const HISTORY_REFRESH_INTERVAL = 10 * 60 * 1000;

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

      const newState = LakeState.fromRawData(
        lakeId,
        rawData.ambient,
        rawData.synoptic,
        history[lakeId]
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
      const historyData = await weatherService.getHistoryForLake(lakeId, 3);
      
      const historyMap = {};
      historyData.forEach((station) => {
        historyMap[station.stationId] = station.history;
      });
      
      setHistory((prev) => ({
        ...prev,
        [lakeId]: historyMap,
      }));
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [lakeId]);

  useEffect(() => {
    fetchData(true);
    fetchHistory();
    
    const dataInterval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    const historyInterval = setInterval(fetchHistory, HISTORY_REFRESH_INTERVAL);
    
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
