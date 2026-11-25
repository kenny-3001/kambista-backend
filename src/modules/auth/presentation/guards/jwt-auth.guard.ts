import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../application/ports/token-service';
import { MissingAccessTokenError } from '../../domain/errors/missing-access-token.error';
import { AuthenticatedRequest } from '../authenticated-request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered globally: every route requires a valid Bearer token unless it
 * is explicitly marked with @Public(). Secure by default.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new MissingAccessTokenError();
    }

    const payload = await this.tokenService.verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const parts = request.headers.authorization?.split(' ') ?? [];
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }
    return parts[1] || null;
  }
}
