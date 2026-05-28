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

  /**
   * Fetch FREE station data for ridge/airport stations using NWS + Open-Meteo
   * Replaces Synoptic/MesoWest dependency with free government sources.
   */
  async getFreeStationData(lakeId) {
    const { LAKE_CONFIGS } = await import('../config/lakeStations.js');
    const config = LAKE_CONFIGS[lakeId];
    if (!config) return [];

    const stations = [];
    const fetchPromises = [];

    // ── Fetch NWS data for airport stations (KSLC, KPVU, etc.) ──
    const airportIds = [];
    if (config.stations.pressure?.high?.id?.startsWith('K')) {
      airportIds.push(config.stations.pressure.high);
    }
    if (config.stations.pressure?.low?.id?.startsWith('K')) {
      airportIds.push(config.stations.pressure.low);
    }
    // Add any reference stations that are airports
    (config.stations.reference || []).forEach(s => {
      if (s.id?.startsWith('K')) airportIds.push(s);
    });

    if (airportIds.length > 0) {
      fetchPromises.push(
        this.fetchNwsAirportData(airportIds).then(data => {
          stations.push(...data);
        }).catch(err => {
          console.warn('[WeatherService] NWS airport fetch failed:', err.message);
        })
      );
    }

    // ── Fetch Open-Meteo data for ridge stations (high elevation) ──
    const ridgeStations = config.stations.ridge || [];
    for (const ridge of ridgeStations) {
      // Get coordinates from config or use known coordinates
      const coords = this.getRidgeCoordinates(ridge.id, config);
      if (coords) {
        fetchPromises.push(
          this.fetchOpenMeteoForStation(ridge, coords).then(data => {
            if (data) stations.push(data);
          }).catch(err => {
            console.warn(`[WeatherService] Open-Meteo ridge fetch failed for ${ridge.id}:`, err.message);
          })
        );
      }
    }

    // ── Fetch Open-Meteo for lakeshore stations without WU coverage ──
    const lakeshoreStations = config.stations.lakeshore || [];
    for (const ls of lakeshoreStations) {
      const coords = ls.coordinates || config.coordinates;
      if (coords) {
        fetchPromises.push(
          this.fetchOpenMeteoForStation(ls, coords).then(data => {
            if (data) stations.push(data);
          }).catch(err => {
            console.warn(`[WeatherService] Open-Meteo lakeshore fetch failed for ${ls.id}:`, err.message);
          })
        );
      }
    }

    await Promise.allSettled(fetchPromises);
    return stations;
  }

  /**
   * Known ridge station coordinates (MesoWest stations)
   */
  getRidgeCoordinates(stationId, config) {
    const RIDGE_COORDS = {
      'CSC':    { lat: 40.44, lng: -111.61 },   // Cascade Peak
      'TIMU1':  { lat: 40.39, lng: -111.63 },   // Timpanogos Divide
      'UTALP':  { lat: 40.59, lng: -111.64 },   // Alta Peak
      'UT7':    { lat: 40.76, lng: -111.82 },   // Ben Lomond
      'UTPCR':  { lat: 40.87, lng: -111.51 },   // Powder Mountain
      'UTORM':  { lat: 40.65, lng: -111.83 },   // Olympus
      'ARWUT':  { lat: 40.41, lng: -111.52 },   // Arrowhead (Deer Creek)
      'QSF':    { lat: 40.115, lng: -111.655 }, // Spanish Fork
      'FPS':    { lat: 40.45, lng: -111.90 },   // Flight Park South
    };
    return RIDGE_COORDS[stationId] || null;
  }

  /**
   * Fetch NWS data for airport stations
   */
  async fetchNwsAirportData(airportConfigs) {
    const results = [];
    for (const airport of airportConfigs) {
      try {
        const response = await axiosWithRetry({
          method: 'get',
          url: `https://api.weather.gov/stations/${airport.id}/observations/latest`,
          headers: { 'Accept': 'application/geo+json' },
          timeout: 8000,
        });
        const obs = response.data?.properties;
        if (obs) {
          results.push({
            stationId: airport.id,
            name: airport.name,
            elevation: airport.elevation,
            temperature: obs.temperature?.value != null 
              ? (obs.temperature.value * 9/5) + 32 // C to F
              : null,
            windSpeed: obs.windSpeed?.value != null
              ? obs.windSpeed.value * 2.237 // m/s to mph
              : null,
            windDirection: obs.windDirection?.value,
            windGust: obs.windGust?.value != null
              ? obs.windGust.value * 2.237
              : null,
            pressure: obs.barometricPressure?.value != null
              ? obs.barometricPressure.value / 100 // Pa to mb
              : null,
            humidity: obs.relativeHumidity?.value,
            timestamp: obs.timestamp,
            _source: 'nws',
          });
        }
      } catch (err) {
        console.warn(`[NWS] Failed to fetch ${airport.id}:`, err.message);
      }
    }
    return results;
  }

  /**
   * Fetch Open-Meteo data for a station at given coordinates
   */
  async fetchOpenMeteoForStation(stationConfig, coords) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}` +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure' +
        '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto';
      
      const response = await axiosWithRetry({ method: 'get', url, timeout: 8000 });
      const current = response.data?.current;
      
      if (current) {
        return {
          stationId: stationConfig.id,
          name: stationConfig.name,
          elevation: stationConfig.elevation,
          latitude: coords.lat,
          longitude: coords.lng,
          temperature: current.temperature_2m,
          windSpeed: current.wind_speed_10m,
          windDirection: current.wind_direction_10m,
          windGust: current.wind_gusts_10m,
          pressure: current.surface_pressure,
          humidity: current.relative_humidity_2m,
          timestamp: current.time,
          _source: 'open-meteo',
        };
      }
    } catch (err) {
      console.warn(`[Open-Meteo] Failed for ${stationConfig.id}:`, err.message);
    }
    return null;
  }

  async getDataForLake(lakeId) {
    const stationIds = getAllStationIds(lakeId);
    
    const { getWuStationsForSpot, normalizeWuObservation, WU_PRIORITY_STATIONS } = await import('../config/wuPwsNetwork.js');
    const spotWu = getWuStationsForSpot(lakeId);
    const wuIdSet = new Set(spotWu.map(s => s.id));
    for (const id of (WU_PRIORITY_STATIONS || [])) wuIdSet.add(id);
    const wuIds = [...wuIdSet];

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL FIX: Use FREE sources instead of Synoptic/MesoWest
    // ═══════════════════════════════════════════════════════════════
    // 1. Ambient Weather (our PWS)
    // 2. Weather Underground PWS network
    // 3. NWS for airports + Open-Meteo for ridge stations (NEW!)
    // 4. Legacy Synoptic only as last resort (if token exists)
    
    const [ambientData, freeStationData, wuData, synopticData] = await Promise.allSettled([
      this.getAmbientWeatherData(),
      this.getFreeStationData(lakeId),
      wuIds.length > 0 ? this.getWuPwsCurrent(wuIds) : Promise.resolve([]),
      // Only try Synoptic if we have a token (legacy fallback)
      IS_PRODUCTION ? this.getSynopticStationData(stationIds) : Promise.resolve([]),
    ]);
    
    const normalizedWu = (wuData.status === 'fulfilled' ? wuData.value : [])
      .map(normalizeWuObservation)
      .filter(Boolean);

    // Merge free station data with any synoptic data (free sources take priority)
    const freeStations = freeStationData.status === 'fulfilled' ? freeStationData.value : [];
    const synopticStations = synopticData.status === 'fulfilled' ? synopticData.value : [];
    
    // Create a map of station IDs we already have from free sources
    const freeStationIds = new Set(freeStations.map(s => s.stationId));
    
    // Only use Synoptic stations for IDs we don't have from free sources
    const mergedStations = [
      ...freeStations,
      ...synopticStations.filter(s => !freeStationIds.has(s.stationId)),
    ];

    const hasData = ambientData.status === 'fulfilled' || mergedStations.length > 0 || normalizedWu.length > 0;
    if (!hasData) {
      console.warn(`[WeatherService] No weather data available for ${lakeId}`);
    }

    return {
      ambient: ambientData.status === 'fulfilled' ? ambientData.value : null,
      synoptic: mergedStations, // Now includes NWS + Open-Meteo data
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
    // Try to get history from WU PWS first (free), fall back to Synoptic
    const { getWuStationsForSpot } = await import('../config/wuPwsNetwork.js');
    const spotWu = getWuStationsForSpot(lakeId);
    
    if (spotWu.length > 0) {
      // Get history from primary WU station
      const primaryWu = spotWu.find(s => s.priority === 1) || spotWu[0];
      try {
        const history = await this.getWuPwsHistory(primaryWu.id);
        if (history.length > 0) {
          return [{
            stationId: primaryWu.id,
            name: primaryWu.name,
            history: history.map(h => ({
              timestamp: h.timestamp,
              windSpeed: h.windSpeed,
              windDirection: h.windDirection,
              windGust: h.windGust,
              temperature: h.temperature,
            })),
          }];
        }
      } catch (err) {
        console.warn('[WeatherService] WU history failed, trying Synoptic:', err.message);
      }
    }
    
    // Fallback to Synoptic if available
    const stationIds = getAllStationIds(lakeId);
    return this.getSynopticHistory(stationIds, hours);
  }
}

export const weatherService = new WeatherService();
