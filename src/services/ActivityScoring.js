/**
 * ACTIVITY-SPECIFIC QUALITY SCORING
 * 
 * Each activity has a different definition of a "quality session."
 * The learning system uses these to verify predictions correctly —
 * what makes a great kiting day is very different from a great fishing day.
 * 
 * Scoring philosophy:
 *   KITING:      Consistent 10-20 mph, low gust factor, onshore/side-on
 *   SAILING:     Consistent 10-20 mph, low gust factor, any direction workable
 *   PARAGLIDING: 5-15 mph, laminar flow, specific directions per site
 *   FISHING:     Light wind (<10 mph), stable barometric pressure, good moon phase
 *   BOATING:     Glass calm (<5 mph), no gusts, calm water
 */

// ─── KITING QUALITY ──────────────────────────────────────────────

export function scoreKitingSession(wind, conditions = {}) {
  const { speed = 0, gust, direction } = wind;
  if (speed < 5) return { score: 0, label: 'no-wind', quality: false };

  let score = 0;

  // Speed sweet spot (0-40)
  if (speed >= 12 && speed <= 18) score += 40;
  else if (speed >= 10 && speed < 12) score += 32;
  else if (speed > 18 && speed <= 22) score += 30;
  else if (speed >= 8 && speed < 10) score += 20;
  else if (speed > 22 && speed <= 28) score += 15;
  else if (speed > 28) score += 5;
  else score += 10;

  // Gust factor (0-30) — lower = smoother = better
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  if (gustFactor <= 1.2) score += 30;
  else if (gustFactor <= 1.3) score += 25;
  else if (gustFactor <= 1.4) score += 20;
  else if (gustFactor <= 1.6) score += 12;
  else if (gustFactor <= 2.0) score += 5;

  // Kiteability (0-20)
  if (speed >= 15 && gustFactor <= 1.4) score += 20;
  else if (speed >= 10 && gustFactor <= 1.4) score += 15;
  else if (speed >= 15) score += 10;
  else if (speed >= 10) score += 8;

  // Direction (0-10)
  if (direction != null) {
    if (direction >= 100 && direction <= 170) score += 10;
    else if (direction >= 315 || direction <= 45) score += 8;
    else if (direction >= 170 && direction <= 210) score += 6;
    else score += 2;
  }

  const quality = score >= 55 && gustFactor <= 1.4 && speed >= 10;
  const label = score >= 85 ? 'epic' : score >= 70 ? 'great' : score >= 55 ? 'good'
    : score >= 40 ? 'fair' : score >= 25 ? 'marginal' : 'poor';

  return { score, label, quality, gustFactor, isKiteable: speed >= 10, isTwinTip: speed >= 15 };
}

// ─── SAILING QUALITY ─────────────────────────────────────────────

export function scoreSailingSession(wind, conditions = {}) {
  const { speed = 0, gust, direction } = wind;
  if (speed < 5) return { score: 0, label: 'no-wind', quality: false };

  let score = 0;

  // Sailing sweet spot: 10-18 mph is ideal for most boats
  if (speed >= 10 && speed <= 18) score += 40;
  else if (speed >= 8 && speed < 10) score += 30;
  else if (speed > 18 && speed <= 25) score += 25;
  else if (speed > 25) score += 10;
  else score += 15;

  // Consistency is critical for sailing too — gust factor
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  if (gustFactor <= 1.25) score += 30;
  else if (gustFactor <= 1.4) score += 22;
  else if (gustFactor <= 1.6) score += 12;
  else score += 5;

  // Steady direction (sailing needs predictable shifts)
  if (direction != null) {
    score += 10; // Any defined direction beats variable
  }

  // Hydrofoil sailing bonus (consistent 10+ with low gusts)
  if (speed >= 10 && speed <= 16 && gustFactor <= 1.3) score += 20;
  else if (speed >= 10 && gustFactor <= 1.4) score += 10;

  const quality = score >= 55 && speed >= 10 && gustFactor <= 1.5;
  const label = score >= 85 ? 'epic' : score >= 70 ? 'great' : score >= 55 ? 'good'
    : score >= 40 ? 'fair' : 'poor';

  return { score, label, quality, gustFactor };
}

// ─── PARAGLIDING QUALITY ─────────────────────────────────────────

export function scoreParaglidingSession(wind, site = 'south', conditions = {}) {
  const { speed = 0, gust, direction } = wind;

  let score = 0;

  // Paragliding sweet spot: 5-15 mph (very different from kiting!)
  if (speed >= 8 && speed <= 14) score += 40;
  else if (speed >= 5 && speed < 8) score += 30;
  else if (speed > 14 && speed <= 18) score += 20;
  else if (speed > 18) score += 0; // Too strong — dangerous
  else if (speed >= 3) score += 15;
  else score += 5;

  // Laminar flow is essential — gusts are dangerous for PG
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  if (gustFactor <= 1.15) score += 30;
  else if (gustFactor <= 1.25) score += 25;
  else if (gustFactor <= 1.35) score += 15;
  else if (gustFactor <= 1.5) score += 5;
  // >1.5 gust factor = dangerous for paragliding

  // Direction is critical — wrong direction = can't launch
  if (direction != null) {
    if (site === 'south') {
      // South side: needs S wind (150-210°)
      if (direction >= 150 && direction <= 210) score += 20;
      else if (direction >= 130 && direction <= 230) score += 10;
      else score += 0; // Wrong direction — no launch
    } else {
      // North side: needs N wind (315-45°)
      if (direction >= 315 || direction <= 45) score += 20;
      else if (direction >= 290 || direction <= 70) score += 10;
      else score += 0;
    }
  }

  // Thermal activity bonus for soaring (afternoon, warm)
  if (conditions.temperature != null && conditions.temperature >= 65 && speed >= 5 && speed <= 12) {
    score += 10;
  }

  const quality = score >= 55 && gustFactor <= 1.35 && speed >= 5 && speed <= 18;
  const label = score >= 85 ? 'epic' : score >= 70 ? 'great' : score >= 55 ? 'good'
    : score >= 40 ? 'fair' : score >= 25 ? 'marginal' : 'grounded';

  return { score, label, quality, gustFactor, isFlyable: speed >= 3 && speed <= 20 && gustFactor <= 1.5 };
}

