import { useState } from 'react';
import { Wind, Sailboat, Ship, Waves, Mountain, Fish, Anchor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const WindsurferIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 2C17.5 9 18.5 15 18.5 17.5L11 17.5Z"/>
    <path d="M11 5C7 10 6.5 15 6.5 17.5L11 17.5Z" opacity="0.6"/>
    <circle cx="8.2" cy="15" r="1"/>
    <path d="M8 16L6.8 18.5L11 18.5L9.2 16.2Z"/>
    <rect x="4" y="19" width="16" height="2" rx="1"/>
  </svg>
);

const SPORT_OPTIONS = [
  { id: 'kiting', name: 'Kiteboarding', desc: 'Kiting & foiling on the lake', icon: <Wind className="w-8 h-8" />, color: 'sky' },
  { id: 'paragliding', name: 'Paragliding', desc: 'Ridge soaring & thermals', icon: <Anchor className="w-8 h-8" />, color: 'purple' },
  { id: 'sailing', name: 'Sailing', desc: 'Dinghy & keelboat racing', icon: <Sailboat className="w-8 h-8" />, color: 'blue' },
  { id: 'windsurfing', name: 'Windsurfing', desc: 'Windsurfing & winging', icon: <WindsurferIcon className="w-8 h-8" />, color: 'teal' },
  { id: 'snowkiting', name: 'Snowkiting', desc: 'Snow sessions at elevation', icon: <Mountain className="w-8 h-8" />, color: 'cyan' },
  { id: 'fishing', name: 'Fishing', desc: 'Lakes & rivers', icon: <Fish className="w-8 h-8" />, color: 'green' },
  { id: 'boating', name: 'Boating', desc: 'Powerboats & cruising', icon: <Ship className="w-8 h-8" />, color: 'indigo' },
  { id: 'paddling', name: 'Paddling', desc: 'SUP, kayak, canoe', icon: <Waves className="w-8 h-8" />, color: 'emerald' },
];

const SPOT_OPTIONS = {
  kiting: [
    { id: 'utah-lake-zigzag', name: 'Zig Zag', desc: 'Most popular — SE thermal' },
    { id: 'utah-lake-lincoln', name: 'Lincoln Beach', desc: 'South shore thermal' },
    { id: 'utah-lake-vineyard', name: 'Vineyard', desc: 'West wind access' },
    { id: 'rush-lake', name: 'Rush Lake', desc: 'Storm-front driven' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Canyon thermal kiting' },
  ],
  paragliding: [
    { id: 'potm-south', name: 'PotM South', desc: 'Training hill — south flow' },
    { id: 'potm-north', name: 'PotM North', desc: 'Ridge soaring — north flow' },
    { id: 'inspo', name: 'Inspiration Point', desc: 'Mountain thermals — P3+' },
  ],
  sailing: [
    { id: 'utah-lake-zigzag', name: 'Utah Lake', desc: 'Thermal winds — largest lake' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Canyon breeze' },
    { id: 'willard-bay', name: 'Willard Bay', desc: 'South flow' },
  ],
  windsurfing: [
    { id: 'utah-lake-zigzag', name: 'Zig Zag', desc: 'Best wind — SE thermal' },
    { id: 'utah-lake-lincoln', name: 'Lincoln Beach', desc: 'South shore' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Canyon wind' },
  ],
  snowkiting: [
    { id: 'strawberry-ladders', name: 'Strawberry Ladders', desc: 'Primary launch — shallow, flat' },
    { id: 'skyline-drive', name: 'Skyline Drive', desc: 'Big Drift — open bowls' },
    { id: 'strawberry-bay', name: 'Strawberry Bay', desc: 'Marina area' },
  ],
  fishing: [
    { id: 'strawberry-bay', name: 'Strawberry', desc: 'Blue Ribbon — cutthroat & kokanee' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Walleye & smallmouth' },
    { id: 'flaming-gorge', name: 'Flaming Gorge', desc: 'Trophy lake trout' },
    { id: 'utah-lake-lincoln', name: 'Utah Lake', desc: 'White bass & walleye' },
  ],
  boating: [
    { id: 'utah-lake-zigzag', name: 'Utah Lake', desc: 'Largest freshwater lake' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Canyon reservoir' },
    { id: 'jordanelle', name: 'Jordanelle', desc: 'Wasatch Back' },
    { id: 'willard-bay', name: 'Willard Bay', desc: 'Box Elder marina' },
  ],
  paddling: [
    { id: 'utah-lake-zigzag', name: 'Utah Lake', desc: 'Glass mornings' },
    { id: 'deer-creek', name: 'Deer Creek', desc: 'Mountain scenery' },
    { id: 'jordanelle', name: 'Jordanelle', desc: 'Clear water SUP' },
    { id: 'pineview', name: 'Pineview', desc: 'Ogden Valley gem' },
  ],
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState(null);
  const [spot, setSpot] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSportSelect = (id) => {
    setSport(id);
    setSpot(null);
    setStep(2);
  };

  const handleSpotSelect = (id) => {
    setSpot(id);
  };

  const handleFinish = () => {
    if (sport) {
      localStorage.setItem('uwf_default_sport', sport);
      if (spot) localStorage.setItem('uwf_default_spot', spot);
      localStorage.setItem('uwf_onboarded', 'true');
      onComplete(sport, spot);
    }
  };

  const spots = sport ? (SPOT_OPTIONS[sport] || []) : [];

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-sky-500 mb-2">UtahWindFinder</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            AI-powered forecasting for every outdoor sport
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 1 ? 'bg-sky-500 w-6' : isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 2 ? 'bg-sky-500 w-6' : isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h2 className={`text-xl font-bold text-center mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              What's your sport?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {SPORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSportSelect(opt.id)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${sport === opt.id
                      ? 'border-sky-500 bg-sky-500/10 scale-[1.02]'
                      : isDark
                        ? 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className={sport === opt.id ? 'text-sky-500' : isDark ? 'text-slate-400' : 'text-slate-500'}>
                    {opt.icon}
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{opt.name}</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep(1)}
                className={`text-sm font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                &larr; Back
              </button>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Your home spot?
              </h2>
              <div className="w-12" />
            </div>
            <div className="space-y-2">
              {spots.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSpotSelect(s.id)}
                  className={`
                    w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                    ${spot === s.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : isDark
                        ? 'border-slate-800 bg-slate-900 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    spot === s.id ? 'bg-sky-500 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Wind className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.desc}</div>
                  </div>
                  {spot === s.id && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={!spot}
              className={`
                w-full mt-6 py-3.5 rounded-xl text-sm font-bold transition-all
                ${spot
                  ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/25 hover:scale-[1.02] active:scale-[0.98]'
                  : isDark ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {spot ? "Let's go!" : 'Pick your spot'}
            </button>

            <button
              onClick={() => { localStorage.setItem('uwf_onboarded', 'true'); onComplete(sport, null); }}
              className={`w-full py-2 text-xs font-medium ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Skip — I'll explore on my own
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
