/**
 * Station configuration — single source of truth for all endpoints.
 * Each lake maps to the Synoptic station IDs that serve it.
 */

export const LAKE_STATIONS = {
  'utah-lake-zigzag': {
    name: 'Zigzag Island / Saratoga Springs',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UTOLY', 'UID28'],
    primary: 'UID28',
    hasAmbient: true,
  },
  'utah-lake-lincoln': {
    name: 'Lincoln Point',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-sandy': {
    name: 'Sandy Beach',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-vineyard': {
    name: 'Vineyard / Utah Lake SP',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP'],
    primary: 'KPVU',
    hasAmbient: false,
  },
  'utah-lake-mm19': {
    name: 'Mile Marker 19',
    synoptic: ['KSLC', 'KPVU', 'QSF', 'FPS', 'UTALP', 'UID28'],
    primary: 'UID28',
    hasAmbient: false,
  },
  'deer-creek': {
    name: 'Deer Creek Reservoir',
    synoptic: ['KSLC', 'DCC', 'KHCR', 'SND', 'TIMU1', 'MDAU1', 'UTPCY'],
    primary: 'DCC',
    hasAmbient: false,
  },
  'willard-bay': {
    name: 'Willard Bay',
    synoptic: ['KSLC'],
    primary: 'KSLC',
    hasAmbient: false,
  },
};

export const ALL_STATION_IDS = [
  ...new Set(Object.values(LAKE_STATIONS).flatMap(l => l.synoptic)),
];

export function getLakeConfig(lakeId) {
  return LAKE_STATIONS[lakeId] || null;
}
