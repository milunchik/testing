import { expect, it } from 'vitest';
import { calcInsuranceCost } from '../src/insurance';

it.each([
  [2, 3000],
  [3, 3000],
  [4, 4000],
  [9, 4000],
  [10, 4000],
  [11, 5000],
  [Number.MAX_SAFE_INTEGER, 5000],
])('age category boundary %i costs %i', (vehicleAge, expected) => {
  expect(calcInsuranceCost({ vehicleAge, driverExperience: 3 })).toBe(expected);
});

it.each([0, 1, 2, 3])('base cost for a young vehicle aged %i', (vehicleAge) => {
  expect(calcInsuranceCost({ vehicleAge, driverExperience: 3 })).toBe(3000);
});

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
