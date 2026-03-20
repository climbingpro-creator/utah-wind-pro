export function safeToFixed(value, digits = 0) {
  if (value == null) return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return '--';
  return num.toFixed(digits);
}
