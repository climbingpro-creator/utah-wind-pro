import { AlertTriangle, Radio, TrendingUp, Gauge, Eye, Thermometer, Wind, CloudRain, Navigation, Compass } from 'lucide-react';

const REGIME_DISPLAY = {
  postfrontal: { label: 'Postfrontal Clearing', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: Wind },
  synoptic_wind: { label: 'Synoptic Wind', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: Compass },
  north_flow: { label: 'North Flow', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Wind },
  frontal: { label: 'Frontal Passage', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: CloudRain },
  thermal: { label: 'Thermal Cycle', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Thermometer },
  glass: { label: 'Glass / Calm', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: Eye },
  building: { label: 'Building', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: TrendingUp },
  transitional: { label: 'Transitional', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: Radio },
  uncertain: { label: 'Uncertain', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: Radio },
};

const SOURCE_ICONS = {
  thermal: Thermometer,
  pressure: Gauge,
  frontal: CloudRain,
  spatial: Radio,
  glass: Eye,
  ground_truth: Wind,
  valley_pattern: Navigation,
};

function getSignalColor(signal) {
  const t = signal.type;
  if (t === 'clearing' || t === 'coherent') return 'text-cyan-400';
  if (t === 'windy') return 'text-blue-400';
  if (t === 'bullish' || t === 'thermal_favorable') return 'text-emerald-400';
  if (t === 'north_flow') return 'text-blue-400';
  if (t === 'bearish') return 'text-red-400';
  if (t === 'calm') return 'text-sky-400';
  return 'text-[var(--text-tertiary)]';
}

function getSignalBarColor(signal) {
  const t = signal.type;
  if (t === 'clearing' || t === 'coherent') return 'bg-cyan-500';
  if (t === 'windy' || t === 'north_flow') return 'bg-blue-500';
  if (t === 'bullish' || t === 'thermal_favorable') return 'bg-emerald-500';
  if (t === 'bearish') return 'bg-red-500';
  if (t === 'calm') return 'bg-sky-500';
  return 'bg-slate-500';
}

export default function SignalConvergence({ intelligence }) {
  if (!intelligence || intelligence.signalCount === 0) return null;

  const { regime, regimeConfidence, signals, conflicts, convergenceScore, adjustedThermalProbability, narrative, valleyWind } = intelligence;
  const display = REGIME_DISPLAY[regime] || REGIME_DISPLAY.uncertain;
  const RegimeIcon = display.icon;

  const convergenceColor = convergenceScore >= 70 ? 'text-emerald-400' : convergenceScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const convergenceBg = convergenceScore >= 70 ? 'bg-emerald-500' : convergenceScore >= 40 ? 'bg-amber-500' : 'bg-red-500';

  const showStationMap = valleyWind && valleyWind.stationDetails?.length >= 2;

  return (
    <div className="card space-y-3">
      {/* Regime Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-bold text-[var(--text-primary)]">Weather Pattern</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${display.bg} ${display.color} border ${display.border}`}>
          <RegimeIcon className="w-3 h-3" />
          {display.label}
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-tertiary)]">Forecast Confidence</span>
          <span className={`font-bold ${convergenceColor}`}>{convergenceScore}%</span>
        </div>
        <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div className={`h-full ${convergenceBg} rounded-full transition-all duration-700`} style={{ width: `${convergenceScore}%` }} />
        </div>
      </div>

      {/* Regime Confidence */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-tertiary)]">Regime Confidence</span>
        <span className={`font-bold ${display.color}`}>{regimeConfidence}%</span>
      </div>

      {/* Valley Station Map — shows when multi-station data is available */}
      {showStationMap && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Valley Station Network
          </div>
          <div className="flex flex-wrap gap-1">
            {valleyWind.stationDetails.map((st) => {
              const hasWind = st.speed >= 5;
              const isClearing = hasWind && (st.dir >= 270 || st.dir <= 45);
              const bgClass = isClearing
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : hasWind
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]';
              const textClass = isClearing
                ? 'text-cyan-400'
                : hasWind
                  ? 'text-blue-400'
                  : 'text-[var(--text-tertiary)]';
              return (
                <div key={st.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${bgClass}`}>
                  <Navigation
                    size={10}
                    className={textClass}
                    style={{ transform: `rotate(${((st.dir ?? 0) + 180) % 360}deg)` }}
                  />
                  <span className={`font-semibold ${textClass}`}>{st.id}</span>
                  <span className="text-[var(--text-secondary)]">
                    {Math.round(st.speed)} {st.cardinal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adjusted Probability (if different from raw) */}
      {intelligence.hasConflicts && adjustedThermalProbability != null && (
        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Adjusted Probability: {adjustedThermalProbability}%
          </div>
        </div>
      )}

      {/* Active Signals */}
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {signals.length} Active Signals
        </div>
        <div className="grid grid-cols-2 gap-1">
          {signals.map((signal, i) => {
            const Icon = SOURCE_ICONS[signal.source] || Radio;
            const typeColor = getSignalColor(signal);
            const barColor = getSignalBarColor(signal);
            return (
              <div key={i} className="flex items-center gap-1.5 text-[10px] px-1.5 py-1 rounded bg-[var(--bg-secondary)]">
                <Icon className={`w-2.5 h-2.5 ${typeColor} flex-shrink-0`} />
                <span className="text-[var(--text-secondary)] truncate">{signal.detail}</span>
                <div className="ml-auto flex-shrink-0">
                  <div className="w-6 h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${signal.strength * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
            {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Detected
          </div>
          {conflicts.map((c, i) => (
            <div key={i} className="text-[10px] px-2 py-1.5 rounded bg-red-500/[0.06] border border-red-500/20 text-red-300">
              <div className="font-semibold">{c.message}</div>
              <div className="mt-0.5 text-red-400/70">{c.resolution}</div>
            </div>
          ))}
        </div>
      )}

      {/* Narrative */}
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line border-t border-[var(--border-subtle)] pt-2">
        {narrative}
      </div>
    </div>
  );
}
