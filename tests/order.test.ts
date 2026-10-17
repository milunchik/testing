import { describe, expect, it } from 'vitest';
import { calcInstallment, InstallmentError } from '../src/order';

describe('Розрахунок місячного платежу calcInstallment', () => {
  it.each([
    [1200, 3, 408],
    [1200, 6, 208],
    [1200, 12, 108],
    [3000, 3, 1020],
    [3000, 6, 520],
    [3000, 12, 270],
  ])('для суми %s і строку %s повертає %s', (total, months, expected) => {
    // Arrange: expected is an independent literal reference value.
    // Act
    const payment = calcInstallment(total, months);
    // Assert
    expect(payment).toBe(expected);
  });

  it.each([3, 6, 12])(
    'для нульової суми й строку %s повертає нуль',
    (months) => {
      expect(calcInstallment(0, months)).toBe(0);
    },
  );

  it.each([
    [0.01, 3, 0],
    [0.02, 3, 0.01],
    [1, 3, 0.34],
    [100, 6, 17.33],
    [100, 12, 9],
    [0.1 + 0.2, 3, 0.1],
    [1.004, 6, 0.17],
    [1.005, 6, 0.17],
    [1.006, 6, 0.17],
    [1.125, 3, 0.38],
    [1.25, 12, 0.11],
    [1.249, 12, 0.11],
    [1.251, 12, 0.11],
    [0.1249, 12, 0.01],
    [0.125, 12, 0.01],
    [0.1251, 12, 0.01],
    [0.3749, 12, 0.03],
    [0.375, 12, 0.03],
    [0.3751, 12, 0.03],
    [1.499, 3, 0.51],
    [1.5, 3, 0.51],
    [1.501, 3, 0.51],
    [1e-7, 3, 0],
    [1.2e-7, 6, 0],
    [Number.MIN_VALUE, 12, 0],
    [1e10, 12, 900000000],
  ])(
    'для суми %s і строку %s округлює платіж до %s',
    (total, months, expected) => {
      expect(calcInstallment(total, months)).toBeCloseTo(expected, 10);
    },
  );

  it.each([
    [0.124, 0.04],
    [0.125, 0.04],
    [0.126, 0.04],
    [0.749, 0.25],
    [0.75, 0.26],
    [0.751, 0.26],
  ])('для суми %s округлює місячний платіж до %s', (total, expected) => {
    expect(calcInstallment(total, 3)).toBeCloseTo(expected, 10);
  });

  it.each([
    [2, false],
    [3, true],
    [4, false],
    [5, false],
    [6, true],
    [7, false],
    [11, false],
    [12, true],
    [13, false],
  ])('для граничного строку %s допустимість дорівнює %s', (months, valid) => {
    if (valid) {
      expect(calcInstallment(0, months)).toBe(0);
    } else {
      expect(() => calcInstallment(0, months)).toThrow(InstallmentError);
    }
  });

  it.each([-1, NaN, Infinity, -Infinity, '100', null, undefined, {}, 100n])(
    'відхиляє некоректну суму %s з кодом INVALID_TOTAL',
    (total) => {
      const calculate = () => calcInstallment(total as number, 3);
      expect(calculate).toThrow(InstallmentError);
      expect(calculate).toThrow(
        expect.objectContaining({
          code: 'INVALID_TOTAL',
          message: 'Total must be a finite nonnegative number.',
        }),
      );
    },
  );

  it.each([
    -1,
    0,
    1,
    9,
    24,
    3.5,
    NaN,
    Infinity,
    -Infinity,
    '3',
    null,
    undefined,
  ])(
    'відхиляє непідтримуваний строк %s з кодом UNSUPPORTED_MONTHS',
    (months) => {
      expect(() => calcInstallment(1200, months as number)).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_MONTHS' }),
      );
    },
  );

  it.each([
    [-1, 'INVALID_TOTAL'],
    [0, null],
    [1, null],
  ])('перевіряє суму %s біля нижньої межі', (total, code) => {
    if (code) {
      expect(() => calcInstallment(total, 3)).toThrow(
        expect.objectContaining({ code }),
      );
    } else {
      expect(calcInstallment(total, 3)).toBe(total === 0 ? 0 : 0.34);
    }
  });

  it('приймає від’ємний нуль і повертає додатний нуль', () => {
    expect(calcInstallment(-0, 3)).toBe(0);
  });

  it('спочатку повідомляє про некоректну суму, якщо обидва аргументи хибні', () => {
    expect(() => calcInstallment(-1, 9)).toThrow(
      expect.objectContaining({ code: 'INVALID_TOTAL' }),
    );
  });

  it.each([1e21, 1.2e21, Number.MAX_VALUE])(
    'відхиляє суму %s, коли платіж у копійках перевищує безпечний діапазон',
    (total) => {
      expect(() => calcInstallment(total, 3)).toThrow(
        expect.objectContaining({ code: 'INSTALLMENT_OUT_OF_RANGE' }),
      );
    },
  );
});
