import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Decorators run bottom-up; presence is checked first.
export class LoginDto {
  @ApiProperty({ example: 'juan@example.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({ example: 'MiClave2024' })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}
