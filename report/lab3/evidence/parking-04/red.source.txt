const INVALID_DURATION = 'INVALID_DURATION';
const FREE_MINUTES = 15;
const FIRST_HOUR_FEE = 30;

function assertValidDuration(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(INVALID_DURATION);
  }
}

export function calcParkingFee(minutes: number): number {
  assertValidDuration(minutes);
  if (minutes <= FREE_MINUTES) return 0;
  return FIRST_HOUR_FEE;
}
