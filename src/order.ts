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
