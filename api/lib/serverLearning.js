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
 *   accuracy:log              — recent accuracy records (list, capped at 500)
 *   learning:meta             — metadata: total predictions, cycles, last update
 */

// ── Lake thermal configurations (server-side subset of lakeStations.js) ──
const LAKE_THERMAL = {
  'utah-lake-lincoln':    { dir: [135, 165], peak: [10, 16], station: 'FPS' },
  'utah-lake-sandy':      { dir: [130, 160], peak: [10, 16], station: 'QSF' },
  'utah-lake-vineyard':   { dir: [180, 270], peak: [10, 16], station: 'QSF' },
  'utah-lake-zigzag':     { dir: [135, 165], peak: [10, 16], station: 'FPS' },
  'utah-lake-mm19':       { dir: [120, 160], peak: [10, 16], station: 'FPS' },
  'deer-creek':           { dir: [170, 210], peak: [11, 17], station: 'DCC' },
  'jordanelle':           { dir: [180, 230], peak: [11, 17], station: 'KHCR' },
  'willard-bay':          { dir: [170, 220], peak: [11, 17], station: 'KSLC' },
  'bear-lake':            { dir: [250, 320], peak: [12, 18], station: 'BERU1' },
  'strawberry-ladders':   { dir: [260, 340], peak: [10, 16], station: 'KHCR' },
  'strawberry-bay':       { dir: [220, 280], peak: [10, 16], station: 'KHCR' },
  'skyline-drive':        { dir: [250, 340], peak: [10, 16], station: 'KHCR' },
  'starvation':           { dir: [180, 230], peak: [11, 17], station: 'KVEL' },
  'flaming-gorge':        { dir: [130, 200], peak: [11, 17], station: 'KFGR' },
  'scofield':             { dir: [250, 320], peak: [11, 17], station: 'KPUC' },
  'sand-hollow':          { dir: [200, 250], peak: [10, 17], station: 'KSGU' },
  'lake-powell':          { dir: [180, 270], peak: [10, 18], station: 'KPGA' },
  'rush-lake':            { dir: [170, 210], peak: [10, 18], station: 'KSLC' },
  'potm-south':           { dir: [110, 250], peak: [7, 15],  station: 'FPS' },
  'potm-north':           { dir: [320, 360], peak: [12, 18], station: 'FPS' },
  'powder-mountain':      { dir: [180, 270], peak: [10, 18], station: 'KSLC' },
};

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
  return dir >= 300 || dir <= 60;
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
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
      const distBetween = farthest.distMi - nearest.distMi;
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

function scoreFrontal(station, pressure, history, upstreamSignals) {
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

  // UPSTREAM BOOST: if north stations detect an approaching cold front,
  // this is the strongest early signal we have
  const coldFrontSignals = (upstreamSignals || []).filter(s => s.type === 'cold_front');
  if (coldFrontSignals.length > 0) {
    const strongest = coldFrontSignals[0];
    const upstreamBoost = Math.min(35, strongest.strength * 0.4);
    score += upstreamBoost;

    if (coldFrontSignals.length >= 2) score += 10;
    if (strongest.multiStationConfirm) score += 5;
  }

  // West system approaching = front will follow
  const westSignals = (upstreamSignals || []).filter(s => s.type === 'approaching_system');
  if (westSignals.length > 0) {
    score += Math.min(15, westSignals[0].strength * 0.2);
  }

  return { score: Math.min(100, score), upstreamSignals: coldFrontSignals };
}

function scoreNorthFlow(station, pressure) {
  let score = 0;
  const gradient = pressure.gradient ?? 0;
  if (gradient > 2.0) score += 35;
  else if (gradient > 1.0) score += 15;
  if (station.windDirection != null && isNortherly(station.windDirection)) {
    score += 20;
    if (station.windSpeed > 10) score += 15;
  }
  if (station.temperature != null) {
    const month = new Date().getMonth();
    const avg = [35,40,48,55,65,75,85,83,73,60,45,35][month];
    if (station.temperature < avg - 10) score += 15;
  }
  return Math.min(95, score);
}

