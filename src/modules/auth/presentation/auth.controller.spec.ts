import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../../shared/presentation/filters/api-exception.filter';
import { createValidationPipe } from '../../../shared/presentation/validation/create-validation-pipe';
import { TokenService } from '../application/ports/token-service';
import { SessionTokenIssuer } from '../application/services/session-token-issuer';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { FakePasswordHasher } from '../testing/fake-password-hasher';
import { FakeRefreshTokenGenerator } from '../testing/fake-refresh-token-generator';
import { FakeTokenService } from '../testing/fake-token-service';
import { InMemoryLoginAttemptCounter } from '../testing/in-memory-login-attempt-counter';
import { InMemoryRefreshTokenRepository } from '../testing/in-memory-refresh-token.repository';
import { InMemoryUserRepository } from '../testing/in-memory-user.repository';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const users = new InMemoryUserRepository();
    const hasher = new FakePasswordHasher();
    const tokens = new FakeTokenService();
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const generator = new FakeRefreshTokenGenerator();
    const issuer = new SessionTokenIssuer(
      tokens,
      generator,
      refreshTokens,
      60_000,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: RegisterUserUseCase,
          useValue: new RegisterUserUseCase(users, hasher),
        },
        {
          provide: LoginUserUseCase,
          useValue: new LoginUserUseCase(
            users,
            hasher,
            issuer,
            new InMemoryLoginAttemptCounter(),
            { maxFailedAttempts: 5, windowMs: 60_000 },
          ),
        },
        {
          provide: RefreshSessionUseCase,
          useValue: new RefreshSessionUseCase(
            refreshTokens,
            generator,
            users,
            issuer,
          ),
        },
        {
          provide: LogoutUseCase,
          useValue: new LogoutUseCase(refreshTokens, generator),
        },
        { provide: TokenService, useValue: tokens },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_PIPE, useValue: createValidationPipe() },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).post('/auth/register').send({
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'MiClave2024',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  interface Session {
    access_token: string;
    refresh_token: string;
    usuario: { email: string; rol: string };
  }

  const login = async (): Promise<Session> => {
    const res = await server()
      .post('/auth/login')
      .send({ email: 'juan@example.com', password: 'MiClave2024' })
      .expect(200);
    return res.body as Session;
  };

  const refresh = (refreshToken: string) =>
    server().post('/auth/refresh').send({ refresh_token: refreshToken });

  it('answers the login with the fields of the statement plus refresh_token', async () => {
    const session = await login();

    expect(Object.keys(session)).toEqual([
      'access_token',
      'refresh_token',
      'usuario',
    ]);
    expect(session.usuario).toMatchObject({
      email: 'juan@example.com',
      rol: 'user',
    });
  });

  it('renews the session and rejects the same refresh token afterwards', async () => {
    const session = await login();

    const renewed = (await refresh(session.refresh_token).expect(200))
      .body as Session;

    expect(renewed).toMatchObject({
      access_token: expect.any(String) as unknown,
      refresh_token: expect.any(String) as unknown,
      usuario: { email: 'juan@example.com' },
    });
    expect(renewed.refresh_token).not.toBe(session.refresh_token);

    const reused = await refresh(session.refresh_token).expect(401);
    expect(reused.body).toEqual({
      statusCode: 401,
      error: 'INVALID_REFRESH_TOKEN',
      message: 'La sesión expiró o no es válida. Inicia sesión nuevamente.',
    });
  });

  it('logs out with 204 and the refresh token stops working', async () => {
    const session = await login();

    await server()
      .post('/auth/logout')
      .send({ refresh_token: session.refresh_token })
      .expect(204);

    await refresh(session.refresh_token).expect(401);
  });

  it('answers 204 when logging out with an unknown token', async () => {
    await server()
      .post('/auth/logout')
      .send({ refresh_token: 'inventado' })
      .expect(204);
  });

  it('does not ask for an access token to refresh', async () => {
    // Refresh exists precisely for when the access token has expired: the
    // answer is about the refresh token, not a missing Bearer header.
    const res = await refresh('inventado').expect(401);

    expect(res.body).toMatchObject({ error: 'INVALID_REFRESH_TOKEN' });
  });

  it.each(['refresh', 'logout'])(
    'validates the body of /auth/%s',
    async (route) => {
      const res = await server().post(`/auth/${route}`).send({}).expect(400);

      expect(res.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: 'El refresh_token es obligatorio',
      });
    },
  );
});
