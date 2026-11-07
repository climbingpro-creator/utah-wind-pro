# Git-derived R&D hour reconstruction

**Label:** RECONSTRUCTED_GIT_HOURS. These hours are reconstructed from git timestamps. They are not contemporaneous timesheets and they are not documented payroll hours or qualified-research-expense hours.

**Prepared:** 2026-10-10  
**Repo:** `c:\Users\Admin\Documents\GitHub\utahwind-monorepo`  
**GitHub:** https://github.com/climbingpro-creator/utah-wind-pro  
**Companion evidence index:** `docs/rd-handoff-for-finance-strategy.md`  
**Session CSV (same numbers):** `docs/rd-git-hours-sessions.csv`

A CPA or IRS reviewer can recompute every figure from `git log` using the rules in this file. If a recompute disagrees, the git log wins.

---

## Repo identity and sole-author attestation

Git history on `master` (`git log --all --pretty=format:"%an|%ae"`) has exactly two author identities:

| Author | Email | Role in this reconstruction |
|---|---|---|
| climbingpro-creator | climbingpro@gmail.com | Included. 561 non-merge commits on `master`, every author timestamp offset **−06:00**. |
| Cursor Agent | cursoragent@cursor.com | Excluded. 4 commits on `cursor/north-mountain-paragliding-1f91` only (not an ancestor of `master`). PR #1 closed unmerged. |

No second human author appears in git. This reconstruction does not allocate hours across people.

**Attestation still required from Tyler Lyon:** he is the only human who produced these commits, `climbingpro-creator` / `climbingpro@gmail.com` is him, and the reconstructed blocks are his labor rather than someone else typing on that account. This file does not prove that attestation. It only shows what git records.

---

## Methodology (A–E)

Applied exactly, with the tag rollup and daily-cap allocation stated here so the arithmetic is reproducible.

### A. Author filter

Include commits where author email is `climbingpro@gmail.com` (name `climbingpro-creator`).  

Excluded bot/CI author: `Cursor Agent <cursoragent@cursor.com>` (4 commits, listed above). No GitHub Actions bot commits are in this history.

### B. Session clustering

Sort Tyler commits ascending by author timestamp. Start a new session when the gap from the previous Tyler commit is **> 45 minutes**. A gap of exactly 45 minutes stays in the same session.

Session duration = (timestamp of last commit in session) − (timestamp of first commit in session).

If a session has only one commit: duration = **15 minutes** (fixed singleton default). No extra thinking buffer is added.

### C. Daily cap

Per calendar day in the author timestamp’s offset (−06:00 for every included commit): sum session durations, then cap at **10.0 hours**.  

Only **2026-04-09** exceeded 10.0 hours (raw **10.347778** hours). Counted hours on that day are raw session hours × (10.0 / 10.347778) = × **0.966391**. That is the only cap. Other days are unchanged. Tag totals use these counted hours, so they add up to the capped grand total.

### D. Workstream tagging

Each **commit** is classed from its subject line (paths are used only when every file in the commit is inside a research-script/doc prefix or a routine-only prefix):

- **R** — subject matches a named research-thread pattern and does not match a routine pattern.
- **P** — subject matches a routine pattern (UI, billing, lint, auth, email, paywall, rebrand, cache, privacy/terms, monorepo, campaign) and does not match a research pattern.
- **U** — both patterns match, or neither does.

A **session** is tagged:

- **CANDIDATE_R&D** only when every commit in the session is R.
- **PRODUCT_ROUTINE** only when every commit in the session is P.
- **UNCLEAR** otherwise.

Mixed sessions are not split and routine work is not reclassified as R&D. That is why UNCLEAR is most of the total: research commits usually sit in the same 45-minute block as other commits.

Named threads used only as labels on CANDIDATE_R&D sessions (a session may carry more than one; thread labels are not a second hour total):

1. INDICATOR_LEADTIME — upstream stations, correlation, KPVU/KSLC/QSF/UTALP, north flow  
2. PROPAGATION_WINDFIELD — WindField, propagation, windstream, translation factor  
3. XGBOOST_HRRR — XGBoost, HRRR/pressure-gradient wind error, `packages/ml`  
4. LEARNING_LOOP — learning engine/system/cycle, SMISMEMBER, weight updates  
5. RALPH — RALPH harness  
6. FORECAST_TRUTH — SmartForecast / Math.random replacement, ground truth, fake Open-Meteo grids, nowcast  
7. SOURCE_VALIDATION — Synoptic vs free sources, backtest, model rebuild, cross-validation  

The exact regular expressions are in the reproducibility appendix.

### E. Reproducibility

Commands used:

```
git log --all --pretty=format:"%an|%ae"
git log --merges --pretty=format:"%H|%aI|%an|%ae|%s"
git log --author="climbingpro@gmail.com" --no-merges --pretty=format:"@@@%H|%aI|%an|%ae|%s" --name-only
```

Clustering, the 15-minute singleton, the 10.0-hour cap, and the tag rules above were applied to that log. Output checked against: **561** commits, **168** sessions, raw sum **92.220833** hours, capped sum **91.873056** hours.

Merge commits are excluded from session timing. They are not the only signal on their days (2026-03-27 and 2026-03-28 already have non-merge commits). Listed under Limitations.

---

## Summary

| | Hours |
|---|---:|
| Session durations before the daily cap | 92.220833 |
| Removed by the 10.0-hour cap (2026-04-09 only) | 0.347778 |
| **RECONSTRUCTED_GIT_HOURS** | **91.873056** |

Of the reconstructed total, **17.483196** hours come from the 15-minute singleton default (**70** of **168** sessions), not from a measured span between two commits.

### By tag (counted hours, after cap)

| Tag | Hours | Sessions |
|---|---:|---:|
| CANDIDATE_R&D | 4.3519 | 18 |
| PRODUCT_ROUTINE | 3.3694 | 15 |
| UNCLEAR | 84.1518 | 135 |
| **RECONSTRUCTED_GIT_HOURS** | **91.8731** | **168** |

### By month (author date, −06:00, after cap)

| Month | Total | CANDIDATE_R&D | PRODUCT_ROUTINE | UNCLEAR |
|---|---:|---:|---:|---:|
| 2026-03 | 48.9328 | 2.4733 | 1.5000 | 44.9594 |
| 2026-04 | 35.1331 | 0.8199 | 1.1194 | 33.1937 |
| 2026-05 | 4.3353 | 0.5586 | 0.5000 | 3.2767 |
| 2026-06 | 2.6436 | 0.5000 | 0.0000 | 2.1436 |
| 2026-08 | 0.8283 | 0.0000 | 0.2500 | 0.5783 |
| **Total** | **91.8731** | **4.3519** | **3.3694** | **84.1518** |

Four-decimal figures in the tables can differ by 0.0001 hour from a sum of the rounded cells. `docs/rd-git-hours-sessions.csv` holds six-decimal hours and is the figure to recompute against. July has no commits.

### CANDIDATE_R&D sessions (all of them)

These are the only sessions whose every commit matched a research-thread subject rule.

