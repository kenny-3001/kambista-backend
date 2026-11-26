import { RefreshToken } from '../domain/refresh-token';
import { RefreshTokenRepository } from '../domain/refresh-token.repository';

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
  readonly tokens = new Map<string, RefreshToken>();

  save(token: RefreshToken): Promise<void> {
    this.tokens.set(token.tokenHash, token);
    return Promise.resolve();
  }

  consume(tokenHash: string, now: Date): Promise<RefreshToken | null> {
    const token = this.tokens.get(tokenHash);
    if (!token?.isUsable(now)) {
      return Promise.resolve(null);
    }
    const used = this.with(token, { usedAt: now });
    this.tokens.set(tokenHash, used);
    return Promise.resolve(used);
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return Promise.resolve(this.tokens.get(tokenHash) ?? null);
  }

  revokeFamily(familyId: string, now: Date): Promise<void> {
    this.revokeWhere((t) => t.familyId === familyId, now);
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    this.revokeWhere((t) => t.userId === userId, now);
    return Promise.resolve();
  }

  private revokeWhere(match: (t: RefreshToken) => boolean, now: Date): void {
    for (const [hash, token] of this.tokens) {
      if (match(token) && !token.revokedAt) {
        this.tokens.set(hash, this.with(token, { revokedAt: now }));
      }
    }
  }

  private with(
    token: RefreshToken,
    changes: { usedAt?: Date; revokedAt?: Date },
  ): RefreshToken {
    return RefreshToken.restore({
      id: token.id,
      userId: token.userId,
      familyId: token.familyId,
      tokenHash: token.tokenHash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      revokedAt: token.revokedAt,
      ...changes,
    });
  }
}
