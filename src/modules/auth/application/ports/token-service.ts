import { Role } from '../../domain/role';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export abstract class TokenService {
  abstract signAccessToken(payload: AccessTokenPayload): Promise<string>;
}
