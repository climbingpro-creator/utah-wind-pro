import React, { useMemo } from 'react';
import { Snowflake, Wind, Mountain, TrendingUp, Clock, ArrowRight, AlertTriangle, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getAllSnowkitePredictions } from '../services/SnowkitePredictor';
import { safeToFixed } from '../utils/safeToFixed';

const LOCATION_NAMES = {
  'strawberry-ladders': 'Ladders',
  'strawberry-bay':     'Strawberry Bay',
  'strawberry-soldier': 'Soldier Creek',
  'strawberry-view':    'The View',
  'strawberry-river':   'The River',
  'skyline-drive':      'Skyline Drive',
};

const QUALITY_COLORS = {
  green:   { dark: 'from-green-900/40 to-emerald-900/30 border-green-500/50', light: 'from-green-50 to-emerald-50 border-green-400', text: { dark: 'text-green-400', light: 'text-green-700' } },
  emerald: { dark: 'from-emerald-900/40 to-cyan-900/30 border-emerald-500/50', light: 'from-emerald-50 to-cyan-50 border-emerald-400', text: { dark: 'text-emerald-400', light: 'text-emerald-700' } },
  cyan:    { dark: 'from-cyan-900/40 to-sky-900/30 border-cyan-500/50', light: 'from-cyan-50 to-sky-50 border-cyan-400', text: { dark: 'text-cyan-400', light: 'text-cyan-700' } },
  yellow:  { dark: 'from-yellow-900/30 to-amber-900/20 border-yellow-500/40', light: 'from-yellow-50 to-amber-50 border-yellow-400', text: { dark: 'text-yellow-400', light: 'text-yellow-700' } },
  red:     { dark: 'from-red-900/30 to-rose-900/20 border-red-500/40', light: 'from-red-50 to-rose-50 border-red-400', text: { dark: 'text-red-400', light: 'text-red-700' } },
  gray:    { dark: 'from-slate-800/60 to-slate-900/40 border-slate-600/30', light: 'from-slate-50 to-white border-slate-200', text: { dark: 'text-slate-400', light: 'text-slate-600' } },
};