| Date | # | Counted h | Commits | Threads | First subject |
|---|---:|---:|---:|---|---|
| 2026-03-13 | 6 | 0.2500 | 1 | INDICATOR_LEADTIME | Add wind switch predictor and upstream indicators for paragliding north side |
| 2026-03-13 | 8 | 0.2500 | 1 | INDICATOR_LEADTIME | Add meso-relational correlation engine with spatial trigger badges |
| 2026-03-15 | 19 | 0.2500 | 1 | PROPAGATION_WINDFIELD, SOURCE_VALIDATION | feat: AI-driven snowkite predictions with 12 verified Synoptic stations and trained mod... |
| 2026-03-18 | 28 | 0.2650 | 2 | LEARNING_LOOP | Fix 7 critical learning system bugs ΓÇö verification loop now works |
| 2026-03-19 | 30 | 0.2500 | 1 | LEARNING_LOOP | Fix 17 learning system bugs, optimize Redis MGET, unify station maps |
| 2026-03-20 | 38 | 0.2500 | 1 | PROPAGATION_WINDFIELD, SOURCE_VALIDATION | Fix Synoptic history date format and add propagation chain stations |
| 2026-03-24 | 51 | 0.2500 | 1 | SOURCE_VALIDATION | Add local 365-day model rebuild script |
| 2026-03-28 | 74 | 0.4583 | 3 | XGBOOST_HRRR, FORECAST_TRUTH | feat(ml): implement XGBoost training pipeline and validate Utah Lake pressure gradient ... |
| 2026-03-30 | 89 | 0.2500 | 1 | SOURCE_VALIDATION | feat(api): add FREE radial weather endpoint using NWS/UDOT/Ambient - NO SYNOPTIC CHARGES |
| 2026-04-09 | 111 | 0.2416 | 1 | SOURCE_VALIDATION | fix: improve station health accuracy by excluding UDOT from Synoptic check and distingu... |
| 2026-04-13 | 134 | 0.2500 | 1 | PROPAGATION_WINDFIELD, LEARNING_LOOP, SOURCE_VALIDATION | feat: cross-link WU stations with all waters and enable fishing learning engine |
| 2026-04-13 | 136 | 0.2500 | 1 | LEARNING_LOOP | fix: learning engine never saved weights due to SMISMEMBER null crash |
| 2026-04-14 | 139 | 0.0783 | 2 | INDICATOR_LEADTIME, PROPAGATION_WINDFIELD, LEARNING_LOOP, SOURCE_VALIDATION | feat: Synoptic migration validation + Deer Creek thermal corrections |
| 2026-05-28 | 148 | 0.2500 | 1 | SOURCE_VALIDATION | fix(wind): replace Synoptic ridge stations with free NWS + Open-Meteo |
| 2026-05-28 | 149 | 0.2500 | 1 | RALPH | feat(wind): RALPH validation harness + universal map meter coverage |
| 2026-05-29 | 153 | 0.0586 | 2 | RALPH, SOURCE_VALIDATION, INDICATOR_LEADTIME, FORECAST_TRUTH | feat(prediction): dense stations now feed ThermalPredictor + cross-validation feat(map)... |
| 2026-06-04 | 164 | 0.2500 | 1 | FORECAST_TRUTH | fix: remove fake Open-Meteo grid points from map, skip water body grid sampling |
| 2026-06-04 | 166 | 0.2500 | 1 | INDICATOR_LEADTIME, PROPAGATION_WINDFIELD | fix: wind field accuracy, north flow recognition, live timeline override |

---

## Worked examples

**Singleton.** Session 6 is one commit, `Add wind switch predictor and upstream indicators for paragliding north side`, author time 2026-03-13T08:21:39-06:00. Duration = 15 minutes = **0.250000** hours. Tag CANDIDATE_R&D (INDICATOR_LEADTIME).

**Multi-commit span.** Session 28 starts 2026-03-18T21:44:23-06:00 and ends 2026-03-18T22:00:17-06:00 (2 commits, all class R). Duration = last − first = **0.265000** hours. Not the 15-minute default.

**XGBoost block.** Session 74 starts 2026-03-28T17:04:51-06:00 and ends 2026-03-28T17:32:21-06:00 (3 commits). Duration = **0.458333** hours. First subject: feat(ml): implement XGBoost training pipeline and validate Utah Lake pressure gradient / thermal stall model.

**Daily cap.** 2026-04-09 raw session sum **10.347778** hours. Counted sum **10.000000** hours. Session 111 on that day is a singleton: raw 0.250000 × 0.966391 = **0.241598** counted hours.

---

## Full session table

`Raw h` is the session duration from rule B. `Counted h` is after the daily cap. They differ only on 2026-04-09. Times are author-local (−06:00). Full hashes and thread labels are in `docs/rd-git-hours-sessions.csv`.

