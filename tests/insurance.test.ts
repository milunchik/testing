import { expect, it } from 'vitest';
import { calcInsuranceCost } from '../src/insurance';

it.each([
  [0.0074999, 2999.78],
  [0.0075, 2999.78],
  [0.0075001, 2999.77],
  [0.0345, 2998.97],
  [Number.MIN_VALUE, 3000],
])(
  'uses decimal half-up precision at discount %s',
  (accidentFreeDiscountPercent, expected) => {
    // 0.0075% of 3000 is 0.225; 2999.775 rounds to 2999.78.
    expect(
      calcInsuranceCost({
        vehicleAge: 0,
        driverExperience: 3,
        accidentFreeDiscountPercent,
      }),
    ).toBe(expected);
  },
);

it('accepts a small positive driving experience', () => {
  expect(calcInsuranceCost({ vehicleAge: 0, driverExperience: 0.01 })).toBe(
    3750,
  );
});

it.each([
  { discount: 12.34549, experience: 3, expected: 2629.64 },
  { discount: 12.3455, experience: 3, expected: 2629.64 },
  { discount: 12.34551, experience: 3, expected: 2629.63 },
  { discount: 12.3456, experience: 2, expected: 3287.04 },
  { discount: 0.0000001, experience: 3, expected: 3000 },
])(
  'rounds only final premium $discount $experience to $expected',
  ({ discount, experience, expected }) => {
    const result = calcInsuranceCost({
      vehicleAge: 0,
      driverExperience: experience,
      accidentFreeDiscountPercent: discount,
    });
    expect(result).toBe(expected);
    expect(result.toFixed(2)).toBe(expected.toFixed(2));
  },
);

it.each([
  { vehicleAge: 0, driverExperience: 3, expected: 2100 },
  { vehicleAge: 0, driverExperience: 2, expected: 2625 },
  { vehicleAge: 4, driverExperience: 3, expected: 2800 },
  { vehicleAge: 4, driverExperience: 2, expected: 3500 },
  { vehicleAge: 11, driverExperience: 3, expected: 3500 },
  { vehicleAge: 11, driverExperience: 2, expected: 4375 },
])(
  'combines category and experience $vehicleAge $driverExperience',
  ({ expected, ...input }) => {
    expect(
      calcInsuranceCost({ ...input, accidentFreeDiscountPercent: 30 }),
    ).toBe(expected);
  },
);

it('throws a meaningful RangeError for invalid age', () => {
  expect(() =>
    calcInsuranceCost({ vehicleAge: -1, driverExperience: 3 }),
  ).toThrow(RangeError);
});

it.each([
  [29, 2130],
  [29.99, 2100.3],
  [30, 2100],
  [30.01, 2100],
  [31, 2100],
  [100, 2100],
  [Number.MAX_VALUE, 2100],
])(
  'discount cap boundary %s percent costs %s',
  (accidentFreeDiscountPercent, expected) => {
    expect(
      calcInsuranceCost({
        vehicleAge: 0,
        driverExperience: 3,
        accidentFreeDiscountPercent,
      }),
    ).toBeCloseTo(expected, 8);
  },
);

it('caps the discount for an old car driven by a novice', () => {
  // 5000 + 1250 - 1875 = 4375, discount is on 6250, not on 5000.
  expect(
    calcInsuranceCost({
      vehicleAge: 11,
      driverExperience: 2,
      accidentFreeDiscountPercent: 31,
    }),
  ).toBe(4375);
});

it.each([
  [0, 3000],
  [0.01, 2999.7],
  [1, 2970],
  [10, 2700],
  [20, 2400],
])(
  'accident-free discount %s percent costs %s',
  (accidentFreeDiscountPercent, expected) => {
    expect(
      calcInsuranceCost({
        vehicleAge: 0,
        driverExperience: 3,
        accidentFreeDiscountPercent,
      }),
    ).toBe(expected);
  },
);

it('discounts the surcharged amount for an inexperienced driver', () => {
  // Independently: 3000 + 750 surcharge - 750 discount = 3000 UAH.
  expect(
    calcInsuranceCost({
      vehicleAge: 0,
      driverExperience: 2,
      accidentFreeDiscountPercent: 20,
    }),
  ).toBe(3000);
});

it.each([
  [0, 3750],
  [2, 3750],
  [2.99, 3750],
  [3, 3000],
  [3.01, 3000],
  [4, 3000],
])('experience boundary %s costs %i', (driverExperience, expected) => {
  expect(calcInsuranceCost({ vehicleAge: 0, driverExperience })).toBe(expected);
});

it.each([
  [4, 5000],
  [11, 6250],
])('novice with vehicle age %i costs %i', (vehicleAge, expected) => {
  expect(calcInsuranceCost({ vehicleAge, driverExperience: 2 })).toBe(expected);
});

it.each([
  [2, 3000],
  [3, 3000],
  [4, 4000],
  [9, 4000],
  [10, 4000],
  [11, 5000],
  [Number.MAX_SAFE_INTEGER - 1, 5000],
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
