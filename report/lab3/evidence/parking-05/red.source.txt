const INVALID_DURATION = 'INVALID_DURATION';
const FREE_MINUTES = 15;
const FIRST_HOUR_FEE = 30;
const MINUTES_PER_HOUR = 60;
const EXTRA_HOUR_FEE = 20;

function assertValidDuration(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(INVALID_DURATION);
  }
}

export function calcParkingFee(minutes: number): number {
  assertValidDuration(minutes);
  if (minutes <= FREE_MINUTES) return 0;
  if (minutes <= MINUTES_PER_HOUR) return FIRST_HOUR_FEE;
  const extraHours = Math.ceil((minutes - MINUTES_PER_HOUR) / MINUTES_PER_HOUR);
  return FIRST_HOUR_FEE + extraHours * EXTRA_HOUR_FEE;
}
