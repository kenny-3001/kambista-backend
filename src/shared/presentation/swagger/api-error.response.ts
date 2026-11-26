import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiErrorBody, FieldError } from '../errors/api-error';

export class FieldErrorResponse implements FieldError {
  @ApiProperty({ example: 'monto' })
  field!: string;

  @ApiProperty({ example: 'El monto es obligatorio' })
  message!: string;
}

/** Documentation of the single error shape answered by the API. */
export class ApiErrorResponse implements ApiErrorBody {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: 'Código estable para que el cliente identifique el error',
    example: 'VALIDATION_ERROR',
  })
  error!: string;

  @ApiProperty({
    description: 'Explicación en español, lista para mostrar al usuario',
    example: 'El monto es obligatorio',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Solo en errores de validación: el problema de cada campo',
    type: [FieldErrorResponse],
  })
  details?: FieldErrorResponse[];
}
