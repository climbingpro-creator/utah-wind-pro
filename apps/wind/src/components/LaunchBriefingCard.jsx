/**
 * LaunchBriefingCard — premium per-launch briefing.
 *
 * Answers three questions for the currently selected launch using
 * hardcoded LAKE_CONFIGS coords + safe wind arc + indicator stations:
 *
 *   1. RIGHT NOW       — what is the wind doing at this launch?
 *   2. WHY             — what indicators are firing?
 *   3. WHEN IT STOPS   — what does today's hourly look like?
 *
 * All reasoning is driven by predictThermal() which is now backed by the
 * LiveStationField dense observation network.
 */

import { useMemo } from 'react';
import { Wind, AlertTriangle, CheckCircle, Sparkles, Activity, Clock } from 'lucide-react';
import { predictThermal, LAKE_CONFIGS } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

// ─── Constants ──────────────────────────────────────────────────────
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass = (d) => d == null ? '—' : COMPASS[Math.round((((d % 360) + 360) % 360) / 22.5) % 16];

const PHASE_STYLES = {
  'pre-thermal': { label: 'Pre-thermal', tone: 'blue',    icon: '🌅', gradient: 'from-blue-500/15 via-slate-900/0 to-transparent' },
  'building':    { label: 'Building',    tone: 'amber',   icon: '📈', gradient: 'from-amber-500/15 via-slate-900/0 to-transparent' },
  'peak':        { label: 'Peak',        tone: 'emerald', icon: '🔥', gradient: 'from-emerald-500/20 via-slate-900/0 to-transparent' },
  'fading':      { label: 'Fading',      tone: 'orange',  icon: '🌇', gradient: 'from-orange-500/15 via-slate-900/0 to-transparent' },
  'ended':       { label: 'Ended',       tone: 'slate',   icon: '💤', gradient: 'from-slate-500/10 via-slate-900/0 to-transparent' },
};

