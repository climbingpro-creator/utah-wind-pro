import React, { useMemo } from 'react';
import { Clock, ChevronRight, ArrowUpRight, Zap, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';
import { estimateSessionDuration } from '../services/ThermalPropagation';

const ALL_ACTIVITIES = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'boating', 'paddling', 'fishing', 'windsurfing'];

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

  const dominantChain = propagation?.dominant?.type;
  const session = dominantChain ? estimateSessionDuration(dominantChain, id) : null;

  const dominantChainData = propagation?.chains?.find(c => c.type === dominantChain);
  const estTargetSpeed = dominantChainData?.estimatedTargetSpeed ?? propagation?.chains?.[0]?.estimatedTargetSpeed;

  const isNorthFlow = dominantChain?.includes('north_flow') || dominantChain?.includes('postfrontal');
  const isNonThermalWind = isNorthFlow || (prob < 20 && speed >= (cfg.thresholds?.tooLight || 6));

  // For wind-seeking: check the ACTUAL speed at this launch, not an upstream proxy
  // If we only have proxy data (FPS), use the ratio-adjusted estimate
  const actualSpeed = speed;
  const proxyWarning = estTargetSpeed != null && estTargetSpeed < speed * 0.8;

  if (good && cfg.wantsWind) {
    // SAFETY CHECK 1: Session too short — stranding risk
    if ((session?.source === 'learned' || session?.source === 'pws-backfill') && session.avgMinutes < 45) {
      return {
        status: 'caution', label: 'BRIEF',
        reason: `${Math.round(speed)} mph but avg session only ${session.avgMinutes} min — stranding risk`,
        color: 'amber',
      };
    }

    // SAFETY CHECK 2: Speed is barely above threshold — marginal session
    const minForActivity = cfg.thresholds?.tooLight || 6;
    if (actualSpeed < minForActivity + 4 && actualSpeed >= minForActivity) {
      const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} expected` : '';
      return {
        status: 'caution', label: 'MARGINAL',
        reason: `${Math.round(speed)} mph — barely rideable, may not sustain${sessionStr}`,
        color: 'amber',
      };
    }

    // SAFETY CHECK 3: Proxy mismatch — upstream reads higher than your launch
    if (proxyWarning && estTargetSpeed != null) {
      return {
        status: 'caution', label: 'CHECK',
        reason: `Upstream ${Math.round(speed)} mph → ~${Math.round(estTargetSpeed)} at your launch`,
        color: 'amber',
      };
    }

    // Passed all safety checks — confident GO
    const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} session` : '';
    const ideal = cfg.thresholds?.ideal;
    if (ideal && actualSpeed >= ideal.min && actualSpeed <= ideal.max) {
      return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — ideal range${sessionStr}`, color: 'emerald' };
    }
    return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — conditions active${sessionStr}`, color: 'emerald' };
  }

  if (good && !cfg.wantsWind) {
    const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} window` : '';
    const actId = Object.entries(ACTIVITY_CONFIGS).find(([, v]) => v === cfg)?.[0];
    if (speed <= 2) {
      const glassLabel = actId === 'fishing' ? 'CALM' : actId === 'paddling' ? 'FLAT' : 'GLASS';
      const glassReason = actId === 'fishing' ? `Still water — fish are active${sessionStr}`
        : actId === 'paddling' ? `Mirror-flat — perfect paddle${sessionStr}`
        : `Mirror-flat water${sessionStr}`;
      return { status: 'go', label: glassLabel, reason: glassReason, color: 'emerald' };
    }
    const goodReason = actId === 'fishing' ? `Light ripple (${Math.round(speed)} mph) — great casting${sessionStr}`
      : actId === 'paddling' ? `Light wind (${Math.round(speed)} mph) — easy paddle${sessionStr}`
      : `Light wind (${Math.round(speed)} mph)${sessionStr}`;
    return { status: 'go', label: 'GOOD', reason: goodReason, color: 'lime' };
  }

  if (cfg.wantsWind) {
    if (speed < (cfg.thresholds?.tooLight || 6)) {
      if (isNorthFlow && prob >= 30) {
        const estStr = estTargetSpeed != null ? ` (~${Math.round(estTargetSpeed)} mph expected)` : '';
        return { status: 'wait', label: 'BUILDING', reason: `North flow developing — ${prob}% chance${estStr}`, color: 'amber' };
      }
      if (prob >= 50 && now < thermalEnd) {
        const estStr = estTargetSpeed != null ? ` (~${Math.round(estTargetSpeed)} mph expected here)` : '';
        const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} if it arrives` : '';
        return { status: 'wait', label: 'WAIT', reason: `${prob}% thermal by ${formatHour(thermalStart)}${estStr}${sessionStr}`, color: 'amber', window: formatHour(thermalStart) };
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

    // Between tooLight and goodCondition — not "OFF", it's rideable or building
    if (!good) {
      const tooLight = cfg.thresholds?.tooLight || 6;
      const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} session` : '';
      if (isNonThermalWind && gf < 1.4) {
        return { status: 'go', label: 'RIDEABLE', reason: `${Math.round(speed)} mph ${isNorthFlow ? 'north flow' : ''} — clean wind${sessionStr}`, color: 'lime' };
      }
      if (gf < 1.3) {
        return { status: 'caution', label: 'FOILABLE', reason: `${Math.round(speed)} mph — light but rideable${sessionStr}`, color: 'amber' };
      }
      if (isNorthFlow || isNonThermalWind) {
        return { status: 'wait', label: 'BUILDING', reason: `${Math.round(speed)} mph ${isNorthFlow ? 'north flow' : ''} — watching for increase`, color: 'amber' };
      }
      return { status: 'caution', label: 'MARGINAL', reason: `${Math.round(speed)} mph — above ${tooLight} mph minimum${sessionStr}`, color: 'amber' };
    }
  } else {
    const dangerThreshold = cfg.thresholds?.dangerous ?? cfg.thresholds?.difficult ?? 20;
    const roughThreshold = cfg.thresholds?.rough ?? cfg.thresholds?.choppy ?? 15;
    const choppyThreshold = cfg.thresholds?.choppy ?? cfg.thresholds?.manageable ?? 8;

    if (speed >= dangerThreshold) return { status: 'off', label: 'DANGEROUS', reason: `${Math.round(speed)} mph — unsafe conditions`, color: 'red' };
    if (speed >= roughThreshold) return { status: 'off', label: 'ROUGH', reason: `${Math.round(speed)} mph — too rough`, color: 'red' };
    if (speed >= choppyThreshold) {
      if (isNonThermalWind) {
        return { status: 'off', label: 'CHOPPY', reason: `${Math.round(speed)} mph north flow — extended wind likely`, color: 'orange' };
      }
      const calmAfter = thermalEnd + 1;
      if (calmAfter < 21 && now < calmAfter) {
        return { status: 'wait', label: 'WINDY', reason: `Calm expected after ${formatHour(calmAfter)}`, color: 'amber', window: `After ${formatHour(calmAfter)}` };
      }
      return { status: 'off', label: 'CHOPPY', reason: `${Math.round(speed)} mph — choppy`, color: 'orange' };
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

export default function TodayHero({ windSpeed, windGust, thermalPrediction, boatingPrediction, onSelectActivity, selectedActivity, fpsStation, utalpStation, propagation }) {
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
            const isSelected = selectedActivity === id;
            const isGo = verdict.status === 'go';

            const s = isSelected
              ? (bgImage
                  ? 'bg-sky-500/25 border-sky-400 backdrop-blur-sm ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/20'
                  : 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-400/40 shadow-md shadow-sky-500/10')
              : bgImage
                ? (verdict.status === 'go'
                  ? 'bg-white/15 border-emerald-400/40 backdrop-blur-sm'
                  : verdict.status === 'wait'
                    ? 'bg-white/8 border-amber-400/30 backdrop-blur-sm'
                    : 'bg-white/5 border-white/10 backdrop-blur-sm')
                : `${styles[verdict.status]?.bg || ''} ${styles[verdict.status]?.border || 'border-[var(--border-subtle)]'}`;

            return (
              <button
                key={id}
                onClick={() => onSelectActivity?.(id)}
                className={`
                  group relative flex flex-col p-3 rounded-xl border transition-all duration-200 text-left
                  ${s}
                  ${isSelected ? 'scale-[1.03]' : isGo ? 'hover:scale-[1.02] hover:shadow-md' : 'hover:bg-white/[0.06]'}
                `}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-sky-500 text-white shadow-sm">
                    Selected
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className={`${isSelected ? 'text-sky-400' : bgImage ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{cfg.icon}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    bgImage
                      ? (isGo ? 'bg-emerald-500 text-white' : verdict.status === 'wait' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-white/40')
                      : (styles[verdict.status]?.badge || '')
                  }`}>
                    {verdict.label}
                  </span>
                </div>
                <span className={`text-sm font-bold mb-1 ${isSelected ? (bgImage ? 'text-sky-300' : 'text-sky-500') : bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
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
                {isSelected
                  ? <CheckCircle className={`absolute top-3 right-2 w-4 h-4 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
                  : <ChevronRight className={`absolute top-3 right-2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ${bgImage ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                }
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
