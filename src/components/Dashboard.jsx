import { useState } from 'react';
import * as React from 'react';
import { RefreshCw, Clock, Wifi, WifiOff, TrendingUp, Gauge, Wind, Thermometer, ArrowUpDown, MapPin, Navigation, Anchor, Bell, Brain } from 'lucide-react';
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
import ActivityMode, { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore } from './ActivityMode';
import GlassScore from './GlassScore';
import { predictGlass } from '../services/BoatingPredictor';
import WaterForecast from './WaterForecast';
import HourlyTimeline from './HourlyTimeline';
import WeeklyBestDays from './WeeklyBestDays';
import RaceDayMode from './RaceDayMode';
import SevereWeatherAlerts from './SevereWeatherAlerts';
import DataFreshness from './DataFreshness';
import ParaglidingMode from './ParaglidingMode';
import FishingMode from './FishingMode';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { SafeComponent } from './ErrorBoundary';
import { calculateCorrelatedWind } from '../services/CorrelationEngine';
import { monitorSwings } from '../services/FrontalTrendPredictor';
import TrendPatterns from './TrendPatterns';

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
  const { lakeState, history, status, isLoading, error, lastUpdated, refresh } = useLakeData(selectedLake);
  const { theme } = useTheme();
  
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
    
    // Check Flight Park South (SSE to SSW: 160-200°)
    const fpsDirectionOk = fpsDir >= 160 && fpsDir <= 200;
    const fpsSpeedOk = fpsSpeed >= 5 && fpsSpeed <= 18;
    const fpsGustOk = !fpsGust || (fpsGust - fpsSpeed) <= 5;
    
    // Check Flight Park North (N to NW: 315-360 or 0-45)
    const utalpDirectionOk = utalpDir >= 315 || utalpDir <= 45;
    const utalpSpeedOk = utalpSpeed >= 5 && utalpSpeed <= 18;
    const utalpGustOk = !utalpGust || (utalpGust - utalpSpeed) <= 5;
    
    // Calculate scores
    let fpsScore = 0;
    if (fpsDirectionOk) fpsScore += 50;
    if (fpsSpeedOk) fpsScore += 30;
    if (fpsGustOk) fpsScore += 20;
    if (fpsSpeed >= 10 && fpsSpeed <= 16) fpsScore += 10; // Ideal range bonus
    
    let utalpScore = 0;
    if (utalpDirectionOk) utalpScore += 50;
    if (utalpSpeedOk) utalpScore += 30;
    if (utalpGustOk) utalpScore += 20;
    if (utalpSpeed >= 12 && utalpSpeed <= 16) utalpScore += 10; // Ideal range bonus
    
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
    }
  }, [lakeState, selectedLake]);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const pressureData = lakeState ? {
    gradient: lakeState.pressure.gradient,
    isBustCondition: lakeState.pressure.gradient != null && Math.abs(lakeState.pressure.gradient) > 2.0,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-900'
    }`}>
      <ToastContainer />
      
      <header className={`border-b backdrop-blur-sm sticky top-0 z-40 transition-colors duration-300 ${
        theme === 'dark' 
          ? 'border-slate-800 bg-slate-900/80' 
          : 'border-slate-200 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Utah Wind Pro
              </h1>
              <p className="text-slate-500 text-sm">
                {activityConfig?.description || 'Professional Wind Forecasting'}
              </p>
            </div>

            {/* Activity Mode Selector */}
            <ActivityMode 
              selectedActivity={selectedActivity}
              onActivityChange={setSelectedActivity}
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                {error ? (
                  <WifiOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Wifi className="w-4 h-4 text-green-400" />
                )}
                <Clock className="w-4 h-4" />
                <span>{formatTime(lastUpdated)}</span>
              </div>

              <button
                onClick={() => setShowNotificationSettings(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Notification Settings"
              >
                <Bell className="w-5 h-5 text-slate-400" />
              </button>

              <button
                onClick={() => setShowLearningDashboard(!showLearningDashboard)}
                className={`p-2 rounded-lg transition-colors relative ${showLearningDashboard ? 'bg-purple-600' : (theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300')}`}
                title={lakeState?.thermalPrediction?.isUsingLearnedWeights
                  ? `Learning Active (v${lakeState.thermalPrediction.weightsVersion})`
                  : 'Learning System — collecting data'}
              >
                <Brain className={`w-5 h-5 ${showLearningDashboard ? 'text-white' : 'text-purple-400'}`} />
                {lakeState?.thermalPrediction?.isUsingLearnedWeights && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-slate-900 animate-pulse" />
                )}
              </button>

              <button
                onClick={refresh}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 hover:bg-slate-700' 
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
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
              <div className="p-2">
                <LearningDashboard />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Only show lake selector for water sports (not paragliding or fishing) */}
        {!activityConfig?.hideLakeSelector && (
          <LakeSelector selectedLake={selectedLake} onSelectLake={setSelectedLake} />
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
            <div className={`rounded-xl p-4 border ${colorMap[bannerColor]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{activityConfig?.icon}</span>
                  <div className="min-w-0">
                    <div className={`font-bold text-lg ${textColorMap[bannerColor]}`}>
                      {headline}
                    </div>
                    {subline && (
                      <div className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{subline}</div>
                    )}
                    {arriveTime && (
                      <div className="mt-1.5 inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                        🕐 Be there by {arriveTime}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className={`text-4xl font-black ${textColorMap[bannerColor]}`}>
                    {displayScore}%
                  </div>
                  {badge && (
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${badge.color}`}>
                      {badge.text}
                    </div>
                  )}
                  {!badge && activityScore.gustFactor > 1.3 && (
                    <div className={`text-[10px] px-2 py-0.5 rounded mt-1 ${
                      theme === 'dark' ? 'text-orange-400 bg-orange-500/20' : 'text-orange-700 bg-orange-100'
                    }`}>
                      ⚠️ Gusty
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {error && (
          <div className={`rounded-xl p-4 border ${
            theme === 'dark' 
              ? 'bg-red-900/30 border-red-500/50 text-red-400' 
              : 'bg-red-100 border-red-300 text-red-700'
          }`}>
            <p className="font-medium">Connection Error</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-red-400/80' : 'text-red-600'}`}>{error}</p>
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
        ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Gauges */}
          <div className="lg:col-span-1 space-y-4">
            {/* Activity-Specific Primary Gauge */}
            {activityConfig?.wantsWind ? (
              /* Wind-seeking activities: Show Thermal Confidence */
              <div className={`flex flex-col items-center rounded-2xl p-6 border ${
                theme === 'dark' 
                  ? 'bg-slate-800/30 border-slate-700' 
                  : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className={`text-xs mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                  {selectedActivity === 'sailing' ? 'Racing Wind Probability' : 'Thermal Probability'}
                </div>
                <ConfidenceGauge value={lakeState?.probability || 0} size={180} />
                
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

            {/* Boating AI Prediction — shown for calm-seeking activities */}
            {boatingPrediction && (selectedActivity === 'boating' || selectedActivity === 'paddling') && (
              <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🚤</span>
                  <span className="text-xs font-medium text-white">Glass Forecast</span>
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded ml-auto">AI</span>
                </div>
                <div className="text-center mb-2">
                  <div className={`text-2xl font-bold ${
                    boatingPrediction.probability >= 60 ? 'text-green-400' :
                    boatingPrediction.probability >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {boatingPrediction.probability}%
                  </div>
                  <div className="text-xs text-slate-400">{boatingPrediction.waveLabel}</div>
                </div>
                {boatingPrediction.glassWindow?.start && (
                  <div className="text-xs text-cyan-400 text-center">
                    Glass window: {boatingPrediction.glassWindow.start} – {boatingPrediction.glassWindow.end}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 text-center mt-1">
                  {boatingPrediction.recommendation}
                </div>
              </div>
            )}

            {/* North Flow / Prefrontal Gauge */}
            <div className="flex flex-col items-center bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
              <div className="text-xs text-slate-500 mb-2">Pressure Gradient (N↔S Flow)</div>
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

            {/* 3-Step Model Bars */}
            {lakeState?.thermalPrediction && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500 mb-3 text-center">3-Step Prediction Model</div>
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
            )}

            {/* Spatial Correlation Triggers */}
            {correlation?.activeTriggers?.length > 0 && (
              <div className={`rounded-xl p-4 border ${
                theme === 'dark'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                      Spatial Correlation
                    </span>
                  </div>
                  {correlation.multiplier !== 1.0 && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      correlation.multiplier > 1
                        ? (theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
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
            {/* Hourly Timeline - Activity Specific */}
            <HourlyTimeline
              activity={selectedActivity}
              currentConditions={{
                windSpeed: currentWindSpeed,
                windGust: currentWindGust,
                windDirection: currentWindDirection,
              }}
              thermalStartHour={lakeState?.thermalPrediction?.startHour || 10}
              thermalPeakHour={lakeState?.thermalPrediction?.peakHour || 12}
              thermalEndHour={lakeState?.thermalPrediction?.endHour || 17}
            />

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

            {/* Weekly Best Days */}
            <WeeklyBestDays selectedActivity={selectedActivity} />

            {/* Frontal Swing Alerts — Real-time rapid changes */}
            {swingAlerts.length > 0 && (
              <div className="space-y-2">
                {swingAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-4 border flex items-start gap-3 ${
                      alert.severity === 'critical'
                        ? (theme === 'dark'
                          ? 'bg-red-500/15 border-red-500/40 animate-pulse'
                          : 'bg-red-50 border-red-300 animate-pulse')
                        : alert.severity === 'warning'
                          ? (theme === 'dark'
                            ? 'bg-orange-500/10 border-orange-500/30'
                            : 'bg-orange-50 border-orange-200')
                          : (theme === 'dark'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-blue-50 border-blue-200')
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${
                          alert.severity === 'critical'
                            ? (theme === 'dark' ? 'text-red-300' : 'text-red-700')
                            : alert.severity === 'warning'
                              ? (theme === 'dark' ? 'text-orange-300' : 'text-orange-700')
                              : (theme === 'dark' ? 'text-blue-300' : 'text-blue-700')
                        }`}>
                          {alert.label}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          alert.severity === 'critical'
                            ? 'bg-red-500 text-white'
                            : alert.severity === 'warning'
                              ? (theme === 'dark' ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-200 text-orange-800')
                              : (theme === 'dark' ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-200 text-blue-800')
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {alert.detail}
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        Wind: {alert.windExpectation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Water Forecast — for boating, paddling, fishing */}
            {(selectedActivity === 'boating' || selectedActivity === 'paddling' || selectedActivity === 'fishing') && (
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
                />
              </SafeComponent>
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

            {/* Learning Status */}
            {lakeState?.thermalPrediction && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] ${
                theme === 'dark' ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-100 text-slate-500'
              }`}>
                <Brain className="w-3 h-3" />
                {lakeState.thermalPrediction.isUsingLearnedWeights ? (
                  <span>
                    Model: <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>Learned</span>
                    {' '}(v{String(lakeState.thermalPrediction.weightsVersion).slice(-6)})
                    {lakeState.thermalPrediction.speedBiasCorrection !== 0 && (
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

            <FiveDayForecast
              conditions={{
                pressure: lakeState?.pws?.pressure || lakeState?.pressure?.high?.value,
                temperature: lakeState?.pws?.temperature,
                pressureGradient: lakeState?.pressure?.gradient,
              }}
              isLoading={isLoading}
            />

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

        {/* Live Wind Vectors */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            Live Wind Vectors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse"
                  >
                    <div className="h-5 bg-slate-700 rounded w-2/3 mb-4" />
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-slate-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-slate-700 rounded w-1/2" />
                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        </>
        )}

        {/* Only show 3-Step Model for non-paragliding activities */}
        {selectedActivity !== 'paragliding' && (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">3-Step Prediction Model</h3>
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
      </main>

      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-500 text-sm">
          <p>Utah Wind Pro • Professional Thermal Forecasting</p>
          <p className="text-xs mt-1">
            Model: Step A (Gradient) 40% • Step B (Elevation Δ) 30% • Step C (Ground Truth) 30%
          </p>
        </div>
      </footer>
    </div>
  );
}

function PrimaryWindDisplay({ station, optimalDirection, isLoading, pwsUnavailable }) {
  if (isLoading || !station) {
    return (
      <div className="mt-4 w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 bg-slate-700 rounded-full" />
          <div className="space-y-2">
            <div className="h-8 bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-700 rounded w-16" />
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
  
  const speedColor = speed >= 8 ? 'text-green-400' : speed >= 4 ? 'text-yellow-400' : 'text-slate-400';
  const directionColor = isOptimal ? 'text-green-400' : isWrong ? 'text-red-400' : 'text-cyan-400';

  return (
    <div className={`mt-4 w-full rounded-xl p-4 border ${
      isOptimal ? 'bg-green-900/20 border-green-500/30' : 
      isWrong ? 'bg-red-900/20 border-red-500/30' : 
      'bg-slate-800/50 border-slate-700'
    }`}>
      {/* PWS unavailable warning */}
      {pwsUnavailable && (
        <div className="text-xs text-yellow-400 text-center mb-2 flex items-center justify-center gap-1">
          <span>⚠️</span>
          <span>Zig Zag PWS unavailable - showing nearest station</span>
        </div>
      )}
      <div className="text-xs text-center mb-2 flex items-center justify-center gap-1">
        {isYourStation && <span className="text-cyan-400">📍</span>}
        <span className={isYourStation ? 'text-cyan-400 font-medium' : 'text-slate-500'}>
          {stationName}
        </span>
        {!isYourStation && !pwsUnavailable && <span className="text-slate-600 text-[10px]">(MesoWest)</span>}
      </div>
      
      <div className="flex items-center justify-center gap-6">
        {/* Wind Direction Compass */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-slate-600 bg-slate-800/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            {direction != null ? (
              <Navigation 
                className={`w-8 h-8 ${directionColor} transition-transform duration-500`}
                style={{ transform: `rotate(${direction + 180}deg)` }}
              />
            ) : (
              <span className="text-slate-500 text-xs">--</span>
            )}
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">N</div>
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 text-[10px] text-slate-500">E</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">S</div>
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 text-[10px] text-slate-500">W</div>
        </div>

        {/* Speed and Direction Values */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${speedColor}`}>
            {speed != null ? speed.toFixed(1) : '--'}
            <span className="text-lg text-slate-500 ml-1">mph</span>
          </div>
          <div className={`text-lg font-medium ${directionColor}`}>
            {cardinal} 
            <span className="text-slate-500 text-sm ml-1">
              {direction != null ? `${Math.round(direction)}°` : ''}
            </span>
          </div>
          {optimalDirection?.expected && (
            <div className="text-xs text-slate-500 mt-1">
              Need: {optimalDirection.expected}
            </div>
          )}
        </div>
      </div>

      {/* Gust indicator */}
      {(station.windGust ?? station.gust) > (speed || 0) * 1.3 && (
        <div className="mt-2 text-center text-xs text-orange-400">
          Gusts to {(station.windGust ?? station.gust).toFixed(1)} mph
        </div>
      )}
    </div>
  );
}

function FactorBar({ label, value, detail, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 70) return 'bg-green-500';
    if (v >= 50) return 'bg-yellow-500';
    if (v >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 capitalize">{detail || ''}</span>
          <span className="text-slate-300 font-medium w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
    <div className={`bg-slate-800/50 rounded-lg p-3 border ${
      isGood ? 'border-green-500/30' : isBad ? 'border-red-500/30' : 'border-slate-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isGood ? 'bg-green-500/20 text-green-400' : isBad ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'
        }`}>
          {step}
        </span>
        <span className="text-slate-400 font-medium">{label}</span>
      </div>
      <div className="font-mono text-sm text-slate-500 mb-2">{description}</div>
      <div className={`text-xl font-bold ${
        isGood ? 'text-green-400' : isBad ? 'text-red-400' : 'text-yellow-400'
      }`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{explanation}</div>
      <div className="text-xs text-slate-600 mt-1 italic">{threshold}</div>
    </div>
  );
}
