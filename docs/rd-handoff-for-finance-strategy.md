# R&D evidence handoff — Finance strategy

**Prepared:** 2026-10-10  
**Prepared for:** Tyler Lyon household tax planning (CPA aid). This memo is an evidence index. It is not a Form 6765, not a credit claim, and not a legal conclusion that any cost is a qualified research expense under IRC §41.  
**Scanner scope:** this Project only (`utahwind-monorepo` / GitHub `utah-wind-pro`). Sources used: git history, GitHub repo metadata and PRs, tracked docs and model artifacts, one untracked validation report on disk, and Cursor agent transcripts under this Project.  
**Not found:** wage records, contractor invoices, timesheets, or any hour log. `.cursor/session-context.md` exists and was readable on a direct read (a workspace glob missed it). It records product sessions, including the 2026-08-15 note that the Meta ads kit was parked. It contains no hours.

This Project is software and process experimentation (wind and water prediction), plus a large amount of ordinary product, UI, and ops work. It is not a bookkeeping or finance-ops Project.

---

## Project identity

| Field | Evidence |
|---|---|
| Local Project | `c:\Users\Admin\Documents\GitHub\utahwind-monorepo` |
| GitHub | https://github.com/climbingpro-creator/utah-wind-pro |
| Default branch | `master`, tracking `origin/master`, HEAD `2a6338c` |
| GitHub `createdAt` | `2026-03-12T05:02:57Z` (`gh repo view`) |
| GitHub description | “Self-learning wind prediction app for kiteboarding in Utah - Utah Lake, Deer Creek, Willard Bay” |
| Homepage on GitHub | https://utah-wind-pro.vercel.app |
| npm package name | `utahwindfinder` (`package.json`) |
| Product names in tree | Utah Wind Pro, Utah Wind Finder, LiftForecast (`liftforecast.com`), NotWindy (`notwindy.com`) |
| Privacy contact | `tyler@aspenearth.com` (`apps/wind/public/privacy.html`, `apps/water/public/privacy.html`) |

**Business purpose.** The product answers a local go / no-go question that generic forecasts do not: whether wind at a specific Utah launch or water will be usable, when it will arrive, and which upstream station says so. `README.md` describes “Professional wind forecasting for Utah's best water sports locations” (kiting, sailing, boating, paddling) using NWS, Weather Underground, UDOT, Ambient, Open-Meteo, and Tempest, with a “self-learning prediction system.” Terms (`apps/wind/public/terms.html` and `apps/water/public/terms.html`, last updated March 31, 2026) split the later brands: “LiftForecast is a wind sports weather intelligence platform” and “NotWindy is an aquatic intelligence platform” for fishing, water conditions, and low-wind alerts. The monorepo holds `apps/wind`, `apps/water`, shared `packages/weather` and `packages/ml`, serverless `api/`, and a Garmin watch app.

---

## Technical uncertainty

What was unknown at the start is stated in `docs/PREDICTION-METHODOLOGY.md`: you want to know if wind will be good at a kiting spot before you drive there, by finding upstream stations that lead the target. Lead time, which station, and what speed threshold actually means “kiteable” were not given. The same uncertainty was later extended to propagation lags, a learned weight loop, and whether an HRRR/NWS wind number could be corrected for Utah Lake.

Approaches that are in the tree, in order the commits show:

