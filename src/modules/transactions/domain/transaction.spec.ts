import { Currency } from './currency';
import { Transaction } from './transaction';
import { Amount } from './value-objects/amount';
import { CurrencyPair } from './value-objects/currency-pair';

describe('Transaction', () => {
  const createdAt = new Date('2024-01-18T15:00:00Z');

  const exchange = (source: Currency, target: Currency, amount: number) =>
    Transaction.create({
      userId: 'user-1',
      pair: CurrencyPair.of(source, target),
      amount: Amount.of(amount),
      quote: { buy: 3.733, sell: 3.739 },
      createdAt,
    });

  it('records the converted amount and the rate applied', () => {
    const transaction = exchange(Currency.USD, Currency.PEN, 100);

    expect(transaction).toMatchObject({
      userId: 'user-1',
      sourceCurrency: Currency.USD,
      targetCurrency: Currency.PEN,
      amount: 100,
      convertedAmount: 373.9,
      rate: 3.739,
      createdAt,
    });
  });

  it('applies the buy price when the customer buys dollars', () => {
    const transaction = exchange(Currency.PEN, Currency.USD, 373.3);

    expect(transaction.rate).toBe(3.733);
    expect(transaction.convertedAmount).toBe(100);
  });

  it('gives every transaction its own id', () => {
    const first = exchange(Currency.USD, Currency.PEN, 100);
    const second = exchange(Currency.USD, Currency.PEN, 100);

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.id).not.toBe(second.id);
  });
});
