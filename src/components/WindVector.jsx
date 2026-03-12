import { Wind, Navigation } from 'lucide-react';
import { WindSparkline } from './Sparkline';

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
  const { name, speed, gust, direction, temperature } = station || {};

  const getWindColor = (s) => {
    if (s == null) return 'text-slate-500';
    if (s >= 20) return 'text-red-400';
    if (s >= 15) return 'text-orange-400';
    if (s >= 10) return 'text-yellow-400';
    if (s >= 5) return 'text-green-400';
    return 'text-blue-400';
  };

  const windColor = getWindColor(speed);

  if (compact) {
    return (
      <div className={`
        rounded-lg p-3 
        ${isPersonalStation 
          ? 'bg-gradient-to-br from-cyan-900/40 to-slate-800/80 border border-cyan-500/20' 
          : 'bg-slate-800/40 border border-slate-700/50'
        }
      `}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 text-sm font-medium truncate max-w-[120px]">
            {name}
          </span>
          {isPersonalStation && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
              PWS
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-slate-600/50" />
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
              <span className="text-slate-500 text-xs">mph</span>
            </div>
            <div className="text-slate-500 text-xs">
              {windDirectionToCardinal(direction)}
              {gust != null && gust > speed && (
                <span className="text-orange-400 ml-1">G{gust.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      rounded-xl p-4 
      ${isPersonalStation 
        ? 'bg-gradient-to-br from-cyan-900/50 to-slate-800 border border-cyan-500/30' 
        : 'bg-slate-800/50 border border-slate-700'
      }
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-5 h-5 ${isPersonalStation ? 'text-cyan-400' : 'text-slate-400'}`} />
          <h3 className="font-semibold text-slate-200 truncate max-w-[150px]">
            {name}
          </h3>
        </div>
        {isPersonalStation && (
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
            PWS
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-slate-600" />
          <Navigation 
            className={`w-8 h-8 ${windColor} transition-transform duration-500`}
            style={{ 
              transform: `rotate(${(direction || 0) + 180}deg)` 
            }}
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${windColor}`}>
              {speed?.toFixed(1) ?? '--'}
            </span>
            <span className="text-slate-400 text-sm">mph</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">
              {windDirectionToCardinal(direction)} ({direction ?? '--'}°)
            </span>
            {gust != null && gust > speed && (
              <span className="text-orange-400">
                G {gust.toFixed(0)}
              </span>
            )}
          </div>

          {temperature != null && (
            <div className="text-slate-400 text-sm">
              {temperature.toFixed(1)}°F
            </div>
          )}
        </div>
      </div>

      {history && history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">3hr trend</span>
            <WindSparkline history={history} stationId={station?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
