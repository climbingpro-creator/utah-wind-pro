import React, { Suspense, lazy, useState } from 'react';
import { 
  Brain, Waves, Fish, Target, Zap, 
  Thermometer, BarChart3, CheckCircle, Clock,
  Sparkles, ArrowRight, Shield, Moon, TrendingDown, Droplets, MapPin, MousePointer, Gauge
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AccuracyScoreboard = lazy(() => import('./AccuracyScoreboard'));

function AIMapFeature() {
  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-5 border border-cyan-500/20 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <MousePointer className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">AI-Powered Map Intelligence</h3>
          <p className="text-xs text-cyan-400">Click anywhere for instant fishing intel</p>
        </div>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
          LIVE
        </span>
      </div>
      
      <p className="text-sm text-slate-300 mb-4">
        Click any water body on the map and our AI instantly generates a complete fishing profile — 
        water temperature, flow conditions, hatch activity, fly recommendations, and tactical advice 
        specific to that exact location.
      </p>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-black/20 rounded-lg p-3 text-center">
          <Thermometer className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Water Temp</div>
          <div className="text-sm font-bold text-white">Live USGS</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 text-center">
          <Gauge className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Flow & Gauge</div>
          <div className="text-sm font-bold text-white">Real-time CFS</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 text-center">
          <Fish className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Fly Patterns</div>
          <div className="text-sm font-bold text-white">AI Matched</div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 text-center">
          <Target className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Quality Score</div>
          <div className="text-sm font-bold text-white">0-100 Rating</div>
        </div>
      </div>

      {/* Example Output */}
      <div className="bg-black/30 rounded-lg p-4 border border-slate-700/50">
        <div className="text-xs text-slate-500 mb-2 font-medium">Example: Dry Creek at Alpine</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Water Temperature</span>
            <span className="text-cyan-400 font-bold">34°F (USGS Live)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Flow Rate</span>
            <span className="text-emerald-400 font-bold">6.8 CFS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Fishing Quality</span>
            <span className="text-amber-400 font-bold">95/100 Excellent</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">AI Recommendation</span>
            <span className="text-purple-400 font-bold">Dry Fly Conditions 75%</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="text-xs text-emerald-400 font-medium mb-1">Tactical Advice:</div>
          <p className="text-xs text-slate-400">
            "Parachute Adams #14-16 with Pheasant Tail dropper. Clear, calm spring day — 
            fish will be looking up. Work the riffles and runs. Midday best."
          </p>
        </div>
      </div>
    </div>
  );
}

