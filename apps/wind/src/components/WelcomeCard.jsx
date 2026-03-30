import { useState, useEffect } from 'react';
import { Wind, Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'uwf_seen_intro';

export default function WelcomeCard() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  function handleDismiss() {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
    }, 300);
  }

  if (!visible) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-[var(--bg-card)] to-cyan-500/5 shadow-lg shadow-sky-500/5 transition-all duration-300 ${
        exiting ? 'opacity-0 max-h-0 mb-0 scale-95' : 'opacity-100 max-h-[500px] mb-6 scale-100'
      }`}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10 p-6 sm:p-8">
        {/* Icon + Headline */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/25 shadow-inner">
            <Wind className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Welcome to UtahWindFinder
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider">
                AI-Powered Forecasting
              </span>
            </div>
          </div>
        </div>

        {/* Body copy */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 max-w-xl">
          Stop guessing, start sending. We use AI-powered forecasting to give you real-time, 
          hyper-local wind and weather data for Utah's best kite, fly, and sail spots.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleDismiss}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold shadow-lg shadow-sky-500/25 hover:shadow-sky-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Let's Go!
          <Wind className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
