import { InvalidPasswordError } from './errors/invalid-password.error';
import { assertValidPassword, PASSWORD_MESSAGES } from './password-policy';

describe('assertValidPassword', () => {
  it.each(['MiClave2024', 'contraseña123', 'abcdefg1', 'a'.repeat(71) + '1'])(
    'accepts a valid password (%s)',
    (password) => {
      expect(() => assertValidPassword(password)).not.toThrow();
    },
  );

  it('rejects a password shorter than 8 characters', () => {
    expect(() => assertValidPassword('1234567')).toThrow(
      new InvalidPasswordError(
        'La contraseña debe tener al menos 8 caracteres',
      ),
    );
  });

  it.each([
    ['only digits', '12345678', PASSWORD_MESSAGES.noLetter],
    ['only symbols and digits', '1234-5678', PASSWORD_MESSAGES.noLetter],
    ['only letters', 'abcdefgh', PASSWORD_MESSAGES.noDigit],
    [
      'letters with accents but no digit',
      'contraseña',
      PASSWORD_MESSAGES.noDigit,
    ],
    ['a space in the middle', 'mi clave 2024', PASSWORD_MESSAGES.hasSpaces],
    ['a space at the end', 'MiClave2024 ', PASSWORD_MESSAGES.hasSpaces],
    ['a tab', 'MiClave\t2024', PASSWORD_MESSAGES.hasSpaces],
  ])('rejects a password with %s', (_label, password, message) => {
    expect(() => assertValidPassword(password)).toThrow(
      new InvalidPasswordError(message),
    );
  });

  it('measures the limit in the composed form, whatever form arrives', () => {
    // 35 × "ñ" + "1a" is 72 bytes composed, 107 decomposed (n + tilde).
    const decomposed = ('ñ'.repeat(35) + '1a').normalize('NFD');
    expect(() => assertValidPassword(decomposed)).not.toThrow();
  });

  it('counts ñ and accented letters as letters', () => {
    expect(() => assertValidPassword('ñññññññ1')).not.toThrow();
  });

  it('rejects a password longer than 72 characters', () => {
    expect(() => assertValidPassword('a'.repeat(72) + '1')).toThrow(
      new InvalidPasswordError(PASSWORD_MESSAGES.tooLong),
    );
  });

  it('counts the limit in bytes, as bcrypt does', () => {
    // 'ñ' takes 2 bytes: 36 of them fill the 72 bytes bcrypt reads.
    expect(() => assertValidPassword('ñ'.repeat(35) + '1a')).not.toThrow();
    // 40 characters but 76 bytes: the last ones would be silently ignored.
    expect(() => assertValidPassword('ñ'.repeat(36) + 'AAA1')).toThrow(
      new InvalidPasswordError(PASSWORD_MESSAGES.tooLong),
    );
  });
});
