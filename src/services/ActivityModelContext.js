import { LAKE_CONFIGS } from '../config/lakeStations';
import { evaluateIndicator, getIndicatorsForLaunch } from '../config/indicatorSystem';

const CALM_SEEKING_ACTIVITIES = new Set(['boating', 'paddling']);
const WIND_SEEKING_ACTIVITIES = new Set(['kiting', 'sailing', 'windsurfing']);

function normalizeStation(station, fallbackId = null) {
  if (!station) return null;

  return {
    ...station,
    id: station.id || fallbackId,
    speed: station.speed ?? station.windSpeed ?? null,
    gust: station.gust ?? station.windGust ?? null,
    direction: station.direction ?? station.windDirection ?? null,
  };
}

function getStationById(lakeState, stationId) {
  if (!lakeState || !stationId) return null;

  if (stationId === 'PWS') {
    return lakeState.pws ? normalizeStation(lakeState.pws, 'PWS') : null;
  }

  const directStation = lakeState.wind?.stations?.find((station) => station.id === stationId);
  if (directStation) return normalizeStation(directStation, stationId);

  if (lakeState.stationReadings?.[stationId]) {
    return normalizeStation(lakeState.stationReadings[stationId], stationId);
  }

  const namedIndicators = [
    lakeState.earlyIndicator,
    lakeState.kslcStation,
    lakeState.kpvuStation,
    lakeState.utalpStation,
    ...(lakeState.referenceStations || []),
  ];

  const matched = namedIndicators.find((station) => station?.id === stationId);
  return matched ? normalizeStation(matched, stationId) : null;
}

function canUsePwsAsTarget(lakeId) {
  if (!lakeId) return false;
  if (lakeId === 'utah-lake-zigzag') return true;
  return !lakeId.startsWith('utah-lake');
}

function getTargetStationCandidates(activity, config) {
  const candidates = [];
  const groundTruthId = config?.stations?.groundTruth?.id;
  const sortedLakeshore = [...(config?.stations?.lakeshore || [])]
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  if (WIND_SEEKING_ACTIVITIES.has(activity)) {
    if (groundTruthId && groundTruthId !== 'PWS') candidates.push(groundTruthId);
    sortedLakeshore.forEach((station) => candidates.push(station.id));
  } else if (CALM_SEEKING_ACTIVITIES.has(activity)) {
    sortedLakeshore.forEach((station) => candidates.push(station.id));
    if (groundTruthId && groundTruthId !== 'PWS') candidates.push(groundTruthId);
  } else {
    if (groundTruthId) candidates.push(groundTruthId);
    sortedLakeshore.forEach((station) => candidates.push(station.id));
  }

  return [...new Set(candidates)];
}

function buildWindSeekingProfile(config) {
  const thermal = config?.thermal || {};

  return {
    mode: 'wind',
    type: config?.id === 'deer-creek' ? 'canyon' : 'thermal',
    preferredWindow: {
      start: thermal.buildTime?.usable ?? thermal.peakHours?.start ?? 10,
      end: thermal.fadeTime?.end ?? thermal.peakHours?.end ?? 17,
      peak: thermal.peakHours?.peak ?? thermal.peakHours?.start ?? 12,
    },
    idealSpeed: thermal.optimalSpeed || null,
    targetDirection: thermal.optimalDirection?.ideal ?? null,
    offWindowDecay: config?.id === 'deer-creek' ? 0.1 : 0.14,
    middayPenalty: config?.id === 'deer-creek'
      ? null
      : { start: 12, end: 14, amount: config?.id.startsWith('utah-lake') ? 0 : 1 },
  };
}

function buildCalmSeekingProfile(config) {
  const thermal = config?.thermal || {};
  const calmEnd = thermal.buildTime?.usable ?? thermal.peakHours?.start ?? 10;

  return {
    mode: 'calm',
    type: 'flat-water',
    calmWindow: {
      start: 5,
      end: calmEnd,
      buildStart: thermal.buildTime?.start ?? Math.max(5, calmEnd - 3),
      peak: thermal.peakHours?.peak ?? calmEnd + 2,
    },
  };
}

function buildFallbackProfile(config) {
  return {
    mode: 'wind',
    type: 'generic',
    preferredWindow: {
      start: config?.thermal?.buildTime?.usable ?? 9,
      end: config?.thermal?.fadeTime?.end ?? 17,
      peak: config?.thermal?.peakHours?.peak ?? 12,
    },
    idealSpeed: config?.thermal?.optimalSpeed || null,
    targetDirection: config?.thermal?.optimalDirection?.ideal ?? null,
    offWindowDecay: 0.12,
  };
}

function buildModelProfile(activity, config) {
  if (WIND_SEEKING_ACTIVITIES.has(activity)) {
    return buildWindSeekingProfile(config);
  }

  if (CALM_SEEKING_ACTIVITIES.has(activity)) {
    return buildCalmSeekingProfile(config);
  }

  return buildFallbackProfile(config);
}

export function getActivityModelContext(activity, lakeState, historyByStation = {}) {
  if (!activity || !lakeState?.lakeId) {
    return null;
  }

  const config = lakeState.config || LAKE_CONFIGS[lakeState.lakeId];
  if (!config) return null;

  const targetCandidates = getTargetStationCandidates(activity, config);
  const allowPws = canUsePwsAsTarget(config.id);

  if (allowPws && config?.stations?.groundTruth?.id === 'PWS') {
    targetCandidates.unshift('PWS');
  }

  const uniqueCandidates = [...new Set(targetCandidates)];
  const targetStation = uniqueCandidates
    .map((stationId) => getStationById(lakeState, stationId))
    .find(Boolean)
    || (allowPws ? getStationById(lakeState, 'PWS') : null)
    || normalizeStation(lakeState.wind?.stations?.[0]);

  const indicatorEvaluations = getIndicatorsForLaunch(config.id).map((indicator) => {
    const station = getStationById(lakeState, indicator.stationId);
    const evaluation = station
      ? evaluateIndicator(indicator, {
          speed: station.speed,
          direction: station.direction,
        })
      : { status: 'no-data', message: 'No data available', prediction: null };

    return {
      indicator,
      station,
      status: evaluation.status,
      message: evaluation.message,
      prediction: evaluation.prediction,
    };
  });

  return {
    targetStation,
    targetHistory: historyByStation[targetStation?.id] || [],
    profile: buildModelProfile(activity, config),
    indicatorEvaluations,
    stationCandidates: uniqueCandidates,
  };
}
