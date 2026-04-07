import { Lock, Sparkles, Wind, Zap, TrendingUp, Clock, Target, Mountain, Thermometer, Gauge } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Dynamic teaser content for wind sports — rotates based on context
const TEASER_VARIANTS = {
  thermal: [
    { icon: Thermometer, headline: 'Thermal Timing Intel', teaser: 'AI detected thermal trigger — wind arriving at', blurred: '[Unlock Peak Hour]', color: 'amber' },
    { icon: Thermometer, headline: 'Thermal Pump Active', teaser: 'Temperature differential indicates strength of', blurred: '[Unlock Peak mph]', color: 'amber' },
  ],
  propagation: [
    { icon: TrendingUp, headline: 'Wind Propagation Tracked', teaser: 'Upstream stations show wind reaching you at', blurred: '[Unlock ETA]', color: 'cyan' },
    { icon: TrendingUp, headline: 'Fetch Acceleration Detected', teaser: 'Lake fetch geometry indicates peak conditions at', blurred: '[Unlock Window]', color: 'cyan' },
  ],
  venturi: [
    { icon: Wind, headline: 'Venturi Effect Analysis', teaser: 'Canyon geometry amplifying wind by', blurred: '[Unlock % Boost]', color: 'purple' },
    { icon: Mountain, headline: 'Terrain Channeling', teaser: 'Ridgeline is funneling flow — local boost of', blurred: '[Unlock Extra mph]', color: 'purple' },
  ],
  pressure: [
    { icon: Gauge, headline: 'Pressure Gradient Signal', teaser: 'SLC-Provo gradient predicts wind at', blurred: '[Unlock Confidence %]', color: 'emerald' },
    { icon: Gauge, headline: 'Barometric Trigger', teaser: 'Pressure differential indicates thermal by', blurred: '[Unlock Start Time]', color: 'emerald' },
  ],
  gearSize: [
    { icon: Target, headline: 'AI Gear Recommendation', teaser: 'Based on peak forecast + gust factor:', blurred: '[Unlock Kite/Sail Size]', color: 'sky' },
    { icon: Wind, headline: 'Session Planning Intel', teaser: 'Optimal rigging for this window:', blurred: '[Unlock Gear Setup]', color: 'sky' },
  ],
  sessionLength: [
    { icon: Clock, headline: 'Session Duration Estimate', teaser: 'Based on historical patterns for this spot:', blurred: '[Unlock Expected Minutes]', color: 'indigo' },
    { icon: Zap, headline: 'Window Quality Score', teaser: 'AI analysis of consistency + duration:', blurred: '[Unlock Full Intel]', color: 'indigo' },
  ],
  bestWindow: [
    { icon: Clock, headline: 'Optimal Session Window', teaser: 'AI models show the ideal launch time at', blurred: '[Unlock Time Range]', color: 'purple' },
  ],
  bustedRisk: [
    { icon: Gauge, headline: 'Bust Risk Analysis', teaser: 'Synoptic pattern suggests thermal may be interrupted at', blurred: '[Unlock Risk %]', color: 'red' },
  ],
};

