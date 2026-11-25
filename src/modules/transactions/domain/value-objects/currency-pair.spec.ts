import { Currency } from '../currency';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { SameCurrencyError } from '../errors/same-currency.error';
import { UnsupportedCurrencyError } from '../errors/unsupported-currency.error';
import { Amount } from './amount';
import { CurrencyPair } from './currency-pair';

describe('CurrencyPair', () => {
  const quote = { buy: 3.733, sell: 3.739 };

  describe('creation', () => {
    it.each([
      ['USD', 'PEN'],
      ['PEN', 'USD'],
    ])('accepts %s → %s', (source, target) => {
      const pair = CurrencyPair.of(source, target);
      expect(pair.source).toBe(source);
      expect(pair.target).toBe(target);
    });

    it.each(['USD', 'PEN'])('rejects %s → the same currency', (currency) => {
      expect(() => CurrencyPair.of(currency, currency)).toThrow(
        SameCurrencyError,
      );
    });

    it.each([
      ['EUR', 'PEN'],
      ['USD', 'EUR'],
      ['usd', 'PEN'],
      ['', 'PEN'],
    ])('rejects the unsupported pair %p → %p', (source, target) => {
      expect(() => CurrencyPair.of(source, target)).toThrow(
        UnsupportedCurrencyError,
      );
    });
  });

  describe('conversion', () => {
    const usdToPen = CurrencyPair.of(Currency.USD, Currency.PEN);
    const penToUsd = CurrencyPair.of(Currency.PEN, Currency.USD);

    it('USD → PEN multiplies by the sell price (example from the statement)', () => {
      expect(usdToPen.convert(Amount.of(100), quote)).toEqual({
        convertedAmount: 373.9,
        appliedRate: 3.739,
      });
    });

    it('PEN → USD divides by the buy price and rounds to cents', () => {
      // 100 / 3.733 = 26.7881...
      expect(penToUsd.convert(Amount.of(100), quote)).toEqual({
        convertedAmount: 26.79,
        appliedRate: 3.733,
      });
    });

    it('rounds half up', () => {
      // 1.5 * 3.003 = 4.5045 → 4.50 ; 2.5 * 3.003 = 7.5075 → 7.51
      const rate = { buy: 3.003, sell: 3.003 };
      expect(usdToPen.convert(Amount.of(1.5), rate).convertedAmount).toBe(4.5);
      expect(usdToPen.convert(Amount.of(2.5), rate).convertedAmount).toBe(7.51);
    });

    it('avoids binary floating point errors', () => {
      // 175 * 3.739 = 654.325 exactly, but plain JavaScript computes
      // 654.3249999999999 and would round it down to 654.32.
      expect(usdToPen.convert(Amount.of(175), quote).convertedAmount).toBe(
        654.33,
      );
      // 0.1 * 3 = 0.30000000000000004 in plain JavaScript.
      expect(
        usdToPen.convert(Amount.of(0.1), { buy: 3, sell: 3 }).convertedAmount,
      ).toBe(0.3);
    });

    it('handles the largest allowed amount', () => {
      expect(
        usdToPen.convert(Amount.of(9_999_999.99), quote).convertedAmount,
      ).toBe(37_389_999.96);
    });

    it('rejects an amount that would round to zero', () => {
      // 0.01 / 3.733 = 0.0027 → 0.00
      expect(() => penToUsd.convert(Amount.of(0.01), quote)).toThrow(
        new InvalidAmountError(
          'El monto es demasiado pequeño para realizar el cambio',
        ),
      );
    });
  });
});
