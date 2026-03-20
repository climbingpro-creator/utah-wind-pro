export function safeToFixed(value, digits = 0) {
  const num = Number(value);
  if (num == null || Number.isNaN(num)) return '--';
  return num.toFixed(digits);
}
