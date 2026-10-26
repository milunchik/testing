import { expect, it } from 'vitest';
import { calcInsuranceCost } from '../src/insurance';

it.each([
  -1,
  -0.01,
  0.5,
  NaN,
  Infinity,
  -Infinity,
  Number.MAX_SAFE_INTEGER + 1,
])('rejects invalid vehicle age %s', (vehicleAge) => {
  expect(() => calcInsuranceCost({ vehicleAge, driverExperience: 3 })).toThrow(
    'INVALID_VEHICLE_AGE',
  );
});

it.each([-1, -0.01, NaN, Infinity, -Infinity])(
  'rejects invalid driving experience %s',
  (driverExperience) => {
    expect(() =>
      calcInsuranceCost({ vehicleAge: 0, driverExperience }),
    ).toThrow('INVALID_DRIVER_EXPERIENCE');
  },
);

it.each([-1, -0.01, NaN, Infinity, -Infinity])(
  'rejects invalid accident-free discount %s',
  (accidentFreeDiscountPercent) => {
    expect(() =>
      calcInsuranceCost({
        vehicleAge: 0,
        driverExperience: 3,
        accidentFreeDiscountPercent,
      }),
    ).toThrow('INVALID_ACCIDENT_FREE_DISCOUNT');
  },
);
