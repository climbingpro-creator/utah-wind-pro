import { MapPin, ChevronDown, ChevronUp, Wind, Snowflake, Mountain } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LAKE_CONFIGS } from '../config/lakeStations';

const UTAH_LAKE_LAUNCHES = [
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', wind: 'SE', direction: '135-165°', icon: '↖', position: 'South', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', wind: 'SE', direction: '130-160°', icon: '↖', position: 'S-Central', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', wind: 'S/SSW/W', direction: '180-270°', icon: '↙', position: 'Central', meter: 'FPS', meterName: 'Flight Park S' },
  { id: 'utah-lake-zigzag', name: 'Zig Zag', wind: 'SE', direction: '135-165°', icon: '↖', position: 'N-Central', meter: 'FPS', meterName: 'Flight Park S' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', wind: 'SE/E', direction: '120-160°', icon: '↖', position: 'North', meter: 'QSF', meterName: 'Spanish Fork' },
];

const STRAWBERRY_LAUNCHES = [
  { id: 'strawberry-ladders', name: 'Ladders', wind: 'W/NW', direction: '260-340°', position: 'NW Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Primary launch — shallow, best access' },
  { id: 'strawberry-bay', name: 'Strawberry Bay', wind: 'W/SW', direction: '220-280°', position: 'W Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Marina area — good parking' },
  { id: 'strawberry-soldier', name: 'Soldier Creek', wind: 'S/SW', direction: '180-240°', position: 'South Dam', meter: 'RVZU1', meterName: 'Rays Valley', desc: 'Channeled canyon wind' },
  { id: 'strawberry-view', name: 'The View', wind: 'W/NW', direction: '260-330°', position: 'E Shore', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'Long open fetch — full exposure' },
  { id: 'strawberry-river', name: 'The River', wind: 'S/W', direction: '190-270°', position: 'SE Inlet', meter: 'UTCOP', meterName: 'Co-Op Creek', desc: 'River corridor — sheltered terrain' },
];

const SKYLINE_SPOT = { id: 'skyline-drive', name: 'Skyline Drive', wind: 'W/NW', direction: '250-340°', position: '9,680 ft', meter: 'SKY', meterName: 'Skyline UDOT', desc: 'Big Drift — open bowls, deep snow' };

const OTHER_LAKES = [
  { id: 'deer-creek', name: 'Deer Creek', region: 'Wasatch', wind: 'SW Canyon', meter: 'KHCR', meterName: 'Heber Airport' },
  { id: 'willard-bay', name: 'Willard Bay', region: 'Box Elder', wind: 'N "Gap"', meter: 'KHIF', meterName: 'Hill AFB' },
  { id: 'pineview', name: 'Pineview', region: 'Weber', wind: 'E/W Canyon', meter: null, meterName: null },
];

function isDirectionFavorable(dir, lakeId) {
  const cfg = LAKE_CONFIGS[lakeId];
  if (!cfg?.thermal?.optimalDirection || dir == null) return false;
  const { min, max } = cfg.thermal.optimalDirection;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

function isNorthFlow(dir, lakeId) {
  const cfg = LAKE_CONFIGS[lakeId];
  if (!cfg?.thermal?.northFlow || dir == null) return false;
  const { min, max } = cfg.thermal.northFlow;
  return dir >= min || dir <= max;
}

// Find a station reading by ID from the cached station map
function findStation(stationCache, meterId) {
  if (!stationCache || !meterId) return null;
  // PWS special case
  if (meterId === 'PWS') return stationCache['PWS'] || null;
  return stationCache[meterId] || null;
}

function getWindStatus(launch, stationCache, activity) {
  const meterId = launch.meter;
  const station = findStation(stationCache, meterId);
  if (!station) return null;

  const speed = station.speed ?? station.windSpeed ?? 0;
  const dir = station.direction ?? station.windDirection;

  if (speed < 3) return { level: 'calm', speed, dir, label: `${speed.toFixed(0)} mph` };

  const favorable = isDirectionFavorable(dir, launch.id);
  const north = isNorthFlow(dir, launch.id);
  const wantsWind = !['boating', 'paddling', 'fishing'].includes(activity);

  if (wantsWind) {
    if ((favorable || north) && speed >= 8)
      return { level: 'hot', speed, dir, label: `${speed.toFixed(0)} mph` };
    if ((favorable || north) && speed >= 5)
      return { level: 'building', speed, dir, label: `${speed.toFixed(0)} mph` };
    if (speed >= 8)
      return { level: 'windy', speed, dir, label: `${speed.toFixed(0)} mph` };
  } else {
    if (speed < 5)
      return { level: 'glass', speed, dir, label: 'Glass' };
    if (speed >= 15)
      return { level: 'choppy', speed, dir, label: `${speed.toFixed(0)} mph` };
  }
  return { level: 'light', speed, dir, label: `${speed.toFixed(0)} mph` };
}

// Merge incoming station readings into a persistent cache keyed by station ID
function mergeStationCache(cache, readings) {
  if (!readings?.length) return cache;
  const next = { ...cache };
  for (const s of readings) {
    if (s.id) next[s.id] = s;
  }
  return next;
}

function WindBadge({ status, isDark }) {
  if (!status) return null;
  const isHot = status.level === 'hot';
  const isBuilding = status.level === 'building';
  const isGlass = status.level === 'glass';

  if (status.level === 'calm' || status.level === 'light') return null;

  const colors = isHot
    ? 'bg-green-500 text-white'
    : isBuilding
      ? (isDark ? 'bg-yellow-500/80 text-white' : 'bg-yellow-400 text-yellow-900')
      : isGlass
        ? 'bg-blue-500 text-white'
        : (isDark ? 'bg-orange-500/80 text-white' : 'bg-orange-400 text-white');

  return (
    <span className={`
      inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
      ${colors}
      ${isHot ? 'animate-pulse' : ''}
    `}>
      <Wind className="w-2.5 h-2.5" />
      {status.label}
    </span>
  );
}

export function LakeSelector({ selectedLake, onSelectLake, stationReadings, activity }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [utahLakeExpanded, setUtahLakeExpanded] = useState(
    selectedLake?.startsWith('utah-lake')
  );
  const [snowExpanded, setSnowExpanded] = useState(
    selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive'
  );

  // Persistent station cache — survives tab switches
  const cacheRef = useRef({});
  useEffect(() => {
    cacheRef.current = mergeStationCache(cacheRef.current, stationReadings);
  }, [stationReadings]);

  const stationCache = useMemo(
    () => mergeStationCache(cacheRef.current, stationReadings),
    [stationReadings]
  );

  const windStatuses = useMemo(() => {
    const out = {};
    [...UTAH_LAKE_LAUNCHES, ...STRAWBERRY_LAUNCHES, SKYLINE_SPOT, ...OTHER_LAKES].forEach(loc => {
      out[loc.id] = getWindStatus(loc, stationCache, activity);
    });
    return out;
  }, [stationCache, activity]);

  const isUtahLakeSelected = selectedLake?.startsWith('utah-lake');
  const selectedUtahLaunch = UTAH_LAKE_LAUNCHES.find(l => l.id === selectedLake);
  const anyUtahHot = UTAH_LAKE_LAUNCHES.some(l => windStatuses[l.id]?.level === 'hot');

  const isSnowSelected = selectedLake?.startsWith('strawberry') || selectedLake === 'skyline-drive';
  const selectedSnowLaunch = [...STRAWBERRY_LAUNCHES, SKYLINE_SPOT].find(l => l.id === selectedLake);
  const anySnowHot = [...STRAWBERRY_LAUNCHES, SKYLINE_SPOT].some(l => windStatuses[l.id]?.level === 'hot');

  return (
    <div className="space-y-3">
      {/* Utah Lake Section */}
      {activity !== 'snowkiting' && (
        <div className={`card !p-0 overflow-hidden ${
          anyUtahHot && !isUtahLakeSelected
            ? (isDark ? '!border-emerald-500/30' : '!border-emerald-300')
            : ''
        }`}>
          <button
          onClick={() => setUtahLakeExpanded(!utahLakeExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
            isUtahLakeSelected 
              ? (isDark ? 'bg-sky-500/[0.06]' : 'bg-sky-50/50') 
              : 'hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <MapPin className={`w-4 h-4 ${isUtahLakeSelected ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`} />
            <div className="text-left">
              <span className={`font-semibold text-sm ${isUtahLakeSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                Utah Lake
              </span>
              {selectedUtahLaunch && (
                <span className="ml-2 text-sky-500">· {selectedUtahLaunch.name}</span>
              )}
              <div className="text-[11px] text-[var(--text-tertiary)]">5 launch locations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anyUtahHot && (
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
            )}
            {utahLakeExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>
        
        {utahLakeExpanded && (
          <div className={`border-t p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
            {UTAH_LAKE_LAUNCHES.map((launch) => {
              const ws = windStatuses[launch.id];
              const isHot = ws?.level === 'hot';
              const isSelected = selectedLake === launch.id;

              return (
                <button
                  key={launch.id}
                  onClick={() => onSelectLake(launch.id)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group border
                    ${isSelected
                      ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                      : isHot
                        ? (isDark
                            ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300')
                        : (isDark 
                            ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                    }
                  `}
                >
                  <span className="data-label mb-1">{launch.position}</span>
                  <span className="font-semibold text-sm text-center leading-tight text-[var(--text-primary)]">{launch.name}</span>
                  <span className="text-[11px] mt-1.5 font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                    <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                  </span>
                  {launch.meterName && (
                    <span className="data-label mt-1 opacity-50">
                      {launch.meterName}
                    </span>
                  )}
                  {ws && <div className="mt-2"><WindBadge status={ws} isDark={isDark} /></div>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ─── SNOWKITE SECTION ─── */}
      {(activity === 'snowkiting' || isSnowSelected) && (
      <div className={`card !p-0 overflow-hidden ${
        anySnowHot ? (isDark ? '!border-sky-500/30' : '!border-sky-300') : ''
      }`}>
        <button
          onClick={() => setSnowExpanded(!snowExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
            isSnowSelected
              ? (isDark ? 'bg-sky-500/[0.06]' : 'bg-sky-50/50')
              : 'hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Snowflake className={`w-4 h-4 ${isSnowSelected ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`} />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${isSnowSelected ? 'text-sky-500' : 'text-[var(--text-primary)]'}`}>
                  Snowkite Utah
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-500">
                  Snow Only
                </span>
              </div>
              {selectedSnowLaunch && (
                <span className="text-sm text-sky-500">· {selectedSnowLaunch.name}</span>
              )}
              <div className="text-[11px] text-[var(--text-tertiary)]">Strawberry Reservoir · Skyline Drive · 7,600–9,680 ft</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anySnowHot && (
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Live</span>
            )}
            {snowExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </div>
        </button>

        {snowExpanded && (
          <div className={`border-t ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="data-label">Strawberry Reservoir</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">· 7,600 ft · 5 spots</span>
            </div>
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {STRAWBERRY_LAUNCHES.map((launch) => {
                const ws = windStatuses[launch.id];
                const isHot = ws?.level === 'hot';
                const isSelected = selectedLake === launch.id;

                return (
                  <button
                    key={launch.id}
                    onClick={() => onSelectLake(launch.id)}
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group border
                      ${isSelected
                        ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                        : isHot
                          ? (isDark
                              ? 'bg-sky-500/[0.06] border-sky-500/30 text-sky-400 hover:border-sky-500/50'
                              : 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300')
                          : (isDark
                              ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                      }
                    `}
                  >
                    <span className="data-label mb-1">{launch.position}</span>
                    <span className="font-semibold text-sm text-center leading-tight text-[var(--text-primary)]">{launch.name}</span>
                    <span className="text-[11px] mt-1.5 font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                      <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                    </span>
                    {launch.desc && (
                      <span className="text-[9px] mt-1 text-[var(--text-tertiary)] text-center leading-tight line-clamp-1">
                        {launch.desc}
                      </span>
                    )}
                    {ws && <div className="mt-2"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>

            <div className={`px-4 pt-2 pb-1 flex items-center gap-2 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-slate-100'}`}>
              <Mountain className="w-3.5 h-3.5 text-sky-500" />
              <span className="data-label">Skyline Drive</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">· Sanpete County · 9,680 ft</span>
            </div>
            <div className="px-4 pb-4">
              {(() => {
                const ws = windStatuses[SKYLINE_SPOT.id];
                const isHot = ws?.level === 'hot';
                const isSelected = selectedLake === SKYLINE_SPOT.id;

                return (
                  <button
                    onClick={() => onSelectLake(SKYLINE_SPOT.id)}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-lg transition-all duration-200 group border
                      ${isSelected
                        ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                        : isHot
                          ? (isDark
                              ? 'bg-sky-500/[0.06] border-sky-500/30 text-sky-400 hover:border-sky-500/50'
                              : 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300')
                          : (isDark
                              ? 'bg-white/[0.02] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                      }
                    `}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base text-[var(--text-primary)]">Big Drift Complex</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-500/10 text-sky-500">
                          {SKYLINE_SPOT.position}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium flex items-center gap-1 text-[var(--text-tertiary)]">
                        <Wind className="w-3 h-3" /> {SKYLINE_SPOT.wind} {SKYLINE_SPOT.direction}
                        <span className="opacity-40 mx-1">·</span> 
                        <span>{SKYLINE_SPOT.desc}</span>
                      </span>
                    </div>
                    {ws && <div className="shrink-0"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Other Lakes */}
      {activity !== 'snowkiting' && (
      <div className="flex gap-2 flex-wrap">
        {OTHER_LAKES.map((lake) => {
          const ws = windStatuses[lake.id];
          const isHot = ws?.level === 'hot';
          const isSelected = selectedLake === lake.id;

          return (
            <button
              key={lake.id}
              onClick={() => {
                onSelectLake(lake.id);
                setUtahLakeExpanded(false);
              }}
              className={`
                flex flex-col items-start px-3.5 py-2.5 rounded-lg transition-all duration-200 border
                ${isSelected
                  ? 'bg-sky-500/[0.08] border-sky-500 text-sky-500'
                  : isHot
                    ? (isDark
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-400'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                    : (isDark 
                        ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-sky-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300')
                }
              `}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 opacity-60" />
                <span className="font-semibold text-sm">{lake.name}</span>
                {ws && <WindBadge status={ws} isDark={isDark} />}
              </div>
              <span className="text-[11px] ml-5.5 text-[var(--text-tertiary)]">{lake.wind}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

export { UTAH_LAKE_LAUNCHES, STRAWBERRY_LAUNCHES, SKYLINE_SPOT, OTHER_LAKES };
