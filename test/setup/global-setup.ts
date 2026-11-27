import type { MongoMemoryServer } from 'mongodb-memory-server';
import { startTestMongo } from '../../src/shared/testing/test-mongo';

declare global {
  var e2eMongo: MongoMemoryServer | undefined;
}

/**
 * Starts one in-memory MongoDB for the whole end-to-end run, before any test
 * file is loaded: the app reads its configuration as soon as it is imported.
 * The tests never touch the database configured in .env.
 */
export default async function globalSetup(): Promise<void> {
  const mongo = await startTestMongo();
  globalThis.e2eMongo = mongo;
  // Inherited by the test files; each one adds its own database name.
  process.env.E2E_MONGO_BASE_URI = mongo.getUri();
}
