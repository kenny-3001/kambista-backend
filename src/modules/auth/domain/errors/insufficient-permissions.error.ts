import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InsufficientPermissionsError extends DomainError {
  readonly code = 'INSUFFICIENT_PERMISSIONS';
  readonly type = DomainErrorType.FORBIDDEN;

  constructor() {
    super('No tienes permisos para realizar esta acción');
  }
}
