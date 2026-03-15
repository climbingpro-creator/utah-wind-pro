/**
 * WIND FIELD ENGINE — Physics-Based Wind Propagation Model
 * 
 * Wind is a fluid. This engine models it that way:
 * 
 *   1. STATION NETWORK — directed graph of how wind physically flows
 *      through the Wasatch Front terrain (canyons, gaps, valleys)
 *   2. OBSERVATION — real-time readings from all stations form
 *      a discrete sample of the continuous wind field
 *   3. PROPAGATION — upstream wind events propagate downstream
 *      with terrain-specific delays, attenuation, and channeling
 *   4. SUPERPOSITION — thermal forcing + synoptic flow + canyon
 *      drainage combine at each location
 *   5. LEARNING — backtest-trained weights correct the physics
 *      model with observed translation factors
 * 
 * The engine produces ONE predicted wind speed per location per hour.
 * Activities only affect how that speed is SCORED, never the speed itself.
 * 
 *   Wind Field ─→ [location, hour, speed, gust, direction, confidence]
 *                       ↓
 *   Activity Scoring ─→ [score, label, emoji] (kiting vs boating vs fishing)
 */

import { getHourlyForecast } from './ForecastService';
import { monitorSwings } from './FrontalTrendPredictor';
import { calculateCorrelatedWind } from './CorrelationEngine';
import registry from '../config/mesoRegistry.json';
import trainedWeightsStatic from '../config/trainedWeights.json';
import boatWeightsStatic from '../config/trainedWeights-boating.json';

// Live-learned weights override static JSON when available
let liveWeights = null;

export function setWindFieldLearnedWeights(weights) {
  if (weights && !weights.activity) {
    liveWeights = weights;
    console.log('WindFieldEngine: loaded learned weights v' + (weights.version || '?'));
  }
}

function getTrainedWeights() { return liveWeights || trainedWeightsStatic; }
function getBoatWeights() { return boatWeightsStatic; }

// ─── STATION NETWORK ──────────────────────────────────────────────
// Directed graph: edges define how wind physically flows from
// upstream stations to downstream locations through terrain.
// Each edge encodes the physics: delay, attenuation, channeling.

const STATION_NODES = {
  KSLC:  { name: 'SLC Airport',         lat: 40.7884, lng: -111.9778, elevation: 4226, type: 'synoptic' },
  UTOLY: { name: 'Murray/Olympus',      lat: 40.6461, lng: -111.8297, elevation: 4800, type: 'mid-valley' },
  KPVU:  { name: 'Provo Airport',       lat: 40.2192, lng: -111.7235, elevation: 4497, type: 'synoptic' },
  UTALP: { name: 'Pt of Mountain N',    lat: 40.4477, lng: -111.8971, elevation: 4796, type: 'gateway' },
  FPS:   { name: 'Flight Park South',   lat: 40.4477, lng: -111.8971, elevation: 5202, type: 'gateway' },
  QSF:   { name: 'Spanish Fork Canyon', lat: 40.115,  lng: -111.655,  elevation: 4550, type: 'canyon' },
  SND:   { name: 'Arrowhead/Sundance',  lat: 40.393,  lng: -111.580,  elevation: 8252, type: 'ridge' },
  KHCR:  { name: 'Heber Airport',       lat: 40.482,  lng: -111.429,  elevation: 5637, type: 'valley' },
  KHIF:  { name: 'Hill AFB',            lat: 41.124,  lng: -111.973,  elevation: 4789, type: 'synoptic' },
  CSC:   { name: 'Cascade Peak',        lat: 40.190,  lng: -111.612,  elevation: 10875, type: 'ridge' },
};

