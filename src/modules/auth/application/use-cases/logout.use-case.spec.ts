import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { FakeRefreshTokenGenerator } from '../../testing/fake-refresh-token-generator';
import { FakeTokenService } from '../../testing/fake-token-service';
import { InMemoryRefreshTokenRepository } from '../../testing/in-memory-refresh-token.repository';
import { SessionTokenIssuer } from '../services/session-token-issuer';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  const NOW = new Date('2024-01-18T15:00:00Z');
  let refreshTokens: InMemoryRefreshTokenRepository;
  let issuer: SessionTokenIssuer;
  let logout: LogoutUseCase;
  const juan = User.register({
    name: 'Juan Pérez',
    email: Email.create('juan@example.com'),
    passwordHash: 'hash',
  });

  beforeEach(() => {
    refreshTokens = new InMemoryRefreshTokenRepository();
    const generator = new FakeRefreshTokenGenerator();
    issuer = new SessionTokenIssuer(
      new FakeTokenService(),
      generator,
      refreshTokens,
      60_000,
    );
    logout = new LogoutUseCase(refreshTokens, generator, () => NOW);
  });

  const login = async () => (await issuer.issue(juan, NOW)).refreshToken;
  const stored = (token: string) => refreshTokens.findByHash(`hash:${token}`);

  it('closes the session of the token', async () => {
    const token = await login();

    await logout.execute(token);

    expect((await stored(token))?.revokedAt).toEqual(NOW);
  });

  it('closes only that session, not the other devices', async () => {
    const token = await login();
    const otherDevice = await login();

    await logout.execute(token);

    expect((await stored(otherDevice))?.revokedAt).toBeNull();
  });

  it('succeeds silently for an unknown token', async () => {
    await expect(logout.execute('inventado')).resolves.toBeUndefined();
  });

  it('can be repeated without changing the first logout time', async () => {
    const token = await login();
    await logout.execute(token);

    await new LogoutUseCase(
      refreshTokens,
      new FakeRefreshTokenGenerator(),
      () => new Date(NOW.getTime() + 60_000),
    ).execute(token);

    expect((await stored(token))?.revokedAt).toEqual(NOW);
  });
});
