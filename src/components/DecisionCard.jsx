import { CheckCircle, Clock, XCircle, ArrowRight, Lightbulb, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { safeToFixed } from '../utils/safeToFixed';

function formatHour(h) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function dirLabel(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getDecision(activity, windSpeed, windGust, thermalPrediction, boatingPrediction, windDirection, briefing, locationName) {
  const cfg = ACTIVITY_CONFIGS[activity];
  if (!cfg) return null;

  const speed = windSpeed ?? 0;
  const gust = windGust ?? speed;
  const dir = windDirection;
  const thermal = thermalPrediction || {};
  const prob = thermal.windProbability ?? thermal.probability ?? 0;
  const startHour = thermal.startHour;
  const endHour = thermal.endHour;
  const now = new Date().getHours();
  const nf = thermal.northFlow;
  const isNorthFlow = nf?.status === 'strong' || nf?.status === 'moderate' || nf?.persistenceHours >= 2;
  const spot = locationName || 'your spot';

  if (cfg.wantsWind) {
    const good = cfg.goodCondition?.(speed, gust);
    const tooLight = cfg.thresholds?.tooLight ?? 6;
    const ideal = cfg.thresholds?.ideal;
    const tooStrong = cfg.thresholds?.tooStrong ?? 30;
    const gustFactor = gust > 0 && speed > 0 ? gust / speed : 1;
    const gustLimit = cfg.thresholds?.gustFactor ?? 1.5;

    const isPG = activity === 'paragliding';
    const goVerb = isPG ? 'fly' : 'ride';

    if (good && ideal && speed >= ideal.min && speed <= ideal.max && gustFactor <= gustLimit) {
      const untilStr = endHour && endHour > now ? ` until ~${formatHour(endHour)}` : '';
      return {
        decision: 'GO',
        headline: `GO to ${spot} now`,
        detail: `${Math.round(speed)} mph ${dirLabel(dir)} — ideal range${untilStr}`,
        action: briefing?.bestAction || (isPG ? 'Conditions are perfect — go fly' : 'Get on the water — conditions are perfect'),
        color: 'emerald',
        icon: CheckCircle,
      };
    }

    if (good) {
      const untilStr = endHour && endHour > now ? ` — good until ~${formatHour(endHour)}` : '';
      return {
        decision: 'GO',
        headline: `GO — ${cfg.name} is on`,
        detail: `${Math.round(speed)} mph ${dirLabel(dir)}${untilStr}`,
        action: briefing?.bestAction || (isPG ? 'Flyable conditions — head to launch' : `Conditions are ${goVerb}able — get out there`),
        color: 'emerald',
        icon: CheckCircle,
      };
    }

    if (speed >= tooLight && speed < (ideal?.min ?? tooLight) && gustFactor < 1.4) {
      return {
        decision: 'GO',
        headline: isPG ? `GO — light but flyable` : `GO — light but rideable`,
        detail: isPG
          ? `${Math.round(speed)} mph ${dirLabel(dir)} — light lift, stay close to ridge`
          : `${Math.round(speed)} mph ${dirLabel(dir)} — foil-friendly conditions`,
        action: briefing?.bestAction || (isPG ? `Light conditions — stay close to the hill` : `Light wind session — bring your big kite or foil`),
        color: 'lime',
        icon: CheckCircle,
      };
    }

    if (speed > tooStrong) {
      return {
        decision: 'PASS',
        headline: `Too strong — ${Math.round(speed)} mph`,
        detail: isPG
          ? `Dangerous for ${cfg.name}. Gusts exceed safe limits at ${spot}.`
          : `Dangerous conditions at ${spot}. Wait for wind to drop below ${tooStrong} mph.`,
        action: isPG ? 'Do not launch — conditions are dangerous' : 'Stay off the water — safety first',
        color: 'red',
        icon: XCircle,
      };
    }

    if (gustFactor > gustLimit && speed >= tooLight) {
      return {
        decision: 'WAIT',
        headline: `Gusty — ${Math.round(speed)}G${Math.round(gust)} mph`,
        detail: isPG
          ? `Gust spread too wide for safe ${cfg.name}. Wait for stabilization.`
          : `Gusts too high for safe ${activity}. Wait for conditions to stabilize.`,
        action: briefing?.bestAction || (isPG
          ? `Watch the cycles — gust spread needs to tighten`
          : `Monitor gusts — needs to settle below ${Math.round(speed * gustLimit)} mph`),
        color: 'amber',
        icon: Clock,
      };
    }

    if (isNorthFlow && speed < tooLight && prob >= 30) {
      return {
        decision: 'WAIT',
        headline: `North flow building — ${prob}% chance`,
        detail: `Currently ${Math.round(speed)} mph. Upstream stations show incoming wind.`,
        action: briefing?.bestAction || `Monitor KSLC — wind arriving within the hour`,
        color: 'amber',
        icon: Clock,
      };
    }

    if (prob >= 50 && startHour && now < startHour) {
      const arriveBy = Math.max(0, startHour - 1);
      return {
        decision: 'WAIT',
        headline: `Wind expected at ${formatHour(startHour)}`,
        detail: `${prob}% probability. Be rigged and ready by ${formatHour(arriveBy)}.`,
        action: briefing?.bestAction || `Arrive at ${spot} by ${formatHour(arriveBy)}`,
        color: 'amber',
        icon: Clock,
      };
    }

    if (prob >= 30 && startHour && now < startHour) {
      return {
        decision: 'WAIT',
        headline: `Possible wind at ${formatHour(startHour)}`,
        detail: `${prob}% probability — watch upstream stations for confirmation.`,
        action: briefing?.bestAction || `Check back at ${formatHour(Math.max(0, startHour - 2))}`,
        color: 'amber',
        icon: Clock,
      };
    }

    return {
      decision: 'PASS',
      headline: `Not enough wind for ${cfg.name}`,
      detail: `${speed > 0 ? `${Math.round(speed)} mph` : 'Calm'} — need ${tooLight}+ mph.${prob > 0 ? ` ${prob}% chance later.` : ''}`,
      action: briefing?.bestAction || 'Check back later — conditions may change',
      color: 'slate',
      icon: XCircle,
    };
  }

  // Calm-seeking activities
  const idealMax = cfg.thresholds?.ideal?.max ?? 8;
  const choppy = cfg.thresholds?.choppy ?? cfg.thresholds?.manageable ?? 12;
  const rough = cfg.thresholds?.rough ?? cfg.thresholds?.difficult ?? 15;

  if (speed <= idealMax) {
    const isGlass = speed <= 2;
    const glassStr = boatingPrediction?.glassUntil ? ` until ~${formatHour(boatingPrediction.glassUntil)}` : startHour ? ` until ~${formatHour(startHour)}` : '';
    const glassWord = activity === 'fishing' ? 'Calm water' : activity === 'paddling' ? 'Flat water' : 'Glass';
    return {
      decision: 'GO',
      headline: `GO — ${isGlass ? glassWord : 'great conditions'}${glassStr}`,
      detail: isGlass
        ? (activity === 'fishing' ? `Still water — surface feeding active at ${spot}` : `Mirror-flat at ${spot} — go now before wind builds`)
        : `${Math.round(speed)} mph — ${activity === 'fishing' ? 'light ripple, great for casting' : 'nearly flat water'}`,
      action: briefing?.bestAction || (isGlass ? `Launch now — ${glassWord} won't last` : `Conditions are great for ${activity}`),
      color: 'emerald',
      icon: CheckCircle,
    };
  }

  if (speed <= choppy) {
    const calmTime = endHour && endHour < 22 ? endHour + 1 : null;
    return {
      decision: 'WAIT',
      headline: `Light chop — ${Math.round(speed)} mph`,
      detail: activity === 'fishing'
        ? `Manageable for fishing — try sheltered banks`
        : `Getting choppy for ${activity}${calmTime ? `. Calm after ~${formatHour(calmTime)}` : ''}`,
      action: briefing?.bestAction || (calmTime ? `Wait until ${formatHour(calmTime)} for calmer water` : `Try a sheltered spot`),
      color: 'amber',
      icon: Clock,
    };
  }

  if (speed <= rough) {
    const calmTime = endHour && endHour < 22 ? endHour + 1 : null;
    return {
      decision: 'PASS',
      headline: `Too rough — ${Math.round(speed)} mph`,
      detail: activity === 'fishing'
        ? `Shore fishing only — too rough for a boat`
        : `${cfg.name} not recommended right now`,
      action: calmTime ? `Wait until after ${formatHour(calmTime)}` : 'Try early morning tomorrow',
      color: 'red',
      icon: XCircle,
    };
  }

  return {
    decision: 'PASS',
    headline: `Dangerous — ${Math.round(speed)} mph winds`,
    detail: `Stay off the water. Wind far exceeds safe limits for ${activity}.`,
    action: 'Do not go out — conditions are dangerous',
    color: 'red',
    icon: XCircle,
  };
}

const DECISION_STYLES = {
  emerald: {
    dark: 'bg-emerald-500/[0.08] border-emerald-500/30 ring-1 ring-emerald-500/20',
    light: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-500 text-white',
    text: { dark: 'text-emerald-400', light: 'text-emerald-700' },
    action: { dark: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', light: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  },
  lime: {
    dark: 'bg-lime-500/[0.06] border-lime-500/25 ring-1 ring-lime-500/15',
    light: 'bg-lime-50 border-lime-200',
    badge: 'bg-lime-500 text-white',
    text: { dark: 'text-lime-400', light: 'text-lime-700' },
    action: { dark: 'bg-lime-500/10 border-lime-500/20 text-lime-400', light: 'bg-lime-50 border-lime-200 text-lime-700' },
  },
  amber: {
    dark: 'bg-amber-500/[0.06] border-amber-500/25 ring-1 ring-amber-500/15',
    light: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-500 text-white',
    text: { dark: 'text-amber-400', light: 'text-amber-700' },
    action: { dark: 'bg-amber-500/10 border-amber-500/20 text-amber-400', light: 'bg-amber-50 border-amber-200 text-amber-700' },
  },
  red: {
    dark: 'bg-red-500/[0.06] border-red-500/25 ring-1 ring-red-500/15',
    light: 'bg-red-50 border-red-200',
    badge: 'bg-red-500 text-white',
    text: { dark: 'text-red-400', light: 'text-red-700' },
    action: { dark: 'bg-red-500/10 border-red-500/20 text-red-400', light: 'bg-red-50 border-red-200 text-red-700' },
  },
  slate: {
    dark: 'bg-slate-500/[0.06] border-slate-500/25',
    light: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-500 text-white',
    text: { dark: 'text-slate-400', light: 'text-slate-600' },
    action: { dark: 'bg-slate-500/10 border-slate-500/20 text-slate-400', light: 'bg-slate-50 border-slate-200 text-slate-600' },
  },
};

export default function DecisionCard({
  activity,
  windSpeed,
  windGust,
  windDirection,
  thermalPrediction,
  boatingPrediction,
  briefing,
  locationName,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const result = getDecision(
    activity, windSpeed, windGust,
    thermalPrediction, boatingPrediction,
    windDirection, briefing, locationName,
  );

  if (!result) return null;

  const s = DECISION_STYLES[result.color] || DECISION_STYLES.slate;
  const Icon = result.icon;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${isDark ? s.dark : s.light}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${s.badge}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${s.badge}`}>
              {result.decision}
            </span>
            {locationName && (
              <span className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <MapPin className="w-3 h-3" /> {locationName}
              </span>
            )}
          </div>
          <h3 className={`text-lg font-extrabold leading-snug ${isDark ? s.text.dark : s.text.light}`}>
            {result.headline}
          </h3>
          <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {result.detail}
          </p>
        </div>
      </div>

      {result.action && (
        <div className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border ${isDark ? s.action.dark : s.action.light}`}>
          <Lightbulb className="w-4 h-4 shrink-0" />
          <span className="flex-1">{result.action}</span>
          <ArrowRight className="w-4 h-4 shrink-0 opacity-50" />
        </div>
      )}
    </div>
  );
}
