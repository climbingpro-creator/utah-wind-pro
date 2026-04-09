import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@utahwind/database';
import {
  weatherService, LAKE_CONFIGS, getAllStationIds, learningSystem,
  crossValidationEngine, CROSS_VALIDATION_PAIRS, normalizeWuObservation,
} from '@utahwind/weather';
import { dataCollector } from '../services/DataCollector';
import {
  Shield, ArrowLeft, CheckCircle, Clock, AlertTriangle, Bug, Lightbulb,
  MessageSquare, ExternalLink, RefreshCw, Trash2, BarChart3, CreditCard,
  Users, TrendingUp, TrendingDown, Zap, Map, Eye, DollarSign, Activity,
  Globe, Layers, Wind, Fish, Minus, Radio, Brain, Gauge, Wifi, WifiOff,
  Server, Database, CloudRain, Phone, Send, AlertCircle, Bell, RotateCcw, ShieldCheck,
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

function KPICard({ icon, label, value, sub, trend, color = 'sky' }) {
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

function MiniBar({ value, max, color = 'sky' }) {
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
        <Activity className="w-4 h-4 text-sky-400" />
        14-Day Engagement
      </h3>
      <div className="flex items-end gap-1 h-24">
        {days.map((d) => {
          const h = Math.max(4, (d.total / maxTotal) * 100);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-sm bg-sky-500/40 hover:bg-sky-500/70 transition-colors cursor-default"
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
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [alertDiagnostics, setAlertDiagnostics] = useState(null);
  const [resettingWeights, setResettingWeights] = useState(false);
  const [weightResetResult, setWeightResetResult] = useState(null);
  const [wuSearchLat, setWuSearchLat] = useState('');
  const [wuSearchLon, setWuSearchLon] = useState('');
  const [wuSearching, setWuSearching] = useState(false);
  const [wuResults, setWuResults] = useState(null);
  const [cvHealth, setCvHealth] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [cycleResult, setCycleResult] = useState(null);

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
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/admin/analytics`, { headers });
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

  const fetchSystemHealth = useCallback(async () => {
    setSystemLoading(true);
    try {
      const lakeIds = Object.keys(LAKE_CONFIGS).filter(id => id !== 'utah-lake');
      const allStationIds = new Set();
      const spotStationMap = {};
      for (const id of lakeIds) {
        const sids = getAllStationIds(id);
        spotStationMap[id] = sids;
        sids.forEach(s => allStationIds.add(s));
      }

      const synopticIds = Array.from(allStationIds).filter(id => !id.startsWith('UID'));
      const udotCount = allStationIds.size - synopticIds.length;

      let onlineStations = [];
      let synopticError = null;
      try {
        onlineStations = await weatherService.getSynopticStationData(synopticIds);
      } catch (err) {
        synopticError = err.message;
      }

      let ambientOnline = false;
      try {
        const amb = await weatherService.getAmbientWeatherData();
        ambientOnline = !!(amb && amb.windSpeed != null);
      } catch { /* ignore */ }

      const nwsIds = onlineStations.filter(s => s._source === 'nws' || ['KSLC', 'KPVU', 'KOGD', 'KPUC'].includes(s.stationId));
      const nwsOnline = nwsIds.length > 0;
      const udotIds = onlineStations.filter(s => s._source === 'udot' || s.stationId?.startsWith?.('UID'));
      const udotOnline = udotIds.length > 0;

      const respondingIds = new Set(onlineStations.map(s => s.stationId));
      const windIds = new Set(onlineStations.filter(s => s.windSpeed != null).map(s => s.stationId));
      const dataOnlyIds = new Set(onlineStations.filter(s => s.windSpeed == null && (s.temperature != null || s.pressure != null)).map(s => s.stationId));
      const notRespondingCount = synopticIds.length - respondingIds.size;

      const spotHealth = lakeIds.map(id => {
        const sids = (spotStationMap[id] || []).filter(s => !s.startsWith('UID'));
        const withWind = sids.filter(s => windIds.has(s)).length;
        const responding = sids.filter(s => respondingIds.has(s)).length;
        return { id, name: LAKE_CONFIGS[id]?.name || id, total: sids.length, online: responding, withWind };
      }).sort((a, b) => (a.online / (a.total || 1)) - (b.online / (b.total || 1)));

      const collectorStats = dataCollector.getStats();

      let learningInfo = null;
      try {
        const w = await new Promise((resolve) => {
          const req = indexedDB.open('UtahWindProLearning', 2);
          req.onerror = () => resolve(null);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('modelWeights')) { db.close(); resolve(null); return; }
            const tx = db.transaction('modelWeights', 'readonly');
            const store = tx.objectStore('modelWeights');
            const get = store.get('current');
            get.onsuccess = () => { db.close(); resolve(get.result); };
            get.onerror = () => { db.close(); resolve(null); };
          };
        });
        if (w) {
          learningInfo = {
            version: w.version,
            createdAt: w.createdAt,
            samples: w.basedOnSamples,
            accuracy: w.meta?.overallAccuracy,
            lakeCount: w.lakeWeights ? Object.keys(w.lakeWeights).length : 0,
          };
        }
      } catch { /* ignore */ }

      setSystemHealth({
        totalStations: synopticIds.length,
        respondingCount: respondingIds.size,
        windReportingCount: windIds.size,
        dataOnlyCount: dataOnlyIds.size,
        notRespondingCount,
        udotCount,
        ambientOnline,
        nwsOnline,
        udotOnline,
        synopticOnline: respondingIds.size > 0 && !synopticError,
        synopticError,
        spotHealth,
        collector: collectorStats,
        learning: learningInfo,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Admin] system health error:', err);
    }
    setSystemLoading(false);
  }, []);

  const fetchAlertDiagnostics = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/admin/test-sms`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'diagnostics' }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAlertDiagnostics(data.diagnostics);
      }
    } catch (err) {
      console.warn('[Admin] alert diagnostics error:', err);
    }
  }, [getAuthHeader]);

  const sendTestSMS = useCallback(async () => {
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const headers = await getAuthHeader();
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/admin/test-sms`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, action: 'sms' }),
      });
      const data = await resp.json();
      setTestResult(data);
      if (data.diagnostics) setAlertDiagnostics(data.diagnostics);
    } catch (err) {
      setTestResult({ error: err.message });
    }
    setTestSending(false);
  }, [testPhone, getAuthHeader]);

  const searchWuNearby = useCallback(async () => {
    if (!wuSearchLat || !wuSearchLon) return;
    setWuSearching(true);
    setWuResults(null);
    try {
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/weather?source=wu-nearby&lat=${wuSearchLat}&lon=${wuSearchLon}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const stations = data?.location?.stationId?.map((id, i) => ({
        id,
        name: data.location?.stationName?.[i] || id,
        lat: data.location?.latitude?.[i],
        lon: data.location?.longitude?.[i],
        distKm: data.location?.distanceKm?.[i],
        distMi: data.location?.distanceMi?.[i],
        qcStatus: data.location?.qcStatus?.[i],
      })) || [];
      setWuResults(stations);
    } catch (err) {
      setWuResults({ error: err.message });
    }
    setWuSearching(false);
  }, [wuSearchLat, wuSearchLon]);

  const fetchCrossValidationHealth = useCallback(async () => {
    setCvLoading(true);
    try {
      await crossValidationEngine.initialize();
      const allStationIds = new Set();
      const lakeIds = Object.keys(LAKE_CONFIGS).filter(id => id !== 'utah-lake');
      for (const id of lakeIds) getAllStationIds(id).forEach(s => allStationIds.add(s));

      const [synopticData, wuRawData] = await Promise.allSettled([
        weatherService.getSynopticStationData(Array.from(allStationIds)),
        weatherService.getWuPwsCurrent(
          CROSS_VALIDATION_PAIRS.map(p => p.wuId)
        ),
      ]);

      const synStations = synopticData.status === 'fulfilled' ? synopticData.value : [];
      const wuRaw = wuRawData.status === 'fulfilled' ? wuRawData.value : [];
      const wuNormalized = wuRaw.map(normalizeWuObservation).filter(Boolean);

      if (synStations.length > 0 || wuNormalized.length > 0) {
        await crossValidationEngine.compare(synStations, wuNormalized);
      }

      const summary = await crossValidationEngine.getHealthSummary();
      setCvHealth(summary);
    } catch (err) {
      console.warn('Cross-validation health fetch failed:', err.message);
    }
    setCvLoading(false);
  }, []);

  const runLearningCycle = useCallback(async () => {
    setCycleRunning(true);
    setCycleResult(null);
    try {
      await dataCollector.forceCollection();
      await dataCollector.forceLearning();
      setCycleResult({ success: true });
      fetchSystemHealth();
      fetchCrossValidationHealth();
    } catch (err) {
      setCycleResult({ error: err.message });
    }
    setCycleRunning(false);
  }, [fetchSystemHealth, fetchCrossValidationHealth]);

  const resetLearningWeights = useCallback(async () => {
    if (!confirm('Reset all learned weights? The engine will recalibrate from scratch using current data sources. This cannot be undone.')) return;
    setResettingWeights(true);
    setWeightResetResult(null);
    try {
      await learningSystem.resetWeights('admin-dashboard');
      setWeightResetResult({ success: true });
      fetchSystemHealth();
    } catch (err) {
      setWeightResetResult({ error: err.message });
    }
    setResettingWeights(false);
  }, [fetchSystemHealth]);

  const sendTestPush = useCallback(async () => {
    setPushSending(true);
    setPushResult(null);
    try {
      const headers = await getAuthHeader();
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/admin/test-sms`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      });
      const data = await resp.json();
      setPushResult(data);
      if (data.diagnostics) setAlertDiagnostics(data.diagnostics);
    } catch (err) {
      setPushResult({ error: err.message });
    }
    setPushSending(false);
  }, [getAuthHeader]);

  useEffect(() => {
    if (authorized) {
      fetchAnalytics();
      fetchFeedback();
      fetchSystemHealth();
      fetchAlertDiagnostics();
      fetchCrossValidationHealth();
    }
  }, [authorized, fetchAnalytics, fetchFeedback, fetchSystemHealth, fetchAlertDiagnostics, fetchCrossValidationHealth]);

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
    { id: 'system', label: 'System Health', icon: Radio },
    { id: 'engagement', label: 'Engagement', icon: Activity },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'feedback', label: `Feedback${fb?.new ? ` (${fb.new})` : ''}`, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => { window.location.hash = ''; }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h1 className="text-lg font-bold">Command Center</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">Wind</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analytics?.generatedAt && (
                <span className="text-[10px] text-slate-600 hidden sm:block">
                  Updated {new Date(analytics.generatedAt).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => { fetchAnalytics(); fetchFeedback(); fetchSystemHealth(); fetchCrossValidationHealth(); }}
                disabled={analyticsLoading || loading || systemLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Nav */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-sky-400 text-sky-400'
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
            {/* Top-line KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard icon={Users} label="Total Users" value={u?.total ?? '—'} trend={u?.growthRate} color="sky" sub={`+${u?.recentSignups ?? 0} last 30d`} />
              <KPICard icon={Zap} label="Pro Users" value={u?.pro ?? '—'} color="violet" sub={`${u?.free ?? 0} free`} />
              <KPICard icon={DollarSign} label="Revenue (30d)" value={`$${f?.monthlyRevenue ?? '0'}`} color="emerald" sub={f?.pricePerUser} />
              <KPICard icon={Eye} label="Page Views" value={e?.pageViews30d ?? '—'} color="sky" sub={`${e?.windViews30d ?? 0} wind / ${e?.waterViews30d ?? 0} water`} />
              <KPICard icon={Map} label="Pin Drops" value={e?.mapClicks30d ?? '—'} color="amber" sub={`${e?.bioApiCalls30d ?? 0} AI calls`} />
              <KPICard icon={Activity} label="Retention" value={`${u?.retentionRate ?? 0}%`} color="emerald" sub={`${u?.uniqueActiveUsers30d ?? 0} active / ${u?.total ?? 0}`} />
            </div>

            {/* Engagement Timeline */}
            {e?.eventsByDay && <EngagementTimeline eventsByDay={e.eventsByDay} />}

            {/* Activity Breakdown + Quick Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Activity Breakdown */}
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

              {/* Platform Health */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Platform Health
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Sessions (all time)', value: e?.totalSessions ?? '—', icon: Activity },
                    { label: 'Sessions (30d)', value: e?.sessions30d ?? '—', icon: Wind },
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

            {/* Quick Links */}
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

        {/* ═══════ SYSTEM HEALTH TAB ═══════ */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {systemLoading && !systemHealth && (
              <div className="text-center py-12 text-slate-500 animate-pulse">Probing stations...</div>
            )}
            {systemHealth && (
              <>
                {/* Station Health KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <KPICard icon={Radio} label="Synoptic Stations" value={systemHealth.totalStations} color="sky"
                    sub={systemHealth.udotCount ? `+${systemHealth.udotCount} UDOT (separate API)` : undefined} />
                  <KPICard icon={Wifi} label="Responding" value={systemHealth.respondingCount} color="emerald"
                    sub={`${Math.round((systemHealth.respondingCount / systemHealth.totalStations) * 100)}% of stations`} />
                  <KPICard icon={Wind} label="Reporting Wind" value={systemHealth.windReportingCount} color="sky"
                    sub={`${systemHealth.dataOnlyCount} temp/pressure only`} />
                  <KPICard icon={WifiOff} label="Not Responding" value={systemHealth.notRespondingCount}
                    color={systemHealth.notRespondingCount > 10 ? 'red' : 'amber'} />
                  <KPICard icon={CloudRain} label="Ambient PWS" value={systemHealth.ambientOnline ? 'Online' : 'Offline'}
                    color={systemHealth.ambientOnline ? 'emerald' : 'red'} />
                </div>

                {systemHealth.synopticError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                    <strong>Synoptic API Error:</strong> {systemHealth.synopticError}
                  </div>
                )}

                {/* Data Sources */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    Data Source Status
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'NWS (Airport ASOS)', status: systemHealth.nwsOnline, desc: 'Free — api.weather.gov' },
                      { name: 'UDOT RWIS', status: systemHealth.udotOnline, desc: 'UDOT_API_KEY' },
                      { name: 'Synoptic / MesoWest', status: systemHealth.synopticOnline, desc: 'SYNOPTIC_TOKEN' },
                      { name: 'Weather Underground PWS', status: true, desc: 'WU_API_KEY — Parallel cross-validation' },
                      { name: 'Ambient Weather', status: systemHealth.ambientOnline, desc: 'AMBIENT_API_KEY' },
                    ].map(src => (
                      <div key={src.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${src.status ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-xs font-semibold text-slate-300">{src.name}</span>
                          <span className="text-[10px] text-slate-600">{src.desc}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${src.status ? 'text-emerald-400' : 'text-red-400'}`}>
                          {src.status ? 'OK' : 'DOWN'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learning Engine */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      Learning Engine
                    </h3>
                    {systemHealth.learning ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Model Version', value: systemHealth.learning.version },
                          { label: 'Training Samples', value: systemHealth.learning.samples?.toLocaleString() ?? '—' },
                          { label: 'Accuracy', value: systemHealth.learning.accuracy != null
                            ? `${(systemHealth.learning.accuracy * 100).toFixed(1)}%` : '—' },
                          { label: 'Spots Trained', value: systemHealth.learning.lakeCount },
                          { label: 'Last Trained', value: systemHealth.learning.createdAt
                            ? new Date(systemHealth.learning.createdAt).toLocaleString() : '—' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">{item.label}</span>
                            <span className="text-sm font-bold text-white tabular-nums">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">No learning data stored yet</p>
                    )}

                    <div className="border-t border-white/[0.06] mt-4 pt-4">
                      <button
                        onClick={resetLearningWeights}
                        disabled={resettingWeights}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <RotateCcw className={`w-3 h-3 ${resettingWeights ? 'animate-spin' : ''}`} />
                        {resettingWeights ? 'Resetting...' : 'Reset Learned Weights'}
                      </button>
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        Clears all learned weights, accuracy records, and patterns. Use when data sources change (e.g. Synoptic restored).
                        The engine will recalibrate within a few hours.
                      </p>
                      {weightResetResult?.success && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Weights reset. Engine will recalibrate on next data cycle.
                        </div>
                      )}
                      {weightResetResult?.error && (
                        <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Reset failed: {weightResetResult.error}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/[0.06] mt-4 pt-4">
                      <button
                        onClick={runLearningCycle}
                        disabled={cycleRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Zap className={`w-3 h-3 ${cycleRunning ? 'animate-pulse' : ''}`} />
                        {cycleRunning ? 'Running Cycle...' : 'Run Learning Cycle Now'}
                      </button>
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        Collects actuals from all sources, records predictions, runs cross-validation, and triggers a learning update.
                      </p>
                      {cycleResult?.success && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Learning cycle complete. Check Cross-Validation Health for results.
                        </div>
                      )}
                      {cycleResult?.error && (
                        <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Cycle failed: {cycleResult.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      Data Collector
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Status', value: systemHealth.collector?.isRunning ? 'Running' : 'Stopped' },
                        { label: 'Actuals Collected', value: systemHealth.collector?.actualsCollected?.toLocaleString() ?? 0 },
                        { label: 'Predictions Recorded', value: systemHealth.collector?.predictionsRecorded?.toLocaleString() ?? 0 },
                        { label: 'Verifications Run', value: systemHealth.collector?.verificationsRun ?? 0 },
                        { label: 'Learning Cycles', value: systemHealth.collector?.learningCyclesRun ?? 0 },
                        { label: 'Last Error', value: systemHealth.collector?.lastError || 'None' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{item.label}</span>
                          <span className={`text-sm font-bold tabular-nums ${
                            item.label === 'Last Error' && item.value !== 'None' ? 'text-red-400' : 'text-white'
                          }`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alert System */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-sky-400" />
                    Alert System (SMS + Push)
                  </h3>

                  <div className="space-y-4">
                    {/* Diagnostic indicators */}
                    <div className="space-y-2">
                      {[
                        { label: 'Twilio SMS', ok: alertDiagnostics?.twilioConfigured && !alertDiagnostics?.smsA2pPending,
                          detail: alertDiagnostics?.smsA2pPending ? 'A2P Pending' : (alertDiagnostics?.twilioFrom || 'Not configured'),
                          warn: alertDiagnostics?.smsA2pPending },
                        { label: 'VAPID Push', ok: alertDiagnostics?.vapidConfigured, detail: alertDiagnostics?.vapidConfigured ? 'Keys set' : 'Not configured' },
                        { label: 'Push Subscribers', ok: (alertDiagnostics?.pushSubscribers ?? 0) > 0, detail: `${alertDiagnostics?.pushSubscribers ?? '?'} users` },
                        { label: 'Users with Phone', ok: (alertDiagnostics?.usersWithPhone ?? 0) > 0, detail: `${alertDiagnostics?.usersWithPhone ?? '?'} users` },
                        { label: 'SMS Opted In', ok: (alertDiagnostics?.smsOptedIn ?? 0) > 0, detail: `${alertDiagnostics?.smsOptedIn ?? '?'} confirmed` },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.warn ? 'bg-amber-400' : item.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${item.warn ? 'text-amber-400' : item.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.detail}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* A2P Pending Warning */}
                    {alertDiagnostics?.smsA2pPending && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed">
                        <strong>SMS Paused — A2P Campaign Under Review</strong>
                        <p className="mt-1">Twilio requires A2P campaign registration for US SMS. Your campaign is under review (can take 1-4 weeks).
                        SMS will not be delivered until approved. Use <strong>Push Notifications</strong> in the meantime.</p>
                      </div>
                    )}

                    {/* Test Push */}
                    <div className="border-t border-white/[0.06] pt-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Send Test Push Notification</label>
                      <p className="text-[10px] text-slate-500 mb-2">Sends a push to your own browser (must have push enabled in Text Alerts settings first)</p>
                      <button
                        onClick={sendTestPush}
                        disabled={pushSending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Bell className={`w-3.5 h-3.5 ${pushSending ? 'animate-pulse' : ''}`} />
                        {pushSending ? 'Sending...' : 'Send Test Push'}
                      </button>

                      {pushResult && (
                        <div className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 ${
                          pushResult.push?.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {pushResult.push?.success ? (
                            <><CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> Push sent! ({pushResult.push.sent}/{pushResult.push.total} subscriptions)</>
                          ) : (
                            <><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              {pushResult.error || (pushResult.push?.reason === 'no-push-subscription'
                                ? 'No push subscription found — enable Push in Text Alerts settings first'
                                : pushResult.push?.reason === 'vapid-not-configured'
                                ? 'VAPID keys not configured on server'
                                : `Push failed (${pushResult.push?.reason || 'unknown'})`
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Test SMS */}
                    <div className="border-t border-white/[0.06] pt-4">
                      <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                        alertDiagnostics?.smsA2pPending ? 'text-slate-600' : 'text-slate-400'
                      }`}>Send Test SMS {alertDiagnostics?.smsA2pPending ? '(A2P Pending — will not deliver)' : ''}</label>
                      <div className={`flex gap-2 ${alertDiagnostics?.smsA2pPending ? 'opacity-40' : ''}`}>
                        <input
                          type="tel"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="+18015551234"
                          disabled={alertDiagnostics?.smsA2pPending}
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 outline-none focus:border-sky-500 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={sendTestSMS}
                          disabled={testSending || !testPhone || alertDiagnostics?.smsA2pPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className={`w-3.5 h-3.5 ${testSending ? 'animate-pulse' : ''}`} />
                          {testSending ? 'Sending...' : 'Send'}
                        </button>
                      </div>

                      {testResult && (
                        <div className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 ${
                          testResult.sms?.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {testResult.sms?.success ? (
                            <><CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> SMS queued with Twilio. {alertDiagnostics?.smsA2pPending ? '(May not deliver — A2P pending)' : 'Check your phone.'}</>
                          ) : (
                            <><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              {testResult.error || (testResult.sms?.reason === 'twilio-not-configured'
                                ? 'Twilio not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to Vercel env vars'
                                : `SMS failed (${testResult.sms?.reason || testResult.sms?.method || 'unknown'})`
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {!alertDiagnostics?.twilioConfigured && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed">
                        <strong>Setup needed:</strong> Add these env vars to your Vercel project (utah-wind-pro):
                        <ul className="mt-1 ml-3 list-disc space-y-0.5">
                          <li>TWILIO_ACCOUNT_SID</li>
                          <li>TWILIO_AUTH_TOKEN</li>
                          <li>TWILIO_FROM_NUMBER (E.164, e.g. +18015551234)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* WU Station Discovery */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Map className="w-4 h-4 text-cyan-400" />
                    WU Station Discovery
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3">
                    Search Weather Underground for PWS stations near a coordinate. Use this to find new shadow stations or fill coverage gaps.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      { label: 'Spanish Fork Canyon', lat: '40.05', lon: '-111.55' },
                      { label: 'Timpanogos Foothills', lat: '40.39', lon: '-111.64' },
                      { label: 'South Valley', lat: '40.52', lon: '-111.90' },
                      { label: 'Point of Mountain', lat: '40.45', lon: '-111.89' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => { setWuSearchLat(preset.lat); setWuSearchLon(preset.lon); }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text" value={wuSearchLat} onChange={e => setWuSearchLat(e.target.value)}
                      placeholder="Lat (e.g. 40.35)" className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text" value={wuSearchLon} onChange={e => setWuSearchLon(e.target.value)}
                      placeholder="Lon (e.g. -111.90)" className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={searchWuNearby} disabled={wuSearching || !wuSearchLat || !wuSearchLon}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {wuSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {wuResults && !wuResults.error && (
                    <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                      {wuResults.length === 0 ? (
                        <p className="text-xs text-slate-500">No stations found nearby</p>
                      ) : wuResults.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <div>
                            <span className="font-bold text-cyan-400 font-mono">{s.id}</span>
                            <span className="text-slate-400 ml-2">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 tabular-nums">{s.distMi?.toFixed(1)} mi</span>
                            <span className={`text-[10px] font-bold ${s.qcStatus === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {s.qcStatus === 1 ? 'Active' : 'Stale'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {wuResults?.error && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                      Search failed: {wuResults.error}
                    </div>
                  )}
                </div>

                {/* Cross-Validation Health */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    Cross-Validation Health
                    {cvHealth && (
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cvHealth.overallConfidence >= 0.7 ? 'bg-emerald-500/15 text-emerald-400'
                        : cvHealth.overallConfidence >= 0.4 ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                      }`}>
                        {(cvHealth.overallConfidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </h3>

                  {cvLoading && !cvHealth && (
                    <div className="text-center py-6 text-slate-500 text-xs animate-pulse">Loading cross-validation data...</div>
                  )}

                  {cvHealth && (
                    <>
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white tabular-nums">{cvHealth.totalPairs}</div>
                          <div className="text-[10px] text-slate-500">Paired Stations</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400 tabular-nums">{cvHealth.bothOnlineCount}</div>
                          <div className="text-[10px] text-slate-500">Both Online</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-sky-400 tabular-nums">{cvHealth.crossValidatedCount}</div>
                          <div className="text-[10px] text-slate-500">Agreeing</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold tabular-nums ${
                            cvHealth.overallConfidence >= 0.7 ? 'text-emerald-400' : cvHealth.overallConfidence >= 0.4 ? 'text-amber-400' : 'text-red-400'
                          }`}>{(cvHealth.overallConfidence * 100).toFixed(0)}%</div>
                          <div className="text-[10px] text-slate-500">Overall</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {cvHealth.pairs.map((pair) => {
                          const confColor = pair.confidence >= 0.7 ? 'emerald' : pair.confidence >= 0.4 ? 'amber' : 'red';
                          return (
                            <div key={`${pair.synopticId}:${pair.wuId}`} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">{pair.name}</span>
                                  {pair.latestAgrees === true && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">AGREE</span>
                                  )}
                                  {pair.latestAgrees === false && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">DIVERGENT</span>
                                  )}
                                </div>
                                <span className={`text-[10px] font-bold text-${confColor}-400 tabular-nums`}>
                                  {(pair.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-[10px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Synoptic <span className="font-mono text-slate-400">{pair.synopticId}</span></span>
                                  <span className={pair.synOnline ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                    {pair.synOnline ? `${pair.latestSynSpeed?.toFixed(1) ?? '—'} mph` : 'OFFLINE'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">WU <span className="font-mono text-slate-400">{pair.wuId}</span></span>
                                  <span className={pair.wuOnline ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                    {pair.wuOnline ? `${pair.latestWuSpeed?.toFixed(1) ?? '—'} mph` : 'OFFLINE'}
                                  </span>
                                </div>
                              </div>
                              {pair.totalRecords > 0 && (
                                <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                                  <span>Agreement: <strong className="text-slate-300">{pair.agreementRate != null ? `${(pair.agreementRate * 100).toFixed(0)}%` : '—'}</strong></span>
                                  <span>Speed ratio: <strong className="text-slate-300">{pair.rollingSpeedRatio?.toFixed(3) ?? '—'}</strong></span>
                                  <span>Records: <strong className="text-slate-300">{pair.totalRecords}</strong></span>
                                </div>
                              )}
                              {pair.totalRecords === 0 && (
                                <p className="mt-2 text-[10px] text-slate-600">No cross-validation records yet — data will appear after both sources report simultaneously.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={fetchCrossValidationHealth}
                        disabled={cvLoading}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${cvLoading ? 'animate-spin' : ''}`} />
                        Refresh Cross-Validation
                      </button>
                    </>
                  )}

                  {!cvHealth && !cvLoading && (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-600 mb-2">Cross-validation engine not yet initialized.</p>
                      <button
                        onClick={fetchCrossValidationHealth}
                        className="text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Initialize Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Spot-by-Spot Station Health */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Spot Station Health ({systemHealth.spotHealth?.length} spots)
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {systemHealth.spotHealth?.map(spot => {
                      const pct = spot.total > 0 ? Math.round((spot.online / spot.total) * 100) : 0;
                      return (
                        <div key={spot.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-300 truncate">{spot.name}</span>
                            <span className={`text-[10px] font-bold tabular-nums ${
                              pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'
                            }`}>{spot.online}/{spot.total} responding{spot.withWind != null ? ` (${spot.withWind} wind)` : ''}</span>
                          </div>
                          <MiniBar value={spot.online} max={spot.total} color={pct >= 70 ? 'emerald' : pct >= 40 ? 'amber' : 'red'} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 text-right">
                  Last checked: {new Date(systemHealth.checkedAt).toLocaleString()}
                </p>
              </>
            )}
          </div>
        )}

        {/* ═══════ ENGAGEMENT TAB ═══════ */}
        {activeTab === 'engagement' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={Eye} label="Page Views (30d)" value={e?.pageViews30d ?? '—'} color="sky" />
              <KPICard icon={Map} label="Pin Drops (30d)" value={e?.mapClicks30d ?? '—'} color="amber" />
              <KPICard icon={Fish} label="Bio API Calls (30d)" value={e?.bioApiCalls30d ?? '—'} color="emerald" />
              <KPICard icon={Activity} label="Total Events" value={e?.totalEvents ?? '—'} color="violet" />
            </div>

            {/* App Breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
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
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Utah Water & Glass</p>
                </div>
              </div>
            </div>

            {e?.eventsByDay && <EngagementTimeline eventsByDay={e.eventsByDay} />}

            {/* User Retention */}
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
                  <p className="text-3xl font-black text-sky-400 tabular-nums">{u?.uniqueActiveUsers30d ?? 0}</p>
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
            {/* Revenue KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={DollarSign} label="Monthly Revenue" value={`$${f?.monthlyRevenue ?? '0'}`} color="emerald" />
              <KPICard icon={CreditCard} label="Stripe MRR" value={f?.stripeMRR ? `$${f.stripeMRR}` : '—'} color="violet" sub={f?.stripeRevenue30d ? `$${f.stripeRevenue30d} actual (30d)` : 'Connect Stripe for live data'} />
              <KPICard icon={Zap} label="API Costs" value={`$${f?.estimatedTotalCost ?? '0'}`} color="amber" sub={`Gemini: $${f?.estimatedGeminiCost ?? '0'}`} />
              <KPICard icon={TrendingUp} label="Net Margin" value={`$${f?.netMargin ?? '0'}`} color="emerald" />
            </div>

            {/* Cost Breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Revenue vs. Cost Breakdown
              </h3>

              <div className="space-y-4">
                {/* Revenue */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Revenue</span>
                    <span className="text-sm font-bold text-emerald-400">${f?.monthlyRevenue ?? '0'}</span>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-emerald-500/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{u?.pro ?? 0} Pro subscribers × $4.99/mo</span>
                      <span className="text-white font-semibold">${f?.monthlyRevenue ?? '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Costs */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Costs (estimated)</span>
                    <span className="text-sm font-bold text-red-400">-${f?.estimatedTotalCost ?? '0'}</span>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-red-500/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Gemini API ({e?.bioApiCalls30d ?? 0} calls × ${f?.costPerBioCall ?? '0.0003'})</span>
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

                {/* Net */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Net Margin</span>
                  <span className={`text-lg font-black ${parseFloat(f?.netMargin ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${f?.netMargin ?? '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Unit Economics */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
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
            {/* Feedback Filter */}
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
        )}
      </div>
    </div>
  );
}
