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
      { id: 'TEMPEST_DC', name: 'Barbed Wire Beach (Tempest)', lat: 40.4588, lon: -111.4727, role: 'ground-truth', priority: 0, source: 'tempest' },
      { id: 'KUTMIDWA37', name: 'Midway', lat: 40.505, lon: -111.465, role: 'close', priority: 1 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'mid', priority: 2 },
      { id: 'KUTHEBER26', name: 'Heber City S', lat: 40.477, lon: -111.450, role: 'mid', priority: 3 },
      { id: 'KUTHEBER99', name: 'Heber City', lat: 40.510, lon: -111.410, role: 'mid', priority: 4 },
      { id: 'KUTPLEAS11', name: 'Pleasant Grove', lat: 40.400, lon: -111.742, role: 'early', priority: 5 },
      { id: 'KUTCEDAR10', name: 'Cedar Hills', lat: 40.396, lon: -111.741, role: 'early', priority: 6 },
    ],
  },

  // ─── SULPHUR CREEK RESERVOIR (Evanston, WY corridor) ──────────
  // Jet-stream driven — I-80 corridor stations near Evanston, WY
  'sulfur-creek': {
    corridor: 'jet_stream_west',
    stations: [
      { id: 'KWYEVANS10', name: 'Evanston NW', lat: 41.280, lon: -110.980, role: 'close', priority: 1 },
      { id: 'KWYEVANS60', name: 'Evanston S', lat: 41.240, lon: -110.960, role: 'close', priority: 2 },
      { id: 'KWYEVANS63', name: 'Evanston E', lat: 41.270, lon: -110.940, role: 'mid', priority: 3 },
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

  // ─── STRAWBERRY RESERVOIR ─────────────────────────────────────
  'strawberry': {
    corridor: 'mountain_basin',
    stations: [
      { id: 'KUTSTRAW1', name: 'Strawberry Bay', lat: 40.170, lon: -111.150, role: 'close', priority: 1 },
      { id: 'KUTSTRAW2', name: 'Strawberry Valley', lat: 40.180, lon: -111.190, role: 'close', priority: 2 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'early', priority: 3 },
    ],
  },

  // ─── PROVO RIVER SEGMENTS ───────────────────────────────────
  'provo-lower': {
    corridor: 'canyon_outflow',
    stations: [
      { id: 'KUTPROVO83', name: 'Provo NE', lat: 40.260, lon: -111.630, role: 'close', priority: 1 },
      { id: 'KUTOREM47', name: 'Orem N', lat: 40.310, lon: -111.700, role: 'mid', priority: 2 },
      { id: 'KUTPLEAS11', name: 'Pleasant Grove', lat: 40.400, lon: -111.742, role: 'early', priority: 3 },
    ],
  },
  'provo-middle': {
    corridor: 'canyon_thermal',
    stations: [
      { id: 'KUTMIDWA37', name: 'Midway', lat: 40.505, lon: -111.465, role: 'close', priority: 1 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'close', priority: 2 },
      { id: 'KUTHEBER26', name: 'Heber City S', lat: 40.477, lon: -111.450, role: 'mid', priority: 3 },
    ],
  },
  'provo-upper': {
    corridor: 'mountain_valley',
    stations: [
      { id: 'KUTHEBER99', name: 'Heber City', lat: 40.510, lon: -111.410, role: 'close', priority: 1 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'mid', priority: 2 },
    ],
  },

  // ─── GREEN RIVER SEGMENTS ──────────────────────────────────
  'green-a': {
    corridor: 'gorge_outflow',
    stations: [
      { id: 'KUTVERNA22', name: 'Vernal NW', lat: 40.470, lon: -109.560, role: 'mid', priority: 1 },
      { id: 'KUTVERNA51', name: 'Vernal S', lat: 40.440, lon: -109.530, role: 'mid', priority: 2 },
      { id: 'KUTVERNA15', name: 'Vernal', lat: 40.455, lon: -109.520, role: 'early', priority: 3 },
    ],
  },
  'green-b': {
    corridor: 'gorge_outflow',
    stations: [
      { id: 'KUTVERNA22', name: 'Vernal NW', lat: 40.470, lon: -109.560, role: 'mid', priority: 1 },
      { id: 'KUTVERNA51', name: 'Vernal S', lat: 40.440, lon: -109.530, role: 'mid', priority: 2 },
    ],
  },
  'green-c': {
    corridor: 'gorge_outflow',
    stations: [
      { id: 'KUTVERNA22', name: 'Vernal NW', lat: 40.470, lon: -109.560, role: 'mid', priority: 1 },
    ],
  },

  // ─── LAKE POWELL ────────────────────────────────────────────
  'lake-powell': {
    corridor: 'desert_canyon',
    stations: [
      { id: 'KUTPAGED2', name: 'Page AZ (Wahweap)', lat: 36.920, lon: -111.460, role: 'close', priority: 1 },
      { id: 'KAZPAGE27', name: 'Page AZ S', lat: 36.900, lon: -111.450, role: 'close', priority: 2 },
      { id: 'KAZPAGE11', name: 'Page AZ N', lat: 36.940, lon: -111.470, role: 'mid', priority: 3 },
    ],
  },

  // ─── BEAR LAKE ──────────────────────────────────────────────
  'bear-lake': {
    corridor: 'high_valley',
    stations: [
      { id: 'KUTGARDE9', name: 'Garden City', lat: 41.940, lon: -111.400, role: 'close', priority: 1 },
      { id: 'KUTLOGAN12', name: 'Logan', lat: 41.735, lon: -111.835, role: 'early', priority: 2 },
      { id: 'KIDMONTPE6', name: 'Montpelier ID', lat: 42.320, lon: -111.300, role: 'mid', priority: 3 },
    ],
  },

  // ─── FLAMING GORGE ─────────────────────────────────────────
  'flaming-gorge': {
    corridor: 'gorge_outflow',
    stations: [
      { id: 'KUTVERNA22', name: 'Vernal NW', lat: 40.470, lon: -109.560, role: 'close', priority: 1 },
      { id: 'KUTVERNA51', name: 'Vernal S', lat: 40.440, lon: -109.530, role: 'mid', priority: 2 },
      { id: 'KWYGREEN3', name: 'Green River WY', lat: 41.530, lon: -109.460, role: 'early', priority: 3 },
    ],
  },

  // ─── PINEVIEW RESERVOIR ────────────────────────────────────
  'pineview': {
    corridor: 'ogden_valley',
    stations: [
      { id: 'KUTEDEN14', name: 'Eden', lat: 41.310, lon: -111.770, role: 'close', priority: 1 },
      { id: 'KUTOGDEN65', name: 'Ogden Valley', lat: 41.280, lon: -111.790, role: 'close', priority: 2 },
      { id: 'KUTOGDEN32', name: 'Ogden', lat: 41.230, lon: -111.970, role: 'early', priority: 3 },
    ],
  },

  // ─── WEBER RIVER — SEGMENTED ────────────────────────────────
  'weber-river': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'close', priority: 1 },
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'mid', priority: 2 },
      { id: 'KUTHEBER105', name: 'Heber City E', lat: 40.485, lon: -111.444, role: 'early', priority: 3 },
    ],
  },
  'weber-upper': {
    corridor: 'mountain_valley',
    stations: [
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'close', priority: 1 },
      { id: 'KUTKAMAS2', name: 'Kamas', lat: 40.643, lon: -111.281, role: 'close', priority: 2 },
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'mid', priority: 3 },
    ],
  },
  'weber-middle': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'close', priority: 1 },
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'mid', priority: 2 },
      { id: 'KUTWANSH1', name: 'Wanship', lat: 40.810, lon: -111.406, role: 'close', priority: 3 },
    ],
  },
  'weber-lower': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTMORGA4', name: 'Morgan', lat: 41.040, lon: -111.665, role: 'close', priority: 1 },
      { id: 'KUTHENEF1', name: 'Henefer', lat: 40.975, lon: -111.500, role: 'close', priority: 2 },
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'early', priority: 3 },
    ],
  },

  // ─── YUBA RESERVOIR ────────────────────────────────────────
  'yuba': {
    corridor: 'central_valley',
    stations: [
      { id: 'KUTNEPHI14', name: 'Nephi', lat: 39.710, lon: -111.830, role: 'close', priority: 1 },
      { id: 'KUTLEVAN3', name: 'Levan', lat: 39.550, lon: -111.860, role: 'mid', priority: 2 },
    ],
  },

  // ─── STARVATION RESERVOIR ──────────────────────────────────
  'starvation': {
    corridor: 'duchesne_basin',
    stations: [
      { id: 'KUTDUCHE5', name: 'Duchesne', lat: 40.160, lon: -110.400, role: 'close', priority: 1 },
      { id: 'KUTROOS11', name: 'Roosevelt', lat: 40.300, lon: -110.010, role: 'mid', priority: 2 },
    ],
  },

  // ─── SCOFIELD RESERVOIR ────────────────────────────────────
  'scofield': {
    corridor: 'high_plateau',
    stations: [
      { id: 'KUTPRICE18', name: 'Price', lat: 39.600, lon: -110.810, role: 'close', priority: 1 },
      { id: 'KUTHELPE4', name: 'Helper', lat: 39.680, lon: -110.850, role: 'mid', priority: 2 },
    ],
  },

  // ─── SAND HOLLOW RESERVOIR ─────────────────────────────────
  'sand-hollow': {
    corridor: 'desert_basin',
    stations: [
      { id: 'KUTSTGEO128', name: 'St. George SE', lat: 37.080, lon: -113.540, role: 'close', priority: 1 },
      { id: 'KUTSTGEO44', name: 'St. George', lat: 37.100, lon: -113.570, role: 'mid', priority: 2 },
      { id: 'KUTSTGEO91', name: 'St. George NE', lat: 37.120, lon: -113.530, role: 'mid', priority: 3 },
    ],
  },

  // ─── FISH LAKE ─────────────────────────────────────────────
  'fish-lake': {
    corridor: 'high_mountain',
    stations: [
      { id: 'KUTRICHF9', name: 'Richfield', lat: 38.770, lon: -112.080, role: 'close', priority: 1 },
      { id: 'KUTLOA2', name: 'Loa', lat: 38.400, lon: -111.640, role: 'mid', priority: 2 },
    ],
  },

  // ─── WILLARD BAY ─────────────────────────────────────────────
  'willard-bay': {
    corridor: 'south_flow',
    stations: [
      { id: 'KUTWILLA3', name: 'Willard', lat: 41.400, lon: -112.040, role: 'close', priority: 1 },
      { id: 'KUTBRIGHA6', name: 'Brigham City', lat: 41.510, lon: -111.980, role: 'mid', priority: 2 },
      { id: 'KUTOGDEN32', name: 'Ogden', lat: 41.230, lon: -111.970, role: 'early', priority: 3 },
    ],
  },

  // ─── ECHO / ROCKPORT (Coalville area) ──────────────────────
  'echo': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'close', priority: 1 },
      { id: 'KUTWANSH1', name: 'Wanship', lat: 40.810, lon: -111.406, role: 'close', priority: 2 },
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'early', priority: 3 },
    ],
  },
  'rockport': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTCOALV2', name: 'Coalville', lat: 40.920, lon: -111.400, role: 'close', priority: 1 },
      { id: 'KUTWANSH1', name: 'Wanship', lat: 40.810, lon: -111.406, role: 'close', priority: 2 },
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'early', priority: 3 },
    ],
  },

  // ─── EAST CANYON RESERVOIR ──────────────────────────────────
  'east-canyon': {
    corridor: 'canyon_corridor',
    stations: [
      { id: 'KUTMORGA4', name: 'Morgan', lat: 41.040, lon: -111.665, role: 'close', priority: 1 },
      { id: 'KUTHENEF1', name: 'Henefer', lat: 40.975, lon: -111.500, role: 'mid', priority: 2 },
      { id: 'KUTPARKCITY4', name: 'Park City W', lat: 40.660, lon: -111.520, role: 'early', priority: 3 },
    ],
  },

  // ─── HYRUM RESERVOIR ────────────────────────────────────────
  'hyrum': {
    corridor: 'cache_valley',
    stations: [
      { id: 'KUTLOGAN12', name: 'Logan', lat: 41.735, lon: -111.835, role: 'close', priority: 1 },
      { id: 'KUTHYRUM1', name: 'Hyrum', lat: 41.630, lon: -111.850, role: 'close', priority: 2 },
    ],
  },

  // ─── OTTER CREEK / PIUTE / MINERSVILLE (Richfield area) ────
  'otter-creek': {
    corridor: 'central_highland',
    stations: [
      { id: 'KUTRICHF9', name: 'Richfield', lat: 38.770, lon: -112.080, role: 'close', priority: 1 },
      { id: 'KUTLOA2', name: 'Loa', lat: 38.400, lon: -111.640, role: 'mid', priority: 2 },
    ],
  },
  'piute': {
    corridor: 'central_highland',
    stations: [
      { id: 'KUTRICHF9', name: 'Richfield', lat: 38.770, lon: -112.080, role: 'close', priority: 1 },
      { id: 'KUTLOA2', name: 'Loa', lat: 38.400, lon: -111.640, role: 'mid', priority: 2 },
    ],
  },
  'minersville': {
    corridor: 'central_highland',
    stations: [
      { id: 'KUTBEAVE3', name: 'Beaver', lat: 38.280, lon: -112.640, role: 'close', priority: 1 },
      { id: 'KUTRICHF9', name: 'Richfield', lat: 38.770, lon: -112.080, role: 'mid', priority: 2 },
    ],
  },

  // ─── QUAIL CREEK (St. George area) ─────────────────────────
  'quail-creek': {
    corridor: 'desert_basin',
    stations: [
      { id: 'KUTSTGEO128', name: 'St. George SE', lat: 37.080, lon: -113.540, role: 'close', priority: 1 },
      { id: 'KUTSTGEO44', name: 'St. George', lat: 37.100, lon: -113.570, role: 'mid', priority: 2 },
      { id: 'KUTSTGEO91', name: 'St. George NE', lat: 37.120, lon: -113.530, role: 'mid', priority: 3 },
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
  // Heber Valley (Deer Creek / Jordanelle / Provo River)
  'KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26', 'KUTHEBER99',
  // Pleasant Grove / Cedar Hills / Lower Provo
  'KUTPLEAS11', 'KUTCEDAR10', 'KUTPROVO83', 'KUTOREM47',
  // Strawberry
  'KUTSTRAW1', 'KUTSTRAW2',
  // Vernal / Green River / Flaming Gorge
  'KUTVERNA22', 'KUTVERNA51', 'KUTVERNA15',
  // Bear Lake
  'KUTGARDE9',
  // Pineview / Ogden Valley
  'KUTEDEN14', 'KUTOGDEN65',
  // Yuba / central Utah
  'KUTNEPHI14',
  // Scofield / Price
  'KUTPRICE18',
  // Sand Hollow / St. George / Quail Creek
  'KUTSTGEO128', 'KUTSTGEO44',
  // Fish Lake / Richfield / Otter Creek / Piute
  'KUTRICHF9',
  // Starvation / Duchesne
  'KUTDUCHE5',
  // Willard Bay / Brigham City
  'KUTWILLA3', 'KUTBRIGHA6',
  // Echo / Rockport / East Canyon (Coalville corridor)
  'KUTCOALV2', 'KUTWANSH1', 'KUTMORGA4', 'KUTHENEF1',
  // Hyrum / Cache Valley
  'KUTLOGAN12', 'KUTHYRUM1',
  // Minersville / Beaver
  'KUTBEAVE3',
  // Sulphur Creek / Evanston WY (validation replacements for UT1)
  'KWYEVANS10', 'KWYEVANS60', 'KWYEVANS63',
  // Lincoln Beach (validation replacements)
  'KUTSARAT65', 'KUTSARAT52', 'KUTSARAT80',
  // Vineyard
  'KUTPLEAS84',
  // Lake Powell
  'KUTPAGED2',
  // Ogden (Willard Bay)
  'KUTOGDEN32',
  // Roosevelt (Starvation)
  'KUTROOS11',
  // Logan (Bear Lake / Hyrum)
  'KUTLOGAN12',
  // Park City (Weber / Echo / Rockport)
  'KUTPARKCITY4',
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
