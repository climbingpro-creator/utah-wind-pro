/**
 * MORNING BRIEFING SERVICE
 *
 * Generates natural-language forecast summaries that feel like
 * a personal weather advisor. No other app does this.
 *
 * Uses all our intelligence layers to produce text like:
 * "Great thermal day ahead — 78% probability of consistent 12-16 mph
 *  at Zig Zag starting around 1 PM. Low gust factor expected.
 *  Glass water before 10 AM for boaters. North flow unlikely tonight."
 */

const WIND_ACTIVITIES = new Set(['kiting', 'sailing', 'windsurfing']);
const CALM_ACTIVITIES = new Set(['boating', 'paddling']);

const DIRECTION_LABELS = {
  N: 'North', NNE: 'North-Northeast', NE: 'Northeast', ENE: 'East-Northeast',
  E: 'East', ESE: 'East-Southeast', SE: 'Southeast', SSE: 'South-Southeast',
  S: 'South', SSW: 'South-Southwest', SW: 'Southwest', WSW: 'West-Southwest',
  W: 'West', WNW: 'West-Northwest', NW: 'Northwest', NNW: 'North-Northwest',
};

// Activity-specific thresholds for excitement scoring
const EXCITEMENT_THRESHOLDS = {
  kiting:      { ideal: [15, 25], rideable: [12, 30] },
  sailing:     { ideal: [10, 20], rideable: [6, 25] },
  windsurfing: { ideal: [15, 25], rideable: [12, 30] },
  boating:     { ideal: [0, 5],   rideable: [0, 10] },
  paddling:    { ideal: [0, 4],   rideable: [0, 8] },
  fishing:     { ideal: [0, 10],  rideable: [0, 15] },
  paragliding: { ideal: [5, 15],  rideable: [3, 18] },
};

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function formatHour(hour) {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function dirLabel(dir) {
  if (!dir) return '';
  const upper = String(dir).toUpperCase().trim();
  return DIRECTION_LABELS[upper] || upper;
}

function gustFactor(speed, gust) {
  if (!speed || speed === 0) return 0;
  return ((gust || speed) - speed) / speed;
}

function gustDescription(factor) {
  if (factor < 0.15) return 'very low gust factor';
  if (factor < 0.3) return 'low gust factor';
  if (factor < 0.5) return 'moderate gusts';
  return 'high gust factor — expect lulls and surges';
}

function computeExcitement(activity, params) {
  const { currentWind, thermalPrediction, smartForecast, activeTriggers } = params;
  const thresholds = EXCITEMENT_THRESHOLDS[activity] || EXCITEMENT_THRESHOLDS.kiting;
  let score = 1;

  const speed = currentWind?.speed || 0;
  const prob = thermalPrediction?.probability || 0;

  if (WIND_ACTIVITIES.has(activity)) {
    if (speed >= thresholds.ideal[0] && speed <= thresholds.ideal[1]) score += 2;
    else if (speed >= thresholds.rideable[0] && speed <= thresholds.rideable[1]) score += 1;
    if (prob >= 0.7) score += 1;
    if (activeTriggers?.length >= 2) score += 1;
  } else if (CALM_ACTIVITIES.has(activity)) {
    if (speed <= thresholds.ideal[1]) score += 2;
    else if (speed <= thresholds.rideable[1]) score += 1;
    if (smartForecast?.windows?.some(w => w.type === 'glass')) score += 1;
  } else if (activity === 'fishing') {
    if (speed <= thresholds.ideal[1]) score += 1;
    if (params.fishingPrediction?.goldenHour) score += 1;
    if (params.fishingPrediction?.pressureTrend === 'rising') score += 1;
    if (prob < 0.3) score += 1;
  } else if (activity === 'paragliding') {
    if (speed >= thresholds.ideal[0] && speed <= thresholds.ideal[1]) score += 2;
    if (thermalPrediction?.windType === 'laminar') score += 1;
    if (prob >= 0.5) score += 1;
  }

  return Math.min(5, Math.max(1, score));
}

function buildUpstreamSnippet(upstream) {
  if (!upstream) return '';
  const parts = [];
  if (upstream.kslcSpeed != null) {
    parts.push(`KSLC pushing ${upstream.kslcSpeed} mph ${upstream.kslcDirection || ''}`);
  }
  if (upstream.kpvuSpeed != null) {
    parts.push(`KPVU at ${upstream.kpvuSpeed} mph ${upstream.kpvuDirection || ''}`);
  }
  return parts.join(', ');
}

function buildThermalSnippet(thermal) {
  if (!thermal || thermal.probability == null) return '';
  const pct = Math.round(thermal.probability * 100);
  const start = thermal.startHour ? formatHour(thermal.startHour) : null;
  const peak = thermal.peakHour ? formatHour(thermal.peakHour) : null;
  const end = thermal.endHour ? formatHour(thermal.endHour) : null;
  let s = `${pct}% thermal probability`;
  if (start) s += `, onset ~${start}`;
  if (peak) s += `, peaking ${peak}`;
  if (end) s += `, dying by ${end}`;
  return s;
}

function buildSwingWarning(swingAlerts) {
  if (!swingAlerts?.length) return null;
  const first = swingAlerts[0];
  const dir = first.toDirection ? dirLabel(first.toDirection) : 'new direction';
  const time = first.expectedHour ? formatHour(first.expectedHour) : 'later';
  return `Wind shift to ${dir} expected around ${time} — ${first.severity || 'moderate'} swing`;
}

// ─── Activity-specific briefing generators ───────────────────────────

function briefWind(activity, params) {
  const { currentWind, thermalPrediction, smartForecast, upstream, activeTriggers, swingAlerts } = params;
  const speed = currentWind?.speed || 0;
  const gust = currentWind?.gust || speed;
  const dir = currentWind?.direction;
  const gf = gustFactor(speed, gust);
  const thermal = thermalPrediction || {};
  const prob = thermal.probability || 0;
  const excitement = computeExcitement(activity, params);

  let headline = '';
  if (excitement >= 4) {
    headline = prob >= 0.7
      ? `Epic ${activity} day shaping up — thermals look dialed`
      : `Strong wind day ahead for ${activity}`;
  } else if (excitement === 3) {
    headline = `Decent ${activity} window today — worth watching`;
  } else if (excitement === 2) {
    headline = `Marginal ${activity} conditions — could improve`;
  } else {
    headline = `Light day — not much for ${activity} right now`;
  }

  const bodyParts = [];
  if (speed > 0) {
    bodyParts.push(`Currently ${speed} mph${gust > speed ? ` gusting ${gust}` : ''} from the ${dirLabel(dir) || 'variable directions'}. ${gustDescription(gf)}.`);
  } else {
    bodyParts.push('Calm right now.');
  }

  const thermalSnip = buildThermalSnippet(thermal);
  if (thermalSnip) bodyParts.push(thermalSnip + '.');

  // Sustained north flow awareness
  const nf = thermal.northFlow;
  if (nf?.persistenceHours >= 6) {
    bodyParts.push(`All-day north flow event (${nf.persistenceHours}h+) — sustained and reliable. High confidence it continues.`);
  } else if (nf?.persistenceHours >= 3) {
    bodyParts.push(`North flow building (${nf.persistenceHours}h) — likely to persist through the window.`);
  } else if (nf?.status === 'strong') {
    bodyParts.push(`Strong north signal from KSLC — expect ${nf.expectedZigZagSpeed?.toFixed(0) || '15'}+ mph at the lake in ~1 hour.`);
  }

  const upstreamSnip = buildUpstreamSnippet(upstream);
  if (upstreamSnip) bodyParts.push(`Upstream: ${upstreamSnip}.`);

  if (smartForecast?.translation) bodyParts.push(smartForecast.translation);

  const bullets = [];

  if (nf?.persistenceHours >= 3) {
    bullets.push({ icon: '🔁', text: `Sustained north flow: ${nf.persistenceHours}h and counting` });
  }

  if (thermal.startHour && prob >= 0.5) {
    const windowStart = formatHour(thermal.startHour);
    const windowEnd = thermal.endHour ? formatHour(thermal.endHour) : '???';
    bullets.push({ icon: '🕐', text: `Wind window: ${windowStart}–${windowEnd}` });
  }

  if (speed > 0) {
    bullets.push({ icon: '💨', text: `${speed}–${gust} mph ${dirLabel(dir) || ''} — ${gustDescription(gf)}` });
  }

  if (upstreamSnip) {
    bullets.push({ icon: '📡', text: upstreamSnip });
  }

  const swingWarn = buildSwingWarning(swingAlerts);
  if (swingWarn) {
    bullets.push({ icon: '🔄', text: swingWarn });
  }

  if (activeTriggers?.length) {
    const names = activeTriggers.slice(0, 2).map(t => t.name || t.label || 'trigger').join(', ');
    bullets.push({ icon: '🎯', text: `Active triggers: ${names}` });
  }

  if (bullets.length < 3 && smartForecast?.events?.length) {
    const evt = smartForecast.events[0];
    bullets.push({ icon: '📋', text: evt.summary || evt.label || 'Event incoming' });
  }

  let bestAction = '';
  if (excitement >= 3 && thermal.startHour) {
    // Arrive 30 min before predicted onset for rigging
    const arriveHour = Math.max(0, thermal.startHour - 1);
    bestAction = `Be rigged and ready by ${formatHour(arriveHour)} — wind onset expected ${formatHour(thermal.startHour)}`;
  } else if (excitement >= 3) {
    bestAction = `Get out there — ${speed} mph and ${gustDescription(gf)}`;
  } else if (prob >= 0.5) {
    bestAction = `Watch upstream stations after ${formatHour(thermal.startHour || 12)} for confirmation`;
  } else {
    bestAction = `Check back midday — conditions may develop`;
  }

  return {
    headline,
    body: bodyParts.join(' '),
    bullets: bullets.slice(0, 5),
    excitement,
    timeOfDay: getTimeOfDay(),
    bestAction,
  };
}

function briefCalm(activity, params) {
  const { currentWind, smartForecast, upstream, thermalPrediction, boatingPrediction, swingAlerts } = params;
  const speed = currentWind?.speed || 0;
  const gust = currentWind?.gust || speed;
  const excitement = computeExcitement(activity, params);
  const glassInfo = boatingPrediction || {};

  let headline = '';
  if (speed <= 3 && excitement >= 3) {
    headline = `Glass water right now — perfect ${activity} morning`;
  } else if (excitement >= 3) {
    headline = `Good ${activity} windows today`;
  } else if (speed >= 10) {
    headline = `Windy start — wait for an afternoon lull`;
  } else {
    headline = `Mixed conditions for ${activity} today`;
  }

  const bodyParts = [];
  if (speed <= 5) {
    bodyParts.push(`Lake is ${speed <= 2 ? 'glass' : 'nearly glass'} at ${speed} mph.`);
  } else {
    bodyParts.push(`Currently ${speed} mph${gust > speed ? ` gusting ${gust}` : ''} — choppy for ${activity}.`);
  }

  if (glassInfo.glassUntil) {
    bodyParts.push(`Glass window expected until ~${formatHour(glassInfo.glassUntil)}.`);
  }

  const thermalSnip = buildThermalSnippet(thermalPrediction);
  if (thermalSnip) bodyParts.push(`Wind forecast: ${thermalSnip}.`);

  const upstreamSnip = buildUpstreamSnippet(upstream);
  if (upstreamSnip) bodyParts.push(`Upstream: ${upstreamSnip} — watch for incoming chop.`);

  const bullets = [];

  if (glassInfo.glassUntil) {
    bullets.push({ icon: '🪞', text: `Glass until ~${formatHour(glassInfo.glassUntil)}` });
  }

  if (thermalPrediction?.startHour) {
    bullets.push({ icon: '⚠️', text: `Wind arrives ~${formatHour(thermalPrediction.startHour)} — plan accordingly` });
  }

  if (speed > 0) {
    bullets.push({ icon: '💨', text: `Current: ${speed} mph ${dirLabel(currentWind?.direction) || ''}` });
  }

  if (upstreamSnip) {
    bullets.push({ icon: '📡', text: upstreamSnip });
  }

  const swingWarn = buildSwingWarning(swingAlerts);
  if (swingWarn) {
    bullets.push({ icon: '🔄', text: swingWarn });
  }

  let bestAction = '';
  if (speed <= 3) {
    const deadline = glassInfo.glassUntil ? formatHour(glassInfo.glassUntil) : '10 AM';
    bestAction = `Launch early — glass conditions won't last past ${deadline}`;
  } else if (thermalPrediction?.endHour) {
    bestAction = `Wait for wind to die after ${formatHour(thermalPrediction.endHour)} for calmer water`;
  } else {
    bestAction = `Morning is your best bet — wind typically builds by afternoon`;
  }

  return {
    headline,
    body: bodyParts.join(' '),
    bullets: bullets.slice(0, 5),
    excitement,
    timeOfDay: getTimeOfDay(),
    bestAction,
  };
}

function briefFishing(params) {
  const { currentWind, thermalPrediction, upstream, fishingPrediction, swingAlerts } = params;
  const speed = currentWind?.speed || 0;
  const excitement = computeExcitement('fishing', params);
  const fish = fishingPrediction || {};

  let headline = '';
  if (excitement >= 4) {
    headline = 'Outstanding fishing day — multiple factors aligning';
  } else if (excitement === 3) {
    headline = 'Solid fishing conditions — fish should be active';
  } else if (excitement === 2) {
    headline = 'Average fishing day — target the best windows';
  } else {
    headline = 'Tough fishing conditions — patience required';
  }

  const bodyParts = [];

  if (fish.pressureTrend) {
    const trendWord = fish.pressureTrend === 'rising' ? 'rising (fish feed aggressively)' :
      fish.pressureTrend === 'falling' ? 'falling (fish may go deep)' : 'steady';
    bodyParts.push(`Barometric pressure ${trendWord}.`);
  }

  if (fish.moonPhase) {
    bodyParts.push(`Moon: ${fish.moonPhase}.`);
  }

  if (fish.waterTemp != null) {
    bodyParts.push(`Water temp ${fish.waterTemp}°F.`);
  }

  if (speed > 0) {
    bodyParts.push(`Wind ${speed} mph ${dirLabel(currentWind?.direction) || ''} — ${speed <= 8 ? 'nice ripple on the water' : 'choppy, fish sheltered banks'}.`);
  }

  const upstreamSnip = buildUpstreamSnippet(upstream);
  if (upstreamSnip) bodyParts.push(`Upstream: ${upstreamSnip}.`);

  const bullets = [];

  if (fish.goldenHour) {
    bullets.push({ icon: '🌅', text: `Golden hour: ${fish.goldenHour}` });
  }

  if (fish.bestHours?.length) {
    const range = fish.bestHours.map(formatHour).join('–');
    bullets.push({ icon: '🎣', text: `Best bite window: ${range}` });
  }

  if (fish.pressureTrend) {
    bullets.push({ icon: '📊', text: `Pressure: ${fish.pressureTrend}` });
  }

  if (fish.waterTemp != null) {
    bullets.push({ icon: '🌡️', text: `Water: ${fish.waterTemp}°F` });
  }

  if (thermalPrediction?.startHour) {
    bullets.push({ icon: '💨', text: `Wind picks up ~${formatHour(thermalPrediction.startHour)}` });
  }

  const swingWarn = buildSwingWarning(swingAlerts);
  if (swingWarn) {
    bullets.push({ icon: '🔄', text: swingWarn });
  }

  let bestAction = '';
  if (fish.bestHours?.length) {
    bestAction = `Be on the water by ${formatHour(fish.bestHours[0])} for peak bite`;
  } else if (fish.goldenHour) {
    bestAction = `Target the golden hour — ${fish.goldenHour}`;
  } else if (speed <= 5) {
    bestAction = `Calm conditions — topwater early, go deeper once wind builds`;
  } else {
    bestAction = `Fish sheltered banks and points — wind pushing bait`;
  }

  return {
    headline,
    body: bodyParts.join(' '),
    bullets: bullets.slice(0, 5),
    excitement,
    timeOfDay: getTimeOfDay(),
    bestAction,
  };
}

function briefParagliding(params) {
  const { currentWind, thermalPrediction, upstream, smartForecast, activeTriggers, swingAlerts } = params;
  const speed = currentWind?.speed || 0;
  const gust = currentWind?.gust || speed;
  const dir = currentWind?.direction;
  const excitement = computeExcitement('paragliding', params);
  const thermal = thermalPrediction || {};

  // South-facing sites need S/SW flow; north-facing need N/NW
  const dirUpper = String(dir || '').toUpperCase();
  const isSouthFlow = ['S', 'SSW', 'SW', 'SSE'].includes(dirUpper);
  const isNorthFlow = ['N', 'NNW', 'NW', 'NNE'].includes(dirUpper);
  const siteRec = isSouthFlow ? 'south-facing sites' : isNorthFlow ? 'north-facing sites' : 'either site — cross flow';

  let headline = '';
  if (excitement >= 4) {
    headline = `Excellent soaring day — ${siteRec} looking prime`;
  } else if (excitement === 3) {
    headline = `Flyable day — ${siteRec} should work`;
  } else if (excitement === 2) {
    headline = 'Marginal conditions — experienced pilots only';
  } else {
    headline = 'Not recommended — conditions unfavorable';
  }

  const bodyParts = [];
  if (speed > 0) {
    bodyParts.push(`${speed} mph${gust > speed ? ` gusting ${gust}` : ''} from the ${dirLabel(dir) || 'variable'}.`);
  }

  if (thermal.windType) {
    bodyParts.push(`Flow type: ${thermal.windType}${thermal.windType === 'laminar' ? ' — smooth and liftable' : ''}.`);
  }

  const thermalSnip = buildThermalSnippet(thermal);
  if (thermalSnip) bodyParts.push(thermalSnip + '.');

  const upstreamSnip = buildUpstreamSnippet(upstream);
  if (upstreamSnip) bodyParts.push(`Upstream: ${upstreamSnip}.`);

  if (smartForecast?.translation) bodyParts.push(smartForecast.translation);

  const bullets = [];

  bullets.push({ icon: '🪂', text: `Recommended: ${siteRec}` });

  if (speed > 0) {
    bullets.push({ icon: '💨', text: `${speed}–${gust} mph ${dirLabel(dir) || ''} — ${gustDescription(gustFactor(speed, gust))}` });
  }

  if (thermal.windType) {
    bullets.push({ icon: '🌊', text: `Flow: ${thermal.windType}` });
  }

  const swingWarn = buildSwingWarning(swingAlerts);
  if (swingWarn) {
    bullets.push({ icon: '🔄', text: swingWarn });
  }

  if (thermal.startHour && thermal.endHour) {
    bullets.push({ icon: '🕐', text: `Thermal window: ${formatHour(thermal.startHour)}–${formatHour(thermal.endHour)}` });
  }

  if (activeTriggers?.length) {
    const names = activeTriggers.slice(0, 2).map(t => t.name || t.label || 'trigger').join(', ');
    bullets.push({ icon: '🎯', text: `Triggers: ${names}` });
  }

  let bestAction = '';
  if (excitement >= 3 && thermal.startHour) {
    bestAction = `Set up at ${siteRec} by ${formatHour(thermal.startHour)} for best thermals`;
  } else if (excitement >= 3) {
    bestAction = `Flyable now at ${siteRec} — ${speed} mph ${dirLabel(dir) || ''}`;
  } else if (swingWarn) {
    bestAction = 'Hold off — wind shift incoming, reassess after';
  } else {
    bestAction = 'Not recommended today — check tomorrow';
  }

  return {
    headline,
    body: bodyParts.join(' '),
    bullets: bullets.slice(0, 5),
    excitement,
    timeOfDay: getTimeOfDay(),
    bestAction,
  };
}

// ─── Fallback when we have almost no data ────────────────────────────

function briefMinimal(activity, params) {
  const { currentWind } = params;
  const speed = currentWind?.speed || 0;
  const dir = currentWind?.direction;

  const headline = speed > 0
    ? `${speed} mph ${dirLabel(dir) || ''} — limited forecast data available`
    : 'Calm conditions — limited forecast data available';

  return {
    headline,
    body: speed > 0
      ? `Currently seeing ${speed} mph from the ${dirLabel(dir) || 'unknown direction'}. Full forecast data isn't available yet — check back soon for a complete ${activity} briefing.`
      : `No measurable wind right now. Full forecast data isn't available yet — check back soon for a complete ${activity} briefing.`,
    bullets: [
      { icon: '💨', text: speed > 0 ? `${speed} mph ${dirLabel(dir) || ''}` : 'Calm' },
      { icon: '📡', text: 'Waiting on upstream data' },
      { icon: '🔄', text: 'Check back for full briefing' },
    ],
    excitement: 1,
    timeOfDay: getTimeOfDay(),
    bestAction: 'Check back in 30 minutes for updated forecast data',
  };
}

// ─── Main export ─────────────────────────────────────────────────────

/**
 * @param {string} activity - kiting, sailing, boating, fishing, paragliding, windsurfing, paddling
 * @param {object} params
 * @param {object} params.currentWind - { speed, gust, direction }
 * @param {object} params.upstream - { kslcSpeed, kslcDirection, kpvuSpeed, kpvuDirection }
 * @param {object} params.thermalPrediction - { probability, startHour, peakHour, endHour, windType }
 * @param {object} params.smartForecast - output from generateSmartForecast
 * @param {Array}  params.activeTriggers - from CorrelationEngine
 * @param {Array}  params.swingAlerts - from FrontalTrendPredictor
 * @param {object} params.weekOutlook - from PatternLogic.getWeekOutlook()
 * @param {object} params.boatingPrediction - from BoatingPredictor
 * @param {object} params.fishingPrediction - from FishingPredictor
 * @returns {object} { headline, body, bullets, excitement, timeOfDay, bestAction }
 */
export function generateBriefing(activity, params = {}) {
  const act = (activity || '').toLowerCase().trim();
  const hasSubstantiveData = params.thermalPrediction || params.smartForecast || params.upstream;

  if (!hasSubstantiveData && !params.currentWind?.speed) {
    return briefMinimal(act, params);
  }

  if (WIND_ACTIVITIES.has(act)) return briefWind(act, params);
  if (CALM_ACTIVITIES.has(act)) return briefCalm(act, params);
  if (act === 'fishing') return briefFishing(params);
  if (act === 'paragliding') return briefParagliding(params);

  return briefWind(act, params);
}
