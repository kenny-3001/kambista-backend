import { InvalidPasswordError } from './errors/invalid-password.error';

export const PASSWORD_MIN_LENGTH = 8;
/**
 * bcrypt only uses the first 72 bytes of its input, so the limit is counted
 * in UTF-8 bytes: 72 plain characters, fewer with accents or ñ (2 bytes each).
 * Counting characters instead would let two different passwords match.
 */
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_MESSAGES = {
  tooShort: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  tooLong: `La contraseña es demasiado larga: máximo ${PASSWORD_MAX_BYTES} caracteres (las letras con tilde y la ñ cuentan como 2)`,
} as const;

export function passwordByteLength(plainPassword: string): number {
  return new TextEncoder().encode(plainPassword).length;
}

/** Single source of truth for password rules, shared by every entry point. */
export function assertValidPassword(plainPassword: string): void {
  if (plainPassword.length < PASSWORD_MIN_LENGTH) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooShort);
  }
  if (passwordByteLength(plainPassword) > PASSWORD_MAX_BYTES) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooLong);
  }
}
