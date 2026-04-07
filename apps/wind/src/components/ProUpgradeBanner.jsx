/**
 * ProUpgradeBanner
 * 
 * Beautiful gradient paywall component placed strategically after
 * the trust-building components (Accuracy Scoreboard).
 * 
 * Copy: "Unlock AI Micro-Windows, Thermal Confidence Scores, 
 * and Shadow Mode Sensors to never miss a session."
 */

import React from 'react';
import { Zap, Lock, Sparkles, Clock, Target, Radio } from 'lucide-react';

const FEATURES = [
  { icon: Clock, label: 'AI Micro-Windows', desc: 'Precision timing down to 15-min slots' },
  { icon: Target, label: 'Thermal Confidence', desc: 'Probability scores with physics backing' },
  { icon: Radio, label: 'Shadow Sensors', desc: 'Free PWS network when paid stations fail' },
];

export default function ProUpgradeBanner({ onUpgrade }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-sky-600/20 to-cyan-600/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      
      {/* Animated glow effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Unlock Pro Intelligence</h3>
            <p className="text-sm text-white/60">Never miss another session</p>
          </div>
        </div>

        {/* Main Copy */}
        <p className="text-white/80 text-sm leading-relaxed mb-6">
          Get <span className="font-bold text-cyan-300">AI Micro-Windows</span>, {' '}
          <span className="font-bold text-purple-300">Thermal Confidence Scores</span>, and {' '}
          <span className="font-bold text-sky-300">Shadow Mode Sensors</span> to predict 
          conditions with 87% accuracy — 29 points ahead of NWS.
        </p>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {FEATURES.map((feature) => (
            <div 
              key={feature.label}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{feature.label}</div>
                <div className="text-[10px] text-white/50 leading-tight">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onUpgrade}
          className="group w-full flex items-center justify-center gap-2.5 min-h-[52px] px-6 py-3.5 rounded-xl 
            bg-gradient-to-r from-purple-500 via-sky-500 to-cyan-500 
            text-white font-bold text-sm
            shadow-lg shadow-purple-500/25
            hover:shadow-xl hover:shadow-purple-500/30
            active:scale-[0.98] transition-all duration-200"
        >
          <Lock className="w-4 h-4 group-hover:hidden" />
          <Zap className="w-4 h-4 hidden group-hover:block" />
          <span>Unlock Pro — Start Free Trial</span>
        </button>

        {/* Trust Badge */}
        <p className="text-center text-[10px] text-white/40 mt-3">
          7-day free trial • Cancel anytime • Trained on 3 years of Utah data
        </p>
      </div>
    </div>
  );
}
