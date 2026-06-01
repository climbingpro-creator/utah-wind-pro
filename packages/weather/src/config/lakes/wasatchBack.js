// Wasatch Back — Summit, Duchesne, Daggett, Uintah County stations

export const wasatchBackConfigs = {

  // =====================================================
  // STARVATION RESERVOIR
  // =====================================================
  'starvation': {
    id: 'starvation',
    name: 'Starvation Reservoir',
    shortName: 'Starvation',
    region: 'Duchesne County',
    coordinates: { lat: 40.1855, lng: -110.4415 }, // Starvation State Park main boat ramp
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
    coordinates: { lat: 41.0385, lng: -109.5725 }, // Lucerne Valley Marina
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
  // ECHO RESERVOIR
  // =====================================================
  'echo': {
    id: 'echo',
    name: 'Echo Reservoir',
    shortName: 'Echo',
    region: 'Summit County',
    coordinates: { lat: 40.9645, lng: -111.4380 },
    elevation: 5560,
    surfaceAcres: 1450,
    maxDepth: 126,
    primaryWindType: 'I-80 Corridor W/SW',
    thermalDirection: 'W to SW (240-270°)',
    description: 'Weber River reservoir — I-80 corridor funnels westerly wind',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Western pressure reference' },
        low: { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Eastern valley pressure' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'Wasatch ridge — elevated flow indicator', priority: 1 },
      ],
      groundTruth: { id: 'KUTCOALV2', name: 'Coalville (WU)', role: 'Ground Truth — WU station near Echo' },
      earlyIndicator: {
        id: 'KSLC',
        name: 'Salt Lake City Intl',
        elevation: 4226,
        role: 'Early Warning — W flow at SLC precedes I-80 corridor by ~90 min',
        leadTimeMinutes: 90,
        trigger: {
          direction: { min: 220, max: 300, label: 'W/SW' },
          speed: { min: 8, optimal: 12 },
        },
      },
      lakeshore: [
        { id: 'KUTCOALV2', name: 'Coalville (WU)', elevation: 5600, role: 'Primary — nearest WU station', priority: 1 },
        { id: 'KUTWANSH1', name: 'Wanship (WU)', elevation: 5800, role: 'Weber Canyon corridor', priority: 2 },
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Valley reference south', priority: 3 },
      ],
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'KUTPARKCITY4', name: 'Park City (WU)', elevation: 6900 },
        { id: 'KUTHENEF1', name: 'Henefer (WU)', elevation: 5300 },
        { id: 'KUTMORGA4', name: 'Morgan (WU)', elevation: 5100 },
        { id: 'KOGD', name: 'Ogden-Hinckley Airport', elevation: 4440 },
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
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
    coordinates: { lat: 40.7830, lng: -111.3955 },
    elevation: 5955,
    surfaceAcres: 1080,
    maxDepth: 150,
    primaryWindType: 'Valley SW Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Weber River canyon reservoir — SW afternoon thermal',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Western pressure reference' },
        low: { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Eastern valley pressure' },
        bustThreshold: 2.5,
      },
      ridge: [
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'Wasatch ridge reference', priority: 1 },
      ],
      groundTruth: { id: 'KUTCOALV2', name: 'Coalville (WU)', role: 'Ground Truth — nearest station' },
      earlyIndicator: {
        id: 'KSLC',
        name: 'Salt Lake City Intl',
        elevation: 4226,
        role: 'Early Warning — W/SW at SLC pushes through I-80/I-84 corridor',
        leadTimeMinutes: 75,
        trigger: {
          direction: { min: 200, max: 280, label: 'SW/W' },
          speed: { min: 8, optimal: 12 },
        },
      },
      lakeshore: [
        { id: 'KUTCOALV2', name: 'Coalville (WU)', elevation: 5600, role: 'Primary — upper Weber River', priority: 1 },
        { id: 'KUTWANSH1', name: 'Wanship (WU)', elevation: 5800, role: 'Secondary — Weber Canyon south', priority: 2 },
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Heber Valley reference', priority: 3 },
      ],
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'KUTPARKCITY4', name: 'Park City (WU)', elevation: 6900 },
        { id: 'KUTHENEF1', name: 'Henefer (WU)', elevation: 5300 },
        { id: 'KUTMORGA4', name: 'Morgan (WU)', elevation: 5100 },
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'KOGD', name: 'Ogden-Hinckley Airport', elevation: 4440 },
      ],
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
  // STEINAKER RESERVOIR
  // =====================================================
  'steinaker': {
    id: 'steinaker',
    name: 'Steinaker Reservoir',
    shortName: 'Steinaker',
    region: 'Uintah County',
    coordinates: { lat: 40.5262, lng: -109.5340 }, // Steinaker State Park boat ramp
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
    coordinates: { lat: 40.5748, lng: -109.4635 }, // Red Fleet State Park boat ramp
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
};
