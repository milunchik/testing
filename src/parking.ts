const INVALID_DURATION = 'INVALID_DURATION';

function assertValidDuration(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(INVALID_DURATION);
  }
}

export function calcParkingFee(minutes: number): number {
  assertValidDuration(minutes);
  return 0;
}
