// Willard Bay (Box Elder County)

export const willardBayConfigs = {
  'willard-bay': {
    id: 'willard-bay',
    name: 'Willard Bay',
    shortName: 'Willard',
    region: 'Box Elder County',
    coordinates: { lat: 41.3686, lng: -112.0772 },
    elevation: 4200,
    
    primaryWindType: 'South Flow',
    thermalDirection: 'S to SW (170-220°)',
    description: 'South beach near state park — kitable under south flow',
    
    shoreOrientation: 180, // South beach faces south
    kiting: {
      onshore: { min: 135, max: 225 },    // SE to SW - onshore to south beach
      sideOn: { min: 225, max: 270, min2: 90, max2: 135 },
      offshore: { min: 315, max: 45 },     // NW to NE - offshore from south beach
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Southern pressure reference',
        },
        low: { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'Local Ogden pressure',
        },
        bustThreshold: 2.0,
      },
      
      // Hill AFB or Ben Lomond for high elevation trigger
      ridge: [
        { 
          id: 'BLPU1', 
          name: 'Ben Lomond Peak',
          elevation: 7688,
          role: 'PRIMARY - High-elevation trigger for south flow',
          priority: 1
        },
        {
          id: 'KHIF',
          name: 'Hill Air Force Base',
          elevation: 4783,
          role: 'Military weather station - reliable data',
          priority: 2
        },
        {
          id: 'OGP',
          name: 'Mount Ogden',
          elevation: 9570,
          role: 'Highest Wasatch peak in area',
          priority: 3
        },
      ],
      
      groundTruth: {
        id: 'UR328',
        name: 'Willard Bay South',
        role: 'Ground Truth - South beach wind indicator',
      },
      
      lakeshore: [
        {
          id: 'UR328',
          name: 'Willard',
          elevation: 4253,
          role: 'Primary - closest to bay',
          priority: 1
        },
        { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'South reference',
          priority: 2
        },
        { 
          id: 'KBMC', 
          name: 'Brigham City Regional',
          elevation: 4230,
          role: 'North reference',
          priority: 3
        },
      ],
      
      reference: [
        { id: 'GSLM', name: 'Great Salt Lake Minerals', elevation: 4212 },
        { id: 'UTANT', name: 'I-15 Antelope Drive (UDOT)', elevation: 4300 },
        { id: 'UTFRW', name: 'I-15 Farr West (UDOT)', elevation: 4400 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 170, max: 220, ideal: 195 },
      optimalSpeed: { min: 6, max: 15, average: 8 },
      peakHours: { start: 12, end: 15, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 16, end: 18 },
    },
    
    waterTempEstimate: 55,
    fishSpecies: {
      primary: ['wiper', 'walleye', 'channel catfish', 'crappie'],
      secondary: ['smallmouth bass', 'largemouth bass', 'bluegill', 'yellow perch'],
      blueRibbon: false,
      bestSeasons: {
        wiper: 'May–Sep (surface feeding)',
        walleye: 'Mar–May, Oct',
        catfish: 'Jun–Sep',
        crappie: 'Apr–May, Oct',
        iceFishing: 'Jan–Feb (walleye, crappie)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Willard Bay State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },
};
