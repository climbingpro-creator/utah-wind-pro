import { useState, useEffect } from 'react';
import { Calendar, Wind, ArrowUp, ArrowDown, Sun, Cloud, TrendingUp, ChevronRight, Compass, Anchor, Thermometer, Clock } from 'lucide-react';
import { calculate5DayForecast, getForecastSummary, getConfidenceDescription } from '../services/MultiDayForecast';
import { KITE_SPEED_THRESHOLDS } from './KiteSafety';
import { safeToFixed } from '../utils/safeToFixed';

export function FiveDayForecast({ conditions, isLoading }) {
  const [forecasts, setForecasts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  
  useEffect(() => {
    if (conditions) {
      const fiveDay = calculate5DayForecast({
        pressure: conditions.pressure,
        temperature: conditions.temperature,
        pressureGradient: conditions.pressureGradient,
      });
      setForecasts(fiveDay);
      setSummary(getForecastSummary(fiveDay));
    }
  }, [conditions]);
  
  if (isLoading || forecasts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  const getWindTypeColor = (type) => {
    if (type === 'SE Thermal') return 'text-cyan-400';
    if (type === 'North Flow') return 'text-purple-400';
    return 'text-slate-400';
  };
  
  const getWindTypeBg = (type) => {
    if (type === 'SE Thermal') return 'bg-cyan-500/10 border-cyan-500/30';
    if (type === 'North Flow') return 'bg-purple-500/10 border-purple-500/30';
    return 'bg-slate-700/50 border-slate-600';
  };
  
  const getProbabilityColor = (prob) => {
    if (prob >= 60) return 'text-green-400';
    if (prob >= 40) return 'text-yellow-400';
    if (prob >= 20) return 'text-orange-400';
    return 'text-slate-500';
  };
  
  const getConfidenceColor = (conf) => {
    if (conf === 'high') return 'text-green-400';
    if (conf === 'good') return 'text-emerald-400';
    if (conf === 'moderate') return 'text-yellow-400';
    return 'text-slate-500';
  };
  
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-200">5-Day Wind Forecast</h3>
          </div>
          <span className="text-xs text-slate-500">Based on 3 years of data</span>
        </div>
        
        {/* Summary */}
        {summary && summary.bestDay && (
          <div className={`mt-3 p-3 rounded-lg border ${getWindTypeBg(summary.bestDay.primary.type)}`}>
            <p className={`font-semibold ${getWindTypeColor(summary.bestDay.primary.type)}`}>
              {summary.headline}
            </p>
            <p className="text-sm text-slate-400 mt-1">{summary.message}</p>
          </div>
        )}
      </div>
      
      {/* 5-Day Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {forecasts.map((day, idx) => (
            <button
              key={day.date}
              onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
              className={`
                p-3 rounded-lg border transition-all text-center
                ${expandedDay === idx 
                  ? getWindTypeBg(day.primary.type)
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }
              `}
            >
              <p className={`text-xs font-medium ${day.day === 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                {day.dayName}
              </p>
              <p className="text-[10px] text-slate-500">{day.date.slice(5)}</p>
              
              {/* Wind Type Icon */}
              <div className="my-2">
                {day.primary.type === 'SE Thermal' ? (
                  <div className="relative mx-auto w-8 h-8">
                    <Sun className="w-8 h-8 text-yellow-400/50" />
                    <Wind className="w-4 h-4 text-cyan-400 absolute bottom-0 right-0" />
                  </div>
                ) : day.primary.type === 'North Flow' ? (
                  <div className="relative mx-auto w-8 h-8">
                    <Cloud className="w-8 h-8 text-slate-400/50" />
                    <ArrowDown className="w-4 h-4 text-purple-400 absolute bottom-0 right-0" />
                  </div>
                ) : (
                  <Wind className="w-8 h-8 text-slate-500 mx-auto" />
                )}
              </div>
              
              {/* Temperature */}
              {day.temperature && (
                <div className="text-[10px] text-orange-300 mb-1">
                  {day.primary.type === 'North Flow' 
                    ? `${day.temperature.northFlowHigh}°`
                    : `${day.temperature.high}°`}
                </div>
              )}
              
              {/* Probability */}
              <p className={`text-lg font-bold ${getProbabilityColor(day.primary.probability)}`}>
                {day.primary.probability}%
              </p>
              
              {/* Wind Type & Start Time */}
              <p className={`text-[10px] ${getWindTypeColor(day.primary.type)}`}>
                {day.primary.type === 'SE Thermal' 
                  ? `SE ${day.seThermal.startHour}:00` 
                  : day.primary.type === 'North Flow' 
                    ? `N ${day.northFlow.startHour}:00`
                    : '?'}
              </p>
              
              {/* Kite-ability indicator */}
              {day.kiteability && day.kiteability.foil && (
                <div className={`text-[9px] ${day.kiteability.color}`}>
                  {day.kiteability.twinTip ? '🏄' : '🏄F'}
                </div>
              )}
              
              {/* Confidence Indicator */}
              <div className="mt-1 flex justify-center gap-0.5">
                {['high', 'good', 'moderate', 'low'].map((level, i) => (
                  <div
                    key={level}
                    className={`w-1.5 h-1.5 rounded-full ${
                      (day.confidence === 'high' && i <= 3) ||
                      (day.confidence === 'good' && i <= 2) ||
                      (day.confidence === 'moderate' && i <= 1) ||
                      (day.confidence === 'low' && i === 0)
                        ? getConfidenceColor(day.confidence).replace('text-', 'bg-')
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
        
        {/* Expanded Day Details */}
        {expandedDay !== null && forecasts[expandedDay] && (
          <div className={`mt-4 p-4 rounded-lg border ${getWindTypeBg(forecasts[expandedDay].primary.type)}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-200">
                {forecasts[expandedDay].dayName} - {forecasts[expandedDay].date}
              </h4>
              <span className={`text-xs ${getConfidenceColor(forecasts[expandedDay].confidence)}`}>
                {getConfidenceDescription(forecasts[expandedDay].confidence)}
              </span>
            </div>
            
            {/* Temperature Bar */}
            {forecasts[expandedDay].temperature && (
              <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/50 rounded-lg">
                <Thermometer className="w-5 h-5 text-orange-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Temperature</span>
                    <span className="text-orange-300 font-medium">
                      {forecasts[expandedDay].temperature.high}° / {forecasts[expandedDay].temperature.low}°
                    </span>
                  </div>
                  {forecasts[expandedDay].primary.type === 'North Flow' && (
                    <p className="text-[10px] text-purple-400 mt-0.5">
                      Cooler with front: ~{forecasts[expandedDay].temperature.northFlowHigh}°
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {/* SE Thermal */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">SE Thermal</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {forecasts[expandedDay].seThermal.probability}%
                </p>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Start: <span className="text-cyan-300">{forecasts[expandedDay].seThermal.startHour}:00</span></span>
                  </div>
                  <p>Peak: <span className="text-cyan-300">{forecasts[expandedDay].seThermal.peakHour}:00</span></p>
                  <p>Speed: ~{safeToFixed(forecasts[expandedDay].seThermal.expectedSpeed, 0)} mph</p>
                  <p>Direction: {forecasts[expandedDay].seThermal.expectedDirection}° SSE</p>
                </div>
                
                {/* Kite-ability */}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Anchor className="w-3 h-3" />
                    <span>Kite:</span>
                    {forecasts[expandedDay].seThermal.expectedSpeed >= KITE_SPEED_THRESHOLDS.twinTip.min ? (
                      <span className="text-green-400">All kites ✓</span>
                    ) : forecasts[expandedDay].seThermal.expectedSpeed >= KITE_SPEED_THRESHOLDS.foil.min ? (
                      <span className="text-cyan-400">Foil only</span>
                    ) : (
                      <span className="text-slate-500">Too light</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* North Flow */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">North Flow</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {forecasts[expandedDay].northFlow.probability}%
                </p>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Start: <span className="text-purple-300">Afternoon/Evening</span></span>
                  </div>
                  <p>Speed: ~{forecasts[expandedDay].northFlow.expectedSpeed} mph</p>
                  <p>Prefrontal/gap wind</p>
                </div>
                
                {/* Kite-ability for North Flow */}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Anchor className="w-3 h-3" />
                    <span>Kite:</span>
                    <span className="text-green-400">All kites ✓</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Factors */}
            {forecasts[expandedDay].factors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Analysis Factors:</p>
                {forecasts[expandedDay].factors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-slate-600" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-500/30" />
            <span>SE Thermal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500/30" />
            <span>North Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </div>
            <span>Confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
