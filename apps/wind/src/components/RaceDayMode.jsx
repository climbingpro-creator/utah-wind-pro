import React, { useState } from 'react';
import { Sailboat, Clock, Wind, Compass, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { safeToFixed } from '../utils/safeToFixed';

// Helper function - defined outside component to avoid hoisting issues
const getCardinal = (deg) => {
  if (deg == null) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const RaceDayMode = ({ 
  currentWind,
  windHistory = [],
  raceStartTime = '10:00',
  raceDuration = 3, // hours
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState(raceStartTime);
  
  // Calculate wind statistics
  const calculateWindStats = () => {
    if (!windHistory || windHistory.length === 0) {
      return {
        avgSpeed: currentWind?.speed || 0,
        minSpeed: currentWind?.speed || 0,
        maxSpeed: currentWind?.speed || 0,
        avgDirection: currentWind?.direction || 0,
        directionRange: 0,
        gustFactor: 1,
        consistency: 100,
        trend: 'stable',
      };
    }
    
    const speeds = windHistory.map(h => h.speed).filter(s => s != null);
    const directions = windHistory.map(h => h.direction).filter(d => d != null);
    const gusts = windHistory.map(h => h.gust).filter(g => g != null);
    
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    
    // Direction variance
    const avgDirection = directions.reduce((a, b) => a + b, 0) / directions.length;
    const directionRange = Math.max(...directions) - Math.min(...directions);
    
    // Gust factor
    const avgGust = gusts.length > 0 ? gusts.reduce((a, b) => a + b, 0) / gusts.length : avgSpeed;
    const gustFactor = avgGust / avgSpeed;
    
    // Consistency score (100 = perfectly steady)
    const speedVariance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;
    const consistency = Math.max(0, 100 - Math.sqrt(speedVariance) * 10);
    
    // Trend (last hour vs previous)
    const recentSpeeds = speeds.slice(-4);
    const olderSpeeds = speeds.slice(-8, -4);
    const recentAvg = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
    const olderAvg = olderSpeeds.length > 0 ? olderSpeeds.reduce((a, b) => a + b, 0) / olderSpeeds.length : recentAvg;
    
    let trend = 'stable';
    if (recentAvg > olderAvg + 2) trend = 'increasing';
    else if (recentAvg < olderAvg - 2) trend = 'decreasing';
    
    return {
      avgSpeed,
      minSpeed,
      maxSpeed,
      avgDirection,
      directionRange,
      gustFactor,
      consistency,
      trend,
    };
  };
  
  const stats = calculateWindStats();
  
  // Get race condition assessment
  const getRaceConditions = () => {
    const { avgSpeed, consistency, gustFactor, directionRange } = stats;
    
    let overall = 'good';
    const issues = [];
    const positives = [];
    
    // Speed assessment
    if (avgSpeed < 4) {
      overall = 'poor';
      issues.push('Wind too light for racing');
    } else if (avgSpeed < 6) {
      issues.push('Light wind - drifting conditions');
    } else if (avgSpeed > 20) {
      overall = 'caution';
      issues.push('Strong wind - experienced sailors only');
    } else if (avgSpeed >= 8 && avgSpeed <= 15) {
      positives.push('Ideal racing wind speed');
    }
    
    // Consistency
    if (consistency < 50) {
      overall = overall === 'good' ? 'fair' : overall;
      issues.push('Inconsistent wind - tactical advantage');
    } else if (consistency > 80) {
      positives.push('Steady wind - fair racing');
    }
    
    // Gusts
    if (gustFactor > 1.5) {
      overall = overall === 'good' ? 'caution' : overall;
      issues.push(`Gusty (${safeToFixed(gustFactor * 100 - 100, 0)}% above sustained)`);
    }
    
    // Direction shifts
    if (directionRange > 30) {
      issues.push(`Wind shifting (${safeToFixed(directionRange, 0)}° range)`);
    } else if (directionRange < 15) {
      positives.push('Steady direction');
    }
    
    return { overall, issues, positives };
  };
  
  const conditions = getRaceConditions();
  
  // Course recommendation based on wind
  const getCourseRecommendation = () => {
    const dir = stats.avgDirection;
    const cardinal = getCardinal(dir);
    
    return {
      windward: cardinal,
      startLine: `Perpendicular to ${cardinal} wind`,
      favored: stats.trend === 'increasing' ? 'Port end likely favored' : 
               stats.trend === 'decreasing' ? 'Starboard end likely favored' : 
               'Even start line',
    };
  };
  
  const course = getCourseRecommendation();
  
  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-orange-400" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };
  
  const getOverallColor = () => {
    switch (conditions.overall) {
      case 'good': return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'fair': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'caution': return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'poor': return 'bg-red-500/20 border-red-500/30 text-red-400';
      default: return 'bg-slate-500/20 border-slate-500/30 text-slate-400';
    }
  };
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sailboat className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium text-white">Race Day Conditions</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedStartTime}
            onChange={(e) => setSelectedStartTime(e.target.value)}
            className="bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
          >
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
          </select>
        </div>
      </div>
      
      {/* Overall Assessment */}
      <div className={`rounded-lg p-3 border mb-4 ${getOverallColor()}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium capitalize">{conditions.overall} Racing Conditions</span>
          <span className="text-xs opacity-75">{raceDuration}hr window</span>
        </div>
      </div>
      
      {/* Wind Statistics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs text-slate-500">Avg Wind</div>
          <div className="text-lg font-bold text-white">{safeToFixed(stats.avgSpeed, 0)}</div>
          <div className="text-[10px] text-slate-500">mph</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Range</div>
          <div className="text-lg font-bold text-white">{safeToFixed(stats.minSpeed, 0)}-{safeToFixed(stats.maxSpeed, 0)}</div>
          <div className="text-[10px] text-slate-500">mph</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Direction</div>
          <div className="text-lg font-bold text-white">{getCardinal(stats.avgDirection)}</div>
          <div className="text-[10px] text-slate-500">{safeToFixed(stats.avgDirection, 0)}°</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Trend</div>
          <div className="flex items-center justify-center">
            {getTrendIcon()}
          </div>
          <div className="text-[10px] text-slate-500 capitalize">{stats.trend}</div>
        </div>
      </div>
      
      {/* Consistency Meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400">Wind Consistency</span>
          <span className={`font-medium ${stats.consistency > 70 ? 'text-green-400' : stats.consistency > 40 ? 'text-yellow-400' : 'text-orange-400'}`}>
            {safeToFixed(stats.consistency, 0)}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              stats.consistency > 70 ? 'bg-green-500' : 
              stats.consistency > 40 ? 'bg-yellow-500' : 'bg-orange-500'
            }`}
            style={{ width: `${stats.consistency}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>Shifty</span>
          <span>Steady</span>
        </div>
      </div>
      
      {/* Course Recommendation */}
      <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-white">Course Setup</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Windward mark:</span>
            <span className="text-white ml-1">{course.windward}</span>
          </div>
          <div>
            <span className="text-slate-400">Start line:</span>
            <span className="text-white ml-1">{course.startLine}</span>
          </div>
        </div>
        <div className="text-xs text-cyan-400 mt-2">{course.favored}</div>
      </div>
      
      {/* Issues and Positives */}
      <div className="space-y-2">
        {conditions.positives.map((pos, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-green-400">
            <span>✓</span>
            <span>{pos}</span>
          </div>
        ))}
        {conditions.issues.map((issue, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-orange-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{issue}</span>
          </div>
        ))}
      </div>
      
      {/* Gust Factor Warning */}
      {stats.gustFactor > 1.3 && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400">
          ⚠️ Gust factor {safeToFixed((stats.gustFactor - 1) * 100, 0)}% - Reef early, watch for knockdowns
        </div>
      )}
    </div>
  );
};

export default RaceDayMode;
