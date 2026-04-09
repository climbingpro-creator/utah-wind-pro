// Sulphur Creek Reservoir (Uinta County, Wyoming)
// ~90 min NE of SLC, 12 miles south of Evanston, WY
// The cure for the summer wind blues — dependable wind when the jet stream
// is due west and Utah valleys are dead calm (July dearth escape).
// Small lake, cold clean water, small chop. Popular with Utah windsurfers.

export const sulfurCreekConfigs = {
  'sulfur-creek': {
    id: 'sulfur-creek',
    name: 'Sulphur Creek Reservoir',
    shortName: 'Sulphur Creek',
    region: 'SW Wyoming',
    coordinates: { lat: 41.095, lng: -110.955 },
    elevation: 7200,

    primaryWindType: 'Jet Stream / West Flow',
    thermalDirection: 'West (250-290°)',
    description: 'Jet-stream driven — fires when upper-level flow is due west over the region. Best July wind escape from SLC.',

    safeWindArc: [220, 320],
    shoreFacing: 270,
    kiting: {
      onshore: { min: 240, max: 300 },
      sideOn: { min: 200, max: 240, min2: 300, max2: 340 },
      offshore: { min: 60, max: 120 },
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
          id: 'KEVW',
          name: 'Evanston-Uinta Co Airport',
          elevation: 7143,
          role: 'Local pressure — closest airport',
        },
        bustThreshold: 2.5,
      },

      ridge: [],

      groundTruth: {
        id: 'KFIR',
        name: 'First Divide (WYDOT RWIS)',
        role: 'Ground Truth — I-80 First Divide summit, ~15 mi E of reservoir',
      },

      lakeshore: [
        {
          id: 'KFIR',
          name: 'First Divide (WYDOT RWIS)',
          elevation: 7579,
          role: 'Primary — closest reporting station on I-80 corridor',
          priority: 1,
        },
        {
          id: 'KEVW',
          name: 'Evanston-Uinta Co Airport (ASOS)',
          elevation: 7143,
          role: 'Secondary — Evanston airport, 12 mi north',
          priority: 2,
        },
      ],

      predictor: [
        {
          id: 'UT1',
          name: 'Wahsatch Hill EB (UDOT RWIS)',
          elevation: 6814,
          role: 'West wind predictor — strong W at Wahsatch summit means Sulphur fires',
        },
      ],

      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'KEVW', name: 'Evanston-Uinta Co Airport', elevation: 7143 },
      ],
    },

    thermal: {
      optimalDirection: { min: 250, max: 290, ideal: 270 },
      optimalSpeed: { min: 10, max: 25, average: 15 },
      peakHours: { start: 12, end: 18, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 18, end: 20 },
    },

    requirement: 'Jet stream must be due west overhead — check 500mb charts. No thunderstorms.',

    waterTempEstimate: 48,
    fishSpecies: {
      primary: ['rainbow trout', 'brown trout'],
      secondary: ['brook trout'],
      blueRibbon: false,
      bestSeasons: {
        trout: 'Jun–Sep',
      },
    },
    boating: { marina: false, ramp: true, statePark: null },
    glassWindow: { typicalStart: 5, typicalEnd: 10, confidence: 'low' },
  },
};
