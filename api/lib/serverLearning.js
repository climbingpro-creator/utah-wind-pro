/**
 * SERVER-SIDE LEARNING ENGINE
 * 
 * Runs every 15 minutes via Vercel cron alongside data collection.
 * Completes the full predict → verify → learn loop 24/7, independent of
 * whether any client has the app open.
 *
 * Redis keys used:
 *   pred:{date}:{HH}:{mm}    — predictions made at this timestamp
 *   weights:server            — latest server-computed model weights
 *   accuracy:log              — recent accuracy records (list, capped at 5000)
 *   learning:meta             — metadata: total predictions, cycles, last update
 */

import { getNWSForLake, getNWSFrontMentions } from './nwsForecast.js';

// ── Lake thermal configurations (server-side subset of lakeStations.js) ──
const LAKE_THERMAL = {
  'utah-lake-lincoln':    { dir: [135, 165], peak: [10, 16], station: 'KPVU' },
  'utah-lake-sandy':      { dir: [130, 160], peak: [10, 16], station: 'KPVU' },
  'utah-lake-vineyard':   { dir: [180, 270], peak: [10, 16], station: 'KPVU' },
  'utah-lake-zigzag':     { dir: [135, 165], peak: [10, 16], station: 'FPS' },
  'utah-lake-mm19':       { dir: [120, 160], peak: [10, 16], station: 'UID28' },
  'deer-creek':           { dir: [170, 210], peak: [11, 17], station: 'UTDCD' },
  'jordanelle':           { dir: [180, 230], peak: [11, 17], station: 'KHCR' },
  'willard-bay':          { dir: [170, 220], peak: [11, 17], station: 'KHIF' },
  'bear-lake':            { dir: [250, 320], peak: [12, 18], station: 'BERU1' },
  'strawberry-ladders':   { dir: [260, 340], peak: [10, 16], station: 'UTCOP' },
  'strawberry-bay':       { dir: [220, 280], peak: [10, 16], station: 'UTCOP' },
  'skyline-drive':        { dir: [250, 340], peak: [10, 16], station: 'SKY' },
  'starvation':           { dir: [180, 230], peak: [11, 17], station: 'KVEL' },
  'flaming-gorge':        { dir: [130, 200], peak: [11, 17], station: 'KFGR' },
  'scofield':             { dir: [250, 320], peak: [11, 17], station: 'KPUC' },
  'sand-hollow':          { dir: [200, 250], peak: [10, 17], station: 'KSGU' },
  'lake-powell':          { dir: [180, 270], peak: [10, 18], station: 'KPGA' },
  'rush-lake':            { dir: [170, 210], peak: [10, 18], station: 'KSLC' },
  'potm-south':           { dir: [110, 250], peak: [7, 15],  station: 'FPS' },
  'potm-north':           { dir: [320, 45], peak: [12, 18], station: 'UTALP' },
  'powder-mountain':      { dir: [180, 270], peak: [10, 18], station: 'KOGD' },
  // ── Northern Utah (missing) ──
  'east-canyon':          { dir: [180, 270], peak: [11, 17], station: 'KSLC' },
  'echo':                 { dir: [180, 270], peak: [11, 17], station: 'KSLC' },
  'rockport':             { dir: [180, 270], peak: [11, 17], station: 'KSLC' },
  'pineview':             { dir: [180, 270], peak: [11, 17], station: 'KOGD' },
  'hyrum':                { dir: [180, 270], peak: [11, 17], station: 'KLGU' },
  'monte-cristo':         { dir: [180, 270], peak: [11, 17], station: 'KLGU' },
  // ── Strawberry variants (missing) ──
  'strawberry-soldier':   { dir: [260, 340], peak: [10, 16], station: 'RVZU1' },
  'strawberry-view':      { dir: [220, 280], peak: [10, 16], station: 'UTCOP' },
  'strawberry-river':     { dir: [220, 280], peak: [10, 16], station: 'UTCOP' },
  // ── Central/Eastern (missing) ──
  'steinaker':            { dir: [180, 270], peak: [11, 17], station: 'KVEL' },
  'red-fleet':            { dir: [180, 270], peak: [11, 17], station: 'KVEL' },
  // ── Southern (missing) ──
  'yuba':                 { dir: [150, 240], peak: [10, 16], station: 'KPVU' },
  'otter-creek':          { dir: [150, 240], peak: [10, 16], station: 'KCDC' },
  'fish-lake':            { dir: [150, 240], peak: [10, 16], station: 'KCDC' },
  'minersville':          { dir: [150, 240], peak: [10, 16], station: 'KCDC' },
  'piute':                { dir: [150, 240], peak: [10, 16], station: 'KCDC' },
  'panguitch':            { dir: [150, 240], peak: [10, 16], station: 'KCDC' },
  'quail-creek':          { dir: [150, 240], peak: [10, 16], station: 'KSGU' },
  // ── Parent keys ──
  'utah-lake':            { dir: [135, 165], peak: [10, 16], station: 'KPVU' },
  'strawberry':           { dir: [260, 340], peak: [10, 16], station: 'UTCOP' },
  // ── Provo River ──
  'provo-lower':          { dir: [120, 200], peak: [10, 16], station: 'KPVU' },
  'provo-middle':         { dir: [170, 230], peak: [11, 17], station: 'KHCR' },
  'provo-upper':          { dir: [170, 230], peak: [11, 17], station: 'KHCR' },
  // ── Weber River ──
  'weber-upper':          { dir: [180, 270], peak: [11, 17], station: 'KHCR' },
  'weber-middle':         { dir: [180, 270], peak: [11, 17], station: 'KSLC' },
  'weber-lower':          { dir: [180, 270], peak: [11, 17], station: 'KSLC' },
  // ── Green River ──
  'green-a':              { dir: [200, 340], peak: [11, 17], station: 'KVEL' },
  'green-b':              { dir: [200, 340], peak: [11, 17], station: 'KVEL' },
  'green-c':              { dir: [200, 340], peak: [11, 17], station: 'KVEL' },
  // ── Kite / Paragliding spots (missing) ──
  'grantsville':          { dir: [170, 210], peak: [10, 18], station: 'KSLC' },
  'inspo':                { dir: [110, 250], peak: [7, 15],  station: 'KPVU' },
  'west-mountain':        { dir: [110, 250], peak: [7, 15],  station: 'KPVU' },
  'stockton-bar':         { dir: [170, 210], peak: [10, 18], station: 'KSLC' },
};

// ── Gradient Indicator Pairs ──
// Station pairs whose temperature/pressure differential drives local wind.
// upstreamId is typically the higher-elevation or inland station,
// downstreamId is the lake-shore or dam station.
const GRADIENT_INDICATORS = {
  'deer-creek': [
    {
      id: 'KHCR-UTDCD',
      upstreamId: 'KHCR',     // Heber Airport (valley)
      downstreamId: 'UTDCD',  // Deer Creek Dam (canyon mouth)
      type: 'canyon_gradient',
      tempThreshold: 5,       // °F delta to trigger canyon flow signal
      speedMultiplier: 1.20,
    },
    {
      id: 'TIMU1-SND',
      upstreamId: 'TIMU1',    // Timpanogos Divide (ridge)
      downstreamId: 'SND',    // Arrowhead Summit (ridge)
      type: 'ridge_flow',
      tempThreshold: 8,
      speedMultiplier: 1.35,
    },
  ],
  'willard-bay': [
    {
      id: 'UR328-KHIF',
      upstreamId: 'KHIF',     // Hill AFB / Ogden (inland)
      downstreamId: 'UR328',  // Willard Bay (lakeshore)
      type: 'lake_gradient',
      tempThreshold: 6,
      speedMultiplier: 1.15,
    },
  ],
};

/**
 * Compute temperature + pressure gradient scores for gradient indicator pairs.
 * Returns a map of lakeId → { tempDelta, pressureDelta, gradientScore, activeIndicators }
 */
function computeGradientSignals(currentStations) {
  const results = {};

  for (const [lakeId, pairs] of Object.entries(GRADIENT_INDICATORS)) {
    const lakeSignals = { tempDelta: 0, pressureDelta: 0, gradientScore: 0, activeIndicators: [] };

    for (const pair of pairs) {
      const up = currentStations.find(s => s.stationId === pair.upstreamId);
      const down = currentStations.find(s => s.stationId === pair.downstreamId);
      if (!up || !down) continue;

      let pairScore = 0;
      const detail = { id: pair.id, type: pair.type };

      // Temperature gradient: warmer upstream drives downslope canyon flow
      if (up.temperature != null && down.temperature != null) {
        const tempDiff = up.temperature - down.temperature;
        detail.tempDelta = Math.round(tempDiff * 10) / 10;
        if (Math.abs(tempDiff) >= pair.tempThreshold) {
          pairScore += 25;
        } else if (Math.abs(tempDiff) >= pair.tempThreshold * 0.5) {
          pairScore += 12;
        }
        lakeSignals.tempDelta = Math.max(lakeSignals.tempDelta, Math.abs(tempDiff));
      }

      // Pressure gradient: differential drives air mass movement
      if (up.pressure != null && down.pressure != null) {
        const pressDiff = normalizeToMb(up.pressure) - normalizeToMb(down.pressure);
        detail.pressureDelta = Math.round(pressDiff * 100) / 100;
        if (Math.abs(pressDiff) > 1.5) {
          pairScore += 20;
        } else if (Math.abs(pressDiff) > 0.5) {
          pairScore += 10;
        }
        lakeSignals.pressureDelta = Math.max(lakeSignals.pressureDelta, Math.abs(pressDiff));
      }

      // Wind speed at downstream confirms flow is arriving
      if (down.windSpeed != null && down.windSpeed >= 6) {
        pairScore += 15;
      }

      detail.score = pairScore;
      detail.speedMultiplier = pair.speedMultiplier;
      if (pairScore > 0) lakeSignals.activeIndicators.push(detail);
      lakeSignals.gradientScore = Math.max(lakeSignals.gradientScore, pairScore);
    }

    if (lakeSignals.activeIndicators.length > 0) {
      results[lakeId] = lakeSignals;
    }
  }

  return results;
}

// ── Timezone ──

function toMountainHour(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
  } catch {
    const month = date.getUTCMonth();
    const offset = (month >= 2 && month <= 10) ? 6 : 7;
    return (date.getUTCHours() - offset + 24) % 24;
  }
}

function toMountainMonth(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver', month: 'numeric',
    }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1; // 0-indexed
  } catch {
    return date.getUTCMonth();
  }
}

function normalizeToMb(val) {
  if (val == null) return null;
  return val < 50 ? val * 33.864 : val;
}

// ── Helpers ──

