import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { Currency } from '../../domain/currency';
import { Transaction } from '../../domain/transaction';
import { Amount } from '../../domain/value-objects/amount';
import { CurrencyPair } from '../../domain/value-objects/currency-pair';
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

  it('indexes transactions by user and date for the history', async () => {
    const indexes = await transactionModel.collection.indexes();

    expect(indexes.map((index) => index.key)).toContainEqual({
      userId: 1,
      createdAt: -1,
    });
  });
});
