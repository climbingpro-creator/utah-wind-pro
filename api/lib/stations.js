/**
 * Station configuration — single source of truth for all API endpoints.
 * LAKE_STATIONS: detailed config with names and primary stations
 * LAKE_STATION_MAP: simple lake→stationIds for data collection
 * ALL_STATION_IDS: every unique station ID across all lakes + upstream
 */

export const LAKE_STATIONS = {
  // ── Utah Lake variants ──
  'utah-lake-zigzag': {
    name: 'Zigzag Island / Saratoga Springs',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UTOLY', 'UID28', 'CSC'],
    primary: 'UID28',
    hasAmbient: true,
  },
  'utah-lake-lincoln': {
    name: 'Lincoln Point',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-sandy': {
    name: 'Sandy Beach',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-vineyard': {
    name: 'Vineyard / Utah Lake SP',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-mm19': {
    name: 'Mile Marker 19',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UID28', 'CSC'],
    primary: 'UID28',
    hasAmbient: false,
  },
  // ── Wasatch Back ──
  'deer-creek': {
    name: 'Deer Creek Reservoir',
    synoptic: ['KSLC', 'DCC', 'KHCR', 'SND', 'TIMU1', 'MDAU1', 'UTPCY'],
    primary: 'DCC',
    hasAmbient: false,
  },
  'jordanelle': {
    name: 'Jordanelle Reservoir',
    synoptic: ['KSLC', 'KHCR', 'SND', 'TIMU1', 'DCC', 'MDAU1'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'east-canyon': {
    name: 'East Canyon Reservoir',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'echo': {
    name: 'Echo Reservoir',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'rockport': {
    name: 'Rockport Reservoir',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Northern Utah ──
  'willard-bay': {
    name: 'Willard Bay',
    synoptic: ['KOGD', 'KSLC'],
    primary: 'KOGD',
    hasAmbient: false,
  },
  'pineview': {
    name: 'Pineview Reservoir',
    synoptic: ['KOGD', 'KSLC'],
    primary: 'KOGD',
    hasAmbient: false,
  },
  'hyrum': {
    name: 'Hyrum Reservoir',
    synoptic: ['KLGU'],
    primary: 'KLGU',
    hasAmbient: false,
  },
  'bear-lake': {
    name: 'Bear Lake',
    synoptic: ['KLGU', 'BERU1'],
    primary: 'BERU1',
    hasAmbient: false,
  },
  // ── Strawberry variants ──
  'strawberry-ladders': {
    name: 'Strawberry — Ladders',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'strawberry-bay': {
    name: 'Strawberry — Bay',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'strawberry-soldier': {
    name: 'Strawberry — Soldier Creek',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'strawberry-view': {
    name: 'Strawberry — View',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'strawberry-river': {
    name: 'Strawberry — River',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'skyline-drive': {
    name: 'Skyline Drive',
    synoptic: ['KHCR', 'SND', 'DCC', 'TIMU1', 'KPVU', 'KSLC'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  // ── Uinta Basin / NE Utah ──
  'starvation': {
    name: 'Starvation Reservoir',
    synoptic: ['KVEL'],
    primary: 'KVEL',
    hasAmbient: false,
  },
  'steinaker': {
    name: 'Steinaker Reservoir',
    synoptic: ['KVEL'],
    primary: 'KVEL',
    hasAmbient: false,
  },
  'red-fleet': {
    name: 'Red Fleet Reservoir',
    synoptic: ['KVEL'],
    primary: 'KVEL',
    hasAmbient: false,
  },
  'flaming-gorge': {
    name: 'Flaming Gorge',
    synoptic: ['KFGR'],
    primary: 'KFGR',
    hasAmbient: false,
  },
  // ── Central Utah ──
  'yuba': {
    name: 'Yuba Reservoir',
    synoptic: ['KPVU'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'scofield': {
    name: 'Scofield Reservoir',
    synoptic: ['KPUC'],
    primary: 'KPUC',
    hasAmbient: false,
  },
  // ── Southern Utah ──
  'otter-creek': {
    name: 'Otter Creek Reservoir',
    synoptic: ['KCDC'],
    primary: 'KCDC',
    hasAmbient: false,
  },
  'fish-lake': {
    name: 'Fish Lake',
    synoptic: ['KCDC'],
    primary: 'KCDC',
    hasAmbient: false,
  },
  'minersville': {
    name: 'Minersville Reservoir',
    synoptic: ['KCDC'],
    primary: 'KCDC',
    hasAmbient: false,
  },
  'piute': {
    name: 'Piute Reservoir',
    synoptic: ['KCDC'],
    primary: 'KCDC',
    hasAmbient: false,
  },
  'panguitch': {
    name: 'Panguitch Lake',
    synoptic: ['KCDC'],
    primary: 'KCDC',
    hasAmbient: false,
  },
  // ── Dixie / Washington County ──
  'sand-hollow': {
    name: 'Sand Hollow Reservoir',
    synoptic: ['KSGU'],
    primary: 'KSGU',
    hasAmbient: false,
  },
  'quail-creek': {
    name: 'Quail Creek Reservoir',
    synoptic: ['KSGU'],
    primary: 'KSGU',
    hasAmbient: false,
  },
  // ── Lake Powell ──
  'lake-powell': {
    name: 'Lake Powell',
    synoptic: ['KPGA'],
    primary: 'KPGA',
    hasAmbient: false,
  },
  // ── Kite spots ──
  'rush-lake': {
    name: 'Rush Lake',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'grantsville': {
    name: 'Grantsville',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Paragliding sites ──
  'potm-south': {
    name: 'Point of the Mountain — South',
    synoptic: ['FPS', 'KSLC', 'KPVU'],
    primary: 'FPS',
    hasAmbient: false,
  },
  'potm-north': {
    name: 'Point of the Mountain — North',
    synoptic: ['FPS', 'KSLC', 'KPVU'],
    primary: 'FPS',
    hasAmbient: false,
  },
  'inspo': {
    name: 'Inspiration Point',
    synoptic: ['KPVU'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'west-mountain': {
    name: 'West Mountain',
    synoptic: ['KPVU'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'stockton-bar': {
    name: 'Stockton Bar',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Snowkite spots ──
  'powder-mountain': {
    name: 'Powder Mountain',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'monte-cristo': {
    name: 'Monte Cristo',
    synoptic: ['KLGU'],
    primary: 'KLGU',
    hasAmbient: false,
  },
};

// Simple lake→stationIds map derived from LAKE_STATIONS (used by collect.js)
export const LAKE_STATION_MAP = Object.fromEntries(
  Object.entries(LAKE_STATIONS).map(([id, cfg]) => [id, cfg.synoptic])
);

// Upstream detection stations (not tied to any specific lake)
export const UPSTREAM_STATIONS = [
  'KOGD',   // Ogden, UT — 60mi N
  'KPIH',   // Pocatello, ID — 230mi N
  'KTWF',   // Twin Falls, ID — 280mi NW
  'KENV',   // Wendover, UT — 120mi W
  'KELY',   // Ely, NV — 230mi W
  'KDTA',   // Delta, UT — 100mi SW
  'KMLF',   // Milford, UT — 170mi SW
  'KCDC',   // Cedar City, UT — 250mi S
  'KLGU',   // Logan, UT — 80mi N
];

export const ALL_STATION_IDS = [
  ...new Set([
    ...Object.values(LAKE_STATIONS).flatMap(l => l.synoptic),
    ...UPSTREAM_STATIONS,
  ]),
];

export function getLakeConfig(lakeId) {
  return LAKE_STATIONS[lakeId] || null;
}
