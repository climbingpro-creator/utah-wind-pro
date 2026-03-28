/**
 * @utahwind/ml -- Machine Learning package for NWS forecast error prediction.
 *
 * Training:  Python (XGBoost) -- see scripts/
 * Inference: Pure JS -- loads xgboost_model.json, walks decision trees natively
 */

export { WindPredictor } from './InferenceEngine.js';
