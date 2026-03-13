# Model Validation Audit

This audit summarizes which parts of the prediction system are grounded in checked-in historical analysis, which parts are proxy-based, and which areas still need direct validation.

## Trusted historical artifacts

### 1. Zig Zag 3-year baseline
- Source artifact: `src/data/zigzag-historical.json`
- Generated from: `scripts/analyze-zigzag-history.js`
- Time span: `2023-03-29` to `2026-03-12`
- Scope:
  - seasonal hit rates
  - hourly SE thermal timing
  - north-flow timing
  - day-before setup
  - multi-day pressure trends
- Runtime dependency:
  - `src/services/MultiDayForecast.js`

### 2. North-flow validation
- Source artifact: `src/data/kslc-fps-validation.json`
- Generated from: `scripts/validate-kslc-zigzag-correlation.js`
- Time span: Sep 2025 to Mar 2026
- Validated relationship:
  - `KSLC -> FPS/Zig Zag`, 1 hour lead
- Trust level: high

### 3. Spanish Fork thermal precursor
- Source artifact: `src/data/spanish-fork-correlation.json`
- Generated from:
  - `scripts/analyze-spanish-fork-correlation.js`
  - `scripts/analyze-spanish-fork-deep.js`
- Time span in checked-in artifact: Jun-Aug 2025
- Validated relationship:
  - `QSF -> FPS/Zig Zag`, ~2 hour lead
- Trust level: medium-high
- Caveat:
  - docs describe this as a 3-year conclusion, but the checked-in dataset is a narrower validated sample

### 4. Southern-launch and PotM north-flow proxies
- Source artifact: `src/data/provo-utalp-correlation.json`
- Generated from: `scripts/analyze-provo-lincoln-sandy.js`
- Time span: Sep 2025 to Mar 2026
- Validated relationships:
  - `KPVU -> FPS proxy`, 1 hour lead
  - `UTALP -> FPS proxy`, 0.5 to 1 hour lead
- Trust level: medium
- Caveat:
  - still proxy-based against `FPS`, not direct launch sensors for Lincoln or Sandy

## Runtime model behavior

The live system currently behaves as a layered heuristic model:

1. `WeatherService` fetches Ambient and Synoptic observations.
2. `DataNormalizer` builds a normalized `LakeState`.
3. `ThermalPredictor` applies launch-aware timing and precursor heuristics.
4. `NearTermWindModel` blends:
   - current target-station wind
   - recent target-station history
   - hourly NWS forecast
   - validated precursor boosts
5. activity scoring converts that modeled wind into:
   - kiting / sailing / windsurfing score
   - glass / calm score
   - paragliding flyability
   - fishing outlook

## What this branch improves

This branch adds a more durable runtime path for historical logic:

- target station is resolved per activity and launch instead of defaulting to a generic current wind
- precursor indicators are resolved from the validated indicator catalog per launch
- additional north-flow reference stations are fetched and tracked for Utah Lake:
  - `FPN`
  - `SLCNW`
  - `KTVY`
- the near-term model can now use indicator evaluations generically instead of relying only on hard-coded one-off branches

## Activity-by-activity confidence

### Kiting / windsurfing
- strongest validation in repo
- especially strong for Utah Lake launches and Deer Creek
- still needs:
  - direct southern-launch validation beyond the `FPS` proxy
  - Willard and Pineview validation

### Sailing
- good UI and race-day interpretation
- weak direct historical validation
- currently benefits from better target-station history in this branch

### Boating / paddling
- largely heuristic
- value comes from accurate short-horizon calm-window timing
- this branch improves target-station and precursor-aware near-term calm projections
- still needs direct calm-water validation

### Paragliding
- station-aware and now near-term predictive
- still lacks a dedicated historical flyability dataset
- north-side decisions are still limited by station representativeness

### Fishing
- largely expert-system scoring
- this branch improves timing by using location-specific forecast wind
- still lacks direct outcome validation from catch or trip logs

## Additional stations traced for future validation

These are now tracked as useful precursor references, not fully promoted as primary validated indicators:

| Station | Role | Why it matters |
|--------|------|----------------|
| `FPN` | Flight Park North | likely early north-flow signal for Utah Lake north/central launches |
| `SLCNW` | Salt Lake City North Field | alternate airport north-flow confirmation |
| `KTVY` | Tooele Valley Airport | Great Salt Lake outflow / frontal precursor |

These should be promoted only after direct speed-bucket validation against launch targets.

## Long-term viability recommendations

1. Keep one canonical indicator registry and use it in runtime, docs, and analysis outputs.
2. Preserve raw historical datasets or export reproducible summary bundles alongside derived JSON.
3. Track forecast vs actual by launch and by activity, not only by lake.
4. Validate calm-water activities directly instead of relying on inverse kite logic.
5. Promote exploratory stations only after bucketed lead-time validation.

## Validation gaps still open

- Willard Bay direct indicator validation
- Pineview direct indicator validation
- launch-specific southern Utah Lake target validation
- paragliding-specific historical flyability validation
- boating/paddling calm-window validation
- fishing outcome validation

Last updated: March 2026
