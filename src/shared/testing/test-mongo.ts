import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Time a test suite allows for its database: the first run downloads the
 * MongoDB binary used by mongodb-memory-server.
 */
export const MONGO_STARTUP_TIMEOUT_MS = 120_000;

/**
 * An in-memory MongoDB for tests. The library gives mongod 10 s to start,
 * too little when several test files start one at once on a busy machine
 * (they failed with "Instance failed to start within 10000ms").
 */
export function startTestMongo(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
}
