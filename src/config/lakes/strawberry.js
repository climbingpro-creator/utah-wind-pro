// Strawberry Reservoir stations

export const strawberryConfigs = {

  // =====================================================
  // STRAWBERRY RESERVOIR — 3 SNOWKITE LOCATIONS
  // =====================================================

  'strawberry-ladders': {
    id: 'strawberry-ladders',
    name: 'Ladders (NW)',
    shortName: 'Ladders',
    region: 'Strawberry Reservoir',
    coordinates: { lat: 40.1850, lng: -111.1600 },
    elevation: 7600,

    primaryWindType: 'W/NW Frontal',
    thermalDirection: 'W to NW (260-340°)',
    description: 'Primary snowkite launch — shallow water, best access from marina road',

    shoreOrientation: 315, // Shore faces NW
    kiting: {
      onshore: { min: 270, max: 350 },       // W to NNW — wind from water
      sideOn: { min: 350, max: 45, min2: 225, max2: 270 },
      sideOffshore: { min: 90, max: 135 },   // E-SE — side-off
      offshore: { min: 135, max: 225 },       // SE to SW — offshore
    },

    stations: {
      pressure: {
        high: {
          id: 'KSLC',
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir-level pressure reference',
        },
        bustThreshold: 2.5,
      },

      ridge: [
        {
          id: 'CCPUT',
          name: 'Currant Creek Peak (USFS)',
          elevation: 10547,
          role: 'Primary high ridge reference',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'Pass-level ridge reference',
          priority: 2,
        },
        {
          id: 'UTDAN',
          name: 'US-40 Daniels Summit (UDOT)',
          elevation: 8000,
          role: 'Chain node — between Heber and Co-Op Creek',
          priority: 3,
        },
      ],

      groundTruth: {
        id: 'UTCOP',
        name: 'US-40 at Co-Op Creek (UDOT)',
        role: 'Ground Truth — closest station to reservoir',
      },

      lakeshore: [
        {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Primary — closest to reservoir NW shore',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'High-elevation snow/wind reference',
          priority: 2,
        },
        {
          id: 'UTHEB',
          name: 'Heber (UDOT)',
          elevation: 5600,
          role: 'Mid-chain — between KPVU and Daniels Summit',
          priority: 3,
        },
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'UTHEB', name: 'Heber (UDOT)', elevation: 5600 },
      ],
    },

    thermal: {
      optimalDirection: { min: 260, max: 340, ideal: 300 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
    waterTempEstimate: 34,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'rainbow trout (sterile)', 'kokanee salmon'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        rainbow: 'Year-round',
        kokanee: 'Jul–Sep (trolling)',
        iceFishing: 'Dec–Mar (popular — thick ice at 7,600 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'medium' },
  },

  'strawberry-bay': {
    id: 'strawberry-bay',
    name: 'Strawberry Bay',
    shortName: 'Straw Bay',
    region: 'Strawberry Reservoir',
    coordinates: { lat: 40.1750, lng: -111.1800 },
    elevation: 7600,

    primaryWindType: 'W/SW Frontal',
    thermalDirection: 'W to SW (220-280°)',
    description: 'West bay near marina — good parking and access, moderate fetch',

    shoreOrientation: 270, // Shore faces West
    kiting: {
      onshore: { min: 225, max: 315 },       // SW to NW — wind from water
      sideOn: { min: 315, max: 360, min2: 180, max2: 225 },
      sideOffshore: { min: 45, max: 90 },    // NE to E — side-off
      offshore: { min: 90, max: 180 },        // E to S — offshore
    },

    stations: {
      pressure: {
        high: {
          id: 'KSLC',
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir-level pressure reference',
        },
        bustThreshold: 2.5,
      },

      ridge: [
        {
          id: 'CCPUT',
          name: 'Currant Creek Peak (USFS)',
          elevation: 10547,
          role: 'Primary high ridge reference',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'Pass-level ridge reference',
          priority: 2,
        },
      ],

      groundTruth: {
        id: 'UTCOP',
        name: 'US-40 at Co-Op Creek (UDOT)',
        role: 'Ground Truth — closest station to reservoir',
      },

      lakeshore: [
        {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Primary — closest to reservoir west shore',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'High-elevation snow/wind reference',
          priority: 2,
        },
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'UTDAN', name: 'US-40 Daniels Summit (UDOT)', elevation: 8000 },
        { id: 'UTHEB', name: 'Heber (UDOT)', elevation: 5600 },
      ],
    },

    thermal: {
      optimalDirection: { min: 220, max: 280, ideal: 250 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
    waterTempEstimate: 34,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'rainbow trout (sterile)', 'kokanee salmon'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        rainbow: 'Year-round',
        kokanee: 'Jul–Sep (trolling)',
        iceFishing: 'Dec–Mar (popular — thick ice at 7,600 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'medium' },
  },

  'strawberry-soldier': {
    id: 'strawberry-soldier',
    name: 'Soldier Creek',
    shortName: 'Soldier Ck',
    region: 'Strawberry Reservoir',
    coordinates: { lat: 40.1200, lng: -111.1000 },
    elevation: 7600,

    primaryWindType: 'S/SW Channeled',
    thermalDirection: 'S to SW (180-240°)',
    description: 'South end near dam — channeled wind from Soldier Creek canyon',

    shoreOrientation: 180, // Shore faces South
    kiting: {
      onshore: { min: 135, max: 225 },       // SE to SW — wind from water
      sideOn: { min: 225, max: 270, min2: 90, max2: 135 },
      sideOffshore: { min: 330, max: 20 },   // NNW to NNE — side-off
      offshore: { min: 315, max: 45 },        // NW to NE — offshore
    },

    stations: {
      pressure: {
        high: {
          id: 'KSLC',
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir-level pressure reference',
        },
        bustThreshold: 2.5,
      },

      ridge: [
        {
          id: 'CCPUT',
          name: 'Currant Creek Peak (USFS)',
          elevation: 10547,
          role: 'Primary high ridge reference',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'Pass-level ridge reference',
          priority: 2,
        },
      ],

      groundTruth: {
        id: 'RVZU1',
        name: 'Rays Valley RAWS',
        role: 'Ground Truth — south side closest station',
      },

      lakeshore: [
        {
          id: 'RVZU1',
          name: 'Rays Valley RAWS',
          elevation: 7273,
          role: 'Primary — south side nearest station',
          priority: 1,
        },
        {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir NW reference',
          priority: 2,
        },
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'DSTU1', name: 'Daniels-Strawberry SNOTEL', elevation: 8007 },
        { id: 'UTSLD', name: 'Soldier Summit (UDOT)', elevation: 7400 },
        { id: 'UTHEB', name: 'Heber (UDOT)', elevation: 5600 },
      ],
    },

    thermal: {
      optimalDirection: { min: 180, max: 240, ideal: 210 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
    waterTempEstimate: 34,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'rainbow trout (sterile)', 'kokanee salmon'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        rainbow: 'Year-round',
        kokanee: 'Jul–Sep (trolling)',
        iceFishing: 'Dec–Mar (popular — thick ice at 7,600 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'medium' },
  },

  'strawberry-view': {
    id: 'strawberry-view',
    name: 'The View',
    shortName: 'The View',
    region: 'Strawberry Reservoir',
    coordinates: { lat: 40.1650, lng: -111.1100 },
    elevation: 7650,

    primaryWindType: 'W/NW Open Fetch',
    thermalDirection: 'W to NW (260-330°)',
    description: 'East-side overlook — long open fetch, exposed to full reservoir wind',

    shoreOrientation: 270, // Shore faces West toward open water
    kiting: {
      onshore: { min: 225, max: 315 },       // SW to NW — wind from water
      sideOn: { min: 315, max: 360, min2: 180, max2: 225 },
      sideOffshore: { min: 45, max: 90 },    // NE to E — side-off
      offshore: { min: 90, max: 180 },        // E to S — offshore
    },

    stations: {
      pressure: {
        high: {
          id: 'KSLC',
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir-level pressure reference',
        },
        bustThreshold: 2.5,
      },

      ridge: [
        {
          id: 'CCPUT',
          name: 'Currant Creek Peak (USFS)',
          elevation: 10547,
          role: 'Primary high ridge reference',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'Pass-level ridge reference',
          priority: 2,
        },
      ],

      groundTruth: {
        id: 'RVZU1',
        name: 'Rays Valley RAWS',
        role: 'Ground Truth — east/south side reference',
      },

      lakeshore: [
        {
          id: 'RVZU1',
          name: 'Rays Valley RAWS',
          elevation: 7273,
          role: 'Primary — south side nearest station',
          priority: 1,
        },
        {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir NW reference',
          priority: 2,
        },
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'DSTU1', name: 'Daniels-Strawberry SNOTEL', elevation: 8007 },
      ],
    },

    thermal: {
      optimalDirection: { min: 260, max: 330, ideal: 290 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
    waterTempEstimate: 34,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'rainbow trout (sterile)', 'kokanee salmon'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        rainbow: 'Year-round',
        kokanee: 'Jul–Sep (trolling)',
        iceFishing: 'Dec–Mar (popular — thick ice at 7,600 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'medium' },
  },

  'strawberry-river': {
    id: 'strawberry-river',
    name: 'The River',
    shortName: 'The River',
    region: 'Strawberry Reservoir',
    coordinates: { lat: 40.1450, lng: -111.1350 },
    elevation: 7600,

    primaryWindType: 'S/SW Channeled',
    thermalDirection: 'S to W (190-270°)',
    description: 'Strawberry River inlet — channeled wind along river corridor, sheltered terrain',

    shoreOrientation: 225, // Shore faces SW along river channel
    kiting: {
      onshore: { min: 180, max: 270 },       // S to W — wind up river channel
      sideOn: { min: 270, max: 315, min2: 135, max2: 180 },
      sideOffshore: { min: 0, max: 45 },     // N to NE — side-off
      offshore: { min: 45, max: 135 },        // NE to SE — offshore
    },

    stations: {
      pressure: {
        high: {
          id: 'KSLC',
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir-level pressure reference',
        },
        bustThreshold: 2.5,
      },

      ridge: [
        {
          id: 'CCPUT',
          name: 'Currant Creek Peak (USFS)',
          elevation: 10547,
          role: 'Primary high ridge reference',
          priority: 1,
        },
        {
          id: 'DSTU1',
          name: 'Daniels-Strawberry SNOTEL',
          elevation: 8007,
          role: 'Pass-level ridge reference',
          priority: 2,
        },
      ],

      groundTruth: {
        id: 'RVZU1',
        name: 'Rays Valley RAWS',
        role: 'Ground Truth — nearest to river inlet',
      },

      lakeshore: [
        {
          id: 'RVZU1',
          name: 'Rays Valley RAWS',
          elevation: 7273,
          role: 'Primary — south side nearest station',
          priority: 1,
        },
        {
          id: 'UTCOP',
          name: 'US-40 at Co-Op Creek (UDOT)',
          elevation: 7637,
          role: 'Reservoir NW reference',
          priority: 2,
        },
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'UTDAN', name: 'US-40 Daniels Summit (UDOT)', elevation: 8000 },
      ],
    },

    thermal: {
      optimalDirection: { min: 190, max: 270, ideal: 230 },
      optimalSpeed: { min: 8, max: 25, average: 14 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
    waterTempEstimate: 34,
    fishSpecies: {
      primary: ['cutthroat trout (Bear Lake strain)', 'rainbow trout (sterile)', 'kokanee salmon'],
      secondary: [],
      blueRibbon: true,
      bestSeasons: {
        cutthroat: 'May–Jun, Sep–Oct',
        rainbow: 'Year-round',
        kokanee: 'Jul–Sep (trolling)',
        iceFishing: 'Dec–Mar (popular — thick ice at 7,600 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'medium' },
  },
};