// ─── FISHING QUALITY ─────────────────────────────────────────────

export function scoreFishingSession(wind, conditions = {}) {
  const { speed = 0, gust, direction } = wind;
  const { pressure, pressureChange, moonPhase, waterTemp } = conditions;

  let score = 0;

  // Fishing wants LIGHT wind (opposite of kiting!)
  if (speed <= 5) score += 30;
  else if (speed <= 8) score += 25;
  else if (speed <= 12) score += 15;
  else if (speed <= 18) score += 5;
  else score += 0; // Strong wind = bad fishing

  // Stable pressure is ideal for fishing
  if (pressureChange != null) {
    const absDelta = Math.abs(pressureChange);
    if (absDelta <= 0.01) score += 20; // Very stable
    else if (absDelta <= 0.03) score += 15;
    else if (absDelta <= 0.05) score += 10;
    // Falling pressure can be good (fish feed before storms)
    if (pressureChange < -0.03) score += 5;
  } else {
    score += 10; // Unknown = neutral
  }

  // Barometric pressure sweet spot
  if (pressure != null) {
    if (pressure >= 29.8 && pressure <= 30.2) score += 10;
    else if (pressure >= 29.5) score += 5;
  }

  // Moon phase bonus
  if (moonPhase != null) {
    // New moon and full moon = best fishing (solunar theory)
    if (moonPhase <= 0.1 || moonPhase >= 0.9 || (moonPhase >= 0.45 && moonPhase <= 0.55)) {
      score += 15;
    } else {
      score += 5;
    }
  }

  // Water temperature affects fish activity
  if (waterTemp != null) {
    if (waterTemp >= 55 && waterTemp <= 75) score += 15; // Active feeding range
    else if (waterTemp >= 45 && waterTemp <= 80) score += 10;
    else score += 5;
  }

  // Overcast/low light = bonus for fishing
  if (speed <= 8 && (direction == null || speed <= 3)) score += 10;

  const quality = score >= 55 && speed <= 12;
  const label = score >= 80 ? 'epic' : score >= 65 ? 'great' : score >= 50 ? 'good'
    : score >= 35 ? 'fair' : 'poor';

  return { score, label, quality };
}

// ─── BOATING / GLASS DAYS ────────────────────────────────────────

export function scoreBoatingSession(wind) {
  const { speed = 0, gust } = wind;

  let score = 0;

  // Glass calm is the goal
  if (speed <= 2) score += 40;
  else if (speed <= 5) score += 30;
  else if (speed <= 8) score += 15;
  else if (speed <= 12) score += 5;
  else score += 0;

  // No gusts
  const gustFactor = (gust != null && speed > 0) ? gust / speed : 1.0;
  if (gustFactor <= 1.1 || speed <= 2) score += 30;
  else if (gustFactor <= 1.2) score += 20;
  else if (gustFactor <= 1.4) score += 10;

  // Bonus for truly calm conditions
  if (speed <= 3 && (gust == null || gust <= 5)) score += 30;

  const quality = score >= 60 && speed <= 8;
  const label = score >= 85 ? 'glass' : score >= 65 ? 'smooth' : score >= 40 ? 'light-chop' : 'choppy';

  return { score, label, quality };
}

// ─── DISPATCHER ──────────────────────────────────────────────────

/**
 * Score a session for any activity.
 * This is what the learning system calls to verify predictions.
 */
export function scoreSessionForActivity(activity, wind, conditions = {}) {
  switch (activity) {
    case 'kiting':
    case 'windsurfing':
      return scoreKitingSession(wind, conditions);
    case 'sailing':
      return scoreSailingSession(wind, conditions);
    case 'paragliding':
      return scoreParaglidingSession(wind, conditions.site || 'south', conditions);
    case 'fishing':
      return scoreFishingSession(wind, conditions);
    case 'boating':
    case 'paddling':
      return scoreBoatingSession(wind);
    default:
      return scoreKitingSession(wind, conditions);
  }
}

/**
 * Get the "ideal conditions" description for each activity.
 * Used in UI tooltips and learning dashboard.
 */
export function getIdealConditions(activity) {
  const ideals = {
    kiting: {
      speedRange: '12-18 mph',
      gustFactor: '< 1.3',
      direction: 'SE thermal or N flow',
      key: 'Consistency over speed. Smooth 14 mph > gusty 25 mph.',
    },
    sailing: {
      speedRange: '10-18 mph',
      gustFactor: '< 1.4',
      direction: 'Any steady direction',
      key: 'Steady breeze for racing. Hydrofoil sweet spot: 10-16 mph.',
    },
    paragliding: {
      speedRange: '5-15 mph',
      gustFactor: '< 1.25',
      direction: 'S (150-210°) for south, N (315-45°) for north',
      key: 'Laminar flow is everything. Gusts are dangerous.',
    },
    fishing: {
      speedRange: '0-8 mph',
      gustFactor: 'N/A',
      direction: 'Light or calm',
      key: 'Stable pressure, good moon phase, right water temp.',
    },
    boating: {
      speedRange: '0-5 mph',
      gustFactor: '< 1.1',
      direction: 'Calm',
      key: 'Glass water. Zero gusts.',
    },
  };
  return ideals[activity] || ideals.kiting;
}
