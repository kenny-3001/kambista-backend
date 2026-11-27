import type { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { RefreshToken } from '../../domain/refresh-token';
import { MongoRefreshTokenRepository } from './mongo-refresh-token.repository';
import {
  RefreshTokenDocument,
  RefreshTokenSchema,
} from './refresh-token.schema';
import {
  MONGO_STARTUP_TIMEOUT_MS,
  startTestMongo,
} from '../../../../shared/testing/test-mongo';

describe('MongoRefreshTokenRepository (integration)', () => {
  const NOW = new Date('2024-01-18T15:00:00Z');
  const TTL_MS = 60_000;
  let mongo: MongoMemoryServer;
  let tokenModel: Model<RefreshTokenDocument>;
  let repository: MongoRefreshTokenRepository;

  beforeAll(async () => {
    mongo = await startTestMongo();
    await mongoose.connect(mongo.getUri());
    tokenModel = mongoose.model(RefreshTokenDocument.name, RefreshTokenSchema);
    await tokenModel.init(); // builds the unique and TTL indexes
    repository = new MongoRefreshTokenRepository(tokenModel);
  }, MONGO_STARTUP_TIMEOUT_MS);

  afterEach(async () => {
    await tokenModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const save = async (
    tokenHash: string,
    params: { userId?: string; familyId?: string } = {},
  ) => {
    const token = RefreshToken.issue({
      userId: params.userId ?? 'user-1',
      familyId: params.familyId,
      tokenHash,
      now: NOW,
      ttlMs: TTL_MS,
    });
    await repository.save(token);
    return token;
  };

  it('saves a token and finds it by its hash', async () => {
    const token = await save('hash-1');

    await expect(repository.findByHash('hash-1')).resolves.toEqual(token);
    await expect(repository.findByHash('otro')).resolves.toBeNull();
  });

  it('consumes a usable token exactly once', async () => {
    await save('hash-1');

    const consumed = await repository.consume('hash-1', NOW);

    expect(consumed?.usedAt).toEqual(NOW);
    await expect(repository.consume('hash-1', NOW)).resolves.toBeNull();
  });

  it('lets only one of many concurrent refreshes win', async () => {
    await save('hash-1');

    const results = await Promise.all(
      Array.from({ length: 20 }, () => repository.consume('hash-1', NOW)),
    );

    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it('does not consume an expired or revoked token', async () => {
    const expiring = await save('hash-1');
    await save('hash-2', { familyId: 'family-2' });
    await repository.revokeFamily('family-2', NOW);

    await expect(
      repository.consume('hash-1', expiring.expiresAt),
    ).resolves.toBeNull();
    await expect(repository.consume('hash-2', NOW)).resolves.toBeNull();
  });

  it('revokes every token of a family and only that family', async () => {
    await save('a1', { familyId: 'family-a' });
    await save('a2', { familyId: 'family-a' });
    await save('b1', { familyId: 'family-b' });

    await repository.revokeFamily('family-a', NOW);

    expect((await repository.findByHash('a1'))?.revokedAt).toEqual(NOW);
    expect((await repository.findByHash('a2'))?.revokedAt).toEqual(NOW);
    expect((await repository.findByHash('b1'))?.revokedAt).toBeNull();
  });

  it('keeps the first revocation time', async () => {
    await save('a1', { familyId: 'family-a' });
    await repository.revokeFamily('family-a', NOW);

    await repository.revokeFamily('family-a', new Date(NOW.getTime() + 1000));

    expect((await repository.findByHash('a1'))?.revokedAt).toEqual(NOW);
  });

  it('revokes every session of a user and only that user', async () => {
    await save('juan-1', { userId: 'juan' });
    await save('juan-2', { userId: 'juan' });
    await save('ana-1', { userId: 'ana' });

    await repository.revokeAllForUser('juan', NOW);

    expect((await repository.findByHash('juan-1'))?.revokedAt).toEqual(NOW);
    expect((await repository.findByHash('juan-2'))?.revokedAt).toEqual(NOW);
    expect((await repository.findByHash('ana-1'))?.revokedAt).toBeNull();
  });

  it('lets MongoDB delete expired tokens by themselves', async () => {
    const indexes = await tokenModel.collection.indexes();

    expect(indexes).toContainEqual(
      expect.objectContaining({
        key: { expiresAt: 1 },
        expireAfterSeconds: 0,
      }),
    );
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { tokenHash: 1 }, unique: true }),
    );
  });
});
