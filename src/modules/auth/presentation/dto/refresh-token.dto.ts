import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'refresh_token recibido en el login o en la última renovación',
    example: 'oN3cX0w9lq2P7k1sR8tY4uV6bZ5aE0dF2gH3jK4lM6n',
  })
  @MaxLength(200, { message: 'El refresh_token no es válido' })
  @IsString({ message: 'El refresh_token no es válido' })
  @IsNotEmpty({ message: 'El refresh_token es obligatorio' })
  refresh_token!: string;
}
