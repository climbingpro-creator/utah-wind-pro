import { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Fish, Ship, Waves, RefreshCw, Wifi, WifiOff, Sun, Moon, CheckCircle,
  Shield, Clock, Lightbulb, TrendingUp, TrendingDown, Minus, LogIn, LogOut, Crown, CreditCard, Sparkles, Brain, Star, Camera, Lock, Bell } from 'lucide-react';
import { ErrorBoundary, FeedbackWidget, initAnalytics, trackPageView } from '@utahwind/ui';
import { supabase } from '@utahwind/database';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useWeatherData, getHourlyForecast, findAllSportWindows, isNativeApp } from '@utahwind/weather';
import { IntelligentRecommendations } from '@utahwind/ui';
import { predictGlass } from './services/BoatingPredictor';
import { safeToFixed } from './utils/safeToFixed';
import { getUtahVernacular, getVernacularWindLabel } from './services/UtahVernacular';
import LocationSelector, { useFavorites, LIVE_LAKES, UTAH_WATERS } from './components/LocationSelector';
import CommunityCatchesCard from './components/CommunityCatchesCard';
import LiveConditionReport from './components/LiveConditionReport';

const ALL_LOCATIONS = [...LIVE_LAKES, ...UTAH_WATERS];
function getLocationName(id) {
  const loc = ALL_LOCATIONS.find(l => l.id === id);
  if (loc) return loc.name;
  return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const FishingMode = lazy(() => import('./components/FishingMode'));
const FlatwaterTemplate = lazy(() => import('./components/FlatwaterTemplate'));
const VectorWaterMap = lazy(() => import('./components/map/VectorWaterMap'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const EngineTest = lazy(() => import('./pages/EngineTest'));
const ProUpgrade = lazy(() => import('./components/ProUpgrade'));
const LearnView = lazy(() => import('./components/LearnView'));
const AlertSettings = lazy(() => import('./components/AlertSettings'));
const CatchLog = lazy(() => import('./components/CatchLog'));
const CommunityFeed = lazy(() => import('./pages/CommunityFeed'));

const ADMIN_EMAILS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

function useNativePlatform() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isNativeApp()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0c1220' }).catch(() => {});
    }).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (!isNativeApp()) return;
    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    }).catch(() => {});

    import('./services/NativePushService').then(({ initNativePushListeners }) => {
      initNativePushListeners();
    }).catch(() => {});
  }, []);
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

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

function getWaterVerdict(activity, speed, gust, vernacularCtx) {
  if (speed == null) {
    return { status: 'unknown', label: 'CHECKING', reason: 'Waiting for station data', color: 'slate' };
  }
  const s = speed;
  const g = gust ?? s;
  const gusty = g > s * 1.5 && g > 8;

  const vernacularLabel = vernacularCtx
    ? getVernacularWindLabel(vernacularCtx)
    : null;

  if (activity === 'fishing') {
    if (s <= 3 && !gusty) return { status: 'go', label: 'GO FISH', reason: 'Calm water — fish are active', color: 'emerald' };
    if (s <= 8 && g <= 15) return { status: 'go', label: 'GOOD', reason: `Light ripple (${Math.round(s)} mph) — great casting`, color: 'lime' };
    if (s <= 15 || g <= 20) {
      const label = vernacularLabel || 'MODERATE';
      const reason = vernacularLabel
        ? `${vernacularLabel} — ${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''}`
        : `${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''} — switch to jigs or deep bait`;
      return { status: 'caution', label, reason, color: 'amber' };
    }
    return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''} — fish from shore`, color: 'red' };
  }
  if (activity === 'paddling') {
    if (gusty && g > 12) {
      const label = vernacularLabel || 'GUSTY';
      return { status: 'caution', label, reason: `${Math.round(s)} mph with gusts to ${Math.round(g)} — ${vernacularLabel ? vernacularLabel.toLowerCase() : 'unpredictable'}`, color: 'amber' };
    }
    if (s <= 2) return { status: 'go', label: 'GLASS', reason: 'Mirror-flat — perfect paddle', color: 'emerald' };
    if (s <= 6 && g <= 10) return { status: 'go', label: 'GOOD', reason: `Light wind (${Math.round(s)} mph) — easy paddle`, color: 'lime' };
    if (s <= 10) {
      const label = vernacularLabel || 'CHOPPY';
      return { status: 'caution', label, reason: `${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''} — ${vernacularLabel ? vernacularLabel.toLowerCase() : 'experienced only'}`, color: 'amber' };
    }
    return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph — not recommended`, color: 'red' };
  }
  // boating
  if (gusty && g > 15) {
    const label = vernacularLabel || 'GUSTY';
    return { status: 'caution', label, reason: `${Math.round(s)} mph with gusts to ${Math.round(g)} — ${vernacularLabel ? vernacularLabel.toLowerCase() : 'use caution'}`, color: 'amber' };
  }
  if (s <= 2) return { status: 'go', label: 'GLASS', reason: 'Perfect glass — smooth cruising', color: 'emerald' };
  if (s <= 8 && g <= 12) return { status: 'go', label: 'GOOD', reason: `Light wind (${Math.round(s)} mph) — great conditions`, color: 'lime' };
  if (s <= 15) {
    const label = vernacularLabel || 'CHOPPY';
    return { status: 'caution', label, reason: `${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''} — ${vernacularLabel ? vernacularLabel.toLowerCase() : 'noticeable waves'}`, color: 'amber' };
  }
  return { status: 'off', label: 'ROUGH', reason: `${Math.round(s)} mph${gusty ? ` gusting ${Math.round(g)}` : ''} — stay close to shore`, color: 'red' };
}

