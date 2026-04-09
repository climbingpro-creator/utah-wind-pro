/**
 * ForecastIntelligenceHero
 * 
 * Cross-location forecast intelligence using REAL predictions from UnifiedPredictor.
 * This is NOT raw NWS data - it uses the full prediction pipeline:
 * - Live sensor data from PWS, MesoWest, UDOT networks
 * - Trained weights from years of historical data
 * - Pattern recognition and regime classification
 * - Calibration curves and learned biases
 * - Propagation lag correlations
 * 
 * Shows "Where should I go and when?" with real microclimate predictions.
 */

import React from 'react';
import { 
  ChevronRight, CheckCircle, Wind, Calendar, 
  Star, AlertTriangle, Zap, Loader2, TrendingUp, Clock
} from 'lucide-react';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';
import { useCrossLocationPredictions, PRIORITY_SPOTS } from '../hooks/useCrossLocationPredictions';

const ALL_ACTIVITIES = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'boating', 'paddling', 'fishing', 'windsurfing'];

const DECISION_STYLES = {
  GO:   { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500 text-white' },
  WAIT: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', badge: 'bg-amber-500 text-black' },
  PASS: { bg: 'bg-slate-500/15', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'bg-slate-600 text-white' },
};

const REGIME_LABELS = {
  thermal: 'Thermal Cycle',
  north_flow: 'North Flow',
  postfrontal: 'Post-Frontal',
  synoptic_wind: 'Synoptic Wind',
  frontal: 'Frontal',
  glass: 'Glass/Calm',
  building: 'Building',
  transitional: 'Transitional',
  uncertain: 'Uncertain',
};

function SpotCard({ spot, rank, onSelect, bgImage }) {
  const isPriority = spot.isPriority;
  const style = DECISION_STYLES[spot.decision] || DECISION_STYLES.PASS;
  
  const windDir = spot.windDirection;
  const cardinal = windDir != null 
    ? ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(windDir / 22.5) % 16]
    : '';

  return (
    <button
      onClick={() => onSelect?.(spot.spotId)}
      className={`
        group w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all
        ${bgImage 
          ? `${style.bg} border ${style.border} backdrop-blur-sm hover:scale-[1.01]`
          : `${style.bg} border ${style.border} hover:border-opacity-60`
        }
      `}
    >
      {/* Rank Badge */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0
        ${rank === 1 
          ? 'bg-amber-500/30 text-amber-300'
          : isPriority
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-white/10 text-white/60'
        }
      `}>
        {rank === 1 ? <Star className="w-4 h-4" /> : rank}
      </div>

      {/* Spot Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate flex items-center gap-2 ${bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {spot.spotName}
          {isPriority && (
            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Main
            </span>
          )}
        </div>
        {spot.briefing?.headline ? (
          <div className={`text-[11px] truncate ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
            {spot.briefing.headline}
          </div>
        ) : (
          <div className={`text-[11px] flex items-center gap-2 ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
            {spot.regime && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {REGIME_LABELS[spot.regime] || spot.regime}
              </span>
            )}
            {spot.propagation?.phase && spot.propagation.phase !== 'none' && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {spot.propagation.phase}
                {spot.propagation.eta && ` (${spot.propagation.eta})`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Current Wind */}
      <div className="text-right shrink-0">
        <div className={`text-base font-bold ${style.text}`}>
          {Math.round(spot.windSpeed)} mph
        </div>
        <div className={`text-[10px] ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
          {cardinal} {spot.windGust ? `G${Math.round(spot.windGust)}` : ''}
        </div>
      </div>

      {/* Decision Badge */}
      <div className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${style.badge}`}>
        {spot.decision}
      </div>

      {/* Confidence */}
      <div className={`text-xs font-bold shrink-0 ${bgImage ? 'text-white/60' : 'text-[var(--text-secondary)]'}`}>
        {spot.confidence}%
      </div>

      <ChevronRight className={`w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity ${bgImage ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
    </button>
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
  // Use the REAL prediction hook - not raw NWS data
  const { predictions, loading, error, goSpots, waitSpots } = useCrossLocationPredictions(selectedActivity);

  const activityConfig = ACTIVITY_CONFIGS[selectedActivity];
  const hasGoSpots = goSpots.length > 0;
  const bgImage = getRotatingImage(hasGoSpots ? 'good' : 'neutral', 'mood');

  const dirLabel = (deg) => {
    if (deg == null) return '';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

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
              Running predictions for {activityConfig?.name || 'all spots'}...
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

        {/* ═══════ PREDICTIONS ═══════ */}
        {!loading && !error && predictions.length > 0 && (
          <div className="space-y-4">
            {/* GO Spots */}
            {goSpots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${bgImage ? 'text-emerald-400' : 'text-emerald-500'}`}>
                    GO Now — {goSpots.length} spot{goSpots.length !== 1 ? 's' : ''} firing
                  </h3>
                </div>
                <div className="space-y-2">
                  {goSpots.slice(0, 5).map((spot, i) => (
                    <SpotCard
                      key={spot.spotId}
                      spot={spot}
                      rank={i + 1}
                      onSelect={onSelectSpot}
                      bgImage={bgImage}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* WAIT Spots */}
            {waitSpots.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className={`w-4 h-4 ${bgImage ? 'text-amber-400' : 'text-amber-500'}`} />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${bgImage ? 'text-amber-400' : 'text-amber-500'}`}>
                    Building — Check back soon
                  </h3>
                </div>
                <div className="space-y-2">
                  {waitSpots.slice(0, 3).map((spot, i) => (
                    <SpotCard
                      key={spot.spotId}
                      spot={spot}
                      rank={goSpots.length + i + 1}
                      onSelect={onSelectSpot}
                      bgImage={bgImage}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Good Spots */}
            {goSpots.length === 0 && waitSpots.length === 0 && (
              <div className={`px-4 py-8 rounded-xl text-center ${bgImage ? 'bg-white/10' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
                <Wind className={`w-10 h-10 mx-auto mb-3 ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`} />
                <p className={`text-sm font-medium ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                  No {activityConfig?.name || 'usable'} conditions right now
                </p>
                <p className={`text-xs mt-1 ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
                  Predictions updated every minute from live sensors
                </p>
              </div>
            )}

            {/* Status Bar */}
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 rounded-lg ${bgImage ? 'bg-white/10' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
              <div className="flex items-center gap-2">
                <Wind className={`w-4 h-4 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
                <span className={`text-xs font-medium ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                  Current: {currentWindSpeed != null ? `${Math.round(currentWindSpeed)} mph` : '--'}{currentWindDirection != null ? ` ${dirLabel(currentWindDirection)}` : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400`} title="Using real sensor data + trained prediction models">
                  LIVE SENSORS
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400`} title="Predictions calibrated from historical accuracy">
                  ML CALIBRATED
                </span>
                <span className={`text-[10px] ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
                  {predictions.length} spots
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No predictions at all */}
        {!loading && !error && predictions.length === 0 && (
          <div className={`px-4 py-8 rounded-xl text-center ${bgImage ? 'bg-white/10' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
            <AlertTriangle className={`w-10 h-10 mx-auto mb-3 ${bgImage ? 'text-amber-400' : 'text-amber-500'}`} />
            <p className={`text-sm font-medium ${bgImage ? 'text-white/60' : 'text-[var(--text-secondary)]'}`}>
              Unable to load predictions
            </p>
            <p className={`text-xs mt-1 ${bgImage ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>
              Check sensor connectivity
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
