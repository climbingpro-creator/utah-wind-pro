import { AlertTriangle } from 'lucide-react';
import { safeToFixed } from '../utils/safeToFixed';

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
  const prob = prediction?.probability || 0;
  const startHour = prediction?.startHour;
  const windType = prediction?.windType;
  const consistencyForecast = prediction?.consistencyForecast;
  const wantsWind = activityConfig?.wantsWind !== false;

  const hasForecastOpp = wantsWind && prob >= 40 && score < 60;
  const isForecastBetter = wantsWind && prob > score;
  const isGoodNow = score >= 60;
  const isGreatNow = score >= 75;
  const hasGlassOpp = !wantsWind && boatingPrediction?.probability >= 45;

  let displayScore = score;
  let headline = `${activityConfig?.name}: ${activityScore.message}`;
  let subline = null;
  let bannerColor = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  let badge = null;
  let arriveTime = null;

  if (isGreatNow) {
    displayScore = score;
    headline = `${activityConfig?.name} is ON!`;
    subline = `${safeToFixed(currentWindSpeed, 0)} mph — get out there!`;
    bannerColor = 'green';
    badge = { text: 'GO', color: 'bg-green-500 text-white animate-pulse' };
  } else if (isGoodNow && isForecastBetter) {
    displayScore = score;
    headline = `Good ${activityConfig?.name} now — getting better!`;
    subline = consistencyForecast?.description || `${prob}% probability, building to peak`;
    bannerColor = 'green';
    badge = { text: 'IMPROVING', color: 'bg-green-500/20 text-green-400 border border-green-500/50' };
  } else if (hasForecastOpp) {
    displayScore = prob;
    const timeStr = startHour ? (startHour > 12 ? `${startHour - 12} PM` : `${startHour} AM`) : null;
    headline = timeStr
      ? `${activityConfig?.name} Expected at ${timeStr}`
      : `${activityConfig?.name} Likely Today`;
    subline = windType === 'thermal'
      ? (consistencyForecast?.description || 'Thermal cycle building — smooth, consistent wind expected')
      : windType === 'north_flow'
        ? 'North flow developing — stronger conditions incoming'
        : `${prob}% probability — conditions are building`;
    bannerColor = prob >= 60 ? 'green' : 'yellow';
    badge = { text: 'PREDICTED', color: prob >= 60 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' };
    if (timeStr) arriveTime = timeStr;
  } else if (hasGlassOpp && !wantsWind) {
    displayScore = boatingPrediction.probability;
    headline = boatingPrediction.isGlass
      ? 'Glass Conditions Now!'
      : boatingPrediction.glassWindow?.start
        ? `Glass Window: ${boatingPrediction.glassWindow.start} – ${boatingPrediction.glassWindow.end}`
        : 'Calm Conditions Possible';
    subline = boatingPrediction.recommendation;
    bannerColor = boatingPrediction.probability >= 60 ? 'green' : boatingPrediction.probability >= 40 ? 'yellow' : 'red';
    if (boatingPrediction.isGlass) badge = { text: 'GLASS', color: 'bg-emerald-500 text-white animate-pulse' };
  } else {
    headline = `${activityConfig?.name}: ${activityScore.message}`;
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
