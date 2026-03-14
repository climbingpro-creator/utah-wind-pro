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
  }

  /**
   * Register a callback that fires whenever weights are updated.
   * Returns an unsubscribe function.
   */
  onWeightsUpdated(callback) {
    this._weightListeners.push(callback);
    // Immediately fire with current weights if available
    if (this.currentWeights) {
      try { callback(this.currentWeights); } catch (e) { /* ignore */ }
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
   * Record actual weather data (called every 15 minutes)
   */
  async recordActual(lakeId, stationId, data) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      minute: now.getMinutes(),
      lakeId,
      stationId,
      
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
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Get unverified predictions from 1-2 hours ago
    const predictions = await this.getUnverifiedPredictions(twoHoursAgo);
    
    for (const prediction of predictions) {
      // Get actual data for the prediction time window
      const actuals = await this.getActualsForTimeRange(
        prediction.lakeId,
        new Date(prediction.timestamp),
        new Date(new Date(prediction.timestamp).getTime() + 60 * 60 * 1000) // 1 hour window
      );

      if (actuals.length === 0) continue;

      // Calculate accuracy
      const accuracy = this.calculateAccuracy(prediction, actuals);
      
      // Update prediction with verification
      await this.updatePrediction(prediction.id, {
        verified: true,
        actual: this.summarizeActuals(actuals),
        accuracy,
      });

      // Record accuracy for trending
      await this.recordAccuracy(prediction.lakeId, prediction.date, accuracy);
    }

    // Trigger learning if we have enough new data
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
      
      // Wind type accuracy
      predictedWindType: pred.windType,
      actualWindType: actual.dominantWindType,
      windTypeCorrect: pred.windType === actual.dominantWindType,
      
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

    // Determine dominant wind type
    let dominantWindType = 'calm';
    if (northFlowCount > actuals.length * 0.5) {
      dominantWindType = 'north_flow';
    } else if (seThermalCount > actuals.length * 0.5) {
      dominantWindType = 'thermal';
    } else if (speeds.length > 0 && speeds.reduce((a, b) => a + b, 0) / speeds.length >= 8) {
      dominantWindType = 'other';
    }

    return {
      count: actuals.length,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
      minSpeed: speeds.length > 0 ? Math.min(...speeds) : null,
      avgDirection: directions.length > 0 ? this.averageDirection(directions) : null,
      kiteablePct: Math.round(kiteableCount / actuals.length * 100),
      foilKiteablePct: Math.round(foilKiteableCount / actuals.length * 100),
      twinTipKiteablePct: Math.round(twinTipKiteableCount / actuals.length * 100),
      dominantWindType,
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
    
    if (recentAccuracy.length < 10) {
      console.log('Not enough data for learning yet:', recentAccuracy.length, 'records (need 10)');
      return;
    }

    const avgAccuracy = recentAccuracy.reduce((sum, r) => sum + (r.overallScore || 0), 0) / recentAccuracy.length;
    
    console.log('Current model accuracy:', avgAccuracy.toFixed(1) + '% across', recentAccuracy.length, 'records');

    // Always recalibrate — even high accuracy benefits from refinement.
    // More aggressive learning when accuracy is low, fine-tuning when high.
    if (avgAccuracy < 70) {
      console.log('Accuracy below 70% — aggressive recalibration...');
    } else if (avgAccuracy < 85) {
      console.log('Accuracy moderate — standard recalibration...');
    } else {
      console.log('Accuracy good — fine-tuning weights...');
    }

    await this.learnFromData();
  }

  /**
   * Learn from accumulated data and adjust model weights
   */
  async learnFromData() {
    await this.initialize();

    console.log('Starting learning cycle...');

    // 1. Analyze indicator correlations
    const indicatorLearning = await this.learnIndicatorCorrelations();
    
    // 2. Analyze prediction errors
    const errorAnalysis = await this.analyzeErrors();
    
    // 3. Discover new patterns
    const patterns = await this.discoverPatterns();
    
    // 4. Calculate new weights
    const newWeights = this.calculateNewWeights(indicatorLearning, errorAnalysis, patterns);
    
    // 5. Save new weights
    await this.saveWeights(newWeights);
    
    console.log('Learning cycle complete. New weights:', newWeights);
    
    return newWeights;
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
      
      // Wind type accuracy
      windTypeAccuracy: {
        thermal: { correct: 0, total: 0 },
        north_flow: { correct: 0, total: 0 },
        calm: { correct: 0, total: 0 },
      },
      
      // Time of day patterns
      hourlyAccuracy: {},
      
      // Condition-specific errors
      conditionErrors: {
        highPressureGradient: [],
        lowPressureGradient: [],
        strongIndicator: [],
        weakIndicator: [],
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
      if (pred.conditions.pressureGradient > 2) {
        analysis.conditionErrors.highPressureGradient.push(pred.accuracy.overallScore);
      } else if (pred.conditions.pressureGradient < 1) {
        analysis.conditionErrors.lowPressureGradient.push(pred.accuracy.overallScore);
      }
    }
    
    // Calculate averages
    if (predictions.length > 0) {
      analysis.avgOverallAccuracy /= predictions.length;
      analysis.speedBias /= predictions.length;
    }
    
    // Calculate probability calibration
    for (const [bucket, data] of Object.entries(analysis.probabilityBuckets)) {
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
  calculateNewWeights(indicatorLearning, errorAnalysis, patterns) {
    const currentWeights = this.currentWeights || this.getDefaultWeights();
    
    const newWeights = {
      version: Date.now(),
      createdAt: new Date().toISOString(),
      basedOnSamples: errorAnalysis.totalPredictions,
      
      pressureWeight: currentWeights.pressureWeight,
      thermalWeight: currentWeights.thermalWeight,
      convergenceWeight: currentWeights.convergenceWeight,
      
      indicators: {},
      speedBiasCorrection: -errorAnalysis.speedBias,
      probabilityCalibration: {},
      hourlyMultipliers: {},
    };
    
    for (const [key, correlation] of Object.entries(indicatorLearning)) {
      newWeights.indicators[key] = {
        weight: correlation.kiteablePredictionRate * correlation.confidence,
        speedMultiplier: correlation.avgSpeedRatio,
        reliability: correlation.speedCorrelation,
      };
    }
    
    for (const [bucket, data] of Object.entries(errorAnalysis.probabilityBuckets)) {
      if (data.predicted > 10) {
        const expectedRate = (parseInt(bucket.split('-')[0]) + parseInt(bucket.split('-')[1])) / 200;
        const actualRate = data.actualRate;
        newWeights.probabilityCalibration[bucket] = actualRate / expectedRate;
      }
    }
    
    for (const [hour, data] of Object.entries(errorAnalysis.hourlyAccuracy)) {
      if (data.total > 5) {
        const avgAccuracy = data.sumAccuracy / data.total;
        newWeights.hourlyMultipliers[hour] = avgAccuracy / 100;
      }
    }
    
    const thermalAccuracy = errorAnalysis.windTypeAccuracy.thermal;
    const northFlowAccuracy = errorAnalysis.windTypeAccuracy.north_flow;
    
    if (thermalAccuracy.total > 10) {
      const rate = thermalAccuracy.correct / thermalAccuracy.total;
      newWeights.thermalWeight = currentWeights.thermalWeight * (0.5 + rate * 0.5);
    }
    
    if (northFlowAccuracy.total > 10) {
      const rate = northFlowAccuracy.correct / northFlowAccuracy.total;
      newWeights.pressureWeight = currentWeights.pressureWeight * (0.5 + rate * 0.5);
    }

    // Derive activity-specific weight sets from the same learning data.
    // These get pushed through onWeightsUpdated and recognized by each predictor.
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
    } catch (e) {
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

  async saveWeights(weights) {
    const tx = this.db.transaction(STORES.MODEL_WEIGHTS, 'readwrite');
    const store = tx.objectStore(STORES.MODEL_WEIGHTS);
    
    // Save as current
    await store.put({ ...weights, id: 'current' });
    
    // Also save historical version
    await store.put({ ...weights, id: `v${weights.version}` });
    
    this.currentWeights = weights;

    // Push base weights to ThermalPredictor / DataNormalizer
    this._pushWeightsToPredictor();
    console.log('Weights v' + weights.version + ' pushed to thermal prediction engine');

    // Push activity-specific weights so paragliding/boating/fishing predictors receive them
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

  async getUnverifiedPredictions(olderThan) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readonly');
    const store = tx.objectStore(STORES.PREDICTIONS);
    const index = store.index('timestamp');
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.upperBound(olderThan.toISOString());
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

// Singleton instance
export const learningSystem = new LearningSystem();
export default learningSystem;
