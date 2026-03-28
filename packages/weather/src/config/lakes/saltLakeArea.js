// Salt Lake Area — Salt Lake County, Tooele County stations

export const saltLakeAreaConfigs = {

  // =====================================================
  // RUSH LAKE — Premier Kite Spot (Tooele County)
  // =====================================================
  'rush-lake': {
    id: 'rush-lake',
    name: 'Rush Lake',
    shortName: 'Rush Lake',
    region: 'Tooele County',
    coordinates: { lat: 40.500, lng: -112.370 },
    elevation: 4950,
    surfaceAcres: 300,
    maxDepth: 4,
    primaryWindType: 'Storm Front / South Thermal',
    thermalDirection: 'S (170-210°)',
    description: 'Hardcore kite spot — most kitable days in Utah, shallow flat water, storm-front driven',
    // Rush Lake east shore. Safe from North (0) through East (90) to South (180).
    safeWindArc: [0, 180],
    shoreFacing: 90,
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Basin reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference', priority: 1 },
      ],
      groundTruth: { id: 'KSLC', name: 'Salt Lake City Intl', role: 'Ground Truth — 50 min drive' },
      lakeshore: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Primary (distant)', priority: 1 },
      ],
      reference: [{ id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 }],
    },
    thermal: {
      optimalDirection: { min: 170, max: 210, ideal: 190 },
      optimalSpeed: { min: 12, max: 30, average: 18 },
      peakHours: { start: 11, end: 17, peak: 14 },
      buildTime: { start: 10, usable: 11 },
      fadeTime: { start: 18, end: 20 },
    },
    waterTempEstimate: 55,
    glassWindow: { typicalStart: 6, typicalEnd: 10, confidence: 'low' },
    windHazard: 'HIGH — extreme storm-front winds possible, 3-foot depth only',
  },


  // =====================================================
  // GRANTSVILLE RESERVOIR — Kite/Windsurf Spot
  // =====================================================
  'grantsville': {
    id: 'grantsville',
    name: 'Grantsville Reservoir',
    shortName: 'Grantsville',
    region: 'Tooele County',
    coordinates: { lat: 40.590, lng: -112.440 },
    elevation: 4850,
    surfaceAcres: 160,
    maxDepth: 12,
    primaryWindType: 'Valley Thermal / Frontal',
    thermalDirection: 'S to SW (180-230°)',
    description: 'Alternative to Rush Lake — deeper water for larger skegs, windsurf-friendly',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional pressure reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Basin reference' },
        bustThreshold: 2.0,
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
      optimalDirection: { min: 180, max: 230, ideal: 200 },
      optimalSpeed: { min: 10, max: 25, average: 15 },
      peakHours: { start: 11, end: 17, peak: 14 },
      buildTime: { start: 10, usable: 11 },
      fadeTime: { start: 18, end: 20 },
    },
    waterTempEstimate: 55,
    glassWindow: { typicalStart: 6, typicalEnd: 10, confidence: 'low' },
  },


  // =====================================================
  // POINT OF THE MOUNTAIN — Paragliding (North Side)
  // =====================================================
  'potm-north': {
    id: 'potm-north',
    name: 'Point of the Mountain — North',
    shortName: 'PotM North',
    region: 'Salt Lake County',
    coordinates: { lat: 40.460, lng: -111.900 },
    elevation: 5200,
    primaryWindType: 'North Wind Ridge Soaring',
    thermalDirection: 'N to NW (320-360°)',
    description: '900-1200 ft vertical, two parallel ridges, flies afternoon north winds',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KPVU', name: 'Provo Municipal', elevation: 4495, role: 'Local valley reference' },
        bustThreshold: 2.0,
      },
      ridge: [
        { id: 'FPS', name: 'Flight Park South', elevation: 4970, role: 'Nearby wind station', priority: 1 },
      ],
      groundTruth: { id: 'FPS', name: 'Flight Park South', role: 'Ground Truth — adjacent' },
      lakeshore: [
        { id: 'FPS', name: 'Flight Park South', elevation: 4970, role: 'Primary — adjacent', priority: 1 },
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'North flow indicator', priority: 2 },
      ],
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
        { id: 'UT7', name: 'Bluffdale I-15 (UDOT)', elevation: 4500 },
      ],
    },
    thermal: {
      optimalDirection: { min: 320, max: 360, ideal: 340 },
      optimalSpeed: { min: 8, max: 20, average: 12 },
      peakHours: { start: 12, end: 18, peak: 15 },
      buildTime: { start: 11, usable: 12 },
      fadeTime: { start: 18, end: 20 },
    },
  },


  // =====================================================
  // STOCKTON BAR — Paragliding Ridge Soaring
  // =====================================================
  'stockton-bar': {
    id: 'stockton-bar',
    name: 'Stockton Bar',
    shortName: 'Stockton',
    region: 'Tooele County',
    coordinates: { lat: 40.440, lng: -112.370 },
    elevation: 5100,
    primaryWindType: 'North Wind Ridge Soaring',
    thermalDirection: 'N (340-20°)',
    description: 'Lake Bonneville ridge — faces north, best in afternoon north wind',
    stations: {
      pressure: {
        high: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Regional reference' },
        low: { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226, role: 'Basin reference' },
        bustThreshold: 2.0,
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
      optimalDirection: { min: 340, max: 20, ideal: 0 },
      optimalSpeed: { min: 8, max: 18, average: 12 },
      peakHours: { start: 12, end: 18, peak: 15 },
      buildTime: { start: 11, usable: 12 },
      fadeTime: { start: 18, end: 20 },
    },
  },
};
