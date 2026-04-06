import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Clock, Zap, Shield, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { apiUrl } from '@utahwind/weather';
import { fetchWithRetry } from '../utils/fetchWithRetry';

const EVENT_LABELS = {
  frontal_passage: 'Frontal Passage',
  north_flow: 'North Flow',
  clearing_wind: 'Clearing Wind',
  thermal_cycle: 'Thermal Cycle',
  pre_frontal: 'Pre-Frontal',
  glass: 'Glass',
  post_frontal: 'Post-Frontal',
};

function pct(val) {
  if (val == null) return '—';
  return `${Math.round(val * 100)}%`;
}

function AccuracyBar({ label, ours, nws, count }) {
  const ourPct = ours != null ? Math.round(ours * 100) : 0;
  const nwsPct = nws != null ? Math.round(nws * 100) : 0;
  const weWin = ours != null && nws != null && ours > nws;
  const tied = ours != null && nws != null && Math.abs(ours - nws) < 0.02;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-xs text-slate-500">{count} checks</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs w-8 text-sky-400 font-bold">Us</span>
          <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${weWin || tied ? 'bg-sky-500' : 'bg-sky-500/60'}`}
              style={{ width: `${Math.max(ourPct, 2)}%` }}
            />
          </div>
          <span className={`text-xs w-10 text-right font-bold ${weWin ? 'text-green-400' : 'text-sky-400'}`}>
            {pct(ours)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-8 text-slate-500">NWS</span>
          <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-600 transition-all duration-700"
              style={{ width: `${Math.max(nwsPct, 2)}%` }}
            />
          </div>
          <span className="text-xs w-10 text-right text-slate-400">{pct(nws)}</span>
        </div>
      </div>
      {weWin && (
        <div className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
          <TrendingUp size={10} /> +{Math.round((ours - nws) * 100)}pts ahead
        </div>
      )}
    </div>
  );
}

function AheadCard({ detection }) {
  const isAhead = detection.status === 'ahead';
  const isConfirmed = detection.status === 'confirmed_ahead';
  const color = isAhead ? 'text-amber-400' : isConfirmed ? 'text-green-400' : 'text-sky-400';
  const bg = isAhead ? 'bg-amber-500/10' : isConfirmed ? 'bg-green-500/10' : 'bg-sky-500/10';

  return (
    <div className={`${bg} rounded-lg px-3 py-2 mb-2`}>
      <div className="flex items-center gap-2">
        {isAhead && <Zap size={14} className="text-amber-400" />}
        {isConfirmed && <Shield size={14} className="text-green-400" />}
        <span className={`text-sm font-medium ${color}`}>
          {detection.message}
        </span>
      </div>
      <div className="flex gap-3 mt-1 text-xs text-slate-400">
        <span>{detection.stationName}</span>
        {detection.etaHours && <span>ETA: {detection.etaHours}h</span>}
        {detection.leadTimeHours && (
          <span className="text-green-400 font-bold">
            {detection.leadTimeHours}h ahead of NWS
          </span>
        )}
      </div>
    </div>
  );
}

export default function AccuracyScoreboard() {
  const [weights, setWeights] = useState(null);
  const [aheadLog, setAheadLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadData = async () => {
    try {
      const [wResp, aResp] = await Promise.all([
        fetchWithRetry(apiUrl(`/api/cron/collect?action=weights`)).then(r => r.json()),
        fetchWithRetry(apiUrl(`/api/cron/collect?action=ahead`)).then(r => r.json()),
      ]);
      const w = wResp.weights || {};
      setWeights(w);
      setAheadLog(aResp);
    } catch (e) {
      console.error('AccuracyScoreboard load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-48 mb-4" />
        <div className="h-4 bg-slate-800 rounded w-full mb-2" />
        <div className="h-4 bg-slate-800 rounded w-3/4" />
      </div>
    );
  }

  const meta = weights?.meta || {};
  const eventAccuracy = meta.eventAccuracy || {};
  const nwsOverall = meta.nwsOverallAccuracy;
  const ourOverall = meta.overallAccuracy;
  const totalPreds = meta.totalPredictions || 0;
  const rawStats = aheadLog?.stats || {};
  const aheadStats = {
    confirmedAhead: rawStats.confirmed ?? rawStats.confirmedAhead ?? 0,
    avgLeadTimeHours: rawStats.avgLeadTimeHours ?? null,
    totalAheadEvents: rawStats.aheadEvents ?? rawStats.total ?? 0,
  };
  const recentAhead = (aheadLog?.log || []).filter(d => d.status === 'ahead' || d.status === 'confirmed_ahead').slice(-5).reverse();

  const weWinOverall = ourOverall != null && nwsOverall != null && ourOverall > nwsOverall;
  
  // Use demo data when no real predictions are tracked yet
  const hasRealData = totalPreds > 0;
  const displayOurOverall = hasRealData ? ourOverall : 0.73;
  const displayNwsOverall = hasRealData ? nwsOverall : 0.58;
  const displayTotalPreds = hasRealData ? totalPreds : 2847;
  const displayWeWin = hasRealData ? weWinOverall : true;

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-sky-400" />
            <h3 className="font-semibold text-white text-lg">Accuracy Scoreboard</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          UtahWindFinder vs National Weather Service — {displayTotalPreds.toLocaleString()} predictions tracked
          {!hasRealData && <span className="text-amber-500/70 ml-1">(sample data)</span>}
        </p>
      </div>

      {/* Overall Score */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${displayWeWin ? 'text-green-400' : 'text-sky-400'}`}>
            {pct(displayOurOverall)}
          </div>
          <div className="text-xs text-slate-400 mt-1">UtahWindFinder</div>
          {displayWeWin && (
            <div className="text-xs text-green-400 flex items-center justify-center gap-1 mt-1">
              <TrendingUp size={10} /> Leading
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-500">{pct(displayNwsOverall)}</div>
          <div className="text-xs text-slate-400 mt-1">NWS Forecast</div>
        </div>
      </div>

      {/* Ahead of Forecast Badge - show demo data if no real data */}
      {(aheadStats.confirmedAhead > 0 || !hasRealData) && (
        <div className="mx-4 mb-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-green-400" />
            <span className="text-sm font-semibold text-green-400">Ahead of the Forecast</span>
            {!hasRealData && <span className="text-[10px] text-amber-500/70">(sample)</span>}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div>
              <span className="text-green-400 font-bold text-lg">{hasRealData ? aheadStats.confirmedAhead : 47}</span>
              <span className="text-slate-400 ml-1">events detected early</span>
            </div>
            <div>
              <span className="text-green-400 font-bold text-lg">{hasRealData && aheadStats.avgLeadTimeHours != null ? aheadStats.avgLeadTimeHours : 2.3}h</span>
              <span className="text-slate-400 ml-1">avg lead time</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Ahead Detections */}
      {recentAhead.length > 0 && (
        <div className="mx-4 mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Clock size={12} className="text-amber-400" />
            <span className="text-xs font-medium text-slate-400">Recent Detections</span>
          </div>
          {recentAhead.map((d, i) => (
            <AheadCard key={i} detection={d} />
          ))}
        </div>
      )}

      {/* Per-Event Breakdown (expandable) */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Per-Event Breakdown</span>
          </div>
          {Object.entries(eventAccuracy).map(([key, data]) => {
            if (!data) return null;
            return (
              <AccuracyBar
                key={key}
                label={EVENT_LABELS[key] || key}
                ours={data.accuracy}
                nws={data.nwsAccuracy}
                count={data.count}
              />
            );
          })}
          {Object.keys(eventAccuracy).length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">
              Collecting data — accuracy stats will appear after a few learning cycles
            </p>
          )}
        </div>
      )}
    </div>
  );
}
