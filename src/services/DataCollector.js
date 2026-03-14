/**
 * DATA COLLECTOR
 * 
 * Automated service that continuously collects weather data and feeds it
 * to the learning system. This runs in the background while the app is open.
 * 
 * Collection Schedule:
 * - Every 15 minutes: Record actual weather data from all stations
 * - Every hour: Record predictions and verify past predictions
 * - Every 6 hours: Check indicator correlations
 * - Every 24 hours: Trigger learning cycle if enough data
 */

import { learningSystem } from './LearningSystem';
import { weatherService } from './WeatherService';
import { LakeState } from './DataNormalizer';
import { LAKE_CONFIGS, getAllStationIds } from '../config/lakeStations';
import { setLearnedWeights } from './ThermalPredictor';
import { setParaglidingLearnedWeights } from './ParaglidingPredictor';
import { setBoatingLearnedWeights } from './BoatingPredictor';
import { setFishingLearnedWeights } from './FishingPredictor';
import { setWindFieldLearnedWeights } from './WindFieldEngine';
import { scoreSessionForActivity } from './ActivityScoring';

// Schedule work during idle periods to avoid blocking the UI thread
function scheduleIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 10000 });
  } else {
    setTimeout(fn, 100);
  }
}

class DataCollector {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
    this.lastCollection = {};
    this.collectionStats = {
      actualsCollected: 0,
      predictionsRecorded: 0,
      verificationsRun: 0,
      learningCyclesRun: 0,
      lastError: null,
    };
  }

  /**
   * Start the data collection service
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('Starting Data Collector for Learning System...');
    
    await learningSystem.initialize();
    this.isRunning = true;

    // Subscribe all predictors to weight updates — closes the learning loop
    this._unsubWeights = learningSystem.onWeightsUpdated((weights) => {
      if (weights?.activity === 'paragliding') {
        setParaglidingLearnedWeights(weights);
      } else if (weights?.activity === 'boating') {
        setBoatingLearnedWeights(weights);
      } else if (weights?.activity === 'fishing') {
        setFishingLearnedWeights(weights);
      } else {
        setLearnedWeights(weights);
        setWindFieldLearnedWeights(weights);
      }
    });

    // Collect actuals every 15 minutes (idle-scheduled)
    this.intervals.push(
      setInterval(() => scheduleIdle(() => this.collectActuals()), 15 * 60 * 1000)
    );

    // Record predictions and verify every hour (idle-scheduled)
    this.intervals.push(
      setInterval(() => scheduleIdle(() => this.recordAndVerify()), 60 * 60 * 1000)
    );

    // Check indicator correlations every 6 hours (idle-scheduled)
    this.intervals.push(
      setInterval(() => scheduleIdle(() => this.collectIndicatorData()), 6 * 60 * 60 * 1000)
    );

    // Trigger learning check every 24 hours (idle-scheduled)
    this.intervals.push(
      setInterval(() => scheduleIdle(() => this.triggerLearning()), 24 * 60 * 60 * 1000)
    );

    // Delay initial collection to not block app startup
    scheduleIdle(() => this.collectActuals());
    
    console.log('✅ Data Collector started');
  }

  /**
   * Stop the data collection service
   */
  stop() {
    console.log('Stopping Data Collector...');
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    if (this._unsubWeights) {
      this._unsubWeights();
      this._unsubWeights = null;
    }
  }

  /**
   * Collect actual weather data from all stations
   */
  async collectActuals() {
    if (!this.isRunning) return;

    console.log('📊 Collecting actual weather data...');

    try {
      // Collect for each lake
      const lakes = ['utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy', 
                     'utah-lake-vineyard', 'utah-lake-mm19', 'deer-creek', 'willard-bay'];

      for (const lakeId of lakes) {
        const stationIds = getAllStationIds(lakeId);
        
        // Get Synoptic data
        const synopticData = await weatherService.getSynopticStationData(stationIds);
        
        for (const station of synopticData) {
          const wind = {
            speed: station.windSpeed,
            gust: station.windGust,
            direction: station.windDirection,
          };
          const conditions = {
            temperature: station.temperature,
            pressure: station.pressure,
          };

          // Score this observation for each relevant activity
          const activityScores = {
            kiting: scoreSessionForActivity('kiting', wind, conditions),
            sailing: scoreSessionForActivity('sailing', wind, conditions),
            paragliding: scoreSessionForActivity('paragliding', wind, conditions),
            fishing: scoreSessionForActivity('fishing', wind, conditions),
            boating: scoreSessionForActivity('boating', wind),
          };

          await learningSystem.recordActual(lakeId, station.stationId, {
            windSpeed: station.windSpeed,
            windGust: station.windGust,
            windDirection: station.windDirection,
            temperature: station.temperature,
            pressure: station.pressure,
            activityScores,
          });
          
          this.collectionStats.actualsCollected++;
        }
      }

      // Also collect PWS data
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        await learningSystem.recordActual('utah-lake-zigzag', 'PWS', {
          windSpeed: ambientData.windSpeed,
          windGust: ambientData.windGust,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
          pressure: ambientData.pressure,
        });
        this.collectionStats.actualsCollected++;
      }

      this.lastCollection.actuals = new Date().toISOString();
      console.log(`✅ Collected ${this.collectionStats.actualsCollected} actual readings`);

    } catch (error) {
      console.error('Error collecting actuals:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Record current predictions and verify past ones
   */
  async recordAndVerify() {
    if (!this.isRunning) return;

    console.log('🔮 Recording predictions and verifying past ones...');

    try {
      // Record predictions for ALL locations, not just Utah Lake
      const lakes = [
        'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy',
        'utah-lake-vineyard', 'utah-lake-mm19',
        'deer-creek', 'willard-bay',
      ];

      for (const lakeId of lakes) {
        // Get current data
        const data = await weatherService.getDataForLake(lakeId);
        
        // Build lake state (which includes prediction)
        const lakeState = LakeState.fromRawData(lakeId, data.ambient, data.synoptic);
        
        if (lakeState.thermalPrediction) {
          // Record the prediction
          await learningSystem.recordPrediction(lakeId, {
            probability: lakeState.probability,
            windType: lakeState.thermalPrediction.windType,
            expectedSpeed: lakeState.thermalPrediction.expectedSpeed,
            expectedDirection: lakeState.thermalPrediction.direction?.ideal,
            startTime: lakeState.thermalPrediction.startTime,
            foilKiteablePct: lakeState.thermalPrediction.northFlow?.foilKiteablePct 
              || lakeState.thermalPrediction.provoIndicator?.foilKiteablePct,
            twinTipKiteablePct: lakeState.thermalPrediction.northFlow?.twinTipKiteablePct
              || lakeState.thermalPrediction.provoIndicator?.twinTipKiteablePct,
            phase: lakeState.thermalPrediction.phase,
          }, {
            pressureGradient: lakeState.pressure?.gradient,
            thermalDelta: lakeState.thermal?.delta,
            spanishForkWind: lakeState.earlyIndicator ? {
              speed: lakeState.earlyIndicator.windSpeed,
              direction: lakeState.earlyIndicator.windDirection,
            } : null,
            kslcWind: lakeState.kslcStation ? {
              speed: lakeState.kslcStation.windSpeed,
              direction: lakeState.kslcStation.windDirection,
            } : null,
            kpvuWind: lakeState.kpvuStation ? {
              speed: lakeState.kpvuStation.windSpeed,
              direction: lakeState.kpvuStation.windDirection,
            } : null,
            utalpWind: lakeState.utalpStation ? {
              speed: lakeState.utalpStation.windSpeed,
              direction: lakeState.utalpStation.windDirection,
            } : null,
            temperature: lakeState.pws?.temperature,
          });
          
          this.collectionStats.predictionsRecorded++;
        }
      }

      // Verify past predictions
      await learningSystem.verifyPredictions();
      this.collectionStats.verificationsRun++;

      this.lastCollection.predictions = new Date().toISOString();
      console.log(`✅ Recorded ${this.collectionStats.predictionsRecorded} predictions`);

    } catch (error) {
      console.error('Error recording predictions:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Collect indicator correlation data
   */
  async collectIndicatorData() {
    if (!this.isRunning) return;

    console.log('📈 Collecting indicator correlation data...');

    try {
      // Get data from all indicator and target stations
      const indicatorStations = ['KSLC', 'KPVU', 'QSF', 'UTALP', 'UID28'];
      const targetStations = ['FPS', 'PWS', 'KHCR'];
      
      const allStations = [...indicatorStations, ...targetStations];
      const synopticData = await weatherService.getSynopticStationData(allStations);
      
      const stationMap = new Map(synopticData.map(s => [s.stationId, s]));
      
      // Also get PWS
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        stationMap.set('PWS', {
          stationId: 'PWS',
          windSpeed: ambientData.windSpeed,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
        });
      }

      // Record correlations for all location indicator→target pairs
      const indicatorConfigs = [
        // Utah Lake: KSLC/KPVU/QSF/UTALP → FPS/PWS
        { indicator: 'KSLC', target: 'FPS', leadTime: 60 },
        { indicator: 'KSLC', target: 'PWS', leadTime: 60 },
        { indicator: 'KPVU', target: 'FPS', leadTime: 60 },
        { indicator: 'KPVU', target: 'PWS', leadTime: 60 },
        { indicator: 'QSF', target: 'FPS', leadTime: 120 },
        { indicator: 'QSF', target: 'PWS', leadTime: 120 },
        { indicator: 'UTALP', target: 'FPS', leadTime: 30 },
        { indicator: 'UTALP', target: 'PWS', leadTime: 30 },
        // Deer Creek: Arrowhead → Heber / Dam
        { indicator: 'UID28', target: 'KHCR', leadTime: 60 },
        { indicator: 'KPVU', target: 'KHCR', leadTime: 90 },
        // Willard Bay: Hill AFB → Willard
        { indicator: 'KSLC', target: 'KSLC', leadTime: 0 },
        // Paragliding: KSLC → FPS (north side), KPVU → UTALP
        { indicator: 'KSLC', target: 'UTALP', leadTime: 45 },
        { indicator: 'KPVU', target: 'UTALP', leadTime: 45 },
      ];

      for (const config of indicatorConfigs) {
        const indicator = stationMap.get(config.indicator);
        const target = stationMap.get(config.target);
        
        if (indicator && target) {
          await learningSystem.recordIndicator(
            config.indicator,
            config.target,
            {
              speed: indicator.windSpeed,
              direction: indicator.windDirection,
              temperature: indicator.temperature,
            },
            {
              speed: target.windSpeed,
              direction: target.windDirection,
              temperature: target.temperature,
            },
            config.leadTime
          );
        }
      }

      this.lastCollection.indicators = new Date().toISOString();
      console.log('✅ Collected indicator correlation data');

    } catch (error) {
      console.error('Error collecting indicator data:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Trigger the learning cycle
   */
  async triggerLearning() {
    if (!this.isRunning) return;

    console.log('🧠 Triggering learning cycle...');

    try {
      const newWeights = await learningSystem.learnFromData();
      this.collectionStats.learningCyclesRun++;
      
      this.lastCollection.learning = new Date().toISOString();
      console.log('✅ Learning cycle complete');
      
      return newWeights;

    } catch (error) {
      console.error('Error in learning cycle:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Get collection statistics
   */
  getStats() {
    return {
      ...this.collectionStats,
      isRunning: this.isRunning,
      lastCollection: this.lastCollection,
    };
  }

  /**
   * Force a learning cycle (for manual trigger)
   */
  async forceLearning() {
    return this.triggerLearning();
  }

  /**
   * Force data collection (for manual trigger)
   */
  async forceCollection() {
    await this.collectActuals();
    await this.recordAndVerify();
    await this.collectIndicatorData();
  }
}

// Singleton instance
export const dataCollector = new DataCollector();
export default dataCollector;
