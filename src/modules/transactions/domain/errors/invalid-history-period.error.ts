import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidHistoryPeriodError extends DomainError {
  readonly code = 'INVALID_HISTORY_PERIOD';
  readonly type = DomainErrorType.VALIDATION;

  constructor(message: string) {
    super(message);
  }
}