function isInRange(dir, min, max) {
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function isNortherly(dir) {
  return dir >= 315 || dir <= 45;
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function signedAngleDiff(actual, expected) {
  let diff = ((actual - expected) % 360 + 540) % 360 - 180;
  return diff;
}

function circularMidpoint(a, b) {
  const ax = Math.cos(a * Math.PI / 180), ay = Math.sin(a * Math.PI / 180);
  const bx = Math.cos(b * Math.PI / 180), by = Math.sin(b * Math.PI / 180);
  return (Math.atan2(ay + by, ax + bx) * 180 / Math.PI + 360) % 360;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ══════════════════════════════════════════════════════════════
// UPSTREAM FRONT DETECTION NETWORK
//
// Monitors stations far north, west, and southwest of the activity
// zone to detect approaching weather systems hours in advance.
//
// A cold front hitting Pocatello ID at 2 PM with 30mph NW wind
// tells us it will arrive at Utah Lake ~5 hours later.
// A warm SW flow hitting Delta/Wendover tells us pre-frontal
// ramp-up is coming 2-4 hours before it reaches the Wasatch.
// ══════════════════════════════════════════════════════════════

const UPSTREAM_NETWORK = {
  north: [
    { id: 'KPIH', name: 'Pocatello, ID', distMi: 230, bearing: 0,   leadHoursTypical: [4, 7] },
    { id: 'KTWF', name: 'Twin Falls, ID', distMi: 280, bearing: 335, leadHoursTypical: [5, 8] },
    { id: 'KLGU', name: 'Logan, UT',      distMi: 130, bearing: 5,   leadHoursTypical: [2, 4] },
    { id: 'KOGD', name: 'Ogden, UT',      distMi: 60,  bearing: 5,   leadHoursTypical: [1, 2] },
  ],
  west: [
    { id: 'KELY', name: 'Ely, NV',        distMi: 250, bearing: 260, leadHoursTypical: [4, 8] },
    { id: 'KENV', name: 'Wendover, UT',   distMi: 120, bearing: 280, leadHoursTypical: [2, 4] },
  ],
  south: [
    { id: 'KMLF', name: 'Milford, UT',    distMi: 150, bearing: 200, leadHoursTypical: [3, 5] },
    { id: 'KDTA', name: 'Delta, UT',      distMi: 100, bearing: 210, leadHoursTypical: [2, 3] },
    { id: 'KCDC', name: 'Cedar City, UT', distMi: 250, bearing: 190, leadHoursTypical: [4, 6] },
  ],
};

/**
 * Detect frontal signatures at upstream stations.
 * Returns an array of upstream signals with estimated arrival times.
 *
 * Each signal: { stationId, corridor, type, strength, etaHours, details }
 */
function detectUpstreamSignals(currentStations, recentSnapshots) {
  const signals = [];

  for (const [corridor, stations] of Object.entries(UPSTREAM_NETWORK)) {
    for (const upDef of stations) {
      const current = currentStations.find(s => s.stationId === upDef.id);
      if (!current || current.windSpeed == null) continue;

      const history = buildStationHistory(upDef.id, recentSnapshots);
      if (history.length < 2) continue;

      const oldest = history[0];
      const signal = {
        stationId: upDef.id,
        name: upDef.name,
        corridor,
        distMi: upDef.distMi,
        current: {
          speed: current.windSpeed,
          direction: current.windDirection,
          gust: current.windGust,
          temp: current.temperature,
          pressure: current.pressure,
        },
      };

      // ── COLD FRONT DETECTION (north corridor) ──
      if (corridor === 'north') {
        let strength = 0;
        const details = [];

        // Wind shifted to N/NW?
        if (current.windDirection != null && isNortherly(current.windDirection)) {
          strength += 25;
          details.push(`${getCardinal(current.windDirection)} wind at ${current.windSpeed?.toFixed(0)}mph`);
        }

        // Strong wind?
        if (current.windSpeed > 15) {
          strength += 20;
          details.push(`Strong: ${current.windSpeed.toFixed(0)}mph gusting ${current.windGust?.toFixed(0) || '?'}`);
        } else if (current.windSpeed > 10) {
          strength += 10;
        }

        // Temperature drop in recent history?
        if (oldest.temperature != null && current.temperature != null) {
          const tempDrop = oldest.temperature - current.temperature;
          if (tempDrop > 10) {
            strength += 30;
            details.push(`${tempDrop.toFixed(0)}°F temp crash — cold air mass`);
          } else if (tempDrop > 5) {
            strength += 15;
            details.push(`${tempDrop.toFixed(0)}°F cooling`);
          }
        }

        // Pressure dropping?
        if (oldest.pressure != null && current.pressure != null) {
          const pDrop = oldest.pressure - current.pressure;
          if (pDrop > 2) {
            strength += 20;
            details.push(`Pressure fell ${pDrop.toFixed(1)}mb`);
          } else if (pDrop > 1) {
            strength += 10;
            details.push(`Pressure falling ${pDrop.toFixed(1)}mb`);
          }
        }

        // Wind direction shift?
        if (oldest.windDirection != null && current.windDirection != null) {
          const shift = angleDiff(oldest.windDirection, current.windDirection);
          if (shift > 90) {
            strength += 15;
            details.push(`${shift}° wind shift — frontal boundary`);
          }
        }

        if (strength >= 25) {
          // Estimate propagation speed from wind speed + typical front speed
          const frontSpeed = Math.max(20, current.windSpeed * 0.8 + 10);
          const etaHours = upDef.distMi / frontSpeed;

          signals.push({
            ...signal,
            type: 'cold_front',
            strength: Math.min(100, strength),
            etaHours: Math.round(etaHours * 10) / 10,
            etaRange: [
              Math.round(upDef.leadHoursTypical[0] * 10) / 10,
              Math.round(upDef.leadHoursTypical[1] * 10) / 10,
            ],
            frontSpeedMph: Math.round(frontSpeed),
            details,
          });
        }
      }

      // ── PRE-FRONTAL WARM FLOW (south/west corridor) ──
      if (corridor === 'south' || corridor === 'west') {
        let strength = 0;
        const details = [];

        // S/SW/W wind increasing?
        if (current.windDirection != null && current.windDirection >= 160 && current.windDirection <= 280) {
          strength += 20;
          details.push(`${getCardinal(current.windDirection)} flow at ${current.windSpeed?.toFixed(0)}mph`);
        }

        if (current.windSpeed > 12) {
          strength += 15;
          details.push(`Strengthening: ${current.windSpeed.toFixed(0)}mph`);
        }

        // Wind speed increasing in recent history?
        if (oldest.windSpeed != null && current.windSpeed != null) {
          const speedInc = current.windSpeed - oldest.windSpeed;
          if (speedInc > 5) {
            strength += 20;
            details.push(`Wind ramping +${speedInc.toFixed(0)}mph`);
          }
        }

        // Pressure falling? (system approaching)
        if (oldest.pressure != null && current.pressure != null) {
          const pDrop = oldest.pressure - current.pressure;
          if (pDrop > 1) {
            strength += 20;
            details.push(`Pressure falling ${pDrop.toFixed(1)}mb`);
          }
        }

        // Temperature rising? (warm advection ahead of front)
        if (oldest.temperature != null && current.temperature != null) {
          const tempRise = current.temperature - oldest.temperature;
          if (tempRise > 5) {
            strength += 10;
            details.push(`Warming ${tempRise.toFixed(0)}°F — warm advection`);
          }
        }

        if (strength >= 25) {
          const flowSpeed = Math.max(15, current.windSpeed * 0.6 + 10);
          const etaHours = upDef.distMi / flowSpeed;

          signals.push({
            ...signal,
            type: 'pre_frontal_flow',
            strength: Math.min(100, strength),
            etaHours: Math.round(etaHours * 10) / 10,
            etaRange: upDef.leadHoursTypical,
            flowSpeedMph: Math.round(flowSpeed),
            details,
          });
        }
      }

      // ── WEST SYSTEM APPROACH (west corridor specific) ──
      if (corridor === 'west') {
        let strength = 0;
        const details = [];

        // Pressure dropping significantly?
        if (oldest.pressure != null && current.pressure != null) {
          const pDrop = oldest.pressure - current.pressure;
          if (pDrop > 3) {
            strength += 35;
            details.push(`Major pressure drop ${pDrop.toFixed(1)}mb — system approaching`);
          } else if (pDrop > 1.5) {
            strength += 20;
            details.push(`Pressure falling ${pDrop.toFixed(1)}mb`);
          }
        }

        // Wind increasing and gusty?
        if (current.windSpeed > 15 && current.windGust > 20) {
          strength += 20;
          details.push(`Strong gusty wind: ${current.windSpeed.toFixed(0)}G${current.windGust.toFixed(0)}`);
        }

        // Any direction shift?
        if (oldest.windDirection != null && current.windDirection != null) {
          const shift = angleDiff(oldest.windDirection, current.windDirection);
          if (shift > 60) {
            strength += 15;
            details.push(`${shift}° direction shift`);
          }
        }

        if (strength >= 25) {
          const systemSpeed = Math.max(25, current.windSpeed * 0.5 + 15);
          const etaHours = upDef.distMi / systemSpeed;

          signals.push({
            ...signal,
            type: 'approaching_system',
            strength: Math.min(100, strength),
            etaHours: Math.round(etaHours * 10) / 10,
            etaRange: upDef.leadHoursTypical,
            systemSpeedMph: Math.round(systemSpeed),
            details,
          });
        }
      }
    }
  }

  // Calculate consensus ETA if multiple stations agree
  const coldFrontSignals = signals.filter(s => s.type === 'cold_front');
  if (coldFrontSignals.length >= 2) {
    // Triangulate: use distance between triggered stations to refine speed
    const sorted = coldFrontSignals.sort((a, b) => b.distMi - a.distMi);
    const farthest = sorted[0];
    const nearest = sorted[sorted.length - 1];

    if (farthest.distMi > nearest.distMi + 30) {
      // Both detecting = front is between them or past nearest
      // If nearest has stronger signal, front is closer
      const etaConsensus = nearest.strength > farthest.strength
        ? nearest.etaHours * 0.7
        : (nearest.etaHours + farthest.etaHours) / 2;

      for (const s of coldFrontSignals) {
        s.consensusEta = Math.round(etaConsensus * 10) / 10;
        s.multiStationConfirm = true;
        s.details.push(`${coldFrontSignals.length} stations confirm — refined ETA`);
      }
    }
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// ── Wind Event Scoring (mirrors client WindEventPredictor.js) ──

function scoreFrontal(station, pressure, history, upstreamSignals, nws) {
  let score = 0;
  const pTrend = pressure.trend;
  if (pTrend === 'falling') score += 25;
  if ((pressure.gradient ?? 0) < -1.5) score += 20;

  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null) {
      const tempDrop = older.temperature - recent.temperature;
      if (tempDrop > 10) score += 30;
      else if (tempDrop > 5) score += 15;
    }
    if (recent?.windDirection != null && older?.windDirection != null) {
      const shift = angleDiff(older.windDirection, recent.windDirection);
      if (shift > 90) score += 20;
    }
    if (recent?.windGust != null && recent?.windSpeed != null && (recent.windGust - recent.windSpeed) > 12) {
      score += 15;
    }
  }
  if (station.windDirection != null && isNortherly(station.windDirection) && station.windSpeed > 15) {
    score += 20;
  }

  // UPSTREAM BOOST
  const coldFrontSignals = (upstreamSignals || []).filter(s => s.type === 'cold_front');
  if (coldFrontSignals.length > 0) {
    const strongest = coldFrontSignals[0];
    const upstreamBoost = Math.min(35, strongest.strength * 0.4);
    score += upstreamBoost;
    if (coldFrontSignals.length >= 2) score += 10;
    if (strongest.multiStationConfirm) score += 5;
  }

  const westSignals = (upstreamSignals || []).filter(s => s.type === 'approaching_system');
  if (westSignals.length > 0) {
    score += Math.min(15, westSignals[0].strength * 0.2);
  }

  // NWS CROSS-CHECK: if NWS mentions front/cold/storm, strong confirmation
  if (nws?.keywords) {
    if (nws.keywords.front || nws.keywords['cold front']) score += 15;
    if (nws.keywords.storm) score += 10;
    if (nws.keywords.advisory || nws.keywords.warning) score += 10;
    // NWS shows N/NW wind in next 12h? 
    const nwsNorthWind = (nws.next12 || []).some(p =>
      p.dirDeg != null && (p.dirDeg >= 300 || p.dirDeg <= 60) && (p.speed || 0) > 10
    );
    if (nwsNorthWind) score += 10;
  }

  return { score: Math.min(100, score), upstreamSignals: coldFrontSignals };
}

function scoreNorthFlow(station, pressure, nws) {
  let score = 0;
  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) score += 35;
  else if (gradient > 1.0) score += 15;
  if (station.windDirection != null && isNortherly(station.windDirection)) {
    score += 20;
    if (station.windSpeed > 10) score += 15;
  }
  if (station.temperature != null) {
    const month = toMountainMonth(new Date());
    const avg = [35,40,48,55,65,75,85,83,73,60,45,35][month];
    if (station.temperature < avg - 10) score += 15;
  }

  // NWS: confirm if NWS shows N/NW wind and cold temps
  if (nws?.current) {
    const d = nws.current.dirDeg;
    if (d != null && (d >= 300 || d <= 60) && (nws.current.speed || 0) >= 8) {
      score += 12;
    }
  }
  if (nws?.keywords?.['cold front'] || nws?.keywords?.arctic || nws?.keywords?.freeze) score += 8;

  return Math.min(95, score);
}

function scoreClearing(station, pressure, history, hour, nws) {
  let score = 0;
  if (pressure.trend === 'rising') score += 25;
  if (station.windSpeed != null && station.windSpeed < 8) score += 15;
  if (station.windDirection != null && station.windDirection >= 160 && station.windDirection <= 230) score += 20;
  if (hour >= 10 && hour <= 16) score += 10;
  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.temperature != null && older?.temperature != null && (recent.temperature - older.temperature) > 5) {
      score += 15;
    }
  }

  // NWS: forecast shifting to clear/sunny? Strong clearing indicator
  if (nws?.keywords) {
    if (nws.keywords.clear || nws.keywords.sunny) score += 12;
    // Still stormy? Suppress clearing
    if (nws.keywords.storm || nws.keywords.thunder || nws.keywords.rain) score -= 15;
  }

  return Math.max(0, Math.min(90, score));
}

