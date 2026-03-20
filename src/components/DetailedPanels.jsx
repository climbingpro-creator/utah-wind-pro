import { lazy, Suspense } from 'react';
import * as React from 'react';
import { TrendingUp, Thermometer, ArrowUpDown, MapPin, Brain, Ship } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';
import { BustAlert } from './BustAlert';
import { ThermalStatus } from './ThermalStatus';
import { ThermalForecast } from './ThermalForecast';
import { NorthFlowGauge } from './NorthFlowGauge';
import { KiteSafetyIndicator } from './KiteSafety';
import { SafeComponent } from './ErrorBoundary';
import ProGate from './ProGate';
import PrimaryWindDisplay from './PrimaryWindDisplay';
import FactorBar from './FactorBar';

const WindMap = lazy(() => import('./WindMap').then(m => ({ default: m.WindMap })));
const ForecastPanel = lazy(() => import('./ForecastPanel').then(m => ({ default: m.ForecastPanel })));
const FiveDayForecast = lazy(() => import('./FiveDayForecast').then(m => ({ default: m.FiveDayForecast })));
const SpotTimeline = lazy(() => import('./SpotTimeline'));
const WhyExplainer = lazy(() => import('./WhyExplainer'));
const PatternMatch = lazy(() => import('./PatternMatch'));
const GlassScore = lazy(() => import('./GlassScore'));
const WaterForecast = lazy(() => import('./WaterForecast'));
const SmartTimeline = lazy(() => import('./SmartTimeline'));
const WeekPlanner = lazy(() => import('./WeekPlanner'));
const SpotRanker = lazy(() => import('./SpotRanker'));
const IndicatorCascade = lazy(() => import('./IndicatorCascade'));
const WeeklyBestDays = lazy(() => import('./WeeklyBestDays'));
const RaceDayMode = lazy(() => import('./RaceDayMode'));
const SevereWeatherAlerts = lazy(() => import('./SevereWeatherAlerts'));
const DataFreshness = lazy(() => import('./DataFreshness'));
const PropagationBanner = lazy(() => import('./PropagationBanner'));
const SessionFeedback = lazy(() => import('./SessionFeedback'));
const SessionReplay = lazy(() => import('./SessionReplay'));
const TrendPatterns = lazy(() => import('./TrendPatterns'));
const AccuracyScoreboard = lazy(() => import('./AccuracyScoreboard'));

export default function DetailedPanels({
  selectedActivity,
  selectedLake,
  activityConfig,
  lakeState,
  mesoData,
  correlation,
  boatingPrediction,
  currentWindSpeed,
  currentWindGust,
  currentWindDirection,
  pressureData,
  history,
  swingAlerts,
  lastUpdated,
  isLoading,
  error,
  refresh,
  status,
  theme,
  setSelectedLake,
}) {
  return (
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

        <PrimaryWindDisplay 
          station={lakeState?.pws || lakeState?.wind?.stations?.[0]}
          optimalDirection={lakeState?.thermalPrediction?.direction}
          isLoading={isLoading}
          pwsUnavailable={selectedLake === 'utah-lake-zigzag' && !lakeState?.pws}
        />

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
                Base: {(correlation.baseSpeed ?? 0).toFixed(0)} mph → Refined: {correlation.refinedSpeed ?? '--'} mph
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
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

        <SafeComponent name="Spot Timeline">
          <SpotTimeline locationId={selectedLake} activity={selectedActivity} />
        </SafeComponent>

        <SafeComponent name="Why Explainer">
          <WhyExplainer locationId={selectedLake} />
        </SafeComponent>

        <SafeComponent name="Session Feedback">
          <SessionFeedback
            activity={selectedActivity}
            locationId={selectedLake}
            locationName={lakeState?.config?.name || selectedLake}
            forecast={null}
          />
        </SafeComponent>

        <SafeComponent name="Session Replay">
          <SessionReplay
            locationId={selectedLake}
            activity={selectedActivity}
            lakeState={lakeState}
          />
        </SafeComponent>

        <SafeComponent name="Indicator Cascade">
          <IndicatorCascade lakeState={lakeState} activity={selectedActivity} locationId={selectedLake} />
        </SafeComponent>

        <SafeComponent name="Pattern Match">
          <PatternMatch />
        </SafeComponent>

        <SafeComponent name="Accuracy Scoreboard">
          <AccuracyScoreboard />
        </SafeComponent>

        <ProGate feature="Weekly Planner" preview="Find the best day this week">
          <SafeComponent name="Week Planner">
            <WeekPlanner activity={selectedActivity} locationId={selectedLake} />
          </SafeComponent>
        </ProGate>

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

        <SafeComponent name="Trend Patterns">
          <TrendPatterns locationId={selectedLake} />
        </SafeComponent>

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

        <SevereWeatherAlerts />

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
                    {(lakeState.thermalPrediction.speedBiasCorrection ?? 0).toFixed(1)} mph
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
  );
}
