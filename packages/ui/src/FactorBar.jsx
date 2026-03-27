import { createElement } from 'react';

export default function FactorBar({ label, value, detail, icon }) {
  const getColor = (v) => {
    if (v >= 70) return 'bg-emerald-500';
    if (v >= 50) return 'bg-amber-500';
    if (v >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
          {icon ? createElement(icon, { className: 'w-3 h-3' }) : null}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)] capitalize">{detail || ''}</span>
          <span className="text-[var(--text-primary)] font-semibold w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
