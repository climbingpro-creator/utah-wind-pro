/**
 * Engine Test Harness
 * 
 * Tests the complete intelligence pipeline:
 * Coordinates -> Weather (Open-Meteo/NWS) -> Tactical Engine -> Gemini -> UI
 * 
 * Access via: /#test-engine
 */

import { useState, useCallback } from 'react';
import { Fish, Waves, Ship, MapPin, RefreshCw, ArrowLeft, Zap, Cloud, Sun, Thermometer, Wind, Droplets } from 'lucide-react';
import { generateFisheryProfile } from '@utahwind/weather';
import SyntheticFishingCard from '../components/map/SyntheticFishingCard';

const TEST_SCENARIOS = [
  {
    id: 'provo-river',
    name: 'Provo River, UT',
    description: 'Local trout stream — should trigger BWO/PMD logic',
    icon: Fish,
    lat: 40.35,
    lng: -111.55,
    type: 'river',
    elevation: 5500,
    color: 'emerald',
  },
  {
    id: 'lake-fork',
    name: 'Lake Fork, TX',
    description: 'Warmwater bass lake — should trigger bass tactics',
    icon: Waves,
    lat: 32.79,
    lng: -95.53,
    type: 'lake',
    elevation: 400,
    color: 'amber',
  },
  {
    id: 'tampa-bay',
    name: 'Tampa Bay, FL',
    description: 'Saltwater/Ocean — should trigger marine species',
    icon: Ship,
    lat: 27.76,
    lng: -82.54,
    type: 'ocean',
    elevation: 0,
    color: 'blue',
  },
  {
    id: 'yellowstone-river',
    name: 'Yellowstone River, MT',
    description: 'Famous trout river — should trigger PMD/caddis',
    icon: Fish,
    lat: 45.63,
    lng: -110.56,
    type: 'river',
    elevation: 5200,
    color: 'cyan',
  },
  {
    id: 'lake-michigan',
    name: 'Lake Michigan, IL',
    description: 'Great Lakes — freshwater but large body',
    icon: Waves,
    lat: 41.88,
    lng: -87.62,
    type: 'lake',
    elevation: 580,
    color: 'indigo',
  },
  {
    id: 'amazon-river',
    name: 'Amazon River, Brazil',
    description: 'International — tests Open-Meteo global fallback',
    icon: Waves,
    lat: -3.13,
    lng: -60.02,
    type: 'river',
    elevation: 100,
    color: 'lime',
  },
];

function WeatherDebugPanel({ weather }) {
  if (!weather) return null;
  
  return (
    <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <Cloud className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Raw Weather Data</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-sky-400" />
          <span className="text-slate-300">{weather.windSpeed ?? '--'} mph</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3 h-3 text-orange-400" />
          <span className="text-slate-300">{weather.temperature ?? '--'}°F</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3 h-3 text-slate-400" />
          <span className="text-slate-300">{weather.cloudCover ?? '--'}% cloud</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-blue-400" />
          <span className="text-slate-300">{weather.precipChance ?? '--'}% precip</span>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-500">
        Source: {weather.source || weather.dataSource || 'Unknown'} | 
        Sky: {weather.sky || 'N/A'} | 
        Forecast: {weather.shortForecast || 'N/A'}
      </div>
    </div>
  );
}

