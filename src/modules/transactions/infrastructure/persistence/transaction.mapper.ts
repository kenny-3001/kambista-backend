import { Transaction } from '../../domain/transaction';
import { TransactionDocument } from './transaction.schema';

export const TransactionMapper = {
  toDomain(document: TransactionDocument): Transaction {
    return Transaction.restore({
      id: document._id,
      userId: document.userId,
      sourceCurrency: document.sourceCurrency,
      targetCurrency: document.targetCurrency,
      amount: document.amount,
      convertedAmount: document.convertedAmount,
      rate: document.rate,
      createdAt: document.createdAt,
    });
  },

  toPersistence(transaction: Transaction): TransactionDocument {
    return {
      _id: transaction.id,
      userId: transaction.userId,
      sourceCurrency: transaction.sourceCurrency,
      targetCurrency: transaction.targetCurrency,
      amount: transaction.amount,
      convertedAmount: transaction.convertedAmount,
      rate: transaction.rate,
      createdAt: transaction.createdAt,
    };
  },
};
