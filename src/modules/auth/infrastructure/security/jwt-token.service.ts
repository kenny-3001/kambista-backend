import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  TokenService,
} from '../../application/ports/token-service';

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync({ ...payload });
  }
}
