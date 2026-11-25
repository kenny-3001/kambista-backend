import { Transaction } from '../../domain/transaction';
import { TransactionRepository } from '../../domain/transaction.repository';
import { Amount } from '../../domain/value-objects/amount';
import { CurrencyPair } from '../../domain/value-objects/currency-pair';
import { CurrentRateQuote } from '../ports/current-rate-quote';

export interface CreateTransactionCommand {
  userId: string;
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
}

export class CreateTransactionUseCase {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly currentRate: CurrentRateQuote,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    // Invalid requests are rejected before looking up the rate.
    const pair = CurrencyPair.of(
      command.sourceCurrency,
      command.targetCurrency,
    );
    const amount = Amount.of(command.amount);
    const quote = await this.currentRate.get();

    const transaction = Transaction.create({
      userId: command.userId,
      pair,
      amount,
      quote,
      createdAt: this.now(),
    });
    await this.transactions.save(transaction);
    return transaction;
  }
}
