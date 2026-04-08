/**
 * WEATHER UNDERGROUND PWS NETWORK — Curated stations per spot
 *
 * Discovered via WU Location Service Near API on 2026-03-24.
 * Each entry lists the best WU Personal Weather Stations along
 * the thermal/wind corridor for that spot, scored by:
 *   - Proximity to the corridor path
 *   - Data freshness (qcStatus=1 = active, -1 = stale)
 *   - Elevation match (valley floor ~4500 ft for Utah Lake corridor)
 *   - Position in the propagation chain (early / mid / close)
 *
 * WU API rate limits (free PWS owner tier):
 *   1,500 calls/day, 30/minute
 * Budget: ~5 stations per spot × 4 fetches/hour = ~480 calls/day (well within limits)
 */

export const WU_PWS_STATIONS = {
  // ─── UTAH LAKE OVERVIEW (superset of key corridor stations) ────
  'utah-lake': {
    corridor: 'overview',
    stations: [
      { id: 'KUTSARAT50', name: 'Zigzag (Your PWS)', lat: 40.302, lon: -111.881, role: 'ground-truth', priority: 1 },
      { id: 'KUTLEHI111', name: 'Lehi (FPS Shadow)', lat: 40.454, lon: -111.892, role: 'shadow-fps', priority: 2 },
      { id: 'KUTDRAPE132', name: 'Draper E (UTALP Shadow)', lat: 40.480, lon: -111.884, role: 'shadow-utalp', priority: 3 },
      { id: 'KUTSARAT88', name: 'Saratoga Springs S', lat: 40.293, lon: -111.884, role: 'close', priority: 4 },
      { id: 'KUTLEHI160', name: 'Lehi S', lat: 40.447, lon: -111.889, role: 'mid', priority: 5 },
      { id: 'KUTRIVER67', name: 'Riverton', lat: 40.489, lon: -111.919, role: 'north-flow', priority: 6 },
      { id: 'KUTBLUFF18', name: 'Bluffdale', lat: 40.492, lon: -111.935, role: 'north-flow', priority: 7 },
    ],
  },

  // ─── ZIGZAG CORRIDOR (Saratoga Springs) ────────────────────────
  // SE Thermal path: QSF → Orem → Lehi → Saratoga Springs
  'utah-lake-zigzag': {
    corridor: 'se_thermal',
    stations: [
      { id: 'KUTSARAT50', name: 'Zigzag (Your PWS)', lat: 40.302, lon: -111.881, role: 'ground-truth', priority: 1 },
      { id: 'KUTSARAT88', name: 'Saratoga Springs S', lat: 40.293, lon: -111.884, role: 'close', priority: 2 },
      { id: 'KUTSARAT81', name: 'Saratoga Springs SE', lat: 40.287, lon: -111.877, role: 'close', priority: 3 },
      { id: 'KUTSARAT74', name: 'Saratoga Springs W', lat: 40.333, lon: -111.910, role: 'mid', priority: 4 },
      { id: 'KUTSARAT62', name: 'Saratoga Springs N', lat: 40.377, lon: -111.912, role: 'mid', priority: 5 },
      { id: 'KUTLEHI73',  name: 'Lehi NW', lat: 40.378, lon: -111.905, role: 'mid', priority: 6 },
      { id: 'KUTLEHI160', name: 'Lehi S', lat: 40.447, lon: -111.889, role: 'early', priority: 7 },
    ],
  },

  // ─── LINCOLN BEACH ─────────────────────────────────────────────
  'utah-lake-lincoln': {
    corridor: 'se_thermal',
    stations: [
      { id: 'KUTSARAT65', name: 'Saratoga Springs W', lat: 40.313, lon: -111.895, role: 'close', priority: 1 },
      { id: 'KUTSARAT52', name: 'Saratoga Springs SW', lat: 40.306, lon: -111.904, role: 'close', priority: 2 },
      { id: 'KUTSARAT80', name: 'Saratoga Springs NW', lat: 40.315, lon: -111.902, role: 'mid', priority: 3 },
    ],
  },

  // ─── POINT OF THE MOUNTAIN ─────────────────────────────────────
  'potm-south': {
    corridor: 'se_thermal',
    stations: [
      { id: 'KUTLEHI111', name: 'Lehi (FPS area)', lat: 40.454, lon: -111.892, role: 'close', priority: 1 },
      { id: 'KUTLEHI160', name: 'Lehi S', lat: 40.447, lon: -111.889, role: 'close', priority: 2 },
      { id: 'KUTALPIN3',  name: 'Alpine W', lat: 40.444, lon: -111.769, role: 'early', priority: 3 },
      { id: 'KUTALPIN25', name: 'Alpine E', lat: 40.451, lon: -111.761, role: 'early', priority: 4 },
    ],
  },
  'potm-north': {
    corridor: 'north_flow',
    stations: [
      { id: 'KUTDRAPE132', name: 'Draper E', lat: 40.480, lon: -111.884, role: 'close', priority: 1 },
      { id: 'KUTDRAPE59',  name: 'Draper W', lat: 40.477, lon: -111.883, role: 'close', priority: 2 },
      { id: 'KUTRIVER67',  name: 'Riverton', lat: 40.489, lon: -111.919, role: 'mid', priority: 3 },
      { id: 'KUTBLUFF18',  name: 'Bluffdale', lat: 40.492, lon: -111.935, role: 'early', priority: 4 },
      { id: 'KUTSANDY188', name: 'Sandy S', lat: 40.552, lon: -111.807, role: 'early', priority: 5 },
    ],
  },

  // ─── DEER CREEK ────────────────────────────────────────────────
  'deer-creek': {
    corridor: 'canyon_thermal',
    stations: [
      { id: 'KUTMIDWA37', name: 'Midway', lat: 40.505, lon: -111.465, role: 'close', priority: 1 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'mid', priority: 2 },
      { id: 'KUTHEBER26', name: 'Heber City S', lat: 40.477, lon: -111.450, role: 'mid', priority: 3 },
      { id: 'KUTPLEAS11', name: 'Pleasant Grove', lat: 40.400, lon: -111.742, role: 'early', priority: 4 },
      { id: 'KUTCEDAR10', name: 'Cedar Hills', lat: 40.396, lon: -111.741, role: 'early', priority: 5 },
    ],
  },

  // ─── JORDANELLE ────────────────────────────────────────────────
  'jordanelle': {
    corridor: 'canyon_thermal',
    stations: [
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'close', priority: 1 },
      { id: 'KUTHEBER26', name: 'Heber City S', lat: 40.477, lon: -111.450, role: 'close', priority: 2 },
      { id: 'KUTMIDWA37', name: 'Midway', lat: 40.505, lon: -111.465, role: 'mid', priority: 3 },
    ],
  },

  // ─── SANDY BEACH ───────────────────────────────────────────────
  'utah-lake-sandy': {
    corridor: 'se_thermal',
    stations: [
      { id: 'KUTSARAT62', name: 'Saratoga Springs N', lat: 40.377, lon: -111.912, role: 'close', priority: 1 },
      { id: 'KUTLEHI73', name: 'Lehi NW', lat: 40.378, lon: -111.905, role: 'close', priority: 2 },
      { id: 'KUTSARAT74', name: 'Saratoga Springs W', lat: 40.333, lon: -111.910, role: 'mid', priority: 3 },
    ],
  },

  // ─── VINEYARD ──────────────────────────────────────────────────
  'utah-lake-vineyard': {
    corridor: 'se_thermal',
    stations: [
      { id: 'KUTPLEAS11', name: 'Pleasant Grove', lat: 40.400, lon: -111.742, role: 'close', priority: 1 },
      { id: 'KUTPLEAS84', name: 'Pleasant Grove E', lat: 40.413, lon: -111.756, role: 'close', priority: 2 },
      { id: 'KUTCEDAR10', name: 'Cedar Hills', lat: 40.396, lon: -111.741, role: 'mid', priority: 3 },
    ],
  },
};

