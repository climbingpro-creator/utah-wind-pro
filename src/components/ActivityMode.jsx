import React from 'react';
import { Wind, Sailboat, Ship, Waves, Mountain, Anchor, Navigation, Cloud } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Activity configurations with thresholds and preferences
export const ACTIVITY_CONFIGS = {
  kiting: {
    id: 'kiting',
    name: 'Kiting',
    icon: <Navigation className="w-4 h-4" />,
    description: 'Kiteboarding & Foiling',
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
  
  sailing: {
    id: 'sailing',
    name: 'Sailing',
    icon: <Sailboat className="w-4 h-4" />,
    description: 'Dinghy & Keelboat',
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
    icon: <Ship className="w-4 h-4" />,
    description: 'Powerboats & Cruising',
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
    icon: <Waves className="w-4 h-4" />,
    description: 'SUP, Kayak, Canoe',
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
    icon: <Mountain className="w-4 h-4" />,
    description: 'Point of the Mountain',
    thresholds: {
      tooLight: 5,
      ideal: { min: 10, max: 16 },
      tooStrong: 18,
      gustFactor: 1.3,
    },
    wantsWind: true,
    primaryMetric: 'paraglidingScore',
    goodCondition: (speed, gust) => speed >= 6 && speed <= 18 && (!gust || gust - speed <= 5),
    specialMode: true,
    hideLakeSelector: true,
  },
  
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    icon: <Anchor className="w-4 h-4" />,
    description: 'Lakes & Rivers',
    thresholds: {
      ideal: { min: 0, max: 10 },
      choppy: 15,
      rough: 20,
    },
    wantsWind: false,
    primaryMetric: 'fishingScore',
    goodCondition: (speed) => speed < 15,
    specialMode: true,
    hideLakeSelector: true,
  },
  
  windsurfing: {
    id: 'windsurfing',
    name: 'Windsurfing',
    icon: <Wind className="w-4 h-4" />,
    description: 'Windsurfing & Winging',
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

const ActivityMode = ({ selectedActivity, onActivityChange, windSpeed, windGust }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activities = ['kiting', 'sailing', 'fishing', 'boating', 'paddling', 'paragliding'];
  
  return (
    <div className={`
      flex items-center gap-1.5 p-1.5 rounded-xl border backdrop-blur-xl overflow-x-auto hide-scrollbar
      ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}
    `}>
      {activities.map(activityId => {
        const activity = ACTIVITY_CONFIGS[activityId];
        const isSelected = selectedActivity === activityId;
        const status = getActivityStatus(activityId, windSpeed, windGust);
        const isActive = status === 'active';
        const isMarginal = status === 'marginal';
        
        return (
          <button
            key={activityId}
            onClick={() => onActivityChange(activityId)}
            className={`
              relative flex flex-col sm:flex-row items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-lg text-sm font-bold tracking-wide
              transition-all duration-300 ease-out whitespace-nowrap outline-none
              ${isSelected 
                ? (isActive
                    ? 'bg-green-500 text-white shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)] ring-1 ring-green-400/50'
                    : isMarginal
                      ? 'bg-amber-500 text-white shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/50'
                      : 'bg-primary text-white shadow-[0_0_15px_-3px_rgba(14,165,233,0.4)] ring-1 ring-sky-400/50')
                : isActive
                  ? (isDark
                      ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20 ring-1 ring-green-500/30'
                      : 'text-green-700 bg-green-50 hover:bg-green-100 ring-1 ring-green-400/40')
                  : isMarginal
                    ? (isDark
                        ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/30'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-400/40')
                    : (isDark 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
              }
            `}
            title={activity.description}
          >
            <span className={`transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
              {activity.icon}
            </span>
            <span className="hidden sm:inline">{activity.name}</span>
            {isActive && !isSelected && (
              <span className="absolute top-1 sm:-top-1 right-1 sm:-right-1 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-2 ring-transparent" />
            )}
            {isMarginal && !isSelected && !isActive && (
              <span className="absolute top-1 sm:-top-1 right-1 sm:-right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-transparent" />
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Calculate activity-specific scores
 */
export function calculateActivityScore(activity, windSpeed, windGust, windDirection) {
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
      message = `Too light (${windSpeed?.toFixed(0) || 0} mph) - need ${config.thresholds.tooLight}+ mph`;
    } else if (windSpeed > config.thresholds.tooStrong) {
      score = Math.max(0, 100 - (windSpeed - config.thresholds.tooStrong) * 5);
      status = 'too_strong';
      message = `Too strong (${windSpeed?.toFixed(0)} mph) - dangerous conditions`;
    } else if (windSpeed >= config.thresholds.ideal.min && windSpeed <= config.thresholds.ideal.max) {
      score = 85 + Math.round((1 - Math.abs(windSpeed - (config.thresholds.ideal.min + config.thresholds.ideal.max) / 2) / 10) * 15);
      status = 'ideal';
      message = `Ideal conditions (${windSpeed?.toFixed(0)} mph)`;
    } else if (windSpeed < config.thresholds.ideal.min) {
      score = 50 + Math.round((windSpeed - config.thresholds.tooLight) / (config.thresholds.ideal.min - config.thresholds.tooLight) * 35);
      status = 'light';
      message = `Light but usable (${windSpeed?.toFixed(0)} mph)`;
    } else {
      score = 70 - Math.round((windSpeed - config.thresholds.ideal.max) / (config.thresholds.tooStrong - config.thresholds.ideal.max) * 30);
      status = 'strong';
      message = `Strong (${windSpeed?.toFixed(0)} mph) - experienced only`;
    }
    
    // Penalize for gusty conditions
    if (gustFactor > config.thresholds.gustFactor) {
      score = Math.round(score * 0.8);
      status = 'gusty';
      message += ` - GUSTY (${windGust?.toFixed(0)} mph gusts)`;
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
  
  let score = 0;
  let status = 'poor';
  let message = '';
  let waveEstimate = 'unknown';
  
  // Perfect glass = 100, increases wind = lower score
  if (windSpeed <= 2) {
    score = 100;
    status = 'glass';
    message = 'Perfect glass conditions!';
    waveEstimate = 'flat';
  } else if (windSpeed <= 5) {
    score = 95 - (windSpeed - 2) * 5;
    status = 'excellent';
    message = 'Excellent - nearly flat water';
    waveEstimate = 'ripples';
  } else if (windSpeed <= 8) {
    score = 80 - (windSpeed - 5) * 5;
    status = 'good';
    message = 'Good - light chop';
    waveEstimate = 'light_chop';
  } else if (windSpeed <= 12) {
    score = 65 - (windSpeed - 8) * 5;
    status = 'moderate';
    message = 'Moderate - noticeable waves';
    waveEstimate = 'moderate_chop';
  } else if (windSpeed <= 18) {
    score = 45 - (windSpeed - 12) * 4;
    status = 'choppy';
    message = 'Choppy - uncomfortable for small boats';
    waveEstimate = 'choppy';
  } else if (windSpeed <= 25) {
    score = 21 - (windSpeed - 18) * 3;
    status = 'rough';
    message = 'Rough - stay near shore';
    waveEstimate = 'rough';
  } else {
    score = 0;
    status = 'dangerous';
    message = 'Dangerous - stay off the water';
    waveEstimate = 'dangerous';
  }
  
  // Gusts make it worse for boaters
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
  
  for (const [activityId, config] of Object.entries(ACTIVITY_CONFIGS)) {
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

export default ActivityMode;
