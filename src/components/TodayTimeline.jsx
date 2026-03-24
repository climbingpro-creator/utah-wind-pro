import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Wind, Navigation, ChevronRight } from 'lucide-react';
import { apiUrl } from '../utils/platform';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getHourlyForecast } from '../services/ForecastService';

const LAKE_TO_GRID = {
  'utah-lake-lincoln': 'utah-lake', 'utah-lake-sandy': 'utah-lake',
  'utah-lake-vineyard': 'utah-lake', 'utah-lake-zigzag': 'utah-lake',
  'utah-lake-mm19': 'utah-lake', 'potm-south': 'utah-lake',
  'potm-north': 'utah-lake', 'rush-lake': 'utah-lake',
  'grantsville': 'utah-lake', 'stockton-bar': 'utah-lake',
  'inspo': 'utah-lake', 'west-mountain': 'utah-lake',
  'yuba': 'utah-lake',
  'deer-creek': 'deer-creek', 'jordanelle': 'deer-creek',
  'east-canyon': 'deer-creek', 'echo': 'deer-creek',
  'rockport': 'deer-creek',
  'strawberry-ladders': 'deer-creek', 'strawberry-bay': 'deer-creek',
  'strawberry-soldier': 'deer-creek', 'strawberry-view': 'deer-creek',
  'strawberry-river': 'deer-creek', 'skyline-drive': 'deer-creek',
  'scofield': 'deer-creek',
  'willard-bay': 'willard-bay', 'pineview': 'willard-bay',
  'hyrum': 'willard-bay', 'powder-mountain': 'willard-bay',
  'monte-cristo': 'willard-bay',
  'bear-lake': 'bear-lake',
  'sand-hollow': 'stgeorge', 'quail-creek': 'stgeorge',
  'lake-powell': 'stgeorge', 'otter-creek': 'stgeorge',
  'fish-lake': 'stgeorge', 'minersville': 'stgeorge',
  'piute': 'stgeorge', 'panguitch': 'stgeorge',
  'starvation': 'vernal', 'steinaker': 'vernal',
  'red-fleet': 'vernal', 'flaming-gorge': 'vernal',
};

const DIR_TO_DEG = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112,
  SE: 135, SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247,
  W: 270, WNW: 292, NW: 315, NNW: 337,
};
function dirToDeg(dir) {
  return DIR_TO_DEG[dir] ?? 0;
}

const SPOT_NAMES = {
  'utah-lake': 'Utah Lake', 'utah-lake-lincoln': 'Lincoln Beach',
  'utah-lake-sandy': 'Sandy Beach', 'utah-lake-vineyard': 'Vineyard',
  'utah-lake-zigzag': 'Zig Zag', 'utah-lake-mm19': 'Mile Marker 19',
  'potm-south': 'PotM South', 'potm-north': 'PotM North',
  'deer-creek': 'Deer Creek', 'jordanelle': 'Jordanelle',
  'willard-bay': 'Willard Bay', 'bear-lake': 'Bear Lake',
  'pineview': 'Pineview', 'rush-lake': 'Rush Lake',
  'grantsville': 'Grantsville', 'east-canyon': 'East Canyon',
  'echo': 'Echo', 'rockport': 'Rockport',
  'strawberry-ladders': 'Strawberry Ladders', 'strawberry-bay': 'Strawberry Bay',
  'strawberry-soldier': 'Soldier Creek', 'strawberry-view': 'The View',
  'strawberry-river': 'The River', 'skyline-drive': 'Skyline Drive',
  'scofield': 'Scofield', 'sand-hollow': 'Sand Hollow',
  'quail-creek': 'Quail Creek', 'lake-powell': 'Lake Powell',
  'starvation': 'Starvation', 'steinaker': 'Steinaker',
  'red-fleet': 'Red Fleet', 'flaming-gorge': 'Flaming Gorge',
  'inspo': 'Inspiration Point', 'west-mountain': 'West Mountain',
  'stockton-bar': 'Stockton Bar', 'powder-mountain': 'Powder Mountain',
  'monte-cristo': 'Monte Cristo', 'hyrum': 'Hyrum',
  'otter-creek': 'Otter Creek', 'fish-lake': 'Fish Lake',
  'minersville': 'Minersville', 'piute': 'Piute',
  'panguitch': 'Panguitch', 'yuba': 'Yuba',
};

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatHourShort(h) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function getHourStatus(speed, activity) {
  const cfg = ACTIVITY_CONFIGS[activity];
  if (!cfg || speed == null) return 'unknown';
  const t = cfg.thresholds;

  if (cfg.wantsWind) {
    if (t.tooStrong && speed >= t.tooStrong) return 'danger';
    if (t.ideal && speed >= t.ideal.min && speed <= t.ideal.max) return 'ideal';
    const goodMin = t.foilMin ?? t.beginnerMax ?? t.ideal?.min;
    if (goodMin && speed >= goodMin) return 'good';
    if (t.tooLight && speed >= t.tooLight) return 'marginal';
    return 'off';
  }
  const dangerSpeed = t.dangerous ?? t.difficult ?? 25;
  const roughSpeed = t.rough ?? t.manageable ?? 15;
  const choppySpeed = t.choppy ?? t.manageable ?? 10;
  if (speed >= dangerSpeed) return 'danger';
  if (speed >= roughSpeed) return 'marginal';
  if (speed >= choppySpeed) return 'good';
  if (t.ideal && speed <= t.ideal.max) return 'ideal';
  return 'ideal';
}

