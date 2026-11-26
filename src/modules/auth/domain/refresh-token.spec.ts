import { RefreshToken } from './refresh-token';

describe('RefreshToken', () => {
  const now = new Date('2024-01-18T15:00:00Z');
  const ttlMs = 7 * 24 * 60 * 60_000;
  const issue = (familyId?: string) =>
    RefreshToken.issue({
      userId: 'user-1',
      tokenHash: 'hash',
      now,
      ttlMs,
      familyId,
    });

  it('starts a new family on login and expires after its lifetime', () => {
    const token = issue();

    expect(token.familyId).toEqual(expect.any(String));
    expect(token.familyId).not.toBe(issue().familyId);
    expect(token.expiresAt).toEqual(new Date(now.getTime() + ttlMs));
    expect(token).toMatchObject({ usedAt: null, revokedAt: null });
  });

  it('keeps the family when rotating', () => {
    expect(issue('family-1').familyId).toBe('family-1');
  });

  it('is usable only while unused, not revoked and not expired', () => {
    const token = issue();
    const restore = (changes: Partial<Record<string, Date | null>>) =>
      RefreshToken.restore({
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

    expect(token.isUsable(now)).toBe(true);
    expect(token.isUsable(new Date(now.getTime() + ttlMs - 1))).toBe(true);
    expect(token.isUsable(new Date(now.getTime() + ttlMs))).toBe(false);
    expect(restore({ usedAt: now }).isUsable(now)).toBe(false);
    expect(restore({ revokedAt: now }).isUsable(now)).toBe(false);
  });
});
