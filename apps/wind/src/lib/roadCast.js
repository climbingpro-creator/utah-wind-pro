/**
 * Road calls for the Bear River side of the Wellsvilles.
 * Valley lanes and Sardine Summit are different segments.
 * Cache Valley is listed and not used.
 * Snow inches come from the forecast grid. The fluid path is wind.
 * A blank grid or a blank meter stays Data Unavailable.
 */

export function roadSegment(meter) {
  const label = `${meter?.name || ''} ${meter?.id || ''}`;
  if (/sardine|mantua/i.test(label)) return 'pass';
  if (meter?.airshed === 'Cache Valley') return 'cache';
  return 'valley';
}

export function pickSegmentArchive(meters, segment) {
  return (meters || []).find(m => roadSegment(m) === segment && m.source === 'nws') || null;
}

export function pickSegmentMeter(meters, segment) {
  const rows = (meters || []).filter(m =>
    roadSegment(m) === segment && !m.stale && (m.tempF != null || m.speed != null)
  );
  return rows.find(m => m.source === 'udot') || rows[0] || null;
}

function inches(n) {
  return n == null ? 'Data Unavailable' : `${n.toFixed(2)} inches`;
}

/**
 * Plow only the segment whose own next 6 hours show snow and cold air.
 * Does not close a road. Does not borrow the other segment's grid.
 */
export function plowCall({ place, snowIn6, rainIn6, tempMin6, meterTemp, meterName }) {
  if (snowIn6 == null) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: `No snowfall amount on the ${place} forecast grid. Plows are not dispatched from a blank grid.`,
    };
  }
  const coldGrid = tempMin6 != null && tempMin6 <= 34;
  const coldMeter = meterTemp != null && meterTemp <= 34;
  const coldKnown = tempMin6 != null || meterTemp != null;
  const cold = coldGrid || coldMeter;
  const rain = ` Rain on this grid, next 6 hours: ${inches(rainIn6)}. Forecast grid, not a gauge.`;
  const where = meterName ? ` ${meterName} is the meter on this segment.` : ' No fresh meter on this segment.';

  if (snowIn6 >= 0.1 && cold) {
    const tempBit = meterTemp != null
      ? ` The meter is ${Math.round(meterTemp)}°F.`
      : ` The grid low in those hours is ${Math.round(tempMin6)}°F.`;
    return {
      status: 'closed',
      title: 'Dispatch plows now',
      detail: `${place} forecast grid has ${snowIn6.toFixed(2)} inches of snow in the next 6 hours.${tempBit}${where}${rain} This is not a road closure.`,
    };
  }
  if (snowIn6 >= 0.1 && !coldKnown) {
    return {
      status: 'caution',
      title: 'Snow on the grid, temperature Data Unavailable',
      detail: `${place} shows ${snowIn6.toFixed(2)} inches of snow in the next 6 hours, and neither the grid nor a meter has a temperature. Do not dispatch until the air on this segment is known.${rain}`,
    };
  }
  if (snowIn6 >= 0.05 && !cold) {
    const air = tempMin6 != null ? ` The grid low is ${Math.round(tempMin6)}°F.` : '';
    return {
      status: 'caution',
      title: 'Snow in the grid, air is above freezing',
      detail: `${place} has ${snowIn6.toFixed(2)} inches on the grid and the air is above 34°F.${air} Do not dispatch plows on this segment yet.${rain}`,
    };
  }
  return {
    status: 'open',
    title: 'No plow on this segment',
    detail: `${place} forecast grid has ${snowIn6.toFixed(2)} inches of snow in the next 6 hours.${where}${rain}`,
  };
}

/**
 * Why one segment snows and the other does not.
 * The fluid engine explains the wind. It does not create the snow inches.
 */
export function splitWhy({ valley, pass, fluid }) {
  const v = valley?.snowNext6 ?? null;
  const p = pass?.snowNext6 ?? null;
  if (v == null && p == null) {
    return {
      status: 'unavailable',
      title: 'Data Unavailable',
      detail: 'No snowfall on the valley-lane grid or the Sardine Summit grid.',
    };
  }
  const passSnow = (p || 0) >= 0.05 && (v || 0) < 0.05;
  const valleySnow = (v || 0) >= 0.05 && (p || 0) < 0.05;
  const both = (v || 0) >= 0.05 && (p || 0) >= 0.05;
  let title = 'No snow on the valley lanes or the pass in the next 6 hours';
  if (passSnow) title = 'Snow on the pass, not the valley lanes';
  else if (valleySnow) title = 'Snow on the valley lanes, not the pass';
  else if (both) title = 'Snow on the valley lanes and the pass';

  let wind = 'The meters are not blowing up the Bear River valley, so the fluid path is Data Unavailable. The difference is the forecast grid at Sardine Summit versus the valley floor, not a wind carry.';
  if (fluid?.status === 'ready' && fluid.speed != null) {
    wind = `The fluid path is a south-to-southwest wind of about ${fluid.speed} mph from the airport toward Tremonton. That wind lifts onto the pass. The inches below are the forecast grid. The engine does not make the snow.`;
  }

  return {
    status: passSnow || valleySnow || both ? 'caution' : 'open',
    title,
    detail: `Next 6 hours, forecast grid: valley lanes ${inches(v)}, Sardine Summit ${inches(p)}. ${wind}`,
  };
}

export function segmentWind(meter) {
  if (!meter || meter.stale || meter.speed == null) {
    return 'Wind on this segment is Data Unavailable.';
  }
  const dir = meter.dir == null ? 'direction Data Unavailable' : `${Math.round(meter.dir)}°`;
  return `${meter.name}: ${Math.round(meter.speed)} mph, ${dir}.`;
}

export function segmentHistoryNote(meter, row) {
  if (!meter) return 'No fresh meter on this segment. History is Data Unavailable.';
  if (meter.source !== 'nws') {
    return `${meter.name} is live. Its older hours are not in the National Weather Service archive, so the history is Data Unavailable.`;
  }
  const points = row?.points || [];
  const temps = points.filter(p => p.tempF != null);
  if (temps.length < 4) {
    return `${meter.name} does not have enough stored hours. History is Data Unavailable. Nothing was filled in.`;
  }
  const recent = temps.slice(-3);
  const prior = temps.slice(-6, -3);
  if (prior.length < 2) {
    return `${meter.name} has a short archive. A trend is Data Unavailable.`;
  }
  const avg = list => list.reduce((s, p) => s + p.tempF, 0) / list.length;
  const delta = avg(recent) - avg(prior);
  const way = Math.abs(delta) < 1.5 ? 'holding' : delta < 0 ? 'falling' : 'rising';
  return `${meter.name} temperature is ${way}. The last hours average ${Math.round(avg(recent))}°F. Not filled past what that meter stored.`;
}
