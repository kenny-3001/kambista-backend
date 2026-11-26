import { randomUUID } from 'node:crypto';

export interface RefreshTokenProps {
  id: string;
  userId: string;
  /**
   * Every token obtained by rotating another one belongs to the same family
   * (one login session). Reusing a rotated token revokes the whole family.
   */
  familyId: string;
  /** Hash of the token; the token itself is never stored. */
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  /** Set when the token was exchanged for a new one. */
  usedAt: Date | null;
  /** Set when its session was closed (logout, reuse, password reset). */
  revokedAt: Date | null;
}

export class RefreshToken {
  private constructor(private readonly props: RefreshTokenProps) {}

  /** A new token: starts a session, or continues `familyId` when rotating. */
  static issue(params: {
    userId: string;
    tokenHash: string;
    now: Date;
    ttlMs: number;
    familyId?: string;
  }): RefreshToken {
    return new RefreshToken({
      id: randomUUID(),
      userId: params.userId,
      familyId: params.familyId ?? randomUUID(),
      tokenHash: params.tokenHash,
      createdAt: params.now,
      expiresAt: new Date(params.now.getTime() + params.ttlMs),
      usedAt: null,
      revokedAt: null,
    });
  }

  static restore(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  /** Whether it can still be exchanged for a new pair of tokens. */
  isUsable(now: Date): boolean {
    return !this.usedAt && !this.revokedAt && this.expiresAt > now;
  }
}
