import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { Currency } from '../../domain/currency';
import { Transaction } from '../../domain/transaction';
import { Amount } from '../../domain/value-objects/amount';
import { CurrencyPair } from '../../domain/value-objects/currency-pair';
import { HistoryPeriod } from '../../domain/value-objects/history-period';
import { MongoTransactionRepository } from './mongo-transaction.repository';
import { TransactionDocument, TransactionSchema } from './transaction.schema';

// The first run downloads the MongoDB binary used by mongodb-memory-server.
const MONGO_STARTUP_TIMEOUT_MS = 120_000;

describe('MongoTransactionRepository (integration)', () => {
  let mongo: MongoMemoryServer;
  let transactionModel: Model<TransactionDocument>;
  let repository: MongoTransactionRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    transactionModel = mongoose.model(
      TransactionDocument.name,
      TransactionSchema,
    );
    await transactionModel.init();
    repository = new MongoTransactionRepository(transactionModel);
  }, MONGO_STARTUP_TIMEOUT_MS);

  afterEach(async () => {
    await transactionModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('stores every field of the transaction', async () => {
    const transaction = Transaction.create({
      userId: 'user-1',
      pair: CurrencyPair.of(Currency.PEN, Currency.USD),
      amount: Amount.of(100),
      quote: { buy: 3.733, sell: 3.739 },
      createdAt: new Date('2024-01-18T15:00:00Z'),
    });

    await repository.save(transaction);

    const stored = await transactionModel
      .findById(transaction.id)
      .lean<TransactionDocument>()
      .exec();
    expect(stored).toEqual({
      _id: transaction.id,
      userId: 'user-1',
      sourceCurrency: 'PEN',
      targetCurrency: 'USD',
      amount: 100,
      convertedAmount: 26.79,
      rate: 3.733,
      createdAt: new Date('2024-01-18T15:00:00Z'),
    });
  });

  it('indexes transactions in the exact order the history reads them', async () => {
    const indexes = await transactionModel.collection.indexes();

    expect(indexes.map((index) => index.key)).toContainEqual({
      userId: 1,
      createdAt: -1,
      _id: -1,
    });
  });

  describe('findHistory', () => {
    const save = (userId: string, createdAt: string, amount = 100) =>
      repository.save(
        Transaction.create({
          userId,
          pair: CurrencyPair.of(Currency.USD, Currency.PEN),
          amount: Amount.of(amount),
          quote: { buy: 3.733, sell: 3.739 },
          createdAt: new Date(createdAt),
        }),
      );

    const january18 = HistoryPeriod.of('2024-01-18', '2024-01-18');

    it('includes the whole day in Peru time and nothing outside it', async () => {
      await save('user-1', '2024-01-18T04:59:59.999Z'); // 17/01 23:59 Lima
      await save('user-1', '2024-01-18T05:00:00.000Z'); // 18/01 00:00 Lima
      await save('user-1', '2024-01-19T04:30:00.000Z'); // 18/01 23:30 Lima
      await save('user-1', '2024-01-19T05:00:00.000Z'); // 19/01 00:00 Lima

      const { items, total } = await repository.findHistory(
        'user-1',
        january18,
      );

      expect(items.map((t) => t.createdAt.toISOString())).toEqual([
        '2024-01-19T04:30:00.000Z',
        '2024-01-18T05:00:00.000Z',
      ]);
      expect(total).toBe(2);
    });

    it('only returns transactions of the requested user', async () => {
      await save('user-1', '2024-01-18T15:00:00Z');
      await save('user-2', '2024-01-18T15:00:00Z');

      const { items } = await repository.findHistory('user-2', january18);

      expect(items.map((t) => t.userId)).toEqual(['user-2']);
    });

    it('rebuilds complete transactions', async () => {
      await save('user-1', '2024-01-18T15:00:00Z', 175);

      const [transaction] = (await repository.findHistory('user-1', january18))
        .items;

      expect(transaction).toMatchObject({
        userId: 'user-1',
        sourceCurrency: Currency.USD,
        targetCurrency: Currency.PEN,
        amount: 175,
        convertedAmount: 654.33,
        rate: 3.739,
        createdAt: new Date('2024-01-18T15:00:00Z'),
      });
      expect(transaction).toBeInstanceOf(Transaction);
    });

    it('paginates newest first without overlaps, even with equal dates', async () => {
      // Five transactions share the same instant to exercise the tie-breaker.
      for (let i = 1; i <= 5; i++) {
        await save('user-1', '2024-01-18T15:00:00Z', i);
      }
      await save('user-1', '2024-01-18T16:00:00Z', 6);

      const pages = await Promise.all(
        [1, 2, 3].map((page) =>
          repository.findHistory('user-1', january18, { page, limit: 2 }),
        ),
      );
      const ids = pages.flatMap((p) => p.items.map((t) => t.id));

      expect(pages.map((p) => p.items.length)).toEqual([2, 2, 2]);
      expect(pages.every((p) => p.total === 6)).toBe(true);
      expect(new Set(ids).size).toBe(6);
      expect(pages[0].items[0].amount).toBe(6);
    });

    it('reads the history straight from the index, without an in-memory sort', async () => {
      await save('user-1', '2024-01-18T15:00:00Z');

      const plan = JSON.stringify(
        await transactionModel
          .find({
            userId: 'user-1',
            createdAt: { $gte: january18.from, $lt: january18.until },
          })
          .sort({ createdAt: -1, _id: -1 })
          .explain(),
      );

      expect(plan).toContain('IXSCAN');
      expect(plan).not.toContain('"stage":"SORT"');
    });

    it('returns an empty result for a period without transactions', async () => {
      await save('user-1', '2024-01-18T15:00:00Z');

      await expect(
        repository.findHistory(
          'user-1',
          HistoryPeriod.of('2024-02-01', '2024-02-29'),
        ),
      ).resolves.toEqual({ items: [], total: 0 });
    });
  });
});
