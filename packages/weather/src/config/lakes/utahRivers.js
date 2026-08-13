/**
 * River / tailwater station configs for the water app.
 * These locations exist in FISHING_LOCATIONS but were missing from
 * LAKE_CONFIGS, so useWeatherData returned an empty LakeState ("no data").
 *
 * Stations reuse the nearest ASOS (KFGR for Green River, KPVU/KHCR for Provo).
 */
export const utahRiverConfigs = {
  'green-a': {
    id: 'green-a',
    name: 'Green River — A Section',
    shortName: 'Green A',
    region: 'Daggett County',
    coordinates: { lat: 40.9140, lng: -109.4220 },
    elevation: 5600,
    primaryWindType: 'Canyon/SE Prevailing',
    thermalDirection: 'SE to S (130-200°)',
    description: 'Blue Ribbon tailwater below Flaming Gorge Dam — Dam to Little Hole',
    stations: {
      pressure: {
        high: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Nearest ASOS — dam level' },
        low: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Dam-level reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KFGR', name: 'Flaming Gorge AWOS', role: 'Ground Truth — nearest station to A Section put-in' },
      lakeshore: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary — near dam', priority: 1 },
      ],
      reference: [{ id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955 }],
    },
    thermal: {
      optimalDirection: { min: 130, max: 200, ideal: 160 },
      optimalSpeed: { min: 2, max: 10, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 48,
    fishSpecies: {
      primary: ['rainbow trout', 'brown trout', 'cutthroat trout'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        bwo: 'Mar–May, Sep–Nov',
        pmd: 'May–Jul',
        cicada: 'June (legendary)',
        midge: 'Year-round',
      },
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'high' },
  },

  'green-b': {
    id: 'green-b',
    name: 'Green River — B Section',
    shortName: 'Green B',
    region: 'Daggett County',
    coordinates: { lat: 40.9050, lng: -109.3950 },
    elevation: 5500,
    primaryWindType: 'Canyon/SE Prevailing',
    thermalDirection: 'SE to S (130-200°)',
    description: 'Little Hole to Indian Crossing — technical trophy brown water',
    stations: {
      pressure: {
        high: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Nearest ASOS' },
        low: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Dam-level reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KFGR', name: 'Flaming Gorge AWOS', role: 'Ground Truth' },
      lakeshore: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary', priority: 1 },
      ],
      reference: [{ id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955 }],
    },
    thermal: {
      optimalDirection: { min: 130, max: 200, ideal: 160 },
      optimalSpeed: { min: 2, max: 10, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['brown trout', 'rainbow trout', 'cutthroat trout'],
      secondary: [],
      blueRibbon: true,
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'high' },
  },

  'green-c': {
    id: 'green-c',
    name: 'Green River — C Section',
    shortName: 'Green C',
    region: 'Daggett / Uintah',
    coordinates: { lat: 40.8250, lng: -109.0250 },
    elevation: 5400,
    primaryWindType: 'Canyon/SE Prevailing',
    thermalDirection: 'SE to S (130-200°)',
    description: 'Browns Park to Colorado border — remote C Section, bait allowed',
    stations: {
      pressure: {
        high: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Nearest ASOS' },
        low: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Dam-level reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KFGR', name: 'Flaming Gorge AWOS', role: 'Ground Truth' },
      lakeshore: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary', priority: 1 },
      ],
      reference: [{ id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955 }],
    },
    thermal: {
      optimalDirection: { min: 130, max: 200, ideal: 160 },
      optimalSpeed: { min: 2, max: 10, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['brown trout', 'rainbow trout', 'channel catfish', 'smallmouth bass'],
      secondary: [],
      blueRibbon: true,
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'high' },
  },

  'provo-lower': {
    id: 'provo-lower',
    name: 'Lower Provo River',
    shortName: 'Lower Provo',
    region: 'Utah / Wasatch',
    coordinates: { lat: 40.3340, lng: -111.6105 },
    elevation: 5500,
    primaryWindType: 'Canyon/Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Olmstead Diversion to Utah Lake — trophy tailwater below Deer Creek',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Valley pressure' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'CSC', name: 'Cascade Peak', elevation: 10875, role: 'Wasatch ridge', priority: 1 },
      ],
      groundTruth: { id: 'KPVU', name: 'Provo Municipal', role: 'Ground Truth — closest ASOS' },
      lakeshore: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Primary — Provo valley', priority: 1 },
        { id: 'UTDCD', name: 'US-189 Deer Creek Dam (UDOT)', elevation: 5400, role: 'Tailwater corridor', priority: 2 },
      ],
      reference: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495 },
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
      ],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 205 },
      optimalSpeed: { min: 2, max: 10, average: 4 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['brown trout', 'rainbow trout'],
      secondary: ['cutthroat trout', 'mountain whitefish'],
      blueRibbon: true,
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'high' },
  },

  'provo-middle': {
    id: 'provo-middle',
    name: 'Middle Provo River',
    shortName: 'Middle Provo',
    region: 'Wasatch County',
    coordinates: { lat: 40.5128, lng: -111.4640 },
    elevation: 5600,
    primaryWindType: 'Canyon/Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Jordanelle to Deer Creek — Heber Valley wade water',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure' },
        low: { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Valley pressure' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'High-elevation trigger', priority: 1 },
      ],
      groundTruth: { id: 'KHCR', name: 'Heber Valley Airport', role: 'Ground Truth' },
      lakeshore: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Primary', priority: 1 },
        { id: 'UTCHL', name: 'Charleston (UDOT)', elevation: 5500, role: 'Near Deer Creek inlet', priority: 2 },
      ],
      reference: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597 },
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
      ],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 205 },
      optimalSpeed: { min: 2, max: 10, average: 4 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['brown trout', 'rainbow trout'],
      secondary: ['mountain whitefish', 'cutthroat trout'],
      blueRibbon: true,
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'high' },
  },

  'provo-upper': {
    id: 'provo-upper',
    name: 'Upper Provo River',
    shortName: 'Upper Provo',
    region: 'Wasatch County',
    coordinates: { lat: 40.567, lng: -111.358 },
    elevation: 6600,
    primaryWindType: 'Mountain/Westerly',
    thermalDirection: 'W to SW (240-270°)',
    description: 'Woodland / Pine Valley — smaller water above Jordanelle',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure' },
        low: { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Valley pressure' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'High-elevation trigger', priority: 1 },
      ],
      groundTruth: { id: 'KHCR', name: 'Heber Valley Airport', role: 'Ground Truth' },
      lakeshore: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Primary', priority: 1 },
      ],
      reference: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597 },
      ],
    },
    thermal: {
      optimalDirection: { min: 240, max: 270, ideal: 255 },
      optimalSpeed: { min: 2, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 46,
    fishSpecies: {
      primary: ['brown trout', 'cutthroat trout', 'rainbow trout'],
      secondary: [],
      blueRibbon: false,
    },
    glassWindow: { typicalStart: 6, typicalEnd: 11, confidence: 'medium' },
  },
};

utahRiverConfigs['green-river'] = utahRiverConfigs['green-a'];
utahRiverConfigs['lower-provo'] = utahRiverConfigs['provo-lower'];
utahRiverConfigs['middle-provo'] = utahRiverConfigs['provo-middle'];
utahRiverConfigs['provo-river'] = utahRiverConfigs['provo-lower'];