1. **Indicator stations and thresholds.** Methodology doc plus `docs/VALIDATED-CORRELATIONS.md`. Early product used a random timeline; commit `de85666` (2026-03-13) says “Replace Math.random() timeline with SmartForecastEngine for all activities.”
2. **Physics propagation as a single source of truth.** Commit `e9cc482` (2026-03-13): “Add WindFieldEngine: physics-based wind propagation model.” Commit `6b56731` (2026-03-14) then “close all broken learning loops for every activity and WindFieldEngine.”
3. **That physics import did not stay on the server path.** Commit `dd87f90` (2026-04-13): “replace WindFieldEngine import with server-side NWS-based wind field builder.”
4. **Supervised model of the HRRR miss.** `packages/ml/scripts/train_model.py` trains XGBoost “to predict the gap between the HRRR forecast and actual Utah Lake wind.” Commit `3d80da7` (2026-03-28): “implement XGBoost training pipeline and validate Utah Lake pressure gradient / thermal stall model.”
5. **Online learning loop.** `docs/LEARNING-SYSTEM.md` describes predict → record → verify → score → learn → apply. Commit `59789a5` (2026-04-13): “learning engine never saved weights due to SMISMEMBER null crash.” Earlier the same week of 2026-03-19: “Fix 17 learning system bugs” and “Fix 14 learning system issues.”
6. **Held-out chain check.** Untracked `scripts/chain-validation-report.md` (generated `2026-06-01T16:07:03.374Z`, 30 days, 23 chains) shows several configured lags far from measured lags.
7. **Per-location hone loop (RALPH).** Commit `4a98d81` (2026-05-28). Report `scripts/ralph-report.md` generated `2026-05-29T13:06:16.697Z`: 46 locations, 32 grade A, 14 grade B; top issue `PEAK_HOUR_DRIFT` on 14 locations.
8. **Model host that timed out.** Commit `cb2255c` (2026-03-29): “revert to gemini-2.0-flash, 2.5-flash thinking model causes serverless timeouts.”

### Qualified-research candidates (for the CPA to test, not a claim)

These are the episodes where the record shows a technical unknown, more than one approach, and a recorded failure or measured result.

**1. Upstream indicator → kiteable wind, including the threshold that was too low.**  
`docs/VALIDATED-CORRELATIONS.md`, North Flow KSLC → Zig Zag, analysis period stated as “6 months (2025-2026)”:

> Key Finding: 5 mph threshold only 45% kiteable - raised minimum to 8 mph for meaningful predictions.

Same file, KPVU vs KSLC for southern launches: “At 8-10 mph: KPVU = 78% foil kiteable vs KSLC = 56%.” Commit `ad9c052` (2026-03-12): “Fix Sandy Beach and Lincoln Beach to use Provo Airport (KPVU) as primary indicator.” Sample sizes are printed in that doc (for example KSLC 5–8 mph, n=156). This memo did not re-run the correlation.

**2. Configured propagation lags failed a 30-day check.**  
`scripts/chain-validation-report.md` (on disk, **not in git** — see Gaps):

| Chain | Hit rate | Status in that report |
|---|---|---|
| lincoln:se_thermal | 33% (5/15 signal days arrived) | Poor |
| mm19:canyon_drainage | 29% | Poor |
| potm-south:se_thermal | 42% | Poor |
| sand-hollow:desert_thermal | 41% | Poor |
| zigzag:se_thermal | 70% | Good, but QSF lag recommendation −198 min vs config −120 min (MAE 210 min) |
| zigzag:north_flow | 95% | Good, but KSLC actual lag +191 min vs config −60 min (MAE 251 min) |

The report’s own recommendation is to change the lags. Whether anyone applied those numbers is not proven by a later commit in the subjects reviewed.

**3. XGBoost correction of HRRR / NWS wind error at Utah Lake.**  
`packages/ml/models/training_report.json` (tracked):

- train MAE 1.559, RMSE 2.192, R² 0.7775, n_train 15,119  
- test MAE 1.719, RMSE 2.432, R² 0.6656, n_test 3,780  
- 15 features, including `Pressure_Gradient`, `Thermal_Delta`, `HRRR_Temp`, `Temp_Model_Delta`  
- `best_iteration`: 43  

Plots: `packages/ml/models/feature_importance.png`, `packages/ml/models/predicted_vs_actual.png`. The training script offers a `--tune` hyperparameter search; this memo does not show that a search was the run that produced the JSON.

**4. Physics WindFieldEngine, then a server-side replacement.**  
Introduced `e9cc482` (2026-03-13), learning loops called broken in `6b56731` (2026-03-14), server import replaced in `dd87f90` (2026-04-13). That sequence is a recorded pivot, not a finished proof that the physics model was wrong in all uses.