// Propagation edges: how wind flows from one station to another
// delay: minutes for wind to travel between stations
// attenuation: fraction of upstream speed that arrives (terrain effect)
// channeling: terrain amplification factor (canyons boost, open terrain neutral)
const PROPAGATION_EDGES = [
  // === NORTH FLOW PATH (Great Salt Lake → Utah Valley) ===
  { from: 'KSLC', to: 'UTOLY', delay: 15, attenuation: 0.85, channeling: 1.0,
    headingRange: [270, 45], description: 'SLC → Mid-Valley (open corridor)' },
  { from: 'UTOLY', to: 'UTALP', delay: 15, attenuation: 0.80, channeling: 1.15,
    headingRange: [270, 45], description: 'Mid-Valley → Point of Mtn (gap compression)' },
  { from: 'UTALP', to: 'KPVU', delay: 20, attenuation: 0.65, channeling: 0.9,
    headingRange: [270, 60], description: 'Point → Provo (valley spreading)' },
  { from: 'KSLC', to: 'UTALP', delay: 35, attenuation: 0.75, channeling: 1.1,
    headingRange: [270, 45], description: 'Direct SLC → Point (full valley transit)' },
  { from: 'KSLC', to: 'KPVU', delay: 50, attenuation: 0.55, channeling: 0.85,
    headingRange: [270, 45], description: 'SLC → Provo (full distance, spreading)' },

  // === THERMAL / SOUTH FLOW PATH ===
  { from: 'KPVU', to: 'FPS', delay: 10, attenuation: 0.90, channeling: 1.0,
    headingRange: [130, 220], description: 'Provo → Flight Park South (short hop)' },
  { from: 'QSF', to: 'KPVU', delay: 25, attenuation: 0.70, channeling: 1.25,
    headingRange: [90, 180], description: 'Canyon → Provo (canyon exit acceleration)' },

  // === DEER CREEK VENTURI PATH ===
  { from: 'KPVU', to: 'KHCR', delay: 45, attenuation: 0.60, channeling: 1.40,
    headingRange: [100, 200], description: 'Provo Canyon venturi (strong channeling)' },
  { from: 'SND', to: 'KHCR', delay: 30, attenuation: 0.75, channeling: 1.20,
    headingRange: [190, 240], description: 'Arrowhead ridge → Heber (downslope)' },

  // === WILLARD BAY GAP ===
  { from: 'KHIF', to: 'KSLC', delay: 30, attenuation: 0.70, channeling: 1.0,
    headingRange: [160, 220], description: 'Hill AFB → SLC (gap wind)' },
];

// Location-to-station mapping: which stations best represent each launch
const LOCATION_STATIONS = {
  'utah-lake-lincoln':  { primary: 'KPVU', secondary: ['FPS', 'QSF'], upstreamNorth: ['KSLC', 'UTALP'], upstreamThermal: ['QSF', 'KPVU'] },
  'utah-lake-sandy':    { primary: 'KPVU', secondary: ['FPS'],        upstreamNorth: ['KSLC', 'UTALP'], upstreamThermal: ['KPVU'] },
  'utah-lake-vineyard': { primary: 'KPVU', secondary: ['FPS'],        upstreamNorth: ['KSLC', 'UTALP'], upstreamThermal: ['KPVU'] },
  'utah-lake-zigzag':   { primary: 'FPS',  secondary: ['UTALP','KPVU'], upstreamNorth: ['KSLC', 'UTOLY', 'UTALP'], upstreamThermal: ['QSF'] },
  'utah-lake-mm19':     { primary: 'QSF',  secondary: ['KPVU','FPS'], upstreamNorth: ['KSLC', 'UTALP'], upstreamThermal: ['QSF'] },
  'deer-creek':         { primary: 'KHCR', secondary: ['SND'],        upstreamNorth: ['KSLC'],           upstreamThermal: ['KPVU', 'SND'] },
  'willard-bay':        { primary: 'KHIF', secondary: [],             upstreamNorth: ['KSLC'],           upstreamThermal: ['KHIF'] },
  'strawberry-ladders': { primary: 'KHCR', secondary: ['CRU1'],       upstreamNorth: ['KSLC'],           upstreamThermal: ['KHCR', 'SBDU1'] },
  'strawberry-bay':     { primary: 'KHCR', secondary: ['CRU1'],       upstreamNorth: ['KSLC'],           upstreamThermal: ['KHCR'] },
  'strawberry-soldier': { primary: 'CRU1', secondary: ['KHCR'],       upstreamNorth: ['KSLC'],           upstreamThermal: ['CRU1'] },
  'skyline-drive':      { primary: 'UFCU1', secondary: ['EPHU1'],     upstreamNorth: ['KSLC'],           upstreamThermal: ['UFCU1'] },
};

