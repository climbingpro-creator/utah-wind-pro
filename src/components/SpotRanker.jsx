import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, ChevronUp, Wind, Trophy, Radio, ExternalLink, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { LAKE_CONFIGS } from '../config/lakeStations';
import { STATION_NODES, PROPAGATION_EDGES, LOCATION_STATIONS } from '../services/WindFieldEngine';

// Build SPOTS dynamically from the authoritative lakeStations config + WindFieldEngine topology
const SPOTS = [
  ...Object.entries(LAKE_CONFIGS)
    .filter(([id]) => id !== 'utah-lake') // skip the overview entry
    .map(([id, cfg]) => {
      const loc = LOCATION_STATIONS[id];
      const gt = cfg.stations?.groundTruth;

      // Zig Zag has its own PWS — use that as the ground truth meter.
      // For other spots with a real MesoWest groundTruth, prefer that.
      // Otherwise fall back to WindFieldEngine primary → lakeshore[0].
      const hasPWS = gt?.id === 'PWS' && id === 'utah-lake-zigzag';
      const hasLocalGT = gt?.id && gt.id !== 'PWS';
      const primaryId = hasPWS ? 'PWS'
        : hasLocalGT ? gt.id
        : loc?.primary || cfg.stations?.lakeshore?.[0]?.id || gt?.id;

      const primaryNode = primaryId && STATION_NODES[primaryId];
      const primaryName = hasPWS ? 'Zig Zag (Your Station)'
        : primaryNode?.name
        || cfg.stations?.lakeshore?.find(s => s.id === primaryId)?.name
        || gt?.name
        || primaryId;

      return {
        id,
        name: cfg.shortName || cfg.name,
        lake: cfg.region?.replace(/^Utah Lake.*/, 'Utah Lake')
                         .replace(/^Strawberry.*/, 'Strawberry')
                         .replace(/^Sanpete.*/, 'Skyline')
                         .replace(/^Wasatch.*/, 'Deer Creek')
                         .replace(/^Box Elder.*/, 'Willard Bay')
                         .replace(/^Weber.*/, 'Pineview')
                         || cfg.name,
        meterId: primaryId,
        meterName: primaryName,
        thermalDir: cfg.thermal?.optimalDirection
          ? [cfg.thermal.optimalDirection.min, cfg.thermal.optimalDirection.max] : null,
        northDir: cfg.thermal?.northFlow
          ? [cfg.thermal.northFlow.min, cfg.thermal.northFlow.max] : null,
        kiting: cfg.kiting || null,
        bestFor: cfg.snowkite
          ? ['snowkiting', 'windsurfing']
          : id.startsWith('utah-lake')
            ? ['kiting', 'sailing', 'windsurfing', 'boating', 'fishing']
            : ['kiting', 'sailing', 'boating', 'fishing'],
        description: cfg.description || '',
        upstream: loc ? [...(loc.upstreamNorth || []), ...(loc.upstreamThermal || [])] : [],
      };
    }),
  {
    id: 'point-of-mountain-south', name: 'Flight Park South', lake: 'Point of Mountain',
    meterId: 'FPS', meterName: 'Flight Park South',
    thermalDir: [150, 210], northDir: null,
    kiting: null,
    bestFor: ['paragliding'],
    description: 'Ridge soaring — south flow',
    upstream: ['KPVU', 'QSF'],
  },
  {
    id: 'point-of-mountain-north', name: 'Flight Park North', lake: 'Point of Mountain',
    meterId: 'UTALP', meterName: 'Pt of Mountain N',
    thermalDir: null, northDir: [300, 60],
    kiting: null,
    bestFor: ['paragliding'],
    description: 'Evening glass-off — north flow',
    upstream: ['KSLC', 'UTOLY'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

function isDirectionInRange(dir, range) {
  if (!range || dir == null) return false;
  const [lo, hi] = range;
  if (lo <= hi) return dir >= lo && dir <= hi;
  return dir >= lo || dir <= hi;
}

function isInKitingZone(dir, zone) {
  if (!zone || dir == null) return false;
  const inPrimary = dir >= zone.min && dir <= zone.max;
  if (inPrimary) return true;
  if (zone.min2 != null && zone.max2 != null) {
    return dir >= zone.min2 && dir <= zone.max2;
  }
  return false;
}

function getScoreColor(score) {
  if (score >= 80) return { bar: '#22c55e', text: 'text-green-400', bg: 'bg-green-500' };
  if (score >= 60) return { bar: '#84cc16', text: 'text-lime-400', bg: 'bg-lime-500' };
  if (score >= 40) return { bar: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500' };
  if (score >= 20) return { bar: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500' };
  return { bar: '#ef4444', text: 'text-red-400', bg: 'bg-red-500' };
}

function dirLabel(dir) {
  if (dir == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(dir / 22.5) % 16];
}

// ─── Per-spot wind lookup ────────────────────────────────────────
// Each spot must be scored using its OWN primary station's wind,
// not the single "currentWind" from whichever tab is selected.

function getSpotWind(spot, mesoData, fallbackWind) {
  if (!mesoData || !spot.meterId) return fallbackWind;

  // Try direct named entry (KPVU, KSLC, UTALP, QSF)
  const named = mesoData[spot.meterId];
  if (named) {
    return {
      speed: named.speed ?? named.windSpeed ?? 0,
      gust: named.gust ?? named.windGust ?? named.speed ?? named.windSpeed ?? 0,
      direction: named.direction ?? named.windDirection,
    };
  }

  // Try stations array
  const fromArr = mesoData.stations?.find(s => s.id === spot.meterId);
  if (fromArr) {
    return {
      speed: fromArr.speed ?? fromArr.windSpeed ?? 0,
      gust: fromArr.gust ?? fromArr.windGust ?? fromArr.speed ?? 0,
      direction: fromArr.direction ?? fromArr.windDirection,
    };
  }

  return fallbackWind;
}

// ─── Scoring ─────────────────────────────────────────────────────

function scoreSpot(spot, activity, currentWind, lakeState, mesoData) {
  const config = ACTIVITY_CONFIGS[activity];
  if (!config) return { score: 0, reason: 'Unknown activity', wind: null };

  const wind = getSpotWind(spot, mesoData, currentWind);
  const wantsWind = config.wantsWind;
  const dir = wind?.direction;
  const speed = wind?.speed ?? 0;
  const gust = wind?.gust ?? speed;
  const thermalProb = lakeState?.thermalPrediction?.probability ?? 0;

  let score = 50;
  let reason = '';

  const isBestFor = spot.bestFor.includes(activity);
  if (!isBestFor) {
    score -= 30;
    reason = 'Not ideal for this activity';
  }

  const inThermal = isDirectionInRange(dir, spot.thermalDir);
  const inNorth = isDirectionInRange(dir, spot.northDir);

  // Kiting/sailing use the detailed shore safety zones from lakeStations
  const hasKitingZones = spot.kiting && (activity === 'kiting' || activity === 'snowkiting' || activity === 'sailing' || activity === 'windsurfing');
  let shoreZone = null;
  if (hasKitingZones && dir != null) {
    if (isInKitingZone(dir, spot.kiting.onshore)) shoreZone = 'onshore';
    else if (isInKitingZone(dir, spot.kiting.sideOn)) shoreZone = 'side-on';
    else if (isInKitingZone(dir, spot.kiting.sideOffshore)) shoreZone = 'side-offshore';
    else if (isInKitingZone(dir, spot.kiting.offshore)) shoreZone = 'offshore';
  }

  if (wantsWind) {
    // Direction scoring — kiting uses onshore/sideOn/sideOffshore/offshore zones
    if (hasKitingZones && shoreZone) {
      if (shoreZone === 'onshore') {
        score += 30 + (thermalProb / 100) * 10;
        reason = `Onshore ${dirLabel(dir)} ${speed.toFixed(0)} mph — ideal`;
      } else if (shoreZone === 'side-on') {
        score += 20 + (thermalProb / 100) * 5;
        reason = `Side-on ${dirLabel(dir)} ${speed.toFixed(0)} mph — good angle`;
      } else if (shoreZone === 'side-offshore') {
        score += 12;
        reason = `Side-off ${dirLabel(dir)} ${speed.toFixed(0)} mph — kitable, intermediate+`;
      } else if (shoreZone === 'offshore') {
        score -= 25;
        reason = `Offshore ${dirLabel(dir)} — DANGEROUS`;
      }
    } else if (inNorth && speed >= 5) {
      score += 25;
      reason = `North flow ${dirLabel(dir)} ${speed.toFixed(0)} mph`;
    } else if (inThermal) {
      score += 25 + (thermalProb / 100) * 15;
      reason = `Thermal ${dirLabel(dir)} ${speed.toFixed(0)} mph`;
    } else if (dir != null) {
      score -= 10;
      if (!reason) reason = `${dirLabel(dir)} wind — cross/off direction`;
    }

    // Speed scoring
    const { ideal } = config.thresholds;
    if (ideal && speed >= ideal.min && speed <= ideal.max) {
      score += 15;
    } else if (speed < (config.thresholds.tooLight ?? 0)) {
      score -= 15;
      reason = reason || 'Too light';
    } else if (speed > (config.thresholds.tooStrong ?? 999)) {
      score -= 20;
      reason = 'Too strong — unsafe';
    }

    // Gust factor penalty
    if (gust > 0 && speed > 0 && config.thresholds.gustFactor) {
      if (gust / speed > config.thresholds.gustFactor) {
        score -= 10;
        reason += ', gusty';
      }
    }

    if (thermalProb > 60 && inThermal) score += 10;

    // Physics propagation bonus: upstream stations actively sending wind toward this spot
    if (mesoData && spot.upstream?.length > 0) {
      let upstreamSignal = 0;
      for (const upId of spot.upstream) {
        const upReading = mesoData[upId];
        if (upReading) {
          const upSpeed = upReading.speed ?? upReading.windSpeed ?? 0;
          const upDir = upReading.direction ?? upReading.windDirection;
          const edge = PROPAGATION_EDGES.find(e => e.to === (LOCATION_STATIONS[spot.id]?.primary) && e.from === upId);
          if (edge && upDir != null && isDirectionInRange(upDir, [edge.headingRange[0], edge.headingRange[1]])) {
            upstreamSignal = Math.max(upstreamSignal, upSpeed * (edge.channeling || 1));
          }
        }
      }
      if (upstreamSignal >= 8) {
        score += 8;
        reason += ' • upstream wind incoming';
      } else if (upstreamSignal >= 5) {
        score += 4;
      }
    }
  } else {
    // Calm-seeking activities
    score = isBestFor ? 80 : 50;

    if (speed >= 10) {
      score -= Math.min(30, speed * 2);
      reason = 'Exposed to current wind';
    } else if (speed >= 5) {
      score -= 10;
      reason = 'Light wind exposure';
    } else {
      score += 15;
      reason = 'Glass conditions';
    }
  }

  // Canyon drainage bonus
  if (spot.id === 'utah-lake-mm19' && inThermal && speed >= 8) {
    score += 5;
    reason = 'Canyon drainage active';
  }
  if (spot.id === 'deer-creek' && inThermal && speed >= 10) {
    score += 5;
    reason = 'Canyon venturi active';
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reason,
    wind: speed > 0 ? { speed, gust, dir } : null,
    shoreZone,
  };
}

const DEFAULT_VISIBLE = 5;

// Merge station readings into a persistent cache so switching tabs
// doesn't wipe out readings from other locations.
function mergeIntoCache(cache, mesoData) {
  if (!mesoData) return cache;
  const next = { ...cache };

  // Named entries (KPVU, KSLC, UTALP, QSF, etc.)
  for (const [key, val] of Object.entries(mesoData)) {
    if (key === 'stations' || !val) continue;
    next[key] = val;
  }

  // Stations array
  if (mesoData.stations) {
    if (!next.stations) next.stations = [];
    for (const s of mesoData.stations) {
      const idx = next.stations.findIndex(x => x.id === s.id);
      if (idx >= 0) next.stations[idx] = s;
      else next.stations.push(s);
    }
  }

  return next;
}

function SpotRanker({ activity, currentWind, lakeState, mesoData, onSelectSpot }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  // Persistent station cache — survives tab switches
  const cacheRef = useRef({});
  useEffect(() => {
    cacheRef.current = mergeIntoCache(cacheRef.current, mesoData);
  }, [mesoData]);

  const stableData = useMemo(
    () => mergeIntoCache(cacheRef.current, mesoData),
    [mesoData]
  );

  const ranked = useMemo(() => {
    return SPOTS
      .map(spot => {
        const { score, reason, wind, shoreZone } = scoreSpot(spot, activity, currentWind, lakeState, stableData);
        return { ...spot, score, reason, wind, shoreZone };
      })
      .sort((a, b) => b.score - a.score);
  }, [activity, currentWind, lakeState, stableData]);

  const visible = expanded ? ranked : ranked.slice(0, DEFAULT_VISIBLE);

  const handleClick = (spotId) => {
    if (onSelectSpot) onSelectSpot(spotId);
  };

  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
      <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        <MapPin className="w-5 h-5 text-sky-500" />
        Where to Go
      </h3>

      <div className="space-y-2.5">
        {visible.map((spot, idx) => {
          const rank = idx + 1;
          const colors = getScoreColor(spot.score);
          const isTop = rank === 1;

          return (
            <button
              key={spot.id}
              onClick={() => handleClick(spot.id)}
              className={`
                w-full flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-300 text-left group outline-none
                ${isTop
                  ? (isDark
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/30 hover:border-green-400/50 shadow-[0_0_15px_-3px_rgba(34,197,94,0.15)]'
                    : 'bg-gradient-to-r from-green-50 to-emerald-50/50 border border-green-200 hover:border-green-300 shadow-sm')
                  : (isDark
                    ? 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                    : 'bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm')
                }
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-transform group-hover:scale-110
                ${isTop
                  ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                  : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                }
              `}>
                {rank === 1 ? <Trophy className="w-4 h-4" /> : rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {spot.name}
                  </span>
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/50 text-slate-500'}`}>
                    {spot.lake}
                  </span>
                </div>

                {/* Reference meter + live wind reading */}
                {spot.meterName && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-sky-400/80' : 'text-sky-600/80'}`}>
                    <Radio className="w-3 h-3" />
                    <span className="truncate">{spot.meterName}</span>
                    {spot.wind && (
                      <>
                        <span className="opacity-50 mx-0.5">•</span>
                        <span className={`font-bold ${spot.wind.speed >= 8 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : ''}`}>
                          {spot.wind.speed.toFixed(0)} mph {spot.wind.dir != null ? dirLabel(spot.wind.dir) : ''}
                          {spot.wind.gust > spot.wind.speed * 1.3 ? ` G${spot.wind.gust.toFixed(0)}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2.5 mt-2">
                  <div className={`h-2 rounded-full flex-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${spot.score}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                  <span className={`text-xs font-black w-8 text-right tabular-nums ${colors.text}`}>
                    {spot.score}%
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <p className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {spot.reason}
                  </p>
                  {spot.shoreZone && (
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      spot.shoreZone === 'onshore'
                        ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                        : spot.shoreZone === 'side-on'
                          ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700')
                          : spot.shoreZone === 'side-offshore'
                            ? (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                            : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                    }`}>
                      {spot.shoreZone === 'onshore' && 'Onshore'}
                      {spot.shoreZone === 'side-on' && 'Side-on'}
                      {spot.shoreZone === 'side-offshore' && 'Side-off'}
                      {spot.shoreZone === 'offshore' && (
                        <span className="flex items-center gap-1">
                          Offshore <AlertTriangle className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {ranked.length > DEFAULT_VISIBLE && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className={`
            w-full mt-3 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg
            transition-colors
            ${isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }
          `}
        >
          {expanded ? (
            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Show All {ranked.length} Spots <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

export default SpotRanker;
