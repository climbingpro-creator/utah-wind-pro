/**
 * InferenceEngine.js -- Pure-JS XGBoost inference for Vercel / Edge.
 *
 * Loads a trained XGBoost JSON model and evaluates it without native deps.
 * The tree walk is a direct implementation of the XGBoost prediction
 * algorithm: start at root (node 0), compare feature value against the
 * split threshold, go left or right, accumulate leaf scores, add base_score.
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Utah Lake seasonal water temperature model (deg F, index 0 = Jan) ────
const WATER_TEMP_F = [36, 39, 43, 48, 55, 65, 72, 72, 68, 55, 46, 37];

/**
 * Resolve the path to the bundled xgboost_model.json
 * so callers don't have to know the internal file layout.
 */
export function getModelPath() {
  return join(__dirname, '..', 'models', 'xgboost_model.json');
}



// ══════════════════════════════════════════════════════════════════════════
//  PURE-JS XGBOOST TREE EVALUATOR
// ══════════════════════════════════════════════════════════════════════════

class XGBoostModel {
  constructor(modelJson) {
    const learner = modelJson.learner;
    const gbModel = learner.gradient_booster.model;

    this.featureNames = learner.feature_names;
    this.numFeatures = parseInt(learner.learner_model_param.num_feature, 10);
    this.trees = gbModel.trees;

    const raw = learner.learner_model_param.base_score;
    this.baseScore = typeof raw === 'string'
      ? parseFloat(raw.replace(/[\[\]]/g, ''))
      : parseFloat(raw);
  }

  /**
   * Walk a single tree and return the leaf value.
   * Node i is a leaf when left_children[i] === -1.
   */
  _evaluateTree(tree, features) {
    let node = 0;
    const { left_children, right_children, split_indices, split_conditions, default_left, base_weights } = tree;

    while (left_children[node] !== -1) {
      const featureIdx = split_indices[node];
      const threshold = split_conditions[node];
      const value = features[featureIdx];

      if (value == null || Number.isNaN(value)) {
        node = default_left[node] ? left_children[node] : right_children[node];
      } else if (value < threshold) {
        node = left_children[node];
      } else {
        node = right_children[node];
      }
    }

    return base_weights[node];
  }

