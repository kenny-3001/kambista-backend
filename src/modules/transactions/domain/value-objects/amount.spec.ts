import { InvalidAmountError } from '../errors/invalid-amount.error';
import { Amount, AMOUNT_MESSAGES } from './amount';

describe('Amount', () => {
  it.each([0.01, 1, 100, 100.5, 100.25, 9_999_999.99])(
    'accepts %p',
    (value) => {
      expect(Amount.of(value).value).toBe(value);
    },
  );

  it.each([
    ['zero', 0, AMOUNT_MESSAGES.notPositive],
    ['a negative amount', -10, AMOUNT_MESSAGES.notPositive],
    ['more than 2 decimals', 10.123, AMOUNT_MESSAGES.tooManyDecimals],
    ['less than one cent', 0.001, AMOUNT_MESSAGES.tooManyDecimals],
    ['more than 7 integer digits', 10_000_000, AMOUNT_MESSAGES.tooLarge],
    ['NaN', NaN, AMOUNT_MESSAGES.notANumber],
    ['Infinity', Infinity, AMOUNT_MESSAGES.notANumber],
    [
      'a numeric string',
      '100' as unknown as number,
      AMOUNT_MESSAGES.notANumber,
    ],
  ])('rejects %s', (_label, value, message) => {
    expect(() => Amount.of(value)).toThrow(new InvalidAmountError(message));
  });
});
