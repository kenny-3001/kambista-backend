import { ExchangeRate } from './exchange-rate';

export abstract class ExchangeRateRepository {
  abstract save(rate: ExchangeRate): Promise<void>;
  /** The most recently fetched rate, or null if none was ever stored. */
  abstract findLatest(): Promise<ExchangeRate | null>;
}
