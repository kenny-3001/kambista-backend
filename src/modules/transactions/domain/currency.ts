import { UnsupportedCurrencyError } from './errors/unsupported-currency.error';

export enum Currency {
  USD = 'USD',
  PEN = 'PEN',
}

export const SUPPORTED_CURRENCIES: readonly string[] = Object.values(Currency);

export function parseCurrency(value: string): Currency {
  if (!SUPPORTED_CURRENCIES.includes(value)) {
    throw new UnsupportedCurrencyError(value);
  }
  return value as Currency;
}