function scoreThermal(station, pressure, hour, lakeId, nws, gradientSignals) {
  const config = LAKE_THERMAL[lakeId];
  if (!config) return 0;
  let score = 0;
  const [peakStart, peakEnd] = config.peak;
  if (hour >= peakStart && hour <= peakEnd) score += 25;
  else if (hour >= peakStart - 3 && hour < peakStart) score += 15;
  else score -= 10;

  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) score -= 30;
  else if (gradient < 0.5) score += 15;

  if (station.windDirection != null && isInRange(station.windDirection, config.dir[0], config.dir[1])) {
    score += 20;
  }
  if (station.windSpeed != null && station.windSpeed >= 6 && station.windSpeed <= 18) {
    score += 15;
  }

  // NWS: sunny + light synoptic wind = thermal-friendly day
  if (nws?.keywords) {
    if (nws.keywords.sunny || nws.keywords.clear) score += 10;
    if (nws.keywords.calm || nws.keywords.breezy) score += 5;
    if (nws.keywords.windy || nws.keywords.gusty) score -= 15;
    if (nws.keywords.rain || nws.keywords.storm || nws.keywords.snow) score -= 20;
  }
  if (nws?.current?.speed != null && nws.current.speed <= 8 && hour >= peakStart - 2) {
    score += 8;
  }

  // Canyon / lake gradient boost (Deer Creek, Willard Bay)
  const gs = gradientSignals?.[lakeId];
  if (gs && gs.gradientScore > 0) {
    score += Math.min(20, gs.gradientScore * 0.4);
  }

  return Math.max(0, Math.min(95, score));
}

function scorePreFrontal(station, pressure, history, upstreamSignals, nws) {
  let score = 0;
  if (pressure.trend === 'falling') score += 20;
  if (station.windDirection != null && station.windDirection >= 180 && station.windDirection <= 250) {
    score += 15;
    if (station.windSpeed > 10) score += 10;
  }
  if (history.length >= 3) {
    const recent = history[history.length - 1];
    const older = history[0];
    if (recent?.windSpeed != null && older?.windSpeed != null && (recent.windSpeed - older.windSpeed) > 5) {
      score += 15;
    }
  }

  // UPSTREAM BOOST
  const preFrontalFlow = (upstreamSignals || []).filter(s => s.type === 'pre_frontal_flow');
  if (preFrontalFlow.length > 0) {
    const strongest = preFrontalFlow[0];
    score += Math.min(30, strongest.strength * 0.35);
    if (preFrontalFlow.length >= 2) score += 10;
  }

  const coldFronts = (upstreamSignals || []).filter(s => s.type === 'cold_front');
  if (coldFronts.length > 0 && coldFronts[0].etaHours > 2) {
    score += 15;
  }

  // NWS: mentions of upcoming front = pre-frontal wind is coming
  if (nws?.keywords) {
    if (nws.keywords.front) score += 12;
    if (nws.keywords.breezy || nws.keywords.windy) score += 8;
  }
  // NWS shows S/SW wind ramping up in next 12 hours?
  const nwsSWRamp = (nws?.next12 || []).filter(p =>
    p.dirDeg != null && p.dirDeg >= 180 && p.dirDeg <= 260 && (p.speed || 0) >= 10
  );
  if (nwsSWRamp.length >= 3) score += 10;

  return { score: Math.min(100, score), upstreamSignals: preFrontalFlow };
}

function scoreGlass(station, pressure, hour, nws) {
  let score = 0;
  if (station.windSpeed != null && station.windSpeed < 5) score += 30;
  else if (station.windSpeed != null && station.windSpeed < 8) score += 10;
  if (hour >= 5 && hour <= 10) score += 20;
  if (Math.abs(pressure.gradient ?? 0) < 1.0) score += 15;
  if (pressure.trend === 'stable' || pressure.trend === 'rising') score += 10;

  // NWS: calm/clear forecast = glass-friendly
  if (nws?.keywords) {
    if (nws.keywords.calm) score += 12;
    if (nws.keywords.clear || nws.keywords.sunny) score += 8;
    // Any wind in the forecast kills glass
    if (nws.keywords.windy || nws.keywords.gusty || nws.keywords.breezy) score -= 20;
    if (nws.keywords.storm || nws.keywords.front) score -= 15;
  }
  // NWS shows under 5mph for current hour?
  if (nws?.current?.speed != null && nws.current.speed < 5) score += 10;

  return Math.max(0, Math.min(95, score));
}

function scorePostFrontal(station, pressure, history, nws) {
  let score = 0;
  if (pressure.trend === 'rising') score += 20;
  if (station.windDirection != null && station.windDirection >= 280 && station.windDirection <= 340) score += 15;
  if (history.length >= 3) {
    const older = history[0];
    const recent = history[history.length - 1];
    if (recent?.windSpeed != null && older?.windSpeed != null) {
      const dec = older.windSpeed - recent.windSpeed;
      if (dec > 5 && recent.windSpeed > 5) score += 20;
    }
  }

  // NWS: clearing after front — wind decreasing, clearing skies
  if (nws?.keywords) {
    if (nws.keywords.clear || nws.keywords.sunny) score += 10;
    // NWS still shows storm = not post-frontal yet
    if (nws.keywords.storm || nws.keywords.rain) score -= 10;
  }
  // NWS shows wind speed dropping in the next few hours?
  const next6 = (nws?.next12 || []).slice(0, 6);
  if (next6.length >= 3) {
    const first = next6[0]?.speed || 0;
    const last = next6[next6.length - 1]?.speed || 0;
    if (first > last + 5) score += 10;
  }

  return Math.max(0, Math.min(90, score));
}

// ── "Why" Explanation Generator ──
// Produces plain-language reasons for each prediction using all available signals.

function generateExplanation(eventType, station, pressure, history, hour, nws, upstreamSignals, lakeId) {
  const reasons = [];
  const dir = station.windDirection;
  const speed = station.windSpeed;
  const cardinal = dir != null ? getCardinal(dir) : null;

  switch (eventType) {
    case 'frontal_passage': {
      if (pressure.trend === 'falling') reasons.push('Barometric pressure is dropping — storm system approaching');
      if ((pressure.gradient ?? 0) < -1.5) reasons.push(`Strong pressure gradient (${(pressure.gradient).toFixed(1)} mb) pushing air mass south`);
      if (dir != null && isNortherly(dir) && speed > 15) reasons.push(`Strong ${cardinal} wind at ${speed.toFixed(0)} mph — frontal boundary passing`);
      const coldFronts = (upstreamSignals || []).filter(s => s.type === 'cold_front');
      if (coldFronts.length > 0) {
        const cf = coldFronts[0];
        reasons.push(`${cf.name} detected cold front (${cf.strength}% signal) — ETA ${(cf.consensusEta || cf.etaHours).toFixed(1)} hours`);
      }
      if (history.length >= 3) {
        const tempDrop = (history[0]?.temperature ?? 0) - (history[history.length - 1]?.temperature ?? 0);
        if (tempDrop > 5) reasons.push(`Temperature dropped ${tempDrop.toFixed(0)}°F in the last hour — cold air mass arriving`);
      }
      if (nws?.keywords?.front) reasons.push('NWS forecast mentions approaching front');
      if (nws?.keywords?.['cold front']) reasons.push('NWS forecasts cold front');
      break;
    }
    case 'north_flow': {
      const gradient = pressure.gradient ?? 0;
      if (gradient > 2.0) reasons.push(`Strong north-south pressure gradient (${gradient.toFixed(1)} mb) — classic north flow setup`);
      else if (gradient > 1.0) reasons.push(`Moderate pressure gradient (${gradient.toFixed(1)} mb) favoring north flow`);
      if (dir != null && isNortherly(dir)) reasons.push(`Wind from the ${cardinal} at ${speed?.toFixed(0) || '?'} mph confirms north flow`);
      if (nws?.keywords?.['cold front'] || nws?.keywords?.arctic) reasons.push('NWS shows cold air pattern');
      if (nws?.current?.dirDeg != null && (nws.current.dirDeg >= 300 || nws.current.dirDeg <= 60)) {
        reasons.push(`NWS hourly forecast also shows ${nws.current.dir} wind`);
      }
      break;
    }
    case 'clearing_wind': {
      if (pressure.trend === 'rising') reasons.push('Pressure is rising — high pressure building in behind the front');
      if (speed != null && speed < 8) reasons.push(`Light wind (${speed.toFixed(0)} mph) — frontal energy dissipating`);
      if (dir != null && dir >= 160 && dir <= 230) reasons.push(`Southerly flow (${cardinal}) — classic post-frontal clearing pattern`);
      if (hour >= 10 && hour <= 16) reasons.push('Peak daytime heating will help establish clearing wind');
      if (nws?.keywords?.clear || nws?.keywords?.sunny) reasons.push('NWS forecasts clearing skies');
      break;
    }
    case 'thermal_cycle': {
      const config = LAKE_THERMAL[lakeId];
      if (config) {
        const [peakStart, peakEnd] = config.peak;
        if (hour >= peakStart && hour <= peakEnd) reasons.push(`Inside peak thermal window (${peakStart}:00–${peakEnd}:00)`);
        else if (hour >= peakStart - 3 && hour < peakStart) reasons.push(`Thermal cycle building — peak window starts at ${peakStart}:00`);
      }
      const gradient = pressure.gradient ?? 0;
      if (gradient < 0.5) reasons.push('Weak pressure gradient lets thermals develop freely');
      if (gradient > 2.0) reasons.push('Strong gradient will suppress thermal development');
      if (dir != null && config && isInRange(dir, config.dir[0], config.dir[1])) {
        reasons.push(`Wind direction (${cardinal} / ${dir}°) matches thermal signature for this location`);
      }
      if (speed != null && speed >= 6 && speed <= 18) reasons.push(`Wind speed ${speed.toFixed(0)} mph is in the thermal sweet spot`);
      if (nws?.keywords?.sunny || nws?.keywords?.clear) reasons.push('NWS shows sunny skies — solar heating will drive thermal');
      if (nws?.keywords?.rain || nws?.keywords?.storm) reasons.push('NWS shows precipitation — thermal development unlikely');
      break;
    }
    case 'pre_frontal': {
      if (pressure.trend === 'falling') reasons.push('Pressure dropping — low approaching from the west');
      if (dir != null && dir >= 180 && dir <= 250 && speed > 10) {
        reasons.push(`SW flow at ${speed.toFixed(0)} mph — warm air pushed ahead of incoming front`);
      }
      const preFrontal = (upstreamSignals || []).filter(s => s.type === 'pre_frontal_flow');
      if (preFrontal.length > 0) {
        reasons.push(`${preFrontal[0].name} shows strengthening SW flow — front is on the way`);
      }
      const coldFronts = (upstreamSignals || []).filter(s => s.type === 'cold_front');
      if (coldFronts.length > 0 && coldFronts[0].etaHours > 2) {
        reasons.push(`Cold front detected ${coldFronts[0].etaHours.toFixed(0)}h out — pre-frontal wind will ramp before it arrives`);
      }
      if (nws?.keywords?.front) reasons.push('NWS mentions approaching front');
      if (nws?.keywords?.breezy || nws?.keywords?.windy) reasons.push('NWS forecasts increasing wind');
      break;
    }
    case 'glass': {
      if (speed != null && speed < 5) reasons.push(`Near-calm conditions (${speed.toFixed(0)} mph) — perfect glass`);
      else if (speed != null && speed < 8) reasons.push(`Light wind (${speed.toFixed(0)} mph) — possible glass with shelter`);
      if (hour >= 5 && hour <= 10) reasons.push('Early morning — prime glass window before thermals start');
      if (Math.abs(pressure.gradient ?? 0) < 1.0) reasons.push('Flat pressure gradient — no weather-forcing, glass conditions likely');
      if (pressure.trend === 'stable' || pressure.trend === 'rising') reasons.push('Stable or rising pressure — no approaching systems');
      if (nws?.keywords?.calm) reasons.push('NWS forecasts calm conditions');
      if (nws?.keywords?.windy || nws?.keywords?.gusty) reasons.push('NWS forecasts wind — glass may not hold');
      break;
    }
    case 'post_frontal': {
      if (pressure.trend === 'rising') reasons.push('Pressure rising — high pressure settling in after front passage');
      if (dir != null && dir >= 280 && dir <= 340) reasons.push(`NW flow (${cardinal}) — classic post-frontal wind`);
      if (history.length >= 3) {
        const dec = (history[0]?.windSpeed ?? 0) - (history[history.length - 1]?.windSpeed ?? 0);
        if (dec > 5) reasons.push(`Wind dropped ${dec.toFixed(0)} mph — front has passed, conditions moderating`);
      }
      if (nws?.keywords?.clear || nws?.keywords?.sunny) reasons.push('NWS shows clearing — typical post-frontal pattern');
      break;
    }
  }

  if (reasons.length === 0) reasons.push('Multiple weak signals suggest this pattern');
  return reasons;
}

