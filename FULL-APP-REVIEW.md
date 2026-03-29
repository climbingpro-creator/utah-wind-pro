# UtahWindFinder — Full Application Review Document

> **Purpose**: Comprehensive codebase snapshot for AI-assisted architectural review and evaluation.
> **Generated**: March 24, 2026
> **Repo**: https://github.com/climbingpro-creator/utah-wind-pro
> **Live**: https://utahwindfinder.com

---

## 1. PROJECT OVERVIEW

**UtahWindFinder** is a full-stack weather intelligence platform for outdoor enthusiasts in Utah. It combines real-time wind/weather data from multiple sources with ML-trained prediction models to provide activity-specific forecasts for 8 activities: kiteboarding, snowkiting, sailing, windsurfing, boating, paddling, paragliding, and fishing.

### Key Capabilities
- Real-time weather aggregation (Ambient Weather, Synoptic/MesoWest, NWS, USGS)
- 9-step unified prediction pipeline with 365-day backtested models
- Activity-specific scoring (thermal wind for kiting, glass conditions for boating, etc.)
- Comprehensive fishing intelligence: daily fly/lure recommendations driven by weather + aquatic ecosystem biology
- Garmin Connect IQ watch app for session recording (jumps, GPS track, HR)
- Multi-user session leaderboards with gamification (day pages, yearly rankings)
- Supabase auth + Stripe subscriptions (free/pro tier)
- PWA with service worker, Capacitor mobile wrapper
- Vercel serverless API with cron jobs for data collection

---

## 2. TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2 |
| Build | Vite | 7.3 |
| Styling | Tailwind CSS | 4.2 (via @tailwindcss/vite) |
| Icons | Lucide React | 0.577 |
| Maps | Leaflet + React-Leaflet | 1.9 / 5.0 |
| State | React Context + Hooks (no Redux) | — |
| Auth | Supabase Auth | 2.49 |
| Database | Supabase (PostgreSQL) | — |
| Payments | Stripe | 17.5 |
| API | Vercel Serverless Functions | Node.js |
| Mobile | Capacitor | 8.2 |
| PWA | vite-plugin-pwa (injectManifest) | 1.2 |
| Watch | Garmin Connect IQ (Monkey C) | SDK 3.2+ |
| Testing | Vitest | 4.1 |
| Linting | ESLint 9 + react-hooks + react-refresh | — |
| CI | GitHub Actions (lint → test → build) | — |

---

## 3. COMPLETE FILE TREE (224+ files)

