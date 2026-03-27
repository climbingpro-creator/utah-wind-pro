import { useState, useEffect, createElement } from 'react';
import { Bell, BellOff, Moon, Sun, Clock, Settings, X, Check } from 'lucide-react';
import { 
  getNotificationPrefs, 
  saveNotificationPrefs, 
  requestPermission,
} from '../services/NotificationService';
import { UTAH_LAKE_LAUNCHES, OTHER_LAKES } from './LakeSelector';

export function NotificationSettings({ isOpen, onClose }) {
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [permissionStatus, setPermissionStatus] = useState('default');
  
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);
  
  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setPermissionStatus('granted');
      setPrefs(p => ({ ...p, enabled: true }));
    } else {
      setPermissionStatus(Notification.permission);
    }
  };
  
  const handleSave = () => {
    saveNotificationPrefs(prefs);
    onClose();
  };
  
  const toggleLake = (lakeId) => {
    setPrefs(p => ({
      ...p,
      lakes: p.lakes.includes(lakeId)
        ? p.lakes.filter(id => id !== lakeId)
        : [...p.lakes, lakeId]
    }));
  };
  
  if (!isOpen) return null;
  
  const allLakes = [
    ...UTAH_LAKE_LAUNCHES.map(l => ({ id: l.id, name: l.name, group: 'Utah Lake' })),
    ...OTHER_LAKES.map(l => ({ id: l.id, name: l.name, group: 'Other' })),
  ];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-200">Notification Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-3">
                {permissionStatus === 'denied' 
                  ? 'Notifications are blocked. Please enable them in your browser settings.'
                  : 'Enable notifications to receive thermal alerts'}
              </p>
              {permissionStatus !== 'denied' && (
                <button
                  onClick={handleEnableNotifications}
                  className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          )}
          
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.enabled ? (
                <Bell className="w-5 h-5 text-cyan-400" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="text-slate-200 font-medium">Thermal Alerts</p>
                <p className="text-xs text-slate-500">Get notified about good wind days</p>
              </div>
            </div>
            <button
              onClick={() => setPrefs(p => ({ ...p, enabled: !p.enabled }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                prefs.enabled ? 'bg-cyan-500' : 'bg-slate-600'
              }`}
              disabled={permissionStatus !== 'granted'}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                prefs.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          {/* Alert Types */}
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Alert Times</p>
            
            <AlertTypeToggle
              icon={Moon}
              label="Evening Alert"
              sublabel="Tomorrow's outlook (6-9 PM)"
              enabled={prefs.dayBefore}
              onToggle={() => setPrefs(p => ({ ...p, dayBefore: !p.dayBefore }))}
              threshold={prefs.minProbability.dayBefore}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, dayBefore: v }
              }))}
              disabled={!prefs.enabled}
            />
            
            <AlertTypeToggle
              icon={Sun}
              label="Morning Alert"
              sublabel="Today's forecast (6-9 AM)"
              enabled={prefs.morning}
              onToggle={() => setPrefs(p => ({ ...p, morning: !p.morning }))}
              threshold={prefs.minProbability.morning}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, morning: v }
              }))}
              disabled={!prefs.enabled}
            />
            
            <AlertTypeToggle
              icon={Clock}
              label="Pre-Thermal Alert"
              sublabel="1-2 hours before peak"
              enabled={prefs.preThermal}
              onToggle={() => setPrefs(p => ({ ...p, preThermal: !p.preThermal }))}
              threshold={prefs.minProbability.preThermal}
              onThresholdChange={(v) => setPrefs(p => ({ 
                ...p, 
                minProbability: { ...p.minProbability, preThermal: v }
              }))}
              disabled={!prefs.enabled}
            />
          </div>
          
          {/* Lake Selection */}
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Alert Locations</p>
            <p className="text-xs text-slate-400">Select which locations to receive alerts for</p>
            
            <div className="grid grid-cols-2 gap-2">
              {allLakes.map(lake => (
                <button
                  key={lake.id}
                  onClick={() => toggleLake(lake.id)}
                  disabled={!prefs.enabled}
                  className={`px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    prefs.lakes.includes(lake.id)
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                  } ${!prefs.enabled ? 'opacity-50' : 'hover:border-slate-500'}`}
                >
                  <div className="flex items-center gap-2">
                    {prefs.lakes.includes(lake.id) && (
                      <Check className="w-3 h-3 text-cyan-400" />
                    )}
                    <span>{lake.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{lake.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertTypeToggle({ icon, label, sublabel, enabled, onToggle, threshold, onThresholdChange, disabled }) {
  return (
    <div className={`bg-slate-700/30 rounded-lg p-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon ? createElement(icon, { className: `w-4 h-4 ${enabled ? 'text-cyan-400' : 'text-slate-500'}` }) : null}
          <div>
            <p className={`text-sm font-medium ${enabled ? 'text-slate-200' : 'text-slate-400'}`}>{label}</p>
            <p className="text-xs text-slate-500">{sublabel}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`w-10 h-5 rounded-full transition-colors ${
            enabled ? 'bg-cyan-500' : 'bg-slate-600'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {enabled && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600">
          <span className="text-xs text-slate-500">Min probability:</span>
          <select
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300"
          >
            <option value={40}>40%</option>
            <option value={50}>50%</option>
            <option value={60}>60%</option>
            <option value={70}>70%</option>
            <option value={80}>80%</option>
          </select>
        </div>
      )}
    </div>
  );
}
