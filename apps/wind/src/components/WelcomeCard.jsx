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
      className={`relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-[var(--bg-card)] to-cyan-500/5 transition-all duration-300 ${
        exiting ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-[500px] mb-6'
      }`}
    >
      {/* Close button — 44x44 minimum touch target */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 bg-white/5 active:bg-white/15 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 p-5">
        {/* Icon + Headline */}
        <div className="flex items-start gap-3 mb-3 pr-10">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/25 flex-shrink-0">
            <Wind className="w-5 h-5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-white tracking-tight leading-tight">
              Welcome to UtahWindFinder
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider">
                AI-Powered Forecasting
              </span>
            </div>
          </div>
        </div>

        {/* Body copy — compact for mobile */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Stop guessing, start sending. Real-time, hyper-local wind data for Utah's best kite, fly, and sail spots.
        </p>

        {/* CTA Button — 44px+ height, full width on mobile for easy thumb reach */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-xl bg-sky-500 active:bg-sky-600 text-white text-sm font-bold transition-colors"
        >
          Let's Go!
          <Wind className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
