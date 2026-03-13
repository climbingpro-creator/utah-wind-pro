import React, { useMemo, useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Wind, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';

const SPOTS = [
  { id: 'utah-lake-zigzag', name: 'Zig Zag', lake: 'Utah Lake',
    thermalDir: [130, 200], northDir: [300, 60],
    bestFor: ['kiting', 'sailing', 'windsurfing'],
    description: 'Consistent SE thermal, low gust transitions' },
  { id: 'utah-lake-sandy', name: 'Sandy Beach', lake: 'Utah Lake',
    thermalDir: [130, 200], northDir: [300, 60],
    bestFor: ['kiting', 'sailing'],
    description: 'Good thermal, near Provo airport indicator' },
  { id: 'utah-lake-lincoln', name: 'Lincoln Beach', lake: 'Utah Lake',
    thermalDir: [130, 200], northDir: [300, 60],
    bestFor: ['kiting', 'sailing'],
    description: 'Southern launch, exposed to canyon wind' },
  { id: 'utah-lake-vineyard', name: 'Vineyard', lake: 'Utah Lake',
    thermalDir: [170, 270], northDir: [300, 60],
    bestFor: ['kiting', 'sailing', 'boating'],
    description: 'S/SSW/W onshore, American Fork Marina meter' },
  { id: 'utah-lake-mm19', name: 'Mile Marker 19', lake: 'Utah Lake',
    thermalDir: [100, 170], northDir: [300, 60],
    bestFor: ['kiting'],
    description: 'Canyon drainage from Spanish Fork' },
  { id: 'deer-creek', name: 'Deer Creek', lake: 'Deer Creek',
    thermalDir: [180, 240], northDir: null,
    bestFor: ['kiting', 'sailing', 'boating', 'fishing'],
    description: 'Canyon venturi effect, consistent thermals' },
  { id: 'willard-bay', name: 'Willard Bay', lake: 'Willard Bay',
    thermalDir: [160, 220], northDir: [300, 60],
    bestFor: ['kiting', 'sailing', 'boating', 'fishing'],
    description: 'Gap wind from Hill AFB' },
  { id: 'point-of-mountain-south', name: 'Flight Park South', lake: 'Point of Mountain',
    thermalDir: [150, 210], northDir: null,
    bestFor: ['paragliding'],
    description: 'Morning thermals, ridge soaring' },
  { id: 'point-of-mountain-north', name: 'Flight Park North', lake: 'Point of Mountain',
    thermalDir: null, northDir: [300, 60],
    bestFor: ['paragliding'],
    description: 'Evening glass-off, north flow' },
];

function isDirectionInRange(dir, range) {
  if (!range || dir == null) return false;
  const [lo, hi] = range;
  if (lo <= hi) return dir >= lo && dir <= hi;
  // Wraps around 360 (e.g. [300, 60])
  return dir >= lo || dir <= hi;
}

function getScoreColor(score) {
  if (score >= 80) return { bar: '#22c55e', text: 'text-green-400', bg: 'bg-green-500' };
  if (score >= 60) return { bar: '#84cc16', text: 'text-lime-400', bg: 'bg-lime-500' };
  if (score >= 40) return { bar: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500' };
  if (score >= 20) return { bar: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500' };
  return { bar: '#ef4444', text: 'text-red-400', bg: 'bg-red-500' };
}

function scoreSpot(spot, activity, currentWind, lakeState) {
  const config = ACTIVITY_CONFIGS[activity];
  if (!config) return { score: 0, reason: 'Unknown activity' };

  const wantsWind = config.wantsWind;
  const dir = currentWind?.direction;
  const speed = currentWind?.speed ?? 0;
  const gust = currentWind?.gust ?? speed;
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

  if (wantsWind) {
    if (inThermal) {
      score += 25 + (thermalProb / 100) * 15;
      reason = 'SE thermal in range';
    } else if (inNorth) {
      score += 20;
      reason = 'North flow aligned';
    } else if (dir != null) {
      score -= 10;
      if (!reason) reason = 'Wind direction unfavorable';
    }

    const { ideal } = config.thresholds;
    if (ideal && speed >= ideal.min && speed <= ideal.max) {
      score += 15;
      if (inThermal) reason = `SE thermal ${speed.toFixed(0)} mph — ideal`;
      else if (inNorth) reason = `North flow ${speed.toFixed(0)} mph — ideal`;
    } else if (speed < (config.thresholds.tooLight ?? 0)) {
      score -= 15;
      reason = reason || 'Too light';
    } else if (speed > (config.thresholds.tooStrong ?? 999)) {
      score -= 20;
      reason = 'Too strong — unsafe';
    }

    if (gust > 0 && speed > 0 && config.thresholds.gustFactor) {
      if (gust / speed > config.thresholds.gustFactor) {
        score -= 10;
        reason += ', gusty';
      }
    }

    if (thermalProb > 60 && inThermal) {
      score += 10;
    }
  } else {
    // Calm-seeking: start high, penalize exposure
    score = isBestFor ? 80 : 50;

    if (inThermal || inNorth) {
      const penalty = Math.min(30, speed * 2);
      score -= penalty;
      reason = speed > 10 ? 'Exposed to current wind' : 'Light wind exposure';
    } else {
      score += 10;
      reason = 'Sheltered from current wind';
    }

    if (speed < 5) {
      score += 15;
      reason = 'Glass conditions';
    } else if (speed > 15) {
      score -= 15;
      reason = 'Choppy — consider sheltered spots';
    }
  }

  // Canyon drainage bonus for MM19 and Deer Creek
  if (spot.id === 'utah-lake-mm19' && inThermal && speed >= 8) {
    score += 5;
    reason = 'Canyon drainage active';
  }
  if (spot.id === 'deer-creek' && inThermal && speed >= 10) {
    score += 5;
    reason = 'Canyon venturi active';
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reason };
}

const DEFAULT_VISIBLE = 5;

function SpotRanker({ activity, currentWind, lakeState, mesoData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(() => {
    return SPOTS
      .map(spot => {
        const { score, reason } = scoreSpot(spot, activity, currentWind, lakeState);
        return { ...spot, score, reason };
      })
      .sort((a, b) => b.score - a.score);
  }, [activity, currentWind, lakeState]);

  const visible = expanded ? ranked : ranked.slice(0, DEFAULT_VISIBLE);

  return (
    <div className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
        <MapPin className="w-5 h-5 text-blue-400" />
        Where to Go
      </h3>

      <div className="space-y-2">
        {visible.map((spot, idx) => {
          const rank = idx + 1;
          const colors = getScoreColor(spot.score);
          const isTop = rank === 1;

          return (
            <div
              key={spot.id}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2 transition-all
                ${isTop
                  ? (isDark
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-green-50 border border-green-300')
                  : (isDark ? 'bg-slate-700/40' : 'bg-slate-50')
                }
              `}
            >
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${isTop
                  ? 'bg-green-500 text-white'
                  : (isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600')
                }
              `}>
                {rank === 1 ? <Trophy className="w-3.5 h-3.5" /> : rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {spot.name}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {spot.lake}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-1.5 rounded-full flex-1 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${spot.score}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-8 text-right ${colors.text}`}>
                    {spot.score}%
                  </span>
                </div>

                <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {spot.reason}
                </p>
              </div>
            </div>
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
