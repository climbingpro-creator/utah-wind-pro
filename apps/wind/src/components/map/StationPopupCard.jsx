/**
 * StationPopupCard — Two-part map popup for weather stations.
 *
 * Top: "Live Now" — current speed, direction arrow, gusts, physics hints.
 * Bottom: "Next Session" — next rideable window from hourly forecast,
 *   with exact timing locked behind ProFeatureLock for free users.
 */

import React, { useState, useEffect } from 'react';
import { Wind, Navigation, Clock, Lock, Sparkles, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { getHourlyForecast } from '@utahwind/weather';
import { useAuth } from '../../context/AuthContext';
import { safeToFixed } from '../../utils/safeToFixed';
import findNextRideableWindow, { getDisciplineThreshold } from '../../utils/findNextRideableWindow';

function getCardinalDirection(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindColor(speed) {
  if (speed == null) return '#64748b';
  if (speed >= 20) return '#f87171';
  if (speed >= 15) return '#fb923c';
  if (speed >= 10) return '#34d399';
  if (speed >= 5) return '#38bdf8';
  return '#94a3b8';
}

function getStationColor(station) {
  if (station.type === 'pws') return '#22d3ee';
  if (station.isNorthFlowIndicator) return '#3b82f6';
  if (station.isEarlyIndicator) return '#10b981';
  if (station.isRidge) return '#a855f7';
  return '#f59e0b';
}

export default function StationPopupCard({
  station,
  live,
  physicsHints,
  selectedActivity = 'kiting',
  selectedLake = 'utah-lake',
}) {
  const { isPro, openPaywall } = useAuth();
  const [nextSession, setNextSession] = useState(undefined); // undefined = loading, null = none
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNextSession(undefined);
    setLoadError(false);

    getHourlyForecast(selectedLake)
      .then(hourly => {
        if (cancelled) return;
        if (!hourly) {
          setNextSession(null);
          return;
        }
        const threshold = getDisciplineThreshold(selectedActivity);
        const result = findNextRideableWindow(hourly, { minSpeed: threshold, minHours: 1 });
        setNextSession(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => { cancelled = true; };
  }, [selectedLake, selectedActivity]);

  const speed = live?.speed ?? live?.windSpeed;
  const gust = live?.gust ?? live?.windGust;
  const direction = live?.direction ?? live?.windDirection;
  const hasData = speed != null;
  const windColor = getWindColor(speed);
  const arrowRotation = direction != null ? (direction + 180) % 360 : null;
  const stationColor = getStationColor(station);

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: stationColor, border: `1.5px solid ${stationColor}` }}
        />
        <div className="min-w-0">
          <div className="font-bold text-sm text-gray-800 truncate">
            {station.name}
            {station.isEarlyIndicator && ' ⏰'}
            {station.isNorthFlowIndicator && ' 🌬️'}
          </div>
          <div className="text-[10px] text-gray-400">
            {station.id} • {station.elevation?.toLocaleString() || '?'} ft
            {station.isRidge && ' • Ridge'}
          </div>
        </div>
      </div>

      {/* ═══════ TOP: LIVE NOW ═══════ */}
      {hasData ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 mb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full opacity-75" style={{ background: windColor }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: windColor }} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live Now</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Direction Arrow */}
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              {arrowRotation != null ? (
                <Navigation
                  className="w-5 h-5"
                  style={{ color: windColor, transform: `rotate(${arrowRotation}deg)` }}
                />
              ) : (
                <Wind className="w-5 h-5 text-slate-300" />
              )}
            </div>

            {/* Speed + Direction */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tabular-nums" style={{ color: windColor }}>
                  {safeToFixed(speed, 1)}
                </span>
                <span className="text-xs text-gray-400">mph</span>
                {gust != null && gust > speed * 1.15 && (
                  <span className="text-xs font-bold text-amber-500 ml-1">
                    G{safeToFixed(gust, 0)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500">
                {direction != null
                  ? `${direction}° ${getCardinalDirection(direction)}`
                  : 'Direction N/A'}
              </div>
            </div>
          </div>

          {/* Physics Hints */}
          {physicsHints?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 space-y-0.5">
              {physicsHints.map((h, i) => (
                <div key={i} className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <Zap className="w-3 h-3 shrink-0" />
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-2 text-center">
          <Wind className="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <span className="text-xs text-gray-400">No live data</span>
        </div>
      )}

      {/* ═══════ BOTTOM: NEXT SESSION ═══════ */}
      <NextSessionBlock
        nextSession={nextSession}
        loadError={loadError}
        isPro={isPro}
        onUpgrade={openPaywall}
        selectedActivity={selectedActivity}
      />
    </div>
  );
}

/**
 * FOMO teaser lines — rotated to keep popups feeling fresh.
 * CRITICAL: None of these mention a day, time-of-day, or direction.
 */
const FOMO_TEASERS = [
  'Upcoming session detected!',
  'AI has detected a rideable window in the next 48 hours.',
  'A session window is forming — upgrade to see when.',
  'Our model found wind. Unlock Pro for exact timing.',
  'Rideable conditions ahead — details locked.',
];

function pickTeaser() {
  return FOMO_TEASERS[Math.floor(Math.random() * FOMO_TEASERS.length)];
}

function NextSessionBlock({ nextSession, loadError, isPro, onUpgrade, selectedActivity }) {
  // Loading
  if (nextSession === undefined && !loadError) {
    return (
      <div className="rounded-lg bg-sky-50 border border-sky-200/60 p-2.5">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
          <span className="text-[11px] text-sky-600">Scanning forecast...</span>
        </div>
      </div>
    );
  }

  // Error
  if (loadError) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] text-amber-700">Forecast unavailable</span>
        </div>
      </div>
    );
  }

  // ── No rideable window — transparent for ALL users (builds trust) ──
  if (!nextSession) {
    return (
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Session</span>
        </div>
        <p className="text-[11px] text-slate-500">
          No rideable windows detected for {selectedActivity} in the next 48h.
        </p>
      </div>
    );
  }

  // ── PRO: Full detail with exact micro-window ──
  if (isPro) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Next Session</span>
          {nextSession.hours >= 3 && (
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              {nextSession.hours}h window
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-800">
            {nextSession.dayLabel}, {nextSession.startStr} – {nextSession.endStr}
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-700">
              Peak: <strong>{Math.round(nextSession.peakSpeed)} mph</strong>
            </span>
            {nextSession.peakDirection && (
              <span className="text-emerald-600">
                {getCardinalDirection(nextSession.peakDirection)}
              </span>
            )}
            {nextSession.condition && (
              <span className="text-emerald-600/70">{nextSession.condition}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── FREE: Vague FOMO teaser + fully blurred dummy data ──
  return (
    <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 p-2.5">
      {/* Header — intentionally vague, no day/time/direction */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Session Detected</span>
      </div>

      <p className="text-[12px] font-semibold text-emerald-700 mb-2">
        {pickTeaser()}
      </p>

      {/* Blurred dummy data — no real values leak */}
      <div className="relative rounded-md overflow-hidden">
        <div
          className="pointer-events-none select-none px-2 py-1.5"
          aria-hidden="true"
          style={{ filter: 'blur(6px)', opacity: 0.45 }}
        >
          <p className="text-xs text-emerald-800 font-bold">
            ██████, XX:XX AM – XX:XX PM
          </p>
          <p className="text-[10px] text-emerald-600">
            Peak: XX mph • Direction: ███
          </p>
        </div>

        {/* Full-coverage overlay CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onUpgrade();
          }}
          className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 bg-emerald-900/20 backdrop-blur-[1px] rounded-md cursor-pointer hover:bg-emerald-900/30 transition-colors"
        >
          <Lock className="w-3 h-3 text-emerald-700" />
          <span className="text-[10px] font-bold text-emerald-700">Unlock Exact Timing</span>
          <Sparkles className="w-3 h-3 text-emerald-600" />
        </button>
      </div>
    </div>
  );
}
