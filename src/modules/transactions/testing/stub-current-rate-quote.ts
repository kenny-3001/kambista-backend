import { ExchangeRateNotAvailableError } from '../../exchange-rate/domain/errors/exchange-rate-not-available.error';
import { CurrentRateQuote } from '../application/ports/current-rate-quote';
import { RateQuote } from '../domain/rate-quote';

/** Values from the example in the statement: compra 3.733 / venta 3.739. */
export const SAMPLE_QUOTE: RateQuote = { buy: 3.733, sell: 3.739 };

export class StubCurrentRateQuote extends CurrentRateQuote {
  calls = 0;
  private quote: RateQuote | null = SAMPLE_QUOTE;

  respondWith(quote: RateQuote): void {
    this.quote = quote;
  }

  /** Simulates the API before the first rate has been fetched. */
  withoutRate(): void {
    this.quote = null;
  }

  get(): Promise<RateQuote> {
    this.calls++;
    return this.quote
      ? Promise.resolve(this.quote)
      : Promise.reject(new ExchangeRateNotAvailableError());
  }
}
