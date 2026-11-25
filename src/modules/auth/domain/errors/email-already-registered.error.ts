import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';
  readonly type = DomainErrorType.CONFLICT;

  constructor() {
    super('Ya existe un usuario registrado con este email');
  }
}
