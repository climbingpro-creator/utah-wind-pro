// Southern Utah — Kane/San Juan, Garfield, Washington, Beaver County stations

export const southernUtahConfigs = {

  // =====================================================
  // LAKE POWELL
  // =====================================================
  'lake-powell': {
    id: 'lake-powell',
    name: 'Lake Powell',
    shortName: 'Powell',
    region: 'Kane/San Juan County',
    coordinates: { lat: 37.0173, lng: -111.4858 }, // Wahweap Marina — primary boat launch
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
  // MINERSVILLE RESERVOIR
  // =====================================================
  'minersville': {
    id: 'minersville',
    name: 'Minersville Reservoir',
    shortName: 'Minersville',
    region: 'Beaver County',
    coordinates: { lat: 38.2130, lng: -112.8740 }, // Minersville State Park boat ramp
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
  // PANGUITCH LAKE
  // =====================================================
  'panguitch': {
    id: 'panguitch',
    name: 'Panguitch Lake',
    shortName: 'Panguitch',
    region: 'Garfield County',
    coordinates: { lat: 37.7130, lng: -112.6530 }, // Panguitch Lake north shore boat ramp
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
    coordinates: { lat: 37.1072, lng: -113.3850 }, // Sand Hollow State Park main boat ramp
    elevation: 3000,
    surfaceAcres: 1322,
    maxDepth: 80,
    primaryWindType: 'Desert Thermal',
    thermalDirection: 'SW (200-250°)',
    description: 'Dixie warm-water paradise — largemouth bass and bluegill in red rock',
    // Sand Hollow. NW to NE flow (crosses North): 320-45°.
    safeWindArc: [320, 45],
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
    coordinates: { lat: 37.1920, lng: -113.3780 }, // Quail Creek State Park boat ramp
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
