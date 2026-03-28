import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Wind, ChevronDown, ChevronUp, ExternalLink, Clock, MapPin } from 'lucide-react';
import { getActiveAlerts } from '@utahwind/weather';

const SEVERITY_CONFIG = {
  Extreme: {
    bg: 'bg-red-900/40',
    border: 'border-red-500',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    badge: 'bg-red-500 text-white',
    pulse: true,
  },
  Severe: {
    bg: 'bg-orange-900/40',
    border: 'border-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500 text-white',
    pulse: true,
  },
  Moderate: {
    bg: 'bg-yellow-900/40',
    border: 'border-yellow-500',
    icon: AlertCircle,
    iconColor: 'text-yellow-400',
    badge: 'bg-yellow-500 text-black',
    pulse: false,
  },
  Minor: {
    bg: 'bg-blue-900/40',
    border: 'border-blue-500',
    icon: Info,
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500 text-white',
    pulse: false,
  },
  Unknown: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-600',
    icon: Info,
    iconColor: 'text-slate-400',
    badge: 'bg-slate-500 text-white',
    pulse: false,
  },
};

const AlertCard = ({ alert, isExpanded, onToggle }) => {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Unknown;
  const IconComponent = config.icon;
  
  const formatTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  const getTimeRemaining = (endStr) => {
    if (!endStr) return null;
    const end = new Date(endStr);
    const now = new Date();
    const diff = end - now;
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };
  
  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className={`mt-0.5 ${config.pulse ? 'animate-pulse' : ''}`}>
          <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.badge}`}>
              {alert.severity}
            </span>
            <span className="text-sm font-medium text-white truncate">
              {alert.event}
            </span>
          </div>
          
          <p className="text-xs text-slate-300 mt-1 line-clamp-2">
            {alert.headline}
          </p>
          
          {/* Wind info preview */}
          {alert.windInfo?.speed && (
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <Wind className="w-3 h-3" />
              <span>
                {alert.windInfo.direction && `${alert.windInfo.direction} `}
                {alert.windInfo.speed} mph
                {alert.windInfo.gust && ` (gusts ${alert.windInfo.gust} mph)`}
              </span>
            </div>
          )}
          
          {/* Time remaining */}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{getTimeRemaining(alert.ends)}</span>
          </div>
        </div>
        
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 space-y-3">
          {/* Timing */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Starts:</span>
              <span className="text-slate-300 ml-1">{formatTime(alert.onset)}</span>
            </div>
            <div>
              <span className="text-slate-500">Ends:</span>
              <span className="text-slate-300 ml-1">{formatTime(alert.ends)}</span>
            </div>
          </div>
          
          {/* Affected areas */}
          {alert.areas && (
            <div className="text-xs">
              <div className="flex items-center gap-1 text-slate-500 mb-1">
                <MapPin className="w-3 h-3" />
                <span>Affected Areas:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {alert.areas}
              </p>
            </div>
          )}
          
          {/* Full description */}
          {alert.description && (
            <div className="text-xs">
              <span className="text-slate-500">Details:</span>
              <p className="text-slate-400 mt-1 text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {alert.description.slice(0, 500)}
                {alert.description.length > 500 && '...'}
              </p>
            </div>
          )}
          
          {/* Instructions */}
          {alert.instruction && (
            <div className="bg-slate-800/50 rounded p-2 text-xs">
              <span className="text-yellow-400 font-medium">⚠️ Instructions:</span>
              <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                {alert.instruction.slice(0, 300)}
                {alert.instruction.length > 300 && '...'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SevereWeatherAlerts = ({ className = '' }) => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveAlerts();
      
      // Sort by severity (Extreme first, then Severe, etc.)
      const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
      data.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
      
      setAlerts(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Unable to fetch weather alerts');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAlerts();
    
    // Refresh alerts every 10 minutes
    const interval = setInterval(fetchAlerts, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const toggleAlert = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  };
  
  // Count by severity
  const severityCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
  
  const hasActiveAlerts = alerts.length > 0;
  const hasSevereAlerts = severityCounts.Extreme > 0 || severityCounts.Severe > 0;
  
  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`p-3 border-b border-slate-700 ${hasSevereAlerts ? 'bg-red-900/20' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${hasSevereAlerts ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-white">Weather Alerts</span>
            {hasActiveAlerts && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                hasSevereAlerts ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
              }`}>
                {alerts.length} Active
              </span>
            )}
          </div>
          
          {lastUpdated && (
            <span className="text-[10px] text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* Severity summary */}
        {hasActiveAlerts && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {severityCounts.Extreme > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-500 text-white">
                {severityCounts.Extreme} Extreme
              </span>
            )}
            {severityCounts.Severe > 0 && (
              <span className="px-2 py-0.5 rounded bg-orange-500 text-white">
                {severityCounts.Severe} Severe
              </span>
            )}
            {severityCounts.Moderate > 0 && (
              <span className="px-2 py-0.5 rounded bg-yellow-500 text-black">
                {severityCounts.Moderate} Moderate
              </span>
            )}
            {severityCounts.Minor > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-500 text-white">
                {severityCounts.Minor} Minor
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        {isLoading && alerts.length === 0 ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-cyan-400 rounded-full mx-auto" />
            <p className="text-xs text-slate-500 mt-2">Checking for alerts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-400 text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <p className="text-sm text-green-400 font-medium">No Active Alerts</p>
            <p className="text-xs text-slate-500 mt-1">Weather conditions are normal for Utah</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isExpanded={expandedAlerts[alert.id]}
                onToggle={() => toggleAlert(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with NWS link */}
      <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/30">
        <a
          href="https://www.weather.gov/slc/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <span>View full forecast at NWS Salt Lake City</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default SevereWeatherAlerts;
