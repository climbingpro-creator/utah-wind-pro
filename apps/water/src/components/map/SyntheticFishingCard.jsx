import { X, Thermometer, Droplets, Activity, Waves, Fish, Gauge, Anchor, MapPin, Shield } from 'lucide-react';

const CLARITY_STYLE = {
  'blown out':       { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-500' },
  'stained/blown out': { color: 'text-red-400',   bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-500' },
  'stained':         { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  'slightly off-color': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  'clear':           { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  'clear/low':       { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  'unknown':         { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   dot: 'bg-slate-500' },
};

const FLOW_STYLE = {
  dangerous: 'text-red-400',
  high:      'text-amber-400',
  moderate:  'text-yellow-400',
  ideal:     'text-emerald-400',
  low:       'text-sky-400',
  stillwater: 'text-cyan-400',
  unknown:   'text-slate-400',
};

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c1a12]/90 backdrop-blur-xl shadow-2xl overflow-hidden w-[300px] animate-pulse">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-2.5 w-32 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-3">
        <div className="h-10 rounded-lg bg-white/[0.04]" />
        <div className="h-16 rounded-lg bg-white/[0.04]" />
        <div className="h-12 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  );
}

function LakeIntelGrid({ intel }) {
  if (!intel) return null;

  return (
    <div className="px-3 pb-1.5">
      {/* Top row: 2-column compact grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        {intel.targetDepth && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Anchor className="w-2.5 h-2.5 text-emerald-500/70" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Depth</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.targetDepth}</p>
          </div>
        )}
        {intel.forage && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin className="w-2.5 h-2.5 text-emerald-500/70" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Forage</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.forage}</p>
          </div>
        )}
      </div>
      {/* Species */}
      {intel.species?.length > 0 && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 mb-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Fish className="w-2.5 h-2.5 text-emerald-500/70" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Species</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.species.join(', ')}</p>
        </div>
      )}
      {/* Regulations */}
      {intel.regulations && (
        <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-2.5 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Shield className="w-2.5 h-2.5 text-amber-500/70" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-500/60">Regulations</span>
          </div>
          <p className="text-[10px] font-semibold text-amber-200/80 leading-snug">{intel.regulations}</p>
        </div>
      )}
    </div>
  );
}

function RiverTelemetryGrid({ data }) {
  const flowColor = FLOW_STYLE[data.flowCategory] || 'text-slate-400';
  if (!data.usgsGauge) return null;
  return (
    <div className="px-4 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {data.usgsGauge.dischargeCFS != null && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Flow</div>
            <div className={`text-sm font-extrabold ${flowColor}`}>
              {data.usgsGauge.dischargeCFS.toLocaleString()} CFS
            </div>
          </div>
        )}
        {data.usgsGauge.gaugeHeightFt != null && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Gauge</div>
            <div className="text-sm font-extrabold text-cyan-400">{data.usgsGauge.gaugeHeightFt} ft</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SyntheticFishingCard({ data, isLoading, onClose }) {
  if (isLoading) {
    return (
      <div className="relative">
        <LoadingSkeleton />
        <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors z-10">
          <X className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isLake = data.waterType === 'lake';
  const isUSGS = data.dataSource?.includes('USGS');
  const clarityStyle = CLARITY_STYLE[data.clarity] || CLARITY_STYLE['unknown'];

  return (
    <div className={`rounded-2xl border bg-[#0c1a12]/90 backdrop-blur-xl shadow-2xl overflow-hidden w-[300px] ${
      isLake ? 'border-emerald-500/20' : 'border-cyan-500/15'
    }`}>
      {/* Header: Name + Water Temp */}
      <div className="px-3 pt-3 pb-1.5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-white truncate">
              {isLake ? data.lakeIntel?.name : (data.usgsGauge?.siteName || 'River / Stream')}
            </h3>
            <p className="text-[9px] text-slate-500 truncate">
              {isLake ? `${data.lakeIntel?.season} · ${data.elevation?.toLocaleString()} ft elevation` : `${data.coordinates?.lat?.toFixed(3)}, ${data.coordinates?.lng?.toFixed(3)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors ml-2 shrink-0">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isLake
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-cyan-500/10 border border-cyan-500/20'
          }`}>
            <Thermometer className={`w-5 h-5 ${isLake ? 'text-emerald-400' : 'text-cyan-400'}`} />
          </div>
          <div>
            <div className="text-xl font-black text-white tracking-tight">
              {data.waterTemp != null ? `${Math.round(data.waterTemp)}°F` : '--'}
            </div>
            <div className="text-[9px] font-medium text-slate-400">Estimated Water Temp</div>
          </div>
        </div>
      </div>

      {/* Trust Badge */}
      <div className="px-3 pb-1.5">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isLake
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : isUSGS
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
        }`}>
          {isLake ? (
            <>
              <Fish className="w-3 h-3" />
              <span>Lake Intel</span>
            </>
          ) : isUSGS ? (
            <>
              <Activity className="w-3 h-3" />
              <span>Live Gauge</span>
            </>
          ) : (
            <>
              <Gauge className="w-3 h-3" />
              <span>Thermal Model</span>
            </>
          )}
        </div>
        <div className="text-[9px] text-slate-500 mt-1 leading-tight">{data.dataSource}</div>
      </div>

      {/* Conditional: Lake Intelligence OR River Telemetry */}
      {isLake ? (
        <LakeIntelGrid intel={data.lakeIntel} />
      ) : (
        <RiverTelemetryGrid data={data} />
      )}

      {/* Clarity / Flow Safety */}
      <div className="px-3 pb-1.5">
        <div className={`rounded-lg px-2.5 py-2 ${clarityStyle.bg} border ${clarityStyle.border}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <Droplets className={`w-3.5 h-3.5 ${clarityStyle.color}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {isLake ? 'Water Clarity' : 'Clarity & Flow'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${clarityStyle.dot}`} />
            <span className={`text-xs font-semibold capitalize ${clarityStyle.color}`}>{data.clarity}</span>
            {!isLake && !data.safeForWading && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 ml-auto">NO WADING</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{data.reason}</p>
        </div>
      </div>

      {/* Biology Block */}
      <div className="px-3 pb-1.5">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Fish className={`w-3.5 h-3.5 ${data.thermalStress === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bug Report</span>
          </div>
          <p className="text-[11px] font-semibold text-emerald-300/90 leading-relaxed">{data.hatch}</p>
          <p className="text-[10px] text-slate-400 mt-1">{data.feedingActivity}</p>
        </div>
      </div>

      {/* Thermal Stress Warning */}
      {data.thermalAdvice && (
        <div className="px-3 pb-1.5">
          <div className={`rounded-lg px-3 py-2 border ${
            data.thermalStress === 'critical'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <p className={`text-[10px] font-medium leading-relaxed ${
              data.thermalStress === 'critical' ? 'text-red-300/80' : 'text-amber-300/80'
            }`}>
              {data.thermalAdvice}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-2 pt-0.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Waves className="w-3 h-3 text-emerald-500/50" />
          <span className="text-[9px] text-slate-500">Aquatic Intelligence Engine</span>
        </div>
        {data.usgsGauge && (
          <span className="text-[9px] text-slate-600">{data.usgsGauge.distanceMiles} mi to gauge</span>
        )}
        {isLake && data.lakeIntel && (
          <span className="text-[9px] text-slate-600">{data.lakeIntel.distanceMiles} mi to center</span>
        )}
      </div>
    </div>
  );
}
