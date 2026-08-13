import { useState } from 'react';
import { Send, Mail, Loader, MessageSquare } from 'lucide-react';

function mailtoHref(email, app, original, reply) {
  const brand = app === 'wind' ? 'LiftForecast' : 'NotWindy';
  const subject = encodeURIComponent(`Re: your ${brand} feedback`);
  const body = encodeURIComponent(
    `${reply}\n\n---\nYour original message:\n${original || ''}`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function FeedbackReplyPanel({ item, getAuthHeader, replyUrl, app = 'water', onUpdated }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.admin_reply || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const hasEmail = !!(item.user_email && item.user_email.trim());
  const alreadyReplied = !!item.admin_reply;

  async function sendReply() {
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    setResult(null);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(replyUrl, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, message, app, markResolved: true }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setResult({ ok: false, error: data.error || `HTTP ${resp.status}` });
      } else {
        setResult({
          ok: true,
          emailed: data.emailed,
          anonymous: data.anonymous,
        });
        onUpdated?.(item.id, {
          admin_reply: message,
          replied_at: data.replied_at,
          replied_by: data.replied_by,
          status: data.status,
        });
        setOpen(false);
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
    }
    setSending(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      {alreadyReplied && !open && (
        <div className="mb-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1">
            Sent {item.replied_at ? new Date(item.replied_at).toLocaleString() : ''}
            {item.replied_by ? ` · ${item.replied_by}` : ''}
          </p>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{item.admin_reply}</p>
        </div>
      )}

      {!open ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setOpen(true)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors inline-flex items-center gap-1.5"
          >
            {hasEmail ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
            {alreadyReplied ? 'Edit / Resend' : hasEmail ? 'Reply' : 'Add Note'}
          </button>
          {hasEmail && (
            <a
              href={mailtoHref(item.user_email, app, item.message, draft)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              Open mail app
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {!hasEmail && (
            <p className="text-[11px] text-amber-400/90">
              This report is anonymous — we can save a note but cannot email them.
            </p>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder={hasEmail ? 'Write a reply…' : 'Internal note…'}
            className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-y min-h-[88px]"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={sendReply}
              disabled={sending || !draft.trim()}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {sending ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {sending ? 'Sending…' : hasEmail ? 'Send Reply' : 'Save Note'}
            </button>
            {hasEmail && (
              <a
                href={mailtoHref(item.user_email, app, item.message, draft)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white"
              >
                Open mail app
              </a>
            )}
            <button
              onClick={() => { setOpen(false); setResult(null); }}
              className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <p className={`text-[11px] mt-2 ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.ok
            ? (result.anonymous ? 'Note saved.' : result.emailed ? 'Reply emailed.' : 'Saved.')
            : result.error}
        </p>
      )}
    </div>
  );
}
