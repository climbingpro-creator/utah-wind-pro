import { Navigation, AlertTriangle } from 'lucide-react';
import { windDirectionToCardinal } from '../utils/wind';

export default function PrimaryWindDisplay({ station, optimalDirection, isLoading, pwsUnavailable }) {
  if (isLoading || !station) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center justify-center gap-4">
          <div className="w-14 h-14 bg-[var(--border-color)] rounded-full" />
          <div className="space-y-2">
            <div className="h-8 bg-[var(--border-color)] rounded w-24" />
            <div className="h-4 bg-[var(--border-color)] rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const speed = station.windSpeed ?? station.speed;
  const direction = station.windDirection ?? station.direction;
  const cardinal = windDirectionToCardinal(direction);
  const stationName = station.name || 'Primary Station';
  const isYourStation = station.isYourStation || station.isPWS;
  
  const isOptimal = optimalDirection?.status === 'optimal';
  const isWrong = optimalDirection?.status === 'wrong';
  
  const speedColor = speed >= 8 ? 'text-emerald-500' : speed >= 4 ? 'text-amber-500' : 'text-[var(--text-tertiary)]';
  const directionColor = isOptimal ? 'text-emerald-500' : isWrong ? 'text-red-500' : 'text-sky-500';

  return (
    <div className={`card ${
      isOptimal ? '!border-emerald-500/30' : isWrong ? '!border-red-500/30' : ''
    }`}>
      {pwsUnavailable && (
        <div className="text-xs text-amber-500 font-medium text-center mb-2 flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>PWS unavailable — showing nearest station</span>
        </div>
      )}
      <div className="text-center mb-2 flex items-center justify-center gap-1">
        {isYourStation && <span className="text-sky-500">📍</span>}
        <span className={`text-xs ${isYourStation ? 'text-sky-500 font-medium' : 'text-[var(--text-tertiary)]'}`}>
          {stationName}
        </span>
        {!isYourStation && !pwsUnavailable && <span className="text-[var(--text-tertiary)] text-[10px]">(MesoWest)</span>}
      </div>
      
      <div className="flex items-center justify-center gap-6">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            {direction != null ? (
              <Navigation 
                className={`w-7 h-7 ${directionColor} transition-transform duration-500`}
                style={{ transform: `rotate(${direction + 180}deg)` }}
              />
            ) : (
              <span className="text-[var(--text-tertiary)] text-xs">--</span>
            )}
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-tertiary)]">N</div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 text-[9px] text-[var(--text-tertiary)]">E</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-tertiary)]">S</div>
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 text-[9px] text-[var(--text-tertiary)]">W</div>
        </div>

        <div className="text-center">
          <div className={`data-number ${speedColor}`}>
            {speed != null ? speed.toFixed(1) : '--'}
          </div>
          <div className="data-label mt-0.5">mph</div>
          <div className={`text-sm font-semibold mt-1 ${directionColor}`}>
            {cardinal} 
            <span className="text-[var(--text-tertiary)] text-xs ml-1">
              {direction != null ? `${Math.round(direction)}°` : ''}
            </span>
          </div>
          {optimalDirection?.expected && (
            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Need: {optimalDirection.expected}
            </div>
          )}
        </div>
      </div>

      {Number(station.windGust ?? station.gust) > (speed || 0) * 1.3 && (
        <div className="mt-2 text-center text-xs text-amber-500 font-medium">
          Gusts to {Number(station.windGust ?? station.gust).toFixed(1)} mph
        </div>
      )}
    </div>
  );
}
