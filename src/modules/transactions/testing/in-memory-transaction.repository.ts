import { Transaction } from '../domain/transaction';
import { TransactionRepository } from '../domain/transaction.repository';

export class InMemoryTransactionRepository extends TransactionRepository {
  readonly transactions: Transaction[] = [];

  save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
    return Promise.resolve();
  }
}
