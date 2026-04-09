import React, { useState, useEffect } from 'react';
import { Wind, Clock, Shield, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap, AlertTriangle } from 'lucide-react';
import { generateSmartForecast, ACTIVITY_PROFILES } from '../services/SmartForecastEngine';
import { useTheme } from '../context/ThemeContext';
import { safeToFixed } from '../utils/safeToFixed';

const SCORE_COLORS_WIND = {
  90: { bg: 'bg-green-500', text: 'text-green-400', light: 'bg-green-500/20' },
  70: { bg: 'bg-lime-500', text: 'text-lime-400', light: 'bg-lime-500/20' },
  50: { bg: 'bg-yellow-500', text: 'text-yellow-400', light: 'bg-yellow-500/20' },
  30: { bg: 'bg-orange-500', text: 'text-orange-400', light: 'bg-orange-500/20' },
  0:  { bg: 'bg-red-500', text: 'text-red-400', light: 'bg-red-500/20' },
};

const SCORE_COLORS_CALM = {
  90: { bg: 'bg-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/20' },
  70: { bg: 'bg-green-500', text: 'text-green-400', light: 'bg-green-500/20' },
  50: { bg: 'bg-lime-500', text: 'text-lime-400', light: 'bg-lime-500/20' },
  30: { bg: 'bg-yellow-500', text: 'text-yellow-400', light: 'bg-yellow-500/20' },
  0:  { bg: 'bg-red-500', text: 'text-red-400', light: 'bg-red-500/20' },
};

function getScoreColors(score, wantsWind) {
  const map = wantsWind ? SCORE_COLORS_WIND : SCORE_COLORS_CALM;
  for (const [threshold, colors] of Object.entries(map).sort((a, b) => b[0] - a[0])) {
    if (score >= +threshold) return colors;
  }
  return map[0];
}

/**
 * Universal Smart Timeline — replaces the old Math.random() HourlyTimeline.
 * Works for ALL activities by using SmartForecastEngine.
 */
const SmartTimeline = ({
  activity = 'kiting',
  locationId = 'utah-lake',
  currentWind = {},
  upstreamData = {},
  lakeState = {},
  mesoData = {},
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [forecast, setForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const profile = ACTIVITY_PROFILES[activity] || ACTIVITY_PROFILES.kiting;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const result = await generateSmartForecast(
          activity, locationId, currentWind, upstreamData, lakeState, mesoData
        );
        if (!cancelled) setForecast(result);
      } catch (e) {
        console.warn('SmartForecast error:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activity, locationId, currentWind?.speed, upstreamData?.kslcSpeed]);

  if (isLoading && !forecast) {
    return (
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading smart forecast...</span>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const displayHours = expanded ? forecast.hours : forecast.hours.slice(0, 12);
  const bestWindow = forecast.windows[0];

  return (
    <div className={`rounded-xl p-4 border space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Smart Hourly Forecast
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
            AI
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'}`}
        >
          {expanded ? 'Less' : 'Full 24h'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Best Window Summary */}
      {bestWindow && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
        }`}>
          <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            Best Window: {bestWindow.start} – {bestWindow.end} ({bestWindow.duration}hrs, avg {bestWindow.avgSpeed} mph)
          </span>
        </div>
      )}

      {/* Flow Blocked Indicator */}
      {forecast.flowBlocked && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          profile.wantsWind
            ? (isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200')
            : (isDark ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200')
        }`}>
          <Shield className={`w-3.5 h-3.5 flex-shrink-0 ${
            profile.wantsWind ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')
          }`} />
          <span className={`text-[11px] ${
            profile.wantsWind ? (isDark ? 'text-yellow-400' : 'text-yellow-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')
          }`}>
            {profile.wantsWind
              ? 'Valley wind not reaching lake — local thermals may still develop'
              : 'Upstream wind blocked — glass conditions likely to persist'}
          </span>
        </div>
      )}

      {/* Active Spatial Triggers */}
      {forecast.activeTriggers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {forecast.activeTriggers.map(t => (
            <span key={t.id} className={`text-[10px] px-2 py-0.5 rounded-full ${
              t.type === 'boost'
                ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                : t.type === 'penalty'
                  ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                  : (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
            }`}>
              {t.label} ({t.impact})
            </span>
          ))}
        </div>
      )}

      {/* Swing Alerts */}
      {forecast.swingAlerts.length > 0 && (
        <div className="space-y-1">
          {forecast.swingAlerts.slice(0, 2).map(a => (
            <div key={a.id} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${
              a.severity === 'critical'
                ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')
                : (isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700')
            }`}>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{a.label}: {a.detail || a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hourly Timeline Bars */}
      <div className="space-y-0.5">
        {displayHours.map((h) => {
          const colors = getScoreColors(h.score, profile.wantsWind);
          return (
            <div key={`${h.hour}-${h.offset}`} className={`flex items-center gap-2 py-1 px-2 rounded ${
              h.isCurrent ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-blue-50 border border-blue-200') : ''
            }`}>
              <span className={`text-xs w-14 flex-shrink-0 ${
                h.isCurrent ? (isDark ? 'text-cyan-400 font-bold' : 'text-blue-600 font-bold') : (isDark ? 'text-slate-500' : 'text-slate-400')
              }`}>
                {h.time}
              </span>

              {/* Score bar */}
              <div className={`flex-1 h-5 rounded-full overflow-hidden relative ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className={`h-full ${colors.bg} transition-all duration-300 rounded-full`}
                  style={{ width: `${h.score}%` }}
                />
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                  {h.predictedSpeed} mph
                </span>
              </div>

              {/* Activity emoji */}
              <span className="text-sm w-6 text-center flex-shrink-0">{h.emoji}</span>

              {/* Label */}
              <span className={`text-[10px] w-20 text-right flex-shrink-0 ${colors.text}`}>
                {h.label}
              </span>

              {/* Cloud cover */}
              {h.cloudCover && (
                <span className="text-sm w-5 text-center flex-shrink-0" title={h.cloudCover.label}>
                  {h.cloudCover.icon}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Wind Events */}
      {forecast.events.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-slate-700/50">
          {forecast.events.slice(0, 3).map((e, i) => (
            <div key={i} className={`flex items-center gap-2 text-[10px] ${
              e.type === 'wind_increase'
                ? (isDark ? 'text-orange-400' : 'text-orange-600')
                : (isDark ? 'text-green-400' : 'text-green-600')
            }`}>
              {e.type === 'wind_increase'
                ? <TrendingUp className="w-3 h-3 flex-shrink-0" />
                : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
              <span>{e.message} at {e.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Translation Factor Info */}
      <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${
        isDark ? 'border-slate-700/50 text-slate-600' : 'border-slate-200 text-slate-400'
      }`}>
        <span>
          Translation: {safeToFixed(
            forecast.translation?.factor == null ? null : forecast.translation.factor * 100,
            0
          )}% of upstream wind reaching lake
        </span>
        <span>
          {Math.round(forecast.thermalPrediction.probability >= 1 ? forecast.thermalPrediction.probability : forecast.thermalPrediction.probability * 100)}% {
            forecast.thermalPrediction.windType === 'north_flow' ? 'wind probability (north flow)'
            : forecast.thermalPrediction.windType === 'postfrontal' ? 'wind probability (clearing)'
            : forecast.thermalPrediction.windType === 'synoptic' ? 'wind probability'
            : 'thermal probability'
          }
        </span>
      </div>
    </div>
  );
};

export default SmartTimeline;
