import { ExchangeRate } from '../../domain/exchange-rate';
import { InMemoryExchangeRateRepository } from '../../testing/in-memory-exchange-rate.repository';
import { CachedExchangeRateRepository } from './cached-exchange-rate.repository';

const rateFetchedAt = (iso: string, sell = 3.739) =>
  ExchangeRate.create({
    buy: 3.733,
    sell,
    currency: 'USD',
    source: 'SUNAT',
    date: '2024-01-18',
    fetchedAt: new Date(iso),
  });

describe('CachedExchangeRateRepository', () => {
  let inner: InMemoryExchangeRateRepository;
  let cached: CachedExchangeRateRepository;
  let innerFindLatest: jest.SpyInstance;

  beforeEach(() => {
    inner = new InMemoryExchangeRateRepository();
    innerFindLatest = jest.spyOn(inner, 'findLatest');
    cached = new CachedExchangeRateRepository(inner);
  });

  it('reads the database only once for repeated lookups', async () => {
    await inner.save(rateFetchedAt('2024-01-18T15:00:00Z'));

    for (let i = 0; i < 5; i++) {
      await cached.findLatest();
    }

    expect(innerFindLatest).toHaveBeenCalledTimes(1);
  });

  it('serves a newly saved rate from memory without reading the database', async () => {
    const rate = rateFetchedAt('2024-01-18T15:00:00Z');
    await cached.save(rate);

    await expect(cached.findLatest()).resolves.toBe(rate);
    expect(innerFindLatest).not.toHaveBeenCalled();
  });

  it('persists every saved rate in the underlying repository', async () => {
    await cached.save(rateFetchedAt('2024-01-18T15:00:00Z'));
    await cached.save(rateFetchedAt('2024-01-18T15:00:30Z'));

    expect(inner.rates).toHaveLength(2);
  });

  it('does not cache a rate that failed to persist', async () => {
    jest.spyOn(inner, 'save').mockRejectedValueOnce(new Error('db down'));

    await expect(
      cached.save(rateFetchedAt('2024-01-18T15:00:00Z')),
    ).rejects.toThrow('db down');
    await expect(cached.findLatest()).resolves.toBeNull();
  });

  it('keeps the newest rate if an older one is saved later', async () => {
    const newer = rateFetchedAt('2024-01-18T15:01:00Z', 3.76);
    await cached.save(newer);
    await cached.save(rateFetchedAt('2024-01-18T15:00:00Z', 3.74));

    await expect(cached.findLatest()).resolves.toBe(newer);
  });

  it('returns null and keeps checking the database while no rate exists', async () => {
    await expect(cached.findLatest()).resolves.toBeNull();
    await inner.save(rateFetchedAt('2024-01-18T15:00:00Z'));

    await expect(cached.findLatest()).resolves.not.toBeNull();
    expect(innerFindLatest).toHaveBeenCalledTimes(2);
  });

  it('never replaces a fresh save with an older rate read concurrently from the database', async () => {
    const stale = rateFetchedAt('2024-01-18T15:00:00Z', 3.74);
    const fresh = rateFetchedAt('2024-01-18T15:00:30Z', 3.75);
    let resolveRead!: (rate: ExchangeRate) => void;
    innerFindLatest.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRead = resolve)),
    );

    // A read starts and waits on the database...
    const pendingRead = cached.findLatest();
    // ...meanwhile the scheduler stores a newer rate...
    await cached.save(fresh);
    // ...and only then the database answers with the older one.
    resolveRead(stale);

    await expect(pendingRead).resolves.toBe(fresh);
    await expect(cached.findLatest()).resolves.toBe(fresh);
  });
});
