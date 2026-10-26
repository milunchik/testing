export interface InsuranceInput {
  vehicleAge: number;
  driverExperience: number;
  accidentFreeDiscountPercent?: number;
}

export function calcInsuranceCost({ vehicleAge, driverExperience, accidentFreeDiscountPercent = 0 }: InsuranceInput): number {
  if (!Number.isSafeInteger(vehicleAge) || vehicleAge < 0) {
    throw new RangeError('INVALID_VEHICLE_AGE');
  }
  if (!Number.isFinite(driverExperience) || driverExperience < 0) {
    throw new RangeError('INVALID_DRIVER_EXPERIENCE');
  }
  if (!Number.isFinite(accidentFreeDiscountPercent) || accidentFreeDiscountPercent < 0) {
    throw new RangeError('INVALID_ACCIDENT_FREE_DISCOUNT');
  }
  return 0;
}
