import { InvalidExchangeRateError } from '../../domain/errors/invalid-exchange-rate.error';
import { InMemoryExchangeRateRepository } from '../../testing/in-memory-exchange-rate.repository';
import {
  SAMPLE_PROVIDER_RATE,
  StubExchangeRateProvider,
} from '../../testing/stub-exchange-rate.provider';
import { ExchangeRateProviderError } from '../errors/exchange-rate-provider.error';
import { RefreshExchangeRateUseCase } from './refresh-exchange-rate.use-case';

describe('RefreshExchangeRateUseCase', () => {
  const now = new Date('2024-01-18T15:00:00Z');
  let provider: StubExchangeRateProvider;
  let rates: InMemoryExchangeRateRepository;
  let refresh: RefreshExchangeRateUseCase;

  beforeEach(() => {
    provider = new StubExchangeRateProvider();
    rates = new InMemoryExchangeRateRepository();
    refresh = new RefreshExchangeRateUseCase(provider, rates, () => now);
  });

  it('stores the rate obtained from the provider with the fetch time', async () => {
    const rate = await refresh.execute();

    expect(rate).toMatchObject({ ...SAMPLE_PROVIDER_RATE, fetchedAt: now });
    expect(rates.rates).toEqual([rate]);
  });

  it('stores nothing when the provider fails', async () => {
    provider.failWith(new ExchangeRateProviderError('HTTP 429'));

    await expect(refresh.execute()).rejects.toThrow(ExchangeRateProviderError);
    expect(rates.rates).toHaveLength(0);
  });

  it('stores nothing when the provider returns an inconsistent rate', async () => {
    provider.respondWith({ ...SAMPLE_PROVIDER_RATE, buy: 4, sell: 3 });

    await expect(refresh.execute()).rejects.toThrow(InvalidExchangeRateError);
    expect(rates.rates).toHaveLength(0);
  });
});
