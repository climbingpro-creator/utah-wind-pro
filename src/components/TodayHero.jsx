import React, { useMemo } from 'react';
import { Clock, ChevronRight, ArrowUpRight, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';
import { estimateSessionDuration } from '../services/ThermalPropagation';

const ALL_ACTIVITIES = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'boating', 'paddling', 'fishing'];

function formatHour(h) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function sessionLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `~${h} hr${h > 1 ? 's' : ''}`;
}

function getActivityVerdict(id, speed, gust, thermalPrediction, _boatingPrediction, propagation) {
  const cfg = ACTIVITY_CONFIGS[id];
  if (!cfg) return null;
  const good = cfg.goodCondition?.(speed, gust);
  const now = new Date().getHours();
  const thermal = thermalPrediction || {};
  const thermalStart = thermal.startHour || 10;
  const thermalEnd = thermal.endHour || 17;
  const prob = thermal.probability || 0;

  // Get session duration estimate from propagation data
  const dominantChain = propagation?.dominant?.type;
  const session = dominantChain ? estimateSessionDuration(dominantChain) : null;
  const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} session` : '';

  if (good) {
    if (cfg.wantsWind) {
      // Check if session is too short to be worth rigging (< 45 min, learned data)
      if (session?.source === 'learned' && session.avgMinutes < 45) {
        return { status: 'caution', label: 'BRIEF', reason: `${Math.round(speed)} mph but avg session only ${session.avgMinutes} min`, color: 'amber' };
      }
      const ideal = cfg.thresholds?.ideal;
      if (ideal && speed >= ideal.min && speed <= ideal.max) {
        return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — ideal range${sessionStr}`, color: 'emerald' };
      }
      return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — conditions active${sessionStr}`, color: 'emerald' };
    }
    if (speed <= 2) return { status: 'go', label: 'GLASS', reason: `Mirror-flat water${sessionStr}`, color: 'emerald' };
    return { status: 'go', label: 'GOOD', reason: `Light wind (${Math.round(speed)} mph) — still calm${sessionStr}`, color: 'lime' };
  }

  if (cfg.wantsWind) {
    if (speed < (cfg.thresholds?.tooLight || 6)) {
      if (prob >= 50 && now < thermalEnd) {
        const waitSession = session ? ` (${sessionLabel(session.avgMinutes)} expected)` : '';
        return { status: 'wait', label: 'WAIT', reason: `${prob}% thermal by ${formatHour(thermalStart)}${waitSession}`, color: 'amber', window: formatHour(thermalStart) };
      }
      return { status: 'off', label: 'TOO LIGHT', reason: `${Math.round(speed)} mph — need ${cfg.thresholds?.tooLight || 6}+`, color: 'slate' };
    }
    if (speed > (cfg.thresholds?.tooStrong || 30)) {
      return { status: 'off', label: 'TOO STRONG', reason: `${Math.round(speed)} mph — unsafe`, color: 'red' };
    }
    const gf = gust > 0 && speed > 0 ? gust / speed : 1;
    if (gf > (cfg.thresholds?.gustFactor || 1.5)) {
      return { status: 'caution', label: 'GUSTY', reason: `${Math.round(speed)}G${Math.round(gust)} mph — gusty`, color: 'amber' };
    }
  } else {
    if (speed >= 15) return { status: 'off', label: 'ROUGH', reason: `${Math.round(speed)} mph — waves`, color: 'red' };
    if (speed >= 8) {
      const calmAfter = thermalEnd + 1;
      if (calmAfter < 21 && now < calmAfter) {
        return { status: 'wait', label: 'WINDY', reason: `Calm expected after ${formatHour(calmAfter)}`, color: 'amber', window: `After ${formatHour(calmAfter)}` };
      }
      return { status: 'off', label: 'CHOPPY', reason: `${Math.round(speed)} mph — too rough`, color: 'orange' };
    }
  }

  return { status: 'off', label: 'OFF', reason: 'Not ideal right now', color: 'slate' };
}

function buildOutlook(windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation) {
  const speed = windSpeed ?? 0;
  const gust = windGust ?? speed;

  const fpsSpeed = fpsStation?.speed ?? fpsStation?.windSpeed;
  const fpsGust = fpsStation?.gust ?? fpsStation?.windGust;
  const utalpSpeed = utalpStation?.speed ?? utalpStation?.windSpeed;

  const cards = ALL_ACTIVITIES.map(id => {
    let useSpeed = speed;
    let useGust = gust;
    if (id === 'paragliding') {
      useSpeed = fpsSpeed ?? utalpSpeed ?? speed;
      useGust = fpsGust ?? useGust;
    }
    return {
      id,
      cfg: ACTIVITY_CONFIGS[id],
      verdict: getActivityVerdict(id, useSpeed, useGust, thermalPrediction, boatingPrediction, propagation),
    };
  });

  const goCount = cards.filter(c => c.verdict?.status === 'go').length;
  const waitCount = cards.filter(c => c.verdict?.status === 'wait').length;
  let mood = 'neutral';
  let headline = '';
  let subline = '';

  if (goCount >= 4) {
    mood = 'epic';
    headline = 'Everything is ON right now';
    subline = `${Math.round(speed)} mph — multiple activities in ideal range`;
  } else if (goCount >= 2) {
    mood = 'good';
    const goNames = cards.filter(c => c.verdict?.status === 'go').map(c => c.cfg.name);
    headline = `${goNames.join(' & ')} are GO`;
    subline = `${Math.round(speed)} mph${gust > speed * 1.3 ? ` gusting ${Math.round(gust)}` : ''} right now`;
  } else if (goCount === 1) {
    mood = 'good';
    const goCard = cards.find(c => c.verdict?.status === 'go');
    headline = `${goCard.cfg.name} is ON`;
    subline = goCard.verdict.reason;
  } else if (waitCount > 0) {
    mood = 'mixed';
    const waitCard = cards.find(c => c.verdict?.status === 'wait');
    headline = `Wind building — ${waitCard.cfg.name} expected`;
    subline = waitCard.verdict.reason;
  } else if (speed <= 3) {
    mood = 'calm';
    headline = 'Glass conditions — water sports are perfect';
    subline = 'Mirror-flat water for boating, paddling, fishing';
  } else {
    mood = 'neutral';
    headline = 'Quiet conditions';
    subline = 'No strong signals right now — check back later';
  }

  return { headline, subline, mood, cards, speed, gust };
}

const MOOD_ACCENT = {
  epic: 'text-emerald-500',
  good: 'text-sky-500',
  calm: 'text-indigo-500',
  mixed: 'text-amber-500',
  neutral: 'text-slate-400',
};

const MOOD_DOT = {
  epic: 'bg-emerald-500',
  good: 'bg-sky-500',
  calm: 'bg-indigo-500',
  mixed: 'bg-amber-500',
  neutral: 'bg-slate-400',
};

const MOOD_IMAGE_FALLBACK = {
  epic: '/images/kite-beach-epic.png',
  good: '/images/river-canyon-green.png',
  calm: '/images/glass-water-mirror.png',
  mixed: '/images/wake-wave-sun.png',
  neutral: '/images/utah-lake-ice-sunset.png',
};

const STATUS_STYLES = {
  go:      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  wait:    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500/20 text-amber-500', dot: 'bg-amber-500' },
  caution: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  off:     { bg: '', border: 'border-[var(--border-subtle)]', text: 'text-[var(--text-tertiary)]', badge: 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]', dot: 'bg-slate-500' },
};
const STATUS_STYLES_LIGHT = {
  go:      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  wait:    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400' },
  off:     { bg: 'bg-slate-50/50', border: 'border-slate-100', text: 'text-slate-400', badge: 'bg-slate-100 text-slate-400', dot: 'bg-slate-300' },
};

export default function TodayHero({ windSpeed, windGust, thermalPrediction, boatingPrediction, onSelectActivity, fpsStation, utalpStation, propagation }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const outlook = useMemo(
    () => buildOutlook(windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation),
    [windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation]
  );

  const accent = MOOD_ACCENT[outlook.mood] || MOOD_ACCENT.neutral;
  const bgImage = getRotatingImage(outlook.mood, 'mood') || MOOD_IMAGE_FALLBACK[outlook.mood];
  const styles = isDark ? STATUS_STYLES : STATUS_STYLES_LIGHT;

  return (
    <div className={`animate-fade-in ${bgImage ? 'hero-mood' : ''}`}>
      {bgImage && (
        <>
          <img src={bgImage} alt="" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        </>
      )}

      <div className={`relative z-10 p-5 sm:p-6 lg:p-8 ${bgImage ? '' : 'card'}`}>
        {/* Headline + wind */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 ${bgImage ? 'text-white/50' : 'data-label'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${MOOD_DOT[outlook.mood]}`} />
              {getGreeting()} — Today's Outlook
            </p>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug tracking-tight ${bgImage ? 'text-white' : accent}`}>
              {outlook.headline}
            </h2>
            {outlook.subline && (
              <p className={`text-sm sm:text-base mt-2 font-medium leading-relaxed ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                {outlook.subline}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`data-number ${bgImage ? 'text-white' : accent}`}>
              {outlook.speed > 0 ? Math.round(outlook.speed) : '--'}
            </div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest mt-1 ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`}>mph</p>
            {outlook.gust > outlook.speed * 1.2 && (
              <p className={`text-xs mt-1 font-medium ${bgImage ? 'text-white/40' : 'text-[var(--text-tertiary)]'}`}>
                G{Math.round(outlook.gust)}
              </p>
            )}
          </div>
        </div>

        {/* Activity Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {outlook.cards.map(({ id, cfg, verdict }) => {
            if (!verdict || !cfg) return null;
            const s = bgImage
              ? (verdict.status === 'go'
                ? 'bg-white/15 border-emerald-400/40 backdrop-blur-sm'
                : verdict.status === 'wait'
                  ? 'bg-white/8 border-amber-400/30 backdrop-blur-sm'
                  : 'bg-white/5 border-white/10 backdrop-blur-sm')
              : `${styles[verdict.status]?.bg || ''} ${styles[verdict.status]?.border || 'border-[var(--border-subtle)]'}`;

            const isGo = verdict.status === 'go';

            return (
              <button
                key={id}
                onClick={() => onSelectActivity?.(id)}
                className={`
                  group relative flex flex-col p-3 rounded-xl border transition-all duration-200 text-left
                  ${s}
                  ${isGo ? 'hover:scale-[1.02] hover:shadow-md' : 'hover:bg-white/[0.06]'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`${bgImage ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{cfg.icon}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    bgImage
                      ? (isGo ? 'bg-emerald-500 text-white' : verdict.status === 'wait' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-white/40')
                      : (styles[verdict.status]?.badge || '')
                  }`}>
                    {verdict.label}
                  </span>
                </div>
                <span className={`text-sm font-bold mb-1 ${bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {cfg.name}
                </span>
                <span className={`text-[11px] leading-tight line-clamp-2 ${
                  bgImage ? 'text-white/60' : (styles[verdict.status]?.text || 'text-[var(--text-tertiary)]')
                }`}>
                  {verdict.reason}
                </span>
                {verdict.window && (
                  <span className={`mt-1.5 text-[10px] font-bold ${bgImage ? 'text-amber-300' : 'text-amber-500'}`}>
                    {verdict.window}
                  </span>
                )}
                <ChevronRight className={`absolute top-3 right-2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ${bgImage ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
