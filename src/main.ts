import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TOTAL_COUNT_HEADER } from './modules/transactions/presentation/transactions.controller';
import { describeStartupError } from './shared/infrastructure/startup/describe-startup-error';
import {
  setupSwagger,
  SWAGGER_PATH,
} from './shared/presentation/swagger/setup-swagger';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // abortOnError: false lets startup failures reach the catch below instead
  // of Nest exiting on its own with a raw stack trace.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
  });
  const config = app.get(ConfigService);

  // Do not advertise the server technology.
  app.disable('x-powered-by');
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    // Lets the frontend read the history total for pagination.
    exposedHeaders: [TOTAL_COUNT_HEADER],
  });
  app.enableShutdownHooks();
  setupSwagger(app);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/v1`);
  logger.log(`API docs on http://localhost:${port}/${SWAGGER_PATH}`);
}

bootstrap().catch((error: unknown) => {
  logger.error(describeStartupError(error));
  process.exit(1);
});