function getSkillRec(activity, speed) {
  if (speed == null) return null;
  const s = speed;
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

function generateWaterBriefing(activity, speed, gust, pressureData, boatingPred, vernacularLabels, locationName) {
  const loc = locationName || 'the water';
  if (speed == null) {
    return { headline: `Connecting to stations at ${loc}`, body: `Waiting for real-time weather data from nearby stations at ${loc}.`, bestAction: 'Data should arrive momentarily', bullets: [], excitement: 0 };
  }
  const s = speed;
  const hour = new Date().getHours();
  const glassEnd = boatingPred?.glassWindow?.end;
  const gradient = pressureData?.gradient ?? 0;

  let headline, body, bestAction;
  const bullets = [];

  const thermalLabel = vernacularLabels?.find(v => v.label === 'Afternoon Thermal Pull');
  const canyonLabel = vernacularLabels?.find(v => v.label === 'Canyon Winds Expected');
  const preFrontLabel = vernacularLabels?.find(v => v.fishingBoost);

  if (s <= 3) {
    headline = activity === 'fishing' ? `Prime fishing conditions at ${loc}` : `Glass conditions at ${loc} — get out now`;
    body = `Current wind is just ${Math.round(s)} mph at ${loc}. ${hour < 10 ? 'Morning calm should hold for a few hours before thermals build.' : hour > 17 ? 'Evening calm settling in nicely.' : 'Calm pocket — thermals may build by midday.'}`;
    bestAction = activity === 'fishing' ? `Hit the water at ${loc} now — topwater lures will be effective` : `Best window at ${loc} is now${glassEnd ? ` until ~${glassEnd > 12 ? glassEnd - 12 + ' PM' : glassEnd + ' AM'}` : ''}`;
  } else if (s <= 8) {
    headline = thermalLabel ? `Afternoon Thermal Pull building at ${loc}` : `Light conditions at ${loc} — still good`;
    body = thermalLabel
      ? `${thermalLabel.description}`
      : `${Math.round(s)} mph with ${gust && gust > s * 1.2 ? `gusts to ${Math.round(gust)}` : 'steady winds'} at ${loc}. Manageable for most activities.`;
    bestAction = activity === 'fishing' ? `Try subsurface lures at ${loc} — surface bite may be off` : `Good conditions at ${loc} but watch for afternoon thermals`;
  } else {
    headline = canyonLabel ? `Canyon Winds Expected at ${loc}` : thermalLabel ? `Strong Thermal Pull at ${loc}` : `Wind advisory at ${loc} — plan accordingly`;
    body = canyonLabel
      ? canyonLabel.description
      : thermalLabel
        ? thermalLabel.description
        : `${Math.round(s)} mph winds at ${loc} making conditions challenging. ${hour < 17 ? 'May calm by evening.' : 'Conditions unlikely to improve tonight.'}`;
    bestAction = activity === 'fishing' ? `Fish sheltered coves at ${loc} or switch to shore` : `Wait for calmer conditions at ${loc} or stick to sheltered areas`;
  }

  if (preFrontLabel) {
    bullets.push({ icon: '⚡', text: 'Pre-Frontal Bite — pressure dropping, fish feeding aggressively before the front' });
  }
  if (thermalLabel && s > 3) {
    bullets.push({ icon: '🌡️', text: 'Afternoon Thermal Pull — classic Utah valley onshore wind pattern' });
  }
  if (canyonLabel) {
    bullets.push({ icon: '🏔️', text: 'Canyon Winds — cold air funneling through Wasatch canyons' });
  }
  if (Math.abs(gradient) > 1.5 && !canyonLabel) bullets.push({ icon: '📊', text: `Pressure gradient ${safeToFixed(Math.abs(gradient), 1)} mb — ${gradient > 0 ? 'rising' : 'falling'} trend` });
  if (glassEnd) bullets.push({ icon: '🪞', text: `Glass window predicted until ~${glassEnd > 12 ? (glassEnd - 12) + ' PM' : glassEnd + ' AM'}` });
  if (hour < 7) bullets.push({ icon: '🌅', text: 'Dawn patrol — best conditions of the day' });
  else if (hour >= 17) bullets.push({ icon: '🌇', text: 'Evening calm settling in' });

  return { headline, body, bestAction, bullets, excitement: s <= 3 ? 5 : s <= 8 ? 3 : 1 };
}

function AppShell() {
  const hash = useHashRoute();
  useNativePlatform();

  if (hash === '#admin') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading admin...</div>}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (hash === '#login') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading...</div>}>
        <Login />
      </Suspense>
    );
  }

  if (hash === '#test-engine') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white/50">Loading test harness...</div>}>
        <EngineTest />
      </Suspense>
    );
  }

  return <WaterApp />;
}

