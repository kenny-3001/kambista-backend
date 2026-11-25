import { ExchangeRateNotAvailableError } from '../../domain/errors/exchange-rate-not-available.error';
import { ExchangeRate } from '../../domain/exchange-rate';
import { ExchangeRateRepository } from '../../domain/exchange-rate.repository';

/** The rate in force: the most recently stored one. */
export class GetCurrentExchangeRateUseCase {
  constructor(private readonly rates: ExchangeRateRepository) {}

  async execute(): Promise<ExchangeRate> {
    const rate = await this.rates.findLatest();
    if (!rate) {
      throw new ExchangeRateNotAvailableError();
    }
    return rate;
  }
}
