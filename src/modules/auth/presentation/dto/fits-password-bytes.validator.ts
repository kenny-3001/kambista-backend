import { ValidateBy, ValidationOptions } from 'class-validator';
import {
  PASSWORD_MAX_BYTES,
  passwordByteLength,
} from '../../domain/password-policy';

/** Same byte-based limit the domain enforces (bcrypt reads 72 bytes). */
export function FitsPasswordBytes(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'fitsPasswordBytes',
      constraints: [PASSWORD_MAX_BYTES],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          passwordByteLength(value) <= PASSWORD_MAX_BYTES,
      },
    },
    options,
  );
}
