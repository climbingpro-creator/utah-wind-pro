import { useState } from 'react';
import { Wind, Clock, ChevronDown, ChevronUp, ArrowUp, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DECISION_STYLES = {
  GO: {
    dark: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', accent: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', dot: 'bg-emerald-400' },
    light: { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700', glow: 'shadow-emerald-200', dot: 'bg-emerald-500' },
  },
  WAIT: {
    dark: { bg: 'bg-amber-500/12', border: 'border-amber-500/25', accent: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/10', dot: 'bg-amber-400' },
    light: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', text: 'text-amber-700', glow: 'shadow-amber-200', dot: 'bg-amber-500' },
  },
  PASS: {
    dark: { bg: 'bg-slate-500/8', border: 'border-slate-600/30', accent: 'bg-slate-500', text: 'text-slate-400', glow: '', dot: 'bg-slate-500' },
    light: { bg: 'bg-slate-50', border: 'border-slate-200', accent: 'bg-slate-400', text: 'text-slate-600', glow: '', dot: 'bg-slate-400' },
  },
};

function DirectionArrow({ direction, className = '' }) {
  if (direction == null) return null;
  return (
    <ArrowUp
      className={className}
      style={{ transform: `rotate(${(direction + 180) % 360}deg)` }}
    />
  );
}

export default function AnswerCard({ answer, isLoading, error, spotName }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  if (isLoading && !answer) {
    return (
      <div className={`rounded-2xl border p-5 transition-colors ${
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
          <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Checking conditions at {spotName || 'your spot'}...
          </span>
        </div>
      </div>
    );
  }

  if (error && !answer) {
    return null;
  }

  if (!answer) return null;

  const decision = answer.decision || 'PASS';
  const style = DECISION_STYLES[decision] || DECISION_STYLES.PASS;
  const colors = isDark ? style.dark : style.light;
  const windSpeed = answer.wind?.current ?? 0;
  const windCardinal = answer.wind?.cardinal || '';
  const windDir = answer.wind?.direction;
  const confidence = answer.confidence ?? 0;

  const timeStr = answer.updatedAt
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(answer.updatedAt))
    : null;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${colors.bg} ${colors.border} ${colors.glow ? `shadow-lg ${colors.glow}` : ''}`}
      role="status"
      aria-live="polite"
    >
      {/* ── Main answer ── */}
      <div className="px-4 py-4 sm:px-5">
        {/* Headline — the whole point, reads like a friend texting you */}
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${decision === 'GO' ? 'animate-pulse' : ''} ${colors.dot}`} />
          <div className="flex-1 min-w-0">
            <h2 className={`text-[15px] sm:text-base font-bold leading-snug ${isDark ? 'text-[var(--text-primary)]' : 'text-slate-900'}`}>
              {answer.headline}
            </h2>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`shrink-0 min-w-[44px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
            }`}
            aria-label={expanded ? 'Show less detail' : 'Show more detail'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 mt-2 ml-5.5 pl-[2px]">
          {windSpeed > 0 && (
            <span className={`flex items-center gap-1 text-xs font-bold ${colors.text}`}>
              <Wind className="w-3.5 h-3.5" />
              {Math.round(windSpeed)} mph
              {windCardinal && ` ${windCardinal}`}
              <DirectionArrow direction={windDir} className="w-3 h-3 opacity-60" />
            </span>
          )}
          {answer.eta != null && answer.eta > 0 && (
            <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
              <Clock className="w-3 h-3" />
              ~{answer.eta} min out
            </span>
          )}
          {confidence > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isDark ? 'bg-white/5 text-[var(--text-tertiary)]' : 'bg-slate-100 text-slate-500'
            }`}>
              {Math.round(confidence * 100)}% confident
            </span>
          )}
          {timeStr && (
            <span className={`text-[10px] ml-auto ${isDark ? 'text-[var(--text-tertiary)]' : 'text-slate-400'}`}>
              {timeStr}
            </span>
          )}
        </div>

        {/* Best action one-liner */}
        {answer.bestAction && (
          <p className={`text-xs mt-2 ml-5.5 pl-[2px] font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-600'}`}>
            {answer.bestAction}
          </p>
        )}
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className={`px-4 pb-4 sm:px-5 space-y-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
          {/* Detail text */}
          {answer.detail && (
            <p className={`text-xs leading-relaxed pt-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-600'}`}>
              {answer.detail}
            </p>
          )}

          {/* Bullets */}
          {answer.bullets?.length > 0 && (
            <ul className="space-y-1.5">
              {answer.bullets.map((b, i) => (
                <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                  <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${colors.accent}`} />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Where to go — spot recommendations */}
          {answer.whereToGo?.recommendation && (
            <div className={`rounded-lg px-3 py-2.5 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <p className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-[var(--text-primary)]' : 'text-slate-700'}`}>
                {answer.whereToGo.recommendation}
              </p>
              {answer.whereToGo.alternatives?.length > 0 && (
                <div className="space-y-1">
                  {answer.whereToGo.alternatives.map((alt) => (
                    <div key={alt.id} className={`flex items-center justify-between text-[11px] ${isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'}`}>
                      <span className="font-medium">{alt.name}</span>
                      <span className="opacity-75">{alt.why}</span>
                    </div>
                  ))}
                </div>
              )}
              {answer.whereToGo.spotsChecked > 0 && (
                <p className={`text-[10px] mt-1.5 ${isDark ? 'text-[var(--text-tertiary)]' : 'text-slate-400'}`}>
                  Checked {answer.whereToGo.spotsChecked} spots — {answer.whereToGo.goCount} looking good{answer.whereToGo.waitCount > 0 ? `, ${answer.whereToGo.waitCount} marginal` : ''}
                </p>
              )}
            </div>
          )}

          {/* Pressure / indicators */}
          {answer.indicators?.pressureGradient && (
            <div className={`text-[11px] font-medium px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 text-[var(--text-secondary)]' : 'bg-slate-50 text-slate-500'}`}>
              {answer.indicators.pressureGradient.description}
            </div>
          )}

          {/* Hourly mini-outlook */}
          {answer.hourlyOutlook?.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pt-1">
              {answer.hourlyOutlook.slice(0, 8).map((h, i) => {
                const hr = h.time ? new Date(h.time).getHours() : i;
                const ampm = hr >= 12 ? 'p' : 'a';
                const h12 = hr > 12 ? hr - 12 : (hr === 0 ? 12 : hr);
                return (
                  <div key={i} className={`flex flex-col items-center px-2 py-1.5 rounded-lg min-w-[42px] ${
                    isDark ? 'bg-white/5' : 'bg-slate-50'
                  }`}>
                    <span className={`text-[9px] font-semibold ${isDark ? 'text-[var(--text-tertiary)]' : 'text-slate-400'}`}>
                      {h12}{ampm}
                    </span>
                    <span className={`text-xs font-bold ${
                      h.speed >= 10 ? colors.text : isDark ? 'text-[var(--text-secondary)]' : 'text-slate-500'
                    }`}>
                      {Math.round(h.speed)}
                    </span>
                    {h.thermalBoosted && (
                      <span className="text-[8px] text-amber-400 font-bold">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
