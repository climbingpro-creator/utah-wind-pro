/**
 * @utahwind/ml — Machine Learning package for NWS forecast error prediction.
 *
 * Training:  Python (XGBoost) — see scripts/
 * Inference: Node.js — loads the trained xgboost_model.json and predicts
 *            the Wind_Error correction for a given set of features.
 */

export { predict, loadModel, FEATURES } from './inference.js';
