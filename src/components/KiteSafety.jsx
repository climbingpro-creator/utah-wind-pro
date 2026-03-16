import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Wind, Anchor } from 'lucide-react';
import { LAKE_CONFIGS } from '../config/lakeStations';

/**
 * KITE SPEED THRESHOLDS
 * 
 * Foil Kite: 10+ mph (more efficient, works in lighter wind)
 * Twin Tip: 15+ mph (needs more power)
 */
export const KITE_SPEED_THRESHOLDS = {
  foil: {
    min: 10,
    ideal: 12,
    max: 30,
    label: 'Foil',
  },
  twinTip: {
    min: 15,
    ideal: 18,
    max: 35,
    label: 'Twin Tip',
  },
};

/**
 * Get kite-ability status based on wind speed
 */
export function getKiteSpeedStatus(windSpeed) {
  if (windSpeed == null) {
    return { foil: 'unknown', twinTip: 'unknown', message: 'No wind data' };
  }
  
  const foil = windSpeed >= KITE_SPEED_THRESHOLDS.foil.min;
  const twinTip = windSpeed >= KITE_SPEED_THRESHOLDS.twinTip.min;
  const overpowered = windSpeed > KITE_SPEED_THRESHOLDS.twinTip.max;
  
  if (overpowered) {
    return {
      foil: 'overpowered',
      twinTip: 'overpowered',
      message: `${windSpeed.toFixed(0)} mph - Very strong! Small kite only`,
      color: 'text-red-400',
    };
  }
  
  if (twinTip) {
    return {
      foil: 'ideal',
      twinTip: 'good',
      message: `${windSpeed.toFixed(0)} mph - Great for all kites!`,
      color: 'text-green-400',
    };
  }
  
  if (foil) {
    return {
      foil: 'good',
      twinTip: 'marginal',
      message: `${windSpeed.toFixed(0)} mph - Foil kite recommended`,
      color: 'text-cyan-400',
    };
  }
  
  return {
    foil: 'too-light',
    twinTip: 'too-light',
    message: `${windSpeed.toFixed(0)} mph - Too light for kiting`,
    color: 'text-slate-500',
  };
}

/**
 * Determine kite safety based on wind direction relative to shore
 * 
 * SAFE: Onshore (wind from water to land) or Side-on
 * CAUTION: Side-off (angled away from shore)
 * DANGEROUS: Offshore (wind from land to water)
 */
export function getKiteSafety(lakeId, windDirection) {
  const config = LAKE_CONFIGS[lakeId];
  if (!config?.kiting || windDirection == null) {
    return { 
      status: 'unknown', 
      message: 'No safety data', 
      safe: null,
      color: 'text-slate-400',
      bgColor: 'bg-slate-800/50',
      borderColor: 'border-slate-700',
      icon: AlertCircle,
      description: 'Shore orientation not mapped for this location.'
    };
  }

  const { kiting, shoreOrientation } = config;
  const dir = windDirection;

  // Normalize direction check for ranges that cross 0°
  const inRange = (d, min, max) => {
    if (min <= max) {
      return d >= min && d <= max;
    } else {
      return d >= min || d <= max;
    }
  };

  // Check onshore (SAFE - wind coming from water)
  if (inRange(dir, kiting.onshore.min, kiting.onshore.max)) {
    return {
      status: 'onshore',
      message: 'Onshore - SAFE',
      safe: true,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: CheckCircle,
      description: 'Wind blowing from water to land. Safe for kiting.',
    };
  }

  // Check side-on (SAFE)
  const isSideOn = inRange(dir, kiting.sideOn.min, kiting.sideOn.max) ||
    (kiting.sideOn.min2 != null && inRange(dir, kiting.sideOn.min2, kiting.sideOn.max2));
  
  if (isSideOn) {
    return {
      status: 'side-on',
      message: 'Side-on - SAFE',
      safe: true,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
      icon: CheckCircle,
      description: 'Wind parallel to shore. Safe for kiting.',
    };
  }

  // Check offshore (DANGEROUS)
  if (inRange(dir, kiting.offshore.min, kiting.offshore.max)) {
    return {
      status: 'offshore',
      message: 'OFFSHORE - DANGEROUS',
      safe: false,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      icon: XCircle,
      description: 'Wind blowing from land to water. DO NOT KITE - you will be blown out!',
    };
  }

  // Side-off (CAUTION)
  return {
    status: 'side-off',
    message: 'Side-off - CAUTION',
    safe: 'caution',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: AlertTriangle,
    description: 'Wind angled away from shore. Use caution - you may drift downwind.',
  };
}

