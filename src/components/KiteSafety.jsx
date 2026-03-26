import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Wind, Anchor, ShieldAlert, ShieldCheck } from 'lucide-react';
import { LAKE_CONFIGS } from '../config/lakeStations';
import { safeToFixed } from '../utils/safeToFixed';

/**
 * KITE SPEED THRESHOLDS
 */
export const KITE_SPEED_THRESHOLDS = {
  foil: { min: 10, ideal: 12, max: 30, label: 'Foil' },
  twinTip: { min: 15, ideal: 18, max: 35, label: 'Twin Tip' },
};

export function getKiteSpeedStatus(windSpeed) {
  if (windSpeed == null) {
    return { foil: 'unknown', twinTip: 'unknown', message: 'No wind data' };
  }
  const foil = windSpeed >= KITE_SPEED_THRESHOLDS.foil.min;
  const twinTip = windSpeed >= KITE_SPEED_THRESHOLDS.twinTip.min;
  const overpowered = windSpeed > KITE_SPEED_THRESHOLDS.twinTip.max;

  if (overpowered) return { foil: 'overpowered', twinTip: 'overpowered', message: `${safeToFixed(windSpeed, 0)} mph - Very strong! Small kite only`, color: 'text-red-400' };
  if (twinTip) return { foil: 'ideal', twinTip: 'good', message: `${safeToFixed(windSpeed, 0)} mph - Great for all kites!`, color: 'text-green-400' };
  if (foil) return { foil: 'good', twinTip: 'marginal', message: `${safeToFixed(windSpeed, 0)} mph - Foil kite recommended`, color: 'text-cyan-400' };
  return { foil: 'too-light', twinTip: 'too-light', message: `${safeToFixed(windSpeed, 0)} mph - Too light for kiting`, color: 'text-slate-500' };
}

// ─── GEOMETRY HELPERS (Safe-Arc model) ───────────────────────────────

/**
 * Checks if live wind direction falls inside the spot's safe arc.
 * safeArc = [startDegree, endDegree], read clockwise from start to end.
 * Returns 'ONSHORE_OR_SIDE' (inside arc) or 'OFFSHORE' (outside arc).
 */
export function getWindAngleType(windDir, safeArc) {
  if (windDir == null || !safeArc) return 'UNKNOWN';

  const [startArc, endArc] = safeArc;

  let isSafe;
  if (startArc < endArc) {
    isSafe = (windDir >= startArc && windDir <= endArc);
  } else {
    // Arc crosses North (0°), e.g. [270, 90]
    isSafe = (windDir >= startArc || windDir <= endArc);
  }

  return isSafe ? 'ONSHORE_OR_SIDE' : 'OFFSHORE';
}

// ─── DIRECTIONAL CONSEQUENCE MATRIX ──────────────────────────────────

export function evaluateKiteSafety(baseWind, gustWind, windDir, safeArc) {
  const gust = gustWind ?? baseWind;
  const gustSpread = gust - baseWind;
  const angleType = getWindAngleType(windDir, safeArc);

  let beginner = { status: 'GO', reason: '' };
  let expert = { status: 'GO', reason: '' };

  if (angleType === 'UNKNOWN') {
    return {
      angleType,
      beginner: { status: 'WAIT', reason: 'Missing shore geometry' },
      expert: { status: 'WAIT', reason: 'Missing shore geometry' },
    };
  }

  // Offshore dynamics — risk: stranding
  if (angleType === 'OFFSHORE') {
    beginner = { status: 'DANGER', reason: 'Offshore Wind (Do not launch)' };

    if (baseWind < 14) {
      expert = { status: 'DANGER', reason: 'Offshore Lulls (High risk of stranding)' };
    } else if (gustSpread > 15) {
      expert = { status: 'CAUTION', reason: 'Punchy Offshore (Boat support required)' };
    } else {
      expert = { status: 'CAUTION', reason: 'Offshore Flow (Experts & Boat Support Only)' };
    }
  }
  // Safe arc dynamics (onshore / side-shore) — risk: impact
  else {
    if (baseWind < 12) {
      beginner = { status: 'WAIT', reason: 'Lulls < 12 mph (Hard to relaunch)' };
    } else if (gust > 24) {
      beginner = { status: 'STOP', reason: 'Gusts > 24 mph (Too much power)' };
    } else if (gustSpread > 10) {
      beginner = { status: 'STOP', reason: 'Too punchy for learning' };
    } else {
      beginner = { status: 'GO', reason: 'Manageable power & safe direction' };
    }

    if (baseWind < 10) {
      expert = { status: 'FOIL', reason: 'Foil only' };
    } else if (gustSpread > 15 || baseWind > 35) {
      expert = { status: 'DANGER', reason: 'Violent rotors / Blown out' };
    } else if (gustSpread >= 10 && gustSpread <= 15) {
      expert = { status: 'GO', reason: 'Punchy launch, clean outside' };
    } else {
      expert = { status: 'GO', reason: 'Clean power' };
    }
  }

  return { angleType, beginner, expert };
}

