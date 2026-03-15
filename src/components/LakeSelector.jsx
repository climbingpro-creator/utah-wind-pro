import { MapPin, ChevronDown, ChevronUp, Wind } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LAKE_CONFIGS } from '../config/lakeStations';
import { LOCATION_STATIONS } from '../services/WindFieldEngine';

const UTAH_LAKE_LAUNCHES = [
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', wind: 'SE', direction: '135-165°', icon: '↖', position: 'South', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', wind: 'SE', direction: '130-160°', icon: '↖', position: 'S-Central', meter: 'KPVU', meterName: 'Provo Airport' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', wind: 'S/SSW/W', direction: '180-270°', icon: '↙', position: 'Central', meter: 'FPS', meterName: 'Flight Park S' },
  { id: 'utah-lake-zigzag', name: 'Zig Zag', wind: 'SE', direction: '135-165°', icon: '↖', position: 'N-Central', meter: 'FPS', meterName: 'Flight Park S' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', wind: 'SE/E', direction: '120-160°', icon: '↖', position: 'North', meter: 'QSF', meterName: 'Spanish Fork' },
];

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

function getWindStatus(lakeId, stationReadings, activity) {
  if (!stationReadings?.length) return null;

  const loc = LOCATION_STATIONS[lakeId];
  const primaryId = loc?.primary;
  if (!primaryId) return null;

  const station = stationReadings.find(s => s.id === primaryId);
  if (!station) return null;

  const speed = station.speed ?? station.windSpeed ?? 0;
  const dir = station.direction ?? station.windDirection;
  const gust = station.gust ?? station.windGust ?? speed;

  if (speed < 3) return { level: 'calm', speed, dir, label: `${speed.toFixed(0)} mph` };

  const favorable = isDirectionFavorable(dir, lakeId);
  const north = isNorthFlow(dir, lakeId);
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

  const windStatuses = useMemo(() => {
    const out = {};
    [...UTAH_LAKE_LAUNCHES, ...OTHER_LAKES].forEach(loc => {
      out[loc.id] = getWindStatus(loc.id, stationReadings, activity);
    });
    return out;
  }, [stationReadings, activity]);

  const isUtahLakeSelected = selectedLake?.startsWith('utah-lake');
  const selectedUtahLaunch = UTAH_LAKE_LAUNCHES.find(l => l.id === selectedLake);
  const anyUtahHot = UTAH_LAKE_LAUNCHES.some(l => windStatuses[l.id]?.level === 'hot');

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
          <div className={`border-t p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {UTAH_LAKE_LAUNCHES.map((launch) => {
              const ws = windStatuses[launch.id];
              const isHot = ws?.level === 'hot';
              const isSelected = selectedLake === launch.id;

              return (
                <button
                  key={launch.id}
                  onClick={() => onSelectLake(launch.id)}
                  className={`
                    flex flex-col items-center p-3 rounded-lg transition-all duration-300 relative
                    ${isSelected
                      ? (isDark 
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 border-2' 
                          : 'bg-cyan-100 border-cyan-500 text-cyan-700 border-2')
                      : isHot
                        ? (isDark
                            ? 'bg-green-500/15 border-green-500/60 text-green-300 border-2 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                            : 'bg-green-50 border-green-500 text-green-700 border-2 shadow-[0_0_12px_rgba(34,197,94,0.2)]')
                        : (isDark 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-400 border hover:border-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-600 border hover:border-slate-400')
                    }
                  `}
                >
                  <span className={`text-[10px] mb-1 ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>{launch.position}</span>
                  <span className="font-medium text-sm">{launch.name}</span>
                  <span className={`text-xs mt-1 ${isSelected ? (isDark ? 'text-cyan-300' : 'text-cyan-600') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                    {launch.wind} {launch.direction}
                  </span>
                  {launch.meterName && (
                    <span className={`text-[9px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      {launch.meterName}
                    </span>
                  )}
                  {ws && <div className="mt-1"><WindBadge status={ws} isDark={isDark} /></div>}
                </button>
              );
            })}
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

export { UTAH_LAKE_LAUNCHES, OTHER_LAKES };
