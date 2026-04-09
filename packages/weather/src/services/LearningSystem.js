/**
 * LEARNING SYSTEM
 * 
 * A self-improving wind prediction system that:
 * 1. Collects predictions and actual outcomes every hour
 * 2. Stores historical data for pattern analysis
 * 3. Tracks model accuracy over time
 * 4. Automatically recalibrates prediction weights
 * 5. Learns new patterns from accumulated data
 * 
 * LEARNING CYCLE:
 * 1. PREDICT: Make prediction using current model
 * 2. RECORD: Store prediction with timestamp
 * 3. VERIFY: Compare prediction to actual outcome
 * 4. SCORE: Calculate accuracy metrics
 * 5. LEARN: Adjust model weights based on errors
 * 6. REPEAT: Continuous improvement loop
 */

import trainedWeightsData from '../config/trainedWeights.json';
import { sessionService } from './SessionValidation';

const DB_NAME = 'UtahWindProLearning';
const DB_VERSION = 2;

// Store names
const STORES = {
  PREDICTIONS: 'predictions',      // Prediction records
  ACTUALS: 'actuals',              // Actual weather data
  ACCURACY: 'accuracy',            // Accuracy scores over time
  MODEL_WEIGHTS: 'modelWeights',   // Learned model parameters
  PATTERNS: 'patterns',            // Discovered patterns
  INDICATORS: 'indicators',        // Indicator correlation data
};

