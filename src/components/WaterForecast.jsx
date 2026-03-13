import React, { useState, useEffect, useMemo } from 'react';
import { Wind, AlertTriangle, Clock, Waves, Cloud, TrendingUp, TrendingDown, Shield, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { getHourlyGlassForecast, getUpstreamWarnings, analyzePressureForWater } from '../services/WaterSafetyService';

const WAVE_COLORS = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/20' },
  green: { bg: 'bg-green-500', text: 'text-green-400', light: 'bg-green-500/20' },
  lime: { bg: 'bg-lime-500', text: 'text-lime-400', light: 'bg-lime-500/20' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-400', light: 'bg-yellow-500/20' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-400', light: 'bg-orange-500/20' },
  red: { bg: 'bg-red-500', text: 'text-red-400', light: 'bg-red-500/20' },
};

const UpstreamWarnings = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div key={w.id || i} className={`rounded-lg p-3 border ${
          w.severity === 'critical' ? 'bg-red-500/10 border-red-500/40 animate-pulse' :
          w.severity === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
          w.severity === 'positive' ? 'bg-green-500/10 border-green-500/30' :
          'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{w.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  w.severity === 'critical' ? 'text-red-400' :
                  w.severity === 'warning' ? 'text-orange-400' :
                  w.severity === 'positive' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {w.message}
                </span>
                {w.leadTime && (
                  <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                    ~{w.leadTime} min lead
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{w.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GlassTimeline = ({ hours, expanded }) => {
  if (!hours || hours.length === 0) return null;

  const displayHours = expanded ? hours : hours.slice(0, 12);

  return (
    <div className="space-y-0.5">
      {displayHours.map((h, i) => {
        const colors = WAVE_COLORS[h.waveColor] || WAVE_COLORS.yellow;
        return (
          <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded ${
            h.isCurrent ? 'bg-cyan-500/10 border border-cyan-500/30' : ''
          }`}>
            <span className={`text-xs w-14 flex-shrink-0 ${h.isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
              {h.time}
            </span>

            {/* Wave bar */}
            <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full ${colors.bg} transition-all duration-300 rounded-full`}
                style={{ width: `${h.waveScore}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                {h.predictedSpeed} mph
              </span>
            </div>

            <span className="text-sm w-6 text-center flex-shrink-0">{h.waveEmoji}</span>

            <span className={`text-[10px] w-16 text-right flex-shrink-0 ${colors.text}`}>
              {h.waveLabel}
            </span>

            {h.cloudCover && (
              <span className="text-sm w-5 text-center flex-shrink-0" title={h.cloudCover.label}>
                {h.cloudCover.icon}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const GlassWindowCards = ({ windows }) => {
  if (!windows || windows.length === 0) {
    return (
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-xs text-slate-400">No glass windows predicted in next 24 hours</p>
        <p className="text-[10px] text-slate-500 mt-1">Wind expected throughout the day</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {windows.map((w, i) => (
        <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-400 font-medium">
              {w.isToday ? 'Today' : 'Tomorrow'}
            </span>
            <span className="text-[10px] text-slate-500">{w.duration}h window</span>
          </div>
          <div className="text-lg font-bold text-white">
            {w.start} – {w.end}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            🪞 Glass conditions expected
          </div>
        </div>
      ))}
    </div>
  );
};

const WindEventsList = ({ events }) => {
  if (!events || events.length === 0) return null;

  const important = events.filter(e => e.severity !== 'positive');
  const positive = events.filter(e => e.severity === 'positive');

  return (
    <div className="space-y-1">
      {important.map((e, i) => (
        <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${
          e.severity === 'warning' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'
        }`}>
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{e.message} ({e.time})</span>
        </div>
      ))}
      {positive.slice(0, 2).map((e, i) => (
        <div key={`p-${i}`} className="flex items-center gap-2 text-xs p-1.5 rounded bg-green-500/10 text-green-400">
          <Waves className="w-3 h-3 flex-shrink-0" />
          <span>{e.message}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Main Water Forecast component.
 * Shows hourly glass timeline, glass window predictions, upstream warnings,
 * and pressure alerts for boaters and fishermen.
 */
const WaterForecast = ({ locationId = 'utah-lake', currentWind = {}, pressureData = {}, activity = 'boating', upstreamData = {} }) => {
  const [forecast, setForecast] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      setIsLoading(true);
      setError(null);
      try {
        const [hourlyResult, upstreamResult] = await Promise.all([
          getHourlyGlassForecast(locationId, currentWind, upstreamData),
          getUpstreamWarnings(locationId),
        ]);
        if (!cancelled) {
          setForecast(hourlyResult);
          setWarnings(upstreamResult);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadForecast();
    const interval = setInterval(loadForecast, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [locationId, currentWind?.speed, upstreamData?.kslcSpeed, upstreamData?.kpvuSpeed]);

  const pressureAlerts = useMemo(() => analyzePressureForWater(pressureData), [pressureData]);

  const allWarnings = useMemo(() => {
    const combined = [...warnings];
    for (const pa of pressureAlerts) {
      combined.push({
        id: `pressure-${pa.severity}`,
        station: 'barometer',
        stationName: 'Barometer',
        ...pa,
        leadTime: null,
      });
    }
    const sevOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
    combined.sort((a, b) => (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9));
    return combined;
  }, [warnings, pressureAlerts]);

  const criticalCount = allWarnings.filter(w => w.severity === 'critical').length;
  const warningCount = allWarnings.filter(w => w.severity === 'warning').length;

  if (isLoading && !forecast) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-48 mb-3" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-5 bg-slate-700 rounded" />)}
        </div>
      </div>
    );
  }

  if (error && !forecast) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/30">
        <p className="text-xs text-red-400">Forecast unavailable: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upstream Warnings */}
      {allWarnings.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Shield className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-400' : warningCount > 0 ? 'text-orange-400' : 'text-green-400'}`} />
            <span className="text-sm font-medium text-white">
              {activity === 'fishing' ? 'Water Conditions' : 'Water Safety'}
            </span>
            {criticalCount > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <UpstreamWarnings warnings={allWarnings} />
        </div>
      )}

      {/* Glass Window Predictions */}
      {forecast && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">
              {activity === 'fishing' ? 'Wind Forecast' : 'Glass Window Forecast'}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto">Next 24 hours</span>
          </div>

          <GlassWindowCards windows={forecast.glassWindows} />

          {forecast.windEvents?.length > 0 && (
            <div className="mt-3">
              <WindEventsList events={forecast.windEvents} />
            </div>
          )}
        </div>
      )}

      {/* Hourly Timeline */}
      {forecast?.hours && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Hour-by-Hour Forecast</span>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              {expanded ? 'Less' : 'Full 24h'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Translation factor indicator */}
          {forecast.flowBlocked && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] text-emerald-400">
                Upstream wind is not reaching the lake — glass conditions likely to persist
              </span>
            </div>
          )}

          <GlassTimeline hours={forecast.hours} expanded={expanded} />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-slate-700">
            {[
              { emoji: '🪞', label: 'Glass' },
              { emoji: '✨', label: 'Near-Glass' },
              { emoji: '〰️', label: 'Light Chop' },
              { emoji: '🌊', label: 'Moderate' },
              { emoji: '⚠️', label: 'Choppy' },
              { emoji: '🔴', label: 'Rough' },
            ].map(item => (
              <span key={item.label} className="text-[10px] text-slate-500">
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterForecast;
