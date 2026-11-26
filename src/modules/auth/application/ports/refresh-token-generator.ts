/** Creates opaque refresh tokens and the hash under which they are stored. */
export abstract class RefreshTokenGenerator {
  /** A new random, unguessable token. */
  abstract generate(): string;

  /** Deterministic hash used to store and look up a token. */
  abstract hash(token: string): string;
}
