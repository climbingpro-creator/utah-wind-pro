/**
 * Dashboard.jsx - Refactored for Freemium Trust Funnel
 * 
 * Component Hierarchy (in order):
 * 1. Header & Discipline Selector (Kite/Sail/Foil)
 * 2. Single Interactive Wind Map (removed static duplicate)
 * 3. Live Spot Leaderboard (merged "Where to Go" + "Best Wind Right Now")
 * 4. Today's Basic Overview (Highs/Lows, windows found)
 * 5. Accuracy Scoreboard (86% vs 58% NWS) — TRUST BUILDER
 * 6. Pro Upgrade Banner (Paywall)
 * 7. Smart Hourly Forecast AI & Physics
 * 8. Thermal Confidence & Shore Safety
 * 9. Wind Flow Cascade
 * 10. Multi-Stage Analysis
 * 11. Extended Outlook (Consolidated Weekly)
 * 
 * De-duplication:
 * - Removed static Utah Lake Wind Map (keep only interactive Leaflet)
 * - Merged SpotRanker + ForecastIntelligenceHero into single leaderboard
 * - Consolidated WeekPlanner + WeeklyBestDays + FiveDayForecast into ExtendedOutlook
 * - Sensor cards now use collapsible accordion for history
 */

import { useState, useRef, Suspense, lazy, useCallback, useEffect, useMemo } from 'react';
import { useWeatherData, getHourlyForecast, findAllSportWindows, LAKE_CONFIGS } from '@utahwind/weather';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SafeComponent, IntelligentRecommendations, ModuleLoader } from '@utahwind/ui';
import { CreditCard, Wind, Target, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

import ForecastIntelligenceHero from './ForecastIntelligenceHero';
import WelcomeCard from './WelcomeCard';
import AppHeader from './AppHeader';
import { LakeSelector } from './LakeSelector';
import { ToastContainer } from './ToastNotification';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import CollapsibleSensorCard from './CollapsibleSensorCard';

const DetailedPanels = lazy(() => import('./DetailedPanels'));
const VectorWindMap = lazy(() => import('./VectorWindMap').then(m => ({ default: m.VectorWindMap })));
const NotificationSettings = lazy(() => import('./NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const LearningDashboard = lazy(() => import('./LearningDashboard'));
const ParaglidingMode = lazy(() => import('./ParaglidingMode'));
const ProUpgrade = lazy(() => import('./ProUpgrade'));
const WindSeekerTemplate = lazy(() => import('./WindSeekerTemplate'));
const WinterRiderTemplate = lazy(() => import('./WinterRiderTemplate'));
const LearnView = lazy(() => import('./LearnView'));
const PhotoSubmit = lazy(() => import('./PhotoSubmit'));
const SMSAlertSettings = lazy(() => import('./SMSAlertSettings'));
const ModelStepCard = lazy(() => import('./ModelStepCard'));
const SignalConvergence = lazy(() => import('./SignalConvergence'));
const PropagationTracker = lazy(() => import('./PropagationTracker'));
const TodayTimeline = lazy(() => import('./TodayTimeline'));
const ProTeaser = lazy(() => import('./ProTeaser'));
const Modal = lazy(() => import('@utahwind/ui').then(m => ({ default: m.Modal })));
const AccuracyScoreboard = lazy(() => import('./AccuracyScoreboard'));
const ProUpgradeBanner = lazy(() => import('./ProUpgradeBanner'));
const WeekPlanner = lazy(() => import('./WeekPlanner'));
const WeeklyBestDays = lazy(() => import('./WeeklyBestDays'));
const FiveDayForecast = lazy(() => import('./FiveDayForecast').then(m => ({ default: m.FiveDayForecast })));

const FREE_LAKES = new Set([
  'utah-lake', 'utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-vineyard',
  'potm-south', 'potm-north', 'inspo',
]);

function ChunkFallback({ className = 'h-32' }) {
  return <div className={`animate-pulse rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] ${className}`} />;
}

function ManageSubscriptionFooter({ isPro, rawTier }) {
  const { manageSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isPro || rawTier !== 'pro') return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await manageSubscription();
    } catch (err) {
      console.error('Failed to open subscription portal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mb-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
    >
      <CreditCard className="w-4 h-4" />
      {loading ? 'Opening...' : 'Manage Subscription'}
    </button>
  );
}

/**
 * ExtendedOutlook - Consolidated Weekly Forecasts
 * Combines: WeekPlanner, WeeklyBestDays, FiveDayForecast
 */
function ExtendedOutlook({ selectedActivity, selectedLake }) {
  const [activeTab, setActiveTab] = useState('planner');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'planner', label: 'Week Planner', icon: Calendar },
    { id: 'bestdays', label: 'Best Days', icon: Target },
    { id: 'forecast', label: '5-Day Forecast', icon: TrendingUp },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Extended Outlook</h3>
      </div>

      {/* Tab Navigation */}
      <div className={`flex gap-1 p-1 rounded-lg mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all
              ${activeTab === tab.id
                ? (isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-white text-sky-600 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Suspense fallback={<ChunkFallback className="h-48" />}>
        {activeTab === 'planner' && (
          <SafeComponent name="Week Planner">
            <WeekPlanner activity={selectedActivity} locationId={selectedLake} />
          </SafeComponent>
        )}
        {activeTab === 'bestdays' && (
          <SafeComponent name="Weekly Best Days">
            <WeeklyBestDays selectedActivity={selectedActivity} />
          </SafeComponent>
        )}
        {activeTab === 'forecast' && (
          <SafeComponent name="5-Day Forecast">
            <FiveDayForecast locationId={selectedLake} />
          </SafeComponent>
        )}
      </Suspense>
    </div>
  );
}

/**
 * LiveSensorNetwork - Collapsible sensor cards
 * Shows: Station Name, Current Wind, Direction, Gust, 3HR Trend
 * History is hidden in accordion by default
 */
function LiveSensorNetwork({ stations, history, isLoading, theme }) {
  const [expanded, setExpanded] = useState(false);
  const isDark = theme === 'dark';
  const firingCount = stations?.filter(s => (s.speed ?? s.windSpeed ?? 0) >= 5).length || 0;
  const displayStations = expanded ? stations : stations?.slice(0, 6);

  return (
    <div aria-live="polite" aria-atomic="false">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Wind className="w-4 h-4 text-sky-500" />
          Live Sensor Network
        </h2>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
          firingCount > 0 
            ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
            : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
        }`}>
          {firingCount} firing
        </span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {displayStations?.map((station, index) => (
          <CollapsibleSensorCard
            key={station.id || index}
            station={station}
            history={history?.[station.id]}
            isPersonalStation={station.isPWS}
          />
        ))}
        {isLoading && !stations?.length && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-xl p-3 animate-pulse ${isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
                <div className="h-4 bg-[var(--border-color)] rounded w-2/3 mb-3" />
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-[var(--border-color)] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-[var(--border-color)] rounded w-1/2" />
                    <div className="h-3 bg-[var(--border-color)] rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Show More/Less Toggle */}
      {stations?.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
            border transition-colors
            ${isDark 
              ? 'border-slate-700 text-slate-400 hover:bg-slate-800/50' 
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }
          `}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show All {stations.length} Sensors
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function Dashboard() {
  const [selectedLake, setSelectedLake] = useState(() => localStorage.getItem('uwf_default_spot') || 'utah-lake');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(() => localStorage.getItem('uwf_default_sport') || 'kiting');
  const [showPhotoSubmit, setShowPhotoSubmit] = useState(false);
  const [showSMSSettings, setShowSMSSettings] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  
  const { lakeState, history, status, isLoading, error, lastUpdated, refresh } = useWeatherData(selectedLake);
  const { theme } = useTheme();
  const { isPro, rawTier, trialActive, trialDaysLeft, openPaywall, showPaywall } = useAuth();
  const contentRef = useRef(null);
  const isFirstRender = useRef(true);

  const [prediction, setPrediction] = useState(null);
  const [smsPrefs, setSmsPrefs] = useState({ enabled: false, phone: '' });

  useEffect(() => {
    import('../services/SMSNotificationService').then(m => {
      setSmsPrefs(m.getSMSPrefs());
    });
  }, []);

  useEffect(() => {
    if (!lakeState?.wind?.stations) {
      setPrediction(null);
      return;
    }
    
    Promise.all([
      import('../services/UnifiedPredictor'),
      import('../hooks/useModelContext'),
    ]).then(([predictorModule, contextModule]) => {
      const { predict: unifiedPredict } = predictorModule;
      const modelContext = contextModule.getModelContext?.() || {};
      try {
        const result = unifiedPredict(
          selectedLake,
          selectedActivity,
          lakeState.wind.stations,
          modelContext,
          lakeState.config
        );
        setPrediction(result);
      } catch (err) {
        console.error('UnifiedPredictor error:', err);
        setPrediction(null);
      }
    });
  }, [selectedLake, selectedActivity, lakeState?.wind?.stations, lakeState?.config]);

  const handleSelectLake = useCallback((lakeId) => {
    if (isPro || FREE_LAKES.has(lakeId)) {
      setSelectedLake(lakeId);
    } else {
      openPaywall();
    }
  }, [isPro, openPaywall]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 80);
    return () => clearTimeout(t);
  }, [selectedActivity]);
  
  useEffect(() => {
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

  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;

  const mesoData = useMemo(() => {
    if (!lakeState) return null;
    const data = { stations: lakeState.wind?.stations || [] };
    if (lakeState.kslcStation) data.KSLC = lakeState.kslcStation;
    if (lakeState.kpvuStation) data.KPVU = lakeState.kpvuStation;
    if (lakeState.utalpStation) data.UTALP = lakeState.utalpStation;
    if (lakeState.earlyIndicator) data.QSF = lakeState.earlyIndicator;
    return data;
  }, [lakeState]);

  const pressureData = useMemo(() => lakeState?.pressure ? {
    gradient: lakeState.pressure.gradient,
    isBustCondition: lakeState.pressure.gradient != null && Math.abs(lakeState.pressure.gradient) > 2.0,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null, [lakeState?.pressure]);

  const effectiveThermalPrediction = prediction?.thermalPrediction || lakeState?.thermalPrediction;
  const effectiveBoatingPrediction = prediction?.boatingPrediction || null;

  const effectiveDecision = prediction ? {
    windSpeed: prediction.wind?.current?.speed ?? currentWindSpeed,
    windGust: prediction.wind?.current?.gust ?? currentWindGust,
    windDirection: prediction.wind?.current?.dir ?? currentWindDirection,
  } : {
    windSpeed: currentWindSpeed,
    windGust: currentWindGust,
    windDirection: currentWindDirection,
  };

  const [sportWindows, setSportWindows] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function loadWindows() {
      try {
        const hourly = await getHourlyForecast(selectedLake);
        if (!cancelled && hourly) {
          const cfg = LAKE_CONFIGS[selectedLake];
          const locationInfo = {
            idealAxis: cfg?.thermal?.optimalDirection?.min,
            hasSnowpack: !!cfg?.snowkite,
          };
          setSportWindows(findAllSportWindows(selectedLake, hourly, locationInfo));
        }
      } catch (_e) { /* forecast unavailable */ }
    }
    loadWindows();
    return () => { cancelled = true; };
  }, [selectedLake]);

  useEffect(() => {
    if (!lakeState) return;
    
    import('../services/NotificationService').then(({ checkAndNotify }) => {
      import('@utahwind/weather').then(({ getFullForecast }) => {
        const conditions = {
          pressureGradient: lakeState.pressure?.gradient,
          temperature: lakeState.pws?.temperature,
          windSpeed: lakeState.pws?.windSpeed || lakeState.wind?.stations?.[0]?.speed,
          windDirection: lakeState.pws?.windDirection || lakeState.wind?.stations?.[0]?.direction,
          thermalDelta: lakeState.thermal?.delta,
        };
        const forecast = getFullForecast(selectedLake, conditions);
        checkAndNotify(forecast, lakeState.config?.name || 'Utah Lake');
      });
    });
  }, [lakeState, selectedLake]);

  const formatTime = useCallback((date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }, []);

  const getSMSPrefsCallback = useCallback(() => smsPrefs, [smsPrefs]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' 
        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
    }`}>
      <ToastContainer />

      {/* ═══════════════════════════════════════════════════════════════════
          1. HEADER & DISCIPLINE SELECTOR
          ═══════════════════════════════════════════════════════════════════ */}
      <AppHeader
        theme={theme}
        activityConfig={activityConfig}
        error={error}
        formatTime={formatTime}
        selectedLake={selectedLake}
        selectedActivity={selectedActivity}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isPro={isPro}
        rawTier={rawTier}
        trialActive={trialActive}
        trialDaysLeft={trialDaysLeft}
        showLearningDashboard={showLearningDashboard}
        lakeState={lakeState}
        getSMSPrefs={getSMSPrefsCallback}
        onSMSClick={() => isPro ? setShowSMSSettings(true) : openPaywall()}
        onPhotoClick={() => setShowPhotoSubmit(true)}
        onNotificationsClick={() => isPro ? setShowNotificationSettings(true) : openPaywall()}
        onLearningClick={() => setShowLearningDashboard(!showLearningDashboard)}
        onRefresh={refresh}
        onUpgradeClick={openPaywall}
      />

      {/* Modals */}
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
      {showLearningDashboard && (
        <Suspense fallback={null}>
          <Modal isOpen={showLearningDashboard} onClose={() => setShowLearningDashboard(false)} label="How Our AI Works" className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLearningDashboard(false)}
              aria-label="Close learning dashboard"
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 active:text-white z-10"
            >
              ✕
            </button>
            <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
              <LearnView onUpgradeClick={openPaywall} isPro={isPro} />
            </Suspense>
          </Modal>
        </Suspense>
      )}
      {showPaywall && (
        <Suspense fallback={null}>
          <ProUpgrade />
        </Suspense>
      )}

      {/* Trial Banner */}
      {trialActive && rawTier !== 'pro' && (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 mt-4">
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${
            theme === 'dark' ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-100'
          }`}>
            <span className={theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}>
              <span className="font-bold">Pro trial active</span> — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </span>
            <button
              onClick={openPaywall}
              className="min-h-[44px] px-4 text-xs font-bold text-sky-500 active:text-sky-400 transition-colors"
            >
              Subscribe
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-6 space-y-5">

        <WelcomeCard />

        {/* ═══════════════════════════════════════════════════════════════════
            2. SINGLE INTERACTIVE WIND MAP
            (Removed static map duplicate - keeping only Leaflet/MapLibre)
            ═══════════════════════════════════════════════════════════════════ */}
        <Suspense fallback={<ChunkFallback className="h-80" />}>
          <VectorWindMap
            selectedLake={selectedLake}
            windData={{
              direction: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
              speed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
              waterTemp: lakeState?.pws?.waterTemp ?? null,
            }}
            stationData={lakeState?.wind?.stations}
            isLoading={isLoading}
            onSelectLaunch={handleSelectLake}
          />
        </Suspense>

        {/* ═══════════════════════════════════════════════════════════════════
            3. LIVE SPOT LEADERBOARD (Merged)
            Combines: ForecastIntelligenceHero (cross-location) + SpotRanker
            Now a single unified component showing "Where to Go"
            ═══════════════════════════════════════════════════════════════════ */}
        <ForecastIntelligenceHero
          selectedActivity={selectedActivity}
          onSelectActivity={setSelectedActivity}
          onSelectSpot={handleSelectLake}
          currentWindSpeed={currentWindSpeed}
          currentWindDirection={currentWindDirection}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            4. TODAY'S BASIC OVERVIEW
            Shows: Best Time Windows, Highs/Lows, "13h window found"
            ═══════════════════════════════════════════════════════════════════ */}
        {sportWindows && Object.keys(sportWindows).length > 0 && (
          <SafeComponent name="Sport Intelligence">
            <IntelligentRecommendations
              windows={sportWindows}
              sportFilter={
                selectedActivity === 'kiting' ? ['foil-kite', 'windsurfing', 'sailing'] :
                selectedActivity === 'paragliding' ? ['paragliding'] :
                selectedActivity === 'sailing' ? ['sailing', 'foil-kite', 'windsurfing'] :
                selectedActivity === 'snowkiting' ? ['snowkiting', 'foil-kite'] :
                selectedActivity === 'windsurfing' ? ['windsurfing', 'foil-kite', 'sailing'] :
                null
              }
              title="Best Time Windows Today"
              currentApp="wind"
              crossAppUrls={{ water: import.meta.env.VITE_WATER_APP_URL }}
              isPro={isPro}
              onUnlockPro={openPaywall}
            />
          </SafeComponent>
        )}

        <SafeComponent name="Today Timeline">
          <Suspense fallback={<ChunkFallback className="h-48" />}>
            <TodayTimeline locationId={selectedLake} activity={selectedActivity} unifiedHourly={prediction?.hourly} />
          </Suspense>
        </SafeComponent>

        {/* ═══════════════════════════════════════════════════════════════════
            5. ACCURACY SCOREBOARD — TRUST BUILDER
            "86% UtahWindFinder vs 58% NWS" — Critical for conversion
            ═══════════════════════════════════════════════════════════════════ */}
        <Suspense fallback={<ChunkFallback className="h-32" />}>
          <SafeComponent name="Accuracy Scoreboard">
            <AccuracyScoreboard />
          </SafeComponent>
        </Suspense>

        {/* ═══════════════════════════════════════════════════════════════════
            6. PRO UPGRADE BANNER (Paywall)
            Beautiful gradient banner placed AFTER trust is established
            ═══════════════════════════════════════════════════════════════════ */}
        {!isPro && (
          <Suspense fallback={null}>
            <ProUpgradeBanner onUpgrade={openPaywall} />
          </Suspense>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            7-11. ADVANCED FEATURES (Below Paywall)
            ═══════════════════════════════════════════════════════════════════ */}

        {/* Live Sensor Network - Streamlined with Collapsible History */}
        <LiveSensorNetwork
          stations={lakeState?.wind?.stations}
          history={history}
          isLoading={isLoading}
          theme={theme}
        />

        {/* Activity-Specific Templates */}
        <Suspense fallback={<ChunkFallback className="h-64" />}>
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
                  UTALP: lakeState?.utalpStation,
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
              effectiveActivityScore={null} effectiveBriefing={null}
              mesoData={mesoData} isLoading={isLoading} onSelectSpot={handleSelectLake} contentRef={contentRef}
            />
          ) : (
            <WindSeekerTemplate
              selectedActivity={selectedActivity} selectedLake={selectedLake} activityConfig={activityConfig} theme={theme}
              currentWindSpeed={currentWindSpeed} currentWindGust={currentWindGust} currentWindDirection={currentWindDirection}
              effectiveDecision={effectiveDecision} lakeState={lakeState} history={history}
              prediction={prediction} effectiveThermalPrediction={effectiveThermalPrediction} effectiveBoatingPrediction={effectiveBoatingPrediction}
              effectiveActivityScore={null} effectiveBriefing={null} pressureData={pressureData}
              mesoData={mesoData} isLoading={isLoading} onSelectSpot={handleSelectLake} contentRef={contentRef}
            />
          )}
        </Suspense>

        {/* Extended Outlook - Consolidated Weekly Forecasts */}
        <ExtendedOutlook selectedActivity={selectedActivity} selectedLake={selectedLake} />

        <LakeSelector
          selectedLake={selectedLake}
          onSelectLake={handleSelectLake}
          stationReadings={lakeState?.wind?.stations}
          activity={selectedActivity}
          pressureData={pressureData}
        />

        {error && (
          <div className="card !border-red-500/30 p-4">
            <p className="font-semibold text-red-500 text-sm">Connection Error</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 min-h-[44px] px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold active:bg-red-500/20 transition-colors"
            >
              Tap to Retry
            </button>
          </div>
        )}

        {/* Microclimate Deep Dive Toggle */}
        <button
          onClick={() => setShowDeepDive(v => !v)}
          className={`w-full flex items-center justify-center gap-2.5 min-h-[48px] py-3 px-5 rounded-xl text-sm font-semibold transition-colors border ${
            showDeepDive
              ? 'bg-purple-500/10 border-purple-500/25 text-purple-400'
              : theme === 'dark'
                ? 'bg-white/[0.03] border-white/[0.08] text-[var(--text-secondary)] active:bg-purple-500/10 active:text-purple-400'
                : 'bg-white border-slate-200 text-slate-500 active:bg-purple-50 active:text-purple-600'
          }`}
        >
          {showDeepDive ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Microclimate Deep Dive
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Microclimate Deep Dive
            </>
          )}
        </button>

        {showDeepDive && (
          <Suspense fallback={<ModuleLoader variant="section" label="Loading deep dive..." className="h-64" />}>
            <div className="flex flex-col gap-6 mt-2">
              <SignalConvergence intelligence={null} unifiedPrediction={prediction} />

              {(prediction?.propagation || lakeState?.propagation) && activityConfig?.wantsWind && (
                <SafeComponent name="Wind Arrival Tracker">
                  <PropagationTracker propagation={prediction?.propagation || lakeState.propagation} />
                </SafeComponent>
              )}

              {activityConfig?.wantsWind && selectedActivity !== 'paragliding' && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Why We Think Wind Is Coming</h3>
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <Suspense fallback={<ChunkFallback className="h-24" />}>
                      <ModelStepCard
                        step="A" label="Pressure Gradient"
                        description="SLC vs Provo barometer"
                        value={lakeState?.pressure?.gradient != null 
                          ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${lakeState.pressure.gradient.toFixed(2)} mb`
                          : '-- mb'}
                        explanation={lakeState?.pressure?.isBusted 
                          ? 'North flow dominates — no thermal today'
                          : lakeState?.pressure?.gradient != null ? 'Gradient favorable for wind' : 'Waiting for data...'}
                        isGood={lakeState?.pressure?.gradient != null && lakeState.pressure.gradient < 0}
                        isBad={lakeState?.pressure?.isBusted}
                        threshold="North flow if > 2.0 mb"
                      />
                      <ModelStepCard
                        step="B" label="Temperature Difference"
                        description="Shore vs ridge temps"
                        value={lakeState?.thermal?.delta != null 
                          ? `${lakeState.thermal.delta > 0 ? '+' : ''}${lakeState.thermal.delta}°F`
                          : '--°F'}
                        explanation={lakeState?.thermal?.pumpActive 
                          ? 'Hot air rising — wind being pulled in!'
                          : lakeState?.thermal?.inversionTrapped ? 'Cold air trapped — no convection'
                          : lakeState?.thermal?.delta != null ? 'Heat building — wind developing' : 'Waiting for data...'}
                        isGood={lakeState?.thermal?.pumpActive}
                        isBad={lakeState?.thermal?.inversionTrapped}
                        threshold="Active when > 10°F gap"
                      />
                      <ModelStepCard
                        step="C" label="Your Station"
                        description={`Live reading at ${lakeState?.pws?.name || 'your spot'}`}
                        value={lakeState?.pws?.windSpeed != null 
                          ? `${lakeState.pws.windSpeed.toFixed(1)} mph ${lakeState.pws.windDirection}°`
                          : '-- mph'}
                        explanation={lakeState?.thermalPrediction?.direction?.status === 'optimal'
                          ? 'Wind direction is perfect'
                          : lakeState?.thermalPrediction?.direction?.status === 'wrong' ? 'Wrong direction — wind not arriving here'
                          : 'Checking arrival at your spot...'}
                        isGood={lakeState?.thermalPrediction?.direction?.status === 'optimal'}
                        isBad={lakeState?.thermalPrediction?.direction?.status === 'wrong'}
                        threshold="Confirms wind arrival"
                      />
                    </Suspense>
                  </div>
                </div>
              )}

              <DetailedPanels
                selectedActivity={selectedActivity}
                selectedLake={selectedLake}
                activityConfig={activityConfig}
                lakeState={lakeState}
                mesoData={mesoData}
                correlation={null}
                boatingPrediction={effectiveBoatingPrediction}
                currentWindSpeed={currentWindSpeed}
                currentWindGust={currentWindGust}
                currentWindDirection={currentWindDirection}
                pressureData={pressureData}
                history={history}
                swingAlerts={[]}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                error={error}
                refresh={refresh}
                status={status}
                theme={theme}
                setSelectedLake={handleSelectLake}
              />
            </div>
          </Suspense>
        )}

      </main>

      <footer className="border-t border-[var(--border-color)] mt-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 text-center">
          {!isPro && (
            <button
              onClick={openPaywall}
              className="mb-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-white active:opacity-90 transition-opacity"
            >
              Unlock All Features — Try Pro Free
            </button>
          )}
          <ManageSubscriptionFooter isPro={isPro} rawTier={rawTier} />
          <p className="text-sm font-semibold text-[var(--text-tertiary)]">UtahWindFinder</p>
          <p className="text-[11px] mt-1 text-[var(--text-tertiary)] opacity-60">
            AI-driven forecasting for Utah's lakes and mountains
          </p>
        </div>
      </footer>
    </div>
  );
}
