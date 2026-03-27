import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';
import { analyzeDailyTrends, findPreFrontalDays, getWeekOutlook } from '../services/PatternLogic';
import { get7DayForecast } from '../services/ForecastService';
import { useTheme } from '../context/ThemeContext';

const WIND_SEEKING = new Set(['kiting', 'sailing', 'windsurfing']);
const CALM_SEEKING = new Set(['boating', 'paddling']);

const SCORE_TABLES = {
  kiting: {
    PRE_FRONTAL: 95,
    SOUTH_CLIMB: 85,
    MODERATE_RISE: 70,
    MODERATE_DROP: 60,
    NORTH_CLIFF: 55,
    CALM: 50,
  },
  sailing: {
    PRE_FRONTAL: 90,
    SOUTH_CLIMB: 80,
    MODERATE_RISE: 75,
    MODERATE_DROP: 55,
    NORTH_CLIFF: 50,
    CALM: 45,
  },
  windsurfing: {
    PRE_FRONTAL: 93,
    SOUTH_CLIMB: 85,
    MODERATE_RISE: 70,
    MODERATE_DROP: 58,
    NORTH_CLIFF: 52,
    CALM: 48,
  },
  boating: {
    CALM: 90,
    MODERATE_RISE: 65,
    MODERATE_DROP: 50,
    SOUTH_CLIMB: 40,
    PRE_FRONTAL: 30,
    NORTH_CLIFF: 20,
  },
  paddling: {
    CALM: 95,
    MODERATE_RISE: 60,
    MODERATE_DROP: 45,
    SOUTH_CLIMB: 35,
    PRE_FRONTAL: 25,
    NORTH_CLIFF: 15,
  },
  fishing: {
    PRE_FRONTAL: 90,
    MODERATE_DROP: 75,
    SOUTH_CLIMB: 70,
    CALM: 55,
    MODERATE_RISE: 45,
    NORTH_CLIFF: 40,
  },
  paragliding: {
    PRE_FRONTAL: 88,
    SOUTH_CLIMB: 82,
    MODERATE_RISE: 72,
    NORTH_CLIFF: 65,
    CALM: 50,
    MODERATE_DROP: 55,
  },
};

const PATTERN_ICONS = {
  SOUTH_CLIMB: '🔥',
  NORTH_CLIFF: '🌬️',
  PRE_FRONTAL: '⚡',
  MODERATE_RISE: '☀️',
  MODERATE_DROP: '🌤️',
  CALM: '☀️',
};

function getPatternLabel(type) {
  const labels = {
    SOUTH_CLIMB: 'South Climb',
    NORTH_CLIFF: 'North Cliff',
    PRE_FRONTAL: 'Pre-Frontal',
    MODERATE_RISE: 'Warming',
    MODERATE_DROP: 'Cooling',
    CALM: 'Calm',
  };
  return labels[type] || 'Stable';
}

function scoreDayForActivity(day, activity, preFrontalSet) {
  const table = SCORE_TABLES[activity] || SCORE_TABLES.kiting;

  if (preFrontalSet.has(day.name)) {
    return { score: table.PRE_FRONTAL, pattern: 'PRE_FRONTAL' };
  }

  const patternType = day.trendPattern?.type;
  if (patternType && table[patternType] !== undefined) {
    return { score: table[patternType], pattern: patternType };
  }

  return { score: table.CALM, pattern: 'CALM' };
}

function scoreBarColor(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function bestDayDescription(dayName, pattern, preFrontalDays) {
  if (pattern === 'PRE_FRONTAL') {
    const pf = preFrontalDays.find(d => d.day.name === dayName);
    const desc = pf
      ? `Pre-frontal surge before ${pf.day.name}'s cold front`
      : 'Pre-frontal wind surge expected';
    return `${dayName} — ${desc}`;
  }
  const label = getPatternLabel(pattern);
  return `${dayName} — ${label} pattern`;
}

const WeekPlanner = ({ activity = 'kiting', locationId = 'utah-lake' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const raw = await get7DayForecast(locationId);
        if (cancelled) return;
        if (!raw) throw new Error('No forecast data available');
        setForecast(raw);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load forecast');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [locationId]);

  const analysisData = useMemo(() => {
    if (!forecast) return null;

    const annotated = analyzeDailyTrends(forecast);
    const preFrontalDays = findPreFrontalDays(annotated);
    const outlook = getWeekOutlook(annotated);

    const preFrontalSet = new Set(preFrontalDays.map(pf => pf.day.name));
    const daytime = annotated.filter(p => p.isDaytime);

    const scored = daytime.map(day => {
      const { score, pattern } = scoreDayForActivity(day, activity, preFrontalSet);
      return { ...day, activityScore: score, resolvedPattern: pattern };
    });

    const best = scored.reduce(
      (top, d) => (d.activityScore > top.activityScore ? d : top),
      scored[0],
    );

    return { scored, best, outlook, preFrontalDays };
  }, [forecast, activity]);

  if (loading) {
    return (
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 justify-center py-8">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading week planner…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 justify-center py-8">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</span>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const { scored, best, outlook, preFrontalDays } = analysisData;

  return (
    <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Week Planner
          </span>
        </div>
        {best && (
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Best: <span className="text-cyan-500 font-medium">{best.name}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {scored.map((day) => {
          const isBest = best && day.name === best.name;
          const patternIcon = PATTERN_ICONS[day.resolvedPattern] || '☀️';

          return (
            <div
              key={day.name}
              className={`
                flex flex-col items-center rounded-lg p-2 transition-colors
                ${isBest ? 'ring-1 ring-cyan-500/60' : ''}
                ${isDark ? 'bg-slate-700/40 hover:bg-slate-700/60' : 'bg-slate-50 hover:bg-slate-100'}
              `}
            >
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {day.name.slice(0, 3)}
              </span>

              <span className={`text-lg font-semibold leading-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {day.temperature}°
              </span>

              <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5 bg-slate-600/30">
                <div
                  className={`h-full rounded-full transition-all ${scoreBarColor(day.activityScore)}`}
                  style={{ width: `${day.activityScore}%` }}
                />
              </div>

              <span className="text-base mt-1" title={getPatternLabel(day.resolvedPattern)}>
                {patternIcon}
              </span>
            </div>
          );
        })}
      </div>

      {best && (
        <div className={`mt-3 rounded-lg px-3 py-2 ${isDark ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <span className={`text-xs font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              Best Day
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-cyan-200/80' : 'text-cyan-800'}`}>
            {bestDayDescription(best.name, best.resolvedPattern, preFrontalDays)}
          </p>
        </div>
      )}

      {outlook?.summary && (
        <p className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {outlook.summary}
        </p>
      )}
    </div>
  );
};

export default WeekPlanner;
