import React from 'react';
import { Sun, Moon, Wind } from 'lucide-react';
import { ACTIVITY_CONFIGS } from './ActivityMode';

const HourlyTimeline = ({ 
  activity = 'kiting',
  forecastHours = [],
}) => {
  const config = ACTIVITY_CONFIGS[activity];
  const hourlyData = forecastHours;
  
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
    .filter(h => h.score >= 70)
    .map(h => h.time);
  
  const bestWindow = bestHours.length > 0 
    ? `${bestHours[0]} - ${bestHours[bestHours.length - 1]}`
    : 'No ideal near-term window';

  const averageConfidence = hourlyData.length > 0
    ? Math.round(hourlyData.reduce((sum, hour) => sum + (hour.confidence || 0), 0) / hourlyData.length)
    : 0;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-white">{config.name} Next 6 Hours</span>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Best: <span className="text-cyan-400">{bestWindow}</span></div>
          {averageConfidence > 0 && (
            <div>Confidence: <span className="text-slate-300">{averageConfidence}%</span></div>
          )}
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative">
        {/* Hour labels and bars */}
        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {hourlyData.map((hour) => (
            <div 
              key={hour.hour}
              className={`flex flex-col items-center min-w-[40px] ${hour.isCurrent ? 'scale-110' : ''}`}
            >
              {/* Time label */}
              <div className={`text-[10px] mb-1 ${hour.isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                {hour.time}
              </div>
              
              {/* Score bar */}
              <div className="relative w-6 h-16 bg-slate-700 rounded-sm overflow-hidden">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-300 ${getScoreColor(hour.score, config.wantsWind)}`}
                  style={{ height: `${hour.score}%` }}
                />
                {hour.isCurrent && (
                  <div className="absolute inset-0 border-2 border-cyan-400 rounded-sm" />
                )}
              </div>
              
              {/* Wind speed */}
              <div className={`text-[10px] mt-1 ${hour.isCurrent ? 'text-white font-bold' : 'text-slate-400'}`}>
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
          <p>🎯 Model blends live stations, recent trend, and hourly forecast.</p>
        ) : (
          <p>🎯 Blue bars = calmest water in the next 6 hours.</p>
        )}
      </div>
    </div>
  );
};

export default HourlyTimeline;
