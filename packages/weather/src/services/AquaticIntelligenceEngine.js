/**
 * AquaticIntelligenceEngine — 2-Tier fishery/aquatic profiling.
 *
 * Tier 1: Live telemetry from the USGS Water Services Instantaneous Values API.
 * Tier 2: Elevation/thermal inference when no gauge is nearby.
 *
 * Returns an EcologicalProfile with water temp, flow, clarity estimates,
 * and an explicit `dataSource` flag so the UI can show provenance.
 */

// ─── USGS Parameter Codes ────────────────────────────────────
const PARAM_WATER_TEMP = '00010'; // Water temperature (°C)
const PARAM_DISCHARGE  = '00060'; // Discharge / stream flow (CFS)
const PARAM_GAUGE_HT   = '00065'; // Gauge height (ft)

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv/';

// ─── Geo helpers ─────────────────────────────────────────────

function milesToDegrees(miles) {
  return miles / 69.0;
}

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Step 1: USGS API Fetcher ────────────────────────────────

/**
 * Fetch the nearest USGS gauge data for a given coordinate.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radiusMiles=10]
 * @returns {Promise<{ siteId: string, siteName: string, waterTemp: number|null,
 *   dischargeCFS: number|null, gaugeHeightFt: number|null, distanceMiles: number }|null>}
 */
export async function fetchNearestUSGSData(lat, lng, radiusMiles = 10) {
  const delta = milesToDegrees(radiusMiles);
  const west  = (lng - delta).toFixed(4);
  const south = (lat - delta).toFixed(4);
  const east  = (lng + delta).toFixed(4);
  const north = (lat + delta).toFixed(4);

  const params = new URLSearchParams({
    format: 'json',
    bBox: `${west},${south},${east},${north}`,
    parameterCd: [PARAM_WATER_TEMP, PARAM_DISCHARGE, PARAM_GAUGE_HT].join(','),
    siteStatus: 'active',
  });

  const url = `${USGS_BASE}?${params.toString()}`;

  let json;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    return null;
  }

  const timeSeries = json?.value?.timeSeries;
  if (!timeSeries || timeSeries.length === 0) return null;

  // Group readings by site
  const sites = new Map();
  for (const ts of timeSeries) {
    const info = ts.sourceInfo;
    const siteCode = info?.siteCode?.[0]?.value;
    if (!siteCode) continue;

    if (!sites.has(siteCode)) {
      const geo = info.geoLocation?.geogLocation;
      sites.set(siteCode, {
        siteId: siteCode,
        siteName: info.siteName || siteCode,
        lat: geo?.latitude ?? null,
        lng: geo?.longitude ?? null,
        waterTemp: null,
        dischargeCFS: null,
        gaugeHeightFt: null,
      });
    }

    const site = sites.get(siteCode);
    const paramCode = ts.variable?.variableCode?.[0]?.value;
    const latestVal = ts.values?.[0]?.value?.[0];
    const numericValue = latestVal ? parseFloat(latestVal.value) : NaN;
    if (isNaN(numericValue) || numericValue < -999) continue;

    if (paramCode === PARAM_WATER_TEMP) {
      // USGS reports °C — convert to °F for consistency with the rest of the app
      site.waterTemp = Math.round((numericValue * 9 / 5 + 32) * 10) / 10;
    } else if (paramCode === PARAM_DISCHARGE) {
      site.dischargeCFS = Math.round(numericValue * 10) / 10;
    } else if (paramCode === PARAM_GAUGE_HT) {
      site.gaugeHeightFt = Math.round(numericValue * 100) / 100;
    }
  }

  if (sites.size === 0) return null;

  // Find the closest site to the requested coordinate
  let closest = null;
  let closestDist = Infinity;

  for (const site of sites.values()) {
    if (site.lat == null || site.lng == null) continue;
    const dist = haversine([lat, lng], [site.lat, site.lng]);
    if (dist < closestDist) {
      closestDist = dist;
      closest = site;
    }
  }

  if (!closest) {
    // No geo data — just take the first site with useful data
    closest = [...sites.values()].find(s => s.waterTemp != null || s.dischargeCFS != null) || null;
    closestDist = radiusMiles;
  }

  if (!closest) return null;

  return {
    siteId: closest.siteId,
    siteName: closest.siteName,
    waterTemp: closest.waterTemp,
    dischargeCFS: closest.dischargeCFS,
    gaugeHeightFt: closest.gaugeHeightFt,
    distanceMiles: Math.round(closestDist * 10) / 10,
  };
}

