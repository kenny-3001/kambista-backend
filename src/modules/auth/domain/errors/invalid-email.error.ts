import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL';
  readonly type = DomainErrorType.VALIDATION;

  constructor() {
    super('El email no tiene un formato válido');
  }
}
