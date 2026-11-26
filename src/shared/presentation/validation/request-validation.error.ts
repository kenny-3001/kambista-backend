import { FieldError } from '../errors/api-error';

/** Thrown by the validation pipe; carries one message per invalid field. */
export class RequestValidationError extends Error {
  constructor(readonly details: FieldError[]) {
    super(details[0]?.message ?? 'La petición tiene datos inválidos');
    this.name = 'RequestValidationError';
  }
}
