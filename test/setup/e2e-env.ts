import { randomUUID } from 'node:crypto';

/**
 * Runs before each test file is loaded. Values set here win over .env, so
 * every file gets its own empty in-memory database and a fixed configuration.
 */
const baseUri = process.env.E2E_MONGO_BASE_URI;
if (!baseUri) {
  throw new Error(
    'The in-memory MongoDB was not started (see global-setup.ts)',
  );
}

const database = `kambista-e2e-${randomUUID()}`;

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGO_URI: `${baseUri}${database}`,
  JWT_SECRET: 'e2e-secret-long-enough-for-the-validation-rule',
  JWT_EXPIRES_IN: '15m',
  CORS_ORIGIN: 'http://localhost:5173',
  // As in production: request logs are structured entries.
  LOG_FORMAT: 'json',
  LOG_LEVEL: 'log',
  // The first refresh runs at startup; no other one during the tests.
  EXCHANGE_RATE_REFRESH_INTERVAL_MS: String(60 * 60 * 1000),
  LOGIN_MAX_FAILED_ATTEMPTS: '5',
  LOGIN_ATTEMPTS_WINDOW_MINUTES: '15',
});
