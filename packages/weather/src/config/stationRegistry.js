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
  UTLPC: {
    id: 'UTLPC',
    name: 'Lower Provo Canyon (UDOT)',
    shortName: 'Lwr Provo Cyn',
    lat: 40.3800,
    lng: -111.5800,
    elevation: 5100,
    type: 'rwis',
    network: 'UDOT',
    roles: ['deer-creek-trigger', 'canyon-indicator'],
  },
  UTCHL: {
    id: 'UTCHL',
    name: 'Charleston (UDOT)',
    shortName: 'Charleston',
    lat: 40.4800,
    lng: -111.4600,
    elevation: 5500,
    type: 'rwis',
    network: 'UDOT',
    roles: ['deer-creek-mid-chain'],
  },
  UTDCD: {
    id: 'UTDCD',
    name: 'US-189 Deer Creek Dam (UDOT)',
    shortName: 'Deer Creek Dam',
    lat: 40.4090,
    lng: -111.5100,
    elevation: 5400,
    type: 'rwis',
    network: 'UDOT',
    roles: ['deer-creek-primary'],
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
  UTHEB: {
    id: 'UTHEB',
    name: 'Heber (UDOT)',
    shortName: 'Heber',
    lat: 40.5100,
    lng: -111.4100,
    elevation: 5600,
    type: 'rwis',
    network: 'UDOT',
    roles: ['strawberry-mid-chain'],
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

  // Saratoga Springs
  UID28: {
    id: 'UID28',
    name: 'Saratoga Springs',
    shortName: 'Saratoga',
    lat: 40.35,
    lng: -111.90,
    elevation: 4500,
    type: 'mesonet',
    network: 'MesoWest',
    roles: ['utah-lake-north-shore', 'zigzag-proximity'],
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

  // ─── Strawberry Reservoir area (verified via Synoptic API) ───
  UTCOP: {
    id: 'UTCOP',
    name: 'US-40 at Co-Op Creek',
    shortName: 'Co-Op Creek',
    lat: 40.2418,
    lng: -111.1771,
    elevation: 7637,
    type: 'rwis',
    network: 'UDOT',
    roles: ['strawberry-primary', 'strawberry-river'],
  },
  UTDAN: {
    id: 'UTDAN',
    name: 'US-40 at Daniels Summit',
    shortName: 'Daniels Summit',
    lat: 40.3033,
    lng: -111.2578,
    elevation: 8000,
    type: 'rwis',
    network: 'UDOT',
    roles: ['strawberry-pass', 'daniels-primary'],
  },
  DSTU1: {
    id: 'DSTU1',
    name: 'Daniels-Strawberry SNOTEL',
    shortName: 'Daniels SNOTEL',
    lat: 40.2953,
    lng: -111.2568,
    elevation: 8007,
    type: 'snotel',
    network: 'NRCS',
    roles: ['strawberry-snotel', 'daniels-snotel'],
  },
  CCPUT: {
    id: 'CCPUT',
    name: 'Currant Creek Peak',
    shortName: 'Currant Ck Pk',
    lat: 40.3784,
    lng: -111.1750,
    elevation: 10547,
    type: 'mountaintop',
    network: 'USFS',
    roles: ['strawberry-ridge', 'high-elevation-trigger'],
  },
  RVZU1: {
    id: 'RVZU1',
    name: 'Rays Valley RAWS',
    shortName: 'Rays Valley',
    lat: 40.1178,
    lng: -111.2804,
    elevation: 7273,
    type: 'raws',
    network: 'RAWS',
    roles: ['strawberry-south'],
  },
  UWCU1: {
    id: 'UWCU1',
    name: 'Provo 22E (AgriMet)',
    shortName: 'Provo 22E',
    lat: 40.2816,
    lng: -111.2398,
    elevation: 7812,
    type: 'agrimet',
    network: 'AgriMet',
    roles: ['strawberry-reference'],
  },

  // ─── Skyline Drive / Sanpete County (verified via Synoptic API) ───
  SKY: {
    id: 'SKY',
    name: 'Skyline UDOT',
    shortName: 'Skyline',
    lat: 39.6362,
    lng: -111.3286,
    elevation: 9330,
    type: 'rwis',
    network: 'UDOT',
    roles: ['skyline-primary', 'skyline-ground-truth'],
  },
  UTESU: {
    id: 'UTESU',
    name: 'SR-264 Eccles Summit',
    shortName: 'Eccles Summit',
    lat: 39.6793,
    lng: -111.2219,
    elevation: 9443,
    type: 'rwis',
    network: 'UDOT',
    roles: ['skyline-ridge'],
  },
  UTMPK: {
    id: 'UTMPK',
    name: 'Monument Peak',
    shortName: 'Monument Pk',
    lat: 39.6143,
    lng: -111.1773,
    elevation: 10390,
    type: 'mountaintop',
    network: 'USFS',
    roles: ['skyline-high-elevation'],
  },
  UTHTP: {
    id: 'UTHTP',
    name: 'US-89 at Hilltop',
    shortName: 'Hilltop',
    lat: 39.7160,
    lng: -111.4708,
    elevation: 6446,
    type: 'rwis',
    network: 'UDOT',
    roles: ['skyline-valley-access'],
  },
  EPMU1: {
    id: 'EPMU1',
    name: 'Ephraim NWS',
    shortName: 'Ephraim',
    lat: 39.3680,
    lng: -111.5780,
    elevation: 5530,
    type: 'coop',
    network: 'NWS',
    roles: ['skyline-valley-reference'],
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

  // ── Expanded network: UDOT RWIS stations ──
  UTORM: {
    id: 'UTORM', name: 'I-15 Orem (UDOT)', shortName: 'Orem I-15',
    lat: 40.2800, lng: -111.7000, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['se-thermal-mid-chain'],
  },
  UTPCR: {
    id: 'UTPCR', name: 'Pioneer Crossing, Lehi (UDOT)', shortName: 'Pioneer Xing',
    lat: 40.4100, lng: -111.9200, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['zigzag-close-indicator'],
  },
  UT7: {
    id: 'UT7', name: 'Bluffdale I-15 (UDOT)', shortName: 'Bluffdale',
    lat: 40.4900, lng: -111.9300, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['north-flow-mid-chain'],
  },
  UTPRB: {
    id: 'UTPRB', name: 'Porter Rockwell Blvd (UDOT)', shortName: 'Porter Rockwell',
    lat: 40.4600, lng: -111.9100, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['north-flow-corroboration'],
  },
  UTRVT: {
    id: 'UTRVT', name: 'SR-154 Riverton (UDOT)', shortName: 'Riverton',
    lat: 40.5200, lng: -111.9500, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['north-flow-corroboration'],
  },
  UTLAK: {
    id: 'UTLAK', name: 'SR-68 Mosida (UDOT)', shortName: 'Mosida',
    lat: 40.2100, lng: -111.9400, elevation: 4500,
    type: 'rwis', network: 'UDOT', roles: ['lake-level-crosswind'],
  },
  UTLMP: {
    id: 'UTLMP', name: 'I-15 Lampson Canyon (UDOT)', shortName: 'Lampson Cyn',
    lat: 39.4500, lng: -111.9200, elevation: 5200,
    type: 'rwis', network: 'UDOT', roles: ['yuba-ground-truth'],
  },
  UTRKY: {
    id: 'UTRKY', name: 'I-15 Rocky Ridge (UDOT)', shortName: 'Rocky Ridge',
    lat: 39.7200, lng: -111.8500, elevation: 5400,
    type: 'rwis', network: 'UDOT', roles: ['yuba-north-approach'],
  },
  UTSCI: {
    id: 'UTSCI', name: 'I-15 Scipio Summit (UDOT)', shortName: 'Scipio',
    lat: 39.2500, lng: -112.1000, elevation: 5900,
    type: 'rwis', network: 'UDOT', roles: ['yuba-south-approach'],
  },
  UTSLD: {
    id: 'UTSLD', name: 'Soldier Summit (UDOT)', shortName: 'Soldier Summit',
    lat: 39.9300, lng: -111.0800, elevation: 7400,
    type: 'rwis', network: 'UDOT', roles: ['strawberry-south-approach'],
  },
  UTANT: {
    id: 'UTANT', name: 'I-15 Antelope Drive (UDOT)', shortName: 'Antelope Dr',
    lat: 41.0600, lng: -111.9800, elevation: 4300,
    type: 'rwis', network: 'UDOT', roles: ['willard-bay-close'],
  },
  UTFRW: {
    id: 'UTFRW', name: 'I-15 Farr West (UDOT)', shortName: 'Farr West',
    lat: 41.2100, lng: -112.0200, elevation: 4400,
    type: 'rwis', network: 'UDOT', roles: ['willard-bay-north-approach'],
  },
  UTGRC: {
    id: 'UTGRC', name: 'US-89 Garden City (UDOT)', shortName: 'Garden City',
    lat: 41.9400, lng: -111.4000, elevation: 5924,
    type: 'rwis', network: 'UDOT', roles: ['bear-lake-ground-truth'],
  },
  UTLTS: {
    id: 'UTLTS', name: 'SR-30 Laketown Summit (UDOT)', shortName: 'Laketown',
    lat: 41.8600, lng: -111.3200, elevation: 6500,
    type: 'rwis', network: 'UDOT', roles: ['bear-lake-west-approach'],
  },
  UTPVD: {
    id: 'UTPVD', name: 'SR-39 Pineview Dam (UDOT)', shortName: 'Pineview Dam',
    lat: 41.2700, lng: -111.8200, elevation: 4900,
    type: 'rwis', network: 'UDOT', roles: ['pineview-ground-truth'],
  },
  UTPOW: {
    id: 'UTPOW', name: 'SR-158 Powder Mountain (UDOT)', shortName: 'Powder Mtn',
    lat: 41.3800, lng: -111.7800, elevation: 8900,
    type: 'rwis', network: 'UDOT', roles: ['powder-mountain-on-site'],
  },
  UTMON: {
    id: 'UTMON', name: 'SR-39 Monte Cristo (UDOT)', shortName: 'Monte Cristo',
    lat: 41.4500, lng: -111.5000, elevation: 8900,
    type: 'rwis', network: 'UDOT', roles: ['monte-cristo-on-site'],
  },
  // ── Weather Underground PWS Network ──
  KUTSARAT50: {
    id: 'KUTSARAT50', name: 'Zigzag PWS (WU)', shortName: 'Zigzag WU',
    lat: 40.302, lng: -111.881, elevation: 4531,
    type: 'pws', network: 'WU', roles: ['zigzag-ground-truth-wu'],
  },
  KUTSARAT88: {
    id: 'KUTSARAT88', name: 'Saratoga Springs S (WU)', shortName: 'SS South WU',
    lat: 40.293, lng: -111.884, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['zigzag-close-wu'],
  },
  KUTSARAT81: {
    id: 'KUTSARAT81', name: 'Saratoga Springs SE (WU)', shortName: 'SS SE WU',
    lat: 40.287, lng: -111.877, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['zigzag-close-wu'],
  },
  KUTSARAT74: {
    id: 'KUTSARAT74', name: 'Saratoga Springs W (WU)', shortName: 'SS West WU',
    lat: 40.333, lng: -111.910, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['zigzag-mid-wu'],
  },
  KUTSARAT62: {
    id: 'KUTSARAT62', name: 'Saratoga Springs N (WU)', shortName: 'SS North WU',
    lat: 40.377, lng: -111.912, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['zigzag-mid-wu'],
  },
  KUTSARAT65: {
    id: 'KUTSARAT65', name: 'Saratoga Springs W2 (WU)', shortName: 'SS W2 WU',
    lat: 40.313, lng: -111.895, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['lincoln-close-wu'],
  },
  KUTSARAT52: {
    id: 'KUTSARAT52', name: 'Saratoga Springs SW (WU)', shortName: 'SS SW WU',
    lat: 40.306, lng: -111.904, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['lincoln-close-wu'],
  },
  KUTSARAT80: {
    id: 'KUTSARAT80', name: 'Saratoga Springs NW (WU)', shortName: 'SS NW WU',
    lat: 40.315, lng: -111.902, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['lincoln-mid-wu'],
  },
  KUTLEHI73: {
    id: 'KUTLEHI73', name: 'Lehi NW (WU)', shortName: 'Lehi NW WU',
    lat: 40.378, lng: -111.905, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['zigzag-mid-wu', 'potm-south-close-wu'],
  },
  KUTLEHI111: {
    id: 'KUTLEHI111', name: 'Lehi FPS area (WU)', shortName: 'Lehi FPS WU',
    lat: 40.454, lng: -111.892, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['potm-south-close-wu'],
  },
  KUTLEHI160: {
    id: 'KUTLEHI160', name: 'Lehi S (WU)', shortName: 'Lehi S WU',
    lat: 40.447, lng: -111.889, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['se-thermal-mid-wu'],
  },
  KUTDRAPE132: {
    id: 'KUTDRAPE132', name: 'Draper E (WU)', shortName: 'Draper WU',
    lat: 40.480, lng: -111.884, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['north-flow-mid-wu', 'potm-north-close-wu'],
  },
  KUTDRAPE59: {
    id: 'KUTDRAPE59', name: 'Draper W (WU)', shortName: 'Draper W WU',
    lat: 40.477, lng: -111.883, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['north-flow-mid-wu'],
  },
  KUTRIVER67: {
    id: 'KUTRIVER67', name: 'Riverton (WU)', shortName: 'Riverton WU',
    lat: 40.489, lng: -111.919, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['north-flow-mid-wu'],
  },
  KUTBLUFF18: {
    id: 'KUTBLUFF18', name: 'Bluffdale (WU)', shortName: 'Bluffdale WU',
    lat: 40.492, lng: -111.935, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['north-flow-mid-wu'],
  },
  KUTSANDY188: {
    id: 'KUTSANDY188', name: 'Sandy S (WU)', shortName: 'Sandy WU',
    lat: 40.552, lng: -111.807, elevation: 4500,
    type: 'pws', network: 'WU', roles: ['north-flow-early-wu'],
  },
  KUTALPIN3: {
    id: 'KUTALPIN3', name: 'Alpine W (WU)', shortName: 'Alpine W WU',
    lat: 40.444, lng: -111.769, elevation: 4900,
    type: 'pws', network: 'WU', roles: ['potm-east-bench-wu'],
  },
  KUTALPIN25: {
    id: 'KUTALPIN25', name: 'Alpine E (WU)', shortName: 'Alpine E WU',
    lat: 40.451, lng: -111.761, elevation: 4900,
    type: 'pws', network: 'WU', roles: ['potm-east-bench-wu'],
  },
  KUTMIDWA37: {
    id: 'KUTMIDWA37', name: 'Midway (WU)', shortName: 'Midway WU',
    lat: 40.505, lng: -111.465, elevation: 5600,
    type: 'pws', network: 'WU', roles: ['deer-creek-close-wu'],
  },
  KUTHEBER105: {
    id: 'KUTHEBER105', name: 'Heber City E (WU)', shortName: 'Heber E WU',
    lat: 40.485, lng: -111.444, elevation: 5600,
    type: 'pws', network: 'WU', roles: ['deer-creek-mid-wu', 'jordanelle-close-wu'],
  },
  KUTHEBER26: {
    id: 'KUTHEBER26', name: 'Heber City S (WU)', shortName: 'Heber S WU',
    lat: 40.477, lng: -111.450, elevation: 5600,
    type: 'pws', network: 'WU', roles: ['deer-creek-mid-wu'],
  },
  KUTHEBER99: {
    id: 'KUTHEBER99', name: 'Heber City (WU)', shortName: 'Heber WU',
    lat: 40.510, lng: -111.410, elevation: 5640,
    type: 'pws', network: 'WU', roles: ['deer-creek-mid-wu'],
  },
  KUTPLEAS11: {
    id: 'KUTPLEAS11', name: 'Pleasant Grove (WU)', shortName: 'PG WU',
    lat: 40.400, lng: -111.742, elevation: 4600,
    type: 'pws', network: 'WU', roles: ['vineyard-close-wu', 'deer-creek-early-wu'],
  },
  KUTPLEAS84: {
    id: 'KUTPLEAS84', name: 'Pleasant Grove E (WU)', shortName: 'PG East WU',
    lat: 40.413, lng: -111.756, elevation: 4600,
    type: 'pws', network: 'WU', roles: ['vineyard-close-wu'],
  },
  KUTCEDAR10: {
    id: 'KUTCEDAR10', name: 'Cedar Hills (WU)', shortName: 'Cedar Hills WU',
    lat: 40.396, lng: -111.741, elevation: 4700,
    type: 'pws', network: 'WU', roles: ['vineyard-mid-wu', 'deer-creek-early-wu'],
  },

  // ── Tempest WeatherFlow Stations ──
  TEMPEST_DC: {
    id: 'TEMPEST_DC', name: 'Barbed Wire Beach (Tempest)', shortName: 'DC Beach',
    lat: 40.4588, lng: -111.4727, elevation: 5420,
    type: 'pws', network: 'Tempest', roles: ['deer-creek-ground-truth'],
    tempest: { stationId: 114523, deviceId: 287462 },
  },

  // ── Tempest WeatherFlow — Vineyard / Lindon ──
  TEMPEST_141420: {
    id: 'TEMPEST_141420', name: 'Lindon 550 N (Tempest)', shortName: 'Lindon Tempest',
    lat: 40.34755, lng: -111.75677, elevation: 4516,
    type: 'pws', network: 'Tempest', roles: ['vineyard-ground-truth'],
    tempest: { stationId: 141420 },
  },
  TEMPEST_134280: {
    id: 'TEMPEST_134280', name: 'Orem N 625 W (Tempest)', shortName: 'Orem Tempest',
    lat: 40.31992, lng: -111.71121, elevation: 4750,
    type: 'pws', network: 'Tempest', roles: ['vineyard-close'],
    tempest: { stationId: 134280 },
  },
  // ── Tempest WeatherFlow — PotM / Lehi ──
  TEMPEST_124015: {
    id: 'TEMPEST_124015', name: 'Seasons View Dr (Tempest)', shortName: 'PotM Tempest',
    lat: 40.44115, lng: -111.86794, elevation: 5207,
    type: 'pws', network: 'Tempest', roles: ['potm-south-close'],
    tempest: { stationId: 124015 },
  },
  TEMPEST_194125: {
    id: 'TEMPEST_194125', name: 'Lehi N 1090 W (Tempest)', shortName: 'Lehi Tempest',
    lat: 40.42929, lng: -111.86728, elevation: 4742,
    type: 'pws', network: 'Tempest', roles: ['potm-south-close'],
    tempest: { stationId: 194125 },
  },
  // ── Tempest WeatherFlow — Jordanelle ──
  TEMPEST_111255: {
    id: 'TEMPEST_111255', name: 'Little Kate Rd (Tempest)', shortName: 'Jordanelle Tmp',
    lat: 40.66936, lng: -111.51009, elevation: 6753,
    type: 'pws', network: 'Tempest', roles: ['jordanelle-close'],
    tempest: { stationId: 111255 },
  },
  // ── Tempest WeatherFlow — Willard Bay ──
  TEMPEST_148360: {
    id: 'TEMPEST_148360', name: 'Perry (Tempest)', shortName: 'Perry Tempest',
    lat: 41.44492, lng: -112.04522, elevation: 4302,
    type: 'pws', network: 'Tempest', roles: ['willard-bay-close'],
    tempest: { stationId: 148360 },
  },
  TEMPEST_93590: {
    id: 'TEMPEST_93590', name: 'Harrisville (Tempest)', shortName: 'Harrisville Tmp',
    lat: 41.29923, lng: -111.9826, elevation: 4330,
    type: 'pws', network: 'Tempest', roles: ['willard-bay-close'],
    tempest: { stationId: 93590 },
  },
  // ── Tempest WeatherFlow — Pineview ──
  TEMPEST_159080: {
    id: 'TEMPEST_159080', name: 'N 4000 E (Tempest)', shortName: 'Pineview Tmp',
    lat: 41.33583, lng: -111.85213, elevation: 5089,
    type: 'pws', network: 'Tempest', roles: ['pineview-close'],
    tempest: { stationId: 159080 },
  },
  // ── Tempest WeatherFlow — Rockport ──
  TEMPEST_81860: {
    id: 'TEMPEST_81860', name: 'Pine Loop Rd (Tempest)', shortName: 'Rockport Tmp',
    lat: 40.81097, lng: -111.50287, elevation: 7901,
    type: 'pws', network: 'Tempest', roles: ['rockport-close'],
    tempest: { stationId: 81860 },
  },
  // ── Tempest WeatherFlow — Bear Lake ──
  TEMPEST_106250: {
    id: 'TEMPEST_106250', name: 'Foxridge Rd (Tempest)', shortName: 'Bear Lake Tmp',
    lat: 41.90184, lng: -111.39208, elevation: 5997,
    type: 'pws', network: 'Tempest', roles: ['bear-lake-close'],
    tempest: { stationId: 106250 },
  },
  // ── Tempest WeatherFlow — Sand Hollow ──
  TEMPEST_103270: {
    id: 'TEMPEST_103270', name: 'Dixie Springs (Tempest)', shortName: 'Sand Hollow Tmp',
    lat: 37.13546, lng: -113.38606, elevation: 2965,
    type: 'pws', network: 'Tempest', roles: ['sand-hollow-ground-truth'],
    tempest: { stationId: 103270 },
  },
  // ── Tempest WeatherFlow — Steinaker / Vernal ──
  TEMPEST_63500: {
    id: 'TEMPEST_63500', name: 'Ashley Canyon (Tempest)', shortName: 'Steinaker Tmp',
    lat: 40.56324, lng: -109.61635, elevation: 6170,
    type: 'pws', network: 'Tempest', roles: ['steinaker-close'],
    tempest: { stationId: 63500 },
  },
  // ── Tempest WeatherFlow — Lincoln Beach area ──
  TEMPEST_107055: {
    id: 'TEMPEST_107055', name: 'S 1800 W (Tempest)', shortName: 'Lincoln Tempest',
    lat: 40.09423, lng: -111.69801, elevation: 4545,
    type: 'pws', network: 'Tempest', roles: ['utah-lake-lincoln-close'],
    tempest: { stationId: 107055 },
  },

  // ── Sulphur Creek Reservoir (Wyoming I-80 corridor) ──
  KEVW: {
    id: 'KEVW',
    name: 'Evanston-Uinta County Airport',
    shortName: 'Evanston',
    lat: 41.2750, lng: -111.0350, elevation: 7143,
    type: 'aviation', network: 'NWS',
    roles: ['sulfur-creek-pressure', 'sulfur-creek-secondary'],
  },
  KFIR: {
    id: 'KFIR',
    name: 'First Divide I-80 (WYDOT)',
    shortName: 'First Divide',
    lat: 41.2765, lng: -110.8007, elevation: 7579,
    type: 'rwis', network: 'WYDOT',
    roles: ['sulfur-creek-ground-truth', 'sulfur-creek-primary'],
  },
  UT1: {
    id: 'UT1',
    name: 'Wahsatch Hill EB (UDOT)',
    shortName: 'Wahsatch EB',
    lat: 41.1952, lng: -111.114, elevation: 6814,
    type: 'rwis', network: 'UDOT',
    roles: ['sulfur-creek-predictor', 'west-wind-upstream'],
  },

  // ── Sulphur Creek WU PWS (Evanston, WY area) ──
  KWYEVANS10: {
    id: 'KWYEVANS10', name: 'Evanston NW (WU)', shortName: 'Evanston NW WU',
    lat: 41.280, lng: -110.980, elevation: 6800,
    type: 'pws', network: 'WU', roles: ['sulfur-creek-close-wu'],
  },
  KWYEVANS60: {
    id: 'KWYEVANS60', name: 'Evanston S (WU)', shortName: 'Evanston S WU',
    lat: 41.240, lng: -110.960, elevation: 6800,
    type: 'pws', network: 'WU', roles: ['sulfur-creek-close-wu'],
  },
  KWYEVANS63: {
    id: 'KWYEVANS63', name: 'Evanston E (WU)', shortName: 'Evanston E WU',
    lat: 41.270, lng: -110.940, elevation: 6800,
    type: 'pws', network: 'WU', roles: ['sulfur-creek-mid-wu'],
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
