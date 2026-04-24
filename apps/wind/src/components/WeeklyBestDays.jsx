import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Wind, Waves, Sun, Cloud, CloudRain, AlertTriangle, Loader2 } from 'lucide-react';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { get7DayForecast } from '@utahwind/weather';
import { analyzeDailyTrends, findPreFrontalDays } from '../services/PatternLogic';

const WIND_SEEKING = new Set(['kiting', 'sailing', 'windsurfing', 'snowkiting']);

function parseAvgWind(windSpeedStr) {
  if (!windSpeedStr) return 0;
  const nums = windSpeedStr.match(/\d+/g);
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((s, n) => s + Number(n), 0) / nums.length;
}

function classifyWeather(shortForecast) {
  if (!shortForecast) return 'sunny';
  const f = shortForecast.toLowerCase();
  if (f.includes('rain') || f.includes('shower') || f.includes('storm')) return 'rainy';
  if (f.includes('wind')) return 'windy';
  if (f.includes('mostly cloudy') || f.includes('overcast')) return 'cloudy';
  if (f.includes('partly') || f.includes('cloud')) return 'partly_cloudy';
  return 'sunny';
}

function scoreDayForAllActivities(day, preFrontalSet) {
  const activities = Object.keys(ACTIVITY_CONFIGS);
  const scores = {};
  const wind = parseAvgWind(day.windSpeed);
  const isPF = preFrontalSet.has(day.name);
  const pattern = day.trendPattern?.type || 'CALM';

  for (const act of activities) {
    let score = 30;
    const wantWind = WIND_SEEKING.has(act);
    if (isPF) {
      score = wantWind ? 90 : 25;
    } else if (pattern === 'THERMAL_SETUP') {
      score = wantWind ? 75 : 35;
    } else if (pattern === 'POST_FRONTAL') {
      score = wantWind ? 55 : 40;
    } else if (pattern === 'SUSTAINED_WIND') {
      score = wantWind ? 70 : 20;
    } else {
      score = wantWind ? (wind >= 12 ? 60 : wind >= 8 ? 40 : 20) : (wind <= 8 ? 70 : wind <= 15 ? 45 : 15);
    }
    if (act === 'fishing') score = wind <= 10 ? 75 : wind <= 18 ? 50 : 25;
    scores[act] = { score };
  }
  return scores;
}

const WeeklyBestDays = ({ selectedActivity = 'kiting', locationId = 'utah-lake' }) => {
  const config = ACTIVITY_CONFIGS[selectedActivity];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawForecast, setRawForecast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await get7DayForecast(locationId);
        if (!cancelled) setRawForecast(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [locationId]);

  const days = useMemo(() => {
    if (!rawForecast) return null;
    const annotated = analyzeDailyTrends(rawForecast);
    const preFrontalDays = findPreFrontalDays(annotated);
    const preFrontalSet = new Set(preFrontalDays.map(pf => pf.day.name));
    const daytime = annotated.filter(p => p.isDaytime);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    return daytime.slice(0, 7).map(d => {
      const activityScores = scoreDayForAllActivities(d, preFrontalSet);
      const bestAct = Object.entries(activityScores).reduce((b, [k, v]) => v.score > (b.score || 0) ? { act: k, score: v.score } : b, { act: 'kiting', score: 0 });
      return {
        dayName: d.name?.split?.(' ')?.[0] || d.name,
        dateStr: '',
        weather: classifyWeather(d.shortForecast),
        avgWind: Math.round(parseAvgWind(d.windSpeed)),
        windType: d.trendPattern?.type?.toLowerCase()?.replace(/_/g, ' ') || 'calm',
        isToday: d.name === today || d.name?.startsWith?.('This'),
        bestActivity: bestAct.act,
        activityScores,
      };
    });
  }, [rawForecast]);

  if (loading || !days || days.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">7-Day Outlook</span>
          <span className="text-lg">{config.icon}</span>
        </div>
        <div className="text-center py-6 text-slate-400 text-sm">
          {loading ? <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" /> : <Wind className="w-6 h-6 mx-auto mb-2 opacity-40" />}
          {loading ? 'Loading weekly forecast...' : 'Weekly forecast data not available.'}
        </div>
      </div>
    );
  }
  
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
