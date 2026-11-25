import { ExchangeRate } from '../../domain/exchange-rate';
import { ExchangeRateRepository } from '../../domain/exchange-rate.repository';

/**
 * Decorator that keeps the latest rate in memory so that reading the current
 * rate (once per transaction) does not hit the database. Writes go through
 * to the underlying repository first, so the cache never holds a rate that
 * was not persisted.
 *
 * The cache lives in this process: with several API instances each one keeps
 * its own copy, refreshed by its own scheduler.
 */
export class CachedExchangeRateRepository extends ExchangeRateRepository {
  private latest: ExchangeRate | null = null;

  constructor(private readonly inner: ExchangeRateRepository) {
    super();
  }

  async save(rate: ExchangeRate): Promise<void> {
    await this.inner.save(rate);
    this.keepIfNewer(rate);
  }

  async findLatest(): Promise<ExchangeRate | null> {
    if (this.latest) {
      return this.latest;
    }

    // Only the first read after a restart (or before any rate exists)
    // reaches the database.
    const stored = await this.inner.findLatest();
    if (stored) {
      // A save may have completed while we were waiting on the database,
      // so the stored rate is only kept if it is still the newest one.
      this.keepIfNewer(stored);
    }
    return this.latest;
  }

  private keepIfNewer(rate: ExchangeRate): void {
    if (!this.latest || rate.fetchedAt >= this.latest.fetchedAt) {
      this.latest = rate;
    }
  }
}
