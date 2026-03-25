// Deer Creek Reservoir (Wasatch County)

export const deerCreekConfigs = {
  'deer-creek': {
    id: 'deer-creek',
    name: 'Deer Creek',
    shortName: 'Deer Creek',
    region: 'Wasatch County', 
    // Deer Creek Reservoir - main launch near the dam
    coordinates: { lat: 40.4097, lng: -111.5097 },
    elevation: 5400,
    
    primaryWindType: 'SW Thermal / Canyon',
    thermalDirection: 'South (170-210°)',
    description: 'Canyon thermal from the south - Arrowhead is key trigger',
    
    shoreOrientation: 180, // Shore faces South
    kiting: {
      onshore: { min: 135, max: 225 },    // SE to SW - wind from water
      sideOn: { min: 225, max: 270, min2: 90, max2: 135 },
      offshore: { min: 315, max: 45 },     // NW to NE - DANGEROUS
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
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Local valley pressure',
        },
        bustThreshold: 2.0,
      },
      
      // ELEVATION DELTA - Arrowhead is THE key station for Deer Creek
      ridge: [
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'PRIMARY - High-elevation trigger for Deer Creek thermal',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'UTDCD',
        name: 'US-189 Deer Creek Dam (UDOT)',
        role: 'Ground Truth - Dam/Chute thermal indicator (replaced dead DCC)',
      },
      
      earlyIndicator: {
        id: 'UTLPC',
        name: 'Lower Provo Canyon (UDOT)',
        elevation: 5100,
        role: 'Early Warning - canyon thermal draw precedes Deer Creek by ~60 min',
        leadTimeMinutes: 60,
        trigger: {
          direction: { min: 170, max: 220, label: 'S' },
          speed: { min: 4, optimal: 6 },
        },
      },
      
      lakeshore: [
        { 
          id: 'UTDCD', 
          name: 'US-189 Deer Creek Dam (UDOT)',
          elevation: 5400,
          role: 'Primary - at reservoir (replaced dead DCC)',
          priority: 1
        },
        { 
          id: 'UTCHL', 
          name: 'Charleston (UDOT)',
          elevation: 5500,
          role: 'Mid-chain - Heber Valley near reservoir',
          priority: 2
        },
        { 
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Charleston area reference',
          priority: 3
        },
        {
          id: 'UTPCY',
          name: 'Provo Canyon MP10',
          elevation: 5119,
          role: 'Canyon mouth - thermal draw indicator',
          priority: 4
        }
      ],
      
      reference: [
        { id: 'MDAU1', name: 'Midway', elevation: 5758 },
        { id: 'UTLPC', name: 'Lower Provo Canyon (UDOT)', elevation: 5100 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 170, max: 210, ideal: 185 },
      optimalSpeed: { min: 4, max: 12, average: 5.5 },
      peakHours: { start: 13, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    
    // Critical requirement
    requirement: 'MUST have South wind (170-210°) - canyon only works with S flow',
    
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['rainbow trout', 'smallmouth bass', 'largemouth bass', 'walleye', 'brown trout'],
      secondary: ['yellow perch', 'bluegill', 'channel catfish'],
      blueRibbon: true,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        walleye: 'Mar–May, Oct–Nov',
        bass: 'Jun–Sep',
        iceFishing: 'Dec–Feb (trout, perch)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Deer Creek State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'high' },
  },
};
