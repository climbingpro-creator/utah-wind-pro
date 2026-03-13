/**
 * PROPAGATION ALERT SERVICE
 * 
 * "Wind is coming" — no other app does this.
 * 
 * Monitors upstream stations and generates alerts when wind events
 * are detected that will propagate to downstream locations.
 * 
 * Example:
 *   KSLC picks up 15 mph NW → this service calculates:
 *     "North flow detected at SLC Airport"
 *     "ETA to Zig Zag: ~45 minutes (arriving ~4:30 PM)"
 *     "Expected speed: 8-10 mph (55% translation)"
 * 
 * This is the killer feature for retention — users get notified
 * BEFORE the wind arrives, not after.
 */

import { STATION_NODES, PROPAGATION_EDGES, LOCATION_STATIONS } from './WindFieldEngine';

function isInHeadingRange(dir, range) {
  if (dir == null || !range) return false;
  const [min, max] = range;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function getCardinal(deg) {
  if (deg == null) return '?';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatETA(minutesFromNow) {
  const arrival = new Date(Date.now() + minutesFromNow * 60000);
  const h = arrival.getHours();
  const m = arrival.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Scan all upstream stations for a location and generate propagation alerts.
 * 
 * @param {string} locationId - e.g. 'utah-lake-zigzag'
 * @param {object} stationReadings - { KSLC: { speed, direction }, KPVU: {...}, ... }
 * @param {object} currentWind - { speed, direction } at the location itself
 * @param {number} translationFactor - from WindFieldEngine (0-1)
 * @returns {Array} propagation alerts, sorted by urgency
 */
export function scanForPropagation(locationId, stationReadings = {}, currentWind = {}, translationFactor = 0.55) {
  const locConfig = LOCATION_STATIONS[locationId];
  if (!locConfig) return [];

  const alerts = [];
  const lakeSpeed = currentWind?.speed || 0;
  const now = Date.now();

  // Find all edges where upstream has active wind heading toward this location
  const relevantEdges = PROPAGATION_EDGES.filter(edge => {
    const upstream = new Set([...(locConfig.upstreamNorth || []), ...(locConfig.upstreamThermal || [])]);
    return upstream.has(edge.from);
  });

  for (const edge of relevantEdges) {
    const reading = stationReadings[edge.from];
    if (!reading || reading.speed == null || reading.speed < 5) continue;

    const dirMatch = isInHeadingRange(reading.direction, edge.headingRange);
    if (!dirMatch) continue;

    // Wind is active upstream and heading the right direction
    const expectedArrival = reading.speed * edge.attenuation * edge.channeling * translationFactor;
    const willBeSignificant = expectedArrival >= 5;

    if (!willBeSignificant) continue;

    // Has it already arrived?
    const alreadyArrived = lakeSpeed >= expectedArrival * 0.7;
    if (alreadyArrived) continue;

    const stationInfo = STATION_NODES[edge.from];
    const dirLabel = getCardinal(reading.direction);
    const eta = formatETA(edge.delay);

    // Determine alert type
    const isNorth = reading.direction >= 270 || reading.direction <= 60;
    const isThermal = reading.direction >= 130 && reading.direction <= 220;

    let type, icon;
    if (isNorth) { type = 'north_flow'; icon = '🌬️'; }
    else if (isThermal) { type = 'thermal_push'; icon = '🌡️'; }
    else { type = 'wind_event'; icon = '💨'; }

    alerts.push({
      id: `prop-${edge.from}-${edge.to}`,
      type,
      icon,
      urgency: edge.delay <= 20 ? 'imminent' : edge.delay <= 45 ? 'incoming' : 'developing',
      station: edge.from,
      stationName: stationInfo?.name || edge.from,
      upstreamSpeed: reading.speed,
      upstreamDirection: reading.direction,
      dirLabel,
      expectedSpeed: +expectedArrival.toFixed(0),
      etaMinutes: edge.delay,
      etaTime: eta,
      terrain: edge.description,
      headline: `${dirLabel} wind detected at ${stationInfo?.name || edge.from}`,
      detail: `${reading.speed.toFixed(0)} mph ${dirLabel} → expect ${expectedArrival.toFixed(0)} mph at your location by ~${eta}`,
      shortMessage: `Wind incoming: ${expectedArrival.toFixed(0)} mph by ${eta}`,
      timestamp: now,
    });
  }

  return alerts.sort((a, b) => a.etaMinutes - b.etaMinutes);
}

/**
 * Generate a concise notification message for push alerts
 */
export function getNotificationMessage(alerts, locationName = 'the lake') {
  if (alerts.length === 0) return null;

  const most = alerts[0];
  if (most.urgency === 'imminent') {
    return {
      title: `Wind arriving at ${locationName}!`,
      body: most.detail,
      urgency: 'high',
    };
  }
  if (most.urgency === 'incoming') {
    return {
      title: `Wind detected upstream`,
      body: most.detail,
      urgency: 'medium',
    };
  }
  return {
    title: `Wind developing`,
    body: most.detail,
    urgency: 'low',
  };
}
