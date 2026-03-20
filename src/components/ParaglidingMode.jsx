import React, { useState, useEffect, useMemo } from 'react';
import { Wind, Mountain, Sun, Sunset, AlertTriangle, CheckCircle, XCircle, Clock, Users, Radio, Brain, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { predictParagliding } from '../services/ParaglidingPredictor';
import { safeToFixed } from '../utils/safeToFixed';

// Paragliding site configurations
export const PARAGLIDING_SITES = {
  'flight-park-south': {
    id: 'flight-park-south',
    name: 'Flight Park South',
    shortName: 'South Side',
    location: 'Lehi, Utah',
    coordinates: { lat: 40.4567, lng: -111.9027 },
    elevation: { launch: 5148, lz: 4834 },
    stationId: 'FPS',
    
    // Wind requirements for P2 paragliders
    wind: {
      direction: { min: 110, max: 250, ideal: 180, label: 'ESE to WSW' },
      speed: { min: 5, ideal: { min: 8, max: 16 }, max: 20 },
      gustLimit: 7,
    },
    
    // Best flying times
    bestTime: 'morning',
    flyingWindow: {
      morning: { start: 'sunrise', duration: 3, label: 'Within 3 hours after sunrise' },
      evening: { start: 'sunset', offset: -2, label: '2 hours before sunset (caution)' },
    },
    
    // Hazards
    hazards: [
      'Blow-back to towers and power lines behind parking',
      'Strong east wind creates rotors',
      'West wind creates rotors in west-end bowl',
      'Evening south wind often indicates weather change',
    ],
    
    description: "Nature's wind tunnel - steep slope facing south overlooking Utah Lake. Best morning site with smooth, laminar south winds.",
  },
  
  'flight-park-north': {
    id: 'flight-park-north',
    name: 'Flight Park North',
    shortName: 'North Side',
    location: 'Draper, Utah',
    coordinates: { lat: 40.4745, lng: -111.8928 },
    elevation: { launch: 5100, lz: 4600 },
    stationId: 'UTALP',
    
    wind: {
      direction: { min: 315, max: 45, ideal: 360, label: 'N to NW' },
      speed: { min: 6, ideal: { min: 12, max: 16 }, max: 18 },
      gustLimit: 5,
    },
    
    bestTime: 'evening',
    flyingWindow: {
      morning: { start: 'sunrise', duration: 3, label: 'Within 3 hours after sunrise' },
      evening: { start: 'sunset', offset: -2, label: '2 hours before sunset (best)' },
    },
    
    hazards: [
      'Midday turbulence - avoid flying midday',
      'Quarry venturi at west edge of lower bench',
      'Never cross ridge line toward south (rotors)',
      'Wind gradient - brisk aloft, nil at surface',
      'October sunset - sun blindness for traffic',
    ],
    
    description: 'Massive sand hill with bench ridge system. Best evening site as wind switches to north. Features lower and upper bench for altitude gains.',
  },
};

// Calculate if wind direction is within range (handles wrap-around for north)
function isDirectionInRange(direction, min, max) {
  if (direction == null) return false;
  
  // Handle wrap-around (e.g., 315-45 for north)
  if (min > max) {
    return direction >= min || direction <= max;
  }
  return direction >= min && direction <= max;
}

// Calculate flyability score
export function calculateParaglidingScore(site, windSpeed, windDirection, windGust) {
  const config = PARAGLIDING_SITES[site];
  if (!config) return null;
  
  let score = 0;
  let status = 'unflyable';
  let issues = [];
  let positives = [];
  
  const gustOver = windGust ? windGust - windSpeed : 0;
  
  // Direction check (most important)
  const directionOk = isDirectionInRange(windDirection, config.wind.direction.min, config.wind.direction.max);
  
  if (!directionOk) {
    issues.push(`Wind direction ${windDirection}° outside ${config.wind.direction.label} range`);
    score = 10;
  } else {
    score += 40;
    positives.push(`Direction ${windDirection}° is good (${config.wind.direction.label})`);
  }
  
  // Speed check — below minimum is NOT flyable, hard cap at 30
  if (windSpeed > config.wind.speed.max) {
    issues.push(`Wind ${safeToFixed(windSpeed, 0)} mph exceeds ${config.wind.speed.max} mph limit`);
    score = Math.min(score, 20);
  } else if (windSpeed < config.wind.speed.min) {
    issues.push(`Wind ${safeToFixed(windSpeed, 0)} mph below minimum ${config.wind.speed.min} mph`);
    score = Math.min(score, 30);
  } else if (windSpeed >= config.wind.speed.ideal.min && windSpeed <= config.wind.speed.ideal.max) {
    score += 40;
    positives.push(`Speed ${safeToFixed(windSpeed, 0)} mph is ideal (${config.wind.speed.ideal.min}-${config.wind.speed.ideal.max} mph)`);
  } else {
    score += 25;
    positives.push(`Speed ${safeToFixed(windSpeed, 0)} mph is acceptable`);
  }
  
  // Gust check
  if (gustOver > config.wind.gustLimit) {
    issues.push(`Gusts ${safeToFixed(windGust, 0)} mph (${safeToFixed(gustOver, 0)} over sustained) exceed ${config.wind.gustLimit} mph limit`);
    score = Math.max(0, score - 30);
  } else if (gustOver > 0) {
    score += 15;
    positives.push(`Gusts manageable (${safeToFixed(gustOver, 0)} mph over sustained)`);
  } else {
    score += 20;
    positives.push('Smooth conditions (no significant gusts)');
  }
  
  // Determine status — speed must be at or above minimum for any flyable status
  const speedInRange = windSpeed >= config.wind.speed.min && windSpeed <= config.wind.speed.max;
  if (score >= 80 && directionOk && speedInRange && gustOver <= config.wind.gustLimit) {
    status = 'excellent';
  } else if (score >= 60 && directionOk && speedInRange) {
    status = 'good';
  } else if (score >= 40 && directionOk && speedInRange) {
    status = 'marginal';
  } else {
    status = 'unflyable';
  }
  
  return {
    score: Math.min(100, Math.max(0, score)),
    status,
    issues,
    positives,
    directionOk,
    speedOk: windSpeed >= config.wind.speed.min && windSpeed <= config.wind.speed.max,
    gustOk: gustOver <= config.wind.gustLimit,
  };
}

// Site Card Component
const SiteCard = ({ site, windData, isLoading }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const config = PARAGLIDING_SITES[site];
  const stationData = windData?.[config.stationId];
  
  const windSpeed = stationData?.speed;
  const windDirection = stationData?.direction;
  const windGust = stationData?.gust;
  
  const assessment = calculateParaglidingScore(site, windSpeed, windDirection, windGust);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return isDark ? 'bg-green-500/15 border-green-500/40' : 'bg-green-50 border-green-300';
      case 'good': return isDark ? 'bg-lime-500/15 border-lime-500/40' : 'bg-lime-50 border-lime-300';
      case 'marginal': return isDark ? 'bg-yellow-500/15 border-yellow-500/40' : 'bg-yellow-50 border-yellow-300';
      default: return isDark ? 'bg-red-500/15 border-red-500/40' : 'bg-red-50 border-red-300';
    }
  };
  
  const getStatusIcon = (status) => {
    const cls = {
      excellent: isDark ? 'text-green-400' : 'text-green-600',
      good: isDark ? 'text-lime-400' : 'text-lime-600',
      marginal: isDark ? 'text-yellow-400' : 'text-yellow-600',
    };
    switch (status) {
      case 'excellent': return <CheckCircle className={`w-5 h-5 ${cls.excellent}`} />;
      case 'good': return <CheckCircle className={`w-5 h-5 ${cls.good}`} />;
      case 'marginal': return <AlertTriangle className={`w-5 h-5 ${cls.marginal}`} />;
      default: return <XCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />;
    }
  };
  
  const currentHour = new Date().getHours();
  const isBestTime = config.bestTime === 'morning' ? currentHour < 12 : currentHour >= 15;
  const okColor = isDark ? 'text-green-400' : 'text-green-600';
  const errColor = isDark ? 'text-red-400' : 'text-red-600';
  
  return (
    <div className={`rounded-xl border p-4 ${getStatusColor(assessment?.status || 'unflyable')}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{config.name}</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{config.location}</p>
        </div>
        <div className="flex items-center gap-2">
          {isBestTime && (
            <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
              {config.bestTime === 'morning' ? '☀️ Best AM' : '🌅 Best PM'}
            </span>
          )}
          {getStatusIcon(assessment?.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Wind</div>
          <div className={`text-xl font-bold ${assessment?.speedOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {safeToFixed(windSpeed, 0)}
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}> mph</span>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Direction</div>
          <div className={`text-xl font-bold ${assessment?.directionOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {safeToFixed(windDirection, 0)}°
          </div>
        </div>
        <div className="text-center">
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gusts</div>
          <div className={`text-xl font-bold ${assessment?.gustOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {safeToFixed(windGust, 0)}
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}> mph</span>
          </div>
        </div>
      </div>
      
      <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white/60 border border-slate-200'}`}>
        <div className={`text-xs mb-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>P2 Requirements</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Direction:</span>
            <span className={`ml-1 font-medium ${assessment?.directionOk ? okColor : errColor}`}>
              {config.wind.direction.label}
            </span>
          </div>
          <div>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Speed:</span>
            <span className={`ml-1 font-medium ${assessment?.speedOk ? okColor : errColor}`}>
              {config.wind.speed.min}-{config.wind.speed.max} mph
            </span>
          </div>
          <div>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Ideal:</span>
            <span className={`ml-1 font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              {config.wind.speed.ideal.min}-{config.wind.speed.ideal.max} mph
            </span>
          </div>
          <div>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Max Gust:</span>
            <span className={`ml-1 font-medium ${assessment?.gustOk ? okColor : errColor}`}>
              +{config.wind.gustLimit} mph
            </span>
          </div>
        </div>
      </div>
      
      {assessment && (
        <div className="space-y-1">
          {assessment.positives.slice(0, 2).map((msg, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${okColor}`}>
              <CheckCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
          {assessment.issues.slice(0, 2).map((msg, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${errColor}`}>
              <XCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Flyability Score</span>
          <span className={`text-lg font-bold ${
            assessment?.score >= 80 ? (isDark ? 'text-green-400' : 'text-green-600') :
            assessment?.score >= 60 ? (isDark ? 'text-lime-400' : 'text-lime-600') :
            assessment?.score >= 40 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : errColor
          }`}>
            {assessment?.score || 0}%
          </span>
        </div>
        <div className={`h-2 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div 
            className={`h-full transition-all duration-500 ${
              assessment?.score >= 80 ? 'bg-green-500' :
              assessment?.score >= 60 ? 'bg-lime-500' :
              assessment?.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${assessment?.score || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Predict wind switch based on indicators
function predictWindSwitch(windData, currentHour) {
  const indicators = [];
  let northSwitchLikelihood = 0;
  let estimatedSwitchTime = null;
  
  const findStation = (id) => windData?.[id] || windData?.stations?.find(s => s.id === id);
  
  const kslcData = findStation('KSLC');
  const fpsData = findStation('FPS');
  const utalpData = findStation('UTALP');
  const kpvuData = findStation('KPVU');
  
  const getSpeed = (d) => d?.speed || d?.windSpeed || 0;
  const getDir = (d) => d?.direction || d?.windDirection || 0;
  
  const kslcSpeed = getSpeed(kslcData);
  const kslcDir = getDir(kslcData);
  const fpsSpeed = getSpeed(fpsData);
  const fpsDir = getDir(fpsData);
  const utalpSpeed = getSpeed(utalpData);
  const utalpDir = getDir(utalpData);
  const kpvuSpeed = getSpeed(kpvuData);
  
  // 1. KSLC NW/N wind = early indicator (30-60 min lead time)
  const kslcIsNorth = (kslcDir >= 280 && kslcDir <= 360) || kslcDir <= 30;
  if (kslcIsNorth && kslcSpeed >= 5) {
    northSwitchLikelihood += 30;
    indicators.push({
      station: 'KSLC',
      signal: 'positive',
      message: `SLC Airport: ${safeToFixed(kslcSpeed, 0)} mph from ${safeToFixed(kslcDir, 0)}° - North flow active upstream`,
    });
  } else if (kslcIsNorth && kslcSpeed >= 3) {
    northSwitchLikelihood += 15;
    indicators.push({
      station: 'KSLC',
      signal: 'developing',
      message: `SLC Airport: Light NW ${safeToFixed(kslcSpeed, 0)} mph - North flow developing`,
    });
  }
  
  // 2. UTALP south wind dying = switch imminent
  const utalpIsSouth = utalpDir >= 140 && utalpDir <= 220;
  if (utalpIsSouth && utalpSpeed < 5 && currentHour >= 14) {
    northSwitchLikelihood += 25;
    indicators.push({
      station: 'UTALP',
      signal: 'developing',
      message: `UTALP: South dying (${safeToFixed(utalpSpeed, 0)} mph) - Switch to north imminent!`,
    });
    estimatedSwitchTime = '15-30 min';
  }
  
  // 3. UTALP already north = confirmed
  const utalpIsNorth = (utalpDir >= 315 || utalpDir <= 45);
  if (utalpIsNorth && utalpSpeed >= 5) {
    northSwitchLikelihood += 40;
    indicators.push({
      station: 'UTALP',
      signal: 'positive',
      message: `UTALP: North side ACTIVE - ${safeToFixed(utalpSpeed, 0)} mph from ${safeToFixed(utalpDir, 0)}°`,
    });
  }
  
  // 4. Time of day bonus (March-Oct, 3-7 PM = high probability)
  const month = new Date().getMonth() + 1;
  if (currentHour >= 15 && currentHour <= 19 && month >= 3 && month <= 10) {
    northSwitchLikelihood += 15;
    indicators.push({
      station: 'TIME',
      signal: 'positive',
      message: `Prime time for evening north flow (${currentHour > 12 ? currentHour - 12 : currentHour} PM, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]})`,
    });
  }
  
  // 5. Provo light/variable = no south flow blocking
  if (kpvuSpeed < 8) {
    northSwitchLikelihood += 10;
    indicators.push({
      station: 'KPVU',
      signal: 'positive',
      message: `Provo light (${safeToFixed(kpvuSpeed, 0)} mph) - No strong south flow to block switch`,
    });
  } else if (kpvuSpeed >= 12) {
    northSwitchLikelihood -= 15;
    indicators.push({
      station: 'KPVU',
      signal: 'negative',
      message: `Provo strong (${safeToFixed(kpvuSpeed, 0)} mph) - May delay/prevent north switch`,
    });
  }
  
  // 6. FPS switching to north = confirmation
  const fpsIsNorth = (fpsDir >= 315 || fpsDir <= 45);
  if (fpsIsNorth && fpsSpeed >= 3) {
    northSwitchLikelihood += 20;
    indicators.push({
      station: 'FPS',
      signal: 'positive',
      message: `FPS switched north - Both sites transitioning!`,
    });
  }
  
  return {
    likelihood: Math.max(0, Math.min(100, northSwitchLikelihood)),
    estimatedSwitchTime,
    indicators,
    isConfirmed: utalpIsNorth && utalpSpeed >= 5,
  };
}

// Wind Switch Predictor Component
const WindSwitchPredictor = ({ windData }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const currentHour = new Date().getHours();
  const prediction = predictWindSwitch(windData, currentHour);
  
  const isMorning = currentHour < 12;
  
  if (isMorning) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Evening Outlook</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          North side typically activates 3-5 PM. Check back in the afternoon for early indicators from KSLC and UTALP.
        </p>
      </div>
    );
  }
  
  const cardBg = prediction.isConfirmed
    ? (isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-300')
    : prediction.likelihood >= 60
      ? (isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300')
      : prediction.likelihood >= 30
        ? (isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200')
        : (isDark ? 'bg-[var(--card-bg)] border-[var(--border-color)]' : 'bg-white border-slate-200');

  return (
    <div className={`rounded-xl p-4 border ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${prediction.isConfirmed ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-cyan-400' : 'text-cyan-600')}`} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {prediction.isConfirmed ? '✅ North Side Active' : '🔮 Wind Switch Predictor'}
          </span>
        </div>
        <div className={`text-lg font-bold ${
          prediction.likelihood >= 70 ? (isDark ? 'text-green-400' : 'text-green-600') :
          prediction.likelihood >= 40 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') :
          (isDark ? 'text-slate-400' : 'text-slate-500')
        }`}>
          {prediction.likelihood}%
        </div>
      </div>
      
      {prediction.estimatedSwitchTime && (
        <div className={`rounded px-3 py-1.5 mb-3 text-xs font-medium ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
          ⏱️ Estimated switch in: {prediction.estimatedSwitchTime}
        </div>
      )}
      
      <div className="space-y-2">
        {prediction.indicators.map((ind, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
              ind.signal === 'positive' ? 'bg-green-500' :
              ind.signal === 'developing' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <div>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{ind.station}:</span>
              <span className={`ml-1 font-medium ${
                ind.signal === 'positive' ? (isDark ? 'text-green-400' : 'text-green-700') :
                ind.signal === 'developing' ? (isDark ? 'text-yellow-400' : 'text-yellow-700') :
                (isDark ? 'text-red-400' : 'text-red-700')
              }`}>
                {ind.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Upstream Station Indicators
const UpstreamIndicators = ({ windData }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const stations = [
    { id: 'KSLC', name: 'SLC Airport', role: 'North Flow Origin', leadTime: '30-60 min', 
      getNorthSignal: (d, s) => ((d >= 280 || d <= 30) && s >= 5) },
    { id: 'UTOLY', name: 'Murray', role: 'Valley Confirmation', leadTime: '20-40 min',
      getNorthSignal: (d, s) => ((d >= 290 || d <= 40) && s >= 4) },
    { id: 'FPS', name: 'Flight Park S', role: 'S/N Boundary', leadTime: 'Real-time',
      getNorthSignal: (d, s) => ((d >= 315 || d <= 45) && s >= 3) },
    { id: 'UTALP', name: 'Point of Mtn N', role: 'Ground Truth', leadTime: 'Active',
      getNorthSignal: (d, s) => ((d >= 315 || d <= 45) && s >= 5) },
    { id: 'KPVU', name: 'Provo Airport', role: 'South Flow Blocker', leadTime: 'Opposing',
      getNorthSignal: (d, s) => s < 8 },
  ];
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Radio className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">Upstream Indicators</span>
        <span className="text-xs text-[var(--text-tertiary)] ml-auto">N → S flow path</span>
      </div>
      
      <div className="space-y-2">
        {stations.map(station => {
          const data = windData?.[station.id] || windData?.stations?.find(s => s.id === station.id);
          const speed = data?.speed || data?.windSpeed || 0;
          const dir = data?.direction || data?.windDirection || 0;
          const isNorthSignal = station.getNorthSignal(dir, speed);
          
          const cardinal = getCardinalDir(dir);
          
          return (
            <div key={station.id} className="flex items-center gap-3 text-xs">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isNorthSignal ? 'bg-green-500 animate-pulse' : (isDark ? 'bg-slate-600' : 'bg-slate-300')
              }`} />
              <span className={`w-20 truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{station.name}</span>
              <span className={`w-16 font-mono font-medium ${speed > 0 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-[var(--text-tertiary)]'}`}>
                {speed > 0 ? `${safeToFixed(speed, 0)} mph` : '--'}
              </span>
              <span className={`w-10 font-mono font-medium ${isNorthSignal ? (isDark ? 'text-green-400' : 'text-green-700') : 'text-[var(--text-tertiary)]'}`}>
                {dir > 0 ? `${cardinal}` : '--'}
              </span>
              <span className="text-[var(--text-tertiary)] hidden sm:inline">{station.leadTime}</span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${
                isNorthSignal
                  ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                  : (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')
              }`}>
                {isNorthSignal ? '✓' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-tertiary)]">
        Green = supporting north flow. KSLC leads UTALP by ~30-60 min.
      </div>
    </div>
  );
};

function getCardinalDir(deg) {
  if (!deg && deg !== 0) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Main Paragliding Dashboard
const ParaglidingMode = ({ windData, isLoading }) => {
  const [selectedSite, setSelectedSite] = useState(null);
  
  const currentHour = new Date().getHours();
  const recommendedSite = currentHour < 12 ? 'flight-park-south' : 'flight-park-north';
  
  // Get wind data for both sites
  const fpsData = windData?.FPS || windData?.stations?.find(s => s.id === 'FPS');
  const utalpData = windData?.UTALP || windData?.stations?.find(s => s.id === 'UTALP');
  
  const stationWindData = {
    FPS: {
      speed: fpsData?.speed || fpsData?.windSpeed,
      direction: fpsData?.direction || fpsData?.windDirection,
      gust: fpsData?.gust || fpsData?.windGust,
    },
    UTALP: {
      speed: utalpData?.speed || utalpData?.windSpeed,
      direction: utalpData?.direction || utalpData?.windDirection,
      gust: utalpData?.gust || utalpData?.windGust,
    },
  };
  
  const southScore = calculateParaglidingScore('flight-park-south', stationWindData.FPS?.speed, stationWindData.FPS?.direction, stationWindData.FPS?.gust);
  const northScore = calculateParaglidingScore('flight-park-north', stationWindData.UTALP?.speed, stationWindData.UTALP?.direction, stationWindData.UTALP?.gust);
  
  // Wind switch prediction for smarter recommendations
  const switchPrediction = predictWindSwitch(windData, currentHour);

  // Learned model prediction (trained on 7,624 hourly observations from 2025)
  const predictorData = useMemo(() => {
    const kslcData = windData?.KSLC || windData?.stations?.find(s => s.id === 'KSLC');
    const kpvuData = windData?.KPVU || windData?.stations?.find(s => s.id === 'KPVU');
    const utolyData = windData?.UTOLY || windData?.stations?.find(s => s.id === 'UTOLY');
    return {
      FPS: {
        windSpeed: stationWindData.FPS?.speed,
        windDirection: stationWindData.FPS?.direction,
        windGust: stationWindData.FPS?.gust,
        temperature: fpsData?.temperature || fpsData?.temp,
      },
      UTALP: {
        windSpeed: stationWindData.UTALP?.speed,
        windDirection: stationWindData.UTALP?.direction,
        windGust: stationWindData.UTALP?.gust,
      },
      KSLC: {
        windSpeed: kslcData?.speed || kslcData?.windSpeed,
        windDirection: kslcData?.direction || kslcData?.windDirection,
        pressure: kslcData?.pressure,
      },
      KPVU: {
        windSpeed: kpvuData?.speed || kpvuData?.windSpeed,
        windDirection: kpvuData?.direction || kpvuData?.windDirection,
        pressure: kpvuData?.pressure,
      },
      UTOLY: {
        windSpeed: utolyData?.speed || utolyData?.windSpeed,
        windDirection: utolyData?.direction || utolyData?.windDirection,
      },
    };
  }, [windData, stationWindData, fpsData]);

  const learnedPrediction = useMemo(() => {
    try { return predictParagliding(predictorData); }
    catch (e) { console.warn('ParaglidingPredictor error:', e); return null; }
  }, [predictorData]);
  
  // Determine best site - use learned prediction when available, fallback to rule-based
  let bestSite;
  if (learnedPrediction) {
    bestSite = learnedPrediction.bestSite === 'north' ? 'flight-park-north' : 'flight-park-south';
  } else if ((northScore?.score || 0) >= 60) {
    bestSite = 'flight-park-north';
  } else if ((southScore?.score || 0) >= 60) {
    bestSite = 'flight-park-south';
  } else if (currentHour >= 14 && switchPrediction.likelihood >= 60) {
    bestSite = 'flight-park-north';
  } else {
    bestSite = (southScore?.score || 0) > (northScore?.score || 0) ? 'flight-park-south' : 'flight-park-north';
  }
  
  const bestSiteConfig = PARAGLIDING_SITES[bestSite];
  const bestScore = bestSite === 'flight-park-south' ? southScore : northScore;

  // Determine the BEST OPPORTUNITY — current or predicted
  const opportunity = useMemo(() => {
    // Approximate sunset by month for Utah
    const month = new Date().getMonth();
    const sunsetHours = [17.5, 18, 19.3, 19.8, 20.3, 20.8, 21, 20.5, 19.5, 18.5, 17.2, 17.1];
    const isAfterDark = currentHour >= Math.ceil(sunsetHours[month]);

    if (isAfterDark) {
      return {
        mode: 'waiting', site: 'south', siteName: 'Flight Park South',
        score: 0, status: 'dark',
        headline: 'After Dark — Flying Done for Today',
        subline: 'Check back tomorrow morning for the south side forecast',
        color: 'slate', urgency: 'wait',
      };
    }

    const MIN_FLYABLE_SPEED = 6;
    const northSpeed = stationWindData.UTALP?.speed || 0;
    const southSpeed = stationWindData.FPS?.speed || 0;

    // Hard speed gate with three tiers: flyable, marginal, unflyable
    const northActuallyFlyable = northSpeed >= MIN_FLYABLE_SPEED && 
      (northScore?.status === 'excellent' || northScore?.status === 'good');
    const southActuallyFlyable = southSpeed >= MIN_FLYABLE_SPEED && 
      (southScore?.status === 'excellent' || southScore?.status === 'good');
    const northMarginal = northSpeed >= MIN_FLYABLE_SPEED && northScore?.status === 'marginal';
    const southMarginal = southSpeed >= MIN_FLYABLE_SPEED && southScore?.status === 'marginal';

    const southPred = learnedPrediction?.south;
    const northPred = learnedPrediction?.north;
    const switchLikely = switchPrediction?.likelihood >= 40 || (learnedPrediction?.windSwitch?.likelihood >= 35);

    // Currently flyable — show excitement (only if speed is actually above minimum)
    if (northActuallyFlyable && (northScore?.score || 0) >= 60) {
      return {
        mode: 'now', site: 'north', siteName: 'Flight Park North',
        score: northScore.score, status: northScore.status,
        headline: northPred?.isGlassOff ? 'Glass-Off Happening Now!' : 'North Side is ON!',
        subline: `${safeToFixed(northSpeed, 0)} mph — pilots are flying!`,
        color: 'green', urgency: 'go',
      };
    }
    if (southActuallyFlyable && (southScore?.score || 0) >= 60) {
      return {
        mode: 'now', site: 'south', siteName: 'Flight Park South',
        score: southScore.score, status: southScore.status,
        headline: 'South Side is Flying!',
        subline: `${safeToFixed(southSpeed, 0)} mph smooth thermal`,
        color: 'green', urgency: 'go',
      };
    }

    // Marginal / on the edge — yellow card
    if (northMarginal) {
      return {
        mode: 'now', site: 'north', siteName: 'Flight Park North',
        score: northScore.score, status: 'marginal',
        headline: 'North Side — On the Edge',
        subline: `${safeToFixed(northSpeed, 0)} mph — flyable but light, experienced pilots up`,
        color: 'yellow', urgency: 'watch',
      };
    }
    if (southMarginal) {
      return {
        mode: 'now', site: 'south', siteName: 'Flight Park South',
        score: southScore.score, status: 'marginal',
        headline: 'South Side — On the Edge',
        subline: `${safeToFixed(southSpeed, 0)} mph — light but flyable, watch for changes`,
        color: 'yellow', urgency: 'watch',
      };
    }

    // North predicted for evening — get people excited
    if (northPred && northPred.probability >= 30 && currentHour >= 12 && currentHour <= 20) {
      const bestHours = northPred.bestHours || [17, 18, 19];
      const arriveBy = bestHours[0] > 12 ? `${bestHours[0] - 12} PM` : `${bestHours[0]} AM`;
      const prob = Math.max(northPred.probability, switchPrediction?.likelihood || 0);
      return {
        mode: 'predicted', site: 'north', siteName: 'Flight Park North',
        score: prob, status: prob >= 55 ? 'likely' : 'possible',
        headline: prob >= 55 ? `North Side Tonight — Be There by ${arriveBy}` : `North Side Possible — Watch for ${arriveBy}`,
        subline: learnedPrediction?.recommendation || `${prob}% chance of evening glass-off`,
        color: prob >= 55 ? 'green' : prob >= 35 ? 'yellow' : 'slate',
        urgency: prob >= 55 ? 'plan' : 'watch',
        arriveBy,
      };
    }

    // South predicted for morning — thermal often starts by 7-7:30 AM
    if (southPred && southPred.probability >= 30 && currentHour <= 14) {
      const arriveBy = currentHour < 7 ? '7 AM' : 'now';
      const isNow = currentHour >= 7;
      return {
        mode: 'predicted', site: 'south', siteName: 'Flight Park South',
        score: southPred.probability, status: southPred.probability >= 55 ? 'likely' : 'possible',
        headline: isNow
          ? (southPred.probability >= 55 ? 'South Side Flying NOW — Get Airborne!' : 'South Side Possible — Check FPS Wind')
          : (southPred.probability >= 55 ? `South Side This Morning — Thermal by ${arriveBy}` : `South Side Possible — Check by ${arriveBy}`),
        subline: learnedPrediction?.recommendation || `${southPred.probability}% chance of thermal soaring`,
        color: southPred.probability >= 55 ? 'green' : southPred.probability >= 35 ? 'yellow' : 'slate',
        urgency: isNow && southPred.probability >= 55 ? 'go' : southPred.probability >= 55 ? 'plan' : 'watch',
        arriveBy,
      };
    }

    // Nothing great — show the best we have
    const bestProb = Math.max(southPred?.probability || 0, northPred?.probability || 0);
    return {
      mode: 'waiting', site: bestSite === 'flight-park-north' ? 'north' : 'south',
      siteName: bestSiteConfig.name,
      score: Math.max(bestScore?.score || 0, bestProb),
      status: 'waiting',
      headline: 'No Strong Signal Yet',
      subline: currentHour < 12 ? 'Morning thermals may develop — watching indicators' : 'Checking upstream stations for changes',
      color: 'slate', urgency: 'wait',
    };
  }, [southScore, northScore, learnedPrediction, switchPrediction, currentHour, bestSite, bestSiteConfig, bestScore, stationWindData]);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const bannerColors = {
    green: isDark ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/40' : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300',
    yellow: isDark ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/30' : 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300',
    slate: isDark ? 'bg-[var(--card-bg)] border-[var(--border-color)]' : 'bg-white border-slate-200',
  };
  const scoreColors = {
    green: isDark ? 'text-green-400' : 'text-green-600',
    yellow: isDark ? 'text-yellow-400' : 'text-yellow-600',
    slate: isDark ? 'text-slate-400' : 'text-slate-500',
  };
  
  const predStatusColor = (status) => {
    if (status === 'epic' || status === 'excellent') return isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-300';
    if (status === 'good') return isDark ? 'bg-lime-500/10 border-lime-500/30' : 'bg-lime-50 border-lime-300';
    if (status === 'marginal') return isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300';
    return isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200';
  };

  const probColor = (p) => p >= 60 ? (isDark ? 'text-green-400' : 'text-green-600') : p >= 35 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-red-400' : 'text-red-600');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-4 border ${bannerColors[opportunity.color]}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            opportunity.color === 'green' ? (isDark ? 'bg-green-500/30' : 'bg-green-200') : opportunity.color === 'yellow' ? (isDark ? 'bg-yellow-500/20' : 'bg-yellow-200') : (isDark ? 'bg-purple-500/20' : 'bg-purple-100')
          }`}>
            <span className="text-2xl">🪂</span>
          </div>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Point of the Mountain</h2>
            <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>Paragliding Forecast</p>
          </div>
          {opportunity.urgency === 'go' && (
            <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              GO FLY
            </div>
          )}
          {opportunity.urgency === 'plan' && (
            <div className={`text-xs font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-green-100 text-green-700 border-green-300'}`}>
              GET READY
            </div>
          )}
          {opportunity.urgency === 'watch' && opportunity.mode === 'now' && (
            <div className={`text-xs font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}>
              HEADS UP
            </div>
          )}
        </div>
        
        <div className={`rounded-lg p-4 border ${
          opportunity.color === 'green' ? (isDark ? 'bg-green-500/15 border-green-500/40' : 'bg-green-50 border-green-300') :
          opportunity.color === 'yellow' ? (isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300') :
          (isDark ? 'bg-slate-700/30 border-slate-600/30' : 'bg-white border-slate-200')
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${
                opportunity.mode === 'now' && opportunity.color === 'green' ? (isDark ? 'text-green-400' : 'text-green-600') :
                opportunity.mode === 'now' && opportunity.color === 'yellow' ? (isDark ? 'text-yellow-400' : 'text-yellow-600') :
                opportunity.mode === 'predicted' ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : 'text-[var(--text-tertiary)]'
              }`}>
                {opportunity.mode === 'now' && opportunity.color === 'green' ? '🟢 FLYING NOW' :
                 opportunity.mode === 'now' && opportunity.color === 'yellow' ? '🟡 BORDERLINE' :
                 opportunity.mode === 'predicted' ? '🔮 PREDICTED' : 'MONITORING'}
              </div>
              <div className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {opportunity.headline}
              </div>
              <div className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {opportunity.subline}
              </div>
              {opportunity.arriveBy && opportunity.urgency === 'plan' && (
                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  <Clock className="w-3 h-3" />
                  Arrive by {opportunity.arriveBy}
                </div>
              )}
            </div>
            <div className="text-right ml-4 flex-shrink-0">
              <div className={`text-4xl font-black ${scoreColors[opportunity.color]}`}>
                {opportunity.score}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)] capitalize">
                {opportunity.mode === 'now' ? opportunity.status : 
                 opportunity.mode === 'predicted' ? 'forecast' : 'chance'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Learned Model Prediction */}
      {learnedPrediction && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/80 border-purple-500/30' : 'bg-purple-50 border-purple-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Prediction</span>
              {learnedPrediction.south?.isUsingLearnedWeights && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  {learnedPrediction.south.weightsVersion}
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">Trained on 7,624 observations</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className={`rounded-lg p-3 border ${predStatusColor(learnedPrediction.south?.status)}`}>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>South Side</div>
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${probColor(learnedPrediction.south?.probability || 0)}`}>
                  {learnedPrediction.south?.probability || 0}%
                </div>
                <div className="text-right">
                  <div className={`text-xs capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{learnedPrediction.south?.status}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{learnedPrediction.south?.gustQuality}</div>
                </div>
              </div>
              {learnedPrediction.south?.expectedSpeed > 0 && (
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Expected: {learnedPrediction.south.expectedSpeed} mph
                </div>
              )}
              {learnedPrediction.south?.indicators?.kpvu?.signal === 'south_active' && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  <TrendingUp className="w-3 h-3" /> KPVU thermal active
                </div>
              )}
              {learnedPrediction.south?.indicators?.kslc?.signal === 'north_threat' && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  <TrendingDown className="w-3 h-3" /> KSLC north threat
                </div>
              )}
            </div>

            <div className={`rounded-lg p-3 border ${predStatusColor(learnedPrediction.north?.status)}`}>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>North Side</div>
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${probColor(learnedPrediction.north?.probability || 0)}`}>
                  {learnedPrediction.north?.probability || 0}%
                </div>
                <div className="text-right">
                  <div className={`text-xs capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{learnedPrediction.north?.status}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{learnedPrediction.north?.gustQuality}</div>
                </div>
              </div>
              {learnedPrediction.north?.isGlassOff && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                  <Zap className="w-3 h-3" /> Glass-off in progress!
                </div>
              )}
              {learnedPrediction.north?.indicators?.kslc?.signal === 'north_active' && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  <TrendingUp className="w-3 h-3" /> KSLC north active ({learnedPrediction.north.indicators.kslc.leadTimeMin} min lead)
                </div>
              )}
              {learnedPrediction.north?.indicators?.fps?.signal === 'switched_north' && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  <CheckCircle className="w-3 h-3" /> FPS confirmed north
                </div>
              )}
              {learnedPrediction.north?.indicators?.kpvu?.signal === 'thermal_blocking' && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  <TrendingDown className="w-3 h-3" /> KPVU thermal still blocking
                </div>
              )}
            </div>
          </div>

          {learnedPrediction.windSwitch?.likelihood > 0 && (
            <div className={`rounded-lg p-2 text-xs font-medium ${
              learnedPrediction.windSwitch.likelihood >= 65 ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700') :
              learnedPrediction.windSwitch.likelihood >= 35 ? (isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
              (isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')
            }`}>
              S→N Switch: {learnedPrediction.windSwitch.likelihood}% likely
              {learnedPrediction.windSwitch.timeframe && ` (${learnedPrediction.windSwitch.timeframe})`}
            </div>
          )}

          {learnedPrediction.recommendation && (
            <div className={`mt-2 text-xs italic ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
              {learnedPrediction.recommendation}
            </div>
          )}

          <div className="mt-2 text-[10px] text-[var(--text-tertiary)] flex items-center gap-2">
            <span>Seasonal adj: ×{learnedPrediction.south?.seasonalAdj}</span>
            <span>Hourly: ×{learnedPrediction.south?.hourlyMult}</span>
          </div>
        </div>
      )}

      {/* Time of Day Indicator */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Clock className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Daily Pattern</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`p-3 rounded-lg ${currentHour < 12 ? (isDark ? 'bg-yellow-500/15 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-300') : (isDark ? 'bg-slate-700/50' : 'bg-slate-50')}`}>
            <Sun className={`w-4 h-4 mx-auto mb-1 ${currentHour < 12 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : 'text-[var(--text-tertiary)]'}`} />
            <div className={`font-medium ${currentHour < 12 ? (isDark ? 'text-yellow-400' : 'text-yellow-700') : 'text-[var(--text-tertiary)]'}`}>Morning</div>
            <div className="text-[var(--text-secondary)]">South Side</div>
          </div>
          <div className={`p-3 rounded-lg ${currentHour >= 12 && currentHour < 15 ? (isDark ? 'bg-orange-500/15 border border-orange-500/30' : 'bg-orange-50 border border-orange-300') : (isDark ? 'bg-slate-700/50' : 'bg-slate-50')}`}>
            <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 12 && currentHour < 15 ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'text-[var(--text-tertiary)]'}`} />
            <div className={`font-medium ${currentHour >= 12 && currentHour < 15 ? (isDark ? 'text-orange-400' : 'text-orange-700') : 'text-[var(--text-tertiary)]'}`}>Midday</div>
            <div className="text-[var(--text-secondary)]">Caution</div>
          </div>
          <div className={`p-3 rounded-lg ${currentHour >= 15 ? (isDark ? 'bg-purple-500/15 border border-purple-500/30' : 'bg-purple-50 border border-purple-300') : (isDark ? 'bg-slate-700/50' : 'bg-slate-50')}`}>
            <Sunset className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 15 ? (isDark ? 'text-purple-400' : 'text-purple-600') : 'text-[var(--text-tertiary)]'}`} />
            <div className={`font-medium ${currentHour >= 15 ? (isDark ? 'text-purple-400' : 'text-purple-700') : 'text-[var(--text-tertiary)]'}`}>Evening</div>
            <div className="text-[var(--text-secondary)]">North Side</div>
          </div>
        </div>
      </div>
      
      <WindSwitchPredictor windData={windData} />
      <UpstreamIndicators windData={windData} />
      
      {/* Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SiteCard 
          site="flight-park-south" 
          windData={stationWindData}
          isLoading={isLoading}
        />
        <SiteCard 
          site="flight-park-north" 
          windData={stationWindData}
          isLoading={isLoading}
        />
      </div>
      
      {/* Safety Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">P2 Safety Limits</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="text-[var(--text-tertiary)]">Max Wind</div>
            <div className="text-[var(--text-primary)] font-semibold">18 mph</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="text-[var(--text-tertiary)]">Max Gust Over</div>
            <div className="text-[var(--text-primary)] font-semibold">+5 mph</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="text-[var(--text-tertiary)]">Ideal Range</div>
            <div className="text-[var(--text-primary)] font-semibold">10-16 mph</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="text-[var(--text-tertiary)]">Radio Freq</div>
            <div className="text-[var(--text-primary)] font-semibold">146.560</div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
          <p className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span><strong>15/15 Rule:</strong> Max 15 pilots in pattern. If flying 15 min with others waiting, land or leave.</span>
          </p>
        </div>
      </div>
      
      <div className="text-center text-xs text-[var(--text-tertiary)]">
        <a 
          href="https://uhgpga.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`transition-colors ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
        >
          Utah Hang Gliding & Paragliding Association (UHGPGA)
        </a>
      </div>
    </div>
  );
};

export default ParaglidingMode;
