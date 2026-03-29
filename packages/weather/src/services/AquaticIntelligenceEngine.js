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

// ─── Known Water Bodies (coordinates + metadata) ────────────
const KNOWN_WATER_BODIES = [
  { id: 'strawberry',     name: 'Strawberry Reservoir', lat: 40.17, lng: -111.12, radiusMi: 5, type: 'reservoir', elevation: 7600, species: ['Cutthroat Trout', 'Kokanee Salmon', 'Rainbow Trout'], regulations: 'Cutthroat slot limit active (15-22" must be released)', targetDepth: '15-30 ft (thermocline zone)', forage: 'Utah Chub, Chironomids, Scuds' },
  { id: 'deer-creek',     name: 'Deer Creek Reservoir', lat: 40.40, lng: -111.51, radiusMi: 3, type: 'reservoir', elevation: 5400, species: ['Walleye', 'Brown Trout', 'Yellow Perch', 'Smallmouth Bass'], regulations: 'Walleye limit 10, only 1 over 24"', targetDepth: '18-30 ft (summer thermocline)', forage: 'Threadfin Shad, Crayfish, Perch' },
  { id: 'jordanelle',     name: 'Jordanelle Reservoir', lat: 40.60, lng: -111.42, radiusMi: 3, type: 'reservoir', elevation: 6200, species: ['Smallmouth Bass', 'Brown Trout', 'Yellow Perch', 'Splake'], regulations: 'Bass limit 6, only 1 over 12"', targetDepth: '18-30 ft (rocky structure)', forage: 'Crayfish, Yellow Perch, Sculpin' },
  { id: 'utah-lake',      name: 'Utah Lake',            lat: 40.23, lng: -111.80, radiusMi: 8, type: 'lake',      elevation: 4489, species: ['Channel Catfish', 'White Bass', 'Walleye', 'Carp'], regulations: 'No limit on carp. Walleye limit 10', targetDepth: '6-14 ft (entire lake is shallow)', forage: 'Gizzard Shad, Carp, Utah Sucker' },
  { id: 'flaming-gorge',  name: 'Flaming Gorge Reservoir', lat: 40.91, lng: -109.42, radiusMi: 8, type: 'reservoir', elevation: 6040, species: ['Lake Trout', 'Kokanee Salmon', 'Rainbow Trout', 'Smallmouth Bass'], regulations: 'Lake trout limit 8, no size restriction (removal encouraged)', targetDepth: '40-80 ft (summer), 20-40 ft (spring/fall)', forage: 'Kokanee Salmon, Crayfish, Utah Chub' },
  { id: 'bear-lake',      name: 'Bear Lake',            lat: 41.95, lng: -111.33, radiusMi: 6, type: 'lake',      elevation: 5924, species: ['Bonneville Cutthroat', 'Lake Trout', 'Bonneville Cisco'], regulations: 'Cutthroat limit 2. Cisco dip-netting in Jan', targetDepth: '30-60 ft (summer)', forage: 'Bonneville Cisco, Bonneville Whitefish, Sculpin' },
  { id: 'lake-powell',    name: 'Lake Powell',          lat: 37.07, lng: -111.25, radiusMi: 15, type: 'reservoir', elevation: 3700, species: ['Striped Bass', 'Largemouth Bass', 'Smallmouth Bass', 'Walleye', 'Crappie'], regulations: 'No limit on striped bass (removal encouraged)', targetDepth: '15-40 ft (follow shad schools)', forage: 'Threadfin Shad, Gizzard Shad, Crayfish' },
  { id: 'pineview',       name: 'Pineview Reservoir',   lat: 41.26, lng: -111.80, radiusMi: 3, type: 'reservoir', elevation: 4900, species: ['Tiger Muskie', 'Largemouth Bass', 'Yellow Perch', 'Bluegill'], regulations: 'Tiger muskie limit 1, must be over 40"', targetDepth: '10-25 ft (weed edges)', forage: 'Yellow Perch, Utah Chub, Bluegill' },
  { id: 'willard-bay',    name: 'Willard Bay Reservoir',lat: 41.38, lng: -112.08, radiusMi: 4, type: 'reservoir', elevation: 4200, species: ['Wiper', 'Walleye', 'Channel Catfish', 'Crappie'], regulations: 'Wiper limit 6', targetDepth: '8-20 ft (along dikes)', forage: 'Gizzard Shad, Crayfish' },
  { id: 'starvation',     name: 'Starvation Reservoir', lat: 40.19, lng: -110.45, radiusMi: 3, type: 'reservoir', elevation: 5700, species: ['Walleye', 'Brown Trout', 'Yellow Perch', 'Smallmouth Bass'], regulations: 'Walleye limit 6', targetDepth: '15-30 ft (old river channel)', forage: 'Yellow Perch, Utah Chub, Crayfish' },
  { id: 'yuba',           name: 'Yuba Reservoir',       lat: 39.42, lng: -111.90, radiusMi: 4, type: 'reservoir', elevation: 5100, species: ['Northern Pike', 'Tiger Muskie', 'Walleye', 'Wiper', 'Yellow Perch'], regulations: 'No limit on northern pike', targetDepth: '10-25 ft (weed edges)', forage: 'Utah Chub, Yellow Perch, Crayfish' },
  { id: 'scofield',       name: 'Scofield Reservoir',   lat: 39.78, lng: -111.13, radiusMi: 3, type: 'reservoir', elevation: 7600, species: ['Cutthroat Trout', 'Tiger Trout', 'Rainbow Trout'], regulations: 'Trout limit 4', targetDepth: '15-25 ft (thermocline)', forage: 'Chironomids, Utah Chub, Scuds' },
  { id: 'sand-hollow',    name: 'Sand Hollow Reservoir',lat: 37.11, lng: -113.38, radiusMi: 3, type: 'reservoir', elevation: 3000, species: ['Largemouth Bass', 'Bluegill', 'Crappie'], regulations: 'Bass limit 6', targetDepth: '10-25 ft (sandstone ledges)', forage: 'Bluegill, Crayfish' },
];

