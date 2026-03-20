/**
 * UTAH LAKE WIND PRO - Station Configuration
 * 
 * Based on local knowledge and thermal dynamics:
 * 
 * | Feature      | Primary Wind Type        | High-Elevation Trigger | Low-Elevation Indicator |
 * |--------------|--------------------------|------------------------|-------------------------|
 * | Utah Lake    | Prefrontal / North Flow  | SLC Airport (Pressure) | Saratoga Springs PWS    |
 * | Deer Creek   | SW Thermal / Canyon      | Arrowhead (8,252 ft)   | Charleston or Dam Chute |
 * | Willard Bay  | South Flow (S Beach)     | Hill AFB or Ben Lomond | Willard Bay South       |
 * | Pineview     | East/West Canyon         | Ogden Peak             | Pineview Dam            |
 * 
 * PREDICTION MODEL:
 * Step A: Gradient Check - ΔP (SLC - Provo) > 2.0mb = North flow override
 * Step B: Elevation Delta - High station temp vs lakeshore = thermal pump indicator
 * Step C: Ground Truth - PWS verifies exact thermal arrival, correlate with 2hr prior pattern
 */

import { utahLakeConfigs } from './lakes/utahLake';
import { deerCreekConfigs } from './lakes/deerCreek';
import { willardBayConfigs } from './lakes/willardBay';
import { strawberryConfigs } from './lakes/strawberry';
import { northernUtahConfigs } from './lakes/northernUtah';
import { centralUtahConfigs } from './lakes/centralUtah';
import { southernUtahConfigs } from './lakes/southernUtah';
import { wasatchBackConfigs } from './lakes/wasatchBack';
import { saltLakeAreaConfigs } from './lakes/saltLakeArea';
import { otherConfigs } from './lakes/other';

export const LAKE_CONFIGS = {
  ...utahLakeConfigs,
  ...deerCreekConfigs,
  ...willardBayConfigs,
  ...strawberryConfigs,
  ...northernUtahConfigs,
  ...centralUtahConfigs,
  ...southernUtahConfigs,
  ...wasatchBackConfigs,
  ...saltLakeAreaConfigs,
  ...otherConfigs,
};

/**
 * Get all station IDs needed for a lake (for API calls)
 */
export const getAllStationIds = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return [];
  
  const ids = new Set();
  
  ids.add(config.stations.pressure.high.id);
  ids.add(config.stations.pressure.low.id);
  config.stations.ridge.forEach((s) => ids.add(s.id));
  config.stations.lakeshore.forEach((s) => ids.add(s.id));
  config.stations.reference.forEach((s) => ids.add(s.id));
  
  // Add ground truth if it's a MesoWest station
  if (config.stations.groundTruth?.id && config.stations.groundTruth.id !== 'PWS') {
    ids.add(config.stations.groundTruth.id);
  }
  
  // Add early indicator station (Spanish Fork for Utah Lake)
  if (config.stations.earlyIndicator?.id) {
    ids.add(config.stations.earlyIndicator.id);
  }
  
  return Array.from(ids);
};

/**
 * Get the primary ridge station for a lake
 */
export const getPrimaryRidgeStation = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return null;
  return config.stations.ridge.find(s => s.priority === 1) || config.stations.ridge[0];
};

/**
 * Get optimal wind configuration for convergence calculation
 */
export const WIND_DIRECTION_OPTIMAL = Object.fromEntries(
  Object.entries(LAKE_CONFIGS).map(([id, config]) => [
    id, 
    config.thermal.optimalDirection
  ])
);

/**
 * Station metadata for display — re-exported from the central registry.
 * Import from stationRegistry.js for the full API.
 */
import { STATION_REGISTRY, getStation, getStationName } from './stationRegistry';

export const STATION_INFO = Object.fromEntries(
  Object.entries(STATION_REGISTRY).map(([id, s]) => [
    id,
    { fullName: s.name, type: s.type, network: s.network },
  ])
);

export { STATION_REGISTRY, getStation, getStationName };
