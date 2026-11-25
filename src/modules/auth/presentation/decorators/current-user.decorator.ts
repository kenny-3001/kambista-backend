import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { InvalidAccessTokenError } from '../../domain/errors/invalid-access-token.error';
import { AuthenticatedRequest } from '../authenticated-request';

/** Injects the caller identity set by the JWT guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      // Only reachable if used on a @Public() route by mistake.
      throw new InvalidAccessTokenError();
    }
    return request.user;
  },
);
