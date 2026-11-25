import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class ExchangeRateProviderError extends DomainError {
  readonly code = 'EXCHANGE_RATE_PROVIDER_UNAVAILABLE';
  readonly type = DomainErrorType.UNAVAILABLE;

  constructor(reason: string) {
    super(`No se pudo obtener el tipo de cambio del proveedor: ${reason}`);
  }
}
