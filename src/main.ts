import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './configure-app';
import { describeStartupError } from './shared/infrastructure/startup/describe-startup-error';
import { SWAGGER_PATH } from './shared/presentation/swagger/setup-swagger';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // abortOnError: false lets startup failures reach the catch below instead
  // of Nest exiting on its own with a raw stack trace.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
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
