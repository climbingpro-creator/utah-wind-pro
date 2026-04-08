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
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UTOLY', 'UID28', 'CSC', 'UTORM', 'UTPCR', 'UT7', 'UTPRB', 'UTRVT', 'UTLAK'],
    wuPws: ['KUTSARAT50', 'KUTSARAT88', 'KUTSARAT81', 'KUTSARAT74', 'KUTSARAT62', 'KUTLEHI73', 'KUTLEHI160'],
    primary: 'UID28',
    hasAmbient: true,
  },
  'utah-lake-lincoln': {
    name: 'Lincoln Point',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1', 'UTORM', 'UTPCR', 'UT7'],
    wuPws: ['KUTSARAT65', 'KUTSARAT52', 'KUTSARAT80'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-sandy': {
    name: 'Sandy Beach',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1', 'UTORM', 'UTPCR', 'UT7'],
    wuPws: ['KUTSARAT62', 'KUTLEHI73', 'KUTSARAT74'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-vineyard': {
    name: 'Vineyard / Utah Lake SP',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'CSC', 'TIMU1', 'QLN', 'UTORM', 'UTPCR', 'UT7'],
    wuPws: ['KUTPLEAS11', 'KUTPLEAS84', 'KUTCEDAR10'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-mm19': {
    name: 'Mile Marker 19',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UID28', 'CSC', 'UTORM', 'UTPCR', 'UT7', 'UTLAK'],
    primary: 'UID28',
    hasAmbient: false,
  },
  // ── Wasatch Back ──
  'deer-creek': {
    name: 'Deer Creek Reservoir',
    synoptic: ['KSLC', 'UTDCD', 'KHCR', 'TIMU1', 'SND', 'MDAU1', 'UTPCY', 'UTLPC', 'UTCHL'],
    wuPws: ['KUTMIDWA37', 'KUTHEBER105', 'KUTHEBER26', 'KUTPLEAS11', 'KUTCEDAR10'],
    primary: 'UTDCD',
    hasAmbient: false,
  },
  'jordanelle': {
    name: 'Jordanelle Reservoir',
    synoptic: ['KSLC', 'KHCR', 'TIMU1', 'UTDCD', 'MDAU1', 'UTCHL', 'UTLPC'],
    wuPws: ['KUTHEBER105', 'KUTHEBER26', 'KUTMIDWA37'],
    primary: 'KHCR',
    hasAmbient: false,
  },
  'east-canyon': {
    name: 'East Canyon Reservoir',
    synoptic: ['KSLC', 'KHCR', 'UTOLY'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'echo': {
    name: 'Echo Reservoir',
    synoptic: ['KSLC', 'KHCR', 'KVEL'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'rockport': {
    name: 'Rockport Reservoir',
    synoptic: ['KSLC', 'KHCR', 'KVEL'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Northern Utah ──
  'willard-bay': {
    name: 'Willard Bay',
    synoptic: ['KOGD', 'KHIF', 'KSLC', 'KBMC', 'UR328', 'BLPU1', 'OGP', 'GSLM', 'UTANT', 'UTFRW'],
    primary: 'UR328',
    hasAmbient: false,
  },
  'pineview': {
    name: 'Pineview Reservoir',
    synoptic: ['KOGD', 'KSLC', 'COOPOGNU1', 'PC496', 'UTPVD', 'UTHUN'],
    primary: 'UTPVD',
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
    synoptic: ['KLGU', 'BERU1', 'UTGRC', 'UTLTS'],
    primary: 'UTGRC',
    hasAmbient: false,
  },
  // ── Strawberry variants ──
  'strawberry-ladders': {
    name: 'Strawberry — Ladders',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'UTCOP', 'UTDAN', 'DSTU1', 'CCPUT', 'UTHEB'],
    primary: 'UTCOP',
    hasAmbient: false,
  },
  'strawberry-bay': {
    name: 'Strawberry — Bay',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'UTCOP', 'UTDAN', 'UWCU1', 'CCPUT', 'UTHEB'],
    primary: 'UTCOP',
    hasAmbient: false,
  },
  'strawberry-soldier': {
    name: 'Strawberry — Soldier Creek',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'RVZU1', 'UTCOP', 'CCPUT', 'UTSLD', 'UTHEB'],
    primary: 'RVZU1',
    hasAmbient: false,
  },
  'strawberry-view': {
    name: 'Strawberry — View',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'UTCOP', 'RVZU1', 'CCPUT', 'DSTU1', 'UTHEB'],
    primary: 'UTCOP',
    hasAmbient: false,
  },
  'strawberry-river': {
    name: 'Strawberry — River',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'UTCOP', 'RVZU1', 'DSTU1', 'CCPUT', 'UTHEB', 'UTDAN'],
    primary: 'UTCOP',
    hasAmbient: false,
  },
  'skyline-drive': {
    name: 'Skyline Drive',
    synoptic: ['KHCR', 'TIMU1', 'KPVU', 'KSLC', 'SKY', 'UTESU', 'UTMPK', 'EPMU1', 'UTHTP'],
    primary: 'SKY',
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
    synoptic: ['KPVU', 'UTLMP', 'UTRKY', 'UTSCI'],
    primary: 'UTLMP',
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
    synoptic: ['KSLC', 'KPVU', 'UTOLY'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  'grantsville': {
    name: 'Grantsville',
    synoptic: ['KSLC', 'KPVU', 'UTOLY'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Paragliding sites ──
  'potm-south': {
    name: 'Point of the Mountain — South',
    synoptic: ['FPS', 'UTALP', 'KSLC', 'KPVU', 'QSF', 'UTPCR'],
    wuPws: ['KUTLEHI111', 'KUTLEHI160', 'KUTALPIN3', 'KUTALPIN25'],
    primary: 'FPS',
    hasAmbient: false,
  },
  'potm-north': {
    name: 'Point of the Mountain — North',
    synoptic: ['FPS', 'UTALP', 'KSLC', 'KPVU', 'UT7'],
    wuPws: ['KUTDRAPE132', 'KUTDRAPE59', 'KUTRIVER67', 'KUTBLUFF18', 'KUTSANDY188'],
    primary: 'UTALP',
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
    synoptic: ['KSLC', 'KPVU', 'UTOLY'],
    primary: 'KSLC',
    hasAmbient: false,
  },
  // ── Snowkite spots ──
  'powder-mountain': {
    name: 'Powder Mountain',
    synoptic: ['KSLC', 'KOGD', 'KLGU', 'UTPOW'],
    primary: 'UTPOW',
    hasAmbient: false,
  },
  'monte-cristo': {
    name: 'Monte Cristo',
    synoptic: ['KLGU', 'UTMON'],
    primary: 'UTMON',
    hasAmbient: false,
  },
};

// Simple lake→stationIds map derived from LAKE_STATIONS (used by collect.js)
// Includes both Synoptic and WU PWS station IDs for unified observation mapping
export const LAKE_STATION_MAP = Object.fromEntries(
  Object.entries(LAKE_STATIONS).map(([id, cfg]) => [id, [...cfg.synoptic, ...(cfg.wuPws || [])]])
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
