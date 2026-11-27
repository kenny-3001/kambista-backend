import type { LoggerService } from '@nestjs/common';
import { startApp, type E2EApp } from './setup/start-app';

const PASSWORD = 'MiClave2024';

/** Keeps every log line, to check what the app writes. */
class RecordingLogger implements LoggerService {
  readonly lines: { level: string; message: unknown; context?: unknown }[] = [];
  log = (message: unknown, context?: unknown) =>
    this.record('log', message, context);
  error = (message: unknown, ...rest: unknown[]) =>
    this.record('error', message, rest.at(-1));
  warn = (message: unknown, context?: unknown) =>
    this.record('warn', message, context);
  debug = (message: unknown, context?: unknown) =>
    this.record('debug', message, context);
  verbose = (message: unknown, context?: unknown) =>
    this.record('verbose', message, context);

  private record(level: string, message: unknown, context?: unknown) {
    this.lines.push({ level, message, context });
  }

  /** One request's entry, written by the HTTP logger. */
  requestEntry(requestId: string) {
    return this.lines.find(
      (line) =>
        line.context === 'HTTP' &&
        (line.message as { requestId?: string }).requestId === requestId,
    );
  }
}

describe('Request logging (e2e)', () => {
  const logger = new RecordingLogger();
  let e2e: E2EApp;

  beforeAll(async () => {
    // LOG_FORMAT is json here, as in production (see setup/e2e-env.ts).
    e2e = await startApp({ logger });
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('logs each request once answered, with its id and the user', async () => {
    await e2e
      .api()
      .post('/v1/auth/register')
      .send({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: PASSWORD,
      })
      .expect(201);
    const login = await e2e
      .api()
      .post('/v1/auth/login')
      .send({ email: 'juan@example.com', password: PASSWORD })
      .expect(200);
    const { access_token: token, usuario } = login.body as {
      access_token: string;
      usuario: { id: string };
    };

    const res = await e2e
      .api()
      .get('/v1/transactions/history?startDate=2026-01-01&endDate=2026-01-31')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const requestId = String(res.headers['x-request-id']);
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(logger.requestEntry(requestId)).toEqual({
      level: 'log',
      context: 'HTTP',
      message: {
        requestId,
        method: 'GET',
        // Without the query string.
        path: '/v1/transactions/history',
        status: 200,
        durationMs: expect.any(Number) as number,
        userId: usuario.id,
      },
    });
  });

  it('keeps the request id a proxy or client sent', async () => {
    const res = await e2e
      .api()
      .get('/v1/no-existe')
      .set('X-Request-Id', 'proxy-abc-123');

    expect(res.headers['x-request-id']).toBe('proxy-abc-123');
    expect(logger.requestEntry('proxy-abc-123')?.message).toMatchObject({
      status: 404,
      path: '/v1/no-existe',
    });
  });

  it('never writes passwords or tokens to the logs', async () => {
    await e2e
      .api()
      .post('/v1/auth/register')
      .send({
        nombre: 'Ana Ríos',
        email: 'ana@example.com',
        password: PASSWORD,
      })
      .expect(201);
    const login = await e2e
      .api()
      .post('/v1/auth/login')
      .send({ email: 'ana@example.com', password: PASSWORD })
      .expect(200);
    const { access_token, refresh_token } = login.body as {
      access_token: string;
      refresh_token: string;
    };
    // The access token travels in a header, the refresh token in a body.
    await e2e
      .api()
      .get('/v1/exchange-rate')
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);
    await e2e
      .api()
      .post('/v1/auth/refresh')
      .send({ refresh_token })
      .expect(200);

    const written = JSON.stringify(logger.lines);
    for (const secret of [PASSWORD, access_token, refresh_token]) {
      expect(written).not.toContain(secret);
    }
  });
});
