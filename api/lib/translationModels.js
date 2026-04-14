/**
 * Station Translation Models
 *
 * Lightweight module for translating replacement station observations
 * (WU/Tempest) to match the expected Synoptic station IDs using
 * learned correlation models from the validation period.
 *
 * Kept separate from serverLearning.js to avoid pulling the full
 * 2400-line learning engine into the 1-ingest.js serverless function.
 */

let _translationModels = null;

export async function loadTranslationModels(redisCmd) {
  if (_translationModels) return _translationModels;
  try {
    const raw = await redisCmd('GET', 'models:translations');
    if (!raw) return [];
    const models = typeof raw === 'string' ? JSON.parse(raw) : raw;
    _translationModels = models;
    console.log(`[translations] Loaded ${models.length} translation models`);
    return models;
  } catch (e) {
    console.warn('[translations] Failed to load translation models:', e.message);
    return [];
  }
}

export function translateObservation(obs, model) {
  if (!obs || !model) return obs;
  return {
    ...obs,
    stationId: model.synopticId,
    windSpeed: obs.windSpeed != null && model.speedRatio
      ? Math.round(obs.windSpeed * model.speedRatio * 10) / 10
      : obs.windSpeed,
    windDirection: obs.windDirection != null && model.dirOffset != null
      ? (obs.windDirection + model.dirOffset + 360) % 360
      : obs.windDirection,
    windGust: obs.windGust != null && model.gustRatio
      ? Math.round(obs.windGust * model.gustRatio * 10) / 10
      : obs.windGust,
    _translatedFrom: obs.stationId,
    _confidence: model.confidence,
    _originalSource: obs.source,
    source: 'translated',
  };
}

export function applyTranslations(stations, models) {
  if (!models || models.length === 0) return stations;

  const modelMap = new Map();
  for (const m of models) {
    if (!modelMap.has(m.replacementId)) {
      modelMap.set(m.replacementId, m);
    }
  }

  const result = [...stations];
  const existingIds = new Set(stations.map(s => s.stationId));

  for (const station of stations) {
    const model = modelMap.get(station.stationId);
    if (model && !existingIds.has(model.synopticId)) {
      result.push(translateObservation(station, model));
      existingIds.add(model.synopticId);
    }
  }

  return result;
}