function getContextualTeaser(context = {}) {
  const { hasThermalData, hasPropagation, hasVenturi, hasPressure, hasGearRec, hasSessionEst } = context;
  
  if (hasPropagation) {
    const variants = TEASER_VARIANTS.propagation;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasThermalData) {
    const variants = TEASER_VARIANTS.thermal;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasPressure) {
    const variants = TEASER_VARIANTS.pressure;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasVenturi) {
    const variants = TEASER_VARIANTS.venturi;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasGearRec) {
    const variants = TEASER_VARIANTS.gearSize;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasSessionEst) {
    const variants = TEASER_VARIANTS.sessionLength;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  
  const variants = TEASER_VARIANTS.bestWindow;
  return variants[Math.floor(Math.random() * variants.length)];
}

const COLOR_STYLES = {
  amber: {
    bg: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    headline: 'text-amber-300',
    blur: 'bg-amber-500/20 text-amber-300',
    cta: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-blue-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    headline: 'text-cyan-300',
    blur: 'bg-cyan-500/20 text-cyan-300',
    cta: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
  },
  purple: {
    bg: 'from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    headline: 'text-purple-300',
    blur: 'bg-purple-500/20 text-purple-300',
    cta: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
  },
  emerald: {
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    headline: 'text-emerald-300',
    blur: 'bg-emerald-500/20 text-emerald-300',
    cta: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  },
  sky: {
    bg: 'from-sky-500/10 to-indigo-500/10',
    border: 'border-sky-500/30',
    icon: 'text-sky-400',
    headline: 'text-sky-300',
    blur: 'bg-sky-500/20 text-sky-300',
    cta: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30 text-sky-400',
  },
  indigo: {
    bg: 'from-indigo-500/10 to-violet-500/10',
    border: 'border-indigo-500/30',
    icon: 'text-indigo-400',
    headline: 'text-indigo-300',
    blur: 'bg-indigo-500/20 text-indigo-300',
    cta: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30 text-indigo-400',
  },
  red: {
    bg: 'from-red-500/10 to-rose-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    headline: 'text-red-300',
    blur: 'bg-red-500/20 text-red-300',
    cta: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
  },
};

export default function ProTeaser({ 
  variant = 'auto', 
  context = {}, 
  onUnlock,
  className = '',
  compact = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const teaser = variant === 'auto' 
    ? getContextualTeaser(context)
    : (TEASER_VARIANTS[variant]?.[0] || getContextualTeaser(context));
  
  const styles = COLOR_STYLES[teaser.color] || COLOR_STYLES.cyan;
  const IconComponent = teaser.icon;

  if (compact) {
    return (
      <button
        onClick={onUnlock}
        className={`
          group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
          bg-gradient-to-r ${styles.bg} border ${styles.border}
          hover:border-opacity-60 transition-all cursor-pointer
          backdrop-blur-sm
          ${className}
        `}
      >
        <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
          <Lock className={`w-4 h-4 ${styles.icon}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className={`text-[11px] font-bold ${styles.headline} flex items-center gap-1.5`}>
            <IconComponent className="w-3 h-3" />
            {teaser.headline}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
            {teaser.teaser}{' '}
            <span className={`font-semibold px-1 py-0.5 rounded ${styles.blur} blur-[2px] group-hover:blur-0 transition-all`}>
              {teaser.blurred}
            </span>
          </div>
        </div>
        <Sparkles className={`w-4 h-4 ${styles.icon} opacity-60 group-hover:opacity-100 transition-opacity shrink-0`} />
      </button>
    );
  }

  return (
    <button
      onClick={onUnlock}
      className={`
        group w-full rounded-xl overflow-hidden
        bg-gradient-to-br ${styles.bg} border ${styles.border}
        hover:border-opacity-60 transition-all cursor-pointer
        backdrop-blur-sm
        ${className}
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center">
              <IconComponent className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <div>
              <div className={`text-xs font-bold ${styles.headline} flex items-center gap-1.5`}>
                <Lock className="w-3 h-3" />
                Pro Insight
              </div>
              <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {teaser.headline}
              </div>
            </div>
          </div>
          <Sparkles className={`w-5 h-5 ${styles.icon} opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all`} />
        </div>

        {/* Teaser Content */}
        <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} mb-3`}>
          {teaser.teaser}{' '}
          <span className={`
            inline-block font-semibold px-2 py-0.5 rounded-md 
            ${styles.blur} 
            blur-[3px] group-hover:blur-[1px] transition-all
            border border-white/10
          `}>
            {teaser.blurred}
          </span>
        </div>

        {/* CTA */}
        <div className={`
          flex items-center justify-center gap-2 py-2 px-4 rounded-lg
          bg-gradient-to-r ${styles.cta}
          border
          group-hover:opacity-90
          transition-all
        `}>
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-bold group-hover:underline">
            Unlock with Pro
          </span>
        </div>
      </div>
    </button>
  );
}

// Inline teaser for embedding within existing cards/rows
export function ProTeaserInline({ text, blurred, onUnlock, color = 'amber' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = COLOR_STYLES[color] || COLOR_STYLES.amber;
  
  return (
    <button
      onClick={onUnlock}
      className={`
        group inline-flex items-center gap-1.5 px-2 py-1 rounded-md
        bg-gradient-to-r ${styles.bg}
        border ${styles.border}
        hover:border-opacity-60 transition-all cursor-pointer
        text-xs
      `}
    >
      <Lock className={`w-3 h-3 ${styles.icon}`} />
      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{text}</span>
      <span className={`
        font-semibold px-1.5 py-0.5 rounded 
        ${styles.blur}
        blur-[2px] group-hover:blur-0 transition-all
      `}>
        {blurred}
      </span>
    </button>
  );
}

// Mini badge for tight spaces (e.g., inside timeline rows)
export function ProTeaserBadge({ label = 'Pro', onUnlock, color = 'purple' }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.purple;
  
  return (
    <button
      onClick={onUnlock}
      className={`
        group inline-flex items-center gap-1 px-2 py-1 rounded-full
        bg-gradient-to-r ${styles.bg}
        border ${styles.border}
        hover:scale-105 transition-all cursor-pointer
        text-[10px] font-bold uppercase tracking-wider
        ${styles.headline}
      `}
    >
      <Lock className="w-2.5 h-2.5" />
      <span>{label}</span>
      <Sparkles className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity`} />
    </button>
  );
}
