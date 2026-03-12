import { Clock, Navigation, Wind, TrendingUp, AlertCircle, CheckCircle, XCircle, Calendar, BarChart3 } from 'lucide-react';
import { predictThermal, formatTimeUntil, getDirectionInfo } from '../services/ThermalPredictor';

export function ThermalForecast({ lakeId, currentConditions, pressureGradient, thermalDelta, pumpActive, inversionTrapped, isLoading }) {
  const prediction = predictThermal(lakeId, { 
    ...currentConditions, 
    pressureGradient,
    thermalDelta,
    pumpActive,
    inversionTrapped,
  });
  
  if (isLoading || !prediction) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const { phase, direction, speed, timing, profile } = prediction;
  const dirInfo = getDirectionInfo(direction.current);

  const phaseColors = {
    'pre-thermal': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    'building': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    'peak': 'text-green-400 bg-green-500/20 border-green-500/30',
    'fading': 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    'ended': 'text-slate-400 bg-slate-500/20 border-slate-500/30',
  };

  const directionColors = {
    'optimal': 'text-green-400',
    'acceptable': 'text-yellow-400',
    'wrong': 'text-red-400',
    'unknown': 'text-slate-400',
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${phaseColors[phase]} border-opacity-50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" />
            <h3 className="font-semibold">Thermal Forecast</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${phaseColors[phase]} capitalize`}>
            {phase.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Expected Direction */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${direction.status === 'optimal' ? 'bg-green-500/20' : direction.status === 'wrong' ? 'bg-red-500/20' : 'bg-slate-700'}`}>
            <Navigation className={`w-5 h-5 ${directionColors[direction.status]}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Expected Direction</span>
              <span className={`font-bold ${directionColors[direction.status]}`}>
                {profile.direction.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">
              Optimal: {direction.expectedRange}
            </div>
            {direction.current != null && (
              <div className={`text-sm ${directionColors[direction.status]}`}>
                Current: {direction.current}° ({dirInfo.cardinal}) 
                {direction.status === 'optimal' && ' ✓'}
                {direction.status === 'wrong' && ' ✗'}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {profile.direction.description}
            </p>
          </div>
        </div>

        {/* Expected Speed */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${speed.status === 'good' ? 'bg-green-500/20' : 'bg-slate-700'}`}>
            <TrendingUp className={`w-5 h-5 ${speed.status === 'good' ? 'text-green-400' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Expected Speed</span>
              <span className="font-bold text-cyan-400">
                {speed.expectedRange}
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">
              Average: {speed.expectedAvg} mph
            </div>
            {speed.current != null && (
              <div className={`text-sm ${speed.status === 'good' ? 'text-green-400' : speed.status === 'light' ? 'text-yellow-400' : 'text-orange-400'}`}>
                Current: {speed.current.toFixed(1)} mph
                {speed.status === 'good' && ' ✓'}
              </div>
            )}
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-700">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Peak Window</span>
              <span className="font-bold text-amber-400">
                {timing.peakWindow}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Usable from: {timing.startTime}
            </div>
            {prediction.timeToThermal && prediction.timeToThermal > 0 && (
              <div className="mt-2 text-sm text-cyan-400">
                ⏱ Thermal in ~{formatTimeUntil(prediction.timeToThermal)}
              </div>
            )}
          </div>
        </div>

        {/* Prediction Summary */}
        <div className={`
          rounded-lg p-3 border
          ${prediction.prediction.willHaveThermal === true 
            ? 'bg-green-900/30 border-green-500/30' 
            : prediction.prediction.willHaveThermal === false
              ? 'bg-red-900/30 border-red-500/30'
              : 'bg-slate-800/50 border-slate-700'
          }
        `}>
          <div className="flex items-start gap-2">
            {prediction.prediction.willHaveThermal === true ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : prediction.prediction.willHaveThermal === false ? (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                prediction.prediction.willHaveThermal === true 
                  ? 'text-green-400' 
                  : prediction.prediction.willHaveThermal === false
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}>
                {prediction.prediction.message}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Confidence: {prediction.prediction.confidence}% • Based on {profile.statistics.dataSource}
              </p>
            </div>
          </div>
        </div>

        {/* Spanish Fork Early Indicator (Utah Lake only) */}
        {prediction.spanishFork && (
          <div className={`rounded-lg p-3 border ${
            prediction.spanishFork.status === 'strong' 
              ? 'bg-emerald-900/30 border-emerald-500/30'
              : prediction.spanishFork.status === 'moderate'
                ? 'bg-yellow-900/20 border-yellow-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`w-4 h-4 ${
                prediction.spanishFork.status === 'strong' ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Spanish Fork Early Warning</span>
              {prediction.spanishFork.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">⏰ ~2hr LEAD</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.spanishFork.status === 'strong' ? 'text-emerald-400' 
                : prediction.spanishFork.status === 'moderate' ? 'text-yellow-400'
                : 'text-slate-400'
            }`}>
              {prediction.spanishFork.message}
            </p>
            {prediction.spanishFork.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  Current: <span className="text-slate-300">{prediction.spanishFork.windSpeed.toFixed(1)} mph @ {prediction.spanishFork.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Trigger: <span className="text-slate-300">{prediction.spanishFork.triggerConditions.directionNeeded} @ {prediction.spanishFork.triggerConditions.speedNeeded}</span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              📊 {prediction.spanishFork.statistics.seDirectionOnGoodDays} SE on good days • {prediction.spanishFork.statistics.accuracy} accuracy
            </div>
          </div>
        )}

        {/* North Flow Early Indicator (Utah Lake north flow locations) */}
        {prediction.northFlow && (
          <div className={`rounded-lg p-3 border ${
            prediction.northFlow.status === 'strong' 
              ? 'bg-blue-900/30 border-blue-500/30'
              : prediction.northFlow.status === 'moderate'
                ? 'bg-cyan-900/30 border-cyan-500/30'
                : prediction.northFlow.status === 'marginal'
                  ? 'bg-yellow-900/20 border-yellow-500/30'
                  : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Navigation className={`w-4 h-4 ${
                prediction.northFlow.status === 'strong' ? 'text-blue-400' 
                  : prediction.northFlow.status === 'moderate' ? 'text-cyan-400'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">North Flow Early Warning</span>
              {(prediction.northFlow.status === 'strong' || prediction.northFlow.status === 'moderate') && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">⏰ ~1hr LEAD</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.northFlow.status === 'strong' ? 'text-blue-400' 
                : prediction.northFlow.status === 'moderate' ? 'text-cyan-400'
                : prediction.northFlow.status === 'marginal' ? 'text-yellow-400'
                : 'text-slate-400'
            }`}>
              {prediction.northFlow.message}
            </p>
            
            {/* Expected Zig Zag Speed - Key validated data */}
            {prediction.northFlow.expectedZigZagSpeed != null && (
              <div className="mt-2 bg-slate-800/50 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Expected at Zig Zag:</span>
                  <span className={`font-bold ${
                    prediction.northFlow.expectedZigZagSpeed >= 15 ? 'text-green-400' 
                      : prediction.northFlow.expectedZigZagSpeed >= 10 ? 'text-cyan-400'
                      : 'text-yellow-400'
                  }`}>
                    ~{prediction.northFlow.expectedZigZagSpeed.toFixed(0)} mph
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs">
                  <span className="text-slate-500">Foil (10+ mph):</span>
                  <span className={prediction.northFlow.foilKiteablePct >= 50 ? 'text-green-400' : 'text-yellow-400'}>
                    {prediction.northFlow.foilKiteablePct}% likely
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Twin Tip (15+ mph):</span>
                  <span className={prediction.northFlow.twinTipKiteablePct >= 50 ? 'text-green-400' : 'text-yellow-400'}>
                    {prediction.northFlow.twinTipKiteablePct}% likely
                  </span>
                </div>
              </div>
            )}
            
            {prediction.northFlow.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  KSLC: <span className="text-slate-300">{prediction.northFlow.windSpeed.toFixed(0)} mph @ {prediction.northFlow.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Gradient: <span className={prediction.northFlow.pressureGradient > 0 ? 'text-blue-400' : 'text-slate-300'}>
                    {prediction.northFlow.pressureGradient?.toFixed(2) || '?'} mb
                    {prediction.northFlow.pressureGradient > 0 ? ' ✓' : ''}
                  </span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500 border-t border-slate-700 pt-2">
              📊 Validated: KSLC 8-10 mph → ~13 mph • 10-15 mph → ~15 mph • 15+ mph → ~23 mph
            </div>
          </div>
        )}

        {/* Provo Airport Indicator (Lincoln Beach & Sandy Beach) */}
        {prediction.provoIndicator && (
          <div className={`rounded-lg p-3 border ${
            prediction.provoIndicator.status === 'strong' 
              ? 'bg-purple-900/30 border-purple-500/30'
              : prediction.provoIndicator.status === 'good'
                ? 'bg-indigo-900/30 border-indigo-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Navigation className={`w-4 h-4 ${
                prediction.provoIndicator.status === 'strong' ? 'text-purple-400' 
                  : prediction.provoIndicator.status === 'good' ? 'text-indigo-400'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Provo Airport (Southern Launches)</span>
              {prediction.provoIndicator.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">BEST</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.provoIndicator.status === 'strong' ? 'text-purple-400' 
                : prediction.provoIndicator.status === 'good' ? 'text-indigo-400'
                : 'text-slate-400'
            }`}>
              {prediction.provoIndicator.message}
            </p>
            {prediction.provoIndicator.expectedSpeed != null && (
              <div className="mt-2 bg-slate-800/50 rounded p-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Expected at Lincoln/Sandy:</span>
                  <span className={`font-bold ${
                    prediction.provoIndicator.expectedSpeed >= 15 ? 'text-green-400' 
                      : prediction.provoIndicator.expectedSpeed >= 10 ? 'text-purple-400'
                      : 'text-yellow-400'
                  }`}>
                    ~{prediction.provoIndicator.expectedSpeed.toFixed(0)} mph ({prediction.provoIndicator.foilKiteablePct}% foil)
                  </span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              📊 KPVU 8-10 mph N → 78% foil kiteable (better than KSLC for south)
            </div>
          </div>
        )}

        {/* Point of Mountain Indicator (Gap Wind) */}
        {prediction.pointOfMountain && (
          <div className={`rounded-lg p-3 border ${
            prediction.pointOfMountain.status === 'strong' 
              ? 'bg-teal-900/30 border-teal-500/30'
              : prediction.pointOfMountain.status === 'moderate'
                ? 'bg-teal-900/20 border-teal-500/20'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Wind className={`w-4 h-4 ${
                prediction.pointOfMountain.status === 'strong' ? 'text-teal-400' 
                  : prediction.pointOfMountain.status === 'moderate' ? 'text-teal-300'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Point of Mountain Gap</span>
              {prediction.pointOfMountain.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full">FUNNELING</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.pointOfMountain.status === 'strong' ? 'text-teal-400' 
                : prediction.pointOfMountain.status === 'moderate' ? 'text-teal-300'
                : 'text-slate-400'
            }`}>
              {prediction.pointOfMountain.message}
            </p>
            {prediction.pointOfMountain.windSpeed != null && (
              <div className="mt-1 text-xs text-slate-500">
                UTALP: {prediction.pointOfMountain.windSpeed.toFixed(0)} mph @ {prediction.pointOfMountain.windDirection}°
              </div>
            )}
          </div>
        )}

        {/* Arrowhead Trigger (Deer Creek only) */}
        {prediction.arrowhead && (
          <div className={`rounded-lg p-3 border ${
            prediction.arrowhead.status === 'trigger' 
              ? 'bg-green-900/30 border-green-500/30'
              : prediction.arrowhead.status === 'building'
                ? 'bg-yellow-900/20 border-yellow-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-4 h-4 ${
                prediction.arrowhead.status === 'trigger' ? 'text-green-400' : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Arrowhead Trigger</span>
              {prediction.arrowhead.status === 'trigger' && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">ACTIVE</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.arrowhead.status === 'trigger' ? 'text-green-400' : 'text-slate-400'
            }`}>
              {prediction.arrowhead.message}
            </p>
            {prediction.arrowhead.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  Current: <span className="text-slate-300">{prediction.arrowhead.windSpeed.toFixed(1)} mph @ {prediction.arrowhead.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Need: <span className="text-slate-300">{prediction.arrowhead.triggerConditions.speedNeeded} from {prediction.arrowhead.triggerConditions.directionNeeded}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Requirements */}
        {profile.requirement && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
            <p className="text-amber-400 text-sm">
              ⚠️ {profile.requirement}
            </p>
          </div>
        )}

        {/* Monthly Context */}
        {prediction.monthlyContext && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">This Month's Pattern</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-cyan-400">{prediction.monthlyContext.successRate}%</div>
                <div className="text-xs text-slate-500">Success Rate</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">{prediction.monthlyContext.expectedPeakHour}:00</div>
                <div className="text-xs text-slate-500">Peak Hour</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{prediction.monthlyContext.expectedPeakSpeed}</div>
                <div className="text-xs text-slate-500">Avg mph</div>
              </div>
            </div>
          </div>
        )}

        {/* Data Source */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-700">
          <BarChart3 className="w-3 h-3" />
          <span>Model: {profile.statistics.dataSource}</span>
        </div>
      </div>
    </div>
  );
}
