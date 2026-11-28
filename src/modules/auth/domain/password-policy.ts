import { InvalidPasswordError } from './errors/invalid-password.error';

export const PASSWORD_MIN_LENGTH = 8;
/**
 * bcrypt only uses the first 72 bytes of its input, so the limit is counted
 * in UTF-8 bytes: 72 plain characters, fewer with accents or ñ (2 bytes each).
 * Counting characters instead would let two different passwords match.
 */
export const PASSWORD_MAX_BYTES = 72;

/** Any letter, accented ones and ñ included. */
export const PASSWORD_LETTER = /\p{L}/u;
export const PASSWORD_DIGIT = /[0-9]/;
/** No whitespace anywhere: a stray space would make the password hard to type again. */
export const PASSWORD_WITHOUT_SPACES = /^\S*$/;

export const PASSWORD_MESSAGES = {
  tooShort: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  noLetter: 'La contraseña debe tener al menos una letra',
  noDigit: 'La contraseña debe tener al menos un número',
  hasSpaces: 'La contraseña no puede tener espacios',
  tooLong: `La contraseña es demasiado larga: máximo ${PASSWORD_MAX_BYTES} caracteres (las letras con tilde y la ñ cuentan como 2)`,
} as const;

/**
 * The same password can arrive in two Unicode forms: "ñ" as one character
 * (NFC) or as "n" plus a combining tilde (NFD), as some macOS and iOS
 * keyboards send it. Passwords are always handled in NFC, so both forms are
 * the same password.
 */
export function normalizePassword(plainPassword: string): string {
  return plainPassword.normalize('NFC');
}

export function passwordByteLength(plainPassword: string): number {
  return new TextEncoder().encode(normalizePassword(plainPassword)).length;
}

/** Single source of truth for password rules, shared by every entry point. */
export function assertValidPassword(plainPassword: string): void {
  if (plainPassword.length < PASSWORD_MIN_LENGTH) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooShort);
  }
  if (!PASSWORD_LETTER.test(plainPassword)) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.noLetter);
  }
  if (!PASSWORD_DIGIT.test(plainPassword)) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.noDigit);
  }
  if (!PASSWORD_WITHOUT_SPACES.test(plainPassword)) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.hasSpaces);
  }
  if (passwordByteLength(plainPassword) > PASSWORD_MAX_BYTES) {
    throw new InvalidPasswordError(PASSWORD_MESSAGES.tooLong);
  }
}
