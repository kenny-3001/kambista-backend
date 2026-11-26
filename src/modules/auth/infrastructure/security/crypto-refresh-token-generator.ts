import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { RefreshTokenGenerator } from '../../application/ports/refresh-token-generator';

/** 32 random bytes: 256 bits, impossible to guess. */
const TOKEN_BYTES = 32;

@Injectable()
export class CryptoRefreshTokenGenerator extends RefreshTokenGenerator {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  // A fast hash is enough (unlike passwords): the token is fully random, so
  // there is nothing to guess, and lookups need a deterministic value.
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
