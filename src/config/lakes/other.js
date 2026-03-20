// Other stations not covered by major region groupings

export const otherConfigs = {

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
};
