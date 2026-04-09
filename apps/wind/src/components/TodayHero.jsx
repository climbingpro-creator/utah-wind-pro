import React, { useMemo } from 'react';
import { ChevronRight, CheckCircle, MapPin, Zap, ArrowRight, Clock, Wind, Sunrise, Moon, Sunset } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_CONFIGS } from './ActivityMode';
import { getRotatingImage } from '../config/imagePool';
import { estimateSessionDuration, LAKE_CONFIGS } from '@utahwind/weather';

const ALL_ACTIVITIES = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'boating', 'paddling', 'fishing', 'windsurfing'];

// Activities that require daylight for safety
const DAYLIGHT_REQUIRED = ['kiting', 'paragliding', 'sailing', 'snowkiting', 'windsurfing', 'paddling'];

// Calculate sunrise/sunset for daylight checks
function calculateDaylight(lat = 40.45) {
  const date = new Date();
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const hour = date.getHours() + date.getMinutes() / 60;
  
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  let cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  cosHourAngle = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
  
  const solarNoon = 12;
  const sunrise = solarNoon - hourAngle / 15;
  const sunset = solarNoon + hourAngle / 15;
  
  const isNight = hour < sunrise - 0.5 || hour > sunset + 0.5;
  const isTwilight = (hour >= sunrise - 0.5 && hour < sunrise) || (hour > sunset && hour <= sunset + 0.5);
  const isDaylight = hour >= sunrise && hour <= sunset;
  const daylightHoursRemaining = isDaylight ? Math.max(0, sunset - hour) : 0;
  
  return { sunrise, sunset, isNight, isTwilight, isDaylight, daylightHoursRemaining, currentHour: hour };
}

function formatSunTime(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatHour(h) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function sessionLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `~${h} hr${h > 1 ? 's' : ''}`;
}

