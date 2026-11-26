import { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { RefreshTokenGenerator } from '../ports/refresh-token-generator';

/**
 * Closes the session of the given refresh token. Always succeeds, so the
 * answer reveals nothing about whether the token existed. Access tokens
 * already issued stay valid until they expire (15 minutes by default).
 */
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly generator: RefreshTokenGenerator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const token = await this.refreshTokens.findByHash(
      this.generator.hash(refreshToken),
    );
    if (token && !token.revokedAt) {
      await this.refreshTokens.revokeFamily(token.familyId, this.now());
    }
  }
}
