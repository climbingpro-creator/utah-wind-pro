import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, CheckCircle, Wind, Calendar, 
  Star, AlertTriangle, Zap, Loader2
} from 'lucide-react';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';
import { getForecastIntelligence } from '@utahwind/weather';

const ALL_ACTIVITIES = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'boating', 'paddling', 'fishing', 'windsurfing'];

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getTomorrowName() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
}

const STATUS_STYLES = {
  go:      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  wait:    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500/20 text-amber-500', dot: 'bg-amber-500' },
  caution: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  off:     { bg: '', border: 'border-[var(--border-subtle)]', text: 'text-[var(--text-tertiary)]', badge: 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]', dot: 'bg-slate-500' },
};

const EVENT_ICONS = {
  front: '🌬️',
  epic_thermal: '☀️',
  calm: '🪞',
  storm: '⛈️',
  good_wind: '💨',
};

function SpotRow({ spot, rank, onSelect, isSelected, bgImage }) {
  const isPriority = spot.isPriority;

  return (
    <button
      onClick={() => onSelect?.(spot.spotId)}
      className={`
        group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
        ${isSelected 
          ? (bgImage ? 'bg-sky-500/25 border-sky-400/60' : 'bg-sky-500/10 border-sky-500/40')
          : isPriority
            ? (bgImage ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15' : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40')
            : (bgImage ? 'bg-white/10 border-white/10 hover:bg-white/15' : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-sky-500/30')
        }
        border
      `}
    >
      {/* Rank Badge */}
      <div className={`
        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0
        ${rank === 1 
          ? (bgImage ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-500/20 text-amber-500')
          : isPriority
            ? (bgImage ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 text-amber-600')
            : (bgImage ? 'bg-white/10 text-white/60' : 'bg-[var(--border-color)] text-[var(--text-tertiary)]')
        }
      `}>
        {rank === 1 ? <Star className="w-3.5 h-3.5" /> : rank}
      </div>

      {/* Spot Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate flex items-center gap-1.5 ${bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {spot.spotName}
          {isPriority && (
            <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${bgImage ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 text-amber-600'}`}>
              Main
            </span>
          )}
        </div>
        <div className={`text-[11px] flex items-center gap-1.5 ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
          {spot.startLabel} – {spot.endLabel} · {spot.durationHours}hr window
          {spot.hasPhysicsBoost && spot.fetchBoostPct > 0 && (
            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${bgImage ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-500/10 text-sky-500'}`} title="Fetch acceleration: wind speeds up over open water">
              +{spot.fetchBoostPct}% fetch
            </span>
          )}
        </div>
      </div>

      {/* Peak Conditions */}
      <div className="text-right shrink-0">
        <div className={`text-sm font-bold ${bgImage ? 'text-emerald-300' : 'text-emerald-500'}`}>
          {spot.peakSpeed} mph
        </div>
        <div className={`text-[10px] ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`}>
          {spot.hasPhysicsBoost ? 'on water' : 'peak'} @ {spot.peakLabel}
        </div>
      </div>

      {/* Score Badge */}
      <div className={`
        px-2 py-1 rounded-lg text-xs font-bold shrink-0
        ${spot.score >= 80 
          ? (bgImage ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-500/20 text-emerald-500')
          : spot.score >= 60
            ? (bgImage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-500')
            : (bgImage ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 text-amber-500')
        }
      `}>
        {spot.score}
      </div>

      <ChevronRight className={`w-4 h-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity ${bgImage ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
    </button>
  );
}

function WeekEventCard({ event, bgImage }) {
  const icon = EVENT_ICONS[event.type] || '📅';
  const isGood = event.goodFor.length > 0 && event.badFor.length === 0;
  const isBad = event.badFor.length > 0 && event.goodFor.length === 0;

  return (
    <div className={`
      flex items-center gap-3 px-3 py-2 rounded-lg
      ${bgImage 
        ? (isGood ? 'bg-emerald-500/15' : isBad ? 'bg-red-500/15' : 'bg-white/10')
        : (isGood ? 'bg-emerald-500/10 border border-emerald-500/20' : isBad ? 'bg-red-500/10 border border-red-500/20' : 'bg-[var(--bg-card)] border border-[var(--border-color)]')
      }
    `}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold ${bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {event.day} · {event.headline}
        </div>
        <div className={`text-[10px] ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
          {event.detail}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity, isSelected, onSelect, bgImage }) {
  const cfg = ACTIVITY_CONFIGS[activity];
  if (!cfg) return null;

  return (
    <button
      onClick={() => onSelect?.(activity)}
      className={`
        group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center cursor-pointer
        ${isSelected
          ? (bgImage 
              ? 'bg-sky-500/25 border-sky-400 backdrop-blur-sm ring-2 ring-sky-400/60 shadow-lg scale-[1.03]'
              : 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-400/40 shadow-md scale-[1.03]')
          : (bgImage
              ? 'bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15'
              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-sky-500/30')
        }
      `}
    >
      {isSelected && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-sky-500 text-white shadow-sm">
          Selected
        </span>
      )}
      <span className={`${isSelected ? 'text-sky-400' : bgImage ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
        {cfg.icon}
      </span>
      <span className={`text-xs font-bold ${isSelected ? (bgImage ? 'text-sky-300' : 'text-sky-500') : bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
        {cfg.name}
      </span>
      {isSelected && <CheckCircle className={`absolute top-2 right-2 w-3.5 h-3.5 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />}
    </button>
  );
}

export default function ForecastIntelligenceHero({
  selectedActivity,
  onSelectActivity,
  onSelectSpot,
  currentWindSpeed,
  currentWindDirection,
}) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch forecast intelligence when activity changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getForecastIntelligence(selectedActivity)
      .then(data => {
        if (!cancelled) {
          setForecast(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Forecast intelligence error:', err);
          setError('Unable to load forecast');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedActivity]);

  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const bgImage = getRotatingImage(forecast?.today?.length > 0 ? 'good' : 'neutral', 'mood');

  const dirLabel = (deg) => {
    if (deg == null) return '';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  const hasWindowsToday = forecast?.today?.length > 0;
  const hasWindowsTomorrow = forecast?.tomorrow?.length > 0;

  return (
    <div className={`animate-fade-in ${bgImage ? 'hero-mood' : ''}`}>
      {bgImage && (
        <>
          <img src={bgImage} alt="" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        </>
      )}

      <div className={`relative z-10 p-5 sm:p-6 lg:p-8 ${bgImage ? '' : 'card'}`}>
        {/* ═══════ ACTIVITY SELECTOR ═══════ */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
          {ALL_ACTIVITIES.map(activity => (
            <ActivityCard
              key={activity}
              activity={activity}
              isSelected={selectedActivity === activity}
              onSelect={onSelectActivity}
              bgImage={bgImage}
            />
          ))}
        </div>

        {/* ═══════ LOADING STATE ═══════ */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`} />
            <span className={`ml-3 text-sm ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`}>
              Analyzing {activityConfig?.name || 'conditions'} across all spots...
            </span>
          </div>
        )}

        {/* ═══════ ERROR STATE ═══════ */}
        {error && !loading && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${bgImage ? 'bg-red-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className={`text-sm ${bgImage ? 'text-red-300' : 'text-red-500'}`}>{error}</span>
          </div>
        )}

        {/* ═══════ FORECAST CONTENT ═══════ */}
        {!loading && !error && forecast && (
          <div className="space-y-6">
            {/* ─── TODAY SECTION ─── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className={`w-4 h-4 ${bgImage ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <h3 className={`text-sm font-bold uppercase tracking-wider ${bgImage ? 'text-white/80' : 'text-[var(--text-primary)]'}`}>
                  Today · {getDayName()}
                </h3>
                {hasWindowsToday && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${bgImage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {forecast.today.length} spot{forecast.today.length !== 1 ? 's' : ''} firing
                  </span>
                )}
              </div>

              {hasWindowsToday ? (
                <div className="space-y-2">
                  {forecast.today.map((spot, i) => (
                    <SpotRow
                      key={spot.spotId}
                      spot={spot}
                      rank={i + 1}
                      onSelect={onSelectSpot}
                      bgImage={bgImage}
                    />
                  ))}
                </div>
              ) : (
                <div className={`px-4 py-6 rounded-xl text-center ${bgImage ? 'bg-white/10' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
                  <Wind className={`w-8 h-8 mx-auto mb-2 ${bgImage ? 'text-white/30' : 'text-[var(--text-tertiary)]'}`} />
                  <p className={`text-sm font-medium ${bgImage ? 'text-white/60' : 'text-[var(--text-secondary)]'}`}>
                    No {activityConfig?.name || 'rideable'} windows today
                  </p>
                  <p className={`text-xs mt-1 ${bgImage ? 'text-white/40' : 'text-[var(--text-tertiary)]'}`}>
                    Check tomorrow's forecast below
                  </p>
                </div>
              )}
            </div>

            {/* ─── TOMORROW SECTION ─── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className={`w-4 h-4 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
                <h3 className={`text-sm font-bold uppercase tracking-wider ${bgImage ? 'text-white/80' : 'text-[var(--text-primary)]'}`}>
                  Tomorrow · {getTomorrowName()}
                </h3>
                {hasWindowsTomorrow && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${bgImage ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-500/10 text-sky-500'}`}>
                    {forecast.tomorrow.length} spot{forecast.tomorrow.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {hasWindowsTomorrow ? (
                <div className="space-y-2">
                  {forecast.tomorrow.map((spot, i) => (
                    <SpotRow
                      key={spot.spotId}
                      spot={spot}
                      rank={i + 1}
                      onSelect={onSelectSpot}
                      bgImage={bgImage}
                    />
                  ))}
                </div>
              ) : (
                <div className={`px-4 py-4 rounded-xl text-center ${bgImage ? 'bg-white/5' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
                  <p className={`text-xs ${bgImage ? 'text-white/40' : 'text-[var(--text-tertiary)]'}`}>
                    No {activityConfig?.name || 'rideable'} windows forecasted for tomorrow
                  </p>
                </div>
              )}
            </div>

            {/* ─── WEEK EVENTS ─── */}
            {forecast.weekEvents?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className={`w-4 h-4 ${bgImage ? 'text-amber-400' : 'text-amber-500'}`} />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${bgImage ? 'text-white/80' : 'text-[var(--text-primary)]'}`}>
                    This Week
                  </h3>
                </div>
                <div className="space-y-2">
                  {forecast.weekEvents.map((event, i) => (
                    <WeekEventCard key={i} event={event} bgImage={bgImage} />
                  ))}
                </div>
              </div>
            )}

            {/* ─── CURRENT CONDITIONS & LEARNING STATUS ─── */}
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg ${bgImage ? 'bg-white/10' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
              <Wind className={`w-4 h-4 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
              <span className={`text-xs font-medium ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                Current: {currentWindSpeed != null ? `${Math.round(currentWindSpeed)} mph` : '--'}{currentWindDirection != null ? ` ${dirLabel(currentWindDirection)}` : ''}
              </span>
              
              {/* Learning indicators */}
              <div className="flex items-center gap-2 ml-auto">
                {forecast.mlCorrected && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bgImage ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/10 text-purple-500'}`} title="Using ML-corrected NWS forecasts">
                    ML
                  </span>
                )}
                {forecast.hasLearnedWeights && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bgImage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-500'}`} title="Calibrated from historical accuracy">
                    CALIBRATED
                  </span>
                )}
                <span className={`text-[10px] ${bgImage ? 'text-white/40' : 'text-[var(--text-tertiary)]'}`}>
                  {forecast.totalSpotsAnalyzed} spots
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