function getActivityVerdict(id, speed, gust, thermalPrediction, _boatingPrediction, propagation) {
  const cfg = ACTIVITY_CONFIGS[id];
  if (!cfg) return null;
  
  // ─── DAYLIGHT CHECK — Critical for outdoor activities ───────────
  const daylight = calculateDaylight();
  const requiresDaylight = DAYLIGHT_REQUIRED.includes(id);
  
  if (requiresDaylight && daylight.isNight) {
    return {
      status: 'off',
      label: 'AFTER DARK',
      reason: `No ${id === 'paragliding' ? 'flying' : 'sessions'} at night. Sunrise at ${formatSunTime(daylight.sunrise)}`,
      color: 'indigo',
      isNight: true,
    };
  }
  
  if (requiresDaylight && daylight.isTwilight) {
    const isMorning = daylight.currentHour < 12;
    return {
      status: 'wait',
      label: isMorning ? 'DAWN' : 'DUSK',
      reason: isMorning 
        ? `Wait for sunrise at ${formatSunTime(daylight.sunrise)}`
        : `Fading light — pack up for safety`,
      color: 'purple',
      isTwilight: true,
    };
  }
  
  const good = cfg.goodCondition?.(speed, gust);
  const now = new Date().getHours();
  const thermal = thermalPrediction || {};
  const thermalStart = thermal.startHour || 10;
  const thermalEnd = thermal.endHour || 17;
  const prob = thermal.probability || 0;

  const dominantChain = propagation?.dominant?.type;
  const session = dominantChain ? estimateSessionDuration(dominantChain, id) : null;

  const dominantChainData = propagation?.chains?.find(c => c.type === dominantChain);
  const estTargetSpeed = dominantChainData?.estimatedTargetSpeed ?? propagation?.chains?.[0]?.estimatedTargetSpeed;

  const isNorthFlow = dominantChain?.includes('north_flow') || dominantChain?.includes('postfrontal');
  const isNonThermalWind = isNorthFlow || (prob < 20 && speed >= (cfg.thresholds?.tooLight || 6));

  const actualSpeed = speed;
  const proxyWarning = id !== 'paragliding' && estTargetSpeed != null && estTargetSpeed < speed * 0.8;
  
  // Add sunset warning to good conditions if less than 2 hours of light
  const sunsetWarning = requiresDaylight && daylight.daylightHoursRemaining > 0 && daylight.daylightHoursRemaining < 2
    ? ` (${daylight.daylightHoursRemaining.toFixed(1)}h light left)`
    : '';

  if (good && cfg.wantsWind) {
    if ((session?.source === 'learned' || session?.source === 'pws-backfill') && session.avgMinutes < 45) {
      return {
        status: 'caution', label: 'BRIEF',
        reason: `${Math.round(speed)} mph but avg session only ${session.avgMinutes} min — stranding risk`,
        color: 'amber',
      };
    }

    const minForActivity = cfg.thresholds?.tooLight || 6;
    if (id !== 'paragliding' && actualSpeed < minForActivity + 4 && actualSpeed >= minForActivity) {
      const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} expected` : '';
      return {
        status: 'caution', label: 'MARGINAL',
        reason: `${Math.round(speed)} mph — barely usable, may not sustain${sessionStr}`,
        color: 'amber',
      };
    }

    if (proxyWarning && estTargetSpeed != null) {
      return {
        status: 'caution', label: 'CHECK',
        reason: `Upstream ${Math.round(speed)} mph → ~${Math.round(estTargetSpeed)} at your launch`,
        color: 'amber',
      };
    }

    const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} session` : '';
    const ideal = cfg.thresholds?.ideal;
    if (ideal && actualSpeed >= ideal.min && actualSpeed <= ideal.max) {
      return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — ideal range${sessionStr}${sunsetWarning}`, color: 'emerald' };
    }
    return { status: 'go', label: 'GO', reason: `${Math.round(speed)} mph — conditions active${sessionStr}${sunsetWarning}`, color: 'emerald' };
  }

  if (good && !cfg.wantsWind) {
    const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} window` : '';
    const actId = Object.entries(ACTIVITY_CONFIGS).find(([, v]) => v === cfg)?.[0];
    if (speed <= 2) {
      const glassLabel = actId === 'fishing' ? 'CALM' : actId === 'paddling' ? 'FLAT' : 'GLASS';
      const glassReason = actId === 'fishing' ? `Still water — fish are active${sessionStr}`
        : actId === 'paddling' ? `Mirror-flat — perfect paddle${sessionStr}`
        : `Mirror-flat — perfect boat day${sessionStr}`;
      return { status: 'go', label: glassLabel, reason: glassReason, color: 'emerald' };
    }
    const goodReason = actId === 'fishing' ? `Light ripple (${Math.round(speed)} mph) — great casting${sessionStr}`
      : actId === 'paddling' ? `Light wind (${Math.round(speed)} mph) — easy paddle${sessionStr}`
      : `Light wind (${Math.round(speed)} mph) — smooth cruising${sessionStr}`;
    return { status: 'go', label: 'GOOD', reason: goodReason, color: 'lime' };
  }

  if (cfg.wantsWind) {
    if (speed < (cfg.thresholds?.tooLight || 6)) {
      if (isNorthFlow && prob >= 30) {
        const estStr = estTargetSpeed != null ? ` (~${Math.round(estTargetSpeed)} mph expected)` : '';
        return { status: 'wait', label: 'BUILDING', reason: `North flow developing — ${prob}% chance${estStr}`, color: 'amber' };
      }
      if (prob >= 50 && now < thermalEnd) {
        const estStr = estTargetSpeed != null ? ` (~${Math.round(estTargetSpeed)} mph expected here)` : '';
        const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} if it arrives` : '';
        const windType = id === 'snowkiting' ? 'wind' : id === 'paragliding' ? 'lift' : 'thermal';
        return { status: 'wait', label: 'WAIT', reason: `${prob}% ${windType} by ${formatHour(thermalStart)}${estStr}${sessionStr}`, color: 'amber', window: formatHour(thermalStart) };
      }
      return { status: 'off', label: 'TOO LIGHT', reason: `${Math.round(speed)} mph — need ${cfg.thresholds?.tooLight || 6}+`, color: 'slate' };
    }
    if (speed > (cfg.thresholds?.tooStrong || 30)) {
      return { status: 'off', label: 'TOO STRONG', reason: `${Math.round(speed)} mph — unsafe`, color: 'red' };
    }
    const gf = gust > 0 && speed > 0 ? gust / speed : 1;
    if (gf > (cfg.thresholds?.gustFactor || 1.5)) {
      return { status: 'caution', label: 'GUSTY', reason: `${Math.round(speed)}G${Math.round(gust)} mph — gusty`, color: 'amber' };
    }

    if (!good) {
      const tooLight = cfg.thresholds?.tooLight || 6;
      const sessionStr = session ? ` — ${sessionLabel(session.avgMinutes)} session` : '';
      if (isNonThermalWind && gf < 1.4) {
        return { status: 'go', label: 'USABLE', reason: `${Math.round(speed)} mph ${isNorthFlow ? 'north flow' : ''} — clean wind${sessionStr}`, color: 'lime' };
      }
      if (gf < 1.3) {
        return { status: 'caution', label: 'FOILABLE', reason: `${Math.round(speed)} mph — light but usable${sessionStr}`, color: 'amber' };
      }
      if (isNorthFlow || isNonThermalWind) {
        return { status: 'wait', label: 'BUILDING', reason: `${Math.round(speed)} mph ${isNorthFlow ? 'north flow' : ''} — watching for increase`, color: 'amber' };
      }
      return { status: 'caution', label: 'MARGINAL', reason: `${Math.round(speed)} mph — above ${tooLight} mph minimum${sessionStr}`, color: 'amber' };
    }
  } else {
    const dangerThreshold = cfg.thresholds?.dangerous ?? cfg.thresholds?.difficult ?? 20;
    const roughThreshold = cfg.thresholds?.rough ?? cfg.thresholds?.choppy ?? 15;
    const choppyThreshold = cfg.thresholds?.choppy ?? cfg.thresholds?.manageable ?? 8;

    if (speed >= dangerThreshold) return { status: 'off', label: 'DANGEROUS', reason: `${Math.round(speed)} mph — unsafe conditions`, color: 'red' };
    if (speed >= roughThreshold) return { status: 'off', label: 'ROUGH', reason: `${Math.round(speed)} mph — too rough`, color: 'red' };
    if (speed >= choppyThreshold) {
      if (isNonThermalWind) {
        return { status: 'off', label: 'CHOPPY', reason: `${Math.round(speed)} mph north flow — extended wind likely`, color: 'orange' };
      }
      const calmAfter = thermalEnd + 1;
      if (calmAfter < 21 && now < calmAfter) {
        return { status: 'wait', label: 'WINDY', reason: `Calm expected after ${formatHour(calmAfter)}`, color: 'amber', window: `After ${formatHour(calmAfter)}` };
      }
      return { status: 'off', label: 'CHOPPY', reason: `${Math.round(speed)} mph — choppy`, color: 'orange' };
    }
  }

  return { status: 'off', label: 'OFF', reason: 'Not ideal right now', color: 'slate' };
}

// Step 1: Build heuristic cards from raw wind + thermal + propagation
function buildCards(windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation) {
  const speed = windSpeed ?? 0;
  const gust = windGust ?? speed;
  const fpsSpeed = fpsStation?.speed ?? fpsStation?.windSpeed;
  const fpsGust = fpsStation?.gust ?? fpsStation?.windGust;
  const utalpSpeed = utalpStation?.speed ?? utalpStation?.windSpeed;

  const cards = ALL_ACTIVITIES.map(id => {
    let useSpeed = speed;
    let useGust = gust;
    if (id === 'paragliding') {
      useSpeed = fpsSpeed ?? utalpSpeed ?? speed;
      useGust = fpsGust ?? useGust;
    }
    return {
      id,
      cfg: ACTIVITY_CONFIGS[id],
      verdict: getActivityVerdict(id, useSpeed, useGust, thermalPrediction, boatingPrediction, propagation),
    };
  });

  return { cards, speed, gust };
}

// Step 2: Overlay unified scores — only override when they disagree on go/not-go
function applyUnifiedOverrides(cards, unifiedActivities) {
  if (!unifiedActivities) return cards;
  return cards.map(card => {
    const ua = unifiedActivities[card.id];
    if (!ua || !ua.message || ua.score <= 0) return card;

    const hStatus = card.verdict?.status;
    const uStatus = ua.status === 'dangerous' ? 'off' : ua.status;
    const hIsGo = hStatus === 'go';
    const uIsGo = uStatus === 'go';
    if (hIsGo === uIsGo) return card;

    return {
      ...card,
      verdict: {
        status: uStatus,
        label: uStatus === 'go' ? 'GO' : uStatus === 'wait' ? 'WAIT' : ua.status === 'dangerous' ? 'DANGER' : card.verdict?.label || 'OFF',
        reason: ua.message,
        color: uStatus === 'go' ? 'emerald' : uStatus === 'wait' ? 'amber' : ua.status === 'dangerous' ? 'red' : 'slate',
      },
    };
  });
}

// Step 3: Compute headline from final cards + full unified prediction intelligence
function buildHeadline(cards, speed, selectedActivity, prediction) {
  const selectedCard = cards.find(c => c.id === selectedActivity);
  const selectedVerdict = selectedCard?.verdict;
  const selectedName = selectedCard?.cfg?.name || 'Activity';

  const goCards = cards.filter(c => c.verdict?.status === 'go');
  const goCount = goCards.length;
  const waitCount = cards.filter(c => c.verdict?.status === 'wait').length;
  const selectedIsGo = selectedVerdict?.status === 'go';
  const selectedIsWait = selectedVerdict?.status === 'wait' || selectedVerdict?.status === 'caution';

  const ub = prediction?.briefing;
  const up = prediction?.propagation;
  const uPressure = prediction?.pressure;

  let mood = 'neutral';
  let headline = '';
  let subline = '';
  let context = '';

  // Build upstream intelligence context from live prediction signals
  if (up?.phase === 'building' || up?.phase === 'approaching') {
    const src = up.dominantSource || 'upstream';
    context = up.eta
      ? `Wind propagating from ${src} — ETA ~${up.eta} min`
      : `Wind detected at ${src} — propagating toward you`;
  } else if (up?.phase === 'arrived') {
    context = 'Wind has arrived at your station';
  }

  if (uPressure?.gradient != null && !context) {
    const grad = uPressure.gradient;
    if (uPressure.thermalBusted) {
      context = `Gradient +${Math.abs(grad).toFixed(1)} mb — thermal busted, north flow dominant`;
    } else if (uPressure.northFlowRisk) {
      context = `North flow risk — gradient ${grad > 0 ? '+' : ''}${grad.toFixed(1)} mb`;
    } else if (Math.abs(grad) < 0.5) {
      context = `Flat gradient (${grad.toFixed(1)} mb) — no strong thermal driver`;
    } else if (grad < -0.5) {
      context = `Favorable gradient (${grad.toFixed(1)} mb) — thermal building`;
    }
  }

  // Prefer the unified prediction's smart headline when available
  if (ub?.headline && prediction?.decision) {
    const dec = prediction.decision;
    if (dec === 'GO') {
      mood = goCount >= 4 ? 'epic' : 'good';
      headline = ub.headline;
      subline = ub.body || selectedVerdict?.reason || '';
    } else if (dec === 'WAIT') {
      mood = 'mixed';
      headline = ub.headline;
      subline = ub.body || selectedVerdict?.reason || '';
    } else if (dec === 'PASS') {
      mood = speed <= 3 ? 'calm' : 'neutral';
      headline = ub.headline;
      subline = ub.body || selectedVerdict?.reason || '';
    } else {
      headline = '';
    }
  }

  // Fallback to card-based headline
  if (!headline) {
    if (selectedIsGo && goCount >= 4) {
      mood = 'epic';
      headline = `${selectedName} is ON — everything is firing`;
      subline = selectedVerdict.reason;
    } else if (selectedIsGo) {
      mood = 'good';
      headline = `${selectedName} is GO`;
      subline = selectedVerdict.reason;
    } else if (selectedIsWait && goCount > 0) {
      mood = 'mixed';
      const goNames = goCards.filter(c => c.id !== selectedActivity).slice(0, 2).map(c => c.cfg.name);
      headline = `${selectedVerdict.label} for ${selectedName}`;
      subline = selectedVerdict.reason + (goNames.length ? ` — ${goNames.join(' & ')} are GO now` : '');
    } else if (selectedIsWait) {
      mood = 'mixed';
      headline = `${selectedVerdict.label} for ${selectedName}`;
      subline = selectedVerdict.reason;
    } else if (selectedVerdict?.status === 'off' && goCount > 0) {
      mood = 'calm';
      const goNames = goCards.slice(0, 3).map(c => c.cfg.name);
      headline = `Too ${speed < 5 ? 'light' : 'strong'} for ${selectedName}`;
      subline = `${Math.round(speed)} mph — ${goNames.join(', ')} ${goNames.length === 1 ? 'is' : 'are'} ideal right now`;
    } else if (waitCount > 0) {
      mood = 'mixed';
      const waitCard = cards.find(c => c.verdict?.status === 'wait');
      headline = `Wind building — watching for ${selectedName}`;
      subline = waitCard.verdict.reason;
    } else if (speed <= 3) {
      mood = 'calm';
      const calmActivities = goCards.map(c => c.cfg.name);
      headline = calmActivities.length > 0
        ? `Glassy & calm — ideal for ${calmActivities.slice(0, 2).join(' & ')}`
        : 'Glass conditions — calm water';
      subline = `${Math.round(speed)} mph — too light for ${selectedName}`;
    } else {
      mood = 'neutral';
      headline = 'Quiet conditions';
      subline = selectedVerdict?.reason || 'No strong signals right now — check back later';
    }
  }

  return { headline, subline, mood, context };
}

const MOOD_ACCENT = {
  epic: 'text-emerald-500',
  good: 'text-sky-500',
  calm: 'text-indigo-500',
  mixed: 'text-amber-500',
  neutral: 'text-slate-400',
};

function ForecastSparkline({ hours, isDark, bgImage }) {
  if (!hours || hours.length === 0) return null;
  
  const now = new Date().getHours();
  
  const getSegmentColor = (speed) => {
    if (speed >= 18) return 'bg-amber-500';
    if (speed >= 12) return 'bg-emerald-500';
    if (speed >= 8) return 'bg-cyan-500';
    return isDark ? 'bg-slate-700' : 'bg-slate-300';
  };
  
  const getSegmentLabel = (speed) => {
    if (speed >= 18) return 'Strong';
    if (speed >= 12) return 'Ideal';
    if (speed >= 8) return 'Usable';
    return 'Light';
  };

  return (
    <div className={`rounded-lg p-3 ${bgImage ? 'bg-black/20 backdrop-blur-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-3 h-3 ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`}>
          24-Hour Forecast
        </span>
        <div className="flex items-center gap-2 ml-auto text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Light</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Usable</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ideal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Strong</span>
        </div>
      </div>
      
      {/* Sparkline bar */}
      <div className="flex gap-0.5 h-6 rounded overflow-hidden">
        {hours.slice(0, 24).map((h, i) => {
          const speed = h.windSpeed || h.speed || 0;
          const hourNum = typeof h.time === 'string' && h.time.includes(':') 
            ? parseInt(h.time.split(':')[0]) 
            : (now + i) % 24;
          const isNow = hourNum === now;
          
          return (
            <div
              key={i}
              className={`flex-1 relative group cursor-default transition-all ${getSegmentColor(speed)} ${isNow ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}`}
              title={`${hourNum > 12 ? hourNum - 12 : hourNum || 12}${hourNum >= 12 ? 'PM' : 'AM'}: ${Math.round(speed)} mph — ${getSegmentLabel(speed)}`}
            >
              {isNow && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-white" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Time labels */}
      <div className="flex justify-between mt-1 text-[9px] text-[var(--text-tertiary)]">
        <span>Now</span>
        <span>+6h</span>
        <span>+12h</span>
        <span>+18h</span>
        <span>+24h</span>
      </div>
    </div>
  );
}

const MOOD_DOT = {
  epic: 'bg-emerald-500',
  good: 'bg-sky-500',
  calm: 'bg-indigo-500',
  mixed: 'bg-amber-500',
  neutral: 'bg-slate-400',
};

const MOOD_IMAGE_FALLBACK = {
  epic: '/images/kite-beach-epic.png',
  good: '/images/river-canyon-green.png',
  calm: '/images/glass-water-mirror.png',
  mixed: '/images/wake-wave-sun.png',
  neutral: '/images/utah-lake-ice-sunset.png',
};

const STATUS_STYLES = {
  go:      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  wait:    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500/20 text-amber-500', dot: 'bg-amber-500' },
  caution: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  off:     { bg: '', border: 'border-[var(--border-subtle)]', text: 'text-[var(--text-tertiary)]', badge: 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]', dot: 'bg-slate-500' },
};
const STATUS_STYLES_LIGHT = {
  go:      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  wait:    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400' },
  off:     { bg: 'bg-slate-50/50', border: 'border-slate-100', text: 'text-slate-400', badge: 'bg-slate-100 text-slate-400', dot: 'bg-slate-300' },
};

function dirLabel(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function TodayHero({ windSpeed, windGust, windDirection, thermalPrediction, boatingPrediction, onSelectActivity, selectedActivity, fpsStation, utalpStation, propagation, unifiedActivities, locationName, prediction, selectedLake, onSelectSpot, mesoData, lakeState: _lakeState, sportWindows }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { cards: rawCards, speed: outlookSpeed, gust: outlookGust } = useMemo(
    () => buildCards(windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation),
    [windSpeed, windGust, thermalPrediction, boatingPrediction, fpsStation, utalpStation, propagation]
  );

  const finalCards = useMemo(() => applyUnifiedOverrides(rawCards, unifiedActivities), [rawCards, unifiedActivities]);
  const { headline: _headline, subline: _subline, mood, context } = useMemo(
    () => buildHeadline(finalCards, outlookSpeed, selectedActivity, prediction),
    [finalCards, outlookSpeed, selectedActivity, prediction]
  );

  // Compute "Next Session" from sportWindows for forecast-first hero
  const nextSession = useMemo(() => {
    if (!sportWindows || Object.keys(sportWindows).length === 0) return null;
    
    // Map selected activity to sport window key
    const activityToSportKey = {
      kiting: 'foil-kite',
      windsurfing: 'windsurfing',
      sailing: 'sailing',
      paragliding: 'paragliding',
      snowkiting: 'snowkiting',
    };
    
    const sportKey = activityToSportKey[selectedActivity];
    const window = sportKey ? sportWindows[sportKey] : null;
    
    // If no window for selected activity, find the best one
    const bestWindow = window || Object.values(sportWindows).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];
    
    if (!bestWindow || !bestWindow.windowStartLabel) return null;
    
    return {
      sport: bestWindow.sport || 'Session',
      spotName: locationName || 'Your Spot',
      startTime: bestWindow.windowStartLabel,
      endTime: bestWindow.windowEndLabel,
      peakTime: bestWindow.peakTimeLabel,
      peakCondition: bestWindow.peakCondition,
      peakSpeed: bestWindow.hours?.reduce((max, h) => Math.max(max, h.windSpeed || 0), 0) || 0,
      durationHours: bestWindow.durationHours || 0,
      avgScore: bestWindow.avgScore || 0,
      hours: bestWindow.hours || [],
    };
  }, [sportWindows, selectedActivity, locationName]);

  // Determine gear hint based on peak wind speed
  const gearHint = useMemo(() => {
    const peakSpeed = nextSession?.peakSpeed || outlookSpeed || 0;
    if (peakSpeed >= 25) return { text: 'Small kite / wing day', icon: '🪁', color: 'text-red-400' };
    if (peakSpeed >= 18) return { text: 'Medium gear', icon: '💨', color: 'text-amber-400' };
    if (peakSpeed >= 12) return { text: 'Big gear today', icon: '🎐', color: 'text-emerald-400' };
    if (peakSpeed >= 8) return { text: 'Foil conditions', icon: '🏄', color: 'text-cyan-400' };
    return null;
  }, [nextSession, outlookSpeed]);

  // Scout banner: detect if another spot is significantly better
  const scoutBanner = useMemo(() => {
    if (!mesoData || !selectedLake) return null;
    const currentSpeed = windSpeed ?? 0;
    if (currentSpeed >= 8) return null; // current spot is fine

    const stations = mesoData.stations || [];
    const candidates = [];
    for (const [id, cfg] of Object.entries(LAKE_CONFIGS)) {
      if (id === selectedLake || id === 'utah-lake' || !cfg.coordinates) continue;
      const gt = cfg.stations?.groundTruth;
      const primaryId = gt?.id || null;
      if (!primaryId) continue;
      const reading = mesoData[primaryId] || stations.find(s => s.id === primaryId);
      const speed = reading?.speed ?? reading?.windSpeed ?? 0;
      if (speed >= 12) {
        candidates.push({ id, name: cfg.shortName || cfg.name, speed: Math.round(speed) });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.speed - a.speed);
    return candidates[0];
  }, [mesoData, selectedLake, windSpeed]);

  const _accent = MOOD_ACCENT[mood] || MOOD_ACCENT.neutral;
  const bgImage = getRotatingImage(mood, 'mood') || MOOD_IMAGE_FALLBACK[mood];
  const styles = isDark ? STATUS_STYLES : STATUS_STYLES_LIGHT;

  return (
    <div className={`animate-fade-in ${bgImage ? 'hero-mood' : ''}`}>
      {/* Scout banner — another spot is firing */}
      {scoutBanner && (
        <button
          onClick={() => onSelectSpot?.(scoutBanner.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-left transition-all group border ${
            isDark
              ? 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15 hover:border-emerald-500/40'
              : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
          }`}
        >
          <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
          <p className={`text-sm font-semibold flex-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            <span className="opacity-60">{locationName || 'Selected spot'} is quiet</span>
            {' — '}
            <span className="font-extrabold">{scoutBanner.name}</span> is firing at <span className="font-extrabold">{scoutBanner.speed} mph</span>
          </p>
          <ArrowRight className={`w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </button>
      )}
      {bgImage && (
        <>
          <img src={bgImage} alt="" />
          <div className="hero-overlay bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        </>
      )}

      <div className={`relative z-10 p-5 sm:p-6 lg:p-8 ${bgImage ? '' : 'card'}`}>
        {/* ═══════ FORECAST-FIRST HERO ═══════ */}
        {nextSession ? (
          // There IS a rideable window today
          <div className="mb-6">
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 ${bgImage ? 'text-white/50' : 'data-label'}`}>
              <Sunrise className={`w-3.5 h-3.5 ${bgImage ? 'text-emerald-400' : 'text-emerald-500'}`} />
              {getGreeting()} — Next Session
            </p>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight ${bgImage ? 'text-white' : 'text-emerald-500'}`}>
                  {nextSession.spotName} at {nextSession.startTime}
                </h2>
                <p className={`text-sm sm:text-base mt-2 font-medium leading-relaxed ${bgImage ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                  {nextSession.durationHours}hr window until {nextSession.endTime} · Peak {Math.round(nextSession.peakSpeed)} mph at {nextSession.peakTime}
                </p>
              </div>
              <div className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-xl ${
                bgImage ? 'bg-emerald-500/20 backdrop-blur-sm' : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}>
                <div className={`text-3xl font-black tabular-nums ${bgImage ? 'text-emerald-300' : 'text-emerald-500'}`}>
                  {nextSession.avgScore}
                </div>
                <p className={`text-[9px] font-bold uppercase tracking-wider ${bgImage ? 'text-emerald-300/60' : 'text-emerald-600'}`}>
                  score
                </p>
              </div>
            </div>

            {/* Gear Hint Badge */}
            {gearHint && (
              <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-bold ${
                bgImage ? 'bg-white/10 backdrop-blur-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              } ${gearHint.color}`}>
                <span>{gearHint.icon}</span>
                <span>{gearHint.text}</span>
              </div>
            )}

            {/* 24-Hour Sparkline Timeline */}
            {nextSession.hours?.length > 0 && (
              <div className="mt-4">
                <ForecastSparkline hours={nextSession.hours} isDark={isDark} bgImage={bgImage} />
              </div>
            )}
          </div>
        ) : (
          // NO rideable window today — Rest Day
          <div className="mb-6">
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-2 ${bgImage ? 'text-white/50' : 'data-label'}`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-slate-500`} />
              {getGreeting()} — Today's Outlook
            </p>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight ${bgImage ? 'text-white/80' : 'text-slate-400'}`}>
                  Rest Day
                </h2>
                <p className={`text-sm sm:text-base mt-2 font-medium leading-relaxed ${bgImage ? 'text-white/50' : 'text-[var(--text-tertiary)]'}`}>
                  No usable wind forecasted today. Check back tomorrow or explore other activities.
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-4xl font-black tabular-nums ${bgImage ? 'text-white/40' : 'text-slate-500'}`}>
                  {outlookSpeed > 0 ? Math.round(outlookSpeed) : '--'}
                </div>
                <p className={`text-[11px] font-semibold uppercase tracking-widest mt-1 ${bgImage ? 'text-white/30' : 'text-[var(--text-tertiary)]'}`}>
                  mph now
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current conditions + context (secondary info) */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Current wind reading */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            bgImage ? 'bg-white/10 backdrop-blur-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          }`}>
            <Wind className={`w-3.5 h-3.5 flex-shrink-0 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
            <span className={`text-xs font-bold ${bgImage ? 'text-white/90' : 'text-[var(--text-primary)]'}`}>
              Now: {outlookSpeed > 0 ? `${Math.round(outlookSpeed)} mph` : 'Calm'}{windDirection != null ? ` ${dirLabel(windDirection)}` : ''}
              {outlookGust > outlookSpeed * 1.2 && ` G${Math.round(outlookGust)}`}
            </span>
          </div>
          {locationName && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              bgImage ? 'bg-white/10 backdrop-blur-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
            }`}>
              <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
              <span className={`text-xs font-bold ${bgImage ? 'text-white/90' : 'text-[var(--text-primary)]'}`}>
                {locationName}
              </span>
            </div>
          )}
          {context && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              bgImage ? 'bg-amber-500/15 backdrop-blur-sm' : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${bgImage ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`text-xs font-bold ${bgImage ? 'text-amber-200' : 'text-amber-600'}`}>
                {context}
              </span>
            </div>
          )}
        </div>

        {/* Propagation chain — upstream station flow when wind is building */}
        {prediction?.propagation?.chains?.length > 0 && (prediction?.propagation?.phase === 'building' || prediction?.propagation?.phase === 'approaching') && (
          <div className={`flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg text-[11px] font-medium overflow-x-auto ${
            bgImage ? 'bg-white/5 backdrop-blur-sm' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          }`}>
            {prediction.propagation.chains.map((chain, i) => (
              <span key={chain.source || i} className="flex items-center gap-1 whitespace-nowrap">
                {i > 0 && <span className={bgImage ? 'text-white/30' : 'text-[var(--text-tertiary)]'}>→</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  chain.status === 'strong'
                    ? (bgImage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-600')
                    : chain.status === 'active'
                      ? (bgImage ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 text-amber-600')
                      : (bgImage ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-400')
                }`}>
                  {chain.name || chain.source}
                  {chain.speed != null && <span className="font-bold">{Math.round(chain.speed)}</span>}
                </span>
              </span>
            ))}
            <span className={bgImage ? 'text-white/30' : 'text-[var(--text-tertiary)]'}>→</span>
            <span className={`px-2 py-0.5 rounded-full ${
              bgImage ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-500/10 text-sky-600'
            }`}>Your Station</span>
          </div>
        )}

        {/* Activity Cards Grid — fixed order, selected highlighted */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {finalCards.map(({ id, cfg, verdict }) => {
            if (!verdict || !cfg) return null;
            const isSelected = selectedActivity === id;
            const isGo = verdict.status === 'go';

            const s = isSelected
              ? (bgImage
                  ? 'bg-sky-500/25 border-sky-400 backdrop-blur-sm ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/20'
                  : 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-400/40 shadow-md shadow-sky-500/10')
              : bgImage
                ? (verdict.status === 'go'
                  ? 'bg-white/15 border-emerald-400/40 backdrop-blur-sm'
                  : verdict.status === 'wait'
                    ? 'bg-white/8 border-amber-400/30 backdrop-blur-sm'
                    : 'bg-white/5 border-white/10 backdrop-blur-sm')
                : `${styles[verdict.status]?.bg || ''} ${styles[verdict.status]?.border || 'border-[var(--border-subtle)]'}`;

            return (
              <button
                key={id}
                onClick={() => onSelectActivity?.(id)}
                className={`
                  group relative flex flex-col p-3 rounded-xl border transition-all duration-200 text-left
                  ${s}
                  ${isSelected ? 'scale-[1.03]' : isGo ? 'hover:scale-[1.02] hover:shadow-md' : 'hover:bg-white/[0.06]'}
                `}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest bg-sky-500 text-white shadow-sm">
                    Selected
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className={`${isSelected ? 'text-sky-400' : bgImage ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{cfg.icon}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    bgImage
                      ? (isGo ? 'bg-emerald-500 text-white' : verdict.status === 'wait' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-white/40')
                      : (styles[verdict.status]?.badge || '')
                  }`}>
                    {verdict.label}
                  </span>
                </div>
                <span className={`text-sm font-bold mb-1 ${isSelected ? (bgImage ? 'text-sky-300' : 'text-sky-500') : bgImage ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {cfg.name}
                </span>
                <span className={`text-[11px] leading-tight line-clamp-2 ${
                  bgImage ? 'text-white/60' : (styles[verdict.status]?.text || 'text-[var(--text-tertiary)]')
                }`}>
                  {verdict.reason}
                </span>
                {verdict.window && (
                  <span className={`mt-1.5 text-[10px] font-bold ${bgImage ? 'text-amber-300' : 'text-amber-500'}`}>
                    {verdict.window}
                  </span>
                )}
                {isSelected
                  ? <CheckCircle className={`absolute top-3 right-2 w-4 h-4 ${bgImage ? 'text-sky-400' : 'text-sky-500'}`} />
                  : <ChevronRight className={`absolute top-3 right-2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ${bgImage ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                }
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
