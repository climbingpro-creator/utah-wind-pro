import React, { useMemo } from 'react';
import { Sun, Wind, Clock, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';

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

  // Headline logic
  let headline = '';
  let subline = '';
  let mood = 'neutral'; // 'epic', 'good', 'mixed', 'calm', 'neutral'

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

  // Best action
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

const MOOD_STYLES = {
  epic: {
    dark: 'from-green-900/50 via-emerald-800/40 to-slate-900/80 border-green-500/30 shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]',
    light: 'from-green-100 via-emerald-50 to-white border-green-300 shadow-green-500/10',
    accent: 'text-green-400',
    accentLight: 'text-green-700',
    badge: 'bg-green-500',
  },
  good: {
    dark: 'from-cyan-900/50 via-blue-800/40 to-slate-900/80 border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]',
    light: 'from-cyan-100 via-blue-50 to-white border-cyan-300 shadow-cyan-500/10',
    accent: 'text-cyan-400',
    accentLight: 'text-cyan-700',
    badge: 'bg-cyan-500',
  },
  calm: {
    dark: 'from-indigo-900/50 via-blue-800/30 to-slate-900/80 border-indigo-500/30 shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]',
    light: 'from-indigo-100 via-blue-50 to-white border-indigo-300 shadow-indigo-500/10',
    accent: 'text-indigo-400',
    accentLight: 'text-indigo-700',
    badge: 'bg-indigo-500',
  },
  mixed: {
    dark: 'from-amber-900/40 via-yellow-800/30 to-slate-900/80 border-amber-500/30 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]',
    light: 'from-amber-100 via-yellow-50 to-white border-amber-300 shadow-amber-500/10',
    accent: 'text-amber-400',
    accentLight: 'text-amber-700',
    badge: 'bg-amber-500',
  },
  neutral: {
    dark: 'from-slate-800/80 via-slate-800/50 to-slate-900/80 border-slate-700 shadow-xl',
    light: 'from-slate-100 via-slate-50 to-white border-slate-200 shadow-sm',
    accent: 'text-slate-300',
    accentLight: 'text-slate-700',
    badge: 'bg-slate-500',
  },
};

export default function TodayHero({ windSpeed, windGust, thermalPrediction, boatingPrediction, onSelectActivity }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const outlook = useMemo(
    () => buildOutlook(windSpeed, windGust, thermalPrediction, boatingPrediction),
    [windSpeed, windGust, thermalPrediction, boatingPrediction]
  );

  const style = MOOD_STYLES[outlook.mood] || MOOD_STYLES.neutral;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border p-6 bg-gradient-to-br transition-all duration-500
      backdrop-blur-xl
      ${isDark ? style.dark : style.light}
    `}>
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Greeting + headline */}
      <div className="relative z-10 mb-6">
        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {getGreeting()} — Today's Outlook
        </p>
        <h2 className={`text-2xl sm:text-3xl font-black leading-tight tracking-tight ${isDark ? style.accent : style.accentLight}`}>
          {outlook.headline}
        </h2>
        {outlook.subline && (
          <p className={`text-sm sm:text-base mt-2 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {outlook.subline}
          </p>
        )}
      </div>

      {/* Active now row */}
      {outlook.activeNow.length > 0 && (
        <div className="relative z-10 mb-5">
          <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            <Wind className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Active Now</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {outlook.activeNow.map(a => (
              <button
                key={a.id}
                onClick={() => onSelectActivity?.(a.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold
                  transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm
                  ${isDark
                    ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20'
                    : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                `}
              >
                <span className="text-base">{a.icon}</span>
                <span>{a.name}</span>
                <ChevronRight className="w-4 h-4 opacity-40 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coming later row */}
      {outlook.comingLater.length > 0 && (
        <div className="relative z-10 mb-5">
          <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <Clock className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Coming Up</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {outlook.comingLater.map(a => (
              <button
                key={a.id}
                onClick={() => onSelectActivity?.(a.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
                  transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                  ${isDark
                    ? 'bg-slate-800/50 text-slate-200 border border-slate-700/50 hover:bg-slate-800'
                    : 'bg-white/60 text-slate-700 border border-slate-200 hover:bg-white'}
                `}
              >
                <span className="text-base grayscale opacity-80">{a.icon}</span>
                <span>{a.name}</span>
                {a.window && (
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ml-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {a.window}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Best Action callout */}
      {outlook.bestAction && (
        <div className={`
          relative z-10 mt-6 pt-5 border-t 
          ${isDark ? 'border-white/10' : 'border-black/5'}
        `}>
          <div className={`
            inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm
            ${outlook.bestAction.urgency === 'high'
              ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white')
              : (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-900 border border-slate-200')}
          `}>
            <Sun className={`w-4 h-4 ${outlook.bestAction.urgency === 'high' ? 'animate-pulse' : ''}`} />
            {outlook.bestAction.text}
          </div>
        </div>
      )}
    </div>
  );
}
