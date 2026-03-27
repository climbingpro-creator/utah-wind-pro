import { useState, Suspense, lazy } from 'react';
import { Fish, Ship, Waves } from 'lucide-react';
import { ErrorBoundary } from '@utahwind/ui';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const FishingMode = lazy(() => import('./components/FishingMode'));
const FlatwaterTemplate = lazy(() => import('./components/FlatwaterTemplate'));

const WATER_ACTIVITIES = [
  { id: 'fishing', name: 'Fishing', icon: Fish, color: 'emerald' },
  { id: 'boating', name: 'Boating', icon: Ship, color: 'blue' },
  { id: 'paddling', name: 'Paddling', icon: Waves, color: 'cyan' },
];

function WaterApp() {
  const { theme } = useTheme();
  const [selectedActivity, setSelectedActivity] = useState('fishing');
  const isFishing = selectedActivity === 'fishing';

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Utah Water &amp; Glass
        </h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Fishing, boating &amp; paddling conditions
        </p>
      </div>

      {/* Activity Tabs */}
      <div className="flex gap-2 justify-center">
        {WATER_ACTIVITIES.map((act) => {
          const Icon = act.icon;
          const isActive = selectedActivity === act.id;
          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? `bg-${act.color}-500/15 text-${act.color}-400 border border-${act.color}-500/30`
                  : 'bg-white/[0.03] text-[var(--text-tertiary)] border border-transparent hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {act.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Suspense fallback={
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-32" />)}
        </div>
      }>
        {isFishing ? (
          <FishingMode
            windData={{ stations: [], speed: null }}
            pressureData={null}
            isLoading={false}
            upstreamData={{}}
          />
        ) : (
          <FlatwaterTemplate
            selectedActivity={selectedActivity}
            selectedLake={null}
            activityConfig={{ name: selectedActivity === 'boating' ? 'Boating' : 'Paddling' }}
            theme={theme}
            currentWindSpeed={null}
            currentWindGust={null}
            currentWindDirection={null}
            effectiveDecision={{}}
            lakeState={null}
            effectiveBoatingPrediction={null}
            effectiveActivityScore={null}
            effectiveBriefing={null}
            pressureData={null}
            isLoading={false}
          />
        )}
      </Suspense>

      {/* Status Footer */}
      <div className="text-center space-y-2 pt-4 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-medium text-amber-400">
            Weather data pending @utahwind/weather package
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Domain logic is live — USGS water temps, fly/lure recommenders, fishing predictor.
          <br />Live weather feed requires extracting WeatherService into a shared package.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary name="Utah Water">
      <ThemeProvider>
        <WaterApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
