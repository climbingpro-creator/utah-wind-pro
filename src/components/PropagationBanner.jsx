import React, { useMemo } from 'react';
import { Wind, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { scanForPropagation } from '../services/PropagationAlerts';

const URGENCY_STYLES = {
  imminent: {
    dark: 'bg-green-500/15 border-green-500/40',
    light: 'bg-green-50 border-green-300',
    icon: 'text-green-400',
    badge: 'bg-green-500 text-white',
    badgeText: 'ARRIVING',
  },
  incoming: {
    dark: 'bg-yellow-500/15 border-yellow-500/40',
    light: 'bg-yellow-50 border-yellow-300',
    icon: 'text-yellow-400',
    badge: 'bg-yellow-500 text-white',
    badgeText: 'INCOMING',
  },
  developing: {
    dark: 'bg-blue-500/10 border-blue-500/30',
    light: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    badge: 'bg-blue-500 text-white',
    badgeText: 'DEVELOPING',
  },
};

export default function PropagationBanner({ locationId, stationReadings, currentWind, translationFactor }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const alerts = useMemo(() =>
    scanForPropagation(locationId, stationReadings || {}, currentWind || {}, translationFactor || 0.55),
    [locationId, stationReadings, currentWind, translationFactor]
  );

  if (alerts.length === 0) return null;

  const primary = alerts[0];
  const style = URGENCY_STYLES[primary.urgency] || URGENCY_STYLES.developing;

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${isDark ? style.dark : style.light}`}>
      {/* Primary alert */}
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/60' : 'bg-white/80'}`}>
          <Wind className={`w-5 h-5 ${style.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
              {style.badgeText}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {primary.icon} {primary.stationName}
            </span>
          </div>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {primary.headline}
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {primary.detail}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`flex items-center gap-1 ${style.icon}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{primary.etaMinutes}m</span>
          </div>
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            ~{primary.etaTime}
          </div>
        </div>
      </div>

      {/* Additional alerts */}
      {alerts.length > 1 && (
        <div className={`flex flex-wrap gap-1.5 pt-1 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
          {alerts.slice(1, 3).map(a => {
            const s = URGENCY_STYLES[a.urgency] || URGENCY_STYLES.developing;
            return (
              <div key={a.id} className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800/40 text-slate-400' : 'bg-white/60 text-slate-500'}`}>
                <Zap className={`w-3 h-3 ${s.icon}`} />
                <span>{a.stationName}: {a.upstreamSpeed.toFixed(0)} mph {a.dirLabel}</span>
                <span className={`font-medium ${s.icon}`}>→ {a.expectedSpeed} mph by {a.etaTime}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
