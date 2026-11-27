import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrors,
  AUTH_ERRORS,
} from '../../../shared/presentation/swagger/api-errors.decorator';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { Role } from '../domain/role';
import { Roles } from './decorators/roles.decorator';
import { ListUsersQuery } from './dto/list-users.query';
import { toUserResponse, UserResponse } from './user.response';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly listUsers: ListUsersUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Buscar usuarios (solo admin)',
    description:
      'Extra al enunciado: permite al admin elegir un usuario por nombre o email en lugar de pegar su `userId` para consultar su historial. Nunca incluye la contraseña ni su hash.',
  })
  @ApiOkResponse({ type: [UserResponse] })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El límite debe ser un número entero entre 1 y 50',
      details: [
        {
          field: 'limit',
          message: 'El límite debe ser un número entero entre 1 y 50',
        },
      ],
    },
    ...AUTH_ERRORS,
    {
      statusCode: 403,
      error: 'INSUFFICIENT_PERMISSIONS',
      message: 'No tienes permisos para realizar esta acción',
    },
  )
  async search(@Query() query: ListUsersQuery): Promise<UserResponse[]> {
    const users = await this.listUsers.execute({
      search: query.search,
      limit: query.limit,
    });
    return users.map(toUserResponse);
  }
}
