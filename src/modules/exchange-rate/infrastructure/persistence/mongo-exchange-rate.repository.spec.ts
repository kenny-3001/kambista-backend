import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { ExchangeRate } from '../../domain/exchange-rate';
import {
  ExchangeRateDocument,
  ExchangeRateSchema,
} from './exchange-rate.schema';
import { MongoExchangeRateRepository } from './mongo-exchange-rate.repository';

// The first run downloads the MongoDB binary used by mongodb-memory-server.
const MONGO_STARTUP_TIMEOUT_MS = 120_000;

describe('MongoExchangeRateRepository (integration)', () => {
  let mongo: MongoMemoryServer;
  let rateModel: Model<ExchangeRateDocument>;
  let repository: MongoExchangeRateRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    rateModel = mongoose.model(ExchangeRateDocument.name, ExchangeRateSchema);
    await rateModel.init();
    repository = new MongoExchangeRateRepository(rateModel);
  }, MONGO_STARTUP_TIMEOUT_MS);

  afterEach(async () => {
    await rateModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const rateFetchedAt = (iso: string, sell = 3.739) =>
    ExchangeRate.create({
      buy: 3.733,
      sell,
      currency: 'USD',
      source: 'SUNAT',
      date: '2024-01-18',
      fetchedAt: new Date(iso),
    });

  it('returns null when no rate has been stored', async () => {
    await expect(repository.findLatest()).resolves.toBeNull();
  });

  it('returns the most recently fetched rate regardless of insertion order', async () => {
    await repository.save(rateFetchedAt('2024-01-18T15:00:30Z', 3.75));
    await repository.save(rateFetchedAt('2024-01-18T15:01:00Z', 3.76));
    await repository.save(rateFetchedAt('2024-01-18T15:00:00Z', 3.74));

    const latest = await repository.findLatest();

    expect(latest!.sell).toBe(3.76);
    expect(latest!.fetchedAt).toEqual(new Date('2024-01-18T15:01:00Z'));
  });

  it('keeps every fetched rate as history', async () => {
    await repository.save(rateFetchedAt('2024-01-18T15:00:00Z'));
    await repository.save(rateFetchedAt('2024-01-18T15:00:30Z'));

    expect(await rateModel.countDocuments()).toBe(2);
  });
});
