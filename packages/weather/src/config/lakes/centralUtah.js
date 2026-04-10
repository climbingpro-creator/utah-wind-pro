// Central Utah — Sanpete, Juab, Carbon, Sevier, Piute County stations

export const centralUtahConfigs = {

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
  // YUBA RESERVOIR
  // =====================================================
  'yuba': {
    id: 'yuba',
    name: 'Yuba Reservoir',
    shortName: 'Yuba',
    region: 'Juab/Sanpete County',
    coordinates: { lat: 39.4050, lng: -111.9280 }, // Painted Rocks boat ramp
    elevation: 5100,
    surfaceAcres: 10500,
    maxDepth: 80,
    primaryWindType: 'Valley/Frontal',
    thermalDirection: 'S to SW (170-230°)',
    description: '22-mile warmwater monster — walleye, northern pike, tiger muskie',
    // Yuba. Direct south flow (140-220°).
    safeWindArc: [140, 220],
    stations: {
      pressure: {
        high: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Regional pressure reference' },
        low: { id: 'UTLMP', name: 'I-15 Lampson Canyon (UDOT)', elevation: 5200, role: 'Local pressure near Yuba' },
        bustThreshold: 3.0,
      },
      ridge: [
        { id: 'UTRKY', name: 'I-15 Rocky Ridge (UDOT)', elevation: 5400, role: 'North approach indicator', priority: 1 },
      ],
      groundTruth: { id: 'UTLMP', name: 'I-15 Lampson Canyon (UDOT)', role: 'Ground Truth — nearest I-15 station to Yuba' },
      lakeshore: [
        { id: 'UTLMP', name: 'I-15 Lampson Canyon (UDOT)', elevation: 5200, role: 'Primary — closest station to Yuba', priority: 1 },
        { id: 'UTRKY', name: 'I-15 Rocky Ridge (UDOT)', elevation: 5400, role: 'North approach — near Nephi', priority: 2 },
      ],
      reference: [
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495 },
        { id: 'UTSCI', name: 'I-15 Scipio Summit (UDOT)', elevation: 5900 },
      ],
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
    coordinates: { lat: 39.7865, lng: -111.1518 }, // Scofield State Park boat ramp (Madsen Bay)
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
    coordinates: { lat: 38.3520, lng: -111.9870 }, // Otter Creek State Park boat ramp
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
    coordinates: { lat: 38.5462, lng: -111.7135 }, // Fish Lake Lodge / main boat ramp
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
  // PIUTE RESERVOIR
  // =====================================================
  'piute': {
    id: 'piute',
    name: 'Piute Reservoir',
    shortName: 'Piute',
    region: 'Piute County',
    coordinates: { lat: 38.3280, lng: -112.1620 }, // Piute State Park boat ramp
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
};
