/**
 * LaunchBriefingCard — answers three questions for the currently selected
 * launch using hardcoded LAKE_CONFIGS coords + safe wind arc + indicator
 * stations:
 *
 *   1. RIGHT NOW       — what is the wind doing at this launch?
 *   2. WHY             — what indicators are firing?
 *   3. WHEN IT STOPS   — what does today's hourly look like?
 *
 * All reasoning is driven by predictThermal() which is now backed by the
 * LiveStationField dense observation network.
 */

import { useMemo } from 'react';
import { Wind, ArrowRight, AlertTriangle, CheckCircle, Sparkles, Activity } from 'lucide-react';
import { predictThermal, LAKE_CONFIGS } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass = (d) => d == null ? '—' : COMPASS[Math.round((((d % 360) + 360) % 360) / 22.5) % 16];

function dirInArc(dir, arc) {
  if (dir == null || !arc) return false;
  const d = (((dir % 360) + 360) % 360);
  const [min, max] = Array.isArray(arc) ? arc : [arc.min, arc.max];
  if (min == null || max == null) return false;
  if (min <= max) return d >= min && d <= max;
  return d >= min || d <= max;
}

function fmtHour(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`;
}

// Map predictThermal.phase → display colors
const PHASE_STYLES = {
  'pre-thermal': { label: 'Pre-thermal',  bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/30',   icon: '🌅' },
  'building':    { label: 'Building',     bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30',  icon: '📈' },
  'peak':        { label: 'PEAK',         bg: 'bg-emerald-500/15',text: 'text-emerald-300',border: 'border-emerald-500/30',icon: '🔥' },
  'fading':      { label: 'Fading',       bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', icon: '🌇' },
  'ended':       { label: 'Ended',        bg: 'bg-slate-500/15',  text: 'text-slate-300',  border: 'border-slate-500/30',  icon: '💤' },
};

/**
 * Scan an hourly forecast array and find the next time the wind:
 *   - enters the safe arc with ≥8 mph (onset)
 *   - reaches its daily peak inside the arc (peak)
 *   - drops below 5 mph or exits the arc (fade)
 *   - re-enters at a strong off-arc direction (frontal-blowout warning)
 */
function buildWindowFromHourly(hourly, safeArc, optimalArc) {
  if (!Array.isArray(hourly) || hourly.length === 0) return null;

  const now = Date.now();
  let onset = null, peak = null, fade = null, blowout = null;
  let peakSpeed = 0;

  for (const h of hourly) {
    const t = new Date(h.time || h.startTime).getTime();
    if (!Number.isFinite(t) || t < now - 30 * 60_000) continue; // skip past

    const speed = h.adjustedWind ?? h.speed ?? h.windSpeed ?? null;
    const dir = h.windDirection ?? h.direction ?? null;
    if (speed == null) continue;

    const inSafe = dirInArc(dir, safeArc);
    const inOpt = dirInArc(dir, optimalArc);
    const usable = speed >= 8 && inSafe;

    if (usable) {
      if (!onset) onset = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
      if (speed > peakSpeed) {
        peakSpeed = speed;
        peak = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
      }
      fade = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
    }

    // Frontal blowout: strong wind (>15 mph) outside the safe arc
    if (!blowout && speed >= 15 && !inSafe) {
      blowout = { time: h.time || h.startTime, speed, dir };
    }
  }

  // The "fade" we tracked is actually the LAST usable hour — promote it,
  // and set a real "fadeEnd" to the next hour that drops below usable
  return { onset, peak, fade, blowout, peakSpeed };
}

export default function LaunchBriefingCard({ lakeId, lakeState, hourlyForecast, isLoading = false }) {
  const config = LAKE_CONFIGS[lakeId];

  // Build the predict() input from lakeState (matches DataCollector pattern)
  const conditions = useMemo(() => {
    if (!lakeState) return {};
    return {
      windSpeed: lakeState?.pws?.windSpeed ?? lakeState?.wind?.stations?.[0]?.speed,
      windDirection: lakeState?.pws?.windDirection ?? lakeState?.wind?.stations?.[0]?.direction,
      temperature: lakeState?.pws?.temperature,
      pressureGradient: lakeState?.pressure?.gradient,
      thermalDelta: lakeState?.thermal?.delta,
      pumpActive: lakeState?.thermal?.pumpActive,
      inversionTrapped: lakeState?.thermal?.inversionTrapped,
      spanishForkWind: lakeState?.earlyIndicator
        ? { speed: lakeState.earlyIndicator.windSpeed, direction: lakeState.earlyIndicator.windDirection }
        : null,
      kslcWind: lakeState?.kslcStation
        ? { speed: lakeState.kslcStation.windSpeed, direction: lakeState.kslcStation.windDirection }
        : null,
      kpvuWind: lakeState?.kpvuStation
        ? { speed: lakeState.kpvuStation.windSpeed, direction: lakeState.kpvuStation.windDirection }
        : null,
      utalpWind: lakeState?.utalpStation
        ? { speed: lakeState.utalpStation.windSpeed, direction: lakeState.utalpStation.windDirection }
        : null,
      wahsatchWind: lakeState?.wahsatchStation
        ? { speed: lakeState.wahsatchStation.windSpeed, direction: lakeState.wahsatchStation.windDirection }
        : null,
    };
  }, [lakeState]);

  const prediction = useMemo(() => {
    if (!lakeId) return null;
    try { return predictThermal(lakeId, conditions); } catch { return null; }
  }, [lakeId, conditions]);

  const window = useMemo(
    () => buildWindowFromHourly(hourlyForecast, config?.safeWindArc, prediction?.direction?.optimal),
    [hourlyForecast, config?.safeWindArc, prediction?.direction?.optimal]
  );

  if (isLoading || !config) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-2/3" />
          <div className="h-4 bg-slate-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // ── Current conditions snapshot ──────────────────────────────────
  const curSpeed = conditions.windSpeed ?? null;
  const curDir = conditions.windDirection ?? null;
  const curGust = lakeState?.pws?.windGust ?? lakeState?.wind?.stations?.[0]?.gust ?? null;
  const inSafe = dirInArc(curDir, config.safeWindArc);
  const inOptimal = dirInArc(curDir, prediction?.direction?.optimal);

  const directionBadge = inOptimal
    ? { text: 'IN OPTIMAL ARC',  cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: <CheckCircle className="w-3 h-3" /> }
    : inSafe
    ? { text: 'in safe arc',     cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40',             icon: <CheckCircle className="w-3 h-3" /> }
    : curDir == null
    ? { text: 'no direction',    cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40',       icon: <Activity className="w-3 h-3" /> }
    : { text: 'off-arc',         cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',          icon: <AlertTriangle className="w-3 h-3" /> };

  // ── Why-bullets (built from prediction's indicator slots) ────────
  const whyBullets = [];
  if (prediction?.spanishFork?.status === 'strong' || prediction?.spanishFork?.status === 'moderate') {
    whyBullets.push({
      icon: '🌬️',
      label: 'Spanish Fork firing',
      detail: prediction.spanishFork.message,
      cls: 'text-emerald-300',
    });
  }
  if (prediction?.northFlow?.status === 'strong' || prediction?.northFlow?.status === 'moderate') {
    whyBullets.push({
      icon: '⬇️',
      label: 'North flow active',
      detail: prediction.northFlow.message,
      cls: 'text-amber-300',
    });
  }
  if (conditions.pressureGradient != null) {
    const g = conditions.pressureGradient;
    if (g < -0.5) whyBullets.push({
      icon: '📉',
      label: 'Pressure gradient thermal-favorable',
      detail: `SLC-PVU = ${safeToFixed(g, 2)} mb (negative = thermal-supportive)`,
      cls: 'text-emerald-300',
    });
    else if (g > 1.5) whyBullets.push({
      icon: '🚫',
      label: 'Pressure gradient against thermal',
      detail: `SLC-PVU = +${safeToFixed(g, 2)} mb (positive = north flow dominates)`,
      cls: 'text-rose-300',
    });
  }
  if (prediction?.direction?.status === 'optimal') {
    whyBullets.push({
      icon: '🎯',
      label: 'Direction is bullseye',
      detail: `${compass(curDir)} (${curDir}°) — inside ${prediction.direction.optimal?.min}°–${prediction.direction.optimal?.max}° optimal`,
      cls: 'text-emerald-300',
    });
  }
  if (whyBullets.length === 0 && prediction) {
    whyBullets.push({
      icon: 'ℹ️',
      label: prediction.phaseMessage || 'No strong indicators firing',
      detail: prediction.prediction?.message || '',
      cls: 'text-slate-400',
    });
  }

  const phaseStyle = PHASE_STYLES[prediction?.phase] || PHASE_STYLES['pre-thermal'];

  // ── Live indicator readouts ──────────────────────────────────────
  const indicators = [];
  if (lakeState?.kslcStation?.windSpeed != null) {
    indicators.push({
      id: 'KSLC', name: 'SLC Airport',
      speed: lakeState.kslcStation.windSpeed,
      dir: lakeState.kslcStation.windDirection,
      pressure: lakeState.pressure?.high?.value,
    });
  }
  if (lakeState?.earlyIndicator?.windSpeed != null) {
    indicators.push({
      id: 'QSF', name: 'Spanish Fork Canyon',
      speed: lakeState.earlyIndicator.windSpeed,
      dir: lakeState.earlyIndicator.windDirection,
    });
  }
  if (lakeState?.kpvuStation?.windSpeed != null) {
    indicators.push({
      id: 'KPVU', name: 'Provo Airport',
      speed: lakeState.kpvuStation.windSpeed,
      dir: lakeState.kpvuStation.windDirection,
      pressure: lakeState.pressure?.low?.value,
    });
  }
  if (lakeState?.utalpStation?.windSpeed != null) {
    indicators.push({
      id: 'UTALP', name: 'Point of Mountain',
      speed: lakeState.utalpStation.windSpeed,
      dir: lakeState.utalpStation.windDirection,
    });
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header — Spot name + current conditions */}
      <div className={`px-5 py-4 border-b border-slate-700/60 ${phaseStyle.bg}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <Wind className="w-3.5 h-3.5" />
              Launch-aware Briefing
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{config.name || lakeId}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {config.region || ''}{config.primaryWindType ? ` · ${config.primaryWindType}` : ''}
            </p>
          </div>
          {curSpeed != null && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white tabular-nums leading-tight">
                {Math.round(curSpeed)}<span className="text-base font-medium text-slate-400 ml-1">mph</span>
              </div>
              <div className="text-sm text-slate-300 mt-0.5">
                {compass(curDir)} {curDir != null && <span className="text-slate-500 text-xs">({curDir}°)</span>}
                {curGust ? <span className="text-slate-400 ml-2">g{Math.round(curGust)}</span> : null}
              </div>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${directionBadge.cls}`}>
                {directionBadge.icon}
                {directionBadge.text}
              </span>
            </div>
          )}
        </div>

        {/* Phase pill */}
        {prediction && (
          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${phaseStyle.text} ${phaseStyle.border} ${phaseStyle.bg}`}>
            <span>{phaseStyle.icon}</span>
            <span>{phaseStyle.label.toUpperCase()}</span>
            <span className="text-slate-400 text-xs font-normal ml-1">
              {prediction.phaseMessage}
            </span>
          </div>
        )}
      </div>

      {/* WHY IT'S WORKING (or not) */}
      <div className="px-5 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Why
        </div>
        <ul className="space-y-2">
          {whyBullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-base leading-none mt-0.5">{b.icon}</span>
              <div className="flex-1">
                <div className={`font-semibold ${b.cls}`}>{b.label}</div>
                {b.detail && <div className="text-xs text-slate-400 mt-0.5">{b.detail}</div>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* TODAY'S WINDOW */}
      <div className="px-5 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          <ArrowRight className="w-3.5 h-3.5" />
          Today's Window
        </div>
        {window && (window.onset || window.peak) ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800/60 rounded-lg py-2.5 px-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Onset</div>
              <div className="text-base font-bold text-white mt-1">{window.onset ? fmtHour(window.onset.time) : '—'}</div>
              {window.onset && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {Math.round(window.onset.speed)} mph {compass(window.onset.dir)}
                </div>
              )}
            </div>
            <div className={`rounded-lg py-2.5 px-2 ${window.peak?.inOptimal ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : 'bg-slate-800/60'}`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Peak</div>
              <div className={`text-base font-bold mt-1 ${window.peak?.inOptimal ? 'text-emerald-300' : 'text-white'}`}>
                {window.peak ? fmtHour(window.peak.time) : '—'}
              </div>
              {window.peak && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {Math.round(window.peak.speed)} mph {compass(window.peak.dir)}
                </div>
              )}
            </div>
            <div className="bg-slate-800/60 rounded-lg py-2.5 px-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Fade</div>
              <div className="text-base font-bold text-white mt-1">{window.fade ? fmtHour(window.fade.time) : '—'}</div>
              {window.fade && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {Math.round(window.fade.speed)} mph {compass(window.fade.dir)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No usable window remaining today in the safe arc.</div>
        )}

        {window?.blowout && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Off-arc blowout {fmtHour(window.blowout.time)}</div>
              <div className="text-rose-400/80 mt-0.5">
                {Math.round(window.blowout.speed)} mph from {compass(window.blowout.dir)} ({window.blowout.dir}°) — outside {config.safeWindArc?.[0]}°–{config.safeWindArc?.[1]}° safe arc. Get off the water.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LIVE INDICATORS */}
      {indicators.length > 0 && (
        <div className="px-5 py-3 bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            Live Indicators
          </div>
          <div className="grid gap-1.5">
            {indicators.map((ind) => (
              <div key={ind.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-slate-500 mr-2">{ind.id}</span>
                  <span className="text-slate-400">{ind.name}</span>
                </div>
                <div className="font-mono text-slate-300">
                  {safeToFixed(ind.speed, 1)} mph {compass(ind.dir)}
                  {ind.pressure && <span className="text-slate-500 ml-2">{safeToFixed(ind.pressure, 2)} inHg</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
