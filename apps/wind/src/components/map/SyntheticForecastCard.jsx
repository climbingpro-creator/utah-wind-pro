import { X, Navigation, Thermometer, Gauge, Waves } from 'lucide-react';
import { safeToFixed } from '../../utils/safeToFixed';

function getCardinalDirection(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Floating card that displays IDW-interpolated weather data
 * for a pin-dropped location on the map.
 */
export default function SyntheticForecastCard({ data, onClose }) {
  if (!data) return null;

  const { interpolated: d, stations, method } = data;
  const cardinal = getCardinalDirection(d.direction);
  const arrowRotation = d.direction != null ? (d.direction + 180) % 360 : null;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden">

        {/* Badge + Close */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600/30 to-sky-600/30 border border-purple-500/40 text-purple-300">
            <span className="text-xs">⚡</span> AI Synthesized
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close pin drop"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wind */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20">
              {arrowRotation != null ? (
                <Navigation
                  className="w-6 h-6 text-purple-400"
                  style={{ transform: `rotate(${arrowRotation}deg)` }}
                />
              ) : (
                <Navigation className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white tabular-nums">
                  {d.speed != null ? safeToFixed(d.speed, 1) : '--'}
                </span>
                <span className="text-sm text-slate-400">mph</span>
                {d.gust != null && d.gust > (d.speed || 0) * 1.2 && (
                  <span className="text-sm font-bold text-amber-400 ml-1">
                    G{safeToFixed(d.gust, 0)}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {d.direction != null
                  ? `from ${d.direction}° ${cardinal}`
                  : 'Direction unavailable'}
              </div>
            </div>
          </div>
        </div>

        {/* Temp + Pressure row */}
        {(d.temperature != null || d.pressure != null) && (
          <div className="flex gap-2 px-3 pb-2.5">
            {d.temperature != null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] flex-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-xs font-bold text-white">{safeToFixed(d.temperature, 1)}°F</span>
              </div>
            )}
            {d.pressure != null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] flex-1">
                <Gauge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-white">{safeToFixed(d.pressure, 2)} hPa</span>
              </div>
            )}
          </div>
        )}

        {/* Microclimate Physics */}
        {d.physicsReasons?.length > 0 && (
          <div className="px-3 pb-2">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2 space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Waves className="w-3 h-3 text-cyan-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Microclimate Physics</span>
              </div>
              {d.physicsReasons.map((reason, i) => {
                const isBoost = reason.startsWith('+');
                return (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className={`text-[10px] font-mono font-bold shrink-0 ${isBoost ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isBoost ? '▲' : '▼'}
                    </span>
                    <span className={`text-[10px] leading-tight ${isBoost ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>
                      {reason}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sources footer */}
        <div className="px-3 pb-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {method === 'exact'
              ? `Exact match — ${stations?.[0]?.name || 'station'}`
              : `Based on ${d.stationCount} station${d.stationCount !== 1 ? 's' : ''} within ${safeToFixed(d.maxDistance, 1)} mi`
            }
          </span>
          {stations?.length > 0 && method !== 'exact' && (
            <div className="flex -space-x-1">
              {stations.slice(0, 4).map((s, i) => (
                <div
                  key={s.id || i}
                  className="w-4 h-4 rounded-full border border-slate-800 flex items-center justify-center text-[7px] font-bold"
                  style={{ backgroundColor: `hsl(${260 + i * 30}, 60%, 50%)`, zIndex: 4 - i }}
                  title={`${s.name || s.id} — ${s.distance} mi (${Math.round(s.weight * 100)}%)`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
