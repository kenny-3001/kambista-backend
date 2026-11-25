import { PasswordHasher } from '../application/ports/password-hasher';

/** Deterministic, fast stand-in for bcrypt in unit tests. */
export class FakePasswordHasher extends PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  compare(plainPassword: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plainPassword}`);
  }
}
