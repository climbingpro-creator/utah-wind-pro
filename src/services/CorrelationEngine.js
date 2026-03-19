/**
 * MESO-RELATIONAL CORRELATION ENGINE
 * 
 * Layers spatial intelligence on top of the base ThermalPredictor output.
 * Uses mesoRegistry.json to define which upstream "gates" and "indicators"
 * affect each location, then applies multipliers when sensors confirm
 * active patterns.
 * 
 * Architecture:
 *   mesoRegistry.json  →  CorrelationEngine  →  refined forecast
 *        (config)           (this file)          (speed × multiplier + triggers)
 * 
 * The engine NEVER replaces the base prediction — it refines it.
 */

import relations from '../config/mesoRegistry.json';

function isInHeadingRange(dir, range) {
  if (dir == null || !range) return false;
  const [min, max] = range;
  if (min <= max) {
    return dir >= min && dir <= max;
  }
  // Wraps around north (e.g. [315, 45])
  return dir >= min || dir <= max;
}

function getSensorData(mesoData, sensorId) {
  if (!mesoData) return null;

  // Check direct key first, then search stations array
  if (mesoData[sensorId]) {
    const d = mesoData[sensorId];
    return {
      speed: d.speed ?? d.windSpeed ?? 0,
      dir: d.direction ?? d.windDirection ?? 0,
      temp: d.temperature ?? d.temp ?? null,
      gust: d.gust ?? d.windGust ?? null,
    };
  }

  const station = mesoData.stations?.find(s => s.id === sensorId);
  if (station) {
    return {
      speed: station.speed ?? station.windSpeed ?? 0,
      dir: station.direction ?? station.windDirection ?? 0,
      temp: station.temperature ?? station.temp ?? null,
      gust: station.gust ?? station.windGust ?? null,
    };
  }

  return null;
}

/**
 * Evaluate all spatial correlations for a lake and return refined forecast.
 * 
 * @param {string} lakeId - e.g. 'utah-lake-zigzag', 'deer-creek'
 * @param {object} baseForecast - output from predictThermal() or current conditions
 * @param {object} mesoData - normalized station data { stations: [...], KSLC: {...}, ... }
 * @param {object} [pws] - personal weather station data (your Saratoga Springs sensor)
 * @returns {object} refined forecast with activeTriggers array
 */
