import { RateQuote } from '../../domain/rate-quote';

/**
 * Gives the rate in force. Fails with a DomainError (503) when no rate has
 * been registered yet, so no transaction is created without one.
 */
export abstract class CurrentRateQuote {
  abstract get(): Promise<RateQuote>;
}
