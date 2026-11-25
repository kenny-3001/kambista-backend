export interface ProviderExchangeRate {
  buy: number;
  sell: number;
  currency: string;
  source: string;
  date: string;
}

/** External source of the official exchange rate. */
export abstract class ExchangeRateProvider {
  /** @throws ExchangeRateProviderError when the rate cannot be obtained. */
  abstract fetchCurrent(): Promise<ProviderExchangeRate>;
}
