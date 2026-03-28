import { useState, useMemo, Suspense, lazy } from 'react';
import { Fish, Ship, Waves } from 'lucide-react';
import { ErrorBoundary } from '@utahwind/ui';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useWeatherData, calculateCorrelatedWind } from '@utahwind/weather';
import { predictGlass } from './services/BoatingPredictor';

const FishingMode = lazy(() => import('./components/FishingMode'));
const FlatwaterTemplate = lazy(() => import('./components/FlatwaterTemplate'));

const WATER_ACTIVITIES = [
  { id: 'fishing', name: 'Fishing', icon: Fish, color: 'emerald' },
  { id: 'boating', name: 'Boating', icon: Ship, color: 'blue' },
  { id: 'paddling', name: 'Paddling', icon: Waves, color: 'cyan' },
];

const DEFAULT_LAKE = 'utah-lake';

function WaterApp() {
  const { theme } = useTheme();
  const [selectedActivity, setSelectedActivity] = useState('fishing');
  const isFishing = selectedActivity === 'fishing';

  const { lakeState, history, isLoading } = useWeatherData(DEFAULT_LAKE);

  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;

  const pressureData = useMemo(() => lakeState?.pressure ? {
    gradient: lakeState.pressure.gradient,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null, [lakeState?.pressure]);

  const boatingPrediction = useMemo(() => {
    try {
      return predictGlass(
        { speed: currentWindSpeed, gust: currentWindGust },
        { slcPressure: pressureData?.slcPressure, provoPressure: pressureData?.provoPressure, gradient: pressureData?.gradient },
        selectedActivity,
      );
    } catch (_e) { return null; }
  }, [currentWindSpeed, currentWindGust, pressureData, selectedActivity]);

  const upstreamData = useMemo(() => ({
    kslcSpeed: lakeState?.kslcStation?.speed,
    kslcDirection: lakeState?.kslcStation?.direction,
    kpvuSpeed: lakeState?.kpvuStation?.speed,
    kpvuDirection: lakeState?.kpvuStation?.direction,
  }), [lakeState?.kslcStation, lakeState?.kpvuStation]);

  const mesoData = useMemo(() => {
    if (!lakeState) return {};
    const data = { stations: lakeState.wind?.stations || [] };
    if (lakeState.kslcStation) data.KSLC = lakeState.kslcStation;
    if (lakeState.kpvuStation) data.KPVU = lakeState.kpvuStation;
    if (lakeState.earlyIndicator) data.QSF = lakeState.earlyIndicator;
    return data;
  }, [lakeState]);

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
            windData={{ stations: lakeState?.wind?.stations || [], speed: currentWindSpeed }}
            pressureData={pressureData}
            isLoading={isLoading}
            upstreamData={upstreamData}
          />
        ) : (
          <FlatwaterTemplate
            selectedActivity={selectedActivity}
            selectedLake={DEFAULT_LAKE}
            activityConfig={{ name: selectedActivity === 'boating' ? 'Boating' : 'Paddling' }}
            theme={theme}
            currentWindSpeed={currentWindSpeed}
            currentWindGust={currentWindGust}
            currentWindDirection={currentWindDirection}
            effectiveDecision={{ windSpeed: currentWindSpeed, windGust: currentWindGust, windDirection: currentWindDirection }}
            lakeState={lakeState}
            effectiveBoatingPrediction={boatingPrediction}
            effectiveActivityScore={boatingPrediction ? { score: boatingPrediction.probability, message: boatingPrediction.verdict } : null}
            effectiveBriefing={null}
            pressureData={pressureData}
            upstreamData={upstreamData}
            mesoData={mesoData}
            history={history}
            isLoading={isLoading}
          />
        )}
      </Suspense>
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
