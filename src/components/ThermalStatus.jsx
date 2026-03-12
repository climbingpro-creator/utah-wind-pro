import { Thermometer, TrendingUp, Compass } from 'lucide-react';

export function ThermalStatus({ 
  thermalDelta, 
  lakeshoreTemp, 
  ridgeTemp,
  convergence,
  isLoading 
}) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const delta = thermalDelta?.delta;
  const isActive = delta != null && delta >= 10;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Thermometer className="w-5 h-5 text-orange-400" />
        Thermal Analysis
      </h3>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Thermal Delta (ΔT)</span>
              <span className={`
                font-bold text-lg
                ${isActive 
                  ? 'text-green-400' 
                  : delta != null && delta > 5 
                    ? 'text-yellow-400' 
                    : 'text-slate-400'
                }
              `}>
                {delta != null ? `${delta}°F` : '--'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Lakeshore: {lakeshoreTemp?.toFixed(1) ?? '--'}°F</span>
              <span>Ridge: {ridgeTemp?.toFixed(1) ?? '--'}°F</span>
            </div>
            {isActive && (
              <div className="mt-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded inline-block">
                Thermal Pump ACTIVE
              </div>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {delta == null 
                ? 'Waiting for ridge data...'
                : delta >= 15 
                  ? 'Strong thermal gradient - excellent conditions'
                  : delta >= 10
                    ? 'Good thermal gradient developing'
                    : delta >= 5
                      ? 'Moderate thermal gradient'
                      : delta >= 0
                        ? 'Weak thermal gradient'
                        : 'Inverted gradient - poor conditions'
              }
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Compass className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Vector Convergence</span>
              <span className={`
                text-sm font-medium capitalize
                ${convergence?.alignment === 'excellent' || convergence?.alignment === 'good'
                  ? 'text-green-400' 
                  : convergence?.alignment === 'moderate'
                    ? 'text-yellow-400'
                    : 'text-slate-400'
                }
              `}>
                {convergence?.alignment || '--'}
              </span>
            </div>
            {convergence?.score != null && (
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        convergence.score >= 70 ? 'bg-green-500' :
                        convergence.score >= 50 ? 'bg-yellow-500' :
                        convergence.score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${convergence.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8">{convergence.score}%</span>
                </div>
              </div>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {convergence?.alignment === 'excellent'
                ? 'Winds aligned for optimal thermal development'
                : convergence?.alignment === 'good'
                  ? 'Good wind alignment for thermals'
                  : convergence?.alignment === 'moderate'
                    ? 'Partial wind alignment'
                    : convergence?.alignment === 'poor'
                      ? 'Poor wind alignment - cross-flow likely'
                      : 'Analyzing wind patterns...'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