const STATUS_COLORS = {
  ideal:    { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'GO' },
  good:     { bar: 'bg-green-500',   text: 'text-green-400',   label: 'GO' },
  marginal: { bar: 'bg-amber-500',   text: 'text-amber-400',   label: 'MAYBE' },
  danger:   { bar: 'bg-red-500',     text: 'text-red-400',     label: 'HIGH' },
  off:      { bar: 'bg-slate-600',   text: 'text-slate-500',   label: '' },
  unknown:  { bar: 'bg-slate-700',   text: 'text-slate-600',   label: '' },
};

const ACTIVITY_LEGENDS = {
  kiting:      { ideal: 'Ideal wind',   good: 'Rideable',      marginal: 'Gusty / marginal', off: 'Too light' },
  snowkiting:  { ideal: 'Ideal wind',   good: 'Rideable',      marginal: 'Gusty / marginal', off: 'Too light' },
  windsurfing: { ideal: 'Ideal wind',   good: 'Planing',       marginal: 'Overpowered',      off: 'Too light' },
  sailing:     { ideal: 'Racing wind',  good: 'Good breeze',   marginal: 'Heavy air',         off: 'Drifter' },
  boating:     { ideal: 'Glass / calm', good: 'Light chop',    marginal: 'Choppy',            off: null },
  paddling:    { ideal: 'Glass / calm', good: 'Light ripple',  marginal: 'Choppy — caution',  off: null },
  fishing:     { ideal: 'Perfect calm', good: 'Light breeze',  marginal: 'Windy — tough bite', off: null },
  paragliding: { ideal: 'Soarable',     good: 'Flyable',       marginal: 'Strong / gusty',    off: 'Too light' },
};

const ACTIVITY_WINDOW_LABELS = {
  kiting:      { best: 'Best session', none: 'No rideable window today' },
  snowkiting:  { best: 'Best session', none: 'No rideable window today' },
  windsurfing: { best: 'Best session', none: 'No planing wind today' },
  sailing:     { best: 'Best racing window', none: 'No strong breeze today' },
  boating:     { best: 'Calmest window', none: 'Windy all day — rough conditions' },
  paddling:    { best: 'Calmest window', none: 'Windy all day — stay near shore' },
  fishing:     { best: 'Best fishing window', none: 'Windy all day — fish sheltered spots' },
  paragliding: { best: 'Best flying window', none: 'No flyable window today' },
};

function findBestWindow(hours, activity) {
  if (!hours.length) return null;
  let bestStart = -1, bestEnd = -1, bestScore = 0;
  let curStart = -1, curScore = 0;

  for (let i = 0; i < hours.length; i++) {
    const status = getHourStatus(hours[i].speed, activity);
    if (status === 'ideal' || status === 'good') {
      if (curStart === -1) curStart = i;
      curScore += status === 'ideal' ? 2 : 1;
    } else {
      if (curScore > bestScore) {
        bestStart = curStart;
        bestEnd = i - 1;
        bestScore = curScore;
      }
      curStart = -1;
      curScore = 0;
    }
  }
  if (curScore > bestScore) {
    bestStart = curStart;
    bestEnd = hours.length - 1;
    bestScore = curScore;
  }
  if (bestStart === -1) return null;
  return {
    startHour: hours[bestStart].localHour,
    endHour: hours[bestEnd].localHour,
    peakSpeed: Math.max(...hours.slice(bestStart, bestEnd + 1).map(h => h.speed || 0)),
    duration: bestEnd - bestStart + 1,
  };
}