// ─── Tier 2: Elevation/Thermal Inference (fallback) ──────────

/**
 * Estimate water temperature from elevation and ambient air temp.
 * High-altitude lakes are colder; shallow warm faster in summer.
 *
 * @param {number} elevationFt
 * @param {number} ambientTempF
 * @returns {number} Estimated water temperature in °F
 */
export function inferWaterTemp(elevationFt, ambientTempF) {
  if (ambientTempF == null) return 55;

  // Lapse rate: water is cooler at altitude (~3°F per 1000 ft above 4500')
  const elevationPenalty = Math.max(0, (elevationFt - 4500) / 1000) * 3;

  // Water generally lags air temp and stays cooler
  const airLag = 0.55;
  const base = ambientTempF * airLag + 32 * (1 - airLag);

  return Math.round(Math.max(33, base - elevationPenalty));
}

// ─── Flow / Clarity Physics ──────────────────────────────────

/**
 * Assess water clarity and safety from discharge data.
 *
 * @param {number|null} dischargeCFS
 * @param {string} [waterBodyType='river'] — 'river' | 'lake' | 'reservoir'
 * @returns {{ clarity: string, flowCategory: string, safeForWading: boolean, reason: string }}
 */
export function assessFlowConditions(dischargeCFS, waterBodyType = 'river') {
  if (dischargeCFS == null) {
    return { clarity: 'unknown', flowCategory: 'unknown', safeForWading: true, reason: 'No flow data available' };
  }

  if (waterBodyType === 'lake' || waterBodyType === 'reservoir') {
    return {
      clarity: dischargeCFS > 500 ? 'stained' : 'clear',
      flowCategory: 'stillwater',
      safeForWading: true,
      reason: dischargeCFS > 500
        ? `Inflow ${dischargeCFS} CFS — possible turbidity from runoff`
        : `Low inflow (${dischargeCFS} CFS) — lake clarity likely good`,
    };
  }

  // River flow thresholds (calibrated for typical Utah rivers)
  if (dischargeCFS > 2000) {
    return {
      clarity: 'blown out',
      flowCategory: 'dangerous',
      safeForWading: false,
      reason: `Dangerous flow: ${dischargeCFS} CFS. River likely brown and unfishable. Do not wade.`,
    };
  }
  if (dischargeCFS > 1000) {
    return {
      clarity: 'stained',
      flowCategory: 'high',
      safeForWading: false,
      reason: `High water: ${dischargeCFS} CFS. Stained/muddy. Bank fishing only.`,
    };
  }
  if (dischargeCFS > 400) {
    return {
      clarity: 'slightly off-color',
      flowCategory: 'moderate',
      safeForWading: true,
      reason: `Moderate flow: ${dischargeCFS} CFS. Wadeable with caution, clarity fair.`,
    };
  }
  if (dischargeCFS > 100) {
    return {
      clarity: 'clear',
      flowCategory: 'ideal',
      safeForWading: true,
      reason: `Ideal flow: ${dischargeCFS} CFS. Clear water, easy wading.`,
    };
  }
  return {
    clarity: 'clear/low',
    flowCategory: 'low',
    safeForWading: true,
    reason: `Low flow: ${dischargeCFS} CFS. Fish may concentrate in deeper pools.`,
  };
}

// ─── Ecological Hatch / Activity Estimation ──────────────────

