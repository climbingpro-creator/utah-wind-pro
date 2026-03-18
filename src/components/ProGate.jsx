import { Lock, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Wraps a Pro-only feature. Free users see a blurred preview
 * with an "Unlock Pro" overlay. Pro/trial users see the content normally.
 *
 * Props:
 *  - feature: short label shown on the lock overlay (e.g. "Thermal Predictions")
 *  - preview: optional teaser text shown to free users (e.g. "Confidence: 78%")
 *  - children: the actual Pro content
 *  - inline: if true, render as inline badge instead of card overlay
 */
export default function ProGate({ feature, preview, children, inline = false }) {
  const { isPro, openPaywall } = useAuth();
  const { theme } = useTheme();

  if (isPro) return children;

  const dark = theme === 'dark';

  if (inline) {
    return (
      <button
        onClick={openPaywall}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
          dark
            ? 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
            : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
        }`}
      >
        <Lock className="w-3 h-3" />
        PRO
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="filter blur-[6px] opacity-50 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <button
          onClick={openPaywall}
          className={`group flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border transition-all hover:scale-105 ${
            dark
              ? 'bg-slate-900/90 border-sky-500/30 hover:border-sky-500/60 shadow-lg shadow-sky-500/10'
              : 'bg-white/90 border-sky-200 hover:border-sky-400 shadow-lg shadow-sky-500/10'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {feature}
            </p>
            {preview && (
              <p className={`text-xs mt-0.5 ${dark ? 'text-sky-400' : 'text-sky-600'}`}>
                {preview}
              </p>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-sky-500 group-hover:text-sky-400 transition-colors">
            <Sparkles className="w-3 h-3" />
            Unlock with Pro
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * Small badge that appears in section headers next to Pro-only features.
 * Clicking it opens the paywall.
 */
export function ProBadge() {
  const { isPro, openPaywall } = useAuth();
  const { theme } = useTheme();

  if (isPro) return null;

  const dark = theme === 'dark';
  return (
    <button
      onClick={openPaywall}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide transition-colors ${
        dark
          ? 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/25'
          : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
      }`}
    >
      <Crown className="w-2.5 h-2.5" />
      Pro
    </button>
  );
}

