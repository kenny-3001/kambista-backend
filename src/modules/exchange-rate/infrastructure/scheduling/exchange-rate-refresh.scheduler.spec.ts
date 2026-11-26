import { Logger } from '@nestjs/common';
import { ExchangeRateProviderError } from '../../application/errors/exchange-rate-provider.error';
import { RefreshExchangeRateUseCase } from '../../application/use-cases/refresh-exchange-rate.use-case';
import { InMemoryExchangeRateRepository } from '../../testing/in-memory-exchange-rate.repository';
import {
  SAMPLE_PROVIDER_RATE,
  StubExchangeRateProvider,
} from '../../testing/stub-exchange-rate.provider';
import { ExchangeRateRefreshScheduler } from './exchange-rate-refresh.scheduler';

describe('ExchangeRateRefreshScheduler', () => {
  const INTERVAL_MS = 30_000;
  let provider: StubExchangeRateProvider;
  let rates: InMemoryExchangeRateRepository;
  let scheduler: ExchangeRateRefreshScheduler;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    provider = new StubExchangeRateProvider();
    rates = new InMemoryExchangeRateRepository();
    scheduler = new ExchangeRateRefreshScheduler(
      new RefreshExchangeRateUseCase(provider, rates),
      INTERVAL_MS,
    );
  });

  afterEach(() => {
    scheduler.onApplicationShutdown();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refreshes immediately on startup, without waiting for the first interval', async () => {
    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);

    expect(provider.calls).toBe(1);
    expect(rates.rates).toHaveLength(1);
  });

  it('refreshes again every interval', async () => {
    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(provider.calls).toBe(4);
    expect(rates.rates).toHaveLength(4);
  });

  it('keeps the last stored rate and keeps running when the provider fails', async () => {
    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);

    provider.failWith(new ExchangeRateProviderError('HTTP 429'));
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Se reintentará en 30 s; mientras tanto se usa el último tipo de cambio guardado, si existe.',
      ),
    );
    expect(rates.rates).toHaveLength(1);

    provider.respondWith({ ...SAMPLE_PROVIDER_RATE, sell: 3.8 });
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(rates.rates).toHaveLength(2);
    expect((await rates.findLatest())!.sell).toBe(3.8);
  });

  it('never overlaps two refreshes when the provider is slow', async () => {
    let release!: () => void;
    const fetchSpy = jest.spyOn(provider, 'fetchCurrent').mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(SAMPLE_PROVIDER_RATE);
        }),
    );

    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    release();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('stops refreshing on shutdown', async () => {
    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);
    scheduler.onApplicationShutdown();

    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    expect(provider.calls).toBe(1);
  });

  it('survives a failure that is not an Error instance', async () => {
    jest
      .spyOn(provider, 'fetchCurrent')
      .mockImplementationOnce(() => Promise.reject(new Error('x')))
      // Simulates a third-party library rejecting with a plain value.
      .mockImplementationOnce(() => {
        throw 'unexpected failure'; // eslint-disable-line @typescript-eslint/only-throw-error
      });

    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(warn).toHaveBeenLastCalledWith(
      'unexpected failure. Se reintentará en 30 s; mientras tanto se usa el último tipo de cambio guardado, si existe.',
    );
  });
});
