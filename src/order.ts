export type Tier = 'basic' | 'silver' | 'gold';

export interface OrderItem {
  sku: string;
  price: number;
  qty: number;
}

export const TIER_DISCOUNT: Record<Tier, number> = {
  basic: 0,
  silver: 0.05,
  gold: 0.1,
};

export const BIG_ORDER_FROM = 2000;
export const BIG_ORDER_BONUS = 0.05;
export const MAX_DISCOUNT = 0.25;
export const FREE_SHIPPING_FROM = 1000;
export const SHIPPING_FEE = 60;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcSubtotal(items: OrderItem[]): number {
  if (items.length === 0) throw new Error('EMPTY_ORDER');
  return items.reduce((sum, item) => {
    if (item.price < 0) throw new Error('NEGATIVE_PRICE');
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error('INVALID_QTY');
    }
    return sum + item.price * item.qty;
  }, 0);
}

export function calcDiscountRate(
  tier: Tier,
  subtotal: number,
  promoRate = 0,
): number {
  if (promoRate < 0) throw new Error('INVALID_PROMO');
  let rate = TIER_DISCOUNT[tier];
  if (subtotal >= BIG_ORDER_FROM) rate += BIG_ORDER_BONUS;
  return Math.min(rate + promoRate, MAX_DISCOUNT);
}

export function calcShipping(amount: number): number {
  return amount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

export function calcOrderTotal(
  items: OrderItem[],
  tier: Tier,
  promoRate = 0,
): number {
  const subtotal = calcSubtotal(items);
  const rate = calcDiscountRate(tier, subtotal, promoRate);
  const afterDiscount = round2(subtotal * (1 - rate));
  return round2(afterDiscount + calcShipping(afterDiscount));
}

export const INSTALLMENT_MONTHS = [3, 6, 12] as const;
export const SURCHARGE_PERCENT_PER_PERIOD = 2;
export const SURCHARGE_PERIOD_MONTHS = 3;

export type InstallmentErrorCode =
  'INVALID_TOTAL' | 'UNSUPPORTED_MONTHS' | 'INSTALLMENT_OUT_OF_RANGE';

export class InstallmentError extends Error {
  constructor(
    public readonly code: InstallmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InstallmentError';
  }
}

// Interpret the public number's decimal representation without binary rounding.
function decimalFraction(value: number): [bigint, bigint] {
  const [coefficient, exponent = '0'] = value.toString().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = BigInt(whole + fraction);
  const scale = fraction.length - Number(exponent);

  if (scale > 0) {
    return [digits, 10n ** BigInt(scale)];
  }

  return [digits * 10n ** BigInt(-scale), 1n];
}

/**
 * Simple surcharge: 2%, 4%, or 8% of the original total for 3, 6, or 12 months.
 * Assumptions: nonnegative finite total; round only the monthly payment to two
 * decimals, half up. This does not distribute a residual to the final payment.
 */
export function calcInstallment(total: number, months: number): number {
  if (!Number.isFinite(total) || total < 0) {
    throw new InstallmentError(
      'INVALID_TOTAL',
      'Total must be a finite nonnegative number.',
    );
  }

  if (!INSTALLMENT_MONTHS.includes(months as 3 | 6 | 12)) {
    throw new InstallmentError(
      'UNSUPPORTED_MONTHS',
      'Installments are available for 3, 6, or 12 months.',
    );
  }

  const [amount, scale] = decimalFraction(total);
  const surcharge =
    (months / SURCHARGE_PERIOD_MONTHS) * SURCHARGE_PERCENT_PER_PERIOD;
  const numerator = amount * BigInt(100 + surcharge);
  const denominator = scale * BigInt(months);
  const roundedCents = (2n * numerator + denominator) / (2n * denominator);

  if (roundedCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InstallmentError(
      'INSTALLMENT_OUT_OF_RANGE',
      'The monthly payment in cents exceeds the safe integer range.',
    );
  }

  return Number(roundedCents) / 100;
}
