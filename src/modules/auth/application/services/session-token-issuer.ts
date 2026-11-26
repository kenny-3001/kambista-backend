import { RefreshToken } from '../../domain/refresh-token';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository';
import { User } from '../../domain/user';
import { RefreshTokenGenerator } from '../ports/refresh-token-generator';
import { TokenService } from '../ports/token-service';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Issues the pair of tokens of a session: on login and on every refresh. */
export class SessionTokenIssuer {
  constructor(
    private readonly tokenService: TokenService,
    private readonly generator: RefreshTokenGenerator,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly refreshTokenTtlMs: number,
  ) {}

  /**
   * @param familyId the session being continued when rotating; a new
   * session is started when omitted.
   */
  async issue(
    user: User,
    now: Date,
    familyId?: string,
  ): Promise<SessionTokens> {
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshToken = this.generator.generate();
    await this.refreshTokens.save(
      RefreshToken.issue({
        userId: user.id,
        tokenHash: this.generator.hash(refreshToken),
        now,
        ttlMs: this.refreshTokenTtlMs,
        familyId,
      }),
    );

    return { accessToken, refreshToken };
  }
}
