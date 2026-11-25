import { GetCurrentExchangeRateUseCase } from '../../../exchange-rate/application/use-cases/get-current-exchange-rate.use-case';
import { CurrentRateQuote } from '../../application/ports/current-rate-quote';
import { RateQuote } from '../../domain/rate-quote';

/**
 * Reads the rate in force from the exchange-rate module (served from its
 * in-memory cache) and translates it into this module's terms.
 */
export class ExchangeRateModuleRateQuote extends CurrentRateQuote {
  constructor(private readonly getCurrentRate: GetCurrentExchangeRateUseCase) {
    super();
  }

  async get(): Promise<RateQuote> {
    const rate = await this.getCurrentRate.execute();
    return { buy: rate.buy, sell: rate.sell };
  }
}