function WaterApp() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signOut, isPro, rawTier, trialActive, trialDaysLeft, openPaywall, showPaywall, manageSubscription } = useAuth();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [showLearnView, setShowLearnView] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [showCatchLog, setShowCatchLog] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      await manageSubscription();
    } catch (err) {
      console.error('Failed to open subscription portal:', err);
    } finally {
      setManagingSubscription(false);
    }
  };

  const [selectedActivity, setSelectedActivity] = useState('fishing');
  const [selectedLocation, setSelectedLocation] = useState(() =>
    localStorage.getItem('uwg_default_location') || 'strawberry'
  );
  const isFishing = selectedActivity === 'fishing';
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();

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
        selectedLocation,
      );
    } catch (_e) { return null; }
  }, [currentWindSpeed, currentWindGust, pressureData, selectedActivity, selectedLocation]);

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

  const vernacularCtx = useMemo(() => ({
    locationId: selectedLocation,
    windSpeed: currentWindSpeed,
    windDirection: currentWindDirection,
    temperature: lakeState?.pws?.temperature,
    pressureGradient: pressureData?.gradient,
    pressureTrend: pressureData?.gradient != null
      ? (pressureData.gradient < -0.5 ? 'falling' : pressureData.gradient > 0.5 ? 'rising' : 'stable')
      : null,
    pressure: pressureData?.provoPressure ?? pressureData?.slcPressure,
  }), [selectedLocation, currentWindSpeed, currentWindDirection, lakeState?.pws?.temperature, pressureData]);

  const vernacularLabels = useMemo(() => getUtahVernacular(vernacularCtx), [vernacularCtx]);

  const verdicts = useMemo(() =>
    WATER_ACTIVITIES.map(a => ({ ...a, verdict: getWaterVerdict(a.id, currentWindSpeed, currentWindGust, vernacularCtx) })),
    [currentWindSpeed, currentWindGust, vernacularCtx]
  );

  const selectedVerdict = verdicts.find(v => v.id === selectedActivity)?.verdict;
  const skillRec = useMemo(() => getSkillRec(selectedActivity, currentWindSpeed), [selectedActivity, currentWindSpeed]);
  const locationDisplayName = useMemo(() => getLocationName(selectedLocation), [selectedLocation]);
  const briefing = useMemo(() => generateWaterBriefing(selectedActivity, currentWindSpeed, currentWindGust, pressureData, boatingPrediction, vernacularLabels, locationDisplayName), [selectedActivity, currentWindSpeed, currentWindGust, pressureData, boatingPrediction, vernacularLabels, locationDisplayName]);

  const heroImage = useMemo(() => {
    const day = new Date().getDate();
    return HERO_IMAGES[day % HERO_IMAGES.length];
  }, []);

  useEffect(() => {
    if (supabase) {
      initAnalytics(supabase);
      trackPageView('water');
    }
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
    unknown: 'bg-slate-500/30 text-slate-300 animate-pulse',
  };

  return (
    <div className="min-h-screen">
      {/* Beta Launch Promo Banner */}
      {!isPro && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="max-w-2xl mx-auto px-4 py-1.5 flex items-center justify-center gap-3">
            <span className="text-[11px] sm:text-xs font-semibold tracking-tight">
              Beta Launch: Claim your 14-Day Free Trial of NotWindy Pro!
            </span>
            <button
              onClick={openPaywall}
              className="shrink-0 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 border border-white/30 transition-all"
            >
              Claim Trial
            </button>
          </div>
        </div>
      )}
      {/* HEADER */}
      <header className={`border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky ${!isPro ? 'top-[34px]' : 'top-0'} z-40 pt-[env(safe-area-inset-top)]`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                NotWindy
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-tertiary)] mr-1">
                {error ? <WifiOff className="w-3.5 h-3.5 text-red-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
                <span>{formatTime(lastUpdated)}</span>
              </div>
              <button onClick={refresh} disabled={isLoading} className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-medium">Refresh</span>
              </button>
              <button onClick={toggleTheme} className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="text-[8px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
              </button>
              {/* Community catch gallery */}
              <button
                onClick={() => setShowCommunity(true)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${showCommunity ? 'bg-cyan-500/15 text-cyan-400' : 'hover:bg-cyan-500/10 text-cyan-400/70 hover:text-cyan-400'}`}
                title="Community Catches"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[8px] font-medium">Catches</span>
              </button>
              {/* Smart Catch Log */}
              <button
                onClick={() => setShowCatchLog(true)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${showCatchLog ? 'bg-emerald-500/15 text-emerald-400' : 'hover:bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400'}`}
                title="Catch Log"
              >
                <Fish className="w-4 h-4" />
                <span className="text-[8px] font-medium">Log</span>
              </button>
              {/* Fishing Alerts */}
              <button
                onClick={() => setShowAlertSettings(true)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${showAlertSettings ? 'bg-cyan-500/15 text-cyan-400' : 'hover:bg-cyan-500/10 text-cyan-400/70 hover:text-cyan-400'}`}
                title="Fishing Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="text-[8px] font-medium">Alerts</span>
              </button>
              {/* Learn button - accessible to all users */}
              <button
                onClick={() => setShowLearnView(true)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-cyan-500/10 text-cyan-400/70 hover:text-cyan-400 transition-colors"
                title="Learn how NotWindy works"
              >
                <Brain className="w-4 h-4" />
                <span className="text-[8px] font-medium">Learn</span>
              </button>
              {/* Upgrade button for non-Pro users */}
              {!isPro && (
                <button
                  onClick={openPaywall}
                  className="ml-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  Free Trial
                </button>
              )}
              {/* Pro badge + Manage Subscription for Pro users */}
              {isPro && rawTier === 'pro' && (
                <button
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-all disabled:opacity-50"
                  title="Manage Subscription"
                >
                  <Crown className="w-3 h-3" />
                  <span>PRO</span>
                </button>
              )}
              {/* Trial badge */}
              {isPro && trialActive && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Trial: {trialDaysLeft}d
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => { window.location.hash = '#admin'; }}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-violet-500/10 text-violet-400/70 hover:text-violet-400 transition-colors"
                  title="Admin"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-[8px] font-medium">Admin</span>
                </button>
              )}
              {user ? (
                <button
                  onClick={signOut}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[8px] font-medium">Out</span>
                </button>
              ) : (
                <button
                  onClick={() => { window.location.hash = '#login'; }}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-cyan-500/10 text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  title="Log In"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-[8px] font-medium">Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* ═══════ COMMUNITY FEED ═══════ */}
        {showCommunity ? (
          <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>}>
            <CommunityFeed onBack={() => setShowCommunity(false)} />
          </Suspense>
        ) : (<>

        {/* ═══════ LOCATION SELECTOR ═══════ */}
        <LocationSelector
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />

        {/* ═══════ HERO BANNER ═══════ */}
        <div className="hero-water">
          <img src={heroImage} alt="" loading="eager" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />

          <div className="relative z-10 p-5 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedVerdict?.status === 'go' ? 'bg-emerald-500' : selectedVerdict?.status === 'caution' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {getGreeting()} — {getLocationName(selectedLocation)}
                  </p>
                  <button
                    onClick={() => toggleFavorite(selectedLocation)}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    title={isFavorite(selectedLocation) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 transition-colors ${isFavorite(selectedLocation) ? 'fill-amber-400 text-amber-400' : 'text-white/30 hover:text-amber-400/60'}`} />
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug tracking-tight text-white">
                  {selectedVerdict?.reason || 'Loading conditions...'}
                </h2>
                <p className="text-sm mt-1.5 font-medium text-white/60">
                  {currentWindSpeed != null ? `${Math.round(currentWindSpeed)} mph` : '--'}{currentWindDirection != null ? ` ${dirLabel(currentWindDirection)}` : ''} — {WATER_ACTIVITIES.find(a => a.id === selectedActivity)?.name}
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
                            : verdict.status === 'unknown'
                              ? 'bg-white/5 border-slate-400/20 backdrop-blur-sm'
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
          <div className="card space-y-3 relative">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-cyan-500" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{briefing.headline}</span>
              {briefing.excitement >= 4 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  {briefing.excitement >= 5 ? 'PRIME' : 'GOOD'}
                </span>
              )}
            </div>
            {isPro ? (
              <>
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
              </>
            ) : (
              <div className="relative">
                <div className="blur-[4px] pointer-events-none select-none space-y-2">
                  <p className="text-sm text-[var(--text-secondary)]">AI-generated tactical briefing with specific recommendations for current conditions...</p>
                  <div className="px-3 py-2 rounded-lg text-xs bg-cyan-500/[0.06] text-cyan-500 border border-cyan-500/20">Best action recommendation loading...</div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px]">
                  <Lock className="w-4 h-4 text-white/70 mb-1" />
                  <span className="text-[11px] font-bold text-white">Unlock AI Tactical Briefing</span>
                  <span className="text-[9px] text-white/60 mb-2">Try Pro free for 14 days, then $5.99/mo.</span>
                  <button onClick={openPaywall} className="px-3 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg transition-all">
                    Start Free Trial
                  </button>
                </div>
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
                isPro ? (
                  <span className="ml-auto text-[10px] font-medium text-emerald-500">
                    {pressureData.gradient < 0 ? 'Feeding activity increasing' : 'Bite may slow'}
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] font-medium text-slate-500 blur-[3px] select-none">Bite insight</span>
                )
              )}
            </div>
          </div>
        )}

        {/* ═══════ LIVE CONDITION REPORT — crowd-sourced accuracy check ═══════ */}
        <LiveConditionReport locationId={selectedLocation} />

        {/* ═══════ THE PLAYGROUND — Interactive Water Map ═══════ */}
        <Suspense fallback={<div className="card animate-pulse h-80 flex items-center justify-center text-slate-500 text-sm">Loading map...</div>}>
          <VectorWaterMap
            currentWeatherData={{
              ambientTemp: lakeState?.pws?.temperature ?? null,
              windSpeed: currentWindSpeed ?? null,
              windDirection: currentWindDirection ?? null,
            }}
            selectedLocation={selectedLocation}
            onLocationSelect={handleSelectLocation}
            isPro={isPro}
            onUnlockPro={openPaywall}
          />
        </Suspense>

        {/* ═══════ COMMUNITY CATCHES CARD ═══════ */}
        <CommunityCatchesCard onViewAll={() => setShowCommunity(true)} />

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
            isPro={isPro}
            onUnlockPro={openPaywall}
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
              isPro={isPro}
              onUnlockPro={openPaywall}
              lakeState={lakeState}
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
              isPro={isPro}
              onUnlockPro={openPaywall}
            />
          )}
        </Suspense>

        </>)}

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-[var(--border-color)] mt-8">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center">
            {!isPro && (
              <button
                onClick={openPaywall}
                className="mb-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white active:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Start 14-Day Free Trial
              </button>
            )}
            {isPro && rawTier === 'pro' && (
              <button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="mb-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {managingSubscription ? 'Opening...' : 'Manage Subscription'}
              </button>
            )}
            <p className="text-sm font-semibold text-[var(--text-tertiary)]">NotWindy</p>
            <p className="text-[11px] mt-1 text-[var(--text-tertiary)] opacity-60">
              Water intelligence for Utah anglers & boaters
            </p>
          </div>
        </footer>
      </div>

      {/* ProUpgrade Modal */}
      {showPaywall && (
        <Suspense fallback={null}>
          <ProUpgrade />
        </Suspense>
      )}

      {/* Learn View Modal */}
      {showLearnView && (
        <Suspense fallback={null}>
          <LearnView onClose={() => setShowLearnView(false)} />
        </Suspense>
      )}

      {/* Fishing Alert Settings Modal */}
      {showAlertSettings && (
        <Suspense fallback={null}>
          <AlertSettings isOpen={showAlertSettings} onClose={() => setShowAlertSettings(false)} />
        </Suspense>
      )}

      {/* Smart Catch Log Modal */}
      {showCatchLog && (
        <Suspense fallback={null}>
          <CatchLog isOpen={showCatchLog} onClose={() => setShowCatchLog(false)} />
        </Suspense>
      )}

      <FeedbackWidget supabase={supabase} userEmail={user?.email} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary name="Utah Water">
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
          <Analytics />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
