import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  USERS_DEFAULT_LIMIT,
  USERS_MAX_LIMIT,
} from '../../application/use-cases/list-users.use-case';

const LIMIT_MESSAGE = `El límite debe ser un número entero entre 1 y ${USERS_MAX_LIMIT}`;

export class ListUsersQuery {
  @ApiPropertyOptional({
    maxLength: 100,
    example: 'juan',
    description:
      'Texto que debe contener el nombre o el email (sin distinguir mayúsculas). Sin él, devuelve los primeros usuarios por nombre',
  })
  @MaxLength(100, { message: 'La búsqueda admite como máximo 100 caracteres' })
  @IsString({ message: 'La búsqueda no es válida' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: USERS_MAX_LIMIT,
    example: USERS_DEFAULT_LIMIT,
    description: `Máximo de usuarios a devolver (por defecto ${USERS_DEFAULT_LIMIT}, máximo ${USERS_MAX_LIMIT})`,
  })
  @Max(USERS_MAX_LIMIT, { message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @IsInt({ message: LIMIT_MESSAGE })
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