// ── Statistical Model Integration ──
// When available, replace hardcoded thresholds with data-driven values.

let _cachedModels = null;
let _modelsCacheTime = 0;

async function loadStatisticalModels(redisCmd) {
  if (_cachedModels && Date.now() - _modelsCacheTime < 15 * 60 * 1000) return _cachedModels;
  try {
    const raw = await redisCmd('GET', 'models:statistical');
    if (raw) {
      _cachedModels = JSON.parse(raw);
      _modelsCacheTime = Date.now();
    }
  } catch { /* models are optional */ }
  return _cachedModels;
}

function getModelExpSpeed(models, lakeId, eventType) {
  const fpKey = `${lakeId}:${eventType}`;
  const fp = models?.fingerprints?.[fpKey];
  if (!fp || !fp.speedStats || fp.count < 5) return null;
  return [
    Math.round(fp.speedStats.p25 * 10) / 10,
    Math.round(fp.speedStats.p75 * 10) / 10,
  ];
}

function getModelThermalBoost(models, lakeId, hour, _month) {
  const profile = models?.thermalProfiles?.[lakeId];
  if (!profile) return 0;
  const hourData = profile.byHour?.[hour];
  if (!hourData || hourData.totalObs < 20) return 0;
  return hourData.rate > 0 ? Math.round(hourData.rate * 200) : 0;
}

function getModelClimatologyContext(models, stationId, hour, month) {
  const clim = models?.climatology?.[stationId]?.[month]?.[hour];
  if (!clim || clim.n < 10) return null;
  return clim;
}

function getUpstreamLag(models, upstreamId, downstreamId) {
  const key = `${upstreamId}→${downstreamId}`;
  const corr = models?.lagCorrelations?.[key];
  if (!corr || corr.peakCorrelation < 0.3) return null;
  return {
    lagMinutes: corr.optimalLagMinutes,
    correlation: corr.peakCorrelation,
    translationFactor: corr.translationFactor,
  };
}

// ── Main Prediction Function ──

function predictForLake(lakeId, primaryStation, pressure, history, hour, learnedWeights, upstreamSignals, nwsData, statisticalModels, gradientSignals) {
  const nws = nwsData ? getNWSForLake(nwsData, lakeId, hour) : null;
  const events = [];
  const types = [
    { id: 'frontal_passage', fn: () => scoreFrontal(primaryStation, pressure, history, upstreamSignals, nws), expSpeed: [15, 35], expDir: [300, 30] },
    { id: 'north_flow',      fn: () => scoreNorthFlow(primaryStation, pressure, nws), expSpeed: [10, 25], expDir: [315, 45] },
    { id: 'clearing_wind',   fn: () => scoreClearing(primaryStation, pressure, history, hour, nws), expSpeed: [5, 15], expDir: [160, 230] },
    { id: 'thermal_cycle',   fn: () => scoreThermal(primaryStation, pressure, hour, lakeId, nws, gradientSignals), expSpeed: [6, 18], expDir: LAKE_THERMAL[lakeId]?.dir || [135, 165] },
    { id: 'pre_frontal',     fn: () => scorePreFrontal(primaryStation, pressure, history, upstreamSignals, nws), expSpeed: [10, 20], expDir: [180, 250] },
    { id: 'glass',           fn: () => scoreGlass(primaryStation, pressure, hour, nws), expSpeed: [0, 5], expDir: null },
    { id: 'post_frontal',    fn: () => scorePostFrontal(primaryStation, pressure, history, nws), expSpeed: [8, 15], expDir: [290, 340] },
  ];

  const month = toMountainMonth(new Date());
  const rawScored = [];

  for (const t of types) {
    let result = t.fn();
    let prob = typeof result === 'number' ? result : result.score;
    const eventUpstream = typeof result === 'object' ? result.upstreamSignals : null;

    // ── Statistical model enhancements ──
    if (statisticalModels) {
      // Thermal timing from historical profile (replaces hardcoded peak hours)
      if (t.id === 'thermal_cycle') {
        const thermalBoost = getModelThermalBoost(statisticalModels, lakeId, hour, month);
        if (thermalBoost > 0) prob += Math.min(20, thermalBoost);
      }

      // Climatology context: is current speed abnormal for this hour/month?
      const clim = getModelClimatologyContext(statisticalModels, primaryStation.stationId, hour, month);
      if (clim && primaryStation.windSpeed != null) {
        const speedZ = (primaryStation.windSpeed - clim.speedMean) / Math.max(1, clim.speedP75 - clim.speedP25);
        if (t.id === 'glass' && speedZ < -1) prob += 10;
        if (t.id === 'frontal_passage' && speedZ > 1.5) prob += 10;
        if (t.id === 'north_flow' && speedZ > 1) prob += 8;
      }

      // Gradient thresholds: compare current pressure trend to learned percentiles
      const gradT = statisticalModels.gradientThresholds?.[t.id];
      if (gradT && pressure?.trend != null) {
        const trend = pressure.trend;
        if (trend >= gradT.trendP25 && trend <= gradT.trendP75) {
          prob += 8; // Current pressure trend is in the "sweet spot" for this event type
        } else if (trend >= gradT.trendP10 && trend <= gradT.trendP90) {
          prob += 3; // Plausible range
        } else {
          prob -= 5; // Pressure trend is unusual for this event type
        }
      }

      // Calibration curves: anchor probability to observed base rates from history
      const calCurve = statisticalModels.calibrationCurves?.byEventType?.[t.id];
      if (calCurve && calCurve.totalEvents > 20) {
        const hourlyRate = calCurve.hourlyRates?.[hour] ?? calCurve.baseRate;
        const monthlyShare = calCurve.monthlyRates?.[month] ?? (1 / 12);
        // Scale probability toward observed rate: if our score says 60 but the base rate
        // at this hour/month is only 5%, pull it down; if score is 20 but rate is 30%, pull up
        const observedPct = Math.round(hourlyRate * monthlyShare * 12 * 100);
        if (observedPct > 0) {
          const anchor = Math.max(5, Math.min(80, observedPct));
          prob = prob * 0.7 + anchor * 0.3;
        }
      }

      // Upstream lag correction: use data-driven lead times for upstream signals
      if ((t.id === 'frontal_passage' || t.id === 'pre_frontal') && upstreamSignals?.length > 0) {
        for (const sig of upstreamSignals) {
          const lag = getUpstreamLag(statisticalModels, sig.stationId, primaryStation.stationId);
          if (lag && lag.correlation > 0.4) {
            sig.dataEtaHours = lag.lagMinutes / 60;
            sig.dataTranslationFactor = lag.translationFactor;
          }
        }
      }
    }

    // Apply learned weight adjustments (damped to prevent runaway inflation)
    if (learnedWeights?.eventWeights?.[t.id]) {
      const mod = learnedWeights.eventWeights[t.id];
      prob += (mod.baseProbMod || 0) * 0.5;
      if (mod.hourlyBias?.[hour]) {
        prob += mod.hourlyBias[hour] * 0.5;
      }
    }

    // Lake-specific weight: gentle nudge (0.9-1.1x), not aggressive multiplier
    const lwKey = `${lakeId}:${t.id}`;
    const lw = learnedWeights?.lakeWeights?.[lwKey];
    if (lw && lw.count >= 3) {
      const avgAcc = lw.totalScore / lw.count;
      const mult = 0.9 + avgAcc * 0.2;
      prob = prob * Math.min(1.1, Math.max(0.7, mult));
    }

    // Use data-driven expected speeds from historical fingerprints when available
    const modelSpeed = statisticalModels ? getModelExpSpeed(statisticalModels, lakeId, t.id) : null;
    const baseSpeed = modelSpeed || t.expSpeed;

    // Apply learned speedBias as additive correction to expected speed
    const speedBias = learnedWeights?.eventWeights?.[t.id]?.speedBias || 0;
    const adjSpeed = [
      Math.max(0, baseSpeed[0] + speedBias),
      Math.max(0, baseSpeed[1] + speedBias),
    ];

    // Apply learned dirBias as additive correction to expected direction range
    const dirBias = learnedWeights?.eventWeights?.[t.id]?.dirBias || 0;
    const adjDir = t.expDir
      ? [(t.expDir[0] + dirBias + 360) % 360, (t.expDir[1] + dirBias + 360) % 360]
      : null;

    prob = Math.max(0, Math.min(100, Math.round(prob)));

    // Store raw scored event for competition step (threshold lowered to 10)
    if (prob > 10) {
      rawScored.push({ t, prob, adjSpeed, adjDir, eventUpstream });
    }
  }

  // ── Event Competition: mutually exclusive events suppress each other ──
  const EXCLUSIVE_GROUPS = [
    ['glass', 'frontal_passage', 'north_flow', 'pre_frontal'],
    ['glass', 'thermal_cycle'],
    ['frontal_passage', 'clearing_wind', 'post_frontal'],
  ];

  if (rawScored.length > 1) {
    rawScored.sort((a, b) => b.prob - a.prob);
    const topProb = rawScored[0].prob;
    const topId = rawScored[0].t.id;

    for (let i = 1; i < rawScored.length; i++) {
      const rs = rawScored[i];
      const inSameGroup = EXCLUSIVE_GROUPS.some(g => g.includes(topId) && g.includes(rs.t.id));
      if (inSameGroup) {
        const gap = topProb - rs.prob;
        if (gap > 15) {
          rs.prob = Math.round(rs.prob * 0.5);
        } else if (gap > 5) {
          rs.prob = Math.round(rs.prob * 0.7);
        }
      }
    }
  }

  for (const rs of rawScored) {
    const prob = Math.max(0, Math.min(100, rs.prob));
    if (prob < 15) continue;

    const evt = {
      eventType: rs.t.id,
      probability: prob,
      expectedSpeed: rs.adjSpeed,
      expectedDirection: rs.adjDir,
      primaryStation: primaryStation.stationId,
      windSpeed: primaryStation.windSpeed,
      windDirection: primaryStation.windDirection,
      temperature: primaryStation.temperature,
    };

    evt.why = generateExplanation(rs.t.id, primaryStation, pressure, history, hour, nws, upstreamSignals, lakeId);

    evt.pressureGradient = pressure.gradient ?? null;
    evt.pressureTrend = pressure.trend ?? null;

    if (nws?.current) {
      evt.nwsForecast = {
        speed: nws.current.speed,
        dir: nws.current.dir,
        text: nws.current.text,
        keywords: nws.keywords,
      };
    }

    if (rs.eventUpstream && rs.eventUpstream.length > 0) {
      const best = rs.eventUpstream[0];
      evt.upstreamDetection = {
        stationId: best.stationId,
        stationName: best.name,
        corridor: best.corridor,
        strength: best.strength,
        etaHours: best.consensusEta || best.etaHours,
        details: best.details,
        confirmedBy: rs.eventUpstream.length,
      };
    }

    events.push(evt);
  }
  return events;
}

// ── Pressure Analysis ──
// Both stations report altimeter setting (already altitude-corrected).
// The difference IS the weather gradient — no altitude correction needed.
// A positive gradient (SLC > PVU) indicates north-to-south pressure push.
function analyzePressure(currentStations, recentSnapshots) {
  const slc = currentStations.find(s => s.stationId === 'KSLC');
  const pvu = currentStations.find(s => s.stationId === 'KPVU');
  const rawGradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
  const gradient = rawGradient ?? 0;

  let trend = 'stable';
  if (recentSnapshots.length >= 3) {
    const oldSlc = recentSnapshots[0]?.stations?.find(s => s.stationId === 'KSLC');
    if (slc?.pressure && oldSlc?.pressure) {
      const delta = slc.pressure - oldSlc.pressure;
      if (delta < -0.5) trend = 'falling';
      else if (delta > 0.5) trend = 'rising';
    }
  }

  return { slcPressure: slc?.pressure, pvuPressure: pvu?.pressure, gradient, rawGradient, trend };
}

// ── Build station history from recent snapshots ──

