import React from 'react';
import { Wind, Sailboat, Ship, Waves, Mountain, Fish, Anchor } from 'lucide-react';

const WindsurferIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 2C17.5 9 18.5 15 18.5 17.5L11 17.5Z"/>
    <path d="M11 5C7 10 6.5 15 6.5 17.5L11 17.5Z" opacity="0.6"/>
    <circle cx="8.2" cy="15" r="1"/>
    <path d="M8 16L6.8 18.5L11 18.5L9.2 16.2Z"/>
    <rect x="4" y="19" width="16" height="2" rx="1"/>
  </svg>
);
import { useTheme } from '../context/ThemeContext';
import { getRotatingImage } from '../config/imagePool';
import { safeToFixed } from '../utils/safeToFixed';

// Activity configurations with thresholds and preferences
export const ACTIVITY_CONFIGS = {
  kiting: {
    id: 'kiting',
    name: 'Kiting',
    icon: <Wind className="w-10 h-10" />,
    description: 'Kiteboarding & Foiling — needs 10+ mph wind',
    heroImage: '/images/kiting-utah-lake.png',
    thresholds: {
      tooLight: 8,
      ideal: { min: 12, max: 22 },
      foilMin: 10,
      twinTipMin: 15,
      tooStrong: 30,
      gustFactor: 1.5,
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 10 && speed <= 25 && (!gust || gust/speed < 1.8),
  },

  snowkiting: {
    id: 'snowkiting',
    name: 'Snowkiting',
    icon: <Mountain className="w-10 h-10" />,
    description: 'Snowkiting — wind + snow at Strawberry & beyond',
    heroImage: '/images/snowkite-strawberry.png',
    thresholds: {
      tooLight: 8,
      ideal: { min: 12, max: 22 },
      foilMin: 10,
      twinTipMin: 12,
      tooStrong: 35,
      gustFactor: 1.5,
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 10 && speed <= 25 && (!gust || gust/speed < 1.8),
  },
  
  sailing: {
    id: 'sailing',
    name: 'Sailing',
    icon: <Sailboat className="w-10 h-10" />,
    description: 'Dinghy & Keelboat — ideal 8-18 mph',
    heroImage: '/images/storm-clouds.png',
    thresholds: {
      tooLight: 4,
      ideal: { min: 8, max: 18 },
      beginnerMax: 12,
      racingIdeal: { min: 10, max: 15 },
      tooStrong: 25,
      gustFactor: 1.4,
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 6 && speed <= 20 && (!gust || gust/speed < 1.5),
  },
  
  boating: {
    id: 'boating',
    name: 'Boating',
    icon: <Ship className="w-10 h-10" />,
    description: 'Powerboats & Cruising — calm water is best',
    heroImage: '/images/wake-wave-sunset.png',
    thresholds: {
      ideal: { min: 0, max: 8 },
      choppy: 10,
      rough: 15,
      dangerous: 25,
    },
    wantsWind: false,
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paddling: {
    id: 'paddling',
    name: 'Paddling',
    icon: <Waves className="w-10 h-10" />,
    description: 'SUP, Kayak, Canoe — glass water ideal',
    heroImage: '/images/paddling-utah-lake.png',
    thresholds: {
      ideal: { min: 0, max: 6 },
      manageable: 10,
      difficult: 15,
      dangerous: 20,
    },
    wantsWind: false,
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paragliding: {
    id: 'paragliding',
    name: 'Paragliding',
    icon: <Anchor className="w-10 h-10" />,
    description: 'Point of the Mountain — P2+ rated pilots',
    heroImage: '/images/storm-clouds.png',
    thresholds: {
      tooLight: 5,
      ideal: { min: 10, max: 16 },
      tooStrong: 18,
      gustFactor: 1.3,
    },
    wantsWind: true,
    primaryMetric: 'paraglidingScore',
    goodCondition: (speed, gust) => speed >= 5 && speed <= 20 && (!gust || gust - speed <= 7),
    specialMode: true,
  },
  
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    icon: <Fish className="w-10 h-10" />,
    description: 'Lakes & Rivers — pressure, hatches, solunar',
    heroImage: '/images/fishing-casting.png',
    thresholds: {
      ideal: { min: 0, max: 10 },
      choppy: 15,
      rough: 20,
      dangerous: 25,
    },
    wantsWind: false,
    primaryMetric: 'fishingScore',
    goodCondition: (speed) => speed < 15,
    specialMode: true,
  },
  
  windsurfing: {
    id: 'windsurfing',
    name: 'Windsurfing',
    icon: <WindsurferIcon className="w-10 h-10" />,
    description: 'Windsurfing & Winging — needs 8+ mph wind',
    heroImage: '/images/foilboard-sunset.png',
    thresholds: {
      tooLight: 6,
      ideal: { min: 10, max: 20 },
      foilMin: 8,
      slalomMin: 15,
      tooStrong: 30,
      gustFactor: 1.6,
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 8 && speed <= 25 && (!gust || gust/speed < 1.7),
  },
};

function getActivityStatus(activityId, windSpeed, windGust) {
  const config = ACTIVITY_CONFIGS[activityId];
  if (!config || windSpeed == null) return null;

  const good = config.goodCondition?.(windSpeed, windGust);
  if (!good) {
    if (config.wantsWind) {
      if (windSpeed >= config.thresholds.tooLight * 0.7) return 'marginal';
    } else {
      if (windSpeed <= (config.thresholds.choppy ?? config.thresholds.manageable ?? 12)) return 'marginal';
    }
    return null;
  }
  return 'active';
}

const ActivityMode = ({ selectedActivity, onActivityChange, windSpeed, windGust, fpsStation }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const scrollRef = React.useRef(null);
  const activities = ['kiting', 'windsurfing', 'snowkiting', 'sailing', 'fishing', 'boating', 'paddling', 'paragliding'];

  const fpsSpeed = fpsStation?.speed ?? fpsStation?.windSpeed;
  const fpsGust = fpsStation?.gust ?? fpsStation?.windGust;

  React.useEffect(() => {
    if (!scrollRef.current) return;
    const selected = scrollRef.current.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedActivity]);
  
  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        className={`
          flex items-center gap-1.5 p-1.5 rounded-2xl border overflow-x-auto hide-scrollbar
          ${isDark ? 'bg-[var(--bg-card)] border-[var(--border-color)]' : 'bg-white border-slate-200 shadow-sm'}
        `}
      >
        {activities.map(activityId => {
          const activity = ACTIVITY_CONFIGS[activityId];
          const isSelected = selectedActivity === activityId;
          const useSpeed = activityId === 'paragliding' && fpsSpeed != null ? fpsSpeed : windSpeed;
          const useGust = activityId === 'paragliding' && fpsGust != null ? fpsGust : windGust;
          const status = getActivityStatus(activityId, useSpeed, useGust);
          const isActive = status === 'active';
          const isMarginal = status === 'marginal';

          const statusDotColor = isActive ? 'bg-emerald-500' : isMarginal ? 'bg-amber-500' : null;
          
          return (
            <button
              key={activityId}
              data-selected={isSelected}
              onClick={() => onActivityChange(activityId)}
              className={`
                relative flex flex-col items-center gap-1 px-3.5 py-3 rounded-xl text-[11px] font-semibold
                transition-all duration-200 whitespace-nowrap outline-none min-w-[72px]
                ${isSelected 
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400/50 scale-[1.04]'
                  : (isDark 
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50')
                }
              `}
              title={activity.description}
            >
              <span className={`flex-shrink-0 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                {React.cloneElement(activity.icon, { className: isSelected ? 'w-6 h-6' : 'w-5 h-5' })}
              </span>
              <span className={`text-center leading-tight ${isSelected ? 'font-bold text-xs' : ''}`}>{activity.name}</span>
              {statusDotColor && !isSelected && (
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusDotColor} ring-2 ${
                  isDark ? 'ring-[var(--bg-card)]' : 'ring-white'
                } animate-pulse`} />
              )}
              {isSelected && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected activity confirmation banner */}
      {selectedActivity && ACTIVITY_CONFIGS[selectedActivity] && (
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
          ${isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'}
          transition-all duration-300
        `}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          <span>{ACTIVITY_CONFIGS[selectedActivity].description}</span>
          <span className={`ml-auto text-[10px] font-medium ${isDark ? 'text-sky-500/50' : 'text-sky-400'}`}>
            viewing
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Calculate activity-specific scores
 */
export function calculateActivityScore(activity, windSpeed, windGust, _windDirection) {
  const config = ACTIVITY_CONFIGS[activity];
  if (!config) return null;
  
  const gustFactor = windGust && windSpeed ? windGust / windSpeed : 1;
  
  if (config.wantsWind) {
    // Wind-seeking activities (kiting, sailing, windsurfing)
    let score = 0;
    let status = 'poor';
    let message = '';
    
    if (windSpeed < config.thresholds.tooLight) {
      score = Math.round((windSpeed / config.thresholds.tooLight) * 30);
      status = 'too_light';
      message = `Too light (${safeToFixed(windSpeed, 0)} mph) - need ${config.thresholds.tooLight}+ mph`;
    } else if (windSpeed > config.thresholds.tooStrong) {
      score = Math.max(0, 100 - (windSpeed - config.thresholds.tooStrong) * 5);
      status = 'too_strong';
      message = `Too strong (${safeToFixed(windSpeed, 0)} mph) - dangerous conditions`;
    } else if (windSpeed >= config.thresholds.ideal.min && windSpeed <= config.thresholds.ideal.max) {
      score = 85 + Math.round((1 - Math.abs(windSpeed - (config.thresholds.ideal.min + config.thresholds.ideal.max) / 2) / 10) * 15);
      status = 'ideal';
      message = `Ideal conditions (${safeToFixed(windSpeed, 0)} mph)`;
    } else if (windSpeed < config.thresholds.ideal.min) {
      score = 50 + Math.round((windSpeed - config.thresholds.tooLight) / (config.thresholds.ideal.min - config.thresholds.tooLight) * 35);
      status = 'light';
      message = `Light but usable (${safeToFixed(windSpeed, 0)} mph)`;
    } else {
      score = 70 - Math.round((windSpeed - config.thresholds.ideal.max) / (config.thresholds.tooStrong - config.thresholds.ideal.max) * 30);
      status = 'strong';
      message = `Strong (${safeToFixed(windSpeed, 0)} mph) - experienced only`;
    }
    
    // Penalize for gusty conditions
    if (gustFactor > config.thresholds.gustFactor) {
      score = Math.round(score * 0.8);
      status = 'gusty';
      message += ` - GUSTY (${safeToFixed(windGust, 0)} mph gusts)`;
    }
    
    return { score: Math.min(100, Math.max(0, score)), status, message, gustFactor };
    
  } else {
    // Calm-seeking activities (boating, paddling)
    return calculateGlassScore(windSpeed, windGust, config);
  }
}

/**
 * Calculate Glass Score for calm-seeking activities
 */
export function calculateGlassScore(windSpeed, windGust, config = ACTIVITY_CONFIGS.boating) {
  if (windSpeed == null) {
    return { score: null, status: 'unknown', message: 'No wind data' };
  }

  const t = config?.thresholds || {};
  const idealMax = t.ideal?.max ?? 8;
  const choppy = t.choppy ?? t.manageable ?? 10;
  const rough = t.rough ?? 15;
  const danger = t.dangerous ?? t.difficult ?? 25;
  const actName = config?.name?.toLowerCase() || 'boating';

  let score = 0;
  let status = 'poor';
  let message = '';
  let waveEstimate = 'unknown';

  if (windSpeed <= 2) {
    score = 100;
    status = 'glass';
    message = actName === 'fishing' ? 'Perfect — fish are active, water is still'
      : actName === 'paddling' ? 'Perfect glass — mirror-flat water'
      : 'Perfect glass conditions!';
    waveEstimate = 'flat';
  } else if (windSpeed <= idealMax) {
    score = 95 - (windSpeed - 2) * (15 / Math.max(1, idealMax - 2));
    status = 'excellent';
    message = actName === 'fishing' ? 'Excellent — light ripple helps disguise your line'
      : actName === 'paddling' ? 'Excellent — easy paddling, light ripple'
      : 'Excellent — nearly flat water';
    waveEstimate = 'ripples';
  } else if (windSpeed <= choppy) {
    score = 80 - (windSpeed - idealMax) * (15 / Math.max(1, choppy - idealMax));
    status = 'good';
    message = actName === 'fishing' ? 'Good — manageable chop, topwater still works'
      : actName === 'paddling' ? 'Good — light chop, stay aware of wind direction'
      : 'Good — light chop';
    waveEstimate = 'light_chop';
  } else if (windSpeed <= rough) {
    score = 65 - (windSpeed - choppy) * (20 / Math.max(1, rough - choppy));
    status = 'moderate';
    message = actName === 'fishing' ? 'Moderate — switch to jigs or deep bait, surface bite off'
      : actName === 'paddling' ? 'Moderate — only experienced paddlers, stay near shore'
      : 'Moderate — noticeable waves';
    waveEstimate = 'moderate_chop';
  } else if (windSpeed <= danger) {
    score = Math.max(5, 45 - (windSpeed - rough) * (40 / Math.max(1, danger - rough)));
    status = 'choppy';
    message = actName === 'fishing' ? 'Rough — fish sheltered coves or from shore'
      : actName === 'paddling' ? 'Rough — not recommended, risk of capsize'
      : 'Choppy — uncomfortable for small boats';
    waveEstimate = 'choppy';
  } else {
    score = 0;
    status = 'dangerous';
    message = actName === 'fishing' ? 'Dangerous — shore fishing only'
      : actName === 'paddling' ? 'Dangerous — do not paddle'
      : 'Dangerous — stay off the water';
    waveEstimate = 'dangerous';
  }

  if (windGust && windGust > windSpeed * 1.3) {
    score = Math.round(score * 0.85);
    message += ' (gusty)';
  }

  return {
    score: Math.max(0, Math.round(score)),
    status,
    message,
    waveEstimate,
    windSpeed,
  };
}

/**
 * Calculate morning calm window duration
 */
export function calculateCalmWindow(currentHour, thermalStartHour = 10, currentSpeed = 0) {
  if (currentHour >= thermalStartHour) {
    return { hoursRemaining: 0, message: 'Thermal already active' };
  }
  
  if (currentSpeed > 8) {
    return { hoursRemaining: 0, message: 'Already windy' };
  }
  
  const hoursRemaining = thermalStartHour - currentHour;
  
  return {
    hoursRemaining,
    message: hoursRemaining > 2 
      ? `${hoursRemaining} hours of calm expected`
      : `~${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} until wind picks up`,
    recommendation: hoursRemaining > 3 
      ? 'Great time for morning paddle/boat'
      : hoursRemaining > 1
        ? 'Head out soon for calm water'
        : 'Wind building soon - stay close to shore',
  };
}

/**
 * Get best activity recommendation for current conditions
 */
export function getBestActivity(windSpeed, windGust, windDirection) {
  const scores = {};
  
  for (const [activityId, _config] of Object.entries(ACTIVITY_CONFIGS)) {
    const result = calculateActivityScore(activityId, windSpeed, windGust, windDirection);
    if (result) {
      scores[activityId] = result;
    }
  }
  
  // Find best activity
  let best = null;
  let bestScore = -1;
  
  for (const [activityId, result] of Object.entries(scores)) {
    if (result.score > bestScore) {
      bestScore = result.score;
      best = activityId;
    }
  }
  
  return {
    best,
    bestScore,
    scores,
    recommendation: best ? `Best for ${ACTIVITY_CONFIGS[best].name}` : 'Conditions unclear',
  };
}

export function getActivityHeroImage(activityId) {
  const config = ACTIVITY_CONFIGS[activityId];
  if (!config) return null;
  return getRotatingImage(activityId, 'activity') || config.heroImage;
}

export default ActivityMode;
