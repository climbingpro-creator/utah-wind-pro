import React, { useMemo } from 'react';
import { Ship, Waves, Anchor, Sunrise, Sunset, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { predictGlass } from '../services/BoatingPredictor';
import { SPOT_SLUG_MAP } from '../config/spotSlugs';

const WAVE_ICON = {
  flat: '🪞',
  ripples: '〰️',
  light_chop: '🌊',
  moderate: '🌊',
  choppy: '⚠️',
  rough: '🔴',
  dangerous: '🚫',
};

const WAVE_COLOR = {
  flat: 'emerald',
  ripples: 'cyan',
  light_chop: 'sky',
  moderate: 'amber',
  choppy: 'orange',
  rough: 'red',
  dangerous: 'red',
};

function WaveGauge({ score, waveLabel, waveEstimate }) {
  const color = WAVE_COLOR[waveEstimate] || 'slate';
  const pct = Math.min(100, Math.max(0, score));
  const ringColor = {
    emerald: 'stroke-emerald-400',
    cyan: 'stroke-cyan-400',
    sky: 'stroke-sky-400',
    amber: 'stroke-amber-400',
    orange: 'stroke-orange-400',
    red: 'stroke-red-500',
    slate: 'stroke-slate-400',
  }[color];
  const textColor = `text-${color}-400`;

  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8"
            className="text-white/[0.06]" />
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className={`${ringColor} transition-all duration-700 ease-out`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${textColor}`}>{Math.round(pct)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            {pct >= 80 ? 'GLASS' : pct >= 60 ? 'CALM' : pct >= 40 ? 'OK' : 'ROUGH'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-lg">{WAVE_ICON[waveEstimate] || '🌊'}</span>
        <span className={`text-sm font-semibold ${textColor}`}>{waveLabel}</span>
      </div>
    </div>
  );
}

function GlassWindowBar({ glassWindow, boatingPrediction }) {
  const now = new Date().getHours();
  const startHour = parseInt(glassWindow?.start) || 5;
  const endHour = parseInt(glassWindow?.end) || 10;
  const isInWindow = boatingPrediction?.glassWindow?.isCurrentlyInWindow;

  const hours = [];
  for (let h = 4; h <= 21; h++) hours.push(h);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-[var(--text-primary)]">Glass Window Forecast</span>
        {isInWindow && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            YOU'RE IN IT
          </span>
        )}
      </div>

      <div className="relative h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
        {hours.map(h => {
          const isGlass = h >= startHour && h <= endHour;
          const isCurrent = h === now;
          const left = ((h - 4) / (21 - 4)) * 100;
          const width = (1 / (21 - 4)) * 100;

          return (
            <div key={h} className="absolute top-0 bottom-0 flex items-center justify-center"
              style={{ left: `${left}%`, width: `${width}%` }}>
              <div className={`w-full h-full transition-colors ${
                isGlass ? 'bg-emerald-500/25' : 'bg-transparent'
              } ${isCurrent ? 'ring-2 ring-white/80 ring-inset z-10' : ''}`} />
            </div>
          );
        })}

        {/* "Now" marker */}
        {now >= 4 && now <= 21 && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-20"
            style={{ left: `${((now - 4) / (21 - 4)) * 100}%` }} />
        )}
      </div>

      <div className="flex justify-between mt-1.5">
        {[4, 8, 12, 16, 20].map(h => (
          <span key={h} className="text-[10px] text-slate-500">
            {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
          <span>Glass window ({glassWindow?.start || '5 AM'} – {glassWindow?.end || '10 AM'})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-white/80 rounded" />
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}

function ChopForecast({ hourlyForecast, activity }) {
  if (!hourlyForecast?.length) return null;

  const upcoming = hourlyForecast.slice(0, 12);
  const maxSpeed = Math.max(1, ...upcoming.map(h => h.windSpeed ?? h.speed ?? 0));
  const dangerThreshold = activity === 'paddling' ? 12 : 15;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Waves className="w-4 h-4 text-sky-400" />
        <span className="text-sm font-bold text-[var(--text-primary)]">Hourly Chop Forecast</span>
      </div>

      <div className="flex items-end gap-1 h-20">
        {upcoming.map((h, i) => {
          const speed = h.windSpeed ?? h.speed ?? 0;
          const pct = (speed / maxSpeed) * 100;
          const isCalm = speed <= 5;
          const isDanger = speed >= dangerThreshold;
          const hour = new Date(h.time || h.startTime).getHours();
          const label = hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <span className={`text-[9px] font-bold ${isDanger ? 'text-red-400' : isCalm ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Math.round(speed)}
              </span>
              <div className="w-full rounded-t relative" style={{ height: `${Math.max(4, pct)}%` }}>
                <div className={`absolute inset-0 rounded-t transition-colors ${
                  isDanger ? 'bg-red-500/70' : isCalm ? 'bg-emerald-500/50' : 'bg-amber-500/50'
                }`} />
              </div>
              <span className="text-[8px] text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/60" /> &le;5 flat</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500/60" /> chop</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/60" /> rough</span>
      </div>
    </div>
  );
}

function BoatingBriefing({ boatingPrediction, speed, activity, locName }) {
  if (!boatingPrediction) return null;

  const rec = boatingPrediction.recommendation;
  const isGlass = boatingPrediction.isGlass;
  const isCalm = boatingPrediction.isCalm;
  const glassWindow = boatingPrediction.glassWindow;

  const isPaddle = activity === 'paddling';
  const isFishing = activity === 'fishing';
  const actLabel = isPaddle ? 'Paddling' : isFishing ? 'Fishing' : 'Boating';

  const status = isGlass ? 'glass' : isCalm ? 'calm' : speed <= 15 ? 'choppy' : 'rough';
  const statusConfig = {
    glass: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'GLASS', icon: '🪞' },
    calm: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', label: 'CALM', icon: '✅' },
    choppy: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'CHOPPY', icon: '⚠️' },
    rough: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'ROUGH', icon: '🚫' },
  }[status];

  return (
    <div className={`card p-4 ${statusConfig.bg} border ${statusConfig.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{statusConfig.icon}</span>
        <span className={`text-sm font-black uppercase tracking-wide ${statusConfig.text}`}>
          {statusConfig.label} — {Math.round(speed)} mph
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{rec}</p>

      {glassWindow?.start && glassWindow?.end && !isGlass && (
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-tertiary)]">
          <Sunrise className="w-3.5 h-3.5 text-amber-400" />
          <span>Best {actLabel.toLowerCase()} window: <strong className="text-[var(--text-primary)]">{glassWindow.start} – {glassWindow.end}</strong></span>
        </div>
      )}
    </div>
  );
}

function TipsSection({ activity, waveEstimate }) {
  const isPaddle = activity === 'paddling';
  const isFishing = activity === 'fishing';

  const tips = [];
  if (isPaddle) {
    tips.push({ icon: <Sunrise className="w-4 h-4 text-amber-400" />, text: 'Dawn patrol (5–8 AM) is almost always glass — get on the water before thermals build' });
    tips.push({ icon: <Sunset className="w-4 h-4 text-purple-400" />, text: 'Evening glass returns 6–8 PM as thermals die — second window for SUP' });
    if (waveEstimate === 'moderate' || waveEstimate === 'choppy') {
      tips.push({ icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, text: 'Stay close to shore in chop — wind can push you faster than you think' });
    }
    tips.push({ icon: <Anchor className="w-4 h-4 text-sky-400" />, text: 'Paddle INTO the wind on the way out so you have a tailwind coming back' });
  } else if (isFishing) {
    tips.push({ icon: <Sunrise className="w-4 h-4 text-amber-400" />, text: 'Low-light periods (dawn & dusk) produce the best surface feeding activity' });
    tips.push({ icon: <Waves className="w-4 h-4 text-cyan-400" />, text: 'Light ripple (2–5 mph) helps disguise your line — sometimes better than dead calm' });
    tips.push({ icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, text: 'Falling barometric pressure often triggers aggressive feeding behavior' });
  } else {
    tips.push({ icon: <Sunrise className="w-4 h-4 text-amber-400" />, text: 'Dawn patrol (5–8 AM) delivers the flattest water — best for skiing & wakeboarding' });
    tips.push({ icon: <Sunset className="w-4 h-4 text-purple-400" />, text: 'Evening glass typically returns 6–8 PM as thermal winds die' });
    tips.push({ icon: <Ship className="w-4 h-4 text-sky-400" />, text: 'Flat pressure gradient (SLC ≈ Provo barometer) is the #1 predictor of an all-day glass day' });
    if (waveEstimate === 'choppy' || waveEstimate === 'rough') {
      tips.push({ icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, text: 'Choppy conditions — small boats should stay near protected coves and marinas' });
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {isPaddle ? '🏄 Paddle Tips' : isFishing ? '🎣 Angler Tips' : '⛵ Captain Tips'}
        </span>
      </div>
      <div className="space-y-2.5">
        {tips.map((t, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
            <span className="flex-shrink-0 mt-0.5">{t.icon}</span>
            <span className="leading-relaxed">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BoatingTemplate({
  selectedActivity, selectedLake, activityConfig,
  currentWindSpeed, currentWindGust, currentWindDirection,
  effectiveBoatingPrediction, lakeState, effectiveBriefing,
  prediction,
}) {
  const speed = currentWindSpeed ?? 0;
  const gust = currentWindGust ?? 0;
  const locName = lakeState?.config?.shortName || lakeState?.config?.name || selectedLake;

  const boatingPrediction = useMemo(() => {
    if (effectiveBoatingPrediction?.probability != null) return effectiveBoatingPrediction;
    return predictGlass(
      { speed, gust, windSpeed: speed, windGust: gust },
      lakeState?.pressure || {},
      selectedActivity,
    );
  }, [speed, gust, lakeState?.pressure, selectedActivity, effectiveBoatingPrediction]);

  const hourlyForecast = prediction?.hourly || lakeState?.hourlyForecast || [];

  const spotSlug = SPOT_SLUG_MAP[selectedLake];
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Hero gauge + headline */}
      <div className="card p-5 flex flex-col sm:flex-row items-center gap-5">
        <WaveGauge
          score={boatingPrediction.probability}
          waveLabel={boatingPrediction.waveLabel}
          waveEstimate={boatingPrediction.waveEstimate}
        />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <h2 className="text-lg font-black text-[var(--text-primary)]">
            {speed <= 3 ? '🪞 Glass Conditions' :
             speed <= 8 ? '〰️ Light Chop — Still Good' :
             speed <= 15 ? '🌊 Choppy — Plan Carefully' :
             '⚠️ Rough — Consider Waiting'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {speed <= 3
              ? `Mirror-flat at ${locName}. Perfect for ${selectedActivity === 'paddling' ? 'SUP & kayaking' : selectedActivity === 'fishing' ? 'casting & trolling' : 'cruising, skiing & wakeboarding'}.`
              : speed <= 8
              ? `${Math.round(speed)} mph with ${gust > speed + 2 ? `gusts to ${Math.round(gust)}` : 'steady winds'}. ${selectedActivity === 'paddling' ? 'Manageable for experienced paddlers.' : selectedActivity === 'fishing' ? 'Light ripple — good casting conditions.' : 'Most boats handle this fine.'}`
              : `${Math.round(speed)} mph. ${selectedActivity === 'paddling' ? 'Stay close to shore or wait for calm.' : 'Smaller boats should stick to protected areas.'}`
            }
          </p>

          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span>Wind: <strong className="text-[var(--text-primary)]">{Math.round(speed)} mph</strong></span>
            {gust > speed + 2 && <span>Gusts: <strong className="text-amber-400">{Math.round(gust)} mph</strong></span>}
            {currentWindDirection != null && (
              <span>From: <strong className="text-[var(--text-primary)]">{Math.round(currentWindDirection)}°</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Status + recommendation */}
      <BoatingBriefing
        boatingPrediction={boatingPrediction}
        speed={speed}
        activity={selectedActivity}
        locName={locName}
      />

      {/* Glass window timeline */}
      <GlassWindowBar
        glassWindow={boatingPrediction.glassWindow}
        boatingPrediction={boatingPrediction}
      />

      {/* Hourly chop bars */}
      <ChopForecast
        hourlyForecast={hourlyForecast}
        activity={selectedActivity}
      />

      {/* AI briefing if available */}
      {effectiveBriefing && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧠</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{effectiveBriefing.headline}</span>
          </div>
          {effectiveBriefing.body && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{effectiveBriefing.body}</p>
          )}
          {effectiveBriefing.bullets?.length > 0 && (
            <div className="space-y-1">
              {effectiveBriefing.bullets.slice(0, 4).map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]">
                  <span className="flex-shrink-0">{typeof b === 'string' ? '·' : b.icon || '·'}</span>
                  <span>{typeof b === 'string' ? b : b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity-specific tips */}
      <TipsSection activity={selectedActivity} waveEstimate={boatingPrediction.waveEstimate} />

      {/* Session leaderboard link */}
      {spotSlug && (
        <button
          onClick={() => { window.location.href = `/day/${spotSlug}/${today}?activity=${selectedActivity}`; }}
          className="card flex items-center gap-3 hover:border-sky-500/30 transition-colors group cursor-pointer w-full text-left"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 group-hover:bg-sky-500/20 transition-colors flex-shrink-0">
            <Ship className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              Today's {selectedActivity === 'fishing' ? 'Catch Log' : 'Session Log'}
              <ChevronRight className="w-3.5 h-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              {selectedActivity === 'fishing'
                ? `See what's biting at ${locName} today`
                : `Water conditions and sessions at ${locName}`
              }
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
