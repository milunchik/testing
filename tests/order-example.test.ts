import { describe, expect, it } from 'vitest';
import {
  calcSubtotal,
  calcDiscountRate,
  calcShipping,
  calcOrderTotal,
  type OrderItem,
  type Tier,
} from '../src/order';

const item = (price: number, qty = 1): OrderItem => ({
  sku: 'SKU-1',
  price,
  qty,
});

describe('calcSubtotal', () => {
  it('підсумовує позиції з урахуванням кількості', () => {
    // Arrange
    const items = [item(100, 2), { sku: 'SKU-2', price: 50, qty: 3 }];
    // Act
    const result = calcSubtotal(items);
    // Assert
    expect(result).toBeCloseTo(350, 2);
  });

  it('відхиляє порожнє замовлення', () => {
    expect(() => calcSubtotal([])).toThrow('EMPTY_ORDER');
  });

  it.each([
    [0, 0],
    [0.01, 0.01],
    [0.1, 0.1],
  ])('приймає ціну %s і повертає %s', (price, expected) => {
    expect(calcSubtotal([item(price)])).toBeCloseTo(expected, 6);
  });

  it.each([-1, -0.01])('відхиляє від’ємну ціну %s', (price) => {
    expect(() => calcSubtotal([item(price)])).toThrow('NEGATIVE_PRICE');
  });

  it.each([0, -1, 1.5, NaN, Infinity, -Infinity])(
    'відхиляє некоректну кількість %s',
    (qty) => {
      expect(() => calcSubtotal([item(100, qty)])).toThrow('INVALID_QTY');
    },
  );

  it.each([
    [1, 100],
    [2, 200],
  ])('для кількості %s повертає %s', (qty, expected) => {
    expect(calcSubtotal([item(100, qty)])).toBeCloseTo(expected, 2);
  });

  it('перевіряє також другу позицію замовлення', () => {
    expect(() => calcSubtotal([item(100), item(-0.01)])).toThrow(
      'NEGATIVE_PRICE',
    );
  });
});

describe('calcDiscountRate', () => {
  it.each<[Tier, number, number]>([
    ['basic', 500, 0],
    ['silver', 500, 0.05],
    ['gold', 500, 0.1],
    ['basic', 2000, 0.05],
    ['silver', 2000, 0.1],
    ['gold', 2000, 0.15],
  ])('рівень %s із сумою %s дає ставку %s', (tier, subtotal, expected) => {
    expect(calcDiscountRate(tier, subtotal)).toBeCloseTo(expected, 4);
  });

  it.each([
    [1999, 0],
    [2000, 0.05],
    [2001, 0.05],
  ])('межа великого замовлення %s дає %s', (subtotal, expected) => {
    expect(calcDiscountRate('basic', subtotal)).toBeCloseTo(expected, 4);
  });

  it.each([
    [0, 0.1],
    [0.14, 0.24],
    [0.15, 0.25],
    [0.2, 0.25],
  ])('промокод %s обмежує підсумкову ставку до %s', (promo, expected) => {
    expect(calcDiscountRate('gold', 500, promo)).toBeCloseTo(expected, 4);
  });

  it('обмежує сумарну знижку разом із бонусом великого замовлення', () => {
    expect(calcDiscountRate('gold', 2000, 0.5)).toBeCloseTo(0.25, 4);
  });

  it.each([-0.01, -0.1])('відхиляє від’ємний промокод %s', (promo) => {
    expect(() => calcDiscountRate('basic', 500, promo)).toThrow(
      'INVALID_PROMO',
    );
  });
});

describe('calcShipping', () => {
  it.each([
    [0, 60],
    [999, 60],
    [999.99, 60],
    [1000, 0],
    [1000.01, 0],
    [1001, 0],
  ])('сума %s визначає доставку %s', (amount, expected) => {
    expect(calcShipping(amount)).toBe(expected);
  });
});

describe('calcOrderTotal', () => {
  it.each<[number, Tier, number, number]>([
    [500, 'basic', 0, 560],
    [1200, 'gold', 0, 1080],
    [1050, 'gold', 0, 1005],
    [100, 'silver', 0, 155],
    [0, 'basic', 0, 60],
    [2000, 'gold', 0.5, 1500],
    [1250, 'basic', 0.2, 1000],
    [1249.99, 'basic', 0.2, 1059.99],
    [1250.01, 'basic', 0.2, 1000.01],
    [0.01, 'silver', 0, 60.01],
  ])(
    'сума %s, рівень %s, промокод %s дають підсумок %s',
    (price, tier, promo, expected) => {
      expect(calcOrderTotal([item(price)], tier, promo)).toBeCloseTo(
        expected,
        2,
      );
    },
  );

  it('використовує нульовий промокод за замовчуванням', () => {
    expect(calcOrderTotal([item(500)], 'basic')).toBeCloseTo(560, 2);
  });

  it('враховує кілька позицій та їх кількість', () => {
    expect(calcOrderTotal([item(100, 2), item(50, 3)], 'silver')).toBeCloseTo(
      392.5,
      2,
    );
  });

  it.each<[OrderItem[], number, string]>([
    [[], 0, 'EMPTY_ORDER'],
    [[item(-0.01)], 0, 'NEGATIVE_PRICE'],
    [[item(100, 0)], 0, 'INVALID_QTY'],
    [[item(100)], -0.01, 'INVALID_PROMO'],
  ])('передає виняток %s %s %s', (items, promo, code) => {
    expect(() => calcOrderTotal(items, 'gold', promo)).toThrow(code);
  });
});
