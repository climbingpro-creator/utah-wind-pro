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
      <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
        anyUtahHot && !isUtahLakeSelected
          ? (isDark ? 'bg-green-900/10 border-green-500/40' : 'bg-green-50 border-green-400')
          : (isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm')
      }`}>
        <button
          onClick={() => setUtahLakeExpanded(!utahLakeExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
            isUtahLakeSelected 
              ? (isDark ? 'bg-cyan-500/10' : 'bg-cyan-50') 
              : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')
          }`}
        >
          <div className="flex items-center gap-3">
            <MapPin className={`w-5 h-5 ${isUtahLakeSelected ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
            <div className="text-left">
              <span className={`font-semibold ${isUtahLakeSelected ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                Utah Lake
              </span>
              {selectedUtahLaunch && (
                <span className={`ml-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>• {selectedUtahLaunch.name}</span>
              )}
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>5 launch locations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anyUtahHot && (
              <span className="animate-pulse text-xs font-bold text-green-400">WIND ON</span>
            )}
            {utahLakeExpanded ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            )}
          </div>
        </button>
        
        {utahLakeExpanded && (
          <div className={`border-t p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
            {UTAH_LAKE_LAUNCHES.map((launch) => {
              const ws = windStatuses[launch.id];
              const isHot = ws?.level === 'hot';
              const isSelected = selectedLake === launch.id;

              return (
                <button
                  key={launch.id}
                  onClick={() => onSelectLake(launch.id)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 group
                    ${isSelected
                      ? (isDark 
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 border-2 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]' 
                          : 'bg-cyan-50 border-cyan-400 text-cyan-700 border-2 shadow-sm')
                      : isHot
                        ? (isDark
                            ? 'bg-green-500/10 border-green-500/50 text-green-300 border-2 shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)] hover:bg-green-500/20'
                            : 'bg-green-50 border-green-400 text-green-700 border-2 shadow-sm hover:bg-green-100')
                        : (isDark 
                            ? 'bg-slate-800/80 border-slate-700 text-slate-300 border hover:border-slate-500 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 border shadow-sm hover:border-slate-300 hover:bg-slate-50')
                    }
                  `}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-70`}>{launch.position}</span>
                  <span className="font-bold text-sm text-center leading-tight">{launch.name}</span>
                  <span className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${isSelected ? (isDark ? 'text-cyan-300' : 'text-cyan-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                    <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                  </span>
                  {launch.meterName && (
                    <span className={`text-[10px] mt-1 uppercase tracking-wide opacity-50`}>
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

      {/* ─── SNOWKITE SECTION ─── */}
      <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
        anySnowHot
          ? (isDark ? 'bg-gradient-to-br from-sky-900/30 via-indigo-900/20 to-slate-900/40 border-sky-400/50' : 'bg-gradient-to-br from-sky-50 via-indigo-50 to-white border-sky-400')
          : (isDark ? 'bg-gradient-to-br from-slate-800/60 via-indigo-900/10 to-slate-800/40 border-indigo-500/20' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-white border-slate-200 shadow-sm')
      }`}>
        <button
          onClick={() => setSnowExpanded(!snowExpanded)}
          className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
            isSnowSelected
              ? (isDark ? 'bg-sky-500/10' : 'bg-sky-50')
              : (isDark ? 'hover:bg-indigo-900/20' : 'hover:bg-sky-50/50')
          }`}
        >
          <div className="flex items-center gap-3">
            <Snowflake className={`w-5 h-5 ${isSnowSelected ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-indigo-400' : 'text-sky-500')}`} />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isSnowSelected ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                  Snowkite Utah
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-100 text-sky-700'
                }`}>
                  Snow Only
                </span>
              </div>
              {selectedSnowLaunch && (
                <span className={`text-sm ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>• {selectedSnowLaunch.name}</span>
              )}
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Strawberry Reservoir · Skyline Drive · 7,600–9,680 ft</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anySnowHot && (
              <span className={`animate-pulse text-xs font-bold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>WIND ON</span>
            )}
            {snowExpanded ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            )}
          </div>
        </button>

        {snowExpanded && (
          <div className={`border-t ${isDark ? 'border-indigo-500/20' : 'border-sky-200'}`}>
            {/* Strawberry Reservoir sub-header */}
            <div className={`px-4 pt-3 pb-1 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="text-xs font-bold uppercase tracking-wider">Strawberry Reservoir</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>· 7,600 ft · 5 spots</span>
            </div>
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {STRAWBERRY_LAUNCHES.map((launch) => {
                const ws = windStatuses[launch.id];
                const isHot = ws?.level === 'hot';
                const isSelected = selectedLake === launch.id;

                return (
                  <button
                    key={launch.id}
                    onClick={() => onSelectLake(launch.id)}
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 group
                      ${isSelected
                        ? (isDark
                            ? 'bg-sky-500/15 border-sky-400 text-sky-300 border-2 shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]'
                            : 'bg-sky-50 border-sky-400 text-sky-700 border-2 shadow-sm')
                        : isHot
                          ? (isDark
                              ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300 border-2 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] hover:bg-indigo-500/30'
                              : 'bg-indigo-50 border-indigo-400 text-indigo-700 border-2 shadow-sm hover:bg-indigo-100')
                          : (isDark
                              ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 border hover:border-slate-500 hover:bg-slate-800'
                              : 'bg-white/80 border-slate-200 text-slate-700 border shadow-sm hover:border-slate-300 hover:bg-white')
                      }
                    `}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-70`}>{launch.position}</span>
                    <span className="font-bold text-sm text-center leading-tight">{launch.name}</span>
                    <span className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${isSelected ? (isDark ? 'text-sky-300' : 'text-sky-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                      <Wind className="w-3 h-3" /> {launch.wind} {launch.direction}
                    </span>
                    {launch.desc && (
                      <span className={`text-[9px] mt-1 uppercase tracking-wide opacity-50 text-center leading-tight line-clamp-1`}>
                        {launch.desc}
                      </span>
                    )}
                    {ws && <div className="mt-2"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })}
            </div>

            {/* Skyline Drive sub-header */}
            <div className={`px-4 pt-2 pb-1 flex items-center gap-2 border-t ${isDark ? 'border-indigo-500/15 text-slate-400' : 'border-sky-100 text-slate-500'}`}>
              <Mountain className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-sky-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">Skyline Drive</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>· Sanpete County · 9,680 ft</span>
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
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group
                      ${isSelected
                        ? (isDark
                            ? 'bg-sky-500/15 border-sky-400 text-sky-300 border-2 shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]'
                            : 'bg-sky-50 border-sky-400 text-sky-700 border-2 shadow-sm')
                        : isHot
                          ? (isDark
                              ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300 border-2 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] hover:bg-indigo-500/30'
                              : 'bg-indigo-50 border-indigo-400 text-indigo-700 border-2 shadow-sm hover:bg-indigo-100')
                          : (isDark
                              ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 border hover:border-slate-500 hover:bg-slate-800'
                              : 'bg-white/80 border-slate-200 text-slate-700 border shadow-sm hover:border-slate-300 hover:bg-white')
                      }
                    `}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base">Big Drift Complex</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-100 text-sky-700'}`}>
                          {SKYLINE_SPOT.position}
                        </span>
                      </div>
                      <span className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Wind className="w-3 h-3" /> {SKYLINE_SPOT.wind} {SKYLINE_SPOT.direction}
                        <span className="opacity-50 mx-1">·</span> 
                        <span className="italic">{SKYLINE_SPOT.desc}</span>
                      </span>
                    </div>
                    {ws && <div className="shrink-0 scale-110"><WindBadge status={ws} isDark={isDark} /></div>}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Other Lakes */}
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
                flex flex-col items-start px-4 py-2 rounded-lg transition-all duration-300
                ${isSelected
                  ? (isDark 
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 border' 
                      : 'bg-cyan-100 border-cyan-500 text-cyan-700 border')
                  : isHot
                    ? (isDark
                        ? 'bg-green-500/15 border-green-500/60 text-green-300 border shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                        : 'bg-green-50 border-green-500 text-green-700 border shadow-[0_0_12px_rgba(34,197,94,0.2)]')
                    : (isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-400 border hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-600 border hover:border-slate-400 shadow-sm')
                }
              `}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{lake.name}</span>
                {ws && <WindBadge status={ws} isDark={isDark} />}
              </div>
              <span className={`text-xs ml-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{lake.wind}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { UTAH_LAKE_LAUNCHES, STRAWBERRY_LAUNCHES, SKYLINE_SPOT, OTHER_LAKES };