/**
 * Curated list of the highest-value WU station IDs across all spots.
 * Used for batch fetching in the cron collect loop.
 */
export const WU_PRIORITY_STATIONS = [
  // Zigzag corridor (highest value — validated against your PWS)
  'KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62',
  // Lehi / PotM corridor
  'KUTLEHI73', 'KUTLEHI160', 'KUTLEHI111',
  // Draper / Bluffdale (north flow)
  'KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18',
  // Sandy (north flow early)
  'KUTSANDY188',
  // Alpine (PotM east bench)
  'KUTALPIN3', 'KUTALPIN25',
  // Heber Valley (Deer Creek / Jordanelle)
  'KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26',
  // Pleasant Grove / Cedar Hills (Vineyard / Deer Creek approach)
  'KUTPLEAS11', 'KUTCEDAR10',
];

/**
 * Get curated WU stations for a specific spot.
 * Returns empty array for spots without curated WU coverage.
 */
export function getWuStationsForSpot(spotId) {
  return WU_PWS_STATIONS[spotId]?.stations || [];
}

/**
 * Get all unique WU station IDs for a set of spot IDs.
 */
export function getWuStationIdsForSpots(spotIds) {
  const ids = new Set();
  for (const spotId of spotIds) {
    const stations = WU_PWS_STATIONS[spotId]?.stations;
    if (stations) {
      for (const s of stations) ids.add(s.id);
    }
  }
  return [...ids];
}

/**
 * Normalize a WU PWS observation to match the shape expected by
 * UnifiedPredictor's observe() function.
 *
 * WU format:  { stationID, winddir, imperial: { windSpeed, windGust, temp, ... } }
 * Our format: { stationId, windSpeed, windDirection, windGust, temperature, ... }
 */
export function normalizeWuObservation(obs) {
  if (!obs || obs.error) return null;
  const imp = obs.imperial || {};
  return {
    stationId: obs.stationID,
    id: obs.stationID,
    windSpeed: imp.windSpeed ?? null,
    windDirection: obs.winddir ?? null,
    windGust: imp.windGust ?? null,
    temperature: imp.temp ?? null,
    humidity: obs.humidity ?? null,
    pressure: imp.pressure ?? null,
    observedAt: obs.obsTimeUtc || new Date().toISOString(),
    source: 'wu-pws',
  };
}

/**
 * Normalize a WU PWS history observation (from 1-day rapid endpoint).
 * These have slightly different field names than current observations.
 */
export function normalizeWuHistoryObs(obs) {
  if (!obs) return null;
  const imp = obs.imperial || {};
  return {
    stationId: obs.stationID,
    timestamp: obs.obsTimeUtc,
    epoch: obs.epoch,
    windSpeed: imp.windspeedAvg ?? imp.windspeedHigh ?? null,
    windDirection: obs.winddirAvg ?? null,
    windGust: imp.windgustHigh ?? null,
    temperature: imp.tempAvg ?? null,
    humidity: obs.humidityAvg ?? null,
    source: 'wu-pws',
  };
}
