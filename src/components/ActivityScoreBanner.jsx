import { AlertTriangle } from 'lucide-react';
import { safeToFixed } from '../utils/safeToFixed';

const CALM_LABELS = {
  boating: { glass: 'Glass Water Now!', calm: 'Calm Lake Ahead', badge: 'GLASS', unit: 'glass' },
  paddling: { glass: 'Mirror Flat — Go Paddle!', calm: 'Calm Window for Paddling', badge: 'FLAT', unit: 'flat' },
  fishing: { glass: 'Still Water — Fish Are Rising', calm: 'Low Wind — Great for Casting', badge: 'CALM', unit: 'calm' },
};

export default function ActivityScoreBanner({
  activityScore,
  activityConfig,
  lakeState,
  boatingPrediction,
  currentWindSpeed,
  theme,
}) {
  const score = activityScore.score;
  const prediction = lakeState?.thermalPrediction;
  const prob = prediction?.windProbability ?? prediction?.probability ?? 0;
  const startHour = prediction?.startHour;
  const windType = prediction?.windType;
  const consistencyForecast = prediction?.consistencyForecast;
  const wantsWind = activityConfig?.wantsWind !== false;
  const actName = activityConfig?.name || 'Activity';
  const actId = activityConfig?.id || 'boating';

  const hasForecastOpp = wantsWind && prob >= 40 && score < 60;
  const isForecastBetter = wantsWind && prob > score;
  const isGoodNow = score >= 60;
  const isGreatNow = score >= 75;
  const hasGlassOpp = !wantsWind && boatingPrediction?.probability >= 45;

  let displayScore = score;
  let headline = `${actName}: ${activityScore.message}`;
  let subline = null;
  let bannerColor = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  let badge = null;
  let arriveTime = null;

  const calmLabel = CALM_LABELS[actId] || CALM_LABELS.boating;

  if (wantsWind && isGreatNow) {
    displayScore = score;
    headline = `${actName} is ON!`;
    subline = `${safeToFixed(currentWindSpeed, 0)} mph — get out there!`;
    bannerColor = 'green';
    badge = { text: 'GO', color: 'bg-green-500 text-white animate-pulse' };
  } else if (!wantsWind && isGreatNow) {
    displayScore = score;
    headline = calmLabel.glass;
    subline = `${safeToFixed(currentWindSpeed, 0)} mph — perfect conditions`;
    bannerColor = 'green';
    badge = { text: calmLabel.badge, color: 'bg-emerald-500 text-white animate-pulse' };
  } else if (isGoodNow && isForecastBetter) {
    displayScore = score;
    headline = wantsWind
      ? `Good ${actName} now — getting better!`
      : `${actName} is good now — staying calm`;
    subline = wantsWind
      ? (consistencyForecast?.description || `${prob}% probability, building to peak`)
      : `${safeToFixed(currentWindSpeed, 0)} mph — low wind window holding`;
    bannerColor = 'green';
    badge = { text: wantsWind ? 'IMPROVING' : 'HOLDING', color: 'bg-green-500/20 text-green-400 border border-green-500/50' };
  } else if (hasForecastOpp) {
    displayScore = prob;
    const isWindBlowingNow = currentWindSpeed >= 6;
    const timeStr = startHour ? (startHour > 12 ? `${startHour - 12} PM` : `${startHour} AM`) : null;
    if (windType === 'north_flow' && isWindBlowingNow) {
      headline = `${actName} — North flow active`;
      subline = `${Math.round(currentWindSpeed)} mph from north — rideable and building`;
      bannerColor = prob >= 60 ? 'green' : 'yellow';
      badge = { text: 'ACTIVE', color: prob >= 60 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' };
    } else {
      headline = timeStr
        ? `${actName} Expected at ${timeStr}`
        : `${actName} Likely Today`;
      subline = windType === 'thermal'
        ? (consistencyForecast?.description || 'Thermal cycle building — smooth, consistent wind expected')
        : windType === 'north_flow'
          ? 'North flow developing — stronger conditions incoming'
          : `${prob}% probability — conditions are building`;
      bannerColor = prob >= 60 ? 'green' : 'yellow';
      badge = { text: 'PREDICTED', color: prob >= 60 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' };
      if (timeStr) arriveTime = timeStr;
    }
  } else if (hasGlassOpp && !wantsWind) {
    displayScore = boatingPrediction.probability;
    headline = boatingPrediction.isGlass
      ? calmLabel.glass
      : boatingPrediction.glassWindow?.start
        ? `Calm Window: ${boatingPrediction.glassWindow.start} – ${boatingPrediction.glassWindow.end}`
        : calmLabel.calm;
    subline = boatingPrediction.recommendation;
    bannerColor = boatingPrediction.probability >= 60 ? 'green' : boatingPrediction.probability >= 40 ? 'yellow' : 'red';
    if (boatingPrediction.isGlass) badge = { text: calmLabel.badge, color: 'bg-emerald-500 text-white animate-pulse' };
  } else if (!wantsWind && score >= 40) {
    headline = `${actName}: ${activityScore.message}`;
    if (startHour) {
      subline = `Wind expected ~${startHour > 12 ? `${startHour - 12} PM` : `${startHour} AM`} — plan around it`;
    }
  } else {
    headline = `${actName}: ${activityScore.message}`;
  }

  const textColorMap = {
    green: theme === 'dark' ? 'text-green-400' : 'text-green-700',
    yellow: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700',
    red: theme === 'dark' ? 'text-red-400' : 'text-red-700',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xl">{activityConfig?.icon}</span>
          <div className="min-w-0">
            <div className={`font-bold text-base ${textColorMap[bannerColor]}`}>
              {headline}
            </div>
            {subline && (
              <div className="text-sm mt-0.5 text-[var(--text-secondary)]">{subline}</div>
            )}
            {arriveTime && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                Be there by {arriveTime}
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <div className={`data-number ${textColorMap[bannerColor]}`}>
            {displayScore}
          </div>
          <div className="data-label mt-1">score</div>
          {badge && (
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${badge.color}`}>
              {badge.text}
            </div>
          )}
          {!badge && activityScore.gustFactor > 1.3 && (
            <div className="text-[10px] px-2 py-0.5 rounded mt-1 flex items-center justify-center gap-1 text-amber-500 bg-amber-500/10">
              <AlertTriangle className="w-3 h-3" /> Gusty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
