import React from 'react';
import { Waves, Anchor, AlertTriangle } from 'lucide-react';
import { calculateGlassScore, calculateCalmWindow } from './ActivityMode';

const GlassScore = ({ windSpeed, windGust, thermalStartHour = 10, size = 180 }) => {
  const glassData = calculateGlassScore(windSpeed, windGust);
  const currentHour = new Date().getHours();
  const calmWindow = calculateCalmWindow(currentHour, thermalStartHour, windSpeed);
  
  const score = glassData.score ?? 0;
  
  // Color based on score
  const getColor = (score) => {
    if (score >= 90) return { main: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' };
    if (score >= 70) return { main: '#84cc16', bg: 'bg-lime-500/20', border: 'border-lime-500/30', text: 'text-lime-400' };
    if (score >= 50) return { main: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    if (score >= 30) return { main: '#f97316', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' };
    return { main: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' };
  };
  
  const colors = getColor(score);
  
  // Wave animation based on conditions
  const getWaveClass = () => {
    if (score >= 90) return 'animate-none opacity-20';
    if (score >= 70) return 'animate-pulse opacity-30';
    if (score >= 50) return 'animate-pulse opacity-50';
    return 'animate-bounce opacity-70';
  };
  
  // SVG arc for the gauge
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className={`rounded-2xl p-4 ${colors.bg} border ${colors.border}`}>
      <div className="text-xs text-slate-400 text-center mb-2 flex items-center justify-center gap-1">
        <Anchor className="w-3 h-3" />
        Glass Score (Calm Water)
      </div>
      
      <div className="relative flex flex-col items-center">
        {/* Gauge */}
        <svg width={size} height={size / 2 + 20} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Score arc */}
          <path
            d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none"
            stroke={colors.main}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
          
          {/* Wave icon in center */}
          <g transform={`translate(${size/2 - 12}, ${size/2 - 30})`}>
            <Waves className={`w-6 h-6 ${colors.text} ${getWaveClass()}`} />
          </g>
        </svg>
        
        {/* Score display */}
        <div className="absolute" style={{ top: size / 2 - 15 }}>
          <div className={`text-4xl font-bold ${colors.text}`}>
            {score}
          </div>
        </div>
        
        {/* Status */}
        <div className={`text-sm font-medium ${colors.text} mt-1`}>
          {glassData.status === 'glass' && '🪞 Perfect Glass'}
          {glassData.status === 'excellent' && '✨ Excellent'}
          {glassData.status === 'good' && '👍 Good'}
          {glassData.status === 'moderate' && '〰️ Moderate'}
          {glassData.status === 'choppy' && '🌊 Choppy'}
          {glassData.status === 'rough' && '⚠️ Rough'}
          {glassData.status === 'dangerous' && '🚫 Dangerous'}
        </div>
        
        {/* Wave estimate */}
        <div className="text-xs text-slate-500 mt-1">
          {glassData.waveEstimate === 'flat' && 'Mirror-flat water'}
          {glassData.waveEstimate === 'ripples' && 'Light ripples only'}
          {glassData.waveEstimate === 'light_chop' && 'Light chop (< 6")'}
          {glassData.waveEstimate === 'moderate_chop' && 'Moderate chop (6-12")'}
          {glassData.waveEstimate === 'choppy' && 'Choppy (1-2 ft waves)'}
          {glassData.waveEstimate === 'rough' && 'Rough (2-3 ft waves)'}
          {glassData.waveEstimate === 'dangerous' && 'Dangerous waves'}
        </div>
      </div>
      
      {/* Calm window info */}
      {calmWindow.hoursRemaining > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Morning calm window:</span>
            <span className="text-cyan-400 font-medium">
              ~{calmWindow.hoursRemaining}h remaining
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {calmWindow.recommendation}
          </div>
        </div>
      )}
      
      {/* Wind info */}
      <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
        <div className="text-center">
          <div className="text-slate-500">Wind</div>
          <div className={`font-medium ${windSpeed > 10 ? 'text-orange-400' : 'text-slate-300'}`}>
            {windSpeed?.toFixed(1) || '--'} mph
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">Gusts</div>
          <div className={`font-medium ${windGust > 15 ? 'text-orange-400' : 'text-slate-300'}`}>
            {windGust?.toFixed(1) || '--'} mph
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassScore;
