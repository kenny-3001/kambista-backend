import { RefreshTokenGenerator } from '../application/ports/refresh-token-generator';

/** Predictable tokens (refresh-1, refresh-2...) for unit tests. */
export class FakeRefreshTokenGenerator extends RefreshTokenGenerator {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return `refresh-${this.sequence}`;
  }

  hash(token: string): string {
    return `hash:${token}`;
  }
}
