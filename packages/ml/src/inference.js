/**
 * Lightweight Node.js inference for the trained XGBoost Wind_Error model.
 *
 * The model predicts the correction (in mph) to add to the HRRR/NWS
 * forecast to get the true local Utah Lake wind.
 *
 * corrected_wind = hrrr_forecast + predict(features)
 *
 * Feature contract must match train_model.py FEATURE_COLS exactly.
 */

export const FEATURES = [
  'Baseline_Wind',
  'Pressure_Gradient',
  'Thermal_Delta',
  'Hour_of_Day',
  'Month',
  'Wind_Direction',
  'Temperature',
  'Wind_Gust_Baseline',
  'Is_Thermal_Window',
  'Wind_Dir_Sin',
  'Wind_Dir_Cos',
  'Hour_Sin',
  'Hour_Cos',
  'HRRR_Temp',
  'Temp_Model_Delta',
];

let _model = null;

/**
 * Load the trained XGBoost model from JSON.
 * @param {string} modelPath — path to xgboost_model.json
 */
export async function loadModel(modelPath) {
  _model = modelPath;
  return true;
}

/**
 * Predict the Wind_Error correction for given conditions.
 *
 * @param {Object} features — object with keys matching FEATURES
 * @returns {number} Predicted wind error in mph (add to HRRR forecast)
 */
export function predict(features) {
  if (!_model) {
    throw new Error('@utahwind/ml: model not loaded — call loadModel() first');
  }
  // Stub — will be replaced with XGBoost WASM or pre-scored lookup
  return 0;
}