class LearningSystem {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.currentWeights = null;
    this._weightListeners = [];
    this._recentActualKeys = new Set();
  }

  /**
   * Register a callback that fires whenever weights are updated.
   * Returns an unsubscribe function.
   */
  onWeightsUpdated(callback) {
    this._weightListeners.push(callback);
    // Immediately fire with current weights if available
    if (this.currentWeights) {
      try { callback(this.currentWeights); } catch (_e) { /* ignore */ }
    }
    return () => {
      this._weightListeners = this._weightListeners.filter(cb => cb !== callback);
    };
  }

  _pushWeightsToPredictor() {
    if (!this.currentWeights) return;
    for (const cb of this._weightListeners) {
      try { cb(this.currentWeights); } catch (e) {
        console.error('Error in weight listener:', e);
      }
    }
  }

  // =========================================
  // DATABASE INITIALIZATION
  // =========================================

  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = async () => {
        this.db = request.result;
        this.isInitialized = true;
        await this.loadCurrentWeights();
        this._pushWeightsToPredictor();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Predictions store - what we predicted
        if (!db.objectStoreNames.contains(STORES.PREDICTIONS)) {
          const predStore = db.createObjectStore(STORES.PREDICTIONS, { keyPath: 'id', autoIncrement: true });
          predStore.createIndex('timestamp', 'timestamp');
          predStore.createIndex('lakeId', 'lakeId');
          predStore.createIndex('date', 'date');
        }

        // Actuals store - what actually happened
        if (!db.objectStoreNames.contains(STORES.ACTUALS)) {
          const actualStore = db.createObjectStore(STORES.ACTUALS, { keyPath: 'id', autoIncrement: true });
          actualStore.createIndex('timestamp', 'timestamp');
          actualStore.createIndex('lakeId', 'lakeId');
          actualStore.createIndex('stationId', 'stationId');
          actualStore.createIndex('date', 'date');
        }

        // Accuracy tracking
        if (!db.objectStoreNames.contains(STORES.ACCURACY)) {
          const accStore = db.createObjectStore(STORES.ACCURACY, { keyPath: 'id', autoIncrement: true });
          accStore.createIndex('date', 'date');
          accStore.createIndex('lakeId', 'lakeId');
        }

        // Model weights - learned parameters
        if (!db.objectStoreNames.contains(STORES.MODEL_WEIGHTS)) {
          db.createObjectStore(STORES.MODEL_WEIGHTS, { keyPath: 'id' });
        }

        // Discovered patterns
        if (!db.objectStoreNames.contains(STORES.PATTERNS)) {
          const patternStore = db.createObjectStore(STORES.PATTERNS, { keyPath: 'id', autoIncrement: true });
          patternStore.createIndex('type', 'type');
          patternStore.createIndex('lakeId', 'lakeId');
        }

        // Indicator correlations
        if (!db.objectStoreNames.contains(STORES.INDICATORS)) {
          const indStore = db.createObjectStore(STORES.INDICATORS, { keyPath: 'id', autoIncrement: true });
          indStore.createIndex('indicatorId', 'indicatorId');
          indStore.createIndex('targetId', 'targetId');
          indStore.createIndex('date', 'date');
        }
      };
    });
  }

  // =========================================
  // DATA COLLECTION
  // =========================================

  /**
   * Record a prediction for later verification
   */
  async recordPrediction(lakeId, prediction, conditions) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      lakeId,
      
      // What we predicted
      prediction: {
        probability: prediction.probability,
        windType: prediction.windType,
        expectedSpeed: prediction.expectedSpeed,
        expectedDirection: prediction.expectedDirection,
        startTime: prediction.startTime,
        foilKiteablePct: prediction.foilKiteablePct,
        twinTipKiteablePct: prediction.twinTipKiteablePct,
        phase: prediction.phase,
        windEventType: prediction.windEventType || null,
        windEventDetails: prediction.windEventDetails || null,
        timing: prediction.timing || null,
        indicatorScore: prediction.indicatorScore ?? null,
      },
      
      // Conditions at time of prediction
      conditions: {
        pressureGradient: conditions.pressureGradient,
        thermalDelta: conditions.thermalDelta,
        kslcSpeed: conditions.kslcWind?.speed,
        kslcDirection: conditions.kslcWind?.direction,
        kpvuSpeed: conditions.kpvuWind?.speed,
        kpvuDirection: conditions.kpvuWind?.direction,
        qsfSpeed: conditions.spanishForkWind?.speed,
        qsfDirection: conditions.spanishForkWind?.direction,
        utalpSpeed: conditions.utalpWind?.speed,
        utalpDirection: conditions.utalpWind?.direction,
        temperature: conditions.temperature,
      },
      
      // Model weights used
      weightsVersion: this.currentWeights?.version || 'default',
      
      // Will be filled in later
      verified: false,
      actual: null,
      accuracy: null,
    };

    return this.addRecord(STORES.PREDICTIONS, record);
  }

  /**
   * Record actual weather data (called every 15 minutes).
   * Includes dedup to prevent duplicate records on repeated backfills.
   */
  async recordActual(lakeId, stationId, data, timestamp) {
    await this.initialize();

    const now = timestamp ? new Date(timestamp) : new Date();
    const roundedMinute = Math.floor(now.getMinutes() / 15) * 15;
    const dedupKey = `${lakeId}-${stationId}-${now.toISOString().split('T')[0]}-${now.getHours()}-${roundedMinute}`;
    if (this._recentActualKeys.has(dedupKey)) return null;
    this._recentActualKeys.add(dedupKey);

    if (this._recentActualKeys.size > 10000) {
      const keys = [...this._recentActualKeys];
      this._recentActualKeys = new Set(keys.slice(keys.length - 5000));
    }

    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      minute: now.getMinutes(),
      lakeId,
      stationId,
      dataSource: data.dataSource || 'unknown',
      
      // Actual measurements
      windSpeed: data.windSpeed,
      windGust: data.windGust,
      windDirection: data.windDirection,
      temperature: data.temperature,
      pressure: data.pressure,
      
      // Activity scores (from ActivityScoring.js)
      activityScores: data.activityScores || null,
      
      // Derived
      isKiteable: data.windSpeed >= 10,
      isTwinTipKiteable: data.windSpeed >= 15,
      isNorthFlow: data.windDirection !== null && (data.windDirection >= 315 || data.windDirection <= 45),
      isSEThermal: data.windDirection !== null && data.windDirection >= 90 && data.windDirection <= 180,
      isGlass: data.windSpeed != null && data.windSpeed < 5,
      isFlyable: data.windSpeed >= 6 && data.windSpeed <= 25,
    };

    return this.addRecord(STORES.ACTUALS, record);
  }

  /**
   * Record indicator station data for correlation learning
   */
  async recordIndicator(indicatorId, targetId, indicatorData, targetData, leadTimeMinutes) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      indicatorId,
      targetId,
      leadTimeMinutes,
      
      indicator: {
        speed: indicatorData.speed,
        direction: indicatorData.direction,
        temperature: indicatorData.temperature,
      },
      
      target: {
        speed: targetData.speed,
        direction: targetData.direction,
        temperature: targetData.temperature,
      },
      
      // Pre-calculated correlations
      speedRatio: targetData.speed && indicatorData.speed ? targetData.speed / indicatorData.speed : null,
      directionMatch: this.directionsMatch(indicatorData.direction, targetData.direction),
    };

    return this.addRecord(STORES.INDICATORS, record);
  }

  // =========================================
  // VERIFICATION & ACCURACY
  // =========================================

  /**
   * Verify predictions against actual outcomes
   * Called periodically (e.g., every hour)
   */
  async verifyPredictions() {
    await this.initialize();

    const now = new Date();
    // Look back up to 48 hours for unverified predictions — this covers
    // cases where the app was closed and predictions couldn't be verified
    // at the ideal 1-2 hour mark. Redis backfill provides the actuals.
    const lookbackStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    // Only verify predictions at least 1 hour old (need time for actuals to exist)
    const minimumAge = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const predictions = await this.getUnverifiedPredictions(minimumAge, lookbackStart);
    let verified = 0;
    
    for (const prediction of predictions) {
      const predTime = new Date(prediction.timestamp);
      // Look for actuals in a 2-hour window after the prediction was made
      const windowEnd = new Date(predTime.getTime() + 2 * 60 * 60 * 1000);
      const actuals = await this.getActualsForTimeRange(
        prediction.lakeId,
        predTime,
        windowEnd,
      );

      if (actuals.length === 0) continue;

      const accuracy = this.calculateAccuracy(prediction, actuals);
      
      await this.updatePrediction(prediction.id, {
        verified: true,
        actual: this.summarizeActuals(actuals),
        accuracy,
      });

      await this.recordAccuracy(prediction.lakeId, prediction.date, accuracy);
      verified++;
    }

    if (verified > 0) {
      console.log(`Verified ${verified} predictions (${predictions.length - verified} still pending actuals)`);
    }

    await this.checkAndLearn();
  }

  /**
   * Calculate accuracy of a prediction
   */
  calculateAccuracy(prediction, actuals) {
    const pred = prediction.prediction;
    const actual = this.summarizeActuals(actuals);

    const accuracy = {
      timestamp: new Date().toISOString(),
      
      // Speed accuracy (how close was predicted speed to actual)
      speedError: pred.expectedSpeed && actual.avgSpeed 
        ? Math.abs(pred.expectedSpeed - actual.avgSpeed) 
        : null,
      speedAccuracy: pred.expectedSpeed && actual.avgSpeed
        ? Math.max(0, 100 - Math.abs(pred.expectedSpeed - actual.avgSpeed) * 5)
        : null,
      
      // Direction accuracy
      directionError: pred.expectedDirection && actual.avgDirection
        ? this.directionDifference(pred.expectedDirection, actual.avgDirection)
        : null,
      directionAccuracy: pred.expectedDirection && actual.avgDirection
        ? Math.max(0, 100 - this.directionDifference(pred.expectedDirection, actual.avgDirection))
        : null,
      
      // Probability accuracy (did we predict kiteable correctly?)
      predictedKiteable: pred.probability >= 50,
      actuallyKiteable: actual.avgSpeed >= 10,
      kiteablePredictionCorrect: (pred.probability >= 50) === (actual.avgSpeed >= 10),
      
      // Foil kiteable accuracy
      predictedFoilPct: pred.foilKiteablePct,
      actualFoilPct: actual.foilKiteablePct,
      foilPctError: pred.foilKiteablePct != null && actual.foilKiteablePct != null
        ? Math.abs(pred.foilKiteablePct - actual.foilKiteablePct)
        : null,
      
      // Wind type accuracy (fuzzy: matches if predicted type is in the actual wind types set)
      predictedWindType: pred.windType,
      actualWindType: actual.dominantWindType,
      windTypeCorrect: pred.windType === actual.dominantWindType
        || (actual.windTypes && actual.windTypes.includes(pred.windType)),
      
      // Overall score (weighted average)
      overallScore: null,
    };

    // Calculate overall score
    let totalWeight = 0;
    let weightedSum = 0;

    if (accuracy.speedAccuracy != null) {
      weightedSum += accuracy.speedAccuracy * 0.3;
      totalWeight += 0.3;
    }
    if (accuracy.directionAccuracy != null) {
      weightedSum += accuracy.directionAccuracy * 0.2;
      totalWeight += 0.2;
    }
    if (accuracy.kiteablePredictionCorrect != null) {
      weightedSum += (accuracy.kiteablePredictionCorrect ? 100 : 0) * 0.3;
      totalWeight += 0.3;
    }
    if (accuracy.windTypeCorrect != null) {
      weightedSum += (accuracy.windTypeCorrect ? 100 : 0) * 0.2;
      totalWeight += 0.2;
    }

    accuracy.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

    return accuracy;
  }

  /**
   * Summarize actual data from multiple readings
   */
  summarizeActuals(actuals) {
    if (actuals.length === 0) return null;

    const speeds = actuals.filter(a => a.windSpeed != null).map(a => a.windSpeed);
    const directions = actuals.filter(a => a.windDirection != null).map(a => a.windDirection);
    const kiteableCount = actuals.filter(a => a.isKiteable).length;
    const foilKiteableCount = actuals.filter(a => a.windSpeed >= 10).length;
    const twinTipKiteableCount = actuals.filter(a => a.windSpeed >= 15).length;
    const northFlowCount = actuals.filter(a => a.isNorthFlow).length;
    const seThermalCount = actuals.filter(a => a.isSEThermal).length;

    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const avgDir = directions.length > 0 ? this.averageDirection(directions) : null;

    // Classify wind types (extended to match wind event IDs)
    let dominantWindType = 'calm';
    const windTypes = new Set();
    if (northFlowCount > actuals.length * 0.5) {
      dominantWindType = 'north_flow';
      windTypes.add('north_flow');
      windTypes.add('frontal_passage');
      windTypes.add('post_frontal');
    } else if (seThermalCount > actuals.length * 0.5) {
      dominantWindType = 'thermal';
      windTypes.add('thermal');
      windTypes.add('thermal_cycle');
      windTypes.add('clearing_wind');
    } else if (avgSpeed >= 8) {
      dominantWindType = 'other';
      if (avgDir != null && avgDir >= 180 && avgDir <= 250) {
        windTypes.add('pre_frontal');
        windTypes.add('clearing_wind');
      }
    }
    if (avgSpeed < 5) {
      windTypes.add('glass');
      windTypes.add('calm');
    }
    // Paragliding: south-facing sites (PotM South, Inspo) OR north-facing sites (PotM North)
    if (avgDir != null && avgSpeed >= 5 && avgSpeed <= 20) {
      if (avgDir >= 110 && avgDir <= 250) windTypes.add('paragliding_south');
      if (avgDir >= 290 || avgDir <= 60) windTypes.add('paragliding_north');
      if ((avgDir >= 110 && avgDir <= 250) || (avgDir >= 290 || avgDir <= 60)) windTypes.add('paragliding');
    }

    // Aggregate activityScores from raw actuals so per-activity learning works
    const mergedActivityScores = {};
    let activityScoredCount = 0;
    for (const a of actuals) {
      if (!a.activityScores) continue;
      activityScoredCount++;
      for (const [act, score] of Object.entries(a.activityScores)) {
        if (!mergedActivityScores[act]) mergedActivityScores[act] = { sum: 0, count: 0 };
        mergedActivityScores[act].sum += (typeof score === 'number' ? score : 0);
        mergedActivityScores[act].count++;
      }
    }
    const activityScores = {};
    for (const [act, data] of Object.entries(mergedActivityScores)) {
      activityScores[act] = data.count > 0 ? data.sum / data.count : 0;
    }

    return {
      count: actuals.length,
      avgSpeed: speeds.length > 0 ? avgSpeed : null,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
      minSpeed: speeds.length > 0 ? Math.min(...speeds) : null,
      avgDirection: avgDir,
      kiteablePct: Math.round(kiteableCount / actuals.length * 100),
      foilKiteablePct: Math.round(foilKiteableCount / actuals.length * 100),
      twinTipKiteablePct: Math.round(twinTipKiteableCount / actuals.length * 100),
      dominantWindType,
      windTypes: [...windTypes],
      activityScores: activityScoredCount > 0 ? activityScores : undefined,
    };
  }

  // =========================================
  // LEARNING & MODEL ADJUSTMENT
  // =========================================

  /**
   * Check if we have enough new data to trigger learning
   */
  async checkAndLearn() {
    const recentAccuracy = await this.getRecentAccuracy(7); // Last 7 days
    
    if (recentAccuracy.length < 5) {
      console.log('Not enough data for learning yet:', recentAccuracy.length, 'records (need 5)');
      return;
    }

    const avgAccuracy = recentAccuracy.reduce((sum, r) => sum + (r.overallScore || 0), 0) / recentAccuracy.length;
    const confidenceScalar = Math.min(1, recentAccuracy.length / 50);
    
    console.log(`Model accuracy: ${avgAccuracy.toFixed(1)}% across ${recentAccuracy.length} records (confidence: ${(confidenceScalar * 100).toFixed(0)}%)`);

    if (avgAccuracy < 70) {
      console.log('Accuracy below 70% — aggressive recalibration...');
    } else if (avgAccuracy < 85) {
      console.log('Accuracy moderate — standard recalibration...');
    } else {
      console.log('Accuracy good — fine-tuning weights...');
    }

    await this.learnFromData(confidenceScalar);
  }

  /**
   * Learn from accumulated data and adjust model weights
   */
  async learnFromData(confidenceScalar = 1) {
    await this.initialize();

    console.log('Starting learning cycle...');

    // 1. Analyze indicator correlations
    const indicatorLearning = await this.learnIndicatorCorrelations();
    
    // 2. Analyze prediction errors
    const errorAnalysis = await this.analyzeErrors();
    
    // 3. Discover new patterns
    const patterns = await this.discoverPatterns();

    // 4. Incorporate user feedback (session reports)
    const feedbackInsights = await this.incorporateUserFeedback(errorAnalysis);
    
    // 5. Calculate new weights (patterns now actively used!)
    const newWeights = this.calculateNewWeights(indicatorLearning, errorAnalysis, patterns, feedbackInsights, confidenceScalar);
    
    // 6. Save new weights
    await this.saveWeights(newWeights);

    // 7. Prune old data to prevent unbounded DB growth
    await this.pruneOldData();
    
    console.log('Learning cycle complete. New weights:', newWeights);
    
    return newWeights;
  }

  /**
   * Incorporate user session feedback into learning.
   * Compares user-reported wind quality against our predictions to find
   * systematic biases the station data alone can't reveal.
   */
  async incorporateUserFeedback(_errorAnalysis) {
    const insights = {
      totalReports: 0,
      avgRating: 0,
      userSpeedBias: 0,
      qualityCalibration: { epic: 0, good: 0, ok: 0, poor: 0, bust: 0 },
      locationFeedback: {},
    };

    try {
      const stats = await sessionService.getValidationStats(null, 30);
      if (!stats || stats.total === 0) return insights;

      insights.totalReports = stats.total;
      insights.avgRating = stats.avgRating;

      for (const session of stats.sessions) {
        insights.qualityCalibration[session.windQuality] =
          (insights.qualityCalibration[session.windQuality] || 0) + 1;

        if (session.estimatedSpeed != null) {
          const loc = session.locationId || 'unknown';
          if (!insights.locationFeedback[loc]) {
            insights.locationFeedback[loc] = { speeds: [], ratings: [], count: 0 };
          }
          insights.locationFeedback[loc].speeds.push(session.estimatedSpeed);
          insights.locationFeedback[loc].ratings.push(session.rating);
          insights.locationFeedback[loc].count++;
        }
      }

      const epicGood = (insights.qualityCalibration.epic || 0) + (insights.qualityCalibration.good || 0);
      const poorBust = (insights.qualityCalibration.poor || 0) + (insights.qualityCalibration.bust || 0);
      if (epicGood + poorBust > 5) {
        const goodRatio = epicGood / (epicGood + poorBust);
        if (goodRatio < 0.3) {
          insights.userSpeedBias = 2;
        } else if (goodRatio > 0.7) {
          insights.userSpeedBias = -1;
        }
      }

      console.log(`User feedback: ${stats.total} reports, avg rating ${(stats.avgRating ?? 0).toFixed(1)}/5`);
    } catch (e) {
      console.warn('Could not load user feedback:', e.message);
    }

    return insights;
  }

  /**
   * Remove data older than 90 days to prevent unbounded DB growth.
   */
  async pruneOldData() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffISO = cutoff.toISOString();
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const storesToPrune = [STORES.PREDICTIONS, STORES.ACTUALS, STORES.ACCURACY, STORES.INDICATORS];

    for (const storeName of storesToPrune) {
      const indexName = (storeName === STORES.ACCURACY || storeName === STORES.INDICATORS) ? 'date' : 'timestamp';
      const cutoffVal = indexName === 'date' ? cutoffDate : cutoffISO;

      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const range = IDBKeyRange.upperBound(cutoffVal);

        await new Promise((resolve) => {
          const request = index.openCursor(range);
          let deleted = 0;
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              if (deleted > 0) console.log(`Pruned ${deleted} old records from ${storeName}`);
              resolve();
            }
          };
          request.onerror = () => resolve();
        });
      } catch (e) {
        console.log(`Prune skipped for ${storeName}: ${e.message}`);
      }
    }
  }

  /**
   * Learn indicator correlations from data
   */
  async learnIndicatorCorrelations() {
    const indicators = await this.getAllIndicatorData();
    
    const correlations = {};
    
    // Group by indicator-target pair
    const pairs = {};
    for (const record of indicators) {
      const key = `${record.indicatorId}-${record.targetId}`;
      if (!pairs[key]) pairs[key] = [];
      pairs[key].push(record);
    }
    
    // Calculate correlations for each pair
    for (const [key, records] of Object.entries(pairs)) {
      if (records.length < 20) continue; // Need minimum data
      
      const [indicatorId, targetId] = key.split('-');
      
      // Speed correlation
      const speedPairs = records.filter(r => r.indicator.speed != null && r.target.speed != null);
      const speedCorrelation = this.calculateCorrelation(
        speedPairs.map(r => r.indicator.speed),
        speedPairs.map(r => r.target.speed)
      );
      
      // Direction match rate
      const directionMatches = records.filter(r => r.directionMatch).length;
      const directionMatchRate = directionMatches / records.length;
      
      // Speed ratio (how much does target amplify/reduce indicator)
      const ratios = records.filter(r => r.speedRatio != null).map(r => r.speedRatio);
      const avgSpeedRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
      
      // Kiteable prediction accuracy
      const kiteableWhenIndicatorStrong = records.filter(r => 
        r.indicator.speed >= 8 && r.target.speed >= 10
      ).length;
      const strongIndicatorCount = records.filter(r => r.indicator.speed >= 8).length;
      const kiteablePredictionRate = strongIndicatorCount > 0 
        ? kiteableWhenIndicatorStrong / strongIndicatorCount 
        : 0;
      
      correlations[key] = {
        indicatorId,
        targetId,
        sampleSize: records.length,
        speedCorrelation,
        directionMatchRate,
        avgSpeedRatio,
        kiteablePredictionRate,
        confidence: Math.min(1, records.length / 100), // More data = more confidence
      };
    }
    
    return correlations;
  }

  /**
   * Analyze prediction errors to find systematic biases
   */
  async analyzeErrors() {
    const predictions = await this.getVerifiedPredictions(30); // Last 30 days
    
    const analysis = {
      totalPredictions: predictions.length,
      avgOverallAccuracy: 0,
      
      // Speed prediction bias
      speedBias: 0, // Positive = we over-predict, negative = under-predict
      avgPredictedSpeed: 0,
      _predictedSpeedSum: 0,
      _predictedSpeedCount: 0,
      speedErrors: [],
      
      // Direction prediction bias
      directionBias: 0,
      
      // Probability calibration
      probabilityBuckets: {
        '0-20': { predicted: 0, actualKiteable: 0 },
        '20-40': { predicted: 0, actualKiteable: 0 },
        '40-60': { predicted: 0, actualKiteable: 0 },
        '60-80': { predicted: 0, actualKiteable: 0 },
        '80-100': { predicted: 0, actualKiteable: 0 },
      },
      
      windTypeAccuracy: {
        thermal: { correct: 0, total: 0 },
        thermal_cycle: { correct: 0, total: 0 },
        north_flow: { correct: 0, total: 0 },
        calm: { correct: 0, total: 0 },
        glass: { correct: 0, total: 0 },
        postfrontal: { correct: 0, total: 0 },
        post_frontal: { correct: 0, total: 0 },
        clearing_wind: { correct: 0, total: 0 },
        frontal_passage: { correct: 0, total: 0 },
        pre_frontal: { correct: 0, total: 0 },
        paragliding: { correct: 0, total: 0 },
        paragliding_south: { correct: 0, total: 0 },
        paragliding_north: { correct: 0, total: 0 },
      },
      
      // Time of day patterns
      hourlyAccuracy: {},
      
      conditionErrors: {
        highPressureGradient: [],
        lowPressureGradient: [],
        strongIndicator: [],
        weakIndicator: [],
      },

      activityAccuracy: {
        kiting:      { good: 0, total: 0 },
        sailing:     { good: 0, total: 0 },
        windsurfing: { good: 0, total: 0 },
        snowkiting:  { good: 0, total: 0 },
        paragliding: { good: 0, total: 0 },
        boating:     { good: 0, total: 0 },
        paddling:    { good: 0, total: 0 },
        fishing:     { good: 0, total: 0 },
      },
    };
    
    for (const pred of predictions) {
      if (!pred.accuracy) continue;
      
      // Overall accuracy
      if (pred.accuracy.overallScore != null) {
        analysis.avgOverallAccuracy += pred.accuracy.overallScore;
      }
      
      // Speed bias
      if (pred.accuracy.speedError != null) {
        const bias = (pred.prediction.expectedSpeed || 0) - (pred.actual?.avgSpeed || 0);
        analysis.speedBias += bias;
        analysis.speedErrors.push(bias);
      }

      // Track predicted speeds for locationBias calculation
      const predSpeed = pred.prediction.expectedSpeed;
      if (predSpeed != null) {
        analysis._predictedSpeedSum += predSpeed;
        analysis._predictedSpeedCount++;
      }
      
      // Probability calibration
      const prob = pred.prediction.probability;
      let bucket;
      if (prob < 20) bucket = '0-20';
      else if (prob < 40) bucket = '20-40';
      else if (prob < 60) bucket = '40-60';
      else if (prob < 80) bucket = '60-80';
      else bucket = '80-100';
      
      analysis.probabilityBuckets[bucket].predicted++;
      if (pred.accuracy.actuallyKiteable) {
        analysis.probabilityBuckets[bucket].actualKiteable++;
      }
      
      // Wind type accuracy
      const predictedType = pred.prediction.windType;
      if (predictedType && analysis.windTypeAccuracy[predictedType]) {
        analysis.windTypeAccuracy[predictedType].total++;
        if (pred.accuracy.windTypeCorrect) {
          analysis.windTypeAccuracy[predictedType].correct++;
        }
      }
      
      // Hourly accuracy
      const hour = pred.hour;
      if (!analysis.hourlyAccuracy[hour]) {
        analysis.hourlyAccuracy[hour] = { total: 0, sumAccuracy: 0 };
      }
      analysis.hourlyAccuracy[hour].total++;
      analysis.hourlyAccuracy[hour].sumAccuracy += pred.accuracy.overallScore || 0;
      
      // Condition-specific
      const pg = pred.conditions?.pressureGradient;
      if (pg != null && pg > 2) {
        analysis.conditionErrors.highPressureGradient.push(pred.accuracy.overallScore);
      } else if (pg != null && pg < 1) {
        analysis.conditionErrors.lowPressureGradient.push(pred.accuracy.overallScore);
      }

      // Indicator strength buckets
      const indicatorScore = pred.prediction?.indicatorScore;
      if (indicatorScore != null) {
        if (indicatorScore >= 70) {
          analysis.conditionErrors.strongIndicator.push(pred.accuracy.overallScore);
        } else if (indicatorScore <= 30) {
          analysis.conditionErrors.weakIndicator.push(pred.accuracy.overallScore);
        }
      }

      // Per-activity accuracy from stored activityScores
      const scores = pred.actual?.activityScores;
      if (scores) {
        for (const [act, score] of Object.entries(scores)) {
          if (analysis.activityAccuracy[act]) {
            analysis.activityAccuracy[act].total++;
            if (score > 0.5) analysis.activityAccuracy[act].good++;
          }
        }
      }
    }
    
    // Calculate averages
    if (predictions.length > 0) {
      analysis.avgOverallAccuracy /= predictions.length;
      analysis.speedBias /= predictions.length;
    }
    if (analysis._predictedSpeedCount > 0) {
      analysis.avgPredictedSpeed = analysis._predictedSpeedSum / analysis._predictedSpeedCount;
    }
    delete analysis._predictedSpeedSum;
    delete analysis._predictedSpeedCount;
    
    // Calculate probability calibration
    for (const [_bucket, data] of Object.entries(analysis.probabilityBuckets)) {
      data.actualRate = data.predicted > 0 ? data.actualKiteable / data.predicted : 0;
    }
    
    return analysis;
  }

  /**
   * Discover new patterns in the data
   */
  async discoverPatterns() {
    const actuals = await this.getAllActuals(60); // Last 60 days
    
    const patterns = [];
    
    // Group by date and hour
    const byDateHour = {};
    for (const actual of actuals) {
      const key = `${actual.date}-${actual.hour}`;
      if (!byDateHour[key]) byDateHour[key] = [];
      byDateHour[key].push(actual);
    }
    
    // Find good kiting days
    const goodDays = [];
    const dates = [...new Set(actuals.map(a => a.date))];
    
    for (const date of dates) {
      const dayActuals = actuals.filter(a => a.date === date);
      const kiteableHours = new Set(dayActuals.filter(a => a.isKiteable).map(a => a.hour));
      
      if (kiteableHours.size >= 3) { // At least 3 hours of kiteable wind
        goodDays.push({
          date,
          kiteableHours: kiteableHours.size,
          avgSpeed: dayActuals.reduce((s, a) => s + (a.windSpeed || 0), 0) / dayActuals.length,
          dominantDirection: this.getDominantDirection(dayActuals),
        });
      }
    }
    
    // Analyze good days for patterns
    if (goodDays.length >= 5) {
      // Time of day pattern
      const hourCounts = {};
      for (const actual of actuals.filter(a => a.isKiteable)) {
        hourCounts[actual.hour] = (hourCounts[actual.hour] || 0) + 1;
      }
      
      const peakHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (peakHour) {
        patterns.push({
          type: 'peak_hour',
          value: parseInt(peakHour),
          confidence: hourCounts[peakHour] / actuals.filter(a => a.isKiteable).length,
          description: `Peak kiting hour is ${peakHour}:00`,
        });
      }
      
      // Direction pattern
      const directionCounts = { north_flow: 0, thermal: 0, other: 0 };
      for (const actual of actuals.filter(a => a.isKiteable)) {
        if (actual.isNorthFlow) directionCounts.north_flow++;
        else if (actual.isSEThermal) directionCounts.thermal++;
        else directionCounts.other++;
      }
      
      const dominantType = Object.entries(directionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (dominantType) {
        patterns.push({
          type: 'dominant_wind_type',
          value: dominantType,
          confidence: directionCounts[dominantType] / actuals.filter(a => a.isKiteable).length,
          description: `Most kiteable wind is ${dominantType}`,
        });
      }
    }
    
    // Sustained event analysis — find multi-hour consecutive wind events
    for (const date of dates) {
      const dayActuals = actuals
        .filter(a => a.date === date)
        .sort((a, b) => a.hour - b.hour);

      let consecutiveNorth = 0;
      let maxConsecutiveNorth = 0;
      let northStartHour = null;
      let consecutiveThermal = 0;
      let maxConsecutiveThermal = 0;

      const hoursSeen = new Set();
      for (const a of dayActuals) {
        if (hoursSeen.has(a.hour)) continue;
        hoursSeen.add(a.hour);

        if (a.isNorthFlow && a.isKiteable) {
          if (consecutiveNorth === 0) northStartHour = a.hour;
          consecutiveNorth++;
          consecutiveThermal = 0;
          maxConsecutiveNorth = Math.max(maxConsecutiveNorth, consecutiveNorth);
        } else if (a.isSEThermal && a.isKiteable) {
          consecutiveThermal++;
          consecutiveNorth = 0;
          maxConsecutiveThermal = Math.max(maxConsecutiveThermal, consecutiveThermal);
        } else {
          consecutiveNorth = 0;
          consecutiveThermal = 0;
        }
      }

      if (maxConsecutiveNorth >= 4) {
        patterns.push({
          type: 'sustained_north_flow',
          value: maxConsecutiveNorth,
          date,
          startHour: northStartHour,
          avgSpeed: dayActuals
            .filter(a => a.isNorthFlow && a.isKiteable)
            .reduce((s, a) => s + (a.windSpeed || 0), 0) /
            Math.max(1, dayActuals.filter(a => a.isNorthFlow && a.isKiteable).length),
          confidence: Math.min(1, maxConsecutiveNorth / 8),
          description: `${maxConsecutiveNorth}h sustained north flow on ${date}`,
        });
      }
      if (maxConsecutiveThermal >= 4) {
        patterns.push({
          type: 'sustained_thermal',
          value: maxConsecutiveThermal,
          date,
          confidence: Math.min(1, maxConsecutiveThermal / 8),
          description: `${maxConsecutiveThermal}h sustained thermal on ${date}`,
        });
      }

      // Glass window discovery (boating/paddling)
      let consecutiveCalm = 0;
      let maxConsecutiveCalm = 0;
      let calmStartHour = null;
      const calmHours = new Set();
      for (const a of dayActuals) {
        if (calmHours.has(a.hour)) continue;
        calmHours.add(a.hour);
        if ((a.windSpeed ?? 99) <= 6) {
          if (consecutiveCalm === 0) calmStartHour = a.hour;
          consecutiveCalm++;
          maxConsecutiveCalm = Math.max(maxConsecutiveCalm, consecutiveCalm);
        } else {
          consecutiveCalm = 0;
        }
      }
      if (maxConsecutiveCalm >= 3) {
        patterns.push({
          type: 'sustained_glass',
          value: maxConsecutiveCalm,
          date,
          startHour: calmStartHour,
          confidence: Math.min(1, maxConsecutiveCalm / 6),
          description: `${maxConsecutiveCalm}h glass window on ${date} starting ${calmStartHour}:00`,
        });
      }

      // Soarable window discovery (paragliding 5-18 mph, low gust factor)
      let consecutiveSoarable = 0;
      let maxConsecutiveSoarable = 0;
      const soarHours = new Set();
      for (const a of dayActuals) {
        if (soarHours.has(a.hour)) continue;
        soarHours.add(a.hour);
        const spd = a.windSpeed ?? 0;
        const gst = a.windGust ?? spd;
        if (spd >= 5 && spd <= 18 && (spd === 0 || gst / spd <= 1.4)) {
          consecutiveSoarable++;
          maxConsecutiveSoarable = Math.max(maxConsecutiveSoarable, consecutiveSoarable);
        } else {
          consecutiveSoarable = 0;
        }
      }
      if (maxConsecutiveSoarable >= 3) {
        patterns.push({
          type: 'sustained_soarable',
          value: maxConsecutiveSoarable,
          date,
          confidence: Math.min(1, maxConsecutiveSoarable / 6),
          description: `${maxConsecutiveSoarable}h soarable window on ${date}`,
        });
      }
    }

    // Save discovered patterns
    for (const pattern of patterns) {
      await this.addRecord(STORES.PATTERNS, {
        ...pattern,
        discoveredAt: new Date().toISOString(),
      });
    }
    
    return patterns;
  }

  /**
   * Calculate new model weights based on learning.
   * Returns the base thermal weights AND emits activity-specific weight sets
   * to close the loop for paragliding, boating, and fishing predictors.
   */
  calculateNewWeights(indicatorLearning, errorAnalysis, patterns, feedbackInsights, confidenceScalar = 1) {
    const currentWeights = this.currentWeights || this.getDefaultWeights();
    
    const userBias = feedbackInsights?.userSpeedBias || 0;
    const lerpRate = 0.3 * confidenceScalar;

    const newWeights = {
      version: Date.now(),
      createdAt: new Date().toISOString(),
      basedOnSamples: errorAnalysis.totalPredictions,
      userFeedbackSamples: feedbackInsights?.totalReports || 0,
      confidenceScalar,
      
      pressureWeight: currentWeights.pressureWeight,
      thermalWeight: currentWeights.thermalWeight,
      convergenceWeight: currentWeights.convergenceWeight,
      
      indicators: {},
      speedBiasCorrection: -errorAnalysis.speedBias + userBias,
      probabilityCalibration: {},
      hourlyMultipliers: {},
      patternInsights: {},
      windEventPatterns: {},
    };
    
    for (const [key, correlation] of Object.entries(indicatorLearning)) {
      newWeights.indicators[key] = {
        weight: correlation.kiteablePredictionRate * correlation.confidence,
        speedMultiplier: correlation.avgSpeedRatio,
        reliability: correlation.speedCorrelation,
      };
    }
    
    for (const [bucket, data] of Object.entries(errorAnalysis.probabilityBuckets)) {
      if (data.predicted > 5) {
        const expectedRate = (parseInt(bucket.split('-')[0]) + parseInt(bucket.split('-')[1])) / 200;
        const actualRate = data.actualRate;
        newWeights.probabilityCalibration[bucket] = actualRate / (expectedRate || 0.01);
      }
    }
    
    for (const [hour, data] of Object.entries(errorAnalysis.hourlyAccuracy)) {
      if (data.total > 3) {
        const avgAccuracy = data.sumAccuracy / data.total;
        newWeights.hourlyMultipliers[hour] = avgAccuracy / 100;
      }
    }
    
    // ─── USE DISCOVERED PATTERNS (previously ignored!) ─────────
    if (patterns && patterns.length > 0) {
      const peakHourPattern = patterns.find(p => p.type === 'peak_hour');
      if (peakHourPattern && peakHourPattern.confidence > 0.3) {
        newWeights.patternInsights.peakHour = peakHourPattern.value;
        newWeights.patternInsights.peakHourConfidence = peakHourPattern.confidence;
        const ph = String(peakHourPattern.value);
        newWeights.hourlyMultipliers[ph] = Math.max(
          newWeights.hourlyMultipliers[ph] || 0.5,
          0.7 + peakHourPattern.confidence * 0.3
        );
      }

      const windTypePattern = patterns.find(p => p.type === 'dominant_wind_type');
      if (windTypePattern && windTypePattern.confidence > 0.3) {
        newWeights.patternInsights.dominantWindType = windTypePattern.value;
        newWeights.patternInsights.dominantWindTypeConfidence = windTypePattern.confidence;
      }

      const sustainedNorth = patterns.filter(p => p.type === 'sustained_north_flow');
      const sustainedThermal = patterns.filter(p => p.type === 'sustained_thermal');
      if (sustainedNorth.length > 0) {
        const nfAvgDuration = sustainedNorth.reduce((s, p) => s + p.value, 0) / sustainedNorth.length;
        const nfCount = sustainedNorth.length;
        const nfStartHour = sustainedNorth[0]?.startHour ?? 8;
        const nfBias = Math.min(15, (nfCount - 3) * 2);
        const nfConfidence = Math.min(1, nfCount / 10);
        const nfHourlyBias = {};
        for (let h = Math.max(0, nfStartHour - 1); h <= Math.min(23, nfStartHour + Math.round(nfAvgDuration)); h++) {
          nfHourlyBias[h] = nfBias * 0.5;
        }
        newWeights.windEventPatterns.north_flow = {
          bias: nfBias,
          confidenceBoost: nfConfidence,
          hourlyBias: nfHourlyBias,
        };
      }
      if (sustainedThermal.length > 0) {
        const thAvgDuration = sustainedThermal.reduce((s, p) => s + p.value, 0) / sustainedThermal.length;
        const thCount = sustainedThermal.length;
        const thBias = Math.min(15, (thCount - 3) * 2);
        const thConfidence = Math.min(1, thCount / 10);
        const thHourlyBias = {};
        for (let h = 10; h <= Math.min(23, 10 + Math.round(thAvgDuration)); h++) {
          thHourlyBias[h] = thBias * 0.5;
        }
        newWeights.windEventPatterns.thermal = {
          bias: thBias,
          confidenceBoost: thConfidence,
          hourlyBias: thHourlyBias,
        };
      }

      // Glass window patterns (boating/paddling)
      const sustainedGlass = patterns.filter(p => p.type === 'sustained_glass');
      if (sustainedGlass.length > 0) {
        const avgDuration = sustainedGlass.reduce((s, p) => s + p.value, 0) / sustainedGlass.length;
        const avgStart = sustainedGlass.reduce((s, p) => s + (p.startHour ?? 6), 0) / sustainedGlass.length;
        newWeights.windEventPatterns.glass = {
          avgDuration: Math.round(avgDuration),
          typicalStart: Math.round(avgStart),
          count: sustainedGlass.length,
          confidence: Math.min(1, sustainedGlass.length / 10),
        };
      }

      // Soarable window patterns (paragliding)
      const sustainedSoarable = patterns.filter(p => p.type === 'sustained_soarable');
      if (sustainedSoarable.length > 0) {
        const avgDuration = sustainedSoarable.reduce((s, p) => s + p.value, 0) / sustainedSoarable.length;
        newWeights.windEventPatterns.soarable = {
          avgDuration: Math.round(avgDuration),
          count: sustainedSoarable.length,
          confidence: Math.min(1, sustainedSoarable.length / 10),
        };
      }

      console.log(`Patterns applied: ${patterns.length} discovered, peak hour: ${peakHourPattern?.value ?? '?'}, dominant: ${windTypePattern?.value ?? '?'}, glass: ${sustainedGlass.length}, soarable: ${sustainedSoarable.length}`);
    }

    // ─── WIND TYPE WEIGHT ADJUSTMENT ──────────────────────────
    // Merge thermal + thermal_cycle for combined accuracy
    const thermalAcc = errorAnalysis.windTypeAccuracy.thermal;
    const thermalCycleAcc = errorAnalysis.windTypeAccuracy.thermal_cycle;
    const thermalTotal = thermalAcc.total + thermalCycleAcc.total;
    const thermalCorrect = thermalAcc.correct + thermalCycleAcc.correct;

    if (thermalTotal > 5) {
      const rate = thermalCorrect / thermalTotal;
      const target = currentWeights.thermalWeight * (0.5 + rate * 0.5);
      newWeights.thermalWeight = currentWeights.thermalWeight + (target - currentWeights.thermalWeight) * lerpRate;
    }

    // Merge north_flow + frontal_passage + post_frontal + postfrontal
    const nfAcc = errorAnalysis.windTypeAccuracy.north_flow;
    const fpAcc = errorAnalysis.windTypeAccuracy.frontal_passage;
    const pfAcc = errorAnalysis.windTypeAccuracy.post_frontal;
    const pfAcc2 = errorAnalysis.windTypeAccuracy.postfrontal;
    const northTotal = nfAcc.total + fpAcc.total + pfAcc.total + pfAcc2.total;
    const northCorrect = nfAcc.correct + fpAcc.correct + pfAcc.correct + pfAcc2.correct;

    if (northTotal > 5) {
      const rate = northCorrect / northTotal;
      const target = currentWeights.pressureWeight * (0.5 + rate * 0.5);
      newWeights.pressureWeight = currentWeights.pressureWeight + (target - currentWeights.pressureWeight) * lerpRate;
    }

    // Paragliding weight: adjust based on PG-specific accuracy
    const pgAcc = errorAnalysis.windTypeAccuracy.paragliding;
    const pgNorthAcc = errorAnalysis.windTypeAccuracy.paragliding_north;
    const pgSouthAcc = errorAnalysis.windTypeAccuracy.paragliding_south;
    const pgTotal = pgAcc.total + pgNorthAcc.total + pgSouthAcc.total;
    const pgCorrect = pgAcc.correct + pgNorthAcc.correct + pgSouthAcc.correct;
    if (pgTotal > 3) {
      const pgRate = pgCorrect / pgTotal;
      if (!newWeights.windEventPatterns) newWeights.windEventPatterns = {};
      newWeights.windEventPatterns.paraglidingAccuracy = pgRate;
      newWeights.windEventPatterns.paraglidingNorthRate = pgNorthAcc.total > 0 ? pgNorthAcc.correct / pgNorthAcc.total : null;
    }

    // Calm/glass combined
    const calmAcc = errorAnalysis.windTypeAccuracy.calm;
    const glassAcc = errorAnalysis.windTypeAccuracy.glass;
    const calmTotal = calmAcc.total + glassAcc.total;
    const calmCorrect = calmAcc.correct + glassAcc.correct;
    if (calmTotal > 5) {
      const calmRate = calmCorrect / calmTotal;
      if (!newWeights.windEventPatterns) newWeights.windEventPatterns = {};
      newWeights.windEventPatterns.glassAccuracy = calmRate;
    }

    // ─── CONDITION-SPECIFIC PRESSURE GRADIENT ADJUSTMENT ─────
    const { conditionErrors } = errorAnalysis;
    if (conditionErrors.highPressureGradient.length >= 3) {
      const avgHigh = conditionErrors.highPressureGradient.reduce((s, v) => s + v, 0) / conditionErrors.highPressureGradient.length;
      if (avgHigh < 50) {
        newWeights.pressureWeight = Math.min(0.55, newWeights.pressureWeight + 0.03 * lerpRate);
      }
    }
    if (conditionErrors.lowPressureGradient.length >= 3) {
      const avgLow = conditionErrors.lowPressureGradient.reduce((s, v) => s + v, 0) / conditionErrors.lowPressureGradient.length;
      if (avgLow < 50) {
        newWeights.thermalWeight = Math.min(0.55, newWeights.thermalWeight + 0.03 * lerpRate);
      }
    }

    // ─── ACTIVITY-SPECIFIC ACCURACY RATES ──────────────────────
    const actAcc = errorAnalysis.activityAccuracy;
    newWeights.activityCalibration = {};
    for (const [act, data] of Object.entries(actAcc)) {
      if (data.total >= 5) {
        const rate = data.good / data.total;
        newWeights.activityCalibration[act] = {
          hitRate: rate,
          samples: data.total,
          calibrationFactor: rate > 0.01 ? rate / 0.5 : 1.0,
        };
      }
    }

    // ─── PER-LOCATION BIAS from user feedback ─────────────────
    // Users report actual wind speeds they experienced at each spot.
    // Compare against what the model predicted to get per-spot corrections.
    newWeights.locationBias = {};
    const locFeedback = feedbackInsights?.locationFeedback;
    if (locFeedback) {
      for (const [locId, data] of Object.entries(locFeedback)) {
        if (data.count >= 3 && data.speeds.length >= 3) {
          const avgReported = data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length;
          const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
          // Positive bias = model underpredicts for this spot, negative = overpredicts
          const spotBias = avgReported - (errorAnalysis.avgPredictedSpeed || avgReported);
          newWeights.locationBias[locId] = {
            speedBias: Math.round(spotBias * 10) / 10,
            avgRating: Math.round(avgRating * 10) / 10,
            samples: data.count,
          };
        }
      }
    }

    // Derive activity-specific weight sets from the same learning data.
    this._activityWeights = {
      paragliding: {
        ...newWeights,
        activity: 'paragliding',
        speedBiasCorrection: newWeights.speedBiasCorrection * 0.8,
      },
      boating: {
        ...newWeights,
        activity: 'boating',
        speedBiasCorrection: newWeights.speedBiasCorrection,
      },
      fishing: {
        ...newWeights,
        activity: 'fishing',
        speedBiasCorrection: newWeights.speedBiasCorrection * 0.5,
      },
    };
    
    return newWeights;
  }

  // =========================================
  // WEIGHT MANAGEMENT
  // =========================================

  getDefaultWeights() {
    return {
      version: 'default',
      pressureWeight: 0.40,
      thermalWeight: 0.40,
      convergenceWeight: 0.20,
      speedBiasCorrection: 0,
      indicators: {},
      probabilityCalibration: {},
      hourlyMultipliers: {},
      source: 'hardcoded',
    };
  }

  async loadCurrentWeights() {
    try {
      const tx = this.db.transaction(STORES.MODEL_WEIGHTS, 'readonly');
      const store = tx.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.get('current');
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const stored = request.result;
          
          if (stored && stored.version !== 'default') {
            // Live-learned weights exist — use them (they're more current)
            this.currentWeights = stored;
            console.log('Loaded live-learned weights v' + stored.version +
              ' (' + (stored.basedOnSamples || '?') + ' samples)');
          } else {
            // No live weights yet — bootstrap from historical backtest
            this.currentWeights = this._getBootstrapWeights();
            console.log('Bootstrapping with historically-trained weights (' +
              trainedWeightsData._meta.samples + ' samples, ' +
              trainedWeightsData._meta.trainedAccuracy + ' accuracy)');
          }
          
          resolve(this.currentWeights);
        };
        request.onerror = () => {
          this.currentWeights = this._getBootstrapWeights();
          resolve(this.currentWeights);
        };
      });
    } catch (_e) {
      this.currentWeights = this._getBootstrapWeights();
      return this.currentWeights;
    }
  }

  _getBootstrapWeights() {
    if (trainedWeightsData?.weights) {
      return {
        ...trainedWeightsData.weights,
        id: 'current',
        source: 'historical-backtest',
      };
    }
    return this.getDefaultWeights();
  }

  /**
   * Reset all learned weights and accuracy data.
   * Used when data sources change (e.g. Synoptic restored) so the engine
   * recalibrates on the new, more accurate inputs instead of old biases.
   * Returns the bootstrap weights that the system falls back to.
   */
  async resetWeights(reason = 'manual') {
    await this.initialize();

    const stores = [STORES.MODEL_WEIGHTS, STORES.ACCURACY, STORES.PATTERNS];
    for (const storeName of stores) {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        await new Promise((resolve) => {
          tx.oncomplete = resolve;
          tx.onerror = resolve;
        });
      } catch (_e) { /* store may not exist yet */ }
    }

    this.currentWeights = this._getBootstrapWeights();
    this._pushWeightsToPredictor();

    console.log(`Learning weights reset (reason: ${reason}). Recalibration will begin with next data cycle.`);
    return this.currentWeights;
  }

  async saveWeights(weights) {
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORES.MODEL_WEIGHTS, 'readwrite');
      const store = tx.objectStore(STORES.MODEL_WEIGHTS);

      store.put({ ...weights, id: 'current' });
      store.put({ ...weights, id: `v${weights.version}` });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    this.currentWeights = weights;

    this._pushWeightsToPredictor();
    console.log('Weights v' + weights.version + ' pushed to thermal prediction engine');

    if (this._activityWeights) {
      for (const [activity, actWeights] of Object.entries(this._activityWeights)) {
        for (const cb of this._weightListeners) {
          try { cb(actWeights); } catch (e) {
            console.error(`Error pushing ${activity} weights:`, e);
          }
        }
      }
      console.log('Activity weights pushed: paragliding, boating, fishing');
    }
  }

  // =========================================
  // HELPER METHODS
  // =========================================

  async addRecord(storeName, record) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePrediction(id, updates) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readwrite');
    const store = tx.objectStore(STORES.PREDICTIONS);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          Object.assign(record, updates);
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve(record);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getUnverifiedPredictions(olderThan, lookbackStart = null) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readonly');
    const store = tx.objectStore(STORES.PREDICTIONS);
    const index = store.index('timestamp');

    const lowerBound = lookbackStart || new Date(olderThan.getTime() - 24 * 60 * 60 * 1000);
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.bound(lowerBound.toISOString(), olderThan.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.verified) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getActualsForTimeRange(lakeId, start, end) {
    const tx = this.db.transaction(STORES.ACTUALS, 'readonly');
    const store = tx.objectStore(STORES.ACTUALS);
    const index = store.index('timestamp');
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.lakeId === lakeId) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async recordAccuracy(lakeId, date, accuracy) {
    return this.addRecord(STORES.ACCURACY, {
      lakeId,
      date,
      timestamp: new Date().toISOString(),
      ...accuracy,
    });
  }

  async getRecentAccuracy(days) {
    const tx = this.db.transaction(STORES.ACCURACY, 'readonly');
    const store = tx.objectStore(STORES.ACCURACY);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getVerifiedPredictions(days) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readonly');
    const store = tx.objectStore(STORES.PREDICTIONS);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.verified) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getAllIndicatorData() {
    const tx = this.db.transaction(STORES.INDICATORS, 'readonly');
    const store = tx.objectStore(STORES.INDICATORS);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async getAllActuals(days) {
    const tx = this.db.transaction(STORES.ACTUALS, 'readonly');
    const store = tx.objectStore(STORES.ACTUALS);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Find the closest actual reading for a given station near a target time.
   * Used by DataCollector to look up historical indicator data for lead-time correlation.
   */
  async getActualsForStationNear(stationId, targetTime, toleranceMinutes = 15) {
    const tx = this.db.transaction(STORES.ACTUALS, 'readonly');
    const store = tx.objectStore(STORES.ACTUALS);
    const index = store.index('timestamp');

    const lower = new Date(targetTime.getTime() - toleranceMinutes * 60 * 1000);
    const upper = new Date(targetTime.getTime() + toleranceMinutes * 60 * 1000);
    const range = IDBKeyRange.bound(lower.toISOString(), upper.toISOString());

    return new Promise((resolve) => {
      let best = null;
      let bestDiff = Infinity;
      const targetMs = targetTime.getTime();

      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const rec = cursor.value;
          if (rec.stationId === stationId) {
            const diff = Math.abs(new Date(rec.timestamp).getTime() - targetMs);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = rec;
            }
          }
          cursor.continue();
        } else {
          resolve(best);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  // Math helpers
  directionsMatch(dir1, dir2, tolerance = 30) {
    if (dir1 == null || dir2 == null) return false;
    let diff = Math.abs(dir1 - dir2);
    if (diff > 180) diff = 360 - diff;
    return diff <= tolerance;
  }

  directionDifference(dir1, dir2) {
    if (dir1 == null || dir2 == null) return null;
    let diff = Math.abs(dir1 - dir2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  averageDirection(directions) {
    if (directions.length === 0) return null;
    
    let sinSum = 0;
    let cosSum = 0;
    
    for (const dir of directions) {
      const rad = dir * Math.PI / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    
    const avgRad = Math.atan2(sinSum, cosSum);
    let avgDeg = avgRad * 180 / Math.PI;
    if (avgDeg < 0) avgDeg += 360;
    
    return Math.round(avgDeg);
  }

  getDominantDirection(actuals) {
    const validDirs = actuals.filter(a => a.windDirection != null).map(a => a.windDirection);
    return this.averageDirection(validDirs);
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length < 3) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // =========================================
  // PUBLIC API
  // =========================================

  /**
   * Get current model accuracy stats
   */
  async getAccuracyStats() {
    await this.initialize();
    
    const recent = await this.getRecentAccuracy(30);
    
    if (recent.length === 0) {
      return {
        totalPredictions: 0,
        avgAccuracy: null,
        trend: 'insufficient_data',
      };
    }
    
    const avgAccuracy = recent.reduce((sum, r) => sum + (r.overallScore || 0), 0) / recent.length;
    
    // Calculate trend (compare last 7 days to previous 7 days)
    const lastWeek = recent.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      return (now - d) / (1000 * 60 * 60 * 24) <= 7;
    });
    const previousWeek = recent.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      const daysAgo = (now - d) / (1000 * 60 * 60 * 24);
      return daysAgo > 7 && daysAgo <= 14;
    });
    
    let trend = 'stable';
    if (lastWeek.length > 5 && previousWeek.length > 5) {
      const lastWeekAvg = lastWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / lastWeek.length;
      const prevWeekAvg = previousWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / previousWeek.length;
      
      if (lastWeekAvg > prevWeekAvg + 5) trend = 'improving';
      else if (lastWeekAvg < prevWeekAvg - 5) trend = 'declining';
    }
    
    return {
      totalPredictions: recent.length,
      avgAccuracy: Math.round(avgAccuracy),
      trend,
      lastWeekAccuracy: lastWeek.length > 0 
        ? Math.round(lastWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / lastWeek.length)
        : null,
    };
  }

  /**
   * Get learned weights for use in predictions
   */
  async getLearnedWeights() {
    await this.initialize();
    return this.currentWeights || this.getDefaultWeights();
  }

  async getCurrentWeights() {
    return this.getLearnedWeights();
  }

  /**
   * Get accuracy stats broken down by location.
   * This is how we track whether Deer Creek and Willard Bay
   * are learning independently from Utah Lake.
   */
  async getLocationAccuracy(days = 30) {
    await this.initialize();
    const recent = await this.getRecentAccuracy(days);

    const byLocation = {};
    for (const record of recent) {
      const loc = record.lakeId || 'unknown';
      if (!byLocation[loc]) {
        byLocation[loc] = { count: 0, sumAccuracy: 0, predictions: 0 };
      }
      byLocation[loc].count++;
      byLocation[loc].sumAccuracy += record.overallScore || 0;
    }

    const result = {};
    for (const [loc, data] of Object.entries(byLocation)) {
      result[loc] = {
        predictions: data.count,
        avgAccuracy: data.count > 0 ? Math.round(data.sumAccuracy / data.count) : null,
      };
    }
    return result;
  }

  /**
   * Get summary for the learning dashboard — includes per-location breakdown
   * and per-activity quality tracking.
   */
  async getExtendedStats() {
    await this.initialize();

    const [accuracy, locationAccuracy, weights] = await Promise.all([
      this.getAccuracyStats(),
      this.getLocationAccuracy(30),
      this.getLearnedWeights(),
    ]);

    return {
      ...accuracy,
      locationBreakdown: locationAccuracy,
      weightsVersion: weights?.version || 'default',
      weightsSource: weights?.source || 'unknown',
      basedOnSamples: weights?.basedOnSamples || 0,
      isBootstrapped: weights?.source === 'historical-backtest',
      hasLiveLearnedWeights: weights?.source !== 'historical-backtest' && weights?.version !== 'default',
    };
  }

  /**
   * Export all data for backup/analysis
   */
  async exportData() {
    await this.initialize();
    
    const predictions = await this.getVerifiedPredictions(365);
    const accuracy = await this.getRecentAccuracy(365);
    const indicators = await this.getAllIndicatorData();
    const weights = this.currentWeights;
    
    return {
      exportedAt: new Date().toISOString(),
      predictions,
      accuracy,
      indicators,
      weights,
    };
  }
}

// ══════════════════════════════════════════════════════════════
// TRIPLE VALIDATION — Window Accuracy Grading
//
// Pure math: compares predicted time windows (from SportIntelligenceEngine)
// against actual sensor observations for the same hours.
// Used by both the client learning loop and the server cron.
// ══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} PredictedWindow
 * @property {string} locationId
 * @property {string} sportType
 * @property {string} windowStart  - ISO timestamp or parseable date string
 * @property {string} windowEnd    - ISO timestamp or parseable date string
 * @property {number} durationHours
 * @property {string} peakTime     - ISO timestamp
 * @property {string} peakCondition - e.g. "18 mph"
 */

/**
 * @typedef {Object} Observation
 * @property {string} timestamp   - ISO timestamp
 * @property {number} windSpeed
 * @property {number} [windGust]
 * @property {number} [windDirection]
 * @property {number} [temperature]
 */

/**
 * @typedef {Object} WindowScore
 * @property {string} locationId
 * @property {string} sportType
 * @property {number} startTimeDelta   - hours (actual onset − predicted start)
 * @property {number} durationDelta    - hours (actual duration − predicted duration)
 * @property {number} peakMagnitudeError - fractional (|actual − predicted| / predicted)
 * @property {number} compositeScore   - 0..100 overall accuracy
 * @property {string} verdict          - 'accurate' | 'shifted' | 'busted'
 * @property {Object} details
 */

function parseHour(ts) {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function extractPeakSpeed(peakCondition) {
  const m = String(peakCondition).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Grade predicted time windows against actual sensor observations.
 *
 * @param {PredictedWindow[]} predictedWindows - windows from SportIntelligenceEngine
 * @param {Observation[]} actualObservations - hourly (or sub-hourly) sensor data
 * @param {Object} [options]
 * @param {number} [options.speedThreshold=8] - min speed to consider "active"
 * @param {number} [options.peakMargin=0.15] - acceptable fractional peak error
 * @returns {WindowScore[]}
 */
export function evaluateHistoricalWindows(predictedWindows, actualObservations, options = {}) {
  const speedThreshold = options.speedThreshold ?? 8;
  const peakMargin = options.peakMargin ?? 0.15;

  if (!predictedWindows?.length || !actualObservations?.length) return [];

  const sorted = [...actualObservations].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const scores = [];

  for (const win of predictedWindows) {
    const predStart = parseHour(win.windowStart);
    const predEnd = parseHour(win.windowEnd);
    if (!predStart || !predEnd) continue;

    const predDuration = win.durationHours ?? ((predEnd - predStart) / 3600000);
    const predictedPeak = extractPeakSpeed(win.peakCondition);

    // Extract observations within a generous window (±3 hrs of predicted range)
    const bufferMs = 3 * 3600000;
    const relevantObs = sorted.filter(o => {
      const t = new Date(o.timestamp).getTime();
      return t >= predStart.getTime() - bufferMs && t <= predEnd.getTime() + bufferMs;
    });

    if (relevantObs.length === 0) {
      scores.push({
        locationId: win.locationId,
        sportType: win.sportType,
        startTimeDelta: NaN,
        durationDelta: NaN,
        peakMagnitudeError: NaN,
        compositeScore: 0,
        verdict: 'busted',
        details: { reason: 'No observations available for this window' },
      });
      continue;
    }

    // Find actual "active" period (contiguous hours above threshold)
    const activeObs = relevantObs.filter(o => (o.windSpeed ?? 0) >= speedThreshold);
    const actualStart = activeObs.length > 0 ? new Date(activeObs[0].timestamp) : null;
    const actualEnd = activeObs.length > 0 ? new Date(activeObs[activeObs.length - 1].timestamp) : null;
    const actualDuration = actualStart && actualEnd
      ? Math.max(1, Math.round((actualEnd - actualStart) / 3600000))
      : 0;

    // Actual peak speed
    const actualPeak = Math.max(...relevantObs.map(o => o.windSpeed ?? 0));

    // ── Metric 1: Start Time Delta (hours) ──
    const startTimeDelta = actualStart
      ? (actualStart.getTime() - predStart.getTime()) / 3600000
      : NaN;

    // ── Metric 2: Duration Delta (hours) ──
    const durationDelta = actualDuration > 0
      ? actualDuration - predDuration
      : -predDuration;

    // ── Metric 3: Peak Magnitude Error (fractional) ──
    const peakMagnitudeError = predictedPeak > 0
      ? Math.abs(actualPeak - predictedPeak) / predictedPeak
      : (actualPeak > 0 ? 1 : 0);

    // ── Composite Score (0-100) ──
    // Start accuracy: 35 pts. Perfect = 0 delta, lose 10 pts per hour off.
    const startScore = isNaN(startTimeDelta)
      ? 0
      : Math.max(0, 35 - Math.abs(startTimeDelta) * 10);

    // Duration accuracy: 30 pts. Perfect = 0 delta, lose 8 pts per hour off.
    const durationScore = actualDuration > 0
      ? Math.max(0, 30 - Math.abs(durationDelta) * 8)
      : 0;

    // Peak accuracy: 35 pts. Within margin = full, degrade linearly beyond.
    let peakScore;
    if (peakMagnitudeError <= peakMargin) {
      peakScore = 35;
    } else {
      peakScore = Math.max(0, 35 - ((peakMagnitudeError - peakMargin) / 0.5) * 35);
    }

    const compositeScore = Math.round(startScore + durationScore + peakScore);

    const verdict = compositeScore >= 75
      ? 'accurate'
      : compositeScore >= 40
        ? 'shifted'
        : 'busted';

    scores.push({
      locationId: win.locationId,
      sportType: win.sportType,
      startTimeDelta: isNaN(startTimeDelta) ? null : Math.round(startTimeDelta * 10) / 10,
      durationDelta: Math.round(durationDelta * 10) / 10,
      peakMagnitudeError: Math.round(peakMagnitudeError * 1000) / 1000,
      compositeScore,
      verdict,
      predictedPeak,
      actualPeak: Math.round(actualPeak * 10) / 10,
      actualDurationHours: actualDuration,
      details: {
        startScore: Math.round(startScore),
        durationScore: Math.round(durationScore),
        peakScore: Math.round(peakScore),
        observationCount: relevantObs.length,
        activeHours: actualDuration,
      },
    });
  }

  return scores;
}

// Singleton instance
export const learningSystem = new LearningSystem();
export default learningSystem;