| Date | # | Start | End | Raw h | Counted h | Singleton | First | Last | Tag | Sample subject |
|---|---:|---|---|---:|---:|---|---|---|---|---|
| 2026-03-11 | 1 | 23:02:42 | 23:02:42 | 0.2500 | 0.2500 | yes | `55da1ce4c` | `55da1ce4c` | UNCLEAR | Initial commit: Utah Wind Pro - Self-learning wind prediction app |
| 2026-03-11 | 2 | 23:51:56 | 23:51:56 | 0.2500 | 0.2500 | yes | `773b70480` | `773b70480` | UNCLEAR | Add multi-activity support and production deployment config |
| 2026-03-12 | 3 | 08:23:27 | 08:23:27 | 0.2500 | 0.2500 | yes | `d53c09225` | `d53c09225` | UNCLEAR | Update domain to utahwindfinder.com |
| 2026-03-12 | 4 | 10:29:31 | 11:06:12 | 0.6114 | 0.6114 |  | `ad9c0524d` | `217353e7a` | UNCLEAR | Fix Sandy Beach and Lincoln Beach to use Provo Airport (KPVU) as primary indicator |
| 2026-03-12 | 5 | 14:15:57 | 14:43:30 | 0.4592 | 0.4592 |  | `4e2d2f5c4` | `a373e0135` | UNCLEAR | Add light/dark mode toggle |
| 2026-03-13 | 6 | 08:21:39 | 08:21:39 | 0.2500 | 0.2500 | yes | `b2b7d5af8` | `b2b7d5af8` | CANDIDATE_R&D | Add wind switch predictor and upstream indicators for paragliding north side |
| 2026-03-13 | 7 | 10:56:07 | 10:56:07 | 0.2500 | 0.2500 | yes | `dd6f596ac` | `dd6f596ac` | UNCLEAR | Address Gemini audit: API proxy, error boundaries, prediction fixes, idle scheduling, s... |
| 2026-03-13 | 8 | 12:49:38 | 12:49:38 | 0.2500 | 0.2500 | yes | `8dafa2f10` | `8dafa2f10` | CANDIDATE_R&D | Add meso-relational correlation engine with spatial trigger badges |
| 2026-03-13 | 9 | 15:38:31 | 17:36:51 | 1.9722 | 1.9722 |  | `0af6ce8b3` | `1759c46e9` | UNCLEAR | Add forecast-driven UI banners, activity predictors, backtests, and water safety system |
| 2026-03-13 | 10 | 18:30:32 | 19:02:00 | 0.5244 | 0.5244 |  | `cdaaaba11` | `180879529` | UNCLEAR | Lower paragliding min flyable speed from 8 to 6 mph - 7 pilots confirmed flying south s... |
| 2026-03-13 | 11 | 21:45:18 | 21:45:18 | 0.2500 | 0.2500 | yes | `6e36fb01b` | `6e36fb01b` | UNCLEAR | Replace USGS proxy stations with direct lake satellite temps and real river gauges |
| 2026-03-14 | 12 | 08:03:11 | 08:37:13 | 0.5672 | 0.5672 |  | `de3a8fb25` | `a94e83c4c` | UNCLEAR | fix: remove broken satellite scraping, use seasonal model for lake water temps |
| 2026-03-14 | 13 | 16:25:52 | 16:25:52 | 0.2500 | 0.2500 | yes | `4d962adf5` | `4d962adf5` | UNCLEAR | debug: check Upstash env var names |
| 2026-03-14 | 14 | 23:06:03 | 23:09:58 | 0.0653 | 0.0653 |  | `78d40f059` | `f3157c657` | UNCLEAR | chore: trigger redeploy to pick up Upstash env vars |
| 2026-03-15 | 15 | 00:23:51 | 00:23:51 | 0.2500 | 0.2500 | yes | `fb6908551` | `fb6908551` | UNCLEAR | debug: env check on main API |
| 2026-03-15 | 16 | 07:54:51 | 08:05:57 | 0.1850 | 0.1850 |  | `4766a404c` | `1162dfeb0` | UNCLEAR | chore: remove debug endpoints, Redis confirmed working |
| 2026-03-15 | 17 | 09:26:27 | 09:53:39 | 0.4533 | 0.4533 |  | `83849c392` | `edd7ca558` | UNCLEAR | feat: per-station SpotRanker with wind-active tabs and clickable spots |
| 2026-03-15 | 18 | 10:45:16 | 11:28:41 | 0.7236 | 0.7236 |  | `df99d87e2` | `3496bc88a` | UNCLEAR | feat: Todays Outlook hero card + side-offshore kiting zones with skill levels |
| 2026-03-15 | 19 | 18:13:39 | 18:13:39 | 0.2500 | 0.2500 | yes | `dda70e905` | `dda70e905` | CANDIDATE_R&D | feat: AI-driven snowkite predictions with 12 verified Synoptic stations and trained mod... |
| 2026-03-15 | 20 | 20:55:45 | 20:55:45 | 0.2500 | 0.2500 | yes | `99ab52e4d` | `99ab52e4d` | UNCLEAR | style: premium UI/UX polish, glassmorphism, typography, and new layout flow |
| 2026-03-15 | 21 | 22:26:49 | 22:26:49 | 0.2500 | 0.2500 | yes | `8a7c66ab1` | `8a7c66ab1` | UNCLEAR | feat: add Snowkiting as a top-level activity with dedicated AI and routing |
| 2026-03-16 | 22 | 15:09:24 | 15:09:24 | 0.2500 | 0.2500 | yes | `49a8e8236` | `49a8e8236` | UNCLEAR | feat: rotating photos, user submissions, SMS alerts, responsive heroes, SpotRanker scor... |
| 2026-03-17 | 23 | 17:29:38 | 17:56:32 | 0.4483 | 0.4483 |  | `4142d9302` | `9db090ea0` | UNCLEAR | ecosystem-api-and-garmin |
| 2026-03-17 | 24 | 20:16:49 | 20:38:38 | 0.3636 | 0.3636 |  | `363c0c287` | `1836293e3` | UNCLEAR | Add fishing/boating intelligence, moon phase, wave estimates, alerts to Garmin API |
| 2026-03-17 | 25 | 22:47:56 | 22:47:56 | 0.2500 | 0.2500 | yes | `dcc2f11bf` | `dcc2f11bf` | PRODUCT_ROUTINE | Add 20+ Utah lakes statewide, rebrand to UtahWindFinder, implement Pro paywall |
| 2026-03-18 | 26 | 00:02:02 | 00:20:03 | 0.3003 | 0.3003 |  | `901429692` | `9154ef2b3` | UNCLEAR | Fix learning pipeline: close verification gap, add WindEventPredictor, expand 24/7 coll... |
| 2026-03-18 | 27 | 07:16:10 | 08:36:48 | 1.3439 | 1.3439 |  | `2bc537299` | `01631039c` | UNCLEAR | Add 24/7 server-side learning engine |
| 2026-03-18 | 28 | 21:44:23 | 22:00:17 | 0.2650 | 0.2650 |  | `53da877d7` | `4e65718c1` | CANDIDATE_R&D | Fix 7 critical learning system bugs ΓÇö verification loop now works |
| 2026-03-19 | 29 | 07:35:00 | 07:48:41 | 0.2281 | 0.2281 |  | `ee6d23cf5` | `3261338c2` | UNCLEAR | Add NWS cross-check pipeline and competitive moat features |
| 2026-03-19 | 30 | 14:12:29 | 14:12:29 | 0.2500 | 0.2500 | yes | `1de2bd776` | `1de2bd776` | CANDIDATE_R&D | Fix 17 learning system bugs, optimize Redis MGET, unify station maps |
| 2026-03-19 | 31 | 15:59:50 | 17:44:58 | 1.7522 | 1.7522 |  | `419c1af53` | `ecd737474` | UNCLEAR | Upgrade activity badges to react-icons 2x icon size |
| 2026-03-19 | 32 | 20:21:19 | 20:21:19 | 0.2500 | 0.2500 | yes | `5e02c693d` | `5e02c693d` | UNCLEAR | Full audit: security hardening, UX simplification, learning model fixes |
| 2026-03-19 | 33 | 21:37:26 | 23:59:03 | 2.3603 | 2.3603 |  | `b17cc66e1` | `3fba1e16a` | UNCLEAR | PWA support, Capacitor native builds, fix accuracy scoreboard data loss |
| 2026-03-20 | 34 | 03:08:26 | 03:08:26 | 0.2500 | 0.2500 | yes | `4c355002d` | `4c355002d` | UNCLEAR | Adopt safeToFixed across all components and services |
| 2026-03-20 | 35 | 06:24:14 | 06:24:14 | 0.2500 | 0.2500 | yes | `f30ba8d68` | `f30ba8d68` | PRODUCT_ROUTINE | Fix all 295 ESLint errors across entire codebase |
| 2026-03-20 | 36 | 07:41:02 | 07:41:02 | 0.2500 | 0.2500 | yes | `85cfce001` | `85cfce001` | UNCLEAR | Fix Vite dev server failing to load src/main.jsx |
| 2026-03-20 | 37 | 09:48:13 | 10:58:06 | 1.1647 | 1.1647 |  | `e2eb64f39` | `9cbc5f702` | UNCLEAR | Fix paragliding card showing lake wind instead of FPS station data |
| 2026-03-20 | 38 | 17:34:56 | 17:34:56 | 0.2500 | 0.2500 | yes | `76e1e3e03` | `76e1e3e03` | CANDIDATE_R&D | Fix Synoptic history date format and add propagation chain stations |
| 2026-03-20 | 39 | 18:20:01 | 18:20:01 | 0.2500 | 0.2500 | yes | `8be3d6cb5` | `8be3d6cb5` | UNCLEAR | Add session duration tracking - min 45 min for ride viability |
| 2026-03-20 | 40 | 19:13:58 | 19:18:38 | 0.0778 | 0.0778 |  | `3e1cf45ea` | `f66465d9e` | UNCLEAR | Fix FPS-to-Zigzag speed ratio and learn actual ratios daily |
| 2026-03-20 | 41 | 21:50:09 | 22:03:32 | 0.2231 | 0.2231 |  | `e5fe7686d` | `80f6d8187` | UNCLEAR | Use real Ambient Weather API history for session learning |
| 2026-03-21 | 42 | 07:30:01 | 07:45:12 | 0.2531 | 0.2531 |  | `cd7296a04` | `eeee4752f` | UNCLEAR | Location-specific propagation chains per activity and launch |
| 2026-03-22 | 43 | 09:08:16 | 11:30:33 | 2.3714 | 2.3714 |  | `4d57ab11e` | `380a67eef` | UNCLEAR | Add hourly wind timeline component to main dashboard |
| 2026-03-22 | 44 | 12:36:02 | 12:36:02 | 0.2500 | 0.2500 | yes | `4385630a5` | `4385630a5` | UNCLEAR | Make every activity work: full system fix across all 8 activities |
| 2026-03-22 | 45 | 15:54:07 | 15:54:07 | 0.2500 | 0.2500 | yes | `3d219965a` | `3d219965a` | UNCLEAR | \Replace thermal-centric system with wind-regime-aware intelligence across all UI\ |
| 2026-03-22 | 46 | 20:53:00 | 21:09:57 | 0.2825 | 0.2825 |  | `d248ae2d3` | `eda5086d4` | UNCLEAR | \Wire full learning pipeline: activityScores dirBias gradientThresholds paragliding nor... |
| 2026-03-22 | 47 | 22:02:47 | 22:16:04 | 0.2214 | 0.2214 |  | `4ea0a34ba` | `651102d78` | UNCLEAR | \Deep calibration: 365-day history calibration curves expanded analog search restore ac... |
| 2026-03-23 | 48 | 00:09:41 | 00:40:14 | 0.5092 | 0.5092 |  | `99be51b60` | `99558793e` | UNCLEAR | Parallelize Synoptic fetches for faster model builds |
| 2026-03-23 | 49 | 08:13:06 | 08:45:29 | 0.5397 | 0.5397 |  | `ccdcb29db` | `5744c5eb4` | UNCLEAR | UI: bold activity selector at top location picker for all activities auto-scroll on change |
| 2026-03-23 | 50 | 09:32:21 | 10:07:36 | 0.5875 | 0.5875 |  | `f47bd0f77` | `f2b830075` | UNCLEAR | Remove redundant activity bar scroll to location selector on hero card tap |
| 2026-03-24 | 51 | 00:03:14 | 00:03:14 | 0.2500 | 0.2500 | yes | `ad9e0b1e6` | `ad9e0b1e6` | CANDIDATE_R&D | Add local 365-day model rebuild script |
| 2026-03-24 | 52 | 07:50:20 | 08:07:33 | 0.2869 | 0.2869 |  | `d844d3bbf` | `adbc616e4` | UNCLEAR | Fix prediction calibration dirBias learning and cache persistence |
| 2026-03-24 | 53 | 09:33:35 | 09:49:32 | 0.2658 | 0.2658 |  | `11f8409cd` | `5b74d90d3` | UNCLEAR | Sport-specific UI: per-activity timeline glass scores recommendations and legends |
| 2026-03-24 | 54 | 10:37:55 | 12:31:39 | 1.8956 | 1.8956 |  | `581c24c62` | `1096878a1` | UNCLEAR | UX overhaul: GO/WAIT/PASS decision card, simplified flow, onboarding, plain language |
| 2026-03-24 | 55 | 22:55:54 | 23:08:57 | 0.2175 | 0.2175 |  | `dae28119a` | `6c86db182` | UNCLEAR | feat: UDOT RWIS network expansion + WU PWS integration with trained speed ratios |
| 2026-03-25 | 56 | 13:20:30 | 13:20:30 | 0.2500 | 0.2500 | yes | `a1786ab89` | `a1786ab89` | UNCLEAR | fix: Deer Creek + PotM thermal prediction improvements |
| 2026-03-25 | 57 | 15:04:33 | 15:04:51 | 0.0050 | 0.0050 |  | `b15b647db` | `26026c594` | UNCLEAR | feat: multi-source weather fallback (NWS + UDOT RWIS + Synoptic) |
| 2026-03-25 | 58 | 16:05:24 | 17:19:54 | 1.2417 | 1.2417 |  | `3bc2fc1c8` | `46cefc6a7` | UNCLEAR | chore: update Synoptic token (new account with Open Access) |
| 2026-03-26 | 59 | 07:55:54 | 08:32:49 | 0.6153 | 0.6153 |  | `da5ed3077` | `6985f5e1d` | UNCLEAR | fix: P0-P3 fixes + power-user audit improvements across all activities |
| 2026-03-26 | 60 | 10:00:00 | 11:00:36 | 1.0100 | 1.0100 |  | `fcc48beb8` | `972573cbf` | UNCLEAR | feat: paragliding synoptic override, Twin Peaks N/S cards sorted by wind direction |
| 2026-03-26 | 61 | 15:03:42 | 15:03:42 | 0.2500 | 0.2500 | yes | `2443aeaa9` | `2443aeaa9` | UNCLEAR | feat: Supabase schema + 3 API endpoints for session upload, emergency location, topo wa... |
| 2026-03-26 | 62 | 20:42:16 | 20:52:13 | 0.1658 | 0.1658 |  | `2f78e534b` | `f343bf698` | UNCLEAR | feat: multi-rider Session Day leaderboard + gamification system |
| 2026-03-26 | 63 | 21:41:28 | 22:09:02 | 0.4594 | 0.4594 |  | `27c7039ca` | `433901ab3` | UNCLEAR | fix: leaderboard navigation + trophy in header + social sharing |
| 2026-03-27 | 64 | 10:07:29 | 13:14:55 | 3.1239 | 3.1239 |  | `5b85e42c2` | `8504fca5e` | UNCLEAR | feat: multi-activity leaderboards, river flow data, daily fly recommendations + Garmin app |
| 2026-03-27 | 65 | 14:58:27 | 15:45:26 | 0.7831 | 0.7831 |  | `1425c7db4` | `cd813b9c0` | UNCLEAR | feat: harden backend ΓÇö @upstash/redis SDK, relocate admin routes |
| 2026-03-27 | 66 | 16:30:27 | 17:19:17 | 0.8139 | 0.8139 |  | `76f645e89` | `e32728535` | UNCLEAR | feat: relocate React SPA into apps/wind workspace - Phase 3 monorepo migration |
| 2026-03-27 | 67 | 22:04:47 | 22:07:24 | 0.0436 | 0.0436 |  | `e99cc27bb` | `f49083c5d` | UNCLEAR | fix: update platform.test.js import to use @utahwind/weather package |
| 2026-03-27 | 68 | 22:52:27 | 00:06:07 | 1.2278 | 1.2278 |  | `d04278bba` | `ec0b1ecf8` | UNCLEAR | chore: add vercel.json for apps/water deployment |
| 2026-03-28 | 69 | 07:23:28 | 07:45:35 | 0.3686 | 0.3686 |  | `a7959c721` | `6247ab8fc` | UNCLEAR | feat: wire live weather data into water app boating/paddling views |
| 2026-03-28 | 70 | 10:50:24 | 10:50:24 | 0.2500 | 0.2500 | yes | `904b0374a` | `904b0374a` | UNCLEAR | feat: LocationSelector - progressive disclosure UX for water app. Move location selecti... |
| 2026-03-28 | 71 | 12:15:16 | 12:15:16 | 0.2500 | 0.2500 | yes | `5d0f74eed` | `5d0f74eed` | PRODUCT_ROUTINE | fix: convert App.jsx from UTF-16 to UTF-8 to resolve ESLint parse error |
| 2026-03-28 | 72 | 14:34:59 | 14:34:59 | 0.2500 | 0.2500 | yes | `da6568973` | `da6568973` | UNCLEAR | feat: widen water app layout to max-w-5xl, fix garbled em-dash encoding, add responsive... |
| 2026-03-28 | 73 | 15:58:14 | 15:58:14 | 0.2500 | 0.2500 | yes | `e65ba906e` | `e65ba906e` | UNCLEAR | feat: wire full prediction pipeline into hero with location badge upstream intelligence... |
| 2026-03-28 | 74 | 17:04:51 | 17:32:21 | 0.4583 | 0.4583 |  | `3d80da7f5` | `41c57fb6c` | CANDIDATE_R&D | feat(ml): implement XGBoost training pipeline and validate Utah Lake pressure gradient ... |
| 2026-03-28 | 75 | 18:20:30 | 18:47:15 | 0.4458 | 0.4458 |  | `e441eddfc` | `33d6c9e69` | UNCLEAR | chore: fix CI prepare hook, sync lockfile, and optimize Vite bundle size with code-spli... |
| 2026-03-28 | 76 | 19:39:08 | 19:39:08 | 0.2500 | 0.2500 | yes | `ee9cf2ade` | `ee9cf2ade` | PRODUCT_ROUTINE | feat: add SurfacePhysics engine, wire into Pin Drop UI, and restructure Dashboard to St... |
| 2026-03-28 | 77 | 21:29:02 | 21:51:32 | 0.3750 | 0.3750 |  | `66958da5d` | `67cb8c5d4` | UNCLEAR | feat(water): implement USGS live telemetry map and bio-thermodynamic fishing card |
| 2026-03-28 | 78 | 22:36:33 | 23:58:21 | 1.3633 | 1.3633 |  | `0da43e780` | `626eefcaa` | UNCLEAR | fix(water): compact fishing card, show water body name, taller map viewport |
| 2026-03-29 | 79 | 07:32:08 | 07:32:08 | 0.2500 | 0.2500 | yes | `571826c53` | `571826c53` | UNCLEAR | fix(water): remove false ocean detection from geocoder, bounding boxes only for naming |
| 2026-03-29 | 80 | 08:50:52 | 09:11:57 | 0.3514 | 0.3514 |  | `e01259b87` | `36183368f` | UNCLEAR | feat(water): multimodal aquatic comprehension with satellite imagery and Gemini 2.5 Fla... |
| 2026-03-29 | 81 | 12:57:16 | 13:30:00 | 0.5456 | 0.5456 |  | `cb2255cd4` | `2b896715a` | UNCLEAR | fix: revert to gemini-2.0-flash, 2.5-flash thinking model causes serverless timeouts |
| 2026-03-29 | 82 | 18:10:18 | 18:21:57 | 0.1942 | 0.1942 |  | `b931f813c` | `02b0825bd` | UNCLEAR | fix(water): bust stale Turbo cache and simplify bio-profile fetch |
| 2026-03-29 | 83 | 19:51:26 | 21:01:16 | 1.1639 | 1.1639 |  | `0243dd154` | `7a2aa4414` | UNCLEAR | fix(water): use AI forage data instead of freshwater insect hatches for dynamic profiles |
| 2026-03-30 | 84 | 08:39:54 | 08:39:54 | 0.2500 | 0.2500 | yes | `358c31980` | `358c31980` | PRODUCT_ROUTINE | feat: add Vercel Analytics, FeedbackWidget, and Admin Dashboard for platform management |
| 2026-03-30 | 85 | 09:29:03 | 09:29:03 | 0.2500 | 0.2500 | yes | `6eee9265b` | `6eee9265b` | PRODUCT_ROUTINE | fix(lint): resolve unused Icon variable in AdminDashboard |
| 2026-03-30 | 86 | 10:24:47 | 11:40:29 | 1.2617 | 1.2617 |  | `dde612527` | `b10054190` | UNCLEAR | fix: improve FeedbackWidget error logging to show actual error message |
| 2026-03-30 | 87 | 14:22:56 | 15:10:41 | 0.7958 | 0.7958 |  | `985d08222` | `2ddf3e7fe` | UNCLEAR | feat(wind): add dismissible WelcomeCard for first-time visitors |
| 2026-03-30 | 88 | 17:05:31 | 18:56:32 | 1.8503 | 1.8503 |  | `abb271ede` | `bcc91eaf2` | UNCLEAR | feat(water): migrate map to MapLibre with PMTiles vector water layer support |
| 2026-03-30 | 89 | 19:57:46 | 19:57:46 | 0.2500 | 0.2500 | yes | `678cde58d` | `678cde58d` | CANDIDATE_R&D | feat(api): add FREE radial weather endpoint using NWS/UDOT/Ambient - NO SYNOPTIC CHARGES |
| 2026-04-01 | 90 | 07:42:37 | 09:03:46 | 1.3525 | 1.3525 |  | `33dd79472` | `cd96096d0` | UNCLEAR | feat(water): add hover tooltips and improve river detection - OnX-style UX with water n... |
| 2026-04-01 | 91 | 12:28:42 | 12:28:42 | 0.2500 | 0.2500 | yes | `1c1548aab` | `1c1548aab` | UNCLEAR | feat(water): add Utah PMTiles regional POC with improved river detection |
| 2026-04-02 | 92 | 12:40:20 | 12:56:47 | 0.2742 | 0.2742 |  | `04ac7af67` | `5ad8c1e93` | UNCLEAR | feat: complete Stripe integration + fix service worker caching |
| 2026-04-02 | 93 | 17:39:47 | 17:55:10 | 0.2564 | 0.2564 |  | `e0a5beea7` | `ce69d1636` | UNCLEAR | feat: switch to magic link auth (no password required) |
| 2026-04-02 | 94 | 19:38:34 | 20:56:34 | 1.3000 | 1.3000 |  | `046028996` | `71da80d88` | UNCLEAR | debug: add logging to manageSubscription |
| 2026-04-03 | 95 | 08:10:35 | 08:10:35 | 0.2500 | 0.2500 | yes | `6243ebbde` | `6243ebbde` | UNCLEAR | Add tailwater logic - use downstream gauges for rivers below dams |
| 2026-04-04 | 96 | 08:53:02 | 08:53:02 | 0.2500 | 0.2500 | yes | `93b105cdb` | `93b105cdb` | UNCLEAR | Add coordinate debug logging to trace map coordinate bug |
| 2026-04-05 | 97 | 12:38:16 | 13:59:45 | 1.3581 | 1.3581 |  | `a4f27ae1a` | `284644957` | UNCLEAR | Improve water body name recognition from global PMTiles |
| 2026-04-05 | 98 | 15:07:32 | 15:07:32 | 0.2500 | 0.2500 | yes | `ef0e6683e` | `ef0e6683e` | UNCLEAR | Add toggleable wind field heatmap using SpatialInterpolator |
| 2026-04-06 | 99 | 07:14:09 | 07:33:20 | 0.3197 | 0.3197 |  | `fe8a9f99a` | `f0814485a` | UNCLEAR | Remove wind field heatmap - needs more work |
| 2026-04-06 | 100 | 15:36:54 | 18:34:53 | 2.9664 | 2.9664 |  | `f2a0dc94c` | `76aa96fc4` | UNCLEAR | Forecast-first dashboard redesign and Product-Led Growth Learn feature |
| 2026-04-06 | 101 | 19:50:44 | 19:55:43 | 0.0831 | 0.0831 |  | `e17f3600e` | `0828337ee` | UNCLEAR | Fix Garmin memory issues - use fixed circular buffers, reduce buffer sizes, add memory ... |
| 2026-04-07 | 102 | 15:06:25 | 16:28:48 | 1.3731 | 1.3731 |  | `ac9bcefa8` | `a08615c4b` | UNCLEAR | Add Forecast Intelligence Hero with cross-location ranking - New ForecastIntelligenceHe... |
| 2026-04-07 | 103 | 21:11:47 | 21:14:11 | 0.0400 | 0.0400 |  | `7005051df` | `52e400e04` | PRODUCT_ROUTINE | feat: Next Rideable Window in map popup with Pro paywall integration - Add findNextRide... |
| 2026-04-07 | 104 | 23:03:59 | 23:07:11 | 0.0533 | 0.0533 |  | `e904f9a56` | `bb15ed1a6` | UNCLEAR | fix: production readiness - Stripe webhook error handling, auth hardening, fake data re... |
| 2026-04-08 | 105 | 07:40:40 | 07:40:40 | 0.2500 | 0.2500 | yes | `a35641a18` | `a35641a18` | UNCLEAR | fix: add Deer Creek and Willard Bay to SMS alert location list |
| 2026-04-08 | 106 | 13:41:40 | 13:41:40 | 0.2500 | 0.2500 | yes | `a1b55a13d` | `a1b55a13d` | UNCLEAR | feat: wire Live Conditions Briefing into dashboard with sensor evidence and per-spot na... |
| 2026-04-08 | 107 | 17:28:32 | 17:55:17 | 0.4458 | 0.4458 |  | `f5bc28e15` | `a3e0537b1` | UNCLEAR | fix: expand station configs for PotM/ZigZag/overview, fix hasData ignoring WU, ungate k... |
| 2026-04-08 | 108 | 18:43:50 | 19:01:50 | 0.3000 | 0.3000 |  | `c190c95a3` | `5a83fed48` | UNCLEAR | fix: reduce ambient CDN cache to 10s to preserve 30s station update cadence |
| 2026-04-08 | 109 | 21:05:08 | 21:15:28 | 0.1722 | 0.1722 |  | `d95431a2c` | `15ffa4e88` | UNCLEAR | feat: add Wind badge + System Health tab to LiftForecast Command Center with live stati... |
| 2026-04-09 | 110 | 00:23:48 | 00:23:48 | 0.2500 | 0.2416 | yes | `93e2f1ee8` | `93e2f1ee8` | PRODUCT_ROUTINE | feat: wire SMS alert pipeline end-to-end with Twilio test endpoint and privacy policy |
| 2026-04-09 | 111 | 07:30:13 | 07:30:13 | 0.2500 | 0.2416 | yes | `6ec01aa28` | `6ec01aa28` | CANDIDATE_R&D | fix: improve station health accuracy by excluding UDOT from Synoptic check and distingu... |
| 2026-04-09 | 112 | 08:44:28 | 09:31:06 | 0.7772 | 0.7511 |  | `0703c51d5` | `0be296fcf` | UNCLEAR | feat: fix Garmin watch session uploads with device-based auth, update URLs to liftforec... |
| 2026-04-09 | 113 | 10:29:18 | 11:21:02 | 0.8622 | 0.8332 |  | `9893cca46` | `e931cabf6` | UNCLEAR | feat: add WU parallel cross-validation system with real-time source comparison, confide... |
| 2026-04-09 | 114 | 12:27:11 | 16:57:06 | 4.4986 | 4.3474 |  | `1c71c421a` | `ccb1dc984` | UNCLEAR | feat: independent auth and subscriptions for wind/water apps, fix notwindy.com admin da... |
| 2026-04-09 | 115 | 17:53:02 | 19:47:18 | 1.9044 | 1.8404 |  | `d89df4771` | `a9ae7af1e` | UNCLEAR | fix: move Deer Creek launch coords to actual kite spot on north shore |
| 2026-04-09 | 116 | 20:47:48 | 22:36:07 | 1.8053 | 1.7446 |  | `76d4d453e` | `bcb8df77a` | UNCLEAR | fix: use same-origin API calls for water app to avoid 308 redirect and cache issues |
| 2026-04-10 | 117 | 09:24:44 | 10:11:09 | 0.7736 | 0.7736 |  | `52eef1552` | `73f1f7d18` | UNCLEAR | feat: complete Utah fishing intelligence platform (Tasks 1-6) - Fix USGS Green River ga... |
| 2026-04-10 | 118 | 13:21:20 | 13:21:20 | 0.2500 | 0.2500 | yes | `828cec670` | `828cec670` | UNCLEAR | feat: segment Provo and Green rivers into distinct angler sections with unique coordina... |
| 2026-04-10 | 119 | 15:23:23 | 15:39:53 | 0.2750 | 0.2750 |  | `8eea8fbe0` | `8f54eeb78` | UNCLEAR | fix: map popup and hover tooltip now display segment-specific river names instead of ge... |
| 2026-04-10 | 120 | 18:27:02 | 18:27:02 | 0.2500 | 0.2500 | yes | `62575b2ab` | `62575b2ab` | UNCLEAR | feat: map card UX overhaul and global state sync on map click |
| 2026-04-10 | 121 | 22:03:17 | 22:03:17 | 0.2500 | 0.2500 | yes | `f286e41e3` | `f286e41e3` | UNCLEAR | fix: pin Fly Box, Lure Selection, Tackle Setup above the fold in map popup |
| 2026-04-11 | 122 | 02:29:24 | 02:29:24 | 0.2500 | 0.2500 | yes | `ed07e7bc2` | `ed07e7bc2` | UNCLEAR | fix: move gear recommendations to absolute top priority in map popup |
| 2026-04-11 | 123 | 09:02:58 | 09:43:30 | 0.6756 | 0.6756 |  | `010c4434e` | `b8a3d95b4` | UNCLEAR | fix: subscription portal routing to wrong domain and hover tooltip name override |
| 2026-04-11 | 124 | 10:48:57 | 12:31:18 | 1.7058 | 1.7058 |  | `39862b8ea` | `337b51f7f` | UNCLEAR | feat: LLM synthesis engine and regulation-aware gear filtering |
| 2026-04-11 | 125 | 13:34:53 | 13:34:53 | 0.2500 | 0.2500 | yes | `5794e365d` | `5794e365d` | UNCLEAR | fix: add Smallmouth Bass to Pineview and Willard, fix map click lake priority |
| 2026-04-11 | 126 | 16:27:46 | 17:23:44 | 0.9328 | 0.9328 |  | `3f7f7dcf5` | `52a766d38` | UNCLEAR | feat: freemium Pro blur paywall and 14-day free trial beta launch UI |
| 2026-04-11 | 127 | 18:16:46 | 18:23:33 | 0.1131 | 0.1131 |  | `5192cb622` | `2763ece31` | UNCLEAR | feat: inline Community Catches card and fix pill row scroll cutoff |
| 2026-04-11 | 128 | 22:34:14 | 22:34:14 | 0.2500 | 0.2500 | yes | `26936af98` | `26936af98` | UNCLEAR | fix: improve community upload error handling and add bucket fallback |
| 2026-04-12 | 129 | 08:15:28 | 08:54:02 | 0.6428 | 0.6428 |  | `5ad290d64` | `5e4a81ace` | UNCLEAR | feat: upgrade Community Catches UI with carousel, scrim, weather badges, engagement |
| 2026-04-12 | 130 | 11:02:56 | 11:08:12 | 0.0878 | 0.0878 |  | `c9a74cfa3` | `1ca09867d` | PRODUCT_ROUTINE | feat: Pro alert engine, smart catch log, and freemium content gating |
| 2026-04-12 | 131 | 12:00:33 | 13:37:40 | 1.6186 | 1.6186 |  | `86eab16e9` | `09a00e03b` | UNCLEAR | fix: avoid destructured rename lint error in AlertSettings |
| 2026-04-12 | 132 | 16:09:59 | 16:09:59 | 0.2500 | 0.2500 | yes | `c10b83734` | `c10b83734` | UNCLEAR | fix: enforce fishing regulations in recommendations ΓÇö no illegal bait on fly/lure-onl... |
| 2026-04-13 | 133 | 08:12:51 | 08:12:51 | 0.2500 | 0.2500 | yes | `f5a74e16f` | `f5a74e16f` | PRODUCT_ROUTINE | fix: correct Fish Lake species and regulations per outfitter feedback |
| 2026-04-13 | 134 | 18:51:44 | 18:51:44 | 0.2500 | 0.2500 | yes | `8dfd45897` | `8dfd45897` | CANDIDATE_R&D | feat: cross-link WU stations with all waters and enable fishing learning engine |
| 2026-04-13 | 135 | 20:10:50 | 20:16:03 | 0.0869 | 0.0869 |  | `2f20a8d35` | `dd87f90c0` | UNCLEAR | fix: replace barrel @utahwind/weather imports with direct file paths in serverless func... |
| 2026-04-13 | 136 | 23:57:46 | 23:57:46 | 0.2500 | 0.2500 | yes | `59789a5e7` | `59789a5e7` | CANDIDATE_R&D | fix: learning engine never saved weights due to SMISMEMBER null crash |
| 2026-04-14 | 137 | 07:19:49 | 08:40:27 | 1.3439 | 1.3439 |  | `757dfa6bb` | `d5a857145` | UNCLEAR | add run-learning admin diagnostic action |
| 2026-04-14 | 138 | 10:08:33 | 10:18:53 | 0.1722 | 0.1722 |  | `db99fc888` | `5e7b0595a` | UNCLEAR | feat: integrate Tempest WeatherFlow station at Deer Creek (Barbed Wire Beach) |
| 2026-04-14 | 139 | 13:48:23 | 13:53:05 | 0.0783 | 0.0783 |  | `f04d9b110` | `1a7b63a55` | CANDIDATE_R&D | feat: Synoptic migration validation + Deer Creek thermal corrections |
| 2026-04-14 | 140 | 16:26:46 | 16:26:46 | 0.2500 | 0.2500 | yes | `e1836665f` | `e1836665f` | PRODUCT_ROUTINE | fix: NWS forecast cache never expiring + Ambient PWS not in observations |
| 2026-04-16 | 141 | 08:41:34 | 08:52:40 | 0.1850 | 0.1850 |  | `bf0b743e4` | `167ecb949` | UNCLEAR | fix: watch session upload 400 + map line-cap error + Garmin app improvements |
| 2026-04-16 | 142 | 12:52:15 | 12:52:15 | 0.2500 | 0.2500 | yes | `4ab6813a5` | `4ab6813a5` | UNCLEAR | fix: remove activity_type from insert - column missing from Supabase table |
| 2026-04-16 | 143 | 14:03:51 | 14:03:51 | 0.2500 | 0.2500 | yes | `d0ce59564` | `d0ce59564` | PRODUCT_ROUTINE | fix: service worker bypasses server-rendered leaderboard/session pages |
| 2026-04-23 | 144 | 19:40:26 | 20:21:33 | 0.6853 | 0.6853 |  | `c9b455a51` | `b09599f72` | UNCLEAR | fix: critical audit bugs - dynamic routes, activity_type, spot matching, Tempest token |
| 2026-04-23 | 145 | 21:50:29 | 22:33:11 | 0.7117 | 0.7117 |  | `e1f0e6b87` | `18330d0a3` | UNCLEAR | fix: map click now switches location for Kolob and all water bodies |
| 2026-05-11 | 146 | 08:20:41 | 08:20:41 | 0.2500 | 0.2500 | yes | `065e5b24f` | `065e5b24f` | PRODUCT_ROUTINE | feat: add privacy policy and terms pages for Twilio A2P 10DLC compliance |
| 2026-05-14 | 147 | 15:04:49 | 15:04:49 | 0.2500 | 0.2500 | yes | `7e2b70644` | `7e2b70644` | UNCLEAR | fix: Wind Flow Cascade showing -- for FPS/UTOLY/QSF stations |
| 2026-05-28 | 148 | 09:38:49 | 09:38:49 | 0.2500 | 0.2500 | yes | `fe5ba66fa` | `fe5ba66fa` | CANDIDATE_R&D | fix(wind): replace Synoptic ridge stations with free NWS + Open-Meteo |
| 2026-05-28 | 149 | 15:02:12 | 15:02:12 | 0.2500 | 0.2500 | yes | `4a98d8122` | `4a98d8122` | CANDIDATE_R&D | feat(wind): RALPH validation harness + universal map meter coverage |
| 2026-05-28 | 150 | 16:40:24 | 16:40:24 | 0.2500 | 0.2500 | yes | `e97be9934` | `e97be9934` | PRODUCT_ROUTINE | fix(wind): remove unused isAirport var in VectorWindMap (lint) |
| 2026-05-28 | 151 | 19:00:42 | 19:00:42 | 0.2500 | 0.2500 | yes | `b639675c9` | `b639675c9` | UNCLEAR | feat(wind): auto-populate wind meters on map pan/zoom (no click required) |
| 2026-05-28 | 152 | 21:37:38 | 21:37:38 | 0.2500 | 0.2500 | yes | `0ee530e79` | `0ee530e79` | UNCLEAR | feat(wind): combined free-source dense field ΓÇö NWS + UDOT + WU (no key needed) |
| 2026-05-29 | 153 | 07:07:03 | 07:10:34 | 0.0586 | 0.0586 |  | `f5e4f9e23` | `4b542fe2e` | CANDIDATE_R&D | feat(prediction): dense stations now feed ThermalPredictor + cross-validation feat(map)... |
| 2026-05-29 | 154 | 09:25:28 | 09:48:08 | 0.3778 | 0.3778 |  | `83d09f31f` | `ce3e0c568` | UNCLEAR | feat(wind): LaunchBriefingCard ΓÇö per-launch "Right now / Why / When" briefing |
| 2026-05-29 | 155 | 12:17:11 | 12:17:11 | 0.2500 | 0.2500 | yes | `f60f135ea` | `f60f135ea` | UNCLEAR | feat(map): real wind arrows ΓÇö SDF symbol layer w/ speed tint + bearing rotation |
| 2026-05-29 | 156 | 13:23:08 | 13:23:08 | 0.2500 | 0.2500 | yes | `34af5f57b` | `34af5f57b` | UNCLEAR | polish(map): beef up wind arrows ~70% larger + 128px canvas for crispness |
| 2026-05-30 | 157 | 08:10:52 | 08:16:07 | 0.0875 | 0.0875 |  | `f29762a2c` | `89571eb20` | UNCLEAR | ui(map): rename header to 'Live Wind Map' (focus location as subtitle) |
| 2026-05-31 | 158 | 09:31:12 | 10:13:34 | 0.7061 | 0.7061 |  | `c183893e4` | `dad66d0d2` | UNCLEAR | feat(wind): dedicated BoatingTemplate for calm-water activities (boating/paddling/fishing) |
| 2026-05-31 | 159 | 11:58:52 | 12:50:11 | 0.8553 | 0.8553 |  | `3ac833b27` | `22872643d` | UNCLEAR | feat(water): activity-aware upload modal ΓÇö adapts title, fields, and tags for boating... |
| 2026-06-01 | 160 | 11:04:45 | 11:22:57 | 0.3033 | 0.3033 |  | `003f08203` | `f43e4f12f` | UNCLEAR | feat: self-adjusting learning engine + cleaner UX for spot selection |
| 2026-06-03 | 161 | 08:08:16 | 08:54:18 | 0.7672 | 0.7672 |  | `4b1d30d5f` | `80e5b3ab1` | UNCLEAR | fix: unify prediction logic and add station sanity checks |
| 2026-06-04 | 162 | 07:45:13 | 08:19:36 | 0.5731 | 0.5731 |  | `1c3f8be2f` | `3b0442899` | UNCLEAR | fix: never say GO when ground truth is 0, fix off-arc bug, add network consensus |
| 2026-06-04 | 163 | 10:35:44 | 10:35:44 | 0.2500 | 0.2500 | yes | `76943d887` | `76943d887` | UNCLEAR | feat: inject PWS into map wind field, fix zoom drift, Garmin session upload diagnostics |
| 2026-06-04 | 164 | 11:47:25 | 11:47:25 | 0.2500 | 0.2500 | yes | `d0e362d11` | `d0e362d11` | CANDIDATE_R&D | fix: remove fake Open-Meteo grid points from map, skip water body grid sampling |
| 2026-06-04 | 165 | 15:19:27 | 15:19:27 | 0.2500 | 0.2500 | yes | `7b091b7fa` | `7b091b7fa` | UNCLEAR | fix: extend thermal forecast through sunset, redesign timeline bars for instant readabi... |
| 2026-06-04 | 166 | 16:22:53 | 16:22:53 | 0.2500 | 0.2500 | yes | `50249508a` | `50249508a` | CANDIDATE_R&D | fix: wind field accuracy, north flow recognition, live timeline override |
| 2026-08-13 | 167 | 17:56:40 | 17:56:40 | 0.2500 | 0.2500 | yes | `84f03cff0` | `84f03cff0` | PRODUCT_ROUTINE | feat: reply to Command Center feedback and fix the open water-app tickets |
| 2026-08-13 | 168 | 19:40:04 | 20:14:46 | 0.5783 | 0.5783 |  | `d3c200750` | `2a6338c76` | UNCLEAR | fix: read Resend env at send time and fall back to mail app |