**5. Learning loop that did not persist weights, plus a pile of earlier loop bugs.**  
`59789a5` (2026-04-13) and the 2026-03-19 “14” and “17” learning-system fix commits. `docs/LEARNING-SYSTEM.md` is the design write-up of the cycle.

**6. RALPH peak-hour drift.**  
Example from `scripts/ralph-report.md`, East Canyon: predicted peak 14:00, observed 17:00, drift 3h, grade B, issue `PEAK_HOUR_DRIFT`. Deer Creek in the same report is grade A with peak drift 1h. The report also suppresses drift alerts when thermal days are scarce (`INSUFFICIENT_THERMAL_DAYS`, 15 locations).

**7. Deterministic near-term forecast instead of a random timeline, and ground-truth gates.**  
`de85666` (2026-03-13) removes `Math.random()` timelines. Later accuracy fixes, still experimental in subject line only: `1c3f8be` (2026-06-04) “never say GO when ground truth is 0”; `d0e362d` (2026-06-04) “remove fake Open-Meteo grid points from map”; `3b04428` (2026-06-04) “windstream direction (was backwards).”

**8. Free stations vs Synoptic, after the README said Synoptic was unnecessary.**  
`README.md`: “No Synoptic/MesoWest API key required.” Commit `f04d9b1` (2026-04-14): “Synoptic migration validation + Deer Creek thermal corrections.” Commit `b07fe56` (2026-04-06): “Add 3-year multi-location kiting validation with Zigzag PWS, Deer Creek, Willard Bay.” A commit the same day (`AccuracyScoreboard`) says the UI should “show validated backtest data (85.9% accuracy, 7624 samples).” That percentage is a **commit-message claim**. It was not re-computed for this memo.

### Routine engineering, UI, and ops (do not treat as the research narrative)

- Visual design and UX: light/dark mode (`4e2d2f5`, `a6a7f52`, 2026-03-12), GO/WAIT/PASS cards, LaunchBriefingCard polish, freemium layout (`2026-04-07`).
- Brand and marketing: rebrand to NotWindy (`2026-04-06`); Meta ads kit and `#go` landing left **uncommitted** as of this scan (`apps/water/campaigns/`, `apps/water/public/campaign/`). Agent transcript `1305b242` on 2026-08-15 8:10 AM: user said to put that work aside.
- Accounts, billing, email: Stripe, Supabase auth, Resend feedback replies. The entire 2026-08-13 commit run (8 commits, `84f03cf` through `2a6338c`) is “reply to Command Center feedback” and mail-status fixes.
- Repo mechanics: GitHub Actions CI (`6eb0888`, 2026-03-12); Turborepo migration PRs #3 and #4 (merged 2026-03-28).
- Content assembly: `utah-fishing-research.md` is a reference compilation (species, depths, regulations). It does not record an experiment.
- Bundle-size work in transcript `6f0abedb` (opens 2026-05-28 with an 848 KB initial load and a request for `rollup-plugin-visualizer`) is performance engineering.

---

## Timeline

| Bound | When | Proof |
|---|---|---|
| First meaningful activity | **2026-03-11 23:02:42−06** | First commit `55da1ce`, author `climbingpro-creator`: “Initial commit: Utah Wind Pro - Self-learning wind prediction app.” GitHub repo `createdAt` is 15 seconds later in UTC (`2026-03-12T05:02:57Z`). |
| Last commit | **2026-08-13 20:14:46−06** | `2a6338c` “fix: stop showing the admin login on emailed tickets.” GitHub `pushedAt` `2026-08-14T02:14:48Z`. |
| Last Project chat after that commit | **2026-08-15 08:10 AM (UTC−6)** | Transcript `1305b242`. User: “ok lets put this on the side and come bck to it later thanks.” Work parked was the NotWindy Meta campaign, not a model experiment. |
| Quiet gaps with no commits | Mar 31; Apr 15 and Apr 17–22 and Apr 24–30; May 1–10, 12–13, 15–27; Jun 2; **Jun 5 through Aug 12 (no July)**; Aug 14 | `git log` author dates. Aug 15 has a chat timestamp and no commit. |

