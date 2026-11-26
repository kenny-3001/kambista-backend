import { ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldError } from '../errors/api-error';
import { RequestValidationError } from './request-validation.error';

/** Flattens class-validator errors into `{ field, message }` pairs. */
export function toFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

/** The validation pipe used by the API (and by tests that mimic it). */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // Unknown properties (e.g. a client-sent `rol`) are silently stripped.
    whitelist: true,
    transform: true,
    // One message per field: the most basic problem first.
    stopAtFirstError: true,
    exceptionFactory: (errors) =>
      new RequestValidationError(toFieldErrors(errors)),
  });
}
