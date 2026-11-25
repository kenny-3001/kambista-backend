import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InsufficientPermissionsError } from '../../domain/errors/insufficient-permissions.error';
import { Role } from '../../domain/role';
import { AuthenticatedRequest } from '../authenticated-request';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Runs after JwtAuthGuard; only acts on routes annotated with @Roles(). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new InsufficientPermissionsError();
    }
    return true;
  }
}
