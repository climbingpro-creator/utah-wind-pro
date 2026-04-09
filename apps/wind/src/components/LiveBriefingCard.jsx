import React from 'react';
import { Zap, ArrowRight, Radio } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const EXCITEMENT_COLORS = {
  1: { accent: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400' },
  2: { accent: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  3: { accent: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  4: { accent: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  5: { accent: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400' },
};

export default function LiveBriefingCard({ briefing, lastUpdated }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!briefing) return null;

  const { headline, body, bullets, excitement, bestAction } = briefing;
  const colors = EXCITEMENT_COLORS[excitement] || EXCITEMENT_COLORS[1];

  const timeStr = lastUpdated
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(lastUpdated)
    : null;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${
      isDark
        ? `${colors.bg} ${colors.border}`
        : `bg-white border-slate-200 shadow-sm`
    }`}>
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${colors.dot}`} />
            <h2 className={`text-sm font-extrabold truncate ${isDark ? 'text-[var(--text-primary)]' : 'text-slate-900'}`}>
              {headline}
            </h2>
          </div>
          {timeStr && (
            <span className={`text-[10px] font-medium shrink-0 flex items-center gap-1 ${isDark ? 'text-[var(--text-tertiary)]' : 'text-slate-500'}`}>
              <Radio className="w-3 h-3" />
              {timeStr}
            </span>
          )}
        </div>

        {/* Body text */}
        <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-600'}`}>
          {body}
        </p>

        {/* Bullets */}
        {bullets?.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            {bullets.slice(0, 5).map((b, i) => (
              <span key={i} className={`text-[11px] flex items-center gap-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                <span className="shrink-0">{b.icon}</span>
                {b.text}
              </span>
            ))}
          </div>
        )}

        {/* Best action */}
        {bestAction && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            isDark
              ? `${colors.bg} ${colors.accent}`
              : excitement >= 3
                ? 'bg-sky-50 text-sky-700'
                : 'bg-slate-50 text-slate-600'
          }`}>
            {excitement >= 3 ? <Zap className="w-3.5 h-3.5 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
            {bestAction}
          </div>
        )}
      </div>
    </div>
  );
}
