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
import HourlyTimeline from './HourlyTimeline';
import WeeklyBestDays from './WeeklyBestDays';
import RaceDayMode from './RaceDayMode';
import SevereWeatherAlerts from './SevereWeatherAlerts';
import DataFreshness from './DataFreshness';
import ParaglidingMode from './ParaglidingMode';
import FishingMode from './FishingMode';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

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
                className={`p-2 rounded-lg transition-colors ${showLearningDashboard ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                title="Learning System"
              >
                <Brain className={`w-5 h-5 ${showLearningDashboard ? 'text-white' : 'text-purple-400'}`} />
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

        {/* Activity Score Banner - hide for special modes that have their own scoring */}
        {activityScore && !activityConfig?.specialMode && (
          <div className={`
            rounded-xl p-4 border flex items-center justify-between
            ${activityScore.score >= 70 
              ? (theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-100 border-green-300')
              : activityScore.score >= 40 
                ? (theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-100 border-yellow-300')
                : (theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-100 border-red-300')}
          `}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activityConfig?.icon}</span>
              <div>
                <div className={`font-medium ${
                  activityScore.score >= 70 
                    ? (theme === 'dark' ? 'text-green-400' : 'text-green-700')
                    : activityScore.score >= 40 
                      ? (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700')
                      : (theme === 'dark' ? 'text-red-400' : 'text-red-700')
                }`}>
                  {activityConfig?.name} Score: {activityScore.score}%
                </div>
                <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{activityScore.message}</div>
              </div>
            </div>
            {activityScore.gustFactor > 1.3 && (
              <div className={`text-xs px-2 py-1 rounded ${
                theme === 'dark' ? 'text-orange-400 bg-orange-500/20' : 'text-orange-700 bg-orange-100'
              }`}>
                ⚠️ Gusty ({((activityScore.gustFactor - 1) * 100).toFixed(0)}%)
              </div>
            )}
          </div>
        )}

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
          <ParaglidingMode 
            windData={{
              stations: lakeState?.wind?.stations,
              FPS: lakeState?.wind?.stations?.find(s => s.id === 'FPS'),
              UTALP: lakeState?.wind?.stations?.find(s => s.id === 'UTALP'),
            }}
            isLoading={isLoading}
          />
        ) : selectedActivity === 'fishing' ? (
          <FishingMode 
            windData={{
              stations: lakeState?.wind?.stations,
              speed: currentWindSpeed,
            }}
            pressureData={pressureData}
            isLoading={isLoading}
          />
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

            {/* Weekly Best Days */}
            <WeeklyBestDays selectedActivity={selectedActivity} />

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