function TacticalDebugPanel({ tactical }) {
  if (!tactical) return null;
  
  return (
    <div className="mt-4 p-3 rounded-lg bg-purple-900/20 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Tactical Engine Output</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Headline:</span>
          <span className="font-bold text-purple-300">{tactical.headline}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Confidence:</span>
          <span className={`font-bold ${tactical.confidence >= 80 ? 'text-emerald-400' : tactical.confidence >= 60 ? 'text-amber-400' : 'text-slate-400'}`}>
            {tactical.confidence}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Category:</span>
          <span className="text-slate-300">{tactical.category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Time Window:</span>
          <span className="text-slate-300">{tactical.timeWindow}</span>
        </div>
        {tactical.conditions && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <span className="text-slate-400 text-[10px]">Conditions:</span>
            {tactical.conditions.map((c, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 p-2 rounded bg-slate-800/50 text-[10px] text-slate-400">
        <strong>Tactic:</strong> {tactical.tactic}
      </div>
      <div className="mt-1 p-2 rounded bg-slate-800/50 text-[10px] text-slate-400">
        <strong>Reason:</strong> {tactical.reason}
      </div>
    </div>
  );
}

export default function EngineTest() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [loadTime, setLoadTime] = useState(null);

  const runTest = useCallback(async (scenario) => {
    setSelectedScenario(scenario);
    setIsLoading(true);
    setProfileData(null);
    setError(null);
    setLoadTime(null);

    const startTime = performance.now();

    try {
      console.log(`[EngineTest] Running test for: ${scenario.name}`);
      console.log(`[EngineTest] Coordinates: ${scenario.lat}, ${scenario.lng}`);
      console.log(`[EngineTest] Type: ${scenario.type}, Elevation: ${scenario.elevation}`);

      const profile = await generateFisheryProfile(
        scenario.lat,
        scenario.lng,
        scenario.elevation,
        { waterBodyType: scenario.type }
      );

      const elapsed = Math.round(performance.now() - startTime);
      setLoadTime(elapsed);

      // Inject the test scenario name as the vector feature name
      // (simulates what would come from clicking a real vector tile)
      if (profile) {
        profile.vectorFeatureName = scenario.name.split(',')[0]; // e.g., "Amazon River" from "Amazon River, Brazil"
        profile.vectorFeatureType = scenario.type;
      }

      console.log(`[EngineTest] Profile received in ${elapsed}ms:`, profile);
      setProfileData(profile);
    } catch (err) {
      console.error(`[EngineTest] Error:`, err);
      setError(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    window.location.hash = '';
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Intelligence Engine Test Harness
              </h1>
              <p className="text-xs text-slate-500">
                Test: Coordinates → Weather → Tactical Engine → Gemini → UI
              </p>
            </div>
          </div>
          {loadTime && (
            <div className="text-xs text-slate-400">
              Last load: <span className="font-mono text-emerald-400">{loadTime}ms</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Test Scenario Buttons */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            Select Test Scenario
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEST_SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isSelected = selectedScenario?.id === scenario.id;
              const colorClasses = {
                emerald: 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/5',
                amber: 'border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5',
                blue: 'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5',
                cyan: 'border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-500/5',
                indigo: 'border-indigo-500/30 hover:border-indigo-500/50 bg-indigo-500/5',
                lime: 'border-lime-500/30 hover:border-lime-500/50 bg-lime-500/5',
              };
              const iconColors = {
                emerald: 'text-emerald-400',
                amber: 'text-amber-400',
                blue: 'text-blue-400',
                cyan: 'text-cyan-400',
                indigo: 'text-indigo-400',
                lime: 'text-lime-400',
              };

              return (
                <button
                  key={scenario.id}
                  onClick={() => runTest(scenario)}
                  disabled={isLoading}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'ring-2 ring-purple-500 border-purple-500/50 bg-purple-500/10'
                      : colorClasses[scenario.color]
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${iconColors[scenario.color]}`} />
                    <span className="font-bold text-white">{scenario.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{scenario.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <MapPin className="w-3 h-3" />
                    <span className="font-mono">{scenario.lat}, {scenario.lng}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {scenario.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">
              Fetching weather data and generating profile...
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Testing: {selectedScenario?.name}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
            <h3 className="font-bold text-red-400 mb-1">Error</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {profileData && !isLoading && (
          <div className="space-y-6">
            {/* Debug Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Weather Debug */}
              <WeatherDebugPanel weather={profileData.ambientWeather} />
              
              {/* Tactical Debug */}
              <TacticalDebugPanel tactical={profileData.tacticalSummary} />
            </div>

            {/* Fishing Quality Score */}
            {profileData.fishingQuality != null && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-300">Fishing Quality Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          profileData.fishingQuality >= 70 ? 'bg-emerald-500' :
                          profileData.fishingQuality >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${profileData.fishingQuality}%` }}
                      />
                    </div>
                    <span className={`text-lg font-black ${
                      profileData.fishingQuality >= 70 ? 'text-emerald-400' :
                      profileData.fishingQuality >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {profileData.fishingQuality}/100
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Hatch Predictions */}
            {profileData.hatchPrediction && profileData.hatchPrediction.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-3">Hatch Predictions</h3>
                <div className="space-y-2">
                  {profileData.hatchPrediction.slice(0, 4).map((hatch, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                      <div>
                        <span className="text-sm font-medium text-white">{hatch.insect}</span>
                        <span className="text-xs text-slate-500 ml-2">{hatch.peakTime}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        hatch.likelihood >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                        hatch.likelihood >= 40 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {hatch.likelihood}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* The Actual SyntheticFishingCard */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                SyntheticFishingCard Output
              </h3>
              <div className="flex justify-center">
                <SyntheticFishingCard
                  data={profileData}
                  isLoading={false}
                  onClose={() => setProfileData(null)}
                />
              </div>
            </div>

            {/* Raw JSON Debug */}
            <details className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <summary className="text-sm font-bold text-slate-400 cursor-pointer hover:text-slate-300">
                Raw Profile JSON (click to expand)
              </summary>
              <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-xs text-slate-300 overflow-x-auto max-h-96">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        {!selectedScenario && !isLoading && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-300 mb-2">
              Select a Test Scenario Above
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Each scenario will test the complete intelligence pipeline:
              weather fetching, tactical recommendation engine, Gemini biology API,
              and the SyntheticFishingCard UI rendering.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
