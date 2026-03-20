import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Navigation, Wind, CloudSun, ChevronDown, ChevronUp, Zap, Eye } from 'lucide-react';
import { apiUrl } from '../utils/platform';

// NWS grid mapping — must match server-side LAKE_TO_GRID in nwsForecast.js
const LAKE_TO_GRID = {
  'utah-lake-lincoln': 'utah-lake', 'utah-lake-sandy': 'utah-lake',
  'utah-lake-vineyard': 'utah-lake', 'utah-lake-zigzag': 'utah-lake',
  'utah-lake-mm19': 'utah-lake', 'potm-south': 'utah-lake',
  'potm-north': 'utah-lake', 'rush-lake': 'utah-lake',
  'grantsville': 'utah-lake', 'stockton-bar': 'utah-lake',
  'inspo': 'utah-lake', 'west-mountain': 'utah-lake',
  'yuba': 'utah-lake',
  'deer-creek': 'deer-creek', 'jordanelle': 'deer-creek',
  'east-canyon': 'deer-creek', 'echo': 'deer-creek',
  'rockport': 'deer-creek',
  'strawberry-ladders': 'deer-creek', 'strawberry-bay': 'deer-creek',
  'strawberry-soldier': 'deer-creek', 'strawberry-view': 'deer-creek',
  'strawberry-river': 'deer-creek', 'skyline-drive': 'deer-creek',
  'scofield': 'deer-creek',
  'willard-bay': 'willard-bay', 'pineview': 'willard-bay',
  'hyrum': 'willard-bay', 'powder-mountain': 'willard-bay',
  'monte-cristo': 'willard-bay',
  'bear-lake': 'bear-lake',
  'sand-hollow': 'stgeorge', 'quail-creek': 'stgeorge',
  'lake-powell': 'stgeorge', 'otter-creek': 'stgeorge',
  'fish-lake': 'stgeorge', 'minersville': 'stgeorge',
  'piute': 'stgeorge', 'panguitch': 'stgeorge',
  'starvation': 'vernal', 'steinaker': 'vernal',
  'red-fleet': 'vernal', 'flaming-gorge': 'vernal',
};

const DIR_ARROWS = {
  N: '↓', NNE: '↙', NE: '↙', ENE: '←', E: '←', ESE: '↖',
  SE: '↖', SSE: '↑', S: '↑', SSW: '↗', SW: '↗', WSW: '→',
  W: '→', WNW: '↘', NW: '↘', NNW: '↓',
};

function speedColor(mph) {
  if (mph == null) return 'text-slate-500';
  if (mph >= 20) return 'text-red-400';
  if (mph >= 15) return 'text-orange-400';
  if (mph >= 10) return 'text-green-400';
  if (mph >= 5) return 'text-sky-400';
  return 'text-slate-400';
}

