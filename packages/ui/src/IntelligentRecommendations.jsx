import React from 'react';
import { Clock, Zap, Wind, Target, TrendingUp, Waves, Anchor, Ship, Fish, Mountain, ArrowUpRight } from 'lucide-react';

const SPORT_ICONS = {
  'foil-kite': Wind,
  'windsurfing': Wind,
  'sailing': Anchor,
  'paragliding': TrendingUp,
  'boating': Ship,
  'paddling': Waves,
  'fishing': Fish,
  'snowkiting': Mountain,
};

const SPORT_COLORS = {
  'foil-kite': { accent: 'sky', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', badge: 'bg-sky-500' },
  'windsurfing': { accent: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', badge: 'bg-violet-500' },
  'sailing': { accent: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500' },
  'paragliding': { accent: 'purple', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500' },
  'boating': { accent: 'cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500' },
  'paddling': { accent: 'teal', bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', badge: 'bg-teal-500' },
  'fishing': { accent: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  'snowkiting': { accent: 'indigo', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'bg-slate-500' };

const SPORT_APP_OWNER = {
  'foil-kite': 'wind',
  'windsurfing': 'wind',
  'sailing': 'wind',
  'paragliding': 'wind',
  'snowkiting': 'wind',
  'boating': 'water',
  'paddling': 'water',
  'fishing': 'water',
};

function TimelineBar({ hours, wantsWind }) {
  if (!hours?.length) return null;
  const maxScore = Math.max(...hours.map(h => h.score));

  return (
    <div className="flex items-end gap-px h-12 mt-2">
      {hours.map((h, i) => {
        const pct = maxScore > 0 ? (h.score / maxScore) * 100 : 0;
        const isPeak = h.score === maxScore;
        const barColor = h.score >= 80 ? 'bg-emerald-500' : h.score >= 50 ? 'bg-amber-500' : 'bg-slate-600';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-t transition-all ${barColor} ${isPeak ? 'ring-1 ring-white/30' : ''}`}
              style={{ height: `${Math.max(pct, 8)}%` }}
              title={`${h.time}: ${Math.round(h.windSpeed ?? 0)} mph (score ${h.score})`}
            />
            {i % Math.max(1, Math.floor(hours.length / 6)) === 0 && (
              <span className="text-[8px] text-[var(--text-tertiary,#64748b)] leading-none">{h.time?.replace(' ', '\n')}</span>
            )}
            {isPeak && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-400 whitespace-nowrap">
                {wantsWind ? '↑' : '↓'} {Math.round(h.windSpeed ?? 0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WindowCard({ window: w, currentApp, crossAppUrls, onLocalClick }) {
  if (!w) return null;

  const colors = SPORT_COLORS[w.sportType] || DEFAULT_COLORS;
  const IconComponent = SPORT_ICONS[w.sportType] || Target;
  const wantsWind = ['foil-kite', 'windsurfing', 'sailing', 'paragliding', 'snowkiting'].includes(w.sportType);

  const ownerApp = SPORT_APP_OWNER[w.sportType] || 'wind';
  const isCrossApp = currentApp && ownerApp !== currentApp;
  const targetUrl = isCrossApp && crossAppUrls?.[ownerApp]
    ? `${crossAppUrls[ownerApp]}${w.locationId ? `?spot=${w.locationId}` : ''}`
    : null;

  const cardContent = (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${colors.bg} ${colors.border} ${
      targetUrl ? 'hover:ring-1 hover:ring-white/20 cursor-pointer' : ''
    } ${!targetUrl && onLocalClick ? 'cursor-pointer' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${colors.badge} flex items-center justify-center`}>
            <IconComponent className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary,#f1f5f9)]">{w.sport}</div>
            <div className="text-[10px] text-[var(--text-tertiary,#64748b)]">{w.durationHours}h window found</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {targetUrl && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary,#64748b)]">
                {ownerApp === 'water' ? 'Glass App' : 'Wind App'}
              </span>
              <ArrowUpRight className="w-3 h-3 text-[var(--text-tertiary,#64748b)]" />
            </div>
          )}
          <div className="text-right">
            <div className={`text-2xl font-black tabular-nums ${colors.text}`}>{w.avgScore}</div>
            <div className="text-[9px] font-bold text-[var(--text-tertiary,#64748b)] uppercase">score</div>
          </div>
        </div>
      </div>

      {/* Time Window — the hero element */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-black/20 border border-white/5">
        <Clock className={`w-5 h-5 flex-shrink-0 ${colors.text}`} />
        <div className="flex-1">
          <div className="text-lg font-extrabold text-[var(--text-primary,#f1f5f9)] tracking-tight">
            {w.windowStartLabel} → {w.windowEndLabel}
          </div>
          <div className="text-[11px] text-[var(--text-secondary,#94a3b8)]">
            Peak at <span className={`font-bold ${colors.text}`}>{w.peakTimeLabel}</span> — {w.peakCondition}
          </div>
        </div>
        {wantsWind ? (
          <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
        ) : (
          <Waves className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        )}
      </div>

      {/* Timeline Bar */}
      <TimelineBar hours={w.hours} wantsWind={wantsWind} />

      {/* Reason */}
      <p className="text-xs text-[var(--text-secondary,#94a3b8)] leading-relaxed">{w.reason}</p>
    </div>
  );

  if (targetUrl) {
    return (
      <a href={targetUrl} className="block no-underline" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  if (onLocalClick) {
    return <div onClick={() => onLocalClick(w)} role="button" tabIndex={0}>{cardContent}</div>;
  }

  return cardContent;
}

/**
 * IntelligentRecommendations — Displays optimal time windows for sports.
 *
 * @param {Object} props
 * @param {Object} props.windows — Map of sportType → window result from findAllSportWindows
 * @param {string[]} [props.sportFilter] — Optional list of sport keys to display (shows all if omitted)
 * @param {string} [props.title] — Section title
 * @param {'wind'|'water'} [props.currentApp] — Which app is rendering this component
 * @param {Object} [props.crossAppUrls] — URLs to sister apps, e.g. { water: 'https://...', wind: 'https://...' }
 * @param {Function} [props.onLocalClick] — Callback when a local-sport card is clicked
 */
export function IntelligentRecommendations({ windows, sportFilter, title = 'Best Time Windows', currentApp, crossAppUrls, onLocalClick }) {
  if (!windows || Object.keys(windows).length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-color,#1e293b)] p-4 text-center">
        <Target className="w-6 h-6 text-[var(--text-tertiary,#64748b)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-tertiary,#64748b)]">No optimal windows found in the next 24 hours</p>
        <p className="text-[11px] text-[var(--text-tertiary,#64748b)] mt-1">Conditions don't meet thresholds for any activity</p>
      </div>
    );
  }

  const entries = sportFilter
    ? sportFilter.map(k => [k, windows[k]]).filter(([, v]) => v)
    : Object.entries(windows).sort((a, b) => b[1].avgScore - a[1].avgScore);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-cyan-500" />
        <span className="text-sm font-semibold text-[var(--text-primary,#f1f5f9)]">{title}</span>
        <span className="text-[10px] text-[var(--text-tertiary,#64748b)] ml-auto">Next 24 hours</span>
      </div>
      <div className="space-y-3">
        {entries.map(([key, w]) => (
          <WindowCard
            key={key}
            window={w}
            currentApp={currentApp}
            crossAppUrls={crossAppUrls}
            onLocalClick={onLocalClick}
          />
        ))}
      </div>
    </div>
  );
}
