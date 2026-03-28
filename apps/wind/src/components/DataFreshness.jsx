import React from 'react';
import { Clock, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const DataFreshness = ({ 
  lastUpdated, 
  isLoading, 
  error, 
  onRefresh,
  refreshInterval = 3, // minutes
  className = '' 
}) => {
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return null;
    
    const now = new Date();
    const diff = now - lastUpdated;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };
  
  const getDataStatus = () => {
    if (error) return 'error';
    if (!lastUpdated) return 'loading';
    
    const now = new Date();
    const diff = now - lastUpdated;
    const minutes = Math.floor(diff / 1000 / 60);
    
    if (minutes < refreshInterval + 1) return 'fresh';
    if (minutes < refreshInterval * 2) return 'stale';
    return 'old';
  };
  
  const status = getDataStatus();
  const timeSince = getTimeSinceUpdate();
  
  const statusConfig = {
    fresh: {
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: Wifi,
      label: 'Live',
    },
    stale: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: Clock,
      label: 'Updating...',
    },
    old: {
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      icon: AlertCircle,
      label: 'Stale',
    },
    error: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: WifiOff,
      label: 'Offline',
    },
    loading: {
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      icon: RefreshCw,
      label: 'Loading',
    },
  };
  
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <div className={`rounded-lg p-3 ${config.bg} border ${config.border} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${config.color} ${isLoading ? 'animate-spin' : ''}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              {timeSince && (
                <span className="text-xs text-slate-500">• {timeSince}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Wind data updates every {refreshInterval} minutes
            </p>
          </div>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`
            p-1.5 rounded-md transition-colors
            ${isLoading 
              ? 'bg-slate-700 cursor-not-allowed' 
              : 'bg-slate-700 hover:bg-slate-600'
            }
          `}
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Data sources info */}
      <div className="mt-2 pt-2 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-[10px]">
        <div className="text-center">
          <div className="text-slate-500">PWS</div>
          <div className="text-slate-400">Real-time</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">MesoWest</div>
          <div className="text-slate-400">5-15 min</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">NWS Alerts</div>
          <div className="text-slate-400">10 min</div>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default DataFreshness;
