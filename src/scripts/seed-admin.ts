import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  EnsureAdminUserOutcome,
  EnsureAdminUserUseCase,
} from '../modules/auth/application/use-cases/ensure-admin-user.use-case';
import { DomainError } from '../shared/domain/domain-error';
import { SeedAdminModule } from './seed-admin.module';

const OUTCOME_MESSAGES: Record<EnsureAdminUserOutcome, string> = {
  created: 'Usuario admin creado',
  promoted:
    'Usuario existente promovido a admin; su contraseña ahora es ADMIN_PASSWORD',
  unchanged: 'El usuario ya era admin; no se hicieron cambios',
};

const logger = new Logger('SeedAdmin');

function describeBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name.startsWith('MongooseServer')) {
    return `No se pudo conectar a MongoDB (${message}). ¿Está levantado? Ejecuta: docker compose up -d`;
  }
  return `No se pudo iniciar el script: ${message}`;
}

/**
 * Creates the admin user, or promotes an existing one, from ADMIN_NAME,
 * ADMIN_EMAIL and ADMIN_PASSWORD. Safe to run more than once.
 */
async function seedAdmin(): Promise<void> {
  let app: INestApplicationContext;
  try {
    // Keep Nest's bootstrap quiet and let failures surface here instead of
    // aborting the process with a raw stack trace.
    app = await NestFactory.createApplicationContext(SeedAdminModule, {
      logger: ['error', 'warn'],
      abortOnError: false,
    });
  } catch (error) {
    logger.error(describeBootstrapError(error));
    process.exitCode = 1;
    return;
  }
  Logger.overrideLogger(['log', 'error', 'warn']);

  try {
    const config = app.get(ConfigService);
    const { user, outcome } = await app.get(EnsureAdminUserUseCase).execute({
      name: config.getOrThrow<string>('ADMIN_NAME'),
      email: config.getOrThrow<string>('ADMIN_EMAIL'),
      password: config.getOrThrow<string>('ADMIN_PASSWORD'),
    });
    logger.log(`${OUTCOME_MESSAGES[outcome]}: ${user.email.value}`);
  } catch (error) {
    logger.error(error instanceof DomainError ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void seedAdmin();