// ─── DAYLIGHT ─────────────────────────────────────────────────────
const DAYLIGHT = {
  0: { rise: 7.5, set: 17.5 },  1: { rise: 7.2, set: 18.0 },
  2: { rise: 7.5, set: 19.3 },  3: { rise: 6.7, set: 19.8 },
  4: { rise: 6.1, set: 20.3 },  5: { rise: 5.8, set: 20.8 },
  6: { rise: 6.0, set: 21.0 },  7: { rise: 6.3, set: 20.5 },
  8: { rise: 7.0, set: 19.5 },  9: { rise: 7.3, set: 18.5 },
  10: { rise: 7.0, set: 17.2 }, 11: { rise: 7.3, set: 17.1 },
};

function isDaylightHour(hour) {
  const month = new Date().getMonth();
  const { rise, set } = DAYLIGHT[month];
  return hour >= Math.floor(rise) && hour < Math.ceil(set);
}

// ─── THERMAL CYCLE MODEL ──────────────────────────────────────────
// Models the diurnal heating cycle that drives lake thermals.
// NOT arbitrary — based on backtested solar heating patterns.

function getThermalCurve(hour, startH, peakH, endH) {
  if (hour < startH - 1) return { mult: 0.1, phase: 'pre-dawn' };
  if (hour < startH)     return { mult: 0.25, phase: 'building' };

  if (hour <= peakH) {
    const progress = (hour - startH) / Math.max(1, peakH - startH);
    return { mult: 0.4 + progress * 0.6, phase: 'building' };
  }

  if (hour <= peakH + 2) return { mult: 1.0, phase: 'peak' };

  if (hour < endH) {
    const decay = (hour - peakH - 2) / Math.max(1, endH - peakH - 2);
    return { mult: Math.max(0.2, 1.0 - decay * 0.8), phase: 'fading' };
  }

  return { mult: 0.1, phase: 'evening' };
}

// ─── PROPAGATION PHYSICS ──────────────────────────────────────────

