import { Page, PageRequest } from '../../domain/pagination';
import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/transaction.repository';
import { HistoryPeriod } from '../../domain/value-objects/history-period';

export const HISTORY_DEFAULT_LIMIT = 20;
export const HISTORY_MAX_LIMIT = 100;

export interface GetTransactionHistoryQuery {
  requester: { id: string; isAdmin: boolean };
  startDate: string;
  endDate: string;
  /** Whose history to read. Only honored for admins. */
  userId?: string;
  page?: number;
  limit?: number;
}

export class GetTransactionHistoryUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(query: GetTransactionHistoryQuery): Promise<Page<Transaction>> {
    const period = HistoryPeriod.of(query.startDate, query.endDate);

    // An admin may read anyone's history (their own by default); a regular
    // user always reads their own, whatever userId they send.
    const ownerId =
      query.requester.isAdmin && query.userId
        ? query.userId
        : query.requester.id;

    return this.transactions.findHistory(ownerId, period, toPageRequest(query));
  }
}

/**
 * The history is always paginated, never an unbounded list: without page or
 * limit it returns the first page with the default size.
 */
function toPageRequest(query: GetTransactionHistoryQuery): PageRequest {
  return {
    page: query.page ?? 1,
    limit: Math.min(query.limit ?? HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT),
  };
}
