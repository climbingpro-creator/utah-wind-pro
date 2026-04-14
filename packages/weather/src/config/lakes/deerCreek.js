// Deer Creek Reservoir (Wasatch County)

export const deerCreekConfigs = {
  'deer-creek': {
    id: 'deer-creek',
    name: 'Deer Creek',
    shortName: 'Deer Creek',
    region: 'Wasatch County', 
    // Deer Creek Reservoir - kite launch on the north shore
    coordinates: { lat: 40.45830163741306, lng: -111.47407868398149 },
    elevation: 5400,
    
    primaryWindType: 'SSW-WSW Thermal / Canyon',
    thermalDirection: 'SSW-WSW (170-260°)',
    description: 'Canyon thermal fans SSW-WSW at the beach - Arrowhead is key trigger',
    
    // Deer Creek main. S to SW flow only (160-240°).
    safeWindArc: [160, 240],
    shoreFacing: 225,
    kiting: {
      onshore: { min: 135, max: 225 },
      sideOn: { min: 225, max: 270, min2: 90, max2: 135 },
      offshore: { min: 315, max: 45 },
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
        id: 'TEMPEST_DC',
        name: 'Barbed Wire Beach (Tempest)',
        role: 'Ground Truth - on-beach Tempest station (north shore kite launch)',
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
          id: 'TEMPEST_DC',
          name: 'Barbed Wire Beach (Tempest)',
          elevation: 5420,
          role: 'Primary - on-beach Tempest station (1-min resolution)',
          priority: 1
        },
        { 
          id: 'UTDCD', 
          name: 'US-189 Deer Creek Dam (UDOT)',
          elevation: 5400,
          role: 'Secondary - dam/canyon mouth reference',
          priority: 2
        },
        { 
          id: 'UTCHL', 
          name: 'Charleston (UDOT)',
          elevation: 5500,
          role: 'Mid-chain - Heber Valley near reservoir',
          priority: 3
        },
        { 
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Charleston area reference',
          priority: 4
        },
        {
          id: 'UTPCY',
          name: 'Provo Canyon MP10',
          elevation: 5119,
          role: 'Canyon mouth - thermal draw indicator',
          priority: 5
        }
      ],
      
      reference: [
        { id: 'MDAU1', name: 'Midway', elevation: 5758 },
        { id: 'UTLPC', name: 'Lower Provo Canyon (UDOT)', elevation: 5100 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 170, max: 260, ideal: 230 },
      optimalSpeed: { min: 4, max: 15, average: 8.0 },
      peakHours: { start: 14, end: 16, peak: 15 },
      buildTime: { start: 10, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    
    // Critical requirement
    requirement: 'SSW-WSW wind (170-260°) — canyon thermal fans out at the beach',
    
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
