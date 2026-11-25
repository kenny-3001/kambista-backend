import { randomUUID } from 'node:crypto';
import { Currency } from './currency';
import { RateQuote } from './rate-quote';
import { Amount } from './value-objects/amount';
import { CurrencyPair } from './value-objects/currency-pair';

export interface TransactionProps {
  id: string;
  /** Owner of the transaction: the authenticated caller. */
  userId: string;
  sourceCurrency: Currency;
  targetCurrency: Currency;
  amount: number;
  convertedAmount: number;
  /** Rate applied, kept so the operation stays explainable later on. */
  rate: number;
  createdAt: Date;
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  /** Exchanges an amount at the given quote. */
  static create(params: {
    userId: string;
    pair: CurrencyPair;
    amount: Amount;
    quote: RateQuote;
    createdAt: Date;
  }): Transaction {
    const { convertedAmount, appliedRate } = params.pair.convert(
      params.amount,
      params.quote,
    );

    return new Transaction({
      id: randomUUID(),
      userId: params.userId,
      sourceCurrency: params.pair.source,
      targetCurrency: params.pair.target,
      amount: params.amount.value,
      convertedAmount,
      rate: appliedRate,
      createdAt: params.createdAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get sourceCurrency(): Currency {
    return this.props.sourceCurrency;
  }

  get targetCurrency(): Currency {
    return this.props.targetCurrency;
  }

  get amount(): number {
    return this.props.amount;
  }

  get convertedAmount(): number {
    return this.props.convertedAmount;
  }

  get rate(): number {
    return this.props.rate;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