```
Root
├── .env.example
├── .github/workflows/ci.yml
├── .gitignore
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── vitest.config.js
├── vercel.json
├── eslint.config.js
├── capacitor.config.json
├── capacitor.config.dev.json
├── learned-wu-params.json
├── utah_stations.json
├── utah-fishing-research.md
├── audit-export.md
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── sw.js
│   │
│   ├── components/ (62 files)
│   │   ├── Dashboard.jsx (main orchestrator — 735 lines)
│   │   ├── TodayHero.jsx (hero card with activity cards — 427 lines)
│   │   ├── TodayTimeline.jsx (hourly forecast timeline — 445 lines)
│   │   ├── FishingMode.jsx (fishing intelligence UI — 2,152 lines)
│   │   ├── ParaglidingMode.jsx
│   │   ├── ActivityMode.jsx (activity config + scoring)
│   │   ├── ActivityScoreBanner.jsx
│   │   ├── FiveDayForecast.jsx
│   │   ├── ForecastPanel.jsx
│   │   ├── GlassScore.jsx
│   │   ├── KiteSafety.jsx
│   │   ├── LakeSelector.jsx
│   │   ├── WindMap.jsx
│   │   ├── ConfidenceGauge.jsx
│   │   ├── SignalConvergence.jsx
│   │   ├── PropagationTracker.jsx
│   │   ├── SnowkiteForecast.jsx
│   │   ├── ThermalForecast.jsx
│   │   ├── WaterForecast.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── AppHeader.jsx
│   │   ├── Modal.jsx
│   │   ├── ProGate.jsx, ProUpgrade.jsx
│   │   ├── NotificationSettings.jsx, SMSAlertSettings.jsx
│   │   ├── Onboarding.jsx
│   │   ├── PhotoSubmit.jsx
│   │   ├── SessionReplay.jsx, SessionFeedback.jsx
│   │   ├── WindSeekerTemplate.jsx, FlatwaterTemplate.jsx, WinterRiderTemplate.jsx
│   │   └── ... (40+ more)
│   │
│   ├── services/ (38 files)
│   │   ├── UnifiedPredictor.js (9-step prediction pipeline — main brain)
│   │   ├── WeatherService.js (Ambient + Synoptic + NWS aggregation)
│   │   ├── FishingPredictor.js (ML-trained, moon/pressure/time model)
│   │   ├── FlyRecommender.js (daily fly picks — weather × hatch × ecosystem)
│   │   ├── LureRecommender.js (universal lure/bait engine — 55+ lures)
│   │   ├── USGSWaterService.js (river flows + water temps from USGS)
│   │   ├── ActivityScoring.js (per-activity quality scoring)
│   │   ├── BoatingPredictor.js
│   │   ├── ParaglidingPredictor.js
│   │   ├── SnowkitePredictor.js
│   │   ├── CorrelationEngine.js
│   │   ├── FrontalTrendPredictor.js
│   │   ├── WindFieldEngine.js
│   │   ├── WindIntelligence.js
│   │   ├── SmartForecastEngine.js
│   │   ├── ThermalPredictor.js, ThermalPropagation.js
│   │   ├── DataCollector.js, DataNormalizer.js
│   │   ├── LearningSystem.js
│   │   ├── ForecastService.js, MultiDayForecast.js
│   │   ├── MorningBriefing.js
│   │   ├── NotificationService.js, PushService.js, SMSNotificationService.js
│   │   ├── SessionValidation.js, WaterSafetyService.js
│   │   ├── PatternLogic.js, PropagationAlerts.js
│   │   └── *.test.js (8 test files)
│   │
│   ├── config/ (25 files)
│   │   ├── aquaticEcosystems.js (biological profiles for 17 fishing locations)
│   │   ├── activityLeaderboards.js (per-activity leaderboard definitions)
│   │   ├── lakeStations.js (station → lake mapping)
│   │   ├── stationRegistry.js
│   │   ├── spotSlugs.js
│   │   ├── indicatorSystem.js
│   │   ├── imagePool.js
│   │   ├── wuPwsNetwork.js
│   │   ├── trainedWeights.json (kiting model)
│   │   ├── trainedWeights-fishing.json
│   │   ├── trainedWeights-boating.json
│   │   ├── trainedWeights-paragliding.json
│   │   ├── snowkiteModel.json
│   │   └── lakes/ (10 lake config files)
│   │
│   ├── context/
│   │   ├── AuthContext.jsx (Supabase auth + trial + Stripe tier)
│   │   └── ThemeContext.jsx (dark/light mode)
│   │
│   ├── hooks/
│   │   ├── useLakeData.js (weather data polling + caching)
│   │   └── useModelContext.js
│   │
│   ├── lib/
│   │   └── supabase.js (client init)
│   │
│   ├── utils/ (13 files)
│   │   ├── fetchWithRetry.js, wind.js, safeToFixed.js
│   │   ├── paraglidingScore.js, thermalCalculations.js
│   │   ├── platform.js, themeClasses.js
│   │   └── *.test.js
│   │
│   └── data/ (5 JSON files — correlation/validation data)
│
├── api/ (29 serverless functions)
│   ├── weather.js (proxy for Ambient/Synoptic/NWS/WU)
│   ├── garmin.js (Garmin session upload endpoint)
│   ├── session-upload.js
│   ├── session/[id].js (session detail page — server-rendered HTML)
│   ├── session/[id]/catch.js, edit.js, form.js, photo.js
│   ├── day/[spot]/[date].js (day leaderboard page — server-rendered HTML)
│   ├── year/[spot]/[year].js (yearly leaderboard)
│   ├── current-conditions.js
│   ├── thermal-forecast.js
│   ├── topo-warning.js
│   ├── emergency-location.js
│   ├── garmin-link.js
│   ├── push-subscribe.js
│   ├── subscribe.js (Stripe checkout)
│   ├── webhooks/stripe.js
│   ├── user-preferences.js
│   ├── cron/collect.js (15-min weather collection)
│   ├── cron/push-check.js (15-min push notification check)
│   └── lib/ (8 shared server modules)
│       ├── supabase.js, stations.js
│       ├── nwsForecast.js, nwsAdapter.js
│       ├── historicalAnalysis.js
│       ├── serverLearning.js, serverPropagation.js
│       └── udotAdapter.js
│
├── garmin/ (Garmin Connect IQ watch app)
│   ├── UtahWindField/
│   │   ├── manifest.xml (fenix 7/8, epix 2, fr965)
│   │   ├── monkey.jungle
│   │   ├── source/ (17 Monkey C source files)
│   │   │   ├── KiteSessionApp.mc (main app — session lifecycle)
│   │   │   ├── JumpTracker.mc (barometric jump detection)
│   │   │   ├── SessionUploader.mc (HTTP POST to API)
│   │   │   ├── KiteViewFactory.mc (ViewLoop factory)
│   │   │   ├── SessionView.mc, SpeedView.mc, JumpView.mc
│   │   │   ├── MapView.mc, ControlView.mc, ReviewView.mc
│   │   │   ├── CounterView.mc, CounterDelegate.mc
│   │   │   ├── EmergencyView.mc, EmergencyDelegate.mc
│   │   │   ├── ScreenDelegate.mc, DiagnosticLogger.mc
│   │   │   └── TopographyLoop.mc
│   │   └── resources/ (drawables, strings)
│   └── analyze_session.py
│
├── scripts/ (44 analysis/backtest scripts)
│   ├── backtest-full-2025.cjs
│   ├── backtest-boating-fishing-2025.cjs
│   ├── backtest-paragliding-2025.cjs
│   ├── compare-models-365-backtest.mjs
│   ├── rebuild-models-365.js
│   ├── build-snowkite-model.cjs
│   └── ... (analysis, validation, historical scripts)
│
├── supabase/
│   └── schema.sql (full DB schema)
│
├── docs/ (8 architecture docs)
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── PREDICTION-METHODOLOGY.md
│   ├── LEARNING-SYSTEM.md
│   ├── FORECAST-INTEGRATION.md
│   ├── DATA-UPDATE-FREQUENCIES.md
│   ├── MULTI-USER-FEATURES.md
│   ├── USER-PERSONAS-ANALYSIS.md
│   └── VALIDATED-CORRELATIONS.md
│
└── public/ (icons, images, manifest, favicon, privacy page)
```