const TONE_CLASSES = {
  blue:    { text: 'text-blue-300',    bg: 'bg-blue-500/15',    border: 'border-blue-500/40',    glow: 'shadow-blue-500/20' },
  amber:   { text: 'text-amber-300',   bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   glow: 'shadow-amber-500/20' },
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/30' },
  orange:  { text: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-500/40',  glow: 'shadow-orange-500/20' },
  slate:   { text: 'text-slate-300',   bg: 'bg-slate-500/15',   border: 'border-slate-500/40',   glow: 'shadow-slate-500/20' },
  rose:    { text: 'text-rose-300',    bg: 'bg-rose-500/15',    border: 'border-rose-500/40',    glow: 'shadow-rose-500/20' },
  sky:     { text: 'text-sky-300',     bg: 'bg-sky-500/15',     border: 'border-sky-500/40',     glow: 'shadow-sky-500/20' },
};

// Beaufort-style speed color for stat blocks
function speedColorClass(speed) {
  if (speed == null || speed < 3)  return 'text-slate-300';
  if (speed < 8)                    return 'text-sky-300';
  if (speed < 12)                   return 'text-cyan-300';
  if (speed < 18)                   return 'text-emerald-300';
  if (speed < 25)                   return 'text-amber-300';
  return 'text-rose-300';
}

// ─── Geometry helpers ──────────────────────────────────────────────
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

// ─── DirectionDial ─────────────────────────────────────────────────
// Circular dial showing current wind direction inside the safe arc.
// The arc is rendered as a colored ring sector, the dial pointer rotates
// to the wind direction. Clean and immediately legible.
function DirectionDial({ dir, safeArc, optimalArc, size = 72 }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  // Convert arc to SVG arc path. SVG 0° = north, clockwise.
  function arcPath(start, end, radius, opening = 1) {
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const sx = cx + radius * Math.cos(startRad);
    const sy = cy + radius * Math.sin(startRad);
    const ex = cx + radius * Math.cos(endRad);
    const ey = cy + radius * Math.sin(endRad);
    let sweep = end - start;
    if (sweep < 0) sweep += 360;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} ${opening} ${ex} ${ey}`;
  }

  const arc = Array.isArray(safeArc) ? safeArc : null;
  const opt = optimalArc && optimalArc.min != null ? [optimalArc.min, optimalArc.max] : null;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="flex-shrink-0">
      {/* Outer track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(51 65 85 / 0.6)" strokeWidth="2.5" />
      {/* Safe arc */}
      {arc && (
        <path d={arcPath(arc[0], arc[1], r)} fill="none" stroke="rgb(56 189 248 / 0.55)" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Optimal arc — thicker, brighter */}
      {opt && (
        <path d={arcPath(opt[0], opt[1], r)} fill="none" stroke="rgb(52 211 153 / 0.85)" strokeWidth="4" strokeLinecap="round" />
      )}
      {/* Cardinal letters */}
      <g className="fill-slate-500 text-[8px] font-bold" textAnchor="middle" dominantBaseline="middle">
        <text x={cx} y={6}>N</text>
        <text x={size - 6} y={cy}>E</text>
        <text x={cx} y={size - 6}>S</text>
        <text x={6} y={cy}>W</text>
      </g>
      {/* Wind direction pointer */}
      {dir != null && (
        <g transform={`rotate(${dir} ${cx} ${cy})`} style={{ transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - r + 6} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points={`${cx},${cy - r + 4} ${cx - 4},${cy - r + 12} ${cx + 4},${cy - r + 12}`}
            fill="white"
          />
          <circle cx={cx} cy={cy} r="3" fill="white" />
        </g>
      )}
      {!dir && <circle cx={cx} cy={cy} r="3" fill="rgb(100 116 139)" />}
    </svg>
  );
}

// ─── Window detection ──────────────────────────────────────────────
function buildWindowFromHourly(hourly, safeArc, optimalArc) {
  if (!Array.isArray(hourly) || hourly.length === 0) return null;

  const now = Date.now();
  let onset = null, peak = null, fade = null, blowout = null;
  let peakSpeed = 0;
  const points = [];

  for (const h of hourly) {
    const t = new Date(h.time || h.startTime).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < now - 30 * 60_000) continue;

    const speed = h.adjustedWind ?? h.speed ?? h.windSpeed ?? null;
    const dir = h.windDirection ?? h.direction ?? null;
    if (speed == null) continue;

    const inSafe = dirInArc(dir, safeArc);
    const inOpt = dirInArc(dir, optimalArc);
    const usable = speed >= 8 && inSafe;

    points.push({ t, time: h.time || h.startTime, speed, dir, inSafe, inOpt });

    if (usable) {
      if (!onset) onset = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
      if (speed > peakSpeed) {
        peakSpeed = speed;
        peak = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
      }
      fade = { time: h.time || h.startTime, speed, dir, inOptimal: inOpt };
    }

    if (!blowout && speed >= 15 && !inSafe) {
      blowout = { time: h.time || h.startTime, speed, dir };
    }
  }

  return { onset, peak, fade, blowout, peakSpeed, points };
}

// ─── Timeline strip ─────────────────────────────────────────────────
// Renders today's wind as a horizontal sparkline strip. Each hour is a
// vertical bar — height encodes speed, color encodes inSafe/inOptimal/
// off-arc. The "now" marker is a vertical white line.
function TimelineStrip({ points }) {
  if (!Array.isArray(points) || points.length === 0) return null;

  const maxSpeed = Math.max(15, ...points.map(p => p.speed || 0));
  const now = Date.now();
  const nowIdx = points.findIndex(p => p.t >= now);

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] h-12">
        {points.map((p) => {
          const h = Math.max(4, (p.speed / maxSpeed) * 44);
          const color =
            !p.inSafe ? 'bg-rose-500/40'
            : p.inOpt ? 'bg-emerald-400/80'
            : p.speed >= 8 ? 'bg-sky-400/60'
            : 'bg-slate-500/40';
          return (
            <div
              key={p.time}
              className={`flex-1 rounded-t-sm ${color} transition-all`}
              style={{ height: `${h}px` }}
              title={`${fmtHour(p.time)}: ${Math.round(p.speed)} mph ${compass(p.dir)}`}
            />
          );
        })}
      </div>
      {/* Now marker */}
      {nowIdx >= 0 && (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-white/90 pointer-events-none"
          style={{ left: `calc(${(nowIdx / points.length) * 100}% - 1px)` }}
        >
          <div className="absolute -top-1 -left-[5px] w-2 h-2 rounded-full bg-white shadow-lg" />
        </div>
      )}
      {/* Hour ticks */}
      <div className="flex justify-between text-[9px] text-slate-500 mt-1 tabular-nums">
        {points.length > 0 && (
          <>
            <span>{fmtHour(points[0].time)}</span>
            {points.length > 4 && <span>{fmtHour(points[Math.floor(points.length / 2)].time)}</span>}
            <span>{fmtHour(points[points.length - 1].time)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Indicator pill ─────────────────────────────────────────────────
function IndicatorPill({ id, name, speed, dir, pressure }) {
  const dirCompass = compass(dir);
  const speedColor = speedColorClass(speed);
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/70 hover:border-slate-600/60 transition-colors">
      <div className="flex-shrink-0 w-9 h-9 rounded-md bg-slate-900/60 flex items-center justify-center border border-slate-700/50">
        {dir != null ? (
          <svg width="18" height="18" viewBox="0 0 18 18">
            <g transform={`rotate(${dir} 9 9)`} style={{ transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <line x1="9" y1="9" x2="9" y2="3" stroke="currentColor" strokeWidth="1.5" className="text-slate-300" strokeLinecap="round" />
              <polygon points="9,2 7,6 11,6" fill="currentColor" className="text-slate-300" />
            </g>
          </svg>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 leading-tight">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{id}</span>
          <span className="text-xs text-slate-300 truncate">{name}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
          <span className={`text-sm font-semibold ${speedColor}`}>{safeToFixed(speed, 1)}</span>
          <span className="text-[10px] text-slate-500">mph</span>
          <span className="text-xs text-slate-400">{dirCompass}</span>
          {pressure && (
            <span className="text-[10px] text-slate-500 ml-auto">{safeToFixed(pressure, 2)} inHg</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export default function LaunchBriefingCard({ lakeId, lakeState, hourlyForecast, isLoading = false }) {
  const config = LAKE_CONFIGS[lakeId];

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

  const forecastWindow = useMemo(
    () => buildWindowFromHourly(hourlyForecast, config?.safeWindArc, prediction?.direction?.optimal),
    [hourlyForecast, config?.safeWindArc, prediction?.direction?.optimal]
  );

  if (isLoading || !config) {
    return (
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-slate-700/60 animate-pulse">
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-slate-700/50 rounded w-2/3" />
          <div className="h-4 bg-slate-700/50 rounded w-1/2" />
          <div className="h-12 bg-slate-700/30 rounded mt-4" />
        </div>
      </div>
    );
  }

  // Current conditions
  const curSpeed = conditions.windSpeed ?? null;
  const curDir = conditions.windDirection ?? null;
  const curGust = lakeState?.pws?.windGust ?? lakeState?.wind?.stations?.[0]?.gust ?? null;
  const inSafe = dirInArc(curDir, config.safeWindArc);
  const inOptimal = dirInArc(curDir, prediction?.direction?.optimal);

  const directionBadge = inOptimal
    ? { text: 'Optimal arc',  tone: 'emerald', icon: <CheckCircle className="w-3 h-3" /> }
    : inSafe
    ? { text: 'Safe arc',     tone: 'sky',     icon: <CheckCircle className="w-3 h-3" /> }
    : curDir == null
    ? { text: 'No data',      tone: 'slate',   icon: <Activity className="w-3 h-3" /> }
    : { text: 'Off-arc',      tone: 'rose',    icon: <AlertTriangle className="w-3 h-3" /> };
  const badgeCls = TONE_CLASSES[directionBadge.tone];

  const phaseStyle = PHASE_STYLES[prediction?.phase] || PHASE_STYLES['pre-thermal'];
  const phaseTone = TONE_CLASSES[phaseStyle.tone];

  // Why bullets
  const whyBullets = [];
  if (prediction?.spanishFork?.status === 'strong' || prediction?.spanishFork?.status === 'moderate') {
    whyBullets.push({ icon: '🌬️', label: 'Spanish Fork firing', detail: prediction.spanishFork.message, tone: 'emerald' });
  }
  if (prediction?.northFlow?.status === 'strong' || prediction?.northFlow?.status === 'moderate') {
    whyBullets.push({ icon: '⬇️', label: 'North flow active', detail: prediction.northFlow.message, tone: 'amber' });
  }
  if (conditions.pressureGradient != null) {
    const g = conditions.pressureGradient;
    if (g < -0.5) whyBullets.push({
      icon: '📉', label: 'Pressure gradient thermal-favorable',
      detail: `SLC − PVU = ${safeToFixed(g, 2)} mb · negative supports thermal`,
      tone: 'emerald',
    });
    else if (g > 1.5) whyBullets.push({
      icon: '🚫', label: 'Pressure gradient against thermal',
      detail: `SLC − PVU = +${safeToFixed(g, 2)} mb · north flow dominates`,
      tone: 'rose',
    });
  }
  if (prediction?.direction?.status === 'optimal') {
    whyBullets.push({
      icon: '🎯', label: 'Direction is bullseye',
      detail: `${compass(curDir)} (${curDir}°) inside ${prediction.direction.optimal?.min}°–${prediction.direction.optimal?.max}° optimal`,
      tone: 'emerald',
    });
  }
  if (whyBullets.length === 0 && prediction) {
    whyBullets.push({
      icon: 'ℹ️', label: prediction.phaseMessage || 'No strong indicators firing',
      detail: prediction.prediction?.message || '',
      tone: 'slate',
    });
  }

  // Indicators
  const indicators = [];
  if (lakeState?.kslcStation?.windSpeed != null) indicators.push({ id: 'KSLC', name: 'SLC Airport', speed: lakeState.kslcStation.windSpeed, dir: lakeState.kslcStation.windDirection, pressure: lakeState.pressure?.high?.value });
  if (lakeState?.earlyIndicator?.windSpeed != null) indicators.push({ id: 'QSF', name: 'Spanish Fork Canyon', speed: lakeState.earlyIndicator.windSpeed, dir: lakeState.earlyIndicator.windDirection });
  if (lakeState?.kpvuStation?.windSpeed != null) indicators.push({ id: 'KPVU', name: 'Provo Airport', speed: lakeState.kpvuStation.windSpeed, dir: lakeState.kpvuStation.windDirection, pressure: lakeState.pressure?.low?.value });
  if (lakeState?.utalpStation?.windSpeed != null) indicators.push({ id: 'UTALP', name: 'Point of Mountain', speed: lakeState.utalpStation.windSpeed, dir: lakeState.utalpStation.windDirection });
  if (lakeState?.wahsatchStation?.windSpeed != null) indicators.push({ id: 'UT1', name: 'Wahsatch Summit', speed: lakeState.wahsatchStation.windSpeed, dir: lakeState.wahsatchStation.windDirection });

  const currentSpeedColor = speedColorClass(curSpeed);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm shadow-xl ${prediction?.phase === 'peak' ? `shadow-lg ${phaseTone.glow}` : ''}`}>
      {/* Phase gradient backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-br ${phaseStyle.gradient} pointer-events-none`} />

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div className="relative px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Direction dial */}
          <DirectionDial dir={curDir} safeArc={config.safeWindArc} optimalArc={prediction?.direction?.optimal} size={84} />

          {/* Identity block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
              <Wind className="w-3 h-3" />
              Launch briefing
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 leading-tight truncate">
              {config.name || lakeId}
            </h2>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {config.region || ''}{config.primaryWindType ? ` · ${config.primaryWindType}` : ''}
            </p>
            {/* Phase pill */}
            {prediction && (
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${phaseTone.text} ${phaseTone.border} ${phaseTone.bg} ${prediction.phase === 'peak' ? 'animate-pulse' : ''}`}>
                <span>{phaseStyle.icon}</span>
                <span className="tracking-wider uppercase">{phaseStyle.label}</span>
                {prediction.phaseMessage && (
                  <span className="text-slate-400 font-normal normal-case tracking-normal ml-1 hidden sm:inline">
                    · {prediction.phaseMessage}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Big wind readout */}
          {curSpeed != null && (
            <div className="text-right flex-shrink-0">
              <div className={`text-4xl sm:text-5xl font-extrabold tabular-nums leading-none ${currentSpeedColor}`}>
                {Math.round(curSpeed)}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                mph
                {curGust ? <span className="text-slate-400 ml-1.5">· gust {Math.round(curGust)}</span> : null}
              </div>
              <div className="text-sm text-slate-300 mt-1.5 font-medium">
                {compass(curDir)}
                {curDir != null && <span className="text-slate-500 text-[10px] ml-1.5">{curDir}°</span>}
              </div>
              <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeCls.text} ${badgeCls.border} ${badgeCls.bg}`}>
                {directionBadge.icon}
                {directionBadge.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── WHY ─────────────────────────────────────────────── */}
      <div className="relative px-5 sm:px-6 py-4 border-t border-slate-700/40">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-3">
          <Sparkles className="w-3 h-3" />
          Why this is happening
        </div>
        <div className="space-y-2">
          {whyBullets.map((b, i) => {
            const tone = TONE_CLASSES[b.tone];
            return (
              <div
                key={i}
                className={`flex gap-3 pl-3 pr-3 py-2 rounded-lg border-l-2 ${tone.border} bg-slate-800/30`}
              >
                <span className="text-lg leading-none mt-0.5 flex-shrink-0">{b.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${tone.text}`}>{b.label}</div>
                  {b.detail && <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{b.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── WINDOW + TIMELINE ──────────────────────────────────── */}
      <div className="relative px-5 sm:px-6 py-4 border-t border-slate-700/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
            <Clock className="w-3 h-3" />
            Today's window
          </div>
          {config.safeWindArc && (
            <span className="text-[10px] text-slate-500 font-mono">
              Safe arc: {config.safeWindArc[0]}°–{config.safeWindArc[1]}°
            </span>
          )}
        </div>

        {forecastWindow && (forecastWindow.onset || forecastWindow.peak) ? (
          <>
            {/* Onset / Peak / Fade trio */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <WindowBlock label="Onset" point={forecastWindow.onset} highlight={false} />
              <WindowBlock label="Peak"  point={forecastWindow.peak}  highlight={true} optimal={forecastWindow.peak?.inOptimal} />
              <WindowBlock label="Fade"  point={forecastWindow.fade}  highlight={false} />
            </div>
            {/* Sparkline */}
            <TimelineStrip points={forecastWindow.points} />
          </>
        ) : (
          <div className="text-sm text-slate-400 py-2">
            No usable window remaining today in the safe arc.
          </div>
        )}

        {/* Blowout warning */}
        {forecastWindow?.blowout && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <div className="text-xs font-bold text-rose-300">Off-arc blowout {fmtHour(forecastWindow.blowout.time)}</div>
              <div className="text-[11px] text-rose-400/80 mt-0.5 leading-relaxed">
                {Math.round(forecastWindow.blowout.speed)} mph from {compass(forecastWindow.blowout.dir)} ({forecastWindow.blowout.dir}°) — outside {config.safeWindArc?.[0]}°–{config.safeWindArc?.[1]}° safe arc. Get off the water.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LIVE INDICATORS ───────────────────────────────────── */}
      {indicators.length > 0 && (
        <div className="relative px-5 sm:px-6 py-4 border-t border-slate-700/40 bg-slate-900/40">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-3">
            <Activity className="w-3 h-3" />
            Live indicators
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {indicators.map((ind) => (
              <IndicatorPill key={ind.id} {...ind} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WindowBlock({ label, point, highlight, optimal }) {
  const speedColor = speedColorClass(point?.speed);
  return (
    <div className={`
      rounded-xl px-3 py-3 text-center transition-all
      ${highlight && optimal
        ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30 shadow-emerald-500/10 shadow-md'
        : highlight
        ? 'bg-slate-800/60 ring-1 ring-slate-600/40'
        : 'bg-slate-800/40'}
    `}>
      <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-bold">{label}</div>
      <div className={`text-lg font-bold mt-1 tabular-nums ${highlight && optimal ? 'text-emerald-300' : 'text-white'}`}>
        {point ? fmtHour(point.time) : '—'}
      </div>
      {point && (
        <div className="mt-1 flex items-center justify-center gap-1.5 tabular-nums">
          <span className={`text-xs font-bold ${speedColor}`}>{Math.round(point.speed)}</span>
          <span className="text-[9px] text-slate-500">mph</span>
          <span className="text-[10px] text-slate-400 ml-0.5">{compass(point.dir)}</span>
        </div>
      )}
    </div>
  );
}
