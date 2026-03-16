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

    // Subscribe all predictors to weight updates — closes the learning loop.
    // Filter by activity field so each predictor only receives its own weights.
    this._unsubWeights = learningSystem.onWeightsUpdated((weights) => {
      if (!weights) return;
      if (weights.activity === 'paragliding') {
        setParaglidingLearnedWeights(weights);
      } else if (weights.activity === 'boating') {
        setBoatingLearnedWeights(weights);
      } else if (weights.activity === 'fishing') {
        setFishingLearnedWeights(weights);
      } else if (!weights.activity) {
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

    // On startup: run the FULL cycle immediately
    scheduleIdle(() => this.runFullCycle());

    // When the tab regains focus after being hidden, catch up on missed collections
    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.isRunning) {
        const now = Date.now();
        const lastActual = this.lastCollection.actuals
          ? new Date(this.lastCollection.actuals).getTime() : 0;
        if (now - lastActual > 15 * 60 * 1000) {
          console.log('Tab regained focus — catching up on collections');
          scheduleIdle(() => this.collectActuals());
          scheduleIdle(() => this.recordAndVerify());
        }
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
    
    console.log('Data Collector started — full cycle on startup + recurring timers + visibility catch-up');
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
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }

  /**
   * Run the complete learning cycle on every app open.
   * This ensures predictions, verifications, and learning happen
   * even if the user only has the app open for a few minutes.
   */
  async runFullCycle() {
    if (!this.isRunning) return;

    try {
      await this.backfillFromHistory();
      await this.collectActuals();
      await this.recordAndVerify();
      await this.collectIndicatorData();
      await this.triggerLearning();
      console.log('Full startup cycle complete');
    } catch (e) {
      console.error('Startup cycle error (non-fatal):', e.message);
    }
  }

  /**
   * Backfill learning data on startup — two sources:
   * 1. Server-collected data (Vercel cron → Redis, if configured)
   * 2. Synoptic 24hr history (always available as fallback)
   * 
   * This ensures no data gaps even if the app was closed for days.
   */
  async backfillFromHistory() {
    if (!this.isRunning) return;

    let serverRecords = 0;

    // SOURCE 1: Server-collected data (if cron + Redis are set up)
    try {
      const resp = await fetch('/api/cron/collect?action=sync');
      if (resp.ok) {
        const { records } = await resp.json();
        if (records?.length > 0) {
          for (const record of records) {
            if (!record.observations) continue;
            for (const [lakeId, stations] of Object.entries(record.observations)) {
              for (const station of stations) {
                if (station.windSpeed == null) continue;
                const wind = { speed: station.windSpeed, gust: station.windGust, direction: station.windDirection };
                const conditions = { temperature: station.temperature, pressure: station.pressure };
                await learningSystem.recordActual(lakeId, station.stationId, {
                  ...station,
                  activityScores: {
                    kiting: scoreSessionForActivity('kiting', wind, conditions),
                    sailing: scoreSessionForActivity('sailing', wind, conditions),
                    paragliding: scoreSessionForActivity('paragliding', wind, conditions),
                    fishing: scoreSessionForActivity('fishing', wind, conditions),
                    boating: scoreSessionForActivity('boating', wind),
                  },
                });
                serverRecords++;
              }
            }
          }
          console.log(`Server backfill: ${serverRecords} observations from ${records.length} snapshots`);
        }
      }
    } catch (e) {
      console.log('Server backfill unavailable (expected if Redis not configured):', e.message);
    }

    // SOURCE 2: Synoptic 24hr history (always works, fills remaining gaps)
    try {
      const lakes = [
        'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy',
        'utah-lake-vineyard', 'utah-lake-mm19', 'deer-creek', 'willard-bay',
        'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier',
        'strawberry-view', 'strawberry-river', 'skyline-drive',
      ];

      const allStationIds = new Set();
      const stationToLakes = {};
      for (const lakeId of lakes) {
        const ids = getAllStationIds(lakeId);
        for (const id of ids) {
          allStationIds.add(id);
          if (!stationToLakes[id]) stationToLakes[id] = [];
          stationToLakes[id].push(lakeId);
        }
      }

      console.log(`Backfilling 24hr history for ${allStationIds.size} stations...`);

      const historyData = await weatherService.getSynopticHistory(
        Array.from(allStationIds), 24
      );

      let recordCount = 0;

      for (const station of historyData) {
        const lakesForStation = stationToLakes[station.stationId] || ['unknown'];

        for (const reading of (station.history || [])) {
          if (reading.windSpeed == null) continue;

          for (const lakeId of lakesForStation) {
            const wind = { speed: reading.windSpeed, gust: reading.windGust, direction: reading.windDirection };
            const conditions = { temperature: reading.temperature, pressure: null };
            await learningSystem.recordActual(lakeId, station.stationId, {
              windSpeed: reading.windSpeed,
              windGust: reading.windGust,
              windDirection: reading.windDirection,
              temperature: reading.temperature,
              pressure: null,
              activityScores: {
                kiting: scoreSessionForActivity('kiting', wind, conditions),
                sailing: scoreSessionForActivity('sailing', wind, conditions),
                paragliding: scoreSessionForActivity('paragliding', wind, conditions),
                fishing: scoreSessionForActivity('fishing', wind, conditions),
                boating: scoreSessionForActivity('boating', wind),
              },
            });
            recordCount++;
          }
        }
      }

      console.log(`Synoptic backfill: ${recordCount} observations ingested`);
      this.collectionStats.actualsCollected += serverRecords + recordCount;

    } catch (error) {
      console.error('Backfill error (non-fatal):', error.message);
    }

    // After backfill, verify predictions and conditionally learn (requires >=10 accuracy records)
    try {
      await learningSystem.verifyPredictions();
      await learningSystem.checkAndLearn();
      console.log('Post-backfill verification and conditional learning completed');
    } catch (e) {
      console.log('Post-backfill learning skipped:', e.message);
    }
  }

  /**
   * Collect actual weather data from all stations
   */
  async collectActuals() {
    if (!this.isRunning) return;

    console.log('📊 Collecting actual weather data...');

    try {
      const lakes = [
        'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy',
        'utah-lake-vineyard', 'utah-lake-mm19', 'deer-creek', 'willard-bay',
        'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier',
        'strawberry-view', 'strawberry-river', 'skyline-drive',
      ];

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

      // Also collect PWS data (with activity scores)
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        const pwsWind = {
          speed: ambientData.windSpeed,
          gust: ambientData.windGust,
          direction: ambientData.windDirection,
        };
        const pwsConditions = {
          temperature: ambientData.temperature,
          pressure: ambientData.pressure,
        };
        await learningSystem.recordActual('utah-lake-zigzag', 'PWS', {
          windSpeed: ambientData.windSpeed,
          windGust: ambientData.windGust,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
          pressure: ambientData.pressure,
          activityScores: {
            kiting: scoreSessionForActivity('kiting', pwsWind, pwsConditions),
            sailing: scoreSessionForActivity('sailing', pwsWind, pwsConditions),
            paragliding: scoreSessionForActivity('paragliding', pwsWind, pwsConditions),
            fishing: scoreSessionForActivity('fishing', pwsWind, pwsConditions),
            boating: scoreSessionForActivity('boating', pwsWind),
          },
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
      const lakes = [
        'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy',
        'utah-lake-vineyard', 'utah-lake-mm19',
        'deer-creek', 'willard-bay',
        'strawberry-ladders', 'strawberry-bay', 'strawberry-soldier',
        'strawberry-view', 'strawberry-river', 'skyline-drive',
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
   * Collect indicator correlation data.
   * For each indicator→target pair, we compare the indicator reading from
   * `leadTime` minutes ago (from stored actuals) against the current target
   * reading. This measures genuine predictive value, not co-occurrence.
   */
  async collectIndicatorData() {
    if (!this.isRunning) return;

    console.log('📈 Collecting indicator correlation data...');

    try {
      const indicatorStations = ['KSLC', 'KPVU', 'QSF', 'UTALP', 'UID28'];
      const targetStations = ['FPS', 'PWS', 'KHCR'];
      
      const allStations = [...indicatorStations, ...targetStations];
      const synopticData = await weatherService.getSynopticStationData(allStations);
      
      const currentReadings = new Map(synopticData.map(s => [s.stationId, s]));
      
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        currentReadings.set('PWS', {
          stationId: 'PWS',
          windSpeed: ambientData.windSpeed,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
        });
      }

      const indicatorConfigs = [
        { indicator: 'KSLC', target: 'FPS', leadTime: 60 },
        { indicator: 'KSLC', target: 'PWS', leadTime: 60 },
        { indicator: 'KPVU', target: 'FPS', leadTime: 60 },
        { indicator: 'KPVU', target: 'PWS', leadTime: 60 },
        { indicator: 'QSF', target: 'FPS', leadTime: 120 },
        { indicator: 'QSF', target: 'PWS', leadTime: 120 },
        { indicator: 'UTALP', target: 'FPS', leadTime: 30 },
        { indicator: 'UTALP', target: 'PWS', leadTime: 30 },
        { indicator: 'UID28', target: 'KHCR', leadTime: 60 },
        { indicator: 'KPVU', target: 'KHCR', leadTime: 90 },
        { indicator: 'KSLC', target: 'KSLC', leadTime: 0 },
        { indicator: 'KSLC', target: 'UTALP', leadTime: 45 },
        { indicator: 'KPVU', target: 'UTALP', leadTime: 45 },
      ];

      for (const config of indicatorConfigs) {
        const currentTarget = currentReadings.get(config.target);
        if (!currentTarget) continue;

        let indicatorData;
        if (config.leadTime === 0) {
          indicatorData = currentReadings.get(config.indicator);
        } else {
          const now = new Date();
          const pastTime = new Date(now.getTime() - config.leadTime * 60 * 1000);
          const pastActuals = await learningSystem.getActualsForStationNear(
            config.indicator, pastTime, 15
          );
          if (pastActuals) {
            indicatorData = {
              windSpeed: pastActuals.windSpeed,
              windDirection: pastActuals.windDirection,
              temperature: pastActuals.temperature,
            };
          }
        }

        if (!indicatorData) {
          indicatorData = currentReadings.get(config.indicator);
        }

        if (indicatorData) {
          await learningSystem.recordIndicator(
            config.indicator,
            config.target,
            {
              speed: indicatorData.windSpeed,
              direction: indicatorData.windDirection,
              temperature: indicatorData.temperature,
            },
            {
              speed: currentTarget.windSpeed,
              direction: currentTarget.windDirection,
              temperature: currentTarget.temperature,
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
