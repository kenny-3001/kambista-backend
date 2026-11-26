import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { FakeRefreshTokenGenerator } from '../../testing/fake-refresh-token-generator';
import { FakeTokenService } from '../../testing/fake-token-service';
import { InMemoryRefreshTokenRepository } from '../../testing/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { SessionTokenIssuer } from '../services/session-token-issuer';
import { RefreshSessionUseCase } from './refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  const TTL_MS = 7 * 24 * 60 * 60_000;
  let now: Date;
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let tokens: FakeTokenService;
  let issuer: SessionTokenIssuer;
  let refreshSession: RefreshSessionUseCase;
  let juan: User;

  beforeEach(async () => {
    now = new Date('2024-01-18T15:00:00Z');
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    tokens = new FakeTokenService();
    const generator = new FakeRefreshTokenGenerator();
    issuer = new SessionTokenIssuer(tokens, generator, refreshTokens, TTL_MS);
    refreshSession = new RefreshSessionUseCase(
      refreshTokens,
      generator,
      users,
      issuer,
      () => now,
    );

    juan = User.register({
      name: 'Juan Pérez',
      email: Email.create('juan@example.com'),
      passwordHash: 'hash',
    });
    await users.create(juan);
  });

  /** Simulates a login: returns the refresh token of a new session. */
  const login = async () => (await issuer.issue(juan, now)).refreshToken;
  const stored = (token: string) => refreshTokens.findByHash(`hash:${token}`);

  it('exchanges a refresh token for a new pair in the same session', async () => {
    const first = await login();

    const result = await refreshSession.execute(first);

    expect(result.accessToken).toBe(`token-for:${juan.id}`);
    expect(result.refreshToken).not.toBe(first);
    expect(result.user).toBe(juan);
    expect((await stored(first))?.usedAt).toEqual(now);
    expect((await stored(result.refreshToken))?.familyId).toBe(
      (await stored(first))?.familyId,
    );
  });

  it('can be chained: each new refresh token works once', async () => {
    let token = await login();
    for (let i = 0; i < 3; i++) {
      token = (await refreshSession.execute(token)).refreshToken;
    }

    await expect(refreshSession.execute(token)).resolves.toMatchObject({
      user: juan,
    });
  });

  it('closes the whole session when a used refresh token comes back', async () => {
    const stolen = await login();
    const { refreshToken: current } = await refreshSession.execute(stolen);

    // Whoever copied the old token tries to use it.
    await expect(refreshSession.execute(stolen)).rejects.toThrow(
      InvalidRefreshTokenError,
    );

    // The legitimate client is logged out too: the session is compromised.
    await expect(refreshSession.execute(current)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect((await stored(current))?.revokedAt).toEqual(now);
  });

  it('leaves other sessions of the same user untouched on reuse', async () => {
    const stolen = await login();
    const otherDevice = await login();
    await refreshSession.execute(stolen);

    await expect(refreshSession.execute(stolen)).rejects.toThrow(
      InvalidRefreshTokenError,
    );

    await expect(refreshSession.execute(otherDevice)).resolves.toMatchObject({
      user: juan,
    });
  });

  it('rejects an expired refresh token', async () => {
    const token = await login();
    now = new Date(now.getTime() + TTL_MS);

    await expect(refreshSession.execute(token)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('rejects an unknown refresh token', async () => {
    await expect(refreshSession.execute('inventado')).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('issues the new access token with the current role', async () => {
    const token = await login();
    juan.promoteToAdmin();
    await users.update(juan);

    await refreshSession.execute(token);

    expect(tokens.issued.at(-1)).toMatchObject({ role: Role.ADMIN });
  });

  it('closes the session if the user no longer exists', async () => {
    const token = await login();
    users.users.delete(juan.id);

    await expect(refreshSession.execute(token)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect((await stored(token))?.revokedAt).toEqual(now);
  });
});
