import { GetCurrentExchangeRateUseCase } from '../../../exchange-rate/application/use-cases/get-current-exchange-rate.use-case';
import { ExchangeRateNotAvailableError } from '../../../exchange-rate/domain/errors/exchange-rate-not-available.error';
import { ExchangeRate } from '../../../exchange-rate/domain/exchange-rate';
import { InMemoryExchangeRateRepository } from '../../../exchange-rate/testing/in-memory-exchange-rate.repository';
import { ExchangeRateModuleRateQuote } from './exchange-rate-module.rate-quote';

describe('ExchangeRateModuleRateQuote', () => {
  let rates: InMemoryExchangeRateRepository;
  let quote: ExchangeRateModuleRateQuote;

  beforeEach(() => {
    rates = new InMemoryExchangeRateRepository();
    quote = new ExchangeRateModuleRateQuote(
      new GetCurrentExchangeRateUseCase(rates),
    );
  });

  it('exposes the buy and sell prices of the latest rate', async () => {
    await rates.save(
      ExchangeRate.create({
        buy: 3.47,
        sell: 3.479,
        currency: 'USD',
        source: 'SUNAT',
        date: '2024-01-18',
        fetchedAt: new Date(),
      }),
    );

    await expect(quote.get()).resolves.toEqual({ buy: 3.47, sell: 3.479 });
  });

  it('propagates the 503 error when no rate exists yet', async () => {
    await expect(quote.get()).rejects.toThrow(ExchangeRateNotAvailableError);
  });
});