---

## Limitations

- A commit timestamp is not continuous work. The span from first to last commit in a session ignores breaks shorter than 45 minutes and ignores work done with no commit.
- Work with no commit is invisible. Quiet calendar days are zeros, not proof that nothing happened.
- The 15-minute singleton is a conventional default, not an observation. It accounts for **17.483196** of the **91.873056** reconstructed hours.
- UNCLEAR (**84.1518** hours) is not a leftover to relabel as research. Those sessions contain a mix, or a message that did not match either list. Several research commits (including the KPVU indicator fix on 2026-03-12 and the WindField / backtest commits) sit inside UNCLEAR sessions because a neighboring commit within 45 minutes did not match the research rule. Their hours stay in UNCLEAR. They were not split.
- A CANDIDATE_R&D tag means every commit subject in that session matched the research list. It does not mean a CPA has allowed the cost.
- These are not payroll hours, not W-2 hours, and not a Form 6765 figure.
- Three merge commits by the same author were excluded from timing because those days already have non-merge commits:
  - `4a9f7d8a` 2026-03-27T21:48:22−06:00 Merge pull request #3
  - `4b807362` 2026-03-27T22:00:28−06:00 Merge pull request #4
  - `88ca8a70` 2026-03-28T18:16:48−06:00 Merge branch `master`
