import { describe, it, expect } from 'vitest';
import { calculateAverage } from '../src/average';

describe('calculateAverage', () => {
  it('повертає середнє арифметичне для масиву додатних чисел', () => {
    // Arrange
    const numbers = [10, 20, 30, 40, 50];

    // Act
    const result = calculateAverage(numbers);

    // Assert
    expect(result).toBe(30);
  });

  it('повертає середнє значення для масиву з від’ємними числами та нулем', () => {
    // Arrange
    const numbers = [-10, 0, 10, 20];

    // Act
    const result = calculateAverage(numbers);

    // Assert
    expect(result).toBe(5);
  });

  it('повертає точне значення для дробових чисел', () => {
    // Arrange
    const numbers = [1.5, 2.5, 5.0];

    // Act
    const result = calculateAverage(numbers);

    // Assert
    expect(result).toBe(3);
  });

  it('повертає значення самого числа для одноелементного масиву (межове значення)', () => {
    // Arrange
    const numbers = [42];

    // Act
    const result = calculateAverage(numbers);

    // Assert
    expect(result).toBe(42);
  });

  it('повертає нуль для масиву, що містить лише нулі (межове значення)', () => {
    // Arrange
    const numbers = [0, 0, 0];

    // Act
    const result = calculateAverage(numbers);

    // Assert
    expect(result).toBe(0);
  });

  it('викидає виняток EMPTY_ARRAY при передачі порожнього масиву', () => {
    // Arrange
    const emptyArray: number[] = [];

    // Act & Assert
    expect(() => calculateAverage(emptyArray)).toThrow('EMPTY_ARRAY');
  });

  it('викидає виняток EMPTY_ARRAY, якщо аргумент не є масивом', () => {
    // Arrange
    const invalidInput = null as unknown as number[];

    // Act & Assert
    expect(() => calculateAverage(invalidInput)).toThrow('EMPTY_ARRAY');
  });

  it('викидає виняток INVALID_NUMBER, якщо масив містить нечислове або нескінченне значення', () => {
    // Arrange
    const numbersWithNaN = [1, NaN, 3];
    const numbersWithInfinity = [1, Infinity, 3];

    // Act & Assert
    expect(() => calculateAverage(numbersWithNaN)).toThrow('INVALID_NUMBER');
    expect(() => calculateAverage(numbersWithInfinity)).toThrow(
      'INVALID_NUMBER',
    );
  });
});
