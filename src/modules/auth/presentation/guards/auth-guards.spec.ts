import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DomainExceptionFilter } from '../../../../shared/presentation/filters/domain-exception.filter';
import type { AuthenticatedUser } from '../../application/authenticated-user';
import { TokenService } from '../../application/ports/token-service';
import { Role } from '../../domain/role';
import { JwtTokenService } from '../../infrastructure/security/jwt-token.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Controller('probe')
class ProbeController {
  @Public()
  @Get('public')
  publicRoute() {
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  adminOnly() {
    return { ok: true };
  }
}

const SECRET = 'a-test-secret-that-is-at-least-32-characters';

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JwtAuthGuard + RolesGuard (integration)', () => {
  let app: INestApplication<App>;
  const signer = new JwtService({ secret: SECRET });

  const nowInSeconds = () => Math.floor(Date.now() / 1000);

  const tokenFor = (role: Role, claims: object = {}) =>
    signer.sign({
      sub: `${role}-id`,
      email: `${role}@example.com`,
      role,
      exp: nowInSeconds() + 3600,
      ...claims,
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        { provide: TokenService, useClass: JwtTokenService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(`/probe/${path}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  describe('public routes', () => {
    it('are reachable without a token', async () => {
      await get('public').expect(200, { ok: true });
    });
  });

  describe('protected routes', () => {
    it('reject requests without an Authorization header', async () => {
      const res = await get('me').expect(401);
      expect(res.body).toMatchObject({ error: 'MISSING_ACCESS_TOKEN' });
    });

    it.each([
      ['a non-Bearer scheme', 'Basic dXNlcjpwYXNz'],
      ['an empty Bearer value', 'Bearer'],
      ['a Bearer value followed by extra data', 'Bearer abc def'],
    ])('reject %s', async (_label, header) => {
      const res = await request(app.getHttpServer())
        .get('/probe/me')
        .set('Authorization', header)
        .expect(401);
      expect(res.body).toMatchObject({ error: 'MISSING_ACCESS_TOKEN' });
    });

    it('reject a token signed with another secret', async () => {
      const forged = new JwtService({
        secret: 'another-secret-that-is-at-least-32-characters',
      }).sign({ sub: 'x', email: 'x@example.com', role: Role.ADMIN });

      const res = await get('me', forged).expect(401);
      expect(res.body).toMatchObject({
        error: 'INVALID_ACCESS_TOKEN',
        message: 'El token de acceso es inválido o ha expirado',
      });
    });

    it('reject an expired token', async () => {
      const expired = tokenFor(Role.USER, { exp: nowInSeconds() - 10 });
      const res = await get('me', expired).expect(401);
      expect(res.body).toMatchObject({ error: 'INVALID_ACCESS_TOKEN' });
    });

    it('reject a correctly signed token that never expires', async () => {
      const eternal = signer.sign({
        sub: 'user-id',
        email: 'user@example.com',
        role: Role.USER,
      });
      const res = await get('me', eternal).expect(401);
      expect(res.body).toMatchObject({ error: 'INVALID_ACCESS_TOKEN' });
    });

    it('accept the scheme regardless of casing', async () => {
      await request(app.getHttpServer())
        .get('/probe/me')
        .set('Authorization', `bearer ${tokenFor(Role.USER)}`)
        .expect(200);
    });

    it('reject an unsigned token (alg "none")', async () => {
      const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
        sub: 'x',
        email: 'x@example.com',
        role: Role.ADMIN,
      })}.`;
      await get('me', unsigned).expect(401);
    });

    it('reject a token whose role is not a known role', async () => {
      await get('me', tokenFor('superuser' as Role)).expect(401);
    });

    it('reject a malformed token', async () => {
      await get('me', 'not-a-jwt').expect(401);
    });

    it('expose the authenticated user from a valid token', async () => {
      await get('me', tokenFor(Role.USER)).expect(200, {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
      });
    });
  });

  describe('role-restricted routes', () => {
    it('forbid a regular user', async () => {
      const res = await get('admin', tokenFor(Role.USER)).expect(403);
      expect(res.body).toMatchObject({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'No tienes permisos para realizar esta acción',
      });
    });

    it('allow an admin', async () => {
      await get('admin', tokenFor(Role.ADMIN)).expect(200, { ok: true });
    });

    it('still require authentication before checking roles', async () => {
      await get('admin').expect(401);
    });
  });
});
