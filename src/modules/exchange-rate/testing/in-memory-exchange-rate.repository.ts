import { ExchangeRate } from '../domain/exchange-rate';
import { ExchangeRateRepository } from '../domain/exchange-rate.repository';

export class InMemoryExchangeRateRepository extends ExchangeRateRepository {
  readonly rates: ExchangeRate[] = [];

  save(rate: ExchangeRate): Promise<void> {
    this.rates.push(rate);
    return Promise.resolve();
  }

  findLatest(): Promise<ExchangeRate | null> {
    const latest = [...this.rates].sort(
      (a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime(),
    )[0];
    return Promise.resolve(latest ?? null);
  }
}
