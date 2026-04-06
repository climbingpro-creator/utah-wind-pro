import { Lock, Sparkles, Moon, TrendingDown, Waves, Fish, Thermometer, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Dynamic teaser content that rotates based on context
const TEASER_VARIANTS = {
  solunar: [
    { icon: Moon, headline: 'Solunar Peak Window', teaser: 'AI detected major feeding period at', blurred: '[Unlock Time]', color: 'indigo' },
    { icon: Moon, headline: 'Moon Phase Advantage', teaser: 'Current phase indicates', blurred: '[Unlock Feeding Score]', color: 'indigo' },
  ],
  pressure: [
    { icon: TrendingDown, headline: 'Pressure Trigger Detected', teaser: 'Falling barometer signals', blurred: '[Unlock Bite Window]', color: 'emerald' },
    { icon: TrendingDown, headline: 'Pre-Front Feeding', teaser: 'Pressure models predict aggressive bite at', blurred: '[Unlock Peak Hour]', color: 'emerald' },
  ],
  glass: [
    { icon: Waves, headline: 'Glass Window Found', teaser: 'AI predicts calm water starting at', blurred: '[Unlock 2hr Window]', color: 'cyan' },
    { icon: Waves, headline: 'Perfect Conditions Coming', teaser: 'Glass probability peaks at', blurred: '[Unlock Time & Duration]', color: 'cyan' },
  ],
  fly: [
    { icon: Fish, headline: 'AI Fly Match', teaser: 'Based on USGS water temp + hatch data:', blurred: '[Unlock Pattern & Size]', color: 'amber' },
    { icon: Fish, headline: 'Hatch Intelligence', teaser: 'Current conditions favor', blurred: '[Unlock Fly Selection]', color: 'amber' },
  ],
  waterTemp: [
    { icon: Thermometer, headline: 'Thermal Sweet Spot', teaser: 'Target species active at current', blurred: '[Unlock Depth & Zone]', color: 'cyan' },
  ],
  bestTime: [
    { icon: Clock, headline: 'Optimal Window Today', teaser: 'AI analysis shows best fishing at', blurred: '[Unlock Time Range]', color: 'purple' },
  ],
};

// Get a contextual teaser based on available data
function getContextualTeaser(context = {}) {
  const { hasPressureData, hasSolunarData, hasWaterTemp, isGlassConditions, isFlyFishing } = context;
  
  // Priority order based on what's most compelling
  if (hasPressureData) {
    const variants = TEASER_VARIANTS.pressure;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasSolunarData) {
    const variants = TEASER_VARIANTS.solunar;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (isGlassConditions) {
    const variants = TEASER_VARIANTS.glass;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (isFlyFishing) {
    const variants = TEASER_VARIANTS.fly;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  if (hasWaterTemp) {
    const variants = TEASER_VARIANTS.waterTemp;
    return variants[Math.floor(Math.random() * variants.length)];
  }
  
  // Default fallback
  const variants = TEASER_VARIANTS.bestTime;
  return variants[Math.floor(Math.random() * variants.length)];
}

const COLOR_STYLES = {
  indigo: {
    bg: 'from-indigo-500/10 to-purple-500/10',
    border: 'border-indigo-500/30',
    icon: 'text-indigo-400',
    headline: 'text-indigo-300',
    blur: 'bg-indigo-500/20 text-indigo-300',
  },
  emerald: {
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    headline: 'text-emerald-300',
    blur: 'bg-emerald-500/20 text-emerald-300',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-blue-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    headline: 'text-cyan-300',
    blur: 'bg-cyan-500/20 text-cyan-300',
  },
  amber: {
    bg: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    headline: 'text-amber-300',
    blur: 'bg-amber-500/20 text-amber-300',
  },
  purple: {
    bg: 'from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    headline: 'text-purple-300',
    blur: 'bg-purple-500/20 text-purple-300',
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
  
  // Get teaser content
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
        <div className={`w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0`}>
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
            <div className={`w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center`}>
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
          bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
          border border-cyan-500/30
          group-hover:from-cyan-500/30 group-hover:to-blue-500/30
          transition-all
        `}>
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
            Unlock with Pro
          </span>
        </div>
      </div>
    </button>
  );
}

// Inline teaser for embedding within existing cards
export function ProTeaserInline({ text, blurred, onUnlock }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <button
      onClick={onUnlock}
      className={`
        group inline-flex items-center gap-1.5 px-2 py-1 rounded-md
        bg-gradient-to-r from-amber-500/10 to-orange-500/10
        border border-amber-500/20
        hover:border-amber-500/40 transition-all cursor-pointer
        text-xs
      `}
    >
      <Lock className="w-3 h-3 text-amber-400" />
      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{text}</span>
      <span className={`
        font-semibold px-1.5 py-0.5 rounded 
        bg-amber-500/20 text-amber-300
        blur-[2px] group-hover:blur-0 transition-all
      `}>
        {blurred}
      </span>
    </button>
  );
}
