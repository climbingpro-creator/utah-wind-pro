import { useState } from 'react';
import * as React from 'react';
import { RefreshCw, Wifi, WifiOff, TrendingUp, Wind, Thermometer, ArrowUpDown, MapPin, Navigation, Bell, Brain, AlertTriangle, Lightbulb, Ship } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WindVector } from './WindVector';
import { BustAlert } from './BustAlert';
import { ThermalStatus } from './ThermalStatus';
import { ThermalForecast } from './ThermalForecast';
import { LakeSelector } from './LakeSelector';
import { ToastContainer } from './ToastNotification';
import { useLakeData } from '../hooks/useLakeData';
import { NorthFlowGauge } from './NorthFlowGauge';
import { KiteSafetyIndicator } from './KiteSafety';
import { ForecastPanel } from './ForecastPanel';
import { FiveDayForecast } from './FiveDayForecast';
import { WindMap } from './WindMap';
import { NotificationSettings } from './NotificationSettings';
import { checkAndNotify } from '../services/NotificationService';
import { getFullForecast } from '../services/ForecastService';
import LearningDashboard from './LearningDashboard';
import AccuracyScoreboard from './AccuracyScoreboard';
import SpotTimeline from './SpotTimeline';
import WhyExplainer from './WhyExplainer';
import PatternMatch from './PatternMatch';
import ActivityMode, { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore, getActivityHeroImage } from './ActivityMode';
import GlassScore from './GlassScore';
import { predictGlass } from '../services/BoatingPredictor';
import WaterForecast from './WaterForecast';
import SmartTimeline from './SmartTimeline';
import WeekPlanner from './WeekPlanner';
import SpotRanker from './SpotRanker';
import IndicatorCascade from './IndicatorCascade';
import WeeklyBestDays from './WeeklyBestDays';
import RaceDayMode from './RaceDayMode';
import SevereWeatherAlerts from './SevereWeatherAlerts';
import DataFreshness from './DataFreshness';
import ParaglidingMode from './ParaglidingMode';
import FishingMode from './FishingMode';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SafeComponent } from './ErrorBoundary';
import ProGate from './ProGate';
import ProUpgrade from './ProUpgrade';
import { calculateCorrelatedWind } from '../services/CorrelationEngine';
import { monitorSwings } from '../services/FrontalTrendPredictor';
import { generateBriefing } from '../services/MorningBriefing';
import TrendPatterns from './TrendPatterns';
import PropagationBanner from './PropagationBanner';
import SessionFeedback from './SessionFeedback';
import SessionReplay from './SessionReplay';
import TodayHero from './TodayHero';
import SnowkiteForecast from './SnowkiteForecast';
import PhotoSubmit from './PhotoSubmit';
import SMSAlertSettings from './SMSAlertSettings';
import { getSMSPrefs, processConditions } from '../services/SMSNotificationService';