function scoreClearing(station, pressure, history, hour) {
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
  return Math.min(90, score);
}

function scoreThermal(station, pressure, hour, lakeId) {
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
  return Math.max(0, Math.min(95, score));
}

function scorePreFrontal(station, pressure, history, upstreamSignals) {
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

  // UPSTREAM BOOST: SW/W flow detected at Delta, Wendover, Milford
  const preFrontalFlow = (upstreamSignals || []).filter(s => s.type === 'pre_frontal_flow');
  if (preFrontalFlow.length > 0) {
    const strongest = preFrontalFlow[0];
    score += Math.min(30, strongest.strength * 0.35);
    if (preFrontalFlow.length >= 2) score += 10;
  }

  // If a cold front is detected upstream, pre-frontal ramp is likely
  const coldFronts = (upstreamSignals || []).filter(s => s.type === 'cold_front');
  if (coldFronts.length > 0 && coldFronts[0].etaHours > 2) {
    score += 15;
  }

  return { score: Math.min(100, score), upstreamSignals: preFrontalFlow };
}

function scoreGlass(station, pressure, hour) {
  let score = 0;
  if (station.windSpeed != null && station.windSpeed < 5) score += 30;
  else if (station.windSpeed != null && station.windSpeed < 8) score += 10;
  if (hour >= 5 && hour <= 10) score += 20;
  if (Math.abs(pressure.gradient ?? 0) < 1.0) score += 15;
  if (pressure.trend === 'stable' || pressure.trend === 'rising') score += 10;
  return Math.min(95, score);
}

function scorePostFrontal(station, pressure, history) {
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
  return Math.min(90, score);
}

// ── Main Prediction Function ──

function predictForLake(lakeId, primaryStation, pressure, history, hour, learnedWeights, upstreamSignals) {
  const events = [];
  const types = [
    { id: 'frontal_passage', fn: () => scoreFrontal(primaryStation, pressure, history, upstreamSignals), expSpeed: [15, 35], expDir: [300, 30] },
    { id: 'north_flow',      fn: () => scoreNorthFlow(primaryStation, pressure), expSpeed: [10, 25], expDir: [315, 45] },
    { id: 'clearing_wind',   fn: () => scoreClearing(primaryStation, pressure, history, hour), expSpeed: [5, 15], expDir: [160, 230] },
    { id: 'thermal_cycle',   fn: () => scoreThermal(primaryStation, pressure, hour, lakeId), expSpeed: [6, 18], expDir: LAKE_THERMAL[lakeId]?.dir || [135, 165] },
    { id: 'pre_frontal',     fn: () => scorePreFrontal(primaryStation, pressure, history, upstreamSignals), expSpeed: [10, 20], expDir: [180, 250] },
    { id: 'glass',           fn: () => scoreGlass(primaryStation, pressure, hour), expSpeed: [0, 5], expDir: null },
    { id: 'post_frontal',    fn: () => scorePostFrontal(primaryStation, pressure, history), expSpeed: [8, 15], expDir: [290, 340] },
  ];

  for (const t of types) {
    let result = t.fn();
    // Handle both old number return and new {score, upstreamSignals} return
    let prob = typeof result === 'number' ? result : result.score;
    const eventUpstream = typeof result === 'object' ? result.upstreamSignals : null;

    // Apply learned weight adjustments
    if (learnedWeights?.eventWeights?.[t.id]) {
      const mod = learnedWeights.eventWeights[t.id];
      prob = Math.max(0, Math.min(100, prob + (mod.baseProbMod || 0)));
      if (mod.hourlyBias?.[hour]) {
        prob = Math.max(0, Math.min(100, prob + mod.hourlyBias[hour]));
      }
    }

    if (prob > 20) {
      const evt = {
        eventType: t.id,
        probability: prob,
        expectedSpeed: t.expSpeed,
        expectedDirection: t.expDir,
        primaryStation: primaryStation.stationId,
        windSpeed: primaryStation.windSpeed,
        windDirection: primaryStation.windDirection,
        temperature: primaryStation.temperature,
      };

      // Attach upstream intelligence to frontal/pre-frontal predictions
      if (eventUpstream && eventUpstream.length > 0) {
        const best = eventUpstream[0];
        evt.upstreamDetection = {
          stationId: best.stationId,
          stationName: best.name,
          corridor: best.corridor,
          strength: best.strength,
          etaHours: best.consensusEta || best.etaHours,
          details: best.details,
          confirmedBy: eventUpstream.length,
        };
      }

      events.push(evt);
    }
  }
  return events;
}

