import { envValidationSchema } from './env.validation';

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
