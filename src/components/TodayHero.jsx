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
    dark: 'from-green-900/40 via-emerald-900/30 to-slate-900/50 border-green-500/40',
    light: 'from-green-50 via-emerald-50 to-white border-green-400',
    accent: 'text-green-400',
    accentLight: 'text-green-700',
    badge: 'bg-green-500',
  },
  good: {
    dark: 'from-cyan-900/30 via-blue-900/20 to-slate-900/50 border-cyan-500/30',
    light: 'from-cyan-50 via-blue-50 to-white border-cyan-400',
    accent: 'text-cyan-400',
    accentLight: 'text-cyan-700',
    badge: 'bg-cyan-500',
  },
  calm: {
    dark: 'from-blue-900/30 via-indigo-900/20 to-slate-900/50 border-blue-500/30',
    light: 'from-blue-50 via-indigo-50 to-white border-blue-400',
    accent: 'text-blue-400',
    accentLight: 'text-blue-700',
    badge: 'bg-blue-500',
  },
  mixed: {
    dark: 'from-yellow-900/20 via-amber-900/15 to-slate-900/50 border-yellow-500/25',
    light: 'from-yellow-50 via-amber-50 to-white border-yellow-400',
    accent: 'text-yellow-400',
    accentLight: 'text-yellow-700',
    badge: 'bg-yellow-500',
  },
  neutral: {
    dark: 'from-slate-800/50 via-slate-800/30 to-slate-900/50 border-slate-700',
    light: 'from-slate-50 via-white to-white border-slate-200',
    accent: 'text-slate-400',
    accentLight: 'text-slate-600',
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
      rounded-2xl border p-5 bg-gradient-to-br transition-all duration-500
      ${isDark ? style.dark : style.light}
    `}>
      {/* Greeting + headline */}
      <div className="mb-4">
        <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {getGreeting()} — Today's Outlook
        </p>
        <h2 className={`text-xl sm:text-2xl font-bold leading-tight ${isDark ? style.accent : style.accentLight}`}>
          {outlook.headline}
        </h2>
        {outlook.subline && (
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {outlook.subline}
          </p>
        )}
      </div>

      {/* Active now row */}
      {outlook.activeNow.length > 0 && (
        <div className="mb-4">
          <div className={`flex items-center gap-1.5 mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            <Wind className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Active Now</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {outlook.activeNow.map(a => (
              <button
                key={a.id}
                onClick={() => onSelectActivity?.(a.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
                  transition-all hover:scale-105 active:scale-95 cursor-pointer
                  ${isDark
                    ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40 hover:bg-green-500/30'
                    : 'bg-green-100 text-green-800 ring-1 ring-green-400/50 hover:bg-green-200'}
                `}
              >
                <span>{a.icon}</span>
                <span>{a.name}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coming later row */}
      {outlook.comingLater.length > 0 && (
        <div className="mb-4">
          <div className={`flex items-center gap-1.5 mb-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Coming Up</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {outlook.comingLater.map(a => (
              <button
                key={a.id}
                onClick={() => onSelectActivity?.(a.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-all hover:scale-105 active:scale-95 cursor-pointer
                  ${isDark
                    ? 'bg-yellow-500/10 text-yellow-300 ring-1 ring-yellow-500/25 hover:bg-yellow-500/20'
                    : 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-400/30 hover:bg-yellow-100'}
                `}
              >
                <span>{a.icon}</span>
                <span>{a.name}</span>
                {a.window && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                    isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-200 text-yellow-800'
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
        <div className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          ${outlook.bestAction.urgency === 'high'
            ? (isDark
              ? 'bg-green-500/15 text-green-300 ring-1 ring-green-500/30 animate-pulse'
              : 'bg-green-100 text-green-800 ring-1 ring-green-400/40 animate-pulse')
            : (isDark
              ? 'bg-slate-700/50 text-slate-300 ring-1 ring-slate-600'
              : 'bg-slate-100 text-slate-700 ring-1 ring-slate-300')
          }
        `}>
          <Sun className="w-4 h-4 shrink-0" />
          <span>{outlook.bestAction.text}</span>
        </div>
      )}
    </div>
  );
}
