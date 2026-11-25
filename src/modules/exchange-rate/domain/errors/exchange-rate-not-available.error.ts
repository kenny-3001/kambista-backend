import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class ExchangeRateNotAvailableError extends DomainError {
  readonly code = 'EXCHANGE_RATE_NOT_AVAILABLE';
  readonly type = DomainErrorType.UNAVAILABLE;

  constructor() {
    super(
      'No hay un tipo de cambio registrado todavía. Intenta nuevamente en unos segundos.',
    );
  }
}
