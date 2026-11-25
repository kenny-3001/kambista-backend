import { Transaction } from './transaction';

export abstract class TransactionRepository {
  abstract save(transaction: Transaction): Promise<void>;
}
