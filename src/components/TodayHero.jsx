import React, { useMemo } from 'react';
import { Wind, Clock, ChevronRight, ArrowUpRight, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';

const ALL_ACTIVITIES = ['kiting', 'sailing', 'paragliding', 'boating', 'paddling', 'fishing'];

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

function buildOutlook(windSpeed, windGust, thermalPrediction, boatingPrediction) {
  const now = new Date().getHours();
  const speed = windSpeed ?? 0;
  const gust = windGust ?? speed;
  const thermal = thermalPrediction || {};
  const thermalStart = thermal.startHour || 10;
  const thermalEnd = thermal.endHour || 17;
  const prob = thermal.probability || 0;

  const activeNow = [];
  const comingLater = [];
  const notToday = [];

  for (const id of ALL_ACTIVITIES) {
    const cfg = ACTIVITY_CONFIGS[id];
    if (!cfg) continue;

    const good = cfg.goodCondition?.(speed, gust);
    const entry = { id, name: cfg.name, icon: cfg.icon, wantsWind: cfg.wantsWind };

    if (good) {
      activeNow.push(entry);
    } else if (cfg.wantsWind) {
      if (prob >= 40 && now < thermalEnd) {
        entry.window = `${formatHour(thermalStart)}–${formatHour(thermalEnd)}`;
        comingLater.push(entry);
      } else {
        notToday.push(entry);
      }
    } else {
      if (speed >= 8 && now < 20) {
        const calmAfter = thermalEnd + 1;
        if (calmAfter < 21) {
          entry.window = `After ${formatHour(calmAfter)}`;
          comingLater.push(entry);
        } else {
          entry.window = 'Early morning';
          comingLater.push(entry);
        }
      } else if (speed >= 5 && now < thermalStart) {
        entry.window = `Before ${formatHour(thermalStart)}`;
        comingLater.push(entry);
      } else {
        notToday.push(entry);
      }
    }
  }

  let headline = '';
  let subline = '';
  let mood = 'neutral';

  if (activeNow.length >= 4) {
    mood = 'epic';
    headline = 'Everything is ON right now';
    subline = `${speed} mph winds — perfect for ${activeNow.slice(0, 3).map(a => a.name.toLowerCase()).join(', ')}, and more`;
  } else if (activeNow.some(a => a.wantsWind) && activeNow.some(a => !a.wantsWind)) {
    mood = 'good';
    const windSports = activeNow.filter(a => a.wantsWind).map(a => a.name).join(' & ');
    const calmSports = activeNow.filter(a => !a.wantsWind).map(a => a.name).join(' & ');
    headline = `${windSports} conditions are live`;
    subline = `${calmSports} still workable at ${speed} mph`;
  } else if (activeNow.length > 0 && activeNow.every(a => a.wantsWind)) {
    mood = 'good';
    headline = `Wind is up — ${activeNow.map(a => a.name).join(', ')} are GO`;
    subline = `${speed} mph${gust > speed * 1.3 ? ` gusting ${Math.round(gust)}` : ''} right now`;
  } else if (activeNow.length > 0 && activeNow.every(a => !a.wantsWind)) {
    mood = 'calm';
    headline = speed <= 3 ? 'Glass water — get out there' : 'Calm enough for the water';
    subline = `${activeNow.map(a => a.name).join(', ')} conditions are ideal`;
  } else if (comingLater.length > 0) {
    mood = 'mixed';
    const nextUp = comingLater[0];
    headline = `${nextUp.name} window opens ${nextUp.window}`;
    subline = prob >= 50
      ? `${Math.round(prob * 100)}% chance of thermal wind today`
      : 'Conditions are building — keep watching';
  } else {
    mood = 'neutral';
    headline = 'Quiet day on the water';
    subline = 'No strong signals for wind or glass — check back later';
  }

  let bestAction = null;
  if (activeNow.some(a => a.wantsWind) && speed >= 10) {
    bestAction = { text: 'Get to the water NOW — wind is here', urgency: 'high' };
  } else if (activeNow.some(a => !a.wantsWind) && speed <= 3) {
    bestAction = { text: 'Launch now for glass — it won\'t last all day', urgency: 'high' };
  } else if (comingLater.length > 0) {
    const next = comingLater[0];
    bestAction = { text: `Plan for ${next.name.toLowerCase()} — ${next.window}`, urgency: 'medium' };
  }

  return { headline, subline, mood, activeNow, comingLater, notToday, bestAction, speed, gust };
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

export default function TodayHero({ windSpeed, windGust, thermalPrediction, boatingPrediction, onSelectActivity }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const outlook = useMemo(
    () => buildOutlook(windSpeed, windGust, thermalPrediction, boatingPrediction),
    [windSpeed, windGust, thermalPrediction, boatingPrediction]
  );

  const accent = MOOD_ACCENT[outlook.mood] || MOOD_ACCENT.neutral;

  const bgImage = getRotatingImage(outlook.mood, 'mood') || MOOD_IMAGE_FALLBACK[outlook.mood];

  return (
    <div className={`animate-fade-in ${bgImage ? 'hero-mood' : ''}`}>
      {/* Background photo */}
      {bgImage && (
        <>
          <img src={bgImage} alt="" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        </>
      )}

      <div className={`relative z-10 p-5 sm:p-6 lg:p-8 ${bgImage ? '' : 'card'}`}>
        {/* Top row: greeting + wind metric */}
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

          {/* Hero wind number */}
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

        {/* Active now */}
        {outlook.activeNow.length > 0 && (
          <div className="mb-5 animate-fade-in-delay">
            <div className="flex items-center gap-2 mb-3">
              <Wind className={`w-3.5 h-3.5 ${bgImage ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-widest ${bgImage ? 'text-emerald-400' : 'text-emerald-500'}`}>Active Now</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {outlook.activeNow.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelectActivity?.(a.id)}
                  className={`
                    group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
                    transition-all duration-200 cursor-pointer
                    ${bgImage
                      ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20 backdrop-blur-sm'
                      : isDark
                        ? 'bg-white/[0.04] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-emerald-500/40 hover:bg-emerald-500/5'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'}
                  `}
                >
                  <span className="text-sm">{a.icon}</span>
                  <span>{a.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity -ml-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Coming later */}
        {outlook.comingLater.length > 0 && (
          <div className="mb-5 animate-fade-in-delay">
            <div className="flex items-center gap-2 mb-3">
              <Clock className={`w-3.5 h-3.5 ${bgImage ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-widest ${bgImage ? 'text-amber-400' : 'text-amber-500'}`}>Coming Up</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {outlook.comingLater.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelectActivity?.(a.id)}
                  className={`
                    group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 cursor-pointer
                    ${bgImage
                      ? 'bg-white/5 text-white/80 border border-white/5 hover:bg-white/10 backdrop-blur-sm'
                      : isDark
                        ? 'bg-white/[0.02] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-amber-500/30 hover:bg-amber-500/5'
                        : 'bg-slate-50/60 text-slate-600 border border-slate-150 hover:border-amber-400 hover:bg-amber-50'}
                  `}
                >
                  <span className="text-sm opacity-60">{a.icon}</span>
                  <span>{a.name}</span>
                  {a.window && (
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                      bgImage ? 'bg-white/10 text-amber-300' : isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {a.window}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Best action CTA */}
        {outlook.bestAction && (
          <div className={`pt-4 mt-2 border-t ${bgImage ? 'border-white/10' : isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
            <div className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
              ${outlook.bestAction.urgency === 'high'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                : bgImage
                  ? 'bg-white/10 text-white border border-white/10 backdrop-blur-sm'
                  : isDark 
                    ? 'bg-white/[0.04] text-[var(--text-primary)] border border-[var(--border-color)]'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm'}
            `}>
              {outlook.bestAction.urgency === 'high'
                ? <Zap className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {outlook.bestAction.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
