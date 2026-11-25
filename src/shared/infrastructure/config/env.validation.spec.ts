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
    });
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