/**
 * Identify if a coordinate is within a known lake/reservoir.
 * Returns the water body profile or null if no match.
 */
export function identifyWaterBody(lat, lng) {
  let closest = null;
  let closestDist = Infinity;

  for (const wb of KNOWN_WATER_BODIES) {
    const dist = haversine([lat, lng], [wb.lat, wb.lng]);
    if (dist <= wb.radiusMi && dist < closestDist) {
      closestDist = dist;
      closest = wb;
    }
  }
  return closest ? { ...closest, distanceMiles: Math.round(closestDist * 10) / 10 } : null;
}

// ─── Reverse Geocode: Identify water body type via OSM ───────

const OCEAN_TYPES = new Set(['ocean', 'sea', 'bay', 'strait', 'gulf', 'coastline']);

export async function reverseGeocodeWater(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&namedetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UtahWaterGlass/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.error) return null;

    const addr = data.address || {};
    const typeStr = (data.type || '').toLowerCase();
    const classStr = (data.class || '').toLowerCase();
    const displayName = (data.display_name || '').toLowerCase();
    const nameStr = (data.name || '').toLowerCase();

    // Build a wide search string from all available fields
    const combined = `${typeStr} ${classStr} ${displayName} ${nameStr} ${addr.natural || ''} ${addr.water || ''}`.toLowerCase();

    // Detect ocean/sea/bay/gulf/strait
    if (addr.ocean || addr.sea) {
      return { isLake: false, isOcean: true, isRiver: false,
        name: addr.ocean || addr.sea || data.name || 'Ocean' };
    }
    for (const key of OCEAN_TYPES) {
      if (combined.includes(key)) {
        return { isLake: false, isOcean: true, isRiver: false,
          name: addr.ocean || addr.sea || addr.bay || data.name || displayName.split(',')[0] || 'Ocean' };
      }
    }

    // Detect lake/reservoir/pond
    if (combined.includes('lake') || combined.includes('reservoir') || combined.includes('pond') || combined.includes('lago')) {
      const bestName = addr.water || data.name || displayName.split(',')[0] || 'Unknown Lake';
      return { isLake: true, isOcean: false, isRiver: false, name: bestName };
    }

    // Default: assume river/land
    return {
      isLake: false,
      isOcean: false,
      isRiver: true,
      name: addr.water || addr.river || data.name || null,
    };
  } catch {
    return null;
  }
}

// ─── Marine Telemetry via Open-Meteo ─────────────────────────

export async function fetchMarineTelemetry(lat, lng) {
  try {
    // Use only documented Open-Meteo Marine parameters
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period&current=wave_height,wave_period,wave_direction&daily=wave_height_max,wave_period_max&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.error) return null;

    const current = data.current || {};
    const daily = data.daily || {};

    // Prefer "current" block (most recent observation), fall back to hourly
    let waveHeightM = current.wave_height;
    let wavePeriodS = current.wave_period;

    if (waveHeightM == null) {
      const hourly = data.hourly || {};
      const len = (hourly.wave_height || []).length;
      const nowIdx = Math.min(new Date().getUTCHours(), len - 1);
      waveHeightM = hourly.wave_height?.[nowIdx] ?? null;
      wavePeriodS = hourly.wave_period?.[nowIdx] ?? null;
    }

    return {
      waveHeightFt: waveHeightM != null ? Math.round(waveHeightM * 3.281 * 10) / 10 : null,
      wavePeriodS: wavePeriodS ?? null,
      waveDirection: current.wave_direction ?? null,
      currentVelocity: null,
      seaSurfaceTempF: null,
      maxWaveHeightFt: daily.wave_height_max?.[0] != null
        ? Math.round(daily.wave_height_max[0] * 3.281 * 10) / 10 : null,
    };
  } catch {
    return null;
  }
}

