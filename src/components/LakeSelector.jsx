import { MapPin, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const UTAH_LAKE_LAUNCHES = [
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', wind: 'SE', direction: '135-165°', icon: '↖', position: 'South' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', wind: 'SE', direction: '130-160°', icon: '↖', position: 'S-Central' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', wind: 'S/SSW/W', direction: '180-270°', icon: '↙', position: 'Central' },
  { id: 'utah-lake-zigzag', name: 'Zig Zag', wind: 'SE', direction: '135-165°', icon: '↖', position: 'N-Central' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', wind: 'SE/E', direction: '120-160°', icon: '↖', position: 'North' },
];

const OTHER_LAKES = [
  { id: 'deer-creek', name: 'Deer Creek', region: 'Wasatch', wind: 'SW Canyon' },
  { id: 'willard-bay', name: 'Willard Bay', region: 'Box Elder', wind: 'N "Gap"' },
  { id: 'pineview', name: 'Pineview', region: 'Weber', wind: 'E/W Canyon' },
];

export function LakeSelector({ selectedLake, onSelectLake }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [utahLakeExpanded, setUtahLakeExpanded] = useState(
    selectedLake?.startsWith('utah-lake')
  );
  
  const isUtahLakeSelected = selectedLake?.startsWith('utah-lake');
  const selectedUtahLaunch = UTAH_LAKE_LAUNCHES.find(l => l.id === selectedLake);

  return (
    <div className="space-y-3">
      {/* Utah Lake Section */}
      <div className={`rounded-xl border overflow-hidden ${
        isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
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
          {utahLakeExpanded ? (
            <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          )}
        </button>
        
        {utahLakeExpanded && (
          <div className={`border-t p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {UTAH_LAKE_LAUNCHES.map((launch) => (
              <button
                key={launch.id}
                onClick={() => onSelectLake(launch.id)}
                className={`
                  flex flex-col items-center p-3 rounded-lg transition-all duration-200
                  ${selectedLake === launch.id
                    ? (isDark 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 border-2' 
                        : 'bg-cyan-100 border-cyan-500 text-cyan-700 border-2')
                    : (isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-400 border hover:border-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 border hover:border-slate-400')
                  }
                `}
              >
                <span className={`text-[10px] mb-1 ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>{launch.position}</span>
                <span className="font-medium text-sm">{launch.name}</span>
                <span className={`text-xs mt-1 ${selectedLake === launch.id ? (isDark ? 'text-cyan-300' : 'text-cyan-600') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                  {launch.wind} {launch.direction}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Other Lakes */}
      <div className="flex gap-2 flex-wrap">
        {OTHER_LAKES.map((lake) => (
          <button
            key={lake.id}
            onClick={() => {
              onSelectLake(lake.id);
              setUtahLakeExpanded(false);
            }}
            className={`
              flex flex-col items-start px-4 py-2 rounded-lg transition-all duration-200
              ${selectedLake === lake.id
                ? (isDark 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 border' 
                    : 'bg-cyan-100 border-cyan-500 text-cyan-700 border')
                : (isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-400 border hover:border-slate-600'
                    : 'bg-white border-slate-200 text-slate-600 border hover:border-slate-400 shadow-sm')
              }
            `}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{lake.name}</span>
            </div>
            <span className={`text-xs ml-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{lake.wind}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { UTAH_LAKE_LAUNCHES, OTHER_LAKES };
