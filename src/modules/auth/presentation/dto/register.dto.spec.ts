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
    ['72 plain characters', 'a'.repeat(72)],
    ['36 two-byte characters (72 bytes)', 'ñ'.repeat(36)],
    ['a usual password with accents', 'contraseña123'],
  ])('accepts %s', (_label, password) => {
    expect(passwordErrors(password)).toEqual([]);
  });

  it.each([
    ['73 plain characters', 'a'.repeat(73)],
    ['40 characters that take 76 bytes', 'ñ'.repeat(36) + 'AAAA'],
  ])('rejects %s', (_label, password) => {
    expect(passwordErrors(password)).toEqual([PASSWORD_MESSAGES.tooLong]);
  });
});
