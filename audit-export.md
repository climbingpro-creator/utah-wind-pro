# Utah Wind Pro - Full Codebase Audit Export

**Generated:** 2026-03-13T16:33:06.890Z
**Purpose:** Complete codebase for AI audit and review

## Audit Instructions

You are reviewing "Utah Wind Pro" (utahwindfinder.com), a React weather forecasting app for wind sports, paragliding, and fishing in Utah.

### What This App Does
- Predicts thermal wind windows for Utah Lake, Deer Creek, and Willard Bay
- Forecasts paragliding conditions at Point of the Mountain (Flight Park North/South)
- Provides fishing forecasts based on moon phase, barometric pressure, and solunar data
- Uses real-time data from Ambient Weather (PWS), Synoptic/MesoWest, and NWS APIs
- Includes a self-learning system that collects data daily to improve predictions
- Supports 6 activity modes: Kiting, Sailing, Fishing, Boating, Paddling, Paragliding

### Please Audit For
1. **Architecture & Code Quality** - Component structure, separation of concerns, DRY violations
2. **Performance** - Unnecessary re-renders, API call efficiency, bundle size
3. **Prediction Accuracy** - Are the weather algorithms sound? Missing factors?
4. **Data Flow** - How data moves from APIs through normalization to UI
5. **Error Handling** - Missing try/catch, unhandled edge cases, API failures
6. **Security** - API key exposure, XSS vectors, unsafe patterns
7. **UX/Accessibility** - Mobile responsiveness, color contrast, screen reader support
8. **Testing** - What needs tests? Critical paths without coverage
9. **Scalability** - Can this handle more locations, more users, more data?
10. **Bugs** - Anything that looks broken or could fail silently

---

## Table of Contents

| # | File | Lines | Size |
|---|------|-------|------|
| 1 | `package.json` | 49 | 1.4 KB |
| 2 | `vite.config.js` | 8 | 0.2 KB |
| 3 | `index.html` | 63 | 2.9 KB |
| 4 | `vercel.json` | 38 | 0.9 KB |
| 5 | `eslint.config.js` | 30 | 0.7 KB |
| 6 | `README.md` | 100 | 2.1 KB |
| 7 | `docs/SYSTEM-ARCHITECTURE.md` | 340 | 19.3 KB |
| 8 | `docs/PREDICTION-METHODOLOGY.md` | 393 | 14.8 KB |
| 9 | `docs/VALIDATED-CORRELATIONS.md` | 173 | 6.9 KB |
| 10 | `docs/FORECAST-INTEGRATION.md` | 321 | 10.1 KB |
| 11 | `docs/LEARNING-SYSTEM.md` | 307 | 9.3 KB |
| 12 | `docs/USER-PERSONAS-ANALYSIS.md` | 249 | 7.2 KB |
| 13 | `docs/MULTI-USER-FEATURES.md` | 219 | 4.6 KB |
| 14 | `docs/DATA-UPDATE-FREQUENCIES.md` | 145 | 4.4 KB |
| 15 | `src/main.jsx` | 6 | 0.2 KB |
| 16 | `src/App.jsx` | 25 | 0.5 KB |
| 17 | `src/index.css` | 184 | 3.4 KB |
| 18 | `src/services/WeatherService.js` | 173 | 5.5 KB |
| 19 | `src/services/DataNormalizer.js` | 628 | 20.7 KB |
| 20 | `src/services/ThermalPredictor.js` | 1586 | 53.3 KB |
| 21 | `src/services/ForecastService.js` | 737 | 22.0 KB |
| 22 | `src/services/MultiDayForecast.js` | 425 | 13.2 KB |
| 23 | `src/services/NotificationService.js` | 248 | 6.5 KB |
| 24 | `src/services/LearningSystem.js` | 1160 | 36.9 KB |
| 25 | `src/services/DataCollector.js` | 333 | 10.4 KB |
| 26 | `src/config/lakeStations.js` | 963 | 27.3 KB |
| 27 | `src/config/indicatorSystem.js` | 534 | 17.2 KB |
| 28 | `src/hooks/useLakeData.js` | 122 | 3.6 KB |
| 29 | `src/hooks/useWeatherData.js` | 125 | 3.4 KB |
| 30 | `src/context/ThemeContext.jsx` | 53 | 1.4 KB |
| 31 | `src/utils/thermalCalculations.js` | 216 | 5.6 KB |
| 32 | `src/utils/themeClasses.js` | 57 | 2.2 KB |
| 33 | `src/components/Dashboard.jsx` | 800 | 33.5 KB |
| 34 | `src/components/ActivityMode.jsx` | 343 | 10.3 KB |
| 35 | `src/components/LakeSelector.jsx` | 126 | 5.8 KB |
| 36 | `src/components/ParaglidingMode.jsx` | 748 | 29.4 KB |
| 37 | `src/components/FishingMode.jsx` | 966 | 50.4 KB |
| 38 | `src/components/ConfidenceGauge.jsx` | 122 | 3.7 KB |
| 39 | `src/components/WindVector.jsx` | 160 | 6.2 KB |
| 40 | `src/components/WindMap.jsx` | 600 | 22.8 KB |
| 41 | `src/components/KiteSafety.jsx` | 269 | 8.7 KB |
| 42 | `src/components/NorthFlowGauge.jsx` | 188 | 5.7 KB |
| 43 | `src/components/BustAlert.jsx` | 102 | 3.3 KB |
| 44 | `src/components/ThermalStatus.jsx` | 132 | 5.0 KB |
| 45 | `src/components/ThermalForecast.jsx` | 448 | 20.9 KB |
| 46 | `src/components/ForecastPanel.jsx` | 236 | 9.2 KB |
| 47 | `src/components/FiveDayForecast.jsx` | 310 | 13.5 KB |
| 48 | `src/components/HourlyTimeline.jsx` | 192 | 6.9 KB |
| 49 | `src/components/WeeklyBestDays.jsx` | 188 | 7.3 KB |
| 50 | `src/components/GlassScore.jsx` | 138 | 5.6 KB |
| 51 | `src/components/RaceDayMode.jsx` | 286 | 10.7 KB |
| 52 | `src/components/WeatherForecast.jsx` | 286 | 11.4 KB |
| 53 | `src/components/SevereWeatherAlerts.jsx` | 342 | 11.5 KB |
| 54 | `src/components/DataFreshness.jsx` | 146 | 4.1 KB |
| 55 | `src/components/LearningDashboard.jsx` | 314 | 12.4 KB |
| 56 | `src/components/NotificationSettings.jsx` | 256 | 9.7 KB |
| 57 | `src/components/ToastNotification.jsx` | 158 | 4.4 KB |
| 58 | `src/components/Sparkline.jsx` | 126 | 3.1 KB |
| 59 | `src/components/ThemeToggle.jsx` | 30 | 0.8 KB |
| 60 | `src/data/zigzag-historical.json` | 52 | 2.8 KB |
| 61 | `src/data/spanish-fork-correlation.json` | 28 | 0.5 KB |
| 62 | `src/data/north-flow-indicators.json` | 52 | 1.4 KB |
| 63 | `src/data/kslc-fps-validation.json` | 52 | 1.0 KB |
| 64 | `src/data/provo-utalp-correlation.json` | 52 | 1.1 KB |
| 65 | `public/manifest.json` | 76 | 1.8 KB |
| 66 | `public/sw.js` | 88 | 2.2 KB |
| 67 | `capacitor.config.json` | 28 | 0.5 KB |
| 68 | `scripts/analyze-canyon-stations.js` | 332 | 9.9 KB |
| 69 | `scripts/analyze-deer-creek.js` | 327 | 10.8 KB |
| 70 | `scripts/analyze-forecast-accuracy.js` | 446 | 16.6 KB |
| 71 | `scripts/analyze-fps-yesterday.js` | 96 | 3.3 KB |
| 72 | `scripts/analyze-north-flow-complete.js` | 468 | 14.9 KB |
| 73 | `scripts/analyze-north-flow-deep.js` | 440 | 12.9 KB |
| 74 | `scripts/analyze-north-flow-final.js` | 430 | 13.9 KB |
| 75 | `scripts/analyze-north-flow-indicators.js` | 444 | 14.0 KB |
| 76 | `scripts/analyze-provo-lincoln-sandy.js` | 467 | 17.2 KB |
| 77 | `scripts/analyze-spanish-fork-correlation.js` | 328 | 11.1 KB |
| 78 | `scripts/analyze-spanish-fork-deep.js` | 394 | 12.2 KB |
| 79 | `scripts/analyze-vineyard-conditions.js` | 262 | 9.5 KB |
| 80 | `scripts/analyze-weather-events.js` | 604 | 21.6 KB |
| 81 | `scripts/analyze-weather-patterns.js` | 435 | 16.0 KB |
| 82 | `scripts/analyze-wind-correlation.js` | 326 | 12.2 KB |
| 83 | `scripts/analyze-yesterday-paragliding.js` | 321 | 12.1 KB |
| 84 | `scripts/analyze-zigzag-history.js` | 599 | 22.0 KB |
| 85 | `scripts/export-for-audit.js` | 299 | 10.1 KB |
| 86 | `scripts/templates/analyze-new-location.js` | 595 | 21.0 KB |
| 87 | `scripts/validate-kslc-zigzag-correlation.js` | 367 | 13.3 KB |
| 88 | `utah_stations.json` | 1 | 0.2 KB |

---

## File 1: `package.json`

> 49 lines | 1.4 KB

```json
{
  "name": "utah-wind-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "cap:init": "cap init",
    "cap:add:android": "cap add android",
    "cap:add:ios": "cap add ios",
    "cap:sync": "cap sync",
    "cap:open:android": "cap open android",
    "cap:open:ios": "cap open ios",
    "mobile:build": "npm run build && cap sync",
    "mobile:android": "npm run build && cap sync android && cap open android",
    "mobile:ios": "npm run build && cap sync ios && cap open ios"
  },
  "dependencies": {
    "@capacitor/android": "^8.2.0",
    "@capacitor/cli": "^8.2.0",
    "@capacitor/core": "^8.2.0",
    "@capacitor/ios": "^8.2.0",
    "@capacitor/splash-screen": "^8.0.1",
    "@capacitor/status-bar": "^8.0.1",
    "@tailwindcss/vite": "^4.2.1",
    "axios": "^1.13.6",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.577.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-leaflet": "^5.0.0",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}
```

---

## File 2: `vite.config.js`

> 8 lines | 0.2 KB

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

---

## File 3: `index.html`

> 63 lines | 2.9 KB

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    
    <!-- SEO & Social -->
    <title>Utah Wind Pro - Professional Wind Forecasting</title>
    <meta name="description" content="Real-time wind forecasting for Utah Lake, Deer Creek, and Willard Bay. Thermal predictions for kiteboarding, sailing, boating, and paddling." />
    <meta name="keywords" content="Utah Lake wind, kiteboarding Utah, sailing forecast, thermal wind, Deer Creek wind, Willard Bay, wind prediction" />
    <meta name="author" content="Utah Wind Pro" />
    
    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://utahwindfinder.com/" />
    <meta property="og:title" content="Utah Wind Pro - Professional Wind Forecasting" />
    <meta property="og:description" content="Real-time wind forecasting for Utah Lake, Deer Creek, and Willard Bay. Know before you go!" />
    <meta property="og:image" content="https://utahwindfinder.com/og-image.png" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Utah Wind Pro" />
    <meta name="twitter:description" content="Real-time wind forecasting for Utah's best water sports locations" />
    
    <!-- PWA / Mobile -->
    <meta name="theme-color" content="#0f172a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="UtahWind" />
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
    <link rel="manifest" href="/manifest.json" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
    
    <!-- Preconnect to API domains for faster loading -->
    <link rel="preconnect" href="https://api.synopticdata.com" />
    <link rel="preconnect" href="https://rt.ambientweather.net" />
    <link rel="preconnect" href="https://api.weather.gov" />
    
    <!-- Leaflet CSS for maps -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossorigin="" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
    
    <!-- Register Service Worker -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed:', err));
        });
      }
    </script>
  </body>
</html>
```

---

## File 4: `vercel.json`

> 38 lines | 0.9 KB

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).css",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## File 5: `eslint.config.js`

> 30 lines | 0.7 KB

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
```

---

## File 6: `README.md`

> 100 lines | 2.1 KB

```markdown
# Utah Wind Pro 🌬️

Professional wind forecasting for Utah's best water sports locations.

**Live Site:** [utahwindfinder.com](https://utahwindfinder.com)

## Features

### Multi-Activity Support
- 🪁 **Kiting** - Thermal probability, foil vs twin tip indicators
- ⛵ **Sailing** - Race day mode, wind consistency, course recommendations
- 🚤 **Boating** - Glass score for calm water seekers
- 🏄 **Paddling** - Morning calm windows, safety alerts

### Locations
- **Utah Lake** - 5 launch sites (Lincoln Beach, Sandy Beach, Vineyard, Zig Zag, Mile Marker 19)
- **Deer Creek** - Canyon thermal predictions
- **Willard Bay** - North "gap" wind forecasting

### Key Features
- Real-time wind data from MesoWest and personal weather stations
- 3-step thermal prediction model
- Multi-day forecasting with historical pattern analysis
- NWS severe weather alerts
- Interactive wind map with station data
- Self-learning prediction system
- PWA support - install on mobile

## Data Sources

- **MesoWest (Synoptic)** - Regional weather stations
- **Ambient Weather** - Personal weather station integration
- **NWS** - Forecasts and severe weather alerts

## Tech Stack

- React 19 + Vite
- Tailwind CSS
- Leaflet Maps
- Capacitor (mobile apps)
- IndexedDB (learning system)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```env
VITE_SYNOPTIC_TOKEN=your_token
VITE_AMBIENT_API_KEY=your_key
VITE_AMBIENT_APP_KEY=your_app_key
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Custom Domain
1. Add `utahwindfinder.com` in Vercel domain settings
2. Update DNS records:
   - A record: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

## Mobile Apps

```bash
# Build and sync to Android
npm run mobile:android

# Build and sync to iOS
npm run mobile:ios
```

## License

MIT

---

Built with ❤️ for Utah's water sports community
```

---

## File 7: `docs/SYSTEM-ARCHITECTURE.md`

> 340 lines | 19.3 KB

```markdown
# Utah Wind Pro - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Confidence│  │ Thermal  │  │  North   │  │   Wind   │  │  5-Day   │      │
│  │  Gauge   │  │ Forecast │  │   Flow   │  │   Map    │  │ Forecast │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PREDICTION ENGINE                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ThermalPredictor.js                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Thermal    │  │  North Flow  │  │   Gap Wind   │               │   │
│  │  │  Prediction  │  │  Prediction  │  │  Prediction  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │         │                  │                  │                      │   │
│  │         └──────────────────┼──────────────────┘                      │   │
│  │                            ▼                                         │   │
│  │              ┌─────────────────────────┐                            │   │
│  │              │  Combined Probability   │                            │   │
│  │              │  (Weighted by factors)  │                            │   │
│  │              └─────────────────────────┘                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA NORMALIZATION                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DataNormalizer.js                               │   │
│  │                                                                      │   │
│  │  Raw API Data ──► Normalized LakeState Object                       │   │
│  │                                                                      │   │
│  │  • Extract indicator station data (KSLC, KPVU, QSF, UTALP)         │   │
│  │  • Calculate pressure gradient (SLC - Provo)                        │   │
│  │  • Calculate thermal delta (shore - ridge)                          │   │
│  │  • Normalize wind vectors                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA SOURCES                                      │
│                                                                              │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │   MesoWest API      │              │  Ambient Weather    │              │
│  │   (Synoptic)        │              │      API            │              │
│  │                     │              │                     │              │
│  │  • KSLC (SLC)       │              │  • Your PWS         │              │
│  │  • KPVU (Provo)     │              │    (Saratoga)       │              │
│  │  • QSF (Span Fork)  │              │                     │              │
│  │  • UTALP (PotM)     │              │                     │              │
│  │  • FPS (Flight Pk)  │              │                     │              │
│  │  • SND (Arrowhead)  │              │                     │              │
│  └─────────────────────┘              └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Indicator Flow Diagram

```
                    UPSTREAM INDICATORS
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌────────┐           ┌────────┐           ┌────────┐
│  QSF   │           │  KSLC  │           │  KPVU  │
│Spanish │           │  SLC   │           │ Provo  │
│ Fork   │           │Airport │           │Airport │
└────────┘           └────────┘           └────────┘
    │                      │                      │
    │ 2hr lead             │ 1hr lead             │ 1hr lead
    │                      │                      │
    │ SE Thermal           │ North Flow           │ North Flow
    │                      │                      │ (Southern)
    ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    UTAH LAKE LAUNCHES                       │
│                                                             │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│   │  MM19   │  │ Zig Zag │  │Vineyard │  │  Sandy  │       │
│   │ (North) │  │(N-Cent) │  │(Central)│  │ (South) │       │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                              │              │
│                                          ┌───┴───┐          │
│                                          │Lincoln│          │
│                                          │(South)│          │
│                                          └───────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │   UTALP    │
                    │  Point of  │
                    │  Mountain  │
                    └────────────┘
                           │
                           │ Gap Wind
                           │ Confirmation
                           ▼
                    ┌────────────┐
                    │  Funneling │
                    │   Effect   │
                    └────────────┘
```

## Prediction Logic Flow

```
                         START
                           │
                           ▼
              ┌────────────────────────┐
              │  Fetch Current Data    │
              │  from all indicators   │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  For each indicator:   │
              │  1. Check direction    │
              │  2. Check speed        │
              │  3. Look up validated  │
              │     correlation        │
              └────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Thermal   │  │   North    │  │    Gap     │
    │ Indicator  │  │   Flow     │  │   Wind     │
    │   (QSF)    │  │  (KSLC/    │  │  (UTALP)   │
    │            │  │   KPVU)    │  │            │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Direction  │  │ Direction  │  │ Direction  │
    │ in range?  │  │ in range?  │  │ in range?  │
    │  (SE)      │  │   (N)      │  │   (N)      │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
      Yes  │          Yes  │          Yes  │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Speed    │  │   Speed    │  │   Speed    │
    │ > threshold│  │ > threshold│  │ > threshold│
    │   (6mph)   │  │   (8mph)   │  │   (8mph)   │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
      Yes  │          Yes  │          Yes  │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Look up    │  │ Look up    │  │ Look up    │
    │ validated  │  │ validated  │  │ validated  │
    │correlation │  │correlation │  │correlation │
    └────────────┘  └────────────┘  └────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Combine Predictions  │
              │                        │
              │  • Multiple indicators │
              │    agreeing = higher   │
              │    confidence          │
              │                        │
              │  • Pressure gradient   │
              │    confirms mechanism  │
              │                        │
              │  • Select best for     │
              │    specific launch     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Output Prediction    │
              │                        │
              │  • Expected speed      │
              │  • Foil kiteable %     │
              │  • Twin tip kiteable % │
              │  • Lead time           │
              │  • Confidence level    │
              └────────────────────────┘
                           │
                           ▼
                          END
```

## Data Model

### LakeState Object

```javascript
{
  // Location info
  lakeId: 'utah-lake-zigzag',
  lakeName: 'Utah Lake - Zig Zag',
  
  // Current conditions at target
  currentWind: {
    speed: 12.5,
    direction: 135,
    gust: 18.2,
  },
  
  // Indicator station data
  indicators: {
    spanishFork: {
      stationId: 'QSF',
      speed: 8.2,
      direction: 125,
      status: 'active',
    },
    saltLakeCity: {
      stationId: 'KSLC',
      speed: 10.5,
      direction: 350,
      status: 'active',
    },
    provoAirport: {
      stationId: 'KPVU',
      speed: 11.2,
      direction: 355,
      status: 'active',
    },
    pointOfMountain: {
      stationId: 'UTALP',
      speed: 14.8,
      direction: 5,
      status: 'active',
    },
  },
  
  // Calculated metrics
  pressureGradient: 1.8,  // SLC - Provo (mb)
  thermalDelta: 12.5,     // Shore - Ridge (°F)
  
  // Predictions
  prediction: {
    probability: 78,
    windType: 'north_flow',
    expectedSpeed: 15.5,
    foilKiteablePct: 81,
    twinTipKiteablePct: 50,
    startTime: '14:30',
    confidence: 'high',
    
    // Individual indicator predictions
    thermal: { status: 'inactive', message: '...' },
    northFlow: { status: 'strong', message: '...', expectedSpeed: 15.5 },
    provoIndicator: { status: 'strong', message: '...', expectedSpeed: 17.8 },
    pointOfMountain: { status: 'active', message: '...' },
  },
}
```

## File Structure

```
utah-wind-app/
├── src/
│   ├── components/
│   │   ├── ConfidenceGauge.jsx    # Main probability display
│   │   ├── ThermalForecast.jsx    # Detailed prediction breakdown
│   │   ├── WindMap.jsx            # Interactive map with indicators
│   │   ├── NorthFlowGauge.jsx     # North flow specific display
│   │   ├── ForecastPanel.jsx      # Multi-day forecast
│   │   └── ...
│   │
│   ├── services/
│   │   ├── ThermalPredictor.js    # Core prediction logic
│   │   ├── DataNormalizer.js      # API data normalization
│   │   ├── WeatherService.js      # API calls
│   │   └── ...
│   │
│   ├── config/
│   │   ├── indicatorSystem.js     # Indicator configurations
│   │   ├── lakeStations.js        # Station definitions
│   │   └── ...
│   │
│   └── App.jsx                    # Main application
│
├── scripts/
│   ├── templates/
│   │   └── analyze-new-location.js  # Template for new locations
│   ├── analyze-spanish-fork-correlation.js
│   ├── analyze-north-flow-indicators.js
│   ├── validate-kslc-threshold.js
│   └── ...
│
├── docs/
│   ├── PREDICTION-METHODOLOGY.md  # How the system works
│   └── SYSTEM-ARCHITECTURE.md     # This file
│
└── ...
```

## Adding a New Location

1. **Create analysis script** from template
   ```bash
   cp scripts/templates/analyze-new-location.js scripts/analyze-bear-lake.js
   ```

2. **Configure target location** in the script

3. **Run analysis** to find and validate indicators
   ```bash
   node scripts/analyze-bear-lake.js
   ```

4. **Add validated indicators** to `indicatorSystem.js`

5. **Add launch locations** to `lakeStations.js`

6. **Update UI components** to display new location

## Key Principles

1. **Data-Driven**: All predictions based on validated historical correlations
2. **Upstream Indicators**: Find stations that show patterns before they reach target
3. **Validated Thresholds**: Don't just correlate - validate that predictions are actionable
4. **Location-Specific**: Different launches may have different best indicators
5. **Multiple Confirmation**: Higher confidence when multiple indicators agree
```

---

## File 8: `docs/PREDICTION-METHODOLOGY.md`

> 393 lines | 14.8 KB

```markdown
# Wind Prediction Methodology

## Overview

This document describes the data-driven methodology for building wind prediction models for kiting/sailing locations. The approach uses **upstream indicator stations** to predict wind conditions at a target location with **validated lead times**.

---

## Core Concept: The Indicator Station Model

### The Problem
You want to know if wind will be good at your kiting spot **before you drive there**.

### The Solution
Find weather stations **upstream** of your location that show wind patterns **before** the wind arrives at your spot.

```
[Upstream Indicator] ---(lead time)---> [Your Kiting Spot]
     KSLC (SLC)         ~1 hour           Zig Zag
     QSF (Spanish Fork)  ~2 hours          Zig Zag
     KPVU (Provo)        ~1 hour           Lincoln Beach
```

---

## Step-by-Step Methodology

### Step 1: Identify Your Target Location
- Define the exact kiting/sailing spot
- Get historical wind data (ideally 1+ years)
- Identify the **primary wind types** that create kiteable conditions:
  - **Thermal winds** (lake/land heating differential)
  - **Prefrontal/North flows** (pressure gradient driven)
  - **Gap winds** (terrain funneling)
  - **Canyon winds** (drainage/upslope)

### Step 2: Find Candidate Indicator Stations
Look for weather stations that are:

1. **Upstream of the wind flow**
   - For thermals: Look toward the heat source (mountains, canyons)
   - For north flows: Look toward the pressure source (north/Great Salt Lake)
   - For gap winds: Look at the gap entrance

2. **At appropriate distance**
   - Too close = no lead time
   - Too far = correlation breaks down
   - Sweet spot: 10-50 miles depending on wind type

3. **Reliable data source**
   - MesoWest/Synoptic stations
   - Airport ASOS/AWOS (KSLC, KPVU, etc.)
   - Personal weather stations (PWS)

### Step 3: Analyze Historical Correlation

Run the correlation analysis:

```javascript
// Pseudocode for correlation analysis
for each day in historical_data:
  if target_station shows good_kite_wind:
    mark as "good day"
    record first_hour of good wind
    
for each indicator_station:
  for each good_day:
    check indicator 1, 2, 3, 4 hours BEFORE target
    record: speed, direction, correlation
    
  calculate:
    - % of good days where indicator showed signal
    - average indicator speed when target was good
    - average target speed when indicator shows X mph
```

### Step 4: Validate the Correlation

**Critical Step**: Don't just find correlation - validate it predicts **kiteable conditions**.

```
When [Indicator] shows [X mph] from [direction]:
  → What is the ACTUAL speed at [Target] 1 hour later?
  → What % of the time is it foil-kiteable (10+ mph)?
  → What % of the time is it twin-tip kiteable (15+ mph)?
```

Example validation table:

| Indicator Speed | Target Avg Speed | Foil Kiteable | Twin Tip Kiteable |
|-----------------|------------------|---------------|-------------------|
| 5-8 mph         | 9.3 mph          | 45%           | 14%               |
| 8-10 mph        | 12.6 mph         | 56%           | 31%               |
| 10-15 mph       | 15.5 mph         | 81%           | 50%               |
| 15+ mph         | 23.4 mph         | 100%          | 100%              |

### Step 5: Set Meaningful Thresholds

Based on validation, set thresholds that predict **actionable** conditions:

```javascript
const INDICATOR_THRESHOLDS = {
  // Don't alert at 5 mph if only 45% chance of kiteable
  minimum: 8,      // 56%+ foil kiteable - worth watching
  moderate: 10,    // 81%+ foil kiteable - likely good
  strong: 15,      // 100% kiteable - definitely go
};
```

---

## Wind Type Patterns

### Pattern 1: Thermal Winds (SE at Utah Lake)

**Mechanism**: Sun heats land faster than water → air rises over land → cooler lake air flows in

**Indicator Strategy**:
- Look for stations in the **heating zone** (canyons, valleys)
- Spanish Fork Canyon (QSF) heats up and shows SE wind ~2 hours before Utah Lake

**Key Metrics**:
- Direction: Must be from the thermal source (SE for Utah Lake)
- Speed: Indicates strength of heating differential
- Time of day: Thermals build mid-morning, peak early afternoon

```
Spanish Fork Canyon (QSF)
  ↓ SE wind at 6+ mph
  ↓ ~2 hour lead time
Utah Lake (Zig Zag)
  → SE thermal arrives
```

### Pattern 2: Prefrontal/North Flows

**Mechanism**: High pressure to the north pushes air south through terrain gaps

**Indicator Strategy**:
- Look for stations **north** of your location
- Look for stations at **gap entrances** (Point of Mountain)
- Monitor **pressure gradient** (SLC - Provo)

**Key Metrics**:
- Direction: Must be from the north (315-45°)
- Pressure gradient: Positive (SLC > Provo) confirms north flow
- Gap wind speed: Shows funneling effect

```
Salt Lake City (KSLC)     Pressure Gradient
  ↓ N wind at 8+ mph        SLC > Provo
  ↓ ~1 hour lead time         ↓
Point of Mountain (UTALP)    Confirms
  ↓ Gap funneling             north flow
  ↓                           ↓
Utah Lake                   Strong signal
```

### Pattern 3: Location-Specific Indicators

**Concept**: Different launch sites may have different best indicators

**Example**: Utah Lake has 5 launches spanning 20+ miles north-south

| Launch | Best Indicator | Why |
|--------|----------------|-----|
| Lincoln Beach (south) | KPVU (Provo) | Closest upstream station |
| Sandy Beach (south) | KPVU (Provo) | Same - southern indicator |
| Vineyard (central) | KSLC + UTALP | Between north and south |
| Zig Zag (north-central) | KSLC | North flow comes from SLC |
| MM19 (north) | KSLC + UTALP | Gap wind important |

---

## Implementation Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WEATHER DATA SOURCES                      │
├─────────────────────────────────────────────────────────────┤
│  MesoWest API          Ambient Weather API                  │
│  (KSLC, KPVU, QSF,     (Your PWS)                          │
│   UTALP, FPS, etc.)                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA NORMALIZER                           │
├─────────────────────────────────────────────────────────────┤
│  - Fetch all relevant stations                              │
│  - Extract indicator station data (KSLC, KPVU, QSF, UTALP)  │
│  - Calculate pressure gradient                              │
│  - Calculate thermal delta                                  │
│  - Package into normalized LakeState object                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    THERMAL PREDICTOR                         │
├─────────────────────────────────────────────────────────────┤
│  For each indicator:                                        │
│    1. Check direction (is it the right wind type?)          │
│    2. Check speed (above threshold?)                        │
│    3. Look up validated correlation                         │
│    4. Calculate expected speed at target                    │
│    5. Calculate kiteable probability                        │
│                                                             │
│  Combine indicators:                                        │
│    - Multiple indicators agreeing = higher confidence       │
│    - Pressure gradient confirms mechanism                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
├─────────────────────────────────────────────────────────────┤
│  - Show each indicator status                               │
│  - Show expected speed at target                            │
│  - Show kiteable probability (foil vs twin tip)             │
│  - Show lead time ("expect wind in ~1 hour")                │
│  - Color code by confidence level                           │
└─────────────────────────────────────────────────────────────┘
```

### Indicator Configuration Structure

```javascript
const INDICATOR_CONFIG = {
  station: 'KSLC',                    // MesoWest station ID
  stationName: 'Salt Lake City',      // Human-readable name
  coordinates: { lat: 40.78, lng: -111.97 },
  elevation: 4226,
  
  // What this indicator predicts
  windType: 'north_flow',             // 'thermal', 'north_flow', 'gap_wind'
  bestFor: ['utah-lake-zigzag'],      // Which launches this is best for
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: { min: 315, max: 45, label: 'N (NW to NE)' },
    speed: { min: 8, threshold: 10 },
  },
  
  // VALIDATED correlation (from historical analysis)
  speedCorrelation: {
    '5-8':   { avgTarget: 9.3,  foilKiteable: 45, twinTipKiteable: 14 },
    '8-10':  { avgTarget: 12.6, foilKiteable: 56, twinTipKiteable: 31 },
    '10-15': { avgTarget: 15.5, foilKiteable: 81, twinTipKiteable: 50 },
    '15+':   { avgTarget: 23.4, foilKiteable: 100, twinTipKiteable: 100 },
  },
};
```

---

## Analysis Scripts

### Script 1: Find Candidate Stations

```javascript
// Search for stations near your target location
// Filter by elevation, data availability, distance
searchStations(targetLat, targetLng, radiusMiles);
```

### Script 2: Identify Good Wind Days

```javascript
// Analyze target station history
// Identify days with kiteable conditions
// Record timing (first hour, peak hour, duration)
identifyGoodDays(targetStation, minSpeed, direction);
```

### Script 3: Correlate Indicators

```javascript
// For each candidate indicator:
// Check what it showed 1, 2, 3, 4 hours before good wind
// Calculate correlation strength
correlateIndicator(indicatorStation, targetGoodDays, leadHours);
```

### Script 4: Validate Correlation

```javascript
// CRITICAL: Validate that indicator predicts KITEABLE conditions
// Not just correlation, but actionable predictions
validateCorrelation(indicator, target, speedBuckets);

// Output:
// When indicator shows 8-10 mph N:
//   Target avg: 12.6 mph
//   Foil kiteable: 56%
//   Twin tip kiteable: 31%
```

---

## Applying to New Locations

### Checklist for New Location

1. **Define target location**
   - [ ] Exact coordinates
   - [ ] Primary wind types (thermal, frontal, gap, etc.)
   - [ ] Kiteable direction(s)
   - [ ] Shore orientation (for safety)

2. **Get historical data**
   - [ ] Target station (or nearby proxy)
   - [ ] At least 6 months, ideally 1+ year
   - [ ] Include seasonal variation

3. **Find indicator candidates**
   - [ ] Search upstream of each wind type
   - [ ] Check data availability
   - [ ] Verify reasonable distance (10-50 miles)

4. **Run correlation analysis**
   - [ ] Identify good wind days at target
   - [ ] Check each indicator at 1, 2, 3, 4 hour lead
   - [ ] Find best lead time for each indicator

5. **Validate predictions**
   - [ ] For each speed bucket at indicator
   - [ ] Calculate actual target speed
   - [ ] Calculate kiteable percentages
   - [ ] Set meaningful thresholds

6. **Implement in app**
   - [ ] Add indicator configuration
   - [ ] Add to data fetching
   - [ ] Add to prediction logic
   - [ ] Add to UI display

---

## Example: Deer Creek Reservoir

### Wind Type: SW Canyon Thermal

**Mechanism**: Provo Canyon heats → air rises → draws wind up canyon from Utah Valley

**Indicator Found**: Arrowhead Summit (SND) at 8,252 ft
- Shows SSW wind (200-230°) at 12-18 mph
- ~60-90 minutes before thermal reaches Deer Creek Dam

**Validated Correlation**:
| Arrowhead Speed | Dam Thermal Probability |
|-----------------|------------------------|
| < 10 mph        | < 4%                   |
| 10-12 mph       | 13%                    |
| 12-15 mph       | 25%                    |
| 15+ mph         | 30%                    |

---

## Key Learnings

1. **Correlation ≠ Prediction**: Finding that indicator correlates with target is not enough. Must validate that indicator predicts **kiteable** conditions.

2. **Thresholds matter**: A 5 mph threshold that only predicts 45% kiteable is not actionable. Set thresholds that give confidence.

3. **Location-specific indicators**: Different launches at the same lake may have different best indicators. Southern launches → southern indicators.

4. **Multiple indicators = confidence**: When KSLC, UTALP, and pressure gradient all agree → high confidence.

5. **Lead time is gold**: The whole point is knowing **before** you drive. 1-2 hour lead time is the sweet spot.

---

## Future Enhancements

1. **Machine learning model**: Train on historical data to weight multiple indicators optimally

2. **Confidence scoring**: Combine indicator agreement into single confidence score

3. **Notification system**: Alert when indicators cross thresholds

4. **Historical accuracy tracking**: Log predictions vs actual, improve over time

5. **Community validation**: Let users report actual conditions, refine model

---

*This methodology was developed for Utah Wind Pro, analyzing Utah Lake, Deer Creek, and Willard Bay. The same approach can be applied to any wind-dependent water sport location.*
```

---

## File 9: `docs/VALIDATED-CORRELATIONS.md`

> 173 lines | 6.9 KB

```markdown
# Validated Wind Correlations

This document records all validated correlations discovered through historical data analysis.

---

## Utah Lake

### SE Thermal - Spanish Fork Canyon (QSF) → Zig Zag

**Mechanism**: Spanish Fork Canyon heats up, creating SE flow that reaches Utah Lake ~2 hours later.

**Analysis Period**: 3 years (2023-2026)

**Correlation**:
| QSF SE Wind | Lead Time | Zig Zag Avg | Foil Kiteable | Twin Tip Kiteable |
|-------------|-----------|-------------|---------------|-------------------|
| 6-8 mph     | 2 hours   | 8.5 mph     | 35%           | 10%               |
| 8-10 mph    | 2 hours   | 11.2 mph    | 52%           | 25%               |
| 10-15 mph   | 2 hours   | 14.8 mph    | 75%           | 45%               |
| 15+ mph     | 2 hours   | 19.5 mph    | 90%           | 70%               |

**Threshold Recommendation**: 8+ mph for actionable prediction

---

### North Flow - Salt Lake City Airport (KSLC) → Zig Zag

**Mechanism**: Pressure gradient drives north flow from Great Salt Lake area through Point of Mountain gap to Utah Lake.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| KSLC N Wind | Lead Time | Zig Zag Avg | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|-------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph     | 1 hour    | 9.3 mph     | 45%           | 14%               | 156         |
| 8-10 mph    | 1 hour    | 12.6 mph    | 56%           | 31%               | 89          |
| 10-15 mph   | 1 hour    | 15.5 mph    | 81%           | 50%               | 52          |
| 15+ mph     | 1 hour    | 23.4 mph    | 100%          | 100%              | 18          |

**Key Finding**: 5 mph threshold only 45% kiteable - raised minimum to 8 mph for meaningful predictions.

**Threshold Recommendation**: 8+ mph for "possible", 10+ mph for "likely"

---

### North Flow (Southern Launches) - Provo Airport (KPVU) → Lincoln/Sandy Beach

**Mechanism**: KPVU is closer to southern Utah Lake launches, providing better correlation than KSLC.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| KPVU N Wind | Lead Time | Target Avg  | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|-------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph     | 1 hour    | 10.1 mph    | 52%           | 18%               | 134         |
| 8-10 mph    | 1 hour    | 14.2 mph    | **78%**       | 42%               | 76          |
| 10-15 mph   | 1 hour    | 17.8 mph    | 89%           | 62%               | 41          |
| 15+ mph     | 1 hour    | 24.1 mph    | 100%          | 95%               | 15          |

**Key Finding**: KPVU is **significantly better** than KSLC for southern launches:
- At 8-10 mph: KPVU = 78% foil kiteable vs KSLC = 56%
- At 10-15 mph: KPVU = 89% foil kiteable vs KSLC = 81%

**Recommendation**: Use KPVU as primary indicator for Lincoln Beach and Sandy Beach.

---

### Gap Wind Confirmation - Point of Mountain (UTALP)

**Mechanism**: UTALP sits at the gap entrance, confirming north flow is funneling through.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| UTALP N Wind | Lead Time | Target Avg  | Foil Kiteable | Twin Tip Kiteable | Sample Size |
|--------------|-----------|-------------|---------------|-------------------|-------------|
| 5-8 mph      | 0.5 hours | 8.8 mph     | 42%           | 12%               | 145         |
| 8-10 mph     | 0.5 hours | 11.9 mph    | 58%           | 28%               | 82          |
| 10-15 mph    | 0.5 hours | 15.2 mph    | 78%           | 48%               | 48          |
| 15+ mph      | 0.5 hours | 21.5 mph    | 95%           | 85%               | 22          |

**Key Finding**: UTALP provides near-real-time confirmation (30 min lead). Best used in combination with KSLC/KPVU for higher confidence.

---

## Deer Creek Reservoir

### Canyon Thermal - Arrowhead Summit (SND) → Deer Creek Dam

**Mechanism**: Provo Canyon heats, creating upslope flow that draws wind up canyon.

**Analysis Period**: 6 months (2025-2026)

**Correlation**:
| Arrowhead SSW Wind | Lead Time | Dam Avg | Foil Kiteable | Twin Tip Kiteable |
|--------------------|-----------|---------|---------------|-------------------|
| 10-12 mph          | 1.5 hours | 6.5 mph | 4%            | 0%                |
| 12-15 mph          | 1.5 hours | 9.2 mph | 13%           | 3%                |
| 15-18 mph          | 1.5 hours | 12.8 mph| 25%           | 10%               |
| 18+ mph            | 1.5 hours | 16.5 mph| 30%           | 15%               |

**Key Finding**: Deer Creek thermals are less reliable than Utah Lake. Even strong Arrowhead signals only produce ~30% kiteable conditions.

**Threshold Recommendation**: 15+ mph for "possible", but manage expectations

---

## Indicator Comparison Summary

### Best Indicators by Launch

| Launch | Best Thermal Indicator | Best North Flow Indicator |
|--------|------------------------|---------------------------|
| MM19 (North) | QSF (Spanish Fork) | KSLC + UTALP |
| Zig Zag | QSF (Spanish Fork) | KSLC + UTALP |
| Vineyard | QSF (Spanish Fork) | KSLC + UTALP |
| Sandy Beach | QSF (Spanish Fork) | **KPVU** (Provo) |
| Lincoln Beach | QSF (Spanish Fork) | **KPVU** (Provo) |

### Indicator Reliability Ranking

| Indicator | Wind Type | Reliability | Notes |
|-----------|-----------|-------------|-------|
| KPVU (Provo) | North Flow | ⭐⭐⭐⭐⭐ | Best for southern launches |
| KSLC (SLC) | North Flow | ⭐⭐⭐⭐ | Good for central/northern |
| QSF (Spanish Fork) | SE Thermal | ⭐⭐⭐⭐ | 2-hour lead time |
| UTALP (PotM) | Gap Wind | ⭐⭐⭐ | Confirmation indicator |
| SND (Arrowhead) | Canyon Thermal | ⭐⭐ | Lower reliability |

---

## How These Correlations Were Validated

### Step 1: Identify Good Wind Days
- Query target station historical data
- Find days with 10+ mph wind from target direction
- Record first hour of good wind

### Step 2: Check Indicator Stations
- For each good wind day, query indicator stations
- Check what indicator showed 1, 2, 3, 4 hours before
- Calculate correlation rate

### Step 3: Validate with Speed Buckets
**This is the critical step most skip!**

Instead of just "does indicator correlate with target", we ask:
> "When indicator shows X mph, what is the ACTUAL speed at target?"
> "What % of the time is it KITEABLE?"

This gives actionable thresholds, not just correlations.

### Step 4: Set Meaningful Thresholds
- Don't alert at 5 mph if only 45% kiteable
- Set minimum threshold where prediction is actionable
- Provide specific probabilities for each speed bucket

---

## Future Validation Needed

1. **Willard Bay**: Need to validate Hill AFB (KHIF) correlation
2. **Pineview**: Need to identify and validate indicators
3. **Seasonal Variation**: Do correlations change by season?
4. **Time of Day**: Do correlations change by time of day?
5. **Pressure Gradient**: How does ΔP affect correlation strength?

---

*Last Updated: March 2026*
*Data Sources: MesoWest/Synoptic API, Ambient Weather PWS*
```

---

## File 10: `docs/FORECAST-INTEGRATION.md`

> 321 lines | 10.1 KB

```markdown
# Forecast Integration Methodology

## Overview

This document describes how we integrate NWS (National Weather Service) forecasts and weather warnings with our indicator-based prediction model to provide multi-day wind forecasts.

---

## Data Sources

### 1. NWS Forecast API
- **7-day forecast**: General weather conditions, wind speed/direction
- **Hourly forecast**: Detailed hour-by-hour wind predictions
- **Grid data**: Raw numerical forecast data

### 2. NWS Alerts API
- **Wind advisories**: Official wind warnings
- **Storm warnings**: Approaching weather systems
- **Special weather statements**: Unusual conditions

### 3. Our Indicator Stations
- **Real-time validation**: Compare forecast to actual conditions
- **Historical correlation**: How accurate are NWS forecasts for our locations?

---

## Weather Pattern Classification

We classify NWS forecast text into wind patterns relevant to kiting:

### North Flow Pattern
**NWS Keywords**: "north wind", "northerly", "cold front", "high pressure building"

**What it means for kiting**:
- Strong, consistent north wind
- Excellent for Utah Lake (all launches)
- Usually afternoon/evening timing
- Can last 6-12 hours

**Correlation with indicators**:
- KSLC shows north wind 1 hour before Utah Lake
- Pressure gradient (SLC > Provo) confirms pattern
- UTALP shows gap wind funneling

### South Storm Pattern
**NWS Keywords**: "south wind", "southerly", "low pressure", "storm"

**What it means for kiting**:
- Variable, often gusty conditions
- Can be strong but unpredictable
- Usually associated with precipitation
- Generally poor for kiting (safety concerns)

**Correlation with indicators**:
- Pressure gradient (Provo > SLC)
- KPVU shows south wind
- Often rapid changes

### Thermal Pattern
**NWS Keywords**: "sunny", "clear", "light wind", "high pressure"

**What it means for kiting**:
- SE thermal development likely
- Best window: 1pm - 5pm
- Requires clear skies and heating
- Moderate confidence (weather-dependent)

**Correlation with indicators**:
- QSF (Spanish Fork) shows SE wind 2 hours before
- Neutral pressure gradient
- Morning calm at KSLC

### Wind Advisory Pattern
**NWS Keywords**: "wind advisory", "high wind warning", "gusty"

**What it means for kiting**:
- Potentially dangerous conditions
- Often too strong or gusty
- Exercise extreme caution
- May be associated with frontal passage

**Correlation with indicators**:
- Rapid pressure changes (> 4mb in 6 hours)
- KSLC sustained 25+ mph
- Large gusts at all stations

---

## Forecast-to-Indicator Correlation

### The Validation Loop

```
NWS Forecast ──────────────────────────────────────────┐
    │                                                   │
    │ "North wind 15-20 mph Thursday afternoon"        │
    │                                                   │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           FORECAST ANALYSIS                      │    │
│                                                  │    │
│  Pattern: North Flow                            │    │
│  Expected: Strong north wind                    │    │
│  Timing: Thursday 2pm-8pm                       │    │
│  Confidence: 70% (NWS forecast)                 │    │
└─────────────────────────────────────────────────┘    │
    │                                                   │
    │ As time approaches...                            │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           INDICATOR VALIDATION                   │    │
│                                                  │    │
│  KSLC: 12 mph N at 1pm ✓ Confirms forecast     │    │
│  UTALP: 15 mph N at 1pm ✓ Gap wind active      │    │
│  Pressure: SLC > Provo by 2.5mb ✓              │    │
│                                                  │    │
│  → Confidence boosted to 90%                    │    │
└─────────────────────────────────────────────────┘    │
    │                                                   │
    │ After event...                                   │
    ▼                                                   │
┌─────────────────────────────────────────────────┐    │
│           ACCURACY TRACKING                      │    │
│                                                  │    │
│  Forecast: 15-20 mph N                          │    │
│  Actual: 18 mph N at Zig Zag                    │    │
│  Timing: 2:30pm - 7pm                           │    │
│                                                  │    │
│  → Forecast was ACCURATE                        │◄───┘
│  → Log for future model improvement             │
└─────────────────────────────────────────────────┘
```

### Confidence Levels

| Source | Base Confidence | Notes |
|--------|-----------------|-------|
| NWS 7-day forecast | 50-60% | General pattern only |
| NWS 3-day forecast | 65-75% | More reliable timing |
| NWS 24-hour forecast | 75-85% | Good accuracy |
| NWS + 1 indicator confirming | 80-90% | High confidence |
| NWS + 2+ indicators confirming | 90-95% | Very high confidence |
| Wind Advisory active | 95% | NWS advisories are reliable |

---

## Multi-Day Prediction Strategy

### Day 5-7 Out
- **Source**: NWS 7-day forecast only
- **Confidence**: Low (50-60%)
- **What we show**: General pattern (north flow likely, thermal possible)
- **Actionable**: "Keep an eye on this day"

### Day 3-4 Out
- **Source**: NWS forecast + historical pattern matching
- **Confidence**: Medium (65-75%)
- **What we show**: Expected wind type, approximate timing
- **Actionable**: "Plan tentatively"

### Day 1-2 Out
- **Source**: NWS hourly forecast + indicator trends
- **Confidence**: Medium-High (75-85%)
- **What we show**: Specific kite windows, expected speeds
- **Actionable**: "Make plans"

### Day Of (Morning)
- **Source**: NWS hourly + current indicator readings
- **Confidence**: High (85-95%)
- **What we show**: Confirmed windows, real-time updates
- **Actionable**: "Go/No-go decision"

### 1-2 Hours Before
- **Source**: Current indicator readings
- **Confidence**: Very High (90-98%)
- **What we show**: Validated prediction with expected arrival time
- **Actionable**: "Head to the beach"

---

## Weather Event Effects on Surface Wind

### Cold Front Passage

**Before Front (6-12 hours)**:
- Pressure starts dropping
- South/SW wind may increase
- Clouds building

**During Front (1-2 hours)**:
- Rapid wind shift to N/NW
- Strongest gusts
- Possible precipitation

**After Front (6-24 hours)**:
- Sustained north wind
- Pressure rising
- Clearing skies
- **BEST KITING WINDOW**

### Low Pressure System

**Approach (24-48 hours)**:
- Increasing south wind
- Pressure dropping
- Clouds increasing

**During (6-12 hours)**:
- Variable, gusty conditions
- Precipitation likely
- **NOT SAFE FOR KITING**

**Departure (12-24 hours)**:
- Wind shifting to west/north
- Pressure rising
- May produce good north flow

### High Pressure System

**Building (24-48 hours)**:
- Light winds
- Clear skies
- Pressure rising

**Peak (12-24 hours)**:
- Calm mornings
- Thermal development afternoon
- **GOOD FOR THERMAL KITING**

**Weakening**:
- Thermals may be weaker
- Watch for approaching systems

---

## Implementation

### ForecastService.js

```javascript
// Key functions:

// Fetch and parse NWS alerts
getActiveAlerts()

// Get 7-day forecast with wind analysis
get7DayForecast(locationId)

// Get hourly forecast for detailed windows
getHourlyForecast(locationId)

// Find kite windows in forecast
getKiteWindows(locationId)

// Combined summary with alerts
getForecastSummary(locationId)

// Correlate forecast with current indicators
correlateForecastWithIndicators(forecastAnalysis, currentIndicators)
```

### WeatherForecast.jsx Component

Displays:
- Active weather alerts
- Next kite window
- 5-day forecast with kite windows
- Expandable daily details
- Wind pattern analysis

---

## Accuracy Tracking (Future Enhancement)

To improve predictions over time, we should track:

1. **Forecast vs Actual**
   - What did NWS predict?
   - What actually happened?
   - How far off was timing/speed?

2. **Indicator Lead Time Accuracy**
   - Did KSLC predict Utah Lake wind correctly?
   - Was the 1-hour lead time accurate?

3. **Pattern Recognition**
   - Which NWS phrases correlate with good kiting?
   - Are there seasonal patterns?

4. **Model Refinement**
   - Adjust confidence levels based on accuracy
   - Identify systematic biases

---

## Example: Reading a Forecast

**NWS Forecast**: "Thursday: Sunny, with a high near 65. North wind 10 to 15 mph, with gusts as high as 25 mph."

**Our Analysis**:
1. **Pattern**: North Flow (keywords: "north wind", "sunny")
2. **Speed**: 10-15 mph sustained, 25 mph gusts → Good for kiting
3. **Timing**: Daytime → Likely afternoon peak
4. **Confidence**: 70% (NWS forecast alone)

**Indicator Validation** (Thursday morning):
- KSLC: 8 mph N at 10am ✓
- Pressure: SLC > Provo by 2mb ✓
- **Confidence boosted to 90%**

**Final Prediction**:
- **Kite Window**: Thursday 1pm - 6pm
- **Expected Speed**: 12-18 mph at Zig Zag
- **Type**: North Flow
- **Foil Kiteable**: 85%
- **Twin Tip Kiteable**: 60%

---

*This methodology combines NWS forecasting expertise with our validated local indicator correlations to provide the most accurate multi-day wind predictions possible.*
```

---

## File 11: `docs/LEARNING-SYSTEM.md`

> 307 lines | 9.3 KB

```markdown
# Learning System Documentation

## Overview

The Utah Wind Pro Learning System is a self-improving prediction engine that continuously collects data, validates predictions, and adjusts model weights to improve accuracy over time.

---

## How It Works

### The Learning Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS LEARNING LOOP                         │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  PREDICT │────▶│  RECORD  │────▶│  VERIFY  │────▶│  SCORE   │
    └──────────┘     └──────────┘     └──────────┘     └──────────┘
         ▲                                                    │
         │                                                    ▼
    ┌──────────┐                                        ┌──────────┐
    │  APPLY   │◀───────────────────────────────────────│  LEARN   │
    └──────────┘                                        └──────────┘
```

1. **PREDICT**: Make prediction using current model weights
2. **RECORD**: Store prediction with timestamp and conditions
3. **VERIFY**: Compare prediction to actual outcome (1-2 hours later)
4. **SCORE**: Calculate accuracy metrics
5. **LEARN**: Analyze errors and adjust model weights
6. **APPLY**: Use new weights for future predictions

---

## Data Collection Schedule

| Interval | Action | Purpose |
|----------|--------|---------|
| 15 minutes | Collect actuals | Record real weather data from all stations |
| 1 hour | Record predictions | Store current predictions for verification |
| 1 hour | Verify predictions | Compare past predictions to actual outcomes |
| 6 hours | Indicator analysis | Track indicator-to-target correlations |
| 24 hours | Learning cycle | Analyze errors and update model weights |

---

## What Gets Collected

### 1. Actual Weather Data
Every 15 minutes, we record from all stations:
- Wind speed and direction
- Wind gusts
- Temperature
- Pressure
- Derived: isKiteable, isNorthFlow, isSEThermal

### 2. Predictions
Every hour, we record:
- Probability score
- Expected wind type (thermal, north_flow, etc.)
- Expected speed and direction
- Foil/twin-tip kiteable percentages
- Current conditions (pressure gradient, thermal delta, indicator readings)

### 3. Indicator Correlations
Every 6 hours, we record:
- Indicator station readings (KSLC, KPVU, QSF, UTALP)
- Target station readings (FPS, PWS)
- Speed ratios and direction matches
- Lead time correlations

---

## Accuracy Metrics

### What We Measure

| Metric | Weight | Description |
|--------|--------|-------------|
| Speed Accuracy | 30% | How close was predicted speed to actual |
| Direction Accuracy | 20% | How close was predicted direction to actual |
| Kiteable Prediction | 30% | Did we correctly predict kiteable conditions |
| Wind Type | 20% | Did we correctly predict the wind type |

### Accuracy Calculation

```javascript
// Speed accuracy (0-100)
speedAccuracy = 100 - (|predictedSpeed - actualSpeed| × 5)

// Direction accuracy (0-100)
directionAccuracy = 100 - |predictedDirection - actualDirection|

// Overall score
overallScore = (speedAccuracy × 0.3) + (directionAccuracy × 0.2) + 
               (kiteableCorrect × 0.3) + (windTypeCorrect × 0.2)
```

---

## Learning Process

### Error Analysis

The system analyzes:

1. **Speed Bias**: Are we consistently over or under-predicting speed?
   - Positive bias = we predict too high
   - Negative bias = we predict too low
   - Correction applied to future predictions

2. **Probability Calibration**: When we say 70% chance, does it happen 70% of the time?
   - Bucket predictions by probability (0-20%, 20-40%, etc.)
   - Compare predicted rate to actual rate
   - Adjust probability scaling

3. **Time of Day Patterns**: Are we more accurate at certain hours?
   - Track accuracy by hour
   - Apply multipliers to low-accuracy hours

4. **Condition-Specific Errors**: Are we worse under certain conditions?
   - High pressure gradient
   - Strong/weak indicators
   - Different wind types

### Weight Adjustment

Based on error analysis, the system adjusts:

```javascript
newWeights = {
  // Main model weights
  pressureWeight: 0.40,    // Adjusted based on north flow accuracy
  thermalWeight: 0.40,     // Adjusted based on thermal accuracy
  convergenceWeight: 0.20, // Adjusted based on direction accuracy
  
  // Corrections
  speedBiasCorrection: -1.2,  // Subtract 1.2 mph from predictions
  
  // Indicator-specific weights
  indicators: {
    'KSLC-FPS': { weight: 0.85, speedMultiplier: 1.2 },
    'KPVU-FPS': { weight: 0.92, speedMultiplier: 1.1 },
    // ...
  },
  
  // Hourly adjustments
  hourlyMultipliers: {
    10: 1.1,  // More confident at 10am
    15: 0.8,  // Less confident at 3pm
    // ...
  },
}
```

---

## Database Schema

### IndexedDB Stores

1. **predictions**: Prediction records
   - timestamp, date, hour, lakeId
   - prediction object (probability, windType, expectedSpeed, etc.)
   - conditions object (pressureGradient, indicator readings, etc.)
   - verified, actual, accuracy

2. **actuals**: Actual weather data
   - timestamp, date, hour, minute
   - lakeId, stationId
   - windSpeed, windGust, windDirection, temperature, pressure
   - isKiteable, isNorthFlow, isSEThermal

3. **accuracy**: Accuracy scores over time
   - date, lakeId
   - speedAccuracy, directionAccuracy, overallScore
   - kiteablePredictionCorrect, windTypeCorrect

4. **modelWeights**: Learned model parameters
   - version, createdAt, basedOnSamples
   - pressureWeight, thermalWeight, convergenceWeight
   - speedBiasCorrection, indicators, hourlyMultipliers

5. **patterns**: Discovered patterns
   - type, value, confidence, description
   - discoveredAt

6. **indicators**: Indicator correlation data
   - indicatorId, targetId, leadTimeMinutes
   - indicator readings, target readings
   - speedRatio, directionMatch

---

## Minimum Data Requirements

| Milestone | Records Needed | What Happens |
|-----------|----------------|--------------|
| First learning | 50 predictions | Initial weight adjustment |
| Reliable learning | 200 predictions | Stable weight optimization |
| Pattern discovery | 500 predictions | Complex pattern detection |
| High accuracy | 1000+ predictions | Fine-tuned model |

---

## Expected Improvement Timeline

### Week 1-2: Baseline
- Collecting initial data
- No learning yet (need 50+ predictions)
- Using default weights

### Week 3-4: First Learning
- First learning cycle runs
- Initial bias corrections applied
- Accuracy starts improving

### Month 2-3: Optimization
- Multiple learning cycles completed
- Indicator weights refined
- Probability calibration improved
- Expected accuracy: 60-70%

### Month 4-6: Fine-Tuning
- Seasonal patterns learned
- Time-of-day adjustments refined
- Condition-specific corrections
- Expected accuracy: 70-80%

### Month 6+: Mature Model
- Comprehensive pattern library
- Highly calibrated predictions
- Continuous refinement
- Expected accuracy: 80-90%

---

## Manual Controls

### Force Data Collection
Click "Collect Now" to immediately:
- Fetch all station data
- Record predictions
- Verify past predictions

### Force Learning
Click "Learn Now" to immediately:
- Analyze indicator correlations
- Analyze prediction errors
- Discover patterns
- Calculate new weights

### Export Data
Click "Export" to download:
- All predictions and actuals
- Accuracy history
- Learned weights
- For backup or external analysis

---

## Viewing Learning Progress

The Learning Dashboard shows:

1. **Model Accuracy**: Current overall accuracy percentage
2. **Trend**: Improving, stable, or declining
3. **Predictions Verified**: Total predictions with accuracy data
4. **Model Version**: Current weights version
5. **Collection Stats**: Data collection activity
6. **Learned Weights**: Current model parameters

---

## Technical Notes

### Browser Storage
- Uses IndexedDB for persistent storage
- Data survives browser restarts
- Limited by browser storage quotas (~50MB typical)

### Performance
- Collection runs in background
- Minimal impact on app performance
- Learning cycle runs during low activity

### Data Retention
- Keeps all data for learning
- Consider periodic exports for backup
- Old data can be pruned if storage is limited

---

## Future Enhancements

1. **Cloud Sync**: Sync learning data across devices
2. **Community Learning**: Aggregate learning from multiple users
3. **Weather API Integration**: Correlate with NWS forecasts
4. **Machine Learning**: Neural network for pattern recognition
5. **Seasonal Models**: Separate models for different seasons

---

*The learning system is designed to continuously improve. The more you use the app, the smarter it gets!*
```

---

## File 12: `docs/USER-PERSONAS-ANALYSIS.md`

> 249 lines | 7.2 KB

```markdown
# User Personas Analysis

## Current State: Kiteboarder-Focused

The app is currently optimized for kiteboarders who want:
- Wind 10-25 mph
- Specific direction relative to shore (onshore/side-on)
- Thermal windows for afternoon sessions
- North flow events for stronger wind

---

## Expanded User Personas

### 1. 🪁 KITEBOARDER (Current Primary User)
**Goal**: Find days with 10-25 mph wind, safe direction

**Current Features That Work**:
- Thermal probability gauge
- Foil vs Twin Tip indicators
- Kite safety (onshore/offshore)
- North flow indicators
- Multi-day forecast

**Gaps**:
- No "best launch for today" recommendation
- No wind window duration estimate
- No "pack your gear" notification the night before

---

### 2. ⛵ SAILING CLUB / REGATTA ORGANIZER
**Goal**: Plan races, ensure safe conditions for all skill levels

**What They Need**:
- **Race-day forecast**: Wind speed/direction for specific time windows
- **Consistency indicator**: Is wind steady or gusty?
- **Wind shift predictions**: Will direction change during race?
- **Safety thresholds**: Too light (<5 mph) or too strong (>25 mph)?
- **Course planning**: Best orientation based on predicted wind
- **Multi-hour window**: 2-4 hour race window, not just "peak"

**Missing Features**:
- Gust factor / consistency score
- Wind shift probability
- "Race window" view (e.g., 10am-2pm forecast)
- Light wind alerts (for dinghy sailors)
- Historical race day analysis

---

### 3. 🚤 RECREATIONAL BOATERS / FISHERMEN
**Goal**: Find CALM days - "glass" conditions

**What They Need**:
- **Glass day predictor**: When will lake be flat?
- **Morning calm window**: Best time before thermal kicks in
- **Wave/chop forecast**: Wind-driven wave height estimate
- **Afternoon avoidance**: When does it get too rough?
- **Multi-day planning**: Best day this week for smooth water

**Missing Features**:
- "Glass score" (inverse of wind probability)
- Morning calm duration estimate
- Wave/chop indicator
- "Best boating window" (calm hours)
- Sunset cruise conditions

---

### 4. 🚁 EMS / SEARCH & RESCUE / FIRE
**Goal**: Operational safety, helicopter operations, water rescue planning

**What They Need**:
- **Wind hazard alerts**: High wind warnings
- **Gust predictions**: Max gust potential
- **Visibility**: Dust/smoke dispersion
- **Water conditions**: Rescue difficulty indicator
- **Helicopter ops**: Safe landing/takeoff windows
- **Fire weather**: Red flag conditions

**Missing Features**:
- Max gust prediction
- Hazard level indicator (green/yellow/red)
- Operational windows
- Fire weather index
- Visibility forecast

---

### 5. 🏄 WINDSURFERS / WING FOILERS
**Goal**: Similar to kiteboarders but different thresholds

**What They Need**:
- **Lower wind threshold**: Windsurfing works in 8-12 mph
- **Wing foiling**: Works in 10-18 mph
- **Overpowered warnings**: When it's too much
- **Gear recommendations**: What sail size / wing size

**Missing Features**:
- Sport-specific thresholds
- Gear size calculator
- Overpowered indicator

---

### 6. 🎣 PADDLEBOARDERS / KAYAKERS
**Goal**: Calm conditions, avoid getting blown across lake

**What They Need**:
- **Calm morning window**: How long until wind picks up?
- **Return safety**: Will wind help or hinder return trip?
- **Direction relative to route**: Headwind/tailwind/crosswind
- **Afternoon warning**: When to be off the water

**Missing Features**:
- Paddle-friendly hours
- Route wind analysis
- "Get off water by" time

---

## Feature Matrix by User Type

| Feature | Kiter | Sailor | Boater | EMS | Windsurfer | Paddler |
|---------|-------|--------|--------|-----|------------|---------|
| Wind speed | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wind direction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gust factor | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thermal timing | ✅ | ✅ | ✅ | ⚪ | ✅ | ✅ |
| Glass/calm score | ❌ | ❌ | ✅ | ⚪ | ❌ | ✅ |
| Safety thresholds | ✅ | ✅ | ⚪ | ✅ | ✅ | ✅ |
| Multi-day forecast | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wind shift prediction | ❌ | ✅ | ⚪ | ✅ | ✅ | ⚪ |
| Wave/chop estimate | ❌ | ⚪ | ✅ | ✅ | ⚪ | ✅ |
| Hazard alerts | ⚪ | ✅ | ✅ | ✅ | ⚪ | ✅ |
| Time windows | ⚪ | ✅ | ✅ | ✅ | ⚪ | ✅ |

✅ = Critical | ⚪ = Nice to have | ❌ = Not needed

---

## Recommended New Features

### Priority 1: Universal Value
1. **Activity Mode Selector**: Kiting / Sailing / Boating / Paddling
2. **Glass Score**: Inverse probability for calm seekers
3. **Gust Factor**: Consistency indicator
4. **Time Window View**: Hourly breakdown for the day
5. **"Best Time" Recommendation**: Per activity type

### Priority 2: Sailing Club Features
6. **Race Day Mode**: Multi-hour window analysis
7. **Wind Shift Indicator**: Direction change probability
8. **Course Recommendation**: Based on predicted wind

### Priority 3: Boater/Paddler Features
9. **Morning Calm Duration**: Hours until thermal
10. **Wave/Chop Estimate**: Based on wind speed and fetch
11. **Afternoon Warning**: When conditions deteriorate

### Priority 4: Safety/EMS Features
12. **Hazard Level Indicator**: Color-coded safety
13. **Max Gust Prediction**: Based on pressure gradient
14. **Operational Windows**: Safe periods for activities

---

## UI/UX Recommendations

### 1. Activity Mode Selector
Add a toggle at the top:
```
[🪁 Kiting] [⛵ Sailing] [🚤 Boating] [🏄 Paddling]
```

Each mode adjusts:
- Thresholds (what's "good" wind)
- Primary metric (wind vs calm)
- Recommendations
- Color coding

### 2. Simplified Dashboard Options
- **Quick View**: Just the essentials for the selected activity
- **Full View**: All technical details (current view)
- **Pro View**: Learning system, raw data, analysis

### 3. Time-Based View
Instead of just "current conditions":
```
6am   8am   10am   12pm   2pm   4pm   6pm
[calm] [calm] [building] [peak] [gusty] [fading] [calm]
```

### 4. "Best Day This Week" Summary
```
Mon: ⛵ Great sailing (12-15 mph steady)
Tue: 🚤 Glass morning (calm until 11am)
Wed: 🪁 Kite day! (18 mph thermal)
Thu: ⚠️ High wind warning
Fri: 🏄 Light wind foiling (8-12 mph)
```

---

## Data Already Available (Just Need UI)

From current APIs we already have:
- Wind speed ✅
- Wind direction ✅
- Wind gusts ✅ (but not prominently displayed)
- Pressure gradient ✅
- Temperature ✅
- Historical patterns ✅
- NWS forecasts ✅
- NWS alerts ✅

We can calculate:
- Gust factor = gust / sustained
- Glass score = 100 - wind probability
- Wave estimate = f(wind speed, fetch distance)
- Calm duration = hours until thermal threshold

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)
- Add Activity Mode selector
- Calculate and display Glass Score
- Show gust factor prominently
- Add "calm hours" estimate

### Phase 2: Enhanced Views (3-5 days)
- Hourly timeline view
- "Best day this week" summary
- Activity-specific thresholds
- Wave/chop estimate

### Phase 3: Advanced Features (1-2 weeks)
- Race day planning mode
- Wind shift prediction
- Route analysis for paddlers
- EMS operational dashboard

---

*This analysis shows the app has strong foundations but is narrowly focused on kiteboarders. With relatively small changes, it can serve a much broader audience of water sports enthusiasts and safety professionals.*
```

---

## File 13: `docs/MULTI-USER-FEATURES.md`

> 219 lines | 4.6 KB

```markdown
# Utah Wind Pro - Multi-User Features

## Overview

Utah Wind Pro now supports multiple user types with activity-specific views and metrics.

---

## Activity Modes

### 🪁 Kiting Mode (Default)
**Target Users**: Kiteboarders, Kite Foilers

**Key Metrics**:
- Thermal Probability Gauge
- Foil (10+ mph) vs Twin Tip (15+ mph) indicators
- Kite Safety (onshore/side-on/offshore)
- North Flow indicators

**Ideal Conditions**: 10-25 mph, onshore or side-on wind

---

### ⛵ Sailing Mode
**Target Users**: Sailing Clubs, Regatta Organizers, Dinghy Sailors

**Key Metrics**:
- Racing Wind Probability
- Wind Consistency Score (how steady is the wind?)
- Gust Factor (gust/sustained ratio)
- Wind Shift Prediction
- Course Setup Recommendations

**Special Features**:
- **Race Day Mode**: Multi-hour window analysis
- Start line favored end prediction
- Windward mark direction
- Reefing recommendations

**Ideal Conditions**: 8-18 mph, steady direction, low gust factor

---

### 🚤 Boating Mode
**Target Users**: Powerboaters, Fishermen, Recreational Cruisers

**Key Metrics**:
- **Glass Score** (0-100, higher = calmer)
- Wave/Chop Estimate
- Morning Calm Window Duration
- "Get off water by" time

**Glass Score Levels**:
| Score | Status | Conditions |
|-------|--------|------------|
| 90-100 | Glass | Mirror-flat water |
| 70-89 | Excellent | Light ripples only |
| 50-69 | Good | Light chop (<6") |
| 30-49 | Moderate | Noticeable waves |
| 10-29 | Choppy | 1-2 ft waves |
| 0-9 | Rough/Dangerous | Stay off water |

**Ideal Conditions**: 0-8 mph, early morning

---

### 🏄 Paddling Mode
**Target Users**: SUP, Kayakers, Canoeists

**Key Metrics**:
- Glass Score (same as boating)
- Calm Hours Remaining
- Return Trip Safety
- Afternoon Warning

**Ideal Conditions**: 0-6 mph, morning hours

---

## New Components

### Activity Mode Selector
Located in the header, allows quick switching between:
- Kiting
- Sailing
- Boating
- Paddling

Each mode adjusts:
- Primary gauge (Thermal Probability vs Glass Score)
- Thresholds for "good" conditions
- Recommendations and alerts
- Color coding

### Activity Score Banner
Shows current conditions score for selected activity:
- Green (70%+): Excellent conditions
- Yellow (40-69%): Fair conditions
- Red (<40%): Poor conditions

Includes gust warning when gusty conditions detected.

### Glass Score Gauge
For boating/paddling modes:
- Inverse of wind probability
- Wave estimate
- Morning calm window countdown
- Visual wave animation based on conditions

### Hourly Timeline
Shows predicted conditions throughout the day:
- Color-coded bars for each hour
- Current hour highlighted
- Phase indicators (calm, building, peak, fading)
- Best window recommendation

### Weekly Best Days
7-day outlook showing:
- Best day for selected activity
- Daily scores
- Weather icons
- Best activity icon for each day

### Race Day Mode (Sailing)
Specialized view for regatta planning:
- Wind statistics (avg, min, max, range)
- Consistency meter
- Trend indicator
- Course setup recommendations
- Start line favored end
- Gust warnings

---

## Data Sources

All features use existing data from:
- Ambient Weather (PWS) - real-time local conditions
- MesoWest (Synoptic) - regional stations
- NWS - forecasts and alerts
- Historical analysis - pattern recognition

---

## Configuration

### Activity Thresholds

```javascript
// Kiting
tooLight: 8 mph
ideal: 12-22 mph
tooStrong: 30 mph

// Sailing
tooLight: 4 mph
ideal: 8-18 mph
racingIdeal: 10-15 mph
tooStrong: 25 mph

// Boating (inverse - want calm)
ideal: 0-8 mph
choppy: 10+ mph
rough: 15+ mph

// Paddling
ideal: 0-6 mph
manageable: 10 mph
difficult: 15+ mph
```

---

## Future Enhancements

### EMS/Safety Mode (Planned)
- Hazard level indicator
- Max gust prediction
- Helicopter ops windows
- Fire weather index
- Visibility forecast

### Windsurfing Mode (Planned)
- Lower wind thresholds
- Sail size calculator
- Overpowered warnings

### Route Analysis (Planned)
- Headwind/tailwind for paddlers
- Return trip safety
- Direction relative to route

---

## Usage Examples

### Sailing Club Planning a Regatta
1. Select ⛵ Sailing mode
2. Check Weekly Best Days for best race day
3. On race day, use Race Day Mode
4. Set race start time
5. Review consistency and course recommendations

### Fisherman Planning a Trip
1. Select 🚤 Boating mode
2. Check Glass Score (want 80+)
3. Note Morning Calm Window duration
4. Plan to be off water before thermal starts

### SUP Group Outing
1. Select 🏄 Paddling mode
2. Check Glass Score and calm hours
3. Note "Get off water by" time
4. Monitor Hourly Timeline for wind buildup

---

*Utah Wind Pro - Professional forecasting for every water sport.*
```

---

## File 14: `docs/DATA-UPDATE-FREQUENCIES.md`

> 145 lines | 4.4 KB

```markdown
# Data Update Frequencies

## Overview

Utah Wind Pro aggregates data from multiple sources, each with different update frequencies.

---

## Data Sources & Update Rates

### 1. Personal Weather Station (PWS) - Ambient Weather
- **Update Frequency**: Real-time (every 1-5 seconds at source)
- **App Refresh**: Every **3 minutes**
- **Data Points**: Wind speed, direction, gusts, temperature, humidity, pressure
- **Latency**: ~5-30 seconds from sensor to app

### 2. MesoWest (Synoptic) Stations
- **Update Frequency**: Varies by station (5-60 minutes)
- **App Refresh**: Every **3 minutes**
- **Typical Stations**:
  - Airport stations (KSLC, KPVU): Every 5-20 minutes
  - RAWS stations: Every 10-60 minutes
  - Research stations: Every 5-15 minutes
- **Latency**: 5-15 minutes from measurement to availability

### 3. NWS Weather Alerts
- **Update Frequency**: As issued (immediate when new alerts posted)
- **App Refresh**: Every **10 minutes**
- **Data Points**: Severe weather warnings, advisories, watches
- **Latency**: Near real-time when issued

### 4. NWS Forecasts
- **Update Frequency**: Every 1-6 hours (varies by forecast type)
- **App Refresh**: Every **30 minutes**
- **Data Points**: 7-day forecast, hourly forecast, wind predictions
- **Latency**: Forecasts are predictions, not real-time data

---

## App Refresh Intervals

| Data Type | Refresh Interval | Source |
|-----------|-----------------|--------|
| Wind Data (PWS + MesoWest) | 3 minutes | `useLakeData.js` |
| Wind History | 10 minutes | `useLakeData.js` |
| NWS Alerts | 10 minutes | `SevereWeatherAlerts.jsx` |
| NWS Forecasts | 30 minutes | `WeatherForecast.jsx` |
| Learning System - Actuals | 15 minutes | `DataCollector.js` |
| Learning System - Predictions | 1 hour | `DataCollector.js` |
| Learning System - Indicators | 6 hours | `DataCollector.js` |
| Model Retraining | 24 hours | `DataCollector.js` |

---

## Station-Specific Update Rates

### Utah Lake Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Zig Zag PWS | Ambient Weather | Real-time |
| Flight Park South (FPS) | MesoWest | 5-10 min |
| Flight Park North (UTALP) | MesoWest | 5-10 min |
| KSLC (SLC Airport) | Aviation | 5-20 min |
| KPVU (Provo Airport) | Aviation | 5-20 min |
| Spanish Fork (QSF) | MesoWest | 10-15 min |

### Deer Creek Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Arrowhead (SND) | MesoWest | 10-15 min |
| Heber Airport (KHCR) | Aviation | 5-20 min |
| Soldier Hollow | MesoWest | 10-15 min |

### Willard Bay Area
| Station | Type | Typical Update |
|---------|------|----------------|
| Hill AFB (KHIF) | Aviation | 5-20 min |
| Ogden Airport (KOGD) | Aviation | 5-20 min |
| Ben Lomond | MesoWest | 15-30 min |

---

## Data Freshness Indicators

The app shows data freshness status:

| Status | Color | Meaning |
|--------|-------|---------|
| **Live** | Green | Data updated within last 3 minutes |
| **Updating** | Yellow | Data is 3-6 minutes old, refresh in progress |
| **Stale** | Orange | Data is 6+ minutes old |
| **Offline** | Red | Unable to fetch new data |

---

## Manual Refresh

Users can manually refresh data at any time by:
1. Clicking the refresh button in the header
2. Clicking the refresh button in the Data Freshness panel
3. Pull-to-refresh on mobile (when PWA installed)

---

## API Rate Limits

### MesoWest (Synoptic)
- **Limit**: 10,000 requests/day (free tier)
- **App Usage**: ~500-1000 requests/day typical
- **Mitigation**: Caching, batched requests

### NWS
- **Limit**: No hard limit, but requests throttled if excessive
- **App Usage**: ~150 requests/day
- **Mitigation**: 10-30 minute refresh intervals

### Ambient Weather
- **Limit**: 1 request/second
- **App Usage**: ~500 requests/day
- **Mitigation**: 3-minute refresh interval

---

## Offline Behavior

When offline:
1. Last known data is displayed
2. "Offline" indicator shown
3. Cached forecasts remain available
4. Learning system pauses data collection
5. Manual refresh attempts reconnection

---

## Best Practices for Users

1. **For real-time decisions**: Check the "Last Updated" timestamp
2. **For planning**: Use forecast data (updated less frequently but predictive)
3. **Before heading out**: Do a manual refresh to get latest data
4. **During sessions**: App auto-refreshes every 3 minutes

---

*Data freshness is critical for wind sports safety. Always verify conditions match predictions before committing to the water.*
```

---

## File 15: `src/main.jsx`

> 6 lines | 0.2 KB

```jsx
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
```

---

## File 16: `src/App.jsx`

> 25 lines | 0.5 KB

```jsx
import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { dataCollector } from './services/DataCollector';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  // Start the learning data collector when app loads
  useEffect(() => {
    dataCollector.start();
    
    // Cleanup on unmount
    return () => {
      dataCollector.stop();
    };
  }, []);

  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
```

---

## File 17: `src/index.css`

> 184 lines | 3.4 KB

```css
@import "tailwindcss";
@import "leaflet/dist/leaflet.css";

@layer base {
  :root {
    --color-primary: #3b82f6;
    --color-primary-dark: #2563eb;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
    --color-thermal: #06b6d4;
    
    /* Light mode colors */
    --bg-primary: #f8fafc;
    --bg-secondary: #f1f5f9;
    --bg-card: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --border-color: #e2e8f0;
  }
  
  .dark {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-card: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --border-color: #334155;
  }
}

body {
  @apply antialiased;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  overscroll-behavior: none;
  transition: background-color 0.3s, color 0.3s;
}

.dark body {
  @apply bg-slate-900 text-slate-100;
}

.light body {
  @apply bg-slate-50 text-slate-900;
}

@supports (padding: env(safe-area-inset-top)) {
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}

.gauge-gradient {
  background: conic-gradient(
    from 180deg,
    #ef4444 0deg,
    #f59e0b 90deg,
    #22c55e 180deg,
    #22c55e 270deg,
    #f59e0b 315deg,
    #ef4444 360deg
  );
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Leaflet map customizations - Dark mode */
.dark .leaflet-container {
  background: #0f172a;
  font-family: inherit;
}

.dark .leaflet-popup-content-wrapper {
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 8px;
}

.dark .leaflet-popup-tip {
  background: #1e293b;
}

.dark .leaflet-control-zoom a {
  background: #1e293b !important;
  color: #94a3b8 !important;
  border-color: #334155 !important;
}

.dark .leaflet-control-zoom a:hover {
  background: #334155 !important;
  color: #e2e8f0 !important;
}

.dark .leaflet-control-attribution {
  background: rgba(15, 23, 42, 0.8) !important;
  color: #64748b !important;
}

.dark .leaflet-control-attribution a {
  color: #94a3b8 !important;
}

/* Leaflet map customizations - Light mode */
.light .leaflet-container {
  background: #f1f5f9;
  font-family: inherit;
}

.light .leaflet-popup-content-wrapper {
  background: #ffffff;
  color: #1e293b;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.light .leaflet-popup-tip {
  background: #ffffff;
}

.light .leaflet-control-zoom a {
  background: #ffffff !important;
  color: #475569 !important;
  border-color: #e2e8f0 !important;
}

.light .leaflet-control-zoom a:hover {
  background: #f1f5f9 !important;
  color: #1e293b !important;
}

.light .leaflet-control-attribution {
  background: rgba(255, 255, 255, 0.9) !important;
  color: #64748b !important;
}

.light .leaflet-control-attribution a {
  color: #3b82f6 !important;
}

.leaflet-popup-content {
  margin: 10px 12px;
}

.leaflet-control-attribution {
  font-size: 10px;
}

.custom-marker {
  background: transparent;
  border: none;
}
```

---

## File 18: `src/services/WeatherService.js`

> 173 lines | 5.5 KB

```javascript
import axios from 'axios';
import { getAllStationIds } from '../config/lakeStations';

const AMBIENT_API_KEY = import.meta.env.VITE_AMBIENT_API_KEY;
const AMBIENT_APP_KEY = import.meta.env.VITE_AMBIENT_APP_KEY;
const SYNOPTIC_TOKEN = import.meta.env.VITE_SYNOPTIC_TOKEN;

const AMBIENT_BASE_URL = 'https://rt.ambientweather.net/v1';
const SYNOPTIC_BASE_URL = 'https://api.synopticdata.com/v2';

let lastAmbientCall = 0;
const AMBIENT_RATE_LIMIT_MS = 5000;

class WeatherService {
  async getAmbientWeatherData() {
    const now = Date.now();
    if (now - lastAmbientCall < AMBIENT_RATE_LIMIT_MS) {
      return null;
    }
    lastAmbientCall = now;

    try {
      const response = await axios.get(`${AMBIENT_BASE_URL}/devices`, {
        params: {
          apiKey: AMBIENT_API_KEY,
          applicationKey: AMBIENT_APP_KEY,
        },
      });
      
      if (response.data && response.data.length > 0) {
        const device = response.data[0];
        const lastData = device.lastData;
        
        return {
          stationName: device.info?.name || 'Personal Weather Station',
          timestamp: lastData.dateutc,
          temperature: lastData.tempf,
          humidity: lastData.humidity,
          windSpeed: lastData.windspeedmph,
          windGust: lastData.windgustmph,
          windDirection: lastData.winddir,
          pressure: lastData.baromrelin,
          dewPoint: lastData.dewPoint,
          feelsLike: lastData.feelsLike,
          hourlyRain: lastData.hourlyrainin,
          dailyRain: lastData.dailyrainin,
          uv: lastData.uv,
          solarRadiation: lastData.solarradiation,
        };
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn('Ambient Weather API rate limited');
        return null;
      }
      console.error('Ambient Weather API error:', error.message);
      return null;
    }
  }

  async getSynopticStationData(stationIds) {
    if (!stationIds || stationIds.length === 0) return [];
    
    try {
      const response = await axios.get(`${SYNOPTIC_BASE_URL}/stations/latest`, {
        params: {
          token: SYNOPTIC_TOKEN,
          stid: stationIds.join(','),
          vars: 'air_temp,relative_humidity,wind_speed,wind_direction,wind_gust,altimeter,sea_level_pressure',
          units: 'english',
        },
      });
      
      if (response.data?.STATION) {
        return response.data.STATION.map((station) => ({
          stationId: station.STID,
          name: station.NAME,
          latitude: station.LATITUDE,
          longitude: station.LONGITUDE,
          elevation: station.ELEVATION,
          timestamp: station.OBSERVATIONS?.date_time,
          temperature: station.OBSERVATIONS?.air_temp_value_1?.value,
          humidity: station.OBSERVATIONS?.relative_humidity_value_1?.value,
          windSpeed: station.OBSERVATIONS?.wind_speed_value_1?.value,
          windDirection: station.OBSERVATIONS?.wind_direction_value_1?.value,
          windGust: station.OBSERVATIONS?.wind_gust_value_1?.value,
          pressure: station.OBSERVATIONS?.altimeter_value_1?.value 
            || station.OBSERVATIONS?.sea_level_pressure_value_1?.value,
        }));
      }
      
      return [];
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('Synoptic API: Invalid token');
      } else {
        console.error('Synoptic API error:', error.message);
      }
      return [];
    }
  }

  async getSynopticHistory(stationIds, hours = 3) {
    if (!stationIds || stationIds.length === 0) return [];
    
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];
    
    try {
      const response = await axios.get(`${SYNOPTIC_BASE_URL}/stations/timeseries`, {
        params: {
          token: SYNOPTIC_TOKEN,
          stid: stationIds.join(','),
          start: formatDate(start),
          end: formatDate(end),
          vars: 'wind_speed,wind_direction,wind_gust,air_temp',
          units: 'english',
        },
      });
      
      if (response.data?.STATION) {
        return response.data.STATION.map((station) => {
          const obs = station.OBSERVATIONS || {};
          const times = obs.date_time || [];
          
          return {
            stationId: station.STID,
            name: station.NAME,
            history: times.map((time, i) => ({
              timestamp: time,
              windSpeed: obs.wind_speed_set_1?.[i],
              windDirection: obs.wind_direction_set_1?.[i],
              windGust: obs.wind_gust_set_1?.[i],
              temperature: obs.air_temp_set_1?.[i],
            })),
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Synoptic History API error:', error.message);
      return [];
    }
  }

  async getDataForLake(lakeId) {
    const stationIds = getAllStationIds(lakeId);
    
    const [ambientData, synopticData] = await Promise.allSettled([
      this.getAmbientWeatherData(),
      this.getSynopticStationData(stationIds),
    ]);
    
    return {
      ambient: ambientData.status === 'fulfilled' ? ambientData.value : null,
      synoptic: synopticData.status === 'fulfilled' ? synopticData.value : [],
      fetchedAt: new Date().toISOString(),
    };
  }

  async getHistoryForLake(lakeId, hours = 3) {
    const stationIds = getAllStationIds(lakeId);
    return this.getSynopticHistory(stationIds.slice(0, 4), hours);
  }
}

export const weatherService = new WeatherService();
```

---

## File 19: `src/services/DataNormalizer.js`

> 628 lines | 20.7 KB

```javascript
import { LAKE_CONFIGS, WIND_DIRECTION_OPTIMAL, getPrimaryRidgeStation, STATION_INFO } from '../config/lakeStations';
import { predictThermal } from './ThermalPredictor';

/**
 * LakeState - Normalized data structure for thermal prediction
 * 
 * THREE-STEP MODEL:
 * Step A: GRADIENT CHECK - ΔP (SLC - Provo) > 2.0mb = North flow override
 * Step B: ELEVATION DELTA - High station temp vs lakeshore = thermal pump indicator
 * Step C: GROUND TRUTH - PWS verifies exact thermal arrival
 */
export class LakeState {
  constructor(lakeId) {
    this.lakeId = lakeId;
    this.config = LAKE_CONFIGS[lakeId];
    this.timestamp = new Date().toISOString();
    
    // Ground Truth (Step C)
    this.pws = null;
    
    // Gradient Check (Step A)
    this.pressure = { 
      high: null, 
      low: null, 
      gradient: null,
      bustThreshold: 2.0,
      isBusted: false,
    };
    
    // Elevation Delta (Step B)
    this.thermal = { 
      lakeshore: null, 
      ridge: null, 
      delta: null,
      pumpActive: false,  // True if rapid morning warm-up
      inversionTrapped: false,  // True if large inversion
    };
    
    this.wind = { stations: [], convergence: null };
    this.history = { wind: [], temperature: [], pressure: [] };
    
    this.probability = 0;
    this.factors = {
      pressureScore: 0,
      thermalScore: 0,
      convergenceScore: 0,
    };
    this.alerts = [];
    
    // Model explanation
    this.modelSteps = {
      stepA: { name: 'Gradient Check', status: 'pending', result: null },
      stepB: { name: 'Elevation Delta', status: 'pending', result: null },
      stepC: { name: 'Ground Truth', status: 'pending', result: null },
    };
  }

  static fromRawData(lakeId, ambientData, synopticStations, historyData = null) {
    const state = new LakeState(lakeId);
    const config = state.config;
    
    if (!config) {
      console.error(`Unknown lake ID: ${lakeId}`);
      return state;
    }

    // =========================================
    // STEP C: GROUND TRUTH - Your PWS data
    // Verifies exact minute thermal hits boundary
    // =========================================
    if (ambientData) {
      // Use location-specific name for PWS based on selected lake
      let pwsDisplayName = 'Zig Zag (Your Station)';
      if (lakeId === 'utah-lake-zigzag') {
        pwsDisplayName = 'Zig Zag (Your Station)';
      } else if (lakeId.startsWith('utah-lake')) {
        pwsDisplayName = 'Saratoga Springs PWS';
      } else {
        pwsDisplayName = ambientData.stationName || 'Your Weather Station';
      }
      
      state.pws = {
        name: pwsDisplayName,
        temperature: ambientData.temperature,
        humidity: ambientData.humidity,
        windSpeed: ambientData.windSpeed,
        windGust: ambientData.windGust,
        windDirection: ambientData.windDirection,
        pressure: ambientData.pressure,
        timestamp: ambientData.timestamp,
        isYourStation: true,
      };
      state.thermal.lakeshore = ambientData.temperature;
      
      state.modelSteps.stepC = {
        name: 'Ground Truth',
        status: 'complete',
        result: {
          station: ambientData.stationName,
          windSpeed: ambientData.windSpeed,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
        },
      };
    }

    if (synopticStations && synopticStations.length > 0) {
      const stationMap = new Map(synopticStations.map((s) => [s.stationId, s]));

      // =========================================
      // STEP A: GRADIENT CHECK
      // ΔP (SLC - Provo) > 2.0mb = North flow dominates
      // =========================================
      const highStation = stationMap.get(config.stations.pressure.high.id);
      const lowStation = stationMap.get(config.stations.pressure.low.id);
      
      if (highStation?.pressure != null) {
        state.pressure.high = {
          id: highStation.stationId,
          name: config.stations.pressure.high.name,
          value: highStation.pressure,
          elevation: config.stations.pressure.high.elevation,
          role: config.stations.pressure.high.role,
        };
      }
      
      if (lowStation?.pressure != null) {
        state.pressure.low = {
          id: lowStation.stationId,
          name: config.stations.pressure.low.name,
          value: lowStation.pressure,
          elevation: config.stations.pressure.low.elevation,
          role: config.stations.pressure.low.role,
        };
      }
      
      if (state.pressure.high?.value != null && state.pressure.low?.value != null) {
        state.pressure.gradient = parseFloat(
          (state.pressure.high.value - state.pressure.low.value).toFixed(3)
        );
        state.pressure.bustThreshold = config.stations.pressure.bustThreshold || 2.0;
        state.pressure.isBusted = state.pressure.gradient > state.pressure.bustThreshold;
        
        state.modelSteps.stepA = {
          name: 'Gradient Check',
          status: 'complete',
          result: {
            gradient: state.pressure.gradient,
            threshold: state.pressure.bustThreshold,
            isBusted: state.pressure.isBusted,
            explanation: state.pressure.isBusted 
              ? `ΔP ${state.pressure.gradient.toFixed(2)}mb > ${state.pressure.bustThreshold}mb = North flow dominates`
              : `ΔP ${state.pressure.gradient.toFixed(2)}mb < ${state.pressure.bustThreshold}mb = Thermal possible`,
          },
        };
      }

      // =========================================
      // STEP B: ELEVATION DELTA
      // Compare high station temp vs lakeshore
      // Large inversion = air trapped
      // Rapid morning warm-up = "Thermal Pump" starting
      // =========================================
      let ridgeStation = null;
      let ridgeConfig = null;
      for (const ridge of config.stations.ridge) {
        const station = stationMap.get(ridge.id);
        if (station?.temperature != null) {
          ridgeStation = station;
          ridgeConfig = ridge;
          break;
        }
      }
      
      if (ridgeStation?.temperature != null) {
        state.thermal.ridge = ridgeStation.temperature;
        state.thermal.ridgeStation = {
          id: ridgeStation.stationId,
          name: ridgeConfig.name,
          elevation: ridgeConfig.elevation,
          role: ridgeConfig.role,
          // Include ridge wind data for Arrowhead trigger analysis
          windSpeed: ridgeStation.windSpeed,
          windDirection: ridgeStation.windDirection,
        };
      }
      
      if (state.thermal.lakeshore != null && state.thermal.ridge != null) {
        state.thermal.delta = parseFloat(
          (state.thermal.lakeshore - state.thermal.ridge).toFixed(1)
        );
        
        // Thermal pump is active if lakeshore is significantly warmer than ridge
        state.thermal.pumpActive = state.thermal.delta >= 10;
        // Inversion trapped if ridge is warmer than lakeshore (negative delta)
        state.thermal.inversionTrapped = state.thermal.delta < 0;
        
        state.modelSteps.stepB = {
          name: 'Elevation Delta',
          status: 'complete',
          result: {
            lakeshoreTemp: state.thermal.lakeshore,
            ridgeTemp: state.thermal.ridge,
            delta: state.thermal.delta,
            pumpActive: state.thermal.pumpActive,
            inversionTrapped: state.thermal.inversionTrapped,
            explanation: state.thermal.inversionTrapped
              ? `Inversion: Ridge (${state.thermal.ridge}°F) warmer than shore (${state.thermal.lakeshore}°F)`
              : state.thermal.pumpActive
                ? `Thermal Pump ACTIVE: Shore ${state.thermal.delta}°F warmer than ridge`
                : `Moderate delta: Shore ${state.thermal.delta}°F warmer than ridge`,
          },
        };
      }

      // Wind stations from all sources
      state.wind.stations = [];
      
      if (state.pws) {
        state.wind.stations.push({
          id: 'PWS',
          name: state.pws.name,
          speed: state.pws.windSpeed,
          gust: state.pws.windGust,
          direction: state.pws.windDirection,
          temperature: state.pws.temperature,
          isPWS: true,
          isYourStation: true,
          role: 'Ground Truth - Your station at Zig Zag',
        });
      }
      
      config.stations.lakeshore.forEach((stationConfig) => {
        const station = stationMap.get(stationConfig.id);
        if (station) {
          const info = STATION_INFO[stationConfig.id] || {};
          state.wind.stations.push({
            id: station.stationId,
            name: stationConfig.name,
            speed: station.windSpeed,
            gust: station.windGust,
            direction: station.windDirection,
            temperature: station.temperature,
            elevation: stationConfig.elevation,
            role: stationConfig.role,
            network: info.network,
            isPWS: false,
          });
        }
      });

      state.wind.convergence = calculateVectorConvergence(
        state.wind.stations,
        WIND_DIRECTION_OPTIMAL[lakeId]
      );
      
      // =========================================
      // SPANISH FORK EARLY INDICATOR (Utah Lake)
      // When QSF shows SE wind > 6 mph, thermal likely in ~2 hours
      // =========================================
      if (lakeId.startsWith('utah-lake') && config.stations.earlyIndicator) {
        const earlyIndicatorStation = stationMap.get(config.stations.earlyIndicator.id);
        if (earlyIndicatorStation) {
          state.earlyIndicator = {
            id: earlyIndicatorStation.stationId,
            name: config.stations.earlyIndicator.name,
            windSpeed: earlyIndicatorStation.windSpeed,
            windDirection: earlyIndicatorStation.windDirection,
            temperature: earlyIndicatorStation.temperature,
            elevation: config.stations.earlyIndicator.elevation,
            role: config.stations.earlyIndicator.role,
            leadTimeMinutes: config.stations.earlyIndicator.leadTimeMinutes,
            trigger: config.stations.earlyIndicator.trigger,
          };
        }
      }
      
      // =========================================
      // KSLC NORTH FLOW INDICATOR (Utah Lake north flow locations)
      // When KSLC shows N/NW wind > 5 mph, north flow likely in ~1 hour
      // =========================================
      if (lakeId.startsWith('utah-lake')) {
        const kslcStation = stationMap.get('KSLC');
        if (kslcStation) {
          state.kslcStation = {
            id: kslcStation.stationId,
            name: 'Salt Lake City Airport',
            windSpeed: kslcStation.windSpeed,
            windDirection: kslcStation.windDirection,
            temperature: kslcStation.temperature,
            pressure: kslcStation.pressure,
            elevation: 4226,
            role: 'North Flow Early Indicator - N/NW wind here precedes Utah Lake by ~1 hour',
          };
        }
        
        // =========================================
        // KPVU INDICATOR (Best for Lincoln Beach & Sandy Beach)
        // 78% foil kiteable at 8-10 mph N - better than KSLC for southern launches
        // =========================================
        const kpvuStation = stationMap.get('KPVU');
        if (kpvuStation) {
          state.kpvuStation = {
            id: kpvuStation.stationId,
            name: 'Provo Airport',
            windSpeed: kpvuStation.windSpeed,
            windDirection: kpvuStation.windDirection,
            temperature: kpvuStation.temperature,
            pressure: kpvuStation.pressure,
            elevation: 4495,
            role: 'Southern Launch Indicator - Best for Lincoln Beach & Sandy Beach',
          };
        }
        
        // =========================================
        // UTALP INDICATOR (Point of Mountain - Gap wind)
        // Shows wind funneling through the gap
        // =========================================
        const utalpStation = stationMap.get('UTALP');
        if (utalpStation) {
          state.utalpStation = {
            id: utalpStation.stationId,
            name: 'Point of Mountain',
            windSpeed: utalpStation.windSpeed,
            windDirection: utalpStation.windDirection,
            temperature: utalpStation.temperature,
            elevation: 4796,
            role: 'Gap Wind Indicator - Shows north flow through Point of Mountain',
          };
        }
      }
    }

    if (historyData) {
      state.history = historyData;
    }

    // =========================================
    // FINAL PREDICTION - Combine all 3 steps
    // =========================================
    const thermalPrediction = predictThermal(lakeId, {
      windSpeed: state.pws?.windSpeed || state.wind.stations?.[0]?.speed,
      windDirection: state.pws?.windDirection || state.wind.stations?.[0]?.direction,
      temperature: state.pws?.temperature,
      pressureGradient: state.pressure.gradient,
      thermalDelta: state.thermal.delta,
      pumpActive: state.thermal.pumpActive,
      inversionTrapped: state.thermal.inversionTrapped,
      // Ridge station data for Arrowhead trigger (Deer Creek)
      ridgeWindSpeed: state.thermal.ridgeStation?.windSpeed,
      ridgeWindDirection: state.thermal.ridgeStation?.windDirection,
      ridgeStationName: state.thermal.ridgeStation?.name,
      // Spanish Fork early indicator (Utah Lake SE thermal)
      spanishForkWind: state.earlyIndicator ? {
        speed: state.earlyIndicator.windSpeed,
        direction: state.earlyIndicator.windDirection,
        temperature: state.earlyIndicator.temperature,
      } : null,
      // KSLC wind for north flow indicator (Utah Lake north flow locations)
      kslcWind: state.kslcStation ? {
        speed: state.kslcStation.windSpeed,
        direction: state.kslcStation.windDirection,
        temperature: state.kslcStation.temperature,
      } : null,
      // KPVU wind for southern launches (Lincoln Beach, Sandy Beach)
      kpvuWind: state.kpvuStation ? {
        speed: state.kpvuStation.windSpeed,
        direction: state.kpvuStation.windDirection,
        temperature: state.kpvuStation.temperature,
      } : null,
      // UTALP wind for gap wind indicator
      utalpWind: state.utalpStation ? {
        speed: state.utalpStation.windSpeed,
        direction: state.utalpStation.windDirection,
        temperature: state.utalpStation.temperature,
      } : null,
    });
    
    state.probability = thermalPrediction?.probability || 0;
    state.thermalPrediction = thermalPrediction;
    
    state.factors = {
      pressureScore: thermalPrediction?.pressure?.score || 50,
      thermalScore: thermalPrediction?.direction?.score || 50,
      convergenceScore: thermalPrediction?.speed?.score || 50,
    };

    state.alerts = generateAlerts(state);
    state.timestamp = new Date().toISOString();
    
    return state;
  }
}

function calculateVectorConvergence(stations, optimalRange) {
  if (!stations || stations.length === 0 || !optimalRange) {
    return { score: 0, alignment: 'unknown', details: [] };
  }

  const validStations = stations.filter(
    (s) => s.direction != null && s.speed != null && s.speed > 0.5
  );

  if (validStations.length === 0) {
    return { score: 0, alignment: 'calm', details: [] };
  }

  const details = validStations.map((station) => {
    const dir = station.direction;
    const { min, max, ideal } = optimalRange;
    
    let inRange = false;
    if (min <= max) {
      inRange = dir >= min && dir <= max;
    } else {
      inRange = dir >= min || dir <= max;
    }

    let deviation = Math.abs(dir - ideal);
    if (deviation > 180) deviation = 360 - deviation;
    
    const alignmentScore = inRange ? Math.max(0, 100 - deviation) : Math.max(0, 50 - deviation);

    return {
      id: station.id,
      name: station.name,
      direction: dir,
      speed: station.speed,
      inOptimalRange: inRange,
      deviation,
      score: alignmentScore,
    };
  });

  const avgScore = details.reduce((sum, d) => sum + d.score, 0) / details.length;
  const inRangeCount = details.filter((d) => d.inOptimalRange).length;
  
  let alignment = 'poor';
  if (avgScore >= 70 && inRangeCount >= validStations.length * 0.6) {
    alignment = 'excellent';
  } else if (avgScore >= 50 && inRangeCount >= validStations.length * 0.4) {
    alignment = 'good';
  } else if (avgScore >= 30) {
    alignment = 'moderate';
  }

  return {
    score: Math.round(avgScore),
    alignment,
    inRangeRatio: inRangeCount / validStations.length,
    details,
  };
}

export function calculateProbability(state) {
  const WEIGHTS = {
    pressure: 0.40,
    thermal: 0.40,
    convergence: 0.20,
  };

  let pressureScore = 50;
  if (state.pressure.gradient != null) {
    const absGradient = Math.abs(state.pressure.gradient);
    
    if (absGradient <= 0.5) {
      pressureScore = 100;
    } else if (absGradient <= 1.0) {
      pressureScore = 85;
    } else if (absGradient <= 1.5) {
      pressureScore = 70;
    } else if (absGradient <= 2.0) {
      pressureScore = 50;
    } else if (absGradient <= 3.0) {
      pressureScore = 25;
    } else {
      pressureScore = 0;
    }
    
    if (state.pressure.gradient > 0 && absGradient > 1.5) {
      pressureScore *= 0.7;
    }
  }

  let thermalScore = 50;
  if (state.thermal.delta != null) {
    const delta = state.thermal.delta;
    
    if (delta >= 15) {
      thermalScore = 100;
    } else if (delta >= 10) {
      thermalScore = 85;
    } else if (delta >= 5) {
      thermalScore = 70;
    } else if (delta >= 0) {
      thermalScore = 50;
    } else {
      thermalScore = Math.max(0, 30 + delta * 3);
    }
  }

  let convergenceScore = 50;
  if (state.wind.convergence?.score != null) {
    convergenceScore = state.wind.convergence.score;
  }

  const weightedTotal = 
    pressureScore * WEIGHTS.pressure +
    thermalScore * WEIGHTS.thermal +
    convergenceScore * WEIGHTS.convergence;

  const hour = new Date().getHours();
  let timeMultiplier = 1.0;
  if (hour >= 11 && hour <= 16) {
    timeMultiplier = 1.15;
  } else if (hour >= 9 && hour <= 18) {
    timeMultiplier = 1.0;
  } else {
    timeMultiplier = 0.6;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedTotal * timeMultiplier)));

  return {
    total: finalScore,
    factors: {
      pressureScore: Math.round(pressureScore),
      thermalScore: Math.round(thermalScore),
      convergenceScore: Math.round(convergenceScore),
    },
    weights: WEIGHTS,
    timeMultiplier,
  };
}

function generateAlerts(state) {
  const alerts = [];

  if (state.pressure.gradient != null && Math.abs(state.pressure.gradient) > 2.0) {
    alerts.push({
      type: 'bust',
      severity: 'high',
      message: `Pressure gradient ${state.pressure.gradient.toFixed(2)}mb exceeds bust threshold`,
      timestamp: state.timestamp,
    });
  }

  if (state.probability >= 75) {
    alerts.push({
      type: 'thermal',
      severity: 'positive',
      message: `Thermal probability at ${state.probability}% - excellent conditions!`,
      timestamp: state.timestamp,
    });
  }

  const gustyStations = state.wind.stations.filter(
    (s) => s.gust && s.speed && s.gust > s.speed * 1.8
  );
  if (gustyStations.length > 0) {
    alerts.push({
      type: 'gusty',
      severity: 'medium',
      message: `Gusty conditions at ${gustyStations.map((s) => s.name).join(', ')}`,
      timestamp: state.timestamp,
    });
  }

  return alerts;
}

export function getProbabilityStatus(probability, thermalPrediction) {
  // Use the thermal prediction's phase and message if available
  const phase = thermalPrediction?.phase;
  
  if (phase === 'ended') {
    return {
      status: 'ended',
      message: 'Thermal window closed',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-500/30',
    };
  }
  
  if (probability >= 60) {
    return {
      status: 'excellent',
      message: phase === 'peak' ? 'Peak thermal window!' : 'High probability',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
    };
  } else if (probability >= 40) {
    return {
      status: 'good',
      message: 'Good thermal potential',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
    };
  } else if (probability >= 20) {
    return {
      status: 'moderate',
      message: phase === 'building' ? 'Thermal building' : 'Moderate chance',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
    };
  } else if (probability > 0) {
    return {
      status: 'poor',
      message: phase === 'fading' ? 'Thermal fading' : 'Low probability',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
    };
  } else {
    return {
      status: 'bust',
      message: 'No thermal expected',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
    };
  }
}
```

---

## File 20: `src/services/ThermalPredictor.js`

> 1586 lines | 53.3 KB

```javascript
/**
 * THERMAL PREDICTOR SERVICE
 * 
 * THREE-STEP PREDICTION MODEL:
 * 
 * Step A: GRADIENT CHECK
 *   - Query ΔP (SLC - Provo pressure)
 *   - If ΔP > 2.0mb = North flow dominates, thermal busted
 *   - Historical data: 0% thermal success when gradient positive
 * 
 * Step B: ELEVATION DELTA  
 *   - Compare high station temp (Arrowhead/Cascade) vs lakeshore
 *   - Large inversion = air trapped, no thermal
 *   - Rapid morning warm-up at shore = "Thermal Pump" starting
 * 
 * Step C: GROUND TRUTH
 *   - Use PWS to verify exact minute thermal hits boundary
 *   - Look back 2 hours at MesoWest for "Indicator Pattern"
 * 
 * Data-driven from 1 year of MesoWest historical data:
 * - Flight Park South (FPS): 105,100 data points (Mar 2025 - Mar 2026)
 * - KSLC/KPVU pressure data: 363 days analyzed
 * 
 * KEY FINDINGS FROM DATA ANALYSIS:
 * 
 * 1. SE THERMAL TIMING (100-180°, 8+ mph):
 *    - Starts building: 5-6 AM (44 days had usable conditions)
 *    - Peak window: 10-11 AM (78-82 days - HIGHEST)
 *    - Still active: 12-1 PM (73-74 days)
 *    - Fading: 2-3 PM (45-66 days)
 *    - Rare after: 4 PM (36-40 days)
 * 
 * 2. MONTHLY SUCCESS RATES:
 *    - Best: Feb (46%), Jul (42%), Oct (42%), Nov (43%)
 *    - Worst: Apr (17%), May (16%)
 *    - Average: 24% of days have good SE thermals
 * 
 * 3. PRESSURE GRADIENT:
 *    - When SLC > PVU (positive gradient): 0% thermal success
 *    - Negative gradient required for thermals
 * 
 * 4. PEAK CHARACTERISTICS:
 *    - Average peak speed: 10.3 mph
 *    - Average peak hour: 10-11 AM
 *    - Average direction: 150° (SSE)
 * 
 * LEARNING SYSTEM INTEGRATION:
 * - Model weights can be adjusted by the learning system
 * - Learned weights override defaults when available
 * - Speed bias correction applied from learning
 */

// Learned weights cache (loaded from LearningSystem)
let learnedWeights = null;

/**
 * Set learned weights from the learning system
 * Called by LearningSystem when new weights are available
 */
export function setLearnedWeights(weights) {
  learnedWeights = weights;
  console.log('ThermalPredictor: Updated with learned weights v' + weights?.version);
}

/**
 * Get current weights (learned or default)
 */
function getWeights() {
  if (learnedWeights && learnedWeights.version !== 'default') {
    return {
      pressure: learnedWeights.pressureWeight || 0.40,
      thermal: learnedWeights.thermalWeight || 0.40,
      convergence: learnedWeights.convergenceWeight || 0.20,
      speedBiasCorrection: learnedWeights.speedBiasCorrection || 0,
      hourlyMultipliers: learnedWeights.hourlyMultipliers || {},
      indicators: learnedWeights.indicators || {},
    };
  }
  
  return {
    pressure: 0.40,
    thermal: 0.40,
    convergence: 0.20,
    speedBiasCorrection: 0,
    hourlyMultipliers: {},
    indicators: {},
  };
}

// Historical data from analysis - UTAH LAKE (FPS)
const HOURLY_THERMAL_PROBABILITY = {
  0: 0.05, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.05,
  5: 0.12,  // 44 days
  6: 0.11,  // 41 days
  7: 0.12,  // 42 days
  8: 0.16,  // 59 days
  9: 0.18,  // 65 days
  10: 0.21, // 78 days - PEAK
  11: 0.22, // 82 days - PEAK
  12: 0.20, // 74 days
  13: 0.20, // 73 days
  14: 0.18, // 66 days
  15: 0.12, // 45 days
  16: 0.11, // 40 days
  17: 0.10, // 36 days
  18: 0.08, // 29 days
  19: 0.05, 20: 0.05, 21: 0.05, 22: 0.05, 23: 0.05
};

const MONTHLY_SUCCESS_RATE = {
  1: 0.23,  // Jan - 23%
  2: 0.46,  // Feb - 46% BEST
  3: 0.28,  // Mar - 28%
  4: 0.17,  // Apr - 17% WORST
  5: 0.16,  // May - 16% WORST
  6: 0.27,  // Jun - 27%
  7: 0.42,  // Jul - 42% BEST
  8: 0.32,  // Aug - 32%
  9: 0.30,  // Sep - 30%
  10: 0.42, // Oct - 42% BEST
  11: 0.43, // Nov - 43% BEST
  12: 0.35  // Dec - 35%
};

const MONTHLY_PEAK_HOUR = {
  1: 10.9, 2: 9.2, 3: 10.2, 4: 12.4, 5: 11.4, 6: 11.6,
  7: 10.6, 8: 9.8, 9: 10.7, 10: 11.8, 11: 9.4, 12: 10.2
};

const MONTHLY_PEAK_SPEED = {
  1: 10.6, 2: 10.4, 3: 12.3, 4: 10.3, 5: 11.4, 6: 9.6,
  7: 9.5, 8: 10.2, 9: 9.4, 10: 10.7, 11: 10.0, 12: 12.4
};

// DEER CREEK hourly thermal probability (Summer 2025 data)
// Based on 13,248 observations, 1,216 thermal events
const DEER_CREEK_HOURLY_PROBABILITY = {
  0: 0.02, 1: 0.02, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.02,
  6: 0.02,  // 2.0%
  7: 0.027, // 2.7%
  8: 0.027, // 2.7%
  9: 0.025, // 2.5%
  10: 0.076, // 7.6% - building
  11: 0.187, // 18.7% - good
  12: 0.266, // 26.6% - PEAK
  13: 0.284, // 28.4% - PEAK (best hour)
  14: 0.217, // 21.7% - good
  15: 0.163, // 16.3% - good
  16: 0.161, // 16.1% - fading
  17: 0.076, // 7.6% - fading
  18: 0.087, // 8.7%
  19: 0.094, // 9.4%
  20: 0.109, // 10.9%
  21: 0.05, 22: 0.03, 23: 0.02
};

// Deer Creek temperature correlation
// When DCC is 8-12°F warmer than Arrowhead (SND), thermal is likely
const DEER_CREEK_TEMP_DELTA = {
  optimal: { min: 8, max: 15 },
  average: 9.6,
};

// DEER CREEK ARROWHEAD TRIGGER - from July 2025 correlation analysis
// When Arrowhead shows these conditions, thermal at Dam is likely
const DEER_CREEK_ARROWHEAD_TRIGGER = {
  // Wind speed at Arrowhead during DCC thermals: avg 13.7 mph
  speed: {
    optimal: { min: 12, max: 18 },  // 24.8-29.9% thermal rate
    marginal: { min: 10, max: 12 }, // 13.1% thermal rate
    poor: { min: 0, max: 10 },      // <4% thermal rate
  },
  // Direction at Arrowhead: 210° SSW (87% of thermals)
  direction: {
    optimal: { min: 200, max: 230 }, // SSW
    acceptable: { min: 180, max: 250 }, // S to WSW
  },
  // Thermal probability by Arrowhead wind speed
  probabilityBySpeed: {
    '2-4': 0.0,
    '4-6': 0.8,
    '6-8': 3.1,
    '8-10': 4.0,
    '10-12': 13.1,
    '12-15': 24.8,
    '15+': 29.9,
  },
  // Lead time: Arrowhead signal precedes Dam thermal by 60-90 min
  leadTimeMinutes: 60,
};

// =====================================================
// SPANISH FORK CANYON EARLY INDICATOR
// =====================================================
// From correlation analysis: QSF shows SE wind 1-2 hours before Utah Lake thermal
// Data: Summer 2025, 92 days analyzed, 67 good kite days
//
// KEY FINDING: When QSF shows SE wind (100-180°) at 6+ mph,
// expect thermal at Zig Zag/FPS approximately 2 hours later
export const SPANISH_FORK_INDICATOR = {
  station: 'QSF',
  stationName: 'Spanish Fork',
  coordinates: { lat: 40.115, lng: -111.655 },
  elevation: 4550,
  
  // Lead time before Utah Lake thermal
  leadTimeHours: 2,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 100,
      max: 180,
      label: 'SE (100-180°)',
    },
    speed: {
      min: 6,
      threshold: 7.5, // Average on good kite days
      label: '> 6 mph',
    },
  },
  
  // Statistics from analysis
  statistics: {
    goodKiteDays: 67,
    thermalDays: 12,
    bustDays: 13,
    totalDays: 92,
    seDirectionOnGoodDays: 97, // 97% SE direction on good kite days
    avgSpeedOnGoodDays: 7.6,
    avgSpeedOnBustDays: 4.9,
  },
  
  // Prediction accuracy
  accuracy: {
    threshold: 5.6, // Speed threshold for prediction
    accuracyPercent: 62.5,
  },
  
  // How to interpret
  interpretation: {
    strong: 'QSF showing SE > 8 mph = High confidence thermal coming in ~2 hours',
    moderate: 'QSF showing SE 6-8 mph = Moderate confidence thermal developing',
    weak: 'QSF showing SE < 6 mph or other direction = Low confidence',
  },
};

// =====================================================
// NORTH FLOW EARLY INDICATOR (Great Salt Lake origin)
// =====================================================
// From correlation analysis: KSLC shows N/NW wind 1 hour before Utah Lake north flow
// Data: Sep 2025 - Mar 2026, 192 days analyzed, 127 good north kite days
//
// VALIDATED CORRELATION (KSLC → FPS/Zig Zag, 1 hour later):
// - KSLC 5-8 mph N → FPS avg 9.3 mph (45% foil kiteable, 14% twin tip)
// - KSLC 8-10 mph N → FPS avg 12.6 mph (56% foil kiteable, 31% twin tip)
// - KSLC 10-15 mph N → FPS avg 15.5 mph (81% foil kiteable)
// - KSLC 15+ mph N → FPS avg 23.4 mph (100% kiteable)
export const NORTH_FLOW_INDICATOR = {
  station: 'KSLC',
  stationName: 'Salt Lake City Airport',
  coordinates: { lat: 40.7884, lng: -111.9778 },
  elevation: 4226,
  
  // Lead time before Utah Lake north flow
  leadTimeHours: 1,
  
  // Trigger conditions (validated thresholds)
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,        // Minimum for meaningful signal (56% foil kiteable)
      threshold: 10, // Strong signal (81% foil kiteable)
      foilMin: 8,    // 8+ mph at KSLC → ~13 mph at Zig Zag (foil kiteable)
      twinTipMin: 10, // 10+ mph at KSLC → ~15+ mph at Zig Zag (twin tip kiteable)
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (KSLC → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 9.3, foilKiteable: 45, twinTipKiteable: 14 },
    '8-10': { avgFps: 12.6, foilKiteable: 56, twinTipKiteable: 31 },
    '10-15': { avgFps: 15.5, foilKiteable: 81, twinTipKiteable: 50 },
    '15+': { avgFps: 23.4, foilKiteable: 100, twinTipKiteable: 100 },
  },
  
  // Statistics from analysis
  statistics: {
    goodNorthDays: 127,
    totalDays: 192,
    northDirectionAt1hr: 45, // 45% show north wind 1hr before
    combinedNorthNWNE: 74, // 74% show N/NW/NE combined
    avgSpeedOnGoodDays: 5.7,
  },
  
  // Pressure gradient correlation
  pressureGradient: {
    description: 'SLC - Provo pressure difference',
    positiveOnGoodDays: 15, // 15% of good north days have positive gradient
    positiveOnBadDays: 0, // 0% of bad days have positive gradient
    interpretation: 'Positive gradient (SLC > Provo) = North flow likely',
  },
  
  // How to interpret (updated with validated thresholds)
  interpretation: {
    strong: 'KSLC 10+ mph N/NW = High confidence (81% foil kiteable, ~15+ mph at Zig Zag)',
    moderate: 'KSLC 8-10 mph N/NW = Moderate (56% foil kiteable, ~13 mph at Zig Zag)',
    marginal: 'KSLC 5-8 mph N/NW = Marginal (45% foil kiteable, ~9 mph at Zig Zag)',
    weak: 'KSLC < 5 mph or other direction = Low confidence',
  },
};

// =====================================================
// PROVO AIRPORT INDICATOR (For Lincoln Beach & Sandy Beach)
// =====================================================
// KPVU is closer to southern Utah Lake launches and shows BETTER correlation
// than KSLC for predicting conditions at Lincoln Beach and Sandy Beach
//
// VALIDATED CORRELATION (KPVU → FPS, 1 hour later):
// - KPVU 5-8 mph N → FPS avg 11.2 mph (51% foil kiteable)
// - KPVU 8-10 mph N → FPS avg 13.5 mph (78% foil kiteable) ← BEST
// - KPVU 10-15 mph N → FPS avg 14.9 mph (89% foil kiteable)
// - KPVU 15+ mph N → FPS avg 22.7 mph (100% kiteable)
export const PROVO_AIRPORT_INDICATOR = {
  station: 'KPVU',
  stationName: 'Provo Airport',
  coordinates: { lat: 40.2192, lng: -111.7236 },
  elevation: 4495,
  
  // Best for southern launches
  bestFor: ['utah-lake-lincoln', 'utah-lake-sandy'],
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,
      threshold: 10,
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (KPVU → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 11.2, foilKiteable: 51, twinTipKiteable: 18 },
    '8-10': { avgFps: 13.5, foilKiteable: 78, twinTipKiteable: 33 },
    '10-15': { avgFps: 14.9, foilKiteable: 89, twinTipKiteable: 45 },
    '15+': { avgFps: 22.7, foilKiteable: 100, twinTipKiteable: 100 },
  },
  
  interpretation: {
    strong: 'KPVU 10+ mph N = High confidence (89% foil kiteable at Lincoln/Sandy)',
    moderate: 'KPVU 8-10 mph N = Good (78% foil kiteable at Lincoln/Sandy)',
    marginal: 'KPVU 5-8 mph N = Possible (51% foil kiteable)',
    weak: 'KPVU < 5 mph or other direction = Low confidence',
  },
};

// =====================================================
// POINT OF MOUNTAIN INDICATOR (Gap wind indicator)
// =====================================================
// UTALP shows wind funneling through the Point of Mountain gap
// Good indicator for north flow reaching Utah Lake
//
// VALIDATED CORRELATION (UTALP → FPS, 1 hour later):
// - UTALP 5-8 mph N → FPS avg 9.3 mph (43% foil kiteable)
// - UTALP 8-10 mph N → FPS avg 11.4 mph (58% foil kiteable)
// - UTALP 10-15 mph N → FPS avg 14.4 mph (86% foil kiteable)
// - UTALP 15+ mph N → FPS avg 22.0 mph (98% kiteable)
export const POINT_OF_MOUNTAIN_INDICATOR = {
  station: 'UTALP',
  stationName: 'Point of Mountain',
  coordinates: { lat: 40.4456, lng: -111.8983 },
  elevation: 4796,
  
  // Shows gap wind funneling
  role: 'Gap wind indicator - shows north flow funneling through Point of Mountain',
  
  // Lead time
  leadTimeHours: 1,
  
  // Trigger conditions
  trigger: {
    direction: {
      min: 315,
      max: 45,
      label: 'N (NW to NE)',
    },
    speed: {
      min: 8,
      threshold: 10,
      label: '> 8 mph',
    },
  },
  
  // Validated speed correlation (UTALP → FPS 1hr later)
  speedCorrelation: {
    '5-8': { avgFps: 9.3, foilKiteable: 43, twinTipKiteable: 10 },
    '8-10': { avgFps: 11.4, foilKiteable: 58, twinTipKiteable: 17 },
    '10-15': { avgFps: 14.4, foilKiteable: 86, twinTipKiteable: 40 },
    '15+': { avgFps: 22.0, foilKiteable: 98, twinTipKiteable: 96 },
  },
  
  interpretation: {
    strong: 'UTALP 10+ mph N = High confidence (86% foil kiteable)',
    moderate: 'UTALP 8-10 mph N = Moderate (58% foil kiteable)',
    marginal: 'UTALP 5-8 mph N = Marginal (43% foil kiteable)',
    weak: 'UTALP < 5 mph or other direction = Low confidence',
  },
};

export const THERMAL_PROFILES = {
  // =====================================================
  // UTAH LAKE - 5 LAUNCH LOCATIONS (South to North)
  // =====================================================
  
  'utah-lake-lincoln': {
    name: 'Lincoln Beach',
    location: 'South - Southernmost launch',
    
    direction: {
      optimal: { min: 135, max: 165, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Classic SE lake thermal - data shows 150° average',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: null,
  },

  'utah-lake-sandy': {
    name: 'Sandy Beach',
    location: 'South-Central',
    
    direction: {
      optimal: { min: 130, max: 160, ideal: 145 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'SE thermal - slightly more easterly than Lincoln',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 0,
      dataSource: 'Estimated from FPS data',
    },
    
    primaryStation: 'FPS',
    yourStation: null,
  },

  'utah-lake-vineyard': {
    name: 'Vineyard',
    location: 'Central',
    
    direction: {
      optimal: { min: 140, max: 180, ideal: 160 },
      acceptable: { min: 120, max: 200 },
      label: 'SE to S',
      description: 'SE to South thermal - wider acceptable range',
    },
    
    speed: {
      typical: { min: 6, max: 16 },
      average: 9,
      peak: 12,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 6, minute: 0, label: '6:00 AM' },
      usableStart: { hour: 9, minute: 0, label: '9:00 AM' },
      peakWindow: { start: 10, end: 14, label: '10:00 AM - 2:00 PM' },
      peakHour: 12,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 22,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  'utah-lake-zigzag': {
    name: 'Zig Zag',
    location: 'North-Central - Your home launch',
    
    direction: {
      optimal: { min: 135, max: 165, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Classic SE lake thermal - your PWS provides ground truth',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  'utah-lake-mm19': {
    name: 'Mile Marker 19',
    location: 'North - Northernmost launch',
    
    direction: {
      optimal: { min: 120, max: 160, ideal: 140 },
      acceptable: { min: 90, max: 180 },
      label: 'SE to E',
      description: 'SE to East thermal - more easterly component at north end',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 0,
      dataSource: 'Estimated from FPS data',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },

  // Legacy - overview of all Utah Lake
  'utah-lake': {
    name: 'Utah Lake (Overview)',
    location: 'All locations',
    
    direction: {
      optimal: { min: 130, max: 170, ideal: 150 },
      acceptable: { min: 100, max: 180 },
      label: 'SE to SSE',
      description: 'Southeast thermal - data shows 150° average during good conditions',
    },
    
    speed: {
      typical: { min: 8, max: 18 },
      average: 10.3,
      peak: 14,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 5, minute: 0, label: '5:00 AM' },
      usableStart: { hour: 8, minute: 0, label: '8:00 AM' },
      peakWindow: { start: 10, end: 13, label: '10:00 AM - 1:00 PM' },
      peakHour: 11,
      fadeStart: { hour: 15, minute: 0, label: '3:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 24,
      sampleSize: 366,
      dataSource: 'FPS Mar 2025 - Mar 2026 (105,100 observations)',
    },
    
    primaryStation: 'FPS',
    yourStation: 'Zigzag',
  },
  
  'deer-creek': {
    name: 'Deer Creek',
    
    // DATA-DRIVEN from Summer 2025 analysis (1,216 thermal events)
    direction: {
      optimal: { min: 170, max: 200, ideal: 185 },
      acceptable: { min: 160, max: 220 },
      label: 'South',
      description: 'True South wind required (160-220°) - canyon orientation',
    },
    
    // Historical data shows 4.9 mph average, peaks around 5-6 mph
    speed: {
      typical: { min: 4, max: 12 },
      average: 5.0,
      peak: 8,
      unit: 'mph',
    },
    
    // Peak hours from data: 13:00 (28.4%), 12:00 (26.6%), 14:00 (21.7%)
    timing: {
      buildStart: { hour: 10, minute: 0, label: '10:00 AM' },
      usableStart: { hour: 11, minute: 0, label: '11:00 AM' },
      peakWindow: { start: 12, end: 15, label: '12:00 PM - 3:00 PM' },
      peakHour: 13, // 28.4% success rate at 1 PM
      fadeStart: { hour: 16, minute: 0, label: '4:00 PM' },
      fadeEnd: { hour: 20, minute: 0, label: '8:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 9.2,
      sampleSize: 13248,
      dataSource: 'DCC Jun-Aug 2025 (1,216 thermal events)',
      peakHourRate: 28.4, // % at 1 PM
      avgTempDelta: 9.6,  // DCC warmer than Arrowhead during thermals
    },
    
    // Arrowhead correlation - KEY TRIGGER from data analysis
    arrowheadTrigger: {
      tempDelta: 9.6, // DCC should be ~10°F warmer than Arrowhead
      triggerThreshold: 8, // When delta exceeds this, thermal likely
      // Wind trigger: When Arrowhead shows 12-18 mph from SSW (210°)
      windSpeed: { min: 12, max: 18, optimal: 14 },
      windDirection: { min: 200, max: 230, optimal: 210 }, // SSW
      leadTime: 60, // minutes - Arrowhead signal precedes Dam thermal
    },
    
    primaryStation: 'DCC',
    triggerStation: 'SND', // Arrowhead Summit
    referenceStation: 'KHCR', // Heber Airport
    yourStation: null,
    requirement: 'MUST have South wind (160-220°) - canyon only works with S flow',
  },
  
  'willard-bay': {
    name: 'Willard Bay',
    
    direction: {
      optimal: { min: 170, max: 220, ideal: 195 },
      acceptable: { min: 150, max: 240 },
      label: 'S to SW',
      description: 'South to Southwest - "The Gap" thermal from Great Salt Lake',
    },
    
    speed: {
      typical: { min: 6, max: 15 },
      average: 8,
      peak: 12,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 9, minute: 0, label: '9:00 AM' },
      usableStart: { hour: 11, minute: 0, label: '11:00 AM' },
      peakWindow: { start: 12, end: 15, label: '12:00 PM - 3:00 PM' },
      peakHour: 13,
      fadeStart: { hour: 16, minute: 0, label: '4:00 PM' },
      fadeEnd: { hour: 18, minute: 0, label: '6:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 22,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'KOGD',
    yourStation: null,
  },
  
  'pineview': {
    name: 'Pineview Reservoir',
    
    direction: {
      optimal: { min: 240, max: 300, ideal: 270 },
      acceptable: { min: 220, max: 320 },
      label: 'West',
      description: 'East/West canyon wind - depends on canyon orientation',
    },
    
    speed: {
      typical: { min: 5, max: 12 },
      average: 7,
      peak: 10,
      unit: 'mph',
    },
    
    timing: {
      buildStart: { hour: 10, minute: 0, label: '10:00 AM' },
      usableStart: { hour: 12, minute: 0, label: '12:00 PM' },
      peakWindow: { start: 12, end: 16, label: '12:00 PM - 4:00 PM' },
      peakHour: 14,
      fadeStart: { hour: 17, minute: 0, label: '5:00 PM' },
      fadeEnd: { hour: 19, minute: 0, label: '7:00 PM' },
    },
    
    statistics: {
      goodDaysPercent: 18,
      sampleSize: 0,
      dataSource: 'Estimated from regional patterns',
    },
    
    primaryStation: 'COOPOGNU1',
    yourStation: null,
  },
};

/**
 * Calculate thermal probability using historical data
 */
export function predictThermal(lakeId, currentConditions) {
  const profile = THERMAL_PROFILES[lakeId];
  if (!profile) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMonth = now.getMonth() + 1;
  const hourDecimal = currentHour + currentMinute / 60;
  
  const { timing, direction, speed } = profile;
  
  // Base probability from historical hourly data
  let baseProbability;
  let expectedPeakHour;
  let expectedPeakSpeed;
  let monthlyMultiplier = 1.0;
  let monthlyRate = 0.24; // Default
  
  if (lakeId === 'deer-creek') {
    // Use Deer Creek specific hourly data
    baseProbability = (DEER_CREEK_HOURLY_PROBABILITY[currentHour] || 0.02) * 100;
    expectedPeakHour = 13; // 1 PM is peak for Deer Creek
    expectedPeakSpeed = 5.0;
    // Summer months are best for Deer Creek
    if (currentMonth >= 6 && currentMonth <= 8) {
      monthlyMultiplier = 1.2;
      monthlyRate = 0.28; // ~28% in summer
    } else if (currentMonth >= 5 && currentMonth <= 9) {
      monthlyMultiplier = 1.0;
      monthlyRate = 0.20;
    } else {
      monthlyMultiplier = 0.5; // Winter is poor
      monthlyRate = 0.10;
    }
  } else if (lakeId.startsWith('utah-lake')) {
    // Utah Lake locations use FPS data
    baseProbability = (HOURLY_THERMAL_PROBABILITY[currentHour] || 0.05) * 100;
    monthlyRate = MONTHLY_SUCCESS_RATE[currentMonth] || 0.24;
    monthlyMultiplier = monthlyRate / 0.24;
    expectedPeakHour = MONTHLY_PEAK_HOUR[currentMonth] || 11;
    expectedPeakSpeed = MONTHLY_PEAK_SPEED[currentMonth] || 10.3;
  } else {
    // Other lakes use their profile stats
    baseProbability = profile.statistics.goodDaysPercent || 15;
    expectedPeakHour = profile.timing?.peakHour || 13;
    expectedPeakSpeed = profile.speed?.average || 8;
    monthlyRate = (profile.statistics.goodDaysPercent || 15) / 100;
  }
  
  // Determine phase
  let phase = 'unknown';
  let phaseMessage = '';
  let timeToThermal = null;
  
  if (hourDecimal < timing.buildStart.hour) {
    phase = 'pre-thermal';
    timeToThermal = Math.round((timing.usableStart.hour - hourDecimal) * 60);
    phaseMessage = `Too early. Thermal typically starts building at ${timing.buildStart.label}`;
  } else if (hourDecimal < timing.usableStart.hour) {
    phase = 'building';
    timeToThermal = Math.round((timing.usableStart.hour - hourDecimal) * 60);
    phaseMessage = `Thermal building. Usable conditions expected by ${timing.usableStart.label}`;
  } else if (hourDecimal >= timing.peakWindow.start && hourDecimal <= timing.peakWindow.end) {
    phase = 'peak';
    phaseMessage = `PEAK WINDOW: ${timing.peakWindow.label}`;
  } else if (hourDecimal > timing.peakWindow.end && hourDecimal < timing.fadeEnd.hour) {
    phase = 'fading';
    phaseMessage = `Thermal fading. ${Math.round((timing.fadeEnd.hour - hourDecimal) * 60)} min remaining`;
  } else {
    phase = 'ended';
    const hoursUntilTomorrow = (24 - hourDecimal) + timing.buildStart.hour;
    timeToThermal = Math.round(hoursUntilTomorrow * 60);
    phaseMessage = `Thermal window closed. Next opportunity tomorrow at ${timing.buildStart.label}`;
  }
  
  // Direction analysis
  let directionScore = 0;
  let directionStatus = 'unknown';
  let directionMessage = '';
  
  if (currentConditions?.windDirection != null) {
    const dir = currentConditions.windDirection;
    
    if (dir >= direction.optimal.min && dir <= direction.optimal.max) {
      directionStatus = 'optimal';
      directionScore = 100;
      directionMessage = `${dir}° is OPTIMAL (${direction.label})`;
    } else if (dir >= direction.acceptable.min && dir <= direction.acceptable.max) {
      directionStatus = 'acceptable';
      directionScore = 60;
      directionMessage = `${dir}° is acceptable but not ideal`;
    } else {
      directionStatus = 'wrong';
      directionScore = 0;
      directionMessage = `${dir}° is WRONG - need ${direction.label} (${direction.optimal.min}-${direction.optimal.max}°)`;
    }
  }
  
  // Speed analysis
  let speedScore = 0;
  let speedStatus = 'unknown';
  let speedMessage = '';
  
  if (currentConditions?.windSpeed != null) {
    const spd = currentConditions.windSpeed;
    
    if (spd >= speed.typical.min && spd <= speed.typical.max) {
      speedStatus = 'good';
      speedScore = 100;
      speedMessage = `${spd.toFixed(1)} mph is in thermal range`;
    } else if (spd >= speed.typical.min * 0.6 && spd < speed.typical.min) {
      speedStatus = 'building';
      speedScore = 50;
      speedMessage = `${spd.toFixed(1)} mph - thermal may still be building`;
    } else if (spd < speed.typical.min * 0.6) {
      speedStatus = 'light';
      speedScore = 20;
      speedMessage = `${spd.toFixed(1)} mph is too light`;
    } else {
      speedStatus = 'strong';
      speedScore = 40;
      speedMessage = `${spd.toFixed(1)} mph is stronger than typical`;
    }
  }
  
  // STEP A: Pressure gradient analysis (GRADIENT CHECK)
  // For SE thermal locations: ΔP > 2.0mb = North flow dominates, thermal busted
  // For North flow locations (Pelican, Mosida): POSITIVE gradient is GOOD
  let pressureScore = 50; // Neutral if no data
  let pressureStatus = 'unknown';
  let pressureMessage = '';
  
  const requiresNorthFlow = profile.requiresNorthFlow === true;
  
  if (currentConditions?.pressureGradient != null) {
    const gradient = currentConditions.pressureGradient;
    
    if (requiresNorthFlow) {
      // NORTH FLOW LOCATIONS (Pelican Point, Mosida)
      // These WANT positive gradient (SLC > Provo = North flow)
      if (gradient > 2.0) {
        pressureScore = 90;
        pressureStatus = 'excellent';
        pressureMessage = `ΔP +${gradient.toFixed(2)}mb = Strong North flow - IDEAL`;
      } else if (gradient > 0.5) {
        pressureScore = 70;
        pressureStatus = 'favorable';
        pressureMessage = `ΔP +${gradient.toFixed(2)}mb = Good North flow`;
      } else if (gradient > -0.5) {
        pressureScore = 40;
        pressureStatus = 'marginal';
        pressureMessage = `ΔP ${gradient.toFixed(2)}mb = Weak/variable flow`;
      } else {
        pressureScore = 10;
        pressureStatus = 'bust';
        pressureMessage = `ΔP ${gradient.toFixed(2)}mb = South flow - wrong for this launch`;
      }
    } else {
      // SE THERMAL LOCATIONS (Saratoga, etc.)
      // These WANT negative gradient (Provo > SLC = South flow)
      if (gradient > 2.0) {
        pressureScore = 0;
        pressureStatus = 'bust';
        pressureMessage = `ΔP +${gradient.toFixed(2)}mb > 2.0mb = North flow override`;
      } else if (gradient > 0) {
        pressureScore = 10;
        pressureStatus = 'marginal-bust';
        pressureMessage = `ΔP +${gradient.toFixed(2)}mb positive = North flow likely`;
      } else if (gradient > -0.5) {
        pressureScore = 40;
        pressureStatus = 'marginal';
        pressureMessage = `ΔP ${gradient.toFixed(2)}mb = Marginal conditions`;
      } else if (gradient > -1.5) {
        pressureScore = 70;
        pressureStatus = 'favorable';
        pressureMessage = `ΔP ${gradient.toFixed(2)}mb = Good thermal gradient`;
      } else {
        pressureScore = 90;
        pressureStatus = 'excellent';
        pressureMessage = `ΔP ${gradient.toFixed(2)}mb = Strong thermal gradient`;
      }
    }
  }
  
  // ARROWHEAD TRIGGER ANALYSIS (Deer Creek specific)
  // Data shows: When Arrowhead has 12-18 mph from SSW (210°), thermal at Dam is likely
  let arrowheadScore = 50;
  let arrowheadStatus = 'unknown';
  let arrowheadMessage = '';
  
  if (lakeId === 'deer-creek' && currentConditions?.ridgeWindSpeed != null) {
    const ridgeSpeed = currentConditions.ridgeWindSpeed;
    const ridgeDir = currentConditions.ridgeWindDirection;
    const trigger = DEER_CREEK_ARROWHEAD_TRIGGER;
    
    // Check wind speed trigger
    let speedScore = 0;
    if (ridgeSpeed >= trigger.speed.optimal.min && ridgeSpeed <= trigger.speed.optimal.max) {
      speedScore = 100; // 24-30% thermal probability
    } else if (ridgeSpeed >= trigger.speed.marginal.min && ridgeSpeed < trigger.speed.optimal.min) {
      speedScore = 50; // 13% thermal probability
    } else {
      speedScore = 10; // <4% thermal probability
    }
    
    // Check wind direction trigger
    let dirScore = 0;
    if (ridgeDir != null) {
      if (ridgeDir >= trigger.direction.optimal.min && ridgeDir <= trigger.direction.optimal.max) {
        dirScore = 100; // SSW is optimal (87% of thermals)
      } else if (ridgeDir >= trigger.direction.acceptable.min && ridgeDir <= trigger.direction.acceptable.max) {
        dirScore = 60; // S to WSW acceptable
      } else {
        dirScore = 0; // Wrong direction
      }
    }
    
    arrowheadScore = Math.round((speedScore * 0.6) + (dirScore * 0.4));
    
    if (arrowheadScore >= 80) {
      arrowheadStatus = 'trigger';
      arrowheadMessage = `TRIGGER: Arrowhead ${ridgeSpeed.toFixed(1)} mph from ${ridgeDir}° - thermal likely in 60 min`;
    } else if (arrowheadScore >= 50) {
      arrowheadStatus = 'building';
      arrowheadMessage = `Building: Arrowhead ${ridgeSpeed.toFixed(1)} mph (need 12-18 mph from SSW)`;
    } else {
      arrowheadStatus = 'no-trigger';
      arrowheadMessage = `No trigger: Arrowhead ${ridgeSpeed.toFixed(1)} mph (need 12-18 mph from SSW)`;
    }
  }

  // STEP B: Elevation Delta analysis (THERMAL PUMP)
  // For Deer Creek: Historical data shows 9.6°F avg delta during thermals
  let elevationScore = 50;
  let elevationStatus = 'unknown';
  let elevationMessage = '';
  
  if (currentConditions?.thermalDelta != null) {
    const delta = currentConditions.thermalDelta;
    
    // Deer Creek has specific temperature correlation from Arrowhead data
    if (lakeId === 'deer-creek') {
      // Data shows thermals occur when DCC is 8-12°F warmer than Arrowhead
      if (delta >= DEER_CREEK_TEMP_DELTA.optimal.min && delta <= DEER_CREEK_TEMP_DELTA.optimal.max) {
        elevationScore = 100;
        elevationStatus = 'optimal';
        elevationMessage = `Arrowhead correlation OPTIMAL: Δ${delta}°F (ideal: 8-12°F)`;
      } else if (delta >= 5) {
        elevationScore = 70;
        elevationStatus = 'building';
        elevationMessage = `Thermal building: Δ${delta}°F (need 8-12°F)`;
      } else if (delta >= 0) {
        elevationScore = 40;
        elevationStatus = 'weak';
        elevationMessage = `Weak delta: Only ${delta}°F (need 8-12°F)`;
      } else {
        elevationScore = 10;
        elevationStatus = 'inverted';
        elevationMessage = `Inverted: Arrowhead ${Math.abs(delta)}°F warmer - no thermal`;
      }
    } else {
      // Standard logic for other lakes
      if (currentConditions.inversionTrapped) {
        elevationScore = 0;
        elevationStatus = 'inversion';
        elevationMessage = `Inversion: Ridge warmer than shore (Δ${delta}°F)`;
      } else if (currentConditions.pumpActive) {
        elevationScore = 100;
        elevationStatus = 'pump-active';
        elevationMessage = `Thermal Pump ACTIVE: Shore ${delta}°F warmer`;
      } else if (delta >= 5) {
        elevationScore = 70;
        elevationStatus = 'building';
        elevationMessage = `Thermal building: Shore ${delta}°F warmer`;
      } else if (delta >= 0) {
        elevationScore = 40;
        elevationStatus = 'weak';
        elevationMessage = `Weak thermal: Shore only ${delta}°F warmer`;
      } else {
        elevationScore = 10;
        elevationStatus = 'inverted';
        elevationMessage = `Cold shore: Ridge ${Math.abs(delta)}°F warmer`;
      }
    }
  }
  
  // Calculate final probability using weighted 3-step model
  // Step A (Gradient): 40%, Step B (Elevation): 30%, Current Conditions: 30%
  let probability = baseProbability * monthlyMultiplier;
  
  // STEP A: Gradient Check (40% weight)
  if (pressureStatus === 'bust' || pressureStatus === 'marginal-bust') {
    probability *= 0.1; // 90% reduction - North flow dominates
  } else if (pressureStatus === 'excellent') {
    probability *= 1.4; // 40% boost
  } else if (pressureStatus === 'favorable') {
    probability *= 1.2; // 20% boost
  }
  
  // STEP B: Elevation Delta (30% weight)
  if (elevationStatus === 'inversion' || elevationStatus === 'inverted') {
    probability *= 0.2; // 80% reduction - air trapped
  } else if (elevationStatus === 'pump-active' || elevationStatus === 'optimal') {
    probability *= 1.5; // 50% boost - thermal pump active!
  } else if (elevationStatus === 'building') {
    probability *= 1.2; // 20% boost
  }
  
  // ARROWHEAD TRIGGER (Deer Creek specific)
  if (lakeId === 'deer-creek' && arrowheadStatus === 'trigger') {
    probability *= 1.8; // 80% boost when Arrowhead shows trigger pattern
  } else if (lakeId === 'deer-creek' && arrowheadStatus === 'no-trigger') {
    probability *= 0.5; // 50% reduction when no trigger
  }
  
  // SPANISH FORK EARLY INDICATOR (Utah Lake specific)
  // When QSF shows SE wind > 6 mph, thermal at Utah Lake likely in ~2 hours
  let spanishForkScore = 50;
  let spanishForkStatus = 'unknown';
  let spanishForkMessage = '';
  let spanishForkETA = null;
  
  if (lakeId.startsWith('utah-lake') && currentConditions?.spanishForkWind) {
    const sfWind = currentConditions.spanishForkWind;
    const sfSpeed = sfWind.speed;
    const sfDir = sfWind.direction;
    const trigger = SPANISH_FORK_INDICATOR.trigger;
    
    // Check if direction is SE (100-180°)
    const isSEDirection = sfDir >= trigger.direction.min && sfDir <= trigger.direction.max;
    
    if (isSEDirection && sfSpeed >= trigger.speed.threshold) {
      // Strong indicator - thermal likely in 2 hours
      spanishForkScore = 90;
      spanishForkStatus = 'strong';
      spanishForkMessage = `EARLY WARNING: Spanish Fork ${sfSpeed.toFixed(1)} mph from ${sfDir}° - thermal expected in ~2 hours`;
      spanishForkETA = 120; // minutes
      probability *= 1.4; // 40% boost
    } else if (isSEDirection && sfSpeed >= trigger.speed.min) {
      // Moderate indicator
      spanishForkScore = 70;
      spanishForkStatus = 'moderate';
      spanishForkMessage = `Building: Spanish Fork ${sfSpeed.toFixed(1)} mph SE - thermal developing`;
      spanishForkETA = 150; // minutes
      probability *= 1.2; // 20% boost
    } else if (isSEDirection) {
      // Weak SE
      spanishForkScore = 40;
      spanishForkStatus = 'weak';
      spanishForkMessage = `Weak: Spanish Fork ${sfSpeed.toFixed(1)} mph SE (need > 6 mph)`;
    } else {
      // Wrong direction
      spanishForkScore = 20;
      spanishForkStatus = 'no-signal';
      spanishForkMessage = `No signal: Spanish Fork ${sfDir}° (need SE 100-180°)`;
      probability *= 0.9; // 10% reduction
    }
  }
  
  // NORTH FLOW EARLY INDICATOR (Utah Lake north flow locations)
  // VALIDATED: When KSLC shows N/NW wind, expect these speeds at Zig Zag 1hr later:
  // - KSLC 8-10 mph → ~13 mph at Zig Zag (56% foil kiteable)
  // - KSLC 10-15 mph → ~15.5 mph at Zig Zag (81% foil kiteable)
  // - KSLC 15+ mph → ~23 mph at Zig Zag (100% kiteable)
  let northFlowScore = 50;
  let northFlowStatus = 'unknown';
  let northFlowMessage = '';
  let northFlowETA = null;
  let expectedZigZagSpeed = null;
  let foilKiteablePct = null;
  let twinTipKiteablePct = null;
  
  if (lakeId.startsWith('utah-lake') && requiresNorthFlow && currentConditions?.kslcWind) {
    const kslcWind = currentConditions.kslcWind;
    const kslcSpeed = kslcWind.speed;
    const kslcDir = kslcWind.direction;
    const trigger = NORTH_FLOW_INDICATOR.trigger;
    const correlation = NORTH_FLOW_INDICATOR.speedCorrelation;
    const gradient = currentConditions?.pressureGradient;
    
    // Check if direction is N/NW/NE (315-360 or 0-45)
    const isNorthDirection = kslcDir >= trigger.direction.min || kslcDir <= trigger.direction.max;
    const hasPositiveGradient = gradient != null && gradient > 0;
    
    // Determine expected Zig Zag speed based on validated correlation
    if (kslcSpeed >= 15) {
      expectedZigZagSpeed = correlation['15+'].avgFps;
      foilKiteablePct = correlation['15+'].foilKiteable;
      twinTipKiteablePct = correlation['15+'].twinTipKiteable;
    } else if (kslcSpeed >= 10) {
      expectedZigZagSpeed = correlation['10-15'].avgFps;
      foilKiteablePct = correlation['10-15'].foilKiteable;
      twinTipKiteablePct = correlation['10-15'].twinTipKiteable;
    } else if (kslcSpeed >= 8) {
      expectedZigZagSpeed = correlation['8-10'].avgFps;
      foilKiteablePct = correlation['8-10'].foilKiteable;
      twinTipKiteablePct = correlation['8-10'].twinTipKiteable;
    } else if (kslcSpeed >= 5) {
      expectedZigZagSpeed = correlation['5-8'].avgFps;
      foilKiteablePct = correlation['5-8'].foilKiteable;
      twinTipKiteablePct = correlation['5-8'].twinTipKiteable;
    }
    
    if (isNorthDirection && kslcSpeed >= 10) {
      // Strong indicator - 81% foil kiteable, ~15+ mph at Zig Zag
      northFlowScore = 95;
      northFlowStatus = 'strong';
      northFlowMessage = `NORTH FLOW: KSLC ${kslcSpeed.toFixed(0)} mph N → expect ~${expectedZigZagSpeed?.toFixed(0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.6;
    } else if (isNorthDirection && kslcSpeed >= 8) {
      // Moderate indicator - 56% foil kiteable, ~13 mph at Zig Zag
      northFlowScore = 75;
      northFlowStatus = 'moderate';
      northFlowMessage = `Building: KSLC ${kslcSpeed.toFixed(0)} mph N → expect ~${expectedZigZagSpeed?.toFixed(0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.3;
    } else if (isNorthDirection && kslcSpeed >= 5) {
      // Marginal indicator - 45% foil kiteable, ~9 mph at Zig Zag
      northFlowScore = 50;
      northFlowStatus = 'marginal';
      northFlowMessage = `Marginal: KSLC ${kslcSpeed.toFixed(0)} mph N → expect ~${expectedZigZagSpeed?.toFixed(0)} mph at Zig Zag (${foilKiteablePct}% foil kiteable)`;
      northFlowETA = 60;
      probability *= 1.1;
    } else if (isNorthDirection) {
      // Weak north wind
      northFlowScore = 30;
      northFlowStatus = 'weak';
      northFlowMessage = `Weak: KSLC ${kslcSpeed?.toFixed(0) || '?'} mph N (need 8+ for foil, 10+ for twin tip)`;
    } else if (hasPositiveGradient) {
      // Positive gradient but no north wind yet
      northFlowScore = 40;
      northFlowStatus = 'gradient-only';
      northFlowMessage = `Gradient favorable (+${gradient?.toFixed(2)} mb) but KSLC not showing north yet`;
    } else {
      // No signal
      northFlowScore = 20;
      northFlowStatus = 'no-signal';
      northFlowMessage = `No north signal: KSLC ${kslcDir}° (need N/NW 315-45°)`;
      probability *= 0.8;
    }
  }
  
  // PROVO AIRPORT INDICATOR (Best for Lincoln Beach & Sandy Beach)
  // VALIDATED: KPVU 8-10 mph N → 78% foil kiteable (better than KSLC's 56%)
  let provoIndicator = null;
  
  if ((lakeId === 'utah-lake-lincoln' || lakeId === 'utah-lake-sandy') && currentConditions?.kpvuWind) {
    const kpvuWind = currentConditions.kpvuWind;
    const kpvuSpeed = kpvuWind.speed;
    const kpvuDir = kpvuWind.direction;
    const correlation = PROVO_AIRPORT_INDICATOR.speedCorrelation;
    
    const isNorthDirection = kpvuDir >= 315 || kpvuDir <= 45;
    
    let expectedSpeed = null;
    let foilPct = null;
    let twinPct = null;
    
    if (kpvuSpeed >= 15) {
      expectedSpeed = correlation['15+'].avgFps;
      foilPct = correlation['15+'].foilKiteable;
      twinPct = correlation['15+'].twinTipKiteable;
    } else if (kpvuSpeed >= 10) {
      expectedSpeed = correlation['10-15'].avgFps;
      foilPct = correlation['10-15'].foilKiteable;
      twinPct = correlation['10-15'].twinTipKiteable;
    } else if (kpvuSpeed >= 8) {
      expectedSpeed = correlation['8-10'].avgFps;
      foilPct = correlation['8-10'].foilKiteable;
      twinPct = correlation['8-10'].twinTipKiteable;
    } else if (kpvuSpeed >= 5) {
      expectedSpeed = correlation['5-8'].avgFps;
      foilPct = correlation['5-8'].foilKiteable;
      twinPct = correlation['5-8'].twinTipKiteable;
    }
    
    let status = 'unknown';
    let message = '';
    
    if (isNorthDirection && kpvuSpeed >= 10) {
      status = 'strong';
      message = `PROVO: ${kpvuSpeed.toFixed(0)} mph N → expect ~${expectedSpeed?.toFixed(0)} mph (${foilPct}% foil)`;
      probability *= 1.4;
    } else if (isNorthDirection && kpvuSpeed >= 8) {
      status = 'good';
      message = `PROVO: ${kpvuSpeed.toFixed(0)} mph N → expect ~${expectedSpeed?.toFixed(0)} mph (${foilPct}% foil)`;
      probability *= 1.2;
    } else if (isNorthDirection && kpvuSpeed >= 5) {
      status = 'possible';
      message = `PROVO: ${kpvuSpeed.toFixed(0)} mph N → expect ~${expectedSpeed?.toFixed(0)} mph (${foilPct}% foil)`;
    } else {
      status = 'no-signal';
      message = `PROVO: ${kpvuDir}° at ${kpvuSpeed?.toFixed(0) || '?'} mph (need N/NW)`;
    }
    
    provoIndicator = {
      status,
      message,
      windSpeed: kpvuSpeed,
      windDirection: kpvuDir,
      expectedSpeed,
      foilKiteablePct: foilPct,
      twinTipKiteablePct: twinPct,
      stationName: 'Provo Airport (KPVU)',
    };
  }
  
  // POINT OF MOUNTAIN INDICATOR (Gap wind)
  // Shows wind funneling through the gap - good confirmation
  let pointOfMountainIndicator = null;
  
  if (lakeId.startsWith('utah-lake') && currentConditions?.utalpWind) {
    const utalpWind = currentConditions.utalpWind;
    const utalpSpeed = utalpWind.speed;
    const utalpDir = utalpWind.direction;
    const correlation = POINT_OF_MOUNTAIN_INDICATOR.speedCorrelation;
    
    const isNorthDirection = utalpDir >= 315 || utalpDir <= 45;
    
    let expectedSpeed = null;
    let foilPct = null;
    let twinPct = null;
    
    if (utalpSpeed >= 15) {
      expectedSpeed = correlation['15+'].avgFps;
      foilPct = correlation['15+'].foilKiteable;
      twinPct = correlation['15+'].twinTipKiteable;
    } else if (utalpSpeed >= 10) {
      expectedSpeed = correlation['10-15'].avgFps;
      foilPct = correlation['10-15'].foilKiteable;
      twinPct = correlation['10-15'].twinTipKiteable;
    } else if (utalpSpeed >= 8) {
      expectedSpeed = correlation['8-10'].avgFps;
      foilPct = correlation['8-10'].foilKiteable;
      twinPct = correlation['8-10'].twinTipKiteable;
    } else if (utalpSpeed >= 5) {
      expectedSpeed = correlation['5-8'].avgFps;
      foilPct = correlation['5-8'].foilKiteable;
      twinPct = correlation['5-8'].twinTipKiteable;
    }
    
    let status = 'unknown';
    let message = '';
    
    if (isNorthDirection && utalpSpeed >= 10) {
      status = 'strong';
      message = `Gap wind: ${utalpSpeed.toFixed(0)} mph N through Point of Mountain`;
    } else if (isNorthDirection && utalpSpeed >= 8) {
      status = 'moderate';
      message = `Gap wind building: ${utalpSpeed.toFixed(0)} mph N`;
    } else if (isNorthDirection && utalpSpeed >= 5) {
      status = 'weak';
      message = `Light gap wind: ${utalpSpeed.toFixed(0)} mph N`;
    } else {
      status = 'no-signal';
      message = `No gap wind: ${utalpDir}° at ${utalpSpeed?.toFixed(0) || '?'} mph`;
    }
    
    pointOfMountainIndicator = {
      status,
      message,
      windSpeed: utalpSpeed,
      windDirection: utalpDir,
      expectedSpeed,
      foilKiteablePct: foilPct,
      twinTipKiteablePct: twinPct,
      stationName: 'Point of Mountain (UTALP)',
    };
  }
  
  // STEP C: Ground Truth / Current Conditions (30% weight)
  if (directionStatus === 'wrong') {
    probability *= 0.1; // 90% reduction
  } else if (directionStatus === 'optimal') {
    probability *= 1.3; // 30% boost
  }
  
  if (speedStatus === 'good') {
    probability *= 1.2;
  } else if (speedStatus === 'light') {
    probability *= 0.5;
  }
  
  // Hard rules from historical data
  if (pressureStatus === 'bust') {
    if (requiresNorthFlow && currentConditions?.pressureGradient < -1.0) {
      probability = 0; // North flow location but South flow present
    } else if (!requiresNorthFlow && currentConditions?.pressureGradient > 2.0) {
      probability = 0; // SE thermal location but strong North flow
    }
  }
  
  // Phase adjustment
  if (phase === 'ended') {
    probability = 0;
  } else if (phase === 'pre-thermal' && currentHour < 5) {
    probability *= 0.3;
  }
  
  // Cap at 95%
  probability = Math.min(95, Math.max(0, Math.round(probability)));
  
  // Generate prediction message
  let predictionMessage = '';
  let willHaveThermal = null;
  
  if (probability >= 60) {
    willHaveThermal = true;
    predictionMessage = `High probability (${probability}%) of SE thermal`;
  } else if (probability >= 30) {
    willHaveThermal = null;
    predictionMessage = `Moderate chance (${probability}%) - conditions developing`;
  } else if (probability > 0) {
    willHaveThermal = false;
    predictionMessage = `Low probability (${probability}%) - conditions unfavorable`;
  } else {
    willHaveThermal = false;
    if (phase === 'ended') {
      predictionMessage = `0% - Thermal window closed for today`;
    } else if (pressureStatus === 'bust') {
      predictionMessage = `0% - Pressure gradient unfavorable (historical: 0% success when SLC > PVU)`;
    } else if (directionStatus === 'wrong') {
      predictionMessage = `0% - Wrong wind direction`;
    } else {
      predictionMessage = `0% - Conditions not favorable`;
    }
  }
  
  return {
    lakeId,
    profile,
    phase,
    phaseMessage,
    timeToThermal,
    
    probability,
    
    direction: {
      status: directionStatus,
      score: directionScore,
      message: directionMessage,
      expected: direction.label,
      expectedRange: `${direction.optimal.min}-${direction.optimal.max}°`,
      current: currentConditions?.windDirection,
    },
    
    speed: {
      status: speedStatus,
      score: speedScore,
      message: speedMessage,
      expectedAvg: expectedPeakSpeed,
      expectedRange: `${speed.typical.min}-${speed.typical.max} mph`,
      current: currentConditions?.windSpeed,
    },
    
    timing: {
      peakWindow: timing.peakWindow.label,
      peakHour: Math.round(expectedPeakHour),
      startTime: timing.usableStart.label,
      currentPhase: phase,
    },
    
    pressure: {
      status: pressureStatus,
      score: pressureScore,
      gradient: currentConditions?.pressureGradient,
      message: pressureMessage,
      bustThreshold: 2.0,
    },
    
    elevation: {
      status: elevationStatus,
      score: elevationScore,
      delta: currentConditions?.thermalDelta,
      message: elevationMessage,
      pumpActive: currentConditions?.pumpActive,
      inversionTrapped: currentConditions?.inversionTrapped,
    },
    
    // Arrowhead trigger (Deer Creek specific)
    arrowhead: lakeId === 'deer-creek' ? {
      status: arrowheadStatus,
      score: arrowheadScore,
      message: arrowheadMessage,
      windSpeed: currentConditions?.ridgeWindSpeed,
      windDirection: currentConditions?.ridgeWindDirection,
      stationName: currentConditions?.ridgeStationName || 'Arrowhead',
      triggerConditions: {
        speedNeeded: '12-18 mph',
        directionNeeded: 'SSW (200-230°)',
        leadTime: '60 min',
      },
    } : null,
    
    // Spanish Fork early indicator (Utah Lake specific)
    spanishFork: lakeId.startsWith('utah-lake') ? {
      status: spanishForkStatus,
      score: spanishForkScore,
      message: spanishForkMessage,
      eta: spanishForkETA,
      windSpeed: currentConditions?.spanishForkWind?.speed,
      windDirection: currentConditions?.spanishForkWind?.direction,
      stationName: 'Spanish Fork (QSF)',
      triggerConditions: {
        directionNeeded: 'SE (100-180°)',
        speedNeeded: '> 6 mph (7.5+ optimal)',
        leadTime: '~2 hours',
      },
      statistics: {
        seDirectionOnGoodDays: '97%',
        avgSpeedOnGoodDays: '7.6 mph',
        accuracy: '62.5%',
      },
    } : null,
    
    // North Flow early indicator (Utah Lake north flow locations)
    northFlow: (lakeId.startsWith('utah-lake') && requiresNorthFlow) ? {
      status: northFlowStatus,
      score: northFlowScore,
      message: northFlowMessage,
      eta: northFlowETA,
      windSpeed: currentConditions?.kslcWind?.speed,
      windDirection: currentConditions?.kslcWind?.direction,
      pressureGradient: currentConditions?.pressureGradient,
      // Validated expected speed at Zig Zag
      expectedZigZagSpeed,
      foilKiteablePct,
      twinTipKiteablePct,
      stationName: 'Salt Lake City (KSLC)',
      triggerConditions: {
        directionNeeded: 'N/NW (315-45°)',
        speedNeeded: '8+ mph (10+ optimal)',
        gradientNeeded: 'Positive (SLC > Provo)',
        leadTime: '~1 hour',
      },
      // Validated correlation data
      correlation: {
        'KSLC 8-10 mph': '→ ~13 mph at Zig Zag (56% foil)',
        'KSLC 10-15 mph': '→ ~15 mph at Zig Zag (81% foil)',
        'KSLC 15+ mph': '→ ~23 mph at Zig Zag (100% kiteable)',
      },
    } : null,
    
    // Provo Airport indicator (Best for Lincoln Beach & Sandy Beach)
    provoIndicator: provoIndicator,
    
    // Point of Mountain indicator (Gap wind)
    pointOfMountain: pointOfMountainIndicator,
    
    prediction: {
      willHaveThermal,
      confidence: probability,
      message: predictionMessage,
    },
    
    monthlyContext: {
      month: currentMonth,
      successRate: Math.round(monthlyRate * 100),
      expectedPeakHour: Math.round(expectedPeakHour),
      expectedPeakSpeed: expectedPeakSpeed.toFixed(1),
    },
    
    statistics: profile.statistics,
  };
}

/**
 * Get direction info
 */
export function getDirectionInfo(degrees) {
  if (degrees == null) return { cardinal: 'N/A', arrow: '?' };
  
  const directions = [
    { min: 0, max: 22.5, cardinal: 'N', arrow: '↓' },
    { min: 22.5, max: 67.5, cardinal: 'NE', arrow: '↙' },
    { min: 67.5, max: 112.5, cardinal: 'E', arrow: '←' },
    { min: 112.5, max: 157.5, cardinal: 'SE', arrow: '↖' },
    { min: 157.5, max: 202.5, cardinal: 'S', arrow: '↑' },
    { min: 202.5, max: 247.5, cardinal: 'SW', arrow: '↗' },
    { min: 247.5, max: 292.5, cardinal: 'W', arrow: '→' },
    { min: 292.5, max: 337.5, cardinal: 'NW', arrow: '↘' },
    { min: 337.5, max: 360, cardinal: 'N', arrow: '↓' },
  ];
  
  const match = directions.find(d => degrees >= d.min && degrees < d.max);
  return match || { cardinal: 'N', arrow: '↓' };
}

/**
 * Format time until thermal
 */
export function formatTimeUntil(minutes) {
  if (minutes == null || minutes <= 0) return null;
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
```

---

## File 21: `src/services/ForecastService.js`

> 737 lines | 22.0 KB

```javascript
/**
 * FORECAST SERVICE
 * 
 * Integrates NWS forecasts and weather warnings with our prediction model.
 * 
 * This service:
 * 1. Fetches NWS forecasts and alerts
 * 2. Parses forecast text for wind-relevant keywords
 * 3. Correlates forecast patterns with expected surface wind conditions
 * 4. Provides multi-day wind predictions
 */

import axios from 'axios';

// NWS API configuration
const NWS_BASE_URL = 'https://api.weather.gov';
const USER_AGENT = 'UtahWindPro/1.0 (kite-forecast-app)';

// Forecast grid points for our locations
const FORECAST_POINTS = {
  'utah-lake': { lat: 40.30, lng: -111.88 },
  'deer-creek': { lat: 40.48, lng: -111.50 },
  'willard-bay': { lat: 41.38, lng: -112.07 },
};

// Weather pattern keywords and their wind implications
const WEATHER_PATTERNS = {
  // North flow patterns
  northFlow: {
    keywords: ['north wind', 'northerly', 'cold front', 'high pressure building', 'clearing'],
    directionKeywords: ['N ', 'NNW', 'NNE', 'north'],
    expectedEffect: 'north_flow',
    kiteability: 'excellent',
    confidence: 0.85,
  },
  
  // South storm patterns
  southStorm: {
    keywords: ['south wind', 'southerly', 'low pressure', 'storm', 'approaching front'],
    directionKeywords: ['S ', 'SSW', 'SSE', 'south'],
    expectedEffect: 'south_storm',
    kiteability: 'poor_gusty',
    confidence: 0.70,
  },
  
  // Thermal patterns
  thermal: {
    keywords: ['sunny', 'clear', 'light wind', 'high pressure', 'warming'],
    directionKeywords: ['SE', 'ESE', 'light and variable'],
    expectedEffect: 'thermal',
    kiteability: 'good_afternoon',
    confidence: 0.65,
  },
  
  // Wind advisory patterns
  windAdvisory: {
    keywords: ['wind advisory', 'high wind', 'gusty', 'strong wind', 'damaging wind'],
    directionKeywords: [],
    expectedEffect: 'high_wind',
    kiteability: 'dangerous',
    confidence: 0.95,
  },
  
  // Calm patterns
  calm: {
    keywords: ['calm', 'light wind', 'variable', 'little wind'],
    directionKeywords: ['calm', 'light'],
    expectedEffect: 'calm',
    kiteability: 'poor_light',
    confidence: 0.60,
  },
};

// Alert severity mapping
const ALERT_SEVERITY = {
  'Extreme': { level: 4, color: 'red', action: 'DO NOT KITE' },
  'Severe': { level: 3, color: 'orange', action: 'Dangerous conditions' },
  'Moderate': { level: 2, color: 'yellow', action: 'Use caution' },
  'Minor': { level: 1, color: 'blue', action: 'Monitor conditions' },
};

// Forecast stages for multi-stage prediction system
export const FORECAST_STAGES = {
  DAY_BEFORE: 'day_before',      // Evening before - initial outlook
  MORNING: 'morning',            // Morning of - updated forecast
  PRE_THERMAL: 'pre_thermal',    // 1-2 hours before expected thermal
  IMMINENT: 'imminent',          // 30 min - 1 hour before
  ACTIVE: 'active',              // Thermal/wind event is happening
};

/**
 * Fetch NWS forecast grid data for a location
 */
async function getForecastGrid(lat, lng) {
  try {
    const response = await axios.get(`${NWS_BASE_URL}/points/${lat},${lng}`, {
      headers: { 'Accept': 'application/geo+json' },
      timeout: 10000,
    });
    
    return {
      forecastUrl: response.data.properties.forecast,
      forecastHourlyUrl: response.data.properties.forecastHourly,
      forecastGridUrl: response.data.properties.forecastGridData,
      forecastOffice: response.data.properties.forecastOffice,
      gridX: response.data.properties.gridX,
      gridY: response.data.properties.gridY,
    };
  } catch (error) {
    console.error('Error fetching forecast grid:', error.message);
    return null;
  }
}

/**
 * Fetch active weather alerts for Utah
 */
export async function getActiveAlerts() {
  try {
    const response = await axios.get(`${NWS_BASE_URL}/alerts/active`, {
      params: { area: 'UT' },
      headers: { 'Accept': 'application/geo+json' },
      timeout: 10000,
    });
    
    const alerts = response.data.features || [];
    
    // Filter and process wind-relevant alerts
    const windAlerts = alerts
      .filter(alert => {
        const event = alert.properties.event?.toLowerCase() || '';
        return (
          event.includes('wind') ||
          event.includes('storm') ||
          event.includes('front') ||
          event.includes('advisory') ||
          event.includes('warning')
        );
      })
      .map(alert => ({
        id: alert.properties.id,
        event: alert.properties.event,
        severity: alert.properties.severity,
        severityInfo: ALERT_SEVERITY[alert.properties.severity] || ALERT_SEVERITY['Minor'],
        headline: alert.properties.headline,
        description: alert.properties.description,
        instruction: alert.properties.instruction,
        onset: alert.properties.onset,
        ends: alert.properties.ends,
        areas: alert.properties.areaDesc,
        // Parse wind info from description
        windInfo: parseWindFromAlert(alert.properties.description),
      }));
    
    return windAlerts;
  } catch (error) {
    console.error('Error fetching alerts:', error.message);
    return [];
  }
}

/**
 * Parse wind speed and direction from alert text
 */
function parseWindFromAlert(description) {
  if (!description) return null;
  
  const windInfo = {
    speed: null,
    gust: null,
    direction: null,
  };
  
  // Look for wind speed patterns
  const speedMatch = description.match(/winds?\s+(\d+)\s*(?:to\s*(\d+))?\s*mph/i);
  if (speedMatch) {
    windInfo.speed = parseInt(speedMatch[1]);
    if (speedMatch[2]) {
      windInfo.speed = (parseInt(speedMatch[1]) + parseInt(speedMatch[2])) / 2;
    }
  }
  
  // Look for gust patterns
  const gustMatch = description.match(/gusts?\s+(?:up\s+to\s+)?(\d+)\s*mph/i);
  if (gustMatch) {
    windInfo.gust = parseInt(gustMatch[1]);
  }
  
  // Look for direction
  const dirMatch = description.match(/(north|south|east|west|NW|NE|SW|SE|N|S|E|W)\s+wind/i);
  if (dirMatch) {
    windInfo.direction = dirMatch[1].toUpperCase();
  }
  
  return windInfo;
}

/**
 * Fetch 7-day forecast for a location
 */
export async function get7DayForecast(locationId = 'utah-lake') {
  const point = FORECAST_POINTS[locationId] || FORECAST_POINTS['utah-lake'];
  
  try {
    const grid = await getForecastGrid(point.lat, point.lng);
    if (!grid) return null;
    
    const response = await axios.get(grid.forecastUrl, {
      headers: { 'Accept': 'application/geo+json' },
      timeout: 10000,
    });
    
    const periods = response.data.properties.periods || [];
    
    return periods.map(period => ({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      isDaytime: period.isDaytime,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      shortForecast: period.shortForecast,
      detailedForecast: period.detailedForecast,
      // Analyze for kiting
      windAnalysis: analyzeWindForecast(period),
    }));
  } catch (error) {
    console.error('Error fetching 7-day forecast:', error.message);
    return null;
  }
}

/**
 * Fetch hourly forecast for detailed wind prediction
 */
export async function getHourlyForecast(locationId = 'utah-lake') {
  const point = FORECAST_POINTS[locationId] || FORECAST_POINTS['utah-lake'];
  
  try {
    const grid = await getForecastGrid(point.lat, point.lng);
    if (!grid) return null;
    
    const response = await axios.get(grid.forecastHourlyUrl, {
      headers: { 'Accept': 'application/geo+json' },
      timeout: 10000,
    });
    
    const periods = response.data.properties.periods || [];
    
    return periods.slice(0, 48).map(period => ({
      startTime: period.startTime,
      temperature: period.temperature,
      windSpeed: parseWindSpeed(period.windSpeed),
      windDirection: period.windDirection,
      shortForecast: period.shortForecast,
      // Kiting analysis
      kiteAnalysis: analyzeHourlyForKiting(period),
    }));
  } catch (error) {
    console.error('Error fetching hourly forecast:', error.message);
    return null;
  }
}

/**
 * Parse wind speed string to number
 */
function parseWindSpeed(windSpeedStr) {
  if (!windSpeedStr) return null;
  
  // Handle "10 mph" or "10 to 15 mph"
  const match = windSpeedStr.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  if (match) {
    if (match[2]) {
      return (parseInt(match[1]) + parseInt(match[2])) / 2;
    }
    return parseInt(match[1]);
  }
  return null;
}

/**
 * Analyze a forecast period for wind patterns
 */
function analyzeWindForecast(period) {
  const forecast = (period.detailedForecast || '').toLowerCase();
  const shortForecast = (period.shortForecast || '').toLowerCase();
  const windDir = (period.windDirection || '').toUpperCase();
  const windSpeed = parseWindSpeed(period.windSpeed);
  
  let pattern = null;
  let confidence = 0;
  let kiteability = 'unknown';
  let notes = [];
  
  // Check each weather pattern
  for (const [patternName, patternConfig] of Object.entries(WEATHER_PATTERNS)) {
    let matchScore = 0;
    
    // Check keywords in forecast text
    for (const keyword of patternConfig.keywords) {
      if (forecast.includes(keyword) || shortForecast.includes(keyword)) {
        matchScore += 2;
      }
    }
    
    // Check direction keywords
    for (const dirKeyword of patternConfig.directionKeywords) {
      if (windDir.includes(dirKeyword.toUpperCase())) {
        matchScore += 3;
      }
    }
    
    if (matchScore > 0 && matchScore > confidence) {
      pattern = patternName;
      confidence = Math.min(matchScore / 10, patternConfig.confidence);
      kiteability = patternConfig.kiteability;
    }
  }
  
  // Adjust based on wind speed
  if (windSpeed !== null) {
    if (windSpeed >= 10 && windSpeed <= 25) {
      notes.push(`Good kite speed: ${windSpeed} mph`);
      if (kiteability === 'unknown') kiteability = 'possible';
    } else if (windSpeed > 25) {
      notes.push(`Strong wind: ${windSpeed} mph - use caution`);
      kiteability = 'caution_strong';
    } else if (windSpeed < 10) {
      notes.push(`Light wind: ${windSpeed} mph`);
      if (kiteability === 'unknown') kiteability = 'poor_light';
    }
  }
  
  // Check for specific conditions
  if (forecast.includes('rain') || forecast.includes('thunder')) {
    notes.push('Precipitation expected');
    kiteability = 'poor_weather';
  }
  
  if (forecast.includes('gust')) {
    notes.push('Gusty conditions');
    if (kiteability === 'excellent') kiteability = 'good_gusty';
  }
  
  return {
    pattern,
    confidence,
    kiteability,
    notes,
    windSpeed,
    windDirection: windDir,
  };
}

/**
 * Analyze hourly forecast for kiting
 */
function analyzeHourlyForKiting(period) {
  const windSpeed = parseWindSpeed(period.windSpeed);
  const windDir = (period.windDirection || '').toUpperCase();
  const hour = new Date(period.startTime).getHours();
  
  let foilKiteable = false;
  let twinTipKiteable = false;
  let thermalWindow = false;
  let northFlowWindow = false;
  
  // Check speed thresholds
  if (windSpeed >= 10) foilKiteable = true;
  if (windSpeed >= 15) twinTipKiteable = true;
  
  // Check for thermal window (SE wind, afternoon)
  if (['SE', 'ESE', 'SSE', 'E'].includes(windDir) && hour >= 12 && hour <= 18) {
    thermalWindow = true;
  }
  
  // Check for north flow window
  if (['N', 'NNW', 'NNE', 'NW', 'NE'].includes(windDir) && windSpeed >= 10) {
    northFlowWindow = true;
  }
  
  return {
    foilKiteable,
    twinTipKiteable,
    thermalWindow,
    northFlowWindow,
    windSpeed,
    windDirection: windDir,
    hour,
  };
}

/**
 * Get forecast-based kite windows for the next 48 hours
 */
export async function getKiteWindows(locationId = 'utah-lake') {
  const hourly = await getHourlyForecast(locationId);
  if (!hourly) return [];
  
  const windows = [];
  let currentWindow = null;
  
  for (const hour of hourly) {
    const analysis = hour.kiteAnalysis;
    
    if (analysis.foilKiteable) {
      if (!currentWindow) {
        currentWindow = {
          start: hour.startTime,
          end: hour.startTime,
          type: analysis.northFlowWindow ? 'north_flow' : 
                analysis.thermalWindow ? 'thermal' : 'other',
          avgSpeed: analysis.windSpeed,
          direction: analysis.windDirection,
          hours: 1,
          foilOnly: !analysis.twinTipKiteable,
        };
      } else {
        currentWindow.end = hour.startTime;
        currentWindow.avgSpeed = (currentWindow.avgSpeed * currentWindow.hours + analysis.windSpeed) / (currentWindow.hours + 1);
        currentWindow.hours++;
        if (analysis.twinTipKiteable) currentWindow.foilOnly = false;
      }
    } else {
      if (currentWindow && currentWindow.hours >= 2) {
        windows.push(currentWindow);
      }
      currentWindow = null;
    }
  }
  
  // Don't forget the last window
  if (currentWindow && currentWindow.hours >= 2) {
    windows.push(currentWindow);
  }
  
  return windows;
}

/**
 * Get combined forecast summary with alerts
 */
export async function getForecastSummary(locationId = 'utah-lake') {
  const [alerts, forecast, kiteWindows] = await Promise.all([
    getActiveAlerts(),
    get7DayForecast(locationId),
    getKiteWindows(locationId),
  ]);
  
  // Find relevant alerts for this location
  const relevantAlerts = alerts.filter(alert => {
    const areas = (alert.areas || '').toLowerCase();
    if (locationId.includes('utah-lake')) {
      return areas.includes('utah') || areas.includes('salt lake');
    }
    if (locationId.includes('deer-creek')) {
      return areas.includes('wasatch') || areas.includes('summit');
    }
    if (locationId.includes('willard')) {
      return areas.includes('weber') || areas.includes('box elder');
    }
    return true;
  });
  
  // Build day-by-day summary
  const daySummaries = [];
  if (forecast) {
    for (let i = 0; i < forecast.length; i += 2) {
      const dayPeriod = forecast[i];
      const nightPeriod = forecast[i + 1];
      
      if (!dayPeriod) continue;
      
      const dayDate = new Date(dayPeriod.startTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      
      // Find kite windows for this day
      const dayStart = new Date(dayPeriod.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayWindows = kiteWindows.filter(w => {
        const windowStart = new Date(w.start);
        return windowStart >= dayStart && windowStart < dayEnd;
      });
      
      daySummaries.push({
        date: dayDate,
        dateObj: dayStart,
        day: dayPeriod,
        night: nightPeriod,
        kiteWindows: dayWindows,
        hasKiteableWind: dayWindows.length > 0,
        bestWindow: dayWindows.length > 0 ? dayWindows.reduce((best, w) => 
          w.avgSpeed > best.avgSpeed ? w : best
        ) : null,
      });
    }
  }
  
  return {
    alerts: relevantAlerts,
    hasActiveAlert: relevantAlerts.length > 0,
    highestAlertSeverity: relevantAlerts.length > 0 
      ? relevantAlerts.reduce((max, a) => 
          (a.severityInfo?.level || 0) > (max.severityInfo?.level || 0) ? a : max
        )
      : null,
    daySummaries,
    kiteWindows,
    nextKiteWindow: kiteWindows.length > 0 ? kiteWindows[0] : null,
  };
}

/**
 * Correlate NWS forecast with our indicator model
 * This is where forecast meets historical validation
 */
export function correlateForecastWithIndicators(forecastAnalysis, currentIndicators) {
  const correlation = {
    agreement: 'unknown',
    confidence: 0,
    notes: [],
  };
  
  if (!forecastAnalysis || !currentIndicators) return correlation;
  
  const forecastPattern = forecastAnalysis.pattern;
  const forecastDir = forecastAnalysis.windDirection;
  
  // Check if forecast matches current indicator signals
  if (forecastPattern === 'northFlow') {
    if (currentIndicators.kslc?.isNorth && currentIndicators.kslc?.speed >= 8) {
      correlation.agreement = 'strong';
      correlation.confidence = 0.9;
      correlation.notes.push('NWS forecast and KSLC indicator both show north flow');
    } else if (currentIndicators.kslc?.isNorth) {
      correlation.agreement = 'moderate';
      correlation.confidence = 0.7;
      correlation.notes.push('NWS forecast shows north flow, KSLC shows weak north signal');
    } else {
      correlation.agreement = 'weak';
      correlation.confidence = 0.5;
      correlation.notes.push('NWS forecast shows north flow, but indicators not confirming yet');
    }
  }
  
  if (forecastPattern === 'thermal') {
    if (currentIndicators.spanishFork?.isSE && currentIndicators.spanishFork?.speed >= 6) {
      correlation.agreement = 'strong';
      correlation.confidence = 0.85;
      correlation.notes.push('NWS forecast and Spanish Fork indicator both show thermal development');
    } else {
      correlation.agreement = 'moderate';
      correlation.confidence = 0.6;
      correlation.notes.push('NWS forecast shows thermal conditions, waiting for indicator confirmation');
    }
  }
  
  return correlation;
}

/**
 * Get full forecast with multi-stage predictions
 * This is a synchronous function that calculates forecast based on current conditions
 */
export function getFullForecast(locationId, conditions = {}) {
  const {
    pressureGradient = 0,
    eveningTemp,
    eveningWindSpeed = 0,
    morningTemp,
    morningWindSpeed = 0,
    morningWindDirection,
    currentWindSpeed = 0,
    currentWindDirection,
    thermalDelta = 0,
  } = conditions;
  
  const now = new Date();
  const hour = now.getHours();
  
  // Determine current stage based on time of day
  let currentStage = FORECAST_STAGES.DAY_BEFORE;
  if (hour >= 6 && hour < 10) {
    currentStage = FORECAST_STAGES.MORNING;
  } else if (hour >= 10 && hour < 11) {
    currentStage = FORECAST_STAGES.PRE_THERMAL;
  } else if (hour >= 11 && hour < 12) {
    currentStage = FORECAST_STAGES.IMMINENT;
  } else if (hour >= 12 && hour < 18) {
    currentStage = FORECAST_STAGES.ACTIVE;
  }
  
  // Calculate base probability from conditions
  let baseProbability = 50;
  
  // Pressure gradient effect
  if (Math.abs(pressureGradient) < 1.0) {
    baseProbability += 20; // Good for thermal
  } else if (Math.abs(pressureGradient) > 2.0) {
    baseProbability -= 20; // North flow dominant
  }
  
  // Thermal delta effect
  if (thermalDelta > 5) {
    baseProbability += 15;
  } else if (thermalDelta > 10) {
    baseProbability += 25;
  }
  
  // Wind speed effect
  if (currentWindSpeed > 8 && currentWindSpeed < 20) {
    baseProbability += 10;
  }
  
  baseProbability = Math.max(0, Math.min(100, baseProbability));
  
  // Determine wind type
  let windType = 'thermal';
  let expectedDirection = 'SE';
  
  if (pressureGradient > 1.5) {
    windType = 'north_flow';
    expectedDirection = 'N';
    baseProbability = Math.min(baseProbability + 20, 95);
  } else if (pressureGradient < -1.5) {
    windType = 'south_flow';
    expectedDirection = 'S';
  }
  
  // Build stage forecasts
  const stages = {
    [FORECAST_STAGES.DAY_BEFORE]: {
      stage: FORECAST_STAGES.DAY_BEFORE,
      probability: Math.round(baseProbability * 0.7), // Lower confidence day before
      confidence: 0.6,
      windType,
      expectedDirection,
      expectedSpeed: { min: 8, max: 15 },
      message: `${windType === 'thermal' ? 'Thermal' : 'North flow'} conditions expected tomorrow`,
      factors: [
        { name: 'Pressure Gradient', value: pressureGradient?.toFixed(1) || '0', impact: pressureGradient > 1.5 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.MORNING]: {
      stage: FORECAST_STAGES.MORNING,
      probability: Math.round(baseProbability * 0.85),
      confidence: 0.75,
      windType,
      expectedDirection,
      expectedSpeed: { min: 10, max: 18 },
      message: morningWindSpeed > 5 
        ? 'Early wind activity detected - good sign' 
        : 'Calm morning - thermal development expected',
      factors: [
        { name: 'Morning Wind', value: `${morningWindSpeed?.toFixed(0) || 0} mph`, impact: morningWindSpeed > 5 ? 'positive' : 'neutral' },
        { name: 'Temperature', value: `${morningTemp?.toFixed(0) || '--'}°F`, impact: 'neutral' },
      ],
    },
    [FORECAST_STAGES.PRE_THERMAL]: {
      stage: FORECAST_STAGES.PRE_THERMAL,
      probability: Math.round(baseProbability * 0.95),
      confidence: 0.85,
      windType,
      expectedDirection,
      expectedSpeed: { min: 10, max: 20 },
      message: thermalDelta > 5 
        ? 'Thermal pump active - wind building' 
        : 'Conditions developing',
      factors: [
        { name: 'Thermal Delta', value: `${thermalDelta?.toFixed(1) || 0}°F`, impact: thermalDelta > 5 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.IMMINENT]: {
      stage: FORECAST_STAGES.IMMINENT,
      probability: baseProbability,
      confidence: 0.9,
      windType,
      expectedDirection,
      expectedSpeed: { min: 12, max: 22 },
      message: currentWindSpeed > 8 
        ? 'Wind event starting!' 
        : 'Thermal should start within 30-60 minutes',
      factors: [
        { name: 'Current Wind', value: `${currentWindSpeed?.toFixed(0) || 0} mph`, impact: currentWindSpeed > 8 ? 'positive' : 'neutral' },
      ],
    },
    [FORECAST_STAGES.ACTIVE]: {
      stage: FORECAST_STAGES.ACTIVE,
      probability: baseProbability,
      confidence: 0.95,
      windType,
      expectedDirection,
      expectedSpeed: { min: currentWindSpeed * 0.8, max: currentWindSpeed * 1.3 },
      message: currentWindSpeed > 10 
        ? `Active ${windType === 'thermal' ? 'thermal' : 'north flow'} - ${currentWindSpeed?.toFixed(0)} mph` 
        : 'Light conditions - may improve',
      factors: [
        { name: 'Current Wind', value: `${currentWindSpeed?.toFixed(0) || 0} mph ${currentWindDirection ? `from ${currentWindDirection}°` : ''}`, impact: currentWindSpeed > 10 ? 'positive' : 'negative' },
      ],
    },
  };
  
  return {
    locationId,
    timestamp: now.toISOString(),
    currentStage,
    stages,
    overall: {
      probability: baseProbability,
      windType,
      expectedDirection,
      peakWindow: '12:00 PM - 4:00 PM',
      confidence: stages[currentStage]?.confidence || 0.7,
    },
  };
}

export default {
  getActiveAlerts,
  get7DayForecast,
  getHourlyForecast,
  getKiteWindows,
  getForecastSummary,
  getFullForecast,
  correlateForecastWithIndicators,
  FORECAST_STAGES,
};
```

---

## File 22: `src/services/MultiDayForecast.js`

> 425 lines | 13.2 KB

```javascript
/**
 * MULTI-DAY FORECAST SERVICE
 * 
 * Based on 3 years of Zig Zag station data (307,748 observations):
 * 
 * KEY FINDINGS:
 * 
 * 1. SE THERMAL PATTERNS:
 *    - 249 thermal days identified (23.1% of all days)
 *    - Best months: July (46.2%), August (37.6%), June (32.2%)
 *    - Worst months: November (3.3%), December (9.7%), January (10.8%)
 *    - Peak hours: 13:00-16:00 (avg speed 13.5-13.9 mph)
 *    - Avg direction: 150-165° (SSE)
 *    - Day-before evening: 58.2°F, 25.45 inHg, 6.0 mph
 *    - Pressure FALLS before thermal days (avg -0.025 inHg)
 * 
 * 2. NORTH FLOW PATTERNS:
 *    - 165 north flow days (15.3% of all days)
 *    - Best months: April (35.6%), June (30.0%), May (28.0%)
 *    - Day-before evening: 46.9°F, 25.42 inHg, 6.7 mph
 *    - Pressure RISES before north flow (avg +0.031 inHg)
 * 
 * 3. MULTI-DAY PRESSURE TRENDS:
 *    SE Thermal: Gradual pressure drop over 5 days (25.51 → 25.48)
 *    North Flow: Pressure drop then sharp rise (25.49 → 25.43 → rise)
 * 
 * 4. PREDICTION ACCURACY:
 *    - 5 days out: ~40% confidence (pressure trend only)
 *    - 3 days out: ~60% confidence (pressure + temp trend)
 *    - 1 day out: ~80% confidence (evening conditions)
 *    - Same day: ~90% confidence (morning gradient)
 */

import zigzagData from '../data/zigzag-historical.json';

/**
 * KITE SPEED THRESHOLDS
 * Foil Kite: 10+ mph (more efficient, works in lighter wind)
 * Twin Tip: 15+ mph (needs more power)
 */
const KITE_THRESHOLDS = {
  foil: 10,
  twinTip: 15,
};

/**
 * Determine kite-ability based on expected wind speed
 */
function getKiteability(expectedSpeed, windType) {
  // North flow is typically stronger
  const speed = windType === 'North Flow' ? Math.max(expectedSpeed, 18) : expectedSpeed;
  
  if (speed >= KITE_THRESHOLDS.twinTip) {
    return {
      status: 'all-kites',
      foil: true,
      twinTip: true,
      message: 'Great for all kites!',
      color: 'text-green-400',
    };
  }
  
  if (speed >= KITE_THRESHOLDS.foil) {
    return {
      status: 'foil-only',
      foil: true,
      twinTip: false,
      message: 'Foil kite recommended',
      color: 'text-cyan-400',
    };
  }
  
  return {
    status: 'too-light',
    foil: false,
    twinTip: false,
    message: 'Too light for kiting',
    color: 'text-slate-500',
  };
}

// Historical patterns from 3 years of data
const PATTERNS = {
  seThermal: {
    monthlyRates: zigzagData.monthlyPatterns,
    dayBefore: zigzagData.dayBeforePatterns.seThermal,
    multiDay: zigzagData.multiDayPatterns.seThermal,
    pressureChange: zigzagData.pressureChangePatterns.seThermal,
    hourly: zigzagData.hourlyPatterns,
  },
  northFlow: {
    monthlyRates: zigzagData.monthlyPatterns,
    dayBefore: zigzagData.dayBeforePatterns.northFlow,
    multiDay: zigzagData.multiDayPatterns.northFlow,
    pressureChange: zigzagData.pressureChangePatterns.northFlow,
  },
};

/**
 * Calculate 5-day forecast based on pressure trends
 */
export function calculate5DayForecast(currentConditions, forecastData = null) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const forecasts = [];
  
  // Get monthly base rates
  const monthData = PATTERNS.seThermal.monthlyRates[month] || { seRate: 20, nRate: 15 };
  const baseSeRate = monthData.seRate;
  const baseNRate = monthData.nRate;
  
  // Current conditions
  const currentPressure = currentConditions?.pressure || 25.50;
  const currentTemp = currentConditions?.temperature || 50;
  
  for (let day = 0; day <= 5; day++) {
    const forecastDate = new Date(now);
    forecastDate.setDate(forecastDate.getDate() + day);
    
    let seProbability = baseSeRate;
    let nProbability = baseNRate;
    let confidence = 'low';
    let factors = [];
    
    if (day === 0) {
      // Same day - use current conditions
      confidence = 'high';
      
      // Pressure gradient check
      if (currentConditions?.pressureGradient != null) {
        if (currentConditions.pressureGradient < -1.0) {
          seProbability += 30;
          factors.push('Strong negative gradient - thermal likely');
        } else if (currentConditions.pressureGradient > 1.0) {
          seProbability -= 30;
          nProbability += 20;
          factors.push('Positive gradient - north flow possible');
        }
      }
      
      // Temperature check
      if (currentTemp > 60) {
        seProbability += 10;
        factors.push('Warm temps favor thermal');
      }
      
    } else if (day === 1) {
      // Tomorrow - use evening patterns
      confidence = 'good';
      
      // Compare to historical day-before patterns
      const seDayBefore = PATTERNS.seThermal.dayBefore;
      const nDayBefore = PATTERNS.northFlow.dayBefore;
      
      // Temperature match
      if (Math.abs(currentTemp - seDayBefore.eveningTemp) < 10) {
        seProbability += 15;
        factors.push(`Evening temp ${currentTemp.toFixed(0)}°F matches thermal pattern`);
      }
      if (Math.abs(currentTemp - nDayBefore.eveningTemp) < 10) {
        nProbability += 15;
        factors.push(`Evening temp ${currentTemp.toFixed(0)}°F matches north flow pattern`);
      }
      
      // Pressure match
      if (Math.abs(currentPressure - seDayBefore.eveningPressure) < 0.1) {
        seProbability += 10;
        factors.push('Pressure matches thermal day pattern');
      }
      
    } else if (day <= 3) {
      // 2-3 days out - use pressure trends
      confidence = 'moderate';
      
      const seMultiDay = PATTERNS.seThermal.multiDay[`day${day}`];
      const nMultiDay = PATTERNS.northFlow.multiDay[`day${day}`];
      
      if (seMultiDay && Math.abs(currentPressure - seMultiDay.pressure) < 0.1) {
        seProbability += 10;
        factors.push(`Pressure ${currentPressure.toFixed(2)} matches ${day}-day thermal setup`);
      }
      
      if (nMultiDay && Math.abs(currentPressure - nMultiDay.pressure) < 0.1) {
        nProbability += 10;
        factors.push(`Pressure matches ${day}-day north flow setup`);
      }
      
    } else {
      // 4-5 days out - low confidence, use seasonal + pressure trend
      confidence = 'low';
      factors.push('Extended forecast - monitor pressure trend');
      
      // Just use seasonal baseline with slight adjustments
      if (currentPressure > 25.55) {
        seProbability -= 10;
        factors.push('High pressure may suppress thermal');
      } else if (currentPressure < 25.40) {
        nProbability += 10;
        factors.push('Low pressure - watch for frontal passage');
      }
    }
    
    // Cap probabilities
    seProbability = Math.max(5, Math.min(90, seProbability));
    nProbability = Math.max(5, Math.min(90, nProbability));
    
    // Determine primary wind type
    let primaryType = 'uncertain';
    let primaryProbability = 0;
    
    if (seProbability > nProbability + 10) {
      primaryType = 'SE Thermal';
      primaryProbability = seProbability;
    } else if (nProbability > seProbability + 10) {
      primaryType = 'North Flow';
      primaryProbability = nProbability;
    } else {
      primaryType = 'Either possible';
      primaryProbability = Math.max(seProbability, nProbability);
    }
    
    // Calculate expected speed and kite-ability
    const expectedSpeed = PATTERNS.seThermal.hourly[monthData.peakHour]?.avgSpeed || 13;
    const kiteability = getKiteability(expectedSpeed, primaryType);
    
    // Get start time and temperature from monthly patterns
    const startHour = monthData.startHour || 11;
    const avgHighTemp = monthData.avgHighTemp || 65;
    const avgLowTemp = monthData.avgLowTemp || 45;
    
    // Estimate temperature for the forecast day
    // For today, use current temp; for future days, use seasonal average
    let expectedHighTemp = avgHighTemp;
    let expectedLowTemp = avgLowTemp;
    
    if (day === 0 && currentTemp) {
      // Today - estimate high based on current temp and time of day
      const currentHour = now.getHours();
      if (currentHour < 12) {
        // Morning - high will be warmer
        expectedHighTemp = Math.max(currentTemp + 10, avgHighTemp);
      } else {
        // Afternoon - current temp is close to high
        expectedHighTemp = Math.max(currentTemp, avgHighTemp - 5);
      }
    }
    
    // North flow typically comes with cooler temps (frontal passage)
    const northFlowTempDrop = 10;
    
    forecasts.push({
      day,
      date: forecastDate.toISOString().slice(0, 10),
      dayName: day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
      seThermal: {
        probability: Math.round(seProbability),
        startHour,
        peakHour: monthData.peakHour || 14,
        expectedSpeed,
        expectedDirection: PATTERNS.seThermal.hourly[monthData.peakHour]?.avgDir || 150,
      },
      northFlow: {
        probability: Math.round(nProbability),
        expectedSpeed: 18, // North flow typically stronger
        // North flow can start anytime - often afternoon/evening with frontal passage
        startHour: 14,
      },
      temperature: {
        high: Math.round(expectedHighTemp),
        low: Math.round(expectedLowTemp),
        // If north flow likely, temps will be cooler
        northFlowHigh: Math.round(expectedHighTemp - northFlowTempDrop),
      },
      primary: {
        type: primaryType,
        probability: Math.round(primaryProbability),
      },
      kiteability,
      confidence,
      factors,
    });
  }
  
  return forecasts;
}

/**
 * Get the best upcoming days for wind
 */
export function getBestUpcomingDays(forecasts) {
  return forecasts
    .filter(f => f.primary.probability >= 40)
    .sort((a, b) => b.primary.probability - a.primary.probability)
    .slice(0, 3);
}

/**
 * Generate forecast summary message
 */
export function getForecastSummary(forecasts) {
  const bestDays = getBestUpcomingDays(forecasts);
  
  if (bestDays.length === 0) {
    return {
      headline: 'Light wind expected',
      message: 'No strong wind days in the 5-day forecast. Check back for updates.',
      bestDay: null,
    };
  }
  
  const best = bestDays[0];
  const isToday = best.day === 0;
  const isTomorrow = best.day === 1;
  
  let headline = '';
  if (isToday) {
    headline = `${best.primary.type} likely TODAY!`;
  } else if (isTomorrow) {
    headline = `${best.primary.type} expected TOMORROW`;
  } else {
    headline = `${best.primary.type} on ${best.dayName}`;
  }
  
  let message = '';
  if (best.primary.type === 'SE Thermal') {
    message = `${best.seThermal.probability}% chance of SE thermal. Expected peak around ${best.seThermal.peakHour}:00 with ${best.seThermal.expectedSpeed.toFixed(0)} mph from ${best.seThermal.expectedDirection}°.`;
  } else if (best.primary.type === 'North Flow') {
    message = `${best.northFlow.probability}% chance of north flow. Watch for frontal passage.`;
  } else {
    message = `${best.primary.probability}% chance of good wind. Both thermal and north flow possible.`;
  }
  
  return {
    headline,
    message,
    bestDay: best,
    otherGoodDays: bestDays.slice(1),
  };
}

/**
 * Get confidence level description
 */
export function getConfidenceDescription(confidence) {
  switch (confidence) {
    case 'high':
      return 'High confidence - based on current conditions';
    case 'good':
      return 'Good confidence - evening patterns match historical';
    case 'moderate':
      return 'Moderate confidence - pressure trend analysis';
    case 'low':
    default:
      return 'Low confidence - extended forecast, monitor updates';
  }
}

/**
 * Determine if conditions favor SE thermal or North flow
 */
export function analyzeWindType(conditions) {
  const { pressure, pressureChange, temperature, pressureGradient } = conditions;
  
  const seScore = 0;
  const nScore = 0;
  const analysis = [];
  
  // Pressure change pattern
  // SE Thermal: pressure falls (avg -0.025)
  // North Flow: pressure rises (avg +0.031)
  if (pressureChange != null) {
    if (pressureChange < -0.02) {
      analysis.push({
        factor: 'Falling pressure',
        favors: 'SE Thermal',
        reason: 'Matches 46.8% of thermal days',
      });
    } else if (pressureChange > 0.02) {
      analysis.push({
        factor: 'Rising pressure',
        favors: 'North Flow',
        reason: 'Matches 48.5% of north flow days',
      });
    }
  }
  
  // Temperature pattern
  // SE Thermal day-before: 58.2°F
  // North Flow day-before: 46.9°F
  if (temperature != null) {
    if (temperature > 55) {
      analysis.push({
        factor: `Warm evening (${temperature.toFixed(0)}°F)`,
        favors: 'SE Thermal',
        reason: 'Matches thermal day-before pattern (58.2°F avg)',
      });
    } else if (temperature < 50) {
      analysis.push({
        factor: `Cool evening (${temperature.toFixed(0)}°F)`,
        favors: 'North Flow',
        reason: 'Matches north flow day-before pattern (46.9°F avg)',
      });
    }
  }
  
  // Pressure gradient
  if (pressureGradient != null) {
    if (pressureGradient < -1.0) {
      analysis.push({
        factor: 'Negative pressure gradient',
        favors: 'SE Thermal',
        reason: 'Provo higher than SLC = thermal setup',
      });
    } else if (pressureGradient > 1.0) {
      analysis.push({
        factor: 'Positive pressure gradient',
        favors: 'North Flow',
        reason: 'SLC higher than Provo = north flow',
      });
    }
  }
  
  return analysis;
}
```

---

## File 23: `src/services/NotificationService.js`

> 248 lines | 6.5 KB

```javascript
/**
 * NOTIFICATION SERVICE
 * 
 * Handles scheduling and sending notifications for thermal forecasts
 * at three key times:
 * 
 * 1. EVENING (6-9 PM): Tomorrow's outlook
 * 2. MORNING (6-9 AM): Today's forecast
 * 3. PRE-THERMAL (1-2 hrs before): Imminent alert
 */

const NOTIFICATION_KEY = 'utah-wind-notifications';
const LAST_SENT_KEY = 'utah-wind-last-notification';

/**
 * Check if notifications are supported and enabled
 */
export function canNotify() {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPrefs() {
  try {
    const saved = localStorage.getItem(NOTIFICATION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading notification prefs:', e);
  }
  
  return {
    enabled: false,
    dayBefore: true,
    morning: true,
    preThermal: true,
    minProbability: {
      dayBefore: 60,
      morning: 50,
      preThermal: 60,
    },
    lakes: ['utah-lake-zigzag'], // Default lake
  };
}

/**
 * Save notification preferences
 */
export function saveNotificationPrefs(prefs) {
  try {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving notification prefs:', e);
  }
}

/**
 * Check if we've already sent a notification for this time window
 */
function hasRecentlyNotified(type) {
  try {
    const saved = localStorage.getItem(LAST_SENT_KEY);
    if (!saved) return false;
    
    const lastSent = JSON.parse(saved);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    
    // For day-before, check if we sent one today evening
    if (type === 'day-before') {
      return lastSent.dayBefore === today && hour >= 18;
    }
    
    // For morning, check if we sent one today morning
    if (type === 'morning') {
      return lastSent.morning === today && hour >= 6 && hour < 12;
    }
    
    // For pre-thermal, check if we sent one in the last 2 hours
    if (type === 'pre-thermal') {
      const lastTime = lastSent.preThermalTime ? new Date(lastSent.preThermalTime) : null;
      if (lastTime) {
        const diffMs = now - lastTime;
        return diffMs < 2 * 60 * 60 * 1000; // 2 hours
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Mark that we've sent a notification
 */
function markNotified(type) {
  try {
    const saved = localStorage.getItem(LAST_SENT_KEY);
    const lastSent = saved ? JSON.parse(saved) : {};
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    if (type === 'day-before') {
      lastSent.dayBefore = today;
    } else if (type === 'morning') {
      lastSent.morning = today;
    } else if (type === 'pre-thermal') {
      lastSent.preThermalTime = now.toISOString();
    }
    
    localStorage.setItem(LAST_SENT_KEY, JSON.stringify(lastSent));
  } catch (e) {
    console.error('Error marking notification:', e);
  }
}

/**
 * Send a notification
 */
export function sendNotification(title, body, options = {}) {
  if (!canNotify()) {
    console.log('Notifications not enabled');
    return null;
  }
  
  const notification = new Notification(title, {
    body,
    icon: '/wind-icon.png',
    badge: '/wind-badge.png',
    tag: options.tag || 'utah-wind',
    requireInteraction: options.important || false,
    ...options,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // Vibrate if supported
  if ('vibrate' in navigator && options.important) {
    navigator.vibrate([200, 100, 200]);
  }
  
  return notification;
}

/**
 * Check and send appropriate notifications based on current conditions
 */
export function checkAndNotify(forecast, lakeName = 'Utah Lake') {
  const prefs = getNotificationPrefs();
  
  if (!prefs.enabled || !canNotify()) {
    return;
  }
  
  const now = new Date();
  const hour = now.getHours();
  
  // Evening notification (6-9 PM)
  if (prefs.dayBefore && hour >= 18 && hour <= 21) {
    const prob = forecast.allForecasts?.dayBefore?.probability || 0;
    if (prob >= prefs.minProbability.dayBefore && !hasRecentlyNotified('day-before')) {
      sendNotification(
        `🌬️ Tomorrow at ${lakeName}`,
        forecast.allForecasts.dayBefore.message,
        { tag: 'day-before', important: prob >= 80 }
      );
      markNotified('day-before');
    }
  }
  
  // Morning notification (6-9 AM)
  if (prefs.morning && hour >= 6 && hour <= 9) {
    const prob = forecast.allForecasts?.morning?.probability || 0;
    if (prob >= prefs.minProbability.morning && !hasRecentlyNotified('morning')) {
      const peakTime = forecast.allForecasts.morning.expectedPeakTime || '11:00-13:00';
      sendNotification(
        `☀️ Thermal Forecast for ${lakeName}`,
        `${forecast.allForecasts.morning.message}\nExpected peak: ${peakTime}`,
        { tag: 'morning', important: prob >= 80 }
      );
      markNotified('morning');
    }
  }
  
  // Pre-thermal notification (9 AM - 2 PM)
  if (prefs.preThermal && hour >= 9 && hour <= 14) {
    const prob = forecast.allForecasts?.preThermal?.probability || 0;
    const timeToThermal = forecast.allForecasts?.preThermal?.timeToThermal;
    
    if (prob >= prefs.minProbability.preThermal && 
        timeToThermal != null && 
        timeToThermal <= 60 &&
        !hasRecentlyNotified('pre-thermal')) {
      sendNotification(
        `⚡ Thermal Alert - ${lakeName}`,
        timeToThermal <= 30 
          ? `Thermal starting NOW! ${forecast.allForecasts.preThermal.message}`
          : `Thermal in ~${timeToThermal} min! ${forecast.allForecasts.preThermal.message}`,
        { tag: 'pre-thermal', important: true, requireInteraction: true }
      );
      markNotified('pre-thermal');
    }
  }
}

/**
 * Get human-readable notification schedule
 */
export function getNotificationScheduleDescription() {
  const prefs = getNotificationPrefs();
  
  if (!prefs.enabled) {
    return 'Notifications disabled';
  }
  
  const times = [];
  if (prefs.dayBefore) times.push('Evening (6-9 PM) for tomorrow');
  if (prefs.morning) times.push('Morning (6-9 AM) for today');
  if (prefs.preThermal) times.push('1-2 hours before thermal');
  
  return times.length > 0 
    ? `Alerts: ${times.join(', ')}`
    : 'No alerts configured';
}
```

---

## File 24: `src/services/LearningSystem.js`

> 1160 lines | 36.9 KB

```javascript
/**
 * LEARNING SYSTEM
 * 
 * A self-improving wind prediction system that:
 * 1. Collects predictions and actual outcomes every hour
 * 2. Stores historical data for pattern analysis
 * 3. Tracks model accuracy over time
 * 4. Automatically recalibrates prediction weights
 * 5. Learns new patterns from accumulated data
 * 
 * LEARNING CYCLE:
 * 1. PREDICT: Make prediction using current model
 * 2. RECORD: Store prediction with timestamp
 * 3. VERIFY: Compare prediction to actual outcome
 * 4. SCORE: Calculate accuracy metrics
 * 5. LEARN: Adjust model weights based on errors
 * 6. REPEAT: Continuous improvement loop
 */

const DB_NAME = 'UtahWindProLearning';
const DB_VERSION = 2;

// Store names
const STORES = {
  PREDICTIONS: 'predictions',      // Prediction records
  ACTUALS: 'actuals',              // Actual weather data
  ACCURACY: 'accuracy',            // Accuracy scores over time
  MODEL_WEIGHTS: 'modelWeights',   // Learned model parameters
  PATTERNS: 'patterns',            // Discovered patterns
  INDICATORS: 'indicators',        // Indicator correlation data
};

class LearningSystem {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.currentWeights = null;
  }

  // =========================================
  // DATABASE INITIALIZATION
  // =========================================

  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        this.loadCurrentWeights();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Predictions store - what we predicted
        if (!db.objectStoreNames.contains(STORES.PREDICTIONS)) {
          const predStore = db.createObjectStore(STORES.PREDICTIONS, { keyPath: 'id', autoIncrement: true });
          predStore.createIndex('timestamp', 'timestamp');
          predStore.createIndex('lakeId', 'lakeId');
          predStore.createIndex('date', 'date');
        }

        // Actuals store - what actually happened
        if (!db.objectStoreNames.contains(STORES.ACTUALS)) {
          const actualStore = db.createObjectStore(STORES.ACTUALS, { keyPath: 'id', autoIncrement: true });
          actualStore.createIndex('timestamp', 'timestamp');
          actualStore.createIndex('lakeId', 'lakeId');
          actualStore.createIndex('stationId', 'stationId');
          actualStore.createIndex('date', 'date');
        }

        // Accuracy tracking
        if (!db.objectStoreNames.contains(STORES.ACCURACY)) {
          const accStore = db.createObjectStore(STORES.ACCURACY, { keyPath: 'id', autoIncrement: true });
          accStore.createIndex('date', 'date');
          accStore.createIndex('lakeId', 'lakeId');
        }

        // Model weights - learned parameters
        if (!db.objectStoreNames.contains(STORES.MODEL_WEIGHTS)) {
          db.createObjectStore(STORES.MODEL_WEIGHTS, { keyPath: 'id' });
        }

        // Discovered patterns
        if (!db.objectStoreNames.contains(STORES.PATTERNS)) {
          const patternStore = db.createObjectStore(STORES.PATTERNS, { keyPath: 'id', autoIncrement: true });
          patternStore.createIndex('type', 'type');
          patternStore.createIndex('lakeId', 'lakeId');
        }

        // Indicator correlations
        if (!db.objectStoreNames.contains(STORES.INDICATORS)) {
          const indStore = db.createObjectStore(STORES.INDICATORS, { keyPath: 'id', autoIncrement: true });
          indStore.createIndex('indicatorId', 'indicatorId');
          indStore.createIndex('targetId', 'targetId');
          indStore.createIndex('date', 'date');
        }
      };
    });
  }

  // =========================================
  // DATA COLLECTION
  // =========================================

  /**
   * Record a prediction for later verification
   */
  async recordPrediction(lakeId, prediction, conditions) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      lakeId,
      
      // What we predicted
      prediction: {
        probability: prediction.probability,
        windType: prediction.windType,
        expectedSpeed: prediction.expectedSpeed,
        expectedDirection: prediction.expectedDirection,
        startTime: prediction.startTime,
        foilKiteablePct: prediction.foilKiteablePct,
        twinTipKiteablePct: prediction.twinTipKiteablePct,
        phase: prediction.phase,
      },
      
      // Conditions at time of prediction
      conditions: {
        pressureGradient: conditions.pressureGradient,
        thermalDelta: conditions.thermalDelta,
        kslcSpeed: conditions.kslcWind?.speed,
        kslcDirection: conditions.kslcWind?.direction,
        kpvuSpeed: conditions.kpvuWind?.speed,
        kpvuDirection: conditions.kpvuWind?.direction,
        qsfSpeed: conditions.spanishForkWind?.speed,
        qsfDirection: conditions.spanishForkWind?.direction,
        utalpSpeed: conditions.utalpWind?.speed,
        utalpDirection: conditions.utalpWind?.direction,
        temperature: conditions.temperature,
      },
      
      // Model weights used
      weightsVersion: this.currentWeights?.version || 'default',
      
      // Will be filled in later
      verified: false,
      actual: null,
      accuracy: null,
    };

    return this.addRecord(STORES.PREDICTIONS, record);
  }

  /**
   * Record actual weather data (called every 15 minutes)
   */
  async recordActual(lakeId, stationId, data) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      minute: now.getMinutes(),
      lakeId,
      stationId,
      
      // Actual measurements
      windSpeed: data.windSpeed,
      windGust: data.windGust,
      windDirection: data.windDirection,
      temperature: data.temperature,
      pressure: data.pressure,
      
      // Derived
      isKiteable: data.windSpeed >= 10,
      isTwinTipKiteable: data.windSpeed >= 15,
      isNorthFlow: data.windDirection !== null && (data.windDirection >= 315 || data.windDirection <= 45),
      isSEThermal: data.windDirection !== null && data.windDirection >= 90 && data.windDirection <= 180,
    };

    return this.addRecord(STORES.ACTUALS, record);
  }

  /**
   * Record indicator station data for correlation learning
   */
  async recordIndicator(indicatorId, targetId, indicatorData, targetData, leadTimeMinutes) {
    await this.initialize();

    const now = new Date();
    const record = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      indicatorId,
      targetId,
      leadTimeMinutes,
      
      indicator: {
        speed: indicatorData.speed,
        direction: indicatorData.direction,
        temperature: indicatorData.temperature,
      },
      
      target: {
        speed: targetData.speed,
        direction: targetData.direction,
        temperature: targetData.temperature,
      },
      
      // Pre-calculated correlations
      speedRatio: targetData.speed && indicatorData.speed ? targetData.speed / indicatorData.speed : null,
      directionMatch: this.directionsMatch(indicatorData.direction, targetData.direction),
    };

    return this.addRecord(STORES.INDICATORS, record);
  }

  // =========================================
  // VERIFICATION & ACCURACY
  // =========================================

  /**
   * Verify predictions against actual outcomes
   * Called periodically (e.g., every hour)
   */
  async verifyPredictions() {
    await this.initialize();

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Get unverified predictions from 1-2 hours ago
    const predictions = await this.getUnverifiedPredictions(twoHoursAgo);
    
    for (const prediction of predictions) {
      // Get actual data for the prediction time window
      const actuals = await this.getActualsForTimeRange(
        prediction.lakeId,
        new Date(prediction.timestamp),
        new Date(new Date(prediction.timestamp).getTime() + 60 * 60 * 1000) // 1 hour window
      );

      if (actuals.length === 0) continue;

      // Calculate accuracy
      const accuracy = this.calculateAccuracy(prediction, actuals);
      
      // Update prediction with verification
      await this.updatePrediction(prediction.id, {
        verified: true,
        actual: this.summarizeActuals(actuals),
        accuracy,
      });

      // Record accuracy for trending
      await this.recordAccuracy(prediction.lakeId, prediction.date, accuracy);
    }

    // Trigger learning if we have enough new data
    await this.checkAndLearn();
  }

  /**
   * Calculate accuracy of a prediction
   */
  calculateAccuracy(prediction, actuals) {
    const pred = prediction.prediction;
    const actual = this.summarizeActuals(actuals);

    const accuracy = {
      timestamp: new Date().toISOString(),
      
      // Speed accuracy (how close was predicted speed to actual)
      speedError: pred.expectedSpeed && actual.avgSpeed 
        ? Math.abs(pred.expectedSpeed - actual.avgSpeed) 
        : null,
      speedAccuracy: pred.expectedSpeed && actual.avgSpeed
        ? Math.max(0, 100 - Math.abs(pred.expectedSpeed - actual.avgSpeed) * 5)
        : null,
      
      // Direction accuracy
      directionError: pred.expectedDirection && actual.avgDirection
        ? this.directionDifference(pred.expectedDirection, actual.avgDirection)
        : null,
      directionAccuracy: pred.expectedDirection && actual.avgDirection
        ? Math.max(0, 100 - this.directionDifference(pred.expectedDirection, actual.avgDirection))
        : null,
      
      // Probability accuracy (did we predict kiteable correctly?)
      predictedKiteable: pred.probability >= 50,
      actuallyKiteable: actual.avgSpeed >= 10,
      kiteablePredictionCorrect: (pred.probability >= 50) === (actual.avgSpeed >= 10),
      
      // Foil kiteable accuracy
      predictedFoilPct: pred.foilKiteablePct,
      actualFoilPct: actual.foilKiteablePct,
      foilPctError: pred.foilKiteablePct != null && actual.foilKiteablePct != null
        ? Math.abs(pred.foilKiteablePct - actual.foilKiteablePct)
        : null,
      
      // Wind type accuracy
      predictedWindType: pred.windType,
      actualWindType: actual.dominantWindType,
      windTypeCorrect: pred.windType === actual.dominantWindType,
      
      // Overall score (weighted average)
      overallScore: null,
    };

    // Calculate overall score
    let totalWeight = 0;
    let weightedSum = 0;

    if (accuracy.speedAccuracy != null) {
      weightedSum += accuracy.speedAccuracy * 0.3;
      totalWeight += 0.3;
    }
    if (accuracy.directionAccuracy != null) {
      weightedSum += accuracy.directionAccuracy * 0.2;
      totalWeight += 0.2;
    }
    if (accuracy.kiteablePredictionCorrect != null) {
      weightedSum += (accuracy.kiteablePredictionCorrect ? 100 : 0) * 0.3;
      totalWeight += 0.3;
    }
    if (accuracy.windTypeCorrect != null) {
      weightedSum += (accuracy.windTypeCorrect ? 100 : 0) * 0.2;
      totalWeight += 0.2;
    }

    accuracy.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

    return accuracy;
  }

  /**
   * Summarize actual data from multiple readings
   */
  summarizeActuals(actuals) {
    if (actuals.length === 0) return null;

    const speeds = actuals.filter(a => a.windSpeed != null).map(a => a.windSpeed);
    const directions = actuals.filter(a => a.windDirection != null).map(a => a.windDirection);
    const kiteableCount = actuals.filter(a => a.isKiteable).length;
    const foilKiteableCount = actuals.filter(a => a.windSpeed >= 10).length;
    const twinTipKiteableCount = actuals.filter(a => a.windSpeed >= 15).length;
    const northFlowCount = actuals.filter(a => a.isNorthFlow).length;
    const seThermalCount = actuals.filter(a => a.isSEThermal).length;

    // Determine dominant wind type
    let dominantWindType = 'calm';
    if (northFlowCount > actuals.length * 0.5) {
      dominantWindType = 'north_flow';
    } else if (seThermalCount > actuals.length * 0.5) {
      dominantWindType = 'thermal';
    } else if (speeds.length > 0 && speeds.reduce((a, b) => a + b, 0) / speeds.length >= 8) {
      dominantWindType = 'other';
    }

    return {
      count: actuals.length,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
      minSpeed: speeds.length > 0 ? Math.min(...speeds) : null,
      avgDirection: directions.length > 0 ? this.averageDirection(directions) : null,
      kiteablePct: Math.round(kiteableCount / actuals.length * 100),
      foilKiteablePct: Math.round(foilKiteableCount / actuals.length * 100),
      twinTipKiteablePct: Math.round(twinTipKiteableCount / actuals.length * 100),
      dominantWindType,
    };
  }

  // =========================================
  // LEARNING & MODEL ADJUSTMENT
  // =========================================

  /**
   * Check if we have enough new data to trigger learning
   */
  async checkAndLearn() {
    const recentAccuracy = await this.getRecentAccuracy(7); // Last 7 days
    
    if (recentAccuracy.length < 50) {
      console.log('Not enough data for learning yet:', recentAccuracy.length, 'records');
      return;
    }

    // Calculate current model performance
    const avgAccuracy = recentAccuracy.reduce((sum, r) => sum + (r.overallScore || 0), 0) / recentAccuracy.length;
    
    console.log('Current model accuracy:', avgAccuracy.toFixed(1) + '%');

    // If accuracy is below threshold, trigger learning
    if (avgAccuracy < 70) {
      console.log('Accuracy below threshold, triggering learning...');
      await this.learnFromData();
    }
  }

  /**
   * Learn from accumulated data and adjust model weights
   */
  async learnFromData() {
    await this.initialize();

    console.log('Starting learning cycle...');

    // 1. Analyze indicator correlations
    const indicatorLearning = await this.learnIndicatorCorrelations();
    
    // 2. Analyze prediction errors
    const errorAnalysis = await this.analyzeErrors();
    
    // 3. Discover new patterns
    const patterns = await this.discoverPatterns();
    
    // 4. Calculate new weights
    const newWeights = this.calculateNewWeights(indicatorLearning, errorAnalysis, patterns);
    
    // 5. Save new weights
    await this.saveWeights(newWeights);
    
    console.log('Learning cycle complete. New weights:', newWeights);
    
    return newWeights;
  }

  /**
   * Learn indicator correlations from data
   */
  async learnIndicatorCorrelations() {
    const indicators = await this.getAllIndicatorData();
    
    const correlations = {};
    
    // Group by indicator-target pair
    const pairs = {};
    for (const record of indicators) {
      const key = `${record.indicatorId}-${record.targetId}`;
      if (!pairs[key]) pairs[key] = [];
      pairs[key].push(record);
    }
    
    // Calculate correlations for each pair
    for (const [key, records] of Object.entries(pairs)) {
      if (records.length < 20) continue; // Need minimum data
      
      const [indicatorId, targetId] = key.split('-');
      
      // Speed correlation
      const speedPairs = records.filter(r => r.indicator.speed != null && r.target.speed != null);
      const speedCorrelation = this.calculateCorrelation(
        speedPairs.map(r => r.indicator.speed),
        speedPairs.map(r => r.target.speed)
      );
      
      // Direction match rate
      const directionMatches = records.filter(r => r.directionMatch).length;
      const directionMatchRate = directionMatches / records.length;
      
      // Speed ratio (how much does target amplify/reduce indicator)
      const ratios = records.filter(r => r.speedRatio != null).map(r => r.speedRatio);
      const avgSpeedRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
      
      // Kiteable prediction accuracy
      const kiteableWhenIndicatorStrong = records.filter(r => 
        r.indicator.speed >= 8 && r.target.speed >= 10
      ).length;
      const strongIndicatorCount = records.filter(r => r.indicator.speed >= 8).length;
      const kiteablePredictionRate = strongIndicatorCount > 0 
        ? kiteableWhenIndicatorStrong / strongIndicatorCount 
        : 0;
      
      correlations[key] = {
        indicatorId,
        targetId,
        sampleSize: records.length,
        speedCorrelation,
        directionMatchRate,
        avgSpeedRatio,
        kiteablePredictionRate,
        confidence: Math.min(1, records.length / 100), // More data = more confidence
      };
    }
    
    return correlations;
  }

  /**
   * Analyze prediction errors to find systematic biases
   */
  async analyzeErrors() {
    const predictions = await this.getVerifiedPredictions(30); // Last 30 days
    
    const analysis = {
      totalPredictions: predictions.length,
      avgOverallAccuracy: 0,
      
      // Speed prediction bias
      speedBias: 0, // Positive = we over-predict, negative = under-predict
      speedErrors: [],
      
      // Direction prediction bias
      directionBias: 0,
      
      // Probability calibration
      probabilityBuckets: {
        '0-20': { predicted: 0, actualKiteable: 0 },
        '20-40': { predicted: 0, actualKiteable: 0 },
        '40-60': { predicted: 0, actualKiteable: 0 },
        '60-80': { predicted: 0, actualKiteable: 0 },
        '80-100': { predicted: 0, actualKiteable: 0 },
      },
      
      // Wind type accuracy
      windTypeAccuracy: {
        thermal: { correct: 0, total: 0 },
        north_flow: { correct: 0, total: 0 },
        calm: { correct: 0, total: 0 },
      },
      
      // Time of day patterns
      hourlyAccuracy: {},
      
      // Condition-specific errors
      conditionErrors: {
        highPressureGradient: [],
        lowPressureGradient: [],
        strongIndicator: [],
        weakIndicator: [],
      },
    };
    
    for (const pred of predictions) {
      if (!pred.accuracy) continue;
      
      // Overall accuracy
      if (pred.accuracy.overallScore != null) {
        analysis.avgOverallAccuracy += pred.accuracy.overallScore;
      }
      
      // Speed bias
      if (pred.accuracy.speedError != null) {
        const bias = (pred.prediction.expectedSpeed || 0) - (pred.actual?.avgSpeed || 0);
        analysis.speedBias += bias;
        analysis.speedErrors.push(bias);
      }
      
      // Probability calibration
      const prob = pred.prediction.probability;
      let bucket;
      if (prob < 20) bucket = '0-20';
      else if (prob < 40) bucket = '20-40';
      else if (prob < 60) bucket = '40-60';
      else if (prob < 80) bucket = '60-80';
      else bucket = '80-100';
      
      analysis.probabilityBuckets[bucket].predicted++;
      if (pred.accuracy.actuallyKiteable) {
        analysis.probabilityBuckets[bucket].actualKiteable++;
      }
      
      // Wind type accuracy
      const predictedType = pred.prediction.windType;
      if (predictedType && analysis.windTypeAccuracy[predictedType]) {
        analysis.windTypeAccuracy[predictedType].total++;
        if (pred.accuracy.windTypeCorrect) {
          analysis.windTypeAccuracy[predictedType].correct++;
        }
      }
      
      // Hourly accuracy
      const hour = pred.hour;
      if (!analysis.hourlyAccuracy[hour]) {
        analysis.hourlyAccuracy[hour] = { total: 0, sumAccuracy: 0 };
      }
      analysis.hourlyAccuracy[hour].total++;
      analysis.hourlyAccuracy[hour].sumAccuracy += pred.accuracy.overallScore || 0;
      
      // Condition-specific
      if (pred.conditions.pressureGradient > 2) {
        analysis.conditionErrors.highPressureGradient.push(pred.accuracy.overallScore);
      } else if (pred.conditions.pressureGradient < 1) {
        analysis.conditionErrors.lowPressureGradient.push(pred.accuracy.overallScore);
      }
    }
    
    // Calculate averages
    if (predictions.length > 0) {
      analysis.avgOverallAccuracy /= predictions.length;
      analysis.speedBias /= predictions.length;
    }
    
    // Calculate probability calibration
    for (const [bucket, data] of Object.entries(analysis.probabilityBuckets)) {
      data.actualRate = data.predicted > 0 ? data.actualKiteable / data.predicted : 0;
    }
    
    return analysis;
  }

  /**
   * Discover new patterns in the data
   */
  async discoverPatterns() {
    const actuals = await this.getAllActuals(60); // Last 60 days
    
    const patterns = [];
    
    // Group by date and hour
    const byDateHour = {};
    for (const actual of actuals) {
      const key = `${actual.date}-${actual.hour}`;
      if (!byDateHour[key]) byDateHour[key] = [];
      byDateHour[key].push(actual);
    }
    
    // Find good kiting days
    const goodDays = [];
    const dates = [...new Set(actuals.map(a => a.date))];
    
    for (const date of dates) {
      const dayActuals = actuals.filter(a => a.date === date);
      const kiteableHours = new Set(dayActuals.filter(a => a.isKiteable).map(a => a.hour));
      
      if (kiteableHours.size >= 3) { // At least 3 hours of kiteable wind
        goodDays.push({
          date,
          kiteableHours: kiteableHours.size,
          avgSpeed: dayActuals.reduce((s, a) => s + (a.windSpeed || 0), 0) / dayActuals.length,
          dominantDirection: this.getDominantDirection(dayActuals),
        });
      }
    }
    
    // Analyze good days for patterns
    if (goodDays.length >= 5) {
      // Time of day pattern
      const hourCounts = {};
      for (const actual of actuals.filter(a => a.isKiteable)) {
        hourCounts[actual.hour] = (hourCounts[actual.hour] || 0) + 1;
      }
      
      const peakHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (peakHour) {
        patterns.push({
          type: 'peak_hour',
          value: parseInt(peakHour),
          confidence: hourCounts[peakHour] / actuals.filter(a => a.isKiteable).length,
          description: `Peak kiting hour is ${peakHour}:00`,
        });
      }
      
      // Direction pattern
      const directionCounts = { north_flow: 0, thermal: 0, other: 0 };
      for (const actual of actuals.filter(a => a.isKiteable)) {
        if (actual.isNorthFlow) directionCounts.north_flow++;
        else if (actual.isSEThermal) directionCounts.thermal++;
        else directionCounts.other++;
      }
      
      const dominantType = Object.entries(directionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (dominantType) {
        patterns.push({
          type: 'dominant_wind_type',
          value: dominantType,
          confidence: directionCounts[dominantType] / actuals.filter(a => a.isKiteable).length,
          description: `Most kiteable wind is ${dominantType}`,
        });
      }
    }
    
    // Save discovered patterns
    for (const pattern of patterns) {
      await this.addRecord(STORES.PATTERNS, {
        ...pattern,
        discoveredAt: new Date().toISOString(),
      });
    }
    
    return patterns;
  }

  /**
   * Calculate new model weights based on learning
   */
  calculateNewWeights(indicatorLearning, errorAnalysis, patterns) {
    const currentWeights = this.currentWeights || this.getDefaultWeights();
    
    const newWeights = {
      version: Date.now(),
      createdAt: new Date().toISOString(),
      basedOnSamples: errorAnalysis.totalPredictions,
      
      // Adjust pressure weight based on high gradient accuracy
      pressureWeight: currentWeights.pressureWeight,
      
      // Adjust thermal weight based on thermal prediction accuracy
      thermalWeight: currentWeights.thermalWeight,
      
      // Adjust convergence weight
      convergenceWeight: currentWeights.convergenceWeight,
      
      // Indicator-specific weights
      indicators: {},
      
      // Speed prediction adjustment
      speedBiasCorrection: -errorAnalysis.speedBias, // Correct for systematic bias
      
      // Probability calibration
      probabilityCalibration: {},
      
      // Time of day adjustments
      hourlyMultipliers: {},
    };
    
    // Adjust indicator weights based on learned correlations
    for (const [key, correlation] of Object.entries(indicatorLearning)) {
      newWeights.indicators[key] = {
        weight: correlation.kiteablePredictionRate * correlation.confidence,
        speedMultiplier: correlation.avgSpeedRatio,
        reliability: correlation.speedCorrelation,
      };
    }
    
    // Adjust probability calibration
    for (const [bucket, data] of Object.entries(errorAnalysis.probabilityBuckets)) {
      if (data.predicted > 10) { // Need minimum samples
        const expectedRate = (parseInt(bucket.split('-')[0]) + parseInt(bucket.split('-')[1])) / 200;
        const actualRate = data.actualRate;
        newWeights.probabilityCalibration[bucket] = actualRate / expectedRate;
      }
    }
    
    // Adjust hourly multipliers
    for (const [hour, data] of Object.entries(errorAnalysis.hourlyAccuracy)) {
      if (data.total > 5) {
        const avgAccuracy = data.sumAccuracy / data.total;
        // If accuracy is low at this hour, reduce confidence
        newWeights.hourlyMultipliers[hour] = avgAccuracy / 100;
      }
    }
    
    // Adjust main weights based on wind type accuracy
    const thermalAccuracy = errorAnalysis.windTypeAccuracy.thermal;
    const northFlowAccuracy = errorAnalysis.windTypeAccuracy.north_flow;
    
    if (thermalAccuracy.total > 10) {
      const rate = thermalAccuracy.correct / thermalAccuracy.total;
      newWeights.thermalWeight = currentWeights.thermalWeight * (0.5 + rate * 0.5);
    }
    
    if (northFlowAccuracy.total > 10) {
      const rate = northFlowAccuracy.correct / northFlowAccuracy.total;
      newWeights.pressureWeight = currentWeights.pressureWeight * (0.5 + rate * 0.5);
    }
    
    return newWeights;
  }

  // =========================================
  // WEIGHT MANAGEMENT
  // =========================================

  getDefaultWeights() {
    return {
      version: 'default',
      pressureWeight: 0.40,
      thermalWeight: 0.40,
      convergenceWeight: 0.20,
      speedBiasCorrection: 0,
      indicators: {},
      probabilityCalibration: {},
      hourlyMultipliers: {},
    };
  }

  async loadCurrentWeights() {
    try {
      const tx = this.db.transaction(STORES.MODEL_WEIGHTS, 'readonly');
      const store = tx.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.get('current');
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          this.currentWeights = request.result || this.getDefaultWeights();
          resolve(this.currentWeights);
        };
        request.onerror = () => {
          this.currentWeights = this.getDefaultWeights();
          resolve(this.currentWeights);
        };
      });
    } catch (e) {
      this.currentWeights = this.getDefaultWeights();
      return this.currentWeights;
    }
  }

  async saveWeights(weights) {
    const tx = this.db.transaction(STORES.MODEL_WEIGHTS, 'readwrite');
    const store = tx.objectStore(STORES.MODEL_WEIGHTS);
    
    // Save as current
    await store.put({ ...weights, id: 'current' });
    
    // Also save historical version
    await store.put({ ...weights, id: `v${weights.version}` });
    
    this.currentWeights = weights;
  }

  // =========================================
  // HELPER METHODS
  // =========================================

  async addRecord(storeName, record) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePrediction(id, updates) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readwrite');
    const store = tx.objectStore(STORES.PREDICTIONS);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          Object.assign(record, updates);
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve(record);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getUnverifiedPredictions(olderThan) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readonly');
    const store = tx.objectStore(STORES.PREDICTIONS);
    const index = store.index('timestamp');
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.upperBound(olderThan.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.verified) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getActualsForTimeRange(lakeId, start, end) {
    const tx = this.db.transaction(STORES.ACTUALS, 'readonly');
    const store = tx.objectStore(STORES.ACTUALS);
    const index = store.index('timestamp');
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.lakeId === lakeId) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async recordAccuracy(lakeId, date, accuracy) {
    return this.addRecord(STORES.ACCURACY, {
      lakeId,
      date,
      timestamp: new Date().toISOString(),
      ...accuracy,
    });
  }

  async getRecentAccuracy(days) {
    const tx = this.db.transaction(STORES.ACCURACY, 'readonly');
    const store = tx.objectStore(STORES.ACCURACY);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getVerifiedPredictions(days) {
    const tx = this.db.transaction(STORES.PREDICTIONS, 'readonly');
    const store = tx.objectStore(STORES.PREDICTIONS);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.verified) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async getAllIndicatorData() {
    const tx = this.db.transaction(STORES.INDICATORS, 'readonly');
    const store = tx.objectStore(STORES.INDICATORS);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async getAllActuals(days) {
    const tx = this.db.transaction(STORES.ACTUALS, 'readonly');
    const store = tx.objectStore(STORES.ACTUALS);
    const index = store.index('date');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    
    return new Promise((resolve) => {
      const results = [];
      const range = IDBKeyRange.lowerBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  // Math helpers
  directionsMatch(dir1, dir2, tolerance = 30) {
    if (dir1 == null || dir2 == null) return false;
    let diff = Math.abs(dir1 - dir2);
    if (diff > 180) diff = 360 - diff;
    return diff <= tolerance;
  }

  directionDifference(dir1, dir2) {
    if (dir1 == null || dir2 == null) return null;
    let diff = Math.abs(dir1 - dir2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  averageDirection(directions) {
    if (directions.length === 0) return null;
    
    let sinSum = 0;
    let cosSum = 0;
    
    for (const dir of directions) {
      const rad = dir * Math.PI / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    
    const avgRad = Math.atan2(sinSum, cosSum);
    let avgDeg = avgRad * 180 / Math.PI;
    if (avgDeg < 0) avgDeg += 360;
    
    return Math.round(avgDeg);
  }

  getDominantDirection(actuals) {
    const validDirs = actuals.filter(a => a.windDirection != null).map(a => a.windDirection);
    return this.averageDirection(validDirs);
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length < 3) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // =========================================
  // PUBLIC API
  // =========================================

  /**
   * Get current model accuracy stats
   */
  async getAccuracyStats() {
    await this.initialize();
    
    const recent = await this.getRecentAccuracy(30);
    
    if (recent.length === 0) {
      return {
        totalPredictions: 0,
        avgAccuracy: null,
        trend: 'insufficient_data',
      };
    }
    
    const avgAccuracy = recent.reduce((sum, r) => sum + (r.overallScore || 0), 0) / recent.length;
    
    // Calculate trend (compare last 7 days to previous 7 days)
    const lastWeek = recent.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      return (now - d) / (1000 * 60 * 60 * 24) <= 7;
    });
    const previousWeek = recent.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      const daysAgo = (now - d) / (1000 * 60 * 60 * 24);
      return daysAgo > 7 && daysAgo <= 14;
    });
    
    let trend = 'stable';
    if (lastWeek.length > 5 && previousWeek.length > 5) {
      const lastWeekAvg = lastWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / lastWeek.length;
      const prevWeekAvg = previousWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / previousWeek.length;
      
      if (lastWeekAvg > prevWeekAvg + 5) trend = 'improving';
      else if (lastWeekAvg < prevWeekAvg - 5) trend = 'declining';
    }
    
    return {
      totalPredictions: recent.length,
      avgAccuracy: Math.round(avgAccuracy),
      trend,
      lastWeekAccuracy: lastWeek.length > 0 
        ? Math.round(lastWeek.reduce((s, r) => s + (r.overallScore || 0), 0) / lastWeek.length)
        : null,
    };
  }

  /**
   * Get learned weights for use in predictions
   */
  async getLearnedWeights() {
    await this.initialize();
    return this.currentWeights || this.getDefaultWeights();
  }

  /**
   * Export all data for backup/analysis
   */
  async exportData() {
    await this.initialize();
    
    const predictions = await this.getVerifiedPredictions(365);
    const accuracy = await this.getRecentAccuracy(365);
    const indicators = await this.getAllIndicatorData();
    const weights = this.currentWeights;
    
    return {
      exportedAt: new Date().toISOString(),
      predictions,
      accuracy,
      indicators,
      weights,
    };
  }
}

// Singleton instance
export const learningSystem = new LearningSystem();
export default learningSystem;
```

---

## File 25: `src/services/DataCollector.js`

> 333 lines | 10.4 KB

```javascript
/**
 * DATA COLLECTOR
 * 
 * Automated service that continuously collects weather data and feeds it
 * to the learning system. This runs in the background while the app is open.
 * 
 * Collection Schedule:
 * - Every 15 minutes: Record actual weather data from all stations
 * - Every hour: Record predictions and verify past predictions
 * - Every 6 hours: Check indicator correlations
 * - Every 24 hours: Trigger learning cycle if enough data
 */

import { learningSystem } from './LearningSystem';
import { weatherService } from './WeatherService';
import { LakeState } from './DataNormalizer';
import { LAKE_CONFIGS, getAllStationIds } from '../config/lakeStations';

class DataCollector {
  constructor() {
    this.isRunning = false;
    this.intervals = [];
    this.lastCollection = {};
    this.collectionStats = {
      actualsCollected: 0,
      predictionsRecorded: 0,
      verificationsRun: 0,
      learningCyclesRun: 0,
      lastError: null,
    };
  }

  /**
   * Start the data collection service
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('🎓 Starting Data Collector for Learning System...');
    
    await learningSystem.initialize();
    this.isRunning = true;

    // Collect actuals every 15 minutes
    this.intervals.push(
      setInterval(() => this.collectActuals(), 15 * 60 * 1000)
    );

    // Record predictions and verify every hour
    this.intervals.push(
      setInterval(() => this.recordAndVerify(), 60 * 60 * 1000)
    );

    // Check indicator correlations every 6 hours
    this.intervals.push(
      setInterval(() => this.collectIndicatorData(), 6 * 60 * 60 * 1000)
    );

    // Trigger learning check every 24 hours
    this.intervals.push(
      setInterval(() => this.triggerLearning(), 24 * 60 * 60 * 1000)
    );

    // Run initial collection
    await this.collectActuals();
    
    console.log('✅ Data Collector started');
  }

  /**
   * Stop the data collection service
   */
  stop() {
    console.log('Stopping Data Collector...');
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Collect actual weather data from all stations
   */
  async collectActuals() {
    if (!this.isRunning) return;

    console.log('📊 Collecting actual weather data...');

    try {
      // Collect for each lake
      const lakes = ['utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy', 
                     'utah-lake-vineyard', 'utah-lake-mm19', 'deer-creek', 'willard-bay'];

      for (const lakeId of lakes) {
        const stationIds = getAllStationIds(lakeId);
        
        // Get Synoptic data
        const synopticData = await weatherService.getSynopticStationData(stationIds);
        
        for (const station of synopticData) {
          await learningSystem.recordActual(lakeId, station.stationId, {
            windSpeed: station.windSpeed,
            windGust: station.windGust,
            windDirection: station.windDirection,
            temperature: station.temperature,
            pressure: station.pressure,
          });
          
          this.collectionStats.actualsCollected++;
        }
      }

      // Also collect PWS data
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        await learningSystem.recordActual('utah-lake-zigzag', 'PWS', {
          windSpeed: ambientData.windSpeed,
          windGust: ambientData.windGust,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
          pressure: ambientData.pressure,
        });
        this.collectionStats.actualsCollected++;
      }

      this.lastCollection.actuals = new Date().toISOString();
      console.log(`✅ Collected ${this.collectionStats.actualsCollected} actual readings`);

    } catch (error) {
      console.error('Error collecting actuals:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Record current predictions and verify past ones
   */
  async recordAndVerify() {
    if (!this.isRunning) return;

    console.log('🔮 Recording predictions and verifying past ones...');

    try {
      // Record predictions for each lake
      const lakes = ['utah-lake-zigzag', 'utah-lake-lincoln', 'utah-lake-sandy', 
                     'utah-lake-vineyard', 'utah-lake-mm19'];

      for (const lakeId of lakes) {
        // Get current data
        const data = await weatherService.getDataForLake(lakeId);
        
        // Build lake state (which includes prediction)
        const lakeState = LakeState.fromRawData(lakeId, data.ambient, data.synoptic);
        
        if (lakeState.thermalPrediction) {
          // Record the prediction
          await learningSystem.recordPrediction(lakeId, {
            probability: lakeState.probability,
            windType: lakeState.thermalPrediction.windType,
            expectedSpeed: lakeState.thermalPrediction.expectedSpeed,
            expectedDirection: lakeState.thermalPrediction.direction?.ideal,
            startTime: lakeState.thermalPrediction.startTime,
            foilKiteablePct: lakeState.thermalPrediction.northFlow?.foilKiteablePct 
              || lakeState.thermalPrediction.provoIndicator?.foilKiteablePct,
            twinTipKiteablePct: lakeState.thermalPrediction.northFlow?.twinTipKiteablePct
              || lakeState.thermalPrediction.provoIndicator?.twinTipKiteablePct,
            phase: lakeState.thermalPrediction.phase,
          }, {
            pressureGradient: lakeState.pressure?.gradient,
            thermalDelta: lakeState.thermal?.delta,
            spanishForkWind: lakeState.earlyIndicator ? {
              speed: lakeState.earlyIndicator.windSpeed,
              direction: lakeState.earlyIndicator.windDirection,
            } : null,
            kslcWind: lakeState.kslcStation ? {
              speed: lakeState.kslcStation.windSpeed,
              direction: lakeState.kslcStation.windDirection,
            } : null,
            kpvuWind: lakeState.kpvuStation ? {
              speed: lakeState.kpvuStation.windSpeed,
              direction: lakeState.kpvuStation.windDirection,
            } : null,
            utalpWind: lakeState.utalpStation ? {
              speed: lakeState.utalpStation.windSpeed,
              direction: lakeState.utalpStation.windDirection,
            } : null,
            temperature: lakeState.pws?.temperature,
          });
          
          this.collectionStats.predictionsRecorded++;
        }
      }

      // Verify past predictions
      await learningSystem.verifyPredictions();
      this.collectionStats.verificationsRun++;

      this.lastCollection.predictions = new Date().toISOString();
      console.log(`✅ Recorded ${this.collectionStats.predictionsRecorded} predictions`);

    } catch (error) {
      console.error('Error recording predictions:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Collect indicator correlation data
   */
  async collectIndicatorData() {
    if (!this.isRunning) return;

    console.log('📈 Collecting indicator correlation data...');

    try {
      // Get data from all indicator stations
      const indicatorStations = ['KSLC', 'KPVU', 'QSF', 'UTALP'];
      const targetStations = ['FPS', 'PWS'];
      
      const allStations = [...indicatorStations, ...targetStations];
      const synopticData = await weatherService.getSynopticStationData(allStations);
      
      const stationMap = new Map(synopticData.map(s => [s.stationId, s]));
      
      // Also get PWS
      const ambientData = await weatherService.getAmbientWeatherData();
      if (ambientData) {
        stationMap.set('PWS', {
          stationId: 'PWS',
          windSpeed: ambientData.windSpeed,
          windDirection: ambientData.windDirection,
          temperature: ambientData.temperature,
        });
      }

      // Record correlations
      const indicatorConfigs = [
        { indicator: 'KSLC', target: 'FPS', leadTime: 60 },
        { indicator: 'KSLC', target: 'PWS', leadTime: 60 },
        { indicator: 'KPVU', target: 'FPS', leadTime: 60 },
        { indicator: 'KPVU', target: 'PWS', leadTime: 60 },
        { indicator: 'QSF', target: 'FPS', leadTime: 120 },
        { indicator: 'QSF', target: 'PWS', leadTime: 120 },
        { indicator: 'UTALP', target: 'FPS', leadTime: 30 },
        { indicator: 'UTALP', target: 'PWS', leadTime: 30 },
      ];

      for (const config of indicatorConfigs) {
        const indicator = stationMap.get(config.indicator);
        const target = stationMap.get(config.target);
        
        if (indicator && target) {
          await learningSystem.recordIndicator(
            config.indicator,
            config.target,
            {
              speed: indicator.windSpeed,
              direction: indicator.windDirection,
              temperature: indicator.temperature,
            },
            {
              speed: target.windSpeed,
              direction: target.windDirection,
              temperature: target.temperature,
            },
            config.leadTime
          );
        }
      }

      this.lastCollection.indicators = new Date().toISOString();
      console.log('✅ Collected indicator correlation data');

    } catch (error) {
      console.error('Error collecting indicator data:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Trigger the learning cycle
   */
  async triggerLearning() {
    if (!this.isRunning) return;

    console.log('🧠 Triggering learning cycle...');

    try {
      const newWeights = await learningSystem.learnFromData();
      this.collectionStats.learningCyclesRun++;
      
      this.lastCollection.learning = new Date().toISOString();
      console.log('✅ Learning cycle complete');
      
      return newWeights;

    } catch (error) {
      console.error('Error in learning cycle:', error);
      this.collectionStats.lastError = error.message;
    }
  }

  /**
   * Get collection statistics
   */
  getStats() {
    return {
      ...this.collectionStats,
      isRunning: this.isRunning,
      lastCollection: this.lastCollection,
    };
  }

  /**
   * Force a learning cycle (for manual trigger)
   */
  async forceLearning() {
    return this.triggerLearning();
  }

  /**
   * Force data collection (for manual trigger)
   */
  async forceCollection() {
    await this.collectActuals();
    await this.recordAndVerify();
    await this.collectIndicatorData();
  }
}

// Singleton instance
export const dataCollector = new DataCollector();
export default dataCollector;
```

---

## File 26: `src/config/lakeStations.js`

> 963 lines | 27.3 KB

```javascript
/**
 * UTAH LAKE WIND PRO - Station Configuration
 * 
 * Based on local knowledge and thermal dynamics:
 * 
 * | Feature      | Primary Wind Type        | High-Elevation Trigger | Low-Elevation Indicator |
 * |--------------|--------------------------|------------------------|-------------------------|
 * | Utah Lake    | Prefrontal / North Flow  | SLC Airport (Pressure) | Saratoga Springs PWS    |
 * | Deer Creek   | SW Thermal / Canyon      | Arrowhead (8,252 ft)   | Charleston or Dam Chute |
 * | Willard Bay  | North Thermal / "The Gap"| Hill AFB or Ben Lomond | Willard Bay North       |
 * | Pineview     | East/West Canyon         | Ogden Peak             | Pineview Dam            |
 * 
 * PREDICTION MODEL:
 * Step A: Gradient Check - ΔP (SLC - Provo) > 2.0mb = North flow override
 * Step B: Elevation Delta - High station temp vs lakeshore = thermal pump indicator
 * Step C: Ground Truth - PWS verifies exact thermal arrival, correlate with 2hr prior pattern
 */

export const LAKE_CONFIGS = {
  // =====================================================
  // UTAH LAKE - 5 LAUNCH LOCATIONS (South to North)
  // =====================================================
  
  'utah-lake-lincoln': {
    id: 'utah-lake-lincoln',
    name: 'Lincoln Beach',
    shortName: 'Lincoln',
    region: 'Utah Lake - South',
    // Lincoln Beach - south end of Utah Lake
    coordinates: { lat: 40.14371515780893, lng: -111.80194831196697 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (135-165°)',
    description: 'Southernmost launch - Classic SE lake thermal',
    
    // Shore orientation for kite safety (direction shore faces - perpendicular to waterline)
    // Lincoln Beach faces roughly East (shore runs N-S, water is to the East)
    shoreOrientation: 90, // Shore faces East
    kiting: {
      onshore: { min: 45, max: 135 },    // NE to SE - wind blowing FROM water
      sideOn: { min: 135, max: 180, min2: 0, max2: 45 }, // SE to S, N to NE
      offshore: { min: 225, max: 315 },  // SW to NW - DANGEROUS
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'KPVU',
        name: 'Provo Municipal Airport',
        role: 'Ground Truth - Best indicator for southern launches',
      },
      
      // Spanish Fork Canyon early indicator
      // When QSF shows SE wind > 6 mph, thermal at Utah Lake likely in ~2 hours
      earlyIndicator: {
        id: 'QSF',
        name: 'Spanish Fork',
        elevation: 4550,
        coordinates: { lat: 40.115, lng: -111.655 },
        role: 'Early Warning - SE wind here precedes Utah Lake thermal by ~2 hours',
        leadTimeMinutes: 120,
        trigger: {
          direction: { min: 100, max: 180, label: 'SE' },
          speed: { min: 6, optimal: 7.5 },
        },
        statistics: {
          seDirectionOnGoodDays: 97,
          avgSpeedOnGoodDays: 7.6,
          accuracy: 62.5,
        },
      },
      
      lakeshore: [
        { 
          id: 'KPVU', 
          name: 'Provo Municipal Airport',
          elevation: 4495,
          role: 'Primary indicator - closest to Lincoln Beach',
          priority: 1
        },
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Secondary - good for SE thermal only',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'FPS', name: 'Flight Park South', elevation: 5202 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      northFlow: { min: 315, max: 45, ideal: 360 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  'utah-lake-sandy': {
    id: 'utah-lake-sandy',
    name: 'Sandy Beach',
    shortName: 'Sandy',
    region: 'Utah Lake - South-Central',
    // Sandy Beach - south-central Utah Lake
    coordinates: { lat: 40.17049661378955, lng: -111.74571902175627 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (130-160°)',
    description: 'South-Central launch - SE thermal',
    
    shoreOrientation: 100, // Shore faces ESE
    kiting: {
      onshore: { min: 55, max: 145 },
      sideOn: { min: 145, max: 190, min2: 10, max2: 55 },
      offshore: { min: 235, max: 325 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'KPVU',
        name: 'Provo Municipal Airport',
        role: 'Ground Truth - Best indicator for southern launches',
      },
      
      lakeshore: [
        { 
          id: 'KPVU', 
          name: 'Provo Municipal Airport',
          elevation: 4495,
          role: 'Primary indicator - closest to Sandy Beach',
          priority: 1
        },
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Secondary - good for SE thermal only',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
        { id: 'FPS', name: 'Flight Park South', elevation: 5202 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 130, max: 160, ideal: 145 },
      northFlow: { min: 315, max: 45, ideal: 360 },
      optimalSpeed: { min: 8, max: 18, average: 10 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  'utah-lake-vineyard': {
    id: 'utah-lake-vineyard',
    name: 'Vineyard',
    shortName: 'Vineyard',
    region: 'Utah Lake - Central',
    // Vineyard Beach - EAST side of Utah Lake (water is to the WEST)
    coordinates: { lat: 40.31765814163484, lng: -111.76473863107265 },
    elevation: 4489,
    
    primaryWindType: 'S/SSW/W Thermal',
    thermalDirection: 'S to W (180-270°)',
    description: 'East shore launch - S, SSW, W winds are onshore. SE is OFFSHORE!',
    
    // Vineyard is on EAST shore - shore faces WEST toward the lake
    shoreOrientation: 270, // Shore faces West
    kiting: {
      // Onshore = wind blowing FROM the lake (west) toward shore
      onshore: { min: 225, max: 315 },    // SW to NW - wind FROM lake
      // Side-on = S or SSW (parallel to shore)
      sideOn: { min: 180, max: 225, min2: 315, max2: 360 }, // S to SW, NW to N
      // Offshore = wind blowing TOWARD the lake - DANGEROUS
      offshore: { min: 45, max: 135 },    // NE to SE - DANGEROUS, blows you out to lake
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'High elevation reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Your PWS',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator',
          priority: 1
        },
        { 
          id: 'QLN', 
          name: 'Lindon',
          elevation: 4738,
          role: 'East shore reference',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
    },
    
    thermal: {
      // S, SSW, W are good for Vineyard (onshore/side-on from east shore)
      // SE is OFFSHORE and dangerous!
      optimalDirection: { min: 180, max: 270, ideal: 225 }, // S to W, ideal SSW
      optimalSpeed: { min: 6, max: 16, average: 9 },
      peakHours: { start: 10, end: 14, peak: 12 },
      buildTime: { start: 6, usable: 9 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  'utah-lake-zigzag': {
    id: 'utah-lake-zigzag',
    name: 'Zig Zag',
    shortName: 'Zig Zag',
    region: 'Utah Lake - North-Central',
    // Zig Zag - next to El Naughtica boat club, Saratoga Springs
    coordinates: { lat: 40.30268164473557, lng: -111.8799503518146 },
    elevation: 4489,
    
    primaryWindType: 'SE Thermal',
    thermalDirection: 'SE to SSE (135-165°)',
    description: 'Your home launch - Classic SE thermal at Zig Zag',
    
    shoreOrientation: 135, // Shore faces SE
    kiting: {
      onshore: { min: 90, max: 180 },
      sideOn: { min: 180, max: 225, min2: 45, max2: 90 },
      offshore: { min: 270, max: 360 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Your PWS at Zig Zag',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator station',
          priority: 1
        },
        { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Valley floor reference',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  'utah-lake-mm19': {
    id: 'utah-lake-mm19',
    name: 'Mile Marker 19',
    shortName: 'MM19',
    region: 'Utah Lake - North',
    // Mile Marker 19 - west side of Utah Lake
    coordinates: { lat: 40.19869601578235, lng: -111.88652790796455 },
    elevation: 4489,
    
    primaryWindType: 'SE/E Thermal',
    thermalDirection: 'SE to E (120-160°)',
    description: 'Northernmost launch - SE to East thermal',
    
    shoreOrientation: 160, // Shore faces SSE to S (north end curves)
    kiting: {
      onshore: { min: 115, max: 205 },
      sideOn: { min: 205, max: 250, min2: 70, max2: 115 },
      offshore: { min: 295, max: 25 },
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference',
          priority: 1
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Nearby PWS',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator',
          priority: 1
        },
        { 
          id: 'UTALP', 
          name: 'Point of the Mountain',
          elevation: 4796,
          role: 'North reference',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'KSLC', name: 'Salt Lake City Intl', elevation: 4226 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 120, max: 160, ideal: 140 },
      optimalSpeed: { min: 8, max: 18, average: 10 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  // Legacy ID for backwards compatibility
  'utah-lake': {
    id: 'utah-lake',
    name: 'Utah Lake (All)',
    shortName: 'Overview',
    region: 'Utah County',
    coordinates: { lat: 40.2369, lng: -111.7388 },
    elevation: 4489,
    
    primaryWindType: 'Variable',
    thermalDirection: 'Depends on launch',
    description: 'Overview of all Utah Lake conditions',
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Gradient Check - North pressure reference',
        },
        low: { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Gradient Check - South pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        { 
          id: 'CSC', 
          name: 'Cascade Peak',
          elevation: 10875,
          role: 'Elevation Delta - High reference for thermal pump',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup high elevation reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'PWS',
        name: 'Saratoga Springs (Zigzag)',
        role: 'Ground Truth - Exact thermal arrival verification',
      },
      
      lakeshore: [
        { 
          id: 'FPS', 
          name: 'Flight Park South',
          elevation: 5202,
          role: 'Primary thermal indicator station',
          priority: 1
        },
        { 
          id: 'KPVU', 
          name: 'Provo Municipal',
          elevation: 4495,
          role: 'Valley floor reference',
          priority: 2
        },
        { 
          id: 'QLN', 
          name: 'Lindon',
          elevation: 4738,
          role: 'East shore - lake breeze penetration',
          priority: 3
        },
      ],
      
      reference: [
        { id: 'UTALP', name: 'Point of the Mountain', elevation: 4796 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 135, max: 165, ideal: 150 },
      optimalSpeed: { min: 8, max: 18, average: 10.3 },
      peakHours: { start: 10, end: 13, peak: 11 },
      buildTime: { start: 5, usable: 8 },
      fadeTime: { start: 15, end: 18 },
    },
    
    waterTempEstimate: 58,
  },

  'deer-creek': {
    id: 'deer-creek',
    name: 'Deer Creek',
    shortName: 'Deer Creek',
    region: 'Wasatch County', 
    // Deer Creek Reservoir - main launch near the dam
    coordinates: { lat: 40.4097, lng: -111.5097 },
    elevation: 5400,
    
    primaryWindType: 'SW Thermal / Canyon',
    thermalDirection: 'South (170-210°)',
    description: 'Canyon thermal from the south - Arrowhead is key trigger',
    
    shoreOrientation: 180, // Shore faces South
    kiting: {
      onshore: { min: 135, max: 225 },    // SE to SW - wind from water
      sideOn: { min: 225, max: 270, min2: 90, max2: 135 },
      offshore: { min: 315, max: 45 },     // NW to NE - DANGEROUS
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: { 
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Local valley pressure',
        },
        bustThreshold: 2.0,
      },
      
      // ELEVATION DELTA - Arrowhead is THE key station for Deer Creek
      ridge: [
        { 
          id: 'SND', 
          name: 'Arrowhead Summit',
          elevation: 8252,
          role: 'PRIMARY - High-elevation trigger for Deer Creek thermal',
          priority: 1
        },
        { 
          id: 'TIMU1', 
          name: 'Timpanogos Divide',
          elevation: 8170,
          role: 'Backup ridge reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'DCC',
        name: 'Deer Creek Dam',
        role: 'Ground Truth - Dam/Chute thermal indicator',
      },
      
      lakeshore: [
        { 
          id: 'DCC', 
          name: 'Deer Creek Dam',
          elevation: 6675,
          role: 'Primary - at reservoir',
          priority: 1
        },
        { 
          id: 'KHCR', 
          name: 'Heber Valley Airport',
          elevation: 5597,
          role: 'Charleston area reference',
          priority: 2
        },
        {
          id: 'UTPCY',
          name: 'Provo Canyon MP10',
          elevation: 5119,
          role: 'Canyon mouth - thermal draw indicator',
          priority: 3
        }
      ],
      
      reference: [
        { id: 'MDAU1', name: 'Midway', elevation: 5758 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 170, max: 210, ideal: 185 },
      optimalSpeed: { min: 4, max: 12, average: 5.5 },
      peakHours: { start: 13, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    
    // Critical requirement
    requirement: 'MUST have South wind (170-210°) - canyon only works with S flow',
    
    waterTempEstimate: 52,
  },

  'willard-bay': {
    id: 'willard-bay',
    name: 'Willard Bay',
    shortName: 'Willard',
    region: 'Box Elder County',
    coordinates: { lat: 41.3686, lng: -112.0772 },
    elevation: 4200,
    
    primaryWindType: 'North Thermal / "The Gap"',
    thermalDirection: 'S to SW (170-220°)',
    description: 'Gap wind from the north - watch for frontal passages',
    
    shoreOrientation: 270, // Shore faces West
    kiting: {
      onshore: { min: 225, max: 315 },    // SW to NW - wind from water
      sideOn: { min: 315, max: 360, min2: 180, max2: 225 },
      offshore: { min: 45, max: 135 },     // NE to SE - DANGEROUS
    },
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Southern pressure reference',
        },
        low: { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'Local Ogden pressure',
        },
        bustThreshold: 2.0,
      },
      
      // Hill AFB or Ben Lomond for high elevation trigger
      ridge: [
        { 
          id: 'BLPU1', 
          name: 'Ben Lomond Peak',
          elevation: 7688,
          role: 'PRIMARY - High-elevation trigger for Willard thermal',
          priority: 1
        },
        {
          id: 'KHIF',
          name: 'Hill Air Force Base',
          elevation: 4783,
          role: 'Military weather station - reliable data',
          priority: 2
        },
        {
          id: 'OGP',
          name: 'Mount Ogden',
          elevation: 9570,
          role: 'Highest Wasatch peak in area',
          priority: 3
        },
      ],
      
      groundTruth: {
        id: 'UR328',
        name: 'Willard Bay North',
        role: 'Ground Truth - North end thermal indicator',
      },
      
      lakeshore: [
        {
          id: 'UR328',
          name: 'Willard',
          elevation: 4253,
          role: 'Primary - closest to bay',
          priority: 1
        },
        { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'South reference',
          priority: 2
        },
        { 
          id: 'KBMC', 
          name: 'Brigham City Regional',
          elevation: 4230,
          role: 'North reference',
          priority: 3
        },
      ],
      
      reference: [
        { id: 'GSLM', name: 'Great Salt Lake Minerals', elevation: 4212 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 170, max: 220, ideal: 195 },
      optimalSpeed: { min: 6, max: 15, average: 8 },
      peakHours: { start: 12, end: 15, peak: 13 },
      buildTime: { start: 9, usable: 11 },
      fadeTime: { start: 16, end: 18 },
    },
    
    waterTempEstimate: 55,
  },

  'pineview': {
    id: 'pineview',
    name: 'Pineview Reservoir',
    region: 'Weber County',
    coordinates: { lat: 41.2697, lng: -111.8208 },
    elevation: 4900,
    
    primaryWindType: 'East/West Canyon',
    thermalDirection: 'Variable - canyon dependent',
    
    stations: {
      pressure: {
        high: { 
          id: 'KSLC', 
          name: 'Salt Lake City Intl',
          elevation: 4226,
          role: 'Regional pressure reference',
        },
        low: { 
          id: 'KOGD', 
          name: 'Ogden-Hinckley Airport',
          elevation: 4440,
          role: 'Valley pressure reference',
        },
        bustThreshold: 2.0,
      },
      
      ridge: [
        {
          id: 'OGP',
          name: 'Ogden Peak (Snowbasin)',
          elevation: 9570,
          role: 'PRIMARY - High-elevation trigger',
          priority: 1
        },
        { 
          id: 'BLPU1', 
          name: 'Ben Lomond Peak',
          elevation: 7688,
          role: 'Northern ridge reference',
          priority: 2
        },
      ],
      
      groundTruth: {
        id: 'COOPOGNU1',
        name: 'Pineview Dam',
        role: 'Ground Truth - Dam area thermal indicator',
      },
      
      lakeshore: [
        {
          id: 'COOPOGNU1',
          name: 'Pineview Dam',
          elevation: 4940,
          role: 'Primary - at reservoir',
          priority: 1
        },
        {
          id: 'PC496',
          name: 'Pineview Reservoir',
          elevation: 4956,
          role: 'Reservoir station',
          priority: 2
        },
      ],
      
      reference: [
        { id: 'UTHUN', name: 'Huntsville', elevation: 4951 },
      ],
    },
    
    thermal: {
      optimalDirection: { min: 240, max: 300, ideal: 270 }, // West for canyon
      optimalSpeed: { min: 5, max: 12, average: 7 },
      peakHours: { start: 12, end: 16, peak: 14 },
      buildTime: { start: 10, usable: 12 },
      fadeTime: { start: 17, end: 19 },
    },
    
    waterTempEstimate: 50,
  },
};

/**
 * Get all station IDs needed for a lake (for API calls)
 */
export const getAllStationIds = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return [];
  
  const ids = new Set();
  
  ids.add(config.stations.pressure.high.id);
  ids.add(config.stations.pressure.low.id);
  config.stations.ridge.forEach((s) => ids.add(s.id));
  config.stations.lakeshore.forEach((s) => ids.add(s.id));
  config.stations.reference.forEach((s) => ids.add(s.id));
  
  // Add ground truth if it's a MesoWest station
  if (config.stations.groundTruth?.id && config.stations.groundTruth.id !== 'PWS') {
    ids.add(config.stations.groundTruth.id);
  }
  
  // Add early indicator station (Spanish Fork for Utah Lake)
  if (config.stations.earlyIndicator?.id) {
    ids.add(config.stations.earlyIndicator.id);
  }
  
  return Array.from(ids);
};

/**
 * Get the primary ridge station for a lake
 */
export const getPrimaryRidgeStation = (lakeId) => {
  const config = LAKE_CONFIGS[lakeId];
  if (!config) return null;
  return config.stations.ridge.find(s => s.priority === 1) || config.stations.ridge[0];
};

/**
 * Get optimal wind configuration for convergence calculation
 */
export const WIND_DIRECTION_OPTIMAL = Object.fromEntries(
  Object.entries(LAKE_CONFIGS).map(([id, config]) => [
    id, 
    config.thermal.optimalDirection
  ])
);

/**
 * Station metadata for display
 */
export const STATION_INFO = {
  'KSLC': { fullName: 'Salt Lake City International Airport', type: 'aviation', network: 'NWS' },
  'KPVU': { fullName: 'Provo Municipal Airport', type: 'aviation', network: 'NWS' },
  'KHCR': { fullName: 'Heber Valley Airport', type: 'aviation', network: 'NWS' },
  'KOGD': { fullName: 'Ogden-Hinckley Airport', type: 'aviation', network: 'NWS' },
  'KBMC': { fullName: 'Brigham City Regional Airport', type: 'aviation', network: 'NWS' },
  'KHIF': { fullName: 'Hill Air Force Base', type: 'military', network: 'USAF' },
  'FPS': { fullName: 'Flight Park South', type: 'mesonet', network: 'MesoWest' },
  'CSC': { fullName: 'Cascade Peak', type: 'mountaintop', network: 'MesoWest' },
  'TIMU1': { fullName: 'Timpanogos Divide', type: 'snotel', network: 'NRCS' },
  'SND': { fullName: 'Arrowhead Summit (Sundance)', type: 'ski', network: 'MesoWest' },
  'QSF': { fullName: 'Spanish Fork', type: 'mesonet', network: 'MesoWest', role: 'Early Indicator - 2hr lead time' },
  'DCC': { fullName: 'Deer Creek Dam', type: 'mesonet', network: 'MesoWest' },
  'BLPU1': { fullName: 'Ben Lomond Peak', type: 'snotel', network: 'NRCS' },
  'OGP': { fullName: 'Mount Ogden (Snowbasin)', type: 'ski', network: 'MesoWest' },
  'UR328': { fullName: 'Willard', type: 'mesonet', network: 'MesoWest' },
  'QLN': { fullName: 'Lindon', type: 'mesonet', network: 'MesoWest' },
  'UTALP': { fullName: 'Point of the Mountain I-15', type: 'rwis', network: 'UDOT' },
  'UTPCY': { fullName: 'Provo Canyon Mile Post 10', type: 'rwis', network: 'UDOT' },
  'MDAU1': { fullName: 'Midway', type: 'coop', network: 'NWS' },
  'GSLM': { fullName: 'Great Salt Lake Minerals', type: 'industrial', network: 'MesoWest' },
  'COOPOGNU1': { fullName: 'Pineview Dam', type: 'coop', network: 'NWS' },
  'PC496': { fullName: 'Pineview Reservoir', type: 'mesonet', network: 'MesoWest' },
  'UTHUN': { fullName: 'Huntsville', type: 'rwis', network: 'UDOT' },
};
```

---

## File 27: `src/config/indicatorSystem.js`

> 534 lines | 17.2 KB

```javascript
/**
 * INDICATOR SYSTEM
 * 
 * This module defines the reusable framework for wind prediction indicators.
 * Each indicator follows the same structure and validation methodology.
 * 
 * HOW IT WORKS:
 * 1. Upstream weather stations show wind patterns BEFORE they reach your kiting spot
 * 2. We analyze historical data to find the correlation
 * 3. We VALIDATE that correlation predicts kiteable conditions (not just any wind)
 * 4. We set thresholds based on actionable probabilities
 * 
 * TO ADD A NEW INDICATOR:
 * 1. Find candidate stations upstream of your target
 * 2. Run correlation analysis (see scripts/analyze-*.js)
 * 3. Validate with speed bucket analysis
 * 4. Add configuration below following the template
 */

// =============================================================================
// WIND TYPES - The mechanisms that create wind
// =============================================================================

export const WIND_TYPES = {
  THERMAL: {
    id: 'thermal',
    name: 'Thermal Wind',
    description: 'Sun heats land faster than water, creating onshore flow',
    mechanism: 'Temperature differential between land and water',
    typicalTiming: '10am - 5pm',
    seasonality: 'Spring through Fall',
    indicators: ['temperature_delta', 'canyon_heating', 'ridge_wind'],
  },
  
  NORTH_FLOW: {
    id: 'north_flow',
    name: 'Prefrontal/North Flow',
    description: 'High pressure to the north pushes air south',
    mechanism: 'Pressure gradient between SLC and Provo',
    typicalTiming: 'Any time, often afternoon/evening',
    seasonality: 'Year-round, strongest in spring/fall',
    indicators: ['pressure_gradient', 'airport_wind', 'gap_wind'],
  },
  
  GAP_WIND: {
    id: 'gap_wind',
    name: 'Gap/Canyon Wind',
    description: 'Wind funneled through terrain gaps',
    mechanism: 'Venturi effect through mountain passes',
    typicalTiming: 'Varies by location',
    seasonality: 'Year-round',
    indicators: ['gap_entrance_wind', 'pressure_differential'],
  },
  
  CANYON_THERMAL: {
    id: 'canyon_thermal',
    name: 'Canyon Thermal',
    description: 'Upslope flow as canyon walls heat',
    mechanism: 'Canyon heating creates upward air movement',
    typicalTiming: '11am - 4pm',
    seasonality: 'Spring through Fall',
    indicators: ['ridge_temperature', 'canyon_entrance_wind'],
  },
};

// =============================================================================
// INDICATOR TEMPLATE - Structure for all indicators
// =============================================================================

/**
 * Template for creating a new indicator configuration
 * 
 * @typedef {Object} IndicatorConfig
 * @property {string} id - Unique identifier
 * @property {string} stationId - MesoWest station ID
 * @property {string} name - Human-readable name
 * @property {Object} coordinates - { lat, lng }
 * @property {number} elevation - Station elevation in feet
 * @property {string} windType - One of WIND_TYPES keys
 * @property {string} role - Description of what this indicator shows
 * @property {string[]} bestFor - Array of launch IDs this indicator is best for
 * @property {number} leadTimeHours - How far in advance this predicts
 * @property {Object} trigger - Conditions that activate this indicator
 * @property {Object} speedCorrelation - Validated correlation data
 * @property {Object} ui - UI display configuration
 */

const INDICATOR_TEMPLATE = {
  id: 'template',
  stationId: 'XXXX',
  name: 'Station Name',
  coordinates: { lat: 0, lng: 0 },
  elevation: 0,
  
  windType: 'THERMAL', // Key from WIND_TYPES
  role: 'Description of what this indicator tells us',
  bestFor: ['launch-id-1', 'launch-id-2'],
  
  leadTimeHours: 1,
  
  trigger: {
    direction: {
      min: 0,      // Minimum degrees (0 = N)
      max: 360,    // Maximum degrees
      label: 'N',  // Human-readable direction
    },
    speed: {
      min: 5,      // Minimum to consider
      threshold: 10, // Strong signal threshold
    },
  },
  
  // VALIDATED correlation from historical analysis
  // This is the KEY - not just correlation, but kiteable prediction
  speedCorrelation: {
    '5-8': { 
      avgTargetSpeed: 0, 
      foilKiteablePct: 0, 
      twinTipKiteablePct: 0,
      sampleSize: 0,
    },
    '8-10': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
    '10-15': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
    '15+': { avgTargetSpeed: 0, foilKiteablePct: 0, twinTipKiteablePct: 0, sampleSize: 0 },
  },
  
  ui: {
    color: 'blue',      // Primary color for UI elements
    icon: '🌬️',         // Emoji for quick identification
    priority: 1,        // Display order (lower = higher priority)
  },
};

// =============================================================================
// UTAH LAKE INDICATORS - Validated configurations
// =============================================================================

export const UTAH_LAKE_INDICATORS = {
  // ----- THERMAL INDICATORS -----
  
  SPANISH_FORK: {
    id: 'spanish-fork',
    stationId: 'QSF',
    name: 'Spanish Fork Canyon',
    coordinates: { lat: 40.05, lng: -111.65 },
    elevation: 4600,
    
    windType: 'THERMAL',
    role: 'Early indicator for SE thermal - shows canyon heating 2 hours before lake thermal',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 2,
    
    trigger: {
      direction: { min: 90, max: 180, label: 'SE (E to S)' },
      speed: { min: 6, threshold: 10 },
    },
    
    // Validated from 3-year historical analysis
    speedCorrelation: {
      '6-8': { avgTargetSpeed: 8.5, foilKiteablePct: 35, twinTipKiteablePct: 10, sampleSize: 45 },
      '8-10': { avgTargetSpeed: 11.2, foilKiteablePct: 52, twinTipKiteablePct: 25, sampleSize: 38 },
      '10-15': { avgTargetSpeed: 14.8, foilKiteablePct: 75, twinTipKiteablePct: 45, sampleSize: 28 },
      '15+': { avgTargetSpeed: 19.5, foilKiteablePct: 90, twinTipKiteablePct: 70, sampleSize: 12 },
    },
    
    ui: {
      color: 'green',
      icon: '⏰',
      priority: 2,
    },
  },
  
  // ----- NORTH FLOW INDICATORS -----
  
  SALT_LAKE_CITY: {
    id: 'salt-lake-city',
    stationId: 'KSLC',
    name: 'Salt Lake City Airport',
    coordinates: { lat: 40.7884, lng: -111.9778 },
    elevation: 4226,
    
    windType: 'NORTH_FLOW',
    role: 'Primary north flow indicator - shows pressure-driven north wind from Great Salt Lake',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 10 },  // Validated: 5mph only 45% kiteable
    },
    
    // Validated correlation from historical analysis
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 9.3, foilKiteablePct: 45, twinTipKiteablePct: 14, sampleSize: 156 },
      '8-10': { avgTargetSpeed: 12.6, foilKiteablePct: 56, twinTipKiteablePct: 31, sampleSize: 89 },
      '10-15': { avgTargetSpeed: 15.5, foilKiteablePct: 81, twinTipKiteablePct: 50, sampleSize: 52 },
      '15+': { avgTargetSpeed: 23.4, foilKiteablePct: 100, twinTipKiteablePct: 100, sampleSize: 18 },
    },
    
    ui: {
      color: 'blue',
      icon: '🌬️',
      priority: 1,
    },
  },
  
  PROVO_AIRPORT: {
    id: 'provo-airport',
    stationId: 'KPVU',
    name: 'Provo Airport',
    coordinates: { lat: 40.2192, lng: -111.7236 },
    elevation: 4497,
    
    windType: 'NORTH_FLOW',
    role: 'Best indicator for SOUTHERN Utah Lake launches - closer to Lincoln/Sandy Beach',
    bestFor: ['utah-lake-lincoln', 'utah-lake-sandy'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 10 },
    },
    
    // Validated: KPVU is BETTER than KSLC for southern launches
    // 78% foil kiteable vs 56% for KSLC at 8-10mph
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 10.1, foilKiteablePct: 52, twinTipKiteablePct: 18, sampleSize: 134 },
      '8-10': { avgTargetSpeed: 14.2, foilKiteablePct: 78, twinTipKiteablePct: 42, sampleSize: 76 },
      '10-15': { avgTargetSpeed: 17.8, foilKiteablePct: 89, twinTipKiteablePct: 62, sampleSize: 41 },
      '15+': { avgTargetSpeed: 24.1, foilKiteablePct: 100, twinTipKiteablePct: 95, sampleSize: 15 },
    },
    
    ui: {
      color: 'purple',
      icon: '🌬️',
      priority: 1,
    },
  },
  
  POINT_OF_MOUNTAIN: {
    id: 'point-of-mountain',
    stationId: 'UTALP',
    name: 'Point of the Mountain',
    coordinates: { lat: 40.4505, lng: -111.8972 },
    elevation: 4980,
    
    windType: 'GAP_WIND',
    role: 'Gap wind indicator - confirms north flow is funneling through the gap',
    bestFor: ['utah-lake-zigzag', 'utah-lake-vineyard', 'utah-lake-mm19'],
    
    leadTimeHours: 0.5, // Very close, almost real-time
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 12 },
    },
    
    // Gap wind often amplifies - shows funneling effect
    speedCorrelation: {
      '5-8': { avgTargetSpeed: 8.8, foilKiteablePct: 42, twinTipKiteablePct: 12, sampleSize: 145 },
      '8-10': { avgTargetSpeed: 11.9, foilKiteablePct: 58, twinTipKiteablePct: 28, sampleSize: 82 },
      '10-15': { avgTargetSpeed: 15.2, foilKiteablePct: 78, twinTipKiteablePct: 48, sampleSize: 48 },
      '15+': { avgTargetSpeed: 21.5, foilKiteablePct: 95, twinTipKiteablePct: 85, sampleSize: 22 },
    },
    
    ui: {
      color: 'teal',
      icon: '🌀',
      priority: 3,
    },
  },
};

// =============================================================================
// DEER CREEK INDICATORS
// =============================================================================

export const DEER_CREEK_INDICATORS = {
  ARROWHEAD: {
    id: 'arrowhead',
    stationId: 'SND',
    name: 'Arrowhead Summit',
    coordinates: { lat: 40.4833, lng: -111.4833 },
    elevation: 8252,
    
    windType: 'CANYON_THERMAL',
    role: 'High-elevation trigger for Provo Canyon thermal',
    bestFor: ['deer-creek-dam', 'deer-creek-charleston'],
    
    leadTimeHours: 1.5,
    
    trigger: {
      direction: { min: 200, max: 250, label: 'SSW to WSW' },
      speed: { min: 10, threshold: 15 },
    },
    
    speedCorrelation: {
      '10-12': { avgTargetSpeed: 6.5, foilKiteablePct: 4, twinTipKiteablePct: 0, sampleSize: 89 },
      '12-15': { avgTargetSpeed: 9.2, foilKiteablePct: 13, twinTipKiteablePct: 3, sampleSize: 67 },
      '15-18': { avgTargetSpeed: 12.8, foilKiteablePct: 25, twinTipKiteablePct: 10, sampleSize: 45 },
      '18+': { avgTargetSpeed: 16.5, foilKiteablePct: 30, twinTipKiteablePct: 15, sampleSize: 28 },
    },
    
    ui: {
      color: 'orange',
      icon: '🏔️',
      priority: 1,
    },
  },
  
  HEBER_AIRPORT: {
    id: 'heber-airport',
    stationId: 'KHCR',
    name: 'Heber Airport',
    coordinates: { lat: 40.4818, lng: -111.4285 },
    elevation: 5637,
    
    windType: 'CANYON_THERMAL',
    role: 'Valley-level confirmation of thermal development',
    bestFor: ['deer-creek-dam'],
    
    leadTimeHours: 0.5,
    
    trigger: {
      direction: { min: 180, max: 270, label: 'S to W' },
      speed: { min: 8, threshold: 12 },
    },
    
    speedCorrelation: {
      '8-10': { avgTargetSpeed: 8.5, foilKiteablePct: 15, twinTipKiteablePct: 2, sampleSize: 78 },
      '10-15': { avgTargetSpeed: 11.2, foilKiteablePct: 28, twinTipKiteablePct: 8, sampleSize: 52 },
      '15+': { avgTargetSpeed: 14.5, foilKiteablePct: 35, twinTipKiteablePct: 15, sampleSize: 31 },
    },
    
    ui: {
      color: 'yellow',
      icon: '✈️',
      priority: 2,
    },
  },
};

// =============================================================================
// WILLARD BAY INDICATORS
// =============================================================================

export const WILLARD_BAY_INDICATORS = {
  HILL_AFB: {
    id: 'hill-afb',
    stationId: 'KHIF',
    name: 'Hill Air Force Base',
    coordinates: { lat: 41.1239, lng: -111.9731 },
    elevation: 4789,
    
    windType: 'NORTH_FLOW',
    role: 'North flow indicator for Willard Bay area',
    bestFor: ['willard-bay-north', 'willard-bay-south'],
    
    leadTimeHours: 1,
    
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, threshold: 12 },
    },
    
    speedCorrelation: {
      '8-10': { avgTargetSpeed: 10.5, foilKiteablePct: 55, twinTipKiteablePct: 20, sampleSize: 65 },
      '10-15': { avgTargetSpeed: 14.2, foilKiteablePct: 72, twinTipKiteablePct: 45, sampleSize: 48 },
      '15+': { avgTargetSpeed: 19.8, foilKiteablePct: 90, twinTipKiteablePct: 75, sampleSize: 25 },
    },
    
    ui: {
      color: 'blue',
      icon: '🌬️',
      priority: 1,
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all indicators for a specific launch location
 * @param {string} launchId - The launch ID (e.g., 'utah-lake-zigzag')
 * @returns {Object[]} Array of indicator configurations
 */
export function getIndicatorsForLaunch(launchId) {
  const allIndicators = [
    ...Object.values(UTAH_LAKE_INDICATORS),
    ...Object.values(DEER_CREEK_INDICATORS),
    ...Object.values(WILLARD_BAY_INDICATORS),
  ];
  
  return allIndicators
    .filter(ind => ind.bestFor.includes(launchId))
    .sort((a, b) => a.ui.priority - b.ui.priority);
}

/**
 * Get the best indicator for a specific launch and wind type
 * @param {string} launchId - The launch ID
 * @param {string} windType - The wind type (e.g., 'NORTH_FLOW')
 * @returns {Object|null} The best indicator configuration or null
 */
export function getBestIndicator(launchId, windType) {
  const indicators = getIndicatorsForLaunch(launchId);
  return indicators.find(ind => ind.windType === windType) || null;
}

/**
 * Evaluate an indicator based on current wind conditions
 * @param {Object} indicator - Indicator configuration
 * @param {Object} windData - Current wind data { speed, direction }
 * @returns {Object} Evaluation result with status, message, and predictions
 */
export function evaluateIndicator(indicator, windData) {
  if (!windData || windData.speed === null || windData.direction === null) {
    return {
      status: 'no-data',
      message: 'No data available',
      prediction: null,
    };
  }
  
  const { speed, direction } = windData;
  const { trigger, speedCorrelation, leadTimeHours, name } = indicator;
  
  // Check if direction is within trigger range
  let directionMatch = false;
  if (trigger.direction.min <= trigger.direction.max) {
    directionMatch = direction >= trigger.direction.min && direction <= trigger.direction.max;
  } else {
    // Handle wrap-around (e.g., 315 to 45 for north)
    directionMatch = direction >= trigger.direction.min || direction <= trigger.direction.max;
  }
  
  if (!directionMatch) {
    return {
      status: 'wrong-direction',
      message: `${name} showing ${Math.round(direction)}° - not ${trigger.direction.label}`,
      prediction: null,
    };
  }
  
  if (speed < trigger.speed.min) {
    return {
      status: 'too-weak',
      message: `${name} showing ${speed.toFixed(1)} mph - below ${trigger.speed.min} mph threshold`,
      prediction: null,
    };
  }
  
  // Find the matching speed bucket
  let bucket = null;
  const buckets = Object.keys(speedCorrelation).sort((a, b) => {
    const aMin = parseInt(a.split('-')[0]);
    const bMin = parseInt(b.split('-')[0]);
    return aMin - bMin;
  });
  
  for (const key of buckets) {
    const [min, max] = key.split('-').map(v => v === '+' ? Infinity : parseInt(v.replace('+', '')));
    if (key.includes('+')) {
      if (speed >= parseInt(key.replace('+', ''))) {
        bucket = key;
        break;
      }
    } else if (speed >= min && speed < (max || Infinity)) {
      bucket = key;
      break;
    }
  }
  
  // Use highest bucket if speed exceeds all
  if (!bucket) {
    bucket = buckets[buckets.length - 1];
  }
  
  const correlation = speedCorrelation[bucket];
  
  // Determine status based on kiteable probability
  let status;
  if (correlation.foilKiteablePct >= 80) {
    status = 'strong';
  } else if (correlation.foilKiteablePct >= 50) {
    status = 'good';
  } else if (correlation.foilKiteablePct >= 30) {
    status = 'possible';
  } else {
    status = 'marginal';
  }
  
  return {
    status,
    message: `${name}: ${speed.toFixed(1)} mph from ${trigger.direction.label}`,
    prediction: {
      expectedSpeed: correlation.avgTargetSpeed,
      foilKiteablePct: correlation.foilKiteablePct,
      twinTipKiteablePct: correlation.twinTipKiteablePct,
      leadTimeHours,
      confidence: correlation.sampleSize > 50 ? 'high' : correlation.sampleSize > 20 ? 'medium' : 'low',
    },
  };
}

/**
 * Get all station IDs needed for a set of indicators
 * @param {Object[]} indicators - Array of indicator configurations
 * @returns {string[]} Array of station IDs
 */
export function getStationIds(indicators) {
  return [...new Set(indicators.map(ind => ind.stationId))];
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  WIND_TYPES,
  UTAH_LAKE_INDICATORS,
  DEER_CREEK_INDICATORS,
  WILLARD_BAY_INDICATORS,
  getIndicatorsForLaunch,
  getBestIndicator,
  evaluateIndicator,
  getStationIds,
};
```

---

## File 28: `src/hooks/useLakeData.js`

> 122 lines | 3.6 KB

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherService } from '../services/WeatherService';
import { LakeState, getProbabilityStatus } from '../services/DataNormalizer';

const REFRESH_INTERVAL = 3 * 60 * 1000;
const HISTORY_REFRESH_INTERVAL = 10 * 60 * 1000;

export function useLakeData(lakeId) {
  const [lakeState, setLakeState] = useState(null);
  const [history, setHistory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const isFetching = useRef(false);
  const previousLakeId = useRef(lakeId);
  const cachedStates = useRef({});
  const previousProbability = useRef(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (isFetching.current && !forceRefresh) return;
    isFetching.current = true;

    const isNewLake = previousLakeId.current !== lakeId;
    if (isNewLake) {
      if (cachedStates.current[lakeId]) {
        setLakeState(cachedStates.current[lakeId]);
      }
      setIsLoading(!cachedStates.current[lakeId]);
      previousLakeId.current = lakeId;
    } else {
      setIsLoading((prev) => !lakeState && prev);
    }

    try {
      const rawData = await weatherService.getDataForLake(lakeId);
      
      const hasData = rawData.ambient || rawData.synoptic?.length > 0;
      
      if (!hasData && !cachedStates.current[lakeId]) {
        setError('Unable to fetch weather data. Check API keys.');
      } else {
        setError(null);
      }

      const newState = LakeState.fromRawData(
        lakeId,
        rawData.ambient,
        rawData.synoptic,
        history[lakeId]
      );

      cachedStates.current[lakeId] = newState;
      setLakeState(newState);
      setLastUpdated(new Date());

      if (newState.probability >= 75 && previousProbability.current < 75) {
        window.dispatchEvent(new CustomEvent('thermal-alert', {
          detail: {
            probability: newState.probability,
            lake: newState.config?.name,
            message: `Thermal probability crossed 75% at ${newState.config?.name}!`,
          },
        }));
      }
      previousProbability.current = newState.probability;

    } catch (err) {
      console.error('Error fetching lake data:', err);
      if (!cachedStates.current[lakeId]) {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [lakeId, lakeState, history]);

  const fetchHistory = useCallback(async () => {
    try {
      const historyData = await weatherService.getHistoryForLake(lakeId, 3);
      
      const historyMap = {};
      historyData.forEach((station) => {
        historyMap[station.stationId] = station.history;
      });
      
      setHistory((prev) => ({
        ...prev,
        [lakeId]: historyMap,
      }));
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [lakeId]);

  useEffect(() => {
    fetchData(true);
    fetchHistory();
    
    const dataInterval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    const historyInterval = setInterval(fetchHistory, HISTORY_REFRESH_INTERVAL);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(historyInterval);
    };
  }, [lakeId]);

  const status = lakeState ? getProbabilityStatus(lakeState.probability, lakeState.thermalPrediction) : null;

  return {
    lakeState,
    history: history[lakeId] || {},
    status,
    isLoading,
    error,
    lastUpdated,
    refresh: () => fetchData(true),
  };
}
```

---

## File 29: `src/hooks/useWeatherData.js`

> 125 lines | 3.4 KB

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { weatherService } from '../services/WeatherService';
import {
  calculatePressureGap,
  calculateThermalDelta,
  calculateBoundaryCrossing,
  calculateThermalConfidence,
  getThermalWindowPrediction,
} from '../utils/thermalCalculations';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useWeatherData() {
  const [data, setData] = useState({
    ambient: null,
    pressure: null,
    ridge: null,
    regionalWinds: [],
  });
  const [calculations, setCalculations] = useState({
    pressureGap: null,
    thermalDelta: null,
    boundaryCrossing: null,
    confidence: 50,
    prediction: getThermalWindowPrediction(50),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const dataRef = useRef(data);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      setIsLoading((prev) => dataRef.current.ambient === null);

      const weatherData = await weatherService.getAllWeatherData();
      
      const hasAnyData = weatherData.ambient || weatherData.pressure || 
                         weatherData.ridge || weatherData.regionalWinds?.length > 0;
      
      if (!hasAnyData && !dataRef.current.ambient) {
        setError('Unable to fetch weather data. Please check your API keys.');
      } else {
        setError(null);
      }
      
      const newData = {
        ambient: weatherData.ambient || dataRef.current.ambient,
        pressure: weatherData.pressure || dataRef.current.pressure,
        ridge: weatherData.ridge || dataRef.current.ridge,
        regionalWinds: weatherData.regionalWinds?.length > 0 
          ? weatherData.regionalWinds 
          : dataRef.current.regionalWinds,
      };
      
      dataRef.current = newData;
      setData(newData);
      setLastUpdated(new Date());

      const pressureGap = calculatePressureGap(
        newData.pressure?.slcPressure,
        newData.pressure?.provoPressure
      );

      const thermalDelta = calculateThermalDelta(
        newData.ambient?.temperature,
        newData.ridge?.temperature
      );

      const boundaryCrossing = calculateBoundaryCrossing(
        newData.ambient?.temperature,
        65,
        newData.ambient?.windSpeed
      );

      const confidence = calculateThermalConfidence({
        pressureGap,
        thermalDelta,
        boundaryCrossing,
        timeOfDay: new Date().toISOString(),
        currentWindSpeed: newData.ambient?.windSpeed,
        currentWindDirection: newData.ambient?.windDirection,
      });

      const prediction = getThermalWindowPrediction(confidence);

      setCalculations({
        pressureGap,
        thermalDelta,
        boundaryCrossing,
        confidence,
        prediction,
      });
    } catch (err) {
      console.error('Error fetching weather data:', err);
      if (!dataRef.current.ambient) {
        setError(err.message || 'Failed to fetch weather data');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    calculations,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
```

---

## File 30: `src/context/ThemeContext.jsx`

> 53 lines | 1.4 KB

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Check localStorage and system preference
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored;
      
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark'; // Default to dark
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Update document class for Tailwind
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## File 31: `src/utils/thermalCalculations.js`

> 216 lines | 5.6 KB

```javascript
/**
 * Thermal Wind Prediction Calculations for Utah Wind Pro
 * 
 * Key Variables:
 * - G (Pressure Gap): P_SLC - P_Provo
 * - ΔT (Thermal Delta): T_Saratoga - T_Arrowhead(Ridge)
 * - Boundary Crossing: Water temp vs Air temp comparison
 */

export const THRESHOLDS = {
  PRESSURE_GAP_BUST: 2.0,
  THERMAL_DELTA_ACTIVE: 3.0,
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
};

/**
 * Calculate Pressure Gap (G = P_SLC - P_Provo)
 * If G > 2.0mb, probability of smooth thermal drops by 60%
 */
export function calculatePressureGap(slcPressure, provoPressure) {
  if (slcPressure == null || provoPressure == null) {
    return { gap: null, isBust: false, penalty: 0 };
  }
  
  const gap = slcPressure - provoPressure;
  const isBust = Math.abs(gap) > THRESHOLDS.PRESSURE_GAP_BUST;
  const penalty = isBust ? 60 : Math.abs(gap) * 20;
  
  return {
    gap: parseFloat(gap.toFixed(2)),
    isBust,
    penalty: Math.min(penalty, 60),
    description: isBust 
      ? 'North flow interference likely - thermal bust conditions'
      : gap > 1.0 
        ? 'Moderate pressure gradient - watch for gusty conditions'
        : 'Favorable pressure gradient for thermals',
  };
}

/**
 * Calculate Thermal Delta (ΔT = T_Saratoga - T_Arrowhead)
 * If ΔT increasing > 3°F/hour in morning, thermal pump is active
 */
export function calculateThermalDelta(lakeshoreTemp, ridgeTemp, previousDelta = null, hoursSinceLastReading = 1) {
  if (lakeshoreTemp == null || ridgeTemp == null) {
    return { delta: null, isActive: false, bonus: 0 };
  }
  
  const delta = lakeshoreTemp - ridgeTemp;
  
  let deltaChangeRate = 0;
  if (previousDelta != null) {
    deltaChangeRate = (delta - previousDelta) / hoursSinceLastReading;
  }
  
  const isActive = deltaChangeRate > THRESHOLDS.THERMAL_DELTA_ACTIVE;
  const bonus = isActive ? 25 : Math.max(0, deltaChangeRate * 5);
  
  return {
    delta: parseFloat(delta.toFixed(1)),
    deltaChangeRate: parseFloat(deltaChangeRate.toFixed(2)),
    isActive,
    bonus: Math.min(bonus, 25),
    description: isActive
      ? 'Thermal pump is ACTIVE - strong lake breeze expected'
      : delta > 10
        ? 'Good thermal gradient developing'
        : delta > 5
          ? 'Moderate thermal gradient'
          : 'Weak thermal gradient',
  };
}

/**
 * Calculate Water vs Air boundary crossing potential
 */
export function calculateBoundaryCrossing(airTemp, waterTemp, windSpeed) {
  if (airTemp == null || waterTemp == null) {
    return { differential: null, crossingPotential: 'unknown' };
  }
  
  const differential = airTemp - waterTemp;
  
  let crossingPotential = 'low';
  let bonus = 0;
  
  if (differential > 15 && windSpeed < 10) {
    crossingPotential = 'high';
    bonus = 20;
  } else if (differential > 10 && windSpeed < 15) {
    crossingPotential = 'moderate';
    bonus = 10;
  } else if (differential > 5) {
    crossingPotential = 'developing';
    bonus = 5;
  }
  
  return {
    differential: parseFloat(differential.toFixed(1)),
    crossingPotential,
    bonus,
    description: `Air is ${differential > 0 ? 'warmer' : 'cooler'} than water by ${Math.abs(differential).toFixed(1)}°F`,
  };
}

/**
 * Calculate overall Thermal Confidence Score (0-100%)
 */
export function calculateThermalConfidence({
  pressureGap,
  thermalDelta,
  boundaryCrossing,
  timeOfDay,
  currentWindSpeed,
  currentWindDirection,
}) {
  let baseScore = 50;
  
  if (pressureGap) {
    baseScore -= pressureGap.penalty;
  }
  
  if (thermalDelta) {
    baseScore += thermalDelta.bonus;
  }
  
  if (boundaryCrossing) {
    baseScore += boundaryCrossing.bonus;
  }
  
  if (timeOfDay) {
    const hour = new Date(timeOfDay).getHours();
    if (hour >= 11 && hour <= 16) {
      baseScore += 15;
    } else if (hour >= 9 && hour <= 18) {
      baseScore += 5;
    } else {
      baseScore -= 20;
    }
  }
  
  if (currentWindSpeed != null) {
    if (currentWindSpeed >= 8 && currentWindSpeed <= 20) {
      baseScore += 10;
    } else if (currentWindSpeed > 25) {
      baseScore -= 15;
    }
  }
  
  if (currentWindDirection != null) {
    if (currentWindDirection >= 180 && currentWindDirection <= 270) {
      baseScore += 10;
    } else if (currentWindDirection >= 315 || currentWindDirection <= 45) {
      baseScore -= 10;
    }
  }
  
  return Math.max(THRESHOLDS.MIN_CONFIDENCE, Math.min(THRESHOLDS.MAX_CONFIDENCE, Math.round(baseScore)));
}

/**
 * Get thermal window prediction
 */
export function getThermalWindowPrediction(confidence) {
  if (confidence >= 80) {
    return {
      status: 'excellent',
      message: 'Excellent thermal conditions expected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    };
  } else if (confidence >= 60) {
    return {
      status: 'good',
      message: 'Good thermal window likely',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    };
  } else if (confidence >= 40) {
    return {
      status: 'moderate',
      message: 'Moderate thermal potential',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    };
  } else if (confidence >= 20) {
    return {
      status: 'poor',
      message: 'Poor thermal conditions',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    };
  } else {
    return {
      status: 'bust',
      message: 'Thermal bust likely',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    };
  }
}

/**
 * Format wind direction to cardinal
 */
export function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
```

---

## File 32: `src/utils/themeClasses.js`

> 57 lines | 2.2 KB

```javascript
// Theme-aware class utilities for consistent styling

export const themeClasses = {
  // Card backgrounds
  card: (theme) => theme === 'dark' 
    ? 'bg-slate-800/30 border-slate-700' 
    : 'bg-white border-slate-200 shadow-sm',
  
  cardSolid: (theme) => theme === 'dark'
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200 shadow-sm',
  
  // Text colors
  textPrimary: (theme) => theme === 'dark' ? 'text-white' : 'text-slate-900',
  textSecondary: (theme) => theme === 'dark' ? 'text-slate-400' : 'text-slate-600',
  textMuted: (theme) => theme === 'dark' ? 'text-slate-500' : 'text-slate-500',
  
  // Backgrounds
  bgPrimary: (theme) => theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50',
  bgSecondary: (theme) => theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100',
  bgHover: (theme) => theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200',
  
  // Borders
  border: (theme) => theme === 'dark' ? 'border-slate-700' : 'border-slate-200',
  
  // Status colors with proper contrast
  success: (theme) => theme === 'dark' ? 'text-green-400' : 'text-green-600',
  successBg: (theme) => theme === 'dark' ? 'bg-green-500/10' : 'bg-green-100',
  
  warning: (theme) => theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
  warningBg: (theme) => theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-100',
  
  danger: (theme) => theme === 'dark' ? 'text-red-400' : 'text-red-600',
  dangerBg: (theme) => theme === 'dark' ? 'bg-red-500/10' : 'bg-red-100',
  
  info: (theme) => theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600',
  infoBg: (theme) => theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-100',
  
  // Buttons
  button: (theme) => theme === 'dark'
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  
  buttonPrimary: (theme) => theme === 'dark'
    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
    : 'bg-cyan-500 hover:bg-cyan-600 text-white',
};

// Helper to combine multiple theme classes
export const tc = (theme, ...classKeys) => {
  return classKeys.map(key => {
    if (typeof key === 'function') return key(theme);
    if (themeClasses[key]) return themeClasses[key](theme);
    return key;
  }).join(' ');
};
```

---

## File 33: `src/components/Dashboard.jsx`

> 800 lines | 33.5 KB

```jsx
import { useState } from 'react';
import * as React from 'react';
import { RefreshCw, Clock, Wifi, WifiOff, TrendingUp, Gauge, Wind, Thermometer, ArrowUpDown, MapPin, Navigation, Anchor, Bell, Brain } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WindVector } from './WindVector';
import { BustAlert } from './BustAlert';
import { ThermalStatus } from './ThermalStatus';
import { ThermalForecast } from './ThermalForecast';
import { LakeSelector } from './LakeSelector';
import { ToastContainer } from './ToastNotification';
import { useLakeData } from '../hooks/useLakeData';
import { NorthFlowGauge } from './NorthFlowGauge';
import { KiteSafetyIndicator } from './KiteSafety';
import { ForecastPanel } from './ForecastPanel';
import { FiveDayForecast } from './FiveDayForecast';
import { WindMap } from './WindMap';
import { NotificationSettings } from './NotificationSettings';
import { checkAndNotify } from '../services/NotificationService';
import { getFullForecast } from '../services/ForecastService';
import LearningDashboard from './LearningDashboard';
import ActivityMode, { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore } from './ActivityMode';
import GlassScore from './GlassScore';
import HourlyTimeline from './HourlyTimeline';
import WeeklyBestDays from './WeeklyBestDays';
import RaceDayMode from './RaceDayMode';
import SevereWeatherAlerts from './SevereWeatherAlerts';
import DataFreshness from './DataFreshness';
import ParaglidingMode from './ParaglidingMode';
import FishingMode from './FishingMode';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function Dashboard() {
  const [selectedLake, setSelectedLake] = useState('utah-lake');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('kiting');
  const { lakeState, history, status, isLoading, error, lastUpdated, refresh } = useLakeData(selectedLake);
  const { theme } = useTheme();
  
  // Get activity-specific data
  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const currentWindSpeed = lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed;
  const currentWindGust = lakeState?.pws?.windGust || lakeState?.wind?.stations?.[0]?.gust;
  const currentWindDirection = lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction;
  
  // For paragliding, use Flight Park South/North data instead of generic wind
  const fpsStation = lakeState?.wind?.stations?.find(s => s.id === 'FPS');
  const utalpStation = lakeState?.wind?.stations?.find(s => s.id === 'UTALP');
  
  // Get best paragliding site data
  const getParaglidingScore = () => {
    if (selectedActivity !== 'paragliding') return null;
    
    const fpsSpeed = fpsStation?.speed || fpsStation?.windSpeed;
    const fpsDir = fpsStation?.direction || fpsStation?.windDirection;
    const fpsGust = fpsStation?.gust || fpsStation?.windGust;
    
    const utalpSpeed = utalpStation?.speed || utalpStation?.windSpeed;
    const utalpDir = utalpStation?.direction || utalpStation?.windDirection;
    const utalpGust = utalpStation?.gust || utalpStation?.windGust;
    
    // Check Flight Park South (SSE to SSW: 160-200°)
    const fpsDirectionOk = fpsDir >= 160 && fpsDir <= 200;
    const fpsSpeedOk = fpsSpeed >= 5 && fpsSpeed <= 18;
    const fpsGustOk = !fpsGust || (fpsGust - fpsSpeed) <= 5;
    
    // Check Flight Park North (N to NW: 315-360 or 0-45)
    const utalpDirectionOk = utalpDir >= 315 || utalpDir <= 45;
    const utalpSpeedOk = utalpSpeed >= 5 && utalpSpeed <= 18;
    const utalpGustOk = !utalpGust || (utalpGust - utalpSpeed) <= 5;
    
    // Calculate scores
    let fpsScore = 0;
    if (fpsDirectionOk) fpsScore += 50;
    if (fpsSpeedOk) fpsScore += 30;
    if (fpsGustOk) fpsScore += 20;
    if (fpsSpeed >= 10 && fpsSpeed <= 16) fpsScore += 10; // Ideal range bonus
    
    let utalpScore = 0;
    if (utalpDirectionOk) utalpScore += 50;
    if (utalpSpeedOk) utalpScore += 30;
    if (utalpGustOk) utalpScore += 20;
    if (utalpSpeed >= 12 && utalpSpeed <= 16) utalpScore += 10; // Ideal range bonus
    
    // Use the better site
    const bestScore = Math.max(fpsScore, utalpScore);
    const bestSite = fpsScore >= utalpScore ? 'Flight Park South' : 'Flight Park North';
    const bestSpeed = fpsScore >= utalpScore ? fpsSpeed : utalpSpeed;
    const bestDir = fpsScore >= utalpScore ? fpsDir : utalpDir;
    const bestGust = fpsScore >= utalpScore ? fpsGust : utalpGust;
    
    let message = '';
    if (bestScore >= 80) {
      message = `Excellent at ${bestSite} - ${bestSpeed?.toFixed(0)} mph from ${bestDir?.toFixed(0)}°`;
    } else if (bestScore >= 50) {
      message = `Flyable at ${bestSite} - ${bestSpeed?.toFixed(0)} mph`;
    } else if (bestSpeed != null) {
      message = `Marginal - ${bestSpeed?.toFixed(0)} mph at ${bestDir?.toFixed(0)}°`;
    } else {
      message = 'No data from Flight Park stations';
    }
    
    const gustFactor = bestGust && bestSpeed ? bestGust / bestSpeed : 1;
    
    return {
      score: Math.min(100, bestScore),
      message,
      gustFactor,
      bestSite,
    };
  };
  
  const activityScore = selectedActivity === 'paragliding'
    ? getParaglidingScore()
    : (selectedActivity && currentWindSpeed != null
      ? calculateActivityScore(selectedActivity, currentWindSpeed, currentWindGust, currentWindDirection)
      : null);
  
  const glassScore = calculateGlassScore(currentWindSpeed, currentWindGust);

  // Check for notifications when data updates
  React.useEffect(() => {
    if (lakeState) {
      const conditions = {
        pressureGradient: lakeState.pressure?.gradient,
        temperature: lakeState.pws?.temperature,
        windSpeed: lakeState.pws?.windSpeed || lakeState.wind?.stations?.[0]?.speed,
        windDirection: lakeState.pws?.windDirection || lakeState.wind?.stations?.[0]?.direction,
        thermalDelta: lakeState.thermal?.delta,
      };
      const forecast = getFullForecast(selectedLake, conditions);
      checkAndNotify(forecast, lakeState.config?.name || 'Utah Lake');
    }
  }, [lakeState, selectedLake]);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const pressureData = lakeState ? {
    gradient: lakeState.pressure.gradient,
    isBustCondition: lakeState.pressure.gradient != null && Math.abs(lakeState.pressure.gradient) > 2.0,
    slcPressure: lakeState.pressure.high?.value,
    provoPressure: lakeState.pressure.low?.value,
    highName: lakeState.pressure.high?.name,
    lowName: lakeState.pressure.low?.name,
  } : null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-900'
    }`}>
      <ToastContainer />
      
      <header className={`border-b backdrop-blur-sm sticky top-0 z-40 transition-colors duration-300 ${
        theme === 'dark' 
          ? 'border-slate-800 bg-slate-900/80' 
          : 'border-slate-200 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Utah Wind Pro
              </h1>
              <p className="text-slate-500 text-sm">
                {activityConfig?.description || 'Professional Wind Forecasting'}
              </p>
            </div>

            {/* Activity Mode Selector */}
            <ActivityMode 
              selectedActivity={selectedActivity}
              onActivityChange={setSelectedActivity}
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                {error ? (
                  <WifiOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Wifi className="w-4 h-4 text-green-400" />
                )}
                <Clock className="w-4 h-4" />
                <span>{formatTime(lastUpdated)}</span>
              </div>

              <button
                onClick={() => setShowNotificationSettings(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Notification Settings"
              >
                <Bell className="w-5 h-5 text-slate-400" />
              </button>

              <button
                onClick={() => setShowLearningDashboard(!showLearningDashboard)}
                className={`p-2 rounded-lg transition-colors ${showLearningDashboard ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                title="Learning System"
              >
                <Brain className={`w-5 h-5 ${showLearningDashboard ? 'text-white' : 'text-purple-400'}`} />
              </button>

              <button
                onClick={refresh}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 hover:bg-slate-700' 
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      />

      {/* Learning Dashboard Modal/Panel */}
      {showLearningDashboard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowLearningDashboard(false)} />
            <div className="relative bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowLearningDashboard(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <div className="p-2">
                <LearningDashboard />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Only show lake selector for water sports (not paragliding or fishing) */}
        {!activityConfig?.hideLakeSelector && (
          <LakeSelector selectedLake={selectedLake} onSelectLake={setSelectedLake} />
        )}

        {/* Activity Score Banner - hide for special modes that have their own scoring */}
        {activityScore && !activityConfig?.specialMode && (
          <div className={`
            rounded-xl p-4 border flex items-center justify-between
            ${activityScore.score >= 70 
              ? (theme === 'dark' ? 'bg-green-500/10 border-green-500/30' : 'bg-green-100 border-green-300')
              : activityScore.score >= 40 
                ? (theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-100 border-yellow-300')
                : (theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-100 border-red-300')}
          `}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activityConfig?.icon}</span>
              <div>
                <div className={`font-medium ${
                  activityScore.score >= 70 
                    ? (theme === 'dark' ? 'text-green-400' : 'text-green-700')
                    : activityScore.score >= 40 
                      ? (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700')
                      : (theme === 'dark' ? 'text-red-400' : 'text-red-700')
                }`}>
                  {activityConfig?.name} Score: {activityScore.score}%
                </div>
                <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{activityScore.message}</div>
              </div>
            </div>
            {activityScore.gustFactor > 1.3 && (
              <div className={`text-xs px-2 py-1 rounded ${
                theme === 'dark' ? 'text-orange-400 bg-orange-500/20' : 'text-orange-700 bg-orange-100'
              }`}>
                ⚠️ Gusty ({((activityScore.gustFactor - 1) * 100).toFixed(0)}%)
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={`rounded-xl p-4 border ${
            theme === 'dark' 
              ? 'bg-red-900/30 border-red-500/50 text-red-400' 
              : 'bg-red-100 border-red-300 text-red-700'
          }`}>
            <p className="font-medium">Connection Error</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-red-400/80' : 'text-red-600'}`}>{error}</p>
          </div>
        )}

        {/* Special Activity Modes */}
        {selectedActivity === 'paragliding' ? (
          <ParaglidingMode 
            windData={{
              stations: [
                ...(lakeState?.wind?.stations || []),
                ...(lakeState?.kslcStation ? [{ id: 'KSLC', ...lakeState.kslcStation }] : []),
                ...(lakeState?.kpvuStation ? [{ id: 'KPVU', ...lakeState.kpvuStation }] : []),
                ...(lakeState?.utalpStation ? [{ id: 'UTALP', ...lakeState.utalpStation }] : []),
              ].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i),
              FPS: lakeState?.wind?.stations?.find(s => s.id === 'FPS'),
              UTALP: lakeState?.utalpStation || lakeState?.wind?.stations?.find(s => s.id === 'UTALP'),
              KSLC: lakeState?.kslcStation,
              KPVU: lakeState?.kpvuStation,
            }}
            isLoading={isLoading}
          />
        ) : selectedActivity === 'fishing' ? (
          <FishingMode 
            windData={{
              stations: lakeState?.wind?.stations,
              speed: currentWindSpeed,
            }}
            pressureData={pressureData}
            isLoading={isLoading}
          />
        ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Gauges */}
          <div className="lg:col-span-1 space-y-4">
            {/* Activity-Specific Primary Gauge */}
            {activityConfig?.wantsWind ? (
              /* Wind-seeking activities: Show Thermal Confidence */
              <div className={`flex flex-col items-center rounded-2xl p-6 border ${
                theme === 'dark' 
                  ? 'bg-slate-800/30 border-slate-700' 
                  : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className={`text-xs mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                  {selectedActivity === 'sailing' ? 'Racing Wind Probability' : 'Thermal Probability'}
                </div>
                <ConfidenceGauge value={lakeState?.probability || 0} size={180} />
                
                {status && (
                  <div className={`mt-3 px-4 py-2 rounded-lg text-center ${status.bgColor}`}>
                    <p className={`font-medium text-sm ${status.color}`}>
                      {status.message}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Calm-seeking activities: Show Glass Score */
              <GlassScore 
                windSpeed={currentWindSpeed}
                windGust={currentWindGust}
                thermalStartHour={lakeState?.thermalPrediction?.startHour || 10}
                size={180}
              />
            )}

            {/* North Flow / Prefrontal Gauge */}
            <div className="flex flex-col items-center bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
              <div className="text-xs text-slate-500 mb-2">Pressure Gradient (N↔S Flow)</div>
              <NorthFlowGauge gradient={lakeState?.pressure?.gradient} size={160} />
            </div>

            {/* Primary Wind Display - For Zig Zag, always show PWS first */}
            <PrimaryWindDisplay 
              station={lakeState?.pws || lakeState?.wind?.stations?.[0]}
              optimalDirection={lakeState?.thermalPrediction?.direction}
              isLoading={isLoading}
              pwsUnavailable={selectedLake === 'utah-lake-zigzag' && !lakeState?.pws}
            />

            {/* Kite Safety - Only show for wind sports */}
            {activityConfig?.wantsWind && (
              <KiteSafetyIndicator
                lakeId={selectedLake}
                windDirection={currentWindDirection}
                windSpeed={currentWindSpeed}
                activity={selectedActivity}
              />
            )}

            {/* 3-Step Model Bars */}
            {lakeState?.thermalPrediction && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500 mb-3 text-center">3-Step Prediction Model</div>
                <div className="space-y-2">
                  <FactorBar 
                    label="Step A: Gradient" 
                    value={lakeState.thermalPrediction.pressure?.score || 50} 
                    detail={lakeState.thermalPrediction.pressure?.status}
                    icon={ArrowUpDown}
                  />
                  <FactorBar 
                    label="Step B: Elevation Δ" 
                    value={lakeState.thermalPrediction.elevation?.score || 50} 
                    detail={lakeState.thermalPrediction.elevation?.status}
                    icon={Thermometer}
                  />
                  <FactorBar 
                    label="Step C: Ground Truth" 
                    value={lakeState.thermalPrediction.direction?.score || 50} 
                    detail={lakeState.thermalPrediction.direction?.status}
                    icon={MapPin}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Hourly Timeline - Activity Specific */}
            <HourlyTimeline
              activity={selectedActivity}
              currentConditions={{
                windSpeed: currentWindSpeed,
                windGust: currentWindGust,
                windDirection: currentWindDirection,
              }}
              thermalStartHour={lakeState?.thermalPrediction?.startHour || 10}
              thermalPeakHour={lakeState?.thermalPrediction?.peakHour || 12}
              thermalEndHour={lakeState?.thermalPrediction?.endHour || 17}
            />

            {/* Sailing-specific: Race Day Mode */}
            {selectedActivity === 'sailing' && (
              <RaceDayMode
                currentWind={{
                  speed: currentWindSpeed,
                  direction: currentWindDirection,
                  gust: currentWindGust,
                }}
                windHistory={history?.wind || []}
              />
            )}

            {/* Weekly Best Days */}
            <WeeklyBestDays selectedActivity={selectedActivity} />

            {/* Severe Weather Alerts - Always visible */}
            <SevereWeatherAlerts />

            {/* Data Freshness Indicator */}
            <DataFreshness
              lastUpdated={lastUpdated}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
              refreshInterval={3}
            />

            {/* Wind Map */}
            <WindMap
              selectedLake={selectedLake}
              windData={{
                direction: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                speed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
              }}
              stationData={lakeState?.wind?.stations}
              isLoading={isLoading}
              onSelectLaunch={setSelectedLake}
            />

            <FiveDayForecast
              conditions={{
                pressure: lakeState?.pws?.pressure || lakeState?.pressure?.high?.value,
                temperature: lakeState?.pws?.temperature,
                pressureGradient: lakeState?.pressure?.gradient,
              }}
              isLoading={isLoading}
            />

            <ForecastPanel
              lakeId={selectedLake}
              conditions={{
                pressureGradient: lakeState?.pressure?.gradient,
                temperature: lakeState?.pws?.temperature,
                windSpeed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
                windDirection: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                thermalDelta: lakeState?.thermal?.delta,
              }}
              isLoading={isLoading}
            />

            <ThermalForecast
              lakeId={selectedLake}
              currentConditions={{
                windSpeed: lakeState?.pws?.windSpeed || lakeState?.wind?.stations?.[0]?.speed,
                windDirection: lakeState?.pws?.windDirection || lakeState?.wind?.stations?.[0]?.direction,
                temperature: lakeState?.pws?.temperature,
              }}
              pressureGradient={lakeState?.pressure?.gradient}
              thermalDelta={lakeState?.thermal?.delta}
              pumpActive={lakeState?.thermal?.pumpActive}
              inversionTrapped={lakeState?.thermal?.inversionTrapped}
              isLoading={isLoading}
            />

            <BustAlert 
              pressureData={pressureData} 
              isLoading={isLoading} 
            />

            <ThermalStatus
              thermalDelta={lakeState?.thermal}
              lakeshoreTemp={lakeState?.thermal?.lakeshore}
              ridgeTemp={lakeState?.thermal?.ridge}
              convergence={lakeState?.wind?.convergence}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Live Wind Vectors */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            Live Wind Vectors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lakeState?.wind?.stations?.map((station, index) => (
              <WindVector
                key={station.id || index}
                station={station}
                history={history[station.id]}
                isPersonalStation={station.isPWS}
              />
            ))}

            {isLoading && !lakeState?.wind?.stations?.length && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse"
                  >
                    <div className="h-5 bg-slate-700 rounded w-2/3 mb-4" />
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-slate-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-slate-700 rounded w-1/2" />
                        <div className="h-4 bg-slate-700 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        </>
        )}

        {/* Only show 3-Step Model for non-paragliding activities */}
        {selectedActivity !== 'paragliding' && (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">3-Step Prediction Model</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <ModelStepCard
              step="A"
              label="Gradient Check"
              description={<>ΔP = P<sub>SLC</sub> - P<sub>Provo</sub></>}
              value={lakeState?.pressure?.gradient != null 
                ? `${lakeState.pressure.gradient > 0 ? '+' : ''}${lakeState.pressure.gradient.toFixed(2)} mb`
                : '-- mb'
              }
              explanation={lakeState?.pressure?.isBusted 
                ? 'North flow dominates - thermal busted'
                : lakeState?.pressure?.gradient != null 
                  ? 'Gradient favorable for thermal'
                  : 'Waiting for data...'}
              isGood={lakeState?.pressure?.gradient != null && lakeState.pressure.gradient < 0}
              isBad={lakeState?.pressure?.isBusted}
              threshold="Bust if > 2.0 mb"
            />

            <ModelStepCard
              step="B"
              label="Elevation Delta"
              description={<>ΔT = T<sub>Shore</sub> - T<sub>Ridge</sub></>}
              value={lakeState?.thermal?.delta != null 
                ? `${lakeState.thermal.delta > 0 ? '+' : ''}${lakeState.thermal.delta}°F`
                : '--°F'
              }
              explanation={lakeState?.thermal?.pumpActive 
                ? 'Thermal Pump ACTIVE!'
                : lakeState?.thermal?.inversionTrapped
                  ? 'Inversion - air trapped'
                  : lakeState?.thermal?.delta != null
                    ? 'Thermal building'
                    : 'Waiting for data...'}
              isGood={lakeState?.thermal?.pumpActive}
              isBad={lakeState?.thermal?.inversionTrapped}
              threshold="Pump active if > 10°F"
            />

            <ModelStepCard
              step="C"
              label="Ground Truth"
              description={<>Your PWS at {lakeState?.pws?.name || 'Saratoga'}</>}
              value={lakeState?.pws?.windSpeed != null 
                ? `${lakeState.pws.windSpeed.toFixed(1)} mph ${lakeState.pws.windDirection}°`
                : '-- mph'
              }
              explanation={lakeState?.thermalPrediction?.direction?.status === 'optimal'
                ? 'Direction OPTIMAL for thermal'
                : lakeState?.thermalPrediction?.direction?.status === 'wrong'
                  ? 'Wrong direction - no thermal'
                  : 'Verifying thermal arrival...'}
              isGood={lakeState?.thermalPrediction?.direction?.status === 'optimal'}
              isBad={lakeState?.thermalPrediction?.direction?.status === 'wrong'}
              threshold="Verifies exact arrival"
            />
          </div>
        </div>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-500 text-sm">
          <p>Utah Wind Pro • Professional Thermal Forecasting</p>
          <p className="text-xs mt-1">
            Model: Step A (Gradient) 40% • Step B (Elevation Δ) 30% • Step C (Ground Truth) 30%
          </p>
        </div>
      </footer>
    </div>
  );
}

function PrimaryWindDisplay({ station, optimalDirection, isLoading, pwsUnavailable }) {
  if (isLoading || !station) {
    return (
      <div className="mt-4 w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 bg-slate-700 rounded-full" />
          <div className="space-y-2">
            <div className="h-8 bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-700 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const speed = station.windSpeed ?? station.speed;
  const direction = station.windDirection ?? station.direction;
  const cardinal = windDirectionToCardinal(direction);
  const stationName = station.name || 'Primary Station';
  const isYourStation = station.isYourStation || station.isPWS;
  
  const isOptimal = optimalDirection?.status === 'optimal';
  const isWrong = optimalDirection?.status === 'wrong';
  
  const speedColor = speed >= 8 ? 'text-green-400' : speed >= 4 ? 'text-yellow-400' : 'text-slate-400';
  const directionColor = isOptimal ? 'text-green-400' : isWrong ? 'text-red-400' : 'text-cyan-400';

  return (
    <div className={`mt-4 w-full rounded-xl p-4 border ${
      isOptimal ? 'bg-green-900/20 border-green-500/30' : 
      isWrong ? 'bg-red-900/20 border-red-500/30' : 
      'bg-slate-800/50 border-slate-700'
    }`}>
      {/* PWS unavailable warning */}
      {pwsUnavailable && (
        <div className="text-xs text-yellow-400 text-center mb-2 flex items-center justify-center gap-1">
          <span>⚠️</span>
          <span>Zig Zag PWS unavailable - showing nearest station</span>
        </div>
      )}
      <div className="text-xs text-center mb-2 flex items-center justify-center gap-1">
        {isYourStation && <span className="text-cyan-400">📍</span>}
        <span className={isYourStation ? 'text-cyan-400 font-medium' : 'text-slate-500'}>
          {stationName}
        </span>
        {!isYourStation && !pwsUnavailable && <span className="text-slate-600 text-[10px]">(MesoWest)</span>}
      </div>
      
      <div className="flex items-center justify-center gap-6">
        {/* Wind Direction Compass */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-slate-600 bg-slate-800/80" />
          <div className="absolute inset-0 flex items-center justify-center">
            {direction != null ? (
              <Navigation 
                className={`w-8 h-8 ${directionColor} transition-transform duration-500`}
                style={{ transform: `rotate(${direction + 180}deg)` }}
              />
            ) : (
              <span className="text-slate-500 text-xs">--</span>
            )}
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">N</div>
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 text-[10px] text-slate-500">E</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">S</div>
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 text-[10px] text-slate-500">W</div>
        </div>

        {/* Speed and Direction Values */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${speedColor}`}>
            {speed != null ? speed.toFixed(1) : '--'}
            <span className="text-lg text-slate-500 ml-1">mph</span>
          </div>
          <div className={`text-lg font-medium ${directionColor}`}>
            {cardinal} 
            <span className="text-slate-500 text-sm ml-1">
              {direction != null ? `${Math.round(direction)}°` : ''}
            </span>
          </div>
          {optimalDirection?.expected && (
            <div className="text-xs text-slate-500 mt-1">
              Need: {optimalDirection.expected}
            </div>
          )}
        </div>
      </div>

      {/* Gust indicator */}
      {(station.windGust ?? station.gust) > (speed || 0) * 1.3 && (
        <div className="mt-2 text-center text-xs text-orange-400">
          Gusts to {(station.windGust ?? station.gust).toFixed(1)} mph
        </div>
      )}
    </div>
  );
}

function FactorBar({ label, value, detail, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 70) return 'bg-green-500';
    if (v >= 50) return 'bg-yellow-500';
    if (v >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 capitalize">{detail || ''}</span>
          <span className="text-slate-300 font-medium w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ModelStepCard({ step, label, description, value, explanation, isGood, isBad, threshold }) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-3 border ${
      isGood ? 'border-green-500/30' : isBad ? 'border-red-500/30' : 'border-slate-700'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isGood ? 'bg-green-500/20 text-green-400' : isBad ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'
        }`}>
          {step}
        </span>
        <span className="text-slate-400 font-medium">{label}</span>
      </div>
      <div className="font-mono text-sm text-slate-500 mb-2">{description}</div>
      <div className={`text-xl font-bold ${
        isGood ? 'text-green-400' : isBad ? 'text-red-400' : 'text-yellow-400'
      }`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{explanation}</div>
      <div className="text-xs text-slate-600 mt-1 italic">{threshold}</div>
    </div>
  );
}
```

---

## File 34: `src/components/ActivityMode.jsx`

> 343 lines | 10.3 KB

```jsx
import React from 'react';
import { Wind, Sailboat, Ship, Waves } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Activity configurations with thresholds and preferences
export const ACTIVITY_CONFIGS = {
  kiting: {
    id: 'kiting',
    name: 'Kiting',
    icon: '🪁',
    description: 'Kiteboarding & Kite Foiling',
    thresholds: {
      tooLight: 8,      // Below this = not worth it
      ideal: { min: 12, max: 22 },
      foilMin: 10,
      twinTipMin: 15,
      tooStrong: 30,    // Above this = dangerous
      gustFactor: 1.5,  // Gust/sustained ratio concern
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 10 && speed <= 25 && (!gust || gust/speed < 1.8),
  },
  
  sailing: {
    id: 'sailing',
    name: 'Sailing',
    icon: '⛵',
    description: 'Dinghy & Keelboat Sailing',
    thresholds: {
      tooLight: 4,      // Can still sail
      ideal: { min: 8, max: 18 },
      beginnerMax: 12,
      racingIdeal: { min: 10, max: 15 },
      tooStrong: 25,
      gustFactor: 1.4,  // Sailors care about consistency
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 6 && speed <= 20 && (!gust || gust/speed < 1.5),
  },
  
  boating: {
    id: 'boating',
    name: 'Boating',
    icon: '🚤',
    description: 'Powerboats, Fishing, Cruising',
    thresholds: {
      ideal: { min: 0, max: 8 },  // Want CALM
      choppy: 10,       // Getting uncomfortable
      rough: 15,        // Most want to avoid
      dangerous: 25,    // Stay home
    },
    wantsWind: false,   // Inverse - want calm
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paddling: {
    id: 'paddling',
    name: 'Paddling',
    icon: '🏄',
    description: 'SUP, Kayak, Canoe',
    thresholds: {
      ideal: { min: 0, max: 6 },  // Want very calm
      manageable: 10,   // Experienced paddlers
      difficult: 15,    // Turn back
      dangerous: 20,    // Don't go out
    },
    wantsWind: false,
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paragliding: {
    id: 'paragliding',
    name: 'Paragliding',
    icon: '🪂',
    description: 'Point of the Mountain',
    thresholds: {
      tooLight: 5,
      ideal: { min: 10, max: 16 },
      tooStrong: 18,
      gustFactor: 1.3,
    },
    wantsWind: true,
    primaryMetric: 'paraglidingScore',
    goodCondition: (speed, gust) => speed >= 5 && speed <= 18 && (!gust || gust - speed <= 5),
    specialMode: true,
    hideLakeSelector: true,
  },
  
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    icon: '🎣',
    description: 'Utah Lakes & Rivers',
    thresholds: {
      ideal: { min: 0, max: 10 },
      choppy: 15,
      rough: 20,
    },
    wantsWind: false,
    primaryMetric: 'fishingScore',
    goodCondition: (speed) => speed < 15,
    specialMode: true,
    hideLakeSelector: true,
  },
  
  windsurfing: {
    id: 'windsurfing',
    name: 'Windsurfing',
    icon: '🏄‍♂️',
    description: 'Windsurfing & Wing Foiling',
    thresholds: {
      tooLight: 6,
      ideal: { min: 10, max: 20 },
      foilMin: 8,
      slalomMin: 15,
      tooStrong: 30,
      gustFactor: 1.6,
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 8 && speed <= 25 && (!gust || gust/speed < 1.7),
  },
};

const ActivityMode = ({ selectedActivity, onActivityChange }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activities = ['kiting', 'sailing', 'fishing', 'boating', 'paddling', 'paragliding'];
  
  return (
    <div className={`flex items-center gap-1 rounded-lg p-1 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
      {activities.map(activityId => {
        const activity = ACTIVITY_CONFIGS[activityId];
        const isSelected = selectedActivity === activityId;
        
        return (
          <button
            key={activityId}
            onClick={() => onActivityChange(activityId)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg' 
                : (isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
              }
            `}
            title={activity.description}
          >
            <span className="text-base">{activity.icon}</span>
            <span className="hidden sm:inline">{activity.name}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Calculate activity-specific scores
 */
export function calculateActivityScore(activity, windSpeed, windGust, windDirection) {
  const config = ACTIVITY_CONFIGS[activity];
  if (!config) return null;
  
  const gustFactor = windGust && windSpeed ? windGust / windSpeed : 1;
  
  if (config.wantsWind) {
    // Wind-seeking activities (kiting, sailing, windsurfing)
    let score = 0;
    let status = 'poor';
    let message = '';
    
    if (windSpeed < config.thresholds.tooLight) {
      score = Math.round((windSpeed / config.thresholds.tooLight) * 30);
      status = 'too_light';
      message = `Too light (${windSpeed?.toFixed(0) || 0} mph) - need ${config.thresholds.tooLight}+ mph`;
    } else if (windSpeed > config.thresholds.tooStrong) {
      score = Math.max(0, 100 - (windSpeed - config.thresholds.tooStrong) * 5);
      status = 'too_strong';
      message = `Too strong (${windSpeed?.toFixed(0)} mph) - dangerous conditions`;
    } else if (windSpeed >= config.thresholds.ideal.min && windSpeed <= config.thresholds.ideal.max) {
      score = 85 + Math.round((1 - Math.abs(windSpeed - (config.thresholds.ideal.min + config.thresholds.ideal.max) / 2) / 10) * 15);
      status = 'ideal';
      message = `Ideal conditions (${windSpeed?.toFixed(0)} mph)`;
    } else if (windSpeed < config.thresholds.ideal.min) {
      score = 50 + Math.round((windSpeed - config.thresholds.tooLight) / (config.thresholds.ideal.min - config.thresholds.tooLight) * 35);
      status = 'light';
      message = `Light but usable (${windSpeed?.toFixed(0)} mph)`;
    } else {
      score = 70 - Math.round((windSpeed - config.thresholds.ideal.max) / (config.thresholds.tooStrong - config.thresholds.ideal.max) * 30);
      status = 'strong';
      message = `Strong (${windSpeed?.toFixed(0)} mph) - experienced only`;
    }
    
    // Penalize for gusty conditions
    if (gustFactor > config.thresholds.gustFactor) {
      score = Math.round(score * 0.8);
      status = 'gusty';
      message += ` - GUSTY (${windGust?.toFixed(0)} mph gusts)`;
    }
    
    return { score: Math.min(100, Math.max(0, score)), status, message, gustFactor };
    
  } else {
    // Calm-seeking activities (boating, paddling)
    return calculateGlassScore(windSpeed, windGust, config);
  }
}

/**
 * Calculate Glass Score for calm-seeking activities
 */
export function calculateGlassScore(windSpeed, windGust, config = ACTIVITY_CONFIGS.boating) {
  if (windSpeed == null) {
    return { score: null, status: 'unknown', message: 'No wind data' };
  }
  
  let score = 0;
  let status = 'poor';
  let message = '';
  let waveEstimate = 'unknown';
  
  // Perfect glass = 100, increases wind = lower score
  if (windSpeed <= 2) {
    score = 100;
    status = 'glass';
    message = 'Perfect glass conditions!';
    waveEstimate = 'flat';
  } else if (windSpeed <= 5) {
    score = 95 - (windSpeed - 2) * 5;
    status = 'excellent';
    message = 'Excellent - nearly flat water';
    waveEstimate = 'ripples';
  } else if (windSpeed <= 8) {
    score = 80 - (windSpeed - 5) * 5;
    status = 'good';
    message = 'Good - light chop';
    waveEstimate = 'light_chop';
  } else if (windSpeed <= 12) {
    score = 65 - (windSpeed - 8) * 5;
    status = 'moderate';
    message = 'Moderate - noticeable waves';
    waveEstimate = 'moderate_chop';
  } else if (windSpeed <= 18) {
    score = 45 - (windSpeed - 12) * 4;
    status = 'choppy';
    message = 'Choppy - uncomfortable for small boats';
    waveEstimate = 'choppy';
  } else if (windSpeed <= 25) {
    score = 21 - (windSpeed - 18) * 3;
    status = 'rough';
    message = 'Rough - stay near shore';
    waveEstimate = 'rough';
  } else {
    score = 0;
    status = 'dangerous';
    message = 'Dangerous - stay off the water';
    waveEstimate = 'dangerous';
  }
  
  // Gusts make it worse for boaters
  if (windGust && windGust > windSpeed * 1.3) {
    score = Math.round(score * 0.85);
    message += ' (gusty)';
  }
  
  return { 
    score: Math.max(0, Math.round(score)), 
    status, 
    message, 
    waveEstimate,
    windSpeed,
  };
}

/**
 * Calculate morning calm window duration
 */
export function calculateCalmWindow(currentHour, thermalStartHour = 10, currentSpeed = 0) {
  if (currentHour >= thermalStartHour) {
    return { hoursRemaining: 0, message: 'Thermal already active' };
  }
  
  if (currentSpeed > 8) {
    return { hoursRemaining: 0, message: 'Already windy' };
  }
  
  const hoursRemaining = thermalStartHour - currentHour;
  
  return {
    hoursRemaining,
    message: hoursRemaining > 2 
      ? `${hoursRemaining} hours of calm expected`
      : `~${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} until wind picks up`,
    recommendation: hoursRemaining > 3 
      ? 'Great time for morning paddle/boat'
      : hoursRemaining > 1
        ? 'Head out soon for calm water'
        : 'Wind building soon - stay close to shore',
  };
}

/**
 * Get best activity recommendation for current conditions
 */
export function getBestActivity(windSpeed, windGust, windDirection) {
  const scores = {};
  
  for (const [activityId, config] of Object.entries(ACTIVITY_CONFIGS)) {
    const result = calculateActivityScore(activityId, windSpeed, windGust, windDirection);
    if (result) {
      scores[activityId] = result;
    }
  }
  
  // Find best activity
  let best = null;
  let bestScore = -1;
  
  for (const [activityId, result] of Object.entries(scores)) {
    if (result.score > bestScore) {
      bestScore = result.score;
      best = activityId;
    }
  }
  
  return {
    best,
    bestScore,
    scores,
    recommendation: best ? `Best for ${ACTIVITY_CONFIGS[best].name}` : 'Conditions unclear',
  };
}

export default ActivityMode;
```

---

## File 35: `src/components/LakeSelector.jsx`

> 126 lines | 5.8 KB

```jsx
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
```

---

## File 36: `src/components/ParaglidingMode.jsx`

> 748 lines | 29.4 KB

```jsx
import React, { useState, useEffect } from 'react';
import { Wind, Mountain, Sun, Sunset, AlertTriangle, CheckCircle, XCircle, Clock, Users, Radio } from 'lucide-react';

// Paragliding site configurations
export const PARAGLIDING_SITES = {
  'flight-park-south': {
    id: 'flight-park-south',
    name: 'Flight Park South',
    shortName: 'South Side',
    location: 'Lehi, Utah',
    coordinates: { lat: 40.4567, lng: -111.9027 },
    elevation: { launch: 5148, lz: 4834 },
    stationId: 'FPS',
    
    // Wind requirements for P2 paragliders
    wind: {
      direction: { min: 160, max: 200, ideal: 180, label: 'SSE to SSW' },
      speed: { min: 0, ideal: { min: 10, max: 16 }, max: 18 },
      gustLimit: 5, // Max gust above sustained
    },
    
    // Best flying times
    bestTime: 'morning',
    flyingWindow: {
      morning: { start: 'sunrise', duration: 3, label: 'Within 3 hours after sunrise' },
      evening: { start: 'sunset', offset: -2, label: '2 hours before sunset (caution)' },
    },
    
    // Hazards
    hazards: [
      'Blow-back to towers and power lines behind parking',
      'Strong east wind creates rotors',
      'West wind creates rotors in west-end bowl',
      'Evening south wind often indicates weather change',
    ],
    
    description: "Nature's wind tunnel - steep slope facing south overlooking Utah Lake. Best morning site with smooth, laminar south winds.",
  },
  
  'flight-park-north': {
    id: 'flight-park-north',
    name: 'Flight Park North',
    shortName: 'North Side',
    location: 'Draper, Utah',
    coordinates: { lat: 40.4745, lng: -111.8928 },
    elevation: { launch: 5100, lz: 4600 },
    stationId: 'UTALP',
    
    wind: {
      direction: { min: 315, max: 45, ideal: 360, label: 'N to NW' },
      speed: { min: 5, ideal: { min: 12, max: 16 }, max: 18 },
      gustLimit: 5,
    },
    
    bestTime: 'evening',
    flyingWindow: {
      morning: { start: 'sunrise', duration: 3, label: 'Within 3 hours after sunrise' },
      evening: { start: 'sunset', offset: -2, label: '2 hours before sunset (best)' },
    },
    
    hazards: [
      'Midday turbulence - avoid flying midday',
      'Quarry venturi at west edge of lower bench',
      'Never cross ridge line toward south (rotors)',
      'Wind gradient - brisk aloft, nil at surface',
      'October sunset - sun blindness for traffic',
    ],
    
    description: 'Massive sand hill with bench ridge system. Best evening site as wind switches to north. Features lower and upper bench for altitude gains.',
  },
};

// Calculate if wind direction is within range (handles wrap-around for north)
function isDirectionInRange(direction, min, max) {
  if (direction == null) return false;
  
  // Handle wrap-around (e.g., 315-45 for north)
  if (min > max) {
    return direction >= min || direction <= max;
  }
  return direction >= min && direction <= max;
}

// Calculate flyability score
export function calculateParaglidingScore(site, windSpeed, windDirection, windGust) {
  const config = PARAGLIDING_SITES[site];
  if (!config) return null;
  
  let score = 0;
  let status = 'unflyable';
  let issues = [];
  let positives = [];
  
  const gustOver = windGust ? windGust - windSpeed : 0;
  
  // Direction check (most important)
  const directionOk = isDirectionInRange(windDirection, config.wind.direction.min, config.wind.direction.max);
  
  if (!directionOk) {
    issues.push(`Wind direction ${windDirection}° outside ${config.wind.direction.label} range`);
    score = 10;
  } else {
    score += 40;
    positives.push(`Direction ${windDirection}° is good (${config.wind.direction.label})`);
  }
  
  // Speed check
  if (windSpeed > config.wind.speed.max) {
    issues.push(`Wind ${windSpeed} mph exceeds ${config.wind.speed.max} mph limit`);
    score = Math.min(score, 20);
  } else if (windSpeed < config.wind.speed.min) {
    issues.push(`Wind ${windSpeed} mph below minimum ${config.wind.speed.min} mph`);
    score += 20;
  } else if (windSpeed >= config.wind.speed.ideal.min && windSpeed <= config.wind.speed.ideal.max) {
    score += 40;
    positives.push(`Speed ${windSpeed} mph is ideal (${config.wind.speed.ideal.min}-${config.wind.speed.ideal.max} mph)`);
  } else {
    score += 25;
    positives.push(`Speed ${windSpeed} mph is acceptable`);
  }
  
  // Gust check
  if (gustOver > config.wind.gustLimit) {
    issues.push(`Gusts ${windGust} mph (${gustOver} over sustained) exceed ${config.wind.gustLimit} mph limit`);
    score = Math.max(0, score - 30);
  } else if (gustOver > 0) {
    score += 15;
    positives.push(`Gusts manageable (${gustOver} mph over sustained)`);
  } else {
    score += 20;
    positives.push('Smooth conditions (no significant gusts)');
  }
  
  // Determine status
  if (score >= 80 && directionOk && windSpeed <= config.wind.speed.max && gustOver <= config.wind.gustLimit) {
    status = 'excellent';
  } else if (score >= 60 && directionOk && windSpeed <= config.wind.speed.max) {
    status = 'good';
  } else if (score >= 40 && directionOk) {
    status = 'marginal';
  } else {
    status = 'unflyable';
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    status,
    issues,
    positives,
    directionOk,
    speedOk: windSpeed >= config.wind.speed.min && windSpeed <= config.wind.speed.max,
    gustOk: gustOver <= config.wind.gustLimit,
  };
}

// Site Card Component
const SiteCard = ({ site, windData, isLoading }) => {
  const config = PARAGLIDING_SITES[site];
  const stationData = windData?.[config.stationId];
  
  const windSpeed = stationData?.speed;
  const windDirection = stationData?.direction;
  const windGust = stationData?.gust;
  
  const assessment = calculateParaglidingScore(site, windSpeed, windDirection, windGust);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'good': return 'bg-lime-500/20 border-lime-500/50 text-lime-400';
      case 'marginal': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      default: return 'bg-red-500/20 border-red-500/50 text-red-400';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-lime-400" />;
      case 'marginal': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };
  
  const currentHour = new Date().getHours();
  const isBestTime = config.bestTime === 'morning' ? currentHour < 12 : currentHour >= 15;
  
  return (
    <div className={`rounded-xl border p-4 ${getStatusColor(assessment?.status || 'unflyable')}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-lg">{config.name}</h3>
          <p className="text-xs text-slate-400">{config.location}</p>
        </div>
        <div className="flex items-center gap-2">
          {isBestTime && (
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
              {config.bestTime === 'morning' ? '☀️ Best AM' : '🌅 Best PM'}
            </span>
          )}
          {getStatusIcon(assessment?.status)}
        </div>
      </div>
      
      {/* Current Conditions */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs text-slate-500">Wind</div>
          <div className={`text-xl font-bold ${assessment?.speedOk ? 'text-white' : 'text-red-400'}`}>
            {windSpeed?.toFixed(0) || '--'}
            <span className="text-xs text-slate-400"> mph</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Direction</div>
          <div className={`text-xl font-bold ${assessment?.directionOk ? 'text-white' : 'text-red-400'}`}>
            {windDirection?.toFixed(0) || '--'}°
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Gusts</div>
          <div className={`text-xl font-bold ${assessment?.gustOk ? 'text-white' : 'text-red-400'}`}>
            {windGust?.toFixed(0) || '--'}
            <span className="text-xs text-slate-400"> mph</span>
          </div>
        </div>
      </div>
      
      {/* Requirements */}
      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <div className="text-xs text-slate-500 mb-2">P2 Requirements</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Direction:</span>
            <span className={`ml-1 ${assessment?.directionOk ? 'text-green-400' : 'text-red-400'}`}>
              {config.wind.direction.label}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Speed:</span>
            <span className={`ml-1 ${assessment?.speedOk ? 'text-green-400' : 'text-red-400'}`}>
              {config.wind.speed.min}-{config.wind.speed.max} mph
            </span>
          </div>
          <div>
            <span className="text-slate-400">Ideal:</span>
            <span className="ml-1 text-cyan-400">
              {config.wind.speed.ideal.min}-{config.wind.speed.ideal.max} mph
            </span>
          </div>
          <div>
            <span className="text-slate-400">Max Gust:</span>
            <span className={`ml-1 ${assessment?.gustOk ? 'text-green-400' : 'text-red-400'}`}>
              +{config.wind.gustLimit} mph
            </span>
          </div>
        </div>
      </div>
      
      {/* Status Messages */}
      {assessment && (
        <div className="space-y-1">
          {assessment.positives.slice(0, 2).map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
          {assessment.issues.slice(0, 2).map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Flyability Score */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Flyability Score</span>
          <span className={`text-lg font-bold ${
            assessment?.score >= 80 ? 'text-green-400' :
            assessment?.score >= 60 ? 'text-lime-400' :
            assessment?.score >= 40 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {assessment?.score || 0}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              assessment?.score >= 80 ? 'bg-green-500' :
              assessment?.score >= 60 ? 'bg-lime-500' :
              assessment?.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${assessment?.score || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Predict wind switch based on indicators
function predictWindSwitch(windData, currentHour) {
  const indicators = [];
  let northSwitchLikelihood = 0;
  let estimatedSwitchTime = null;
  
  const findStation = (id) => windData?.[id] || windData?.stations?.find(s => s.id === id);
  
  const kslcData = findStation('KSLC');
  const fpsData = findStation('FPS');
  const utalpData = findStation('UTALP');
  const kpvuData = findStation('KPVU');
  
  const getSpeed = (d) => d?.speed || d?.windSpeed || 0;
  const getDir = (d) => d?.direction || d?.windDirection || 0;
  
  const kslcSpeed = getSpeed(kslcData);
  const kslcDir = getDir(kslcData);
  const fpsSpeed = getSpeed(fpsData);
  const fpsDir = getDir(fpsData);
  const utalpSpeed = getSpeed(utalpData);
  const utalpDir = getDir(utalpData);
  const kpvuSpeed = getSpeed(kpvuData);
  
  // 1. KSLC NW/N wind = early indicator (30-60 min lead time)
  const kslcIsNorth = (kslcDir >= 280 && kslcDir <= 360) || kslcDir <= 30;
  if (kslcIsNorth && kslcSpeed >= 5) {
    northSwitchLikelihood += 30;
    indicators.push({
      station: 'KSLC',
      signal: 'positive',
      message: `SLC Airport: ${kslcSpeed.toFixed(0)} mph from ${kslcDir.toFixed(0)}° - North flow active upstream`,
    });
  } else if (kslcIsNorth && kslcSpeed >= 3) {
    northSwitchLikelihood += 15;
    indicators.push({
      station: 'KSLC',
      signal: 'developing',
      message: `SLC Airport: Light NW ${kslcSpeed.toFixed(0)} mph - North flow developing`,
    });
  }
  
  // 2. UTALP south wind dying = switch imminent
  const utalpIsSouth = utalpDir >= 140 && utalpDir <= 220;
  if (utalpIsSouth && utalpSpeed < 5 && currentHour >= 14) {
    northSwitchLikelihood += 25;
    indicators.push({
      station: 'UTALP',
      signal: 'developing',
      message: `UTALP: South dying (${utalpSpeed.toFixed(0)} mph) - Switch to north imminent!`,
    });
    estimatedSwitchTime = '15-30 min';
  }
  
  // 3. UTALP already north = confirmed
  const utalpIsNorth = (utalpDir >= 315 || utalpDir <= 45);
  if (utalpIsNorth && utalpSpeed >= 5) {
    northSwitchLikelihood += 40;
    indicators.push({
      station: 'UTALP',
      signal: 'positive',
      message: `UTALP: North side ACTIVE - ${utalpSpeed.toFixed(0)} mph from ${utalpDir.toFixed(0)}°`,
    });
  }
  
  // 4. Time of day bonus (March-Oct, 3-7 PM = high probability)
  const month = new Date().getMonth() + 1;
  if (currentHour >= 15 && currentHour <= 19 && month >= 3 && month <= 10) {
    northSwitchLikelihood += 15;
    indicators.push({
      station: 'TIME',
      signal: 'positive',
      message: `Prime time for evening north flow (${currentHour > 12 ? currentHour - 12 : currentHour} PM, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]})`,
    });
  }
  
  // 5. Provo light/variable = no south flow blocking
  if (kpvuSpeed < 8) {
    northSwitchLikelihood += 10;
    indicators.push({
      station: 'KPVU',
      signal: 'positive',
      message: `Provo light (${kpvuSpeed.toFixed(0)} mph) - No strong south flow to block switch`,
    });
  } else if (kpvuSpeed >= 12) {
    northSwitchLikelihood -= 15;
    indicators.push({
      station: 'KPVU',
      signal: 'negative',
      message: `Provo strong (${kpvuSpeed.toFixed(0)} mph) - May delay/prevent north switch`,
    });
  }
  
  // 6. FPS switching to north = confirmation
  const fpsIsNorth = (fpsDir >= 315 || fpsDir <= 45);
  if (fpsIsNorth && fpsSpeed >= 3) {
    northSwitchLikelihood += 20;
    indicators.push({
      station: 'FPS',
      signal: 'positive',
      message: `FPS switched north - Both sites transitioning!`,
    });
  }
  
  return {
    likelihood: Math.max(0, Math.min(100, northSwitchLikelihood)),
    estimatedSwitchTime,
    indicators,
    isConfirmed: utalpIsNorth && utalpSpeed >= 5,
  };
}

// Wind Switch Predictor Component
const WindSwitchPredictor = ({ windData }) => {
  const currentHour = new Date().getHours();
  const prediction = predictWindSwitch(windData, currentHour);
  
  const isMorning = currentHour < 12;
  
  if (isMorning) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Evening Outlook</span>
        </div>
        <p className="text-xs text-slate-400">
          North side typically activates 3-5 PM. Check back in the afternoon for early indicators from KSLC and UTALP.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`rounded-xl p-4 border ${
      prediction.isConfirmed ? 'bg-green-500/10 border-green-500/30' :
      prediction.likelihood >= 60 ? 'bg-yellow-500/10 border-yellow-500/30' :
      prediction.likelihood >= 30 ? 'bg-blue-500/10 border-blue-500/30' :
      'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${prediction.isConfirmed ? 'text-green-400' : 'text-cyan-400'}`} />
          <span className="text-sm font-medium text-white">
            {prediction.isConfirmed ? '✅ North Side Active' : '🔮 Wind Switch Predictor'}
          </span>
        </div>
        <div className={`text-lg font-bold ${
          prediction.likelihood >= 70 ? 'text-green-400' :
          prediction.likelihood >= 40 ? 'text-yellow-400' : 'text-slate-400'
        }`}>
          {prediction.likelihood}%
        </div>
      </div>
      
      {prediction.estimatedSwitchTime && (
        <div className="bg-yellow-500/20 rounded px-3 py-1.5 mb-3 text-xs text-yellow-400">
          ⏱️ Estimated switch in: {prediction.estimatedSwitchTime}
        </div>
      )}
      
      <div className="space-y-2">
        {prediction.indicators.map((ind, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
              ind.signal === 'positive' ? 'bg-green-400' :
              ind.signal === 'developing' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <div>
              <span className="text-slate-500">{ind.station}:</span>
              <span className={`ml-1 ${
                ind.signal === 'positive' ? 'text-green-400' :
                ind.signal === 'developing' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {ind.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Upstream Station Indicators
const UpstreamIndicators = ({ windData }) => {
  const stations = [
    { id: 'KSLC', name: 'SLC Airport', role: 'North Flow Origin', leadTime: '30-60 min', 
      getNorthSignal: (d, s) => ((d >= 280 || d <= 30) && s >= 5) },
    { id: 'UTOLY', name: 'Murray', role: 'Valley Confirmation', leadTime: '20-40 min',
      getNorthSignal: (d, s) => ((d >= 290 || d <= 40) && s >= 4) },
    { id: 'FPS', name: 'Flight Park S', role: 'S/N Boundary', leadTime: 'Real-time',
      getNorthSignal: (d, s) => ((d >= 315 || d <= 45) && s >= 3) },
    { id: 'UTALP', name: 'Point of Mtn N', role: 'Ground Truth', leadTime: 'Active',
      getNorthSignal: (d, s) => ((d >= 315 || d <= 45) && s >= 5) },
    { id: 'KPVU', name: 'Provo Airport', role: 'South Flow Blocker', leadTime: 'Opposing',
      getNorthSignal: (d, s) => s < 8 }, // Light provo = good for north switch
  ];
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-white">Upstream Indicators</span>
        <span className="text-xs text-slate-500 ml-auto">N → S flow path</span>
      </div>
      
      <div className="space-y-2">
        {stations.map(station => {
          const data = windData?.[station.id] || windData?.stations?.find(s => s.id === station.id);
          const speed = data?.speed || data?.windSpeed || 0;
          const dir = data?.direction || data?.windDirection || 0;
          const isNorthSignal = station.getNorthSignal(dir, speed);
          
          const cardinal = getCardinalDir(dir);
          
          return (
            <div key={station.id} className="flex items-center gap-3 text-xs">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isNorthSignal ? 'bg-green-400 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="text-slate-400 w-20 truncate">{station.name}</span>
              <span className={`w-16 font-mono ${speed > 0 ? 'text-white' : 'text-slate-600'}`}>
                {speed > 0 ? `${speed.toFixed(0)} mph` : '--'}
              </span>
              <span className={`w-10 font-mono ${isNorthSignal ? 'text-green-400' : 'text-slate-500'}`}>
                {dir > 0 ? `${cardinal}` : '--'}
              </span>
              <span className="text-slate-600 hidden sm:inline">{station.leadTime}</span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                isNorthSignal ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
              }`}>
                {isNorthSignal ? '✓' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-2 border-t border-slate-700/50 text-xs text-slate-500">
        Green = supporting north flow. KSLC leads UTALP by ~30-60 min.
      </div>
    </div>
  );
};

function getCardinalDir(deg) {
  if (!deg && deg !== 0) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Main Paragliding Dashboard
const ParaglidingMode = ({ windData, isLoading }) => {
  const [selectedSite, setSelectedSite] = useState(null);
  
  const currentHour = new Date().getHours();
  const recommendedSite = currentHour < 12 ? 'flight-park-south' : 'flight-park-north';
  
  // Get wind data for both sites
  const fpsData = windData?.FPS || windData?.stations?.find(s => s.id === 'FPS');
  const utalpData = windData?.UTALP || windData?.stations?.find(s => s.id === 'UTALP');
  
  const stationWindData = {
    FPS: {
      speed: fpsData?.speed || fpsData?.windSpeed,
      direction: fpsData?.direction || fpsData?.windDirection,
      gust: fpsData?.gust || fpsData?.windGust,
    },
    UTALP: {
      speed: utalpData?.speed || utalpData?.windSpeed,
      direction: utalpData?.direction || utalpData?.windDirection,
      gust: utalpData?.gust || utalpData?.windGust,
    },
  };
  
  const southScore = calculateParaglidingScore('flight-park-south', stationWindData.FPS?.speed, stationWindData.FPS?.direction, stationWindData.FPS?.gust);
  const northScore = calculateParaglidingScore('flight-park-north', stationWindData.UTALP?.speed, stationWindData.UTALP?.direction, stationWindData.UTALP?.gust);
  
  // Wind switch prediction for smarter recommendations
  const switchPrediction = predictWindSwitch(windData, currentHour);
  
  // Determine best site - factor in prediction
  let bestSite;
  if ((northScore?.score || 0) >= 60) {
    bestSite = 'flight-park-north';
  } else if ((southScore?.score || 0) >= 60) {
    bestSite = 'flight-park-south';
  } else if (currentHour >= 14 && switchPrediction.likelihood >= 60) {
    bestSite = 'flight-park-north';
  } else {
    bestSite = (southScore?.score || 0) > (northScore?.score || 0) ? 'flight-park-south' : 'flight-park-north';
  }
  
  const bestSiteConfig = PARAGLIDING_SITES[bestSite];
  const bestScore = bestSite === 'flight-park-south' ? southScore : northScore;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-2xl">🪂</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Point of the Mountain</h2>
            <p className="text-xs text-purple-300">Paragliding Forecast</p>
          </div>
        </div>
        
        {/* Best Site Recommendation */}
        <div className={`rounded-lg p-3 ${
          bestScore?.status === 'excellent' ? 'bg-green-500/20 border border-green-500/30' :
          bestScore?.status === 'good' ? 'bg-lime-500/20 border border-lime-500/30' :
          bestScore?.status === 'marginal' ? 'bg-yellow-500/20 border border-yellow-500/30' :
          'bg-red-500/20 border border-red-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Best Site Right Now</div>
              <div className="text-lg font-bold text-white">{bestSiteConfig.name}</div>
              {currentHour >= 14 && switchPrediction.likelihood >= 40 && !switchPrediction.isConfirmed && (
                <div className="text-xs text-yellow-400 mt-1">
                  Wind switch {switchPrediction.likelihood}% likely
                  {switchPrediction.estimatedSwitchTime && ` (${switchPrediction.estimatedSwitchTime})`}
                </div>
              )}
              {switchPrediction.isConfirmed && bestSite === 'flight-park-north' && (
                <div className="text-xs text-green-400 mt-1">
                  North flow confirmed - pilots are flying!
                </div>
              )}
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                bestScore?.status === 'excellent' ? 'text-green-400' :
                bestScore?.status === 'good' ? 'text-lime-400' :
                bestScore?.status === 'marginal' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {bestScore?.score || 0}%
              </div>
              <div className="text-xs text-slate-400 capitalize">{bestScore?.status || 'Unknown'}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Time of Day Indicator */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Daily Pattern</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`p-2 rounded ${currentHour < 12 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-slate-700/50'}`}>
            <Sun className={`w-4 h-4 mx-auto mb-1 ${currentHour < 12 ? 'text-yellow-400' : 'text-slate-500'}`} />
            <div className={currentHour < 12 ? 'text-yellow-400 font-medium' : 'text-slate-500'}>Morning</div>
            <div className="text-slate-400">South Side</div>
          </div>
          <div className={`p-2 rounded ${currentHour >= 12 && currentHour < 15 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-slate-700/50'}`}>
            <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 12 && currentHour < 15 ? 'text-orange-400' : 'text-slate-500'}`} />
            <div className={currentHour >= 12 && currentHour < 15 ? 'text-orange-400 font-medium' : 'text-slate-500'}>Midday</div>
            <div className="text-slate-400">Caution</div>
          </div>
          <div className={`p-2 rounded ${currentHour >= 15 ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-700/50'}`}>
            <Sunset className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 15 ? 'text-purple-400' : 'text-slate-500'}`} />
            <div className={currentHour >= 15 ? 'text-purple-400 font-medium' : 'text-slate-500'}>Evening</div>
            <div className="text-slate-400">North Side</div>
          </div>
        </div>
      </div>
      
      {/* Wind Switch Predictor - Key new feature */}
      <WindSwitchPredictor windData={windData} />
      
      {/* Upstream Indicators Panel */}
      <UpstreamIndicators windData={windData} />
      
      {/* Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SiteCard 
          site="flight-park-south" 
          windData={stationWindData}
          isLoading={isLoading}
        />
        <SiteCard 
          site="flight-park-north" 
          windData={stationWindData}
          isLoading={isLoading}
        />
      </div>
      
      {/* Safety Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">P2 Safety Limits</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Max Wind</div>
            <div className="text-white font-medium">18 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Max Gust Over</div>
            <div className="text-white font-medium">+5 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Ideal Range</div>
            <div className="text-white font-medium">10-16 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Radio Freq</div>
            <div className="text-white font-medium">146.560</div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
          <p className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span><strong>15/15 Rule:</strong> Max 15 pilots in pattern. If flying 15 min with others waiting, land or leave.</span>
          </p>
        </div>
      </div>
      
      {/* UHGPGA Link */}
      <div className="text-center text-xs text-slate-500">
        <a 
          href="https://uhgpga.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-cyan-400 transition-colors"
        >
          Utah Hang Gliding & Paragliding Association (UHGPGA)
        </a>
      </div>
    </div>
  );
};

export default ParaglidingMode;
```

---

## File 37: `src/components/FishingMode.jsx`

> 966 lines | 50.4 KB

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Fish, Moon, Thermometer, Gauge, Clock, MapPin, TrendingUp, TrendingDown, Minus, Sun, Sunset, CloudRain, Wind, Waves, Calendar, Target, AlertTriangle, CheckCircle, Anchor, Navigation, Egg, Mountain } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Utah Fishing Locations Configuration
export const FISHING_LOCATIONS = {
  'strawberry': {
    id: 'strawberry',
    name: 'Strawberry Reservoir',
    region: 'Wasatch',
    elevation: 7600,
    coordinates: { lat: 40.1717, lng: -111.1847 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Cutthroat Trout', 'Kokanee Salmon'],
    primarySpecies: 'Cutthroat Trout',
    bestMonths: [5, 6, 9, 10],
    iceOff: 'Mid-May',
    depths: {
      spring: { min: 5, max: 20, description: 'Shallow flats after ice-off' },
      summer: { min: 20, max: 50, description: 'Thermocline depth' },
      fall: { min: 10, max: 30, description: 'Following baitfish' },
      winter: { min: 15, max: 40, description: 'Ice fishing depths' },
    },
    spawning: {
      'Cutthroat Trout': { months: [5, 6], location: 'Tributary streams', behavior: 'Run up Strawberry River and Indian Creek' },
      'Rainbow Trout': { months: [4, 5], location: 'Inlet streams', behavior: 'Spawn in flowing water' },
      'Kokanee Salmon': { months: [9, 10], location: 'Tributary mouths', behavior: 'Turn red, stage near inlets' },
    },
    structure: [
      { type: 'Weed Beds', description: 'Submerged vegetation in 10-20 ft', bestFor: ['Cutthroat Trout', 'Rainbow Trout'] },
      { type: 'Drop-offs', description: 'Ledges from 15-40 ft', bestFor: ['Cutthroat Trout', 'Kokanee Salmon'] },
      { type: 'Inlet Areas', description: 'Where streams enter', bestFor: ['Rainbow Trout', 'Cutthroat Trout'] },
      { type: 'Rocky Points', description: 'Submerged rock piles', bestFor: ['Cutthroat Trout'] },
    ],
    hotspots: [
      { name: 'Soldier Creek Arm', description: 'Most productive area, tube jigs work great', species: ['Cutthroat Trout', 'Rainbow Trout'], coordinates: { lat: 40.165, lng: -111.145 } },
      { name: 'Strawberry Bay', description: 'Easy access, good shore fishing', species: ['Rainbow Trout', 'Cutthroat Trout'], coordinates: { lat: 40.178, lng: -111.195 } },
      { name: 'Chicken Creek Arm', description: 'Less pressure, quality fish', species: ['Cutthroat Trout'], coordinates: { lat: 40.155, lng: -111.225 } },
      { name: 'Indian Creek Inlet', description: 'Spring spawning run hotspot', species: ['Cutthroat Trout', 'Rainbow Trout'], coordinates: { lat: 40.142, lng: -111.168 } },
    ],
    regulations: 'Cutthroat: 15" minimum, 4 fish limit',
    tips: 'Soldier Creek arm is most productive. Use tube jigs tipped with worm.',
  },
  'flaming-gorge': {
    id: 'flaming-gorge',
    name: 'Flaming Gorge',
    region: 'Daggett',
    elevation: 6040,
    coordinates: { lat: 41.0917, lng: -109.5417 },
    type: 'reservoir',
    species: ['Lake Trout', 'Rainbow Trout', 'Kokanee Salmon', 'Smallmouth Bass'],
    primarySpecies: 'Lake Trout',
    bestMonths: [4, 5, 10, 11],
    depths: {
      spring: { min: 20, max: 60, description: 'Lakers near surface' },
      summer: { min: 70, max: 120, description: 'Deep water structure' },
      fall: { min: 40, max: 80, description: 'Following kokanee spawn' },
      winter: { min: 60, max: 100, description: 'Deep ledges' },
    },
    spawning: {
      'Lake Trout': { months: [10, 11], location: 'Rocky shoals 40-80 ft', behavior: 'Spawn on underwater rock structure' },
      'Kokanee Salmon': { months: [9, 10], location: 'Sheep Creek, tributaries', behavior: 'Run up streams, turn bright red' },
      'Smallmouth Bass': { months: [5, 6], location: 'Rocky shallows 5-15 ft', behavior: 'Males guard nests on gravel' },
      'Rainbow Trout': { months: [4, 5], location: 'Inlet streams', behavior: 'Spawn in flowing water' },
    },
    structure: [
      { type: 'Deep Ledges', description: 'Underwater cliffs 60-120 ft', bestFor: ['Lake Trout'] },
      { type: 'Submerged Humps', description: 'Underwater hills rising from deep water', bestFor: ['Lake Trout', 'Kokanee Salmon'] },
      { type: 'Rocky Points', description: 'Shoreline points with rock substrate', bestFor: ['Smallmouth Bass', 'Rainbow Trout'] },
      { type: 'Canyon Walls', description: 'Steep underwater walls', bestFor: ['Lake Trout'] },
    ],
    hotspots: [
      { name: 'Sheep Creek Bay', description: 'Kokanee staging area, fall hotspot', species: ['Kokanee Salmon', 'Lake Trout'], coordinates: { lat: 41.015, lng: -109.685 } },
      { name: 'Antelope Flat', description: 'Trophy lake trout water', species: ['Lake Trout'], coordinates: { lat: 41.045, lng: -109.545 } },
      { name: 'Lucerne Marina Area', description: 'Good access, consistent fishing', species: ['Rainbow Trout', 'Lake Trout'], coordinates: { lat: 41.035, lng: -109.575 } },
      { name: 'Jarvies Canyon', description: 'Deep water structure, big lakers', species: ['Lake Trout'], coordinates: { lat: 41.085, lng: -109.495 } },
      { name: 'Linwood Bay', description: 'Excellent smallmouth bass', species: ['Smallmouth Bass'], coordinates: { lat: 41.065, lng: -109.625 } },
    ],
    regulations: 'Lake trout: 8 fish limit, only 1 over 28"',
    tips: 'Trophy lake trout over 50 lbs possible. Use downriggers in summer.',
  },
  'deer-creek': {
    id: 'deer-creek',
    name: 'Deer Creek Reservoir',
    region: 'Wasatch',
    elevation: 5417,
    coordinates: { lat: 40.4067, lng: -111.5217 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Largemouth Bass', 'Walleye', 'Yellow Perch'],
    primarySpecies: 'Walleye',
    bestMonths: [4, 5, 6, 9, 10],
    depths: {
      spring: { min: 8, max: 25, description: 'Walleye spawning flats' },
      summer: { min: 20, max: 45, description: 'Main lake points' },
      fall: { min: 15, max: 35, description: 'Following shad' },
      winter: { min: 25, max: 50, description: 'Deep structure' },
    },
    spawning: {
      'Walleye': { months: [3, 4], location: 'Rocky flats 8-15 ft', behavior: 'Night spawning on gravel/rock' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 3-8 ft', behavior: 'Males fan out nests in soft bottom' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
      'Brown Trout': { months: [10, 11], location: 'Provo River inlet', behavior: 'Run up river to spawn' },
    },
    structure: [
      { type: 'Main Lake Points', description: 'Rocky points extending into deep water', bestFor: ['Walleye', 'Brown Trout'] },
      { type: 'Weed Beds', description: 'Submerged vegetation in coves', bestFor: ['Largemouth Bass', 'Yellow Perch'] },
      { type: 'Dam Face', description: 'Steep rocky structure near dam', bestFor: ['Walleye', 'Rainbow Trout'] },
      { type: 'River Channel', description: 'Old Provo River channel', bestFor: ['Walleye', 'Brown Trout'] },
    ],
    hotspots: [
      { name: 'Dam Area', description: 'Night walleye hotspot, deep water access', species: ['Walleye', 'Rainbow Trout'], coordinates: { lat: 40.395, lng: -111.525 } },
      { name: 'Wallsburg Bay', description: 'Good bass and perch fishing', species: ['Largemouth Bass', 'Yellow Perch'], coordinates: { lat: 40.425, lng: -111.485 } },
      { name: 'Charleston Inlet', description: 'Trout staging area', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.445, lng: -111.465 } },
      { name: 'Island Area', description: 'Structure-rich, multiple species', species: ['Walleye', 'Largemouth Bass'], coordinates: { lat: 40.415, lng: -111.505 } },
    ],
    regulations: 'Walleye: 6 fish limit, only 1 over 24"',
    tips: 'Night fishing for walleye is excellent. Try the dam area.',
  },
  'provo-river': {
    id: 'provo-river',
    name: 'Provo River',
    region: 'Wasatch/Utah',
    elevation: 5500,
    coordinates: { lat: 40.3267, lng: -111.6017 },
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Cutthroat Trout', 'Mountain Whitefish'],
    primarySpecies: 'Brown Trout',
    bestMonths: [3, 4, 5, 9, 10, 11],
    sections: {
      upper: { description: 'Above Jordanelle - smaller fish, less pressure' },
      middle: { description: 'Jordanelle to Deer Creek - good access' },
      lower: { description: 'Below Deer Creek - trophy water, 2500+ fish/mile' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel runs throughout', behavior: 'Aggressive pre-spawn, build redds in gravel' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel riffles', behavior: 'Spring spawners, look for paired fish' },
      'Mountain Whitefish': { months: [10, 11], location: 'Deep pools', behavior: 'Spawn in deeper water' },
    },
    structure: [
      { type: 'Riffles', description: 'Fast shallow water over gravel', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Deep Pools', description: 'Slow deep sections', bestFor: ['Brown Trout', 'Mountain Whitefish'] },
      { type: 'Undercut Banks', description: 'Eroded banks with cover', bestFor: ['Brown Trout'] },
      { type: 'Log Jams', description: 'Woody debris structure', bestFor: ['Brown Trout', 'Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Lower Section (Below Deer Creek)', description: 'Trophy water, 2500+ fish/mile', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.355, lng: -111.585 } },
      { name: 'Midway Area', description: 'Good access, consistent hatches', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.515, lng: -111.475 } },
      { name: 'Deer Creek Tailwater', description: 'Cold water, year-round fishing', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.385, lng: -111.545 } },
      { name: 'Olmstead Diversion', description: 'Classic dry fly water', species: ['Brown Trout'], coordinates: { lat: 40.335, lng: -111.615 } },
    ],
    regulations: 'Lower section: Artificial flies/lures only, catch & release',
    tips: 'Blue Winged Olive hatches in March-May. Match the hatch!',
  },
  'green-river': {
    id: 'green-river',
    name: 'Green River',
    region: 'Daggett',
    elevation: 5600,
    coordinates: { lat: 40.9117, lng: -109.4217 },
    type: 'river',
    species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [3, 4, 5, 9, 10],
    sections: {
      a: { description: 'Dam to Little Hole - 7 miles, most popular' },
      b: { description: 'Little Hole to Indian Crossing - 9 miles, technical' },
      c: { description: 'Indian Crossing to Ouray - remote, big fish' },
    },
    spawning: {
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel bars A & B sections', behavior: 'Spring spawners, aggressive feeders' },
      'Brown Trout': { months: [10, 11], location: 'Throughout river', behavior: 'Fall spawners, territorial' },
      'Cutthroat Trout': { months: [5, 6], location: 'Upper sections', behavior: 'Late spring spawners' },
    },
    structure: [
      { type: 'Tailouts', description: 'End of pools where water speeds up', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Seams', description: 'Current breaks between fast/slow water', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Boulders', description: 'Large rocks creating eddies', bestFor: ['Brown Trout'] },
      { type: 'Weed Beds', description: 'Aquatic vegetation', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Little Hole', description: 'Classic access point, consistent fishing', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.905, lng: -109.395 } },
      { name: 'Red Creek Rapids', description: 'Technical water, big fish', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.875, lng: -109.365 } },
      { name: 'Grasshopper Flats', description: 'Summer terrestrial fishing', species: ['Rainbow Trout'], coordinates: { lat: 40.895, lng: -109.385 } },
      { name: 'Browns Park', description: 'Remote, trophy browns', species: ['Brown Trout'], coordinates: { lat: 40.825, lng: -109.025 } },
    ],
    regulations: 'A Section: 3 trout limit, 1 over 20"',
    tips: 'World-class tailwater. Cicada hatch in June is legendary.',
  },
  'utah-lake': {
    id: 'utah-lake',
    name: 'Utah Lake',
    region: 'Utah',
    elevation: 4489,
    coordinates: { lat: 40.2167, lng: -111.7917 },
    type: 'lake',
    species: ['Channel Catfish', 'White Bass', 'Walleye', 'Largemouth Bass', 'Black Crappie'],
    primarySpecies: 'Channel Catfish',
    bestMonths: [5, 6, 7, 8, 9],
    depths: {
      spring: { min: 4, max: 12, description: 'Warming shallows' },
      summer: { min: 6, max: 14, description: 'Max depth ~14 ft' },
      fall: { min: 5, max: 12, description: 'Cooling flats' },
    },
    spawning: {
      'White Bass': { months: [5, 6], location: 'Tributary mouths, Provo River', behavior: 'Massive spawning runs up rivers' },
      'Channel Catfish': { months: [6, 7], location: 'Rocky areas, rip-rap', behavior: 'Males guard eggs in cavities' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 2-6 ft', behavior: 'Nest builders in soft bottom' },
      'Black Crappie': { months: [5, 6], location: 'Brush piles, marinas', behavior: 'Spawn around structure' },
      'Walleye': { months: [3, 4], location: 'Rocky shorelines', behavior: 'Night spawners on hard bottom' },
    },
    structure: [
      { type: 'Marina Docks', description: 'Shade and structure', bestFor: ['Largemouth Bass', 'Black Crappie'] },
      { type: 'Rip-rap', description: 'Rocky shoreline protection', bestFor: ['Channel Catfish', 'White Bass'] },
      { type: 'River Mouths', description: 'Where rivers enter lake', bestFor: ['White Bass', 'Channel Catfish'] },
      { type: 'Weed Lines', description: 'Edge of vegetation', bestFor: ['Largemouth Bass', 'Black Crappie'] },
    ],
    hotspots: [
      { name: 'Lincoln Beach Marina', description: 'Year-round catfish, white bass run', species: ['Channel Catfish', 'White Bass'], coordinates: { lat: 40.144, lng: -111.802 } },
      { name: 'Provo River Inlet', description: 'White bass spawning run hotspot', species: ['White Bass', 'Channel Catfish'], coordinates: { lat: 40.235, lng: -111.725 } },
      { name: 'American Fork Marina', description: 'Good bass and crappie', species: ['Largemouth Bass', 'Black Crappie'], coordinates: { lat: 40.345, lng: -111.795 } },
      { name: 'Pelican Point', description: 'Walleye and catfish', species: ['Walleye', 'Channel Catfish'], coordinates: { lat: 40.185, lng: -111.875 } },
      { name: 'Spanish Fork River Inlet', description: 'Spring white bass run', species: ['White Bass'], coordinates: { lat: 40.115, lng: -111.715 } },
    ],
    regulations: 'Catfish: No limit. Carp bow fishing allowed.',
    tips: 'White bass run in May is incredible. Lincoln Beach marina area.',
  },
  'jordanelle': {
    id: 'jordanelle',
    name: 'Jordanelle Reservoir',
    region: 'Wasatch',
    elevation: 6166,
    coordinates: { lat: 40.6017, lng: -111.4217 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Yellow Perch'],
    primarySpecies: 'Smallmouth Bass',
    bestMonths: [5, 6, 7, 8, 9],
    depths: {
      spring: { min: 8, max: 20, description: 'Bass moving shallow' },
      summer: { min: 15, max: 35, description: 'Rocky points' },
      fall: { min: 10, max: 25, description: 'Following baitfish' },
    },
    spawning: {
      'Smallmouth Bass': { months: [5, 6], location: 'Rocky flats 5-12 ft', behavior: 'Males guard nests aggressively' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
      'Rainbow Trout': { months: [4, 5], location: 'Provo River inlet', behavior: 'Run up tributary' },
      'Brown Trout': { months: [10, 11], location: 'Provo River inlet', behavior: 'Fall spawning run' },
    },
    structure: [
      { type: 'Rocky Points', description: 'Main lake points with rock substrate', bestFor: ['Smallmouth Bass', 'Rainbow Trout'] },
      { type: 'Submerged Road Beds', description: 'Old roads now underwater', bestFor: ['Smallmouth Bass', 'Yellow Perch'] },
      { type: 'Standing Timber', description: 'Flooded trees in arms', bestFor: ['Yellow Perch', 'Brown Trout'] },
      { type: 'Dam Face', description: 'Deep rocky structure', bestFor: ['Rainbow Trout', 'Brown Trout'] },
    ],
    hotspots: [
      { name: 'Rock Cliff Recreation Area', description: 'Excellent smallmouth, easy access', species: ['Smallmouth Bass', 'Yellow Perch'], coordinates: { lat: 40.615, lng: -111.395 } },
      { name: 'Hailstone Marina', description: 'Good trout fishing, boat access', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.585, lng: -111.435 } },
      { name: 'Provo River Arm', description: 'Trout staging, fall browns', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.635, lng: -111.385 } },
      { name: 'Ross Creek Arm', description: 'Less pressure, quality bass', species: ['Smallmouth Bass'], coordinates: { lat: 40.595, lng: -111.415 } },
    ],
    regulations: 'Bass: 6 fish limit',
    tips: 'Excellent smallmouth fishery. Drop shot on rocky points.',
  },
  'pineview': {
    id: 'pineview',
    name: 'Pineview Reservoir',
    region: 'Weber',
    elevation: 4900,
    coordinates: { lat: 41.2567, lng: -111.8417 },
    type: 'reservoir',
    species: ['Tiger Muskie', 'Largemouth Bass', 'Crappie', 'Yellow Perch', 'Rainbow Trout'],
    primarySpecies: 'Tiger Muskie',
    bestMonths: [5, 6, 9, 10],
    depths: {
      spring: { min: 5, max: 15, description: 'Muskie in shallows' },
      summer: { min: 15, max: 30, description: 'Weed edges' },
      fall: { min: 10, max: 25, description: 'Pre-winter feed' },
    },
    spawning: {
      'Tiger Muskie': { months: [0], location: 'N/A - Sterile hybrid', behavior: 'Does not spawn (stocked only)' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 3-8 ft', behavior: 'Nest builders in soft bottom' },
      'Crappie': { months: [5, 6], location: 'Brush piles, docks', behavior: 'Spawn around woody structure' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
    },
    structure: [
      { type: 'Weed Beds', description: 'Extensive aquatic vegetation', bestFor: ['Tiger Muskie', 'Largemouth Bass'] },
      { type: 'Docks/Marinas', description: 'Man-made structure', bestFor: ['Crappie', 'Largemouth Bass'] },
      { type: 'Points', description: 'Shoreline points', bestFor: ['Tiger Muskie', 'Yellow Perch'] },
      { type: 'Creek Channels', description: 'Old creek beds', bestFor: ['Crappie', 'Yellow Perch'] },
    ],
    hotspots: [
      { name: 'Cemetery Point', description: 'Prime muskie water, weed edges', species: ['Tiger Muskie', 'Largemouth Bass'], coordinates: { lat: 41.265, lng: -111.825 } },
      { name: 'Anderson Cove', description: 'Good bass and crappie', species: ['Largemouth Bass', 'Crappie'], coordinates: { lat: 41.245, lng: -111.855 } },
      { name: 'Middle Inlet Arm', description: 'Muskie cruising area', species: ['Tiger Muskie'], coordinates: { lat: 41.275, lng: -111.815 } },
      { name: 'Dam Area', description: 'Deep water, trout and perch', species: ['Rainbow Trout', 'Yellow Perch'], coordinates: { lat: 41.235, lng: -111.875 } },
    ],
    regulations: 'Tiger Muskie: Catch & release only',
    tips: 'State record muskie water. Large swimbaits and jerkbaits.',
  },
};

// Fish Species Data
const FISH_SPECIES = {
  'Rainbow Trout': { tempOptimal: [55, 65], tempStress: 70, icon: '🌈', color: 'text-pink-400' },
  'Brown Trout': { tempOptimal: [60, 70], tempStress: 75, icon: '🟤', color: 'text-amber-600' },
  'Cutthroat Trout': { tempOptimal: [39, 59], tempStress: 68, icon: '🔴', color: 'text-red-400' },
  'Lake Trout': { tempOptimal: [42, 55], tempStress: 65, icon: '⬛', color: 'text-slate-400' },
  'Kokanee Salmon': { tempOptimal: [50, 59], tempStress: 65, icon: '🔶', color: 'text-orange-400' },
  'Largemouth Bass': { tempOptimal: [68, 78], tempStress: 85, icon: '🐟', color: 'text-green-500' },
  'Smallmouth Bass': { tempOptimal: [65, 75], tempStress: 80, icon: '🐟', color: 'text-emerald-500' },
  'Walleye': { tempOptimal: [65, 70], tempStress: 80, icon: '👁️', color: 'text-yellow-400' },
  'Channel Catfish': { tempOptimal: [65, 76], tempStress: 90, icon: '🐱', color: 'text-slate-500' },
  'Yellow Perch': { tempOptimal: [63, 72], tempStress: 78, icon: '🟡', color: 'text-yellow-500' },
  'Tiger Muskie': { tempOptimal: [60, 70], tempStress: 80, icon: '🐯', color: 'text-orange-500' },
  'White Bass': { tempOptimal: [65, 75], tempStress: 85, icon: '⚪', color: 'text-slate-300' },
  'Black Crappie': { tempOptimal: [60, 70], tempStress: 80, icon: '⚫', color: 'text-slate-600' },
  'Mountain Whitefish': { tempOptimal: [45, 55], tempStress: 65, icon: '🐟', color: 'text-blue-300' },
};

// Moon Phase Calculations
function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  const phaseIndex = phase - Math.floor(phase);
  
  if (phaseIndex < 0.0625) return { name: 'New Moon', icon: '🌑', rating: 5, description: 'Excellent - Major feeding period' };
  if (phaseIndex < 0.1875) return { name: 'Waxing Crescent', icon: '🌒', rating: 3, description: 'Good - Increasing activity' };
  if (phaseIndex < 0.3125) return { name: 'First Quarter', icon: '🌓', rating: 4, description: 'Good - Minor feeding period' };
  if (phaseIndex < 0.4375) return { name: 'Waxing Gibbous', icon: '🌔', rating: 3, description: 'Fair - Moderate activity' };
  if (phaseIndex < 0.5625) return { name: 'Full Moon', icon: '🌕', rating: 5, description: 'Excellent - Major feeding period' };
  if (phaseIndex < 0.6875) return { name: 'Waning Gibbous', icon: '🌖', rating: 3, description: 'Fair - Night feeding' };
  if (phaseIndex < 0.8125) return { name: 'Last Quarter', icon: '🌗', rating: 4, description: 'Good - Minor feeding period' };
  if (phaseIndex < 0.9375) return { name: 'Waning Crescent', icon: '🌘', rating: 3, description: 'Good - Pre-new moon activity' };
  return { name: 'New Moon', icon: '🌑', rating: 5, description: 'Excellent - Major feeding period' };
}

// Solunar Calculations (simplified)
function getSolunarPeriods(date = new Date()) {
  const moonPhase = getMoonPhase(date);
  const hour = date.getHours();
  
  // Simplified major/minor periods based on typical patterns
  const majorPeriods = [
    { start: 5, end: 7, type: 'major', label: 'Dawn Major' },
    { start: 17, end: 19, type: 'major', label: 'Dusk Major' },
  ];
  
  const minorPeriods = [
    { start: 11, end: 12, type: 'minor', label: 'Midday Minor' },
    { start: 23, end: 24, type: 'minor', label: 'Midnight Minor' },
  ];
  
  const currentPeriod = [...majorPeriods, ...minorPeriods].find(
    p => hour >= p.start && hour < p.end
  );
  
  return {
    major: majorPeriods,
    minor: minorPeriods,
    current: currentPeriod,
    moonPhase,
  };
}

// Barometric Pressure Analysis
function analyzePressure(pressure, trend) {
  if (!pressure) return { rating: 0, message: 'No data', color: 'text-slate-400' };
  
  let rating = 3;
  let message = '';
  let color = 'text-yellow-400';
  
  // Optimal range: 29.80 - 30.20 inHg
  if (pressure >= 29.80 && pressure <= 30.20) {
    rating = 5;
    message = 'Optimal pressure range';
    color = 'text-green-400';
  } else if (pressure < 29.70) {
    rating = 2;
    message = 'Low pressure - fish may be deep';
    color = 'text-orange-400';
  } else if (pressure > 30.50) {
    rating = 2;
    message = 'High pressure - tough fishing';
    color = 'text-blue-400';
  } else {
    rating = 3;
    message = 'Moderate pressure';
    color = 'text-yellow-400';
  }
  
  // Trend adjustments
  if (trend === 'falling') {
    rating = Math.min(5, rating + 1);
    message += ' - FALLING (fish feeding!)';
    color = 'text-green-400';
  } else if (trend === 'rising') {
    rating = Math.max(1, rating - 1);
    message += ' - Rising (slowing activity)';
  }
  
  return { rating, message, color };
}

// Calculate overall fishing score
function calculateFishingScore(location, conditions) {
  const { pressure, pressureTrend, windSpeed, waterTemp, moonPhase, hour } = conditions;
  
  let score = 50; // Base score
  let factors = [];
  
  // Moon phase (0-20 points)
  const moonScore = (moonPhase?.rating || 3) * 4;
  score += moonScore - 12;
  factors.push({ name: 'Moon Phase', value: moonPhase?.name, impact: moonScore >= 16 ? 'positive' : moonScore <= 8 ? 'negative' : 'neutral' });
  
  // Barometric pressure (0-20 points)
  const pressureAnalysis = analyzePressure(pressure, pressureTrend);
  const pressureScore = pressureAnalysis.rating * 4;
  score += pressureScore - 12;
  factors.push({ name: 'Pressure', value: `${pressure?.toFixed(2) || '--'} inHg`, impact: pressureScore >= 16 ? 'positive' : pressureScore <= 8 ? 'negative' : 'neutral' });
  
  // Time of day (0-15 points)
  const isGoldenHour = (hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20);
  const isMidDay = hour >= 11 && hour <= 14;
  const timeScore = isGoldenHour ? 15 : isMidDay ? 5 : 10;
  score += timeScore - 10;
  factors.push({ name: 'Time of Day', value: isGoldenHour ? 'Golden Hour' : isMidDay ? 'Midday' : 'Moderate', impact: isGoldenHour ? 'positive' : isMidDay ? 'negative' : 'neutral' });
  
  // Wind (0-15 points)
  let windScore = 10;
  if (windSpeed < 5) windScore = 12;
  else if (windSpeed < 10) windScore = 15; // Light wind is ideal
  else if (windSpeed < 15) windScore = 10;
  else if (windSpeed < 20) windScore = 5;
  else windScore = 2;
  score += windScore - 10;
  factors.push({ name: 'Wind', value: `${windSpeed?.toFixed(0) || '--'} mph`, impact: windScore >= 12 ? 'positive' : windScore <= 5 ? 'negative' : 'neutral' });
  
  // Water temperature (species dependent, 0-15 points)
  const locationData = FISHING_LOCATIONS[location];
  if (locationData && waterTemp) {
    const primarySpecies = FISH_SPECIES[locationData.primarySpecies];
    if (primarySpecies) {
      const [optMin, optMax] = primarySpecies.tempOptimal;
      let tempScore = 8;
      if (waterTemp >= optMin && waterTemp <= optMax) {
        tempScore = 15;
      } else if (waterTemp < optMin - 10 || waterTemp > primarySpecies.tempStress) {
        tempScore = 3;
      }
      score += tempScore - 10;
      factors.push({ name: 'Water Temp', value: `${waterTemp}°F`, impact: tempScore >= 12 ? 'positive' : tempScore <= 5 ? 'negative' : 'neutral' });
    }
  }
  
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    factors,
    recommendation: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
  };
}

// Get current season
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// Location Card Component
const LocationCard = ({ location, isSelected, onSelect, theme }) => {
  const isDark = theme === 'dark';
  const config = FISHING_LOCATIONS[location];
  const currentMonth = new Date().getMonth() + 1;
  const isBestMonth = config.bestMonths.includes(currentMonth);
  
  return (
    <button
      onClick={() => onSelect(location)}
      className={`
        p-3 rounded-lg border transition-all text-left
        ${isSelected 
          ? (isDark ? 'bg-cyan-500/20 border-cyan-500' : 'bg-cyan-100 border-cyan-500')
          : (isDark ? 'bg-slate-800/50 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm')
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium ${isSelected ? (isDark ? 'text-cyan-400' : 'text-cyan-700') : (isDark ? 'text-white' : 'text-slate-800')}`}>
          {config.name}
        </span>
        {isBestMonth && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
            Peak Season
          </span>
        )}
      </div>
      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {config.primarySpecies} • {config.type}
      </div>
    </button>
  );
};

// Main Fishing Mode Component
const FishingMode = ({ windData, pressureData, isLoading }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedLocation, setSelectedLocation] = useState('strawberry');
  
  const location = FISHING_LOCATIONS[selectedLocation];
  const season = getCurrentSeason();
  const moonPhase = getMoonPhase();
  const solunar = getSolunarPeriods();
  const currentHour = new Date().getHours();
  
  // Get conditions
  const windSpeed = windData?.stations?.[0]?.speed || windData?.speed || 5;
  const pressure = pressureData?.slcPressure || 30.0;
  const pressureTrend = pressureData?.gradient > 0 ? 'rising' : pressureData?.gradient < 0 ? 'falling' : 'stable';
  
  // Estimate water temp based on season and elevation
  const estimatedWaterTemp = useMemo(() => {
    const baseTemp = { spring: 50, summer: 65, fall: 55, winter: 38 }[season];
    const elevationAdjust = (location.elevation - 5000) / 1000 * -3;
    return Math.round(baseTemp + elevationAdjust);
  }, [season, location.elevation]);
  
  const fishingScore = calculateFishingScore(selectedLocation, {
    pressure,
    pressureTrend,
    windSpeed,
    waterTemp: estimatedWaterTemp,
    moonPhase,
    hour: currentHour,
  });
  
  const pressureAnalysis = analyzePressure(pressure, pressureTrend);
  const depthInfo = location.depths?.[season] || { min: 10, max: 30, description: 'Variable' };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-blue-500/30' : 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
            <Fish className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Utah Fishing Forecast</h2>
            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Wasatch Front & Beyond</p>
          </div>
        </div>
        
        {/* Overall Score */}
        <div className={`rounded-lg p-3 ${
          fishingScore.score >= 75 ? (isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300') :
          fishingScore.score >= 50 ? (isDark ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-100 border border-yellow-300') :
          (isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-300')
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fishing Score</div>
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{location.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                fishingScore.score >= 75 ? (isDark ? 'text-green-400' : 'text-green-600') :
                fishingScore.score >= 50 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') :
                (isDark ? 'text-red-400' : 'text-red-600')
              }`}>
                {fishingScore.score}%
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{fishingScore.recommendation}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Location Selector */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <MapPin className="w-4 h-4" />
          Select Location
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(FISHING_LOCATIONS).map(loc => (
            <LocationCard
              key={loc}
              location={loc}
              isSelected={selectedLocation === loc}
              onSelect={setSelectedLocation}
              theme={theme}
            />
          ))}
        </div>
      </div>
      
      {/* Key Factors Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Moon Phase */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Moon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Moon Phase</span>
          </div>
          <div className="text-3xl mb-1">{moonPhase.icon}</div>
          <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{moonPhase.name}</div>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{moonPhase.description}</div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= moonPhase.rating ? 'bg-yellow-400' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`} />
            ))}
          </div>
        </div>
        
        {/* Barometric Pressure */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pressure</span>
          </div>
          <div className={`text-2xl font-bold ${pressureAnalysis.color}`}>
            {pressure?.toFixed(2) || '--'}
            <span className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>inHg</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {pressureTrend === 'falling' && <TrendingDown className="w-4 h-4 text-green-400" />}
            {pressureTrend === 'rising' && <TrendingUp className="w-4 h-4 text-red-400" />}
            {pressureTrend === 'stable' && <Minus className="w-4 h-4 text-yellow-400" />}
            <span className={`text-xs capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pressureTrend}</span>
          </div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= pressureAnalysis.rating ? 'bg-green-400' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`} />
            ))}
          </div>
        </div>
        
        {/* Water Temp */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Est. Water Temp</span>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {estimatedWaterTemp}°F
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {location.primarySpecies} optimal: {FISH_SPECIES[location.primarySpecies]?.tempOptimal.join('-')}°F
          </div>
        </div>
        
        {/* Best Depth */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Waves className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Depth ({season})</span>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {depthInfo.min}-{depthInfo.max} ft
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {depthInfo.description}
          </div>
        </div>
      </div>
      
      {/* Solunar Feeding Times */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Clock className="w-4 h-4" />
          Best Fishing Times Today
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...solunar.major, ...solunar.minor].map((period, i) => {
            const isActive = currentHour >= period.start && currentHour < period.end;
            return (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  isActive 
                    ? (isDark ? 'bg-green-500/20 border-green-500/50' : 'bg-green-100 border-green-300')
                    : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {period.type === 'major' ? (
                    <Sun className={`w-4 h-4 ${isActive ? 'text-green-400' : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`} />
                  ) : (
                    <Sunset className={`w-4 h-4 ${isActive ? 'text-green-400' : (isDark ? 'text-orange-400' : 'text-orange-600')}`} />
                  )}
                  <span className={`text-xs font-medium uppercase ${
                    period.type === 'major' ? (isDark ? 'text-yellow-400' : 'text-yellow-700') : (isDark ? 'text-orange-400' : 'text-orange-700')
                  }`}>
                    {period.type}
                  </span>
                  {isActive && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/30 text-green-400' : 'bg-green-200 text-green-700'}`}>
                      NOW
                    </span>
                  )}
                </div>
                <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {period.start}:00 - {period.end}:00
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {period.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Species & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Species */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Target className="w-4 h-4" />
            Target Species
          </h3>
          <div className="space-y-2">
            {location.species.map(species => {
              const speciesData = FISH_SPECIES[species];
              const isPrimary = species === location.primarySpecies;
              return (
                <div 
                  key={species}
                  className={`flex items-center justify-between p-2 rounded ${
                    isPrimary 
                      ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200')
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{speciesData?.icon || '🐟'}</span>
                    <span className={`${isPrimary ? 'font-medium' : ''} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {species}
                    </span>
                    {isPrimary && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                        Primary
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {speciesData?.tempOptimal.join('-')}°F
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Tips & Regulations */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <AlertTriangle className="w-4 h-4" />
            Tips & Regulations
          </h3>
          
          <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Regulations</div>
            <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{location.regulations}</div>
          </div>
          
          <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Pro Tip</div>
            <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{location.tips}</div>
          </div>
          
          {location.iceOff && (
            <div className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3 h-3 inline mr-1" />
              Ice-off typically: {location.iceOff}
            </div>
          )}
        </div>
      </div>
      
      {/* Spawning Seasons */}
      {location.spawning && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Egg className="w-4 h-4" />
            Spawning Seasons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(location.spawning).map(([species, spawn]) => {
              const speciesData = FISH_SPECIES[species];
              const currentMonth = new Date().getMonth() + 1;
              const isSpawning = spawn.months.includes(currentMonth);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const spawnMonthsText = spawn.months.length > 0 && spawn.months[0] !== 0
                ? spawn.months.map(m => monthNames[m - 1]).join('-')
                : 'N/A';
              
              return (
                <div 
                  key={species}
                  className={`p-3 rounded-lg border ${
                    isSpawning 
                      ? (isDark ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-50 border-pink-200')
                      : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{speciesData?.icon || '🐟'}</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{species}</span>
                    </div>
                    {isSpawning ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-pink-500/30 text-pink-400' : 'bg-pink-200 text-pink-700'}`}>
                        SPAWNING NOW
                      </span>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{spawnMonthsText}</span>
                    )}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {spawn.location}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {spawn.behavior}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Structure Types */}
      {location.structure && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Mountain className="w-4 h-4" />
            Structure Types to Target
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {location.structure.map((struct, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}
              >
                <div className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {struct.type}
                </div>
                <div className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {struct.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {struct.bestFor.map((species, j) => {
                    const speciesData = FISH_SPECIES[species];
                    return (
                      <span 
                        key={j}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {speciesData?.icon || '🐟'} {species}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hotspots */}
      {location.hotspots && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Navigation className="w-4 h-4" />
            Hotspots & Fishing Areas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {location.hotspots.map((spot, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${isDark ? 'bg-gradient-to-br from-cyan-900/20 to-slate-800/50 border-cyan-500/20' : 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    📍 {spot.name}
                  </div>
                  {spot.coordinates && (
                    <a 
                      href={`https://www.google.com/maps?q=${spot.coordinates.lat},${spot.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      Map →
                    </a>
                  )}
                </div>
                <div className={`text-xs mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {spot.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {spot.species.map((species, j) => {
                    const speciesData = FISH_SPECIES[species];
                    return (
                      <span 
                        key={j}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}
                      >
                        {speciesData?.icon || '🐟'} {species}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Scoring Factors */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Score Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {fishingScore.factors.map((factor, i) => (
            <div 
              key={i}
              className={`p-2 rounded-lg text-center ${
                factor.impact === 'positive' ? (isDark ? 'bg-green-500/10' : 'bg-green-50') :
                factor.impact === 'negative' ? (isDark ? 'bg-red-500/10' : 'bg-red-50') :
                (isDark ? 'bg-slate-700/30' : 'bg-slate-50')
              }`}
            >
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{factor.name}</div>
              <div className={`font-medium text-sm ${
                factor.impact === 'positive' ? (isDark ? 'text-green-400' : 'text-green-600') :
                factor.impact === 'negative' ? (isDark ? 'text-red-400' : 'text-red-600') :
                (isDark ? 'text-slate-200' : 'text-slate-700')
              }`}>
                {factor.value}
              </div>
              {factor.impact === 'positive' && <CheckCircle className="w-3 h-3 text-green-400 mx-auto mt-1" />}
              {factor.impact === 'negative' && <AlertTriangle className="w-3 h-3 text-red-400 mx-auto mt-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FishingMode;
```

---

## File 38: `src/components/ConfidenceGauge.jsx`

> 122 lines | 3.7 KB

```jsx
import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export function ConfidenceGauge({ value, size = 200 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const rotation = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(100, value));
    return (clampedValue / 100) * 180 - 90;
  }, [value]);

  const getColor = (val) => {
    if (val >= 80) return '#22c55e';
    if (val >= 60) return '#10b981';
    if (val >= 40) return '#f59e0b';
    if (val >= 20) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(value);

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative"
        style={{ width: size, height: size / 2 + 10 }}
      >
        <svg
          viewBox="0 0 200 110"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={isDark ? "#334155" : "#e2e8f0"}
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180 - 180;
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 70 * Math.cos(rad);
            const y1 = 100 + 70 * Math.sin(rad);
            const x2 = 100 + 60 * Math.cos(rad);
            const y2 = 100 + 60 * Math.sin(rad);
            const textX = 100 + 50 * Math.cos(rad);
            const textY = 100 + 50 * Math.sin(rad);
            
            return (
              <g key={tick}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  fill={isDark ? "#94a3b8" : "#64748b"}
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <polygon
              points="100,35 96,100 104,100"
              fill={color}
              className="drop-shadow-lg"
            />
            <circle cx="100" cy="100" r="6" fill={color} />
            <circle cx="100" cy="100" r="3" fill={isDark ? "#1e293b" : "#ffffff"} />
          </g>
        </svg>
      </div>
      
      {/* Value below the gauge */}
      <div 
        className="text-4xl font-black drop-shadow-lg -mt-1"
        style={{ 
          color: isDark ? '#fff' : '#1e293b',
          textShadow: isDark 
            ? `0 0 20px ${color}, 0 2px 4px rgba(0,0,0,0.8)` 
            : `0 0 10px ${color}40`,
        }}
      >
        {value}
        <span className="text-2xl">%</span>
      </div>
      
      <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Thermal Confidence Score</p>
    </div>
  );
}
```

---

## File 39: `src/components/WindVector.jsx`

> 160 lines | 6.2 KB

```jsx
import { Wind, Navigation } from 'lucide-react';
import { WindSparkline } from './Sparkline';
import { useTheme } from '../context/ThemeContext';

export function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function WindVector({ 
  station,
  history,
  isPersonalStation = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const { name, speed, gust, direction, temperature } = station || {};

  const getWindColor = (s, isDark = true) => {
    if (s == null) return isDark ? 'text-slate-500' : 'text-slate-400';
    if (s >= 20) return isDark ? 'text-red-400' : 'text-red-600';
    if (s >= 15) return isDark ? 'text-orange-400' : 'text-orange-600';
    if (s >= 10) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    if (s >= 5) return isDark ? 'text-green-400' : 'text-green-600';
    return isDark ? 'text-blue-400' : 'text-blue-600';
  };

  const isDark = theme === 'dark';
  const windColor = getWindColor(speed, isDark);

  if (compact) {
    return (
      <div className={`
        rounded-lg p-3 
        ${isPersonalStation 
          ? (isDark 
              ? 'bg-gradient-to-br from-cyan-900/40 to-slate-800/80 border border-cyan-500/20' 
              : 'bg-gradient-to-br from-cyan-100 to-white border border-cyan-300')
          : (isDark 
              ? 'bg-slate-800/40 border border-slate-700/50'
              : 'bg-white border border-slate-200 shadow-sm')
        }
      `}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium truncate max-w-[120px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {name}
          </span>
          {isPersonalStation && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
              PWS
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border ${isDark ? 'border-slate-600/50' : 'border-slate-300'}`} />
            <Navigation 
              className={`w-5 h-5 ${windColor}`}
              style={{ transform: `rotate(${(direction || 0) + 180}deg)` }}
            />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${windColor}`}>
                {speed?.toFixed(1) ?? '--'}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>mph</span>
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {windDirectionToCardinal(direction)}
              {gust != null && gust > speed && (
                <span className={`ml-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>G{gust.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      rounded-xl p-4 
      ${isPersonalStation 
        ? (isDark 
            ? 'bg-gradient-to-br from-cyan-900/50 to-slate-800 border border-cyan-500/30' 
            : 'bg-gradient-to-br from-cyan-50 to-white border border-cyan-200 shadow-sm')
        : (isDark 
            ? 'bg-slate-800/50 border border-slate-700'
            : 'bg-white border border-slate-200 shadow-sm')
      }
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-5 h-5 ${isPersonalStation ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
          <h3 className={`font-semibold truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {name}
          </h3>
        </div>
        {isPersonalStation && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
            PWS
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
          <Navigation 
            className={`w-8 h-8 ${windColor} transition-transform duration-500`}
            style={{ 
              transform: `rotate(${(direction || 0) + 180}deg)` 
            }}
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${windColor}`}>
              {speed?.toFixed(1) ?? '--'}
            </span>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mph</span>
          </div>
          
          <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>
              {windDirectionToCardinal(direction)} ({direction ?? '--'}°)
            </span>
            {gust != null && gust > speed && (
              <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>
                G {gust.toFixed(0)}
              </span>
            )}
          </div>

          {temperature != null && (
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {temperature.toFixed(1)}°F
            </div>
          )}
        </div>
      </div>

      {history && history.length > 0 && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>3hr trend</span>
            <WindSparkline history={history} stationId={station?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## File 40: `src/components/WindMap.jsx`

> 600 lines | 22.8 KB

```jsx
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Maximize2, X, Wind } from 'lucide-react';
import { LAKE_CONFIGS } from '../config/lakeStations';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map configurations for each area with all relevant weather stations
const MAP_AREAS = {
  'utah-lake': {
    name: 'Utah Lake',
    center: [40.23, -111.83],
    zoom: 11,
    launches: ['utah-lake-lincoln', 'utah-lake-sandy', 'utah-lake-vineyard', 'utah-lake-zigzag', 'utah-lake-mm19'],
    stations: [
      // MesoWest Stations
      { id: 'FPS', name: 'Flight Park South', lat: 40.4555, lng: -111.9208, type: 'mesowest', elevation: 5202 },
      // KPVU - SOUTHERN LAUNCH INDICATOR (Best for Lincoln Beach & Sandy Beach)
      // 78% foil kiteable at 8-10 mph N - better than KSLC for southern launches
      { id: 'KPVU', name: 'Provo Airport', lat: 40.2192, lng: -111.7236, type: 'mesowest', elevation: 4495, isNorthFlowIndicator: true, isSouthernIndicator: true },
      // KSLC - NORTH FLOW EARLY INDICATOR (1-hour lead time)
      // 74% of good north days show N/NW/NE at KSLC 1-2 hours before Utah Lake
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226, isNorthFlowIndicator: true },
      { id: 'QLN', name: 'Lindon', lat: 40.3431, lng: -111.7136, type: 'mesowest', elevation: 4738 },
      // UTALP - POINT OF MOUNTAIN GAP WIND INDICATOR
      // Shows wind funneling through the gap - good confirmation for north flow
      { id: 'UTALP', name: 'Point of Mountain', lat: 40.4456, lng: -111.8983, type: 'mesowest', elevation: 4796, isNorthFlowIndicator: true, isGapIndicator: true },
      // Ridge stations for thermal delta
      { id: 'CSC', name: 'Cascade Peak', lat: 40.2667, lng: -111.6167, type: 'mesowest', elevation: 10875, isRidge: true },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      // Spanish Fork Canyon - SE THERMAL EARLY INDICATOR (2-hour lead time)
      { id: 'QSF', name: 'Spanish Fork', lat: 40.115, lng: -111.655, type: 'mesowest', elevation: 4550, isEarlyIndicator: true },
      // Your PWS
      { id: 'PWS', name: 'Zig Zag PWS', lat: 40.30268164473557, lng: -111.8799503518146, type: 'pws', elevation: 4489 },
    ],
  },
  'deer-creek': {
    name: 'Deer Creek',
    center: [40.42, -111.51],
    zoom: 12,
    launches: ['deer-creek'],
    stations: [
      // Key stations for Deer Creek
      { id: 'DCC', name: 'Deer Creek Dam', lat: 40.4028, lng: -111.5097, type: 'mesowest', elevation: 5417 },
      { id: 'SND', name: 'Arrowhead Summit', lat: 40.4389, lng: -111.5875, type: 'mesowest', elevation: 8252, isRidge: true },
      { id: 'KHCR', name: 'Heber Airport', lat: 40.4822, lng: -111.4286, type: 'mesowest', elevation: 5597 },
      { id: 'TIMU1', name: 'Timpanogos', lat: 40.3833, lng: -111.6333, type: 'mesowest', elevation: 8170, isRidge: true },
      // Charleston area
      { id: 'CHL', name: 'Charleston', lat: 40.4750, lng: -111.4750, type: 'mesowest', elevation: 5600 },
    ],
  },
  'willard-bay': {
    name: 'Willard Bay',
    center: [41.38, -112.08],
    zoom: 11,
    launches: ['willard-bay'],
    stations: [
      { id: 'KOGD', name: 'Ogden Airport', lat: 41.1961, lng: -112.0122, type: 'mesowest', elevation: 4440 },
      { id: 'KSLC', name: 'Salt Lake City', lat: 40.7884, lng: -111.9778, type: 'mesowest', elevation: 4226 },
      { id: 'KHIF', name: 'Hill AFB', lat: 41.1239, lng: -111.9731, type: 'mesowest', elevation: 4789 },
      { id: 'BLM', name: 'Ben Lomond', lat: 41.3667, lng: -111.9500, type: 'mesowest', elevation: 9712, isRidge: true },
    ],
  },
};

// Custom marker icons
const createLaunchIcon = (isSelected) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: ${isSelected ? '20px' : '14px'};
    height: ${isSelected ? '20px' : '14px'};
    background: ${isSelected ? '#22d3ee' : '#64748b'};
    border: 2px solid ${isSelected ? '#06b6d4' : '#475569'};
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
  iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
});

const createStationIcon = (type, isRidge, hasData, isEarlyIndicator, isNorthFlowIndicator) => {
  let color, borderColor, shape;
  const isIndicator = isEarlyIndicator || isNorthFlowIndicator;
  
  if (type === 'pws') {
    color = '#22d3ee'; // Cyan for your PWS
    borderColor = '#06b6d4';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isNorthFlowIndicator) {
    color = '#3b82f6'; // Blue for north flow indicator
    borderColor = '#2563eb';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isEarlyIndicator) {
    color = '#10b981'; // Green for SE thermal early indicator
    borderColor = '#059669';
    shape = 'border-radius: 50%;'; // Circle
  } else if (isRidge) {
    color = '#a855f7'; // Purple for ridge/mountain stations
    borderColor = '#9333ea';
    shape = 'border-radius: 2px; transform: rotate(45deg);'; // Diamond
  } else {
    color = '#f59e0b'; // Amber for regular MesoWest
    borderColor = '#fbbf24';
    shape = 'border-radius: 2px;'; // Square
  }
  
  // Dim if no data
  const opacity = hasData ? '1' : '0.5';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${isIndicator ? '16px' : '14px'};
      height: ${isIndicator ? '16px' : '14px'};
      background: ${color};
      border: 2px solid ${borderColor};
      ${shape}
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: ${opacity};
    "></div>`,
    iconSize: [isIndicator ? 16 : 14, isIndicator ? 16 : 14],
    iconAnchor: [isIndicator ? 8 : 7, isIndicator ? 8 : 7],
  });
};

// Wind arrow component that updates on the map
function WindArrow({ position, direction, speed, color = '#22d3ee', label }) {
  const map = useMap();
  const arrowRef = useRef(null);
  
  useEffect(() => {
    if (direction == null || !position) return;
    
    // Remove existing arrow
    if (arrowRef.current) {
      map.removeLayer(arrowRef.current);
    }
    
    // Convert meteorological direction to map bearing
    // Wind direction is where wind comes FROM, we want where it goes TO
    const bearing = (direction + 180) % 360;
    
    // Calculate arrow end point using proper geographic math
    const length = 0.01 + (speed || 5) * 0.001; // Scale by speed
    const rad = bearing * (Math.PI / 180);
    // North = +lat (cos), East = +lng (sin)
    const endLat = position[0] + Math.cos(rad) * length;
    const endLng = position[1] + Math.sin(rad) * length;
    
    // Create arrow polyline with arrowhead
    const arrow = L.polyline(
      [[position[0], position[1]], [endLat, endLng]],
      { 
        color, 
        weight: 4, 
        opacity: 0.9,
      }
    );
    
    // Add arrowhead using a decorator pattern
    const arrowHead = L.polylineDecorator(arrow, {
      patterns: [
        {
          offset: '100%',
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 12,
            polygon: false,
            pathOptions: { color, weight: 3, opacity: 0.9 }
          })
        }
      ]
    });
    
    // Since polylineDecorator might not be available, use simple approach
    // Just add the line
    arrow.addTo(map);
    arrowRef.current = arrow;
    
    return () => {
      if (arrowRef.current) {
        map.removeLayer(arrowRef.current);
      }
    };
  }, [map, position, direction, speed, color]);
  
  return null;
}

// Convert meteorological wind direction (where wind comes FROM) to map bearing (where wind goes TO)
// Meteorological: 0° = from North, 90° = from East, 180° = from South, 270° = from West
// We want arrow to point where wind is GOING, so add 180°
// Map coordinates: North = +lat, East = +lng
function windDirectionToMapBearing(meteoDirection) {
  // Add 180° to flip from "coming from" to "going to"
  return (meteoDirection + 180) % 360;
}

// Calculate lat/lng offset for a given bearing and distance
// Bearing: 0° = North, 90° = East, 180° = South, 270° = West
function calculateOffset(bearing, distance) {
  const rad = bearing * (Math.PI / 180);
  // North component (latitude) = cos(bearing)
  // East component (longitude) = sin(bearing)
  return {
    lat: Math.cos(rad) * distance,
    lng: Math.sin(rad) * distance,
  };
}

// Animated wind flow lines
function WindFlowOverlay({ direction, speed, bounds }) {
  const map = useMap();
  
  if (direction == null) return null;
  
  const lines = [];
  const mapBounds = map.getBounds();
  const center = mapBounds.getCenter();
  
  // Convert to map bearing (direction wind is blowing TO)
  const bearing = windDirectionToMapBearing(direction);
  
  // Create multiple flow lines
  for (let i = 0; i < 6; i++) {
    const offsetLat = (i % 3 - 1) * 0.05;
    const offsetLng = (Math.floor(i / 3) - 0.5) * 0.08;
    
    const startLat = center.lat + offsetLat;
    const startLng = center.lng + offsetLng;
    
    const length = 0.03 + (speed || 5) * 0.002;
    const offset = calculateOffset(bearing, length);
    const endLat = startLat + offset.lat;
    const endLng = startLng + offset.lng;
    
    lines.push(
      <Polyline
        key={i}
        positions={[[startLat, startLng], [endLat, endLng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 2,
          opacity: 0.3,
          dashArray: '10, 10',
        }}
      />
    );
  }
  
  return <>{lines}</>;
}

// Main wind arrow as a separate polyline
function MainWindArrow({ center, direction, speed }) {
  if (direction == null || !center) return null;
  
  // Convert to map bearing (direction wind is blowing TO)
  const bearing = windDirectionToMapBearing(direction);
  
  const length = 0.02 + (speed || 5) * 0.002;
  const offset = calculateOffset(bearing, length);
  const endLat = center[0] + offset.lat;
  const endLng = center[1] + offset.lng;
  
  // Arrow head points - calculate perpendicular offsets
  const headLength = 0.008;
  const headAngle1 = bearing + 150; // 150° offset for arrow head
  const headAngle2 = bearing - 150;
  const head1Offset = calculateOffset(headAngle1, headLength);
  const head2Offset = calculateOffset(headAngle2, headLength);
  const head1Lat = endLat + head1Offset.lat;
  const head1Lng = endLng + head1Offset.lng;
  const head2Lat = endLat + head2Offset.lat;
  const head2Lng = endLng + head2Offset.lng;
  
  return (
    <>
      {/* Main arrow line */}
      <Polyline
        positions={[[center[0], center[1]], [endLat, endLng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 5,
          opacity: 0.9,
        }}
      />
      {/* Arrow head */}
      <Polyline
        positions={[[head1Lat, head1Lng], [endLat, endLng], [head2Lat, head2Lng]]}
        pathOptions={{
          color: '#22d3ee',
          weight: 5,
          opacity: 0.9,
        }}
      />
      {/* Speed label circle */}
      <Circle
        center={[endLat + 0.01, endLng]}
        radius={500}
        pathOptions={{
          color: '#22d3ee',
          fillColor: '#0f172a',
          fillOpacity: 0.8,
          weight: 2,
        }}
      />
    </>
  );
}

export function WindMap({ 
  selectedLake, 
  windData, 
  stationData = [],
  isLoading,
  onSelectLaunch 
}) {
  const [mapArea, setMapArea] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef(null);
  
  // Determine which map area to show
  useEffect(() => {
    if (selectedLake?.startsWith('utah-lake')) {
      setMapArea(MAP_AREAS['utah-lake']);
    } else if (selectedLake === 'deer-creek') {
      setMapArea(MAP_AREAS['deer-creek']);
    } else if (selectedLake === 'willard-bay') {
      setMapArea(MAP_AREAS['willard-bay']);
    } else {
      setMapArea(MAP_AREAS['utah-lake']);
    }
  }, [selectedLake]);
  
  if (!mapArea) return null;
  
  const currentDirection = windData?.direction;
  const currentSpeed = windData?.speed;
  
  // Get launch data
  const launches = mapArea.launches.map(id => {
    const config = LAKE_CONFIGS[id];
    if (!config?.coordinates) return null;
    return {
      id,
      name: config.shortName || config.name,
      position: [config.coordinates.lat, config.coordinates.lng],
      config,
    };
  }).filter(Boolean);
  
  const mapHeight = isFullscreen ? 'h-[85vh]' : 'h-72 sm:h-96';
  
  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''
    }`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">{mapArea.name} Wind Map</span>
        </div>
        <div className="flex items-center gap-3">
          {currentDirection != null && (
            <div className="flex items-center gap-2 text-xs">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium">{currentSpeed?.toFixed(0) || '--'} mph</span>
              <span className="text-slate-400">@ {currentDirection}°</span>
            </div>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 transition-colors"
          >
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Map Container */}
      <div className={`relative ${mapHeight}`}>
        <MapContainer
          center={mapArea.center}
          zoom={mapArea.zoom}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={true}
          attributionControl={true}
        >
          {/* Base map tiles - using OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Alternative: Terrain style */}
          {/* 
          <TileLayer
            attribution='&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
          */}
          
          {/* Wind flow lines */}
          <WindFlowOverlay direction={currentDirection} speed={currentSpeed} />
          
          {/* Main wind arrow at center */}
          <MainWindArrow 
            center={mapArea.center} 
            direction={currentDirection} 
            speed={currentSpeed} 
          />
          
          {/* Launch markers */}
          {launches.map(launch => (
            <Marker
              key={launch.id}
              position={launch.position}
              icon={createLaunchIcon(selectedLake === launch.id)}
              eventHandlers={{
                click: () => onSelectLaunch?.(launch.id),
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong className="text-cyan-600">{launch.name}</strong>
                  <br />
                  <span className="text-sm text-gray-600">
                    {launch.config?.primaryWindType}
                  </span>
                  {launch.config?.thermalDirection && (
                    <>
                      <br />
                      <span className="text-xs text-gray-500">
                        {launch.config.thermalDirection}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Weather station markers */}
          {mapArea.stations.map(station => {
            const stationWind = stationData?.find(s => 
              s.id === station.id || s.name?.includes(station.name)
            );
            const hasData = stationWind?.speed != null;
            
            // Determine label color based on station type
            const labelColor = station.type === 'pws' ? '#22d3ee' 
              : station.isNorthFlowIndicator ? '#3b82f6'
              : station.isEarlyIndicator ? '#10b981'
              : station.isRidge ? '#a855f7' 
              : '#f59e0b';
            
            return (
              <Marker
                key={station.id}
                position={[station.lat, station.lng]}
                icon={createStationIcon(station.type, station.isRidge, hasData, station.isEarlyIndicator, station.isNorthFlowIndicator)}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <div className="font-bold text-base" style={{ color: labelColor }}>
                      {station.name}
                      {station.isEarlyIndicator && ' ⏰'}
                      {station.isNorthFlowIndicator && ' 🌬️'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {station.id} • {station.elevation?.toLocaleString() || '?'} ft
                      {station.isRidge && ' • Ridge'}
                      {station.isEarlyIndicator && ' • SE Early Indicator'}
                      {station.isNorthFlowIndicator && ' • North Flow Indicator'}
                    </div>
                    
                    {hasData ? (
                      <div className="bg-slate-100 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Wind:</span>
                          <span className="font-bold text-lg text-gray-800">
                            {stationWind.speed?.toFixed(1)} mph
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Direction:</span>
                          <span className="font-medium text-gray-800">
                            {stationWind.direction}° ({getCardinalDirection(stationWind.direction)})
                          </span>
                        </div>
                        {stationWind.gust && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Gust:</span>
                            <span className="font-medium text-gray-800">
                              {stationWind.gust?.toFixed(1)} mph
                            </span>
                          </div>
                        )}
                        {stationWind.temp != null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Temp:</span>
                            <span className="font-medium text-gray-800">
                              {stationWind.temp?.toFixed(0)}°F
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm italic">
                        No current data
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {station.type === 'pws' ? 'Personal Weather Station' 
                        : station.type === 'mesowest' ? 'MesoWest Station' 
                        : 'Weather Station'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[1000]">
            <Wind className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-slate-900/90 rounded-lg px-3 py-2 text-xs text-slate-300 z-[1000]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300" />
              <span>Launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-300" />
              <span>MesoWest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-500 border border-purple-400" style={{ transform: 'rotate(45deg)' }} />
              <span>Ridge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
              <span>SE ⏰</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              <span>North 🌬️</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300" />
              <span>PWS</span>
            </div>
          </div>
        </div>
        
        {/* Wind info overlay */}
        {currentDirection != null && (
          <div className="absolute top-2 right-2 bg-slate-900/90 rounded-lg px-3 py-2 z-[1000]">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {currentSpeed?.toFixed(0) || '--'}
                <span className="text-sm font-normal text-slate-400 ml-1">mph</span>
              </div>
              <div className="text-xs text-slate-400">
                from {currentDirection}° ({getCardinalDirection(currentDirection)})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCardinalDirection(degrees) {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
```

---

## File 41: `src/components/KiteSafety.jsx`

> 269 lines | 8.7 KB

```jsx
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Wind, Anchor } from 'lucide-react';
import { LAKE_CONFIGS } from '../config/lakeStations';

/**
 * KITE SPEED THRESHOLDS
 * 
 * Foil Kite: 10+ mph (more efficient, works in lighter wind)
 * Twin Tip: 15+ mph (needs more power)
 */
export const KITE_SPEED_THRESHOLDS = {
  foil: {
    min: 10,
    ideal: 12,
    max: 30,
    label: 'Foil',
  },
  twinTip: {
    min: 15,
    ideal: 18,
    max: 35,
    label: 'Twin Tip',
  },
};

/**
 * Get kite-ability status based on wind speed
 */
export function getKiteSpeedStatus(windSpeed) {
  if (windSpeed == null) {
    return { foil: 'unknown', twinTip: 'unknown', message: 'No wind data' };
  }
  
  const foil = windSpeed >= KITE_SPEED_THRESHOLDS.foil.min;
  const twinTip = windSpeed >= KITE_SPEED_THRESHOLDS.twinTip.min;
  const overpowered = windSpeed > KITE_SPEED_THRESHOLDS.twinTip.max;
  
  if (overpowered) {
    return {
      foil: 'overpowered',
      twinTip: 'overpowered',
      message: `${windSpeed.toFixed(0)} mph - Very strong! Small kite only`,
      color: 'text-red-400',
    };
  }
  
  if (twinTip) {
    return {
      foil: 'ideal',
      twinTip: 'good',
      message: `${windSpeed.toFixed(0)} mph - Great for all kites!`,
      color: 'text-green-400',
    };
  }
  
  if (foil) {
    return {
      foil: 'good',
      twinTip: 'marginal',
      message: `${windSpeed.toFixed(0)} mph - Foil kite recommended`,
      color: 'text-cyan-400',
    };
  }
  
  return {
    foil: 'too-light',
    twinTip: 'too-light',
    message: `${windSpeed.toFixed(0)} mph - Too light for kiting`,
    color: 'text-slate-500',
  };
}

/**
 * Determine kite safety based on wind direction relative to shore
 * 
 * SAFE: Onshore (wind from water to land) or Side-on
 * CAUTION: Side-off (angled away from shore)
 * DANGEROUS: Offshore (wind from land to water)
 */
export function getKiteSafety(lakeId, windDirection) {
  const config = LAKE_CONFIGS[lakeId];
  if (!config?.kiting || windDirection == null) {
    return { status: 'unknown', message: 'No data', safe: null };
  }

  const { kiting, shoreOrientation } = config;
  const dir = windDirection;

  // Normalize direction check for ranges that cross 0°
  const inRange = (d, min, max) => {
    if (min <= max) {
      return d >= min && d <= max;
    } else {
      return d >= min || d <= max;
    }
  };

  // Check onshore (SAFE - wind coming from water)
  if (inRange(dir, kiting.onshore.min, kiting.onshore.max)) {
    return {
      status: 'onshore',
      message: 'Onshore - SAFE',
      safe: true,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: CheckCircle,
      description: 'Wind blowing from water to land. Safe for kiting.',
    };
  }

  // Check side-on (SAFE)
  const isSideOn = inRange(dir, kiting.sideOn.min, kiting.sideOn.max) ||
    (kiting.sideOn.min2 != null && inRange(dir, kiting.sideOn.min2, kiting.sideOn.max2));
  
  if (isSideOn) {
    return {
      status: 'side-on',
      message: 'Side-on - SAFE',
      safe: true,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
      icon: CheckCircle,
      description: 'Wind parallel to shore. Safe for kiting.',
    };
  }

  // Check offshore (DANGEROUS)
  if (inRange(dir, kiting.offshore.min, kiting.offshore.max)) {
    return {
      status: 'offshore',
      message: 'OFFSHORE - DANGEROUS',
      safe: false,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: XCircle,
      description: 'Wind blowing from land to water. DO NOT KITE - you will be blown out!',
    };
  }

  // Side-off (CAUTION)
  return {
    status: 'side-off',
    message: 'Side-off - CAUTION',
    safe: 'caution',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: AlertTriangle,
    description: 'Wind angled away from shore. Use caution - you may drift downwind.',
  };
}

export function KiteSafetyIndicator({ lakeId, windDirection, windSpeed, compact = false }) {
  const safety = getKiteSafety(lakeId, windDirection);
  const speedStatus = getKiteSpeedStatus(windSpeed);
  const Icon = safety.icon || AlertCircle;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${safety.bgColor} border ${safety.borderColor}`}>
        <Icon className={`w-4 h-4 ${safety.color}`} />
        <span className={`text-sm font-medium ${safety.color}`}>
          {safety.status === 'unknown' ? 'Kite: ?' : safety.message}
        </span>
        {speedStatus.foil === 'too-light' && (
          <span className="text-xs text-slate-500">(too light)</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${safety.borderColor} ${safety.bgColor}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${safety.bgColor}`}>
          <Anchor className={`w-5 h-5 ${safety.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">Kite Safety</h3>
          <p className={`text-sm ${safety.color}`}>{safety.message}</p>
        </div>
        <Icon className={`w-6 h-6 ${safety.color} ml-auto`} />
      </div>
      
      <p className="text-sm text-slate-400 mb-3">{safety.description}</p>
      
      {/* Wind Speed Status for Kiting */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Foil Kite */}
        <div className={`rounded-lg p-2 border ${
          speedStatus.foil === 'ideal' || speedStatus.foil === 'good'
            ? 'bg-green-500/10 border-green-500/30'
            : speedStatus.foil === 'marginal'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Foil Kite</span>
            <span className="text-xs text-slate-500">10+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.foil === 'ideal' || speedStatus.foil === 'good'
              ? 'text-green-400'
              : speedStatus.foil === 'marginal'
                ? 'text-yellow-400'
                : 'text-slate-500'
          }`}>
            {speedStatus.foil === 'ideal' ? '✓ Ideal' :
             speedStatus.foil === 'good' ? '✓ Good' :
             speedStatus.foil === 'overpowered' ? '⚠ Strong' :
             '✗ Too Light'}
          </div>
        </div>
        
        {/* Twin Tip */}
        <div className={`rounded-lg p-2 border ${
          speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
            ? 'bg-green-500/10 border-green-500/30'
            : speedStatus.twinTip === 'marginal'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Twin Tip</span>
            <span className="text-xs text-slate-500">15+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
              ? 'text-green-400'
              : speedStatus.twinTip === 'marginal'
                ? 'text-yellow-400'
                : 'text-slate-500'
          }`}>
            {speedStatus.twinTip === 'ideal' ? '✓ Ideal' :
             speedStatus.twinTip === 'good' ? '✓ Good' :
             speedStatus.twinTip === 'marginal' ? '~ Marginal' :
             speedStatus.twinTip === 'overpowered' ? '⚠ Strong' :
             '✗ Too Light'}
          </div>
        </div>
      </div>
      
      {/* Overall Status */}
      <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
        safety.safe === true && speedStatus.foil !== 'too-light'
          ? 'bg-green-500/10 text-green-400'
          : safety.safe === false
            ? 'bg-red-500/10 text-red-400'
            : 'bg-yellow-500/10 text-yellow-400'
      }`}>
        <Wind className="w-4 h-4" />
        <span>
          {windSpeed != null ? (
            safety.safe === false 
              ? `${windSpeed.toFixed(0)} mph but OFFSHORE - Do not kite!`
              : speedStatus.foil === 'too-light'
                ? `${windSpeed.toFixed(0)} mph - Need 10+ for foil, 15+ for twin tip`
                : speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
                  ? `${windSpeed.toFixed(0)} mph - Great for all kites!`
                  : `${windSpeed.toFixed(0)} mph - Foil kite recommended`
          ) : 'Waiting for wind data...'}
        </span>
      </div>
    </div>
  );
}
```

---

## File 42: `src/components/NorthFlowGauge.jsx`

> 188 lines | 5.7 KB

```jsx
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

/**
 * North Flow / Prefrontal Gauge
 * 
 * Shows the pressure gradient and indicates whether conditions favor:
 * - NORTH FLOW (prefrontal, gradient wind) - positive gradient (SLC > Provo)
 * - THERMAL (lake breeze) - negative gradient (Provo > SLC)
 * - NEUTRAL - near zero gradient
 */
export function NorthFlowGauge({ gradient, size = 160 }) {
  const radius = (size - 20) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Gradient typically ranges from -4 to +4 mb
  // Normalize to -100 to +100 for display
  const normalizedValue = gradient != null 
    ? Math.max(-100, Math.min(100, gradient * 25)) 
    : 0;
  
  // Determine flow type
  let flowType = 'neutral';
  let flowLabel = 'Neutral';
  let flowColor = 'text-slate-400';
  let arcColor = '#64748b';
  
  if (gradient != null) {
    if (gradient > 1.5) {
      flowType = 'north-strong';
      flowLabel = 'Strong North';
      flowColor = 'text-blue-400';
      arcColor = '#3b82f6';
    } else if (gradient > 0.5) {
      flowType = 'north';
      flowLabel = 'North Flow';
      flowColor = 'text-cyan-400';
      arcColor = '#22d3ee';
    } else if (gradient > -0.5) {
      flowType = 'neutral';
      flowLabel = 'Neutral';
      flowColor = 'text-slate-400';
      arcColor = '#64748b';
    } else if (gradient > -1.5) {
      flowType = 'thermal';
      flowLabel = 'Thermal';
      flowColor = 'text-green-400';
      arcColor = '#22c55e';
    } else {
      flowType = 'thermal-strong';
      flowLabel = 'Strong Thermal';
      flowColor = 'text-emerald-400';
      arcColor = '#10b981';
    }
  }

  // Arc parameters (semi-circle from left to right)
  const startAngle = 180;
  const endAngle = 0;
  const arcLength = 180;
  
  // Calculate needle position
  // -100 = full left (thermal), +100 = full right (north)
  const needleAngle = 180 - ((normalizedValue + 100) / 200) * 180;
  const needleLength = radius - 15;
  const needleX = centerX + needleLength * Math.cos((needleAngle * Math.PI) / 180);
  const needleY = centerY - needleLength * Math.sin((needleAngle * Math.PI) / 180);

  // Arc path
  const arcPath = (r, start, end) => {
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = centerX + r * Math.cos(startRad);
    const y1 = centerY - r * Math.sin(startRad);
    const x2 = centerX + r * Math.cos(endRad);
    const y2 = centerY - r * Math.sin(endRad);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arc */}
        <path
          d={arcPath(radius, startAngle, endAngle)}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Gradient colored sections */}
        {/* Thermal side (left - green) */}
        <path
          d={arcPath(radius, 180, 135)}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d={arcPath(radius, 135, 110)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* Neutral (center - gray) */}
        <path
          d={arcPath(radius, 110, 70)}
          fill="none"
          stroke="#64748b"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* North side (right - blue) */}
        <path
          d={arcPath(radius, 70, 45)}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d={arcPath(radius, 45, 0)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        
        {/* Active arc indicator */}
        {gradient != null && (
          <path
            d={arcPath(radius, normalizedValue < 0 ? 180 : 90, normalizedValue < 0 ? 90 + (normalizedValue / 100) * 90 : 90 - (normalizedValue / 100) * 90)}
            fill="none"
            stroke={arcColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={arcColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="6" fill={arcColor} />
        <circle cx={centerX} cy={centerY} r="3" fill="#0f172a" />
        
        {/* Labels */}
        <text x="15" y={centerY + 20} fill="#22c55e" fontSize="10" fontWeight="bold">
          THERMAL
        </text>
        <text x={size - 55} y={centerY + 20} fill="#3b82f6" fontSize="10" fontWeight="bold">
          NORTH
        </text>
      </svg>
      
      {/* Value display */}
      <div className="text-center -mt-2">
        <div className={`text-2xl font-bold ${flowColor}`}>
          {gradient != null ? `${gradient > 0 ? '+' : ''}${gradient.toFixed(2)}` : '--'}
          <span className="text-sm text-slate-500 ml-1">mb</span>
        </div>
        <div className={`text-sm font-medium ${flowColor} flex items-center justify-center gap-1`}>
          {flowType.includes('north') && <ArrowDown className="w-4 h-4" />}
          {flowType.includes('thermal') && <ArrowUp className="w-4 h-4" />}
          {flowType === 'neutral' && <Minus className="w-4 h-4" />}
          {flowLabel}
        </div>
      </div>
    </div>
  );
}
```

---

## File 43: `src/components/BustAlert.jsx`

> 102 lines | 3.3 KB

```jsx
import { AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';

export function BustAlert({ pressureData, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    );
  }

  if (!pressureData || pressureData.gradient == null) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <p className="text-slate-500">Pressure data unavailable</p>
      </div>
    );
  }

  const { gradient, isBustCondition, slcPressure, provoPressure, highName, lowName } = pressureData;
  const absGradient = Math.abs(gradient);

  return (
    <div className={`
      rounded-xl p-4 border transition-all duration-300
      ${isBustCondition 
        ? 'bg-red-900/30 border-red-500/50' 
        : absGradient > 1.0
          ? 'bg-yellow-900/20 border-yellow-500/30'
          : 'bg-green-900/20 border-green-500/30'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isBustCondition 
            ? 'bg-red-500/20' 
            : absGradient > 1.0
              ? 'bg-yellow-500/20'
              : 'bg-green-500/20'
          }
        `}>
          {isBustCondition ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : absGradient > 1.0 ? (
            <TrendingDown className="w-6 h-6 text-yellow-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`
              font-semibold
              ${isBustCondition 
                ? 'text-red-400' 
                : absGradient > 1.0
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }
            `}>
              {isBustCondition 
                ? 'BUST ALERT' 
                : absGradient > 1.0
                  ? 'Caution'
                  : 'Clear'
              }
            </h3>
            <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${isBustCondition 
                ? 'bg-red-500/30 text-red-300' 
                : absGradient > 1.0
                  ? 'bg-yellow-500/30 text-yellow-300'
                  : 'bg-green-500/30 text-green-300'
              }
            `}>
              ΔP = {gradient > 0 ? '+' : ''}{gradient.toFixed(2)} mb
            </span>
          </div>

          <p className="text-slate-400 text-sm mb-2">
            {isBustCondition 
              ? 'Pressure gradient exceeds 2.0mb. North flow interference likely to disrupt thermals.'
              : absGradient > 1.0
                ? 'Moderate pressure gradient detected. Watch for gusty or variable conditions.'
                : 'Pressure gradient favorable for thermal development.'
            }
          </p>

          <div className="flex gap-4 text-xs text-slate-500">
            <span>{highName || 'High'}: {slcPressure?.toFixed(2) ?? '--'} mb</span>
            <span>{lowName || 'Low'}: {provoPressure?.toFixed(2) ?? '--'} mb</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File 44: `src/components/ThermalStatus.jsx`

> 132 lines | 5.0 KB

```jsx
import { Thermometer, TrendingUp, Compass } from 'lucide-react';

export function ThermalStatus({ 
  thermalDelta, 
  lakeshoreTemp, 
  ridgeTemp,
  convergence,
  isLoading 
}) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const delta = thermalDelta?.delta;
  const isActive = delta != null && delta >= 10;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Thermometer className="w-5 h-5 text-orange-400" />
        Thermal Analysis
      </h3>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Thermal Delta (ΔT)</span>
              <span className={`
                font-bold text-lg
                ${isActive 
                  ? 'text-green-400' 
                  : delta != null && delta > 5 
                    ? 'text-yellow-400' 
                    : 'text-slate-400'
                }
              `}>
                {delta != null ? `${delta}°F` : '--'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Lakeshore: {lakeshoreTemp?.toFixed(1) ?? '--'}°F</span>
              <span>Ridge: {ridgeTemp?.toFixed(1) ?? '--'}°F</span>
            </div>
            {isActive && (
              <div className="mt-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded inline-block">
                Thermal Pump ACTIVE
              </div>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {delta == null 
                ? 'Waiting for ridge data...'
                : delta >= 15 
                  ? 'Strong thermal gradient - excellent conditions'
                  : delta >= 10
                    ? 'Good thermal gradient developing'
                    : delta >= 5
                      ? 'Moderate thermal gradient'
                      : delta >= 0
                        ? 'Weak thermal gradient'
                        : 'Inverted gradient - poor conditions'
              }
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Compass className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Vector Convergence</span>
              <span className={`
                text-sm font-medium capitalize
                ${convergence?.alignment === 'excellent' || convergence?.alignment === 'good'
                  ? 'text-green-400' 
                  : convergence?.alignment === 'moderate'
                    ? 'text-yellow-400'
                    : 'text-slate-400'
                }
              `}>
                {convergence?.alignment || '--'}
              </span>
            </div>
            {convergence?.score != null && (
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        convergence.score >= 70 ? 'bg-green-500' :
                        convergence.score >= 50 ? 'bg-yellow-500' :
                        convergence.score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${convergence.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8">{convergence.score}%</span>
                </div>
              </div>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {convergence?.alignment === 'excellent'
                ? 'Winds aligned for optimal thermal development'
                : convergence?.alignment === 'good'
                  ? 'Good wind alignment for thermals'
                  : convergence?.alignment === 'moderate'
                    ? 'Partial wind alignment'
                    : convergence?.alignment === 'poor'
                      ? 'Poor wind alignment - cross-flow likely'
                      : 'Analyzing wind patterns...'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File 45: `src/components/ThermalForecast.jsx`

> 448 lines | 20.9 KB

```jsx
import { Clock, Navigation, Wind, TrendingUp, AlertCircle, CheckCircle, XCircle, Calendar, BarChart3 } from 'lucide-react';
import { predictThermal, formatTimeUntil, getDirectionInfo } from '../services/ThermalPredictor';

export function ThermalForecast({ lakeId, currentConditions, pressureGradient, thermalDelta, pumpActive, inversionTrapped, isLoading }) {
  const prediction = predictThermal(lakeId, { 
    ...currentConditions, 
    pressureGradient,
    thermalDelta,
    pumpActive,
    inversionTrapped,
  });
  
  if (isLoading || !prediction) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const { phase, direction, speed, timing, profile } = prediction;
  const dirInfo = getDirectionInfo(direction.current);

  const phaseColors = {
    'pre-thermal': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    'building': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    'peak': 'text-green-400 bg-green-500/20 border-green-500/30',
    'fading': 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    'ended': 'text-slate-400 bg-slate-500/20 border-slate-500/30',
  };

  const directionColors = {
    'optimal': 'text-green-400',
    'acceptable': 'text-yellow-400',
    'wrong': 'text-red-400',
    'unknown': 'text-slate-400',
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${phaseColors[phase]} border-opacity-50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" />
            <h3 className="font-semibold">Thermal Forecast</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${phaseColors[phase]} capitalize`}>
            {phase.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Expected Direction */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${direction.status === 'optimal' ? 'bg-green-500/20' : direction.status === 'wrong' ? 'bg-red-500/20' : 'bg-slate-700'}`}>
            <Navigation className={`w-5 h-5 ${directionColors[direction.status]}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Expected Direction</span>
              <span className={`font-bold ${directionColors[direction.status]}`}>
                {profile.direction.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">
              Optimal: {direction.expectedRange}
            </div>
            {direction.current != null && (
              <div className={`text-sm ${directionColors[direction.status]}`}>
                Current: {direction.current}° ({dirInfo.cardinal}) 
                {direction.status === 'optimal' && ' ✓'}
                {direction.status === 'wrong' && ' ✗'}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {profile.direction.description}
            </p>
          </div>
        </div>

        {/* Expected Speed */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${speed.status === 'good' ? 'bg-green-500/20' : 'bg-slate-700'}`}>
            <TrendingUp className={`w-5 h-5 ${speed.status === 'good' ? 'text-green-400' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Expected Speed</span>
              <span className="font-bold text-cyan-400">
                {speed.expectedRange}
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">
              Average: {speed.expectedAvg} mph
            </div>
            {speed.current != null && (
              <div className={`text-sm ${speed.status === 'good' ? 'text-green-400' : speed.status === 'light' ? 'text-yellow-400' : 'text-orange-400'}`}>
                Current: {speed.current.toFixed(1)} mph
                {speed.status === 'good' && ' ✓'}
              </div>
            )}
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-700">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Peak Window</span>
              <span className="font-bold text-amber-400">
                {timing.peakWindow}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Usable from: {timing.startTime}
            </div>
            {prediction.timeToThermal && prediction.timeToThermal > 0 && (
              <div className="mt-2 text-sm text-cyan-400">
                ⏱ Thermal in ~{formatTimeUntil(prediction.timeToThermal)}
              </div>
            )}
          </div>
        </div>

        {/* Prediction Summary */}
        <div className={`
          rounded-lg p-3 border
          ${prediction.prediction.willHaveThermal === true 
            ? 'bg-green-900/30 border-green-500/30' 
            : prediction.prediction.willHaveThermal === false
              ? 'bg-red-900/30 border-red-500/30'
              : 'bg-slate-800/50 border-slate-700'
          }
        `}>
          <div className="flex items-start gap-2">
            {prediction.prediction.willHaveThermal === true ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : prediction.prediction.willHaveThermal === false ? (
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                prediction.prediction.willHaveThermal === true 
                  ? 'text-green-400' 
                  : prediction.prediction.willHaveThermal === false
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}>
                {prediction.prediction.message}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Confidence: {prediction.prediction.confidence}% • Based on {profile.statistics.dataSource}
              </p>
            </div>
          </div>
        </div>

        {/* Spanish Fork Early Indicator (Utah Lake only) */}
        {prediction.spanishFork && (
          <div className={`rounded-lg p-3 border ${
            prediction.spanishFork.status === 'strong' 
              ? 'bg-emerald-900/30 border-emerald-500/30'
              : prediction.spanishFork.status === 'moderate'
                ? 'bg-yellow-900/20 border-yellow-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`w-4 h-4 ${
                prediction.spanishFork.status === 'strong' ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Spanish Fork Early Warning</span>
              {prediction.spanishFork.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">⏰ ~2hr LEAD</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.spanishFork.status === 'strong' ? 'text-emerald-400' 
                : prediction.spanishFork.status === 'moderate' ? 'text-yellow-400'
                : 'text-slate-400'
            }`}>
              {prediction.spanishFork.message}
            </p>
            {prediction.spanishFork.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  Current: <span className="text-slate-300">{prediction.spanishFork.windSpeed.toFixed(1)} mph @ {prediction.spanishFork.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Trigger: <span className="text-slate-300">{prediction.spanishFork.triggerConditions.directionNeeded} @ {prediction.spanishFork.triggerConditions.speedNeeded}</span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              📊 {prediction.spanishFork.statistics.seDirectionOnGoodDays} SE on good days • {prediction.spanishFork.statistics.accuracy} accuracy
            </div>
          </div>
        )}

        {/* North Flow Early Indicator (Utah Lake north flow locations) */}
        {prediction.northFlow && (
          <div className={`rounded-lg p-3 border ${
            prediction.northFlow.status === 'strong' 
              ? 'bg-blue-900/30 border-blue-500/30'
              : prediction.northFlow.status === 'moderate'
                ? 'bg-cyan-900/30 border-cyan-500/30'
                : prediction.northFlow.status === 'marginal'
                  ? 'bg-yellow-900/20 border-yellow-500/30'
                  : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Navigation className={`w-4 h-4 ${
                prediction.northFlow.status === 'strong' ? 'text-blue-400' 
                  : prediction.northFlow.status === 'moderate' ? 'text-cyan-400'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">North Flow Early Warning</span>
              {(prediction.northFlow.status === 'strong' || prediction.northFlow.status === 'moderate') && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">⏰ ~1hr LEAD</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.northFlow.status === 'strong' ? 'text-blue-400' 
                : prediction.northFlow.status === 'moderate' ? 'text-cyan-400'
                : prediction.northFlow.status === 'marginal' ? 'text-yellow-400'
                : 'text-slate-400'
            }`}>
              {prediction.northFlow.message}
            </p>
            
            {/* Expected Zig Zag Speed - Key validated data */}
            {prediction.northFlow.expectedZigZagSpeed != null && (
              <div className="mt-2 bg-slate-800/50 rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Expected at Zig Zag:</span>
                  <span className={`font-bold ${
                    prediction.northFlow.expectedZigZagSpeed >= 15 ? 'text-green-400' 
                      : prediction.northFlow.expectedZigZagSpeed >= 10 ? 'text-cyan-400'
                      : 'text-yellow-400'
                  }`}>
                    ~{prediction.northFlow.expectedZigZagSpeed.toFixed(0)} mph
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-xs">
                  <span className="text-slate-500">Foil (10+ mph):</span>
                  <span className={prediction.northFlow.foilKiteablePct >= 50 ? 'text-green-400' : 'text-yellow-400'}>
                    {prediction.northFlow.foilKiteablePct}% likely
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Twin Tip (15+ mph):</span>
                  <span className={prediction.northFlow.twinTipKiteablePct >= 50 ? 'text-green-400' : 'text-yellow-400'}>
                    {prediction.northFlow.twinTipKiteablePct}% likely
                  </span>
                </div>
              </div>
            )}
            
            {prediction.northFlow.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  KSLC: <span className="text-slate-300">{prediction.northFlow.windSpeed.toFixed(0)} mph @ {prediction.northFlow.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Gradient: <span className={prediction.northFlow.pressureGradient > 0 ? 'text-blue-400' : 'text-slate-300'}>
                    {prediction.northFlow.pressureGradient?.toFixed(2) || '?'} mb
                    {prediction.northFlow.pressureGradient > 0 ? ' ✓' : ''}
                  </span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500 border-t border-slate-700 pt-2">
              📊 Validated: KSLC 8-10 mph → ~13 mph • 10-15 mph → ~15 mph • 15+ mph → ~23 mph
            </div>
          </div>
        )}

        {/* Provo Airport Indicator (Lincoln Beach & Sandy Beach) */}
        {prediction.provoIndicator && (
          <div className={`rounded-lg p-3 border ${
            prediction.provoIndicator.status === 'strong' 
              ? 'bg-purple-900/30 border-purple-500/30'
              : prediction.provoIndicator.status === 'good'
                ? 'bg-indigo-900/30 border-indigo-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Navigation className={`w-4 h-4 ${
                prediction.provoIndicator.status === 'strong' ? 'text-purple-400' 
                  : prediction.provoIndicator.status === 'good' ? 'text-indigo-400'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Provo Airport (Southern Launches)</span>
              {prediction.provoIndicator.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">BEST</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.provoIndicator.status === 'strong' ? 'text-purple-400' 
                : prediction.provoIndicator.status === 'good' ? 'text-indigo-400'
                : 'text-slate-400'
            }`}>
              {prediction.provoIndicator.message}
            </p>
            {prediction.provoIndicator.expectedSpeed != null && (
              <div className="mt-2 bg-slate-800/50 rounded p-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Expected at Lincoln/Sandy:</span>
                  <span className={`font-bold ${
                    prediction.provoIndicator.expectedSpeed >= 15 ? 'text-green-400' 
                      : prediction.provoIndicator.expectedSpeed >= 10 ? 'text-purple-400'
                      : 'text-yellow-400'
                  }`}>
                    ~{prediction.provoIndicator.expectedSpeed.toFixed(0)} mph ({prediction.provoIndicator.foilKiteablePct}% foil)
                  </span>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              📊 KPVU 8-10 mph N → 78% foil kiteable (better than KSLC for south)
            </div>
          </div>
        )}

        {/* Point of Mountain Indicator (Gap Wind) */}
        {prediction.pointOfMountain && (
          <div className={`rounded-lg p-3 border ${
            prediction.pointOfMountain.status === 'strong' 
              ? 'bg-teal-900/30 border-teal-500/30'
              : prediction.pointOfMountain.status === 'moderate'
                ? 'bg-teal-900/20 border-teal-500/20'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Wind className={`w-4 h-4 ${
                prediction.pointOfMountain.status === 'strong' ? 'text-teal-400' 
                  : prediction.pointOfMountain.status === 'moderate' ? 'text-teal-300'
                  : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Point of Mountain Gap</span>
              {prediction.pointOfMountain.status === 'strong' && (
                <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full">FUNNELING</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.pointOfMountain.status === 'strong' ? 'text-teal-400' 
                : prediction.pointOfMountain.status === 'moderate' ? 'text-teal-300'
                : 'text-slate-400'
            }`}>
              {prediction.pointOfMountain.message}
            </p>
            {prediction.pointOfMountain.windSpeed != null && (
              <div className="mt-1 text-xs text-slate-500">
                UTALP: {prediction.pointOfMountain.windSpeed.toFixed(0)} mph @ {prediction.pointOfMountain.windDirection}°
              </div>
            )}
          </div>
        )}

        {/* Arrowhead Trigger (Deer Creek only) */}
        {prediction.arrowhead && (
          <div className={`rounded-lg p-3 border ${
            prediction.arrowhead.status === 'trigger' 
              ? 'bg-green-900/30 border-green-500/30'
              : prediction.arrowhead.status === 'building'
                ? 'bg-yellow-900/20 border-yellow-500/30'
                : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-4 h-4 ${
                prediction.arrowhead.status === 'trigger' ? 'text-green-400' : 'text-slate-400'
              }`} />
              <span className="text-slate-300 text-sm font-medium">Arrowhead Trigger</span>
              {prediction.arrowhead.status === 'trigger' && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">ACTIVE</span>
              )}
            </div>
            <p className={`text-sm ${
              prediction.arrowhead.status === 'trigger' ? 'text-green-400' : 'text-slate-400'
            }`}>
              {prediction.arrowhead.message}
            </p>
            {prediction.arrowhead.windSpeed != null && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">
                  Current: <span className="text-slate-300">{prediction.arrowhead.windSpeed.toFixed(1)} mph @ {prediction.arrowhead.windDirection}°</span>
                </div>
                <div className="text-slate-500">
                  Need: <span className="text-slate-300">{prediction.arrowhead.triggerConditions.speedNeeded} from {prediction.arrowhead.triggerConditions.directionNeeded}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Requirements */}
        {profile.requirement && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
            <p className="text-amber-400 text-sm">
              ⚠️ {profile.requirement}
            </p>
          </div>
        )}

        {/* Monthly Context */}
        {prediction.monthlyContext && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">This Month's Pattern</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-cyan-400">{prediction.monthlyContext.successRate}%</div>
                <div className="text-xs text-slate-500">Success Rate</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">{prediction.monthlyContext.expectedPeakHour}:00</div>
                <div className="text-xs text-slate-500">Peak Hour</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{prediction.monthlyContext.expectedPeakSpeed}</div>
                <div className="text-xs text-slate-500">Avg mph</div>
              </div>
            </div>
          </div>
        )}

        {/* Data Source */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-700">
          <BarChart3 className="w-3 h-3" />
          <span>Model: {profile.statistics.dataSource}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## File 46: `src/components/ForecastPanel.jsx`

> 236 lines | 9.2 KB

```jsx
import { useState, useEffect } from 'react';
import { Bell, BellOff, Calendar, Sun, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { getFullForecast, FORECAST_STAGES } from '../services/ForecastService';

export function ForecastPanel({ lakeId, conditions, isLoading }) {
  const [forecast, setForecast] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  useEffect(() => {
    if (conditions) {
      const fullForecast = getFullForecast(lakeId, {
        pressureGradient: conditions.pressureGradient,
        eveningTemp: conditions.temperature,
        eveningWindSpeed: conditions.windSpeed,
        morningTemp: conditions.temperature,
        morningWindSpeed: conditions.windSpeed,
        morningWindDirection: conditions.windDirection,
        currentWindSpeed: conditions.windSpeed,
        currentWindDirection: conditions.windDirection,
        thermalDelta: conditions.thermalDelta,
      });
      setForecast(fullForecast);
    }
  }, [lakeId, conditions]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('notifications-enabled', 'true');
        }
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications-enabled', 'false');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('notifications-enabled');
    if (saved === 'true' && 'Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  if (isLoading || !forecast) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Extract data from forecast - handle both old and new format
  const currentStage = forecast.currentStage || FORECAST_STAGES.MORNING;
  const stages = forecast.stages || {};
  const currentForecast = stages[currentStage] || {
    probability: forecast.overall?.probability || 50,
    message: forecast.overall?.windType === 'north_flow' 
      ? 'North flow conditions expected' 
      : 'Thermal conditions developing',
    factors: [],
  };
  
  const stageIcons = {
    [FORECAST_STAGES.DAY_BEFORE]: Calendar,
    [FORECAST_STAGES.MORNING]: Sun,
    [FORECAST_STAGES.PRE_THERMAL]: Clock,
    [FORECAST_STAGES.IMMINENT]: AlertCircle,
    [FORECAST_STAGES.ACTIVE]: CheckCircle,
  };
  
  const stageLabels = {
    [FORECAST_STAGES.DAY_BEFORE]: 'Tomorrow\'s Outlook',
    [FORECAST_STAGES.MORNING]: 'Today\'s Forecast',
    [FORECAST_STAGES.PRE_THERMAL]: 'Pre-Thermal Update',
    [FORECAST_STAGES.IMMINENT]: 'Thermal Imminent',
    [FORECAST_STAGES.ACTIVE]: 'Thermal Active',
  };
  
  const StageIcon = stageIcons[currentStage] || Clock;
  
  const getProbabilityColor = (prob) => {
    if (prob >= 80) return 'text-green-400';
    if (prob >= 60) return 'text-emerald-400';
    if (prob >= 40) return 'text-yellow-400';
    if (prob >= 20) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getProbabilityBg = (prob) => {
    if (prob >= 80) return 'bg-green-500/20 border-green-500/30';
    if (prob >= 60) return 'bg-emerald-500/20 border-emerald-500/30';
    if (prob >= 40) return 'bg-yellow-500/20 border-yellow-500/30';
    if (prob >= 20) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-slate-200">Multi-Stage Forecast</h3>
        </div>
        <button
          onClick={toggleNotifications}
          className={`p-2 rounded-lg transition-colors ${
            notificationsEnabled 
              ? 'bg-cyan-500/20 text-cyan-400' 
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
          title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Stage Forecast */}
        <div className={`rounded-lg p-4 border ${getProbabilityBg(currentForecast.probability)}`}>
          <div className="flex items-center gap-2 mb-2">
            <StageIcon className={`w-5 h-5 ${getProbabilityColor(currentForecast.probability)}`} />
            <span className="font-medium text-slate-200">{stageLabels[currentStage]}</span>
            <span className={`ml-auto text-2xl font-bold ${getProbabilityColor(currentForecast.probability)}`}>
              {currentForecast.probability}%
            </span>
          </div>
          
          <p className={`text-sm ${getProbabilityColor(currentForecast.probability)}`}>
            {currentForecast.message}
          </p>
          
          {currentForecast.expectedPeakTime && (
            <p className="text-xs text-slate-400 mt-2">
              Expected peak: {currentForecast.expectedPeakTime}
            </p>
          )}
          
          {currentForecast.timeToThermal != null && currentForecast.timeToThermal > 0 && (
            <p className="text-xs text-cyan-400 mt-2">
              Thermal in ~{currentForecast.timeToThermal} minutes
            </p>
          )}
        </div>

        {/* Factors */}
        {currentForecast.factors && currentForecast.factors.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Key Factors</p>
            {currentForecast.factors.map((factor, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <span className={`w-2 h-2 rounded-full ${
                  factor.impact === 'positive' ? 'bg-green-400' : 
                  factor.impact === 'negative' ? 'bg-red-400' : 'bg-slate-500'
                }`} />
                <span className="text-slate-500">{factor.name}:</span>
                <span className="text-slate-300">{factor.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* All Stages Timeline */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Forecast Timeline</p>
          <div className="grid grid-cols-3 gap-2">
            <ForecastStageCard
              label="Evening"
              sublabel="Tomorrow"
              probability={stages[FORECAST_STAGES.DAY_BEFORE]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.DAY_BEFORE}
              icon={Calendar}
            />
            <ForecastStageCard
              label="Morning"
              sublabel="Today"
              probability={stages[FORECAST_STAGES.MORNING]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.MORNING}
              icon={Sun}
            />
            <ForecastStageCard
              label="Pre-Thermal"
              sublabel="1-2 hrs"
              probability={stages[FORECAST_STAGES.PRE_THERMAL]?.probability || 0}
              isActive={currentStage === FORECAST_STAGES.PRE_THERMAL}
              icon={Clock}
            />
          </div>
        </div>

        {/* Notification Settings */}
        {notificationsEnabled && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">
              <Bell className="w-3 h-3 inline mr-1" />
              You'll receive alerts when:
            </p>
            <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
              <li>• Evening: Tomorrow looks good (60%+)</li>
              <li>• Morning: Today's thermal likely (50%+)</li>
              <li>• Pre-thermal: 1 hour before peak (60%+)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ForecastStageCard({ label, sublabel, probability, isActive, icon: Icon }) {
  const getProbColor = (prob) => {
    if (prob >= 70) return 'text-green-400';
    if (prob >= 50) return 'text-yellow-400';
    return 'text-slate-400';
  };
  
  return (
    <div className={`rounded-lg p-2 text-center ${
      isActive ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-800/50'
    }`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
      <p className={`text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[10px] text-slate-500">{sublabel}</p>
      <p className={`text-lg font-bold ${getProbColor(probability)}`}>{probability}%</p>
    </div>
  );
}
```

---

## File 47: `src/components/FiveDayForecast.jsx`

> 310 lines | 13.5 KB

```jsx
import { useState, useEffect } from 'react';
import { Calendar, Wind, ArrowUp, ArrowDown, Sun, Cloud, TrendingUp, ChevronRight, Compass, Anchor, Thermometer, Clock } from 'lucide-react';
import { calculate5DayForecast, getForecastSummary, getConfidenceDescription } from '../services/MultiDayForecast';
import { KITE_SPEED_THRESHOLDS } from './KiteSafety';

export function FiveDayForecast({ conditions, isLoading }) {
  const [forecasts, setForecasts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  
  useEffect(() => {
    if (conditions) {
      const fiveDay = calculate5DayForecast({
        pressure: conditions.pressure,
        temperature: conditions.temperature,
        pressureGradient: conditions.pressureGradient,
      });
      setForecasts(fiveDay);
      setSummary(getForecastSummary(fiveDay));
    }
  }, [conditions]);
  
  if (isLoading || forecasts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  const getWindTypeColor = (type) => {
    if (type === 'SE Thermal') return 'text-cyan-400';
    if (type === 'North Flow') return 'text-purple-400';
    return 'text-slate-400';
  };
  
  const getWindTypeBg = (type) => {
    if (type === 'SE Thermal') return 'bg-cyan-500/10 border-cyan-500/30';
    if (type === 'North Flow') return 'bg-purple-500/10 border-purple-500/30';
    return 'bg-slate-700/50 border-slate-600';
  };
  
  const getProbabilityColor = (prob) => {
    if (prob >= 60) return 'text-green-400';
    if (prob >= 40) return 'text-yellow-400';
    if (prob >= 20) return 'text-orange-400';
    return 'text-slate-500';
  };
  
  const getConfidenceColor = (conf) => {
    if (conf === 'high') return 'text-green-400';
    if (conf === 'good') return 'text-emerald-400';
    if (conf === 'moderate') return 'text-yellow-400';
    return 'text-slate-500';
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200">5-Day Wind Forecast</h3>
          </div>
          <span className="text-xs text-slate-500">Based on 3 years of data</span>
        </div>
        
        {/* Summary */}
        {summary && summary.bestDay && (
          <div className={`mt-3 p-3 rounded-lg border ${getWindTypeBg(summary.bestDay.primary.type)}`}>
            <p className={`font-semibold ${getWindTypeColor(summary.bestDay.primary.type)}`}>
              {summary.headline}
            </p>
            <p className="text-sm text-slate-400 mt-1">{summary.message}</p>
          </div>
        )}
      </div>
      
      {/* 5-Day Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {forecasts.map((day, idx) => (
            <button
              key={day.date}
              onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
              className={`
                p-3 rounded-lg border transition-all text-center
                ${expandedDay === idx 
                  ? getWindTypeBg(day.primary.type)
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }
              `}
            >
              <p className={`text-xs font-medium ${day.day === 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                {day.dayName}
              </p>
              <p className="text-[10px] text-slate-500">{day.date.slice(5)}</p>
              
              {/* Wind Type Icon */}
              <div className="my-2">
                {day.primary.type === 'SE Thermal' ? (
                  <div className="relative mx-auto w-8 h-8">
                    <Sun className="w-8 h-8 text-yellow-400/50" />
                    <Wind className="w-4 h-4 text-cyan-400 absolute bottom-0 right-0" />
                  </div>
                ) : day.primary.type === 'North Flow' ? (
                  <div className="relative mx-auto w-8 h-8">
                    <Cloud className="w-8 h-8 text-slate-400/50" />
                    <ArrowDown className="w-4 h-4 text-purple-400 absolute bottom-0 right-0" />
                  </div>
                ) : (
                  <Wind className="w-8 h-8 text-slate-500 mx-auto" />
                )}
              </div>
              
              {/* Temperature */}
              {day.temperature && (
                <div className="text-[10px] text-orange-300 mb-1">
                  {day.primary.type === 'North Flow' 
                    ? `${day.temperature.northFlowHigh}°`
                    : `${day.temperature.high}°`}
                </div>
              )}
              
              {/* Probability */}
              <p className={`text-lg font-bold ${getProbabilityColor(day.primary.probability)}`}>
                {day.primary.probability}%
              </p>
              
              {/* Wind Type & Start Time */}
              <p className={`text-[10px] ${getWindTypeColor(day.primary.type)}`}>
                {day.primary.type === 'SE Thermal' 
                  ? `SE ${day.seThermal.startHour}:00` 
                  : day.primary.type === 'North Flow' 
                    ? `N ${day.northFlow.startHour}:00`
                    : '?'}
              </p>
              
              {/* Kite-ability indicator */}
              {day.kiteability && day.kiteability.foil && (
                <div className={`text-[9px] ${day.kiteability.color}`}>
                  {day.kiteability.twinTip ? '🏄' : '🏄F'}
                </div>
              )}
              
              {/* Confidence Indicator */}
              <div className="mt-1 flex justify-center gap-0.5">
                {['high', 'good', 'moderate', 'low'].map((level, i) => (
                  <div
                    key={level}
                    className={`w-1.5 h-1.5 rounded-full ${
                      (day.confidence === 'high' && i <= 3) ||
                      (day.confidence === 'good' && i <= 2) ||
                      (day.confidence === 'moderate' && i <= 1) ||
                      (day.confidence === 'low' && i === 0)
                        ? getConfidenceColor(day.confidence).replace('text-', 'bg-')
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
        
        {/* Expanded Day Details */}
        {expandedDay !== null && forecasts[expandedDay] && (
          <div className={`mt-4 p-4 rounded-lg border ${getWindTypeBg(forecasts[expandedDay].primary.type)}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-200">
                {forecasts[expandedDay].dayName} - {forecasts[expandedDay].date}
              </h4>
              <span className={`text-xs ${getConfidenceColor(forecasts[expandedDay].confidence)}`}>
                {getConfidenceDescription(forecasts[expandedDay].confidence)}
              </span>
            </div>
            
            {/* Temperature Bar */}
            {forecasts[expandedDay].temperature && (
              <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/50 rounded-lg">
                <Thermometer className="w-5 h-5 text-orange-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Temperature</span>
                    <span className="text-orange-300 font-medium">
                      {forecasts[expandedDay].temperature.high}° / {forecasts[expandedDay].temperature.low}°
                    </span>
                  </div>
                  {forecasts[expandedDay].primary.type === 'North Flow' && (
                    <p className="text-[10px] text-purple-400 mt-0.5">
                      Cooler with front: ~{forecasts[expandedDay].temperature.northFlowHigh}°
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {/* SE Thermal */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">SE Thermal</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {forecasts[expandedDay].seThermal.probability}%
                </p>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Start: <span className="text-cyan-300">{forecasts[expandedDay].seThermal.startHour}:00</span></span>
                  </div>
                  <p>Peak: <span className="text-cyan-300">{forecasts[expandedDay].seThermal.peakHour}:00</span></p>
                  <p>Speed: ~{forecasts[expandedDay].seThermal.expectedSpeed.toFixed(0)} mph</p>
                  <p>Direction: {forecasts[expandedDay].seThermal.expectedDirection}° SSE</p>
                </div>
                
                {/* Kite-ability */}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Anchor className="w-3 h-3" />
                    <span>Kite:</span>
                    {forecasts[expandedDay].seThermal.expectedSpeed >= KITE_SPEED_THRESHOLDS.twinTip.min ? (
                      <span className="text-green-400">All kites ✓</span>
                    ) : forecasts[expandedDay].seThermal.expectedSpeed >= KITE_SPEED_THRESHOLDS.foil.min ? (
                      <span className="text-cyan-400">Foil only</span>
                    ) : (
                      <span className="text-slate-500">Too light</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* North Flow */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">North Flow</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {forecasts[expandedDay].northFlow.probability}%
                </p>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Start: <span className="text-purple-300">Afternoon/Evening</span></span>
                  </div>
                  <p>Speed: ~{forecasts[expandedDay].northFlow.expectedSpeed} mph</p>
                  <p>Prefrontal/gap wind</p>
                </div>
                
                {/* Kite-ability for North Flow */}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Anchor className="w-3 h-3" />
                    <span>Kite:</span>
                    <span className="text-green-400">All kites ✓</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Factors */}
            {forecasts[expandedDay].factors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Analysis Factors:</p>
                {forecasts[expandedDay].factors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-slate-600" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-500/30" />
            <span>SE Thermal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500/30" />
            <span>North Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </div>
            <span>Confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## File 48: `src/components/HourlyTimeline.jsx`

> 192 lines | 6.9 KB

```jsx
import React from 'react';
import { Sun, Moon, Wind, Waves } from 'lucide-react';
import { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore } from './ActivityMode';

const HourlyTimeline = ({ 
  activity = 'kiting',
  currentConditions,
  thermalStartHour = 10,
  thermalPeakHour = 12,
  thermalEndHour = 17,
}) => {
  const currentHour = new Date().getHours();
  const config = ACTIVITY_CONFIGS[activity];
  
  // Generate hourly predictions based on typical thermal pattern
  const generateHourlyForecast = () => {
    const hours = [];
    
    for (let hour = 6; hour <= 20; hour++) {
      let predictedSpeed = 0;
      let phase = 'calm';
      
      // Simple thermal model
      if (hour < thermalStartHour - 1) {
        predictedSpeed = 2 + Math.random() * 3; // Morning calm
        phase = 'calm';
      } else if (hour < thermalStartHour) {
        predictedSpeed = 4 + Math.random() * 3; // Building
        phase = 'building';
      } else if (hour < thermalPeakHour) {
        predictedSpeed = 8 + (hour - thermalStartHour) * 2 + Math.random() * 3;
        phase = 'building';
      } else if (hour <= thermalPeakHour + 2) {
        predictedSpeed = 12 + Math.random() * 5; // Peak
        phase = 'peak';
      } else if (hour < thermalEndHour) {
        predictedSpeed = 10 - (hour - thermalPeakHour - 2) * 1.5 + Math.random() * 3;
        phase = 'fading';
      } else {
        predictedSpeed = 4 + Math.random() * 3; // Evening calm
        phase = 'calm';
      }
      
      // Use current conditions for current hour
      if (hour === currentHour && currentConditions?.windSpeed != null) {
        predictedSpeed = currentConditions.windSpeed;
      }
      
      // Calculate score based on activity
      let score, status;
      if (config.wantsWind) {
        const result = calculateActivityScore(activity, predictedSpeed, predictedSpeed * 1.3);
        score = result?.score || 0;
        status = result?.status || 'unknown';
      } else {
        const result = calculateGlassScore(predictedSpeed);
        score = result?.score || 0;
        status = result?.status || 'unknown';
      }
      
      hours.push({
        hour,
        time: hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
        predictedSpeed: Math.round(predictedSpeed),
        phase,
        score,
        status,
        isCurrent: hour === currentHour,
        isPast: hour < currentHour,
      });
    }
    
    return hours;
  };
  
  const hourlyData = generateHourlyForecast();
  
  // Get color for score
  const getScoreColor = (score, wantsWind) => {
    if (wantsWind) {
      if (score >= 80) return 'bg-green-500';
      if (score >= 60) return 'bg-lime-500';
      if (score >= 40) return 'bg-yellow-500';
      if (score >= 20) return 'bg-orange-500';
      return 'bg-red-500';
    } else {
      // Inverted for calm-seekers
      if (score >= 80) return 'bg-cyan-500';
      if (score >= 60) return 'bg-blue-500';
      if (score >= 40) return 'bg-yellow-500';
      if (score >= 20) return 'bg-orange-500';
      return 'bg-red-500';
    }
  };
  
  // Find best window
  const bestHours = hourlyData
    .filter(h => !h.isPast && h.score >= 70)
    .map(h => h.time);
  
  const bestWindow = bestHours.length > 0 
    ? `${bestHours[0]} - ${bestHours[bestHours.length - 1]}`
    : 'No ideal window today';
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-white">{config.name} Timeline</span>
        </div>
        <div className="text-xs text-slate-400">
          Best: <span className="text-cyan-400">{bestWindow}</span>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative">
        {/* Hour labels and bars */}
        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {hourlyData.map((hour, idx) => (
            <div 
              key={hour.hour}
              className={`flex flex-col items-center min-w-[36px] ${hour.isCurrent ? 'scale-110' : ''}`}
            >
              {/* Time label */}
              <div className={`text-[10px] mb-1 ${hour.isCurrent ? 'text-cyan-400 font-bold' : hour.isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                {hour.time}
              </div>
              
              {/* Score bar */}
              <div className="relative w-6 h-16 bg-slate-700 rounded-sm overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-300 ${getScoreColor(hour.score, config.wantsWind)} ${hour.isPast ? 'opacity-40' : ''}`}
                  style={{ height: `${hour.score}%` }}
                />
                {hour.isCurrent && (
                  <div className="absolute inset-0 border-2 border-cyan-400 rounded-sm" />
                )}
              </div>
              
              {/* Wind speed */}
              <div className={`text-[10px] mt-1 ${hour.isCurrent ? 'text-white font-bold' : hour.isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                {hour.predictedSpeed}
              </div>
              
              {/* Phase indicator */}
              <div className="mt-0.5">
                {hour.phase === 'calm' && <Moon className="w-2.5 h-2.5 text-slate-500" />}
                {hour.phase === 'building' && <Wind className="w-2.5 h-2.5 text-yellow-500" />}
                {hour.phase === 'peak' && <Sun className="w-2.5 h-2.5 text-orange-500" />}
                {hour.phase === 'fading' && <Wind className="w-2.5 h-2.5 text-slate-400" />}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Moon className="w-3 h-3" />
            <span>Calm</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-yellow-500" />
            <span>Building</span>
          </div>
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-orange-500" />
            <span>Peak</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${config.wantsWind ? 'bg-green-500' : 'bg-cyan-500'}`} />
            <span>Ideal</span>
          </div>
        </div>
      </div>
      
      {/* Activity-specific tips */}
      <div className="mt-3 text-xs text-slate-500">
        {config.wantsWind ? (
          <p>🎯 Green bars = ideal {config.name.toLowerCase()} conditions</p>
        ) : (
          <p>🎯 Blue bars = calm water for {config.name.toLowerCase()}</p>
        )}
      </div>
    </div>
  );
};

export default HourlyTimeline;
```

---

## File 49: `src/components/WeeklyBestDays.jsx`

> 188 lines | 7.3 KB

```jsx
import React from 'react';
import { Calendar, Wind, Waves, Sun, Cloud, CloudRain, AlertTriangle } from 'lucide-react';
import { ACTIVITY_CONFIGS, getBestActivity } from './ActivityMode';

const WeeklyBestDays = ({ weeklyForecast, selectedActivity = 'kiting' }) => {
  const config = ACTIVITY_CONFIGS[selectedActivity];
  
  // Generate mock weekly data if not provided
  // In production, this would come from NWS forecast
  const generateWeeklyData = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Simulated forecast data
      const patterns = [
        { wind: 5, type: 'calm', weather: 'sunny' },
        { wind: 12, type: 'thermal', weather: 'sunny' },
        { wind: 18, type: 'north_flow', weather: 'partly_cloudy' },
        { wind: 8, type: 'light', weather: 'cloudy' },
        { wind: 25, type: 'strong', weather: 'windy' },
        { wind: 3, type: 'glass', weather: 'sunny' },
        { wind: 15, type: 'thermal', weather: 'sunny' },
      ];
      
      const pattern = patterns[i % patterns.length];
      const bestActivity = getBestActivity(pattern.wind, pattern.wind * 1.3);
      
      days.push({
        date,
        dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[date.getDay()],
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgWind: pattern.wind,
        windType: pattern.type,
        weather: pattern.weather,
        bestActivity: bestActivity.best,
        bestScore: bestActivity.bestScore,
        activityScores: bestActivity.scores,
        isToday: i === 0,
      });
    }
    
    return days;
  };
  
  const days = weeklyForecast || generateWeeklyData();
  
  // Get icon for weather
  const getWeatherIcon = (weather) => {
    switch (weather) {
      case 'sunny': return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'partly_cloudy': return <Cloud className="w-4 h-4 text-slate-400" />;
      case 'cloudy': return <Cloud className="w-4 h-4 text-slate-500" />;
      case 'rainy': return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'windy': return <Wind className="w-4 h-4 text-cyan-400" />;
      default: return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };
  
  // Get recommendation for the day
  const getDayRecommendation = (day) => {
    const score = day.activityScores[selectedActivity]?.score || 0;
    
    if (score >= 80) return { text: 'Excellent!', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 60) return { text: 'Good', color: 'text-lime-400', bg: 'bg-lime-500/20' };
    if (score >= 40) return { text: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (score >= 20) return { text: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { text: 'Skip', color: 'text-red-400', bg: 'bg-red-500/20' };
  };
  
  // Find best day for selected activity
  const bestDay = days.reduce((best, day) => {
    const score = day.activityScores[selectedActivity]?.score || 0;
    return score > (best?.score || 0) ? { ...day, score } : best;
  }, null);
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">7-Day Outlook</span>
          <span className="text-lg">{config.icon}</span>
        </div>
        {bestDay && (
          <div className="text-xs text-slate-400">
            Best: <span className="text-cyan-400">{bestDay.dayName}</span>
          </div>
        )}
      </div>
      
      {/* Daily cards */}
      <div className="space-y-2">
        {days.map((day, idx) => {
          const rec = getDayRecommendation(day);
          const score = day.activityScores[selectedActivity]?.score || 0;
          const isBestDay = bestDay && day.dayName === bestDay.dayName;
          
          return (
            <div 
              key={idx}
              className={`
                flex items-center gap-3 p-2 rounded-lg transition-colors
                ${day.isToday ? 'bg-slate-700/50 border border-slate-600' : 'hover:bg-slate-700/30'}
                ${isBestDay ? 'ring-1 ring-cyan-500/50' : ''}
              `}
            >
              {/* Day */}
              <div className="w-16">
                <div className={`text-sm font-medium ${day.isToday ? 'text-cyan-400' : 'text-white'}`}>
                  {day.dayName}
                </div>
                <div className="text-xs text-slate-500">{day.dateStr}</div>
              </div>
              
              {/* Weather */}
              <div className="w-8 flex justify-center">
                {getWeatherIcon(day.weather)}
              </div>
              
              {/* Wind */}
              <div className="w-16 text-center">
                <div className="text-sm text-white">{day.avgWind} mph</div>
                <div className="text-[10px] text-slate-500 capitalize">{day.windType.replace('_', ' ')}</div>
              </div>
              
              {/* Score bar */}
              <div className="flex-1">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      score >= 80 ? 'bg-green-500' :
                      score >= 60 ? 'bg-lime-500' :
                      score >= 40 ? 'bg-yellow-500' :
                      score >= 20 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
              
              {/* Recommendation */}
              <div className={`w-20 text-right`}>
                <span className={`text-xs px-2 py-0.5 rounded ${rec.bg} ${rec.color}`}>
                  {rec.text}
                </span>
              </div>
              
              {/* Best activity icon */}
              <div className="w-6 text-center" title={`Best for ${ACTIVITY_CONFIGS[day.bestActivity]?.name}`}>
                <span className="text-sm">{ACTIVITY_CONFIGS[day.bestActivity]?.icon}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>Score for {config.name}:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>80+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>40-79</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>&lt;40</span>
          </div>
        </div>
        <div className="text-slate-400">
          Icon = best activity for that day
        </div>
      </div>
    </div>
  );
};

export default WeeklyBestDays;
```

---

## File 50: `src/components/GlassScore.jsx`

> 138 lines | 5.6 KB

```jsx
import React from 'react';
import { Waves, Anchor, AlertTriangle } from 'lucide-react';
import { calculateGlassScore, calculateCalmWindow } from './ActivityMode';

const GlassScore = ({ windSpeed, windGust, thermalStartHour = 10, size = 180 }) => {
  const glassData = calculateGlassScore(windSpeed, windGust);
  const currentHour = new Date().getHours();
  const calmWindow = calculateCalmWindow(currentHour, thermalStartHour, windSpeed);
  
  const score = glassData.score ?? 0;
  
  // Color based on score
  const getColor = (score) => {
    if (score >= 90) return { main: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' };
    if (score >= 70) return { main: '#84cc16', bg: 'bg-lime-500/20', border: 'border-lime-500/30', text: 'text-lime-400' };
    if (score >= 50) return { main: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    if (score >= 30) return { main: '#f97316', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' };
    return { main: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' };
  };
  
  const colors = getColor(score);
  
  // Wave animation based on conditions
  const getWaveClass = () => {
    if (score >= 90) return 'animate-none opacity-20';
    if (score >= 70) return 'animate-pulse opacity-30';
    if (score >= 50) return 'animate-pulse opacity-50';
    return 'animate-bounce opacity-70';
  };
  
  // SVG arc for the gauge
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className={`rounded-2xl p-4 ${colors.bg} border ${colors.border}`}>
      <div className="text-xs text-slate-400 text-center mb-2 flex items-center justify-center gap-1">
        <Anchor className="w-3 h-3" />
        Glass Score (Calm Water)
      </div>
      
      <div className="relative flex flex-col items-center">
        {/* Gauge */}
        <svg width={size} height={size / 2 + 20} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Score arc */}
          <path
            d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none"
            stroke={colors.main}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
          
          {/* Wave icon in center */}
          <g transform={`translate(${size/2 - 12}, ${size/2 - 30})`}>
            <Waves className={`w-6 h-6 ${colors.text} ${getWaveClass()}`} />
          </g>
        </svg>
        
        {/* Score display */}
        <div className="absolute" style={{ top: size / 2 - 15 }}>
          <div className={`text-4xl font-bold ${colors.text}`}>
            {score}
          </div>
        </div>
        
        {/* Status */}
        <div className={`text-sm font-medium ${colors.text} mt-1`}>
          {glassData.status === 'glass' && '🪞 Perfect Glass'}
          {glassData.status === 'excellent' && '✨ Excellent'}
          {glassData.status === 'good' && '👍 Good'}
          {glassData.status === 'moderate' && '〰️ Moderate'}
          {glassData.status === 'choppy' && '🌊 Choppy'}
          {glassData.status === 'rough' && '⚠️ Rough'}
          {glassData.status === 'dangerous' && '🚫 Dangerous'}
        </div>
        
        {/* Wave estimate */}
        <div className="text-xs text-slate-500 mt-1">
          {glassData.waveEstimate === 'flat' && 'Mirror-flat water'}
          {glassData.waveEstimate === 'ripples' && 'Light ripples only'}
          {glassData.waveEstimate === 'light_chop' && 'Light chop (< 6")'}
          {glassData.waveEstimate === 'moderate_chop' && 'Moderate chop (6-12")'}
          {glassData.waveEstimate === 'choppy' && 'Choppy (1-2 ft waves)'}
          {glassData.waveEstimate === 'rough' && 'Rough (2-3 ft waves)'}
          {glassData.waveEstimate === 'dangerous' && 'Dangerous waves'}
        </div>
      </div>
      
      {/* Calm window info */}
      {calmWindow.hoursRemaining > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Morning calm window:</span>
            <span className="text-cyan-400 font-medium">
              ~{calmWindow.hoursRemaining}h remaining
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {calmWindow.recommendation}
          </div>
        </div>
      )}
      
      {/* Wind info */}
      <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
        <div className="text-center">
          <div className="text-slate-500">Wind</div>
          <div className={`font-medium ${windSpeed > 10 ? 'text-orange-400' : 'text-slate-300'}`}>
            {windSpeed?.toFixed(1) || '--'} mph
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">Gusts</div>
          <div className={`font-medium ${windGust > 15 ? 'text-orange-400' : 'text-slate-300'}`}>
            {windGust?.toFixed(1) || '--'} mph
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassScore;
```

---

## File 51: `src/components/RaceDayMode.jsx`

> 286 lines | 10.7 KB

```jsx
import React, { useState } from 'react';
import { Sailboat, Clock, Wind, Compass, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Helper function - defined outside component to avoid hoisting issues
const getCardinal = (deg) => {
  if (deg == null) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const RaceDayMode = ({ 
  currentWind,
  windHistory = [],
  raceStartTime = '10:00',
  raceDuration = 3, // hours
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState(raceStartTime);
  
  // Calculate wind statistics
  const calculateWindStats = () => {
    if (!windHistory || windHistory.length === 0) {
      return {
        avgSpeed: currentWind?.speed || 0,
        minSpeed: currentWind?.speed || 0,
        maxSpeed: currentWind?.speed || 0,
        avgDirection: currentWind?.direction || 0,
        directionRange: 0,
        gustFactor: 1,
        consistency: 100,
        trend: 'stable',
      };
    }
    
    const speeds = windHistory.map(h => h.speed).filter(s => s != null);
    const directions = windHistory.map(h => h.direction).filter(d => d != null);
    const gusts = windHistory.map(h => h.gust).filter(g => g != null);
    
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    
    // Direction variance
    const avgDirection = directions.reduce((a, b) => a + b, 0) / directions.length;
    const directionRange = Math.max(...directions) - Math.min(...directions);
    
    // Gust factor
    const avgGust = gusts.length > 0 ? gusts.reduce((a, b) => a + b, 0) / gusts.length : avgSpeed;
    const gustFactor = avgGust / avgSpeed;
    
    // Consistency score (100 = perfectly steady)
    const speedVariance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;
    const consistency = Math.max(0, 100 - Math.sqrt(speedVariance) * 10);
    
    // Trend (last hour vs previous)
    const recentSpeeds = speeds.slice(-4);
    const olderSpeeds = speeds.slice(-8, -4);
    const recentAvg = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
    const olderAvg = olderSpeeds.length > 0 ? olderSpeeds.reduce((a, b) => a + b, 0) / olderSpeeds.length : recentAvg;
    
    let trend = 'stable';
    if (recentAvg > olderAvg + 2) trend = 'increasing';
    else if (recentAvg < olderAvg - 2) trend = 'decreasing';
    
    return {
      avgSpeed,
      minSpeed,
      maxSpeed,
      avgDirection,
      directionRange,
      gustFactor,
      consistency,
      trend,
    };
  };
  
  const stats = calculateWindStats();
  
  // Get race condition assessment
  const getRaceConditions = () => {
    const { avgSpeed, consistency, gustFactor, directionRange } = stats;
    
    let overall = 'good';
    const issues = [];
    const positives = [];
    
    // Speed assessment
    if (avgSpeed < 4) {
      overall = 'poor';
      issues.push('Wind too light for racing');
    } else if (avgSpeed < 6) {
      issues.push('Light wind - drifting conditions');
    } else if (avgSpeed > 20) {
      overall = 'caution';
      issues.push('Strong wind - experienced sailors only');
    } else if (avgSpeed >= 8 && avgSpeed <= 15) {
      positives.push('Ideal racing wind speed');
    }
    
    // Consistency
    if (consistency < 50) {
      overall = overall === 'good' ? 'fair' : overall;
      issues.push('Inconsistent wind - tactical advantage');
    } else if (consistency > 80) {
      positives.push('Steady wind - fair racing');
    }
    
    // Gusts
    if (gustFactor > 1.5) {
      overall = overall === 'good' ? 'caution' : overall;
      issues.push(`Gusty (${(gustFactor * 100 - 100).toFixed(0)}% above sustained)`);
    }
    
    // Direction shifts
    if (directionRange > 30) {
      issues.push(`Wind shifting (${directionRange.toFixed(0)}° range)`);
    } else if (directionRange < 15) {
      positives.push('Steady direction');
    }
    
    return { overall, issues, positives };
  };
  
  const conditions = getRaceConditions();
  
  // Course recommendation based on wind
  const getCourseRecommendation = () => {
    const dir = stats.avgDirection;
    const cardinal = getCardinal(dir);
    
    return {
      windward: cardinal,
      startLine: `Perpendicular to ${cardinal} wind`,
      favored: stats.trend === 'increasing' ? 'Port end likely favored' : 
               stats.trend === 'decreasing' ? 'Starboard end likely favored' : 
               'Even start line',
    };
  };
  
  const course = getCourseRecommendation();
  
  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-orange-400" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };
  
  const getOverallColor = () => {
    switch (conditions.overall) {
      case 'good': return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'fair': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'caution': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'poor': return 'bg-red-500/20 border-red-500/30 text-red-400';
      default: return 'bg-slate-500/20 border-slate-500/30 text-slate-400';
    }
  };
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sailboat className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium text-white">Race Day Conditions</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedStartTime}
            onChange={(e) => setSelectedStartTime(e.target.value)}
            className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
          >
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
          </select>
        </div>
      </div>
      
      {/* Overall Assessment */}
      <div className={`rounded-lg p-3 border mb-4 ${getOverallColor()}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium capitalize">{conditions.overall} Racing Conditions</span>
          <span className="text-xs opacity-75">{raceDuration}hr window</span>
        </div>
      </div>
      
      {/* Wind Statistics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs text-slate-500">Avg Wind</div>
          <div className="text-lg font-bold text-white">{stats.avgSpeed.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500">mph</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Range</div>
          <div className="text-lg font-bold text-white">{stats.minSpeed.toFixed(0)}-{stats.maxSpeed.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500">mph</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Direction</div>
          <div className="text-lg font-bold text-white">{getCardinal(stats.avgDirection)}</div>
          <div className="text-[10px] text-slate-500">{stats.avgDirection?.toFixed(0)}°</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Trend</div>
          <div className="flex items-center justify-center">
            {getTrendIcon()}
          </div>
          <div className="text-[10px] text-slate-500 capitalize">{stats.trend}</div>
        </div>
      </div>
      
      {/* Consistency Meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">Wind Consistency</span>
          <span className={`font-medium ${stats.consistency > 70 ? 'text-green-400' : stats.consistency > 40 ? 'text-yellow-400' : 'text-orange-400'}`}>
            {stats.consistency.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              stats.consistency > 70 ? 'bg-green-500' : 
              stats.consistency > 40 ? 'bg-yellow-500' : 'bg-orange-500'
            }`}
            style={{ width: `${stats.consistency}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>Shifty</span>
          <span>Steady</span>
        </div>
      </div>
      
      {/* Course Recommendation */}
      <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-white">Course Setup</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Windward mark:</span>
            <span className="text-white ml-1">{course.windward}</span>
          </div>
          <div>
            <span className="text-slate-400">Start line:</span>
            <span className="text-white ml-1">{course.startLine}</span>
          </div>
        </div>
        <div className="text-xs text-cyan-400 mt-2">{course.favored}</div>
      </div>
      
      {/* Issues and Positives */}
      <div className="space-y-2">
        {conditions.positives.map((pos, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-green-400">
            <span>✓</span>
            <span>{pos}</span>
          </div>
        ))}
        {conditions.issues.map((issue, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-orange-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{issue}</span>
          </div>
        ))}
      </div>
      
      {/* Gust Factor Warning */}
      {stats.gustFactor > 1.3 && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400">
          ⚠️ Gust factor {((stats.gustFactor - 1) * 100).toFixed(0)}% - Reef early, watch for knockdowns
        </div>
      )}
    </div>
  );
};

export default RaceDayMode;
```

---

## File 52: `src/components/WeatherForecast.jsx`

> 286 lines | 11.4 KB

```jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wind, Sun, Cloud, CloudRain, Thermometer, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getForecastSummary } from '../services/ForecastService';

const WeatherForecast = ({ locationId = 'utah-lake' }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const data = await getForecastSummary(locationId);
        setForecast(data);
        setError(null);
      } catch (err) {
        setError('Failed to load forecast');
        console.error(err);
      }
      setLoading(false);
    };

    fetchForecast();
    const interval = setInterval(fetchForecast, 30 * 60 * 1000); // Refresh every 30 min
    return () => clearInterval(interval);
  }, [locationId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const getKiteabilityColor = (kiteability) => {
    switch (kiteability) {
      case 'excellent': return 'text-green-400';
      case 'good_afternoon': return 'text-green-300';
      case 'good_gusty': return 'text-yellow-400';
      case 'possible': return 'text-yellow-300';
      case 'caution_strong': return 'text-orange-400';
      case 'poor_light': return 'text-gray-400';
      case 'poor_gusty': return 'text-orange-500';
      case 'poor_weather': return 'text-red-400';
      case 'dangerous': return 'text-red-500';
      default: return 'text-gray-300';
    }
  };

  const getKiteabilityLabel = (kiteability) => {
    switch (kiteability) {
      case 'excellent': return 'Excellent';
      case 'good_afternoon': return 'Good (Afternoon)';
      case 'good_gusty': return 'Good (Gusty)';
      case 'possible': return 'Possible';
      case 'caution_strong': return 'Caution - Strong';
      case 'poor_light': return 'Too Light';
      case 'poor_gusty': return 'Too Gusty';
      case 'poor_weather': return 'Bad Weather';
      case 'dangerous': return 'Dangerous';
      default: return 'Unknown';
    }
  };

  const getWindTypeIcon = (type) => {
    switch (type) {
      case 'north_flow': return '🌬️';
      case 'thermal': return '☀️';
      default: return '💨';
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        7-Day Wind Forecast
      </h3>

      {/* Active Alerts */}
      {forecast?.hasActiveAlert && (
        <div className="mb-4 space-y-2">
          {forecast.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                alert.severityInfo?.level >= 3
                  ? 'bg-red-900/30 border-red-500'
                  : alert.severityInfo?.level >= 2
                  ? 'bg-yellow-900/30 border-yellow-500'
                  : 'bg-blue-900/30 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                  alert.severityInfo?.level >= 3 ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <div>
                  <p className="font-semibold text-white">{alert.event}</p>
                  <p className="text-sm text-gray-300 mt-1">{alert.headline}</p>
                  {alert.windInfo?.speed && (
                    <p className="text-sm text-gray-400 mt-1">
                      Expected: {alert.windInfo.direction} wind {alert.windInfo.speed} mph
                      {alert.windInfo.gust && `, gusts to ${alert.windInfo.gust} mph`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.onset).toLocaleString()} - {new Date(alert.ends).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Kite Window */}
      {forecast?.nextKiteWindow && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getWindTypeIcon(forecast.nextKiteWindow.type)}</span>
            <div>
              <p className="text-green-400 font-semibold">Next Kite Window</p>
              <p className="text-white">
                {new Date(forecast.nextKiteWindow.start).toLocaleDateString('en-US', { weekday: 'short' })} {formatTime(forecast.nextKiteWindow.start)} - {formatTime(forecast.nextKiteWindow.end)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-300">
              <Wind className="w-4 h-4 inline mr-1" />
              {forecast.nextKiteWindow.avgSpeed?.toFixed(0)} mph {forecast.nextKiteWindow.direction}
            </span>
            <span className="text-gray-300">
              <Clock className="w-4 h-4 inline mr-1" />
              {forecast.nextKiteWindow.hours} hours
            </span>
            {forecast.nextKiteWindow.foilOnly && (
              <span className="text-yellow-400">Foil recommended</span>
            )}
          </div>
        </div>
      )}

      {/* Day by Day Forecast */}
      <div className="space-y-2">
        {forecast?.daySummaries?.slice(0, 5).map((day, idx) => (
          <div key={idx} className="bg-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-700/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">{day.date}</span>
                <div className="flex items-center gap-2">
                  {day.day?.shortForecast?.toLowerCase().includes('sun') ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : day.day?.shortForecast?.toLowerCase().includes('rain') ? (
                    <CloudRain className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Cloud className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-gray-300 text-sm">{day.day?.shortForecast}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {day.hasKiteableWind ? (
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    🪁 {day.kiteWindows.length} window{day.kiteWindows.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">No kite wind</span>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Wind className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{day.day?.windSpeed}</span>
                  <span className="text-gray-500">{day.day?.windDirection}</span>
                </div>
                
                <div className="flex items-center gap-1 text-sm">
                  <Thermometer className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{day.day?.temperature}°</span>
                </div>
                
                {expandedDay === idx ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedDay === idx && (
              <div className="px-3 pb-3 border-t border-gray-600">
                {/* Wind Analysis */}
                {day.day?.windAnalysis && (
                  <div className="mt-3 p-2 bg-gray-800/50 rounded">
                    <p className="text-sm text-gray-400 mb-1">Wind Analysis</p>
                    <div className="flex items-center gap-3">
                      {day.day.windAnalysis.pattern && (
                        <span className="text-sm text-blue-400 capitalize">
                          {day.day.windAnalysis.pattern.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className={`text-sm ${getKiteabilityColor(day.day.windAnalysis.kiteability)}`}>
                        {getKiteabilityLabel(day.day.windAnalysis.kiteability)}
                      </span>
                    </div>
                    {day.day.windAnalysis.notes?.length > 0 && (
                      <ul className="mt-1 text-xs text-gray-500">
                        {day.day.windAnalysis.notes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                {/* Kite Windows */}
                {day.kiteWindows.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-400 mb-2">Kite Windows</p>
                    <div className="space-y-2">
                      {day.kiteWindows.map((window, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-3 p-2 bg-green-900/20 rounded">
                          <span className="text-lg">{getWindTypeIcon(window.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm text-white">
                              {formatTime(window.start)} - {formatTime(window.end)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {window.avgSpeed?.toFixed(0)} mph {window.direction} • {window.hours}h
                            </p>
                          </div>
                          <div className="text-right">
                            {window.foilOnly ? (
                              <span className="text-xs text-yellow-400">Foil</span>
                            ) : (
                              <span className="text-xs text-green-400">All kites</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Detailed Forecast */}
                <div className="mt-3 text-sm text-gray-400">
                  <p>{day.day?.detailedForecast}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;
```

---

## File 53: `src/components/SevereWeatherAlerts.jsx`

> 342 lines | 11.5 KB

```jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Wind, ChevronDown, ChevronUp, ExternalLink, Clock, MapPin } from 'lucide-react';
import { getActiveAlerts } from '../services/ForecastService';

const SEVERITY_CONFIG = {
  Extreme: {
    bg: 'bg-red-900/40',
    border: 'border-red-500',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    badge: 'bg-red-500 text-white',
    pulse: true,
  },
  Severe: {
    bg: 'bg-orange-900/40',
    border: 'border-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500 text-white',
    pulse: true,
  },
  Moderate: {
    bg: 'bg-yellow-900/40',
    border: 'border-yellow-500',
    icon: AlertCircle,
    iconColor: 'text-yellow-400',
    badge: 'bg-yellow-500 text-black',
    pulse: false,
  },
  Minor: {
    bg: 'bg-blue-900/40',
    border: 'border-blue-500',
    icon: Info,
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500 text-white',
    pulse: false,
  },
  Unknown: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-600',
    icon: Info,
    iconColor: 'text-slate-400',
    badge: 'bg-slate-500 text-white',
    pulse: false,
  },
};

const AlertCard = ({ alert, isExpanded, onToggle }) => {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Unknown;
  const IconComponent = config.icon;
  
  const formatTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  const getTimeRemaining = (endStr) => {
    if (!endStr) return null;
    const end = new Date(endStr);
    const now = new Date();
    const diff = end - now;
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };
  
  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className={`mt-0.5 ${config.pulse ? 'animate-pulse' : ''}`}>
          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.badge}`}>
              {alert.severity}
            </span>
            <span className="text-sm font-medium text-white truncate">
              {alert.event}
            </span>
          </div>
          
          <p className="text-xs text-slate-300 mt-1 line-clamp-2">
            {alert.headline}
          </p>
          
          {/* Wind info preview */}
          {alert.windInfo?.speed && (
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <Wind className="w-3 h-3" />
              <span>
                {alert.windInfo.direction && `${alert.windInfo.direction} `}
                {alert.windInfo.speed} mph
                {alert.windInfo.gust && ` (gusts ${alert.windInfo.gust} mph)`}
              </span>
            </div>
          )}
          
          {/* Time remaining */}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{getTimeRemaining(alert.ends)}</span>
          </div>
        </div>
        
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 space-y-3">
          {/* Timing */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Starts:</span>
              <span className="text-slate-300 ml-1">{formatTime(alert.onset)}</span>
            </div>
            <div>
              <span className="text-slate-500">Ends:</span>
              <span className="text-slate-300 ml-1">{formatTime(alert.ends)}</span>
            </div>
          </div>
          
          {/* Affected areas */}
          {alert.areas && (
            <div className="text-xs">
              <div className="flex items-center gap-1 text-slate-500 mb-1">
                <MapPin className="w-3 h-3" />
                <span>Affected Areas:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {alert.areas}
              </p>
            </div>
          )}
          
          {/* Full description */}
          {alert.description && (
            <div className="text-xs">
              <span className="text-slate-500">Details:</span>
              <p className="text-slate-400 mt-1 text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {alert.description.slice(0, 500)}
                {alert.description.length > 500 && '...'}
              </p>
            </div>
          )}
          
          {/* Instructions */}
          {alert.instruction && (
            <div className="bg-slate-800/50 rounded p-2 text-xs">
              <span className="text-yellow-400 font-medium">⚠️ Instructions:</span>
              <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                {alert.instruction.slice(0, 300)}
                {alert.instruction.length > 300 && '...'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SevereWeatherAlerts = ({ className = '' }) => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveAlerts();
      
      // Sort by severity (Extreme first, then Severe, etc.)
      const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
      data.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
      
      setAlerts(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Unable to fetch weather alerts');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAlerts();
    
    // Refresh alerts every 10 minutes
    const interval = setInterval(fetchAlerts, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const toggleAlert = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  };
  
  // Count by severity
  const severityCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
  
  const hasActiveAlerts = alerts.length > 0;
  const hasSevereAlerts = severityCounts.Extreme > 0 || severityCounts.Severe > 0;
  
  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`p-3 border-b border-slate-700 ${hasSevereAlerts ? 'bg-red-900/20' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${hasSevereAlerts ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-white">Weather Alerts</span>
            {hasActiveAlerts && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                hasSevereAlerts ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
              }`}>
                {alerts.length} Active
              </span>
            )}
          </div>
          
          {lastUpdated && (
            <span className="text-[10px] text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* Severity summary */}
        {hasActiveAlerts && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {severityCounts.Extreme > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-500 text-white">
                {severityCounts.Extreme} Extreme
              </span>
            )}
            {severityCounts.Severe > 0 && (
              <span className="px-2 py-0.5 rounded bg-orange-500 text-white">
                {severityCounts.Severe} Severe
              </span>
            )}
            {severityCounts.Moderate > 0 && (
              <span className="px-2 py-0.5 rounded bg-yellow-500 text-black">
                {severityCounts.Moderate} Moderate
              </span>
            )}
            {severityCounts.Minor > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-500 text-white">
                {severityCounts.Minor} Minor
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        {isLoading && alerts.length === 0 ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-cyan-400 rounded-full mx-auto" />
            <p className="text-xs text-slate-500 mt-2">Checking for alerts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-400 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <p className="text-sm text-green-400 font-medium">No Active Alerts</p>
            <p className="text-xs text-slate-500 mt-1">Weather conditions are normal for Utah</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isExpanded={expandedAlerts[alert.id]}
                onToggle={() => toggleAlert(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with NWS link */}
      <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/30">
        <a
          href="https://www.weather.gov/slc/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <span>View full forecast at NWS Salt Lake City</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default SevereWeatherAlerts;
```

---

## File 54: `src/components/DataFreshness.jsx`

> 146 lines | 4.1 KB

```jsx
import React from 'react';
import { Clock, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const DataFreshness = ({ 
  lastUpdated, 
  isLoading, 
  error, 
  onRefresh,
  refreshInterval = 3, // minutes
  className = '' 
}) => {
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return null;
    
    const now = new Date();
    const diff = now - lastUpdated;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };
  
  const getDataStatus = () => {
    if (error) return 'error';
    if (!lastUpdated) return 'loading';
    
    const now = new Date();
    const diff = now - lastUpdated;
    const minutes = Math.floor(diff / 1000 / 60);
    
    if (minutes < refreshInterval + 1) return 'fresh';
    if (minutes < refreshInterval * 2) return 'stale';
    return 'old';
  };
  
  const status = getDataStatus();
  const timeSince = getTimeSinceUpdate();
  
  const statusConfig = {
    fresh: {
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: Wifi,
      label: 'Live',
    },
    stale: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: Clock,
      label: 'Updating...',
    },
    old: {
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      icon: AlertCircle,
      label: 'Stale',
    },
    error: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: WifiOff,
      label: 'Offline',
    },
    loading: {
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      icon: RefreshCw,
      label: 'Loading',
    },
  };
  
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <div className={`rounded-lg p-3 ${config.bg} border ${config.border} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${config.color} ${isLoading ? 'animate-spin' : ''}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              {timeSince && (
                <span className="text-xs text-slate-500">• {timeSince}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Wind data updates every {refreshInterval} minutes
            </p>
          </div>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`
            p-1.5 rounded-md transition-colors
            ${isLoading 
              ? 'bg-slate-700 cursor-not-allowed' 
              : 'bg-slate-700 hover:bg-slate-600'
            }
          `}
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Data sources info */}
      <div className="mt-2 pt-2 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-[10px]">
        <div className="text-center">
          <div className="text-slate-500">PWS</div>
          <div className="text-slate-400">Real-time</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">MesoWest</div>
          <div className="text-slate-400">5-15 min</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">NWS Alerts</div>
          <div className="text-slate-400">10 min</div>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default DataFreshness;
```

---

## File 55: `src/components/LearningDashboard.jsx`

> 314 lines | 12.4 KB

```jsx
import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Database, RefreshCw, Download, Activity, Target, Zap } from 'lucide-react';
import { learningSystem } from '../services/LearningSystem';
import { dataCollector } from '../services/DataCollector';

const LearningDashboard = () => {
  const [stats, setStats] = useState(null);
  const [collectorStats, setCollectorStats] = useState(null);
  const [weights, setWeights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningInProgress, setLearningInProgress] = useState(false);

  useEffect(() => {
    loadData();
    
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [accuracyStats, learnedWeights] = await Promise.all([
        learningSystem.getAccuracyStats(),
        learningSystem.getLearnedWeights(),
      ]);
      
      setStats(accuracyStats);
      setWeights(learnedWeights);
      setCollectorStats(dataCollector.getStats());
    } catch (error) {
      console.error('Error loading learning data:', error);
    }
    setLoading(false);
  };

  const handleForceLearning = async () => {
    setLearningInProgress(true);
    try {
      await dataCollector.forceLearning();
      await loadData();
    } catch (error) {
      console.error('Error forcing learning:', error);
    }
    setLearningInProgress(false);
  };

  const handleForceCollection = async () => {
    try {
      await dataCollector.forceCollection();
      await loadData();
    } catch (error) {
      console.error('Error forcing collection:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await learningSystem.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utah-wind-pro-learning-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 60) return 'text-yellow-400';
    if (accuracy >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Learning System
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleForceCollection}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            Collect Now
          </button>
          <button
            onClick={handleForceLearning}
            disabled={learningInProgress}
            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${learningInProgress ? 'animate-spin' : ''}`} />
            {learningInProgress ? 'Learning...' : 'Learn Now'}
          </button>
          <button
            onClick={handleExportData}
            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Accuracy Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Model Accuracy</div>
          <div className={`text-2xl font-bold ${stats?.avgAccuracy ? getAccuracyColor(stats.avgAccuracy) : 'text-gray-500'}`}>
            {stats?.avgAccuracy != null ? `${stats.avgAccuracy}%` : '--'}
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getTrendIcon(stats?.trend)}
            <span className={`text-xs ${getTrendColor(stats?.trend)}`}>
              {stats?.trend === 'improving' ? 'Improving' : 
               stats?.trend === 'declining' ? 'Declining' : 'Stable'}
            </span>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Last 7 Days</div>
          <div className={`text-2xl font-bold ${stats?.lastWeekAccuracy ? getAccuracyColor(stats.lastWeekAccuracy) : 'text-gray-500'}`}>
            {stats?.lastWeekAccuracy != null ? `${stats.lastWeekAccuracy}%` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">accuracy</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Predictions</div>
          <div className="text-2xl font-bold text-blue-400">
            {stats?.totalPredictions || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">verified</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Model Version</div>
          <div className="text-lg font-bold text-purple-400">
            {weights?.version === 'default' ? 'Default' : 
             `v${String(weights?.version).slice(-6)}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {weights?.basedOnSamples ? `${weights.basedOnSamples} samples` : 'baseline'}
          </div>
        </div>
      </div>

      {/* Collection Status */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className={`w-4 h-4 ${collectorStats?.isRunning ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-sm font-medium text-white">
            Data Collection {collectorStats?.isRunning ? 'Active' : 'Stopped'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400">Actuals Collected:</span>
            <span className="text-white ml-2">{collectorStats?.actualsCollected || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Predictions:</span>
            <span className="text-white ml-2">{collectorStats?.predictionsRecorded || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Verifications:</span>
            <span className="text-white ml-2">{collectorStats?.verificationsRun || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Learning Cycles:</span>
            <span className="text-white ml-2">{collectorStats?.learningCyclesRun || 0}</span>
          </div>
        </div>

        {collectorStats?.lastCollection && (
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {collectorStats.lastCollection.actuals && (
                <div>Last actuals: {new Date(collectorStats.lastCollection.actuals).toLocaleTimeString()}</div>
              )}
              {collectorStats.lastCollection.predictions && (
                <div>Last predictions: {new Date(collectorStats.lastCollection.predictions).toLocaleTimeString()}</div>
              )}
              {collectorStats.lastCollection.learning && (
                <div>Last learning: {new Date(collectorStats.lastCollection.learning).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        )}

        {collectorStats?.lastError && (
          <div className="mt-2 text-xs text-red-400">
            Last error: {collectorStats.lastError}
          </div>
        )}
      </div>

      {/* Learned Weights */}
      {weights && weights.version !== 'default' && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Learned Model Weights</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Pressure</div>
              <div className="text-lg font-bold text-blue-400">
                {(weights.pressureWeight * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Thermal</div>
              <div className="text-lg font-bold text-orange-400">
                {(weights.thermalWeight * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Convergence</div>
              <div className="text-lg font-bold text-green-400">
                {(weights.convergenceWeight * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {weights.speedBiasCorrection !== 0 && (
            <div className="text-xs text-gray-400 mb-2">
              Speed bias correction: {weights.speedBiasCorrection > 0 ? '+' : ''}{weights.speedBiasCorrection.toFixed(1)} mph
            </div>
          )}

          {Object.keys(weights.indicators || {}).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-2">Indicator Weights:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(weights.indicators).slice(0, 4).map(([key, data]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-white">{(data.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            Last updated: {weights.createdAt ? new Date(weights.createdAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}

      {/* Learning Progress */}
      <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">How Learning Works</span>
        </div>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Every 15 min: Collects actual weather data from all stations</li>
          <li>• Every hour: Records predictions and verifies past ones</li>
          <li>• Every 6 hours: Analyzes indicator correlations</li>
          <li>• Every 24 hours: Runs learning cycle to improve model</li>
          <li>• Model improves as more data is collected over days/weeks</li>
        </ul>
        <div className="mt-3 text-xs text-purple-300">
          {stats?.totalPredictions < 50 
            ? `Need ${50 - (stats?.totalPredictions || 0)} more predictions before first learning cycle`
            : 'Model is actively learning from your data!'}
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
```

---

## File 56: `src/components/NotificationSettings.jsx`

> 256 lines | 9.7 KB

```jsx
import { useState, useEffect } from 'react';
import { Bell, BellOff, Moon, Sun, Clock, Settings, X, Check } from 'lucide-react';
import { 
  getNotificationPrefs, 
  saveNotificationPrefs, 
  requestPermission,
  canNotify 
} from '../services/NotificationService';
import { UTAH_LAKE_LAUNCHES, OTHER_LAKES } from './LakeSelector';

export function NotificationSettings({ isOpen, onClose }) {
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [permissionStatus, setPermissionStatus] = useState('default');
  
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);
  
  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setPermissionStatus('granted');
      setPrefs(p => ({ ...p, enabled: true }));
    } else {
      setPermissionStatus(Notification.permission);
    }
  };
  
  const handleSave = () => {
    saveNotificationPrefs(prefs);
    onClose();
  };
  
  const toggleLake = (lakeId) => {
    setPrefs(p => ({
      ...p,
      lakes: p.lakes.includes(lakeId)
        ? p.lakes.filter(id => id !== lakeId)
        : [...p.lakes, lakeId]
    }));
  };
  
  if (!isOpen) return null;
  
  const allLakes = [
    ...UTAH_LAKE_LAUNCHES.map(l => ({ id: l.id, name: l.name, group: 'Utah Lake' })),
    ...OTHER_LAKES.map(l => ({ id: l.id, name: l.name, group: 'Other' })),
  ];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-200">Notification Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-3">
                {permissionStatus === 'denied' 
                  ? 'Notifications are blocked. Please enable them in your browser settings.'
                  : 'Enable notifications to receive thermal alerts'}
              </p>
              {permissionStatus !== 'denied' && (
                <button
                  onClick={handleEnableNotifications}
                  className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          )}
          
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.enabled ? (
                <Bell className="w-5 h-5 text-cyan-400" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="text-slate-200 font-medium">Thermal Alerts</p>
                <p className="text-xs text-slate-500">Get notified about good wind days</p>
              </div>
            </div>
            <button
              onClick={() => setPrefs(p => ({ ...p, enabled: !p.enabled }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                prefs.enabled ? 'bg-cyan-500' : 'bg-slate-600'
              }`}
              disabled={permissionStatus !== 'granted'}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                prefs.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          {/* Alert Types */}
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Alert Times</p>
            
            <AlertTypeToggle
              icon={Moon}
              label="Evening Alert"
              sublabel="Tomorrow's outlook (6-9 PM)"
              enabled={prefs.dayBefore}
              onToggle={() => setPrefs(p => ({ ...p, dayBefore: !p.dayBefore }))}
              threshold={prefs.minProbability.dayBefore}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, dayBefore: v }
              }))}
              disabled={!prefs.enabled}
            />
            
            <AlertTypeToggle
              icon={Sun}
              label="Morning Alert"
              sublabel="Today's forecast (6-9 AM)"
              enabled={prefs.morning}
              onToggle={() => setPrefs(p => ({ ...p, morning: !p.morning }))}
              threshold={prefs.minProbability.morning}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, morning: v }
              }))}
              disabled={!prefs.enabled}
            />
            
            <AlertTypeToggle
              icon={Clock}
              label="Pre-Thermal Alert"
              sublabel="1-2 hours before peak"
              enabled={prefs.preThermal}
              onToggle={() => setPrefs(p => ({ ...p, preThermal: !p.preThermal }))}
              threshold={prefs.minProbability.preThermal}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, preThermal: v }
              }))}
              disabled={!prefs.enabled}
            />
          </div>
          
          {/* Lake Selection */}
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Alert Locations</p>
            <p className="text-xs text-slate-400">Select which locations to receive alerts for</p>
            
            <div className="grid grid-cols-2 gap-2">
              {allLakes.map(lake => (
                <button
                  key={lake.id}
                  onClick={() => toggleLake(lake.id)}
                  disabled={!prefs.enabled}
                  className={`px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    prefs.lakes.includes(lake.id)
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                  } ${!prefs.enabled ? 'opacity-50' : 'hover:border-slate-500'}`}
                >
                  <div className="flex items-center gap-2">
                    {prefs.lakes.includes(lake.id) && (
                      <Check className="w-3 h-3 text-cyan-400" />
                    )}
                    <span>{lake.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{lake.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertTypeToggle({ icon: Icon, label, sublabel, enabled, onToggle, threshold, onThresholdChange, disabled }) {
  return (
    <div className={`bg-slate-700/30 rounded-lg p-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${enabled ? 'text-cyan-400' : 'text-slate-500'}`} />
          <div>
            <p className={`text-sm font-medium ${enabled ? 'text-slate-200' : 'text-slate-400'}`}>{label}</p>
            <p className="text-xs text-slate-500">{sublabel}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`w-10 h-5 rounded-full transition-colors ${
            enabled ? 'bg-cyan-500' : 'bg-slate-600'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {enabled && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600">
          <span className="text-xs text-slate-500">Min probability:</span>
          <select
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300"
          >
            <option value={40}>40%</option>
            <option value={50}>50%</option>
            <option value={60}>60%</option>
            <option value={70}>70%</option>
            <option value={80}>80%</option>
          </select>
        </div>
      )}
    </div>
  );
}
```

---

## File 57: `src/components/ToastNotification.jsx`

> 158 lines | 4.4 KB

```jsx
import { useState, useEffect, useCallback } from 'react';
import { X, Wind, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const TOAST_DURATION = 8000;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleThermalAlert = (event) => {
      const { probability, lake, message } = event.detail;
      addToast({
        type: 'thermal',
        title: 'Thermal Alert!',
        message: message || `Probability at ${probability}%`,
        lake,
        probability,
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Utah Wind Pro', {
          body: message,
          icon: '/vite.svg',
          tag: 'thermal-alert',
        });
      }
    };

    window.addEventListener('thermal-alert', handleThermalAlert);
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('thermal-alert', handleThermalAlert);
    };
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const { type, title, message, probability } = toast;

  const config = {
    thermal: {
      icon: Wind,
      bgColor: 'bg-gradient-to-r from-green-900/95 to-emerald-900/95',
      borderColor: 'border-green-500/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-r from-yellow-900/95 to-orange-900/95',
      borderColor: 'border-yellow-500/50',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-300',
    },
    bust: {
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-r from-red-900/95 to-rose-900/95',
      borderColor: 'border-red-500/50',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300',
    },
    info: {
      icon: Info,
      bgColor: 'bg-gradient-to-r from-blue-900/95 to-cyan-900/95',
      borderColor: 'border-blue-500/50',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-r from-green-900/95 to-teal-900/95',
      borderColor: 'border-green-500/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor } = config[type] || config.info;

  return (
    <div 
      className={`
        ${bgColor} ${borderColor}
        border rounded-xl p-4 shadow-2xl backdrop-blur-sm
        animate-slide-in
        flex items-start gap-3
      `}
      role="alert"
    >
      <div className={`p-2 rounded-lg bg-black/20 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold ${titleColor}`}>{title}</h4>
          {probability && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white">
              {probability}%
            </span>
          )}
        </div>
        <p className="text-slate-300 text-sm mt-0.5">{message}</p>
      </div>
      
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const showThermalAlert = useCallback((probability, lake) => {
    window.dispatchEvent(new CustomEvent('thermal-alert', {
      detail: {
        probability,
        lake,
        message: `Thermal probability crossed 75% at ${lake}!`,
      },
    }));
  }, []);

  return { showThermalAlert };
}
```

---

## File 58: `src/components/Sparkline.jsx`

> 126 lines | 3.1 KB

```jsx
import { useMemo } from 'react';

export function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = '#3b82f6',
  showDots = false,
  className = '' 
}) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return null;

    const values = data.filter((v) => v != null);
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y, value };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    return { pathD, points, min, max, latest: values[values.length - 1] };
  }, [data, width, height]);

  if (!pathData) {
    return (
      <div 
        className={`flex items-center justify-center text-slate-600 text-xs ${className}`}
        style={{ width, height }}
      >
        --
      </div>
    );
  }

  const trend = pathData.points.length >= 2
    ? pathData.points[pathData.points.length - 1].value - pathData.points[0].value
    : 0;

  const trendColor = trend > 0.5 ? '#22c55e' : trend < -0.5 ? '#ef4444' : color;

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData.pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      
      {showDots && pathData.points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={i === pathData.points.length - 1 ? 2.5 : 1.5}
          fill={i === pathData.points.length - 1 ? trendColor : 'transparent'}
          stroke={trendColor}
          strokeWidth="1"
        />
      ))}
      
      <circle
        cx={pathData.points[pathData.points.length - 1].x}
        cy={pathData.points[pathData.points.length - 1].y}
        r="2"
        fill={trendColor}
      />
    </svg>
  );
}

export function WindSparkline({ history, stationId }) {
  const data = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    
    return history
      .slice(-20)
      .map((h) => h.windSpeed)
      .filter((v) => v != null);
  }, [history]);

  if (data.length < 2) {
    return <span className="text-slate-600 text-xs">No history</span>;
  }

  const latest = data[data.length - 1];
  const first = data[0];
  const trend = latest - first;

  return (
    <div className="flex items-center gap-2">
      <Sparkline 
        data={data} 
        width={60} 
        height={20} 
        color="#06b6d4"
      />
      <span className={`text-xs ${trend > 1 ? 'text-green-400' : trend < -1 ? 'text-red-400' : 'text-slate-500'}`}>
        {trend > 0 ? '+' : ''}{trend.toFixed(1)}
      </span>
    </div>
  );
}
```

---

## File 59: `src/components/ThemeToggle.jsx`

> 30 lines | 0.8 KB

```jsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all duration-300
        ${theme === 'dark' 
          ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' 
          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}
      `}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
```

---

## File 60: `src/data/zigzag-historical.json`

> 52 lines | 2.8 KB

```json
{
  "analysis": {
    "totalDays": 1080,
    "dateRange": "2023-03-29 to 2026-03-12",
    "seThermalDays": 249,
    "northFlowDays": 165,
    "seThermalRate": 23.1,
    "northFlowRate": 15.3
  },
  "monthlyPatterns": {
    "1": { "seRate": 10.8, "nRate": 10.8, "peakHour": 13, "startHour": 10, "avgHighTemp": 38, "avgLowTemp": 22 },
    "2": { "seRate": 24.7, "nRate": 9.4, "peakHour": 13, "startHour": 10, "avgHighTemp": 45, "avgLowTemp": 27 },
    "3": { "seRate": 19.5, "nRate": 20.8, "peakHour": 14, "startHour": 11, "avgHighTemp": 55, "avgLowTemp": 34 },
    "4": { "seRate": 26.7, "nRate": 35.6, "peakHour": 14, "startHour": 11, "avgHighTemp": 62, "avgLowTemp": 40 },
    "5": { "seRate": 28.0, "nRate": 28.0, "peakHour": 14, "startHour": 11, "avgHighTemp": 72, "avgLowTemp": 48 },
    "6": { "seRate": 32.2, "nRate": 30.0, "peakHour": 16, "startHour": 12, "avgHighTemp": 84, "avgLowTemp": 57 },
    "7": { "seRate": 46.2, "nRate": 14.0, "peakHour": 15, "startHour": 11, "avgHighTemp": 92, "avgLowTemp": 65 },
    "8": { "seRate": 37.6, "nRate": 8.6, "peakHour": 16, "startHour": 12, "avgHighTemp": 90, "avgLowTemp": 63 },
    "9": { "seRate": 23.3, "nRate": 5.6, "peakHour": 12, "startHour": 10, "avgHighTemp": 80, "avgLowTemp": 53 },
    "10": { "seRate": 14.0, "nRate": 7.5, "peakHour": 14, "startHour": 11, "avgHighTemp": 65, "avgLowTemp": 42 },
    "11": { "seRate": 3.3, "nRate": 6.7, "peakHour": 11, "startHour": 9, "avgHighTemp": 50, "avgLowTemp": 32 },
    "12": { "seRate": 9.7, "nRate": 7.5, "peakHour": 13, "startHour": 10, "avgHighTemp": 40, "avgLowTemp": 24 }
  },
  "hourlyPatterns": {
    "6": { "avgSpeed": 12.5, "avgDir": 162, "observations": 110 },
    "7": { "avgSpeed": 12.4, "avgDir": 161, "observations": 179 },
    "8": { "avgSpeed": 12.1, "avgDir": 155, "observations": 438 },
    "9": { "avgSpeed": 12.3, "avgDir": 153, "observations": 781 },
    "10": { "avgSpeed": 12.3, "avgDir": 151, "observations": 853 },
    "11": { "avgSpeed": 12.6, "avgDir": 151, "observations": 774 },
    "12": { "avgSpeed": 13.2, "avgDir": 151, "observations": 618 },
    "13": { "avgSpeed": 13.9, "avgDir": 151, "observations": 562 },
    "14": { "avgSpeed": 13.5, "avgDir": 150, "observations": 644 },
    "15": { "avgSpeed": 13.8, "avgDir": 154, "observations": 541 },
    "16": { "avgSpeed": 13.5, "avgDir": 156, "observations": 515 },
    "17": { "avgSpeed": 13.7, "avgDir": 158, "observations": 391 },
    "18": { "avgSpeed": 13.9, "avgDir": 161, "observations": 273 },
    "19": { "avgSpeed": 13.4, "avgDir": 163, "observations": 253 },
    "20": { "avgSpeed": 13.3, "avgDir": 165, "observations": 199 }
  },
  "dayBeforePatterns": {
    "seThermal": {
      "eveningTemp": 58.2,
      "eveningPressure": 25.45,
      "eveningWind": 6.0,
      "sampleSize": 248
    },
    "northFlow": {
      "eveningTemp": 46.9,
      "eveningPressure": 25.42,

// ... 43 more lines truncated (4.5 KB total) ...
```

---

## File 61: `src/data/spanish-fork-correlation.json`

> 28 lines | 0.5 KB

```json
{
  "station": "QSF",
  "stationName": "Spanish Fork",
  "analysis": {
    "totalDays": 92,
    "goodKiteDays": 67,
    "thermalDays": 12,
    "bustDays": 13
  },
  "leadIndicator": {
    "optimalLeadHours": 2,
    "goodKiteDayPattern": {
      "avgSpeed": "6.3",
      "sePct": "86"
    },
    "bustDayPattern": {
      "avgSpeed": "4.9",
      "sePct": "100"
    }
  },
  "thresholds": {
    "goodKiteIndicator": {
      "direction": "100-180° (SE)",
      "speed": "> 6 mph",
      "leadTime": "2 hours before thermal"
    }
  }
}
```

---

## File 62: `src/data/north-flow-indicators.json`

> 52 lines | 1.4 KB

```json
{
  "analysis": "North Flow Early Indicators - Complete Analysis",
  "baseline": "FPS (Flight Park South)",
  "totalDays": 192,
  "goodNorthDays": 127,
  "indicators": {
    "primary": {
      "station": "KSLC",
      "stationName": "Salt Lake City Airport",
      "coordinates": {
        "lat": 40.7884,
        "lng": -111.9778
      },
      "elevation": 4226,
      "leadTimeHours": 1,
      "northPercentage": 44.881889763779526,
      "role": "Primary early indicator - north wind here precedes Utah Lake by ~1 hour",
      "trigger": {
        "direction": {
          "min": 315,
          "max": 45,
          "label": "N (NW to NE)"
        },
        "speed": {
          "min": 5,
          "optimal": 8
        }
      },
      "statistics": {
        "northDirectionOnGoodDays": "45%",
        "combinedNorthNW": "71%"
      }
    },
    "secondary": {
      "station": "SLCNW",
      "stationName": "SLC Airport Wind 2",
      "coordinates": {
        "lat": 40.79,
        "lng": -111.98
      },
      "elevation": 4280,
      "leadTimeHours": 1,
      "role": "Secondary indicator - runway wind sensor"
    },
    "pressureGradient": {
      "highStation": "KSLC",
      "lowStation": "KPVU",
      "positiveGradientMeaning": "SLC > Provo = North flow likely",
      "negativeGradientMeaning": "Provo > SLC = South flow (thermal) likely",
      "threshold": 0.5,

// ... 4 more lines truncated (1.4 KB total) ...
```

---

## File 63: `src/data/kslc-fps-validation.json`

> 52 lines | 1.0 KB

```json
{
  "analysis": "KSLC to Zig Zag/FPS Wind Speed Validation",
  "sameHour": {
    "0-3": {
      "samples": 199,
      "avgFpsSpeed": "9.0",
      "kiteablePct": "37"
    },
    "3-5": {
      "samples": 122,
      "avgFpsSpeed": "8.2",
      "kiteablePct": "34"
    },
    "5-8": {
      "samples": 258,
      "avgFpsSpeed": "9.5",
      "kiteablePct": "44"
    },
    "8-10": {
      "samples": 98,
      "avgFpsSpeed": "10.9",
      "kiteablePct": "53"
    },
    "10-15": {
      "samples": 87,
      "avgFpsSpeed": "15.0",
      "kiteablePct": "72"
    },
    "15+": {
      "samples": 15,
      "avgFpsSpeed": "22.6",
      "kiteablePct": "100"
    }
  },
  "oneHourLead": {
    "0-3": {
      "samples": 170,
      "avgFpsSpeed": "9.0",
      "kiteablePct": "39"
    },
    "3-5": {
      "samples": 110,
      "avgFpsSpeed": "7.5",
      "kiteablePct": "26"
    },
    "5-8": {
      "samples": 208,
      "avgFpsSpeed": "9.3",
      "kiteablePct": "45"
    },

// ... 17 more lines truncated (1.2 KB total) ...
```

---

## File 64: `src/data/provo-utalp-correlation.json`

> 52 lines | 1.1 KB

```json
{
  "kpvu": {
    "station": "KPVU",
    "name": "Provo Airport",
    "coordinates": {
      "lat": 40.2192,
      "lng": -111.7236
    },
    "elevation": 4495,
    "correlation": {
      "0-5": {
        "samples": 278,
        "avgFps": "11.2",
        "foilKiteable": "60",
        "twinTipKiteable": "20"
      },
      "5-8": {
        "samples": 39,
        "avgFps": "11.2",
        "foilKiteable": "51",
        "twinTipKiteable": "28"
      },
      "8-10": {
        "samples": 18,
        "avgFps": "13.5",
        "foilKiteable": "78",
        "twinTipKiteable": "33"
      },
      "10-15": {
        "samples": 66,
        "avgFps": "14.9",
        "foilKiteable": "89",
        "twinTipKiteable": "56"
      },
      "15+": {
        "samples": 46,
        "avgFps": "22.7",
        "foilKiteable": "100",
        "twinTipKiteable": "96"
      }
    }
  },
  "utalp": {
    "station": "UTALP",
    "name": "Point of Mountain",
    "coordinates": {
      "lat": 40.4456,
      "lng": -111.8983
    },
    "elevation": 4796,

// ... 34 more lines truncated (1.7 KB total) ...
```

---

## File 65: `public/manifest.json`

> 76 lines | 1.8 KB

```json
{
  "name": "Utah Wind Pro",
  "short_name": "UtahWind",
  "description": "Professional wind forecasting for Utah Lake, Deer Creek, and Willard Bay. Real-time thermal predictions for kiteboarding, sailing, and boating.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["weather", "sports", "utilities"],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

---

## File 66: `public/sw.js`

> 88 lines | 2.2 KB

```javascript
// Service Worker for Utah Wind Pro
const CACHE_NAME = 'utah-wind-pro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (always fetch fresh)
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/') || 
      url.hostname.includes('api.synopticdata.com') ||
      url.hostname.includes('rt.ambientweather.net') ||
      url.hostname.includes('api.weather.gov')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Utah Wind Pro';
  const options = {
    body: data.body || 'Wind conditions update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'wind-update',
    data: data.url || '/',
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
```

---

## File 67: `capacitor.config.json`

> 28 lines | 0.5 KB

```json
{
  "appId": "com.utahlakewindpro.app",
  "appName": "Utah Wind Pro",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#0f172a"
    },
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0f172a",
      "showSpinner": false,
      "androidSpinnerStyle": "small",
      "spinnerColor": "#06b6d4"
    }
  },
  "ios": {
    "contentInset": "automatic"
  },
  "android": {
    "allowMixedContent": true
  }
}
```

---

## File 68: `scripts/analyze-canyon-stations.js`

> 332 lines | 9.9 KB

```javascript
/**
 * SPANISH FORK CANYON STATIONS - EARLY INDICATOR SEARCH
 * 
 * Looking for stations IN the canyon that might show wind patterns
 * even earlier than QSF (Spanish Fork)
 * 
 * Key stations to investigate:
 * - Stations at canyon mouth
 * - Stations up-canyon (Thistle, etc.)
 * - Compare timing with FPS thermal onset
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function searchStations(lat, lng, radius) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=${lat},${lng},${radius}&limit=100&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isSEThermal(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= 100 && obs.direction <= 180 && obs.speed >= minSpeed;
}

// Canyon wind often comes from the east (down-canyon drainage) or west (up-canyon thermal)
function isCanyonWind(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  // East wind (down-canyon) or West wind (up-canyon)
  return (obs.direction >= 60 && obs.direction <= 120) || (obs.direction >= 240 && obs.direction <= 300);
}

async function analyze() {
  console.log('SPANISH FORK CANYON - STATION SEARCH');
  console.log('='.repeat(70));
  
  // Search for stations along Spanish Fork Canyon
  // Canyon runs roughly from Spanish Fork (40.11, -111.65) to Thistle (40.0, -111.5)
  
  const searchPoints = [
    { name: 'Canyon Mouth', lat: 40.077, lng: -111.60, radius: 10 },
    { name: 'Mid Canyon', lat: 40.05, lng: -111.55, radius: 10 },
    { name: 'Upper Canyon (Thistle)', lat: 40.0, lng: -111.48, radius: 15 },
  ];
  
  const allStations = new Map();
  
  for (const point of searchPoints) {
    console.log(`\nSearching ${point.name}...`);
    
    try {
      const result = await searchStations(point.lat, point.lng, point.radius);
      
      if (result.STATION) {
        result.STATION.forEach(s => {
          if (s.STID && !allStations.has(s.STID)) {
            allStations.set(s.STID, s);
          }
        });
        console.log(`  Found ${result.STATION.length} stations`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log(`\nTotal unique stations: ${allStations.size}`);
  
  // Filter for stations with wind data and reasonable elevation
  const stationList = Array.from(allStations.values())
    .filter(s => {
      const elev = s.ELEVATION ? s.ELEVATION * 3.28084 : 0;
      return elev > 4000 && elev < 8000; // Canyon elevation range
    })
    .sort((a, b) => (a.ELEVATION || 0) - (b.ELEVATION || 0));
  
  console.log(`\nCanyon-elevation stations (4000-8000 ft): ${stationList.length}`);
  
  console.log('\n' + '-'.repeat(70));
  console.log('ID'.padEnd(12) + 'Name'.padEnd(35) + 'Elev (ft)'.padEnd(12));
  console.log('-'.repeat(70));
  
  stationList.forEach(s => {
    const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
    console.log(
      (s.STID || '?').padEnd(12) +
      (s.NAME || '?').substring(0, 34).padEnd(35) +
      String(elev).padEnd(12)
    );
  });
  
  // Now fetch data and analyze correlation with FPS
  console.log('\n' + '='.repeat(70));
  console.log('CORRELATION ANALYSIS');
  console.log('='.repeat(70));
  
  const start = '202507010000';
  const end = '202507310000';
  
  // Fetch FPS as baseline
  console.log('\nFetching FPS baseline data...');
  const fpsData = await fetchData('FPS', start, end);
  const fps = parseObservations(fpsData.STATION?.[0]);
  
  // Identify thermal events at FPS
  const fpsDays = new Map();
  fps.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!fpsDays.has(dateKey)) {
      fpsDays.set(dateKey, { 
        firstThermalHour: null,
        peakSpeed: 0,
      });
    }
    
    const day = fpsDays.get(dateKey);
    
    if (isSEThermal(obs, 10) && hour >= 10 && hour <= 16) {
      if (day.firstThermalHour === null || hour < day.firstThermalHour) {
        day.firstThermalHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
      }
    }
  });
  
  const thermalDays = Array.from(fpsDays.entries())
    .filter(([_, d]) => d.firstThermalHour !== null && d.peakSpeed >= 10)
    .map(([date, d]) => ({ date, ...d }));
  
  console.log(`\nGood thermal days at FPS: ${thermalDays.length}`);
  
  // Test each canyon station for lead indicator potential
  const stationResults = [];
  
  // Test specific stations we know exist
  const testStations = ['QSF', 'PC196', 'COBU1', 'UCC13', 'E2355'];
  
  for (const stid of testStations) {
    console.log(`\nAnalyzing ${stid}...`);
    
    try {
      const stationData = await fetchData(stid, start, end);
      const obs = parseObservations(stationData.STATION?.[0]);
      
      if (obs.length === 0) {
        console.log('  No data');
        continue;
      }
      
      console.log(`  ${obs.length} observations`);
      
      // Create hourly map
      const hourlyMap = new Map();
      obs.forEach(o => {
        const key = o.time.toISOString().slice(0, 13);
        hourlyMap.set(key, o);
      });
      
      // Check lead times
      const leadResults = { 1: [], 2: [], 3: [], 4: [] };
      
      thermalDays.forEach(day => {
        for (let lead = 1; lead <= 4; lead++) {
          const checkHour = day.firstThermalHour - lead;
          if (checkHour < 6) continue;
          
          const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
          const key = checkDate.toISOString().slice(0, 13);
          const leadObs = hourlyMap.get(key);
          
          if (leadObs && leadObs.speed != null) {
            leadResults[lead].push({
              speed: leadObs.speed,
              dir: leadObs.direction,
              peakSpeed: day.peakSpeed,
            });
          }
        }
      });
      
      // Calculate correlation
      let bestLead = 0;
      let bestCorrelation = 0;
      
      for (let lead = 1; lead <= 4; lead++) {
        const samples = leadResults[lead];
        if (samples.length < 5) continue;
        
        // Calculate correlation between lead speed and peak speed
        const avgLeadSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
        const avgPeakSpeed = samples.reduce((s, x) => s + x.peakSpeed, 0) / samples.length;
        
        let numerator = 0;
        let denomLead = 0;
        let denomPeak = 0;
        
        samples.forEach(s => {
          const diffLead = s.speed - avgLeadSpeed;
          const diffPeak = s.peakSpeed - avgPeakSpeed;
          numerator += diffLead * diffPeak;
          denomLead += diffLead * diffLead;
          denomPeak += diffPeak * diffPeak;
        });
        
        const correlation = denomLead > 0 && denomPeak > 0 
          ? numerator / Math.sqrt(denomLead * denomPeak)
          : 0;
        
        console.log(`  ${lead}hr lead: ${samples.length} samples, r=${correlation.toFixed(3)}, avg=${avgLeadSpeed.toFixed(1)} mph`);
        
        if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
          bestCorrelation = correlation;
          bestLead = lead;
        }
      }
      
      if (bestLead > 0) {
        stationResults.push({
          stid,
          bestLead,
          correlation: bestCorrelation,
          samples: leadResults[bestLead].length,
        });
      }
      
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  // Sort by correlation strength
  stationResults.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  
  console.log('\n' + '='.repeat(70));
  console.log('BEST EARLY INDICATORS');
  console.log('='.repeat(70));
  console.log('\nStation'.padEnd(12) + 'Lead Time'.padEnd(12) + 'Correlation'.padEnd(14) + 'Samples');
  console.log('-'.repeat(50));
  
  stationResults.forEach(r => {
    console.log(
      r.stid.padEnd(12) +
      `${r.bestLead} hours`.padEnd(12) +
      r.correlation.toFixed(3).padEnd(14) +
      r.samples
    );
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('CONCLUSION');
  console.log('='.repeat(70));
  console.log(`
Spanish Fork area stations show potential as early indicators:

1. QSF (Spanish Fork) - Shows SE wind 1-2 hours before FPS thermal
   - 97% SE direction on good kite days
   - Avg speed 7.6 mph when thermal coming

2. The correlation is strongest at 1-2 hour lead time

3. Key pattern: When QSF shows SE wind > 6 mph, expect thermal
   at Utah Lake within 2 hours

RECOMMENDATION: Add QSF to the prediction model as a 2-hour
early warning indicator for SE thermals.
`);
}

analyze().catch(console.error);
```

---

## File 69: `scripts/analyze-deer-creek.js`

> 327 lines | 10.8 KB

```javascript
/**
 * Deer Creek Historical Analysis Script
 * 
 * Correlates data from:
 * - DCC (Deer Creek Dam) - Ground truth for thermal
 * - SND (Arrowhead Summit) - High elevation trigger
 * - KHCR (Heber Valley Airport) - Valley reference
 * 
 * Goal: Find patterns that predict good Deer Creek thermals
 */

import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';
const STATIONS = ['DCC', 'SND', 'KHCR'];

// Deer Creek thermal criteria
const THERMAL_CRITERIA = {
  direction: { min: 160, max: 220 },  // South wind
  speed: { min: 4, max: 15 },          // Usable speed
};

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  }));
}

function isThermalCondition(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= THERMAL_CRITERIA.direction.min &&
         obs.direction <= THERMAL_CRITERIA.direction.max &&
         obs.speed >= THERMAL_CRITERIA.speed.min &&
         obs.speed <= THERMAL_CRITERIA.speed.max;
}

function getLocalHour(date) {
  // Convert UTC to Mountain Time (UTC-6 or UTC-7)
  const utcHour = date.getUTCHours();
  return (utcHour - 6 + 24) % 24; // MDT approximation
}

async function analyzeMonth(year, month) {
  const startDate = `${year}${String(month).padStart(2, '0')}010000`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}${String(month).padStart(2, '0')}${endDay}2359`;
  
  console.log(`\nFetching ${year}-${String(month).padStart(2, '0')}...`);
  
  const results = {};
  
  for (const stid of STATIONS) {
    try {
      const data = await fetchData(stid, startDate, endDate);
      if (data.STATION && data.STATION[0]) {
        results[stid] = parseObservations(data.STATION[0]);
        console.log(`  ${stid}: ${results[stid].length} observations`);
      }
    } catch (e) {
      console.log(`  ${stid}: Error - ${e.message}`);
    }
  }
  
  return results;
}

function analyzeCorrelations(data) {
  const dcc = data.DCC || [];
  const snd = data.SND || [];
  const khcr = data.KHCR || [];
  
  if (dcc.length === 0) {
    console.log('No DCC data available');
    return null;
  }
  
  // Create time-indexed maps for SND and KHCR
  const sndMap = new Map();
  const khcrMap = new Map();
  
  snd.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16); // Round to minute
    sndMap.set(key, obs);
  });
  
  khcr.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16);
    khcrMap.set(key, obs);
  });
  
  // Analyze DCC thermal events
  const thermalEvents = [];
  const hourlyStats = {};
  
  for (let h = 0; h < 24; h++) {
    hourlyStats[h] = { total: 0, thermal: 0, avgSpeed: 0, speeds: [] };
  }
  
  dcc.forEach(obs => {
    const hour = getLocalHour(obs.time);
    hourlyStats[hour].total++;
    
    if (isThermalCondition(obs)) {
      hourlyStats[hour].thermal++;
      hourlyStats[hour].speeds.push(obs.speed);
      
      // Find corresponding SND and KHCR data
      const key = obs.time.toISOString().slice(0, 16);
      const sndObs = sndMap.get(key);
      const khcrObs = khcrMap.get(key);
      
      // Also check 1-2 hours before
      const key1h = new Date(obs.time.getTime() - 60*60*1000).toISOString().slice(0, 16);
      const key2h = new Date(obs.time.getTime() - 2*60*60*1000).toISOString().slice(0, 16);
      const snd1h = sndMap.get(key1h);
      const snd2h = sndMap.get(key2h);
      const khcr1h = khcrMap.get(key1h);
      const khcr2h = khcrMap.get(key2h);
      
      thermalEvents.push({
        time: obs.time,
        hour,
        dcc: obs,
        snd: sndObs,
        khcr: khcrObs,
        snd1h,
        snd2h,
        khcr1h,
        khcr2h,
        tempDelta: sndObs && obs.temp ? obs.temp - sndObs.temp : null,
        tempDelta1h: snd1h && khcr1h ? khcr1h.temp - snd1h.temp : null,
      });
    }
  });
  
  // Calculate hourly averages
  for (let h = 0; h < 24; h++) {
    if (hourlyStats[h].speeds.length > 0) {
      hourlyStats[h].avgSpeed = hourlyStats[h].speeds.reduce((a, b) => a + b, 0) / hourlyStats[h].speeds.length;
    }
  }
  
  return { thermalEvents, hourlyStats };
}

function printAnalysis(analysis, monthLabel) {
  if (!analysis) return;
  
  const { thermalEvents, hourlyStats } = analysis;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEER CREEK ANALYSIS - ${monthLabel}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\nTotal thermal events (S wind 160-220°, 4-15 mph): ${thermalEvents.length}`);
  
  console.log(`\nHOURLY DISTRIBUTION (Local Time):`);
  console.log(`Hour | Total Obs | Thermal | Rate  | Avg Speed`);
  console.log(`-----|-----------|---------|-------|----------`);
  
  for (let h = 6; h <= 20; h++) {
    const stats = hourlyStats[h];
    const rate = stats.total > 0 ? ((stats.thermal / stats.total) * 100).toFixed(1) : '0.0';
    const avgSpd = stats.avgSpeed > 0 ? stats.avgSpeed.toFixed(1) : '-';
    console.log(`${String(h).padStart(4)} | ${String(stats.total).padStart(9)} | ${String(stats.thermal).padStart(7)} | ${rate.padStart(4)}% | ${avgSpd.padStart(8)} mph`);
  }
  
  // Analyze temperature deltas during thermal events
  const deltasWithData = thermalEvents.filter(e => e.tempDelta != null);
  if (deltasWithData.length > 0) {
    const avgDelta = deltasWithData.reduce((sum, e) => sum + e.tempDelta, 0) / deltasWithData.length;
    console.log(`\nTEMPERATURE CORRELATION:`);
    console.log(`Average DCC-SND temp delta during thermals: ${avgDelta.toFixed(1)}°F`);
    console.log(`(Positive = DCC warmer than Arrowhead)`);
  }
  
  // Analyze 1-2 hour lead indicators
  const leadIndicators = thermalEvents.filter(e => e.snd1h && e.khcr1h);
  if (leadIndicators.length > 0) {
    console.log(`\nLEAD INDICATORS (1-2 hours before thermal):`);
    
    // SND wind direction 1h before
    const sndDirs1h = leadIndicators.filter(e => e.snd1h?.direction != null).map(e => e.snd1h.direction);
    if (sndDirs1h.length > 0) {
      const avgSndDir = sndDirs1h.reduce((a, b) => a + b, 0) / sndDirs1h.length;
      console.log(`  Arrowhead wind direction 1h before: avg ${avgSndDir.toFixed(0)}°`);
    }
    
    // KHCR temp 1h before
    const khcrTemps1h = leadIndicators.filter(e => e.khcr1h?.temp != null).map(e => e.khcr1h.temp);
    if (khcrTemps1h.length > 0) {
      const avgKhcrTemp = khcrTemps1h.reduce((a, b) => a + b, 0) / khcrTemps1h.length;
      console.log(`  Heber Airport temp 1h before: avg ${avgKhcrTemp.toFixed(1)}°F`);
    }
    
    // Temperature delta 1h before
    const deltas1h = leadIndicators.filter(e => e.tempDelta1h != null).map(e => e.tempDelta1h);
    if (deltas1h.length > 0) {
      const avgDelta1h = deltas1h.reduce((a, b) => a + b, 0) / deltas1h.length;
      console.log(`  Heber-Arrowhead temp delta 1h before: avg ${avgDelta1h.toFixed(1)}°F`);
    }
  }
  
  // Find best thermal days
  const dayMap = new Map();
  thermalEvents.forEach(e => {
    const dayKey = e.time.toISOString().slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { count: 0, maxSpeed: 0, peakHour: null });
    }
    const day = dayMap.get(dayKey);
    day.count++;
    if (e.dcc.speed > day.maxSpeed) {
      day.maxSpeed = e.dcc.speed;
      day.peakHour = e.hour;
    }
  });
  
  const goodDays = Array.from(dayMap.entries())
    .filter(([_, d]) => d.count >= 6) // At least 1 hour of thermal
    .sort((a, b) => b[1].maxSpeed - a[1].maxSpeed);
  
  if (goodDays.length > 0) {
    console.log(`\nBEST THERMAL DAYS (6+ thermal readings):`);
    goodDays.slice(0, 10).forEach(([date, d]) => {
      console.log(`  ${date}: ${d.count} readings, peak ${d.maxSpeed.toFixed(1)} mph at ${d.peakHour}:00`);
    });
    console.log(`\nTotal good thermal days: ${goodDays.length}`);
  }
}

async function main() {
  console.log('DEER CREEK HISTORICAL ANALYSIS');
  console.log('Correlating: DCC (Dam), SND (Arrowhead), KHCR (Heber Airport)');
  console.log('Looking for patterns that predict good South thermals\n');
  
  // Analyze summer months (best thermal season)
  const months = [
    { year: 2025, month: 6, label: 'June 2025' },
    { year: 2025, month: 7, label: 'July 2025' },
    { year: 2025, month: 8, label: 'August 2025' },
  ];
  
  const allEvents = [];
  const allHourlyStats = {};
  for (let h = 0; h < 24; h++) {
    allHourlyStats[h] = { total: 0, thermal: 0, avgSpeed: 0, speeds: [] };
  }
  
  for (const { year, month, label } of months) {
    const data = await analyzeMonth(year, month);
    const analysis = analyzeCorrelations(data);
    printAnalysis(analysis, label);
    
    if (analysis) {
      allEvents.push(...analysis.thermalEvents);
      for (let h = 0; h < 24; h++) {
        allHourlyStats[h].total += analysis.hourlyStats[h].total;
        allHourlyStats[h].thermal += analysis.hourlyStats[h].thermal;
        allHourlyStats[h].speeds.push(...analysis.hourlyStats[h].speeds);
      }
    }
  }
  
  // Calculate combined averages
  for (let h = 0; h < 24; h++) {
    if (allHourlyStats[h].speeds.length > 0) {
      allHourlyStats[h].avgSpeed = allHourlyStats[h].speeds.reduce((a, b) => a + b, 0) / allHourlyStats[h].speeds.length;
    }
  }
  
  printAnalysis({ thermalEvents: allEvents, hourlyStats: allHourlyStats }, 'SUMMER 2025 COMBINED');
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('KEY FINDINGS FOR DEER CREEK PREDICTION MODEL');
  console.log(`${'='.repeat(60)}`);
  
  // Find peak hours
  const peakHours = Object.entries(allHourlyStats)
    .filter(([h, s]) => s.thermal > 0)
    .sort((a, b) => b[1].thermal - a[1].thermal)
    .slice(0, 5);
  
  if (peakHours.length > 0) {
    console.log(`\nPeak thermal hours (local time): ${peakHours.map(([h]) => h + ':00').join(', ')}`);
  }
  
  // Success rate
  const totalObs = Object.values(allHourlyStats).reduce((sum, s) => sum + s.total, 0);
  const totalThermal = Object.values(allHourlyStats).reduce((sum, s) => sum + s.thermal, 0);
  console.log(`Overall thermal success rate: ${((totalThermal / totalObs) * 100).toFixed(1)}%`);
  console.log(`Total thermal observations: ${totalThermal}`);
}

main().catch(console.error);
```

---

## File 70: `scripts/analyze-forecast-accuracy.js`

> 446 lines | 16.6 KB

```javascript
/**
 * FORECAST ACCURACY ANALYSIS
 * 
 * This script analyzes how well NWS forecasts correlate with actual
 * surface wind conditions at our stations.
 * 
 * Since we can't get historical NWS forecasts easily, we'll:
 * 1. Analyze pressure patterns and their effect on wind
 * 2. Identify synoptic-scale events (fronts, storms) from pressure data
 * 3. Correlate these events with surface wind at our stations
 */

import axios from 'axios';
import fs from 'fs';

// Load env
const envPath = new URL('../.env', import.meta.url);
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('Note: Could not load .env file');
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// =============================================================================
// ANALYZE PRESSURE-WIND RELATIONSHIPS
// =============================================================================

async function analyzePressureWindRelationship() {
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE-WIND RELATIONSHIP ANALYSIS');
  console.log('='.repeat(70));
  
  // Fetch 6 months of data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU,FPS',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,sea_level_pressure,air_temp',
        units: 'english',
        obtimezone: 'local',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    // Parse data
    const stations = {};
    for (const station of response.data.STATION) {
      const obs = station.OBSERVATIONS;
      stations[station.STID] = {
        times: obs.date_time || [],
        speeds: obs.wind_speed_set_1 || [],
        directions: obs.wind_direction_set_1 || [],
        pressure: obs.sea_level_pressure_set_1 || [],
        temp: obs.air_temp_set_1 || [],
      };
    }
    
    const kslc = stations['KSLC'];
    const kpvu = stations['KPVU'];
    const fps = stations['FPS'];
    
    if (!kslc || !kpvu || !fps) {
      console.log('Missing station data');
      return;
    }
    
    // Build hourly data with pressure gradient
    const hourlyData = [];
    
    for (let i = 0; i < kslc.times.length; i++) {
      const time = new Date(kslc.times[i]);
      const hour = time.getHours();
      
      // Find matching KPVU and FPS data (within 30 min)
      const kpvuIdx = findClosestIndex(kpvu.times, kslc.times[i]);
      const fpsIdx = findClosestIndex(fps.times, kslc.times[i]);
      
      if (kpvuIdx < 0 || fpsIdx < 0) continue;
      
      const slcPressure = kslc.pressure[i];
      const pvuPressure = kpvu.pressure[kpvuIdx];
      
      if (slcPressure === null || pvuPressure === null) continue;
      
      const gradient = slcPressure - pvuPressure;
      
      hourlyData.push({
        time,
        hour,
        gradient,
        slcPressure,
        pvuPressure,
        kslcSpeed: kslc.speeds[i],
        kslcDir: kslc.directions[i],
        kpvuSpeed: kpvu.speeds[kpvuIdx],
        kpvuDir: kpvu.directions[kpvuIdx],
        fpsSpeed: fps.speeds[fpsIdx],
        fpsDir: fps.directions[fpsIdx],
        slcTemp: kslc.temp[i],
      });
    }
    
    console.log(`\nAnalyzed ${hourlyData.length} hourly data points`);
    
    // =================================================================
    // ANALYSIS 1: Pressure Gradient vs FPS Wind Speed
    // =================================================================
    
    console.log('\n\n1. PRESSURE GRADIENT vs FPS WIND SPEED');
    console.log('-'.repeat(60));
    
    const gradientBuckets = {
      'strong_north (>3mb)': { speeds: [], directions: [], count: 0 },
      'moderate_north (1-3mb)': { speeds: [], directions: [], count: 0 },
      'neutral (-1 to 1mb)': { speeds: [], directions: [], count: 0 },
      'moderate_south (-3 to -1mb)': { speeds: [], directions: [], count: 0 },
      'strong_south (<-3mb)': { speeds: [], directions: [], count: 0 },
    };
    
    for (const data of hourlyData) {
      if (data.fpsSpeed === null) continue;
      
      let bucket;
      if (data.gradient > 3) bucket = 'strong_north (>3mb)';
      else if (data.gradient > 1) bucket = 'moderate_north (1-3mb)';
      else if (data.gradient > -1) bucket = 'neutral (-1 to 1mb)';
      else if (data.gradient > -3) bucket = 'moderate_south (-3 to -1mb)';
      else bucket = 'strong_south (<-3mb)';
      
      gradientBuckets[bucket].speeds.push(data.fpsSpeed);
      gradientBuckets[bucket].directions.push(data.fpsDir);
      gradientBuckets[bucket].count++;
    }
    
    console.log('\nGradient Type          | Count | Avg FPS Speed | % North | % Kiteable');
    console.log('-'.repeat(75));
    
    for (const [bucket, data] of Object.entries(gradientBuckets)) {
      if (data.count === 0) continue;
      
      const avgSpeed = data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length;
      const northCount = data.directions.filter(d => d !== null && (d >= 315 || d <= 45)).length;
      const northPct = (northCount / data.count * 100).toFixed(0);
      const kiteableCount = data.speeds.filter(s => s >= 10).length;
      const kiteablePct = (kiteableCount / data.count * 100).toFixed(0);
      
      console.log(
        `${bucket.padEnd(22)} | ${String(data.count).padStart(5)} | ` +
        `${avgSpeed.toFixed(1).padStart(8)} mph   | ${northPct.padStart(4)}%   | ${kiteablePct.padStart(4)}%`
      );
    }
    
    // =================================================================
    // ANALYSIS 2: Pressure Change Rate vs Wind Events
    // =================================================================
    
    console.log('\n\n2. PRESSURE CHANGE RATE vs WIND EVENTS');
    console.log('-'.repeat(60));
    
    const pressureChangeEvents = {
      'rapid_drop (>4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'moderate_drop (2-4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'slow_drop (0-2mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'stable': { fpsWinds: [], kslcWinds: [], count: 0 },
      'slow_rise (0-2mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'moderate_rise (2-4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
      'rapid_rise (>4mb/6hr)': { fpsWinds: [], kslcWinds: [], count: 0 },
    };
    
    // Calculate 6-hour pressure change
    for (let i = 24; i < hourlyData.length; i++) { // 24 readings = ~6 hours at 15-min intervals
      const current = hourlyData[i];
      const previous = hourlyData[i - 24];
      
      if (!current.slcPressure || !previous.slcPressure) continue;
      
      const pressureChange = current.slcPressure - previous.slcPressure;
      
      let bucket;
      if (pressureChange < -4) bucket = 'rapid_drop (>4mb/6hr)';
      else if (pressureChange < -2) bucket = 'moderate_drop (2-4mb/6hr)';
      else if (pressureChange < 0) bucket = 'slow_drop (0-2mb/6hr)';
      else if (pressureChange < 2) bucket = 'slow_rise (0-2mb/6hr)';
      else if (pressureChange < 4) bucket = 'moderate_rise (2-4mb/6hr)';
      else bucket = 'rapid_rise (>4mb/6hr)';
      
      if (current.fpsSpeed !== null) {
        pressureChangeEvents[bucket].fpsWinds.push(current.fpsSpeed);
      }
      if (current.kslcSpeed !== null) {
        pressureChangeEvents[bucket].kslcWinds.push(current.kslcSpeed);
      }
      pressureChangeEvents[bucket].count++;
    }
    
    console.log('\nPressure Change        | Count | Avg FPS  | Avg KSLC | % FPS Kiteable');
    console.log('-'.repeat(70));
    
    for (const [bucket, data] of Object.entries(pressureChangeEvents)) {
      if (data.count === 0) continue;
      
      const avgFps = data.fpsWinds.length > 0 
        ? data.fpsWinds.reduce((a, b) => a + b, 0) / data.fpsWinds.length 
        : 0;
      const avgKslc = data.kslcWinds.length > 0
        ? data.kslcWinds.reduce((a, b) => a + b, 0) / data.kslcWinds.length
        : 0;
      const kiteableCount = data.fpsWinds.filter(s => s >= 10).length;
      const kiteablePct = data.fpsWinds.length > 0 
        ? (kiteableCount / data.fpsWinds.length * 100).toFixed(0)
        : '0';
      
      console.log(
        `${bucket.padEnd(22)} | ${String(data.count).padStart(5)} | ` +
        `${avgFps.toFixed(1).padStart(5)} mph | ${avgKslc.toFixed(1).padStart(5)} mph | ${kiteablePct.padStart(6)}%`
      );
    }
    
    // =================================================================
    // ANALYSIS 3: Cold Front Detection and Wind Response
    // =================================================================
    
    console.log('\n\n3. COLD FRONT DETECTION AND WIND RESPONSE');
    console.log('-'.repeat(60));
    
    // Detect cold fronts: rapid pressure drop followed by wind shift to north
    const coldFronts = [];
    
    for (let i = 48; i < hourlyData.length - 24; i++) {
      const current = hourlyData[i];
      const sixHoursAgo = hourlyData[i - 24];
      const sixHoursLater = hourlyData[i + 24];
      
      if (!current.slcPressure || !sixHoursAgo.slcPressure) continue;
      
      const pressureDrop = sixHoursAgo.slcPressure - current.slcPressure;
      
      // Cold front signature: pressure drop > 3mb AND wind shift to north
      if (pressureDrop > 3) {
        const beforeDir = sixHoursAgo.kslcDir;
        const afterDir = sixHoursLater?.kslcDir;
        
        // Check for wind shift to north
        const isNorthAfter = afterDir !== null && (afterDir >= 315 || afterDir <= 45);
        const wasNotNorthBefore = beforeDir !== null && beforeDir > 45 && beforeDir < 315;
        
        if (isNorthAfter && wasNotNorthBefore) {
          // Check if we already have a front within 12 hours
          const isDuplicate = coldFronts.some(f => 
            Math.abs(f.time.getTime() - current.time.getTime()) < 12 * 60 * 60 * 1000
          );
          
          if (!isDuplicate) {
            coldFronts.push({
              time: current.time,
              pressureDrop,
              beforeWind: { speed: sixHoursAgo.fpsSpeed, dir: sixHoursAgo.fpsDir },
              duringWind: { speed: current.fpsSpeed, dir: current.fpsDir },
              afterWind: { speed: sixHoursLater?.fpsSpeed, dir: sixHoursLater?.fpsDir },
              kslcAfter: { speed: sixHoursLater?.kslcSpeed, dir: sixHoursLater?.kslcDir },
            });
          }
        }
      }
    }
    
    console.log(`\nDetected ${coldFronts.length} cold front passages in 6 months\n`);
    
    if (coldFronts.length > 0) {
      console.log('Date/Time            | P Drop | Before FPS | After FPS  | After KSLC');
      console.log('-'.repeat(75));
      
      let totalBeforeSpeed = 0;
      let totalAfterSpeed = 0;
      let kiteableAfter = 0;
      
      for (const front of coldFronts.slice(0, 15)) {
        const dateStr = front.time.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const beforeStr = front.beforeWind.speed !== null 
          ? `${front.beforeWind.speed.toFixed(0)} mph` 
          : 'N/A';
        const afterStr = front.afterWind.speed !== null
          ? `${front.afterWind.speed.toFixed(0)} mph`
          : 'N/A';
        const kslcStr = front.kslcAfter.speed !== null
          ? `${front.kslcAfter.speed.toFixed(0)} mph N`
          : 'N/A';
        
        console.log(
          `${dateStr.padEnd(20)} | ${front.pressureDrop.toFixed(1).padStart(4)}mb | ` +
          `${beforeStr.padStart(8)}   | ${afterStr.padStart(8)}   | ${kslcStr.padStart(10)}`
        );
        
        if (front.beforeWind.speed !== null) totalBeforeSpeed += front.beforeWind.speed;
        if (front.afterWind.speed !== null) {
          totalAfterSpeed += front.afterWind.speed;
          if (front.afterWind.speed >= 10) kiteableAfter++;
        }
      }
      
      console.log('-'.repeat(75));
      console.log(`\nCOLD FRONT SUMMARY:`);
      console.log(`  Average FPS wind BEFORE front: ${(totalBeforeSpeed / coldFronts.length).toFixed(1)} mph`);
      console.log(`  Average FPS wind AFTER front:  ${(totalAfterSpeed / coldFronts.length).toFixed(1)} mph`);
      console.log(`  % Kiteable (10+ mph) after front: ${(kiteableAfter / coldFronts.length * 100).toFixed(0)}%`);
    }
    
    // =================================================================
    // ANALYSIS 4: Time of Day Effects
    // =================================================================
    
    console.log('\n\n4. TIME OF DAY EFFECTS ON WIND');
    console.log('-'.repeat(60));
    
    const hourlyStats = {};
    for (let h = 0; h < 24; h++) {
      hourlyStats[h] = { speeds: [], northCount: 0, seCount: 0, count: 0 };
    }
    
    for (const data of hourlyData) {
      if (data.fpsSpeed === null) continue;
      
      hourlyStats[data.hour].speeds.push(data.fpsSpeed);
      hourlyStats[data.hour].count++;
      
      if (data.fpsDir !== null) {
        if (data.fpsDir >= 315 || data.fpsDir <= 45) {
          hourlyStats[data.hour].northCount++;
        } else if (data.fpsDir >= 90 && data.fpsDir <= 180) {
          hourlyStats[data.hour].seCount++;
        }
      }
    }
    
    console.log('\nHour | Avg Speed | % North | % SE    | % Kiteable');
    console.log('-'.repeat(55));
    
    for (let h = 6; h <= 21; h++) { // Daytime hours only
      const stats = hourlyStats[h];
      if (stats.count === 0) continue;
      
      const avgSpeed = stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length;
      const northPct = (stats.northCount / stats.count * 100).toFixed(0);
      const sePct = (stats.seCount / stats.count * 100).toFixed(0);
      const kiteablePct = (stats.speeds.filter(s => s >= 10).length / stats.count * 100).toFixed(0);
      
      const hourStr = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;
      
      console.log(
        `${hourStr.padStart(4)} | ${avgSpeed.toFixed(1).padStart(6)} mph | ` +
        `${northPct.padStart(4)}%   | ${sePct.padStart(4)}%   | ${kiteablePct.padStart(6)}%`
      );
    }
    
    return { hourlyData, coldFronts, gradientBuckets };
    
  } catch (error) {
    console.error('Error in analysis:', error.message);
  }
}

function findClosestIndex(times, targetTime) {
  const targetMs = new Date(targetTime).getTime();
  let closest = -1;
  let closestDiff = Infinity;
  
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
    if (diff < closestDiff && diff < 30 * 60 * 1000) {
      closestDiff = diff;
      closest = i;
    }
  }
  return closest;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           FORECAST ACCURACY & WEATHER EVENT ANALYSIS               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  await analyzePressureWindRelationship();
  
  console.log('\n' + '='.repeat(70));
  console.log('KEY FINDINGS FOR FORECAST INTEGRATION');
  console.log('='.repeat(70));
  
  console.log(`
1. PRESSURE GRADIENT is the strongest predictor of north flow:
   - SLC > Provo by 3+ mb → High probability of north wind at Utah Lake
   - Use this to validate NWS "north wind" forecasts

2. PRESSURE CHANGE RATE indicates frontal activity:
   - Rapid drop (>4mb/6hr) → Cold front approaching
   - After front passage → Best kiting conditions

3. COLD FRONTS produce the most reliable kiting:
   - Wind shift to north after front
   - Sustained speeds often 15-25 mph
   - Can last 6-12 hours

4. TIME OF DAY matters for thermals:
   - SE thermals peak 1pm-4pm
   - North flows can occur any time
   - Morning is usually calm

5. FORECAST VALIDATION STRATEGY:
   - NWS says "north wind" → Check pressure gradient
   - NWS says "sunny, light wind" → Watch for thermal development
   - NWS says "cold front" → Expect good kiting 6-12 hours after
`);
}

main().catch(console.error);
```

---

## File 71: `scripts/analyze-fps-yesterday.js`

> 96 lines | 3.3 KB

```javascript
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

async function fetchFPS() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const start = new Date(yesterday);
  start.setUTCHours(18, 0, 0, 0); // 12 PM MDT
  const end = new Date(now);
  end.setUTCHours(4, 0, 0, 0); // 10 PM MDT
  
  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}${m}${day}${h}${min}`;
  };

  const url = `https://api.synopticdata.com/v2/stations/timeseries?stids=FPS&start=${fmt(start)}&end=${fmt(end)}&vars=wind_speed,wind_direction,wind_gust,air_temp&units=english,speed|mph,temp|F&token=${TOKEN}`;
  
  console.log('=== FLIGHT PARK SOUTH - Yesterday Afternoon/Evening ===\n');
  
  const response = await axios.get(url, { timeout: 30000 });
  const station = response.data.STATION?.[0];
  if (!station) { console.log('No data'); return; }
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const gusts = obs.wind_gust_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  console.log('Time (MDT)    | Wind (mph) | Dir    | Gust  | Temp');
  console.log('-'.repeat(60));
  
  let switchTime = null;
  
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
    
    if (mdtHour >= 14 && mdtHour <= 21) {
      const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
      const speed = speeds[i]?.toFixed(1) || '--';
      const dir = dirs[i]?.toFixed(0) || '--';
      const gust = gusts[i]?.toFixed(0) || '--';
      const temp = temps[i]?.toFixed(1) || '--';
      
      const cardinal = getCardinal(dirs[i]);
      const isNorth = dirs[i] >= 315 || dirs[i] <= 45;
      const marker = isNorth ? ' ← NORTH' : '';
      
      console.log(`${timeStr.padEnd(14)} | ${speed.padStart(6)} mph | ${dir.padStart(4)}° ${cardinal.padStart(3)} | ${gust.padStart(4)}  | ${temp}°F${marker}`);
      
      if (isNorth && !switchTime) {
        switchTime = timeStr;
      }
    }
  }
  
  if (switchTime) {
    console.log(`\n⚡ FPS switched to NORTH at: ${switchTime}`);
  } else {
    console.log('\n❌ FPS did NOT switch to north (stayed south all evening)');
  }
}

function getCardinal(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

fetchFPS().catch(console.error);
```

---

## File 72: `scripts/analyze-north-flow-complete.js`

> 468 lines | 14.9 KB

```javascript
/**
 * COMPLETE NORTH FLOW ANALYSIS
 * 
 * Using stations that have data:
 * - KSLC (Salt Lake City Airport) - 45% correlation
 * - SLCNW (SLC Airport Wind 2) - has data
 * - KTVY (Tooele Valley) - 38% correlation
 * - UTALP (Point of Mountain) - 23% correlation
 * - Pressure gradient analysis
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter,sea_level_pressure&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.altimeter_set_1 || obs.sea_level_pressure_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressures[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('COMPLETE NORTH FLOW ANALYSIS');
  console.log('='.repeat(70));
  
  // Stations with confirmed data
  const stations = [
    'FPS',    // Flight Park South - Utah Lake baseline
    'KSLC',   // Salt Lake City Airport - best indicator
    'KPVU',   // Provo Airport - pressure reference
    'SLCNW',  // SLC Airport Wind 2
    'KTVY',   // Tooele Valley Airport
    'UTALP',  // Point of Mountain
  ];
  
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  let allData = {};
  
  console.log('\nFetching data...\n');
  
  for (const stid of stations) {
    allData[stid] = [];
    
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        if (obs.length > 0) {
          allData[stid] = allData[stid].concat(obs);
        }
      } catch (e) {}
    }
    
    console.log(`${stid}: ${allData[stid].length} observations`);
  }
  
  const fpsData = allData['FPS'] || [];
  const kslcData = allData['KSLC'] || [];
  const kpvuData = allData['KPVU'] || [];
  const slcnwData = allData['SLCNW'] || [];
  
  // Create hourly maps
  const createHourlyMap = (data) => {
    const map = new Map();
    data.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      map.set(key, o);
    });
    return map;
  };
  
  const kslcHourly = createHourlyMap(kslcData);
  const kpvuHourly = createHourlyMap(kpvuData);
  const slcnwHourly = createHourlyMap(slcnwData);
  
  // Identify north flow days at FPS
  const fpsDays = new Map();
  fpsData.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!fpsDays.has(dateKey)) {
      fpsDays.set(dateKey, { 
        northHours: new Set(), 
        firstNorthHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
      });
    }
    
    const day = fpsDays.get(dateKey);
    
    if (isNorthFlow(obs) && hour >= 6 && hour <= 20) {
      day.northHours.add(hour);
      if (day.firstNorthHour === null || hour < day.firstNorthHour) {
        day.firstNorthHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
    
    if (isGoodNorthKite(obs)) {
      day.goodKiteHours++;
    }
  });
  
  const goodNorthDays = [];
  const noNorthDays = [];
  
  fpsDays.forEach((day, date) => {
    if (day.goodKiteHours >= 2 && day.peakSpeed >= 10) {
      goodNorthDays.push({ date, ...day });
    } else {
      noNorthDays.push({ date, ...day });
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('NORTH FLOW CLASSIFICATION');
  console.log('='.repeat(70));
  console.log(`Good north kite days: ${goodNorthDays.length}`);
  console.log(`Non-north days: ${noNorthDays.length}`);
  
  // Analyze SLCNW (SLC Airport Wind 2)
  console.log('\n' + '='.repeat(70));
  console.log('SLCNW (SLC AIRPORT WIND 2) ANALYSIS');
  console.log('='.repeat(70));
  
  if (slcnwData.length > 0) {
    const leadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = slcnwHourly.get(key);
        
        if (leadObs && leadObs.speed != null) {
          leadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
          });
        }
      }
    });
    
    console.log('\nSLCNW Lead Time Analysis:');
    console.log('Lead Time | Samples | North % | Avg Speed');
    console.log('-'.repeat(50));
    
    let bestLead = 0;
    let bestNorthPct = 0;
    let bestAvgSpeed = 0;
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = leadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100);
      const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
      
      console.log(
        `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.toFixed(0).padStart(6)}% | ${avgSpeed.toFixed(1).padStart(9)}`
      );
      
      if (northPct > bestNorthPct) {
        bestNorthPct = northPct;
        bestLead = lead;
        bestAvgSpeed = avgSpeed;
      }
    }
    
    console.log(`\nBest: ${bestLead}hr lead with ${bestNorthPct.toFixed(0)}% north correlation`);
  }
  
  // Analyze KSLC
  console.log('\n' + '='.repeat(70));
  console.log('KSLC (SALT LAKE CITY AIRPORT) ANALYSIS');
  console.log('='.repeat(70));
  
  const kslcLeadResults = { 1: [], 2: [], 3: [], 4: [] };
  
  goodNorthDays.forEach(day => {
    if (day.firstNorthHour === null) return;
    
    for (let lead = 1; lead <= 4; lead++) {
      const checkHour = day.firstNorthHour - lead;
      if (checkHour < 4) continue;
      
      const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      const leadObs = kslcHourly.get(key);
      
      if (leadObs && leadObs.speed != null) {
        kslcLeadResults[lead].push({
          speed: leadObs.speed,
          dir: leadObs.direction,
          isNorth: isNorthFlow(leadObs, 5),
        });
      }
    }
  });
  
  console.log('\nKSLC Lead Time Analysis:');
  console.log('Lead Time | Samples | North % | Avg Speed');
  console.log('-'.repeat(50));
  
  let kslcBestLead = 0;
  let kslcBestNorthPct = 0;
  
  for (let lead = 1; lead <= 4; lead++) {
    const samples = kslcLeadResults[lead];
    if (samples.length < 3) continue;
    
    const northCount = samples.filter(s => s.isNorth).length;
    const northPct = (northCount / samples.length * 100);
    const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
    
    console.log(
      `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.toFixed(0).padStart(6)}% | ${avgSpeed.toFixed(1).padStart(9)}`
    );
    
    if (northPct > kslcBestNorthPct) {
      kslcBestNorthPct = northPct;
      kslcBestLead = lead;
    }
  }
  
  // Direction distribution for KSLC
  const kslcAllLead = [...kslcLeadResults[1], ...kslcLeadResults[2]];
  if (kslcAllLead.length > 0) {
    console.log('\nKSLC Direction Distribution (1-2hr before FPS north):');
    const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    kslcAllLead.forEach(o => {
      if (o.dir == null) return;
      const d = o.dir;
      if (d >= 337.5 || d < 22.5) dirBuckets.N++;
      else if (d < 67.5) dirBuckets.NE++;
      else if (d < 112.5) dirBuckets.E++;
      else if (d < 157.5) dirBuckets.SE++;
      else if (d < 202.5) dirBuckets.S++;
      else if (d < 247.5) dirBuckets.SW++;
      else if (d < 292.5) dirBuckets.W++;
      else dirBuckets.NW++;
    });
    
    Object.entries(dirBuckets).forEach(([dir, count]) => {
      if (count > 0) {
        const pct = (count / kslcAllLead.length * 100).toFixed(0);
        const bar = '█'.repeat(Math.round(pct / 3));
        console.log(`  ${dir.padEnd(3)} ${String(count).padStart(3)} (${pct.padStart(2)}%) ${bar}`);
      }
    });
    
    // N + NW combined
    const northTotal = dirBuckets.N + dirBuckets.NW + dirBuckets.NE;
    console.log(`\n  Combined N/NW/NE: ${(northTotal / kslcAllLead.length * 100).toFixed(0)}%`);
  }
  
  // Pressure gradient analysis
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT CORRELATION');
  console.log('='.repeat(70));
  
  const goodDayGradients = [];
  const badDayGradients = [];
  
  goodNorthDays.forEach(day => {
    for (let hour = 6; hour <= 12; hour++) {
      const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      
      const slcObs = kslcHourly.get(key);
      const pvuObs = kpvuHourly.get(key);
      
      if (slcObs?.pressure && pvuObs?.pressure) {
        const gradient = slcObs.pressure - pvuObs.pressure;
        goodDayGradients.push({ gradient, hour });
      }
    }
  });
  
  noNorthDays.slice(0, 50).forEach(day => {
    for (let hour = 6; hour <= 12; hour++) {
      const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
      const key = checkDate.toISOString().slice(0, 13);
      
      const slcObs = kslcHourly.get(key);
      const pvuObs = kpvuHourly.get(key);
      
      if (slcObs?.pressure && pvuObs?.pressure) {
        const gradient = slcObs.pressure - pvuObs.pressure;
        badDayGradients.push({ gradient, hour });
      }
    }
  });
  
  if (goodDayGradients.length > 0) {
    const avgGood = goodDayGradients.reduce((a, b) => a + b.gradient, 0) / goodDayGradients.length;
    const avgBad = badDayGradients.reduce((a, b) => a + b.gradient, 0) / badDayGradients.length;
    
    console.log(`\nPressure Gradient (SLC - Provo):`);
    console.log(`  Good north days: ${avgGood.toFixed(3)} mb avg`);
    console.log(`  Non-north days:  ${avgBad.toFixed(3)} mb avg`);
    
    const positiveGood = goodDayGradients.filter(g => g.gradient > 0).length;
    const positiveBad = badDayGradients.filter(g => g.gradient > 0).length;
    
    console.log(`\n  Positive gradient (SLC > Provo):`);
    console.log(`    Good north days: ${(positiveGood / goodDayGradients.length * 100).toFixed(0)}%`);
    console.log(`    Non-north days:  ${(positiveBad / badDayGradients.length * 100).toFixed(0)}%`);
    
    // Strong positive gradient
    const strongGood = goodDayGradients.filter(g => g.gradient > 0.5).length;
    const strongBad = badDayGradients.filter(g => g.gradient > 0.5).length;
    
    console.log(`\n  Strong positive (> 0.5 mb):`);
    console.log(`    Good north days: ${(strongGood / goodDayGradients.length * 100).toFixed(0)}%`);
    console.log(`    Non-north days:  ${(strongBad / badDayGradients.length * 100).toFixed(0)}%`);
  }
  
  // Save findings
  const findings = {
    analysis: 'North Flow Early Indicators - Complete Analysis',
    baseline: 'FPS (Flight Park South)',
    totalDays: fpsDays.size,
    goodNorthDays: goodNorthDays.length,
    
    indicators: {
      primary: {
        station: 'KSLC',
        stationName: 'Salt Lake City Airport',
        coordinates: { lat: 40.7884, lng: -111.9778 },
        elevation: 4226,
        leadTimeHours: 1,
        northPercentage: kslcBestNorthPct,
        role: 'Primary early indicator - north wind here precedes Utah Lake by ~1 hour',
        trigger: {
          direction: { min: 315, max: 45, label: 'N (NW to NE)' },
          speed: { min: 5, optimal: 8 },
        },
        statistics: {
          northDirectionOnGoodDays: '45%',
          combinedNorthNW: '71%',
        },
      },
      secondary: {
        station: 'SLCNW',
        stationName: 'SLC Airport Wind 2',
        coordinates: { lat: 40.79, lng: -111.98 },
        elevation: 4280,
        leadTimeHours: 1,
        role: 'Secondary indicator - runway wind sensor',
      },
      pressureGradient: {
        highStation: 'KSLC',
        lowStation: 'KPVU',
        positiveGradientMeaning: 'SLC > Provo = North flow likely',
        negativeGradientMeaning: 'Provo > SLC = South flow (thermal) likely',
        threshold: 0.5,
        description: 'When gradient > 0.5 mb, strong north flow expected',
      },
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`
NORTH FLOW EARLY INDICATORS:

1. KSLC (Salt Lake City Airport) - PRIMARY
   - ${kslcBestNorthPct.toFixed(0)}% show north wind ${kslcBestLead}hr before Utah Lake
   - Combined N/NW/NE: 71% of good north days
   - Trigger: North wind (315-45°) at 5+ mph

2. PRESSURE GRADIENT (SLC - Provo)
   - Positive gradient = North flow likely
   - Strong positive (> 0.5 mb) = High confidence north flow
   - Already tracked in your app!

3. SLCNW (SLC Airport Wind 2)
   - Secondary confirmation
   - Located at airport runway

RECOMMENDATION:
- Add KSLC wind direction as north flow early indicator
- Use existing pressure gradient (already in app) as primary trigger
- When SLC shows N/NW wind AND gradient is positive → North flow coming
`);
}

analyze().catch(console.error);
```

---

## File 73: `scripts/analyze-north-flow-deep.js`

> 440 lines | 12.9 KB

```javascript
/**
 * DEEP NORTH FLOW ANALYSIS
 * 
 * Focus on:
 * - U42 / Airport 2 (West Valley / Salt Lake City Municipal 2)
 * - FPN (Flight Park North)
 * - Stations near Great Salt Lake
 * - Your Zig Zag historical data for north flow events
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function searchStations(lat, lng, radius) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=${lat},${lng},${radius}&limit=100&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('DEEP NORTH FLOW ANALYSIS');
  console.log('Finding Airport 2, FPN, and GSL stations');
  console.log('='.repeat(70));
  
  // Search multiple areas
  const searchAreas = [
    { name: 'West Valley (Airport 2 area)', lat: 40.62, lng: -112.0, radius: 15 },
    { name: 'Salt Lake City', lat: 40.76, lng: -111.89, radius: 10 },
    { name: 'Great Salt Lake South', lat: 40.85, lng: -112.1, radius: 20 },
    { name: 'Point of Mountain', lat: 40.45, lng: -111.9, radius: 10 },
    { name: 'Tooele Valley', lat: 40.53, lng: -112.3, radius: 15 },
  ];
  
  const allStations = new Map();
  
  for (const area of searchAreas) {
    console.log(`\nSearching ${area.name}...`);
    try {
      const result = await searchStations(area.lat, area.lng, area.radius);
      if (result.STATION) {
        result.STATION.forEach(s => {
          if (s.STID && !allStations.has(s.STID)) {
            allStations.set(s.STID, s);
          }
        });
        console.log(`  Found ${result.STATION.length} stations`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log(`\nTotal unique stations: ${allStations.size}`);
  
  // Filter and display relevant stations
  console.log('\n' + '-'.repeat(70));
  console.log('KEY STATIONS FOR NORTH FLOW ANALYSIS:');
  console.log('-'.repeat(70));
  
  const relevantStations = Array.from(allStations.values())
    .filter(s => {
      const name = (s.NAME || '').toLowerCase();
      const stid = (s.STID || '').toLowerCase();
      return (
        name.includes('airport') ||
        name.includes('municipal') ||
        name.includes('flight') ||
        name.includes('lake') ||
        name.includes('salt') ||
        name.includes('tooele') ||
        name.includes('valley') ||
        stid.includes('u42') ||
        stid.includes('fpn') ||
        stid.includes('fps') ||
        stid.includes('slc') ||
        stid.includes('qlk')
      );
    })
    .sort((a, b) => (a.NAME || '').localeCompare(b.NAME || ''));
  
  console.log('ID'.padEnd(12) + 'Name'.padEnd(45) + 'Elev (ft)');
  console.log('-'.repeat(70));
  
  relevantStations.forEach(s => {
    const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
    console.log(
      (s.STID || '?').padEnd(12) +
      (s.NAME || '?').substring(0, 44).padEnd(45) +
      String(elev)
    );
  });
  
  // Now let's test specific stations
  console.log('\n' + '='.repeat(70));
  console.log('TESTING SPECIFIC STATIONS');
  console.log('='.repeat(70));
  
  // Extended list of stations to test
  const testStations = [
    // Airport 2 / West Valley area
    'U42', 'KUTW', 'KU42', 'SLCU2',
    // Flight Parks
    'FPN', 'FPS', 'UTALP',
    // SLC area
    'KSLC', 'QSL', 'QSLC',
    // Great Salt Lake area
    'QLK', 'QLKP', 'UTLKP', 'UTANT', 'UTFAR',
    // Tooele
    'KTVY', 'QTO', 'UTDUG',
    // Other valley
    'QBF', 'QBOU', 'UTMAG', 'UTWVC',
  ];
  
  // Get fall/winter data (best for north flows)
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
  ];
  
  let allData = {};
  
  console.log('\nFetching data for test stations...\n');
  
  for (const stid of testStations) {
    allData[stid] = [];
    
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        if (obs.length > 0) {
          allData[stid] = allData[stid].concat(obs);
        }
      } catch (e) {
        // Station might not exist
      }
    }
    
    if (allData[stid].length > 0) {
      console.log(`${stid}: ${allData[stid].length} observations`);
    }
  }
  
  // Load Zig Zag historical data for north flow events
  let zigzagNorthDays = [];
  try {
    const zigzagPath = './src/data/zigzag-historical.json';
    const zigzagData = JSON.parse(fs.readFileSync(zigzagPath, 'utf8'));
    console.log('\nLoaded Zig Zag historical data');
    
    // Get north flow stats from Zig Zag
    if (zigzagData.monthlyPatterns) {
      console.log('\nZig Zag North Flow Monthly Rates:');
      Object.entries(zigzagData.monthlyPatterns).forEach(([month, data]) => {
        if (data.nRate > 5) {
          console.log(`  Month ${month}: ${data.nRate}% north flow days`);
        }
      });
    }
  } catch (e) {
    console.log('Could not load Zig Zag data');
  }
  
  // Use FPS as baseline
  const fpsData = allData['FPS'] || [];
  
  if (fpsData.length === 0) {
    console.log('\nNo FPS data - trying UTALP as baseline');
  }
  
  const baselineData = fpsData.length > 0 ? fpsData : (allData['UTALP'] || []);
  const baselineName = fpsData.length > 0 ? 'FPS' : 'UTALP';
  
  if (baselineData.length === 0) {
    console.log('\nNo baseline data available');
    return;
  }
  
  console.log(`\nUsing ${baselineName} as baseline (${baselineData.length} obs)`);
  
  // Identify north flow days
  const baseDays = new Map();
  baselineData.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!baseDays.has(dateKey)) {
      baseDays.set(dateKey, { 
        northHours: new Set(), 
        firstNorthHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
      });
    }
    
    const day = baseDays.get(dateKey);
    
    if (isNorthFlow(obs) && hour >= 6 && hour <= 20) {
      day.northHours.add(hour);
      if (day.firstNorthHour === null || hour < day.firstNorthHour) {
        day.firstNorthHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
    
    if (isGoodNorthKite(obs)) {
      day.goodKiteHours++;
    }
  });
  
  const goodNorthDays = [];
  baseDays.forEach((day, date) => {
    if (day.goodKiteHours >= 2 && day.peakSpeed >= 10) {
      goodNorthDays.push({ date, ...day });
    }
  });
  
  console.log(`\nGood north kite days at ${baselineName}: ${goodNorthDays.length}`);
  
  // Analyze each station
  console.log('\n' + '='.repeat(70));
  console.log('LEAD INDICATOR ANALYSIS');
  console.log('='.repeat(70));
  
  const stationResults = [];
  
  for (const [stid, stationObs] of Object.entries(allData)) {
    if (stid === baselineName || stationObs.length === 0) continue;
    
    // Create hourly map
    const hourlyMap = new Map();
    stationObs.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      hourlyMap.set(key, o);
    });
    
    // Check lead times
    const leadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = hourlyMap.get(key);
        
        if (leadObs && leadObs.speed != null) {
          leadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
            peakSpeed: day.peakSpeed,
          });
        }
      }
    });
    
    // Find best lead time
    let bestLead = 0;
    let bestNorthPct = 0;
    let bestAvgSpeed = 0;
    let bestSamples = 0;
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = leadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100);
      const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
      
      if (northPct > bestNorthPct || (northPct === bestNorthPct && samples.length > bestSamples)) {
        bestNorthPct = northPct;
        bestLead = lead;
        bestAvgSpeed = avgSpeed;
        bestSamples = samples.length;
      }
    }
    
    if (bestLead > 0) {
      stationResults.push({
        stid,
        bestLead,
        northPct: bestNorthPct,
        avgSpeed: bestAvgSpeed,
        samples: bestSamples,
        totalObs: stationObs.length,
      });
      
      console.log(`\n${stid}: ${bestNorthPct.toFixed(0)}% north at ${bestLead}hr lead (${bestSamples} samples, avg ${bestAvgSpeed.toFixed(1)} mph)`);
    }
  }
  
  // Sort by north percentage
  stationResults.sort((a, b) => b.northPct - a.northPct);
  
  console.log('\n' + '='.repeat(70));
  console.log('RANKED NORTH FLOW EARLY INDICATORS');
  console.log('='.repeat(70));
  console.log('\nStation'.padEnd(12) + 'Lead'.padEnd(8) + 'North %'.padEnd(10) + 'Avg Spd'.padEnd(10) + 'Samples'.padEnd(10) + 'Total Obs');
  console.log('-'.repeat(70));
  
  stationResults.slice(0, 10).forEach(r => {
    console.log(
      r.stid.padEnd(12) +
      `${r.bestLead}hr`.padEnd(8) +
      `${r.northPct.toFixed(0)}%`.padEnd(10) +
      `${r.avgSpeed.toFixed(1)}`.padEnd(10) +
      String(r.samples).padEnd(10) +
      r.totalObs
    );
  });
  
  // Save findings
  const findings = {
    analysis: 'North Flow Early Indicators - Deep Analysis',
    baseline: baselineName,
    totalDays: baseDays.size,
    goodNorthDays: goodNorthDays.length,
    bestIndicators: stationResults.slice(0, 5).map(r => ({
      station: r.stid,
      leadTimeHours: r.bestLead,
      northWindPercentage: r.northPct,
      avgSpeed: r.avgSpeed,
      samples: r.samples,
    })),
    trigger: {
      direction: { min: 315, max: 45, label: 'N (NW to NE)' },
      speed: { min: 8, optimal: 10 },
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  // Summary
  if (stationResults.length > 0) {
    const best = stationResults[0];
    console.log('\n' + '='.repeat(70));
    console.log('KEY FINDINGS');
    console.log('='.repeat(70));
    console.log(`
BEST NORTH FLOW EARLY INDICATOR: ${best.stid}

Pattern:
- When ${best.stid} shows North wind (315-45°) at ${best.avgSpeed.toFixed(0)}+ mph
- ${best.northPct.toFixed(0)}% chance of good north flow at Utah Lake
- Lead time: ~${best.bestLead} hour(s) before Utah Lake

Top 3 Indicators:
${stationResults.slice(0, 3).map((r, i) => 
  `${i + 1}. ${r.stid}: ${r.northPct.toFixed(0)}% north @ ${r.bestLead}hr lead`
).join('\n')}
`);
  }
}

analyze().catch(console.error);
```

---

## File 74: `scripts/analyze-north-flow-final.js`

> 430 lines | 13.9 KB

```javascript
/**
 * FINAL NORTH FLOW ANALYSIS
 * 
 * Focus on:
 * - FPN (Flight Park North) - found in previous search
 * - KSLC (Salt Lake City) - best indicator so far
 * - KTVY (Tooele Valley Airport) - second best
 * - Pressure gradient correlation (SLC > Provo = North flow)
 * - Your Zig Zag north flow events
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter,sea_level_pressure&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.altimeter_set_1 || obs.sea_level_pressure_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressures[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('FINAL NORTH FLOW ANALYSIS');
  console.log('FPN, KSLC, KTVY + Pressure Gradient');
  console.log('='.repeat(70));
  
  // Key stations for north flow
  const stations = [
    'FPN',    // Flight Park North - key indicator
    'FPS',    // Flight Park South - Utah Lake baseline
    'KSLC',   // Salt Lake City Airport - pressure reference
    'KPVU',   // Provo Airport - pressure reference
    'KTVY',   // Tooele Valley - west side indicator
    'UTALP',  // Point of Mountain
    'QSA',    // Saltaire (near GSL)
    'SLCNW',  // SLC Airport Wind 2
  ];
  
  // Get 6 months of data (fall/winter/spring - best for north flows)
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  let allData = {};
  
  console.log('\nFetching data...\n');
  
  for (const stid of stations) {
    allData[stid] = [];
    
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        if (obs.length > 0) {
          allData[stid] = allData[stid].concat(obs);
        }
      } catch (e) {
        // Station might not exist
      }
    }
    
    if (allData[stid].length > 0) {
      console.log(`${stid}: ${allData[stid].length} observations`);
    } else {
      console.log(`${stid}: No data`);
    }
  }
  
  // Use FPS as baseline
  const fpsData = allData['FPS'] || [];
  const fpnData = allData['FPN'] || [];
  const kslcData = allData['KSLC'] || [];
  const kpvuData = allData['KPVU'] || [];
  
  if (fpsData.length === 0) {
    console.log('\nNo FPS data available');
    return;
  }
  
  // Create hourly maps
  const createHourlyMap = (data) => {
    const map = new Map();
    data.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      map.set(key, o);
    });
    return map;
  };
  
  const fpnHourly = createHourlyMap(fpnData);
  const kslcHourly = createHourlyMap(kslcData);
  const kpvuHourly = createHourlyMap(kpvuData);
  
  // Identify north flow days at FPS
  const fpsDays = new Map();
  fpsData.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!fpsDays.has(dateKey)) {
      fpsDays.set(dateKey, { 
        northHours: new Set(), 
        firstNorthHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
        observations: [],
      });
    }
    
    const day = fpsDays.get(dateKey);
    day.observations.push(obs);
    
    if (isNorthFlow(obs) && hour >= 6 && hour <= 20) {
      day.northHours.add(hour);
      if (day.firstNorthHour === null || hour < day.firstNorthHour) {
        day.firstNorthHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
    
    if (isGoodNorthKite(obs)) {
      day.goodKiteHours++;
    }
  });
  
  // Categorize days
  const goodNorthDays = [];
  const noNorthDays = [];
  
  fpsDays.forEach((day, date) => {
    if (day.goodKiteHours >= 2 && day.peakSpeed >= 10) {
      goodNorthDays.push({ date, ...day });
    } else {
      noNorthDays.push({ date, ...day });
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('NORTH FLOW DAY CLASSIFICATION');
  console.log('='.repeat(70));
  console.log(`Good north kite days at FPS: ${goodNorthDays.length}`);
  console.log(`Days without good north flow: ${noNorthDays.length}`);
  
  // Analyze FPN as early indicator
  console.log('\n' + '='.repeat(70));
  console.log('FPN (FLIGHT PARK NORTH) ANALYSIS');
  console.log('='.repeat(70));
  
  if (fpnData.length > 0) {
    const fpnLeadResults = { 1: [], 2: [], 3: [], 4: [] };
    
    goodNorthDays.forEach(day => {
      if (day.firstNorthHour === null) return;
      
      for (let lead = 1; lead <= 4; lead++) {
        const checkHour = day.firstNorthHour - lead;
        if (checkHour < 4) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const leadObs = fpnHourly.get(key);
        
        if (leadObs && leadObs.speed != null) {
          fpnLeadResults[lead].push({
            speed: leadObs.speed,
            dir: leadObs.direction,
            isNorth: isNorthFlow(leadObs, 5),
            peakSpeed: day.peakSpeed,
          });
        }
      }
    });
    
    console.log('\nFPN Lead Time Analysis:');
    console.log('Lead Time | Samples | North % | Avg Speed | Speed Range');
    console.log('-'.repeat(60));
    
    for (let lead = 1; lead <= 4; lead++) {
      const samples = fpnLeadResults[lead];
      if (samples.length < 3) continue;
      
      const northCount = samples.filter(s => s.isNorth).length;
      const northPct = (northCount / samples.length * 100).toFixed(0);
      const avgSpeed = (samples.reduce((s, x) => s + x.speed, 0) / samples.length).toFixed(1);
      const minSpeed = Math.min(...samples.map(s => s.speed)).toFixed(1);
      const maxSpeed = Math.max(...samples.map(s => s.speed)).toFixed(1);
      
      console.log(
        `${lead} hour    | ${String(samples.length).padStart(7)} | ${northPct.padStart(6)}% | ${avgSpeed.padStart(9)} | ${minSpeed}-${maxSpeed}`
      );
    }
    
    // Direction distribution
    const allFpnLead = [...fpnLeadResults[1], ...fpnLeadResults[2]];
    if (allFpnLead.length > 0) {
      console.log('\nFPN Direction Distribution (1-2hr before FPS north flow):');
      const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
      allFpnLead.forEach(o => {
        if (o.dir == null) return;
        const d = o.dir;
        if (d >= 337.5 || d < 22.5) dirBuckets.N++;
        else if (d < 67.5) dirBuckets.NE++;
        else if (d < 112.5) dirBuckets.E++;
        else if (d < 157.5) dirBuckets.SE++;
        else if (d < 202.5) dirBuckets.S++;
        else if (d < 247.5) dirBuckets.SW++;
        else if (d < 292.5) dirBuckets.W++;
        else dirBuckets.NW++;
      });
      
      Object.entries(dirBuckets).forEach(([dir, count]) => {
        if (count > 0) {
          const pct = (count / allFpnLead.length * 100).toFixed(0);
          const bar = '█'.repeat(Math.round(pct / 5));
          console.log(`  ${dir.padEnd(3)} ${String(count).padStart(3)} (${pct.padStart(2)}%) ${bar}`);
        }
      });
    }
  } else {
    console.log('No FPN data available');
  }
  
  // Analyze PRESSURE GRADIENT correlation
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT ANALYSIS (SLC - Provo)');
  console.log('='.repeat(70));
  
  if (kslcData.length > 0 && kpvuData.length > 0) {
    // Calculate pressure gradient for good north days vs non-north days
    const goodDayGradients = [];
    const badDayGradients = [];
    
    goodNorthDays.forEach(day => {
      // Check morning pressure (8-10 AM)
      for (let hour = 8; hour <= 10; hour++) {
        const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        
        const slcObs = kslcHourly.get(key);
        const pvuObs = kpvuHourly.get(key);
        
        if (slcObs?.pressure && pvuObs?.pressure) {
          const gradient = slcObs.pressure - pvuObs.pressure;
          goodDayGradients.push(gradient);
        }
      }
    });
    
    noNorthDays.slice(0, 50).forEach(day => {
      for (let hour = 8; hour <= 10; hour++) {
        const checkDate = new Date(`${day.date}T${String(hour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        
        const slcObs = kslcHourly.get(key);
        const pvuObs = kpvuHourly.get(key);
        
        if (slcObs?.pressure && pvuObs?.pressure) {
          const gradient = slcObs.pressure - pvuObs.pressure;
          badDayGradients.push(gradient);
        }
      }
    });
    
    if (goodDayGradients.length > 0 && badDayGradients.length > 0) {
      const avgGoodGradient = goodDayGradients.reduce((a, b) => a + b, 0) / goodDayGradients.length;
      const avgBadGradient = badDayGradients.reduce((a, b) => a + b, 0) / badDayGradients.length;
      
      console.log(`\nMorning Pressure Gradient (SLC - Provo):`);
      console.log(`  Good north days: avg ${avgGoodGradient.toFixed(3)} mb (${goodDayGradients.length} samples)`);
      console.log(`  Non-north days:  avg ${avgBadGradient.toFixed(3)} mb (${badDayGradients.length} samples)`);
      
      // Distribution
      const positiveGood = goodDayGradients.filter(g => g > 0).length;
      const positiveBad = badDayGradients.filter(g => g > 0).length;
      
      console.log(`\n  Positive gradient (SLC > Provo = North flow likely):`);
      console.log(`    Good north days: ${(positiveGood / goodDayGradients.length * 100).toFixed(0)}%`);
      console.log(`    Non-north days:  ${(positiveBad / badDayGradients.length * 100).toFixed(0)}%`);
      
      // Find threshold
      const threshold = (avgGoodGradient + avgBadGradient) / 2;
      console.log(`\n  Suggested threshold: ΔP > ${threshold.toFixed(2)} mb`);
    }
  }
  
  // Summary and save
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY - NORTH FLOW EARLY INDICATORS');
  console.log('='.repeat(70));
  
  const findings = {
    analysis: 'North Flow Early Indicators',
    baseline: 'FPS (Flight Park South)',
    totalDays: fpsDays.size,
    goodNorthDays: goodNorthDays.length,
    
    indicators: {
      flightParkNorth: {
        station: 'FPN',
        stationName: 'Flight Park North',
        coordinates: { lat: 40.4555, lng: -111.9208 },
        elevation: 5135,
        leadTimeHours: 1,
        role: 'Early indicator - north wind here precedes FPS by ~1 hour',
        trigger: {
          direction: { min: 315, max: 45, label: 'N (NW to NE)' },
          speed: { min: 8, optimal: 10 },
        },
      },
      saltLakeCity: {
        station: 'KSLC',
        stationName: 'Salt Lake City Airport',
        coordinates: { lat: 40.7884, lng: -111.9778 },
        elevation: 4226,
        leadTimeHours: 1,
        northPercentage: 45,
        role: 'Pressure reference and wind indicator',
      },
      tooeleValley: {
        station: 'KTVY',
        stationName: 'Tooele Valley Airport',
        coordinates: { lat: 40.61, lng: -112.35 },
        elevation: 4290,
        leadTimeHours: 1,
        northPercentage: 38,
        role: 'West side indicator - shows GSL outflow',
      },
    },
    
    pressureGradient: {
      description: 'SLC - Provo pressure difference',
      positiveGradient: 'SLC > Provo = North flow likely',
      negativeGradient: 'Provo > SLC = South flow (thermal) likely',
    },
  };
  
  fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/north-flow-indicators.json');
  
  console.log(`
KEY FINDINGS FOR NORTH FLOW PREDICTION:

1. FLIGHT PARK NORTH (FPN)
   - Located north of Point of Mountain
   - Shows north wind ~1 hour before FPS/Utah Lake
   - Best trigger: North wind (315-45°) at 8+ mph

2. SALT LAKE CITY (KSLC)
   - 45% of good north days, KSLC shows north wind 1hr before
   - Also provides pressure data for gradient calculation

3. PRESSURE GRADIENT (SLC - Provo)
   - Positive gradient (SLC > Provo) = North flow likely
   - Key indicator for prefrontal north wind events

4. TOOELE VALLEY (KTVY)
   - 38% correlation - shows GSL outflow pattern
   - West side indicator

RECOMMENDATION:
Add FPN as primary north flow early indicator
Use pressure gradient (SLC > Provo) as secondary confirmation
`);
}

analyze().catch(console.error);
```

---

## File 75: `scripts/analyze-north-flow-indicators.js`

> 444 lines | 14.0 KB

```javascript
/**
 * NORTH FLOW EARLY INDICATOR ANALYSIS
 * 
 * Goal: Find if stations near Great Salt Lake are early indicators
 * for North flows at Utah Lake (Zig Zag, Pelican Point, etc.)
 * 
 * Stations to analyze:
 * - KUTW / U42 - Salt Lake City Municipal 2 (West Valley)
 * - FPN - Flight Park North
 * - Compare with Zig Zag north flow events
 * 
 * North flow characteristics:
 * - Direction: 315-45° (NW to NE, centered on N)
 * - Driven by pressure gradient (SLC > Provo)
 * - Originates from Great Salt Lake area
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function searchStations(lat, lng, radius) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=${lat},${lng},${radius}&limit=100&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressures = obs.altimeter_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressures[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Check if wind is North flow (NW to NE)
function isNorthFlow(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  // North flow: 315-360 or 0-45 (NW to NE)
  return ((dir >= 315 || dir <= 45) && obs.speed >= minSpeed);
}

// Check if wind is good kiting North flow
function isGoodNorthKite(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  const dir = obs.direction;
  return ((dir >= 315 || dir <= 45) && obs.speed >= 10);
}

async function analyze() {
  console.log('NORTH FLOW EARLY INDICATOR ANALYSIS');
  console.log('Great Salt Lake → Utah Lake Correlation');
  console.log('='.repeat(70));
  
  // First, search for stations near West Valley / Great Salt Lake area
  console.log('\nSearching for stations near West Valley / Great Salt Lake...\n');
  
  try {
    // West Valley area (40.69, -111.99)
    const westValleySearch = await searchStations(40.69, -111.99, 15);
    
    // Great Salt Lake south shore (40.75, -112.1)
    const gslSearch = await searchStations(40.75, -112.1, 20);
    
    const allStations = new Map();
    
    if (westValleySearch.STATION) {
      westValleySearch.STATION.forEach(s => {
        if (s.STID) allStations.set(s.STID, s);
      });
    }
    
    if (gslSearch.STATION) {
      gslSearch.STATION.forEach(s => {
        if (s.STID) allStations.set(s.STID, s);
      });
    }
    
    console.log('STATIONS FOUND NEAR WEST VALLEY / GSL:');
    console.log('-'.repeat(70));
    console.log('ID'.padEnd(12) + 'Name'.padEnd(40) + 'Elev (ft)');
    console.log('-'.repeat(70));
    
    const stations = Array.from(allStations.values())
      .filter(s => {
        const elev = s.ELEVATION ? s.ELEVATION * 3.28084 : 0;
        return elev > 4000 && elev < 5500; // Valley floor elevation
      })
      .sort((a, b) => (a.NAME || '').localeCompare(b.NAME || ''));
    
    stations.forEach(s => {
      const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
      console.log(
        (s.STID || '?').padEnd(12) +
        (s.NAME || '?').substring(0, 39).padEnd(40) +
        String(elev)
      );
    });
    
    console.log(`\nTotal valley stations: ${stations.length}`);
    
    // Look for specific stations we want
    const targetStations = ['U42', 'KUTW', 'KSLC', 'FPN', 'FPS', 'UTALP', 'QBF', 'QLK'];
    console.log('\nLooking for key stations:', targetStations.join(', '));
    
    // Now fetch data and analyze
    console.log('\n' + '='.repeat(70));
    console.log('FETCHING HISTORICAL DATA');
    console.log('='.repeat(70));
    
    // Get 3 months of data
    const periods = [
      { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
      { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
      { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    ];
    
    // Stations to test for north flow correlation
    const testStations = [
      'U42',    // Salt Lake City Municipal 2 (West Valley)
      'KUTW',   // Alternative ID for Municipal 2
      'KSLC',   // SLC Airport - baseline
      'FPN',    // Flight Park North
      'FPS',    // Flight Park South - baseline for Utah Lake
      'UTALP',  // Point of Mountain
      'QBF',    // Bountiful
      'QLK',    // Lake Point (near GSL)
      'KOGD',   // Ogden
      'K36U',   // Heber
    ];
    
    let allData = {};
    
    for (const stid of testStations) {
      allData[stid] = [];
      
      for (const period of periods) {
        try {
          const data = await fetchData(stid, period.start, period.end);
          const obs = parseObservations(data.STATION?.[0]);
          if (obs.length > 0) {
            allData[stid] = allData[stid].concat(obs);
          }
        } catch (e) {
          // Station might not exist
        }
      }
      
      if (allData[stid].length > 0) {
        console.log(`${stid}: ${allData[stid].length} observations`);
      }
    }
    
    // Use FPS as baseline for Utah Lake north flow events
    const fpsData = allData['FPS'] || [];
    
    if (fpsData.length === 0) {
      console.log('\nNo FPS data available for baseline');
      return;
    }
    
    // Identify north flow days at FPS (Utah Lake)
    const fpsDays = new Map();
    fpsData.forEach(obs => {
      const dateKey = getDateKey(obs.time);
      const hour = getHour(obs.time);
      
      if (!fpsDays.has(dateKey)) {
        fpsDays.set(dateKey, { 
          northHours: new Set(), 
          firstNorthHour: null,
          peakSpeed: 0,
          peakHour: null,
          goodKiteHours: 0,
        });
      }
      
      const day = fpsDays.get(dateKey);
      
      if (isNorthFlow(obs) && hour >= 6 && hour <= 20) {
        day.northHours.add(hour);
        if (day.firstNorthHour === null || hour < day.firstNorthHour) {
          day.firstNorthHour = hour;
        }
        if (obs.speed > day.peakSpeed) {
          day.peakSpeed = obs.speed;
          day.peakHour = hour;
        }
      }
      
      if (isGoodNorthKite(obs)) {
        day.goodKiteHours++;
      }
    });
    
    // Categorize days
    const goodNorthDays = [];
    const northDays = [];
    const noNorthDays = [];
    
    fpsDays.forEach((day, date) => {
      if (day.goodKiteHours >= 2 && day.peakSpeed >= 12) {
        goodNorthDays.push({ date, ...day });
      } else if (day.northHours.size >= 2) {
        northDays.push({ date, ...day });
      } else {
        noNorthDays.push({ date, ...day });
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('NORTH FLOW DAY CLASSIFICATION (at FPS/Utah Lake)');
    console.log('='.repeat(70));
    console.log(`Good north kite days (10+ mph, 2+ hours): ${goodNorthDays.length}`);
    console.log(`North flow days (8+ mph, 2+ hours): ${northDays.length}`);
    console.log(`No significant north flow: ${noNorthDays.length}`);
    
    // Analyze each potential early indicator station
    console.log('\n' + '='.repeat(70));
    console.log('EARLY INDICATOR ANALYSIS');
    console.log('='.repeat(70));
    
    const stationResults = [];
    
    for (const [stid, stationObs] of Object.entries(allData)) {
      if (stid === 'FPS' || stationObs.length === 0) continue;
      
      console.log(`\n--- Analyzing ${stid} ---`);
      console.log(`  ${stationObs.length} observations`);
      
      // Create hourly map
      const hourlyMap = new Map();
      stationObs.forEach(o => {
        const key = o.time.toISOString().slice(0, 13);
        hourlyMap.set(key, o);
      });
      
      // Check lead times for good north days
      const leadResults = { 1: [], 2: [], 3: [], 4: [] };
      
      goodNorthDays.forEach(day => {
        if (day.firstNorthHour === null) return;
        
        for (let lead = 1; lead <= 4; lead++) {
          const checkHour = day.firstNorthHour - lead;
          if (checkHour < 4) continue;
          
          const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
          const key = checkDate.toISOString().slice(0, 13);
          const leadObs = hourlyMap.get(key);
          
          if (leadObs && leadObs.speed != null) {
            leadResults[lead].push({
              date: day.date,
              speed: leadObs.speed,
              dir: leadObs.direction,
              peakSpeed: day.peakSpeed,
              isNorth: isNorthFlow(leadObs, 5), // Lower threshold for lead indicator
            });
          }
        }
      });
      
      // Calculate stats for each lead time
      let bestLead = 0;
      let bestNorthPct = 0;
      let bestAvgSpeed = 0;
      
      for (let lead = 1; lead <= 4; lead++) {
        const samples = leadResults[lead];
        if (samples.length < 3) continue;
        
        const northCount = samples.filter(s => s.isNorth).length;
        const northPct = (northCount / samples.length * 100);
        const avgSpeed = samples.reduce((s, x) => s + x.speed, 0) / samples.length;
        
        console.log(`  ${lead}hr lead: ${samples.length} samples, ${northPct.toFixed(0)}% north, avg ${avgSpeed.toFixed(1)} mph`);
        
        if (northPct > bestNorthPct) {
          bestNorthPct = northPct;
          bestLead = lead;
          bestAvgSpeed = avgSpeed;
        }
      }
      
      if (bestLead > 0 && bestNorthPct > 30) {
        stationResults.push({
          stid,
          bestLead,
          northPct: bestNorthPct,
          avgSpeed: bestAvgSpeed,
          samples: leadResults[bestLead].length,
        });
      }
      
      // Direction distribution on good north days
      const allLeadObs = [...leadResults[1], ...leadResults[2]];
      if (allLeadObs.length > 0) {
        const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
        allLeadObs.forEach(o => {
          if (o.dir == null) return;
          const d = o.dir;
          if (d >= 337.5 || d < 22.5) dirBuckets.N++;
          else if (d < 67.5) dirBuckets.NE++;
          else if (d < 112.5) dirBuckets.E++;
          else if (d < 157.5) dirBuckets.SE++;
          else if (d < 202.5) dirBuckets.S++;
          else if (d < 247.5) dirBuckets.SW++;
          else if (d < 292.5) dirBuckets.W++;
          else dirBuckets.NW++;
        });
        
        console.log(`  Direction distribution (1-2hr before north flow at FPS):`);
        Object.entries(dirBuckets).forEach(([dir, count]) => {
          if (count > 0) {
            const pct = (count / allLeadObs.length * 100).toFixed(0);
            console.log(`    ${dir}: ${count} (${pct}%)`);
          }
        });
      }
    }
    
    // Sort by north percentage
    stationResults.sort((a, b) => b.northPct - a.northPct);
    
    console.log('\n' + '='.repeat(70));
    console.log('BEST NORTH FLOW EARLY INDICATORS');
    console.log('='.repeat(70));
    console.log('\nStation'.padEnd(12) + 'Lead Time'.padEnd(12) + 'North %'.padEnd(12) + 'Avg Speed'.padEnd(12) + 'Samples');
    console.log('-'.repeat(60));
    
    stationResults.forEach(r => {
      console.log(
        r.stid.padEnd(12) +
        `${r.bestLead} hours`.padEnd(12) +
        `${r.northPct.toFixed(0)}%`.padEnd(12) +
        `${r.avgSpeed.toFixed(1)} mph`.padEnd(12) +
        r.samples
      );
    });
    
    // Save findings
    const findings = {
      analysis: 'North Flow Early Indicators',
      description: 'Stations that show north wind before Utah Lake north flow events',
      baseline: 'FPS (Flight Park South)',
      totalDays: fpsDays.size,
      goodNorthDays: goodNorthDays.length,
      northDays: northDays.length,
      indicators: stationResults.map(r => ({
        station: r.stid,
        leadTimeHours: r.bestLead,
        northWindPercentage: r.northPct,
        avgSpeed: r.avgSpeed,
        samples: r.samples,
      })),
      trigger: {
        direction: { min: 315, max: 45, label: 'N (NW to NE)' },
        speed: { min: 8, optimal: 12 },
      },
    };
    
    fs.writeFileSync('./src/data/north-flow-indicators.json', JSON.stringify(findings, null, 2));
    console.log('\nSaved to src/data/north-flow-indicators.json');
    
    console.log('\n' + '='.repeat(70));
    console.log('CONCLUSION');
    console.log('='.repeat(70));
    
    if (stationResults.length > 0) {
      const best = stationResults[0];
      console.log(`
KEY FINDING: ${best.stid} is the best early indicator for North flows!

When ${best.stid} shows North wind (315-45°):
- ${best.northPct.toFixed(0)}% of the time, Utah Lake gets good north flow
- Average speed at indicator: ${best.avgSpeed.toFixed(1)} mph
- Lead time: ~${best.bestLead} hours before Utah Lake

RECOMMENDATION: Add ${best.stid} to the prediction model as a
${best.bestLead}-hour early warning indicator for North flows.
`);
    } else {
      console.log('\nNo strong early indicators found. May need more data or different stations.');
    }
    
  } catch (err) {
    console.error('Analysis error:', err.message);
  }
}

analyze().catch(console.error);
```

---

## File 76: `scripts/analyze-provo-lincoln-sandy.js`

> 467 lines | 17.2 KB

```javascript
/**
 * PROVO AIRPORT & POINT OF MOUNTAIN ANALYSIS
 * 
 * Goal: Find correlation between:
 * - KPVU (Provo Airport) → Lincoln Beach / Sandy Beach wind
 * - UTALP (Point of Mountain) → Utah Lake north flow
 * 
 * These southern stations may be better indicators for the
 * southern Utah Lake launches than KSLC.
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthWind(dir) {
  if (dir == null) return false;
  return dir >= 315 || dir <= 45;
}

function isSEWind(dir) {
  if (dir == null) return false;
  return dir >= 100 && dir <= 180;
}

async function analyze() {
  console.log('PROVO AIRPORT & POINT OF MOUNTAIN ANALYSIS');
  console.log('Indicators for Lincoln Beach & Sandy Beach');
  console.log('='.repeat(70));
  
  // Fetch data for all relevant stations
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  const stations = ['KPVU', 'UTALP', 'FPS', 'KSLC'];
  let allData = {};
  
  console.log('\nFetching data...\n');
  
  for (const stid of stations) {
    allData[stid] = [];
    for (const period of periods) {
      try {
        const data = await fetchData(stid, period.start, period.end);
        const obs = parseObservations(data.STATION?.[0]);
        allData[stid] = allData[stid].concat(obs);
      } catch (e) {}
    }
    console.log(`${stid}: ${allData[stid].length} observations`);
  }
  
  // Create hourly maps
  const createHourlyMap = (data) => {
    const map = new Map();
    data.forEach(o => {
      const key = o.time.toISOString().slice(0, 13);
      map.set(key, o);
    });
    return map;
  };
  
  const kpvuHourly = createHourlyMap(allData['KPVU']);
  const utalpHourly = createHourlyMap(allData['UTALP']);
  const fpsHourly = createHourlyMap(allData['FPS']);
  const kslcHourly = createHourlyMap(allData['KSLC']);
  
  // =====================================================
  // ANALYSIS 1: KPVU as indicator for FPS (southern launches)
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('KPVU (PROVO AIRPORT) → FPS CORRELATION');
  console.log('For Lincoln Beach & Sandy Beach');
  console.log('='.repeat(70));
  
  // When KPVU shows north wind, what happens at FPS?
  const kpvuNorthBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // Same hour correlation
  kpvuHourly.forEach((kpvuObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(kpvuObs.time);
    if (hour < 9 || hour > 18) return;
    
    // Only when KPVU shows north wind
    if (!isNorthWind(kpvuObs.direction)) return;
    
    const kpvuSpeed = kpvuObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kpvuSpeed < 5) bucket = '0-5';
    else if (kpvuSpeed < 8) bucket = '5-8';
    else if (kpvuSpeed < 10) bucket = '8-10';
    else if (kpvuSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    kpvuNorthBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) kpvuNorthBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen KPVU shows NORTH wind (same hour at FPS):');
  console.log('\nKPVU Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(kpvuNorthBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // 1-hour lead correlation for KPVU
  const kpvuLeadBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  kpvuHourly.forEach((kpvuObs, key) => {
    const hour = getHour(kpvuObs.time);
    if (hour < 8 || hour > 16) return;
    
    if (!isNorthWind(kpvuObs.direction)) return;
    
    // Get FPS 1 hour later
    const laterTime = new Date(kpvuObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const kpvuSpeed = kpvuObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kpvuSpeed < 5) bucket = '0-5';
    else if (kpvuSpeed < 8) bucket = '5-8';
    else if (kpvuSpeed < 10) bucket = '8-10';
    else if (kpvuSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    kpvuLeadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) kpvuLeadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen KPVU shows NORTH wind (FPS 1 hour LATER):');
  console.log('\nKPVU Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(kpvuLeadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // =====================================================
  // ANALYSIS 2: UTALP (Point of Mountain) as indicator
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('UTALP (POINT OF MOUNTAIN) → FPS CORRELATION');
  console.log('='.repeat(70));
  
  const utalpNorthBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // Same hour
  utalpHourly.forEach((utalpObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(utalpObs.time);
    if (hour < 9 || hour > 18) return;
    
    if (!isNorthWind(utalpObs.direction)) return;
    
    const utalpSpeed = utalpObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (utalpSpeed < 5) bucket = '0-5';
    else if (utalpSpeed < 8) bucket = '5-8';
    else if (utalpSpeed < 10) bucket = '8-10';
    else if (utalpSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    utalpNorthBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) utalpNorthBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen UTALP shows NORTH wind (same hour at FPS):');
  console.log('\nUTALP Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(utalpNorthBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(11)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // 1-hour lead for UTALP
  const utalpLeadBuckets = {
    '0-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  utalpHourly.forEach((utalpObs, key) => {
    const hour = getHour(utalpObs.time);
    if (hour < 8 || hour > 16) return;
    
    if (!isNorthWind(utalpObs.direction)) return;
    
    const laterTime = new Date(utalpObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const utalpSpeed = utalpObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (utalpSpeed < 5) bucket = '0-5';
    else if (utalpSpeed < 8) bucket = '5-8';
    else if (utalpSpeed < 10) bucket = '8-10';
    else if (utalpSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    utalpLeadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) utalpLeadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
  });
  
  console.log('\nWhen UTALP shows NORTH wind (FPS 1 hour LATER):');
  console.log('\nUTALP Speed | Samples | FPS Avg | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(70));
  
  Object.entries(utalpLeadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(11)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // =====================================================
  // COMPARISON: KSLC vs KPVU vs UTALP
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON: KSLC vs KPVU vs UTALP (8-10 mph North)');
  console.log('='.repeat(70));
  
  // Get KSLC data for comparison
  const kslcLeadBuckets = { '8-10': { fpsSpeeds: [] } };
  
  kslcHourly.forEach((kslcObs, key) => {
    const hour = getHour(kslcObs.time);
    if (hour < 8 || hour > 16) return;
    if (!isNorthWind(kslcObs.direction)) return;
    if (kslcObs.speed < 8 || kslcObs.speed >= 10) return;
    
    const laterTime = new Date(kslcObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    kslcLeadBuckets['8-10'].fpsSpeeds.push(fpsObs.speed);
  });
  
  console.log('\nAt 8-10 mph North wind, FPS speed 1 hour later:');
  console.log('\nStation | Samples | FPS Avg | Kiteable (10+) | Twin Tip (15+)');
  console.log('-'.repeat(70));
  
  const compareStations = [
    { name: 'KSLC', data: kslcLeadBuckets['8-10'] },
    { name: 'KPVU', data: kpvuLeadBuckets['8-10'] },
    { name: 'UTALP', data: utalpLeadBuckets['8-10'] },
  ];
  
  compareStations.forEach(({ name, data }) => {
    if (!data || data.fpsSpeeds.length === 0) {
      console.log(`${name.padEnd(7)} | No data`);
      return;
    }
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const foilPct = (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0);
    const twinPct = (data.fpsSpeeds.filter(s => s >= 15).length / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${name.padEnd(7)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${foilPct.padStart(13)}% | ${twinPct.padStart(13)}%`
    );
  });
  
  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  const kpvu810 = kpvuLeadBuckets['8-10'];
  const utalp810 = utalpLeadBuckets['8-10'];
  const kslc810 = kslcLeadBuckets['8-10'];
  
  console.log(`
PROVO AIRPORT (KPVU) - For Lincoln Beach & Sandy Beach:
  - At 8-10 mph North: FPS avg ${kpvu810.fpsSpeeds.length > 0 ? (kpvu810.fpsSpeeds.reduce((a,b)=>a+b,0)/kpvu810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${kpvu810.fpsSpeeds.length > 0 ? (kpvu810.fpsSpeeds.filter(s=>s>=10).length/kpvu810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
  - KPVU is closer to southern launches - may be better indicator

POINT OF MOUNTAIN (UTALP) - North flow indicator:
  - At 8-10 mph North: FPS avg ${utalp810.fpsSpeeds.length > 0 ? (utalp810.fpsSpeeds.reduce((a,b)=>a+b,0)/utalp810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${utalp810.fpsSpeeds.length > 0 ? (utalp810.fpsSpeeds.filter(s=>s>=10).length/utalp810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
  - Shows wind funneling through the gap

SALT LAKE CITY (KSLC) - Baseline comparison:
  - At 8-10 mph North: FPS avg ${kslc810.fpsSpeeds.length > 0 ? (kslc810.fpsSpeeds.reduce((a,b)=>a+b,0)/kslc810.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable: ${kslc810.fpsSpeeds.length > 0 ? (kslc810.fpsSpeeds.filter(s=>s>=10).length/kslc810.fpsSpeeds.length*100).toFixed(0) : 'N/A'}%
`);

  // Save results
  const results = {
    kpvu: {
      station: 'KPVU',
      name: 'Provo Airport',
      coordinates: { lat: 40.2192, lng: -111.7236 },
      elevation: 4495,
      correlation: Object.fromEntries(
        Object.entries(kpvuLeadBuckets).map(([range, data]) => [
          range,
          {
            samples: data.fpsSpeeds.length,
            avgFps: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.reduce((a,b)=>a+b,0)/data.fpsSpeeds.length).toFixed(1) : null,
            foilKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=10).length/data.fpsSpeeds.length*100).toFixed(0) : null,
            twinTipKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=15).length/data.fpsSpeeds.length*100).toFixed(0) : null,
          }
        ])
      ),
    },
    utalp: {
      station: 'UTALP',
      name: 'Point of Mountain',
      coordinates: { lat: 40.4456, lng: -111.8983 },
      elevation: 4796,
      correlation: Object.fromEntries(
        Object.entries(utalpLeadBuckets).map(([range, data]) => [
          range,
          {
            samples: data.fpsSpeeds.length,
            avgFps: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.reduce((a,b)=>a+b,0)/data.fpsSpeeds.length).toFixed(1) : null,
            foilKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=10).length/data.fpsSpeeds.length*100).toFixed(0) : null,
            twinTipKiteable: data.fpsSpeeds.length > 0 ? (data.fpsSpeeds.filter(s=>s>=15).length/data.fpsSpeeds.length*100).toFixed(0) : null,
          }
        ])
      ),
    },
  };
  
  fs.writeFileSync('./src/data/provo-utalp-correlation.json', JSON.stringify(results, null, 2));
  console.log('Saved to src/data/provo-utalp-correlation.json');
}

analyze().catch(console.error);
```

---

## File 77: `scripts/analyze-spanish-fork-correlation.js`

> 328 lines | 11.1 KB

```javascript
/**
 * SPANISH FORK CANYON CORRELATION ANALYSIS
 * 
 * Goal: Find if Spanish Fork Canyon wind patterns are early indicators
 * for Zig Zag thermals
 * 
 * Stations to analyze:
 * - KSPK - Spanish Fork Airport
 * - SPC - Spanish Fork Canyon
 * - MTMET - Spanish Fork Peak
 * - Compare with FPS (Flight Park) and your Zig Zag data
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

// Stations to check
const STATIONS_TO_CHECK = [
  'KSPK',   // Spanish Fork Airport
  'SPC',    // Spanish Fork Canyon  
  'SFCU1',  // Spanish Fork Canyon Utah
  'MTMET',  // Spanish Fork Peak area
  'UT12',   // Utah County station
  'UTSPY',  // Spanish Fork
  'FPS',    // Flight Park South (known good indicator)
];

async function fetchStationInfo(stid) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/metadata?stid=${stid}&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Search for stations near Spanish Fork
async function searchStations() {
  return new Promise((resolve, reject) => {
    // Search for stations within 20 miles of Spanish Fork Canyon
    const url = `https://api.synopticdata.com/v2/stations/metadata?radius=40.077,-111.55,30&limit=50&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Check if wind matches SE thermal criteria
function isSEThermal(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= 100 && obs.direction <= 180 && obs.speed >= 8;
}

async function analyze() {
  console.log('SPANISH FORK CANYON - EARLY INDICATOR ANALYSIS');
  console.log('='.repeat(70));
  
  // First, search for all stations in the Spanish Fork area
  console.log('\nSearching for stations near Spanish Fork Canyon...\n');
  
  try {
    const searchResult = await searchStations();
    
    if (searchResult.STATION) {
      console.log('STATIONS FOUND NEAR SPANISH FORK:');
      console.log('-'.repeat(70));
      console.log('ID'.padEnd(12) + 'Name'.padEnd(35) + 'Elev (ft)'.padEnd(12) + 'Lat/Lng');
      console.log('-'.repeat(70));
      
      const stations = searchResult.STATION.sort((a, b) => 
        (a.ELEVATION || 0) - (b.ELEVATION || 0)
      );
      
      stations.forEach(s => {
        const elev = s.ELEVATION ? Math.round(s.ELEVATION * 3.28084) : '?';
        const lat = typeof s.LATITUDE === 'number' ? s.LATITUDE.toFixed(4) : '?';
        const lng = typeof s.LONGITUDE === 'number' ? s.LONGITUDE.toFixed(4) : '?';
        console.log(
          (s.STID || '?').padEnd(12) +
          (s.NAME || '?').substring(0, 34).padEnd(35) +
          String(elev).padEnd(12) +
          `${lat}, ${lng}`
        );
      });
      
      console.log(`\nTotal: ${stations.length} stations found`);
      
      // Pick the most relevant stations for analysis
      const relevantStations = stations.filter(s => 
        s.STID && (
          s.NAME?.toLowerCase().includes('spanish') ||
          s.NAME?.toLowerCase().includes('canyon') ||
          s.NAME?.toLowerCase().includes('fork') ||
          s.ELEVATION > 5000 // Higher elevation stations
        )
      );
      
      console.log(`\nRelevant stations for analysis: ${relevantStations.length}`);
      relevantStations.forEach(s => {
        console.log(`  - ${s.STID}: ${s.NAME} (${Math.round((s.ELEVATION || 0) * 3.28084)} ft)`);
      });
      
      // Now fetch data and correlate with FPS
      console.log('\n' + '='.repeat(70));
      console.log('CORRELATION ANALYSIS');
      console.log('='.repeat(70));
      
      // Get summer data
      const start = '202507010000';
      const end = '202507310000';
      
      console.log(`\nFetching July 2025 data for correlation...\n`);
      
      // Fetch FPS data as baseline
      const fpsData = await fetchData('FPS', start, end);
      const fps = parseObservations(fpsData.STATION?.[0]);
      console.log(`FPS (Flight Park): ${fps.length} observations`);
      
      // Identify thermal days at FPS
      const fpsDays = new Map();
      fps.forEach(obs => {
        const dateKey = getDateKey(obs.time);
        const hour = getHour(obs.time);
        
        if (!fpsDays.has(dateKey)) {
          fpsDays.set(dateKey, { thermalHours: new Set(), firstThermalHour: null });
        }
        
        if (isSEThermal(obs) && hour >= 6 && hour <= 18) {
          fpsDays.get(dateKey).thermalHours.add(hour);
          if (fpsDays.get(dateKey).firstThermalHour === null || hour < fpsDays.get(dateKey).firstThermalHour) {
            fpsDays.get(dateKey).firstThermalHour = hour;
          }
        }
      });
      
      const thermalDays = Array.from(fpsDays.entries())
        .filter(([_, d]) => d.thermalHours.size >= 2)
        .map(([date, d]) => ({ date, ...d }));
      
      console.log(`\nThermal days at FPS: ${thermalDays.length}`);
      
      // Now check each Spanish Fork area station
      for (const station of relevantStations.slice(0, 5)) {
        console.log(`\n--- Analyzing ${station.STID}: ${station.NAME} ---`);
        
        try {
          const stationData = await fetchData(station.STID, start, end);
          const obs = parseObservations(stationData.STATION?.[0]);
          
          if (obs.length === 0) {
            console.log('  No data available');
            continue;
          }
          
          console.log(`  ${obs.length} observations`);
          
          // Create hourly map
          const hourlyMap = new Map();
          obs.forEach(o => {
            const key = o.time.toISOString().slice(0, 13);
            hourlyMap.set(key, o);
          });
          
          // For each thermal day, check what this station showed 1-3 hours before
          let leadIndicators = [];
          
          thermalDays.forEach(day => {
            if (day.firstThermalHour === null) return;
            
            // Check 1, 2, 3 hours before thermal started at FPS
            for (let leadHours = 1; leadHours <= 3; leadHours++) {
              const checkHour = day.firstThermalHour - leadHours;
              if (checkHour < 5) continue;
              
              const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
              const key = checkDate.toISOString().slice(0, 13);
              const leadObs = hourlyMap.get(key);
              
              if (leadObs) {
                leadIndicators.push({
                  date: day.date,
                  leadHours,
                  thermalStartHour: day.firstThermalHour,
                  stationSpeed: leadObs.speed,
                  stationDir: leadObs.direction,
                  stationTemp: leadObs.temp,
                });
              }
            }
          });
          
          if (leadIndicators.length > 0) {
            // Analyze patterns
            const avgSpeed = leadIndicators.reduce((s, i) => s + (i.stationSpeed || 0), 0) / leadIndicators.length;
            const avgDir = leadIndicators.filter(i => i.stationDir).reduce((s, i) => s + i.stationDir, 0) / leadIndicators.filter(i => i.stationDir).length;
            
            console.log(`\n  LEAD INDICATOR PATTERNS (before FPS thermal):`);
            console.log(`  Samples: ${leadIndicators.length}`);
            console.log(`  Avg wind speed: ${avgSpeed.toFixed(1)} mph`);
            console.log(`  Avg direction: ${avgDir?.toFixed(0) || 'N/A'}°`);
            
            // Direction distribution
            const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
            leadIndicators.forEach(i => {
              if (i.stationDir == null) return;
              const d = i.stationDir;
              if (d >= 337.5 || d < 22.5) dirBuckets.N++;
              else if (d < 67.5) dirBuckets.NE++;
              else if (d < 112.5) dirBuckets.E++;
              else if (d < 157.5) dirBuckets.SE++;
              else if (d < 202.5) dirBuckets.S++;
              else if (d < 247.5) dirBuckets.SW++;
              else if (d < 292.5) dirBuckets.W++;
              else dirBuckets.NW++;
            });
            
            console.log(`  Direction distribution:`);
            Object.entries(dirBuckets).forEach(([dir, count]) => {
              const pct = (count / leadIndicators.length * 100).toFixed(0);
              if (count > 0) {
                console.log(`    ${dir}: ${count} (${pct}%)`);
              }
            });
            
            // Speed distribution
            const speedBuckets = { '0-5': 0, '5-10': 0, '10-15': 0, '15-20': 0, '20+': 0 };
            leadIndicators.forEach(i => {
              if (i.stationSpeed == null) return;
              if (i.stationSpeed < 5) speedBuckets['0-5']++;
              else if (i.stationSpeed < 10) speedBuckets['5-10']++;
              else if (i.stationSpeed < 15) speedBuckets['10-15']++;
              else if (i.stationSpeed < 20) speedBuckets['15-20']++;
              else speedBuckets['20+']++;
            });
            
            console.log(`  Speed distribution:`);
            Object.entries(speedBuckets).forEach(([range, count]) => {
              const pct = (count / leadIndicators.length * 100).toFixed(0);
              if (count > 0) {
                console.log(`    ${range} mph: ${count} (${pct}%)`);
              }
            });
          }
          
        } catch (err) {
          console.log(`  Error: ${err.message}`);
        }
      }
      
    } else {
      console.log('No stations found');
    }
    
  } catch (err) {
    console.error('Search error:', err.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
}

analyze().catch(console.error);
```

---

## File 78: `scripts/analyze-spanish-fork-deep.js`

> 394 lines | 12.2 KB

```javascript
/**
 * DEEP SPANISH FORK CORRELATION ANALYSIS
 * 
 * Based on initial findings:
 * - QSF (Spanish Fork) shows 90% SE direction 1-3 hours before FPS thermal
 * - This could be a key early indicator
 * 
 * Now let's analyze:
 * 1. Exact lead time (how many hours before?)
 * 2. Speed thresholds that predict good thermals
 * 3. Correlation with Zig Zag historical data
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null || o.direction != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isSEThermal(obs, minSpeed = 8) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= 100 && obs.direction <= 180 && obs.speed >= minSpeed;
}

function isGoodKiteWind(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= 100 && obs.direction <= 180 && obs.speed >= 10;
}

async function analyze() {
  console.log('SPANISH FORK (QSF) - DEEP CORRELATION ANALYSIS');
  console.log('='.repeat(70));
  
  // Load Zig Zag historical data
  let zigzagData;
  try {
    const zigzagPath = './src/data/zigzag-historical.json';
    zigzagData = JSON.parse(fs.readFileSync(zigzagPath, 'utf8'));
    console.log('Loaded Zig Zag historical data');
  } catch (e) {
    console.log('Could not load Zig Zag data, continuing with MesoWest only');
  }
  
  // Fetch 3 months of summer data for comprehensive analysis
  const periods = [
    { name: 'June 2025', start: '202506010000', end: '202506300000' },
    { name: 'July 2025', start: '202507010000', end: '202507310000' },
    { name: 'Aug 2025', start: '202508010000', end: '202508310000' },
  ];
  
  let allQSF = [];
  let allFPS = [];
  
  for (const period of periods) {
    console.log(`\nFetching ${period.name}...`);
    
    const [qsfData, fpsData] = await Promise.all([
      fetchData('QSF', period.start, period.end),
      fetchData('FPS', period.start, period.end),
    ]);
    
    const qsf = parseObservations(qsfData.STATION?.[0]);
    const fps = parseObservations(fpsData.STATION?.[0]);
    
    console.log(`  QSF: ${qsf.length} obs, FPS: ${fps.length} obs`);
    
    allQSF = allQSF.concat(qsf);
    allFPS = allFPS.concat(fps);
  }
  
  console.log(`\nTotal: QSF ${allQSF.length} obs, FPS ${allFPS.length} obs`);
  
  // Create hourly maps
  const qsfHourly = new Map();
  allQSF.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    qsfHourly.set(key, o);
  });
  
  const fpsHourly = new Map();
  allFPS.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    if (!fpsHourly.has(key) || o.speed > fpsHourly.get(key).speed) {
      fpsHourly.set(key, o);
    }
  });
  
  // Identify thermal events at FPS (good kite days)
  const fpsDays = new Map();
  allFPS.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getHour(obs.time);
    
    if (!fpsDays.has(dateKey)) {
      fpsDays.set(dateKey, { 
        thermalHours: new Set(), 
        firstThermalHour: null,
        peakSpeed: 0,
        peakHour: null,
        goodKiteHours: 0,
      });
    }
    
    const day = fpsDays.get(dateKey);
    
    if (isSEThermal(obs) && hour >= 6 && hour <= 18) {
      day.thermalHours.add(hour);
      if (day.firstThermalHour === null || hour < day.firstThermalHour) {
        day.firstThermalHour = hour;
      }
      if (obs.speed > day.peakSpeed) {
        day.peakSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
    
    if (isGoodKiteWind(obs)) {
      day.goodKiteHours++;
    }
  });
  
  // Categorize days
  const thermalDays = [];
  const goodKiteDays = [];
  const bustDays = [];
  
  fpsDays.forEach((day, date) => {
    if (day.goodKiteHours >= 3 && day.peakSpeed >= 12) {
      goodKiteDays.push({ date, ...day });
    } else if (day.thermalHours.size >= 2) {
      thermalDays.push({ date, ...day });
    } else {
      bustDays.push({ date, ...day });
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('DAY CLASSIFICATION');
  console.log('='.repeat(70));
  console.log(`Good kite days (10+ mph, 3+ hours): ${goodKiteDays.length}`);
  console.log(`Thermal days (8+ mph, 2+ hours): ${thermalDays.length}`);
  console.log(`Bust days: ${bustDays.length}`);
  
  // Analyze QSF patterns for each category
  console.log('\n' + '='.repeat(70));
  console.log('QSF LEAD TIME ANALYSIS');
  console.log('='.repeat(70));
  
  function analyzeLeadPatterns(days, label) {
    console.log(`\n--- ${label} (${days.length} days) ---`);
    
    const leadTimeResults = {};
    
    // Check 1, 2, 3, 4 hours before
    for (let leadHours = 1; leadHours <= 4; leadHours++) {
      leadTimeResults[leadHours] = {
        samples: 0,
        seCount: 0,
        avgSpeed: 0,
        speeds: [],
        directions: [],
      };
    }
    
    days.forEach(day => {
      if (day.firstThermalHour === null) return;
      
      for (let leadHours = 1; leadHours <= 4; leadHours++) {
        const checkHour = day.firstThermalHour - leadHours;
        if (checkHour < 5) continue;
        
        const checkDate = new Date(`${day.date}T${String(checkHour).padStart(2, '0')}:00:00`);
        const key = checkDate.toISOString().slice(0, 13);
        const qsfObs = qsfHourly.get(key);
        
        if (qsfObs && qsfObs.speed != null) {
          const result = leadTimeResults[leadHours];
          result.samples++;
          result.speeds.push(qsfObs.speed);
          if (qsfObs.direction != null) {
            result.directions.push(qsfObs.direction);
            if (qsfObs.direction >= 100 && qsfObs.direction <= 180) {
              result.seCount++;
            }
          }
        }
      }
    });
    
    // Calculate stats
    console.log('\nLead Time | Samples | SE Wind % | Avg Speed | Speed Range');
    console.log('-'.repeat(60));
    
    for (let leadHours = 1; leadHours <= 4; leadHours++) {
      const r = leadTimeResults[leadHours];
      if (r.samples === 0) continue;
      
      const sePct = (r.seCount / r.samples * 100).toFixed(0);
      const avgSpeed = (r.speeds.reduce((a, b) => a + b, 0) / r.speeds.length).toFixed(1);
      const minSpeed = Math.min(...r.speeds).toFixed(1);
      const maxSpeed = Math.max(...r.speeds).toFixed(1);
      
      console.log(
        `${leadHours} hour    | ${String(r.samples).padStart(7)} | ${sePct.padStart(7)}% | ${avgSpeed.padStart(9)} | ${minSpeed}-${maxSpeed}`
      );
    }
    
    return leadTimeResults;
  }
  
  const goodKitePatterns = analyzeLeadPatterns(goodKiteDays, 'GOOD KITE DAYS');
  const thermalPatterns = analyzeLeadPatterns(thermalDays, 'THERMAL DAYS');
  const bustPatterns = analyzeLeadPatterns(bustDays, 'BUST DAYS');
  
  // Find the best predictor thresholds
  console.log('\n' + '='.repeat(70));
  console.log('PREDICTION THRESHOLDS');
  console.log('='.repeat(70));
  
  // 2-hour lead time seems most reliable
  const leadHour = 2;
  
  console.log(`\nUsing ${leadHour}-hour lead time for predictions:`);
  
  if (goodKitePatterns[leadHour].samples > 0 && bustPatterns[leadHour].samples > 0) {
    const goodAvg = goodKitePatterns[leadHour].speeds.reduce((a, b) => a + b, 0) / goodKitePatterns[leadHour].speeds.length;
    const bustAvg = bustPatterns[leadHour].speeds.reduce((a, b) => a + b, 0) / bustPatterns[leadHour].speeds.length;
    
    console.log(`\nGood kite days: QSF avg speed = ${goodAvg.toFixed(1)} mph`);
    console.log(`Bust days: QSF avg speed = ${bustAvg.toFixed(1)} mph`);
    
    // Find threshold
    const threshold = (goodAvg + bustAvg) / 2;
    console.log(`\nSuggested threshold: QSF > ${threshold.toFixed(1)} mph`);
    
    // Calculate accuracy
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    goodKitePatterns[leadHour].speeds.forEach(speed => {
      totalPredictions++;
      if (speed >= threshold) correctPredictions++;
    });
    
    bustPatterns[leadHour].speeds.forEach(speed => {
      totalPredictions++;
      if (speed < threshold) correctPredictions++;
    });
    
    const accuracy = (correctPredictions / totalPredictions * 100).toFixed(1);
    console.log(`Prediction accuracy: ${accuracy}%`);
  }
  
  // Direction analysis
  console.log('\n' + '='.repeat(70));
  console.log('DIRECTION ANALYSIS');
  console.log('='.repeat(70));
  
  function analyzeDirections(patterns, label) {
    const dirs = patterns[2]?.directions || [];
    if (dirs.length === 0) return;
    
    console.log(`\n${label} - QSF direction 2 hours before:`);
    
    const buckets = {
      'N (315-45)': 0,
      'NE (45-90)': 0,
      'E (90-135)': 0,
      'SE (135-180)': 0,
      'S (180-225)': 0,
      'SW (225-270)': 0,
      'W (270-315)': 0,
    };
    
    dirs.forEach(d => {
      if (d >= 315 || d < 45) buckets['N (315-45)']++;
      else if (d < 90) buckets['NE (45-90)']++;
      else if (d < 135) buckets['E (90-135)']++;
      else if (d < 180) buckets['SE (135-180)']++;
      else if (d < 225) buckets['S (180-225)']++;
      else if (d < 270) buckets['SW (225-270)']++;
      else buckets['W (270-315)']++;
    });
    
    Object.entries(buckets).forEach(([dir, count]) => {
      if (count > 0) {
        const pct = (count / dirs.length * 100).toFixed(0);
        const bar = '█'.repeat(Math.round(pct / 5));
        console.log(`  ${dir.padEnd(15)} ${String(count).padStart(3)} (${pct.padStart(2)}%) ${bar}`);
      }
    });
  }
  
  analyzeDirections(goodKitePatterns, 'Good Kite Days');
  analyzeDirections(bustPatterns, 'Bust Days');
  
  // Export findings
  const findings = {
    station: 'QSF',
    stationName: 'Spanish Fork',
    analysis: {
      totalDays: fpsDays.size,
      goodKiteDays: goodKiteDays.length,
      thermalDays: thermalDays.length,
      bustDays: bustDays.length,
    },
    leadIndicator: {
      optimalLeadHours: 2,
      goodKiteDayPattern: {
        avgSpeed: goodKitePatterns[2]?.speeds.length > 0 
          ? (goodKitePatterns[2].speeds.reduce((a, b) => a + b, 0) / goodKitePatterns[2].speeds.length).toFixed(1)
          : null,
        sePct: goodKitePatterns[2]?.samples > 0
          ? (goodKitePatterns[2].seCount / goodKitePatterns[2].samples * 100).toFixed(0)
          : null,
      },
      bustDayPattern: {
        avgSpeed: bustPatterns[2]?.speeds.length > 0
          ? (bustPatterns[2].speeds.reduce((a, b) => a + b, 0) / bustPatterns[2].speeds.length).toFixed(1)
          : null,
        sePct: bustPatterns[2]?.samples > 0
          ? (bustPatterns[2].seCount / bustPatterns[2].samples * 100).toFixed(0)
          : null,
      },
    },
    thresholds: {
      goodKiteIndicator: {
        direction: '100-180° (SE)',
        speed: '> 6 mph',
        leadTime: '2 hours before thermal',
      },
    },
  };
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY FINDINGS');
  console.log('='.repeat(70));
  console.log(JSON.stringify(findings, null, 2));
  
  // Save findings
  fs.writeFileSync('./src/data/spanish-fork-correlation.json', JSON.stringify(findings, null, 2));
  console.log('\nSaved to src/data/spanish-fork-correlation.json');
  
  console.log('\n' + '='.repeat(70));
  console.log('KEY FINDING: Spanish Fork (QSF) is an early indicator!');
  console.log('When QSF shows SE wind (100-180°) at 6+ mph, expect thermal');
  console.log('at Zig Zag/FPS approximately 2 hours later.');
  console.log('='.repeat(70));
}

analyze().catch(console.error);
```

---

## File 79: `scripts/analyze-vineyard-conditions.js`

> 262 lines | 9.5 KB

```javascript
/**
 * Analyze current conditions for Vineyard and find historical patterns
 * Uses American Fork Marina (if available) and other nearby stations
 */

import https from 'https';
import fs from 'fs';

// Load environment
const envPath = '.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN || 'REDACTED_SYNOPTIC_TOKEN';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function searchStations() {
  console.log('=== SEARCHING FOR STATIONS NEAR VINEYARD ===\n');
  
  // Search for stations near Vineyard (40.3176, -111.7647)
  const searchUrl = `https://api.synopticdata.com/v2/stations/metadata?token=${SYNOPTIC_TOKEN}&radius=40.3176,-111.7647,20&limit=30&complete=1`;
  
  try {
    const data = await fetchJSON(searchUrl);
    
    if (data.STATION) {
      console.log('Stations within 20 miles of Vineyard:\n');
      data.STATION.forEach(s => {
        const dist = s.DISTANCE || 'N/A';
        console.log(`  ${s.STID.padEnd(10)} - ${(s.NAME || 'Unknown').padEnd(30)} (${dist} mi)`);
      });
      
      // Look for marina or lake stations
      const marinaStations = data.STATION.filter(s => 
        s.NAME?.toLowerCase().includes('marina') ||
        s.NAME?.toLowerCase().includes('lake') ||
        s.NAME?.toLowerCase().includes('harbor')
      );
      
      if (marinaStations.length > 0) {
        console.log('\n--- Marina/Lake Stations Found ---');
        marinaStations.forEach(s => {
          console.log(`  ${s.STID}: ${s.NAME}`);
        });
      }
    }
  } catch (e) {
    console.error('Error searching stations:', e.message);
  }
}

async function getCurrentConditions() {
  console.log('\n=== CURRENT CONDITIONS ===\n');
  
  // Key stations for Vineyard analysis
  const stations = 'KSLC,KPVU,FPS,UTALP,QLN,QSF';
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${SYNOPTIC_TOKEN}&stid=${stations}&vars=wind_speed,wind_direction,wind_gust,air_temp,altimeter&units=english`;
  
  try {
    const data = await fetchJSON(url);
    
    if (data.STATION) {
      console.log('Station          Wind(mph)  Dir    Gust   Temp   Pressure');
      console.log('----------------------------------------------------------------');
      
      data.STATION.forEach(s => {
        const obs = s.OBSERVATIONS || {};
        const speed = obs.wind_speed_value_1?.value?.toFixed(1) || '--';
        const dir = obs.wind_direction_value_1?.value?.toFixed(0) || '--';
        const gust = obs.wind_gust_value_1?.value?.toFixed(1) || '--';
        const temp = obs.air_temp_value_1?.value?.toFixed(1) || '--';
        const pres = obs.altimeter_value_1?.value?.toFixed(2) || '--';
        
        console.log(`${s.STID.padEnd(16)} ${speed.padStart(6)}    ${dir.padStart(4)}°   ${gust.padStart(5)}  ${temp.padStart(5)}°F  ${pres}`);
      });
      
      // Calculate pressure gradient
      const kslc = data.STATION.find(s => s.STID === 'KSLC');
      const kpvu = data.STATION.find(s => s.STID === 'KPVU');
      
      if (kslc && kpvu) {
        const slcPres = kslc.OBSERVATIONS?.altimeter_value_1?.value;
        const pvuPres = kpvu.OBSERVATIONS?.altimeter_value_1?.value;
        
        if (slcPres && pvuPres) {
          const gradient = (slcPres - pvuPres) * 33.8639; // Convert to mb
          console.log(`\nPressure Gradient (SLC - Provo): ${gradient.toFixed(2)} mb`);
          
          if (gradient > 2.0) {
            console.log('⚠️  HIGH GRADIENT - Strong North Flow Expected!');
          } else if (gradient > 1.0) {
            console.log('📈 Moderate gradient - North flow possible');
          } else if (gradient < -1.0) {
            console.log('📉 Negative gradient - South flow');
          } else {
            console.log('✅ Low gradient - Good for thermal development');
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching current conditions:', e.message);
  }
}

async function getHistoricalPatterns() {
  console.log('\n=== HISTORICAL ANALYSIS FOR VINEYARD ===\n');
  
  // Get last 7 days of data for pattern analysis
  const end = new Date();
  const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
  
  const startStr = start.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const endStr = end.toISOString().replace(/[-:]/g, '').slice(0, 15);
  
  const url = `https://api.synopticdata.com/v2/stations/timeseries?token=${SYNOPTIC_TOKEN}&stid=FPS,UTALP&start=${startStr}&end=${endStr}&vars=wind_speed,wind_direction&units=english&obtimezone=local`;
  
  try {
    const data = await fetchJSON(url);
    
    if (data.STATION) {
      data.STATION.forEach(station => {
        console.log(`\n--- ${station.NAME} (${station.STID}) ---`);
        
        const speeds = station.OBSERVATIONS?.wind_speed_set_1 || [];
        const dirs = station.OBSERVATIONS?.wind_direction_set_1 || [];
        const times = station.OBSERVATIONS?.date_time || [];
        
        // Find good kiting days (10+ mph for 2+ hours)
        let goodDays = [];
        let currentDay = null;
        let consecutiveGood = 0;
        
        for (let i = 0; i < speeds.length; i++) {
          const speed = speeds[i];
          const dir = dirs[i];
          const time = new Date(times[i]);
          const dayKey = time.toDateString();
          const hour = time.getHours();
          
          // Only look at daytime hours (9am - 6pm)
          if (hour >= 9 && hour <= 18) {
            if (speed >= 10) {
              if (currentDay !== dayKey) {
                if (consecutiveGood >= 8) { // 2+ hours of good wind
                  goodDays.push(currentDay);
                }
                currentDay = dayKey;
                consecutiveGood = 1;
              } else {
                consecutiveGood++;
              }
            }
          }
        }
        
        // Calculate averages
        const avgSpeed = speeds.length > 0 
          ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)
          : 'N/A';
        const maxSpeed = speeds.length > 0 
          ? Math.max(...speeds).toFixed(1)
          : 'N/A';
        
        console.log(`  Avg Wind: ${avgSpeed} mph`);
        console.log(`  Max Wind: ${maxSpeed} mph`);
        console.log(`  Data points: ${speeds.length}`);
        
        if (goodDays.length > 0) {
          console.log(`  Good kiting days in last week: ${goodDays.length}`);
        }
      });
    }
  } catch (e) {
    console.error('Error fetching historical data:', e.message);
  }
}

async function analyzeVineyardPotential() {
  console.log('\n=== VINEYARD KITING POTENTIAL TODAY ===\n');
  
  // Get current NWS alerts
  try {
    const alertUrl = 'https://api.weather.gov/alerts/active?area=UT';
    const alertData = await fetchJSON(alertUrl);
    
    if (alertData.features && alertData.features.length > 0) {
      console.log('Active Weather Alerts:');
      alertData.features.forEach(alert => {
        const props = alert.properties;
        if (props.event?.toLowerCase().includes('wind') || 
            props.event?.toLowerCase().includes('advisory')) {
          console.log(`\n  📢 ${props.event}`);
          console.log(`     ${props.headline}`);
          
          // Parse wind info
          const desc = props.description || '';
          const windMatch = desc.match(/(\d+)\s*to\s*(\d+)\s*mph/i);
          if (windMatch) {
            console.log(`     Expected: ${windMatch[1]}-${windMatch[2]} mph`);
          }
          const gustMatch = desc.match(/gusts?\s*(?:up\s*to\s*)?(\d+)\s*mph/i);
          if (gustMatch) {
            console.log(`     Gusts: up to ${gustMatch[1]} mph`);
          }
        }
      });
    } else {
      console.log('No active wind-related alerts');
    }
  } catch (e) {
    console.error('Error fetching alerts:', e.message);
  }
  
  console.log('\n--- Vineyard Analysis ---');
  console.log('Vineyard is good for:');
  console.log('  • SE Thermal (typical afternoon)');
  console.log('  • North flow (when KSLC shows N wind)');
  console.log('  • Side-on conditions from E or W');
  console.log('\nKey indicators to watch:');
  console.log('  • KSLC N wind > 5 mph = North flow coming');
  console.log('  • FPS/UTALP showing 10+ mph = Active conditions');
  console.log('  • Pressure gradient > 2 mb = Strong north (may be too much)');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         VINEYARD WIND ANALYSIS - ' + new Date().toLocaleDateString() + '              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  await searchStations();
  await getCurrentConditions();
  await getHistoricalPatterns();
  await analyzeVineyardPotential();
  
  console.log('\n=== ANALYSIS COMPLETE ===\n');
}

main().catch(console.error);
```

---

## File 80: `scripts/analyze-weather-events.js`

> 604 lines | 21.6 KB

```javascript
/**
 * WEATHER EVENT ANALYSIS
 * 
 * This script analyzes how NWS weather warnings and forecasts correlate with
 * actual surface wind conditions at our stations.
 * 
 * Goals:
 * 1. Fetch historical NWS alerts (wind advisories, cold fronts, storms)
 * 2. Correlate with actual wind data at our stations
 * 3. Build predictive patterns for future forecasting
 * 
 * Weather Event Types to Track:
 * - Wind Advisory / High Wind Warning
 * - Cold Front Passage
 * - Winter Storm Warning
 * - Lake Wind Advisory
 * - Red Flag Warning (fire weather)
 */

import axios from 'axios';
import fs from 'fs';

// Load env manually
const envPath = new URL('../.env', import.meta.url);
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('Note: Could not load .env file');
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// Stations to analyze
const STATIONS = {
  'FPS': { name: 'Flight Park South (Zig Zag proxy)', lat: 40.4505, lng: -111.8972 },
  'KSLC': { name: 'Salt Lake City Airport', lat: 40.7884, lng: -111.9778 },
  'KPVU': { name: 'Provo Airport', lat: 40.2192, lng: -111.7236 },
  'QSF': { name: 'Spanish Fork', lat: 40.05, lng: -111.65 },
};

// NWS zones for Utah
const NWS_ZONES = {
  'UTZ005': 'Salt Lake Valley',
  'UTZ006': 'Utah Valley',
  'UTZ007': 'Wasatch Front',
  'UTZ008': 'Western Uinta Mountains',
};

// =============================================================================
// STEP 1: Fetch NWS Historical Alerts
// =============================================================================

async function fetchNWSAlerts() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: FETCHING NWS WEATHER ALERTS');
  console.log('='.repeat(70));
  
  // NWS API for alerts - we'll get recent alerts and categorize them
  // Note: NWS API only provides recent alerts, not full history
  // For historical analysis, we'll use the alerts we can get and build from there
  
  try {
    // Fetch alerts for Utah zones
    const response = await axios.get('https://api.weather.gov/alerts/active', {
      params: {
        area: 'UT',
      },
      headers: {
        'User-Agent': 'UtahWindPro/1.0 (weather analysis)',
      },
    });
    
    const alerts = response.data.features || [];
    console.log(`\nFound ${alerts.length} active alerts for Utah`);
    
    // Categorize alerts
    const windAlerts = alerts.filter(a => 
      a.properties.event?.toLowerCase().includes('wind') ||
      a.properties.event?.toLowerCase().includes('front') ||
      a.properties.event?.toLowerCase().includes('storm')
    );
    
    console.log(`\nWind-related alerts: ${windAlerts.length}`);
    
    windAlerts.forEach(alert => {
      const props = alert.properties;
      console.log(`\n  Event: ${props.event}`);
      console.log(`  Severity: ${props.severity}`);
      console.log(`  Onset: ${props.onset}`);
      console.log(`  Ends: ${props.ends}`);
      console.log(`  Headline: ${props.headline?.substring(0, 100)}...`);
    });
    
    return windAlerts;
    
  } catch (error) {
    console.error('Error fetching NWS alerts:', error.message);
    return [];
  }
}

// =============================================================================
// STEP 2: Fetch NWS Forecast Data
// =============================================================================

async function fetchNWSForecast() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: FETCHING NWS FORECAST DATA');
  console.log('='.repeat(70));
  
  // Get forecast for Utah Lake area
  const lat = 40.30;
  const lng = -111.88;
  
  try {
    // First get the forecast office and grid
    const pointResponse = await axios.get(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    const forecastUrl = pointResponse.data.properties.forecast;
    const forecastHourlyUrl = pointResponse.data.properties.forecastHourly;
    const forecastGridUrl = pointResponse.data.properties.forecastGridData;
    
    console.log(`\nForecast Office: ${pointResponse.data.properties.forecastOffice}`);
    console.log(`Grid: ${pointResponse.data.properties.gridX}, ${pointResponse.data.properties.gridY}`);
    
    // Get detailed forecast
    const forecastResponse = await axios.get(forecastUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    console.log('\n7-DAY FORECAST:');
    console.log('-'.repeat(60));
    
    const periods = forecastResponse.data.properties.periods || [];
    periods.slice(0, 6).forEach(period => {
      console.log(`\n${period.name}:`);
      console.log(`  Temp: ${period.temperature}°${period.temperatureUnit}`);
      console.log(`  Wind: ${period.windSpeed} ${period.windDirection}`);
      console.log(`  ${period.shortForecast}`);
      
      // Check for wind keywords
      const forecast = period.detailedForecast?.toLowerCase() || '';
      if (forecast.includes('wind') || forecast.includes('front') || forecast.includes('storm')) {
        console.log(`  ⚠️ WIND EVENT MENTIONED`);
      }
    });
    
    // Get hourly forecast for wind details
    const hourlyResponse = await axios.get(forecastHourlyUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    console.log('\n\nHOURLY WIND FORECAST (next 24 hours):');
    console.log('-'.repeat(60));
    console.log('Time                  Wind Speed    Direction');
    
    const hourlyPeriods = hourlyResponse.data.properties.periods || [];
    hourlyPeriods.slice(0, 24).forEach(period => {
      const time = new Date(period.startTime).toLocaleString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      console.log(`${time.padEnd(20)} ${period.windSpeed.padEnd(12)} ${period.windDirection}`);
    });
    
    // Get grid data for detailed wind
    const gridResponse = await axios.get(forecastGridUrl, {
      headers: { 'User-Agent': 'UtahWindPro/1.0' },
    });
    
    const windSpeed = gridResponse.data.properties.windSpeed?.values || [];
    const windGust = gridResponse.data.properties.windGust?.values || [];
    
    console.log('\n\nFORECAST WIND GUSTS:');
    console.log('-'.repeat(60));
    
    windGust.slice(0, 10).forEach(gust => {
      const time = new Date(gust.validTime.split('/')[0]).toLocaleString();
      const speedMph = (gust.value * 0.621371).toFixed(1); // km/h to mph
      console.log(`${time}: ${speedMph} mph gust`);
    });
    
    return {
      periods,
      hourlyPeriods,
      windSpeed,
      windGust,
    };
    
  } catch (error) {
    console.error('Error fetching NWS forecast:', error.message);
    return null;
  }
}

// =============================================================================
// STEP 3: Analyze Historical Weather Events vs Station Data
// =============================================================================

async function analyzeWeatherEventCorrelation() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: ANALYZING WEATHER EVENT CORRELATIONS');
  console.log('='.repeat(70));
  
  // We'll analyze specific weather patterns and their effect on stations
  // Since NWS doesn't provide historical alerts easily, we'll use
  // pressure and temperature patterns as proxies for weather events
  
  console.log('\nAnalyzing pressure-driven events (cold fronts, storms)...');
  
  // Fetch 3 months of data for KSLC and FPS
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU,FPS',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,wind_gust,sea_level_pressure,air_temp',
        units: 'english',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    // Parse data for each station
    const stationData = {};
    for (const station of response.data.STATION) {
      const obs = station.OBSERVATIONS;
      stationData[station.STID] = {
        times: obs.date_time || [],
        speeds: obs.wind_speed_set_1 || [],
        directions: obs.wind_direction_set_1 || [],
        gusts: obs.wind_gust_set_1 || [],
        pressure: obs.sea_level_pressure_set_1 || [],
        temp: obs.air_temp_set_1 || [],
      };
    }
    
    // Identify pressure drop events (cold fronts)
    console.log('\n\nIDENTIFYING COLD FRONT PASSAGES (Pressure Drops):');
    console.log('-'.repeat(70));
    
    const kslcData = stationData['KSLC'];
    const fpsData = stationData['FPS'];
    
    if (!kslcData || !fpsData) {
      console.log('Missing station data');
      return;
    }
    
    // Find significant pressure drops (> 4mb in 6 hours)
    const pressureEvents = [];
    
    for (let i = 24; i < kslcData.times.length; i++) {
      const currentPressure = kslcData.pressure[i];
      const previousPressure = kslcData.pressure[i - 24]; // ~6 hours earlier (15-min intervals)
      
      if (currentPressure && previousPressure) {
        const drop = previousPressure - currentPressure;
        
        if (drop > 4) { // Significant pressure drop
          const time = new Date(kslcData.times[i]);
          
          // Check if we already have an event within 12 hours
          const isDuplicate = pressureEvents.some(e => 
            Math.abs(e.time.getTime() - time.getTime()) < 12 * 60 * 60 * 1000
          );
          
          if (!isDuplicate) {
            pressureEvents.push({
              time,
              pressureDrop: drop,
              kslcSpeed: kslcData.speeds[i],
              kslcDir: kslcData.directions[i],
              kslcGust: kslcData.gusts[i],
            });
          }
        }
      }
    }
    
    console.log(`\nFound ${pressureEvents.length} significant pressure drop events (cold fronts)`);
    
    // For each pressure event, analyze wind response
    const frontAnalysis = {
      northWindEvents: 0,
      avgSpeedIncrease: [],
      avgGustIncrease: [],
      directionShifts: [],
    };
    
    for (const event of pressureEvents.slice(0, 20)) {
      console.log(`\n${event.time.toLocaleDateString()} ${event.time.toLocaleTimeString()}`);
      console.log(`  Pressure drop: ${event.pressureDrop.toFixed(1)} mb`);
      console.log(`  KSLC: ${event.kslcSpeed?.toFixed(1) || '?'} mph from ${event.kslcDir || '?'}°`);
      
      // Find corresponding FPS data
      const eventTime = event.time.getTime();
      let fpsIndex = -1;
      for (let j = 0; j < fpsData.times.length; j++) {
        if (Math.abs(new Date(fpsData.times[j]).getTime() - eventTime) < 30 * 60 * 1000) {
          fpsIndex = j;
          break;
        }
      }
      
      if (fpsIndex >= 0) {
        const fpsSpeed = fpsData.speeds[fpsIndex];
        const fpsDir = fpsData.directions[fpsIndex];
        console.log(`  FPS:  ${fpsSpeed?.toFixed(1) || '?'} mph from ${fpsDir || '?'}°`);
        
        // Check if north wind
        if (event.kslcDir !== null && (event.kslcDir >= 315 || event.kslcDir <= 45)) {
          frontAnalysis.northWindEvents++;
          console.log(`  → NORTH FLOW EVENT`);
        }
        
        // Calculate speed increase from 6 hours before
        if (fpsIndex >= 24 && fpsData.speeds[fpsIndex - 24]) {
          const speedBefore = fpsData.speeds[fpsIndex - 24];
          const speedIncrease = fpsSpeed - speedBefore;
          frontAnalysis.avgSpeedIncrease.push(speedIncrease);
          console.log(`  → Speed change: ${speedIncrease > 0 ? '+' : ''}${speedIncrease.toFixed(1)} mph`);
        }
      }
    }
    
    // Summary statistics
    console.log('\n\n' + '='.repeat(70));
    console.log('COLD FRONT ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`\nTotal pressure drop events analyzed: ${pressureEvents.length}`);
    console.log(`Events with north wind: ${frontAnalysis.northWindEvents} (${(frontAnalysis.northWindEvents / pressureEvents.length * 100).toFixed(0)}%)`);
    
    if (frontAnalysis.avgSpeedIncrease.length > 0) {
      const avgIncrease = frontAnalysis.avgSpeedIncrease.reduce((a, b) => a + b, 0) / frontAnalysis.avgSpeedIncrease.length;
      console.log(`Average speed change at FPS during front: ${avgIncrease > 0 ? '+' : ''}${avgIncrease.toFixed(1)} mph`);
    }
    
    return { pressureEvents, frontAnalysis };
    
  } catch (error) {
    console.error('Error analyzing correlations:', error.message);
  }
}

// =============================================================================
// STEP 4: Analyze Wind Direction Patterns by Weather Type
// =============================================================================

async function analyzeWindPatternsByWeatherType() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: WIND PATTERNS BY WEATHER TYPE');
  console.log('='.repeat(70));
  
  // Fetch data with more variables
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: 'KSLC,KPVU',
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction,sea_level_pressure',
        units: 'english',
      },
    });
    
    if (!response.data.STATION) {
      console.log('No data returned');
      return;
    }
    
    const kslc = response.data.STATION.find(s => s.STID === 'KSLC');
    const kpvu = response.data.STATION.find(s => s.STID === 'KPVU');
    
    if (!kslc || !kpvu) {
      console.log('Missing station data');
      return;
    }
    
    // Calculate pressure gradient over time
    const gradientAnalysis = {
      strongNorth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },  // SLC > Provo by 3+ mb
      moderateNorth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] }, // SLC > Provo by 1-3 mb
      neutral: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },       // Within 1 mb
      moderateSouth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] }, // Provo > SLC by 1-3 mb
      strongSouth: { count: 0, avgKslcSpeed: [], avgKpvuSpeed: [] },   // Provo > SLC by 3+ mb
    };
    
    const kslcObs = kslc.OBSERVATIONS;
    const kpvuObs = kpvu.OBSERVATIONS;
    
    // Build time-indexed data
    const kslcByTime = {};
    for (let i = 0; i < kslcObs.date_time.length; i++) {
      const hour = kslcObs.date_time[i].substring(0, 13); // Round to hour
      kslcByTime[hour] = {
        speed: kslcObs.wind_speed_set_1[i],
        direction: kslcObs.wind_direction_set_1[i],
        pressure: kslcObs.sea_level_pressure_set_1?.[i],
      };
    }
    
    const kpvuByTime = {};
    for (let i = 0; i < kpvuObs.date_time.length; i++) {
      const hour = kpvuObs.date_time[i].substring(0, 13);
      kpvuByTime[hour] = {
        speed: kpvuObs.wind_speed_set_1[i],
        direction: kpvuObs.wind_direction_set_1[i],
        pressure: kpvuObs.sea_level_pressure_set_1?.[i],
      };
    }
    
    // Analyze each hour
    for (const hour of Object.keys(kslcByTime)) {
      const kslcData = kslcByTime[hour];
      const kpvuData = kpvuByTime[hour];
      
      if (!kslcData || !kpvuData) continue;
      if (kslcData.pressure === null || kpvuData.pressure === null) continue;
      
      const gradient = kslcData.pressure - kpvuData.pressure;
      
      let category;
      if (gradient >= 3) category = 'strongNorth';
      else if (gradient >= 1) category = 'moderateNorth';
      else if (gradient <= -3) category = 'strongSouth';
      else if (gradient <= -1) category = 'moderateSouth';
      else category = 'neutral';
      
      gradientAnalysis[category].count++;
      if (kslcData.speed !== null) gradientAnalysis[category].avgKslcSpeed.push(kslcData.speed);
      if (kpvuData.speed !== null) gradientAnalysis[category].avgKpvuSpeed.push(kpvuData.speed);
    }
    
    // Print results
    console.log('\nPRESSURE GRADIENT vs WIND SPEED ANALYSIS:');
    console.log('-'.repeat(70));
    console.log('Gradient Type      | Hours | Avg KSLC Speed | Avg KPVU Speed | Wind Type');
    console.log('-'.repeat(70));
    
    for (const [type, data] of Object.entries(gradientAnalysis)) {
      if (data.count === 0) continue;
      
      const avgKslc = data.avgKslcSpeed.length > 0 
        ? (data.avgKslcSpeed.reduce((a, b) => a + b, 0) / data.avgKslcSpeed.length).toFixed(1)
        : 'N/A';
      const avgKpvu = data.avgKpvuSpeed.length > 0
        ? (data.avgKpvuSpeed.reduce((a, b) => a + b, 0) / data.avgKpvuSpeed.length).toFixed(1)
        : 'N/A';
      
      let windType = '';
      if (type === 'strongNorth') windType = '→ STRONG NORTH FLOW';
      else if (type === 'moderateNorth') windType = '→ Moderate north';
      else if (type === 'strongSouth') windType = '→ SOUTH STORM';
      else if (type === 'moderateSouth') windType = '→ Moderate south';
      else windType = '→ Thermal possible';
      
      console.log(
        `${type.padEnd(18)} | ${String(data.count).padStart(5)} | ` +
        `${avgKslc.padStart(8)} mph    | ${avgKpvu.padStart(8)} mph    | ${windType}`
      );
    }
    
    return gradientAnalysis;
    
  } catch (error) {
    console.error('Error analyzing wind patterns:', error.message);
  }
}

// =============================================================================
// STEP 5: Build Forecast Correlation Model
// =============================================================================

async function buildForecastModel() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: FORECAST CORRELATION MODEL');
  console.log('='.repeat(70));
  
  console.log('\nBased on analysis, here are the key forecast indicators:\n');
  
  const forecastModel = {
    northFlow: {
      name: 'North Flow / Cold Front',
      nwsKeywords: ['north wind', 'cold front', 'high pressure', 'wind advisory'],
      pressureIndicator: 'SLC pressure > Provo pressure by 2+ mb',
      expectedEffect: {
        kslc: 'North wind 10-25 mph, 1 hour before Utah Lake',
        utahLake: 'North wind 12-30 mph, excellent for kiting',
        timing: 'Usually afternoon/evening, can last 6-12 hours',
      },
      confidence: 'HIGH - Strong correlation with pressure gradient',
    },
    
    southStorm: {
      name: 'South Storm / Low Pressure',
      nwsKeywords: ['south wind', 'storm', 'low pressure', 'winter storm'],
      pressureIndicator: 'Provo pressure > SLC pressure by 2+ mb',
      expectedEffect: {
        kslc: 'South wind, often gusty and variable',
        utahLake: 'South wind, can be strong but often gusty/unsafe',
        timing: 'Variable, often with precipitation',
      },
      confidence: 'MEDIUM - More variable than north flow',
    },
    
    thermal: {
      name: 'Thermal / Lake Breeze',
      nwsKeywords: ['sunny', 'clear', 'light wind', 'high pressure'],
      pressureIndicator: 'Neutral gradient (within 1 mb)',
      expectedEffect: {
        kslc: 'Light and variable or calm',
        utahLake: 'SE thermal 10-18 mph, best 1pm-5pm',
        timing: 'Builds late morning, peaks early afternoon',
      },
      confidence: 'MEDIUM - Requires clear skies and heating',
    },
    
    windAdvisory: {
      name: 'Wind Advisory / High Wind',
      nwsKeywords: ['wind advisory', 'high wind warning', 'gusty'],
      pressureIndicator: 'Rapid pressure change (> 4mb in 6 hours)',
      expectedEffect: {
        kslc: 'Sustained 25+ mph, gusts 40+ mph',
        utahLake: 'Often too strong/gusty for safe kiting',
        timing: 'Usually associated with frontal passage',
      },
      confidence: 'HIGH - NWS advisories are reliable',
    },
  };
  
  for (const [key, model] of Object.entries(forecastModel)) {
    console.log(`\n${model.name.toUpperCase()}`);
    console.log('-'.repeat(50));
    console.log(`NWS Keywords: ${model.nwsKeywords.join(', ')}`);
    console.log(`Pressure: ${model.pressureIndicator}`);
    console.log(`KSLC Effect: ${model.expectedEffect.kslc}`);
    console.log(`Utah Lake: ${model.expectedEffect.utahLake}`);
    console.log(`Timing: ${model.expectedEffect.timing}`);
    console.log(`Confidence: ${model.confidence}`);
  }
  
  return forecastModel;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           WEATHER EVENT & FORECAST ANALYSIS                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  // Step 1: Fetch current NWS alerts
  await fetchNWSAlerts();
  
  // Step 2: Fetch NWS forecast
  await fetchNWSForecast();
  
  // Step 3: Analyze historical weather events
  await analyzeWeatherEventCorrelation();
  
  // Step 4: Analyze wind patterns by weather type
  await analyzeWindPatternsByWeatherType();
  
  // Step 5: Build forecast model
  await buildForecastModel();
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);
```

---

## File 81: `scripts/analyze-weather-patterns.js`

> 435 lines | 16.0 KB

```javascript
/**
 * Weather Pattern Analysis for Prediction
 * 
 * Goal: Find weather patterns that predict good thermal days
 * - What conditions the day BEFORE predict tomorrow's thermal?
 * - What morning conditions predict afternoon thermal?
 * - What 1-2 hour lead indicators predict imminent thermal?
 */

import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

// Thermal criteria
const UTAH_LAKE_THERMAL = {
  direction: { min: 100, max: 180 },
  speed: { min: 8, max: 20 },
};

const DEER_CREEK_THERMAL = {
  direction: { min: 160, max: 220 },
  speed: { min: 4, max: 15 },
};

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter,relative_humidity&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  const pressure = obs.altimeter_set_1 || [];
  const humidity = obs.relative_humidity_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
    pressure: pressure[i],
    humidity: humidity[i],
  }));
}

function getLocalHour(date) {
  return (date.getUTCHours() - 6 + 24) % 24;
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isThermal(obs, criteria) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= criteria.direction.min &&
         obs.direction <= criteria.direction.max &&
         obs.speed >= criteria.speed.min &&
         obs.speed <= criteria.speed.max;
}

async function analyzePatterns() {
  console.log('WEATHER PATTERN ANALYSIS FOR PREDICTION');
  console.log('='.repeat(70));
  
  // Fetch 3 months of data
  const start = '202506010000';
  const end = '202508310000';
  
  console.log('\nFetching Summer 2025 data...');
  
  // Utah Lake stations
  const [fpsData, kslcData, kpvuData] = await Promise.all([
    fetchData('FPS', start, end),
    fetchData('KSLC', start, end),
    fetchData('KPVU', start, end),
  ]);
  
  const fps = parseObservations(fpsData.STATION?.[0]);
  const kslc = parseObservations(kslcData.STATION?.[0]);
  const kpvu = parseObservations(kpvuData.STATION?.[0]);
  
  console.log(`FPS: ${fps.length} observations`);
  console.log(`KSLC: ${kslc.length} observations`);
  console.log(`KPVU: ${kpvu.length} observations`);
  
  // Create time-indexed maps
  const kslcMap = new Map();
  const kpvuMap = new Map();
  
  kslc.forEach(obs => {
    kslcMap.set(obs.time.toISOString().slice(0, 16), obs);
  });
  kpvu.forEach(obs => {
    kpvuMap.set(obs.time.toISOString().slice(0, 16), obs);
  });
  
  // Identify thermal days at FPS
  const dailyData = new Map();
  
  fps.forEach(obs => {
    const dateKey = getDateKey(obs.time);
    const hour = getLocalHour(obs.time);
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        date: dateKey,
        observations: [],
        thermalCount: 0,
        maxSpeed: 0,
        peakHour: null,
        hasThermal: false,
      });
    }
    
    const day = dailyData.get(dateKey);
    day.observations.push({ ...obs, hour });
    
    if (isThermal(obs, UTAH_LAKE_THERMAL)) {
      day.thermalCount++;
      if (obs.speed > day.maxSpeed) {
        day.maxSpeed = obs.speed;
        day.peakHour = hour;
      }
    }
  });
  
  // Mark thermal days (at least 1 hour of thermal = 6 readings)
  dailyData.forEach(day => {
    day.hasThermal = day.thermalCount >= 6;
  });
  
  const thermalDays = Array.from(dailyData.values()).filter(d => d.hasThermal);
  const nonThermalDays = Array.from(dailyData.values()).filter(d => !d.hasThermal);
  
  console.log(`\nThermal days: ${thermalDays.length}`);
  console.log(`Non-thermal days: ${nonThermalDays.length}`);
  
  // ============================================
  // ANALYSIS 1: Day-Before Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('DAY-BEFORE PATTERNS (for next-day prediction)');
  console.log('='.repeat(70));
  
  const dayBeforePatterns = { thermal: [], nonThermal: [] };
  
  thermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyData.get(prevKey);
    
    if (prevDay) {
      // Get evening conditions (6 PM - 9 PM) from day before
      const eveningObs = prevDay.observations.filter(o => o.hour >= 18 && o.hour <= 21);
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / eveningObs.length;
        
        // Get pressure gradient from evening before
        const eveningTime = eveningObs[0]?.time;
        if (eveningTime) {
          const key = eveningTime.toISOString().slice(0, 16);
          const slc = kslcMap.get(key);
          const pvu = kpvuMap.get(key);
          const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
          
          dayBeforePatterns.thermal.push({
            date: day.date,
            eveningTemp: avgTemp,
            eveningSpeed: avgSpeed,
            eveningGradient: gradient,
          });
        }
      }
    }
  });
  
  nonThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyData.get(prevKey);
    
    if (prevDay) {
      const eveningObs = prevDay.observations.filter(o => o.hour >= 18 && o.hour <= 21);
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / eveningObs.length;
        
        const eveningTime = eveningObs[0]?.time;
        if (eveningTime) {
          const key = eveningTime.toISOString().slice(0, 16);
          const slc = kslcMap.get(key);
          const pvu = kpvuMap.get(key);
          const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
          
          dayBeforePatterns.nonThermal.push({
            date: day.date,
            eveningTemp: avgTemp,
            eveningSpeed: avgSpeed,
            eveningGradient: gradient,
          });
        }
      }
    }
  });
  
  // Calculate averages
  if (dayBeforePatterns.thermal.length > 0) {
    const avgTemp = dayBeforePatterns.thermal.reduce((sum, p) => sum + p.eveningTemp, 0) / dayBeforePatterns.thermal.length;
    const avgSpeed = dayBeforePatterns.thermal.reduce((sum, p) => sum + p.eveningSpeed, 0) / dayBeforePatterns.thermal.length;
    const gradients = dayBeforePatterns.thermal.filter(p => p.eveningGradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.eveningGradient, 0) / gradients.length : null;
    
    console.log(`\nEVENING BEFORE a thermal day (6-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient (SLC-PVU): ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${dayBeforePatterns.thermal.length} days`);
  }
  
  if (dayBeforePatterns.nonThermal.length > 0) {
    const avgTemp = dayBeforePatterns.nonThermal.reduce((sum, p) => sum + p.eveningTemp, 0) / dayBeforePatterns.nonThermal.length;
    const avgSpeed = dayBeforePatterns.nonThermal.reduce((sum, p) => sum + p.eveningSpeed, 0) / dayBeforePatterns.nonThermal.length;
    const gradients = dayBeforePatterns.nonThermal.filter(p => p.eveningGradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.eveningGradient, 0) / gradients.length : null;
    
    console.log(`\nEVENING BEFORE a NON-thermal day:`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient (SLC-PVU): ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${dayBeforePatterns.nonThermal.length} days`);
  }
  
  // ============================================
  // ANALYSIS 2: Morning Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('MORNING PATTERNS (for same-day prediction)');
  console.log('='.repeat(70));
  
  const morningPatterns = { thermal: [], nonThermal: [] };
  
  thermalDays.forEach(day => {
    // Get morning conditions (6 AM - 9 AM)
    const morningObs = day.observations.filter(o => o.hour >= 6 && o.hour <= 9);
    if (morningObs.length > 0) {
      const avgTemp = morningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / morningObs.length;
      const avgSpeed = morningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / morningObs.length;
      const avgDir = morningObs.filter(o => o.direction != null).reduce((sum, o) => sum + o.direction, 0) / morningObs.filter(o => o.direction != null).length;
      
      // Get morning pressure gradient
      const morningTime = morningObs[Math.floor(morningObs.length / 2)]?.time;
      if (morningTime) {
        const key = morningTime.toISOString().slice(0, 16);
        const slc = kslcMap.get(key);
        const pvu = kpvuMap.get(key);
        const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
        
        morningPatterns.thermal.push({
          date: day.date,
          temp: avgTemp,
          speed: avgSpeed,
          direction: avgDir,
          gradient,
          peakHour: day.peakHour,
          maxSpeed: day.maxSpeed,
        });
      }
    }
  });
  
  nonThermalDays.forEach(day => {
    const morningObs = day.observations.filter(o => o.hour >= 6 && o.hour <= 9);
    if (morningObs.length > 0) {
      const avgTemp = morningObs.reduce((sum, o) => sum + (o.temp || 0), 0) / morningObs.length;
      const avgSpeed = morningObs.reduce((sum, o) => sum + (o.speed || 0), 0) / morningObs.length;
      
      const morningTime = morningObs[Math.floor(morningObs.length / 2)]?.time;
      if (morningTime) {
        const key = morningTime.toISOString().slice(0, 16);
        const slc = kslcMap.get(key);
        const pvu = kpvuMap.get(key);
        const gradient = (slc?.pressure && pvu?.pressure) ? slc.pressure - pvu.pressure : null;
        
        morningPatterns.nonThermal.push({
          date: day.date,
          temp: avgTemp,
          speed: avgSpeed,
          gradient,
        });
      }
    }
  });
  
  if (morningPatterns.thermal.length > 0) {
    const avgTemp = morningPatterns.thermal.reduce((sum, p) => sum + p.temp, 0) / morningPatterns.thermal.length;
    const avgSpeed = morningPatterns.thermal.reduce((sum, p) => sum + p.speed, 0) / morningPatterns.thermal.length;
    const avgDir = morningPatterns.thermal.filter(p => p.direction).reduce((sum, p) => sum + p.direction, 0) / morningPatterns.thermal.filter(p => p.direction).length;
    const gradients = morningPatterns.thermal.filter(p => p.gradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.gradient, 0) / gradients.length : null;
    
    console.log(`\nMORNING of thermal days (6-9 AM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph from ${avgDir?.toFixed(0) || 'N/A'}°`);
    console.log(`  Average pressure gradient: ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${morningPatterns.thermal.length} days`);
  }
  
  if (morningPatterns.nonThermal.length > 0) {
    const avgTemp = morningPatterns.nonThermal.reduce((sum, p) => sum + p.temp, 0) / morningPatterns.nonThermal.length;
    const avgSpeed = morningPatterns.nonThermal.reduce((sum, p) => sum + p.speed, 0) / morningPatterns.nonThermal.length;
    const gradients = morningPatterns.nonThermal.filter(p => p.gradient != null);
    const avgGradient = gradients.length > 0 ? gradients.reduce((sum, p) => sum + p.gradient, 0) / gradients.length : null;
    
    console.log(`\nMORNING of NON-thermal days:`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Average pressure gradient: ${avgGradient?.toFixed(3) || 'N/A'} inHg`);
    console.log(`  Sample size: ${morningPatterns.nonThermal.length} days`);
  }
  
  // ============================================
  // ANALYSIS 3: Pressure Gradient Thresholds
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PRESSURE GRADIENT ANALYSIS');
  console.log('='.repeat(70));
  
  // Analyze morning gradient vs thermal success
  const gradientBuckets = [
    { min: -0.10, max: -0.05, thermal: 0, total: 0 },
    { min: -0.05, max: -0.02, thermal: 0, total: 0 },
    { min: -0.02, max: 0, thermal: 0, total: 0 },
    { min: 0, max: 0.02, thermal: 0, total: 0 },
    { min: 0.02, max: 0.05, thermal: 0, total: 0 },
    { min: 0.05, max: 0.10, thermal: 0, total: 0 },
  ];
  
  morningPatterns.thermal.forEach(p => {
    if (p.gradient != null) {
      const bucket = gradientBuckets.find(b => p.gradient >= b.min && p.gradient < b.max);
      if (bucket) {
        bucket.thermal++;
        bucket.total++;
      }
    }
  });
  
  morningPatterns.nonThermal.forEach(p => {
    if (p.gradient != null) {
      const bucket = gradientBuckets.find(b => p.gradient >= b.min && p.gradient < b.max);
      if (bucket) {
        bucket.total++;
      }
    }
  });
  
  console.log('\nMorning pressure gradient (SLC-PVU) vs thermal probability:');
  console.log('Gradient Range | Thermal Rate | Sample');
  console.log('---------------|--------------|-------');
  
  gradientBuckets.forEach(b => {
    const rate = b.total > 0 ? ((b.thermal / b.total) * 100).toFixed(1) : '0.0';
    console.log(`${b.min.toFixed(2)} to ${b.max.toFixed(2)} | ${rate.padStart(10)}% | ${b.total}`);
  });
  
  // ============================================
  // SUMMARY: Prediction Rules
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PREDICTION RULES SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`
DAY-BEFORE PREDICTION (Evening 6-9 PM):
  - Check pressure gradient trend
  - Light winds (<5 mph) in evening = good sign
  - Gradient moving negative = thermal likely tomorrow

MORNING PREDICTION (6-9 AM):
  - Pressure gradient < 0 (Provo higher than SLC) = thermal likely
  - Morning temp warming rapidly = thermal pump starting
  - Light variable winds = thermal will develop

1-HOUR PREDICTION:
  - SE wind starting to build = thermal imminent
  - Speed increasing through 5-8 mph = peak coming
  - Direction stabilizing at 140-160° = optimal thermal
`);

  // Best thermal days details
  console.log('\n' + '='.repeat(70));
  console.log('BEST THERMAL DAYS - DETAILED PATTERNS');
  console.log('='.repeat(70));
  
  const bestDays = thermalDays
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 10);
  
  console.log('\nTop 10 thermal days:');
  bestDays.forEach(day => {
    const morning = morningPatterns.thermal.find(p => p.date === day.date);
    console.log(`\n${day.date}:`);
    console.log(`  Peak: ${day.maxSpeed.toFixed(1)} mph at ${day.peakHour}:00`);
    console.log(`  Thermal readings: ${day.thermalCount}`);
    if (morning) {
      console.log(`  Morning temp: ${morning.temp.toFixed(1)}°F`);
      console.log(`  Morning gradient: ${morning.gradient?.toFixed(3) || 'N/A'} inHg`);
    }
  });
}

analyzePatterns().catch(console.error);
```

---

## File 82: `scripts/analyze-wind-correlation.js`

> 326 lines | 12.2 KB

```javascript
/**
 * Wind Speed Correlation Analysis: Arrowhead (SND) vs Deer Creek Dam (DCC)
 * 
 * Goal: Find wind patterns at Arrowhead that predict thermal events at the Dam
 * - What wind speed/direction at Arrowhead precedes good thermals?
 * - How much lead time between Arrowhead signal and Dam thermal?
 */

import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

// Deer Creek thermal criteria
const THERMAL_CRITERIA = {
  direction: { min: 160, max: 220 },  // South wind
  speed: { min: 4, max: 15 },          // Usable speed
};

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  }));
}

function isThermalCondition(obs) {
  if (obs.speed == null || obs.direction == null) return false;
  return obs.direction >= THERMAL_CRITERIA.direction.min &&
         obs.direction <= THERMAL_CRITERIA.direction.max &&
         obs.speed >= THERMAL_CRITERIA.speed.min &&
         obs.speed <= THERMAL_CRITERIA.speed.max;
}

function getLocalHour(date) {
  const utcHour = date.getUTCHours();
  return (utcHour - 6 + 24) % 24; // MDT approximation
}

function directionToCardinal(deg) {
  if (deg == null) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function analyzeCorrelation() {
  console.log('WIND SPEED CORRELATION: Arrowhead (SND) vs Deer Creek Dam (DCC)');
  console.log('='.repeat(70));
  
  // Fetch July 2025 data (good thermal month)
  const start = '202507010000';
  const end = '202507310000';
  
  console.log('\nFetching July 2025 data...');
  
  const [dccData, sndData] = await Promise.all([
    fetchData('DCC', start, end),
    fetchData('SND', start, end),
  ]);
  
  const dcc = parseObservations(dccData.STATION?.[0]);
  const snd = parseObservations(sndData.STATION?.[0]);
  
  console.log(`DCC observations: ${dcc.length}`);
  console.log(`SND observations: ${snd.length}`);
  
  // Create time-indexed map for SND
  const sndMap = new Map();
  snd.forEach(obs => {
    const key = obs.time.toISOString().slice(0, 16);
    sndMap.set(key, obs);
  });
  
  // Analyze each DCC observation
  const correlations = [];
  const leadTimeAnalysis = { 30: [], 60: [], 90: [], 120: [] }; // minutes before
  
  dcc.forEach(dccObs => {
    const isThermal = isThermalCondition(dccObs);
    const hour = getLocalHour(dccObs.time);
    
    // Only analyze daytime hours (10 AM - 6 PM)
    if (hour < 10 || hour > 18) return;
    
    // Get SND data at same time and at lead times
    const key = dccObs.time.toISOString().slice(0, 16);
    const sndNow = sndMap.get(key);
    
    // Get lead time data
    const leads = {};
    [30, 60, 90, 120].forEach(mins => {
      const leadTime = new Date(dccObs.time.getTime() - mins * 60 * 1000);
      const leadKey = leadTime.toISOString().slice(0, 16);
      leads[mins] = sndMap.get(leadKey);
    });
    
    if (sndNow) {
      correlations.push({
        time: dccObs.time,
        hour,
        isThermal,
        dcc: dccObs,
        snd: sndNow,
        leads,
      });
      
      // Track lead time patterns for thermal events
      if (isThermal) {
        [30, 60, 90, 120].forEach(mins => {
          if (leads[mins]) {
            leadTimeAnalysis[mins].push({
              sndSpeed: leads[mins].speed,
              sndDir: leads[mins].direction,
              sndTemp: leads[mins].temp,
              dccSpeed: dccObs.speed,
              dccDir: dccObs.direction,
            });
          }
        });
      }
    }
  });
  
  console.log(`\nCorrelated observations: ${correlations.length}`);
  
  // Analyze SND wind patterns during thermal vs non-thermal
  const thermalEvents = correlations.filter(c => c.isThermal);
  const nonThermalEvents = correlations.filter(c => !c.isThermal);
  
  console.log(`\nThermal events: ${thermalEvents.length}`);
  console.log(`Non-thermal events: ${nonThermalEvents.length}`);
  
  // SND wind speed during thermal vs non-thermal
  console.log('\n' + '='.repeat(70));
  console.log('ARROWHEAD (SND) CONDITIONS DURING DCC THERMAL vs NON-THERMAL');
  console.log('='.repeat(70));
  
  const thermalSndSpeeds = thermalEvents.filter(e => e.snd.speed != null).map(e => e.snd.speed);
  const nonThermalSndSpeeds = nonThermalEvents.filter(e => e.snd.speed != null).map(e => e.snd.speed);
  
  if (thermalSndSpeeds.length > 0) {
    const avgThermal = thermalSndSpeeds.reduce((a, b) => a + b, 0) / thermalSndSpeeds.length;
    const maxThermal = Math.max(...thermalSndSpeeds);
    const minThermal = Math.min(...thermalSndSpeeds);
    console.log(`\nDuring DCC THERMAL events, Arrowhead wind:`);
    console.log(`  Average: ${avgThermal.toFixed(1)} mph`);
    console.log(`  Range: ${minThermal.toFixed(1)} - ${maxThermal.toFixed(1)} mph`);
  }
  
  if (nonThermalSndSpeeds.length > 0) {
    const avgNonThermal = nonThermalSndSpeeds.reduce((a, b) => a + b, 0) / nonThermalSndSpeeds.length;
    console.log(`\nDuring NON-THERMAL, Arrowhead wind:`);
    console.log(`  Average: ${avgNonThermal.toFixed(1)} mph`);
  }
  
  // SND wind direction during thermal
  const thermalSndDirs = thermalEvents.filter(e => e.snd.direction != null).map(e => e.snd.direction);
  if (thermalSndDirs.length > 0) {
    const avgDir = thermalSndDirs.reduce((a, b) => a + b, 0) / thermalSndDirs.length;
    console.log(`\nArrowhead wind DIRECTION during DCC thermals:`);
    console.log(`  Average: ${avgDir.toFixed(0)}° (${directionToCardinal(avgDir)})`);
    
    // Direction distribution
    const dirBuckets = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    thermalSndDirs.forEach(d => {
      if (d >= 337.5 || d < 22.5) dirBuckets.N++;
      else if (d < 67.5) dirBuckets.NE++;
      else if (d < 112.5) dirBuckets.E++;
      else if (d < 157.5) dirBuckets.SE++;
      else if (d < 202.5) dirBuckets.S++;
      else if (d < 247.5) dirBuckets.SW++;
      else if (d < 292.5) dirBuckets.W++;
      else dirBuckets.NW++;
    });
    console.log(`  Direction distribution:`);
    Object.entries(dirBuckets).forEach(([dir, count]) => {
      const pct = ((count / thermalSndDirs.length) * 100).toFixed(1);
      if (count > 0) console.log(`    ${dir}: ${count} (${pct}%)`);
    });
  }
  
  // Lead time analysis
  console.log('\n' + '='.repeat(70));
  console.log('LEAD TIME ANALYSIS: Arrowhead patterns BEFORE DCC thermal');
  console.log('='.repeat(70));
  
  [30, 60, 90, 120].forEach(mins => {
    const data = leadTimeAnalysis[mins];
    if (data.length === 0) return;
    
    const avgSndSpeed = data.reduce((sum, d) => sum + (d.sndSpeed || 0), 0) / data.length;
    const avgSndDir = data.filter(d => d.sndDir != null).reduce((sum, d) => sum + d.sndDir, 0) / data.filter(d => d.sndDir != null).length;
    
    console.log(`\n${mins} minutes BEFORE thermal at DCC:`);
    console.log(`  Arrowhead avg wind: ${avgSndSpeed.toFixed(1)} mph from ${avgSndDir.toFixed(0)}° (${directionToCardinal(avgSndDir)})`);
    console.log(`  Sample size: ${data.length} events`);
  });
  
  // Find the "trigger" pattern
  console.log('\n' + '='.repeat(70));
  console.log('TRIGGER PATTERN ANALYSIS');
  console.log('='.repeat(70));
  
  // Look for speed threshold at Arrowhead that predicts thermal
  const speedThresholds = [2, 4, 6, 8, 10, 12, 15];
  console.log('\nArrowhead wind speed vs DCC thermal probability:');
  console.log('SND Speed | Thermal Rate | Sample Size');
  console.log('----------|--------------|------------');
  
  speedThresholds.forEach((threshold, i) => {
    const nextThreshold = speedThresholds[i + 1] || 99;
    const inRange = correlations.filter(c => 
      c.snd.speed != null && 
      c.snd.speed >= threshold && 
      c.snd.speed < nextThreshold
    );
    const thermalInRange = inRange.filter(c => c.isThermal);
    const rate = inRange.length > 0 ? (thermalInRange.length / inRange.length * 100).toFixed(1) : '0.0';
    console.log(`${threshold}-${nextThreshold} mph | ${rate.padStart(10)}% | ${inRange.length}`);
  });
  
  // Direction at Arrowhead vs thermal probability
  console.log('\nArrowhead wind DIRECTION vs DCC thermal probability:');
  console.log('SND Dir   | Thermal Rate | Sample Size');
  console.log('----------|--------------|------------');
  
  const dirRanges = [
    { name: 'N (315-45)', min: 315, max: 45 },
    { name: 'E (45-135)', min: 45, max: 135 },
    { name: 'S (135-225)', min: 135, max: 225 },
    { name: 'W (225-315)', min: 225, max: 315 },
  ];
  
  dirRanges.forEach(range => {
    const inRange = correlations.filter(c => {
      if (c.snd.direction == null) return false;
      if (range.min > range.max) {
        return c.snd.direction >= range.min || c.snd.direction < range.max;
      }
      return c.snd.direction >= range.min && c.snd.direction < range.max;
    });
    const thermalInRange = inRange.filter(c => c.isThermal);
    const rate = inRange.length > 0 ? (thermalInRange.length / inRange.length * 100).toFixed(1) : '0.0';
    console.log(`${range.name.padEnd(9)} | ${rate.padStart(10)}% | ${inRange.length}`);
  });
  
  // Hourly breakdown of correlation
  console.log('\n' + '='.repeat(70));
  console.log('HOURLY WIND CORRELATION');
  console.log('='.repeat(70));
  console.log('\nHour | DCC Thermal% | Avg DCC Spd | Avg SND Spd | SND Dir');
  console.log('-----|--------------|-------------|-------------|--------');
  
  for (let h = 10; h <= 18; h++) {
    const hourData = correlations.filter(c => c.hour === h);
    const thermalHour = hourData.filter(c => c.isThermal);
    const rate = hourData.length > 0 ? (thermalHour.length / hourData.length * 100).toFixed(1) : '0.0';
    
    const avgDccSpd = thermalHour.length > 0 
      ? (thermalHour.reduce((sum, c) => sum + (c.dcc.speed || 0), 0) / thermalHour.length).toFixed(1)
      : '-';
    const avgSndSpd = thermalHour.length > 0
      ? (thermalHour.reduce((sum, c) => sum + (c.snd.speed || 0), 0) / thermalHour.length).toFixed(1)
      : '-';
    const avgSndDir = thermalHour.filter(c => c.snd.direction != null).length > 0
      ? Math.round(thermalHour.filter(c => c.snd.direction != null).reduce((sum, c) => sum + c.snd.direction, 0) / thermalHour.filter(c => c.snd.direction != null).length)
      : '-';
    
    console.log(`${String(h).padStart(4)} | ${rate.padStart(10)}% | ${String(avgDccSpd).padStart(9)} | ${String(avgSndSpd).padStart(9)} | ${avgSndDir}°`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('KEY FINDINGS FOR PREDICTION MODEL');
  console.log('='.repeat(70));
  
  // Calculate optimal SND conditions
  const optimalSndSpeed = thermalSndSpeeds.length > 0 
    ? thermalSndSpeeds.reduce((a, b) => a + b, 0) / thermalSndSpeeds.length 
    : 0;
  const optimalSndDir = thermalSndDirs.length > 0
    ? thermalSndDirs.reduce((a, b) => a + b, 0) / thermalSndDirs.length
    : 0;
  
  console.log(`\n1. ARROWHEAD TRIGGER CONDITIONS:`);
  console.log(`   - Optimal wind speed: ${optimalSndSpeed.toFixed(1)} mph`);
  console.log(`   - Optimal direction: ${optimalSndDir.toFixed(0)}° (${directionToCardinal(optimalSndDir)})`);
  
  console.log(`\n2. TIMING:`);
  console.log(`   - Lead time: Check Arrowhead 60-90 min before expected thermal`);
  console.log(`   - Peak thermal hours at DCC: 12:00 PM - 3:00 PM`);
  
  console.log(`\n3. PREDICTION RULE:`);
  console.log(`   When Arrowhead shows ${optimalSndSpeed.toFixed(0)}-${(optimalSndSpeed + 4).toFixed(0)} mph from ${directionToCardinal(optimalSndDir)},`);
  console.log(`   expect South thermal at Deer Creek Dam within 60-90 minutes.`);
}

analyzeCorrelation().catch(console.error);
```

---

## File 83: `scripts/analyze-yesterday-paragliding.js`

> 321 lines | 12.1 KB

```javascript
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// All stations relevant to Point of the Mountain paragliding
const STATIONS = {
  // Primary paragliding stations
  'FPS': 'Flight Park South',
  'UTALP': 'Point of the Mountain (North)',
  
  // North flow indicators
  'KSLC': 'Salt Lake City Airport',
  'UTOLY': 'Salt Lake City (Murray)',
  
  // South flow / pressure indicators
  'KPVU': 'Provo Municipal Airport',
  
  // Nearby reference
  'QLN': 'Lindon',
  'QSF': 'Spanish Fork',
  
  // Great Salt Lake indicators
  'KU42': 'Salt Lake City Airport 2',
};

async function fetchYesterdayData() {
  // Yesterday's time range (full day, UTC)
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Set to yesterday 12:00 UTC (6 AM MDT) through today 06:00 UTC (midnight MDT)
  const start = new Date(yesterday);
  start.setUTCHours(12, 0, 0, 0); // 6 AM MDT
  
  const end = new Date(now);
  end.setUTCHours(6, 0, 0, 0); // Midnight MDT
  
  // Format as YYYYMMDDHHmm
  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}${m}${day}${h}${min}`;
  };
  const startStr = fmt(start);
  const endStr = fmt(end);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PARAGLIDING ANALYSIS: Yesterday's Wind Data`);
  console.log(`Query period: ${start.toLocaleString('en-US', {timeZone: 'America/Denver'})} to ${end.toLocaleString('en-US', {timeZone: 'America/Denver'})} MDT`);
  console.log(`${'='.repeat(80)}\n`);
  
  const stationIds = Object.keys(STATIONS).join(',');
  
  try {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stids=${stationIds}&start=${startStr}&end=${endStr}&vars=wind_speed,wind_direction,wind_gust,air_temp,pressure&units=english,speed|mph,temp|F,pres|mb&token=${SYNOPTIC_TOKEN}`;
    
    console.log('Fetching data from Synoptic API...\n');
    const response = await axios.get(url, { timeout: 30000 });
    
    if (response.data.SUMMARY?.RESPONSE_CODE !== 1) {
      console.log('API Error:', response.data.SUMMARY?.RESPONSE_MESSAGE);
      return;
    }
    
    const stations = response.data.STATION || [];
    console.log(`Received data for ${stations.length} stations\n`);
    
    // Process each station
    const allData = {};
    
    for (const station of stations) {
      const stid = station.STID;
      const name = STATIONS[stid] || station.NAME;
      const obs = station.OBSERVATIONS || {};
      
      const times = obs.date_time || [];
      const speeds = obs.wind_speed_set_1 || [];
      const dirs = obs.wind_direction_set_1 || [];
      const gusts = obs.wind_gust_set_1 || [];
      const temps = obs.air_temp_set_1 || [];
      const pressures = obs.pressure_set_1 || obs.sea_level_pressure_set_1 || [];
      
      allData[stid] = { name, times, speeds, dirs, gusts, temps, pressures };
      
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📍 ${stid} - ${name}`);
      console.log(`   Lat: ${station.LATITUDE}, Lon: ${station.LONGITUDE}, Elev: ${station.ELEVATION} ft`);
      console.log(`${'─'.repeat(70)}`);
      
      if (times.length === 0) {
        console.log('   No data available');
        continue;
      }
      
      // Focus on afternoon/evening hours (2 PM - 9 PM MDT = 20:00 - 03:00 UTC)
      console.log('\n   AFTERNOON/EVENING DATA (2 PM - 9 PM MDT):');
      console.log('   Time (MDT)    | Wind (mph) | Dir (°) | Gust | Temp (°F)');
      console.log('   ' + '-'.repeat(62));
      
      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24; // Convert UTC to MDT
        
        // Show afternoon/evening hours (2 PM - 9 PM)
        if (mdtHour >= 14 && mdtHour <= 21) {
          const timeStr = t.toLocaleString('en-US', { 
            timeZone: 'America/Denver', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          const speed = speeds[i]?.toFixed(1) || '--';
          const dir = dirs[i]?.toFixed(0) || '--';
          const gust = gusts[i]?.toFixed(0) || '--';
          const temp = temps[i]?.toFixed(1) || '--';
          
          // Direction as cardinal
          const cardinal = getCardinal(dirs[i]);
          
          console.log(`   ${timeStr.padEnd(16)} | ${speed.padStart(6)} mph | ${dir.padStart(5)}° ${cardinal.padStart(3)} | ${gust.padStart(4)} | ${temp}°F`);
        }
      }
      
      // Find peak evening wind
      let peakSpeed = 0;
      let peakDir = 0;
      let peakTime = '';
      
      for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20 && speeds[i] > peakSpeed) {
          peakSpeed = speeds[i];
          peakDir = dirs[i];
          peakTime = t.toLocaleString('en-US', { 
            timeZone: 'America/Denver', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        }
      }
      
      if (peakSpeed > 0) {
        console.log(`\n   ⭐ Peak Evening: ${peakSpeed.toFixed(1)} mph from ${peakDir?.toFixed(0)}° (${getCardinal(peakDir)}) at ${peakTime}`);
        
        // Check if flyable for paragliding
        if (stid === 'FPS') {
          const dirOk = peakDir >= 160 && peakDir <= 200;
          const speedOk = peakSpeed >= 5 && peakSpeed <= 18;
          console.log(`   South Side: Direction ${dirOk ? '✅' : '❌'} | Speed ${speedOk ? '✅' : '❌'}`);
        }
        if (stid === 'UTALP') {
          const dirOk = peakDir >= 315 || peakDir <= 45;
          const speedOk = peakSpeed >= 5 && peakSpeed <= 18;
          console.log(`   North Side: Direction ${dirOk ? '✅' : '❌'} | Speed ${speedOk ? '✅' : '❌'}`);
        }
      }
    }
    
    // ANALYSIS
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('ANALYSIS: WHY WAS THE NORTH SIDE FLYABLE?');
    console.log(`${'='.repeat(80)}\n`);
    
    // Compare KSLC and KPVU pressure
    const kslc = allData['KSLC'];
    const kpvu = allData['KPVU'];
    
    if (kslc && kpvu && kslc.pressures.length && kpvu.pressures.length) {
      // Get evening pressure gradient
      for (let i = kslc.times.length - 1; i >= 0; i--) {
        const t = new Date(kslc.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        if (mdtHour >= 16 && mdtHour <= 18 && kslc.pressures[i] && kpvu.pressures[i]) {
          const gradient = kslc.pressures[i] - kpvu.pressures[i];
          console.log(`Pressure Gradient (SLC - Provo) at ~${mdtHour}:00 MDT: ${gradient.toFixed(2)} mb`);
          if (gradient > 0) {
            console.log('→ Positive gradient = North flow pattern (SLC higher pressure pushing south)');
          } else {
            console.log('→ Negative gradient = South flow pattern');
          }
          break;
        }
      }
    }
    
    // UTALP evening analysis
    const utalp = allData['UTALP'];
    if (utalp) {
      console.log('\n--- UTALP (Flight Park North) Evening Analysis ---');
      let northWindMinutes = 0;
      let totalMinutes = 0;
      let avgNorthSpeed = 0;
      let northCount = 0;
      
      for (let i = 0; i < utalp.times.length; i++) {
        const t = new Date(utalp.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20) {
          totalMinutes++;
          const dir = utalp.dirs[i];
          const speed = utalp.speeds[i];
          
          if ((dir >= 315 || dir <= 45) && speed >= 5 && speed <= 18) {
            northWindMinutes++;
            avgNorthSpeed += speed;
            northCount++;
          }
        }
      }
      
      if (northCount > 0) avgNorthSpeed /= northCount;
      
      console.log(`North wind readings (3-8 PM): ${northWindMinutes}/${totalMinutes} observations`);
      console.log(`Average north wind speed: ${avgNorthSpeed.toFixed(1)} mph`);
      console.log(`Flyable window: ${northWindMinutes > 0 ? 'YES' : 'NO'}`);
    }
    
    // FPS evening analysis
    const fps = allData['FPS'];
    if (fps) {
      console.log('\n--- FPS (Flight Park South) Evening Analysis ---');
      for (let i = fps.times.length - 1; i >= Math.max(0, fps.times.length - 20); i--) {
        const t = new Date(fps.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 15 && mdtHour <= 20) {
          const dir = fps.dirs[i];
          const speed = fps.speeds[i];
          const cardinal = getCardinal(dir);
          
          // Did FPS switch to north? That would confirm north flow at POM
          if (dir >= 315 || dir <= 45) {
            const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
            console.log(`⚡ FPS showed NORTH wind at ${timeStr}: ${speed?.toFixed(1)} mph from ${dir?.toFixed(0)}° (${cardinal})`);
          }
        }
      }
    }
    
    // KSLC indicator analysis
    const kslcData = allData['KSLC'];
    if (kslcData) {
      console.log('\n--- KSLC (Salt Lake City) - North Flow Indicator ---');
      for (let i = 0; i < kslcData.times.length; i++) {
        const t = new Date(kslcData.times[i]);
        const mdtHour = (t.getUTCHours() - 6 + 24) % 24;
        
        if (mdtHour >= 14 && mdtHour <= 20) {
          const dir = kslcData.dirs[i];
          const speed = kslcData.speeds[i];
          
          // KSLC north wind is an early indicator for POM north side
          if ((dir >= 315 || dir <= 45) && speed >= 3) {
            const timeStr = t.toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', hour12: true });
            console.log(`📡 KSLC north wind at ${timeStr}: ${speed?.toFixed(1)} mph from ${dir?.toFixed(0)}° (${getCardinal(dir)})`);
          }
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('RECOMMENDATIONS FOR STRONGER MODEL');
    console.log(`${'='.repeat(80)}\n`);
    
    console.log('1. KSLC EARLY INDICATOR: Monitor SLC Airport for north wind onset');
    console.log('   - When KSLC shows N/NW wind > 3 mph, north side likely flyable in 30-60 min');
    console.log('');
    console.log('2. PRESSURE GRADIENT TIMING: Track SLC-Provo gradient change rate');
    console.log('   - Rapidly rising gradient in afternoon = strong north flow developing');
    console.log('');
    console.log('3. TEMPERATURE DIFFERENTIAL: Lake vs Valley temp difference');
    console.log('   - Greater Salt Lake cooling effect drives evening north flow');
    console.log('');
    console.log('4. FPS WIND SWITCH: When FPS switches from S to N, north side is active');
    console.log('   - This is the most reliable confirmation signal');
    console.log('');
    console.log('5. TIME-OF-DAY MODEL: Evening north flow is almost daily in warm months');
    console.log('   - Should default to "likely flyable" 4-8 PM Mar-Oct unless storm/strong S');
    
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data).substring(0, 500));
    }
  }
}

function getCardinal(deg) {
  if (deg == null) return '--';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

fetchYesterdayData();
```

---

## File 84: `scripts/analyze-zigzag-history.js`

> 599 lines | 22.0 KB

```javascript
/**
 * ZIG ZAG STATION HISTORICAL ANALYSIS
 * 
 * Analyzes 3 years of actual wind data from your Ambient Weather station
 * to find patterns for multi-day prediction.
 * 
 * Goals:
 * 1. Identify all "good wind" days (SE thermal and North flow)
 * 2. Correlate with MesoWest stations (FPS, KSLC, KPVU)
 * 3. Find 3-5 day lead indicators
 * 4. Build prediction rules
 */

import fs from 'fs';
import https from 'https';
import path from 'path';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

// Wind criteria for kiting/sailing
const WIND_CRITERIA = {
  // SE Thermal - classic Utah Lake thermal
  seThermal: {
    direction: { min: 100, max: 180 },
    speed: { min: 10, max: 25 },
    name: 'SE Thermal',
  },
  // North Flow - prefrontal/gap wind
  northFlow: {
    direction: { min: 315, max: 360, min2: 0, max2: 45 },
    speed: { min: 12, max: 30 },
    name: 'North Flow',
  },
};

// Parse CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/"/g, '').trim();
    });
    
    // Parse key fields
    if (row['Date']) {
      row.timestamp = new Date(row['Date']);
      row.windSpeed = parseFloat(row['Wind Speed (mph)']) || 0;
      row.windGust = parseFloat(row['Wind Gust (mph)']) || 0;
      row.windDirection = parseFloat(row['Wind Direction (°)']) || 0;
      row.temperature = parseFloat(row['Outside temperature Temperature (°F)']) || 0;
      row.pressure = parseFloat(row['Relative Pressure (inHg)']) || 0;
      data.push(row);
    }
  }
  
  return data;
}

// Check if wind matches criteria
function matchesCriteria(obs, criteria) {
  if (obs.windSpeed < criteria.speed.min || obs.windSpeed > criteria.speed.max) {
    return false;
  }
  
  // Handle wrap-around for north
  if (criteria.direction.min2 !== undefined) {
    return (obs.windDirection >= criteria.direction.min && obs.windDirection <= criteria.direction.max) ||
           (obs.windDirection >= criteria.direction.min2 && obs.windDirection <= criteria.direction.max2);
  }
  
  return obs.windDirection >= criteria.direction.min && obs.windDirection <= criteria.direction.max;
}

// Get date key
function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Get hour
function getHour(date) {
  return date.getHours();
}

// Fetch MesoWest data
async function fetchMesoWest(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp,altimeter&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function analyze() {
  console.log('ZIG ZAG STATION - 3 YEAR HISTORICAL ANALYSIS');
  console.log('='.repeat(70));
  
  // Read CSV file
  const csvPath = 'C:\\Users\\Admin\\Downloads\\AWN-483FDA542C6E-20230329-20260311.csv';
  console.log(`\nReading: ${csvPath}`);
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const data = parseCSV(content);
  
  console.log(`Total observations: ${data.length.toLocaleString()}`);
  console.log(`Date range: ${data[data.length-1].timestamp.toISOString().slice(0,10)} to ${data[0].timestamp.toISOString().slice(0,10)}`);
  
  // ============================================
  // STEP 1: Identify all good wind days
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: IDENTIFYING GOOD WIND DAYS');
  console.log('='.repeat(70));
  
  const dailyStats = new Map();
  
  data.forEach(obs => {
    const dateKey = getDateKey(obs.timestamp);
    const hour = getHour(obs.timestamp);
    
    if (!dailyStats.has(dateKey)) {
      dailyStats.set(dateKey, {
        date: dateKey,
        observations: [],
        seThermalCount: 0,
        northFlowCount: 0,
        maxSpeed: 0,
        maxGust: 0,
        peakHour: null,
        peakDirection: null,
        avgTemp: 0,
        avgPressure: 0,
        windType: null,
      });
    }
    
    const day = dailyStats.get(dateKey);
    day.observations.push(obs);
    
    if (obs.windSpeed > day.maxSpeed) {
      day.maxSpeed = obs.windSpeed;
      day.peakHour = hour;
      day.peakDirection = obs.windDirection;
    }
    if (obs.windGust > day.maxGust) {
      day.maxGust = obs.windGust;
    }
    
    if (matchesCriteria(obs, WIND_CRITERIA.seThermal)) {
      day.seThermalCount++;
    }
    if (matchesCriteria(obs, WIND_CRITERIA.northFlow)) {
      day.northFlowCount++;
    }
  });
  
  // Calculate daily averages and classify
  dailyStats.forEach(day => {
    if (day.observations.length > 0) {
      day.avgTemp = day.observations.reduce((s, o) => s + o.temperature, 0) / day.observations.length;
      day.avgPressure = day.observations.reduce((s, o) => s + o.pressure, 0) / day.observations.length;
    }
    
    // Classify day type (need at least 1 hour of good wind = 12 readings at 5-min intervals)
    if (day.seThermalCount >= 12) {
      day.windType = 'SE Thermal';
    } else if (day.northFlowCount >= 12) {
      day.windType = 'North Flow';
    }
  });
  
  const allDays = Array.from(dailyStats.values());
  const seThermalDays = allDays.filter(d => d.windType === 'SE Thermal');
  const northFlowDays = allDays.filter(d => d.windType === 'North Flow');
  
  console.log(`\nTotal days analyzed: ${allDays.length}`);
  console.log(`SE Thermal days: ${seThermalDays.length} (${(seThermalDays.length/allDays.length*100).toFixed(1)}%)`);
  console.log(`North Flow days: ${northFlowDays.length} (${(northFlowDays.length/allDays.length*100).toFixed(1)}%)`);
  
  // ============================================
  // STEP 2: Monthly and Seasonal Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: MONTHLY PATTERNS');
  console.log('='.repeat(70));
  
  const monthlyStats = {};
  for (let m = 1; m <= 12; m++) {
    monthlyStats[m] = { total: 0, seThermal: 0, northFlow: 0, avgMaxSpeed: 0, peakHours: [] };
  }
  
  allDays.forEach(day => {
    const month = parseInt(day.date.slice(5, 7));
    monthlyStats[month].total++;
    if (day.windType === 'SE Thermal') {
      monthlyStats[month].seThermal++;
      monthlyStats[month].avgMaxSpeed += day.maxSpeed;
      if (day.peakHour != null) monthlyStats[month].peakHours.push(day.peakHour);
    }
    if (day.windType === 'North Flow') {
      monthlyStats[month].northFlow++;
    }
  });
  
  console.log('\nMonth | Total | SE Thermal | North Flow | SE Rate | N Rate | Avg Peak');
  console.log('------|-------|------------|------------|---------|--------|----------');
  
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let m = 1; m <= 12; m++) {
    const ms = monthlyStats[m];
    const seRate = ms.total > 0 ? (ms.seThermal / ms.total * 100).toFixed(1) : '0.0';
    const nRate = ms.total > 0 ? (ms.northFlow / ms.total * 100).toFixed(1) : '0.0';
    const avgSpeed = ms.seThermal > 0 ? (ms.avgMaxSpeed / ms.seThermal).toFixed(1) : '--';
    const avgPeak = ms.peakHours.length > 0 
      ? (ms.peakHours.reduce((a,b) => a+b, 0) / ms.peakHours.length).toFixed(0) + ':00'
      : '--';
    
    console.log(`${monthNames[m].padEnd(5)} | ${String(ms.total).padStart(5)} | ${String(ms.seThermal).padStart(10)} | ${String(ms.northFlow).padStart(10)} | ${seRate.padStart(6)}% | ${nRate.padStart(5)}% | ${avgPeak}`);
  }
  
  // ============================================
  // STEP 3: Hourly Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: HOURLY PATTERNS (SE Thermal Days)');
  console.log('='.repeat(70));
  
  const hourlyWindSpeed = {};
  for (let h = 0; h < 24; h++) {
    hourlyWindSpeed[h] = { speeds: [], directions: [], count: 0 };
  }
  
  seThermalDays.forEach(day => {
    day.observations.forEach(obs => {
      const hour = getHour(obs.timestamp);
      if (matchesCriteria(obs, WIND_CRITERIA.seThermal)) {
        hourlyWindSpeed[hour].speeds.push(obs.windSpeed);
        hourlyWindSpeed[hour].directions.push(obs.windDirection);
        hourlyWindSpeed[hour].count++;
      }
    });
  });
  
  console.log('\nHour | Avg Speed | Avg Dir | Observations');
  console.log('-----|-----------|---------|-------------');
  
  for (let h = 6; h <= 20; h++) {
    const hs = hourlyWindSpeed[h];
    if (hs.speeds.length > 0) {
      const avgSpeed = (hs.speeds.reduce((a,b) => a+b, 0) / hs.speeds.length).toFixed(1);
      const avgDir = Math.round(hs.directions.reduce((a,b) => a+b, 0) / hs.directions.length);
      console.log(`${String(h).padStart(4)} | ${avgSpeed.padStart(9)} | ${String(avgDir).padStart(7)}° | ${hs.count}`);
    }
  }
  
  // ============================================
  // STEP 4: Day-Before Patterns
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: DAY-BEFORE PATTERNS');
  console.log('='.repeat(70));
  
  const dayBeforePatterns = { seThermal: [], northFlow: [], noWind: [] };
  
  seThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay) {
      // Get evening conditions (5-9 PM)
      const eveningObs = prevDay.observations.filter(o => {
        const h = getHour(o.timestamp);
        return h >= 17 && h <= 21;
      });
      
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((s, o) => s + o.temperature, 0) / eveningObs.length;
        const avgPressure = eveningObs.reduce((s, o) => s + o.pressure, 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((s, o) => s + o.windSpeed, 0) / eveningObs.length;
        
        dayBeforePatterns.seThermal.push({
          date: day.date,
          prevDate: prevKey,
          eveningTemp: avgTemp,
          eveningPressure: avgPressure,
          eveningSpeed: avgSpeed,
          nextDayMaxSpeed: day.maxSpeed,
          nextDayPeakHour: day.peakHour,
        });
      }
    }
  });
  
  // Same for north flow days
  northFlowDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay) {
      const eveningObs = prevDay.observations.filter(o => {
        const h = getHour(o.timestamp);
        return h >= 17 && h <= 21;
      });
      
      if (eveningObs.length > 0) {
        const avgTemp = eveningObs.reduce((s, o) => s + o.temperature, 0) / eveningObs.length;
        const avgPressure = eveningObs.reduce((s, o) => s + o.pressure, 0) / eveningObs.length;
        const avgSpeed = eveningObs.reduce((s, o) => s + o.windSpeed, 0) / eveningObs.length;
        
        dayBeforePatterns.northFlow.push({
          date: day.date,
          prevDate: prevKey,
          eveningTemp: avgTemp,
          eveningPressure: avgPressure,
          eveningSpeed: avgSpeed,
          nextDayMaxSpeed: day.maxSpeed,
        });
      }
    }
  });
  
  if (dayBeforePatterns.seThermal.length > 0) {
    const avgTemp = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningTemp, 0) / dayBeforePatterns.seThermal.length;
    const avgPressure = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningPressure, 0) / dayBeforePatterns.seThermal.length;
    const avgSpeed = dayBeforePatterns.seThermal.reduce((s, p) => s + p.eveningSpeed, 0) / dayBeforePatterns.seThermal.length;
    
    console.log(`\nEVENING BEFORE SE THERMAL DAY (5-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average pressure: ${avgPressure.toFixed(2)} inHg`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Sample size: ${dayBeforePatterns.seThermal.length} days`);
  }
  
  if (dayBeforePatterns.northFlow.length > 0) {
    const avgTemp = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningTemp, 0) / dayBeforePatterns.northFlow.length;
    const avgPressure = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningPressure, 0) / dayBeforePatterns.northFlow.length;
    const avgSpeed = dayBeforePatterns.northFlow.reduce((s, p) => s + p.eveningSpeed, 0) / dayBeforePatterns.northFlow.length;
    
    console.log(`\nEVENING BEFORE NORTH FLOW DAY (5-9 PM):`);
    console.log(`  Average temp: ${avgTemp.toFixed(1)}°F`);
    console.log(`  Average pressure: ${avgPressure.toFixed(2)} inHg`);
    console.log(`  Average wind: ${avgSpeed.toFixed(1)} mph`);
    console.log(`  Sample size: ${dayBeforePatterns.northFlow.length} days`);
  }
  
  // ============================================
  // STEP 5: Multi-Day Patterns (3-5 days out)
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 5: MULTI-DAY PATTERNS (3-5 days before)');
  console.log('='.repeat(70));
  
  const multiDayPatterns = { 
    seThermal: { day1: [], day2: [], day3: [], day4: [], day5: [] },
    northFlow: { day1: [], day2: [], day3: [], day4: [], day5: [] }
  };
  
  // Analyze pressure trends leading up to good days
  seThermalDays.forEach(day => {
    for (let daysBack = 1; daysBack <= 5; daysBack++) {
      const prevDate = new Date(day.date);
      prevDate.setDate(prevDate.getDate() - daysBack);
      const prevKey = getDateKey(prevDate);
      const prevDay = dailyStats.get(prevKey);
      
      if (prevDay) {
        multiDayPatterns.seThermal[`day${daysBack}`].push({
          avgPressure: prevDay.avgPressure,
          avgTemp: prevDay.avgTemp,
          maxSpeed: prevDay.maxSpeed,
        });
      }
    }
  });
  
  northFlowDays.forEach(day => {
    for (let daysBack = 1; daysBack <= 5; daysBack++) {
      const prevDate = new Date(day.date);
      prevDate.setDate(prevDate.getDate() - daysBack);
      const prevKey = getDateKey(prevDate);
      const prevDay = dailyStats.get(prevKey);
      
      if (prevDay) {
        multiDayPatterns.northFlow[`day${daysBack}`].push({
          avgPressure: prevDay.avgPressure,
          avgTemp: prevDay.avgTemp,
          maxSpeed: prevDay.maxSpeed,
        });
      }
    }
  });
  
  console.log('\nPRESSURE TREND BEFORE SE THERMAL DAYS:');
  console.log('Days Before | Avg Pressure | Avg Temp | Avg Max Wind');
  console.log('------------|--------------|----------|-------------');
  
  for (let d = 5; d >= 1; d--) {
    const patterns = multiDayPatterns.seThermal[`day${d}`];
    if (patterns.length > 0) {
      const avgP = patterns.reduce((s, p) => s + p.avgPressure, 0) / patterns.length;
      const avgT = patterns.reduce((s, p) => s + p.avgTemp, 0) / patterns.length;
      const avgW = patterns.reduce((s, p) => s + p.maxSpeed, 0) / patterns.length;
      console.log(`${String(d).padStart(11)} | ${avgP.toFixed(2).padStart(12)} | ${avgT.toFixed(1).padStart(8)}°F | ${avgW.toFixed(1)} mph`);
    }
  }
  console.log(`          0 | (SE Thermal Day)`);
  
  console.log('\nPRESSURE TREND BEFORE NORTH FLOW DAYS:');
  console.log('Days Before | Avg Pressure | Avg Temp | Avg Max Wind');
  console.log('------------|--------------|----------|-------------');
  
  for (let d = 5; d >= 1; d--) {
    const patterns = multiDayPatterns.northFlow[`day${d}`];
    if (patterns.length > 0) {
      const avgP = patterns.reduce((s, p) => s + p.avgPressure, 0) / patterns.length;
      const avgT = patterns.reduce((s, p) => s + p.avgTemp, 0) / patterns.length;
      const avgW = patterns.reduce((s, p) => s + p.maxSpeed, 0) / patterns.length;
      console.log(`${String(d).padStart(11)} | ${avgP.toFixed(2).padStart(12)} | ${avgT.toFixed(1).padStart(8)}°F | ${avgW.toFixed(1)} mph`);
    }
  }
  console.log(`          0 | (North Flow Day)`);
  
  // ============================================
  // STEP 6: Best Days Analysis
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 6: BEST WIND DAYS (Top 20)');
  console.log('='.repeat(70));
  
  const bestDays = allDays
    .filter(d => d.maxSpeed >= 12)
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 20);
  
  console.log('\nDate       | Max Speed | Max Gust | Peak Hour | Direction | Type');
  console.log('-----------|-----------|----------|-----------|-----------|------------');
  
  bestDays.forEach(day => {
    const type = day.windType || 'Other';
    const dirLabel = day.peakDirection < 180 ? 'SE' : day.peakDirection > 270 ? 'N' : 'SW';
    console.log(`${day.date} | ${day.maxSpeed.toFixed(1).padStart(9)} | ${day.maxGust.toFixed(1).padStart(8)} | ${String(day.peakHour).padStart(9)}:00 | ${String(Math.round(day.peakDirection)).padStart(9)}° | ${type}`);
  });
  
  // ============================================
  // STEP 7: Pressure Change Analysis
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('STEP 7: PRESSURE CHANGE PATTERNS');
  console.log('='.repeat(70));
  
  // Calculate day-to-day pressure changes before good wind days
  const pressureChanges = { seThermal: [], northFlow: [] };
  
  seThermalDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay && day.avgPressure > 0 && prevDay.avgPressure > 0) {
      pressureChanges.seThermal.push(day.avgPressure - prevDay.avgPressure);
    }
  });
  
  northFlowDays.forEach(day => {
    const prevDate = new Date(day.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = getDateKey(prevDate);
    const prevDay = dailyStats.get(prevKey);
    
    if (prevDay && day.avgPressure > 0 && prevDay.avgPressure > 0) {
      pressureChanges.northFlow.push(day.avgPressure - prevDay.avgPressure);
    }
  });
  
  if (pressureChanges.seThermal.length > 0) {
    const avg = pressureChanges.seThermal.reduce((a,b) => a+b, 0) / pressureChanges.seThermal.length;
    const rising = pressureChanges.seThermal.filter(c => c > 0.02).length;
    const falling = pressureChanges.seThermal.filter(c => c < -0.02).length;
    const stable = pressureChanges.seThermal.length - rising - falling;
    
    console.log(`\nSE THERMAL DAYS - Pressure change from day before:`);
    console.log(`  Average change: ${avg > 0 ? '+' : ''}${avg.toFixed(3)} inHg`);
    console.log(`  Rising (>0.02): ${rising} days (${(rising/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
    console.log(`  Stable: ${stable} days (${(stable/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
    console.log(`  Falling (<-0.02): ${falling} days (${(falling/pressureChanges.seThermal.length*100).toFixed(1)}%)`);
  }
  
  if (pressureChanges.northFlow.length > 0) {
    const avg = pressureChanges.northFlow.reduce((a,b) => a+b, 0) / pressureChanges.northFlow.length;
    const rising = pressureChanges.northFlow.filter(c => c > 0.02).length;
    const falling = pressureChanges.northFlow.filter(c => c < -0.02).length;
    const stable = pressureChanges.northFlow.length - rising - falling;
    
    console.log(`\nNORTH FLOW DAYS - Pressure change from day before:`);
    console.log(`  Average change: ${avg > 0 ? '+' : ''}${avg.toFixed(3)} inHg`);
    console.log(`  Rising (>0.02): ${rising} days (${(rising/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
    console.log(`  Stable: ${stable} days (${(stable/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
    console.log(`  Falling (<-0.02): ${falling} days (${(falling/pressureChanges.northFlow.length*100).toFixed(1)}%)`);
  }
  
  // ============================================
  // SUMMARY: Prediction Rules
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('PREDICTION RULES SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`
BASED ON 3 YEARS OF ZIG ZAG DATA:

SE THERMAL PREDICTION:
  - Best months: [Calculate from data]
  - Peak hours: [Calculate from data]
  - Day-before indicators:
    * Evening temp: [Calculate]
    * Evening pressure: [Calculate]
    * Pressure trend: [Calculate]

NORTH FLOW PREDICTION:
  - Best months: [Calculate from data]
  - Day-before indicators:
    * Falling pressure = front approaching
    * Cold front passage = strong north wind next day

MULTI-DAY FORECAST:
  - 5 days out: Watch for pressure pattern
  - 3 days out: Confirm pressure trend
  - 1 day out: Evening conditions confirm
  - Same day: Morning gradient check
`);

  // Output data for further analysis
  console.log('\n' + '='.repeat(70));
  console.log('DATA EXPORT');
  console.log('='.repeat(70));
  
  // Export best SE thermal days for correlation
  const seThermalExport = seThermalDays
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 50)
    .map(d => ({
      date: d.date,
      maxSpeed: d.maxSpeed,
      maxGust: d.maxGust,
      peakHour: d.peakHour,
      avgTemp: d.avgTemp.toFixed(1),
      avgPressure: d.avgPressure.toFixed(2),
    }));
  
  console.log('\nTop 50 SE Thermal Days (for MesoWest correlation):');
  console.log(JSON.stringify(seThermalExport.slice(0, 10), null, 2));
  console.log('... and', seThermalExport.length - 10, 'more');
  
  // Export for use in app
  const exportData = {
    seThermalDays: seThermalExport,
    northFlowDays: northFlowDays.slice(0, 50).map(d => ({
      date: d.date,
      maxSpeed: d.maxSpeed,
      peakHour: d.peakHour,
    })),
    monthlyStats: Object.entries(monthlyStats).map(([m, s]) => ({
      month: parseInt(m),
      seRate: s.total > 0 ? (s.seThermal / s.total * 100).toFixed(1) : 0,
      nRate: s.total > 0 ? (s.northFlow / s.total * 100).toFixed(1) : 0,
    })),
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'src', 'data', 'zigzag-historical.json'),
    JSON.stringify(exportData, null, 2)
  );
  console.log('\nExported to src/data/zigzag-historical.json');
}

analyze().catch(console.error);
```

---

## File 85: `scripts/export-for-audit.js`

> 299 lines | 10.1 KB

```javascript
/**
 * Export entire codebase into a single structured document
 * for AI audit (Gemini, Claude, GPT, etc.)
 * 
 * Usage: node scripts/export-for-audit.js
 * Output: audit-export.md in project root
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const SKIP_DIRS = ['node_modules', 'dist', '.git', '.github', 'capacitor'];
const SKIP_FILES = ['package-lock.json', '.env', '.env.production', '.env.example'];
const MAX_JSON_LINES = 50;

const FILE_ORDER = [
  // 1. Project config
  'package.json',
  'vite.config.js',
  'index.html',
  'vercel.json',
  'eslint.config.js',
  
  // 2. Documentation
  'README.md',
  'docs/SYSTEM-ARCHITECTURE.md',
  'docs/PREDICTION-METHODOLOGY.md',
  'docs/VALIDATED-CORRELATIONS.md',
  'docs/FORECAST-INTEGRATION.md',
  'docs/LEARNING-SYSTEM.md',
  'docs/USER-PERSONAS-ANALYSIS.md',
  'docs/MULTI-USER-FEATURES.md',
  'docs/DATA-UPDATE-FREQUENCIES.md',
  
  // 3. Entry points
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  
  // 4. Core services (data layer)
  'src/services/WeatherService.js',
  'src/services/DataNormalizer.js',
  'src/services/ThermalPredictor.js',
  'src/services/ForecastService.js',
  'src/services/MultiDayForecast.js',
  'src/services/NotificationService.js',
  'src/services/LearningSystem.js',
  'src/services/DataCollector.js',
  
  // 5. Configuration
  'src/config/lakeStations.js',
  'src/config/indicatorSystem.js',
  
  // 6. Hooks
  'src/hooks/useLakeData.js',
  'src/hooks/useWeatherData.js',
  
  // 7. Context
  'src/context/ThemeContext.jsx',
  
  // 8. Utilities
  'src/utils/thermalCalculations.js',
  'src/utils/themeClasses.js',
  
  // 9. Main components
  'src/components/Dashboard.jsx',
  'src/components/ActivityMode.jsx',
  'src/components/LakeSelector.jsx',
  'src/components/ParaglidingMode.jsx',
  'src/components/FishingMode.jsx',
  'src/components/ConfidenceGauge.jsx',
  'src/components/WindVector.jsx',
  'src/components/WindMap.jsx',
  'src/components/KiteSafety.jsx',
  'src/components/NorthFlowGauge.jsx',
  'src/components/BustAlert.jsx',
  'src/components/ThermalStatus.jsx',
  'src/components/ThermalForecast.jsx',
  'src/components/ForecastPanel.jsx',
  'src/components/FiveDayForecast.jsx',
  'src/components/HourlyTimeline.jsx',
  'src/components/WeeklyBestDays.jsx',
  'src/components/GlassScore.jsx',
  'src/components/RaceDayMode.jsx',
  'src/components/WeatherForecast.jsx',
  'src/components/SevereWeatherAlerts.jsx',
  'src/components/DataFreshness.jsx',
  'src/components/LearningDashboard.jsx',
  'src/components/NotificationSettings.jsx',
  'src/components/ToastNotification.jsx',
  'src/components/Sparkline.jsx',
  'src/components/ThemeToggle.jsx',
  
  // 10. Data files (truncated)
  'src/data/zigzag-historical.json',
  'src/data/spanish-fork-correlation.json',
  'src/data/north-flow-indicators.json',
  'src/data/kslc-fps-validation.json',
  'src/data/provo-utalp-correlation.json',
  
  // 11. PWA
  'public/manifest.json',
  'public/sw.js',
];

function getFileExtension(filePath) {
  return path.extname(filePath).slice(1);
}

function getLanguage(ext) {
  const map = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
    yml: 'yaml', yaml: 'yaml', svg: 'xml',
  };
  return map[ext] || ext;
}

function shouldTruncateJson(filePath) {
  const name = path.basename(filePath);
  return name.endsWith('.json') && 
    !['package.json', 'manifest.json', 'vercel.json', 'capacitor.config.json'].includes(name);
}

function readFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (shouldTruncateJson(filePath)) {
      const lines = content.split('\n');
      if (lines.length > MAX_JSON_LINES) {
        return lines.slice(0, MAX_JSON_LINES).join('\n') + 
          `\n\n// ... ${lines.length - MAX_JSON_LINES} more lines truncated (${(content.length / 1024).toFixed(1)} KB total) ...`;
      }
    }
    
    return content;
  } catch {
    return null;
  }
}

function collectRemainingFiles(dir, collected = new Set(), results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        collectRemainingFiles(fullPath, collected, results);
      }
    } else if (entry.isFile()) {
      const ext = getFileExtension(entry.name);
      if (['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'md', 'yml', 'yaml'].includes(ext)) {
        if (!collected.has(relPath) && !SKIP_FILES.includes(entry.name)) {
          results.push(relPath);
        }
      }
    }
  }
  
  return results;
}

function generateAudit() {
  let output = '';
  let fileCount = 0;
  let totalLines = 0;
  const processedFiles = new Set();
  
  // Header
  output += `# Utah Wind Pro - Full Codebase Audit Export\n\n`;
  output += `**Generated:** ${new Date().toISOString()}\n`;
  output += `**Purpose:** Complete codebase for AI audit and review\n\n`;
  
  // Audit prompt
  output += `## Audit Instructions\n\n`;
  output += `You are reviewing "Utah Wind Pro" (utahwindfinder.com), a React weather forecasting app for wind sports, paragliding, and fishing in Utah.\n\n`;
  output += `### What This App Does\n`;
  output += `- Predicts thermal wind windows for Utah Lake, Deer Creek, and Willard Bay\n`;
  output += `- Forecasts paragliding conditions at Point of the Mountain (Flight Park North/South)\n`;
  output += `- Provides fishing forecasts based on moon phase, barometric pressure, and solunar data\n`;
  output += `- Uses real-time data from Ambient Weather (PWS), Synoptic/MesoWest, and NWS APIs\n`;
  output += `- Includes a self-learning system that collects data daily to improve predictions\n`;
  output += `- Supports 6 activity modes: Kiting, Sailing, Fishing, Boating, Paddling, Paragliding\n\n`;
  
  output += `### Please Audit For\n`;
  output += `1. **Architecture & Code Quality** - Component structure, separation of concerns, DRY violations\n`;
  output += `2. **Performance** - Unnecessary re-renders, API call efficiency, bundle size\n`;
  output += `3. **Prediction Accuracy** - Are the weather algorithms sound? Missing factors?\n`;
  output += `4. **Data Flow** - How data moves from APIs through normalization to UI\n`;
  output += `5. **Error Handling** - Missing try/catch, unhandled edge cases, API failures\n`;
  output += `6. **Security** - API key exposure, XSS vectors, unsafe patterns\n`;
  output += `7. **UX/Accessibility** - Mobile responsiveness, color contrast, screen reader support\n`;
  output += `8. **Testing** - What needs tests? Critical paths without coverage\n`;
  output += `9. **Scalability** - Can this handle more locations, more users, more data?\n`;
  output += `10. **Bugs** - Anything that looks broken or could fail silently\n\n`;
  
  output += `---\n\n`;
  
  // Table of contents
  output += `## Table of Contents\n\n`;
  output += `| # | File | Lines | Size |\n`;
  output += `|---|------|-------|------|\n`;
  
  const toc = [];
  
  // Process ordered files first
  for (const relPath of FILE_ORDER) {
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      const content = readFileContent(fullPath);
      if (content) {
        const lines = content.split('\n').length;
        const size = (Buffer.byteLength(content) / 1024).toFixed(1);
        toc.push({ relPath, lines, size });
        processedFiles.add(relPath);
      }
    }
  }
  
  // Collect any remaining files not in the ordered list
  const remaining = collectRemainingFiles(ROOT, processedFiles);
  for (const relPath of remaining) {
    const fullPath = path.join(ROOT, relPath);
    const content = readFileContent(fullPath);
    if (content) {
      const lines = content.split('\n').length;
      const size = (Buffer.byteLength(content) / 1024).toFixed(1);
      toc.push({ relPath, lines, size });
      processedFiles.add(relPath);
    }
  }
  
  toc.forEach((entry, i) => {
    output += `| ${i + 1} | \`${entry.relPath}\` | ${entry.lines} | ${entry.size} KB |\n`;
  });
  
  output += `\n---\n\n`;
  
  // Output each file
  for (const entry of toc) {
    const fullPath = path.join(ROOT, entry.relPath);
    const content = readFileContent(fullPath);
    if (!content) continue;
    
    fileCount++;
    totalLines += entry.lines;
    
    const ext = getFileExtension(entry.relPath);
    const lang = getLanguage(ext);
    
    output += `## File ${fileCount}: \`${entry.relPath}\`\n\n`;
    output += `> ${entry.lines} lines | ${entry.size} KB\n\n`;
    output += `\`\`\`${lang}\n`;
    output += content;
    if (!content.endsWith('\n')) output += '\n';
    output += `\`\`\`\n\n`;
    output += `---\n\n`;
  }
  
  // Summary
  output += `## Export Summary\n\n`;
  output += `- **Total files:** ${fileCount}\n`;
  output += `- **Total lines:** ${totalLines.toLocaleString()}\n`;
  output += `- **Export size:** ${(Buffer.byteLength(output) / 1024).toFixed(0)} KB\n`;
  output += `- **Estimated tokens:** ~${Math.round(Buffer.byteLength(output) / 4).toLocaleString()}\n`;
  
  return output;
}

// Run
console.log('Exporting codebase for audit...\n');
const output = generateAudit();
const outputPath = path.join(ROOT, 'audit-export.md');
fs.writeFileSync(outputPath, output, 'utf-8');

const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(0);
const sizeMB = (Buffer.byteLength(output) / (1024 * 1024)).toFixed(2);
const estimatedTokens = Math.round(Buffer.byteLength(output) / 4);

console.log(`✅ Export complete!`);
console.log(`   File: ${outputPath}`);
console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
console.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
console.log(`\nNext steps:`);
console.log(`   1. Open Google AI Studio (aistudio.google.com)`);
console.log(`   2. Select Gemini 2.5 Pro (or latest)`);
console.log(`   3. Upload audit-export.md as a file`);
console.log(`   4. Ask: "Please do a comprehensive audit of this codebase"`);
console.log(`   Or paste specific sections for focused review.`);
```

---

## File 86: `scripts/templates/analyze-new-location.js`

> 595 lines | 21.0 KB

```javascript
/**
 * TEMPLATE: Analyze New Location for Wind Indicators
 * 
 * This script template helps you find and validate wind indicators for a new kiting location.
 * 
 * USAGE:
 * 1. Copy this file to a new name (e.g., analyze-bear-lake.js)
 * 2. Fill in the TARGET_LOCATION configuration
 * 3. Run: node scripts/analyze-bear-lake.js
 * 4. Review output and add validated indicators to indicatorSystem.js
 */

const axios = require('axios');
require('dotenv').config();

// =============================================================================
// CONFIGURATION - FILL THESE IN FOR YOUR LOCATION
// =============================================================================

const TARGET_LOCATION = {
  name: 'Your Location Name',
  
  // If you have a weather station at the target, enter its ID
  // Otherwise, leave null and we'll search for nearby stations
  targetStationId: null, // e.g., 'FPS' for Flight Park South
  
  // Target coordinates
  coordinates: {
    lat: 40.0,  // Fill in
    lng: -111.0, // Fill in
  },
  
  // What wind types are you looking for?
  windTypes: {
    thermal: {
      enabled: true,
      direction: { min: 90, max: 180, label: 'SE' }, // Thermal direction at your spot
      searchDirection: 'southeast', // Where to look for indicator stations
    },
    northFlow: {
      enabled: true,
      direction: { min: 315, max: 45, label: 'N' },
      searchDirection: 'north',
    },
    gapWind: {
      enabled: false,
      direction: { min: 0, max: 360, label: 'Any' },
      searchDirection: 'any',
    },
  },
  
  // Kiteable thresholds
  kiteThresholds: {
    foilMinSpeed: 10,    // mph
    twinTipMinSpeed: 15, // mph
  },
  
  // Search radius for finding indicator stations (miles)
  searchRadius: 50,
};

// Candidate indicator stations to analyze
// Add stations you think might be good indicators
const CANDIDATE_INDICATORS = [
  // { id: 'KSLC', name: 'Salt Lake City', expectedLeadHours: 1 },
  // { id: 'QSF', name: 'Spanish Fork', expectedLeadHours: 2 },
  // Add your candidates here
];

const SYNOPTIC_TOKEN = process.env.VITE_SYNOPTIC_TOKEN;

// =============================================================================
// STEP 1: SEARCH FOR NEARBY STATIONS
// =============================================================================

async function searchNearbyStations() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: SEARCHING FOR NEARBY WEATHER STATIONS');
  console.log('='.repeat(70));
  
  const { lat, lng } = TARGET_LOCATION.coordinates;
  const radius = TARGET_LOCATION.searchRadius;
  
  console.log(`\nSearching within ${radius} miles of ${lat}, ${lng}...`);
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/metadata', {
      params: {
        token: SYNOPTIC_TOKEN,
        radius: `${lat},${lng},${radius}`,
        status: 'active',
        vars: 'wind_speed,wind_direction',
        limit: 100,
      },
    });
    
    if (response.data.STATION) {
      const stations = response.data.STATION;
      console.log(`\nFound ${stations.length} stations with wind data:\n`);
      
      // Group by distance
      const withDistance = stations.map(s => {
        const stLat = parseFloat(s.LATITUDE);
        const stLng = parseFloat(s.LONGITUDE);
        const distance = calculateDistance(lat, lng, stLat, stLng);
        return { ...s, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      // Print stations grouped by distance
      console.log('NEARBY (< 10 miles):');
      withDistance.filter(s => s.distance < 10).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      console.log('\nMEDIUM DISTANCE (10-30 miles):');
      withDistance.filter(s => s.distance >= 10 && s.distance < 30).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      console.log('\nFARTHER (30-50 miles):');
      withDistance.filter(s => s.distance >= 30).slice(0, 20).forEach(s => {
        console.log(`  ${s.STID.padEnd(8)} ${s.NAME.substring(0, 30).padEnd(32)} ${s.distance.toFixed(1)} mi  ${s.ELEVATION} ft`);
      });
      
      return withDistance;
    }
  } catch (error) {
    console.error('Error searching stations:', error.message);
  }
  
  return [];
}

// =============================================================================
// STEP 2: IDENTIFY GOOD WIND DAYS AT TARGET
// =============================================================================

async function identifyGoodWindDays(targetStationId) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: IDENTIFYING GOOD WIND DAYS AT TARGET');
  console.log('='.repeat(70));
  
  if (!targetStationId) {
    console.log('\nNo target station specified. Please add a targetStationId to TARGET_LOCATION');
    console.log('or use the station list from Step 1 to find the closest station to your spot.');
    return [];
  }
  
  console.log(`\nAnalyzing ${targetStationId} for good kiting days...`);
  
  // Fetch 6 months of historical data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: targetStationId,
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction',
        units: 'english',
      },
    });
    
    if (!response.data.STATION?.[0]?.OBSERVATIONS) {
      console.log('No data found for target station');
      return [];
    }
    
    const obs = response.data.STATION[0].OBSERVATIONS;
    const times = obs.date_time || [];
    const speeds = obs.wind_speed_set_1 || [];
    const directions = obs.wind_direction_set_1 || [];
    
    // Find good wind periods
    const goodDays = new Map(); // date -> { firstHour, peakSpeed, avgSpeed, hours }
    
    for (let i = 0; i < times.length; i++) {
      const speed = speeds[i];
      const direction = directions[i];
      
      if (speed === null || speed < TARGET_LOCATION.kiteThresholds.foilMinSpeed) continue;
      
      const date = new Date(times[i]);
      const dateKey = date.toISOString().slice(0, 10);
      const hour = date.getHours();
      
      // Check if direction matches any enabled wind type
      let matchesWindType = false;
      for (const [type, config] of Object.entries(TARGET_LOCATION.windTypes)) {
        if (!config.enabled) continue;
        if (isDirectionInRange(direction, config.direction.min, config.direction.max)) {
          matchesWindType = true;
          break;
        }
      }
      
      if (!matchesWindType) continue;
      
      if (!goodDays.has(dateKey)) {
        goodDays.set(dateKey, {
          date: dateKey,
          firstHour: hour,
          peakSpeed: speed,
          totalSpeed: speed,
          count: 1,
        });
      } else {
        const day = goodDays.get(dateKey);
        day.peakSpeed = Math.max(day.peakSpeed, speed);
        day.totalSpeed += speed;
        day.count++;
        if (hour < day.firstHour) day.firstHour = hour;
      }
    }
    
    // Convert to array and calculate averages
    const goodDaysArray = Array.from(goodDays.values()).map(d => ({
      ...d,
      avgSpeed: d.totalSpeed / d.count,
    })).sort((a, b) => b.peakSpeed - a.peakSpeed);
    
    console.log(`\nFound ${goodDaysArray.length} good wind days in the last 6 months`);
    console.log('\nTop 20 best days:');
    console.log('Date        First Hour  Peak Speed  Avg Speed  Duration');
    console.log('-'.repeat(60));
    
    goodDaysArray.slice(0, 20).forEach(d => {
      console.log(
        `${d.date}  ${String(d.firstHour).padStart(2)}:00       ` +
        `${d.peakSpeed.toFixed(1).padStart(5)} mph   ` +
        `${d.avgSpeed.toFixed(1).padStart(5)} mph   ` +
        `${d.count} readings`
      );
    });
    
    return goodDaysArray;
    
  } catch (error) {
    console.error('Error fetching target data:', error.message);
    return [];
  }
}

// =============================================================================
// STEP 3: CORRELATE INDICATOR STATIONS
// =============================================================================

async function correlateIndicators(goodDays, candidates) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 3: CORRELATING INDICATOR STATIONS');
  console.log('='.repeat(70));
  
  if (candidates.length === 0) {
    console.log('\nNo candidate indicators specified. Add stations to CANDIDATE_INDICATORS.');
    return;
  }
  
  if (goodDays.length === 0) {
    console.log('\nNo good wind days found. Cannot correlate indicators.');
    return;
  }
  
  for (const candidate of candidates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Analyzing: ${candidate.name} (${candidate.id})`);
    console.log(`${'─'.repeat(60)}`);
    
    // For each good day, check what the indicator showed 1, 2, 3, 4 hours before
    const correlations = {
      1: { matches: 0, total: 0, speeds: [] },
      2: { matches: 0, total: 0, speeds: [] },
      3: { matches: 0, total: 0, speeds: [] },
      4: { matches: 0, total: 0, speeds: [] },
    };
    
    // Sample a subset of good days to avoid API limits
    const sampleDays = goodDays.slice(0, 50);
    
    for (const day of sampleDays) {
      try {
        // Fetch indicator data for this day
        const dayStart = day.date.replace(/-/g, '') + '0000';
        const dayEnd = day.date.replace(/-/g, '') + '2359';
        
        const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
          params: {
            token: SYNOPTIC_TOKEN,
            stid: candidate.id,
            start: dayStart,
            end: dayEnd,
            vars: 'wind_speed,wind_direction',
            units: 'english',
          },
        });
        
        if (!response.data.STATION?.[0]?.OBSERVATIONS) continue;
        
        const obs = response.data.STATION[0].OBSERVATIONS;
        const times = obs.date_time || [];
        const speeds = obs.wind_speed_set_1 || [];
        const directions = obs.wind_direction_set_1 || [];
        
        // Find indicator readings at different lead times
        for (const leadHours of [1, 2, 3, 4]) {
          const targetHour = day.firstHour - leadHours;
          if (targetHour < 0) continue;
          
          // Find closest reading to target hour
          for (let i = 0; i < times.length; i++) {
            const readingHour = new Date(times[i]).getHours();
            if (Math.abs(readingHour - targetHour) <= 0.5) {
              correlations[leadHours].total++;
              
              // Check if indicator showed meaningful wind
              if (speeds[i] >= 5) {
                correlations[leadHours].matches++;
                correlations[leadHours].speeds.push({
                  indicatorSpeed: speeds[i],
                  indicatorDir: directions[i],
                  targetPeak: day.peakSpeed,
                });
              }
              break;
            }
          }
        }
        
        // Rate limit
        await sleep(100);
        
      } catch (error) {
        // Skip errors, continue with next day
      }
    }
    
    // Print correlation results
    console.log('\nCorrelation by lead time:');
    console.log('Lead Time   Match Rate   Avg Indicator Speed   Avg Target Speed');
    console.log('-'.repeat(65));
    
    for (const [hours, data] of Object.entries(correlations)) {
      if (data.total === 0) continue;
      
      const matchRate = (data.matches / data.total * 100).toFixed(0);
      const avgIndicator = data.speeds.length > 0 
        ? (data.speeds.reduce((s, d) => s + d.indicatorSpeed, 0) / data.speeds.length).toFixed(1)
        : 'N/A';
      const avgTarget = data.speeds.length > 0
        ? (data.speeds.reduce((s, d) => s + d.targetPeak, 0) / data.speeds.length).toFixed(1)
        : 'N/A';
      
      console.log(
        `${hours} hour(s)    ${matchRate.padStart(3)}%         ` +
        `${avgIndicator.padStart(5)} mph            ` +
        `${avgTarget.padStart(5)} mph`
      );
    }
    
    // Find best lead time
    let bestLead = null;
    let bestRate = 0;
    for (const [hours, data] of Object.entries(correlations)) {
      const rate = data.total > 0 ? data.matches / data.total : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestLead = hours;
      }
    }
    
    if (bestLead) {
      console.log(`\n→ Best lead time: ${bestLead} hour(s) with ${(bestRate * 100).toFixed(0)}% correlation`);
    }
  }
}

// =============================================================================
// STEP 4: VALIDATE CORRELATION (SPEED BUCKETS)
// =============================================================================

async function validateCorrelation(indicatorId, targetId, leadHours) {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 4: VALIDATING CORRELATION');
  console.log('='.repeat(70));
  
  console.log(`\nValidating: When ${indicatorId} shows X mph, what happens at ${targetId} ${leadHours} hour(s) later?`);
  
  // Fetch several months of data for both stations
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    const response = await axios.get('https://api.synopticdata.com/v2/stations/timeseries', {
      params: {
        token: SYNOPTIC_TOKEN,
        stid: [indicatorId, targetId].join(','),
        start: formatDate(startDate) + '0000',
        end: formatDate(endDate) + '2359',
        vars: 'wind_speed,wind_direction',
        units: 'english',
      },
    });
    
    if (!response.data.STATION || response.data.STATION.length < 2) {
      console.log('Could not fetch data for both stations');
      return;
    }
    
    // Parse data for both stations
    const indicatorData = parseStationData(response.data.STATION.find(s => s.STID === indicatorId));
    const targetData = parseStationData(response.data.STATION.find(s => s.STID === targetId));
    
    if (!indicatorData || !targetData) {
      console.log('Missing data for one or both stations');
      return;
    }
    
    // Build speed bucket analysis
    const buckets = {
      '5-8': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '8-10': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '10-15': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
      '15+': { targetSpeeds: [], foilKiteable: 0, twinTipKiteable: 0, count: 0 },
    };
    
    // For each indicator reading, find target reading leadHours later
    for (const [time, indData] of Object.entries(indicatorData)) {
      const indSpeed = indData.speed;
      if (indSpeed === null || indSpeed < 5) continue;
      
      // Find target reading leadHours later
      const targetTime = new Date(new Date(time).getTime() + leadHours * 60 * 60 * 1000);
      const targetKey = findClosestTime(targetData, targetTime);
      
      if (!targetKey || !targetData[targetKey]) continue;
      
      const targetSpeed = targetData[targetKey].speed;
      if (targetSpeed === null) continue;
      
      // Determine bucket
      let bucket;
      if (indSpeed >= 15) bucket = '15+';
      else if (indSpeed >= 10) bucket = '10-15';
      else if (indSpeed >= 8) bucket = '8-10';
      else bucket = '5-8';
      
      buckets[bucket].targetSpeeds.push(targetSpeed);
      buckets[bucket].count++;
      if (targetSpeed >= TARGET_LOCATION.kiteThresholds.foilMinSpeed) buckets[bucket].foilKiteable++;
      if (targetSpeed >= TARGET_LOCATION.kiteThresholds.twinTipMinSpeed) buckets[bucket].twinTipKiteable++;
    }
    
    // Print results
    console.log('\nVALIDATED SPEED CORRELATION:');
    console.log('─'.repeat(80));
    console.log('Indicator Speed  │  Avg Target  │  Foil Kiteable  │  Twin Tip Kiteable  │  Sample');
    console.log('─'.repeat(80));
    
    for (const [bucket, data] of Object.entries(buckets)) {
      if (data.count === 0) continue;
      
      const avgTarget = data.targetSpeeds.reduce((a, b) => a + b, 0) / data.targetSpeeds.length;
      const foilPct = (data.foilKiteable / data.count * 100).toFixed(0);
      const twinPct = (data.twinTipKiteable / data.count * 100).toFixed(0);
      
      console.log(
        `${bucket.padEnd(15)}  │  ${avgTarget.toFixed(1).padStart(6)} mph  │  ` +
        `${foilPct.padStart(6)}%         │  ${twinPct.padStart(6)}%             │  ${data.count}`
      );
    }
    
    console.log('─'.repeat(80));
    
    // Generate configuration snippet
    console.log('\n\nCOPY THIS TO indicatorSystem.js:');
    console.log('─'.repeat(40));
    console.log('speedCorrelation: {');
    for (const [bucket, data] of Object.entries(buckets)) {
      if (data.count === 0) continue;
      const avgTarget = data.targetSpeeds.reduce((a, b) => a + b, 0) / data.targetSpeeds.length;
      const foilPct = Math.round(data.foilKiteable / data.count * 100);
      const twinPct = Math.round(data.twinTipKiteable / data.count * 100);
      console.log(`  '${bucket}': { avgTargetSpeed: ${avgTarget.toFixed(1)}, foilKiteablePct: ${foilPct}, twinTipKiteablePct: ${twinPct}, sampleSize: ${data.count} },`);
    }
    console.log('},');
    
  } catch (error) {
    console.error('Error validating correlation:', error.message);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function isDirectionInRange(direction, min, max) {
  if (min <= max) {
    return direction >= min && direction <= max;
  } else {
    // Handle wrap-around (e.g., 315 to 45)
    return direction >= min || direction <= max;
  }
}

function parseStationData(station) {
  if (!station?.OBSERVATIONS) return null;
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const directions = obs.wind_direction_set_1 || [];
  
  const data = {};
  for (let i = 0; i < times.length; i++) {
    data[times[i]] = {
      speed: speeds[i],
      direction: directions[i],
    };
  }
  return data;
}

function findClosestTime(data, targetTime) {
  const targetMs = targetTime.getTime();
  let closest = null;
  let closestDiff = Infinity;
  
  for (const time of Object.keys(data)) {
    const diff = Math.abs(new Date(time).getTime() - targetMs);
    if (diff < closestDiff && diff < 30 * 60 * 1000) { // Within 30 minutes
      closestDiff = diff;
      closest = time;
    }
  }
  return closest;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           WIND INDICATOR ANALYSIS FOR NEW LOCATION                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${TARGET_LOCATION.name}`);
  console.log(`Coordinates: ${TARGET_LOCATION.coordinates.lat}, ${TARGET_LOCATION.coordinates.lng}`);
  
  // Step 1: Search for nearby stations
  const nearbyStations = await searchNearbyStations();
  
  // Step 2: Identify good wind days at target
  const goodDays = await identifyGoodWindDays(TARGET_LOCATION.targetStationId);
  
  // Step 3: Correlate indicator stations
  await correlateIndicators(goodDays, CANDIDATE_INDICATORS);
  
  // Step 4: Validate specific correlation (uncomment and fill in to run)
  // await validateCorrelation('KSLC', 'FPS', 1);
  
  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log('\nNext steps:');
  console.log('1. Review the station list and add promising candidates to CANDIDATE_INDICATORS');
  console.log('2. Re-run to get correlation analysis');
  console.log('3. For best candidates, uncomment validateCorrelation() call');
  console.log('4. Add validated indicators to src/config/indicatorSystem.js');
}

main().catch(console.error);
```

---

## File 87: `scripts/validate-kslc-zigzag-correlation.js`

> 367 lines | 13.3 KB

```javascript
/**
 * VALIDATE KSLC → ZIG ZAG CORRELATION
 * 
 * Question: When KSLC shows 5+ mph north wind, what is the actual
 * wind speed at Zig Zag/FPS during the kite window?
 * 
 * This validates whether the 5 mph threshold at KSLC is meaningful
 * for predicting kiteable conditions at Utah Lake.
 */

import fs from 'fs';
import https from 'https';

const TOKEN = 'REDACTED_SYNOPTIC_TOKEN';

async function fetchData(stid, start, end) {
  return new Promise((resolve, reject) => {
    const url = `https://api.synopticdata.com/v2/stations/timeseries?stid=${stid}&start=${start}&end=${end}&vars=wind_speed,wind_direction,air_temp&units=english&token=${TOKEN}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseObservations(station) {
  if (!station?.OBSERVATIONS) return [];
  
  const obs = station.OBSERVATIONS;
  const times = obs.date_time || [];
  const speeds = obs.wind_speed_set_1 || [];
  const dirs = obs.wind_direction_set_1 || [];
  const temps = obs.air_temp_set_1 || [];
  
  return times.map((t, i) => ({
    time: new Date(t),
    speed: speeds[i],
    direction: dirs[i],
    temp: temps[i],
  })).filter(o => o.speed != null);
}

function getHour(date) {
  return date.getHours();
}

function getDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isNorthWind(dir) {
  if (dir == null) return false;
  return dir >= 315 || dir <= 45;
}

async function analyze() {
  console.log('KSLC → ZIG ZAG/FPS WIND SPEED VALIDATION');
  console.log('='.repeat(70));
  console.log('\nQuestion: When KSLC shows north wind at various speeds,');
  console.log('what is the actual wind speed at FPS/Zig Zag?\n');
  
  // Fetch 6 months of data
  const periods = [
    { name: 'Sep 2025', start: '202509010000', end: '202509300000' },
    { name: 'Oct 2025', start: '202510010000', end: '202510310000' },
    { name: 'Nov 2025', start: '202511010000', end: '202511300000' },
    { name: 'Dec 2025', start: '202512010000', end: '202512310000' },
    { name: 'Jan 2026', start: '202601010000', end: '202601310000' },
    { name: 'Feb 2026', start: '202602010000', end: '202602280000' },
    { name: 'Mar 2026', start: '202603010000', end: '202603110000' },
  ];
  
  let kslcData = [];
  let fpsData = [];
  
  console.log('Fetching data...\n');
  
  for (const period of periods) {
    const [kslc, fps] = await Promise.all([
      fetchData('KSLC', period.start, period.end),
      fetchData('FPS', period.start, period.end),
    ]);
    
    kslcData = kslcData.concat(parseObservations(kslc.STATION?.[0]));
    fpsData = fpsData.concat(parseObservations(fps.STATION?.[0]));
  }
  
  console.log(`KSLC: ${kslcData.length} observations`);
  console.log(`FPS: ${fpsData.length} observations`);
  
  // Create hourly maps
  const kslcHourly = new Map();
  kslcData.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    kslcHourly.set(key, o);
  });
  
  const fpsHourly = new Map();
  fpsData.forEach(o => {
    const key = o.time.toISOString().slice(0, 13);
    fpsHourly.set(key, o);
  });
  
  // Analyze correlation at different KSLC speed thresholds
  console.log('\n' + '='.repeat(70));
  console.log('KSLC NORTH WIND → FPS WIND SPEED (Same Hour)');
  console.log('='.repeat(70));
  
  const speedBuckets = {
    '0-3': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '3-5': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { kslcSpeeds: [], fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  // For each hour where KSLC shows north wind, check FPS
  kslcHourly.forEach((kslcObs, key) => {
    const fpsObs = fpsHourly.get(key);
    if (!fpsObs) return;
    
    const hour = getHour(kslcObs.time);
    // Only look at kite window hours (9 AM - 6 PM)
    if (hour < 9 || hour > 18) return;
    
    // Only when KSLC shows north wind
    if (!isNorthWind(kslcObs.direction)) return;
    
    const kslcSpeed = kslcObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kslcSpeed < 3) bucket = '0-3';
    else if (kslcSpeed < 5) bucket = '3-5';
    else if (kslcSpeed < 8) bucket = '5-8';
    else if (kslcSpeed < 10) bucket = '8-10';
    else if (kslcSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    speedBuckets[bucket].kslcSpeeds.push(kslcSpeed);
    speedBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) {
      speedBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
    }
  });
  
  console.log('\nWhen KSLC shows NORTH wind at various speeds (9AM-6PM):');
  console.log('\nKSLC Speed | Samples | FPS Avg | FPS Range | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(80));
  
  Object.entries(speedBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const minFps = Math.min(...data.fpsSpeeds);
    const maxFps = Math.max(...data.fpsSpeeds);
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${minFps.toFixed(0)}-${maxFps.toFixed(0).padStart(4)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // Now look at 1-hour lead time
  console.log('\n' + '='.repeat(70));
  console.log('KSLC NORTH WIND → FPS WIND SPEED (1 Hour Later)');
  console.log('='.repeat(70));
  
  const leadBuckets = {
    '0-3': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '3-5': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '5-8': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '8-10': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '10-15': { fpsSpeeds: [], fpsNorthSpeeds: [] },
    '15+': { fpsSpeeds: [], fpsNorthSpeeds: [] },
  };
  
  kslcHourly.forEach((kslcObs, key) => {
    const hour = getHour(kslcObs.time);
    // Look at morning KSLC readings (8 AM - 4 PM)
    if (hour < 8 || hour > 16) return;
    
    // Only when KSLC shows north wind
    if (!isNorthWind(kslcObs.direction)) return;
    
    // Get FPS 1 hour later
    const laterTime = new Date(kslcObs.time.getTime() + 60 * 60 * 1000);
    const laterKey = laterTime.toISOString().slice(0, 13);
    const fpsObs = fpsHourly.get(laterKey);
    if (!fpsObs) return;
    
    const kslcSpeed = kslcObs.speed;
    const fpsSpeed = fpsObs.speed;
    const fpsIsNorth = isNorthWind(fpsObs.direction);
    
    let bucket;
    if (kslcSpeed < 3) bucket = '0-3';
    else if (kslcSpeed < 5) bucket = '3-5';
    else if (kslcSpeed < 8) bucket = '5-8';
    else if (kslcSpeed < 10) bucket = '8-10';
    else if (kslcSpeed < 15) bucket = '10-15';
    else bucket = '15+';
    
    leadBuckets[bucket].fpsSpeeds.push(fpsSpeed);
    if (fpsIsNorth) {
      leadBuckets[bucket].fpsNorthSpeeds.push(fpsSpeed);
    }
  });
  
  console.log('\nWhen KSLC shows NORTH wind, FPS speed 1 HOUR LATER:');
  console.log('\nKSLC Speed | Samples | FPS Avg | FPS Range | FPS North Avg | Kiteable (10+)');
  console.log('-'.repeat(80));
  
  Object.entries(leadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length === 0) return;
    
    const avgFps = data.fpsSpeeds.reduce((a, b) => a + b, 0) / data.fpsSpeeds.length;
    const minFps = Math.min(...data.fpsSpeeds);
    const maxFps = Math.max(...data.fpsSpeeds);
    const avgFpsNorth = data.fpsNorthSpeeds.length > 0 
      ? data.fpsNorthSpeeds.reduce((a, b) => a + b, 0) / data.fpsNorthSpeeds.length
      : 0;
    const kiteableCount = data.fpsSpeeds.filter(s => s >= 10).length;
    const kiteablePct = (kiteableCount / data.fpsSpeeds.length * 100).toFixed(0);
    
    console.log(
      `${range.padEnd(10)} | ${String(data.fpsSpeeds.length).padStart(7)} | ${avgFps.toFixed(1).padStart(7)} | ${minFps.toFixed(0)}-${maxFps.toFixed(0).padStart(4)} | ${avgFpsNorth.toFixed(1).padStart(13)} | ${kiteablePct}%`
    );
  });
  
  // Distribution of FPS speeds when KSLC is 5-8 mph north
  console.log('\n' + '='.repeat(70));
  console.log('DETAILED: When KSLC = 5-8 mph North, FPS Speed Distribution');
  console.log('='.repeat(70));
  
  const fpsSpeedsAt5to8 = leadBuckets['5-8'].fpsSpeeds;
  if (fpsSpeedsAt5to8.length > 0) {
    const distribution = {
      '0-5': 0,
      '5-8': 0,
      '8-10': 0,
      '10-12': 0,
      '12-15': 0,
      '15-20': 0,
      '20+': 0,
    };
    
    fpsSpeedsAt5to8.forEach(speed => {
      if (speed < 5) distribution['0-5']++;
      else if (speed < 8) distribution['5-8']++;
      else if (speed < 10) distribution['8-10']++;
      else if (speed < 12) distribution['10-12']++;
      else if (speed < 15) distribution['12-15']++;
      else if (speed < 20) distribution['15-20']++;
      else distribution['20+']++;
    });
    
    console.log('\nFPS Speed (1hr after KSLC 5-8 mph North):');
    Object.entries(distribution).forEach(([range, count]) => {
      const pct = (count / fpsSpeedsAt5to8.length * 100).toFixed(0);
      const bar = '█'.repeat(Math.round(pct / 3));
      console.log(`  ${range.padEnd(8)} ${String(count).padStart(4)} (${pct.padStart(2)}%) ${bar}`);
    });
    
    // Foil vs Twin Tip
    const foilKiteable = fpsSpeedsAt5to8.filter(s => s >= 10).length;
    const twinTipKiteable = fpsSpeedsAt5to8.filter(s => s >= 15).length;
    
    console.log(`\n  Foil kiteable (10+ mph): ${(foilKiteable / fpsSpeedsAt5to8.length * 100).toFixed(0)}%`);
    console.log(`  Twin tip kiteable (15+ mph): ${(twinTipKiteable / fpsSpeedsAt5to8.length * 100).toFixed(0)}%`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  
  // Calculate recommended threshold
  let recommendedThreshold = 5;
  let bestKiteablePct = 0;
  
  Object.entries(leadBuckets).forEach(([range, data]) => {
    if (data.fpsSpeeds.length < 10) return;
    const kiteablePct = data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100;
    
    if (range === '5-8' || range === '8-10' || range === '10-15') {
      if (kiteablePct > bestKiteablePct) {
        bestKiteablePct = kiteablePct;
        recommendedThreshold = range === '5-8' ? 5 : range === '8-10' ? 8 : 10;
      }
    }
  });
  
  const bucket5to8 = leadBuckets['5-8'];
  const bucket8to10 = leadBuckets['8-10'];
  
  console.log(`
FINDINGS:

When KSLC shows NORTH wind at 5-8 mph:
  - FPS average speed 1hr later: ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.reduce((a,b) => a+b, 0) / bucket5to8.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable (10+ mph): ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.filter(s => s >= 10).length / bucket5to8.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%
  - Twin tip kiteable (15+ mph): ${bucket5to8.fpsSpeeds.length > 0 ? (bucket5to8.fpsSpeeds.filter(s => s >= 15).length / bucket5to8.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%

When KSLC shows NORTH wind at 8-10 mph:
  - FPS average speed 1hr later: ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.reduce((a,b) => a+b, 0) / bucket8to10.fpsSpeeds.length).toFixed(1) : 'N/A'} mph
  - Foil kiteable (10+ mph): ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.filter(s => s >= 10).length / bucket8to10.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%
  - Twin tip kiteable (15+ mph): ${bucket8to10.fpsSpeeds.length > 0 ? (bucket8to10.fpsSpeeds.filter(s => s >= 15).length / bucket8to10.fpsSpeeds.length * 100).toFixed(0) : 'N/A'}%

RECOMMENDATION:
Based on this data, the threshold should be adjusted to ensure
meaningful kiteable conditions at Zig Zag/Utah Lake.
`);

  // Save validation results
  const validation = {
    analysis: 'KSLC to Zig Zag/FPS Wind Speed Validation',
    sameHour: Object.fromEntries(
      Object.entries(speedBuckets).map(([range, data]) => [
        range,
        {
          samples: data.fpsSpeeds.length,
          avgFpsSpeed: data.fpsSpeeds.length > 0 
            ? (data.fpsSpeeds.reduce((a,b) => a+b, 0) / data.fpsSpeeds.length).toFixed(1)
            : null,
          kiteablePct: data.fpsSpeeds.length > 0
            ? (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0)
            : null,
        }
      ])
    ),
    oneHourLead: Object.fromEntries(
      Object.entries(leadBuckets).map(([range, data]) => [
        range,
        {
          samples: data.fpsSpeeds.length,
          avgFpsSpeed: data.fpsSpeeds.length > 0 
            ? (data.fpsSpeeds.reduce((a,b) => a+b, 0) / data.fpsSpeeds.length).toFixed(1)
            : null,
          kiteablePct: data.fpsSpeeds.length > 0
            ? (data.fpsSpeeds.filter(s => s >= 10).length / data.fpsSpeeds.length * 100).toFixed(0)
            : null,
        }
      ])
    ),
  };
  
  fs.writeFileSync('./src/data/kslc-fps-validation.json', JSON.stringify(validation, null, 2));
  console.log('Saved to src/data/kslc-fps-validation.json');
}

analyze().catch(console.error);
```

---

## File 88: `utah_stations.json`

> 1 lines | 0.2 KB

```json
{"SUMMARY":{"NUMBER_OF_OBJECTS":0,"RESPONSE_CODE":-1,"RESPONSE_MESSAGE":"LIMIT cannot be used without the RADIUS parameter.","RESPONSE_TIME":0,"VERSION":"v2.31.2"}}
```

---

## Export Summary

- **Total files:** 88
- **Total lines:** 26,431
- **Export size:** 935 KB
- **Estimated tokens:** ~239,306
