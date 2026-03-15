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
  },

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
