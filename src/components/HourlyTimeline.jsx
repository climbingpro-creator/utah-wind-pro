import React from 'react';
import { Sun, Moon, Wind, Waves } from 'lucide-react';
import { ACTIVITY_CONFIGS, calculateActivityScore, calculateGlassScore } from './ActivityMode';

const HourlyTimeline = ({ 
  activity = 'kiting',
  currentConditions,
  thermalStartHour = 10,
  thermalPeakHour = 12,
  thermalEndHour = 17,
}) => {
  const currentHour = new Date().getHours();
  const config = ACTIVITY_CONFIGS[activity];
  
  // Generate hourly predictions based on typical thermal pattern
  const generateHourlyForecast = () => {
    const hours = [];
    
    for (let hour = 6; hour <= 20; hour++) {
      let predictedSpeed = 0;
      let phase = 'calm';
      
      // Simple thermal model
      if (hour < thermalStartHour - 1) {
        predictedSpeed = 2 + Math.random() * 3; // Morning calm
        phase = 'calm';
      } else if (hour < thermalStartHour) {
        predictedSpeed = 4 + Math.random() * 3; // Building
        phase = 'building';
      } else if (hour < thermalPeakHour) {
        predictedSpeed = 8 + (hour - thermalStartHour) * 2 + Math.random() * 3;
        phase = 'building';
      } else if (hour <= thermalPeakHour + 2) {
        predictedSpeed = 12 + Math.random() * 5; // Peak
        phase = 'peak';
      } else if (hour < thermalEndHour) {
        predictedSpeed = 10 - (hour - thermalPeakHour - 2) * 1.5 + Math.random() * 3;
        phase = 'fading';
      } else {
        predictedSpeed = 4 + Math.random() * 3; // Evening calm
        phase = 'calm';
      }
      
      // Use current conditions for current hour
      if (hour === currentHour && currentConditions?.windSpeed != null) {
        predictedSpeed = currentConditions.windSpeed;
      }
      
      // Calculate score based on activity
      let score, status;
      if (config.wantsWind) {
        const result = calculateActivityScore(activity, predictedSpeed, predictedSpeed * 1.3);
        score = result?.score || 0;
        status = result?.status || 'unknown';
      } else {
        const result = calculateGlassScore(predictedSpeed);
        score = result?.score || 0;
        status = result?.status || 'unknown';
      }
      
      hours.push({
        hour,
        time: hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
        predictedSpeed: Math.round(predictedSpeed),
        phase,
        score,
        status,
        isCurrent: hour === currentHour,
        isPast: hour < currentHour,
      });
    }
    
    return hours;
  };
  
  const hourlyData = generateHourlyForecast();
  
  // Get color for score
  const getScoreColor = (score, wantsWind) => {
    if (wantsWind) {
      if (score >= 80) return 'bg-green-500';
      if (score >= 60) return 'bg-lime-500';
      if (score >= 40) return 'bg-yellow-500';
      if (score >= 20) return 'bg-orange-500';
      return 'bg-red-500';
    } else {
      // Inverted for calm-seekers
      if (score >= 80) return 'bg-cyan-500';
      if (score >= 60) return 'bg-blue-500';
      if (score >= 40) return 'bg-yellow-500';
      if (score >= 20) return 'bg-orange-500';
      return 'bg-red-500';
    }
  };
  
  // Find best window
  const bestHours = hourlyData
    .filter(h => !h.isPast && h.score >= 70)
    .map(h => h.time);
  
  const bestWindow = bestHours.length > 0 
    ? `${bestHours[0]} - ${bestHours[bestHours.length - 1]}`
    : 'No ideal window today';
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-white">{config.name} Timeline</span>
        </div>
        <div className="text-xs text-slate-400">
          Best: <span className="text-cyan-400">{bestWindow}</span>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative">
        {/* Hour labels and bars */}
        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {hourlyData.map((hour, idx) => (
            <div 
              key={hour.hour}
              className={`flex flex-col items-center min-w-[36px] ${hour.isCurrent ? 'scale-110' : ''}`}
            >
              {/* Time label */}
              <div className={`text-[10px] mb-1 ${hour.isCurrent ? 'text-cyan-400 font-bold' : hour.isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                {hour.time}
              </div>
              
              {/* Score bar */}
              <div className="relative w-6 h-16 bg-slate-700 rounded-sm overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-300 ${getScoreColor(hour.score, config.wantsWind)} ${hour.isPast ? 'opacity-40' : ''}`}
                  style={{ height: `${hour.score}%` }}
                />
                {hour.isCurrent && (
                  <div className="absolute inset-0 border-2 border-cyan-400 rounded-sm" />
                )}
              </div>
              
              {/* Wind speed */}
              <div className={`text-[10px] mt-1 ${hour.isCurrent ? 'text-white font-bold' : hour.isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                {hour.predictedSpeed}
              </div>
              
              {/* Phase indicator */}
              <div className="mt-0.5">
                {hour.phase === 'calm' && <Moon className="w-2.5 h-2.5 text-slate-500" />}
                {hour.phase === 'building' && <Wind className="w-2.5 h-2.5 text-yellow-500" />}
                {hour.phase === 'peak' && <Sun className="w-2.5 h-2.5 text-orange-500" />}
                {hour.phase === 'fading' && <Wind className="w-2.5 h-2.5 text-slate-400" />}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Moon className="w-3 h-3" />
            <span>Calm</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-yellow-500" />
            <span>Building</span>
          </div>
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-orange-500" />
            <span>Peak</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${config.wantsWind ? 'bg-green-500' : 'bg-cyan-500'}`} />
            <span>Ideal</span>
          </div>
        </div>
      </div>
      
      {/* Activity-specific tips */}
      <div className="mt-3 text-xs text-slate-500">
        {config.wantsWind ? (
          <p>🎯 Green bars = ideal {config.name.toLowerCase()} conditions</p>
        ) : (
          <p>🎯 Blue bars = calm water for {config.name.toLowerCase()}</p>
        )}
      </div>
    </div>
  );
};

export default HourlyTimeline;
