import {
  ExchangeRateProvider,
  ProviderExchangeRate,
} from '../application/ports/exchange-rate-provider';

export const SAMPLE_PROVIDER_RATE: ProviderExchangeRate = {
  buy: 3.733,
  sell: 3.739,
  currency: 'USD',
  source: 'SUNAT',
  date: '2024-01-18',
};

export class StubExchangeRateProvider extends ExchangeRateProvider {
  calls = 0;
  private next: () => Promise<ProviderExchangeRate> = () =>
    Promise.resolve(SAMPLE_PROVIDER_RATE);

  respondWith(rate: ProviderExchangeRate): void {
    this.next = () => Promise.resolve(rate);
  }

  failWith(error: Error): void {
    this.next = () => Promise.reject(error);
  }

  fetchCurrent(): Promise<ProviderExchangeRate> {
    this.calls++;
    return this.next();
  }
}
