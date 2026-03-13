const DEFAULT_HORIZON_HOURS = 6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getHourLabel(date) {
  const hour = date.getHours();
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

function normalizeWindSnapshot(snapshot = {}) {
  return {
    windSpeed: snapshot.windSpeed ?? snapshot.speed ?? null,
    windDirection: snapshot.windDirection ?? snapshot.direction ?? null,
    windGust: snapshot.windGust ?? snapshot.gust ?? null,
  };
}

function normalizeHistoryEntry(entry) {
  if (!entry) return null;

  const timestamp = toDate(entry.timestamp);
  return {
    timestamp,
    windSpeed: entry.windSpeed ?? entry.speed ?? null,
    windDirection: entry.windDirection ?? entry.direction ?? null,
    windGust: entry.windGust ?? entry.gust ?? null,
  };
}

function shortestDirectionDelta(from, to) {
  if (from == null || to == null) return 0;
  return ((to - from + 540) % 360) - 180;
}

function blendDirection(from, to, weight) {
  if (from == null) return to;
  if (to == null) return from;
  return (from + shortestDirectionDelta(from, to) * weight + 360) % 360;
}

function parseExpectedDirection(thermalPrediction) {
  const range = thermalPrediction?.direction?.expectedRange;
  if (!range) return null;

  const match = String(range).match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;

  const min = Number(match[1]);
  const max = Number(match[2]);
  return round((min + max) / 2, 1);
}

function calculateTrend(historyEntries = []) {
  const normalized = historyEntries
    .map(normalizeHistoryEntry)
    .filter(entry => entry?.timestamp && entry.windSpeed != null)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-6);

  if (normalized.length < 2) {
    return {
      speedPerHour: 0,
      directionPerHour: 0,
      gustFactor: 1.15,
      confidence: normalized.length === 1 ? 0.45 : 0.25,
    };
  }

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const elapsedHours = Math.max((last.timestamp - first.timestamp) / 3600000, 0.25);

  const speedPerHour = (last.windSpeed - first.windSpeed) / elapsedHours;
  const directionPerHour = shortestDirectionDelta(first.windDirection, last.windDirection) / elapsedHours;

  const gustFactors = normalized
    .filter(entry => entry.windGust != null && entry.windSpeed != null && entry.windSpeed > 0)
    .map(entry => entry.windGust / entry.windSpeed);

  const gustFactor = gustFactors.length > 0
    ? gustFactors.reduce((sum, value) => sum + value, 0) / gustFactors.length
    : 1.15;

  const speedRange = normalized.reduce((range, entry) => {
    const min = Math.min(range.min, entry.windSpeed);
    const max = Math.max(range.max, entry.windSpeed);
    return { min, max };
  }, { min: Infinity, max: -Infinity });

  const variability = speedRange.max - speedRange.min;
  const confidence = clamp(0.8 - variability / 30, 0.35, 0.85);

  return {
    speedPerHour,
    directionPerHour,
    gustFactor: clamp(gustFactor, 1.05, 1.6),
    confidence,
  };
}

function getForecastHour(forecastHours = [], targetDate) {
  if (!forecastHours.length || !targetDate) return null;

  const targetTime = targetDate.getTime();
  return forecastHours.find(period => {
    const periodTime = toDate(period.startTime);
    return periodTime && Math.abs(periodTime.getTime() - targetTime) < 45 * 60 * 1000;
  }) || null;
}

