import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../application/ports/password-hasher';
import { normalizePassword } from '../../domain/password-policy';

const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  // Hashed and compared in NFC, so "ñ" matches however the keyboard sent it.
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(normalizePassword(plainPassword), SALT_ROUNDS);
  }

  compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(normalizePassword(plainPassword), hash);
  }
}
