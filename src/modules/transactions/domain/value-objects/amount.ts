import Decimal from 'decimal.js';
import { InvalidAmountError } from '../errors/invalid-amount.error';

export const AMOUNT_MAX_DECIMALS = 2;
/** At most 7 integer digits. */
export const AMOUNT_MAX = 9_999_999.99;

export const AMOUNT_MESSAGES = {
  notANumber: 'El monto debe ser un número',
  notPositive: 'El monto debe ser mayor a cero',
  tooManyDecimals: `El monto admite como máximo ${AMOUNT_MAX_DECIMALS} decimales`,
  tooLarge: 'El monto no puede superar 9,999,999.99',
} as const;

/**
 * Counts decimal places exactly, including numbers that JavaScript prints in
 * exponent notation (1e-7 has 7 decimal places).
 */
export function countDecimalPlaces(value: number): number {
  return new Decimal(value).decimalPlaces();
}

/** Amount the customer sends: positive, with cents precision and a cap. */
export class Amount {
  private constructor(readonly value: number) {}

  static of(value: number): Amount {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new InvalidAmountError(AMOUNT_MESSAGES.notANumber);
    }
    if (value <= 0) {
      throw new InvalidAmountError(AMOUNT_MESSAGES.notPositive);
    }
    if (countDecimalPlaces(value) > AMOUNT_MAX_DECIMALS) {
      throw new InvalidAmountError(AMOUNT_MESSAGES.tooManyDecimals);
    }
    if (value > AMOUNT_MAX) {
      throw new InvalidAmountError(AMOUNT_MESSAGES.tooLarge);
    }
    return new Amount(value);
  }
}