  /**
   * Run the full ensemble: base_score + sum of all tree leaf values.
   * @param {number[]} featureVector - ordered by this.featureNames
   * @returns {number} predicted value
   */
  predict(featureVector) {
    let sum = this.baseScore;
    for (const tree of this.trees) {
      sum += this._evaluateTree(tree, featureVector);
    }
    return sum;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  WIND PREDICTOR  (public API)
// ══════════════════════════════════════════════════════════════════════════

export class WindPredictor {
  /** @type {XGBoostModel | null} */
  _model = null;

  /**
   * Load the trained XGBoost model.
   * Accepts a file path (Node/Vercel) or a pre-parsed JSON object.
   */
  async loadModel(pathOrJson) {
    let json = pathOrJson;
    if (typeof pathOrJson === 'string') {
      const raw = await readFile(pathOrJson, 'utf-8');
      json = JSON.parse(raw);
    }
    this._model = new XGBoostModel(json);
    return this;
  }

  /** True once loadModel() has succeeded. */
  get isReady() {
    return this._model !== null;
  }

  /** The feature names the model was trained on, in order. */
  get featureNames() {
    return this._model?.featureNames ?? [];
  }

  /**
   * Build the feature vector from live conditions and run prediction.
   *
   * @param {Object} liveHRRR - Current/forecasted HRRR data at the target point
   * @param {number} liveHRRR.windSpeed      - HRRR wind_speed_10m (mph)
   * @param {number} liveHRRR.windDirection   - HRRR wind_direction_10m (degrees)
   * @param {number} liveHRRR.windGust        - HRRR wind_gusts_10m (mph)
   * @param {number} liveHRRR.temperature     - HRRR temperature_2m (deg F)
   * @param {Object} currentKSLC
   * @param {number} currentKSLC.pressure     - KSLC pressure_msl (hPa)
   * @param {Object} currentKPVU
   * @param {number} currentKPVU.pressure     - KPVU pressure_msl (hPa)
   * @param {number} localAirTemp             - Actual sensor air temp (deg F)
   * @param {Date}   [now]                    - Override for current time
   *
   * @returns {{ adjustedWind: number, windError: number, features: Object }}
   */
  predictForecast(liveHRRR, currentKSLC, currentKPVU, localAirTemp, now = new Date()) {
    if (!this._model) {
      throw new Error('WindPredictor: model not loaded -- call loadModel() first');
    }

    const hour = now.getHours();
    const month = now.getMonth() + 1;
    const waterTemp = WATER_TEMP_F[month - 1];

    const baselineWind = liveHRRR.windSpeed ?? 0;
    const baselineDir = liveHRRR.windDirection ?? 0;
    const baselineGust = liveHRRR.windGust ?? 0;
    const hrrrTemp = liveHRRR.temperature ?? localAirTemp;

    const pressureGradient = (currentKSLC?.pressure ?? 0) - (currentKPVU?.pressure ?? 0);
    const thermalDelta = localAirTemp - waterTemp;
    const isThermalWindow = (hour >= 10 && hour <= 18) ? 1 : 0;
    const tempModelDelta = localAirTemp - hrrrTemp;

    const dirRad = (baselineDir * Math.PI) / 180;
    const windDirSin = Math.round(Math.sin(dirRad) * 10000) / 10000;
    const windDirCos = Math.round(Math.cos(dirRad) * 10000) / 10000;

    const hourRad = (2 * Math.PI * hour) / 24;
    const hourSin = Math.round(Math.sin(hourRad) * 10000) / 10000;
    const hourCos = Math.round(Math.cos(hourRad) * 10000) / 10000;

    // Feature vector -- order MUST match training (FEATURE_COLS in train_model.py)
    const featureVector = [
      baselineWind,       // 0  Baseline_Wind
      pressureGradient,   // 1  Pressure_Gradient
      thermalDelta,       // 2  Thermal_Delta
      hour,               // 3  Hour_of_Day
      month,              // 4  Month
      baselineDir,        // 5  Wind_Direction
      localAirTemp,       // 6  Temperature
      baselineGust,       // 7  Wind_Gust_Baseline
      isThermalWindow,    // 8  Is_Thermal_Window
      windDirSin,         // 9  Wind_Dir_Sin
      windDirCos,         // 10 Wind_Dir_Cos
      hourSin,            // 11 Hour_Sin
      hourCos,            // 12 Hour_Cos
      hrrrTemp,           // 13 HRRR_Temp
      tempModelDelta,     // 14 Temp_Model_Delta
    ];

    const windError = this._model.predict(featureVector);
    const adjustedWind = Math.max(0, baselineWind + windError);

    return {
      adjustedWind: Math.round(adjustedWind * 10) / 10,
      windError: Math.round(windError * 10) / 10,
      baselineWind,
      features: {
        Baseline_Wind: baselineWind,
        Pressure_Gradient: Math.round(pressureGradient * 100) / 100,
        Thermal_Delta: Math.round(thermalDelta * 10) / 10,
        Hour_of_Day: hour,
        Month: month,
        Wind_Direction: baselineDir,
        Temperature: localAirTemp,
        Wind_Gust_Baseline: baselineGust,
        Is_Thermal_Window: isThermalWindow,
        HRRR_Temp: hrrrTemp,
        Temp_Model_Delta: Math.round(tempModelDelta * 10) / 10,
      },
    };
  }

  /**
   * Batch-correct an entire hourly forecast array.
   *
   * @param {Array} hourlyForecast - Array of { windSpeed, windDirection, windGust, temperature, time }
   * @param {Object} currentKSLC   - { pressure }
   * @param {Object} currentKPVU   - { pressure }
   * @param {number} localAirTemp  - Current sensor air temp
   * @returns {Array} Same array shape with added adjustedWind and windError per entry
   */
  correctHourlyForecast(hourlyForecast, currentKSLC, currentKPVU, localAirTemp) {
    if (!this._model) {
      throw new Error('WindPredictor: model not loaded');
    }

    return hourlyForecast.map(entry => {
      const entryTime = entry.time ? new Date(entry.time) : new Date();
      const rawDir = entry.windDirection ?? entry.dirDeg ?? entry.dir;
      const numericDir = typeof rawDir === 'number' ? rawDir : 0;

      const result = this.predictForecast(
        {
          windSpeed: entry.windSpeed ?? entry.speed ?? 0,
          windDirection: numericDir,
          windGust: entry.windGust ?? entry.gust ?? 0,
          temperature: entry.temperature ?? entry.temp ?? localAirTemp,
        },
        currentKSLC,
        currentKPVU,
        localAirTemp,
        entryTime,
      );

      return {
        ...entry,
        adjustedWind: result.adjustedWind,
        windError: result.windError,
        mlCorrected: true,
      };
    });
  }
}
