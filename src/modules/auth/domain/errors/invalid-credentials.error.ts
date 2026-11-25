import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

/**
 * Deliberately generic: it never tells whether the email exists or the
 * password was wrong, so it cannot be used to enumerate accounts.
 */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly type = DomainErrorType.UNAUTHORIZED;

  constructor() {
    super('Email o contraseña incorrectos');
  }
}
