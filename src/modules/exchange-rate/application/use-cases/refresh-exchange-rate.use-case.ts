import { ExchangeRate } from '../../domain/exchange-rate';
import { ExchangeRateRepository } from '../../domain/exchange-rate.repository';
import { ExchangeRateProvider } from '../ports/exchange-rate-provider';

/** Fetches the official rate from the provider and stores it. */
export class RefreshExchangeRateUseCase {
  constructor(
    private readonly provider: ExchangeRateProvider,
    private readonly rates: ExchangeRateRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<ExchangeRate> {
    const fetched = await this.provider.fetchCurrent();
    const rate = ExchangeRate.create({ ...fetched, fetchedAt: this.now() });
    await this.rates.save(rate);
    return rate;
  }
}