function estimateHatchActivity(waterTempF) {
  if (waterTempF == null) return { hatch: 'unknown', feedingActivity: 'unknown' };

  if (waterTempF < 39) {
    return { hatch: 'midges (sparse)', feedingActivity: 'very low — fish lethargic in cold water' };
  }
  if (waterTempF < 45) {
    return { hatch: 'blue-winged olives, midges', feedingActivity: 'low — slow nymphing recommended' };
  }
  if (waterTempF < 55) {
    return { hatch: 'blue-winged olives, caddis starting', feedingActivity: 'moderate — subsurface feeding' };
  }
  if (waterTempF < 62) {
    return { hatch: 'PMDs, caddis, golden stones', feedingActivity: 'high — active surface feeding' };
  }
  if (waterTempF < 68) {
    return { hatch: 'caddis, PMDs, terrestrials', feedingActivity: 'high — aggressive feeding window' };
  }
  if (waterTempF < 72) {
    return { hatch: 'terrestrials, caddis (evening)', feedingActivity: 'moderate — fish stressed, dawn/dusk best' };
  }
  return { hatch: 'minimal — water too warm', feedingActivity: 'very low — trout in thermal refugia. Bass may be active.' };
}

// ─── Step 2: The 2-Tier Orchestrator ─────────────────────────

/**
 * Generate a complete ecological/fishery profile for a coordinate.
 *
 * Tier 1: Live USGS gauge data (water temp, flow, gauge height).
 * Tier 2: Elevation + ambient temp inference when no gauge exists.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [elevation=4500] — Approximate elevation in feet
 * @param {{ ambientTemp?: number, waterBodyType?: string }} [currentWeatherData={}]
 * @returns {Promise<EcologicalProfile>}
 */
export async function generateFisheryProfile(lat, lng, elevation = 4500, currentWeatherData = {}) {
  const ambientTemp = currentWeatherData.ambientTemp ?? null;
  const waterBodyType = currentWeatherData.waterBodyType ?? 'river';

  // ── Tier 1: Live USGS gauge data ──
  const usgs = await fetchNearestUSGSData(lat, lng, 15);

  let waterTemp;
  let dataSource;

  if (usgs?.waterTemp != null) {
    waterTemp = usgs.waterTemp;
    dataSource = `USGS Live Gauge (Site ${usgs.siteId} — ${usgs.siteName}, ${usgs.distanceMiles} mi)`;
  } else {
    // ── Tier 2: Fallback inference ──
    waterTemp = inferWaterTemp(elevation, ambientTemp);
    dataSource = 'Elevation/Thermal Inference';
  }

  // ── Flow physics ──
  const flow = assessFlowConditions(usgs?.dischargeCFS ?? null, waterBodyType);

  // Override clarity if USGS reports extreme discharge
  if (usgs?.dischargeCFS != null && usgs.dischargeCFS > 1000 && waterBodyType === 'river') {
    flow.clarity = 'stained/blown out';
    flow.reason = `USGS reports ${usgs.dischargeCFS} CFS — river likely muddy and high. ${flow.reason}`;
  }

  // ── Hatch / feeding intelligence ──
  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  // ── Thermal stress assessment ──
  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  return {
    coordinates: { lat, lng },
    elevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource,

    // USGS gauge details (null if inference was used)
    usgsGauge: usgs ? {
      siteId: usgs.siteId,
      siteName: usgs.siteName,
      distanceMiles: usgs.distanceMiles,
      dischargeCFS: usgs.dischargeCFS,
      gaugeHeightFt: usgs.gaugeHeightFt,
    } : null,

    // Flow / clarity
    ...flow,

    // Ecology
    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    // Ambient context
    ambientTemp,
    waterBodyType,

    generatedAt: new Date().toISOString(),
  };
}

export const AquaticIntelligenceEngine = {
  fetchNearestUSGSData,
  inferWaterTemp,
  assessFlowConditions,
  generateFisheryProfile,
};