const MPH_TO_KT = 0.868976;

export default function TodayTimeline({ locationId = 'utah-lake', activity = 'kiting' }) {
  const [nwsData, setNwsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useKnots, setUseKnots] = useState(() => localStorage.getItem('windUnit') === 'kt');
  const scrollRef = useRef(null);

  const toggleUnit = () => {
    setUseKnots(prev => {
      const next = !prev;
      localStorage.setItem('windUnit', next ? 'kt' : 'mph');
      return next;
    });
  };

  const displaySpeed = (mph) => {
    if (mph == null) return '—';
    return Math.round(useKnots ? mph * MPH_TO_KT : mph);
  };

  const unitLabel = useKnots ? 'kt' : 'mph';

  const [clientHourly, setClientHourly] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch(apiUrl('/api/cron/collect?action=nws'));
        const data = await resp.json();
        if (!cancelled) setNwsData(data);

        const gridId = LAKE_TO_GRID[locationId] || 'utah-lake';
        const serverHourly = data?.grids?.[gridId]?.hourly;
        if ((!serverHourly || serverHourly.length === 0) && !cancelled) {
          const hours = await getHourlyForecast(locationId);
          if (hours && !cancelled) {
            setClientHourly(hours.map(h => {
              const dt = new Date(h.startTime);
              return {
                localHour: dt.getHours(),
                speed: h.windSpeed,
                dir: h.windDirection,
                dirDeg: dirToDeg(h.windDirection),
                temp: h.temperature,
                text: h.shortForecast,
              };
            }));
          }
        }
      } catch (e) {
        console.error('TodayTimeline load error:', e);
        try {
          const hours = await getHourlyForecast(locationId);
          if (hours && !cancelled) {
            setClientHourly(hours.map(h => {
              const dt = new Date(h.startTime);
              return {
                localHour: dt.getHours(),
                speed: h.windSpeed,
                dir: h.windDirection,
                dirDeg: dirToDeg(h.windDirection),
                temp: h.temperature,
                text: h.shortForecast,
              };
            }));
          }
        } catch (e2) {
          console.error('TodayTimeline client fallback error:', e2);
        }
      }
      if (!cancelled) setLoading(false);
    };
    load();
    const interval = setInterval(load, 300000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [locationId]);

  const gridId = LAKE_TO_GRID[locationId] || 'utah-lake';
  const allHourly = (nwsData?.grids?.[gridId]?.hourly?.length > 0
    ? nwsData.grids[gridId].hourly
    : clientHourly) || [];
  const nowHour = new Date().getHours();

  const todayHours = useMemo(() => {
    if (!allHourly.length) return [];
    const nowIdx = allHourly.findIndex(h => h.localHour === nowHour);
    const startIdx = Math.max(0, nowIdx >= 0 ? nowIdx : 0);
    return allHourly.slice(startIdx, startIdx + 18);
  }, [allHourly, nowHour]);

  const maxSpeed = useMemo(() =>
    Math.max(25, ...todayHours.map(h => h.speed || 0)),
  [todayHours]);

  const bestWindow = useMemo(() =>
    findBestWindow(todayHours, activity),
  [todayHours, activity]);

  useEffect(() => {
    if (scrollRef.current) {
      const nowEl = scrollRef.current.querySelector('[data-now="true"]');
      if (nowEl) nowEl.scrollIntoView({ inline: 'start', behavior: 'smooth', block: 'nearest' });
    }
  }, [todayHours]);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="h-6 bg-slate-800 rounded w-48 mb-3 animate-pulse" />
        <div className="h-32 bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!todayHours.length) return null;

  const activityName = ACTIVITY_CONFIGS[activity]?.name || activity;
  const isCalmActivity = !ACTIVITY_CONFIGS[activity]?.wantsWind;
  const legend = ACTIVITY_LEGENDS[activity] || ACTIVITY_LEGENDS.kiting;
  const windowLabels = ACTIVITY_WINDOW_LABELS[activity] || ACTIVITY_WINDOW_LABELS.kiting;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-sky-400" />
            <h3 className="font-bold text-white text-base">{isCalmActivity ? `${activityName} Conditions` : "Today's Wind"}</h3>
            <span className="text-sm text-slate-400">—</span>
            <span className="text-sm font-medium text-sky-400">{SPOT_NAMES[locationId] || locationId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleUnit}
              className="text-xs font-bold px-2 py-0.5 rounded-full border transition-colors bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500 hover:text-sky-400"
            >
              {useKnots ? 'kt → mph' : 'mph → kt'}
            </button>
            {nwsData?.fetchedAt && (
              <span className="text-xs text-slate-500">
                NWS {new Date(nwsData.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Best Window Callout */}
        {bestWindow ? (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Wind size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-emerald-400">
                {windowLabels.best}: {formatHourShort(bestWindow.startHour)}–{formatHourShort(bestWindow.endHour)}
              </span>
              <span className="text-xs text-emerald-400/70 ml-2">
                {isCalmActivity ? 'max' : 'peak'} {displaySpeed(bestWindow.peakSpeed)} {unitLabel}  ·  {bestWindow.duration}hr window
              </span>
            </div>
            <ChevronRight size={14} className="text-emerald-400/50 shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <Wind size={16} className="text-slate-500 shrink-0" />
            <span className="text-sm text-slate-400">
              {windowLabels.none}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Timeline */}
      <div className="px-4 pb-2 pt-1 overflow-x-auto scrollbar-hide" ref={scrollRef}>
        <div className="flex gap-1" style={{ minWidth: `${todayHours.length * 60}px` }}>
          {todayHours.map((h, i) => {
            const status = getHourStatus(h.speed, activity);
            const colors = STATUS_COLORS[status];
            const barHeight = Math.max(8, ((h.speed || 0) / maxSpeed) * 80);
            const isNow = h.localHour === nowHour;
            const dirDeg = h.dirDeg != null ? h.dirDeg : 0;

            return (
              <div
                key={i}
                data-now={isNow}
                className={`flex flex-col items-center w-14 shrink-0 rounded-lg py-2 px-1 transition-all ${
                  isNow ? 'bg-sky-500/15 ring-1 ring-sky-500/40' : 'hover:bg-slate-800/50'
                }`}
              >
                {/* Time — top */}
                <span className={`text-sm font-semibold tabular-nums mb-1 ${
                  isNow ? 'text-sky-400' : 'text-slate-300'
                }`}>
                  {formatHour(h.localHour)}
                </span>

                {/* NOW badge */}
                {isNow && (
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/20 rounded px-1 mb-1">NOW</span>
                )}

                {/* Wind speed — above bar */}
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-bold tabular-nums ${isNow ? 'text-sky-400' : colors.text}`}>
                    {displaySpeed(h.speed)}
                  </span>
                  <span className="text-[9px] text-slate-500">{unitLabel}</span>
                </div>

                {/* Bar */}
                <div className="w-5 bg-slate-800 rounded-full mt-1 mb-1 relative" style={{ height: '70px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-full transition-all ${colors.bar} ${
                      status === 'ideal' ? 'opacity-90' : 'opacity-70'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>

                {/* Direction arrow */}
                <div className="w-5 h-5 flex items-center justify-center">
                  <Navigation
                    size={12}
                    className={`${isNow ? 'text-sky-400' : 'text-slate-500'}`}
                    style={{ transform: `rotate(${(dirDeg + 180) % 360}deg)` }}
                  />
                </div>

                {/* Temperature — bottom */}
                {h.temp != null && (
                  <span className={`text-sm font-medium mt-0.5 ${
                    isNow ? 'text-sky-300' : 'text-slate-400'
                  }`}>{Math.round(h.temp)}°</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — sport-specific labels */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-800/50 text-[10px] text-slate-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {legend.ideal}</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> {legend.good}</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> {legend.marginal}</div>
        {legend.off && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-600" /> {legend.off}</div>}
      </div>
    </div>
  );
}
