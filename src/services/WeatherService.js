import axios from 'axios';
import { getAllStationIds } from '../config/lakeStations';
import { apiUrl } from '../utils/platform';

const IS_PRODUCTION = import.meta.env.PROD;

async function axiosWithRetry(config, retries = 2, baseDelay = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      const status = err.response?.status;
      const retryable = !status || status >= 500 || status === 429;
      if (attempt >= retries || !retryable) throw err;
      await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));
    }
  }
}

// In production, keys stay on the server via /api/weather proxy.
// In development, use VITE_ env vars directly for local testing.
const AMBIENT_API_KEY = import.meta.env.VITE_AMBIENT_API_KEY;
const AMBIENT_APP_KEY = import.meta.env.VITE_AMBIENT_APP_KEY;
const SYNOPTIC_TOKEN  = import.meta.env.VITE_SYNOPTIC_TOKEN;

const AMBIENT_BASE_URL  = 'https://rt.ambientweather.net/v1';
const SYNOPTIC_BASE_URL = 'https://api.synopticdata.com/v2';

let lastAmbientCall = 0;
const AMBIENT_RATE_LIMIT_MS = 5000;

class WeatherService {
  async getAmbientWeatherData() {
    const now = Date.now();
    if (now - lastAmbientCall < AMBIENT_RATE_LIMIT_MS) {
      return null;
    }
    lastAmbientCall = now;

    try {
      let data;

      if (IS_PRODUCTION) {
        const response = await axiosWithRetry({ method: 'get', url: apiUrl('/api/weather'), params: { source: 'ambient' } });
        data = response.data;
      } else {
        const response = await axios.get(`${AMBIENT_BASE_URL}/devices`, {
          params: { apiKey: AMBIENT_API_KEY, applicationKey: AMBIENT_APP_KEY },
        });
        data = response.data;
      }

      if (data && data.length > 0) {
        const device = data[0];
        const lastData = device.lastData;
        
        return {
          stationName: device.info?.name || 'Personal Weather Station',
          timestamp: lastData.dateutc,
          temperature: lastData.tempf,
          humidity: lastData.humidity,
          windSpeed: lastData.windspeedmph,
          windGust: lastData.windgustmph,
          windDirection: lastData.winddir,
          pressure: lastData.baromrelin,
          dewPoint: lastData.dewPoint,
          feelsLike: lastData.feelsLike,
          hourlyRain: lastData.hourlyrainin,
          dailyRain: lastData.dailyrainin,
          uv: lastData.uv,
          solarRadiation: lastData.solarradiation,
        };
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Ambient Weather API rate limited');
        return null;
      }
      console.error('Ambient Weather API error:', error.message);
      return null;
    }
  }

  async getAmbientHistory(limit = 288, endDate = null) {
    try {
      const params = { source: 'ambient-history', limit: String(limit) };
      if (endDate) params.endDate = endDate;

      if (IS_PRODUCTION) {
        const response = await axiosWithRetry({
          method: 'get', url: apiUrl('/api/weather'), params,
        });
        return response.data || [];
      } else {
        const qp = new URLSearchParams({
          apiKey: AMBIENT_API_KEY,
          applicationKey: AMBIENT_APP_KEY,
          limit: String(limit),
        });
        if (endDate) qp.set('endDate', endDate);
        const response = await axios.get(
          `https://api.ambientweather.net/v1/devices/48:3F:DA:54:2C:6E?${qp}`
        );
        return response.data || [];
      }
    } catch (error) {
      console.error('Ambient history error:', error.message);
      return [];
    }
  }

  async getSynopticStationData(stationIds) {
    if (!stationIds || stationIds.length === 0) return [];
    
    try {
      let responseData;

      if (IS_PRODUCTION) {
        const response = await axiosWithRetry({
          method: 'get', url: apiUrl('/api/weather'),
          params: { source: 'synoptic', stids: stationIds.join(',') },
        });
        responseData = response.data;
      } else {
        const response = await axios.get(`${SYNOPTIC_BASE_URL}/stations/latest`, {
          params: {
            token: SYNOPTIC_TOKEN,
            stid: stationIds.join(','),
            vars: 'air_temp,relative_humidity,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
            units: 'english',
          },
        });
        responseData = response.data;
      }
      
      if (responseData?.STATION) {
        return responseData.STATION.map((station) => ({
          stationId: station.STID,
          name: station.NAME,
          latitude: station.LATITUDE,
          longitude: station.LONGITUDE,
          elevation: station.ELEVATION,
          timestamp: station.OBSERVATIONS?.date_time,
          temperature: station.OBSERVATIONS?.air_temp_value_1?.value,
          humidity: station.OBSERVATIONS?.relative_humidity_value_1?.value,
          windSpeed: station.OBSERVATIONS?.wind_speed_value_1?.value,
          windDirection: station.OBSERVATIONS?.wind_direction_value_1?.value,
          windGust: station.OBSERVATIONS?.wind_gust_value_1?.value,
          pressure: station.OBSERVATIONS?.altimeter_value_1?.value 
            || station.OBSERVATIONS?.sea_level_pressure_value_1?.value,
        }));
      }
      
      return [];
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('Synoptic API: Invalid token');
      } else {
        console.error('Synoptic API error:', error.message);
      }
      return [];
    }
  }

  async getSynopticHistory(stationIds, hours = 3) {
    if (!stationIds || stationIds.length === 0) return [];
    
    try {
      let responseData;

      if (IS_PRODUCTION) {
        const response = await axiosWithRetry({
          method: 'get', url: apiUrl('/api/weather'),
          params: {
            source: 'synoptic-history',
            stids: stationIds.join(','),
            hours: String(hours),
          },
        });
        responseData = response.data;
      } else {
        const end = new Date();
        const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
        const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];

        const response = await axios.get(`${SYNOPTIC_BASE_URL}/stations/timeseries`, {
          params: {
            token: SYNOPTIC_TOKEN,
            stid: stationIds.join(','),
            start: formatDate(start),
            end: formatDate(end),
            vars: 'wind_speed,wind_direction,wind_gust,air_temp',
            units: 'english',
          },
        });
        responseData = response.data;
      }
      
      if (responseData?.STATION) {
        return responseData.STATION.map((station) => {
          const obs = station.OBSERVATIONS || {};
          const times = obs.date_time || [];
          
          return {
            stationId: station.STID,
            name: station.NAME,
            history: times.map((time, i) => ({
              timestamp: time,
              windSpeed: obs.wind_speed_set_1?.[i],
              windDirection: obs.wind_direction_set_1?.[i],
              windGust: obs.wind_gust_set_1?.[i],
              temperature: obs.air_temp_set_1?.[i],
            })),
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Synoptic History API error:', error.message);
      return [];
    }
  }

  async getDataForLake(lakeId) {
    const stationIds = getAllStationIds(lakeId);
    
    const [ambientData, synopticData] = await Promise.allSettled([
      this.getAmbientWeatherData(),
      this.getSynopticStationData(stationIds),
    ]);
    
    return {
      ambient: ambientData.status === 'fulfilled' ? ambientData.value : null,
      synoptic: synopticData.status === 'fulfilled' ? synopticData.value : [],
      fetchedAt: new Date().toISOString(),
    };
  }

  async getHistoryForLake(lakeId, hours = 3) {
    const stationIds = getAllStationIds(lakeId);
    return this.getSynopticHistory(stationIds.slice(0, 4), hours);
  }
}

export const weatherService = new WeatherService();