function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

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
  
  // Get best paragliding site data
  const getParaglidingScore = () => {
    if (selectedActivity !== 'paragliding') return null;
    
    const fpsSpeed = fpsStation?.speed || fpsStation?.windSpeed;
    const fpsDir = fpsStation?.direction || fpsStation?.windDirection;
    const fpsGust = fpsStation?.gust || fpsStation?.windGust;
    
    const utalpSpeed = utalpStation?.speed || utalpStation?.windSpeed;
    const utalpDir = utalpStation?.direction || utalpStation?.windDirection;
    const utalpGust = utalpStation?.gust || utalpStation?.windGust;
    
    const fpsDirectionOk = fpsDir >= 110 && fpsDir <= 250;
    const fpsSpeedOk = fpsSpeed >= 5 && fpsSpeed <= 20;
    const fpsGustOk = !fpsGust || (fpsGust / Math.max(fpsSpeed, 1)) <= 1.4;

    const utalpDirectionOk = utalpDir >= 315 || utalpDir <= 45;
    const utalpSpeedOk = utalpSpeed >= 5 && utalpSpeed <= 18;
    const utalpGustOk = !utalpGust || (utalpGust - utalpSpeed) <= 5;

    let fpsScore = 0;
    if (fpsDirectionOk) fpsScore += 50;
    if (fpsDir >= 135 && fpsDir <= 210) fpsScore += 10;
    if (fpsSpeedOk) fpsScore += 30;
    if (fpsGustOk) fpsScore += 20;
    if (fpsSpeed >= 8 && fpsSpeed <= 16) fpsScore += 10;

    let utalpScore = 0;
    if (utalpDirectionOk) utalpScore += 50;
    if (utalpSpeedOk) utalpScore += 30;
    if (utalpGustOk) utalpScore += 20;
    if (utalpSpeed >= 12 && utalpSpeed <= 16) utalpScore += 10;
    
    // Use the better site
    const bestScore = Math.max(fpsScore, utalpScore);
    const bestSite = fpsScore >= utalpScore ? 'Flight Park South' : 'Flight Park North';
    const bestSpeed = fpsScore >= utalpScore ? fpsSpeed : utalpSpeed;
    const bestDir = fpsScore >= utalpScore ? fpsDir : utalpDir;
    const bestGust = fpsScore >= utalpScore ? fpsGust : utalpGust;
    
    let message = '';
    if (bestScore >= 80) {
      message = `Excellent at ${bestSite} - ${bestSpeed?.toFixed(0)} mph from ${bestDir?.toFixed(0)}°`;
    } else if (bestScore >= 50) {
      message = `Flyable at ${bestSite} - ${bestSpeed?.toFixed(0)} mph`;
    } else if (bestSpeed != null) {
      message = `Marginal - ${bestSpeed?.toFixed(0)} mph at ${bestDir?.toFixed(0)}°`;
    } else {
      message = 'No data from Flight Park stations';
    }
    
    const gustFactor = bestGust && bestSpeed ? bestGust / bestSpeed : 1;
    
    return {
      score: Math.min(100, bestScore),
      message,
      gustFactor,
      bestSite,
    };
  };
  
  const activityScore = selectedActivity === 'paragliding'
    ? getParaglidingScore()
    : (selectedActivity && currentWindSpeed != null
      ? calculateActivityScore(selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection)
      : null);
  
  const glassScore = calculateGlassScore(currentWindSpeed, currentWindGust);

  // Boating AI prediction (trained on 4,984 observations)
  const boatingPrediction = React.useMemo(() => {
    try {
      return predictGlass(
        { speed: currentWindSpeed, gust: currentWindGust },
        { slcPressure: lakeState?.pressure?.slc, provoPressure: lakeState?.pressure?.provo, gradient: lakeState?.pressure?.gradient },
      );
    } catch (e) { return null; }
  }, [currentWindSpeed, currentWindGust, lakeState?.pressure]);

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
    } catch (e) { return null; }
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

  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const pressureData = lakeState?.pressure ? {
    gradient: lakeState.pressure.gradient,
    isBustCondition: lakeState.pressure.gradient != null && Math.abs(lakeState.pressure.gradient) > 2.0,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' 
        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
    }`}>
      <ToastContainer />
      
      <header className={`border-b sticky top-0 z-40 transition-colors duration-200 ${
        theme === 'dark' 
          ? 'border-slate-800 bg-slate-950/95 backdrop-blur-md' 
          : 'border-slate-200 bg-white/95 backdrop-blur-md'
      }`}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-extrabold tracking-tight text-sky-500">
                UtahWindFinder
              </h1>
              <span className={`hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full ${
                theme === 'dark' ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'
              }`}>
                {activityConfig?.description || 'AI Forecasting'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${
                theme === 'dark' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
              }`}>
                {error ? (
                  <WifiOff className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>{formatTime(lastUpdated)}</span>
              </div>

              <button
                onClick={() => setShowSMSSettings(true)}
                className={`p-2 rounded-lg transition-colors relative ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
                title="Text Alerts"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {getSMSPrefs().enabled && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setShowPhotoSubmit(true)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
                title="Submit Photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>

              <button
                onClick={() => setShowNotificationSettings(true)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]' 
                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowLearningDashboard(!showLearningDashboard)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showLearningDashboard 
                    ? 'bg-sky-500 text-white' 
                    : (theme === 'dark' 
                      ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-sky-400' 
                      : 'hover:bg-slate-100 text-slate-400 hover:text-sky-600')
                }`}
                title={lakeState?.thermalPrediction?.isUsingLearnedWeights
                  ? `Learning Active (v${lakeState.thermalPrediction.weightsVersion})`
                  : 'Learning System — collecting data'}
              >
                <Brain className="w-4 h-4" />
                {lakeState?.thermalPrediction?.isUsingLearnedWeights && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
              </button>

              <button
                onClick={refresh}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                  theme === 'dark' 
                    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]' 
                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <ThemeToggle />

              {!isPro && (
                <button
                  onClick={openPaywall}
                  className="ml-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  Upgrade
                </button>
              )}
              {isPro && trialActive && (
                <span className="ml-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Trial: {trialDaysLeft}d
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      />
      <PhotoSubmit
        isOpen={showPhotoSubmit}
        onClose={() => setShowPhotoSubmit(false)}
      />
      <SMSAlertSettings
        isOpen={showSMSSettings}
        onClose={() => setShowSMSSettings(false)}
      />

      {/* Learning Dashboard Modal/Panel */}
      {showLearningDashboard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowLearningDashboard(false)} />
            <div className="relative bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowLearningDashboard(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <div className="p-2 space-y-4">
                <AccuracyScoreboard />
                <LearningDashboard />
              </div>
            </div>
          </div>
        </div>
      )}

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

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 section-stack">
        <TodayHero
          windSpeed={currentWindSpeed}
          windGust={currentWindGust}
          thermalPrediction={lakeState?.thermalPrediction}
          boatingPrediction={boatingPrediction}
          onSelectActivity={setSelectedActivity}
        />

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
        <div>
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
                ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${lakeState.pressure.gradient.toFixed(2)} mb`
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
                ? `${lakeState.pws.windSpeed.toFixed(1)} mph ${lakeState.pws.windDirection}°`
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
        {activityScore && !activityConfig?.specialMode && (() => {
          const score = activityScore.score;
          const prediction = lakeState?.thermalPrediction;
          const prob = prediction?.probability || 0;
          const startHour = prediction?.startHour;
          const windType = prediction?.windType;
          const consistencyForecast = prediction?.consistencyForecast;
          const wantsWind = activityConfig?.wantsWind !== false;
          const currentHour = new Date().getHours();

          // Determine if there's a predicted opportunity
          const hasForecastOpp = wantsWind && prob >= 40 && score < 60;
          const isForecastBetter = wantsWind && prob > score;
          const isGoodNow = score >= 60;
          const isGreatNow = score >= 75;

          // For boating/glass — use boating prediction
          const hasGlassOpp = !wantsWind && boatingPrediction?.probability >= 45;

          // Build the display
          let displayScore = score;
          let headline = `${activityConfig?.name}: ${activityScore.message}`;
          let subline = null;
          let bannerColor = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
          let badge = null;
          let arriveTime = null;

          if (isGreatNow) {
            displayScore = score;
            headline = `${activityConfig?.name} is ON!`;
            subline = `${currentWindSpeed?.toFixed(0) || '--'} mph — get out there!`;
            bannerColor = 'green';
            badge = { text: 'GO', color: 'bg-green-500 text-white animate-pulse' };
          } else if (isGoodNow && isForecastBetter) {
            displayScore = score;
            headline = `Good ${activityConfig?.name} now — getting better!`;
            subline = consistencyForecast?.description || `${prob}% probability, building to peak`;
            bannerColor = 'green';
            badge = { text: 'IMPROVING', color: 'bg-green-500/20 text-green-400 border border-green-500/50' };
          } else if (hasForecastOpp) {
            displayScore = prob;
            const timeStr = startHour ? (startHour > 12 ? `${startHour - 12} PM` : `${startHour} AM`) : null;
            headline = timeStr
              ? `${activityConfig?.name} Expected at ${timeStr}`
              : `${activityConfig?.name} Likely Today`;
            subline = windType === 'thermal'
              ? (consistencyForecast?.description || 'Thermal cycle building — smooth, consistent wind expected')
              : windType === 'north_flow'
                ? 'North flow developing — stronger conditions incoming'
                : `${prob}% probability — conditions are building`;
            bannerColor = prob >= 60 ? 'green' : 'yellow';
            badge = { text: 'PREDICTED', color: prob >= 60 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' };
            if (timeStr) arriveTime = timeStr;
          } else if (hasGlassOpp && !wantsWind) {
            displayScore = boatingPrediction.probability;
            headline = boatingPrediction.isGlass
              ? 'Glass Conditions Now!'
              : boatingPrediction.glassWindow?.start
                ? `Glass Window: ${boatingPrediction.glassWindow.start} – ${boatingPrediction.glassWindow.end}`
                : 'Calm Conditions Possible';
            subline = boatingPrediction.recommendation;
            bannerColor = boatingPrediction.probability >= 60 ? 'green' : boatingPrediction.probability >= 40 ? 'yellow' : 'red';
            if (boatingPrediction.isGlass) badge = { text: 'GLASS', color: 'bg-emerald-500 text-white animate-pulse' };
          } else {
            headline = `${activityConfig?.name}: ${activityScore.message}`;
          }

          const colorMap = {
            green: theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-100 border-green-300',
            yellow: theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-100 border-yellow-300',
            red: theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-100 border-red-300',
          };
          const textColorMap = {
            green: theme === 'dark' ? 'text-green-400' : 'text-green-700',
            yellow: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700',
            red: theme === 'dark' ? 'text-red-400' : 'text-red-700',
          };

          return (
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{activityConfig?.icon}</span>
                  <div className="min-w-0">
                    <div className={`font-bold text-base ${textColorMap[bannerColor]}`}>
                      {headline}
                    </div>
                    {subline && (
                      <div className="text-sm mt-0.5 text-[var(--text-secondary)]">{subline}</div>
                    )}
                    {arriveTime && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                        Be there by {arriveTime}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className={`data-number ${textColorMap[bannerColor]}`}>
                    {displayScore}
                  </div>
                  <div className="data-label mt-1">score</div>
                  {badge && (
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${badge.color}`}>
                      {badge.text}
                    </div>
                  )}
                  {!badge && activityScore.gustFactor > 1.3 && (
                    <div className="text-[10px] px-2 py-0.5 rounded mt-1 flex items-center justify-center gap-1 text-amber-500 bg-amber-500/10">
                      <AlertTriangle className="w-3 h-3" /> Gusty
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          {/* Left Column - Gauges */}
          <div className="lg:col-span-1 space-y-4">
            {activityConfig?.wantsWind ? (
              <div className="card flex flex-col items-center">
                <span className="data-label mb-3">
                  {selectedActivity === 'sailing' ? 'Racing Wind Probability' : 'Thermal Probability'}
                </span>
                <ConfidenceGauge value={lakeState?.probability || 0} size={180} />

                {(() => {
                  const stats = lakeState?.thermalPrediction?.statistics;
                  const hasData = stats?.sampleSize > 0;
                  return (
                    <div className={`mt-2 text-[10px] px-2 py-1 rounded-full font-semibold ${
                      hasData
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {hasData ? `Based on ${stats.sampleSize.toLocaleString()} days of data` : 'Estimated — limited local data'}
                    </div>
                  );
                })()}

                {status && (
                  <div className={`mt-3 px-4 py-2 rounded-lg text-center ${status.bgColor}`}>
                    <p className={`font-medium text-sm ${status.color}`}>
                      {status.message}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Calm-seeking activities: Show Glass Score */
              <GlassScore 
                windSpeed={currentWindSpeed}
                windGust={currentWindGust}
                thermalStartHour={lakeState?.thermalPrediction?.startHour || 10}
                size={180}
              />
            )}

            {boatingPrediction && (selectedActivity === 'boating' || selectedActivity === 'paddling') && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Ship className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Glass Forecast</span>
                  <span className="text-[9px] font-bold bg-sky-500/10 text-sky-500 px-1.5 py-0.5 rounded ml-auto">AI</span>
                </div>
                <div className="text-center mb-2">
                  <div className={`data-number ${
                    boatingPrediction.probability >= 60 ? 'text-emerald-500' :
                    boatingPrediction.probability >= 40 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {boatingPrediction.probability}
                  </div>
                  <div className="data-label mt-1">{boatingPrediction.waveLabel}</div>
                </div>
                {boatingPrediction.glassWindow?.start && (
                  <div className="text-xs text-sky-500 text-center font-medium">
                    Glass window: {boatingPrediction.glassWindow.start} – {boatingPrediction.glassWindow.end}
                  </div>
                )}
                <div className="text-[11px] text-[var(--text-tertiary)] text-center mt-1">
                  {boatingPrediction.recommendation}
                </div>
              </div>
            )}

            <div className="card flex flex-col items-center">
              <span className="data-label mb-3">Pressure Gradient (N↔S Flow)</span>
              <NorthFlowGauge gradient={lakeState?.pressure?.gradient} size={160} />
            </div>

            {/* Primary Wind Display - For Zig Zag, always show PWS first */}
            <PrimaryWindDisplay 
              station={lakeState?.pws || lakeState?.wind?.stations?.[0]}
              optimalDirection={lakeState?.thermalPrediction?.direction}
              isLoading={isLoading}
              pwsUnavailable={selectedLake === 'utah-lake-zigzag' && !lakeState?.pws}
            />

            {/* Kite Safety - Only show for wind sports */}
            {activityConfig?.wantsWind && (
              <KiteSafetyIndicator
                lakeId={selectedLake}
                windDirection={currentWindDirection}
                windSpeed={currentWindSpeed}
                activity={selectedActivity}
              />
            )}

            {lakeState?.thermalPrediction && (
              <ProGate feature="3-Step Prediction Model" preview="See what's driving today's wind">
                <div className="card">
                  <span className="data-label block text-center mb-3">3-Step Prediction Model</span>
                  <div className="space-y-2">
                    <FactorBar 
                      label="Step A: Gradient" 
                      value={lakeState.thermalPrediction.pressure?.score || 50} 
                      detail={lakeState.thermalPrediction.pressure?.status}
                      icon={ArrowUpDown}
                    />
                    <FactorBar 
                      label="Step B: Elevation Δ" 
                      value={lakeState.thermalPrediction.elevation?.score || 50} 
                      detail={lakeState.thermalPrediction.elevation?.status}
                      icon={Thermometer}
                    />
                    <FactorBar 
                      label="Step C: Ground Truth" 
                      value={lakeState.thermalPrediction.direction?.score || 50} 
                      detail={lakeState.thermalPrediction.direction?.status}
                      icon={MapPin}
                    />
                  </div>
                </div>
              </ProGate>
            )}

            {correlation?.activeTriggers?.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Spatial Correlation
                    </span>
                  </div>
                  {correlation.multiplier !== 1.0 && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      correlation.multiplier > 1
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {correlation.multiplier > 1 ? '+' : ''}{Math.round((correlation.multiplier - 1) * 100)}% bias
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {correlation.activeTriggers.map(trigger => (
                    <div
                      key={trigger.id}
                      className={`text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                        trigger.type === 'boost'
                          ? (theme === 'dark' ? 'bg-blue-900/60 text-blue-200' : 'bg-blue-100 text-blue-800')
                          : trigger.type === 'penalty'
                            ? (theme === 'dark' ? 'bg-red-900/60 text-red-200' : 'bg-red-100 text-red-800')
                            : trigger.type === 'confirmation'
                              ? (theme === 'dark' ? 'bg-green-900/60 text-green-200' : 'bg-green-100 text-green-800')
                              : (theme === 'dark' ? 'bg-yellow-900/60 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                      }`}
                      title={trigger.detail}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        trigger.type === 'penalty' ? 'bg-red-400' : 'bg-current animate-pulse'
                      }`} />
                      <span className="font-medium">{trigger.label}</span>
                      <span className="opacity-60">{trigger.impact}</span>
                    </div>
                  ))}
                </div>
                {correlation.refinedSpeed > 0 && correlation.baseSpeed > 0 && correlation.multiplier !== 1.0 && (
                  <div className={`mt-2 pt-2 border-t text-xs ${
                    theme === 'dark' ? 'border-blue-500/20 text-blue-400/70' : 'border-blue-200 text-blue-600/70'
                  }`}>
                    Base: {correlation.baseSpeed.toFixed(0)} mph → Refined: {correlation.refinedSpeed} mph
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* PROPAGATION ALERT — "Wind is coming!" — top priority */}
            <SafeComponent name="Propagation Banner">
              <PropagationBanner
                locationId={selectedLake}
                stationReadings={{
                  KSLC: lakeState?.kslcStation ? { speed: lakeState.kslcStation.speed ?? lakeState.kslcStation.windSpeed, direction: lakeState.kslcStation.direction ?? lakeState.kslcStation.windDirection } : null,
                  KPVU: lakeState?.kpvuStation ? { speed: lakeState.kpvuStation.speed ?? lakeState.kpvuStation.windSpeed, direction: lakeState.kpvuStation.direction ?? lakeState.kpvuStation.windDirection } : null,
                  UTALP: lakeState?.utalpStation ? { speed: lakeState.utalpStation.speed ?? lakeState.utalpStation.windSpeed, direction: lakeState.utalpStation.direction ?? lakeState.utalpStation.windDirection } : null,
                  ...(mesoData || {}),
                }}
                currentWind={{ speed: currentWindSpeed, direction: currentWindDirection }}
                translationFactor={0.55}
              />
            </SafeComponent>

            {/* Smart Hourly Forecast — powered by WindFieldEngine */}
            <ProGate feature="Smart Hourly Forecast" preview="Hour-by-hour wind predictions">
              <SmartTimeline
                activity={selectedActivity}
                locationId={selectedLake}
                currentWind={{ speed: currentWindSpeed, gust: currentWindGust, direction: currentWindDirection }}
                upstreamData={{
                  kslcSpeed: lakeState?.kslcStation?.speed,
                  kslcDirection: lakeState?.kslcStation?.direction,
                  kpvuSpeed: lakeState?.kpvuStation?.speed,
                  kpvuDirection: lakeState?.kpvuStation?.direction,
                }}
                lakeState={lakeState}
                mesoData={mesoData}
              />
            </ProGate>

            {/* NWS Hour-by-Hour Timeline — merged with our predictions */}
            <SafeComponent name="Spot Timeline">
              <SpotTimeline locationId={selectedLake} activity={selectedActivity} />
            </SafeComponent>

            {/* Wind Prediction with "Why" explanations */}
            <SafeComponent name="Why Explainer">
              <WhyExplainer locationId={selectedLake} />
            </SafeComponent>

            {/* SESSION FEEDBACK — post-session "How was it?" prompt */}
            <SafeComponent name="Session Feedback">
              <SessionFeedback
                activity={selectedActivity}
                locationId={selectedLake}
                locationName={lakeState?.config?.name || selectedLake}
                forecast={null}
              />
            </SafeComponent>

            {/* SESSION REPLAY — yesterday's predictions vs reality */}
            <SafeComponent name="Session Replay">
              <SessionReplay
                locationId={selectedLake}
                activity={selectedActivity}
                lakeState={lakeState}
              />
            </SafeComponent>

            {/* Indicator Cascade — live wind flow visualization */}
            <SafeComponent name="Indicator Cascade">
              <IndicatorCascade lakeState={lakeState} activity={selectedActivity} locationId={selectedLake} />
            </SafeComponent>

            {/* Pattern Match — similar past days */}
            <SafeComponent name="Pattern Match">
              <PatternMatch />
            </SafeComponent>

            {/* Accuracy Scoreboard — us vs NWS */}
            <SafeComponent name="Accuracy Scoreboard">
              <AccuracyScoreboard />
            </SafeComponent>

            {/* Smart Week Planner — best day this week per activity */}
            <ProGate feature="Weekly Planner" preview="Find the best day this week">
              <SafeComponent name="Week Planner">
                <WeekPlanner activity={selectedActivity} locationId={selectedLake} />
              </SafeComponent>
            </ProGate>

            {/* Sailing-specific: Race Day Mode */}
            {selectedActivity === 'sailing' && (
              <RaceDayMode
                currentWind={{
                  speed: currentWindSpeed,
                  direction: currentWindDirection,
                  gust: currentWindGust,
                }}
                windHistory={history?.wind || []}
              />
            )}

            {/* Temp Trend Patterns — 7-day cliff/climb detection */}
            <SafeComponent name="Trend Patterns">
              <TrendPatterns locationId={selectedLake} />
            </SafeComponent>

            {/* Legacy Weekly Best Days */}
            <WeeklyBestDays selectedActivity={selectedActivity} />

            {swingAlerts.length > 0 && (
              <div className="space-y-2">
                {swingAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`card flex items-start gap-3 ${
                      alert.severity === 'critical'
                        ? '!border-red-500/40'
                        : alert.severity === 'warning'
                          ? '!border-amber-500/30'
                          : '!border-sky-500/30'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${
                          alert.severity === 'critical' ? 'text-red-500'
                            : alert.severity === 'warning' ? 'text-amber-500'
                              : 'text-sky-500'
                        }`}>
                          {alert.label}
                        </span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          alert.severity === 'critical'
                            ? 'bg-red-500 text-white'
                            : alert.severity === 'warning'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-sky-500/10 text-sky-500'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {alert.detail}
                      </p>
                      <p className="text-xs mt-1 text-[var(--text-tertiary)]">
                        Wind: {alert.windExpectation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Water Forecast — for boating, paddling, fishing */}
            {(selectedActivity === 'boating' || selectedActivity === 'paddling' || selectedActivity === 'fishing') && (
              <ProGate feature="Water Conditions" preview="Wave data, safety scores & more">
                <SafeComponent name="Water Forecast">
                  <WaterForecast
                    locationId={selectedLake}
                    currentWind={{ speed: currentWindSpeed, gust: currentWindGust }}
                    pressureData={lakeState?.pressure}
                    activity={selectedActivity}
                    upstreamData={{
                      kslcSpeed: lakeState?.kslcStation?.speed,
                      kslcDirection: lakeState?.kslcStation?.direction,
                      kpvuSpeed: lakeState?.kpvuStation?.speed,
                      kpvuDirection: lakeState?.kpvuStation?.direction,
                    }}
                    lakeState={lakeState}
                    mesoData={lakeState?.wind}
                  />
                </SafeComponent>
              </ProGate>
            )}

            {/* Severe Weather Alerts - Always visible */}
            <SevereWeatherAlerts />

            {/* Data Freshness Indicator */}
            <DataFreshness
              lastUpdated={lastUpdated}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
              refreshInterval={3}
            />

            {lakeState?.thermalPrediction && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                <Brain className="w-3 h-3" />
                {lakeState.thermalPrediction.isUsingLearnedWeights ? (
                  <span>
                    Model: <span className="text-emerald-500 font-semibold">Learned</span>
                    {' '}(v{lakeState.thermalPrediction.weightsVersion ? String(lakeState.thermalPrediction.weightsVersion).slice(-6) : '—'})
                    {lakeState.thermalPrediction.speedBiasCorrection != null && lakeState.thermalPrediction.speedBiasCorrection !== 0 && (
                      <span className="ml-1 opacity-60">
                        bias: {lakeState.thermalPrediction.speedBiasCorrection > 0 ? '+' : ''}
                        {lakeState.thermalPrediction.speedBiasCorrection.toFixed(1)} mph
                      </span>
                    )}
                  </span>
                ) : (
                  <span>
                    Model: Default — <span className="opacity-60">collecting data for learning</span>
                  </span>
                )}
              </div>
            )}

            {/* Wind Map */}
            <WindMap
              selectedLake={selectedLake}
              windData={{
                direction: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                speed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
              }}
              stationData={lakeState?.wind?.stations}
              isLoading={isLoading}
              onSelectLaunch={setSelectedLake}
            />

            <ProGate feature="5-Day Forecast" preview="Plan your week ahead">
              <FiveDayForecast
                conditions={{
                  pressure: lakeState?.pws?.pressure || lakeState?.pressure?.high?.value,
                  temperature: lakeState?.pws?.temperature,
                  pressureGradient: lakeState?.pressure?.gradient,
                }}
                isLoading={isLoading}
              />
            </ProGate>

            <ForecastPanel
              lakeId={selectedLake}
              conditions={{
                pressureGradient: lakeState?.pressure?.gradient,
                temperature: lakeState?.pws?.temperature,
                windSpeed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
                windDirection: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                thermalDelta: lakeState?.thermal?.delta,
              }}
              isLoading={isLoading}
            />

            <ProGate feature="Thermal Forecast" preview="Detailed thermal wind predictions">
              <ThermalForecast
                lakeId={selectedLake}
                currentConditions={{
                  windSpeed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
                  windDirection: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                  temperature: lakeState?.pws?.temperature,
                }}
                pressureGradient={lakeState?.pressure?.gradient}
                thermalDelta={lakeState?.thermal?.delta}
                pumpActive={lakeState?.thermal?.pumpActive}
                inversionTrapped={lakeState?.thermal?.inversionTrapped}
                isLoading={isLoading}
              />
            </ProGate>

            <BustAlert 
              pressureData={pressureData} 
              isLoading={isLoading} 
            />

            <ThermalStatus
              thermalDelta={lakeState?.thermal}
              lakeshoreTemp={lakeState?.thermal?.lakeshore}
              ridgeTemp={lakeState?.thermal?.ridge}
              convergence={lakeState?.wind?.convergence}
              isLoading={isLoading}
            />
          </div>
        </div>
        )}

        </>
        )}

      </main>

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

function PrimaryWindDisplay({ station, optimalDirection, isLoading, pwsUnavailable }) {
  if (isLoading || !station) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center justify-center gap-4">
          <div className="w-14 h-14 bg-[var(--border-color)] rounded-full" />
          <div className="space-y-2">
            <div className="h-8 bg-[var(--border-color)] rounded w-24" />
            <div className="h-4 bg-[var(--border-color)] rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const speed = station.windSpeed ?? station.speed;
  const direction = station.windDirection ?? station.direction;
  const cardinal = windDirectionToCardinal(direction);
  const stationName = station.name || 'Primary Station';
  const isYourStation = station.isYourStation || station.isPWS;
  
  const isOptimal = optimalDirection?.status === 'optimal';
  const isWrong = optimalDirection?.status === 'wrong';
  
  const speedColor = speed >= 8 ? 'text-emerald-500' : speed >= 4 ? 'text-amber-500' : 'text-[var(--text-tertiary)]';
  const directionColor = isOptimal ? 'text-emerald-500' : isWrong ? 'text-red-500' : 'text-sky-500';

  return (
    <div className={`card ${
      isOptimal ? '!border-emerald-500/30' : isWrong ? '!border-red-500/30' : ''
    }`}>
      {pwsUnavailable && (
        <div className="text-xs text-amber-500 font-medium text-center mb-2 flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>PWS unavailable — showing nearest station</span>
        </div>
      )}
      <div className="text-center mb-2 flex items-center justify-center gap-1">
        {isYourStation && <span className="text-sky-500">📍</span>}
        <span className={`text-xs ${isYourStation ? 'text-sky-500 font-medium' : 'text-[var(--text-tertiary)]'}`}>
          {stationName}
        </span>
        {!isYourStation && !pwsUnavailable && <span className="text-[var(--text-tertiary)] text-[10px]">(MesoWest)</span>}
      </div>
      
      <div className="flex items-center justify-center gap-6">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            {direction != null ? (
              <Navigation 
                className={`w-7 h-7 ${directionColor} transition-transform duration-500`}
                style={{ transform: `rotate(${direction + 180}deg)` }}
              />
            ) : (
              <span className="text-[var(--text-tertiary)] text-xs">--</span>
            )}
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-tertiary)]">N</div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 text-[9px] text-[var(--text-tertiary)]">E</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-tertiary)]">S</div>
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 text-[9px] text-[var(--text-tertiary)]">W</div>
        </div>

        <div className="text-center">
          <div className={`data-number ${speedColor}`}>
            {speed != null ? speed.toFixed(1) : '--'}
          </div>
          <div className="data-label mt-0.5">mph</div>
          <div className={`text-sm font-semibold mt-1 ${directionColor}`}>
            {cardinal} 
            <span className="text-[var(--text-tertiary)] text-xs ml-1">
              {direction != null ? `${Math.round(direction)}°` : ''}
            </span>
          </div>
          {optimalDirection?.expected && (
            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Need: {optimalDirection.expected}
            </div>
          )}
        </div>
      </div>

      {Number(station.windGust ?? station.gust) > (speed || 0) * 1.3 && (
        <div className="mt-2 text-center text-xs text-amber-500 font-medium">
          Gusts to {Number(station.windGust ?? station.gust).toFixed(1)} mph
        </div>
      )}
    </div>
  );
}

function FactorBar({ label, value, detail, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 70) return 'bg-emerald-500';
    if (v >= 50) return 'bg-amber-500';
    if (v >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)] capitalize">{detail || ''}</span>
          <span className="text-[var(--text-primary)] font-semibold w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ModelStepCard({ step, label, description, value, explanation, isGood, isBad, threshold }) {
  return (
    <div className={`rounded-lg p-3 border bg-[var(--bg-card)] ${
      isGood ? 'border-emerald-500/30' : isBad ? 'border-red-500/30' : 'border-[var(--border-color)]'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
          isGood ? 'bg-emerald-500/10 text-emerald-500' : isBad ? 'bg-red-500/10 text-red-500' : 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
        }`}>
          {step}
        </span>
        <span className="text-[var(--text-secondary)] font-medium text-xs">{label}</span>
      </div>
      <div className="font-mono text-xs text-[var(--text-tertiary)] mb-2">{description}</div>
      <div className={`data-number-sm ${
        isGood ? 'text-emerald-500' : isBad ? 'text-red-500' : 'text-amber-500'
      }`}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-secondary)] mt-1">{explanation}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] mt-1">{threshold}</div>
    </div>
  );
}
