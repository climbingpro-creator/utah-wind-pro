import { Wind, Navigation } from 'lucide-react';
import { WindSparkline } from './Sparkline';
import { useTheme } from '../context/ThemeContext';

export function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function WindVector({ 
  station,
  history,
  isPersonalStation = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const { name, speed, gust, direction, temperature } = station || {};

  const getWindColor = (s, isDark = true) => {
    if (s == null) return isDark ? 'text-slate-500' : 'text-slate-400';
    if (s >= 20) return isDark ? 'text-red-400' : 'text-red-600';
    if (s >= 15) return isDark ? 'text-orange-400' : 'text-orange-600';
    if (s >= 10) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    if (s >= 5) return isDark ? 'text-green-400' : 'text-green-600';
    return isDark ? 'text-blue-400' : 'text-blue-600';
  };

  const isDark = theme === 'dark';
  const windColor = getWindColor(speed, isDark);

  if (compact) {
    return (
      <div className={`
        rounded-lg p-3 
        ${isPersonalStation 
          ? (isDark 
              ? 'bg-gradient-to-br from-cyan-900/40 to-slate-800/80 border border-cyan-500/20' 
              : 'bg-gradient-to-br from-cyan-100 to-white border border-cyan-300')
          : (isDark 
              ? 'bg-slate-800/40 border border-slate-700/50'
              : 'bg-white border border-slate-200 shadow-sm')
        }
      `}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium truncate max-w-[120px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {name}
          </span>
          {isPersonalStation && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
              PWS
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border ${isDark ? 'border-slate-600/50' : 'border-slate-300'}`} />
            <Navigation 
              className={`w-5 h-5 ${windColor}`}
              style={{ transform: `rotate(${(direction || 0) + 180}deg)` }}
            />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${windColor}`}>
                {speed?.toFixed(1) ?? '--'}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>mph</span>
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {windDirectionToCardinal(direction)}
              {gust != null && gust > speed && (
                <span className={`ml-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>G{gust.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${isPersonalStation ? '!border-sky-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${isPersonalStation ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`} />
          <h3 className="font-semibold text-sm truncate max-w-[150px] text-[var(--text-primary)]">
            {name}
          </h3>
        </div>
        {isPersonalStation && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500">PWS</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[var(--border-color)]" />
          <Navigation 
            className={`w-7 h-7 ${windColor} transition-transform duration-500`}
            style={{ transform: `rotate(${(direction || 0) + 180}deg)` }}
          />
        </div>

        <div className="flex-1 space-y-0.5">
          <div className="flex items-baseline gap-1">
            <span className={`data-number-sm ${windColor}`}>
              {speed?.toFixed(1) ?? '--'}
            </span>
            <span className="data-label">mph</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span>
              {windDirectionToCardinal(direction)} ({direction ?? '--'}°)
            </span>
            {gust != null && gust > speed && (
              <span className="text-amber-500 font-medium">
                G {gust.toFixed(0)}
              </span>
            )}
          </div>

          {temperature != null && (
            <div className="text-sm text-[var(--text-tertiary)]">
              {temperature.toFixed(1)}°F
            </div>
          )}
        </div>
      </div>

      {history && history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="data-label">3hr trend</span>
            <WindSparkline history={history} stationId={station?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