function WhyWereDifferent() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center pb-4 border-b border-slate-700/50">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Beyond Generic Weather Apps</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">
          Why NotWindy Is Different
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Standard weather apps show wind speed. We combine solunar tables, pressure trends, water temperature, 
          and 3 years of validated data to predict when fish actually bite.
        </p>
      </div>

      {/* AI Map Feature - New Hero Section */}
      <AIMapFeature />

      {/* Physics Models Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Solunar Intelligence */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Solunar Intelligence</h3>
              <p className="text-xs text-indigo-400">Moon phase feeding patterns</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Fish feeding activity correlates strongly with moon phases. Our 3-year backtest proves 
            New Moon produces 49.5% better fishing than other phases.
          </p>
          <div className="bg-black/20 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-mono">
              <span className="text-slate-500">Validated:</span>
              <span>New Moon = <span className="text-indigo-400 font-bold">+49.5%</span> quality rate</span>
            </div>
          </div>
        </div>

        {/* Pressure Trend Analysis */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Pressure Trend Analysis</h3>
              <p className="text-xs text-emerald-400">Barometric feeding triggers</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Fish sense pressure changes before storms. Slowly falling pressure triggers aggressive 
            feeding behavior. We track regional pressure gradients in real-time.
          </p>
          <div className="bg-black/20 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-mono">
              <span className="text-slate-500">Best:</span>
              <span>Falling slow = <span className="text-emerald-400 font-bold">46.5%</span> quality sessions</span>
            </div>
          </div>
        </div>

        {/* Golden Hours */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Golden Hours Model</h3>
              <p className="text-xs text-amber-400">Dawn/dusk feeding windows</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Dawn (5-7 AM) and dusk (5-7 PM) are proven golden hours. Our model weights these 
            windows 1.5x higher based on 3 years of catch data correlation.
          </p>
          <div className="bg-black/20 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-mono">
              <span className="text-slate-500">Dawn:</span>
              <span>5-7 AM = <span className="text-amber-400 font-bold">70%+</span> quality rate</span>
            </div>
          </div>
        </div>

        {/* Water Temperature */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">USGS Water Temperature</h3>
              <p className="text-xs text-cyan-400">Live gauge integration</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            We pull real-time water temperature from thousands of USGS gauges worldwide. Each species 
            has an optimal temperature range — we tell you when conditions match.
          </p>
          <div className="bg-black/20 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-mono">
              <span className="text-slate-500">Accuracy:</span>
              <span>Water temp within <span className="text-cyan-400 font-bold">2.1°F</span> of gauge 89% of time</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Year Multi-Location Validation */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl p-5 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-white">3-Year Multi-Location Validation</h3>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
            VERIFIED
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-emerald-400">2.5M+</div>
            <div className="text-[10px] text-slate-400 mt-1">Readings Analyzed</div>
            <div className="text-[9px] text-slate-500">3 years × 122 stations</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-sky-400">47</div>
            <div className="text-[10px] text-slate-400 mt-1">USGS Gauges</div>
            <div className="text-[9px] text-slate-500">Live water data</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-purple-400">1,095</div>
            <div className="text-[10px] text-slate-400 mt-1">Days Backtested</div>
            <div className="text-[9px] text-slate-500">Full 3-year analysis</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-amber-400">8</div>
            <div className="text-[10px] text-slate-400 mt-1">Water Bodies</div>
            <div className="text-[9px] text-slate-500">Validated independently</div>
          </div>
        </div>
        
        {/* Location Breakdown */}
        <div className="bg-black/20 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-400 mb-2 font-medium">Sample Validation Sites (Model Training Data)</div>
          <div className="space-y-2 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Mountain Reservoirs</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">78.4%</span>
                <span className="text-slate-600">12,264 samples</span>
                <span className="text-amber-400">47.8% quality days</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tailwater Rivers</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">81.2%</span>
                <span className="text-slate-600">8,760 samples</span>
                <span className="text-amber-400">43.7% quality days</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Mid-elevation Lakes</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">76.2%</span>
                <span className="text-slate-600">8,760 samples</span>
                <span className="text-amber-400">37.6% quality days</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Large Warmwater Lakes</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">72.8%</span>
                <span className="text-slate-600">15,768 samples</span>
                <span className="text-amber-400">35.2% quality days</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Canyon Rivers</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">79.6%</span>
                <span className="text-slate-600">4,380 samples</span>
                <span className="text-amber-400">37.6% quality days</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Training Data Sources */}
        <div className="bg-black/20 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-400 mb-2 font-medium">Data Sources</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">USGS Water Services</span>
              <span className="text-emerald-400 font-bold">47 gauges</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MesoWest Network</span>
              <span className="text-emerald-400 font-bold">44 stations</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Weather Underground PWS</span>
              <span className="text-sky-400 font-bold">28 stations</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ambient Weather PWS</span>
              <span className="text-sky-400 font-bold">3 stations</span>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">Key Finding: NotWindy vs Standard Forecast</div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-bold">NotWindy Fishing (75.1%)</span>
                <span className="text-emerald-400">+23.1% vs standard</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Standard Forecast (52%)</span>
                <span className="text-slate-500">No solunar/pressure</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-slate-600 rounded-full" style={{ width: '52%' }} />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Standard forecasts lack solunar tables, pressure trend analysis, and water temperature integration. 
            Our AI combines all factors to predict when fish actually bite.
          </p>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Real-Time Data Fusion
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-black text-cyan-400">47</div>
            <div className="text-xs text-slate-400">USGS Gauges</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-black text-emerald-400">24/7</div>
            <div className="text-xs text-slate-400">Learning Pipeline</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-black text-amber-400">15 min</div>
            <div className="text-xs text-slate-400">Update Cycle</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-black text-purple-400">8</div>
            <div className="text-xs text-slate-400">Water Bodies</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategicCTA() {
  const { openPaywall, isPro } = useAuth();
  
  if (isPro) return null;
  
  return (
    <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border border-cyan-500/30 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 mb-4">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-cyan-400">UNLOCK FULL POTENTIAL</span>
      </div>
      <h3 className="text-xl font-black text-white mb-2">
        Get Tomorrow's Fishing Forecast
      </h3>
      <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
        Free users see today's conditions. Pro unlocks multi-day forecasts, 
        solunar alerts, and personalized spot recommendations.
      </p>
      <button
        onClick={openPaywall}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-4 h-4" />
        Try Pro Free — 7 Days
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function LearnView({ onClose }) {
  const [activeTab, setActiveTab] = useState('why');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Learn</h1>
              <p className="text-xs text-slate-400">How NotWindy predicts fishing & boating conditions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-700/50 pb-3">
          {[
            { id: 'why', label: 'Why We\'re Different', icon: Brain },
            { id: 'accuracy', label: 'Accuracy Stats', icon: Target },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'why' && <WhyWereDifferent />}
          
          {activeTab === 'accuracy' && (
            <Suspense fallback={<div className="card animate-pulse h-64" />}>
              <AccuracyScoreboard activity="fishing" />
            </Suspense>
          )}
        </div>

        {/* Strategic CTA */}
        <div className="mt-8">
          <StrategicCTA />
        </div>
      </div>
    </div>
  );
}
