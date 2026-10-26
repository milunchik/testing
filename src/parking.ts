const INVALID_DURATION = 'INVALID_DURATION';
const FREE_MINUTES = 15;
const FIRST_HOUR_FEE = 30;
const MINUTES_PER_HOUR = 60;
const EXTRA_HOUR_FEE = 20;
const DAILY_CAP = 200;
const NIGHT_RATE = 0.5;

export interface ParkingOptions {
  night?: boolean;
  weekend?: boolean;
}

function assertValidDuration(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(INVALID_DURATION);
  }
}

function calcBaseFee(minutes: number): number {
  if (minutes <= FREE_MINUTES) return 0;
  if (minutes <= MINUTES_PER_HOUR) return FIRST_HOUR_FEE;
  const extraHours = Math.ceil((minutes - MINUTES_PER_HOUR) / MINUTES_PER_HOUR);
  return Math.min(FIRST_HOUR_FEE + extraHours * EXTRA_HOUR_FEE, DAILY_CAP);
}

function applyRates(fee: number, options: ParkingOptions): number {
  if (options.night) fee *= NIGHT_RATE;
  if (options.weekend) fee *= 0.8;
  return fee;
}

export function calcParkingFee(minutes: number, options: ParkingOptions = {}): number {
  assertValidDuration(minutes);
  return applyRates(calcBaseFee(minutes), options);
}
