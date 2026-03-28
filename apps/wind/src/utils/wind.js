const CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function windDirectionToCardinal(degrees) {
  if (degrees == null) return 'N/A';
  return CARDINALS[Math.round(degrees / 22.5) % 16];
}