- Cursor Agent’s four commits are excluded and were not given the 15-minute default.

---

## Reproducibility appendix — tag patterns

Research subject pattern (case insensitive), commit class R when this matches and the routine pattern does not:

`correlat|indicator|kslc|kpvu|qsf|utalp|spanish fork|windfield|propagation|xgboost|backtest|ralph|synoptic|smismember|learning (engine|system|cycle)|dirbias|speedbias|smartforecast|math.random|nowcast|cross-validation|model rebuild|rebuild-models|historical analysis|thermalpredictor|thermal predictor|pressure gradient|translation factor|translationmodels|ground truth|open-meteo grid|windstream|station sanity|unifiedpredictor|frontaltrend|session validation|chain validation|nws-historical|kiteable|north flow|se thermal|gap wind|hrrr|wind error|precursor|activity prediction|forecast engine|learning loop|model weight|weights due|collectactuals|pattern-analyzer|upstream translation|physics-based|meso-relational|correlation engine`

Routine subject pattern, commit class P when this matches and the research pattern does not:

`dark mode|light mode|contrast|rebrand|notwindy|branding|stripe|paywall|freemium|pro upgrade|resend|feedback|mailto|admin login|eslint|lint|synoptic token|ci workflow|github actions|privacy|terms|onboarding|icon|splash|manifest|capacitor|storybook|dashboard ui|typo|command center|meta pixel|campaign|ads manager|login|signup|password|monorepo|turborepo|code-splitting|bundle|visualizer|service worker|cache|og image|copy tweak|wording|readme|placeholder|lorem|showing --`

