/**
 * Open-Meteo Weather Adapter
 * 
 * Provides FREE global weather coverage for international locations
 * where NWS (US-only) is not available.
 * 
 * API: https://open-meteo.com/en/docs
 * - No API key required
 * - Global coverage
 * - Current conditions + 7-day hourly forecast
 * - Rate limit: 10,000 requests/day (generous for our use case)
 */

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Weather code to sky condition mapping
 * https://open-meteo.com/en/docs#weathervariables
 */
const WEATHER_CODE_MAP = {
  0: 'clear',           // Clear sky
  1: 'clear',           // Mainly clear
  2: 'partly',          // Partly cloudy
  3: 'cloudy',          // Overcast
  45: 'cloudy',         // Fog
  48: 'cloudy',         // Depositing rime fog
  51: 'drizzle',        // Drizzle: Light
  53: 'drizzle',        // Drizzle: Moderate
  55: 'drizzle',        // Drizzle: Dense
  56: 'drizzle',        // Freezing Drizzle: Light
  57: 'drizzle',        // Freezing Drizzle: Dense
  61: 'rain',           // Rain: Slight
  63: 'rain',           // Rain: Moderate
  65: 'rain',           // Rain: Heavy
  66: 'rain',           // Freezing Rain: Light
  67: 'rain',           // Freezing Rain: Heavy
  71: 'storm',          // Snow fall: Slight
  73: 'storm',          // Snow fall: Moderate
  75: 'storm',          // Snow fall: Heavy
  77: 'storm',          // Snow grains
  80: 'rain',           // Rain showers: Slight
  81: 'rain',           // Rain showers: Moderate
  82: 'rain',           // Rain showers: Violent
  85: 'storm',          // Snow showers: Slight
  86: 'storm',          // Snow showers: Heavy
  95: 'storm',          // Thunderstorm: Slight or moderate
  96: 'storm',          // Thunderstorm with slight hail
  99: 'storm',          // Thunderstorm with heavy hail
};

/**
 * Convert weather code to human-readable short forecast
 */
function weatherCodeToForecast(code) {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

/**
 * Convert wind direction degrees to cardinal direction
 */
function degreesToCardinal(degrees) {
  if (degrees == null) return 'N';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Fetch current weather and hourly forecast from Open-Meteo
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Normalized weather data
 */
export async function fetchOpenMeteoWeather(lat, lng) {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,' +
    'cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,' +
    'cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto' +
    '&forecast_days=3';

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[OpenMeteo] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.current) {
      console.error('[OpenMeteo] No current data in response');
      return null;
    }

    // Normalize current conditions
    const current = {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windDirectionCardinal: degreesToCardinal(data.current.wind_direction_10m),
      windGust: data.current.wind_gusts_10m,
      pressure: data.current.surface_pressure ? data.current.surface_pressure / 33.8639 : null, // hPa to inHg
      cloudCover: data.current.cloud_cover,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      sky: WEATHER_CODE_MAP[data.current.weather_code] || 'partly',
      shortForecast: weatherCodeToForecast(data.current.weather_code),
      timestamp: data.current.time,
      source: 'open-meteo',
      dataSource: 'Open-Meteo Global',
    };

    // Normalize hourly forecast (next 48 hours)
    const hourly = [];
    if (data.hourly && data.hourly.time) {
      const maxHours = Math.min(data.hourly.time.length, 48);
      for (let i = 0; i < maxHours; i++) {
        hourly.push({
          startTime: data.hourly.time[i],
          time: data.hourly.time[i],
          temperature: data.hourly.temperature_2m?.[i],
          humidity: data.hourly.relative_humidity_2m?.[i],
          windSpeed: data.hourly.wind_speed_10m?.[i],
          windDirection: data.hourly.wind_direction_10m?.[i],
          windDirectionCardinal: degreesToCardinal(data.hourly.wind_direction_10m?.[i]),
          windGust: data.hourly.wind_gusts_10m?.[i],
          pressure: data.hourly.surface_pressure?.[i] ? data.hourly.surface_pressure[i] / 33.8639 : null,
          cloudCover: data.hourly.cloud_cover?.[i],
          precipChance: data.hourly.precipitation_probability?.[i],
          precipitation: data.hourly.precipitation?.[i],
          weatherCode: data.hourly.weather_code?.[i],
          sky: WEATHER_CODE_MAP[data.hourly.weather_code?.[i]] || 'partly',
          shortForecast: weatherCodeToForecast(data.hourly.weather_code?.[i]),
          source: 'open-meteo',
        });
      }
    }

    console.log(`[OpenMeteo] Fetched weather for ${lat.toFixed(3)}, ${lng.toFixed(3)}: ${current.temperature}°F, ${current.windSpeed} mph ${current.windDirectionCardinal}`);

    return {
      current,
      hourly,
      timezone: data.timezone,
      elevation: data.elevation,
      source: 'open-meteo',
    };
  } catch (err) {
    console.error('[OpenMeteo] Fetch error:', err.message);
    return null;
  }
}

/**
 * Fetch current conditions only (lighter request)
 */
export async function fetchOpenMeteoCurrent(lat, lng) {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,' +
    'cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto';

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.current) return null;

    return {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windDirectionCardinal: degreesToCardinal(data.current.wind_direction_10m),
      windGust: data.current.wind_gusts_10m,
      pressure: data.current.surface_pressure ? data.current.surface_pressure / 33.8639 : null,
      cloudCover: data.current.cloud_cover,
      sky: WEATHER_CODE_MAP[data.current.weather_code] || 'partly',
      shortForecast: weatherCodeToForecast(data.current.weather_code),
      timestamp: data.current.time,
      source: 'open-meteo',
      dataSource: 'Open-Meteo Global',
    };
  } catch (err) {
    console.error('[OpenMeteo] Current fetch error:', err.message);
    return null;
  }
}

/**
 * Check if coordinates are outside the continental US
 * (where NWS coverage is available)
 */
export function isOutsideUS(lat, lng) {
  // Continental US bounding box (approximate)
  const US_BOUNDS = {
    minLat: 24.5,  // Southern tip of Florida Keys
    maxLat: 49.5,  // Canadian border
    minLng: -125,  // West coast
    maxLng: -66.5, // East coast
  };
  
  // Alaska
  const ALASKA_BOUNDS = {
    minLat: 51,
    maxLat: 72,
    minLng: -180,
    maxLng: -129,
  };
  
  // Hawaii
  const HAWAII_BOUNDS = {
    minLat: 18.5,
    maxLat: 22.5,
    minLng: -161,
    maxLng: -154,
  };
  
  // Check continental US
  if (lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat &&
      lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng) {
    return false;
  }
  
  // Check Alaska
  if (lat >= ALASKA_BOUNDS.minLat && lat <= ALASKA_BOUNDS.maxLat &&
      lng >= ALASKA_BOUNDS.minLng && lng <= ALASKA_BOUNDS.maxLng) {
    return false;
  }
  
  // Check Hawaii
  if (lat >= HAWAII_BOUNDS.minLat && lat <= HAWAII_BOUNDS.maxLat &&
      lng >= HAWAII_BOUNDS.minLng && lng <= HAWAII_BOUNDS.maxLng) {
    return false;
  }
  
  // Outside US territory
  return true;
}

export default {
  fetchOpenMeteoWeather,
  fetchOpenMeteoCurrent,
  isOutsideUS,
  WEATHER_CODE_MAP,
};
