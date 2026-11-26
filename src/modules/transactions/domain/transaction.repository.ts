import { Page, PageRequest } from './pagination';
import { Transaction } from './transaction';
import { HistoryPeriod } from './value-objects/history-period';

export abstract class TransactionRepository {
  abstract save(transaction: Transaction): Promise<void>;

  /**
   * Transactions of one user within the period, newest first. Without a
   * page request every matching transaction is returned.
   */
  abstract findHistory(
    userId: string,
    period: HistoryPeriod,
    page?: PageRequest,
  ): Promise<Page<Transaction>>;
}