function buildStationHistory(stationId, recentSnapshots) {
  const history = [];
  for (const snap of recentSnapshots) {
    const s = snap.stations?.find(st => st.stationId === stationId);
    if (s) history.push(s);
  }
  return history;
}

// ── Event-type-specific verification windows ──
// Short-lived events (glass/thermal) are verified sooner;
// longer events (post-frontal/clearing) need more time to mature.
const VERIFY_WINDOWS = {
  glass:            { min: 60,  max: 180 },
  thermal_cycle:    { min: 60,  max: 180 },
  pre_frontal:      { min: 60,  max: 240 },
  frontal_passage:  { min: 90,  max: 300 },
  north_flow:       { min: 90,  max: 300 },
  clearing_wind:    { min: 120, max: 360 },
  post_frontal:     { min: 120, max: 360 },
};
const DEFAULT_VERIFY_WINDOW = { min: 90, max: 300 };

// ── Verification: compare old predictions against what actually happened ──

function verifyPredictions(predictions, actualStations, lakeStationMap) {
  const results = [];

  for (const pred of predictions) {
    const lakeId = pred.lakeId;
    const stationIds = lakeStationMap[lakeId] || [];
    const actuals = actualStations.filter(s => stationIds.includes(s.stationId));
    if (actuals.length === 0) continue;

    const primary = actuals.find(s => s.stationId === pred.primaryStation) || actuals[0];
    if (primary.windSpeed == null) continue;

    let score = 0;

    const [expMin, expMax] = pred.expectedSpeed || [0, 100];
    const actualSpeed = primary.windSpeed;

    // Speed accuracy: how close was actual to predicted range?
    if (actualSpeed >= expMin && actualSpeed <= expMax) {
      score += 0.5;
    } else {
      const dist = actualSpeed < expMin ? expMin - actualSpeed : actualSpeed - expMax;
      score += Math.max(0, 0.5 - dist * 0.05);
    }

    // Direction accuracy (if applicable)
    if (pred.expectedDirection && primary.windDirection != null) {
      const [dirMin, dirMax] = pred.expectedDirection;
      if (isInRange(primary.windDirection, dirMin, dirMax)) {
        score += 0.5;
      } else {
        const diff = Math.min(
          angleDiff(primary.windDirection, dirMin),
          angleDiff(primary.windDirection, dirMax)
        );
        score += Math.max(0, 0.5 - diff * 0.005);
      }
    } else {
      score += actualSpeed < 5 ? 0.5 : Math.max(0, 0.5 - (actualSpeed - 5) * 0.05);
    }

    // ── NWS ACCURACY: score what NWS predicted for the same period ──
    let nwsScore = null;
    if (pred.nwsForecast) {
      let nScore = 0;
      const nwsSpeed = pred.nwsForecast.speed;
      // NWS speed accuracy (same formula — fair comparison)
      if (nwsSpeed != null) {
        const nwsErr = Math.abs(actualSpeed - nwsSpeed);
        nScore += Math.max(0, 0.5 - nwsErr * 0.04);
      }
      // NWS direction accuracy
      if (pred.nwsForecast.dir && primary.windDirection != null) {
        const nwsDirDeg = typeof pred.nwsForecast.dir === 'string'
          ? { N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337 }[pred.nwsForecast.dir] ?? null
          : pred.nwsForecast.dir;
        if (nwsDirDeg != null) {
          const nwsDirErr = angleDiff(primary.windDirection, nwsDirDeg);
          nScore += Math.max(0, 0.5 - nwsDirErr * 0.005);
        } else {
          nScore += 0.25;
        }
      } else {
        nScore += 0.25;
      }
      nwsScore = Math.round(nScore * 100) / 100;
    }

    const dirRange = pred.expectedDirection;
    const expectedDirMid = dirRange ? circularMidpoint(dirRange[0], dirRange[1]) : null;

    // Event type verification: did the predicted wind TYPE match reality?
    let eventTypeCorrect = null;
    const actualDir = primary.windDirection;
    if (actualDir != null) {
      const isNorth = actualDir >= 290 || actualDir <= 60;
      const isSouth = actualDir >= 100 && actualDir <= 250;
      const isSE = actualDir >= 100 && actualDir <= 200;
      const isSW = actualDir >= 180 && actualDir <= 250;

      switch (pred.eventType) {
        case 'north_flow':
        case 'frontal_passage':
        case 'post_frontal':
          eventTypeCorrect = isNorth && actualSpeed >= 6;
          break;
        case 'thermal_cycle':
        case 'clearing_wind':
          eventTypeCorrect = isSE && actualSpeed >= 5;
          break;
        case 'pre_frontal':
          eventTypeCorrect = (isSW || isSouth) && actualSpeed >= 8;
          break;
        case 'glass':
          eventTypeCorrect = actualSpeed < 5;
          break;
      }

      // Penalty/bonus for event type match
      if (eventTypeCorrect === true) score = Math.min(1, score + 0.1);
      else if (eventTypeCorrect === false) score = Math.max(0, score - 0.15);
    }

    // Activity-specific scores: how good was this for each sport?
    const activityScores = {};
    const pgSouthOk = actualDir != null && actualDir >= 110 && actualDir <= 250 && actualSpeed >= 5 && actualSpeed <= 20;
    const pgNorthOk = actualDir != null && (actualDir >= 290 || actualDir <= 60) && actualSpeed >= 5 && actualSpeed <= 20;
    activityScores.kiting = actualSpeed >= 10 ? 1 : actualSpeed >= 8 ? 0.6 : 0;
    activityScores.windsurfing = actualSpeed >= 12 ? 1 : actualSpeed >= 8 ? 0.5 : 0;
    activityScores.sailing = actualSpeed >= 6 ? 1 : actualSpeed >= 4 ? 0.5 : 0;
    activityScores.paragliding = pgSouthOk || pgNorthOk ? 1 : 0;
    activityScores.paragliding_north = pgNorthOk ? 1 : 0;
    activityScores.paragliding_south = pgSouthOk ? 1 : 0;
    activityScores.boating = actualSpeed < 15 ? 1 : actualSpeed < 20 ? 0.5 : 0;
    activityScores.fishing = actualSpeed < 10 ? 1 : actualSpeed < 15 ? 0.5 : 0;
    activityScores.paddling = actualSpeed < 8 ? 1 : actualSpeed < 12 ? 0.5 : 0;
    activityScores.snowkiting = actualSpeed >= 10 ? 1 : actualSpeed >= 6 ? 0.5 : 0;

    results.push({
      lakeId,
      eventType: pred.eventType,
      predicted: pred.probability,
      actualSpeed,
      actualDir: actualDir ?? null,
      actualDirection: actualDir,
      expectedSpeedMid: (expMin + expMax) / 2,
      expectedDirMid,
      predictionHour: pred.predictionHour ?? null,
      score: Math.round(score * 100) / 100,
      eventTypeCorrect,
      activityScores,
      nwsScore,
      nwsSpeed: pred.nwsForecast?.speed ?? null,
      timestamp: new Date().toISOString(),
      fingerprint: {
        gradient: pred.pressureGradient ?? null,
        trend: pred.pressureTrend === 'falling' ? -1 : pred.pressureTrend === 'rising' ? 1 : 0,
        windDir: pred.windDirection ?? null,
        windSpeed: pred.windSpeed ?? null,
        temp: pred.temperature ?? null,
        hour: pred.predictionHour ?? null,
        month: toMountainMonth(new Date()),
      },
    });
  }

  return results;
}

// ── Weight Update: learn from accuracy records ──

function updateWeights(currentWeights, newAccuracy) {
  const weights = JSON.parse(JSON.stringify(currentWeights || { eventWeights: {}, lakeWeights: {}, meta: {} }));
  const eventWeights = weights.eventWeights;

  for (const record of newAccuracy) {
    const key = record.eventType;
    if (!eventWeights[key]) {
      eventWeights[key] = { baseProbMod: 0, speedBias: 0, dirBias: 0, count: 0, totalScore: 0, hourlyBias: {} };
    }
    const ew = eventWeights[key];
    ew.count++;
    ew.totalScore += record.score;
    const avgAccuracy = ew.totalScore / ew.count;

    // Nudge base probability: over-predicting → lower, under-predicting → raise
    const lerpRate = Math.min(0.1, 1 / (ew.count + 10));
    if (avgAccuracy < 0.4 && record.predicted > 50) {
      ew.baseProbMod -= lerpRate * 3;
    } else if (avgAccuracy > 0.7 && record.predicted < 50) {
      ew.baseProbMod += lerpRate * 3;
    }
    ew.baseProbMod = Math.max(-25, Math.min(25, ew.baseProbMod));

    if (record.actualSpeed != null && record.expectedSpeedMid != null) {
      const speedErr = record.actualSpeed - record.expectedSpeedMid;
      ew.speedBias = ew.speedBias * 0.95 + speedErr * 0.05;
    }

    if (record.actualDir != null && record.expectedDirMid != null) {
      const dirErr = signedAngleDiff(record.actualDir, record.expectedDirMid);
      ew.dirBias = (ew.dirBias || 0) * 0.95 + dirErr * 0.05;
    }

    const hour = record.predictionHour ?? toMountainHour(new Date(record.timestamp));
    if (!ew.hourlyBias[hour]) ew.hourlyBias[hour] = 0;
    const hourlyTarget = record.score > 0.6 ? 2 : record.score < 0.3 ? -2 : 0;
    ew.hourlyBias[hour] = ew.hourlyBias[hour] * 0.9 + hourlyTarget * 0.1;

    // Per-lake per-event-type tracking (not blanket)
    if (!weights.lakeWeights) weights.lakeWeights = {};
    const lwKey = `${record.lakeId}:${record.eventType}`;
    if (!weights.lakeWeights[lwKey]) {
      weights.lakeWeights[lwKey] = { count: 0, totalScore: 0 };
    }
    const lw = weights.lakeWeights[lwKey];
    lw.count++;
    lw.totalScore += record.score;
  }

  // Compute summary stats
  weights.meta = weights.meta || {};
  weights.meta.lastUpdated = new Date().toISOString();
  weights.meta.totalPredictions = Object.values(eventWeights).reduce((s, e) => s + (e.count || 0), 0);
  weights.meta.overallAccuracy = weights.meta.totalPredictions > 0
    ? Object.values(eventWeights).reduce((s, e) => s + (e.totalScore || 0), 0) / weights.meta.totalPredictions
    : 0;

  // Track cumulative NWS accuracy for comparison
  if (!weights.nwsAccuracy) weights.nwsAccuracy = { totalScore: 0, count: 0, byEvent: {} };
  for (const record of newAccuracy) {
    if (record.nwsScore != null) {
      weights.nwsAccuracy.count++;
      weights.nwsAccuracy.totalScore += record.nwsScore;
      if (!weights.nwsAccuracy.byEvent[record.eventType]) {
        weights.nwsAccuracy.byEvent[record.eventType] = { count: 0, totalScore: 0 };
      }
      weights.nwsAccuracy.byEvent[record.eventType].count++;
      weights.nwsAccuracy.byEvent[record.eventType].totalScore += record.nwsScore;
    }
  }
  weights.meta.nwsOverallAccuracy = weights.nwsAccuracy.count > 0
    ? Math.round((weights.nwsAccuracy.totalScore / weights.nwsAccuracy.count) * 100) / 100
    : null;

  // Per-event accuracy summary (ours and NWS side by side)
  weights.meta.eventAccuracy = {};
  for (const [key, ew] of Object.entries(eventWeights)) {
    const nwsEvent = weights.nwsAccuracy?.byEvent?.[key];
    weights.meta.eventAccuracy[key] = ew.count > 0
      ? {
          accuracy: Math.round((ew.totalScore / ew.count) * 100) / 100,
          count: ew.count,
          probMod: Math.round(ew.baseProbMod * 10) / 10,
          nwsAccuracy: nwsEvent?.count > 0 ? Math.round((nwsEvent.totalScore / nwsEvent.count) * 100) / 100 : null,
          nwsCount: nwsEvent?.count || 0,
        }
      : null;
  }

  // Fishing-specific weight learning from activityScores
  if (!weights.fishingWeights) weights.fishingWeights = {};
  for (const record of newAccuracy) {
    if (record.activityScores?.fishing == null) continue;
    const fk = `fishing:${record.lakeId}`;
    if (!weights.fishingWeights[fk]) {
      weights.fishingWeights[fk] = { avgScore: 0, speedBias: 0, count: 0, totalScore: 0 };
    }
    const fw = weights.fishingWeights[fk];
    fw.count++;
    fw.totalScore += record.activityScores.fishing;
    fw.avgScore = Math.round((fw.totalScore / fw.count) * 100) / 100;

    // Learn fishing-specific speed bias: if wind is consistently under/over
    // predictions at this water, nudge future predictions
    if (record.actualSpeed != null && record.expectedSpeedMid != null) {
      const speedErr = record.actualSpeed - record.expectedSpeedMid;
      fw.speedBias = fw.speedBias * 0.92 + speedErr * 0.08;
    }
  }

  // Fishing accuracy summary
  const fishingEntries = Object.entries(weights.fishingWeights);
  if (fishingEntries.length > 0) {
    const totalFishCount = fishingEntries.reduce((s, [, v]) => s + v.count, 0);
    const totalFishScore = fishingEntries.reduce((s, [, v]) => s + v.totalScore, 0);
    weights.meta.fishingAccuracy = totalFishCount > 0
      ? Math.round((totalFishScore / totalFishCount) * 100) / 100
      : 0;
    weights.meta.fishingLocations = fishingEntries.length;
  }

  return weights;
}

