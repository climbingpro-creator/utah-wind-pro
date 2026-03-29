import React from 'react';

/**
 * ModuleLoader — Premium loading skeleton for lazy-loaded modules.
 *
 * @param {Object} props
 * @param {string} [props.label] — Optional label for what's loading
 * @param {string} [props.className] — Additional classes for the container
 * @param {'card'|'section'|'fullscreen'} [props.variant] — Visual variant
 */
export function ModuleLoader({ label, className = '', variant = 'card' }) {
  const base = 'animate-pulse rounded-xl border border-[var(--border-color,#1e293b)] bg-[var(--bg-card,#0f172a)]';

  if (variant === 'fullscreen') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-4 ${className}`}>
        <div className="w-8 h-8 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
        {label && <p className="text-sm font-medium text-[var(--text-tertiary,#64748b)]">{label}</p>}
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div className={`${base} p-6 space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 rounded bg-white/[0.06]" />
            <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-white/[0.04]" />
          <div className="h-2.5 w-4/5 rounded bg-white/[0.04]" />
          <div className="h-2.5 w-3/5 rounded bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${base} flex items-center justify-center p-12 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
        <span className="text-sm font-medium text-[var(--text-tertiary,#64748b)]">
          {label || 'Loading interface...'}
        </span>
      </div>
    </div>
  );
}
