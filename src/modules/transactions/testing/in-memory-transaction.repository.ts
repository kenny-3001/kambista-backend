import { Page, PageRequest } from '../domain/pagination';
import { Transaction } from '../domain/transaction';
import { TransactionRepository } from '../domain/transaction.repository';
import { HistoryPeriod } from '../domain/value-objects/history-period';

export class InMemoryTransactionRepository extends TransactionRepository {
  readonly transactions: Transaction[] = [];

  save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
    return Promise.resolve();
  }

  findHistory(
    userId: string,
    period: HistoryPeriod,
    page?: PageRequest,
  ): Promise<Page<Transaction>> {
    const matching = this.transactions
      .filter(
        (t) =>
          t.userId === userId &&
          t.createdAt >= period.from &&
          t.createdAt < period.until,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const items = page
      ? matching.slice((page.page - 1) * page.limit, page.page * page.limit)
      : matching;
    return Promise.resolve({ items, total: matching.length });
  }
}
