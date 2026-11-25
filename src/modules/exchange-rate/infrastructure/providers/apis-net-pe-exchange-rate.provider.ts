import { ExchangeRateProviderError } from '../../application/errors/exchange-rate-provider.error';
import {
  ExchangeRateProvider,
  ProviderExchangeRate,
} from '../../application/ports/exchange-rate-provider';

const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * Client for https://api.apis.net.pe/v1/tipo-cambio-sunat.
 * Response: { compra, venta, origen, moneda, fecha }.
 */
export class ApisNetPeExchangeRateProvider extends ExchangeRateProvider {
  constructor(
    private readonly url: string,
    private readonly timeoutMs: number,
  ) {
    super();
  }

  async fetchCurrent(): Promise<ProviderExchangeRate> {
    let response: Response;
    try {
      response = await fetch(this.url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // AbortSignal.timeout rejects with a DOMException named TimeoutError;
      // match on the name rather than the class to be realm-independent.
      const timedOut = (error as { name?: unknown })?.name === 'TimeoutError';
      throw new ExchangeRateProviderError(
        timedOut ? `sin respuesta en ${this.timeoutMs} ms` : 'error de red',
      );
    }

    if (!response.ok) {
      throw new ExchangeRateProviderError(
        response.status === HTTP_TOO_MANY_REQUESTS
          ? 'límite de peticiones alcanzado (HTTP 429)'
          : `respuesta HTTP ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ExchangeRateProviderError('la respuesta no es un JSON válido');
    }

    return this.parse(body);
  }

  private parse(body: unknown): ProviderExchangeRate {
    if (typeof body !== 'object' || body === null) {
      throw new ExchangeRateProviderError('formato de respuesta inesperado');
    }
    const { compra, venta, moneda, origen, fecha } = body as Record<
      string,
      unknown
    >;
    if (
      typeof compra !== 'number' ||
      typeof venta !== 'number' ||
      typeof moneda !== 'string' ||
      typeof origen !== 'string' ||
      typeof fecha !== 'string'
    ) {
      throw new ExchangeRateProviderError('formato de respuesta inesperado');
    }
    return {
      buy: compra,
      sell: venta,
      currency: moneda,
      source: origen,
      date: fecha,
    };
  }
}
