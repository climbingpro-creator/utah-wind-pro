import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@utahwind/database';
import {
  Shield, ArrowLeft, CheckCircle, Clock, AlertTriangle, Bug, Lightbulb,
  MessageSquare, ExternalLink, RefreshCw, Trash2, BarChart3, CreditCard,
} from 'lucide-react';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

const TYPE_CONFIG = {
  bug:     { label: 'Bug Report',       icon: Bug,           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  feature: { label: 'Feature Request',  icon: Lightbulb,     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  general: { label: 'General Feedback', icon: MessageSquare,  color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20' },
};

const STATUS_CONFIG = {
  new:      { label: 'New',      color: 'text-sky-400',     bg: 'bg-sky-500/15',     icon: Clock },
  reviewed: { label: 'Reviewed', color: 'text-amber-400',   bg: 'bg-amber-500/15',   icon: AlertTriangle },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: CheckCircle },
};

function QuickLink({ href, icon, label, description }) {
  const LinkIcon = icon;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
        <LinkIcon className="w-5 h-5 text-sky-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-colors shrink-0" />
    </a>
  );
}

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function checkAdmin() {
      if (!supabase) {
        window.location.hash = '';
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (ALLOWED_ADMINS.includes(user?.email?.toLowerCase())) {
          setAuthorized(true);
        } else {
          window.location.hash = '';
        }
      } catch {
        window.location.hash = '';
      }
      setChecking(false);
    }
    checkAdmin();
  }, []);

  const fetchFeedback = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFeedback(data || []);
    } catch (err) {
      console.error('[Admin] fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authorized) fetchFeedback();
  }, [authorized, fetchFeedback]);

  async function updateStatus(id, newStatus) {
    if (!supabase) return;
    const { error } = await supabase
      .from('user_feedback')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) {
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)));
    }
  }

  async function deleteFeedback(id) {
    if (!supabase || !confirm('Delete this feedback permanently?')) return;
    const { error } = await supabase.from('user_feedback').delete().eq('id', id);
    if (!error) setFeedback((prev) => prev.filter((f) => f.id !== id));
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 text-sm">Verifying admin access...</div>
      </div>
    );
  }

  if (!authorized) return null;

  const filtered = filter === 'all' ? feedback : feedback.filter((f) => f.status === filter);
  const counts = {
    all: feedback.length,
    new: feedback.filter((f) => f.status === 'new').length,
    reviewed: feedback.filter((f) => f.status === 'reviewed').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { window.location.hash = ''; }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h1 className="text-lg font-bold">Admin Dashboard</h1>
              </div>
            </div>
            <button
              onClick={fetchFeedback}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'all',      label: 'Total',    count: counts.all,      color: 'text-white',       bg: 'bg-white/[0.04]' },
            { key: 'new',      label: 'New',       count: counts.new,      color: 'text-sky-400',     bg: 'bg-sky-500/10' },
            { key: 'reviewed', label: 'Reviewed',  count: counts.reviewed, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { key: 'resolved', label: 'Resolved',  count: counts.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filter === s.key
                  ? `${s.bg} border-white/20 ring-1 ring-white/10`
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
              }`}
            >
              <p className="text-2xl font-black tabular-nums">{s.count}</p>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${s.color}`}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Links</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickLink
              href="https://vercel.com/dashboard"
              icon={BarChart3}
              label="Vercel Dashboard"
              description="Traffic analytics, deployments, and logs"
            />
            <QuickLink
              href="https://dashboard.stripe.com"
              icon={CreditCard}
              label="Stripe Dashboard"
              description="Payments, subscriptions, and revenue"
            />
          </div>
        </div>

        {/* Feedback List */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            User Feedback ({filtered.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No feedback found{filter !== 'all' ? ` with status "${filter}"` : ''}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.general;
                const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
                const TypeIcon = typeConf.icon;
                const StatusIcon = statusConf.icon;
                const ts = new Date(item.created_at);

                return (
                  <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeConf.bg}`}>
                          <TypeIcon className={`w-3 h-3 ${typeConf.color}`} />
                          <span className={typeConf.color}>{typeConf.label}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConf.bg}`}>
                          <StatusIcon className={`w-3 h-3 ${statusConf.color}`} />
                          <span className={statusConf.color}>{statusConf.label}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed mb-3">{item.message}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {item.user_email || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.status === 'new' && (
                          <button
                            onClick={() => updateStatus(item.id, 'reviewed')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        {item.status !== 'resolved' && (
                          <button
                            onClick={() => updateStatus(item.id, 'resolved')}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          onClick={() => deleteFeedback(item.id)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
