import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { TOTAL_COUNT_HEADER } from './modules/transactions/presentation/transactions.controller';
import { setupSwagger } from './shared/presentation/swagger/setup-swagger';

export const API_PREFIX = 'v1';

/**
 * Everything the HTTP app needs besides its modules: prefix, CORS, headers
 * and the API docs. main.ts and the end-to-end tests share it, so the tests
 * exercise the same app that runs in production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  // Do not advertise the server technology.
  app.disable('x-powered-by');
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    // Lets the frontend read the history total for pagination and how long
    // to wait after too many failed logins.
    exposedHeaders: [TOTAL_COUNT_HEADER, 'Retry-After'],
  });
  app.enableShutdownHooks();
  setupSwagger(app);
}
