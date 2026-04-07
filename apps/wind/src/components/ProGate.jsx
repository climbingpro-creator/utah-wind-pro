import { Lock, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProFeatureLock from './ProFeatureLock';

/**
 * Wraps a Pro-only feature. Free users see a blurred preview
 * with an "Unlock Pro" overlay. Pro/trial users see the content normally.
 *
 * Now delegates to ProFeatureLock for the card-level gate, gaining:
 * - Heavy blur (8px) + pointer-events-none + user-select-none
 * - Full-coverage glassmorphism overlay that captures all clicks
 * - Gradient CTA with lock icon
 *
 * Props:
 *  - feature: short label shown on the lock overlay
 *  - preview: optional teaser text shown to free users
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
    <ProFeatureLock
      feature={feature}
      teaser={preview}
    >
      {children}
    </ProFeatureLock>
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
