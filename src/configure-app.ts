import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet, { type HelmetOptions } from 'helmet';
import { TOTAL_COUNT_HEADER } from './modules/transactions/presentation/transactions.controller';
import type { LogFormat } from './shared/infrastructure/logging/app-logger';
import {
  REQUEST_ID_HEADER,
  requestLogging,
} from './shared/presentation/logging/request-logging.middleware';
import {
  SWAGGER_PATH,
  setupSwagger,
} from './shared/presentation/swagger/setup-swagger';

export const API_PREFIX = 'v1';

// The frontend lives on another origin and reads these answers through CORS,
// so the browser must not treat them as same-origin only.
const CROSS_ORIGIN: HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};

/** Security headers for the JSON API, with the strict default policy. */
const apiSecurityHeaders = helmet(CROSS_ORIGIN);

/**
 * The docs page (Swagger UI) runs inline scripts and styles, which the
 * strict policy of the API would block, so only it gets a relaxed one.
 */
const docsSecurityHeaders = helmet({
  ...CROSS_ORIGIN,
  contentSecurityPolicy: false,
});

function securityHeaders(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const isDocs = request.path.startsWith(`/${SWAGGER_PATH}`);
  (isDocs ? docsSecurityHeaders : apiSecurityHeaders)(request, response, next);
}

/**
 * Everything the HTTP app needs besides its modules: request logging,
 * prefix, CORS, headers and the API docs. main.ts and the end-to-end tests
 * share it, so the tests exercise the same app that runs in production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  // First, so every request is logged, also the ones that fail early.
  app.use(requestLogging(config.getOrThrow<LogFormat>('LOG_FORMAT')));
  // Do not advertise the server technology, and set the standard security
  // headers (nosniff, no framing, HSTS, a strict content policy).
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    // Lets the frontend read the history total for pagination, how long to
    // wait after too many failed logins, and the id to report a problem.
    exposedHeaders: [TOTAL_COUNT_HEADER, 'Retry-After', REQUEST_ID_HEADER],
  });
  app.enableShutdownHooks();
  setupSwagger(app);
}
