import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  TokenService,
} from '../../application/ports/token-service';
import { InvalidAccessTokenError } from '../../domain/errors/invalid-access-token.error';
import { Role } from '../../domain/role';

export const JWT_ALGORITHM = 'HS256';

const ROLES = new Set<string>(Object.values(Role));

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload },
      { algorithm: JWT_ALGORITHM },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let claims: Record<string, unknown>;
    try {
      // Pinning the algorithm rejects tokens signed with "none" or any
      // algorithm other than the one this service issues.
      claims = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token,
        { algorithms: [JWT_ALGORITHM] },
      );
    } catch {
      throw new InvalidAccessTokenError();
    }

    const { sub, email, role, exp } = claims;
    if (
      // A token without expiry would be valid forever; never trust one.
      typeof exp !== 'number' ||
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      !ROLES.has(role)
    ) {
      throw new InvalidAccessTokenError();
    }

    return { sub, email, role: role as Role };
  }
}