function agreementBadge(ourSpeed, nwsSpeed) {
  if (ourSpeed == null || nwsSpeed == null) return null;
  const diff = Math.abs(ourSpeed - nwsSpeed);
  if (diff <= 3) return { label: 'Agree', color: 'text-green-400', bg: 'bg-green-500/10' };
  if (diff <= 7) return { label: 'Close', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { label: 'Differ', color: 'text-orange-400', bg: 'bg-orange-500/10' };
}

function HourRow({ hour, nws, isNow, expanded }) {
  const nwsSpeed = nws?.speed;
  const nwsDir = nws?.dir;
  const nwsText = nws?.text;
  const arrow = DIR_ARROWS[nwsDir] || '';
  const isPeak = nwsSpeed != null && nwsSpeed >= 10;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${
      isNow ? 'bg-sky-500/10 border-l-2 border-sky-500' : ''
    } ${isPeak ? 'bg-green-500/5' : ''}`}>
      {/* Hour */}
      <div className="w-14 text-right">
        <span className={`text-sm font-mono ${isNow ? 'text-sky-400 font-bold' : 'text-slate-400'}`}>
          {hour != null ? (hour <= 12 ? (hour === 0 ? '12 AM' : `${hour} AM`) : (hour === 12 ? '12 PM' : `${hour - 12} PM`)) : '—'}
        </span>
      </div>

      {/* NWS Wind */}
      <div className="flex items-center gap-1 w-20">
        <span className={`text-sm font-bold ${speedColor(nwsSpeed)}`}>
          {nwsSpeed != null ? `${Math.round(nwsSpeed)}` : '—'}
        </span>
        <span className="text-xs text-slate-500">mph</span>
      </div>

      {/* Direction */}
      <div className="w-12 text-center">
        <span className="text-sm text-slate-400">{arrow} {nwsDir || ''}</span>
      </div>

      {/* Forecast Text */}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-500 truncate block">{nwsText || ''}</span>
      </div>

      {/* Now indicator */}
      {isNow && (
        <span className="text-xs text-sky-400 font-bold shrink-0">NOW</span>
      )}
    </div>
  );
}

export default function SpotTimeline({ locationId = 'utah-lake', activity = 'kiting' }) {
  const [nwsData, setNwsData] = useState(null);
  const [aheadData, setAheadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [locationId]);

  const loadData = async () => {
    try {
      const [nwsResp, aheadResp] = await Promise.all([
        fetch(apiUrl(`/api/cron/collect?action=nws`)).then(r => r.json()),
        fetch(apiUrl(`/api/cron/collect?action=ahead`)).then(r => r.json()),
      ]);
      setNwsData(nwsResp);
      setAheadData(aheadResp);
    } catch (e) {
      console.error('SpotTimeline load error:', e);
    }
    setLoading(false);
  };

  const gridId = LAKE_TO_GRID[locationId] || 'utah-lake';
  const hourly = nwsData?.grids?.[gridId]?.hourly || [];
  const nowHour = new Date().getHours();

  // Find peak wind hours
  const peakHour = useMemo(() => {
    if (hourly.length === 0) return null;
    const next12 = hourly.slice(0, 12);
    const peak = next12.reduce((best, h) => (!best || (h.speed || 0) > (best.speed || 0)) ? h : best, null);
    return peak;
  }, [hourly]);

  // Active ahead-of-forecast events
  const activeAhead = (aheadData?.log || []).filter(d => d.status === 'ahead').slice(-3);

  const displayHours = expanded ? hourly.slice(0, 24) : hourly.slice(0, 8);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-40 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (hourly.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <CloudSun size={18} />
          <span className="text-sm">NWS forecast loading — will appear on next cron cycle</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-sky-400" />
            <h3 className="font-semibold text-white">Hour-by-Hour Forecast</h3>
          </div>
          <div className="flex items-center gap-2">
            {nwsData?.fetchedAt && (
              <span className="text-xs text-slate-500">
                NWS {new Date(nwsData.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Peak Wind Summary */}
        {peakHour && peakHour.speed >= 8 && (
          <div className="mt-2 flex items-center gap-2">
            <Wind size={14} className="text-green-400" />
            <span className="text-sm text-green-400 font-medium">
              Peak: {Math.round(peakHour.speed)} mph {peakHour.dir} at {
                peakHour.localHour <= 12
                  ? (peakHour.localHour === 0 ? '12 AM' : `${peakHour.localHour} AM`)
                  : (peakHour.localHour === 12 ? '12 PM' : `${peakHour.localHour - 12} PM`)
              }
            </span>
          </div>
        )}
      </div>

      {/* Ahead-of-Forecast Alert */}
      {activeAhead.length > 0 && (
        <div className="mx-4 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">AHEAD OF FORECAST</span>
          </div>
          {activeAhead.map((d, i) => (
            <div key={i} className="text-xs text-amber-300 mt-1">
              {d.message} — ETA {d.etaHours}h
            </div>
          ))}
        </div>
      )}

      {/* Column Headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 text-xs text-slate-500">
        <div className="w-14 text-right">Time</div>
        <div className="w-20">Wind</div>
        <div className="w-12 text-center">Dir</div>
        <div className="flex-1">Conditions</div>
      </div>

      {/* Hour Rows */}
      <div className="divide-y divide-slate-800/50">
        {displayHours.map((h, i) => (
          <HourRow
            key={i}
            hour={h.localHour}
            nws={h}
            isNow={h.localHour === nowHour}
            expanded={expanded}
          />
        ))}
      </div>

      {/* Expand / Collapse */}
      {hourly.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-center text-sm text-sky-400 hover:text-sky-300 transition-colors border-t border-slate-800"
        >
          {expanded ? 'Show less' : `Show ${Math.min(24, hourly.length) - 8} more hours`}
        </button>
      )}
    </div>
  );
}
