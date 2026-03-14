import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherService } from '../services/WeatherService';
import { getWaterTemp } from '../services/USGSWaterService';
import {
  calculatePressureGap,
  calculateThermalDelta,
  calculateBoundaryCrossing,
  calculateThermalConfidence,
  getThermalWindowPrediction,
} from '../utils/thermalCalculations';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useWeatherData() {
  const [data, setData] = useState({
    ambient: null,
    pressure: null,
    ridge: null,
    regionalWinds: [],
  });
  const [calculations, setCalculations] = useState({
    pressureGap: null,
    thermalDelta: null,
    boundaryCrossing: null,
    confidence: 50,
    prediction: getThermalWindowPrediction(50),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const dataRef = useRef(data);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      setIsLoading((prev) => dataRef.current.ambient === null);

      const weatherData = await weatherService.getAllWeatherData();
      
      const hasAnyData = weatherData.ambient || weatherData.pressure || 
                         weatherData.ridge || weatherData.regionalWinds?.length > 0;
      
      if (!hasAnyData && !dataRef.current.ambient) {
        setError('Unable to fetch weather data. Please check your API keys.');
      } else {
        setError(null);
      }
      
      const newData = {
        ambient: weatherData.ambient || dataRef.current.ambient,
        pressure: weatherData.pressure || dataRef.current.pressure,
        ridge: weatherData.ridge || dataRef.current.ridge,
        regionalWinds: weatherData.regionalWinds?.length > 0 
          ? weatherData.regionalWinds 
          : dataRef.current.regionalWinds,
      };
      
      dataRef.current = newData;
      setData(newData);
      setLastUpdated(new Date());

      const pressureGap = calculatePressureGap(
        newData.pressure?.slcPressure,
        newData.pressure?.provoPressure
      );

      const thermalDelta = calculateThermalDelta(
        newData.ambient?.temperature,
        newData.ridge?.temperature
      );

      let usgsWaterTemp = 65;
      try {
        const usgs = await getWaterTemp('utah-lake');
        if (usgs?.tempF != null) usgsWaterTemp = usgs.tempF;
      } catch (_) {}

      const boundaryCrossing = calculateBoundaryCrossing(
        newData.ambient?.temperature,
        usgsWaterTemp,
        newData.ambient?.windSpeed
      );

      const confidence = calculateThermalConfidence({
        pressureGap,
        thermalDelta,
        boundaryCrossing,
        timeOfDay: new Date().toISOString(),
        currentWindSpeed: newData.ambient?.windSpeed,
        currentWindDirection: newData.ambient?.windDirection,
      });

      const prediction = getThermalWindowPrediction(confidence);

      setCalculations({
        pressureGap,
        thermalDelta,
        boundaryCrossing,
        confidence,
        prediction,
      });
    } catch (err) {
      console.error('Error fetching weather data:', err);
      if (!dataRef.current.ambient) {
        setError(err.message || 'Failed to fetch weather data');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    calculations,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