// ── Pressure Analysis ──
// Both stations report altimeter setting (already altitude-corrected).
// The difference IS the weather gradient — no altitude correction needed.
// A positive gradient (SLC > PVU) indicates north-to-south pressure push.
const PRESSURE_ALTITUDE_BASELINE = 0;

function analyzePressure(currentStations, recentSnapshots) {
  const slc = currentStations.find(s => s.stationId === 'KSLC');
  const pvu = currentStations.find(s => s.stationId === 'KPVU');
  const rawGradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
  const gradient = rawGradient != null ? rawGradient - PRESSURE_ALTITUDE_BASELINE : 0;

  let trend = 'stable';
  if (recentSnapshots.length >= 4) {
    const oldSlc = recentSnapshots[recentSnapshots.length - 1]?.stations?.find(s => s.stationId === 'KSLC');
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

    results.push({
      lakeId,
      eventType: pred.eventType,
      predicted: pred.probability,
      actualSpeed,
      actualDirection: primary.windDirection,
      expectedSpeedMid: (expMin + expMax) / 2,
      predictionHour: pred.predictionHour ?? null,
      score: Math.round(score * 100) / 100,
      timestamp: new Date().toISOString(),
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

    // Speed bias: track systematic over/under prediction
    if (record.actualSpeed != null && record.expectedSpeedMid != null) {
      const speedErr = record.actualSpeed - record.expectedSpeedMid;
      ew.speedBias = ew.speedBias * 0.95 + speedErr * 0.05;
    }

    // Hourly bias: learn which hours are better/worse for this event type
    const hour = record.predictionHour ?? new Date(record.timestamp).getUTCHours();
    if (!ew.hourlyBias[hour]) ew.hourlyBias[hour] = 0;
    const hourlyTarget = record.score > 0.6 ? 2 : record.score < 0.3 ? -2 : 0;
    ew.hourlyBias[hour] = ew.hourlyBias[hour] * 0.9 + hourlyTarget * 0.1;

    // Per-lake tracking
    if (!weights.lakeWeights) weights.lakeWeights = {};
    if (!weights.lakeWeights[record.lakeId]) {
      weights.lakeWeights[record.lakeId] = { count: 0, totalScore: 0 };
    }
    const lw = weights.lakeWeights[record.lakeId];
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

  // Per-event accuracy summary
  weights.meta.eventAccuracy = {};
  for (const [key, ew] of Object.entries(eventWeights)) {
    weights.meta.eventAccuracy[key] = ew.count > 0
      ? { accuracy: Math.round((ew.totalScore / ew.count) * 100) / 100, count: ew.count, probMod: Math.round(ew.baseProbMod * 10) / 10 }
      : null;
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
  await redisCmd('SET', 'weights:server', JSON.stringify(weights));
}

async function loadRecentPredictions(redisCmd, lookbackMinutes = 240) {
  const keys = await redisCmd('LRANGE', 'pred:index', '0', '30');
  if (!keys || keys.length === 0) return [];

  const cutoff = Date.now() - lookbackMinutes * 60000;
  const all = [];
  for (const key of keys) {
    const raw = await redisCmd('GET', key);
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
  await redisCmd('LTRIM', 'accuracy:log', '0', '499');
}

async function loadMeta(redisCmd) {
  const raw = await redisCmd('GET', 'learning:meta');
  if (!raw) return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 };
  try { return JSON.parse(raw); } catch { return { totalCycles: 0, totalPredictions: 0, totalVerified: 0 }; }
}

async function saveMeta(redisCmd, meta) {
  await redisCmd('SET', 'learning:meta', JSON.stringify(meta));
}

// ══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — called by cron after data collection
// ══════════════════════════════════════════════════════════════

async function runServerLearningCycle(redisCmd, currentStations, recentSnapshots, lakeStationMap) {
  const now = new Date();
  const hour = toMountainHour(now);
  const pressure = analyzePressure(currentStations, recentSnapshots);

  // 1. Load current weights
  const weights = await loadWeights(redisCmd) || { eventWeights: {}, lakeWeights: {}, meta: {} };

  // 1.5 Detect upstream signals for frontal early warning
  const upstreamSignals = detectUpstreamSignals(currentStations, recentSnapshots);

  // Store upstream signals in Redis for client display
  if (upstreamSignals.length > 0) {
    try {
      await redisCmd('SET', 'upstream:latest', JSON.stringify({
        timestamp: now.toISOString(),
        signals: upstreamSignals,
      }), 'EX', '3600');
    } catch {}
  }

  // 2. Make predictions for every lake (with upstream intelligence)
  const allPredictions = [];
  for (const [lakeId, stationIds] of Object.entries(lakeStationMap)) {
    const lakeStations = currentStations.filter(s => stationIds.includes(s.stationId));
    if (lakeStations.length === 0) continue;

    const primaryId = LAKE_THERMAL[lakeId]?.station || stationIds[0];
    const primary = lakeStations.find(s => s.stationId === primaryId) || lakeStations[0];
    const history = buildStationHistory(primary.stationId, recentSnapshots);

    const events = predictForLake(lakeId, primary, pressure, history, hour, weights, upstreamSignals);
    for (const evt of events) {
      allPredictions.push({ ...evt, lakeId });
    }
  }

  // 3. Store predictions
  if (allPredictions.length > 0) {
    await savePredictions(redisCmd, allPredictions, now);
  }

  // 4. Verify old predictions (2-4 hours ago) against current actuals
  const oldPredictions = await loadRecentPredictions(redisCmd, 240);
  const verificationsNeeded = oldPredictions.filter(p => {
    const age = now.getTime() - new Date(p.timestamp || 0).getTime();
    return age > 90 * 60000 && age < 300 * 60000;
  });

  let accuracyRecords = [];
  if (verificationsNeeded.length > 0) {
    accuracyRecords = verifyPredictions(verificationsNeeded, currentStations, lakeStationMap);
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
    meta,
    pressure,
    diagnostics: {
      mountainTimeHour: hour,
      utcHour: now.getUTCHours(),
      snapshotCount: recentSnapshots.length,
      snapshotOrder: recentSnapshots.length >= 2
        ? (new Date(recentSnapshots[0].timestamp) < new Date(recentSnapshots[1].timestamp) ? 'chronological' : 'REVERSED')
        : 'insufficient',
      oldPredictionsFound: oldPredictions.length,
      verificationsInWindow: verificationsNeeded.length,
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
      const events = predictForLake(lakeId, primary, pressure, history, hour, weights);

      for (const evt of events) {
        stepPredictions.push({ ...evt, lakeId, timestamp: ts.toISOString() });
      }
    }
    totalPredictions += stepPredictions.length;
    predictionBuffer.push({ timestamp: ts, predictions: stepPredictions });

    // Verify predictions from 2-4 hours ago
    const verifyWindow = predictionBuffer.filter(p => {
      const age = ts.getTime() - p.timestamp.getTime();
      return age > 90 * 60000 && age < 300 * 60000;
    });

    if (verifyWindow.length > 0) {
      const toVerify = verifyWindow.flatMap(p => p.predictions);
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

export {
  runServerLearningCycle,
  backfillHistorical,
  loadWeights,
  loadMeta,
  toMountainHour,
  normalizeToMb,
  LAKE_THERMAL,
};
