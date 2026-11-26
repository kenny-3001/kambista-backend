import {
  DomainError,
  DomainErrorType,
} from '../../../../shared/domain/domain-error';

export class TooManyLoginAttemptsError extends DomainError {
  readonly code = 'TOO_MANY_LOGIN_ATTEMPTS';
  readonly type = DomainErrorType.TOO_MANY_REQUESTS;

  constructor(readonly retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    super(
      `Demasiados intentos fallidos. Intenta nuevamente en ${minutes} ${
        minutes === 1 ? 'minuto' : 'minutos'
      }.`,
    );
  }
}
