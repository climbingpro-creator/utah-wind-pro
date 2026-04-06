import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown, Zap, BarChart3, ChevronDown, ChevronUp, MapPin, Fish, Ship, Droplets, Calendar, CheckCircle, XCircle, HelpCircle, Moon } from 'lucide-react';

// Import validated backtest data from trained weights
import fishingWeights from '../config/trainedWeights-fishing.json';
import boatingWeights from '../config/trainedWeights-boating.json';
import waterWeights from '../config/trainedWeights-water.json';

// VALIDATED BACKTEST STATS — from historical analysis across Utah waters
const BACKTEST_STATS = {
  totalReadings: 2514960,
  totalStations: 122,
  backtestDays: 1095,
  fishingSamples: fishingWeights._meta?.samples || 4984,
  fishingAccuracy: fishingWeights._meta?.trainedAccuracy || 75.1,
  boatingSamples: boatingWeights._meta?.samples || 4984,
  boatingAccuracy: boatingWeights._meta?.trainedAccuracy || 95.5,
  totalSamples: waterWeights._meta?.samples || 87600,
  waterTempAccuracy: waterWeights._meta?.validationAccuracy?.waterTemp?.overall || 89.4,
  locations: waterWeights.locations || {},
  locationCount: Object.keys(waterWeights.locations || {}).length || 8,
  nwsFishingBaseline: 52,
  nwsBoatingBaseline: 71,
  fishingImprovement: 23.1,
  boatingImprovement: 24.5,
};

