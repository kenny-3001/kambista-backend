import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class MissingAccessTokenError extends DomainError {
  readonly code = 'MISSING_ACCESS_TOKEN';
  readonly type = DomainErrorType.UNAUTHORIZED;

  constructor() {
    super('Se requiere un token de acceso (Authorization: Bearer <token>)');
  }
}