// ── Redis helpers (passed in to avoid circular deps) ──

async function loadWeights(redisCmd) {
  const raw = await redisCmd('GET', 'weights:server');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveWeights(redisCmd, weights) {
  await redisCmd('SET', 'weights:server', JSON.stringify(weights), 'EX', '604800'); // 7-day TTL, refreshed each cycle
}

async function loadRecentPredictions(redisCmd, lookbackMinutes = 240) {
  const keys = await redisCmd('LRANGE', 'pred:index', '0', '30');
  if (!keys || keys.length === 0) return [];

  const values = await redisCmd('MGET', ...keys);
  const cutoff = Date.now() - lookbackMinutes * 60000;
  const all = [];
  const rawList = Array.isArray(values) ? values : [];
  for (const raw of rawList) {
    if (!raw) continue;
    try {
      const record = JSON.parse(raw);
      const recordTs = new Date(record.timestamp).getTime();
      if (recordTs > cutoff) {
        for (const p of (record.predictions || [])) {
          all.push({ ...p, timestamp: record.timestamp, predictionHour: toMountainHour(new Date(record.timestamp)) });
        }
      }
    } catch { /* skip */ }
  }
  return all;
}

async function savePredictions(redisCmd, predictions, timestamp) {
  const key = `pred:${timestamp.toISOString().split('T')[0]}:${String(timestamp.getHours()).padStart(2,'0')}:${String(timestamp.getMinutes()).padStart(2,'0')}`;
  const record = { timestamp: timestamp.toISOString(), predictions };
  await redisCmd('SET', key, JSON.stringify(record), 'EX', '604800');
  await redisCmd('LPUSH', 'pred:index', key);
  await redisCmd('LTRIM', 'pred:index', '0', '672');
}

async function appendAccuracyLog(redisCmd, records) {
  if (records.length === 0) return;
  // Batch LPUSH: single command pushes all records (saves N-1 Redis calls)
  const serialized = records.map(r => JSON.stringify(r));
  await redisCmd('LPUSH', 'accuracy:log', ...serialized);
  await redisCmd('LTRIM', 'accuracy:log', '0', '4999');
}

async function loadMeta(redisCmd) {
  const raw = await redisCmd('GET', 'learning:meta');
  if (!raw) return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 };
  try { return JSON.parse(raw); } catch { return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 }; }
}

async function saveMeta(redisCmd, meta) {
  await redisCmd('SET', 'learning:meta', JSON.stringify(meta), 'EX', '604800'); // 7-day TTL, refreshed each cycle
}

// ══════════════════════════════════════════════════════════════
// "AHEAD OF FORECAST" DETECTION
//
// Compares our upstream sensor network against NWS forecast text.
// When our stations detect a front/system but NWS hasn't mentioned
// it yet, we log an "Ahead of Forecast" event with timestamp.
// When NWS later catches up, we calculate and store our lead time.
// ══════════════════════════════════════════════════════════════

async function detectAheadOfForecast(redisCmd, upstreamSignals, nwsData) {
  if (!upstreamSignals || upstreamSignals.length === 0 || !nwsData) return null;

  const now = new Date();
  const coldFronts = upstreamSignals.filter(s => s.type === 'cold_front' && s.strength >= 35);
  const preFrontal = upstreamSignals.filter(s => s.type === 'pre_frontal_flow' && s.strength >= 30);
  const systems = upstreamSignals.filter(s => s.type === 'approaching_system' && s.strength >= 30);

  if (coldFronts.length === 0 && preFrontal.length === 0 && systems.length === 0) return null;

  // Check what NWS is currently saying
  const nwsMentions = getNWSFrontMentions(nwsData);
  const nwsMentionsFront = nwsMentions.some(m => m.type === 'front');
  const nwsMentionsStorm = nwsMentions.some(m => m.type === 'storm');
  const nwsMentionsWind = nwsMentions.some(m => m.type === 'wind');

  const result = {
    timestamp: now.toISOString(),
    detections: [],
  };

  // Cold front: we detect it but NWS hasn't mentioned it
  if (coldFronts.length > 0 && !nwsMentionsFront) {
    const strongest = coldFronts[0];
    result.detections.push({
      type: 'cold_front_ahead',
      status: 'ahead',
      message: `Upstream stations detect approaching cold front — NWS hasn't called it yet`,
      station: strongest.stationId,
      stationName: strongest.name,
      strength: strongest.strength,
      etaHours: strongest.consensusEta || strongest.etaHours,
      confirmedBy: coldFronts.length,
      nwsStatus: 'no_mention',
    });
  }

  // Cold front detected AND NWS also mentions it — log confirmation
  if (coldFronts.length > 0 && nwsMentionsFront) {
    const strongest = coldFronts[0];
    result.detections.push({
      type: 'cold_front_confirmed',
      status: 'confirmed',
      message: `Both our stations and NWS detect cold front — high confidence`,
      station: strongest.stationId,
      stationName: strongest.name,
      strength: strongest.strength,
      etaHours: strongest.consensusEta || strongest.etaHours,
      nwsStatus: 'mentions_front',
    });
  }

  // Pre-frontal flow detected but NWS doesn't mention wind
  if (preFrontal.length > 0 && !nwsMentionsWind && !nwsMentionsFront) {
    const strongest = preFrontal[0];
    result.detections.push({
      type: 'prefrontal_ahead',
      status: 'ahead',
      message: `SW/W flow detected upstream — NWS not yet forecasting wind`,
      station: strongest.stationId,
      stationName: strongest.name,
      strength: strongest.strength,
      etaHours: strongest.etaHours,
      nwsStatus: 'no_mention',
    });
  }

  // System approach from west not in NWS yet
  if (systems.length > 0 && !nwsMentionsStorm && !nwsMentionsFront) {
    const strongest = systems[0];
    result.detections.push({
      type: 'system_ahead',
      status: 'ahead',
      message: `Weather system approaching from west — NWS hasn't updated`,
      station: strongest.stationId,
      stationName: strongest.name,
      strength: strongest.strength,
      etaHours: strongest.etaHours,
      nwsStatus: 'no_mention',
    });
  }

  if (result.detections.length === 0) return null;

  // Calculate lead time vs previous NWS-confirmed events
  const prevRaw = await redisCmd('GET', 'ahead:log');
  let aheadLog = [];
  try { aheadLog = prevRaw ? JSON.parse(prevRaw) : []; } catch { aheadLog = []; }

  // Update lead time tracking: if we previously had an "ahead" detection
  // and NWS now mentions it, compute the lead time
  for (const prev of aheadLog) {
    if (prev.status !== 'ahead') continue;
    const aheadTime = new Date(prev.timestamp);
    const ageHours = (now - aheadTime) / 3600000;
    if (ageHours > 24) continue; // Only track within 24h

    // Did NWS now catch up?
    const type = prev.type;
    const nwsCaughtUp =
      (type === 'cold_front_ahead' && nwsMentionsFront) ||
      (type === 'prefrontal_ahead' && (nwsMentionsWind || nwsMentionsFront)) ||
      (type === 'system_ahead' && (nwsMentionsStorm || nwsMentionsFront));

    if (nwsCaughtUp && !prev.leadTimeHours) {
      prev.leadTimeHours = Math.round(ageHours * 10) / 10;
      prev.status = 'confirmed_ahead';
      prev.nwsConfirmedAt = now.toISOString();
    }
  }

  // Append new detections and keep last 50 entries
  aheadLog.push(...result.detections.map(d => ({ ...d, timestamp: now.toISOString() })));
  aheadLog = aheadLog.slice(-50);

  await redisCmd('SET', 'ahead:log', JSON.stringify(aheadLog), 'EX', '604800');

  // Compute stats
  const confirmed = aheadLog.filter(e => e.leadTimeHours != null);
  const avgLeadTime = confirmed.length > 0
    ? Math.round((confirmed.reduce((s, e) => s + e.leadTimeHours, 0) / confirmed.length) * 10) / 10
    : null;

  return {
    detections: result.detections,
    stats: {
      totalAheadEvents: aheadLog.filter(e => e.status === 'ahead' || e.status === 'confirmed_ahead').length,
      confirmedAhead: confirmed.length,
      avgLeadTimeHours: avgLeadTime,
      recentLeadTimes: confirmed.slice(-5).map(e => e.leadTimeHours),
    },
  };
}

// ══════════════════════════════════════════════════════════════
// PATTERN MATCH ENGINE — Historical Analog Finder
//
// Creates a "fingerprint" of current conditions and searches
// the accuracy log for past days with similar fingerprints.
// Returns the top analogs with what actually happened.
//
// Fingerprint dimensions:
//   - Pressure gradient (mb)
//   - Pressure trend (encoded as -1/0/1)
//   - Primary wind direction (degrees)
//   - Primary wind speed (mph)
//   - Temperature (°F)
//   - Hour of day (Mountain Time)
//   - Month (seasonal factor)
// ══════════════════════════════════════════════════════════════

function createFingerprint(station, pressure, hour) {
  return {
    gradient: pressure.gradient ?? 0,
    trend: pressure.trend === 'falling' ? -1 : pressure.trend === 'rising' ? 1 : 0,
    windDir: station.windDirection ?? 180,
    windSpeed: station.windSpeed ?? 0,
    temp: station.temperature ?? 50,
    hour,
    month: toMountainMonth(new Date()),
  };
}

function fingerprintDistance(a, b) {
  // Weighted distance across dimensions (lower = more similar)
  let dist = 0;

  // Pressure gradient: critical signal (weight 3)
  dist += Math.abs((a.gradient || 0) - (b.gradient || 0)) * 3;

  // Pressure trend: same trend is important (weight 2)
  dist += Math.abs((a.trend || 0) - (b.trend || 0)) * 2;

  // Wind direction: use angular distance (weight 1.5)
  if (a.windDir != null && b.windDir != null) {
    dist += angleDiff(a.windDir, b.windDir) / 60 * 1.5;
  }

  // Wind speed: similar speeds (weight 1)
  dist += Math.abs((a.windSpeed || 0) - (b.windSpeed || 0)) / 5;

  // Temperature: similar temps (weight 0.5)
  dist += Math.abs((a.temp || 50) - (b.temp || 50)) / 20 * 0.5;

  // Hour: similar time of day (weight 1)
  const hourDiff = Math.min(Math.abs((a.hour || 12) - (b.hour || 12)), 24 - Math.abs((a.hour || 12) - (b.hour || 12)));
  dist += hourDiff / 4;

  // Month: same season matters (weight 0.3)
  const monthDiff = Math.min(Math.abs((a.month || 6) - (b.month || 6)), 12 - Math.abs((a.month || 6) - (b.month || 6)));
  dist += monthDiff / 3 * 0.3;

  return dist;
}

