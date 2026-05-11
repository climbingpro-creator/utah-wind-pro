import axios from 'axios';
import { getAllStationIds } from '../config/lakeStations';
import { apiUrl } from '../utils/platform';

const IS_PRODUCTION = import.meta.env.PROD;

const _unavailableSources = {};

async function axiosWithRetry(config, retries = 2, baseDelay = 1000) {
  const sourceKey = config.params?.source;
  if (sourceKey && _unavailableSources[sourceKey] > Date.now()) {
    throw Object.assign(new Error(`${sourceKey} unavailable (cached)`), { _suppressed: true });
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) throw err;
      if (status === 503) {
        if (sourceKey) _unavailableSources[sourceKey] = Date.now() + 5 * 60 * 1000;
        err._suppressed = true;
        throw err;
      }
      const retryable = !status || status >= 500;
      if (attempt >= retries || !retryable) throw err;
      await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));
    }
  }
}

// In production, keys stay on the server via /api/weather proxy.
// In development, use VITE_ env vars directly for local testing.
const AMBIENT_API_KEY = import.meta.env.VITE_AMBIENT_API_KEY;
const AMBIENT_APP_KEY = import.meta.env.VITE_AMBIENT_APP_KEY;
const SYNOPTIC_TOKEN  = import.meta.env.VITE_SYNOPTIC_TOKEN; // Legacy: only used during transition

const AMBIENT_BASE_URL  = 'https://rt.ambientweather.net/v1';
const SYNOPTIC_BASE_URL = 'https://api.synopticdata.com/v2'; // Legacy: kept for getSynopticHistory dev mode

let lastAmbientCall = 0;
let cachedAmbientData = null;
const AMBIENT_RATE_LIMIT_MS = 1000;

class WeatherService {
  async getAmbientWeatherData() {
    const now = Date.now();
    if (now - lastAmbientCall < AMBIENT_RATE_LIMIT_MS) {
      return cachedAmbientData;
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
        
        const result = {
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
        cachedAmbientData = result;
        return result;
      }
      
      return cachedAmbientData;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Ambient Weather API rate limited');
        return cachedAmbientData;
      }
      if (!error._suppressed) console.error('Ambient Weather API error:', error.message);
      return cachedAmbientData;
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
      if (!error._suppressed) console.error('Ambient history error:', error.message);
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
          _source: station._source || 'synoptic',
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

  /**
   * Fetch ALL nearby stations using free multi-source discovery
   * (NWS + WU + UDOT + Ambient + Open-Meteo). Returns full station array
   * with IDW interpolation result for map visualization.
   *
   * Returns: { stations: [...], interpolated: {...}, confidence, stationCount }
   */
  async fetchNearbyStations(lat, lng, radiusMiles = 30) {
    try {
      const response = await axiosWithRetry({
        method: 'get',
        url: apiUrl('/api/weather'),
        params: { source: 'radial-multi', lat, lng, radius: radiusMiles },
        timeout: 12000,
      });

      const data = response.data;

      if (data?.stations && data.stations.length > 0) {
        const stations = data.stations.map(s => ({
          id: s.id || s.stationId || 'UNKNOWN',
          name: s.name || s.stationName || 'Weather Station',
          lat: s.lat || s.latitude || lat,
          lng: s.lng || s.longitude || lng,
          elevation: s.elevation || null,
          speed: s.windSpeed ?? null,
          direction: s.windDirection ?? null,
          gust: s.windGust ?? null,
          temperature: s.temperature ?? null,
          humidity: s.humidity ?? null,
          pressure: s.pressure ?? null,
          windSpeed: s.windSpeed ?? null,
          windDirection: s.windDirection ?? null,
          windGust: s.windGust ?? null,
          distanceMiles: s.distanceMiles ?? null,
          timestamp: s.timestamp || null,
          _source: s.source || 'nws',
        }));

        stations._interpolated = data.interpolated || null;
        stations._confidence = data.confidence || 0;
        stations._stationCount = data.stationCount || stations.length;
        stations._model = data.model || 'idw_interpolation';

        return stations;
      }
    } catch (err) {
      console.warn('[WeatherService] radial-multi failed, trying legacy radial:', err.message);
    }

    // Fallback: legacy single-station radial endpoint
    try {
      const response = await axiosWithRetry({
        method: 'get',
        url: apiUrl('/api/weather'),
        params: { source: 'radial', lat, lng, radius: radiusMiles },
        timeout: 8000,
      });

      const freeData = response.data;
      if (freeData?.station && (freeData.station.windSpeed != null || freeData.station.temperature != null)) {
        const s = freeData.station;
        return [{
          id: s.stationId || s.id || 'FREE',
          name: s.stationName || s.name || 'Weather Station',
          lat: s.latitude || s.lat || lat,
          lng: s.longitude || s.lng || lng,
          elevation: s.elevation || null,
          speed: s.windSpeed ?? null,
          direction: s.windDirection ?? null,
          gust: s.windGust ?? null,
          temperature: s.temperature ?? null,
          pressure: s.pressure ?? null,
          windSpeed: s.windSpeed ?? null,
          windDirection: s.windDirection ?? null,
          distanceMiles: s.distanceMiles,
          _source: freeData.source || s.source || 'free-radial',
        }];
      }
    } catch (fallbackErr) {
      console.error('[WeatherService] All radial sources failed:', fallbackErr.message);
    }

    return [];
  }

  async getWuPwsCurrent(stationIds) {
    if (!stationIds || stationIds.length === 0) return [];
    try {
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < stationIds.length; i += BATCH_SIZE) {
        batches.push(stationIds.slice(i, i + BATCH_SIZE));
      }
      const results = await Promise.allSettled(
        batches.map(batch =>
          axiosWithRetry({
            method: 'get',
            url: apiUrl('/api/weather'),
            params: { source: 'wu-pws', stationIds: batch.join(',') },
          }).then(r => r.data?.observations || [])
        )
      );
      return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    } catch (error) {
      if (!error._suppressed) console.error('WU PWS fetch error:', error.message);
      return [];
    }
  }

