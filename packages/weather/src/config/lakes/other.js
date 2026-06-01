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
    coordinates: { lat: 40.5990, lng: -111.4302 }, // Hailstone Marina — primary boat ramp
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
        { id: 'TIMU1', name: 'Timpanogos Divide', elevation: 8170, role: 'PRIMARY — High-elevation trigger for Heber Valley thermal', priority: 1 },
        { id: 'CSC', name: 'Cascade Peak', elevation: 10875, role: 'Highest Wasatch reference', priority: 2 },
      ],
      groundTruth: { id: 'KHCR', name: 'Heber Valley Airport', role: 'Ground Truth — closest ASOS' },
      earlyIndicator: {
        id: 'UTLPC',
        name: 'Lower Provo Canyon (UDOT)',
        elevation: 5100,
        role: 'Early Warning — canyon thermal draw precedes Jordanelle by ~60 min',
        leadTimeMinutes: 60,
        trigger: {
          direction: { min: 170, max: 230, label: 'S/SSW' },
          speed: { min: 4, optimal: 6 },
        },
      },
      lakeshore: [
        { id: 'KHCR', name: 'Heber Valley Airport', elevation: 5597, role: 'Primary — Heber Valley', priority: 1 },
        { id: 'UTCHL', name: 'Charleston (UDOT)', elevation: 5500, role: 'Secondary — Heber Valley near reservoir', priority: 2 },
        { id: 'UTDCD', name: 'US-189 Deer Creek Dam (UDOT)', elevation: 5400, role: 'Shared corridor (Provo Canyon)', priority: 3 },
        { id: 'UTPCY', name: 'Provo Canyon MP10', elevation: 5119, role: 'Canyon mouth — thermal draw indicator', priority: 4 },
      ],
      reference: [
        { id: 'MDAU1', name: 'Midway', elevation: 5758 },
        { id: 'UTLPC', name: 'Lower Provo Canyon (UDOT)', elevation: 5100 },
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'KPVU', name: 'Provo Municipal', elevation: 4495 },
        { id: 'KUTPARKCITY4', name: 'Park City (WU)', elevation: 6900 },
        { id: 'KUTMIDWA37', name: 'Midway (WU)', elevation: 5700 },
      ],
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