---

## 4. ENTRY POINTS & CONFIGURATION

### `package.json`
```json
{
  "name": "utahwindfinder",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "rebuild-models": "node scripts/rebuild-models-365.js",
    "mobile:build": "npm run build && cap sync",
    "mobile:android": "npm run build && cap sync android && cap open android"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@supabase/supabase-js": "^2.49.1",
    "axios": "^1.13.6",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    "lucide-react": "^0.577.0",
    "tailwindcss": "^4.2.1",
    "@tailwindcss/vite": "^4.2.1",
    "stripe": "^17.5.0",
    "web-push": "^3.6.7",
    "@capacitor/core": "^8.2.0",
    "@capacitor/cli": "^8.2.0"
  },
  "devDependencies": {
    "vite": "^7.3.1",
    "@vitejs/plugin-react": "^5.1.1",
    "vite-plugin-pwa": "^1.2.0",
    "vitest": "^4.1.0",
    "eslint": "^9.39.1"
  }
}
```

### `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
    }),
  ],
})
```

### `vercel.json` (key sections)
```json
{
  "framework": "vite",
  "functions": {
    "api/cron/collect.js": { "maxDuration": 300 },
    "api/cron/push-check.js": { "maxDuration": 60 }
  },
  "crons": [
    { "path": "/api/cron/collect", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/push-check", "schedule": "*/15 * * * *" }
  ],
  "rewrites": [
    { "source": "/session/:id", "destination": "/api/session/:id" },
    { "source": "/day/:spot/:date", "destination": "/api/day/:spot/:date" },
    { "source": "/year/:spot/:year", "destination": "/api/year/:spot/:year" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### CI Pipeline (`.github/workflows/ci.yml`)
```yaml
name: CI
on:
  push: { branches: [master, main] }
  pull_request: { branches: [master, main] }

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

## 5. APPLICATION ARCHITECTURE

### `src/main.jsx`
```jsx
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
createRoot(document.getElementById('root')).render(<App />)
```

### `src/App.jsx`
```jsx
import { Dashboard } from './components/Dashboard';
import { InstallPrompt } from './components/InstallPrompt';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const updateReady = useSWRegistration(); // custom hook for PWA updates
  useEffect(() => { dataCollector.start(); return () => dataCollector.stop(); }, []);
  return (
    <ErrorBoundary name="UtahWindFinder">
      <AuthProvider>
        <ThemeProvider>
          <Dashboard />
          <InstallPrompt onUpdateAvailable={updateReady} />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

### Data Flow
```
Weather Sources (Ambient, Synoptic, NWS, USGS)
    ↓ [/api/weather proxy + /api/cron/collect]
WeatherService.js → DataNormalizer.js → LakeState
    ↓
useLakeData.js hook (1-min polling, 5-min history)
    ↓
Dashboard.jsx (orchestrator)
    ├── UnifiedPredictor.js (9-step pipeline)
    │   1. OBSERVE → 2. CONTEXTUALIZE → 3. CLASSIFY
    │   4. PROPAGATE → 5. PRESSURE → 6. CALIBRATE
    │   7. SCORE → 8. DECIDE → 9. BRIEF
    ├── ActivityMode.js (per-activity scoring)
    ├── FishingPredictor.js + FlyRecommender.js + LureRecommender.js
    ├── TodayHero.jsx (hero card + activity switcher)
    ├── TodayTimeline.jsx (hourly forecast)
    └── [Activity-specific components]
```

---

## 6. AUTH & DATABASE

### `src/lib/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey) : null;
```

### `src/context/AuthContext.jsx` — Key Design
- Supabase email/password auth
- Free/Pro tier system with 7-day trial
- Admin email hardcoded: `climbingpro@gmail.com`
- Stripe integration for upgrade/manage subscription
- Service-role-only subscription writes (client blocked via RLS)

### Database Schema (Supabase PostgreSQL)
**Tables:**
| Table | Purpose |
|-------|---------|
| `user_preferences` | Default lake, activities, alert settings, units |
| `subscriptions` | Stripe subscription tracking, tier (free/pro) |
| `push_subscriptions` | Web push notification endpoints |
| `garmin_devices` | Device → user linking |
| `spots` | 45+ locations with GPS coords |
| `kite_sessions` | All activity sessions (kiting, fishing, etc.) |
| `jumps` | Individual jump records per session |
| `session_photos` | User-uploaded photos per session |
| `fish_catches` | Per-session fish catch log |
| `emergency_alerts` | Garmin emergency location broadcasts |

**RLS Policies:** All tables have row-level security. Sessions, jumps, photos, and catches are publicly readable (for day leaderboard pages). Subscription writes are blocked for all client roles — only service_role can modify.

**Key Functions:**
- `get_user_tier(uid)` — check subscription status
- `get_device_tier(did)` — check Garmin device Pro access
- `nearest_spot(lat, lon)` — GPS → spot matching for uploads

---

## 7. GARMIN CONNECT IQ APP

### `garmin/UtahWindField/manifest.xml`
- Type: `watch-app`
- Min SDK: 3.2.0
- Permissions: Positioning, Sensor, Communications, Fit
- Supported: fenix 7/8, epix 2, FR 965

### `KiteSessionApp.mc` — Session Lifecycle
```
initialize() → onStart() → GPS + HR sensors enabled
  → startSession() → ActivityRecording + JumpTracker + TopographyLoop
  → pauseSession() / resumeSession()
  → stopSession() → Collects Activity info → _uploadAndReview()
    → Builds payload (duration, distance, speed, jumps, HR, temp, fish/ride counts)
    → Reads rider_name + gear_setup from Application.Storage
    → SessionUploader.upload(payload) → HTTP POST to /api/garmin
    → Switches to ReviewView
```

### View System
`KiteViewFactory` provides a `ViewLoop` with multiple screens:
- `SessionView` (timer/distance)
- `SpeedView` (current/max speed)
- `JumpView` (jump stats)
- `MapView` (GPS track)
- `ControlView` (start/stop/pause)
- `CounterView` (fish/ride/foil counts)
- `EmergencyView` (SOS button)

---

## 8. PREDICTION ENGINE

### UnifiedPredictor.js — 9-Step Pipeline
```
Step 1: OBSERVE    — Extract readings by station role
Step 2: CONTEXTUALIZE — Compare to climatology z-scores
Step 3: CLASSIFY   — Match event fingerprints → identify regime
Step 4: PROPAGATE  — 365-day lag correlations for ETAs
Step 5: PRESSURE   — Gradient analysis (numeric thresholds)
Step 6: CALIBRATE  — Apply learned weights + calibration curves
Step 7: SCORE      — Per-activity scoring using calibrated probability
Step 8: DECIDE     — GO / WAIT / PASS with confidence
Step 9: BRIEF      — Generate headline / body / bullets
```

### Trained Models (backtested on 4,984+ hourly observations)
- `trainedWeights.json` — kiting
- `trainedWeights-fishing.json` — fishing (moon phase, pressure, dawn/dusk)
- `trainedWeights-boating.json` — boating (glass conditions)
- `trainedWeights-paragliding.json` — paragliding
- `snowkiteModel.json` — snowkiting

---

## 9. FISHING INTELLIGENCE SYSTEM

### Architecture
```
FishingMode.jsx (2,152 lines)
  ├── 17 location configs with hotspots, species, structure, regulations
  ├── FishingPredictor.js — overall quality score
  ├── FlyRecommender.js — daily fly picks (weather × hatch × ecosystem)
  ├── LureRecommender.js — universal lure/bait engine (55+ lures)
  ├── USGSWaterService.js — real-time river flows + water temps
  └── aquaticEcosystems.js — biological profiles for all 17 locations
```

### FlyRecommender.js
- Parses NWS sky conditions → maps to hatch activity
- BWO on overcast days, caddis in evening, midges in winter
- Ecosystem-aware: local hatch intensity boosts, invertebrate-driven confidence
- Produces ranked picks by time window (dawn, midday, evening, etc.)
- Returns nymph vs dry recommendation

### LureRecommender.js
- 55+ lure entries across 6 categories (soft plastic, hard bait, topwater, bait, shore, trolling, ice)
- Bass seasonal phases, walleye patterns, catfish night fishing
- Forage-matched color recommendations from ecosystem data
- Thermocline-adjusted trolling depths
- Shore strategy based on wind direction

### aquaticEcosystems.js — 17 Location Profiles
Each location includes:
- **Forage**: Primary/secondary species with size, peak months, lure/fly matches
- **Hatches**: Location-specific insect activity with intensity and peak hours
- **Water Clarity**: Typical classification + seasonal visibility in feet
- **Substrate**: Primary/secondary composition
- **Thermocline**: Seasonal depth ranges and temperature bands
- **Dissolved Oxygen**: Summer DO profiles by depth zone
- **Vegetation**: Types, depth, season, coverage
- **Invertebrates**: Density levels (scuds, crayfish, leeches, snails, sowbugs)
- **Predator-Prey**: Top predator, prey chain, key relationship insight

---

## 10. WEATHER DATA SOURCES

| Source | Data | Refresh |
|--------|------|---------|
| Ambient Weather PWS | Wind, temp, pressure, rain, UV | 1-min poll |
| Synoptic/MesoWest | Multi-station ASOS/AWOS | Via /api/weather proxy |
| NWS API | Hourly forecasts, alerts | Via api/lib/nwsForecast.js |
| USGS Water Services | River flows (cfs), water temp | Real-time IV endpoint |
| Weather Underground | Personal weather stations | WU PWS network config |

---

## 11. LEADERBOARD SYSTEM

### Day Pages (`/day/:spot/:date`)
- Server-rendered HTML from `api/day/[spot]/[date].js`
- Per-activity leaderboard tabs (defined in `activityLeaderboards.js`)
- Kiting: highest jump, hangtime, distance, speed, total jumps, duration
- Fishing: biggest fish, most fish, best photo
- Boating: longest outing, distance, top speed
- All 8 activities have activity-specific metrics

### Year Pages (`/year/:spot/:year`)
- Cumulative seasonal leaderboards
- Same metrics aggregated over the year

### Session Pages (`/session/:id`)
- Individual session detail with jump charts, GPS track, photos, catches

---

## 12. AREAS FOR REVIEW

Please evaluate the following:

### Architecture & Design
1. Is the monolithic `Dashboard.jsx` (735 lines) appropriate, or should it be decomposed?
2. Is `FishingMode.jsx` at 2,152 lines too large? What's the best decomposition strategy?
3. The UnifiedPredictor.js 9-step pipeline — is this well-structured for a rules-based prediction engine?
4. Is React Context sufficient for state management at this scale, or would Zustand/Jotai be better?
5. How well does the server-rendered HTML approach for day/session/year pages integrate with the SPA?

### Code Quality
6. Are there any anti-patterns in the React component structure?
7. Is the `useLakeData` hook properly handling cache invalidation and race conditions?
8. Are the test files adequate? What critical paths lack coverage?
9. ESLint config — is it properly configured for this project's needs?
10. Are there any performance concerns with the 62 components and 38 services?

### Data & API Design
11. Is the weather data aggregation approach (multi-source proxy) well-designed?
12. Are the Supabase RLS policies secure? Any gaps?
13. Is the session upload flow from Garmin → API → Supabase robust?
14. Are the USGS water service integrations properly rate-limited?

### Security
15. Hardcoded admin email in AuthContext.jsx — security concern?
16. API key handling (env vars vs server proxy) — any leaks possible?
17. Public read policies on sessions/jumps/catches — appropriate for leaderboard use?

### Fishing Intelligence
18. Is the aquatic ecosystem data model well-structured for extensibility?
19. Are the fly/lure recommendation engines reasonable from a domain perspective?
20. How well does the forage-matching and hatch-intensity boosting logic work?

### Mobile & PWA
21. Is the Capacitor integration properly set up for iOS/Android builds?
22. Is the PWA service worker strategy (injectManifest) appropriate?
23. Is the Garmin Connect IQ app following SDK best practices?

### Scalability
24. How well would this scale to more locations/activities?
25. Are there any obvious bottlenecks in the Vercel serverless architecture?
26. Would the cron job approach for data collection hold up under load?

---

## 13. KEY SOURCE FILES (FULL CONTENT)

### `src/context/AuthContext.jsx`
```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../utils/platform';

const TRIAL_KEY = 'uwf_trial_start';
const TRIAL_DAYS = 7;
const ADMIN_EMAILS = ['climbingpro@gmail.com'];

const AuthContext = createContext({
  user: null, session: null, tier: 'free', loading: true,
  trialActive: false, trialDaysLeft: 0, showPaywall: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [trialStart, setTrialStart] = useState(() => {
    const stored = localStorage.getItem(TRIAL_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const trialDaysLeft = trialStart
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - trialStart) / 86400000))
    : TRIAL_DAYS;
  const trialActive = trialStart !== null && trialDaysLeft > 0;
  const effectiveTier = tier === 'pro' ? 'pro' : (trialActive ? 'pro' : 'free');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        if (ADMIN_EMAILS.includes(s.user.email?.toLowerCase())) setTier('pro');
        else fetchTier(s.access_token);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        if (ADMIN_EMAILS.includes(s.user.email?.toLowerCase())) setTier('pro');
        else fetchTier(s.access_token);
      } else setTier('free');
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchTier(token) { /* checks /api/user-preferences then /api/thermal-forecast */ }
  async function signIn(email, password) { /* supabase.auth.signInWithPassword */ }
  async function signUp(email, password) { /* supabase.auth.signUp */ }
  async function signOut() { /* supabase.auth.signOut */ }
  function startTrial() { /* localStorage + state */ }
  async function upgradeToPro() { /* Stripe checkout via /api/subscribe */ }
  async function manageSubscription() { /* Stripe portal via /api/subscribe?action=portal */ }

  return (
    <AuthContext.Provider value={{
      user, session, tier: effectiveTier, rawTier: tier, loading,
      signIn, signUp, signOut, upgradeToPro, manageSubscription,
      isPro: effectiveTier === 'pro',
      trialActive, trialDaysLeft, startTrial,
      showPaywall, openPaywall: () => setShowPaywall(true),
      closePaywall: () => setShowPaywall(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
```

### `src/context/ThemeContext.jsx`
```jsx
const ThemeContext = createContext();
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(/* localStorage or system preference, default 'dark' */);
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme !== 'dark');
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(p => p === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Garmin Watch App — `KiteSessionApp.mc` (full, 230 lines)
```monkeyc
using Toybox.Application;
using Toybox.WatchUi;
using Toybox.Position;
using Toybox.Sensor;
using Toybox.Activity;
using Toybox.ActivityRecording;

class KiteSessionApp extends Application.AppBase {
    var jumpTracker;
    var topoLoop;
    var session = null;
    var isRecording = false;
    var isPaused = false;
    var uploader = null;
    var viewFactory = null;

    function initialize() { AppBase.initialize(); }

    function onStart(state) {
        Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, method(:onPosition));
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
        topoLoop = new TopographyLoop();
        jumpTracker = new JumpTracker();
    }

    function startSession() {
        if (isRecording) { return; }
        session = ActivityRecording.createSession({
            :name => "Kite Session",
            :sport => Activity.SPORT_GENERIC,
            :subSport => Activity.SUB_SPORT_GENERIC
        });
        session.start();
        topoLoop.start();
        jumpTracker.startListening();
        isRecording = true;
        isPaused = false;
    }

    function stopSession() {
        if (!isRecording) { return; }
        jumpTracker.stopListening();
        topoLoop.stop();
        var info = Activity.getActivityInfo();
        // Extract timer, distance, maxSpeed, calories, HR
        session.stop(); session.save();
        isRecording = false;
        _uploadAndReview(timerMs, distM, maxSpeedMs, cal, avgHR, maxHR);
    }

    hidden function _uploadAndReview(...) {
        // Convert units, read rider_name/gear_setup from Storage
        // Read fish/ride/foil counts from CounterView
        var payload = {
            "type" => "kite_session",
            "duration_s" => durationS,
            "distance_nm" => distNM,
            "max_speed_kts" => maxKnots,
            "jumps" => jumpTracker.jumpCount,
            "max_jump_ft" => jumpTracker.maxHeight,
            "ride_count" => rideC,
            "foil_ride_count" => foilC,
            "fish_count" => fishC,
            "device" => System.getDeviceSettings().uniqueIdentifier
        };
        uploader = new SessionUploader();
        uploader.upload(payload);
        WatchUi.switchToView(review, new ReviewDelegate(review), WatchUi.SLIDE_UP);
    }

    function getInitialView() {
        viewFactory = new KiteViewFactory();
        var viewLoop = new WatchUi.ViewLoop(viewFactory, {:wrap => true});
        return [viewLoop, new WatchUi.ViewLoopDelegate(viewLoop)];
    }
}
```

---

## 14. STATISTICS

| Metric | Value |
|--------|-------|
| Total source files | ~224+ |
| Frontend components | 62 |
| Service modules | 38 |
| Config files | 25 |
| API endpoints | 29 |
| Garmin source files | 17 |
| Analysis scripts | 44 |
| Test files | 8 |
| Database tables | 10 |
| Supported activities | 8 |
| Fishing locations | 17 |
| Weather stations | Multi-network |
| Lure database entries | 55+ |
| Fly pattern entries | 25+ |
| Ecosystem profiles | 17 |
| Trained ML models | 5 |

---

*End of review document. All source code is available at the GitHub repository for full file-level inspection.*
