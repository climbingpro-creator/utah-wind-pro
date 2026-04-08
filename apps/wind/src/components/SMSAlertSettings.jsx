import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Phone, Bell, BellOff, Clock, MapPin, Zap, Waves, Wind, Shield, Check, ChevronRight, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getSMSPrefs, saveSMSPrefs, formatPhone, isValidPhone } from '../services/SMSNotificationService';
import { getPushStatus, subscribeToPush, unsubscribeFromPush } from '../services/PushService';

const ALERT_TYPES = [
  { id: 'windThreshold', label: 'Wind Threshold Reached', desc: 'Alert when wind hits your target speed', icon: Wind, color: 'text-emerald-500' },
  { id: 'glassConditions', label: 'Glass Conditions', desc: 'Perfect calm water for boating & paddling', icon: Waves, color: 'text-sky-500' },
  { id: 'thermalCycle', label: 'Thermal Cycle Starting', desc: 'When the thermal wind begins building', icon: Zap, color: 'text-amber-500' },
  { id: 'severeWeather', label: 'Severe Weather', desc: 'Dangerous conditions, gusts, lightning', icon: Shield, color: 'text-red-500' },
  { id: 'dailyBriefing', label: 'Daily Morning Briefing', desc: 'Summary of today\'s forecast at 7 AM', icon: Clock, color: 'text-indigo-500' },
];

const ACTIVITIES = [
  { id: 'kiting', label: 'Kiting' },
  { id: 'snowkiting', label: 'Snowkiting' },
  { id: 'sailing', label: 'Sailing' },
  { id: 'boating', label: 'Boating' },
  { id: 'paddling', label: 'Paddling' },
  { id: 'fishing', label: 'Fishing' },
  { id: 'paragliding', label: 'Paragliding' },
];

const LOCATIONS = [
  { id: 'utah-lake-zigzag', label: 'Zig Zag' },
  { id: 'utah-lake-lincoln', label: 'Lincoln Beach' },
  { id: 'utah-lake-sandy', label: 'Sandy Beach' },
  { id: 'utah-lake-vineyard', label: 'Vineyard' },
  { id: 'deer-creek', label: 'Deer Creek' },
  { id: 'willard-bay', label: 'Willard Bay' },
  { id: 'strawberry-ladders', label: 'Strawberry Ladders' },
  { id: 'skyline-drive', label: 'Skyline Drive' },
];

