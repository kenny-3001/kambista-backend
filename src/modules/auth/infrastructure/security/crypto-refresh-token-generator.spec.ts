import { CryptoRefreshTokenGenerator } from './crypto-refresh-token-generator';

describe('CryptoRefreshTokenGenerator', () => {
  const generator = new CryptoRefreshTokenGenerator();

  it('generates long, URL-safe tokens that never repeat', () => {
    const tokens = new Set(
      Array.from({ length: 1000 }, () => generator.generate()),
    );

    expect(tokens.size).toBe(1000);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('hashes deterministically without revealing the token', () => {
    const token = generator.generate();

    expect(generator.hash(token)).toBe(generator.hash(token));
    expect(generator.hash(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(generator.hash(token)).not.toContain(token);
    expect(generator.hash(token)).not.toBe(
      generator.hash(generator.generate()),
    );
  });
});
