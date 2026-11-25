import { InvalidPasswordError } from './errors/invalid-password.error';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of its input.
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_MESSAGES = {
  tooShort: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  tooLong: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`,
} as const;

/** Single source of truth for password rules, shared by every entry point. */
export function assertValidPassword(plainPassword: string): void {
  if (plainPassword.length < PASSWORD_MIN_LENGTH) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooShort);
  }
  if (plainPassword.length > PASSWORD_MAX_LENGTH) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooLong);
  }
}