function getThermalTarget({ offset, currentSpeed, thermalPrediction }) {
  if (!thermalPrediction) {
    return { speed: null, direction: null, phase: null };
  }

  const expectedPeakSpeed = Number(thermalPrediction?.monthlyContext?.expectedPeakSpeed)
    || thermalPrediction?.speed?.expectedAvg
    || currentSpeed
    || 10;
  const expectedDirection = parseExpectedDirection(thermalPrediction);
  const phase = thermalPrediction.phase;
  const timeToThermalHours = (thermalPrediction.timeToThermal || 0) / 60;

  let targetSpeed = currentSpeed ?? expectedPeakSpeed;

  if (phase === 'pre-thermal' || phase === 'building') {
    const rampWeight = clamp((offset + 1) / Math.max(1, timeToThermalHours + 1), 0.15, 1);
    targetSpeed = (currentSpeed ?? expectedPeakSpeed * 0.5) * (1 - rampWeight)
      + expectedPeakSpeed * 0.85 * rampWeight;
  } else if (phase === 'peak') {
    targetSpeed = expectedPeakSpeed * (offset <= 1 ? 1 : 0.9);
  } else if (phase === 'fading') {
    targetSpeed = expectedPeakSpeed * Math.max(0.35, 0.8 - offset * 0.12);
  } else if (phase === 'ended') {
    targetSpeed = Math.max(2, (currentSpeed ?? expectedPeakSpeed * 0.4) * (0.82 ** offset));
  }

  return {
    speed: round(targetSpeed, 1),
    direction: expectedDirection,
    phase,
  };
}

function getProfileAdjustment({ date, offset, profile, currentSpeed }) {
  if (!profile) {
    return { speedDelta: 0, targetDirection: null, phase: null };
  }

  const hour = date.getHours();
  const preferredWindow = profile.preferredWindow;
  const idealMidpoint = profile.idealSpeed
    ? (profile.idealSpeed.min + profile.idealSpeed.max) / 2
    : null;

  let speedDelta = 0;
  let phase = 'steady';

  if (preferredWindow && idealMidpoint != null) {
    const inWindow = hour >= preferredWindow.start && hour <= preferredWindow.end;
    const hoursFromPeak = Math.abs(hour - preferredWindow.peak);

    if (inWindow) {
      speedDelta += Math.max(0, idealMidpoint - (currentSpeed ?? idealMidpoint)) * 0.35;
      speedDelta += Math.max(0, 1.6 - hoursFromPeak * 0.4);
      phase = hour < preferredWindow.peak ? 'building' : 'window';
    } else {
      speedDelta -= (profile.offWindowDecay || 0.12) * Math.max(currentSpeed ?? 0, idealMidpoint * 0.6);
      phase = hour < preferredWindow.start ? 'waiting' : 'fading';
    }
  }

  if (profile.middayPenalty && hour >= profile.middayPenalty.start && hour <= profile.middayPenalty.end) {
    speedDelta -= profile.middayPenalty.amount;
    phase = 'midday';
  }

  if (profile.rampHours && offset > profile.rampHours) {
    speedDelta *= 0.8;
  }

  return {
    speedDelta: round(speedDelta, 1) || 0,
    targetDirection: profile.targetDirection ?? null,
    phase,
  };
}

function getIndicatorAdjustment({ thermalPrediction, profileType, offset }) {
  if (!thermalPrediction || offset > 2) {
    return { speedDelta: 0, confidenceDelta: 0 };
  }

  const statusToBoost = {
    strong: 4,
    trigger: 4,
    moderate: 2.5,
    building: 2,
    weak: 1,
  };

  let speedDelta = 0;
  let confidenceDelta = 0;

  const spanishForkStatus = thermalPrediction.spanishFork?.status;
  if (spanishForkStatus && profileType === 'thermal') {
    speedDelta += statusToBoost[spanishForkStatus] || 0;
    confidenceDelta += 0.05;
  }

  const northFlowStatus = thermalPrediction.northFlow?.status;
  if (northFlowStatus && profileType === 'thermal') {
    speedDelta += statusToBoost[northFlowStatus] || 0;
    confidenceDelta += 0.07;
  }

  const provoStatus = thermalPrediction.provoIndicator?.status;
  if (provoStatus && profileType === 'thermal') {
    speedDelta += statusToBoost[provoStatus] || 0;
    confidenceDelta += 0.05;
  }

  const pointOfMountainStatus = thermalPrediction.pointOfMountain?.status;
  if (pointOfMountainStatus && profileType?.startsWith('paragliding')) {
    speedDelta += (statusToBoost[pointOfMountainStatus] || 0) * 0.85;
    confidenceDelta += 0.06;
  }

  return { speedDelta, confidenceDelta };
}