async function findAnalogDays(redisCmd, currentFingerprint, lakeId, maxResults = 5) {
  const raw = await redisCmd('LRANGE', 'accuracy:log', '0', '4999');
  if (!raw || raw.length === 0) return [];

  const records = [];
  for (const item of raw) {
    try {
      const r = typeof item === 'string' ? JSON.parse(item) : item;
      if (r.fingerprint && (!lakeId || r.lakeId === lakeId)) {
        records.push(r);
      }
    } catch {
      // intentionally empty: skip malformed accuracy log entry
    }
  }

  if (records.length === 0) return [];

  // Score each record by fingerprint similarity
  const scored = records.map(r => ({
    ...r,
    distance: fingerprintDistance(currentFingerprint, r.fingerprint),
  }));

  // Sort by distance (most similar first), take top N
  scored.sort((a, b) => a.distance - b.distance);

  // Group by date to get daily analogs
  const dayMap = new Map();
  for (const s of scored.slice(0, 50)) {
    const date = (s.timestamp || '').split('T')[0];
    if (!date) continue;
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        distance: s.distance,
        events: [],
        avgAccuracy: 0,
        totalScore: 0,
        count: 0,
      });
    }
    const day = dayMap.get(date);
    day.events.push({
      eventType: s.eventType,
      actualSpeed: s.actualSpeed,
      actualDirection: s.actualDirection,
      predicted: s.predicted,
      score: s.score,
      hour: s.fingerprint?.hour,
    });
    day.totalScore += s.score || 0;
    day.count++;
  }

  // Compute avg accuracy per day and sort by distance
  const analogs = Array.from(dayMap.values())
    .map(d => ({ ...d, avgAccuracy: d.count > 0 ? Math.round((d.totalScore / d.count) * 100) / 100 : 0 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);

  return analogs;
}

// ══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — called by cron after data collection
// ══════════════════════════════════════════════════════════════

async function runServerLearningCycle(redisCmd, currentStations, recentSnapshots, lakeStationMap, nwsData = null) {
  const now = new Date();
  const hour = toMountainHour(now);
  const pressure = analyzePressure(currentStations, recentSnapshots);

  // 1. Load current weights
  const weights = await loadWeights(redisCmd) || { eventWeights: {}, lakeWeights: {}, meta: {} };

  // 1.5 Detect upstream signals for frontal early warning
  const upstreamSignals = detectUpstreamSignals(currentStations, recentSnapshots);

  // 1.5. Load statistical models (built from historical analysis)
  const statisticalModels = await loadStatisticalModels(redisCmd);

  // Enrich upstream signals with data-driven lag times when models available
  if (statisticalModels?.lagCorrelations && upstreamSignals.length > 0) {
    const downstreamTargets = ['FPS', 'KPVU', 'KSLC', 'KHCR', 'KHIF'];
    for (const sig of upstreamSignals) {
      for (const downId of downstreamTargets) {
        const lag = getUpstreamLag(statisticalModels, sig.stationId, downId);
        if (lag && lag.correlation > 0.3) {
          if (!sig.dataLags) sig.dataLags = {};
          sig.dataLags[downId] = {
            lagMinutes: lag.lagMinutes,
            correlation: lag.correlation,
            translationFactor: lag.translationFactor,
          };
        }
      }
      // Use best data-driven ETA if available and more precise than heuristic
      const bestLag = sig.dataLags ? Object.values(sig.dataLags).sort((a, b) => b.correlation - a.correlation)[0] : null;
      if (bestLag && bestLag.correlation > 0.5) {
        sig.dataEtaHours = Math.round(bestLag.lagMinutes / 6) / 10;
        sig.dataTranslationFactor = bestLag.translationFactor;
      }
    }
  }

  // Store upstream signals in Redis for client display
  if (upstreamSignals.length > 0) {
    try {
      await redisCmd('SET', 'upstream:latest', JSON.stringify({
        timestamp: now.toISOString(),
        signals: upstreamSignals,
      }), 'EX', '86400');
    } catch {
      // intentionally empty: Redis write is best-effort for diagnostics
    }
  }

  // 1.6 "Ahead of Forecast" detection: compare upstream vs NWS
  let aheadOfForecast = null;
  if (nwsData) {
    try {
      aheadOfForecast = await detectAheadOfForecast(redisCmd, upstreamSignals, nwsData);
    } catch (e) {
      console.error('Ahead-of-forecast detection error:', e.message);
    }
  }

  // 1.7. Compute canyon/lake gradient signals for Deer Creek + Willard Bay
  const gradientSignals = computeGradientSignals(currentStations);

  // 2. Make predictions for every lake (with upstream intelligence + gradient indicators)
  const allPredictions = [];
  for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
    const lakeStations = currentStations.filter(s => stationIds.includes(s.stationId));
    if (lakeStations.length === 0) continue;

    const primaryId = LAKE_THERMAL[lakeId]?.station || stationIds[0];
    const primary = lakeStations.find(s => s.stationId === primaryId) || lakeStations[0];
    const history = buildStationHistory(primary.stationId, recentSnapshots);

    const events = predictForLake(lakeId, primary, pressure, history, hour, weights, upstreamSignals, nwsData, statisticalModels, gradientSignals);
    for (const evt of events) {
      allPredictions.push({ ...evt, lakeId });
    }
  }

  // 3. Store predictions
  if (allPredictions.length > 0) {
    await savePredictions(redisCmd, allPredictions, now);
  }

  // 3.5 Find analog days (pattern matching)
  let analogDays = null;
  try {
    const slc = currentStations.find(s => s.stationId === 'KSLC') || currentStations[0];
    if (slc) {
      const fingerprint = createFingerprint(slc, pressure, hour);
      const analogs = await findAnalogDays(redisCmd, fingerprint, null, 5);
      if (analogs.length > 0) {
        analogDays = { fingerprint, analogs };
        await redisCmd('SET', 'pattern:analogs', JSON.stringify(analogDays), 'EX', '86400');
      }
    }
  } catch (e) {
    console.error('Pattern match error:', e.message);
  }

  // 4. Verify old predictions against current actuals using per-event-type windows
  const VERIFIED_SET_KEY = 'verified:predictions';
  const oldPredictions = await loadRecentPredictions(redisCmd, 370);
  const verificationsNeeded = oldPredictions.filter(p => {
    const age = now.getTime() - new Date(p.timestamp || 0).getTime();
    const w = VERIFY_WINDOWS[p.eventType] || DEFAULT_VERIFY_WINDOW;
    return age > w.min * 60000 && age < w.max * 60000;
  });

  // Deduplicate: batch-check which predictions were already verified (1 Redis call instead of N)
  const dedupKeys = verificationsNeeded.map(p => `${p.lakeId}:${p.eventType}:${p.timestamp}`);
  let alreadyVerifiedFlags = [];
  if (dedupKeys.length > 0) {
    try {
      alreadyVerifiedFlags = await redisCmd('SMISMEMBER', VERIFIED_SET_KEY, ...dedupKeys);
    } catch {
      // Fallback for Redis versions without SMISMEMBER
      alreadyVerifiedFlags = await Promise.all(dedupKeys.map(k => redisCmd('SISMEMBER', VERIFIED_SET_KEY, k)));
    }
  }
  const deduped = verificationsNeeded.filter((_, i) => !alreadyVerifiedFlags[i]);

  let accuracyRecords = [];
  if (deduped.length > 0) {
    accuracyRecords = verifyPredictions(deduped, currentStations, lakeStationMap);
  }

  // Mark verified predictions in a single SADD call (1 Redis call instead of N)
  if (deduped.length > 0) {
    const newKeys = deduped.map(p => `${p.lakeId}:${p.eventType}:${p.timestamp}`);
    await redisCmd('SADD', VERIFIED_SET_KEY, ...newKeys);
    await redisCmd('EXPIRE', VERIFIED_SET_KEY, 86400);
  }

  // 5. Update weights from accuracy
  let updatedWeights = weights;
  if (accuracyRecords.length > 0) {
    await appendAccuracyLog(redisCmd, accuracyRecords);
    updatedWeights = updateWeights(weights, accuracyRecords);
    await saveWeights(redisCmd, updatedWeights);
  }

  // 6. Update metadata
  const meta = await loadMeta(redisCmd);
  meta.totalCycles++;
  meta.totalPredictions += allPredictions.length;
  meta.totalVerified += accuracyRecords.length;
  meta.lastCycle = now.toISOString();
  meta.lastPredictionCount = allPredictions.length;
  meta.lastVerificationCount = accuracyRecords.length;
  await saveMeta(redisCmd, meta);

  return {
    predictionsMade: allPredictions.length,
    verificationsRun: accuracyRecords.length,
    weightsUpdated: accuracyRecords.length > 0,
    upstreamSignals: upstreamSignals.length > 0 ? upstreamSignals.slice(0, 5) : null,
    aheadOfForecast,
    analogDays: analogDays ? { count: analogDays.analogs.length, topMatch: analogDays.analogs[0]?.date || null } : null,
    meta,
    pressure,
    gradientSignals: Object.keys(gradientSignals).length > 0 ? gradientSignals : null,
    diagnostics: {
      mountainTimeHour: hour,
      utcHour: now.getUTCHours(),
      snapshotCount: recentSnapshots.length,
      snapshotOrder: recentSnapshots.length >= 2
        ? (new Date(recentSnapshots[0].timestamp) < new Date(recentSnapshots[1].timestamp) ? 'chronological' : 'REVERSED')
        : 'insufficient',
      oldPredictionsFound: oldPredictions.length,
      verificationsInWindow: verificationsNeeded.length,
      nwsAvailable: !!(nwsData?.grids && Object.keys(nwsData.grids).length > 0),
      nwsGrids: nwsData?.grids ? Object.keys(nwsData.grids) : [],
      nwsFetchedAt: nwsData?.fetchedAt || null,
      gradientIndicatorsActive: Object.keys(gradientSignals),
    },
  };
}

// ══════════════════════════════════════════════════════════════
// HISTORICAL BACKFILL — replays N days of data through the
// predict→verify→learn loop to bootstrap model weights
// ══════════════════════════════════════════════════════════════

function binToInterval(readings, intervalMinutes = 15) {
  const bins = {};
  for (const r of readings) {
    const t = new Date(r.time);
    const minute = Math.floor(t.getMinutes() / intervalMinutes) * intervalMinutes;
    const key = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}T${String(t.getHours()).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    if (!bins[key]) bins[key] = {};
    if (!bins[key][r.stationId]) bins[key][r.stationId] = r;
  }
  return bins;
}