export default function SMSAlertSettings({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [prefs, setPrefs] = useState(getSMSPrefs);
  const [phoneInput, setPhoneInput] = useState(prefs.phone);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(prefs.phone ? 'settings' : 'setup');
  const [pushStatus, setPushStatus] = useState('loading');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loaded = getSMSPrefs();
      setPrefs(loaded);
      setPhoneInput(loaded.phone);
      setStep(loaded.phone ? 'settings' : 'setup');
      getPushStatus().then(setPushStatus);
    }
  }, [isOpen]);

  const handlePushToggle = async () => {
    setPushBusy(true);
    try {
      if (pushStatus === 'subscribed') {
        await unsubscribeFromPush();
        setPushStatus('unsubscribed');
      } else {
        // Try to get auth token if user is logged in
        let token = null;
        try {
          const { supabase } = await import('../lib/supabase');
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            token = data?.session?.access_token;
          }
        } catch {
          /* optional session — ignore */
        }
        await subscribeToPush(token);
        setPushStatus('subscribed');
      }
    } catch (err) {
      if (err.message?.includes('denied')) setPushStatus('denied');
      console.error('[push-toggle]', err.message);
    }
    setPushBusy(false);
  };

  const handleSave = () => {
    const updated = { ...prefs, phone: phoneInput };
    saveSMSPrefs(updated);
    setPrefs(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleAlert = (id) => {
    setPrefs(prev => ({
      ...prev,
      alerts: { ...prev.alerts, [id]: !prev.alerts[id] },
    }));
  };

  const toggleActivity = (id) => {
    setPrefs(prev => ({
      ...prev,
      activities: prev.activities.includes(id)
        ? prev.activities.filter(a => a !== id)
        : [...prev.activities, id],
    }));
  };

  const toggleLocation = (id) => {
    setPrefs(prev => ({
      ...prev,
      locations: prev.locations.includes(id)
        ? prev.locations.filter(l => l !== id)
        : [...prev.locations, id],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-xl overflow-hidden ${
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-500" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Text Alerts</h2>
              {prefs.enabled && prefs.phone && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 uppercase">Active</span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
            {step === 'setup' ? (
              /* SETUP STEP — Phone number entry */
              <div className="space-y-5">
                <div className="text-center py-4">
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                    isDark ? 'bg-sky-500/10' : 'bg-sky-50'
                  }`}>
                    <Phone className="w-8 h-8 text-sky-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Never Miss a Session</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Get instant text alerts when wind hits your target speed, glass conditions appear, or severe weather approaches.
                  </p>
                </div>

                <div>
                  <label className="data-label block mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onBlur={() => isValidPhone(phoneInput) && setPhoneInput(formatPhone(phoneInput))}
                      placeholder="(801) 555-1234"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm border outline-none transition-colors ${
                        isDark
                          ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500'
                          : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                    Standard message rates apply. Text STOP anytime to unsubscribe.
                  </p>
                </div>

                <div className="flex gap-3">
                  {['Wind Alerts', 'Glass Alerts', 'Severe Weather'].map(label => (
                    <div key={label} className={`flex-1 text-center p-3 rounded-lg border ${
                      isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
                    }`}>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (isValidPhone(phoneInput)) {
                      setPrefs(prev => ({ ...prev, enabled: true, phone: phoneInput }));
                      setStep('settings');
                    }
                  }}
                  disabled={!isValidPhone(phoneInput)}
                  className={`w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    isValidPhone(phoneInput)
                      ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                  }`}
                >
                  Enable Text Alerts
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* SETTINGS STEP — Configure alerts */
              <div className="space-y-5">
                {/* Master Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-lg border ${
                  prefs.enabled
                    ? (isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50')
                    : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50')
                }`}>
                  <div className="flex items-center gap-3">
                    {prefs.enabled ? <Bell className="w-5 h-5 text-emerald-500" /> : <BellOff className="w-5 h-5 text-[var(--text-tertiary)]" />}
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {prefs.enabled ? 'Alerts Active' : 'Alerts Paused'}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">{formatPhone(prefs.phone)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      prefs.enabled ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      prefs.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Push Notifications Toggle */}
                {pushStatus !== 'unsupported' && (
                  <div className={`flex items-center justify-between p-4 rounded-lg border ${
                    pushStatus === 'subscribed'
                      ? (isDark ? 'border-violet-500/30 bg-violet-500/5' : 'border-violet-200 bg-violet-50')
                      : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50')
                  }`}>
                    <div className="flex items-center gap-3">
                      <Smartphone className={`w-5 h-5 ${pushStatus === 'subscribed' ? 'text-violet-500' : 'text-[var(--text-tertiary)]'}`} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Push Notifications</p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {pushStatus === 'subscribed' ? 'Receiving browser push alerts' :
                           pushStatus === 'denied' ? 'Permission denied — check browser settings' :
                           'Get instant alerts even when the app is closed'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handlePushToggle}
                      disabled={pushBusy || pushStatus === 'denied'}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        pushStatus === 'subscribed' ? 'bg-violet-500' :
                        pushStatus === 'denied' ? (isDark ? 'bg-slate-700' : 'bg-slate-200') :
                        isDark ? 'bg-slate-600' : 'bg-slate-300'
                      } ${pushBusy ? 'opacity-50' : ''}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        pushStatus === 'subscribed' ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Alert Types */}
                <div>
                  <h3 className="data-label mb-3">Alert Types</h3>
                  <div className="space-y-2">
                    {ALERT_TYPES.map(alert => (
                      <button
                        key={alert.id}
                        onClick={() => toggleAlert(alert.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          prefs.alerts[alert.id]
                            ? (isDark ? 'border-sky-500/30 bg-sky-500/5' : 'border-sky-200 bg-sky-50/50')
                            : (isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-white')
                        }`}
                      >
                        <alert.icon className={`w-4 h-4 flex-shrink-0 ${prefs.alerts[alert.id] ? alert.color : 'text-[var(--text-tertiary)]'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${prefs.alerts[alert.id] ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{alert.label}</p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">{alert.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          prefs.alerts[alert.id]
                            ? 'bg-sky-500 border-sky-500'
                            : isDark ? 'border-slate-600' : 'border-slate-300'
                        }`}>
                          {prefs.alerts[alert.id] && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wind Thresholds */}
                {prefs.alerts.windThreshold && (
                  <div>
                    <h3 className="data-label mb-3">Wind Thresholds</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Alert when wind reaches</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={prefs.thresholds.windMin}
                            onChange={e => setPrefs(prev => ({ ...prev, thresholds: { ...prev.thresholds, windMin: Number(e.target.value) } }))}
                            className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                              isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                            min={1} max={50}
                          />
                          <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">mph</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Gust warning above</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={prefs.thresholds.gustMax}
                            onChange={e => setPrefs(prev => ({ ...prev, thresholds: { ...prev.thresholds, gustMax: Number(e.target.value) } }))}
                            className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                              isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                            min={10} max={60}
                          />
                          <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">mph</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activities */}
                <div>
                  <h3 className="data-label mb-3">Activities to Monitor</h3>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITIES.map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleActivity(a.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          prefs.activities.includes(a.id)
                            ? 'bg-sky-500 text-white border-sky-500'
                            : isDark
                              ? 'border-slate-600 text-[var(--text-secondary)]'
                              : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <h3 className="data-label mb-3">Locations</h3>
                  <div className="flex flex-wrap gap-2">
                    {LOCATIONS.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => toggleLocation(loc.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          prefs.locations.includes(loc.id)
                            ? 'bg-sky-500 text-white border-sky-500'
                            : isDark
                              ? 'border-slate-600 text-[var(--text-secondary)]'
                              : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quiet Hours */}
                <div>
                  <h3 className="data-label mb-3">Quiet Hours (no texts)</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">From</label>
                      <select
                        value={prefs.quietHours.start}
                        onChange={e => setPrefs(prev => ({ ...prev, quietHours: { ...prev.quietHours, start: Number(e.target.value) } }))}
                        className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                          isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-[var(--text-tertiary)] mt-4">to</span>
                    <div className="flex-1">
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Until</label>
                      <select
                        value={prefs.quietHours.end}
                        onChange={e => setPrefs(prev => ({ ...prev, quietHours: { ...prev.quietHours, end: Number(e.target.value) } }))}
                        className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                          isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  className="w-full py-3 rounded-lg text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep('setup');
                    setPhoneInput('');
                    setPrefs(prev => ({ ...prev, phone: '', enabled: false }));
                  }}
                  className="w-full py-2 text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                >
                  Change phone number or remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
