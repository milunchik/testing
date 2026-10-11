import { describe, it, expect } from 'vitest';
import { celsiusToFahrenheit } from '../src/temperature';

describe('celsiusToFahrenheit', () => {
  it('перетворює нуль градусів на 32', () => {
    // Arrange
    const celsius = 0;

    // Act
    const result = celsiusToFahrenheit(celsius);

    // Assert
    expect(result).toBe(32);
  });

  it('перетворює 100 градусів на 212', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('працює з від’ємними значеннями', () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('відхиляє нечислове значення', () => {
    expect(() => celsiusToFahrenheit(NaN)).toThrow('INVALID_TEMPERATURE');
  });
});
