import { RefreshToken } from './refresh-token';

export abstract class RefreshTokenRepository {
  abstract save(token: RefreshToken): Promise<void>;

  /**
   * Atomically marks the token as used if it is still usable (unused, not
   * revoked, not expired) and returns it; returns null otherwise. Two
   * concurrent calls with the same token can never both succeed.
   */
  abstract consume(tokenHash: string, now: Date): Promise<RefreshToken | null>;

  abstract findByHash(tokenHash: string): Promise<RefreshToken | null>;

  /** Closes one session: every token of the family stops working. */
  abstract revokeFamily(familyId: string, now: Date): Promise<void>;

  /** Closes every session of the user. */
  abstract revokeAllForUser(userId: string, now: Date): Promise<void>;
}