// ─── Dynamic Bio Profile via /api/biology ────────────────────

async function fetchDynamicBioProfile(name, lat, lng, type = 'lake') {
  try {
    const params = new URLSearchParams({ name, lat: String(lat), lng: String(lng), type });
    const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.PROD
      ? '' : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN) || '';
    const res = await fetch(`${baseUrl}/api/biology?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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

  // ── Tier 0: Hardcoded known Utah lakes (fastest, no network) ──
  const lakeMatch = identifyWaterBody(lat, lng);
  if (lakeMatch) {
    return buildLakeProfile(lakeMatch, elevation, ambientTemp);
  }

  // ── Tier 1: Reverse geocode to determine water body type ──
  const geo = await reverseGeocodeWater(lat, lng);

  // ── Ocean / Sea path ──
  if (geo?.isOcean) {
    return buildOceanProfile(lat, lng, geo.name, ambientTemp);
  }

  // ── Unknown lake (not in hardcoded list) — try dynamic bio ──
  if (geo?.isLake && geo.name) {
    return buildDynamicLakeProfile(lat, lng, geo.name, elevation, ambientTemp);
  }

  // ── Tier 2: Geocoder returned null or river. Probe USGS + Marine in parallel
  //    to determine if this is a river (has USGS gauge) or open water (has waves). ──
  const [usgs, marine] = await Promise.all([
    fetchNearestUSGSData(lat, lng, 15),
    fetchMarineTelemetry(lat, lng),
  ]);

  // If marine API returned wave data but no USGS gauge → open water
  const hasMarineData = marine && (marine.waveHeightFt != null || marine.maxWaveHeightFt != null);
  if (hasMarineData && !usgs) {
    const oceanName = geo?.name || 'Ocean';
    return buildOceanProfile(lat, lng, oceanName, ambientTemp);
  }

  // ── River/Stream fallback (pass pre-fetched USGS to avoid duplicate call) ──
  return buildRiverProfileWithData(lat, lng, elevation, ambientTemp, usgs);
}

function buildLakeProfile(lake, elevation, ambientTemp) {
  const effectiveElevation = lake.elevation || elevation;
  const waterTemp = inferWaterTemp(effectiveElevation, ambientTemp);

  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  const month = new Date().getMonth() + 1;
  const season = month <= 3 || month >= 11 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';

  return {
    coordinates: { lat: lake.lat, lng: lake.lng },
    elevation: effectiveElevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: `Lake Intelligence — ${lake.name}`,
    waterType: 'lake',

    lakeIntel: {
      id: lake.id,
      name: lake.name,
      species: lake.species,
      targetDepth: lake.targetDepth,
      regulations: lake.regulations,
      forage: lake.forage,
      distanceMiles: lake.distanceMiles,
      season,
    },

    usgsGauge: null,

    clarity: 'clear',
    flowCategory: 'stillwater',
    safeForWading: true,
    reason: `${lake.name} — stillwater fishery. Target ${lake.targetDepth}.`,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: lake.type,
    generatedAt: new Date().toISOString(),
  };
}

async function buildOceanProfile(lat, lng, name, ambientTemp) {
  const [marine, bio] = await Promise.all([
    fetchMarineTelemetry(lat, lng),
    fetchDynamicBioProfile(name, lat, lng, 'ocean'),
  ]);

  // SST not available from Open-Meteo Marine — use lat-based estimation
  const waterTemp = inferWaterTemp(0, ambientTemp);

  return {
    coordinates: { lat, lng },
    elevation: 0,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: marine?.waveHeightFt != null ? `Open-Meteo Marine — ${name}` : `Thermal Inference — ${name}`,
    waterType: 'ocean',

    oceanData: {
      name,
      waveHeightFt: marine?.waveHeightFt ?? null,
      wavePeriodS: marine?.wavePeriodS ?? null,
      waveDirection: marine?.waveDirection ?? null,
      maxWaveHeightFt: marine?.maxWaveHeightFt ?? null,
      currentVelocity: marine?.currentVelocity ?? null,
      seaSurfaceTempF: null,
    },

    lakeIntel: bio ? {
      name,
      species: bio.species ? (Array.isArray(bio.species) ? bio.species : bio.species.split(', ')) : [],
      targetDepth: bio.targetDepth || null,
      regulations: bio.regulations || null,
      forage: bio.forage || null,
    } : { name, species: [], targetDepth: null, regulations: null, forage: null },

    usgsGauge: null,

    clarity: 'clear',
    flowCategory: 'ocean',
    safeForWading: true,
    reason: marine?.waveHeightFt > 6
      ? `Large swell (${marine.waveHeightFt} ft) — exercise caution near shore`
      : `${name} — marine environment`,

    hatch: bio?.forage || 'Baitfish, crustaceans, plankton',
    feedingActivity: waterTemp > 75 ? 'high — warm water, active pelagics' : waterTemp > 60 ? 'moderate — temperate zone feeding' : 'low — cold water, bottom dwellers active',
    thermalStress: 'none',
    thermalAdvice: null,

    ambientTemp,
    waterBodyType: 'ocean',
    generatedAt: new Date().toISOString(),
  };
}

async function buildDynamicLakeProfile(lat, lng, name, elevation, ambientTemp) {
  const [bio, usgs] = await Promise.all([
    fetchDynamicBioProfile(name, lat, lng),
    fetchNearestUSGSData(lat, lng, 15),
  ]);

  const waterTemp = usgs?.waterTemp ?? inferWaterTemp(elevation, ambientTemp);
  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

  let thermalStress = 'none';
  let thermalAdvice = null;
  if (waterTemp >= 68) {
    thermalStress = 'critical';
    thermalAdvice = 'Water temperature is stressful to trout. Avoid catch-and-release in afternoon. Fish early morning or switch to warm-water species.';
  } else if (waterTemp >= 64) {
    thermalStress = 'elevated';
    thermalAdvice = 'Water warming — trout may be sluggish mid-afternoon. Best fishing at dawn/dusk.';
  }

  const month = new Date().getMonth() + 1;
  const season = month <= 3 || month >= 11 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';

  return {
    coordinates: { lat, lng },
    elevation,
    waterTemp,
    waterTempUnit: '°F',
    dataSource: bio ? `AI Synthesized Lake Profile — ${name}` : (usgs ? `USGS + Inference — ${name}` : `Thermal Inference — ${name}`),
    waterType: 'lake',

    lakeIntel: {
      name,
      species: bio?.species ? (Array.isArray(bio.species) ? bio.species : bio.species.split(', ')) : [],
      targetDepth: bio?.targetDepth || null,
      regulations: bio?.regulations || null,
      forage: bio?.forage || null,
      season,
    },

    usgsGauge: usgs ? {
      siteId: usgs.siteId,
      siteName: usgs.siteName,
      distanceMiles: usgs.distanceMiles,
      dischargeCFS: usgs.dischargeCFS,
      gaugeHeightFt: usgs.gaugeHeightFt,
    } : null,

    clarity: 'clear',
    flowCategory: 'stillwater',
    safeForWading: true,
    reason: `${name} — stillwater fishery.${bio?.targetDepth ? ` Target ${bio.targetDepth}.` : ''}`,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: 'lake',
    generatedAt: new Date().toISOString(),
  };
}

async function buildRiverProfile(lat, lng, elevation, ambientTemp) {
  return buildRiverProfileWithData(lat, lng, elevation, ambientTemp, null);
}

async function buildRiverProfileWithData(lat, lng, elevation, ambientTemp, prefetchedUsgs) {
  const usgs = prefetchedUsgs ?? await fetchNearestUSGSData(lat, lng, 15);

  let waterTemp;
  let dataSource;

  if (usgs?.waterTemp != null) {
    waterTemp = usgs.waterTemp;
    dataSource = `USGS Live Gauge (Site ${usgs.siteId} — ${usgs.siteName}, ${usgs.distanceMiles} mi)`;
  } else {
    waterTemp = inferWaterTemp(elevation, ambientTemp);
    dataSource = 'Elevation/Thermal Inference';
  }

  const flow = assessFlowConditions(usgs?.dischargeCFS ?? null, 'river');

  if (usgs?.dischargeCFS != null && usgs.dischargeCFS > 1000) {
    flow.clarity = 'stained/blown out';
    flow.reason = `USGS reports ${usgs.dischargeCFS} CFS — river likely muddy and high. ${flow.reason}`;
  }

  const { hatch, feedingActivity } = estimateHatchActivity(waterTemp);

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
    waterType: 'river',

    lakeIntel: null,

    usgsGauge: usgs ? {
      siteId: usgs.siteId,
      siteName: usgs.siteName,
      distanceMiles: usgs.distanceMiles,
      dischargeCFS: usgs.dischargeCFS,
      gaugeHeightFt: usgs.gaugeHeightFt,
    } : null,

    ...flow,

    hatch,
    feedingActivity,
    thermalStress,
    thermalAdvice,

    ambientTemp,
    waterBodyType: 'river',
    generatedAt: new Date().toISOString(),
  };
}

export const AquaticIntelligenceEngine = {
  fetchNearestUSGSData,
  inferWaterTemp,
  assessFlowConditions,
  generateFisheryProfile,
  identifyWaterBody,
  reverseGeocodeWater,
  fetchMarineTelemetry,
};
