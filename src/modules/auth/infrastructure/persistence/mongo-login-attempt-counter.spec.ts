import type { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import {
  LoginAttemptDocument,
  LoginAttemptSchema,
} from './login-attempt.schema';
import { MongoLoginAttemptCounter } from './mongo-login-attempt-counter';
import {
  MONGO_STARTUP_TIMEOUT_MS,
  startTestMongo,
} from '../../../../shared/testing/test-mongo';

describe('MongoLoginAttemptCounter (integration)', () => {
  const WINDOW_MS = 15 * 60_000;
  const T0 = new Date('2024-01-18T15:00:00Z');
  const KEY = 'juan@example.com|203.0.113.7';
  let mongo: MongoMemoryServer;
  let attemptModel: Model<LoginAttemptDocument>;
  let counter: MongoLoginAttemptCounter;

  beforeAll(async () => {
    mongo = await startTestMongo();
    await mongoose.connect(mongo.getUri());
    attemptModel = mongoose.model(
      LoginAttemptDocument.name,
      LoginAttemptSchema,
    );
    await attemptModel.init(); // builds the TTL index
    counter = new MongoLoginAttemptCounter(attemptModel);
  }, MONGO_STARTUP_TIMEOUT_MS);

  afterEach(async () => {
    await attemptModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const at = (ms: number) => new Date(T0.getTime() + ms);

  it('opens a window on the first attempt and counts the next ones in it', async () => {
    await expect(counter.increment(KEY, T0, WINDOW_MS)).resolves.toEqual({
      count: 1,
      resetsAt: at(WINDOW_MS),
    });
    await expect(
      counter.increment(KEY, at(60_000), WINDOW_MS),
    ).resolves.toEqual({ count: 2, resetsAt: at(WINDOW_MS) });
  });

  it('starts a new window once the previous one ended', async () => {
    await counter.increment(KEY, T0, WINDOW_MS);
    await counter.increment(KEY, T0, WINDOW_MS);

    await expect(
      counter.increment(KEY, at(WINDOW_MS), WINDOW_MS),
    ).resolves.toEqual({ count: 1, resetsAt: at(2 * WINDOW_MS) });
  });

  it('never loses an attempt when many arrive at the same time', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => counter.increment(KEY, T0, WINDOW_MS)),
    );

    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it('keeps keys apart and forgets one on reset', async () => {
    const other = 'juan@example.com|198.51.100.9';
    await counter.increment(KEY, T0, WINDOW_MS);
    await counter.increment(KEY, T0, WINDOW_MS);
    await counter.increment(other, T0, WINDOW_MS);

    await counter.reset(KEY);

    await expect(counter.increment(KEY, T0, WINDOW_MS)).resolves.toMatchObject({
      count: 1,
    });
    await expect(
      counter.increment(other, T0, WINDOW_MS),
    ).resolves.toMatchObject({ count: 2 });
  });

  it('retries once when a concurrent first attempt inserted the window', async () => {
    jest.spyOn(attemptModel, 'findOneAndUpdate').mockImplementationOnce(() => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    });

    await expect(counter.increment(KEY, T0, WINDOW_MS)).resolves.toMatchObject({
      count: 1,
    });
    jest.restoreAllMocks();
  });

  it('does not hide other database failures', async () => {
    jest.spyOn(attemptModel, 'findOneAndUpdate').mockImplementationOnce(() => {
      throw new Error('connection lost');
    });

    await expect(counter.increment(KEY, T0, WINDOW_MS)).rejects.toThrow(
      'connection lost',
    );
    jest.restoreAllMocks();
  });

  it('stores neither the email nor the IP in clear text', async () => {
    await counter.increment(KEY, T0, WINDOW_MS);

    const stored = JSON.stringify(await attemptModel.find().lean());

    expect(stored).not.toContain('juan@example.com');
    expect(stored).not.toContain('203.0.113.7');
  });

  it('lets MongoDB delete ended windows by themselves', async () => {
    const indexes = await attemptModel.collection.indexes();

    expect(indexes).toContainEqual(
      expect.objectContaining({
        key: { resetsAt: 1 },
        expireAfterSeconds: 0,
      }),
    );
  });
});
