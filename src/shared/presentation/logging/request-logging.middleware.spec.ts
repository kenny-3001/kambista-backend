import type { LoggerService } from '@nestjs/common';
import express, { type Request } from 'express';
import request from 'supertest';
import {
  requestIdOf,
  requestLogging,
  type RequestLogEntry,
} from './request-logging.middleware';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function setup(format: 'json' | 'pretty' = 'json') {
  const logger = {
    log: jest.fn<void, [unknown]>(),
    error: jest.fn<void, [unknown]>(),
    warn: jest.fn<void, [unknown]>(),
  } satisfies LoggerService;
  const app = express();
  app.use(requestLogging(format, logger));
  app.get('/ok', (req, res) => {
    res.json({ requestId: requestIdOf(req) });
  });
  app.get('/private', (req, res) => {
    // As the JWT guard does on authenticated routes.
    (req as Request & { user: { id: string } }).user = { id: 'u1' };
    res.json({});
  });
  app.get('/crash', (_req, res) => {
    res.status(500).json({});
  });
  app.get('/slow', (_req, res) => {
    setTimeout(() => res.json({}), 1_000);
  });
  return { app, logger };
}

/** The entry logged for the only request, once the response is sent. */
const loggedEntry = (fn: jest.Mock<void, [unknown]>) => {
  expect(fn).toHaveBeenCalledTimes(1);
  return fn.mock.calls[0][0] as RequestLogEntry;
};

describe('requestLogging', () => {
  it('gives each request an id, answered in X-Request-Id', async () => {
    const { app } = setup();

    const first = await request(app).get('/ok').expect(200);
    const second = await request(app).get('/ok').expect(200);

    expect(first.headers['x-request-id']).toMatch(UUID);
    expect(first.body).toEqual({ requestId: first.headers['x-request-id'] });
    expect(second.headers['x-request-id']).not.toBe(
      first.headers['x-request-id'],
    );
  });

  it('logs one structured entry per request, without the query string', async () => {
    const { app, logger } = setup();

    const res = await request(app).get('/ok?startDate=2026-01-01').expect(200);

    expect(loggedEntry(logger.log)).toEqual({
      requestId: res.headers['x-request-id'],
      method: 'GET',
      path: '/ok',
      status: 200,
      durationMs: expect.any(Number) as number,
      userId: undefined,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('includes the authenticated user', async () => {
    const { app, logger } = setup();

    await request(app).get('/private').expect(200);

    expect(loggedEntry(logger.log).userId).toBe('u1');
  });

  it('logs server errors as errors', async () => {
    const { app, logger } = setup();

    await request(app).get('/crash').expect(500);

    expect(loggedEntry(logger.error).status).toBe(500);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('also logs a request the client gave up on before the answer', async () => {
    const { app, logger } = setup();

    // The client stops waiting after 50 ms; the answer would take 1 s.
    await expect(request(app).get('/slow').timeout(50)).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(loggedEntry(logger.warn)).toMatchObject({
      path: '/slow',
      aborted: true,
    });
  });

  it('says so in the readable line of a request the client gave up on', async () => {
    const { app, logger } = setup('pretty');

    await expect(request(app).get('/slow').timeout(50)).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/slow aborted \d+ms id=[0-9a-f-]{36}$/),
    );
  });

  it('keeps a plain request id sent by a proxy or the client', async () => {
    const { app, logger } = setup();

    const res = await request(app)
      .get('/ok')
      .set('X-Request-Id', 'abc-123_XYZ')
      .expect(200);

    expect(res.headers['x-request-id']).toBe('abc-123_XYZ');
    expect(loggedEntry(logger.log).requestId).toBe('abc-123_XYZ');
  });

  it.each([
    ['spaces and symbols', 'abc 123; drop'],
    ['a forged log line', 'abc\\n{"level":"error"}'],
    ['more than 64 characters', 'a'.repeat(65)],
  ])('replaces a request id with %s', async (_label, id) => {
    const { app } = setup();

    const res = await request(app)
      .get('/ok')
      .set('X-Request-Id', id)
      .expect(200);

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('leaves the user out of the readable line of an anonymous request', async () => {
    const { app, logger } = setup('pretty');

    const res = await request(app).get('/ok').expect(200);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^GET /ok 200 \\d+ms id=${res.headers['x-request-id']}$`),
      ),
    );
  });

  it('writes a readable line in the pretty format', async () => {
    const { app, logger } = setup('pretty');

    const res = await request(app).get('/private').expect(200);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^GET /private 200 \\d+ms user=u1 id=${res.headers['x-request-id']}$`,
        ),
      ),
    );
  });
});
