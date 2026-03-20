import React, { useState, useEffect } from 'react';
import { History, Calendar, Wind, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { apiUrl } from '../utils/platform';
import { safeToFixed } from '../utils/safeToFixed';

const EVENT_LABELS = {
  frontal_passage: 'Front',
  north_flow: 'N Flow',
  clearing_wind: 'Clearing',
  thermal_cycle: 'Thermal',
  pre_frontal: 'Pre-Front',
  glass: 'Glass',
  post_frontal: 'Post-Front',
};

function AnalogDay({ analog, isTop }) {
  const [expanded, setExpanded] = useState(isTop);
  const dateStr = analog.date
    ? new Date(analog.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Unknown';
  const accuracy = Math.round((analog.avgAccuracy || 0) * 100);

  // Summarize what happened that day
  const topEvents = (analog.events || [])
    .sort((a, b) => (b.actualSpeed || 0) - (a.actualSpeed || 0))
    .slice(0, 3);

  const peakSpeed = topEvents.length > 0 ? Math.max(...topEvents.map(e => e.actualSpeed || 0)) : 0;

  return (
    <div className={`rounded-lg overflow-hidden mb-2 ${isTop ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-slate-800/50'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <Calendar size={16} className={isTop ? 'text-sky-400' : 'text-slate-500'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isTop ? 'text-sky-300' : 'text-slate-300'}`}>{dateStr}</span>
            {isTop && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">Best Match</span>}
          </div>
          <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
            <span>Peak: {safeToFixed(peakSpeed, 0)} mph</span>
            <span>Accuracy: {accuracy}%</span>
            <span>{analog.count} events</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      {expanded && topEvents.length > 0 && (
        <div className="px-3 pb-3 border-t border-slate-700/30 pt-2">
          <div className="text-xs text-slate-500 mb-1.5">What happened that day:</div>
          <div className="space-y-1">
            {topEvents.map((evt, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Wind size={10} className="text-slate-500" />
                <span className="text-slate-400 w-16">{EVENT_LABELS[evt.eventType] || evt.eventType}</span>
                <span className="text-slate-300 font-medium">{safeToFixed(evt.actualSpeed, 0)} mph</span>
                {evt.hour != null && (
                  <span className="text-slate-500">
                    at {evt.hour <= 12 ? (evt.hour === 0 ? '12 AM' : `${evt.hour} AM`) : (evt.hour === 12 ? '12 PM' : `${evt.hour - 12} PM`)}
                  </span>
                )}
                <span className={`ml-auto ${evt.score > 0.6 ? 'text-green-400' : evt.score > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {Math.round((evt.score || 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatternMatch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const resp = await fetch(apiUrl(`/api/cron/collect?action=analogs`));
      const json = await resp.json();
      setData(json);
    } catch (e) {
      console.error('PatternMatch load error:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-48 mb-3" />
        <div className="h-16 bg-slate-800 rounded mb-2" />
        <div className="h-16 bg-slate-800 rounded" />
      </div>
    );
  }

  const analogs = data?.analogs || [];
  const fingerprint = data?.fingerprint;

  if (analogs.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <History size={18} />
          <span className="text-sm">Pattern matching will activate after more data is collected</span>
        </div>
      </div>
    );
  }

  const topAnalog = analogs[0];
  const display = showAll ? analogs : analogs.slice(0, 2);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-purple-400" />
            <h3 className="font-semibold text-white">Similar Past Days</h3>
          </div>
          <div className="flex items-center gap-1">
            <Target size={12} className="text-slate-500" />
            <span className="text-xs text-slate-500">{analogs.length} matches</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Today's conditions match these past days — see what actually happened
        </p>

        {/* Current Fingerprint Summary */}
        {fingerprint && (
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-slate-500">
              Gradient: <span className="text-slate-300">{safeToFixed(fingerprint.gradient, 1)} mb</span>
            </span>
            <span className="text-slate-500">
              Wind: <span className="text-slate-300">{safeToFixed(fingerprint.windSpeed, 0)} mph</span>
            </span>
            <span className="text-slate-500">
              Temp: <span className="text-slate-300">{safeToFixed(fingerprint.temp, 0)}°F</span>
            </span>
          </div>
        )}
      </div>

      {/* Analog Days */}
      <div className="p-3">
        {display.map((analog, i) => (
          <AnalogDay key={analog.date || i} analog={analog} isTop={i === 0} />
        ))}
      </div>

      {analogs.length > 2 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-center text-sm text-purple-400 hover:text-purple-300 transition-colors border-t border-slate-800"
        >
          {showAll ? 'Show top 2' : `Show all ${analogs.length} analogs`}
        </button>
      )}
    </div>
  );
}
