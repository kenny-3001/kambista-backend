import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from '../modules/auth/auth.module';
import { envValidationSchema } from '../shared/infrastructure/config/env.validation';
import { DatabaseModule } from '../shared/infrastructure/database/database.module';

const seedAdminEnvSchema = envValidationSchema.keys({
  ADMIN_NAME: Joi.string().trim().default('Administrador'),
  ADMIN_EMAIL: Joi.string().trim().required(),
  ADMIN_PASSWORD: Joi.string().required(),
});

/** Minimal context for the seed script: no HTTP server is started. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: seedAdminEnvSchema,
    }),
    DatabaseModule,
    AuthModule,
  ],
})
export class SeedAdminModule {}
