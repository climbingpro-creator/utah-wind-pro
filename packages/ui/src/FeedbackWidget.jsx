import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, CheckCircle } from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
];

export function FeedbackWidget({ supabase, userEmail }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [status, setStatus] = useState('idle');
  const panelRef = useRef(null);

  useEffect(() => {
    if (userEmail) setEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('sending');
    try {
      if (supabase) {
        const { error } = await supabase.from('user_feedback').insert({
          type,
          message: message.trim(),
          user_email: email.trim() || null,
          status: 'new',
        });
        if (error) throw error;
      }
      setStatus('sent');
      setTimeout(() => {
        setOpen(false);
        setMessage('');
        setType('general');
        setStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('[FeedbackWidget]', err?.message || err?.details || JSON.stringify(err));
      setStatus('error');
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999]" ref={panelRef}>
      {open && (
        <div className="absolute bottom-14 right-0 w-80 rounded-2xl border border-white/[0.08] bg-[#0f1724]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white">Send Feedback</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">Thank you!</p>
              <p className="text-xs text-slate-400 text-center">Your feedback has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
              {/* Type */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Type</label>
                <div className="flex gap-1.5">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-all ${
                        type === t.value
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={4}
                  required
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'sending' || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {status === 'sending' ? 'Sending...' : 'Submit Feedback'}
              </button>

              {status === 'error' && (
                <p className="text-[11px] text-red-400 text-center">Something went wrong. Please try again.</p>
              )}

              {!supabase && (
                <p className="text-[10px] text-amber-400/70 text-center">Database not configured — feedback will not be saved.</p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          open
            ? 'bg-slate-700 rotate-90 scale-95'
            : 'bg-sky-500 hover:bg-sky-600 hover:scale-110'
        }`}
        aria-label="Send feedback"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}
