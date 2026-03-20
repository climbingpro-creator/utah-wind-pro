import { useState, Suspense, lazy } from 'react';
import * as React from 'react';
import { Wind, Brain, Lightbulb } from 'lucide-react';
import { WindVector } from './WindVector';
import { LakeSelector } from './LakeSelector';
import { ToastContainer } from './ToastNotification';
import { useLakeData } from '../hooks/useLakeData';
import { checkAndNotify } from '../services/NotificationService';
import { getFullForecast } from '../services/ForecastService';
import ActivityMode, { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore, getActivityHeroImage } from './ActivityMode';
import { predictGlass } from '../services/BoatingPredictor';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SafeComponent } from './ErrorBoundary';
import ProGate from './ProGate';
import { calculateCorrelatedWind } from '../services/CorrelationEngine';
import { monitorSwings } from '../services/FrontalTrendPredictor';
import { generateBriefing } from '../services/MorningBriefing';
import TodayHero from './TodayHero';
import ModelStepCard from './ModelStepCard';
import Modal from './Modal';
import ActivityScoreBanner from './ActivityScoreBanner';
import AppHeader from './AppHeader';

const DetailedPanels = lazy(() => import('./DetailedPanels'));
const NotificationSettings = lazy(() => import('./NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const LearningDashboard = lazy(() => import('./LearningDashboard'));
const SpotRanker = lazy(() => import('./SpotRanker'));
const ParaglidingMode = lazy(() => import('./ParaglidingMode'));
const FishingMode = lazy(() => import('./FishingMode'));
const ProUpgrade = lazy(() => import('./ProUpgrade'));
const SnowkiteForecast = lazy(() => import('./SnowkiteForecast'));
const PhotoSubmit = lazy(() => import('./PhotoSubmit'));
const SMSAlertSettings = lazy(() => import('./SMSAlertSettings'));
import { getSMSPrefs, processConditions } from '../services/SMSNotificationService';
import { getParaglidingScore } from '../utils/paraglidingScore';
import { safeToFixed } from '../utils/safeToFixed';
import { synthesize } from '../services/WindIntelligence';
import SignalConvergence from './SignalConvergence';

export function Dashboard() {
  const [selectedLake, setSelectedLake] = useState('utah-lake');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('kiting');
  const [showPhotoSubmit, setShowPhotoSubmit] = useState(false);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { lakeState, history, status, isLoading, error, lastUpdated, refresh } = useLakeData(selectedLake);
  const { theme } = useTheme();
  const { isPro, trialActive, trialDaysLeft, openPaywall, showPaywall } = useAuth();
  
  // Auto-switch lakes when moving between snow and water sports
  React.useEffect(() => {
    const isSnowSpot = selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive';
    if (selectedActivity === 'snowkiting' && !isSnowSpot) {
      setSelectedLake('strawberry-ladders');
    } else if (selectedActivity !== 'snowkiting' && isSnowSpot) {
      setSelectedLake('utah-lake');
    }
  }, [selectedActivity, selectedLake]);

  // Get activity-specific data
  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;
  
  // For paragliding, use Flight Park South/North data instead of generic wind
  const fpsStation = lakeState?.wind?.stations?.find(s => s.id === 'FPS');
  const utalpStation = lakeState?.wind?.stations?.find(s => s.id === 'UTALP');

  // Frontal Swing Monitor — checks 3-hour history for rapid changes
  const swingAlerts = React.useMemo(() => {
    const primaryStationId = lakeState?.pws ? 'PWS' : lakeState?.wind?.stations?.[0]?.id;
    const stationHistory = primaryStationId && history?.[primaryStationId];
    if (!stationHistory || stationHistory.length < 4) return [];
    return monitorSwings(stationHistory);
  }, [history, lakeState]);

  // Meso-Relational Correlation: refine prediction using upstream indicators
  const mesoData = React.useMemo(() => {
    if (!lakeState) return null;
    const data = { stations: lakeState.wind?.stations || [] };
    if (lakeState.kslcStation) data.KSLC = lakeState.kslcStation;
    if (lakeState.kpvuStation) data.KPVU = lakeState.kpvuStation;
    if (lakeState.utalpStation) data.UTALP = lakeState.utalpStation;
    if (lakeState.earlyIndicator) data.QSF = lakeState.earlyIndicator;
    return data;
  }, [lakeState]);

  const correlation = React.useMemo(() => {
    if (!selectedLake || !mesoData) return null;
    return calculateCorrelatedWind(
      selectedLake,
      {
        speed: currentWindSpeed,
        windSpeed: currentWindSpeed,
        windDirection: currentWindDirection,
        expectedSpeed: lakeState?.thermalPrediction?.speed?.expectedAvg,
      },
      mesoData,
      lakeState?.pws
    );
  }, [selectedLake, mesoData, currentWindSpeed, currentWindDirection, lakeState?.pws, lakeState?.thermalPrediction]);
  
  // Paragliding score delegated to utility
  
  const activityScore = React.useMemo(() => 
    selectedActivity === 'paragliding'
      ? getParaglidingScore(fpsStation, utalpStation)
      : (selectedActivity && currentWindSpeed != null
        ? calculateActivityScore(selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection)
        : null),
    [selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection, lakeState]
  );
  
  // Boating AI prediction (trained on 4,984 observations)
  const boatingPrediction = React.useMemo(() => {
    try {
      return predictGlass(
        { speed: currentWindSpeed, gust: currentWindGust },
        { slcPressure: lakeState?.pressure?.slc, provoPressure: lakeState?.pressure?.provo, gradient: lakeState?.pressure?.gradient },
      );
    } catch (_e) { return null; }
  }, [currentWindSpeed, currentWindGust, lakeState?.pressure]);

  // Wind Intelligence — unified signal synthesis
  const intelligence = React.useMemo(() => {
    try {
      return synthesize({
        lakeState,
        correlation,
        boatingPrediction,
        swingAlerts,
        mesoData,
        lakeId: selectedLake,
      });
    } catch (_e) { return null; }
  }, [lakeState, correlation, boatingPrediction, swingAlerts, mesoData, selectedLake]);

  // AI Morning Briefing
  const briefing = React.useMemo(() => {
    try {
      return generateBriefing(selectedActivity, {
        currentWind: { speed: currentWindSpeed, gust: currentWindGust, direction: currentWindDirection },
        upstream: {
          kslcSpeed: lakeState?.kslcStation?.speed,
          kslcDirection: lakeState?.kslcStation?.direction,
          kpvuSpeed: lakeState?.kpvuStation?.speed,
          kpvuDirection: lakeState?.kpvuStation?.direction,
        },
        thermalPrediction: lakeState?.thermalPrediction,
        boatingPrediction,
      });
    } catch (_e) { return null; }
  }, [selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection, lakeState?.thermalPrediction, boatingPrediction]);

  // Check for notifications when data updates
  React.useEffect(() => {
    if (lakeState) {
      const conditions = {
        pressureGradient: lakeState.pressure?.gradient,
        temperature: lakeState.pws?.temperature,
        windSpeed: lakeState.pws?.windSpeed || lakeState.wind?.stations?.[0]?.speed,
        windDirection: lakeState.pws?.windDirection || lakeState.wind?.stations?.[0]?.direction,
        thermalDelta: lakeState.thermal?.delta,
      };
      const forecast = getFullForecast(selectedLake, conditions);
      checkAndNotify(forecast, lakeState.config?.name || 'Utah Lake');

      // SMS text alerts
      const smsPrefs = getSMSPrefs();
      if (smsPrefs.enabled && smsPrefs.phone) {
        const gs = calculateGlassScore(currentWindSpeed, currentWindGust);
        processConditions({
          windSpeed: currentWindSpeed,
          windGust: currentWindGust,
          windDirection: currentWindDirection,
          glassScore: gs?.score,
          thermalProbability: lakeState?.probability,
        }, smsPrefs);
      }
    }
  }, [lakeState, selectedLake, currentWindSpeed, currentWindGust, currentWindDirection]);

  const formatTime = React.useCallback((date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }, []);

  const pressureData = React.useMemo(() => lakeState?.pressure ? {
    gradient: lakeState.pressure.gradient,
    isBustCondition: lakeState.pressure.gradient != null && Math.abs(lakeState.pressure.gradient) > 2.0,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null, [lakeState?.pressure]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' 
        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
    }`}>
      <ToastContainer />
      
      <AppHeader
        theme={theme}
        activityConfig={activityConfig}
        error={error}
        formatTime={formatTime}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isPro={isPro}
        trialActive={trialActive}
        trialDaysLeft={trialDaysLeft}
        showLearningDashboard={showLearningDashboard}
        lakeState={lakeState}
        getSMSPrefs={getSMSPrefs}
        onSMSClick={() => setShowSMSSettings(true)}
        onPhotoClick={() => setShowPhotoSubmit(true)}
        onNotificationsClick={() => setShowNotificationSettings(true)}
        onLearningClick={() => setShowLearningDashboard(!showLearningDashboard)}
        onRefresh={refresh}
        onUpgradeClick={openPaywall}
      />

      {showNotificationSettings && (
        <Suspense fallback={null}>
          <NotificationSettings 
            isOpen={showNotificationSettings} 
            onClose={() => setShowNotificationSettings(false)} 
          />
        </Suspense>
      )}
      {showPhotoSubmit && (
        <Suspense fallback={null}>
          <PhotoSubmit
            isOpen={showPhotoSubmit}
            onClose={() => setShowPhotoSubmit(false)}
          />
        </Suspense>
      )}
      {showSMSSettings && (
        <Suspense fallback={null}>
          <SMSAlertSettings
            isOpen={showSMSSettings}
            onClose={() => setShowSMSSettings(false)}
          />
        </Suspense>
      )}

      {/* Learning Dashboard Modal/Panel */}
      <Modal isOpen={showLearningDashboard} onClose={() => setShowLearningDashboard(false)} label="Learning System" className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowLearningDashboard(false)}
          aria-label="Close learning dashboard"
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
          ✕
        </button>
        <div className="p-2 space-y-4">
          <AccuracyScoreboard />
          <LearningDashboard />
        </div>
      </Modal>

      {showPaywall && <ProUpgrade />}

      {/* Trial active banner */}
      {trialActive && !isPro && (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 mt-4">
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${
            theme === 'dark' ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-100'
          }`}>
            <span className={theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}>
              <span className="font-bold">Pro trial active</span> — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining. All features unlocked.
            </span>
            <button
              onClick={openPaywall}
              className="text-xs font-bold text-sky-500 hover:text-sky-400 transition-colors"
            >
              Subscribe
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 section-stack">
        <TodayHero
          windSpeed={currentWindSpeed}
          windGust={currentWindGust}
          thermalPrediction={lakeState?.thermalPrediction}
          boatingPrediction={boatingPrediction}
          onSelectActivity={setSelectedActivity}
          fpsStation={lakeState?.wind?.stations?.find(s => s.id === 'FPS')}
          utalpStation={lakeState?.utalpStation || lakeState?.wind?.stations?.find(s => s.id === 'UTALP')}
        />

        {/* Wind Intelligence — unified signal convergence */}
        <SignalConvergence intelligence={intelligence} />

        {/* Global Activity Selector */}
        <div className="w-full">
          <ActivityMode 
            selectedActivity={selectedActivity}
            onActivityChange={setSelectedActivity}
            windSpeed={currentWindSpeed}
            windGust={currentWindGust}
            fpsStation={fpsStation}
          />
        </div>

        {/* Activity Hero Photo — rotates daily from image pool + user submissions */}
        {activityConfig?.heroImage && (
          <div className="hero-banner">
            <img 
              src={getActivityHeroImage(selectedActivity)} 
              alt={activityConfig.name}
            />
            <div className="hero-overlay bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 lg:p-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/60 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
                    {activityConfig.description}
                  </p>
                  <h3 className="text-white text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                    {activityConfig.name}
                  </h3>
                </div>
                {currentWindSpeed != null && (
                  <div className="text-right">
                    <div className="text-white text-2xl sm:text-3xl lg:text-4xl font-extrabold tabular-nums">
                      {Math.round(currentWindSpeed)}
                    </div>
                    <div className="text-white/60 text-xs font-semibold uppercase">mph now</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SNOWKITE AI FORECAST — shows for snowkite locations */}
        {(selectedLake?.startsWith('strawberry-') || selectedLake === 'skyline-drive') && (
          <SafeComponent name="Snowkite Forecast">
            <SnowkiteForecast
              selectedLake={selectedLake}
              mesoData={mesoData}
              onSelectLocation={setSelectedLake}
            />
          </SafeComponent>
        )}

        {/* SPOT RANKER — "Where should I go?" — primary decision */}
        {!activityConfig?.hideLakeSelector && (
          <SafeComponent name="Spot Ranker">
            <SpotRanker
              activity={selectedActivity}
              currentWind={{ speed: currentWindSpeed, gust: currentWindGust, direction: currentWindDirection }}
              lakeState={lakeState}
              mesoData={mesoData}
              onSelectSpot={setSelectedLake}
            />
          </SafeComponent>
        )}

        {/* Only show lake selector for water sports (not paragliding or fishing) */}
        {!activityConfig?.hideLakeSelector && (
          <LakeSelector selectedLake={selectedLake} onSelectLake={setSelectedLake} stationReadings={lakeState?.wind?.stations} activity={selectedActivity} />
        )}

        {/* Live Wind Vectors — station readings at a glance */}
        <div aria-live="polite" aria-atomic="false">
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-500" />
            Live Wind Vectors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lakeState?.wind?.stations?.map((station, index) => (
              <WindVector
                key={station.id || index}
                station={station}
                history={history[station.id]}
                isPersonalStation={station.isPWS}
              />
            ))}

            {isLoading && !lakeState?.wind?.stations?.length && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"
                  >
                    <div className="h-5 bg-[var(--border-color)] rounded w-2/3 mb-4" />
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-[var(--border-color)] rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-[var(--border-color)] rounded w-1/2" />
                        <div className="h-4 bg-[var(--border-color)] rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 3-Step Prediction Model — gradient, elevation, ground truth */}
        {selectedActivity !== 'paragliding' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">3-Step Prediction Model</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <ModelStepCard
              step="A"
              label="Gradient Check"
              description={<>ΔP = P<sub>SLC</sub> - P<sub>Provo</sub></>}
              value={lakeState?.pressure?.gradient != null 
                ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${safeToFixed(lakeState.pressure.gradient, 2)} mb`
                : '-- mb'
              }
              explanation={lakeState?.pressure?.isBusted 
                ? 'North flow dominates - thermal busted'
                : lakeState?.pressure?.gradient != null 
                  ? 'Gradient favorable for thermal'
                  : 'Waiting for data...'}
              isGood={lakeState?.pressure?.gradient != null && lakeState.pressure.gradient < 0}
              isBad={lakeState?.pressure?.isBusted}
              threshold="Bust if > 2.0 mb"
            />

            <ModelStepCard
              step="B"
              label="Elevation Delta"
              description={<>ΔT = T<sub>Shore</sub> - T<sub>Ridge</sub></>}
              value={lakeState?.thermal?.delta != null 
                ? `${lakeState.thermal.delta > 0 ? '+' : ''}${lakeState.thermal.delta}°F`
                : '--°F'
              }
              explanation={lakeState?.thermal?.pumpActive 
                ? 'Thermal Pump ACTIVE!'
                : lakeState?.thermal?.inversionTrapped
                  ? 'Inversion - air trapped'
                  : lakeState?.thermal?.delta != null
                    ? 'Thermal building'
                    : 'Waiting for data...'}
              isGood={lakeState?.thermal?.pumpActive}
              isBad={lakeState?.thermal?.inversionTrapped}
              threshold="Pump active if > 10°F"
            />

            <ModelStepCard
              step="C"
              label="Ground Truth"
              description={<>Your PWS at {lakeState?.pws?.name || 'Saratoga'}</>}
              value={lakeState?.pws?.windSpeed != null 
                ? `${safeToFixed(lakeState.pws.windSpeed, 1)} mph ${lakeState.pws.windDirection}°`
                : '-- mph'
              }
              explanation={lakeState?.thermalPrediction?.direction?.status === 'optimal'
                ? 'Direction OPTIMAL for thermal'
                : lakeState?.thermalPrediction?.direction?.status === 'wrong'
                  ? 'Wrong direction - no thermal'
                  : 'Verifying thermal arrival...'}
              isGood={lakeState?.thermalPrediction?.direction?.status === 'optimal'}
              isBad={lakeState?.thermalPrediction?.direction?.status === 'wrong'}
              threshold="Verifies exact arrival"
            />
          </div>
        </div>
        )}

        {/* Activity Score Banner — forecast-aware, shows best opportunity */}
        {activityScore && !activityConfig?.specialMode && (
          <ActivityScoreBanner
            activityScore={activityScore}
            activityConfig={activityConfig}
            lakeState={lakeState}
            boatingPrediction={boatingPrediction}
            currentWindSpeed={currentWindSpeed}
            theme={theme}
          />
        )}

        {/* AI Morning Briefing */}
        {briefing && !activityConfig?.specialMode && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-sky-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {briefing.headline}
              </span>
              {briefing.excitement >= 4 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  {briefing.excitement >= 5 ? 'EPIC' : 'HOT'}
                </span>
              )}
            </div>
            {briefing.body && (
              <p className="text-sm mb-3 text-[var(--text-secondary)] leading-relaxed">{briefing.body}</p>
            )}
            <div className="space-y-1.5">
              {briefing.bullets?.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]">
                  <span className="flex-shrink-0">{b.icon || '·'}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
            {briefing.bestAction && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-sky-500/[0.06] text-sky-500 border border-sky-500/20">
                <Lightbulb className="w-4 h-4 shrink-0" /> {briefing.bestAction}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="card !border-red-500/30">
            <p className="font-semibold text-red-500 text-sm">Connection Error</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
          </div>
        )}

        {/* Special Activity Modes */}
        {selectedActivity === 'paragliding' ? (
          <SafeComponent name="Paragliding Mode">
            <ParaglidingMode 
              windData={{
                stations: [
                  ...(lakeState?.wind?.stations || []),
                  ...(lakeState?.kslcStation ? [{ id: 'KSLC', ...lakeState.kslcStation }] : []),
                  ...(lakeState?.kpvuStation ? [{ id: 'KPVU', ...lakeState.kpvuStation }] : []),
                  ...(lakeState?.utalpStation ? [{ id: 'UTALP', ...lakeState.utalpStation }] : []),
                ].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i),
                FPS: lakeState?.wind?.stations?.find(s => s.id === 'FPS'),
                UTALP: lakeState?.utalpStation || lakeState?.wind?.stations?.find(s => s.id === 'UTALP'),
                KSLC: lakeState?.kslcStation,
                KPVU: lakeState?.kpvuStation,
              }}
              isLoading={isLoading}
            />
          </SafeComponent>
        ) : selectedActivity === 'fishing' ? (
          <ProGate feature="Fishing Intelligence" preview="Bite rating, moon phase & more">
            <SafeComponent name="Fishing Mode">
              <FishingMode 
                windData={{
                  stations: lakeState?.wind?.stations,
                  speed: currentWindSpeed,
                }}
                pressureData={pressureData}
                isLoading={isLoading}
                upstreamData={{
                  kslcSpeed: lakeState?.kslcStation?.speed,
                  kslcDirection: lakeState?.kslcStation?.direction,
                  kpvuSpeed: lakeState?.kpvuStation?.speed,
                  kpvuDirection: lakeState?.kpvuStation?.direction,
                }}
              />
            </SafeComponent>
          </ProGate>
        ) : (
        <>
        {/* Expand/Collapse toggle for detailed panels */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
            showDetails
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-500'
              : theme === 'dark'
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-sky-500/30 hover:text-sky-400'
                : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600'
          }`}
        >
          {showDetails ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              Hide Detailed Panels
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              Show Gauges, Forecasts & Analysis
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500">PRO</span>
            </>
          )}
        </button>

        {showDetails && (
          <DetailedPanels
            selectedActivity={selectedActivity}
            selectedLake={selectedLake}
            activityConfig={activityConfig}
            lakeState={lakeState}
            mesoData={mesoData}
            correlation={correlation}
            boatingPrediction={boatingPrediction}
            currentWindSpeed={currentWindSpeed}
            currentWindGust={currentWindGust}
            currentWindDirection={currentWindDirection}
            pressureData={pressureData}
            history={history}
            swingAlerts={swingAlerts}
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            error={error}
            refresh={refresh}
            status={status}
            theme={theme}
            setSelectedLake={setSelectedLake}
          />
        )}

        </>
        )}

      </main>
      </Suspense>

      <footer className="border-t border-[var(--border-color)] mt-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 text-center">
          {!isPro && (
            <button
              onClick={openPaywall}
              className={`mb-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20`}
            >
              Unlock All Features — Try Pro Free
            </button>
          )}
          <p className="text-sm font-semibold text-[var(--text-tertiary)]">UtahWindFinder</p>
          <p className="text-[11px] mt-1 text-[var(--text-tertiary)] opacity-60">
            AI-driven thermal forecasting for Utah's lakes and mountains
          </p>
        </div>
      </footer>
    </div>
  );
}

