import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXAMPLE_JWT_SECRET, envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    MONGO_URI: 'mongodb://localhost:27017/kambista',
    JWT_SECRET: 'a'.repeat(32),
  };

  it('accepts the minimal configuration and applies defaults', () => {
    const { error, value } = envValidationSchema.validate(validEnv) as {
      error?: Error;
      value: Record<string, unknown>;
    };

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGIN: 'http://localhost:5173',
      JWT_EXPIRES_IN: '1h',
      LOGIN_MAX_FAILED_ATTEMPTS: 5,
      LOGIN_ATTEMPTS_WINDOW_MINUTES: 15,
      EXCHANGE_RATE_API_URL: 'https://api.apis.net.pe/v1/tipo-cambio-sunat',
      EXCHANGE_RATE_REFRESH_INTERVAL_MS: 30_000,
      EXCHANGE_RATE_TIMEOUT_MS: 5_000,
    });
  });

  it('converts numeric settings provided as text (as in a .env file)', () => {
    const { value } = envValidationSchema.validate({
      ...validEnv,
      EXCHANGE_RATE_REFRESH_INTERVAL_MS: '30000',
      EXCHANGE_RATE_TIMEOUT_MS: '5000',
    }) as { value: Record<string, unknown> };

    expect(value.EXCHANGE_RATE_REFRESH_INTERVAL_MS).toBe(30_000);
    expect(value.EXCHANGE_RATE_TIMEOUT_MS).toBe(5_000);
  });

  it.each([
    [
      'a refresh interval below one second',
      { EXCHANGE_RATE_REFRESH_INTERVAL_MS: 500 },
    ],
    [
      'a non-numeric refresh interval',
      { EXCHANGE_RATE_REFRESH_INTERVAL_MS: 'often' },
    ],
    [
      // Node would turn it into a 1 ms interval and flood the provider.
      'a refresh interval longer than a timer allows',
      { EXCHANGE_RATE_REFRESH_INTERVAL_MS: 3_000_000_000 },
    ],
    [
      'a provider timeout longer than a timer allows',
      { EXCHANGE_RATE_TIMEOUT_MS: 3_000_000_000 },
    ],
    ['no allowed login attempts', { LOGIN_MAX_FAILED_ATTEMPTS: 0 }],
    ['a fractional login limit', { LOGIN_MAX_FAILED_ATTEMPTS: 2.5 }],
    ['a login window of zero minutes', { LOGIN_ATTEMPTS_WINDOW_MINUTES: 0 }],
    [
      'a login window longer than a day',
      { LOGIN_ATTEMPTS_WINDOW_MINUTES: 24 * 60 + 1 },
    ],
    [
      'a provider URL that is not http(s)',
      { EXCHANGE_RATE_API_URL: 'ftp://x' },
    ],
  ])('rejects %s', (_label, override) => {
    expect(
      envValidationSchema.validate({ ...validEnv, ...override }).error,
    ).toBeDefined();
  });

  it('requires MONGO_URI with a mongodb scheme', () => {
    expect(
      envValidationSchema.validate({ ...validEnv, MONGO_URI: undefined }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        ...validEnv,
        MONGO_URI: 'http://localhost',
      }).error,
    ).toBeDefined();
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(
      envValidationSchema.validate({ ...validEnv, JWT_SECRET: 'short' }).error,
    ).toBeDefined();
  });

  it('accepts the example JWT secret outside production, so the README setup works', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(
        envValidationSchema.validate({
          ...validEnv,
          NODE_ENV,
          JWT_SECRET: EXAMPLE_JWT_SECRET,
        }).error,
      ).toBeUndefined();
    }
  });

  it('knows the exact JWT secret published in .env.example', () => {
    const example = readFileSync(
      join(__dirname, '../../../../.env.example'),
      'utf8',
    );

    // Works with both LF and CRLF checkouts.
    expect(/^JWT_SECRET=(.*?)\r?$/m.exec(example)?.[1]).toBe(
      EXAMPLE_JWT_SECRET,
    );
  });

  it('rejects the example JWT secret in production', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: EXAMPLE_JWT_SECRET,
    });

    expect(error?.message).toContain('example value');
    expect(
      envValidationSchema.validate({ ...validEnv, NODE_ENV: 'production' })
        .error,
    ).toBeUndefined();
  });

  it.each(['15m', '900s', '1h', '7d'])(
    'accepts the token lifetime "%s"',
    (lifetime) => {
      expect(
        envValidationSchema.validate({
          ...validEnv,
          JWT_EXPIRES_IN: lifetime,
        }).error,
      ).toBeUndefined();
    },
  );

  it.each(['1 hour', 'forever', '-1h', '10', '0h', '05m'])(
    'rejects the token lifetime "%s"',
    (lifetime) => {
      expect(
        envValidationSchema.validate({
          ...validEnv,
          JWT_EXPIRES_IN: lifetime,
        }).error,
      ).toBeDefined();
    },
  );
});
