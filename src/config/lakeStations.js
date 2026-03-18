/**
 * UTAH LAKE WIND PRO - Station Configuration
 * 
 * Based on local knowledge and thermal dynamics:
 * 
 * | Feature      | Primary Wind Type        | High-Elevation Trigger | Low-Elevation Indicator |
 * |--------------|--------------------------|------------------------|-------------------------|
 * | Utah Lake    | Prefrontal / North Flow  | SLC Airport (Pressure) | Saratoga Springs PWS    |
 * | Deer Creek   | SW Thermal / Canyon      | Arrowhead (8,252 ft)   | Charleston or Dam Chute |
 * | Willard Bay  | North Thermal / "The Gap"| Hill AFB or Ben Lomond | Willard Bay North       |
 * | Pineview     | East/West Canyon         | Ogden Peak             | Pineview Dam            |
 * 
 * PREDICTION MODEL:
 * Step A: Gradient Check - ΔP (SLC - Provo) > 2.0mb = North flow override
 * Step B: Elevation Delta - High station temp vs lakeshore = thermal pump indicator
 * Step C: Ground Truth - PWS verifies exact thermal arrival, correlate with 2hr prior pattern
 */

export const LAKE_CONFIGS = {
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
    
    // Shore orientation for kite safety (direction shore faces - perpendicular to waterline)
    // Lincoln Beach faces roughly East (shore runs N-S, water is to the East)
    shoreOrientation: 90, // Shore faces East
    kiting: {
      onshore: { min: 45, max: 135 },        // NE to SE — wind from water, safest
      sideOn: { min: 135, max: 200, min2: 15, max2: 45 }, // SE-SSW and NNE-NE
      sideOffshore: { min: 330, max: 15 },   // NNW to NNE — north wind, kitable with skill
      offshore: { min: 225, max: 330 },       // SW to NNW — true offshore, DANGEROUS
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
    
    shoreOrientation: 100, // Shore faces ESE
    kiting: {
      onshore: { min: 55, max: 145 },        // ENE to SE — wind from water, safest
      sideOn: { min: 145, max: 210, min2: 20, max2: 55 }, // SE-SSW and NNE-ENE
      sideOffshore: { min: 335, max: 20 },   // NNW to NNE — north wind, kitable with skill
      offshore: { min: 235, max: 335 },       // SW to NNW — true offshore, DANGEROUS
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
    
    // Vineyard is on EAST shore - shore faces WEST toward the lake
    shoreOrientation: 270, // Shore faces West
    kiting: {
      onshore: { min: 225, max: 315 },       // SW to NW — wind from lake, safest
      sideOn: { min: 180, max: 225, min2: 315, max2: 360 }, // S-SW and NW-N
      sideOffshore: { min: 0, max: 45 },     // N to NE — side-off, kitable with skill
      offshore: { min: 90, max: 180 },        // E to S — true offshore at Vineyard, DANGEROUS
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
    
    shoreOrientation: 80, // Shore faces ENE (shoreline runs NNW-SSE, water is east)
    kiting: {
      onshore: { min: 45, max: 135 },        // NE to SE — wind from lake, safest
      sideOn: { min: 135, max: 200, min2: 15, max2: 45 }, // SE-SSW and NNE-NE
      sideOffshore: { min: 315, max: 15 },   // NW to NNE — north wind zone, kitable with skill
      offshore: { min: 225, max: 315 },       // SW to NW — true offshore, DANGEROUS
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
    
    shoreOrientation: 160, // Shore faces SSE to S (north end curves)
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
          id: 'SND', 
          name: 'Arrowhead Summit',
          elevation: 8252,
          role: 'PRIMARY - High-elevation trigger for Deer Creek thermal',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup ridge reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'DCC',
        name: 'Deer Creek Dam',
        role: 'Ground Truth - Dam/Chute thermal indicator',
      },
      
      lakeshore: [
        { 
          id: 'DCC', 
          name: 'Deer Creek Dam',
          elevation: 6675,
          role: 'Primary - at reservoir',
          priority: 1
        },
        { 
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Charleston area reference',
          priority: 2
        },
        {
          id: 'UTPCY',
          name: 'Provo Canyon MP10',
          elevation: 5119,
          role: 'Canyon mouth - thermal draw indicator',
          priority: 3
        }
      ],
      
      reference: [
        { id: 'MDAU1', name: 'Midway', elevation: 5758 },
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

  'willard-bay': {
    id: 'willard-bay',
    name: 'Willard Bay',
    shortName: 'Willard',
    region: 'Box Elder County',
    coordinates: { lat: 41.3686, lng: -112.0772 },
    elevation: 4200,
    
    primaryWindType: 'North Thermal / "The Gap"',
    thermalDirection: 'S to SW (170-220°)',
    description: 'Gap wind from the north - watch for frontal passages',
    
    shoreOrientation: 270, // Shore faces West
    kiting: {
      onshore: { min: 225, max: 315 },    // SW to NW - wind from water
      sideOn: { min: 315, max: 360, min2: 180, max2: 225 },
      offshore: { min: 45, max: 135 },     // NE to SE - DANGEROUS
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
          role: 'PRIMARY - High-elevation trigger for Willard thermal',
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
        name: 'Willard Bay North',
        role: 'Ground Truth - North end thermal indicator',
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
          role: 'North ridge reference',
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
      ],

      reference: [
        { id: 'UWCU1', name: 'Provo 22E AgriMet', elevation: 7812 },
        { id: 'UTDAN', name: 'US-40 Daniels Summit (UDOT)', elevation: 8000 },
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

  // =====================================================
  // SKYLINE DRIVE — SNOWKITE
  // =====================================================

  'skyline-drive': {
    id: 'skyline-drive',
    name: 'Skyline Drive (Big Drift)',
    shortName: 'Skyline',
    region: 'Sanpete County',
    coordinates: { lat: 39.61554, lng: -111.30271 },
    elevation: 9680,

    primaryWindType: 'W/NW Plateau',
    thermalDirection: 'W to NW (250-340°)',
    description: 'High-elevation snowkite complex at 10,000 ft — open bowls, deep snow, strong persistent wind',

    shoreOrientation: null,
    kiting: {
      onshore: { min: 250, max: 340 },       // W to NNW — prevailing plateau wind
      sideOn: { min: 340, max: 30, min2: 210, max2: 250 },
      sideOffshore: { min: 30, max: 80 },    // NNE to ENE
      offshore: { min: 80, max: 210 },        // E to SSW — lee side, gusty/turbulent
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
          id: 'EPMU1',
          name: 'Ephraim NWS',
          elevation: 5530,
          role: 'Sanpete Valley pressure reference',
        },
        bustThreshold: 3.0,
      },

      ridge: [
        {
          id: 'SKY',
          name: 'Skyline UDOT',
          elevation: 9330,
          role: 'PRIMARY — UDOT station 1.89 mi from Big Drift',
          priority: 1,
        },
        {
          id: 'UTESU',
          name: 'SR-264 Eccles Summit (UDOT)',
          elevation: 9443,
          role: 'Same ridge — Eccles Summit reference',
          priority: 2,
        },
        {
          id: 'UTMPK',
          name: 'Monument Peak (USFS)',
          elevation: 10390,
          role: 'High-elevation ridge reference',
          priority: 3,
        },
      ],

      groundTruth: {
        id: 'SKY',
        name: 'Skyline UDOT',
        role: 'Ground Truth — nearest station to Big Drift (1.89 mi)',
      },

      lakeshore: [
        {
          id: 'SKY',
          name: 'Skyline UDOT',
          elevation: 9330,
          role: 'Primary — closest to kite area',
          priority: 1,
        },
        {
          id: 'EPMU1',
          name: 'Ephraim NWS',
          elevation: 5530,
          role: 'Valley floor reference',
          priority: 2,
        },
      ],

      reference: [
        { id: 'UTHTP', name: 'US-89 Hilltop (UDOT)', elevation: 6446 },
      ],
    },

    thermal: {
      optimalDirection: { min: 250, max: 340, ideal: 290 },
      optimalSpeed: { min: 10, max: 30, average: 16 },
      peakHours: { start: 10, end: 16, peak: 13 },
      buildTime: { start: 8, usable: 10 },
      fadeTime: { start: 16, end: 18 },
    },

    snowkite: true,
  },

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
  // JORDANELLE RESERVOIR
  // =====================================================
  'jordanelle': {
    id: 'jordanelle',
    name: 'Jordanelle Reservoir',
    shortName: 'Jordanelle',
    region: 'Wasatch County',
    coordinates: { lat: 40.600, lng: -111.420 },
    elevation: 6166,
    surfaceAcres: 3050,
    maxDepth: 292,
    primaryWindType: 'Canyon/Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Deep mountain reservoir — Heber Valley thermal, Provo River corridor winds',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure reference' },
        low: { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Local valley pressure' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'SND', name: 'Arrowhead Summit', elevation: 8252, role: 'High-elevation trigger', priority: 1 },
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'Backup ridge reference', priority: 2 },
      ],
      groundTruth: { id: 'KHCR', name: 'Heber Valley Airport', role: 'Ground Truth — closest ASOS' },
      lakeshore: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Primary — Heber Valley', priority: 1 },
        { id: 'DCC', name: 'Deer Creek Dam', elevation: 6675, role: 'Secondary — shared corridor', priority: 2 },
      ],
      reference: [{ id: 'MDAU1', name: 'Midway', elevation: 5758 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 205 },
      optimalSpeed: { min: 4, max: 14, average: 7 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['rainbow trout', 'smallmouth bass', 'yellow perch', 'kokanee salmon'],
      secondary: ['wiper', 'tiger muskie', 'brown trout'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        smallmouthBass: 'Jun–Sep',
        kokanee: 'Jul–Sep (trolling mid-depth)',
        iceFishing: 'Dec–Mar (perch, trout)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Jordanelle State Park' },
    glassWindow: { typicalStart: 6, typicalEnd: 10, confidence: 'high' },
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
  // STARVATION RESERVOIR
  // =====================================================
  'starvation': {
    id: 'starvation',
    name: 'Starvation Reservoir',
    shortName: 'Starvation',
    region: 'Duchesne County',
    coordinates: { lat: 40.190, lng: -110.450 },
    elevation: 5710,
    surfaceAcres: 3500,
    maxDepth: 165,
    primaryWindType: 'Valley Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Uinta Basin reservoir — top walleye fishery, afternoon thermals',
    stations: {
      pressure: {
        high: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Nearest ASOS' },
        low: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Basin pressure reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KVEL', name: 'Vernal Regional Airport', role: 'Ground Truth — nearest ASOS' },
      lakeshore: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary (~30 mi east)', priority: 1 },
      ],
      reference: [{ id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 200 },
      optimalSpeed: { min: 3, max: 12, average: 6 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 55,
    fishSpecies: {
      primary: ['walleye', 'rainbow trout', 'smallmouth bass', 'brown trout'],
      secondary: ['yellow perch', 'kokanee salmon', 'black crappie', 'bluegill'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May (pre-spawn), Oct–Nov',
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Aug',
        iceFishing: 'Dec–Feb (walleye through ice)',
      },
    },
    boating: { marina: true, ramp: true, statePark: 'Starvation State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // FLAMING GORGE RESERVOIR
  // =====================================================
  'flaming-gorge': {
    id: 'flaming-gorge',
    name: 'Flaming Gorge',
    shortName: 'Flaming Gorge',
    region: 'Daggett County',
    coordinates: { lat: 41.050, lng: -109.600 },
    elevation: 6040,
    surfaceAcres: 42020,
    maxDepth: 436,
    primaryWindType: 'Canyon/SE Prevailing',
    thermalDirection: 'SE to S (130-200°)',
    description: 'Trophy lake trout — canyon-sheltered sections, SE prevailing',
    stations: {
      pressure: {
        high: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Nearest ASOS' },
        low: { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Dam-level reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KFGR', name: 'Flaming Gorge AWOS', role: 'Ground Truth — nearest station' },
      lakeshore: [
        { id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955, role: 'Primary — near dam', priority: 1 },
      ],
      reference: [{ id: 'KFGR', name: 'Flaming Gorge AWOS', elevation: 5955 }],
    },
    thermal: {
      optimalDirection: { min: 130, max: 200, ideal: 160 },
      optimalSpeed: { min: 3, max: 12, average: 6 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 48,
    fishSpecies: {
      primary: ['lake trout (trophy — UT record 51 lb 8 oz)', 'kokanee salmon', 'rainbow trout', 'smallmouth bass'],
      secondary: ['brown trout', 'cutthroat trout', 'channel catfish', 'burbot'],
      blueRibbon: false,
      bestSeasons: {
        lakeTrout: 'Year-round, best Oct–Apr (deep jigging)',
        kokanee: 'Jul–Sep (trolling at 30-60 ft)',
        rainbow: 'Apr–Jun, Sep–Oct',
        smallmouth: 'Jun–Aug (rocky points)',
        iceFishing: 'Jan–Mar (lake trout, burbot)',
      },
    },
    boating: { marina: true, ramp: true, nra: 'Flaming Gorge NRA' },
    glassWindow: { typicalStart: 5, typicalEnd: 11, confidence: 'high' },
  },

  // =====================================================
  // LAKE POWELL
  // =====================================================
  'lake-powell': {
    id: 'lake-powell',
    name: 'Lake Powell',
    shortName: 'Powell',
    region: 'Kane/San Juan County',
    coordinates: { lat: 37.070, lng: -111.240 },
    elevation: 3700,
    surfaceAcres: 161390,
    maxDepth: 583,
    primaryWindType: 'Canyon/Desert Thermal',
    thermalDirection: 'Variable — canyon dependent',
    description: 'EXTREME — 186-mile reservoir, canyon microbursts, legendary striper boils',
    stations: {
      pressure: {
        high: { id: 'KPGA', name: 'Page AZ Airport', elevation: 4316, role: 'Nearest ASOS — at dam' },
        low: { id: 'KPGA', name: 'Page AZ Airport', elevation: 4316, role: 'Dam-level reference' },
        bustThreshold: 3.0,
      },
      ridge: [
        { id: 'KPGA', name: 'Page AZ Airport', elevation: 4316, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KPGA', name: 'Page AZ Airport', role: 'Ground Truth — only station at dam' },
      lakeshore: [
        { id: 'KPGA', name: 'Page AZ Airport', elevation: 4316, role: 'Primary — near Wahweap', priority: 1 },
      ],
      reference: [{ id: 'KPGA', name: 'Page AZ Airport', elevation: 4316 }],
    },
    thermal: {
      optimalDirection: { min: 150, max: 250, ideal: 200 },
      optimalSpeed: { min: 3, max: 15, average: 7 },
      peakHours: { start: 11, end: 17, peak: 14 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 18, end: 20 },
    },
    waterTempEstimate: 65,
    fishSpecies: {
      primary: ['striped bass', 'largemouth bass', 'smallmouth bass', 'walleye'],
      secondary: ['channel catfish', 'black crappie', 'white crappie'],
      blueRibbon: false,
      bestSeasons: {
        stripedBass: 'Mar–Jun (spring run), Oct–Nov (boils)',
        largemouth: 'Apr–Oct',
        smallmouth: 'May–Sep',
        walleye: 'Mar–May, Sep–Nov',
        catfish: 'Jun–Sep',
      },
    },
    boating: { marina: true, ramp: true, nra: 'Glen Canyon NRA' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
    windHazard: 'EXTREME — microbursts 56+ mph, canyon funneling, monsoon thunderstorms Jul–Sep',
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
  // ECHO RESERVOIR
  // =====================================================
  'echo': {
    id: 'echo',
    name: 'Echo Reservoir',
    shortName: 'Echo',
    region: 'Summit County',
    coordinates: { lat: 40.970, lng: -111.440 },
    elevation: 5560,
    surfaceAcres: 1450,
    maxDepth: 126,
    primaryWindType: 'Valley/I-80 Corridor',
    thermalDirection: 'W to SW (240-270°)',
    description: 'Weber River reservoir — wiper surface action, I-80 corridor winds',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Nearest major ASOS' },
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
      optimalDirection: { min: 240, max: 270, ideal: 255 },
      optimalSpeed: { min: 3, max: 12, average: 6 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['rainbow trout', 'smallmouth bass', 'wiper'],
      secondary: ['yellow perch', 'brown trout', 'channel catfish'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        smallmouth: 'Jun–Sep',
        wiper: 'May–Sep (surface feeding)',
        iceFishing: 'Dec–Feb (trout, perch)',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Echo State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // ROCKPORT RESERVOIR
  // =====================================================
  'rockport': {
    id: 'rockport',
    name: 'Rockport Reservoir',
    shortName: 'Rockport',
    region: 'Summit County',
    coordinates: { lat: 40.780, lng: -111.400 },
    elevation: 5955,
    surfaceAcres: 1080,
    maxDepth: 150,
    primaryWindType: 'Valley Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Weber River canyon reservoir — rainbow trout and smallmouth bass',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Nearest major ASOS' },
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
      optimalDirection: { min: 200, max: 250, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['rainbow trout', 'smallmouth bass', 'brown trout'],
      secondary: ['kokanee salmon', 'yellow perch'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Sep',
        kokanee: 'Jul–Sep',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Rockport State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // YUBA RESERVOIR
  // =====================================================
  'yuba': {
    id: 'yuba',
    name: 'Yuba Reservoir',
    shortName: 'Yuba',
    region: 'Juab/Sanpete County',
    coordinates: { lat: 39.430, lng: -111.920 },
    elevation: 5100,
    surfaceAcres: 10500,
    maxDepth: 80,
    primaryWindType: 'Valley/Frontal',
    thermalDirection: 'S to SW (170-230°)',
    description: '22-mile warmwater monster — walleye, northern pike, tiger muskie',
    stations: {
      pressure: {
        high: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Regional reference' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Nearest major ASOS (50+ mi)' },
        bustThreshold: 3.0,
      },
      ridge: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KPVU', name: 'Provo Municipal', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Primary (distant)', priority: 1 },
      ],
      reference: [{ id: 'KPVU', name: 'Provo Municipal', elevation: 4495 }],
    },
    thermal: {
      optimalDirection: { min: 170, max: 230, ideal: 200 },
      optimalSpeed: { min: 3, max: 14, average: 7 },
      peakHours: { start: 11, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 58,
    fishSpecies: {
      primary: ['walleye', 'channel catfish', 'wiper', 'northern pike'],
      secondary: ['rainbow trout', 'yellow perch', 'tiger trout', 'tiger muskie'],
      blueRibbon: false,
      bestSeasons: {
        walleye: 'Mar–May, Oct–Nov',
        northernPike: 'Mar–Apr (pre-spawn), Sep–Oct',
        catfish: 'Jun–Sep',
        wiper: 'May–Sep (surface feeding)',
        iceFishing: 'Jan–Feb (walleye, perch)',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Yuba State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'low' },
    windHazard: 'MODERATE — 22-mile fetch allows significant wave buildup',
  },

  // =====================================================
  // SCOFIELD RESERVOIR (Blue Ribbon)
  // =====================================================
  'scofield': {
    id: 'scofield',
    name: 'Scofield Reservoir',
    shortName: 'Scofield',
    region: 'Carbon County',
    coordinates: { lat: 39.790, lng: -111.150 },
    elevation: 7618,
    surfaceAcres: 2815,
    maxDepth: 50,
    primaryWindType: 'Plateau/Frontal',
    thermalDirection: 'W to NW (250-320°)',
    description: 'Blue Ribbon fishery — highest-elevation state park, slot-limit cutthroat',
    stations: {
      pressure: {
        high: { id: 'KPUC', name: 'Price/Carbon Airport', elevation: 5951, role: 'Nearest ASOS' },
        low: { id: 'KPUC', name: 'Price/Carbon Airport', elevation: 5951, role: 'Regional reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KPUC', name: 'Price/Carbon Airport', elevation: 5951, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KPUC', name: 'Price/Carbon Airport', role: 'Ground Truth — 25 mi east' },
      lakeshore: [
        { id: 'KPUC', name: 'Price/Carbon Airport', elevation: 5951, role: 'Primary (25 mi)', priority: 1 },
      ],
      reference: [{ id: 'KPUC', name: 'Price/Carbon Airport', elevation: 5951 }],
    },
    thermal: {
      optimalDirection: { min: 250, max: 320, ideal: 280 },
      optimalSpeed: { min: 4, max: 15, average: 8 },
      peakHours: { start: 11, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 45,
    fishSpecies: {
      primary: ['cutthroat trout', 'rainbow trout', 'tiger trout'],
      secondary: [],
      blueRibbon: true,
      specialRegs: 'Cutthroat/tiger trout 15-22 inches must be released. Combined trout limit 4.',
      bestSeasons: {
        cutthroat: 'May–Jun (post ice-off), Sep–Oct',
        rainbow: 'Year-round (stocked)',
        iceFishing: 'Dec–Mar (very popular — thick reliable ice)',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Scofield State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // OTTER CREEK RESERVOIR (Blue Ribbon)
  // =====================================================
  'otter-creek': {
    id: 'otter-creek',
    name: 'Otter Creek Reservoir',
    shortName: 'Otter Creek',
    region: 'Piute County',
    coordinates: { lat: 38.350, lng: -111.990 },
    elevation: 6372,
    surfaceAcres: 2520,
    maxDepth: 70,
    primaryWindType: 'Valley/Plateau',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Blue Ribbon trout factory — stocked fish grow fast, productive year-round',
    stations: {
      pressure: {
        high: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Nearest ASOS' },
        low: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Regional reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KCDC', name: 'Cedar City Regional', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary (60 mi)', priority: 1 },
      ],
      reference: [{ id: 'KCDC', name: 'Cedar City Regional', elevation: 5622 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 205 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['rainbow trout', 'cutthroat trout', 'brown trout'],
      secondary: ['tiger trout', 'smallmouth bass', 'wiper'],
      blueRibbon: true,
      bestSeasons: {
        trout: 'Apr–Jun (post ice-off), Sep–Nov (pre-ice)',
        iceFishing: 'Dec–Mar (very productive)',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Otter Creek State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // FISH LAKE
  // =====================================================
  'fish-lake': {
    id: 'fish-lake',
    name: 'Fish Lake',
    shortName: 'Fish Lake',
    region: 'Sevier County',
    coordinates: { lat: 38.549, lng: -111.711 },
    elevation: 8848,
    surfaceAcres: 2500,
    maxDepth: 175,
    primaryWindType: 'Mountain Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Utah\'s largest natural mountain lake — trophy mackinaw at depth',
    stations: {
      pressure: {
        high: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Nearest ASOS (70+ mi)' },
        low: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Regional reference' },
        bustThreshold: 3.0,
      },
      ridge: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KCDC', name: 'Cedar City Regional', role: 'Ground Truth — very distant' },
      lakeshore: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary (70+ mi)', priority: 1 },
      ],
      reference: [{ id: 'KCDC', name: 'Cedar City Regional', elevation: 5622 }],
    },
    thermal: {
      optimalDirection: { min: 200, max: 250, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 42,
    fishSpecies: {
      primary: ['lake trout (mackinaw)', 'rainbow trout', 'splake'],
      secondary: ['yellow perch', 'tiger trout'],
      blueRibbon: false,
      bestSeasons: {
        lakeTrout: 'Year-round, best May–Jun and Oct–Nov',
        rainbow: 'Jun–Sep',
        iceFishing: 'Dec–Mar (mackinaw jigging at depth)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // STEINAKER RESERVOIR
  // =====================================================
  'steinaker': {
    id: 'steinaker',
    name: 'Steinaker Reservoir',
    shortName: 'Steinaker',
    region: 'Uintah County',
    coordinates: { lat: 40.530, lng: -109.530 },
    elevation: 5500,
    surfaceAcres: 820,
    maxDepth: 100,
    primaryWindType: 'Basin Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Vernal-area reservoir — rainbow trout and bass with sandy beach',
    stations: {
      pressure: {
        high: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Nearest ASOS (7 mi)' },
        low: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Local reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KVEL', name: 'Vernal Regional Airport', role: 'Ground Truth — 7 miles' },
      lakeshore: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary — close', priority: 1 },
      ],
      reference: [{ id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 200 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 55,
    fishSpecies: {
      primary: ['rainbow trout', 'largemouth bass'],
      secondary: ['brown trout', 'bluegill'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Sep',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Steinaker State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 11, confidence: 'high' },
  },

  // =====================================================
  // RED FLEET RESERVOIR
  // =====================================================
  'red-fleet': {
    id: 'red-fleet',
    name: 'Red Fleet Reservoir',
    shortName: 'Red Fleet',
    region: 'Uintah County',
    coordinates: { lat: 40.580, lng: -109.460 },
    elevation: 5500,
    surfaceAcres: 520,
    maxDepth: 120,
    primaryWindType: 'Basin Thermal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Red-rock reservoir near Vernal — scenic trout fishing, dinosaur trackway',
    stations: {
      pressure: {
        high: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Nearest ASOS (10 mi)' },
        low: { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Local reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KVEL', name: 'Vernal Regional Airport', role: 'Ground Truth — 10 miles' },
      lakeshore: [
        { id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280, role: 'Primary — close', priority: 1 },
      ],
      reference: [{ id: 'KVEL', name: 'Vernal Regional Airport', elevation: 5280 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 200 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['rainbow trout', 'brown trout'],
      secondary: ['yellow perch', 'smallmouth bass', 'bluegill', 'largemouth bass'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Aug',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Red Fleet State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 11, confidence: 'high' },
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
  // MINERSVILLE RESERVOIR
  // =====================================================
  'minersville': {
    id: 'minersville',
    name: 'Minersville Reservoir',
    shortName: 'Minersville',
    region: 'Beaver County',
    coordinates: { lat: 38.210, lng: -112.870 },
    elevation: 5530,
    surfaceAcres: 900,
    maxDepth: 60,
    primaryWindType: 'Desert Valley',
    thermalDirection: 'SW (200-250°)',
    description: 'Flies & lures only — trophy trout water, quality over quantity',
    stations: {
      pressure: {
        high: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Nearest ASOS (35 mi)' },
        low: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Regional reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KCDC', name: 'Cedar City Regional', role: 'Ground Truth — 35 miles' },
      lakeshore: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary (35 mi)', priority: 1 },
      ],
      reference: [{ id: 'KCDC', name: 'Cedar City Regional', elevation: 5622 }],
    },
    thermal: {
      optimalDirection: { min: 200, max: 250, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 50,
    fishSpecies: {
      primary: ['rainbow trout', 'brown trout', 'smallmouth bass'],
      secondary: ['cutthroat trout', 'tiger trout', 'largemouth bass', 'wiper'],
      blueRibbon: false,
      specialRegs: 'Artificial flies and lures only (no bait)',
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Aug',
        iceFishing: 'Dec–Feb (trout)',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Minersville State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // PIUTE RESERVOIR
  // =====================================================
  'piute': {
    id: 'piute',
    name: 'Piute Reservoir',
    shortName: 'Piute',
    region: 'Piute County',
    coordinates: { lat: 38.330, lng: -112.160 },
    elevation: 5900,
    surfaceAcres: 3360,
    maxDepth: 65,
    primaryWindType: 'Valley/Plateau',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Multi-species fishery — expanding with crappie and white bass introductions',
    stations: {
      pressure: {
        high: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Nearest ASOS (60 mi)' },
        low: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Regional reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KCDC', name: 'Cedar City Regional', role: 'Ground Truth — distant' },
      lakeshore: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary (60 mi)', priority: 1 },
      ],
      reference: [{ id: 'KCDC', name: 'Cedar City Regional', elevation: 5622 }],
    },
    thermal: {
      optimalDirection: { min: 180, max: 230, ideal: 200 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 52,
    fishSpecies: {
      primary: ['rainbow trout', 'cutthroat trout', 'brown trout'],
      secondary: ['tiger trout', 'smallmouth bass', 'white crappie', 'black crappie', 'white bass', 'bluegill'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Apr–Jun, Sep–Nov',
        bass: 'Jun–Sep',
        crappie: 'Apr–May, Oct',
        iceFishing: 'Dec–Feb',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Piute State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // PANGUITCH LAKE
  // =====================================================
  'panguitch': {
    id: 'panguitch',
    name: 'Panguitch Lake',
    shortName: 'Panguitch',
    region: 'Garfield County',
    coordinates: { lat: 37.710, lng: -112.650 },
    elevation: 8215,
    surfaceAcres: 1248,
    maxDepth: 50,
    primaryWindType: 'Mountain Plateau',
    thermalDirection: 'W to SW (230-280°)',
    description: 'High-mountain lake near Cedar Breaks — reliable ice, stocked trout',
    stations: {
      pressure: {
        high: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Nearest ASOS (25 mi)' },
        low: { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Regional reference' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KCDC', name: 'Cedar City Regional', role: 'Ground Truth — 25 miles' },
      lakeshore: [
        { id: 'KCDC', name: 'Cedar City Regional', elevation: 5622, role: 'Primary (25 mi)', priority: 1 },
      ],
      reference: [{ id: 'KCDC', name: 'Cedar City Regional', elevation: 5622 }],
    },
    thermal: {
      optimalDirection: { min: 230, max: 280, ideal: 255 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 45,
    fishSpecies: {
      primary: ['rainbow trout', 'brown trout'],
      secondary: ['brook trout'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'May–Jun, Sep–Oct',
        iceFishing: 'Dec–Mar (popular — reliable ice at 8,215 ft)',
      },
    },
    boating: { marina: true, ramp: true },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // SAND HOLLOW RESERVOIR (Dixie)
  // =====================================================
  'sand-hollow': {
    id: 'sand-hollow',
    name: 'Sand Hollow Reservoir',
    shortName: 'Sand Hollow',
    region: 'Washington County',
    coordinates: { lat: 37.105, lng: -113.380 },
    elevation: 3000,
    surfaceAcres: 1322,
    maxDepth: 80,
    primaryWindType: 'Desert Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Dixie warm-water paradise — largemouth bass and bluegill in red rock',
    stations: {
      pressure: {
        high: { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Nearest ASOS' },
        low: { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Local reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KSGU', name: 'St George Regional', role: 'Ground Truth — close' },
      lakeshore: [
        { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Primary — close', priority: 1 },
      ],
      reference: [{ id: 'KSGU', name: 'St George Regional', elevation: 2941 }],
    },
    thermal: {
      optimalDirection: { min: 200, max: 250, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 11, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 68,
    fishSpecies: {
      primary: ['largemouth bass', 'bluegill', 'rainbow trout (winter stocked)'],
      secondary: ['channel catfish', 'black crappie', 'green sunfish'],
      blueRibbon: false,
      bestSeasons: {
        largemouth: 'Mar–Nov (year-round in mild Dixie climate)',
        bluegill: 'Apr–Oct',
        trout: 'Nov–Apr (cool season stocking)',
        catfish: 'Jun–Sep',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Sand Hollow State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },

  // =====================================================
  // QUAIL CREEK RESERVOIR (Dixie)
  // =====================================================
  'quail-creek': {
    id: 'quail-creek',
    name: 'Quail Creek Reservoir',
    shortName: 'Quail Creek',
    region: 'Washington County',
    coordinates: { lat: 37.190, lng: -113.380 },
    elevation: 3300,
    surfaceAcres: 590,
    maxDepth: 90,
    primaryWindType: 'Desert Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Dixie warmwater gem — Utah\'s warmest reservoir, year-round bass',
    stations: {
      pressure: {
        high: { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Nearest ASOS' },
        low: { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Local reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Primary reference', priority: 1 },
      ],
      groundTruth: { id: 'KSGU', name: 'St George Regional', role: 'Ground Truth — close' },
      lakeshore: [
        { id: 'KSGU', name: 'St George Regional', elevation: 2941, role: 'Primary — close', priority: 1 },
      ],
      reference: [{ id: 'KSGU', name: 'St George Regional', elevation: 2941 }],
    },
    thermal: {
      optimalDirection: { min: 200, max: 250, ideal: 225 },
      optimalSpeed: { min: 3, max: 12, average: 5 },
      peakHours: { start: 11, end: 16, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 17, end: 19 },
    },
    waterTempEstimate: 72,
    fishSpecies: {
      primary: ['largemouth bass', 'rainbow trout (winter stocked)', 'bluegill'],
      secondary: ['black crappie', 'channel catfish', 'green sunfish'],
      blueRibbon: false,
      bestSeasons: {
        largemouth: 'Year-round (Utah\'s warmest reservoir)',
        trout: 'Nov–Apr (cool season stocking)',
        bluegill: 'Apr–Oct',
        crappie: 'Mar–May, Oct–Nov',
      },
    },
    boating: { marina: false, ramp: true, statePark: 'Quail Creek State Park' },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'medium' },
  },
};

/**
 * Get all station IDs needed for a lake (for API calls)
 */
export const getAllStationIds = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return [];
  
  const ids = new Set();
  
  ids.add(config.stations.pressure.high.id);
  ids.add(config.stations.pressure.low.id);
  config.stations.ridge.forEach((s) => ids.add(s.id));
  config.stations.lakeshore.forEach((s) => ids.add(s.id));
  config.stations.reference.forEach((s) => ids.add(s.id));
  
  // Add ground truth if it's a MesoWest station
  if (config.stations.groundTruth?.id && config.stations.groundTruth.id !== 'PWS') {
    ids.add(config.stations.groundTruth.id);
  }
  
  // Add early indicator station (Spanish Fork for Utah Lake)
  if (config.stations.earlyIndicator?.id) {
    ids.add(config.stations.earlyIndicator.id);
  }
  
  return Array.from(ids);
};

/**
 * Get the primary ridge station for a lake
 */
export const getPrimaryRidgeStation = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return null;
  return config.stations.ridge.find(s => s.priority === 1) || config.stations.ridge[0];
};

/**
 * Get optimal wind configuration for convergence calculation
 */
export const WIND_DIRECTION_OPTIMAL = Object.fromEntries(
  Object.entries(LAKE_CONFIGS).map(([id, config]) => [
    id, 
    config.thermal.optimalDirection
  ])
);

/**
 * Station metadata for display — re-exported from the central registry.
 * Import from stationRegistry.js for the full API.
 */
import { STATION_REGISTRY, getStation, getStationName } from './stationRegistry';

export const STATION_INFO = Object.fromEntries(
  Object.entries(STATION_REGISTRY).map(([id, s]) => [
    id,
    { fullName: s.name, type: s.type, network: s.network },
  ])
);

export { STATION_REGISTRY, getStation, getStationName };
