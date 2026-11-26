import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HISTORY_MAX_LIMIT } from '../../application/use-cases/get-transaction-history.use-case';
import { HISTORY_DATE_MESSAGES } from '../../domain/value-objects/history-period';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

// class-validator runs decorators bottom-up and the pipe stops at the first
// error, so the most basic check (presence) sits closest to the property.
// The domain also rejects dates that do not exist (e.g. 2024-02-30).
export class TransactionHistoryQuery {
  @ApiProperty({
    format: 'date',
    example: '2024-01-01',
    description: 'Inicio del rango (AAAA-MM-DD), día completo en hora de Perú',
  })
  @Matches(DATE_FORMAT, { message: HISTORY_DATE_MESSAGES.invalidStart })
  @IsString({ message: HISTORY_DATE_MESSAGES.invalidStart })
  @IsDefined({ message: 'La fecha de inicio (startDate) es obligatoria' })
  startDate!: string;

  @ApiProperty({
    format: 'date',
    example: '2024-01-31',
    description:
      'Fin del rango (AAAA-MM-DD), incluido completo en hora de Perú',
  })
  @Matches(DATE_FORMAT, { message: HISTORY_DATE_MESSAGES.invalidEnd })
  @IsString({ message: HISTORY_DATE_MESSAGES.invalidEnd })
  @IsDefined({ message: 'La fecha de fin (endDate) es obligatoria' })
  endDate!: string;

  @ApiPropertyOptional({
    description:
      'Solo para `admin`: consulta el historial de otro usuario. Sin él, el admin ve el suyo. Para el rol `user` se ignora: siempre ve el suyo.',
  })
  @MaxLength(100, { message: 'El userId no es válido' })
  @IsString({ message: 'El userId no es válido' })
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    minimum: 1,
    example: 1,
    description:
      'Paginación opcional. Sin `page` ni `limit` se devuelve todo el rango',
  })
  @Min(1, { message: 'La página debe ser un número entero mayor a 0' })
  @IsInt({ message: 'La página debe ser un número entero mayor a 0' })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: HISTORY_MAX_LIMIT,
    example: 20,
    description: 'Tamaño de página (por defecto 20 si se envía `page`)',
  })
  @Max(HISTORY_MAX_LIMIT, {
    message: `El límite debe ser un número entero entre 1 y ${HISTORY_MAX_LIMIT}`,
  })
  @Min(1, {
    message: `El límite debe ser un número entero entre 1 y ${HISTORY_MAX_LIMIT}`,
  })
  @IsInt({
    message: `El límite debe ser un número entero entre 1 y ${HISTORY_MAX_LIMIT}`,
  })
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
