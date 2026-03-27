import React, { useState, useEffect, useMemo } from 'react';
import { TrendingDown, TrendingUp, Zap, Calendar } from 'lucide-react';
import { get7DayForecast } from '@utahwind/weather';
import { analyzeDailyTrends, findPreFrontalDays, getWeekOutlook } from '../services/PatternLogic';
import { useTheme } from '../context/ThemeContext';

const TrendPatterns = ({ locationId = 'utah-lake' }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await get7DayForecast(locationId);
        if (!cancelled) setForecast(data);
      } catch {
        // Silently fail — this is supplementary data
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [locationId]);

  const annotated = useMemo(() => {
    if (!forecast) return null;
    return analyzeDailyTrends(forecast);
  }, [forecast]);

  const preFrontal = useMemo(() => {
    if (!annotated) return [];
    return findPreFrontalDays(annotated);
  }, [annotated]);

  const outlook = useMemo(() => {
    if (!annotated) return null;
    return getWeekOutlook(annotated);
  }, [annotated]);

  if (loading || !annotated) return null;

  const daytimeWithTrends = annotated.filter(p => p.isDaytime && p.trendPattern);
  if (daytimeWithTrends.length === 0 && preFrontal.length === 0) return null;

  return (
    <div className={`rounded-xl p-4 border ${
      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Temp Trend Patterns
        </span>
      </div>

      {/* Week Summary */}
      {outlook && (
        <div className={`text-xs mb-3 p-2 rounded ${
          isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
        }`}>
          {outlook.summary}
          {outlook.bestWindDay && (
            <span className={`block mt-1 font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              Best day: {outlook.bestWindDay.day} — {outlook.bestWindDay.reason}
            </span>
          )}
        </div>
      )}

      {/* Pre-Frontal Alerts (these are the money days) */}
      {preFrontal.map((pf, i) => (
        <div
          key={`pf-${i}`}
          className={`flex items-center gap-2 mb-2 p-2 rounded-lg border ${
            isDark
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <Zap className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
              {pf.icon} {pf.day.name}: {pf.label}
            </div>
            <div className={`text-[10px] ${isDark ? 'text-yellow-400/70' : 'text-yellow-600/70'}`}>
              {pf.description} (before {Math.abs(pf.nextDayDrop)}°F drop)
            </div>
          </div>
        </div>
      ))}

      {/* Day-by-day Trend Badges */}
      <div className="space-y-1.5">
        {daytimeWithTrends.map((period, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs p-1.5 rounded ${
              period.trendPattern.severity === 'high'
                ? (isDark ? 'bg-slate-700/50' : 'bg-slate-50')
                : ''
            }`}
          >
            {period.trendPattern.tempDelta < 0 ? (
              <TrendingDown className={`w-3.5 h-3.5 flex-shrink-0 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`} />
            ) : (
              <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`} />
            )}
            <span className={`w-16 font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {period.name}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              period.trendPattern.type.includes('CLIFF') || period.trendPattern.type.includes('DROP')
                ? (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700')
                : (isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700')
            }`}>
              {period.trendPattern.icon} {period.trendPattern.label}
            </span>
            <span className={`ml-auto font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {period.trendPattern.tempDelta > 0 ? '+' : ''}{period.trendPattern.tempDelta}°F
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendPatterns;
