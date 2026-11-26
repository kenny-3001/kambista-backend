import { InvalidPasswordError } from './errors/invalid-password.error';
import { assertValidPassword, PASSWORD_MESSAGES } from './password-policy';

describe('assertValidPassword', () => {
  it.each(['12345678', 'contraseña123', 'a'.repeat(72)])(
    'accepts a password of valid length (%s)',
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

  it('rejects a password longer than 72 characters', () => {
    expect(() => assertValidPassword('a'.repeat(73))).toThrow(
      new InvalidPasswordError(PASSWORD_MESSAGES.tooLong),
    );
  });

  it('counts the limit in bytes, as bcrypt does', () => {
    // 'ñ' takes 2 bytes: 36 of them fill the 72 bytes bcrypt reads.
    expect(() => assertValidPassword('ñ'.repeat(36))).not.toThrow();
    // 40 characters but 76 bytes: the last ones would be silently ignored.
    expect(() => assertValidPassword('ñ'.repeat(36) + 'AAAA')).toThrow(
      new InvalidPasswordError(PASSWORD_MESSAGES.tooLong),
    );
  });
});