export function KiteSafetyIndicator({ lakeId, windDirection, windSpeed, compact = false, activity = 'kiting' }) {
  const isSnowkite = activity === 'snowkiting';
  
  let safety = getKiteSafety(lakeId, windDirection);
  if (isSnowkite) {
    safety = {
      status: 'snowkite',
      message: 'Snowkite Mode',
      safe: true,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      icon: CheckCircle,
      description: 'Wind direction matters less on snow/ice. Focus on wind speed, snow condition, and terrain.',
    };
  }
  
  const speedStatus = getKiteSpeedStatus(windSpeed);
  const Icon = safety.icon || AlertCircle;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${safety.bgColor} border ${safety.borderColor}`}>
        <Icon className={`w-4 h-4 ${safety.color}`} />
        <span className={`text-sm font-medium ${safety.color}`}>
          {safety.status === 'unknown' ? 'Kite: ?' : safety.message}
        </span>
        {speedStatus.foil === 'too-light' && (
          <span className="text-xs text-slate-500">(too light)</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${safety.borderColor} ${safety.bgColor}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${safety.bgColor}`}>
          <Anchor className={`w-5 h-5 ${safety.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">Kite Safety</h3>
          <p className={`text-sm ${safety.color}`}>{safety.message}</p>
        </div>
        <Icon className={`w-6 h-6 ${safety.color} ml-auto`} />
      </div>
      
      <p className="text-sm text-slate-400 mb-3">{safety.description}</p>
      
      {/* Wind Speed Status for Kiting */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Foil Kite */}
        <div className={`rounded-lg p-2 border ${
          speedStatus.foil === 'ideal' || speedStatus.foil === 'good'
            ? 'bg-green-500/10 border-green-500/30'
            : speedStatus.foil === 'marginal'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Foil Kite</span>
            <span className="text-xs text-slate-500">10+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.foil === 'ideal' || speedStatus.foil === 'good'
              ? 'text-green-400'
              : speedStatus.foil === 'marginal'
                ? 'text-yellow-400'
                : 'text-slate-500'
          }`}>
            {speedStatus.foil === 'ideal' ? '✓ Ideal' :
             speedStatus.foil === 'good' ? '✓ Good' :
             speedStatus.foil === 'overpowered' ? '⚠ Strong' :
             '✗ Too Light'}
          </div>
        </div>
        
        {/* Twin Tip */}
        <div className={`rounded-lg p-2 border ${
          speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
            ? 'bg-green-500/10 border-green-500/30'
            : speedStatus.twinTip === 'marginal'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Twin Tip</span>
            <span className="text-xs text-slate-500">15+ mph</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${
            speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
              ? 'text-green-400'
              : speedStatus.twinTip === 'marginal'
                ? 'text-yellow-400'
                : 'text-slate-500'
          }`}>
            {speedStatus.twinTip === 'ideal' ? '✓ Ideal' :
             speedStatus.twinTip === 'good' ? '✓ Good' :
             speedStatus.twinTip === 'marginal' ? '~ Marginal' :
             speedStatus.twinTip === 'overpowered' ? '⚠ Strong' :
             '✗ Too Light'}
          </div>
        </div>
      </div>
      
      {/* Overall Status */}
      <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
        safety.safe === true && speedStatus.foil !== 'too-light'
          ? 'bg-green-500/10 text-green-400'
          : safety.safe === false
            ? 'bg-red-500/10 text-red-400'
            : 'bg-yellow-500/10 text-yellow-400'
      }`}>
        <Wind className="w-4 h-4" />
        <span>
          {windSpeed != null ? (
            safety.safe === false 
              ? `${windSpeed.toFixed(0)} mph but OFFSHORE - Do not kite!`
              : speedStatus.foil === 'too-light'
                ? `${windSpeed.toFixed(0)} mph - Need 10+ for foil, 15+ for twin tip`
                : speedStatus.twinTip === 'good' || speedStatus.twinTip === 'ideal'
                  ? `${windSpeed.toFixed(0)} mph - Great for all kites!`
                  : `${windSpeed.toFixed(0)} mph - Foil kite recommended`
          ) : 'Waiting for wind data...'}
        </span>
      </div>
    </div>
  );
}
