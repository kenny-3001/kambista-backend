import { Role } from '../../domain/role';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export abstract class TokenService {
  abstract signAccessToken(payload: AccessTokenPayload): Promise<string>;

  /**
   * Returns the payload of a valid, unexpired token.
   * @throws InvalidAccessTokenError when the token cannot be trusted.
   */
  abstract verifyAccessToken(token: string): Promise<AccessTokenPayload>;
}
