import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';
  readonly type = DomainErrorType.VALIDATION;

  constructor(message: string) {
    super(message);
  }
}
