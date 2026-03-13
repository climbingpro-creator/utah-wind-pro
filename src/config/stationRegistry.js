/**
 * STATION REGISTRY — Single source of truth for all weather station metadata.
 * 
 * Both lakeStations.js and ThermalPredictor.js should reference stations by ID
 * and pull display info from here, rather than duplicating names/coordinates.
 */

export const STATION_REGISTRY = {
  // Aviation (NWS/FAA)
  KSLC: {
    id: 'KSLC',
    name: 'Salt Lake City International Airport',
    shortName: 'SLC Airport',
    lat: 40.7707,
    lng: -111.9650,
    elevation: 4226,
    type: 'aviation',
    network: 'NWS',
    roles: ['north-flow-origin', 'pressure-high'],
  },
  KPVU: {
    id: 'KPVU',
    name: 'Provo Municipal Airport',
    shortName: 'Provo Airport',
    lat: 40.2239,
    lng: -111.7253,
    elevation: 4495,
    type: 'aviation',
    network: 'NWS',
    roles: ['pressure-low', 'south-indicator', 'ground-truth-sandy', 'ground-truth-lincoln'],
  },
  KHCR: {
    id: 'KHCR',
    name: 'Heber Valley Airport',
    shortName: 'Heber Airport',
    lat: 40.4818,
    lng: -111.4285,
    elevation: 5637,
    type: 'aviation',
    network: 'NWS',
    roles: ['deer-creek-reference'],
  },
  KOGD: {
    id: 'KOGD',
    name: 'Ogden-Hinckley Airport',
    shortName: 'Ogden Airport',
    lat: 41.1961,
    lng: -112.0122,
    elevation: 4473,
    type: 'aviation',
    network: 'NWS',
    roles: ['willard-bay-reference'],
  },
  KBMC: {
    id: 'KBMC',
    name: 'Brigham City Regional Airport',
    shortName: 'Brigham City',
    lat: 41.5524,
    lng: -112.0620,
    elevation: 4230,
    type: 'aviation',
    network: 'NWS',
    roles: [],
  },
  KHIF: {
    id: 'KHIF',
    name: 'Hill Air Force Base',
    shortName: 'Hill AFB',
    lat: 41.1239,
    lng: -111.9731,
    elevation: 4789,
    type: 'military',
    network: 'USAF',
    roles: ['willard-bay-indicator'],
  },

  // Paragliding / Point of the Mountain
  FPS: {
    id: 'FPS',
    name: 'Flight Park South',
    shortName: 'FPS',
    lat: 40.4567,
    lng: -111.9027,
    elevation: 5148,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['paragliding-south', 'utah-lake-indicator'],
  },
  UTALP: {
    id: 'UTALP',
    name: 'Point of the Mountain I-15',
    shortName: 'Point of Mtn',
    lat: 40.4498,
    lng: -111.9117,
    elevation: 4796,
    type: 'rwis',
    network: 'UDOT',
    roles: ['paragliding-north', 'north-flow-ground-truth'],
  },

  // Ridge / Mountaintop
  CSC: {
    id: 'CSC',
    name: 'Cascade Peak',
    shortName: 'Cascade Pk',
    lat: 40.3600,
    lng: -111.7200,
    elevation: 10908,
    type: 'mountaintop',
    network: 'MesoWest',
    roles: ['ridge-indicator'],
  },
  TIMU1: {
    id: 'TIMU1',
    name: 'Timpanogos Divide',
    shortName: 'Timp Divide',
    lat: 40.4000,
    lng: -111.6200,
    elevation: 8900,
    type: 'snotel',
    network: 'NRCS',
    roles: ['ridge-indicator'],
  },
  SND: {
    id: 'SND',
    name: 'Arrowhead Summit (Sundance)',
    shortName: 'Arrowhead',
    lat: 40.3800,
    lng: -111.5800,
    elevation: 8252,
    type: 'ski',
    network: 'MesoWest',
    roles: ['deer-creek-trigger', 'ridge-indicator'],
  },
  BLPU1: {
    id: 'BLPU1',
    name: 'Ben Lomond Peak',
    shortName: 'Ben Lomond',
    lat: 41.3700,
    lng: -111.9200,
    elevation: 9712,
    type: 'snotel',
    network: 'NRCS',
    roles: ['willard-bay-ridge'],
  },
  OGP: {
    id: 'OGP',
    name: 'Mount Ogden (Snowbasin)',
    shortName: 'Mt Ogden',
    lat: 41.2200,
    lng: -111.8600,
    elevation: 9570,
    type: 'ski',
    network: 'MesoWest',
    roles: ['willard-bay-ridge'],
  },

  // Valley / Mesonet
  QSF: {
    id: 'QSF',
    name: 'Spanish Fork',
    shortName: 'Spanish Fork',
    lat: 40.1363,
    lng: -111.6602,
    elevation: 4537,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['early-indicator-se-thermal'],
  },
  QLN: {
    id: 'QLN',
    name: 'Lindon',
    shortName: 'Lindon',
    lat: 40.3400,
    lng: -111.7200,
    elevation: 4600,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['utah-lake-reference'],
  },
  DCC: {
    id: 'DCC',
    name: 'Deer Creek Dam',
    shortName: 'Deer Creek',
    lat: 40.4100,
    lng: -111.5200,
    elevation: 5400,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['deer-creek-primary'],
  },
  UR328: {
    id: 'UR328',
    name: 'Willard',
    shortName: 'Willard',
    lat: 41.3800,
    lng: -112.0400,
    elevation: 4200,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['willard-bay-primary'],
  },
  GSLM: {
    id: 'GSLM',
    name: 'Great Salt Lake Minerals',
    shortName: 'GSL Minerals',
    lat: 40.7600,
    lng: -112.2100,
    elevation: 4200,
    type: 'industrial',
    network: 'MesoWest',
    roles: ['willard-bay-reference'],
  },

  // Canyon / RWIS
  UTPCY: {
    id: 'UTPCY',
    name: 'Provo Canyon Mile Post 10',
    shortName: 'Provo Canyon',
    lat: 40.3600,
    lng: -111.6100,
    elevation: 5200,
    type: 'rwis',
    network: 'UDOT',
    roles: ['deer-creek-reference'],
  },
  MDAU1: {
    id: 'MDAU1',
    name: 'Midway',
    shortName: 'Midway',
    lat: 40.5100,
    lng: -111.4700,
    elevation: 5600,
    type: 'coop',
    network: 'NWS',
    roles: ['deer-creek-reference'],
  },

  // Murray
  UTOLY: {
    id: 'UTOLY',
    name: 'Salt Lake City (Murray)',
    shortName: 'Murray',
    lat: 40.6826,
    lng: -111.7973,
    elevation: 4972,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['north-flow-valley-confirmation'],
  },

  // Pineview
  COOPOGNU1: {
    id: 'COOPOGNU1',
    name: 'Pineview Dam',
    shortName: 'Pineview Dam',
    lat: 41.2700,
    lng: -111.8200,
    elevation: 4900,
    type: 'coop',
    network: 'NWS',
    roles: ['pineview-primary'],
  },
  PC496: {
    id: 'PC496',
    name: 'Pineview Reservoir',
    shortName: 'Pineview',
    lat: 41.2700,
    lng: -111.8200,
    elevation: 4900,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['pineview-reference'],
  },
  UTHUN: {
    id: 'UTHUN',
    name: 'Huntsville',
    shortName: 'Huntsville',
    lat: 41.2600,
    lng: -111.7700,
    elevation: 4950,
    type: 'rwis',
    network: 'UDOT',
    roles: ['pineview-reference'],
  },

  // Salt Lake Airport 2
  KU42: {
    id: 'KU42',
    name: 'Salt Lake City Airport 2',
    shortName: 'SLC Airport 2',
    lat: 40.6195,
    lng: -112.0013,
    elevation: 4230,
    type: 'aviation',
    network: 'MesoWest',
    roles: ['north-flow-indicator'],
  },
};

/** Look up a station by ID, returning at least { id, name } */
export function getStation(id) {
  return STATION_REGISTRY[id] || { id, name: id, shortName: id };
}

/** Get display name for a station */
export function getStationName(id, short = false) {
  const s = STATION_REGISTRY[id];
  if (!s) return id;
  return short ? s.shortName : s.name;
}

/** Find all stations matching a role */
export function getStationsByRole(role) {
  return Object.values(STATION_REGISTRY).filter(s => s.roles.includes(role));
}
