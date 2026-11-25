import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { FakePasswordHasher } from '../../testing/fake-password-hasher';
import { FakeTokenService } from '../../testing/fake-token-service';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { LoginUserUseCase } from './login-user.use-case';

describe('LoginUserUseCase', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let tokens: FakeTokenService;
  let loginUser: LoginUserUseCase;
  let juan: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokens = new FakeTokenService();
    loginUser = new LoginUserUseCase(users, hasher, tokens);

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
    });

    expect(result.accessToken).toBe(`token-for:${juan.id}`);
    expect(result.user).toBe(juan);
  });

  it('signs the token with the user id, email and role', async () => {
    await loginUser.execute({
      email: 'juan@example.com',
      password: 'contraseña123',
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
      loginUser.execute({ email: 'juan@example.com', password: 'incorrecta' }),
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
      loginUser.execute({ email: 'nadie@example.com', password: 'x' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(hashSpy).toHaveBeenCalledTimes(1);
  });
});
