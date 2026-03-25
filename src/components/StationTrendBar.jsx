import { useMemo } from 'react';
import { Navigation } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { windDirectionToCardinal } from '../utils/wind';
import { safeToFixed } from '../utils/safeToFixed';

function getBarColor(speed) {
  if (speed >= 20) return { bg: 'bg-red-500', text: 'text-red-400' };
  if (speed >= 15) return { bg: 'bg-orange-500', text: 'text-orange-400' };
  if (speed >= 10) return { bg: 'bg-yellow-500', text: 'text-yellow-400' };
  if (speed >= 5) return { bg: 'bg-green-500', text: 'text-green-400' };
  return { bg: 'bg-blue-500', text: 'text-blue-400' };
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'p' : 'a';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')}${ampm}`;
  } catch {
    return '--';
  }
}

export function StationTrendBar({ history, expanded = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const bars = useMemo(() => {
    if (!history || !Array.isArray(history) || history.length === 0) return [];

    const sorted = [...history]
      .filter(h => h.windSpeed != null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (sorted.length <= 12) return sorted;

    const step = Math.max(1, Math.floor(sorted.length / 12));
    const sampled = [];
    for (let i = 0; i < sorted.length; i += step) {
      sampled.push(sorted[i]);
    }
    if (sampled[sampled.length - 1] !== sorted[sorted.length - 1]) {
      sampled.push(sorted[sorted.length - 1]);
    }
    return sampled.slice(-12);
  }, [history]);

  if (bars.length < 2) return null;

  const maxSpeed = Math.max(...bars.map(b => Math.max(b.windSpeed || 0, b.windGust || 0)), 5);

  const first = bars[0]?.windSpeed ?? 0;
  const last = bars[bars.length - 1]?.windSpeed ?? 0;
  const delta = last - first;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-2">
        <span className="data-label">3hr trend</span>
        <span className={`text-xs font-medium ${
          delta > 1 ? (isDark ? 'text-green-400' : 'text-green-600') :
          delta < -1 ? (isDark ? 'text-red-400' : 'text-red-600') :
          (isDark ? 'text-slate-500' : 'text-slate-400')
        }`}>
          {delta > 0 ? '+' : ''}{safeToFixed(delta, 1)} mph
        </span>
      </div>

      <div className="flex items-end gap-[3px]" style={{ height: expanded ? 64 : 48 }}>
        {bars.map((bar, i) => {
          const speed = bar.windSpeed ?? 0;
          const gust = bar.windGust ?? 0;
          const pct = (speed / maxSpeed) * 100;
          const gustPct = gust > speed ? ((gust - speed) / maxSpeed) * 100 : 0;
          const color = getBarColor(speed);

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip on hover */}
              <div className={`
                absolute bottom-full mb-1 px-2 py-1 rounded text-[10px] leading-tight
                whitespace-nowrap z-10 pointer-events-none
                opacity-0 group-hover:opacity-100 transition-opacity
                ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-md border border-slate-200'}
              `}>
                <div className="font-semibold">{safeToFixed(speed, 1)} mph</div>
                {gust > speed && <div className="text-orange-400">G {safeToFixed(gust, 0)}</div>}
                <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  {windDirectionToCardinal(bar.windDirection)} {bar.windDirection != null ? `${Math.round(bar.windDirection)}°` : ''}
                </div>
                <div className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                  {formatTime(bar.timestamp)}
                </div>
              </div>

              {/* Direction arrow above bar */}
              {expanded && bar.windDirection != null && (
                <Navigation
                  className={`w-2.5 h-2.5 mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                  style={{ transform: `rotate(${(bar.windDirection || 0) + 180}deg)` }}
                />
              )}

              {/* Gust cap */}
              {gustPct > 0 && (
                <div
                  className={`w-full rounded-t-sm ${isDark ? 'bg-orange-500/30' : 'bg-orange-300/50'}`}
                  style={{ height: `${gustPct}%`, minHeight: gustPct > 0 ? 2 : 0 }}
                />
              )}

              {/* Speed bar */}
              <div
                className={`w-full rounded-sm ${color.bg} transition-all duration-300 ${
                  isDark ? 'opacity-70 group-hover:opacity-100' : 'opacity-80 group-hover:opacity-100'
                }`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1">
        <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {formatTime(bars[0]?.timestamp)}
        </span>
        <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {formatTime(bars[bars.length - 1]?.timestamp)}
        </span>
      </div>

      {/* Summary row when expanded */}
      {expanded && (
        <div className={`flex justify-between mt-1.5 pt-1.5 border-t ${
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Low: {safeToFixed(Math.min(...bars.map(b => b.windSpeed ?? 99)), 1)}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Avg: {safeToFixed(bars.reduce((s, b) => s + (b.windSpeed ?? 0), 0) / bars.length, 1)}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            High: {safeToFixed(Math.max(...bars.map(b => b.windSpeed ?? 0)), 1)}
          </div>
          <div className={`text-[10px] text-orange-400`}>
            Gust: {safeToFixed(Math.max(...bars.map(b => b.windGust ?? 0)), 0)}
          </div>
        </div>
      )}
    </div>
  );
}