function isInHeadingRange(dir, range) {
  if (dir == null || !range) return false;
  const [min, max] = range;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

/**
 * Calculate how much upstream wind reaches a downstream location.
 * Uses real observations to validate/correct the physics model.
 * 
 * Translation factor = observed_lake_speed / observed_upstream_speed
 * This is the KEY learned parameter — it tells us what terrain actually does.
 */
function calculateTranslationFactor(currentWind, upstreamReadings) {
  const lakeSpeed = currentWind?.speed;
  if (lakeSpeed == null) return { factor: 0.55, confidence: 'default', source: 'no-lake-data' };

  let bestUpstream = 0;
  let upstreamSource = null;

  for (const [id, reading] of Object.entries(upstreamReadings)) {
    if (reading?.speed > bestUpstream) {
      bestUpstream = reading.speed;
      upstreamSource = id;
    }
  }

  if (bestUpstream < 3) return { factor: 0.55, confidence: 'default', source: 'calm-upstream' };

  const observed = lakeSpeed / bestUpstream;
  const factor = Math.min(1.0, Math.max(0.1, observed));
  
  let confidence = 'high';
  if (bestUpstream < 5) confidence = 'medium';
  if (Math.abs(lakeSpeed - bestUpstream) < 2) confidence = 'high';

  const blocked = factor < 0.35;
  const translating = factor >= 0.6;

  return {
    factor,
    confidence,
    source: upstreamSource,
    blocked,
    translating,
    upstreamSpeed: bestUpstream,
    lakeSpeed,
    description: blocked ? 'Upstream wind blocked by terrain'
      : translating ? 'Wind reaching lake surface'
      : 'Partial translation through terrain'
  };
}

/**
 * Find all propagation paths from upstream stations to a target location.
 * Returns edges sorted by priority (shorter delay = more relevant).
 */
function findPropagationPaths(locationId) {
  const locConfig = LOCATION_STATIONS[locationId];
  if (!locConfig) return [];

  const targets = new Set([locConfig.primary, ...locConfig.secondary]);
  const upstream = new Set([...locConfig.upstreamNorth, ...locConfig.upstreamThermal]);

  return PROPAGATION_EDGES.filter(edge => 
    upstream.has(edge.from) && (targets.has(edge.to) || upstream.has(edge.to))
  ).sort((a, b) => a.delay - b.delay);
}

/**
 * Calculate wind arriving at a location from all upstream sources at a future hour.
 * This is the core fluid propagation — superposition of multiple wave fronts.
 */
function propagateToLocation(locationId, forecastHour, currentHour, stationReadings, translation) {
  const paths = findPropagationPaths(locationId);
  if (paths.length === 0) return { speed: null, direction: null, sources: [] };

  let totalSpeed = 0;
  let totalWeight = 0;
  let dominantDir = null;
  let maxContribution = 0;
  const sources = [];

  for (const edge of paths) {
    const reading = stationReadings[edge.from];
    if (!reading || reading.speed == null || reading.speed < 1) continue;

    const dirMatch = isInHeadingRange(reading.direction, edge.headingRange);
    if (!dirMatch) continue;

    const offset = (forecastHour - currentHour + 24) % 24;
    const edgeDelayHours = edge.delay / 60;

    // Wind arriving NOW was launched `delay` minutes ago
    // Wind launching NOW arrives in `delay` minutes
    // For near-term: current upstream → arrives in delay minutes
    const relevance = offset <= edgeDelayHours / 2
      ? 0.3 // Too soon for this path, wind hasn't arrived yet
      : offset <= edgeDelayHours * 2
        ? 0.8 // In the arrival window
        : offset <= edgeDelayHours * 4
          ? 0.6 // Extended influence
          : 0.3; // Distant future, less certain

    const attenuatedSpeed = reading.speed * edge.attenuation * edge.channeling * translation.factor;
    const weight = relevance * edge.attenuation;

    totalSpeed += attenuatedSpeed * weight;
    totalWeight += weight;

    if (attenuatedSpeed * weight > maxContribution) {
      maxContribution = attenuatedSpeed * weight;
      dominantDir = reading.direction;
    }

    sources.push({
      station: edge.from,
      rawSpeed: reading.speed,
      attenuated: +attenuatedSpeed.toFixed(1),
      delay: edge.delay,
      terrain: edge.description,
    });
  }

  if (totalWeight === 0) return { speed: 0, direction: null, sources: [] };

  return {
    speed: totalSpeed / totalWeight,
    direction: dominantDir,
    sources,
  };
}

// ─── MAIN ENGINE ──────────────────────────────────────────────────

/**
 * Generate a unified wind field forecast for a specific location.
 * Returns 24 hours of predicted wind speeds — ACTIVITY INDEPENDENT.
 * 
 * This is the SINGLE SOURCE OF TRUTH for all wind predictions.
 */
export async function generateWindField(locationId, currentWind = {}, upstreamData = {}, lakeState = {}, mesoData = {}) {
  const now = new Date();
  const currentHour = now.getHours();

  // 1. Gather upstream readings into a unified map
  const stationReadings = buildStationReadings(upstreamData, lakeState, mesoData);

  // 2. Calculate real-time translation factor from observations
  const translation = calculateTranslationFactor(currentWind, stationReadings);

  // 3. Get NWS hourly forecast (regional model, needs translation)
  let nwsHourly = null;
  try { nwsHourly = await getHourlyForecast(locationId); } catch (e) { /* fallback */ }

  // 4. Get thermal prediction from lakeState
  const thermalPred = lakeState?.thermalPrediction;
  const thermalStart = thermalPred?.startHour || 10;
  const thermalPeak = thermalPred?.peakHour || 13;
  const thermalEnd = thermalPred?.endHour || 17;
  const thermalProb = thermalPred?.probability || 50;

  // 5. Load learned hourly patterns
  const tw = getTrainedWeights();
  const bw = getBoatWeights();
  const learnedHourly = tw?.weights?.hourlyMultipliers || liveWeights?.hourlyMultipliers || {};
  const boatHourly = bw?.weights?.glassWindowByHour || {};

  // 6. Correlation engine (spatial multiplier)
  let correlationMultiplier = 1.0;
  let activeTriggers = [];
  try {
    const result = calculateCorrelatedWind(locationId,
      { speed: currentWind.speed, direction: currentWind.direction },
      mesoData, lakeState?.pws
    );
    correlationMultiplier = result?.multiplier || 1.0;
    activeTriggers = result?.activeTriggers || [];
  } catch (e) { /* fallback */ }

  // 7. Frontal/swing detection
  let swingAlerts = [];
  try {
    const kslcHistory = lakeState?.kslcHistory || [];
    if (kslcHistory.length >= 4) {
      swingAlerts = monitorSwings(kslcHistory);
    }
  } catch (e) { /* ignore */ }
  const frontalActive = swingAlerts.some(a => a.id === 'frontal-hit' || a.id === 'wind-shift');

  // 8. Generate unified 24-hour wind field
  const hours = [];

  for (let offset = 0; offset < 24; offset++) {
    const forecastHour = (currentHour + offset) % 24;
    const isToday = (currentHour + offset) < 24;

    // ─── NWS DATA ─────────────────────────────────────────────────
    let nwsWind = null, nwsForecast = null;
    if (nwsHourly) {
      const forecastDate = new Date(now);
      if (!isToday) forecastDate.setDate(forecastDate.getDate() + 1);
      const nwsPeriod = nwsHourly.find(p => {
        const ph = new Date(p.startTime).getHours();
        const pd = new Date(p.startTime).getDate();
        return ph === forecastHour && pd === forecastDate.getDate();
      });
      if (nwsPeriod) {
        nwsWind = nwsPeriod.windSpeed;
        nwsForecast = nwsPeriod.shortForecast;
      }
    }

    // ─── LEARNED PATTERNS ─────────────────────────────────────────
    const learnedMult = learnedHourly[forecastHour] || 1.0;
    const boatLearned = boatHourly[forecastHour] || {};

    // ─── THERMAL CYCLE ────────────────────────────────────────────
    const thermal = getThermalCurve(forecastHour, thermalStart, thermalPeak, thermalEnd);

    // ─── WIND SPEED CALCULATION ───────────────────────────────────
    // ONE speed per hour. Period. Wind doesn't care what sport you play.
    let speed, confidence, source;

    if (offset === 0 && currentWind.speed != null) {
      // HOUR 0: Ground truth — use actual observed data
      speed = currentWind.speed;
      confidence = 'observed';
      source = 'live';
    } else {
      // COMPONENT 1: Thermal forcing (local, no translation needed)
      // Solar heating creates pressure differential → lake breeze
      const thermalSpeed = thermal.mult * (thermalProb / 100) * 18 * learnedMult;

      // COMPONENT 2: Synoptic flow (NWS, needs translation)
      // Regional weather model → discount by what actually reaches the lake
      const synopticSpeed = nwsWind != null ? nwsWind * translation.factor : 0;

      // COMPONENT 3: Propagated upstream (physics-based)
      // What's the actual wind arriving from upstream stations right now?
      const propagated = propagateToLocation(locationId, forecastHour, currentHour, stationReadings, translation);
      const propagatedSpeed = propagated.speed || 0;

      // COMPONENT 4: Historical hourly average (learned baseline)
      const historicalAvg = boatLearned.avgSpeed || 5;

      // ─── BLENDING STRATEGY ────────────────────────────────────
      // Near-term (0-3hr): anchor heavily to current + propagation
      // Mid-term (3-8hr): blend thermal cycle + NWS + propagation
      // Extended (8-24hr): NWS + thermal cycle + historical

      if (offset <= 3 && currentWind.speed != null) {
        // NEAR-TERM: Current conditions + propagation
        // If the lake is glass and upstream is active but blocked, stay glass
        const anchorWeight = translation.blocked
          ? Math.max(0.25, 0.70 - offset * 0.15)    // Heavy anchor when blocked
          : Math.max(0.10, 0.50 - offset * 0.13);   // Lighter anchor when flowing

        const bestForecast = Math.max(thermalSpeed, synopticSpeed, propagatedSpeed);
        speed = currentWind.speed * anchorWeight + bestForecast * (1 - anchorWeight);
      } else if (offset <= 8) {
        // MID-TERM: Best signal wins, blended with propagation
        const signals = [thermalSpeed, synopticSpeed, propagatedSpeed].filter(s => s > 0);
        const bestSignal = signals.length > 0 ? Math.max(...signals) : historicalAvg;
        const propWeight = propagatedSpeed > 0 ? 0.3 : 0;
        const forecastWeight = 0.7 - propWeight;
        const histWeight = 0.3;
        speed = bestSignal * forecastWeight + propagatedSpeed * propWeight + historicalAvg * histWeight;
      } else {
        // EXTENDED: NWS-heavy, thermal cycle modulation
        const nwsWeight = 0.5;
        const thermalWeight = 0.3;
        const histWeight = 0.2;
        speed = (synopticSpeed || historicalAvg) * nwsWeight
          + thermalSpeed * thermalWeight
          + historicalAvg * histWeight;
      }

      // Apply spatial correlation multiplier (upstream triggers active)
      speed *= correlationMultiplier;

      // Frontal boost for near-term hours
      if (frontalActive && offset <= 6) {
        speed *= 1.15;
      }

      confidence = offset <= 3 ? 'high' : offset <= 8 ? 'medium' : 'low';
      source = 'windfield';
    }

    speed = Math.max(0, speed);
    const gust = speed * (thermal.phase === 'peak' ? 1.25 : 1.15);
    const isLight = isDaylightHour(forecastHour);

    // Cloud cover from NWS
    let cloudCover = null;
    if (nwsForecast) {
      const lf = nwsForecast.toLowerCase();
      if (lf.includes('sunny') || lf.includes('clear')) cloudCover = { icon: '☀️', label: 'Clear' };
      else if (lf.includes('partly')) cloudCover = { icon: '⛅', label: 'Partly Cloudy' };
      else if (lf.includes('cloudy')) cloudCover = { icon: '☁️', label: 'Cloudy' };
      else if (lf.includes('rain') || lf.includes('shower')) cloudCover = { icon: '🌧️', label: 'Rain' };
      else if (lf.includes('storm')) cloudCover = { icon: '⛈️', label: 'Storms' };
      else cloudCover = { icon: '🌤️', label: nwsForecast };
    }

    hours.push({
      hour: forecastHour,
      offset,
      isToday,
      isCurrent: offset === 0,
      isPast: false,
      time: forecastHour === 0 ? '12 AM' : forecastHour === 12 ? '12 PM' : forecastHour > 12 ? `${forecastHour - 12} PM` : `${forecastHour} AM`,
      speed: +speed.toFixed(1),
      gust: +gust.toFixed(1),
      direction: offset === 0 ? currentWind.direction : null,
      nwsSpeed: nwsWind,
      phase: thermal.phase,
      confidence,
      source,
      isLight,
      cloudCover,
    });
  }

  return {
    locationId,
    hours,
    translation,
    activeTriggers,
    swingAlerts,
    frontalActive,
    thermalPrediction: { start: thermalStart, peak: thermalPeak, end: thermalEnd, probability: thermalProb },
    stationReadings,
    propagationPaths: findPropagationPaths(locationId),
    generatedAt: now.toISOString(),
  };
}

// ─── STATION READING AGGREGATOR ───────────────────────────────────
// Builds a unified map of current readings from all available sources

function buildStationReadings(upstreamData, lakeState, mesoData) {
  const readings = {};

  // Upstream data (passed in from Dashboard)
  if (upstreamData.kslcSpeed != null) {
    readings.KSLC = { speed: upstreamData.kslcSpeed, direction: upstreamData.kslcDirection };
  }
  if (upstreamData.kpvuSpeed != null) {
    readings.KPVU = { speed: upstreamData.kpvuSpeed, direction: upstreamData.kpvuDirection };
  }

  // MesoData (from WeatherService)
  if (mesoData) {
    for (const id of Object.keys(STATION_NODES)) {
      if (readings[id]) continue;
      const raw = mesoData[id] || mesoData.stations?.find(s => s.id === id);
      if (raw) {
        readings[id] = {
          speed: raw.speed ?? raw.windSpeed ?? null,
          direction: raw.direction ?? raw.windDirection ?? null,
          gust: raw.gust ?? raw.windGust ?? null,
          temp: raw.temperature ?? raw.temp ?? null,
        };
      }
    }
  }

  // LakeState wind stations
  if (lakeState?.wind?.stations) {
    for (const s of lakeState.wind.stations) {
      if (!readings[s.id]) {
        readings[s.id] = {
          speed: s.speed ?? s.windSpeed ?? null,
          direction: s.direction ?? s.windDirection ?? null,
          gust: s.gust ?? s.windGust ?? null,
        };
      }
    }
  }

  // KSLC/KPVU from lakeState
  if (lakeState?.kslcStation && !readings.KSLC) {
    const k = lakeState.kslcStation;
    readings.KSLC = { speed: k.speed ?? k.windSpeed, direction: k.direction ?? k.windDirection };
  }
  if (lakeState?.kpvuStation && !readings.KPVU) {
    const k = lakeState.kpvuStation;
    readings.KPVU = { speed: k.speed ?? k.windSpeed, direction: k.direction ?? k.windDirection };
  }

  return readings;
}

// ─── EXPORTS FOR CASCADE VISUALIZATION ────────────────────────────

export { STATION_NODES, PROPAGATION_EDGES, LOCATION_STATIONS, isDaylightHour, DAYLIGHT };
