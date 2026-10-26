import { expect, it } from 'vitest';
import { calcParkingFee } from '../src/parking';

it.each([-1, -60, 10.5, NaN, Infinity, -Infinity])(
  'rejects invalid duration %s',
  (minutes) => {
    expect(() => calcParkingFee(minutes)).toThrow('INVALID_DURATION');
  },
);

it.each([0, 1, 14, 15])('first 15 minutes are free: %i', (minutes) => {
  expect(calcParkingFee(minutes)).toBe(0);
});

it.each([[16, 30], [59, 30], [60, 30]])('first hour %i costs %i', (minutes, expected) => {
  expect(calcParkingFee(minutes)).toBe(expected);
});
