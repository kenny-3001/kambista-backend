import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../domain/role';
import { User } from '../domain/user';

/** Public representation of a user. Never includes the password hash. */
export class UserResponse {
  @ApiProperty({ example: '6f1c2a9e-5b7d-4e8a-9c3f-2d1b0a9e8f7c' })
  id!: string;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre!: string;

  @ApiProperty({ example: 'juan@example.com' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  rol!: string;
}

export class RegisterResponse {
  @ApiProperty({ type: UserResponse })
  usuario!: UserResponse;
}

export class LoginResponse {
  @ApiProperty({
    description: 'JWT para el header Authorization: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description:
      'Token para renovar la sesión con POST /v1/auth/refresh. Sirve una sola vez: cada renovación entrega uno nuevo',
    example: 'oN3cX0w9lq2P7k1sR8tY4uV6bZ5aE0dF2gH3jK4lM6n',
  })
  refresh_token!: string;

  @ApiProperty({ type: UserResponse })
  usuario!: UserResponse;
}

export function toLoginResponse(
  accessToken: string,
  refreshToken: string,
  user: User,
): LoginResponse {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    usuario: toUserResponse(user),
  };
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    nombre: user.name,
    email: user.email.value,
    rol: user.role,
  };
}
