import { ExchangeRateNotAvailableError } from '../../domain/errors/exchange-rate-not-available.error';
import { ExchangeRate } from '../../domain/exchange-rate';
import { InMemoryExchangeRateRepository } from '../../testing/in-memory-exchange-rate.repository';
import { GetCurrentExchangeRateUseCase } from './get-current-exchange-rate.use-case';

describe('GetCurrentExchangeRateUseCase', () => {
  let rates: InMemoryExchangeRateRepository;
  let getCurrent: GetCurrentExchangeRateUseCase;

  beforeEach(() => {
    rates = new InMemoryExchangeRateRepository();
    getCurrent = new GetCurrentExchangeRateUseCase(rates);
  });

  it('returns the most recently stored rate', async () => {
    const base = {
      buy: 3.733,
      currency: 'USD',
      source: 'SUNAT',
      date: '2024-01-18',
    };
    await rates.save(
      ExchangeRate.create({
        ...base,
        sell: 3.739,
        fetchedAt: new Date('2024-01-18T15:00:00Z'),
      }),
    );
    await rates.save(
      ExchangeRate.create({
        ...base,
        sell: 3.75,
        fetchedAt: new Date('2024-01-18T15:00:30Z'),
      }),
    );

    await expect(getCurrent.execute()).resolves.toMatchObject({ sell: 3.75 });
  });

  it('fails with a specific error when no rate has been stored yet', async () => {
    await expect(getCurrent.execute()).rejects.toThrow(
      ExchangeRateNotAvailableError,
    );
  });
});