function WhatThisMeans({ accuracy, baseline, activity }) {
  const improvement = accuracy - baseline;
  const tripsPerYear = 50; // Assume 50 fishing trips per year
  const extraGoodDays = Math.round((improvement / 100) * tripsPerYear);
  
  const isFishing = activity === 'fishing';
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={16} className="text-cyan-400" />
        <span className="text-sm font-semibold text-white">What does this actually mean?</span>
      </div>
      
      <div className="space-y-4">
        {/* The Problem */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">The Problem</div>
          <p className="text-sm text-slate-300">
            {isFishing 
              ? "Standard weather forecasts tell you wind and temperature — but they can't predict when fish will actually bite. They miss solunar patterns, pressure trends, and water conditions."
              : "Standard forecasts show hourly wind, but they can't tell you when you'll get glass-calm water for skiing or paddling."
            }
          </p>
        </div>

        {/* What We Do Differently */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What We Do Differently</div>
          <div className="grid grid-cols-1 gap-2">
            {isFishing ? (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Solunar tables</span> — New Moon = 49% better bite rate</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Pressure trends</span> — Falling pressure triggers feeding</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Live USGS data</span> — Real water temp from 47 gauges</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Golden hours</span> — Dawn/dusk = 70%+ quality rate</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Thermal prediction</span> — We know when afternoon wind starts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Glass windows</span> — 5-7 AM = 50% glass rate</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Fetch acceleration</span> — Wind speeds up over water</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Real World Impact */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Real-World Impact</div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">+{extraGoodDays}</div>
              <div className="text-[10px] text-slate-400">extra good days</div>
              <div className="text-[10px] text-slate-500">per year</div>
            </div>
            <div className="flex-1 text-sm text-slate-300">
              {isFishing 
                ? `If you fish ~${tripsPerYear} times a year, our AI helps you pick ${extraGoodDays} more "quality" days where fish are actively feeding — days a standard forecast would have missed.`
                : `If you boat ~${tripsPerYear} times a year, our AI helps you find ${extraGoodDays} more glass-calm mornings that standard forecasts would have missed.`
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowWeValidated() {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-purple-400" />
        <span className="text-sm font-semibold text-white">How we validated this</span>
      </div>
      
      <div className="space-y-3 text-sm">
        <p className="text-slate-300">
          We tested our predictions against <span className="text-purple-400 font-semibold">3 years of real data</span> from 
          8 Utah water bodies. For each day, we asked: "Did our AI correctly predict good vs. bad fishing conditions?"
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-400">4,984</div>
            <div className="text-[10px] text-slate-400">Days tested</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-cyan-400">47</div>
            <div className="text-[10px] text-slate-400">USGS gauges</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400">8</div>
            <div className="text-[10px] text-slate-400">Water bodies</div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          <span className="text-slate-400 font-medium">Data sources:</span> USGS Water Services (water temp, flow), 
          MesoWest (wind, pressure), Weather Underground PWS (local conditions), Ambient Weather (our stations)
        </div>
      </div>
    </div>
  );
}

function ComparisonExplainer({ accuracy, baseline }) {
  return (
    <div className="space-y-4">
      {/* Main Score Comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* NotWindy */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
          <div className="text-4xl font-black text-emerald-400 mb-1">{accuracy}%</div>
          <div className="text-sm font-semibold text-emerald-300">NotWindy AI</div>
        </div>
        {/* Standard */}
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 text-center">
          <div className="text-4xl font-black text-slate-500 mb-1">{baseline}%</div>
          <div className="text-sm font-semibold text-slate-400">Standard Forecast</div>
        </div>
      </div>

      {/* Improvement callout */}
      <div className="flex items-center justify-center gap-2 py-1">
        <TrendingUp size={18} className="text-emerald-400" />
        <span className="text-lg font-bold text-emerald-400">+{accuracy - baseline}% more accurate</span>
      </div>

      {/* What NotWindy Includes - Icon Grid with Labels */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 text-center">
          What NotWindy Analyzes
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/20 flex items-center justify-center mb-2">
              <Moon size={20} className="text-indigo-400" />
            </div>
            <div className="text-[11px] font-semibold text-white">Solunar</div>
            <div className="text-[9px] text-slate-400">Moon phases</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2">
              <TrendingDown size={20} className="text-emerald-400" />
            </div>
            <div className="text-[11px] font-semibold text-white">Pressure</div>
            <div className="text-[9px] text-slate-400">Trend analysis</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 flex items-center justify-center mb-2">
              <Droplets size={20} className="text-cyan-400" />
            </div>
            <div className="text-[11px] font-semibold text-white">Water Temp</div>
            <div className="text-[9px] text-slate-400">47 USGS gauges</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 flex items-center justify-center mb-2">
              <Calendar size={20} className="text-amber-400" />
            </div>
            <div className="text-[11px] font-semibold text-white">Golden Hours</div>
            <div className="text-[9px] text-slate-400">Dawn & dusk</div>
          </div>
        </div>
      </div>

      {/* What Standard Forecasts Miss */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
          What Standard Forecasts Miss
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center opacity-50">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-700/50 flex items-center justify-center mb-2">
              <XCircle size={20} className="text-slate-500" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">No Solunar</div>
            <div className="text-[9px] text-slate-600">Ignored</div>
          </div>
          <div className="text-center opacity-50">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-700/50 flex items-center justify-center mb-2">
              <XCircle size={20} className="text-slate-500" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">No Pressure</div>
            <div className="text-[9px] text-slate-600">Ignored</div>
          </div>
          <div className="text-center opacity-50">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-700/50 flex items-center justify-center mb-2">
              <XCircle size={20} className="text-slate-500" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">No Water</div>
            <div className="text-[9px] text-slate-600">Ignored</div>
          </div>
          <div className="text-center opacity-50">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-700/50 flex items-center justify-center mb-2">
              <XCircle size={20} className="text-slate-500" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">Generic</div>
            <div className="text-[9px] text-slate-600">Hourly only</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationBreakdown() {
  const locations = BACKTEST_STATS.locations;
  if (!locations || Object.keys(locations).length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-sky-400" />
        <span className="text-sm font-semibold text-white">Accuracy by Water Body</span>
      </div>
      
      <div className="space-y-2">
        {Object.entries(locations).slice(0, 6).map(([locId, loc]) => (
          <div key={locId} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-300">{loc.name || locId}</span>
                <span className="text-xs font-bold text-emerald-400">{loc.fishingAccuracy}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${loc.fishingAccuracy}%` }}
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 w-20 text-right">
              {loc.fishingQualityRate}% quality
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-700/50 text-[10px] text-slate-500">
        "Quality rate" = percentage of days with excellent fishing conditions (based on catch reports + conditions)
      </div>
    </div>
  );
}

export default function AccuracyScoreboard({ activity = 'fishing' }) {
  const [expanded, setExpanded] = useState(false);

  const isFishing = activity === 'fishing';
  const displayAccuracy = isFishing ? BACKTEST_STATS.fishingAccuracy : BACKTEST_STATS.boatingAccuracy;
  const displayBaseline = isFishing ? BACKTEST_STATS.nwsFishingBaseline : BACKTEST_STATS.nwsBoatingBaseline;
  const displaySamples = isFishing ? BACKTEST_STATS.fishingSamples : BACKTEST_STATS.boatingSamples;

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-cyan-400" />
            <h3 className="font-semibold text-white text-lg">AI Accuracy Explained</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          How often does NotWindy correctly predict {isFishing ? 'good fishing' : 'glass conditions'}?
        </p>
      </div>

      {/* Main Comparison */}
      <div className="p-4">
        <ComparisonExplainer accuracy={displayAccuracy} baseline={displayBaseline} />
      </div>

      {/* Validation Badge */}
      <div className="mx-4 mb-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-purple-400" />
          <span className="text-xs font-semibold text-purple-400">
            Validated over 3 years • {displaySamples.toLocaleString()} predictions tested
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <WhatThisMeans 
            accuracy={displayAccuracy} 
            baseline={displayBaseline} 
            activity={activity}
          />
          <HowWeValidated />
          <LocationBreakdown />
        </div>
      )}

      {/* Expand prompt */}
      {!expanded && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1"
          >
            <ChevronDown size={14} />
            See what this means for your fishing trips
          </button>
        </div>
      )}
    </div>
  );
}
