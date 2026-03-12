import { AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';

export function BustAlert({ pressureData, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    );
  }

  if (!pressureData || pressureData.gradient == null) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <p className="text-slate-500">Pressure data unavailable</p>
      </div>
    );
  }

  const { gradient, isBustCondition, slcPressure, provoPressure, highName, lowName } = pressureData;
  const absGradient = Math.abs(gradient);

  return (
    <div className={`
      rounded-xl p-4 border transition-all duration-300
      ${isBustCondition 
        ? 'bg-red-900/30 border-red-500/50' 
        : absGradient > 1.0
          ? 'bg-yellow-900/20 border-yellow-500/30'
          : 'bg-green-900/20 border-green-500/30'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isBustCondition 
            ? 'bg-red-500/20' 
            : absGradient > 1.0
              ? 'bg-yellow-500/20'
              : 'bg-green-500/20'
          }
        `}>
          {isBustCondition ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : absGradient > 1.0 ? (
            <TrendingDown className="w-6 h-6 text-yellow-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`
              font-semibold
              ${isBustCondition 
                ? 'text-red-400' 
                : absGradient > 1.0
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }
            `}>
              {isBustCondition 
                ? 'BUST ALERT' 
                : absGradient > 1.0
                  ? 'Caution'
                  : 'Clear'
              }
            </h3>
            <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${isBustCondition 
                ? 'bg-red-500/30 text-red-300' 
                : absGradient > 1.0
                  ? 'bg-yellow-500/30 text-yellow-300'
                  : 'bg-green-500/30 text-green-300'
              }
            `}>
              ΔP = {gradient > 0 ? '+' : ''}{gradient.toFixed(2)} mb
            </span>
          </div>

          <p className="text-slate-400 text-sm mb-2">
            {isBustCondition 
              ? 'Pressure gradient exceeds 2.0mb. North flow interference likely to disrupt thermals.'
              : absGradient > 1.0
                ? 'Moderate pressure gradient detected. Watch for gusty or variable conditions.'
                : 'Pressure gradient favorable for thermal development.'
            }
          </p>

          <div className="flex gap-4 text-xs text-slate-500">
            <span>{highName || 'High'}: {slcPressure?.toFixed(2) ?? '--'} mb</span>
            <span>{lowName || 'Low'}: {provoPressure?.toFixed(2) ?? '--'} mb</span>
          </div>
        </div>
      </div>
    </div>
  );
}
