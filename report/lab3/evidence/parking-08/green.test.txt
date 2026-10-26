import { expect, it } from 'vitest';
import { calcParkingFee, roundParkingAmount } from '../src/parking';

it.each([[12.344, 12.34], [12.345, 12.35], [12.346, 12.35], [28, 28]])(
  'rounds the final amount %s to %s', (amount, expected) => {
    expect(roundParkingAmount(amount)).toBe(expected);
  },
);

it.each([-1, -60, 10.5, NaN, Infinity, -Infinity])(
  'rejects invalid duration %s',
  (minutes) => {
    expect(() => calcParkingFee(minutes)).toThrow('INVALID_DURATION');
  },
);

it.each([0, 1, 14, 15])('first 15 minutes are free: %i', (minutes) => {
  expect(calcParkingFee(minutes)).toBe(0);
});

it.each([
  { minutes: 600, options: { weekend: true }, expected: 160 },
  { minutes: 600, options: { night: true, weekend: true }, expected: 80 },
  { minutes: 45, options: { night: true, weekend: true }, expected: 12 },
  { minutes: 121, options: { night: true, weekend: true }, expected: 28 },
  { minutes: 0, options: { weekend: true }, expected: 0 },
  { minutes: 16, options: { night: false, weekend: false }, expected: 30 },
])('weekend $minutes $options costs $expected', ({ minutes, options, expected }) => {
  expect(calcParkingFee(minutes, options)).toBe(expected);
});

it.each([[0, 0], [15, 0], [16, 15], [60, 15], [121, 35], [600, 100]])(
  'night rate %i costs %i', (minutes, expected) => {
    expect(calcParkingFee(minutes, { night: true })).toBe(expected);
  },
);

it.each([[539, 190], [540, 190], [541, 200], [600, 200], [1440, 200], [1441, 200]])(
  'daily cap %i costs %i', (minutes, expected) => {
    expect(calcParkingFee(minutes)).toBe(expected);
  },
);

it.each([[61, 50], [119, 50], [120, 50], [121, 70], [180, 70]])(
  'started extra hours %i cost %i', (minutes, expected) => {
    expect(calcParkingFee(minutes)).toBe(expected);
  },
);

it.each([[16, 30], [59, 30], [60, 30]])('first hour %i costs %i', (minutes, expected) => {
  expect(calcParkingFee(minutes)).toBe(expected);
});
