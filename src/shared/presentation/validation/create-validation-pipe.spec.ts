import { ValidationError } from '@nestjs/common';
import { toFieldErrors } from './create-validation-pipe';

describe('toFieldErrors', () => {
  const error = (
    property: string,
    constraints?: Record<string, string>,
    children: ValidationError[] = [],
  ): ValidationError => ({ property, constraints, children });

  it('keeps one entry per failed constraint, in order', () => {
    expect(
      toFieldErrors([
        error('monto', { isDefined: 'El monto es obligatorio' }),
        error('monedaOrigen', { isIn: 'Debe ser USD o PEN' }),
      ]),
    ).toEqual([
      { field: 'monto', message: 'El monto es obligatorio' },
      { field: 'monedaOrigen', message: 'Debe ser USD o PEN' },
    ]);
  });

  it('uses a dotted path for nested properties', () => {
    expect(
      toFieldErrors([
        error('cliente', undefined, [
          error('direccion', undefined, [
            error('ciudad', { isString: 'La ciudad debe ser un texto' }),
          ]),
        ]),
      ]),
    ).toEqual([
      {
        field: 'cliente.direccion.ciudad',
        message: 'La ciudad debe ser un texto',
      },
    ]);
  });
});
