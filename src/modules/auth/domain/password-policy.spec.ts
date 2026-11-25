import { InvalidPasswordError } from './errors/invalid-password.error';
import { assertValidPassword } from './password-policy';

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
      new InvalidPasswordError(
        'La contraseña no puede superar los 72 caracteres',
      ),
    );
  });
});
