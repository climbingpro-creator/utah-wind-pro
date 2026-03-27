import { useState, useRef, Suspense, lazy } from 'react';
import * as React from 'react';
import { LakeSelector } from './LakeSelector';
import { ToastContainer } from './ToastNotification';
import { useLakeData } from '../hooks/useLakeData';
import { useModelContext } from '../hooks/useModelContext';
import { predict as unifiedPredict } from '../services/UnifiedPredictor';
import { checkAndNotify } from '../services/NotificationService';
import { getFullForecast } from '../services/ForecastService';
import { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore } from './ActivityMode';
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
import AppHeader from './AppHeader';

// Feature flag: set true to use the UnifiedPredictor pipeline
const USE_UNIFIED_PREDICTOR = true;

const FREE_LAKES = new Set([
  'utah-lake', 'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
  'potm-south', 'potm-north', 'inspo',
]);

const Onboarding = lazy(() => import('./Onboarding'));

const DetailedPanels = lazy(() => import('./DetailedPanels'));
const NotificationSettings = lazy(() => import('./NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const LearningDashboard = lazy(() => import('./LearningDashboard'));
const ParaglidingMode = lazy(() => import('./ParaglidingMode'));
const ProUpgrade = lazy(() => import('./ProUpgrade'));
const WindSeekerTemplate = lazy(() => import('./WindSeekerTemplate'));
const FlatwaterTemplate = lazy(() => import('./FlatwaterTemplate'));
const WinterRiderTemplate = lazy(() => import('./WinterRiderTemplate'));
const AccuracyScoreboard = lazy(() => import('./AccuracyScoreboard'));
const PhotoSubmit = lazy(() => import('./PhotoSubmit'));
const SMSAlertSettings = lazy(() => import('./SMSAlertSettings'));
import { getSMSPrefs, processConditions } from '../services/SMSNotificationService';
import { getParaglidingScore } from '../utils/paraglidingScore';
import { safeToFixed } from '../utils/safeToFixed';
import { synthesize } from '../services/WindIntelligence';
import SignalConvergence from './SignalConvergence';

const PropagationTracker = lazy(() => import('./PropagationTracker'));

export function Dashboard() {
  const [selectedLake, setSelectedLake] = useState(() => localStorage.getItem('uwf_default_spot') || 'utah-lake');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(() => localStorage.getItem('uwf_default_sport') || 'kiting');
  const [showPhotoSubmit, setShowPhotoSubmit] = useState(false);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('uwf_onboarded'));
  const { lakeState, history, status, isLoading, error, lastUpdated, refresh } = useLakeData(selectedLake);
  const { theme } = useTheme();
  const { isPro, rawTier, trialActive, trialDaysLeft, openPaywall, showPaywall } = useAuth();
  const contentRef = useRef(null);
  const isFirstRender = useRef(true);

  const handleSelectLake = React.useCallback((lakeId) => {
    if (isPro || FREE_LAKES.has(lakeId)) {
      setSelectedLake(lakeId);
    } else {
      openPaywall();
    }
  }, [isPro, openPaywall]);

  React.useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedActivity]);
  
  React.useEffect(() => {
    const isSnowSpot = selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive';
    const isPGSpot = ['potm-south', 'potm-north', 'inspo', 'west-mountain', 'stockton-bar'].includes(selectedLake);

    if (selectedActivity === 'snowkiting' && !isSnowSpot) {
      setSelectedLake('strawberry-ladders');
    } else if (selectedActivity === 'paragliding' && !isPGSpot) {
      setSelectedLake('potm-south');
    } else if (selectedActivity !== 'snowkiting' && selectedActivity !== 'paragliding' && (isSnowSpot || isPGSpot)) {
      setSelectedLake('utah-lake');
    }
  }, [selectedActivity, selectedLake]);

  // Get activity-specific data
  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;
  
  const fpsStation = lakeState?.wind?.stations?.find(s => s.id === 'FPS');
  const utalpStation = lakeState?.wind?.stations?.find(s => s.id === 'UTALP');

  // For paragliding, use the primary PG station (FPS for south, UTALP for north)
  const pgPrimaryStation = fpsStation || utalpStation;
  const pgWindSpeed = pgPrimaryStation?.speed ?? pgPrimaryStation?.windSpeed;
  const pgWindGust = pgPrimaryStation?.gust ?? pgPrimaryStation?.windGust;
  const pgWindDirection = pgPrimaryStation?.direction ?? pgPrimaryStation?.windDirection;

  // Wind values used by DecisionCard — paragliding uses launch-site sensors
  const decisionWindSpeed = selectedActivity === 'paragliding' ? pgWindSpeed : currentWindSpeed;
  const decisionWindGust = selectedActivity === 'paragliding' ? pgWindGust : currentWindGust;
  const decisionWindDirection = selectedActivity === 'paragliding' ? pgWindDirection : currentWindDirection;

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
        selectedActivity,
      );
    } catch (_e) { return null; }
  }, [currentWindSpeed, currentWindGust, lakeState?.pressure, selectedActivity]);

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
        intelligence,
        swingAlerts,
      });
    } catch (_e) { return null; }
  }, [selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection, lakeState?.thermalPrediction, boatingPrediction, intelligence, swingAlerts]);

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
        const severeAlert = forecast?.alerts?.find(a => a.severity === 'severe' || a.severity === 'extreme');
        processConditions({
          windSpeed: currentWindSpeed,
          windGust: currentWindGust,
          windDirection: currentWindDirection,
          glassScore: gs?.score,
          thermalProbability: lakeState?.probability,
          severeAlert: severeAlert ? { headline: severeAlert.headline || severeAlert.event } : null,
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

  // ═══════════ UNIFIED PREDICTOR ═══════════
  const { modelContext } = useModelContext();

  const prediction = React.useMemo(() => {
    if (!USE_UNIFIED_PREDICTOR) return null;
    if (!lakeState?.wind?.stations) return null;
    try {
      return unifiedPredict(
        selectedLake,
        selectedActivity,
        lakeState.wind.stations,
        modelContext,
        lakeState.config
      );
    } catch (err) {
      console.error('UnifiedPredictor error:', err);
      return null;
    }
  }, [selectedLake, selectedActivity, lakeState?.wind?.stations, modelContext, lakeState?.config]);

  // Derived values from unified prediction (with fallbacks to old system)
  const effectiveBriefing = (USE_UNIFIED_PREDICTOR && prediction?.briefing) ? {
    headline: prediction.briefing.headline,
    body: prediction.briefing.body,
    bullets: (prediction.briefing.bullets || []).map(b => typeof b === 'string' ? { icon: '·', text: b } : b),
    bestAction: prediction.briefing.bestAction,
    excitement: prediction.briefing.excitement === 'high' ? 5 : prediction.briefing.excitement === 'moderate' ? 4 : 2,
  } : briefing;

  const effectiveBoatingPrediction = (USE_UNIFIED_PREDICTOR && prediction?.boatingPrediction)
    ? prediction.boatingPrediction
    : boatingPrediction;

  const effectiveThermalPrediction = (USE_UNIFIED_PREDICTOR && prediction?.thermalPrediction)
    ? prediction.thermalPrediction
    : lakeState?.thermalPrediction;

  const effectiveActivityScore = React.useMemo(() => {
    if (!USE_UNIFIED_PREDICTOR || !prediction?.activities?.[selectedActivity]) return activityScore;
    const ua = prediction.activities[selectedActivity];
    return { score: ua.score, message: ua.message, status: ua.status };
  }, [prediction, selectedActivity, activityScore]);

  const effectiveDecision = (USE_UNIFIED_PREDICTOR && prediction) ? {
    windSpeed: prediction.wind?.current?.speed ?? decisionWindSpeed,
    windGust: prediction.wind?.current?.gust ?? decisionWindGust,
    windDirection: prediction.wind?.current?.dir ?? decisionWindDirection,
  } : {
    windSpeed: decisionWindSpeed,
    windGust: decisionWindGust,
    windDirection: decisionWindDirection,
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' 
        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
    }`}>
      <ToastContainer />

      {!showOnboarding && <AppHeader
        theme={theme}
        activityConfig={activityConfig}
        error={error}
        formatTime={formatTime}
        selectedLake={selectedLake}
        selectedActivity={selectedActivity}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isPro={isPro}
        trialActive={trialActive}
        trialDaysLeft={trialDaysLeft}
        showLearningDashboard={showLearningDashboard}
        lakeState={lakeState}
        getSMSPrefs={getSMSPrefs}
        onSMSClick={() => isPro ? setShowSMSSettings(true) : openPaywall()}
        onPhotoClick={() => setShowPhotoSubmit(true)}
        onNotificationsClick={() => isPro ? setShowNotificationSettings(true) : openPaywall()}
        onLearningClick={() => setShowLearningDashboard(!showLearningDashboard)}
        onRefresh={refresh}
        onUpgradeClick={openPaywall}
      />}

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
        <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
          <div className="p-2 space-y-4">
            <AccuracyScoreboard />
            <ProGate feature="Model Intelligence" preview="See how the AI learns and improves">
              <LearningDashboard />
            </ProGate>
          </div>
        </Suspense>
      </Modal>

      {showPaywall && <ProUpgrade />}

      {/* Trial active banner — show when on trial (isPro via trial, not paid subscription) */}
      {trialActive && rawTier !== 'pro' && (
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

      {/* ═══════════ ONBOARDING ═══════════ */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <Onboarding onComplete={(sport, spot) => {
            if (sport) setSelectedActivity(sport);
            if (spot) setSelectedLake(spot);
            setShowOnboarding(false);
          }} />
        </Suspense>
      )}

      {!showOnboarding && (
      <Suspense fallback={null}>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 section-stack">

        {/* ═══════════ 1. ACTIVITY MATRIX (pinned at top) ═══════════ */}
        <TodayHero
          windSpeed={currentWindSpeed}
          windGust={currentWindGust}
          windDirection={currentWindDirection}
          thermalPrediction={effectiveThermalPrediction}
          boatingPrediction={effectiveBoatingPrediction}
          onSelectActivity={setSelectedActivity}
          selectedActivity={selectedActivity}
          fpsStation={lakeState?.wind?.stations?.find(s => s.id === 'FPS')}
          utalpStation={lakeState?.utalpStation || lakeState?.wind?.stations?.find(s => s.id === 'UTALP')}
          propagation={prediction?.propagation || lakeState?.propagation}
          unifiedActivities={prediction?.activities}
        />

        {/* ═══════════ 2. SPORT TEMPLATE ROUTER ═══════════ */}
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
        ) : selectedActivity === 'snowkiting' ? (
          <WinterRiderTemplate
            selectedActivity={selectedActivity} selectedLake={selectedLake} activityConfig={activityConfig} theme={theme}
            currentWindSpeed={currentWindSpeed} currentWindGust={currentWindGust} currentWindDirection={currentWindDirection}
            effectiveDecision={effectiveDecision} lakeState={lakeState} history={history}
            prediction={prediction} effectiveThermalPrediction={effectiveThermalPrediction} effectiveBoatingPrediction={effectiveBoatingPrediction}
            effectiveActivityScore={effectiveActivityScore} effectiveBriefing={effectiveBriefing}
            mesoData={mesoData} isLoading={isLoading} onSelectSpot={handleSelectLake} contentRef={contentRef}
          />
        ) : activityConfig?.wantsWind ? (
          <WindSeekerTemplate
            selectedActivity={selectedActivity} selectedLake={selectedLake} activityConfig={activityConfig} theme={theme}
            currentWindSpeed={currentWindSpeed} currentWindGust={currentWindGust} currentWindDirection={currentWindDirection}
            effectiveDecision={effectiveDecision} lakeState={lakeState} history={history}
            prediction={prediction} effectiveThermalPrediction={effectiveThermalPrediction} effectiveBoatingPrediction={effectiveBoatingPrediction}
            effectiveActivityScore={effectiveActivityScore} effectiveBriefing={effectiveBriefing} pressureData={pressureData}
            mesoData={mesoData} isLoading={isLoading} onSelectSpot={handleSelectLake} contentRef={contentRef}
          />
        ) : (
          <FlatwaterTemplate
            selectedActivity={selectedActivity} selectedLake={selectedLake} activityConfig={activityConfig} theme={theme}
            currentWindSpeed={currentWindSpeed} currentWindGust={currentWindGust} currentWindDirection={currentWindDirection}
            effectiveDecision={effectiveDecision} lakeState={lakeState} history={history}
            prediction={prediction} effectiveThermalPrediction={effectiveThermalPrediction} effectiveBoatingPrediction={effectiveBoatingPrediction}
            effectiveActivityScore={effectiveActivityScore} effectiveBriefing={effectiveBriefing} pressureData={pressureData}
            mesoData={mesoData} isLoading={isLoading} onSelectSpot={handleSelectLake} contentRef={contentRef}
          />
        )}

        {/* ═══════════ SPOT PICKER (accessible but not primary) ═══════════ */}
        <LakeSelector
          selectedLake={selectedLake}
          onSelectLake={handleSelectLake}
          stationReadings={lakeState?.wind?.stations}
          activity={selectedActivity}
          pressureData={pressureData}
        />

        {error && (
          <div className="card !border-red-500/30">
            <p className="font-semibold text-red-500 text-sm">Connection Error</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
          </div>
        )}

        {/* ═══════════ SECTION 8: DEEP DIVE — Power User Panels ═══════════ */}
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
              Hide Deep Dive
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              Show Deep Dive — Sensors, Models & Analysis
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500">PRO</span>
            </>
          )}
        </button>

        {showDetails && (
          <>
            {/* Weather Pattern — moved from main flow */}
            <SignalConvergence intelligence={intelligence} unifiedPrediction={prediction} />

            {/* Wind Arrival Tracker — moved from main flow */}
            {(prediction?.propagation || lakeState?.propagation) && activityConfig?.wantsWind && (
              <Suspense fallback={null}>
                <SafeComponent name="Wind Arrival Tracker">
                  <PropagationTracker propagation={prediction?.propagation || lakeState.propagation} />
                </SafeComponent>
              </Suspense>
            )}

            {/* Why We Think Wind Is Coming — renamed from 3-Step Model */}
            {activityConfig?.wantsWind && selectedActivity !== 'paragliding' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Why We Think Wind Is Coming</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <ModelStepCard
                  step="A"
                  label="Pressure Gradient"
                  description={<>SLC vs Provo barometer</>}
                  value={lakeState?.pressure?.gradient != null 
                    ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${safeToFixed(lakeState.pressure.gradient, 2)} mb`
                    : '-- mb'
                  }
                  explanation={lakeState?.pressure?.isBusted 
                    ? 'North flow dominates — no thermal today'
                    : lakeState?.pressure?.gradient != null 
                      ? 'Gradient favorable for wind'
                      : 'Waiting for data...'}
                  isGood={lakeState?.pressure?.gradient != null && lakeState.pressure.gradient < 0}
                  isBad={lakeState?.pressure?.isBusted}
                  threshold="North flow if > 2.0 mb"
                />
                <ModelStepCard
                  step="B"
                  label="Temperature Difference"
                  description={<>Shore vs ridge temps</>}
                  value={lakeState?.thermal?.delta != null 
                    ? `${lakeState.thermal.delta > 0 ? '+' : ''}${lakeState.thermal.delta}°F`
                    : '--°F'
                  }
                  explanation={lakeState?.thermal?.pumpActive 
                    ? 'Hot air rising — wind being pulled in!'
                    : lakeState?.thermal?.inversionTrapped
                      ? 'Cold air trapped — no convection'
                      : lakeState?.thermal?.delta != null
                        ? 'Heat building — wind developing'
                        : 'Waiting for data...'}
                  isGood={lakeState?.thermal?.pumpActive}
                  isBad={lakeState?.thermal?.inversionTrapped}
                  threshold="Active when > 10°F gap"
                />
                <ModelStepCard
                  step="C"
                  label="Your Station"
                  description={<>Live reading at {lakeState?.pws?.name || 'your spot'}</>}
                  value={lakeState?.pws?.windSpeed != null 
                    ? `${safeToFixed(lakeState.pws.windSpeed, 1)} mph ${lakeState.pws.windDirection}°`
                    : '-- mph'
                  }
                  explanation={lakeState?.thermalPrediction?.direction?.status === 'optimal'
                    ? 'Wind direction is perfect'
                    : lakeState?.thermalPrediction?.direction?.status === 'wrong'
                      ? 'Wrong direction — wind not arriving here'
                      : 'Checking arrival at your spot...'}
                  isGood={lakeState?.thermalPrediction?.direction?.status === 'optimal'}
                  isBad={lakeState?.thermalPrediction?.direction?.status === 'wrong'}
                  threshold="Confirms wind arrival"
                />
              </div>
            </div>
            )}

            {/* Calm Conditions Detail — renamed */}
            {activityConfig && !activityConfig.wantsWind && (
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                {selectedActivity === 'fishing' ? 'Fishing Conditions Detail' : `${activityConfig.name} — Water Status`}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <ModelStepCard
                  step="A" label="Wind Check" description={<>Current wind at your spot</>}
                  value={currentWindSpeed != null ? `${safeToFixed(currentWindSpeed, 1)} mph` : '-- mph'}
                  explanation={currentWindSpeed == null ? 'Waiting for data...'
                    : currentWindSpeed <= 3 ? (selectedActivity === 'fishing' ? 'Still water — fish feeding'
                      : selectedActivity === 'paddling' ? 'Flat water — go paddle'
                      : 'Glass — go now')
                    : currentWindSpeed <= (activityConfig.thresholds?.ideal?.max ?? 8) ? 'Nearly flat — excellent'
                    : 'Getting choppy'}
                  isGood={currentWindSpeed != null && currentWindSpeed <= (activityConfig.thresholds?.ideal?.max ?? 8)}
                  isBad={currentWindSpeed != null && currentWindSpeed > (activityConfig.thresholds?.rough ?? 15)}
                  threshold={`Ideal: < ${activityConfig.thresholds?.ideal?.max ?? 8} mph`}
                />
                <ModelStepCard
                  step="B" label="Wind Forecast" description={<>Will it stay calm?</>}
                  value={lakeState?.pressure?.gradient != null
                    ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${safeToFixed(lakeState.pressure.gradient, 2)} mb`
                    : '-- mb'}
                  explanation={lakeState?.pressure?.gradient == null ? 'Waiting for data...'
                    : Math.abs(lakeState.pressure.gradient) < 1 ? 'Low gradient — calm persists'
                    : 'Wind building — plan around it'}
                  isGood={lakeState?.pressure?.gradient != null && Math.abs(lakeState.pressure.gradient) < 1}
                  isBad={lakeState?.pressure?.gradient != null && Math.abs(lakeState.pressure.gradient) > 2}
                  threshold="Low = stays calm"
                />
                <ModelStepCard
                  step="C" label="Calm Window" description={<>How long will it last?</>}
                  value={effectiveBoatingPrediction?.glassUntil
                    ? `Until ${effectiveBoatingPrediction.glassUntil > 12 ? `${effectiveBoatingPrediction.glassUntil - 12} PM` : `${effectiveBoatingPrediction.glassUntil} AM`}`
                    : effectiveBoatingPrediction?.isGlass ? 'NOW' : '--'}
                  explanation={effectiveBoatingPrediction?.isGlass ? 'Calm right now' : 'Monitoring...'}
                  isGood={effectiveBoatingPrediction?.isGlass || (currentWindSpeed != null && currentWindSpeed <= 3)}
                  isBad={currentWindSpeed != null && currentWindSpeed > (activityConfig.thresholds?.rough ?? 15)}
                  threshold="Morning is best"
                />
              </div>
            </div>
            )}

            <DetailedPanels
              selectedActivity={selectedActivity}
              selectedLake={selectedLake}
              activityConfig={activityConfig}
              lakeState={lakeState}
              mesoData={mesoData}
              correlation={correlation}
              boatingPrediction={effectiveBoatingPrediction}
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
              setSelectedLake={handleSelectLake}
            />
          </>
        )}

      </main>
      </Suspense>
      )}

      {!showOnboarding && (
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
            AI-driven forecasting for Utah's lakes and mountains
          </p>
        </div>
      </footer>
      )}
    </div>
  );
}

