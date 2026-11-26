import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { TooManyLoginAttemptsError } from '../../domain/errors/too-many-login-attempts.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { FakePasswordHasher } from '../../testing/fake-password-hasher';
import { FakeTokenService } from '../../testing/fake-token-service';
import { InMemoryLoginAttemptCounter } from '../../testing/in-memory-login-attempt-counter';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { LoginUserUseCase } from './login-user.use-case';

describe('LoginUserUseCase', () => {
  const POLICY = { maxFailedAttempts: 3, windowMs: 15 * 60_000 };
  const IP = '203.0.113.7';
  let now: Date;
  let users: InMemoryUserRepository;
  let attempts: InMemoryLoginAttemptCounter;
  let hasher: FakePasswordHasher;
  let tokens: FakeTokenService;
  let loginUser: LoginUserUseCase;
  let juan: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokens = new FakeTokenService();
    attempts = new InMemoryLoginAttemptCounter();
    now = new Date('2024-01-18T15:00:00Z');
    loginUser = new LoginUserUseCase(
      users,
      hasher,
      tokens,
      attempts,
      POLICY,
      () => now,
    );

    juan = User.register({
      name: 'Juan Pérez',
      email: Email.create('juan@example.com'),
      passwordHash: await hasher.hash('contraseña123'),
    });
    await users.create(juan);
  });

  it('returns an access token and the user for valid credentials', async () => {
    const result = await loginUser.execute({
      email: 'juan@example.com',
      password: 'contraseña123',
      clientIp: IP,
    });

    expect(result.accessToken).toBe(`token-for:${juan.id}`);
    expect(result.user).toBe(juan);
  });

  it('signs the token with the user id, email and role', async () => {
    await loginUser.execute({
      email: 'juan@example.com',
      password: 'contraseña123',
      clientIp: IP,
    });

    expect(tokens.issued).toEqual([
      { sub: juan.id, email: 'juan@example.com', role: Role.USER },
    ]);
  });

  it('accepts the email regardless of casing', async () => {
    await expect(
      loginUser.execute({
        email: 'JUAN@Example.com',
        password: 'contraseña123',
      }),
    ).resolves.toMatchObject({ user: juan });
  });

  it('rejects a wrong password without issuing a token', async () => {
    await expect(
      loginUser.execute({
        email: 'juan@example.com',
        password: 'incorrecta',
        clientIp: IP,
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(tokens.issued).toHaveLength(0);
  });

  it('rejects an unknown email with the same error as a wrong password', async () => {
    await expect(
      loginUser.execute({
        email: 'nadie@example.com',
        password: 'contraseña123',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(tokens.issued).toHaveLength(0);
  });

  it('still spends hashing time when the email is unknown', async () => {
    const hashSpy = jest.spyOn(hasher, 'hash');

    await expect(
      loginUser.execute({
        email: 'nadie@example.com',
        password: 'x',
        clientIp: IP,
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(hashSpy).toHaveBeenCalledTimes(1);
  });

  describe('limit of failed attempts', () => {
    const attempt = (password: string, clientIp = IP) =>
      loginUser.execute({ email: 'juan@example.com', password, clientIp });

    const failTimes = async (times: number, clientIp = IP) => {
      for (let i = 0; i < times; i++) {
        await expect(attempt('incorrecta', clientIp)).rejects.toThrow(
          InvalidCredentialsError,
        );
      }
    };

    it('blocks the next attempt once the limit of failures is reached', async () => {
      await failTimes(POLICY.maxFailedAttempts);

      await expect(attempt('incorrecta')).rejects.toThrow(
        TooManyLoginAttemptsError,
      );
    });

    it('rejects even the right password while blocked, without checking it', async () => {
      await failTimes(POLICY.maxFailedAttempts);
      const compare = jest.spyOn(hasher, 'compare');

      await expect(attempt('contraseña123')).rejects.toThrow(
        TooManyLoginAttemptsError,
      );
      expect(compare).not.toHaveBeenCalled();
      expect(tokens.issued).toHaveLength(0);
    });

    it('tells how long to wait until the window ends', async () => {
      await failTimes(POLICY.maxFailedAttempts);
      now = new Date(now.getTime() + 5 * 60_000 + 30_000);

      const error = await attempt('incorrecta').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TooManyLoginAttemptsError);
      expect((error as TooManyLoginAttemptsError).retryAfterSeconds).toBe(
        9 * 60 + 30,
      );
      expect((error as TooManyLoginAttemptsError).message).toBe(
        'Demasiados intentos fallidos. Intenta nuevamente en 10 minutos.',
      );
    });

    it('allows attempts again once the window ends', async () => {
      await failTimes(POLICY.maxFailedAttempts);
      now = new Date(now.getTime() + POLICY.windowMs);

      await expect(attempt('contraseña123')).resolves.toMatchObject({
        user: juan,
      });
    });

    it('allows a successful login just below the limit and resets the count', async () => {
      await failTimes(POLICY.maxFailedAttempts - 1);
      await expect(attempt('contraseña123')).resolves.toMatchObject({
        user: juan,
      });

      // The count started over: the full allowance is available again.
      await failTimes(POLICY.maxFailedAttempts);
    });

    it('counts each IP separately, so the owner is not locked out', async () => {
      await failTimes(POLICY.maxFailedAttempts, '198.51.100.9');

      await expect(attempt('contraseña123')).resolves.toMatchObject({
        user: juan,
      });
    });

    it('counts the email case-insensitively', async () => {
      await failTimes(POLICY.maxFailedAttempts);

      await expect(
        loginUser.execute({
          email: 'JUAN@Example.com',
          password: 'contraseña123',
          clientIp: IP,
        }),
      ).rejects.toThrow(TooManyLoginAttemptsError);
    });
  });
});
