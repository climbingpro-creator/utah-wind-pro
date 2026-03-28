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

import { learningSystem } from '@utahwind/weather';
import { weatherService } from '@utahwind/weather';
import { LakeState } from '@utahwind/weather';
import { LAKE_CONFIGS, getAllStationIds } from '@utahwind/weather';
import { setLearnedWeights, setStatisticalModels as setThermalStatisticalModels } from '@utahwind/weather';
import { setParaglidingLearnedWeights, predictParagliding } from './ParaglidingPredictor';
import { setBoatingLearnedWeights } from './BoatingPredictor';

import { setWindFieldLearnedWeights } from '@utahwind/weather';
import { scoreSessionForActivity } from './ActivityScoring';
import { predictWindEvents, setWindEventLearnedPatterns, getUpstreamSignals, setStatisticalModels as setWindEventStatisticalModels } from './WindEventPredictor';
import { setLearnedLags, setLearnedSessions, validateHistorical, lagAdjustmentsFromValidation } from '@utahwind/weather';
import { apiUrl } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

function getAllLakeIds() {
  return Object.keys(LAKE_CONFIGS).filter(id => id !== 'utah-lake');
}

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
    this.recentHistory = {};
    this.propagationSnapshots = {};
    this.statisticalModels = null;
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
    this.stop();
    
    console.log('Starting Data Collector for Learning System...');
    
    await learningSystem.initialize();
    this.isRunning = true;

    // Load previously learned propagation lags
    try {
      const storedLags = JSON.parse(localStorage.getItem('propagation:lags') || 'null');
      if (storedLags) setLearnedLags(storedLags);
    } catch (_e) { /* ignore */ }

    // Subscribe all predictors to weight updates — closes the learning loop.
    // Filter by activity field so each predictor only receives its own weights.
    this._unsubWeights = learningSystem.onWeightsUpdated((weights) => {
      if (!weights) return;
      if (weights.activity === 'paragliding') {
        setParaglidingLearnedWeights(weights);
      } else if (weights.activity === 'boating') {
        setBoatingLearnedWeights(weights);
      } else if (!weights.activity) {
        setLearnedWeights(weights);
        setWindFieldLearnedWeights(weights);
        if (weights.windEventPatterns) {
          setWindEventLearnedPatterns(weights.windEventPatterns);
        }
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
      // Phase 1: Quick startup — sync weights only (fast, 2 API calls)
      await this.syncServerWeights();
      console.log('Quick startup complete — weights synced');

      // Phase 2: Deferred heavy work — runs after UI is interactive
      setTimeout(() => {
        if (!this.isRunning) return;
        this._deferredCollection();
      }, 10_000);
    } catch (e) {
      console.error('Startup cycle error (non-fatal):', e.message);
    }
  }

  async _deferredCollection() {
    try {
      await this.backfillFromHistory();
      await this.collectActuals();
      await this.recordAndVerify();
      await this.collectIndicatorData();
      await this.triggerLearning();
      console.log('Deferred collection cycle complete');
    } catch (e) {
      console.error('Deferred collection error (non-fatal):', e.message);
    }
  }

  /**
   * Pull server-learned weights and merge with local weights.
   * The server runs predict→verify→learn 24/7 via cron, so its weights
   * reflect patterns discovered while the app was closed.
   */
  async syncServerWeights() {
    try {
      const resp = await fetch(apiUrl('/api/cron/collect?action=weights'));
      if (!resp.ok) return;
      const { weights, meta } = await resp.json();
      if (!weights) return;

      // Merge server weights into the local learning system
      const localWeights = await learningSystem.getCurrentWeights();
      const merged = this._mergeWeights(localWeights, weights);

      if (merged) {
        setLearnedWeights(merged);
        setWindFieldLearnedWeights(merged);
        if (merged.windEventPatterns || merged.eventWeights) {
          setWindEventLearnedPatterns(merged.windEventPatterns || merged.eventWeights);
        }
        setParaglidingLearnedWeights({ ...merged, activity: 'paragliding' });
        setBoatingLearnedWeights({ ...merged, activity: 'boating' });
      }

      const totalServerPredictions = meta?.totalPredictions ?? 0;
      const cycles = meta?.totalCycles ?? 0;
      const acc = weights.meta?.overallAccuracy;
      console.log(`Server weights synced — ${totalServerPredictions} predictions across ${cycles} cycles, accuracy: ${acc != null ? safeToFixed(acc * 100, 1) : '?'}%`);
    } catch (e) {
      console.log('Server weights unavailable (expected if not deployed):', e.message);
    }

    try {
      const modelsResp = await fetch(apiUrl('/api/cron/collect?action=models'));
      if (modelsResp.ok) {
        const modelsData = await modelsResp.json();
        if (modelsData?.thermalProfiles || modelsData?.lagCorrelations) {
          this.statisticalModels = modelsData;
          setThermalStatisticalModels(modelsData);
          setWindEventStatisticalModels(modelsData);
        }
      }
    } catch (e) {
      console.warn('[DataCollector] Statistical models fetch failed:', e.message);
    }

    // Sync server-learned propagation lags for all spots (24/7 cron-collected)
    try {
      const propResp = await fetch(apiUrl('/api/cron/collect?action=propagation'));
      if (propResp.ok) {
        const propData = await propResp.json();
        if (propData?.lags && Object.keys(propData.lags).length > 0) {
          const clientLags = {};
          for (const [k, v] of Object.entries(propData.lags)) {
            clientLags[k] = { avgLagMinutes: v.avgLag, samples: v.samples };
          }
          setLearnedLags(clientLags);
          localStorage.setItem('propagation:lags', JSON.stringify(clientLags));
          console.log(`Propagation lags synced — ${Object.keys(clientLags).length} lags across all spots`);
        }
        if (propData?.sessions && Object.keys(propData.sessions).length > 0) {
          setLearnedSessions(propData.sessions);
          localStorage.setItem('propagation:sessions', JSON.stringify(propData.sessions));
          console.log(`Session durations synced — ${Object.keys(propData.sessions).length} chains tracked`);
        }
        if (propData?.pwsBackfill) {
          localStorage.setItem('propagation:pwsBackfill', JSON.stringify(propData.pwsBackfill));
          console.log(`PWS backfill data synced — ${propData.pwsBackfill.daysAnalyzed} days of real history`);
        }
        if (propData?.hitRates) {
          localStorage.setItem('propagation:hitRates', JSON.stringify(propData.hitRates));
        }
        if (propData?.recentEvents) {
          localStorage.setItem('propagation:events', JSON.stringify(propData.recentEvents));
        }
      }
    } catch (e) {
      console.warn('[DataCollector] Propagation sync failed:', e.message);
    }
  }

  /**
   * Merge server-learned weights with local (client-side) weights.
   * Uses the source with more data for each event type.
   */
  _mergeWeights(local, server) {
    if (!server && !local) return null;
    if (!server) return local;
    if (!local) return server;

    const merged = { ...local };

    // Merge event-level weights: prefer whichever has more data
    if (server.eventWeights) {
      if (!merged.windEventPatterns) merged.windEventPatterns = {};
      for (const [eventType, serverData] of Object.entries(server.eventWeights)) {
        const localCount = merged.windEventPatterns?.[eventType]?.count ?? 0;
        const serverCount = serverData.count ?? 0;
        if (serverCount > localCount) {
          merged.windEventPatterns[eventType] = {
            ...serverData,
            bias: serverData.baseProbMod ?? 0,
            confidenceBoost: serverCount > 50 ? 0.1 : 0,
            hourlyBias: serverData.hourlyBias || {},
            speedBias: serverData.speedBias || 0,
          };
        }
      }
    }

    // Merge per-lake weights
    if (server.lakeWeights) {
      if (!merged.lakeWeights) merged.lakeWeights = {};
      for (const [lakeId, serverLake] of Object.entries(server.lakeWeights)) {
        const localCount = merged.lakeWeights?.[lakeId]?.count ?? 0;
        if ((serverLake.count ?? 0) > localCount) {
          merged.lakeWeights[lakeId] = serverLake;
        }
      }
    }

    // Carry over server accuracy metadata
    merged.serverMeta = server.meta;

    return merged;
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
      const resp = await fetch(apiUrl('/api/cron/collect?action=sync'));
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
                    paragliding_north: scoreSessionForActivity('paragliding_north', wind, conditions),
                    paragliding_south: scoreSessionForActivity('paragliding_south', wind, conditions),
                    fishing: scoreSessionForActivity('fishing', wind, conditions),
                    boating: scoreSessionForActivity('boating', wind, conditions),
                    paddling: scoreSessionForActivity('paddling', wind, conditions),
                    windsurfing: scoreSessionForActivity('windsurfing', wind, conditions),
                    snowkiting: scoreSessionForActivity('snowkiting', wind, conditions),
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
      const lakes = getAllLakeIds();

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
                paragliding_north: scoreSessionForActivity('paragliding_north', wind, conditions),
                paragliding_south: scoreSessionForActivity('paragliding_south', wind, conditions),
                fishing: scoreSessionForActivity('fishing', wind, conditions),
                boating: scoreSessionForActivity('boating', wind, conditions),
                paddling: scoreSessionForActivity('paddling', wind, conditions),
                windsurfing: scoreSessionForActivity('windsurfing', wind, conditions),
                snowkiting: scoreSessionForActivity('snowkiting', wind, conditions),
              },
            }, reading.timestamp || reading.dateTime);
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
      const lakes = getAllLakeIds();

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
            paragliding_north: scoreSessionForActivity('paragliding_north', wind, conditions),
            paragliding_south: scoreSessionForActivity('paragliding_south', wind, conditions),
            fishing: scoreSessionForActivity('fishing', wind, conditions),
            boating: scoreSessionForActivity('boating', wind, conditions),
            paddling: scoreSessionForActivity('paddling', wind, conditions),
            windsurfing: scoreSessionForActivity('windsurfing', wind, conditions),
            snowkiting: scoreSessionForActivity('snowkiting', wind, conditions),
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

        // Buffer the latest aggregate reading for wind event prediction
        if (!this.recentHistory[lakeId]) this.recentHistory[lakeId] = [];
        const lakeConfig = LAKE_CONFIGS?.[lakeId];
        const groundTruthId = lakeConfig?.stations?.groundTruth?.id;
        const primaryId = lakeConfig?.stations?.lakeshore?.[0]?.id;
        const preferredId = groundTruthId || primaryId;
        const latestStation = preferredId
          ? synopticData.find(s => s.stationId === preferredId) || synopticData[0]
          : synopticData[0];
        if (latestStation) {
          this.recentHistory[lakeId].push({
            timestamp: Date.now(),
            windSpeed: latestStation.windSpeed,
            windGust: latestStation.windGust,
            windDirection: latestStation.windDirection,
            temperature: latestStation.temperature,
            pressure: latestStation.pressure,
          });
          if (this.recentHistory[lakeId].length > 12) {
            this.recentHistory[lakeId] = this.recentHistory[lakeId].slice(-12);
          }
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
            paragliding_north: scoreSessionForActivity('paragliding_north', pwsWind, pwsConditions),
            paragliding_south: scoreSessionForActivity('paragliding_south', pwsWind, pwsConditions),
            fishing: scoreSessionForActivity('fishing', pwsWind, pwsConditions),
            boating: scoreSessionForActivity('boating', pwsWind, pwsConditions),
            paddling: scoreSessionForActivity('paddling', pwsWind, pwsConditions),
            windsurfing: scoreSessionForActivity('windsurfing', pwsWind, pwsConditions),
            snowkiting: scoreSessionForActivity('snowkiting', pwsWind, pwsConditions),
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
      const lakes = getAllLakeIds();

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
            propagation: lakeState.propagation?.dominant ?? null,
          });

          // Capture propagation snapshot for daily learning
          if (lakeState.propagation && lakeId.startsWith('utah-lake')) {
            if (!this.propagationSnapshots[lakeId]) this.propagationSnapshots[lakeId] = [];
            this.propagationSnapshots[lakeId].push({
              timestamp: new Date().toISOString(),
              stationReadings: Object.fromEntries(
                (lakeState.wind?.stations || []).map(s => [
                  s.id,
                  { speed: s.speed, gust: s.gust, direction: s.direction, temp: s.temperature },
                ])
              ),
              propagation: lakeState.propagation,
            });
            if (this.propagationSnapshots[lakeId].length > 96) {
              this.propagationSnapshots[lakeId] = this.propagationSnapshots[lakeId].slice(-96);
            }
          }
          
          this.collectionStats.predictionsRecorded++;
        }

        // Record wind event predictions for this lake
        try {
          const currentConditions = lakeState.pws || lakeState.groundTruth || {};
          const pressureInfo = {
            slcPressure: lakeState.pressure?.slc,
            pvuPressure: lakeState.pressure?.pvu,
            gradient: lakeState.pressure?.gradient ?? 0,
            trend: lakeState.pressure?.trend ?? 'stable',
          };
          const stationHistory = this.recentHistory[lakeId] || [];
          const upstreamSignals = await getUpstreamSignals();
          const windEvents = predictWindEvents(lakeId, currentConditions, pressureInfo, stationHistory, null, upstreamSignals);
          for (const event of windEvents) {
            if (event.probability > 30) {
              await learningSystem.recordPrediction(lakeId, {
                probability: event.probability,
                windType: event.id,
                expectedSpeed: Array.isArray(event.expectedSpeed) ? event.expectedSpeed[1] : (event.expectedSpeed?.max ?? 15),
                expectedDirection: event.expectedDirection?.min,
                windEventType: event.id,
                windEventDetails: event.details,
                timing: event.timing,
              }, {
                pressureGradient: pressureInfo.gradient,
                temperature: currentConditions.temperature,
              });
              this.collectionStats.predictionsRecorded++;
            }
          }
        } catch (e) {
          console.warn('[DataCollector] Wind event prediction error:', e.message);
        }

        // Record paragliding predictions for PotM spots
        if (lakeId === 'potm-south' || lakeId === 'potm-north') {
          try {
            const pgData = {
              stations: lakeState.wind?.stations || [],
              FPS: lakeState.wind?.stations?.find(s => s.id === 'FPS'),
              UTALP: lakeState.utalpStation || lakeState.wind?.stations?.find(s => s.id === 'UTALP'),
              KSLC: lakeState.kslcStation,
              KPVU: lakeState.kpvuStation,
            };
            const pgResult = predictParagliding(pgData, {});
            const site = lakeId === 'potm-south' ? pgResult.south : pgResult.north;
            if (site && site.probability != null) {
              await learningSystem.recordPrediction(lakeId, {
                probability: site.probability,
                windType: 'paragliding',
                expectedSpeed: site.expectedSpeed || 10,
                expectedDirection: lakeId === 'potm-south' ? 170 : 340,
                flyable: site.flyable,
                status: site.status,
              }, {
                fpsSpeed: pgData.FPS?.speed ?? pgData.FPS?.windSpeed,
                fpsDirection: pgData.FPS?.direction ?? pgData.FPS?.windDirection,
              });
              this.collectionStats.predictionsRecorded++;
            }
          } catch (e) {
            console.warn('[DataCollector] Paragliding prediction error:', e.message);
          }
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
            config.indicator.toLowerCase(),
            config.target.toLowerCase(),
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

      // Feed propagation snapshots into lag learning
      this._learnFromPropagation();
      
      this.lastCollection.learning = new Date().toISOString();
      console.log('✅ Learning cycle complete');
      
      return newWeights;

    } catch (error) {
      console.error('Error in learning cycle:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Learn from today's propagation snapshots.
   * Computes actual onset times per station, compares to expected lags,
   * and stores learned lag adjustments for future predictions.
   */
  _learnFromPropagation() {
    try {

      for (const [lakeId, snaps] of Object.entries(this.propagationSnapshots)) {
        if (snaps.length < 4) continue;

        const day = {
          date: new Date().toISOString().slice(0, 10),
          snapshots: snaps.map(s => ({
            timestamp: s.timestamp,
            stations: s.stationReadings,
          })),
        };

        const validation = validateHistorical([day]);
        const lagAdj = lagAdjustmentsFromValidation(validation);

        if (Object.keys(lagAdj).length > 0) {
          const stored = JSON.parse(localStorage.getItem('propagation:lags') || '{}');
          for (const [key, val] of Object.entries(lagAdj)) {
            if (!stored[key]) {
              stored[key] = val;
            } else {
              const w = stored[key].samples / (stored[key].samples + val.samples);
              stored[key] = {
                avgLagMinutes: Math.round(stored[key].avgLagMinutes * w + val.avgLagMinutes * (1 - w)),
                samples: stored[key].samples + val.samples,
              };
            }
          }
          localStorage.setItem('propagation:lags', JSON.stringify(stored));
          setLearnedLags(stored);
          console.log('Propagation lags updated:', stored);
        }

        // Store daily propagation event for historical reference
        const events = JSON.parse(localStorage.getItem('propagation:events') || '[]');
        events.push({
          date: day.date,
          lake: lakeId,
          seThermal: validation.seThermal,
          northFlow: validation.northFlow,
          snapshotCount: snaps.length,
        });
        if (events.length > 365) events.splice(0, events.length - 365);
        localStorage.setItem('propagation:events', JSON.stringify(events));
      }

      this.propagationSnapshots = {};
    } catch (e) {
      console.warn('Propagation learning error:', e);
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
