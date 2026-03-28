import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Wind, Thermometer, Gauge, Navigation, AlertTriangle, Sun, CloudRain } from 'lucide-react';
import { apiUrl } from '@utahwind/weather';
import { safeToFixed } from '../utils/safeToFixed';

const EVENT_CONFIG = {
  frontal_passage: { label: 'Frontal Passage', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  north_flow:      { label: 'North Flow', icon: Navigation, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  clearing_wind:   { label: 'Clearing Wind', icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  thermal_cycle:   { label: 'Thermal Cycle', icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  pre_frontal:     { label: 'Pre-Frontal', icon: Wind, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  glass:           { label: 'Glass', icon: Gauge, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  post_frontal:    { label: 'Post-Frontal', icon: CloudRain, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

function PredictionCard({ prediction, expanded, onToggle }) {
  const config = EVENT_CONFIG[prediction.eventType] || EVENT_CONFIG.thermal_cycle;
  const Icon = config.icon;
  const prob = prediction.probability != null ? Math.round(prediction.probability) : 0;
  const why = prediction.why || [];
  const rawSpeed = prediction.expectedSpeed;
  const speeds = Array.isArray(rawSpeed) && rawSpeed.length >= 2
    ? rawSpeed
    : (rawSpeed && typeof rawSpeed === 'object' && rawSpeed.min != null)
      ? [rawSpeed.min, rawSpeed.max]
      : [0, 0];
  const [expMin, expMax] = speeds;
  const isGo = prob >= 50;

  return (
    <div className={`${config.bg} rounded-lg overflow-hidden mb-2`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <Icon size={18} className={config.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
              isGo ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'
            }`}>
              {prob}%
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {expMin}–{expMax} mph expected
            {prediction.nwsForecast?.speed != null && (
              <span className="ml-2 text-slate-500">
                NWS: {Math.round(prediction.nwsForecast.speed)} mph {prediction.nwsForecast.dir || ''}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      {expanded && why.length > 0 && (
        <div className="px-3 pb-3 border-t border-slate-700/30 pt-2">
          <div className="flex items-center gap-1 mb-2">
            <Lightbulb size={12} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">Why this prediction</span>
          </div>
          <ul className="space-y-1.5">
            {why.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-slate-500 mt-0.5 shrink-0">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {prediction.nwsForecast?.text && (
            <div className="mt-2 pt-2 border-t border-slate-700/30">
              <span className="text-xs text-slate-500">NWS says: </span>
              <span className="text-xs text-slate-400">{prediction.nwsForecast.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WhyExplainer({ locationId = 'utah-lake' }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadPredictions();
    const interval = setInterval(loadPredictions, 120000);
    return () => clearInterval(interval);
  }, [locationId]);

  const loadPredictions = async () => {
    try {
      const resp = await fetch(apiUrl(`/api/cron/collect?action=predictions&lake=${locationId}`));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setPredictions(data.predictions || []);
    } catch (e) {
      console.warn('WhyExplainer load error:', e.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-6 bg-[var(--border-color)] rounded w-48 mb-3" />
        <div className="h-10 bg-[var(--border-color)] rounded mb-2" />
        <div className="h-10 bg-[var(--border-color)] rounded mb-2" />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Lightbulb size={18} />
          <span className="text-sm">No active predictions for this location yet</span>
        </div>
      </div>
    );
  }

  const topPrediction = predictions[0];
  const isGo = topPrediction && topPrediction.probability >= 50;
  const display = showAll ? predictions : predictions.slice(0, 3);

  return (
    <div className="card overflow-hidden">
      {/* Verdict Header */}
      <div className={`p-4 border-b border-slate-700/50 ${isGo ? 'bg-green-500/5' : 'bg-slate-800/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className={isGo ? 'text-green-400' : 'text-amber-400'} />
            <h3 className="font-semibold text-white">Wind Prediction</h3>
          </div>
          {topPrediction && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              isGo ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isGo ? 'GO' : 'WAIT'}
            </span>
          )}
        </div>
        {topPrediction && (
          <p className="text-sm text-slate-400 mt-1">
            {isGo
              ? `${EVENT_CONFIG[topPrediction.eventType]?.label || topPrediction.eventType} at ${safeToFixed(topPrediction.probability, 0)}% — tap for details`
              : 'No strong wind events predicted right now'
            }
          </p>
        )}
      </div>

      {/* Prediction Cards */}
      <div className="p-3">
        {display.map((pred) => (
          <PredictionCard
            key={`${pred.lakeId}-${pred.eventType}`}
            prediction={pred}
            expanded={expandedId === `${pred.lakeId}-${pred.eventType}`}
            onToggle={() => setExpandedId(
              expandedId === `${pred.lakeId}-${pred.eventType}` ? null : `${pred.lakeId}-${pred.eventType}`
            )}
          />
        ))}
      </div>

      {/* Show More */}
      {predictions.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-center text-sm text-sky-400 hover:text-sky-300 transition-colors border-t border-slate-800"
        >
          {showAll ? 'Show top 3' : `Show all ${predictions.length} predictions`}
        </button>
      )}
    </div>
  );
}
