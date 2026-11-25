import { ExchangeRateProviderError } from '../../application/errors/exchange-rate-provider.error';
import { ApisNetPeExchangeRateProvider } from './apis-net-pe-exchange-rate.provider';

describe('ApisNetPeExchangeRateProvider', () => {
  const URL = 'https://api.example.test/tipo-cambio-sunat';
  const provider = new ApisNetPeExchangeRateProvider(URL, 50);
  let fetchMock: jest.SpyInstance;

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('maps the documented response to the provider rate', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        compra: 3.733,
        venta: 3.739,
        origen: 'SUNAT',
        moneda: 'USD',
        fecha: '2024-01-18',
      }),
    );

    await expect(provider.fetchCurrent()).resolves.toEqual({
      buy: 3.733,
      sell: 3.739,
      currency: 'USD',
      source: 'SUNAT',
      date: '2024-01-18',
    });
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(URL);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports the rate limit explicitly (HTTP 429 with an HTML body)', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>429 Too Many Requests</html>', { status: 429 }),
    );

    await expect(provider.fetchCurrent()).rejects.toThrow(
      'límite de peticiones alcanzado (HTTP 429)',
    );
  });

  it('reports other HTTP errors with their status', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 503 }));

    await expect(provider.fetchCurrent()).rejects.toThrow('respuesta HTTP 503');
  });

  it('reports a body that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', { status: 200 }));

    await expect(provider.fetchCurrent()).rejects.toThrow(
      'la respuesta no es un JSON válido',
    );
  });

  it.each([
    [
      'a missing field',
      { compra: 3.7, origen: 'SUNAT', moneda: 'USD', fecha: '2024-01-18' },
    ],
    [
      'a price sent as text',
      {
        compra: '3.7',
        venta: 3.8,
        origen: 'SUNAT',
        moneda: 'USD',
        fecha: '2024-01-18',
      },
    ],
    ['a non-object body', [1, 2, 3]],
    ['a null body', null],
  ])('reports %s as an unexpected format', async (_label, body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));

    await expect(provider.fetchCurrent()).rejects.toThrow(
      'formato de respuesta inesperado',
    );
  });

  it('reports a timeout when the provider does not answer in time', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () =>
            reject(init.signal!.reason as Error),
          );
        }),
    );

    await expect(provider.fetchCurrent()).rejects.toThrow(
      'sin respuesta en 50 ms',
    );
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(provider.fetchCurrent()).rejects.toThrow(
      new ExchangeRateProviderError('error de red'),
    );
  });
});
