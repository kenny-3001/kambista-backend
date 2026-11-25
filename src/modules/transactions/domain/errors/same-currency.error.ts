import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class SameCurrencyError extends DomainError {
  readonly code = 'SAME_CURRENCY';
  readonly type = DomainErrorType.VALIDATION;

  constructor() {
    super('La moneda de origen y la de destino no pueden ser iguales');
  }
}
