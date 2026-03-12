import React from 'react';
import { Wind, Sailboat, Ship, Waves } from 'lucide-react';

// Activity configurations with thresholds and preferences
export const ACTIVITY_CONFIGS = {
  kiting: {
    id: 'kiting',
    name: 'Kiting',
    icon: '🪁',
    description: 'Kiteboarding & Kite Foiling',
    thresholds: {
      tooLight: 8,      // Below this = not worth it
      ideal: { min: 12, max: 22 },
      foilMin: 10,
      twinTipMin: 15,
      tooStrong: 30,    // Above this = dangerous
      gustFactor: 1.5,  // Gust/sustained ratio concern
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 10 && speed <= 25 && (!gust || gust/speed < 1.8),
  },
  
  sailing: {
    id: 'sailing',
    name: 'Sailing',
    icon: '⛵',
    description: 'Dinghy & Keelboat Sailing',
    thresholds: {
      tooLight: 4,      // Can still sail
      ideal: { min: 8, max: 18 },
      beginnerMax: 12,
      racingIdeal: { min: 10, max: 15 },
      tooStrong: 25,
      gustFactor: 1.4,  // Sailors care about consistency
    },
    wantsWind: true,
    primaryMetric: 'windProbability',
    goodCondition: (speed, gust) => speed >= 6 && speed <= 20 && (!gust || gust/speed < 1.5),
  },
  
  boating: {
    id: 'boating',
    name: 'Boating',
    icon: '🚤',
    description: 'Powerboats, Fishing, Cruising',
    thresholds: {
      ideal: { min: 0, max: 8 },  // Want CALM
      choppy: 10,       // Getting uncomfortable
      rough: 15,        // Most want to avoid
      dangerous: 25,    // Stay home
    },
    wantsWind: false,   // Inverse - want calm
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paddling: {
    id: 'paddling',
    name: 'Paddling',
    icon: '🏄',
    description: 'SUP, Kayak, Canoe',
    thresholds: {
      ideal: { min: 0, max: 6 },  // Want very calm
      manageable: 10,   // Experienced paddlers
      difficult: 15,    // Turn back
      dangerous: 20,    // Don't go out
    },
    wantsWind: false,
    primaryMetric: 'glassScore',
    goodCondition: (speed) => speed < 8,
  },
  
  paragliding: {
    id: 'paragliding',
    name: 'Paragliding',
    icon: '🪂',
    description: 'Point of the Mountain',
    thresholds: {
      tooLight: 5,
      ideal: { min: 10, max: 16 },
      tooStrong: 18,
      gustFactor: 1.3, // Very sensitive to gusts
    },
    wantsWind: true,
    primaryMetric: 'paraglidingScore',
    goodCondition: (speed, gust) => speed >= 5 && speed <= 18 && (!gust || gust - speed <= 5),
    specialMode: true, // Uses special paragliding dashboard
  },
  
  windsurfing: {
    id: 'windsurfing',
    name: 'Windsurfing',
    icon: '🏄‍♂️',
    description: 'Windsurfing & Wing Foiling',
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

const ActivityMode = ({ selectedActivity, onActivityChange }) => {
  const activities = ['kiting', 'sailing', 'boating', 'paddling', 'paragliding'];
  
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
      {activities.map(activityId => {
        const activity = ACTIVITY_CONFIGS[activityId];
        const isSelected = selectedActivity === activityId;
        
        return (
          <button
            key={activityId}
            onClick={() => onActivityChange(activityId)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }
            `}
            title={activity.description}
          >
            <span className="text-base">{activity.icon}</span>
            <span className="hidden sm:inline">{activity.name}</span>
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
