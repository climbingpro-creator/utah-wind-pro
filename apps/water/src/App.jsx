import { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Fish, Ship, Waves, RefreshCw, Wifi, WifiOff, Sun, Moon, CheckCircle,
  Shield, Clock, Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ErrorBoundary, FeedbackWidget } from '@utahwind/ui';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useWeatherData, getHourlyForecast, findAllSportWindows } from '@utahwind/weather';
import { IntelligentRecommendations } from '@utahwind/ui';
import { predictGlass } from './services/BoatingPredictor';
import { safeToFixed } from './utils/safeToFixed';
import LocationSelector from './components/LocationSelector';

const FishingMode = lazy(() => import('./components/FishingMode'));
const FlatwaterTemplate = lazy(() => import('./components/FlatwaterTemplate'));
const WaterMap = lazy(() => import('./components/map/WaterMap'));

const WATER_ACTIVITIES = [
  { id: 'fishing', name: 'Fishing', icon: Fish, description: 'Lakes & rivers — pressure, hatches, solunar', wantsCalm: true },
  { id: 'boating', name: 'Boating', icon: Ship, description: 'Powerboats & cruising — calm water is best', wantsCalm: true },
  { id: 'paddling', name: 'Paddling', icon: Waves, description: 'SUP, kayak, canoe — glass water ideal', wantsCalm: true },
];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80&auto=format',
  'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=1200&q=80&auto=format',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWaterVerdict(activity, speed, gust) {
  const s = speed ?? 0;
  const _g = gust ?? s;
  if (activity === 'fishing') {
    if (s <= 3) return { status: 'go', label: 'GO FISH', reason: 'Calm water — fish are active', color: 'emerald' };
    if (s <= 8) return { status: 'go', label: 'GOOD', reason: `Light ripple (${Math.round(s)} mph) — great casting`, color: 'lime' };
    if (s <= 15) return { status: 'caution', label: 'MODERATE', reason: `${Math.round(s)} mph — switch to jigs or deep bait`, color: 'amber' };
    return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph — fish from shore`, color: 'red' };
  }
  if (activity === 'paddling') {
    if (s <= 2) return { status: 'go', label: 'GLASS', reason: 'Mirror-flat — perfect paddle', color: 'emerald' };
    if (s <= 6) return { status: 'go', label: 'GOOD', reason: `Light wind (${Math.round(s)} mph) — easy paddle`, color: 'lime' };
    if (s <= 10) return { status: 'caution', label: 'CHOPPY', reason: `${Math.round(s)} mph — experienced only`, color: 'amber' };
    return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph — not recommended`, color: 'red' };
  }
  // boating
  if (s <= 2) return { status: 'go', label: 'GLASS', reason: 'Perfect glass — smooth cruising', color: 'emerald' };
  if (s <= 8) return { status: 'go', label: 'GOOD', reason: `Light wind (${Math.round(s)} mph) — great conditions`, color: 'lime' };
  if (s <= 15) return { status: 'caution', label: 'CHOPPY', reason: `${Math.round(s)} mph — noticeable waves`, color: 'amber' };
  return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph — stay close to shore`, color: 'red' };
}

function getSkillRec(activity, speed) {
  const s = speed ?? 0;
  if (activity === 'paddling') {
    return {
      beginner: s <= 5 ? { label: 'GO', msg: 'Perfect for beginners', color: 'emerald' } : s <= 8 ? { label: 'CAUTION', msg: 'Stay near shore', color: 'amber' } : { label: 'NO', msg: 'Too windy', color: 'red' },
      expert: s <= 10 ? { label: 'GO', msg: s <= 3 ? 'Glass touring' : 'Light chop — fun paddle', color: 'emerald' } : s <= 15 ? { label: 'POSSIBLE', msg: 'Downwind runs only', color: 'amber' } : { label: 'NO', msg: 'Dangerous conditions', color: 'red' },
    };
  }
  if (activity === 'boating') {
    return {
      beginner: s <= 8 ? { label: 'GO', msg: 'Calm enough for everyone', color: 'emerald' } : s <= 12 ? { label: 'CAUTION', msg: 'Small boat advisory', color: 'amber' } : { label: 'NO', msg: 'Too rough', color: 'red' },
      expert: s <= 15 ? { label: 'GO', msg: s <= 5 ? 'Glass — perfect ski day' : 'Manageable chop', color: 'emerald' } : s <= 20 ? { label: 'CAUTION', msg: 'Large boats only', color: 'amber' } : { label: 'NO', msg: 'Dangerous', color: 'red' },
    };
  }
  return null;
}

function generateWaterBriefing(activity, speed, gust, pressureData, boatingPred) {
  const s = speed ?? 0;
  const hour = new Date().getHours();
  const glassEnd = boatingPred?.glassWindow?.end;
  const gradient = pressureData?.gradient ?? 0;

  let headline, body, bestAction;
  const bullets = [];

  if (s <= 3) {
    headline = activity === 'fishing' ? 'Prime fishing conditions' : 'Glass conditions — get out now';
    body = `Current wind is just ${Math.round(s)} mph. ${hour < 10 ? 'Morning calm should hold for a few hours before thermals build.' : hour > 17 ? 'Evening calm settling in nicely.' : 'Calm pocket — thermals may build by midday.'}`;
    bestAction = activity === 'fishing' ? 'Hit the water now — topwater lures will be effective' : `Best window is now${glassEnd ? ` until ~${glassEnd > 12 ? glassEnd - 12 + ' PM' : glassEnd + ' AM'}` : ''}`;
  } else if (s <= 8) {
    headline = 'Light conditions — still good';
    body = `${Math.round(s)} mph with ${gust && gust > s * 1.2 ? `gusts to ${Math.round(gust)}` : 'steady winds'}. Manageable for most activities.`;
    bestAction = activity === 'fishing' ? 'Try subsurface lures — surface bite may be off' : 'Good conditions but watch for afternoon thermals';
  } else {
    headline = 'Wind advisory — plan accordingly';
    body = `${Math.round(s)} mph winds making conditions challenging. ${hour < 17 ? 'May calm by evening.' : 'Conditions unlikely to improve tonight.'}`;
    bestAction = activity === 'fishing' ? 'Fish sheltered coves or switch to shore' : 'Wait for calmer conditions or stick to sheltered areas';
  }

  if (Math.abs(gradient) > 1.5) bullets.push({ icon: '📊', text: `Pressure gradient ${safeToFixed(Math.abs(gradient), 1)} mb — ${gradient > 0 ? 'rising' : 'falling'} trend` });
  if (glassEnd) bullets.push({ icon: '🪞', text: `Glass window predicted until ~${glassEnd > 12 ? (glassEnd - 12) + ' PM' : glassEnd + ' AM'}` });
  if (hour < 7) bullets.push({ icon: '🌅', text: 'Dawn patrol — best conditions of the day' });
  else if (hour >= 17) bullets.push({ icon: '🌇', text: 'Evening calm settling in' });

  return { headline, body, bestAction, bullets, excitement: s <= 3 ? 5 : s <= 8 ? 3 : 1 };
}

function WaterApp() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedActivity, setSelectedActivity] = useState('fishing');
  const [selectedLocation, setSelectedLocation] = useState(() =>
    localStorage.getItem('uwg_default_location') || 'strawberry'
  );
  const isFishing = selectedActivity === 'fishing';

  const handleSelectLocation = useCallback((locId) => {
    setSelectedLocation(locId);
    localStorage.setItem('uwg_default_location', locId);
  }, []);

  const { lakeState, history, isLoading, error, lastUpdated, refresh } = useWeatherData(selectedLocation);

  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;

  const pressureData = useMemo(() => lakeState?.pressure ? {
    gradient: lakeState.pressure.gradient,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
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

  const verdicts = useMemo(() =>
    WATER_ACTIVITIES.map(a => ({ ...a, verdict: getWaterVerdict(a.id, currentWindSpeed, currentWindGust) })),
    [currentWindSpeed, currentWindGust]
  );

  const selectedVerdict = verdicts.find(v => v.id === selectedActivity)?.verdict;
  const skillRec = useMemo(() => getSkillRec(selectedActivity, currentWindSpeed), [selectedActivity, currentWindSpeed]);
  const briefing = useMemo(() => generateWaterBriefing(selectedActivity, currentWindSpeed, currentWindGust, pressureData, boatingPrediction), [selectedActivity, currentWindSpeed, currentWindGust, pressureData, boatingPrediction]);

  const heroImage = useMemo(() => {
    const day = new Date().getDate();
    return HERO_IMAGES[day % HERO_IMAGES.length];
  }, []);

  const [sportWindows, setSportWindows] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function loadWindows() {
      try {
        const hourly = await getHourlyForecast(selectedLocation);
        if (!cancelled && hourly) setSportWindows(findAllSportWindows(selectedLocation, hourly));
      } catch (_e) { /* forecast unavailable */ }
    }
    loadWindows();
    return () => { cancelled = true; };
  }, [selectedLocation]);

  const dirLabel = useCallback((deg) => {
    if (deg == null) return '';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }, []);

  const formatTime = useCallback((date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  }, []);

  const STATUS_BADGE = {
    go: 'bg-emerald-500 text-white',
    caution: 'bg-amber-500/30 text-amber-300',
    off: 'bg-white/10 text-white/40',
  };

  return (
    <div className="min-h-screen">
      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ HEADER ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Utah Water & Glass
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)]">
                {error ? <WifiOff className="w-3.5 h-3.5 text-red-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
                <span>{formatTime(lastUpdated)}</span>
              </div>
              <button onClick={refresh} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* ═══════ LOCATION SELECTOR ═══════ */}
        <LocationSelector
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
        />

        {/* ═══════ HERO BANNER ═══════ */}
        <div className="hero-water">
          <img src={heroImage} alt="" loading="eager" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />

          <div className="relative z-10 p-5 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-white/50 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedVerdict?.status === 'go' ? 'bg-emerald-500' : selectedVerdict?.status === 'caution' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  {getGreeting()} — Today's Outlook
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug tracking-tight text-white">
                  {selectedVerdict?.reason || 'Loading conditions...'}
                </h2>
                <p className="text-sm mt-1.5 font-medium text-white/60">
                  {currentWindSpeed != null ? `${Math.round(currentWindSpeed)} mph` : '--'}{currentWindDirection != null ? ` ${dirLabel(currentWindDirection)}` : ''} — {selectedVerdict?.label?.toLowerCase() || 'checking'} for {WATER_ACTIVITIES.find(a => a.id === selectedActivity)?.name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="data-number text-white">
                  {currentWindSpeed != null ? Math.round(currentWindSpeed) : '--'}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mt-1 text-white/50">
                  mph{currentWindDirection != null ? ` ${dirLabel(currentWindDirection)}` : ''}
                </p>
                {currentWindGust > currentWindSpeed * 1.2 && (
                  <p className="text-xs mt-0.5 font-medium text-white/40">G{Math.round(currentWindGust)}</p>
                )}
              </div>
            </div>

            {/* Activity Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {verdicts.map((act) => {
                const isSelected = selectedActivity === act.id;
                const ActIcon = act.icon;
                const { verdict } = act;
                return (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivity(act.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/25 border-sky-400 backdrop-blur-sm ring-2 ring-sky-400/60 shadow-lg scale-[1.03]'
                        : verdict.status === 'go'
                          ? 'bg-white/15 border-emerald-400/40 backdrop-blur-sm hover:bg-white/20'
                          : verdict.status === 'caution'
                            ? 'bg-white/8 border-amber-400/30 backdrop-blur-sm hover:bg-white/12'
                            : 'bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-sky-500 text-white shadow-sm">
                        Selected
                      </span>
                    )}
                    <div className="flex items-center justify-between w-full">
                      <ActIcon className={`w-5 h-5 ${isSelected ? 'text-sky-300' : 'text-white/70'}`} />
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${STATUS_BADGE[verdict.status] || STATUS_BADGE.off}`}>
                        {verdict.label}
                      </span>
                    </div>
                    <span className={`text-sm font-bold w-full ${isSelected ? 'text-sky-300' : 'text-white'}`}>{act.name}</span>
                    <span className="text-[10px] leading-tight text-white/50 w-full line-clamp-1">{verdict.reason}</span>
                    {isSelected && <CheckCircle className="absolute top-2.5 right-2 w-3.5 h-3.5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ GO/WAIT DECISION CARD ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {!isFishing && selectedVerdict && (
          <div className={`card border-l-4 ${
            selectedVerdict.status === 'go' ? 'border-l-emerald-500' : selectedVerdict.status === 'caution' ? 'border-l-amber-500' : 'border-l-red-500'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${selectedVerdict.status === 'go' ? 'text-emerald-500' : selectedVerdict.status === 'caution' ? 'text-amber-500' : 'text-red-500'}`} />
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {selectedVerdict.label} — {currentWindSpeed != null ? `${Math.round(currentWindSpeed)} mph` : '--'}
                </span>
              </div>
              {boatingPrediction?.probability != null && (
                <div className="text-right">
                  <span className={`text-2xl font-black tabular-nums ${boatingPrediction.probability >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {boatingPrediction.probability}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block">glass</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">{selectedVerdict.reason}</p>

            {/* Skill Level Recommendations */}
            {skillRec && (
              <div className="space-y-1.5">
                {[
                  { level: 'Beginner', rec: skillRec.beginner },
                  { level: 'Experienced', rec: skillRec.expert },
                ].map(({ level, rec }) => (
                  <div key={level} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    rec.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    rec.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-red-500/10 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        rec.color === 'emerald' ? 'text-emerald-500' : rec.color === 'amber' ? 'text-amber-500' : 'text-red-500'
                      }`}>{level}</span>
                      <span className={`text-xs font-bold ${
                        rec.color === 'emerald' ? 'text-emerald-400' : rec.color === 'amber' ? 'text-amber-400' : 'text-red-400'
                      }`}>{rec.label}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{rec.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ AI BRIEFING ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {briefing && (
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-cyan-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{briefing.headline}</span>
              {briefing.excitement >= 4 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  {briefing.excitement >= 5 ? 'PRIME' : 'GOOD'}
                </span>
              )}
            </div>
            {briefing.body && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{briefing.body}</p>
            )}
            {briefing.bullets?.length > 0 && (
              <div className="space-y-1.5">
                {briefing.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]">
                    <span className="flex-shrink-0">{b.icon || '┬╖'}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            )}
            {briefing.bestAction && (
              <div className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-cyan-500/[0.06] text-cyan-500 border border-cyan-500/20">
                <Lightbulb className="w-4 h-4 shrink-0" /> {briefing.bestAction}
              </div>
            )}
          </div>
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ PRESSURE STRIP ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {pressureData && (
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {pressureData.gradient > 0.5 ? <TrendingUp className="w-4 h-4 text-amber-500" /> :
                 pressureData.gradient < -0.5 ? <TrendingDown className="w-4 h-4 text-blue-500" /> :
                 <Minus className="w-4 h-4 text-emerald-500" />}
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {Math.abs(pressureData.gradient) < 0.5 ? 'Stable pressure' : pressureData.gradient > 0 ? 'Pressure rising' : 'Pressure falling'}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)]">{safeToFixed(Math.abs(pressureData.gradient), 1)} mb gradient</span>
              {selectedActivity === 'fishing' && Math.abs(pressureData.gradient) > 0.5 && (
                <span className="ml-auto text-[10px] font-medium text-emerald-500">
                  {pressureData.gradient < 0 ? 'Feeding activity increasing' : 'Bite may slow'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ═══════ THE PLAYGROUND — Interactive Water Map ═══════ */}
        <Suspense fallback={<div className="card animate-pulse h-80 flex items-center justify-center text-slate-500 text-sm">Loading map...</div>}>
          <WaterMap currentWeatherData={{
            ambientTemp: lakeState?.pws?.temperature ?? null,
            windSpeed: currentWindSpeed ?? null,
            windDirection: currentWindDirection ?? null,
          }} />
        </Suspense>

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ SPORT INTELLIGENCE — Optimal Time Windows ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {sportWindows && Object.keys(sportWindows).length > 0 && (
          <IntelligentRecommendations
            windows={sportWindows}
            sportFilter={
              selectedActivity === 'fishing' ? ['fishing', 'boating', 'paddling'] :
              selectedActivity === 'boating' ? ['boating', 'paddling', 'fishing'] :
              ['paddling', 'boating', 'fishing']
            }
            title="Best Time Windows Today"
            currentApp="water"
            crossAppUrls={{ wind: import.meta.env.VITE_WIND_APP_URL }}
          />
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ MAIN CONTENT ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
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
              selectedLocation={selectedLocation}
            />
          ) : (
            <FlatwaterTemplate
              selectedActivity={selectedActivity}
              selectedLake={selectedLocation}
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
      <FeedbackWidget />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary name="Utah Water">
      <ThemeProvider>
        <WaterApp />
        <Analytics />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
