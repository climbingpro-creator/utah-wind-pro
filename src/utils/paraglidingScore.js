export function getParaglidingScore(fpsStation, utalpStation) {
  const fpsSpeed = fpsStation?.speed || fpsStation?.windSpeed;
  const fpsDir = fpsStation?.direction || fpsStation?.windDirection;
  const fpsGust = fpsStation?.gust || fpsStation?.windGust;
  
  const utalpSpeed = utalpStation?.speed || utalpStation?.windSpeed;
  const utalpDir = utalpStation?.direction || utalpStation?.windDirection;
  const utalpGust = utalpStation?.gust || utalpStation?.windGust;
  
  const fpsDirectionOk = fpsDir >= 110 && fpsDir <= 250;
  const fpsSpeedOk = fpsSpeed >= 5 && fpsSpeed <= 20;
  const fpsGustOk = !fpsGust || (fpsGust / Math.max(fpsSpeed, 1)) <= 1.4;

  const utalpDirectionOk = utalpDir >= 315 || utalpDir <= 45;
  const utalpSpeedOk = utalpSpeed >= 5 && utalpSpeed <= 18;
  const utalpGustOk = !utalpGust || (utalpGust - utalpSpeed) <= 5;

  let fpsScore = 0;
  if (fpsDirectionOk) fpsScore += 50;
  if (fpsDir >= 135 && fpsDir <= 210) fpsScore += 10;
  if (fpsSpeedOk) fpsScore += 30;
  if (fpsGustOk) fpsScore += 20;
  if (fpsSpeed >= 8 && fpsSpeed <= 16) fpsScore += 10;

  let utalpScore = 0;
  if (utalpDirectionOk) utalpScore += 50;
  if (utalpSpeedOk) utalpScore += 30;
  if (utalpGustOk) utalpScore += 20;
  if (utalpSpeed >= 12 && utalpSpeed <= 16) utalpScore += 10;
  
  const bestScore = Math.max(fpsScore, utalpScore);
  const bestSite = fpsScore >= utalpScore ? 'Flight Park South' : 'Flight Park North';
  const bestSpeed = fpsScore >= utalpScore ? fpsSpeed : utalpSpeed;
  const bestDir = fpsScore >= utalpScore ? fpsDir : utalpDir;
  const bestGust = fpsScore >= utalpScore ? fpsGust : utalpGust;
  
  let message = '';
  if (bestScore >= 80) {
    message = `Excellent at ${bestSite} - ${(bestSpeed ?? 0).toFixed(0)} mph from ${(bestDir ?? 0).toFixed(0)}°`;
  } else if (bestScore >= 50) {
    message = `Flyable at ${bestSite} - ${(bestSpeed ?? 0).toFixed(0)} mph`;
  } else if (bestSpeed != null) {
    message = `Marginal - ${(bestSpeed ?? 0).toFixed(0)} mph at ${(bestDir ?? 0).toFixed(0)}°`;
  } else {
    message = 'No data from Flight Park stations';
  }
  
  const gustFactor = bestGust && bestSpeed ? bestGust / bestSpeed : 1;
  
  return {
    score: Math.min(100, bestScore),
    message,
    gustFactor,
    bestSite,
  };
}
