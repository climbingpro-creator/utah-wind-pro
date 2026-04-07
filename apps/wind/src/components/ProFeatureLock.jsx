import React, { useCallback } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * DATA MASKING UTILITIES
 * 
 * When isPro is false, callers should pass DUMMY data into child components
 * rather than real API data. This prevents DOM-snooping where a savvy user
 * inspects elements behind the blur to read actual values.
 * 
 * Usage pattern at the call site:
 * 
 *   const displayData = isPro ? realApiData : maskForecastData(realApiData);
 * 
 *   <ProFeatureLock feature="Smart Hourly Forecast">
 *     <SmartTimeline data={displayData} />
 *   </ProFeatureLock>
 */

export function maskWindSpeed(_real) {
  return Math.round(8 + Math.random() * 14);
}

export function maskDirection(_real) {
  const dirs = [0, 45, 90, 135, 180, 225, 270, 315];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

export function maskTemperature(_real) {
  return Math.round(60 + Math.random() * 25);
}

export function maskForecastData(hourlyData) {
  if (!hourlyData || !Array.isArray(hourlyData)) return hourlyData;
  return hourlyData.map(hour => ({
    ...hour,
    windSpeed: maskWindSpeed(),
    speed: maskWindSpeed(),
    windGust: maskWindSpeed() + 5,
    gust: maskWindSpeed() + 5,
    windDirection: maskDirection(),
    direction: maskDirection(),
    temperature: maskTemperature(),
    score: Math.round(20 + Math.random() * 60),
    confidence: Math.round(40 + Math.random() * 40),
  }));
}

export function maskPrediction(prediction) {
  if (!prediction) return prediction;
  return {
    ...prediction,
    confidence: Math.round(50 + Math.random() * 30),
    wind: {
      ...prediction.wind,
      current: {
        speed: maskWindSpeed(),
        gust: maskWindSpeed() + 4,
        dir: maskDirection(),
      },
    },
    thermalPrediction: prediction.thermalPrediction ? {
      ...prediction.thermalPrediction,
      expectedSpeed: maskWindSpeed(),
      startHour: 10 + Math.floor(Math.random() * 3),
      endHour: 15 + Math.floor(Math.random() * 4),
    } : null,
  };
}

/**
 * ProFeatureLock — Reusable wrapper for premium features.
 * 
 * When the user is NOT Pro:
 * - Children render with heavy blur + pointer-events disabled + user-select none
 * - A glassmorphism overlay with lock icon + CTA covers the content
 * - Clicking anywhere on the overlay fires openPaywall()
 * 
 * When the user IS Pro (or on trial):
 * - Children render normally, zero overhead
 * 
 * Props:
 *   feature    — Short label for the CTA (e.g. "Smart Hourly Forecast")
 *   teaser     — Optional secondary text (e.g. "See exact timing + confidence")
 *   ctaLabel   — Override the button text (default: "Unlock with Pro")
 *   onUpgrade  — Optional override for the click handler (defaults to openPaywall)
 *   children   — The premium component(s)
 *   className  — Additional classes on the outer wrapper
 */
export default function ProFeatureLock({
  feature,
  teaser,
  ctaLabel,
  onUpgrade,
  children,
  className = '',
}) {
  const { isPro, openPaywall } = useAuth();
  const { theme } = useTheme();

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    (onUpgrade || openPaywall)();
  }, [onUpgrade, openPaywall]);

  if (isPro) return children;

  const isDark = theme === 'dark';

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      {/* ── Blurred Content ─────────────────────────────────
          pointer-events-none prevents interaction with underlying components.
          select-none + aria-hidden makes content inaccessible to copy/AT.
          The blur is intentionally heavy (8px) so values are unreadable.
       */}
      <div
        className="pointer-events-none select-none"
        aria-hidden="true"
        style={{
          filter: 'blur(8px)',
          WebkitFilter: 'blur(8px)',
          opacity: 0.5,
        }}
      >
        {children}
      </div>

      {/* ── Full-Coverage Overlay ──────────────────────────
          Captures ALL clicks. Semi-transparent with gradient for legibility.
       */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.70) 50%, rgba(15,23,42,0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(241,245,249,0.75) 50%, rgba(255,255,255,0.88) 100%)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        {/* Decorative glow */}
        <div className="absolute w-32 h-32 rounded-full bg-sky-500/15 blur-3xl" />

        {/* Lock Icon */}
        <div className={`
          relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg
          bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sky-500/30
        `}>
          <Lock className="w-7 h-7 text-white" />
        </div>

        {/* Feature Name */}
        <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {feature || 'Pro Feature'}
        </h4>

        {/* Teaser */}
        {teaser && (
          <p className={`text-sm mb-4 max-w-xs text-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {teaser}
          </p>
        )}

        {/* CTA Button */}
        <span className={`
          inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
          bg-gradient-to-r from-sky-500 to-cyan-500 text-white
          shadow-lg shadow-sky-500/25
          hover:shadow-xl hover:shadow-sky-500/30
          transition-all duration-200 hover:scale-105
        `}>
          <Sparkles className="w-4 h-4" />
          {ctaLabel || 'Unlock with Pro'}
        </span>

        <p className={`text-[10px] mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          7-day free trial • Cancel anytime
        </p>
      </div>
    </div>
  );
}
