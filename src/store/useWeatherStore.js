import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { weatherService } from '../services/WeatherService';
import { LakeState, getProbabilityStatus } from '../services/DataNormalizer';

const REFRESH_INTERVAL = 60 * 1000;
const HISTORY_REFRESH_INTERVAL = 5 * 60 * 1000;

export const useWeatherStore = create((set, get) => ({
  lakeStates: {},
  history: {},
  activeLake: null,
  isLoading: true,
  error: null,
  lastUpdated: null,
  _isFetching: false,
  _previousProbability: {},
  _dataInterval: null,
  _historyInterval: null,

  fetchData: async (lakeId, forceRefresh = false) => {
    const state = get();
    if (state._isFetching && !forceRefresh) return;
    set({ _isFetching: true });

    const cachedState = state.lakeStates[lakeId];
    if (!cachedState) {
      set({ isLoading: true });
    }

    try {
      const rawData = await weatherService.getDataForLake(lakeId);
      const hasData = rawData.ambient || rawData.synoptic?.length > 0;

      if (!hasData && !cachedState) {
        set({ error: 'Unable to fetch weather data. Check API keys.' });
      } else {
        set({ error: null });
      }

      const lakeHistory = get().history[lakeId];
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

      const prevProb = get()._previousProbability[lakeId] || 0;
      if (newState.probability >= 75 && prevProb < 75) {
        window.dispatchEvent(new CustomEvent('thermal-alert', {
          detail: {
            probability: newState.probability,
            lake: newState.config?.name,
            message: `Thermal probability crossed 75% at ${newState.config?.name}!`,
          },
        }));
      }

      set((s) => ({
        lakeStates: { ...s.lakeStates, [lakeId]: newState },
        lastUpdated: new Date(),
        isLoading: false,
        _isFetching: false,
        _previousProbability: { ...s._previousProbability, [lakeId]: newState.probability },
      }));
    } catch (err) {
      console.error('Error fetching lake data:', err);
      const cached = get().lakeStates[lakeId];
      set({
        error: cached ? null : (err.message || 'Failed to fetch data'),
        isLoading: false,
        _isFetching: false,
      });
    }
  },

  fetchHistory: async (lakeId) => {
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

      set((s) => ({
        history: { ...s.history, [lakeId]: historyMap },
      }));
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  },

  startPolling: (lakeId) => {
    const state = get();

    if (state._dataInterval) clearInterval(state._dataInterval);
    if (state._historyInterval) clearInterval(state._historyInterval);

    set({ activeLake: lakeId, isLoading: !state.lakeStates[lakeId] });

    get().fetchData(lakeId, true);
    get().fetchHistory(lakeId);

    const dataInterval = setInterval(() => get().fetchData(lakeId), REFRESH_INTERVAL);
    const historyInterval = setInterval(() => get().fetchHistory(lakeId), HISTORY_REFRESH_INTERVAL);

    set({ _dataInterval: dataInterval, _historyInterval: historyInterval });
  },

  stopPolling: () => {
    const { _dataInterval, _historyInterval } = get();
    if (_dataInterval) clearInterval(_dataInterval);
    if (_historyInterval) clearInterval(_historyInterval);
    set({ _dataInterval: null, _historyInterval: null });
  },

  refresh: () => {
    const { activeLake } = get();
    if (activeLake) get().fetchData(activeLake, true);
  },
}));

/**
 * Drop-in replacement for the old useLakeData hook.
 * Subscribes to granular slices so only consumers of changed data re-render.
 */
export function useWeatherData(lakeId) {
  const lakeState = useWeatherStore((s) => s.lakeStates[lakeId] ?? null);
  const history = useWeatherStore((s) => s.history[lakeId] ?? {});
  const isLoading = useWeatherStore((s) => s.isLoading);
  const error = useWeatherStore((s) => s.error);
  const lastUpdated = useWeatherStore((s) => s.lastUpdated);
  const refresh = useWeatherStore((s) => s.refresh);
  const startPolling = useWeatherStore((s) => s.startPolling);
  const stopPolling = useWeatherStore((s) => s.stopPolling);
  const activeLake = useWeatherStore((s) => s.activeLake);

  const prevLakeRef = useRef(lakeId);

  useEffect(() => {
    if (lakeId !== activeLake || lakeId !== prevLakeRef.current) {
      startPolling(lakeId);
      prevLakeRef.current = lakeId;
    }
    return () => {};
  }, [lakeId, activeLake, startPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const status = lakeState ? getProbabilityStatus(lakeState.probability, lakeState.thermalPrediction) : null;

  return { lakeState, history, status, isLoading, error, lastUpdated, refresh };
}