  async getDataForLake(lakeId) {
    const stationIds = getAllStationIds(lakeId);
    
    const { getWuStationsForSpot, normalizeWuObservation, WU_PRIORITY_STATIONS } = await import('../config/wuPwsNetwork.js');
    const spotWu = getWuStationsForSpot(lakeId);
    const wuIdSet = new Set(spotWu.map(s => s.id));
    for (const id of (WU_PRIORITY_STATIONS || [])) wuIdSet.add(id);
    const wuIds = [...wuIdSet];

    const [ambientData, synopticData, wuData] = await Promise.allSettled([
      this.getAmbientWeatherData(),
      this.getSynopticStationData(stationIds),
      wuIds.length > 0 ? this.getWuPwsCurrent(wuIds) : Promise.resolve([]),
    ]);
    
    const normalizedWu = (wuData.status === 'fulfilled' ? wuData.value : [])
      .map(normalizeWuObservation)
      .filter(Boolean);

    return {
      ambient: ambientData.status === 'fulfilled' ? ambientData.value : null,
      synoptic: synopticData.status === 'fulfilled' ? synopticData.value : [],
      wuPws: normalizedWu,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch 24hr history for a single WU PWS station.
   * Returns array of normalized observations or empty array on failure.
   */
  async getWuPwsHistory(stationId) {
    try {
      const { normalizeWuHistoryObs } = await import('../config/wuPwsNetwork.js');
      const response = await axiosWithRetry({
        method: 'get',
        url: apiUrl('/api/weather'),
        params: { source: 'wu-pws-history', stationId },
      });
      const observations = response.data?.observations || [];
      return observations.map(normalizeWuHistoryObs).filter(Boolean);
    } catch (err) {
      console.warn(`WU PWS history failed for ${stationId}:`, err.message);
      return [];
    }
  }

  async getHistoryForLake(lakeId, hours = 3) {
    const stationIds = getAllStationIds(lakeId);
    return this.getSynopticHistory(stationIds, hours);
  }
}

export const weatherService = new WeatherService();
