import { useMemo } from 'react';
import { Wind, ArrowRight, Clock, Zap, MapPin, TrendingUp, Radio } from 'lucide-react';
import { safeToFixed } from '../utils/safeToFixed';

const PHASE_CONFIG = {
  none:        { color: 'text-gray-500',   bg: 'bg-gray-500/10',  border: 'border-gray-600/30',  label: 'No Signal',    icon: Radio },
  propagating: { color: 'text-amber-400',  bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Propagating',  icon: TrendingUp },
  arrived:     { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',label: 'Arrived',    icon: Zap },
};

function NodeDot({ node, isTarget }) {
  const fired = node.fired;
  const dotColor = fired
    ? isTarget ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-amber-400 shadow-amber-400/50'
    : 'bg-gray-600';
  const ringColor = fired
    ? isTarget ? 'ring-emerald-400/40' : 'ring-amber-400/40'
    : 'ring-gray-700';

  return (
    <div className="flex flex-col items-center gap-1 relative group">
      <div
        className={`w-4 h-4 rounded-full ${dotColor} ${fired ? 'shadow-lg ring-2' : ''} ${ringColor} transition-all duration-500`}
        aria-label={`${node.name}: ${fired ? 'active' : 'inactive'}`}
      />
      {fired && (
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping opacity-60" />
      )}

      <div className="text-center w-16 sm:w-20">
        <p className={`text-[10px] font-bold leading-tight ${fired ? (isTarget ? 'text-emerald-300' : 'text-amber-300') : 'text-gray-500'}`}>
          {node.id === 'PWS' ? 'YOU' : node.id}
        </p>
        {fired && node.speed != null && (
          <p className={`text-[10px] ${isTarget ? 'text-emerald-400' : 'text-amber-400'} font-mono`}>
            {safeToFixed(node.speed, 0)} mph
          </p>
        )}
        {fired && node.direction != null && (
          <p className="text-[9px] text-gray-500 font-mono">{Math.round(node.direction)}°</p>
        )}
      </div>

      <div className="hidden group-hover:block absolute -bottom-14 left-1/2 -translate-x-1/2 z-50
        bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-[10px] text-gray-300 whitespace-nowrap shadow-xl">
        <p className="font-semibold text-white">{node.name}</p>
        <p>{node.role}</p>
        {node.lagMinutes !== 0 && (
          <p className="text-cyan-400">Lead: {Math.abs(node.lagMinutes)} min {node.lagMinutes < 0 ? 'before' : 'after'}</p>
        )}
      </div>
    </div>
  );
}

function ChainConnector({ fired }) {
  return (
    <div className="flex items-center flex-1 min-w-4 max-w-12 relative">
      <div className={`h-0.5 w-full transition-colors duration-500 ${fired ? 'bg-amber-400/60' : 'bg-gray-700'}`} />
      {fired && (
        <ArrowRight className="w-3 h-3 text-amber-400 absolute right-0 -translate-y-0" />
      )}
    </div>
  );
}

function PropagationChain({ type, data }) {
  if (!data?.nodes?.length) return null;

  const phaseCfg = PHASE_CONFIG[data.phase] || PHASE_CONFIG.none;
  const PhaseIcon = phaseCfg.icon;
  const label = data.label || (type === 'se_thermal' ? 'SE Thermal' : 'North Flow');
  const chainDir = data.flowDir || (type === 'se_thermal' ? 'S → N' : 'N → S');

  return (
    <div className={`rounded-xl ${phaseCfg.bg} border ${phaseCfg.border} p-3 sm:p-4 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PhaseIcon className={`w-4 h-4 ${phaseCfg.color}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${phaseCfg.color}`}>
            {label}
          </span>
          <span className="text-[10px] text-gray-500">({chainDir})</span>
        </div>

        <div className="flex items-center gap-2">
          {data.etaMinutes != null && data.phase === 'propagating' && (
            <div className="flex items-center gap-1 bg-amber-500/20 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">
                ETA {data.etaMinutes} min
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              data.confidence >= 70 ? 'bg-emerald-400' : data.confidence >= 40 ? 'bg-amber-400' : 'bg-gray-500'
            }`} />
            <span className="text-[10px] text-gray-400">{data.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Station chain visualization */}
      <div className="flex items-start justify-between px-1">
        {data.nodes.map((node, i) => (
          <div key={node.id} className="contents">
            <NodeDot
              node={node}
              isTarget={node.isTarget || node.lagMinutes === 0}
            />
            {i < data.nodes.length - 1 && (
              <ChainConnector
                fired={node.fired && data.nodes[i + 1]?.fired}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 leading-relaxed">{data.message}</p>

      {!data.pressureOk && (
        <p className="text-[10px] text-red-400 mt-1">Pressure gradient unfavorable</p>
      )}

      {data.firedCount > 0 && data.firedCount < data.totalNodes && (
        <div className="mt-2 h-1 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${(data.firedCount / data.totalNodes) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function PropagationTracker({ propagation }) {
  const chains = propagation?.chains || [];
  const dominant = propagation?.dominant;
  const hasSignal = chains.some(c => c.phase !== 'none');
  const totalStations = chains.reduce((n, c) => n + (c.nodes?.length || 0), 0);

  const summaryMessage = useMemo(() => {
    if (!hasSignal) return 'Monitoring station network for wind signals...';
    if (dominant?.phase === 'arrived') {
      return `${dominant.label} has arrived at your station`;
    }
    if (dominant?.phase === 'propagating') {
      return `${dominant.label} propagating — ${dominant.confidence}% confidence`;
    }
    return 'Weak signals — monitoring...';
  }, [hasSignal, dominant]);

  if (!propagation || chains.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Wind className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white">Propagation Tracker</h3>
        <MapPin className="w-3 h-3 text-gray-500 ml-auto" />
        <span className="text-[10px] text-gray-500">
          {totalStations} stations / {chains.length} chain{chains.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs text-gray-400 -mt-1">{summaryMessage}</p>

      {chains.filter(c => c.phase !== 'none').map(chain => (
        <PropagationChain key={chain.chainKey} type={chain.chainKey} data={chain} />
      ))}

      {!hasSignal && chains.length > 0 && (
        <div className="rounded-xl bg-gray-500/5 border border-gray-700/30 p-4 text-center">
          <Radio className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">
            Monitoring station network for wind signals
          </p>
          {chains.map(chain => (
            <p key={chain.chainKey} className="text-[10px] text-gray-600 mt-1">
              {chain.label}: {chain.nodes?.map(n => n.isTarget ? 'You' : n.id).join(' → ')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
