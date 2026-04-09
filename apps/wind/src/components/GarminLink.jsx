import { useState, useEffect, useCallback } from 'react';
import { Watch, X, Link2, Unlink, Check, AlertCircle, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function GarminLink({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, session } = useAuth();

  const [deviceInput, setDeviceInput] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [linkedDevices, setLinkedDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const [result, setResult] = useState(null);

  const getToken = useCallback(() => session?.access_token, [session]);

  const fetchLinkedDevices = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setFetchingDevices(true);
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) return;
      const { data } = await supabase
        .from('garmin_devices')
        .select('device_id, device_name, linked_at')
        .eq('user_id', user.id);
      setLinkedDevices(data || []);
    } catch {
      /* ignore */
    }
    setFetchingDevices(false);
  }, [getToken, user]);

  useEffect(() => {
    if (isOpen && user) fetchLinkedDevices();
  }, [isOpen, user, fetchLinkedDevices]);

  const handleLink = async () => {
    if (!deviceInput || deviceInput.length < 4) return;
    setLoading(true);
    setResult(null);
    try {
      const token = getToken();
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/garmin-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_id: deviceInput.trim(),
          device_name: deviceName.trim() || 'Garmin Watch',
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.linked) {
        setResult({ success: true, message: data.message || 'Device linked!' });
        setDeviceInput('');
        setDeviceName('');
        fetchLinkedDevices();
      } else {
        setResult({ success: false, message: data.error || 'Link failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  const handleUnlink = async (deviceId) => {
    setLoading(true);
    setResult(null);
    try {
      const token = getToken();
      const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
      const resp = await fetch(`${apiOrigin}/api/garmin-link`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (resp.ok) {
        setResult({ success: true, message: 'Device unlinked' });
        fetchLinkedDevices();
      } else {
        const data = await resp.json();
        setResult({ success: false, message: data.error || 'Unlink failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setLoading(false);
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
              <Watch className="w-5 h-5 text-sky-500" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Link Garmin Watch</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {!user ? (
              <div className="text-center py-6">
                <Watch className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Sign in Required</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Log in to your LiftForecast account to link your Garmin watch.</p>
              </div>
            ) : (
              <>
                {/* How it works */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">How to link</p>
                  <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal pl-4">
                    <li>Open the UtahWindField app on your Garmin watch</li>
                    <li>Your device ID is shown on the main screen</li>
                    <li>Enter that ID below and tap Link</li>
                    <li>Sessions will auto-upload to the leaderboard</li>
                  </ol>
                </div>

                {/* Linked Devices */}
                {linkedDevices.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Linked Devices</h3>
                    <div className="space-y-2">
                      {linkedDevices.map(d => (
                        <div key={d.device_id} className={`flex items-center justify-between p-3 rounded-lg border ${
                          isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Watch className="w-4 h-4 text-emerald-500" />
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{d.device_name || 'Garmin Watch'}</p>
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                ID: {d.device_id} &middot; Linked {new Date(d.linked_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlink(d.device_id)}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                            title="Unlink device"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fetchingDevices && linkedDevices.length === 0 && (
                  <div className="flex items-center justify-center py-4 gap-2 text-[var(--text-tertiary)]">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Loading devices...</span>
                  </div>
                )}

                {/* Link New Device */}
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    {linkedDevices.length > 0 ? 'Link Another Device' : 'Link Device'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Device ID</label>
                      <input
                        type="text"
                        value={deviceInput}
                        onChange={(e) => setDeviceInput(e.target.value)}
                        placeholder="Enter device ID from watch"
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-tertiary)] block mb-1">Device Name (optional)</label>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="e.g. Fenix 8 Pro"
                        className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors ${
                          isDark
                            ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                        }`}
                      />
                    </div>
                    <button
                      onClick={handleLink}
                      disabled={loading || !deviceInput || deviceInput.length < 4}
                      className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        !loading && deviceInput.length >= 4
                          ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                      }`}
                    >
                      {loading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      {loading ? 'Linking...' : 'Link Device'}
                    </button>
                  </div>
                </div>

                {/* Result */}
                {result && (
                  <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    result.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {result.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {result.message}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