function dirLabel(deg) {
  if (deg == null) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function SnowkiteForecast({ selectedLake, mesoData, onSelectLocation }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isSnowkiteLocation = selectedLake?.startsWith('strawberry-') || selectedLake === 'skyline-drive';

  const stationReadings = useMemo(() => {
    if (!mesoData?.stations) return {};
    const readings = {};
    for (const s of mesoData.stations) {
      const stid = s.id || s.stationId;
      if (stid) {
        readings[stid] = {
          speed: s.speed ?? s.windSpeed,
          gust: s.gust ?? s.windGust,
          direction: s.direction ?? s.windDirection,
          temp: s.temperature ?? s.temp,
          pressure: s.pressure,
          name: s.name,
        };
      }
    }
    if (mesoData.KSLC) {
      readings.KSLC = {
        speed: mesoData.KSLC.speed ?? mesoData.KSLC.windSpeed,
        gust: mesoData.KSLC.gust ?? mesoData.KSLC.windGust,
        direction: mesoData.KSLC.direction ?? mesoData.KSLC.windDirection,
        temp: mesoData.KSLC.temperature,
        pressure: mesoData.KSLC.pressure,
      };
    }
    return readings;
  }, [mesoData]);

  const predictions = useMemo(() => {
    return getAllSnowkitePredictions(stationReadings, null);
  }, [stationReadings]);

  const currentPrediction = isSnowkiteLocation ? predictions[selectedLake] : null;

  const sortedSpots = useMemo(() => {
    return Object.entries(predictions)
      .filter(([, p]) => p != null)
      .sort((a, b) => (b[1].quality?.score || 0) - (a[1].quality?.score || 0));
  }, [predictions]);

  if (!isSnowkiteLocation && sortedSpots.length === 0) return null;

  const bestSpot = sortedSpots[0];
  const pred = currentPrediction || bestSpot?.[1];
  if (!pred) return null;

  const qColor = QUALITY_COLORS[pred.quality?.color] || QUALITY_COLORS.gray;
  const window = pred.window;

  return (
    <div className={`rounded-xl border overflow-hidden bg-gradient-to-br ${isDark ? qColor.dark : qColor.light}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Snowflake className={`w-5 h-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
          <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Snowkite AI Forecast
          </h3>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
            isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-100 text-sky-700'
          }`}>
            AI-Driven
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {pred.predicted?.confidence || 0}% conf
          </span>
          <span className={`text-lg font-bold ${isDark ? qColor.text.dark : qColor.text.light}`}>
            {pred.quality?.emoji} {pred.quality?.label}
          </span>
        </div>
      </div>

      {/* Main prediction */}
      <div className={`px-4 pb-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="grid grid-cols-3 gap-3 pt-3">
          {/* Current reading */}
          <div>
            <div className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Live @ {pred.station}
            </div>
            <div className={`text-2xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {safeToFixed(pred.current?.speed, 0)}
              <span className="text-xs font-normal ml-0.5">mph</span>
            </div>
            {pred.current?.direction != null && (
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {dirLabel(pred.current.direction)} ({pred.current.direction}°)
                {pred.current.gust > 0 && ` g${safeToFixed(pred.current.gust, 0)}`}
              </div>
            )}
          </div>

          {/* AI prediction */}
          <div>
            <div className={`text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Zap className="w-3 h-3" /> Predicted
            </div>
            <div className={`text-2xl font-black tabular-nums ${isDark ? qColor.text.dark : qColor.text.light}`}>
              {safeToFixed(pred.predicted?.speed, 0)}
              <span className="text-xs font-normal ml-0.5">mph</span>
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              g{pred.predicted?.gust == null ? '—' : safeToFixed(pred.predicted.gust, 0)} · {pred.predicted?.method || '—'}
            </div>
          </div>

          {/* Window */}
          <div>
            <div className={`text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" /> Window
            </div>
            {window ? (
              <>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {window.start}:00–{window.end}:00
                </div>
                <div className={`text-xs ${
                  window.isInWindow
                    ? (isDark ? 'text-green-400' : 'text-green-600')
                    : window.hoursUntilWindow > 0
                      ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                      : (isDark ? 'text-slate-500' : 'text-slate-400')
                }`}>
                  {window.isInWindow
                    ? `${window.hoursRemaining}hr left`
                    : window.hoursUntilWindow > 0
                      ? `Starts in ${window.hoursUntilWindow}hr`
                      : 'Window passed'}
                </div>
              </>
            ) : (
              <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading...</div>
            )}
          </div>
        </div>

        {/* Upstream signals */}
        {pred.upstream && pred.upstream.length > 0 && (
          <div className={`mt-3 pt-2 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <div className={`text-[10px] uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <TrendingUp className="w-3 h-3" /> Upstream Signals
            </div>
            <div className="flex flex-wrap gap-2">
              {pred.upstream.map((sig, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                  isDark ? 'bg-white/5' : 'bg-black/5'
                }`}>
                  <Wind className={`w-3 h-3 ${sig.currentSpeed >= 15 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {sig.source} {safeToFixed(sig.currentSpeed, 0)}mph {dirLabel(sig.currentDir)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className={isDark ? 'text-sky-400' : 'text-sky-600'}>
                    ~{safeToFixed(sig.expectedSpeed, 0)}mph in {sig.arrivalWindow.min}-{sig.arrivalWindow.max}hr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pressure gradient */}
        {pred.gradient && (
          <div className={`mt-2 flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Mountain className="w-3 h-3" />
            <span>
              Pressure gradient: {safeToFixed(pred.gradient.strength, 1)} mb ({pred.gradient.direction})
              {pred.gradient.strongWindLikely && (
                <span className={`ml-1 font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Strong wind likely</span>
              )}
              {!pred.gradient.strongWindLikely && pred.gradient.windLikely && (
                <span className={`ml-1 font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Wind building</span>
              )}
            </span>
          </div>
        )}

        {/* Trip readiness strip */}
        <div className={`mt-3 pt-2 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className={`text-[10px] uppercase tracking-wider font-medium mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Trip Readiness
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {pred.current?.temp != null && (
              <span className={`px-2 py-1 rounded-lg ${pred.current.temp < 20 ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700') : (isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600')}`}>
                {safeToFixed(pred.current.temp, 0)}°F on-site
              </span>
            )}
            <span className={`px-2 py-1 rounded-lg ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {pred.quality?.score >= 60 ? 'Worth the drive' : pred.quality?.score >= 35 ? 'Check before driving' : 'Marginal — monitor'}
            </span>
            {window?.isInWindow && (
              <span className={`px-2 py-1 rounded-lg font-medium ${isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700'}`}>
                Window open — {window.hoursRemaining}hr left
              </span>
            )}
          </div>
        </div>

        {/* Historical baseline */}
        {pred.baseline && (
          <div className={`mt-1 flex items-center gap-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>
              Historical: {pred.baseline.monthPctStrong}% of hours ≥10mph this month ·
              avg {safeToFixed(pred.baseline.hourAvgSpeed, 1)}mph this hour ·
              {pred.baseline.snowkiteDaysInPeriod} kitable days in dataset
            </span>
          </div>
        )}
      </div>

      {/* All spots ranking */}
      {sortedSpots.length > 1 && (
        <div className={`px-4 pb-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className={`text-[10px] uppercase tracking-wider font-medium pt-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            All Snowkite Spots
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {sortedSpots.map(([locId, p]) => {
              const isSelected = locId === selectedLake;
              const spotColor = QUALITY_COLORS[p.quality?.color] || QUALITY_COLORS.gray;
              return (
                <button
                  key={locId}
                  onClick={() => onSelectLocation?.(locId)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isSelected
                      ? (isDark ? 'bg-sky-500/20 border border-sky-500/50' : 'bg-sky-100 border border-sky-400')
                      : (isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10')
                  }`}
                >
                  <span className={`font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {LOCATION_NAMES[locId] || locId}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-bold tabular-nums ${isDark ? spotColor.text.dark : spotColor.text.light}`}>
                      {safeToFixed(p.predicted?.speed, 0)}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {p.quality?.emoji}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
