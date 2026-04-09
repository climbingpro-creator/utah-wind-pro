/**
 * CollapsibleSensorCard
 * 
 * Streamlined sensor display that shows:
 * - Station Name, Current Wind Speed, Direction, Gust, 3HR Trend (always visible)
 * - Historical data logs in a collapsible accordion (hidden by default)
 * 
 * Reduces cognitive overload from the massive 15-minute history logs.
 */

import React, { useState, useMemo } from 'react';
import { Wind, Navigation, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { safeToFixed } from '../utils/safeToFixed';

function windDirectionToCardinal(deg) {
  if (deg == null) return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindColor(speed, isDark = true) {
  if (speed == null) return isDark ? 'text-slate-500' : 'text-slate-400';
  if (speed >= 20) return isDark ? 'text-red-400' : 'text-red-600';
  if (speed >= 15) return isDark ? 'text-orange-400' : 'text-orange-600';
  if (speed >= 10) return isDark ? 'text-emerald-400' : 'text-emerald-600';
  if (speed >= 5) return isDark ? 'text-sky-400' : 'text-sky-600';
  return isDark ? 'text-slate-400' : 'text-slate-500';
}

function calculate3HrTrend(history) {
  if (!history || history.length < 2) return { trend: 'flat', delta: 0 };
  
  // Get readings from last 3 hours (assuming 15-min intervals = 12 readings)
  const recent = history.slice(0, Math.min(12, history.length));
  const oldest = recent[recent.length - 1];
  const newest = recent[0];
  
  const oldSpeed = oldest?.speed ?? oldest?.windSpeed ?? 0;
  const newSpeed = newest?.speed ?? newest?.windSpeed ?? 0;
  const delta = newSpeed - oldSpeed;
  
  if (delta > 2) return { trend: 'up', delta };
  if (delta < -2) return { trend: 'down', delta };
  return { trend: 'flat', delta };
}

function TrendBadge({ trend, delta }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (trend === 'up') {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
        <TrendingUp className="w-3 h-3" />
        +{Math.abs(delta).toFixed(0)}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600'}`}>
        <TrendingDown className="w-3 h-3" />
        {delta.toFixed(0)}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
      <Minus className="w-3 h-3" />
      Steady
    </span>
  );
}

function HistoryRow({ reading, isDark }) {
  const time = reading.dateTime || reading.timestamp;
  const timeStr = time ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--';
  const speed = reading.speed ?? reading.windSpeed ?? 0;
  const dir = reading.direction ?? reading.windDirection;
  const gust = reading.gust ?? reading.windGust;
  
  return (
    <div className={`flex items-center justify-between py-1.5 px-2 text-xs ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{timeStr}</span>
      <span className={getWindColor(speed, isDark)}>{safeToFixed(speed, 0)} mph</span>
      <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>{windDirectionToCardinal(dir)}</span>
      {gust != null && gust > speed && (
        <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>G{safeToFixed(gust, 0)}</span>
      )}
    </div>
  );
}

export default function CollapsibleSensorCard({ station, history, isPersonalStation = false }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const { name, speed, gust, direction, network, isShadow } = station || {};
  const isWU = isPersonalStation && (network === 'WU' || network === 'WU-shadow');
  const windColor = getWindColor(speed, isDark);
  
  const trendData = useMemo(() => calculate3HrTrend(history), [history]);
  const hasHistory = history && history.length > 0;

  return (
    <div className={`
      rounded-xl overflow-hidden transition-all
      ${isWU
        ? (isDark
            ? 'bg-gradient-to-br from-amber-900/20 to-slate-800/80 border border-amber-500/25'
            : 'bg-gradient-to-br from-amber-50 to-white border border-amber-200')
        : isPersonalStation 
          ? (isDark 
              ? 'bg-gradient-to-br from-cyan-900/30 to-slate-800/80 border border-cyan-500/25' 
              : 'bg-gradient-to-br from-cyan-50 to-white border border-cyan-200')
          : (isDark 
              ? 'bg-slate-800/50 border border-slate-700/50'
              : 'bg-white border border-slate-200 shadow-sm')
      }
    `}>
      {/* Main Row - Always Visible */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Wind Compass */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <div className={`absolute inset-0 rounded-full border ${isDark ? 'border-slate-600/50' : 'border-slate-300'}`} />
            <Navigation 
              className={`w-5 h-5 ${windColor} transition-transform`}
              style={{ transform: `rotate(${(direction || 0) + 180}deg)` }}
            />
          </div>
          
          {/* Station Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {name}
              </span>
              {isPersonalStation && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isWU
                    ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                    : (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700')
                }`}>
                  {isWU ? (isShadow ? 'WU Backup' : 'WU') : 'PWS'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${windColor}`}>
                {safeToFixed(speed, 0)}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mph</span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {windDirectionToCardinal(direction)}
              </span>
              {gust != null && gust > speed * 1.1 && (
                <span className={`text-xs font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  G{safeToFixed(gust, 0)}
                </span>
              )}
            </div>
          </div>
          
          {/* 3HR Trend */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <TrendBadge trend={trendData.trend} delta={trendData.delta} />
            <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>3hr</span>
          </div>
        </div>
      </div>
      
      {/* Expand/Collapse Button */}
      {hasHistory && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold
            border-t transition-colors
            ${isDark 
              ? 'border-slate-700/50 text-slate-400 hover:bg-white/5' 
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }
          `}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide History
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show 15-min History ({history.length} readings)
            </>
          )}
        </button>
      )}
      
      {/* Collapsible History */}
      {expanded && hasHistory && (
        <div className={`border-t ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
          <div className="max-h-48 overflow-y-auto">
            {history.slice(0, 24).map((reading, i) => (
              <HistoryRow key={i} reading={reading} isDark={isDark} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
