import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@utahwind/database';
import {
  Shield, ArrowLeft, CheckCircle, Clock, AlertTriangle, Bug, Lightbulb,
  MessageSquare, ExternalLink, RefreshCw, Trash2, BarChart3, CreditCard,
  Users, TrendingUp, TrendingDown, Zap, Map, Eye, DollarSign, Activity,
  Globe, Layers, Wind, Fish, Minus, Bell, Phone,
} from 'lucide-react';

const ALLOWED_ADMINS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_WIND_APP_URL || '';

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
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
        <LinkIcon className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
    </a>
  );
}

function KPICard({ icon, label, value, sub, trend, color = 'cyan' }) {
  const IconComp = icon;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-500';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
          <IconComp className={`w-4.5 h-4.5 text-${color}-400`} />
        </div>
        {trend != null && (
          <div className={`flex items-center gap-1 text-[11px] font-bold ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color = 'cyan' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full bg-${color}-500/60`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EngagementTimeline({ eventsByDay }) {
  const days = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().substring(0, 10);
      const dayData = eventsByDay?.[key] || { views: 0, pins: 0, bio: 0, total: 0 };
      result.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...dayData,
      });
    }
    return result;
  }, [eventsByDay]);

  const maxTotal = Math.max(1, ...days.map((d) => d.total));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        14-Day Engagement
      </h3>
      <div className="flex items-end gap-1 h-24">
        {days.map((d) => {
          const h = Math.max(4, (d.total / maxTotal) * 100);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-sm bg-cyan-500/40 hover:bg-cyan-500/70 transition-colors cursor-default"
                style={{ height: `${h}%` }}
                title={`${d.label}: ${d.views} views, ${d.pins} pins, ${d.bio} AI calls`}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-800 border border-white/10 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.total} events
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[9px] text-slate-600">{days[0]?.label}</span>
        <span className="text-[9px] text-slate-600">{days[days.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [usersData, setUsersData] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      if (!supabase) { window.location.hash = ''; return; }
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

  const getAuthHeader = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_ORIGIN}/api/admin/analytics`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setAnalytics(data);
    } catch (err) {
      console.error('[Admin] analytics error:', err);
      setAnalyticsError(err.message);
    }
    setAnalyticsLoading(false);
  }, [getAuthHeader]);

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

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_ORIGIN}/api/admin/users`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setUsersData(data);
      }
    } catch (err) {
      console.warn('[Admin] users fetch error:', err);
    }
    setUsersLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    if (authorized) {
      fetchAnalytics();
      fetchFeedback();
      fetchUsers();
    }
  }, [authorized, fetchAnalytics, fetchFeedback, fetchUsers]);

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

  const u = analytics?.users;
  const e = analytics?.engagement;
  const f = analytics?.financials;
  const fb = analytics?.feedback;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: `Users${usersData?.summary ? ` (${usersData.summary.total})` : ''}`, icon: Users },
    { id: 'engagement', label: 'Engagement', icon: Activity },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'feedback', label: `Feedback${fb?.new ? ` (${fb.new})` : ''}`, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/[0.06] bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => { window.location.hash = ''; }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h1 className="text-lg font-bold">Command Center</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Water</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analytics?.generatedAt && (
                <span className="text-[10px] text-slate-600 hidden sm:block">
                  Updated {new Date(analytics.generatedAt).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => { fetchAnalytics(); fetchFeedback(); }}
                disabled={analyticsLoading || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {analyticsError && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
            <strong>Analytics Error:</strong> {analyticsError}. Feedback data still available below.
          </div>
        )}

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard icon={Users} label="Total Users" value={u?.total ?? '—'} trend={u?.growthRate} color="cyan" sub={`+${u?.recentSignups ?? 0} last 30d`} />
              <KPICard icon={Zap} label="Pro Users" value={u?.pro ?? '—'} color="violet" sub={`${u?.free ?? 0} free`} />
              <KPICard icon={DollarSign} label="Revenue (30d)" value={`$${f?.monthlyRevenue ?? '0'}`} color="emerald" sub={f?.pricePerUser} />
              <KPICard icon={Eye} label="Page Views" value={e?.pageViews30d ?? '—'} color="cyan" sub={`${e?.windViews30d ?? 0} wind / ${e?.waterViews30d ?? 0} water`} />
              <KPICard icon={Map} label="Pin Drops" value={e?.mapClicks30d ?? '—'} color="amber" sub={`${e?.bioApiCalls30d ?? 0} AI calls`} />
              <KPICard icon={Activity} label="Retention" value={`${u?.retentionRate ?? 0}%`} color="emerald" sub={`${u?.uniqueActiveUsers30d ?? 0} active / ${u?.total ?? 0}`} />
            </div>

            {e?.eventsByDay && <EngagementTimeline eventsByDay={e.eventsByDay} />}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Activity Types (30d Sessions)
                </h3>
                {e?.activityBreakdown && Object.keys(e.activityBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(e.activityBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const maxCount = Math.max(...Object.values(e.activityBreakdown));
                        return (
                          <div key={type}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold text-slate-300 capitalize">{type}</span>
                              <span className="text-xs font-bold text-white tabular-nums">{count}</span>
                            </div>
                            <MiniBar value={count} max={maxCount} color="violet" />
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">No session data yet</p>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Platform Health
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Sessions (all time)', value: e?.totalSessions ?? '—', icon: Activity },
                    { label: 'Sessions (30d)', value: e?.sessions30d ?? '—', icon: Fish },
                    { label: 'Total Events Tracked', value: e?.totalEvents ?? '—', icon: Zap },
                    { label: 'Map Interactions', value: e?.mapInteractions30d ?? '—', icon: Map },
                    { label: 'Feedback Items', value: fb?.total ?? '—', icon: MessageSquare },
                    { label: 'Unresolved Feedback', value: (fb?.new ?? 0) + (fb?.reviewed ?? 0), icon: AlertTriangle },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ItemIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs text-slate-400">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Links</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <QuickLink href="https://vercel.com/dashboard" icon={BarChart3} label="Vercel" description="Deployments & logs" />
                <QuickLink href="https://dashboard.stripe.com" icon={CreditCard} label="Stripe" description="Payments & subscriptions" />
                <QuickLink href="https://supabase.com/dashboard" icon={Layers} label="Supabase" description="Database & auth" />
                <QuickLink href="https://aistudio.google.com" icon={Zap} label="Google AI" description="Gemini API usage" />
              </div>
            </div>
          </div>
        )}

        {/* ═══════ USERS TAB ═══════ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {usersLoading && !usersData && (
              <div className="text-center py-12 text-slate-500 animate-pulse">Loading users...</div>
            )}
            {usersData && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <KPICard icon={Users} label="Total Users" value={usersData.summary.total} color="cyan" />
                  <KPICard icon={Zap} label="Pro" value={usersData.summary.pro} color="violet"
                    sub={`${usersData.summary.total > 0 ? ((usersData.summary.pro / usersData.summary.total) * 100).toFixed(0) : 0}% conversion`} />
                  <KPICard icon={Activity} label="Active 7d" value={usersData.summary.active7d} color="emerald"
                    sub={`${usersData.summary.active30d} in 30d`} />
                  <KPICard icon={Bell} label="Push Enabled" value={usersData.summary.withPush} color="amber" />
                  <KPICard icon={Phone} label="SMS Verified" value={usersData.summary.withSms} color="cyan" />
                  <KPICard icon={Fish} label="With Sessions" value={usersData.users.filter(u => u.sessionCount > 0).length} color="cyan" />
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      All Users
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                        placeholder="Search email..."
                        className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 w-48"
                      />
                      <button
                        onClick={fetchUsers}
                        disabled={usersLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-white/[0.06]">
                          <th className="pb-2 pr-4 font-semibold">Email</th>
                          <th className="pb-2 pr-4 font-semibold">Tier</th>
                          <th className="pb-2 pr-4 font-semibold">Signed Up</th>
                          <th className="pb-2 pr-4 font-semibold">Last Active</th>
                          <th className="pb-2 pr-4 font-semibold">Sessions</th>
                          <th className="pb-2 pr-4 font-semibold">Alerts</th>
                          <th className="pb-2 font-semibold">Activities</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {usersData.users
                          .filter(u => !usersSearch || u.email?.toLowerCase().includes(usersSearch.toLowerCase()))
                          .map(user => {
                            const daysSinceActive = user.lastSignIn
                              ? Math.floor((Date.now() - new Date(user.lastSignIn).getTime()) / 86400000)
                              : null;
                            return (
                              <tr key={user.id} className="hover:bg-white/[0.02]">
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                                      daysSinceActive != null && daysSinceActive <= 7 ? 'bg-emerald-400'
                                      : daysSinceActive != null && daysSinceActive <= 30 ? 'bg-amber-400'
                                      : 'bg-slate-600'
                                    }`} />
                                    <span className="text-white font-medium truncate max-w-[200px]">{user.email}</span>
                                    {!user.confirmed && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">unverified</span>}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    user.tier === 'pro' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-500/15 text-slate-400'
                                  }`}>
                                    {user.tier === 'pro' ? 'PRO' : 'FREE'}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-slate-400 tabular-nums">
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 pr-4 tabular-nums">
                                  {daysSinceActive != null ? (
                                    <span className={
                                      daysSinceActive <= 1 ? 'text-emerald-400 font-bold' :
                                      daysSinceActive <= 7 ? 'text-emerald-400' :
                                      daysSinceActive <= 30 ? 'text-amber-400' : 'text-slate-500'
                                    }>
                                      {daysSinceActive === 0 ? 'Today' : daysSinceActive === 1 ? 'Yesterday' : `${daysSinceActive}d ago`}
                                    </span>
                                  ) : <span className="text-slate-600">Never</span>}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 tabular-nums font-bold">
                                  {user.sessionCount || '—'}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-1">
                                    {user.hasPush && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">Push</span>}
                                    {user.hasSms && <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400">SMS</span>}
                                    {!user.hasPush && !user.hasSms && <span className="text-slate-600">—</span>}
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {user.activities.length > 0 ? user.activities.slice(0, 3).map(a => (
                                      <span key={a} className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{a}</span>
                                    )) : <span className="text-slate-600">—</span>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════ ENGAGEMENT TAB ═══════ */}
        {activeTab === 'engagement' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={Eye} label="Page Views (30d)" value={e?.pageViews30d ?? '—'} color="cyan" />
              <KPICard icon={Map} label="Pin Drops (30d)" value={e?.mapClicks30d ?? '—'} color="amber" />
              <KPICard icon={Fish} label="Bio API Calls (30d)" value={e?.bioApiCalls30d ?? '—'} color="emerald" />
              <KPICard icon={Activity} label="Total Events" value={e?.totalEvents ?? '—'} color="violet" />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Traffic by App (30d Page Views)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-sky-500/5 border border-sky-500/10">
                  <Wind className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white tabular-nums">{e?.windViews30d ?? 0}</p>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">UtahWindFinder</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <Fish className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white tabular-nums">{e?.waterViews30d ?? 0}</p>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">NotWindy</p>
                </div>
              </div>
            </div>

            {e?.eventsByDay && <EngagementTimeline eventsByDay={e.eventsByDay} />}

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                User Retention & Growth
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400 tabular-nums">{u?.retentionRate ?? 0}%</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">30d Retention</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-cyan-400 tabular-nums">{u?.uniqueActiveUsers30d ?? 0}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Active Users</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-violet-400 tabular-nums">+{u?.recentSignups ?? 0}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">New (30d)</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-black tabular-nums ${(u?.growthRate ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(u?.growthRate ?? 0) >= 0 ? '+' : ''}{u?.growthRate ?? 0}%
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Growth Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ FINANCIALS TAB ═══════ */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={DollarSign} label="Monthly Revenue" value={`$${f?.monthlyRevenue ?? '0'}`} color="emerald" />
              <KPICard icon={CreditCard} label="Stripe MRR" value={f?.stripeMRR ? `$${f.stripeMRR}` : '—'} color="violet" sub={f?.stripeRevenue30d ? `$${f.stripeRevenue30d} actual (30d)` : 'Connect Stripe for live data'} />
              <KPICard icon={Zap} label="API Costs" value={`$${f?.estimatedTotalCost ?? '0'}`} color="amber" sub={`Gemini: $${f?.estimatedGeminiCost ?? '0'}`} />
              <KPICard icon={TrendingUp} label="Net Margin" value={`$${f?.netMargin ?? '0'}`} color="emerald" />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Revenue vs. Cost Breakdown
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Revenue</span>
                    <span className="text-sm font-bold text-emerald-400">${f?.monthlyRevenue ?? '0'}</span>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-emerald-500/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{u?.pro ?? 0} Pro subscribers x $4.99/mo</span>
                      <span className="text-white font-semibold">${f?.monthlyRevenue ?? '0'}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/[0.06]" />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Costs (estimated)</span>
                    <span className="text-sm font-bold text-red-400">-${f?.estimatedTotalCost ?? '0'}</span>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-red-500/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Gemini API ({e?.bioApiCalls30d ?? 0} calls x ${f?.costPerBioCall ?? '0.0003'})</span>
                      <span className="text-white font-semibold">${f?.estimatedGeminiCost ?? '0'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Vercel Hosting (Pro plan)</span>
                      <span className="text-white font-semibold">$20.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Supabase (Free tier)</span>
                      <span className="text-white font-semibold">$0.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Map Tiles (Esri/OSM — free)</span>
                      <span className="text-white font-semibold">$0.00</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/[0.06]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Net Margin</span>
                  <span className={`text-lg font-black ${parseFloat(f?.netMargin ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${f?.netMargin ?? '0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Unit Economics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xl font-black text-white tabular-nums">
                    {u?.total && e?.bioApiCalls30d ? (e.bioApiCalls30d / u.total).toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">AI calls / user</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white tabular-nums">
                    {u?.total && e?.mapClicks30d ? (e.mapClicks30d / u.total).toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Pin drops / user</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white tabular-nums">
                    {u?.pro && f?.monthlyRevenue ? `$${(parseFloat(f.monthlyRevenue) / u.pro).toFixed(2)}` : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">ARPU (Pro)</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white tabular-nums">
                    {u?.total ? `${((u.pro / u.total) * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Conversion Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ FEEDBACK TAB ═══════ */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'all',      label: 'Total',    count: counts.all,      color: 'text-white',       bg: 'bg-white/[0.04]' },
                { key: 'new',      label: 'New',       count: counts.new,      color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
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
                          <span className="text-[11px] text-slate-500">{item.user_email || 'Anonymous'}</span>
                          <div className="flex items-center gap-2">
                            {item.status === 'new' && (
                              <button onClick={() => updateStatus(item.id, 'reviewed')} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                                Mark Reviewed
                              </button>
                            )}
                            {item.status !== 'resolved' && (
                              <button onClick={() => updateStatus(item.id, 'resolved')} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                Mark Resolved
                              </button>
                            )}
                            <button onClick={() => deleteFeedback(item.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors">
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
        )}
      </div>
    </div>
  );
}
