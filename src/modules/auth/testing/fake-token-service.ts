import {
  AccessTokenPayload,
  TokenService,
} from '../application/ports/token-service';

export class FakeTokenService extends TokenService {
  readonly issued: AccessTokenPayload[] = [];

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    this.issued.push(payload);
    return Promise.resolve(`token-for:${payload.sub}`);
  }
}
