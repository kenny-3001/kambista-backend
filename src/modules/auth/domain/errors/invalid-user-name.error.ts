import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidUserNameError extends DomainError {
  readonly code = 'INVALID_USER_NAME';
  readonly type = DomainErrorType.VALIDATION;

  constructor() {
    super('El nombre no puede estar vacío');
  }
}