function mergeSpeeds(values) {
  const valid = values.filter(value => value != null && !Number.isNaN(value));
  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export function buildNearTermWindTimeline({
  currentConditions = {},
  historyEntries = [],
  forecastHours = [],
  thermalPrediction = null,
  profile = null,
  now = new Date(),
  hours = DEFAULT_HORIZON_HOURS,
}) {
  const current = normalizeWindSnapshot(currentConditions);
  const trend = calculateTrend(historyEntries);

  return Array.from({ length: hours + 1 }, (_, offset) => {
    const date = new Date(now.getTime() + offset * 60 * 60 * 1000);
    const forecastHour = getForecastHour(forecastHours, date);
    const thermalTarget = getThermalTarget({
      offset,
      currentSpeed: current.windSpeed,
      thermalPrediction,
    });
    const profileAdjustment = getProfileAdjustment({
      date,
      offset,
      profile,
      currentSpeed: current.windSpeed,
    });
    const indicatorAdjustment = getIndicatorAdjustment({
      thermalPrediction,
      profileType: profile?.type || 'generic',
      offset,
    });

    const observedSpeedProjection = current.windSpeed != null
      ? clamp(current.windSpeed + trend.speedPerHour * offset, 0, 45)
      : null;

    const predictedSpeedBase = mergeSpeeds([
      observedSpeedProjection != null ? { value: observedSpeedProjection, weight: 0.35 } : null,
      forecastHour?.windSpeed != null ? { value: forecastHour.windSpeed, weight: 0.4 } : null,
      thermalTarget.speed != null ? { value: thermalTarget.speed, weight: 0.25 } : null,
    ].filter(Boolean));

    const predictedSpeed = clamp(
      (predictedSpeedBase ?? current.windSpeed ?? 0)
      + profileAdjustment.speedDelta
      + indicatorAdjustment.speedDelta,
      0,
      45
    );

    const observedDirectionProjection = current.windDirection != null
      ? (current.windDirection + trend.directionPerHour * offset + 360) % 360
      : null;

    let predictedDirection = observedDirectionProjection ?? forecastHour?.windDirectionDegrees ?? thermalTarget.direction;
    predictedDirection = blendDirection(predictedDirection, forecastHour?.windDirectionDegrees, 0.45);
    predictedDirection = blendDirection(predictedDirection, thermalTarget.direction, 0.35);
    predictedDirection = blendDirection(predictedDirection, profileAdjustment.targetDirection, 0.25);

    const gustFactor = current.windGust && current.windSpeed
      ? clamp(current.windGust / Math.max(current.windSpeed, 1), 1.05, 1.8)
      : trend.gustFactor;
    const forecastGust = forecastHour?.windSpeed != null ? forecastHour.windSpeed * 1.18 : null;
    const predictedGust = Math.max(
      predictedSpeed,
      round(mergeSpeeds([
        forecastGust != null ? { value: forecastGust, weight: 0.45 } : null,
        { value: predictedSpeed * gustFactor, weight: 0.55 },
      ].filter(Boolean)), 1)
    );

    const confidence = clamp(
      0.35
        + (current.windSpeed != null ? 0.18 : 0)
        + (historyEntries?.length ? trend.confidence * 0.18 : 0)
        + (forecastHour ? 0.2 : 0)
        + indicatorAdjustment.confidenceDelta,
      0.35,
      0.95
    );

    const deltaFromCurrent = predictedSpeed - (current.windSpeed ?? predictedSpeed);
    const phase = thermalTarget.phase
      || profileAdjustment.phase
      || (deltaFromCurrent > 1.5 ? 'building' : deltaFromCurrent < -1.5 ? 'fading' : 'steady');

    return {
      offset,
      date,
      hour: date.getHours(),
      time: getHourLabel(date),
      predictedSpeed: round(predictedSpeed),
      predictedDirection: predictedDirection != null ? round((predictedDirection + 360) % 360) : null,
      predictedGust: round(predictedGust),
      phase,
      confidence: Math.round(confidence * 100),
      forecastSource: Boolean(forecastHour),
      isCurrent: offset === 0,
      isPast: false,
    };
  });
}
