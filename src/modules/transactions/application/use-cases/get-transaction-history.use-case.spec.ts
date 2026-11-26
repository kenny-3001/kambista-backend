import { Currency } from '../../domain/currency';
import { InvalidHistoryPeriodError } from '../../domain/errors/invalid-history-period.error';
import { Transaction } from '../../domain/transaction';
import { InMemoryTransactionRepository } from '../../testing/in-memory-transaction.repository';
import {
  GetTransactionHistoryUseCase,
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
} from './get-transaction-history.use-case';

describe('GetTransactionHistoryUseCase', () => {
  let transactions: InMemoryTransactionRepository;
  let getHistory: GetTransactionHistoryUseCase;

  const user = { id: 'user-1', isAdmin: false };
  const admin = { id: 'admin-1', isAdmin: true };
  const period = { startDate: '2024-01-01', endDate: '2024-01-31' };

  const storeTransaction = (userId: string, createdAt: string) => {
    const transaction = Transaction.restore({
      id: `${userId}@${createdAt}`,
      userId,
      sourceCurrency: Currency.USD,
      targetCurrency: Currency.PEN,
      amount: 100,
      convertedAmount: 373.9,
      rate: 3.739,
      createdAt: new Date(createdAt),
    });
    transactions.transactions.push(transaction);
    return transaction;
  };

  beforeEach(() => {
    transactions = new InMemoryTransactionRepository();
    getHistory = new GetTransactionHistoryUseCase(transactions);
    storeTransaction('user-1', '2024-01-10T15:00:00Z');
    storeTransaction('user-2', '2024-01-11T15:00:00Z');
    storeTransaction('admin-1', '2024-01-12T15:00:00Z');
  });

  const ownersOf = (items: Transaction[]) => items.map((t) => t.userId);

  describe('whose history is read', () => {
    it('a user reads their own history', async () => {
      const { items } = await getHistory.execute({
        requester: user,
        ...period,
      });
      expect(ownersOf(items)).toEqual(['user-1']);
    });

    it("a user cannot read someone else's history: userId is ignored", async () => {
      const { items } = await getHistory.execute({
        requester: user,
        ...period,
        userId: 'user-2',
      });
      expect(ownersOf(items)).toEqual(['user-1']);
    });

    it('an admin reads their own history when no userId is sent', async () => {
      const { items } = await getHistory.execute({
        requester: admin,
        ...period,
      });
      expect(ownersOf(items)).toEqual(['admin-1']);
    });

    it("an admin reads another user's history with userId", async () => {
      const { items } = await getHistory.execute({
        requester: admin,
        ...period,
        userId: 'user-2',
      });
      expect(ownersOf(items)).toEqual(['user-2']);
    });

    it('an admin gets an empty history for a user without transactions', async () => {
      await expect(
        getHistory.execute({ requester: admin, ...period, userId: 'nobody' }),
      ).resolves.toEqual({ items: [], total: 0 });
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      for (let day = 13; day <= 27; day++) {
        storeTransaction('user-1', `2024-01-${day}T15:00:00Z`);
      }
    });

    it('returns the whole period, newest first, when no page is requested', async () => {
      const { items, total } = await getHistory.execute({
        requester: user,
        ...period,
      });

      expect(items).toHaveLength(16);
      expect(total).toBe(16);
      expect(items[0].createdAt).toEqual(new Date('2024-01-27T15:00:00Z'));
    });

    it('returns the requested page and the overall total', async () => {
      const { items, total } = await getHistory.execute({
        requester: user,
        ...period,
        page: 2,
        limit: 5,
      });

      expect(items.map((t) => t.createdAt.toISOString().slice(0, 10))).toEqual([
        '2024-01-22',
        '2024-01-21',
        '2024-01-20',
        '2024-01-19',
        '2024-01-18',
      ]);
      expect(total).toBe(16);
    });

    it('defaults to the first page and the default limit', async () => {
      const onlyLimit = await getHistory.execute({
        requester: user,
        ...period,
        limit: 3,
      });
      const onlyPage = await getHistory.execute({
        requester: user,
        ...period,
        page: 1,
      });

      expect(onlyLimit.items[0].createdAt).toEqual(
        new Date('2024-01-27T15:00:00Z'),
      );
      expect(onlyLimit.items).toHaveLength(3);
      expect(onlyPage.items).toHaveLength(Math.min(16, HISTORY_DEFAULT_LIMIT));
    });

    it('never returns more than the maximum page size', async () => {
      const findHistory = jest.spyOn(transactions, 'findHistory');

      await getHistory.execute({ requester: user, ...period, limit: 5000 });

      expect(findHistory).toHaveBeenCalledWith('user-1', expect.anything(), {
        page: 1,
        limit: HISTORY_MAX_LIMIT,
      });
    });

    it('returns an empty page beyond the last one', async () => {
      const { items, total } = await getHistory.execute({
        requester: user,
        ...period,
        page: 99,
        limit: 10,
      });

      expect(items).toEqual([]);
      expect(total).toBe(16);
    });
  });

  it('rejects an invalid period', async () => {
    await expect(
      getHistory.execute({
        requester: user,
        startDate: '2024-02-01',
        endDate: '2024-01-01',
      }),
    ).rejects.toThrow(InvalidHistoryPeriodError);
  });
});
