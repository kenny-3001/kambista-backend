import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class InvalidExchangeRateError extends DomainError {
  readonly code = 'INVALID_EXCHANGE_RATE';
  readonly type = DomainErrorType.VALIDATION;

  constructor(reason: string) {
    super(`Tipo de cambio inválido: ${reason}`);
  }
}
