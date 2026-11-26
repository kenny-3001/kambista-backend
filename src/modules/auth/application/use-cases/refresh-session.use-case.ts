import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { RefreshTokenGenerator } from '../ports/refresh-token-generator';
import {
  SessionTokenIssuer,
  SessionTokens,
} from '../services/session-token-issuer';

export interface RefreshSessionResult extends SessionTokens {
  user: User;
}

/**
 * Exchanges a refresh token for a new pair of tokens (rotation). Each
 * refresh token works once; presenting one that was already exchanged means
 * it was copied, so the whole session is closed.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly generator: RefreshTokenGenerator,
    private readonly users: UserRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(refreshToken: string): Promise<RefreshSessionResult> {
    const now = this.now();
    const tokenHash = this.generator.hash(refreshToken);

    const consumed = await this.refreshTokens.consume(tokenHash, now);
    if (!consumed) {
      const known = await this.refreshTokens.findByHash(tokenHash);
      if (known?.usedAt && !known.revokedAt) {
        // Reuse of a rotated token: either the client or an attacker holds
        // a stolen copy. Closing the session protects the legitimate user.
        await this.refreshTokens.revokeFamily(known.familyId, now);
      }
      throw new InvalidRefreshTokenError();
    }

    // The user is read again, so a new token carries the current role.
    const user = await this.users.findById(consumed.userId);
    if (!user) {
      await this.refreshTokens.revokeFamily(consumed.familyId, now);
      throw new InvalidRefreshTokenError();
    }

    const tokens = await this.issuer.issue(user, now, consumed.familyId);
    return { ...tokens, user };
  }
}
