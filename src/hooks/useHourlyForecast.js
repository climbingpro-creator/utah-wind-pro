import { useEffect, useMemo, useState } from 'react';
import { getHourlyForecast, getHourlyForecastForPoint } from '../services/ForecastService';

export function useHourlyForecast({ lakeId = null, coordinates = null, enabled = true }) {
  const [forecastHours, setForecastHours] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestKey = useMemo(() => {
    if (lakeId) return `lake:${lakeId}`;
    if (coordinates?.lat != null && coordinates?.lng != null) {
      return `point:${coordinates.lat.toFixed(3)},${coordinates.lng.toFixed(3)}`;
    }
    return null;
  }, [lakeId, coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      if (!enabled || !requestKey) {
        setForecastHours([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = lakeId
          ? await getHourlyForecast(lakeId)
          : await getHourlyForecastForPoint(coordinates.lat, coordinates.lng, requestKey);

        if (!cancelled) {
          setForecastHours(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setForecastHours([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [enabled, requestKey, lakeId, coordinates?.lat, coordinates?.lng]);

  return {
    forecastHours,
    isLoading,
    error,
  };
}
