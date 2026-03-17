import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DISCLAIMER_KEY = 'utahwind_disclaimer_accepted';
const DISCLAIMER_VERSION = '1';

const ACTIVITY_WARNINGS = {
  paragliding: {
    title: 'Paragliding Safety Notice',
    warnings: [
      'Always check with experienced local pilots before flying an unfamiliar site.',
      'This app provides wind data, not launch decisions — you are the pilot in command.',
      'Never fly beyond your rating or comfort level regardless of conditions shown.',
      'UHGPGA rules and P2+ rating requirements apply at all Point of the Mountain sites.',
    ],
  },
  boating: {
    title: 'Boating Safety Notice',
    warnings: [
      'Always wear a USCG-approved life jacket. Utah law requires one per person.',
      'Utah Lake conditions can change rapidly — monitor weather continuously.',
      'Cold water shock is a risk year-round in Utah reservoirs.',
      'File a float plan and tell someone your expected return time.',
    ],
  },
  kiting: {
    title: 'Kiteboarding Safety Notice',
    warnings: [
      'Never kite alone. Always have a buddy or spotter on the beach.',
      'Check gear thoroughly before each session — lines, bar, safety systems.',
      'Know your upwind obstacles and downwind hazards at every launch site.',
      'Offshore wind at Utah Lake means rescue may be hours away.',
    ],
  },
};

export default function SafetyDisclaimer({ activity, isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DISCLAIMER_KEY);
    if (stored === DISCLAIMER_VERSION) setAccepted(true);
  }, []);

  if (!isOpen || accepted) return null;

  const config = ACTIVITY_WARNINGS[activity] || {
    title: 'Outdoor Safety Notice',
    warnings: [
      'Weather conditions can change rapidly. Always monitor conditions.',
      'This app provides data-driven forecasts, not safety guarantees.',
      'You assume all risk for your outdoor activities.',
    ],
  };

  function handleAccept() {
    localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION);
    setAccepted(true);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{config.title}</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Please read before continuing</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {config.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                  {i + 1}
                </span>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{w}</p>
              </div>
            ))}
          </div>

          <div className={`rounded-lg p-3 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <strong>Disclaimer:</strong> Utah Wind Pro provides weather data and AI-driven forecasts
            for informational purposes only. Forecasts are not guarantees. You are solely responsible
            for assessing conditions and making decisions about your safety. By using this app, you
            accept all risks associated with outdoor activities.
          </div>
        </div>

        <div className={`p-4 border-t flex gap-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            I Understand — Continue
          </button>
        </div>
      </div>
    </div>
  );
}
