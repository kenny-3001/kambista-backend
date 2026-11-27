import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PASSWORD_MESSAGES } from '../../domain/password-policy';
import { RegisterDto } from './register.dto';

describe('RegisterDto password', () => {
  const passwordErrors = (password: unknown) =>
    validateSync(
      plainToInstance(RegisterDto, {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password,
      }),
      { stopAtFirstError: true },
    ).flatMap((error) => Object.values(error.constraints ?? {}));

  it.each([
    ['72 plain characters', 'a'.repeat(71) + '1'],
    ['72 bytes with two-byte characters', 'ñ'.repeat(35) + '1a'],
    ['a usual password with accents', 'contraseña123'],
  ])('accepts %s', (_label, password) => {
    expect(passwordErrors(password)).toEqual([]);
  });

  it.each([
    ['73 plain characters', 'a'.repeat(72) + '1'],
    ['40 characters that take 76 bytes', 'ñ'.repeat(36) + 'AAA1'],
  ])('rejects %s', (_label, password) => {
    expect(passwordErrors(password)).toEqual([PASSWORD_MESSAGES.tooLong]);
  });

  it.each([
    ['without a letter', '12345678', PASSWORD_MESSAGES.noLetter],
    ['without a digit', 'contraseña', PASSWORD_MESSAGES.noDigit],
  ])('rejects a password %s', (_label, password, message) => {
    expect(passwordErrors(password)).toEqual([message]);
  });

  it('reports the length before the letter and digit rules', () => {
    expect(passwordErrors('abc')).toEqual([PASSWORD_MESSAGES.tooShort]);
  });
});
