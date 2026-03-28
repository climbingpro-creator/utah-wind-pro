import React from 'react';
import { Calendar, Wind, Waves, Sun, Cloud, CloudRain, AlertTriangle } from 'lucide-react';
import { ACTIVITY_CONFIGS, getBestActivity } from './ActivityMode';

const WeeklyBestDays = ({ weeklyForecast, selectedActivity = 'kiting' }) => {
  const config = ACTIVITY_CONFIGS[selectedActivity];
  
  // Generate mock weekly data if not provided
  // In production, this would come from NWS forecast
  const generateWeeklyData = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Simulated forecast data
      const patterns = [
        { wind: 5, type: 'calm', weather: 'sunny' },
        { wind: 12, type: 'thermal', weather: 'sunny' },
        { wind: 18, type: 'north_flow', weather: 'partly_cloudy' },
        { wind: 8, type: 'light', weather: 'cloudy' },
        { wind: 25, type: 'strong', weather: 'windy' },
        { wind: 3, type: 'glass', weather: 'sunny' },
        { wind: 15, type: 'thermal', weather: 'sunny' },
      ];
      
      const pattern = patterns[i % patterns.length];
      const bestActivity = getBestActivity(pattern.wind, pattern.wind * 1.3);
      
      days.push({
        date,
        dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[date.getDay()],
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgWind: pattern.wind,
        windType: pattern.type,
        weather: pattern.weather,
        bestActivity: bestActivity.best,
        bestScore: bestActivity.bestScore,
        activityScores: bestActivity.scores,
        isToday: i === 0,
      });
    }
    
    return days;
  };
  
  const days = weeklyForecast || generateWeeklyData();
  
  // Get icon for weather
  const getWeatherIcon = (weather) => {
    switch (weather) {
      case 'sunny': return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'partly_cloudy': return <Cloud className="w-4 h-4 text-slate-400" />;
      case 'cloudy': return <Cloud className="w-4 h-4 text-slate-500" />;
      case 'rainy': return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'windy': return <Wind className="w-4 h-4 text-cyan-400" />;
      default: return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };
  
  // Get recommendation for the day
  const getDayRecommendation = (day) => {
    const score = day.activityScores[selectedActivity]?.score || 0;
    
    if (score >= 80) return { text: 'Excellent!', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 60) return { text: 'Good', color: 'text-lime-400', bg: 'bg-lime-500/20' };
    if (score >= 40) return { text: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (score >= 20) return { text: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { text: 'Skip', color: 'text-red-400', bg: 'bg-red-500/20' };
  };
  
  // Find best day for selected activity
  const bestDay = days.reduce((best, day) => {
    const score = day.activityScores[selectedActivity]?.score || 0;
    return score > (best?.score || 0) ? { ...day, score } : best;
  }, null);
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">7-Day Outlook</span>
          <span className="text-lg">{config.icon}</span>
        </div>
        {bestDay && (
          <div className="text-xs text-slate-400">
            Best: <span className="text-cyan-400">{bestDay.dayName}</span>
          </div>
        )}
      </div>
      
      {/* Daily cards */}
      <div className="space-y-2">
        {days.map((day, idx) => {
          const rec = getDayRecommendation(day);
          const score = day.activityScores[selectedActivity]?.score || 0;
          const isBestDay = bestDay && day.dayName === bestDay.dayName;
          
          return (
            <div 
              key={idx}
              className={`
                flex items-center gap-3 p-2 rounded-lg transition-colors
                ${day.isToday ? 'bg-slate-700/50 border border-slate-600' : 'hover:bg-slate-700/30'}
                ${isBestDay ? 'ring-1 ring-cyan-500/50' : ''}
              `}
            >
              {/* Day */}
              <div className="w-16">
                <div className={`text-sm font-medium ${day.isToday ? 'text-cyan-400' : 'text-white'}`}>
                  {day.dayName}
                </div>
                <div className="text-xs text-slate-500">{day.dateStr}</div>
              </div>
              
              {/* Weather */}
              <div className="w-8 flex justify-center">
                {getWeatherIcon(day.weather)}
              </div>
              
              {/* Wind */}
              <div className="w-16 text-center">
                <div className="text-sm text-white">{day.avgWind} mph</div>
                <div className="text-[10px] text-slate-500 capitalize">{day.windType.replace('_', ' ')}</div>
              </div>
              
              {/* Score bar */}
              <div className="flex-1">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      score >= 80 ? 'bg-green-500' :
                      score >= 60 ? 'bg-lime-500' :
                      score >= 40 ? 'bg-yellow-500' :
                      score >= 20 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
              
              {/* Recommendation */}
              <div className={`w-20 text-right`}>
                <span className={`text-xs px-2 py-0.5 rounded ${rec.bg} ${rec.color}`}>
                  {rec.text}
                </span>
              </div>
              
              {/* Best activity icon */}
              <div className="w-6 text-center" title={`Best for ${ACTIVITY_CONFIGS[day.bestActivity]?.name}`}>
                <span className="text-sm">{ACTIVITY_CONFIGS[day.bestActivity]?.icon}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>Score for {config.name}:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>80+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>40-79</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>&lt;40</span>
          </div>
        </div>
        <div className="text-slate-400">
          Icon = best activity for that day
        </div>
      </div>
    </div>
  );
};

export default WeeklyBestDays;
