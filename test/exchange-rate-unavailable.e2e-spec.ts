import { ExchangeRateProviderError } from '../src/modules/exchange-rate/application/errors/exchange-rate-provider.error';
import { startApp, type E2EApp } from './setup/start-app';

/**
 * "No se puede realizar un cambio si no existe un tipo de cambio registrado":
 * a fresh database while SUNAT is down. Its own file, so its own database.
 */
describe('Kambista API without a registered exchange rate (e2e)', () => {
  let e2e: E2EApp;
  let token: string;

  beforeAll(async () => {
    e2e = await startAppWithProviderDown();
    await e2e
      .api()
      .post('/v1/auth/register')
      .send({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'MiClave2024',
      })
      .expect(201);
    const login = await e2e
      .api()
      .post('/v1/auth/login')
      .send({ email: 'juan@example.com', password: 'MiClave2024' })
      .expect(200);
    token = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('does not exchange, and says why', async () => {
    const res = await e2e
      .api()
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ monedaOrigen: 'USD', monedaDestino: 'PEN', monto: 100 });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      statusCode: 503,
      error: 'EXCHANGE_RATE_NOT_AVAILABLE',
      message:
        'No hay un tipo de cambio registrado todavía. Intenta nuevamente en unos segundos.',
    });
    expect(await e2e.db.collection('transactions').countDocuments()).toBe(0);
  });

  it('has no current rate to show', async () => {
    const res = await e2e
      .api()
      .get('/v1/exchange-rate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'EXCHANGE_RATE_NOT_AVAILABLE' });
  });

  it('keeps running, and exchanges as soon as SUNAT answers again', async () => {
    e2e.provider.respondWith({
      buy: 3.733,
      sell: 3.739,
      currency: 'USD',
      source: 'SUNAT',
      date: '2024-01-18',
    });
    await e2e.refreshRate();

    await e2e
      .api()
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ monedaOrigen: 'USD', monedaDestino: 'PEN', monto: 100 })
      .expect(201);
  });
});

async function startAppWithProviderDown(): Promise<E2EApp> {
  return startApp({
    providerDown: new ExchangeRateProviderError('SUNAT no responde'),
  });
}
