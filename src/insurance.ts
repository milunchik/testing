export const YOUNG_VEHICLE_BASE_UAH = 3000;
export const YOUNG_VEHICLE_MAX_AGE = 3;
export const MIDDLE_VEHICLE_MAX_AGE = 10;
export const MIDDLE_VEHICLE_BASE_UAH = 4000;
export const OLD_VEHICLE_BASE_UAH = 5000;
export const EXPERIENCED_DRIVER_FROM_YEARS = 3;
export const NOVICE_SURCHARGE_RATE = 0.25;
export const PERCENT_SCALE = 100;
export const MAX_ACCIDENT_FREE_DISCOUNT_PERCENT = 30;
export const KOPECKS_PER_UAH = 100;

export interface InsuranceInput {
  vehicleAge: number;
  driverExperience: number;
  accidentFreeDiscountPercent?: number;
}

function assertValidInput({
  vehicleAge,
  driverExperience,
  accidentFreeDiscountPercent = 0,
}: InsuranceInput): void {
  if (!Number.isSafeInteger(vehicleAge) || vehicleAge < 0) {
    throw new RangeError('INVALID_VEHICLE_AGE');
  }
  if (!Number.isFinite(driverExperience) || driverExperience < 0) {
    throw new RangeError('INVALID_DRIVER_EXPERIENCE');
  }
  if (
    !Number.isFinite(accidentFreeDiscountPercent) ||
    accidentFreeDiscountPercent < 0
  ) {
    throw new RangeError('INVALID_ACCIDENT_FREE_DISCOUNT');
  }
}

function calcBasePremium(vehicleAge: number): number {
  if (vehicleAge <= YOUNG_VEHICLE_MAX_AGE) return YOUNG_VEHICLE_BASE_UAH;
  if (vehicleAge <= MIDDLE_VEHICLE_MAX_AGE) return MIDDLE_VEHICLE_BASE_UAH;
  return OLD_VEHICLE_BASE_UAH;
}

function applyExperienceSurcharge(
  base: number,
  driverExperience: number,
): number {
  return driverExperience < EXPERIENCED_DRIVER_FROM_YEARS
    ? base * (1 + NOVICE_SURCHARGE_RATE)
    : base;
}

function applyAccidentFreeDiscount(
  amount: number,
  discountPercent: number,
): number {
  const effectiveDiscount = Math.min(
    discountPercent,
    MAX_ACCIDENT_FREE_DISCOUNT_PERCENT,
  );
  return amount * (1 - effectiveDiscount / PERCENT_SCALE);
}

function roundPremium(amount: number): number {
  return Math.round(amount * KOPECKS_PER_UAH) / KOPECKS_PER_UAH;
}

/** Educational pricing assumptions are documented in report/lab3/PLAN.md. */
export function calcInsuranceCost(input: InsuranceInput): number {
  assertValidInput(input);
  const surcharged = applyExperienceSurcharge(
    calcBasePremium(input.vehicleAge),
    input.driverExperience,
  );
  const discounted = applyAccidentFreeDiscount(
    surcharged,
    input.accidentFreeDiscountPercent ?? 0,
  );
  return roundPremium(discounted);
}
