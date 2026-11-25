import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordHasher } from './application/ports/password-hasher';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { UserRepository } from './domain/user.repository';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/persistence/user.schema';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: MongoUserRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    {
      // Use cases are plain classes; Nest only wires their dependencies.
      provide: RegisterUserUseCase,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new RegisterUserUseCase(users, hasher),
      inject: [UserRepository, PasswordHasher],
    },
  ],
})
export class AuthModule {}
