import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './configure-app';
import { envValidationSchema } from './shared/infrastructure/config/env.validation';
import {
  createAppLogger,
  LogFormat,
} from './shared/infrastructure/logging/app-logger';
import { describeStartupError } from './shared/infrastructure/startup/describe-startup-error';
import { SWAGGER_PATH } from './shared/presentation/swagger/setup-swagger';

const logger = new Logger('Bootstrap');

/**
 * ConfigModule validated the environment when AppModule was imported; the
 * same schema gives the log settings, with their defaults, before startup.
 */
function loggerFromEnv() {
  const { value } = envValidationSchema.validate(process.env, {
    allowUnknown: true,
  }) as { value: { LOG_FORMAT: LogFormat; LOG_LEVEL: LogLevel } };
  return createAppLogger(value.LOG_FORMAT, value.LOG_LEVEL);
}

async function bootstrap() {
  // abortOnError: false lets startup failures reach the catch below instead
  // of Nest exiting on its own with a raw stack trace.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    // Configured before the app exists, so startup messages (such as MongoDB
    // retries) are written as they happen, in the configured format.
    logger: loggerFromEnv(),
  });
  configureApp(app);

  const port = app.get(ConfigService).get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${API_PREFIX}`);
  logger.log(`API docs on http://localhost:${port}/${SWAGGER_PATH}`);
}

bootstrap().catch((error: unknown) => {
  logger.error(describeStartupError(error));
  process.exit(1);
});
