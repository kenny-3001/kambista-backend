import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginAttemptCounter } from './application/ports/login-attempt-counter';
import { PasswordHasher } from './application/ports/password-hasher';
import { RefreshTokenGenerator } from './application/ports/refresh-token-generator';
import { TokenService } from './application/ports/token-service';
import { SessionTokenIssuer } from './application/services/session-token-issuer';
import { EnsureAdminUserUseCase } from './application/use-cases/ensure-admin-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { RefreshTokenRepository } from './domain/refresh-token.repository';
import { UserRepository } from './domain/user.repository';
import {
  LoginAttemptDocument,
  LoginAttemptSchema,
} from './infrastructure/persistence/login-attempt.schema';
import { MongoLoginAttemptCounter } from './infrastructure/persistence/mongo-login-attempt-counter';
import { MongoRefreshTokenRepository } from './infrastructure/persistence/mongo-refresh-token.repository';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository';
import {
  RefreshTokenDocument,
  RefreshTokenSchema,
} from './infrastructure/persistence/refresh-token.schema';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoRefreshTokenGenerator } from './infrastructure/security/crypto-refresh-token-generator';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
      { name: LoginAttemptDocument.name, schema: LoginAttemptSchema },
      { name: RefreshTokenDocument.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // The format (e.g. 15m, 1h) is already validated by the env schema.
          expiresIn:
            config.getOrThrow<JwtSignOptions['expiresIn']>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: MongoUserRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    { provide: LoginAttemptCounter, useClass: MongoLoginAttemptCounter },
    { provide: RefreshTokenRepository, useClass: MongoRefreshTokenRepository },
    { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
    // Global guards run in registration order: authenticate, then authorize.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Use cases are plain classes; Nest only wires their dependencies.
    {
      provide: RegisterUserUseCase,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new RegisterUserUseCase(users, hasher),
      inject: [UserRepository, PasswordHasher],
    },
    {
      provide: SessionTokenIssuer,
      useFactory: (
        tokens: TokenService,
        generator: RefreshTokenGenerator,
        refreshTokens: RefreshTokenRepository,
        config: ConfigService,
      ) =>
        new SessionTokenIssuer(
          tokens,
          generator,
          refreshTokens,
          config.getOrThrow<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS') *
            24 *
            60 *
            60_000,
        ),
      inject: [
        TokenService,
        RefreshTokenGenerator,
        RefreshTokenRepository,
        ConfigService,
      ],
    },
    {
      provide: LoginUserUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        issuer: SessionTokenIssuer,
        attempts: LoginAttemptCounter,
        config: ConfigService,
      ) =>
        new LoginUserUseCase(users, hasher, issuer, attempts, {
          maxFailedAttempts: config.getOrThrow<number>(
            'LOGIN_MAX_FAILED_ATTEMPTS',
          ),
          windowMs:
            config.getOrThrow<number>('LOGIN_ATTEMPTS_WINDOW_MINUTES') * 60_000,
        }),
      inject: [
        UserRepository,
        PasswordHasher,
        SessionTokenIssuer,
        LoginAttemptCounter,
        ConfigService,
      ],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (
        refreshTokens: RefreshTokenRepository,
        generator: RefreshTokenGenerator,
        users: UserRepository,
        issuer: SessionTokenIssuer,
      ) => new RefreshSessionUseCase(refreshTokens, generator, users, issuer),
      inject: [
        RefreshTokenRepository,
        RefreshTokenGenerator,
        UserRepository,
        SessionTokenIssuer,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (
        refreshTokens: RefreshTokenRepository,
        generator: RefreshTokenGenerator,
      ) => new LogoutUseCase(refreshTokens, generator),
      inject: [RefreshTokenRepository, RefreshTokenGenerator],
    },
    {
      provide: EnsureAdminUserUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        refreshTokens: RefreshTokenRepository,
      ) => new EnsureAdminUserUseCase(users, hasher, refreshTokens),
      inject: [UserRepository, PasswordHasher, RefreshTokenRepository],
    },
  ],
  // Used by the seed:admin script.
  exports: [EnsureAdminUserUseCase],
})
export class AuthModule {}
