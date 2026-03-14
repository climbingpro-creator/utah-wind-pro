import React, { useState, useEffect, useMemo } from 'react';
import { Wind, Mountain, Sun, Sunset, AlertTriangle, CheckCircle, XCircle, Clock, Users, Radio, Brain, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { predictParagliding } from '../services/ParaglidingPredictor';

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
      direction: { min: 160, max: 200, ideal: 180, label: 'SSE to SSW' },
      speed: { min: 6, ideal: { min: 10, max: 16 }, max: 18 },
      gustLimit: 5,
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
    issues.push(`Wind ${windSpeed?.toFixed(0)} mph exceeds ${config.wind.speed.max} mph limit`);
    score = Math.min(score, 20);
  } else if (windSpeed < config.wind.speed.min) {
    issues.push(`Wind ${windSpeed?.toFixed(0)} mph below minimum ${config.wind.speed.min} mph`);
    score = Math.min(score, 30);
  } else if (windSpeed >= config.wind.speed.ideal.min && windSpeed <= config.wind.speed.ideal.max) {
    score += 40;
    positives.push(`Speed ${windSpeed?.toFixed(0)} mph is ideal (${config.wind.speed.ideal.min}-${config.wind.speed.ideal.max} mph)`);
  } else {
    score += 25;
    positives.push(`Speed ${windSpeed?.toFixed(0)} mph is acceptable`);
  }
  
  // Gust check
  if (gustOver > config.wind.gustLimit) {
    issues.push(`Gusts ${windGust?.toFixed(0)} mph (${gustOver.toFixed(0)} over sustained) exceed ${config.wind.gustLimit} mph limit`);
    score = Math.max(0, score - 30);
  } else if (gustOver > 0) {
    score += 15;
    positives.push(`Gusts manageable (${gustOver.toFixed(0)} mph over sustained)`);
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
  const config = PARAGLIDING_SITES[site];
  const stationData = windData?.[config.stationId];
  
  const windSpeed = stationData?.speed;
  const windDirection = stationData?.direction;
  const windGust = stationData?.gust;
  
  const assessment = calculateParaglidingScore(site, windSpeed, windDirection, windGust);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'good': return 'bg-lime-500/20 border-lime-500/50 text-lime-400';
      case 'marginal': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      default: return 'bg-red-500/20 border-red-500/50 text-red-400';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-lime-400" />;
      case 'marginal': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };
  
  const currentHour = new Date().getHours();
  const isBestTime = config.bestTime === 'morning' ? currentHour < 12 : currentHour >= 15;
  
  return (
    <div className={`rounded-xl border p-4 ${getStatusColor(assessment?.status || 'unflyable')}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-lg">{config.name}</h3>
          <p className="text-xs text-slate-400">{config.location}</p>
        </div>
        <div className="flex items-center gap-2">
          {isBestTime && (
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
              {config.bestTime === 'morning' ? '☀️ Best AM' : '🌅 Best PM'}
            </span>
          )}
          {getStatusIcon(assessment?.status)}
        </div>
      </div>
      
      {/* Current Conditions */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs text-slate-500">Wind</div>
          <div className={`text-xl font-bold ${assessment?.speedOk ? 'text-white' : 'text-red-400'}`}>
            {windSpeed?.toFixed(0) || '--'}
            <span className="text-xs text-slate-400"> mph</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Direction</div>
          <div className={`text-xl font-bold ${assessment?.directionOk ? 'text-white' : 'text-red-400'}`}>
            {windDirection?.toFixed(0) || '--'}°
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">Gusts</div>
          <div className={`text-xl font-bold ${assessment?.gustOk ? 'text-white' : 'text-red-400'}`}>
            {windGust?.toFixed(0) || '--'}
            <span className="text-xs text-slate-400"> mph</span>
          </div>
        </div>
      </div>
      
      {/* Requirements */}
      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <div className="text-xs text-slate-500 mb-2">P2 Requirements</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Direction:</span>
            <span className={`ml-1 ${assessment?.directionOk ? 'text-green-400' : 'text-red-400'}`}>
              {config.wind.direction.label}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Speed:</span>
            <span className={`ml-1 ${assessment?.speedOk ? 'text-green-400' : 'text-red-400'}`}>
              {config.wind.speed.min}-{config.wind.speed.max} mph
            </span>
          </div>
          <div>
            <span className="text-slate-400">Ideal:</span>
            <span className="ml-1 text-cyan-400">
              {config.wind.speed.ideal.min}-{config.wind.speed.ideal.max} mph
            </span>
          </div>
          <div>
            <span className="text-slate-400">Max Gust:</span>
            <span className={`ml-1 ${assessment?.gustOk ? 'text-green-400' : 'text-red-400'}`}>
              +{config.wind.gustLimit} mph
            </span>
          </div>
        </div>
      </div>
      
      {/* Status Messages */}
      {assessment && (
        <div className="space-y-1">
          {assessment.positives.slice(0, 2).map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
          {assessment.issues.slice(0, 2).map((msg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Flyability Score */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Flyability Score</span>
          <span className={`text-lg font-bold ${
            assessment?.score >= 80 ? 'text-green-400' :
            assessment?.score >= 60 ? 'text-lime-400' :
            assessment?.score >= 40 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {assessment?.score || 0}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
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
      message: `SLC Airport: ${kslcSpeed.toFixed(0)} mph from ${kslcDir.toFixed(0)}° - North flow active upstream`,
    });
  } else if (kslcIsNorth && kslcSpeed >= 3) {
    northSwitchLikelihood += 15;
    indicators.push({
      station: 'KSLC',
      signal: 'developing',
      message: `SLC Airport: Light NW ${kslcSpeed.toFixed(0)} mph - North flow developing`,
    });
  }
  
  // 2. UTALP south wind dying = switch imminent
  const utalpIsSouth = utalpDir >= 140 && utalpDir <= 220;
  if (utalpIsSouth && utalpSpeed < 5 && currentHour >= 14) {
    northSwitchLikelihood += 25;
    indicators.push({
      station: 'UTALP',
      signal: 'developing',
      message: `UTALP: South dying (${utalpSpeed.toFixed(0)} mph) - Switch to north imminent!`,
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
      message: `UTALP: North side ACTIVE - ${utalpSpeed.toFixed(0)} mph from ${utalpDir.toFixed(0)}°`,
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
      message: `Provo light (${kpvuSpeed.toFixed(0)} mph) - No strong south flow to block switch`,
    });
  } else if (kpvuSpeed >= 12) {
    northSwitchLikelihood -= 15;
    indicators.push({
      station: 'KPVU',
      signal: 'negative',
      message: `Provo strong (${kpvuSpeed.toFixed(0)} mph) - May delay/prevent north switch`,
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
  const currentHour = new Date().getHours();
  const prediction = predictWindSwitch(windData, currentHour);
  
  const isMorning = currentHour < 12;
  
  if (isMorning) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Evening Outlook</span>
        </div>
        <p className="text-xs text-slate-400">
          North side typically activates 3-5 PM. Check back in the afternoon for early indicators from KSLC and UTALP.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`rounded-xl p-4 border ${
      prediction.isConfirmed ? 'bg-green-500/10 border-green-500/30' :
      prediction.likelihood >= 60 ? 'bg-yellow-500/10 border-yellow-500/30' :
      prediction.likelihood >= 30 ? 'bg-blue-500/10 border-blue-500/30' :
      'bg-slate-800/50 border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${prediction.isConfirmed ? 'text-green-400' : 'text-cyan-400'}`} />
          <span className="text-sm font-medium text-white">
            {prediction.isConfirmed ? '✅ North Side Active' : '🔮 Wind Switch Predictor'}
          </span>
        </div>
        <div className={`text-lg font-bold ${
          prediction.likelihood >= 70 ? 'text-green-400' :
          prediction.likelihood >= 40 ? 'text-yellow-400' : 'text-slate-400'
        }`}>
          {prediction.likelihood}%
        </div>
      </div>
      
      {prediction.estimatedSwitchTime && (
        <div className="bg-yellow-500/20 rounded px-3 py-1.5 mb-3 text-xs text-yellow-400">
          ⏱️ Estimated switch in: {prediction.estimatedSwitchTime}
        </div>
      )}
      
      <div className="space-y-2">
        {prediction.indicators.map((ind, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
              ind.signal === 'positive' ? 'bg-green-400' :
              ind.signal === 'developing' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <div>
              <span className="text-slate-500">{ind.station}:</span>
              <span className={`ml-1 ${
                ind.signal === 'positive' ? 'text-green-400' :
                ind.signal === 'developing' ? 'text-yellow-400' : 'text-red-400'
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
      getNorthSignal: (d, s) => s < 8 }, // Light provo = good for north switch
  ];
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-white">Upstream Indicators</span>
        <span className="text-xs text-slate-500 ml-auto">N → S flow path</span>
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
                isNorthSignal ? 'bg-green-400 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="text-slate-400 w-20 truncate">{station.name}</span>
              <span className={`w-16 font-mono ${speed > 0 ? 'text-white' : 'text-slate-600'}`}>
                {speed > 0 ? `${speed.toFixed(0)} mph` : '--'}
              </span>
              <span className={`w-10 font-mono ${isNorthSignal ? 'text-green-400' : 'text-slate-500'}`}>
                {dir > 0 ? `${cardinal}` : '--'}
              </span>
              <span className="text-slate-600 hidden sm:inline">{station.leadTime}</span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                isNorthSignal ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
              }`}>
                {isNorthSignal ? '✓' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-2 border-t border-slate-700/50 text-xs text-slate-500">
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

    // Hard speed gate: status doesn't matter if wind is below minimum
    const northActuallyFlyable = northSpeed >= MIN_FLYABLE_SPEED && 
      (northScore?.status === 'excellent' || northScore?.status === 'good');
    const southActuallyFlyable = southSpeed >= MIN_FLYABLE_SPEED && 
      (southScore?.status === 'excellent' || southScore?.status === 'good');

    const southPred = learnedPrediction?.south;
    const northPred = learnedPrediction?.north;
    const switchLikely = switchPrediction?.likelihood >= 40 || (learnedPrediction?.windSwitch?.likelihood >= 35);

    // Currently flyable — show excitement (only if speed is actually above minimum)
    if (northActuallyFlyable && (northScore?.score || 0) >= 60) {
      return {
        mode: 'now', site: 'north', siteName: 'Flight Park North',
        score: northScore.score, status: northScore.status,
        headline: northPred?.isGlassOff ? 'Glass-Off Happening Now!' : 'North Side is ON!',
        subline: `${northSpeed.toFixed(0)} mph — pilots are flying!`,
        color: 'green', urgency: 'go',
      };
    }
    if (southActuallyFlyable && (southScore?.score || 0) >= 60) {
      return {
        mode: 'now', site: 'south', siteName: 'Flight Park South',
        score: southScore.score, status: southScore.status,
        headline: 'South Side is Flying!',
        subline: `${southSpeed.toFixed(0)} mph smooth thermal`,
        color: 'green', urgency: 'go',
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

    // South predicted for morning
    if (southPred && southPred.probability >= 30 && currentHour <= 12) {
      const bestHours = southPred.bestHours || [8, 9, 10];
      const arriveBy = bestHours[0] > 12 ? `${bestHours[0] - 12} PM` : `${bestHours[0]} AM`;
      return {
        mode: 'predicted', site: 'south', siteName: 'Flight Park South',
        score: southPred.probability, status: southPred.probability >= 55 ? 'likely' : 'possible',
        headline: southPred.probability >= 55 ? `South Side This Morning — Be There by ${arriveBy}` : `South Side Possible — Check by ${arriveBy}`,
        subline: learnedPrediction?.recommendation || `${southPred.probability}% chance of thermal soaring`,
        color: southPred.probability >= 55 ? 'green' : southPred.probability >= 35 ? 'yellow' : 'slate',
        urgency: southPred.probability >= 55 ? 'plan' : 'watch',
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

  const bannerColors = {
    green: 'bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-green-500/50',
    yellow: 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-500/40',
    slate: 'bg-gradient-to-r from-slate-800/60 to-slate-700/60 border-slate-600/40',
  };
  const scoreColors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    slate: 'text-slate-400',
  };
  
  return (
    <div className="space-y-6">
      {/* Header — Forecast-driven, not just current conditions */}
      <div className={`rounded-xl p-4 border ${bannerColors[opportunity.color]}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            opportunity.color === 'green' ? 'bg-green-500/30' : opportunity.color === 'yellow' ? 'bg-yellow-500/20' : 'bg-purple-500/20'
          }`}>
            <span className="text-2xl">🪂</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Point of the Mountain</h2>
            <p className="text-xs text-purple-300">Paragliding Forecast</p>
          </div>
          {opportunity.urgency === 'go' && (
            <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              GO FLY
            </div>
          )}
          {opportunity.urgency === 'plan' && (
            <div className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/50">
              GET READY
            </div>
          )}
        </div>
        
        {/* The Big Opportunity Card */}
        <div className={`rounded-lg p-4 ${
          opportunity.color === 'green' ? 'bg-green-500/15 border border-green-500/40' :
          opportunity.color === 'yellow' ? 'bg-yellow-500/10 border border-yellow-500/30' :
          'bg-slate-700/30 border border-slate-600/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`text-xs font-medium ${
                opportunity.mode === 'now' ? 'text-green-400' :
                opportunity.mode === 'predicted' ? 'text-cyan-400' : 'text-slate-500'
              }`}>
                {opportunity.mode === 'now' ? '🟢 FLYING NOW' :
                 opportunity.mode === 'predicted' ? '🔮 PREDICTED' : 'MONITORING'}
              </div>
              <div className={`text-xl font-bold mt-1 ${opportunity.color === 'green' ? 'text-white' : 'text-slate-200'}`}>
                {opportunity.headline}
              </div>
              <div className="text-sm text-slate-300 mt-1">
                {opportunity.subline}
              </div>
              {opportunity.arriveBy && opportunity.urgency === 'plan' && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  Arrive by {opportunity.arriveBy}
                </div>
              )}
            </div>
            <div className="text-right ml-4">
              <div className={`text-4xl font-black ${scoreColors[opportunity.color]}`}>
                {opportunity.score}%
              </div>
              <div className="text-xs text-slate-400 capitalize">
                {opportunity.mode === 'now' ? opportunity.status : 
                 opportunity.mode === 'predicted' ? 'forecast' : 'chance'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Learned Model Prediction */}
      {learnedPrediction && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">AI Prediction</span>
              {learnedPrediction.south?.isUsingLearnedWeights && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                  {learnedPrediction.south.weightsVersion}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">Trained on 7,624 observations</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* South prediction */}
            <div className={`rounded-lg p-3 border ${
              learnedPrediction.south?.status === 'epic' || learnedPrediction.south?.status === 'excellent' ? 'bg-green-500/10 border-green-500/30' :
              learnedPrediction.south?.status === 'good' ? 'bg-lime-500/10 border-lime-500/30' :
              learnedPrediction.south?.status === 'marginal' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-slate-700/50 border-slate-600'
            }`}>
              <div className="text-xs text-slate-400 mb-1">South Side</div>
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${
                  learnedPrediction.south?.probability >= 60 ? 'text-green-400' :
                  learnedPrediction.south?.probability >= 35 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {learnedPrediction.south?.probability || 0}%
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 capitalize">{learnedPrediction.south?.status}</div>
                  <div className="text-xs text-slate-500">{learnedPrediction.south?.gustQuality}</div>
                </div>
              </div>
              {learnedPrediction.south?.expectedSpeed > 0 && (
                <div className="text-xs text-slate-400 mt-1">
                  Expected: {learnedPrediction.south.expectedSpeed} mph
                </div>
              )}
              {learnedPrediction.south?.indicators?.kpvu?.signal === 'south_active' && (
                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> KPVU thermal active
                </div>
              )}
              {learnedPrediction.south?.indicators?.kslc?.signal === 'north_threat' && (
                <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> KSLC north threat
                </div>
              )}
            </div>

            {/* North prediction */}
            <div className={`rounded-lg p-3 border ${
              learnedPrediction.north?.status === 'epic' || learnedPrediction.north?.status === 'excellent' ? 'bg-green-500/10 border-green-500/30' :
              learnedPrediction.north?.status === 'good' ? 'bg-lime-500/10 border-lime-500/30' :
              learnedPrediction.north?.status === 'marginal' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-slate-700/50 border-slate-600'
            }`}>
              <div className="text-xs text-slate-400 mb-1">North Side</div>
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${
                  learnedPrediction.north?.probability >= 60 ? 'text-green-400' :
                  learnedPrediction.north?.probability >= 35 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {learnedPrediction.north?.probability || 0}%
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 capitalize">{learnedPrediction.north?.status}</div>
                  <div className="text-xs text-slate-500">{learnedPrediction.north?.gustQuality}</div>
                </div>
              </div>
              {learnedPrediction.north?.isGlassOff && (
                <div className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Glass-off in progress!
                </div>
              )}
              {learnedPrediction.north?.indicators?.kslc?.signal === 'north_active' && (
                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> KSLC north active ({learnedPrediction.north.indicators.kslc.leadTimeMin} min lead)
                </div>
              )}
              {learnedPrediction.north?.indicators?.fps?.signal === 'switched_north' && (
                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> FPS confirmed north
                </div>
              )}
              {learnedPrediction.north?.indicators?.kpvu?.signal === 'thermal_blocking' && (
                <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> KPVU thermal still blocking
                </div>
              )}
            </div>
          </div>

          {/* Wind switch prediction from learned model */}
          {learnedPrediction.windSwitch?.likelihood > 0 && (
            <div className={`rounded-lg p-2 text-xs ${
              learnedPrediction.windSwitch.likelihood >= 65 ? 'bg-green-500/10 text-green-400' :
              learnedPrediction.windSwitch.likelihood >= 35 ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-slate-700/50 text-slate-400'
            }`}>
              S→N Switch: {learnedPrediction.windSwitch.likelihood}% likely
              {learnedPrediction.windSwitch.timeframe && ` (${learnedPrediction.windSwitch.timeframe})`}
            </div>
          )}

          {/* Recommendation */}
          {learnedPrediction.recommendation && (
            <div className="mt-2 text-xs text-purple-300 italic">
              {learnedPrediction.recommendation}
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-2">
            <span>Seasonal adj: ×{learnedPrediction.south?.seasonalAdj}</span>
            <span>Hourly: ×{learnedPrediction.south?.hourlyMult}</span>
          </div>
        </div>
      )}

      {/* Time of Day Indicator */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Daily Pattern</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`p-2 rounded ${currentHour < 12 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-slate-700/50'}`}>
            <Sun className={`w-4 h-4 mx-auto mb-1 ${currentHour < 12 ? 'text-yellow-400' : 'text-slate-500'}`} />
            <div className={currentHour < 12 ? 'text-yellow-400 font-medium' : 'text-slate-500'}>Morning</div>
            <div className="text-slate-400">South Side</div>
          </div>
          <div className={`p-2 rounded ${currentHour >= 12 && currentHour < 15 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-slate-700/50'}`}>
            <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 12 && currentHour < 15 ? 'text-orange-400' : 'text-slate-500'}`} />
            <div className={currentHour >= 12 && currentHour < 15 ? 'text-orange-400 font-medium' : 'text-slate-500'}>Midday</div>
            <div className="text-slate-400">Caution</div>
          </div>
          <div className={`p-2 rounded ${currentHour >= 15 ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-700/50'}`}>
            <Sunset className={`w-4 h-4 mx-auto mb-1 ${currentHour >= 15 ? 'text-purple-400' : 'text-slate-500'}`} />
            <div className={currentHour >= 15 ? 'text-purple-400 font-medium' : 'text-slate-500'}>Evening</div>
            <div className="text-slate-400">North Side</div>
          </div>
        </div>
      </div>
      
      {/* Wind Switch Predictor - Key new feature */}
      <WindSwitchPredictor windData={windData} />
      
      {/* Upstream Indicators Panel */}
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
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">P2 Safety Limits</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Max Wind</div>
            <div className="text-white font-medium">18 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Max Gust Over</div>
            <div className="text-white font-medium">+5 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Ideal Range</div>
            <div className="text-white font-medium">10-16 mph</div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">Radio Freq</div>
            <div className="text-white font-medium">146.560</div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
          <p className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span><strong>15/15 Rule:</strong> Max 15 pilots in pattern. If flying 15 min with others waiting, land or leave.</span>
          </p>
        </div>
      </div>
      
      {/* UHGPGA Link */}
      <div className="text-center text-xs text-slate-500">
        <a 
          href="https://uhgpga.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-cyan-400 transition-colors"
        >
          Utah Hang Gliding & Paragliding Association (UHGPGA)
        </a>
      </div>
    </div>
  );
};

export default ParaglidingMode;