async function backfillHistorical(redisCmd, synopticToken, allStations, lakeStationMap, days = 3) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600000);
  const startStr = start.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const endStr = end.toISOString().replace(/[-:T]/g, '').slice(0, 12);

  const url = `https://api.synopticdata.com/v2/stations/timeseries?token=${synopticToken}&stids=${allStations.join(',')}&start=${startStr}&end=${endStr}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter,sea_level_pressure&units=english&obtimezone=utc`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Synoptic timeseries ${resp.status}`);
  const json = await resp.json();

  const allReadings = [];
  for (const s of (json.STATION || [])) {
    const obs = s.OBSERVATIONS || {};
    const times = obs.date_time || [];
    const speeds = obs.wind_speed_set_1 || [];
    const dirs = obs.wind_direction_set_1 || [];
    const gusts = obs.wind_gust_set_1 || [];
    const temps = obs.air_temp_set_1 || [];
    const pressures = obs.altimeter_set_1 || obs.sea_level_pressure_set_1 || obs.pressure_set_1d || obs.pressure_set_1 || [];

    for (let i = 0; i < times.length; i++) {
      allReadings.push({
        stationId: s.STID,
        time: times[i],
        windSpeed: speeds[i] ?? null,
        windDirection: dirs[i] ?? null,
        windGust: gusts[i] ?? null,
        temperature: temps[i] ?? null,
        pressure: normalizeToMb(pressures[i] ?? null),
      });
    }
  }

  const bins = binToInterval(allReadings, 15);
  const sortedKeys = Object.keys(bins).sort();

  let weights = await loadWeights(redisCmd) || { eventWeights: {}, lakeWeights: {}, meta: {} };
  let totalPredictions = 0;
  let totalVerifications = 0;
  let totalAccuracyRecords = 0;
  const predictionBuffer = [];

  for (let i = 0; i < sortedKeys.length; i++) {
    const timeKey = sortedKeys[i];
    const stationMap = bins[timeKey];
    const stations = Object.values(stationMap).filter(s => s.windSpeed != null);
    if (stations.length === 0) continue;

    const ts = new Date(timeKey + ':00Z');
    const hour = toMountainHour(ts);

    const recentHistory = [];
    for (let j = Math.max(0, i - 12); j < i; j++) {
      const histStations = Object.values(bins[sortedKeys[j]] || {});
      if (histStations.length > 0) recentHistory.push({ stations: histStations });
    }

    const pressure = analyzePressure(stations, recentHistory);

    // Make predictions for this time step
    const stepPredictions = [];
    for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
      const lakeStations = stations.filter(s => stationIds.includes(s.stationId));
      if (lakeStations.length === 0) continue;

      const primaryId = LAKE_THERMAL[lakeId]?.station || stationIds[0];
      const primary = lakeStations.find(s => s.stationId === primaryId) || lakeStations[0];
      const history = buildStationHistory(primary.stationId, recentHistory);
      const upSig = detectUpstreamSignals ? detectUpstreamSignals(stations, recentHistory) : [];
      const events = predictForLake(lakeId, primary, pressure, history, hour, weights, upSig, null);

      for (const evt of events) {
        stepPredictions.push({ ...evt, lakeId, timestamp: ts.toISOString(), predictionHour: hour });
      }
    }
    totalPredictions += stepPredictions.length;
    predictionBuffer.push({ timestamp: ts, predictions: stepPredictions });

    // Verify predictions using per-event-type windows
    const verifyBuffer = predictionBuffer.filter(p => {
      const age = ts.getTime() - p.timestamp.getTime();
      return age > 60 * 60000 && age < 360 * 60000;
    });

    if (verifyBuffer.length > 0) {
      const toVerify = verifyBuffer.flatMap(p => {
        const age = ts.getTime() - p.timestamp.getTime();
        return p.predictions.filter(pred => {
          const w = VERIFY_WINDOWS[pred.eventType] || DEFAULT_VERIFY_WINDOW;
          return age > w.min * 60000 && age < w.max * 60000;
        });
      });
      const accuracy = verifyPredictions(toVerify, stations, lakeStationMap);
      totalAccuracyRecords += accuracy.length;

      if (accuracy.length > 0) {
        totalVerifications++;
        weights = updateWeights(weights, accuracy);
      }
    }

    // Prune old predictions from buffer (older than 5 hours)
    while (predictionBuffer.length > 0 && (ts.getTime() - predictionBuffer[0].timestamp.getTime()) > 5 * 3600000) {
      predictionBuffer.shift();
    }
  }

  // Save final weights to Redis
  weights.meta = weights.meta || {};
  weights.meta.lastUpdated = new Date().toISOString();
  weights.meta.backfillDays = days;
  weights.meta.backfillTimeSteps = sortedKeys.length;
  weights.meta.totalPredictions = (weights.meta.totalPredictions || 0) + totalPredictions;
  await saveWeights(redisCmd, weights);

  // Update meta
  const meta = await loadMeta(redisCmd);
  meta.totalPredictions += totalPredictions;
  meta.totalVerified += totalAccuracyRecords;
  meta.totalCycles += sortedKeys.length;
  meta.lastBackfill = new Date().toISOString();
  meta.backfillDays = days;
  await saveMeta(redisCmd, meta);

  return {
    timeSteps: sortedKeys.length,
    totalPredictions,
    totalVerifications,
    totalAccuracyRecords,
    finalAccuracy: weights.meta?.overallAccuracy,
    eventAccuracy: weights.meta?.eventAccuracy,
    weights,
  };
}

// ══════════════════════════════════════════════════════════════
// TRIPLE VALIDATION — Window Forecast Grading & Auto-Healing
// ══════════════════════════════════════════════════════════════

/**
 * Evaluate predicted sport windows against actual sensor data
 * and apply targeted weight adjustments.
 *
 * @param {Function} redisCmd
 * @param {Object} currentWeights - live server weights
 * @param {Object} nwsData - NWS forecasts (for getting predicted windows)
 * @returns {{ windowScores: Array, adjustments: Array, updatedWeights: Object }}
 */
async function evaluateAndAdjustWindows(redisCmd, currentWeights, nwsData) {
  const results = { windowScores: [], adjustments: [], updatedWeights: currentWeights };

  // 1. Load yesterday's predicted windows from Redis
  let predictedWindows = [];
  try {
    const raw = await redisCmd('GET', 'windows:predicted');
    if (raw) predictedWindows = JSON.parse(raw);
  } catch { /* no prior windows */ }

  if (predictedWindows.length === 0) return results;

  // 2. Load actual observation snapshots from the last 24 hours
  const obsKeys = await redisCmd('LRANGE', 'obs:index', '0', '96'); // ~24h at 15-min intervals
  if (!obsKeys?.length) return results;

  const obsValues = await redisCmd('MGET', ...obsKeys);
  const allObs = [];
  const cutoff24h = Date.now() - 24 * 3600000;
  for (const raw of (obsValues || [])) {
    if (!raw) continue;
    try {
      const snap = JSON.parse(raw);
      if (new Date(snap.timestamp).getTime() > cutoff24h) {
        for (const s of (snap.stations || [])) {
          allObs.push({
            timestamp: snap.timestamp,
            stationId: s.stationId,
            windSpeed: s.windSpeed ?? null,
            windGust: s.windGust ?? null,
            windDirection: s.windDirection ?? null,
            temperature: s.temperature ?? null,
          });
        }
      }
    } catch { /* skip malformed */ }
  }

  if (allObs.length === 0) return results;

  // 3. Grade each predicted window
  const weights = JSON.parse(JSON.stringify(currentWeights));
  if (!weights.windowWeights) weights.windowWeights = {};
  if (!weights.terrainMultipliers) weights.terrainMultipliers = {};

  for (const win of predictedWindows) {
    const lakeId = win.locationId;
    const sportType = win.sportType;

    // Get the primary station for this lake
    const thermalCfg = LAKE_THERMAL[lakeId];
    const primaryStationId = thermalCfg?.station || null;
    if (!primaryStationId) continue;

    // Filter observations to this station
    const stationObs = allObs.filter(o => o.stationId === primaryStationId);
    if (stationObs.length === 0) continue;

    const predStart = new Date(win.windowStart);
    const predEnd = new Date(win.windowEnd);
    if (isNaN(predStart.getTime()) || isNaN(predEnd.getTime())) continue;

    const predDuration = win.durationHours ?? ((predEnd - predStart) / 3600000);
    const predictedPeak = parseFloat(String(win.peakCondition).match(/([\d.]+)/)?.[1] || '0');
    const speedThreshold = win.sportType?.includes('boating') ? 3 : 8;

    // Generous observation window: ±3 hrs
    const bufferMs = 3 * 3600000;
    const relevantObs = stationObs.filter(o => {
      const t = new Date(o.timestamp).getTime();
      return t >= predStart.getTime() - bufferMs && t <= predEnd.getTime() + bufferMs;
    });

    if (relevantObs.length === 0) continue;

    // Find actual active period
    const activeObs = relevantObs.filter(o => (o.windSpeed ?? 0) >= speedThreshold);
    const actualStart = activeObs.length > 0 ? new Date(activeObs[0].timestamp) : null;
    const actualEnd = activeObs.length > 0 ? new Date(activeObs[activeObs.length - 1].timestamp) : null;
    const actualDuration = actualStart && actualEnd
      ? Math.max(1, Math.round((actualEnd - actualStart) / 3600000))
      : 0;
    const actualPeak = Math.max(0, ...relevantObs.map(o => o.windSpeed ?? 0));

    // ── Triple Validation Metrics ──

    // Start Time Delta (hours)
    const startDelta = actualStart
      ? (actualStart.getTime() - predStart.getTime()) / 3600000
      : NaN;

    // Duration Delta (hours)
    const durationDelta = actualDuration > 0
      ? actualDuration - predDuration
      : -predDuration;

    // Peak Magnitude Error (fractional)
    const peakError = predictedPeak > 0
      ? Math.abs(actualPeak - predictedPeak) / predictedPeak
      : (actualPeak > 0 ? 1 : 0);

    // Composite score (0-100)
    const startScore = isNaN(startDelta) ? 0 : Math.max(0, 35 - Math.abs(startDelta) * 10);
    const durScore = actualDuration > 0 ? Math.max(0, 30 - Math.abs(durationDelta) * 8) : 0;
    const peakScore = peakError <= 0.15 ? 35 : Math.max(0, 35 - ((peakError - 0.15) / 0.5) * 35);
    const composite = Math.round(startScore + durScore + peakScore);

    const verdict = composite >= 75 ? 'accurate' : composite >= 40 ? 'shifted' : 'busted';

    results.windowScores.push({
      locationId: lakeId, sportType, composite, verdict,
      startDelta: isNaN(startDelta) ? null : Math.round(startDelta * 10) / 10,
      durationDelta: Math.round(durationDelta * 10) / 10,
      peakError: Math.round(peakError * 1000) / 1000,
      predictedPeak, actualPeak: Math.round(actualPeak * 10) / 10,
    });

    // ── Weight Adjustment Loop ──

    const lwKey = `${lakeId}:window`;
    if (!weights.windowWeights[lwKey]) {
      weights.windowWeights[lwKey] = { thermalMultiplier: 1.0, terrainConfidence: 1.0, count: 0, totalScore: 0 };
    }
    const ww = weights.windowWeights[lwKey];
    ww.count++;
    ww.totalScore += composite;
    const lerpRate = Math.min(0.08, 1 / (ww.count + 10));

    if (composite < 75) {
      // ── Thermal Penalty ──
      // Predicted high wind but got low wind → busted thermal
      if (predictedPeak >= 12 && actualPeak < 8) {
        const decay = lerpRate * 1.5;
        ww.thermalMultiplier = Math.max(0.5, ww.thermalMultiplier - decay);
        results.adjustments.push({
          locationId: lakeId, type: 'thermal_penalty',
          reason: `Predicted ${predictedPeak}mph, got ${Math.round(actualPeak)}mph — busted thermal`,
          delta: -decay,
          newValue: Math.round(ww.thermalMultiplier * 1000) / 1000,
        });
      }

      // General window accuracy decay: nudge down if consistently bad
      if (composite < 40) {
        ww.terrainConfidence = Math.max(0.5, ww.terrainConfidence - lerpRate);
      }
    }

    // ── Fetch/Venturi Reward ──
    // Predicted speed and got it within 15% → terrain multipliers are working
    if (peakError <= 0.15 && predictedPeak >= 10) {
      const reward = lerpRate * 0.5;
      const tmKey = `${lakeId}:terrain`;
      if (!weights.terrainMultipliers[tmKey]) {
        weights.terrainMultipliers[tmKey] = { confidence: 1.0, count: 0 };
      }
      const tm = weights.terrainMultipliers[tmKey];
      tm.count++;
      tm.confidence = Math.min(1.5, tm.confidence + reward);
      results.adjustments.push({
        locationId: lakeId, type: 'terrain_reward',
        reason: `Predicted ${predictedPeak}mph, got ${Math.round(actualPeak)}mph — terrain physics validated`,
        delta: reward,
        newValue: Math.round(tm.confidence * 1000) / 1000,
      });
    }

    // ── Thermal Recovery ──
    // If the thermal multiplier was penalized but we're now getting accurate windows,
    // slowly recover (seasonal adaptation)
    if (composite >= 75 && ww.thermalMultiplier < 1.0) {
      const recovery = lerpRate * 0.3;
      ww.thermalMultiplier = Math.min(1.0, ww.thermalMultiplier + recovery);
      results.adjustments.push({
        locationId: lakeId, type: 'thermal_recovery',
        reason: `Window accurate (${composite}/100) — thermal trust recovering`,
        delta: recovery,
        newValue: Math.round(ww.thermalMultiplier * 1000) / 1000,
      });
    }
  }

  // Update meta
  weights.meta = weights.meta || {};
  weights.meta.lastWindowValidation = new Date().toISOString();
  weights.meta.windowValidationCount = (weights.meta.windowValidationCount || 0) + results.windowScores.length;
  const avgWindow = results.windowScores.length > 0
    ? Math.round(results.windowScores.reduce((s, w) => s + w.composite, 0) / results.windowScores.length)
    : null;
  weights.meta.avgWindowAccuracy = avgWindow;

  results.updatedWeights = weights;
  return results;
}

/**
 * Store predicted sport windows in Redis so they can be graded tomorrow.
 * Called after findAllSportWindows during ingest or the learning cycle.
 */
async function storeWindowPredictions(redisCmd, windowsByLake) {
  const flat = [];
  for (const [locationId, windows] of Object.entries(windowsByLake)) {
    for (const [sportType, win] of Object.entries(windows)) {
      flat.push({ ...win, locationId, sportType });
    }
  }
  if (flat.length > 0) {
    await redisCmd('SET', 'windows:predicted', JSON.stringify(flat), 'EX', '172800'); // 48h TTL
  }
  return flat.length;
}

export {
  runServerLearningCycle,
  backfillHistorical,
  evaluateAndAdjustWindows,
  storeWindowPredictions,
  loadWeights,
  saveWeights,
  loadMeta,
  toMountainHour,
  normalizeToMb,
  computeGradientSignals,
  LAKE_THERMAL,
  GRADIENT_INDICATORS,
};
