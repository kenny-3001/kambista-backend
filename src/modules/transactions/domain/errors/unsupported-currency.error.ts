import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class UnsupportedCurrencyError extends DomainError {
  readonly code = 'UNSUPPORTED_CURRENCY';
  readonly type = DomainErrorType.VALIDATION;

  constructor(currency: string) {
    super(`La moneda ${currency} no está soportada. Usa USD o PEN`);
  }
}
