import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidAmountError extends DomainError {
  readonly code = 'INVALID_AMOUNT';
  readonly type = DomainErrorType.VALIDATION;

  constructor(message: string) {
    super(message);
  }
}
