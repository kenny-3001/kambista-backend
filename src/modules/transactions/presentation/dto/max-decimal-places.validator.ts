import { ValidateBy, ValidationOptions } from 'class-validator';
import { countDecimalPlaces } from '../../domain/value-objects/amount';

/**
 * Replaces `@IsNumber({ maxDecimalPlaces })`, whose implementation throws on
 * numbers printed in exponent notation (e.g. 1e-7) and turns a validation
 * error into a 500.
 */
export function MaxDecimalPlaces(
  max: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxDecimalPlaces',
      constraints: [max],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'number' &&
          Number.isFinite(value) &&
          countDecimalPlaces(value) <= max,
      },
    },
    options,
  );
}
