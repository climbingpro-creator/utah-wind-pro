import React, { useMemo } from 'react';
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
const SiteCard = ({ site, windData, isLoading: _isLoading }) => {
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
        <div className={`text-xs mb-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Site Limits</div>
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

      {config.hazards?.length > 0 && (
        <details className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <summary className={`cursor-pointer font-medium ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
            <AlertTriangle className="w-3 h-3 inline mr-1" />Site Hazards ({config.hazards.length})
          </summary>
          <ul className="mt-1.5 space-y-1 pl-4 list-disc">
            {config.hazards.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </details>
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

// Twin Peaks site card — extracted outside render to satisfy react-hooks/static-components
const TwinPeakCard = ({ siteId, isFirst, sensorData, isInterpolated, assessment, aiPred, isDark }) => {
  const config = PARAGLIDING_SITES[siteId];
  const isNorth = siteId === 'flight-park-north';
  const aiProb = aiPred?.probability || 0;
  const windSpd = sensorData?.speed || 0;
  const windDir = sensorData?.direction;
  const windGst = sensorData?.gust || 0;
  const errColor = isDark ? 'text-red-400' : 'text-red-600';
  const okColor = isDark ? 'text-green-400' : 'text-green-600';
  const probColor = (p) => p >= 60 ? (isDark ? 'text-green-400' : 'text-green-600') : p >= 35 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-red-400' : 'text-red-600');

  const statusBg = assessment?.status === 'excellent' ? (isDark ? 'bg-green-500/15 border-green-500/40' : 'bg-green-50 border-green-300')
    : assessment?.status === 'good' ? (isDark ? 'bg-lime-500/15 border-lime-500/40' : 'bg-lime-50 border-lime-300')
    : assessment?.status === 'marginal' ? (isDark ? 'bg-yellow-500/15 border-yellow-500/40' : 'bg-yellow-50 border-yellow-300')
    : (isDark ? 'bg-red-500/15 border-red-500/40' : 'bg-red-50 border-red-300');

  let grounded = null;
  if (aiProb < 20) {
    if (windSpd > 18) grounded = `Grounded: Base wind ${safeToFixed(windSpd, 0)} mph > 18 mph`;
    else if (windGst - windSpd > 12) grounded = `Grounded: Gust spread ${safeToFixed(windGst - windSpd, 0)} mph > 12 mph`;
    else if (windGst > 25) grounded = `Grounded: Gusts ${safeToFixed(windGst, 0)} mph — unsafe`;
    else grounded = 'Grounded: Conditions outside flyable envelope';
  }

  return (
    <div className={`rounded-xl border p-4 ${statusBg} ${isFirst ? 'ring-2 ring-sky-500/40' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{config.shortName}</h3>
          {isInterpolated && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              Data interpolated from {isNorth ? 'South' : 'North'} sensor
            </span>
          )}
        </div>
        {isFirst && <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700'}`}>#1 PICK</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Wind</div>
          <div className={`text-2xl font-black ${assessment?.speedOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {safeToFixed(windSpd, 0)}<span className="text-xs font-normal ml-0.5">mph</span>
          </div>
        </div>
        <div>
          <div className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Dir</div>
          <div className={`text-2xl font-black ${assessment?.directionOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {windDir != null ? `${getCardinalDir(windDir)}` : '--'}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{windDir != null ? `${safeToFixed(windDir, 0)}°` : ''}</div>
        </div>
        <div>
          <div className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Gust</div>
          <div className={`text-2xl font-black ${assessment?.gustOk ? (isDark ? 'text-white' : 'text-slate-900') : errColor}`}>
            {safeToFixed(windGst, 0)}<span className="text-xs font-normal ml-0.5">mph</span>
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-2.5 mb-2 border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>AI Prediction</span>
          </div>
          <span className={`text-lg font-black ${probColor(aiProb)}`}>{aiProb}%</span>
        </div>
        {grounded && (
          <div className={`mt-1 text-[11px] font-medium ${errColor}`}>
            <XCircle className="w-3 h-3 inline mr-1" />{grounded}
          </div>
        )}
        {!grounded && aiPred?.gustQuality && (
          <div className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{aiPred.gustQuality}</div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs mb-1">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Flyability</span>
        <span className={`font-bold ${
          assessment?.score >= 60 ? okColor : assessment?.score >= 40 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : errColor
        }`}>{assessment?.score || 0}%</span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${
          assessment?.score >= 80 ? 'bg-green-500' : assessment?.score >= 60 ? 'bg-lime-500' : assessment?.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
        }`} style={{ width: `${assessment?.score || 0}%` }} />
      </div>

      {assessment && (
        <div className="mt-2 space-y-0.5">
          {assessment.positives.slice(0, 1).map((msg, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-[11px] ${okColor}`}><CheckCircle className="w-3 h-3" />{msg}</div>
          ))}
          {assessment.issues.slice(0, 2).map((msg, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-[11px] ${errColor}`}><XCircle className="w-3 h-3" />{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Paragliding Dashboard
const ParaglidingMode = ({ windData, isLoading: _isLoading }) => {
  const currentHour = new Date().getHours();

  const fpsData = windData?.FPS || windData?.stations?.find(s => s.id === 'FPS');
  const utalpData = windData?.UTALP || windData?.stations?.find(s => s.id === 'UTALP');
  
  const fpsSpeed = fpsData?.speed || fpsData?.windSpeed;
  const fpsDir = fpsData?.direction || fpsData?.windDirection;
  const fpsGust = fpsData?.gust || fpsData?.windGust;
  const utalpSpeed = utalpData?.speed || utalpData?.windSpeed;
  const utalpDir = utalpData?.direction || utalpData?.windDirection;
  const utalpGust = utalpData?.gust || utalpData?.windGust;

  const stationWindData = useMemo(() => ({
    FPS: { speed: fpsSpeed, direction: fpsDir, gust: fpsGust },
    UTALP: { speed: utalpSpeed, direction: utalpDir, gust: utalpGust },
  }), [fpsSpeed, fpsDir, fpsGust, utalpSpeed, utalpDir, utalpGust]);

  // Offline sensor interpolation: if one sensor is down, pull from the other
  const southOnline = stationWindData.FPS?.speed != null;
  const northOnline = stationWindData.UTALP?.speed != null;
  const effectiveSouth = southOnline ? stationWindData.FPS : (northOnline ? stationWindData.UTALP : stationWindData.FPS);
  const effectiveNorth = northOnline ? stationWindData.UTALP : (southOnline ? stationWindData.FPS : stationWindData.UTALP);

  const southScore = calculateParaglidingScore('flight-park-south', effectiveSouth?.speed, effectiveSouth?.direction, effectiveSouth?.gust);
  const northScore = calculateParaglidingScore('flight-park-north', effectiveNorth?.speed, effectiveNorth?.direction, effectiveNorth?.gust);
  
  const fpsTemp = fpsData?.temperature || fpsData?.temp;
  const predictorData = useMemo(() => {
    const kslcData = windData?.KSLC || windData?.stations?.find(s => s.id === 'KSLC');
    const kpvuData = windData?.KPVU || windData?.stations?.find(s => s.id === 'KPVU');
    const utolyData = windData?.UTOLY || windData?.stations?.find(s => s.id === 'UTOLY');
    return {
      FPS: { windSpeed: fpsSpeed, windDirection: fpsDir, windGust: fpsGust, temperature: fpsTemp },
      UTALP: { windSpeed: utalpSpeed, windDirection: utalpDir, windGust: utalpGust },
      KSLC: { windSpeed: kslcData?.speed || kslcData?.windSpeed, windDirection: kslcData?.direction || kslcData?.windDirection, pressure: kslcData?.pressure },
      KPVU: { windSpeed: kpvuData?.speed || kpvuData?.windSpeed, windDirection: kpvuData?.direction || kpvuData?.windDirection, pressure: kpvuData?.pressure },
      UTOLY: { windSpeed: utolyData?.speed || utolyData?.windSpeed, windDirection: utolyData?.direction || utolyData?.windDirection },
    };
  }, [windData, fpsSpeed, fpsDir, fpsGust, fpsTemp, utalpSpeed, utalpDir, utalpGust]);

  const learnedPrediction = useMemo(() => {
    try { return predictParagliding(predictorData); }
    catch (e) { console.warn('ParaglidingPredictor error:', e); return null; }
  }, [predictorData]);

  // Synoptic override: detect mechanical wind overpowering thermals
  const maxSensorSpeed = Math.max(effectiveSouth?.speed || 0, effectiveNorth?.speed || 0);
  const maxGust = Math.max(effectiveSouth?.gust || 0, effectiveNorth?.gust || 0);
  const isSynopticOverride = maxSensorSpeed > 15;
  const gustSpread = maxGust - maxSensorSpeed;

  // Direction-based card sorting (NOT time of day)
  const dominantDir = effectiveNorth?.direction ?? effectiveSouth?.direction ?? 0;
  const isNorthFlow = (dominantDir >= 315 || dominantDir <= 45);
  const isSouthFlow = (dominantDir >= 135 && dominantDir <= 225);
  const northFirst = isNorthFlow || (!isSouthFlow && currentHour >= 14);
  const firstSite = northFirst ? 'flight-park-north' : 'flight-park-south';
  const secondSite = northFirst ? 'flight-park-south' : 'flight-park-north';

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getSiteProps = (siteId) => {
    const isNorth = siteId === 'flight-park-north';
    return {
      sensorData: isNorth ? effectiveNorth : effectiveSouth,
      isInterpolated: isNorth ? !northOnline : !southOnline,
      assessment: isNorth ? northScore : southScore,
      aiPred: isNorth ? learnedPrediction?.north : learnedPrediction?.south,
      isDark,
    };
  };

  return (
    <div className="space-y-4">
      {/* Synoptic Override Banner */}
      {isSynopticOverride && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-red-900/30 border-red-500/50' : 'bg-red-50 border-red-400'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <div className={`text-sm font-extrabold uppercase tracking-wide ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                Synoptic Override: {maxSensorSpeed >= 20 ? 'BLOWN OUT' : `Strong ${getCardinalDir(dominantDir)} Flow`}
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-red-300/80' : 'text-red-600/80'}`}>
                Mechanical wind ({safeToFixed(maxSensorSpeed, 0)} mph{gustSpread > 5 ? ` G${safeToFixed(maxGust, 0)}` : ''}) is overpowering thermal development. DO NOT FLY.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header — adapts to synoptic state */}
      <div className={`rounded-xl p-4 border ${
        isSynopticOverride ? (isDark ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50/50 border-red-300')
        : (isDark ? 'bg-[var(--card-bg)] border-[var(--border-color)]' : 'bg-white border-slate-200')
      }`}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🪂</span>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Point of the Mountain</h2>
            <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
              {isSynopticOverride ? 'All sites grounded — mechanical wind' : 'Paragliding Forecast'}
            </p>
          </div>
          {isSynopticOverride && (
            <div className="bg-red-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">Grounded</div>
          )}
        </div>
      </div>

      {/* Twin Peaks: North/South cards sorted by wind direction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TwinPeakCard siteId={firstSite} isFirst {...getSiteProps(firstSite)} />
        <TwinPeakCard siteId={secondSite} isFirst={false} {...getSiteProps(secondSite)} />
      </div>

      {/* Wind Switch + Upstream (only when not blown out) */}
      {!isSynopticOverride && (
        <>
          <WindSwitchPredictor windData={windData} />
          <UpstreamIndicators windData={windData} />
        </>
      )}
      
      {/* Safety Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Pilot Safety Limits</span>
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
