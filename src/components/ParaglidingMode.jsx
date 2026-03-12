import React, { useState, useEffect } from 'react';
import { Wind, Mountain, Sun, Sunset, AlertTriangle, CheckCircle, XCircle, Clock, Users, Radio } from 'lucide-react';

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
      speed: { min: 0, ideal: { min: 10, max: 16 }, max: 18 },
      gustLimit: 5, // Max gust above sustained
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
      speed: { min: 5, ideal: { min: 12, max: 16 }, max: 18 },
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
  
  // Speed check
  if (windSpeed > config.wind.speed.max) {
    issues.push(`Wind ${windSpeed} mph exceeds ${config.wind.speed.max} mph limit`);
    score = Math.min(score, 20);
  } else if (windSpeed < config.wind.speed.min) {
    issues.push(`Wind ${windSpeed} mph below minimum ${config.wind.speed.min} mph`);
    score += 20;
  } else if (windSpeed >= config.wind.speed.ideal.min && windSpeed <= config.wind.speed.ideal.max) {
    score += 40;
    positives.push(`Speed ${windSpeed} mph is ideal (${config.wind.speed.ideal.min}-${config.wind.speed.ideal.max} mph)`);
  } else {
    score += 25;
    positives.push(`Speed ${windSpeed} mph is acceptable`);
  }
  
  // Gust check
  if (gustOver > config.wind.gustLimit) {
    issues.push(`Gusts ${windGust} mph (${gustOver} over sustained) exceed ${config.wind.gustLimit} mph limit`);
    score = Math.max(0, score - 30);
  } else if (gustOver > 0) {
    score += 15;
    positives.push(`Gusts manageable (${gustOver} mph over sustained)`);
  } else {
    score += 20;
    positives.push('Smooth conditions (no significant gusts)');
  }
  
  // Determine status
  if (score >= 80 && directionOk && windSpeed <= config.wind.speed.max && gustOver <= config.wind.gustLimit) {
    status = 'excellent';
  } else if (score >= 60 && directionOk && windSpeed <= config.wind.speed.max) {
    status = 'good';
  } else if (score >= 40 && directionOk) {
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
  
  // Determine best site right now
  const bestSite = (southScore?.score || 0) > (northScore?.score || 0) ? 'flight-park-south' : 'flight-park-north';
  const bestSiteConfig = PARAGLIDING_SITES[bestSite];
  const bestScore = bestSite === 'flight-park-south' ? southScore : northScore;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-2xl">🪂</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Point of the Mountain</h2>
            <p className="text-xs text-purple-300">Paragliding Forecast</p>
          </div>
        </div>
        
        {/* Best Site Recommendation */}
        <div className={`rounded-lg p-3 ${
          bestScore?.status === 'excellent' ? 'bg-green-500/20 border border-green-500/30' :
          bestScore?.status === 'good' ? 'bg-lime-500/20 border border-lime-500/30' :
          bestScore?.status === 'marginal' ? 'bg-yellow-500/20 border border-yellow-500/30' :
          'bg-red-500/20 border border-red-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Best Site Right Now</div>
              <div className="text-lg font-bold text-white">{bestSiteConfig.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                bestScore?.status === 'excellent' ? 'text-green-400' :
                bestScore?.status === 'good' ? 'text-lime-400' :
                bestScore?.status === 'marginal' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {bestScore?.score || 0}%
              </div>
              <div className="text-xs text-slate-400 capitalize">{bestScore?.status || 'Unknown'}</div>
            </div>
          </div>
        </div>
      </div>
      
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