Commit counts on `master` (`git rev-list --count HEAD` = **564**): 2026-03: 298; 2026-04: 209; 2026-05: 29; 2026-06: 20; 2026-08: 8. `git shortlog -sn --all` is 568 because 4 Cursor Agent commits sit on `cursor/north-mountain-paragliding-1f91`, which is **not** an ancestor of `master` (PR #1 closed, not merged).

---

## Time table

**Documented labor hours: none.** No timesheet, invoice, or agent-duration field was found. The tables below are timestamps that exist. They are not hours worked. Do not add the clock gaps into a total. Chat windows overlap the same calendar days as commits; counting both would double-count the same evening.

**Estimated hours: none offered.** Nothing in the Project states an estimate, and this memo does not invent one.

### Documented — git commit windows on `master`

Source for every row: `git log --format="%ad"` author date, `--date=iso-strict`, grouped by calendar date in the timestamp. Single-commit days have identical first and last timestamps (a point, not a span). Author on all of these rows: `climbingpro-creator <climbingpro@gmail.com>`.

| Date | Commits | First author timestamp | Last author timestamp |
|---|---:|---|---|
| 2026-03-11 | 2 | 2026-03-11T23:02:42-06:00 | 2026-03-11T23:51:56-06:00 |
| 2026-03-12 | 10 | 2026-03-12T08:23:27-06:00 | 2026-03-12T14:43:30-06:00 |
| 2026-03-13 | 17 | 2026-03-13T08:21:39-06:00 | 2026-03-13T21:45:18-06:00 |
| 2026-03-14 | 7 | 2026-03-14T08:03:11-06:00 | 2026-03-14T23:09:58-06:00 |
| 2026-03-15 | 11 | 2026-03-15T00:23:51-06:00 | 2026-03-15T22:26:49-06:00 |
| 2026-03-16 | 1 | 2026-03-16T15:09:24-06:00 | 2026-03-16T15:09:24-06:00 |
| 2026-03-17 | 5 | 2026-03-17T17:29:38-06:00 | 2026-03-17T22:47:56-06:00 |
| 2026-03-18 | 13 | 2026-03-18T00:02:02-06:00 | 2026-03-18T22:00:17-06:00 |
| 2026-03-19 | 28 | 2026-03-19T07:35:00-06:00 | 2026-03-19T23:59:03-06:00 |
| 2026-03-20 | 16 | 2026-03-20T03:08:26-06:00 | 2026-03-20T22:03:32-06:00 |
| 2026-03-21 | 2 | 2026-03-21T07:30:01-06:00 | 2026-03-21T07:45:12-06:00 |
| 2026-03-22 | 15 | 2026-03-22T09:08:16-06:00 | 2026-03-22T22:16:04-06:00 |
| 2026-03-23 | 9 | 2026-03-23T00:09:41-06:00 | 2026-03-23T10:07:36-06:00 |
| 2026-03-24 | 36 | 2026-03-24T00:03:14-06:00 | 2026-03-24T23:08:57-06:00 |
| 2026-03-25 | 11 | 2026-03-25T13:20:30-06:00 | 2026-03-25T17:19:54-06:00 |
| 2026-03-26 | 16 | 2026-03-26T07:55:54-06:00 | 2026-03-26T22:09:02-06:00 |
| 2026-03-27 | 27 | 2026-03-27T10:07:29-06:00 | 2026-03-27T23:23:51-06:00 |
| 2026-03-28 | 32 | 2026-03-28T00:02:48-06:00 | 2026-03-28T23:58:21-06:00 |
| 2026-03-29 | 16 | 2026-03-29T07:32:08-06:00 | 2026-03-29T21:01:16-06:00 |
| 2026-03-30 | 24 | 2026-03-30T08:39:54-06:00 | 2026-03-30T19:57:46-06:00 |
| 2026-04-01 | 5 | 2026-04-01T07:42:37-06:00 | 2026-04-01T12:28:42-06:00 |
| 2026-04-02 | 14 | 2026-04-02T12:40:20-06:00 | 2026-04-02T20:56:34-06:00 |
| 2026-04-03 | 1 | 2026-04-03T08:10:35-06:00 | 2026-04-03T08:10:35-06:00 |
| 2026-04-04 | 1 | 2026-04-04T08:53:02-06:00 | 2026-04-04T08:53:02-06:00 |
| 2026-04-05 | 11 | 2026-04-05T12:38:16-06:00 | 2026-04-05T15:07:32-06:00 |
| 2026-04-06 | 30 | 2026-04-06T07:14:09-06:00 | 2026-04-06T19:55:43-06:00 |
| 2026-04-07 | 11 | 2026-04-07T15:06:25-06:00 | 2026-04-07T23:07:11-06:00 |
| 2026-04-08 | 11 | 2026-04-08T07:40:40-06:00 | 2026-04-08T21:15:28-06:00 |
| 2026-04-09 | 49 | 2026-04-09T00:23:48-06:00 | 2026-04-09T22:36:07-06:00 |
| 2026-04-10 | 10 | 2026-04-10T09:24:44-06:00 | 2026-04-10T22:03:17-06:00 |
| 2026-04-11 | 18 | 2026-04-11T02:29:24-06:00 | 2026-04-11T22:34:14-06:00 |
| 2026-04-12 | 19 | 2026-04-12T08:15:28-06:00 | 2026-04-12T16:09:59-06:00 |
| 2026-04-13 | 5 | 2026-04-13T08:12:51-06:00 | 2026-04-13T23:57:46-06:00 |
| 2026-04-14 | 12 | 2026-04-14T07:19:49-06:00 | 2026-04-14T16:26:46-06:00 |
| 2026-04-16 | 4 | 2026-04-16T08:41:34-06:00 | 2026-04-16T14:03:51-06:00 |
| 2026-04-23 | 8 | 2026-04-23T19:40:26-06:00 | 2026-04-23T22:33:11-06:00 |
| 2026-05-11 | 1 | 2026-05-11T08:20:41-06:00 | 2026-05-11T08:20:41-06:00 |
| 2026-05-14 | 1 | 2026-05-14T15:04:49-06:00 | 2026-05-14T15:04:49-06:00 |
| 2026-05-28 | 5 | 2026-05-28T09:38:49-06:00 | 2026-05-28T21:37:38-06:00 |
| 2026-05-29 | 7 | 2026-05-29T07:07:03-06:00 | 2026-05-29T13:23:08-06:00 |
| 2026-05-30 | 2 | 2026-05-30T08:10:52-06:00 | 2026-05-30T08:16:07-06:00 |
| 2026-05-31 | 13 | 2026-05-31T09:31:12-06:00 | 2026-05-31T12:50:11-06:00 |
| 2026-06-01 | 3 | 2026-06-01T11:04:45-06:00 | 2026-06-01T11:22:57-06:00 |
| 2026-06-03 | 7 | 2026-06-03T08:08:16-06:00 | 2026-06-03T08:54:18-06:00 |
| 2026-06-04 | 10 | 2026-06-04T07:45:13-06:00 | 2026-06-04T16:22:53-06:00 |
| 2026-08-13 | 8 | 2026-08-13T17:56:40-06:00 | 2026-08-13T20:14:46-06:00 |

**46 active commit dates. 564 commits. No hour total.**

### Documented — Cursor Agent commits not on `master`

Source: `git log --all --author="Cursor Agent"`. These four commits are on `remotes/origin/cursor/north-mountain-paragliding-1f91` only.

| Timestamp (UTC) | Hash | Subject |
|---|---|---|
| 2026-03-13T03:04:48Z | `aff3a07` | Add shared near-term activity prediction model |
| 2026-03-13T03:08:26Z | `c374aac` | Clean up prediction validation fixes |
| 2026-03-13T04:02:25Z | `061213e` | Refine activity station and precursor modeling |
| 2026-03-13T04:03:07Z | `6082d44` | Stabilize activity model memoization |

PR #1 closed 2026-04-10 without merge: https://github.com/climbingpro-creator/utah-wind-pro/pull/1

### Documented — agent transcript timestamp windows

Source: `<timestamp>` tags inside the jsonl. These are message clocks, not a timer of tool runtime. Overlap with the git table is expected.

| Transcript id | First tag | Last tag | Tag count | What the opening user text is |
|---|---|---|---:|---|
| `6f0abedb-4117-4056-b4c3-91725f308bc9` | Thu May 28, 2026, 9:07 AM (UTC−6) | Sun May 31, 2026, 5:36 PM (UTC−6) | 46 | 848 KB initial load; add bundle visualizer before code-splitting |
| `bde53fce-3916-4545-ad8c-fac96fd23b90` | Mon Jun 1, 2026, 8:52 AM (UTC−6) | Thu Jun 4, 2026, 4:22 PM (UTC−6) | 57 | “will it be windy at zigzag this morning… what indicators… what time will it show up” |
| `1305b242-2e6e-46f2-bbe4-321fda7b158d` | Thu Aug 13, 2026, 5:44 PM (UTC−6) | Sat Aug 15, 2026, 8:10 AM (UTC−6) | 31 | Respond to user feedback and resume the two websites; ends by parking the Meta ads kit |

Transcript `5d92fa71-3963-4952-9200-9c1678a8b2aa` (about 3.5 MB, 4,992 lines) has **no** `<timestamp>` tags. Opening text is a console paste that includes `build: 2026-03-31T20:09:11.144Z` and map/hover debugging for the water app. File last-write time on disk: **2026-05-14 15:05** local. That is a file date, not a proven work span from March 31 to May 14.

Subagent jsonl files exist under `6f0abedb` (1 file) and `bde53fce` (9 files) and `1305b242` (1 file). Their filesystem last-write times fall inside the parent windows above. They were not converted into hours.

This handoff chat (`c817154a`, 2026-10-10) is excluded from the activity timeline. It only extracts this memo.

### Estimated

No estimated hours. Leave this row blank until Tyler attaches a calendar or timesheet.

---

## People

| Who | What the Project actually shows |
|---|---|
| Git author of all 564 `master` commits | `climbingpro-creator <climbingpro@gmail.com>` |
| Admin allow-list in app and API | `tyler@aspenearth.com` and `climbingpro@gmail.com` (for example `apps/wind/src/context/AuthContext.jsx`, `api/admin/analytics.js`) |
| Terms / privacy contact | `tyler@aspenearth.com` |
| Name “Tyler Lyon” | **Not in the repo.** It is the name on this handoff request. The email local-part `tyler` is the in-repo link. Surname is unproven here. |
| Sarah | **No mention** in repo text searched (`*.md`, `*.html`, `*.js`, `*.jsx`) or in a transcript keyword scan for `Sarah`. |
| Cursor Agent | 4 unmerged commits and the closed PR #1. Software agent, not a wage earner in this record. |
| Wages, contractors, 1099, payroll | **Not mentioned** anywhere in the sources scanned. |

---

## Artifacts index

Paths are absolute on this machine. Git objects are also on https://github.com/climbingpro-creator/utah-wind-pro.

### Identity and method docs

- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\README.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\docs\PREDICTION-METHODOLOGY.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\docs\VALIDATED-CORRELATIONS.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\docs\LEARNING-SYSTEM.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\docs\SYSTEM-ARCHITECTURE.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\docs\FORECAST-INTEGRATION.md`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\apps\wind\public\terms.html` (and `apps\water\public\terms.html`) — “operated by Arcadia INC”
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\audit-export.md` — generated `2026-03-13T16:33:06.890Z`, codebase dump for an AI review, not a tax workpaper

### Experiments, evals, models

- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\scripts\train_model.py`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\scripts\prepare_data.py`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\models\training_report.json`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\models\xgboost_model.json`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\models\feature_importance.png`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\packages\ml\models\predicted_vs_actual.png`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\scripts\ralph-report.md` and `scripts\ralph-report.json` (generated 2026-05-29)
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\scripts\ralph-validation.js`
- `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\scripts\chain-validation-report.md` and `.json` — **untracked working tree**, generated 2026-06-01
- Backtest scripts (outputs not re-run here): `scripts\backtest-paragliding-2025.cjs`, `scripts\backtest-boating-fishing-2025.cjs`, `scripts\backtest-full-2025.cjs`, `scripts\compare-models-365-backtest.mjs`, `scripts\historical-backtest.js`, `scripts\nws-historical-validation.mjs`
- Unit tests: `packages\weather\src\services\*.test.js`, `apps\wind\src\services\*.test.js`, `apps\wind\src\utils\*.test.js`

### Commits to keep (research spine)

| Hash | Date | Why it is in the index |
|---|---|---|
| `55da1ce` | 2026-03-11 | Initial commit |
| `ad9c052` | 2026-03-12 | KPVU replaces KSLC for southern beaches |
| `de85666` | 2026-03-13 | Removes `Math.random()` timelines |
| `e9cc482` | 2026-03-13 | WindFieldEngine added |
| `6b56731` | 2026-03-14 | Learning loops and WindFieldEngine called broken |
| `3d80da7` | 2026-03-28 | XGBoost pipeline |
| `cb2255c` | 2026-03-29 | Gemini 2.5 thinking model timed out; reverted |
| `b07fe56` | 2026-04-06 | 3-year multi-location kiting validation |
| `dd87f90` | 2026-04-13 | WindFieldEngine server import replaced |
| `59789a5` | 2026-04-13 | Learning weights never saved (SMISMEMBER) |
| `f04d9b1` | 2026-04-14 | Synoptic migration validation |
| `4a98d81` | 2026-05-28 | RALPH harness |
| `1c3f8be` | 2026-06-04 | Do not say GO when ground truth is 0 |
| `2a6338c` | 2026-08-13 | Last commit (email admin UI, not research) |

### Pull requests

- https://github.com/climbingpro-creator/utah-wind-pro/pull/4 — V2 Architecture: Turborepo monorepo migration — **MERGED** 2026-03-28
- https://github.com/climbingpro-creator/utah-wind-pro/pull/3 — Turborepo migration phases 1–7 — **MERGED** 2026-03-28
- https://github.com/climbingpro-creator/utah-wind-pro/pull/2 — backend hardening — **OPEN** (listed 2026-03-27; state not re-checked past `gh pr list` on 2026-10-10)
- https://github.com/climbingpro-creator/utah-wind-pro/pull/1 — North mountain paragliding (Cursor Agent) — **CLOSED** 2026-04-10, not merged

### Transcripts (local, not in git)

- `C:\Users\Admin\.cursor\projects\c-Users-Admin-Documents-GitHub-utahwind-monorepo\agent-transcripts\6f0abedb-4117-4056-b4c3-91725f308bc9\`
- `C:\Users\Admin\.cursor\projects\c-Users-Admin-Documents-GitHub-utahwind-monorepo\agent-transcripts\bde53fce-3916-4545-ad8c-fac96fd23b90\`
- `C:\Users\Admin\.cursor\projects\c-Users-Admin-Documents-GitHub-utahwind-monorepo\agent-transcripts\1305b242-2e6e-46f2-bbe4-321fda7b158d\`
- `C:\Users\Admin\.cursor\projects\c-Users-Admin-Documents-GitHub-utahwind-monorepo\agent-transcripts\5d92fa71-3963-4952-9200-9c1678a8b2aa\`

### Screenshots / video

Model diagnostic PNGs are listed above. Campaign images under `apps\water\public\campaign\` are ad creative and are uncommitted. No experiment video file is referenced by the research docs or the commit subjects reviewed.

---

## Business tagging

**Stated in the product terms, not yet confirmed by Tyler for this R&D.**

`apps/wind/public/terms.html` (and the water copy), last updated March 31, 2026:

> These Terms and Conditions govern your use of LiftForecast (liftforecast.com) and NotWindy (notwindy.com), operated by Arcadia INC.

SMS section of the same file: messages come “from Arcadia INC.”

`aspenearth.com` appears only as the contact mailbox `tyler@aspenearth.com`. The Project does not say that Aspen Earth is the legal entity, a DBA, or an employer.

**Ask Tyler:** Does the experimentation in this repo belong to **Arcadia INC**, to Tyler personally, or to some other entity? If Arcadia INC, confirm legal name, state of formation, and that Tyler’s time on these commits is that entity’s research (owner labor vs W-2 vs contractor).

Until that answer, the entity for Finance strategy is **Arcadia INC as named in the terms, confirmation required.** It is not left blank, and it is not treated as proven ownership of the R&D.

---

## Gaps — Tyler still has to confirm or attach

1. **Entity.** Confirm Arcadia INC vs personal vs another company. Attach formation doc or a one-line statement the CPA can file with.
2. **Identity.** Confirm `climbingpro@gmail.com` and `tyler@aspenearth.com` are Tyler Lyon. The surname is not in the repo.
3. **Sarah.** No Project evidence. If she did any of this work, attach her own log. Do not infer her from this repo.
4. **Hours.** There are no documented hours. A calendar export or a day-by-day hour log is required before anyone puts a number on a credit worksheet. Do not convert the timestamp table into hours.
5. **Pay.** No wages or contractor amounts are in the Project. Attach payroll, draws, or invoices if any exist outside git.
6. **Untracked validation.** Commit or archive `scripts/chain-validation-report.md` and `.json`. Right now the 2026-06-01 chain results exist only in the working tree.
7. **85.9% / 7,624 samples.** That figure is a commit message for the Accuracy Scoreboard. Re-run or attach the backtest output if the CPA will rely on it.
8. **Correlation sample periods** in `VALIDATED-CORRELATIONS.md` (“3 years”, “6 months”) are assertions inside the doc. The raw station extracts are not in this memo.
9. **Which costs are research vs routine.** The candidate list above is the split this scan can support. UI, ads, Stripe, Resend, and the August 13 email fixes should stay out of a research narrative unless the CPA decides otherwise.
10. **PR #2** was still open in `gh pr list` at scan time. Confirm whether that branch is abandoned.
11. **Aug 15 Meta work** is uncommitted marketing (`apps/water/campaigns/`, campaign images). It is not part of the research spine.
12. **`.cursor/session-context.md`** is a running product log (wind-map crash, Meta ads parked 2026-08-15). It is not a time record. Path: `c:\Users\Admin\Documents\GitHub\utahwind-monorepo\.cursor\session-context.md`.

---

## Copy-paste summary

Utah Wind / NotWindy / LiftForecast (`utahwind-monorepo`, https://github.com/climbingpro-creator/utah-wind-pro). Self-learning wind and water forecasts for Utah launches. Terms say the sites are operated by Arcadia INC — Tyler must confirm that entity owns this R&D.

Proven activity: first commit 2026-03-11 23:02−06 (`55da1ce`); last commit 2026-08-13 20:14−06 (`2a6338c`); last chat 2026-08-15 08:10−06 (Meta ads parked). 564 commits on master, 46 active dates, author climbingpro-creator / climbingpro@gmail.com. Admin email also tyler@aspenearth.com. No Sarah, no wages, no timesheets.

Documented labor hours: none. Do not turn commit clocks or chat timestamps into hours.

Research candidates, not a credit claim: indicator lead times (5 mph threshold only 45% kiteable, raised to 8; KPVU beat KSLC); propagation lags failed a 2026-06-01 chain check (lincoln SE thermal 33%, several lags off by hours); XGBoost HRRR-error model test R² 0.6656, MAE 1.719 mph (n_test 3780); WindFieldEngine added 2026-03-13 and server import replaced 2026-04-13; learning weights failed to save (SMISMEMBER, 2026-04-13); RALPH peak-hour drift on 14 of 46 spots (2026-05-29). UI, billing, email, and ads are routine.

Full index: `docs/rd-handoff-for-finance-strategy.md`.
