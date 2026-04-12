import { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, X, Bug, Gauge, Waves, Sun,
  Calendar, Fish, Loader, Lock, Check, Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPushStatus, subscribeToPush, unsubscribeFromPush } from '../services/PushService';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

const ALERT_TOGGLES = [
  { key: 'morningBriefing', label: 'Morning Briefing', desc: 'Daily 6 AM summary of your favorite spots', icon: Sun, color: 'text-amber-400' },
  { key: 'hatchAlerts', label: 'Hatch Emergence', desc: 'When major hatches are predicted at your waters', icon: Bug, color: 'text-lime-400' },
  { key: 'pressureAlerts', label: 'Pressure Drop', desc: 'When falling pressure triggers feeding activity', icon: Gauge, color: 'text-cyan-400' },
  { key: 'weekendReport', label: 'Weekend Forecast', desc: 'Friday evening report — best waters for Sat & Sun', icon: Calendar, color: 'text-violet-400' },
  { key: 'stockingAlerts', label: 'Stocking Alerts', desc: 'When your favorite waters get freshly stocked', icon: Fish, color: 'text-emerald-400' },
];

export default function AlertSettings({ isOpen, onClose }) {
  const { session, isPro, openPaywall } = useAuth();
  const [pushStatus, setPushStatus] = useState('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    enabled: true,
    morningBriefing: true,
    hatchAlerts: true,
    pressureAlerts: true,
    weekendReport: true,
    stockingAlerts: true,
  });
  const [email, setEmail] = useState('');
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    if (!isOpen) return;
    getPushStatus().then(setPushStatus);
    if (session?.access_token) {
      fetch(`${API_ORIGIN}/api/user-preferences`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(data => {
          const fa = data?.alerts?.fishingAlerts;
          if (fa) setPrefs(prev => ({ ...prev, ...fa }));
          if (data?.alerts?.quietStart) setQuietStart(data.alerts.quietStart);
          if (data?.alerts?.quietEnd) setQuietEnd(data.alerts.quietEnd);
          if (data?.email) setEmail(data.email);
        })
        .catch(() => {});
    }
  }, [isOpen, session]);

  const handlePushToggle = useCallback(async () => {
    if (!session?.access_token) return;
    setPushBusy(true);
    try {
      if (pushStatus === 'subscribed') {
        await unsubscribeFromPush(session.access_token);
        setPushStatus('unsubscribed');
      } else {
        await subscribeToPush(session.access_token);
        setPushStatus('subscribed');
      }
    } catch { /* permission denied or unsupported */ }
    setPushBusy(false);
  }, [pushStatus, session]);

  const toggle = useCallback((key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const save = useCallback(async () => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      await fetch(`${API_ORIGIN}/api/user-preferences`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alerts: {
            fishingAlerts: prefs,
            quietStart,
            quietEnd,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* offline */ }
    setSaving(false);
  }, [session, prefs, quietStart, quietEnd]);

  if (!isOpen) return null;

  const gated = !isPro;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Fishing Alerts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className={`p-5 space-y-5 ${gated ? 'relative' : ''}`}>
          {gated && (
            <div className="absolute inset-0 z-20 backdrop-blur-sm bg-slate-900/60 flex flex-col items-center justify-center gap-3 rounded-b-2xl">
              <Lock className="w-8 h-8 text-amber-400" />
              <p className="text-white font-semibold text-center px-4">Fishing Alerts are a Pro feature</p>
              <button
                onClick={() => { onClose(); openPaywall(); }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm cursor-pointer hover:from-amber-400 hover:to-orange-400 transition"
              >
                Unlock Pro
              </button>
            </div>
          )}

          {/* Push notification toggle */}
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pushStatus === 'subscribed'
                  ? <Bell className="w-5 h-5 text-emerald-400" />
                  : <BellOff className="w-5 h-5 text-slate-500" />}
                <div>
                  <p className="text-sm font-semibold text-white">Push Notifications</p>
                  <p className="text-xs text-slate-400">
                    {pushStatus === 'subscribed' ? 'Enabled' : pushStatus === 'denied' ? 'Blocked by browser' : 'Not enabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={pushBusy || pushStatus === 'denied' || pushStatus === 'unsupported'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  pushStatus === 'subscribed'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {pushBusy ? <Loader className="w-3 h-3 animate-spin" /> : pushStatus === 'subscribed' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Alert type toggles */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">Alert Types</h3>
            {ALERT_TOGGLES.map((toggle_item) => (
              <button
                key={toggle_item.key}
                onClick={() => toggle(toggle_item.key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition cursor-pointer text-left"
              >
                <toggle_item.icon className={`w-5 h-5 flex-shrink-0 ${prefs[toggle_item.key] ? toggle_item.color : 'text-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${prefs[toggle_item.key] ? 'text-white' : 'text-slate-500'}`}>{toggle_item.label}</p>
                  <p className="text-xs text-slate-500 truncate">{toggle_item.desc}</p>
                </div>
                <div className={`w-10 h-5 rounded-full flex-shrink-0 transition-colors ${prefs[toggle_item.key] ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[toggle_item.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Quiet hours */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">Quiet Hours</h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40">
              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs text-slate-400">From</label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={e => setQuietStart(e.target.value)}
                  className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs text-slate-400">To</label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={e => setQuietEnd(e.target.value)}
                  className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Email for digests */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">Email Digest</h3>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/40">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-600 px-1">Weekend reports and morning briefings delivered to your inbox.</p>
          </div>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm hover:from-cyan-500 hover:to-blue-500 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
