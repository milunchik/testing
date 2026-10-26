export const YOUNG_VEHICLE_BASE_UAH = 3000;

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

export function calcInsuranceCost(input: InsuranceInput): number {
  assertValidInput(input);
  if (input.vehicleAge <= 3) return YOUNG_VEHICLE_BASE_UAH;
  if (input.vehicleAge <= 10) return 4000;
  return 5000;
}
