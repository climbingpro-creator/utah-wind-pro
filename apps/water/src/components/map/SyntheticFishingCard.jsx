import { X, Thermometer, Droplets, Activity, Waves, Fish, Gauge, Anchor, MapPin, Shield, Navigation, Zap, Eye, Crosshair, Satellite, Palette, Calendar, Ship, Target, FishingRod, Bug, Layers, Flame, Wind, CloudSun, Cloud, Sun, CloudRain, Snowflake, AlertTriangle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

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

function LakeIntelGrid({ intel, isOcean }) {
  if (!intel) return null;

  const hasAnyData = intel.species?.length > 0 || intel.targetDepth || intel.forage || intel.regulations;
  const accentColor = isOcean ? 'text-blue-500/70' : 'text-emerald-500/70';

  if (!hasAnyData) {
    return (
      <div className="px-3 pb-1.5">
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2.5 text-center">
          <Zap className="w-4 h-4 text-purple-400/60 mx-auto mb-1" />
          <p className="text-[10px] text-slate-500">AI species data loading or unavailable for this location</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-1.5">
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        {intel.targetDepth && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Anchor className={`w-2.5 h-2.5 ${accentColor}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Depth</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.targetDepth}</p>
          </div>
        )}
        {intel.forage && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin className={`w-2.5 h-2.5 ${accentColor}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Forage</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.forage}</p>
          </div>
        )}
      </div>
      {intel.species?.length > 0 && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 mb-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Fish className={`w-2.5 h-2.5 ${accentColor}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Species</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-200 leading-snug">{intel.species.join(', ')}</p>
        </div>
      )}
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

function OceanTelemetryGrid({ ocean }) {
  if (!ocean) return null;
  const hasAnyData = ocean.waveHeightFt != null || ocean.maxWaveHeightFt != null || ocean.waveDirection != null;
  if (!hasAnyData) return null;

  return (
    <div className="px-3 pb-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {ocean.waveHeightFt != null && (
          <div className="rounded-lg bg-white/[0.03] border border-blue-500/10 px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Waves className="w-2.5 h-2.5 text-blue-500/70" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Swell</span>
            </div>
            <p className="text-sm font-extrabold text-blue-300">
              {ocean.waveHeightFt} ft
              {ocean.wavePeriodS ? ` @ ${Math.round(ocean.wavePeriodS)}s` : ''}
            </p>
          </div>
        )}
        {ocean.maxWaveHeightFt != null && (
          <div className="rounded-lg bg-white/[0.03] border border-blue-500/10 px-2.5 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Activity className="w-2.5 h-2.5 text-blue-500/70" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Max Swell</span>
            </div>
            <p className="text-sm font-extrabold text-blue-300">{ocean.maxWaveHeightFt} ft</p>
          </div>
        )}
        {ocean.waveDirection != null && (
          <div className="rounded-lg bg-white/[0.03] border border-indigo-500/10 px-2.5 py-1.5 col-span-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Navigation className="w-2.5 h-2.5 text-indigo-500/70" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Wave Direction</span>
            </div>
            <p className="text-[10px] font-semibold text-indigo-300">{Math.round(ocean.waveDirection)}° swell direction</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitatBar({ value }) {
  if (value == null) return null;
  const clamped = Math.max(1, Math.min(10, Math.round(value)));
  const pct = clamped * 10;
  const color = clamped >= 7 ? 'bg-emerald-500' : clamped >= 4 ? 'bg-amber-500' : 'bg-red-500';
  const label = clamped >= 7 ? 'Complex' : clamped >= 4 ? 'Moderate' : 'Simple';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-bold text-slate-400 w-16 text-right">{clamped}/10 {label}</span>
    </div>
  );
}

function VisualIntelSection({ visual }) {
  if (!visual) return null;
  const hasContent = visual.analysis || visual.clue || visual.habitatComplexity != null;
  if (!hasContent) return null;

  return (
    <div className="px-3 pb-1.5">
      {/* Header with satellite thumbnail */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-violet-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400/80">Visual Intel</span>
        </div>
        {visual.satelliteUrl && (
          <div className="ml-auto w-8 h-8 rounded overflow-hidden border border-white/10 shrink-0">
            <img src={visual.satelliteUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>

      {/* Visual Analysis */}
      {visual.analysis && (
        <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/15 px-2.5 py-1.5 mb-1.5">
          <p className="text-[10px] text-violet-200/80 leading-relaxed">{visual.analysis}</p>
        </div>
      )}

      {/* Tactical Clue */}
      {visual.clue && (
        <div className="rounded-lg bg-amber-500/[0.08] border border-amber-500/20 px-2.5 py-1.5 mb-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Crosshair className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400/70">Tactical Clue</span>
          </div>
          <p className="text-[10px] font-semibold text-amber-200/90 leading-snug">{visual.clue}</p>
        </div>
      )}

      {/* Habitat Complexity */}
      {visual.habitatComplexity != null && (
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5">
          <div className="flex items-center gap-1 mb-1">
            <Satellite className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Habitat Complexity</span>
          </div>
          <HabitatBar value={visual.habitatComplexity} />
        </div>
      )}
    </div>
  );
}

function TacticalGearSection({ intel, isOcean }) {
  if (!intel) return null;
  const hasContent = intel.lureRecommendations || intel.flySelections || intel.tackleGuide || intel.seasonalDepthPattern || intel.activeSpeciesNow;
  if (!hasContent) return null;

  const accent = isOcean ? 'text-blue-400' : 'text-emerald-400';
  const borderAccent = isOcean ? 'border-blue-500/15' : 'border-emerald-500/15';
  const headerAccent = isOcean ? 'text-blue-400/80' : 'text-emerald-400/80';

  return (
    <div className="px-3 pb-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 pt-1">
        <FishingRod className={`w-3 h-3 ${headerAccent}`} />
        <span className={`text-[9px] font-bold uppercase tracking-wider ${headerAccent}`}>Tactical Guide</span>
      </div>

      {intel.activeSpeciesNow && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Flame className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Active Species Now</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.activeSpeciesNow}</p>
        </div>
      )}

      {intel.seasonalDepthPattern && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Layers className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Depth Pattern</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.seasonalDepthPattern}</p>
        </div>
      )}

      {intel.lureRecommendations && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Target className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Lure Selection</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.lureRecommendations}</p>
        </div>
      )}

      {intel.flySelections && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Bug className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Fly Box</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.flySelections}</p>
        </div>
      )}

      {intel.tackleGuide && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <FishingRod className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Tackle Setup</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.tackleGuide}</p>
        </div>
      )}
    </div>
  );
}

function AnglerIntelSection({ intel, isOcean }) {
  if (!intel) return null;
  const hasContent = intel.forageProfile || intel.seasonalForage || intel.pelagicCalendar;
  if (!hasContent) return null;

  const accent = isOcean ? 'text-blue-400' : 'text-emerald-400';
  const borderAccent = isOcean ? 'border-blue-500/15' : 'border-emerald-500/15';

  return (
    <div className="px-3 pb-1.5 space-y-1.5">
      {intel.forageProfile && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Palette className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Match the Hatch — Size & Color</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.forageProfile}</p>
        </div>
      )}

      {intel.seasonalForage && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Calendar className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Seasonal Forage</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.seasonalForage}</p>
        </div>
      )}

      {intel.pelagicCalendar && (
        <div className={`rounded-lg bg-white/[0.03] border ${borderAccent} px-2.5 py-1.5`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Ship className={`w-2.5 h-2.5 ${accent}`} />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Migration Calendar</span>
          </div>
          <p className="text-[10px] text-slate-200 leading-relaxed">{intel.pelagicCalendar}</p>
        </div>
      )}
    </div>
  );
}

function getSkyIcon(sky) {
  switch (sky) {
    case 'clear': return <Sun className="w-3 h-3 text-amber-400" />;
    case 'partly': return <Cloud className="w-3 h-3 text-slate-400" />;
    case 'cloudy':
    case 'overcast': return <Cloud className="w-3 h-3 text-slate-500" />;
    case 'drizzle':
    case 'rain': return <CloudRain className="w-3 h-3 text-blue-400" />;
    case 'storm': return <CloudRain className="w-3 h-3 text-purple-400" />;
    default: return <Cloud className="w-3 h-3 text-slate-400" />;
  }
}

function TacticalHeadlineSection({ tactical }) {
  if (!tactical) return null;
  
  const confidenceColor = tactical.confidence >= 80 
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    : tactical.confidence >= 60 
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  
  const categoryColors = {
    'dry-fly': 'bg-amber-500/15 border-amber-500/25 text-amber-300',
    'dry-dropper': 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',
    'nymph': 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300',
    'streamer': 'bg-purple-500/15 border-purple-500/25 text-purple-300',
    'terrestrial': 'bg-lime-500/15 border-lime-500/25 text-lime-300',
    'general': 'bg-slate-500/15 border-slate-500/25 text-slate-300',
  };
  
  const categoryStyle = categoryColors[tactical.category] || categoryColors.general;

  return (
    <div className="px-3 pb-2">
      <div className={`rounded-xl ${categoryStyle} border px-3 py-2.5`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            <h4 className="text-sm font-black tracking-tight">{tactical.headline}</h4>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${confidenceColor}`}>
            {tactical.confidence}%
          </span>
        </div>
        <p className="text-[11px] font-semibold leading-snug mb-2">{tactical.tactic}</p>
        <p className="text-[10px] opacity-80 leading-relaxed">{tactical.reason}</p>
        {tactical.timeWindow && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
            <Clock className="w-3 h-3 opacity-60" />
            <span className="text-[9px] font-medium opacity-70">{tactical.timeWindow}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherCorrelationBadges({ conditions }) {
  if (!conditions || conditions.length === 0) return null;
  
  const conditionStyles = {
    spring: 'bg-green-500/15 text-green-400 border-green-500/20',
    summer: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    fall: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    winter: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    clear: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    partly: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    cloudy: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    overcast: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    drizzle: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    rain: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    storm: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    calm: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
    windy: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    'falling-pressure': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'rising-pressure': 'bg-red-500/15 text-red-400 border-red-500/20',
    precipitation: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    hot: 'bg-red-500/15 text-red-400 border-red-500/20',
    midday: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  };
  
  return (
    <div className="px-3 pb-1.5">
      <div className="flex flex-wrap gap-1">
        {conditions.map((condition, i) => (
          <span 
            key={i}
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${conditionStyles[condition] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}
          >
            {condition.replace('-', ' ')}
          </span>
        ))}
        <span className="text-[9px] text-slate-500 flex items-center gap-1 ml-1">
          <span>=</span>
          <span className="font-semibold">Recommendation</span>
        </span>
      </div>
    </div>
  );
}

function ForecastTimeline({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  
  const formatHour = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3 h-3 text-slate-500" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">12-Hour Forecast</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {forecast.slice(0, 8).map((hour, i) => (
          <div key={i} className="flex-shrink-0 w-10 text-center rounded-lg bg-white/[0.03] border border-white/[0.06] py-1.5">
            <div className="text-[8px] text-slate-500 mb-0.5">{formatHour(hour.time || hour.startTime)}</div>
            <div className="flex justify-center mb-0.5">{getSkyIcon(hour.sky)}</div>
            <div className="text-[10px] font-bold text-white">{hour.windSpeed != null ? Math.round(hour.windSpeed) : '--'}</div>
            <div className="text-[7px] text-slate-500">mph</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FishingQualityMeter({ score }) {
  if (score == null) return null;
  
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = clampedScore >= 70 
    ? 'bg-emerald-500' 
    : clampedScore >= 50 
      ? 'bg-amber-500' 
      : 'bg-red-500';
  const label = clampedScore >= 70 
    ? 'Excellent' 
    : clampedScore >= 50 
      ? 'Good' 
      : 'Challenging';

  return (
    <div className="px-3 pb-1.5">
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-slate-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Fishing Quality</span>
          </div>
          <span className={`text-xs font-black ${clampedScore >= 70 ? 'text-emerald-400' : clampedScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {clampedScore}/100 {label}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div 
            className={`h-full rounded-full ${color} transition-all duration-500`} 
            style={{ width: `${clampedScore}%` }} 
          />
        </div>
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
  const isOcean = data.waterType === 'ocean';
  const isRiver = data.waterType === 'river';
  const isUSGS = data.dataSource?.includes('USGS');
  const isAI = data.dataSource?.includes('AI Synthesized');
  const hasVisual = data.visualIntel != null;
  const clarityStyle = CLARITY_STYLE[data.clarity] || CLARITY_STYLE['unknown'];

  const borderClass = isOcean ? 'border-blue-500/20' : isLake ? 'border-emerald-500/20' : 'border-cyan-500/15';
  const accentClass = isOcean ? 'text-blue-400' : isLake ? 'text-emerald-400' : 'text-cyan-400';
  const accentBg = isOcean ? 'bg-blue-500/10 border border-blue-500/20' : isLake ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-cyan-500/10 border border-cyan-500/20';

  // Helper: Convert ALL CAPS to Title Case
  const toTitleCase = (str) => {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Helper: Parse river name and location from USGS site name
  // e.g., "ALAFIA RIVER AT GIBSONTON FL" -> { river: "Alafia River", location: "Gibsonton FL" }
  const parseUSGSSiteName = (siteName) => {
    if (!siteName) return { river: null, location: null };
    
    // Match patterns like "RIVER NAME AT/NEAR/BELOW/ABOVE LOCATION"
    const match = siteName.match(/^(.+?)\s+(at|near|below|above)\s+(.+)$/i);
    if (match) {
      return {
        river: toTitleCase(match[1].trim()),
        location: toTitleCase(match[3].trim()),
      };
    }
    // No location marker found, just title case the whole thing
    return { river: toTitleCase(siteName), location: null };
  };
  
  // Build display name: prioritize vector feature name (actual river/stream name from map)
  // then fall back to waterBodyName (from reverse geocode), then USGS site name, then generic label
  const vectorName = data.vectorFeatureName;
  const waterBodyName = data.waterBodyName;
  const usgsName = data.usgsGauge?.siteName;
  const lakeIntelName = data.lakeIntel?.name;
  const oceanName = data.oceanData?.name;
  
  let displayName;
  let subtitle;
  
  if (isOcean) {
    displayName = oceanName || 'Ocean';
    subtitle = `${data.coordinates?.lat?.toFixed(2)}, ${data.coordinates?.lng?.toFixed(2)}`;
  } else if (isLake) {
    // For lakes: use vector name if available, else lakeIntel name
    displayName = vectorName || lakeIntelName || 'Lake';
    subtitle = `${data.lakeIntel?.season || ''} · ${data.elevation?.toLocaleString() || '?'} ft elevation`;
  } else {
    // For rivers/streams: prioritize vector feature name (the actual river name)
    // Then waterBodyName (from reverse geocode), then USGS site name
    const effectiveName = vectorName || waterBodyName;
    
    if (effectiveName && usgsName && effectiveName !== usgsName) {
      // We have a river name and USGS gauge - combine them intelligently
      const nameLower = effectiveName.toLowerCase();
      const usgsLower = usgsName.toLowerCase();
      if (usgsLower.includes(nameLower) || nameLower.includes(usgsLower.split(' near ')[0]?.trim() || '')) {
        displayName = effectiveName;
        // Extract location from USGS name
        const parsed = parseUSGSSiteName(usgsName);
        subtitle = parsed.location ? `near ${parsed.location}` : `${data.coordinates?.lat?.toFixed(3)}, ${data.coordinates?.lng?.toFixed(3)}`;
      } else {
        displayName = effectiveName;
        const parsed = parseUSGSSiteName(usgsName);
        subtitle = parsed.location ? `near ${parsed.location}` : usgsName;
      }
    } else if (effectiveName) {
      displayName = effectiveName;
      subtitle = `${data.coordinates?.lat?.toFixed(3)}, ${data.coordinates?.lng?.toFixed(3)}`;
    } else if (usgsName) {
      // No vector name or waterBodyName — parse the USGS site name to extract river name and location
      const parsed = parseUSGSSiteName(usgsName);
      displayName = parsed.river || 'River / Stream';
      subtitle = parsed.location ? `near ${parsed.location}` : `${data.coordinates?.lat?.toFixed(3)}, ${data.coordinates?.lng?.toFixed(3)}`;
    } else {
      displayName = 'River / Stream';
      subtitle = `${data.coordinates?.lat?.toFixed(3)}, ${data.coordinates?.lng?.toFixed(3)}`;
    }
  }

  return (
    <div className={`rounded-2xl border bg-[#0c1a12]/95 backdrop-blur-xl shadow-2xl flex flex-col max-h-full w-full ${borderClass}`}>
      {/* Sticky Header with Close Button */}
      <div className="sticky top-0 z-10 bg-[#0c1a12]/98 backdrop-blur-md rounded-t-2xl border-b border-white/[0.05]">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-extrabold text-white truncate">{displayName}</h3>
              <p className="text-[9px] text-slate-500 truncate">{subtitle}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] transition-colors ml-2 shrink-0 group"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/70 group-hover:text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentBg}`}>
              <Thermometer className={`w-5 h-5 ${accentClass}`} />
            </div>
            <div>
              <div className="text-xl font-black text-white tracking-tight">
                {data.waterTemp != null ? `${Math.round(data.waterTemp)}°F` : '--'}
              </div>
              <div className="text-[9px] font-medium text-slate-400">
                {isOcean ? 'Sea Surface Temp' : 'Estimated Water Temp'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

      {/* Trust Badge */}
      <div className="px-3 pb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            hasVisual
              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
              : isOcean
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : isAI
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                  : isLake
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : isUSGS
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
          }`}>
            {hasVisual ? (
              <>
                <Eye className="w-3 h-3" />
                <span>Multimodal Intel</span>
              </>
            ) : isOcean ? (
              <>
                <Waves className="w-3 h-3" />
                <span>Marine Intel</span>
              </>
            ) : isAI ? (
              <>
                <Zap className="w-3 h-3" />
                <span>AI Synthesized</span>
              </>
            ) : isLake ? (
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
          {/* GPS Coordinates */}
          {data.coordinates && (
            <span className="text-[9px] text-slate-500 font-mono">
              {data.coordinates.lat?.toFixed(4)}, {data.coordinates.lng?.toFixed(4)}
            </span>
          )}
        </div>
        <div className="text-[9px] text-slate-500 mt-1 leading-tight">{data.dataSource}</div>
      </div>

      {/* Tactical Headline — Weather-to-Tactic Intelligence */}
      {data.tacticalSummary && (
        <TacticalHeadlineSection tactical={data.tacticalSummary} />
      )}

      {/* Weather Correlation Badges — Shows WHY the recommendation */}
      {data.tacticalSummary?.conditions && (
        <WeatherCorrelationBadges conditions={data.tacticalSummary.conditions} />
      )}

      {/* Fishing Quality Score */}
      {data.fishingQuality != null && (
        <FishingQualityMeter score={data.fishingQuality} />
      )}

      {/* Live Weather Station (NWS / UDOT / Ambient — when available) */}
      {data.ambientWeather && (
        <div className="px-3 pb-1.5">
          <div className={`rounded-lg px-2.5 py-2 ${
            data.ambientWeather.source === 'nws' 
              ? 'bg-sky-500/5 border border-sky-500/15' 
              : data.ambientWeather.source === 'udot'
                ? 'bg-orange-500/5 border border-orange-500/15'
                : 'bg-teal-500/5 border border-teal-500/15'
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CloudSun className={`w-3 h-3 ${
                data.ambientWeather.source === 'nws' ? 'text-sky-400' 
                : data.ambientWeather.source === 'udot' ? 'text-orange-400' 
                : 'text-teal-400'
              }`} />
              <span className={`text-[8px] font-bold uppercase tracking-wider ${
                data.ambientWeather.source === 'nws' ? 'text-sky-400/70' 
                : data.ambientWeather.source === 'udot' ? 'text-orange-400/70' 
                : 'text-teal-400/70'
              }`}>
                {data.ambientWeather.source === 'nws' ? 'NWS Airport' 
                  : data.ambientWeather.source === 'udot' ? 'UDOT RWIS' 
                  : 'Live Weather'}
              </span>
              <span className="ml-auto text-[8px] text-slate-500 truncate max-w-[100px]">{data.ambientWeather.stationName}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {data.ambientWeather.windSpeed != null && (
                <div className="text-center">
                  <Wind className={`w-3.5 h-3.5 mx-auto mb-0.5 ${
                    data.ambientWeather.source === 'nws' ? 'text-sky-400/70' 
                    : data.ambientWeather.source === 'udot' ? 'text-orange-400/70' 
                    : 'text-teal-400/70'
                  }`} />
                  <div className="text-xs font-bold text-white">{Math.round(data.ambientWeather.windSpeed)}</div>
                  <div className="text-[8px] text-slate-500">mph</div>
                </div>
              )}
              {data.ambientWeather.windGust != null && (
                <div className="text-center">
                  <Wind className="w-3.5 h-3.5 text-amber-400/70 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-amber-300">{Math.round(data.ambientWeather.windGust)}</div>
                  <div className="text-[8px] text-slate-500">gust</div>
                </div>
              )}
              {data.ambientWeather.windDirection != null && (
                <div className="text-center">
                  <Navigation className={`w-3.5 h-3.5 mx-auto mb-0.5 ${
                    data.ambientWeather.source === 'nws' ? 'text-sky-400/70' 
                    : data.ambientWeather.source === 'udot' ? 'text-orange-400/70' 
                    : 'text-teal-400/70'
                  }`} style={{ transform: `rotate(${data.ambientWeather.windDirection}deg)` }} />
                  <div className="text-xs font-bold text-white">{Math.round(data.ambientWeather.windDirection)}°</div>
                  <div className="text-[8px] text-slate-500">dir</div>
                </div>
              )}
              {data.ambientWeather.temperature != null && (
                <div className="text-center">
                  <Thermometer className={`w-3.5 h-3.5 mx-auto mb-0.5 ${
                    data.ambientWeather.source === 'nws' ? 'text-sky-400/70' 
                    : data.ambientWeather.source === 'udot' ? 'text-orange-400/70' 
                    : 'text-teal-400/70'
                  }`} />
                  <div className="text-xs font-bold text-white">{Math.round(data.ambientWeather.temperature)}°</div>
                  <div className="text-[8px] text-slate-500">air</div>
                </div>
              )}
            </div>
            {data.ambientWeather.distanceMiles != null && (
              <div className="text-[8px] text-slate-500 mt-1.5 text-center">
                {data.ambientWeather.distanceMiles} mi away · FREE gov data
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditional: Ocean Marine Grid OR Lake Intelligence OR River Telemetry */}
      {isOcean ? (
        <>
          <OceanTelemetryGrid ocean={data.oceanData} />
          <LakeIntelGrid intel={data.lakeIntel} isOcean />
        </>
      ) : isLake ? (
        <LakeIntelGrid intel={data.lakeIntel} isOcean={false} />
      ) : (
        <>
          <RiverTelemetryGrid data={data} />
          <LakeIntelGrid intel={data.lakeIntel} isOcean={false} />
        </>
      )}

      {/* Angler Intel — forage sizes/colors, seasonal patterns, pelagic migrations */}
      <AnglerIntelSection intel={data.anglerIntel} isOcean={isOcean} />

      {/* Tactical Guide — lures, flies, tackle, depth patterns, active species */}
      <TacticalGearSection intel={data.anglerIntel} isOcean={isOcean} />

      {/* Visual Intelligence (satellite multimodal analysis) */}
      <VisualIntelSection visual={data.visualIntel} />

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
            <Fish className={`w-3.5 h-3.5 ${data.thermalStress === 'critical' ? 'text-red-400' : isOcean ? 'text-blue-400' : isLake ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {isRiver ? 'Bug Report' : 'Forage Report'}
            </span>
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

      {/* Forecast Timeline — Next 12 hours */}
      {data.forecastTimeline && data.forecastTimeline.length > 0 && (
        <ForecastTimeline forecast={data.forecastTimeline} />
      )}

      {/* Footer */}
      <div className="px-3 pb-3 pt-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Waves className={`w-3 h-3 ${isOcean ? 'text-blue-500/50' : 'text-emerald-500/50'}`} />
          <span className="text-[9px] text-slate-500">
            {isOcean ? 'Global Marine Intelligence' : 'Aquatic Intelligence Engine'}
          </span>
        </div>
        {data.usgsGauge && (
          <span className="text-[9px] text-slate-600">{data.usgsGauge.distanceMiles} mi to gauge</span>
        )}
        {isLake && data.lakeIntel?.distanceMiles != null && (
          <span className="text-[9px] text-slate-600">{data.lakeIntel.distanceMiles} mi to center</span>
        )}
      </div>
      </div>{/* End scrollable content */}
    </div>
  );
}
