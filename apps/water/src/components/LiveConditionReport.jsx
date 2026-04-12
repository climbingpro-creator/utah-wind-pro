import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const OPTIONS = [
  { id: 'lighter', emoji: '📉', label: 'Lighter' },
  { id: 'spot-on', emoji: '🎯', label: 'Spot On' },
  { id: 'stronger', emoji: '📈', label: 'Stronger' },
];

export default function LiveConditionReport({ locationId }) {
  const [submitted, setSubmitted] = useState(false);

  function handleVote(optionId) {
    setSubmitted(true);
    try {
      fetch('/api/community/post?action=condition-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, vote: optionId, ts: Date.now() }),
      }).catch(() => {});
    } catch { /* fire-and-forget */ }
  }

  return (
    <div className="card">
      <div
        className="transition-all duration-500 ease-in-out"
        style={{ opacity: 1 }}
      >
        {!submitted ? (
          <div className="animate-in fade-in duration-300">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] mb-2.5 tracking-wide">
              Are the live conditions accurate?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-slate-700/60 bg-slate-800/40 text-xs font-semibold text-[var(--text-secondary)] hover:bg-slate-700/60 hover:border-slate-500/60 hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-sm">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2.5 animate-in fade-in duration-500">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-400">
              Report received! Thanks for helping train the AI.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