Path-only override (used only when the subject matches neither, and only when **every** path in the commit qualifies): research prefixes `packages/ml/`, `scripts/(analyze|backtest|ralph|rebuild-models|nws-historical|historical|compare-models|validation-health|chain-validation)`, and the prediction/learning/forecast docs named in the handoff. Routine prefixes: `ios/`, app `public/`, `.github/`, `apps/water/campaigns/`.

---

## Paste summary

RECONSTRUCTED_GIT_HOURS for utah-wind-pro (not a timesheet, not payroll): **91.873056** hours after the 10.0-hour daily cap. Before the cap: 92.220833. Cap hit only 2026-04-09.

Sole git human: climbingpro-creator / climbingpro@gmail.com. Tyler must confirm that is him and that he was the only human committing. Cursor Agent (4 commits, other branch) excluded. 3 merge commits excluded. All timestamps −06:00.

561 non-merge commits, 168 sessions (new session if gap > 45 minutes; single commit = 15 minutes). Singleton default is 17.483196 hours of the total.

By tag: CANDIDATE_R&D 4.3519 h (18 sessions); PRODUCT_ROUTINE 3.3694 h (15 sessions); UNCLEAR 84.1518 h (135 sessions). UNCLEAR is not research. Mixed 45-minute blocks were not split.

Months: Mar 48.9328, Apr 35.1331, May 4.3353, Jun 2.6436, Aug 0.8283.

Detail: docs/rd-git-hours-reconstruction.md and docs/rd-git-hours-sessions.csv.