export function calculateCorrelatedWind(lakeId, baseForecast, mesoData, pws = null) {
  const config = relations.RELATIONS[lakeId];
  if (!config || !baseForecast) {
    return {
      ...baseForecast,
      refinedSpeed: baseForecast?.speed ?? baseForecast?.expectedSpeed ?? null,
      activeTriggers: [],
      spatialConfidence: 'standard',
      multiplier: 1.0,
    };
  }

  let finalMultiplier = 1.0;
  const activeTriggers = [];

  // ─── 1. GSL SURGE (North Wind Accelerator) ───────────────────────
  if (config.thermal_engine?.indicator_type === 'GSL_SURGE') {
    const gate = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    const local = pws ? {
      speed: pws.windSpeed ?? 0,
      temp: pws.temperature ?? null,
    } : getSensorData(mesoData, 'FPS');

    if (gate && local) {
      const tempDelta = (local.temp != null && gate.temp != null)
        ? local.temp - gate.temp : null;
      const isCorrectHeading = isInHeadingRange(gate.dir, config.thermal_engine.wind_heading);
      const isStrongEnough = gate.speed >= (config.thermal_engine.min_speed || 0);

      if (isCorrectHeading && isStrongEnough) {
        if (tempDelta != null && tempDelta >= config.thermal_engine.min_temp_delta) {
          finalMultiplier *= config.thermal_engine.multiplier;
          activeTriggers.push({
            id: 'gsl-surge',
            label: 'GSL Surge Active',
            detail: `KSLC ${gate.speed.toFixed(0)} mph NW, ΔT=${tempDelta.toFixed(0)}°F`,
            impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
            type: 'boost',
          });
        } else if (isStrongEnough) {
          // Heading matches but no temp data — still partial credit
          finalMultiplier *= 1 + (config.thermal_engine.multiplier - 1) * 0.5;
          activeTriggers.push({
            id: 'gsl-surge-partial',
            label: 'GSL Surge Developing',
            detail: `KSLC ${gate.speed.toFixed(0)} mph NW — awaiting temp confirmation`,
            impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 50)}%`,
            type: 'developing',
          });
        }
      }
    }
  }

  // ─── 2. PROVO LIGHT (South shore thermal enabler) ────────────────
  if (config.thermal_engine?.indicator_type === 'PROVO_LIGHT') {
    const gate = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    if (gate && gate.speed <= (config.thermal_engine.max_speed || 8)) {
      finalMultiplier *= config.thermal_engine.multiplier;
      activeTriggers.push({
        id: 'provo-light',
        label: 'Provo Light — Thermal Free',
        detail: `KPVU only ${gate.speed.toFixed(0)} mph, no blocking flow`,
        impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
        type: 'boost',
      });
    }
  }

  // ─── 3. SOUTH ONSHORE (Vineyard) ─────────────────────────────────
  if (config.thermal_engine?.indicator_type === 'SOUTH_ONSHORE') {
    const gate = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    if (gate) {
      const isOnshore = isInHeadingRange(gate.dir, config.thermal_engine.heading);
      const isStrong = gate.speed >= (config.thermal_engine.min_speed || 0);

      if (isOnshore && isStrong) {
        finalMultiplier *= config.thermal_engine.multiplier;
        activeTriggers.push({
          id: 'south-onshore',
          label: 'Onshore Flow Active',
          detail: `KPVU ${gate.speed.toFixed(0)} mph from S/SSW — onshore at Vineyard`,
          impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 4. CANYON DRAINAGE (Spanish Fork / MM19) ────────────────────
  if (config.thermal_engine?.indicator_type === 'CANYON_DRAINAGE') {
    const gate = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    if (gate) {
      const isCorrectHeading = isInHeadingRange(gate.dir, config.thermal_engine.heading);
      const isStrong = gate.speed >= (config.thermal_engine.min_speed || 0);

      if (isCorrectHeading && isStrong) {
        finalMultiplier *= config.thermal_engine.multiplier;
        activeTriggers.push({
          id: 'canyon-drainage',
          label: 'Canyon Drainage Active',
          detail: `QSF ${gate.speed.toFixed(0)} mph SE — funneling into lake`,
          impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 5. CANYON BOOST (Spanish Fork secondary for other locations) ─
  if (config.canyon_boost) {
    const gate = getSensorData(mesoData, config.canyon_boost.gate_sensor);
    if (gate) {
      const isCorrectHeading = isInHeadingRange(gate.dir, config.canyon_boost.heading);
      const [minSpd, maxSpd] = config.canyon_boost.speed_range;
      const isInRange = gate.speed >= minSpd && gate.speed <= maxSpd;

      if (isCorrectHeading && isInRange) {
        finalMultiplier *= config.canyon_boost.multiplier;
        activeTriggers.push({
          id: 'canyon-boost',
          label: 'Spanish Fork Squeeze',
          detail: `QSF ${gate.speed.toFixed(0)} mph SE → canyon push adds wind`,
          impact: `+${Math.round((config.canyon_boost.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 6. NORTH FLOW (Lincoln/Sandy north wind) ────────────────────
  if (config.north_flow) {
    const gate = getSensorData(mesoData, config.north_flow.upstream_gate);
    if (gate) {
      const isNorth = isInHeadingRange(gate.dir, config.north_flow.heading);
      const isStrong = gate.speed >= (config.north_flow.min_speed || 0);

      if (isNorth && isStrong) {
        finalMultiplier *= config.north_flow.multiplier;
        activeTriggers.push({
          id: 'north-flow',
          label: 'North Flow Push',
          detail: `KSLC ${gate.speed.toFixed(0)} mph NW — pushing south to launch`,
          impact: `+${Math.round((config.north_flow.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 7. VALLEY CONFIRMATION ──────────────────────────────────────
  if (config.valley_confirmation) {
    const sensor = getSensorData(mesoData, config.valley_confirmation.sensor);
    if (sensor) {
      const isCorrect = isInHeadingRange(sensor.dir, config.valley_confirmation.heading);
      const isStrong = sensor.speed >= (config.valley_confirmation.min_speed || 0);

      if (isCorrect && isStrong) {
        finalMultiplier *= config.valley_confirmation.multiplier;
        activeTriggers.push({
          id: 'valley-confirm',
          label: 'Valley Confirmed',
          detail: `${config.valley_confirmation.sensor} ${sensor.speed.toFixed(0)} mph — flow reaching lake`,
          impact: `+${Math.round((config.valley_confirmation.multiplier - 1) * 100)}%`,
          type: 'confirmation',
        });
      }
    }
  }

  // ─── 8. ARROWHEAD TRIGGER (Deer Creek) ───────────────────────────
  if (config.arrowhead_trigger) {
    const sensor = getSensorData(mesoData, config.arrowhead_trigger.sensor);
    if (sensor) {
      const isCorrectHeading = isInHeadingRange(sensor.dir, config.arrowhead_trigger.heading);
      const [minSpd, maxSpd] = config.arrowhead_trigger.speed_range;
      const isInRange = sensor.speed >= minSpd && sensor.speed <= maxSpd;

      if (isCorrectHeading && isInRange) {
        finalMultiplier *= config.arrowhead_trigger.multiplier;
        activeTriggers.push({
          id: 'arrowhead-trigger',
          label: 'Arrowhead Trigger',
          detail: `SND ${sensor.speed.toFixed(0)} mph SSW — thermal at dam in ~60 min`,
          impact: `+${Math.round((config.arrowhead_trigger.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 9. PROVO CANYON VENTURI (Deer Creek) ────────────────────────
  if (config.thermal_engine?.generator === 'PROVO_CANYON_VENTURI') {
    const upstream = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    const target = getSensorData(mesoData, config.thermal_engine.target_diff);

    if (upstream?.temp != null && target?.temp != null) {
      const delta = upstream.temp - target.temp;
      if (delta >= config.thermal_engine.min_temp_delta) {
        finalMultiplier *= config.thermal_engine.multiplier;
        activeTriggers.push({
          id: 'venturi',
          label: 'Canyon Venturi Active',
          detail: `Provo ${upstream.temp.toFixed(0)}°F vs Heber ${target.temp.toFixed(0)}°F (Δ${delta.toFixed(0)}°F)`,
          impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── 10. STABILITY CAPS (turbulence/downwash penalties) ──────────
  if (config.stability_cap) {
    const sensor = getSensorData(mesoData, config.stability_cap.sensor);
    if (sensor && sensor.speed > config.stability_cap.speed_threshold) {
      finalMultiplier *= config.stability_cap.multiplier;
      activeTriggers.push({
        id: 'stability-cap',
        label: 'Turbulence Cap',
        detail: `${config.stability_cap.sensor} ${sensor.speed.toFixed(0)} mph — high altitude disruption`,
        impact: `${Math.round((config.stability_cap.multiplier - 1) * 100)}%`,
        type: 'penalty',
      });
    }
  }

  // ─── 11. SOUTH FLOW (Willard Bay) ─────────────────────────────────
  if (config.thermal_engine?.indicator_type === 'SOUTH_FLOW_PUSH' || config.thermal_engine?.indicator_type === 'HILL_AFB_PUSH') {
    const gate = getSensorData(mesoData, config.thermal_engine.upstream_gate);
    if (gate) {
      const isCorrectHeading = isInHeadingRange(gate.dir, config.thermal_engine.heading);
      const isStrong = gate.speed >= (config.thermal_engine.min_speed || 0);

      if (isCorrectHeading && isStrong) {
        finalMultiplier *= config.thermal_engine.multiplier;
        activeTriggers.push({
          id: 'south-flow',
          label: 'South Flow Active',
          detail: `Hill AFB ${gate.speed.toFixed(0)} mph S — south flow confirmed`,
          impact: `+${Math.round((config.thermal_engine.multiplier - 1) * 100)}%`,
          type: 'boost',
        });
      }
    }
  }

  // ─── Compute refined speed ───────────────────────────────────────
  const baseSpeed = baseForecast.speed
    ?? baseForecast.expectedSpeed
    ?? baseForecast.windSpeed
    ?? 0;

  const refinedSpeed = parseFloat((baseSpeed * finalMultiplier).toFixed(1));

  const triggerCount = activeTriggers.filter(t => t.type === 'boost' || t.type === 'confirmation').length;
  const spatialConfidence = triggerCount >= 2 ? 'high'
    : triggerCount === 1 ? 'elevated'
    : 'standard';

  return {
    ...baseForecast,
    refinedSpeed,
    baseSpeed,
    multiplier: parseFloat(finalMultiplier.toFixed(3)),
    activeTriggers,
    spatialConfidence,
    triggerCount,
    locationName: config.name,
  };
}

/**
 * Quick check: is any boost active for a lake?
 */
export function hasActiveTriggers(lakeId, mesoData, pws = null) {
  const result = calculateCorrelatedWind(lakeId, { speed: 10 }, mesoData, pws);
  return result.activeTriggers.length > 0;
}

/**
 * Get the paragliding switch logic config
 */
export function getParaglidingSwitchConfig() {
  return relations.RELATIONS.POINT_OF_THE_MOUNTAIN?.switch_logic || null;
}
