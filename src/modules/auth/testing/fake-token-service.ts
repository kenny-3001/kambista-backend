import {
  AccessTokenPayload,
  TokenService,
} from '../application/ports/token-service';
import { InvalidAccessTokenError } from '../domain/errors/invalid-access-token.error';

export class FakeTokenService extends TokenService {
  readonly issued: AccessTokenPayload[] = [];

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    this.issued.push(payload);
    return Promise.resolve(`token-for:${payload.sub}`);
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = this.issued.find((p) => token === `token-for:${p.sub}`);
    return payload
      ? Promise.resolve(payload)
      : Promise.reject(new InvalidAccessTokenError());
  }
}
