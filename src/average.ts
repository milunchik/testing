export function calculateAverage(numbers: number[]): number {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('EMPTY_ARRAY');
  }

  for (const num of numbers) {
    if (!Number.isFinite(num)) {
      throw new Error('INVALID_NUMBER');
    }
  }

  const sum = numbers.reduce((total, current) => total + current, 0);
  return sum / numbers.length;
}