// ─── LEGACY COMPAT: getKiteSafety (used by some callers) ────────────

export function getKiteSafety(lakeId, windDirection) {
  const config = LAKE_CONFIGS[lakeId];
  if (!config?.kiting || windDirection == null) {
    return {
      status: 'unknown', message: 'No safety data', safe: null,
      color: 'text-slate-400', bgColor: 'bg-slate-800/50',
      borderColor: 'border-slate-700', icon: AlertCircle,
      description: 'Shore orientation not mapped for this location.',
    };
  }
  const { kiting } = config;
  const dir = windDirection;
  const inRange = (d, min, max) => (min <= max ? d >= min && d <= max : d >= min || d <= max);

  if (inRange(dir, kiting.onshore.min, kiting.onshore.max)) {
    return { status: 'onshore', message: 'Onshore - SAFE', safe: true, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30', icon: CheckCircle, description: 'Wind blowing from water to land. Safe conditions.' };
  }
  const isSideOn = inRange(dir, kiting.sideOn.min, kiting.sideOn.max) || (kiting.sideOn.min2 != null && inRange(dir, kiting.sideOn.min2, kiting.sideOn.max2));
  if (isSideOn) {
    return { status: 'side-on', message: 'Side-on - SAFE', safe: true, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30', icon: CheckCircle, description: 'Wind parallel to shore. Safe conditions.' };
  }
  if (inRange(dir, kiting.offshore.min, kiting.offshore.max)) {
    return { status: 'offshore', message: 'OFFSHORE - DANGEROUS', safe: false, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30', icon: XCircle, description: 'Wind blowing from land to water. Dangerous — you will be pushed offshore!' };
  }
  return { status: 'side-off', message: 'Side-off - CAUTION', safe: 'caution', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30', icon: AlertTriangle, description: 'Wind angled away from shore. Use caution - you may drift downwind.' };
}

// ─── STATUS → STYLE MAPS ────────────────────────────────────────────

const STATUS_STYLES = {
  GO:      { bg: 'bg-green-500/15',  border: 'border-green-500/40', text: 'text-green-400',  darkText: 'text-green-600',  icon: ShieldCheck,  label: 'GO' },
  FOIL:    { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40',  text: 'text-cyan-400',   darkText: 'text-cyan-600',   icon: CheckCircle,  label: 'FOIL' },
  WAIT:    { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40',text: 'text-yellow-400', darkText: 'text-yellow-600', icon: AlertCircle,  label: 'WAIT' },
  CAUTION: { bg: 'bg-orange-500/15', border: 'border-orange-500/40',text: 'text-orange-400', darkText: 'text-orange-600', icon: AlertTriangle,label: 'CAUTION' },
  STOP:    { bg: 'bg-red-500/15',    border: 'border-red-500/40',   text: 'text-red-400',    darkText: 'text-red-600',    icon: XCircle,      label: 'STOP' },
  DANGER:  { bg: 'bg-red-500/20',    border: 'border-red-500/50',   text: 'text-red-400',    darkText: 'text-red-700',    icon: ShieldAlert,  label: 'DANGER' },
};

const ANGLE_LABELS = {
  ONSHORE_OR_SIDE: 'Safe Arc',
  OFFSHORE: 'Offshore',
  UNKNOWN: 'Unknown',
};

// ─── UI COMPONENT ────────────────────────────────────────────────────

export function KiteSafetyIndicator({ lakeId, windDirection, windSpeed, windGust, compact = false, activity = 'kiting' }) {
  const isSnowkite = activity === 'snowkiting';
  const config = LAKE_CONFIGS[lakeId];
  const safeArc = config?.safeWindArc ?? null;

  if (isSnowkite) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Snowkite Mode</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">Wind direction matters less on snow/ice. Focus on wind speed, snow condition, and terrain.</p>
      </div>
    );
  }

  const baseWind = windSpeed ?? 0;
  const gust = windGust ?? baseWind;
  const result = evaluateKiteSafety(baseWind, gust, windDirection, safeArc);
  const { angleType, beginner, expert } = result;
  const speedStatus = getKiteSpeedStatus(windSpeed);

  if (compact) {
    const worst = [beginner, expert].sort((a, b) => {
      const rank = { GO: 0, FOIL: 1, WAIT: 2, CAUTION: 3, STOP: 4, DANGER: 5 };
      return (rank[b.status] ?? 0) - (rank[a.status] ?? 0);
    })[0];
    const s = STATUS_STYLES[worst.status] || STATUS_STYLES.WAIT;
    const Icon = s.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} border ${s.border}`}>
        <Icon className={`w-4 h-4 ${s.text}`} />
        <span className={`text-sm font-medium ${s.text}`}>{s.label}: {worst.reason || ANGLE_LABELS[angleType]}</span>
      </div>
    );
  }

  const angleLabel = ANGLE_LABELS[angleType] || 'Unknown';
  const angleBg = angleType === 'ONSHORE_OR_SIDE' ? 'bg-green-500/10 text-green-400 border-green-500/30'
    : angleType === 'OFFSHORE' ? 'bg-red-500/10 text-red-400 border-red-500/30'
    : 'bg-slate-700/50 text-slate-400 border-slate-600';

  const renderPill = (label, assessment) => {
    const s = STATUS_STYLES[assessment.status] || STATUS_STYLES.WAIT;
    const Icon = s.icon;
    return (
      <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border ${s.bg} ${s.border}`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${s.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
            <span className={`text-xs font-extrabold ${s.text}`}>{s.label}</span>
          </div>
          <span className={`text-xs ${s.text} opacity-80`}>{assessment.reason}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <Anchor className="w-4 h-4 text-[var(--text-secondary)]" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            {activity === 'kiting' ? 'Kite Safety' : activity === 'windsurfing' ? 'Wind Safety' : activity === 'sailing' ? 'Shore Safety' : 'Wind Safety'}
          </h3>
        </div>
        {/* Angle type badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${angleBg}`}>
          {angleLabel}
        </span>
      </div>

      {/* Wind reading */}
      {windSpeed != null && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-secondary)]">
          <Wind className="w-3 h-3" />
          <span>{safeToFixed(windSpeed, 0)} mph{windDirection != null ? ` from ${safeToFixed(windDirection, 0)}°` : ''}{gust > baseWind * 1.2 ? ` G${safeToFixed(gust, 0)}` : ''}</span>
          {safeArc != null && <span className="text-[var(--text-tertiary)]">(Safe arc {safeArc[0]}°–{safeArc[1]}°)</span>}
        </div>
      )}

      {/* Dual pills */}
      <div className="space-y-2 mb-3">
        {renderPill('Beginner', beginner)}
        {renderPill('Expert / Local', expert)}
      </div>

      {/* Kite gear readiness */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg p-2 border ${
          speedStatus.foil === 'ideal' || speedStatus.foil === 'good' ? 'bg-green-500/10 border-green-500/30'
          : speedStatus.foil === 'marginal' ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Foil Kite</span>
            <span className="text-xs text-[var(--text-tertiary)]">10+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.foil === 'ideal' || speedStatus.foil === 'good' ? 'text-green-400'
            : speedStatus.foil === 'marginal' ? 'text-yellow-400' : 'text-slate-500'
          }`}>
            {speedStatus.foil === 'ideal' ? '✓ Ideal' : speedStatus.foil === 'good' ? '✓ Good' : speedStatus.foil === 'overpowered' ? '⚠ Strong' : '✗ Too Light'}
          </div>
        </div>
        <div className={`rounded-lg p-2 border ${
          speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal' ? 'bg-green-500/10 border-green-500/30'
          : speedStatus.twinTip === 'marginal' ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Twin Tip</span>
            <span className="text-xs text-[var(--text-tertiary)]">15+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal' ? 'text-green-400'
            : speedStatus.twinTip === 'marginal' ? 'text-yellow-400' : 'text-slate-500'
          }`}>
            {speedStatus.twinTip === 'ideal' ? '✓ Ideal' : speedStatus.twinTip === 'good' ? '✓ Good' : speedStatus.twinTip === 'marginal' ? '~ Marginal' : speedStatus.twinTip === 'overpowered' ? '⚠ Strong' : '✗ Too Light'}
          </div>
        </div>
      </div>
    </div>
  );
}
