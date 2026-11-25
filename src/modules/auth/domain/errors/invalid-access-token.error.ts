import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidAccessTokenError extends DomainError {
  readonly code = 'INVALID_ACCESS_TOKEN';
  readonly type = DomainErrorType.UNAUTHORIZED;

  constructor() {
    super('El token de acceso es inválido o ha expirado');
  }
}
