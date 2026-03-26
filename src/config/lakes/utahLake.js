// Utah Lake and Utah County region stations

export const utahLakeConfigs = {
  // =====================================================
  // UTAH LAKE - 5 LAUNCH LOCATIONS (South to North)
  // =====================================================
  
  'utah-lake-lincoln': {
    id: 'utah-lake-lincoln',
    name: 'Lincoln Beach',
    shortName: 'Lincoln',
    region: 'Utah Lake - South',
    // Lincoln Beach - south end of Utah Lake
    coordinates: { lat: 40.14371515780893, lng: -111.80194831196697 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (135-165°)',
    description: 'Southernmost launch - Classic SE lake thermal',
    
    // safeWindArc: [start, end] read clockwise — rideable wind window
    // Lincoln wraps around a point. Safe from West (270) through North (0) to East (90).
    safeWindArc: [270, 90],
    shoreFacing: 315,
    kiting: {
      onshore: { min: 45, max: 135 },
      sideOn: { min: 135, max: 200, min2: 15, max2: 45 },
      sideOffshore: { min: 330, max: 15 },
      offshore: { min: 225, max: 330 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'KPVU',
        name: 'Provo Municipal Airport',
        role: 'Ground Truth - Best indicator for southern launches',
      },
      
      // Spanish Fork Canyon early indicator
      // When QSF shows SE wind > 6 mph, thermal at Utah Lake likely in ~2 hours
      earlyIndicator: {
        id: 'QSF',
        name: 'Spanish Fork',
        elevation: 4550,
        coordinates: { lat: 40.115, lng: -111.655 },
        role: 'Early Warning - SE wind here precedes Utah Lake thermal by ~2 hours',
        leadTimeMinutes: 120,
        trigger: {
          direction: { min: 100, max: 180, label: 'SE' },
          speed: { min: 6, optimal: 7.5 },
        },
        statistics: {
          seDirectionOnGoodDays: 97,
          avgSpeedOnGoodDays: 7.6,
          accuracy: 62.5,
        },
      },
      
      lakeshore: [
        { 
          id: 'KPVU', 
          name: 'Provo Municipal Airport',
          elevation: 4495,
          role: 'Primary indicator - closest to Lincoln Beach',
          priority: 1
        },
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Secondary - good for SE thermal only',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'FPS', name: 'Flight Park South', elevation: 5202 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      northFlow: { min: 315, max: 45, ideal: 360 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },

  'utah-lake-sandy': {
    id: 'utah-lake-sandy',
    name: 'Sandy Beach',
    shortName: 'Sandy',
    region: 'Utah Lake - South-Central',
    // Sandy Beach - south-central Utah Lake
    coordinates: { lat: 40.17049661378955, lng: -111.74571902175627 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (130-160°)',
    description: 'South-Central launch - SE thermal',
    
    // Sandy Beach south shore. Safe from West (270) through North (0) to East (90).
    safeWindArc: [270, 90],
    shoreFacing: 0,
    kiting: {
      onshore: { min: 55, max: 145 },
      sideOn: { min: 145, max: 210, min2: 20, max2: 55 },
      sideOffshore: { min: 335, max: 20 },
      offshore: { min: 235, max: 335 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'KPVU',
        name: 'Provo Municipal Airport',
        role: 'Ground Truth - Best indicator for southern launches',
      },
      
      lakeshore: [
        { 
          id: 'KPVU', 
          name: 'Provo Municipal Airport',
          elevation: 4495,
          role: 'Primary indicator - closest to Sandy Beach',
          priority: 1
        },
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Secondary - good for SE thermal only',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'FPS', name: 'Flight Park South', elevation: 5202 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 130, max: 160, ideal: 145 },
      northFlow: { min: 315, max: 45, ideal: 360 },
      optimalSpeed: { min: 8, max: 18, average: 10 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },

  'utah-lake-vineyard': {
    id: 'utah-lake-vineyard',
    name: 'Vineyard',
    shortName: 'Vineyard',
    region: 'Utah Lake - Central',
    // Vineyard Beach - EAST side of Utah Lake (water is to the WEST)
    coordinates: { lat: 40.31765814163484, lng: -111.76473863107265 },
    elevation: 4489,
    
    primaryWindType: 'S/SSW/W Thermal',
    thermalDirection: 'S to W (180-270°)',
    description: 'East shore launch - S, SSW, W winds are onshore. SE is OFFSHORE!',
    
    // Vineyard east shore. Safe from South (180) through West (270) to North (360).
    safeWindArc: [180, 360],
    shoreFacing: 270,
    kiting: {
      onshore: { min: 225, max: 315 },
      sideOn: { min: 180, max: 225, min2: 315, max2: 360 },
      sideOffshore: { min: 0, max: 45 },
      offshore: { min: 90, max: 180 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'High elevation reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Your PWS',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator',
          priority: 1
        },
        { 
          id: 'QLN', 
          name: 'Lindon',
          elevation: 4738,
          role: 'East shore reference',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
    },
    
    thermal: {
      // S, SSW, W are good for Vineyard (onshore/side-on from east shore)
      // SE is OFFSHORE and dangerous!
      optimalDirection: { min: 180, max: 270, ideal: 225 }, // S to W, ideal SSW
      optimalSpeed: { min: 6, max: 16, average: 9 },
      peakHours: { start: 10, end: 14, peak: 12 },
      buildTime: { start: 6, usable: 9 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },

  'utah-lake-zigzag': {
    id: 'utah-lake-zigzag',
    name: 'Zig Zag',
    shortName: 'Zig Zag',
    region: 'Utah Lake - North-Central',
    // Zig Zag - next to El Naughtica boat club, Saratoga Springs
    coordinates: { lat: 40.30268164473557, lng: -111.8799503518146 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (135-165°)',
    description: 'Your home launch - Classic SE thermal at Zig Zag',
    
    // Zig Zag west shore. Safe from North (0) through East (90) to South (180).
    safeWindArc: [0, 180],
    shoreFacing: 90,
    kiting: {
      onshore: { min: 45, max: 135 },
      sideOn: { min: 135, max: 200, min2: 15, max2: 45 },
      sideOffshore: { min: 315, max: 15 },
      offshore: { min: 225, max: 315 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Your PWS at Zig Zag',
      },
      
      earlyIndicator: {
        id: 'QSF',
        name: 'Spanish Fork Canyon',
        elevation: 4550,
        coordinates: { lat: 40.115, lng: -111.655 },
        role: 'Early Warning - SE wind here precedes Zigzag thermal by ~90 min',
        leadTimeMinutes: 90,
        trigger: {
          direction: { min: 100, max: 180, label: 'SE' },
          speed: { min: 6, optimal: 7.5 },
        },
        statistics: {
          seDirectionOnGoodDays: 97,
          avgSpeedOnGoodDays: 7.6,
          accuracy: 62.5,
        },
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator station',
          priority: 1
        },
        { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Valley floor reference',
          priority: 2
        },
        {
          id: 'UTPCR',
          name: 'Pioneer Crossing, Lehi (UDOT)',
          elevation: 4500,
          role: 'Close indicator — ~3mi from Zigzag',
          priority: 3
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'UTORM', name: 'I-15 Orem (UDOT)', elevation: 4500 },
        { id: 'UT7', name: 'Bluffdale I-15 (UDOT)', elevation: 4500 },
        { id: 'UTPRB', name: 'Porter Rockwell Blvd (UDOT)', elevation: 4500 },
        { id: 'UTRVT', name: 'SR-154 Riverton (UDOT)', elevation: 4500 },
        { id: 'UTLAK', name: 'SR-68 Mosida (UDOT)', elevation: 4500 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },

  'utah-lake-mm19': {
    id: 'utah-lake-mm19',
    name: 'Mile Marker 19',
    shortName: 'MM19',
    region: 'Utah Lake - North',
    // Mile Marker 19 - west side of Utah Lake
    coordinates: { lat: 40.19869601578235, lng: -111.88652790796455 },
    elevation: 4489,
    
    primaryWindType: 'SE/E Thermal',
    thermalDirection: 'SE to E (120-160°)',
    description: 'Northernmost launch - SE to East thermal',
    
    // MM19 north end. Safe from East (70) through South to West (250).
    safeWindArc: [70, 250],
    shoreOrientation: 160,
    kiting: {
      onshore: { min: 115, max: 205 },
      sideOn: { min: 205, max: 250, min2: 70, max2: 115 },
      offshore: { min: 295, max: 25 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Nearby PWS',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator',
          priority: 1
        },
        { 
          id: 'UTALP', 
          name: 'Point of the Mountain',
          elevation: 4796,
          role: 'North reference',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 120, max: 160, ideal: 140 },
      optimalSpeed: { min: 8, max: 18, average: 10 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },


  // Legacy ID for backwards compatibility
  'utah-lake': {
    id: 'utah-lake',
    name: 'Utah Lake (All)',
    shortName: 'Overview',
    region: 'Utah County',
    coordinates: { lat: 40.2369, lng: -111.7388 },
    elevation: 4489,
    
    primaryWindType: 'Variable',
    thermalDirection: 'Depends on launch',
    description: 'Overview of all Utah Lake conditions',
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Exact thermal arrival verification',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator station',
          priority: 1
        },
        { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Valley floor reference',
          priority: 2
        },
        { 
          id: 'QLN', 
          name: 'Lindon',
          elevation: 4738,
          role: 'East shore - lake breeze penetration',
          priority: 3
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['channel catfish', 'walleye', 'white bass', 'largemouth bass', 'black crappie'],
      secondary: ['yellow perch', 'bluegill', 'common carp'],
      native: ['June sucker (threatened — must release)'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        whiteBass: 'May–Jun (spawning run)',
        catfish: 'Jun–Sep',
        iceFishing: 'Dec–Feb (rare — shallow)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Utah Lake State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 9, confidence: 'high' },
  },


  // =====================================================
  // POINT OF THE MOUNTAIN — Paragliding (South Side)
  // =====================================================
  'potm-south': {
    id: 'potm-south',
    name: 'Point of the Mountain — South',
    shortName: 'PotM South',
    region: 'Utah County',
    coordinates: { lat: 40.445, lng: -111.915 },
    elevation: 4900,
    primaryWindType: 'South Thermal / Ridge Soaring',
    thermalDirection: 'ESE to WSW (110-250°)',
    description: '#1 US training site — 300 ft vertical, south-facing ridge flies any southerly wind',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Local valley reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'FPS', name: 'Flight Park South', elevation: 4970, role: 'ON-SITE wind station', priority: 1 },
      ],
      groundTruth: { id: 'FPS', name: 'Flight Park South', role: 'Ground Truth — on-site' },
      earlyIndicator: {
        id: 'QSF',
        name: 'Spanish Fork Canyon',
        elevation: 4550,
        role: 'Early Warning - SE wind here precedes FPS by ~120 min',
        leadTimeMinutes: 120,
        trigger: {
          direction: { min: 100, max: 180, label: 'SE' },
          speed: { min: 6, optimal: 7.5 },
        },
      },
      lakeshore: [
        { id: 'FPS', name: 'Flight Park South', elevation: 4970, role: 'Primary — on-site', priority: 1 },
        { id: 'UTPCR', name: 'Pioneer Crossing, Lehi (UDOT)', elevation: 4500, role: 'South-side approach indicator', priority: 2 },
      ],
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'UTPCR', name: 'Pioneer Crossing, Lehi (UDOT)', elevation: 4500 },
      ],
    },
    thermal: {
      optimalDirection: { min: 110, max: 250, ideal: 170 },
      optimalSpeed: { min: 5, max: 20, average: 10 },
      peakHours: { start: 7, end: 15, peak: 10 },
      buildTime: { start: 6, usable: 7 },
      fadeTime: { start: 15, end: 18 },
    },
  },


  // =====================================================
  // INSPIRATION POINT — Paragliding (Uintah NF)
  // =====================================================
  'inspo': {
    id: 'inspo',
    name: 'Inspiration Point',
    shortName: 'Inspo',
    region: 'Utah County',
    coordinates: { lat: 40.300, lng: -111.640 },
    elevation: 6667,
    primaryWindType: 'Mountain Thermal',
    thermalDirection: 'W to SW (220-280°)',
    description: 'P3/H3+ required — high-altitude mountain thermals, restricted LZs',
    stations: {
      pressure: {
        high: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Valley reference' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Nearest ASOS' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KPVU', name: 'Provo Municipal', role: 'Ground Truth — distant valley' },
      lakeshore: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Primary (valley)', priority: 1 },
      ],
      reference: [{ id: 'KPVU', name: 'Provo Municipal', elevation: 4495 }],
    },
    thermal: {
      optimalDirection: { min: 220, max: 280, ideal: 250 },
      optimalSpeed: { min: 5, max: 15, average: 8 },
      peakHours: { start: 11, end: 16, peak: 13 },
      buildTime: { start: 10, usable: 11 },
      fadeTime: { start: 16, end: 18 },
    },
  },


  // =====================================================
  // WEST MOUNTAIN — Paragliding
  // =====================================================
  'west-mountain': {
    id: 'west-mountain',
    name: 'West Mountain',
    shortName: 'West Mtn',
    region: 'Utah County',
    coordinates: { lat: 40.100, lng: -111.800 },
    elevation: 5500,
    primaryWindType: 'Lake Thermal / Ridge Soaring',
    thermalDirection: 'W to NW (260-330°)',
    description: 'South of Utah Lake — large open LZs, 7-10 min flights, good for XC intro',
    stations: {
      pressure: {
        high: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Valley reference' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Nearest ASOS' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KPVU', name: 'Provo Municipal', role: 'Ground Truth — valley' },
      lakeshore: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Primary (valley)', priority: 1 },
      ],
      reference: [{ id: 'KPVU', name: 'Provo Municipal', elevation: 4495 }],
    },
    thermal: {
      optimalDirection: { min: 260, max: 330, ideal: 290 },
      optimalSpeed: { min: 5, max: 15, average: 8 },
      peakHours: { start: 11, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
  },
};
