import type { Response } from 'supertest';
import { peruToday, startApp, type E2EApp } from './setup/start-app';

// The stub provider's SUNAT rate: buy (compra) 3.733, sell (venta) 3.739.
const PASSWORD = 'MiClave2024';

interface UserBody {
  id: string;
  nombre: string;
  email: string;
  rol: 'user' | 'admin';
}
interface SessionBody {
  access_token: string;
  refresh_token: string;
  usuario: UserBody;
}
interface TransactionBody {
  id: string;
  monedaOrigen: string;
  monedaDestino: string;
  monto: number;
  montoCambiado: number;
  tipoCambio: number;
  fecha: string;
}
interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: { field: string; message: string }[];
}

const bodyOf = <T>(res: Response) => res.body as T;

describe('Kambista API (e2e)', () => {
  let e2e: E2EApp;
  const today = peruToday();

  beforeAll(async () => {
    e2e = await startApp();
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  const register = (email: string, nombre = 'Juan Pérez') =>
    e2e
      .api()
      .post('/v1/auth/register')
      .send({ nombre, email, password: PASSWORD });

  const login = async (email: string, password = PASSWORD) => {
    const res = await e2e
      .api()
      .post('/v1/auth/login')
      .send({ email, password });
    return { res, session: bodyOf<SessionBody>(res) };
  };

  /** Registers a user and logs in: the access token and the user. */
  const newUser = async (email: string, nombre?: string) => {
    await register(email, nombre).expect(201);
    const { session } = await login(email);
    return session;
  };

  const exchange = (token: string, body: object) =>
    e2e
      .api()
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const history = (token: string, query: Record<string, string> = {}) =>
    e2e
      .api()
      .get('/v1/transactions/history')
      .query({ startDate: today, endDate: today, ...query })
      .set('Authorization', `Bearer ${token}`);

  it('runs on its own in-memory database, never the one in .env', () => {
    const uri = new URL(process.env.MONGO_URI ?? '');
    expect(uri.hostname).toBe('127.0.0.1');
    expect(e2e.db.name).toBe(uri.pathname.slice(1));
  });

  describe('the flow of the statement: register, login, exchange, history', () => {
    it('works end to end with the documented fields', async () => {
      // 1. Register: always as a regular user, even when asking for admin.
      const registered = await e2e
        .api()
        .post('/v1/auth/register')
        .send({
          nombre: 'Juan Pérez',
          email: 'Juan@Example.com',
          password: PASSWORD,
          rol: 'admin',
        })
        .expect(201);
      expect(registered.body).toEqual({
        usuario: {
          id: expect.any(String) as string,
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          rol: 'user',
        },
      });

      // 2. Login: a JWT, plus a refresh token.
      const { res: loggedIn, session } = await login('juan@example.com');
      expect(loggedIn.status).toBe(200);
      expect(session).toEqual({
        access_token: expect.stringMatching(
          /^[\w-]+\.[\w-]+\.[\w-]+$/,
        ) as string,
        refresh_token: expect.any(String) as string,
        usuario: bodyOf<{ usuario: UserBody }>(registered).usuario,
      });
      const token = session.access_token;

      // 3. The rate in force, stored from SUNAT at startup.
      const rate = await e2e
        .api()
        .get('/v1/exchange-rate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(rate.body).toEqual({
        compra: 3.733,
        venta: 3.739,
        origen: 'SUNAT',
        moneda: 'USD',
        fecha: '2024-01-18',
        actualizadoEn: expect.any(String) as string,
      });

      // 4. Exchanges: USD → PEN uses venta, PEN → USD uses compra.
      const usdToPen = await exchange(token, {
        monedaOrigen: 'USD',
        monedaDestino: 'PEN',
        monto: 100,
      }).expect(201);
      expect(usdToPen.body).toEqual({
        id: expect.any(String) as string,
        monedaOrigen: 'USD',
        monedaDestino: 'PEN',
        monto: 100,
        montoCambiado: 373.9,
        tipoCambio: 3.739,
        fecha: expect.any(String) as string,
      });
      // 155 × 3.739 = 579.545: half up to 579.55 (plain floats give 579.54).
      const halfUp = await exchange(token, {
        monedaOrigen: 'USD',
        monedaDestino: 'PEN',
        monto: 155,
      }).expect(201);
      expect(bodyOf<TransactionBody>(halfUp).montoCambiado).toBe(579.55);
      const penToUsd = await exchange(token, {
        monedaOrigen: 'PEN',
        monedaDestino: 'USD',
        monto: 500,
      }).expect(201);
      expect(bodyOf<TransactionBody>(penToUsd)).toMatchObject({
        montoCambiado: 133.94,
        tipoCambio: 3.733,
      });

      // 5. History of the day: newest first, same fields, total in a header.
      const all = await history(token).expect(200);
      expect(all.headers['x-total-count']).toBe('3');
      expect(bodyOf<TransactionBody[]>(all).map((t) => t.id)).toEqual([
        bodyOf<TransactionBody>(penToUsd).id,
        bodyOf<TransactionBody>(halfUp).id,
        bodyOf<TransactionBody>(usdToPen).id,
      ]);
      expect(bodyOf<TransactionBody[]>(all)[2]).toEqual(usdToPen.body);

      // Optional pagination keeps the plain array and the total.
      const page2 = await history(token, { page: '2', limit: '2' }).expect(200);
      expect(page2.headers['x-total-count']).toBe('3');
      expect(bodyOf<TransactionBody[]>(page2).map((t) => t.id)).toEqual([
        bodyOf<TransactionBody>(usdToPen).id,
      ]);
    });

    it('stores the password hashed and never returns it', async () => {
      const registered = await register('secreto@example.com').expect(201);
      const { res } = await login('secreto@example.com');

      for (const body of [registered.text, res.text]) {
        expect(body).not.toContain(PASSWORD);
        // No field that carries the password or its hash.
        expect(body).not.toMatch(/"(password|passwordHash|hash)"/i);
      }
      const stored = await e2e.db
        .collection('users')
        .findOne({ email: 'secreto@example.com' });
      expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('roles', () => {
    it('lets a user read only their own history, whatever userId they send', async () => {
      const ana = await newUser('ana@example.com', 'Ana Ríos');
      const luis = await newUser('luis@example.com', 'Luis Soto');
      await exchange(luis.access_token, {
        monedaOrigen: 'USD',
        monedaDestino: 'PEN',
        monto: 10,
      }).expect(201);

      const res = await history(ana.access_token, {
        userId: luis.usuario.id,
      }).expect(200);

      expect(res.body).toEqual([]);
    });

    it('lets an admin, set in the database, read any user', async () => {
      const carla = await newUser('carla@example.com', 'Carla Díaz');
      const tx = await exchange(carla.access_token, {
        monedaOrigen: 'PEN',
        monedaDestino: 'USD',
        monto: 50,
      }).expect(201);
      await newUser('jefa@example.com', 'Jefa');
      // As the statement says: the admin role is managed from the database.
      await e2e.db
        .collection('users')
        .updateOne({ email: 'jefa@example.com' }, { $set: { role: 'admin' } });
      // The role travels in the token: it applies from the next login.
      const { session: admin } = await login('jefa@example.com');
      expect(admin.usuario.rol).toBe('admin');

      const other = await history(admin.access_token, {
        userId: carla.usuario.id,
      }).expect(200);
      const own = await history(admin.access_token).expect(200);

      expect(bodyOf<TransactionBody[]>(other).map((t) => t.id)).toEqual([
        bodyOf<TransactionBody>(tx).id,
      ]);
      expect(own.body).toEqual([]);
    });
  });

  describe('validations and errors, all in one format', () => {
    let token: string;

    beforeAll(async () => {
      ({ access_token: token } = await newUser('errores@example.com'));
    });

    const expectError = (res: Response, statusCode: number, error: string) => {
      expect(res.status).toBe(statusCode);
      expect(res.body).toMatchObject({
        statusCode,
        error,
        message: expect.any(String) as string,
      });
      return bodyOf<ErrorBody>(res);
    };

    it('protects every business endpoint', async () => {
      expectError(
        await e2e.api().get('/v1/transactions/history'),
        401,
        'MISSING_ACCESS_TOKEN',
      );
      expectError(
        await e2e
          .api()
          .post('/v1/transactions')
          .set('Authorization', 'Bearer not-a-jwt')
          .send({}),
        401,
        'INVALID_ACCESS_TOKEN',
      );
      expectError(
        await e2e.api().get('/v1/exchange-rate'),
        401,
        'MISSING_ACCESS_TOKEN',
      );
    });

    it('rejects the same currency on both sides', async () => {
      const res = await exchange(token, {
        monedaOrigen: 'USD',
        monedaDestino: 'USD',
        monto: 10,
      });
      expectError(res, 400, 'SAME_CURRENCY');
    });

    it.each([
      ['zero', 0, 'El monto debe ser mayor a cero'],
      ['negative', -5, 'El monto debe ser mayor a cero'],
      [
        'more than 2 decimals',
        10.123,
        'El monto admite como máximo 2 decimales',
      ],
    ])(
      'rejects a %s amount, saying which field',
      async (_label, monto, message) => {
        const res = await exchange(token, {
          monedaOrigen: 'USD',
          monedaDestino: 'PEN',
          monto,
        });
        const body = expectError(res, 400, 'VALIDATION_ERROR');
        expect(body.details).toEqual([{ field: 'monto', message }]);
      },
    );

    it('rejects an amount whose result rounds to zero', async () => {
      // S/ 0.01 ÷ 3.733 = $ 0.0027 → $ 0.00
      const res = await exchange(token, {
        monedaOrigen: 'PEN',
        monedaDestino: 'USD',
        monto: 0.01,
      });
      expectError(res, 400, 'INVALID_AMOUNT');
    });

    it('requires both dates in the history, in order', async () => {
      const missing = await e2e
        .api()
        .get('/v1/transactions/history')
        .set('Authorization', `Bearer ${token}`)
        .query({ endDate: today });
      expectError(missing, 400, 'VALIDATION_ERROR');

      const reversed = await history(token, {
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      });
      expectError(reversed, 400, 'INVALID_HISTORY_PERIOD');
    });

    it('answers a duplicated email, wrong credentials and malformed requests clearly', async () => {
      expectError(
        await register('errores@example.com'),
        409,
        'EMAIL_ALREADY_REGISTERED',
      );
      expectError(
        (await login('errores@example.com', 'Incorrecta1')).res,
        401,
        'INVALID_CREDENTIALS',
      );
      expectError(
        await e2e
          .api()
          .post('/v1/auth/login')
          .set('Content-Type', 'application/json')
          .send('{"email":'),
        400,
        'INVALID_JSON',
      );
      expectError(await e2e.api().get('/v1/no-existe'), 404, 'ROUTE_NOT_FOUND');
    });
  });

  describe('session', () => {
    const refresh = (refreshToken: string) =>
      e2e.api().post('/v1/auth/refresh').send({ refresh_token: refreshToken });

    it('renews with a refresh token that works only once', async () => {
      await register('sesion@example.com').expect(201);
      const { session } = await login('sesion@example.com');

      const renewed = await refresh(session.refresh_token).expect(200);
      const next = bodyOf<SessionBody>(renewed);
      expect(next.refresh_token).not.toBe(session.refresh_token);
      await history(next.access_token).expect(200);

      // Reusing the old token looks like theft: the whole session is closed.
      expect((await refresh(session.refresh_token)).body).toMatchObject({
        error: 'INVALID_REFRESH_TOKEN',
      });
      expect((await refresh(next.refresh_token)).status).toBe(401);
    });

    it('cannot be renewed after logging out', async () => {
      await register('salir@example.com').expect(201);
      const { session } = await login('salir@example.com');

      await e2e
        .api()
        .post('/v1/auth/logout')
        .send({ refresh_token: session.refresh_token })
        .expect(204);

      expect((await refresh(session.refresh_token)).status).toBe(401);
    });

    it('blocks the login after 5 failed attempts, saying when to retry', async () => {
      await register('bloqueo@example.com').expect(201);
      for (let attempt = 1; attempt <= 5; attempt++) {
        expect(
          (await login('bloqueo@example.com', 'Incorrecta1')).res.status,
        ).toBe(401);
      }

      // Even the right password waits until the window ends.
      const { res } = await login('bloqueo@example.com');

      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({ error: 'TOO_MANY_LOGIN_ATTEMPTS' });
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('HTTP setup, as in production', () => {
    it('lets the frontend read the pagination total and the retry delay', async () => {
      const { access_token: token } = await newUser('cors@example.com');

      const res = await history(token)
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(res.headers['access-control-expose-headers']).toBe(
        'X-Total-Count,Retry-After',
      );
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('serves the API documentation', async () => {
      const res = await e2e.api().get('/docs-json').expect(200);

      expect(Object.keys(bodyOf<{ paths: object }>(res).paths)).toEqual(
        expect.arrayContaining([
          '/v1/auth/register',
          '/v1/auth/login',
          '/v1/transactions',
          '/v1/transactions/history',
          '/v1/exchange-rate',
        ]),
      );
    });
  });
});
