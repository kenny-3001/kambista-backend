import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('produces a bcrypt hash that differs from the plain password', async () => {
    const hash = await hasher.hash('contraseña123');

    expect(hash).not.toBe('contraseña123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('contraseña123');

    await expect(hasher.compare('contraseña123', hash)).resolves.toBe(true);
    await expect(hasher.compare('otra-clave', hash)).resolves.toBe(false);
  });

  it('accepts "ñ" however the keyboard sends it (one character or n + tilde)', async () => {
    const composed = 'contraseña123'.normalize('NFC');
    const decomposed = 'contraseña123'.normalize('NFD');
    expect(decomposed).not.toBe(composed);

    await expect(
      hasher.compare(decomposed, await hasher.hash(composed)),
    ).resolves.toBe(true);
    await expect(
      hasher.compare(composed, await hasher.hash(decomposed)),
    ).resolves.toBe(true);
  });
});
