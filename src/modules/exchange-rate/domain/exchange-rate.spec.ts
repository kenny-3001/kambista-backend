import { InvalidExchangeRateError } from './errors/invalid-exchange-rate.error';
import { ExchangeRate } from './exchange-rate';

describe('ExchangeRate', () => {
  const valid = {
    buy: 3.733,
    sell: 3.739,
    currency: 'USD',
    source: 'SUNAT',
    date: '2024-01-18',
    fetchedAt: new Date('2024-01-18T15:00:00Z'),
  };

  it('creates a rate with a generated id', () => {
    const rate = ExchangeRate.create(valid);

    expect(rate.id).toEqual(expect.any(String));
    expect(rate).toMatchObject({ buy: 3.733, sell: 3.739, date: '2024-01-18' });
  });

  it('accepts equal buy and sell prices', () => {
    expect(() =>
      ExchangeRate.create({ ...valid, buy: 3.7, sell: 3.7 }),
    ).not.toThrow();
  });

  it.each([
    ['a zero buy price', { buy: 0 }],
    ['a negative sell price', { sell: -1 }],
    ['a non-finite price', { buy: Number.NaN }],
    ['a sell price below the buy price', { buy: 3.8, sell: 3.7 }],
    ['an unsupported currency', { currency: 'EUR' }],
    ['a malformed date', { date: '18/01/2024' }],
  ])('rejects %s', (_label, override) => {
    expect(() => ExchangeRate.create({ ...valid, ...override })).toThrow(
      InvalidExchangeRateError,
    );
  });
});
