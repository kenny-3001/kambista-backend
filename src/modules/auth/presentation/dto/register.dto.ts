import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_DIGIT,
  PASSWORD_LETTER,
  PASSWORD_MESSAGES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_WITHOUT_SPACES,
} from '../../domain/password-policy';
import { FitsPasswordBytes } from './fits-password-bytes.validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// class-validator runs decorators bottom-up and the pipe stops at the first
// error, so the most basic check (presence) sits closest to the property.
export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez', maxLength: 100 })
  @Transform(trim)
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @ApiProperty({ example: 'juan@example.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({
    example: 'MiClave2024',
    minLength: PASSWORD_MIN_LENGTH,
    description:
      'Entre 8 y 72 caracteres (las letras con tilde y la ñ cuentan como 2), con al menos una letra y un número, y sin espacios',
  })
  @FitsPasswordBytes({ message: PASSWORD_MESSAGES.tooLong })
  @Matches(PASSWORD_WITHOUT_SPACES, { message: PASSWORD_MESSAGES.hasSpaces })
  @Matches(PASSWORD_DIGIT, { message: PASSWORD_MESSAGES.noDigit })
  @Matches(PASSWORD_LETTER, { message: PASSWORD_MESSAGES.noLetter })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGES.tooShort })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}
