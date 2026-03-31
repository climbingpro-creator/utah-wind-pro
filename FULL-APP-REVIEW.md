# UtahWind Monorepo — Full Architecture & Code Review

**Generated:** 2026-03-30
**Purpose:** Comprehensive review for evaluation, hole-checking, and AI-assisted audit.

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [apps/wind — Wind & Kite Forecast App](#2-appswind)
3. [apps/water — Fishing & Flatwater App](#3-appswater)
4. [Shared Packages](#4-shared-packages)
5. [API / Serverless Routes](#5-api-serverless-routes)
6. [Infrastructure & Deployment](#6-infrastructure--deployment)
7. [Security Audit](#7-security-audit)
8. [Known Gaps & Recommendations](#8-known-gaps--recommendations)

---

## 1. Monorepo Structure

```
utahwind-monorepo/
├── apps/
│   ├── wind/          — Vite + React 19 PWA (utahwindfinder.com)
│   └── water/         — Vite + React 19 SPA (utah-water-glass.vercel.app)
├── packages/
│   ├── weather/       — Core weather engine, forecasts, ML, aquatic intelligence (~15,600 LOC)
│   ├── ui/            — Shared React UI components (~525 LOC)
│   ├── ml/            — XGBoost inference engine (~255 LOC)
│   ├── database/      — Supabase client singleton (~13 LOC)
│   └── config/        — Shared ESLint flat config (~87 LOC)
├── api/               — Vercel serverless functions (~7,500+ LOC across 25+ routes)
├── garmin/            — Connect IQ watch app (Monkey C)
├── turbo.json         — Turborepo task config
├── vercel.json        — Root Vercel deployment config (wind app)
└── package.json       — Root workspace with Turbo, Stripe, Supabase, QStash, web-push deps
```

**Build System:** Turborepo with npm workspaces
**Frontend:** Vite 7 + React 19 + Tailwind CSS v4
**Backend:** Vercel Serverless Functions (Node.js ESM)
**Database:** Supabase (Postgres + Auth + Storage) + Upstash Redis (cache/state)
**AI/ML:** Google Gemini 2.5 Flash Lite (biology), custom XGBoost (wind prediction)
**Payments:** Stripe (Pro tier)
**Push:** Web Push (VAPID), optional Twilio SMS

---

## 2. apps/wind

**Deployment:** utah-wind-pro.vercel.app / utahwindfinder.com
**Bundle:** Code-split via React.lazy + Vite manual chunks (vendor-map, vendor-icons)
**Mobile:** Capacitor (iOS/Android), PWA with Workbox service worker

### Entry Flow
```
main.jsx → App.jsx → AuthProvider → ThemeProvider → Dashboard.jsx
```

### Key Components (~40 components, ~12,000 LOC)

| Component | Lines | Role |
|-----------|-------|------|
| `Dashboard.jsx` | 745 | Main shell: weather hooks, lake/activity UX, progressive disclosure, lazy-loaded templates |
| `LakeSelector.jsx` | 1225 | Lake/region/launch selection + geography metadata |
| `ParaglidingMode.jsx` | 868 | Paragliding scoring, site profiles, launch conditions |
| `WindMap.jsx` | 715 | Leaflet map: interpolated wind field, SurfacePhysics, pin-drop forecast |
| `TodayHero.jsx` | 588 | Hero summary: wind verdict, thermals, boating, activity selection, scout banner |
| `TodayTimeline.jsx` | 490 | Intraday timeline for conditions |
| `DetailedPanels.jsx` | 509 | Deep technical panels (behind progressive disclosure toggle) |
| `SpotRanker.jsx` | 502 | Ranks all spots with physics-adjusted wind, physicsReasons display |
| `WindSeekerTemplate.jsx` | 296 | Kiting/wind-seeking layout template |
| `WinterRiderTemplate.jsx` | 255 | Snowkite layout template |
| `FishingMode` / `WaterForecast` | 338 | Water-oriented forecast (shared component) |
| `map/SyntheticForecastCard.jsx` | 143 | Floating pin-drop forecast card (IDW interpolation) |
| `map/PinDropListener.jsx` | 15 | Leaflet click event listener |

### Key Services (~12 services, ~6,000 LOC)

| Service | Lines | Role |
|---------|-------|------|
| `UnifiedPredictor.js` | 1327 | Central prediction orchestration (all activities) |
| `DataCollector.js` | 932 | Background ingestion/learning loop tied to weather APIs |
| `WindEventPredictor.js` | 804 | Synoptic wind event prediction |
| `MorningBriefing.js` | 662 | Generates narrative morning briefings |
| `ParaglidingPredictor.js` | 485 | Paragliding-specific predictions |
| `WindIntelligence.js` | 486 | Regime synthesis and suitability scoring |
| `MultiDayForecast.js` | 424 | Multi-day statistics and best-day identification |
| `SnowkitePredictor.js` | 402 | Snowkite prediction + outlook |
| `WaterSafetyService.js` | 386 | Glass/upstream safety analysis |
| `SmartForecastEngine.js` | 348 | Activity-aware smart forecast |
| `ActivityScoring.js` | 314 | Per-activity session scoring |
| `BoatingPredictor.js` | 176 | Boating/glass prediction |

### Config & Data
- `indicatorSystem.js` (536 lines) — Station/indicator definitions per launch
- `snowkiteModel.json` (2384 lines) — Static snowkite model parameters
- `historicalSpotData.json` (803 lines) — Historical spot stats
- `trainedWeights-*.json` — Learned ML weights (paragliding, boating)

### Tests
- `WindEventPredictor.test.js`, `WindIntelligence.test.js`, `MorningBriefing.test.js`, `BoatingPredictor.test.js`
- Utils: `fetchWithRetry.test.js`, `paraglidingScore.test.js`, `platform.test.js`, `safeToFixed.test.js`, `themeClasses.test.js`, `wind.test.js`

---

## 3. apps/water

**Deployment:** utah-water-glass.vercel.app
**Bundle:** Code-split via React.lazy (FishingMode, FlatwaterTemplate, WaterMap)

### Entry Flow
```
main.jsx → App.jsx → ThemeProvider → LocationSelector + WaterMap + FishingMode/FlatwaterTemplate
```

### Key Components (~6 components, ~3,300 LOC)

| Component | Lines | Role |
|-----------|-------|------|
| `App.jsx` | 487 | Main shell: location, activity mode, weather data, lazy-loaded templates |
| `FishingMode.jsx` | 2071 | Full fishing experience: per-location encyclopedia, USGS temps, fly/lure picks |
| `WaterForecast.jsx` | 343 | Hourly glass timeline, window cards, upstream warnings |
| `FlatwaterTemplate.jsx` | 184 | Boating/paddling template |
| `map/WaterMap.jsx` | 131 | Leaflet map (Esri Topo tiles), pin-drop → generateFisheryProfile |
| `map/SyntheticFishingCard.jsx` | 484 | Rich fishing intel card: species, forage profile, pelagic calendar, visual intel, USGS telemetry |
| `LocationSelector.jsx` | 62 | Horizontal location chip selector |

### Key Services (~6 services, ~2,100 LOC)

| Service | Lines | Role |
|---------|-------|------|
| `LureRecommender.js` | 637 | Lure catalog, colors, trolling/shore strategy, daily lure picks |
| `USGSWaterService.js` | 407 | USGS NWIS temps/flows, seasonal lake models, caching |
| `FlyRecommender.js` | 404 | Sky-parsing, ecosystem-aware fly recommendations |
| `FishingPredictor.js` | 327 | ML fishing quality: moon, solunar, pressure scoring |
| `WaterSafetyService.js` | 182 | Glass forecast, upstream warnings, pressure analysis |
| `BoatingPredictor.js` | 176 | Glass/calm scoring from trained weights |

### Config
- `aquaticEcosystems.js` (166 lines) — Biological profiles per location
- `trainedWeights-boating.json` / `trainedWeights-fishing.json` — Learned ML weights
- `spotSlugs.js` (63 lines) — Spot-to-URL slug map (possibly unused)

### Vercel Config
- `vercel.json` — Proxies `/api/biology` to `utah-wind-pro.vercel.app`, SPA catch-all
- `vite.config.js` — Dev proxy for `/api/biology`, `__BUILD_TIME__` cache buster

---

## 4. Shared Packages

### @utahwind/weather (~15,600 LOC — the core engine)

| File | Lines | Role |
|------|-------|------|
| `AquaticIntelligenceEngine.js` | 952 | Water body detection, USGS integration, marine telemetry, Gemini bio profiles, IDW fishery profiles |
| `LearningSystem.js` | 2033 | Adaptive learning: weight adjustment, historical window validation, Triple Validation |
| `ThermalPredictor.js` | 1784 | Thermal prediction: pressure gaps, coupling multipliers, direction analysis |
| `ForecastService.js` | 776 | NWS forecast pipeline, hourly/7-day, alerts, kite windows |
| `DataNormalizer.js` | 803 | LakeState class, probability calculations |
| `stationRegistry.js` | 672 | Station definitions: 60+ weather stations with roles/coordinates |
| `ThermalPropagation.js` | 639 | Station-chain propagation analysis and historical validation |
| `WindFieldEngine.js` | 581 | Wind field generation, station graph, propagation edges |
| `SportIntelligenceEngine.js` | 478 | Optimal time windows: kiting, boating, paragliding, snowkiting, sailing |
| `CorrelationEngine.js` | 350 | Cross-station wind correlation and trigger analysis |
| `WeatherService.js` | 328 | Multi-source weather data orchestration (Synoptic, Ambient, NWS) |
| `SpatialInterpolator.js` | 263 | IDW algorithm: Haversine, wind vector math, spatial interpolation |
| `SurfacePhysics.js` | 259 | Fluid dynamics: fetch acceleration, Venturi funneling, thermal decoupling |
| `useWeatherStore.js` | 229 | Zustand store + React hooks |
| `NowcastEngine.js` | 195 | Live correction overlay engine |
| `SessionValidation.js` | 157 | Session service for recording/validating sessions |

**Lake Configs** (8 files, ~2,700 LOC): utahLake, strawberry, deerCreek, willardBay, northernUtah, centralUtah, southernUtah, wasatchBack, saltLakeArea, other

### @utahwind/ui (~525 LOC)

| Export | Lines | Role |
|--------|-------|------|
| `Modal` | 75 | Dialog shell component |
| `ErrorBoundary` / `SafeComponent` | 59 | Error boundary with graceful fallback |
| `IntelligentRecommendations` | 205 | Sport-colored optimal window cards with cross-app routing |
| `Sparkline` | 93 | Mini chart/sparkline component |
| `ModuleLoader` | 53 | Loading placeholder (card/inline variants) |
| `FactorBar` | 32 | Compact label/value/detail row |

### @utahwind/ml (~255 LOC)

| Export | Role |
|--------|------|
| `WindPredictor` | Pure-JS XGBoost tree walk: `loadModel`, `predictForecast`, `correctHourlyForecast` |
| `getModelPath` | Returns path to `xgboost_model.json` |

**Note:** Uses Node `fs/promises` — server-side only for file-based model loading.

### @utahwind/database (~13 LOC)

Single `supabase` export — Supabase client from `import.meta.env` variables (Vite-oriented). Returns `null` with warning if env vars missing.

### @utahwind/config (~87 LOC)

Shared ESLint flat config: browser React rules + dedicated blocks for service workers, API routes, and scripts.

---

## 5. API / Serverless Routes

### Public APIs (No Auth Required)

| Route | File | Lines | Purpose | External APIs |
|-------|------|-------|---------|---------------|
| `GET /api/biology` | `biology.js` | 138 | Gemini-powered biological/angling profiles + multimodal satellite analysis | Google Gemini |
| `GET /api/weather` | `weather.js` | 345 | Multi-source weather proxy (Ambient, Synoptic, NWS, UDOT, WU) | Multiple |
| `GET /api/current-conditions` | `current-conditions.js` | 163 | Fused lake conditions for web/mobile/watch | Synoptic, NWS, UDOT, Ambient |
| `GET /api/garmin` | `garmin.js` | 285 | Compact wind/intelligence JSON for Connect IQ watch | Synoptic, UDOT, Ambient |
| `GET /api/thermal-forecast` | `thermal-forecast.js` | 265 | Thermal/glass/gradient forecast (optional Pro upgrade via JWT) | Synoptic, UDOT |
| `GET /api/topo-warning` | `topo-warning.js` | 85 | Geofence danger zone warnings for Garmin | None |
| `GET /api/day/:spot/:date` | `day/[spot]/[date].js` | 607 | Server-rendered session day leaderboard HTML | Supabase |
| `GET /api/year/:spot/:year` | `year/[spot]/[year].js` | 278 | Server-rendered yearly leaderboard HTML | Supabase |
| `GET /api/session/:id` | `session/[id].js` | 265 | Server-rendered session review HTML | Supabase |
| `GET /api/cron/collect` | `cron/collect.js` | 362 | Public read-only API over Redis (context, weights, predictions) | Upstash Redis |

### Authenticated APIs

| Route | File | Lines | Auth | Purpose |
|-------|------|-------|------|---------|
| `POST /api/push-subscribe` | `push-subscribe.js` | 54 | JWT | Save/delete web push subscriptions |
| `GET/POST /api/user-preferences` | `user-preferences.js` | 107 | JWT | Get/upsert user preferences + tier |
| `POST /api/subscribe` | `subscribe.js` | 87 | JWT | Stripe checkout / billing portal |
| `POST /api/garmin-link` | `garmin-link.js` | 85 | JWT | Link/unlink Garmin device |
| `POST /api/webhooks/stripe` | `webhooks/stripe.js` | 98 | Stripe signature | Webhook: subscription events |

### Unauthenticated Write APIs (Security Concern)

| Route | File | Lines | Issue |
|-------|------|-------|-------|
| `POST /api/emergency-location` | `emergency-location.js` | 73 | **No auth** — SMS spam / bill shock, fake alerts, PII storage |
| `POST /api/session-upload` | `session-upload.js` | 133 | **No auth** — spoofed sessions via known device_id |
| `POST /api/session/:id/catch` | `session/[id]/catch.js` | 83 | **No auth** — anyone with session UUID can add catches/uploads |
| `POST /api/session/:id/edit` | `session/[id]/edit.js` | 50 | **No auth** — session tampering/defacement |
| `POST /api/session/:id/photo` | `session/[id]/photo.js` | 84 | **No auth** — upload abuse, storage cost |

### Internal Pipeline (Cron / QStash)

| Route | File | Lines | Auth | Purpose |
|-------|------|-------|------|---------|
| `GET /api/cron/1-ingest` | `cron/1-ingest.js` | 273 | CRON_SECRET or x-vercel-cron | Stage 1: Multi-source data ingestion → Redis |
| `POST /api/internal/2-process-models` | `internal/2-process-models.js` | 206 | QStash signature or INTERNAL_API_KEY | Stage 2: Propagation, learning, window validation |
| `POST /api/internal/3-dispatch-alerts` | `internal/3-dispatch-alerts.js` | 242 | QStash signature or INTERNAL_API_KEY | Stage 3: Alert evaluation + web push |
| `GET /api/cron/push-check` | `cron/push-check.js` | 201 | Bearer CRON_SECRET | Legacy push check |
| `GET /api/internal/admin` | `internal/admin.js` | 101 | Bearer CRON_SECRET | Admin backfill/model build |

### Shared Libraries (api/lib/)

| File | Lines | Role |
|------|-------|------|
| `serverLearning.js` | 1921 | Server-side learning loop, weights, backfill |
| `historicalAnalysis.js` | 847 | Statistical model build/refresh in Redis |
| `serverPropagation.js` | 825 | Propagation analysis, PWS backfill |
| `weather.js` | 345 | Weather source proxy logic |
| `stations.js` | 312 | Lake/station config maps |
| `nwsForecast.js` | 264 | NWS gridpoint forecast caching |
| `nwsAdapter.js` | 142 | NWS API fetch helpers |
| `udotAdapter.js` | 123 | UDOT RWIS station fetches |
| `redis.js` | 117 | Upstash Redis helpers + rate limiting |
| `qstash.js` | 89 | Pipeline stage trigger via QStash |
| `supabase.js` | 35 | Supabase service-role client + JWT verification |

---

## 6. Infrastructure & Deployment

### Vercel Projects
| Project | Domain | Root Dir | API Routes |
|---------|--------|----------|------------|
| utah-wind-pro | utahwindfinder.com | `/` (monorepo root) | All `/api/*` routes |
| utah-water-glass | utah-water-glass.vercel.app | `apps/water` | Proxy: `/api/biology` → wind app |

### Environment Variables Required

**Root / Wind App (utah-wind-pro):**
- `SYNOPTIC_TOKEN` — MesoWest/Synoptic Data API
- `AMBIENT_API_KEY`, `AMBIENT_APP_KEY` — Ambient Weather
- `UDOT_API_KEY` — Utah DOT road weather
- `WU_API_KEY` — Weather Underground
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Redis cache
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` — Pipeline
- `CRON_SECRET`, `INTERNAL_API_KEY` — Cron/internal auth
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Database (server-side)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Database (client-side)
- `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` — Payments
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — Web Push
- `GEMINI_API_KEY` — Google Gemini (biology agent)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — SMS (optional)
- `EMERGENCY_CONTACT_NUMBERS` — Emergency SMS targets

**Water App (utah-water-glass):**
- `VITE_SYNOPTIC_TOKEN` — MesoWest (client-side)
- `VITE_AMBIENT_API_KEY`, `VITE_AMBIENT_APP_KEY` — Ambient (client-side)
- `VITE_WIND_APP_URL` — Cross-app routing
- `VITE_API_ORIGIN` — API origin for biology proxy

### Cron Schedule
- `/api/cron/1-ingest` — Every 15 minutes (`*/15 * * * *`)
- Pipeline: Stage 1 → QStash → Stage 2 → QStash → Stage 3

### Turborepo Config
- Build inputs: `src/**`, `index.js`, `index.html`, `vite.config.*`, `package.json`, `../../packages/**`
- Build outputs: `dist/**`
- Dev: cache disabled, persistent

---

## 7. Security Audit

### Critical Issues

1. **Unauthenticated Session Write APIs** — `/api/session/:id/edit`, `/api/session/:id/catch`, `/api/session/:id/photo`, `/api/session-upload` accept writes with NO authentication. Anyone with a session UUID or device_id can modify data, upload files, or create fake sessions. **Recommendation:** Add JWT or signed-URL verification.

2. **Emergency Location — No Auth + SMS** — `/api/emergency-location` accepts POST with no auth, triggers Twilio SMS. Risk: SMS bill shock, fake emergency alerts, PII storage. **Recommendation:** Require device JWT or rate-limit per IP.

3. **SSRF via imageUrl** — `/api/biology?imageUrl=...` causes server-side fetch to arbitrary URLs. An attacker could probe internal networks or cause the server to fetch malicious content. **Recommendation:** Validate URL against allowlist (only Esri tile URLs).

4. **Service Role Key Exposure Surface** — `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Used in 10+ API routes. Any missing auth check in these routes exposes full database access. **Recommendation:** Audit each route for proper `verifyAuth()` usage.

### Medium Issues

5. **`/api/cron/collect` Exposes Internal State** — Publicly readable without auth: ML weights, predictions, propagation analysis, NWS cache. While not directly exploitable, this is intellectual property leakage. **Recommendation:** Add read-only API key or move to authenticated endpoint.

6. **Hardcoded Ambient Weather MAC Address** — `api/weather.js` contains a hardcoded device MAC address. Minor privacy/enumeration concern. **Recommendation:** Move to environment variable.

7. **CORS `Access-Control-Allow-Origin: *`** — Set on nearly all APIs. Acceptable for public read APIs but concerning on write endpoints (session edit, emergency). **Recommendation:** Restrict CORS on write endpoints to known origins.

8. **Client-Side API Keys** — `VITE_SYNOPTIC_TOKEN` and `VITE_AMBIENT_*` are exposed in the browser bundle. These are weather data keys (not billing keys), but could be abused for rate limit exhaustion. **Recommendation:** Proxy all weather calls through `/api/weather` serverless route.

### Low Issues

9. **Empty Data File** — `apps/wind/src/data/utah-lakes-research.json` is 0 bytes. Dead code.
10. **Unused Dependency** — `@utahwind/database` declared in water app's `package.json` but never imported.
11. **Maintenance Scripts in Source** — `apps/water/src/_*.mjs` files are one-off developer utilities with hardcoded Windows paths. Should be in a `scripts/` directory or removed.
12. **`spotSlugs.js` in water app** — Appears unused (no imports found).

---

## 8. Known Gaps & Recommendations

### Architecture

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No end-to-end tests | Medium | Add Playwright or Cypress tests for critical flows (pin drop, species display, weather loading) |
| No API integration tests | Medium | Add test suite that validates all `/api/*` routes return expected shapes |
| No TypeScript | Low | Codebase is all JavaScript. TypeScript migration would catch many bugs at compile time |
| `FishingMode.jsx` is 2,071 lines | Low | Break into sub-components (location encyclopedia, USGS panel, fly/lure picker) |
| `LakeSelector.jsx` is 1,225 lines | Low | Extract geography metadata into config files |
| `UnifiedPredictor.js` is 1,327 lines | Low | Split into per-activity prediction modules |
| `LearningSystem.js` is 2,033 lines | Medium | Split server-side and client-side learning logic |

### Data Integrity

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No input validation on `/api/biology` coordinates | Medium | Validate lat/lng ranges before passing to Gemini |
| USGS API has no circuit breaker | Low | Add fallback timeout and retry logic to prevent cascading failures |
| Gemini fallback returns generic data without flagging it clearly in UI | Low | Add visual indicator when showing fallback vs. live Gemini data |
| `trainedWeights.json` files have no versioning | Low | Add version field and migration logic |

### Performance

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No CDN-level caching strategy for biology API | Medium | Current: 24h s-maxage. Consider shorter TTL with stale-while-revalidate for fresher data |
| Weather polling in water app fires many parallel requests | Low | Batch/debounce API calls |
| No image optimization pipeline | Low | Satellite tile images served directly from Esri — consider caching proxy |

### Mobile / PWA

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| Service worker may cache stale API responses | Medium | Verify NetworkFirst strategy covers all API patterns |
| Capacitor configs reference production URLs | Low | Ensure dev config is never accidentally deployed |
| No offline mode for pin-drop map | Low | Cache last-used map tiles for offline map viewing |

### Cross-App

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| Biology API proxy relies on single hardcoded URL | Low | Make proxy destination configurable via env var in water app's `vercel.json` |
| No shared authentication between wind and water apps | Medium | If user accounts expand to water app, need shared auth strategy |
| `IntelligentRecommendations` cross-app links use different env vars per app | Low | Standardize cross-app URL configuration |

---

## Appendix: Line Count Summary

| Module | Approximate LOC |
|--------|----------------|
| `apps/wind/src/` | ~14,000 |
| `apps/water/src/` | ~5,800 |
| `packages/weather/src/` | ~15,600 |
| `packages/ui/src/` | ~525 |
| `packages/ml/src/` | ~255 |
| `packages/database/src/` | ~13 |
| `packages/config/` | ~87 |
| `api/` (routes + libs) | ~7,500 |
| `garmin/` | ~5,000+ (Monkey C, not audited) |
| **Total JavaScript/JSX** | **~43,800** |
