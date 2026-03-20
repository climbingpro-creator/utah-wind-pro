// Northern Utah — Weber, Cache, Morgan, Rich County stations

export const northernUtahConfigs = {

  // =====================================================
  // PINEVIEW RESERVOIR
  // =====================================================

  'pineview': {
    id: 'pineview',
    name: 'Pineview Reservoir',
    region: 'Weber County',
    coordinates: { lat: 41.2697, lng: -111.8208 },
    elevation: 4900,
    
    primaryWindType: 'East/West Canyon',
    thermalDirection: 'Variable - canyon dependent',
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'Valley pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        {
          id: 'OGP',
          name: 'Ogden Peak (Snowbasin)',
          elevation: 9570,
          role: 'PRIMARY - High-elevation trigger',
          priority: 1
        },
        { 
          id: 'BLPU1', 
          name: 'Ben Lomond Peak',
          elevation: 7688,
          role: 'Northern ridge reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'COOPOGNU1',
        name: 'Pineview Dam',
        role: 'Ground Truth - Dam area thermal indicator',
      },
      
      lakeshore: [
        {
          id: 'COOPOGNU1',
          name: 'Pineview Dam',
          elevation: 4940,
          role: 'Primary - at reservoir',
          priority: 1
        },
        {
          id: 'PC496',
          name: 'Pineview Reservoir',
          elevation: 4956,
          role: 'Reservoir station',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTHUN', name: 'Huntsville', elevation: 4951 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 240, max: 300, ideal: 270 }, // West for canyon
      optimalSpeed: { min: 5, max: 12, average: 7 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['largemouth bass', 'smallmouth bass', 'yellow perch', 'black crappie'],
      secondary: ['channel catfish', 'bluegill', 'tiger muskie'],
      blueRibbon: false,
      bestSeasons: {
        bass: 'May–Sep',
        crappie: 'Apr–May, Oct',
        perch: 'Year-round, best through ice',
        iceFishing: 'Dec–Feb (perch, crappie)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },


  // =====================================================
  // BEAR LAKE
  // =====================================================
  'bear-lake': {
    id: 'bear-lake',
    name: 'Bear Lake',
    shortName: 'Bear Lake',
    region: 'Rich County',
    coordinates: { lat: 41.950, lng: -111.330 },
    elevation: 5924,
    surfaceAcres: 69000,
    maxDepth: 208,
    primaryWindType: 'Strong Westerly / Thermal',
    thermalDirection: 'W to NW (250-320°)',
    description: 'The Caribbean of the Rockies — HIGH WIND HAZARD, strong afternoon thermals',
    stations: {
      pressure: {
        high: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Western pressure reference' },
        low: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Nearest ASOS (45+ mi)' },
        bustThreshold: 3.0,
      },
      ridge: [
        { id: 'BERU1', name: 'Bear River RAWS', elevation: 6200, role: 'Closest automated station', priority: 1 },
      ],
      groundTruth: { id: 'BERU1', name: 'Bear River RAWS', role: 'Ground Truth — nearest to lake' },
      lakeshore: [
        { id: 'BERU1', name: 'Bear River RAWS', elevation: 6200, role: 'Primary — Bear River drainage', priority: 1 },
        { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Regional ASOS (distant)', priority: 2 },
      ],
      reference: [{ id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457 }],
    },
    thermal: {
      optimalDirection: { min: 250, max: 320, ideal: 280 },
      optimalSpeed: { min: 5, max: 20, average: 10 },
      peakHours: { start: 11, end: 16, peak: 14 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 48,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'lake trout (mackinaw)', 'rainbow trout'],
      secondary: ['mountain whitefish', 'yellow perch'],
      endemic: ['Bonneville cisco', 'Bonneville whitefish', 'Bear Lake whitefish', 'Bear Lake sculpin'],
      blueRibbon: false,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        lakeTrout: 'Year-round (deep jigging), best Nov–Mar',
        cisco: 'January (dipnetting — special season)',
        iceFishing: 'Jan–Mar (cutthroat, lake trout)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Bear Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
    windHazard: 'HIGH — sudden afternoon thermals, 20+ mile fetch creates dangerous swells',
  },


  // =====================================================
  // EAST CANYON RESERVOIR
  // =====================================================
  'east-canyon': {
    id: 'east-canyon',
    name: 'East Canyon Reservoir',
    shortName: 'East Canyon',
    region: 'Morgan County',
    coordinates: { lat: 40.890, lng: -111.590 },
    elevation: 5700,
    surfaceAcres: 680,
    maxDepth: 120,
    primaryWindType: 'Canyon Channeled',
    thermalDirection: 'Variable — canyon corridor',
    description: 'Mountain canyon reservoir — diverse trout and warmwater fishery',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Nearest ASOS (25+ mi)' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KSLC', name: 'Salt Lake City Intl', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Primary (distant)', priority: 1 },
      ],
      reference: [{ id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 270, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['rainbow trout', 'cutthroat trout', 'brown trout', 'smallmouth bass'],
      secondary: ['kokanee salmon', 'black crappie', 'wiper', 'tiger trout'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        kokanee: 'Jul–Aug',
        bass: 'Jun–Sep',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'East Canyon State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },


  // =====================================================
  // HYRUM RESERVOIR
  // =====================================================
  'hyrum': {
    id: 'hyrum',
    name: 'Hyrum Reservoir',
    shortName: 'Hyrum',
    region: 'Cache County',
    coordinates: { lat: 41.620, lng: -111.870 },
    elevation: 4670,
    surfaceAcres: 480,
    maxDepth: 50,
    primaryWindType: 'Valley Drainage',
    thermalDirection: 'S (170-210°)',
    description: 'Family fishing reservoir — stocked rainbow trout, panfish',
    stations: {
      pressure: {
        high: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Nearest ASOS (10 mi)' },
        low: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Cache Valley reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KLGU', name: 'Logan-Cache Airport', role: 'Ground Truth — 10 miles' },
      lakeshore: [
        { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Primary — close', priority: 1 },
      ],
      reference: [{ id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457 }],
    },
    thermal: {
      optimalDirection: { min: 170, max: 210, ideal: 190 },
      optimalSpeed: { min: 3, max: 10, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 55,
    fishSpecies: {
      primary: ['rainbow trout', 'yellow perch', 'bluegill'],
      secondary: ['green sunfish'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Oct',
        panfish: 'May–Aug',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Hyrum State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 11, confidence: 'high' },
  },


  // =====================================================
  // POWDER MOUNTAIN — Snowkiting
  // =====================================================
  'powder-mountain': {
    id: 'powder-mountain',
    name: 'Powder Mountain',
    shortName: 'Pow Mow',
    region: 'Weber County',
    coordinates: { lat: 41.380, lng: -111.780 },
    elevation: 8900,
    primaryWindType: 'Mountain Thermal / Frontal',
    thermalDirection: 'S to W (180-270°)',
    description: 'High elevation snowkite — wind exposure from Hidden Lake to the Towers',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Basin reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KSLC', name: 'Salt Lake City Intl', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Primary (distant)', priority: 1 },
      ],
      reference: [{ id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 270, ideal: 225 },
      optimalSpeed: { min: 5, max: 20, average: 10 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 10 },
      fadeTime: { start: 17, end: 19 },
    },
  },


  // =====================================================
  // MONTE CRISTO — Snowkiting
  // =====================================================
  'monte-cristo': {
    id: 'monte-cristo',
    name: 'Monte Cristo',
    shortName: 'Monte Cristo',
    region: 'Weber County',
    coordinates: { lat: 41.450, lng: -111.500 },
    elevation: 8900,
    primaryWindType: 'Mountain Pass / Frontal',
    thermalDirection: 'W to NW (250-320°)',
    description: 'Backcountry bowls — requires hike/snowmobile 1/4+ mile in, expert terrain',
    stations: {
      pressure: {
        high: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Regional reference' },
        low: { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Nearest ASOS' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KLGU', name: 'Logan-Cache Airport', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457, role: 'Primary (distant)', priority: 1 },
      ],
      reference: [{ id: 'KLGU', name: 'Logan-Cache Airport', elevation: 4457 }],
    },
    thermal: {
      optimalDirection: { min: 250, max: 320, ideal: 280 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 10 },
      fadeTime: { start: 17, end: 19 },
    },
  },
};
