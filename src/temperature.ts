export function celsiusToFahrenheit(celsius: number): number {
  if (!Number.isFinite(celsius)) {
    throw new Error('INVALID_TEMPERATURE');
  }
  return Math.round((celsius * 9) / 5 + 32);
}
