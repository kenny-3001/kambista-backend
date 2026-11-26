import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

/**
 * Deliberately generic: unknown, expired, already used and revoked tokens
 * all get the same answer.
 */
export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'INVALID_REFRESH_TOKEN';
  readonly type = DomainErrorType.UNAUTHORIZED;

  constructor() {
    super('La sesión expiró o no es válida. Inicia sesión nuevamente.');
  }
}
