import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordHasher } from './application/ports/password-hasher';
import { TokenService } from './application/ports/token-service';
import { EnsureAdminUserUseCase } from './application/use-cases/ensure-admin-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { UserRepository } from './domain/user.repository';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
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
      provide: LoginUserUseCase,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
      ) => new LoginUserUseCase(users, hasher, tokens),
      inject: [UserRepository, PasswordHasher, TokenService],
    },
    {
      provide: EnsureAdminUserUseCase,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new EnsureAdminUserUseCase(users, hasher),
      inject: [UserRepository, PasswordHasher],
    },
  ],
  // Used by the seed:admin script.
  exports: [EnsureAdminUserUseCase],
})
export class AuthModule {}
