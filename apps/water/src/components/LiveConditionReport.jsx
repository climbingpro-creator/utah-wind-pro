import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@utahwind/database';

const OPTIONS = [
  { id: 'lighter', emoji: '📉', label: 'Lighter' },
  { id: 'spot-on', emoji: '🎯', label: 'Spot On' },
  { id: 'stronger', emoji: '📈', label: 'Stronger' },
];

export default function LiveConditionReport({ locationId }) {
  const [submitted, setSubmitted] = useState(false);
  const [tallies, setTallies] = useState(null);

  useEffect(() => {
    if (!locationId) return;
    setSubmitted(false);
    setTallies(null);
    fetch(`/api/community/condition-report?locationId=${encodeURIComponent(locationId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total) setTallies(d); })
      .catch(() => {});
  }, [locationId]);

  async function handleVote(optionId) {
    setSubmitted(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
        }
      }
      fetch('/api/community/condition-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ locationId, vote: optionId }),
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
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-wide">
                Are the live conditions accurate?
              </p>
              {tallies && tallies.total > 0 && (
                <span className="text-[9px] font-medium text-[var(--text-tertiary)]">
                  {tallies.total} report{tallies.total !== 1 ? 's' : ''} today
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(opt => {
                const count = tallies?.[opt.id] || 0;
                const pct = tallies?.total ? Math.round((count / tallies.total) * 100) : 0;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border border-slate-700/60 bg-slate-800/40 text-xs font-semibold text-[var(--text-secondary)] hover:bg-slate-700/60 hover:border-slate-500/60 hover:text-white active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </div>
                    {tallies?.total > 0 && (
                      <span className="text-[8px] font-medium text-[var(--text-tertiary)]">{pct}%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-400">
              Report received! Thanks for helping train the AI.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
