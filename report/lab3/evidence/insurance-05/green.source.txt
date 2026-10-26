export const YOUNG_VEHICLE_BASE_UAH = 3000;
export const YOUNG_VEHICLE_MAX_AGE = 3;
export const MIDDLE_VEHICLE_MAX_AGE = 10;
export const MIDDLE_VEHICLE_BASE_UAH = 4000;
export const OLD_VEHICLE_BASE_UAH = 5000;
export const EXPERIENCED_DRIVER_FROM_YEARS = 3;
export const NOVICE_SURCHARGE_RATE = 0.25;

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

export function calcInsuranceCost(input: InsuranceInput): number {
  assertValidInput(input);
  const surcharged = applyExperienceSurcharge(
    calcBasePremium(input.vehicleAge),
    input.driverExperience,
  );
  return surcharged * (1 - (input.accidentFreeDiscountPercent ?? 0) / 100);
}
